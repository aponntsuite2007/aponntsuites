-- ============================================================================
-- SIAC Cuentas Corrientes - Tablas Extendidas
-- Fecha: 2025-12-31
-- Descripci\u00f3n: Medios de pago configurables, log de anulaciones, historial cheques
-- ============================================================================

-- 1. Cat\u00e1logo de Medios de Pago Configurables por Empresa
CREATE TABLE IF NOT EXISTS siac_medios_pago (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) NOT NULL, -- EFECTIVO, CHEQUE_AL_DIA, CHEQUE_DIFERIDO, TRANSFERENCIA, TARJETA_DEBITO, TARJETA_CREDITO, MERCADOPAGO, OTRO

    -- Beneficios/Recargos
    aplica_descuento BOOLEAN DEFAULT false,
    porcentaje_descuento DECIMAL(5,2) DEFAULT 0,
    aplica_recargo BOOLEAN DEFAULT false,
    porcentaje_recargo DECIMAL(5,2) DEFAULT 0,
    dias_descuento_pronto_pago INTEGER,
    porcentaje_pronto_pago DECIMAL(5,2) DEFAULT 0,

    -- Plazos (cheques diferidos)
    plazo_maximo_dias INTEGER DEFAULT 180,
    plazo_minimo_dias INTEGER DEFAULT 0,

    -- Retenciones autom\u00e1ticas (por medio de pago)
    aplica_retencion_iva BOOLEAN DEFAULT false,
    porcentaje_retencion_iva DECIMAL(5,2) DEFAULT 0,
    aplica_retencion_ganancias BOOLEAN DEFAULT false,
    porcentaje_retencion_ganancias DECIMAL(5,2) DEFAULT 0,
    aplica_retencion_iibb BOOLEAN DEFAULT false,
    porcentaje_retencion_iibb DECIMAL(5,2) DEFAULT 0,

    -- Comportamiento
    requiere_autorizacion BOOLEAN DEFAULT false,
    monto_minimo_autorizacion DECIMAL(15,2) DEFAULT 100000, -- Monto a partir del cual requiere autorizaci\u00f3n
    monto_minimo DECIMAL(15,2),
    monto_maximo DECIMAL(15,2),
    afecta_caja BOOLEAN DEFAULT true,

    -- Estado y orden
    activo BOOLEAN DEFAULT true,
    orden_mostrar INTEGER DEFAULT 0,

    -- Auditor\u00eda
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER,

    CONSTRAINT siac_medios_pago_unique UNIQUE(company_id, codigo)
);

