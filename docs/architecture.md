# Arquitectura

---

## El principio que ordena todo lo demás

```
Cliente ──chat──▶ [MODELO entrevistador] ──herramienta──▶ ficha (base de datos)
                                                              │
                                                              ▼
                                                    [MOTOR · código puro]
                                                     reglas R1–R10 + Monte Carlo
                                                              │ JSON con TODOS los números
                                                              ▼
                                                    [MODELO redactor] ──▶ plan
                                                              │
                                                              ▼
                                              Cliente ve su plan · Marta ve el panel
```

**El modelo de lenguaje entrevista y redacta. Nunca calcula.**

No es una preferencia de estilo. El criterio lo exige por escrito («todo número
sale de código ejecutado») y aquí se convierte en arquitectura para que no
pueda saltarse ni por accidente: el modelo redactor recibe los números ya
hechos y su tarea es traducirlos, no producirlos.

Un modelo que hace cuentas se equivoca de vez en cuando. En este dominio un
error no es una errata: es una persona decidiendo sobre sus ahorros con un
número inventado.

---

## Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| Base de datos y auth | Supabase (PostgreSQL + Auth), **región europea** |
| Modelo de lenguaje | API de Anthropic — `claude-sonnet-5` |
| Gráficos | Recharts |
| Tests | Vitest |
| Gestor de paquetes | pnpm v11 |
| Despliegue | Vercel |

**Por qué un solo proyecto y no un servicio aparte para el motor.** Los
cálculos son elementales —interés compuesto y 10.000 trayectorias
lognormales— y en JavaScript son milisegundos. Mantener un servicio Python
solo para eso significaría un segundo despliegue y un segundo lenguaje a
cambio de nada.

---

## Las seis decisiones

### 1. El modelo nunca calcula

Ya explicada arriba. Es la que manda sobre todas las demás.

### 2. La base de datos es el contrato

En la versión de escritorio, el enlace entre módulos era un archivo markdown
con claves fijas. Ahora es una tabla. El markdown se sigue generando, pero como
**vista descargable**, no como fuente de verdad.

Sin esto no hay multiusuario ni panel: no se puede consultar un directorio de
archivos.

### 3. Los datos se extraen turno a turno

El modelo llama a una herramienta `guardar_dato` según captura, en vez de
procesar la conversación entera al terminar.

**Por qué importa más de lo que parece:** la etiqueta de calidad
(`confirmado` / `estimado` / `pendiente`) no depende de *qué* contestó el
cliente sino de *cómo* lo contestó — si lo dijo a la primera, si hubo que
ofrecerle rangos, si se insistió y aun así no concretó. Eso se sabe en el
momento; reconstruirlo después leyendo la transcripción es exactamente donde
los modelos se despistan. Y esas etiquetas deciden si el informe sale completo,
condicionado o suspendido.

Además, la plantilla tiene reglas que necesitan saber el estado de la ficha en
tiempo real: captura al vuelo, un rebote por variable, límite de intercambios.

### 4. Chat con red de seguridad

Conversación natural, y al final una pantalla de confirmación editable. La
conversación es la propuesta de valor; la pantalla es lo que impide que un dato
mal capturado llegue al motor.

### 5. La clave de la API vive en el servidor

Las llamadas al modelo salen siempre de rutas de servidor. Una clave de API en
el navegador es pública.

### 6. El cliente nunca habla con la base de datos

Sus mensajes pasan por rutas de servidor que validan el token de la entrevista
y escriben con la clave de servicio. **No hay políticas de acceso para el rol
anónimo**: si algún día se filtra la clave pública, la base de datos no expone
nada.

### 7. La entrada es pública, y el token lo genera el sistema

Cualquiera entra desde la landing. No hay enlaces que repartir ni altas
previas: al aceptar el consentimiento se crea la entrevista con su token, y esa
URL es la credencial del visitante.

**Por qué:** el diseño inicial hacía que la asesora diera de alta a cada
cliente y le enviara su enlace. Eso significaba que, hasta que ella no tuviera
un cliente, la aplicación no servía para nada — no era un producto, era una
herramienta interna. Con entrada pública el sistema capta por sí solo.

La seguridad no cambia: el token sigue siendo lo único que autoriza a leer o
escribir en una entrevista. Solo cambia quién lo emite.

Lo que sí aparece es una **superficie de abuso que antes no existía**: un chat
público que llama a una API de pago. Ver la sección siguiente.

---

## Protección del flujo público

La entrevista es abierta y cada mensaje cuesta dinero en la API del modelo.

| Medida | Dónde |
|---|---|
| Límite de entrevistas nuevas por IP y hora | Server Action `aceptarConsentimiento` en `src/app/consentimiento/actions.ts` |
| Tope de mensajes por entrevista | `src/app/api/entrevistas/[token]/mensajes/route.ts` (la plantilla ya marca ~12 intercambios) |
| Caducidad de la entrevista a 30 días | `entrevistas.expira_en`, comprobada en `src/app/entrevista/[token]/page.tsx` |

