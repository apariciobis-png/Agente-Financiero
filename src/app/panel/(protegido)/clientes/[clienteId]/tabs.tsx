'use client';

import { useState, type ReactNode } from 'react';

const VISTAS = [
  { clave: 'diagnostico', titulo: 'Diagnóstico' },
  { clave: 'ficha', titulo: 'Ficha cruda' },
  { clave: 'plan', titulo: 'Plan' },
] as const;

type Clave = (typeof VISTAS)[number]['clave'];

/** Las tres vistas de la ficha de cliente — docs/user-flows.md, Flujo 2. */
export function TabsCliente({
  diagnostico,
  ficha,
  plan,
}: {
  diagnostico: ReactNode;
  ficha: ReactNode;
  plan: ReactNode;
}) {
  const [activa, setActiva] = useState<Clave>('diagnostico');
  const contenido = { diagnostico, ficha, plan } as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {VISTAS.map((v) => (
          <button
            key={v.clave}
            type="button"
            onClick={() => setActiva(v.clave)}
            className={`px-4 py-2 text-sm font-medium ${
              activa === v.clave
                ? 'border-b-2 border-teal-700 text-teal-700 dark:border-teal-400 dark:text-teal-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {v.titulo}
          </button>
        ))}
      </div>
      {contenido[activa]}
    </div>
  );
}
