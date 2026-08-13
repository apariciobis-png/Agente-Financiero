import type { SupabaseClient } from '@supabase/supabase-js';

export type RolMensaje = 'agente' | 'cliente';

export type Mensaje = {
  id: number;
  rol: RolMensaje;
  contenido: string;
  creado_en: string;
};

/** Literal de docs/criterio/instrucciones-agente-v2.md — apertura de la Fase 4. */
export const MENSAJE_APERTURA =
  '¡Hola! Soy tu asistente de finanzas personales. Te voy a hacer unas preguntas rápidas —5 minutos, sin cifras exactas, con aproximaciones me vale— y al final te entrego un plan claro con tu situación y qué puedes hacer. ¿Cómo te llamas y empezamos?';

/**
 * Si la entrevista todavía no tiene ningún mensaje, inserta la apertura
 * literal como primer turno del agente. Se guarda en base de datos —igual
 * que cualquier otro mensaje— para que sobreviva a una recarga.
 */
export async function asegurarMensajeApertura(
  admin: SupabaseClient,
  entrevistaId: string,
): Promise<Mensaje[]> {
  const { data: existentes, error } = await admin
    .from('mensajes')
    .select('id, rol, contenido, creado_en')
    .eq('entrevista_id', entrevistaId)
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  if (existentes && existentes.length > 0) return existentes as Mensaje[];

  const { data: apertura, error: errorInsercion } = await admin
    .from('mensajes')
    .insert({
      entrevista_id: entrevistaId,
      rol: 'agente',
      contenido: MENSAJE_APERTURA,
    })
    .select('id, rol, contenido, creado_en')
    .single();

  if (errorInsercion || !apertura) {
    throw new Error(errorInsercion?.message ?? 'No se pudo abrir la entrevista.');
  }

  return [apertura as Mensaje];
}
