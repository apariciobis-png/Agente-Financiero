'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  dentroDeLimite,
  hashIp,
  ipDelVisitante,
  MAX_ENTREVISTAS_POR_HORA,
  registrarUso,
} from '@/lib/limites-uso';

export type EstadoConsentimiento = { error: string } | null;

/**
 * Se ejecuta al aceptar el consentimiento. Aquí, y solo aquí, nace la
 * entrevista — ver docs/data-model.md "El orden de creación importa": nace
 * antes que el cliente, con cliente_id NULL, para que quien abandone antes
 * de dar nombre y correo no deje ningún dato personal.
 */
export async function aceptarConsentimiento(
  _estadoPrevio: EstadoConsentimiento,
  formData: FormData,
): Promise<EstadoConsentimiento> {
  const aceptado = formData.get('acepto') === 'on';
  if (!aceptado) {
    return { error: 'Tienes que marcar la casilla para continuar.' };
  }

  const admin = createAdminClient();
  const ip = await ipDelVisitante();
  const ipHash = hashIp(ip);

  const dentro = await dentroDeLimite(
    admin,
    ipHash,
    'crear_entrevista',
    MAX_ENTREVISTAS_POR_HORA,
  );
  if (!dentro) {
    return {
      error:
        'Se han hecho demasiadas entrevistas nuevas desde tu conexión en la última hora. Inténtalo de nuevo un poco más tarde.',
    };
  }

  const { data, error } = await admin
    .from('entrevistas')
    .insert({})
    .select('token')
    .single();

  if (error || !data) {
    return {
      error: 'Algo ha ido mal al empezar tu entrevista. Inténtalo de nuevo.',
    };
  }

  await registrarUso(admin, ipHash, 'crear_entrevista');

  redirect(`/entrevista/${data.token}`);
}
