import { scheduleAgentTurn } from "@/server/ai/pipeline";
import { isAiConfigured } from "@/lib/env";
import { isCerebroActive } from "@/lib/cerebro";

/**
 * Punto de enganche del turno del agente tras la ingesta de un mensaje
 * entrante REAL (las conversaciones del Laboratorio invocan el pipeline
 * directamente, sin debounce). El turno corre si hay cerebro activo (repo de
 * Jhon o su stub) o, en su defecto, si el LLM nativo está configurado.
 */
export async function maybeRunAgentTurn(
  conversationId: string
): Promise<void> {
  if (!isCerebroActive() && !isAiConfigured()) return;
  scheduleAgentTurn(conversationId);
}
