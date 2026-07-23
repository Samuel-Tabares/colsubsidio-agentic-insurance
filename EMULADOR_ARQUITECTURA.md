# Emulador — Arquitectura del Sistema

> Propuesta de Samuel (backend/datos), validada con todo el equipo. La decisión de roles está cerrada: Jhon hace RAG de seguros, Samuel hace BD de clientes, Luis hace agente + análisis.

> ⚠️ **Nota del 23 de julio, propuesta de Jhon, pendiente de que Samuel la revise.**
>
> **Lo que sigue vigente y correcto de este documento:** el esquema SQL, la separación de los
> cuatro objetos de datos, las tablas de `conversaciones` y `auditoria_cambios`, las fases del CRM,
> y la decisión de usar Postgres con JSONB en vez de un motor llave-valor aparte. Nada de eso se
> toca. La trazabilidad de esas dos tablas además resuelve el ángulo normativo del reto, que un
> mentor señaló como importante.
>
> **Lo que quedó superado:** el paso del flujo donde el RAG devuelve "resultados ordenados por
> relevancia" y de ahí sale el análisis de propensión. Eso pone a la búsqueda semántica a decidir
> qué seguro se recomienda, y el gate número uno del jurado es *"¿por qué a esta persona le
> mostraste este seguro y no otro?"*. Bajo ese flujo la respuesta honesta es "porque el vector
> quedó cerca", que es exactamente la caja negra que el brief descalifica.
>
> **La corrección, que conserva el trabajo de todos:**
> - Las **reglas explícitas deciden la FAMILIA** de seguro (vida, salud, accidentes, hogar, viajes,
>   mascotas, movilidad) y producen la justificación en texto. Salen del análisis de propensión.
> - El **RAG recupera el PRODUCTO concreto** dentro de esa familia, con coberturas, exclusiones y
>   condiciones. Ahí sí es la herramienta correcta, porque es un problema de recuperación.
> - El **LLM conversa y narra.** No decide familia, ni producto, ni prima.
>
> Enfoque vigente y detallado en `ANALISIS-PROPENSION.md`. Contexto y razonamiento en `BRIEF.md`,
> Parte 4.
>
> Una segunda observación, menor y discutible: el mecanismo de hash y rehash del análisis es un
> cache para no recalcular. Con un puñado de conversaciones en un demo cuesta depuración y no compra
> nada que el jurado vea. Sugerencia de recalcular siempre y dejar el hash documentado como ruta de
> escalado, pero si ya está diseñado y funciona, no vale la pena tocarlo.

## Flujo de datos de extremo a extremo

```
Cliente inicia conversación
    ↓
Luis (agente) obtiene id del cliente (serie o celular)
    ↓
Samuel: consulta DB → obtiene JSON crudo del cliente
    ↓
Luis: calcula hash(JSON) y lo compara con análisis_hash guardado
    ├─ Si hash coincide: reutiliza análisis existente
    └─ Si no coincide: calcula nuevo análisis
         ↓
         Luis consulta RAG de Jhon: "dame seguros relevantes para este perfil"
         ↓
         Jhon (RAG) retorna resultados ordenados por relevancia
         ↓
         Luis genera análisis (propensión scores, recomendaciones) y guarda en BD
    ↓
Luis usa análisis + JSON del cliente para dirigir la conversación
    ↓
En cada mensaje del cliente, Luis actualiza el JSON (si hay cambios en datos)
    ├─ Si datos cambian: rehashea, recalcula análisis
    └─ Si no: sigue con el análisis actual
    ↓
Cliente compra → Samuel escribe en estado_crm
```

## Qué estamos construyendo

Un **emulador** con dos vistas, para poder demostrar el flujo completo al jurado sin depender de WhatsApp real:

- **Vista gerente**: dashboard de todas las conversaciones bot↔cliente, y un CRM con los clientes organizados en fases de venta. En la fase de "comprado", muestra qué seguro compró cada cliente, cruzado con sus datos reales del CSV.
- **Vista cliente**: un chat simple donde el cliente conversa con el bot. Cada cliente del emulador tiene un `serie` (id del CSV) — el sistema, por detrás, usa ese id para traer el perfil crudo del afiliado, correrle el análisis de propensión + RAG de seguros, y decidir cómo abordarlo.

