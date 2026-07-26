/**
 * Lectura del estado del CRM a partir de la conversación.
 *
 * Por qué existe aparte del agente: el agente conversa (y su primera ronda va
 * con `tool_choice` forzado a `recomendar_seguro`, gate de gobernanza). Meterle
 * una tercera tool para "clasificar la fase" pelea con ese gate y además le
 * pide dos trabajos distintos al mismo turno. Acá se hace una segunda pasada
 * barata, con salida estructurada, que solo LEE: qué fase del funnel refleja la
 * conversación, y qué dijo la persona de su vida que no está en la base.
 *
 * Nunca lanza: si el proveedor falla, el turno sigue sin fase ni hechos nuevos
 * (el canal simplemente no mueve nada), igual que el resto del servicio.
 */
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import OpenAI from "openai";
import type { HistMsg } from "./identidad.ts";

const MODEL = process.env.CEREBRO_MODEL_LECTURA ?? "gpt-4o-mini";

/**
 * Las 5 fases que maneja el agente. "En suscripción" y "Póliza emitida" NO
 * están acá a propósito: son trabajo humano y el agente no las toca (el canal
 * también lo hace cumplir, ver `puedeMoverAgente` en app/src/lib/funnel.ts).
 */
export const FASES_AGENTE = [
  "Prospecto",
  "Análisis",
  "Cotización / negociación",
  "Cierre ganado",
  "Cierre perdido",
] as const;
export type FaseAgente = (typeof FASES_AGENTE)[number];

/** Un dato que la persona dio en la conversación (no viene de la base). */
export interface HechoCliente {
  /** kebab-case estable entre turnos: el mismo hecho conserva su id. */
  id: string;
  /** Nombre corto del dato ("Mascota", "Dependientes"). */
  etiqueta: string;
  /** El dato en sí, en las palabras de la persona ("un perro", "2 hijos"). */
  valor: string;
  icono?: string;
}

export interface LecturaTurno {
  fase: FaseAgente | null;
  hechos: HechoCliente[];
}

const VACIO: LecturaTurno = { fase: null, hechos: [] };

const INSTRUCCIONES = `Lees una conversación entre un asesor de seguros de Colsubsidio y una persona, y
devuelves el estado del CRM. No le hablas a nadie: solo observas y clasificas.

# La fase del funnel

Estas son las 5 fases que maneja el agente, en orden. Elige la que refleja dónde está HOY la
conversación, después del último mensaje.

- "Prospecto": la persona acaba de llegar. Saluda, se está identificando (número de serie), o
  apenas arrancó el discovery. Todavía no hay un tipo de seguro claro sobre la mesa.
- "Análisis": ya se entiende qué necesita. Hay un tipo de seguro identificado (vida, salud, hogar,
  vehículo, mascotas), o la persona declaró una necesidad concreta, pero todavía no se le ha
  mostrado ningún producto, plan ni precio.
- "Cotización / negociación": ya se le mostró algo concreto (un producto con nombre, coberturas,
  un precio, una comparación), o está objetando/preguntando/regateando sobre eso. Toda objeción
  ("está caro", "ya tengo EPS", "lo pienso") sobre un producto ya mostrado es esta fase.
- "Cierre ganado": aceptó explícitamente. Dijo que sí quiere ese seguro y aceptó que un asesor lo
  contacte para terminar. Se necesita una aceptación clara, no un "suena bien" ni un "interesante".
- "Cierre perdido": rechazó de forma clara y definitiva. Dijo que no le interesa, que no va a
  seguir, que no lo quiere, o pidió que no lo contacten más. Un "lo pienso y te aviso" NO es cierre
  perdido, eso sigue siendo negociación.

Reglas duras:
- La fase solo AVANZA. Si la conversación no muestra evidencia clara de haber avanzado desde la
  fase actual, devuelves la fase actual tal cual. Ante la duda, no avanzas.
- La única excepción es "Cierre perdido", que se puede alcanzar desde cualquier fase abierta.
- Nunca devuelves una fase anterior a la actual.
- Que el asesor haya hecho una pregunta o mencionado algo no avanza la fase: lo que la mueve es lo
  que la PERSONA dijo o vio.

# Los hechos de la persona

Sacas los datos que la persona contó de su vida DURANTE esta conversación. Esto es lo que la base
de afiliados no sabe: que tiene un perro, que su mamá depende de él, que trabaja en moto, que
arrienda, que es independiente, que viaja cada mes.

- Solo lo que la persona dijo con sus palabras. Nunca inventas ni infieres. Si dijo "vivo con mi
  pareja", el hecho es que vive con su pareja, no que "tiene dependientes".
- Nunca sacas hechos de lo que dijo el ASESOR, solo de lo que dijo la persona.
- No repites datos que ya vienen de la base (edad, ciudad, salario, categoría): esos ya están.
- Si un hecho ya venía de un turno anterior y la persona no lo desmintió, lo devuelves otra vez con
  el mismo id. La lista que devuelves es la lista COMPLETA, no solo lo nuevo.
- Si la persona corrige un dato anterior, devuelves el mismo id con el valor corregido.
- \`etiqueta\`: máximo 16 caracteres, sustantivo corto y neutro ("Mascota", "Dependientes",
  "Vivienda", "Trabajo", "Vehículo", "Salud", "Viajes").
- \`valor\`: máximo 28 caracteres, concreto ("un perro", "2 hijos pequeños", "arrendada",
  "independiente"). Se pinta como chip en pantalla, así que tiene que ser corto de verdad.
- \`icono\`: un solo emoji que represente el hecho.
- Si la persona no ha contado nada personal todavía, devuelves la lista vacía. Es normal al inicio.`;

