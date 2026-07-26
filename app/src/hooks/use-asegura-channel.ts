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

function idNuevo(canal: Canal): string {
  return canal === "whatsapp"
    ? `57300${Math.floor(1000000 + Math.random() * 8999999)}`
    : `web_${Math.random().toString(36).slice(2, 10)}`;
}

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
  const fresh = idNuevo(canal);
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
  // Arranque nuevo pendiente para el próximo fetch de sesión: `serie` solo
  // aplica la primera vez que se crea el contacto (ver ensureSession), y
  // `saludo` marca que hay que mandar el mensaje de apertura apenas la sesión
  // quede lista (no se puede mandar antes: la ingesta necesita el `id` y el
  // perfil ya resueltos, si no corre el riesgo de una carrera con la
  // creación del contacto). Un ref porque no necesita re-render propio.
  const arranqueNuevo = useRef<{ serie?: string; saludo: boolean } | null>(null);

  useEffect(() => {
    setId(resolveId(canal));
  }, [canal]);

  /** Arranca una conversación NUEVA de verdad: id fresco (ignora localStorage
   * guardado), estado local reseteado, perfil resuelto por `serie` si se da. */
  const startNew = useCallback(
    (serie?: string) => {
      const fresh = idNuevo(canal);
      localStorage.setItem(`asegura_id_${canal}`, fresh);
      arranqueNuevo.current = { serie, saludo: true };
      setMessages([]);
      setAnalisis(null);
      setPresupuestoInicial(null);
      setId(fresh);
    },
    [canal]
  );

  // Arranque en frío / handoff por id.
  useEffect(() => {
    if (!id) return;
    const pendiente = arranqueNuevo.current;
    arranqueNuevo.current = null;
    const qs = new URLSearchParams({ id, canal });
    if (pendiente?.serie) qs.set("serie", pendiente.serie);
    fetch(`/api/channels/web/session?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.mensajes ?? []);
        setAnalisis(d.analisis ?? null);
        setPresupuestoInicial(typeof d.presupuesto === "number" ? d.presupuesto : null);
        // Conversación recién creada (arranca vacía): dispara el mensaje de
        // apertura acá, con el `id` de este mismo fetch (no vía el `send()`
        // del hook, que podría seguir cerrado sobre el `id` anterior en este
        // mismo ciclo de render).
        if (pendiente?.saludo && (d.mensajes ?? []).length === 0) {
          const texto = "Hola, quiero asesoría";
          setMessages((prev) => [
            ...prev,
            {
              id: `local_${Date.now()}`,
              direction: "in",
              type: "text",
              text: texto,
              payload: null,
              createdAt: new Date().toISOString(),
            },
          ]);
          void fetch("/api/channels/web/messages", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, text: texto, canal }),
          }).catch(() => {});
        }
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
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        // El eco real del mensaje del usuario llega por acá con id real
        // (msg_...). La burbuja optimista de `send()` usa un id sintético
        // (local_...) que nunca va a matchear por id — reconciliar por texto
        // en vez de duplicar (bug real: cada mensaje de usuario se veía dos
        // veces, siempre, determinista).
        if (m.direction === "in") {
          const idx = prev.findIndex((x) => x.id.startsWith("local_") && x.text === m.text);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = m;
            return next;
          }
        }
        return [...prev, m];
      });
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

  return {
    id,
    messages,
    analisis,
    tags,
    ranking,
    presupuestoInicial,
    sending,
    send,
    setBudget,
    startNew,
  };
}
