import type Anthropic from '@anthropic-ai/sdk';
import { CLAVES_FICHA } from '@/lib/fichas';

/**
 * Herramientas disponibles para el modelo entrevistador.
 *
 * Fase 5: además de `crear_cliente` (Fase 4), `guardar_dato` (captura
 * estructurada de los 8 bloques, turno a turno) y `agregar_pendiente` (notas
 * sueltas que no encajan en las 14 claves — p. ej. "falta el saldo de la
 * hipoteca").
 */
export const HERRAMIENTAS_ENTREVISTA: Anthropic.Tool[] = [
  {
    name: 'crear_cliente',
    description:
      'Registra al cliente en cuanto tengas su nombre Y su correo electrónico, antes de seguir con los 8 bloques. Llámala una sola vez por entrevista.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: {
          type: 'string',
          description: 'Nombre tal como lo ha dado el cliente.',
        },
        email: {
          type: 'string',
          description: 'Correo electrónico del cliente.',
        },
      },
      required: ['nombre', 'email'],
    },
  },
  {
    name: 'guardar_dato',
    description: `Guarda o corrige un dato de la ficha financiera del cliente, en cuanto lo captures — no esperes a terminar el bloque ni a que acabe la entrevista. Una llamada por dato.

Claves disponibles y qué va en "valor":
- objetivoDescripcion (string): la meta en sus propias palabras.
- objetivoCifra (number): cifra objetivo en euros.
- objetivoPlazo (number): plazo en años.
- ingresosNetosMes (number): ingresos netos mensuales en euros.
- ingresosEstabilidad ("fijos" | "variables").
- gastoTotalMes (number): gasto mensual total en euros.
- aportacionMensualActual (number): lo que ya aparta o invierte al mes, en euros (0 es una respuesta válida).
- patrimonioTotal (number): patrimonio invertible total en euros.
- patrimonioDistribucion (string): dónde está — cuenta, fondos, cripto... — en una frase.
- deudas (objeto): exactamente una de estas cuatro formas —
  {"tipo":"lista","deudas":[{"tipo":"hipoteca","saldo":null,"cuota":620,"interes":1.9}]} (saldo puede ser null si no lo dio el cliente — nunca lo inventes),
  {"tipo":"ninguna"} (el cliente confirma que no tiene deudas),
  {"tipo":"pendiente","motivo":"negativa_cliente"} (se negó a hablar del tema tras el aviso — protocolo especial del bloque 6),
  {"tipo":"solo_flag","hayInteresAlto":true} o {"tipo":"solo_flag","hayInteresAlto":false} (solo confirmó si hay algún interés alto, sin más detalle).
- colchonMeses (number): meses de colchón.
- riesgoExperiencia (string): qué hizo en una caída real (o que no ha invertido antes), en una frase.
- riesgoEscenario ("vender" | "aguantar" | "comprar").
- riesgoPerfilDerivado ("conservador" | "moderado" | "dinamico"): tu conclusión — lo que HIZO en una caída real prevalece sobre lo que dice que haría.

"etiqueta" — decide si el informe sale completo, condicionado o suspendido, así que ponla con cuidado:
- "confirmado": el cliente lo dijo con claridad, sin que tú ofrecieras rangos.
- "estimado": salió de un rango que le ofreciste tú, o de una aproximación ("unos 2.000", "por encima de 10.000").
- "pendiente": se preguntó, hubo un rebote, y sigue sin haber un dato claro.

"cita": las palabras textuales del cliente que respaldan el valor — para que se pueda rastrear después de dónde salió.
"supuesto": solo si el cliente dio un rango y aplicaste el extremo prudente (p. ej. "rango 4-5 meses, se usa 4 por prudencia").`,
    input_schema: {
      type: 'object',
      properties: {
        clave: { type: 'string', enum: [...CLAVES_FICHA] },
        valor: {
          description:
            'El valor a guardar, con la forma que le corresponde a esa clave (ver descripción de la herramienta). Nunca null salvo para un campo de la lista de deudas que el cliente no dio.',
        },
        etiqueta: {
          type: 'string',
          enum: ['confirmado', 'estimado', 'pendiente'],
        },
        cita: { type: 'string' },
        supuesto: { type: 'string' },
      },
      required: ['clave', 'valor', 'etiqueta'],
    },
  },
  {
    name: 'agregar_pendiente',
    description:
      'Añade una nota a la lista de "pendientes para la reunión": un matiz que falta y que no encaja en ninguna de las 14 claves de guardar_dato — por ejemplo, "no se conoce el saldo pendiente de la hipoteca" cuando el cliente dio cuota e interés pero no el saldo. No la uses para los datos principales, esos van con guardar_dato.',
    input_schema: {
      type: 'object',
      properties: {
        texto: {
          type: 'string',
          description: 'La nota, en una frase clara y concreta.',
        },
      },
      required: ['texto'],
    },
  },
];