-- 2. Log de Anulaciones (Auditor\u00eda completa de reversiones)
CREATE TABLE IF NOT EXISTS siac_anulaciones_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),

    -- Documento anulado
    tipo_documento VARCHAR(30) NOT NULL, -- FACTURA, RECIBO, NOTA_CREDITO, NOTA_DEBITO
    documento_id INTEGER NOT NULL,
    documento_numero VARCHAR(30),
    documento_fecha DATE,
    documento_monto DECIMAL(15,2),
    cliente_id INTEGER,
    cliente_nombre VARCHAR(200),

    -- Datos de anulaci\u00f3n
    fecha_anulacion TIMESTAMP DEFAULT NOW(),
    motivo_anulacion TEXT NOT NULL,
    tipo_anulacion VARCHAR(30) DEFAULT 'TOTAL', -- TOTAL, PARCIAL
    monto_anulado DECIMAL(15,2),

    -- Autorizaci\u00f3n
    usuario_solicitante_id INTEGER NOT NULL,
    usuario_solicitante_nombre VARCHAR(200),
    usuario_autorizante_id INTEGER,
    usuario_autorizante_nombre VARCHAR(200),
    requirio_autorizacion BOOLEAN DEFAULT false,
    autorizado BOOLEAN DEFAULT true,
    fecha_autorizacion TIMESTAMP,

    -- Documentos de reversi\u00f3n generados
    documento_reverso_tipo VARCHAR(30), -- NOTA_CREDITO, MOVIMIENTO_CAJA_REVERSO
    documento_reverso_id INTEGER,
    documento_reverso_numero VARCHAR(30),

    -- Impacto en subsistemas
    afecto_caja BOOLEAN DEFAULT false,
    movimiento_caja_original_id INTEGER,
    movimiento_caja_reverso_id INTEGER,
    monto_caja_reversado DECIMAL(15,2),

    afecto_cuenta_corriente BOOLEAN DEFAULT false,
    movimiento_cta_cte_original_id INTEGER,
    movimiento_cta_cte_reverso_id INTEGER,
    saldo_cliente_anterior DECIMAL(15,2),
    saldo_cliente_posterior DECIMAL(15,2),

    -- Cheques afectados (JSON array)
    cheques_afectados JSONB, -- [{cheque_id, numero, banco, monto, estado_anterior, estado_nuevo}]
    cantidad_cheques_devueltos INTEGER DEFAULT 0,
    monto_cheques_devueltos DECIMAL(15,2) DEFAULT 0,

    -- Facturas afectadas (para recibos)
    facturas_afectadas JSONB, -- [{factura_id, numero, monto_imputado, saldo_restaurado}]

    observaciones TEXT,

    -- Estado de la anulaci\u00f3n
    estado VARCHAR(20) DEFAULT 'COMPLETADA', -- PENDIENTE, COMPLETADA, RECHAZADA, ERROR
    error_mensaje TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Historial de Estados de Cheques (trazabilidad completa)
CREATE TABLE IF NOT EXISTS siac_cheques_historial (
    id SERIAL PRIMARY KEY,
    cheque_id INTEGER NOT NULL REFERENCES siac_cheques_cartera(id) ON DELETE CASCADE,

    -- Cambio de estado
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20) NOT NULL,
    fecha_cambio TIMESTAMP DEFAULT NOW(),

    -- Operaci\u00f3n que caus\u00f3 el cambio
    operacion VARCHAR(30) NOT NULL, -- INGRESO, DEPOSITO, COBRO, RECHAZO, ENDOSO, ANULACION, DEVOLUCION

    -- Documento relacionado
    documento_relacionado_tipo VARCHAR(30), -- RECIBO, FACTURA, ANULACION
    documento_relacionado_id INTEGER,
    documento_relacionado_numero VARCHAR(30),

    -- Usuario que realiz\u00f3 la operaci\u00f3n
    usuario_id INTEGER NOT NULL,
    usuario_nombre VARCHAR(200),

    -- Datos adicionales del cheque al momento del cambio
    monto DECIMAL(15,2),
    fecha_vencimiento DATE,
    banco VARCHAR(100),

    observaciones TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Retenciones por Recibo
