import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Asesor de Seguros con IA — Colsubsidio" },
      {
        name: "description",
        content:
          "Conversa con nuestro asesor y encuentra el seguro Colsubsidio que sí necesitas. Sin formularios, sin letra menuda.",
      },
      { property: "og:title", content: "Asesor de Seguros con IA — Colsubsidio" },
      {
        property: "og:description",
        content: "Un asesor que te escucha antes de recomendarte. Tu seguro ideal en minutos.",
      },
    ],
  }),
  component: Page,
});

type Screen = "s0" | "s1" | "s2";

type Tag = { id: string; label: string; icon: string; tone: "blue" | "yellow" | "graphite" | "olive" };

type ChatMsg = { id: number; from: "assistant" | "user"; text: string };

type Product = {
  key: "mascotas" | "moto" | "salud" | "vida";
  category: string;
  title: string;
  underwriter: string;
  match: number;
  blurb: string;
};

const CATALOG: Product[] = [
  {
    key: "mascotas",
    category: "Mascotas",
    title: "Mascotas Protegidas",
    underwriter: "Respaldo Mapfre",
    match: 98,
    blurb: "Ideal por Firulais y tu presupuesto actual.",
  },
  {
    key: "moto",
    category: "Vehículos (Moto)",
    title: "Moto Tranquila",
    underwriter: "Respaldo Sura",
    match: 82,
    blurb: "Tu Yamaha MT necesita respaldo en la vía.",
  },
  {
    key: "salud",
    category: "Salud Integral",
    title: "Salud Cerca de Ti",
    underwriter: "Respaldo Colsubsidio EPS",
    match: 65,
    blurb: "Protección extra para tu día a día como independiente.",
  },
  {
    key: "vida",
    category: "Vida Individual",
    title: "Vida Contigo",
    underwriter: "Respaldo Bolívar",
    match: 40,
    blurb: "Respaldo para los que más quieres en el futuro.",
  },
];

