import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ejecutarDiagnostico, VERSION_MOTOR, VERSION_REGLAS } from '@/lib/diagnostico';
import { generarYGuardarPlan } from '@/lib/planes';
import type { Ficha } from '@/lib/motor/ficha';

/**
 * Cierre de la entrevista (Fase 6) + diagnóstico (Fase 7) + plan en
 * cristiano (Fase 8), los tres en el mismo paso: el cliente confirma su
 * resumen, se ejecuta el motor sobre la ficha ya cerrada, se guarda en
 * `analisis`, y el modelo redacta el plan a partir de ese resultado — nunca
 * al revés. A partir de aquí la ficha no se sobrescribe nunca
 * (docs/data-model.md); un cambio posterior necesitaría una versión nueva,
 * no contemplado todavía.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<'/api/entrevistas/[token]/cerrar'>,
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: entrevista } = await admin
    .from('entrevistas')
    .select('id, estado, cliente_id')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista) {
    return NextResponse.json({ error: 'Entrevista no encontrada.' }, { status: 404 });
  }
  if (entrevista.estado === 'completada') {
    return NextResponse.json({ ok: true });
  }
  if (entrevista.estado !== 'en_curso' && entrevista.estado !== 'pendiente_confirmacion') {
    return NextResponse.json(
      { error: 'Esta entrevista no se puede cerrar en su estado actual.' },
      { status: 409 },
    );
  }

  const { data: fichaFila } = await admin
    .from('fichas')
    .select('id, datos')
    .eq('entrevista_id', entrevista.id)
    .eq('version', 1)
    .maybeSingle();

  if (!fichaFila) {
    return NextResponse.json(
      { error: 'Todavía no hay ficha que confirmar.' },
      { status: 404 },
    );
  }

  await admin
    .from('entrevistas')
    .update({ estado: 'completada', completada_en: new Date().toISOString() })
    .eq('id', entrevista.id);

  const ficha = fichaFila.datos as Ficha;
  const resultado = ejecutarDiagnostico(ficha);

  const { data: analisisFila, error: errorAnalisis } = await admin
    .from('analisis')
    .insert({
      ficha_id: fichaFila.id,
      modo: resultado.modo,
      resultado,
      version_motor: VERSION_MOTOR,
      version_reglas: VERSION_REGLAS,
    })
    .select('id')
    .single();

  if (errorAnalisis || !analisisFila) {
    // El cierre y el diagnóstico ya están guardados aunque esto falle; el
    // cliente no se queda sin nada, solo sin plan todavía.
    console.error('Error guardando el análisis:', errorAnalisis);
    return NextResponse.json({ ok: true, plan: false });
  }

  try {
    const { data: cliente } = await admin
      .from('clientes')
      .select('nombre')
      .eq('id', entrevista.cliente_id)
      .maybeSingle();

    await generarYGuardarPlan(admin, analisisFila.id as string, cliente?.nombre ?? ficha.nombre, ficha, resultado);
  } catch (error) {
    // El análisis ya quedó guardado — el plan se puede regenerar más tarde.
    // No tiene sentido que un fallo del modelo redactor eche abajo un cierre
    // que ya es válido.
    console.error('Error redactando el plan:', error);
    return NextResponse.json({ ok: true, plan: false });
  }

  return NextResponse.json({ ok: true, plan: true });
}
