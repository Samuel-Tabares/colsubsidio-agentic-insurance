/**
 * Resuelve la serie del afiliado a partir del historial que Vocero manda en cada
 * turno (últimos 20 mensajes, orden cronológico). Sin tabla nueva: Vocero ya reenvía
 * el historial completo cada vez, así que no hace falta persistir la identidad entre
 * invocaciones — se re-resuelve en cada turno.
 *
 * ponytail: solo matchea mensajes de puro dígito (ej. "259", nunca "cuesta 259 mil"),
 * para no confundir un número mencionado al pasar con la serie. Límite conocido: si
 * la conversación pasa de 20 mensajes sin que la serie vuelva a aparecer en esa
 * ventana, se re-pregunta. Upgrade si eso duele: escribir la serie resuelta a la
 * tabla `conversaciones` ya existente y leerla de ahí en vez de escanear historial.
 */
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { getAfiliadoBySerie, type AfiliadoRaw } from "./perfil.ts";

export interface HistMsg {
  rol: "cliente" | "bot";
  texto: string;
}

const SERIE_MAX = 500_000;

export async function resolverSerie(historial: HistMsg[]): Promise<AfiliadoRaw | null> {
  for (const msg of historial) {
    if (msg.rol !== "cliente") continue;
    const texto = msg.texto.trim();
    if (!/^\d{1,6}$/.test(texto)) continue;
    const serie = Number(texto);
    if (serie < 1 || serie > SERIE_MAX) continue;
    const afiliado = await getAfiliadoBySerie(serie);
    if (afiliado) return afiliado;
  }
  return null;
}

async function demo(): Promise<void> {
  const sinSerie: HistMsg[] = [
    { rol: "cliente", texto: "hola quiero saber de seguros" },
    { rol: "bot", texto: "claro, ¿tienes tu número de serie a mano?" },
    { rol: "cliente", texto: "no sé si tengo eso" },
  ];
  assert.equal(await resolverSerie(sinSerie), null, "sin número puro no debe resolver nada");

  const numeroEmbebido: HistMsg[] = [{ rol: "cliente", texto: "eso cuesta como 259000 al mes?" }];
  assert.equal(
    await resolverSerie(numeroEmbebido),
    null,
    "un número dentro de una frase no debe confundirse con la serie"
  );

  const conSerie: HistMsg[] = [
    { rol: "cliente", texto: "hola" },
    { rol: "bot", texto: "¿tienes tu número de serie a mano?" },
    { rol: "cliente", texto: "259" },
  ];
  const afiliado = await resolverSerie(conSerie);
  assert.ok(afiliado, "serie 259 real debe resolver");
  assert.equal(afiliado!.serie, 259);

  console.log("demo OK - identidad.ts: sin match no revienta, número embebido se ignora, serie 259 real resuelve");
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {
  void demo();
}
