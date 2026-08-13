import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient, MODELO_ENTREVISTA } from './claude/anthropic';
import { PROMPT_SISTEMA_PLAN } from './claude/prompt-plan';
import { CAMPOS_FICHA } from './campos-ficha';
import { formatearValor } from './formato-ficha';
import type { Ficha } from './motor/ficha';
import type { ResultadoAnalisis } from './diagnostico';

/**
 * Cierre fijo de todo plan (docs/criterio/instrucciones-agente-v2.md §Fase 4,
 * sección 8). No se le pide al modelo: es texto literal inyectado aquí, para
 * que el descargo nunca dependa de que el modelo se acuerde de escribirlo
 * bien ni de que lo parafrasee — "aparece en TODO plan emitido, sin
 * excepción".
 */
export const DESCARGO_PLAN =
  'Esto es orientación educativa hecha con tus números y supuestos prudentes, no asesoramiento financiero regulado ni una promesa de rentabilidad. Para ejecutar (elegir productos concretos, temas fiscales), contrasta con un asesor autorizado.';

export interface SeccionesPlan {
  tuMeta: string;
  tuFotoDeHoy: string;
  llegasSiSiguesAsi: string;
  tuPlanPasoAPaso: string;
  siLosNumerosNoSalen: string | null;
  deCada100Futuros: string;
  loQueMeFaltaSaber: string;
}

const ESQUEMA_SECCIONES = {
  type: 'object',
  properties: {
    tuMeta: { type: 'string' },
    tuFotoDeHoy: { type: 'string' },
    llegasSiSiguesAsi: { type: 'string' },
    tuPlanPasoAPaso: { type: 'string' },
    siLosNumerosNoSalen: { type: ['string', 'null'] },
    deCada100Futuros: { type: 'string' },
    loQueMeFaltaSaber: { type: 'string' },
  },
  required: [
    'tuMeta',
    'tuFotoDeHoy',
    'llegasSiSiguesAsi',
    'tuPlanPasoAPaso',
    'siLosNumerosNoSalen',
    'deCada100Futuros',
    'loQueMeFaltaSaber',
  ],
  additionalProperties: false,
} as const;

/** Snapshot de la ficha en lenguaje llano — mismos textos que ve el cliente al confirmar. */
function fichaLegible(ficha: Ficha): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const campo of CAMPOS_FICHA) {
    const dato = ficha[campo.clave];
    salida[campo.etiqueta] = `${formatearValor(campo, dato)} [${dato.etiqueta}]`;
  }
  return salida;
}

/**
 * Llama al modelo redactor con salida estructurada: solo texto, cero
 * números que no vengan ya en `resultado`. Devuelve las 7 secciones que
 * escribe el modelo — la 8ª (descargo) es siempre `DESCARGO_PLAN`.
 */
export async function redactarSecciones(
  nombre: string,
  ficha: Ficha,
  resultado: ResultadoAnalisis,
): Promise<SeccionesPlan> {
  const anthropic = getAnthropicClient();

  const contexto = {
    cliente: { nombre },
    ficha: fichaLegible(ficha),
    pendientes: ficha.pendientes,
    analisis: resultado,
  };

  const response = await anthropic.messages.create({
    model: MODELO_ENTREVISTA,
    // Sonnet 5 piensa por defecto (adaptativo) y max_tokens cubre el
    // pensamiento Y la respuesta juntos — con poco margen el JSON se corta
    // a mitad (visto en pruebas: "Unterminated string in JSON").
    max_tokens: 8192,
    system: PROMPT_SISTEMA_PLAN,
    messages: [{ role: 'user', content: JSON.stringify(contexto) }],
    output_config: { format: { type: 'json_schema', schema: ESQUEMA_SECCIONES } },
  });

  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      'El modelo se quedó sin espacio de respuesta antes de terminar el plan (max_tokens).',
    );
  }
  if (response.stop_reason === 'refusal') {
    throw new Error('El modelo rehusó redactar el plan.');
  }

  const bloqueTexto = response.content.find((b) => b.type === 'text');
  if (!bloqueTexto || bloqueTexto.type !== 'text') {
    throw new Error('El modelo no devolvió el plan en el formato esperado.');
  }

  return JSON.parse(bloqueTexto.text) as SeccionesPlan;
}

function construirMarkdown(nombre: string, secciones: SeccionesPlan): string {
  const partes = [
    `# Tu plan financiero — ${nombre}`,
    '',
    '## Tu meta',
    secciones.tuMeta,
    '',
    '## Tu foto de hoy',
    secciones.tuFotoDeHoy,
    '',
    '## ¿Llegas si sigues así?',
    secciones.llegasSiSiguesAsi,
    '',
    '## Tu plan, paso a paso',
    secciones.tuPlanPasoAPaso,
  ];

  if (secciones.siLosNumerosNoSalen) {
    partes.push('', '## Si los números no salen: tus opciones', secciones.siLosNumerosNoSalen);
  }

  partes.push(
    '',
    '## De cada 100 futuros posibles…',
    secciones.deCada100Futuros,
    '',
    '## Lo que me falta saber',
    secciones.loQueMeFaltaSaber,
    '',
    '## La letra pequeña honesta',
    DESCARGO_PLAN,
  );

  return partes.join('\n');
}

/** Redacta y guarda el plan de una vez — el paso final del cierre (Fase 8). */
export async function generarYGuardarPlan(
  admin: SupabaseClient,
  analisisId: string,
  nombre: string,
  ficha: Ficha,
  resultado: ResultadoAnalisis,
): Promise<void> {
  const secciones = await redactarSecciones(nombre, ficha, resultado);
  const markdown = construirMarkdown(nombre, secciones);

  await admin.from('planes').insert({
    analisis_id: analisisId,
    secciones,
    markdown,
    descargo: DESCARGO_PLAN,
  });
}
