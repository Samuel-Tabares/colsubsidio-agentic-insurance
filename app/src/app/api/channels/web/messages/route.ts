import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { receiveInbound } from "@/server/channels/web";

/**
 * Ingesta de un mensaje del cliente desde un canal público (web-chat / wa-sim).
 * La respuesta del bot NO viaja aquí: llega por SSE (`/api/channels/web/stream`).
 */
export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  canal: z.enum(["whatsapp", "web"]).default("web"),
});

export async function POST(req: Request) {
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  try {
    await receiveInbound(body.data.id, body.data.canal ?? "web", body.data.text);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[channels/web] ingesta falló:", err);
    return apiError(500, "internal", "No se pudo procesar el mensaje");
  }
}
