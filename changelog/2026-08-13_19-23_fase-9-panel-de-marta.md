# Fase 9 · El panel de Marta (código completo, verificación en vivo pendiente)

**Fecha:** 2026-08-13 19:23
**Tipo:** Feature

## Qué se hizo

Construido el panel de la asesora, siguiendo `docs/roadmap.md` (Fase 9) y
`docs/user-flows.md` (Flujo 2):

- **Auth sin contraseña**: `src/app/panel/login/` (email → enlace mágico de
  Supabase Auth, `signInWithOtp`) y `src/app/panel/auth/callback/route.ts`
  (intercambia el código por sesión). Nada de contraseñas que gestionar.
- **`src/proxy.ts`** (nuevo — en Next.js 16 `middleware.ts` se renombró a
  `proxy.ts`, revisado antes de escribirlo): refresca la sesión en cada
  petición a `/panel/*` y redirige a `/panel/login` si no hay sesión.
- **Grupo de rutas `(protegido)`**: `src/app/panel/(protegido)/layout.tsx`
  comprueba que la sesión pertenece a alguien de la tabla `asesores` —
  estar ahí *es* el permiso (`docs/data-model.md`). Si no, mensaje claro en
  vez de un panel vacío. El grupo no toca la URL: `/panel/login` queda
  fuera de esta verificación a propósito.
- **`src/lib/panel.ts`**: `listarClientes()` y `obtenerDetalleCliente()`,
  ambas con el cliente de servidor con sesión — las lecturas quedan sujetas
  a RLS, no se usa la clave de servicio para nada de esto.
- **Listado** (`/panel`): una fila por cliente, ordenado por defecto con la
  banda más urgente primero (Baja → Frágil → Razonable → Alta); columna de
  cliente también ordenable por nombre.
- **Ficha de cliente** (`/panel/clientes/[clienteId]`): las tres vistas —
  Diagnóstico (por defecto), Ficha cruda (con cita literal y etiqueta de
  cada dato) y Plan (igual que lo vio el cliente).
- **Las cuatro visualizaciones** (Recharts, nueva dependencia): indicador de
  probabilidad con su banda, anillo de composición de cartera, banda de
  proyección p10/p50/p90 en el tiempo, y checklist de prioridades R1 con lo
  cumplido marcado.
- **`src/lib/diagnostico.ts` ampliado** para dar de comer a estas dos
  últimas visualizaciones, que no existían hasta ahora:
  - `prioridadesR1`: los 5 pasos de R1 con `cumplido` y un detalle — deuda
    cara detectada por TAE > 7%, colchón según el umbral de R1, etc.
  - `serieTemporal`: el mismo Monte Carlo del análisis final, repetido en 5
    puntos del plazo (0, 25, 50, 75, 100%) — mismos supuestos, nada
    inventado, solo la función del motor llamada varias veces. Es lo que
    permite que la banda p10-p90 se vea *crecer* en el tiempo, que es el
    mensaje que pide `docs/design-system.md`.

## Verificado

- `pnpm test`: 100 tests en verde (2 aserciones nuevas sobre
  `prioridadesR1`/`serieTemporal`, sin tocar el motor).
- `pnpm run lint` y `pnpm run build` limpios; el build confirma el proxy
  registrado (`ƒ Proxy (Middleware)`).
- En el navegador: `/panel` sin sesión redirige a `/panel/login` (el proxy
  funciona), y la página de login carga y pide solo el correo.

## Lo que falta para dar la fase por cerrada

**No puedo completar el login yo mismo** — crear una cuenta (aunque sea vía
enlace mágico, sin contraseña) es una de las acciones que tengo prohibidas
sin excepción, y además no tengo acceso a ningún correo para pinchar el
enlace. Hace falta que el usuario:

1. Arranque la aplicación (`pnpm dev`) y entre en `/panel/login` con su
   propio correo.
2. Revise su bandeja y pinche el enlace.

Con eso, Supabase le crea una fila en `auth.users`. Entonces yo puedo
consultar su ID (con el MCP, en modo lectura) y pasarle en el chat el SQL
para darla de alta en `asesores` — sin eso, entra pero el panel le dice que
esa cuenta no tiene acceso, que es el comportamiento correcto.

## Qué se modificó

- Nuevo: `src/proxy.ts`, `src/app/panel/login/`, `src/app/panel/auth/callback/`,
  `src/app/panel/cerrar-sesion.tsx`, `src/app/panel/(protegido)/` (layout,
  página de listado, tabla), `src/app/panel/(protegido)/clientes/[clienteId]/`
  (página, tabs, las tres vistas), `src/lib/panel.ts`.
- Modificado: `src/lib/diagnostico.ts` (`prioridadesR1`, `serieTemporal`),
  `src/lib/diagnostico.test.ts`.
- Dependencia nueva: `recharts`.

## Por qué

Es la pieza que le devuelve tiempo a Marta: "identificar en menos de 30
segundos qué cliente tiene la meta en riesgo" es literalmente el primer
elemento del listado, sin que tenga que hacer nada.
