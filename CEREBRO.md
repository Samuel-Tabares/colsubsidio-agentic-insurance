# El cerebro — cómo funciona, el catálogo/RAG y la capa de conversación

El cerebro es la pieza única que atienden los dos canales (WhatsApp simulado y web): agente
conversacional + RAG del catálogo + la función `recomendar(perfil)`. No sabe en qué canal está.

Este documento cubre tres cosas, en orden:
1. **Cómo funciona el cerebro en lenguaje llano** — para el equipo y para explicárselo al jurado.
2. **El catálogo y el RAG** — de dónde sale el dato de productos, cómo se estructura y cómo lo usa el
   agente. Frente de Jhon.
3. **La capa cualitativa** — el ICP, el dolor, las 5 preguntas de discovery y las objeciones. Es de
   donde sale el [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md).

El frente de perfiles y propensión (las reglas que deciden la familia) vive en
[PROPENSION.md](PROPENSION.md).

---

# PARTE 1 — Cómo funciona el cerebro, en lenguaje llano

Esta parte explica, sin tecnicismos, cómo el sistema decide qué seguro recomendarle a una persona y
por qué. Al final hay un ejemplo completo.

## La analogía: una tienda de seguros con un buen asesor

Imagina una tienda de seguros organizada por **departamentos** (vida, hogar, carro, mascotas...).
Llega una persona que no sabe qué necesita. Un buen asesor haría tres cosas:

1. Con base en datos y en lo que la persona cuenta, decide a **qué departamento** llevarla.
2. Dentro de ese departamento, elige el **producto** que más se ajusta a lo que describió.
3. Le **explica por qué** ese y no otro.

Nuestro sistema hace exactamente eso, pero repartido en piezas. Cada pieza es una de las que
explicamos abajo.

## Las familias (los departamentos)

Son los grupos en los que Colsubsidio organiza sus seguros. No los inventamos nosotros: salieron de
la propia web de Colsubsidio. Son cinco:

- familiares (vida, salud, accidentes, viajes, exequial... todo lo que protege a la persona y su hogar)
- hogar (contenido, arrendamiento)
- vehiculos (carro, moto, bici, SOAT)
- mascotas (perro/gato, medicina prepagada, asistencia veterinaria)
- deudores-financieros (vida deudor, desempleo, incendio)

Nota importante para el equipo: la familia "familiares" es amplia. Adentro viven productos que la
lógica de propensión trata como necesidades separadas (vida, salud, accidentes, viajes). Por eso la
función `recomendar()` traduce la necesidad fina ("vida") a la familia del catálogo ("familiares")
antes de buscar. Se coordina con Luis para que las reglas y el catálogo hablen el mismo idioma.

> ⚠️ **Desajuste conocido de familias (pendiente en el motor de reglas):** las familias que
> [PROPENSION.md](PROPENSION.md) declara (`vida, salud, accidentes, hogar, viajes, mascotas,
> movilidad`) no coinciden con las reales del catálogo (`familiares, vehiculos, deudores-financieros,
> mascotas, hogar`). Solo `mascotas` y `hogar` coinciden. Si `recomendar()` devuelve
> `familia: "accidentes"`, `match_catalogo` no encuentra nada con ese filtro. Es un problema del
> mapeo necesidad-fina→familia-de-catálogo, no del agente conversacional. Debe resolverlo el motor de
> reglas.

## `reglas.json` (la lista de criterios del asesor)

**Qué es:** un archivo con las reglas de recomendación, escritas a mano. Cada regla dice algo como:
"si la persona compra en droguería, eso apunta a un seguro de salud, con este peso, y esta es la
razón, respaldada por este número de la base".

**Cómo se creó y por qué:** lo construye Luis analizando la base de afiliados. Se escribe a mano, no
es un modelo de inteligencia artificial que aprende solo, y esa es la decisión clave: como son
reglas legibles, **siempre se puede explicar por qué se recomendó algo**. El jurado descalifica las
"cajas negras", así que la explicabilidad es un requisito, no un lujo. El contrato completo de
`reglas.json` está en [PROPENSION.md](PROPENSION.md), sección "El contrato de salida".

