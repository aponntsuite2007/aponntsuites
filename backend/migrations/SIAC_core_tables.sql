-- ============================================================================
-- MIGRACIÓN CORE: Tablas principales SIAC para Render (sin comandos \echo)
-- ============================================================================

-- ============================================
-- TABLA 1: TAX_TEMPLATES (Plantillas fiscales)
-- ============================================

CREATE TABLE IF NOT EXISTS tax_templates (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL UNIQUE,
    country_name VARCHAR(100) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    invoice_format VARCHAR(50) DEFAULT 'standard',
    requires_cae BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Campos parametrizables por país
    tax_id_field_name VARCHAR(50) DEFAULT 'CUIT',
    tax_id_field_description VARCHAR(200),
    tax_id_format_mask VARCHAR(50),
    tax_id_validation_regex VARCHAR(200),
    tax_id_min_length INTEGER DEFAULT 8,
    tax_id_max_length INTEGER DEFAULT 15,
    tax_id_required_for_invoicing BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar plantilla Argentina
INSERT INTO tax_templates (
    country_code, country_name, currency, invoice_format, requires_cae, is_active,
    tax_id_field_name, tax_id_field_description, tax_id_format_mask,
    tax_id_validation_regex, tax_id_min_length, tax_id_max_length
) VALUES (
    'AR', 'Argentina', 'ARS', 'afip', true, true,
    'CUIT', 'CUIT - Clave Única de Identificación Tributaria', 'XX-XXXXXXXX-X',
    '^\d{2}-\d{8}-\d{1}$', 11, 13
)
ON CONFLICT (country_code) DO NOTHING;

-- ============================================
-- TABLA 2: COMPANY_TAX_CONFIG (Configuración fiscal por empresa)
-- ============================================

CREATE TABLE IF NOT EXISTS company_tax_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tax_template_id INTEGER NOT NULL REFERENCES tax_templates(id),

    -- Configuración AFIP (Argentina)
    afip_cuit VARCHAR(13),
    afip_punto_venta INTEGER,
    afip_certificate_path VARCHAR(255),
    afip_private_key_path VARCHAR(255),
    afip_environment VARCHAR(20) DEFAULT 'testing',

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id)
);

-- ============================================
-- TABLA 3: SIAC_CLIENTES (Clientes del sistema)
-- ============================================

CREATE TABLE IF NOT EXISTS siac_clientes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Identificación
    codigo_cliente VARCHAR(20) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    nombre_fantasia VARCHAR(200),

    -- Documento fiscal
    tipo_documento VARCHAR(20) DEFAULT 'CUIT',
    documento_numero VARCHAR(50),
    documento_formateado VARCHAR(50),
    condicion_iva VARCHAR(50) DEFAULT 'RESPONSABLE_INSCRIPTO',

    -- Contacto
    email VARCHAR(100),
    telefono VARCHAR(50),

    -- Estado
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_alta TIMESTAMP DEFAULT NOW(),
    usuario_alta INTEGER,

    -- Cuenta corriente
    saldo_cta_cte DECIMAL(15,2) DEFAULT 0,
    limite_credito DECIMAL(15,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, codigo_cliente),
    UNIQUE(company_id, documento_numero)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_siac_clientes_company ON siac_clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_estado ON siac_clientes(estado);

-- ============================================
-- TABLA 4: SIAC_CLIENTE_DIRECCIONES
-- ============================================

CREATE TABLE IF NOT EXISTS siac_cliente_direcciones (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id) ON DELETE CASCADE,

    tipo VARCHAR(20) DEFAULT 'FISCAL',
    calle VARCHAR(200),
    numero VARCHAR(20),
    piso VARCHAR(10),
    departamento VARCHAR(10),
    codigo_postal VARCHAR(20),
    localidad VARCHAR(100),
    provincia VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'Argentina',

    es_direccion_principal BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliente_direcciones_cliente ON siac_cliente_direcciones(cliente_id);

-- ============================================
-- TABLA 5: SIAC_CLIENTE_CONTACTOS
-- ============================================

CREATE TABLE IF NOT EXISTS siac_cliente_contactos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id) ON DELETE CASCADE,

    nombre VARCHAR(200),
    cargo VARCHAR(100),
    telefono VARCHAR(50),
    email VARCHAR(100),

    es_contacto_principal BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliente_contactos_cliente ON siac_cliente_contactos(cliente_id);

-- ============================================
-- TABLA 6: MODULOS_CONTRATADOS (Módulos activos por empresa)
-- ============================================

CREATE TABLE IF NOT EXISTS modulos_contratados (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    modulo_codigo VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT true,
    configuracion JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, modulo_codigo)
);

CREATE INDEX IF NOT EXISTS idx_modulos_company ON modulos_contratados(company_id);

-- FIN DE MIGRACION
