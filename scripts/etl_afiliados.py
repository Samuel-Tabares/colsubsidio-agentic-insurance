"""ETL: normaliza Usos_Productos_Afiliados_SIN_ID.csv al modelo de datos acordado.

Uso:
    python scripts/etl_afiliados.py

Lee el CSV crudo (separador ';', BOM utf-8-sig) y escribe:
    output/afiliados_clean.csv   -> datos normalizados, listos para cargar a DB
    output/etl_report.txt        -> conteo de filas, valores inválidos, duplicados de SERIE
"""

from __future__ import annotations

import csv
from pathlib import Path

RAW_PATH = Path("Usos_Productos_Afiliados_SIN_ID.csv")
OUT_PATH = Path("output/afiliados_clean.csv")
REPORT_PATH = Path("output/etl_report.txt")

GENERO_VALUES = {"F", "M"}
RANGO_EDAD_VALUES = {
    "Menor de 19 años",
    "20 a 35 años",
    "36 a 45 años",
    "46 a 55 años",
    "Mayor de 55 años",
}
CATEGORIA_INGRESO_VALUES = {"A", "B", "C", "D"}
SEGMENTO_POBLACIONAL_VALUES = {"Alto", "Básico", "Joven", "Medio"}

SEGMENTO_GRUPO_FAMILIAR_MAP = {
    "AFILLIADO SIN GRUPO_FAMILIAR": "AFILIADO SIN GRUPO FAMILIAR",
    "FAMILIA MONOPARENTAL": "FAMILIA MONOPARENTAL",
    "FAMILIA MONOPARENTAL AMPLIADA": "FAMILIA MONOPARENTAL AMPLIADA",
    "FAMILIA NUCLEAR AMPLIADA": "FAMILIA NUCLEAR AMPLIADA",
    "FAMILIA NUCLEAR INTEGRAL": "FAMILIA NUCLEAR INTEGRAL",
    "PAREJA CONYUGAL": "PAREJA CONYUGAL",
}

PIRAMIDE_EMPRESA_MAP = {
    "1 Grandes": "1 Grandes",
    "1. Grandes": "1 Grandes",  # typo en la fuente, misma categoría
    "2 Medianas": "2 Medianas",
    "3 Empresarial Top": "3 Empresarial Top",
    "4 Empresarial Estandar": "4 Empresarial Estandar",
    "5 Micro Transaccional": "5 Micro Transaccional",
    "5 Micro Transaccional Colsubsidio": "5 Micro Transaccional Colsubsidio",
    "6.1 Facultativo": "6.1 Facultativo",
    "6.2 Independiente": "6.2 Independiente",
    "6.3 Pensionado": "6.3 Pensionado",
}

OUT_FIELDS = [
    "serie",
    "nombre_completo",
    "genero",
    "rango_edad",
    "categoria_ingreso",
    "segmento_grupo_familiar",
    "segmento_poblacional",
    "piramide_empresa",
    "empresa_asociada",
    "afiliado_al_dia",
    "ciudad",
    "compra_hoteles",
    "compra_piscinas_recreacion",
    "compra_drogueria",
    "compra_viajes_agencias",
    "compra_vivienda",
]


def to_bool_si_no(value: str) -> bool:
    return value.strip().upper() == "SI"


def clean(value: str) -> str | None:
    value = value.strip()
    return value if value else None


def transform_row(row: dict[str, str], line_no: int, warnings: list[str]) -> dict:
    genero = clean(row["GENERO"])
    if genero not in GENERO_VALUES:
        warnings.append(f"línea {line_no}: GENERO inválido -> {genero!r}")
        genero = None

    rango_edad = clean(row["RANGO_EDAD"])
    if rango_edad is not None and rango_edad not in RANGO_EDAD_VALUES:
        warnings.append(f"línea {line_no}: RANGO_EDAD inválido -> {rango_edad!r}")
        rango_edad = None

    categoria_ingreso = clean(row["CATEGORIA"])
    if categoria_ingreso is not None and categoria_ingreso not in CATEGORIA_INGRESO_VALUES:
        warnings.append(f"línea {line_no}: CATEGORIA inválida -> {categoria_ingreso!r}")
        categoria_ingreso = None

    segmento_grupo_familiar_raw = clean(row["SEGMENTO_GRUPO_FAMILIAR"])
    segmento_grupo_familiar = (
        SEGMENTO_GRUPO_FAMILIAR_MAP.get(segmento_grupo_familiar_raw)
        if segmento_grupo_familiar_raw
        else None
    )
    if segmento_grupo_familiar_raw and segmento_grupo_familiar is None:
        warnings.append(
            f"línea {line_no}: SEGMENTO_GRUPO_FAMILIAR desconocido -> {segmento_grupo_familiar_raw!r}"
        )

    segmento_poblacional = clean(row["SEGMENTO_POBLACIONAL"])
    if segmento_poblacional is not None and segmento_poblacional not in SEGMENTO_POBLACIONAL_VALUES:
        warnings.append(f"línea {line_no}: SEGMENTO_POBLACIONAL inválido -> {segmento_poblacional!r}")
        segmento_poblacional = None

    piramide_raw = clean(row["PIRAMIDE_NUEVA"])
    piramide_empresa = PIRAMIDE_EMPRESA_MAP.get(piramide_raw) if piramide_raw else None
    if piramide_raw and piramide_empresa is None:
        warnings.append(f"línea {line_no}: PIRAMIDE_NUEVA desconocida -> {piramide_raw!r}")

    return {
        "serie": row["SERIE"].strip(),
        "nombre_completo": clean(row["NOMBRE_COMPLETO"]),
        "genero": genero,
        "rango_edad": rango_edad,
        "categoria_ingreso": categoria_ingreso,
        "segmento_grupo_familiar": segmento_grupo_familiar,
        "segmento_poblacional": segmento_poblacional,
        "piramide_empresa": piramide_empresa,
        "empresa_asociada": row["EMPRESA_FOCO"].strip().upper() == "X",
        "afiliado_al_dia": row["ESTADOAFILIADO"].strip().upper() == "AL DIA",
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

    with (
        RAW_PATH.open("r", encoding="utf-8-sig", newline="") as fin,
        OUT_PATH.open("w", encoding="utf-8", newline="") as fout,
    ):
        reader = csv.DictReader(fin, delimiter=";")
        writer = csv.DictWriter(fout, fieldnames=OUT_FIELDS)
        writer.writeheader()

        for line_no, row in enumerate(reader, start=2):
            row_count += 1
            serie = row["SERIE"].strip()
            if serie in seen_series:
                duplicate_series += 1
                warnings.append(f"línea {line_no}: SERIE duplicada -> {serie!r}")
            else:
                seen_series.add(serie)

            clean_row = transform_row(row, line_no, warnings)
            writer.writerow(clean_row)

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
