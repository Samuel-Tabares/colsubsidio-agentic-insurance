import { CerebroRequest, type CerebroResponse } from "@/lib/contrato";
import { resolverSerie } from "@/lib/identidad";
import { decidirTurno } from "@/lib/agente";
import { aTextoPlano } from "@/lib/texto";
import { getAfiliadoBySerie, type AfiliadoRaw } from "@/lib/perfil";
import {
  leerEstado,
  fusionarHechos,
  hechosDePerfil,
  faseMasAvanzada,
  type FaseAgente,
} from "@/lib/estado";
import type { Recomendacion } from "@/lib/recomendar";
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

  // Lo que la persona ya había contado en turnos anteriores viaja de vuelta
  // dentro de `perfil` (el canal lo persiste en contact.perfilCrudo). El agente
  // lo necesita para no repreguntarlo.
  const hechosPrevios = hechosDePerfil(parsed.data.perfil);
  const turno = await decidirTurno({
    perfil,
    historial,
    canal,
    faseActual: parsed.data.faseActual ?? null,
    hechos: hechosPrevios.map((h) => ({ etiqueta: h.etiqueta, valor: h.valor })),
  });

  // Segunda pasada, solo de lectura: en qué fase quedó el lead y qué contó la
  // persona de su vida en este turno (ver lib/estado.ts).
  const lectura = await leerEstado({
    historial,
    respuestaAgente: turno.texto,
    faseActual: parsed.data.faseActual ?? null,
    hechosPrevios,
  });
  const hechos = fusionarHechos(hechosPrevios, lectura.hechos);

  // Traza mínima de gobernanza: deja ver en los logs qué tools se usaron en
  // cada turno real (no solo en el self-check) — es la evidencia de que la
  // familia la decidieron las reglas y no el modelo.
  console.log(
    `[cerebro] turno serie=${perfil?.serie ?? "-"} tools=${JSON.stringify(turno.toolsUsed)} tokens=${turno.tokensTotal}`
  );

  const respuesta: CerebroResponse = { mensajes: [{ tipo: "text", texto: turno.texto }] };

  // Última salida de cada tool en el turno, derivada de la traza cruda.
  const recomendacion = turno.toolResults
    .filter((t) => t.nombre === "recomendar_seguro")
    .map((t) => t.resultado)
    .filter(
      (r): r is Recomendacion => typeof r === "object" && r !== null && "familia" in r
    )
    .at(-1);
  const productos = turno.toolResults
    .filter((t) => t.nombre === "buscar_producto")
    .map((t) => t.resultado)
    .filter(
      (r): r is { productos: ProductoCatalogo[] } =>
        typeof r === "object" && r !== null && "productos" in r
    )
    .at(-1)?.productos;

  // Vocero mueve el pipeline y pinta el CRM con lo que devolvamos acá — el
  // agente no llama ninguna tool "de Vocero", solo decide cuándo usar
  // recomendar_seguro/buscar_producto; este mapeo traduce esas dos tools al
  // contrato que Vocero ya sabe aplicar (mover fase, guardar perfil/análisis).
  // El perfil sale de dos fuentes que NO se pisan: la base de afiliados es la
  // base (ciudad, salario, grupo familiar) y los `hechos` son lo que la persona
  // contó en vivo. Se emite aunque no haya serie resuelta: alguien sin perfil en
  // la base igual cuenta cosas de su vida, y eso tiene que llegar al CRM.
  if (perfil || hechos.length > 0) {
    respuesta.perfil = {
      ...(perfil
        ? {
            ciudad: perfil.ciudad_afiliado ?? undefined,
            categoria: perfil.rango_salarial ?? undefined,
            grupoFamiliar: perfil.segmento_grupo_familiar ?? undefined,
          }
        : {}),
      ...(recomendacion ? { seguroInteres: recomendacion.familia } : {}),
      hechos,
    };
  }

  if (recomendacion) {
    respuesta.analisis = {
      familia: recomendacion.familia,
      resumen: recomendacion.razon_dato,
    };
  }

  // Chips del riel: primero lo que la persona dijo (es lo vivo y lo que prueba
  // que se le escuchó), después lo que ya se sabía de la base.
  const tags = [
    ...hechos.map((h) => ({
      id: `hecho-${h.id}`,
      label: `${h.etiqueta}: ${h.valor}`,
      icon: h.icono,
      tone: "yellow" as const,
    })),
    perfil?.rango_edad ? { id: "edad", label: perfil.rango_edad, tone: "blue" as const } : null,
    perfil?.ciudad_afiliado
      ? { id: "ciudad", label: perfil.ciudad_afiliado, tone: "blue" as const }
      : null,
    recomendacion
      ? { id: "familia", label: `Interés: ${recomendacion.familia}`, tone: "olive" as const }
      : null,
  ].filter((t): t is NonNullable<typeof t> => t !== null);
  if (tags.length > 0) respuesta.tags = tags;

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

  // La fase la decide la lectura de la conversación (lib/estado.ts), que es lo
  // único que sabe si la persona aceptó o se fue. Las tools solo ponen un PISO:
  // si en este turno se mostraron productos, la conversación ya está al menos en
  // negociación, diga lo que diga el clasificador. Se toma la más avanzada de
  // las dos. Antes la fase salía SOLO de qué tool se llamó, y como
  // `recomendar_seguro` se vuelve a llamar en turnos posteriores, un lead ya en
  // negociación caía de vuelta a "Análisis" cada vez.
  const piso: FaseAgente | null =
    productos && productos.length > 0
      ? "Cotización / negociación"
      : recomendacion
        ? "Análisis"
        : null;
  const fase = faseMasAvanzada(lectura.fase, piso);
  if (fase) respuesta.fase = fase;

  console.log(
    `[cerebro] fase=${fase ?? "-"} (lectura=${lectura.fase ?? "-"}, piso=${piso ?? "-"}, actual=${parsed.data.faseActual ?? "-"}) hechos=${hechos.length}`
  );

  // Punto único de salida: TODO mensaje que emite el agente sale en texto
  // plano, sin markdown. Va acá y no en `decidirTurno` a propósito — así
  // cubre también las tarjetas ricas (recomendacion/comparacion/cierre)
  // cuando se agreguen, sin que nadie tenga que acordarse de aplicarlo.
  respuesta.mensajes = respuesta.mensajes.map((m) =>
    m.texto ? { ...m, texto: aTextoPlano(m.texto) } : m
  );

  return Response.json(respuesta);
}
