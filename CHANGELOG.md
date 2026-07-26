# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- **CRM phases the agent actually understands.** The funnel stage used to be a side effect of which tool the brain happened to call that turn, so a lead already in *Cotización / negociación* fell back to *Análisis* every time the recommendation was re-evaluated, and *Cierre ganado* / *Cierre perdido* were never reachable at all — the agent could not close a deal either way. Stages now declare an owner: the agent runs **Prospecto → Análisis → Cotización / negociación → Cierre ganado**, plus **Cierre perdido** from any open stage, while *En suscripción* and *Póliza emitida* stay manual. The channel enforces it: no moving backwards, no pushing into a manual stage, and no yanking a lead a human already advanced by hand
- **The agent now hears what you tell it, not just what the database says.** Facts a person shares mid-conversation (a dog, who depends on them, that they are self-employed, that they rent) are captured turn by turn, kept separate from the seed profile, fed back to the agent so it never re-asks something it was already told, and shown under **"De la conversación"** in the inbox panel and the client detail. Previously the profile could only ever mirror the affiliate row, and a person with no resolved serie left no profile trace at all
- **Cerebro contract** — added a `perfil` field to `CerebroResponse` and wired it in the agent pipeline to write into `contact.perfilCrudo` (the admin's read-only "Datos del perfil" panel). Previously the contract had no way for the brain to hand back structured affiliate data, so that panel could only ever show seed data, never anything from a live conversation

### Added
- **`app/` — surfaces + backend on Vocero CRM.** Vendored [Vocero CRM](https://github.com/kevinrivm/vocero-crm) (Next.js 15 + Drizzle + Postgres, MIT) as the base for the web-chat surface and the admin dashboard (inbox/conversations + funnel pipeline + human-takeover toggle). Three integration seams added:
  - **Cerebro seam** (`app/src/lib/cerebro/`) — the RAG+agent brain (Jhon's separate repo) is reached over an HTTP contract, switchable via `CEREBRO_MODE` (`stub` | `external` | `vocero`). The contract carries `presupuesto` (in) and optional `tags`/`ranking` (out) alongside `analisis`. Ships a local scripted stub so the flow runs end-to-end today; pointing at the real brain is one env var
  - **Channel seam** — generalized Vocero's WhatsApp-only pipeline with a `channel` column and public, login-less endpoints (`/api/channels/web/{messages,session,stream,budget}`) for cold-start, handoff-by-id, and the budget slider. SSE streams `message.new` plus live `analisis.updated` (profile tags + ranking)
  - **Insurance funnel** (`app/src/lib/funnel.ts`) — Prospecto → Análisis → Cotización/negociación → Cierre ganado → En suscripción → Póliza emitida / Cierre perdido, seeded per organization
  - Web-chat surface at `/chat` — Sarah's Asegura design (3-screen self-guided flow) ported from the Lovable `frontend/web-chat/` project onto the real backend: SSE chat, profile tags and a live product ranking fed from `analisis`, and a budget slider that persists and reshapes the recommendation. Colsubsidio branding on the admin. Voice and the S0 "login" are cosmetic (out of MVP)
  - **Admin panel gerencial** — a new **Panel** section (dashboard) as the landing page, with live metrics and two charts (clients per funnel stage, most-recommended insurance families) built from real pipeline data. **Contactos** became an enriched CRM table (stage · insurance · channel · last interaction) with a client-detail dialog and edit/chat/archive actions. **Bandeja** gained brand-styled bubbles, a per-conversation channel badge (web/WhatsApp), and a right panel showing the affiliate's profile (read-only, filled by the brain) plus the AI analysis. Ported from Sarah's `frontend/manager-view/` design onto the real backend, with the demo seed reworked to coherent Colsubsidio insurance clients
- ETL pipeline (`scripts/etl_afiliados.py`) that normalizes the raw affiliate CSV (1,566,028 records) into a validated data model, plus the Postgres schema (`sql/schema.sql`) to load it
- Cross-field analysis (`scripts/cross_analysis.py`) computing pairwise-complete-case Cramér's V across all 12 non-trivial affiliate fields (66 pairs), an engagement score, and a secondary ciudad analysis — embedded in the exploratory dashboard artifact

### Changed
- **BREAKING:** Replace the affiliate dataset source with a new 500,000-record extract (`Usos_Productos_Afiliados_SIN_ID.xlsx`, tracked in git, no PII). Drops `nombre_completo` and `afiliado_al_dia`, adds `rango_salarial` (real salary brackets), turns `empresa_asociada` into a real `empresa_id`, and re-codes `categoria`, `segmento_grupo_familiar`, `segmento_poblacional`, and `piramide_empresa` as opaque tokens with no available codebook
