# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- ETL pipeline (`scripts/etl_afiliados.py`) that normalizes the raw affiliate CSV (1,566,028 records) into a validated data model, plus the Postgres schema (`sql/schema.sql`) to load it
- Cross-field analysis (`scripts/cross_analysis.py`) computing pairwise-complete-case Cramér's V across all 12 non-trivial affiliate fields (66 pairs), an engagement score, and a secondary ciudad analysis — embedded in the exploratory dashboard artifact

### Added
- `scripts/gen_dashboard_stats.py`, generating `output/dashboard_stats.json` for the exploratory dashboard artifact

### Changed
- **BREAKING:** Replace the affiliate dataset source with a new 500,000-record extract (`Usos_Productos_Afiliados_SIN_ID.xlsx`, tracked in git, no PII). Drops `nombre_completo` and `afiliado_al_dia`, adds `rango_salarial` (real salary brackets), turns `empresa_asociada` into a real `empresa_id`, and re-codes `categoria`, `segmento_grupo_familiar`, `segmento_poblacional`, and `piramide_empresa` as opaque tokens with no available codebook
- Rewrite `scripts/cross_analysis.py` for the new 13-field schema; dashboard artifact rebuilt from the new data, including the finding that `categoria`'s opaque tokens function as a 3-tier income bucket derivable from `rango_salarial` (V=0.90)
