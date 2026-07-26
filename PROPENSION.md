# Análisis de propensión — instrucciones de trabajo

**Para:** Luis, y para el Claude Code que trabaje con él en este frente.
**Entregable:** `reglas.json`, más el documento que justifica cada regla.
**Insumo:** la base de ~500.000 afiliados que la organización entregó el 23 de julio
(`Usos_Productos_Afiliados_SIN_ID.xlsx`, sin PII, versionada en git; ver la nota del pipeline en
[CLAUDE.md](CLAUDE.md)).
**Actualizado:** 2026-07-25. Ver "EMPIEZA AQUÍ".

Si eres un agente leyendo esto: lee el documento completo antes de escribir código. Las secciones
2, 3 y 4 contienen restricciones que invalidan varios enfoques que parecen obvios. La guía técnica
paso a paso (DuckDB) está en el **Anexo** al final.

---

## 🔴 EMPIEZA AQUÍ — Actualización 2026-07-24 (Luis + su asistente de IA)

**Si eres el asistente de IA de Luis: antes de escribir una sola línea, PREGÚNTALE su estado
actual.** No repitas trabajo que Samuel o Luis ya hicieron. Preguntas de arranque, obligatorias:

1. ¿Qué versión del dataset tienes cargada: la nueva de ~500K, o todavía la vieja de 1,56M?
2. ¿Qué ya corrió Samuel en `scripts/` y `output/` del repo (ETL, perfilado)? ¿Qué de eso reusamos?
3. ¿Ya existe un `reglas.json`, aunque sea parcial? ¿Un `LOGICA-RECOMENDACION.md` empezado?
4. ¿Dónde está el CSV de afiliados: local, en el repo, o ya en Supabase?
5. ¿Tienes el Excel de ~75 registros de la base vieja? Es el vocabulario para simular (ver abajo).

Con esas respuestas ubicas el estado real y arrancas donde toca, no desde cero.

### Novedad que actualiza la §2.3 y la §7.4: datos simulados AUTORIZADOS

El 2026-07-24, **30X + Colsubsidio autorizaron formalmente alimentar la base con datos simulados**
para la demo. Cita textual: *"Pueden alimentar la base 2 con datos simulados para que tenga mayor
información y puedan trabajar con ella... Por ahora, nos pueden mostrar lo que quieren lograr con
datos simulados o con datos reales de sus integrantes."* El mapeo real solo llega si la propuesta
gana y pasa a producción.

Qué habilita, y qué NO:
- **SÍ:** llenar las columnas anonimizadas con valores legibles plausibles, para que la demo tenga
  profundidad. La intención es **interpretar con los datos dados, no reetiquetar a ciegas.**
- **NO cambia la honestidad:** los valores son **SIMULADOS**, no el diccionario real. En pantalla y
  en los docs se marcan como simulados. Nunca se afirma "LAMBDA = monoparental" como hecho.
- Por eso la §2.3 y la §7.4 se relajan **solo bajo la etiqueta de simulado**: se puede mostrar
  "Familia monoparental (simulado)" en un perfil de demo; sigue prohibido afirmar el mapeo real.

### El método correcto (no muestrear al azar)

Reetiquetado **consistente**, no aleatorio por fila: cada código griego → UN valor simulado fijo
(SIGMA → siempre el mismo). Así preservas las correlaciones reales que ya viven dentro de los
códigos; solo asumes la identidad de la etiqueta, no la estructura. Base para asignar: el
alineamiento por frecuencia que Samuel ya hizo (§3) + la caracterización por comportamiento (§3,
camino 2). **Primero perfila cardinalidades** por columna en ambos datasets: ese conteo decide si
hay biyección limpia o si hay que colapsar.

### ⚠️ Flag de PIRAMIDE_NUEVA

`PIRAMIDE_NUEVA` dice "NUEVA": Colsubsidio casi seguro **cambió el esquema de pirámide** respecto a
la base vieja. Las etiquetas viejas ("2 Medianas", "1 Grandes") pueden **no corresponder** al nuevo
esquema. NO mapees viejo→nuevo en esta columna sin confirmar cardinalidad y lógica. Si no calza,
déjala caracterizada por comportamiento (§3, camino 2) en vez de simular una etiqueta que puede
estar mal. Además, mide su solape con `EMPRESA_FOCO` (§5, paso 7) antes de usar ambas.

### Modelo de IA recomendado para este frente

Análisis de datos + derivación de reglas con restricciones de honestidad = tarea de síntesis, no
mecánica. Usa **Claude en Claude Code** (para ejecutar DuckDB/pandas con tool-use): **Sonnet 5**
para el grueso del perfilado y los cruces; sube a **Opus 4.8** para escribir las reglas finales y el
`LOGICA-RECOMENDACION.md`, donde el criterio pesa. **No uses un modelo sin ejecución de código:**
este frente vive de correr conteos reales, no de estimarlos.

### Herramienta

DuckDB para ingestar y cruzar los ~500K (no cabe cómodo en Excel), pandas para el reetiquetado
categórico. Guía paso a paso con parámetros y anti-patrones: el **Anexo** al final de este doc. La
skill `tabular-data-analysis` es el playbook.

