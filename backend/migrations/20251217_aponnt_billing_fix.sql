/**
 * ============================================================================
 * MIGRACIÓN: Fix de Integración APONNT Billing
 * ============================================================================
 *
 * Corrige los errores de la migración anterior:
 * 1. Actualiza aponnt_email_config existente con nuevos tipos
 * 2. Crea aponnt_pre_invoices con UUID (contracts.id es UUID)
 * 3. Crea vista de pre-facturas
 *
 * Created: 2025-12-17
 */

\echo ''
\echo '🔧 [APONNT BILLING FIX] Aplicando correcciones...'
\echo ''

-- ============================================
-- 1. ACTUALIZAR aponnt_email_config
-- ============================================

\echo '📧 Actualizando tipos de email permitidos...'

-- Remover constraint actual
ALTER TABLE aponnt_email_config DROP CONSTRAINT IF EXISTS chk_aponnt_config_type;

-- Agregar constraint con todos los tipos
ALTER TABLE aponnt_email_config ADD CONSTRAINT chk_aponnt_config_type
CHECK (config_type IN (
    'transactional',
    'marketing',
    'support',
    'billing',
    'institutional',
    'support_coordinator',
    'commercial',
    'engineering',
    'associates'
));

-- Insertar/actualizar configuraciones de email de APONNT
\echo '📧 Insertando emails de APONNT...'

-- Commercial
INSERT INTO aponnt_email_config (config_type, from_email, from_name, reply_to, smtp_host, smtp_port, smtp_user, smtp_password, is_active)
VALUES ('commercial', 'aponntcomercial@gmail.com', 'APONNT Comercial', 'aponntcomercial@gmail.com',
        'smtp.gmail.com', 587, 'aponntcomercial@gmail.com', '', true)
ON CONFLICT (config_type) DO UPDATE SET
    from_email = EXCLUDED.from_email,
    from_name = EXCLUDED.from_name,
    updated_at = CURRENT_TIMESTAMP;

-- Engineering
INSERT INTO aponnt_email_config (config_type, from_email, from_name, reply_to, smtp_host, smtp_port, smtp_user, smtp_password, is_active)
VALUES ('engineering', 'aponntingenieria@gmail.com', 'APONNT Ingeniería', 'aponntingenieria@gmail.com',
        'smtp.gmail.com', 587, 'aponntingenieria@gmail.com', '', true)
ON CONFLICT (config_type) DO UPDATE SET
    from_email = EXCLUDED.from_email,
    from_name = EXCLUDED.from_name,
    updated_at = CURRENT_TIMESTAMP;

-- Associates
INSERT INTO aponnt_email_config (config_type, from_email, from_name, reply_to, smtp_host, smtp_port, smtp_user, smtp_password, is_active)
VALUES ('associates', 'aponntasociados@gmail.com', 'APONNT Asociados', 'aponntasociados@gmail.com',
        'smtp.gmail.com', 587, 'aponntasociados@gmail.com', '', true)
ON CONFLICT (config_type) DO UPDATE SET
    from_email = EXCLUDED.from_email,
    from_name = EXCLUDED.from_name,
    updated_at = CURRENT_TIMESTAMP;

-- Actualizar support_coordinator con el email correcto
UPDATE aponnt_email_config
SET from_email = 'aponntcoordinacionsoporte@gmail.com',
    from_name = 'APONNT Soporte',
    reply_to = 'aponntcoordinacionsoporte@gmail.com',
    updated_at = CURRENT_TIMESTAMP
WHERE config_type = 'support_coordinator';

\echo '   ✅ Emails de APONNT actualizados'

-- ============================================
-- 2. CREAR aponnt_pre_invoices (con UUID)
-- ============================================

\echo '📄 Creando tabla aponnt_pre_invoices...'

DROP TABLE IF EXISTS aponnt_pre_invoices CASCADE;