Después, para la demo real con **Kapso/WhatsApp**, el único cambio es el id: en vez de `serie` (CSV), se usa `celular`. El backend no debe distinguir entre los dos — trata el id como un string opaco.

## Roles del equipo

| Quién | Responsabilidades | Entrega |
|---|---|---|
| **Jhon** | RAG de seguros: extraer catálogo Colsubsidio, generar embeddings, indexar en Pinecone | Vector store consultable con búsqueda semántica ("seguros para jóvenes sin hijos", etc.) |
| **Samuel** | Backend + BD de clientes: schema Postgres (JSON crudo, análisis, estado_crm), conexión de APIs, escalabilidad KV-like para 1.5M clientes | DB con escritura/lectura eficiente, endpoint backend listo |
| **Luis** | Agente harness: orquestación (cuándo consultar RAG, cuándo cambiar BD), análisis de propensión (hash + rehash), AI security | Agente que consulta RAG + BD y dirige conversación, con análisis persistente y razonamiento explícito |
| **Sarah** | UX: emulador dual (gerente + cliente), chat como WhatsApp, confianza/transparencia, marca Colsubsidio | Interfaz usable que demuestre el flujo completo sin narración |

## Arquitectura de datos propuesta

### Motor: Postgres/Supabase, no un KV engine aparte

La idea original era una base llave-valor (`id → JSON crudo del cliente`). Eso es correcto conceptualmente, pero no hace falta un motor KV dedicado (Redis, DynamoDB): Postgres con una columna `JSONB` indexada por `id` da la misma semántica de lookup y ya es la pieza de stack confirmada (`sql/schema.sql`). A esta escala (1.5M filas, lookup por *primary key*) el rendimiento no es un problema, y evitamos sumar un servicio más a provisionar/mantener en 4 días. Bono: permite hacer SQL directo para las agregaciones que el dashboard del gerente necesita (conteo por fase, filtrar por seguro comprado, etc.), algo que un KV puro no da gratis.

### Cuatro objetos de datos separados (no uno solo)

Punto crucial: **el análisis de propensión y el estado del CRM no pueden vivir en el mismo blob que se hashea.** Si el estado cambia en cada mensaje, el cache nunca reutiliza análisis — invalida el mecanismo completo. La separación permite a Luis reutilizar trabajo costoso (análisis) mientras sigue avanzando el flujo de venta.

1. **`perfil_crudo`** (JSONB) — variables del CSV para ese `id` (edad, categoria_ingreso, grupo_familiar, ciudad, productos_usados, etc.). Se actualiza si el usuario reporta cambios durante la conversación. **Luis notifica cambios a Samuel.**

2. **`analisis`** (JSONB) + **`analisis_hash`** — resultado del análisis de propensión (qué seguros recomendar, puntuación, justificación, ranking del RAG). Generado por Luis consultando el RAG de Jhon. **Lógica de rehash:**
   - En cada interacción: Luis calcula `hash_actual = sha256(perfil_crudo)`
   - Compara contra `analisis_hash` guardado
   - **Si coincide**: reutiliza `analisis` existente (sin consultar RAG)
   - **Si no coincide**: Luis recalcula análisis (consulta RAG de Jhon) y sobreescribe ambos (`analisis` + `analisis_hash`)

3. **`estado_crm`** (JSONB) — fase actual (`prospecto` → `contactado` → `necesidad_identificada` → `oferta_presentada` → `en_negociacion` → `comprado`), historial de fases, `seguro_comprado` (si aplica), timestamps. Cambia con cada interacción, vive separado para no romper el cache del punto 2.

4. **`conversaciones`** (tabla de mensajes: `id_cliente`, `remitente` [cliente/bot], `contenido`, `timestamp`, `metadata`). Alimenta el dashboard del gerente con historial completo, trazabilidad y auditoría.

### Esquema SQL (Postgres/Supabase)

