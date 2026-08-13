import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BandaProbabilidad } from './motor/supuestos';
import type { Ficha } from './motor/ficha';
import type { ResultadoAnalisis } from './diagnostico';
import type { SeccionesPlan } from './planes';

export interface FilaListadoCliente {
  clienteId: string;
  nombre: string;
  email: string;
  entrevistaId: string;
  estado: string;
  objetivoDescripcion: string | null;
  objetivoPlazo: number | null;
  modo: string | null;
  banda: BandaProbabilidad | null;
  probCumplimiento: number | null;
}

/** Orden de severidad: lo más urgente primero — es lo que Marta necesita ver. */
const ORDEN_BANDA: Record<string, number> = {
  Baja: 0,
  Frágil: 1,
  Razonable: 2,
  Alta: 3,
};

/**
 * Listado del panel (Fase 9): una fila por cliente, con la banda de su
 * análisis más reciente si lo tiene. Usa el cliente de servidor con la
 * sesión de Marta — las lecturas quedan sujetas a RLS
 * (docs/architecture.md · decisión #2).
 */
export async function listarClientes(
  supabase: SupabaseClient,
): Promise<FilaListadoCliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select(
      `id, nombre, email,
       entrevistas (
         id, estado, iniciada_en,
         fichas (
           id, version, objetivo_descripcion, objetivo_plazo,
           analisis ( modo, resultado, calculado_en )
         )
       )`,
    )
    .order('creado_en', { ascending: false });

  if (error || !data) return [];

  const filas: FilaListadoCliente[] = [];

  for (const cliente of data) {
    const entrevistas = (cliente.entrevistas ?? []) as Array<{
      id: string;
      estado: string;
      iniciada_en: string;
      fichas: Array<{
        version: number;
        objetivo_descripcion: string | null;
        objetivo_plazo: number | null;
        analisis: Array<{ modo: string; resultado: { montecarlo?: { banda?: string; probCumplimiento?: number } | null }; calculado_en: string }>;
      }>;
    }>;

    if (entrevistas.length === 0) continue;

    // La entrevista más reciente es la que interesa mostrar.
    const entrevista = [...entrevistas].sort(
      (a, b) => new Date(b.iniciada_en).getTime() - new Date(a.iniciada_en).getTime(),
    )[0];

    const ficha = entrevista.fichas?.find((f) => f.version === 1) ?? null;
    const analisisMasReciente = ficha?.analisis
      ? [...ficha.analisis].sort(
          (a, b) => new Date(b.calculado_en).getTime() - new Date(a.calculado_en).getTime(),
        )[0]
      : null;

    filas.push({
      clienteId: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email,
      entrevistaId: entrevista.id,
      estado: entrevista.estado,
      objetivoDescripcion: ficha?.objetivo_descripcion ?? null,
      objetivoPlazo: ficha?.objetivo_plazo ?? null,
      modo: analisisMasReciente?.modo ?? null,
      banda: (analisisMasReciente?.resultado?.montecarlo?.banda as BandaProbabilidad) ?? null,
      probCumplimiento: analisisMasReciente?.resultado?.montecarlo?.probCumplimiento ?? null,
    });
  }

  return filas.sort((a, b) => {
    const sa = a.banda ? ORDEN_BANDA[a.banda] : 99;
    const sb = b.banda ? ORDEN_BANDA[b.banda] : 99;
    return sa - sb;
  });
}

export interface DetalleCliente {
  cliente: { id: string; nombre: string; email: string };
  entrevista: { id: string; estado: string; consentimientoEn: string } | null;
  ficha: { datos: Ficha; pendientes: string[] } | null;
  analisis: { modo: string; resultado: ResultadoAnalisis; versionMotor: string; versionReglas: string; calculadoEn: string } | null;
  plan: { secciones: SeccionesPlan; markdown: string; descargo: string } | null;
}

/**
 * Todo lo que necesita la ficha de un cliente en el panel (Fase 9): las
 * tres vistas (diagnóstico, ficha cruda, plan) salen de aquí. Mismo cliente
 * de servidor con sesión — sujeto a RLS.
 */
export async function obtenerDetalleCliente(
  supabase: SupabaseClient,
  clienteId: string,
): Promise<DetalleCliente | null> {
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nombre, email')
    .eq('id', clienteId)
    .maybeSingle();

  if (!cliente) return null;

  const { data: entrevistas } = await supabase
    .from('entrevistas')
    .select('id, estado, consentimiento_en, iniciada_en')
    .eq('cliente_id', clienteId)
    .order('iniciada_en', { ascending: false })
    .limit(1);

  const entrevista = entrevistas?.[0] ?? null;
  if (!entrevista) {
    return { cliente, entrevista: null, ficha: null, analisis: null, plan: null };
  }

  const { data: fichaFila } = await supabase
    .from('fichas')
    .select('datos, pendientes')
    .eq('entrevista_id', entrevista.id)
    .eq('version', 1)
    .maybeSingle();

  const ficha = fichaFila
    ? { datos: fichaFila.datos as Ficha, pendientes: (fichaFila.pendientes ?? []) as string[] }
    : null;

  let analisis: DetalleCliente['analisis'] = null;
  let plan: DetalleCliente['plan'] = null;

  if (fichaFila) {
    const { data: fichaConId } = await supabase
      .from('fichas')
      .select('id')
      .eq('entrevista_id', entrevista.id)
      .eq('version', 1)
      .maybeSingle();

    if (fichaConId) {
      const { data: analisisFila } = await supabase
        .from('analisis')
        .select('id, modo, resultado, version_motor, version_reglas, calculado_en')
        .eq('ficha_id', fichaConId.id)
        .order('calculado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (analisisFila) {
        analisis = {
          modo: analisisFila.modo,
          resultado: analisisFila.resultado as ResultadoAnalisis,
          versionMotor: analisisFila.version_motor,
          versionReglas: analisisFila.version_reglas,
          calculadoEn: analisisFila.calculado_en,
        };

        const { data: planFila } = await supabase
          .from('planes')
          .select('secciones, markdown, descargo')
          .eq('analisis_id', analisisFila.id)
          .order('generado_en', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (planFila) {
          plan = {
            secciones: planFila.secciones as SeccionesPlan,
            markdown: planFila.markdown,
            descargo: planFila.descargo,
          };
        }
      }
    }
  }

  return {
    cliente,
    entrevista: {
      id: entrevista.id,
      estado: entrevista.estado,
      consentimientoEn: entrevista.consentimiento_en,
    },
    ficha,
    analisis,
    plan,
  };
}
