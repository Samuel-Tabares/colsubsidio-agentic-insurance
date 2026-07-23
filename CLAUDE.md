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
| **Jhon** | El cerebro y el RAG: scrape del catálogo → tabla + RAG en Supabase (pgvector), agente conversacional, `recomendar(perfil)`. El cerebro es único y lo llaman los dos canales |
| **Samuel** | Full stack: levanta el open source (Vocero CRM), las 3 vistas sobre el diseño de Sarah (app admin de 2 secciones, simulador WhatsApp, simulador web), y el backend que conecta los canales al cerebro + la base de clientes (perfil compartido) — **el rol detrás de este repo** |
| **Sarah** | Diseña las 3 vistas en Claude Design (referencia exacta, no programa el frontend); confianza/explicabilidad, marca, pitch. Puede ajustar detalles de UX sobre el código montado |
| **Luis** | Análisis de propensión: produce `reglas.json` desde la base, que alimenta el cerebro |

> Reparto rehecho el 2026-07-23 (ver `PLAN-CONSTRUCCION.md` y `BRIEF.md`). Cambió respecto del
> anterior: el cerebro/agente pasó a Jhon, Samuel se volvió full stack de la superficie, Luis quedó
> en propensión, Sarah diseña sin programar.

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

- **Categorical fields are now opaque, uncoded tokens — by team decision, treated as the real reference values as-is.** `categoria` (formerly `categoria_ingreso`, A–D with known CCF meaning), `segmento_grupo_familiar` (formerly text labels like `"FAMILIA MONOPARENTAL"`), `segmento_poblacional` (formerly `"Alto"`/`"Básico"`/`"Joven"`/`"Medio"`), and `piramide_empresa` (formerly `"1 Grandes"` etc.) all now come as Greek-letter tokens (`SIGMA`, `PI`, `LAMBDA`, `TAU`, `ETA`, ...) with no token→category codebook in the file or repo (see Colsubsidio's official explanation below — this is deliberate, not a gap to fill in). Each column has its own independent token space — e.g. `"PI"` appears as a value in three different columns with presumably unrelated meanings, so tokens are not comparable across columns. This is a known limitation for the explainability requirement (see risk note in Equipo section): rules can distinguish profiles by these tokens but can't currently name *why* in plain language for these 4 fields specifically.
- **Colsubsidio confirmed (2026-07-23) that the Greek-letter tokens are intentional, not an artifact of the extraction.** Their own words: the tokens exist "para proteger datos y clasificaciones internas... para preservar la consistencia de los datos para realizar análisis, agrupaciones y conteos, sin divulgar la clasificación original utilizada por Colsubsidio." They will not hand over the token→category mapping — treat that as final, not a pending ask. They did give the conceptual meaning of each field:
  - `categoria`: the affiliate's category within the *sistema de subsidio familiar* — consistent with (and likely the same axis as) the `rango_salarial|categoria` income-tier finding above.
  - `segmento_grupo_familiar`: household/family-structure composition of the affiliate.
  - `segmento_poblacional`: an individual segmentation built from income, age, and *PAC* (term as given by Colsubsidio, not expanded on).
  - `piramide_empresa` ("pirámide nueva"): the contributing company's tier within Colsubsidio's business pyramid.
  This confirms what each field represents conceptually — useful for framing rules and copy in general terms ("tu segmento de composición familiar", "el tier de tu empresa afiliadora") — but not which specific token maps to which specific bucket. The frequency-rank hypothesis below is still the best lead for that, and is now corroborated by category *type* for 3 of 4 fields (`categoria`≈income tier, `piramide_empresa`≈company tier both match Colsubsidio's description exactly); still not proof for any specific token.
- New field `rango_salarial`: 16 real salary brackets in SMLV (e.g. `"Entre 1 y 1.5 SMLV"`) — this is now the actual income signal, replacing what `categoria_ingreso` used to provide. A handful of brackets overlap/look like stray secondary labels (`"Entre 2 y 4 SMLV"`: 13 records, `"Entre 4 y 8 SMLV"`: 3, `"Entre 8 y 19 SMLV"`: 1, `"Menor a 2 SMLV"`: 123) — combined ~0.03% of rows, kept as-is rather than silently merged.
- `empresa_id` (formerly `empresa_asociada`, a boolean flag for "was it the redacted `X` placeholder") is now a real pseudonymized ID field with exactly 2 distinct values across the whole extract: `EMP_000001` (82%) and `EMP_000002` (18%).
- `nombre_completo` no longer exists in the source at all — it was dropped upstream, not just redacted.
- `ESTADOAFILIADO` was dropped from the source entirely (it carried no signal in the old extract anyway — 100% `"Al dia"`). `PISCILAGO` (`compra_piscinas_recreacion`) has taken over as the new "no discriminating signal" column: 100% `"NO"` in this extract.
- `ciudad` is blank in 58% of records (288,392 / 500,000) — same proportion as before, still not a reliable primary segmentation field without accounting for the gap.
- **The 500k extract is not the 1.56M extract with categorical columns re-labeled — it's a genuinely different/updated population, confirmed empirically (2026-07-23).** Checked the fields the Greek-letter recoding never touched (`genero`, `rango_edad`, `ciudad`, the 5 product booleans) against the old dataset's aggregate stats: `compra_piscinas_recreacion` went 4.88% → 0.00% (exact) and `compra_drogueria` went 5.55% → 17.65% (3.2×) — both statistically impossible (z ≈ −160 and +373 respectively) if this were a random subsample of the same 1.56M people. `genero`/`rango_edad` proportions also shifted 1–2.7pp (z of 26–39), and the one row-level check available (old `SERIE=1` was `"20 a 35 años"`, new `SERIE=1` is `"36 a 45 años"`, on a field never recoded) disagrees directly. Conclusion: treat this as a fresh extract, not an incremental relabel — don't try to join old and new rows by `SERIE`. (The exact row-level 10k×10k comparison the team wanted next needs the old raw CSV, which was deleted from disk this session — untracked, superseded, contained PII. It's not in git history. If needed again, the old dashboard artifact referenced a Google Drive folder as its source: `https://drive.google.com/drive/folders/1Bw3QhsnSN3kIS9qBfH06pA8pVo8ESwNX` — unverified whether still live.)
- **Unconfirmed hypothesis: the opaque tokens in `segmento_grupo_familiar`, `segmento_poblacional`, and `piramide_empresa` may be frequency-rank-decodable against the old dataset's real category labels**, the same way `categoria` was decoded via `rango_salarial` — but this is weaker evidence (cross-sample frequency correlation, not a same-sample statistical dependency), and Colsubsidio has already said they won't confirm the mapping (see above). Documented here so the reasoning isn't lost, not as something to build on directly:
  - `segmento_grupo_familiar` (7 tokens vs. the old 6 real labels — one more category now, already a reason for caution): rank-ordered proportions match closely — `LAMBDA` 57.3% ≈ `"AFILIADO SIN GRUPO FAMILIAR"` 58.0%; `RHO` 24.3% ≈ `"FAMILIA MONOPARENTAL"` 23.5%; `EPSILON` 9.40% ≈ `"FAMILIA NUCLEAR INTEGRAL"` 9.41% (near-exact); `IOTA` 5.05% ≈ `"PAREJA CONYUGAL"` 5.47%; `CHI` 2.37% ≈ `"FAMILIA MONOPARENTAL AMPLIADA"` 2.17%; `THETA` 1.59% is close to old `"(sin dato)"` 1.48% by proportion, but `THETA` is independently linked to the *same* 4,988 rows missing `rango_salarial` (its `segmento_poblacional` counterpart `OMEGA` is exactly 4,988) — so `THETA` more likely represents a real "no-salary-data" affiliate type (e.g. pensioned/independent) than a generic blank; `PI` (27 records) is the residual, roughly matching old `"FAMILIA NUCLEAR AMPLIADA"` (69 records) as "vanishingly rare."
  - `segmento_poblacional` (5 tokens, matches old count): `TAU` 46.2% ≈ `"Básico"` 48.8%; `PI` 27.0% ≈ `"Medio"` 26.8%; `ETA` 25.5% ≈ `"Joven"` 23.1%; `OMEGA` 1.00% ≈ `"(sin dato)"` 0.93% (corroborated independently, see above); `XI` 0.35% ≈ `"Alto"` 0.37%.
  - `piramide_empresa` (10 tokens, matches old count): mostly clean rank matches (`ETA`≈`"5 Micro Transaccional"`, `DELTA`≈`"3 Empresarial Top"`, etc.) except `XI` (21.7%) vs. `UPSILON` (20.4%) are too close in frequency to disambiguate against old `"2 Medianas"` (20.1%) / `"1 Grandes"` (20.0%) by rank alone — resolved tentatively by a structural cross-check: `empresa_id=EMP_000002` is 80% concentrated in `piramide_empresa=XI`, mirroring how the *old* dataset's `empresa_asociada` flag was 79.3% concentrated in `"1 Grandes"` — suggesting `XI ≈ "1 Grandes"` and therefore `UPSILON ≈ "2 Medianas"`.
  - None of this should be used to label things in the product — Colsubsidio has confirmed the real codebook isn't coming, and this is directional inference, not proof.

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
