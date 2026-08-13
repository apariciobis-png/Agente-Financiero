import { LoginForm } from './login-form';

export default function PaginaLoginPanel() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-16 dark:bg-slate-950">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Panel de la asesora
          </h1>
          <p className="text-base leading-6 text-slate-600 dark:text-slate-300">
            Escribe tu correo y te mandamos un enlace para entrar — sin
            contraseña.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
