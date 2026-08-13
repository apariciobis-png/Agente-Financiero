-- ============================================================================
-- 0002 · Endurecer es_asesor()
--
-- El linter de seguridad de Supabase detectó que la función SECURITY DEFINER
-- es_asesor() era ejecutable directamente vía RPC (/rest/v1/rpc/es_asesor)
-- por los roles `anon` y `authenticated`. La función en sí no filtra datos
-- sensibles (solo devuelve true/false), pero no hay motivo para que un
-- visitante anónimo pueda invocarla desde fuera: solo la usan las políticas
-- RLS de 0001, que se evalúan como `authenticated`.
--
-- Se revoca de `public` (que incluye a `anon`) y se concede explícitamente
-- solo a `authenticated`, que es quien la necesita para que sus políticas
-- sigan funcionando.
-- ============================================================================

revoke execute on function es_asesor() from public;
grant execute on function es_asesor() to authenticated;
