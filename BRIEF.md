# Reto 2 — Venta automatizada de seguros

**Documento único.** Brief oficial, análisis, estado del proyecto y lo que falta definir.
Autocontenido: quien lo lea entiende el proyecto sin abrir nada más.

**Actualizado:** 2026-07-23, día 2, tras el cambio de base de datos de la organización.
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

Tres caminos, en orden de preferencia:

1. **Pedirle a la organización el diccionario de códigos.** Es gratis, toma un mensaje, y si lo dan
   vuelve todo lo anterior. **Hacerlo ya.**
2. **Construir las reglas solo sobre los campos legibles:** `RANGO_EDAD`, `RANGO_SALARIAL`,
   `GENERO`, `CIUDAD_AFILIADO` y las cinco marcas de consumo. Alcanza para recomendar y es
   completamente explicable.
3. **Describir los códigos por su comportamiento observable, sin afirmar qué significan.** En vez de
   "eres monoparental", la razón dice "estás en el grupo que más gasto de salud tiene en la base,
   con 61% de compra en droguería". Es honesto, es verificable con un conteo, y responde el gate
   del jurado sin inventar la etiqueta.

Los caminos 2 y 3 se combinan y funcionan aunque nunca llegue el diccionario.

### Hallazgos que siguen vigentes con la base nueva

1. **No hay variable objetivo.** La quinta marca es `VIVIENDA`, no un indicador de compra de
   seguros. **No se puede entrenar un modelo supervisado de propensión**, y tampoco un modelo
   puede decidir en runtime sin romper el gate de explicabilidad.
2. **Las reglas deben degradar con elegancia.** Van a correr sobre perfiles incompletos y sobre
   gente que no está en la base. Una regla que evalúa un campo vacío no dispara, no lanza error.
3. **Fijar los strings exactos que trae el archivo.** Los datos reales traen erratas: en la base
   anterior había un `AFILLIADO` con doble L. Si la regla no escribe el valor tal cual, no matchea.
4. **Reportar siempre el tamaño absoluto del segmento junto al porcentaje.** Un 80% sobre 50
   personas no es un hallazgo.

### Hallazgos que quedaron obsoletos con el cambio de base

- **La PII.** `NOMBRE_COMPLETO` ya no existe en la fuente. Se mantiene la advertencia solo para que
  nadie siga trabajando con una copia de la base vieja, que sí traía nombres reales.
- **Todo el análisis sobre las 1,56M filas.** Samuel había corrido un estudio de asociación cruzada
  con Cramér's V sobre 66 pares de campos, con hallazgos valiosos. **Hay que rehacerlo sobre los
  500K nuevos.** Dos resultados que conviene volver a medir antes que nada:
  - Que el consumo casi no correlacionara con el perfil (V ≤ 0,15), que era la base para tratar las
    marcas como señal independiente que suma.
  - Que el segmento más grande fuera "20-35 años sin grupo familiar" con el 33% de la base. Esa
    etiqueta ya no existe, aunque el rango de edad sigue siendo legible y esa mitad se puede
    recuperar.
- **La trampa metodológica del "(sin dato)" sigue aplicando** aunque los números cambien: tratar el
  vacío como una categoría normal infla la asociación entre campos que se quedan en blanco en las
  mismas filas. Al cruzar, excluir por par las filas sin alguno de los dos campos.

### Mapeo señal a familia de producto

**Lo que sigue en pie**, porque las marcas de consumo no se codificaron:

- `DROGUERIA` → salud, asistencias médicas. Ya hay gasto de bolsillo recurrente en salud.
- `HOTELES` o `AGENCIAS` → asistencia médica en viajes.
- `VIVIENDA` → hogar, contenido y arrendamiento.
- ⚠️ `PISCILAGO` ya NO sirve: en la base nueva viene 100% en NO (columna muerta, sin señal).
  Era nuestra señal de accidentes personales; hay que buscar esa familia por otra vía (edad,
  ingreso, o la conversación).
- `RANGO_EDAD` → modula la familia y el monto.
- `RANGO_SALARIAL` → **capacidad de pago.** No define familia, define qué prima tiene sentido
  ofrecerle a esa persona. Es la variable nueva y es la mejor que tenemos para no recomendar algo
  que no puede pagar.

**Lo que se rompió con la anonimización:**

