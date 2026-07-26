# Arquitectura, plan de construcción y gobernanza

Este documento cubre el frente de Samuel (backend/datos) y el plan de construcción del equipo:
1. **La arquitectura** — un cerebro, dos canales, un perfil compartido.
2. **El modelo de datos** — esquema SQL, los cuatro objetos, las fases del CRM.
3. **El plan de construcción** — fases, dueños y entregables.
4. **Gobernanza de datos e IA** — la rúbrica del jurado, respondida.

Contexto del reto: [BRIEF.md](BRIEF.md). Si algo acá lo contradice, gana el brief.

---

# PARTE 1 — La arquitectura

Un cerebro, dos canales, un perfil compartido.

```
        WhatsApp (simulado)          Web
        oferta + precalifica         simulación, comparación,
        + confirmación               ajuste, decisión, cierre
              │                            │
              └──────────┬─────────────────┘
                         ▼
              CEREBRO (agente + RAG + recomendar)   ← Jhon
                         │
                         ▼
              PERFIL COMPARTIDO (tabla clientes)    ← Samuel
              un id por usuario, los dos canales
              leen y escriben aquí
```

- **El cerebro es único** y no sabe en qué canal está. Detalle en [CEREBRO.md](CEREBRO.md).
- **El handoff es real:** el link de WhatsApp abre la web y el chatbot trae el perfil por `id`. No
  son datos falsos, es el mismo registro.
- **Camino de la demo: la web.** WhatsApp muestra la puerta, la precalificación y el handoff, y que
  se puede cerrar ahí con un caso corto. No se duplica el flujo completo en los dos canales.

Detalle y "qué queda fuera y por qué" en [BRIEF.md](BRIEF.md), Parte 4.

> **Estado de implementación (2026-07-25):** la superficie y el backend viven en `app/`, un fork
> vendorizado de Vocero CRM (Next.js 15 + Drizzle + Postgres + Better Auth + SSE). Se construyó
> insertando tres seams (cerebro por HTTP con `CEREBRO_MODE`, canal generalizado a `web`, funnel de
> seguros) sin reescribir Vocero. Web-chat en `/chat` + admin (`/inbox`, `/pipeline`) corren de
> punta a punta con el cerebro stub. Detalle vivo en [CLAUDE.md](CLAUDE.md), sección "App", y en
> `app/CLAUDE.md`.

## Roles

- **Jhon** — el cerebro y el RAG. Scrape del catálogo, RAG en Supabase, agente, `recomendar()`.
- **Samuel** — full stack: levanta Vocero, las 3 vistas sobre el diseño de Sarah, los canales y el
  backend, incluida la base de clientes que hace posible el handoff.
- **Sarah** — diseña las 3 vistas en Claude Design; no programa. Marca, explicabilidad, pitch.
- **Luis** — análisis de propensión; produce `reglas.json` ([PROPENSION.md](PROPENSION.md)).

## Flujo de datos de extremo a extremo

```
Cliente inicia conversación
    ↓
El cerebro obtiene el id del cliente (serie o celular)
    ↓
Backend: consulta DB → obtiene JSON crudo del cliente (perfil_crudo)
    ↓
Cerebro: calcula hash(perfil) y lo compara con analisis_hash guardado
    ├─ Si hash coincide: reutiliza análisis existente
    └─ Si no coincide: recalcula
         ↓
         recomendar(perfil): reglas.json decide la FAMILIA → match_catalogo elige el PRODUCTO
         ↓
         guarda el análisis (propensión, recomendación, ranking) en BD
    ↓
El agente usa análisis + perfil para dirigir la conversación (narra, no decide)
    ↓
En cada mensaje, si el perfil cambia, rehashea y recalcula
    ↓
Cliente acepta → backend escribe en estado_crm
```

> **Nota sobre el hash/rehash** (observación de Jhon, 2026-07-23): el mecanismo de hash es un caché
> para no recalcular. Con un puñado de conversaciones en un demo cuesta depuración y no compra nada
> que el jurado vea. Sugerencia: recalcular siempre y dejar el hash documentado como ruta de
> escalado. Si ya está diseñado y funciona, no vale la pena tocarlo.

