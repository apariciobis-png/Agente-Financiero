import type { SeccionesPlan } from '@/lib/planes';

const TITULOS: { clave: keyof SeccionesPlan; titulo: string }[] = [
  { clave: 'tuMeta', titulo: 'Tu meta' },
  { clave: 'tuFotoDeHoy', titulo: 'Tu foto de hoy' },
  { clave: 'llegasSiSiguesAsi', titulo: '¿Llegas si sigues así?' },
  { clave: 'tuPlanPasoAPaso', titulo: 'Tu plan, paso a paso' },
  { clave: 'siLosNumerosNoSalen', titulo: 'Si los números no salen: tus opciones' },
  { clave: 'deCada100Futuros', titulo: 'De cada 100 futuros posibles…' },
  { clave: 'loQueMeFaltaSaber', titulo: 'Lo que me falta saber' },
];

/** Lo que el cliente vio, tal cual — docs/user-flows.md, Flujo 2: "Plan entregado". */
export function VistaPlan({ secciones, descargo }: { secciones: SeccionesPlan; descargo: string }) {
  return (
    <div className="flex flex-col gap-4">
      {TITULOS.filter((t) => secciones[t.clave]).map((t) => (
        <div key={t.clave} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-base font-medium text-slate-900 dark:text-slate-50">
            {t.titulo}
          </h3>
          <p className="text-sm leading-6 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
            {secciones[t.clave]}
          </p>
        </div>
      ))}
      <div className="rounded-xl bg-slate-100 p-4 text-xs leading-5 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        {descargo}
      </div>
    </div>
  );
}
