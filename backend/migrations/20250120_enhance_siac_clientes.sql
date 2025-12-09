/**
 * ============================================================================
 * MIGRACIÓN: Mejorar siac_clientes - Multi-País + Condiciones Comerciales
 * ============================================================================
 *
 * Agrega campos necesarios para gestión comercial completa y multi-país:
 * - Dirección completa (país, provincia, localidad, calle, número, piso, dto, código postal)
 * - Condición fiscal (parametrizable por país vía tax_templates)
 * - Condiciones comerciales (cuenta corriente, plazo, crédito máximo, bloqueos)
 *
 * Created: 2025-01-20
 */

\echo ''
\echo '🏢 [SIAC-CLIENTES] Mejorando tabla siac_clientes...'
\echo ''

-- ============================================
-- CAMPOS DE DIRECCIÓN COMPLETA
-- ============================================

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS pais VARCHAR(100) DEFAULT 'Argentina';

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS provincia VARCHAR(100);

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS localidad VARCHAR(100);

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS calle VARCHAR(200);

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS numero VARCHAR(20);

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS piso VARCHAR(10);

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS departamento VARCHAR(10);

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(20);

-- Coordenadas GPS (opcional)
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS latitud NUMERIC(10,8);

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS longitud NUMERIC(11,8);

\echo '   ✅ Campos de dirección agregados'

-- ============================================
-- CONDICIÓN FISCAL (parametrizable por país)
-- ============================================

-- Condición fiscal del cliente (ej: en Argentina: RI, RM, CF, EX)
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS condicion_fiscal VARCHAR(50);

-- Código de condición fiscal (referencia a tax_conditions.code)
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS condicion_fiscal_code VARCHAR(20);

\echo '   ✅ Campos de condición fiscal agregados'

-- ============================================
-- CONDICIONES COMERCIALES
-- ============================================

-- Cuenta corriente habilitada (sí/no)
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS cuenta_corriente_habilitada BOOLEAN DEFAULT false;

-- Plazo de pago en días (ej: 30, 60, 90)
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS plazo_pago_dias INTEGER DEFAULT 0;

-- Crédito máximo disponible
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS credito_maximo NUMERIC(12,2) DEFAULT 0;

-- Crédito utilizado actual
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS credito_utilizado NUMERIC(12,2) DEFAULT 0;

-- Crédito disponible (calculado: maximo - utilizado)
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS credito_disponible NUMERIC(12,2) DEFAULT 0;

-- Bloquear facturación por vencimiento de plazo
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS bloqueo_por_vencimiento BOOLEAN DEFAULT false;

-- Bloquear facturación por exceso de crédito
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS bloqueo_por_credito BOOLEAN DEFAULT false;

-- Fecha de último análisis crediticio
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS fecha_ultimo_analisis DATE;

-- Observaciones crediticias
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS observaciones_credito TEXT;

\echo '   ✅ Campos de condiciones comerciales agregados'

-- ============================================
-- DATOS BANCARIOS (opcional)
-- ============================================

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS banco VARCHAR(100);

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS tipo_cuenta VARCHAR(50); -- Cuenta corriente, Caja de ahorro

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS numero_cuenta VARCHAR(50);

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS cbu VARCHAR(22); -- Argentina

ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS alias_cbu VARCHAR(100); -- Argentina

\echo '   ✅ Campos bancarios agregados'

-- ============================================
-- CAMPOS ADICIONALES
-- ============================================

-- Categoría del cliente (A, B, C según volumen de compra)
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS categoria_cliente VARCHAR(10) DEFAULT 'B';

-- Descuento general aplicable (%)
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS descuento_general NUMERIC(5,2) DEFAULT 0;

-- Lista de precios asignada
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS lista_precios_id INTEGER;

-- Vendedor asignado
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS vendedor_id INTEGER;

-- Zona/Ruta comercial
ALTER TABLE siac_clientes
ADD COLUMN IF NOT EXISTS zona_comercial VARCHAR(100);

\echo '   ✅ Campos adicionales agregados'

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clientes_pais ON siac_clientes(pais);
CREATE INDEX IF NOT EXISTS idx_clientes_provincia ON siac_clientes(provincia);
CREATE INDEX IF NOT EXISTS idx_clientes_condicion_fiscal ON siac_clientes(condicion_fiscal_code);
CREATE INDEX IF NOT EXISTS idx_clientes_cuenta_corriente ON siac_clientes(cuenta_corriente_habilitada) WHERE cuenta_corriente_habilitada = true;
CREATE INDEX IF NOT EXISTS idx_clientes_bloqueados ON siac_clientes(bloqueo_por_vencimiento, bloqueo_por_credito);
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor ON siac_clientes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_zona ON siac_clientes(zona_comercial);

