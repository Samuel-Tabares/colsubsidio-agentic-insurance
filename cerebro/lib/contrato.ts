/**
 * Copia del contrato congelado en Vocero (app/src/lib/cerebro/types.ts). No se
 * importa como dependencia porque este es un repo/deploy separado — si el
 * contrato cambia del lado de Vocero, hay que replicarlo acá también.
 */
import { z } from "zod";

export const CerebroHistMsg = z.object({
  rol: z.enum(["cliente", "bot"]),
  texto: z.string(),
});

export const CerebroRequest = z.object({
  clienteId: z.string().min(1),
  canal: z.enum(["whatsapp", "web"]),
  historial: z.array(CerebroHistMsg),
  perfil: z.record(z.unknown()).nullable().optional(),
  presupuesto: z.number().optional(),
});
export type CerebroRequest = z.infer<typeof CerebroRequest>;

export const CerebroMensaje = z.object({
  tipo: z.enum(["text", "recomendacion", "comparacion", "control_cobertura", "cierre"]),
  texto: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export const CerebroResponse = z.object({
  mensajes: z.array(CerebroMensaje).min(1),
  fase: z.string().optional(),
  analisis: z
    .object({ resumen: z.string().optional(), familia: z.string().optional() })
    .catchall(z.unknown())
    .optional(),
  tags: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        icon: z.string().optional(),
        tone: z.enum(["blue", "yellow", "graphite", "olive"]).optional(),
      })
    )
    .optional(),
  ranking: z
    .array(
      z.object({
        familia: z.string(),
        nombre: z.string(),
        aseguradora: z.string().optional(),
        match: z.number(),
        blurb: z.string().optional(),
        prima_mensual: z.number().optional(),
      })
    )
    .optional(),
  handoff: z.object({ motivo: z.string().optional(), despedida: z.string().optional() }).optional(),
});
export type CerebroResponse = z.infer<typeof CerebroResponse>;
