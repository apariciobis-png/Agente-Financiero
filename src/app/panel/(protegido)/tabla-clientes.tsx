'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { FilaListadoCliente } from '@/lib/panel';

const ORDEN_BANDA: Record<string, number> = { Baja: 0, Frágil: 1, Razonable: 2, Alta: 3 };

const ESTILO_BANDA: Record<string, string> = {
  Alta: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Razonable: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
  Frágil: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Baja: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

const ESTADO_TEXTO: Record<string, string> = {
  en_curso: 'En curso',
  pendiente_confirmacion: 'Por confirmar',
  completada: 'Completada',
  abandonada: 'Abandonada',
};

export function TablaClientes({ filas }: { filas: FilaListadoCliente[] }) {
  const [orden, setOrden] = useState<'riesgo' | 'nombre'>('riesgo');

  const ordenadas = useMemo(() => {
    const copia = [...filas];
    if (orden === 'nombre') {
      return copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    return copia.sort((a, b) => {
      const sa = a.banda ? ORDEN_BANDA[a.banda] : 99;
      const sb = b.banda ? ORDEN_BANDA[b.banda] : 99;
      return sa - sb;
    });
  }, [filas, orden]);

  if (filas.length === 0) {
    return (
      <p className="text-base text-slate-500 dark:text-slate-400">
        Todavía no hay ningún cliente. En cuanto alguien complete su
        diagnóstico, aparecerá aquí.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">
              <button type="button" onClick={() => setOrden('nombre')} className="hover:underline">
                Cliente
              </button>
            </th>
            <th className="px-4 py-3 font-medium">Meta</th>
            <th className="px-4 py-3 font-medium">Plazo</th>
            <th className="px-4 py-3 font-medium">
              <button type="button" onClick={() => setOrden('riesgo')} className="hover:underline">
                Probabilidad
              </button>
            </th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {ordenadas.map((fila) => (
            <tr key={fila.clienteId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <td className="px-4 py-3">
                <Link
                  href={`/panel/clientes/${fila.clienteId}`}
                  className="font-medium text-slate-900 hover:underline dark:text-slate-50"
                >
                  {fila.nombre}
                </Link>
                <div className="text-xs text-slate-500 dark:text-slate-400">{fila.email}</div>
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                {fila.objetivoDescripcion ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {fila.objetivoPlazo ? `${fila.objetivoPlazo} años` : '—'}
              </td>
              <td className="px-4 py-3">
                {fila.banda ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${ESTILO_BANDA[fila.banda]}`}
                  >
                    {fila.banda}
                    {fila.probCumplimiento != null &&
                      ` · ${Math.round(fila.probCumplimiento * 100)}%`}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">Sin calcular</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                {ESTADO_TEXTO[fila.estado] ?? fila.estado}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
