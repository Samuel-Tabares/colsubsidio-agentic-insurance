# Guía de análisis de la base de afiliados
### Para el encargado de datos · Reto 2 Seguros · Hackathon Colsubsidio x 30X

Documento autocontenido. No necesitas contexto previo del equipo para seguirlo.

---

# PARTE 0 — Pégale esto a tu agente de Claude primero

Copia este bloque completo en tu sesión de Claude Code antes de empezar. Le da el contexto que
necesita para ayudarte sin que le tengas que explicar nada.

```
CONTEXTO DEL PROYECTO

Estoy en la hackathon Colsubsidio x 30X, reto de "venta automatizada de seguros". El objetivo del
producto es llevar a una persona de "no sé qué seguro necesito" a "ya quedé asegurado" sin hablar
con un asesor humano, mediante un asistente conversacional.

MI TAREA: procesar la base de afiliados de Colsubsidio (~1.500.000 filas, CSV separado por punto y
coma) y derivar de ahí un artefacto pequeño en JSON que la aplicación consumirá en tiempo real.

ARQUITECTURA DEL EQUIPO (para que entiendas dónde encaja mi parte):
- Los datos definen el mapa; la conversación ubica a la persona en él.
- Mi análisis NO produce la recomendación final. Produce hipótesis de necesidad por segmento, con
  su tamaño y su justificación.
- La app NUNCA consulta el CSV en tiempo real. Solo consume el JSON derivado que yo genero.
- El LLM del agente nunca inventa primas ni coberturas: las lee del catálogo y de mi artefacto.

RESTRICCIONES QUE YA ESTÁN VERIFICADAS (no las cuestiones, ya se investigaron):

1. PII: la base trae una columna NOMBRE_COMPLETO con nombres reales, aunque la documentación oficial
   afirma que está anonimizada. HAY QUE DESCARTARLA EN LA INGESTA, antes de cualquier análisis.
   Nunca debe entrar a tu contexto ni quedar en ningún archivo de salida.

2. NO HAY VARIABLE OBJETIVO: no existe ninguna columna que diga si el afiliado tiene o compró un
   seguro. La quinta marca de consumo es VIVIENDA, no seguros. Por lo tanto NO se puede entrenar un
   modelo supervisado de propensión. El enfoque es REGLAS DE NECESIDAD informadas por las
   distribuciones reales. Esto es intencional: el jurado califica la explicabilidad.

3. La muestra de 75 filas que circuló NO es representativa (DROGUERIA=SI en todas las filas,
   HOGARES/AGENCIAS/VIVIENDA=NO en todas). Sirvió para conocer el vocabulario de valores, no para
   sacar distribuciones. Hay que recalcular todo sobre el archivo completo.

4. Calidad conocida: CIUDAD_AFILIADO viene vacía en gran proporción, CATEGORIA tiene nulos, y hay un
   typo en los datos: dice "AFILLIADO" con doble L. Las reglas deben degradar con elegancia ante
   campos vacíos, nunca romperse.

COLUMNAS DEL CSV (separador ";"):
SERIE; NOMBRE_COMPLETO; GENERO; RANGO_EDAD; CATEGORIA; SEGMENTO_GRUPO_FAMILIAR;
SEGMENTO_POBLACIONAL; PIRAMIDE_NUEVA; EMPRESA_FOCO; ESTADOAFILIADO; CIUDAD_AFILIADO;
HOTELES; PISCILAGO; DROGUERIA; AGENCIAS; VIVIENDA

DATO CLAVE: PIRAMIDE_NUEVA clasifica a la EMPRESA EMPLEADORA, no a la persona. Sus valores son
"1 Grandes", "2 Medianas", "3 Empresarial Top", "4 Empresarial Estandar", "5 Micro Transaccional",
"6.2 Independiente". El valor "6.2 Independiente" es señal de ruteo de alto valor: sin respaldo de
empleador, mayor necesidad de accidentes personales y salud.

MAPEO DE SEÑALES A FAMILIAS DE PRODUCTO (base del ruteo):
- DROGUERIA=SI                        -> salud, asistencias médicas
- HOTELES=SI y/o AGENCIAS=SI          -> asistencia médica en viajes
- PISCILAGO=SI                        -> accidentes personales
- VIVIENDA=SI                         -> hogar (contenido, arrendamiento)
- SEGMENTO_GRUPO_FAMILIAR con dependientes -> vida, exequial
- PIRAMIDE_NUEVA = "6.2 Independiente"     -> accidentes, salud

HERRAMIENTAS: DuckDB para leer, perfilar y agregar. pandas solo para el último tramo y para exportar.
Todo LOCAL, no cloud: la data pesa ~150-300 MB y cualquier portátil moderno la procesa.

Tengo instalada la skill "tabular-data-analysis" con las buenas prácticas. Úsala.
```

