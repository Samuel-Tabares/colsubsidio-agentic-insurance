# Escenarios de la demo — plan A/B/C

Consejo del mentor de 30X (sesión del 24 de julio): "creen un par de escenarios plan realistas
pero funcionales — lo mínimo que funcione, si sobra tiempo un feature más, y el ideal". Se define
hoy para no improvisarlo el domingo, que según `BRIEF.md` línea 594 está prácticamente muerto.

Cada escenario es aditivo: el 2 incluye todo el 1, el 3 incluye todo el 2.

---

## Escenario 1 — Lo mínimo que funciona

**Qué se muestra:** el camino feliz de `DEMO-HAPPY-PATH.md` completo, solo en la web. Camila entra al chat, responde las dos preguntas, recibe la recomendación con las dos patas del porqué, ve la tarjeta de comparación, y cierra con resumen.

**De qué depende:**
- `SYSTEM-PROMPT.md` con el camino feliz probado contra `match_catalogo`.
- La web mínima de Samuel: chat + tarjeta de recomendación + tarjeta de comparación + cierre.
- El perfil de Camila sembrado en la tabla de clientes.

**No incluye:** WhatsApp, el momento de gemelos, el control de cobertura en vivo.

**Si esto no sale, no hay demo.** Es el piso. Hora límite para tenerlo navegable: sábado a
mediodía, según la prueba del extraño de `UX.md` sección 12 ("se prueba apenas haya algo
navegable, no el último día").

---

## Escenario 2 — Si sobra tiempo, un feature más

Todo el Escenario 1, más:

**El momento de gemelos en vivo.** El jurado agrega un dependiente a Camila y ve la recomendación recalcularse, con la razón cambiando de "tu ingreso se detiene si tú te detienes" a "alguien más depende de ti". Es la sección 5 de `DEMO-HAPPY-PATH.md`.

**El control de cobertura con precio ilustrativo en vivo.** Sube o baja el monto asegurado y el
precio se mueve, declarado como ilustrativo en pantalla porque `precio_desde` está vacío en las 22 filas del catálogo.

**De qué depende:** el control de edición de variables en la UI (Sarah/Samuel), y el rango de
precio sintético por edad (a coordinar quién lo deriva).

**Cuál se prioriza si solo alcanza para uno:** el momento de gemelos. Es el diferenciador que el
propio brief anticipa que otros equipos van a mostrar con perfiles preparados, y aquí lo controla
el jurado. El control de cobertura es visualmente vistoso pero no cambia el argumento de
explicabilidad, que es el criterio que el brief descalifica con nombre propio si falla.

---

## Escenario 3 — El ideal

Todo el Escenario 2, más:

**El simulador de WhatsApp con handoff real.** Colsubsidio "envía" una oferta proactiva a Camila,
ella responde 2-3 preguntas de precalificación en el chat estilo WhatsApp, y decide pasar a la web,
donde el contexto ya está cargado por `id`. Es el `Journey UX` completo de Sarah.

**De qué depende:** el canal WhatsApp simulado de Samuel, y que el handoff por `id` esté probado de
punta a punta, no solo documentado.

**Si no alcanza:** se cae primero. El Escenario 1 solo, bien pulido, gana más puntos que un
Escenario 3 a medias, según el propio consejo del mentor ("algo pequeño que funcione le gana a una
idea enorme a medias").

---

## Quién presenta

**Jhon presenta el pitch.** Punto a confirmar con el equipo hoy mismo, no mañana: `EQUIPO.md` le
asigna a Sarah "la narrativa del pitch" como parte de su entrega, lo que puede leerse como que ella
lo narra o solo que ella la diseña. Antes de ensayar el guión hay que cerrarlo con el equipo, para
no descubrir el domingo que hay dos personas preparando el mismo minuto.

---

## Resumen de horas límite

| Escenario | Qué agrega | Hora límite para decidir si se cae |
|---|---|---|
| 1 (piso) | Camino feliz completo en web | Sábado, mediodía |
| 2 (+1 feature) | Gemelos en vivo + cobertura ilustrativa | Sábado, tarde/noche |
| 3 (ideal) | WhatsApp + handoff real | Domingo, temprano (con el domingo casi muerto, es la primera baja si el tiempo aprieta) |
