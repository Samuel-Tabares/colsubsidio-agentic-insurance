# Análisis de propensión — instrucciones de trabajo

**Para:** Luis, y para el Claude Code que trabaje con él en este frente.
**Entregable:** `reglas.json`, más el documento que justifica cada regla.
**Insumo:** el CSV de ~500.000 afiliados que la organización entregó el 23 de julio.
**Actualizado:** 2026-07-23, tras el cambio de base.

Si eres un agente leyendo esto: lee el documento completo antes de escribir código. Las secciones
2, 3 y 4 contienen restricciones que invalidan varios enfoques que parecen obvios.

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
  exclusiones y condiciones. Ese frente es de Jhon.
- **El LLM conversa y narra.** No decide familia ni producto ni prima.

Concretamente: este análisis **no** produce un modelo que puntúe. Produce un archivo de reglas
legibles que cualquiera puede abrir y discutir.

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
describir su comportamiento, no inventar su etiqueta.

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

### Los tres caminos, en orden

**1. Pedir el diccionario de códigos a la organización.** Gratis, un mensaje, y si lo entregan
vuelve todo lo anterior. **Hacerlo antes de empezar a analizar.** Jhon o quien tenga el canal.

**2. Construir las reglas solo sobre lo legible.** `RANGO_EDAD`, `RANGO_SALARIAL`, `GENERO`,
`CIUDAD_AFILIADO` y las cinco marcas. Alcanza para recomendar y es completamente explicable.
Es el piso garantizado: funciona aunque nunca llegue el diccionario.

**3. Caracterizar cada código por su comportamiento observable, sin afirmar qué significa.**
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

### Una pista tentadora que NO es prueba

Si `SEGMENTO_GRUPO_FAMILIAR` tiene cinco códigos y la base anterior tenía cinco categorías legibles
con tamaños parecidos, es tentador alinearlas por frecuencia. **Se puede explorar, no se puede
afirmar.** Si se usa, va marcado como hipótesis en el documento de lógica, nunca como hecho en la
pantalla del usuario.

---

## 4. Hipótesis de partida, a validar contra los datos

Estas asociaciones entre señal y familia salieron del dominio (Jhon centralizó la operación de una
agencia de seguros de SURA), no de los datos. **Son hipótesis, y el trabajo es confirmarlas,
corregirlas o descartarlas.**

**Vigentes, porque las marcas no se codificaron:**
- `DROGUERIA` = SI → salud y asistencias médicas. Gasto de bolsillo recurrente en salud.
- `HOTELES` o `AGENCIAS` = SI → asistencia médica en viajes.
- `PISCILAGO` = SI → accidentes personales. Vida activa, familia en recreación.
- `VIVIENDA` = SI → hogar, contenido y arrendamiento.
- `RANGO_SALARIAL` → **capacidad de pago.** No define familia, define qué prima tiene sentido
  ofrecer. Es la variable nueva y es la más valiosa que entró.
- `RANGO_EDAD` → modula familia y monto.

**Rotas por la anonimización, se recuperan por conversación:**
- Familia con dependientes → vida y exequial. Ya no se puede leer del dato.
- Independiente sin respaldo de empleador → accidentes y salud. Igual.

Las dos se preguntan en el discovery: *"¿quién depende económicamente de ti hoy?"* y *"si no
pudieras trabajar por un mes, ¿de qué vivirías?"*.

**Efecto secundario que vale la pena notar:** la anonimización sube el peso de la conversación
frente al dato, que es exactamente la arquitectura que ya habíamos elegido. Los datos siguen
definiendo el mapa, solo que ahora el mapa tiene menos etiquetas.

Contexto completo de cada perfil (dolor real, lenguaje, objeciones) en `CAPA-CUALITATIVA.md`.
Ese documento tiene líneas de "señal en la data" que quedaron obsoletas con el cambio; el resto
sigue siendo válido.

---

## 5. Los pasos

**Paso 0. Pedir el diccionario de códigos.** Antes de todo lo demás. Si llega, cambia el alcance.

**Paso 1. Ingesta.** DuckDB, `delim=';'`, `all_varchar=true`. Selección explícita de columnas, sin
`SELECT *`. Verificar el encoding: si el archivo trae BOM, la primera columna se lee como `﻿SERIE`
y todos los accesos por nombre fallan en silencio.

**Paso 2. Perfilado.** Vocabulario exacto de cada columna con conteos, porcentaje de nulos y de
vacíos (`''` no es `NULL`), y columnas de cardinalidad 1. Fijar los strings **exactos** que trae el
archivo: los datos reales traen erratas, y si la regla no escribe el valor tal cual, no matchea.
**Confirmar que la base nueva no viene filtrada**, como sí lo estaba la muestra de 75 de la base
anterior.

**Paso 3. Caracterización de los códigos griegos.** El paso de la sección 3, camino 3. Es lo que
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

Guía técnica de DuckDB paso a paso, con parámetros y anti-patrones: `GUIA-ANALISIS-DATOS.md`.

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
    "nota": "prima mensual maxima sugerida por tramo salarial"
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
4. **Ninguna regla afirma qué significa un código griego.** Buscar en todo el archivo y en la
   documentación cualquier frase que traduzca una letra griega a una etiqueta. No debe haber
   ninguna, salvo que llegue el diccionario oficial.
5. Las reglas corren contra un perfil con la mitad de los campos vacíos sin romperse.
6. Dos perfiles que difieren en una sola variable producen familias o pesos visiblemente distintos.
   Es el momento de gemelos del brief y se prueba desde el análisis, no solo en la interfaz.
7. Ninguna regla usa `PIRAMIDE_NUEVA` y `EMPRESA_FOCO` a la vez, si el paso 7 confirma el solape.

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
