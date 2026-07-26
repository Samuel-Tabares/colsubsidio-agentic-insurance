"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAseguraChannel,
  type Msg,
  type Tag,
  type RankItem,
} from "@/hooks/use-asegura-channel";

/**
 * Web-chat de Colsubsidio ("Asegura"). Diseño de Sarah (portado de Lovable)
 * cableado al backend real vía `useAseguraChannel`: el chat, los tags de perfil,
 * el ranking en vivo y el presupuesto salen todos de datos, no de mocks.
 *
 * Cosmético a propósito (sin backend en el MVP): el "login" de S0 y el toggle de
 * voz. La persona del header es genérica (no hay PII: el cliente es un id web
 * anónimo).
 */

const MONEY = new Intl.NumberFormat("es-CO");
const BUDGET_MIN = 20_000;
const BUDGET_MAX = 300_000;

type Screen = "s0" | "s1" | "s2";

export function SurfaceAsegura() {
  const ch = useAseguraChannel("web");
  const [screen, setScreen] = useState<Screen>("s0");

  // El cierre del bot lleva a la pantalla de resumen.
  const cierre = useMemo(
    () => [...ch.messages].reverse().find((m) => m.type === "cierre") ?? null,
    [ch.messages]
  );
  useEffect(() => {
    if (cierre) setScreen("s2");
  }, [cierre]);

  const startIfEmpty = () => {
    if (ch.messages.length === 0) void ch.send("Hola, quiero asesoría");
    setScreen("s1");
  };

  return (
    <div className="min-h-screen bg-warm-bg font-body text-brand-graphite selection:bg-brand-yellow/40">
      <SiteHeader />
      {screen === "s0" && <S0Entry onEnter={startIfEmpty} />}
      {screen === "s1" && <S1Conversation ch={ch} />}
      {screen === "s2" && <S2Close cierre={cierre} resumen={ch.analisis?.resumen} onRestart={() => setScreen("s1")} />}
    </div>
  );
}

/* --------------------------------- Header --------------------------------- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-brand-graphite/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden gap-6 text-xs font-semibold uppercase tracking-[0.14em] text-brand-graphite/60 md:flex">
            <span className="cursor-default">Seguros</span>
            <span className="cursor-default">Vivienda</span>
            <span className="cursor-default">Salud</span>
            <span className="cursor-default">Recreación</span>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-brand-graphite/60 sm:inline">Hola 👋</span>
          <div className="grid size-9 place-items-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
            Tú
          </div>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-8 place-items-center rounded-md bg-brand-yellow">
        <div className="size-3 rounded-full bg-brand-blue" />
      </div>
      <span className="font-display text-sm font-bold tracking-tight text-brand-blue">Colsubsidio</span>
    </div>
  );
}

/* --------------------------------- S0 ------------------------------------- */