### Dónde encaja tu trabajo: los dos cerebros

El sistema tiene dos cerebros que se unen, pero con roles distintos (esto protege el gate del
jurado):

- **Cerebro lógico (objetivo):** tu `reglas.json` + el RAG del catálogo (de Jhon). Las reglas
  deciden la FAMILIA con justificación citable; el RAG elige el PRODUCTO dentro de ella.
  Determinístico.
- **Cerebro conversacional (contextual):** el LLM. Conversa, COMPLETA el perfil (llena variables que
  el dato no tiene: dependientes, independiente sin respaldo, el dolor real, el futuro soñado) y
  aporta la pata "por lo que me contaste".
- **El merge:** el conversacional ALIMENTA al lógico (le pasa el perfil ya completado con la charla);
  el lógico DECIDE; el conversacional NARRA con las dos patas. La familia NUNCA la decide la
  conversación sola, o vuelve a ser caja negra.

Tu `reglas.json` corre dentro de `recomendar(perfil)`, sobre un perfil que es PARTE dato (Supabase)
+ PARTE conversación. Diseña las reglas para que **degraden** (§2.4): muchas variables llegan vacías
y se llenan en el chat, en runtime. El flujo del cerebro y `match_catalogo` están en
[CEREBRO.md](CEREBRO.md).

### Qué tienes que entregarle a Jhon para montar Supabase

Jhon monta esto en Supabase. Cuando termines, de ti necesita:

1. **`clientes.csv`** — la base de perfiles con columnas legibles + las simuladas, y un **`id` único
   por persona** (para el handoff por id). Es la tabla relacional de clientes, NO vectorial.
2. **`reglas.json`** — el motor de decisión (contrato en §6). Va como archivo en el repo, no a Supabase.
3. **`diccionario-simulado.json`** — qué código griego → qué valor simulado, por columna, **marcado
   como SIMULADO**. Es lo que permite mostrar valores legibles en la demo sin mentir.
4. **`LOGICA-RECOMENDACION.md`** — el entregable no negociable del brief (§8).
5. **El esquema de columnas** (nombre + tipo de cada campo) para crear la tabla.

```
# CAMPOS QUE JHON ESPERA DEL CSV (para la tabla de clientes en Supabase):
#   id                       -> identificador único por persona (para el handoff por id)
#   genero                   -> F | M
#   rango_edad               -> legible ("20 a 35 años")
#   rango_salarial           -> legible ("Entre 1 y 1.5")   [capacidad de pago]
#   ciudad_afiliado          -> legible ("BOGOTA D.C.")
#   hoteles, piscilago, drogueria, agencias, vivienda   -> SI | NO   (marcas de consumo)
#   categoria, segmento_grupo_familiar, segmento_poblacional, piramide_nueva, empresa_foco
#                            -> el código griego MÁS su valor simulado legible (dos columnas por campo:
#                               p.ej. categoria_cod="SIGMA", categoria_sim="Categoría B (simulado)")
# NOTA: las variables de conversación (dependientes, dolor, futuro soñado) NO van en el CSV;
#       las llena el agente en el discovery, en runtime.
```

---

## 0. Aviso: la base cambió el 23 de julio

**No es una corrección del archivo anterior, es un archivo distinto.** Si estás trabajando con la
base de 1,56M, para y cambia de archivo.

Qué cambió:
- **De ~1.560.000 filas a ~500.000.**
- **Se fueron** `NOMBRE_COMPLETO` (el problema de PII quedó resuelto en la fuente) y `ESTADOAFILIADO`.
- **Entró** `RANGO_SALARIAL`, legible y en salarios mínimos. Es una ganancia.
- **Cuatro columnas pasaron a código griego opaco.** Ver la sección 3.

**Todo análisis previo sobre la base vieja hay que rehacerlo.** La tubería de ETL de Samuel sirve
tal cual, solo hay que reapuntarla. Los resultados no se heredan.

Columnas de la base nueva:

`SERIE, GENERO, RANGO_EDAD, RANGO_SALARIAL, CATEGORIA, SEGMENTO_GRUPO_FAMILIAR,
SEGMENTO_POBLACIONAL, PIRAMIDE_NUEVA, EMPRESA_FOCO, CIUDAD_AFILIADO,
HOTELES, PISCILAGO, DROGUERIA, AGENCIAS, VIVIENDA`

---

## 1. Qué se está construyendo y por qué esto importa

El reto es un asesor de seguros conversacional para Colsubsidio. La persona conversa, el sistema le
recomienda un seguro concreto, y **le muestra por qué ese y no otro**.

El jurado va a preguntar textualmente: *"¿por qué a esta persona le mostraste este seguro y no
otro?"*. El brief aclara que si la respuesta es "porque sí" o "aleatorio", el criterio no se
cumple, y que **no se aceptan soluciones tipo caja negra**.

Ese es el gate que este análisis tiene que aprobar. Todo lo demás es secundario.

### La división de responsabilidades (decisión de arquitectura, ya tomada)

- **Las reglas que salen de este análisis deciden la FAMILIA de seguro** (vida, salud, accidentes,
  hogar, viajes, mascotas, movilidad) y producen la justificación en texto.
