'use client';

import { useActionState, useState } from 'react';
import { aceptarConsentimiento } from './actions';

export function ConsentimientoForm() {
  const [estado, formAction, enviando] = useActionState(
    aceptarConsentimiento,
    null,
  );
  const [marcado, setMarcado] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <input
          type="checkbox"
          name="acepto"
          checked={marcado}
          onChange={(e) => setMarcado(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-teal-600"
        />
        <span>
          Entiendo y acepto que mis datos se usen para{' '}
          <strong>hacer mi diagnóstico financiero</strong> y para que{' '}
          <strong>un asesor pueda contactarme</strong> a partir de lo que le
          cuente. Es orientación educativa, no asesoramiento financiero
          regulado.
        </span>
      </label>

      {estado?.error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!marcado || enviando}
        className="w-full rounded-full bg-teal-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
      >
        {enviando ? 'Empezando…' : 'Acepto, empezar mi diagnóstico'}
      </button>
    </form>
  );
}
