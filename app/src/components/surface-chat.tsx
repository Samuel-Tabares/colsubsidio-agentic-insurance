"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Superficie de chat de cliente (placeholder funcional, SIN diseño). Prueba el
 * backend de punta a punta: carga la sesión por `id`, escucha el SSE del canal
 * y renderiza texto + tarjetas del cerebro. El diseño real de Sarah reemplaza
 * este componente; el contrato con el backend queda fijo.
 */

type Canal = "whatsapp" | "web";

type Msg = {
  id: string;
  direction: "in" | "out";
  type: string;
  text: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function resolveId(canal: Canal): string {
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get("id");
  if (fromUrl) {
    localStorage.setItem(`asegura_id_${canal}`, fromUrl);
    return fromUrl;
  }
  const key = `asegura_id_${canal}`;
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const fresh =
    canal === "whatsapp"
      ? `57300${Math.floor(1000000 + Math.random() * 8999999)}`
      : `web_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, fresh);
  return fresh;
}

export function SurfaceChat({
  canal,
  accent,
  title,
}: {
  canal: Canal;
  accent: string;
  title: string;
}) {
  const [id, setId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setId(resolveId(canal));
  }, [canal]);

  // Carga inicial del historial (arranque en frío o handoff por id).
  useEffect(() => {
    if (!id) return;
    fetch(`/api/channels/web/session?id=${encodeURIComponent(id)}&canal=${canal}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.mensajes ?? []))
      .catch(() => {});
  }, [id, canal]);

  // SSE: respuestas del bot en vivo.
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
    return () => es.close();
  }, [id, canal]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !id || sending) return;
    setSending(true);
    setInput("");
    // Optimista: pinta el mensaje del cliente de inmediato.
    setMessages((prev) => [
      ...prev,
      { id: `local_${Date.now()}`, direction: "in", type: "text", text, payload: null, createdAt: new Date().toISOString() },
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
  }, [input, id, canal, sending]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 480, margin: "0 auto", background: "#fff", color: "#0b2a4a" }}>
      <header style={{ background: accent, color: "#0b2a4a", padding: "12px 16px", fontWeight: 600 }}>
        {title}
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: 12, background: canal === "whatsapp" ? "#e5ddd5" : "#f4f7fb" }}>
        {messages.map((m) => (
          <Bubble key={m.id} m={m} accent={accent} />
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #ddd" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escribe un mensaje…"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 20, border: "1px solid #ccc", outline: "none" }}
        />
        <button
          onClick={send}
          disabled={sending}
          style={{ padding: "10px 16px", borderRadius: 20, border: "none", background: accent, color: canal === "whatsapp" ? "#fff" : "#0b2a4a", fontWeight: 600, cursor: "pointer" }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

function Bubble({ m, accent }: { m: Msg; accent: string }) {
  const mine = m.direction === "in";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
      <div
        style={{
          maxWidth: "85%",
          background: mine ? "#dcf8c6" : "#fff",
          borderRadius: 12,
          padding: "8px 12px",
          boxShadow: "0 1px 1px rgba(0,0,0,.08)",
          fontSize: 14,
        }}
      >
        {m.text && <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>}
        {m.payload && <Card type={m.type} payload={m.payload} accent={accent} />}
      </div>
    </div>
  );
}

function money(v: unknown): string {
  return typeof v === "number" ? COP.format(v) : "";
}

function List({ items, title, color }: { items: unknown; title: string; color: string }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color }}>{title}</div>
      <ul style={{ margin: "2px 0 0", paddingLeft: 16 }}>
        {items.map((x, i) => (
          <li key={i} style={{ fontSize: 13 }}>{String(x)}</li>
        ))}
      </ul>
    </div>
  );
}

function Card({ type, payload, accent }: { type: string; payload: Record<string, unknown>; accent: string }) {
  const box: React.CSSProperties = { marginTop: 8, border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" };

  if (type === "recomendacion" || type === "cierre") {
    const pq = payload.por_que as { por_tu_perfil?: string; por_lo_que_me_contaste?: string } | undefined;
    return (
      <div style={box}>
        <div style={{ fontWeight: 700 }}>{String(payload.nombre ?? "")}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{String(payload.aseguradora ?? "")}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: accent === "#ffd000" ? "#0067b1" : accent, marginTop: 4 }}>
          {money(payload.prima_mensual)} <span style={{ fontSize: 12, fontWeight: 400 }}>/ mes</span>
        </div>
        <List items={payload.cubre} title="Cubre" color="#15803d" />
        <List items={payload.no_cubre} title="No cubre" color="#b91c1c" />
        {pq && (
          <div style={{ marginTop: 8, background: "#f8fafc", borderRadius: 8, padding: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Por qué este seguro:</div>
            {pq.por_tu_perfil && <div style={{ fontSize: 13 }}>📊 Por tu perfil: {pq.por_tu_perfil}</div>}
            {pq.por_lo_que_me_contaste && <div style={{ fontSize: 13 }}>💬 Por lo que me contaste: {pq.por_lo_que_me_contaste}</div>}
          </div>
        )}
        {typeof payload.aviso === "string" && <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>{payload.aviso}</div>}
      </div>
    );
  }

  if (type === "comparacion") {
    const ops = (payload.opciones as Record<string, unknown>[]) ?? [];
    return (
      <div style={{ ...box, display: "flex", gap: 8, overflowX: "auto" }}>
        {ops.map((o, i) => (
          <div key={i} style={{ minWidth: 160, border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{String(o.nombre ?? "")}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{String(o.aseguradora ?? "")}</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>{money(o.prima_mensual)}</div>
            <List items={o.cubre} title="Cubre" color="#15803d" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "control_cobertura") {
    const niveles = (payload.niveles as Record<string, unknown>[]) ?? [];
    return (
      <div style={box}>
        <div style={{ display: "flex", gap: 8 }}>
          {niveles.map((n, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{String(n.etiqueta ?? "")}</div>
              <div style={{ fontWeight: 700 }}>{money(n.prima_mensual)}</div>
            </div>
          ))}
        </div>
        {typeof payload.nota === "string" && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{payload.nota}</div>}
      </div>
    );
  }

  return <pre style={{ ...box, fontSize: 11, overflowX: "auto" }}>{JSON.stringify(payload, null, 2)}</pre>;
}