Se guarda un **hash** de la IP en `limites_uso`, nunca la IP en claro: sirve
igual para contar y deja de ser un dato personal identificable. Toda la
lógica de hash y conteo vive en `src/lib/limites-uso.ts`.

**Umbrales concretos** — no están en ninguna regla de `docs/criterio/` (son
límites técnicos, no financieros), así que quedan como constantes en
`src/lib/limites-uso.ts`: **5 entrevistas nuevas por IP y hora**, **30
mensajes por entrevista**. Ajustables sin tocar el resto del código; sin
validar todavía con el dueño del producto.

---

## Cómo el modelo sabe qué ficha ya tiene capturada (Fase 5)

`claude-sonnet-5` no soporta mensajes de sistema a mitad de conversación
(`role: "system"` en `messages[]` — ver la guía de migración de modelos), así
que la única vía es reconstruir el `system` del prompt en cada turno,
añadiéndole un bloque con el estado actual de la ficha
(`src/lib/fichas.ts` · `resumenFicha()`). Es lo que le permite al modelo no
volver a preguntar un dato que ya capturó, incluida la captura al vuelo.

**Coste de esto:** invalida la caché de prompts en cada turno, porque el
`system` cambia byte a byte. Para el volumen de esta aplicación (una
entrevista de ~12 intercambios, no un chat de uso continuo) el ahorro de la
caché no compensa la complejidad de mantenerla sincronizada con un estado
que cambia turno a turno. Si el volumen crece lo bastante como para que
importe, la alternativa que sí cachea es mover el estado de la ficha a un
bloque `<system-reminder>` dentro del último mensaje de usuario, dejando el
`system` fijo.

---

## Estructura de carpetas

```
src/
├── proxy.ts                   sesión de Supabase en /panel/* (Next 16: ya no "middleware.ts")
├── app/
│   ├── page.tsx               la landing pública
│   ├── entrevista/[token]/    la entrevista del cliente
│   ├── plan/[token]/          el plan entregado
│   ├── panel/                 el panel de la asesora
│   │   ├── login/, auth/callback/   acceso sin contraseña (enlace mágico)
│   │   └── (protegido)/       listado + ficha de cliente, requiere sesión + `asesores`
│   └── api/                   rutas de servidor
├── components/
├── lib/
│   ├── motor/                 ← MOTOR VERIFICADO. No tocar.
│   ├── diagnostico.ts         orquesta el motor sobre una ficha (Fase 7, 9)
│   ├── fichas.ts              ciclo de vida de la ficha (Fase 5-6)
│   ├── planes.ts              redacción del plan a partir de `analisis` (Fase 8)
│   ├── panel.ts                consultas del panel de la asesora, sujetas a RLS (Fase 9)
│   ├── supabase/              clientes de base de datos
│   └── claude/                prompts y definición de herramientas
└── types/

docs/
├── criterio/                  el criterio financiero heredado
└── (los 8 documentos del proyecto)

motor-python/                  motor original + baseline (oráculo de tests)
supabase/migrations/           esquema de base de datos
material-clase/                material didáctico
```

### `src/lib/motor/` es intocable

Es un port verificado del motor original de Python, con 95 tests que comprueban
cada cifra. Módulo **puro**: sin red, sin base de datos, sin modelo de
lenguaje. Entra una ficha, salen números.

- **No lo reescribas.** Si un agente propone «mejorarlo», la respuesta es no.
- **No dupliques sus valores.** Los supuestos de criterio viven solo en
  `src/lib/motor/supuestos.ts`.
- Si cambia una regla de `docs/criterio/reglas-recomendacion.md`, se cambia
  `supuestos.ts` y se regenera el baseline (`pnpm baseline`).

---

## Trampas conocidas del stack

Registradas porque ya nos costaron tiempo. Léelas antes de montar el proyecto.

### pnpm 11 bloquea los scripts de instalación

pnpm impide por defecto que los paquetes ejecuten scripts al instalarse —es una
protección real contra paquetes maliciosos— y **falla el `install` entero** si
encuentra alguno sin autorizar. Con Next.js pasa siempre: `eslint-config-next`
arrastra `unrs-resolver`, que compila un binario nativo.

El error es `ERR_PNPM_IGNORED_BUILDS`, y además envenena los comandos
siguientes: `pnpm test` vuelve a lanzar la comprobación de dependencias y
falla igual.

**Cuidado con la solución que vas a encontrar.** Casi toda la documentación
dice poner `onlyBuiltDependencies` en `package.json`. En pnpm 11 eso **ya no
funciona**. La forma correcta es `allowBuilds` en `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  unrs-resolver: true
```

Antes de poner nada a `true` ahí, comprueba de dónde viene el paquete.

**No es solo `unrs-resolver`.** En cuanto se instala Vitest, pnpm vuelve a
bloquear el install — esta vez por `esbuild` (dependencia transitiva de
`vite`, que usa Vitest por debajo). El error es el mismo
`ERR_PNPM_IGNORED_BUILDS`, y pnpm añade solo una línea de plantilla en
`pnpm-workspace.yaml` (`esbuild: set this to true or false`) que hay que
completar a mano tras comprobar el origen con `pnpm why esbuild`. Repite el
mismo patrón cada vez que se añade una dependencia nueva con binario nativo:
no des por hecho que con aprobar `unrs-resolver` una vez ya está resuelto para
siempre.

