# Catálogo y RAG — cómo funciona y de dónde viene el dato

Este doc narra el frente del catálogo de punta a punta: de dónde sale el dato, cómo se estructura,
cómo llega a Supabase, y cómo el agente lo usa. Es la referencia para explicarle al jurado "cómo
funciona" y "de dónde vienen los datos" en la parte de productos.

Frente de Jhon. La parte de perfiles/propensión está en `ANALISIS-PROPENSION.md`.

---

## 1. De dónde viene el dato (procedencia)

El catálogo no venía estructurado: Colsubsidio solo dio la URL. Se construyó a mano desde la web
pública. La cadena completa:

1. **Fuente:** las páginas públicas de producto de `colsubsidio.com/seguros` (22 URLs). La raíz es
   dinámica, así que se scrapean las páginas de producto, no el índice. Detalle en
   `SPEC-SCRAPE-CATALOGO.md`.
2. **Scrape:** `firecrawl_scrape` (MCP) por URL, con `actions: scroll` forzado antes de extraer. La
   sección "Tipos de seguros" (donde viven los planes y el precio) carga lazy en varias páginas del
   sitio; sin scroll, el DOM capturado no la incluye y el extractor no ve algo que sí está en la
   página. Se detectó comparando el markdown con y sin scroll contra `mascotas/medicina-prepagada`
   y se confirmó re-scrapeando las 22 con el fix. Salida en `Scrape-resultado/enrichment_v2.json`.
3. **Consolidación:** `consolidar_catalogo.py` toma el export, deriva `id`/`familia`/`url` desde la
   URL (no se confían al modelo), limpia los "no especificado" a vacío, itemiza coberturas y
   normaliza `planes` (descarta planes cuyo nombre sea texto de botón, ej. "Cotiza"). Produce
   `catalogo-seguros.json` (la fuente de verdad) e `ingest-rows.json` (listo para embeber).
4. **Embeddings + carga:** `ingest_catalogo.py` calcula los vectores (OpenAI text-embedding-3-small,
   1536) y genera `insert_catalogo.sql`, que se pega en Supabase junto a `supabase-schema.sql`.

En una línea: web pública → Firecrawl → `catalogo-seguros.json` → embeddings → tabla `catalogo` en
Supabase.

---

## 2. Calidad del catálogo y sus caveats (importante para el pitch)

22 productos, 5 familias (familiares 10, hogar 2, deudores-financieros 3, vehiculos 4, mascotas 3).
Lo que hay que saber y poder defender:

- **`aseguradora` (columna) = "Colsubsidio" en las 22, y es correcto.** Es el canal de compra, no el
  underwriter. **El underwriter real SÍ está en el HTML público** y vive dentro de cada plan de
  `planes` (BMI, MetLife, Pan American Life, Chubb, Sura, Allianz, AXA Colpatria, Seguros Bolívar,
  Equidad, Mapfre, GEA, Seguros Mundial, SBS...). La versión anterior de este doc decía que el
  underwriter no era público; era un error, corregido tras re-scrapear las 22 con el fix de scroll
  (ver §1). El comparador puede comparar aseguradora real, no solo Colsubsidio como marca.
- **El precio vive en `planes`, no hay `precio_desde` a nivel producto.** Una página publica 1 o
  varios planes (uno por aseguradora), y cada uno tiene su propio `precio_mensual_desde` (entero) o
  `null` si no publica cifra. 9 de los 22 productos tienen al menos un plan con precio; el resto no
  publica ninguno, la prima la confirma un asesor. El agente lee `planes` y nombra siempre el plan
  al dar una cifra ("BMI arranca en $20.000"), nunca un número suelto que esconda que otro plan de
  la misma página no publica precio. Regla de arquitectura: el LLM no inventa primas.
- **`exclusiones` casi vacías (1 de 22).** La web no publica la letra menuda. La fuente real son los
  PDF de condiciones, diferidos a una segunda pasada.
- **`coberturas` itemizadas**, tanto a nivel producto como dentro de cada plan. Venían como una
  frase con comas; se parten en items para el comparador.
- **Los "No especificado / N/A" se normalizan a vacío** en la consolidación, para no ensuciar el
  RAG con no-datos.

Estas caveats son honestas y juegan a favor en el gate de confianza: sabemos qué tenemos y qué no.

---

## 3. Cómo funciona el RAG

**La tabla `catalogo`** (ver `supabase-schema.sql`): metadata (`id`, `familia`, `aseguradora`,
`nombre_producto`, `url`, `planes` jsonb), `page_content` (un bloque XML por producto que incluye
un sub-bloque `<planes>` por cada plan, es lo que se embebe), y `embedding` (vector 1536). RLS
activo: lectura pública, sin escritura desde el cliente; la ingesta entra por la service key.

**La función `match_catalogo(query_embedding, familia_filter, match_count)`:** filtra
`WHERE familia = familia_filter` y dentro de esa familia ordena por similitud de coseno. El filtro
por familia es la pieza clave: el RAG solo elige el producto dentro de una familia que ya decidieron
las reglas, no sobre el catálogo revuelto.

**`recomendar(perfil)`** (frente de Fase 3): las reglas de `reglas.json` deciden la FAMILIA (con
razón citable), `match_catalogo` recupera el PRODUCTO dentro de ella, y el LLM narra. El LLM no
decide familia, producto ni prima. Es el modelo de "dos cerebros" descrito en
`ANALISIS-PROPENSION.md`.

Sin índice vectorial a propósito: a 22 filas el seq scan es instantáneo. Se agrega HNSW si el
catálogo crece a cientos.

---

## 4. Archivos del frente

- `SPEC-SCRAPE-CATALOGO.md` — qué scrapear y por qué.
- `FIRECRAWL-INPUTS.md` — receta original del scrape por UI (histórica; el scrape vigente usa
  `firecrawl_scrape` MCP con scroll forzado, ver §1).
- `urls.csv` — las 22 URLs.
- `Scrape-resultado/enrichment_v2.json` — el scrape crudo vigente (con planes y scroll forzado).
- `consolidar_catalogo.py` — cruda a `catalogo-seguros.json` + `ingest-rows.json`.
- `catalogo-seguros.json` — la fuente de verdad del catálogo.
- `ingest-rows.json` — metadata + page_content, listo para embeber.
- `ingest_catalogo.py` — embeddings + `insert_catalogo.sql`.
- `supabase-schema.sql` — tabla `catalogo`, `match_catalogo`, RLS.

---

## 5. Reproducir desde cero

1. Scrape cada URL de `urls.csv` con `firecrawl_scrape`, `formats: ["json"]`, y `actions` con dos
   scroll + wait antes de extraer (la sección de planes es lazy-load). Esquema: `nombre_producto`,
   `descripcion_corta`, `a_quien_protege`, `coberturas`, `exclusiones`, `requisitos`, `planes[]`
   (cada plan: `nombre_plan`, `aseguradora`, `precio_mensual_desde` numérico o null, `coberturas`).
   Consolidar en un array `[{url, json: {...}}, ...]` → `Scrape-resultado/enrichment_v2.json`.
2. `python consolidar_catalogo.py Scrape-resultado/enrichment_v2.json`
3. `python ingest_catalogo.py` (necesita `OPENAI_API_KEY`).
4. En Supabase: correr `supabase-schema.sql`, luego `insert_catalogo.sql`.
5. Verificar: `select count(*) from catalogo` = 22; probar `match_catalogo`; confirmar que
   `jsonb_array_length(planes) > 0` en los productos con plan conocido.
