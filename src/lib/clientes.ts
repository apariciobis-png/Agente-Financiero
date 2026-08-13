import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Vincula (o crea) el cliente de una entrevista a partir de su nombre y
 * correo. Es el momento en que un visitante anónimo se convierte en lead —
 * ver docs/data-model.md "Por qué el correo es único".
 *
 * Si el correo ya existe, se enlaza al cliente existente en vez de
 * duplicarlo. Email normalizado a minúsculas antes de comparar/insertar.
 */
export async function vincularCliente(
  admin: SupabaseClient,
  entrevistaId: string,
  nombre: string,
  email: string,
): Promise<{ clienteId: string } | { error: string }> {
  const emailNormalizado = email.trim().toLowerCase();
  const nombreLimpio = nombre.trim();

  if (!nombreLimpio || !emailNormalizado.includes('@')) {
    return { error: 'Nombre o correo no válidos.' };
  }

  const { data: existente, error: errorBusqueda } = await admin
    .from('clientes')
    .select('id')
    .eq('email', emailNormalizado)
    .maybeSingle();

  if (errorBusqueda) {
    return { error: errorBusqueda.message };
  }

  let clienteId = existente?.id as string | undefined;

  if (!clienteId) {
    const { data: nuevo, error: errorInsercion } = await admin
      .from('clientes')
      .insert({ nombre: nombreLimpio, email: emailNormalizado })
      .select('id')
      .single();

    if (errorInsercion || !nuevo) {
      return { error: errorInsercion?.message ?? 'No se pudo crear el cliente.' };
    }
    clienteId = nuevo.id as string;
  }

  const { error: errorEnlace } = await admin
    .from('entrevistas')
    .update({ cliente_id: clienteId })
    .eq('id', entrevistaId);

  if (errorEnlace) {
    return { error: errorEnlace.message };
  }

  return { clienteId };
}
