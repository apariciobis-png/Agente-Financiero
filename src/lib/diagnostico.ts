/**
 * diagnostico.ts — Orquesta el motor de src/lib/motor/ (intocable) sobre una
 * ficha real. Sigue el pipeline de docs/criterio/instrucciones-motor.md:
 * clasificar la meta (§3) → calcular con las funciones puras del motor (§5).
 *
 * Nada aquí calcula "de cabeza": cada cifra sale de una función de
 * src/lib/motor/calculos.ts. Lo único que añade este archivo es la
 * orquestación (qué llamar, en qué orden, con qué datos de la ficha) y un
 * solver numérico (búsqueda binaria) para la aportación requerida — el motor
 * original tampoco lo trae; es lógica de ensamblado, no de cálculo financiero.
 */

import {
  aEurosActuales,
  ajustarCarteraPorPlazo,
  aniosHastaMeta,
  aportacionPropuesta,
  convertirMetaRenta,
  flujoLibre,
  monteCarlo,
  rentabilidadCartera,
  vfDeterminista,
  type AportacionPropuesta,
  type ResultadoMonteCarlo,
} from './motor/calculos';
import { redondear } from './motor/numerico';
import { determinarModo, type Ficha, type ModoInforme, type TipoMeta } from './motor/ficha';
import type { BandaProbabilidad, Cartera, HorizonteRetirada, PerfilRiesgo } from './motor/supuestos';

/** Versión del port (src/lib/motor/, 95 tests) y de las reglas vigentes. */
export const VERSION_MOTOR = 'ts-port-1.0 (95 tests)';
export const VERSION_REGLAS = 'reglas-recomendacion.md · 2026-08-06';

/** R1 · un paso del orden de prioridades del ahorro, con lo cumplido marcado. */
export interface PasoR1 {
  paso: string;
  cumplido: boolean;
  detalle: string;
}

