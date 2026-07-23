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

| Integrante | Responsabilidades |
|---|---|
| **Sarah** | UX del journey conversacional, confianza/explicabilidad, organización marca, psicología consumidor, pitch |
| **Jhon** | RAG de seguros (catálogo + embeddings + búsqueda semántica), vector store (Pinecone) |
| **Samuel** | Backend (APIs, integración sistema-front) + arquitectura de BD de clientes (PostgreSQL/Supabase, schema JSONB, escalabilidad) — **el rol detrás de este repo** |
| **Luis** | Agente: harness, orquestación, análisis de propensión por cliente (JSON crudo + RAG → decisión), AI security |

Riesgo crítico identificado por el equipo: que la recomendación de un producto de seguro se sienta arbitraria o poco transparente para el usuario — refuerza el criterio de propensión explicable ya mencionado arriba.

## Stack

Hackathon-sponsored tools the team intends to use (get them for the sponsor perks) — **roles below reflect `RETO_2_SEGUROS.md` where confirmed, otherwise still a working hypothesis**:

| Tool | Role | Owner | Status |
|---|---|---|---|
| WhatsApp Business API | Primary conversational channel | Sarah/Frontend | confirmed intent, not locked |
| Pinecone | Vector store for RAG (seguros catalog + embeddings) | Jhon | confirmed intent, not provisioned |
| PostgreSQL / Supabase | Client data store (affiliates, profiles, conversations, CRM state) — `sql/schema.sql` targets it | Samuel | confirmed, not yet provisioned |
| Gemini API (or alt LLM) | LLM reasoning for agent logic (propensity analysis + conversation) | Luis | candidate |
| Houston AI | No-code agent builder (Colombian startup, ex-TaxFlow) — possible harness for agent | Luis | candidate |
| Hugging Face | Embeddings model for RAG (seguros catalog embeddings) | Jhon | candidate, role unconfirmed |
| Lovable | Frontend web UI generation (if needed alongside WhatsApp) | Sarah | candidate |
| ElevenLabs | Voice channel (TTS/STT), if voice is in scope | Sarah/Luis | candidate, only if voice is in MVP |
| Hosting | Backend + database hosting | Samuel | pending (depends on hackathon sponsors) |
| Auth | Anonymous-until-close vs. login-first | Luis/Samuel | pending team decision |

Update this table as the team locks in decisions — don't let it drift out of sync with reality.

## Data pipeline

- **Superseded 2026-07-23**: the team received a new source file, `Usos_Productos_Afiliados_SIN_ID.xlsx`, which fully replaces the earlier 1.56M-row CSV (now deleted — it was untracked/gitignored, so nothing was lost from git). This is not an incremental update: `SERIE` is a fresh 1..500000 sequence, unrelated to the old IDs.
- Raw source: `Usos_Productos_Afiliados_SIN_ID.xlsx` — 500,000 affiliate records, single sheet `"in"`, 15 columns. No PII (no name field at all — the "SIN_ID" filename is accurate now) and no longer exceeds GitHub's 100MB limit (29MB), so **it's tracked directly in git**, no `.gitignore` entry needed.
- `scripts/etl_afiliados.py` normalizes the raw xlsx into `output/afiliados_clean.csv` per the data model below, reading it directly via `openpyxl` (`read_only=True` streaming — no CSV intermediate). This makes `openpyxl` a hard dependency of the script (no longer stdlib-only, unlike the previous CSV-based version). Run with:
  ```
  python3 scripts/etl_afiliados.py
  ```
  Takes ~20s for the full file. Re-run after any change to the raw xlsx or to the field mappings in the script. It also writes `output/etl_report.txt` (row count, duplicate `SERIE` count, per-row warnings for values outside the known enums). `output/afiliados_clean.csv` (52MB, no PII) is also tracked in git now.
- `sql/schema.sql` is the Postgres DDL for the cleaned model (enum types + `afiliados_productos` table). **Not yet applied to any database** — Supabase project for this repo isn't provisioned yet.
- **Stale, needs regeneration against the new data** (tracked as follow-up, not yet done): `output/dashboard_stats.json`, `scripts/cross_analysis.py` and its output `output/cross_stats.json`, and the exploratory dashboard artifact linked in `README.md` — all of them reference the old 1.56M-row dataset and old field names/values (`categoria_ingreso`, text-label segments, `empresa_asociada` boolean). `cross_analysis.py` in particular hardcodes the old column names and enum text values and will need a rewrite, not just a re-run, before it's usable against the new schema.

## Data model notes

Non-obvious facts established by analyzing the full 500,000-row `.xlsx` source (see conversation/session history for the exploration — re-derive with `openpyxl` if needed, nothing scripted was checked in for this pass):

- **Categorical fields are now opaque, uncoded tokens — by team decision, treated as the real reference values as-is.** `categoria` (formerly `categoria_ingreso`, A–D with known CCF meaning), `segmento_grupo_familiar` (formerly text labels like `"FAMILIA MONOPARENTAL"`), `segmento_poblacional` (formerly `"Alto"`/`"Básico"`/`"Joven"`/`"Medio"`), and `piramide_empresa` (formerly `"1 Grandes"` etc.) all now come as Greek-letter tokens (`SIGMA`, `PI`, `LAMBDA`, `TAU`, `ETA`, ...) with **no codebook found** in the file or anywhere in the repo. Each column has its own independent token space — e.g. `"PI"` appears as a value in three different columns with presumably unrelated meanings, so tokens are not comparable across columns. This is a known limitation for the explainability requirement (see risk note in Equipo section): rules can distinguish profiles by these tokens but can't currently name *why* in plain language for these 4 fields specifically.
- New field `rango_salarial`: 16 real salary brackets in SMLV (e.g. `"Entre 1 y 1.5 SMLV"`) — this is now the actual income signal, replacing what `categoria_ingreso` used to provide. A handful of brackets overlap/look like stray secondary labels (`"Entre 2 y 4 SMLV"`: 13 records, `"Entre 4 y 8 SMLV"`: 3, `"Entre 8 y 19 SMLV"`: 1, `"Menor a 2 SMLV"`: 123) — combined ~0.03% of rows, kept as-is rather than silently merged.
- `empresa_id` (formerly `empresa_asociada`, a boolean flag for "was it the redacted `X` placeholder") is now a real pseudonymized ID field with exactly 2 distinct values across the whole extract: `EMP_000001` (82%) and `EMP_000002` (18%).
- `nombre_completo` no longer exists in the source at all — it was dropped upstream, not just redacted.
- `ESTADOAFILIADO` was dropped from the source entirely (it carried no signal in the old extract anyway — 100% `"Al dia"`). `PISCILAGO` (`compra_piscinas_recreacion`) has taken over as the new "no discriminating signal" column: 100% `"NO"` in this extract.
- `ciudad` is blank in 58% of records (288,392 / 500,000) — same proportion as before, still not a reliable primary segmentation field without accounting for the gap.

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
