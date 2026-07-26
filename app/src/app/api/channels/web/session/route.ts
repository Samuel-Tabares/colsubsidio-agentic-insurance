import { z } from "zod";
import { apiError } from "@/lib/api";
import { ensureSession, getHistory } from "@/server/channels/web";

/**
 * Arranque en frío y handoff por id: dado un `id` (nuevo o traído desde
 * WhatsApp), asegura la conversación y devuelve el historial. Es lo que hace
 * real el handoff — la web carga el MISMO registro, no datos de prueba.
 */
export const dynamic = "force-dynamic";

const query = z.object({
  id: z.string().min(1),
  canal: z.enum(["whatsapp", "web"]).default("web"),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = query.safeParse({
    id: url.searchParams.get("id") ?? "",
    canal: url.searchParams.get("canal") ?? "web",
  });
  if (!parsed.success) {
    return apiError(422, "invalid_query", "Falta el parámetro id");
  }
  try {
    const session = await ensureSession(parsed.data.id, parsed.data.canal);
    const mensajes = await getHistory(session.conversationId);
    return Response.json({
      id: session.clienteId,
      conversationId: session.conversationId,
      canal: session.canal,
      mensajes,
    });
  } catch (err) {
    console.error("[channels/web] sesión falló:", err);
    return apiError(500, "internal", "No se pudo abrir la sesión");
  }
}
