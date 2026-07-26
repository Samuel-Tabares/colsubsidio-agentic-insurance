import { ensureSession } from "@/server/channels/web";
import { subscribe, type SseEvent } from "@/server/events/bus";

/**
 * SSE público por conversación (canal de cliente). Se suscribe al bus de la org
 * y reenvía SOLO los eventos de la conversación de este `id` — así el web-chat
 * y el wa-sim reciben las respuestas del bot en vivo sin login.
 */
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;
const encoder = new TextEncoder();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const canal = (url.searchParams.get("canal") ?? "web") as "whatsapp" | "web";
  if (!id) return new Response("Falta id", { status: 422 });

  const session = await ensureSession(id, canal);
  const { organizationId, conversationId } = session;

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup?.();
        }
      };

      send(`: conectado\n\n`);

      const belongs = (event: SseEvent): boolean => {
        if (event.type === "message.new") {
          return (event.data as { conversationId?: string }).conversationId === conversationId;
        }
        if (event.type === "conversation.updated") {
          const c = (event.data as { conversation?: { id?: string } }).conversation;
          return c?.id === conversationId;
        }
        if (event.type === "analisis.updated") {
          return (event.data as { conversationId?: string }).conversationId === conversationId;
        }
        return false;
      };

      const unsubscribe = subscribe(organizationId, (event) => {
        if (!belongs(event)) return;
        send(
          `event: ${event.type}\n` +
            `id: ${Date.now()}\n` +
            `data: ${JSON.stringify(event.data)}\n\n`
        );
      });

      const heartbeat = setInterval(() => send(`: ping\n\n`), HEARTBEAT_MS);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      };

      req.signal.addEventListener("abort", () => cleanup?.());
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
