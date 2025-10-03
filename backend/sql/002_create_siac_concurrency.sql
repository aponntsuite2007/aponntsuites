-- ========================================
-- SIAC CONCURRENCY - TABLAS DE CONCURRENCIA
-- Solución a 20 años de limitaciones de Access
-- ========================================

-- Tabla de sesiones locales por terminal
CREATE TABLE IF NOT EXISTS siac_sesiones_locales (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    -- IDENTIFICACIÓN ÚNICA DE SESIÓN
    session_id VARCHAR(100) UNIQUE NOT NULL,
    terminal_id VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL,

    -- DATOS TEMPORALES DE LA SESIÓN (JSONB para flexibilidad)
    facturacion_temp JSONB DEFAULT '[]',
    recibos_temp JSONB DEFAULT '[]',
    ordenes_pago_temp JSONB DEFAULT '[]',
    otros_temp JSONB DEFAULT '{}',

    -- CONTROL DE CONCURRENCIA
    is_active BOOLEAN DEFAULT true,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONFIGURACIÓN LOCAL ESPECÍFICA DEL TERMINAL
    configuracion_local JSONB DEFAULT '{}',

    -- INFORMACIÓN DE CONEXIÓN
    ip_address INET,
    user_agent TEXT,

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINTS
    UNIQUE(company_id, terminal_id, is_active) -- Solo una sesión activa por terminal
);

-- Tabla de log de numeración para auditoría completa
CREATE TABLE IF NOT EXISTS siac_numeracion_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    -- DATOS DE NUMERACIÓN
    tipo_comprobante VARCHAR(50) NOT NULL,
    numero_asignado INTEGER NOT NULL,
    numero_anterior INTEGER,

    -- INFORMACIÓN DE SESIÓN
    session_id VARCHAR(100),
    user_id INTEGER,
    terminal_id VARCHAR(50),

    -- TIMESTAMP PRECISO
    timestamp_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- INFORMACIÓN DE CONEXIÓN PARA DEBUGGING
    ip_address INET,
    user_agent TEXT,

    -- DATOS ADICIONALES
    metadata JSONB DEFAULT '{}',

    -- ÍNDICES AUTOMÁTICOS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de transacciones en curso (para recovery)
CREATE TABLE IF NOT EXISTS siac_transacciones_pendientes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    session_id VARCHAR(100) NOT NULL,

    -- DATOS DE LA TRANSACCIÓN
    tipo_operacion VARCHAR(50) NOT NULL, -- 'factura', 'recibo', 'orden_pago'
    estado VARCHAR(20) DEFAULT 'INICIADA', -- 'INICIADA', 'EN_PROCESO', 'COMPLETADA', 'ERROR'

    -- DATOS DE LA OPERACIÓN
    datos_operacion JSONB NOT NULL,
    numero_comprobante INTEGER,

    -- TIMESTAMPS
    iniciada_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completada_at TIMESTAMP,

    -- ERROR HANDLING
    error_message TEXT,
    reintentos INTEGER DEFAULT 0,

    -- METADATOS
    metadata JSONB DEFAULT '{}'
);

-- Tabla de configuración por terminal
CREATE TABLE IF NOT EXISTS siac_configuracion_terminal (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    terminal_id VARCHAR(50) NOT NULL,

    -- CONFIGURACIÓN ESPECÍFICA DEL TERMINAL
    nombre_terminal VARCHAR(100),
    tipo_terminal VARCHAR(30) DEFAULT 'CAJA', -- 'CAJA', 'MOSTRADOR', 'DEPOSITO'

    -- CONFIGURACIÓN DE HARDWARE
    impresora_principal VARCHAR(100),
    impresora_tickets VARCHAR(100),
    display_cliente VARCHAR(100),
    lector_codigo_barras VARCHAR(100),

    -- CONFIGURACIÓN DE SOFTWARE
    modulos_habilitados JSONB DEFAULT '[]',
    permisos_especiales JSONB DEFAULT '{}',

    -- CONFIGURACIÓN FISCAL
    punto_venta_asignado INTEGER,
    certificado_fiscal VARCHAR(255),

    -- ESTADO
    activo BOOLEAN DEFAULT true,
    ultimo_uso TIMESTAMP,

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINTS
    UNIQUE(company_id, terminal_id)
);

