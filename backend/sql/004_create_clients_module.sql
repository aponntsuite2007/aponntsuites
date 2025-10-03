-- ============================================================================
-- MÓDULO CLIENTES SIAC - SISTEMA ESCALABLE COMPLETO
-- Fecha: 24 Septiembre 2025 - 02:47 AM
-- Arquitectura: Modular escalable con detección automática de módulos
-- ============================================================================

-- ============================================================================
-- 1. CLIENTES PRINCIPALES (Tabla principal del módulo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS siac_clientes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- ========================================
    -- IDENTIFICACIÓN Y DATOS PRINCIPALES
    -- ========================================
    codigo_cliente VARCHAR(20) NOT NULL,              -- Código único por empresa
    razon_social VARCHAR(255) NOT NULL,               -- Razón social completa
    nombre_fantasia VARCHAR(255),                     -- Nombre comercial
    tipo_cliente VARCHAR(20) DEFAULT 'PERSONA_FISICA', -- PERSONA_FISICA, PERSONA_JURIDICA

    -- ========================================
    -- DOCUMENTACIÓN TRIBUTARIA
    -- ========================================
    documento_tipo VARCHAR(20) DEFAULT 'CUIT',        -- CUIT, DNI, CUIL, RUT, CNPJ
    documento_numero VARCHAR(20) NOT NULL,            -- Número sin guiones
    documento_formateado VARCHAR(30),                 -- Formato con guiones (XX-XXXXXXXX-X)

    -- Integración automática con Tax Templates
    tax_template_id INTEGER REFERENCES tax_templates(id), -- Detecta país automáticamente
    condicion_impositiva_id INTEGER REFERENCES tax_conditions(id), -- RI, RM, EX, etc.

    -- ========================================
    -- CONTACTO Y UBICACIÓN
    -- ========================================
    email VARCHAR(255),
    telefono VARCHAR(50),
    celular VARCHAR(50),
    whatsapp VARCHAR(50),
    website VARCHAR(255),

    -- Domicilio Legal
    domicilio_calle VARCHAR(255),
    domicilio_numero VARCHAR(20),
    domicilio_piso VARCHAR(10),
    domicilio_depto VARCHAR(10),
    domicilio_completo TEXT,                          -- Dirección armada automáticamente

    -- Ubicación Geográfica
    ciudad VARCHAR(100),
    provincia_estado VARCHAR(100),
    codigo_postal VARCHAR(20),
    pais VARCHAR(100) DEFAULT 'Argentina',

    -- Coordenadas GPS (para delivery/logística)
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),

    -- ========================================
    -- CONFIGURACIÓN COMERCIAL
    -- ========================================
    categoria_cliente VARCHAR(50) DEFAULT 'GENERAL',  -- VIP, MAYORISTA, MINORISTA, etc.
    lista_precio VARCHAR(50) DEFAULT 'GENERAL',       -- Integración con módulo productos
    descuento_maximo DECIMAL(5,2) DEFAULT 0.00,      -- % descuento máximo permitido

    -- Límites de Crédito
    limite_credito DECIMAL(15,4) DEFAULT 0,          -- Límite en moneda local
    credito_disponible DECIMAL(15,4) DEFAULT 0,      -- Calculado automáticamente
    dias_vencimiento INTEGER DEFAULT 30,             -- Días para vencimiento facturas

    -- ========================================
    -- CONFIGURACIÓN FISCAL AVANZADA
    -- ========================================
    exento_impuestos BOOLEAN DEFAULT false,
    aplica_retencion_iva BOOLEAN DEFAULT false,
    aplica_retencion_ganancias BOOLEAN DEFAULT false,
    aplica_retencion_ib BOOLEAN DEFAULT false,
    aplica_percepcion_iva BOOLEAN DEFAULT false,
    aplica_percepcion_ib BOOLEAN DEFAULT false,

    -- Alícuotas personalizadas (override de tax_templates)
    alicuota_retencion_iva DECIMAL(5,2),
    alicuota_retencion_ganancias DECIMAL(5,2),
    alicuota_retencion_ib DECIMAL(5,2),
    alicuota_percepcion_iva DECIMAL(5,2),
    alicuota_percepcion_ib DECIMAL(5,2),

    -- ========================================
    -- DATOS COMERCIALES ADICIONALES
    -- ========================================
    vendedor_asignado_id INTEGER,                    -- Usuario vendedor asignado
    canal_venta VARCHAR(50) DEFAULT 'DIRECTO',       -- DIRECTO, DISTRIBUIDOR, ONLINE
    origen_cliente VARCHAR(50) DEFAULT 'MANUAL',    -- MANUAL, WEB, IMPORTADO, API

    -- Configuración de Facturación
    requiere_orden_compra BOOLEAN DEFAULT false,
    formato_facturacion VARCHAR(20) DEFAULT 'A',    -- A, B, C, E (exportación)
    email_facturacion VARCHAR(255),                 -- Email específico para facturas

    -- ========================================
    -- INFORMACIÓN ADICIONAL
    -- ========================================
    fecha_alta DATE DEFAULT CURRENT_DATE,
    fecha_primera_compra DATE,
    fecha_ultima_compra DATE,

    -- Estadísticas comerciales (calculadas automáticamente)
    total_compras DECIMAL(15,4) DEFAULT 0,          -- Monto total histórico
    cantidad_facturas INTEGER DEFAULT 0,            -- Cantidad de facturas emitidas
    promedio_compra DECIMAL(15,4) DEFAULT 0,        -- Promedio por factura

    -- Observaciones y notas
    observaciones TEXT,
    notas_internas TEXT,                             -- Solo visibles internamente

    -- ========================================
    -- CONFIGURACIÓN FLEXIBLE
    -- ========================================
    configuracion_adicional JSONB DEFAULT '{}',     -- Campos personalizables por empresa
    datos_extra JSONB DEFAULT '{}',                 -- Integración con otros módulos

    -- ========================================
    -- CONTROL DE ESTADO Y AUDITORÍA
    -- ========================================
    estado VARCHAR(20) DEFAULT 'ACTIVO',            -- ACTIVO, INACTIVO, SUSPENDIDO, BLOQUEADO
    motivo_inactivacion TEXT,

    -- Timestamps de auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),

    -- ========================================
    -- CONSTRAINTS Y ÍNDICES
    -- ========================================
    CONSTRAINT siac_clientes_codigo_company_uk UNIQUE (company_id, codigo_cliente),
    CONSTRAINT siac_clientes_documento_company_uk UNIQUE (company_id, documento_numero),
    CONSTRAINT siac_clientes_email_company_uk UNIQUE (company_id, email)
);

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_siac_clientes_company_id ON siac_clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_codigo ON siac_clientes(codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_documento ON siac_clientes(documento_numero);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_razon_social ON siac_clientes(razon_social);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_estado ON siac_clientes(estado);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_categoria ON siac_clientes(categoria_cliente);
CREATE INDEX IF NOT EXISTS idx_siac_clientes_tax_template ON siac_clientes(tax_template_id);

-- ============================================================================
-- 2. CONTACTOS ADICIONALES POR CLIENTE
-- ============================================================================
CREATE TABLE IF NOT EXISTS siac_clientes_contactos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id) ON DELETE CASCADE,

    -- Información del contacto
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    cargo VARCHAR(100),
    departamento VARCHAR(100),

    -- Medios de contacto
    telefono VARCHAR(50),
    celular VARCHAR(50),
    email VARCHAR(255),

    -- Configuración
    es_contacto_principal BOOLEAN DEFAULT false,
    recibe_facturas BOOLEAN DEFAULT false,
    recibe_cobranzas BOOLEAN DEFAULT false,
    recibe_marketing BOOLEAN DEFAULT true,

    -- Control
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Un solo contacto principal por cliente
    CONSTRAINT siac_contactos_principal_unique
        EXCLUDE (cliente_id WITH =) WHERE (es_contacto_principal = true)
);