function S0Entry({ onEnter }: { onEnter: () => void }) {
  const [email, setEmail] = useState("");
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-16 md:px-8 md:py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div className="animate-in space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-yellow/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-graphite">
            Asesor de seguros · IA
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.05] text-brand-graphite md:text-6xl">
            Un seguro que <span className="text-brand-blue">sí es para ti</span>, elegido conversando.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-brand-graphite/70 md:text-lg">
            Sin formularios largos, sin letra menuda, sin vendedores insistentes. Cuéntanos cómo
            vives y te mostramos, en minutos, cuál de nuestros seguros encaja con tu vida — o si no
            necesitas ninguno.
          </p>
          <ul className="space-y-2 text-sm text-brand-graphite/80">
            {[
              "Una pregunta a la vez, cero jerga de póliza.",
              "Escribe con naturalidad, como le contarías a alguien de confianza.",
              "Un asesor humano retoma cuando estés listo — nunca antes.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-brand-blue text-[10px] font-bold text-white">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-in" style={{ animationDelay: "150ms" }}>
          <div className="rounded-[32px] border border-brand-graphite/10 bg-white p-8 shadow-xl shadow-brand-blue/5">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-brand-blue text-lg font-bold text-white shadow-md">
                A
              </div>
              <div>
                <p className="font-display text-base font-semibold text-brand-graphite">
                  Asegura, tu asesor
                </p>
                <p className="text-xs text-brand-graphite/60">En línea · te responde en segundos</p>
              </div>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-brand-graphite/80">
              Si ya tienes cuenta Colsubsidio, entra con un click. Si no, déjanos tu correo — no
              llenamos formularios.
            </p>

            <button
              onClick={onEnter}
              className="mb-3 w-full rounded-2xl bg-brand-blue px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-transform hover:scale-[1.01]"
            >
              Entrar con mi cuenta Colsubsidio
            </button>

            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-brand-graphite/40">
              <div className="h-px flex-1 bg-brand-graphite/10" />
              o
              <div className="h-px flex-1 bg-brand-graphite/10" />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-brand-graphite/15 bg-warm-bg px-4 py-2.5 focus-within:border-brand-blue/50">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu correo aquí"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-brand-graphite/40"
              />
              <button
                onClick={onEnter}
                className="rounded-xl bg-brand-yellow px-4 py-2 text-xs font-bold text-brand-graphite transition-transform hover:scale-[1.03]"
              >
                Empezar
              </button>
            </div>
            <p className="mt-4 text-[11px] text-brand-graphite/50">
              Solo lo usaremos para guardar tu conversación. Nada de spam ni llamadas sorpresa.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/* --------------------------------- S1 ------------------------------------- */

type Channel = ReturnType<typeof useAseguraChannel>;

function S1Conversation({ ch }: { ch: Channel }) {
  const [budget, setBudget] = useState(85_000);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [showVoiceHint, setShowVoiceHint] = useState(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const seededBudget = useRef(false);

  // Semilla del slider desde el presupuesto persistido (una sola vez).
  useEffect(() => {
    if (!seededBudget.current && typeof ch.presupuestoInicial === "number") {
      setBudget(ch.presupuestoInicial);
      seededBudget.current = true;
    }
  }, [ch.presupuestoInicial]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ch.messages.length]);

  useEffect(() => {
    if (!showVoiceHint) {
      const t = setTimeout(() => setShowVoiceHint(true), 60_000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShowVoiceHint(false), 15_000);
    return () => clearTimeout(t);
  }, [showVoiceHint]);

  const progress = useMemo(() => computeProgress(ch.messages), [ch.messages]);
  const budgetPct = ((budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100;

  const onSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setShowVoiceHint(false);
    void ch.send(text);
  };

  const onBudgetChange = (v: number) => {
    setBudget(v);
    ch.setBudget(v);
  };

  return (
    <main className="mx-auto grid max-w-[1440px] gap-6 px-4 pb-8 pt-6 md:px-8 lg:grid-cols-12 lg:gap-8">
      {/* LEFT */}
      <aside className="animate-in flex flex-col gap-6 lg:col-span-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-blue">Siempre pensando en ti</h2>
          <p className="mt-1 text-xs text-brand-graphite/60">
            A medida que conversas, aquí guardamos lo que nos cuentas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ch.tags.length === 0 ? (
            <p className="text-xs italic text-brand-graphite/40">
              Todavía no tengo datos tuyos. Cuéntame algo y verás aparecer aquí lo que voy entendiendo.
            </p>
          ) : (
            ch.tags.map((t) => <TagChip key={t.id} tag={t} />)
          )}
        </div>

        <div className="mt-auto rounded-3xl border border-brand-graphite/10 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-brand-graphite/50">
              Cuánto puedo pagar al mes
            </label>
            <span className="rounded-full bg-brand-yellow/40 px-2 py-0.5 text-[10px] font-bold text-brand-graphite">
              {budget < 60_000 ? "Esencial" : budget < 130_000 ? "Balanceado" : "Amplio"}
            </span>
          </div>
          <div className="mb-4 flex items-baseline gap-1">
            <span className="font-display text-4xl font-bold tracking-tight text-brand-blue">
              ${MONEY.format(budget)}
            </span>
            <span className="text-sm text-brand-graphite/50">/mes</span>
          </div>
          <input
            type="range"
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={5_000}
            value={budget}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
            className="brand-slider w-full"
            style={{ ["--val" as string]: `${budgetPct}%` }}
          />
          <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-brand-graphite/40">
            <span>$20 mil</span>
            <span>$300 mil</span>
          </div>
          <p className="mt-4 text-[11px] italic leading-relaxed text-brand-graphite/60">
            Mueve el control y el asesor ajusta tu recomendación en el siguiente mensaje. Sin
            compromiso.
          </p>
        </div>
      </aside>

      {/* CENTER */}
      <section className="flex flex-col gap-5 lg:col-span-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-brand-graphite/50">
            <span>Cada vez más cerca a tu seguro ideal</span>
            <span className="text-brand-blue">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-graphite/10">
            <div
              className="h-full rounded-full bg-brand-yellow transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-start rounded-full border border-brand-graphite/10 bg-white p-1 text-xs">
          <button
            onClick={() => setMode("text")}
            className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
              mode === "text" ? "bg-brand-blue text-white" : "text-brand-graphite/60"
            }`}
          >
            Escribir
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
              mode === "voice" ? "bg-brand-blue text-white" : "text-brand-graphite/60"
            }`}
          >
            Hablar por voz
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {ch.messages.map((m, i) => (
            <MessageRow key={m.id} m={m} i={i} onReply={(t) => ch.send(t)} />
          ))}
          {mode === "voice" && (
            <p className="self-center rounded-full bg-brand-graphite/5 px-3 py-1 text-[11px] italic text-brand-graphite/50">
              La voz llega pronto — por ahora escríbeme y seguimos.
            </p>
          )}
          <div ref={chatEndRef} />
        </div>

        <ChatComposer
          input={input}
          setInput={setInput}
          onSend={onSend}
          sending={ch.sending}
          showVoiceHint={showVoiceHint && !input}
          onMicClick={() => setMode("voice")}
        />
      </section>

      {/* RIGHT */}
      <aside className="animate-in flex flex-col gap-5 lg:col-span-3" style={{ animationDelay: "150ms" }}>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-graphite">Este seguro es para ti</h2>
          <p className="mt-1 text-xs text-brand-graphite/60">
            Recalculamos según lo que cuentas y tu presupuesto.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {ch.ranking.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-graphite/15 bg-white/50 p-5 text-xs italic text-brand-graphite/50">
              Tu ranking aparece aquí a medida que conversamos.
            </div>
          ) : (
            ch.ranking.map((p, i) => <RankCard key={p.familia} product={p} highlighted={i === 0} />)
          )}
        </div>
      </aside>
    </main>
  );
}