**Cómo se usa:** el sistema lee el archivo, revisa el perfil de la persona contra cada regla, suma
los pesos, y gana la necesidad con más peso. De ahí sale la razón que verá la persona.

## `match_catalogo` (el estante inteligente del departamento)

**Qué es:** una función dentro de la base de datos (Supabase) que busca productos por significado.

**Cómo se creó y por qué:** la escribimos para que la búsqueda de producto ocurra SOLO dentro de la
familia que las reglas ya decidieron. Sin ese candado, la búsqueda por parecido podría traer un
seguro de mascotas cuando la persona necesita vida. El candado por familia es lo que mantiene la
recomendación defendible: "te muestro un seguro de vida porque necesitas proteger a tu familia, y es
el que mejor calza dentro de esa familia", no "porque el computador dijo que se parecía".

**Cómo funciona:** recibe la necesidad de la persona convertida en números (un "embedding"), la
familia en la que buscar, y cuántos resultados quiere. Filtra por esa familia y devuelve los
productos más parecidos a la necesidad.

**Para qué la usa el agente:** después de que las reglas eligen la familia, el agente convierte la
necesidad en números y llama a esta función para traer el producto concreto.

## `recomendar()` (el asesor que coordina todo)

**Qué es:** la función que junta las piezas y produce la recomendación.

**Qué hace, en orden:**
1. Lee `reglas.json` y decide la necesidad/familia, con su razón.
2. Traduce esa necesidad a la familia del catálogo y llama a `match_catalogo` para elegir el
   producto.
3. Arma la respuesta con datos reales del catálogo: producto, coberturas, y la razón con dos patas.

**Las dos patas de la razón:**
- Por tu perfil: lo que dicen los datos (las reglas).
- Por lo que me contaste: lo que la persona dijo en la conversación.

**Quién decide qué (esto es clave):** las reglas deciden la familia, el estante inteligente elige el
producto, y el asistente que conversa (el modelo de lenguaje) solo NARRA el resultado. El asistente
nunca decide la familia ni el producto ni el precio. Así ninguna recomendación es "porque la máquina
lo dijo".

## Ejemplo completo (perfil simulado)

**Ana:** 38 años, ingreso medio, compra en droguería, tiene hijos que dependen de ella. En el chat
dice: "Me preocupa que si me llega a faltar, mis hijos queden sin sostén".

1. Las reglas evalúan: comprar en droguería apunta a salud; tener dependientes apunta con más fuerza
   a vida. Gana **vida**. Razón: "tienes personas que dependen de tu ingreso", respaldada por el
   número de afiliados con dependientes en la base.
2. Se traduce vida a la familia del catálogo "familiares" y se busca ahí.
3. El estante inteligente devuelve **"Seguro de vida"**.
4. Se arma la respuesta con datos reales: cubre respaldo económico ante fallecimiento, incapacidad o
   enfermedad, y auxilio funerario. La prima exacta se consulta con un asesor (el catálogo no la
   publica).
5. El asistente narra: "Ana, por lo que me contaste sobre tus hijos, y porque en tu perfil hay
   personas que dependen de ti, te recomiendo un Seguro de Vida. Cubre el respaldo si llegas a
   faltar, incluido auxilio funerario. Para el valor exacto te conecto con un asesor. ¿Quieres ver
   el detalle?"

En todo esto, el asistente nunca eligió; solo conversó y explicó. La decisión la tomaron las reglas
y el estante inteligente, y por eso se puede defender ante cualquiera.

## Nota técnica (para quien programe)

- `match_catalogo` está en `supabase-schema.sql`. Filtra por `familia` y ordena por similitud de
  coseno sobre el vector `embedding`.