- **El RAG del catálogo recupera el PRODUCTO concreto** dentro de esa familia, con coberturas,
  exclusiones y condiciones. Ese frente es de Jhon ([CEREBRO.md](CEREBRO.md)).
- **El LLM conversa y narra.** No decide familia ni producto ni prima.

Concretamente: este análisis **no** produce un modelo que puntúe. Produce un archivo de reglas
legibles que cualquiera puede abrir y discutir.

> ⚠️ **Desajuste de familias a resolver:** las familias que declara §6 (`vida, salud, accidentes,
> hogar, viajes, mascotas, movilidad`) no coinciden con las reales del catálogo (`familiares,
> vehiculos, deudores-financieros, mascotas, hogar`). `recomendar()` necesita un mapeo
> necesidad-fina→familia-de-catálogo, o `match_catalogo` no encontrará nada. Ver
> [CEREBRO.md](CEREBRO.md), "Las familias".

---

## 2. Restricciones duras

Violarlas invalida el trabajo, no solo lo empeora.

**2.1 No hay variable objetivo.** La base no tiene ninguna columna que diga si la persona compró un
seguro. La quinta marca de consumo es `VIVIENDA`, que es uso de servicios de vivienda de
Colsubsidio, no compra de póliza. **No se puede entrenar un modelo supervisado de propensión.**
Cualquier "score de propensión" tiene que ser una suma de reglas escritas por nosotros, no algo
aprendido.

**2.2 Nada de clustering decidiendo en runtime.** Se puede correr clustering para *descubrir* qué
grupos existen. Está bien y con la base anonimizada puede ser más útil que antes. Pero el resultado
se lee, se interpreta, y **se escribe como reglas explícitas a mano**. Si la recomendación final
depende de a qué cluster cayó la persona, la respuesta al jurado es "porque cayó en el cluster 3" y
perdemos el gate.

**2.3 Nunca afirmar qué significa un código griego sin evidencia.** Ver la sección 3. Se puede
describir su comportamiento, no inventar su etiqueta. (Excepción autorizada 2026-07-24: se pueden
usar valores SIMULADOS marcados como tales para la demo; ver "EMPIEZA AQUÍ". Sigue prohibido
afirmar el mapeo real como hecho.)

**2.4 Las reglas tienen que degradar.** Van a correr sobre perfiles incompletos, y sobre gente que
no está en la base. Una regla que evalúa un campo vacío simplemente no dispara. No lanza error, no
asume un valor por defecto, no bloquea. Probar cada regla contra un perfil con la mitad de los
campos en blanco antes de darla por buena.

---

## 3. El problema central: cuatro columnas están anonimizadas

Este es el trabajo intelectual de este frente. Todo lo demás es ejecución.

**Legible y usable directamente:**
- `GENERO` (F, M)
- `RANGO_EDAD` ("20 a 35 años", "36 a 45 años")
- `RANGO_SALARIAL` ("Menor al SM", "Entre 1 y 1.5", "Entre 8 y 10") **nueva, y es la mejor variable
  de capacidad de pago que tenemos**
- `CIUDAD_AFILIADO` ("BOGOTA D.C.", "CHIA", "SOACHA") ahora más poblada que antes
- Las cinco marcas de consumo, SI y NO

**Codificado con letras griegas, sin diccionario:**
- `CATEGORIA`: `ZETA`, `SIGMA`, `PI`, `MU`
- `SEGMENTO_GRUPO_FAMILIAR`: `LAMBDA`, `CHI`, `RHO`, `EPSILON`, `THETA`
- `SEGMENTO_POBLACIONAL`: `PI`, `TAU`, `ETA`, `OMEGA`
- `PIRAMIDE_NUEVA`: `DELTA`, `PSI`, `XI`, `UPSILON`, `OMICRON`
- `EMPRESA_FOCO`: seudonimizada como `EMP_000001`

En la base anterior estos campos venían legibles: `FAMILIA MONOPARENTAL`, `2 Medianas`,
`6.2 Independiente`, `A`, `B`, `C`.

### Qué se pierde

Nuestro mapeo decía "familia monoparental sugiere vida, porque un solo ingreso sostiene a todos".
Con `LAMBDA` en vez de la etiqueta, ese razonamiento no se puede escribir. Y era la señal de mayor
peso, porque define el eje del ejemplo de gemelos del brief.

### El diccionario NO va a llegar (confirmado)

Colsubsidio confirmó el 23 de julio que los tokens griegos son **intencionales** y que **no
entregarán el mapeo** token→categoría. Sus palabras: existen "para proteger datos y clasificaciones
internas... sin divulgar la clasificación original". **Es final, no un pendiente.** No lo pidas otra
vez.

**Pero sí dieron el significado conceptual de cada campo**, lo que permite enmarcar en general:
- `CATEGORIA` = categoría dentro del sistema de subsidio familiar (eje de ingreso; coincide con
  `RANGO_SALARIAL`).
- `SEGMENTO_GRUPO_FAMILIAR` = composición del hogar.
- `SEGMENTO_POBLACIONAL` = segmentación por ingreso, edad y PAC.
- `PIRAMIDE_NUEVA` = tier de la empresa aportante.

