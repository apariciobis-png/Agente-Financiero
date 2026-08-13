import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente público de Supabase, para Client Components.
 *
 * Solo lleva la clave anónima (segura de exponer en el navegador) y solo
 * la usa Marta para su sesión de Auth. El cliente final de la entrevista
 * nunca habla con Supabase directamente — ver decisión #6 en
 * docs/architecture.md.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
