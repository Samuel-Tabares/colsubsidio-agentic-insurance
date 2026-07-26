# Reto 2 — Venta automatizada de seguros

**Documento único de contexto y criterio.** Brief oficial, análisis, insumos, qué estamos
construyendo, estado y lo que falta definir. Autocontenido: quien lo lea entiende el proyecto sin
abrir nada más.

**Actualizado:** 2026-07-25 (día 4). La Parte 1 se transcribió de las diapositivas oficiales
(hackathon Colsubsidio × 30X, 22–26 julio 2026, Bogotá) y se fusionó con el brief informal del
reto (antes `contexto.md`) para no perder detalle entre las dos versiones.
**Repo del equipo:** `github.com/Samuel-Tabares/colsubsidio-agentic-insurance`.

**Jerarquía:** la Parte 1 es el brief oficial verbatim y **gana sobre todo lo demás**, incluido este
mismo documento. Si algo en las partes 2 a 5 lo contradice, gana la Parte 1.

**Enlaces:** catálogo de seguros Colsubsidio → https://www.colsubsidio.com/seguros · dashboard
exploratorio de datos de afiliados → ver [README](README.md).

---

# EN 60 SEGUNDOS

Sin tecnicismos. Si solo lees esto, ya sabes de qué va el proyecto.

**El problema.** Hoy, para comprar un seguro en Colsubsidio hay que hablar con un asesor. Ese
modelo no escala, no atiende a las 10 de la noche de un sábado, y cada asesor explica distinto.

**Lo que nos piden.** Que una persona pueda pasar de "no sé qué seguro necesito" a "ya quedé
asegurada" sin hablar con nadie.

**Lo que estamos construyendo.** Un asesor conversacional. La persona chatea, cuenta su situación,
y el sistema le recomienda un seguro concreto y le muestra **por qué ese y no otro**.

**La idea en una frase.** Los datos definen el mapa, la conversación ubica a la persona en él.
Tenemos 500 mil perfiles de afiliados que nos dicen qué necesita cada tipo de persona.
La conversación nos dice cuál de esos tipos es quien está escribiendo.

**Las dos preguntas que decide el jurado.**
1. "¿Por qué a esta persona le mostraste este seguro y no otro?" Si la respuesta es "porque sí",
   perdimos. Por eso el porqué se muestra en pantalla, no se explica en el pitch.
2. "¿Yo usaría esto para comprar un seguro real?" Por eso la experiencia importa tanto como que
   funcione.

**La regla que no se rompe.** El sistema nunca inventa un precio ni una cobertura. Todo lo que dice
sale de un catálogo real y de unas reglas escritas que cualquiera puede leer.

**El examen final.** Un jurado abre la pantalla y la recorre **solo**, sin que nadie del equipo le
explique nada. Si se traba, no hay forma de compensarlo.

## Glosario, para que nadie se pierda

- **RAG.** Una forma de buscar. En vez de que el sistema se invente la información del producto, la
  busca en el catálogo real y la usa tal cual. Sirve para que no mienta.
- **Motor de reglas.** Un archivo con condiciones escritas a mano del tipo "si la persona tiene
  dependientes, entonces vida". Es lo contrario de un modelo que decide sin poder explicarse.
- **LLM.** El modelo que conversa (tipo ChatGPT). Acá conversa y narra, pero **no decide** qué
  seguro recomendar.
- **Propensión.** Qué tan probable es que una persona necesite cierto tipo de seguro, según su
  perfil.
- **Grounding.** Que el sistema solo diga cosas que puede respaldar con un documento real.

## Quién lee qué

- **Todos:** la sección "EN 60 SEGUNDOS" y la Parte 1.
- **Sarah (UX):** el diseño de las 3 vistas en Claude Design; este brief para contexto, y
  [DEMO.md](DEMO.md) para el recorrido momento a momento.
- **Luis (análisis):** [PROPENSION.md](PROPENSION.md), más la Parte 4 de acá.
- **Jhon (cerebro y RAG):** [CEREBRO.md](CEREBRO.md) y [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md), más la
  Parte 4.
- **Samuel (datos y backend):** las Partes 3 y 4, más [ARQUITECTURA.md](ARQUITECTURA.md).

---

# PARTE 1 — BRIEF OFICIAL (verbatim)

## Venta automatizada de seguros

### El problema

Hoy, comprar un seguro en Colsubsidio exige la intervención de un asesor comercial, quien
identifica la necesidad, cotiza, explica las coberturas y concreta la venta. Sin esa
intervención, la venta no ocurre.

Ese modelo:
- **No escala:** un asesor solo puede atender a un potencial cliente a la vez, y el crecimiento del
  negocio de seguros está atado al número de asesores disponibles.
- **No está disponible 24/7:** si alguien lo necesita un sábado a las 10 pm, espera al lunes.
- **Genera experiencias inconsistentes:** cada asesor explica distinto, ofrece distinto, cierra
  distinto.

