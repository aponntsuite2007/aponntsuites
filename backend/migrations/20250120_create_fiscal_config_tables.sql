/**
 * ============================================================================
 * MIGRACIÓN: Configuración Fiscal Multi-Tenant (AFIP)
 * ============================================================================
 *
 * Crea las tablas necesarias para que CADA EMPRESA administre su propia
 * configuración fiscal de AFIP de manera independiente:
 *
 * - Certificados digitales propios
 * - CUIT/CUIL de la empresa
 * - Puntos de venta por sucursal
 * - Domicilios fiscales
 * - Ambiente (testing/producción)
 *
 * IMPORTANTE: NO hay datos hardcodeados. Cada empresa es responsable de
 * cargar y mantener su información fiscal.
 *
 * Created: 2025-01-20
 */

\echo ''
\echo '🏛️ [FISCAL CONFIG] Creando tablas de configuración fiscal multi-tenant...'
\echo ''

-- ============================================
-- TABLA 1: company_fiscal_config
-- Configuración fiscal general de cada empresa
-- ============================================

CREATE TABLE IF NOT EXISTS company_fiscal_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- DATOS FISCALES BÁSICOS
    cuit VARCHAR(13) NOT NULL,                          -- CUIT de la empresa (formato: 20-12345678-9)
    razon_social VARCHAR(255) NOT NULL,                 -- Razón social registrada en AFIP
    condicion_iva VARCHAR(50) NOT NULL,                 -- RI, RM, EX, CF
    inicio_actividades DATE,                            -- Fecha de inicio de actividades

    -- CERTIFICADO DIGITAL AFIP (X.509)
    certificate_pem TEXT,                               -- Certificado público (PEM format)
    private_key_encrypted TEXT,                         -- Clave privada ENCRIPTADA (AES-256)
    certificate_expiration TIMESTAMP,                   -- Fecha de vencimiento del certificado
    certificate_type VARCHAR(20) DEFAULT 'TESTING',     -- TESTING | PRODUCTION

    -- AMBIENTE AFIP
    afip_environment VARCHAR(20) DEFAULT 'TESTING',     -- TESTING | PRODUCTION

    -- TOKEN DE ACCESO (TA) CACHEADO
    cached_token TEXT,                                  -- Token de WSAA (cacheado 12h)
    cached_sign TEXT,                                   -- Sign de WSAA (cacheado 12h)
    token_expiration TIMESTAMP,                         -- Expiración del token

    -- CONFIGURACIÓN ADICIONAL
    configuracion_adicional JSONB DEFAULT '{}',         -- Email contacto, teléfono, etc.

    -- AUDITORÍA
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,

    -- CONSTRAINTS
    CONSTRAINT unique_company_fiscal UNIQUE (company_id),
    CONSTRAINT valid_cuit CHECK (cuit ~ '^\d{2}-\d{8}-\d{1}$'),
    CONSTRAINT valid_condicion_iva CHECK (condicion_iva IN ('RI', 'RM', 'EX', 'CF', 'MONOTRIBUTO'))
);

