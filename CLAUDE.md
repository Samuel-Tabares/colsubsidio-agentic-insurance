# Automatización Ventas de Seguros — Colsubsidio

## Purpose

Hackathon challenge (sponsor: Colsubsidio). Build an end-to-end, self-service flow that takes a prospect from "no sé qué seguro necesito" to "ya quedé asegurado" with **no human advisor involved**. Colsubsidio is a **sponsor/distributor, not the insurer** — it surfaces third-party insurers' products; the flow matches people to existing policies, it doesn't design them.

Judged criteria (full brief in `RETO_2_SEGUROS.md`):
- Propensity to need a given insurance type must be explainable from real affiliate variables (age, beneficiaries, life events, employment, habits) — never random or "just because."
- The offer (insurance type + coverages, not just price) must visibly differ by profile — e.g. single/no-kids vs. married-with-3-kids.
- The experience must feel personal and trustworthy, not a generic form; plain language, no policy jargon.
- The flow must be fully self-guided end to end (a judge can walk it without the team narrating).
- Out of scope: real insurer integration, legally-binding e-signature, claims/renewals, real payment gateway.

This is a **team project**, not solo. Canonical brief: `RETO_2_SEGUROS.md` — transcribed from the official hackathon slides, merged with the team's informal brief (formerly `contexto.md`, now folded in so nothing was lost) into one document. Event runs 2026-07-22 to 2026-07-26 in Bogotá (virtual sessions Wed/Thu, in-person at Club La Colina, Colsubsidio, Fri–Sun). The team explicitly has **not** locked the architecture yet — pending the official full challenge explanation — so treat everything in this file as current-best-guess, not final.

## Equipo

| Integrante | Rol propuesto |
|---|---|
| Sarah | UX del journey conversacional, confianza/explicabilidad, pitch |
| Jhon | Orquestación conversacional (flujo del agente, integración WhatsApp Business API) |
| Samuel | Backend y arquitectura de datos (PostgreSQL, RAG/Pinecone) — **el rol detrás de este repo** |
| Santiago | Capa de IA/modelos y decisión, infraestructura cloud |

Riesgo crítico identificado por el equipo: que la recomendación de un producto de seguro se sienta arbitraria o poco transparente para el usuario — refuerza el criterio de propensión explicable ya mencionado arriba.

## Stack

Hackathon-sponsored tools the team intends to use (get them for the sponsor perks) — **roles below reflect `RETO_2_SEGUROS.md` where confirmed, otherwise still a working hypothesis**:

