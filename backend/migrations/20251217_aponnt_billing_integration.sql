/**
 * ============================================================================
 * MIGRACIÓN: Integración de Facturación APONNT
 * ============================================================================
 *
 * Esta migración extiende el sistema de facturación SIAC existente para que
 * APONNT pueda facturar a las empresas clientes, reutilizando la misma
 * infraestructura multi-tenant.
 *
 * ARQUITECTURA:
 * - Las empresas usan facturación SIAC para facturar a SUS clientes
 * - APONNT usa facturación SIAC para facturar A LAS EMPRESAS
 * - Misma infraestructura, mismo código, solo cambia el "company_id"
 *
 * TABLAS NUEVAS:
 * 1. aponnt_email_config - Emails parametrizados de APONNT
 * 2. aponnt_pre_invoices - Pre-facturas generadas desde contratos firmados
 * 3. aponnt_admin_tasks - Tareas administrativas pendientes (dashboard)
 *
 * Created: 2025-12-17
 */

\echo ''
\echo '🏢 [APONNT BILLING] Iniciando migración de integración de facturación...'
\echo ''

-- ============================================
-- 1. MARCAR APONNT COMO ENTIDAD MASTER
-- ============================================

\echo '📌 Agregando columna is_aponnt_master a companies...'

-- Agregar columna para identificar a APONNT como entidad facturadora
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS is_aponnt_master BOOLEAN DEFAULT false;

-- Marcar company_id = 1 como APONNT master (o crear si no existe)
UPDATE companies
SET is_aponnt_master = true,
    name = CASE
        WHEN name = 'APONNT - Empresa Demo UPDATED' THEN 'APONNT Suite'
        ELSE name
    END
WHERE company_id = 1;

-- Asegurar que solo hay UN aponnt master
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_aponnt_master
ON companies (is_aponnt_master)
WHERE is_aponnt_master = true;

COMMENT ON COLUMN companies.is_aponnt_master IS
'TRUE = Esta es la entidad APONNT que factura a las empresas clientes';

\echo '   ✅ Columna is_aponnt_master agregada'

-- ============================================
-- 2. TABLA: aponnt_email_config
-- Emails parametrizados de APONNT por tipo
-- ============================================

\echo '📧 Creando tabla aponnt_email_config...'

CREATE TABLE IF NOT EXISTS aponnt_email_config (
    id SERIAL PRIMARY KEY,

    -- IDENTIFICACIÓN
    email_type VARCHAR(50) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),

    -- CONFIGURACIÓN SMTP (si es diferente al default)
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_user VARCHAR(255),
    smtp_password_encrypted TEXT,
    smtp_secure BOOLEAN DEFAULT true,

    -- DESCRIPCIÓN Y USO
    description TEXT,
    used_for JSONB DEFAULT '[]',  -- ["presupuestos", "contratos", "tickets"]

    -- ESTADO
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINTS
    CONSTRAINT unique_email_type UNIQUE (email_type)
);

CREATE INDEX IF NOT EXISTS idx_aponnt_email_type ON aponnt_email_config(email_type);
CREATE INDEX IF NOT EXISTS idx_aponnt_email_active ON aponnt_email_config(is_active);

\echo '   ✅ Tabla aponnt_email_config creada'

-- Insertar configuración inicial de emails de APONNT
\echo '📧 Insertando emails iniciales de APONNT...'

INSERT INTO aponnt_email_config (email_type, email_address, display_name, description, used_for, is_active, is_default)
VALUES
    ('institutional', 'aponntsuite@gmail.com', 'APONNT Suite',
     'Mail institucional - NO para notificaciones automáticas del sistema',
     '["institucional", "comunicados_oficiales"]'::jsonb, true, false),

    ('commercial', 'aponntcomercial@gmail.com', 'APONNT Comercial',
     'Mail comercial - Presupuestos, contratos, alta de empresas, renovaciones',
     '["presupuestos", "contratos", "renovaciones", "empresas", "facturacion"]'::jsonb, true, true),

    ('support', 'aponntcoordinacionsoporte@gmail.com', 'APONNT Soporte',
     'Mail de soporte - Tickets de soporte técnico',
     '["tickets", "soporte", "incidencias"]'::jsonb, true, false),

    ('engineering', 'aponntingenieria@gmail.com', 'APONNT Ingeniería',
     'Mail de ingeniería - Comunicación entre staff de desarrollo',
     '["desarrollo", "bugs", "deployments", "staff_ingenieria"]'::jsonb, true, false),

    ('associates', 'aponntasociados@gmail.com', 'APONNT Asociados',
     'Mail de asociados - Comunicación con socios y asociados',
     '["asociados", "partners", "comisiones"]'::jsonb, true, false)
