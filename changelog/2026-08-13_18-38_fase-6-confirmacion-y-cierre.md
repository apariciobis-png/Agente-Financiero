# Fase 6 · Confirmación y cierre completada

**Fecha:** 2026-08-13 18:38
**Tipo:** Feature

## Qué se hizo

Cerrado el ciclo de la entrevista, siguiendo `docs/roadmap.md` (Fase 6) y
`docs/design-system.md` ("Resumen editable"):

- **Transición automática a confirmación**: en `src/app/api/entrevistas/[token]/mensajes/route.ts`,
  en cuanto los 8 bloques tienen algo (`progresoBloques()` todo `true` —
  incluida una negativa explícita como respuesta válida), `entrevistas.estado`
  pasa de `en_curso` a `pendiente_confirmacion` sin que el cliente tenga que
  pedirlo. El chat muestra entonces un aviso con enlace a la pantalla de
  confirmación en vez del campo de texto.
- **`/entrevista/[token]/confirmar`** (nuevo): cada uno de los 14 datos en su
  fila, en frase llana, con su etiqueta visible
  (confirmado/estimado/pendiente — atenuado el segundo, hueco el tercero, no
  error, según `docs/design-system.md`). Clicar una fila la vuelve
  editable — inputs de texto/número, desplegable para los campos enum, y un
  mini-formulario propio para `deudas` (sin deudas / una deuda con
  cuota-interés-saldo / prefiere no decirlo). El descargo de orientación
  educativa va al pie, visible, no en un acordeón ni en letra pequeña de
  verdad escondida.
- **`PATCH /api/entrevistas/[token]/ficha`**: aplica una corrección con
  etiqueta `confirmado` siempre — el cliente la está dando él mismo, ya no
  hay rango de por medio. Devuelve 409 si la ficha ya está cerrada.
- **`POST /api/entrevistas/[token]/cerrar`**: marca `entrevistas.estado =
  'completada'` y `completada_en`. Idempotente si ya estaba cerrada.
- La página `/entrevista/[token]` redirige sola a `/confirmar` si la
  entrevista ya no está `en_curso` — no hay forma de volver al chat una vez
  pasado ese punto.

## Verificado en el navegador (con datos reales de la base de datos, sin gastar llamadas al modelo)

- `/entrevista/[token]` con una entrevista `pendiente_confirmacion`
  redirige sola a `/confirmar`.
- El resumen mostró exactamente lo que había en `fichas.datos` — incluido un
  campo `colchonMeses` en `pendiente` de una entrevista anterior.
- **El criterio real de la fase**: se corrigió ese campo a `5` desde la UI
  y quedó en la base de datos como `{"valor":5,"etiqueta":"confirmado"}` —
  confirmado con consulta directa.
- Al pulsar "Confirmar y enviar", `entrevistas.estado` pasó a `completada`
  con su `completada_en`.
- Recargar la pantalla de confirmación de una entrevista ya `completada`
  muestra el mensaje de "ya confirmaste tus datos" sin permitir editar.
- Un intento de `PATCH` contra una ficha ya cerrada devuelve 409, tal como
  debía.
- `pnpm test` sigue en 95 verdes, `pnpm run build` compila sin errores de
  tipos, sin errores de servidor.

## Qué se modificó

- Nuevo: `src/app/entrevista/[token]/confirmar/` (`page.tsx`,
  `resumen-editable.tsx`, `formato.ts`), `src/lib/campos-ficha.ts`,
  `src/app/api/entrevistas/[token]/ficha/route.ts`,
  `src/app/api/entrevistas/[token]/cerrar/route.ts`.
- Modificado: `src/app/api/entrevistas/[token]/mensajes/route.ts`
  (transición automática de estado), `src/app/entrevista/[token]/page.tsx`
  (redirección), `chat.tsx` (aviso de "lista para confirmar").
- Documentación: `docs/roadmap.md` (Fase 6 completada), `docs/data-model.md`
  (cómo se implementan en la práctica los tres estados de la entrevista y el
  cierre de la ficha).

## Por qué

Es la última red contra datos mal recogidos antes de que el motor calcule
nada con ellos (Fase 7): sin esta pantalla, un error de captura llegaría
directo al diagnóstico del cliente. Que la corrección pase siempre a
`confirmado` es deliberado — es el propio cliente dándolo con sus manos, ya
no hay ambigüedad de rango que justifique `estimado`.