### `create-next-app` no instala en carpeta no vacía

Este repositorio llega con `docs/`, `src/lib/motor/`, `motor-python/` y
`supabase/`, así que `create-next-app` se niega a ejecutarse en la raíz.

Dos salidas: generar el andamiaje en una carpeta temporal y copiar los archivos
de configuración al repo, o crear el proyecto a mano. La primera es más rápida
y menos propensa a olvidos.

Y ojo con el nombre: `create-next-app` toma el nombre del paquete de la carpeta,
y `Clase-Agente-Financiero` no es un nombre válido de npm (mayúsculas). Hay que
fijarlo a mano en `package.json` como `clase-agente-financiero`.

### El motor necesita el baseline por ruta relativa

`src/lib/motor/motor.test.ts` lee `motor-python/baseline.json` con una ruta
relativa (`../../../motor-python/baseline.json`). Si mueves el motor de sitio,
esa ruta se rompe.

### Salida estructurada + `claude-sonnet-5` con poco `max_tokens` corta el JSON a mitad

`claude-sonnet-5` piensa por defecto (thinking adaptativo, no hay que activarlo)
y `max_tokens` cubre el pensamiento **y** la respuesta juntos. Con un
`max_tokens` ajustado al tamaño esperado del JSON de salida (se probó con
4096 para el plan de la Fase 8, `src/lib/planes.ts`), el modelo se queda sin
espacio a mitad de una cadena y `JSON.parse()` revienta con
`SyntaxError: Unterminated string in JSON`. No es un fallo del `json_schema`
de salida estructurada — es que la respuesta real nunca terminó de llegar.
Solución: dar bastante margen (se subió a 8192) y comprobar siempre
`response.stop_reason === 'max_tokens'` **antes** de parsear, para fallar
con un mensaje claro en vez de un `SyntaxError` críptico.

### Next.js 16 renombró `middleware.ts` a `proxy.ts`

`middleware.js` está deprecado en Next.js 16 — se llama ahora `proxy.js`
(`src/proxy.ts` en este proyecto), exporta una función `proxy` (o default) en
vez de `middleware`, y el resto del comportamiento (incluido `config.matcher`)
es idéntico. Se usa para refrescar la sesión de Supabase en `/panel/*`
(Fase 9). Si buscas "Next.js middleware Supabase" en cualquier tutorial vas a
encontrar el nombre viejo — la documentación instalada en
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
es la que manda aquí.

### Next.js 16 escribe su propio `AGENTS.md`

`next dev` genera y regenera un `AGENTS.md` en la raíz avisando de que esta
versión trae cambios respecto a lo que el modelo tiene memorizado. No lo
borres del diff: se vuelve a crear.

### El esquema de Supabase se aplica a mano, no por MCP

Configurar el MCP de Supabase requiere `claude mcp add` con comandos que
cambian según el sistema operativo, y es fácil que alguien se quede atascado en
la terminal por algo que no tiene nada que ver con el proyecto. Para ejecutar
una migración una sola vez no compensa.

La vía por defecto es pegar el SQL en el **SQL Editor** de supabase.com. Y el
agente **escribe ese SQL entero en el chat**, además de guardarlo en
`supabase/migrations/`: quien lo va a ejecutar no tiene por qué abrir archivos
para encontrarlo. Ver «Cambios en la base de datos» en `CLAUDE.md` y la Fase 2
de `docs/roadmap.md`.

---

## MCPs del proyecto

<!-- Se rellena al configurar servidores MCP, siguiendo el "Protocolo de MCPs"
     de CLAUDE.md: para qué se usa cada uno, con qué alcance y qué variables
     necesita. -->

Ninguno a nivel de proyecto (no hay `.mcp.json`). El usuario tiene el MCP de
Supabase conectado a **nivel de cuenta** (alcance `user`, fuera del repo), y
se ha usado en la Fase 2 exactamente para lo que el protocolo permite:
inspeccionar el proyecto (`list_tables`, `get_advisors`) y confirmar que el
esquema se aplicó bien tras pegarlo a mano en el SQL Editor. La aplicación del
esquema inicial se siguió haciendo deliberadamente **sin** MCP — ver «Trampas
conocidas del stack» arriba.

---

## Variables de entorno

Ver `.env.example`. Las que el sistema necesita:

| Variable | Para qué | Dónde vive |
|---|---|---|
| `ANTHROPIC_API_KEY` | Llamadas al modelo | Solo servidor |
| `NEXT_PUBLIC_SUPABASE_URL` | Proyecto de Supabase | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Escrituras del servidor, salta RLS | **Solo servidor.** Nunca con prefijo `NEXT_PUBLIC_`. |

El prefijo `NEXT_PUBLIC_` empaqueta la variable en el JavaScript del navegador.
Ponérselo a la clave de servicio equivale a publicar el acceso completo a la
base de datos.
