import type { ClaveFicha } from './fichas';

export type TipoCampo = 'texto' | 'numero' | 'enum' | 'deudas';

export interface OpcionEnum {
  valor: string;
  etiqueta: string;
}

export interface CampoFicha {
  clave: ClaveFicha;
  etiqueta: string;
  tipo: TipoCampo;
  sufijo?: string;
  opciones?: OpcionEnum[];
}

/**
 * Metadatos en lenguaje llano de cada clave de la ficha, para la pantalla de
 * confirmación (Fase 6) — docs/design-system.md · "Resumen editable": cada
 * dato en su fila, en frases, editable al clicar.
 */
export const CAMPOS_FICHA: CampoFicha[] = [
  { clave: 'objetivoDescripcion', etiqueta: 'Tu meta', tipo: 'texto' },
  { clave: 'objetivoCifra', etiqueta: 'Cifra objetivo', tipo: 'numero', sufijo: '€' },
  { clave: 'objetivoPlazo', etiqueta: 'Plazo', tipo: 'numero', sufijo: 'años' },
  { clave: 'ingresosNetosMes', etiqueta: 'Ingresos netos al mes', tipo: 'numero', sufijo: '€' },
  {
    clave: 'ingresosEstabilidad',
    etiqueta: 'Estabilidad de tus ingresos',
    tipo: 'enum',
    opciones: [
      { valor: 'fijos', etiqueta: 'Fijos' },
      { valor: 'variables', etiqueta: 'Variables' },
    ],
  },
  { clave: 'gastoTotalMes', etiqueta: 'Gasto total al mes', tipo: 'numero', sufijo: '€' },
  {
    clave: 'aportacionMensualActual',
    etiqueta: 'Lo que ya ahorras o inviertes al mes',
    tipo: 'numero',
    sufijo: '€',
  },
  { clave: 'patrimonioTotal', etiqueta: 'Patrimonio total', tipo: 'numero', sufijo: '€' },
  { clave: 'patrimonioDistribucion', etiqueta: 'Dónde está', tipo: 'texto' },
  { clave: 'deudas', etiqueta: 'Deudas', tipo: 'deudas' },
  { clave: 'colchonMeses', etiqueta: 'Colchón', tipo: 'numero', sufijo: 'meses' },
  {
    clave: 'riesgoExperiencia',
    etiqueta: 'Tu experiencia con caídas del mercado',
    tipo: 'texto',
  },
  {
    clave: 'riesgoEscenario',
    etiqueta: 'Si tu inversión cayera un 20%',
    tipo: 'enum',
    opciones: [
      { valor: 'vender', etiqueta: 'Vendería para no perder más' },
      { valor: 'aguantar', etiqueta: 'Aguantaría sin tocar nada' },
      { valor: 'comprar', etiqueta: 'Aprovecharía para comprar más' },
    ],
  },
  {
    clave: 'riesgoPerfilDerivado',
    etiqueta: 'Tu perfil de riesgo',
    tipo: 'enum',
    opciones: [
      { valor: 'conservador', etiqueta: 'Conservador' },
      { valor: 'moderado', etiqueta: 'Moderado' },
      { valor: 'dinamico', etiqueta: 'Dinámico' },
    ],
  },
];
