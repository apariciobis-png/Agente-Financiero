import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type { Ficha } from '@/lib/motor/ficha';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAnthropicClient, MODELO_ENTREVISTA } from '@/lib/claude/anthropic';
import { HERRAMIENTAS_ENTREVISTA } from '@/lib/claude/herramientas';
import { PROMPT_SISTEMA_ENTREVISTA } from '@/lib/claude/prompt-entrevista';
import { vincularCliente } from '@/lib/clientes';
import { MAX_MENSAJES_POR_ENTREVISTA } from '@/lib/limites-uso';
import {
  agregarPendiente,
  aplicarDato,
  esClaveFicha,
  esEtiqueta,
  guardarFicha,
  obtenerOCrearFicha,
  progresoBloques,
  resumenFicha,
} from '@/lib/fichas';

const MAX_TOKENS_RESPUESTA = 2048;
const MAX_TURNOS_HERRAMIENTA = 5;

/**
 * Un turno de la entrevista: valida la entrevista y el tope de mensajes,
 * guarda el mensaje del cliente, llama al modelo (con `crear_cliente`,
 * `guardar_dato` y `agregar_pendiente` — Fase 5, ver docs/roadmap.md),
 * aplica lo que el modelo guarde a la ficha en curso, y guarda su respuesta.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<'/api/entrevistas/[token]/mensajes'>,
) {
  const { token } = await params;

  const body = await request.json().catch(() => null);
  const contenido =
    typeof body?.contenido === 'string' ? body.contenido.trim() : '';

  if (!contenido || contenido.length > 2000) {
    return NextResponse.json({ error: 'Mensaje no válido.' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: entrevista } = await admin
    .from('entrevistas')
    .select('id, estado, expira_en, cliente_id')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista) {
    return NextResponse.json(
      { error: 'Entrevista no encontrada.' },
      { status: 404 },
    );
  }
  if (new Date(entrevista.expira_en) < new Date()) {
    return NextResponse.json(
      { error: 'La entrevista ha caducado.' },
      { status: 410 },
    );
  }
  if (entrevista.estado !== 'en_curso') {
    return NextResponse.json(
      { error: 'Esta entrevista ya no acepta mensajes.' },
      { status: 409 },
    );
  }

  const { count: totalMensajes } = await admin
    .from('mensajes')
    .select('id', { count: 'exact', head: true })
    .eq('entrevista_id', entrevista.id);

  // Tope de mensajes por entrevista (docs/architecture.md · Protección del
  // flujo público). Se cierra sin llamar al modelo: barato y determinista.
  if ((totalMensajes ?? 0) >= MAX_MENSAJES_POR_ENTREVISTA) {
    const cierre =
      'Hemos hablado ya bastante — con esto tengo suficiente para arrancar. ¡Gracias por tu tiempo!';
    await admin
      .from('mensajes')
      .insert({ entrevista_id: entrevista.id, rol: 'cliente', contenido });
    await admin
      .from('mensajes')
      .insert({ entrevista_id: entrevista.id, rol: 'agente', contenido: cierre });
    await admin
      .from('entrevistas')
      .update({ estado: 'pendiente_confirmacion' })
      .eq('id', entrevista.id);
    return NextResponse.json({ respuesta: cierre });
  }

  await admin
    .from('mensajes')
    .insert({ entrevista_id: entrevista.id, rol: 'cliente', contenido });

  const { data: historial } = await admin
    .from('mensajes')
    .select('rol, contenido')
    .eq('entrevista_id', entrevista.id)
    .order('id', { ascending: true });

  // La apertura literal (docs/criterio/instrucciones-agente-v2.md) es texto
  // fijo, no generado — el modelo no necesita verla como turno propio. La
  // API exige que el primer mensaje sea de rol "user", así que el historial
  // que se le manda empieza en el primer mensaje del cliente.
  const filas = historial ?? [];
  const primerTurnoCliente = filas.findIndex((m) => m.rol === 'cliente');
  const historialRelevante =
    primerTurnoCliente === -1 ? [] : filas.slice(primerTurnoCliente);

  const mensajesParaModelo: Anthropic.MessageParam[] = historialRelevante.map(
    (m) => ({
      role: m.rol === 'agente' ? 'assistant' : 'user',
      content: m.contenido,
    }),
  );

  // La ficha solo existe una vez hay cliente (el esquema lo exige: no puede
  // haber datos financieros de alguien de quien no sabemos ni el nombre).
  let clienteId = entrevista.cliente_id as string | null;
  let fichaId: string | null = null;
  let ficha: Ficha | null = null;

  if (clienteId) {
    const { data: cliente } = await admin
      .from('clientes')
      .select('nombre')
      .eq('id', clienteId)
      .maybeSingle();
    const obtenida = await obtenerOCrearFicha(
      admin,
      entrevista.id,
      clienteId,
      cliente?.nombre ?? '',
    );
    fichaId = obtenida.id;
    ficha = obtenida.datos;
  }

  const systemPrompt = ficha
    ? `${PROMPT_SISTEMA_ENTREVISTA}\n\n## Estado actual de la ficha (no vuelvas a preguntar lo que ya está aquí)\n${resumenFicha(ficha)}`
    : PROMPT_SISTEMA_ENTREVISTA;

  const anthropic = getAnthropicClient();

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: MODELO_ENTREVISTA,
      max_tokens: MAX_TOKENS_RESPUESTA,
      system: systemPrompt,
      tools: HERRAMIENTAS_ENTREVISTA,
      messages: mensajesParaModelo,
    });

    // Bucle acotado por si el modelo encadena varias llamadas a herramienta
    // (crear_cliente, varios guardar_dato...) antes de contestar en texto.
    let vueltas = 0;
    while (response.stop_reason === 'tool_use' && vueltas < MAX_TURNOS_HERRAMIENTA) {
      vueltas++;

      const usos = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      const resultados: Anthropic.ToolResultBlockParam[] = [];
      for (const uso of usos) {
        if (uso.name === 'crear_cliente') {
          const input = uso.input as { nombre?: string; email?: string };
          const resultado = await vincularCliente(
            admin,
            entrevista.id,
            input.nombre ?? '',
            input.email ?? '',
          );
          if ('error' in resultado) {
            resultados.push({
              type: 'tool_result',
              tool_use_id: uso.id,
              content: `No se pudo registrar: ${resultado.error}`,
              is_error: true,
            });
          } else {
            clienteId = resultado.clienteId;
            const obtenida = await obtenerOCrearFicha(
              admin,
              entrevista.id,
              clienteId,
              input.nombre ?? '',
            );
            fichaId = obtenida.id;
            ficha = obtenida.datos;
            resultados.push({
              type: 'tool_result',
              tool_use_id: uso.id,
              content: 'Cliente registrado correctamente.',
            });
          }
        } else if (uso.name === 'guardar_dato') {
          if (!fichaId || !ficha) {
            resultados.push({
              type: 'tool_result',
              tool_use_id: uso.id,
              content: 'Todavía no hay cliente registrado; llama primero a crear_cliente.',
              is_error: true,
            });
          } else {
            const input = uso.input as {
              clave?: unknown;
              valor?: unknown;
              etiqueta?: unknown;
              cita?: string;
              supuesto?: string;
            };
            if (!esClaveFicha(input.clave) || !esEtiqueta(input.etiqueta)) {
              resultados.push({
                type: 'tool_result',
                tool_use_id: uso.id,
                content: 'Clave o etiqueta no válidas.',
                is_error: true,
              });
            } else {
              ficha = aplicarDato(
                ficha,
                input.clave,
                input.valor,
                input.etiqueta,
                input.cita,
                input.supuesto,
              );
              await guardarFicha(admin, fichaId, ficha);
              resultados.push({
                type: 'tool_result',
                tool_use_id: uso.id,
                content: 'Guardado.',
              });
            }
          }
        } else if (uso.name === 'agregar_pendiente') {
          if (!fichaId || !ficha) {
            resultados.push({
              type: 'tool_result',
              tool_use_id: uso.id,
              content: 'Todavía no hay ficha para anotar pendientes.',
              is_error: true,
            });
          } else {
            const input = uso.input as { texto?: string };
            ficha = agregarPendiente(ficha, input.texto ?? '');
            await guardarFicha(admin, fichaId, ficha);
            resultados.push({
              type: 'tool_result',
              tool_use_id: uso.id,
              content: 'Anotado.',
            });
          }
        } else {
          resultados.push({
            type: 'tool_result',
            tool_use_id: uso.id,
            content: 'Herramienta no reconocida.',
            is_error: true,
          });
        }
      }

      mensajesParaModelo.push({ role: 'assistant', content: response.content });
      mensajesParaModelo.push({ role: 'user', content: resultados });

      const systemPromptActualizado = ficha
        ? `${PROMPT_SISTEMA_ENTREVISTA}\n\n## Estado actual de la ficha (no vuelvas a preguntar lo que ya está aquí)\n${resumenFicha(ficha)}`
        : PROMPT_SISTEMA_ENTREVISTA;

      response = await anthropic.messages.create({
        model: MODELO_ENTREVISTA,
        max_tokens: MAX_TOKENS_RESPUESTA,
        system: systemPromptActualizado,
        tools: HERRAMIENTAS_ENTREVISTA,
        messages: mensajesParaModelo,
      });
    }
  } catch (error) {
    // El mensaje del cliente y cualquier dato ya guardado siguen en la base
    // de datos: si recarga o reintenta, no pierde nada. Solo falló la
    // llamada al modelo.
    console.error('Error llamando a la API de Anthropic:', error);
    return NextResponse.json(
      {
        error:
          'No hemos podido conectar con el asistente ahora mismo. Inténtalo de nuevo en un momento.',
      },
      { status: 502 },
    );
  }

  const textoRespuesta = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const respuestaFinal =
    textoRespuesta || 'Perdona, no he sabido qué responder. ¿Puedes repetirlo?';

  await admin.from('mensajes').insert({
    entrevista_id: entrevista.id,
    rol: 'agente',
    contenido: respuestaFinal,
  });

  const progreso = ficha ? progresoBloques(ficha) : null;
  const listaParaConfirmar = progreso !== null && progreso.every(Boolean);

  // Los 8 bloques ya tienen algo (aunque sea un "pendiente" explícito, como
  // la negativa a hablar de deudas) — pasa a la pantalla de confirmación
  // (Fase 6). No hace falta que el cliente lo pida.
  if (listaParaConfirmar && entrevista.estado === 'en_curso') {
    await admin
      .from('entrevistas')
      .update({ estado: 'pendiente_confirmacion' })
      .eq('id', entrevista.id);
  }

  return NextResponse.json({
    respuesta: respuestaFinal,
    progreso,
    listaParaConfirmar,
  });
}
