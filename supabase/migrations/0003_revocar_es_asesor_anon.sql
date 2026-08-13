-- ============================================================================
-- 0003 · Revocar es_asesor() a anon explícitamente
--
-- 0002 revocó el EXECUTE de `public`, pero Supabase concede EXECUTE a cada
-- rol (anon, authenticated, service_role) de forma explícita al crear una
-- función, no solo vía `public`. Comprobado con:
--
--   select grantee, privilege_type from information_schema.routine_privileges
--   where routine_name = 'es_asesor';
--
-- `anon` seguía en la lista tras 0002. Se revoca directamente.
-- ============================================================================

revoke execute on function es_asesor() from anon;