const ESQUEMA = {
  type: "object",
  properties: {
    fase: { type: "string", enum: [...FASES_AGENTE] },
    razon_fase: {
      type: "string",
      description: "Una frase corta: qué en la conversación justifica esa fase.",
    },
    hechos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          etiqueta: { type: "string" },
          valor: { type: "string" },
          icono: { type: "string" },
        },
        required: ["id", "etiqueta", "valor", "icono"],
        additionalProperties: false,
      },
    },
  },
  required: ["fase", "razon_fase", "hechos"],
  additionalProperties: false,
} as const;

export interface LecturaInput {
  historial: HistMsg[];
  /** El mensaje que el agente acaba de producir en este turno (aún no está en el historial). */
  respuestaAgente: string;
  faseActual: string | null;
  /** Hechos ya guardados de turnos anteriores, para que los conserve y no rebote la lista. */
  hechosPrevios: HechoCliente[];
}

export async function leerEstado(input: LecturaInput): Promise<LecturaTurno> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return VACIO;

  const transcripcion = [
    ...input.historial.map((m) => `${m.rol === "cliente" ? "PERSONA" : "ASESOR"}: ${m.texto}`),
    `ASESOR: ${input.respuestaAgente}`,
  ].join("\n");

  const contexto = [
    `FASE ACTUAL DEL LEAD: ${input.faseActual ?? "Prospecto"}`,
    `HECHOS YA GUARDADOS: ${
      input.hechosPrevios.length > 0 ? JSON.stringify(input.hechosPrevios) : "(ninguno)"
    }`,
    "",
    "CONVERSACIÓN:",
    transcripcion,
  ].join("\n");

  try {
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: INSTRUCCIONES },
        { role: "user", content: contexto },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "estado_crm", strict: true, schema: ESQUEMA },
      },
    });
    const crudo = resp.choices[0]?.message?.content;
    if (!crudo) return VACIO;
    const json = JSON.parse(crudo) as { fase?: string; hechos?: HechoCliente[] };
    return {
      fase: (FASES_AGENTE as readonly string[]).includes(json.fase ?? "")
        ? (json.fase as FaseAgente)
        : null,
      hechos: normalizarHechos(json.hechos),
    };
  } catch (err) {
    console.error(`[cerebro] lectura de estado falló: ${err instanceof Error ? err.message : err}`);
    return VACIO;
  }
}

/** Sanea lo que devuelve el modelo: sin vacíos, sin duplicados, con tope de largo. */
function normalizarHechos(hechos: HechoCliente[] | undefined): HechoCliente[] {
  if (!Array.isArray(hechos)) return [];
  const vistos = new Map<string, HechoCliente>();
  for (const h of hechos) {
    const id = typeof h?.id === "string" ? h.id.trim().toLowerCase() : "";
    const etiqueta = typeof h?.etiqueta === "string" ? h.etiqueta.trim() : "";
    const valor = typeof h?.valor === "string" ? h.valor.trim() : "";
    if (!id || !etiqueta || !valor) continue;
    vistos.set(id, {
      id,
      etiqueta: etiqueta.slice(0, 16),
      valor: valor.slice(0, 28),
      icono: typeof h.icono === "string" && h.icono.trim() ? h.icono.trim() : undefined,
    });
  }
  return [...vistos.values()].slice(0, 8);
}

/**
 * Une los hechos previos con los del turno: el turno manda (puede corregir un
 * valor), pero nada se pierde si el modelo se olvidó de repetir uno.
 */