**Misión:** llevar al potencial cliente desde "no sé qué seguro necesito" hasta "ya quedé
asegurado" sin que tenga que hablar con nadie.

Colsubsidio actúa como **sponsor**: no diseña ni emite las pólizas, sino que facilita el acceso
a seguros ofrecidos por distintas aseguradoras. El reto consiste en ayudar a cada persona a
identificar la opción más adecuada dentro de esa oferta y acompañarla hasta quedar asegurada.

### Cómo se ve un buen resultado

No te decimos qué construir. Te decimos qué tendría que lograr una buena solución:

1. Identifica qué tipo de persona tiene mayor propensión a necesitar un seguro y por qué.
2. Le presenta una oferta adaptada a su perfil: distinta para alguien soltero sin hijos que
   para alguien casado con tres hijos.
3. Le permite ajustar coberturas, comparar opciones y resolver dudas sin tener que llamar a
   nadie.
4. Cierra la vinculación: aceptación, confirmación y resumen. La persona termina asegurada.
5. El flujo completo se puede recorrer de inicio a fin sin que el equipo lo explique al jurado.
   Autogestionado.

Si tu solución logra eso, no importa si es una app, un chat, un flujo guiado o algo que no se
nos ocurrió.

### Alcance esperado de la solución

- Un flujo o prototipo funcional que demuestre el recorrido completo del usuario, de principio a fin.
- Un agente/sistema de IA que sostenga la conversación y tome decisiones (qué preguntar, qué
  producto recomendar, cuándo escalar a un humano si es necesario).
- Evidencia de que la solución podría integrarse con canales reales (ej. WhatsApp Business API u
  otro canal conversacional).

### El dominio: lo que necesitas entender para resolverlo bien

**Colsubsidio es sponsor, no asegurador ni intermediario.** El catálogo reúne productos de
varias aseguradoras. Tu flujo no diseña el seguro; ayuda a encontrar el adecuado entre los que
ya existen y a vincularse a él.

**La propensión no puede ser aleatoria.** Decidir a quién mostrarle un seguro de vida vs. uno
de hogar debe estar basado en variables reales: número de beneficiarios, edad, eventos de vida,
tipo de empleo, hábitos. El jurado preguntará: ¿por qué a esta persona le mostraste este seguro
y no otro? Si la respuesta es "porque sí" o "aleatorio", el criterio no se cumple.

**La oferta debe variar por perfil.** Una persona soltera sin hijos y una casada con 3 hijos
deben ver ofertas claramente distintas: no solo en el precio, también en el tipo de seguro y en
las coberturas sugeridas. Una oferta genérica que sirva para todos no califica.

**La experiencia tiene que transmitir confianza.** La persona no está comprando una camiseta,
está decidiendo proteger algo importante. La interfaz debe sentirse personal, no como un
formulario genérico. Lenguaje claro, información relevante visible, sin tecnicismos de póliza.
La pregunta que se hace el jurado: ¿yo usaría esto para comprar un seguro real?

**Timing y canal (opcional, pero potente).** Detectar cuándo y por dónde contactar al potencial
cliente (tras un evento de vida, tras X días sin interacción, tras consultar cierto servicio)
eleva mucho el puntaje estratégico.

### Qué NO toca este reto
- Integración real con aseguradoras.
- Firma electrónica con validez legal.
- Gestión de siniestros, renovaciones o flujo multi-aseguradora en producción.
- Pasarela de pago real.

### Entregables
- Solución funcional (aplicación, chatbot, experiencia digital, flujo guiado o cualquier otro
  mecanismo), navegable por el jurado.
- README que permita ejecutar la solución en menos de 2 minutos.
- Lógica documentada que explica por qué se recomienda un seguro a determinada persona.
  **No se aceptan soluciones tipo caja negra.**
- Pitch de 2 minutos.

### Criterios de evaluación (a confirmar con el jurado)
- Claridad y viabilidad de la propuesta de negocio.
- Calidad de la experiencia de usuario (facilidad, confianza, transparencia).
- Solidez técnica de la solución (arquitectura, uso de IA, manejo de datos).
- Calidad de la presentación/pitch final.

### Cronograma del evento
- **Miércoles y jueves:** sesiones virtuales (explicación de retos, mentoría).
- **Viernes a domingo:** hackathon presencial en Club La Colina, Colsubsidio, Bogotá (o virtual si
  no hay cupo presencial).

> *La Parte 1 se generó a partir de capturas de las diapositivas oficiales y del brief informal del
> reto. Si algo no coincide exactamente con lo presentado, corregir directamente aquí antes de
> compartirlo con el resto del equipo.*

---

# PARTE 2 — ANÁLISIS DEL BRIEF

## A. Lo que el brief confirma

1. **El diagnosticador de necesidad.** "Identifica qué tipo de persona tiene mayor propensión y
   por qué" es descubrir el dolor, no empujar producto.
2. **El momento de gemelos.** El brief usa literalmente el escenario "soltero sin hijos vs
   casado con tres hijos". Nuestra idea de wow es el ejemplo del propio cliente.
