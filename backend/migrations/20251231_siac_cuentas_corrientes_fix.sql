-- ============================================================================
-- SIAC Cuentas Corrientes - Tablas Faltantes (FIX)
-- Fecha: 2025-12-31
-- ============================================================================

-- 1. Catálogo de Medios de Pago Configurables por Empresa
CREATE TABLE IF NOT EXISTS siac_medios_pago (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    aplica_descuento BOOLEAN DEFAULT false,
    porcentaje_descuento DECIMAL(5,2) DEFAULT 0,
    aplica_recargo BOOLEAN DEFAULT false,
    porcentaje_recargo DECIMAL(5,2) DEFAULT 0,
    dias_descuento_pronto_pago INTEGER,
    porcentaje_pronto_pago DECIMAL(5,2) DEFAULT 0,
    plazo_maximo_dias INTEGER DEFAULT 180,
    plazo_minimo_dias INTEGER DEFAULT 0,
    aplica_retencion_iva BOOLEAN DEFAULT false,
    porcentaje_retencion_iva DECIMAL(5,2) DEFAULT 0,
    aplica_retencion_ganancias BOOLEAN DEFAULT false,
    porcentaje_retencion_ganancias DECIMAL(5,2) DEFAULT 0,
    aplica_retencion_iibb BOOLEAN DEFAULT false,
    porcentaje_retencion_iibb DECIMAL(5,2) DEFAULT 0,
    requiere_autorizacion BOOLEAN DEFAULT false,
    monto_minimo_autorizacion DECIMAL(15,2) DEFAULT 100000,
    monto_minimo DECIMAL(15,2),
    monto_maximo DECIMAL(15,2),
    afecta_caja BOOLEAN DEFAULT true,
    activo BOOLEAN DEFAULT true,
    orden_mostrar INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT siac_medios_pago_unique UNIQUE(company_id, codigo)
);

-- 2. Log de Anulaciones
CREATE TABLE IF NOT EXISTS siac_anulaciones_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    tipo_documento VARCHAR(30) NOT NULL,
    documento_id INTEGER NOT NULL,
    documento_numero VARCHAR(30),
    documento_fecha DATE,
    documento_monto DECIMAL(15,2),
    cliente_id INTEGER,
    cliente_nombre VARCHAR(200),
    fecha_anulacion TIMESTAMP DEFAULT NOW(),
    motivo_anulacion TEXT NOT NULL,
    tipo_anulacion VARCHAR(30) DEFAULT 'TOTAL',
    monto_anulado DECIMAL(15,2),
    usuario_solicitante_id INTEGER NOT NULL,
    usuario_solicitante_nombre VARCHAR(200),
    usuario_autorizante_id INTEGER,
    usuario_autorizante_nombre VARCHAR(200),
    requirio_autorizacion BOOLEAN DEFAULT false,
    autorizado BOOLEAN DEFAULT true,
    fecha_autorizacion TIMESTAMP,
    documento_reverso_tipo VARCHAR(30),
    documento_reverso_id INTEGER,
    documento_reverso_numero VARCHAR(30),
    afecto_caja BOOLEAN DEFAULT false,
    movimiento_caja_original_id INTEGER,
    movimiento_caja_reverso_id INTEGER,
    monto_caja_reversado DECIMAL(15,2),
    afecto_cuenta_corriente BOOLEAN DEFAULT false,
    movimiento_cta_cte_original_id INTEGER,
    movimiento_cta_cte_reverso_id INTEGER,
    saldo_cliente_anterior DECIMAL(15,2),
    saldo_cliente_posterior DECIMAL(15,2),
    cheques_afectados JSONB,
    cantidad_cheques_devueltos INTEGER DEFAULT 0,
    monto_cheques_devueltos DECIMAL(15,2) DEFAULT 0,
    facturas_afectadas JSONB,
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'COMPLETADA',
    error_mensaje TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Configuración de Cuenta Corriente por Empresa
