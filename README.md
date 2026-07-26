# Asegura — asesor de seguros conversacional para Colsubsidio

> Hackathon Colsubsidio × 30X · Reto 2: venta automatizada de seguros · 22–26 julio 2026, Bogotá.

Llevar a una persona de **"no sé qué seguro necesito"** a **"ya quedé asegurada"** sin que hable con
un asesor. Conversa, descubre su necesidad real, le recomienda un seguro concreto del catálogo de
Colsubsidio, y le muestra **por qué ese y no otro**.

**Está desplegado y funcionando, con el cerebro real (no simulado):**

| | |
|---|---|
| 🗣️ **Vista cliente (web-chat)** | https://web-production-54174.up.railway.app/chat |
| 📊 **Vista admin (CRM)** | https://web-production-54174.up.railway.app |

- **Reto, contexto y decisiones:** [BRIEF.md](BRIEF.md) (incluye el brief oficial verbatim)
- **Catálogo de seguros Colsubsidio:** https://www.colsubsidio.com/seguros

---

## Sobre el proyecto

Hoy, comprar un seguro en Colsubsidio exige un asesor humano: no escala, no atiende 24/7, y cada
asesor explica distinto. Este proyecto automatiza ese proceso de punta a punta.

Colsubsidio es **sponsor, no aseguradora**: no emite las pólizas, facilita el acceso a las de varias
aseguradoras. El sistema no diseña seguros, ayuda a encontrar el adecuado entre los que existen.

**La idea central: un cerebro, cualquier canal, un perfil compartido.**

Un solo cerebro (agente + RAG + motor de reglas) atiende el canal que sea, y el perfil del usuario
vive en una sola base que el canal y el CRM leen y escriben. Hoy corre la web; el backend ya es
agnóstico al canal, así que WhatsApp entraría sin tocar el cerebro. El handoff es real, no simulado
con datos falsos: es el mismo registro por `id` en la misma base, y por eso una persona puede
retomar su conversación donde la dejó y un asesor humano puede tomar el control desde la bandeja.

**Lo que lo hace defendible ante el jurado:** el sistema nunca inventa un precio ni una cobertura, y
puede explicar cada recomendación. Las reglas explícitas (legibles en Git) deciden la **familia** de
seguro y producen la justificación; el RAG recupera el **producto** concreto de esa familia; el
modelo conversa pero no decide. Cuando preguntan "¿por qué a esta persona este seguro y no otro?",
la respuesta está en pantalla, no en el pitch.

---

## Construido con

- **Next.js 15 + React 19 + TypeScript** — las dos superficies y el servicio del cerebro.
- **Vocero CRM** (open source, MIT) — base de la vista administrativa (bandeja, pipeline, agente).
- **Railway** — hosting de los tres servicios y del Postgres de clientes.
- **PostgreSQL** — base de clientes, conversaciones y estado del CRM (perfil compartido).
- **Supabase + pgvector** — catálogo de seguros y vector store del RAG.
- **OpenAI** — el modelo conversacional del cerebro (`gpt-4o-mini` por defecto, configurable con
  `CEREBRO_MODEL`).
- **DuckDB + Python** — análisis offline de la base de 500K afiliados y derivación de las reglas.

---

## Cómo funciona

```
   Web-chat  ──┐                         ┌── Admin / CRM
   (cliente)   │                         │   (bandeja, pipeline, panel)
               ▼                         ▼
        ┌──────────────────────────────────────┐
        │  web  (Next.js · Vocero)             │
        │  canales · SSE · funnel · perfil     │
        └───────────────┬──────────────────────┘
                        │  POST /decidir
                        ▼
        ┌──────────────────────────────────────┐
        │  cerebro  (Next.js)                  │
        │  reglas → familia · RAG → producto   │
        │  LLM → conversación                  │
        └───────────────┬──────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        Postgres            Supabase + pgvector
        clientes, CRM       catálogo, embeddings
```

**La familia de seguro no la decide el modelo.** `recomendar(perfil)` la resuelve con las reglas de
`reglas.json` y se le entrega al agente como un hecho ya cerrado dentro del prompt, en cada turno.
El RAG busca el producto concreto **dentro** de esa familia. El modelo conversa y narra; no elige.
Por eso la recomendación es la misma para el mismo perfil, siempre, y es explicable.

El canal es agnóstico: hoy corre la web, y WhatsApp entra sin tocar el cerebro (queda como futuro).

El recorrido del usuario: llega → conversa (5 preguntas de discovery, una por turno) → recibe una
recomendación con su razón visible → compara opciones → ajusta coberturas → ve las exclusiones →
cierra con aceptación, confirmación y resumen. Contexto completo en [BRIEF.md](BRIEF.md) y la
arquitectura + plan de construcción en [ARQUITECTURA.md](ARQUITECTURA.md).

Detalle de cada pieza del cerebro (en lenguaje llano, con ejemplo de punta a punta), de dónde sale
el catálogo y cómo se construyó el RAG en Supabase con sus caveats: [CEREBRO.md](CEREBRO.md).

---

## Despliegue

Todo vive en un solo proyecto de Railway, `colsubsidio-asegura`, entorno `production`:

