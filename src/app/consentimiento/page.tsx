import type { Metadata } from 'next';
import { ConsentimientoForm } from './consentimiento-form';

export const metadata: Metadata = {
  title: 'Antes de empezar — Asesor financiero',
};

export default function PaginaConsentimiento() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-16 dark:bg-slate-950">
      <div className="flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-3 text-center sm:text-left">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Antes de empezar
          </h1>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            Te voy a hacer unas preguntas sobre tu situación financiera para
            hacerte un diagnóstico con tus números. Nada de esto se comparte
            con nadie más que con el asesor que lo revisa, y puedes pedir que
            se borre cuando quieras.
          </p>
          <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
            Para eso necesito tu permiso explícito para dos cosas: usar lo que
            me cuentes para calcular tu diagnóstico, y que un asesor pueda
            escribirte con el resultado.
          </p>
        </div>

        <ConsentimientoForm />
      </div>
    </main>
  );
}