CREATE TABLE aponnt_pre_invoices (
    id SERIAL PRIMARY KEY,

    -- REFERENCIA AL CONTRATO Y PRESUPUESTO (UUID)
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    -- CÓDIGO ÚNICO
    pre_invoice_code VARCHAR(50) NOT NULL,

    -- DATOS DEL CLIENTE (copiados del contrato para inmutabilidad)
    cliente_cuit VARCHAR(15) NOT NULL,
    cliente_razon_social VARCHAR(255) NOT NULL,
    cliente_condicion_iva VARCHAR(50) NOT NULL DEFAULT 'RI',
    cliente_domicilio_fiscal TEXT,
    cliente_email VARCHAR(255),

    -- DETALLE DE ITEMS (JSON con módulos contratados)
    items JSONB NOT NULL DEFAULT '[]',

    -- PERÍODO FACTURADO
    periodo_desde DATE NOT NULL,
    periodo_hasta DATE NOT NULL,

    -- TOTALES
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_importe DECIMAL(15,2) DEFAULT 0,
    neto_gravado DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva_21 DECIMAL(15,2) DEFAULT 0,
    iva_10_5 DECIMAL(15,2) DEFAULT 0,
    iva_27 DECIMAL(15,2) DEFAULT 0,
    otros_impuestos DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- CONDICIÓN DE VENTA
    condicion_venta VARCHAR(50) DEFAULT 'CTA_CTE',

    -- ESTADO DEL FLUJO
    status VARCHAR(50) DEFAULT 'PENDING_REVIEW',

    -- SI FUE FACTURADA
    invoice_id INTEGER,
    invoiced_at TIMESTAMP,
    invoiced_by INTEGER,

    -- SI FUE RECHAZADA
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    rejected_by INTEGER,

    -- OBSERVACIONES
    observations TEXT,
    admin_notes TEXT,

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',

    -- CONSTRAINTS
    CONSTRAINT unique_pre_invoice_code UNIQUE (pre_invoice_code),
    CONSTRAINT valid_periodo CHECK (periodo_hasta >= periodo_desde),
    CONSTRAINT valid_pre_invoice_status CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'INVOICED', 'REJECTED', 'CANCELLED'))
);

CREATE INDEX idx_pre_invoice_company ON aponnt_pre_invoices(company_id);
CREATE INDEX idx_pre_invoice_contract ON aponnt_pre_invoices(contract_id);
CREATE INDEX idx_pre_invoice_status ON aponnt_pre_invoices(status);
CREATE INDEX idx_pre_invoice_code ON aponnt_pre_invoices(pre_invoice_code);

\echo '   ✅ Tabla aponnt_pre_invoices creada'

-- Trigger updated_at
DROP TRIGGER IF EXISTS trigger_pre_invoices_updated ON aponnt_pre_invoices;
CREATE TRIGGER trigger_pre_invoices_updated
    BEFORE UPDATE ON aponnt_pre_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_aponnt_tables_timestamp();

-- ============================================
-- 3. ACTUALIZAR FUNCIÓN create_pre_invoice_from_contract
-- ============================================

\echo '🔧 Actualizando función create_pre_invoice_from_contract...'