3. **El guardrail de grounding.** "Si la respuesta es 'porque sí' o 'aleatorio', el criterio no
   se cumple" valida la regla: el LLM nunca decide el producto, lo decide el motor de reglas.
4. **La confianza como criterio.** "¿Yo usaría esto para comprar un seguro real?" valida que la
   oferta debe sentirse personal, no genérica.
5. **Timing y canal.** El brief los declara "opcional pero potente" y dice que "eleva mucho el
   puntaje estratégico". Valen más de lo que asumimos al principio.

## B. Correcciones a supuestos previos

**B.1 El ángulo regulatorio no es el diferenciador.** Asumimos que nuestra ventaja sería la
lectura regulatoria, argumentando que somos el canal propio de la aseguradora. El brief dice
que Colsubsidio no es asegurador ni intermediario, es sponsor, y excluye integración, firma
electrónica y pasarela de pago. El cierre legal está fuera de alcance por decisión de ellos.
Baja de pilar del pitch a una línea. El diferenciador real es propensión explicable más
experiencia que transmite confianza.

**B.2 "Autogestionado" cambia la naturaleza del demo.** No es una demo que narramos, es un
producto que el jurado usa solo. La UX sube de importancia dramáticamente. Se cae la idea de
caras narradas en secuencia.

**B.3 El cierre es más liviano de lo que asumimos.** Cierre igual a aceptación más confirmación
más resumen. No hay pago simulado ni certificado de póliza.

## C. Requisitos nuevos

1. **Ajustar coberturas.** El usuario modifica su cobertura y ve el efecto.
2. **Comparar opciones.** Vista comparativa entre alternativas.
3. **Resolver dudas.** Preguntas y respuestas dentro del flujo, sin llamar a nadie.
4. **Catálogo con campo `aseguradora`.** El modelo de datos mantiene `aseguradora` como campo a
   nivel producto, y en el catálogo público de Colsubsidio ese campo siempre resuelve a
   "Colsubsidio" (sponsor, no underwriter) — es correcto, es el canal de compra. El underwriter
   real (Sura, Allianz, BMI, MetLife...) sí es público y vive dentro de cada plan, en la columna
   `planes` (actualización 2026-07-25, ver nota abajo). La comparación del MVP se hace entre
   **productos, coberturas y precio**, no entre aseguradoras distintas; el dato de aseguradora real
   queda disponible en `planes` si se decide usarlo más adelante.

> **Nota del equipo — por qué el comparador NO compara aseguradoras** (decisión 2026-07-23, Jhon.
> Corregida 2026-07-25: el hecho que la sustentaba era falso, la decisión de scope se mantiene)
>
> **Corrección 2026-07-25:** el párrafo original decía que los underwriters reales no están en el
> HTML público. Es falso, y el error era de scraping, no del sitio: la sección de planes de varias
> páginas de Colsubsidio carga lazy (con scroll), y el primer scrape (23 de julio) no forzaba ese
> scroll, así que Sura, Allianz, BMI, MetLife, Chubb, Pan American Life, AXA Colpatria, Seguros
> Bolívar, Equidad, Mapfre, Seguros Mundial y SBS quedaron invisibles para el extractor aunque
> estaban en la página. Un re-scrape de las 22 URLs con scroll forzado (25 de julio) los recuperó
> completos, junto con el precio real por plan. Están en la columna `planes` de `catalogo`, no en el
> campo `aseguradora` a nivel producto (ese sigue siendo "Colsubsidio", el canal). Detalle técnico y
> los 13 aseguradores reales encontrados: [CEREBRO.md](CEREBRO.md), sección "Catálogo y RAG".
>
> **La decisión de scope se mantiene, con la razón correcta.** Aunque el dato ya existe, montar UI
> de tabs por aseguradora sigue sin ser prioridad del MVP: el "flujo multi-aseguradora en
> producción" ya está fuera de alcance (ver "Qué NO toca este reto"), y comparar aseguradoras es
> "valor real" (bonus), NO uno de los dos gates calificados (explicabilidad + confianza). El eje de
> comparación del demo sigue siendo **producto, cobertura y precio**, que la data soporta al 100% y
> es lo que puntúa. El dato de aseguradora real queda listo en `planes` para quien quiera usarlo
> después, sin que haga falta re-scrapear nada.
>
> **Para quien construya el comparador:** no hace falta UI de tabs por underwriter para el MVP. Si
> se quiere mostrar la aseguradora real de cada plan como dato adicional (no como eje de
> comparación), está disponible en `planes[].aseguradora`.
>
> **Para el system prompt del agente (Fase 3):** Colsubsidio sigue siendo **sponsor**, no
> aseguradora ni intermediario, esto no cambió. Si el usuario pregunta "¿quién me asegura?", el
> agente puede nombrar la aseguradora real del plan concreto que está mostrando (ahora sí se tiene
> el dato), aclarando que Colsubsidio es quien facilita el acceso, no quien emite la póliza.