- `recomendar()` es de la Fase 3, aún por construir. Depende de `reglas.json` (Luis) y necesita un
  mapeo `necesidad fina → familia del catálogo` (vida/salud/accidentes/viajes → familiares;
  movilidad → vehiculos; hogar → hogar; mascotas → mascotas). Ver el desajuste de familias arriba.
- Detalle del catálogo y del RAG en la Parte 2. Detalle de la propensión en
  [PROPENSION.md](PROPENSION.md).

---

# PARTE 2 — Catálogo y RAG (de dónde viene el dato de productos)

Esta parte narra el frente del catálogo de punta a punta: de dónde sale el dato, cómo se estructura,
cómo llega a Supabase, y cómo el agente lo usa. Es la referencia para explicarle al jurado "cómo
funciona" y "de dónde vienen los datos" en la parte de productos. Frente de Jhon.

## De dónde viene el dato (procedencia)

El catálogo no venía estructurado: Colsubsidio solo dio la URL. Se construyó a mano desde la web
pública. La cadena completa:

1. **Fuente:** las páginas públicas de producto de `colsubsidio.com/seguros` (22 URLs, en
   `urls.csv`). La raíz es dinámica, así que se scrapean las páginas de producto, no el índice.
2. **Scrape:** `firecrawl_scrape` (MCP) por URL, con `actions: scroll` forzado antes de extraer. La
   sección "Tipos de seguros" (donde viven los planes y el precio) carga lazy en varias páginas del
   sitio; sin scroll, el DOM capturado no la incluye y el extractor no ve algo que sí está en la
   página. Se detectó comparando el markdown con y sin scroll contra `mascotas/medicina-prepagada`
   y se confirmó re-scrapeando las 22 con el fix. Salida en `Scrape-resultado/enrichment_v2.json`.
3. **Consolidación:** `consolidar_catalogo.py` toma el export, deriva `id`/`familia`/`url` desde la
   URL (no se confían al modelo), limpia los "no especificado" a vacío, itemiza coberturas y
   normaliza `planes` (descarta planes cuyo nombre sea texto de botón, ej. "Cotiza"). Produce
   `catalogo-seguros.json` (la fuente de verdad) e `ingest-rows.json` (listo para embeber).
4. **Embeddings + carga:** `ingest_catalogo.py` calcula los vectores (OpenAI text-embedding-3-small,
   1536) y genera `insert_catalogo.sql`, que se pega en Supabase junto a `supabase-schema.sql`.

En una línea: web pública → Firecrawl → `catalogo-seguros.json` → embeddings → tabla `catalogo` en
Supabase.

## Calidad del catálogo y sus caveats (importante para el pitch)

22 productos, 5 familias (familiares 10, hogar 2, deudores-financieros 3, vehiculos 4, mascotas 3).
Lo que hay que saber y poder defender:

- **`aseguradora` (columna) = "Colsubsidio" en las 22, y es correcto.** Es el canal de compra, no el
  underwriter. **El underwriter real SÍ está en el HTML público** y vive dentro de cada plan de
  `planes` (BMI, MetLife, Pan American Life, Chubb, Sura, Allianz, AXA Colpatria, Seguros Bolívar,
  Equidad, Mapfre, GEA, Seguros Mundial, SBS...). La versión anterior de este doc decía que el
  underwriter no era público; era un error, corregido tras re-scrapear las 22 con el fix de scroll.
  El comparador puede comparar aseguradora real, no solo Colsubsidio como marca. (Contexto de la
  decisión de scope en [BRIEF.md](BRIEF.md), Parte 2.C.)
- **El precio vive en `planes`, no hay `precio_desde` a nivel producto.** Una página publica 1 o
  varios planes (uno por aseguradora), y cada uno tiene su propio `precio_mensual_desde` (entero) o
  `null` si no publica cifra. 9 de los 22 productos tienen al menos un plan con precio; el resto no
  publica ninguno, la prima la confirma un asesor. El agente lee `planes` y nombra siempre el plan
  al dar una cifra ("BMI arranca en $20.000"), nunca un número suelto que esconda que otro plan de
  la misma página no publica precio. Regla de arquitectura: el LLM no inventa primas. El piso del
  catálogo es $12.000/mes (vida, Pan American Life) y el techo publicado $96.600/mes (medicina
  prepagada mascotas, VetPlus perros).
