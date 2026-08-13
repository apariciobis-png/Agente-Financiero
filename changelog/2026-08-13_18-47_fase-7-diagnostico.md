# Fase 7 · Diagnóstico completada

**Fecha:** 2026-08-13 18:47
**Tipo:** Feature

## Qué se hizo

Conectado el motor de cálculo (`src/lib/motor/`, intocado) a la ficha real,
siguiendo el pipeline de `docs/criterio/instrucciones-motor.md` §5:

- **`src/lib/diagnostico.ts`** (nuevo): función pura `ejecutarDiagnostico(ficha)`
  que orquesta las funciones del motor — clasifica la meta (§3, por palabras
  clave en `objetivoDescripcion`: patrimonio / renta de cartera / renta de
  negocio / mixta — ver limitación anotada abajo), calcula flujo libre (R2 +
  C1: si el gasto ya incluye las cuotas de deuda, con el extremo prudente
  cuando no puede determinarse), ajusta la cartera por plazo (R3),
  aportación propuesta acotada al tope sostenible (R2, C14), proyección
  determinista a ritmo actual y propuesto, y Monte Carlo con probabilidad y
  banda (R10). En modo `suspendido` no calcula nada de propuesta — solo lo
  descriptivo, tal como exige R9.
- **Solver nuevo** (`aportacionRequerida`, búsqueda binaria sobre
  `vfDeterminista` + `aEurosActuales`, ambas del motor): el motor original
  tampoco trae una función para "cuánto hay que aportar para llegar a X" —
  es lógica de ensamblado, no de cálculo financiero, así que vive en
  `diagnostico.ts` y no en `motor/`.
- **`POST /api/entrevistas/[token]/cerrar`** ampliada: en el mismo paso que
  cierra la entrevista (Fase 6), ejecuta el diagnóstico sobre la ficha recién
  cerrada y lo guarda en `analisis`, con `version_motor` y `version_reglas`
  para poder reproducir el informe más adelante.
- **`src/lib/diagnostico.test.ts`** (nuevo, 5 tests): a diferencia del chat
  (no testeable automáticamente por ser generativo — `docs/testing.md`),
  `ejecutarDiagnostico` es código determinista puro y sí se presta a tests
  normales. Cubre: modo suspendido por negativa de deudas, ficha completa de
  patrimonio, meta ya alcanzada (C13), perfil de riesgo pendiente → tratado
  como conservador (R5), y meta de negocio propio no convertida (§3/R6).

## Verificado

- **El criterio real de la fase, las dos mitades**: una ficha completa real
  (la segunda Laura de la Fase 5/6, cerrada en el navegador) produjo un
  `analisis` con `modo: "completo"`, probabilidad de cumplimiento y banda —
  comprobado con consulta directa a la base de datos, no solo leído en
  pantalla. Y el test unitario de deudas-negativa confirma `modo:
  "suspendido"`, sin aportación ni Monte Carlo.
- `pnpm test`: **100 tests en verde** (95 del motor, sin tocar, + 5 nuevos
  de diagnóstico). `pnpm run lint` y `pnpm run build` limpios.
- Sin errores de servidor en el navegador.

## Limitaciones anotadas (`mejoras/backlog.md`)

- **MEJORA-04**: la plantilla de entrevista nunca pregunta explícitamente si
  la meta es patrimonio, renta de cartera o renta de un negocio propio — se
  infiere por palabras clave, que es frágil. Lo correcto es añadir la
  pregunta al bloque 1.
- **MEJORA-05**: no se captura si el cliente tiene provisiones aparte para
  gastos irregulares, así que el diagnóstico siempre asume que no (extremo
  prudente de R9), lo que puede infravalorar su capacidad real de ahorro.

## Qué se modificó

- Nuevo: `src/lib/diagnostico.ts`, `src/lib/diagnostico.test.ts`.
- Modificado: `src/app/api/entrevistas/[token]/cerrar/route.ts`.
- Documentación: `docs/roadmap.md` (Fase 7 completada),
  `docs/architecture.md` (estructura de carpetas), `mejoras/backlog.md`
  (dos limitaciones anotadas).

## Por qué

Es donde el producto deja de ser "una conversación bonita" y empieza a
decir algo con consecuencias reales: si va a llegar a su meta o no, y con
qué probabilidad. Que el modo `suspendido` no calcule nada de propuesta no
es un detalle técnico — es la regla R9 aplicada literalmente: sin saber si
hay una deuda cara, el sistema no tiene base para recomendar invertir.
