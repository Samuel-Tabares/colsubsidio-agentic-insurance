import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { getEnv, isAiConfigured } from "@/lib/env";
import { chatJson, type ChatMessage } from "@/lib/ai";
import { publish } from "@/server/events/bus";
import { isWindowOpen } from "@/server/inbox/window";
import { SendError, sendText } from "@/server/inbox/send";
import { AgentAction, degradeAction, resolveStage, type AgentActionType } from "@/server/ai/actions";
import { matchesHandoffIntent } from "@/server/ai/handoff";
import { buildAgentSystemPrompt } from "@/server/ai/prompts";
import { decidirTurno, isCerebroActive } from "@/lib/cerebro";
import { persistLocalOutbound } from "@/server/inbox/local-outbound";

/**
 * Turno del agente (FR-021..FR-025).
 *
 * Coalesce + lock in-process por conversación: ráfagas de mensajes → UNA
 * respuesta; nunca dos turnos simultáneos; lo que llega durante un turno
 * re-encola exactamente un turno más. Suficiente para el monolito de una
 * instancia (sin colas externas — Constitución II).
 */

type CoalesceEntry = {
  timer: ReturnType<typeof setTimeout> | null;
  running: boolean;
  pending: boolean;
};

const globalForAgent = globalThis as unknown as {
  __agentCoalesce?: Map<string, CoalesceEntry>;
};

function coalesceMap(): Map<string, CoalesceEntry> {
  if (!globalForAgent.__agentCoalesce) {
    globalForAgent.__agentCoalesce = new Map();
  }
  return globalForAgent.__agentCoalesce;
}

/** Punto de entrada con debounce (mensajes entrantes reales). */
export function scheduleAgentTurn(conversationId: string): void {
  const map = coalesceMap();
  const entry = map.get(conversationId) ?? {
    timer: null,
    running: false,
    pending: false,
  };
  map.set(conversationId, entry);

  if (entry.running) {
    entry.pending = true; // se re-encola al terminar el turno actual
    return;
  }
  if (entry.timer) clearTimeout(entry.timer);
  const delay = getEnv().AGENT_COALESCE_MS;
  entry.timer = setTimeout(() => {
    entry.timer = null;
    void executeTurn(conversationId);
  }, delay);
}

async function executeTurn(conversationId: string): Promise<void> {
  const map = coalesceMap();
  const entry = map.get(conversationId);
  if (!entry || entry.running) return;
  entry.running = true;
  try {
    await runAgentTurn(conversationId);
  } catch (err) {
    console.error("[agente] turno falló:", err);
  } finally {
    entry.running = false;
    if (entry.pending) {
      entry.pending = false;
      // Pasa de nuevo por el debounce de scheduleAgentTurn (no re-ejecuta al
      // instante): si llegan varios mensajes casi simultáneos mientras el
      // turno anterior seguía en vuelo, se agrupan en un solo turno de
      // seguimiento en vez de encadenar respuestas casi idénticas una detrás
      // de otra (bug real observado: doble saludo al escribir rápido).
      scheduleAgentTurn(conversationId);
    } else {
      map.delete(conversationId);
    }
  }
}

/**
 * Ejecuta UN turno del agente ahora (el Laboratorio lo llama directo, con
 * debounce 0 y sin pasar por el coalesce).
 */