---

# PARTE 1 — La skill

**Ruta en la máquina de Jhon:**
`C:\Users\jhonv\.claude\skills\tabular-data-analysis\SKILL.md`

**Para instalarla en tu máquina:** crea la carpeta `tabular-data-analysis` dentro de tu directorio
de skills de Claude y pega ahí el archivo `SKILL.md`.

- Windows: `C:\Users\TU_USUARIO\.claude\skills\tabular-data-analysis\SKILL.md`
- Mac/Linux: `~/.claude/skills/tabular-data-analysis/SKILL.md`

Contiene: criterio de local contra cloud, ingesta de CSV con separadores y encodings raros,
checklist de perfilado, cómo detectar muestras no aleatorias, manejo de PII, formatos de exportación
y anti-patrones. Está anclada a documentación oficial de DuckDB y pandas, con las fuentes citadas.

---

# PARTE 2 — Preparación

## Paso 0.1 · Instalar

```bash
pip install duckdb pandas
```

Verifica:
```bash
python -c "import duckdb, pandas; print('duckdb', duckdb.__version__, '| pandas', pandas.__version__)"
```

## Paso 0.2 · Estructura de carpetas

```
proyecto/
  data/
    afiliados.csv          <- el archivo original (NO se sube a Git)
  scripts/
    01_ingesta.py
    02_perfilado.py
    03_analisis.py
    04_artefacto.py
  salida/
    artefacto.json         <- esto SÍ va a Git
  analisis.duckdb          <- base local de trabajo (NO va a Git)
```

Agrega al `.gitignore`:
```
data/
*.duckdb
```

> **Por qué:** el CSV trae nombres reales. No puede terminar en un repositorio. El artefacto derivado
> sí, porque no contiene datos personales.

---

# PARTE 3 — Los pasos del análisis

## PASO 1 · Primer contacto, sin abrir el archivo

**Objetivo:** saber qué tienes antes de cargar nada.

**Nunca lo abras en Excel.** El límite de Excel es 1.048.576 filas y la base las supera.

```bash
# Tamaño del archivo
ls -lh data/afiliados.csv

# Cuántas líneas tiene (puede tardar unos segundos)
wc -l data/afiliados.csv

# Las primeras 3 líneas: encabezado + 2 filas
head -n 3 data/afiliados.csv
```

En Windows con PowerShell:
```powershell
Get-Item data\afiliados.csv | Select-Object Length
Get-Content data\afiliados.csv -TotalCount 3
```

**Qué verificar:**
- Que el separador sea efectivamente `;`
- Que el encabezado coincida con las 16 columnas esperadas
- Si el archivo empieza con caracteres raros antes de `SERIE`, tiene BOM (se resuelve en el paso 2)

---

## PASO 2 · Ingesta segura (aquí se descarta la PII)

**Objetivo:** cargar la data a DuckDB **sin la columna de nombres**.

Este es el paso más importante de todos. Si la columna de nombres pasa de aquí, contamina todo lo
que sigue.