| Tool | Role | Status |
|---|---|---|
| WhatsApp Business API | Primary conversational channel (Jhon's scope) | confirmed intent, not locked |
| Pinecone | Vector store for the RAG layer (Samuel's scope, per team doc) | confirmed intent, not provisioned |
| PostgreSQL / Supabase | Relational data (affiliates, catalog, sessions) — `sql/schema.sql` targets it | confirmed, not yet provisioned |
| Gemini API | LLM reasoning for the agent (propensity + conversation) | candidate |
| Houston AI | No-code AI agent builder (Colombian startup, ex-TaxFlow) — likely orchestrates the agent itself | candidate |
| Hugging Face | Embeddings model for the RAG layer, or an open model alongside Gemini | candidate, role unconfirmed |
| Lovable | Frontend generation, if a web surface is needed alongside WhatsApp | candidate |
| ElevenLabs | Voice channel (TTS/STT), if the flow goes beyond text | candidate, only if voice is in scope |
| Hosting | Undecided — whatever the hackathon sponsors provide credits for | pending |
| Auth (anonymous-until-close vs. login-first) | Team decision pending | pending |

Update this table as the team locks in decisions — don't let it drift out of sync with reality.

## Data pipeline

- Raw source: `Usos_Productos_Afiliados_SIN_ID.csv` — 1,566,028 affiliate records, `;`-delimited, `utf-8-sig` encoded. Despite the "SIN_ID" filename it still contains full names (`NOMBRE_COMPLETO`) — treat as PII.
- `scripts/etl_afiliados.py` normalizes the raw CSV into `output/afiliados_clean.csv` per the data model below. Stdlib only, no dependencies to install. Run with:
  ```
  python3 scripts/etl_afiliados.py
  ```
  Takes ~10s for the full file. Re-run after any change to the raw CSV or to the field mappings in the script. It also writes `output/etl_report.txt` (row count, duplicate `SERIE` count, per-row warnings for values outside the known enums).
- `sql/schema.sql` is the Postgres DDL for the cleaned model (enum types + `afiliados_productos` table). **Not yet applied to any database** — Supabase project for this repo isn't provisioned yet; loading 1.56M rows will need a direct `psql`/`COPY` connection rather than piecemeal `INSERT`s (the Supabase MCP tools available in this environment don't expose one).
- `output/dashboard_stats.json` holds pre-aggregated counts (used to build the exploratory dashboard artifact linked in `README.md`) — regenerate it from `output/afiliados_clean.csv` if the ETL output changes.
- `scripts/cross_analysis.py` computes pairwise associations (bias-corrected Cramér's V, **pairwise-complete-case**) across all 12 non-trivial fields (66 pairs), plus product-usage rates, an engagement score (mean products bought, 0–5), and a secondary ciudad analysis — writes `output/cross_stats.json`, embedded in the dashboard artifact's "Análisis cruzado" section. Unlike `etl_afiliados.py` this one needs `pandas`/`numpy` (not in system Python on this machine — install in a venv, e.g. `python3 -m venv .venv && .venv/bin/pip install pandas numpy`).
  - **Methodology gotcha already found and fixed**: computing V while treating `"(sin dato)"` as a real category inflates association between fields that tend to be blank on the *same* rows. 23,510 records are missing at least one of the 4 socioeconomic fields, and 13,910 of those are missing **all four at once** — a real "incomplete profile" cluster, not independent gaps. The script excludes, per pair, rows missing either field before computing V; both the corrected and naive matrices are in the JSON (`cramers_v_matrix` vs `cramers_v_matrix_naive`) for comparison.
  - Key findings (corrected numbers): the 4 socioeconomic fields (`categoria_ingreso`, `segmento_poblacional`, `segmento_grupo_familiar`, `piramide_empresa`) share real but moderate association (V 0.14–0.31 pairwise-complete, well below the naive 0.39–0.56) — related, not redundant. `piramide_empresa`↔`empresa_asociada` (V=0.84) isn't an artifact: `empresa_asociada` is structurally almost a subset flag for "1 Grandes"-tier companies (79% rate there, ~0% everywhere else). Product-usage behavior barely correlates with any profile field (V ≤ 0.15). `ciudad` has the weakest association with everything (V ≤ 0.06). The single largest segment in the whole dataset is "20 a 35 años + afiliado sin grupo familiar" — 516,448 people, 33% of the base.

## Data model notes

Non-obvious facts established by analyzing the full 1.56M-row source:

- `categoria_ingreso` (A–D) is the closest available income signal — the source has no numeric salary field. It's the official CCF (Caja de Compensación Familiar) income-bracket classification by SMLMV, not an arbitrary label.
- `segmento_grupo_familiar`, `segmento_poblacional`, and `piramide_empresa` are three **distinct** segmentation axes in the source (family-unit type, population tier, and affiliating-company size/regime respectively) — don't conflate them.
- Two source typos are normalized by the ETL: `"AFILLIADO SIN GRUPO_FAMILIAR"` → `"AFILIADO SIN GRUPO FAMILIAR"`, and `"1. Grandes"` → merged into `"1 Grandes"`.
- `ciudad` is blank in 58% of records (912,816 / 1,566,028) — don't treat it as a reliable primary segmentation field without accounting for that gap.
- `ESTADOAFILIADO` (→ `afiliado_al_dia`) is `"Al dia"` for 100% of records in this extract — it currently carries no discriminating signal.
- `nombre_completo` is kept as a single field on purpose. Splitting into nombre/apellidos was considered and rejected: Spanish naming (variable given-name count, compound surnames with "DE"/"DEL"/"LA") can't be split 100% reliably from the string alone.

## Brand

`Manual de Marca Colsubsidio.md` is an unofficial reconstruction (no official brand manual is public) — treat its values as reference, not ground truth. Primary yellow `#FFD100`, institutional blue `#0068B3`, dark navy/text `#0B2A4A`, white; Poppins for headings, Inter for body; tone is "institutional but warm" — plain language, no policy jargon, high contrast. (A teammate independently produced the same reconstruction as a PDF; the `.md` version was kept as canonical since it's git-diffable — the PDF was removed.)

Note: the `brand-guidelines` skill in the library is written for Sentry's own brand voice ("empathetic, self-aware, occasionally snarky") — deliberately **not** injected here since it would push the wrong tone for Colsubsidio. Follow the values above directly instead.

## Decisiones pendientes del equipo

Preguntas abiertas que bloquean o afinan el stack — actualizar esta lista (tachar/mover a la tabla de Stack) a medida que el equipo decida, no dejarla desincronizada:

- **Frontend**: ¿hay una UI web además de WhatsApp (ej. Lovable para algo complementario), o el flujo vive completamente dentro de WhatsApp? Dueño: Jhon/Sarah, no decidido aquí.
- **Autenticación**: ¿flujo anónimo hasta el cierre, o login desde el inicio contra la base de 1.56M afiliados? Decisión de equipo, pendiente.
- **Hosting**: depende de qué beneficios/créditos entrega el hackathon exactamente — falta confirmar qué patrocinador cubre qué (DigitalOcean, Supabase, otros).
- **Houston AI vs. Gemini API**: ¿Houston orquesta el agente completo (no-code) y Gemini es el modelo subyacente, o son piezas separadas del pipeline? Falta definir la división de responsabilidad.
- **Hugging Face**: ¿modelo de embeddings para el RAG en Pinecone, modelo LLM alterno, o algo más específico? Rol sin confirmar.
- **ElevenLabs**: ¿voz es parte del MVP que se le muestra al jurado, o es un "nice to have" fuera de alcance por ahora?
- **Alcance del sistema RAG (Pinecone)**: ¿solo responde preguntas sobre coberturas del catálogo real, o también alimenta la lógica de matching/propensión?
- **Catálogo real de seguros**: aún no está estructurado — falta extraer y modelar la oferta desde https://www.colsubsidio.com/seguros (link en `README.md`), hoy solo tenemos los datos de uso de productos existentes, no el catálogo de seguros en sí.
- **Carga a Supabase**: pausada a propósito (ver `sql/schema.sql`) — falta decidir cuándo y cómo (conexión directa `psql`/`COPY` recomendada para 1.56M filas, ver notas del pipeline arriba).
- **Arquitectura general**: el equipo decidió explícitamente no cerrarla del todo hasta la explicación oficial completa del reto (ej. si el agente debe manejar transacciones de dinero directamente) — no tratar nada de este archivo como definitivo hasta esa sesión.

## Key conventions

- The injected `commit` skill's ticket-reference convention (`Fixes SENTRY-1234`) is a Sentry-specific leftover — don't reference Sentry tickets in commits here, there's no such tracker for this project. Its conventional-commit format and CHANGELOG.md upkeep still apply as-is.
- Add more here as the project evolves.
