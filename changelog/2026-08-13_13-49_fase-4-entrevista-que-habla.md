# Fase 4 · La entrevista que habla (implementada, verificación en vivo pendiente)

**Fecha:** 2026-08-13 13:49
**Tipo:** Feature

## Qué se hizo

Construida la ruta de servidor contra la API de Anthropic y el chat de la
entrevista, siguiendo `docs/roadmap.md` (Fase 4) y el prompt de
`docs/criterio/plantilla-entrevista.md` + las excepciones de
`docs/criterio/instrucciones-agente-v2.md`:

- **`src/lib/claude/`**: `prompt-entrevista.ts` (prompt de sistema con la
  apertura literal, los 8 bloques, reglas transversales y cierre — sin
  captura estructurada todavía, eso es la Fase 5), `herramientas.ts` (solo
  `crear_cliente`, JSON Schema con nombre + email), `anthropic.ts` (cliente
  del SDK, `server-only`, modelo `claude-sonnet-5` fijado en
  `docs/architecture.md`).
- **`src/lib/clientes.ts`**: `vincularCliente()` — crea el cliente o lo
  enlaza si el correo ya existe (email normalizado a minúsculas), y engancha
  `entrevistas.cliente_id`.
- **`src/lib/mensajes.ts`**: tipo `Mensaje` y `asegurarMensajeApertura()` —
  inserta la apertura literal como primer turno si la entrevista no tiene
  mensajes todavía.
- **`POST /api/entrevistas/[token]/mensajes`**: valida token/caducidad/estado,
  aplica el tope de mensajes (`MAX_MENSAJES_POR_ENTREVISTA`, Fase 3), guarda
  el turno del cliente, llama al modelo con el historial (excluyendo la
  apertura literal del array que ve el modelo — la API exige que el primer
  mensaje sea de rol `user`, y la apertura es texto fijo, no generado),
  resuelve el bucle de `tool_use`/`tool_result` si llama a `crear_cliente`, y
  guarda la respuesta. Los errores de la API de Anthropic (créditos, red...)
  se capturan y devuelven un mensaje claro en vez de un 500 opaco.
- **`/entrevista/[token]`**: ya no es un placeholder — renderiza el chat real
  (`chat.tsx`, Client Component: burbujas diferenciadas, indicador
  "Pensando…", envío optimista, manejo de error).

## Verificado

- `pnpm run build` compila sin errores de TypeScript (coge lo que `pnpm run
  lint` en modo dev no bloquea).
- `pnpm test` sigue en 95 verdes.
- **Flujo probado en el navegador de principio a fin, salvo la respuesta del
  modelo**: landing → consentimiento → entrevista → apertura literal
  correcta → mensaje del cliente guardado en `mensajes`. La llamada a
  Anthropic falló con `Your credit balance is too low` (cuenta del usuario,
  no un bug) — se ve el mensaje de error correcto en la UI en vez de un
  fallo silencioso o un 500 sin explicar.

**Pendiente antes de dar la Fase 4 por cerrada**: repetir la prueba con
saldo en la cuenta de Anthropic para confirmar que el modelo responde en
orden, respeta el rebote único, y que `crear_cliente` deja una fila en
`clientes` con el nombre y el correo reales — el criterio de "hecho cuando"
de `docs/roadmap.md`. No se ha marcado la fase como completada en el
roadmap todavía.

## Qué se modificó

- Nuevo: `src/lib/claude/prompt-entrevista.ts`, `herramientas.ts`,
  `anthropic.ts`; `src/lib/clientes.ts`, `src/lib/mensajes.ts`;
  `src/app/api/entrevistas/[token]/mensajes/route.ts`;
  `src/app/entrevista/[token]/chat.tsx`.
- Reescrito: `src/app/entrevista/[token]/page.tsx` (ya no es un placeholder).
- Dependencia nueva: `@anthropic-ai/sdk`.

## Por qué

Es el corazón conversacional del producto — sin esto no hay entrevista que
capturar en la Fase 5. Se separó deliberadamente de la captura estructurada
(`guardar_dato`) para verificar primero que la mecánica del chat (orden,
persistencia, tope de mensajes, alta de cliente) funciona antes de añadir la
complejidad de las etiquetas `confirmado/estimado/pendiente`.
