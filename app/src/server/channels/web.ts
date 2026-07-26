import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
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

/** Asegura contacto + conversación para un `id` (sin insertar mensaje). */
export async function ensureSession(clienteId: string, canal: Canal) {
  const organizationId = await getPublicOrgId();
  const { contact } = await getOrCreateContact(organizationId, clienteId, null);
  const conversation = await getOrCreateConversation(
    organizationId,
    contact.id,
    canal
  );
  return {
    clienteId,
    organizationId,
    contactId: contact.id,
    conversationId: conversation.id,
    canal: conversation.channel,
  };
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