> **Corrección de arquitectura (Jhon, 2026-07-23), ya incorporada arriba:** una versión anterior de
> este flujo ponía al RAG a devolver "resultados ordenados por relevancia" y de ahí salía el
> análisis de propensión. Eso pone a la búsqueda semántica a decidir qué seguro se recomienda, y la
> respuesta honesta al jurado sería "porque el vector quedó cerca" — la caja negra que el brief
> descalifica. Lo vigente: **las reglas explícitas deciden la FAMILIA** (con justificación), **el
> RAG recupera el PRODUCTO** dentro de ella, **el LLM narra**. Enfoque detallado en
> [PROPENSION.md](PROPENSION.md) y [CEREBRO.md](CEREBRO.md); razonamiento en [BRIEF.md](BRIEF.md)
> Parte 4. El resto de este modelo de datos (esquema SQL, los 4 objetos, las tablas de
> conversaciones y auditoría) sigue vigente y correcto.

---

# PARTE 2 — El modelo de datos

## Motor: Postgres/Supabase, no un KV engine aparte

La idea original era una base llave-valor (`id → JSON crudo del cliente`). Es correcto
conceptualmente, pero no hace falta un motor KV dedicado (Redis, DynamoDB): Postgres con una columna
`JSONB` indexada por `id` da la misma semántica de lookup y ya es la pieza de stack confirmada. A
esta escala (lookup por *primary key*) el rendimiento no es un problema, y evitamos sumar un servicio
más a provisionar/mantener. Bono: permite SQL directo para las agregaciones que el dashboard del
gerente necesita (conteo por fase, filtrar por seguro comprado, etc.), algo que un KV puro no da
gratis.

## Cuatro objetos de datos separados (no uno solo)

Punto crucial: **el análisis de propensión y el estado del CRM no pueden vivir en el mismo blob que
se hashea.** Si el estado cambia en cada mensaje, el caché nunca reutiliza análisis — invalida el
mecanismo. La separación permite reutilizar trabajo costoso (análisis) mientras sigue avanzando el
flujo de venta.

1. **`perfil_crudo`** (JSONB) — variables del CSV para ese `id` (edad, categoria, grupo_familiar,
   ciudad, marcas de consumo, etc.). Se actualiza si el usuario reporta cambios durante la
   conversación.

2. **`analisis`** (JSONB) + **`analisis_hash`** — resultado del análisis de propensión (qué seguros
   recomendar, puntuación, justificación, ranking del RAG). **Lógica de rehash:** en cada
   interacción se calcula `hash_actual = sha256(perfil_crudo)` y se compara contra `analisis_hash`;
   si coincide, se reutiliza `analisis`; si no, se recalcula (consulta RAG) y se sobreescriben ambos.

3. **`estado_crm`** (JSONB) — fase actual, historial de fases, `seguro_comprado` (si aplica),
   timestamps. Cambia con cada interacción, vive separado para no romper el caché del punto 2.

4. **`conversaciones`** (tabla de mensajes: `id_cliente`, `remitente` [cliente/bot], `contenido`,
   `timestamp`, `metadata`). Alimenta el dashboard del gerente con historial completo, trazabilidad
   y auditoría.

## Esquema SQL (Postgres/Supabase)

