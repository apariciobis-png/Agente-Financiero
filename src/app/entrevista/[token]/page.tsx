import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { asegurarMensajeApertura } from '@/lib/mensajes';
import { progresoBloques } from '@/lib/fichas';
import { Chat } from './chat';

/**
 * Solo se llega aquí con un token real, generado al aceptar el
 * consentimiento (docs/roadmap.md, Fase 3). No hay forma de fabricar esta
 * URL sin haber pasado por ahí: el token es un uuid aleatorio y esta página
 * lee la entrevista con el cliente de servicio porque el visitante no tiene
 * sesión de Supabase.
 */
export default async function PaginaEntrevista({
  params,
}: PageProps<'/entrevista/[token]'>) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: entrevista } = await admin
    .from('entrevistas')
    .select('id, estado, consentimiento_en, expira_en')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista) {
    return (
      <MensajeCentrado titulo="Este enlace no es válido">
        <p>
          Puede que el enlace esté mal copiado. Empieza tu diagnóstico de
          nuevo desde la página principal.
        </p>
        <BotonVolver />
      </MensajeCentrado>
    );
  }

  if (new Date(entrevista.expira_en) < new Date()) {
    return (
      <MensajeCentrado titulo="Este enlace ha caducado">
        <p>
          Las entrevistas caducan a los 30 días. Empieza una nueva desde la
          página principal — no lleva más de cinco minutos.
        </p>
        <BotonVolver />
      </MensajeCentrado>
    );
  }

  // Ya se completaron los 8 bloques (o ya se confirmó del todo): aquí no
  // queda nada por conversar, la pantalla que toca es la de confirmación.
  if (entrevista.estado === 'pendiente_confirmacion' || entrevista.estado === 'completada') {
    redirect(`/entrevista/${token}/confirmar`);
  }

  const mensajesIniciales = await asegurarMensajeApertura(admin, entrevista.id);

  // Si ya hay ficha (el cliente lleva un rato conversando y recarga), la
  // barra de progreso arranca con lo que ya se sabe, no vacía.
  const { data: fichaExistente } = await admin
    .from('fichas')
    .select('datos')
    .eq('entrevista_id', entrevista.id)
    .eq('version', 1)
    .maybeSingle();

  const progresoInicial = fichaExistente
    ? progresoBloques(fichaExistente.datos)
    : null;

  return (
    <Chat
      token={token}
      mensajesIniciales={mensajesIniciales}
      progresoInicial={progresoInicial}
    />
  );
}

function MensajeCentrado({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center dark:bg-slate-950">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {titulo}
        </h1>
        <div className="flex flex-col gap-3 text-base leading-7 text-slate-600 dark:text-slate-300">
          {children}
        </div>
      </div>
    </main>
  );
}

function BotonVolver() {
  return (
    <Link
      href="/"
      className="mt-2 rounded-full bg-teal-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-teal-800"
    >
      Volver al inicio
    </Link>
  );
}