export async function runAgentTurn(conversationId: string): Promise<void> {
  if (!isAiConfigured() && !isCerebroActive()) return;

  const db = getDb();
  const convRows = await db
    .select()
    .from(schema.conversation)
    .where(eq(schema.conversation.id, conversationId))
    .limit(1);
  const conversation = convRows[0];
  if (!conversation) return;
  const organizationId = conversation.organizationId;

  // Condiciones de silencio: handoff activo o IA apagada en la conversación.
  if (conversation.handoffAt || !conversation.aiEnabled) return;

  const profileRows = await db
    .select()
    .from(schema.agentProfile)
    .where(eq(schema.agentProfile.organizationId, organizationId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile) return;
  // El toggle global aplica a conversaciones reales; el Laboratorio evalúa el
  // comportamiento configurado aunque el agente aún no esté encendido.
  if (!conversation.isTest && !profile.enabled) return;

  const history = await db
    .select()
    .from(schema.message)
    .where(eq(schema.message.conversationId, conversationId))
    .orderBy(desc(schema.message.createdAt))
    .limit(20);
  history.reverse();
  const lastInbound = [...history].reverse().find((m) => m.direction === "in");
  if (!lastInbound) return;

  // Ventana de 24h: sólo aplica al canal WhatsApp real (regla de Meta). En web
  // el agente responde siempre.
  if (
    !conversation.isTest &&
    conversation.channel === "whatsapp" &&
    !isWindowOpen(conversation.lastInboundAt)
  ) {
    await applyHandoff(conversationId, organizationId, "ventana");
    return;
  }

  // Patrón de respaldo ANTES del cerebro/LLM (FR-022): "quiero un humano".
  if (lastInbound.text && matchesHandoffIntent(lastInbound.text)) {
    await applyHandoff(conversationId, organizationId, "cliente");
    return;
  }

  // Seam del cerebro (repo de Jhon). Cuando está activo gobierna el turno; el
  // LLM nativo de Vocero queda como fallback (CEREBRO_MODE=vocero).
  if (isCerebroActive()) {
    await runCerebroTurn(conversation, history);
    return;
  }

  const kb = await db
    .select()
    .from(schema.kbEntry)
    .where(eq(schema.kbEntry.organizationId, organizationId))
    .orderBy(asc(schema.kbEntry.createdAt));
  const stages = await db
    .select({ id: schema.pipelineStage.id, name: schema.pipelineStage.name })
    .from(schema.pipelineStage)
    .where(eq(schema.pipelineStage.organizationId, organizationId))
    .orderBy(asc(schema.pipelineStage.position));

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildAgentSystemPrompt({ profile, kb, stages }),
    },
    ...history
      .filter((m) => m.text)
      .map((m) => ({
        role: m.direction === "in" ? ("user" as const) : ("assistant" as const),
        content: m.text!,
      })),
  ];

  const result = await chatJson(AgentAction, messages);
  if (!result.ok) {
    if (result.error === "not_configured") return;
    // Fallo persistente del proveedor o salida imposible → escalar (FR-022).
    console.error(`[agente] fallo del proveedor (raw): ${result.detail}`);
    await applyHandoff(conversationId, organizationId, "error");
    return;
  }

  let action: AgentActionType = result.data;

  if (action.action === "move_stage") {
    const stage = resolveStage(action.stage, stages);
    if (!stage) {
      action = degradeAction(action);
    } else {
      await moveLeadToStage(organizationId, conversation.contactId, stage.id);
      publish(organizationId, {
        type: "conversation.updated",
        data: { conversation: { id: conversationId } },
      });
      if (action.reply) {
        await deliverReply(conversation, action.reply);
      }
      return;
    }
  }

  switch (action.action) {
    case "none":
      return;
    case "reply":
      await deliverReply(conversation, action.text);
      return;
    case "update_lead": {
      await appendLeadNote(organizationId, conversation.contactId, action.note);
      if (action.reply) await deliverReply(conversation, action.reply);
      return;
    }
    case "handoff": {
      if (action.farewell) {
        await deliverReply(conversation, action.farewell);
      }
      await applyHandoff(conversationId, organizationId, "modelo");
      return;
    }
  }
}

type Conversation = typeof schema.conversation.$inferSelect;

/**
 * Turno gobernado por el cerebro externo (repo de Jhon) o su stub local. Mapea
 * la respuesta del cerebro a las acciones que Vocero ya sabe ejecutar
 * (entrega de mensajes/tarjetas, mover de etapa, handoff), conservando todos
 * los guardrails del pipeline.
 */