function Page() {
  const [screen, setScreen] = useState<Screen>("s0");
  return (
    <div className="min-h-screen bg-warm-bg text-brand-graphite font-body selection:bg-brand-yellow/40">
      <SiteHeader />
      {screen === "s0" && <S0Entry onEnter={() => setScreen("s1")} />}
      {screen === "s1" && <S1Conversation onFinish={() => setScreen("s2")} />}
      {screen === "s2" && <S2Close onRestart={() => setScreen("s1")} />}
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
            <a href="#" className="transition-colors hover:text-brand-blue">Seguros</a>
            <a href="#" className="transition-colors hover:text-brand-blue">Vivienda</a>
            <a href="#" className="transition-colors hover:text-brand-blue">Salud</a>
            <a href="#" className="transition-colors hover:text-brand-blue">Recreación</a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-brand-graphite/60 sm:inline">Hola, Juliana</span>
          <div className="grid size-9 place-items-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
            JD
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
      <span className="font-display text-sm font-bold tracking-tight text-brand-blue">
        Colsubsidio
      </span>
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
            Un seguro que <span className="text-brand-blue">sí es para ti</span>,
            elegido conversando.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-brand-graphite/70 md:text-lg">
            Sin formularios largos, sin letra menuda, sin vendedores insistentes.
            Cuéntanos cómo vives y te mostramos, en minutos, cuál de nuestros
            seguros encaja con tu vida — o si no necesitas ninguno.
          </p>
          <ul className="space-y-2 text-sm text-brand-graphite/80">
            {[
              "Una pregunta a la vez, cero jerga de póliza.",
              "Puedes hablar por voz o escribir, como prefieras.",
              "Un asesor humano retoma cuando estés listo — nunca antes.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-brand-blue text-[10px] font-bold text-white">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-in" style={{ animationDelay: "150ms" }}>
          <div className="rounded-[32px] border border-brand-graphite/10 bg-white p-8 shadow-xl shadow-brand-blue/5">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-brand-blue text-lg font-bold text-white shadow-md">
                S
              </div>
              <div>
                <p className="font-display text-base font-semibold text-brand-graphite">
                  Santi, tu asesor
                </p>
                <p className="text-xs text-brand-graphite/60">
                  En línea · te responde en segundos
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-brand-graphite/80">
              Si ya tienes cuenta Colsubsidio, entra con un click.
              Si no, déjanos tu correo — no llenamos formularios.
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

function S1Conversation({ onFinish }: { onFinish: () => void }) {
  const [budget, setBudget] = useState(85_000);
  const [tags, setTags] = useState<Tag[]>([
    { id: "age", label: "28 años", icon: "•", tone: "blue" },
    { id: "single", label: "Soltera", icon: "•", tone: "blue" },
    { id: "pet", label: "Firulais (perro)", icon: "🐶", tone: "yellow" },
    { id: "moto", label: "Moto Yamaha MT", icon: "🏍️", tone: "graphite" },
  ]);
  const [progress, setProgress] = useState(70);
  const [showVoiceHint, setShowVoiceHint] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 1,
      from: "assistant",
      text:
        "¡Hola Juliana! Soy Santi. En unos 3 minutos vamos a encontrar el seguro que sí encaja contigo. Voy a hacerte una pregunta a la vez — puedes escribir o hablar, como prefieras.",
    },
    {
      id: 2,
      from: "assistant",
      text:
        "Veo que Firulais es parte clave de tu día. ¿Te gustaría que un seguro cubra sus urgencias médicas, o también cosas del día a día como peluquería?",
    },
    {
      id: 3,
      from: "user",
      text:
        "Sobre todo emergencias y que me ayuden si llega a morder a alguien sin querer.",
    },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // voice hint reappears every minute for 15s
  useEffect(() => {
    if (!showVoiceHint) {
      const t = setTimeout(() => setShowVoiceHint(true), 60_000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShowVoiceHint(false), 15_000);
    return () => clearTimeout(t);
  }, [showVoiceHint]);

  // ranking recalculated live based on budget + tags
  const ranking = useMemo(() => {
    const hasPet = tags.some((t) => t.id === "pet");
    const hasMoto = tags.some((t) => t.id === "moto");
    return [...CATALOG]
      .map((p) => {
        let m = p.match;
        if (p.key === "mascotas") m = hasPet ? Math.min(99, 60 + Math.round(budget / 3000)) : 30;
        if (p.key === "moto") m = hasMoto ? Math.min(96, 55 + Math.round(budget / 4000)) : 25;
        if (p.key === "salud") m = Math.min(90, 45 + Math.round(budget / 6000));
        if (p.key === "vida") m = Math.min(80, 30 + Math.round(budget / 8000));
        return { ...p, match: m };
      })
      .sort((a, b) => b.match - a.match);
  }, [budget, tags]);

  const recommended = ranking[0];
  const premium = Math.max(28_000, Math.round(budget * 0.52));

  const sendMessage = () => {
    if (!input.trim()) return;
    const next: ChatMsg = { id: Date.now(), from: "user", text: input.trim() };
    setMessages((m) => [...m, next]);
    setInput("");
    setShowVoiceHint(false);
    setProgress((p) => Math.min(95, p + 6));
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          from: "assistant",
          text:
            "Gracias, eso me sirve mucho. Con lo que me cuentas, ya casi tengo tu recomendación lista. ¿Quieres que te la explique en detalle o prefieres verla primero?",
        },
      ]);
    }, 700);
  };

  const removeTag = (id: string) => setTags((prev) => prev.filter((t) => t.id !== id));

  return (
    <main className="mx-auto grid max-w-[1440px] gap-6 px-4 pb-8 pt-6 md:px-8 lg:grid-cols-12 lg:gap-8">
      {/* LEFT */}
      <aside className="animate-in flex flex-col gap-6 lg:col-span-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-blue">
            Siempre pensando en ti
          </h2>
          <p className="mt-1 text-xs text-brand-graphite/60">
            A medida que conversas, aquí guardamos lo que nos cuentas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <TagChip key={t.id} tag={t} onRemove={() => removeTag(t.id)} />
          ))}
        </div>

        <button className="rounded-xl border border-brand-graphite/15 bg-white/60 py-2.5 text-[11px] font-bold uppercase tracking-widest text-brand-graphite transition-colors hover:bg-white">
          Actualizar mis datos
        </button>

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
            <span className="font-display text-4xl font-bold text-brand-blue tracking-tight">
              ${budget.toLocaleString("es-CO")}
            </span>
            <span className="text-sm text-brand-graphite/50">/mes</span>
          </div>
          <input
            type="range"
            min={20_000}
            max={300_000}
            step={5_000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="brand-slider w-full"
          />
          <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-brand-graphite/40">
            <span>$20 mil</span>
            <span>$300 mil</span>
          </div>
          <p className="mt-4 text-[11px] italic leading-relaxed text-brand-graphite/60">
            Mueve el control y el asesor ajusta al instante lo que puede
            recomendarte. Sin compromiso.
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

        <div className="flex items-center gap-2 rounded-full border border-brand-graphite/10 bg-white p-1 self-start text-xs">
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
          {messages.map((m, i) =>
            m.from === "assistant" ? (
              <div key={m.id} className="animate-in flex gap-3" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-blue font-bold text-white shadow-md">
                  S
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-none border border-brand-graphite/10 bg-white p-4 shadow-sm">
                  <p className="text-sm leading-relaxed">{m.text}</p>
                </div>
              </div>
            ) : (
              <div key={m.id} className="animate-in flex flex-row-reverse gap-3">
                <div className="max-w-[80%] rounded-2xl rounded-tr-none border border-brand-blue/15 bg-brand-blue/5 p-4">
                  <p className="text-sm leading-relaxed text-brand-graphite">{m.text}</p>
                </div>
              </div>
            ),
          )}

          <RecommendationCard product={recommended} premium={premium} onFinish={onFinish} />

          <div ref={chatEndRef} />
        </div>

        <ChatComposer
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          showVoiceHint={showVoiceHint && !input}
          onMicClick={() => setMode("voice")}
        />
      </section>

      {/* RIGHT */}
      <aside className="animate-in flex flex-col gap-5 lg:col-span-3" style={{ animationDelay: "150ms" }}>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-graphite">
            Este seguro es para ti
          </h2>
          <p className="mt-1 text-xs text-brand-graphite/60">
            Recalculamos en vivo según lo que cuentas y tu presupuesto.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {ranking.map((p, i) => (
            <RankCard key={p.key} product={p} highlighted={i === 0} />
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 py-3 text-[11px] font-bold uppercase tracking-widest text-brand-blue transition-colors hover:bg-brand-blue/10">
            Comparemos las 3 mejores
          </button>
          <button className="rounded-xl border border-brand-graphite/10 bg-white py-3 text-[11px] font-bold uppercase tracking-widest text-brand-graphite transition-colors hover:bg-brand-graphite/5">
            Calculemos mi categoría
          </button>
        </div>
      </aside>
    </main>
  );
}

/* ------------------------- S1 sub-components ------------------------------ */

function TagChip({ tag, onRemove }: { tag: Tag; onRemove: () => void }) {
  const toneMap: Record<Tag["tone"], string> = {
    blue: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
    yellow: "bg-brand-yellow/25 text-brand-graphite border-brand-yellow/50",
    graphite: "bg-brand-graphite/10 text-brand-graphite border-brand-graphite/15",
    olive: "bg-[#eef1eb] text-brand-graphite border-brand-graphite/10",
  };
  return (
    <span
      className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneMap[tag.tone]}`}
    >
      <span aria-hidden>{tag.icon}</span>
      {tag.label}
      <button
        onClick={onRemove}
        aria-label={`Quitar ${tag.label}`}
        className="ml-1 text-current opacity-40 transition-opacity hover:opacity-100"
      >
        ×
      </button>
    </span>
  );
}

function RecommendationCard({
  product,
  premium,
  onFinish,
}: {
  product: Product;
  premium: number;
  onFinish: () => void;
}) {
  return (
    <div className="animate-in overflow-hidden rounded-[28px] border border-brand-graphite/10 bg-white shadow-xl shadow-brand-blue/5">
      <div className="flex flex-col gap-6 p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-block rounded bg-brand-yellow px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-brand-graphite">
              Recomendado para ti
            </span>
            <h3 className="font-display text-2xl font-bold leading-tight text-brand-blue">
              {product.title}
            </h3>
            <p className="mt-1 text-xs text-brand-graphite/60">{product.underwriter}</p>
          </div>
          <div className="text-right">
            <span className="font-display text-3xl font-bold text-brand-graphite">
              ${premium.toLocaleString("es-CO")}
            </span>
            <span className="block text-[11px] text-brand-graphite/50">al mes</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-graphite/10 bg-warm-bg-soft p-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-graphite/50">
              Por tu perfil
            </p>
            <p className="text-xs font-medium leading-relaxed">
              Como vives sola con Firulais, priorizamos veterinario a domicilio
              y respuesta rápida ante urgencias.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-blue/15 bg-brand-blue/5 p-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-blue/70">
              Por lo que nos contaste
            </p>
            <p className="text-xs font-medium leading-relaxed">
              Mencionaste el temor de que muerda a alguien: incluimos protección
              por daños a terceros.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-graphite/50">
              Lo que te cubre
            </p>
            <div className="flex flex-wrap gap-2">
              {["Urgencias veterinarias 24/7", "Vacunación anual", "Daños a otros por mordida", "Consulta a domicilio"].map(
                (c) => (
                  <span
                    key={c}
                    className="rounded-full border border-brand-graphite/15 bg-white px-3 py-1.5 text-xs font-medium"
                  >
                    ✓ {c}
                  </span>
                ),
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-brand-graphite/50">
              Lo que no cubre
            </p>
            <div className="flex flex-wrap gap-2">
              {["Enfermedades previas al seguro", "Estética o peluquería", "Viajes fuera del país"].map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-brand-graphite/15 bg-brand-graphite/5 px-3 py-1.5 text-xs font-medium text-brand-graphite/70"
                >
                  × {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-graphite/10 bg-warm-bg-soft px-6 py-4 md:px-7">
        <p className="text-[11px] italic text-brand-graphite/60">
          Precio real de nuestro catálogo, verificado al momento.
        </p>
        <div className="flex gap-2">
          <button className="rounded-xl border border-brand-graphite/15 bg-white px-4 py-2.5 text-xs font-semibold text-brand-graphite transition-colors hover:bg-warm-bg">
            No es lo que busco
          </button>
          <button
            onClick={onFinish}
            className="rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-blue/20 transition-transform hover:scale-[1.02]"
          >
            Me gusta, ¿qué sigue?
          </button>
        </div>
      </div>
    </div>
  );
}

function RankCard({ product, highlighted }: { product: Product; highlighted: boolean }) {
  if (highlighted) {
    return (
      <div className="rounded-2xl border-2 border-brand-yellow bg-brand-yellow/10 p-5">
        <div className="mb-2 flex items-start justify-between">
          <span className="font-display text-sm font-bold text-brand-blue">{product.category}</span>
          <span className="rounded bg-brand-yellow px-2 py-0.5 text-[10px] font-black text-brand-graphite">
            {product.match}% MATCH
          </span>
        </div>
        <p className="text-xs leading-relaxed text-brand-graphite/80">{product.blurb}</p>
        <button className="mt-3 text-[10px] font-bold uppercase tracking-widest text-brand-blue">
          ¿Te explico a profundidad?
        </button>
      </div>
    );
  }
  return (
    <div className="group rounded-2xl border border-brand-graphite/10 bg-white p-4 transition-all hover:border-brand-blue/30 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <span className="font-display text-sm font-bold text-brand-graphite">{product.category}</span>
        <span className="text-[10px] font-bold text-brand-blue">{product.match}%</span>
      </div>
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-brand-graphite/10">
        <div
          className="h-full rounded-full bg-brand-blue/60 transition-all duration-500"
          style={{ width: `${product.match}%` }}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-brand-graphite/70">{product.blurb}</p>
    </div>
  );
}

function ChatComposer({
  input,
  setInput,
  onSend,
  showVoiceHint,
  onMicClick,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
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
          disabled={!input.trim()}
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

/* --------------------------------- S2 ------------------------------------- */

function S2Close({ onRestart }: { onRestart: () => void }) {
  return (
    <main className="mx-auto max-w-[900px] px-6 py-16 md:px-8">
      <div className="animate-in rounded-[32px] border border-brand-graphite/10 bg-white p-8 shadow-xl shadow-brand-blue/5 md:p-12">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-brand-yellow text-2xl">
            🤝
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
              Tu conversación con Santi
            </p>
            <h1 className="font-display text-2xl font-bold text-brand-graphite md:text-3xl">
              Esto es lo que quedó claro entre nosotros
            </h1>
          </div>
        </div>

        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-brand-graphite/80">
          No firmaste nada ni pagaste nada. Guardamos tu conversación para que
          un asesor humano de Colsubsidio te contacte y termine el proceso
          contigo — sin sorpresas ni letra menuda.
        </p>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <SummaryTile label="Seguro elegido" value="Mascotas Protegidas" hint="Respaldo Mapfre" />
          <SummaryTile label="Inversión mensual" value="$44.200" hint="Dentro de tu presupuesto" />
          <SummaryTile
            label="Lo más importante para ti"
            value="Urgencias 24/7 y daños a terceros"
            hint="Por lo que conversamos"
          />
          <SummaryTile label="Qué falta" value="Firma con un asesor humano" hint="Te llamamos hoy o cuando prefieras" />
        </div>

        <div className="mb-8 rounded-2xl border border-brand-blue/15 bg-brand-blue/5 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue/70">
            Qué sigue, honestamente
          </p>
          <p className="mt-2 text-sm leading-relaxed text-brand-graphite">
            En las próximas horas, Laura — asesora Colsubsidio — retoma tu
            conversación. Solo para confirmar datos, resolver dudas y firmar
            cuando estés lista. Puedes decir que no en cualquier momento.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onRestart}
            className="rounded-xl border border-brand-graphite/15 bg-white px-5 py-3 text-xs font-bold uppercase tracking-widest text-brand-graphite hover:bg-warm-bg"
          >
            Cambié de opinión
          </button>
          <button className="rounded-xl bg-brand-blue px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-blue/20 transition-transform hover:scale-[1.02]">
            Está bien, que me llamen
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
      <p className="mt-1 text-xs text-brand-graphite/60">{hint}</p>
    </div>
  );
}
