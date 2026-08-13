import Link from 'next/link';
import type { ReactNode } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Ficha } from '@/lib/motor/ficha';
import { ResumenEditable } from './resumen-editable';

/**
 * Pantalla de confirmación (Fase 6). Solo tiene sentido si ya hay una ficha
 * — si el cliente llega aquí sin haber conversado, no hay nada que revisar.
 */
export default async function PaginaConfirmar({
  params,
}: PageProps<'/entrevista/[token]/confirmar'>) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: entrevista } = await admin
    .from('entrevistas')
    .select('id, estado')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista) {
    return (
      <Mensaje titulo="Este enlace no es válido">
        Puede que el enlace esté mal copiado. Empieza de nuevo desde la
        página principal.
      </Mensaje>
    );
  }

  if (entrevista.estado === 'completada') {
    return (
      <Mensaje titulo="Ya confirmaste tus datos">
        Gracias — no hace falta que hagas nada más aquí. En cuanto tu
        diagnóstico esté listo, te lo haremos llegar.
      </Mensaje>
    );
  }

  const { data: fichaFila } = await admin
    .from('fichas')
    .select('datos')
    .eq('entrevista_id', entrevista.id)
    .eq('version', 1)
    .maybeSingle();

  if (!fichaFila) {
    return (
      <Mensaje titulo="Todavía no hay nada que confirmar">
        Antes de revisar tus datos hace falta terminar la conversación.
        <div className="mt-4">
          <Link
            href={`/entrevista/${token}`}
            className="rounded-full bg-teal-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-teal-800"
          >
            Ir a la entrevista
          </Link>
        </div>
      </Mensaje>
    );
  }

  return <ResumenEditable token={token} fichaInicial={fichaFila.datos as Ficha} />;
}

function Mensaje({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center dark:bg-slate-950">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {titulo}
        </h1>
        <div className="text-base leading-7 text-slate-600 dark:text-slate-300">
          {children}
        </div>
      </div>
    </main>
  );
}
