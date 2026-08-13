'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Dato, Deudas, Ficha } from '@/lib/motor/ficha';
import { CAMPOS_FICHA, type CampoFicha } from '@/lib/campos-ficha';
import { formatearValor } from '@/lib/formato-ficha';

const ETIQUETA_ESTILOS: Record<string, string> = {
  confirmado: 'text-slate-500 dark:text-slate-400',
  estimado: 'text-amber-700 dark:text-amber-500',
  pendiente: 'text-slate-400 italic dark:text-slate-500',
};

const ETIQUETA_TEXTO: Record<string, string> = {
  confirmado: 'Confirmado',
  estimado: 'Estimado',
  pendiente: 'Sin dato',
};

export function ResumenEditable({
  token,
  fichaInicial,
}: {
  token: string;
  fichaInicial: Ficha;
}) {
  const [ficha, setFicha] = useState(fichaInicial);
  const [cerrando, setCerrando] = useState(false);
  const [cerrada, setCerrada] = useState(false);
  const [planListo, setPlanListo] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  async function guardarCampo(clave: CampoFicha['clave'], valor: unknown) {
    const res = await fetch(`/api/entrevistas/${token}/ficha`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave, valor }),
    });
    if (!res.ok) throw new Error('No se pudo guardar la corrección.');
    const datos = await res.json();
    setFicha((prev) => ({ ...prev, [clave]: datos.dato as Dato<unknown> }));
  }

  async function confirmarYEnviar() {
    setCerrando(true);
    setErrorCierre(null);
    try {
      const res = await fetch(`/api/entrevistas/${token}/cerrar`, { method: 'POST' });
      if (!res.ok) {
        const datos = await res.json().catch(() => null);
        setErrorCierre(datos?.error ?? 'No se pudo confirmar. Inténtalo de nuevo.');
        return;
      }
      const datos = await res.json().catch(() => null);
      setPlanListo(Boolean(datos?.plan));
      setCerrada(true);
    } catch {
      setErrorCierre('No se pudo conectar. Inténtalo de nuevo.');
    } finally {
      setCerrando(false);
    }
  }

  if (cerrada) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          ¡Gracias!
        </h1>
        <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
          {planListo
            ? 'Ya tenemos tu ficha confirmada y tu plan listo.'
            : 'Ya tenemos tu ficha confirmada. Estamos terminando de preparar tu plan.'}
        </p>
        <Link
          href={`/plan/${token}`}
          className="mt-2 rounded-full bg-teal-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-teal-800"
        >
          Ver mi plan
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Repasa lo que nos has contado
        </h1>
        <p className="text-base leading-6 text-slate-600 dark:text-slate-300">
          Corrige lo que haga falta clicando en cualquier fila. Lo que
          corrijas aquí queda como dato confirmado.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {CAMPOS_FICHA.map((campo) =>
          campo.tipo === 'deudas' ? (
            <FilaDeudas
              key={campo.clave}
              campo={campo}
              dato={ficha.deudas}
              onGuardar={(valor) => guardarCampo('deudas', valor)}
            />
          ) : (
            <FilaEditable
              key={campo.clave}
              campo={campo}
              dato={ficha[campo.clave] as Dato<unknown>}
              onGuardar={(valor) => guardarCampo(campo.clave, valor)}
            />
          ),
        )}
      </div>

      {ficha.pendientes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">
            Pendientes para afinar el plan
          </p>
          <ul className="list-inside list-disc">
            {ficha.pendientes.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        Esto es orientación educativa hecha con tus números y supuestos
        prudentes, no asesoramiento financiero regulado ni una promesa de
        rentabilidad.
      </p>

      {errorCierre && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
          {errorCierre}
        </p>
      )}

      <button
        type="button"
        onClick={confirmarYEnviar}
        disabled={cerrando}
        className="self-start rounded-full bg-teal-700 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
      >
        {cerrando ? 'Confirmando…' : 'Confirmar y enviar'}
      </button>
    </div>
  );
}