## D. Las variables de propensión, que nos regalaron

No hay que adivinar el feature set. El brief lo escribe: número de beneficiarios, edad, eventos
de vida, tipo de empleo, hábitos.

## E. Los dos gates del jurado

1. **Explicabilidad.** "¿Por qué a esta persona le mostraste este seguro y no otro?"
   El por qué debe ser visible EN EL PRODUCTO, no solo en el pitch.
2. **Confianza.** "¿Yo usaría esto para comprar un seguro real?"
   UX, lenguaje claro, cero tecnicismos de póliza.

## F. El wow, subido de nivel

Como el escenario de gemelos está en el brief, varios equipos lo van a montar. Para
diferenciarnos: en vez de mostrar dos perfiles preparados, **dejar que el jurado cambie una
sola variable él mismo** (agregar un hijo, mover la edad, cambiar tipo de empleo) y ver cómo la
recomendación, las coberturas y el por qué se recalculan en vivo.

Cumple los tres criterios en un solo gesto: es autogestionado, es explicable, y es el momento
de gemelos hecho interactivo en lugar de actuado.

---

# PARTE 3 — LOS INSUMOS

## La base de afiliados

> ⚠️ **La organización cambió la base el 23 de julio.** Es un archivo distinto, no una corrección
> del anterior: cambió el tamaño, cambiaron las columnas, y **los valores de cuatro columnas
> quedaron anonimizados con códigos griegos.** Todo análisis hecho sobre la versión de 1,56M queda
> pendiente de rehacer. Si alguien está trabajando con la base vieja, para y cambia de archivo.

**~500.000 registros**, CSV separado por punto y coma. Quince columnas:

`SERIE, GENERO, RANGO_EDAD, RANGO_SALARIAL, CATEGORIA, SEGMENTO_GRUPO_FAMILIAR,
SEGMENTO_POBLACIONAL, PIRAMIDE_NUEVA, EMPRESA_FOCO, CIUDAD_AFILIADO,
HOTELES, PISCILAGO, DROGUERIA, AGENCIAS, VIVIENDA`

Las últimas cinco son marcas de consumo 2026, sí o no: si el afiliado compró en droguerías,
recreación, agencias de viajes y vivienda.

### Qué cambió respecto de la base anterior

**Se fueron dos columnas:** `NOMBRE_COMPLETO` (el problema de PII quedó resuelto en la fuente) y
`ESTADOAFILIADO`.

**Entró una columna, y es una ganancia:** `RANGO_SALARIAL`, legible y en salarios mínimos
(`Menor al SM`, `Entre 1 y 1.5`, `Entre 8 y 10`). Es mejor variable de capacidad de pago que la
`CATEGORIA` anterior, que además ahora viene codificada.

**Cuatro columnas pasaron a código griego opaco.** Este es el cambio que más duele:

- `CATEGORIA`: antes `A`, `B`, `C`. Ahora `ZETA`, `SIGMA`, `PI`, `MU`.
- `SEGMENTO_GRUPO_FAMILIAR`: antes `FAMILIA MONOPARENTAL`, `FAMILIA NUCLEAR INTEGRAL`. Ahora
  `LAMBDA`, `CHI`, `RHO`, `EPSILON`, `THETA`.
- `SEGMENTO_POBLACIONAL`: antes `Básico`. Ahora `PI`, `TAU`, `ETA`, `OMEGA`.
- `PIRAMIDE_NUEVA`: antes `2 Medianas`, `6.2 Independiente`. Ahora `DELTA`, `PSI`, `XI`,
  `UPSILON`, `OMICRON`.
- `EMPRESA_FOCO`: ahora seudonimizada como `EMP_000001`.

**`CIUDAD_AFILIADO` viene mucho más poblada** que antes (`BOGOTA D.C.`, `CHIA`, `SOACHA`), aunque
sigue teniendo vacíos. Hay que medir cuántos.

### La consecuencia grande

**Ya no sabemos qué significa cada código.** Nuestro mapeo de señal a familia de seguro decía cosas
como "familia monoparental sugiere vida, porque un solo ingreso sostiene a todos". Con `LAMBDA` en
vez de `FAMILIA MONOPARENTAL`, ese razonamiento no se puede escribir.

**El diccionario de códigos NO va a llegar.** Colsubsidio confirmó el 23 de julio que los tokens
griegos son intencionales, para no divulgar su clasificación interna, y que no entregarán el mapeo.
Es final, no un pendiente. Pero **sí dieron el significado conceptual de cada campo**, lo que
permite enmarcar en general sin saber qué token es cuál:
- `CATEGORIA` = categoría dentro del sistema de subsidio familiar (eje de ingreso; coincide con
  `RANGO_SALARIAL`).
- `SEGMENTO_GRUPO_FAMILIAR` = composición del hogar.
- `SEGMENTO_POBLACIONAL` = segmentación por ingreso, edad y PAC.
- `PIRAMIDE_NUEVA` = tier de la empresa aportante.

