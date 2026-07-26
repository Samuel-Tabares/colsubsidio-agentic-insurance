/**
 * recomendar(perfil) — decide la familia de seguro, nunca el producto.
 *
 * Lee ../reglas.json, suma el peso de cada regla que dispara por familia, y devuelve
 * la ganadora con su razon_dato (grondada en un numero real del respaldo) y las
 * preguntas de confirmacion pendientes. El producto concreto lo trae match_catalogo()
 * dentro de ese resultado (ver catalogo.ts), este archivo no toca el catalogo.
 */
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
// Import estático (no readFileSync): así el bundler de Vercel empaqueta el
// JSON con la función serverless. Un readFileSync en runtime no se rastrea
// como dependencia y el deploy queda con el archivo faltante (ENOENT).
import reglasJsonEstatico from "../reglas.json" with { type: "json" };

interface Respaldo {
  n_segmento: number;
  pct_base: number;
  nota: string;
  metrica?: string;
}

interface Regla {
  id: string;
  familia: string;
  cuando: { campo: string; en: string[] };
  peso: number;
  codigo_opaco: boolean;
  razon_dato: string;
  respaldo: Respaldo;
  pregunta_confirmacion?: string;
}

interface ReglasJson {
  _meta: Record<string, unknown>;
  familias: string[];
  reglas: Regla[];
  capacidad_pago: {
    campo: string;
    topes: Record<string, number>;
    piso_catalogo: number;
    techo_catalogo_publicado: number;
    nota: string;
  };
  desempate: string;
  default: string;
}

/** El perfil puede traer llaves en cualquier caso: fila cruda del CSV (DROGUERIA) o
 * columna Postgres (drogueria). Se normaliza antes de evaluar, ver normalizarPerfil(). */
export type Perfil = Record<string, string | number | boolean | number[] | null | undefined>;

export interface Recomendacion {
  familia: string;
  peso_total: number;
  reglas_disparadas: string[];
  razon_dato: string;
  respaldo: Respaldo[];
  preguntas_confirmacion: string[];
  tope_precio_mensual: number | null;
}

function cargarReglas(reglasOverride?: ReglasJson): ReglasJson {
  return reglasOverride ?? (reglasJsonEstatico as unknown as ReglasJson);
}

function normalizarPerfil(perfil: Perfil): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(perfil)) out[k.toUpperCase()] = v;
  return out;
}

function reglaDispara(regla: Regla, perfilNorm: Record<string, unknown>): boolean {
  const valor = perfilNorm[regla.cuando.campo.toUpperCase()];
  // Perfil incompleto: la regla no dispara, no lanza error.
  if (valor === null || valor === undefined) return false;
  // Columnas booleanas de Postgres (drogueria, vivienda...) contra reglas escritas en
  // formato CSV ("SI"/"NO").
  if (typeof valor === "boolean") return regla.cuando.en.includes(valor ? "SI" : "NO");
  return regla.cuando.en.includes(String(valor));
}

export function recomendar(perfil: Perfil, reglasOverride?: ReglasJson): Recomendacion | null {
  const reglasJson = cargarReglas(reglasOverride);
  const perfilNorm = normalizarPerfil(perfil);

  const pesoPorFamilia = new Map<string, number>();
  const reglasPorFamilia = new Map<string, Regla[]>();

  for (const regla of reglasJson.reglas) {
    if (!reglaDispara(regla, perfilNorm)) continue;
    pesoPorFamilia.set(regla.familia, (pesoPorFamilia.get(regla.familia) ?? 0) + regla.peso);
    const lista = reglasPorFamilia.get(regla.familia) ?? [];
    lista.push(regla);
    reglasPorFamilia.set(regla.familia, lista);
  }

  // Ninguna regla disparo: reglasJson.default dice que decide la conversacion, no este
  // archivo. El caller interpreta null como "sigue en discovery".
  if (pesoPorFamilia.size === 0) return null;

  const maxPeso = Math.max(...pesoPorFamilia.values());
  const empatadas = [...pesoPorFamilia.entries()]
    .filter(([, peso]) => peso === maxPeso)
    .map(([familia]) => familia);

  // reglasJson.desempate (primer borrador): "familiares" gana el empate.
  const familiaGanadora = empatadas.includes("familiares") ? "familiares" : empatadas[0];
  const reglasGanadoras = reglasPorFamilia.get(familiaGanadora)!;

  const salario = String(perfilNorm[reglasJson.capacidad_pago.campo] ?? "");
  const tope = reglasJson.capacidad_pago.topes[salario];

  return {
    familia: familiaGanadora,
    peso_total: pesoPorFamilia.get(familiaGanadora)!,
    reglas_disparadas: reglasGanadoras.map((r) => r.id),
    razon_dato: reglasGanadoras.map((r) => r.razon_dato).join(" y "),
    respaldo: reglasGanadoras.map((r) => r.respaldo),
    preguntas_confirmacion: reglasGanadoras
      .map((r) => r.pregunta_confirmacion)
      .filter((p): p is string => !!p),
    // 0 en reglas.json significa "sin calibrar todavia" (ver _meta.pendiente), se trata
    // como ausencia de tope, no como tope real de $0.
    tope_precio_mensual: tope && tope > 0 ? tope : null,
  };
}

function demo(): void {
  const serie259: Perfil = {
    serie: "259",
    genero: "F",
    rango_edad: "20 a 35 años",
    rango_salarial: "Entre 1 y 1.5 SMLV",
    ciudad_afiliado: "BOGOTA D.C.",
    empresa_foco: "EMP_000001",
    segmento_grupo_familiar: "LAMBDA",
    segmento_poblacional: "TAU",
    piramide_empresa: "ETA",
    drogueria: true,
    vivienda: false,
    agencias: false,
    hoteles: false,
    piscilago: false,
  };
  const r259 = recomendar(serie259);
  assert.ok(r259, "SERIE 259 deberia disparar una recomendacion");
  assert.equal(r259!.familia, "familiares");
  assert.equal(r259!.peso_total, 3); // solo R01
  assert.deepEqual(r259!.reglas_disparadas, ["R01"]);
  assert.equal(r259!.tope_precio_mensual, null); // topes en 0, pendiente de Luis

  const sinDrogueria: Perfil = { ...serie259, drogueria: false };
  assert.equal(recomendar(sinDrogueria), null);

  const vacio: Perfil = { serie: "999999" };
  assert.equal(recomendar(vacio), null);

  assert.ok(!/monoparental|nuclear integral|afiliado sin grupo|lambda|rho|epsilon/i.test(r259!.razon_dato));

  console.log(
    "demo OK - solo R01 activa, dispara con drogueria=SI, no dispara sin ella, perfil vacio no truena"
  );
}

if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {
  demo();
}
