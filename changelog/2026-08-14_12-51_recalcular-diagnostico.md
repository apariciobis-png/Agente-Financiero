# Recalcular diagnóstico desde el panel

**Fecha:** 2026-08-14 12:51
**Tipo:** Feature

## Qué se hizo

Añadido un botón "Recalcular diagnóstico" en la ficha de cliente del panel
(`/panel/clientes/[clienteId]`). Vuelve a ejecutar `ejecutarDiagnostico()`
sobre la ficha ya cerrada del cliente y guarda una fila nueva en `analisis`,
sin tocar la ficha ni pedir de nuevo la entrevista.

- **`POST /api/panel/clientes/[clienteId]/recalcular`**: comprueba primero,
  con el cliente de sesión, que quien llama está de verdad en `asesores` —
  la tabla `analisis` no tiene política de escritura para `authenticated`
  (docs/data-model.md), así que solo después de esa comprobación se usa el
  cliente de servicio para insertar el nuevo análisis.
- Botón en la página de cliente, con la fecha del último cálculo visible al
  lado, para que quede claro que no es automático.

## Por qué

Surgió al verificar en vivo: los dos clientes de prueba tenían su análisis
calculado con una versión de `diagnostico.ts` anterior a las dos tarjetas
que se añadieron en la Fase 9 (`serieTemporal`, `prioridadesR1`), así que su
panel mostraba solo 2 de las 4 visualizaciones — no un fallo, sino datos
anteriores al cambio. En vez de forzar una entrevista nueva (coste de API,
varios minutos) para comprobar visualmente las 4 tarjetas, se construyó esta
vía barata: `ejecutarDiagnostico` es código puro, sin llamada al modelo, así
que recalcular es instantáneo y gratis. De paso, es una funcionalidad que ya
contemplaba `docs/data-model.md`: el recálculo existe, pero nunca es
automático — siempre una acción deliberada de la asesora.

## Qué se modificó

- Nuevo: `src/app/api/panel/clientes/[clienteId]/recalcular/route.ts`,
  `src/app/panel/(protegido)/clientes/[clienteId]/recalcular-diagnostico.tsx`.
- Modificado: `src/app/panel/(protegido)/clientes/[clienteId]/page.tsx`.

## Verificado

`pnpm test` (100 tests), `pnpm run lint` y `pnpm run build` limpios; el
build registra la nueva ruta.