Así una regla puede decir "por tu segmento de composición familiar" sin saber qué token es cuál.

### Los dos caminos que sí construimos

**1. Reglas sobre lo legible.** `RANGO_EDAD`, `RANGO_SALARIAL`, `GENERO`, `CIUDAD_AFILIADO` y las
cinco marcas. Alcanza para recomendar y es completamente explicable. Es el piso garantizado.

**2. Caracterizar cada código por su comportamiento observable, sin afirmar qué significa.**
Este es el trabajo interesante y el que más valor agrega.

Para cada código de cada columna griega, medir contra los campos legibles:
- distribución de `RANGO_EDAD` y de `RANGO_SALARIAL`
- tasa de cada una de las cinco marcas de consumo
- reparto por `GENERO` y por `CIUDAD_AFILIADO`
- tamaño absoluto y porcentaje sobre la base

Con eso, una regla puede decir: *"perteneces al grupo que más gasto de salud tiene en la base, con
61% de compra en droguería frente al 34% promedio"*. **Eso es explicable, verificable con un
conteo, y honesto**: no afirma que el grupo sea monoparental, describe lo que hace.

Y es defendible ante el jurado justamente porque no inventa la etiqueta. Si preguntan qué es
`LAMBDA`, la respuesta correcta es "no lo sabemos, la base viene anonimizada, y por eso lo
describimos por su comportamiento medido".

### El decode direccional de Samuel (pista, no prueba)

Samuel ya alineó los tokens con las categorías de la base anterior por frecuencia: `LAMBDA` ≈ sin
grupo familiar (57%), `RHO` ≈ monoparental (24%), `EPSILON` ≈ familia nuclear (9%), etc. Está en
[CLAUDE.md](CLAUDE.md), documentado como inferencia direccional. **Es una pista para orientarse, no
un hecho.** Colsubsidio confirmó que el codebook real no llega, así que esto **nunca** se usa para
etiquetar en la pantalla del usuario. Sirve para priorizar qué medir, no para afirmar.

---

## 4. Hipótesis de partida, a validar contra los datos

Estas asociaciones entre señal y familia salieron del dominio (Jhon centralizó la operación de una
agencia de seguros de SURA), no de los datos. **Son hipótesis, y el trabajo es confirmarlas,
corregirlas o descartarlas.**

**Vigentes, porque las marcas no se codificaron:**
- `DROGUERIA` = SI → salud y asistencias médicas. Gasto de bolsillo recurrente en salud (17,65%
  de la base).
- `HOTELES` o `AGENCIAS` = SI → asistencia médica en viajes.
- `VIVIENDA` = SI → hogar, contenido y arrendamiento.
- ⚠️ `PISCILAGO` está **muerta**: 100% NO en toda la base nueva. Era la señal de accidentes;
  esa familia hay que buscarla por edad, ingreso o conversación.
- `RANGO_SALARIAL` → **capacidad de pago.** No define familia, define qué prima tiene sentido
  ofrecer. Es la variable nueva y es la más valiosa que entró. El catálogo de Jhon ya tiene primas
  reales para calibrar contra: piso $12.000/mes (vida, Pan American Life), techo publicado
  $96.600/mes (medicina prepagada mascotas, VetPlus perros). Ver `capacidad_pago` en §6.
- `RANGO_EDAD` → modula familia y monto.

**Rotas por la anonimización, se recuperan por conversación:**
- Familia con dependientes → vida y exequial. Ya no se puede leer del dato.
- Independiente sin respaldo de empleador → accidentes y salud. Igual.

Las dos se preguntan en el discovery: *"¿quién depende económicamente de ti hoy?"* y *"si no
pudieras trabajar por un mes, ¿de qué vivirías?"*.

**Efecto secundario que vale la pena notar:** la anonimización sube el peso de la conversación
frente al dato, que es exactamente la arquitectura que ya habíamos elegido. Los datos siguen
definiendo el mapa, solo que ahora el mapa tiene menos etiquetas.

Contexto completo de cada perfil (dolor real, lenguaje, objeciones) en [CEREBRO.md](CEREBRO.md),
Parte 3 (capa cualitativa). Ese documento tiene líneas de "señal en la data" que quedaron obsoletas
con el cambio; el resto sigue siendo válido.

---

## 5. Los pasos

**Paso 0.** No hay diccionario de códigos y no lo va a haber (Colsubsidio lo confirmó). Se arranca
directo con los campos legibles y la caracterización de los tokens por comportamiento. Nota: gran
parte del ETL y el perfilado ya los corrió Samuel; revisar `scripts/` y `output/` del repo antes
de rehacer nada.

**Paso 1. Ingesta.** DuckDB, `delim=';'`, `all_varchar=true`. Selección explícita de columnas, sin
`SELECT *`. Verificar el encoding: si el archivo trae BOM, la primera columna se lee como `﻿SERIE`
y todos los accesos por nombre fallan en silencio.

