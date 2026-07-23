"""Genera output/dashboard_stats.json a partir de output/afiliados_clean.csv.

Conteos simples por campo + tablas cruzadas puntuales, consumidos por el
dashboard exploratorio (artifact enlazado en README.md). No requiere las
asociaciones de scripts/cross_analysis.py (output/cross_stats.json aparte).
"""

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "output" / "afiliados_clean.csv"
OUT_JSON = ROOT / "output" / "dashboard_stats.json"

COUNTER_FIELDS = [
    "genero",
    "rango_edad",
    "rango_salarial",
    "categoria",
    "segmento_grupo_familiar",
    "segmento_poblacional",
    "piramide_empresa",
    "empresa_id",
]
BOOL_FIELDS = [
    "compra_hoteles",
    "compra_piscinas_recreacion",
    "compra_drogueria",
    "compra_viajes_agencias",
    "compra_vivienda",
]

df = pd.read_csv(CSV, dtype=str, keep_default_na=False)

counters = {}
for f in COUNTER_FIELDS:
    vc = df[f].replace("", "(sin dato)").value_counts()
    counters[f] = [[str(k), int(v)] for k, v in vc.items()]

city_vc = df["ciudad"].replace("", "(sin dato)").value_counts().head(30)
counters["ciudad"] = [[str(k), int(v)] for k, v in city_vc.items()]

bool_counts = {f: int((df[f] == "True").sum()) for f in BOOL_FIELDS}

# segmento_grupo_familiar x rango_edad (equivalente al familiar_x_edad de la versión anterior)
familiar_x_edad = []
for (fam, edad), n in df.groupby(["segmento_grupo_familiar", "rango_edad"]).size().items():
    familiar_x_edad.append([fam, edad, int(n)])

# categoria x n_productos_comprados (equivalente al categoria_x_nproductos anterior)
n_productos = sum((df[p] == "True").astype(int) for p in BOOL_FIELDS)
categoria_x_nproductos = []
for (cat, n), count in pd.DataFrame({"categoria": df["categoria"], "n": n_productos}).value_counts().items():
    categoria_x_nproductos.append([cat, int(n), int(count)])

out = {
    "total": int(len(df)),
    "counters": counters,
    "bool_counts": bool_counts,
    "familiar_x_edad": familiar_x_edad,
    "categoria_x_nproductos": categoria_x_nproductos,
}

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False)

print(f"OK: {out['total']} filas -> {OUT_JSON}")