CREATE OR REPLACE FUNCTION create_pre_invoice_from_contract(
    p_contract_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_contract RECORD;
    v_budget RECORD;
    v_company RECORD;
    v_pre_invoice_id INTEGER;
    v_code VARCHAR;
    v_items JSONB;
    v_subtotal DECIMAL(15,2);
    v_iva DECIMAL(15,2);
    v_total DECIMAL(15,2);
BEGIN
    -- Obtener datos del contrato
    SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contrato % no encontrado', p_contract_id;
    END IF;

    -- Obtener datos del presupuesto
    SELECT * INTO v_budget FROM budgets WHERE id = v_contract.budget_id;

    -- Obtener datos de la empresa
    SELECT * INTO v_company FROM companies WHERE company_id = v_contract.company_id;

    -- Generar código
    v_code := generate_pre_invoice_code();

    -- Usar items del presupuesto/contrato
    v_items := COALESCE(v_contract.selected_modules, v_budget.modules_detail, '[]'::jsonb);
    v_subtotal := COALESCE(v_contract.total_monthly, v_budget.subtotal, 0);
    v_iva := ROUND(v_subtotal * 0.21, 2);  -- 21% IVA
    v_total := v_subtotal + v_iva;

    -- Insertar pre-factura
    INSERT INTO aponnt_pre_invoices (
        contract_id,
        budget_id,
        company_id,
        pre_invoice_code,
        cliente_cuit,
        cliente_razon_social,
        cliente_condicion_iva,
        cliente_domicilio_fiscal,
        cliente_email,
        items,
        periodo_desde,
        periodo_hasta,
        subtotal,
        neto_gravado,
        iva_21,
        total,
        condicion_venta,
        status
    ) VALUES (
        p_contract_id,
        v_contract.budget_id,
        v_contract.company_id,
        v_code,
        COALESCE(v_company.tax_id, '00-00000000-0'),
        COALESCE(v_company.legal_name, v_company.name),
        COALESCE(v_budget.client_fiscal_condition, 'RI'),
        v_company.address,
        v_company.contact_email,
        v_items,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 month' - INTERVAL '1 day',
        v_subtotal,
        v_subtotal,
        v_iva,
        v_total,
        'CTA_CTE',
        'PENDING_REVIEW'
    )
    RETURNING id INTO v_pre_invoice_id;

    -- Crear tarea administrativa
    INSERT INTO aponnt_admin_tasks (
        task_code,
        task_type,
        priority,
        due_date,
        entity_type,
        entity_id,
        company_id,
        title,
        description,
        assigned_role,
        status
    ) VALUES (
        generate_admin_task_code('PRE_INVOICE_PENDING'),
        'PRE_INVOICE_PENDING',
        'HIGH',
        CURRENT_TIMESTAMP + INTERVAL '2 days',
        'pre_invoice',
        v_pre_invoice_id,
        v_contract.company_id,
        'Pre-factura pendiente: ' || v_company.name,
        'Contrato firmado. Pre-factura generada automáticamente. Total: $' || v_total::TEXT,
        'finance',
        'PENDING'
    );

    RETURN v_pre_invoice_id;
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Función actualizada'

-- ============================================
-- 4. CREAR VISTA v_pending_pre_invoices
-- ============================================

\echo '👁️ Creando vista v_pending_pre_invoices...'

DROP VIEW IF EXISTS v_pending_pre_invoices;

CREATE VIEW v_pending_pre_invoices AS
SELECT
    pi.id,
    pi.pre_invoice_code,
    pi.company_id,
    c.name AS company_name,
    c.slug AS company_slug,
    pi.cliente_razon_social,
    pi.cliente_cuit,
    pi.periodo_desde,
    pi.periodo_hasta,
    pi.subtotal,
    pi.iva_21,
    pi.total,
    pi.status,
    pi.created_at,
    pi.contract_id,
    con.contract_code AS contract_number
FROM aponnt_pre_invoices pi
JOIN companies c ON pi.company_id = c.company_id
LEFT JOIN contracts con ON pi.contract_id = con.id
WHERE pi.status IN ('PENDING_REVIEW', 'APPROVED')
ORDER BY
    CASE pi.status
        WHEN 'PENDING_REVIEW' THEN 1
        WHEN 'APPROVED' THEN 2
    END,
    pi.created_at DESC;

\echo '   ✅ Vista creada'

-- ============================================
-- 5. FUNCIÓN get_aponnt_email MEJORADA
-- ============================================

\echo '🔧 Mejorando función get_aponnt_email...'

DROP FUNCTION IF EXISTS get_aponnt_email(VARCHAR);

CREATE OR REPLACE FUNCTION get_aponnt_email(p_config_type VARCHAR)
RETURNS TABLE (
    email_address VARCHAR,
    display_name VARCHAR,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        aec.from_email::VARCHAR AS email_address,
        aec.from_name::VARCHAR AS display_name,
        aec.is_active
    FROM aponnt_email_config aec
    WHERE aec.config_type = p_config_type
      AND aec.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Función mejorada'

-- ============================================
-- RESUMEN
-- ============================================

\echo ''
\echo '✅ [APONNT BILLING FIX] Correcciones aplicadas exitosamente'
\echo ''
\echo '📧 Verificar emails configurados:'

SELECT config_type, from_email, from_name, is_active
FROM aponnt_email_config
ORDER BY config_type;

\echo ''
\echo '📊 Verificar tablas:'
\echo ''

SELECT 'aponnt_pre_invoices' AS tabla, COUNT(*) AS registros FROM aponnt_pre_invoices
UNION ALL
SELECT 'aponnt_admin_tasks', COUNT(*) FROM aponnt_admin_tasks
UNION ALL
SELECT 'aponnt_email_config', COUNT(*) FROM aponnt_email_config;

\echo ''