CREATE INDEX IF NOT EXISTS idx_fiscal_config_company ON company_fiscal_config(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_config_cuit ON company_fiscal_config(cuit);
CREATE INDEX IF NOT EXISTS idx_fiscal_config_active ON company_fiscal_config(is_active);

\echo '   ✅ Tabla company_fiscal_config creada'

-- ============================================
-- TABLA 2: branch_offices_fiscal
-- Configuración fiscal específica por sucursal
-- ============================================

CREATE TABLE IF NOT EXISTS branch_offices_fiscal (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    branch_office_id INTEGER,                           -- ID de sucursal (si existe tabla branches)

    -- IDENTIFICACIÓN
    nombre VARCHAR(255) NOT NULL,                       -- Nombre de la sucursal
    codigo VARCHAR(50),                                 -- Código interno

    -- PUNTO DE VENTA AFIP
    punto_venta INTEGER NOT NULL,                       -- Punto de venta AFIP (1, 2, 3, etc.)
    punto_venta_descripcion VARCHAR(255),               -- Descripción (ej: "Casa Central", "Sucursal Rosario")

    -- DOMICILIO FISCAL
    domicilio_fiscal VARCHAR(500) NOT NULL,
    codigo_postal VARCHAR(10),
    localidad VARCHAR(100),
    provincia VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'Argentina',

    -- TIPOS DE COMPROBANTES HABILITADOS
    comprobantes_habilitados JSONB DEFAULT '[]',        -- Ej: [1, 6, 11] (Fact A, B, C)

    -- ÚLTIMOS NÚMEROS USADOS (cache)
    ultimo_numero_factura_a INTEGER DEFAULT 0,
    ultimo_numero_factura_b INTEGER DEFAULT 0,
    ultimo_numero_factura_c INTEGER DEFAULT 0,
    ultimo_numero_nc_a INTEGER DEFAULT 0,
    ultimo_numero_nc_b INTEGER DEFAULT 0,
    ultimo_numero_nc_c INTEGER DEFAULT 0,
    ultimo_numero_nd_a INTEGER DEFAULT 0,
    ultimo_numero_nd_b INTEGER DEFAULT 0,
    ultimo_numero_nd_c INTEGER DEFAULT 0,

    -- CONFIGURACIÓN ADICIONAL
    configuracion_adicional JSONB DEFAULT '{}',

    -- AUDITORÍA
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINTS
    CONSTRAINT unique_company_punto_venta UNIQUE (company_id, punto_venta),
    CONSTRAINT valid_punto_venta CHECK (punto_venta > 0 AND punto_venta <= 9999)
);

CREATE INDEX IF NOT EXISTS idx_branch_fiscal_company ON branch_offices_fiscal(company_id);
CREATE INDEX IF NOT EXISTS idx_branch_fiscal_punto_venta ON branch_offices_fiscal(company_id, punto_venta);
CREATE INDEX IF NOT EXISTS idx_branch_fiscal_active ON branch_offices_fiscal(is_active);

\echo '   ✅ Tabla branch_offices_fiscal creada'

-- ============================================
-- TABLA 3: afip_cae_log
-- Log de todos los CAE obtenidos de AFIP
-- ============================================

CREATE TABLE IF NOT EXISTS afip_cae_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    factura_id INTEGER REFERENCES siac_facturas(id) ON DELETE SET NULL,

    -- DATOS DEL COMPROBANTE
    punto_venta INTEGER NOT NULL,
    tipo_comprobante INTEGER NOT NULL,
    numero_comprobante BIGINT NOT NULL,

    -- CAE OBTENIDO
    cae VARCHAR(14) NOT NULL,                           -- CAE de 14 dígitos
    cae_vencimiento DATE NOT NULL,                      -- Fecha de vencimiento del CAE

    -- REQUEST Y RESPONSE AFIP
    request_xml TEXT,                                   -- XML enviado a AFIP
    response_xml TEXT,                                  -- XML recibido de AFIP

    -- METADATA
    resultado VARCHAR(1),                               -- A=Aprobado, R=Rechazado
    fecha_proceso DATE,
    observaciones TEXT,
    errores TEXT,

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINTS
    CONSTRAINT unique_cae UNIQUE (cae),
    CONSTRAINT unique_comprobante_cae UNIQUE (company_id, punto_venta, tipo_comprobante, numero_comprobante)
);

CREATE INDEX IF NOT EXISTS idx_cae_log_company ON afip_cae_log(company_id);
CREATE INDEX IF NOT EXISTS idx_cae_log_factura ON afip_cae_log(factura_id);
CREATE INDEX IF NOT EXISTS idx_cae_log_cae ON afip_cae_log(cae);
CREATE INDEX IF NOT EXISTS idx_cae_log_comprobante ON afip_cae_log(company_id, punto_venta, tipo_comprobante, numero_comprobante);

\echo '   ✅ Tabla afip_cae_log creada'

-- ============================================
-- TABLA 4: afip_auth_log
-- Log de autenticaciones WSAA
-- ============================================

CREATE TABLE IF NOT EXISTS afip_auth_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- DATOS DEL TOKEN
    service VARCHAR(50) NOT NULL,                       -- wsfe, wsfex, etc.
    token_hash VARCHAR(64),                             -- Hash del token (SHA256)
    sign_hash VARCHAR(64),                              -- Hash del sign (SHA256)
    generation_time TIMESTAMP NOT NULL,
    expiration_time TIMESTAMP NOT NULL,

    -- REQUEST Y RESPONSE
    tra_xml TEXT,                                       -- TRA enviado
    response_xml TEXT,                                  -- Response de WSAA

    -- METADATA
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    environment VARCHAR(20),                            -- TESTING | PRODUCTION

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_log_company ON afip_auth_log(company_id);
CREATE INDEX IF NOT EXISTS idx_auth_log_service ON afip_auth_log(service);
CREATE INDEX IF NOT EXISTS idx_auth_log_expiration ON afip_auth_log(expiration_time);

