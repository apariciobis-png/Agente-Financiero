import type { ReactNode } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { DESCARGO_PLAN, type SeccionesPlan } from '@/lib/planes';
import { RegenerarPlan } from './regenerar-plan';

const SECCIONES: { clave: keyof SeccionesPlan; titulo: string }[] = [
  { clave: 'tuMeta', titulo: 'Tu meta' },
  { clave: 'tuFotoDeHoy', titulo: 'Tu foto de hoy' },
  { clave: 'llegasSiSiguesAsi', titulo: '¿Llegas si sigues así?' },
  { clave: 'tuPlanPasoAPaso', titulo: 'Tu plan, paso a paso' },
  { clave: 'siLosNumerosNoSalen', titulo: 'Si los números no salen: tus opciones' },
  { clave: 'deCada100Futuros', titulo: 'De cada 100 futuros posibles…' },
  { clave: 'loQueMeFaltaSaber', titulo: 'Lo que me falta saber' },
];

export default async function PaginaPlan({
  params,
}: PageProps<'/plan/[token]'>) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: entrevista } = await admin
    .from('entrevistas')
    .select('id, cliente_id, estado')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista) {
    return <Mensaje titulo="Este enlace no es válido">Comprueba que lo copiaste bien.</Mensaje>;
  }
  if (entrevista.estado !== 'completada') {
    return (
      <Mensaje titulo="Todavía no hay plan">
        Antes de ver tu plan hace falta terminar y confirmar la entrevista.
      </Mensaje>
    );
  }

  const { data: ficha } = await admin
    .from('fichas')
    .select('id')
    .eq('entrevista_id', entrevista.id)
    .eq('version', 1)
    .maybeSingle();

  const { data: analisis } = ficha
    ? await admin
        .from('analisis')
        .select('id')
        .eq('ficha_id', ficha.id)
        .order('calculado_en', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { data: plan } = analisis
    ? await admin
        .from('planes')
        .select('secciones, descargo, generado_en')
        .eq('analisis_id', analisis.id)
        .order('generado_en', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  if (!plan) {
    return (
      <Mensaje titulo="Tu plan se está preparando">
        A veces la redacción falla al primer intento — no pasa nada, tus
        datos ya están guardados y calculados.
        {analisis && <RegenerarPlan token={token} />}
      </Mensaje>
    );
  }

  const secciones = plan.secciones as SeccionesPlan;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
        Tu plan
      </h1>

      {SECCIONES.filter((s) => secciones[s.clave]).map((s) => (
        <details
          key={s.clave}
          className="group rounded-xl border border-slate-200 bg-white p-4 open:pb-4 dark:border-slate-800 dark:bg-slate-900"
          open={s.clave === 'tuMeta' || s.clave === 'llegasSiSiguesAsi'}
        >
          <summary className="cursor-pointer text-lg font-medium text-slate-900 select-none dark:text-slate-50">
            {s.titulo}
          </summary>
          <p className="mt-3 text-base leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
            {secciones[s.clave]}
          </p>
        </details>
      ))}

      <div className="rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
        {DESCARGO_PLAN}
      </div>

      <a
        href={`/api/entrevistas/${token}/plan/descargar`}
        className="self-start text-sm font-medium text-teal-700 underline hover:text-teal-800 dark:text-teal-400"
      >
        Descargar tu plan en texto
      </a>
    </main>
  );
}

function Mensaje({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center dark:bg-slate-950">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {titulo}
        </h1>
        <div className="flex flex-col items-center gap-3 text-base leading-7 text-slate-600 dark:text-slate-300">
          {children}
        </div>
      </div>
    </main>
  );
}
