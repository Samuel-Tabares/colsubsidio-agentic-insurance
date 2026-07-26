# Asegura — asesor de seguros conversacional para Colsubsidio

[https://web-production-54174.up.railway.app/chat] vista cliente (web-chat)
[https://web-production-54174.up.railway.app/] vista admin app

> Hackathon Colsubsidio × 30X · Reto 2: venta automatizada de seguros · 22–26 julio 2026, Bogotá.

Llevar a una persona de **"no sé qué seguro necesito"** a **"ya quedé asegurada"** sin que hable con
un asesor. Conversa, descubre su necesidad real, le recomienda un seguro concreto del catálogo de
Colsubsidio, y le muestra **por qué ese y no otro**.

- **Demo:** _(pendiente de desplegar)_
- **Reto, contexto y decisiones:** [BRIEF.md](BRIEF.md) (incluye el brief oficial verbatim)
- **Catálogo de seguros Colsubsidio:** https://www.colsubsidio.com/seguros

---

## Sobre el proyecto

Hoy, comprar un seguro en Colsubsidio exige un asesor humano: no escala, no atiende 24/7, y cada
asesor explica distinto. Este proyecto automatiza ese proceso de punta a punta.

Colsubsidio es **sponsor, no aseguradora**: no emite las pólizas, facilita el acceso a las de varias
aseguradoras. El sistema no diseña seguros, ayuda a encontrar el adecuado entre los que existen.

**La idea central: un cerebro, dos canales, un perfil compartido.**

Un solo cerebro (agente + RAG + motor de reglas) atiende dos canales, un WhatsApp simulado y una
web, y el perfil del usuario vive en una sola base que ambos leen y escriben. Por eso el recorrido
es de punta a punta en cualquiera de los dos: el usuario puede terminar en WhatsApp o saltar a la
web y encontrar su contexto ya cargado. El handoff es real, no simulado con datos falsos: es el
mismo registro por `id` en la misma base.

**Lo que lo hace defendible ante el jurado:** el sistema nunca inventa un precio ni una cobertura, y
puede explicar cada recomendación. Las reglas explícitas (legibles en Git) deciden la **familia** de
seguro y producen la justificación; el RAG recupera el **producto** concreto de esa familia; el
modelo conversa pero no decide. Cuando preguntan "¿por qué a esta persona este seguro y no otro?",
la respuesta está en pantalla, no en el pitch.

---

## Construido con

- **Next.js 15 + React 19 + TypeScript** — app web y simuladores.
- **Vocero CRM** (open source, MIT) — base de la vista administrativa (bandeja, pipeline, agente).
- **Supabase / PostgreSQL** — base de clientes (perfil compartido) y vector store (pgvector) del RAG.
- **DuckDB + Python** — análisis offline de la base de 500K afiliados y derivación de las reglas.
- **LLM conversacional** — el cerebro del agente _(modelo por confirmar)_.

---

## Cómo funciona

```
   WhatsApp (simulado)              Web
   oferta + precalificación         simulación, comparación,
   + confirmación                   ajuste, decisión, cierre
          │                               │
          └───────────────┬───────────────┘
                          ▼
             CEREBRO  (agente + RAG + recomendar)
                          │
                          ▼
             PERFIL COMPARTIDO  (un id por usuario;
             los dos canales leen y escriben aquí)
```

El recorrido del usuario: llega → conversa (5 preguntas de discovery, una por turno) → recibe una
recomendación con su razón visible → compara opciones → ajusta coberturas → ve las exclusiones →
cierra con aceptación, confirmación y resumen. Contexto completo en [BRIEF.md](BRIEF.md) y la
arquitectura + plan de construcción en [ARQUITECTURA.md](ARQUITECTURA.md).

Detalle de cada pieza del cerebro (en lenguaje llano, con ejemplo de punta a punta), de dónde sale
el catálogo y cómo se construyó el RAG en Supabase con sus caveats: [CEREBRO.md](CEREBRO.md).

---

## Roadmap

- [x] Reemplazo de la base de afiliados (500K registros, sin PII)
- [x] Pipeline de ETL y esquema Postgres
- [x] Documentación de contexto, reglas de propensión y UX
- [x] Scrape y estructura del catálogo de seguros + RAG
- [x] `reglas.json` de propensión desde el análisis
- [x] El cerebro (`recomendar()` + agente) — repo aparte; la app se conecta por `CEREBRO_URL`
- [x] Backend de las superficies + admin sobre Vocero (`app/`), corriendo con cerebro stub
- [x] Web-chat sobre el diseño de Sarah (hoy UI placeholder en `/chat`)
- [x] Conectar la app al cerebro real (`CEREBRO_MODE=external`)
- [ ] _Futuro:_ simulador de WhatsApp (backend ya channel-agnostic)
- [x] Despliegue y README de arranque en < 2 minutos
- [x] _Ideal:_ PDF de resumen al cierre, pantalla de "a quién contactar hoy", laboratorio de agente

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
