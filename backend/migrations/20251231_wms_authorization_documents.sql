-- ============================================================================
-- WMS AUTHORIZATION SYSTEM & DOCUMENT CONTROL
-- Cumplimiento con normas internacionales: ISO 22005, GS1, EU 178/2002, FDA FSMA
-- ============================================================================

-- ============================================================================
-- 1. SISTEMA DE AUTORIZACIONES MULTI-NIVEL
-- ============================================================================

-- Niveles de autorización por rol y monto
CREATE TABLE IF NOT EXISTS wms_authorization_levels (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    role_name VARCHAR(100) NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- transfer, adjustment, disposal, recall
    min_amount DECIMAL(15,2) DEFAULT 0,
    max_amount DECIMAL(15,2), -- NULL = sin límite
    min_quantity INTEGER DEFAULT 0,
    max_quantity INTEGER, -- NULL = sin límite
    can_self_approve BOOLEAN DEFAULT FALSE,
    requires_dual_approval BOOLEAN DEFAULT FALSE, -- Segregación de funciones
    escalation_hours INTEGER DEFAULT 24, -- Horas antes de escalar
    escalation_role VARCHAR(100), -- Rol al que escala
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, role_name, operation_type)
);

-- Solicitudes de autorización
CREATE TABLE IF NOT EXISTS wms_authorization_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    request_number VARCHAR(50) NOT NULL UNIQUE,
    operation_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50) NOT NULL, -- transfer, adjustment, disposal, recall
    reference_id INTEGER NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(user_id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(15,2),
    total_quantity INTEGER,
    justification TEXT,
    urgency_level VARCHAR(20) DEFAULT 'normal', -- normal, urgent, critical
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, escalated, expired
    current_level INTEGER DEFAULT 1,
    required_levels INTEGER DEFAULT 1,
    expires_at TIMESTAMP,
    final_decision_at TIMESTAMP,
    final_decision_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de autorizaciones (inmutable - audit trail)
CREATE TABLE IF NOT EXISTS wms_authorization_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES wms_authorization_requests(id),
    approval_level INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- approved, rejected, escalated, delegated
    action_by UUID NOT NULL REFERENCES users(user_id),
    action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role_at_action VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    comments TEXT,
    digital_signature TEXT, -- Hash de la acción
    signature_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Campos inmutables para auditoría
    snapshot_data JSONB, -- Snapshot del estado al momento de la acción
    CONSTRAINT no_updates CHECK (TRUE) -- Placeholder para trigger que previene updates
);

-- Delegaciones de autorización
CREATE TABLE IF NOT EXISTS wms_authorization_delegations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    delegator_id UUID NOT NULL REFERENCES users(user_id),
    delegate_id UUID NOT NULL REFERENCES users(user_id),
    operation_types TEXT[], -- Array de tipos de operación
    max_amount DECIMAL(15,2),
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(user_id)
);

-- ============================================================================
-- 2. CONTROL DOCUMENTAL
-- ============================================================================

-- Tipos de documentos
CREATE TABLE IF NOT EXISTS wms_document_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    required_for TEXT[], -- Array: ['transfer', 'reception', 'disposal', 'recall']
    retention_years INTEGER DEFAULT 7,
    requires_approval BOOLEAN DEFAULT FALSE,
    template_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documentos
