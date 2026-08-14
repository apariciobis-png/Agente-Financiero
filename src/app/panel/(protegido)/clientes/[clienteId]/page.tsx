import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { obtenerDetalleCliente } from '@/lib/panel';
import { TabsCliente } from './tabs';
import { VistaDiagnostico } from './vista-diagnostico';
import { VistaFichaCruda } from './vista-ficha-cruda';
import { VistaPlan } from './vista-plan';
import { RecalcularDiagnostico } from './recalcular-diagnostico';

export default async function PaginaCliente({
  params,
}: PageProps<'/panel/clientes/[clienteId]'>) {
  const { clienteId } = await params;
  const supabase = await createClient();
  const detalle = await obtenerDetalleCliente(supabase, clienteId);

  if (!detalle) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          No se encuentra este cliente
        </h1>
        <Link href="/panel" className="text-teal-700 underline dark:text-teal-400">
          Volver al listado
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <div>
        <Link href="/panel" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Todos los clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {detalle.cliente.nombre}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{detalle.cliente.email}</p>
      </div>

      {!detalle.analisis ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Todavía no hay diagnóstico para este cliente
          {detalle.entrevista ? ` (entrevista ${detalle.entrevista.estado}).` : '.'}
        </p>
      ) : (
        <>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Calculado el {new Date(detalle.analisis.calculadoEn).toLocaleString('es-ES')}
          </p>
          <RecalcularDiagnostico clienteId={detalle.cliente.id} />
        </div>
        <TabsCliente
          diagnostico={<VistaDiagnostico resultado={detalle.analisis.resultado} />}
          ficha={
            detalle.ficha ? (
              <VistaFichaCruda ficha={detalle.ficha.datos} pendientes={detalle.ficha.pendientes} />
            ) : (
              <p className="text-sm text-slate-500">Sin ficha.</p>
            )
          }
          plan={
            detalle.plan ? (
              <VistaPlan secciones={detalle.plan.secciones} descargo={detalle.plan.descargo} />
            ) : (
              <p className="text-sm text-slate-500">El plan todavía no se ha generado.</p>
            )
          }
        />
        </>
      )}
    </main>
  );
}
