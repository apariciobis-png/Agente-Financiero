'use client';

import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ResultadoAnalisis } from '@/lib/diagnostico';

const COLOR_BANDA: Record<string, string> = {
  Alta: '#059669',
  Razonable: '#0d9488',
  Frágil: '#d97706',
  Baja: '#dc2626',
};

const COLOR_CLASE: Record<string, string> = {
  renta_variable: '#0d9488',
  renta_fija: '#64748b',
  liquidez: '#cbd5e1',
  oro: '#eab308',
};

const NOMBRE_CLASE: Record<string, string> = {
  renta_variable: 'Bolsa mundial',
  renta_fija: 'Renta fija',
  liquidez: 'Hucha segura',
  oro: 'Oro',
};

const FORMATO_EUROS = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function VistaDiagnostico({ resultado }: { resultado: ResultadoAnalisis }) {
  if (resultado.recomendacionSuspendida) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <h2 className="mb-2 font-semibold">Recomendación suspendida</h2>
        <p className="text-sm leading-6">{resultado.motivoSuspension}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <IndicadorProbabilidad resultado={resultado} />
      {resultado.cartera && <AnilloCartera pesos={resultado.cartera.pesos} />}
      {resultado.serieTemporal && <BandaProyeccion serie={resultado.serieTemporal} />}
      {resultado.prioridadesR1 && <ChecklistR1 pasos={resultado.prioridadesR1} />}
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">{titulo}</h3>
      {children}
    </div>
  );
}

function IndicadorProbabilidad({ resultado }: { resultado: ResultadoAnalisis }) {
  const mc = resultado.montecarlo;
  if (!mc || mc.probCumplimiento == null || !mc.banda) {
    return (
      <Tarjeta titulo="Probabilidad de cumplimiento">
        <p className="text-sm text-slate-400">Sin objetivo claro que evaluar todavía.</p>
      </Tarjeta>
    );
  }
  const color = COLOR_BANDA[mc.banda] ?? '#64748b';
  return (
    <Tarjeta titulo="Probabilidad de cumplimiento">
      <div className="flex items-center gap-4">
        <div className="text-4xl font-semibold" style={{ color }}>
          {Math.round(mc.probCumplimiento * 100)}%
        </div>
        <span
          className="rounded-full px-3 py-1 text-sm font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {mc.banda}
        </span>
      </div>
      {resultado.aportacion && typeof resultado.aportacion.propuesta !== 'number' && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Con la aportación sostenible actual, la meta no cuadra en el plazo pedido.
        </p>
      )}
    </Tarjeta>
  );
}

function AnilloCartera({ pesos }: { pesos: Partial<Record<string, number>> }) {
  const datos = Object.entries(pesos)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([clase, valor]) => ({
      clase,
      nombre: NOMBRE_CLASE[clase] ?? clase,
      valor: Math.round((valor ?? 0) * 100),
    }));

  return (
    <Tarjeta titulo="Composición de la cartera">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="valor"
              nameKey="nombre"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
            >
              {datos.map((d) => (
                <Cell key={d.clase} fill={COLOR_CLASE[d.clase] ?? '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v} de cada 100 €`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        {datos.map((d) => (
          <li key={d.clase} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLOR_CLASE[d.clase] ?? '#94a3b8' }}
            />
            {d.nombre}: {d.valor}
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

function BandaProyeccion({
  serie,
}: {
  serie: { anios: number; p10: number; p50: number; p90: number }[];
}) {
  const datos = serie.map((p) => ({ ...p, rango: [p.p10, p.p90] }));
  return (
    <Tarjeta titulo="Proyección (euros de hoy)">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datos} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
            <XAxis dataKey="anios" tickFormatter={(v) => `${v}a`} fontSize={12} />
            <YAxis
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              fontSize={12}
              width={40}
            />
            <Tooltip
              formatter={(v) => FORMATO_EUROS.format(Number(v))}
              labelFormatter={(v) => `Año ${v}`}
            />
            <Area
              type="monotone"
              dataKey="p90"
              stroke="none"
              fill="#0d9488"
              fillOpacity={0.15}
            />
            <Area
              type="monotone"
              dataKey="p10"
              stroke="none"
              fill="#ffffff"
              className="dark:fill-slate-900"
              fillOpacity={1}
            />
            <Area type="monotone" dataKey="p50" stroke="#0d9488" strokeWidth={2} fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        La anchura de la banda (entre p10 y p90) es la incertidumbre real —
        la línea central es el escenario intermedio, no una promesa.
      </p>
    </Tarjeta>
  );
}

function ChecklistR1({ pasos }: { pasos: { paso: string; cumplido: boolean; detalle: string }[] }) {
  return (
    <Tarjeta titulo="Prioridades del ahorro (R1)">
      <ul className="flex flex-col gap-2">
        {pasos.map((p) => (
          <li key={p.paso} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] text-white ${
                p.cumplido ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              {p.cumplido ? '✓' : ''}
            </span>
            <div>
              <p className="text-slate-800 dark:text-slate-100">{p.paso}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{p.detalle}</p>
            </div>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