CREATE TABLE IF NOT EXISTS wms_documents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    document_type_id INTEGER REFERENCES wms_document_types(id),
    document_number VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_path TEXT,
    file_name VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_hash VARCHAR(128), -- SHA-512 para integridad
    external_reference VARCHAR(200), -- Número de factura, orden de compra, etc.
    issue_date DATE,
    expiry_date DATE,
    issuer_name VARCHAR(200),
    issuer_tax_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active', -- active, superseded, archived, expired
    version INTEGER DEFAULT 1,
    parent_document_id INTEGER REFERENCES wms_documents(id), -- Para versiones
    metadata JSONB,
    uploaded_by UUID REFERENCES users(user_id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES users(user_id),
    verified_at TIMESTAMP,
    archived_at TIMESTAMP,
    retention_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enlaces documento-operación
CREATE TABLE IF NOT EXISTS wms_document_links (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES wms_documents(id),
    entity_type VARCHAR(50) NOT NULL, -- transfer, product, batch, supplier, recall, adjustment
    entity_id INTEGER NOT NULL,
    link_type VARCHAR(50) NOT NULL, -- source, support, certificate, invoice, approval
    is_required BOOLEAN DEFAULT FALSE,
    linked_by UUID REFERENCES users(user_id),
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(document_id, entity_type, entity_id, link_type)
);

-- ============================================================================
-- 3. FIRMAS DIGITALES E INTEGRIDAD
-- ============================================================================

-- Registro de firmas digitales
CREATE TABLE IF NOT EXISTS wms_digital_signatures (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- created, approved, modified, sealed
    signer_id UUID NOT NULL REFERENCES users(user_id),
    signer_name VARCHAR(200) NOT NULL,
    signer_role VARCHAR(100),
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signature_hash VARCHAR(128) NOT NULL, -- SHA-512
    previous_hash VARCHAR(128), -- Para cadena de bloques simple
    data_snapshot JSONB NOT NULL, -- Estado exacto al firmar
    ip_address INET,
    user_agent TEXT,
    certificate_id VARCHAR(200), -- Si usa certificado digital externo
    verification_url TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    invalidated_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para cadena de firmas
CREATE INDEX IF NOT EXISTS idx_wms_signatures_chain
ON wms_digital_signatures(entity_type, entity_id, signed_at);

-- ============================================================================
-- 4. SISTEMA DE RECALL (RETIRO DE PRODUCTOS)
-- ============================================================================

-- Solicitudes de recall
CREATE TABLE IF NOT EXISTS wms_recall_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    recall_number VARCHAR(50) NOT NULL UNIQUE,
    recall_type VARCHAR(30) NOT NULL, -- voluntary, mandatory, market_withdrawal
    severity_level VARCHAR(20) NOT NULL, -- class_I, class_II, class_III (FDA classification)
    product_id INTEGER REFERENCES wms_products(id),
    affected_batches TEXT[], -- Array de lotes afectados
    affected_serial_numbers TEXT[],
    reason TEXT NOT NULL,
    health_risk_description TEXT,
    discovery_date DATE NOT NULL,
    notification_date DATE,
    regulatory_agency VARCHAR(200),
    regulatory_reference VARCHAR(200),
    geographic_scope TEXT, -- Alcance geográfico
    status VARCHAR(30) DEFAULT 'initiated', -- initiated, in_progress, completed, closed
    initiated_by UUID REFERENCES users(user_id),
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_units_affected INTEGER,
    total_units_recovered INTEGER,
    recovery_percentage DECIMAL(5,2),
    public_notice_required BOOLEAN DEFAULT FALSE,
    public_notice_date DATE,
    corrective_actions TEXT,
    preventive_actions TEXT,
    root_cause_analysis TEXT,
    lessons_learned TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seguimiento de unidades en recall
CREATE TABLE IF NOT EXISTS wms_recall_tracking (
    id SERIAL PRIMARY KEY,
    recall_id INTEGER NOT NULL REFERENCES wms_recall_requests(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),
    serial_number VARCHAR(100),
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    location_id INTEGER REFERENCES wms_locations(id),
    quantity_affected INTEGER NOT NULL,
    quantity_recovered INTEGER DEFAULT 0,
    recovery_status VARCHAR(30) DEFAULT 'pending', -- pending, in_transit, recovered, disposed, lost
    customer_name VARCHAR(200),
    customer_contact TEXT,
    recovery_date DATE,
    recovery_method VARCHAR(50), -- return, pickup, disposal_on_site
    disposition VARCHAR(50), -- rework, destroy, return_to_supplier, resale
    disposition_date DATE,
    disposition_reference VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. CONTROL AMBIENTAL / CADENA DE FRÍO
-- ============================================================================

-- Configuración de monitoreo ambiental por zona
CREATE TABLE IF NOT EXISTS wms_environmental_config (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES wms_warehouse_zones(id),
    parameter_type VARCHAR(50) NOT NULL, -- temperature, humidity, light, pressure
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    unit VARCHAR(20) NOT NULL, -- celsius, fahrenheit, percent, lux, hPa
    alert_threshold_warning DECIMAL(10,2),
    alert_threshold_critical DECIMAL(10,2),
    reading_interval_minutes INTEGER DEFAULT 15,
    sensor_id VARCHAR(100),
    sensor_location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(zone_id, parameter_type)
);

-- Registros de lecturas ambientales
CREATE TABLE IF NOT EXISTS wms_environmental_logs (
    id SERIAL PRIMARY KEY,
    config_id INTEGER NOT NULL REFERENCES wms_environmental_config(id),
    reading_value DECIMAL(10,2) NOT NULL,
    reading_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_within_range BOOLEAN,
    alert_level VARCHAR(20), -- null, warning, critical
    sensor_status VARCHAR(20) DEFAULT 'normal', -- normal, malfunction, offline
    raw_data JSONB,
    acknowledged_by UUID REFERENCES users(user_id),
    acknowledged_at TIMESTAMP,
    corrective_action TEXT
);

-- Partición por mes para logs ambientales (alto volumen)
CREATE INDEX IF NOT EXISTS idx_wms_env_logs_reading
ON wms_environmental_logs(config_id, reading_at DESC);

-- Incidentes de cadena de frío
CREATE TABLE IF NOT EXISTS wms_cold_chain_incidents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    zone_id INTEGER REFERENCES wms_warehouse_zones(id),
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    incident_type VARCHAR(50) NOT NULL, -- temperature_excursion, equipment_failure, power_outage
    severity VARCHAR(20) NOT NULL, -- minor, moderate, major, critical
    detected_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    min_temp_recorded DECIMAL(10,2),
    max_temp_recorded DECIMAL(10,2),
    affected_products JSONB, -- [{product_id, batch_id, quantity}]
    root_cause TEXT,
    immediate_actions TEXT,
    product_disposition VARCHAR(50), -- released, quarantine, destroyed
    quality_assessment TEXT,
    reported_by UUID REFERENCES users(user_id),
    investigated_by UUID REFERENCES users(user_id),
    investigation_completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open', -- open, investigating, resolved, closed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. POLÍTICAS DE RETENCIÓN DE REGISTROS
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_retention_policies (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id), -- NULL = global
    entity_type VARCHAR(50) NOT NULL, -- transfer, adjustment, recall, environmental_log
    retention_years INTEGER NOT NULL,
    legal_basis TEXT, -- Ley o norma que lo requiere
    jurisdiction VARCHAR(100), -- País/región aplicable
    archive_after_days INTEGER, -- Días antes de archivar
    delete_after_archive BOOLEAN DEFAULT FALSE,
    requires_approval_to_delete BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, entity_type)
);

-- Registro de archivado/eliminación
CREATE TABLE IF NOT EXISTS wms_retention_actions (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES wms_retention_policies(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    action_type VARCHAR(20) NOT NULL, -- archived, deleted, extended
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_by UUID REFERENCES users(user_id),
    reason TEXT,
    approval_id INTEGER REFERENCES wms_authorization_requests(id),
    original_data_hash VARCHAR(128), -- Para verificar integridad si se restaura
    archive_location TEXT
);

-- ============================================================================
-- 7. FUNCIONES DE UTILIDAD
-- ============================================================================

-- Función para generar número de autorización
CREATE OR REPLACE FUNCTION wms_generate_auth_number(p_company_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_sequence INTEGER;
    v_year VARCHAR(4);
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(request_number FROM 'AUTH-[0-9]{4}-([0-9]+)') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM wms_authorization_requests
    WHERE company_id = p_company_id
    AND request_number LIKE 'AUTH-' || v_year || '-%';

    RETURN 'AUTH-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de recall
CREATE OR REPLACE FUNCTION wms_generate_recall_number(p_company_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_sequence INTEGER;
    v_year VARCHAR(4);
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(recall_number FROM 'RCL-[0-9]{4}-([0-9]+)') AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM wms_recall_requests
    WHERE company_id = p_company_id
    AND recall_number LIKE 'RCL-' || v_year || '-%';

    RETURN 'RCL-' || v_year || '-' || LPAD(v_sequence::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para crear firma digital
CREATE OR REPLACE FUNCTION wms_create_signature(
    p_company_id INTEGER,
    p_entity_type VARCHAR(50),
    p_entity_id INTEGER,
    p_action_type VARCHAR(50),
    p_signer_id UUID,
    p_data JSONB
)
RETURNS VARCHAR(128) AS $$
DECLARE
    v_signer_name VARCHAR(200);
    v_signer_role VARCHAR(100);
    v_previous_hash VARCHAR(128);
    v_signature_hash VARCHAR(128);
    v_sign_data TEXT;
BEGIN
    -- Obtener info del firmante
    SELECT CONCAT("firstName", ' ', "lastName"), role
    INTO v_signer_name, v_signer_role
    FROM users WHERE user_id = p_signer_id;

    -- Obtener hash anterior para la cadena
    SELECT signature_hash INTO v_previous_hash
    FROM wms_digital_signatures
    WHERE entity_type = p_entity_type AND entity_id = p_entity_id
    ORDER BY signed_at DESC LIMIT 1;

    -- Crear string para hash
    v_sign_data := CONCAT(
        p_company_id::TEXT, '|',
        p_entity_type, '|',
        p_entity_id::TEXT, '|',
        p_action_type, '|',
        p_signer_id::TEXT, '|',
        CURRENT_TIMESTAMP::TEXT, '|',
        COALESCE(v_previous_hash, 'GENESIS'), '|',
        p_data::TEXT
    );

    -- Generar hash SHA-512
    v_signature_hash := encode(digest(v_sign_data, 'sha512'), 'hex');

    -- Insertar registro de firma
    INSERT INTO wms_digital_signatures (
        company_id, entity_type, entity_id, action_type,
        signer_id, signer_name, signer_role,
        signature_hash, previous_hash, data_snapshot
    ) VALUES (
        p_company_id, p_entity_type, p_entity_id, p_action_type,
        p_signer_id, v_signer_name, v_signer_role,
        v_signature_hash, v_previous_hash, p_data
    );

    RETURN v_signature_hash;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar integridad de cadena de firmas
CREATE OR REPLACE FUNCTION wms_verify_signature_chain(
    p_entity_type VARCHAR(50),
    p_entity_id INTEGER
)
RETURNS TABLE(
    signature_id INTEGER,
    is_valid BOOLEAN,
    expected_hash VARCHAR(128),
    actual_hash VARCHAR(128)
) AS $$
DECLARE
    r RECORD;
    v_calculated_hash VARCHAR(128);
    v_sign_data TEXT;
    v_prev_hash VARCHAR(128) := 'GENESIS';
BEGIN
    FOR r IN
        SELECT * FROM wms_digital_signatures
        WHERE entity_type = p_entity_type AND entity_id = p_entity_id
        ORDER BY signed_at ASC
    LOOP
        v_sign_data := CONCAT(
            r.company_id::TEXT, '|',
            r.entity_type, '|',
            r.entity_id::TEXT, '|',
            r.action_type, '|',
            r.signer_id::TEXT, '|',
            r.signed_at::TEXT, '|',
            v_prev_hash, '|',
            r.data_snapshot::TEXT
        );

        v_calculated_hash := encode(digest(v_sign_data, 'sha512'), 'hex');

        signature_id := r.id;
        expected_hash := r.signature_hash;
        actual_hash := v_calculated_hash;
        is_valid := (r.signature_hash = v_calculated_hash);

        RETURN NEXT;

        v_prev_hash := r.signature_hash;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si usuario puede aprobar
CREATE OR REPLACE FUNCTION wms_can_user_approve(
    p_user_id UUID,
    p_company_id INTEGER,
    p_operation_type VARCHAR(50),
    p_amount DECIMAL(15,2),
    p_quantity INTEGER
)
RETURNS TABLE(
    can_approve BOOLEAN,
    reason TEXT,
    requires_escalation BOOLEAN,
    escalation_role VARCHAR(100)
) AS $$
DECLARE
    v_user_role VARCHAR(100);
    v_level RECORD;
    v_delegation RECORD;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO v_user_role FROM users WHERE user_id = p_user_id;

    -- Buscar nivel de autorización directo
    SELECT * INTO v_level
    FROM wms_authorization_levels
    WHERE company_id = p_company_id
    AND role_name = v_user_role
    AND operation_type = p_operation_type
    AND is_active = TRUE;

    IF v_level IS NULL THEN
        -- Verificar delegación activa
        SELECT * INTO v_delegation
        FROM wms_authorization_delegations
        WHERE company_id = p_company_id
        AND delegate_id = p_user_id
        AND p_operation_type = ANY(operation_types)
        AND CURRENT_TIMESTAMP BETWEEN valid_from AND valid_until
        AND is_active = TRUE
        AND (max_amount IS NULL OR max_amount >= p_amount);

        IF v_delegation IS NOT NULL THEN
            can_approve := TRUE;
            reason := 'Aprobación delegada por usuario ' || v_delegation.delegator_id;
            requires_escalation := FALSE;
            escalation_role := NULL;
            RETURN NEXT;
            RETURN;
        END IF;

        can_approve := FALSE;
        reason := 'Usuario no tiene nivel de autorización para esta operación';
        requires_escalation := TRUE;
        escalation_role := 'supervisor';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Verificar límites
    IF (v_level.max_amount IS NOT NULL AND p_amount > v_level.max_amount) OR
       (v_level.max_quantity IS NOT NULL AND p_quantity > v_level.max_quantity) THEN
        can_approve := FALSE;
        reason := 'Monto o cantidad excede límites autorizados';
        requires_escalation := TRUE;
        escalation_role := v_level.escalation_role;
        RETURN NEXT;
        RETURN;
    END IF;

    can_approve := TRUE;
    reason := 'Usuario autorizado';
    requires_escalation := FALSE;
    escalation_role := NULL;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Trigger para prevenir modificación de historial de autorizaciones
CREATE OR REPLACE FUNCTION wms_prevent_auth_history_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'El historial de autorizaciones es inmutable y no puede ser modificado';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_auth_history_update ON wms_authorization_history;
CREATE TRIGGER trg_prevent_auth_history_update
    BEFORE UPDATE OR DELETE ON wms_authorization_history
    FOR EACH ROW
    EXECUTE FUNCTION wms_prevent_auth_history_update();

-- Trigger para auto-generar número de autorización
CREATE OR REPLACE FUNCTION wms_auto_auth_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL THEN
        NEW.request_number := wms_generate_auth_number(NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_auth_number ON wms_authorization_requests;
CREATE TRIGGER trg_auto_auth_number
    BEFORE INSERT ON wms_authorization_requests
    FOR EACH ROW
    EXECUTE FUNCTION wms_auto_auth_number();

-- Trigger para auto-generar número de recall
CREATE OR REPLACE FUNCTION wms_auto_recall_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.recall_number IS NULL THEN
        NEW.recall_number := wms_generate_recall_number(NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_recall_number ON wms_recall_requests;
CREATE TRIGGER trg_auto_recall_number
    BEFORE INSERT ON wms_recall_requests
    FOR EACH ROW
    EXECUTE FUNCTION wms_auto_recall_number();

-- Trigger para firma automática en transferencias
CREATE OR REPLACE FUNCTION wms_auto_sign_transfer()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM wms_create_signature(
            NEW.company_id,
            'transfer',
            NEW.id,
            'created',
            NEW.created_by,
            to_jsonb(NEW)
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        PERFORM wms_create_signature(
            NEW.company_id,
            'transfer',
            NEW.id,
            NEW.status,
            COALESCE(NEW.confirmed_by, NEW.dispatched_by, NEW.approved_by, NEW.created_by),
            to_jsonb(NEW)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_sign_transfer ON wms_transfers;
CREATE TRIGGER trg_auto_sign_transfer
    AFTER INSERT OR UPDATE ON wms_transfers
    FOR EACH ROW
    EXECUTE FUNCTION wms_auto_sign_transfer();

-- ============================================================================
-- 9. DATOS INICIALES
-- ============================================================================

-- Tipos de documentos estándar
INSERT INTO wms_document_types (code, name, description, required_for, retention_years, requires_approval) VALUES
('PO', 'Orden de Compra', 'Purchase Order del proveedor', ARRAY['reception'], 7, FALSE),
('INV', 'Factura', 'Factura comercial', ARRAY['reception', 'transfer'], 10, FALSE),
('COA', 'Certificado de Análisis', 'Certificate of Analysis - calidad del lote', ARRAY['reception'], 10, TRUE),
('COO', 'Certificado de Origen', 'Certificate of Origin', ARRAY['reception'], 7, FALSE),
('SDS', 'Hoja de Seguridad', 'Safety Data Sheet - MSDS', ARRAY['reception'], 10, FALSE),
('TL', 'Carta de Porte', 'Transport/Shipping document', ARRAY['reception', 'transfer'], 5, FALSE),
('RN', 'Remito', 'Delivery note', ARRAY['reception', 'transfer'], 5, FALSE),
('QC', 'Control de Calidad', 'Quality Control report interno', ARRAY['release'], 10, TRUE),
('DIS', 'Certificado de Disposición', 'Disposal certificate', ARRAY['disposal'], 10, TRUE),
('RCL', 'Notificación de Recall', 'Recall notification document', ARRAY['recall'], 10, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Políticas de retención por defecto (globales)
INSERT INTO wms_retention_policies (company_id, entity_type, retention_years, legal_basis, jurisdiction) VALUES
(NULL, 'transfer', 7, 'Normas contables generales', 'Global'),
(NULL, 'adjustment', 7, 'Normas contables generales', 'Global'),
(NULL, 'recall', 10, 'FDA 21 CFR Part 7 / EU 178/2002', 'Global'),
(NULL, 'environmental_log', 3, 'ISO 22000 / HACCP', 'Global'),
(NULL, 'authorization', 7, 'SOX / Normas de auditoría', 'Global'),
(NULL, 'digital_signature', 10, 'eIDAS / ESIGN Act', 'Global')
ON CONFLICT (company_id, entity_type) DO NOTHING;

-- Niveles de autorización por defecto para ISI (company_id = 11)
INSERT INTO wms_authorization_levels (company_id, role_name, operation_type, min_amount, max_amount, can_self_approve, requires_dual_approval, escalation_hours, escalation_role) VALUES
-- Operador de almacén
(11, 'warehouse_operator', 'transfer', 0, 10000, FALSE, FALSE, 24, 'warehouse_supervisor'),
(11, 'warehouse_operator', 'adjustment', 0, 1000, FALSE, FALSE, 12, 'warehouse_supervisor'),
-- Supervisor de almacén
(11, 'warehouse_supervisor', 'transfer', 0, 50000, TRUE, FALSE, 48, 'warehouse_manager'),
(11, 'warehouse_supervisor', 'adjustment', 0, 10000, TRUE, FALSE, 24, 'warehouse_manager'),
(11, 'warehouse_supervisor', 'disposal', 0, 5000, FALSE, TRUE, 24, 'warehouse_manager'),
-- Gerente de almacén
(11, 'warehouse_manager', 'transfer', 0, NULL, TRUE, FALSE, 72, 'admin'),
(11, 'warehouse_manager', 'adjustment', 0, NULL, TRUE, FALSE, 48, 'admin'),
(11, 'warehouse_manager', 'disposal', 0, 50000, TRUE, TRUE, 48, 'admin'),
(11, 'warehouse_manager', 'recall', 0, NULL, FALSE, TRUE, 24, 'admin'),
-- Admin
(11, 'admin', 'transfer', 0, NULL, TRUE, FALSE, NULL, NULL),
(11, 'admin', 'adjustment', 0, NULL, TRUE, FALSE, NULL, NULL),
(11, 'admin', 'disposal', 0, NULL, TRUE, FALSE, NULL, NULL),
(11, 'admin', 'recall', 0, NULL, TRUE, FALSE, NULL, NULL)
ON CONFLICT (company_id, role_name, operation_type) DO NOTHING;

-- ============================================================================
-- 10. VISTAS ÚTILES
-- ============================================================================

-- Vista de solicitudes de autorización pendientes
CREATE OR REPLACE VIEW wms_pending_authorizations AS
SELECT
    ar.id,
    ar.request_number,
    ar.company_id,
    c.name as company_name,
    ar.operation_type,
    ar.reference_type,
    ar.reference_id,
    ar.total_amount,
    ar.total_quantity,
    ar.urgency_level,
    ar.status,
    ar.current_level,
    ar.required_levels,
    ar.requested_at,
    ar.expires_at,
    u."firstName" || ' ' || u."lastName" as requested_by_name,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ar.requested_at))/3600 as hours_pending
FROM wms_authorization_requests ar
JOIN companies c ON ar.company_id = c.company_id
JOIN users u ON ar.requested_by = u.user_id
WHERE ar.status IN ('pending', 'escalated')
ORDER BY
    CASE ar.urgency_level
        WHEN 'critical' THEN 1
        WHEN 'urgent' THEN 2
        ELSE 3
    END,
    ar.requested_at ASC;

-- Vista de documentos por vencer
CREATE OR REPLACE VIEW wms_expiring_documents AS
SELECT
    d.id,
    d.company_id,
    c.name as company_name,
    dt.name as document_type,
    d.title,
    d.document_number,
    d.expiry_date,
    d.expiry_date - CURRENT_DATE as days_until_expiry,
    d.external_reference,
    d.issuer_name
FROM wms_documents d
JOIN companies c ON d.company_id = c.company_id
LEFT JOIN wms_document_types dt ON d.document_type_id = dt.id
WHERE d.status = 'active'
AND d.expiry_date IS NOT NULL
AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY d.expiry_date ASC;

-- Vista de recalls activos
CREATE OR REPLACE VIEW wms_active_recalls AS
SELECT
    r.id,
    r.recall_number,
    r.company_id,
    c.name as company_name,
    r.recall_type,
    r.severity_level,
    p.name as product_name,
    r.affected_batches,
    r.status,
    r.total_units_affected,
    r.total_units_recovered,
    r.recovery_percentage,
    r.initiated_at,
    u."firstName" || ' ' || u."lastName" as initiated_by_name
FROM wms_recall_requests r
JOIN companies c ON r.company_id = c.company_id
LEFT JOIN wms_products p ON r.product_id = p.id
LEFT JOIN users u ON r.initiated_by = u.user_id
WHERE r.status NOT IN ('closed')
ORDER BY
    CASE r.severity_level
        WHEN 'class_I' THEN 1
        WHEN 'class_II' THEN 2
        ELSE 3
    END,
    r.initiated_at DESC;

-- Vista de incidentes de cadena de frío
CREATE OR REPLACE VIEW wms_cold_chain_status AS
SELECT
    z.id as zone_id,
    z.name as zone_name,
    w.name as warehouse_name,
    b.name as branch_name,
    ec.parameter_type,
    ec.min_value,
    ec.max_value,
    ec.unit,
    el.reading_value as last_reading,
    el.reading_at as last_reading_at,
    el.alert_level,
    el.is_within_range,
    (SELECT COUNT(*) FROM wms_cold_chain_incidents cci
     WHERE cci.zone_id = z.id AND cci.status = 'open') as open_incidents
FROM wms_warehouse_zones z
JOIN wms_warehouses w ON z.warehouse_id = w.id
JOIN wms_branches b ON w.branch_id = b.id
LEFT JOIN wms_environmental_config ec ON ec.zone_id = z.id AND ec.is_active = TRUE
LEFT JOIN LATERAL (
    SELECT * FROM wms_environmental_logs
    WHERE config_id = ec.id
    ORDER BY reading_at DESC LIMIT 1
) el ON TRUE
WHERE ec.id IS NOT NULL
ORDER BY el.alert_level DESC NULLS LAST, z.name;

-- ============================================================================
-- 11. ÍNDICES ADICIONALES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wms_auth_requests_status ON wms_authorization_requests(status, company_id);
CREATE INDEX IF NOT EXISTS idx_wms_auth_requests_expires ON wms_authorization_requests(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wms_auth_history_request ON wms_authorization_history(request_id);
CREATE INDEX IF NOT EXISTS idx_wms_documents_company ON wms_documents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wms_documents_expiry ON wms_documents(expiry_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wms_doc_links_entity ON wms_document_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wms_signatures_entity ON wms_digital_signatures(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wms_recall_status ON wms_recall_requests(status, company_id);
CREATE INDEX IF NOT EXISTS idx_wms_recall_tracking_recall ON wms_recall_tracking(recall_id);
CREATE INDEX IF NOT EXISTS idx_wms_env_logs_alert ON wms_environmental_logs(alert_level) WHERE alert_level IS NOT NULL;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

SELECT 'Migración WMS Authorization & Documents completada exitosamente' as status;