**Paso 2. Perfilado.** Vocabulario exacto de cada columna con conteos, porcentaje de nulos y de
vacíos (`''` no es `NULL`), y columnas de cardinalidad 1. Fijar los strings **exactos** que trae el
archivo: los datos reales traen erratas, y si la regla no escribe el valor tal cual, no matchea.
**Confirmar que la base nueva no viene filtrada**, como sí lo estaba la muestra de 75 de la base
anterior.

**Paso 3. Caracterización de los códigos griegos.** El paso de la sección 3, camino 2. Es lo que
convierte cuatro columnas inútiles en cuatro columnas usables.

**Paso 4. Tamaños de segmento.** Para cada combinación que vaya a ser una regla, el conteo absoluto
y el porcentaje sobre la base. **Siempre el absoluto junto al porcentaje.** Un 80% sobre 50
personas no es un hallazgo.

**Paso 5. Cruces marca contra perfil.** Para cada marca de consumo, cómo se distribuye por edad,
por rango salarial y por cada código griego. Esto da el número de respaldo de cada regla.
Al cruzar, **excluir por par las filas que no tengan los dos campos**: tratar el vacío como una
categoría normal infla la asociación entre campos que se quedan en blanco en las mismas filas.
Esa trampa ya se detectó en la base anterior y sigue aplicando.

**Paso 6. Volver a medir si el consumo es señal independiente del perfil.** En la base vieja lo era
(asociación V ≤ 0,15), y de ahí salía que las reglas de marca y las de perfil **suman** en vez de
pisarse. Con 500K filas distintas hay que reconfirmarlo, porque cambia cómo se combinan los pesos.

**Paso 7. Medir el solape entre `PIRAMIDE_NUEVA` y `EMPRESA_FOCO`.** En la base anterior eran casi
la misma cosa (V = 0,84). Si se repite, usar solo una: contar la misma evidencia dos veces infla el
score.

**Paso 8. Escribir las reglas.** Con los números en la mano. Ver el contrato en la sección 6.

**Paso 9. Probar.** Ver la sección 7.

Guía técnica de DuckDB paso a paso, con parámetros y anti-patrones: el **Anexo** al final.

---

## 6. El contrato de salida: `reglas.json`

Esta es la interfaz con el resto del sistema. La función `recomendar(perfil)` lee este archivo, y
el agente narra lo que ella devuelve.

Forma propuesta. Ajustable, pero `razon_dato` y `respaldo` no son negociables porque son lo que
responde el gate del jurado.

```json
{
  "_meta": {
    "generado": "2026-07-23T18:00:00-05:00",
    "fuente": "afiliados_500k.csv",
    "filas_origen": 500000,
    "script": "scripts/derivar_reglas.py",
    "diccionario_codigos": "no entregado por la organizacion"
  },
  "familias": ["vida", "salud", "accidentes", "hogar", "viajes", "mascotas", "movilidad"],
  "reglas": [
    {
      "id": "R01",
      "familia": "salud",
      "cuando": { "campo": "DROGUERIA", "en": ["SI"] },
      "peso": 3,
      "razon_dato": "ya estás pagando salud de tu bolsillo mes a mes",
      "respaldo": {
        "n_segmento": 164000,
        "pct_base": 32.8,
        "nota": "afiliados con compra en drogueria en la base de 500K"
      },
      "pregunta_confirmacion": "Si mañana te toca una urgencia médica, ¿cómo estás cubierto hoy?"
    },
    {
      "id": "R07",
      "familia": "salud",
      "cuando": { "campo": "SEGMENTO_GRUPO_FAMILIAR", "en": ["LAMBDA"] },
      "peso": 2,
      "codigo_opaco": true,
      "razon_dato": "estás en el grupo con más gasto de salud de la base",
      "respaldo": {
        "n_segmento": 98000,
        "pct_base": 19.6,
        "metrica": "61% compra en drogueria, contra 34% del promedio de la base",
        "nota": "no sabemos que significa LAMBDA; se describe por comportamiento medido"
      }
    }
  ],
  "capacidad_pago": {
    "campo": "RANGO_SALARIAL",
    "topes": { "Menor al SM": 0, "Entre 1 y 1.5": 0, "Entre 8 y 10": 0 },
    "piso_catalogo": 12000,
    "techo_catalogo_publicado": 96600,
    "nota": "prima mensual maxima sugerida por tramo salarial. piso_catalogo y techo_catalogo_publicado son el minimo y el maximo de precio_mensual_desde entre los planes del catalogo de Jhon (2026-07-25, 9 de 22 productos con al menos un plan con precio). Ningun tope deberia quedar por debajo de piso_catalogo, ver S7."
  },
  "desempate": "mayor peso acumulado; si empatan, gana la familia con el segmento mas grande",
  "default": "si ninguna regla dispara, la conversacion decide sola con las 5 preguntas"
}
```

**El campo `codigo_opaco`** marca las reglas que se apoyan en una columna anonimizada. Sirve para
dos cosas: revisar rápido cuánto del sistema depende de códigos sin diccionario, y obligar a que
esas reglas traigan siempre una métrica de comportamiento en el `respaldo`.

