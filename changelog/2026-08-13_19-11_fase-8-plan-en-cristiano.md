# Fase 8 · El plan en cristiano completada

**Fecha:** 2026-08-13 19:11
**Tipo:** Feature

## Qué se hizo

Redacción del plan para el cliente, siguiendo
`docs/criterio/instrucciones-agente-v2.md` §Fase 4:

- **`src/lib/claude/prompt-plan.ts`**: prompt de sistema con las reglas de
  traducción "en cristiano" (frases cortas, cero siglas, cifras ancladas a
  su vida, cartera en formato "de cada 100 €") y las 7 secciones que redacta
  el modelo. La 8ª sección (el descargo) **no se le pide al modelo**: es
  texto fijo inyectado por código (`DESCARGO_PLAN` en `src/lib/planes.ts`),
  igual que la apertura literal de la entrevista — así el descargo nunca
  depende de que el modelo se acuerde de escribirlo bien.
- **`src/lib/planes.ts`**: `redactarSecciones()` llama al modelo con salida
  estructurada (`output_config.format: json_schema`) para garantizar las 7
  claves exactas; `generarYGuardarPlan()` arma el markdown completo y lo
  guarda en `planes` junto con `secciones` (jsonb) y el descargo.
- **`POST /api/entrevistas/[token]/cerrar`** ampliada una vez más: tras
  guardar `analisis` (Fase 7), redacta y guarda el plan en el mismo paso. Si
  la redacción falla, el cierre y el análisis siguen guardados — el plan se
  puede reintentar sin repetir nada.
- **`POST /api/entrevistas/[token]/plan`**: reintento de la redacción sin
  volver a ejecutar el motor.
- **`GET /api/entrevistas/[token]/plan/descargar`**: el plan como `.md`
  descargable (`docs/user-flows.md` lo pedía explícitamente).
- **`/plan/[token]`**: las 7 secciones en tarjetas plegables (dos abiertas
  por defecto: "Tu meta" y "¿Llegas si sigues así?"), el descargo siempre
  visible al pie, y un botón de reintento si la redacción falló.
- Refactor pequeño: `formatearValor`/`formatearDeudas` se movieron de
  `app/entrevista/[token]/confirmar/` a `src/lib/formato-ficha.ts` — los
  necesitaba también la redacción del plan, y una ruta bajo `app/`
  importando hacia otra rama de `app/` es mala capa.

## Un fallo real encontrado y corregido

Primer intento: `SyntaxError: Unterminated string in JSON` al parsear la
respuesta. Causa — `claude-sonnet-5` piensa por defecto (adaptativo) y
`max_tokens` cubre pensamiento + respuesta juntos; con 4096 no llegaba a
terminar el JSON de las 7 secciones. Se subió a 8192 y se añadió una
comprobación explícita de `stop_reason === 'max_tokens'` antes de intentar
el `JSON.parse`, para fallar con un mensaje claro en vez de una excepción
críptica. Documentado como trampa nueva en `docs/architecture.md`.

## Verificado (con datos reales, análisis ya calculado de antes)

- El plan generado para la ficha completa de Laura: **cada cifra que
  aparece en el texto se rastreó una por una contra `analisis.resultado`**
  — 180 € de margen libre, 33,8 y 36,2 años, el rango 126-144 €, la
  probabilidad del 5 % con p10/p50/p90, el reparto 80/15/5 y la
  rentabilidad 5,35 %. Ninguna cifra sin origen en el JSON.
- El descargo salió literal, sin parafrasear.
- La sección 5 ("si los números no salen") apareció justo porque
  `aportacion.viable` era `false`, y explicó por qué no subir el riesgo
  apoyándose en la propia historia del cliente (2020, no vendió) — tal como
  pide la regla.
- Nunca se nombró un producto, gestora o ticker; nunca se prometió una
  rentabilidad ("sin garantía de que se repita").
- La descarga en `.md` funciona (`Content-Disposition: attachment`,
  comprobado con `fetch` directo).
- `pnpm test`: 100 tests en verde (sin cambios respecto a la Fase 7).
  `pnpm run lint` y `pnpm run build` limpios.

## Qué se modificó

- Nuevo: `src/lib/claude/prompt-plan.ts`, `src/lib/planes.ts`,
  `src/lib/formato-ficha.ts`, `src/app/plan/[token]/page.tsx`,
  `src/app/plan/[token]/regenerar-plan.tsx`,
  `src/app/api/entrevistas/[token]/plan/route.ts`,
  `src/app/api/entrevistas/[token]/plan/descargar/route.ts`.
- Modificado: `src/app/api/entrevistas/[token]/cerrar/route.ts`,
  `src/app/entrevista/[token]/confirmar/resumen-editable.tsx` (enlaza al
  plan al confirmar), `src/app/entrevista/[token]/confirmar/formato.ts`
  (ahora reexporta desde `lib/`).
- Documentación: `docs/roadmap.md` (Fase 8 completada),
  `docs/architecture.md` (estructura de carpetas + trampa nueva de
  `max_tokens` con salida estructurada).

## Por qué

Es la pieza que convierte un JSON de números en algo que Laura puede leer
sin saber de finanzas — y la separación estricta se sostiene hasta el
final: el modelo traduce, nunca calcula. El descargo fijo por código, no
por instrucción, es la misma decisión que ya se tomó con la apertura de la
entrevista: lo que es obligatorio e invariable no se le confía a un modelo
generativo, se inyecta.
