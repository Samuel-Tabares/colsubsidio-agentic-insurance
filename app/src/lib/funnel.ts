/**
 * Funnel de ventas de seguros de Colsubsidio (UX §0.3), fuente única de verdad.
 *
 * Se mapea al modelo `kind` de Vocero (open | won | lost, con won/lost como
 * anclas no borrables): el post-venta (En suscripción) queda DESPUÉS del cierre
 * ganado sin romper esas anclas — "Póliza emitida" es el ancla de éxito y
 * "Cierre perdido" el ancla de pérdida.
 *
 * Tanto el seed de etapas como el cerebro (cuando emite `fase`) leen de aquí,
 * para que los nombres nunca se desalineen.
 *
 * `duenio` reparte la responsabilidad real del negocio: el agente maneja de
 * punta a punta desde Prospecto hasta el cierre (ganado o perdido); suscripción
 * y emisión son trabajo humano. `avance` es el orden monotónico que hace
 * cumplir `puedeMoverAgente` — sin él, el cerebro devuelve una fase por turno
 * según qué tool usó y el lead rebota hacia atrás en el pipeline.
 */
export const FUNNEL_STAGES = [
  { name: "Prospecto", kind: "open", duenio: "agente", avance: 0 },
  { name: "Análisis", kind: "open", duenio: "agente", avance: 1 },
  { name: "Cotización / negociación", kind: "open", duenio: "agente", avance: 2 },
  { name: "Cierre ganado", kind: "open", duenio: "agente", avance: 3 },
  { name: "En suscripción", kind: "open", duenio: "humano", avance: 4 },
  { name: "Póliza emitida", kind: "won", duenio: "humano", avance: 5 },
  { name: "Cierre perdido", kind: "lost", duenio: "agente", avance: 6 },
] as const satisfies readonly {
  name: string;
  kind: "open" | "won" | "lost";
  duenio: "agente" | "humano";
  avance: number;
}[];

export type FunnelStage = (typeof FUNNEL_STAGES)[number];
export type FunnelStageName = FunnelStage["name"];

export const FUNNEL_STAGE_NAMES = FUNNEL_STAGES.map((s) => s.name) as FunnelStageName[];

/** Las 5 fases que el agente maneja solo (las otras 2 son trabajo humano). */
export const FASES_DEL_AGENTE = FUNNEL_STAGES.filter((s) => s.duenio === "agente").map(
  (s) => s.name
) as FunnelStageName[];

function buscarEtapa(name: string | null | undefined): FunnelStage | undefined {
  if (!name) return undefined;
  const norm = name.trim().toLowerCase();
  return FUNNEL_STAGES.find((s) => s.name.toLowerCase() === norm);
}

/**
 * ¿Puede el agente mover este lead de `desde` a `hacia`?
 *
 * Reglas (en orden):
 *  1. El destino tiene que ser una fase del agente — nunca empuja a suscripción
 *     ni a póliza emitida, eso lo hace una persona.
 *  2. Si el lead ya está en una fase humana, el agente no lo saca de ahí.
 *  3. Desde "Cierre ganado" el agente ya no mueve nada: entregó el lead.
 *  4. "Cierre perdido" es alcanzable desde cualquier fase abierta del agente.
 *  5. En el resto, solo hacia adelante: nunca de Cotización de vuelta a Análisis.
 *
 * Sin origen conocido (lead recién creado) se permite cualquier fase del agente.
 */
export function puedeMoverAgente(
  desde: string | null | undefined,
  hacia: string
): boolean {
  const destino = buscarEtapa(hacia);
  if (!destino || destino.duenio !== "agente") return false;

  const origen = buscarEtapa(desde);
  if (!origen) return true;
  if (origen.duenio !== "agente") return false;
  if (origen.name === "Cierre ganado") return false;
  if (destino.name === "Cierre perdido") return true;
  return destino.avance > origen.avance;
}
