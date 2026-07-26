import { CerebroRequest, type CerebroResponse } from "@/lib/contrato";
import { resolverSerie } from "@/lib/identidad";
import { decidirTurno } from "@/lib/agente";
import { aTextoPlano } from "@/lib/texto";
import { getAfiliadoBySerie, type AfiliadoRaw } from "@/lib/perfil";
import type { ProductoCatalogo } from "@/lib/catalogo";

export const dynamic = "force-dynamic";

/** Vocero manda el perfil capturado en S0 vía serie. Puede venir como fila
 * completa o como `{serie}` mínimo (el Postgres del canal no tiene la tabla
 * `afiliados` — es referencia de ESTE lado). Sea cual sea el shape, la fila
 * autoritativa se lee acá por PK: una consulta indexada, inmune a campos de
 * display que Vocero haya fusionado encima. Sin serie numérica → null y cae
 * al escaneo de historial (camino frío). */
async function resolverPerfilDeVocero(x: unknown): Promise<AfiliadoRaw | null> {
  if (!x || typeof x !== "object") return null;
  const serie = (x as Record<string, unknown>).serie;
  if (typeof serie !== "number") return null;
  return getAfiliadoBySerie(serie);
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.json().catch(() => null);
  const parsed = CerebroRequest.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request", detail: parsed.error.message }, { status: 400 });
  }
  const { canal, historial } = parsed.data;

  const perfil =
    (await resolverPerfilDeVocero(parsed.data.perfil)) ?? (await resolverSerie(historial));
  const turno = await decidirTurno({ perfil, historial, canal });

  // Traza mínima de gobernanza: deja ver en los logs qué tools se usaron en
  // cada turno real (no solo en el self-check) — es la evidencia de que la
  // familia la decidieron las reglas y no el modelo.
  console.log(
    `[cerebro] turno serie=${perfil?.serie ?? "-"} tools=${JSON.stringify(turno.toolsUsed)} tokens=${turno.tokensTotal}`
  );

  const respuesta: CerebroResponse = { mensajes: [{ tipo: "text", texto: turno.texto }] };

  // La recomendación ya viene calculada por decidirTurno (función pura del
  // perfil, ver agente.ts) — determinista en el 100% de los turnos con perfil,
  // no depende de que el modelo haya llamado ninguna tool. Solo buscar_producto
  // sigue siendo tool real, por eso esa sí se sigue leyendo de toolResults.
  const recomendacion = turno.recomendacion;
  const productos = turno.toolResults
    .filter((t) => t.nombre === "buscar_producto")
    .map((t) => t.resultado)
    .filter(
      (r): r is { productos: ProductoCatalogo[] } =>
        typeof r === "object" && r !== null && "productos" in r
    )
    .at(-1)?.productos;

  // Vocero mueve el pipeline y pinta el CRM con lo que devolvamos acá. Se
  // manda `serie` junto con los campos de display: sin ella,
  // resolverPerfilDeVocero (que exige serie numérica) nunca reconoce este
  // perfil en el siguiente turno y la identidad vuelve a depender del
  // escaneo de las últimas 20 líneas de historial (identidad.ts), que se
  // pierde en conversaciones largas.
  if (perfil) {
    respuesta.perfil = {
      serie: perfil.serie,
      ciudad: perfil.ciudad_afiliado ?? undefined,
      categoria: perfil.rango_salarial ?? undefined,
      grupoFamiliar: perfil.segmento_grupo_familiar ?? undefined,
      seguroInteres: recomendacion?.familia,
    };
  }

  if (recomendacion) {
    respuesta.analisis = {
      familia: recomendacion.familia,
      resumen: recomendacion.razon_dato,
    };
    respuesta.tags = [
      perfil?.rango_edad ? { id: "edad", label: perfil.rango_edad, tone: "blue" as const } : null,
      perfil?.ciudad_afiliado ? { id: "ciudad", label: perfil.ciudad_afiliado, tone: "blue" as const } : null,
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

  // Punto único de salida: TODO mensaje que emite el agente sale en texto
  // plano, sin markdown. Va acá y no en `decidirTurno` a propósito — así
  // cubre también las tarjetas ricas (recomendacion/comparacion/cierre)
  // cuando se agreguen, sin que nadie tenga que acordarse de aplicarlo.
  respuesta.mensajes = respuesta.mensajes.map((m) =>
    m.texto ? { ...m, texto: aTextoPlano(m.texto) } : m
  );

  return Response.json(respuesta);
}
