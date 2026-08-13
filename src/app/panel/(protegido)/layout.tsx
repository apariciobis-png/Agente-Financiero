import Link from 'next/link';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { CerrarSesion } from '../cerrar-sesion';

/**
 * Grupo de rutas `(protegido)`: no cambia la URL (sigue siendo /panel,
 * /panel/clientes/...), pero mantiene esta verificación fuera de
 * /panel/login y /panel/auth — esas no necesitan (ni deben) pedir que quien
 * las visita ya esté en `asesores`.
 *
 * El proxy (src/proxy.ts) ya garantiza que hay sesión. Aquí se comprueba
 * además que esa sesión pertenece a alguien de la tabla `asesores` — estar
 * ahí ES el permiso (docs/data-model.md).
 */
export default async function LayoutPanel({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: asesor } = user
    ? await supabase.from('asesores').select('nombre').eq('id', user.id).maybeSingle()
    : { data: null };

  if (!asesor) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center dark:bg-slate-950">
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Esta cuenta no tiene acceso al panel
          </h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            Tu correo se ha verificado, pero no está dado de alta como
            asesora. Habla con quien gestiona el proyecto si crees que es un
            error.
          </p>
          <CerrarSesion />
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Link href="/panel" className="font-semibold text-slate-900 dark:text-slate-50">
          Panel · {asesor.nombre}
        </Link>
        <CerrarSesion />
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
