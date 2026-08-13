import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { aplicarDato, esClaveFicha, guardarFicha, progresoBloques } from '@/lib/fichas';
import type { Ficha } from '@/lib/motor/ficha';

/**
 * Corrige un dato desde la pantalla de confirmación (Fase 6). Toda
 * corrección hecha aquí pasa a `confirmado` — el cliente la está dando (o
 * arreglando) él mismo, con claridad, así que ya no hay rango ni rebote de
 * por medio (docs/user-flows.md · Flujo 1, paso 5).
 */
export async function PATCH(
  request: Request,
  { params }: RouteContext<'/api/entrevistas/[token]/ficha'>,
) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  const clave = body?.clave;
  const valor = body?.valor;

  if (!esClaveFicha(clave)) {
    return NextResponse.json({ error: 'Clave no válida.' }, { status: 400 });
  }
  if (valor === undefined) {
    return NextResponse.json({ error: 'Falta el valor.' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: entrevista } = await admin
    .from('entrevistas')
    .select('id, estado')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista) {
    return NextResponse.json({ error: 'Entrevista no encontrada.' }, { status: 404 });
  }
  if (entrevista.estado !== 'en_curso' && entrevista.estado !== 'pendiente_confirmacion') {
    return NextResponse.json(
      { error: 'Esta ficha ya está cerrada y no admite correcciones.' },
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
    return NextResponse.json({ error: 'Todavía no hay ficha que corregir.' }, { status: 404 });
  }

  const ficha = aplicarDato(fichaFila.datos as Ficha, clave, valor, 'confirmado');
  await guardarFicha(admin, fichaFila.id as string, ficha);

  return NextResponse.json({ dato: ficha[clave], progreso: progresoBloques(ficha) });
}
