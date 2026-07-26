# La demo — camino feliz y escenarios A/B/C

Este documento define qué se muestra en la demo en vivo: el **camino feliz** (qué perfil, qué
preguntas, qué producto se ejercitan) y los **escenarios A/B/C** (lo mínimo que funciona, un feature
más, y el ideal). Es spec de producto, no guión de pitch. El guión de presentación (con timing de
los 2 minutos) se escribe aparte cuando esto ya esté probado.

---

# PARTE 1 — El camino feliz

Define qué perfil, qué preguntas y qué producto se ejercitan en los ~50 segundos de demo en vivo,
para que el [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md) se construya apuntado a que ese recorrido salga
impecable.

**Por qué este perfil y no otro:** es el segmento más grande de la base ("20 a 35 años, sin grupo
familiar") y coincide con el ejemplo que el propio brief usa para explicar la personalización.
Además resuelve en vivo el problema real que tiene la pregunta 1 de discovery con este segmento: le
devuelve "nadie" y sin un plan quema el turno de mayor peso.

## 1. El perfil sembrado

**Camila Torres, 28 años, Bogotá.** Diseñadora gráfica independiente (freelance). Vive sola, sin
dependientes económicos. Compra ocasionalmente en droguería. No tiene marca `VIVIENDA` ni
`AGENCIAS`. `PIRAMIDE_NUEVA` la ubica en `6.2 Independiente`.

Por qué esta combinación y no otra: es exactamente el ICP de [CEREBRO.md](CEREBRO.md) sección 3.3
(accidentes personales) — independiente cuyo ingreso se detiene si ella se detiene — y a la vez el
perfil "soltero sin hijos" que el brief usa de ejemplo.

**Dependencia con Samuel:** este perfil tiene que existir como fila real en la tabla de clientes
compartida, con un `id`, antes de la demo. No se puede simular con datos falsos en pantalla, el
handoff tiene que ser real según [ARQUITECTURA.md](ARQUITECTURA.md).

## 2. Por qué la pregunta 1 no es un callejón sin salida

Con este perfil, "¿quién depende económicamente de ti hoy?" responde "nadie, vivo sola". Sin ruta
definida, ese turno se quema sin abrir ninguna familia.

**Regla de pivote para el [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md):** si la respuesta a la pregunta 1 es
"nadie" o equivalente, el agente no se detiene ni repite la pregunta de otra forma. Pasa directo a la
pregunta 3 ("si no pudieras trabajar por un mes, ¿de qué vivirías?"), que es la que más pesa para
alguien sin respaldo institucional. Las preguntas 2, 4 y 5 quedan disponibles si la conversación
sigue, pero no son parte del camino feliz.

## 3. Turno a turno (objetivo: 50 segundos)

| Turno | Agente | Camila (respuesta ideal) |
|---|---|---|
| 1 | Mensaje de apertura: qué va a pasar y cuánto tarda | — |
| 2 | "¿Quién depende económicamente de ti hoy?" | "Nadie, vivo sola" |
| 3 | Pivota: "¿Si no pudieras trabajar por un mes, de qué vivirías?" | "Uy, de nada, soy independiente" |
| 4 | Llama a `recomendar()` → familia `familiares`, producto `Seguro de accidentes personales` (`id: familiares-accidentes` en `catalogo-seguros.json`) | — |
| 5 | Muestra recomendación con las dos patas del porqué + coberturas reales + exclusiones (aunque el catálogo hoy las trae vacías para este producto, se declara así en pantalla, no se inventan) | Lee, reacciona |
| 6 | Objeción disparada: "está caro, no sé si me alcanza" | — |
| 7 | Desarme 3A (ver sección 4) | Se convence o pide comparar |
| 8 | Tarjeta de comparación (2-3 opciones de la misma familia) | Compara |
| 9 | Cierre: acepta, confirma, resumen, transición a asesor humano | — |

## 4. La objeción y su desarme

**Se dispara:** "está caro, no sé si me alcanza". Es la más universal y la que mejor conecta con el
perfil independiente (el costo de un mes sin ingreso por una lesión, contra la prima).

**Desarme en 3A** (Acknowledge / Associate / Ask, aplicado con el reencuadre ya escrito en
[CEREBRO.md](CEREBRO.md), Parte 3):
- **Acknowledge:** "Entiendo, y es válido preguntarlo."
- **Associate:** "Es justo la pregunta que hacen las personas que sí llevan las cuentas claras,
  como tú, que trabajas por tu cuenta."
- **Ask:** "¿Con qué lo estás comparando? Porque lo que cuesta al mes suele ser menos que un mes
  sin poder facturar por una lesión. La pregunta no es si cuesta, es qué pasa el día que no puedes
  trabajar."

## 5. El momento de gemelos

El jurado cambia una variable en la tarjeta de Camila: le agrega un dependiente (por ejemplo, "vive
con su mamá, que depende de ella"). La recomendación se recalcula en vivo: entra `vida` o
`exequial` a la conversación además de accidentes, y la razón cambia de "tu ingreso se detiene si tú
te detienes" a "alguien más depende de tu ingreso". Es el diferenciador que [BRIEF.md](BRIEF.md)
Parte 2.F advierte que varios equipos van a mostrar con dos perfiles preparados; acá lo cambia el
jurado, no el equipo.

**Dependencia con Sarah/Samuel:** el control para editar la variable en vivo tiene que ser
descubrible sin instrucciones (diseño de Sarah).

## 6. Checklist de reglas que deben estar impecables para este camino

- [ ] La ruta de pivote de pregunta 1 a pregunta 3 cuando la respuesta es "nadie" (en
  [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md)).
- [ ] `match_catalogo` con familia `familiares` y una consulta de "accidentes, independiente, sin
  respaldo" devuelve `Seguro de accidentes personales` como primer resultado. **Sin verificar
  todavía** — hay que probarlo contra Supabase antes de confiar en el camino.
- [ ] El desarme 3A de la objeción "está caro" queda escrito literal en el prompt, no improvisado.
- [ ] El perfil de Camila existe como fila real en la tabla de clientes de Samuel, con `id`.
- [ ] El control de "agregar dependiente" en vivo existe en la UI de Sarah/Samuel y recalcula.
- [ ] **Pendiente real, sin dueño fijado todavía:** la prueba social de este camino necesita un
  número real del segmento independiente ("de cada 100 afiliados en tu perfil..."). Hoy no existe
  en [PROPENSION.md](PROPENSION.md) — es trabajo de Luis, no inventado. Si no llega a tiempo, la
  recomendación se sostiene solo con la pata conversacional ("por lo que me contaste"), nunca con
  un número inventado.

## 7. Qué no se toca en esta demo

- Las otras 21 filas del catálogo. Existen y responden si alguien pregunta, pero no son el camino
  ensayado.
- Las preguntas 2, 4 y 5 de discovery. Quedan disponibles, no forman parte del guión de 50s.
- El simulador de WhatsApp completo. El camino feliz vive en la web; WhatsApp solo necesita mostrar
  la puerta y el handoff, según [ARQUITECTURA.md](ARQUITECTURA.md).
- Precios inventados. Para este producto se declara en pantalla que el valor exacto lo confirma un
  asesor; nunca se sintetiza una cifra y se presenta como real.

---

# PARTE 2 — Escenarios de la demo (plan A/B/C)

Consejo del mentor de 30X (sesión del 24 de julio): "creen un par de escenarios plan realistas
pero funcionales — lo mínimo que funcione, si sobra tiempo un feature más, y el ideal". Se define
para no improvisarlo el domingo, que según [BRIEF.md](BRIEF.md) Parte 5 está prácticamente muerto.

Cada escenario es aditivo: el 2 incluye todo el 1, el 3 incluye todo el 2.

## Escenario 1 — Lo mínimo que funciona

**Qué se muestra:** el camino feliz de la Parte 1 completo, solo en la web. Camila entra al chat,
responde las dos preguntas, recibe la recomendación con las dos patas del porqué, ve la tarjeta de
comparación, y cierra con resumen.

**De qué depende:**
- [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md) con el camino feliz probado contra `match_catalogo`.
- La web mínima de Samuel: chat + tarjeta de recomendación + tarjeta de comparación + cierre.
- El perfil de Camila sembrado en la tabla de clientes.

**No incluye:** WhatsApp, el momento de gemelos, el control de cobertura en vivo.

**Si esto no sale, no hay demo.** Es el piso. Hora límite para tenerlo navegable: sábado a
mediodía (la prueba del extraño se hace apenas haya algo navegable, no el último día).

## Escenario 2 — Si sobra tiempo, un feature más

Todo el Escenario 1, más:

**El momento de gemelos en vivo.** El jurado agrega un dependiente a Camila y ve la recomendación
recalcularse, con la razón cambiando de "tu ingreso se detiene si tú te detienes" a "alguien más
depende de ti". Es la sección 5 de la Parte 1.

**El control de cobertura con precio ilustrativo en vivo.** Sube o baja el monto asegurado y el
precio se mueve, declarado como ilustrativo en pantalla donde el catálogo no publica cifra.

**De qué depende:** el control de edición de variables en la UI (Sarah/Samuel), y el rango de
precio ilustrativo por edad (a coordinar quién lo deriva).

**Cuál se prioriza si solo alcanza para uno:** el momento de gemelos. Es el diferenciador que el
propio brief anticipa que otros equipos van a mostrar con perfiles preparados, y aquí lo controla
el jurado. El control de cobertura es visualmente vistoso pero no cambia el argumento de
explicabilidad, que es el criterio que el brief descalifica con nombre propio si falla.

## Escenario 3 — El ideal

Todo el Escenario 2, más:

**El simulador de WhatsApp con handoff real.** Colsubsidio "envía" una oferta proactiva a Camila,
ella responde 2-3 preguntas de precalificación en el chat estilo WhatsApp, y decide pasar a la web,
donde el contexto ya está cargado por `id`. Es el journey completo de Sarah.

**De qué depende:** el canal WhatsApp simulado de Samuel, y que el handoff por `id` esté probado de
punta a punta, no solo documentado.

**Si no alcanza:** se cae primero. El Escenario 1 solo, bien pulido, gana más puntos que un
Escenario 3 a medias, según el propio consejo del mentor ("algo pequeño que funcione le gana a una
idea enorme a medias").

## Quién presenta

**Jhon presenta el pitch.** Punto a confirmar con el equipo cuanto antes: los roles le asignan a
Sarah "la narrativa del pitch" como parte de su entrega, lo que puede leerse como que ella lo narra
o solo que ella la diseña. Antes de ensayar el guión hay que cerrarlo con el equipo, para no
descubrir el domingo que hay dos personas preparando el mismo minuto. (Roles vigentes en
[BRIEF.md](BRIEF.md), Parte 4.)

## Resumen de horas límite

| Escenario | Qué agrega | Hora límite para decidir si se cae |
|---|---|---|
| 1 (piso) | Camino feliz completo en web | Sábado, mediodía |
| 2 (+1 feature) | Gemelos en vivo + cobertura ilustrativa | Sábado, tarde/noche |
| 3 (ideal) | WhatsApp + handoff real | Domingo, temprano (con el domingo casi muerto, es la primera baja si el tiempo aprieta) |