**Cómo se combina:** cada regla que dispara suma su peso a su familia. Gana la familia con más peso
acumulado. Las señales independientes suman (confirmar en el paso 6), las estructuralmente
redundantes no se duplican (paso 7).

**`razon_dato` se escribe en segunda persona y en lenguaje de vida real**, porque va directo a la
pantalla del usuario. No "segmento LAMBDA detectado", sino "estás en el grupo con más gasto de
salud de la base".

**La razón final que ve la persona tiene dos patas:** esta (`razon_dato`, del perfil) más lo que la
persona contó en la conversación. La segunda la arma el agente, no este archivo.

---

## 7. Verificación

1. Para cualquier recomendación se puede señalar la regla exacta de `reglas.json` que la produjo.
   Si la única explicación es "el modelo lo dijo" o "el RAG lo trajo", no pasa.
2. Toda regla tiene su `respaldo` con el tamaño absoluto del segmento.
3. **Toda regla con `codigo_opaco: true` trae una métrica de comportamiento**, no solo el tamaño.
4. **Ninguna regla afirma qué significa un código griego** como hecho. Buscar en todo el archivo y
   en la documentación cualquier frase que traduzca una letra griega a una etiqueta. No debe haber
   ninguna, salvo que llegue el diccionario oficial, o que el valor esté explícitamente marcado como
   SIMULADO bajo la autorización del 2026-07-24 (ver "EMPIEZA AQUÍ").
5. Las reglas corren contra un perfil con la mitad de los campos vacíos sin romperse.
6. Dos perfiles que difieren en una sola variable producen familias o pesos visiblemente distintos.
   Es el momento de gemelos del brief y se prueba desde el análisis, no solo en la interfaz.
