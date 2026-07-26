import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { decidirTurno, isCerebroActive } from "@/lib/cerebro";
import { CerebroResponse, type CerebroHistMsg } from "@/lib/cerebro/types";

/**
 * Contrato del cerebro + recorrido del stub. Si el stub deja de cumplir el
 * contrato o de conducir la conversación, el sistema completo se cae; este test
 * lo blinda sin depender del repo de Jhon ni de un LLM.
 */

function hist(...turns: string[]): CerebroHistMsg[] {
  // Intercala cliente/bot; el stub cuenta los turnos del cliente.
  const out: CerebroHistMsg[] = [];
  for (const t of turns) {
    out.push({ rol: "cliente", texto: t });
    out.push({ rol: "bot", texto: "…" });
  }
  return out;
}

describe("isCerebroActive (CEREBRO_MODE)", () => {
  const prev = process.env.CEREBRO_MODE;
  const prevUrl = process.env.CEREBRO_URL;
  afterEach(() => {
    process.env.CEREBRO_MODE = prev;
    process.env.CEREBRO_URL = prevUrl;
  });

  it("stub → activo; vocero → inactivo; external sin URL → inactivo", () => {
    process.env.CEREBRO_MODE = "stub";
    expect(isCerebroActive()).toBe(true);
    process.env.CEREBRO_MODE = "vocero";
    expect(isCerebroActive()).toBe(false);
    process.env.CEREBRO_MODE = "external";
    delete process.env.CEREBRO_URL;
    expect(isCerebroActive()).toBe(false);
    process.env.CEREBRO_URL = "https://cerebro.example";
    expect(isCerebroActive()).toBe(true);
  });
});

describe("stub del cerebro (recorrido)", () => {
  beforeEach(() => {
    process.env.CEREBRO_MODE = "stub";
  });

  it("primer turno saluda y arranca el discovery", async () => {
    const r = await decidirTurno({ clienteId: "web_1", canal: "web", historial: hist("hola") });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(CerebroResponse.safeParse(r.data).success).toBe(true);
    expect(r.data.fase).toBe("Prospecto");
    expect(r.data.mensajes.some((m) => /Asegura/i.test(m.texto ?? ""))).toBe(true);
  });

  it("tras el discovery entrega una recomendación con razón de dos patas", async () => {
    const r = await decidirTurno({
      clienteId: "web_1",
      canal: "web",
      historial: hist("hola", "mi mamá depende de mí", "arrendado", "droguería seguido", "ok"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const reco = r.data.mensajes.find((m) => m.tipo === "recomendacion");
    expect(reco).toBeTruthy();
    const pq = (reco!.payload as Record<string, unknown>).por_que as Record<string, unknown>;
    expect(pq.por_tu_perfil).toBeTruthy();
    expect(pq.por_lo_que_me_contaste).toBeTruthy();
    expect(r.data.fase).toBe("Cotización / negociación");
    expect(r.data.analisis?.familia).toBe("vida"); // dependientes → vida
  });

  it("al aceptar cierra: tarjeta de cierre + fase ganada + handoff", async () => {
    const r = await decidirTurno({
      clienteId: "web_1",
      canal: "web",
      historial: hist("hola", "a", "b", "c", "ok", "otra", "ajustar", "sí, lo quiero"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.mensajes.some((m) => m.tipo === "cierre")).toBe(true);
    expect(r.data.fase).toBe("Cierre ganado");
    expect(r.data.handoff).toBeTruthy();
  });

  it("desde el 2º turno adjunta rieles: tags de perfil + ranking ordenado", async () => {
    const r = await decidirTurno({
      clienteId: "web_1",
      canal: "web",
      historial: hist("hola", "tengo un perro y mi esposa depende de mí"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.tags?.some((t) => t.id === "mascota")).toBe(true);
    expect(r.data.tags?.some((t) => t.id === "dependientes")).toBe(true);
    const ranking = r.data.ranking ?? [];
    expect(ranking.length).toBeGreaterThanOrEqual(4);
    // Ordenado desc por match; dependientes ⇒ "vida" primero.
    expect(ranking[0]!.familia).toBe("vida");
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i - 1]!.match).toBeGreaterThanOrEqual(ranking[i]!.match);
    }
  });

  it("el primer turno (saludo) todavía no trae rieles", async () => {
    const r = await decidirTurno({ clienteId: "web_1", canal: "web", historial: hist("hola") });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.tags).toBeUndefined();
    expect(r.data.ranking).toBeUndefined();
  });

  it("el presupuesto ajusta la prima de la recomendación hacia abajo", async () => {
    const historial = hist("hola", "mi mamá depende de mí", "arrendado", "droguería", "ok");
    const sinPres = await decidirTurno({ clienteId: "web_1", canal: "web", historial });
    const conPres = await decidirTurno({
      clienteId: "web_1",
      canal: "web",
      historial,
      presupuesto: 20_000,
    });
    expect(sinPres.ok && conPres.ok).toBe(true);
    if (!sinPres.ok || !conPres.ok) return;
    const prima = (r: typeof sinPres) =>
      r.ok
        ? (r.data.mensajes.find((m) => m.tipo === "recomendacion")!.payload!
            .prima_mensual as number)
        : 0;
    expect(prima(conPres)).toBeLessThan(prima(sinPres));
  });
});
