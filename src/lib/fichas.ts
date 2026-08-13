import type { SupabaseClient } from '@supabase/supabase-js';
import type { Dato, Deudas, Etiqueta, Ficha } from './motor/ficha';

/**
 * Claves de la ficha que el modelo puede rellenar con `guardar_dato`.
 * Excluye `nombre`, `fechaEntrevista` (ya fijados al crear la ficha) y
 * `pendientes` (tiene su propia herramienta, `agregar_pendiente`).
 *
 * El orden importa solo para `resumenFicha` — no implica el orden de la
 * entrevista, que marca `docs/criterio/plantilla-entrevista.md`.
 */
export const CLAVES_FICHA = [
  'objetivoDescripcion',
  'objetivoCifra',
  'objetivoPlazo',
  'ingresosNetosMes',
  'ingresosEstabilidad',
  'gastoTotalMes',
  'aportacionMensualActual',
  'patrimonioTotal',
  'patrimonioDistribucion',
  'deudas',
  'colchonMeses',
  'riesgoExperiencia',
  'riesgoEscenario',
  'riesgoPerfilDerivado',
] as const;

export type ClaveFicha = (typeof CLAVES_FICHA)[number];

const ETIQUETAS: Etiqueta[] = ['confirmado', 'estimado', 'pendiente'];

export function esClaveFicha(valor: unknown): valor is ClaveFicha {
  return (
    typeof valor === 'string' && (CLAVES_FICHA as readonly string[]).includes(valor)
  );
}

export function esEtiqueta(valor: unknown): valor is Etiqueta {
  return typeof valor === 'string' && (ETIQUETAS as string[]).includes(valor);
}

/** Ficha en blanco: todo `pendiente`, deudas sin preguntar todavía. */
export function fichaVacia(nombre: string): Ficha {
  const vacio = <T,>(): Dato<T> => ({ valor: null, etiqueta: 'pendiente' });

  return {
    nombre,
    fechaEntrevista: new Date().toISOString().slice(0, 10),
    objetivoDescripcion: vacio(),
    objetivoCifra: vacio(),
    objetivoPlazo: vacio(),
    ingresosNetosMes: vacio(),
    ingresosEstabilidad: vacio(),
    gastoTotalMes: vacio(),
    aportacionMensualActual: vacio(),
    patrimonioTotal: vacio(),
    patrimonioDistribucion: vacio(),
    deudas: {
      valor: { tipo: 'pendiente', motivo: 'no_preguntado' },
      etiqueta: 'pendiente',
    },
    colchonMeses: vacio(),
    riesgoExperiencia: vacio(),
    riesgoEscenario: vacio(),
    riesgoPerfilDerivado: vacio(),
    pendientes: [],
  };
}

/** Aplica un dato capturado por `guardar_dato`. Devuelve una ficha nueva. */
export function aplicarDato(
  ficha: Ficha,
  clave: ClaveFicha,
  valor: unknown,
  etiqueta: Etiqueta,
  cita?: string,
  supuesto?: string,
): Ficha {
  return {
    ...ficha,
    [clave]: { valor, etiqueta, cita, supuesto } as Dato<unknown>,
  };
}

export function agregarPendiente(ficha: Ficha, texto: string): Ficha {
  return { ...ficha, pendientes: [...ficha.pendientes, texto] };
}

/**
 * Busca la ficha "en curso" de la entrevista (versión 1 — no se versiona
 * hasta que se cierra en la Fase 6, ver docs/data-model.md) o la crea si es
 * la primera vez que hay datos que guardar.
 */