- **`exclusiones` casi vacías (1 de 22).** La web no publica la letra menuda. La fuente real son los
  PDF de condiciones, diferidos a una segunda pasada.
- **`coberturas` itemizadas**, tanto a nivel producto como dentro de cada plan. Venían como una
  frase con comas; se parten en items para el comparador.
- **Los "No especificado / N/A" se normalizan a vacío** en la consolidación, para no ensuciar el
  RAG con no-datos.

Estas caveats son honestas y juegan a favor en el gate de confianza: sabemos qué tenemos y qué no.

## Cómo funciona el RAG

**La tabla `catalogo`** (ver `supabase-schema.sql`): metadata (`id`, `familia`, `aseguradora`,
`nombre_producto`, `url`, `planes` jsonb), `page_content` (un bloque XML por producto que incluye
un sub-bloque `<planes>` por cada plan, es lo que se embebe), y `embedding` (vector 1536). RLS
activo: lectura pública, sin escritura desde el cliente; la ingesta entra por la service key.

**La función `match_catalogo(query_embedding, familia_filter, match_count)`:** filtra
`WHERE familia = familia_filter` y dentro de esa familia ordena por similitud de coseno. El filtro
por familia es la pieza clave: el RAG solo elige el producto dentro de una familia que ya decidieron
las reglas, no sobre el catálogo revuelto.

**`recomendar(perfil)`** (frente de Fase 3): las reglas de `reglas.json` deciden la FAMILIA (con
razón citable), `match_catalogo` recupera el PRODUCTO dentro de ella, y el LLM narra. El LLM no
decide familia, producto ni prima. Es el modelo de "dos cerebros" descrito en
[PROPENSION.md](PROPENSION.md).

Sin índice vectorial a propósito: a 22 filas el seq scan es instantáneo. Se agrega HNSW si el
catálogo crece a cientos.

## Archivos del frente

- `urls.csv` — las 22 URLs.
- `Scrape-resultado/enrichment_v2.json` — el scrape crudo vigente (con planes y scroll forzado).
- `consolidar_catalogo.py` — cruda a `catalogo-seguros.json` + `ingest-rows.json`.
- `catalogo-seguros.json` — la fuente de verdad del catálogo.
- `ingest-rows.json` — metadata + page_content, listo para embeber.
- `ingest_catalogo.py` — embeddings + `insert_catalogo.sql`.
- `supabase-schema.sql` — tabla `catalogo`, `match_catalogo`, RLS.

## Reproducir desde cero

1. Scrape cada URL de `urls.csv` con `firecrawl_scrape`, `formats: ["json"]`, y `actions` con dos
   scroll + wait antes de extraer (la sección de planes es lazy-load). Esquema: `nombre_producto`,
   `descripcion_corta`, `a_quien_protege`, `coberturas`, `exclusiones`, `requisitos`, `planes[]`
   (cada plan: `nombre_plan`, `aseguradora`, `precio_mensual_desde` numérico o null, `coberturas`).
   Consolidar en un array `[{url, json: {...}}, ...]` → `Scrape-resultado/enrichment_v2.json`.
2. `python consolidar_catalogo.py Scrape-resultado/enrichment_v2.json`
3. `python ingest_catalogo.py` (necesita `OPENAI_API_KEY`).
4. En Supabase: correr `supabase-schema.sql`, luego `insert_catalogo.sql`.
5. Verificar: `select count(*) from catalogo` = 22; probar `match_catalogo`; confirmar que
   `jsonb_array_length(planes) > 0` en los productos con plan conocido.

---

# PARTE 3 — Capa cualitativa (el cerebro de persuasión del agente)

**Qué es:** el ICP, el dolor, el futuro soñado, las preguntas de discovery y las objeciones por
familia de producto. Es lo que el agente carga para conversar, y la base completa del
[SYSTEM-PROMPT.md](SYSTEM-PROMPT.md).

