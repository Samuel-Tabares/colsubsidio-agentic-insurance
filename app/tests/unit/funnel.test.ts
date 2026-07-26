import { describe, expect, it } from "vitest";
import { FASES_DEL_AGENTE, FUNNEL_STAGE_NAMES, puedeMoverAgente } from "@/lib/funnel";

/**
 * El reparto real del negocio: el agente maneja de Prospecto a cierre
 * (ganado/perdido); suscripción y emisión las hace una persona.
 */
describe("reparto de fases", () => {
  it("el agente es dueño de las 5 fases de venta, no de las 2 manuales", () => {
    expect(FASES_DEL_AGENTE).toEqual([
      "Prospecto",
      "Análisis",
      "Cotización / negociación",
      "Cierre ganado",
      "Cierre perdido",
    ]);
    expect(FASES_DEL_AGENTE).not.toContain("En suscripción");
    expect(FASES_DEL_AGENTE).not.toContain("Póliza emitida");
  });

  it("el funnel completo sigue teniendo las 7 etapas del seed", () => {
    expect(FUNNEL_STAGE_NAMES).toHaveLength(7);
  });
});

describe("puedeMoverAgente", () => {
  it("avanza hacia adelante dentro de las fases del agente", () => {
    expect(puedeMoverAgente("Prospecto", "Análisis")).toBe(true);
    expect(puedeMoverAgente("Análisis", "Cotización / negociación")).toBe(true);
    expect(puedeMoverAgente("Cotización / negociación", "Cierre ganado")).toBe(true);
  });

  it("NO retrocede: el bug real era volver a Análisis desde negociación", () => {
    expect(puedeMoverAgente("Cotización / negociación", "Análisis")).toBe(false);
    expect(puedeMoverAgente("Análisis", "Prospecto")).toBe(false);
    expect(puedeMoverAgente("Cierre ganado", "Cotización / negociación")).toBe(false);
  });

  it("no se queda pegado en la misma fase (no cuenta como avance)", () => {
    expect(puedeMoverAgente("Análisis", "Análisis")).toBe(false);
  });

  it("nunca empuja a las fases manuales", () => {
    expect(puedeMoverAgente("Cierre ganado", "En suscripción")).toBe(false);
    expect(puedeMoverAgente("Cotización / negociación", "Póliza emitida")).toBe(false);
  });

  it("no saca un lead que una persona ya movió a una fase manual", () => {
    expect(puedeMoverAgente("En suscripción", "Análisis")).toBe(false);
    expect(puedeMoverAgente("En suscripción", "Cierre perdido")).toBe(false);
    expect(puedeMoverAgente("Póliza emitida", "Cierre ganado")).toBe(false);
  });

  it("permite perder el lead desde cualquier fase abierta del agente", () => {
    expect(puedeMoverAgente("Prospecto", "Cierre perdido")).toBe(true);
    expect(puedeMoverAgente("Análisis", "Cierre perdido")).toBe(true);
    expect(puedeMoverAgente("Cotización / negociación", "Cierre perdido")).toBe(true);
  });

  it("desde Cierre ganado el agente ya entregó el lead", () => {
    expect(puedeMoverAgente("Cierre ganado", "Cierre perdido")).toBe(false);
  });

  it("un lead sin etapa acepta cualquier fase del agente", () => {
    expect(puedeMoverAgente(null, "Cotización / negociación")).toBe(true);
    expect(puedeMoverAgente(null, "En suscripción")).toBe(false);
  });

  it("ignora nombres que no son del funnel y tolera mayúsculas/espacios", () => {
    expect(puedeMoverAgente("Prospecto", "Etapa Inventada")).toBe(false);
    expect(puedeMoverAgente("prospecto", "  análisis ")).toBe(true);
  });
});
