import { asc, eq } from "drizzle-orm";
import { getDb, getSql, schema } from "@/lib/db";
import { getPublicOrgId } from "@/server/org/public";
import {
  getOrCreateContact,
  getOrCreateConversation,
  ingestInboundMessage,
  serializeMessage,
} from "@/server/inbox/ingest";

/**
 * Capa de los canales de cliente (web-chat, wa-sim). Pública, sin login: el
 * cliente se identifica por un `id` opaco (arranque en frío o handoff por id).
 * Todo entra por la misma tubería de ingesta de Vocero; sólo cambia el canal.
 */
export type Canal = "whatsapp" | "web";

const SERIE_MAX = 500_000;

/**
 * Busca el afiliado real por `serie` en la tabla `afiliados` (Colsubsidio,
 * fuera del schema de Drizzle — es referencia compartida, no dato
 * multi-tenant de Vocero, cae fuera de `scoped()` a propósito). Tagged
 * template de `postgres`, parametrizado, mismo patrón ya usado en el repo
 * para SQL fuera del schema (`db.execute(sql\`...\`)`).
 */
async function buscarAfiliadoPorSerie(serie: number): Promise<Record<string, unknown> | null> {
  const sql = getSql();
  const rows = await sql`select * from afiliados where serie = ${serie} limit 1`;
  return rows[0] ?? null;
}

/** Asegura contacto + conversación para un `id` (sin insertar mensaje).
 * `serie` es opcional: si viene y el contacto todavía no tiene perfil
 * resuelto, se busca en `afiliados` y se guarda en `contact.perfilCrudo`
 * (campo reservado para esto, ver schema.ts) para que el cerebro lo reciba
 * ya resuelto en vez de tener que pedirlo conversacionalmente. */
export async function ensureSession(clienteId: string, canal: Canal, serie?: number) {
  const organizationId = await getPublicOrgId();
  const { contact: contactoInicial } = await getOrCreateContact(organizationId, clienteId, null);
  const conversation = await getOrCreateConversation(
    organizationId,
    contactoInicial.id,
    canal
  );

  let contact = contactoInicial;
  if (serie && serie >= 1 && serie <= SERIE_MAX && !contact.perfilCrudo) {
    const perfil = await buscarAfiliadoPorSerie(serie);
    if (perfil) {
      const db = getDb();
      const actualizado = await db
        .update(schema.contact)
        .set({ perfilCrudo: perfil, updatedAt: new Date() })
        .where(eq(schema.contact.id, contact.id))
        .returning();
      if (actualizado[0]) contact = actualizado[0];
    }
  }

  return {
    clienteId,
    organizationId,
    contactId: contact.id,
    conversationId: conversation.id,
    canal: conversation.channel,
    analisis: contact.analisis ?? null,
    presupuesto: conversation.presupuesto ?? null,
  };
}

/**
 * Guarda el "cuánto puedo pagar al mes" del slider en la conversación. NO
 * dispara turno del bot (se aplica en el siguiente mensaje); evita spam por
 * cada arrastre del slider.
 */
export async function setPresupuesto(
  clienteId: string,
  canal: Canal,
  presupuesto: number
): Promise<void> {
  const db = getDb();
  const session = await ensureSession(clienteId, canal);
  await db
    .update(schema.conversation)
    .set({ presupuesto, updatedAt: new Date() })
    .where(eq(schema.conversation.id, session.conversationId));
}

/** Historial completo de la conversación de un `id`, para arranque/handoff. */
export async function getHistory(conversationId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.message)
    .where(eq(schema.message.conversationId, conversationId))
    .orderBy(asc(schema.message.createdAt));
  return rows.map(serializeMessage);
}

/** Ingesta un mensaje del cliente; el turno del bot lo dispara la tubería. */
export async function receiveInbound(
  clienteId: string,
  canal: Canal,
  text: string
): Promise<void> {
  const organizationId = await getPublicOrgId();
  await ingestInboundMessage({
    organizationId,
    from: clienteId,
    profileName: null,
    type: "text",
    text,
    timestamp: String(Math.floor(Date.now() / 1000)),
    channel: canal,
  });
}