**Por qué es prioridad:** los datos dicen lo que es probable para un segmento; no dicen lo que
necesita la persona. Sin esta capa tenemos un recomendador estadístico frío, que es exactamente la
"oferta genérica" que el brief descalifica.

**Cómo se usa:** los datos definen el mapa, la conversación ubica a la persona en él. La
recomendación final nace del cruce, y la razón que se muestra tiene dos patas: *"por tu perfil
(dato) + por lo que me contaste (conversación)"*.

> ⚠️ **Las líneas de "Señal en la data" quedaron parcialmente obsoletas** tras el cambio de base del
> 23 de julio (cuatro columnas anonimizadas con códigos griegos, diccionario que no se entrega).
> - **Siguen válidas** las señales de `DROGUERIA`, `HOTELES`, `AGENCIAS` y `VIVIENDA`.
> - **`PISCILAGO` está muerta:** 100% NO en la base nueva. La señal de accidentes de 3.3 ya no sale
>   del dato; se busca por edad, ingreso o conversación.
> - **Se codificaron** `SEGMENTO_GRUPO_FAMILIAR` (vida y exequial, la señal más fuerte) y
>   `PIRAMIDE_NUEVA` (independientes). No se puede leer del dato quién tiene dependientes ni quién es
>   independiente: **hay que preguntarlo**, con las preguntas 1 y 3 del discovery. Sí se puede
>   enmarcar en general ("tu segmento de composición familiar") por el significado conceptual que
>   Colsubsidio sí dio.
> - **Todo lo demás sigue intacto y es el activo más valioso del proyecto:** el ICP, el dolor real,
>   el futuro soñado, las 5 preguntas y las 6 objeciones con su desarme.
>
> Detalle en [PROPENSION.md](PROPENSION.md), sección 3.

## 1. Principios de conversación

1. **Preguntar por la vida, no por el seguro.** Nadie sabe qué póliza necesita. Todo el mundo sabe quién depende de él y qué le quita el sueño.
2. **Un turno, una pregunta.** Nunca dos. (Y mantiene el flujo apto para voz más adelante.)
3. **El producto entra al final, como puente.** Primero el dolor visible, después a dónde quiere llegar, y solo entonces el seguro que conecta ambos.
4. **Cero tecnicismos de póliza.** No "amparo", no "deducible", no "vigencia". Se dice qué pasa en la vida real cuando algo sale mal.
5. **Nunca inventar cifras.** Primas, coberturas y condiciones salen del catálogo, no del modelo.
6. **La gente quiere resolver un dolor, no evitar uno.** El encuadre es "recuperas la tranquilidad", no "te puede pasar una desgracia".

## 2. Las 5 preguntas de discovery

Son las que más mueven la recomendación. Cada una desbloquea una familia distinta, así que con
pocas preguntas se cubre todo el catálogo. Este es también el arranque en frío: el usuario nuevo no
está en la base, así que se ubica solo con esto.

1. **¿Quién depende económicamente de ti hoy?**
Mueve: vida, exequial. Es la pregunta de mayor peso, define el eje de los gemelos.
2. **Si mañana te toca una urgencia médica, ¿cómo estás cubierto hoy?**
Mueve: salud, asistencias médicas.
3. **Si no pudieras trabajar por un mes, ¿de qué vivirías?**
Mueve: accidentes personales, desempleo. Es demoledora con independientes.
4. **La casa donde vives, ¿es propia o arrendada?**
Mueve: hogar contenido, arrendamiento.
5. **¿Sales de tu ciudad con frecuencia?**
Mueve: asistencia médica en viajes.

**Regla de economía:** no preguntar lo que la data ya responde. Si el perfil viene de la base, la
pregunta 1 se confirma en vez de preguntarse desde cero.

