-- =====================================================================
-- MODULO HSE - SEGURIDAD E HIGIENE LABORAL
-- Sistema completo de gestion de EPP/PPE con estandares internacionales
-- Version: 1.0.0
-- Fecha: 2025-12-07
-- =====================================================================

-- =====================================================================
-- CATALOGO DE TIPOS DE EPP (Global, reutilizable por empresas)
-- =====================================================================
CREATE TABLE IF NOT EXISTS epp_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name_es VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    body_zone VARCHAR(50),
    iso_reference VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- CATALOGO DE EPP POR EMPRESA
-- =====================================================================
CREATE TABLE IF NOT EXISTS epp_catalog (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES epp_categories(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    model VARCHAR(100),

    -- Certificaciones
    certifications JSONB,

    -- Vida util y reemplazo
    default_lifespan_days INTEGER,
    lifespan_unit VARCHAR(20) DEFAULT 'days',
    max_uses INTEGER,

    -- Tamanos disponibles
    available_sizes JSONB,

    -- Costo y stock
    unit_cost DECIMAL(10,2),
    min_stock_alert INTEGER DEFAULT 5,

    -- Instrucciones
    usage_instructions TEXT,
    maintenance_instructions TEXT,
    storage_instructions TEXT,
    disposal_instructions TEXT,

    -- Procedimiento vinculado (SSOT)
    procedure_id INTEGER,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, code)
);

-- =====================================================================
-- MATRIZ EPP POR ROL (Que EPP requiere cada posicion organizacional)
-- =====================================================================
CREATE TABLE IF NOT EXISTS epp_role_requirements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES organizational_positions(id) ON DELETE CASCADE,
    epp_catalog_id INTEGER NOT NULL REFERENCES epp_catalog(id) ON DELETE CASCADE,

    -- Obligatoriedad
    is_mandatory BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,

    -- Cantidad
    quantity_required INTEGER DEFAULT 1,

    -- Vida util especifica para este rol (override del catalogo)
    custom_lifespan_days INTEGER,

    -- Condiciones especiales
    conditions TEXT,
    applicable_work_environments JSONB,

    -- Procedimiento especifico para este rol+EPP
    specific_procedure_id INTEGER,

    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, position_id, epp_catalog_id)
);

