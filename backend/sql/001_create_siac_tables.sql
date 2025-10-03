-- ========================================
-- SIAC ERP - ESTRUCTURA DE BASE DE DATOS
-- ========================================

-- Tabla de configuración de empresa SIAC
CREATE TABLE IF NOT EXISTS siac_configuracion_empresa (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- DATOS DE LA EMPRESA
    razon_social VARCHAR(255),
    domicilio VARCHAR(255),
    cuit VARCHAR(15),
    ingresos_brutos VARCHAR(20),
    condicion_iva VARCHAR(50) DEFAULT 'RESPONSABLE_INSCRIPTO',
    licencia_inicio DATE,
    licencia_fin DATE,

    -- CONFIGURACIÓN FISCAL Y CONTABLE
    punto_venta INTEGER DEFAULT 1,
    agente_retencion_iva BOOLEAN DEFAULT false,
    agente_percepcion_iva BOOLEAN DEFAULT false,
    agente_retencion_ib BOOLEAN DEFAULT false,
    agente_percepcion_ib BOOLEAN DEFAULT false,

    -- PORCENTAJES DE RETENCIONES Y PERCEPCIONES
    porc_retencion_iva DECIMAL(5,2) DEFAULT 10.50,
    porc_percepcion_iva DECIMAL(5,2) DEFAULT 21.00,
    porc_retencion_ib DECIMAL(5,2) DEFAULT 3.00,
    porc_percepcion_ib DECIMAL(5,2) DEFAULT 3.50,

    -- CONFIGURACIÓN DE FACTURACIÓN
    habilita_facturacion BOOLEAN DEFAULT true,
    habilita_facturas_a BOOLEAN DEFAULT true,
    habilita_nota_credito BOOLEAN DEFAULT true,
    habilita_factura_sin_stock BOOLEAN DEFAULT false,
    copias_factura INTEGER DEFAULT 1,
    deposito_facturacion VARCHAR(50) DEFAULT 'PRINCIPAL',

    -- NUMERACIÓN DE COMPROBANTES
    factura_a_numero INTEGER DEFAULT 1,
    factura_b_numero INTEGER DEFAULT 1,
    factura_c_numero INTEGER DEFAULT 1,
    nota_credito_numero INTEGER DEFAULT 1,
    remito_numero INTEGER DEFAULT 1,
    recibo_numero INTEGER DEFAULT 1,

    -- CONFIGURACIÓN DE CÓDIGOS
    opcion_codigo_clientes VARCHAR(20) DEFAULT 'AUTOMATICO', -- AUTOMATICO, MANUAL
    opcion_codigo_articulos VARCHAR(20) DEFAULT 'AUTOMATICO',
    cant_digitos_articulo INTEGER DEFAULT 6,
    cant_digitos_cantidad INTEGER DEFAULT 3,

    -- CONFIGURACIÓN DE STOCK
    actualiza_venta_con_costo BOOLEAN DEFAULT true,
    ingresa_precio_venta BOOLEAN DEFAULT true,
    calcula_margen_producto BOOLEAN DEFAULT true,

    -- CONFIGURACIÓN DE TURNOS Y HORARIOS
    fuerza_inicio_turno BOOLEAN DEFAULT false,
    hora_cierre_diario TIME DEFAULT '23:59:00',

    -- CONFIGURACIÓN DE BACKUP
    path_backup VARCHAR(500),
    modo_backup VARCHAR(20) DEFAULT 'AUTOMATICO',
    horario_backup TIME DEFAULT '02:00:00',
    backup_bases BOOLEAN DEFAULT true,
    backup_cierres_diarios BOOLEAN DEFAULT true,

    -- CONFIGURACIÓN DE DEPÓSITOS
    nombre_deposito_01 VARCHAR(100) DEFAULT 'Principal',
    nombre_deposito_02 VARCHAR(100),
    nombre_deposito_03 VARCHAR(100),
    nombre_deposito_04 VARCHAR(100),
    nombre_deposito_05 VARCHAR(100),

    -- CONFIGURACIÓN DE STOCK CRÍTICO
    stock_normal_hasta INTEGER DEFAULT 10,
    stock_alto_hasta INTEGER DEFAULT 50,
    stock_critico_mas_de INTEGER DEFAULT 100,

    -- CONFIGURACIÓN DE LOCALIZACIÓN (PAÍS)
    pais VARCHAR(3) DEFAULT 'ARG',
    moneda VARCHAR(3) DEFAULT 'ARS',
    idioma VARCHAR(3) DEFAULT 'ES',
    zona_horaria VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',

    -- CONFIGURACIÓN ADICIONAL (JSONB para flexibilidad)
    configuracion_adicional JSONB DEFAULT '{}',

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),

    -- CONSTRAINT ÚNICO por empresa
    UNIQUE(company_id)
);

-- Tabla de medios de pago por empresa
CREATE TABLE IF NOT EXISTS siac_medios_pago (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    conversion DECIMAL(10,4) DEFAULT 1.0000, -- Para monedas extranjeras
    interes DECIMAL(5,2) DEFAULT 0.00, -- Interés por financiación
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de turnos de trabajo por empresa
CREATE TABLE IF NOT EXISTS siac_turnos (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    desde_dia INTEGER, -- 1=Lunes, 7=Domingo
    hasta_dia INTEGER,
    desde_hora TIME,
    hasta_hora TIME,
    activo BOOLEAN DEFAULT true,

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuración de países para localización
CREATE TABLE IF NOT EXISTS siac_paises (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(3) UNIQUE NOT NULL, -- ARG, URU, BRA, etc.
    nombre VARCHAR(100) NOT NULL,
    moneda VARCHAR(3) NOT NULL,
    sistema_impositivo JSONB DEFAULT '{}',
    configuracion_fiscal JSONB DEFAULT '{}',
    formatos_documento JSONB DEFAULT '{}',
    validaciones JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar países base
INSERT INTO siac_paises (codigo, nombre, moneda, sistema_impositivo, configuracion_fiscal) VALUES
('ARG', 'Argentina', 'ARS',
 '{"iva": {"rates": [10.5, 21, 27], "types": ["GENERAL", "REDUCIDA", "AUMENTADA"]}, "iibb": {"enabled": true}, "ganancias": {"enabled": true, "rate": 35}}',
 '{"afip": true, "cuit_required": true, "electronic_billing": true}'),
('URU', 'Uruguay', 'UYU',
 '{"iva": {"rates": [10, 22], "types": ["MINIMA", "BASICA"]}, "irae": {"enabled": true, "rate": 25}}',
 '{"dgi": true, "rut_required": true, "cfe": true}'),
('BRA', 'Brasil', 'BRL',
 '{"icms": {"enabled": true}, "ipi": {"enabled": true}, "pis_cofins": {"enabled": true}}',
 '{"sefaz": true, "cnpj_required": true, "nfe": true}')
ON CONFLICT (codigo) DO NOTHING;

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_siac_configuracion_company ON siac_configuracion_empresa(company_id);
CREATE INDEX IF NOT EXISTS idx_siac_medios_pago_company ON siac_medios_pago(company_id);
CREATE INDEX IF NOT EXISTS idx_siac_turnos_company ON siac_turnos(company_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_siac_configuracion_updated_at
    BEFORE UPDATE ON siac_configuracion_empresa
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_siac_medios_pago_updated_at
    BEFORE UPDATE ON siac_medios_pago
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();