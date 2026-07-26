import { CerebroRequest, type CerebroResponse } from "@/lib/contrato";
import { resolverSerie } from "@/lib/identidad";
import { decidirTurno } from "@/lib/agente";
import type { AfiliadoRaw } from "@/lib/perfil";

export const dynamic = "force-dynamic";

/** Vocero ya puede mandar el perfil resuelto (capturado en S0 vía serie).
 * Solo lo usamos si trae `serie` numérica — si no, cae al escaneo de
 * historial (camino frío, "Entrar con mi cuenta Colsubsidio" sin serie). */
function comoAfiliadoRaw(x: unknown): AfiliadoRaw | null {
  if (!x || typeof x !== "object") return null;
  const serie = (x as Record<string, unknown>).serie;
  if (typeof serie !== "number") return null;
  return x as AfiliadoRaw;
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.json().catch(() => null);
  const parsed = CerebroRequest.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request", detail: parsed.error.message }, { status: 400 });
  }
  const { canal, historial } = parsed.data;

  const perfil = comoAfiliadoRaw(parsed.data.perfil) ?? (await resolverSerie(historial));
  const turno = await decidirTurno({ perfil, historial, canal });

  // Traza mínima de gobernanza: deja ver en los logs qué tools se usaron en
  // cada turno real (no solo en el self-check) — es la evidencia de que la
  // familia la decidieron las reglas y no el modelo.
  console.log(
    `[cerebro] turno serie=${perfil?.serie ?? "-"} tools=${JSON.stringify(turno.toolsUsed)} tokens=${turno.tokensTotal}`
  );

  const respuesta: CerebroResponse = { mensajes: [{ tipo: "text", texto: turno.texto }] };
  return Response.json(respuesta);
}
