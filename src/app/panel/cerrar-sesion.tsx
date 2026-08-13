'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function CerrarSesion() {
  const router = useRouter();

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/panel/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={salir}
      className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    >
      Cerrar sesión
    </button>
  );
}
