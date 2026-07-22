-- Modelo de datos para Usos_Productos_Afiliados_SIN_ID.csv
-- Generado a partir del análisis de 1,566,028 registros (ver output/etl_report.txt)

CREATE TYPE genero_enum AS ENUM ('F', 'M');

CREATE TYPE rango_edad_enum AS ENUM (
    'Menor de 19 años',
    '20 a 35 años',
    '36 a 45 años',
    '46 a 55 años',
    'Mayor de 55 años'
);

-- Categoría oficial de Caja de Compensación Familiar por SMLMV del afiliado.
-- Es el proxy de ingresos disponible en la fuente; el CSV no trae cifras de salario.
CREATE TYPE categoria_ingreso_enum AS ENUM ('A', 'B', 'C', 'D');

CREATE TYPE segmento_grupo_familiar_enum AS ENUM (
    'AFILIADO SIN GRUPO FAMILIAR',
    'FAMILIA MONOPARENTAL',
    'FAMILIA MONOPARENTAL AMPLIADA',
    'FAMILIA NUCLEAR AMPLIADA',
    'FAMILIA NUCLEAR INTEGRAL',
    'PAREJA CONYUGAL'
);

CREATE TYPE segmento_poblacional_enum AS ENUM ('Alto', 'Básico', 'Joven', 'Medio');

-- Tamaño/tipo de la empresa afiliadora (o régimen del afiliado en 6.x)
CREATE TYPE piramide_empresa_enum AS ENUM (
    '1 Grandes',
    '2 Medianas',
    '3 Empresarial Top',
    '4 Empresarial Estandar',
    '5 Micro Transaccional',
    '5 Micro Transaccional Colsubsidio',
    '6.1 Facultativo',
    '6.2 Independiente',
    '6.3 Pensionado'
);

CREATE TABLE afiliados_productos (
    serie                        INTEGER PRIMARY KEY,
    nombre_completo              TEXT,
    genero                       genero_enum,
    rango_edad                   rango_edad_enum,
    categoria_ingreso            categoria_ingreso_enum,
    segmento_grupo_familiar      segmento_grupo_familiar_enum,
    segmento_poblacional         segmento_poblacional_enum,
    piramide_empresa             piramide_empresa_enum,
    empresa_asociada             BOOLEAN NOT NULL DEFAULT FALSE,
    afiliado_al_dia              BOOLEAN NOT NULL DEFAULT FALSE,
    ciudad                       TEXT,
    compra_hoteles               BOOLEAN NOT NULL DEFAULT FALSE,
    compra_piscinas_recreacion   BOOLEAN NOT NULL DEFAULT FALSE,
    compra_drogueria             BOOLEAN NOT NULL DEFAULT FALSE,
    compra_viajes_agencias       BOOLEAN NOT NULL DEFAULT FALSE,
    compra_vivienda              BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_afiliados_ciudad ON afiliados_productos (ciudad);
CREATE INDEX idx_afiliados_categoria ON afiliados_productos (categoria_ingreso);
