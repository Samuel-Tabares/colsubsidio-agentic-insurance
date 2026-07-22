import json
import itertools
from pathlib import Path

import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "output" / "afiliados_clean.csv"
OUT_JSON = ROOT / "output" / "cross_stats.json"

CORE_FIELDS = [
    "genero",
    "rango_edad",
    "categoria_ingreso",
    "segmento_grupo_familiar",
    "segmento_poblacional",
    "piramide_empresa",
    "empresa_asociada",
    "compra_hoteles",
    "compra_piscinas_recreacion",
    "compra_drogueria",
    "compra_viajes_agencias",
    "compra_vivienda",
]
SOCIOECONOMIC_FIELDS = ["categoria_ingreso", "segmento_grupo_familiar", "segmento_poblacional", "piramide_empresa"]
PRODUCTS = ["compra_hoteles", "compra_piscinas_recreacion", "compra_drogueria", "compra_viajes_agencias", "compra_vivienda"]
DEMOS = ["genero", "rango_edad", "categoria_ingreso", "segmento_grupo_familiar", "segmento_poblacional", "piramide_empresa", "empresa_asociada"]

raw = pd.read_csv(CSV, dtype=str, keep_default_na=False)

df = raw.copy()
for b in ["empresa_asociada", "afiliado_al_dia", "compra_hoteles", "compra_piscinas_recreacion",
          "compra_drogueria", "compra_viajes_agencias", "compra_vivienda"]:
    df[b] = df[b].map({"True": "Sí", "False": "No"})
for f in ["categoria_ingreso", "segmento_grupo_familiar", "segmento_poblacional", "piramide_empresa", "ciudad"]:
    df[f] = df[f].replace("", "(sin dato)")


def cramers_v(confusion_matrix: pd.DataFrame) -> float:
    obs = confusion_matrix.values.astype(float)
    n = obs.sum()
    if n == 0:
        return 0.0
    row_sums = obs.sum(axis=1, keepdims=True)
    col_sums = obs.sum(axis=0, keepdims=True)
    expected = row_sums @ col_sums / n
    with np.errstate(divide="ignore", invalid="ignore"):
        chi2 = np.nansum(np.where(expected > 0, (obs - expected) ** 2 / expected, 0))
    r, k = obs.shape
    phi2 = chi2 / n
    phi2corr = max(0.0, phi2 - ((k - 1) * (r - 1)) / (n - 1))
    rcorr = r - ((r - 1) ** 2) / (n - 1)
    kcorr = k - ((k - 1) ** 2) / (n - 1)
    denom = min(kcorr - 1, rcorr - 1)
    if denom <= 0:
        return 0.0
    return float(np.sqrt(phi2corr / denom))


# --- Cramér's V, pairwise-complete-case: exclude rows missing EITHER field of the pair. ---
# Using the display df (with "(sin dato)" placeholders) would let two fields' shared
# missingness masquerade as association between their real values — see the
# missingness-cluster finding below, where this materially changes several pairs.
v_matrix = {}
v_matrix_naive = {}  # kept for transparency: what you'd get treating "(sin dato)" as a real category
n_excl = {}
for a, b in itertools.combinations(CORE_FIELDS, 2):
    key = f"{a}|{b}"
    ct_naive = pd.crosstab(df[a], df[b])
    v_matrix_naive[key] = round(cramers_v(ct_naive), 4)

    mask = (raw[a] != "") & (raw[b] != "") if a in SOCIOECONOMIC_FIELDS or b in SOCIOECONOMIC_FIELDS else pd.Series(True, index=raw.index)
    sub = df[mask]
    ct = pd.crosstab(sub[a], sub[b])
    v_matrix[key] = round(cramers_v(ct), 4)
    n_excl[key] = int(len(df) - mask.sum())

ranked_pairs = sorted(v_matrix.items(), key=lambda kv: kv[1], reverse=True)

# --- Full crosstabs (counts) for every pair — includes "(sin dato)" for display, since the
# reader should still see how much of each field is missing even though V excludes it. ---
crosstabs = {}
for a, b in itertools.combinations(CORE_FIELDS, 2):
    ct = pd.crosstab(df[a], df[b])
    crosstabs[f"{a}|{b}"] = {
        "rows": list(ct.index.astype(str)),
        "cols": list(ct.columns.astype(str)),
        "counts": ct.values.tolist(),
    }

# --- Missingness cluster: do the 4 socioeconomic fields go blank on the same rows? ---
miss = pd.DataFrame({f: (raw[f] == "") for f in SOCIOECONOMIC_FIELDS})
missingness = {
    "n_missing_all_4": int(miss.all(axis=1).sum()),
    "n_missing_any_of_4": int(miss.any(axis=1).sum()),
    "overlap_pct": {  # of rows missing field A, % that are ALSO missing field B
        a: {b: round(float((miss[a] & miss[b]).sum() / miss[a].sum() * 100), 1) if miss[a].sum() else 0.0
            for b in SOCIOECONOMIC_FIELDS}
        for a in SOCIOECONOMIC_FIELDS
    },
}