/** Un punto de la proyección en el tiempo — para la banda p10/p90 del panel (Fase 9). */
export interface PuntoProyeccion {
  anios: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface ResultadoAnalisis {
  tipoMeta: TipoMeta;
  modo: ModoInforme;
  variablesFaltantes: string[];
  supuestos: string[];
  recomendacionSuspendida: boolean;
  motivoSuspension?: string;

  flujoLibre: { valor: number } | null;
  prioridadesR1: PasoR1[] | null;
  cartera: { pesos: Cartera; rentabilidadAnualNeta: number } | null;
  proyeccion: {
    patrimonioActual: number;
    objetivoReal: number;
    gap: number;
    metaYaAlcanzada: boolean;
    aniosHastaMetaRitmoActual: number | null;
    aniosHastaMetaRitmoPropuesto: number | null;
  } | null;
  aportacion: AportacionPropuesta | null;
  montecarlo: Pick<
    ResultadoMonteCarlo,
    'p10' | 'p50' | 'p90' | 'probCumplimiento' | 'banda'
  > | null;
  /** Serie de percentiles en varios puntos del plazo — Recharts la pinta como banda. */
  serieTemporal: PuntoProyeccion[] | null;
}

/**
 * §3 · Clasificación de la meta. La entrevista (Fase 5) todavía no le pide
 * al cliente que distinga explícitamente el tipo — se infiere por palabras
 * clave de `objetivoDescripcion`. Es una simplificación deliberada, anotada
 * como pendiente de mejora (ver mejoras/backlog.md): lo correcto a medio
 * plazo es que la plantilla lo pregunte directamente.
 */
function clasificarMeta(ficha: Ficha): TipoMeta {
  const texto = (ficha.objetivoDescripcion.valor ?? '').toLowerCase();
  const esNegocio = /negocio|empresa|factura|autónom/.test(texto);
  const esRenta = /\bal mes\b|mensual|renta de|vivir de las rentas|ingreso pasivo/.test(texto);

  if (esNegocio && esRenta) return 'mixta';
  if (esNegocio) return 'renta_negocio';
  if (esRenta) return 'renta_cartera';
  return 'patrimonio';
}

/** R1 · umbral de colchón según estabilidad de ingresos (extremo prudente del rango). */
function colchonObjetivoMeses(ficha: Ficha): number {
  return ficha.ingresosEstabilidad.valor === 'variables' ? 6 : 3;
}

/**
 * C1 · ¿El gasto ya incluye las cuotas de deuda? Si no puede determinarse,
 * se asume que NO (flujo libre menor = prudente, R9) y se declara.
 */
function cuotasIncluidasEnGasto(ficha: Ficha, cuotasTotales: number): { valor: boolean; nota: string } {
  if (cuotasTotales <= 0) {
    return { valor: true, nota: 'Sin cuotas de deuda que considerar.' };
  }
  const ingresos = ficha.ingresosNetosMes.valor ?? 0;
  const gasto = ficha.gastoTotalMes.valor ?? 0;
  const aportacion = ficha.aportacionMensualActual.valor ?? 0;
  const remanenteAparente = ingresos - gasto;
  const tolerancia = Math.max(50, aportacion * 0.15);

  if (Math.abs(remanenteAparente - aportacion) <= tolerancia) {
    return {
      valor: true,
      nota: 'C1: el remanente (ingresos − gasto) coincide con lo que aporta de verdad, así que el gasto ya incluye las cuotas de deuda.',
    };
  }
  return {
    valor: false,
    nota: 'C1: no se puede determinar con certeza si el gasto incluye las cuotas de deuda; se asume que NO (flujo libre menor, prudente).',
  };
}

/** Cuotas mensuales totales de deuda, cuando la ficha las trae en formato lista. */
function cuotasTotalesDeuda(ficha: Ficha): number {
  const deudas = ficha.deudas.valor;
  if (!deudas || deudas.tipo !== 'lista') return 0;
  return deudas.deudas.reduce((acc, d) => acc + (d.cuota ?? 0), 0);
}

/**
 * R1 · Orden de prioridades del ahorro, con lo ya cumplido marcado. Los
 * pasos 1 (cuotas al día) no tienen dato en la ficha — no se pregunta si hay
 * impagos — así que se dan por cumplidos salvo indicio de lo contrario.
 */
function calcularPrioridadesR1(
  ficha: Ficha,
  colchonCompleto: boolean,
  colchonObjetivo: number,
): PasoR1[] {
  const deudas = ficha.deudas.valor;
  const deudaCara =
    deudas?.tipo === 'lista' ? deudas.deudas.some((d) => (d.interes ?? 0) > 7) : false;
  const deudasConocidas = deudas?.tipo === 'lista' || deudas?.tipo === 'ninguna';

  return [
    {
      paso: 'Cuotas mínimas de todas las deudas al día',
      cumplido: true,
      detalle: 'Sin indicios de impago en lo que ha contado.',
    },
    {
      paso: 'Colchón inicial de 1 mes de gastos',
      cumplido: (ficha.colchonMeses.valor ?? 0) >= 1,
      detalle: `Colchón actual: ${ficha.colchonMeses.valor ?? 'sin dato'} meses.`,
    },
    {
      paso: 'Cancelar deudas caras (más del 7-8% de interés)',
      cumplido: deudasConocidas ? !deudaCara : false,
      detalle: deudasConocidas
        ? deudaCara
          ? 'Tiene alguna deuda por encima del umbral — prioridad antes de invertir.'
          : 'Ninguna deuda por encima del umbral.'
        : 'No se sabe todavía si hay alguna deuda cara.',
    },
    {
      paso: `Fondo de emergencia completo (${colchonObjetivo} meses o más)`,
      cumplido: colchonCompleto,
      detalle: colchonCompleto
        ? 'Cubierto.'
        : `Le faltan ${redondear(colchonObjetivo - (ficha.colchonMeses.valor ?? 0), 1)} meses para el objetivo.`,
    },
    {
      paso: 'Aumentar la inversión',
      cumplido: (ficha.aportacionMensualActual.valor ?? 0) > 0,
      detalle:
        (ficha.aportacionMensualActual.valor ?? 0) > 0
          ? `Ya aporta ${ficha.aportacionMensualActual.valor} €/mes.`
          : 'Todavía no aporta nada de forma regular.',
    },
  ];
}

/** R6 · Horizonte de retirada aproximado a partir del plazo hasta la meta. [estimado] */
function horizonteRetirada(plazoAnios: number): HorizonteRetirada {
  if (plazoAnios >= 35) return '>=40';
  if (plazoAnios >= 15) return '~30';
  return '~20';
}

/**
 * Aportación mensual necesaria para llegar a `objetivoReal` (euros de hoy)
 * en `anios`, partiendo de `patrimonio` con rentabilidad `rAnual`. Búsqueda
 * binaria sobre `vfDeterminista` + `aEurosActuales` — ambas del motor.
 */
function aportacionRequerida(
  patrimonio: number,
  rAnual: number,
  anios: number,
  objetivoReal: number,
): number {
  const alcanzaCon = (aportacionMes: number) =>
    aEurosActuales(vfDeterminista(patrimonio, aportacionMes, rAnual, anios), anios) >= objetivoReal;

  if (alcanzaCon(0)) return 0;

  let alto = Math.max(1000, objetivoReal / Math.max(anios * 12, 1));
  while (!alcanzaCon(alto) && alto < 1e8) alto *= 2;

  let bajo = 0;
  for (let i = 0; i < 60; i++) {
    const medio = (bajo + alto) / 2;
    if (alcanzaCon(medio)) alto = medio;
    else bajo = medio;
  }
  return redondear(alto);
}

/**
 * Ejecuta el diagnóstico completo de una ficha. Función pura: no toca base
 * de datos. R9 decide cuánto se calcula — en modo `suspendido` no hay
 * ninguna cifra de propuesta, solo lo descriptivo que ya es seguro mostrar.
 */
export function ejecutarDiagnostico(ficha: Ficha): ResultadoAnalisis {
  const { modo, faltantes } = determinarModo(ficha);
  const tipoMeta = clasificarMeta(ficha);
  const supuestos: string[] = [];

  if (ficha.riesgoPerfilDerivado.etiqueta === 'pendiente') {
    supuestos.push('R5: perfil de riesgo pendiente → tratado como conservador.');
  }
  const perfil: PerfilRiesgo = ficha.riesgoPerfilDerivado.valor ?? 'conservador';

  if (modo === 'suspendido') {
    return {
      tipoMeta,
      modo,
      variablesFaltantes: faltantes,
      supuestos,
      recomendacionSuspendida: true,
      motivoSuspension:
        'El cliente prefirió no hablar de sus deudas. Sin saber si hay alguna con interés alto, el sistema no puede recomendar invertir sin arriesgarse a aconsejar lo contrario de lo que le conviene (R9).',
      flujoLibre: null,
      prioridadesR1: null,
      cartera: null,
      proyeccion: null,
      aportacion: null,
      montecarlo: null,
      serieTemporal: null,
    };
  }

  const cuotas = cuotasTotalesDeuda(ficha);
  const { valor: cuotasIncluidas, nota: notaCuotas } = cuotasIncluidasEnGasto(ficha, cuotas);
  supuestos.push(notaCuotas);

  const flujo = flujoLibre(
    ficha.ingresosNetosMes.valor ?? 0,
    ficha.gastoTotalMes.valor ?? 0,
    cuotasIncluidas,
    cuotas,
  );

  const flujoLibreResultado = { valor: redondear(flujo) };

  const colchonObjetivo = colchonObjetivoMeses(ficha);
  const colchonCompleto = (ficha.colchonMeses.valor ?? 0) >= colchonObjetivo;
  const prioridadesR1 = calcularPrioridadesR1(ficha, colchonCompleto, colchonObjetivo);

  // Sin objetivo (cifra o plazo pendientes) no hay proyección posible — el
  // resto del diagnóstico se queda descriptivo, tal como pide §3 para el
  // caso "sin cifra o sin plazo".
  const tieneObjetivo =
    ficha.objetivoCifra.valor !== null &&
    ficha.objetivoPlazo.valor !== null &&
    (tipoMeta === 'patrimonio' || tipoMeta === 'renta_cartera');

  if (!tieneObjetivo) {
    if (tipoMeta === 'renta_negocio') {
      supuestos.push(
        'R6/§3: la meta procede de un negocio propio y no se convierte a patrimonio — la cartera no es el vehículo para alcanzarla.',
      );
    }
    return {
      tipoMeta,
      modo,
      variablesFaltantes: faltantes,
      supuestos,
      recomendacionSuspendida: false,
      flujoLibre: flujoLibreResultado,
      prioridadesR1,
      cartera: null,
      proyeccion: null,
      aportacion: null,
      montecarlo: null,
      serieTemporal: null,
    };
  }

  const plazoAnios = ficha.objetivoPlazo.valor!;
  const pesos = ajustarCarteraPorPlazo(perfil, plazoAnios);
  const rentabilidad = rentabilidadCartera(pesos);

  let objetivoReal = ficha.objetivoCifra.valor!;
  if (tipoMeta === 'renta_cartera') {
    const horizonte = horizonteRetirada(plazoAnios);
    objetivoReal = convertirMetaRenta(objetivoReal, horizonte);
    supuestos.push(
      `R6: meta de renta mensual convertida a patrimonio objetivo (horizonte de retirada ${horizonte}, [estimado] a partir del plazo — la ficha no distingue plazo hasta la meta de duración de la retirada).`,
    );
  }

  const patrimonio = ficha.patrimonioTotal.valor ?? 0;
  const gap = redondear(objetivoReal - patrimonio);
  const metaYaAlcanzada = gap <= 0;

  const requerida = metaYaAlcanzada
    ? 0
    : aportacionRequerida(patrimonio, rentabilidad, plazoAnios, objetivoReal);

  // No se recoge todavía si hay provisiones para gastos irregulares — se
  // asume que no (extremo prudente) hasta que la ficha capture ese dato.
  const provisionesOk = false;
  supuestos.push(
    'R2: sin dato sobre provisiones para gastos irregulares — se asume que no están cubiertas (extremo prudente del tope de aportación).',
  );

  const aportacion = aportacionPropuesta(requerida, flujo, colchonCompleto, provisionesOk);
  const aportacionParaProyeccion =
    typeof aportacion.propuesta === 'number' ? aportacion.propuesta : aportacion.propuesta[0];

  const aniosRitmoActual = aniosHastaMeta(
    patrimonio,
    ficha.aportacionMensualActual.valor ?? 0,
    rentabilidad,
    objetivoReal,
  );
  const aniosRitmoPropuesto = metaYaAlcanzada
    ? 0
    : aniosHastaMeta(patrimonio, aportacionParaProyeccion, rentabilidad, objetivoReal);

  const mc = monteCarlo(patrimonio, aportacionParaProyeccion, pesos, plazoAnios, objetivoReal);

  // Serie en el tiempo para la banda del panel (Fase 9): mismos supuestos que
  // el Monte Carlo final, en varios puntos del plazo. La anchura de la banda
  // creciendo es el mensaje — ver docs/design-system.md.
  const FRACCIONES_SERIE = [0, 0.25, 0.5, 0.75, 1];
  const serieTemporal: PuntoProyeccion[] = FRACCIONES_SERIE.map((fraccion) => {
    const anios = redondear(plazoAnios * fraccion, 1);
    const punto = monteCarlo(patrimonio, aportacionParaProyeccion, pesos, anios);
    return {
      anios,
      p10: redondear(punto.p10),
      p50: redondear(punto.p50),
      p90: redondear(punto.p90),
    };
  });

  return {
    tipoMeta,
    modo,
    variablesFaltantes: faltantes,
    supuestos,
    recomendacionSuspendida: false,
    flujoLibre: flujoLibreResultado,
    prioridadesR1,
    cartera: { pesos, rentabilidadAnualNeta: rentabilidad },
    proyeccion: {
      patrimonioActual: patrimonio,
      objetivoReal: redondear(objetivoReal),
      gap,
      metaYaAlcanzada,
      aniosHastaMetaRitmoActual: aniosRitmoActual,
      aniosHastaMetaRitmoPropuesto: aniosRitmoPropuesto,
    },
    aportacion,
    montecarlo: {
      p10: redondear(mc.p10),
      p50: redondear(mc.p50),
      p90: redondear(mc.p90),
      probCumplimiento: mc.probCumplimiento,
      banda: mc.banda as BandaProbabilidad,
    },
    serieTemporal,
  };
}