ON CONFLICT (email_type) DO UPDATE SET
    email_address = EXCLUDED.email_address,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    used_for = EXCLUDED.used_for,
    updated_at = CURRENT_TIMESTAMP;

\echo '   ✅ Emails de APONNT configurados'

-- ============================================
-- 3. TABLA: aponnt_pre_invoices
-- Pre-facturas generadas automáticamente desde contratos firmados
-- ============================================

\echo '📄 Creando tabla aponnt_pre_invoices...'

CREATE TABLE IF NOT EXISTS aponnt_pre_invoices (
    id SERIAL PRIMARY KEY,

    -- REFERENCIA AL CONTRATO Y PRESUPUESTO
    contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
    budget_id INTEGER REFERENCES budgets(id) ON DELETE SET NULL,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    -- CÓDIGO ÚNICO
    pre_invoice_code VARCHAR(50) NOT NULL,

    -- DATOS DEL CLIENTE (copiados del contrato para inmutabilidad)
    cliente_cuit VARCHAR(15) NOT NULL,
    cliente_razon_social VARCHAR(255) NOT NULL,
    cliente_condicion_iva VARCHAR(50) NOT NULL,
    cliente_domicilio_fiscal TEXT,
    cliente_email VARCHAR(255),

    -- DETALLE DE ITEMS (JSON con módulos contratados)
    items JSONB NOT NULL DEFAULT '[]',
    /*
    items = [
        {
            "module_key": "attendance-basic",
            "module_name": "Asistencia Básico",
            "quantity": 1,
            "unit_price": 15000.00,
            "subtotal": 15000.00
        },
        ...
    ]
    */

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
    condicion_venta VARCHAR(50) DEFAULT 'CTA_CTE',  -- CONTADO, CTA_CTE, 30_DIAS

    -- ESTADO DEL FLUJO
    status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
    /*
    Estados posibles:
    - PENDING_REVIEW: Generada, esperando revisión admin
    - APPROVED: Aprobada, lista para facturar
    - INVOICED: Ya se emitió factura (enlazada a siac_facturas)
    - REJECTED: Rechazada con observaciones
    - CANCELLED: Cancelada
    */

    -- SI FUE FACTURADA
    invoice_id INTEGER,  -- ID en siac_facturas cuando se facture
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
    CONSTRAINT valid_status CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'INVOICED', 'REJECTED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_pre_invoice_company ON aponnt_pre_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_pre_invoice_contract ON aponnt_pre_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_pre_invoice_status ON aponnt_pre_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pre_invoice_code ON aponnt_pre_invoices(pre_invoice_code);

\echo '   ✅ Tabla aponnt_pre_invoices creada'

-- ============================================
-- 4. TABLA: aponnt_admin_tasks
-- Tareas administrativas pendientes (dashboard)
-- ============================================

\echo '📋 Creando tabla aponnt_admin_tasks...'

CREATE TABLE IF NOT EXISTS aponnt_admin_tasks (
    id SERIAL PRIMARY KEY,

    -- IDENTIFICACIÓN
    task_code VARCHAR(50) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    /*
    Tipos de tareas:
    - PRE_INVOICE_PENDING: Pre-factura pendiente de aprobar
    - COMMISSION_PENDING: Comisión pendiente de pagar
    - CONTRACT_EXPIRING: Contrato por vencer
    - CONTRACT_GRACE_PERIOD: Contrato en período de gracia
    - SUPPORT_ESCALATION: Escalamiento de soporte
    - DOCUMENT_EXPIRED: Documento expirado
    */

    -- PRIORIDAD Y URGENCIA
    priority VARCHAR(20) DEFAULT 'MEDIUM',  -- LOW, MEDIUM, HIGH, URGENT
    due_date TIMESTAMP,

    -- REFERENCIA A ENTIDAD
    entity_type VARCHAR(50),  -- pre_invoice, contract, commission, ticket
    entity_id INTEGER,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    -- DETALLES
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- ASIGNACIÓN
    assigned_to INTEGER,  -- staff_id de aponnt_staff
    assigned_role VARCHAR(50),  -- 'admin', 'finance', 'commercial'

    -- ESTADO
    status VARCHAR(50) DEFAULT 'PENDING',
    /*
    Estados:
    - PENDING: Pendiente
    - IN_PROGRESS: En proceso
    - COMPLETED: Completada
    - CANCELLED: Cancelada
    */

    -- COMPLETADO
    completed_at TIMESTAMP,
    completed_by INTEGER,
    completion_notes TEXT,

    -- AUDITORÍA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CONSTRAINTS
    CONSTRAINT unique_task_code UNIQUE (task_code),
    CONSTRAINT valid_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT valid_task_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_admin_task_type ON aponnt_admin_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_admin_task_status ON aponnt_admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_task_priority ON aponnt_admin_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_admin_task_assigned ON aponnt_admin_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_admin_task_due ON aponnt_admin_tasks(due_date);

\echo '   ✅ Tabla aponnt_admin_tasks creada'

-- ============================================
-- 5. FUNCIONES HELPER
-- ============================================

\echo '🔧 Creando funciones helper...'

-- Función para generar código de pre-factura
CREATE OR REPLACE FUNCTION generate_pre_invoice_code()
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR;
    v_sequence INTEGER;
    v_code VARCHAR;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(pre_invoice_code FROM 'PRE-' || v_year || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM aponnt_pre_invoices
    WHERE pre_invoice_code LIKE 'PRE-' || v_year || '-%';

    v_code := 'PRE-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Función generate_pre_invoice_code creada'

-- Función para generar código de tarea admin
CREATE OR REPLACE FUNCTION generate_admin_task_code(p_task_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_date VARCHAR;
    v_sequence INTEGER;
    v_prefix VARCHAR;
    v_code VARCHAR;
BEGIN
    v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    v_prefix := UPPER(LEFT(p_task_type, 3));

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(task_code FROM v_prefix || '-' || v_date || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM aponnt_admin_tasks
    WHERE task_code LIKE v_prefix || '-' || v_date || '-%';

    v_code := v_prefix || '-' || v_date || '-' || LPAD(v_sequence::TEXT, 4, '0');

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Función generate_admin_task_code creada'

-- Función para obtener email de APONNT por tipo
CREATE OR REPLACE FUNCTION get_aponnt_email(p_email_type VARCHAR)
RETURNS TABLE (
    email_address VARCHAR,
    display_name VARCHAR,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        aec.email_address,
        aec.display_name,
        aec.is_active
    FROM aponnt_email_config aec
    WHERE aec.email_type = p_email_type
      AND aec.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Función get_aponnt_email creada'

-- Función para obtener ID de APONNT master
CREATE OR REPLACE FUNCTION get_aponnt_master_id()
RETURNS INTEGER AS $$
DECLARE
    v_company_id INTEGER;
BEGIN
    SELECT company_id INTO v_company_id
    FROM companies
    WHERE is_aponnt_master = true
    LIMIT 1;

    RETURN COALESCE(v_company_id, 1);  -- Default a 1 si no existe
END;
$$ LANGUAGE plpgsql;

\echo '   ✅ Función get_aponnt_master_id creada'

-- Función para crear pre-factura desde contrato
CREATE OR REPLACE FUNCTION create_pre_invoice_from_contract(
    p_contract_id INTEGER
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

    -- Usar items del presupuesto
    v_items := COALESCE(v_budget.modules_detail, '[]'::jsonb);
    v_subtotal := COALESCE(v_budget.subtotal, 0);
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
        COALESCE(v_company.tax_id, v_budget.client_cuit, '00-00000000-0'),
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

\echo '   ✅ Función create_pre_invoice_from_contract creada'

-- ============================================
-- 6. VISTAS ÚTILES
-- ============================================

\echo '👁️ Creando vistas...'

-- Vista de pre-facturas pendientes
CREATE OR REPLACE VIEW v_pending_pre_invoices AS
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
    con.contract_number
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

\echo '   ✅ Vista v_pending_pre_invoices creada'

-- Vista de tareas administrativas pendientes
CREATE OR REPLACE VIEW v_admin_tasks_dashboard AS
SELECT
    t.id,
    t.task_code,
    t.task_type,
    t.priority,
    t.due_date,
    t.title,
    t.description,
    t.status,
    t.entity_type,
    t.entity_id,
    t.company_id,
    c.name AS company_name,
    t.assigned_role,
    t.created_at,
    CASE
        WHEN t.due_date < CURRENT_TIMESTAMP THEN 'OVERDUE'
        WHEN t.due_date < CURRENT_TIMESTAMP + INTERVAL '1 day' THEN 'DUE_TODAY'
        WHEN t.due_date < CURRENT_TIMESTAMP + INTERVAL '3 days' THEN 'DUE_SOON'
        ELSE 'ON_TIME'
    END AS urgency
FROM aponnt_admin_tasks t
LEFT JOIN companies c ON t.company_id = c.company_id
WHERE t.status IN ('PENDING', 'IN_PROGRESS')
ORDER BY
    CASE t.priority
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
    END,
    t.due_date ASC NULLS LAST;

\echo '   ✅ Vista v_admin_tasks_dashboard creada'

-- ============================================
-- 7. TRIGGERS
-- ============================================

\echo '⚡ Creando triggers...'

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_aponnt_tables_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pre_invoices_updated ON aponnt_pre_invoices;
CREATE TRIGGER trigger_pre_invoices_updated
    BEFORE UPDATE ON aponnt_pre_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_aponnt_tables_timestamp();

DROP TRIGGER IF EXISTS trigger_admin_tasks_updated ON aponnt_admin_tasks;
CREATE TRIGGER trigger_admin_tasks_updated
    BEFORE UPDATE ON aponnt_admin_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_aponnt_tables_timestamp();

DROP TRIGGER IF EXISTS trigger_email_config_updated ON aponnt_email_config;
CREATE TRIGGER trigger_email_config_updated
    BEFORE UPDATE ON aponnt_email_config
    FOR EACH ROW
    EXECUTE FUNCTION update_aponnt_tables_timestamp();

\echo '   ✅ Triggers creados'

-- ============================================
-- RESUMEN
-- ============================================

\echo ''
\echo '✅ [APONNT BILLING] Migración completada exitosamente'
\echo ''
\echo '📋 Tablas creadas/modificadas:'
\echo '   1. companies (agregada columna is_aponnt_master)'
\echo '   2. aponnt_email_config - Emails parametrizados'
\echo '   3. aponnt_pre_invoices - Pre-facturas automáticas'
\echo '   4. aponnt_admin_tasks - Tareas administrativas'
\echo ''
\echo '📧 Emails de APONNT configurados:'
\echo '   - institutional: aponntsuite@gmail.com'
\echo '   - commercial: aponntcomercial@gmail.com'
\echo '   - support: aponntcoordinacionsoporte@gmail.com'
\echo '   - engineering: aponntingenieria@gmail.com'
\echo '   - associates: aponntasociados@gmail.com'
\echo ''
\echo '🔧 Funciones helper creadas:'
\echo '   - generate_pre_invoice_code()'
\echo '   - generate_admin_task_code(task_type)'
\echo '   - get_aponnt_email(email_type)'
\echo '   - get_aponnt_master_id()'
\echo '   - create_pre_invoice_from_contract(contract_id)'
\echo ''
\echo '👁️ Vistas creadas:'
\echo '   - v_pending_pre_invoices'
\echo '   - v_admin_tasks_dashboard'
\echo ''