Los caminos para trabajar sin diccionario, el mapeo señal→familia y lo primero que hay que medir en
la base nueva están en detalle en [PROPENSION.md](PROPENSION.md). Resumen del criterio: se recupera
la señal por tres vías combinadas — el encuadre conceptual de arriba, la caracterización de cada
token por su comportamiento medido, y sobre todo **preguntándola en la conversación** (preguntas 1 y
3 del discovery). El efecto secundario es útil: **la anonimización sube el peso de la conversación
frente al dato**, que es exactamente la arquitectura que ya habíamos elegido.

> El detalle del modelo de datos (tokens por columna, decode direccional por frecuencia,
> confirmación de que es una extracción nueva y no un relabel) vive en [CLAUDE.md](CLAUDE.md),
> sección "Data model notes".

## El catálogo

La oferta pública de seguros de Colsubsidio (colsubsidio.com/seguros). Se scrapea a un JSON
estructurado. Procedencia, calidad, caveats y cómo se construyó el RAG: [CEREBRO.md](CEREBRO.md),
sección "Catálogo y RAG".

**Riesgo resuelto (2026-07-25):** las primas. El re-scrape con scroll forzado recuperó el precio
real por plan (9 de 22 productos con al menos un plan con cifra). Donde no hay precio publicado, la
prima la confirma un asesor; nunca se sintetiza una cifra y se presenta como real.

---

# PARTE 4 — QUÉ ESTAMOS CONSTRUYENDO

**Un asesor de seguros que conversa, descubre el dolor real de la persona, le recomienda un
producto concreto del catálogo y le muestra exactamente por qué ese y no otro.**

La razón que ve el cliente tiene dos patas: **por tu perfil** (lo que dicen los datos) y
**por lo que me contaste** (la conversación).

Principio de arquitectura: **los datos definen el mapa, la conversación ubica a la persona en él.**

La superficie es un hilo estilo WhatsApp, pero con tarjetas interactivas dentro del chat: el
comparador tiene pestañas por producto/opción, la cobertura tiene slider, las exclusiones se
despliegan. El usuario nunca sale del chat.

## La idea central: un cerebro, dos canales, un perfil compartido

El sistema tiene **un solo cerebro** (el agente + RAG + `recomendar()`) que no sabe en qué canal
está. Ese cerebro atiende **dos canales**: un WhatsApp simulado y una web. Y hay **un solo perfil
por usuario** en la base, que los dos canales leen y escriben.

Por eso el recorrido es de punta a punta en cualquiera de los dos: el usuario puede terminar en
WhatsApp si quiere, o saltar a la web y encontrar su contexto ya cargado.

**El handoff es real, no falso.** El link de WhatsApp abre la web, y el chatbot web llama una tool
que trae el perfil por su `id`. Y al revés. No son datos de prueba precargados: es el mismo registro
en la misma base. Es lo que hace defendible el "e2e multicanal" ante el jurado.

**Reparto por canal:**
- **WhatsApp** es la puerta proactiva: oferta (simulada), precalificación de 2-3 preguntas, y
  notificación de estado y confirmación. Es donde nace el "hiperpersonalizado", porque solo un canal
  con push puede iniciar contacto.
- **Web** es la superficie rica: simulación, comparación, ajuste de coberturas, decisión y cierre.

**El camino de la demo es la web** (el jurado la recorre completa). En WhatsApp se muestra la
puerta, la precalificación, el handoff, y que se **puede** cerrar ahí con un caso corto, sin
duplicar todo el flujo. Eso cumple el e2e en ambos canales sin construir dos veces lo mismo.

> Estado de implementación 2026-07-25: la web-chat y el admin ya corren de punta a punta sobre
> Vocero con el cerebro en modo stub; WhatsApp queda como proyecto futuro (backend ya
> channel-agnostic). Detalle en [README](README.md) y [CLAUDE.md](CLAUDE.md), sección "App".

**El cierre** es aceptación, confirmación y resumen, entregado como mensaje en el canal.

### Qué queda fuera, y por qué

1. **WhatsApp real** (plantillas de Meta, ventana de 24h, opt-in): simulado. Fuera por infra y
   porque el jurado tiene que recorrerlo solo; un WhatsApp real depende de su celular y de Meta.
2. **Sincronización en tiempo real bot↔web** (push entre canales): no se construye. El handoff es
   estado compartido al cargar, no sync en vivo. Alcanza para la demo y sigue siendo real.
3. **Documentos con validez legal, suscripción real, decisión de aseguradora:** fuera por el brief.
   La "decisión" del flujo es la del usuario de aceptar, no una suscripción real.
4. **Pago y firma electrónica:** excluidos por el brief.
5. **PDF de póliza o certificado:** no ahora. A lo sumo un PDF de resumen, y eso va al roadmap. El
   cierre entrega el resumen como mensaje, no como documento.
