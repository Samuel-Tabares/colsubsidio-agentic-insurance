# Plan de construcción — fases, dueños y entregables

**Actualizado:** 2026-07-23, con los roles nuevos y la arquitectura de dos canales.
**Contexto del reto:** `BRIEF.md`. Si algo acá lo contradice, gana el brief.

Cada fase dice: qué se hace, quién lo hace, dónde queda la salida, de qué depende, y cuándo se
considera terminada. Si no se puede marcar el criterio de terminado, la fase sigue abierta.

**Tiempo real:** el domingo está prácticamente muerto. Quedan jueves, viernes y sábado. Unos 2,5
días. Por eso el orden importa más que la ambición: algo pequeño que funcione le gana a una idea
enorme a medias.

---

## La arquitectura, en un dibujo

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

- **El cerebro es único** y no sabe en qué canal está.
- **El handoff es real:** el link de WhatsApp abre la web y el chatbot trae el perfil por `id`. No
  son datos falsos, es el mismo registro.
- **Camino de la demo: la web.** WhatsApp muestra la puerta, la precalificación y el handoff, y que
  se puede cerrar ahí con un caso corto. No se duplica el flujo completo en los dos canales.

Detalle y "qué queda fuera y por qué" en `BRIEF.md`, Parte 4.

---

## Roles

- **Jhon** — el cerebro y el RAG. Scrape del catálogo, RAG en Supabase, agente, `recomendar()`.
- **Samuel** — full stack: levanta Vocero, las 3 vistas sobre el diseño de Sarah, los canales y el
  backend, incluida la base de clientes que hace posible el handoff.
- **Sarah** — diseña las 3 vistas en Claude Design; no programa. Marca, explicabilidad, pitch.
- **Luis** — análisis de propensión; produce `reglas.json`.

---

## Mapa de dependencias

```
FASE 1 (datos, Luis) ──────────┐
                                ├──► FASE 3 (cerebro, Jhon) ──► FASE 4 (canales+vista, Samuel) ──► FASE 5
FASE 2 (catálogo+RAG, Jhon) ───┘                                        ▲
                                                                        │
        FASE 0 (contratos) ── desbloquea todo ──────────────────────────┘
```

Las fases 1 y 2 corren **en paralelo**. Sarah diseña en paralelo desde el día 1 (no depende de datos).

---

## FASE 0 — Congelar los contratos

**Dueño:** todos, coordina Jhon.
**Depende de:** nada. Es lo primero, antes de escribir código.

Sin esto nadie trabaja en paralelo sin pisarse. Salen de `EMULADOR_ARQUITECTURA.md`.

1. **Cerebro ↔ perfil (Jhon ↔ Samuel).** Cómo el cerebro lee y escribe el perfil por `id`. Un
   endpoint de lectura y un `PATCH` para actualizar.
2. **Canales ↔ cerebro (Samuel ↔ Jhon).** Cómo cada canal (WhatsApp, web) invoca al cerebro y le
   pasa el `id` del usuario. El cerebro responde igual sin importar el canal.
3. **`recomendar(perfil)` (Jhon ↔ Luis).** Qué recibe y qué devuelve, y la forma de `reglas.json`
   que consume. Contrato en `ANALISIS-PROPENSION.md` sección 6.
4. **Handoff (Samuel).** Cómo el link de WhatsApp lleva el `id` a la web para que cargue el perfil.

**Nota sobre los códigos griegos:** el diccionario NO va a llegar (Colsubsidio lo confirmó). No es
un pendiente de Fase 0. Se trabaja con lo legible + caracterización por comportamiento.

**Terminada cuando:** los cuatro contratos están escritos en el repo y los leyeron los involucrados.

---

## FASE 1 — Datos y reglas de propensión

**Dueño:** Luis. (El ETL y buena parte del perfilado ya los corrió Samuel: revisar `scripts/` y
`output/` del repo antes de rehacer nada.)
**Depende de:** Fase 0.3.
**Instrucciones completas:** `ANALISIS-PROPENSION.md`.

### Pasos

1. **Perfilar** la base de 500K: vocabulario y conteos por columna, nulos y vacíos.
2. **Caracterizar los códigos griegos por comportamiento observable** (edad, ingreso, marcas). Es lo
   que los vuelve usables sin inventar qué significan.
3. **Cruces** marca contra perfil, excluyendo por par las filas con campos vacíos.
4. **Escribir las reglas** explícitas, con justificación y respaldo numérico.

### Salida

- **`lib/reglas.json`** — el artefacto que consume el cerebro. Campos obligatorios: `razon_dato`,
  `respaldo`, y `codigo_opaco` cuando se apoya en una columna anonimizada.
- **`docs/LOGICA-RECOMENDACION.md`** — entregable no negociable del brief. Se escribe mientras se
  analiza.

### Terminada cuando

- Para cualquier perfil se puede señalar la regla que produjo la recomendación.
- Ninguna frase traduce una letra griega a una etiqueta.
- Las reglas corren contra un perfil con la mitad de los campos vacíos sin romperse.

---

## FASE 2 — Catálogo de seguros y RAG

**Dueño:** Jhon.
**Depende de:** nada. Puede arrancar ya. Es el **camino crítico**: sin catálogo no hay nada que
recomendar.
**Spec:** `SPEC-SCRAPE-CATALOGO.md`.

