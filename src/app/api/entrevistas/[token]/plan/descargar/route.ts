import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Descarga del plan como texto (docs/user-flows.md · "Plan ... Descargable"). */
export async function GET(
  request: Request,
  { params }: RouteContext<'/api/entrevistas/[token]/plan/descargar'>,
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: entrevista } = await admin
    .from('entrevistas')
    .select('id, estado')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista || entrevista.estado !== 'completada') {
    return NextResponse.json({ error: 'No hay plan para este enlace.' }, { status: 404 });
  }

  const { data: ficha } = await admin
    .from('fichas')
    .select('id')
    .eq('entrevista_id', entrevista.id)
    .eq('version', 1)
    .maybeSingle();

  const { data: analisis } = ficha
    ? await admin
        .from('analisis')
        .select('id')
        .eq('ficha_id', ficha.id)
        .order('calculado_en', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: plan } = analisis
    ? await admin
        .from('planes')
        .select('markdown')
        .eq('analisis_id', analisis.id)
        .order('generado_en', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  if (!plan) {
    return NextResponse.json({ error: 'Todavía no hay plan.' }, { status: 404 });
  }

  return new NextResponse(plan.markdown as string, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tu-plan.md"',
    },
  });
}