```sql
-- Tabla de clientes con análisis de propensión cacheable
CREATE TABLE clientes (
    id                      TEXT PRIMARY KEY,              -- serie (emulador) o celular (Kapso)
    perfil_crudo            JSONB NOT NULL,               -- snapshot de variables del CSV
    analisis                JSONB,                         -- resultado de análisis de propensión
    analisis_hash           TEXT,                          -- sha256(perfil_crudo) que generó el análisis
    estado_crm              JSONB NOT NULL DEFAULT '{"fase": "prospecto", "historial": []}',
    creado_en               TIMESTAMPTZ DEFAULT now(),
    actualizado_en          TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_fase CHECK ((estado_crm->>'fase') IN ('prospecto', 'contactado', 'necesidad_identificada', 'oferta_presentada', 'en_negociacion', 'comprado', 'descartado'))
);
CREATE INDEX idx_clientes_creado ON clientes(creado_en DESC);

-- Tabla de conversaciones (historial completo para auditoría)
CREATE TABLE conversaciones (
    id                  BIGSERIAL PRIMARY KEY,
    cliente_id          TEXT REFERENCES clientes(id) ON DELETE CASCADE,
    remitente           TEXT NOT NULL CHECK (remitente IN ('cliente', 'bot')),
    contenido           TEXT NOT NULL,
    metadata            JSONB,                             -- fase en ese momento, seguros sugeridos, etc.
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

> La trazabilidad de las tablas `conversaciones` y `auditoria_cambios` resuelve el ángulo normativo
> del reto (un mentor lo señaló como importante) y alimenta las respuestas de gobernanza de la
> Parte 4. Nota de portabilidad: para la demo real con Kapso/WhatsApp el único cambio es el `id` (de
> `serie` del CSV a `celular`); el backend trata el id como string opaco y no distingue entre los
> dos.

## Fases del CRM

Funnel estándar de ventas de seguros, punto de partida para ajustar:

`Prospecto` → `Contactado` → `Necesidad identificada` → `Oferta presentada` →
`En negociación / resolviendo dudas` → `Comprado` (rama lateral: `Descartado / perdido`)

> El funnel implementado en `app/` (Vocero) usa las fases sembradas por org:
> Prospecto → Análisis → Cotización/negociación → Cierre ganado → En suscripción →
> Póliza emitida / Cierre perdido (ver `app/src/lib/funnel.ts` y [CHANGELOG.md](CHANGELOG.md)).

## Preguntas abiertas

- **Rehash:** ¿si el análisis cambia durante una conversación, se re-dirige la oferta o se mantiene
  la inicial? (Probablemente: mantiene inicial, lo documenta en auditoría para futuros contactos.)
  ¿Qué campos disparan rehash? (Probablemente los más relevantes para propensión: edad, ingreso,
  grupo familiar.)
- **CRM:** ¿quién y cuándo actualiza `estado_crm.fase`? ¿Hay sub-estados en "en_negociacion"?
  Pendiente definir con Sarah.
- **Integración:** contratos claros cerebro↔perfil (¿PATCH, cola, callback?) y canal↔cerebro. Ver
  Fase 0 abajo.
- **Escalabilidad:** indexación de `perfil_crudo` y caché en memoria para hot clients — Samuel lo
  define si hace falta.

---

# PARTE 3 — Plan de construcción (fases, dueños, entregables)

Cada fase dice: qué se hace, quién lo hace, dónde queda la salida, de qué depende, y cuándo se
considera terminada. Si no se puede marcar el criterio de terminado, la fase sigue abierta.

**Tiempo real:** el domingo está prácticamente muerto. Quedan jueves, viernes y sábado. Unos 2,5
días. Por eso el orden importa más que la ambición: algo pequeño que funcione le gana a una idea
enorme a medias.

## Mapa de dependencias

```
FASE 1 (datos, Luis) ──────────┐
                                ├──► FASE 3 (cerebro, Jhon) ──► FASE 4 (canales+vista, Samuel) ──► FASE 5
FASE 2 (catálogo+RAG, Jhon) ───┘                                        ▲
                                                                        │
        FASE 0 (contratos) ── desbloquea todo ──────────────────────────┘
