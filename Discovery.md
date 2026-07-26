# Preguntas de discovery — versión UX conversacional (híbrida)

Este documento rediseña las 5 preguntas de discovery del `SYSTEM-PROMPT.md` para que se sientan
más ligeras y cercanas. El enfoque es híbrido: botones solo donde la respuesta es binaria y no
hay matiz que perder (vivienda, viajes); texto libre donde el matiz de la respuesta importa para
la lógica de negocio (dependientes, urgencia médica, ingresos). No cambia la lógica de negocio
(qué familia abre cada pregunta, las reglas de pivote, ni la regla de "el afiliado que ya sabe
qué quiere") — solo cambia cómo se presenta cada pregunta al usuario.

## Principios de diseño

- **Híbrido, no todo con botones.** Los botones solo van en preguntas donde la respuesta es
  binaria y no hay matiz que perder (vivienda, viajes). En las preguntas donde una respuesta
  ambigua importa para la lógica de negocio (dependientes, urgencia médica, ingresos), se deja
  texto libre — un botón ahí puede llevar a que la persona tape información real solo por
  comodidad de tocar en vez de escribir, y esas son justo las preguntas donde las reglas de
  pivote necesitan ese matiz (ver ejemplo "tal vez mi mamá, pero ella también trabaja").
- **Máximo 2 botones cuando se usan.** Tres o más se sienten a formulario.
- **Botones cortos:** máximo 4-5 palabras, sin signos de puntuación innecesarios.
- **El anclaje conversacional (por qué se pregunta) se mantiene igual que en `SYSTEM-PROMPT.md`,**
  y es incluso más natural en las preguntas de texto libre, donde el puente no compite con una
  elección binaria inmediata.
- **Tono Colsubsidio:** cercano, colombiano, nunca corporativo ni frío. Se tutea. Cero tecnicismos.

## Orden recomendado por canal

**Importante — cambio respecto al orden actual del prompt:** hoy, en WhatsApp, el agente abre
con la pregunta de dependientes económicos (la más pesada emocionalmente) como primer mensaje
tras un contacto en frío. Se siente invasivo. Se recomienda este nuevo orden para WhatsApp:

1. Vivienda (antes era la 4) — la más liviana, casi un dato, no una confesión
2. Viajes (antes era la 5) — igual de liviana
3. Dependientes económicos (antes era la 1) — ya con algo de ritmo conversacional
4. Urgencia médica (antes era la 2)
5. Continuidad de ingresos (antes era la 3)

En Web, donde la persona ya entró con su cuenta o llenó el formulario de acceso (más contexto y
más intención), el orden original del prompt puede mantenerse tal cual.

---

## Las 5 preguntas rediseñadas

### 1. Vivienda (abre: hogar)

**Puente:** "Para conocerte un poco mejor..."
**Pregunta:** "¿Vives en casa propia o arrendada?"
**Botones:** `Es propia` · `Es arrendada`
**Si responde texto libre:** el agente interpreta normal, sin pedir que use los botones.

### 2. Viajes (abre: asistencia en viajes)

**Puente:** "Otra cosa rápida..."
**Pregunta:** "¿Sales de tu ciudad seguido?"
**Botones:** `Sí, bastante` · `Casi nunca`

### 3. Dependientes económicos (abre: vida, exequial — la de mayor peso)

**Puente:** "Ahora algo un poco más personal, para entender bien tu situación..."
**Pregunta:** "¿Hoy hay alguien que dependa económicamente de ti?"
**Formato:** texto libre, sin botones.
**Por qué sin botones:** es la pregunta donde más importa el matiz. La regla de pivote existe
justo para respuestas ambiguas como "tal vez mi mamá, pero ella también trabaja" — un botón
sí/no invitaría a simplificar una respuesta que en la vida real casi nunca es tan limpia, y el
agente perdería la información que necesita para decidir bien el pivote.

### 4. Urgencia médica (abre: salud, asistencias)

**Puente:** "Pensemos en un imprevisto..."
**Pregunta:** "Si mañana te toca una urgencia médica, ¿con qué cuentas hoy?"
**Formato:** texto libre, sin botones.
**Por qué sin botones:** las respuestas reales varían mucho ("solo EPS", "EPS y un seguro que
no uso", "nada, ni EPS tengo") y esa variedad es justo lo que el agente necesita para conectar
bien con la siguiente parte de la conversación, no solo un sí/no de si tiene algo extra.

### 5. Continuidad de ingresos (abre: accidentes, desempleo — decisiva con independientes)

**Puente:** "Última, y es la que más nos ayuda a orientarte..."
**Pregunta:** "Si un mes no pudieras trabajar, ¿de qué vivirías?"
**Formato:** texto libre, sin botones.
**Por qué sin botones:** el prompt marca esta pregunta como "decisiva con independientes" — la
respuesta real (ahorros, otro ingreso, familia, nada) cambia bastante el tono de lo que sigue,
y reducirla a "tengo ahorros / sería difícil" pierde esa decisión fina.

---

## Lo que NO cambia (se mantiene del `SYSTEM-PROMPT.md` actual)

- La regla de pivote: si la respuesta a la pregunta de dependientes es "nadie" o equivalente,
  se salta directo a la pregunta de continuidad de ingresos.
- La regla del afiliado que ya sabe qué quiere: si la persona ya declaró una necesidad concreta
  desde su primer mensaje, no se le fuerza por las 5 preguntas — se le hace una sola pregunta
  anclada a lo que mencionó.
- En WhatsApp solo se corren 2-3 preguntas (precalificación), no las 5 completas.
- Una sola pregunta por turno, nunca dos.

---
*Documento de apoyo al `SYSTEM-PROMPT.md`, preparado por Sarah (UX) para discusión con el equipo
antes de integrarlo al prompt de producción.*