export function fusionarHechos(
  previos: HechoCliente[],
  nuevos: HechoCliente[]
): HechoCliente[] {
  const mapa = new Map<string, HechoCliente>();
  for (const h of previos) mapa.set(h.id, h);
  for (const h of nuevos) mapa.set(h.id, h);
  return [...mapa.values()].slice(0, 8);
}

/**
 * La más avanzada de dos fases (null = sin opinión). "Cierre perdido" es la
 * última del orden, así que un rechazo siempre gana sobre el piso de las tools.
 */
export function faseMasAvanzada(
  a: FaseAgente | null,
  b: FaseAgente | null
): FaseAgente | null {
  if (!a) return b;
  if (!b) return a;
  return FASES_AGENTE.indexOf(a) >= FASES_AGENTE.indexOf(b) ? a : b;
}

/** Lee los hechos que el canal nos devolvió dentro de `perfil` (round-trip). */
export function hechosDePerfil(perfil: unknown): HechoCliente[] {
  if (!perfil || typeof perfil !== "object") return [];
  const raw = (perfil as Record<string, unknown>).hechos;
  return normalizarHechos(raw as HechoCliente[] | undefined);
}

/** Parte del self-check que no necesita proveedor: saneo, fusión y orden. */
function demoOffline(): void {
  // Saneo: se cae lo incompleto, se deduplica por id, se recortan los largos.
  const saneados = normalizarHechos([
    { id: "  Mascota  ", etiqueta: "Mascota", valor: "un perro" },
    { id: "mascota", etiqueta: "Mascota", valor: "un perro viejo" },
    { id: "vacio", etiqueta: "", valor: "algo" },
    { id: "", etiqueta: "Trabajo", valor: "independiente" },
    { id: "largo", etiqueta: "E".repeat(40), valor: "V".repeat(60) },
  ] as HechoCliente[]);
  assert.equal(saneados.length, 2, `saneo: ${JSON.stringify(saneados)}`);
  assert.equal(saneados[0]!.valor, "un perro viejo", "el último gana en un id repetido");
  assert.equal(saneados[1]!.etiqueta.length, 16, "etiqueta recortada a 16");
  assert.equal(saneados[1]!.valor.length, 28, "valor recortado a 28");

  // Fusión: nada se pierde si el modelo olvidó repetir un hecho previo.
  const fusion = fusionarHechos(
    [
      { id: "mascota", etiqueta: "Mascota", valor: "un perro" },
      { id: "trabajo", etiqueta: "Trabajo", valor: "empleado" },
    ],
    [{ id: "trabajo", etiqueta: "Trabajo", valor: "independiente" }]
  );
  assert.equal(fusion.length, 2, "fusión conserva el hecho que no volvió");
  assert.equal(
    fusion.find((h) => h.id === "trabajo")!.valor,
    "independiente",
    "fusión deja que el turno corrija un valor previo"
  );

  // Round-trip: los hechos vuelven dentro del `perfil` que manda el canal.
  assert.equal(hechosDePerfil(null).length, 0);
  assert.equal(hechosDePerfil({ serie: 259 }).length, 0);
  assert.equal(hechosDePerfil({ hechos: [{ id: "a", etiqueta: "A", valor: "b" }] }).length, 1);

  // Orden de fases: el piso de las tools nunca pisa un rechazo.
  assert.equal(faseMasAvanzada("Análisis", "Cotización / negociación"), "Cotización / negociación");
  assert.equal(faseMasAvanzada("Cierre perdido", "Cotización / negociación"), "Cierre perdido");
  assert.equal(faseMasAvanzada(null, "Análisis"), "Análisis");
  assert.equal(faseMasAvanzada("Análisis", null), "Análisis");
  assert.equal(faseMasAvanzada(null, null), null);

  console.log("offline OK - saneo, fusión, round-trip y orden de fases");
}

/**
 * Self-check contra el LLM real: la única forma de probar que la clasificación
 * de fase y la extracción de hechos funcionan de verdad. Requiere OPENAI_API_KEY.
 */
