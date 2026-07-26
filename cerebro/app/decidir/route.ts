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

  const afiliado = await resolverSerie(historial);
  const { texto, recomendacion, productos } = await decidirTurno({ perfil: afiliado, historial, canal });

  const respuesta: CerebroResponse = { mensajes: [{ tipo: "text", texto }] };

  // Vocero mueve el pipeline y pinta el CRM con lo que devolvamos acá — el
  // agente no llama ninguna tool "de Vocero", solo decide cuándo usar
  // recomendar_seguro/buscar_producto; este mapeo traduce esas dos tools al
  // contrato que Vocero ya sabe aplicar (mover fase, guardar perfil/análisis).
  if (afiliado) {
    respuesta.perfil = {
      ciudad: afiliado.ciudad_afiliado ?? undefined,
      categoria: afiliado.rango_salarial ?? undefined,
      grupoFamiliar: afiliado.segmento_grupo_familiar ?? undefined,
      seguroInteres: recomendacion?.familia,
    };
  }

  if (recomendacion) {
    respuesta.analisis = {
      familia: recomendacion.familia,
      resumen: recomendacion.razon_dato,
    };
    respuesta.tags = [
      afiliado?.rango_edad ? { id: "edad", label: afiliado.rango_edad, tone: "blue" as const } : null,
      afiliado?.ciudad_afiliado ? { id: "ciudad", label: afiliado.ciudad_afiliado, tone: "blue" as const } : null,
      { id: "familia", label: `Interés: ${recomendacion.familia}`, tone: "olive" as const },
    ].filter((t): t is NonNullable<typeof t> => t !== null);
  }

  if (productos && productos.length > 0) {
    respuesta.ranking = productos.map((p) => ({
      familia: p.familia,
      nombre: p.nombre_producto,
      aseguradora: p.aseguradora,
      match: Math.round(p.similarity * 100),
      blurb: p.page_content.slice(0, 140),
      prima_mensual: p.planes[0]?.precio_mensual_desde ?? undefined,
    }));
  }

  // Discovery en curso → "Prospecto" (default del seed, no se toca). Familia
  // decidida → "Análisis". Ya vio productos concretos → "Cotización / negociación".
  if (productos && productos.length > 0) {
    respuesta.fase = "Cotización / negociación";
  } else if (recomendacion) {
    respuesta.fase = "Análisis";
  }

  return Response.json(respuesta);
}