```

Las fases 1 y 2 corren **en paralelo**. Sarah diseña en paralelo desde el día 1 (no depende de datos).

## FASE 0 — Congelar los contratos

**Dueño:** todos, coordina Jhon. **Depende de:** nada. Es lo primero, antes de escribir código.

Sin esto nadie trabaja en paralelo sin pisarse:

1. **Cerebro ↔ perfil (Jhon ↔ Samuel).** Cómo el cerebro lee y escribe el perfil por `id`. Un
   endpoint de lectura y un `PATCH` para actualizar.
2. **Canales ↔ cerebro (Samuel ↔ Jhon).** Cómo cada canal (WhatsApp, web) invoca al cerebro y le
   pasa el `id`. El cerebro responde igual sin importar el canal.
3. **`recomendar(perfil)` (Jhon ↔ Luis).** Qué recibe y qué devuelve, y la forma de `reglas.json`.
   Contrato en [PROPENSION.md](PROPENSION.md) sección 6.
4. **Handoff (Samuel).** Cómo el link de WhatsApp lleva el `id` a la web para que cargue el perfil.

**Nota sobre los códigos griegos:** el diccionario NO va a llegar (Colsubsidio lo confirmó). No es
un pendiente de Fase 0. Se trabaja con lo legible + caracterización por comportamiento.

**Terminada cuando:** los cuatro contratos están escritos en el repo y los leyeron los involucrados.

## FASE 1 — Datos y reglas de propensión

**Dueño:** Luis. (El ETL y buena parte del perfilado ya los corrió Samuel: revisar `scripts/` y
`output/` antes de rehacer nada.) **Depende de:** Fase 0.3.
**Instrucciones completas:** [PROPENSION.md](PROPENSION.md).

**Pasos:** perfilar la base de 500K → caracterizar los códigos griegos por comportamiento → cruces
marca contra perfil (excluyendo por par los vacíos) → escribir las reglas con justificación y
respaldo numérico.

**Salida:** `lib/reglas.json` (campos obligatorios: `razon_dato`, `respaldo`, y `codigo_opaco`
cuando se apoya en una columna anonimizada) + `docs/LOGICA-RECOMENDACION.md` (entregable no
negociable del brief, se escribe mientras se analiza).

**Terminada cuando:** para cualquier perfil se puede señalar la regla que produjo la recomendación;
ninguna frase traduce una letra griega a una etiqueta; las reglas corren contra un perfil con la
mitad de los campos vacíos sin romperse.

## FASE 2 — Catálogo de seguros y RAG

**Dueño:** Jhon. **Depende de:** nada. Es el **camino crítico**: sin catálogo no hay nada que
recomendar. **Detalle:** [CEREBRO.md](CEREBRO.md), Parte 2.

**Pasos:** scrape de la oferta pública → estructurar a `catalogo-seguros.json` (`id`, `familia`,
`aseguradora`, `nombre`, `coberturas`, `exclusiones`, `planes[]` con precio o null) → indexar para
búsqueda semántica en Supabase (pgvector).

**Terminada cuando:** cada familia de las reglas de la Fase 1 tiene al menos un producto asociado;
toda prima que aparezca sale del catálogo (donde no hay, la confirma un asesor, nunca se sintetiza y
se presenta como real). *(Estado 2026-07-25: hecho — 22 productos, re-scrape con planes y precios.)*

## FASE 3 — El cerebro

**Dueño:** Jhon. **Depende de:** Fases 1 y 2. **Detalle:** [CEREBRO.md](CEREBRO.md).

Un solo cerebro que atienden los dos canales: agente conversacional + `recomendar(perfil)` + RAG.

**La regla de arquitectura que sostiene todo:** las reglas explícitas deciden la FAMILIA y producen
la justificación; el RAG recupera el PRODUCTO dentro de ella; el LLM conversa y narra, no decide
familia, producto ni prima. Si la búsqueda semántica ordena por relevancia y eso define la
recomendación, la respuesta al jurado es "porque el vector quedó cerca", la caja negra que el brief
descalifica.

**Terminada cuando:** dos perfiles que difieren en una variable devuelven resultados visiblemente
distintos; pedir un producto que no está devuelve "no lo tengo", nunca uno inventado; la razón viene
con sus dos patas pobladas.

## FASE 4 — Canales y vista del usuario

**Dueño:** Samuel implementa sobre el open source; Sarah diseña las vistas (Claude Design).
**Depende de:** Fase 3 para datos reales; el diseño y el scaffold arrancan antes.

**Es la fase que decide el reto.** El jurado recorre la web solo, sin que nadie explique nada. Es el
único criterio que no se puede compensar.

**Qué se construye:** la web (chat estilo WhatsApp, discovery con las 5 preguntas, recomendación con
razón compuesta, comparador, ajuste de cobertura en vivo, exclusiones a la vista, y cierre); el
simulador de WhatsApp (oferta proactiva, precalificación, handoff a la web); y el handoff real por
`id`.

**Regla de diseño:** lo que va dentro del chat tiene que poder existir en WhatsApp. Lo que solo
funciona en web va fuera del chat y es prescindible.

**Terminada cuando:** alguien ajeno al equipo abre la URL de la web, la recorre sin explicación y
llega al resumen. Se prueba apenas haya algo navegable, no el último día.

## FASE 5 — Vista administrativa

**Dueño:** Samuel. **Base:** Vocero CRM.

Es la vista interna que ven "los de ventas". No aparece en los 6 criterios del brief, así que
**nunca le quita tiempo a la Fase 4**, pero cuesta poco porque Vocero ya la trae.

Dos secciones: la bandeja/CRM de conversaciones y el pipeline por fases con el seguro adquirido
cruzado contra el perfil, más la configuración. Incluye el **toggle para apagar el agente y que un
humano retome**, que es la contraparte del cierre: el agente escala y en la bandeja se ve al humano
recibiendo el caso. **No se construye:** envíos masivos (Meta exige plantilla y opt-in).

## FASE 6 — Entregables

**Dueño:** todos, coordina Jhon.

1. **README que levanta el proyecto en menos de 2 minutos** (requisito del brief; se cronometra).
2. **`docs/LOGICA-RECOMENDACION.md`** (de la Fase 1).
3. **`docs/ARQUITECTURA.md`, `docs/FLUJO.md`, `docs/LIMITACIONES.md`** (diagramas en Mermaid).
4. **URL desplegada** (Vercel con Supabase como Postgres; verificar que el SSE de la bandeja aguante
   los límites de función, si no se degrada a polling).
5. **Pitch de 2 minutos y video.**

## Si sobra tiempo, en este orden

1. **PDF de resumen** al cierre, enviado por WhatsApp. Refuerza el cierre; no es una póliza.
2. **Pantalla de "a quién le hablaríamos hoy":** segmentos priorizados, disparador, canal. Bonus de
   timing y canal que el brief premia, sale casi gratis del análisis.
3. **Laboratorio de agente** (idea de Vocero): clientes simulados con un juez que puntúa. Evidencia
   de calidad para el jurado.

## Lo que no se construye, pase lo que pase

- Integración con aseguradoras, firma electrónica, pasarela de pago, siniestros, renovaciones.
- WhatsApp real, telefonía, voz.
- Sincronización en tiempo real entre canales (el handoff es estado compartido al cargar).
- Modelo de ML decidiendo en runtime.
- Login y campañas de envío masivo.

---

# PARTE 4 — Gobernanza de datos e IA (MVP Reto 2)

**Por qué existe:** los "4 pilares de gobernanza de datos" y las "5 preguntas éticas" de 30X son la
rúbrica con la que el jurado califica. Esta parte responde cada una para nuestro MVP, y deja cableado
lo que falta construir. No es adorno: es puntaje.

## Principio rector: System 2 by design

30X citó a Kahneman. System 1 es la IA rápida e intuitiva que aprueba su propia respuesta sin
cuestionarla (el peligro: alucina coberturas y precios). System 2 es la IA lenta y deliberada que
verifica fuentes, evalúa la lógica y se defiende de sus propios sesgos.

Nuestro agente es System 2 por construcción, no por un parche encima:
- **Verifica fuentes:** las coberturas, exclusiones y precios se leen del catálogo (RAG). El LLM
  nunca los inventa.
- **Evalúa la lógica:** la familia de seguro la deciden reglas explícitas (`reglas.json`), no la
  intuición del modelo.
- **Se defiende de alucinar:** si le piden un producto que no existe, responde "no lo tengo", no uno
  inventado.

Ese diseño es, además, la respuesta al gate de explicabilidad del brief.

## Los 4 pilares de gobernanza de datos (rúbrica 30X)

**1. Origen y consentimiento.** ¿De dónde viene el dato y hay permiso para usarlo?
- La base viene de Colsubsidio, anonimizada en la fuente.
- Los datos simulados que agregamos están **autorizados por escrito por 30X + Colsubsidio**
  (2026-07-24) para la demo. El mapeo real solo se pide si pasamos a producción.
- El catálogo sale de la web pública de Colsubsidio.

**2. Calidad y trazabilidad.** ¿Puedes rastrear una respuesta hasta el dato que la originó?
- Cada recomendación se rastrea a una regla concreta de `reglas.json` (con su `razon_dato` y su
  `respaldo` numérico) más un producto del catálogo.
- La razón que ve el usuario tiene dos patas: "por tu perfil" (el dato) y "por lo que me contaste"
  (la conversación). Nada es "porque el modelo lo dijo".

**3. Privacidad y minimización.** ¿Usas solo el dato estrictamente necesario?
- La base está anonimizada (códigos, sin nombres ni PII).
- Solo se guarda lo necesario para recomendar. Los datos de salud son dato sensible bajo la Ley 1581
  de 2012, y se tratan como tal.
- Los valores simulados se marcan como simulados; nunca se afirma el mapeo real como hecho.

**4. Seguridad y acceso.** ¿Quién puede ver, editar o exportar los datos sensibles?
- RLS (Row Level Security) en Supabase: cada usuario ve solo su fila.
- Llaves de mínimo privilegio: el frontend usa la llave pública (limitada por RLS); la service key
  (que salta RLS) vive solo en el backend, nunca en el navegador.
- Cifrado en tránsito (TLS) y en reposo, por defecto en Supabase.
- Dos tablas separadas por sensibilidad: el catálogo es público de lectura; la tabla de clientes es
  de acceso restringido.

## Marcos de IA que citamos en el pitch

- **OCDE:** principios de IA (transparencia, robustez, rendición de cuentas). Nuestro "por qué"
  trazable es rendición de cuentas.
- **UNESCO (Ética de la IA, 2021):** dignidad, proporcionalidad y supervisión humana. El toggle
  humano es supervisión humana.
- **NIST AI RMF:** mapear, medir, gestionar y gobernar el riesgo. El registro de riesgos de abajo es
  ese ejercicio.
- **Colombia, MinTIC / CONPES IA:** lineamientos nacionales de ética e IA para el sector productivo.

## Las 5 preguntas éticas (validación 30X), respondidas

**1. Trazabilidad. ¿Puedes explicar qué generó el LLM y por qué?** Sí. Regla citable + producto del
catálogo + razón de dos patas. El LLM narra, no decide.

**2. Verificación técnica. ¿Revisaste el código por vulnerabilidades o dependencias inseguras?** Sí.
RLS activo, secretos fuera del frontend, dependencias mínimas, y un protocolo de QA antes de
desplegar.

**3. Consentimiento y licencias. ¿Los datos y el código respetan derechos y privacidad?** Sí. Datos
simulados autorizados, catálogo público de Colsubsidio, base sin PII.

**4. Transparencia. ¿El usuario final sabe que interactúa con IA?** Sí. El asistente se presenta
como asistente. No se hace pasar por humano.

**5. Reversibilidad. ¿Puede un humano deshacer o corregir una decisión automatizada?** Sí. El toggle
de agente a humano (Fase 5) permite que una persona retome. Y el MVP no emite pólizas ni cobra, así
que ninguna decisión es irreversible: el agente escala, no cierra en firme.

## Identidad y sesión (sin login)

El brief excluye login. La sesión se mantiene por un `id` (UUID) por usuario:
- El `id` se guarda en el navegador (localStorage) y viaja en la URL del handoff WhatsApp a web.
- Al volver, se lee el `id`, se recupera el perfil desde Supabase, y el contexto se restaura.
- Acceso seguro sin `auth.uid()`: la tabla de clientes no es legible con la llave pública; los
  accesos pasan por un backend con la service key que filtra por `id`, y el `id` es un UUID no
  adivinable.
- Se pierde el contexto solo si se borra el localStorage o se entra desde otro dispositivo sin el
  link. Ahí se re-entra. Documentado como limitación conocida, no como bug.

## Qué puede fallar (registro de riesgos)

- **Service key filtrada al frontend:** compromiso total. Mitigación: nunca sale del backend; el
  frontend solo usa la llave pública con RLS.
- **`id` robado o adivinado:** ver la sesión de otro. Mitigación: UUID no adivinable + acceso mediado
  por backend, no lectura directa desde el cliente.
- **RLS mal configurado:** fuga de datos. Mitigación: deny por defecto y probar cada policy.
- **El LLM alucina coberturas o precios:** System 2 lo previene (RAG + "no lo tengo"), se vigila en
  pruebas. (Ver el registro del dojo en [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md).)
- **Límites del plan free de Supabase:** conexiones y streaming limitados. Mitigación: si el SSE de
  la bandeja no aguanta, se degrada a polling.
- **Dimensión de embedding equivocada:** la ingesta falla temprano con un assert de 1536, no en
  silencio.
- **`id` perdido (localStorage borrado u otro dispositivo):** se pierde el contexto. Se re-entra.

## Qué queda por construir (gobernanza)

- La tabla de clientes con RLS y el backend que filtra por `id` (Samuel).
- El manejo del `id` en localStorage + URL para el handoff (Samuel).
- La declaración de "hablas con un asistente" visible en la interfaz (Sarah / Samuel).
- El toggle humano de la Fase 5 (Samuel).
