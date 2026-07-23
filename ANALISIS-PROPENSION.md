# Análisis de propensión — instrucciones de trabajo

**Para:** Luis, y para el Claude Code que trabaje con él en este frente.
**Entregable:** `reglas.json`, más el documento que justifica cada regla.
**Insumo:** el CSV limpio de 1,56M afiliados que ya tienes.

Si eres un agente leyendo esto: lee el documento completo antes de escribir código. Las secciones
2 y 3 contienen restricciones que invalidan varios enfoques que parecen obvios.

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
grupos existen. Está bien y puede ser útil. Pero el resultado se lee, se interpreta, y **se escribe
como reglas explícitas a mano**. Si la recomendación final depende de a qué cluster cayó la
persona, la respuesta al jurado es "porque cayó en el cluster 3" y perdemos el gate.

**2.3 PII.** La columna de nombres viene con nombres reales pese a que la documentación oficial dice
que la base está anonimizada. Se descarta en la ingesta y **no entra a ningún artefacto, ningún
repositorio, ni al contexto de ningún LLM.** Trabajar siempre desde `SERIE`.

**2.4 Las reglas tienen que degradar.** Van a correr sobre perfiles incompletos, y sobre gente que
no está en la base. Una regla que evalúa un campo vacío simplemente no dispara. No lanza error, no
asume un valor por defecto, no bloquea. Probar cada regla contra un perfil con la mitad de los
campos en blanco antes de darla por buena.

---

## 3. Lo que ya se sabe (no repetir este trabajo)

Samuel ya corrió un análisis de asociación cruzada con Cramér's V corregido por sesgo, sobre 66
pares de campos. Está en el repo, commit `db48bed`. Resultados que cambian el diseño:

**El consumo casi no correlaciona con el perfil demográfico (V ≤ 0,15).**
Esto NO significa que las marcas no sirvan. Significa que son **señal independiente**: saber la edad
y el segmento familiar de alguien no permite adivinar si compra en droguería. Dos señales
independientes suman evidencia en vez de duplicarla.
Consecuencia para las reglas: **las marcas de consumo y el perfil demográfico deben ser reglas
separadas que suman**, no condiciones combinadas de una sola regla.
Consecuencia para el producto: a un usuario nuevo no se le pueden inferir las marcas, hay que
preguntarle.

**`piramide` y `empresa_asociada` tienen V = 0,84.** Asociación estructural: `empresa_asociada` es
casi una bandera de subconjunto del tramo "1 Grandes". **Usar solo una de las dos.** Usar las dos
como señales separadas es contar la misma evidencia dos veces e inflar el score.

**`ciudad` es el campo más débil (V ≤ 0,06)** y viene vacío en buena parte. No entra a las reglas.
Como mucho sirve para el canal.

**El segmento más grande es "20-35 años sin grupo familiar", con el 33% de la base.** Es la persona
por defecto del demo y coincide con el "soltero sin hijos" del ejemplo del brief.

**Trampa metodológica ya detectada:** tratar "(sin dato)" como una categoría normal infla la
asociación entre campos, porque 13.910 registros vienen vacíos en los cuatro campos socioeconómicos
a la vez. Dos campos parecen relacionados en parte porque se quedan en blanco en las mismas filas.
Al calcular cualquier cruce, **excluir por par las filas que no tengan los dos campos**.

---

## 4. Hipótesis de partida, a validar contra los datos

Estas asociaciones entre señal y familia salieron del dominio (Jhon centralizó la operación de una
agencia de seguros de SURA), no de los datos. **Son hipótesis, y el trabajo es confirmarlas,
corregirlas o descartarlas con las distribuciones reales.**

- `DROGUERIA` = SI → salud y asistencias médicas. Gasto de bolsillo recurrente en salud.
- `HOTELES` o `AGENCIAS` = SI → asistencia médica en viajes.
- `PISCILAGO` = SI → accidentes personales. Vida activa, familia en recreación.
- `VIVIENDA` = SI → hogar, contenido y arrendamiento.
- `SEGMENTO_GRUPO_FAMILIAR` con dependientes → vida y exequial. La señal más fuerte es
  monoparental: un solo ingreso sostiene a todos.
- `PIRAMIDE` = independiente → accidentes y salud. Sin respaldo de empleador, si se detiene él se
  detiene el ingreso.
- `CATEGORIA` es el rango salarial (A, B, C en una caja de compensación). No define familia, define
  **capacidad de pago**: sirve para no recomendarle a alguien una prima que no puede pagar.

Contexto completo de cada perfil (dolor real, lenguaje, objeciones) en `ICP-OTROS/CAPA-CUALITATIVA.md`.

---

## 5. Los pasos

**Paso 1. Ingesta.** DuckDB, `delim=';'`, `all_varchar=true`. Selección explícita de columnas, sin
`SELECT *`, descartando la columna de nombres en este mismo paso.

