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
import { recomendar, type Perfil, type Recomendacion } from "./recomendar.ts";
import { matchCatalogo, type ProductoCatalogo } from "./catalogo.ts";
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
    "PERFIL (ya resuelto, no lo vuelvas a pedir):",
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

export interface TurnoInput {
  perfil: AfiliadoRaw | null;
  historial: HistMsg[];
  canal: "whatsapp" | "web";
}

export interface TurnoResultado {
  texto: string;
  /** Nombres de tools invocadas en este turno, en orden. Útil para logs y para
   * el self-check (verificar que el agente sí usó recomendar_seguro y no
   * decidió la familia por su cuenta). */
  toolsUsed: string[];
  /** Última salida de recomendar_seguro en este turno, si se llamó. La usa
   * route.ts para llenar fase/analisis/perfil del contrato con Vocero — el
   * agente no necesita saber que eso existe, solo decide cuándo llamar la tool. */
  recomendacion?: Recomendacion;
  /** Última salida de buscar_producto en este turno, si se llamó. Alimenta el
   * ranking del contrato con Vocero. */
  productos?: ProductoCatalogo[];
}

function openaiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

export async function decidirTurno(input: TurnoInput): Promise<TurnoResultado> {
  const client = openaiClient();

  const system = [SYSTEM_PROMPT_BASE, bloquePerfil(input.perfil), `CANAL: ${input.canal}`].join(
    "\n\n"
  );

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
  let recomendacion: Recomendacion | undefined;
  let productos: ProductoCatalogo[] | undefined;

  for (let ronda = 0; ronda < MAX_TOOL_ROUNDS; ronda++) {
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });
    const choice = resp.choices[0];
    const msg = choice.message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return {
        texto: msg.content?.trim() || "Dame un segundo, estoy verificando esto con calma.",
        toolsUsed,
        recomendacion,
        productos,
      };
    }

    messages.push(msg);

    for (const call of msg.tool_calls) {
      toolsUsed.push(call.function.name);
      const resultado = await ejecutarTool(call, input.perfil);
      if (
        call.function.name === "recomendar_seguro" &&
        typeof resultado === "object" &&
        resultado !== null &&
        "familia" in resultado
      ) {
        recomendacion = resultado as Recomendacion;
      }
      if (
        call.function.name === "buscar_producto" &&
        typeof resultado === "object" &&
        resultado !== null &&
        "productos" in resultado
      ) {
        productos = (resultado as { productos: ProductoCatalogo[] }).productos;
      }
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
    recomendacion,
    productos,
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
  console.log("Caso A OK - recomendar_seguro llamada, tools:", resultadoA.toolsUsed);

  // Caso B: sin serie resuelta (perfil vacío). El agente no debe inventar
  // datos de un afiliado que no existe, ni llamar recomendar_seguro sin perfil.
  const historialB: HistMsg[] = [{ rol: "cliente", texto: "hola, quiero saber de seguros" }];
  const perfilB = await resolverSerie(historialB);
  assert.equal(perfilB, null, "self-check: este historial no debe resolver ninguna serie");

  const resultadoB = await decidirTurno({ perfil: perfilB, historial: historialB, canal: "web" });
  assert.ok(
    !resultadoB.texto.match(/\$\d/),
    `Caso B: sin perfil, la respuesta no debería traer cifras de dinero inventadas. texto="${resultadoB.texto}"`
  );
  console.log("Caso B OK - sin perfil, respuesta:", resultadoB.texto);

  console.log("demo OK - agente.ts: tool-calling real verificado en ambos casos");
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {
  void demo();
}