6. **Login:** cold start con un `id` generado; el perfil se llavea por ese `id`. Sin login.
7. **Voz:** descartada.

## Las 3 reglas que no se rompen

1. **Ni el LLM ni el RAG deciden qué seguro se recomienda.** Conversan y recuperan. Quien decide
   es una función `recomendar(perfil)` que lee reglas escritas en un JSON legible en Git. Esto es
   directamente el gate número uno del jurado.

   **La división de trabajo, que es la decisión de arquitectura más importante del proyecto:**
   - **Las reglas explícitas deciden la FAMILIA** (vida, salud, hogar, movilidad, mascotas) y
     producen la justificación. Determinista y auditable.
   - **El RAG recupera el PRODUCTO concreto** dentro de esa familia, con sus coberturas,
     exclusiones y condiciones. Ahí sí es la herramienta correcta, porque es recuperación.
   - **La razón que ve el cliente** son las dos patas de siempre: el criterio de la regla más lo
     que la persona contó. Nunca "el embedding coincidió".

   Por qué importa tanto: si la búsqueda semántica ordena por relevancia y eso define la
   recomendación, la respuesta honesta al jurado es "porque el vector quedó cerca". El brief dice
   literal que no acepta soluciones tipo caja negra. El flujo detallado del cerebro está en
   [CEREBRO.md](CEREBRO.md); el motor de reglas y su contrato en [PROPENSION.md](PROPENSION.md).
2. **Nada que el agente diga puede estar fuera del catálogo.** Si no está documentado, dice que
   no lo tiene. No estima, no aproxima, no completa el patrón.
3. **El por qué se muestra dentro del producto, no en el pitch.**

## Decisiones tomadas

- **Stack.** Next.js en TypeScript sobre Vocero CRM (fork vendorizado en `app/`). Decisión del
  2026-07-25: TS/Next sobre Vocero en vez de un backend Python aparte, porque Vocero ya trae el
  admin, la tubería de ingesta de canal y un adaptador de IA. Detalle en [CLAUDE.md](CLAUDE.md).
- **Punto de partida.** Préstamo de arquitectura de un proyecto previo de Jhon (agente de
  WhatsApp con RAG, ya en producción) que trae resuelto: hilo estilo WhatsApp, streaming con
  Vercel AI SDK, RAG sobre Supabase pgvector, rate limit, guardrails anti prompt injection, y
  el gating de confirmación antes de ejecutar una acción. No diseñamos arquitectura desde cero.
- **El motor de recomendación** es una función `recomendar()` que lee `reglas.json` y
  `catalogo.json`. Python se usa solo offline para derivar `reglas.json`. Un deploy menos, un punto
  de falla menos, y las reglas quedan legibles en Git, que es justo lo que el brief exige.
- **El cerebro del agente, separado en dos.** La persuasión (tono, discovery, manejo de
  objeciones) va en el system prompt, estático. El producto (coberturas, exclusiones,
  condiciones) va en RAG. No se mezclan: si el manejo de objeciones vive en el mismo índice
  vectorial que las primas, la consulta "cuánto cuesta" devuelve un guion de venta y el agente
  lo cita como si fuera un hecho.
- **Arranque en frío**, sin selector de perfiles. El brief pide el recorrido completo desde
  "no sé qué seguro necesito".
- **Inbound es el demo, la arquitectura es bidireccional.** El criterio 5 exige que el jurado
  recorra el flujo solo. El outbound es bonus declarado y se cubre con una pantalla de
  priorización derivada del análisis, sin construir envíos. La base no trae teléfono ni correo:
  no es un directorio, es un mapa de propensión.
- **Canal en producción: WhatsApp**, con la web de Colsubsidio como entrada fría. Las
  limitaciones (plantillas pre-aprobadas de Meta, ventana de 24 horas, sin sliders nativos) van
  explícitas en la documentación, no escondidas.
- **Modelo:** por decidir entre Gemini 2.5 y gpt-4o-mini. Se comparan con el mismo prompt y se
  congela. (Ver también el registro de iteración en [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md): gpt-4o-mini
  tiene documentado el patrón de "completar con una cifra plausible", riesgo directo para la regla
  de no inventar primas.)

## Lo que NO construimos

Si aparece la tentación, la respuesta es no.

- Integración con aseguradoras, firma electrónica, pasarela de pago, siniestros y renovaciones.
  **Los excluye el propio brief.**
- Voz, telefonía, WhatsApp real. Ruta declarada en el README, no se construye.
- Modelo de machine learning. No hay variable objetivo, y las reglas explícitas ganan en
  explicabilidad, que es justo lo que califican.
- Login, cuentas de usuario, multi-idioma.
- Campañas de envío masivo.
- Cotizador actuarial real.

## Cómo sabemos si vamos bien

Un solo criterio manda sobre todos los demás:

> **Alguien ajeno al equipo abre la URL, la recorre sin ayuda y termina asegurado.**

Si eso falla, nada más importa. Si eso pasa, ya estamos compitiendo.

