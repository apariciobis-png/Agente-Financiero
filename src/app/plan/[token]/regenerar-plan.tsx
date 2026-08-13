'use client';

import { useState } from 'react';

export function RegenerarPlan({ token }: { token: string }) {
  const [estado, setEstado] = useState<'reposo' | 'cargando' | 'error'>('reposo');

  async function intentar() {
    setEstado('cargando');
    try {
      const res = await fetch(`/api/entrevistas/${token}/plan`, { method: 'POST' });
      if (!res.ok) {
        setEstado('error');
        return;
      }
      window.location.reload();
    } catch {
      setEstado('error');
    }
  }

  return (
    <div className="mt-2 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={intentar}
        disabled={estado === 'cargando'}
        className="rounded-full bg-teal-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {estado === 'cargando' ? 'Preparando…' : 'Reintentar'}
      </button>
      {estado === 'error' && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
          Sigue sin salir. Inténtalo de nuevo en un momento.
        </p>
      )}
    </div>
  );
}