export async function obtenerOCrearFicha(
  admin: SupabaseClient,
  entrevistaId: string,
  clienteId: string,
  nombre: string,
): Promise<{ id: string; datos: Ficha }> {
  const { data: existente } = await admin
    .from('fichas')
    .select('id, datos')
    .eq('entrevista_id', entrevistaId)
    .eq('version', 1)
    .maybeSingle();

  if (existente) {
    return { id: existente.id as string, datos: existente.datos as Ficha };
  }

  const datos = fichaVacia(nombre);
  const { data: creada, error } = await admin
    .from('fichas')
    .insert({
      cliente_id: clienteId,
      entrevista_id: entrevistaId,
      version: 1,
      datos,
      pendientes: [],
    })
    .select('id, datos')
    .single();

  if (error || !creada) {
    throw new Error(error?.message ?? 'No se pudo crear la ficha.');
  }

  return { id: creada.id as string, datos: creada.datos as Ficha };
}

/**
 * Guarda la ficha completa y sus campos denormalizados (docs/data-model.md
 * · "Campos denormalizados" — se escriben siempre juntos, nunca por
 * separado).
 */
export async function guardarFicha(
  admin: SupabaseClient,
  fichaId: string,
  ficha: Ficha,
): Promise<void> {
  await admin
    .from('fichas')
    .update({
      datos: ficha,
      objetivo_descripcion: ficha.objetivoDescripcion.valor,
      objetivo_cifra: ficha.objetivoCifra.valor,
      objetivo_plazo: ficha.objetivoPlazo.valor,
      perfil: ficha.riesgoPerfilDerivado.valor,
      pendientes: ficha.pendientes,
    })
    .eq('id', fichaId);
}

/** Resumen legible para el modelo: qué ya se sabe, y con qué etiqueta. */
export function resumenFicha(ficha: Ficha): string {
  const lineas = CLAVES_FICHA.map((clave) => {
    const dato = ficha[clave] as Dato<unknown>;
    if (dato.valor === null || dato.valor === undefined) return null;
    const valorTexto =
      typeof dato.valor === 'object'
        ? JSON.stringify(dato.valor)
        : String(dato.valor);
    return `- ${clave}: ${valorTexto} [${dato.etiqueta}]`;
  }).filter((l): l is string => l !== null);

  const pendientesTexto =
    ficha.pendientes.length > 0
      ? `\nPendientes ya anotados: ${ficha.pendientes.join('; ')}`
      : '';

  if (lineas.length === 0 && !pendientesTexto) {
    return 'Todavía no hay ningún dato capturado.';
  }
  return `${lineas.join('\n')}${pendientesTexto}`;
}

/** Los 8 bloques de la plantilla, para la barra de progreso. */
export const BLOQUES: { titulo: string; claves: ClaveFicha[] }[] = [
  { titulo: 'Objetivo', claves: ['objetivoDescripcion', 'objetivoCifra', 'objetivoPlazo'] },
  { titulo: 'Situación', claves: ['ingresosNetosMes', 'ingresosEstabilidad'] },
  { titulo: 'Gasto', claves: ['gastoTotalMes'] },
  { titulo: 'Ahorro actual', claves: ['aportacionMensualActual'] },
  { titulo: 'Patrimonio', claves: ['patrimonioTotal', 'patrimonioDistribucion'] },
  { titulo: 'Deudas', claves: ['deudas'] },
  { titulo: 'Colchón', claves: ['colchonMeses'] },
  {
    titulo: 'Riesgo',
    claves: ['riesgoExperiencia', 'riesgoEscenario', 'riesgoPerfilDerivado'],
  },
];

function campoTocado(ficha: Ficha, clave: ClaveFicha): boolean {
  const dato = ficha[clave] as Dato<unknown>;
  if (clave === 'deudas') {
    const valor = dato.valor as Deudas | null;
    if (!valor) return false;
    // "no_preguntado" es el estado inicial; "negativa_cliente" es una
    // respuesta real (el cliente se negó tras el aviso) y sí cuenta.
    if (valor.tipo === 'pendiente') return valor.motivo === 'negativa_cliente';
    return true;
  }
  return dato.valor !== null;
}

/** Un booleano por bloque: ¿tiene ya todos sus datos (o una negativa)? */
export function progresoBloques(ficha: Ficha): boolean[] {
  return BLOQUES.map((b) => b.claves.every((c) => campoTocado(ficha, c)));
}
