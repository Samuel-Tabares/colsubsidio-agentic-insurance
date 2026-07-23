# Emulador — Propuesta de arquitectura

> Borrador de Samuel (backend/datos) para discutir con el equipo. No es una decisión cerrada — el equipo ya acordó no cerrar arquitectura hasta la sesión oficial completa (ver `RETO_2_SEGUROS.md`). Esto es la propuesta de la pieza de datos que me toca a mí.

## Qué estamos construyendo

Un **emulador** con dos vistas, para poder demostrar el flujo completo al jurado sin depender de WhatsApp real:

- **Vista gerente**: dashboard de todas las conversaciones bot↔cliente, y un CRM con los clientes organizados en fases de venta. En la fase de "comprado", muestra qué seguro compró cada cliente, cruzado con sus datos reales del CSV.
- **Vista cliente**: un chat simple donde el cliente conversa con el bot. Cada cliente del emulador tiene un `serie` (id del CSV) — el sistema, por detrás, usa ese id para traer el perfil crudo del afiliado, correrle el análisis de propensión + RAG de seguros, y decidir cómo abordarlo.

Después, para la demo real con **Kapso/WhatsApp**, el único cambio es el id: en vez de `serie` (CSV), se usa `celular`. El backend no debe distinguir entre los dos — trata el id como un string opaco.

## Roles del equipo (referencia)

| Quién | Encargado de |
|---|---|
| RAG | Analizar el catálogo real de seguros Colsubsidio, alimentar el sistema RAG |
| Jhon | Agente conversacional completo (orquestación, flujo) |
| Samuel | Backend y arquitectura de datos |
| UX | Que el emulador sea una demo sólida y confiable (potencial integración a WhatsApp) |

## Arquitectura de datos propuesta

### Motor: Postgres/Supabase, no un KV engine aparte

La idea original era una base llave-valor (`id → JSON crudo del cliente`). Eso es correcto conceptualmente, pero no hace falta un motor KV dedicado (Redis, DynamoDB): Postgres con una columna `JSONB` indexada por `id` da la misma semántica de lookup y ya es la pieza de stack confirmada (`sql/schema.sql`). A esta escala (1.5M filas, lookup por *primary key*) el rendimiento no es un problema, y evitamos sumar un servicio más a provisionar/mantener en 4 días. Bono: permite hacer SQL directo para las agregaciones que el dashboard del gerente necesita (conteo por fase, filtrar por seguro comprado, etc.), algo que un KV puro no da gratis.

### Tres objetos de datos separados (no uno solo)

Punto importante: **el análisis y el estado del CRM no pueden vivir en el mismo blob que se hashea para el cache.** Si el estado de fase (que cambia en cada mensaje) está dentro del objeto que se hashea, el cache nunca pega — invalida el mecanismo completo. Se separan en tres:

1. **`perfil_crudo`** (JSONB) — snapshot de las variables del CSV para ese `id` (edad, categoría de ingreso, grupo familiar, ciudad, productos usados, etc.). Esto casi no cambia — es la fuente que se compara contra el RAG.
2. **`analisis`** (JSONB) + **`analisis_hash`** — resultado del cruce propensión + RAG (qué seguro(s) recomendar y por qué), más el hash del `perfil_crudo` que lo generó. En cada interacción: se recalcula el hash del perfil actual, se compara contra `analisis_hash`; si coincide, se reusa el análisis; si no, se recalcula y se sobreescriben ambos.
3. **`estado_crm`** — fase actual, historial de fases, `seguro_comprado` (si aplica), timestamps. Cambia con cada interacción, vive separado justamente para no romper el cache del punto 2.

Más una cuarta pieza, implícita en lo que describiste pero no explícita:

4. **`conversaciones`** (tabla de mensajes: `id_cliente`, `remitente` [cliente/bot], `contenido`, `timestamp`) — alimenta el dashboard del gerente que necesita ver la conversación completa.

### Esquema aproximado (a validar)

```sql
CREATE TABLE clientes (
    id              TEXT PRIMARY KEY,        -- serie (emulador) o celular (Kapso)
    perfil_crudo    JSONB NOT NULL,
    analisis        JSONB,
    analisis_hash   TEXT,
    estado_crm      JSONB NOT NULL DEFAULT '{"fase": "prospecto"}',
    creado_en       TIMESTAMPTZ DEFAULT now(),
    actualizado_en  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversaciones (
    id              BIGSERIAL PRIMARY KEY,
    cliente_id      TEXT REFERENCES clientes(id),
    remitente       TEXT CHECK (remitente IN ('cliente', 'bot')),
    contenido       TEXT NOT NULL,
    timestamp       TIMESTAMPTZ DEFAULT now()
);
```

### Fases del CRM (propuesta, a validar con el equipo)

Funnel estándar de ventas de seguros, como punto de partida para ajustar:

`Prospecto` → `Contactado` → `Necesidad identificada` → `Oferta presentada` → `En negociación / resolviendo dudas` → `Comprado`
(rama lateral: `Descartado / perdido`)

## Preguntas abiertas

- ¿El `analisis` debe re-disparar automáticamente una nueva oferta si cambia mientras el cliente ya está en conversación, o solo se recalcula al inicio de cada sesión?
- Para la demo real (Kapso), no existe hoy un mapeo `celular → serie` — no es parte del alcance del reto (no hay integración real con aseguradoras/datos), pero vale la pena que el equipo lo tenga presente como limitación conocida.
- ¿Quién define el criterio exacto de "necesidad identificada" → "oferta presentada" en el CRM? Probablemente vive en la lógica del agente (Jhon), pero el backend necesita saber qué dispara el cambio de fase para escribir `estado_crm`.
