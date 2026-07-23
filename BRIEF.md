# Reto 2 — Venta automatizada de seguros

**Documento único.** Brief oficial, análisis, estado del proyecto y lo que falta definir.
Autocontenido: quien lo lea entiende el proyecto sin abrir nada más.

**Actualizado:** 2026-07-23, día 2.
**Repo del equipo:** `github.com/Samuel-Tabares/colsubsidio-agentic-insurance`.
Roles y arquitectura del emulador viven allá; este documento es el contexto y el criterio.

**Jerarquía:** la Parte 1 es el brief oficial verbatim y **gana sobre todo lo demás**,
incluido este mismo documento. Si algo en las partes 2 a 5 lo contradice, gana la Parte 1.

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
Tenemos 1,56 millones de perfiles de afiliados que nos dicen qué necesita cada tipo de persona.
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

- **Sarah (UX):** `UX.md`. Es tu documento. Este brief, para contexto.
- **Luis (agente y análisis):** `ANALISIS-PROPENSION.md`, más la Parte 4 de acá.
- **Samuel (datos y backend):** las Partes 3 y 4, más `EMULADOR_ARQUITECTURA.md` del repo.
- **Todos:** la sección "EN 60 SEGUNDOS" y la Parte 1.

---

# PARTE 1 — BRIEF OFICIAL (verbatim)

## Venta automatizada de seguros

### El problema

Hoy, comprar un seguro en Colsubsidio exige la intervención de un asesor comercial, quien
identifica la necesidad, cotiza, explica las coberturas y concreta la venta. Sin esa
intervención, la venta no ocurre.

Ese modelo:
- **No escala:** un asesor solo puede atender a un potencial cliente a la vez.
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
4. **Catálogo multi-aseguradora.** El modelo de datos necesita `aseguradora` como campo.
   Comparar entre aseguradoras distintas es un valor real que un asesor humano difícilmente da
   sin sesgo.

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

~1.500.000 registros, CSV separado por punto y coma. Columnas reales, verificadas contra el
archivo:

`SERIE, NOMBRE_COMPLETO, GENERO, RANGO_EDAD, CATEGORIA, SEGMENTO_GRUPO_FAMILIAR,
SEGMENTO_POBLACIONAL, PIRAMIDE_NUEVA, EMPRESA_FOCO, ESTADOAFILIADO, CIUDAD_AFILIADO,
HOTELES, PISCILAGO, DROGUERIA, AGENCIAS, VIVIENDA`

Las últimas cinco son marcas de consumo 2026, sí o no: si el afiliado compró en droguerías,
hoteles, recreación, agencias de viajes y vivienda.

**Ya tenemos el archivo completo y está procesado.** Samuel construyó el ETL: 1.560.000 filas
normalizadas y validadas fila por fila contra la fuente, con esquema Postgres. Los CSV crudo y
limpio están gitignored por tamaño y por PII. Repo del equipo:
`github.com/Samuel-Tabares/colsubsidio-agentic-insurance`.

### 4 hallazgos, para no repetir el trabajo

1. **Hay PII.** `NOMBRE_COMPLETO` viene con nombres reales, pese a que la documentación oficial
   dice que está anonimizada. Se descarta en la ingesta, antes de cualquier análisis, y
   **nunca sube a ningún repositorio.** Hay que avisarle a la organización.
2. **No hay variable objetivo.** La quinta marca es `VIVIENDA`, no un indicador de compra de
   seguros. No se puede entrenar un modelo supervisado de propensión.
3. **La muestra de 75 filas está filtrada.** `DROGUERIA` es SI en todas y `HOTELES`, `AGENCIAS`
   y `VIVIENDA` son NO en todas. Sirve para el vocabulario de valores, no para distribuciones.
4. **Calidad irregular.** `CIUDAD_AFILIADO` vacía en el 65% de la muestra, y hay un typo en los
   propios datos (`AFILLIADO` con doble L). Las reglas deben degradar con elegancia.

### Mapeo señal a familia de producto (base del ruteo)

- `DROGUERIA` → salud, asistencias médicas
- `HOTELES` y `AGENCIAS` → asistencia médica en viajes
- `PISCILAGO` → accidentes personales
- `VIVIENDA` → hogar (contenido, arrendamiento)
- `SEGMENTO_GRUPO_FAMILIAR` con dependientes → vida, exequial
- `PIRAMIDE_NUEVA` igual a Independiente → accidentes, salud

Nota de alto valor: `PIRAMIDE_NUEVA` clasifica a la empresa empleadora, no a la persona. Un
independiente y un empleado de empresa grande con el mismo perfil familiar tienen necesidades
distintas porque uno tiene respaldo institucional y el otro no. Es un por qué muy defendible.

Nota: `CATEGORIA` en una caja de compensación es el rango salarial. Es la variable de capacidad
de pago que permite no recomendar una prima que la persona no puede pagar.