-- =====================================================================
-- REGISTRO DE ENTREGAS DE EPP
-- =====================================================================
CREATE TABLE IF NOT EXISTS epp_deliveries (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    epp_catalog_id INTEGER NOT NULL REFERENCES epp_catalog(id) ON DELETE RESTRICT,
    requirement_id INTEGER REFERENCES epp_role_requirements(id) ON DELETE SET NULL,

    -- Detalles de entrega
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivered_by UUID,
    quantity_delivered INTEGER DEFAULT 1,
    size_delivered VARCHAR(20),
    serial_number VARCHAR(100),
    batch_number VARCHAR(100),

    -- Fechas de control
    manufacture_date DATE,
    expiration_date DATE,
    calculated_replacement_date DATE NOT NULL,

    -- Estado
    status VARCHAR(30) DEFAULT 'active',

    -- Firma/Confirmacion del empleado
    employee_signature_date TIMESTAMP,
    employee_signature_method VARCHAR(30),
    signature_document_url TEXT,

    -- Devolucion/Reemplazo
    return_date DATE,
    return_reason VARCHAR(100),
    return_notes TEXT,
    replaced_by_delivery_id INTEGER REFERENCES epp_deliveries(id),

    -- Notificaciones
    notification_30_sent BOOLEAN DEFAULT false,
    notification_15_sent BOOLEAN DEFAULT false,
    notification_7_sent BOOLEAN DEFAULT false,
    notification_expired_sent BOOLEAN DEFAULT false,

    -- Auditoria
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- HISTORIAL DE INSPECCIONES DE EPP
-- =====================================================================
CREATE TABLE IF NOT EXISTS epp_inspections (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL REFERENCES epp_deliveries(id) ON DELETE CASCADE,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspector_id UUID NOT NULL,

    -- Resultado
    condition VARCHAR(30) NOT NULL,
    is_compliant BOOLEAN DEFAULT true,

    -- Checklist items (dinamico por tipo de EPP)
    checklist_results JSONB,

    -- Acciones
    action_required VARCHAR(50),
    action_notes TEXT,
    action_deadline DATE,
    action_completed BOOLEAN DEFAULT false,

    photos JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- CONFIGURACION HSE POR EMPRESA
-- =====================================================================
CREATE TABLE IF NOT EXISTS hse_company_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL UNIQUE REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Estandar primario
    primary_standard VARCHAR(30) DEFAULT 'ISO45001',
    secondary_standards JSONB,

    -- Alertas de vencimiento
    alert_days_before JSONB DEFAULT '[30, 15, 7, 1]',

    -- Notificaciones
    notify_employee BOOLEAN DEFAULT true,
    notify_supervisor BOOLEAN DEFAULT true,
    notify_hse_manager BOOLEAN DEFAULT true,
    notify_hr BOOLEAN DEFAULT false,

    -- Reglas de negocio
    block_work_without_epp BOOLEAN DEFAULT false,
    require_signature_on_delivery BOOLEAN DEFAULT true,
    auto_schedule_inspections BOOLEAN DEFAULT true,
    inspection_frequency_days INTEGER DEFAULT 90,

    -- Roles responsables
    hse_manager_role_id INTEGER REFERENCES organizational_positions(id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================
-- INDICES PARA PERFORMANCE
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_epp_catalog_company ON epp_catalog(company_id);
CREATE INDEX IF NOT EXISTS idx_epp_catalog_category ON epp_catalog(category_id);
CREATE INDEX IF NOT EXISTS idx_epp_role_req_company ON epp_role_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_epp_role_req_position ON epp_role_requirements(position_id);
CREATE INDEX IF NOT EXISTS idx_epp_role_req_catalog ON epp_role_requirements(epp_catalog_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_company ON epp_deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_employee ON epp_deliveries(employee_id);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_status ON epp_deliveries(status, calculated_replacement_date);
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_catalog ON epp_deliveries(epp_catalog_id);
CREATE INDEX IF NOT EXISTS idx_epp_inspections_delivery ON epp_inspections(delivery_id);
CREATE INDEX IF NOT EXISTS idx_epp_inspections_date ON epp_inspections(inspection_date);

-- Indice parcial para EPP activos proximos a vencer
CREATE INDEX IF NOT EXISTS idx_epp_deliveries_expiring ON epp_deliveries(calculated_replacement_date)
    WHERE status = 'active';

-- =====================================================================
-- SEED: CATEGORIAS DE EPP (GLOBALES)
-- =====================================================================
INSERT INTO epp_categories (code, name_es, name_en, icon, body_zone, iso_reference, sort_order) VALUES
('HEAD', 'Proteccion de Cabeza', 'Head Protection', 'hard-hat', 'head', 'ISO 45001 A.8.1.2', 1),
('EYES', 'Proteccion Visual', 'Eye Protection', 'safety-goggles', 'face', 'ISO 45001 A.8.1.2', 2),
('EARS', 'Proteccion Auditiva', 'Hearing Protection', 'headphones', 'head', 'ISO 45001 A.8.1.2', 3),
('RESP', 'Proteccion Respiratoria', 'Respiratory Protection', 'mask', 'face', 'ISO 45001 A.8.1.2', 4),
('HANDS', 'Proteccion de Manos', 'Hand Protection', 'hand', 'hands', 'ISO 45001 A.8.1.2', 5),
('FEET', 'Proteccion de Pies', 'Foot Protection', 'boot', 'feet', 'ISO 45001 A.8.1.2', 6),
('BODY', 'Proteccion Corporal', 'Body Protection', 'vest', 'torso', 'ISO 45001 A.8.1.2', 7),
('FALL', 'Proteccion Anticaidas', 'Fall Protection', 'harness', 'full_body', 'ISO 45001 A.8.1.2', 8),
('ELEC', 'Proteccion Electrica', 'Electrical Protection', 'bolt', 'full_body', 'ISO 45001 A.8.1.2', 9),
('CHEM', 'Proteccion Quimica', 'Chemical Protection', 'flask', 'full_body', 'ISO 45001 A.8.1.2', 10),
('HIVIS', 'Alta Visibilidad', 'High Visibility', 'eye', 'torso', 'ISO 45001 A.8.1.2', 11),
('OTHER', 'Otros EPP', 'Other PPE', 'shield', 'other', 'ISO 45001 A.8.1.2', 99)
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- FUNCION: Calcular fecha de reemplazo automaticamente
-- =====================================================================
CREATE OR REPLACE FUNCTION calculate_epp_replacement_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Si no se especifica fecha de reemplazo, calcularla
    IF NEW.calculated_replacement_date IS NULL THEN
        -- Obtener vida util del catalogo o del requirement
        SELECT COALESCE(
            (SELECT custom_lifespan_days FROM epp_role_requirements WHERE id = NEW.requirement_id),
            (SELECT default_lifespan_days FROM epp_catalog WHERE id = NEW.epp_catalog_id),
            365 -- Default 1 year
        ) INTO NEW.calculated_replacement_date;

        NEW.calculated_replacement_date := NEW.delivery_date + NEW.calculated_replacement_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular fecha de reemplazo
DROP TRIGGER IF EXISTS trg_calculate_epp_replacement ON epp_deliveries;
CREATE TRIGGER trg_calculate_epp_replacement
    BEFORE INSERT ON epp_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION calculate_epp_replacement_date();

-- =====================================================================
-- FUNCION: Obtener EPP proximos a vencer por empresa
-- =====================================================================
CREATE OR REPLACE FUNCTION get_expiring_epp(
    p_company_id INTEGER,
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
    delivery_id INTEGER,
    employee_id UUID,
    employee_name TEXT,
    epp_name VARCHAR(200),
    category_name VARCHAR(100),
    delivery_date DATE,
    replacement_date DATE,
    days_remaining INTEGER,
    status VARCHAR(30)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id as delivery_id,
        d.employee_id,
        COALESCE(u.first_name || ' ' || u.last_name, 'N/A') as employee_name,
        c.name as epp_name,
        cat.name_es as category_name,
        d.delivery_date,
        d.calculated_replacement_date as replacement_date,
        (d.calculated_replacement_date - CURRENT_DATE)::INTEGER as days_remaining,
        d.status
    FROM epp_deliveries d
    JOIN epp_catalog c ON d.epp_catalog_id = c.id
    JOIN epp_categories cat ON c.category_id = cat.id
    LEFT JOIN users u ON d.employee_id = u.user_id
    WHERE d.company_id = p_company_id
      AND d.status = 'active'
      AND d.calculated_replacement_date <= (CURRENT_DATE + p_days_ahead)
    ORDER BY d.calculated_replacement_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCION: Dashboard KPIs HSE
-- =====================================================================
CREATE OR REPLACE FUNCTION get_hse_dashboard_kpis(p_company_id INTEGER)
RETURNS TABLE (
    total_active_deliveries BIGINT,
    expiring_30_days BIGINT,
    expiring_7_days BIGINT,
    expired BIGINT,
    compliance_rate NUMERIC,
    total_inspections_pending BIGINT,
    total_epp_in_catalog BIGINT,
    total_positions_with_epp BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM epp_deliveries WHERE company_id = p_company_id AND status = 'active')::BIGINT,
        (SELECT COUNT(*) FROM epp_deliveries WHERE company_id = p_company_id AND status = 'active'
            AND calculated_replacement_date <= CURRENT_DATE + 30
            AND calculated_replacement_date > CURRENT_DATE)::BIGINT,
        (SELECT COUNT(*) FROM epp_deliveries WHERE company_id = p_company_id AND status = 'active'
            AND calculated_replacement_date <= CURRENT_DATE + 7
            AND calculated_replacement_date > CURRENT_DATE)::BIGINT,
        (SELECT COUNT(*) FROM epp_deliveries WHERE company_id = p_company_id AND status = 'active'
            AND calculated_replacement_date < CURRENT_DATE)::BIGINT,
        COALESCE(
            (SELECT
                ROUND(
                    (COUNT(*) FILTER (WHERE calculated_replacement_date >= CURRENT_DATE)::NUMERIC /
                    NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 2
                )
            FROM epp_deliveries
            WHERE company_id = p_company_id AND status = 'active'
            ), 100.00
        ),
        (SELECT COUNT(*) FROM epp_inspections i
            JOIN epp_deliveries d ON i.delivery_id = d.id
            WHERE d.company_id = p_company_id
            AND i.action_required IS NOT NULL
            AND i.action_completed = false)::BIGINT,
        (SELECT COUNT(*) FROM epp_catalog WHERE company_id = p_company_id AND is_active = true)::BIGINT,
        (SELECT COUNT(DISTINCT position_id) FROM epp_role_requirements WHERE company_id = p_company_id)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- COMENTARIOS DE TABLA
-- =====================================================================
COMMENT ON TABLE epp_categories IS 'Categorias globales de EPP segun ISO 45001 y estandares internacionales';
COMMENT ON TABLE epp_catalog IS 'Catalogo de EPP especifico por empresa con vida util y certificaciones';
COMMENT ON TABLE epp_role_requirements IS 'Matriz de EPP requerido por posicion organizacional';
COMMENT ON TABLE epp_deliveries IS 'Registro de entregas de EPP a empleados con tracking de vencimiento';
COMMENT ON TABLE epp_inspections IS 'Historial de inspecciones periodicas de EPP';
COMMENT ON TABLE hse_company_config IS 'Configuracion del modulo HSE por empresa';