> La **regla de pivote** (si la respuesta a la pregunta 1 es "nadie", pasar directo a la 3) nació al
> construir el camino feliz; su formulación exacta está en [SYSTEM-PROMPT.md](SYSTEM-PROMPT.md) y su
> origen en [DEMO.md](DEMO.md).

## 3. Perfiles por familia de producto

### 3.1 Vida y Exequial
**Señal en la data:** `SEGMENTO_GRUPO_FAMILIAR` con dependientes (FAMILIA NUCLEAR INTEGRAL, FAMILIA
MONOPARENTAL, MONOPARENTAL AMPLIADA). Monoparental es la señal más fuerte: un solo ingreso sostiene
a todos. *(Codificada en la base nueva; se recupera por conversación, ver banner arriba.)*

- **ICP:** persona con dependientes económicos, entre 30 y 55, único o principal proveedor.
- **Situación actual:** sabe que "debería" tener algo, nunca ha tenido tiempo ni claridad para hacerlo.
- **Dolor real:** no es el miedo a morir. Es la imagen de su familia teniendo que pedir prestado para el entierro, o sus hijos saliéndose de estudiar.
- **Futuro soñado:** que si él falta, la vida de los suyos siga igual. Que nadie tenga que hacer una vaca.
- **Qué compra en realidad:** continuidad. Que su ausencia no sea también una crisis económica.
- **Lenguaje:** "que tu familia no tenga que resolver plata el peor día de su vida".

### 3.2 Salud y Asistencias médicas
**Señal en la data:** `DROGUERIA` = SI. Es gasto de bolsillo recurrente en salud, ya está pagando.

- **ICP:** persona o familia que ya gasta en salud por fuera de la EPS, y lo nota.
- **Situación actual:** tiene EPS, pero espera semanas por una cita y termina pagando particular.
- **Dolor real:** la fila, la demora, el especialista que no aparece, y la plata que se va en consultas y medicamentos sin que nadie la sume.
- **Futuro soñado:** llamar y que lo atiendan rápido, sin pelear y sin sorpresas de costo.
- **Qué compra en realidad:** acceso y velocidad. No compra "cobertura", compra que le contesten.
- **Lenguaje:** "cita con especialista sin esperar meses".

### 3.3 Accidentes personales
**Señal en la data:** ~~`PISCILAGO` = SI~~ (muerta en la base nueva) y sobre todo `PIRAMIDE_NUEVA` =
'6.2 Independiente' *(codificada; se recupera por conversación)*.

- **ICP:** independiente o informal, cuyo ingreso se detiene si él se detiene. También familias activas con hijos.
- **Situación actual:** vive del día a día productivo, sin respaldo de empleador.
- **Dolor real:** no es el accidente. Es que un yeso de seis semanas significa seis semanas sin ingreso, y las cuentas no se detienen.
- **Futuro soñado:** poder recuperarse sin que el negocio o la casa se caigan mientras tanto.
- **Qué compra en realidad:** que su ingreso no dependa de que su cuerpo esté intacto.
- **Lenguaje:** "si te incapacitas, sigue entrando plata".

> **Nota de ruteo de alto valor:** un independiente y un empleado de empresa grande con el mismo
> perfil familiar tienen necesidades distintas, porque uno tiene respaldo institucional y el otro
> no. `PIRAMIDE_NUEVA` clasifica a la empresa empleadora, no a la persona, y por eso es un "por qué"
> muy defendible ante el jurado.

### 3.4 Hogar (contenido y arrendamiento)
**Señal en la data:** `VIVIENDA` = SI (ya consume servicios de vivienda de Colsubsidio).

- **ICP:** dos perfiles opuestos. El propietario que quiere proteger lo que le costó años, y el arrendador que quiere cobrar sin sustos.
- **Situación actual:** asegura el carro pero no la casa, que vale mucho más.
- **Dolor real:** propietario, que un robo o un incendio borre en una noche diez años de esfuerzo. Arrendador, el inquilino que deja de pagar y encima entrega el inmueble dañado.
- **Futuro soñado:** dormir sin pensar en eso.
- **Qué compra en realidad:** que el patrimonio no dependa de la suerte ni de la buena fe ajena.
- **Lenguaje:** "aseguras el carro, ¿y lo que hay dentro de tu casa?".