# --- Product usage rates AND mean products-used ("engagement") broken down by each demographic ---
product_rates_by_demo = {}
for demo in DEMOS:
    rows = []
    for val, group in df.groupby(demo, observed=True):
        entry = {"value": val, "n": int(len(group))}
        n_products = sum((group[p] == "Sí").astype(int) for p in PRODUCTS)
        entry["engagement_mean"] = round(float(n_products.mean()), 4)
        for p in PRODUCTS:
            entry[p] = round(float((group[p] == "Sí").mean() * 100), 3)
        rows.append(entry)
    product_rates_by_demo[demo] = rows

# --- empresa_asociada rate by piramide_empresa: the real driver behind that pair's high V ---
df["empresa_asociada_bool"] = df["empresa_asociada"] == "Sí"
empresa_asociada_by_piramide = (
    df.groupby("piramide_empresa", observed=True)["empresa_asociada_bool"]
    .agg(["mean", "count"])
    .reset_index()
)
empresa_asociada_by_piramide = [
    {"value": r["piramide_empresa"], "rate_pct": round(float(r["mean"]) * 100, 2), "n": int(r["count"])}
    for _, r in empresa_asociada_by_piramide.iterrows()
]
empresa_asociada_by_piramide.sort(key=lambda e: -e["rate_pct"])

# --- Largest single segments (biggest addressable cells) across a few key heatmaps ---
def top_cells(a, b, k=5):
    ct = pd.crosstab(df[a], df[b])
    stacked = ct.stack()
    top = stacked.sort_values(ascending=False).head(k)
    return [{"a": ia, "b": ib, "n": int(v), "pct": round(float(v) / len(df) * 100, 2)} for (ia, ib), v in top.items()]

biggest_segments = {
    "rango_edad|segmento_grupo_familiar": top_cells("rango_edad", "segmento_grupo_familiar"),
    "categoria_ingreso|segmento_poblacional": top_cells("categoria_ingreso", "segmento_poblacional"),
}

# --- Ciudad: secondary, optional analysis (per user's own caveat about missingness/Bogotá skew) ---
city_df = df[df["ciudad"] != "(sin dato)"].copy()
top_cities = city_df["ciudad"].value_counts().head(10).index.tolist()
city_sub = city_df[city_df["ciudad"].isin(top_cities)]
ciudad_product_rates = []
for val, group in city_sub.groupby("ciudad", observed=True):
    entry = {"value": val, "n": int(len(group))}
    for p in PRODUCTS:
        entry[p] = round(float((group[p] == "Sí").mean() * 100), 3)
    ciudad_product_rates.append(entry)
ciudad_product_rates.sort(key=lambda e: -e["n"])

ciudad_v = {}
for f in CORE_FIELDS:
    mask = (raw["ciudad"] != "") & ((raw[f] != "") if f in SOCIOECONOMIC_FIELDS else True)
    sub = df[mask]
    ct = pd.crosstab(sub["ciudad"], sub[f])
    ciudad_v[f] = round(cramers_v(ct), 4)

out = {
    "n_total": int(len(df)),
    "n_with_city": int(len(city_df)),
    "core_fields": CORE_FIELDS,
    "cramers_v_matrix": v_matrix,
    "cramers_v_matrix_naive": v_matrix_naive,
    "n_excluded_per_pair": n_excl,
    "ranked_pairs": [[k, round(v, 4)] for k, v in ranked_pairs],
    "crosstabs": crosstabs,
    "missingness": missingness,
    "product_rates_by_demo": product_rates_by_demo,
    "empresa_asociada_by_piramide": empresa_asociada_by_piramide,
    "biggest_segments": biggest_segments,
    "ciudad_top10_product_rates": ciudad_product_rates,
    "ciudad_cramers_v_vs_core": ciudad_v,
}

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False)

print("n_total", out["n_total"])
print("n_with_city", out["n_with_city"])
print("\nMissingness cluster:", missingness["n_missing_all_4"], "filas sin las 4 (de", missingness["n_missing_any_of_4"], "con al menos 1 faltante)")
print("\nTop 15 pares por Cramér's V (pairwise-complete):")
for k, v in ranked_pairs[:15]:
    naive = v_matrix_naive[k]
    flag = "  <-- inflado por missingness compartido" if naive - v > 0.05 else ""
    print(f"  {k}: {v:.4f}  (naive con sin-dato: {naive:.4f}){flag}")
print("\nempresa_asociada por piramide_empresa:")
for e in empresa_asociada_by_piramide:
    print(f"  {e['value']}: {e['rate_pct']}% (n={e['n']})")
print("\nMayor segmento individual (edad x grupo familiar):")
for c in biggest_segments["rango_edad|segmento_grupo_familiar"][:3]:
    print(f"  {c['a']} + {c['b']}: {c['n']:,} ({c['pct']}%)")
