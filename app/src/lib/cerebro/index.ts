import {
  CerebroResponse,
  type CerebroRequest,
} from "@/lib/cerebro/types";
import { stubDecidirTurno } from "@/lib/cerebro/stub";

/**
 * Frontera con el cerebro (repo de Jhon). `decidirTurno` es el único punto que
 * el pipeline del agente llama; su salida se mapea a las acciones de Vocero.
 *
 * Modos (CEREBRO_MODE):
 *  - `stub`     : recorrido guionizado local (demo hoy, sin repo de Jhon).
 *  - `external` : HTTP a CEREBRO_URL (el cerebro real).
 *  - `vocero`   : desactiva el cerebro; el pipeline usa el LLM nativo de Vocero.
 *
 * Como el adaptador de IA de Vocero: un hipo del proveedor NUNCA propaga
 * excepción — siempre resultado tipado.
 */

export type CerebroResult =
  | { ok: true; data: CerebroResponse }
  | { ok: false; error: "not_active" | "provider_error" | "invalid_output"; detail: string };

type CerebroMode = "stub" | "external" | "vocero";

function mode(): CerebroMode {
  const m = process.env.CEREBRO_MODE?.trim();
  if (m === "stub" || m === "external" || m === "vocero") return m;
  return "vocero";
}

/** true si el cerebro externo/stub gobierna el turno (en vez del LLM nativo). */
export function isCerebroActive(): boolean {
  const m = mode();
  if (m === "stub") return true;
  if (m === "external") return !!process.env.CEREBRO_URL?.trim();
  return false;
}

const TIMEOUT_MS = 30_000;

export async function decidirTurno(req: CerebroRequest): Promise<CerebroResult> {
  const m = mode();
  if (m === "vocero") {
    return { ok: false, error: "not_active", detail: "CEREBRO_MODE=vocero" };
  }
  if (m === "stub") {
    try {
      const data = CerebroResponse.parse(stubDecidirTurno(req));
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: "invalid_output", detail: errMsg(err) };
    }
  }

  // external
  const url = process.env.CEREBRO_URL?.trim();
  if (!url) return { ok: false, error: "not_active", detail: "Sin CEREBRO_URL" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/decidir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: "provider_error",
        detail: `cerebro respondió ${res.status}: ${body.slice(0, 300)}`,
      };
    }
    const json = await res.json();
    const parsed = CerebroResponse.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_output",
        detail: parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "),
      };
    }
    return { ok: true, data: parsed.data };
  } catch (err) {
    return { ok: false, error: "provider_error", detail: errMsg(err) };
  } finally {
    clearTimeout(timer);
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
