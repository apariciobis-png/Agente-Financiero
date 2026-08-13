import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

/**
 * IP del visitante a partir de las cabeceras de la petición. Vercel (y la
 * mayoría de proxys) la ponen en `x-forwarded-for`; si hay varias (cadena de
 * proxys) la primera es la del cliente original.
 */
export async function ipDelVisitante(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return h.get('x-real-ip') ?? '0.0.0.0';
}

/**
 * Protección del flujo público (docs/architecture.md · "Protección del
 * flujo público"): la entrevista es abierta y cada mensaje cuesta dinero en
 * la API del modelo. Se guarda un hash de la IP, nunca la IP en claro — deja
 * de ser un dato personal identificable y sirve igual para contar.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Umbral de entrevistas nuevas por IP y hora. No está fijado por ninguna
 * regla de docs/criterio/ (es un límite técnico, no financiero) — valor de
 * partida razonable, ajustable sin tocar el resto del código.
 */
export const MAX_ENTREVISTAS_POR_HORA = 5;

/** Umbral de mensajes por entrevista, ver plantilla-entrevista.md (~12 intercambios). */
export const MAX_MENSAJES_POR_ENTREVISTA = 30;

/**
 * Comprueba si una IP (ya hasheada) sigue dentro del límite para una acción
 * dada en la última hora. `admin` debe ser el cliente de servicio: esta
 * tabla no tiene políticas RLS, se lee y escribe siempre desde el servidor.
 */
export async function dentroDeLimite(
  admin: SupabaseClient,
  ipHash: string,
  accion: 'crear_entrevista' | 'enviar_mensaje',
  maxPorHora: number,
): Promise<boolean> {
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await admin
    .from('limites_uso')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('accion', accion)
    .gte('creado_en', haceUnaHora);

  if (error) {
    // Si no se puede comprobar el límite, se falla del lado prudente:
    // se trata como si el límite ya se hubiera alcanzado.
    return false;
  }

  return (count ?? 0) < maxPorHora;
}

/** Registra un uso para que cuente en el límite de la próxima comprobación. */
export async function registrarUso(
  admin: SupabaseClient,
  ipHash: string,
  accion: 'crear_entrevista' | 'enviar_mensaje',
): Promise<void> {
  await admin.from('limites_uso').insert({ ip_hash: ipHash, accion });
}
