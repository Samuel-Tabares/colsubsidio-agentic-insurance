/**
 * El turno del agente: arma el prompt (system + perfil + historial), le da al
 * modelo dos tools reales (recomendar_seguro, buscar_producto) y deja que decida
 * cuándo llamarlas — así lo asume SYSTEM-PROMPT.md ("Llamas a recomendar_seguro en
 * cuanto tengas..."). Sin esto el agente tendría que decidir la familia por su
 * cuenta, que es justo lo que el proyecto prohíbe (ver GOBERNANZA.md, System 2).
 */
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import OpenAI from "openai";
import type { AfiliadoRaw } from "./perfil.ts";
import { recomendar, type Perfil } from "./recomendar.ts";
import { matchCatalogo } from "./catalogo.ts";
import { SYSTEM_PROMPT_BASE } from "./systemPrompt.ts";
import { resolverSerie, type HistMsg } from "./identidad.ts";

const MODEL = process.env.CEREBRO_MODEL ?? "gpt-4o-mini";
const MAX_TOOL_ROUNDS = 4;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "recomendar_seguro",
      description:
        "Decide la familia de seguro (vida/salud, hogar, vehículos, mascotas, deudores) según reglas reales de la base de afiliados. Llámala en cuanto tengas la respuesta a la pregunta de discovery que abrió la familia ganadora. Sin argumentos: usa el perfil ya cargado de la conversación.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_producto",
      description:
        "Búsqueda semántica de productos reales del catálogo, dentro de la familia que ya decidió recomendar_seguro. Nunca la llames antes de tener una familia.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Lo que la persona busca, en sus palabras (ej. 'seguro para mi moto de trabajo')." },
          familia: {
            type: "string",
            enum: ["familiares", "hogar", "vehiculos", "mascotas", "deudores-financieros"],
            description: "Familia ganadora devuelta por recomendar_seguro.",
          },
        },
        required: ["query", "familia"],
      },
    },
  },
];

function bloquePerfil(afiliado: AfiliadoRaw | null): string {
  if (!afiliado) return "PERFIL: no resuelto todavía (sin serie confirmada en esta conversación).";
  return [
    "PERFIL (ya resuelto): identidad confirmada. NUNCA preguntes el número de serie, ni siquiera en el primer mensaje de la conversación.",
    JSON.stringify(
      {
        rango_edad: afiliado.rango_edad,
        rango_salarial: afiliado.rango_salarial,
        ciudad_afiliado: afiliado.ciudad_afiliado,
        drogueria: afiliado.drogueria,
        vivienda: afiliado.vivienda,
      },
      null,
      2
    ),
  ].join("\n");
}

function aPerfilDeReglas(afiliado: AfiliadoRaw): Perfil {
  return { ...afiliado };
}

/**
 * Dónde va la conversación dentro del funnel, y qué se espera del agente ahí.
 * Sin esto el agente trata todos los turnos igual: vuelve a hacer discovery a
 * alguien que ya está negociando, o sigue vendiendo a alguien que ya aceptó.
 * La fase la clasifica lib/estado.ts; acá solo se le dice al agente en cuál
 * está para que se comporte en consecuencia.
 */
const GUIA_FASE: Record<string, string> = {
  Prospecto:
    "La persona acaba de llegar. Tu trabajo ahora es abrir y hacer discovery, una pregunta por turno. No menciones productos ni precios todavía.",
  Análisis:
    "Ya se entiende qué necesita. Termina de confirmar lo que más le importa proteger y pide permiso antes de entrar al detalle del producto. Todavía no sueltes precio sin que lo confirme.",
  "Cotización / negociación":
    "Ya vio algo concreto. Tu trabajo es resolver dudas y objeciones con la estructura 3A, no repetir el discovery ni volver a preguntar cosas que ya te contó.",
  "Cierre ganado":
    "Ya aceptó. No vuelvas a vender ni ofrezcas más productos. Confirma el resumen de lo acordado y que un asesor humano lo contacta.",
  "Cierre perdido":
    "Dijo que no. Respétalo: no insistas, no reencuadres, no ofrezcas alternativas. Agradece y deja la puerta abierta en una sola frase corta.",
};

