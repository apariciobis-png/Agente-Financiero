import type { Dato, Ficha } from '@/lib/motor/ficha';
import { CAMPOS_FICHA } from '@/lib/campos-ficha';
import { formatearValor } from '@/lib/formato-ficha';

const ETIQUETA_ESTILOS: Record<string, string> = {
  confirmado: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  estimado: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  pendiente: 'bg-slate-100 text-slate-400 italic dark:bg-slate-800 dark:text-slate-500',
};

/** La trazabilidad: "¿de dónde sale este número?" — docs/user-flows.md, Flujo 2. */
export function VistaFichaCruda({ ficha, pendientes }: { ficha: Ficha; pendientes: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {CAMPOS_FICHA.map((campo) => {
              const dato = ficha[campo.clave] as Dato<unknown>;
              return (
                <tr key={campo.clave}>
                  <td className="w-48 px-4 py-3 align-top font-medium text-slate-700 dark:text-slate-200">
                    {campo.etiqueta}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 dark:text-slate-50">
                        {formatearValor(campo, dato)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${ETIQUETA_ESTILOS[dato.etiqueta]}`}
                      >
                        {dato.etiqueta}
                      </span>
                    </div>
                    {dato.cita && (
                      <p className="mt-1 text-xs text-slate-500 italic dark:text-slate-400">
                        &ldquo;{dato.cita}&rdquo;
                      </p>
                    )}
                    {dato.supuesto && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Supuesto: {dato.supuesto}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pendientes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">
            Pendientes para afinar el plan
          </p>
          <ul className="list-inside list-disc text-slate-600 dark:text-slate-300">
            {pendientes.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
