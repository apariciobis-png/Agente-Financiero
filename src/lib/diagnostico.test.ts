import { describe, expect, it } from 'vitest';
import { ejecutarDiagnostico } from './diagnostico';
import type { Dato, Ficha } from './motor/ficha';

function dato<T>(valor: T, etiqueta: Dato<T>['etiqueta'] = 'confirmado'): Dato<T> {
  return { valor, etiqueta };
}

/** Ficha base completa, calcada de la Laura del guion de prueba real. */
function fichaLaura(overrides: Partial<Ficha> = {}): Ficha {
  return {
    nombre: 'Laura',
    fechaEntrevista: '2026-08-13',
    objetivoDescripcion: dato('Llegar a los 60 con un colchón para bajar el ritmo'),
    objetivoCifra: dato(150000),
    objetivoPlazo: dato(20),
    ingresosNetosMes: dato(2800),
    ingresosEstabilidad: dato('fijos'),
    gastoTotalMes: dato(2000, 'estimado'),
    aportacionMensualActual: dato(150),
    patrimonioTotal: dato(22000),
    patrimonioDistribucion: dato('12.000 € en cuenta, 10.000 € en fondo indexado'),
    deudas: dato({
      tipo: 'lista',
      deudas: [{ tipo: 'hipoteca', saldo: null, cuota: 620, interes: 1.9 }],
    }),
    colchonMeses: dato(5),
    riesgoExperiencia: dato('Invirtió en 2020, no vendió durante la caída del covid'),
    riesgoEscenario: dato('aguantar'),
    riesgoPerfilDerivado: dato('moderado'),
    pendientes: ['No se conoce el saldo pendiente de la hipoteca.'],
    ...overrides,
  };
}

describe('ejecutarDiagnostico', () => {
  it('R9 · deudas pendiente por negativa del cliente → modo suspendido, sin propuesta', () => {
    const ficha = fichaLaura({
      deudas: { valor: { tipo: 'pendiente', motivo: 'negativa_cliente' }, etiqueta: 'pendiente' },
    });

    const resultado = ejecutarDiagnostico(ficha);

    expect(resultado.modo).toBe('suspendido');
    expect(resultado.recomendacionSuspendida).toBe(true);
    expect(resultado.motivoSuspension).toBeTruthy();
    expect(resultado.aportacion).toBeNull();
    expect(resultado.montecarlo).toBeNull();
    expect(resultado.cartera).toBeNull();
  });

  it('ficha completa de patrimonio produce probabilidad y banda', () => {
    const resultado = ejecutarDiagnostico(fichaLaura());

    expect(resultado.modo).toBe('completo');
    expect(resultado.tipoMeta).toBe('patrimonio');
    expect(resultado.recomendacionSuspendida).toBe(false);
    expect(resultado.proyeccion?.gap).toBeGreaterThan(0);
    expect(resultado.montecarlo?.probCumplimiento).toBeGreaterThanOrEqual(0);
    expect(resultado.montecarlo?.probCumplimiento).toBeLessThanOrEqual(1);
    expect(['Alta', 'Razonable', 'Frágil', 'Baja']).toContain(resultado.montecarlo?.banda);

    // Fase 9 — panel de Marta: serie temporal y checklist R1.
    expect(resultado.serieTemporal).toHaveLength(5);
    expect(resultado.serieTemporal?.[0].anios).toBe(0);
    expect(resultado.serieTemporal?.at(-1)?.anios).toBe(20);
    expect(resultado.prioridadesR1).toHaveLength(5);
    // Laura tiene 5 meses de colchón con ingresos fijos (umbral 3) → cubierto.
    const pasoColchon = resultado.prioridadesR1?.find((p) => p.paso.startsWith('Fondo'));
    expect(pasoColchon?.cumplido).toBe(true);
    // La hipoteca de Laura está al 1,9%, muy por debajo del umbral de deuda cara.
    const pasoDeudaCara = resultado.prioridadesR1?.find((p) => p.paso.startsWith('Cancelar'));
    expect(pasoDeudaCara?.cumplido).toBe(true);
  });

  it('meta ya alcanzada (C13): no pide aportación adicional', () => {
    const resultado = ejecutarDiagnostico(fichaLaura({ patrimonioTotal: dato(200000) }));

    expect(resultado.proyeccion?.metaYaAlcanzada).toBe(true);
    expect(resultado.proyeccion?.gap).toBeLessThanOrEqual(0);
    expect(resultado.aportacion?.propuesta).toBe(0);
  });

  it('perfil de riesgo pendiente (R5) → se trata como conservador y se declara', () => {
    const resultado = ejecutarDiagnostico(
      fichaLaura({ riesgoPerfilDerivado: { valor: null, etiqueta: 'pendiente' } }),
    );

    expect(resultado.cartera?.pesos.renta_variable).toBeLessThanOrEqual(0.2);
    expect(resultado.supuestos.some((s) => s.includes('conservador'))).toBe(true);
  });

  it('meta de negocio propio (§3/R6): no se convierte a patrimonio', () => {
    const resultado = ejecutarDiagnostico(
      fichaLaura({
        objetivoDescripcion: dato('Vivir de los ingresos de mi negocio, una tienda online'),
      }),
    );

    expect(resultado.tipoMeta).toBe('renta_negocio');
    expect(resultado.proyeccion).toBeNull();
    expect(resultado.montecarlo).toBeNull();
  });
});
