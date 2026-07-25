# El camino feliz de la demo

Esto es spec de producto, no guión de pitch. Define qué perfil, qué preguntas y qué producto se
ejercitan en los 50 segundos de demo en vivo, para que el `SYSTEM-PROMPT.md` se construya apuntado
a que ese recorrido salga impecable. El guión de presentación (con timing de los 2 minutos) se
escribe mañana en `PITCH.md`, cuando esto ya esté probado.

**Por qué este perfil y no otro:** es el segmento más grande de la base ("20 a 35 años, sin grupo
familiar", `UX.md` sección 2) y coincide con el ejemplo que el propio brief usa para explicar la
personalización. Además resuelve en vivo el problema real que tiene la pregunta 1 de discovery con
este segmento: le devuelve "nadie" y sin un plan quema el turno de mayor peso.

---

## 1. El perfil sembrado

**Camila Torres, 28 años, Bogotá.** Diseñadora gráfica independiente (freelance). Vive sola, sin
dependientes económicos. Compra ocasionalmente en droguería. No tiene marca `VIVIENDA` ni
`AGENCIAS`. `PIRAMIDE_NUEVA` la ubica en `6.2 Independiente`.

Por qué esta combinación y no otra: es exactamente el ICP de `CAPA-CUALITATIVA.md` sección 3.3
(accidentes personales) — independiente cuyo ingreso se detiene si ella se detiene — y a la vez el
perfil "soltero sin hijos" que el brief usa de ejemplo.

**Dependencia con Samuel:** este perfil tiene que existir como fila real en la tabla de clientes
compartida, con un `id`, antes de la demo. No se puede simular con datos falsos en pantalla, el
handoff tiene que ser real según `PLAN-CONSTRUCCION.md`.

---

## 2. Por qué la pregunta 1 no es un callejón sin salida

Con este perfil, "¿quién depende económicamente de ti hoy?" responde "nadie, vivo sola". Sin ruta
definida, ese turno se quema sin abrir ninguna familia.

**Regla nueva para el `SYSTEM-PROMPT.md`:** si la respuesta a la pregunta 1 es "nadie" o
equivalente, el agente no se detiene ni repite la pregunta de otra forma. Pasa directo a la
pregunta 3 ("si no pudieras trabajar por un mes, ¿de qué vivirías?"), que es la que más pesa para
alguien sin respaldo institucional. Las preguntas 2, 4 y 5 quedan disponibles si la conversación
sigue, pero no son parte del camino feliz.

---

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

---

## 4. La objeción y su desarme

**Se dispara:** "está caro, no sé si me alcanza". Es la más universal y la que mejor conecta con el
perfil independiente (el costo de un mes sin ingreso por una lesión, contra la prima).

**Desarme en 3A** (`hormozi-sales-blueprint.md`, aplicado con el reencuadre ya escrito en
`CAPA-CUALITATIVA.md`):
- **Acknowledge:** "Entiendo, y es válido preguntarlo."
- **Associate:** "Es justo la pregunta que hacen las personas que sí llevan las cuentas claras,
  como tú, que trabajas por tu cuenta."
- **Ask:** "¿Con qué lo estás comparando? Porque lo que cuesta al mes suele ser menos que un mes
  sin poder facturar por una lesión. La pregunta no es si cuesta, es qué pasa el día que no puedes
  trabajar."

---

## 5. El momento de gemelos

El jurado cambia una variable en la tarjeta de Camila: le agrega un dependiente (por ejemplo, "vive
con su mamá, que depende de ella"). La recomendación se recalcula en vivo: entra `vida` o
`exequial` a la conversación además de accidentes, y la razón cambia de "tu ingreso se detiene si tú
te detienes" a "alguien más depende de tu ingreso". Es el diferenciador que `BRIEF.md` línea 223
advierte que varios equipos van a mostrar con dos perfiles preparados; acá lo cambia el jurado, no
el equipo.

**Dependencia con Sarah/Samuel:** el control para editar la variable en vivo tiene que ser
descubrible sin instrucciones, según `UX.md` sección 8.

---

## 6. Checklist de reglas que deben estar impecables para este camino

- [ ] La ruta de pivote de pregunta 1 a pregunta 3 cuando la respuesta es "nadie" (nueva, no existe
  en `CAPA-CUALITATIVA.md` hoy, se agrega en `SYSTEM-PROMPT.md`).
- [ ] `match_catalogo` con familia `familiares` y una consulta de "accidentes, independiente, sin
  respaldo" devuelve `Seguro de accidentes personales` como primer resultado. **Sin verificar
  todavía** — hay que probarlo contra Supabase antes de confiar en el camino.
- [ ] El desarme 3A de la objeción "está caro" queda escrito literal en el prompt, no improvisado.
- [ ] El perfil de Camila existe como fila real en la tabla de clientes de Samuel, con `id`.
- [ ] El control de "agregar dependiente" en vivo existe en la UI de Sarah/Samuel y recalcula.
- [ ] **Pendiente real, sin dueño fijado todavía:** la prueba social de este camino necesita un
  número real del segmento independiente ("de cada 100 afiliados en tu perfil..."). Hoy no existe
  en `ANALISIS-PROPENSION.md` — es trabajo de Luis, no inventado. Si no llega a tiempo, la
  recomendación se sostiene solo con la pata conversacional ("por lo que me contaste"), nunca con
  un número inventado.

---

## 7. Qué no se toca en esta demo

- Las otras 21 filas del catálogo. Existen y responden si alguien pregunta, pero no son el camino
  ensayado.
- Las preguntas 2, 4 y 5 de discovery. Quedan disponibles, no forman parte del guión de 50s.
- El simulador de WhatsApp completo. El camino feliz vive en la web; WhatsApp solo necesita mostrar
  la puerta y el handoff, según `PLAN-CONSTRUCCION.md`.
- Precios reales. Se sintetiza un rango ilustrativo por edad y se declara así en pantalla, porque
  `precio_desde` está vacío en las 22 filas del catálogo.
