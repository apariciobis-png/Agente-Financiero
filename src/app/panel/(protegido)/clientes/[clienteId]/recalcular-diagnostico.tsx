'use client';

import { useState } from 'react';

export function RecalcularDiagnostico({ clienteId }: { clienteId: string }) {
  const [estado, setEstado] = useState<'reposo' | 'cargando' | 'error'>('reposo');

  async function recalcular() {
    setEstado('cargando');
    try {
      const res = await fetch(`/api/panel/clientes/${clienteId}/recalcular`, { method: 'POST' });
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={recalcular}
        disabled={estado === 'cargando'}
        className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {estado === 'cargando' ? 'Recalculando…' : 'Recalcular diagnóstico'}
      </button>
      {estado === 'error' && (
        <span className="text-xs text-amber-700 dark:text-amber-400">No se pudo recalcular.</span>
      )}
    </div>
  );
}
