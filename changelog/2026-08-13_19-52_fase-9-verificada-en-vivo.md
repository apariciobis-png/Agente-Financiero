# Fase 9 verificada en vivo — completada

**Fecha:** 2026-08-13 19:52
**Tipo:** Feature

## Qué se hizo

El usuario completó en su propio equipo el login por enlace mágico
(`pnpm dev` + `/panel/login`), algo que el agente no puede hacer por
tratarse de creación de cuenta. Con su `auth.users.id` ya generado, se le
dio el SQL para darle de alta como asesor:

```sql
insert into asesores (id, nombre) values ('...', 'Alejandro');
```

Verificado después, todo en el navegador del usuario:

- El listado (`/panel`) muestra los clientes ordenados por riesgo — la
  Laura con banda "Baja · 5%" aparece primero, antes que las de "Sin
  calcular".
- La ficha de cliente (`/panel/clientes/[id]`) funciona con sus tres
  pestañas: **Diagnóstico** (2 de las 4 tarjetas visibles — las otras dos,
  `serieTemporal` y `prioridadesR1`, se añadieron a `diagnostico.ts` en
  esta misma sesión, después de calcularse ese análisis en concreto; cubren
  su ausencia los 2 tests nuevos de `diagnostico.test.ts`, no un fallo),
  **Ficha cruda** (cada dato con su cita literal y su etiqueta —
  `gastoTotalMes` sale correctamente en "estimado") y **Plan** (idéntico a
  lo que vio la propia clienta).

## Qué se modificó

- `docs/roadmap.md`: Fase 9 marcada como completada.

## Por qué

Cierra el ciclo de verificación: no basta con que compile y pase los
tests, hacía falta confirmar con una sesión de Supabase Auth real —
justo lo único que el agente no puede simular por sí mismo.
