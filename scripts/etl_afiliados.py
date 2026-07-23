"""ETL: normaliza Usos_Productos_Afiliados_SIN_ID.xlsx al modelo de datos acordado.

Uso:
    python scripts/etl_afiliados.py

Lee el xlsx crudo (hoja "in", streaming vía openpyxl read_only) y escribe:
    output/afiliados_clean.csv   -> datos normalizados, listos para cargar a DB
    output/etl_report.txt        -> conteo de filas, valores inválidos, duplicados de SERIE

Nota: a partir de esta versión del dataset, CATEGORIA, SEGMENTO_GRUPO_FAMILIAR,
SEGMENTO_POBLACIONAL y PIRAMIDE_NUEVA vienen codificadas como tokens griegos opacos
(SIGMA, PI, LAMBDA, ...) sin leyenda/codebook disponible. Por decisión del equipo se
tratan como los valores de referencia reales (no se intenta remapearlos a las
etiquetas de texto que traía el dataset anterior).
"""

from __future__ import annotations

import csv
from pathlib import Path

import openpyxl

RAW_PATH = Path("Usos_Productos_Afiliados_SIN_ID.xlsx")
RAW_SHEET = "in"
OUT_PATH = Path("output/afiliados_clean.csv")
REPORT_PATH = Path("output/etl_report.txt")

HEADER = [
    "SERIE",
    "GENERO",
    "RANGO_EDAD",
    "RANGO_SALARIAL",
    "CATEGORIA",
    "SEGMENTO_GRUPO_FAMILIAR",
    "SEGMENTO_POBLACIONAL",
    "PIRAMIDE_NUEVA",
    "EMPRESA_FOCO",
    "CIUDAD_AFILIADO",
    "HOTELES",
    "PISCILAGO",
    "DROGUERIA",
    "AGENCIAS",
    "VIVIENDA",
]

GENERO_VALUES = {"F", "M"}
RANGO_EDAD_VALUES = {
    "Menor de 19 años",
    "20 a 35 años",
    "36 a 45 años",
    "46 a 55 años",
    "Mayor de 55 años",
}
RANGO_SALARIAL_VALUES = {
    "Menor al SMLV",
    "Menor a 2 SMLV",
    "Entre 1 y 1.5 SMLV",
    "Entre 1.5 y 2 SMLV",
    "Entre 2 y 2.5 SMLV",
    "Entre 2 y 4 SMLV",
    "Entre 2.5 y 3 SMLV",
    "Entre 3 y 4 SMLV",
    "Entre 4 y 6 SMLV",
    "Entre 4 y 8 SMLV",
    "Entre 6 y 8 SMLV",
    "Entre 8 y 10 SMLV",
    "Entre 8 y 19 SMLV",
    "Entre 10 y 20 SMLV",
    "Entre 20 y 30 SMLV",
    "Mayor a 30 SMLV",
}
# Tokens opacos (sin codebook): se validan por pertenencia al conjunto observado
# en el dataset completo, no por significado.
CATEGORIA_VALUES = {"SIGMA", "PI", "ZETA", "MU"}
SEGMENTO_GRUPO_FAMILIAR_VALUES = {"LAMBDA", "RHO", "EPSILON", "IOTA", "CHI", "THETA", "PI"}
SEGMENTO_POBLACIONAL_VALUES = {"TAU", "PI", "ETA", "OMEGA", "XI"}
PIRAMIDE_EMPRESA_VALUES = {
    "ETA", "XI", "UPSILON", "DELTA", "BETA", "OMEGA", "KAPPA", "LAMBDA", "OMICRON", "PSI",
}
EMPRESA_ID_VALUES = {"EMP_000001", "EMP_000002"}

OUT_FIELDS = [
    "serie",
    "genero",
    "rango_edad",
    "rango_salarial",
    "categoria",
    "segmento_grupo_familiar",
    "segmento_poblacional",
    "piramide_empresa",
    "empresa_id",
    "ciudad",
    "compra_hoteles",
    "compra_piscinas_recreacion",
    "compra_drogueria",
    "compra_viajes_agencias",
    "compra_vivienda",
]


