import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import type {
  Analisis,
  ContactDto,
  ContactRowDto,
  Perfil,
} from "@/lib/types";

export function serializeContact(
  c: typeof schema.contact.$inferSelect
): ContactDto {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    notes: c.notes,
    archivedAt: c.archivedAt?.toISOString() ?? null,
    perfil: (c.perfilCrudo as Perfil | null) ?? null,
    analisis: (c.analisis as Analisis | null) ?? null,
    analisisResumen: c.analisisResumen,
  };
}

export async function getContactById(
  organizationId: string,
  contactId: string
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.contact)
    .where(
      scoped(
        schema.contact.organizationId,
        organizationId,
        eq(schema.contact.id, contactId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Etapa actual del lead del contacto (si existe). */
export async function getContactStage(
  organizationId: string,
  contactId: string
) {
  const db = getDb();
  const rows = await db
    .select({ stage: schema.pipelineStage, lead: schema.lead })
    .from(schema.lead)
    .innerJoin(
      schema.pipelineStage,
      eq(schema.lead.stageId, schema.pipelineStage.id)
    )
    .where(
      scoped(
        schema.lead.organizationId,
        organizationId,
        eq(schema.lead.contactId, contactId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Lista enriquecida para la vista Contactos (CRM). Añade a cada contacto su
 * fase (lead→stage), canal y última interacción (de su conversación real) y el
 * seguro de interés derivado del análisis del cerebro. Reusa el patrón de
 * subconsultas de `server/inbox/queries.ts:listConversations`.
 */
export async function listContactRows(
  organizationId: string,
  opts: { q?: string; includeArchived?: boolean } = {}
): Promise<ContactRowDto[]> {
  const db = getDb();
  const q = opts.q?.trim();

  // lead y conversación REAL son únicos por contacto (índices únicos), así que
  // los LEFT JOIN no multiplican filas — más simple que subconsultas
  // correlacionadas y sin ambigüedad de columnas.
  const rows = await db
    .select({
      contact: schema.contact,
      stageName: schema.pipelineStage.name,
      stageKind: schema.pipelineStage.kind,
      channel: schema.conversation.channel,
      lastMessageAt: schema.conversation.lastMessageAt,
    })
    .from(schema.contact)
    .leftJoin(schema.lead, eq(schema.lead.contactId, schema.contact.id))
    .leftJoin(
      schema.pipelineStage,
      eq(schema.pipelineStage.id, schema.lead.stageId)
    )
    .leftJoin(
      schema.conversation,
      and(
        eq(schema.conversation.contactId, schema.contact.id),
        eq(schema.conversation.isTest, false)
      )
    )
    .where(
      scoped(
        schema.contact.organizationId,
        organizationId,
        q
          ? or(
              ilike(schema.contact.name, `%${q}%`),
              ilike(schema.contact.phone, `%${q}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(schema.contact.updatedAt))
    .limit(200);

  return rows
    .filter((r) => opts.includeArchived || !r.contact.archivedAt)
    .map((r) => {
      const base = serializeContact(r.contact);
      const familia = base.analisis?.familia;
      return {
        ...base,
        stageName: r.stageName ?? null,
        stageKind: r.stageKind ?? null,
        seguro: (base.perfil?.seguroInteres || familia) ?? null,
        canal: r.channel ?? null,
        ultimaInteraccion: r.lastMessageAt?.toISOString() ?? null,
      };
    });
}