-- Crear índices para optimización de consultas concurrentes
CREATE INDEX IF NOT EXISTS idx_siac_sesiones_company_active
    ON siac_sesiones_locales(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_siac_sesiones_terminal_active
    ON siac_sesiones_locales(terminal_id, is_active);

CREATE INDEX IF NOT EXISTS idx_siac_sesiones_last_activity
    ON siac_sesiones_locales(last_activity);

CREATE INDEX IF NOT EXISTS idx_siac_sesiones_session_id
    ON siac_sesiones_locales(session_id);

CREATE INDEX IF NOT EXISTS idx_siac_numeracion_company_tipo
    ON siac_numeracion_log(company_id, tipo_comprobante);

CREATE INDEX IF NOT EXISTS idx_siac_numeracion_timestamp
    ON siac_numeracion_log(timestamp_asignacion);

CREATE INDEX IF NOT EXISTS idx_siac_transacciones_session_estado
    ON siac_transacciones_pendientes(session_id, estado);

CREATE INDEX IF NOT EXISTS idx_siac_configuracion_terminal_company
    ON siac_configuracion_terminal(company_id, activo);

-- Función para cleanup automático de sesiones inactivas
CREATE OR REPLACE FUNCTION cleanup_sesiones_inactivas()
RETURNS INTEGER AS $$
DECLARE
    sesiones_cerradas INTEGER := 0;
BEGIN
    -- Cerrar sesiones inactivas (más de 2 horas sin actividad)
    UPDATE siac_sesiones_locales
    SET
        is_active = false,
        updated_at = CURRENT_TIMESTAMP,
        configuracion_local = configuracion_local || '{"motivo_cierre": "timeout_inactividad", "fecha_cierre": "' || CURRENT_TIMESTAMP || '"}'
    WHERE
        is_active = true
        AND last_activity < (CURRENT_TIMESTAMP - INTERVAL '2 hours');

    GET DIAGNOSTICS sesiones_cerradas = ROW_COUNT;

    RETURN sesiones_cerradas;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener próximo número de forma segura (con lock)
CREATE OR REPLACE FUNCTION obtener_proximo_numero_seguro(
    p_company_id INTEGER,
    p_tipo_comprobante VARCHAR(50),
    p_session_id VARCHAR(100),
    p_user_id INTEGER,
    p_terminal_id VARCHAR(50)
)
RETURNS TABLE(numero_asignado INTEGER, siguiente_numero INTEGER) AS $$
DECLARE
    v_numero_actual INTEGER;
    v_siguiente_numero INTEGER;
    v_campo_numeracion VARCHAR(50);
BEGIN
    -- Determinar el campo de numeración según el tipo
    CASE p_tipo_comprobante
        WHEN 'facturaA' THEN v_campo_numeracion := 'factura_a_numero';
        WHEN 'facturaB' THEN v_campo_numeracion := 'factura_b_numero';
        WHEN 'facturaC' THEN v_campo_numeracion := 'factura_c_numero';
        WHEN 'recibo' THEN v_campo_numeracion := 'recibo_numero';
        WHEN 'remito' THEN v_campo_numeracion := 'remito_numero';
        ELSE RAISE EXCEPTION 'Tipo de comprobante no válido: %', p_tipo_comprobante;
    END CASE;

    -- Obtener y actualizar número de forma atómica
    EXECUTE format('
        UPDATE siac_configuracion_empresa
        SET %I = %I + 1, updated_at = CURRENT_TIMESTAMP
        WHERE company_id = $1
        RETURNING %I - 1, %I
    ', v_campo_numeracion, v_campo_numeracion, v_campo_numeracion, v_campo_numeracion)
    USING p_company_id
    INTO v_numero_actual, v_siguiente_numero;

    -- Si no se encontró la empresa, error
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configuración de empresa no encontrada: %', p_company_id;
    END IF;

    -- Registrar en log de auditoría
    INSERT INTO siac_numeracion_log (
        company_id, tipo_comprobante, numero_asignado, numero_anterior,
        session_id, user_id, terminal_id
    ) VALUES (
        p_company_id, p_tipo_comprobante, v_numero_actual, v_numero_actual - 1,
        p_session_id, p_user_id, p_terminal_id
    );

    -- Retornar resultado
    RETURN QUERY SELECT v_numero_actual, v_siguiente_numero;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en sesiones
CREATE OR REPLACE FUNCTION update_sesiones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sesiones_updated_at
    BEFORE UPDATE ON siac_sesiones_locales
    FOR EACH ROW EXECUTE FUNCTION update_sesiones_updated_at();

CREATE TRIGGER trigger_update_configuracion_terminal_updated_at
    BEFORE UPDATE ON siac_configuracion_terminal
    FOR EACH ROW EXECUTE FUNCTION update_sesiones_updated_at();

-- Insertar configuraciones de terminales por defecto
INSERT INTO siac_configuracion_terminal (company_id, terminal_id, nombre_terminal, tipo_terminal) VALUES
(21, 'CAJA_01', 'Caja Principal 01', 'CAJA'),
(21, 'CAJA_02', 'Caja Principal 02', 'CAJA'),
(21, 'MOSTRADOR_01', 'Mostrador Ventas', 'MOSTRADOR'),
(21, 'DEPOSITO_01', 'Terminal Depósito', 'DEPOSITO')
ON CONFLICT (company_id, terminal_id) DO NOTHING;