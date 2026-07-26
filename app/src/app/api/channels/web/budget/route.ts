import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { setPresupuesto } from "@/server/channels/web";

/**
 * Guarda el presupuesto del slider del web-chat. NO dispara turno del bot: se
 * aplica en el siguiente mensaje del cliente. El re-rank inmediato lo hace el
 * cliente de forma optimista; el ranking autoritativo llega en el siguiente turno.
 */
export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().min(1),
  canal: z.enum(["whatsapp", "web"]).default("web"),
  presupuesto: z.number().int().min(0).max(100_000_000),
});

export async function POST(req: Request) {
  const body = await parseBody(req, schema);
  if (!body.ok) return body.response;
  try {
    await setPresupuesto(body.data.id, body.data.canal ?? "web", body.data.presupuesto);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[channels/web] presupuesto falló:", err);
    return apiError(500, "internal", "No se pudo guardar el presupuesto");
  }
}
