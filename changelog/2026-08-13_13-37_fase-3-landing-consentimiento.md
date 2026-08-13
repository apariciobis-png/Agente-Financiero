# Fase 3 · Landing y entrada al diagnóstico completada

**Fecha:** 2026-08-13 13:37
**Tipo:** Feature

## Qué se hizo

Construida la puerta pública del producto, siguiendo `docs/roadmap.md`
(Fase 3) y `docs/user-flows.md` (Flujo 1, pasos 1-2):

- **Landing** (`/`): qué es, para quién, un único botón "Empezar mi
  diagnóstico". Reescribe la página por defecto de `create-next-app`.
- **Consentimiento** (`/consentimiento`): declara las **dos finalidades**
  (diagnóstico + contacto comercial del asesor) con una casilla que hay que
  marcar explícitamente — el botón de enviar está deshabilitado hasta
  entonces. Formulario en un Client Component (`consentimiento-form.tsx`)
  con `useActionState` para mostrar errores sin recargar la página.
- **Server Action `aceptarConsentimiento`** (`src/app/consentimiento/actions.ts`):
  valida el consentimiento también en servidor (no solo el disabled del
  botón — "treat every action as an untrusted entry point"), comprueba el
  límite de entrevistas por IP y hora, crea la fila en `entrevistas`
  (`cliente_id` NULL, como manda `docs/data-model.md`), registra el uso y
  redirige a `/entrevista/[token]`.
- **`src/lib/limites-uso.ts`**: helper compartido — hash de IP (sha256, nunca
  la IP en claro), lectura de la IP real desde las cabeceras, y comprobación
  de límite genérica (reutilizable en la Fase 4 para el tope de mensajes).
  Umbrales de partida: 5 entrevistas/hora, 30 mensajes/entrevista — no vienen
  de ninguna regla de criterio, son técnicos, y quedan documentados como
  pendientes de validar.
- **`/entrevista/[token]`**: lee la entrevista con el cliente de servicio
  (el visitante no tiene sesión), y cubre los tres casos: token inválido,
  entrevista caducada (`expira_en` pasado) y entrevista válida (por ahora un
  placeholder — el chat llega en la Fase 4).

**Verificado en el navegador, no solo leído:**
- Landing → consentimiento → casilla marcada → redirección real a
  `/entrevista/[uuid]`.
- La fila en `entrevistas` queda exactamente como se esperaba: `cliente_id`
  null, `estado` en_curso, `consentimiento_en` con fecha, `expira_en` a 30
  días (confirmado por consulta directa a la base de datos).
- Recargar la misma URL mantiene la misma entrevista.
- Un token inventado (uuid al azar) no cuela: muestra "enlace no válido", no
  crea nada ni expone datos de otra entrevista.
- `pnpm test` sigue en 95 verdes, `pnpm run lint` limpio, sin errores de
  servidor en `pnpm dev`.

## Qué se modificó

- Nuevo: `src/lib/limites-uso.ts`, `src/app/consentimiento/page.tsx`,
  `consentimiento-form.tsx`, `actions.ts`,
  `src/app/entrevista/[token]/page.tsx`.
- Reescrito: `src/app/page.tsx` (landing real, ya no la plantilla de
  `create-next-app`), `src/app/layout.tsx` (metadata en español, `lang="es"`).
- Documentación: `docs/roadmap.md` (Fase 3 completada), `docs/architecture.md`
  (umbrales concretos de la protección del flujo público, y dónde vive cada
  medida en el código).

## Por qué

Es la puerta de entrada y el mecanismo de captación del producto (F0 del PRD):
sin esto no hay forma de llegar a la entrevista, y el consentimiento con sus
dos finalidades es un requisito RGPD no negociable de `business.md`, no un
detalle de UI.