CREATE TABLE IF NOT EXISTS siac_config_cuenta_corriente (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL UNIQUE,
    aplica_intereses_mora BOOLEAN DEFAULT false,
    tasa_interes_diaria DECIMAL(8,5) DEFAULT 0.001,
    tasa_interes_mensual DECIMAL(8,4) DEFAULT 3.00,
    tipo_calculo_interes VARCHAR(20) DEFAULT 'DIARIO',
    dias_gracia INTEGER DEFAULT 0,
    bloqueo_automatico_morosos BOOLEAN DEFAULT false,
    dias_atraso_bloqueo INTEGER DEFAULT 90,
    credito_default_nuevos_clientes DECIMAL(15,2) DEFAULT 0,
    requiere_aprobacion_credito BOOLEAN DEFAULT true,
    requiere_autorizacion_anulacion BOOLEAN DEFAULT false,
    monto_minimo_autorizacion_anulacion DECIMAL(15,2) DEFAULT 100000,
    plazo_maximo_cheques_diferidos INTEGER DEFAULT 30,
    plazo_minimo_cheques_diferidos INTEGER DEFAULT 0,
    interes_mensual_cheques_diferidos DECIMAL(5,2) DEFAULT 0,
    aplica_retenciones_automaticas BOOLEAN DEFAULT true,
    tax_template_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Configuración Particular de Cliente
CREATE TABLE IF NOT EXISTS siac_clientes_config (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL UNIQUE,
    company_id INTEGER NOT NULL,
    plazo_maximo_cheques_diferidos INTEGER,
    interes_mensual_cheques_diferidos DECIMAL(5,2),
    tasa_interes_diaria_custom DECIMAL(8,5),
    tasa_interes_mensual_custom DECIMAL(8,4),
    dias_gracia_custom INTEGER,
    descuento_pronto_pago DECIMAL(5,2) DEFAULT 0,
    dias_pronto_pago INTEGER DEFAULT 10,
    exento_retencion_iva BOOLEAN DEFAULT false,
    exento_retencion_ganancias BOOLEAN DEFAULT false,
    exento_retencion_iibb BOOLEAN DEFAULT false,
    certificado_exencion_numero VARCHAR(50),
    certificado_exencion_vencimiento DATE,
    jurisdiccion_iibb VARCHAR(50),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_medios_pago_company ON siac_medios_pago(company_id);
CREATE INDEX IF NOT EXISTS idx_medios_pago_activo ON siac_medios_pago(company_id, activo);
CREATE INDEX IF NOT EXISTS idx_anulaciones_company ON siac_anulaciones_log(company_id);
CREATE INDEX IF NOT EXISTS idx_anulaciones_doc ON siac_anulaciones_log(tipo_documento, documento_id);
CREATE INDEX IF NOT EXISTS idx_anulaciones_estado ON siac_anulaciones_log(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_config_cliente ON siac_clientes_config(cliente_id);

-- Insertar medios de pago por defecto para company_id = 1
INSERT INTO siac_medios_pago (company_id, codigo, nombre, tipo, aplica_descuento, porcentaje_descuento, aplica_recargo, porcentaje_recargo, afecta_caja, orden_mostrar, activo)
VALUES
    (1, 'EFECTIVO', 'Efectivo', 'EFECTIVO', false, 0, false, 0, true, 1, true),
    (1, 'CHEQUE_DIA', 'Cheque al Día', 'CHEQUE_AL_DIA', false, 0, false, 0, true, 2, true),
    (1, 'CHEQUE_DIF', 'Cheque Diferido', 'CHEQUE_DIFERIDO', false, 0, false, 0, false, 3, true),
    (1, 'TRANSF', 'Transferencia Bancaria', 'TRANSFERENCIA', true, 3.00, false, 0, true, 4, true),
    (1, 'TD', 'Tarjeta Débito', 'TARJETA_DEBITO', false, 0, false, 0, true, 5, true),
    (1, 'TC', 'Tarjeta Crédito', 'TARJETA_CREDITO', false, 0, true, 10.00, true, 6, true),
    (1, 'MP', 'MercadoPago', 'MERCADOPAGO', false, 0, true, 5.00, true, 7, true)
ON CONFLICT (company_id, codigo) DO NOTHING;

-- Crear configuración default para company_id = 1
INSERT INTO siac_config_cuenta_corriente (company_id)
VALUES (1)
ON CONFLICT (company_id) DO NOTHING;

-- Funciones helper
CREATE OR REPLACE FUNCTION siac_get_config_cheques_diferidos(p_cliente_id INTEGER)
RETURNS TABLE (
    plazo_maximo_dias INTEGER,
    interes_mensual DECIMAL(5,2),
    fuente VARCHAR(20)
) AS $$
DECLARE
    v_cliente RECORD;
    v_config RECORD;
    v_company_id INTEGER;
BEGIN
    SELECT company_id INTO v_company_id FROM siac_clientes WHERE id = p_cliente_id;
    SELECT * INTO v_cliente FROM siac_clientes_config WHERE cliente_id = p_cliente_id;
    SELECT * INTO v_config FROM siac_config_cuenta_corriente WHERE company_id = v_company_id;

    RETURN QUERY SELECT
        COALESCE(v_cliente.plazo_maximo_cheques_diferidos, v_config.plazo_maximo_cheques_diferidos, 30)::INTEGER,
        COALESCE(v_cliente.interes_mensual_cheques_diferidos, v_config.interes_mensual_cheques_diferidos, 0)::DECIMAL(5,2),
        CASE
            WHEN v_cliente.plazo_maximo_cheques_diferidos IS NOT NULL THEN 'CLIENTE'::VARCHAR(20)
            ELSE 'GENERAL'::VARCHAR(20)
        END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION siac_get_config_intereses_mora(p_cliente_id INTEGER)
RETURNS TABLE (
    aplica_intereses BOOLEAN,
    tasa_diaria DECIMAL(8,5),
    tasa_mensual DECIMAL(8,4),
    tipo_calculo VARCHAR(20),
    dias_gracia INTEGER,
    fuente VARCHAR(20)
) AS $$
DECLARE
    v_cliente RECORD;
    v_config RECORD;
    v_company_id INTEGER;
BEGIN
    SELECT company_id INTO v_company_id FROM siac_clientes WHERE id = p_cliente_id;
    SELECT * INTO v_cliente FROM siac_clientes_config WHERE cliente_id = p_cliente_id;
    SELECT * INTO v_config FROM siac_config_cuenta_corriente WHERE company_id = v_company_id;

    RETURN QUERY SELECT
        COALESCE(v_config.aplica_intereses_mora, false)::BOOLEAN,
        COALESCE(v_cliente.tasa_interes_diaria_custom, v_config.tasa_interes_diaria, 0.001)::DECIMAL(8,5),
        COALESCE(v_cliente.tasa_interes_mensual_custom, v_config.tasa_interes_mensual, 3.00)::DECIMAL(8,4),
        COALESCE(v_config.tipo_calculo_interes, 'DIARIO')::VARCHAR(20),
        COALESCE(v_cliente.dias_gracia_custom, v_config.dias_gracia, 0)::INTEGER,
        CASE
            WHEN v_cliente.tasa_interes_diaria_custom IS NOT NULL THEN 'CLIENTE'::VARCHAR(20)
            ELSE 'GENERAL'::VARCHAR(20)
        END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION siac_get_exenciones_retenciones(p_cliente_id INTEGER)
RETURNS TABLE (
    exento_iva BOOLEAN,
    exento_ganancias BOOLEAN,
    exento_iibb BOOLEAN,
    certificado_numero VARCHAR(50),
    certificado_vigente BOOLEAN,
    jurisdiccion_iibb VARCHAR(50)
) AS $$
DECLARE
    v_cliente RECORD;
BEGIN
    SELECT * INTO v_cliente FROM siac_clientes_config WHERE cliente_id = p_cliente_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, false, false, NULL::VARCHAR(50), false, NULL::VARCHAR(50);
        RETURN;
    END IF;
    RETURN QUERY SELECT
        COALESCE(v_cliente.exento_retencion_iva, false),
        COALESCE(v_cliente.exento_retencion_ganancias, false),
        COALESCE(v_cliente.exento_retencion_iibb, false),
        v_cliente.certificado_exencion_numero,
        (v_cliente.certificado_exencion_vencimiento IS NULL OR v_cliente.certificado_exencion_vencimiento >= CURRENT_DATE),
        v_cliente.jurisdiccion_iibb;
END;
$$ LANGUAGE plpgsql;

-- Función para crear medios de pago default
CREATE OR REPLACE FUNCTION siac_crear_medios_pago_default(p_company_id INTEGER)
RETURNS void AS $$
BEGIN
    INSERT INTO siac_medios_pago (company_id, codigo, nombre, tipo, aplica_descuento, porcentaje_descuento, aplica_recargo, porcentaje_recargo, afecta_caja, orden_mostrar, activo)
    VALUES
        (p_company_id, 'EFECTIVO', 'Efectivo', 'EFECTIVO', false, 0, false, 0, true, 1, true),
        (p_company_id, 'CHEQUE_DIA', 'Cheque al Día', 'CHEQUE_AL_DIA', false, 0, false, 0, true, 2, true),
        (p_company_id, 'CHEQUE_DIF', 'Cheque Diferido', 'CHEQUE_DIFERIDO', false, 0, false, 0, false, 3, true),
        (p_company_id, 'TRANSF', 'Transferencia Bancaria', 'TRANSFERENCIA', true, 3.00, false, 0, true, 4, true),
        (p_company_id, 'TD', 'Tarjeta Débito', 'TARJETA_DEBITO', false, 0, false, 0, true, 5, true),
        (p_company_id, 'TC', 'Tarjeta Crédito', 'TARJETA_CREDITO', false, 0, true, 10.00, true, 6, true),
        (p_company_id, 'MP', 'MercadoPago', 'MERCADOPAGO', false, 0, true, 5.00, true, 7, true)
    ON CONFLICT (company_id, codigo) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

SELECT 'Migración SIAC Cuentas Corrientes completada exitosamente' as resultado;