## Para quién

Una persona que no sabe qué seguro necesita y que no quiere hablar con un asesor.
No es alguien que ya sabe qué quiere y viene a cotizar.

## El momento que tiene que pasar en el demo

Alguien entra sin saber nada de seguros, conversa unos turnos, y sale con:
1. Un producto concreto recomendado, con su prima y sus coberturas reales.
2. Una razón que entiende y que puede repetir con sus propias palabras.
3. Las exclusiones a la vista, sin haberlas pedido.
4. Un resumen de que quedó asegurado, y el aviso de que un asesor retoma para finalizar.

Y todo eso sin que nadie del equipo abra la boca. El recorrido exacto, turno a turno, está en
[DEMO.md](DEMO.md).

## Preguntas ya resueltas, para no reabrirlas

1. **¿Para qué la base de afiliados?** Para sostener el porqué. El brief pide "qué **tipo** de
   persona", que es nivel de segmento. No es un directorio ni un lookup individual, y de hecho la
   base no trae teléfono ni correo.
2. **¿Inbound u outbound?** Arquitectura bidireccional, demo inbound. El outbound es bonus declarado
   del brief y se cubre con una pantalla de priorización, sin construir envíos.
3. **¿Cómo entra el jurado?** En frío. El brief pide el recorrido completo desde "no sé qué seguro
   necesito".
4. **¿Dónde vive en producción?** WhatsApp como canal, la web de Colsubsidio como entrada fría.

## Roles (reparto vigente, 23 de julio)

- **Jhon — el cerebro y el RAG.** Scrape del catálogo → tabla + RAG en Supabase. El agente
  conversacional (system prompt, discovery, `recomendar(perfil)`). El cerebro es único y lo llaman
  los dos canales. Es el único con dominio de seguros, así que las reglas de negocio son suyas.
- **Samuel — full stack de la superficie.** Levanta el open source (Vocero CRM). Construye las 3
  vistas sobre el diseño de Sarah (app de administración con dos secciones, simulador de WhatsApp,
  simulador de web) y el backend que conecta los canales al cerebro, incluida la base de clientes
  que hace posible el handoff.
- **Sarah — experiencia y confianza.** Diseña las 3 vistas en Claude Design (referencia exacta de
  cómo se ve y se comporta cada una). No programa el frontend; lo implementa Samuel. Puede ajustar
  detalles de UX sobre el código montado. Marca, explicabilidad, pitch. Dueña del gate más duro
  (autogestionado), su palabra manda en flujo.
- **Luis — análisis de propensión.** Produce `reglas.json` desde la base, que alimenta el cerebro.

**Si algo entra o no al alcance:** este documento y [ARQUITECTURA.md](ARQUITECTURA.md) (plan de
construcción). Si no está resuelto ahí, lo decide Jhon en el momento, sin reunión.

## Por qué la base estructurada es el moat, no el agente

Argumento para el pitch, y también criterio de construcción.

El agente conversacional es la cara. La calidad de lo que dice sale de la base estructurada que
tiene debajo. **Un agente elocuente sobre datos desordenados dice cosas equivocadas con seguridad**,
que en seguros es peor que no vender.

Por eso el componente central no es un "motor de cotización", es la base de conocimiento
estructurada: productos, coberturas, elegibilidad, exclusiones, bandas de prima, divulgación. El
agente es reemplazable; la data limpia y las reglas bien modeladas no.

**Respaldo de dominio:** Jhon centralizó la operación de una agencia de seguros de SURA y vio de
primera mano que la operación real vive en Excel. Es la prueba que sostiene el argumento ante el
jurado.

**El segundo ángulo del reto, que casi nadie ve:** automatizar la venta exige primero estructurar el
conocimiento del producto. Si la data oficial viene ordenada, se mapea directo. Si viene tipo Excel,
ese gap es parte de la historia: el paso 1 para automatizar la venta es construir esta base.

**Guardarraíl de alcance:** para el MVP no se construye una plataforma de datos ni se migra a nadie
de Excel, eso es otro producto. Se construye una base semilla bien estructurada de los productos
que el demo necesita.

---

# PARTE 5 — DÓNDE ESTAMOS Y QUÉ FALTA

**Tiempo real disponible:** el domingo está prácticamente muerto, así que quedan jueves, viernes y
sábado. Unos 2,5 días, no 4. El consejo del mentor de acotar el alcance y llegar de punta a punta
deja de ser prudencia y pasa a ser la única ruta viable.

## Existe y sirve

- Este brief, con el análisis y los hallazgos de la base.
- **La tubería de datos, construida y probada.** ETL validado (`scripts/etl_afiliados.py`), esquema
  Postgres, y el análisis de asociación cruzada. Ya reapuntada al archivo nuevo de 500K. El detalle
  del método de análisis vive en [PROPENSION.md](PROPENSION.md).
