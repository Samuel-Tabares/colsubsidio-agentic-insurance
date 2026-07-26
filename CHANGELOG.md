# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **`app/` — surfaces + backend on Vocero CRM.** Vendored [Vocero CRM](https://github.com/kevinrivm/vocero-crm) (Next.js 15 + Drizzle + Postgres, MIT) as the base for the web-chat surface and the admin dashboard (inbox/conversations + funnel pipeline + human-takeover toggle). Three integration seams added:
  - **Cerebro seam** (`app/src/lib/cerebro/`) — the RAG+agent brain (Jhon's separate repo) is reached over an HTTP contract, switchable via `CEREBRO_MODE` (`stub` | `external` | `vocero`). Ships a local scripted stub so the flow runs end-to-end today; pointing at the real brain is one env var
  - **Channel seam** — generalized Vocero's WhatsApp-only pipeline with a `channel` column and public, login-less endpoints (`/api/channels/web/{messages,session,stream}`) for cold-start and handoff-by-id
  - **Insurance funnel** (`app/src/lib/funnel.ts`) — Prospecto → Análisis → Cotización/negociación → Cierre ganado → En suscripción → Póliza emitida / Cierre perdido, seeded per organization
  - Web-chat surface at `/chat` (SSE-driven, placeholder UI pending Sarah's design); Colsubsidio branding on the admin
- ETL pipeline (`scripts/etl_afiliados.py`) that normalizes the raw affiliate CSV (1,566,028 records) into a validated data model, plus the Postgres schema (`sql/schema.sql`) to load it
- Cross-field analysis (`scripts/cross_analysis.py`) computing pairwise-complete-case Cramér's V across all 12 non-trivial affiliate fields (66 pairs), an engagement score, and a secondary ciudad analysis — embedded in the exploratory dashboard artifact

### Changed
- **BREAKING:** Replace the affiliate dataset source with a new 500,000-record extract (`Usos_Productos_Afiliados_SIN_ID.xlsx`, tracked in git, no PII). Drops `nombre_completo` and `afiliado_al_dia`, adds `rango_salarial` (real salary brackets), turns `empresa_asociada` into a real `empresa_id`, and re-codes `categoria`, `segmento_grupo_familiar`, `segmento_poblacional`, and `piramide_empresa` as opaque tokens with no available codebook
