/**
 * El turno del agente: calcula `recomendar(perfil)` una sola vez (es función pura
 * del perfil, no cambia entre turnos) y la inyecta en el system prompt como un
 * hecho ya decidido. La FAMILIA nunca depende de que el modelo se acuerde de
 * invocar nada — llega resuelta en el 100% de los turnos, de forma determinista.
 * El modelo solo conserva una tool real, `buscar_producto` (RAG dentro de la
 * familia ya dada), y su trabajo es narrar en lenguaje humano.
 *
 * Diseño anterior (tool `recomendar_seguro` + `tool_choice` forzado en la
 * primera ronda cuando había ≥2 respuestas de discovery): funcionaba, pero el
 * gate de "forzar" contaba TODOS los mensajes del cliente de la conversación,
 * así que una vez prendido no se apagaba nunca — cada turno posterior volvía a
 * forzar la tool en la ronda 0, sepultando cualquier pregunta real del usuario
 * bajo otra narración de recomendación (bug real: "¿qué dije hace dos turnos?"
 * volvía con una recomendación en vez de una respuesta). Inyectar el resultado
 * como hecho elimina la clase de bug entera y baja el turno de 2 llamadas a
 * OpenAI a 1.
 */
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import OpenAI from "openai";
import type { AfiliadoRaw } from "./perfil.ts";
import { recomendar, type Perfil, type Recomendacion } from "./recomendar.ts";
import { matchCatalogo } from "./catalogo.ts";
import { SYSTEM_PROMPT_BASE } from "./systemPrompt.ts";
import { resolverSerie, type HistMsg } from "./identidad.ts";

const MODEL = process.env.CEREBRO_MODEL ?? "gpt-4o-mini";
const MAX_TOOL_ROUNDS = 4;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "buscar_producto",
      description:
        "Búsqueda semántica de productos reales del catálogo, dentro de la familia que ya viene en el bloque RECOMENDACIÓN de este prompt. Nunca la llames si ese bloque dice que no hay familia decidida.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Lo que la persona busca, en sus palabras (ej. 'seguro para mi moto de trabajo')." },
          familia: {
            type: "string",
            enum: ["familiares", "hogar", "vehiculos", "mascotas", "deudores-financieros"],
            description: "Familia del bloque RECOMENDACIÓN.",
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

function bloqueRecomendacion(rec: Recomendacion | null): string {
  if (!rec) {
    return "RECOMENDACIÓN: todavía no hay familia decidida por las reglas (perfil sin señales suficientes o no resuelto). Sigues en discovery — nunca inventes ni sugieras una familia por tu cuenta.";
  }
  return [
    "RECOMENDACIÓN (ya decidida por las reglas de reglas.json, no por ti — nunca la recalcules, la cuestiones ni la ocultes):",
    JSON.stringify(
      {
        familia: rec.familia,
        razon_dato: rec.razon_dato,
        respaldo: rec.respaldo,
        preguntas_confirmacion: rec.preguntas_confirmacion,
        tope_precio_mensual: rec.tope_precio_mensual,
      },
      null,
      2
    ),
  ].join("\n");
}

const REGLAS_DE_TURNO = `
REGLAS DE ESTE TURNO (resumen operativo de reglas que ya están arriba, no una política nueva):
1. Cada pregunta de discovery va con un puente corto anclado a lo último que dijo la persona. Nunca sueltas una pregunta de la lista sin conectarla primero a su respuesta anterior.
2. No arrancas por la pregunta de discovery 1 si el contexto no la pide: si la persona ya declaró una necesidad concreta o hizo una pregunta directa, respondes eso primero, antes que cualquier pregunta genérica.
3. Si la persona pregunta sobre la conversación misma (ej. "¿qué dije antes?", "¿de qué hablamos hace un momento?"), respondes desde el historial real que tienes arriba. Si no está en el historial, dices que no lo tienes — nunca cambias de tema ni narras la recomendación en su lugar.
4. Una sola pregunta por turno, nunca dos.
`.trim();

function construirSystem(input: TurnoInput, recomendacion: Recomendacion | null): string {
  return [
    SYSTEM_PROMPT_BASE,
    bloquePerfil(input.perfil),
    bloqueHechos(input.hechos ?? []),
    bloqueFase(input.faseActual ?? null),
    bloqueRecomendacion(recomendacion),
    `CANAL: ${input.canal}`,
    REGLAS_DE_TURNO,
  ]
    .filter((b) => b !== "")
    .join("\n\n");
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
  /** Salida de `recomendar(perfil)` para este turno (función pura, se recalcula
   * siempre pero nunca cambia mientras el perfil no cambie). `null` si no hay
   * perfil o ninguna regla disparó — el caller la usa para pintar el CRM sin
   * depender de que el modelo haya llamado ninguna tool. */
  recomendacion: Recomendacion | null;
  /** Nombres de tools invocadas en este turno, en orden (hoy solo puede traer
   * "buscar_producto"). Útil para logs y self-check. */
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
    return {
      texto: PREGUNTA_SERIE,
      recomendacion: null,
      toolsUsed: [],
      toolResults: [],
      modelo: null,
      tokensTotal: 0,
    };
  }

  const client = openaiClient();

  const recomendacion = input.perfil ? recomendar(aPerfilDeReglas(input.perfil)) : null;
  const system = construirSystem(input, recomendacion);

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

  for (let ronda = 0; ronda < MAX_TOOL_ROUNDS; ronda++) {
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });
    modelo = resp.model;
    tokensTotal += resp.usage?.total_tokens ?? 0;
    const choice = resp.choices[0];
    const msg = choice.message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return {
        texto: msg.content?.trim() || "Dame un segundo, estoy verificando esto con calma.",
        recomendacion,
        toolsUsed,
        toolResults,
        modelo,
        tokensTotal,
      };
    }

    messages.push(msg);

    for (const call of msg.tool_calls) {
      toolsUsed.push(call.function.name);
      const resultado = await ejecutarTool(call);
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
    recomendacion,
    toolsUsed,
    toolResults,
    modelo,
    tokensTotal,
  };
}