`scripts/01_ingesta.py`:
```python
import duckdb

CSV = "data/afiliados.csv"
DB  = "analisis.duckdb"

con = duckdb.connect(DB)

# all_varchar=true: no dejamos que adivine tipos todavía. Primero miramos qué hay.
# EXCLUDE (NOMBRE_COMPLETO): la PII se descarta aquí, no entra a la tabla.
con.execute(f"""
CREATE OR REPLACE TABLE afiliados AS
SELECT * EXCLUDE (NOMBRE_COMPLETO)
FROM read_csv(
    '{CSV}',
    delim = ';',
    header = true,
    all_varchar = true
);
""")

total = con.execute("SELECT count(*) FROM afiliados").fetchone()[0]
cols  = [r[0] for r in con.execute("DESCRIBE afiliados").fetchall()]

print(f"Filas cargadas: {total:,}")
print(f"Columnas: {len(cols)}")
print(cols)

assert "NOMBRE_COMPLETO" not in cols, "FALLO: la columna de PII sigue presente"
print("OK: NOMBRE_COMPLETO no está en la tabla")

con.close()
```

**Si el archivo tiene BOM o encoding raro**, agrega el parámetro de encoding:
```python
    encoding = 'utf-8',   # opciones válidas: utf-8, utf-16, latin-1
```

**Si `EXCLUDE` te da error** (versiones viejas de DuckDB), lista las columnas explícitamente:
```sql
SELECT SERIE, GENERO, RANGO_EDAD, CATEGORIA, SEGMENTO_GRUPO_FAMILIAR,
       SEGMENTO_POBLACIONAL, PIRAMIDE_NUEVA, EMPRESA_FOCO, ESTADOAFILIADO,
       CIUDAD_AFILIADO, HOTELES, PISCILAGO, DROGUERIA, AGENCIAS, VIVIENDA
FROM read_csv(...)
```

✅ **Verificación del paso:** el script imprime el conteo de filas y confirma que `NOMBRE_COMPLETO`
no está. Si el assert falla, no sigas.

---

## PASO 3 · Perfilado

**Objetivo:** conocer el vocabulario real de cada columna y cuántos nulos hay. Nunca asumas que la
documentación del dataset es correcta, porque en este caso ya sabemos que no lo es.

`scripts/02_perfilado.py`:
```python
import duckdb

con = duckdb.connect("analisis.duckdb")

total = con.execute("SELECT count(*) FROM afiliados").fetchone()[0]
cols  = [r[0] for r in con.execute("DESCRIBE afiliados").fetchall()]

print(f"TOTAL DE FILAS: {total:,}\n")

for c in cols:
    # Cardinalidad y vacíos
    distintos = con.execute(f'SELECT count(DISTINCT "{c}") FROM afiliados').fetchone()[0]
    vacios = con.execute(f'''
        SELECT count(*) FROM afiliados
        WHERE "{c}" IS NULL OR trim("{c}") = ''
    ''').fetchone()[0]

    print(f"=== {c} ===")
    print(f"  distintos: {distintos} | vacíos: {vacios:,} ({100*vacios/total:.1f}%)")

    # Si es identificador (casi todos distintos), no listamos valores
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

**Qué revisar en la salida:**

1. **Vocabulario completo de cada columna.** Anótalo. Las reglas tienen que usar los strings
   exactos, incluido el typo `AFILLIADO` con doble L.
2. **Porcentaje de vacíos.** `CIUDAD_AFILIADO` va a salir alto. Eso define qué reglas pueden
   depender de ciudad y cuáles no.
3. **Columnas constantes.** Si una columna tiene un solo valor en 1,5M de filas, no aporta nada
   y se descarta del análisis.
4. **Confirma que la muestra estaba filtrada.** En la muestra de 75, `DROGUERIA` era SI en el 100%.
   Aquí debería salir un porcentaje realista. Si sale 100% otra vez, avisa al equipo, porque
   significaría que la base completa también viene filtrada.

✅ **Verificación del paso:** tienes escrito el vocabulario exacto de las 15 columnas y el % de
vacíos de cada una.

---

## PASO 4 · Limpieza

**Objetivo:** normalizar sin destruir información.

`scripts/02b_limpieza.py`:
```python
import duckdb

con = duckdb.connect("analisis.duckdb")