CREATE INDEX IF NOT EXISTS idx_siac_contactos_cliente ON siac_clientes_contactos(cliente_id);

-- ============================================================================
-- 3. DIRECCIONES ADICIONALES POR CLIENTE
-- ============================================================================
CREATE TABLE IF NOT EXISTS siac_clientes_direcciones (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id) ON DELETE CASCADE,

    -- Tipo de dirección
    tipo_direccion VARCHAR(30) NOT NULL DEFAULT 'ADICIONAL', -- FACTURACION, ENTREGA, SUCURSAL, ADICIONAL
    nombre_direccion VARCHAR(100),                           -- "Sucursal Centro", "Depósito Norte"

    -- Dirección completa
    calle VARCHAR(255) NOT NULL,
    numero VARCHAR(20),
    piso VARCHAR(10),
    departamento VARCHAR(10),
    entre_calles VARCHAR(255),
    referencias TEXT,

    -- Ubicación
    ciudad VARCHAR(100),
    provincia_estado VARCHAR(100),
    codigo_postal VARCHAR(20),
    pais VARCHAR(100) DEFAULT 'Argentina',

    -- GPS
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),

    -- Configuración
    es_direccion_principal BOOLEAN DEFAULT false,
    activa_para_facturacion BOOLEAN DEFAULT true,
    activa_para_entrega BOOLEAN DEFAULT true,

    -- Horarios de entrega (JSONB flexible)
    horarios_entrega JSONB DEFAULT '{}',

    -- Control
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Una sola dirección principal por cliente
    CONSTRAINT siac_direcciones_principal_unique
        EXCLUDE (cliente_id WITH =) WHERE (es_direccion_principal = true)
);

