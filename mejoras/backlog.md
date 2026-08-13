# Backlog de mejoras

<!-- Ideas de mejora que no entran en el sprint actual pero que no queremos perder.
     No es un compromiso, es un repositorio de ideas.
     Añadir una entrada cada vez que surja una idea durante el desarrollo. -->

---

## Formato de entrada

```
### [MEJORA-XX] Título de la idea
**Área:** Frontend / Backend / UX / Infraestructura / Negocio
**Prioridad estimada:** Alta / Media / Baja
**Origen:** De dónde salió la idea (conversación, feedback de usuario, etc.)

Descripción breve de la mejora y por qué aportaría valor.
```

---

### [MEJORA-01] Invitación directa a un cliente concreto
**Área:** Backend / UX
**Prioridad estimada:** Baja
**Origen:** Descartado al pasar a entrada pública

Permitir que la asesora genere un enlace de entrevista para alguien con quien
ya está hablando, sin que esa persona pase por la landing. Era el diseño
inicial del producto y se descartó porque, como **único** camino de entrada,
hacía que la aplicación no sirviera de nada hasta tener un cliente. Como opción
secundaria sigue teniendo sentido.

### [MEJORA-02] Envío del plan por correo
**Área:** Backend
**Prioridad estimada:** Media
**Origen:** El correo ya se captura, pero hoy solo identifica al lead

Enviar al cliente su plan por correo al terminar, y avisar a la asesora cuando
entra un lead nuevo.

### [MEJORA-03] Verificación del correo
**Área:** Backend
**Prioridad estimada:** Baja
**Origen:** Riesgo de leads basura en el flujo público

Hoy el correo se acepta sin comprobar. Verificarlo mejoraría la calidad de los
leads, a cambio de meter fricción en mitad de una conversación que presume
justamente de no tenerla. Medir antes de decidir.

### [MEJORA-04] La entrevista no pregunta el tipo de meta explícitamente
**Área:** Backend / Criterio
**Prioridad estimada:** Media
**Origen:** Fase 7 (diagnóstico) — `src/lib/diagnostico.ts`

`docs/criterio/instrucciones-motor.md` §3 exige clasificar la meta como
patrimonio / renta de cartera / renta de negocio / mixta, pero
`docs/criterio/plantilla-entrevista.md` nunca se lo pregunta al cliente de
forma explícita — solo pide "qué te gustaría conseguir" en lenguaje libre.
El diagnóstico de la Fase 7 lo infiere por palabras clave en
`objetivoDescripcion` (`clasificarMeta()`), lo cual funciona para los casos
claros pero es frágil: una meta de renta descrita sin la palabra "mensual"
o "al mes" se clasificaría mal como patrimonio. Lo correcto es añadir una
pregunta explícita al bloque 1 de la plantilla ("¿esa cifra es lo que
quieres tener ahorrado, o una renta que te gustaría recibir cada mes?") y
una clave nueva en la ficha, en vez de inferirlo.

### [MEJORA-05] Provisiones para gastos irregulares, sin capturar
**Área:** Backend / Criterio
**Prioridad estimada:** Baja
**Origen:** Fase 7 — R2 exige saber si están cubiertas para poder llegar al
100 % del flujo libre en la aportación propuesta

La ficha no recoge si el cliente tiene aparte un colchón para gastos
irregulares (vacaciones, reparaciones...). `ejecutarDiagnostico()` asume
que no, por prudencia (R9), lo que baja el tope de aportación sostenible al
70-80 % del flujo libre incluso cuando el cliente sí las tiene cubiertas.
Añadir una pregunta a la plantilla (posiblemente en el bloque 7, junto al
colchón) evitaría infravalorar la capacidad de ahorro de estos clientes.
