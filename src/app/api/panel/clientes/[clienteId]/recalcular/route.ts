import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ejecutarDiagnostico, VERSION_MOTOR, VERSION_REGLAS } from '@/lib/diagnostico';
import type { Ficha } from '@/lib/motor/ficha';

/**
 * Recalcula el diagnóstico de un cliente con el motor tal como está hoy,
 * sin tocar la ficha ni pedir de nuevo la entrevista. Es una acción
 * deliberada de la asesora, no algo automático — docs/data-model.md ya deja
 * claro que un recálculo nunca pasa solo.
 *
 * Escribe en `analisis`, que no tiene política de escritura para
 * `authenticated` (docs/data-model.md · Seguridad de acceso), así que usa el
 * cliente de servicio — pero solo después de comprobar con el cliente de
 * sesión que quien llama es de verdad una asesora dada de alta.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<'/api/panel/clientes/[clienteId]/recalcular'>,
) {
  const { clienteId } = await params;

  const supabaseSesion = await createClient();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No hay sesión.' }, { status: 401 });
  }

  const { data: asesor } = await supabaseSesion
    .from('asesores')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!asesor) {
    return NextResponse.json({ error: 'Esta cuenta no es una asesora dada de alta.' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: entrevistas } = await admin
    .from('entrevistas')
    .select('id')
    .eq('cliente_id', clienteId)
    .order('iniciada_en', { ascending: false })
    .limit(1);

  const entrevista = entrevistas?.[0];
  if (!entrevista) {
    return NextResponse.json({ error: 'No hay entrevista para este cliente.' }, { status: 404 });
  }

  const { data: fichaFila } = await admin
    .from('fichas')
    .select('id, datos')
    .eq('entrevista_id', entrevista.id)
    .eq('version', 1)
    .maybeSingle();

  if (!fichaFila) {
    return NextResponse.json({ error: 'No hay ficha para este cliente.' }, { status: 404 });
  }

  const resultado = ejecutarDiagnostico(fichaFila.datos as Ficha);

  const { error } = await admin.from('analisis').insert({
    ficha_id: fichaFila.id,
    modo: resultado.modo,
    resultado,
    version_motor: VERSION_MOTOR,
    version_reglas: VERSION_REGLAS,
  });

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar el nuevo análisis.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