async function demoLLM(): Promise<void> {
  // Caso A: discovery temprano, la persona ya soltó dos hechos personales. No
  // se le ha mostrado producto: no puede pasar de "Análisis".
  const a = await leerEstado({
    historial: [
      { rol: "cliente", texto: "hola, quiero ver qué seguro me sirve" },
      { rol: "bot", texto: "para entender bien tu situación, ¿quién depende económicamente de ti hoy?" },
      { rol: "cliente", texto: "mi mamá depende de mí, y tengo un perro que es como de la familia" },
    ],
    respuestaAgente: "entiendo, entonces proteger ese ingreso es lo que más pesa hoy, ¿cierto?",
    faseActual: "Prospecto",
    hechosPrevios: [],
  });
  assert.ok(
    a.fase === "Análisis" || a.fase === "Prospecto",
    `Caso A: sin producto mostrado no puede pasar de Análisis, llegó "${a.fase}"`
  );
  const ids = a.hechos.map((h) => h.id).join(",");
  assert.ok(a.hechos.length >= 2, `Caso A: debía extraer mamá + perro, llegó: ${JSON.stringify(a.hechos)}`);
  assert.ok(/perr|mascot/.test(ids + JSON.stringify(a.hechos)), `Caso A: falta el hecho de la mascota: ${ids}`);
  console.log(`Caso A OK - fase=${a.fase}, hechos=${JSON.stringify(a.hechos)}`);

  // Caso B: aceptación explícita después de ver un producto → Cierre ganado.
  const b = await leerEstado({
    historial: [
      { rol: "cliente", texto: "mi mamá depende de mí" },
      { rol: "bot", texto: "el plan Vida Tranquila arranca en $23.000 pesos al mes y cubre el ingreso de tu mamá si te llega a faltar" },
      { rol: "cliente", texto: "sí, lo quiero, pásame con el asesor para cerrarlo" },
    ],
    respuestaAgente: "perfecto, voy a pasarle esto a uno de nuestros agentes para que te contacte",
    faseActual: "Cotización / negociación",
    hechosPrevios: [{ id: "dependientes", etiqueta: "Dependientes", valor: "su mamá", icono: "👩" }],
  });
  assert.equal(b.fase, "Cierre ganado", `Caso B: aceptación explícita debía dar Cierre ganado, llegó "${b.fase}"`);
  assert.ok(
    b.hechos.some((h) => h.id === "dependientes"),
    `Caso B: debía conservar el hecho previo, llegó: ${JSON.stringify(b.hechos)}`
  );
  console.log(`Caso B OK - fase=${b.fase}, hechos=${JSON.stringify(b.hechos)}`);

  // Caso C: objeción tras ver producto. NO es cierre perdido y NO retrocede.
  const c = await leerEstado({
    historial: [
      { rol: "bot", texto: "el plan arranca en $23.000 pesos al mes" },
      { rol: "cliente", texto: "uf, está caro, déjame pensarlo y te aviso" },
    ],
    respuestaAgente: "claro, tómate tu tiempo, ¿con qué lo estás comparando?",
    faseActual: "Cotización / negociación",
    hechosPrevios: [],
  });
  assert.equal(
    c.fase,
    "Cotización / negociación",
    `Caso C: "lo pienso" no es cierre perdido ni retroceso, llegó "${c.fase}"`
  );
  console.log(`Caso C OK - fase=${c.fase} (objeción no mueve el lead)`);

  // Caso D: rechazo definitivo → Cierre perdido.
  const d = await leerEstado({
    historial: [
      { rol: "bot", texto: "el plan arranca en $23.000 pesos al mes" },
      { rol: "cliente", texto: "no, no me interesa nada de esto, no me vuelvan a escribir" },
    ],
    respuestaAgente: "entendido, gracias por tu tiempo",
    faseActual: "Cotización / negociación",
    hechosPrevios: [],
  });
  assert.equal(d.fase, "Cierre perdido", `Caso D: rechazo definitivo debía dar Cierre perdido, llegó "${d.fase}"`);
  console.log(`Caso D OK - fase=${d.fase}`);

  console.log("demo OK - estado.ts: fases del CRM y hechos en tiempo real verificados contra el LLM real");
}

async function demo(): Promise<void> {
  demoOffline();
  if (!process.env.OPENAI_API_KEY) {
    // Sin proveedor no se puede probar la clasificación real. Se verifica al
    // menos que la degradación sea limpia (nunca lanza, nunca inventa fase).
    const vacio = await leerEstado({
      historial: [{ rol: "cliente", texto: "hola" }],
      respuestaAgente: "hola",
      faseActual: "Prospecto",
      hechosPrevios: [],
    });
    assert.deepEqual(vacio, VACIO, "sin OPENAI_API_KEY debe degradar a vacío, no lanzar");
    console.log("degradación OK - sin OPENAI_API_KEY: ni fase ni hechos, sin excepción");
    console.log(
      "\nFALTA la parte contra el LLM real (fases y extracción de hechos): exporta OPENAI_API_KEY y vuelve a correr `pnpm check:estado`."
    );
    return;
  }
  await demoLLM();
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {
  void demo();
}
