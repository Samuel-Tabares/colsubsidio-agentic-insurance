import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CLIENTS, type Client } from "@/lib/admin-mock-data";
import { ClientDetail } from "@/components/admin/ClientDetail";
import { ChannelBadge } from "./admin.index";

export const Route = createFileRoute("/admin/registros")({
  component: RegistrosPage,
});

function RegistrosPage() {
  const [activeId, setActiveId] = useState<string>(CLIENTS[0].id);
  const [contextOpen, setContextOpen] = useState(true);
  const active = CLIENTS.find((c) => c.id === activeId) as Client;

  return (
    <div className="space-y-4">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--brand-blue)" }}
        >
          Registros de conversaciones
        </h2>
        <p className="text-sm text-muted-foreground">
          Bandeja unificada de chats. WhatsApp y Web se muestran como un solo hilo por cliente.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        <Card className="p-0">
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <ul className="divide-y">
              {CLIENTS.map((c) => {
                const last = c.chat[c.chat.length - 1];
                const isActive = c.id === activeId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "w-full px-3 py-3 text-left transition-colors hover:bg-muted/60",
                        isActive && "bg-muted",
                      )}
                      style={
                        isActive
                          ? { borderLeft: "3px solid var(--brand-yellow)" }
                          : { borderLeft: "3px solid transparent" }
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.nombre}</span>
                        <ChannelBadge channel={c.canal} />
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {last?.text}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {c.ultimaInteraccion}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </Card>

        <Card className="flex h-[calc(100vh-16rem)] flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <div
                className="text-sm font-semibold"
                style={{ fontFamily: "var(--font-display)", color: "var(--brand-blue)" }}
              >
                {active.nombre}
              </div>
              <div className="text-xs text-muted-foreground">
                Hilo unificado · {active.chat.length} mensajes
              </div>
            </div>
            <ChannelBadge channel={active.canal} />
          </div>
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-3">
              {active.chat.map((m, i) => {
                const isClient = m.from === "cliente";
                return (
                  <div
                    key={i}
                    className={cn("flex", isClient ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                        isClient
                          ? "rounded-br-sm text-white"
                          : "rounded-bl-sm bg-white text-foreground border",
                      )}
                      style={
                        isClient
                          ? { backgroundColor: "var(--brand-blue)" }
                          : undefined
                      }
                    >
                      <p>{m.text}</p>
                      <div
                        className={cn(
                          "mt-1 flex items-center gap-1 text-[10px]",
                          isClient ? "text-white/70" : "text-muted-foreground",
                        )}
                      >
                        <span>{m.time}</span>
                        <span>·</span>
                        <span>{m.channel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        <Card className="h-[calc(100vh-16rem)] overflow-hidden p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--brand-blue)" }}
            >
              Contexto del cliente
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setContextOpen((v) => !v)}
              className="h-7 w-7"
            >
              {contextOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {contextOpen && (
            <ScrollArea className="h-[calc(100%-3rem)]">
              <CardContent className="p-4">
                <ClientDetail client={active} />
              </CardContent>
            </ScrollArea>
          )}
        </Card>
      </div>
    </div>
  );
}
