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
2. **Scrape:** batch table de Firecrawl, una columna por campo, un mismo prompt para las 22.
   Receta exacta (prompt, columnas, URLs) en `FIRECRAWL-INPUTS.md`. Salida cruda en
   `Scrape-resultado/enrichment_results.json`.
3. **Consolidación:** `consolidar_catalogo.py` toma el export, deriva `id`/`familia`/`url` desde la
   URL (no se confían al modelo), limpia los "no especificado" a vacío, e itemiza las coberturas.
   Produce `catalogo-seguros.json` (la fuente de verdad) e `ingest-rows.json` (listo para embeber).
4. **Embeddings + carga:** `ingest_catalogo.py` calcula los vectores (OpenAI text-embedding-3-small,
   1536) y genera `insert_catalogo.sql`, que se pega en Supabase junto a `supabase-schema.sql`.

En una línea: web pública → Firecrawl → `catalogo-seguros.json` → embeddings → tabla `catalogo` en
Supabase.

---

## 2. Calidad del catálogo y sus caveats (importante para el pitch)

22 productos, 5 familias (familiares 10, hogar 2, deudores-financieros 3, vehiculos 4, mascotas 3).
Lo que hay que saber y poder defender:

- **`aseguradora` = "Colsubsidio" en las 22.** Colsubsidio es el sponsor/distribuidor, no el
  underwriter. Los aseguradores reales (Sura, Allianz) no están en el HTML público, se verificó con
  un scrape dirigido. Por eso el comparador compara producto/cobertura/precio, no aseguradoras. Ver
  el reframe en `BRIEF.md`.
- **`precio_desde` vacío en casi todos.** Las páginas no publican prima; la conoce un asesor o la
  base privada de Colsubsidio. El agente responde "consultar con asesor", nunca inventa una cifra
  (regla de arquitectura: el LLM no inventa primas).
- **`exclusiones` casi vacías (1 de 22).** La web no publica la letra menuda. La fuente real son los
  PDF de condiciones, diferidos a una segunda pasada.
- **`coberturas` itemizadas.** Venían como una frase con comas; se parten en items para el
  comparador.
- **Los "No especificado / N/A" se normalizan a vacío** en la consolidación, para no ensuciar el
  RAG con no-datos.

Estas caveats son honestas y juegan a favor en el gate de confianza: sabemos qué tenemos y qué no.

---

## 3. Cómo funciona el RAG

**La tabla `catalogo`** (ver `supabase-schema.sql`): metadata (`id`, `familia`, `aseguradora`,
`nombre_producto`, `precio_desde`, `url`), `page_content` (un bloque XML por producto, es lo que se
embebe), y `embedding` (vector 1536). RLS activo: lectura pública, sin escritura desde el cliente;
la ingesta entra por la service key.

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
- `FIRECRAWL-INPUTS.md` — la receta del scrape (prompt, columnas, URLs).
- `urls.csv` — las 22 URLs para importar en Firecrawl.
- `Scrape-resultado/enrichment_results.json` — el scrape crudo.
- `consolidar_catalogo.py` — cruda a `catalogo-seguros.json` + `ingest-rows.json`.
- `catalogo-seguros.json` — la fuente de verdad del catálogo.
- `ingest-rows.json` — metadata + page_content, listo para embeber.
- `ingest_catalogo.py` — embeddings + `insert_catalogo.sql`.
- `supabase-schema.sql` — tabla `catalogo`, `match_catalogo`, RLS.

---

## 5. Reproducir desde cero

1. Scrape según `FIRECRAWL-INPUTS.md`, exportar a `Scrape-resultado/enrichment_results.json`.
2. `python consolidar_catalogo.py Scrape-resultado/enrichment_results.json`
3. `python ingest_catalogo.py` (necesita `OPENAI_API_KEY`).
4. En Supabase: correr `supabase-schema.sql`, luego `insert_catalogo.sql`.
5. Verificar: `select count(*) from catalogo` = 22; probar `match_catalogo`.
