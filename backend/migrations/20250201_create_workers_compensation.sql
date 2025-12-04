-- ============================================================================
-- OH-V6-5: WORKERS' COMPENSATION CLAIMS MANAGEMENT
-- Sistema multi-región para gestión de reclamos laborales (ART, WC, etc.)
-- ============================================================================
-- Fecha: 2025-02-01
-- Versión: 1.0.0
-- Descripción: Tablas para gestionar reclamos de accidentes laborales,
--              tipos de reclamos parametrizados por país, documentos,
--              historial de estados y seguimiento de casos.
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLA 1: Tipos de Reclamos (parametrizado por región)
-- ============================================================================
CREATE TABLE IF NOT EXISTS oh_claim_types (
    id SERIAL PRIMARY KEY,
    region VARCHAR(10) NOT NULL,  -- 'US', 'AR', 'MX', 'BR', etc.
    type_code VARCHAR(50) NOT NULL,
    name_i18n JSONB NOT NULL,  -- {"en": "...", "es": "...", "pt": "..."}
    description_i18n JSONB,
    severity_level VARCHAR(20),  -- 'minor', 'moderate', 'severe', 'critical', 'fatal'
    requires_medical_report BOOLEAN DEFAULT true,
    requires_witness_statement BOOLEAN DEFAULT false,
    requires_employer_report BOOLEAN DEFAULT true,
    typical_recovery_days INTEGER,
    legal_deadline_days INTEGER,  -- Plazo legal para reportar
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(region, type_code)
);

CREATE INDEX idx_oh_claim_types_region ON oh_claim_types(region);
CREATE INDEX idx_oh_claim_types_active ON oh_claim_types(is_active);

COMMENT ON TABLE oh_claim_types IS 'Tipos de reclamos de accidentes laborales parametrizados por región';
COMMENT ON COLUMN oh_claim_types.region IS 'Código de región: US, AR, MX, BR, CL, CO, PE, etc.';
COMMENT ON COLUMN oh_claim_types.severity_level IS 'Nivel de severidad: minor, moderate, severe, critical, fatal';
COMMENT ON COLUMN oh_claim_types.legal_deadline_days IS 'Días límite legales para reportar el accidente';

-- ============================================================================
-- TABLA 2: Reclamos de Workers' Compensation
-- ============================================================================
CREATE TABLE IF NOT EXISTS oh_workers_compensation_claims (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    claim_number VARCHAR(100) UNIQUE NOT NULL,  -- Auto-generado: WC-2025-00001

    -- Información del Incidente
    incident_date DATE NOT NULL,
    incident_time TIME,
    incident_location TEXT,
    department VARCHAR(100),
    supervisor_name VARCHAR(200),

    -- Tipo de Reclamo
    claim_type_id INTEGER NOT NULL REFERENCES oh_claim_types(id),
    country_code VARCHAR(10) NOT NULL,

    -- Descripción del Incidente
    injury_description TEXT NOT NULL,
    body_part_affected VARCHAR(100),
    injury_cause TEXT,
    witnesses TEXT,  -- Nombres de testigos separados por comas

    -- Estado del Reclamo
    status VARCHAR(50) NOT NULL DEFAULT 'reported',
    -- reported, under_review, approved, rejected, in_treatment, closed, appealed

    -- Información Médica
    medical_treatment_required BOOLEAN DEFAULT false,
    medical_facility_name VARCHAR(200),
    treating_physician VARCHAR(200),
    first_aid_provided BOOLEAN DEFAULT false,
    first_aid_description TEXT,
    hospitalization_required BOOLEAN DEFAULT false,
    work_days_lost INTEGER DEFAULT 0,
    estimated_return_date DATE,
    actual_return_date DATE,

    -- Información de ART/Aseguradora (para Argentina)
    art_company_name VARCHAR(200),
    art_policy_number VARCHAR(100),
    art_claim_number VARCHAR(100),
    art_case_manager VARCHAR(200),
    art_case_manager_phone VARCHAR(50),
    art_case_manager_email VARCHAR(200),

    -- Información Legal/Regulatoria
    osha_recordable BOOLEAN DEFAULT false,  -- Para US
    osha_classification VARCHAR(50),
    reported_to_authority BOOLEAN DEFAULT false,
    authority_reference_number VARCHAR(100),
    reported_to_authority_date DATE,

    -- Costos
    estimated_cost_medical DECIMAL(10, 2),
    estimated_cost_compensation DECIMAL(10, 2),
    actual_cost_medical DECIMAL(10, 2),
    actual_cost_compensation DECIMAL(10, 2),

    -- Prevención
    preventive_measures_taken TEXT,
    similar_incidents_count INTEGER DEFAULT 0,

    -- Seguimiento
    case_notes TEXT,
    resolution_notes TEXT,
    closed_date DATE,
    closed_by VARCHAR(200),

    -- Metadata
    documents_count INTEGER DEFAULT 0,
    reported_by VARCHAR(200),
    reported_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_by VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_claim_company FOREIGN KEY (company_id)
        REFERENCES companies(company_id) ON DELETE CASCADE
);

