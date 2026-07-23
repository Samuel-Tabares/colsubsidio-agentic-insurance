-- Modelo de datos para Usos_Productos_Afiliados_SIN_ID.xlsx
-- Generado a partir del análisis de 500,000 registros (ver output/etl_report.txt)

CREATE TYPE genero_enum AS ENUM ('F', 'M');

CREATE TYPE rango_edad_enum AS ENUM (
    'Menor de 19 años',
    '20 a 35 años',
    '36 a 45 años',
    '46 a 55 años',
    'Mayor de 55 años'
);

-- Rango salarial real en SMLV. Reemplaza a la antigua categoria_ingreso_enum (A-D);
-- el dataset anterior no traía cifras de salario, este sí.
CREATE TYPE rango_salarial_enum AS ENUM (
    'Menor al SMLV',
    'Menor a 2 SMLV',
    'Entre 1 y 1.5 SMLV',
    'Entre 1.5 y 2 SMLV',
    'Entre 2 y 2.5 SMLV',
    'Entre 2 y 4 SMLV',
    'Entre 2.5 y 3 SMLV',
    'Entre 3 y 4 SMLV',
    'Entre 4 y 6 SMLV',
    'Entre 4 y 8 SMLV',
    'Entre 6 y 8 SMLV',
    'Entre 8 y 10 SMLV',
    'Entre 8 y 19 SMLV',
    'Entre 10 y 20 SMLV',
    'Entre 20 y 30 SMLV',
    'Mayor a 30 SMLV'
);

-- Tokens opacos sin codebook disponible (decisión de equipo: usarlos tal cual como
-- valores de referencia). Antes traía categoría oficial de ingreso A-D con significado
-- conocido; ese significado ya no está disponible en esta versión del dataset.
CREATE TYPE categoria_enum AS ENUM ('SIGMA', 'PI', 'ZETA', 'MU');

-- Tokens opacos sin codebook disponible. Antes traía el tipo de unidad familiar en texto
-- (p. ej. "FAMILIA MONOPARENTAL"); ese significado ya no está disponible.
CREATE TYPE segmento_grupo_familiar_enum AS ENUM (
    'LAMBDA', 'RHO', 'EPSILON', 'IOTA', 'CHI', 'THETA', 'PI'
);

-- Tokens opacos sin codebook disponible. Antes traía el tier poblacional en texto
-- (p. ej. "Básico", "Joven"); ese significado ya no está disponible.
CREATE TYPE segmento_poblacional_enum AS ENUM ('TAU', 'PI', 'ETA', 'OMEGA', 'XI');

-- Tokens opacos sin codebook disponible. Antes traía el tamaño/tipo de empresa en texto
-- (p. ej. "1 Grandes"); ese significado ya no está disponible.
CREATE TYPE piramide_empresa_enum AS ENUM (
    'ETA', 'XI', 'UPSILON', 'DELTA', 'BETA', 'OMEGA', 'KAPPA', 'LAMBDA', 'OMICRON', 'PSI'
);

-- ID seudonimizado de la empresa afiliadora. Antes era un flag booleano
-- (empresa_asociada = EMPRESA_FOCO == 'X'); ahora el dataset trae IDs reales
-- (solo 2 distintos en todo el extracto: EMP_000001, EMP_000002).
CREATE TYPE empresa_id_enum AS ENUM ('EMP_000001', 'EMP_000002');

CREATE TABLE afiliados_productos (
    serie                        INTEGER PRIMARY KEY,
    genero                       genero_enum,
    rango_edad                   rango_edad_enum,
    rango_salarial               rango_salarial_enum,
    categoria                    categoria_enum,
    segmento_grupo_familiar      segmento_grupo_familiar_enum,
    segmento_poblacional         segmento_poblacional_enum,
    piramide_empresa             piramide_empresa_enum,
    empresa_id                   empresa_id_enum,
    ciudad                       TEXT,
    compra_hoteles               BOOLEAN NOT NULL DEFAULT FALSE,
    compra_piscinas_recreacion   BOOLEAN NOT NULL DEFAULT FALSE,
    compra_drogueria             BOOLEAN NOT NULL DEFAULT FALSE,
    compra_viajes_agencias       BOOLEAN NOT NULL DEFAULT FALSE,
    compra_vivienda              BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_afiliados_ciudad ON afiliados_productos (ciudad);
CREATE INDEX idx_afiliados_rango_salarial ON afiliados_productos (rango_salarial);
