import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import type { Analisis } from "@/lib/types";

export type DashboardData = {
  totals: { total: number; enNegociacion: number; cerrados: number };
  porFase: { name: string; count: number }[];
  segurosMasVendidos: { familia: string; count: number }[];
};

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());
}

/** Etapa de "negociación" y anclas de cierre (nombres del funnel real). */
const NEGOCIACION = "Cotización / negociación";
const CERRADOS = new Set(["Cierre ganado", "En suscripción", "Póliza emitida"]);

/**
 * Métricas del panel gerencial, calculadas sobre datos reales de la BD:
 * conteo de leads por etapa del funnel + seguros más frecuentes (de
 * `contact.analisis.familia`). Sin gráficas mock — todo sale del pipeline.
 */
export async function getDashboardData(
  organizationId: string
): Promise<DashboardData> {
  const db = getDb();

  const stages = await db
    .select()
    .from(schema.pipelineStage)
    .where(scoped(schema.pipelineStage.organizationId, organizationId))
    .orderBy(asc(schema.pipelineStage.position));

  const leads = await db
    .select({ stageId: schema.lead.stageId })
    .from(schema.lead)
    .where(scoped(schema.lead.organizationId, organizationId));

  const countByStage = new Map<string, number>();
  for (const l of leads) {
    countByStage.set(l.stageId, (countByStage.get(l.stageId) ?? 0) + 1);
  }

  const porFase = stages.map((s) => ({
    name: s.name,
    count: countByStage.get(s.id) ?? 0,
  }));

  const stageNameById = new Map(stages.map((s) => [s.id, s.name]));
  let enNegociacion = 0;
  let cerrados = 0;
  for (const l of leads) {
    const name = stageNameById.get(l.stageId);
    if (name === NEGOCIACION) enNegociacion += 1;
    if (name && CERRADOS.has(name)) cerrados += 1;
  }

  const contacts = await db
    .select({ analisis: schema.contact.analisis })
    .from(schema.contact)
    .where(scoped(schema.contact.organizationId, organizationId));

  // El cerebro (o el stub) puede emitir la familia con casing distinto
  // ("vida" vs "Vida"): se agrupa case-insensitive y se muestra en Title Case.
  const familiaCounts = new Map<string, number>();
  for (const c of contacts) {
    const raw = (c.analisis as Analisis | null)?.familia?.trim();
    if (!raw) continue;
    const label = toTitleCase(raw);
    familiaCounts.set(label, (familiaCounts.get(label) ?? 0) + 1);
  }
  const segurosMasVendidos = [...familiaCounts.entries()]
    .map(([familia, count]) => ({ familia, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totals: { total: contacts.length, enNegociacion, cerrados },
    porFase,
    segurosMasVendidos,
  };
}