\echo '   ✅ Tabla afip_auth_log creada'

-- ============================================
-- FUNCIONES HELPER
-- ============================================

-- Función para obtener configuración fiscal de empresa
CREATE OR REPLACE FUNCTION get_company_fiscal_config(p_company_id INTEGER)
RETURNS TABLE (
    cuit VARCHAR,
    razon_social VARCHAR,
    condicion_iva VARCHAR,
    afip_environment VARCHAR,
    has_valid_certificate BOOLEAN,
    has_valid_token BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cfc.cuit,
        cfc.razon_social,
        cfc.condicion_iva,
        cfc.afip_environment,
        (cfc.certificate_pem IS NOT NULL AND cfc.certificate_expiration > CURRENT_TIMESTAMP) as has_valid_certificate,
        (cfc.cached_token IS NOT NULL AND cfc.token_expiration > CURRENT_TIMESTAMP) as has_valid_token
    FROM company_fiscal_config cfc
    WHERE cfc.company_id = p_company_id
      AND cfc.is_active = true;
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Función get_company_fiscal_config creada'

-- Función para obtener próximo número de comprobante por punto de venta
CREATE OR REPLACE FUNCTION get_next_comprobante_number(
    p_company_id INTEGER,
    p_punto_venta INTEGER,
    p_tipo_comprobante INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER;
    v_column_name VARCHAR;
BEGIN
    -- Determinar qué columna actualizar según tipo de comprobante
    v_column_name := CASE p_tipo_comprobante
        WHEN 1 THEN 'ultimo_numero_factura_a'
        WHEN 6 THEN 'ultimo_numero_factura_b'
        WHEN 11 THEN 'ultimo_numero_factura_c'
        WHEN 3 THEN 'ultimo_numero_nc_a'
        WHEN 8 THEN 'ultimo_numero_nc_b'
        WHEN 13 THEN 'ultimo_numero_nc_c'
        WHEN 2 THEN 'ultimo_numero_nd_a'
        WHEN 7 THEN 'ultimo_numero_nd_b'
        WHEN 12 THEN 'ultimo_numero_nd_c'
        ELSE NULL
    END;

    IF v_column_name IS NULL THEN
        RAISE EXCEPTION 'Tipo de comprobante % no soportado', p_tipo_comprobante;
    END IF;

    -- Obtener y actualizar el próximo número (atomic)
    EXECUTE format('
        UPDATE branch_offices_fiscal
        SET %I = %I + 1
        WHERE company_id = $1 AND punto_venta = $2
        RETURNING %I
    ', v_column_name, v_column_name, v_column_name)
    INTO v_next_number
    USING p_company_id, p_punto_venta;

    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Función get_next_comprobante_number creada'

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_fiscal_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fiscal_config_updated
    BEFORE UPDATE ON company_fiscal_config
    FOR EACH ROW
    EXECUTE FUNCTION update_fiscal_config_timestamp();

\echo '   ✅ Trigger updated_at configurado'

-- ============================================
-- DATOS DE EJEMPLO (SOLO PARA TESTING)
-- ============================================

\echo ''
\echo '📝 [FISCAL CONFIG] NOTA: Las empresas deben cargar su configuración fiscal via UI'
\echo '   No se insertaron datos de ejemplo (seguridad)'
\echo ''

\echo '✅ [FISCAL CONFIG] Migración completada exitosamente'
\echo ''
\echo '📋 Tablas creadas:'
\echo '   1. company_fiscal_config - Configuración fiscal por empresa'
\echo '   2. branch_offices_fiscal - Puntos de venta y domicilios por sucursal'
\echo '   3. afip_cae_log - Log de CAEs obtenidos'
\echo '   4. afip_auth_log - Log de autenticaciones WSAA'
\echo ''
\echo '🔧 Funciones creadas:'
\echo '   - get_company_fiscal_config(company_id)'
\echo '   - get_next_comprobante_number(company_id, punto_venta, tipo_comprobante)'
\echo ''
