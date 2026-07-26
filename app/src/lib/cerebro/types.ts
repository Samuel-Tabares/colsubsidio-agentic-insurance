import { z } from "zod";

/**
 * Contrato Canales ↔ Cerebro (FASE 0.1 + 0.2 de PLAN-CONSTRUCCION).
 *
 * El cerebro (agente + RAG + `recomendar()`) vive en OTRO repo (Jhon) y se
 * alcanza por HTTP. Este archivo es la frontera: mismo request/response sin
 * importar el canal. Hoy corre contra un stub local; apuntar al cerebro real
 * es sólo cambiar `CEREBRO_MODE=external` + `CEREBRO_URL`.
 *
 * Regla de arquitectura que sostiene el gate del jurado: las reglas deciden la
 * FAMILIA (y su justificación), el RAG recupera el PRODUCTO, el LLM narra. Por
 * eso la respuesta trae `analisis` (el porqué de dos patas), no sólo texto.
 */

/** Rol del mensaje en el historial que se le pasa al cerebro. */
export const CerebroHistMsg = z.object({
  rol: z.enum(["cliente", "bot"]),
  texto: z.string(),
});
export type CerebroHistMsg = z.infer<typeof CerebroHistMsg>;

export const CerebroRequest = z.object({
  /** id opaco del cliente (celular en WhatsApp, id generado en web). */
  clienteId: z.string().min(1),
  canal: z.enum(["whatsapp", "web"]),
  historial: z.array(CerebroHistMsg),
  /** Perfil crudo del afiliado si ya se conoce (lo llena el cerebro por su lado). */
  perfil: z.record(z.unknown()).nullable().optional(),
  /** "Cuánto puedo pagar al mes" (COP) del slider de presupuesto; afina la recomendación. */
  presupuesto: z.number().optional(),
});
export type CerebroRequest = z.infer<typeof CerebroRequest>;

/** Un mensaje de salida: texto simple o una tarjeta interactiva. */
export const CerebroMensaje = z.object({
  tipo: z.enum([
    "text",
    "recomendacion",
    "comparacion",
    "control_cobertura",
    "cierre",
  ]),
  texto: z.string().optional(),
  /** Contenido estructurado de la tarjeta (coberturas, exclusiones, opciones…). */
  payload: z.record(z.unknown()).optional(),
});
export type CerebroMensaje = z.infer<typeof CerebroMensaje>;

/** Chip de perfil que el asesor "va guardando" del cliente (riel izquierdo del web-chat). */
export const CerebroTag = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  tone: z.enum(["blue", "yellow", "graphite", "olive"]).optional(),
});
export type CerebroTag = z.infer<typeof CerebroTag>;

/** Una familia puntuada para el ranking en vivo con % match (riel derecho del web-chat). */
export const CerebroRankItem = z.object({
  familia: z.string(),
  nombre: z.string(),
  aseguradora: z.string().optional(),
  match: z.number(),
  blurb: z.string().optional(),
  prima_mensual: z.number().optional(),
});
export type CerebroRankItem = z.infer<typeof CerebroRankItem>;

export const CerebroResponse = z.object({
  mensajes: z.array(CerebroMensaje).min(1),
  /** Nombre EXACTO de una etapa del funnel (ver lib/funnel) para mover el lead. */
  fase: z.string().optional(),
  /** El "hacia dónde va el cliente": se guarda en contact.analisis(+resumen). */
  analisis: z
    .object({
      resumen: z.string().optional(),
      familia: z.string().optional(),
      // Campos libres del cerebro (scores, razones, respaldo numérico…).
    })
    .catchall(z.unknown())
    .optional(),
  /** Datos crudos del afiliado ya resuelto por el cerebro; se guardan en
   * contact.perfilCrudo (panel "Datos del perfil", solo lectura, del admin). */
  perfil: z.record(z.unknown()).optional(),
  /** Chips de perfil para el riel izquierdo; opcional (el cerebro real puede omitirlo). */
  tags: z.array(CerebroTag).optional(),
  /** Ranking de familias con % match para el riel derecho; opcional. */
  ranking: z.array(CerebroRankItem).optional(),
  /** Si viene, la conversación pasa a atención humana tras entregar los mensajes. */
  handoff: z
    .object({ motivo: z.string().optional(), despedida: z.string().optional() })
    .optional(),
});
export type CerebroResponse = z.infer<typeof CerebroResponse>;