\echo '   ✅ Índices creados'

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para calcular crédito disponible automáticamente
CREATE OR REPLACE FUNCTION calculate_credito_disponible()
RETURNS TRIGGER AS $$
BEGIN
    NEW.credito_disponible := NEW.credito_maximo - NEW.credito_utilizado;

    -- Bloquear si excede crédito
    IF NEW.credito_disponible < 0 THEN
        NEW.bloqueo_por_credito := true;
    ELSE
        NEW.bloqueo_por_credito := false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_credito ON siac_clientes;
CREATE TRIGGER trigger_calculate_credito
    BEFORE INSERT OR UPDATE OF credito_maximo, credito_utilizado ON siac_clientes
    FOR EACH ROW
    EXECUTE FUNCTION calculate_credito_disponible();

\echo '   ✅ Trigger de cálculo de crédito creado'

-- ============================================
-- FUNCIONES HELPER
-- ============================================

-- Función para verificar si cliente puede facturar
CREATE OR REPLACE FUNCTION puede_facturar_cliente(p_cliente_id INTEGER, p_monto NUMERIC)
RETURNS TABLE (
    puede_facturar BOOLEAN,
    motivo_bloqueo TEXT,
    credito_disponible NUMERIC
) AS $$
DECLARE
    v_cliente RECORD;
BEGIN
    SELECT * INTO v_cliente
    FROM siac_clientes
    WHERE id = p_cliente_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Cliente no encontrado'::TEXT, 0::NUMERIC;
        RETURN;
    END IF;

    -- Verificar bloqueo por vencimiento
    IF v_cliente.bloqueo_por_vencimiento THEN
        RETURN QUERY SELECT false, 'Cliente bloqueado por vencimiento de plazo'::TEXT, v_cliente.credito_disponible;
        RETURN;
    END IF;

    -- Verificar bloqueo por crédito
    IF v_cliente.bloqueo_por_credito THEN
        RETURN QUERY SELECT false, 'Cliente bloqueado por exceso de crédito'::TEXT, v_cliente.credito_disponible;
        RETURN;
    END IF;

    -- Verificar si tiene cuenta corriente habilitada
    IF v_cliente.cuenta_corriente_habilitada THEN
        -- Verificar si el monto excede crédito disponible
        IF (v_cliente.credito_disponible - p_monto) < 0 THEN
            RETURN QUERY SELECT false, 'Monto excede crédito disponible'::TEXT, v_cliente.credito_disponible;
            RETURN;
        END IF;
    END IF;

    -- Todo OK
    RETURN QUERY SELECT true, NULL::TEXT, v_cliente.credito_disponible;
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Función puede_facturar_cliente creada'

-- ============================================
-- COMENTARIOS EN CAMPOS (DOCUMENTACIÓN)
-- ============================================

COMMENT ON COLUMN siac_clientes.pais IS 'País del cliente (multi-país)';
COMMENT ON COLUMN siac_clientes.provincia IS 'Provincia/Estado del cliente';
COMMENT ON COLUMN siac_clientes.condicion_fiscal IS 'Condición fiscal parametrizable (ej: RI, RM, CF en Argentina)';
COMMENT ON COLUMN siac_clientes.condicion_fiscal_code IS 'Código de condición fiscal según tax_conditions';
COMMENT ON COLUMN siac_clientes.cuenta_corriente_habilitada IS 'Si tiene cuenta corriente habilitada';
COMMENT ON COLUMN siac_clientes.plazo_pago_dias IS 'Plazo de pago en días (30, 60, 90)';
COMMENT ON COLUMN siac_clientes.credito_maximo IS 'Crédito máximo disponible';
COMMENT ON COLUMN siac_clientes.credito_utilizado IS 'Crédito actualmente utilizado';
COMMENT ON COLUMN siac_clientes.credito_disponible IS 'Crédito disponible (auto-calculado)';
COMMENT ON COLUMN siac_clientes.bloqueo_por_vencimiento IS 'Bloqueado por vencimiento de plazo';
COMMENT ON COLUMN siac_clientes.bloqueo_por_credito IS 'Bloqueado por exceso de crédito';

\echo ''
\echo '✅ [SIAC-CLIENTES] Migración completada exitosamente'
\echo ''
\echo '📋 Campos agregados:'
\echo '   - Dirección completa (país, provincia, localidad, calle, número, piso, dto, CP)'
\echo '   - Condición fiscal parametrizable'
\echo '   - Condiciones comerciales (cuenta corriente, plazo, crédito)'
\echo '   - Datos bancarios (CBU, alias, cuenta)'
\echo '   - Categorización y zona comercial'
\echo ''
\echo '🔧 Funciones creadas:'
\echo '   - calculate_credito_disponible() - Trigger automático'
\echo '   - puede_facturar_cliente(id, monto) - Validación pre-facturación'
\echo ''
