import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente de Supabase para Server Components y Route Handlers, con la
 * sesión de Marta (clave anónima + cookies de Auth). Las lecturas del panel
 * pasan por aquí y quedan sujetas a RLS como rol `authenticated`.
 *
 * No confundir con `admin.ts`: este cliente respeta RLS, no lo salta.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component sin poder escribir cookies.
            // Se ignora: el middleware de sesión se encarga de refrescarla.
          }
        },
      },
    },
  );
}