function FilaEditable({
  campo,
  dato,
  onGuardar,
}: {
  campo: CampoFicha;
  dato: Dato<unknown>;
  onGuardar: (valor: unknown) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(dato.valor ?? ''));
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    try {
      const valorFinal = campo.tipo === 'numero' ? Number(valor) : valor;
      await onGuardar(valorFinal);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {campo.etiqueta}
        </span>
        {campo.tipo === 'enum' ? (
          <select
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="" disabled>
              Elige una opción
            </option>
            {campo.opciones?.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={campo.tipo === 'numero' ? 'number' : 'text'}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            autoFocus
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || !valor}
            className="rounded-full bg-teal-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-full px-4 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValor(String(dato.valor ?? ''));
        setEditando(true);
      }}
      className="flex w-full flex-col items-start gap-0.5 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
    >
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {campo.etiqueta}
      </span>
      <span className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-50">
        {formatearValor(campo, dato)}
        <span className={`text-xs font-normal ${ETIQUETA_ESTILOS[dato.etiqueta]}`}>
          {ETIQUETA_TEXTO[dato.etiqueta]}
        </span>
      </span>
    </button>
  );
}

function FilaDeudas({
  campo,
  dato,
  onGuardar,
}: {
  campo: CampoFicha;
  dato: Dato<unknown>;
  onGuardar: (valor: Deudas) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [estado, setEstado] = useState<'ninguna' | 'lista' | 'negativa'>('ninguna');
  const [tipo, setTipo] = useState('hipoteca');
  const [cuota, setCuota] = useState('');
  const [interes, setInteres] = useState('');
  const [saldo, setSaldo] = useState('');
  const [guardando, setGuardando] = useState(false);

  function abrir() {
    const actual = dato.valor as Deudas | null;
    if (actual?.tipo === 'lista' && actual.deudas[0]) {
      setEstado('lista');
      setTipo(actual.deudas[0].tipo);
      setCuota(actual.deudas[0].cuota != null ? String(actual.deudas[0].cuota) : '');
      setInteres(actual.deudas[0].interes != null ? String(actual.deudas[0].interes) : '');
      setSaldo(actual.deudas[0].saldo != null ? String(actual.deudas[0].saldo) : '');
    } else if (actual?.tipo === 'pendiente' && actual.motivo === 'negativa_cliente') {
      setEstado('negativa');
    } else {
      setEstado('ninguna');
    }
    setEditando(true);
  }

  async function guardar() {
    setGuardando(true);
    try {
      let valor: Deudas;
      if (estado === 'ninguna') {
        valor = { tipo: 'ninguna' };
      } else if (estado === 'negativa') {
        valor = { tipo: 'pendiente', motivo: 'negativa_cliente' };
      } else {
        valor = {
          tipo: 'lista',
          deudas: [
            {
              tipo,
              cuota: cuota ? Number(cuota) : null,
              interes: interes ? Number(interes) : null,
              saldo: saldo ? Number(saldo) : null,
            },
          ],
        };
      }
      await onGuardar(valor);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  if (editando) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {campo.etiqueta}
        </span>
        <div className="flex flex-col gap-1">
          {(
            [
              ['ninguna', 'No tengo deudas'],
              ['lista', 'Sí tengo una deuda'],
              ['negativa', 'Prefiero no decirlo'],
            ] as const
          ).map(([valorOpcion, texto]) => (
            <label key={valorOpcion} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="estado-deudas"
                checked={estado === valorOpcion}
                onChange={() => setEstado(valorOpcion)}
              />
              {texto}
            </label>
          ))}
        </div>

        {estado === 'lista' && (
          <div className="grid grid-cols-2 gap-2">
            <input
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Tipo (hipoteca, coche...)"
              className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              value={cuota}
              onChange={(e) => setCuota(e.target.value)}
              type="number"
              placeholder="Cuota €/mes"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              value={interes}
              onChange={(e) => setInteres(e.target.value)}
              type="number"
              placeholder="Interés %"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              value={saldo}
              onChange={(e) => setSaldo(e.target.value)}
              type="number"
              placeholder="Saldo pendiente € (si lo sabes)"
              className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="rounded-full bg-teal-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-full px-4 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      className="flex w-full flex-col items-start gap-0.5 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
    >
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {campo.etiqueta}
      </span>
      <span className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-50">
        {formatearValor(campo, dato)}
        <span className={`text-xs font-normal ${ETIQUETA_ESTILOS[dato.etiqueta]}`}>
          {ETIQUETA_TEXTO[dato.etiqueta]}
        </span>
      </span>
    </button>
  );
}
