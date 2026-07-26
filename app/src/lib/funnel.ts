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
 */
export const FUNNEL_STAGES = [
  { name: "Prospecto", kind: "open" },
  { name: "Análisis", kind: "open" },
  { name: "Cotización / negociación", kind: "open" },
  { name: "Cierre ganado", kind: "open" },
  { name: "En suscripción", kind: "open" },
  { name: "Póliza emitida", kind: "won" },
  { name: "Cierre perdido", kind: "lost" },
] as const satisfies readonly { name: string; kind: "open" | "won" | "lost" }[];

export type FunnelStageName = (typeof FUNNEL_STAGES)[number]["name"];

export const FUNNEL_STAGE_NAMES = FUNNEL_STAGES.map((s) => s.name) as FunnelStageName[];