```sql
-- Tabla de clientes con análisis de propensión cacheable
CREATE TABLE clientes (
    id                      TEXT PRIMARY KEY,              -- serie (emulador) o celular (Kapso)
    perfil_crudo            JSONB NOT NULL,               -- snapshot de variables del CSV (edad, ingreso, etc.)
    analisis                JSONB,                         -- resultado de análisis de propensión (scores, recomendaciones)
    analisis_hash           TEXT,                          -- sha256(perfil_crudo) que generó este análisis
    estado_crm              JSONB NOT NULL DEFAULT '{"fase": "prospecto", "historial": []}',
    creado_en               TIMESTAMPTZ DEFAULT now(),
    actualizado_en          TIMESTAMPTZ DEFAULT now(),
    
    -- Índices para búsqueda rápida
    CONSTRAINT valid_fase CHECK ((estado_crm->>'fase') IN ('prospecto', 'contactado', 'necesidad_identificada', 'oferta_presentada', 'en_negociacion', 'comprado', 'descartado'))
);
CREATE INDEX idx_clientes_creado ON clientes(creado_en DESC);

-- Tabla de conversaciones (historial completo para auditoría)
CREATE TABLE conversaciones (
    id                  BIGSERIAL PRIMARY KEY,
    cliente_id          TEXT REFERENCES clientes(id) ON DELETE CASCADE,
    remitente           TEXT NOT NULL CHECK (remitente IN ('cliente', 'bot')),
    contenido           TEXT NOT NULL,
    metadata            JSONB,                             -- contexto adicional (fase en ese momento, seguros sugeridos, etc.)
    timestamp           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_conversaciones_cliente ON conversaciones(cliente_id, timestamp DESC);

-- Tabla de auditoría: seguimiento de cambios en análisis y fase
CREATE TABLE auditoria_cambios (
    id                  BIGSERIAL PRIMARY KEY,
    cliente_id          TEXT REFERENCES clientes(id) ON DELETE CASCADE,
    tipo_cambio         TEXT NOT NULL,                   -- 'analisis_recalculado', 'fase_actualizada', 'perfil_modificado'
    datos_anteriores    JSONB,
    datos_nuevos        JSONB,
    timestamp           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_auditoria_cliente ON auditoria_cambios(cliente_id, timestamp DESC);
```

### Fases del CRM (propuesta, a validar con el equipo)

Funnel estándar de ventas de seguros, como punto de partida para ajustar:

`Prospecto` → `Contactado` → `Necesidad identificada` → `Oferta presentada` → `En negociación / resolviendo dudas` → `Comprado`
(rama lateral: `Descartado / perdido`)

## Preguntas abiertas

**Análisis y rehash:**
- Si el análisis cambia durante una conversación, ¿Luis debe automáticamente re-dirigir la oferta, o mantiene la recomendación inicial? (Probablemente: mantiene inicial, pero lo documenta en auditoría para futuros contactos)
- ¿Qué campos en `perfil_crudo` disparan rehash? (Probablemente: cualquiera, o solo los más relevantes para propensión como edad, ingreso, grupo familiar)

**CRM y cambio de fase:**
- ¿Quién y cuándo actualiza `estado_crm.fase`? (Probablemente: Luis cuando sucede un evento conversacional, Samuel escribe en BD)
- Fases: ¿hay sub-estados dentro de "en_negociacion" (e.g., "dudas_coberturas", "comparando_opciones")? Pendiente definir con Sarah.

**Integración técnica:**
- Luis y Samuel necesitan un contrato claro: ¿cómo Luis notifica cambios en `perfil_crudo`? (HTTP PATCH, mensaje de cola, callback?)
- Luis y Jhon necesitan un contrato: ¿cómo Luis consulta RAG? (HTTP endpoint, SDK, query format exacto?)

**Escalabilidad:**
- Para 1.5M clientes: ¿indexación en `perfil_crudo` (JSONB tiene límites)? Samuel decide.
- Cache en memoria para análisis frecuentes (hot clients)? Consideración de performance, Samuel lo define.