async function ejecutarTool(
  call: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
): Promise<unknown> {
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
  // pregunta que abre "familiares". La recomendación debe venir resuelta por
  // las reglas SIN depender de que el modelo invoque nada (a diferencia del
  // diseño anterior, esto ya no es una apuesta sobre el comportamiento del LLM).
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
    resultadoA.recomendacion,
    `Caso A: recomendar(perfil) debía devolver una familia con drogueria=SI. texto="${resultadoA.texto}"`
  );
  assert.equal(
    resultadoA.recomendacion!.familia,
    "familiares",
    `Caso A: familia esperada "familiares", llegó "${resultadoA.recomendacion!.familia}"`
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
    `Caso A OK - recomendacion.familia="${resultadoA.recomendacion!.familia}" (calculada por reglas, no por tool-calling), modelo: ${resultadoA.modelo}, tokens: ${resultadoA.tokensTotal}`
  );

  // Caso B: sin serie resuelta (perfil vacío). El agente no debe inventar
  // datos de un afiliado que no existe, ni traer una recomendación sin perfil.
  const historialB: HistMsg[] = [{ rol: "cliente", texto: "hola, quiero saber de seguros" }];
  const perfilB = await resolverSerie(historialB);
  assert.equal(perfilB, null, "self-check: este historial no debe resolver ninguna serie");

  const resultadoB = await decidirTurno({ perfil: perfilB, historial: historialB, canal: "web" });
  // Turno 1 sin perfil es determinista (no llama al LLM, ver decidirTurno) —
  // por eso se puede asertar el texto exacto, no solo "no inventó nada".
  assert.equal(resultadoB.texto, PREGUNTA_SERIE, `Caso B: turno 1 sin perfil debía ser la pregunta determinista de serie. texto="${resultadoB.texto}"`);
  assert.equal(resultadoB.recomendacion, null, "Caso B: sin perfil no debería haber recomendación");
  assert.equal(resultadoB.tokensTotal, 0, "Caso B: turno determinista no debería llamar a OpenAI");
  console.log("Caso B OK - sin perfil, turno 1 determinista (sin llamar a OpenAI):", resultadoB.texto);

  // Caso C: continúa la conversación con familia ya decidida ("familiares") y
  // pide ver opciones concretas. El agente debe llamar buscar_producto (RAG,
  // la única tool que le queda) y traer productos reales del catálogo, nunca
  // inventar nombres/coberturas.
  // El turno del bot es guionizado a propósito (no se encadena resultadoA.texto):
  // ahora que la familia llega como hecho inyectado y no como tool forzada, el
  // Caso A puede legítimamente seguir en discovery en vez de pasar ya al pitch
  // de recomendación (el modelo decide el ritmo, no una tool forzada) — encadenar
  // el texto real acoplaría este caso a esa variabilidad. Se guioniza el pitch
  // ("¿crees que un respaldo... encajaría con lo que buscas?") para que el "sí,
  // se ajusta... cuéntame el producto" sea una respuesta coherente que cumple
  // sin ambigüedad las dos condiciones del prompt para dar detalle: "sí" a la
  // pregunta guiada, y pedido explícito de producto y cobertura concretos.
  const historialC: HistMsg[] = [
    ...historialA,
    {
      rol: "bot",
      texto:
        "ya que mencionaste que tus hijos dependen completamente de ti, ¿crees que un respaldo para esos imprevistos encajaría con lo que buscas?",
    },
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

  console.log("demo OK - agente.ts: recomendacion determinista por reglas + buscar_producto verificado en los tres casos");
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {
  void demo();
}