### 3.5 Asistencia médica en viajes
**Señal en la data:** `HOTELES` = SI y/o `AGENCIAS` = SI. Compra viajes, ya es viajero.

- **ICP:** viajero frecuente por turismo o trabajo, solo o en familia.
- **Situación actual:** viaja y asume que no va a pasar nada.
- **Dolor real:** enfermarse lejos de casa, sin saber a quién llamar, en un sistema que no conoce y donde su EPS no lo cubre.
- **Futuro soñado:** viajar tranquilo, sabiendo que si algo pasa hay un número que responde.
- **Qué compra en realidad:** que el viaje siga siendo un viaje y no se vuelva una emergencia.
- **Lenguaje:** "si te enfermas allá, alguien responde en español, 24/7".

## 4. Objeciones y cómo desarmarlas

El desarme nunca es presión. Es reencuadre: cambiar la comparación que la persona está haciendo.
La versión operativa (estructura 3A: Acknowledge, Associate, Ask) está en
[SYSTEM-PROMPT.md](SYSTEM-PROMPT.md); acá va el contenido original por objeción.

### "Está caro / no me alcanza"
La comparación equivocada es prima contra cero. La correcta es prima contra el costo del evento.
> "Entiendo. ¿Con qué lo estás comparando? Porque lo que cuesta al mes suele ser menos que lo que ya
> estás pagando en consultas particulares. La pregunta no es si cuesta, es qué pasa el día que toca
> pagar todo de una."

### "Ya tengo EPS"
No competir con la EPS. Delimitar dónde termina.
> "Y la EPS te cubre lo grave, eso está bien. Esto no la reemplaza. Cubre la parte donde la EPS se
> demora: la cita con el especialista, el examen que sale para dentro de dos meses."

### "Lo pienso y te aviso"
No presionar con falsa urgencia. La urgencia viene del costo actual, no de una promoción.
> "Claro. Solo ten en cuenta una cosa: esto se contrata cuando no lo necesitas. El día que lo
> necesitas ya no se puede. ¿Te dejo el resumen para que lo mires con calma?"

### "No confío, letra menuda"
Objeción legítima. Se responde con transparencia, no con promesas.
> "Con razón, es lo más común. Por eso te muestro desde ya qué NO cubre, antes de que decidas."
Se desarma mostrando exclusiones **antes** de que las pidan. Es una decisión de producto: la
pantalla de comparación muestra exclusiones al mismo nivel que coberturas.

### "Prefiero hablar con una persona"
Nunca pelear con esto. Es la ruta de escalamiento y además está bien tenerla.
> "Claro, te conecto. Solo para que no te repitan las preguntas, ¿te llevo lo que ya definimos?"

### "No me va a pasar a mí"
Sacar el foco de él y ponerlo en quien depende de él.
> "Ojalá que no. Pero la pregunta no es qué te pasa a ti, es qué les pasa a ellos si algo te pasa."

## 5. Lo que el agente NO debe hacer

- Prometer coberturas o primas que no estén en el catálogo estructurado.
- Usar miedo como palanca. El encuadre es recuperar tranquilidad, no anticipar tragedias.
- Recomendar más de un producto a la vez como paquete. Una necesidad, una recomendación, y después
  se amplía si el usuario quiere.
- Insistir después de un "no". Ofrecer el resumen y cerrar bien.
- Ocultar exclusiones. Se muestran de entrada, es lo que construye la confianza que el brief exige.

## 6. Pendiente de validar

- Ajustar los perfiles cuando llegue el catálogo estructurado (nombres reales de producto y coberturas).
- Confirmar los tamaños de segmento con el archivo completo, para saber cuál familia priorizar en el demo.
- Probar las 5 preguntas con alguien ajeno al equipo y ver si alguna sobra o falta.