**Paso 2. Perfilado.** Vocabulario exacto de cada columna categórica con conteos, porcentaje de
nulos y de vacíos (`''` no es `NULL`), y columnas de cardinalidad 1. Fijar los strings **exactos**
en el código: los datos reales traen erratas, y si el dato dice `AFILLIADO` con doble L, la regla
tiene que decir lo mismo o no matchea nada.

**Paso 3. Tamaños de segmento.** Para cada combinación que vaya a ser una regla, el conteo absoluto
y el porcentaje sobre la base. **Siempre reportar el absoluto junto al porcentaje.** Un 80% sobre
50 personas no es un hallazgo.

**Paso 4. Cruces marca contra segmento.** Para cada marca de consumo, cómo se distribuye por
segmento familiar y por pirámide. Esto es lo que le da el número de respaldo a cada regla, la frase
tipo "de cada 100 afiliados con este perfil, N compran en droguería".

**Paso 5. Escribir las reglas.** Con los números del paso 4 en la mano. Cada regla lleva su
justificación y su respaldo numérico. Ver el contrato en la sección 6.

**Paso 6. Probar.** Ver la sección 7.

Guía técnica de DuckDB paso a paso, con los parámetros y los anti-patrones:
`GUIA-ANALISIS-DATOS.md` en esta misma carpeta.

---

## 6. El contrato de salida: `reglas.json`

Esta es la interfaz con el resto del sistema. La función `recomendar(perfil)` lee este archivo, y
el agente narra lo que ella devuelve.

Forma propuesta. Ajustable, pero los campos `razon_dato` y `respaldo` no son negociables porque son
lo que responde el gate del jurado.

```json
{
  "_meta": {
    "generado": "2026-07-23T14:00:00-05:00",
    "fuente": "afiliados_limpio.csv",
    "filas_origen": 1560000,
    "script": "scripts/derivar_reglas.py"
  },
  "familias": ["vida", "salud", "accidentes", "hogar", "viajes", "mascotas", "movilidad"],
  "reglas": [
    {
      "id": "R01",
      "familia": "vida",
      "cuando": { "campo": "segmento_grupo_familiar", "en": ["FAMILIA MONOPARENTAL"] },
      "peso": 3,
      "razon_dato": "eres el único ingreso de un hogar con dependientes",
      "respaldo": {
        "n_segmento": 412000,
        "pct_base": 26.4,
        "nota": "tamaño real del segmento en la base"
      },
      "pregunta_confirmacion": "¿Quién depende económicamente de ti hoy?"
    }
  ],
  "capacidad_pago": {
    "campo": "categoria_ingreso",
    "topes": { "A": 0, "B": 0, "C": 0 },
    "nota": "prima mensual máxima sugerida por categoría"
  },
  "desempate": "mayor peso acumulado; si empatan, gana la familia con el segmento más grande",
  "default": "si ninguna regla dispara, la conversación decide sola con las 5 preguntas"
}
```

**Cómo se combina:** cada regla que dispara suma su peso a su familia. Gana la familia con más peso
acumulado. Las señales independientes suman (ver 3.1), las estructuralmente redundantes no se
duplican (ver el caso pirámide y empresa_asociada).

**`razon_dato` se escribe en segunda persona y en lenguaje de vida real**, porque va directo a la
pantalla del usuario. No "segmento monoparental detectado", sino "eres el único ingreso de un hogar
con dependientes".

**La razón final que ve la persona tiene dos patas:** esta (`razon_dato`, que viene del perfil) más
lo que la persona contó en la conversación. La segunda la arma el agente, no este archivo.

---

## 7. Verificación

1. Para cualquier recomendación se puede señalar la regla exacta de `reglas.json` que la produjo.
   Si la única explicación es "el modelo lo dijo" o "el RAG lo trajo", no pasa.
2. Toda regla tiene su `respaldo` con el tamaño absoluto del segmento.
3. Las reglas corren contra un perfil con la mitad de los campos vacíos sin romperse.
4. Dos perfiles que difieren en una sola variable producen familias o pesos visiblemente distintos.
   Es el momento de gemelos del brief y se prueba desde el análisis, no solo en la interfaz.
5. La columna de nombres no aparece en ningún artefacto, ni en el repositorio, ni en su historial.
6. Ninguna regla usa `ciudad`. Ninguna regla usa `piramide` y `empresa_asociada` a la vez.

---

## 8. Entregable acompañante: la documentación de la lógica

El brief pide como entregable **no negociable**: "lógica documentada que explica por qué se
recomienda un seguro a determinada persona".

Se escribe **mientras se analiza, no al final.** Por cada regla: qué condición evalúa, qué número
real la respalda, cuántas personas caen en ese segmento, y por qué esa señal se asocia a esa
familia de seguro.

Es el documento que el jurado puede pedir. Que se pueda leer sin correr nada.