CREATE INDEX IF NOT EXISTS idx_siac_direcciones_cliente ON siac_clientes_direcciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_siac_direcciones_tipo ON siac_clientes_direcciones(tipo_direccion);

-- ============================================================================
-- 4. HISTORIAL DE PRECIOS ESPECIALES POR CLIENTE
-- ============================================================================
CREATE TABLE IF NOT EXISTS siac_clientes_precios_especiales (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id) ON DELETE CASCADE,

    -- Referencia a producto (si módulo productos está activo)
    producto_id INTEGER,                             -- Referencia flexible
    producto_codigo VARCHAR(50),                     -- Código del producto como fallback
    producto_descripcion VARCHAR(255),              -- Descripción como fallback

    -- Precio especial
    precio_especial DECIMAL(15,4) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'ARS',
    tipo_precio VARCHAR(20) DEFAULT 'FIJO',         -- FIJO, DESCUENTO_PORCENTAJE, DESCUENTO_MONTO
    valor_descuento DECIMAL(15,4),                  -- Si es descuento

    -- Vigencia
    fecha_desde DATE DEFAULT CURRENT_DATE,
    fecha_hasta DATE,

    -- Condiciones de aplicación
    cantidad_minima INTEGER DEFAULT 1,
    solo_contado BOOLEAN DEFAULT false,

    -- Control
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),

    -- No permitir precios duplicados vigentes
    CONSTRAINT siac_precios_especiales_vigencia_uk
        UNIQUE (cliente_id, producto_codigo, fecha_desde, fecha_hasta)
);

CREATE INDEX IF NOT EXISTS idx_siac_precios_cliente ON siac_clientes_precios_especiales(cliente_id);
CREATE INDEX IF NOT EXISTS idx_siac_precios_producto ON siac_clientes_precios_especiales(producto_codigo);
CREATE INDEX IF NOT EXISTS idx_siac_precios_vigencia ON siac_clientes_precios_especiales(fecha_desde, fecha_hasta);

-- ============================================================================
-- 5. CONFIGURACIÓN DE MÓDULOS POR EMPRESA
-- ============================================================================
-- Esta tabla permite detectar automáticamente qué módulos están contratados
CREATE TABLE IF NOT EXISTS siac_modulos_empresa (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Módulo contratado
    modulo_codigo VARCHAR(50) NOT NULL,             -- 'clientes', 'productos', 'facturacion', etc.
    modulo_nombre VARCHAR(100) NOT NULL,
    modulo_descripcion TEXT,

    -- Estado del módulo
    activo BOOLEAN DEFAULT true,
    fecha_contratacion DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,

    -- Configuración específica del módulo
    configuracion JSONB DEFAULT '{}',
    precio_mensual DECIMAL(10,2) DEFAULT 0,

    -- Control
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Un módulo por empresa
    CONSTRAINT siac_modulos_empresa_uk UNIQUE (company_id, modulo_codigo)
);