function bloqueFase(fase: string | null): string {
  if (!fase) return "";
  const guia = GUIA_FASE[fase];
  if (!guia) return "";
  return `FASE ACTUAL DE ESTA CONVERSACIÓN: ${fase}\n${guia}`;
}

/**
 * Lo que la persona ha contado de su vida en la conversación (mascota,
 * dependientes, trabajo). Va aparte del PERFIL porque es de otra fuente: el
 * perfil es la base de afiliados, esto es lo que dijo en vivo. Se le repite
 * explícito para que nunca vuelva a preguntar algo que ya le contaron.
 */
function bloqueHechos(hechos: HechoConocido[]): string {
  if (hechos.length === 0) return "";
  return [
    "LO QUE ESTA PERSONA YA TE CONTÓ (no lo vuelvas a preguntar, dalo por sabido):",
    ...hechos.map((h) => `- ${h.etiqueta}: ${h.valor}`),
  ].join("\n");
}

export interface HechoConocido {
  etiqueta: string;
  valor: string;
}

export interface TurnoInput {
  perfil: AfiliadoRaw | null;
  historial: HistMsg[];
  canal: "whatsapp" | "web";
  /** Etapa del funnel donde está el lead (nombre exacto). */
  faseActual?: string | null;
  /** Datos que la persona dio en turnos anteriores, ya persistidos por el canal. */
  hechos?: HechoConocido[];
}

export interface TurnoResultado {
  texto: string;
  /** Nombres de tools invocadas en este turno, en orden. Útil para logs y para
   * el self-check (verificar que el agente sí usó recomendar_seguro y no
   * decidió la familia por su cuenta). */
  toolsUsed: string[];
  /** Tool + resultado crudo, para asertar contenido real (ej. que buscar_producto
   * trajo productos de verdad, no vacío). */
  toolResults: { nombre: string; resultado: unknown }[];
  /** Modelo real reportado por OpenAI y tokens consumidos (suma de todas las
   * rondas del loop) — prueba dura de que hubo una llamada de red real,
   * no un fixture. */
  modelo: string | null;
  tokensTotal: number;
}

function openaiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

const PREGUNTA_SERIE =
  "Para ver tu situación real necesito tu número de serie de afiliado, ¿lo tienes a la mano?";

