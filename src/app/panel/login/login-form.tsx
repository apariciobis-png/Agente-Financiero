'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const supabase = createClient();
    const { error: errorEnvio } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/panel/auth/callback`,
      },
    });

    setEnviando(false);
    if (errorEnvio) {
      setError('No se pudo enviar el enlace. Comprueba el correo e inténtalo de nuevo.');
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
        Te hemos mandado un enlace a <strong>{email}</strong>. Ábrelo desde
        este mismo dispositivo para entrar.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      {error && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando || !email}
        className="rounded-full bg-teal-700 px-6 py-2.5 text-base font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {enviando ? 'Enviando…' : 'Enviarme el enlace'}
      </button>
    </form>
  );
}