/* ------------------------- render de mensajes ---------------------------- */

function MessageRow({
  m,
  i,
  onReply,
}: {
  m: Msg;
  i: number;
  onReply: (text: string) => void;
}) {
  const isBot = m.direction === "out";

  // Tarjetas ricas.
  if (m.payload && (m.type === "recomendacion" || m.type === "cierre")) {
    return <RecommendationCard payload={m.payload} onReply={onReply} />;
  }
  if (m.payload && m.type === "comparacion") {
    return <ComparacionCard payload={m.payload} />;
  }
  if (m.payload && m.type === "control_cobertura") {
    return <ControlCoberturaCard payload={m.payload} />;
  }

  // Texto simple.
  if (!m.text) return null;
  return isBot ? (
    <div className="animate-in flex gap-3" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-blue font-bold text-white shadow-md">
        A
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-tl-none border border-brand-graphite/10 bg-white p-4 shadow-sm">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
      </div>
    </div>
  ) : (
    <div className="animate-in flex flex-row-reverse gap-3">
      <div className="max-w-[80%] rounded-2xl rounded-tr-none border border-brand-blue/15 bg-brand-blue/5 p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-graphite">{m.text}</p>
      </div>
    </div>
  );
}

/* ------------------------- sub-componentes S1 ---------------------------- */

