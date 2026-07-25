# Cómo funciona el cerebro, en lenguaje llano

Este doc explica, sin tecnicismos, cómo el sistema decide qué seguro recomendarle a una persona y
por qué. Sirve para el equipo y para explicarlo al jurado. Al final hay un ejemplo completo.

---

## La analogía: una tienda de seguros con un buen asesor

Imagina una tienda de seguros organizada por **departamentos** (vida, hogar, carro, mascotas...).
Llega una persona que no sabe qué necesita. Un buen asesor haría tres cosas:

1. Con base en datos y en lo que la persona cuenta, decide a **qué departamento** llevarla.
2. Dentro de ese departamento, elige el **producto** que más se ajusta a lo que describió.
3. Le **explica por qué** ese y no otro.

Nuestro sistema hace exactamente eso, pero repartido en piezas. Cada pieza es una de las que
explicamos abajo.

---

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

---

## `reglas.json` (la lista de criterios del asesor)

**Qué es:** un archivo con las reglas de recomendación, escritas a mano. Cada regla dice algo como:
"si la persona compra en droguería, eso apunta a un seguro de salud, con este peso, y esta es la
razón, respaldada por este número de la base".

**Cómo se creó y por qué:** lo construye Luis analizando la base de afiliados. Se escribe a mano, no
es un modelo de inteligencia artificial que aprende solo, y esa es la decisión clave: como son
reglas legibles, **siempre se puede explicar por qué se recomendó algo**. El jurado descalifica las
"cajas negras", así que la explicabilidad es un requisito, no un lujo.

**Cómo se usa:** el sistema lee el archivo, revisa el perfil de la persona contra cada regla, suma
los pesos, y gana la necesidad con más peso. De ahí sale la razón que verá la persona.

---

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

---

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

---

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

---

## Nota técnica (para quien programe)

- `match_catalogo` está en `supabase-schema.sql`. Filtra por `familia` y ordena por similitud de
  coseno sobre el vector `embedding`.
- `recomendar()` es de la Fase 3, aún por construir. Depende de `reglas.json` (Luis) y necesita un
  mapeo `necesidad fina → familia del catálogo` (vida/salud/accidentes/viajes → familiares;
  movilidad → vehiculos; hogar → hogar; mascotas → mascotas).
- Detalle del catálogo y del RAG en `CATALOGO-Y-RAG.md`. Detalle de la propensión en
  `ANALISIS-PROPENSION.md`.