| Servicio | Qué es | Raíz |
|---|---|---|
| `web` | Superficies + backend + CRM | `app/` |
| `cerebro` | Agente, reglas y RAG | `cerebro/` |
| `Postgres` | Clientes, conversaciones, funnel | — |

`web` habla con `cerebro` por la **red privada** de Railway (`CEREBRO_URL=http://cerebro.railway.internal:3000`),
así que el cerebro no está expuesto a internet: el único punto público es `web`. Las migraciones de
Drizzle se aplican al arrancar el contenedor.

**Cada push a `main` redespliega los dos servicios automáticamente.** No hay paso manual — si algo
entra a `main`, está en producción en minutos.

Variables que importan (los valores viven en Railway, nunca en el repo):

| Servicio | Variable | Para qué |
|---|---|---|
| `web` | `CEREBRO_MODE` | `stub` (guionizado, sin red) · `external` (cerebro real) · `vocero` (LLM nativo). **Producción usa `external`** |
| `web` | `CEREBRO_URL` | Dónde vive el cerebro |
| `web` | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` | Base y sesiones |
| `cerebro` | `OPENAI_API_KEY` | El modelo |
| `cerebro` | `CEREBRO_MODEL` | Modelo a usar. Sin definir → `gpt-4o-mini` |
| `cerebro` | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Catálogo y embeddings del RAG |

> El Supabase del RAG es un proyecto aparte, propiedad del equipo del cerebro — no es el mismo
> Postgres de clientes. `cerebro/DEPLOY-VERCEL.md` describe un despliegue en Vercel que **ya no es
> el que corre**; quedó como referencia histórica.

---

## Correrlo local

Necesitas Node 22+, pnpm y un Postgres local. Con `CEREBRO_MODE=stub` no hace falta ninguna API key
ni el cerebro corriendo: el stub reproduce el recorrido completo.

```bash
cd app
cp .env.example .env      # ajusta DATABASE_URL; CEREBRO_MODE ya viene en stub
pnpm install
pnpm seed:demo            # 11 clientes de ejemplo con perfil, análisis y etapa
pnpm dev                  # aplica migraciones y levanta en :3000
```

Web-chat en `/chat`, admin en `/`. Para levantar también el cerebro real, ver
[cerebro/README.md](cerebro/README.md) y apuntar `CEREBRO_URL` a él.

Gate antes de subir nada:

```bash
cd app && pnpm typecheck && pnpm lint && pnpm build && pnpm test
cd ../cerebro && npm run typecheck && npm run build
```

---

## Roadmap

- [x] Reemplazo de la base de afiliados (500K registros, sin PII)
- [x] Pipeline de ETL y esquema Postgres
- [x] Documentación de contexto, reglas de propensión y UX
- [x] Scrape y estructura del catálogo de seguros + RAG
- [x] `reglas.json` de propensión desde el análisis
- [x] El cerebro (`recomendar()` + agente) — servicio propio en `cerebro/`, se llama por `CEREBRO_URL`
- [x] Backend de las superficies + admin sobre Vocero (`app/`)
- [x] Web-chat con el diseño de Sarah portado y cableado (chat por SSE, tags de perfil y ranking
      en vivo, slider de presupuesto que ajusta la recomendación)
- [x] Admin gerencial: panel con métricas, contactos, bandeja con perfil y análisis de IA
- [x] Conectar la app al cerebro real (`CEREBRO_MODE=external`) — es lo que corre en producción
- [x] Recomendación determinista: la familia se resuelve por reglas y se inyecta en el prompt,
      no depende de que el modelo llame una tool
- [x] Despliegue en Railway con redeploy automático desde `main`
- [x] _Ideal:_ pantalla de "a quién contactar hoy" (`/dashboard`) y laboratorio de agente (`/lab`,
      heredado de Vocero)
- [ ] _Futuro:_ simulador de WhatsApp (backend ya channel-agnostic)
- [ ] _Futuro:_ PDF de resumen al cierre

**Fuera de alcance** (por el brief o por infra): integración real con aseguradoras, firma
electrónica, pasarela de pago, siniestros, WhatsApp real, sincronización en vivo entre canales.

---

## Equipo

| Integrante | Rol |
|---|---|
| **Jhon** | El cerebro y el RAG: scrape del catálogo, RAG en Supabase, agente conversacional, `recomendar()` |
| **Samuel** | Full stack: open source, las 3 vistas, los canales y el backend, la base de clientes |
| **Sarah** | Diseño de las 3 vistas (Claude Design), confianza/explicabilidad, marca, pitch |
| **Luis** | Análisis de propensión: produce las reglas que alimentan el cerebro |

---

## Licencia

MIT. Hereda la licencia de Vocero CRM, sobre el que se construye la vista administrativa.

---

## Contacto

Equipo del Reto 2, hackathon Colsubsidio × 30X. Vía el repositorio.

---

## Agradecimientos

- **Colsubsidio** y **30X / Inogmap Labs** por el reto y los datos.
- **Vocero CRM** de [Kevin Belier](https://www.youtube.com/@KevinBelier) — CRM de WhatsApp open
  source (MIT) que sirve de base a la vista administrativa.
- **Manual de marca:** reconstrucción no oficial en [Manual de Marca Colsubsidio.md](Manual%20de%20Marca%20Colsubsidio.md).
