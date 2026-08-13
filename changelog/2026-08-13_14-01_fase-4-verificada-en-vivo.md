# Fase 4 verificada en vivo — completada

**Fecha:** 2026-08-13 14:01
**Tipo:** Feature

## Qué se hizo

Con saldo ya en la cuenta de Anthropic, se repitió la prueba del chat de la
Fase 4 (ver `changelog/2026-08-13_13-49_fase-4-entrevista-que-habla.md`) de
principio a fin en el navegador, con llamadas reales al modelo:

- Apertura literal correcta.
- El modelo pidió el correo tras el nombre; detectó y rechazó un correo mal
  formado (doble `@`, artefacto del autocompletado del navegador) sin
  inventarse una corrección — repreguntó tal cual pide la regla de
  "nunca inventar datos".
- Llamó a `crear_cliente` en cuanto tuvo ambos datos; quedó una fila real en
  `clientes` (nombre y correo correctos) enlazada a la entrevista vía
  `cliente_id`. Verificado con consulta directa a la base de datos.
- Pasó al bloque 1 con el descargo educativo, preguntó objetivo + cifra +
  plazo en un mismo mensaje (como marca la plantilla), y al faltar la cifra
  hizo **un único rebote** pidiendo solo lo que faltaba — no repitió toda la
  pregunta ni insistió una segunda vez.
- Sin errores de servidor en los logs.

## Qué se modificó

- `docs/roadmap.md`: Fase 4 marcada como completada (antes quedó sin marcar
  a la espera de esta verificación).

## Por qué

El "hecho cuando" de la Fase 4 en `docs/roadmap.md` exige comprobarlo con la
aplicación de verdad, no basta con que el código compile. Con el saldo
repuesto se pudo confirmar el criterio completo: orden de preguntas, una
por mensaje, rebote único, y alta real en `clientes`.