### Lo que dijo el análisis sobre las 1,56M filas

Del análisis de asociación cruzada de Samuel (Cramér's V corregido por sesgo, 66 pares de campos).
Estos números mandan sobre cualquier supuesto sacado de la muestra de 75.

**El consumo casi no correlaciona con el perfil (V ≤ 0,15).**
Esto NO significa que las marcas no sirvan, significa lo contrario: **son señal independiente**.
Saber que alguien tiene 35 años y familia monoparental no permite adivinar si compra en droguería,
así que la marca aporta información que el perfil demográfico no tiene. Dos señales independientes
suman, no se pisan.
Consecuencia práctica: **las marcas no se pueden inferir para un usuario nuevo.** Al que no está en
la base hay que preguntarle, que es justo lo que hacen las 5 preguntas de discovery.
Advertencia honesta: la base no tiene variable de compra de seguros, así que nada de esto prueba
que la marca prediga necesidad de seguro. Sigue siendo una hipótesis razonada y así se presenta.

**El segmento más grande es "20-35 años sin grupo familiar", con el 33% de la base.**
Un tercio de 1,56 millones de personas, y es literalmente el "soltero sin hijos" del ejemplo de
gemelos del brief. **Esa es la persona por defecto del demo.**

**`piramide` y `empresa_asociada` tienen V = 0,84, asociación estructural.**
`empresa_asociada` es casi una bandera de subconjunto del tramo "1 Grandes". Usarlas como dos
señales separadas es contarse la misma cosa dos veces. Se elige una.

**`ciudad` es el campo más débil (V ≤ 0,06)** y viene vacío en buena parte. No se usa para decidir.
Como mucho, para el canal.

**Trampa metodológica que Samuel detectó y corrigió**, vale la pena tenerla presente: tratar
"(sin dato)" como una categoría normal inflaba la asociación entre los campos socioeconómicos,
porque 13.910 registros vienen vacíos en los cuatro a la vez. Dos campos parecían relacionados en
parte porque se quedan en blanco en las mismas filas, no porque sus valores reales correlacionen.

## El catálogo

La oferta pública de seguros de Colsubsidio (colsubsidio.com/seguros). Se scrapea a un JSON
estructurado. Spec en `SPEC-SCRAPE-CATALOGO.md`.

**Riesgo abierto:** las primas. Si el catálogo público no las trae, hay que sintetizar rangos
coherentes por edad y declararlos como ilustrativos en pantalla.

---

# PARTE 4 — QUÉ ESTAMOS CONSTRUYENDO

**Un asesor de seguros que conversa, descubre el dolor real de la persona, le recomienda un
producto concreto del catálogo y le muestra exactamente por qué ese y no otro.**

La razón que ve el cliente tiene dos patas: **por tu perfil** (lo que dicen los datos) y
**por lo que me contaste** (la conversación).

Principio de arquitectura: **los datos definen el mapa, la conversación ubica a la persona en él.**

La superficie es un hilo estilo WhatsApp, pero con tarjetas interactivas dentro del chat: el
comparador tiene pestañas por aseguradora, la cobertura tiene slider, las exclusiones se
despliegan. El usuario nunca sale del chat.

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
   literal que no acepta soluciones tipo caja negra.
2. **Nada que el agente diga puede estar fuera del catálogo.** Si no está documentado, dice que
   no lo tiene. No estima, no aproxima, no completa el patrón.
3. **El por qué se muestra dentro del producto, no en el pitch.**

## Decisiones tomadas

- **Stack.** Next.js en TypeScript, serverless, deploy en Vercel. Un repo, un deploy, una rama
  por persona.
- **Punto de partida.** Préstamo de arquitectura de un proyecto previo de Jhon (agente de
  WhatsApp con RAG, ya en producción) que trae resuelto: hilo estilo WhatsApp, streaming con
  Vercel AI SDK, RAG sobre Supabase pgvector, rate limit, guardrails anti prompt injection, y
  el gating de confirmación antes de ejecutar una acción. No diseñamos arquitectura desde cero.
- **El motor de recomendación** es una función pura en TypeScript dentro del mismo repo, que
  lee `reglas.json` y `catalogo.json`. Python se usa solo offline para derivar `reglas.json`
  desde los 1,5M. Un deploy menos, un punto de falla menos, y las reglas quedan legibles en
  Git, que es justo lo que el brief exige.
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
- **Modelo:** por decidir entre Gemini 2.5 y gpt-4o-mini. Se comparan el día 2 con el mismo
  prompt y se congela.

## Lo que NO construimos

Si aparece la tentación, la respuesta es no.

- Integración con aseguradoras, firma electrónica, pasarela de pago, siniestros y renovaciones.
  **Los excluye el propio brief.**
- Voz, telefonía, WhatsApp real. Ruta declarada en el README, no se construye.
- Modelo de machine learning. No hay variable objetivo, y las reglas explícitas ganan en
  explicabilidad, que es justo lo que califican.
- Login, cuentas de usuario, panel de administración, multi-idioma.
- Campañas de envío masivo.
- Cotizador actuarial real.

## Cómo sabemos si vamos bien

Un solo criterio manda sobre todos los demás:

> **Alguien ajeno al equipo abre la URL, la recorre sin ayuda y termina asegurado.**

Si eso falla, nada más importa. Si eso pasa, ya estamos compitiendo.

---

# PARTE 5 — DÓNDE ESTAMOS Y QUÉ FALTA

**Tiempo real disponible:** el domingo está prácticamente muerto, así que quedan jueves, viernes y
sábado. Unos 2,5 días, no 4. El consejo del mentor de acotar el alcance y llegar de punta a punta
deja de ser prudencia y pasa a ser la única ruta viable.

## Existe y sirve

- Este brief, con el análisis y los hallazgos de la base.
- **La capa de datos, entregada.** ETL de las 1,56M filas validado fila por fila, esquema Postgres
  con auditoría, y el análisis de asociación cruzada. Trabajo de Samuel, ya en el repo.
- **El repo del equipo**, con la arquitectura del emulador documentada y el esquema SQL.
- El discurso completo del agente en `CAPA-CUALITATIVA.md`: ICP, dolor, futuro soñado, las 5
  preguntas de discovery y las 6 objeciones con su desarme, por familia de producto. De ahí
  sale el system prompt.
- La spec del scrape del catálogo, con 22 URLs priorizadas.
- **Vocero CRM** (MIT, Next.js 15 + Drizzle + Postgres) como base de la vista administrativa:
  bandeja en tiempo real, pipeline, toggle para que un humano retome, plantillas.

## No existe todavía

- **El catálogo estructurado.** El scrape no se ha corrido, y es el insumo del RAG. Es el camino
  crítico.
- La vista cliente, que es lo único que el jurado recorre solo.
- El motor de reglas `recomendar(perfil)` y su `reglas.json`.

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

**Los 4 contratos que bloquean el trabajo en paralelo** (preguntas abiertas de
`EMULADOR_ARQUITECTURA.md`):
1. Luis a Jhon: endpoint, formato de query y respuesta del RAG.
2. Luis a Samuel: cómo se notifica un cambio en `perfil_crudo`.
3. Dónde vive `recomendar(perfil)` y qué devuelve.
4. Quién mueve `estado_crm.fase` y en qué evento.

**Sarah:** el flujo conversacional exacto, cómo se ven las tres tarjetas, cómo se ve la razón en
pantalla, y cómo se baja a diseño el momento de gemelos interactivo.

**Luis:** el harness del agente y si mantiene el mecanismo de hash y rehash del análisis. Nota: con
un puñado de conversaciones en un demo, ese cache cuesta depuración y no compra nada que el jurado
vea. Sugerencia de recalcular siempre y dejar el hash documentado como ruta de escalado.

**Jhon:** las reglas de familia con su justificación, y qué familias se priorizan en el demo.

**Samuel:** si el deploy va a Vercel con Supabase como Postgres (a verificar que el SSE de la
bandeja aguante los límites de duración de función) o a un VPS con Docker.

## Próximo paso

1. Llevar al equipo la separación de reglas contra RAG de la Parte 4. Es la decisión que bloquea
   todo lo demás.
2. Congelar los 4 contratos.
3. Correr el scrape del catálogo.

---

## Otros documentos del proyecto

- **`UX.md`** — para Sarah. Qué tiene que lograr la pantalla del usuario, el recorrido momento por
  momento, las tres tarjetas interactivas, cómo se muestra el porqué, y la marca.
- **`ANALISIS-PROPENSION.md`** — para Luis. Instrucciones del análisis: restricciones duras, lo que
  ya se sabe para no repetirlo, las hipótesis a validar, y el contrato de `reglas.json`.
- `NORTE-PRODUCTO.md` — una página con el alcance, para resolver dudas de "¿esto entra?".
- `ICP-OTROS/CAPA-CUALITATIVA.md` — el discurso del agente. De aquí sale el system prompt.
- `PLAN-CONSTRUCCION.md` — plan detallado: componentes, workstreams, decisiones con su
  razonamiento completo.
- `EQUIPO.md` — quién es quién y quién decide qué.
- `PENDIENTES-DIA-1.md` — orden de trabajo del día 1 al 5.
- `GUIA-ANALISIS-DATOS.md` — la guía de DuckDB para procesar los 1,5M.
- `SPEC-SCRAPE-CATALOGO.md` — cómo se arma `catalogo-seguros.json`.
- `DECISION-RETO.md` — por qué elegimos el reto 2. Histórico.