def to_bool_si_no(value: str | None) -> bool:
    return bool(value) and value.strip().upper() == "SI"


def clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = str(value).strip()
    return value if value else None


def validated(value: str | None, allowed: set[str], field: str, line_no: int, warnings: list[str]) -> str | None:
    value = clean(value)
    if value is not None and value not in allowed:
        warnings.append(f"línea {line_no}: {field} inválido -> {value!r}")
        return None
    return value


def transform_row(row: dict[str, object], line_no: int, warnings: list[str]) -> dict:
    return {
        "serie": str(row["SERIE"]).strip(),
        "genero": validated(row["GENERO"], GENERO_VALUES, "GENERO", line_no, warnings),
        "rango_edad": validated(row["RANGO_EDAD"], RANGO_EDAD_VALUES, "RANGO_EDAD", line_no, warnings),
        "rango_salarial": validated(
            row["RANGO_SALARIAL"], RANGO_SALARIAL_VALUES, "RANGO_SALARIAL", line_no, warnings
        ),
        "categoria": validated(row["CATEGORIA"], CATEGORIA_VALUES, "CATEGORIA", line_no, warnings),
        "segmento_grupo_familiar": validated(
            row["SEGMENTO_GRUPO_FAMILIAR"],
            SEGMENTO_GRUPO_FAMILIAR_VALUES,
            "SEGMENTO_GRUPO_FAMILIAR",
            line_no,
            warnings,
        ),
        "segmento_poblacional": validated(
            row["SEGMENTO_POBLACIONAL"], SEGMENTO_POBLACIONAL_VALUES, "SEGMENTO_POBLACIONAL", line_no, warnings
        ),
        "piramide_empresa": validated(
            row["PIRAMIDE_NUEVA"], PIRAMIDE_EMPRESA_VALUES, "PIRAMIDE_NUEVA", line_no, warnings
        ),
        "empresa_id": validated(row["EMPRESA_FOCO"], EMPRESA_ID_VALUES, "EMPRESA_FOCO", line_no, warnings),
        "ciudad": clean(row["CIUDAD_AFILIADO"]),
        "compra_hoteles": to_bool_si_no(row["HOTELES"]),
        "compra_piscinas_recreacion": to_bool_si_no(row["PISCILAGO"]),
        "compra_drogueria": to_bool_si_no(row["DROGUERIA"]),
        "compra_viajes_agencias": to_bool_si_no(row["AGENCIAS"]),
        "compra_vivienda": to_bool_si_no(row["VIVIENDA"]),
    }


def main() -> None:
    OUT_PATH.parent.mkdir(exist_ok=True)
    warnings: list[str] = []
    seen_series: set[str] = set()
    duplicate_series = 0
    row_count = 0

    wb = openpyxl.load_workbook(RAW_PATH, read_only=True)
    ws = wb[RAW_SHEET]

    with OUT_PATH.open("w", encoding="utf-8", newline="") as fout:
        writer = csv.DictWriter(fout, fieldnames=OUT_FIELDS)
        writer.writeheader()

        for line_no, values in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            row = dict(zip(HEADER, values))
            row_count += 1
            serie = str(row["SERIE"]).strip()
            if serie in seen_series:
                duplicate_series += 1
                warnings.append(f"línea {line_no}: SERIE duplicada -> {serie!r}")
            else:
                seen_series.add(serie)

            clean_row = transform_row(row, line_no, warnings)
            writer.writerow(clean_row)

    wb.close()

    with REPORT_PATH.open("w", encoding="utf-8") as report:
        report.write(f"Filas procesadas: {row_count}\n")
        report.write(f"SERIE duplicadas: {duplicate_series}\n")
        report.write(f"Advertencias: {len(warnings)}\n\n")
        report.write("\n".join(warnings[:2000]))
        if len(warnings) > 2000:
            report.write(f"\n... ({len(warnings) - 2000} advertencias más, truncado)\n")

    print(f"OK: {row_count} filas -> {OUT_PATH}")
    print(f"Duplicados SERIE: {duplicate_series}")
    print(f"Advertencias: {len(warnings)} (ver {REPORT_PATH})")


if __name__ == "__main__":
    main()
