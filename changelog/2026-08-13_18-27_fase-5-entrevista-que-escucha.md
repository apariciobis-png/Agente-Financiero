# Fase 5 · La entrevista que escucha completada

**Fecha:** 2026-08-13 18:27
**Tipo:** Feature

## Qué se hizo

Añadida la captura estructurada de la entrevista, siguiendo
`docs/roadmap.md` (Fase 5) y el contrato de `src/lib/motor/ficha.ts`:

- **`src/lib/fichas.ts`** (nuevo): todo el ciclo de vida de la ficha "en
  curso" (versión 1, se actualiza turno a turno hasta que se cierre en la
  Fase 6 — no se versiona antes de eso). `fichaVacia()`, `aplicarDato()`,
  `agregarPendiente()`, `obtenerOCrearFicha()`, `guardarFicha()` (incluye los
  campos denormalizados), `resumenFicha()` (para el contexto del modelo) y
  `progresoBloques()` (para la barra de progreso).
- **Dos herramientas nuevas** en `src/lib/claude/herramientas.ts`:
  `guardar_dato` (las 14 claves de la ficha como enum, con la forma exacta
  del `valor` para cada una descrita en el propio esquema) y
  `agregar_pendiente` (notas sueltas, como "no se conoce el saldo pendiente
  de la hipoteca" — caso C8 de `instrucciones-motor.md`).
- **Prompt de sistema ampliado**: cada bloque de la plantilla lleva ahora sus
  claves de `guardar_dato` explícitas, reglas de etiquetado (R9) y un repaso
  obligatorio antes del cierre para no dejar datos sin guardar.
- **La ruta del chat** reconstruye el `system` en cada turno con el estado
  actual de la ficha (`resumenFicha`), porque `claude-sonnet-5` no admite
  mensajes de sistema a mitad de conversación — ver la nueva sección en
  `docs/architecture.md`. Así el modelo no vuelve a preguntar lo que ya sabe.
- **Barra de progreso** de los 8 bloques en el chat (superior en móvil,
  lateral en escritorio — `docs/design-system.md`), calculada a partir de la
  ficha real, no de una cuenta de mensajes.

## Verificado (con el guion de prueba real, dos entrevistas completas)

- **Guion A completo**: los 14 datos de Laura quedaron en `fichas` con la
  cita literal y la etiqueta correcta, y el pendiente exacto que marca el
  guion: *"No se conoce el saldo pendiente de la hipoteca"*.
- **Captura al vuelo**: al mencionar la hipoteca en el bloque 3 (fuera de su
  turno), el agente lo reconoció ("luego te pregunto por ella en el bloque
  de deudas") y no la volvió a preguntar desde cero en el bloque 6.
- **Variante 1 (el criterio real de esta fase)**: respuesta ambigua al gasto
  → el agente ofreció rangos → el cliente eligió uno → `gastoTotalMes`
  quedó como **`estimado`**, no `confirmado`. Confirmado con consulta
  directa a la base de datos.
- **Un fallo real encontrado y corregido en el camino**: en la primera
  pasada, `colchonMeses` y `riesgoExperiencia` se quedaron sin guardar pese
  a que el cliente los dio con claridad — el modelo los mencionaba en su
  respuesta pero no llamaba a `guardar_dato`. Se reforzó el prompt (claves
  explícitas por bloque + repaso obligatorio antes del cierre) y se repitió
  la prueba completa: los 14 campos quedaron guardados.
- `pnpm test` sigue en 95 verdes, `pnpm run lint` limpio, sin errores de
  servidor.

## Qué se modificó

- Nuevo: `src/lib/fichas.ts`.
- Modificado: `src/lib/claude/herramientas.ts` (dos herramientas nuevas),
  `src/lib/claude/prompt-entrevista.ts` (claves por bloque + repaso
  pre-cierre), `src/app/api/entrevistas/[token]/mensajes/route.ts`
  (integración de la ficha en el bucle de herramientas), `chat.tsx` y
  `page.tsx` (barra de progreso).
- Documentación: `docs/roadmap.md` (Fase 5 completada), `docs/architecture.md`
  (nueva sección sobre cómo se le pasa el estado de la ficha al modelo).

## Por qué

Es la fase que el roadmap marca como decisiva: sin esto la conversación es
solo un chat bonito, no un sistema que sabe cuánto se fía de cada dato. El
fallo de `colchonMeses`/`riesgoExperiencia` importaba especialmente porque
son justo las variables críticas (R9) que deciden si el informe sale
completo o condicionado — no detectarlo habría dejado la fase "funcionando"
en apariencia pero incumpliendo su propio criterio de aceptación.
