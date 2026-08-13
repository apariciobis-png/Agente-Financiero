import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generarYGuardarPlan } from '@/lib/planes';
import type { ResultadoAnalisis } from '@/lib/diagnostico';
import type { Ficha } from '@/lib/motor/ficha';

/**
 * Reintento de la redacción del plan (Fase 8), para cuando la llamada al
 * modelo falló en el cierre. No vuelve a ejecutar el motor — el análisis ya
 * está guardado y no se toca; solo redacta de nuevo a partir de él.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<'/api/entrevistas/[token]/plan'>,
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: entrevista } = await admin
    .from('entrevistas')
    .select('id, cliente_id, estado')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista || entrevista.estado !== 'completada') {
    return NextResponse.json({ error: 'No hay una entrevista cerrada para este enlace.' }, { status: 404 });
  }

  const { data: ficha } = await admin
    .from('fichas')
    .select('id, datos')
    .eq('entrevista_id', entrevista.id)
    .eq('version', 1)
    .maybeSingle();

  if (!ficha) {
    return NextResponse.json({ error: 'No hay ficha.' }, { status: 404 });
  }

  const { data: analisis } = await admin
    .from('analisis')
    .select('id, resultado')
    .eq('ficha_id', ficha.id)
    .order('calculado_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!analisis) {
    return NextResponse.json({ error: 'No hay análisis todavía.' }, { status: 404 });
  }

  const { data: cliente } = await admin
    .from('clientes')
    .select('nombre')
    .eq('id', entrevista.cliente_id)
    .maybeSingle();

  try {
    await generarYGuardarPlan(
      admin,
      analisis.id as string,
      cliente?.nombre ?? (ficha.datos as Ficha).nombre,
      ficha.datos as Ficha,
      analisis.resultado as ResultadoAnalisis,
    );
  } catch (error) {
    console.error('Error regenerando el plan:', error);
    return NextResponse.json({ error: 'No se pudo generar el plan.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
