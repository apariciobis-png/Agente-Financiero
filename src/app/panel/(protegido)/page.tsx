import { createClient } from '@/lib/supabase/server';
import { listarClientes } from '@/lib/panel';
import { TablaClientes } from './tabla-clientes';

export default async function PaginaPanel() {
  const supabase = await createClient();
  const filas = await listarClientes(supabase);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
        Tus clientes
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Ordenado por riesgo: quien tiene la meta más en peligro aparece
        primero.
      </p>
      <TablaClientes filas={filas} />
    </main>
  );
}
