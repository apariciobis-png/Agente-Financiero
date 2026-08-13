# Asesor financiero conversacional

Una web donde una persona charla cinco minutos con un asistente y recibe un
plan financiero hecho con sus números y explicado en castellano llano. La
asesora ve a todos sus clientes en un panel.

**Este repositorio trae la aplicación funcionando de verdad**: entrevista
conversacional, cálculo del diagnóstico, plan en lenguaje llano y panel de la
asesora — las nueve primeras fases del roadmap ya construidas y probadas.
Solo queda la Fase 10 (publicación). Si partes de una copia sin estas fases
hechas, todo lo de abajo te sirve igual: aquí están las decisiones tomadas y
las reglas escritas para que tu agente construya el resto encima.

---

## Cómo usar este repositorio

No hace falta que sepas programar. Vas a dirigir a un agente de IA, y este
repositorio está preparado para que el agente sepa qué hacer sin que tengas que
explicárselo.

### 1. Descárgatelo

Botón verde **Code → Download ZIP**, y descomprímelo donde quieras. O clónalo,
si te manejas con git.

### 2. Ábrelo con tu agente

Abre la carpeta con Claude Code, Cursor o el que uses.

### 3. Dile que empiece

Literalmente esto:

```text
Lee CLAUDE.md y toda la documentación de docs/, dime en qué fase está el
proyecto según docs/roadmap.md y empecemos por ahí.
```

Eso es todo. El agente lee las reglas del proyecto, ve las fases pendientes y
arranca por la primera. **No tienes que escribir prompts largos**: el trabajo
de explicarle el proyecto ya está hecho, y está hecho en `docs/`.

### 4. Ve fase por fase

`docs/roadmap.md` divide la construcción en diez fases. Cada una termina con
un **«hecho cuando…»** que puedes comprobar tú mismo usando la aplicación o
mirando la base de datos, sin leer una línea de código.

La única regla importante: **no pases a la fase siguiente si la actual no ha
pasado su comprobación.** Un fallo arrastrado tres fases es mucho más difícil
de encontrar que uno recién hecho.

### Antes de empezar necesitarás

- Una **clave de API de Anthropic** (en `console.anthropic.com`), con saldo.
- Un **proyecto de Supabase** (gratis, en `supabase.com`). Elige **región
  europea**: vamos a guardar datos financieros de personas reales.
- **Node.js** y **pnpm v11** instalados.

### Arrancarlo en tu máquina

Si no tienes `pnpm`, instálalo primero con `npm install -g pnpm` (necesitas
Node.js instalado). Desde la raíz del repositorio, en una terminal (en
Windows: busca **PowerShell** en el menú de inicio):

```bash
pnpm install
pnpm test   # deben pasar 95 tests — el motor de cálculo
pnpm dev    # abre http://localhost:3000
```

Copia `.env.example` como `.env.local` y rellena las claves reales: la clave
de Anthropic y las tres de Supabase hacen falta ya, no solo para el motor —
la entrevista, el diagnóstico y el plan las usan en cuanto arrancas la app.

### Entrar en el panel de la asesora (`/panel`)

El panel usa un enlace por correo, sin contraseña — pero la primera vez hay
un paso manual, porque nadie puede darse de alta como asesora sola (así lo
pide `docs/data-model.md`):

1. Con `pnpm dev` corriendo, ve a `http://localhost:3000/panel/login`, pon tu
   correo y pulsa el enlace que te llega.
2. Vas a caer en una pantalla de "esta cuenta no tiene acceso al panel" — es
   lo esperado. Pídele a tu agente que busque tu usuario en `auth.users` (con
   el MCP de Supabase, en modo lectura) y te dé el `INSERT` para la tabla
   `asesores`. Lo pegas en el SQL Editor de supabase.com, y ya está.
3. Recarga `/panel`: ya deberías ver el listado de clientes.

---

## Una cosa que conviene saber antes

