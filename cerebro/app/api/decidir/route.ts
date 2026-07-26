import { CerebroRequest, type CerebroResponse } from "@/lib/contrato";
import { resolverSerie } from "@/lib/identidad";
import { decidirTurno } from "@/lib/agente";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const raw = await req.json().catch(() => null);
  const parsed = CerebroRequest.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request", detail: parsed.error.message }, { status: 400 });
  }
  const { canal, historial } = parsed.data;

  const perfil = await resolverSerie(historial);
  const { texto } = await decidirTurno({ perfil, historial, canal });

  const respuesta: CerebroResponse = { mensajes: [{ tipo: "text", texto }] };
  return Response.json(respuesta);
}
