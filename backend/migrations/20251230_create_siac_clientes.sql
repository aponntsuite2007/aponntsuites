-- ============================================================================
-- MIGRACIÓN: Crear tabla siac_clientes
-- Módulo: SIAC Commercial - Gestión de Clientes
-- Fecha: 2025-12-30
-- Descripción: Migración del módulo Clientes desde sistema Delphi 7 legacy
-- ============================================================================

-- Crear tabla principal de clientes SIAC
CREATE TABLE IF NOT EXISTS siac_clientes (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Identificación
    codigo VARCHAR(20) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,

    -- Ubicación/Contacto
    domicilio VARCHAR(300),
    ciudad VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'Argentina',
    provincia VARCHAR(100),
    codigo_postal VARCHAR(20),
    zona VARCHAR(50),
    telefono VARCHAR(50),
    email VARCHAR(150),
    gps VARCHAR(100),
    whatsapp VARCHAR(50),

    -- Cuenta Corriente / Crédito
    habilita_cta_cte BOOLEAN DEFAULT false,
    monto_max_credito DECIMAL(15, 2) DEFAULT 0,
    monto_cta_cte DECIMAL(15, 2) DEFAULT 0,
    plazo_cta_cte INTEGER DEFAULT 0,

    -- Descuentos y Recargos
    descuento DECIMAL(5, 2) DEFAULT 0,
    recargo DECIMAL(5, 2) DEFAULT 0,
    dtos_liberados BOOLEAN DEFAULT false,

    -- Facturación
    bloquea_facturacion BOOLEAN DEFAULT false,
    inicia_fc_en VARCHAR(20) DEFAULT 'CONTADO',
    tipo_factura CHAR(1) DEFAULT 'B',
    lista_precios VARCHAR(50),

    -- Clasificación
    tipo_cliente VARCHAR(50),
    rubro VARCHAR(50),
    nombre_rubro VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'Activo',

    -- Multi-tenant
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,

    -- Auditoría
    fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),

    -- Constraints
    CONSTRAINT siac_clientes_codigo_unique UNIQUE (company_id, codigo),
    CONSTRAINT siac_clientes_tipo_factura_check CHECK (tipo_factura IN ('A', 'B', 'C', 'S')),
    CONSTRAINT siac_clientes_estado_check CHECK (estado IN ('Activo', 'Bloqueado', 'Inactivo')),
    CONSTRAINT siac_clientes_inicia_fc_check CHECK (inicia_fc_en IN ('CONTADO', 'CTA.CTE.'))
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_siac_clientes_company ON siac_clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_codigo ON siac_clientes(codigo);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_razon_social ON siac_clientes(razon_social);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_estado ON siac_clientes(estado);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_zona ON siac_clientes(zona);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_tipo_cliente ON siac_clientes(tipo_cliente);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_cta_cte ON siac_clientes(habilita_cta_cte);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_siac_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_siac_clientes_updated_at ON siac_clientes;
CREATE TRIGGER trigger_siac_clientes_updated_at
    BEFORE UPDATE ON siac_clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_siac_clientes_updated_at();

-- Tabla auxiliar para zonas (catálogo)
CREATE TABLE IF NOT EXISTS siac_zonas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT siac_zonas_unique UNIQUE (company_id, nombre)
);

-- Tabla auxiliar para rubros (catálogo)
CREATE TABLE IF NOT EXISTS siac_rubros (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT siac_rubros_unique UNIQUE (company_id, codigo)
);

-- Tabla auxiliar para tipos de cliente (catálogo)
CREATE TABLE IF NOT EXISTS siac_tipos_cliente (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT siac_tipos_cliente_unique UNIQUE (company_id, nombre)
);

-- Tabla auxiliar para listas de precios (catálogo)
CREATE TABLE IF NOT EXISTS siac_listas_precios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    porcentaje_ajuste DECIMAL(5, 2) DEFAULT 0,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT siac_listas_precios_unique UNIQUE (company_id, nombre)
);

-- Insertar datos iniciales de ejemplo para catálogos (solo si no existen)
-- Estos se insertarán por empresa cuando se active el módulo

-- Comentarios de documentación
COMMENT ON TABLE siac_clientes IS 'Tabla principal de clientes del módulo SIAC Commercial';
COMMENT ON COLUMN siac_clientes.codigo IS 'Código único del cliente dentro de la empresa';
COMMENT ON COLUMN siac_clientes.tipo_factura IS 'Tipo de factura: A=Resp.Inscripto, B=Consumidor Final, C=Monotributo, S=Sin factura';
COMMENT ON COLUMN siac_clientes.habilita_cta_cte IS 'Indica si el cliente tiene habilitada cuenta corriente';
COMMENT ON COLUMN siac_clientes.monto_cta_cte IS 'Saldo actual de la cuenta corriente del cliente';
COMMENT ON COLUMN siac_clientes.inicia_fc_en IS 'Modo de inicio de factura: CONTADO o CTA.CTE.';

-- Log de migración
DO $$
BEGIN
    RAISE NOTICE '✅ Migración siac_clientes completada exitosamente';
    RAISE NOTICE '   - Tabla siac_clientes creada';
    RAISE NOTICE '   - Tablas de catálogos creadas (zonas, rubros, tipos_cliente, listas_precios)';
    RAISE NOTICE '   - Índices y triggers configurados';
END $$;
