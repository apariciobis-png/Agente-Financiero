'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import type { Mensaje } from '@/lib/mensajes';

const TITULOS_BLOQUES = [
  'Objetivo',
  'Situación',
  'Gasto',
  'Ahorro actual',
  'Patrimonio',
  'Deudas',
  'Colchón',
  'Riesgo',
];

export function Chat({
  token,
  mensajesIniciales,
  progresoInicial,
}: {
  token: string;
  mensajesIniciales: Mensaje[];
  progresoInicial: boolean[] | null;
}) {
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [progreso, setProgreso] = useState<boolean[]>(
    progresoInicial ?? Array(8).fill(false),
  );
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listaParaConfirmar, setListaParaConfirmar] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido || enviando) return;

    setError(null);
    setEnviando(true);
    setTexto('');

    // Optimista: el mensaje del cliente aparece al momento.
    setMensajes((prev) => [
      ...prev,
      { id: Date.now(), rol: 'cliente', contenido, creado_en: new Date().toISOString() },
    ]);

    try {
      const res = await fetch(`/api/entrevistas/${token}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      });
      const datos = await res.json();

      if (!res.ok) {
        setError(datos.error ?? 'Algo ha ido mal. Inténtalo de nuevo.');
        return;
      }

      setMensajes((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          rol: 'agente',
          contenido: datos.respuesta,
          creado_en: new Date().toISOString(),
        },
      ]);
      if (Array.isArray(datos.progreso)) {
        setProgreso(datos.progreso);
      }
      if (datos.listaParaConfirmar) {
        setListaParaConfirmar(true);
      }
      requestAnimationFrame(() =>
        finRef.current?.scrollIntoView({ behavior: 'smooth' }),
      );
    } catch {
      setError('No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-50 sm:flex-row dark:bg-slate-950">
      <BarraProgreso progreso={progreso} />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.rol === 'cliente' ? 'justify-end' : 'justify-start'}`}
              >
                <p
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-6 whitespace-pre-wrap ${
                    m.rol === 'cliente'
                      ? 'bg-teal-700 text-white'
                      : 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  {m.contenido}
                </p>
              </div>
            ))}
            {enviando && (
              <div className="flex justify-start">
                <p className="rounded-2xl bg-white px-4 py-2.5 text-sm text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">
                  Pensando…
                </p>
              </div>
            )}
            <div ref={finRef} />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-2xl">
            {error && (
              <p role="alert" className="mb-2 text-sm text-amber-700 dark:text-amber-400">
                {error}
              </p>
            )}
            {listaParaConfirmar ? (
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Ya tengo lo que necesito. Repasa tus datos antes de confirmar.
                </p>
                <Link
                  href={`/entrevista/${token}/confirmar`}
                  className="rounded-full bg-teal-700 px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-teal-800"
                >
                  Revisar y confirmar
                </Link>
              </div>
            ) : (
              <form onSubmit={enviar} className="flex gap-2">
                <input
                  type="text"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribe tu respuesta…"
                  disabled={enviando}
                  autoFocus
                  className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:border-teal-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={enviando || !texto.trim()}
                  className="rounded-full bg-teal-700 px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                  Enviar
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Los 8 bloques de la plantilla. Superior en móvil, lateral en escritorio
 * (docs/design-system.md). Reduce el abandono: convierte una conversación de
 * duración desconocida en una barra que avanza.
 */
function BarraProgreso({ progreso }: { progreso: boolean[] }) {
  return (
    <nav
      aria-label="Progreso de la entrevista"
      className="order-first shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:order-none sm:w-52 sm:border-r sm:border-b-0 sm:px-4 sm:py-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <ol className="flex gap-2 overflow-x-auto sm:flex-col sm:gap-1 sm:overflow-visible">
        {TITULOS_BLOQUES.map((titulo, i) => (
          <li
            key={titulo}
            className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 text-sm sm:shrink sm:rounded-lg sm:px-2 sm:py-1.5"
          >
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 rounded-full ${
                progreso[i]
                  ? 'bg-teal-600'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
            <span
              className={
                progreso[i]
                  ? 'text-slate-700 dark:text-slate-200'
                  : 'text-slate-400 dark:text-slate-500'
              }
            >
              {titulo}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