# Vista limpia: espacios recortados y cadenas vacías convertidas a NULL.
# NULL y '' son cosas distintas en SQL y mezclarlas causa bugs silenciosos.
con.execute("""
CREATE OR REPLACE VIEW v_afiliados AS
SELECT
    SERIE,
    nullif(trim(GENERO), '')                  AS genero,
    nullif(trim(RANGO_EDAD), '')              AS rango_edad,
    nullif(trim(CATEGORIA), '')               AS categoria,
    nullif(trim(SEGMENTO_GRUPO_FAMILIAR), '') AS segmento_familiar,
    nullif(trim(SEGMENTO_POBLACIONAL), '')    AS segmento_poblacional,
    nullif(trim(PIRAMIDE_NUEVA), '')          AS piramide,
    -- EMPRESA_FOCO es bandera: 'X' o vacío. Se vuelve booleano.
    (nullif(trim(EMPRESA_FOCO), '') IS NOT NULL) AS tiene_empresa_foco,
    nullif(trim(ESTADOAFILIADO), '')          AS estado,
    nullif(trim(CIUDAD_AFILIADO), '')         AS ciudad,
    -- Las marcas se vuelven booleanos para poder sumarlas
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

**Decisiones de limpieza y su porqué:**

- **No se borran filas con nulos.** Un afiliado sin ciudad sigue siendo un afiliado válido. Borrarlo
  sesgaría los tamaños de segmento.
- **No se "corrige" el typo AFILLIADO.** Se usa tal cual viene. Corregirlo obligaría a mantener la
  corrección en todos lados; es más seguro coincidir con el dato real.
- **Las marcas se vuelven booleanos** para poder contarlas y sumarlas fácil.
- **`EMPRESA_FOCO` es bandera**, no nombre: vacío significa "no", no "dato faltante".

✅ **Verificación del paso:** `SELECT count(*)` sobre la vista da el mismo número que la tabla. No
se perdió ninguna fila.

---

## PASO 5 · Análisis y cruces

**Objetivo:** medir los segmentos que alimentan las reglas.

`scripts/03_analisis.py`:
```python
import duckdb
con = duckdb.connect("analisis.duckdb")

def mostrar(titulo, sql):
    print(f"\n{'='*60}\n{titulo}\n{'='*60}")
    print(con.execute(sql).df().to_string(index=False))

# 1. Tamaño de cada segmento familiar (la palanca principal)
mostrar("SEGMENTO FAMILIAR", """
SELECT segmento_familiar,
       count(*) AS afiliados,
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

# 3. Cruce clave: segmento familiar x marcas
mostrar("SEGMENTO FAMILIAR x MARCAS (% que compró cada servicio)", """
SELECT segmento_familiar,
       count(*) AS n,
       round(100.0*avg(m_drogueria::INT),1) AS pct_drogueria,
       round(100.0*avg(m_piscilago::INT),1) AS pct_piscilago,
       round(100.0*avg(m_vivienda::INT),1)  AS pct_vivienda,
       round(100.0*avg(m_hoteles::INT),1)   AS pct_hoteles,
       round(100.0*avg(m_agencias::INT),1)  AS pct_agencias
FROM v_afiliados GROUP BY 1 ORDER BY n DESC
""")

# 4. La señal de alto valor: independientes
mostrar("PIRAMIDE (tipo de empresa empleadora)", """
SELECT piramide, count(*) AS n,
       round(100.0*count(*)/sum(count(*)) OVER (),1) AS pct,
       round(100.0*avg(m_drogueria::INT),1) AS pct_drogueria
FROM v_afiliados GROUP BY 1 ORDER BY n DESC
""")

# 5. Cruce edad x familia (para calibrar las reglas de vida/exequial)
mostrar("RANGO EDAD x SEGMENTO FAMILIAR", """
SELECT rango_edad, segmento_familiar, count(*) AS n
FROM v_afiliados GROUP BY 1,2 ORDER BY rango_edad, n DESC
""")

con.close()
```

**Cómo leer los resultados:**

- **Reporta siempre el tamaño absoluto junto al porcentaje.** Un 80% sobre 500 personas no es un
  hallazgo; sobre 300.000 sí.
- Los cruces de la consulta 3 son los que sustentan el "por qué" ante el jurado. Ejemplo del tipo de
  frase que debe salir: *"de los 340.000 afiliados con familia nuclear, el 62% compra en droguerías,
  contra 31% en los afiliados sin grupo familiar"*.
- Guarda estos números. Son munición para el pitch y respaldo conversacional del agente.

✅ **Verificación del paso:** tienes los tamaños de cada segmento y al menos un cruce donde dos
segmentos se comporten claramente distinto.

---

## PASO 6 · Derivar el artefacto

**Objetivo:** producir el JSON pequeño que consume la aplicación.

Este es el entregable. La app **nunca** vuelve a tocar el CSV.

`scripts/04_artefacto.py`:
```python
import duckdb, json
from datetime import datetime

con = duckdb.connect("analisis.duckdb")

# --- 1. Reglas de necesidad: señal -> familias de producto, con su razón ---
# Estas reglas las define el equipo, NO salen solas de los datos.
# Los datos las justifican y las dimensionan.
REGLAS = [
    {
        "id": "salud_por_drogueria",
        "condicion": {"m_drogueria": True},
        "familias": ["salud", "asistencias_medicas"],
        "razon": "Ya tiene gasto recurrente en salud por fuera de la EPS",
        "peso": 3
    },
    {
        "id": "viajes_por_turismo",
        "condicion": {"m_hoteles": True, "m_agencias": True},
        "familias": ["asistencia_viajes"],
        "razon": "Viaja con frecuencia y hoy lo hace sin cobertura médica fuera de su ciudad",
        "peso": 3
    },
    {
        "id": "accidentes_por_independiente",
        "condicion": {"piramide": "6.2 Independiente"},
        "familias": ["accidentes_personales", "salud"],
        "razon": "Trabaja por cuenta propia: si se incapacita, su ingreso se detiene",
        "peso": 4
    },
    {
        "id": "hogar_por_vivienda",
        "condicion": {"m_vivienda": True},
        "familias": ["hogar_contenido", "hogar_arrendamiento"],
        "razon": "Ya usa servicios de vivienda, tiene patrimonio que proteger",
        "peso": 2
    },
    {
        "id": "vida_por_dependientes",
        "condicion": {"segmento_familiar_en": [
            "FAMILIA NUCLEAR INTEGRAL", "FAMILIA MONOPARENTAL",
            "FAMILIA MONOPARENTAL AMPLIADA"
        ]},
        "familias": ["vida", "exequial"],
        "razon": "Hay personas que dependen económicamente de él o ella",
        "peso": 5
    },
    {
        "id": "accidentes_por_recreacion",
        "condicion": {"m_piscilago": True},
        "familias": ["accidentes_personales"],
        "razon": "Vida activa y recreación en familia",
        "peso": 2
    },
]

# --- 2. Agregados de respaldo conversacional ---
# Sirven para que el agente diga cosas verificables:
# "7 de cada 10 afiliados con tu perfil familiar compran en droguerías"
agregados = con.execute("""
SELECT segmento_familiar,
       count(*)                            AS n,
       round(100.0*avg(m_drogueria::INT),1) AS pct_drogueria,
       round(100.0*avg(m_piscilago::INT),1) AS pct_piscilago,
       round(100.0*avg(m_vivienda::INT),1)  AS pct_vivienda,
       round(100.0*avg(m_hoteles::INT),1)   AS pct_hoteles
FROM v_afiliados
WHERE segmento_familiar IS NOT NULL
GROUP BY 1
""").df().to_dict(orient="records")

# --- 3. Tamaño de cada segmento (munición de pitch) ---
tamanos = con.execute("""
SELECT segmento_familiar, piramide, count(*) AS n
FROM v_afiliados
WHERE segmento_familiar IS NOT NULL AND piramide IS NOT NULL
GROUP BY 1,2 HAVING count(*) > 100 ORDER BY n DESC
""").df().to_dict(orient="records")

# --- 4. Perfiles de muestra para el demo (SIN datos personales) ---
perfiles = con.execute("""
SELECT SERIE, genero, rango_edad, categoria, segmento_familiar,
       segmento_poblacional, piramide, ciudad,
       m_hoteles, m_piscilago, m_drogueria, m_agencias, m_vivienda
FROM v_afiliados
WHERE segmento_familiar IS NOT NULL AND piramide IS NOT NULL
USING SAMPLE 40 ROWS
""").df().to_dict(orient="records")

total = con.execute("SELECT count(*) FROM v_afiliados").fetchone()[0]

artefacto = {
    "_meta": {
        "generado": datetime.now().isoformat(timespec="seconds"),
        "fuente": "afiliados.csv",
        "filas_origen": total,
        "script": "scripts/04_artefacto.py",
        "nota": "No contiene datos personales. NOMBRE_COMPLETO se descarta en la ingesta."
    },
    "reglas": REGLAS,
    "agregados_por_segmento": agregados,
    "tamanos_segmento": tamanos,
    "perfiles_demo": perfiles
}

with open("salida/artefacto.json", "w", encoding="utf-8") as f:
    json.dump(artefacto, f, ensure_ascii=False, indent=2, default=str)

print(f"Artefacto generado. Reglas: {len(REGLAS)} | Segmentos: {len(agregados)} | Perfiles demo: {len(perfiles)}")
con.close()
```

**Por qué JSON y no otro formato:**
- Es pequeño, cabe en el repositorio.
- Tiene estructura anidada (un segmento apunta a una lista de productos con su razón).
- **Se ve en el diff de Git**, así que cuando alguien cambia una regla, el equipo puede revisar qué
  cambió. Con Parquet o SQLite eso se pierde.
- Python y JavaScript lo leen sin instalar nada.

✅ **Verificación del paso:** el archivo `salida/artefacto.json` existe, pesa menos de un mega, y
buscar "NOMBRE" dentro de él no arroja nada.

---

## PASO 7 · Verificación final

Antes de entregar, confirma las cuatro cosas:

```bash
# 1. El artefacto no contiene PII
grep -i "nombre" salida/artefacto.json

# 2. Pesa poco (debe ser cientos de KB, no megas)
ls -lh salida/artefacto.json

# 3. Es JSON válido
python -c "import json; d=json.load(open('salida/artefacto.json', encoding='utf-8')); print('OK', list(d.keys()))"

# 4. El CSV y la base local NO están en Git
git status --porcelain | grep -E "afiliados.csv|.duckdb"
```

Los cuatro deben pasar. El 1 y el 4 no deben devolver nada.

---

# PARTE 4 — Errores comunes

- **Abrir el CSV en Excel.** Tope de 1.048.576 filas. No cabe y trunca en silencio.
- **Meter la columna de nombres al análisis o al contexto del agente.** Se descarta en el paso 2 y
  no vuelve a aparecer.
- **Sacar porcentajes de la muestra de 75 filas.** Está filtrada. Todo se recalcula sobre el archivo
  completo.
- **Confundir NULL con cadena vacía.** En SQL son distintos. Por eso el paso de limpieza usa
  `nullif(trim(col), '')`.
- **Borrar filas con nulos.** Sesga los tamaños de segmento. Se conservan y las reglas manejan la
  ausencia.
- **Reportar porcentajes sin el tamaño absoluto.** Un 80% sobre 500 personas no es un hallazgo.
- **Intentar entrenar un modelo predictivo.** No hay variable objetivo. Es reglas, y es a propósito.

---

# PARTE 5 — Qué entregar al equipo

1. `salida/artefacto.json` (va a Git)
2. Los `scripts/` que lo generan (van a Git, hacen el proceso reproducible)
3. Un resumen escrito con: tamaños de los segmentos principales, penetración de cada marca, y dos o
   tres cruces donde segmentos distintos se comporten claramente distinto.

Ese punto 3 es lo que sostiene el "por qué" ante el jurado y alimenta el pitch.
