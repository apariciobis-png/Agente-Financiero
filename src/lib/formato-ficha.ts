import type { Dato, Deudas } from './motor/ficha';
import type { CampoFicha } from './campos-ficha';

/** Formateo en lenguaje llano de un valor de la ficha — compartido entre la
 * pantalla de confirmación (Fase 6) y la redacción del plan (Fase 8). */
export function formatearDeudas(valor: Deudas | null): string {
  if (!valor) return 'Pendiente';
  switch (valor.tipo) {
    case 'ninguna':
      return 'Sin deudas';
    case 'pendiente':
      return valor.motivo === 'negativa_cliente'
        ? 'Prefirió no hablar de sus deudas'
        : 'Pendiente';
    case 'solo_flag':
      return valor.hayInteresAlto
        ? 'Tiene alguna deuda con interés alto (sin más detalle)'
        : 'No tiene deudas con interés alto (sin más detalle)';
    case 'lista':
      if (valor.deudas.length === 0) return 'Sin deudas';
      return valor.deudas
        .map((d) => {
          const cuota = d.cuota != null ? `${d.cuota} €/mes` : 'cuota no indicada';
          const interes = d.interes != null ? ` al ${d.interes}%` : '';
          const saldo = d.saldo != null ? `, saldo ${d.saldo} €` : ' (saldo no indicado)';
          return `${d.tipo}: ${cuota}${interes}${saldo}`;
        })
        .join(' · ');
  }
}

export function formatearValor(campo: CampoFicha, dato: Dato<unknown>): string {
  if (campo.tipo === 'deudas') {
    return formatearDeudas(dato.valor as Deudas | null);
  }
  if (dato.valor === null || dato.valor === undefined) return 'Pendiente';
  if (campo.tipo === 'enum') {
    const opcion = campo.opciones?.find((o) => o.valor === dato.valor);
    return opcion?.etiqueta ?? String(dato.valor);
  }
  const sufijo = campo.sufijo ? ` ${campo.sufijo}` : '';
  return `${dato.valor}${sufijo}`;
}