- **La app sobre Vocero (`app/`)**: web-chat en `/chat` + admin (`/inbox`, `/pipeline`) corriendo de
  punta a punta con el cerebro stub. Gate verde (typecheck + lint + build + tests). Ver
  [README](README.md).
- El discurso completo del agente en [CEREBRO.md](CEREBRO.md) (capa cualitativa): ICP, dolor, futuro
  soñado, las 5 preguntas de discovery y las 6 objeciones con su desarme. De ahí sale el
  [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md).
- **El catálogo estructurado y su RAG**: scrape re-corrido con planes y precios reales; detalle en
  [CEREBRO.md](CEREBRO.md).
- **Vocero CRM** (MIT, Next.js 15 + Drizzle + Postgres) como base de la vista administrativa:
  bandeja en tiempo real, pipeline, toggle para que un humano retome, plantillas.

## No existe todavía

- **El perfilado de la base nueva** convertido en reglas: 500K filas con cuatro columnas en código
  griego. El motor de reglas `recomendar(perfil)` y su `reglas.json` (frente de Luis, ver
  [PROPENSION.md](PROPENSION.md)).
- La web-chat sobre el diseño de Sarah (hoy UI placeholder en `/chat`).
- La conexión de la app al cerebro real (`CEREBRO_MODE=external`).
- El cierre completo probado de punta a punta (aceptación, confirmación, resumen).

## Prioridades, en orden

**1. Vista cliente.** Chat con arranque en frío, discovery, recomendación con razón compuesta,
comparador, ajuste de cobertura, exclusiones a la vista, y cierre con resumen más aviso de que un
asesor retoma.

**2. Vista administrativa** sobre Vocero: bandeja, toggle del agente para que un humano retome, y
CRM por fases con el seguro comprado cruzado contra los datos reales. El toggle es la contraparte
del cierre: el agente escala y en la bandeja se ve al humano recibiendo el caso.

**3. Solo si sobra:** la pantalla de "a quién le hablaríamos hoy". Bonus de timing y canal, sale
casi gratis del análisis que ya existe.

## Lo que falta definir

**Los 4 contratos que bloquean el trabajo en paralelo** (ver Fase 0 en
[ARQUITECTURA.md](ARQUITECTURA.md)):
1. Cerebro ↔ perfil: cómo lee y escribe el cerebro el perfil por `id`.
2. Canales ↔ cerebro: cómo cada canal invoca al cerebro con el `id`.
3. `recomendar(perfil)`: qué recibe y qué devuelve, y la forma de `reglas.json`.
4. Handoff: cómo el link de WhatsApp lleva el `id` a la web.

**Sarah:** el flujo conversacional exacto, cómo se ven las tres vistas y las tarjetas, y cómo se
baja a diseño el momento de gemelos interactivo.

**Jhon:** las reglas de familia con su justificación, el flujo del cerebro, y qué familias se
priorizan en el demo.

**Luis:** la caracterización de los códigos griegos por comportamiento y las reglas de propensión.

**Samuel:** el scaffold de las 3 vistas, los canales, y si el deploy va a Vercel con Supabase como
Postgres (a verificar que el SSE de la bandeja aguante los límites de función) o a un VPS con Docker.

## Próximo paso

1. Congelar los 4 contratos (Fase 0).
2. Cerrar `reglas.json` (Luis) y conectar el cerebro real a la app (`CEREBRO_MODE=external`).
3. Probar el camino feliz de [DEMO.md](DEMO.md) contra `match_catalogo` de punta a punta.

---

## Mapa de documentos del proyecto

- **[README.md](README.md)** — puerta de entrada: qué es, cómo se levanta, roadmap, equipo.
- **[CLAUDE.md](CLAUDE.md)** — instrucciones del proyecto + el modelo de datos (tokens griegos,
  decode direccional) + tabla de stack + decisiones pendientes.
- **[ARQUITECTURA.md](ARQUITECTURA.md)** — arquitectura del sistema, esquema SQL, gobernanza de
  datos/IA, y el plan de construcción por fases (quién hace qué y dónde queda cada salida).
- **[CEREBRO.md](CEREBRO.md)** — el cerebro de punta a punta: cómo funciona en lenguaje llano, el
  catálogo y el RAG, y la capa cualitativa (ICP, discovery, objeciones) de la que sale el prompt.
- **[SYSTEM-PROMPT.md](SYSTEM-PROMPT.md)** — el system prompt del agente + su procedencia + el
  registro del dojo. Artefacto vivo que consume el harness.
- **[PROPENSION.md](PROPENSION.md)** — el frente de datos: restricciones, hipótesis, el contrato de
  `reglas.json`, y la guía técnica de DuckDB.
- **[DEMO.md](DEMO.md)** — el camino feliz de la demo y los escenarios A/B/C.
- **[Manual de Marca Colsubsidio.md](Manual%20de%20Marca%20Colsubsidio.md)** — reconstrucción de la
  marca (colores, logo, tono).
- **[CHANGELOG.md](CHANGELOG.md)** — historial de cambios.
