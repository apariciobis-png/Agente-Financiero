# Fase 2 · Base de datos completada

**Fecha:** 2026-08-13 13:15
**Tipo:** Feature

## Qué se hizo

Se aplicó el esquema inicial al proyecto de Supabase del usuario ("Asesor
Financiero", región `eu-west-3`) y se conectó la aplicación:

- El usuario pegó a mano `0001_esquema_inicial.sql` en el SQL Editor de
  supabase.com (no por MCP, según protocolo). Verificado por MCP en modo
  solo lectura (`list_tables`, `get_advisors`): las 8 tablas
  (`asesores`, `clientes`, `entrevistas`, `mensajes`, `fichas`, `analisis`,
  `planes`, `limites_uso`) existen con RLS activado.
- Los advisors de seguridad de Supabase señalaron que `es_asesor()`
  (`SECURITY DEFINER`) era invocable directamente por RPC sin sesión, por
  `anon` y `authenticated`. Se escribieron y aplicaron (también a mano) dos
  migraciones de endurecimiento:
  - `0002_endurecer_es_asesor.sql` — revoca `EXECUTE` de `public`, lo concede
    a `authenticated`.
  - `0003_revocar_es_asesor_anon.sql` — `0002` no bastó: Supabase concede
    `EXECUTE` a cada rol de forma explícita al crear la función, no solo vía
    `public`. Se revocó a `anon` directamente. Verificado con
    `information_schema.routine_privileges` que solo quedan
    `authenticated` y `service_role`.
- `.env.local` relleno con la URL del proyecto y la clave anónima (obtenidas
  por MCP, de solo lectura) y la clave de servicio (pegada por el usuario en
  el chat, nunca vista por el MCP).
- Instalados `@supabase/supabase-js`, `@supabase/ssr` y `server-only`.
- Creados los dos clientes que pedía la fase, más uno adicional necesario
  para el patrón de Auth de Next.js App Router:
  - `src/lib/supabase/client.ts` — cliente público (browser), clave anónima.
  - `src/lib/supabase/server.ts` — cliente de servidor con la sesión de
    Marta (clave anónima + cookies), para Server Components/Route Handlers
    sujetos a RLS.
  - `src/lib/supabase/admin.ts` — cliente de servicio (`service_role`),
    protegido con `import 'server-only'` para que el build falle si algo
    intenta meterlo en un bundle de cliente.
- Verificada la conexión real con un script desechable
  (`verificar-conexion.mjs`, creado, ejecutado y borrado en la misma
  sesión): consulta a `asesores` con la clave de servicio, sin errores.

## Qué se modificó

- Nuevo: `src/lib/supabase/client.ts`, `server.ts`, `admin.ts`,
  `supabase/migrations/0002_endurecer_es_asesor.sql`,
  `0003_revocar_es_asesor_anon.sql`.
- `.env.local` (no versionado): URL, clave anónima y clave de servicio.
- `package.json`: nuevas dependencias.
- Documentación: `docs/roadmap.md` (Fase 2 marcada como completada),
  `docs/data-model.md` (nota sobre el endurecimiento de `es_asesor()`),
  `docs/architecture.md` (sección "MCPs del proyecto": el MCP de Supabase
  está conectado a nivel de cuenta del usuario, usado solo para inspección).

## Por qué

El esquema es el contrato entre la entrevista, el motor y el panel — sin él
no hay dónde escribir nada de las fases siguientes. Se revisaron los
advisors de seguridad porque el dominio maneja datos financieros personales
y `business.md` no deja margen: una función invocable de más, aunque no
filtre datos sensibles, es una superficie de ataque que no hacía falta
dejar abierta.