**Tu código no va a ser igual al de la clase, ni al de tus compañeros.**

Le estás pidiendo a un agente que construya algo, y un agente no da dos veces
la misma respuesta. Los nombres de los archivos cambiarán, la estructura puede
cambiar y el diseño casi seguro que cambia.

No es un error. Lo que tiene que coincidir no es el código, es **el
comportamiento**. Por eso cada fase del roadmap se comprueba por lo que la
aplicación hace, no por cómo está escrita por dentro.

---

## Qué contiene

### La documentación · `docs/`

El corazón del repositorio. Ocho documentos que responden a todo lo que un
agente necesita saber antes de escribir una línea.

| Archivo | Responde a |
|---|---|
| `prd.md` | Qué construimos y para quién |
| `business.md` | Por qué tiene valor y qué **no se puede hacer por ley** |
| `architecture.md` | Cómo encajan las piezas, y las trampas ya conocidas |
| `data-model.md` | Qué se guarda y por qué |
| `design-system.md` | Cómo se ve y cómo suena |
| `roadmap.md` | **Las nueve fases.** Por aquí se empieza |
| `user-flows.md` | Qué hace el cliente y qué hace la asesora |
| `testing.md` | Cómo se comprueba que funciona |

### El criterio financiero · `docs/criterio/`

Las reglas del negocio, heredadas de las sesiones anteriores del curso. No son
documentación de apoyo: son **la especificación**. Definen cuánto puede
invertir alguien al mes, qué cartera le corresponde, qué hacer si su meta no es
alcanzable y qué está terminantemente prohibido recomendar.

`reglas-recomendacion.md` es la única fuente de verdad financiera. Si algo la
contradice, manda ella.

### El motor de cálculo · `src/lib/motor/`

**Esto ya está hecho, verificado, y no se toca.**

Es la parte que no puede salir mal: calcula rentabilidades, proyecciones y
probabilidades. Está traducido desde un motor original en Python y hay **95
pruebas** que comprueban que da exactamente las mismas cifras.

Si tu agente propone «mejorarlo» o reescribirlo, dile que no. Esas pruebas son
la garantía de que las cuentas están bien.

### El esquema de la base de datos · `supabase/`

También hecho. Las tablas donde se guardan los clientes, las conversaciones y
los datos capturados, con la seguridad ya configurada. Te lo damos listo para
no perder la sesión explicando qué es cada columna.

### Material de clase · `material-clase/`

`GUION-CLIENTE-PRUEBA.md` es un cliente inventado —Laura, 40 años, diseñadora—
con todas sus respuestas ya escritas. Sirve para probar la entrevista sin
inventarte nada sobre la marcha, y trae la tabla de cómo tiene que quedar el
resultado para que compares.

Úsalo en cuanto tengas la captura de datos funcionando. Es la prueba que más
fallos reales detecta.

### El resto

`CLAUDE.md` son las instrucciones permanentes para el agente: qué leer, qué
está prohibido y cómo registrar los cambios. `changelog/` guarda el historial
de lo que se va haciendo, y `mejoras/` las ideas que quedan para más adelante.

---

## Lo que hace especial a este proyecto

Casi todo lo que construyas con IA da igual si se equivoca un poco. Esto no: si
el sistema le dice a alguien que llegará a su meta cuando no va a llegar, hace
daño de verdad.

Por eso hay una regla que lo ordena todo:

> **El modelo de lenguaje entrevista y redacta. Nunca calcula.**

Los números los pone el motor, que es código y está probado. El modelo recibe
las cifras ya hechas y su único trabajo es traducirlas a algo que se entienda.

Verás esa decisión repetida por toda la documentación. Merece la pena entender
por qué está ahí: es el tipo de decisión que vas a tener que tomar tú en tu
próximo proyecto.

---

## Aviso

Este sistema ofrece **orientación educativa**, no asesoramiento financiero
regulado. No recomienda productos concretos ni promete rentabilidades.