async function runCerebroTurn(
  conversation: Conversation,
  history: (typeof schema.message.$inferSelect)[]
): Promise<void> {
  const db = getDb();
  const organizationId = conversation.organizationId;

  const historial = history
    .filter((m) => m.text)
    .map((m) => ({
      rol: m.direction === "in" ? ("cliente" as const) : ("bot" as const),
      texto: m.text!,
    }));

  // clienteId opaco = contact.phone (celular en WhatsApp, id generado en web).
  const contactRows = await db
    .select({
      id: schema.contact.id,
      phone: schema.contact.phone,
      analisis: schema.contact.analisis,
      perfilCrudo: schema.contact.perfilCrudo,
    })
    .from(schema.contact)
    .where(eq(schema.contact.id, conversation.contactId))
    .limit(1);
  const contact = contactRows[0];
  if (!contact) return;

  const result = await decidirTurno({
    clienteId: contact.phone,
    canal: conversation.channel,
    historial,
    perfil: (contact.perfilCrudo as Record<string, unknown> | null) ?? null,
    presupuesto: conversation.presupuesto ?? undefined,
  });
  if (!result.ok) {
    if (result.error === "not_active") return;
    console.error(`[cerebro] turno falló: ${result.detail}`);
    await applyHandoff(conversation.id, organizationId, "error");
    return;
  }

  const data = result.data;
  for (const m of data.mensajes) {
    await deliverAgentMessage(conversation, {
      text: m.texto ?? null,
      type: m.tipo,
      payload: m.payload,
    });
  }

  if (data.fase) {
    const stages = await db
      .select({ id: schema.pipelineStage.id, name: schema.pipelineStage.name })
      .from(schema.pipelineStage)
      .where(eq(schema.pipelineStage.organizationId, organizationId));
    const stage = resolveStage(data.fase, stages);
    if (stage) {
      await moveLeadToStage(organizationId, conversation.contactId, stage.id);
      publish(organizationId, {
        type: "conversation.updated",
        data: { conversation: { id: conversation.id } },
      });
    }
  }

  // Rieles del web-chat: tags/ranking (top-level) se guardan DENTRO de analisis,
  // fusionados con lo previo para no perder resumen/familia entre turnos, y se
  // empujan en vivo por SSE. Los turnos de discovery traen tags/ranking sin analisis.
  if (data.analisis || data.tags || data.ranking) {
    const prev = (contact.analisis ?? {}) as Record<string, unknown>;
    const analisis: Record<string, unknown> = {
      ...prev,
      ...(data.analisis ?? {}),
      ...(data.tags ? { tags: data.tags } : {}),
      ...(data.ranking ? { ranking: data.ranking } : {}),
    };
    await db
      .update(schema.contact)
      .set({
        analisis,
        ...(data.analisis?.resumen ? { analisisResumen: data.analisis.resumen } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.contact.id, conversation.contactId));
    publish(organizationId, {
      type: "analisis.updated",
      data: { conversationId: conversation.id, analisis },
    });
  }

  if (data.handoff) {
    if (data.handoff.despedida) {
      await deliverAgentMessage(conversation, {
        text: data.handoff.despedida,
        type: "text",
      });
    }
    await applyHandoff(conversation.id, organizationId, "modelo");
  }
}

/** Entrega texto simple (camino del LLM nativo de Vocero). */
async function deliverReply(
  conversation: Conversation,
  text: string
): Promise<void> {
  await deliverAgentMessage(conversation, { text, type: "text" });
}

/**
 * Entrega un mensaje del bot (texto o tarjeta). Ruta según canal:
 *  - Laboratorio (is_test) → persistencia sandbox, jamás la API.
 *  - web → persistencia local + SSE (sin Meta).
 *  - whatsapp con número conectado → envío real (o wa-mock en dev).
 *  - whatsapp SIN número conectado → simulado: persistencia local + SSE.
 */
async function deliverAgentMessage(
  conversation: Conversation,
  msg: { text?: string | null; type?: string; payload?: unknown }
): Promise<void> {
  const text = msg.text ?? null;

  if (conversation.isTest) {
    if (text) await persistTestOutbound(conversation, text);
    return;
  }

  if (conversation.channel === "web") {
    await persistLocalOutbound({
      conversationId: conversation.id,
      organizationId: conversation.organizationId,
      text,
      type: msg.type,
      payload: msg.payload,
      aiGenerated: true,
    });
    return;
  }

  try {
    await sendText({
      conversationId: conversation.id,
      organizationId: conversation.organizationId,
      text: text ?? "",
      aiGenerated: true,
    });
  } catch (err) {
    if (err instanceof SendError) {
      if (err.code === "window_closed") {
        await applyHandoff(conversation.id, conversation.organizationId, "ventana");
        return;
      }
      if (err.code === "not_connected") {
        // WhatsApp simulado (sin número real): entrega local + SSE.
        await persistLocalOutbound({
          conversationId: conversation.id,
          organizationId: conversation.organizationId,
          text,
          type: msg.type,
          payload: msg.payload,
          aiGenerated: true,
        });
        return;
      }
    }
    throw err;
  }
}

/** Mensaje saliente del sandbox: se persiste, JAMÁS toca la API (FR-031). */
async function persistTestOutbound(
  conversation: Conversation,
  text: string
): Promise<void> {
  const db = getDb();
  await db.insert(schema.message).values({
    id: newId("message"),
    organizationId: conversation.organizationId,
    conversationId: conversation.id,
    direction: "out",
    type: "text",
    text,
    status: "sent",
    aiGenerated: true,
  });
  await db
    .update(schema.conversation)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.conversation.id, conversation.id));
}

export async function applyHandoff(
  conversationId: string,
  organizationId: string,
  reason: "cliente" | "modelo" | "error" | "ventana"
): Promise<void> {
  const db = getDb();
  const updated = await db
    .update(schema.conversation)
    .set({ handoffAt: new Date(), handoffReason: reason, updatedAt: new Date() })
    .where(eq(schema.conversation.id, conversationId))
    .returning();
  if (!updated[0]) return;
  publish(organizationId, {
    type: "conversation.updated",
    data: {
      conversation: { id: conversationId, handoffReason: reason },
    },
  });
}

async function moveLeadToStage(
  organizationId: string,
  contactId: string,
  stageId: string
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.lead)
    .set({ stageId, updatedAt: new Date(), lastActivityAt: new Date() })
    .where(eq(schema.lead.contactId, contactId));
}

async function appendLeadNote(
  organizationId: string,
  contactId: string,
  note: string
): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.contact.id, notes: schema.contact.notes })
    .from(schema.contact)
    .where(eq(schema.contact.id, contactId))
    .limit(1);
  const contact = rows[0];
  if (!contact) return;
  const stamped = `[IA] ${note}`;
  await db
    .update(schema.contact)
    .set({
      notes: contact.notes ? `${contact.notes}\n${stamped}` : stamped,
      updatedAt: new Date(),
    })
    .where(eq(schema.contact.id, contact.id));
}
