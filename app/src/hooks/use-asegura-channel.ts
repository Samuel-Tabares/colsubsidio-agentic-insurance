"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Hook de canal del web-chat de Colsubsidio. Aísla TODO el contrato con el
 * backend (el mismo que probaba el placeholder `SurfaceChat`) para que la
 * superficie de Sarah sólo consuma datos:
 *  - GET  /api/channels/web/session  → historial + análisis (tags/ranking) + presupuesto
 *  - SSE  /api/channels/web/stream    → `message.new` y `analisis.updated` en vivo
 *  - POST /api/channels/web/messages  → mensaje del cliente (respuesta llega por SSE)
 *  - POST /api/channels/web/budget    → presupuesto del slider (debounced, no dispara turno)
 */

export type Canal = "whatsapp" | "web";

export type Msg = {
  id: string;
  direction: "in" | "out";
  type: string;
  text: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export type Tag = {
  id: string;
  label: string;
  icon?: string;
  tone?: "blue" | "yellow" | "graphite" | "olive";
};

export type RankItem = {
  familia: string;
  nombre: string;
  aseguradora?: string;
  match: number;
  blurb?: string;
  prima_mensual?: number;
};

export type Analisis = {
  resumen?: string;
  familia?: string;
  tags?: Tag[];
  ranking?: RankItem[];
} | null;

function resolveId(canal: Canal): string {
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get("id");
  const key = `asegura_id_${canal}`;
  if (fromUrl) {
    localStorage.setItem(key, fromUrl);
    return fromUrl;
  }
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const fresh =
    canal === "whatsapp"
      ? `57300${Math.floor(1000000 + Math.random() * 8999999)}`
      : `web_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, fresh);
  return fresh;
}

export function useAseguraChannel(canal: Canal) {
  const [id, setId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [analisis, setAnalisis] = useState<Analisis>(null);
  const [presupuestoInicial, setPresupuestoInicial] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const budgetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setId(resolveId(canal));
  }, [canal]);

  // Arranque en frío / handoff por id.
  useEffect(() => {
    if (!id) return;
    fetch(`/api/channels/web/session?id=${encodeURIComponent(id)}&canal=${canal}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.mensajes ?? []);
        setAnalisis(d.analisis ?? null);
        setPresupuestoInicial(typeof d.presupuesto === "number" ? d.presupuesto : null);
      })
      .catch(() => {});
  }, [id, canal]);

  // SSE: respuestas del bot + rieles (tags/ranking) en vivo.
  useEffect(() => {
    if (!id) return;
    const es = new EventSource(
      `/api/channels/web/stream?id=${encodeURIComponent(id)}&canal=${canal}`
    );
    es.addEventListener("message.new", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      const m = data.message as Msg;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    es.addEventListener("analisis.updated", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setAnalisis((data.analisis as Analisis) ?? null);
    });
    return () => es.close();
  }, [id, canal]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || !id || sending) return;
      setSending(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `local_${Date.now()}`,
          direction: "in",
          type: "text",
          text,
          payload: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      try {
        await fetch("/api/channels/web/messages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, text, canal }),
        });
      } finally {
        setSending(false);
      }
    },
    [id, canal, sending]
  );

  /** Persiste el presupuesto con debounce; se aplica en el siguiente turno. */
  const setBudget = useCallback(
    (presupuesto: number) => {
      if (!id) return;
      if (budgetTimer.current) clearTimeout(budgetTimer.current);
      budgetTimer.current = setTimeout(() => {
        void fetch("/api/channels/web/budget", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, canal, presupuesto: Math.round(presupuesto) }),
        }).catch(() => {});
      }, 450);
    },
    [id, canal]
  );

  const tags = useMemo(() => analisis?.tags ?? [], [analisis]);
  const ranking = useMemo(() => analisis?.ranking ?? [], [analisis]);

  return { id, messages, analisis, tags, ranking, presupuestoInicial, sending, send, setBudget };
}