7. Ninguna regla usa `PIRAMIDE_NUEVA` y `EMPRESA_FOCO` a la vez, si el paso 7 confirma el solape.
8. Ningún tope de `capacidad_pago` queda por debajo de `piso_catalogo` ($12.000, ver §6). Si el
   tramo salarial más bajo ("Menor al SM") no alcanza ni para el producto más barato del catálogo,
   ese caso se resuelve con un mensaje honesto ("para tu presupuesto, lo mejor es hablar con un
   asesor sobre opciones"), nunca recomendando un producto que la persona no puede pagar. Es un
   hueco que el jurado puede encontrar preguntando qué le muestran a alguien que gana menos de un
   mínimo.

---

## 8. Entregable acompañante: la documentación de la lógica

El brief pide como entregable **no negociable**: "lógica documentada que explica por qué se
recomienda un seguro a determinada persona".

Se escribe **mientras se analiza, no al final.** Por cada regla: qué condición evalúa, qué número
real la respalda, cuántas personas caen en ese segmento, y por qué esa señal se asocia a esa
familia de seguro.

Y una sección propia sobre los códigos anonimizados: qué se midió de cada uno, qué se puede
afirmar, y qué se decidió no afirmar. Esa honestidad juega a favor, no en contra: demuestra que el
criterio es medido y no inventado, que es exactamente lo que el gate del jurado busca.

Es el documento que el jurado puede pedir. Que se pueda leer sin correr nada.

---

# ANEXO — Guía técnica de DuckDB (base nueva de 500K)

Guía autocontenida para procesar la base y derivar el artefacto. Se rescató de la guía original
(escrita para la base vieja de 1,56M con PII) y se **actualizó a la base nueva**: ya no hay columna
`NOMBRE_COMPLETO` que descartar (la fuente no trae PII), las columnas son las 15 nuevas, y cuatro de
ellas vienen en código griego (ver §3). Herramientas: DuckDB para leer, perfilar y agregar; pandas
solo para el tramo final y para exportar. Todo LOCAL, cualquier portátil moderno la procesa.

## Preparación

```bash
pip install duckdb pandas
python -c "import duckdb, pandas; print('duckdb', duckdb.__version__, '| pandas', pandas.__version__)"
```

Estructura sugerida:

```
scripts/
  01_ingesta.py
  02_perfilado.py
  02b_limpieza.py
  03_analisis.py
  04_artefacto.py
salida/
  artefacto.json         <- va a Git (no contiene PII)
analisis.duckdb          <- base local de trabajo (NO va a Git)
```

Agrega al `.gitignore`: `*.duckdb`. (La base fuente de 500K ya no trae PII y está versionada; el
único artefacto local que no va a Git es la base de trabajo de DuckDB.)

## Paso 1 · Primer contacto, sin abrir el archivo

**Nunca lo abras en Excel.** El límite de Excel es 1.048.576 filas y la base las supera de sobra si
la exportas a CSV.

```bash
ls -lh data/afiliados.csv
wc -l data/afiliados.csv
head -n 3 data/afiliados.csv
```

Qué verificar: que el separador sea `;`, que el encabezado tenga las 15 columnas esperadas, y si el
archivo empieza con caracteres raros antes de `SERIE`, tiene BOM (se resuelve con `encoding` en el
paso 2).

## Paso 2 · Ingesta

`scripts/01_ingesta.py`:
```python
import duckdb

CSV = "data/afiliados.csv"
DB  = "analisis.duckdb"

con = duckdb.connect(DB)

# all_varchar=true: no dejamos que adivine tipos todavía. Primero miramos qué hay.
# Selección explícita de columnas (sin SELECT *): documenta el esquema esperado y
# falla ruidoso si el archivo cambió de forma.
con.execute(f"""
CREATE OR REPLACE TABLE afiliados AS
SELECT SERIE, GENERO, RANGO_EDAD, RANGO_SALARIAL, CATEGORIA, SEGMENTO_GRUPO_FAMILIAR,
       SEGMENTO_POBLACIONAL, PIRAMIDE_NUEVA, EMPRESA_FOCO, CIUDAD_AFILIADO,
       HOTELES, PISCILAGO, DROGUERIA, AGENCIAS, VIVIENDA
FROM read_csv(
    '{CSV}',
    delim = ';',
    header = true,
    all_varchar = true
    -- , encoding = 'utf-8'   # descomenta si hay BOM/encoding raro (utf-8, utf-16, latin-1)
);
""")

total = con.execute("SELECT count(*) FROM afiliados").fetchone()[0]
cols  = [r[0] for r in con.execute("DESCRIBE afiliados").fetchall()]
print(f"Filas cargadas: {total:,}")
print(f"Columnas ({len(cols)}): {cols}")
con.close()
```

## Paso 3 · Perfilado

**Objetivo:** conocer el vocabulario real de cada columna y cuántos nulos/vacíos hay. Nunca asumas
que la documentación del dataset es correcta.

`scripts/02_perfilado.py`:
```python
import duckdb

con = duckdb.connect("analisis.duckdb")
total = con.execute("SELECT count(*) FROM afiliados").fetchone()[0]
cols  = [r[0] for r in con.execute("DESCRIBE afiliados").fetchall()]
print(f"TOTAL DE FILAS: {total:,}\n")

for c in cols:
    distintos = con.execute(f'SELECT count(DISTINCT "{c}") FROM afiliados').fetchone()[0]
    vacios = con.execute(f'''
        SELECT count(*) FROM afiliados
        WHERE "{c}" IS NULL OR trim("{c}") = ''
    ''').fetchone()[0]
    print(f"=== {c} ===")
    print(f"  distintos: {distintos} | vacíos: {vacios:,} ({100*vacios/total:.1f}%)")
    if distintos > 50:
        print("  (alta cardinalidad, probablemente identificador)\n")
        continue
    filas = con.execute(f'''
        SELECT "{c}" AS valor, count(*) AS n
        FROM afiliados
        WHERE "{c}" IS NOT NULL AND trim("{c}") <> ''
        GROUP BY 1 ORDER BY n DESC
    ''').fetchall()
    for valor, n in filas:
        print(f"    {valor!r}: {n:,} ({100*n/total:.1f}%)")
    print()
con.close()
```

Qué revisar: el vocabulario exacto de cada columna (anótalo, las reglas usan los strings tal cual,
erratas incluidas); el % de vacíos (`CIUDAD_AFILIADO` sale alto ~58%); las columnas constantes
(`PISCILAGO` sale 100% NO = muerta); y confirmar que la base nueva **no** viene filtrada como la
muestra de 75 de la base vieja.

## Paso 4 · Limpieza

`scripts/02b_limpieza.py`:
```python
import duckdb

con = duckdb.connect("analisis.duckdb")

# Vista limpia: espacios recortados, cadenas vacías -> NULL.
# NULL y '' son distintos en SQL; mezclarlos causa bugs silenciosos.
con.execute("""
CREATE OR REPLACE VIEW v_afiliados AS
SELECT
    SERIE,
    nullif(trim(GENERO), '')                  AS genero,
    nullif(trim(RANGO_EDAD), '')              AS rango_edad,
    nullif(trim(RANGO_SALARIAL), '')          AS rango_salarial,
    nullif(trim(CATEGORIA), '')               AS categoria,          -- código griego
    nullif(trim(SEGMENTO_GRUPO_FAMILIAR), '') AS segmento_familiar,  -- código griego
    nullif(trim(SEGMENTO_POBLACIONAL), '')    AS segmento_poblacional,-- código griego
    nullif(trim(PIRAMIDE_NUEVA), '')          AS piramide,           -- código griego
    nullif(trim(EMPRESA_FOCO), '')            AS empresa_foco,       -- seudónimo EMP_00000X
    nullif(trim(CIUDAD_AFILIADO), '')         AS ciudad,
    (upper(trim(HOTELES))   = 'SI') AS m_hoteles,
    (upper(trim(PISCILAGO)) = 'SI') AS m_piscilago,
    (upper(trim(DROGUERIA)) = 'SI') AS m_drogueria,
    (upper(trim(AGENCIAS))  = 'SI') AS m_agencias,
    (upper(trim(VIVIENDA))  = 'SI') AS m_vivienda
FROM afiliados;
""")
print(con.execute("SELECT count(*) FROM v_afiliados").fetchone()[0], "filas en la vista limpia")
con.close()
```

Decisiones de limpieza: **no se borran filas con nulos** (un afiliado sin ciudad sigue siendo
válido; borrarlo sesga los tamaños de segmento); **no se "corrigen" erratas** de los datos (se usan
tal cual, corregirlas obliga a mantener la corrección en todos lados); **las marcas se vuelven
booleanos** para poder contarlas y sumarlas. Las cuatro columnas griegas se mantienen como texto:
no se traducen (§2.3).

## Paso 5 · Análisis y cruces

`scripts/03_analisis.py` (los cruces que sustentan el "por qué" ante el jurado):
```python
import duckdb
con = duckdb.connect("analisis.duckdb")

def mostrar(titulo, sql):
    print(f"\n{'='*60}\n{titulo}\n{'='*60}")
    print(con.execute(sql).df().to_string(index=False))

# 1. Tamaño de cada segmento familiar (código griego, la palanca principal)
mostrar("SEGMENTO FAMILIAR (código)", """
SELECT segmento_familiar, count(*) AS afiliados,
       round(100.0*count(*)/sum(count(*)) OVER (), 1) AS pct
FROM v_afiliados GROUP BY 1 ORDER BY afiliados DESC
""")

# 2. Penetración de cada marca de consumo
mostrar("MARCAS DE CONSUMO", """
SELECT 'drogueria' AS marca, sum(m_drogueria::INT) AS si,
       round(100.0*sum(m_drogueria::INT)/count(*),1) AS pct FROM v_afiliados
UNION ALL SELECT 'hoteles',   sum(m_hoteles::INT),   round(100.0*sum(m_hoteles::INT)/count(*),1)   FROM v_afiliados
UNION ALL SELECT 'piscilago', sum(m_piscilago::INT), round(100.0*sum(m_piscilago::INT)/count(*),1) FROM v_afiliados
UNION ALL SELECT 'agencias',  sum(m_agencias::INT),  round(100.0*sum(m_agencias::INT)/count(*),1)  FROM v_afiliados
UNION ALL SELECT 'vivienda',  sum(m_vivienda::INT),  round(100.0*sum(m_vivienda::INT)/count(*),1)  FROM v_afiliados
ORDER BY si DESC
""")

# 3. Caracterización por comportamiento: cada código griego x marcas (§3, camino 2)
mostrar("SEGMENTO FAMILIAR (código) x MARCAS (% que compró cada servicio)", """
SELECT segmento_familiar, count(*) AS n,
       round(100.0*avg(m_drogueria::INT),1) AS pct_drogueria,
       round(100.0*avg(m_vivienda::INT),1)  AS pct_vivienda,
       round(100.0*avg(m_hoteles::INT),1)   AS pct_hoteles,
       round(100.0*avg(m_agencias::INT),1)  AS pct_agencias
FROM v_afiliados GROUP BY 1 ORDER BY n DESC
""")

# 4. Capacidad de pago (variable nueva) x marcas
mostrar("RANGO SALARIAL x DROGUERIA", """
SELECT rango_salarial, count(*) AS n,
       round(100.0*avg(m_drogueria::INT),1) AS pct_drogueria
FROM v_afiliados GROUP BY 1 ORDER BY n DESC
""")

# 5. Solape PIRAMIDE_NUEVA x EMPRESA_FOCO (§5 paso 7)
mostrar("PIRAMIDE (código) x EMPRESA_FOCO", """
SELECT piramide, empresa_foco, count(*) AS n
FROM v_afiliados GROUP BY 1,2 ORDER BY n DESC
""")
con.close()
```

Cómo leer: **reporta siempre el tamaño absoluto junto al porcentaje.** El tipo de frase que debe
salir: *"de los N afiliados en el segmento X, el 62% compra en droguerías, contra 31% del promedio
de la base"*. Guarda estos números: son munición para el pitch y respaldo conversacional del agente
(vía el `respaldo` de cada regla, §6).

## Paso 6 · Verificación final

```bash
grep -i "nombre" salida/reglas.json          # (1) no debe devolver nada (no hay PII)
ls -lh salida/reglas.json                     # (2) pesa poco (KB, no MB)
python -c "import json; d=json.load(open('salida/reglas.json', encoding='utf-8')); print('OK', list(d.keys()))"  # (3) JSON válido
git status --porcelain | grep -E "\.duckdb"   # (4) la base de trabajo NO está en Git
```

Además de la verificación de §7 (explicabilidad, degradación, no traducir tokens).

## Errores comunes

- **Abrir el CSV en Excel.** Trunca en silencio arriba de ~1M filas.
- **Confundir NULL con cadena vacía.** En SQL son distintos; por eso `nullif(trim(col), '')`.
- **Borrar filas con nulos.** Sesga los tamaños de segmento. Se conservan y las reglas manejan la
  ausencia (§2.4).
- **Reportar porcentajes sin el tamaño absoluto.** Un 80% sobre 500 personas no es un hallazgo.
- **Traducir un código griego a una etiqueta como si fuera un hecho.** Prohibido (§2.3), salvo bajo
  la etiqueta explícita de SIMULADO.
- **Tratar el vacío como categoría al cruzar.** Excluir por par las filas sin alguno de los dos
  campos, o inflas la asociación (§5, paso 5).
- **Intentar entrenar un modelo predictivo.** No hay variable objetivo (§2.1). Es reglas, a propósito.
