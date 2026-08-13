import Link from 'next/link';

export default function Landing() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-16 dark:bg-slate-950">
      <div className="flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <p className="text-sm font-medium tracking-wide text-teal-700 uppercase dark:text-teal-400">
          Orientación educativa, no asesoramiento regulado
        </p>

        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl dark:text-slate-50">
          Habla cinco minutos de tu dinero y sal con un plan claro
        </h1>

        <p className="max-w-md text-lg leading-8 text-slate-600 dark:text-slate-300">
          Una conversación corta, sin formularios, para saber dónde estás hoy
          y si vas camino de tu meta. Lo explicamos en castellano llano, con
          tus números.
        </p>

        <p className="max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          Es para ti si tienes una meta con tu dinero —jubilarte tranquilo,
          comprar una casa, dejar de depender de la nómina— y no sabes muy
          bien si vas bien encaminado.
        </p>

        <Link
          href="/consentimiento"
          className="mt-2 rounded-full bg-teal-700 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-teal-800"
        >
          Empezar mi diagnóstico
        </Link>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          Sin registro. Sin contraseña. Puedes cerrar y volver cuando quieras.
        </p>
      </div>
    </main>
  );
}