function TagChip({ tag }: { tag: Tag }) {
  const toneMap: Record<NonNullable<Tag["tone"]>, string> = {
    blue: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
    yellow: "bg-brand-yellow/25 text-brand-graphite border-brand-yellow/50",
    graphite: "bg-brand-graphite/10 text-brand-graphite border-brand-graphite/15",
    olive: "bg-[#eef1eb] text-brand-graphite border-brand-graphite/10",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneMap[tag.tone ?? "blue"]}`}
    >
      {tag.icon && <span aria-hidden>{tag.icon}</span>}
      {tag.label}
    </span>
  );
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function RecommendationCard({
  payload,
  onReply,
}: {
  payload: Record<string, unknown>;
  onReply: (text: string) => void;
}) {
  const porQue = (payload.por_que as { por_tu_perfil?: string; por_lo_que_me_contaste?: string }) ?? {};
  const cubre = strList(payload.cubre);
  const noCubre = strList(payload.no_cubre);
  const esCierre = typeof payload.aviso === "string";

  return (
    <div className="animate-in overflow-hidden rounded-[28px] border border-brand-graphite/10 bg-white shadow-xl shadow-brand-blue/5">
      <div className="flex flex-col gap-6 p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-block rounded bg-brand-yellow px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-brand-graphite">
              {esCierre ? "Tu seguro elegido" : "Recomendado para ti"}
            </span>
            <h3 className="font-display text-2xl font-bold leading-tight text-brand-blue">
              {String(payload.nombre ?? "")}
            </h3>
            <p className="mt-1 text-xs text-brand-graphite/60">{String(payload.aseguradora ?? "")}</p>
          </div>
          <div className="text-right">
            <span className="font-display text-3xl font-bold text-brand-graphite">
              ${MONEY.format(num(payload.prima_mensual))}
            </span>
            <span className="block text-[11px] text-brand-graphite/50">al mes</span>
          </div>
        </div>

        {(porQue.por_tu_perfil || porQue.por_lo_que_me_contaste) && (
          <div className="grid gap-3 md:grid-cols-2">
            {porQue.por_tu_perfil && (
              <div className="rounded-2xl border border-brand-graphite/10 bg-warm-bg-soft p-4">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-graphite/50">
                  Por tu perfil
                </p>
                <p className="text-xs font-medium leading-relaxed">{porQue.por_tu_perfil}</p>
              </div>
            )}
            {porQue.por_lo_que_me_contaste && (
              <div className="rounded-2xl border border-brand-blue/15 bg-brand-blue/5 p-4">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-blue/70">
                  Por lo que nos contaste
                </p>
                <p className="text-xs font-medium leading-relaxed">{porQue.por_lo_que_me_contaste}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {cubre.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-graphite/50">
                Lo que te cubre
              </p>
              <div className="flex flex-wrap gap-2">
                {cubre.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-brand-graphite/15 bg-white px-3 py-1.5 text-xs font-medium"
                  >
                    ✓ {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {noCubre.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-graphite/50">
                Lo que no cubre
              </p>
              <div className="flex flex-wrap gap-2">
                {noCubre.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-brand-graphite/15 bg-brand-graphite/5 px-3 py-1.5 text-xs font-medium text-brand-graphite/70"
                  >
                    × {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!esCierre && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-graphite/10 bg-warm-bg-soft px-6 py-4 md:px-7">
          <p className="text-[11px] italic text-brand-graphite/60">
            Precio de nuestro catálogo, sin sorpresas.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onReply("No es lo que busco, ¿qué otras opciones tengo?")}
              className="rounded-xl border border-brand-graphite/15 bg-white px-4 py-2.5 text-xs font-semibold text-brand-graphite transition-colors hover:bg-warm-bg"
            >
              No es lo que busco
            </button>
            <button
              onClick={() => onReply("Me gusta, lo quiero. ¿Qué sigue?")}
              className="rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-blue/20 transition-transform hover:scale-[1.02]"
            >
              Me gusta, ¿qué sigue?
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComparacionCard({ payload }: { payload: Record<string, unknown> }) {
  const opciones = (payload.opciones as Record<string, unknown>[]) ?? [];
  return (
    <div className="animate-in rounded-2xl border border-brand-graphite/10 bg-white p-4 shadow-sm">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-graphite/50">
        Para que compares con calma
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {opciones.map((o, i) => (
          <div
            key={i}
            className="min-w-[180px] rounded-2xl border border-brand-graphite/10 bg-warm-bg-soft p-4"
          >
            <p className="font-display text-sm font-bold text-brand-graphite">{String(o.nombre ?? "")}</p>
            <p className="text-[11px] text-brand-graphite/60">{String(o.aseguradora ?? "")}</p>
            <p className="mt-2 font-display text-lg font-bold text-brand-blue">
              ${MONEY.format(num(o.prima_mensual))}
              <span className="text-[11px] font-normal text-brand-graphite/50"> /mes</span>
            </p>
            <ul className="mt-2 space-y-1">
              {strList(o.cubre).slice(0, 3).map((c) => (
                <li key={c} className="text-[11px] leading-snug text-brand-graphite/70">
                  ✓ {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function ControlCoberturaCard({ payload }: { payload: Record<string, unknown> }) {
  const niveles = (payload.niveles as Record<string, unknown>[]) ?? [];
  return (
    <div className="animate-in rounded-2xl border border-brand-graphite/10 bg-white p-4 shadow-sm">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-graphite/50">
        Ajusta tu cobertura
      </p>
      <div className="flex gap-2">
        {niveles.map((n, i) => {
          const destacado = String(n.etiqueta ?? "").toLowerCase().includes("recomend");
          return (
            <div
              key={i}
              className={`flex-1 rounded-xl border p-3 text-center ${
                destacado
                  ? "border-brand-yellow bg-brand-yellow/10"
                  : "border-brand-graphite/10 bg-warm-bg-soft"
              }`}
            >
              <p className="text-[11px] font-bold text-brand-graphite">{String(n.etiqueta ?? "")}</p>
              <p className="mt-1 font-display font-bold text-brand-blue">
                ${MONEY.format(num(n.prima_mensual))}
              </p>
            </div>
          );
        })}
      </div>
      {typeof payload.nota === "string" && (
        <p className="mt-3 text-[11px] italic leading-relaxed text-brand-graphite/60">{payload.nota}</p>
      )}
    </div>
  );
}

function RankCard({ product, highlighted }: { product: RankItem; highlighted: boolean }) {
  const categoria = categoriaDe(product.familia);
  if (highlighted) {
    return (
      <div className="rounded-2xl border-2 border-brand-yellow bg-brand-yellow/10 p-5">
        <div className="mb-2 flex items-start justify-between">
          <span className="font-display text-sm font-bold text-brand-blue">{categoria}</span>
          <span className="rounded bg-brand-yellow px-2 py-0.5 text-[10px] font-black text-brand-graphite">
            {product.match}% MATCH
          </span>
        </div>
        {product.blurb && (
          <p className="text-xs leading-relaxed text-brand-graphite/80">{product.blurb}</p>
        )}
      </div>
    );
  }
  return (
    <div className="group rounded-2xl border border-brand-graphite/10 bg-white p-4 transition-all hover:border-brand-blue/30 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <span className="font-display text-sm font-bold text-brand-graphite">{categoria}</span>
        <span className="text-[10px] font-bold text-brand-blue">{product.match}%</span>
      </div>
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-brand-graphite/10">
        <div
          className="h-full rounded-full bg-brand-blue/60 transition-all duration-500"
          style={{ width: `${product.match}%` }}
        />
      </div>
      {product.blurb && (
        <p className="text-[11px] leading-relaxed text-brand-graphite/70">{product.blurb}</p>
      )}
    </div>
  );
}

function ChatComposer({
  input,
  setInput,
  onSend,
  sending,
  showVoiceHint,
  onMicClick,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  showVoiceHint: boolean;
  onMicClick: () => void;
}) {
  return (
    <div className="relative flex items-center gap-3">
      <div className="flex h-14 flex-1 items-center gap-3 rounded-2xl border border-brand-graphite/15 bg-white px-4 shadow-sm focus-within:border-brand-blue/40">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Escribe aquí o toca el micrófono para hablar…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-brand-graphite/40"
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || sending}
          className="grid size-10 place-items-center rounded-xl bg-brand-blue text-white shadow-md transition-transform hover:scale-105 disabled:opacity-40"
          aria-label="Enviar"
        >
          →
        </button>
      </div>

      <div className="relative shrink-0">
        <div className="animate-pulse-ring absolute inset-0 rounded-full bg-brand-yellow" />
        <button
          onClick={onMicClick}
          aria-label="Hablar por voz"
          className="relative grid size-14 place-items-center rounded-full bg-brand-yellow text-brand-graphite shadow-lg transition-transform hover:scale-105"
        >
          <MicIcon />
        </button>
        {showVoiceHint && (
          <div className="animate-soft-bounce absolute -top-11 right-0 whitespace-nowrap rounded-full bg-brand-graphite px-3 py-1.5 text-[10px] font-semibold text-white shadow-xl">
            ¿Prefieres hablarme? Toca aquí
            <span className="absolute -bottom-1 right-6 size-2 rotate-45 bg-brand-graphite" />
          </div>
        )}
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

/* --------------------------------- S2 ------------------------------------- */

function S2Close({
  cierre,
  resumen,
  onRestart,
}: {
  cierre: Msg | null;
  resumen?: string;
  onRestart: () => void;
}) {
  const p = (cierre?.payload ?? {}) as Record<string, unknown>;
  const nombre = String(p.nombre ?? "Tu seguro");
  const aseguradora = String(p.aseguradora ?? "");
  const prima = num(p.prima_mensual);
  const cubre = strList(p.cubre);

  return (
    <main className="mx-auto max-w-[900px] px-6 py-16 md:px-8">
      <div className="animate-in rounded-[32px] border border-brand-graphite/10 bg-white p-8 shadow-xl shadow-brand-blue/5 md:p-12">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-brand-yellow text-2xl">🤝</div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
              Tu conversación con Asegura
            </p>
            <h1 className="font-display text-2xl font-bold text-brand-graphite md:text-3xl">
              Esto es lo que quedó claro entre nosotros
            </h1>
          </div>
        </div>

        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-brand-graphite/80">
          No firmaste nada ni pagaste nada. Guardamos tu conversación para que un asesor humano de
          Colsubsidio te contacte y termine el proceso contigo — sin sorpresas ni letra menuda.
        </p>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <SummaryTile label="Seguro elegido" value={nombre} hint={aseguradora} />
          <SummaryTile
            label="Inversión mensual"
            value={prima ? `$${MONEY.format(prima)}` : "Por confirmar"}
            hint="al mes"
          />
          <SummaryTile
            label="Lo más importante para ti"
            value={cubre[0] ?? "Lo que conversamos"}
            hint="Por lo que nos contaste"
          />
          <SummaryTile
            label="Qué falta"
            value="Firma con un asesor humano"
            hint="Te contactamos cuando prefieras"
          />
        </div>

        {resumen && (
          <div className="mb-8 rounded-2xl border border-brand-blue/15 bg-brand-blue/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue/70">
              Cómo te leí
            </p>
            <p className="mt-2 text-sm leading-relaxed text-brand-graphite">{resumen}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onRestart}
            className="rounded-xl border border-brand-graphite/15 bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-brand-graphite hover:bg-warm-bg"
          >
            Cambié de opinión
          </button>
          <button className="rounded-xl bg-brand-blue px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-blue/20 transition-transform hover:scale-[1.02]">
            Está bien, que me contacten
          </button>
        </div>
      </div>
    </main>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-brand-graphite/10 bg-warm-bg-soft p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-graphite/50">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-brand-graphite">{value}</p>
      {hint && <p className="mt-1 text-xs text-brand-graphite/60">{hint}</p>}
    </div>
  );
}

/* --------------------------------- utils ---------------------------------- */

function categoriaDe(familia: string): string {
  const m: Record<string, string> = {
    vida: "Vida",
    salud: "Salud Integral",
    accidentes: "Accidentes Personales",
    hogar: "Hogar",
    mascotas: "Mascotas",
    viajes: "Viajes",
  };
  return m[familia] ?? familia.charAt(0).toUpperCase() + familia.slice(1);
}

function computeProgress(messages: Msg[]): number {
  if (messages.some((m) => m.type === "cierre")) return 100;
  const turnos = messages.filter((m) => m.direction === "in" && m.type === "text").length;
  let p = Math.min(95, 20 + turnos * 12);
  if (messages.some((m) => m.type === "recomendacion")) p = Math.max(p, 88);
  return p;
}
