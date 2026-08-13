import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de servicio: salta RLS con SUPABASE_SERVICE_ROLE_KEY.
 *
 * SOLO desde rutas de servidor (Route Handlers). El import 'server-only'
 * hace que el build falle si algo intenta meter este archivo en un bundle
 * de cliente — ver decisiones #5 y #6 en docs/architecture.md.
 *
 * Es el único camino por el que el cliente final (el que hace la
 * entrevista, sin sesión de Auth) llega a escribir en la base de datos: la
 * ruta de servidor valida el token de la entrevista en código y usa este
 * cliente para leer y escribir.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.',
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