export async function decidirTurno(input: TurnoInput): Promise<TurnoResultado> {
  // Turno 1 sin perfil resuelto: pregunta de identidad determinista, no
  // depende de que el LLM siga la instrucción al pie de la letra. Hallazgo
  // real probando el flujo (ronda de dojo, gpt-4o-mini): ~1 de cada 3 veces
  // se saltaba la pregunta e iba directo al micro-tutor pese a la
  // instrucción explícita del prompt. Turnos siguientes sin perfil sí pasan
  // por el LLM (la regla de "nunca insistir dos veces" necesita criterio).
  if (!input.perfil && input.historial.length <= 1) {
    return { texto: PREGUNTA_SERIE, toolsUsed: [], toolResults: [], modelo: null, tokensTotal: 0 };
  }

  const client = openaiClient();

  const system = [
    SYSTEM_PROMPT_BASE,
    bloquePerfil(input.perfil),
    bloqueHechos(input.hechos ?? []),
    bloqueFase(input.faseActual ?? null),
    `CANAL: ${input.canal}`,
  ]
    .filter((b) => b !== "")
    .join("\n\n");

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...input.historial.map(
      (m): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
        role: m.rol === "cliente" ? "user" : "assistant",
        content: m.texto,
      })
    ),
  ];

  const toolsUsed: string[] = [];
  const toolResults: { nombre: string; resultado: unknown }[] = [];
  let modelo: string | null = null;
  let tokensTotal = 0;

  // Gate de gobernanza (GOBERNANZA.md, "System 2 by design"): la FAMILIA la
  // deciden las reglas de `reglas.json`, nunca la intuición del modelo.
  // Con perfil resuelto y al menos una respuesta de discovery, se FUERZA la
  // llamada a `recomendar_seguro` en la primera ronda en vez de confiar en
  // que el modelo la invoque. Hallazgo real probando el flujo: gpt-4o-mini
  // narró "creo que un seguro de vida es lo que más te podría interesar" sin
  // llamar la tool — exactamente la violación que el brief marca como línea
  // roja. Forzarla es seguro: si ninguna regla dispara, `recomendar()`
  // devuelve null y el agente sigue en discovery (comportamiento correcto).
  const respuestasCliente = input.historial.filter((m) => m.rol === "cliente").length;
  const forzarRecomendar = !!input.perfil && respuestasCliente >= 2;

  for (let ronda = 0; ronda < MAX_TOOL_ROUNDS; ronda++) {
    const debeForzar = ronda === 0 && forzarRecomendar;
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: debeForzar
        ? { type: "function", function: { name: "recomendar_seguro" } }
        : "auto",
    });
    modelo = resp.model;
    tokensTotal += resp.usage?.total_tokens ?? 0;
    const choice = resp.choices[0];
    const msg = choice.message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return {
        texto: msg.content?.trim() || "Dame un segundo, estoy verificando esto con calma.",
        toolsUsed,
        toolResults,
        modelo,
        tokensTotal,
      };
    }

    messages.push(msg);

    for (const call of msg.tool_calls) {
      toolsUsed.push(call.function.name);
      const resultado = await ejecutarTool(call, input.perfil);
      toolResults.push({ nombre: call.function.name, resultado });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(resultado),
      });
    }
  }

  // Se agotaron las rondas de tools sin una respuesta final: no se inventa nada,
  // se degrada a escalamiento (igual que un fallo de proveedor).
  return {
    texto: "Dame un segundo, te conecto con un asesor para seguir con esto.",
    toolsUsed,
    toolResults,
    modelo,
    tokensTotal,
  };
}

async function ejecutarTool(
  call: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  perfil: AfiliadoRaw | null
): Promise<unknown> {
  if (call.function.name === "recomendar_seguro") {
    if (!perfil) return { error: "sin_perfil", detalle: "no hay serie resuelta en esta conversación" };
    return recomendar(aPerfilDeReglas(perfil)) ?? { sin_recomendacion: true };
  }
  if (call.function.name === "buscar_producto") {
    const args = JSON.parse(call.function.arguments) as { query: string; familia: string };
    const productos = await matchCatalogo(args.query, args.familia, 3);
    return { productos };
  }
  return { error: "tool_desconocida", nombre: call.function.name };
}

/**
 * Self-check contra el LLM real (no mock: la única forma de probar que el
 * tool-calling funciona de verdad). Requiere OPENAI_API_KEY y SUPABASE_* reales.
 */