-- Índices para búsqueda eficiente
CREATE INDEX idx_oh_wc_claims_company ON oh_workers_compensation_claims(company_id);
CREATE INDEX idx_oh_wc_claims_employee ON oh_workers_compensation_claims(employee_id);
CREATE INDEX idx_oh_wc_claims_status ON oh_workers_compensation_claims(status);
CREATE INDEX idx_oh_wc_claims_incident_date ON oh_workers_compensation_claims(incident_date);
CREATE INDEX idx_oh_wc_claims_claim_type ON oh_workers_compensation_claims(claim_type_id);
CREATE INDEX idx_oh_wc_claims_country ON oh_workers_compensation_claims(country_code);
CREATE INDEX idx_oh_wc_claims_number ON oh_workers_compensation_claims(claim_number);
CREATE INDEX idx_oh_wc_claims_deleted ON oh_workers_compensation_claims(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE oh_workers_compensation_claims IS 'Reclamos de accidentes laborales y compensaciones (multi-región)';
COMMENT ON COLUMN oh_workers_compensation_claims.status IS 'reported | under_review | approved | rejected | in_treatment | closed | appealed';
COMMENT ON COLUMN oh_workers_compensation_claims.osha_recordable IS 'Indica si debe registrarse en OSHA (solo US)';
COMMENT ON COLUMN oh_workers_compensation_claims.art_company_name IS 'Aseguradora de Riesgos del Trabajo (para Argentina)';

-- ============================================================================
-- TABLA 3: Documentos de Reclamos
-- ============================================================================
CREATE TABLE IF NOT EXISTS oh_claim_documents (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES oh_workers_compensation_claims(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    -- medical_report, witness_statement, employer_report, art_form,
    -- photos, police_report, settlement_agreement, appeal_letter, etc.

    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),

    uploaded_by VARCHAR(200),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(200),
    verified_date TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_claim_doc_claim FOREIGN KEY (claim_id)
        REFERENCES oh_workers_compensation_claims(id) ON DELETE CASCADE
);

CREATE INDEX idx_oh_claim_docs_claim ON oh_claim_documents(claim_id);
CREATE INDEX idx_oh_claim_docs_type ON oh_claim_documents(document_type);

COMMENT ON TABLE oh_claim_documents IS 'Documentos adjuntos a reclamos de accidentes laborales';
COMMENT ON COLUMN oh_claim_documents.document_type IS 'Tipo: medical_report, witness_statement, employer_report, art_form, photos, etc.';

-- ============================================================================
-- TABLA 4: Historial de Estados del Reclamo
-- ============================================================================
CREATE TABLE IF NOT EXISTS oh_claim_status_history (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES oh_workers_compensation_claims(id) ON DELETE CASCADE,

    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,

    changed_by VARCHAR(200) NOT NULL,
    change_reason TEXT,
    notes TEXT,

    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_claim_history_claim FOREIGN KEY (claim_id)
        REFERENCES oh_workers_compensation_claims(id) ON DELETE CASCADE
);

CREATE INDEX idx_oh_claim_history_claim ON oh_claim_status_history(claim_id);
CREATE INDEX idx_oh_claim_history_date ON oh_claim_status_history(changed_at);

COMMENT ON TABLE oh_claim_status_history IS 'Historial de cambios de estado de reclamos';

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Función para generar número de reclamo único
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    claim_number TEXT;
BEGIN
    -- Obtener el siguiente número secuencial del año actual
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(claim_number FROM 9 FOR 5) AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM oh_workers_compensation_claims
    WHERE claim_number LIKE 'WC-' || TO_CHAR(NOW(), 'YYYY') || '-%';

    -- Formatear: WC-2025-00001
    claim_number := 'WC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_number::TEXT, 5, '0');

    RETURN claim_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_claim_number() IS 'Genera número único de reclamo: WC-YYYY-NNNNN';

-- Trigger para actualizar documents_count
CREATE OR REPLACE FUNCTION update_claim_documents_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE oh_workers_compensation_claims
        SET documents_count = documents_count + 1
        WHERE id = NEW.claim_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE oh_workers_compensation_claims
        SET documents_count = GREATEST(documents_count - 1, 0)
        WHERE id = OLD.claim_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_oh_claim_docs_count
AFTER INSERT OR DELETE ON oh_claim_documents
FOR EACH ROW EXECUTE FUNCTION update_claim_documents_count();

COMMENT ON FUNCTION update_claim_documents_count() IS 'Actualiza contador de documentos en reclamo';

-- Trigger para registrar cambios de estado
CREATE OR REPLACE FUNCTION log_claim_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO oh_claim_status_history (
            claim_id,
            previous_status,
            new_status,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.last_updated_by,
            'Status changed via claim update'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_oh_claim_status_change
AFTER UPDATE ON oh_workers_compensation_claims
FOR EACH ROW EXECUTE FUNCTION log_claim_status_change();

COMMENT ON FUNCTION log_claim_status_change() IS 'Registra automáticamente cambios de estado en historial';

-- ============================================================================
-- SEED DATA: Tipos de Reclamos por Región
-- ============================================================================

-- Estados Unidos (OSHA Classification)
INSERT INTO oh_claim_types (region, type_code, name_i18n, description_i18n, severity_level, typical_recovery_days, legal_deadline_days, display_order) VALUES
('US', 'slip_fall', '{"en":"Slip and Fall","es":"Resbalón y Caída","pt":"Escorregão e Queda"}', '{"en":"Falls on same level","es":"Caídas al mismo nivel","pt":"Quedas no mesmo nível"}', 'moderate', 14, 7, 1),
('US', 'fall_height', '{"en":"Fall from Height","es":"Caída desde Altura","pt":"Queda de Altura"}', '{"en":"Falls to lower level","es":"Caídas a diferente nivel","pt":"Quedas para nível inferior"}', 'severe', 60, 3, 2),
('US', 'struck_by', '{"en":"Struck by Object","es":"Golpeado por Objeto","pt":"Atingido por Objeto"}', '{"en":"Hit by falling or flying object","es":"Golpeado por objeto que cae o vuela","pt":"Atingido por objeto em queda ou em movimento"}', 'moderate', 21, 7, 3),
('US', 'caught_in', '{"en":"Caught In/Between","es":"Atrapado En/Entre","pt":"Preso Em/Entre"}', '{"en":"Caught in equipment or machinery","es":"Atrapado en equipo o maquinaria","pt":"Preso em equipamento ou maquinaria"}', 'severe', 45, 3, 4),
('US', 'repetitive_motion', '{"en":"Repetitive Motion","es":"Movimiento Repetitivo","pt":"Movimento Repetitivo"}', '{"en":"Overexertion or repetitive stress","es":"Sobreesfuerzo o estrés repetitivo","pt":"Esforço excessivo ou estresse repetitivo"}', 'minor', 30, 14, 5),
('US', 'chemical_exposure', '{"en":"Chemical Exposure","es":"Exposición Química","pt":"Exposição Química"}', '{"en":"Harmful substance exposure","es":"Exposición a sustancias nocivas","pt":"Exposição a substâncias nocivas"}', 'severe', 90, 1, 6),
('US', 'vehicle_accident', '{"en":"Vehicle Accident","es":"Accidente Vehicular","pt":"Acidente Veicular"}', '{"en":"Motor vehicle accident during work","es":"Accidente de vehículo durante trabajo","pt":"Acidente de veículo durante o trabalho"}', 'severe', 60, 3, 7);

-- Argentina (ART - Aseguradoras de Riesgos del Trabajo)
INSERT INTO oh_claim_types (region, type_code, name_i18n, description_i18n, severity_level, typical_recovery_days, legal_deadline_days, display_order) VALUES
('AR', 'accidente_trabajo', '{"en":"Work Accident","es":"Accidente de Trabajo","pt":"Acidente de Trabalho"}', '{"en":"Sudden injury during work","es":"Lesión súbita durante el trabajo","pt":"Lesão súbita durante o trabalho"}', 'moderate', 30, 1, 1),
('AR', 'enfermedad_profesional', '{"en":"Occupational Disease","es":"Enfermedad Profesional","pt":"Doença Ocupacional"}', '{"en":"Illness caused by work conditions","es":"Enfermedad causada por condiciones de trabajo","pt":"Doença causada por condições de trabalho"}', 'severe', 90, 30, 2),
('AR', 'accidente_in_itinere', '{"en":"Commute Accident","es":"Accidente In Itinere","pt":"Acidente de Trajeto"}', '{"en":"Accident during commute to/from work","es":"Accidente durante trayecto al/del trabajo","pt":"Acidente durante trajeto ao/do trabalho"}', 'moderate', 30, 1, 3),
('AR', 'caida_altura', '{"en":"Fall from Height","es":"Caída de Altura","pt":"Queda de Altura"}', '{"en":"Fall from elevated location","es":"Caída desde ubicación elevada","pt":"Queda de local elevado"}', 'severe', 60, 1, 4),
('AR', 'quemadura', '{"en":"Burn Injury","es":"Quemadura","pt":"Queimadura"}', '{"en":"Thermal, chemical or electrical burn","es":"Quemadura térmica, química o eléctrica","pt":"Queimadura térmica, química ou elétrica"}', 'severe', 45, 1, 5),
('AR', 'corte_laceracion', '{"en":"Cut/Laceration","es":"Corte/Laceración","pt":"Corte/Laceração"}', '{"en":"Cut or laceration injury","es":"Lesión por corte o laceración","pt":"Lesão por corte ou laceração"}', 'minor', 14, 1, 6),
('AR', 'exposicion_ruido', '{"en":"Noise Exposure","es":"Exposición a Ruido","pt":"Exposição a Ruído"}', '{"en":"Hearing damage from noise","es":"Daño auditivo por ruido","pt":"Dano auditivo por ruído"}', 'moderate', 180, 30, 7),
('AR', 'traumatismo_craneo', '{"en":"Head Trauma","es":"Traumatismo de Cráneo","pt":"Traumatismo Craniano"}', '{"en":"Head injury or concussion","es":"Lesión craneal o conmoción","pt":"Lesão craniana ou concussão"}', 'critical', 90, 1, 8);

-- México
INSERT INTO oh_claim_types (region, type_code, name_i18n, description_i18n, severity_level, typical_recovery_days, legal_deadline_days, display_order) VALUES
('MX', 'riesgo_trabajo', '{"en":"Work Risk","es":"Riesgo de Trabajo","pt":"Risco de Trabalho"}', '{"en":"General work-related injury","es":"Lesión general relacionada con el trabajo","pt":"Lesão geral relacionada ao trabalho"}', 'moderate', 30, 2, 1),
('MX', 'enfermedad_trabajo', '{"en":"Work Disease","es":"Enfermedad de Trabajo","pt":"Doença do Trabalho"}', '{"en":"Occupational illness","es":"Enfermedad ocupacional","pt":"Doença ocupacional"}', 'severe', 90, 30, 2),
('MX', 'accidente_trayecto', '{"en":"Commute Accident","es":"Accidente de Trayecto","pt":"Acidente de Trajeto"}', '{"en":"Accident during work commute","es":"Accidente durante trayecto laboral","pt":"Acidente durante trajeto de trabalho"}', 'moderate', 30, 2, 3);

-- Brasil
INSERT INTO oh_claim_types (region, type_code, name_i18n, description_i18n, severity_level, typical_recovery_days, legal_deadline_days, display_order) VALUES
('BR', 'acidente_trabalho', '{"en":"Work Accident","es":"Accidente de Trabajo","pt":"Acidente de Trabalho"}', '{"en":"Work-related injury","es":"Lesión relacionada con el trabajo","pt":"Lesão relacionada ao trabalho"}', 'moderate', 30, 1, 1),
('BR', 'doenca_ocupacional', '{"en":"Occupational Disease","es":"Enfermedad Ocupacional","pt":"Doença Ocupacional"}', '{"en":"Work-caused illness","es":"Enfermedad causada por el trabajo","pt":"Doença causada pelo trabalho"}', 'severe', 90, 15, 2),
('BR', 'acidente_percurso', '{"en":"Commute Accident","es":"Accidente de Trayecto","pt":"Acidente de Percurso"}', '{"en":"Accident during commute","es":"Accidente durante trayecto","pt":"Acidente durante percurso"}', 'moderate', 30, 1, 3);

-- España
INSERT INTO oh_claim_types (region, type_code, name_i18n, description_i18n, severity_level, typical_recovery_days, legal_deadline_days, display_order) VALUES
('ES', 'accidente_laboral', '{"en":"Work Accident","es":"Accidente Laboral","pt":"Acidente de Trabalho"}', '{"en":"Work-related accident","es":"Accidente relacionado con el trabajo","pt":"Acidente relacionado ao trabalho"}', 'moderate', 30, 5, 1),
('ES', 'enfermedad_profesional', '{"en":"Professional Disease","es":"Enfermedad Profesional","pt":"Doença Profissional"}', '{"en":"Occupational disease","es":"Enfermedad ocupacional","pt":"Doença ocupacional"}', 'severe', 90, 30, 2);

COMMIT;

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'OH-V6-5: Workers Compensation Claims - Migration Complete';
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - oh_claim_types (% rows)', (SELECT COUNT(*) FROM oh_claim_types);
    RAISE NOTICE '  - oh_workers_compensation_claims';
    RAISE NOTICE '  - oh_claim_documents';
    RAISE NOTICE '  - oh_claim_status_history';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - generate_claim_number()';
    RAISE NOTICE '  - update_claim_documents_count()';
    RAISE NOTICE '  - log_claim_status_change()';
    RAISE NOTICE '';
    RAISE NOTICE 'Claim types by region:';
    RAISE NOTICE '  - US: % types', (SELECT COUNT(*) FROM oh_claim_types WHERE region = 'US');
    RAISE NOTICE '  - AR: % types', (SELECT COUNT(*) FROM oh_claim_types WHERE region = 'AR');
    RAISE NOTICE '  - MX: % types', (SELECT COUNT(*) FROM oh_claim_types WHERE region = 'MX');
    RAISE NOTICE '  - BR: % types', (SELECT COUNT(*) FROM oh_claim_types WHERE region = 'BR');
    RAISE NOTICE '  - ES: % types', (SELECT COUNT(*) FROM oh_claim_types WHERE region = 'ES');
    RAISE NOTICE '====================================================';
END $$;
