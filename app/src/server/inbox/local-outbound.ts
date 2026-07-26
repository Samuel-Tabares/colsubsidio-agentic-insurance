import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { publish } from "@/server/events/bus";
import { serializeMessage } from "@/server/inbox/ingest";

/**
 * Entrega local de un mensaje saliente del bot: persiste + publica por SSE, SIN
 * tocar Meta. Es el camino de los canales simulados de la demo (web-chat y
 * wa-sim sin número real conectado). El envío real por WhatsApp sigue en
 * `server/inbox/send.ts` (sendText) para cuando haya credenciales.
 */
export async function persistLocalOutbound(input: {
  conversationId: string;
  organizationId: string;
  text?: string | null;
  type?: string;
  payload?: unknown;
  aiGenerated?: boolean;
}): Promise<void> {
  const db = getDb();
  const inserted = await db
    .insert(schema.message)
    .values({
      id: newId("message"),
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      direction: "out",
      type: input.type ?? "text",
      text: input.text ?? null,
      payload: input.payload ?? null,
      status: "sent",
      aiGenerated: input.aiGenerated ?? true,
    })
    .returning();
  const message = inserted[0]!;

  await db
    .update(schema.conversation)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.conversation.id, input.conversationId));

  publish(input.organizationId, {
    type: "message.new",
    data: {
      conversationId: input.conversationId,
      message: serializeMessage(message),
    },
  });
}
