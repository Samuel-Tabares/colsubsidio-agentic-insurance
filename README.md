# colsubsidio-agentic-insurance

Hackathon Colsubsidio × 30X (22-26 julio 2026, Bogotá) — Reto 2: llevar a un afiliado de **"no sé qué seguro necesito"** a **"quedé asegurado"**, sin que un asesor humano intervenga en el proceso.

- **Reto completo:** [RETO_2_SEGUROS.md](RETO_2_SEGUROS.md)
- **Catálogo de seguros Colsubsidio:** https://www.colsubsidio.com/seguros
- **Dashboard exploratorio de datos de afiliados:** https://claude.ai/code/artifact/50f755f6-edd1-4c2d-b567-61f927fc6676
- **Guía técnica para trabajar en este repo:** [CLAUDE.md](CLAUDE.md)
- **Manual de marca (reconstrucción no oficial):** [Manual de Marca Colsubsidio.md](Manual%20de%20Marca%20Colsubsidio.md)

## Equipo

| Integrante | Rol |
|---|---|
| Sarah | UX del journey conversacional, confianza/explicabilidad, pitch |
| Jhon | RAG de seguros (catálogo, embeddings, búsqueda semántica) |
| Samuel | Backend y arquitectura de BD de clientes (PostgreSQL/Supabase, schema JSONB) |
| Luis | Agente (harness, orquestación, análisis de propensión por cliente, seguridad AI) |

## Estado del proyecto

- **Datos de afiliados**: 500,000 registros de uso de productos Colsubsidio (`Usos_Productos_Afiliados_SIN_ID.xlsx`, actualizado 2026-07-23, reemplaza el dataset anterior de 1.56M filas), normalizados y validados. Ver [`scripts/etl_afiliados.py`](scripts/etl_afiliados.py) y [`sql/schema.sql`](sql/schema.sql). El dashboard exploratorio de arriba ya refleja este dataset.
- **Stack**: aún no cerrado por el equipo (WhatsApp Business API, Pinecone y PostgreSQL/Supabase son las piezas más confirmadas). Ver la tabla de stack y decisiones pendientes en [CLAUDE.md](CLAUDE.md).
- **Catálogo real de seguros**: pendiente de extraer y modelar desde el link de arriba.

## Correr el pipeline de datos

```bash
python3 scripts/etl_afiliados.py
```

Normaliza `Usos_Productos_Afiliados_SIN_ID.xlsx` (versionado en el repo, sin PII) en `output/afiliados_clean.csv`. Detalle completo del modelo de datos en [CLAUDE.md](CLAUDE.md).