async function demo(): Promise<void> {
  // Caso A: serie 259 real (drogueria=SI), discovery ya respondido para la
  // pregunta que abre "familiares". El agente debe llamar recomendar_seguro.
  const historialA: HistMsg[] = [
    { rol: "cliente", texto: "hola quiero ver qué seguro me conviene" },
    { rol: "bot", texto: "para ver tu situación real necesito tu número de serie de afiliado, ¿lo tienes a la mano?" },
    { rol: "cliente", texto: "259" },
    { rol: "bot", texto: "para entender bien tu situación, ¿quién depende económicamente de ti hoy?" },
    { rol: "cliente", texto: "tengo dos hijos pequeños que dependen completamente de mí" },
  ];
  const perfilA = await resolverSerie(historialA);
  assert.ok(perfilA, "self-check requiere que la serie 259 exista en Supabase");

  const resultadoA = await decidirTurno({ perfil: perfilA, historial: historialA, canal: "web" });
  assert.ok(
    resultadoA.toolsUsed.includes("recomendar_seguro"),
    `Caso A: el agente debía llamar recomendar_seguro con discovery ya respondido. toolsUsed=${JSON.stringify(resultadoA.toolsUsed)}, texto="${resultadoA.texto}"`
  );
  // Prueba dura de que hubo una llamada de red real a OpenAI, no un fixture.
  // OpenAI devuelve el snapshot resuelto (ej. "gpt-4o-mini-2024-07-18"), no el
  // alias pedido — el startsWith es justo esa evidencia, no una relajación.
  assert.ok(
    resultadoA.modelo?.startsWith(MODEL),
    `Caso A: se esperaba un modelo que empiece con ${MODEL}, llegó ${resultadoA.modelo}`
  );
  assert.ok(resultadoA.tokensTotal > 0, "Caso A: tokensTotal debería ser > 0 si hubo una llamada real");
  console.log(
    `Caso A OK - recomendar_seguro llamada, tools: ${JSON.stringify(resultadoA.toolsUsed)}, modelo: ${resultadoA.modelo}, tokens: ${resultadoA.tokensTotal}`
  );

  // Caso B: sin serie resuelta (perfil vacío). El agente no debe inventar
  // datos de un afiliado que no existe, ni llamar recomendar_seguro sin perfil.
  const historialB: HistMsg[] = [{ rol: "cliente", texto: "hola, quiero saber de seguros" }];
  const perfilB = await resolverSerie(historialB);
  assert.equal(perfilB, null, "self-check: este historial no debe resolver ninguna serie");

  const resultadoB = await decidirTurno({ perfil: perfilB, historial: historialB, canal: "web" });
  // Turno 1 sin perfil es determinista (no llama al LLM, ver decidirTurno) —
  // por eso se puede asertar el texto exacto, no solo "no inventó nada".
  assert.equal(resultadoB.texto, PREGUNTA_SERIE, `Caso B: turno 1 sin perfil debía ser la pregunta determinista de serie. texto="${resultadoB.texto}"`);
  assert.equal(resultadoB.tokensTotal, 0, "Caso B: turno determinista no debería llamar a OpenAI");
  console.log("Caso B OK - sin perfil, turno 1 determinista (sin llamar a OpenAI):", resultadoB.texto);

  // Caso C: continúa la conversación del Caso A ya con familia decidida
  // ("familiares") y pide ver opciones concretas. El agente debe llamar
  // buscar_producto (RAG) y traer productos reales del catálogo, nunca
  // inventar nombres/coberturas.
  // Frase explícita a propósito: el prompt exige pedir permiso antes de dar
  // detalle ("¿te parece si vemos cómo se vería esto en tu caso?"), así que un
  // "cuéntame las opciones" ambiguo puede recibir de vuelta esa misma pregunta
  // guiada en vez de invocar la tool. Un "sí" explícito + pedido de detalle
  // concreto en el mismo mensaje sí cumple la condición del prompt ("si dice
  // que sí, das el detalle").
  const historialC: HistMsg[] = [
    ...historialA,
    { rol: "bot", texto: resultadoA.texto },
    {
      rol: "cliente",
      texto: "sí, se ajusta a lo que busco, cuéntame el producto específico y qué cubre exactamente",
    },
  ];
  const resultadoC = await decidirTurno({ perfil: perfilA, historial: historialC, canal: "web" });
  assert.ok(
    resultadoC.toolsUsed.includes("buscar_producto"),
    `Caso C: el agente debía llamar buscar_producto al pedir opciones concretas. toolsUsed=${JSON.stringify(resultadoC.toolsUsed)}, texto="${resultadoC.texto}"`
  );
  const llamadaBuscarProducto = resultadoC.toolResults.find((t) => t.nombre === "buscar_producto");
  assert.ok(llamadaBuscarProducto, "Caso C: no se encontró el resultado de buscar_producto");
  const productos = (llamadaBuscarProducto!.resultado as { productos?: unknown[] }).productos;
  assert.ok(
    Array.isArray(productos) && productos.length > 0,
    `Caso C: buscar_producto debía devolver productos reales del catálogo, llegó: ${JSON.stringify(llamadaBuscarProducto!.resultado)}`
  );
  console.log(
    `Caso C OK - buscar_producto llamada, ${productos!.length} producto(s) real(es) del catálogo, tools: ${JSON.stringify(resultadoC.toolsUsed)}`
  );

  console.log("demo OK - agente.ts: tool-calling real verificado en los tres casos (recomendar_seguro, sin perfil, buscar_producto)");
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {
  void demo();
}