CREATE INDEX IF NOT EXISTS idx_siac_modulos_company ON siac_modulos_empresa(company_id);
CREATE INDEX IF NOT EXISTS idx_siac_modulos_codigo ON siac_modulos_empresa(modulo_codigo);

-- ============================================================================
-- 6. FUNCIONES AUXILIARES PARA INTEGRACIÓN AUTOMÁTICA
-- ============================================================================

-- Función para detectar automáticamente si un módulo está contratado
CREATE OR REPLACE FUNCTION siac_modulo_contratado(p_company_id INTEGER, p_modulo_codigo VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM siac_modulos_empresa
        WHERE company_id = p_company_id
        AND modulo_codigo = p_modulo_codigo
        AND activo = true
        AND (fecha_vencimiento IS NULL OR fecha_vencimiento > CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de cliente automático
CREATE OR REPLACE FUNCTION siac_generar_codigo_cliente(p_company_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_proximo_numero INTEGER;
    v_codigo_cliente VARCHAR(20);
    v_config_empresa RECORD;
BEGIN
    -- Obtener configuración de la empresa
    SELECT opcion_codigo_clientes, cant_digitos_articulo
    INTO v_config_empresa
    FROM siac_configuracion_empresa
    WHERE company_id = p_company_id;

    -- Si no hay configuración, usar valores por defecto
    IF v_config_empresa IS NULL THEN
        v_config_empresa.opcion_codigo_clientes := 'AUTOMATICO';
        v_config_empresa.cant_digitos_articulo := 6;
    END IF;

    -- Generar código según configuración
    IF v_config_empresa.opcion_codigo_clientes = 'AUTOMATICO' THEN
        -- Obtener el próximo número
        SELECT COALESCE(MAX(CAST(codigo_cliente AS INTEGER)), 0) + 1
        INTO v_proximo_numero
        FROM siac_clientes
        WHERE company_id = p_company_id
        AND codigo_cliente ~ '^\d+$'; -- Solo códigos numéricos

        -- Formatear con ceros a la izquierda
        v_codigo_cliente := LPAD(v_proximo_numero::VARCHAR, v_config_empresa.cant_digitos_articulo, '0');
    ELSE
        -- Otros métodos de generación pueden agregarse aquí
        v_codigo_cliente := 'CLI' || LPAD(EXTRACT(EPOCH FROM NOW())::VARCHAR, 8, '0');
    END IF;

    RETURN v_codigo_cliente;
END;
$$ LANGUAGE plpgsql;

-- Función para formatear documento según país
CREATE OR REPLACE FUNCTION siac_formatear_documento(p_numero VARCHAR, p_tipo VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    CASE p_tipo
        WHEN 'CUIT' THEN
            -- Formato argentino: XX-XXXXXXXX-X
            IF LENGTH(p_numero) = 11 THEN
                RETURN SUBSTR(p_numero, 1, 2) || '-' || SUBSTR(p_numero, 3, 8) || '-' || SUBSTR(p_numero, 11, 1);
            END IF;
        WHEN 'RUT' THEN
            -- Formato uruguayo: XXXXXXXXXXXX (sin formato especial)
            RETURN p_numero;
        WHEN 'CNPJ' THEN
            -- Formato brasileño: XX.XXX.XXX/XXXX-XX
            IF LENGTH(p_numero) = 14 THEN
                RETURN SUBSTR(p_numero, 1, 2) || '.' || SUBSTR(p_numero, 3, 3) || '.' ||
                       SUBSTR(p_numero, 6, 3) || '/' || SUBSTR(p_numero, 9, 4) || '-' || SUBSTR(p_numero, 13, 2);
            END IF;
    END CASE;

    -- Si no coincide con ningún formato, devolver el número original
    RETURN p_numero;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGERS PARA AUTOMATIZACIÓN
-- ============================================================================

-- Trigger para generar código automático y formatear documento
CREATE OR REPLACE FUNCTION siac_clientes_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Generar código automático si no se proporciona
    IF NEW.codigo_cliente IS NULL OR NEW.codigo_cliente = '' THEN
        NEW.codigo_cliente := siac_generar_codigo_cliente(NEW.company_id);
    END IF;

    -- Formatear documento automáticamente
    IF NEW.documento_numero IS NOT NULL THEN
        NEW.documento_formateado := siac_formatear_documento(NEW.documento_numero, NEW.documento_tipo);
    END IF;

    -- Armar dirección completa
    NEW.domicilio_completo := TRIM(
        COALESCE(NEW.domicilio_calle, '') || ' ' ||
        COALESCE(NEW.domicilio_numero, '') ||
        CASE WHEN NEW.domicilio_piso IS NOT NULL THEN ' Piso ' || NEW.domicilio_piso ELSE '' END ||
        CASE WHEN NEW.domicilio_depto IS NOT NULL THEN ' Depto ' || NEW.domicilio_depto ELSE '' END
    );

    -- Inicializar crédito disponible igual al límite
    IF NEW.credito_disponible IS NULL THEN
        NEW.credito_disponible := NEW.limite_credito;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER siac_clientes_before_insert_trigger
    BEFORE INSERT ON siac_clientes
    FOR EACH ROW EXECUTE FUNCTION siac_clientes_before_insert();

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION siac_clientes_before_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;

    -- Actualizar dirección completa si cambió algún componente
    NEW.domicilio_completo := TRIM(
        COALESCE(NEW.domicilio_calle, '') || ' ' ||
        COALESCE(NEW.domicilio_numero, '') ||
        CASE WHEN NEW.domicilio_piso IS NOT NULL THEN ' Piso ' || NEW.domicilio_piso ELSE '' END ||
        CASE WHEN NEW.domicilio_depto IS NOT NULL THEN ' Depto ' || NEW.domicilio_depto ELSE '' END
    );

    -- Formatear documento si cambió
    IF NEW.documento_numero != OLD.documento_numero OR NEW.documento_tipo != OLD.documento_tipo THEN
        NEW.documento_formateado := siac_formatear_documento(NEW.documento_numero, NEW.documento_tipo);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER siac_clientes_before_update_trigger
    BEFORE UPDATE ON siac_clientes
    FOR EACH ROW EXECUTE FUNCTION siac_clientes_before_update();

-- ============================================================================
-- 8. DATOS INICIALES Y CONFIGURACIÓN
-- ============================================================================

-- Insertar módulos base del sistema
INSERT INTO siac_modulos_empresa (company_id, modulo_codigo, modulo_nombre, modulo_descripcion, activo)
SELECT DISTINCT c.id, 'clientes', 'Módulo Clientes', 'Gestión completa de clientes y prospectos', true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM siac_modulos_empresa
    WHERE company_id = c.id AND modulo_codigo = 'clientes'
);

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE siac_clientes IS 'Módulo principal de clientes con arquitectura escalable y detección automática de módulos contratados';
COMMENT ON COLUMN siac_clientes.tax_template_id IS 'Integración automática con plantillas fiscales por país';
COMMENT ON COLUMN siac_clientes.configuracion_adicional IS 'Campos personalizables por empresa usando JSONB';
COMMENT ON COLUMN siac_clientes.datos_extra IS 'Integración automática con otros módulos del sistema';

COMMENT ON FUNCTION siac_modulo_contratado IS 'Función para detectar automáticamente si un módulo está contratado por la empresa';
COMMENT ON FUNCTION siac_generar_codigo_cliente IS 'Genera códigos de cliente automáticamente según configuración de la empresa';
COMMENT ON FUNCTION siac_formatear_documento IS 'Formatea documentos según el país y tipo (CUIT, RUT, CNPJ)';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================