CREATE TABLE IF NOT EXISTS siac_recibos_retenciones (
    id SERIAL PRIMARY KEY,
    recibo_id INTEGER NOT NULL REFERENCES siac_recibos(id) ON DELETE CASCADE,

    -- Tipo de retenci\u00f3n
    tipo_retencion VARCHAR(30) NOT NULL, -- IVA, GANANCIAS, IIBB, SUSS, OTRO
    descripcion VARCHAR(200),

    -- C\u00e1lculo
    base_imponible DECIMAL(15,2) NOT NULL,
    porcentaje DECIMAL(5,2) NOT NULL,
    monto_retenido DECIMAL(15,2) NOT NULL,

    -- Comprobante de retenci\u00f3n
    numero_certificado VARCHAR(50),
    fecha_certificado DATE,

    -- Para IIBB: jurisdicci\u00f3n
    jurisdiccion VARCHAR(50),
    codigo_jurisdiccion VARCHAR(10),

    -- Para agentes de retenci\u00f3n
    cuit_agente_retencion VARCHAR(20),
    razon_social_agente VARCHAR(200),

    anulado BOOLEAN DEFAULT false,
    fecha_anulacion TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Configuración de Cuenta Corriente por Empresa (Parámetros GENERALES)
CREATE TABLE IF NOT EXISTS siac_config_cuenta_corriente (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) UNIQUE,

    -- Intereses por mora (generales)
    aplica_intereses_mora BOOLEAN DEFAULT false,
    tasa_interes_diaria DECIMAL(8,5) DEFAULT 0.001, -- 0.1% diario = 36.5% anual
    tasa_interes_mensual DECIMAL(8,4) DEFAULT 3.00, -- 3% mensual alternativo
    tipo_calculo_interes VARCHAR(20) DEFAULT 'DIARIO', -- DIARIO, MENSUAL
    dias_gracia INTEGER DEFAULT 0,

    -- Bloqueo automático
    bloqueo_automatico_morosos BOOLEAN DEFAULT false,
    dias_atraso_bloqueo INTEGER DEFAULT 90,

    -- Límites de crédito
    credito_default_nuevos_clientes DECIMAL(15,2) DEFAULT 0,
    requiere_aprobacion_credito BOOLEAN DEFAULT true,

    -- Anulaciones
    requiere_autorizacion_anulacion BOOLEAN DEFAULT false,
    monto_minimo_autorizacion_anulacion DECIMAL(15,2) DEFAULT 100000,

    -- Cheques diferidos (REGLA GENERAL de la empresa)
    plazo_maximo_cheques_diferidos INTEGER DEFAULT 30, -- Días máximo general
    plazo_minimo_cheques_diferidos INTEGER DEFAULT 0,
    interes_mensual_cheques_diferidos DECIMAL(5,2) DEFAULT 0, -- % mensual por diferido

    -- Retenciones automáticas (vinculado a TaxTemplate del país)
    aplica_retenciones_automaticas BOOLEAN DEFAULT true,
    tax_template_id INTEGER, -- FK a tax_templates (matriz fiscal del país)

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Configuración Particular de Cliente (EXCEPCIONES a reglas generales)
-- Patrón: Si campo es NULL → usa valor general de siac_config_cuenta_corriente
CREATE TABLE IF NOT EXISTS siac_clientes_config (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES siac_clientes(id) ON DELETE CASCADE UNIQUE,
    company_id INTEGER NOT NULL REFERENCES companies(id),

    -- Cheques diferidos (EXCEPCIÓN por cliente)
    plazo_maximo_cheques_diferidos INTEGER, -- NULL = usa general
    interes_mensual_cheques_diferidos DECIMAL(5,2), -- NULL = usa general (ej: 5% = 5.00)

    -- Intereses por mora (EXCEPCIÓN por cliente)
    tasa_interes_diaria_custom DECIMAL(8,5), -- NULL = usa general
    tasa_interes_mensual_custom DECIMAL(8,4), -- NULL = usa general
    dias_gracia_custom INTEGER, -- NULL = usa general

    -- Descuentos especiales para este cliente
    descuento_pronto_pago DECIMAL(5,2) DEFAULT 0,
    dias_pronto_pago INTEGER DEFAULT 10,

    -- Retenciones (EXCEPCIONES/EXENCIONES por cliente)
    exento_retencion_iva BOOLEAN DEFAULT false,
    exento_retencion_ganancias BOOLEAN DEFAULT false,
    exento_retencion_iibb BOOLEAN DEFAULT false,
    certificado_exencion_numero VARCHAR(50),
    certificado_exencion_vencimiento DATE,
    jurisdiccion_iibb VARCHAR(50), -- Jurisdicción IIBB del cliente

    -- Observaciones
    observaciones TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para config de clientes
CREATE INDEX IF NOT EXISTS idx_clientes_config_cliente ON siac_clientes_config(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_config_company ON siac_clientes_config(company_id);

-- ============================================================================
-- \u00cdNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_medios_pago_company ON siac_medios_pago(company_id);
CREATE INDEX IF NOT EXISTS idx_medios_pago_company_activo ON siac_medios_pago(company_id, activo);
CREATE INDEX IF NOT EXISTS idx_medios_pago_tipo ON siac_medios_pago(tipo);

CREATE INDEX IF NOT EXISTS idx_anulaciones_company ON siac_anulaciones_log(company_id);
CREATE INDEX IF NOT EXISTS idx_anulaciones_doc ON siac_anulaciones_log(tipo_documento, documento_id);
CREATE INDEX IF NOT EXISTS idx_anulaciones_cliente ON siac_anulaciones_log(cliente_id);
CREATE INDEX IF NOT EXISTS idx_anulaciones_fecha ON siac_anulaciones_log(fecha_anulacion);
CREATE INDEX IF NOT EXISTS idx_anulaciones_estado ON siac_anulaciones_log(estado);
CREATE INDEX IF NOT EXISTS idx_anulaciones_pendientes ON siac_anulaciones_log(company_id, estado) WHERE estado = 'PENDIENTE';

CREATE INDEX IF NOT EXISTS idx_cheques_hist_cheque ON siac_cheques_historial(cheque_id);
CREATE INDEX IF NOT EXISTS idx_cheques_hist_fecha ON siac_cheques_historial(fecha_cambio);
CREATE INDEX IF NOT EXISTS idx_cheques_hist_operacion ON siac_cheques_historial(operacion);

CREATE INDEX IF NOT EXISTS idx_retenciones_recibo ON siac_recibos_retenciones(recibo_id);
CREATE INDEX IF NOT EXISTS idx_retenciones_tipo ON siac_recibos_retenciones(tipo_retencion);

-- ============================================================================
-- DATOS INICIALES - Medios de Pago por defecto
-- ============================================================================

-- Funci\u00f3n para insertar medios de pago iniciales para una empresa
CREATE OR REPLACE FUNCTION siac_crear_medios_pago_default(p_company_id INTEGER)
RETURNS void AS $$
BEGIN
    INSERT INTO siac_medios_pago (company_id, codigo, nombre, tipo, aplica_descuento, porcentaje_descuento, aplica_recargo, porcentaje_recargo, afecta_caja, orden_mostrar, activo)
    VALUES
        (p_company_id, 'EFECTIVO', 'Efectivo', 'EFECTIVO', false, 0, false, 0, true, 1, true),
        (p_company_id, 'CHEQUE_DIA', 'Cheque al D\u00eda', 'CHEQUE_AL_DIA', false, 0, false, 0, true, 2, true),
        (p_company_id, 'CHEQUE_DIF', 'Cheque Diferido', 'CHEQUE_DIFERIDO', false, 0, false, 0, false, 3, true),
        (p_company_id, 'TRANSF', 'Transferencia Bancaria', 'TRANSFERENCIA', true, 3.00, false, 0, true, 4, true),
        (p_company_id, 'TD', 'Tarjeta D\u00e9bito', 'TARJETA_DEBITO', false, 0, false, 0, true, 5, true),
        (p_company_id, 'TC', 'Tarjeta Cr\u00e9dito', 'TARJETA_CREDITO', false, 0, true, 10.00, true, 6, true),
        (p_company_id, 'MP', 'MercadoPago', 'MERCADOPAGO', false, 0, true, 5.00, true, 7, true)
    ON CONFLICT (company_id, codigo) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Insertar medios de pago para company_id = 1 (demo)
SELECT siac_crear_medios_pago_default(1);

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Funci\u00f3n para calcular total con descuento/recargo seg\u00fan medio de pago
CREATE OR REPLACE FUNCTION siac_calcular_monto_con_medio_pago(
    p_monto_base DECIMAL(15,2),
    p_medio_pago_id INTEGER
) RETURNS TABLE (
    monto_base DECIMAL(15,2),
    descuento DECIMAL(15,2),
    recargo DECIMAL(15,2),
    monto_final DECIMAL(15,2)
) AS $$
DECLARE
    v_medio RECORD;
BEGIN
    SELECT * INTO v_medio FROM siac_medios_pago WHERE id = p_medio_pago_id AND activo = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT p_monto_base, 0::DECIMAL(15,2), 0::DECIMAL(15,2), p_monto_base;
        RETURN;
    END IF;

    RETURN QUERY SELECT
        p_monto_base,
        CASE WHEN v_medio.aplica_descuento THEN ROUND(p_monto_base * v_medio.porcentaje_descuento / 100, 2) ELSE 0::DECIMAL(15,2) END,
        CASE WHEN v_medio.aplica_recargo THEN ROUND(p_monto_base * v_medio.porcentaje_recargo / 100, 2) ELSE 0::DECIMAL(15,2) END,
        ROUND(p_monto_base
            - CASE WHEN v_medio.aplica_descuento THEN p_monto_base * v_medio.porcentaje_descuento / 100 ELSE 0 END
            + CASE WHEN v_medio.aplica_recargo THEN p_monto_base * v_medio.porcentaje_recargo / 100 ELSE 0 END, 2);
END;
$$ LANGUAGE plpgsql;

-- Funci\u00f3n para obtener resumen de cuenta corriente de un cliente
CREATE OR REPLACE FUNCTION siac_resumen_cuenta_cliente(
    p_cliente_id INTEGER
) RETURNS TABLE (
    cliente_id INTEGER,
    saldo_total DECIMAL(15,2),
    facturas_pendientes INTEGER,
    monto_vencido DECIMAL(15,2),
    monto_a_vencer DECIMAL(15,2),
    dias_mayor_atraso INTEGER,
    ultimo_pago_fecha DATE,
    ultimo_pago_monto DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as cliente_id,
        COALESCE(r.saldo, 0)::DECIMAL(15,2) as saldo_total,
        COALESCE(r.cantidad_comprobantes, 0)::INTEGER as facturas_pendientes,
        COALESCE(r.monto_vencido, 0)::DECIMAL(15,2) as monto_vencido,
        (COALESCE(r.saldo, 0) - COALESCE(r.monto_vencido, 0))::DECIMAL(15,2) as monto_a_vencer,
        COALESCE(r.dias_mayor_atraso, 0)::INTEGER as dias_mayor_atraso,
        (SELECT MAX(fecha) FROM siac_recibos WHERE cliente_id = c.id AND estado = 'EMITIDO') as ultimo_pago_fecha,
        (SELECT total FROM siac_recibos WHERE cliente_id = c.id AND estado = 'EMITIDO' ORDER BY fecha DESC LIMIT 1)::DECIMAL(15,2) as ultimo_pago_monto
    FROM siac_clientes c
    LEFT JOIN siac_cuenta_corriente_resumen r ON r.cliente_id = c.id
    WHERE c.id = p_cliente_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar historial de cheques autom\u00e1ticamente
CREATE OR REPLACE FUNCTION siac_trigger_cheque_historial()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO siac_cheques_historial (
            cheque_id, estado_anterior, estado_nuevo, operacion,
            usuario_id, monto, fecha_vencimiento, banco
        ) VALUES (
            NEW.id, OLD.estado, NEW.estado,
            CASE
                WHEN NEW.estado = 'DEPOSITADO' THEN 'DEPOSITO'
                WHEN NEW.estado = 'COBRADO' THEN 'COBRO'
                WHEN NEW.estado = 'RECHAZADO' THEN 'RECHAZO'
                WHEN NEW.estado = 'ENDOSADO' THEN 'ENDOSO'
                WHEN NEW.estado = 'ANULADO' THEN 'ANULACION'
                WHEN NEW.estado = 'DEVUELTO' THEN 'DEVOLUCION'
                ELSE 'CAMBIO_ESTADO'
            END,
            COALESCE(NEW.updated_by, 1),
            NEW.monto,
            NEW.fecha_vencimiento,
            NEW.banco
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trg_cheque_historial ON siac_cheques_cartera;
CREATE TRIGGER trg_cheque_historial
    AFTER UPDATE ON siac_cheques_cartera
    FOR EACH ROW
    EXECUTE FUNCTION siac_trigger_cheque_historial();

-- Función para obtener config de cheques diferidos (GENERAL + EXCEPCIÓN por cliente)
CREATE OR REPLACE FUNCTION siac_get_config_cheques_diferidos(
    p_cliente_id INTEGER
) RETURNS TABLE (
    plazo_maximo_dias INTEGER,
    interes_mensual DECIMAL(5,2),
    fuente VARCHAR(20) -- 'CLIENTE' o 'GENERAL'
) AS $$
DECLARE
    v_cliente RECORD;
    v_config RECORD;
    v_company_id INTEGER;
BEGIN
    -- Obtener company_id del cliente
    SELECT company_id INTO v_company_id FROM siac_clientes WHERE id = p_cliente_id;

    -- Buscar config particular del cliente
    SELECT * INTO v_cliente
    FROM siac_clientes_config
    WHERE cliente_id = p_cliente_id;

    -- Buscar config general de la empresa
    SELECT * INTO v_config
    FROM siac_config_cuenta_corriente
    WHERE company_id = v_company_id;

    -- Prioridad: Cliente > General > Default
    RETURN QUERY SELECT
        COALESCE(v_cliente.plazo_maximo_cheques_diferidos, v_config.plazo_maximo_cheques_diferidos, 30)::INTEGER,
        COALESCE(v_cliente.interes_mensual_cheques_diferidos, v_config.interes_mensual_cheques_diferidos, 0)::DECIMAL(5,2),
        CASE
            WHEN v_cliente.plazo_maximo_cheques_diferidos IS NOT NULL THEN 'CLIENTE'::VARCHAR(20)
            ELSE 'GENERAL'::VARCHAR(20)
        END;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener config de intereses mora (GENERAL + EXCEPCIÓN por cliente)
CREATE OR REPLACE FUNCTION siac_get_config_intereses_mora(
    p_cliente_id INTEGER
) RETURNS TABLE (
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
            WHEN v_cliente.tasa_interes_diaria_custom IS NOT NULL
              OR v_cliente.tasa_interes_mensual_custom IS NOT NULL THEN 'CLIENTE'::VARCHAR(20)
            ELSE 'GENERAL'::VARCHAR(20)
        END;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener exenciones de retenciones de un cliente
CREATE OR REPLACE FUNCTION siac_get_exenciones_retenciones(
    p_cliente_id INTEGER
) RETURNS TABLE (
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
        RETURN QUERY SELECT
            false::BOOLEAN, false::BOOLEAN, false::BOOLEAN,
            NULL::VARCHAR(50), false::BOOLEAN, NULL::VARCHAR(50);
        RETURN;
    END IF;

    RETURN QUERY SELECT
        COALESCE(v_cliente.exento_retencion_iva, false)::BOOLEAN,
        COALESCE(v_cliente.exento_retencion_ganancias, false)::BOOLEAN,
        COALESCE(v_cliente.exento_retencion_iibb, false)::BOOLEAN,
        v_cliente.certificado_exencion_numero,
        (v_cliente.certificado_exencion_vencimiento IS NULL OR v_cliente.certificado_exencion_vencimiento >= CURRENT_DATE)::BOOLEAN,
        v_cliente.jurisdiccion_iibb;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular retenciones automáticas basadas en TaxTemplate
CREATE OR REPLACE FUNCTION siac_calcular_retenciones_automaticas(
    p_cliente_id INTEGER,
    p_monto_base DECIMAL(15,2),
    p_company_id INTEGER
) RETURNS TABLE (
    tipo_retencion VARCHAR(30),
    descripcion VARCHAR(200),
    base_imponible DECIMAL(15,2),
    porcentaje DECIMAL(5,2),
    monto_retenido DECIMAL(15,2)
) AS $$
DECLARE
    v_config RECORD;
    v_exenciones RECORD;
    v_concept RECORD;
    v_rate RECORD;
BEGIN
    -- Obtener config de la empresa
    SELECT * INTO v_config FROM siac_config_cuenta_corriente WHERE company_id = p_company_id;

    -- Si no aplica retenciones automáticas, retornar vacío
    IF NOT COALESCE(v_config.aplica_retenciones_automaticas, false) THEN
        RETURN;
    END IF;

    -- Obtener exenciones del cliente
    SELECT * INTO v_exenciones FROM siac_get_exenciones_retenciones(p_cliente_id);

    -- Buscar conceptos de retención en TaxTemplate
    FOR v_concept IN (
        SELECT tc.* FROM tax_concepts tc
        JOIN tax_templates tt ON tc.tax_template_id = tt.id
        WHERE tt.id = v_config.tax_template_id
          AND tc.is_active = true
          AND tc.concept_type = 'retention'
        ORDER BY tc.calculation_order
    ) LOOP
        -- Verificar exenciones
        IF v_concept.concept_code = 'RET_IVA' AND v_exenciones.exento_iva THEN
            CONTINUE;
        END IF;
        IF v_concept.concept_code = 'RET_GANANCIAS' AND v_exenciones.exento_ganancias THEN
            CONTINUE;
        END IF;
        IF v_concept.concept_code = 'RET_IIBB' AND v_exenciones.exento_iibb THEN
            CONTINUE;
        END IF;

        -- Obtener alícuota default del concepto
        SELECT * INTO v_rate
        FROM tax_rates
        WHERE tax_concept_id = v_concept.id
          AND is_active = true
          AND is_default = true
        LIMIT 1;

        IF FOUND THEN
            RETURN QUERY SELECT
                v_concept.concept_code::VARCHAR(30),
                v_concept.concept_name::VARCHAR(200),
                p_monto_base,
                v_rate.rate_percentage::DECIMAL(5,2),
                ROUND(p_monto_base * v_rate.rate_percentage / 100, 2)::DECIMAL(15,2);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE siac_medios_pago IS 'Catálogo de medios de pago configurables por empresa con beneficios/recargos';
COMMENT ON TABLE siac_anulaciones_log IS 'Log completo de anulaciones con trazabilidad de impacto en caja, CCC y cheques';
COMMENT ON TABLE siac_cheques_historial IS 'Historial de cambios de estado de cheques para trazabilidad completa';
COMMENT ON TABLE siac_recibos_retenciones IS 'Retenciones aplicadas por recibo (IVA, Ganancias, IIBB, etc.)';
COMMENT ON TABLE siac_config_cuenta_corriente IS 'Configuración GENERAL de cuenta corriente por empresa';
COMMENT ON TABLE siac_clientes_config IS 'Configuración PARTICULAR de cliente (excepciones a reglas generales)';

COMMENT ON FUNCTION siac_crear_medios_pago_default IS 'Crea medios de pago por defecto para una empresa nueva';
COMMENT ON FUNCTION siac_calcular_monto_con_medio_pago IS 'Calcula monto final aplicando descuento/recargo del medio de pago';
COMMENT ON FUNCTION siac_resumen_cuenta_cliente IS 'Obtiene resumen completo de cuenta corriente de un cliente';
COMMENT ON FUNCTION siac_get_config_cheques_diferidos IS 'Obtiene config de cheques diferidos priorizando CLIENTE > GENERAL';
COMMENT ON FUNCTION siac_get_config_intereses_mora IS 'Obtiene config de intereses priorizando CLIENTE > GENERAL';
COMMENT ON FUNCTION siac_get_exenciones_retenciones IS 'Obtiene exenciones de retenciones de un cliente';
COMMENT ON FUNCTION siac_calcular_retenciones_automaticas IS 'Calcula retenciones automáticas basadas en TaxTemplate del país';
