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
    "rango_salarial",
    "categoria",
    "segmento_grupo_familiar",
    "segmento_poblacional",
    "piramide_empresa",
    "empresa_id",
    "compra_hoteles",
    "compra_piscinas_recreacion",
    "compra_drogueria",
    "compra_viajes_agencias",
    "compra_vivienda",
]
PRODUCTS = ["compra_hoteles", "compra_piscinas_recreacion", "compra_drogueria", "compra_viajes_agencias", "compra_vivienda"]
DEMOS = ["genero", "rango_edad", "rango_salarial", "categoria", "segmento_grupo_familiar", "segmento_poblacional", "piramide_empresa", "empresa_id"]

raw = pd.read_csv(CSV, dtype=str, keep_default_na=False)

# Fields with real missingness in this dataset (checked empirically, not assumed):
# only rango_salarial (~1%) and ciudad (~58%, handled separately below). The four
# opaque categorical fields (categoria, segmento_*, piramide_empresa) and empresa_id
# are 100% populated in this extract — unlike the previous dataset, there's no
# shared-missingness cluster to correct for here.
FIELDS_WITH_MISSING = [f for f in CORE_FIELDS if (raw[f] == "").any()]

df = raw.copy()
for f in CORE_FIELDS:
    df[f] = df[f].replace("", "(sin dato)")
df["ciudad"] = df["ciudad"].replace("", "(sin dato)")
for p in PRODUCTS:
    df[p] = df[p].map({"True": "Sí", "False": "No"})


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


# --- Cramér's V, pairwise-complete-case: exclude rows missing EITHER field of the pair
# (only matters for pairs involving rango_salarial, the one field with real gaps here). ---
v_matrix = {}
v_matrix_naive = {}  # kept for transparency: what you'd get treating "(sin dato)" as a real category
n_excl = {}
for a, b in itertools.combinations(CORE_FIELDS, 2):
    key = f"{a}|{b}"
    ct_naive = pd.crosstab(df[a], df[b])
    v_matrix_naive[key] = round(cramers_v(ct_naive), 4)

    needs_mask = a in FIELDS_WITH_MISSING or b in FIELDS_WITH_MISSING
    mask = (raw[a] != "") & (raw[b] != "") if needs_mask else pd.Series(True, index=raw.index)
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

# --- Missingness: only rango_salarial has real gaps among the core fields now. ---
missingness = {
    "fields_with_missing": FIELDS_WITH_MISSING,
    "n_missing": {f: int((raw[f] == "").sum()) for f in FIELDS_WITH_MISSING},
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

# --- Largest single segments (biggest addressable cells) for the top 2 non-product pairs ---
def top_cells(a, b, k=5):
    ct = pd.crosstab(df[a], df[b])
    stacked = ct.stack()
    top = stacked.sort_values(ascending=False).head(k)
    return [{"a": ia, "b": ib, "n": int(v), "pct": round(float(v) / len(df) * 100, 2)} for (ia, ib), v in top.items()]

top_nonproduct_pairs = [k for k, _ in ranked_pairs if not (k.split("|")[0] in PRODUCTS or k.split("|")[1] in PRODUCTS)][:2]
biggest_segments = {key: top_cells(*key.split("|")) for key in top_nonproduct_pairs}

# --- Top-ranked pair overall: row-normalized breakdown, whatever it turns out to be ---
top_pair_key, top_pair_v = ranked_pairs[0]
top_a, top_b = top_pair_key.split("|")
top_ct = pd.crosstab(df[top_a], df[top_b], normalize="index") * 100
top_pair_breakdown = {
    "pair": top_pair_key,
    "cramers_v": top_pair_v,
    "rows": list(top_ct.index.astype(str)),
    "cols": list(top_ct.columns.astype(str)),
    "row_pct": top_ct.round(2).values.tolist(),
}

# --- Ciudad: secondary, optional analysis (blank in ~58% of records) ---
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
    needs_mask = f in FIELDS_WITH_MISSING
    mask = (raw["ciudad"] != "") & ((raw[f] != "") if needs_mask else True)
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
    "top_pair_breakdown": top_pair_breakdown,
    "biggest_segments": biggest_segments,
    "ciudad_top10_product_rates": ciudad_product_rates,
    "ciudad_cramers_v_vs_core": ciudad_v,
}

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False)

print("n_total", out["n_total"])
print("n_with_city", out["n_with_city"])
print("\nCampos con datos faltantes:", missingness["n_missing"])
print("\nTop 15 pares por Cramér's V (pairwise-complete):")
for k, v in ranked_pairs[:15]:
    naive = v_matrix_naive[k]
    flag = "  <-- inflado por missingness compartido" if naive - v > 0.05 else ""
    print(f"  {k}: {v:.4f}  (naive con sin-dato: {naive:.4f}){flag}")
print(f"\nPar #1 ({top_pair_key}, V={top_pair_v}) — desglose por fila:")
for row_label, pcts in zip(top_pair_breakdown["rows"], top_pair_breakdown["row_pct"]):
    top_col_idx = max(range(len(pcts)), key=lambda i: pcts[i])
    print(f"  {row_label}: {top_pair_breakdown['cols'][top_col_idx]} = {pcts[top_col_idx]}%")