### Pasos

1. **Scrape** de la oferta pública de Colsubsidio.
2. **Estructurar** a `catalogo.json`: `id`, `familia`, `aseguradora`, `nombre`, `coberturas`,
   `exclusiones`, `prima` o rango, `condiciones`. `aseguradora` no es opcional.
3. **Indexar** para búsqueda semántica en Supabase (pgvector).

### Terminada cuando

- Cada familia de las reglas de la Fase 1 tiene al menos un producto asociado.
- Toda prima que aparezca sale del catálogo. Si no hay primas, se sintetizan rangos por edad y se
  declaran ilustrativos en pantalla.

---

## FASE 3 — El cerebro

**Dueño:** Jhon.
**Depende de:** Fases 1 y 2.

Un solo cerebro que atienden los dos canales: agente conversacional + `recomendar(perfil)` + RAG.

### La regla de arquitectura que sostiene todo

- **Las reglas explícitas deciden la FAMILIA** y producen la justificación.
- **El RAG recupera el PRODUCTO concreto** dentro de esa familia.
- **El LLM conversa y narra.** No decide familia, producto ni prima.

Si la búsqueda semántica ordena por relevancia y eso define la recomendación, la respuesta al jurado
es "porque el vector quedó cerca", la caja negra que el brief descalifica.

`recomendar(perfil)` es una función que lee `reglas.json` y `catalogo.json` y devuelve familia,
producto, prima, la razón (con sus dos patas), coberturas, exclusiones y alternativas.

### Terminada cuando

- Dos perfiles que difieren en una variable devuelven resultados visiblemente distintos.
- Pedir un producto que no está devuelve "no lo tengo", nunca uno inventado.
- La razón viene con sus dos patas pobladas.

---

## FASE 4 — Canales y vista del usuario

**Dueño:** Samuel implementa sobre el open source; Sarah diseña las vistas.
**Depende de:** Fase 3 para datos reales; el diseño y el scaffold arrancan antes.
**Diseño:** `UX.md` (Sarah).

**Es la fase que decide el reto.** El jurado recorre la web solo, sin que nadie explique nada. Es el
único criterio que no se puede compensar.

### Qué se construye

- **La web:** chat estilo WhatsApp, discovery con las 5 preguntas (una por turno), recomendación con
  razón compuesta, tarjeta de comparación, ajuste de cobertura en vivo, exclusiones a la vista, y
  cierre (aceptación, confirmación, resumen).
- **El simulador de WhatsApp:** oferta proactiva, precalificación de 2-3 preguntas, y el handoff a
  la web con el perfil cargado. Que se pueda cerrar ahí en un caso corto.
- **El handoff real** entre los dos, por `id`.

**Regla de diseño:** lo que va dentro del chat tiene que poder existir en WhatsApp. Lo que solo
funciona en web va fuera del chat y es prescindible.

### Terminada cuando

**Alguien ajeno al equipo abre la URL de la web, la recorre sin explicación y llega al resumen.**
Se prueba apenas haya algo navegable, no el último día.

---

## FASE 5 — Vista administrativa

**Dueño:** Samuel.
**Base:** Vocero CRM.

Es la vista interna que ven "los de ventas". No aparece en los 6 criterios del brief, así que
**nunca le quita tiempo a la Fase 4**, pero cuesta poco porque Vocero ya la trae.

Dos secciones (las define Samuel): la bandeja/CRM de conversaciones y el pipeline por fases con el
seguro adquirido cruzado contra el perfil, más la configuración. Incluye el **toggle para apagar el
agente y que un humano retome**, que es la contraparte del cierre: el agente escala y en la bandeja
se ve al humano recibiendo el caso.

**No se construye:** envíos masivos (Vocero no los trae por diseño, Meta exige plantilla y opt-in).

---

## FASE 6 — Entregables

**Dueño:** todos, coordina Jhon.

1. **README que levanta el proyecto en menos de 2 minutos.** Requisito del brief. Se cronometra.
2. **`docs/LOGICA-RECOMENDACION.md`** (de la Fase 1).
3. **`docs/ARQUITECTURA.md`, `docs/FLUJO.md`, `docs/LIMITACIONES.md`.** Diagramas en Mermaid.
4. **URL desplegada.** Vercel con Supabase como Postgres (a verificar que el SSE de la bandeja
   aguante los límites de función; si no, se degrada a polling).
5. **Pitch de 2 minutos y video.**

---

## Si sobra tiempo, en este orden

1. **PDF de resumen** al cierre, enviado por WhatsApp. Refuerza el cierre; no es una póliza.
2. **Pantalla de "a quién le hablaríamos hoy":** segmentos priorizados, disparador, canal. Bonus de
   timing y canal que el brief premia, sale casi gratis del análisis.
3. **Laboratorio de agente** (idea de Vocero): clientes simulados con un juez que puntúa. Evidencia
   de calidad para el jurado.

---

## Lo que no se construye, pase lo que pase

- Integración con aseguradoras, firma electrónica, pasarela de pago, siniestros, renovaciones.
- WhatsApp real, telefonía, voz.
- Sincronización en tiempo real entre canales (el handoff es estado compartido al cargar).
- Modelo de ML decidiendo en runtime.
- Login y campañas de envío masivo.