- `SEGMENTO_GRUPO_FAMILIAR` con dependientes → vida y exequial. Ya no se puede escribir, porque no
  sabemos qué código corresponde a monoparental.
- `PIRAMIDE_NUEVA` igual a independiente → accidentes y salud. Igual problema.

Esas dos eran señales fuertes. La de familia era la de mayor peso de todas, porque define el eje
del ejemplo de gemelos del brief.

**El diccionario de códigos NO va a llegar.** Colsubsidio confirmó el 23 de julio que los tokens
griegos son intencionales, para no divulgar su clasificación interna, y que no entregarán el mapeo.
Es final, no un pendiente. Pero **sí dieron el significado conceptual de cada campo**, lo que
permite enmarcar en general sin saber qué token es cuál:
- `CATEGORIA` = categoría dentro del sistema de subsidio familiar (eje de ingreso).
- `SEGMENTO_GRUPO_FAMILIAR` = composición del hogar.
- `SEGMENTO_POBLACIONAL` = segmentación por ingreso, edad y PAC.
- `PIRAMIDE_NUEVA` = tier de la empresa aportante.

Entonces la señal de familia se recupera por tres vías combinadas: el encuadre conceptual de arriba
("tu segmento de composición familiar"), la caracterización de cada token por su comportamiento
medido (ver `ANALISIS-PROPENSION.md`), y sobre todo **preguntándola en la conversación**, que es lo
que ya hacen las preguntas 1 y 3 del discovery ("¿quién depende económicamente de ti hoy?" y "si no
pudieras trabajar por un mes, ¿de qué vivirías?"). Samuel además dejó un decode direccional por
frecuencia en `CLAUDE.md`, útil como pista, nunca como etiqueta en producto.

Vale la pena notar el efecto secundario: **la anonimización sube el peso de la conversación frente
al dato**, que es exactamente la arquitectura que ya habíamos elegido. Los datos siguen definiendo
el mapa, solo que ahora el mapa tiene menos etiquetas y la conversación aporta más.

### Lo primero que hay que medir en la base nueva

Nada de lo que sigue se sabe todavía. Son las preguntas que el perfilado tiene que responder antes
de escribir una sola regla. Detalle e instrucciones en `ANALISIS-PROPENSION.md`.

1. **Qué comportamiento observable caracteriza a cada código griego.** Para cada uno: distribución
   de edad, de rango salarial, y tasa de cada marca de consumo. Eso permite describirlo por lo que
   hace sin afirmar qué es. Es el trabajo central del frente de datos.
2. **Si el consumo sigue siendo señal independiente del perfil.** Se vuelve a medir la asociación.
   El resultado cambia si las reglas suman o se pisan.
3. **Cuál es el segmento más grande** con los campos legibles, empezando por rango de edad. De ahí
   sale la persona por defecto del demo.
4. **`CIUDAD_AFILIADO` viene vacía en el 58%** (ya medido por Samuel). No sirve como segmentación
   primaria sin tratar ese hueco.
5. **`EMPRESA_FOCO` tiene solo 2 valores** (`EMP_000001` 82%, `EMP_000002` 18%) y está muy correlado
   con `PIRAMIDE_NUEVA`. Usar solo uno de los dos, no ambos como señales separadas.

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
   literal que no acepta soluciones tipo caja negra.

   > **Esto supera el flujo descrito en `EMULADOR_ARQUITECTURA.md`**, que pone al RAG a devolver
   > resultados ordenados por relevancia y de ahí sale el análisis de propensión. El resto de ese
   > documento (esquema SQL, tablas de conversaciones y auditoría, separación de los cuatro objetos
   > de datos) sigue vigente y es correcto. El enfoque vigente para propensión y reglas está en
   > `ANALISIS-PROPENSION.md`.
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

## Para quién

Una persona que no sabe qué seguro necesita y que no quiere hablar con un asesor.
No es alguien que ya sabe qué quiere y viene a cotizar.

## El momento que tiene que pasar en el demo

Alguien entra sin saber nada de seguros, conversa unos turnos, y sale con:
1. Un producto concreto recomendado, con su prima y sus coberturas reales.
2. Una razón que entiende y que puede repetir con sus propias palabras.
3. Las exclusiones a la vista, sin haberlas pedido.
4. Un resumen de que quedó asegurado, y el aviso de que un asesor retoma para finalizar.

Y todo eso sin que nadie del equipo abra la boca.

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

**Si algo entra o no al alcance:** este documento y `PLAN-CONSTRUCCION.md`. Si no está resuelto ahí,
lo decide Jhon en el momento, sin reunión.

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
- **La tubería de datos, construida y probada.** ETL validado fila por fila, esquema Postgres con
  auditoría, y el análisis de asociación cruzada. Trabajo de Samuel, ya en el repo. **Ojo: corrió
  sobre la base vieja de 1,56M.** La tubería sirve tal cual, hay que reapuntarla al archivo nuevo
  de 500K y volver a correr el perfilado y los cruces. Los resultados no se heredan.
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
- **El perfilado de la base nueva.** 500K filas con cuatro columnas en código griego. Sin esto no
  se pueden escribir reglas.
- **El diccionario de códigos.** Hay que pedírselo a la organización hoy mismo. Es un mensaje y
  cambia por completo cuánta señal tenemos.
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

**Los 4 contratos que bloquean el trabajo en paralelo** (ver Fase 0 de `PLAN-CONSTRUCCION.md`):
1. Cerebro ↔ perfil: cómo lee y escribe el cerebro el perfil por `id`.
2. Canales ↔ cerebro: cómo cada canal invoca al cerebro con el `id`.
3. `recomendar(perfil)`: qué recibe y qué devuelve, y la forma de `reglas.json`.
4. Handoff: cómo el link de WhatsApp lleva el `id` a la web.

**Sarah:** el flujo conversacional exacto, cómo se ven las tres vistas y las tarjetas, y cómo se
baja a diseño el momento de gemelos interactivo.

**Jhon:** las reglas de familia con su justificación, el flujo del cerebro, y qué familias se
priorizan en el demo.

**Luis:** la caracterización de los códigos griegos por comportamiento y las reglas de propensión.
Nota sobre el hash/rehash del análisis de `EMULADOR_ARQUITECTURA.md`: con un puñado de
conversaciones en un demo, ese cache cuesta depuración y no compra nada que el jurado vea.
Sugerencia de recalcular siempre y dejar el hash documentado como ruta de escalado.

**Samuel:** el scaffold de las 3 vistas, los canales, y si el deploy va a Vercel con Supabase como
Postgres (a verificar que el SSE de la bandeja aguante los límites de función) o a un VPS con Docker.

## Próximo paso

1. Llevar al equipo la separación de reglas contra RAG de la Parte 4. Es la decisión que bloquea
   todo lo demás.
2. Congelar los 4 contratos.
3. Correr el scrape del catálogo.

---

## Otros documentos del proyecto

- **`PLAN-CONSTRUCCION.md`** — las fases, quién hace qué y dónde queda cada salida. Es el que
  responde "¿qué hago ahora?".
- **`UX.md`** — para Sarah. Qué tiene que lograr la pantalla del usuario, el recorrido momento por
  momento, las tres tarjetas interactivas, cómo se muestra el porqué, y la marca.
- **`ANALISIS-PROPENSION.md`** — para Luis. Instrucciones del análisis: restricciones duras, lo que
  ya se sabe para no repetirlo, las hipótesis a validar, y el contrato de `reglas.json`.
- **`CAPA-CUALITATIVA.md`** — el discurso del agente: ICP, dolor, futuro soñado, las 5 preguntas de
  discovery y las 6 objeciones con su desarme. De aquí sale el system prompt.
- `EMULADOR_ARQUITECTURA.md` — esquema de datos y arquitectura del emulador, de Samuel. Vigente
  salvo el punto de quién decide la recomendación, ver Parte 4.
- `PLAN-CONSTRUCCION.md` — plan detallado: componentes, workstreams, decisiones con su
  razonamiento completo.
- `EQUIPO.md` — quién es quién y quién decide qué.
- `PENDIENTES-DIA-1.md` — orden de trabajo del día 1 al 5.
- `GUIA-ANALISIS-DATOS.md` — la guía de DuckDB para procesar la base de 500K.
- `SPEC-SCRAPE-CATALOGO.md` — cómo se arma `catalogo-seguros.json`.
- `DECISION-RETO.md` — por qué elegimos el reto 2. Histórico.
