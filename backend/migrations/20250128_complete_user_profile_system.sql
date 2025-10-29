-- ============================================================================
-- MIGRACIÓN: SISTEMA COMPLETO DE PERFIL DE EMPLEADO
-- Fecha: 2025-01-28
-- Descripción: Crea todas las tablas necesarias para funcionalidad 100% del modal
-- ============================================================================

-- ============================================================================
-- 1. ANTECEDENTES LABORALES (Work History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_work_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    currently_working BOOLEAN DEFAULT FALSE,
    reason_for_leaving TEXT,
    responsibilities TEXT,
    supervisor_name VARCHAR(255),
    supervisor_contact VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_history_user ON user_work_history(user_id);
CREATE INDEX idx_work_history_company ON user_work_history(company_id);

-- ============================================================================
-- 2. GRUPO FAMILIAR - Cónyuge (Spouse/Marital Status)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_marital_status (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    marital_status VARCHAR(50) NOT NULL CHECK (marital_status IN ('soltero', 'casado', 'divorciado', 'viudo', 'union_libre')),
    spouse_name VARCHAR(255),
    spouse_dni VARCHAR(50),
    spouse_phone VARCHAR(50),
    spouse_occupation VARCHAR(255),
    marriage_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marital_status_user ON user_marital_status(user_id);

-- ============================================================================
-- 3. GRUPO FAMILIAR - Hijos (Children)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_children (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    dni VARCHAR(50),
    birth_date DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('masculino', 'femenino', 'otro')),
    lives_with_employee BOOLEAN DEFAULT TRUE,
    is_dependent BOOLEAN DEFAULT TRUE,
    health_insurance_coverage BOOLEAN DEFAULT FALSE,
    special_needs TEXT,
    school_name VARCHAR(255),
    grade_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_children_user ON user_children(user_id);
CREATE INDEX idx_children_company ON user_children(company_id);

-- ============================================================================
-- 4. GRUPO FAMILIAR - Otros Miembros (Other Family Members)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_family_members (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    dni VARCHAR(50),
    birth_date DATE,
    phone VARCHAR(50),
    lives_with_employee BOOLEAN DEFAULT FALSE,
    is_dependent BOOLEAN DEFAULT FALSE,
    is_emergency_contact BOOLEAN DEFAULT FALSE,
    health_insurance_coverage BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_family_members_user ON user_family_members(user_id);
CREATE INDEX idx_family_members_company ON user_family_members(company_id);

-- ============================================================================
-- 5. EDUCACIÓN (Education)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_education (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    education_level VARCHAR(100) NOT NULL CHECK (education_level IN ('primaria', 'secundaria', 'terciaria', 'universitaria', 'posgrado', 'doctorado')),
    institution_name VARCHAR(255) NOT NULL,
    degree_title VARCHAR(255),
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE,
    graduated BOOLEAN DEFAULT FALSE,
    certificate_file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_education_user ON user_education(user_id);
CREATE INDEX idx_education_company ON user_education(company_id);

-- ============================================================================
-- 6. ANTECEDENTES MÉDICOS - Médico de Cabecera (Primary Physician)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_primary_physician (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    physician_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    clinic_name VARCHAR(255),
    clinic_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_primary_physician_user ON user_primary_physician(user_id);

-- ============================================================================
-- 7. ANTECEDENTES MÉDICOS - Enfermedades Crónicas (Chronic Conditions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_chronic_conditions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    condition_name VARCHAR(255) NOT NULL,
    diagnosis_date DATE,
    severity VARCHAR(50) CHECK (severity IN ('leve', 'moderada', 'grave')),
    requires_treatment BOOLEAN DEFAULT FALSE,
    requires_monitoring BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chronic_conditions_user ON user_chronic_conditions(user_id);
CREATE INDEX idx_chronic_conditions_company ON user_chronic_conditions(company_id);

-- ============================================================================
-- 8. ANTECEDENTES MÉDICOS - Medicamentos (Medications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_medications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    route VARCHAR(50) CHECK (route IN ('oral', 'inyectable', 'topico', 'inhalado', 'otro')),
    start_date DATE,
    end_date DATE,
    is_continuous BOOLEAN DEFAULT FALSE,
    prescribing_doctor VARCHAR(255),
    purpose TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medications_user ON user_medications(user_id);
CREATE INDEX idx_medications_company ON user_medications(company_id);

-- ============================================================================
-- 9. ANTECEDENTES MÉDICOS - Alergias (Allergies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_allergies (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    allergen VARCHAR(255) NOT NULL,
    allergy_type VARCHAR(50) CHECK (allergy_type IN ('medicamento', 'alimento', 'ambiental', 'insecto', 'contacto', 'otro')),
    severity VARCHAR(50) CHECK (severity IN ('leve', 'moderada', 'grave', 'anafilaxia')),
    symptoms TEXT,
    diagnosed_date DATE,
    requires_epipen BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_allergies_user ON user_allergies(user_id);
CREATE INDEX idx_allergies_company ON user_allergies(company_id);

-- ============================================================================
-- 10. ANTECEDENTES MÉDICOS - Restricciones de Actividad (Activity Restrictions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_restrictions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    restriction_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_permanent BOOLEAN DEFAULT FALSE,
    medical_certificate_url TEXT,
    issuing_doctor VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_restrictions_user ON user_activity_restrictions(user_id);
CREATE INDEX idx_activity_restrictions_company ON user_activity_restrictions(company_id);

-- ============================================================================
-- 11. ANTECEDENTES MÉDICOS - Restricciones Laborales (Work Restrictions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_work_restrictions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    restriction_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_permanent BOOLEAN DEFAULT FALSE,
    medical_certificate_url TEXT,
    issuing_doctor VARCHAR(255),
    affects_current_role BOOLEAN DEFAULT FALSE,
    accommodation_needed TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_restrictions_user ON user_work_restrictions(user_id);
CREATE INDEX idx_work_restrictions_company ON user_work_restrictions(company_id);

-- ============================================================================
-- 12. ANTECEDENTES MÉDICOS - Vacunas (Vaccinations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_vaccinations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    vaccine_name VARCHAR(255) NOT NULL,
    vaccine_type VARCHAR(100),
    dose_number INTEGER,
    total_doses INTEGER,
    date_administered DATE NOT NULL,
    next_dose_date DATE,
    administering_institution VARCHAR(255),
    lot_number VARCHAR(100),
    certificate_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vaccinations_user ON user_vaccinations(user_id);
CREATE INDEX idx_vaccinations_company ON user_vaccinations(company_id);

-- ============================================================================
-- 13. ANTECEDENTES MÉDICOS - Exámenes Médicos (Medical Exams)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_medical_exams (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    exam_type VARCHAR(100) NOT NULL CHECK (exam_type IN ('preocupacional', 'periodico', 'reingreso', 'retiro', 'especial')),
    exam_date DATE NOT NULL,
    result VARCHAR(50) CHECK (result IN ('apto', 'apto_con_observaciones', 'no_apto', 'pendiente')),
    observations TEXT,
    next_exam_date DATE,
    medical_center VARCHAR(255),
    examining_doctor VARCHAR(255),
    certificate_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medical_exams_user ON user_medical_exams(user_id);
CREATE INDEX idx_medical_exams_company ON user_medical_exams(company_id);

-- ============================================================================
-- 14. ANTECEDENTES MÉDICOS - Documentos Médicos (Medical Documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_medical_documents (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    upload_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medical_documents_user ON user_medical_documents(user_id);
CREATE INDEX idx_medical_documents_company ON user_medical_documents(company_id);

-- ============================================================================
-- 15. DOCUMENTOS PERSONALES (Personal Documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_documents (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL CHECK (document_type IN ('dni', 'pasaporte', 'licencia_conducir', 'visa', 'certificado_antecedentes', 'otro')),
    document_number VARCHAR(100),
    issue_date DATE,
    expiration_date DATE,
    issuing_authority VARCHAR(255),
    file_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_documents_user ON user_documents(user_id);
CREATE INDEX idx_user_documents_company ON user_documents(company_id);

-- ============================================================================
-- 16. PERMISOS Y AUSENCIAS (Permission Requests)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_permission_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    request_type VARCHAR(100) NOT NULL CHECK (request_type IN ('vacaciones', 'licencia_medica', 'permiso_personal', 'estudio', 'duelo', 'maternidad', 'paternidad', 'otro')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado', 'cancelado')),
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(user_id),
    approval_date TIMESTAMP,
    rejection_reason TEXT,
    supporting_document_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permission_requests_user ON user_permission_requests(user_id);
CREATE INDEX idx_permission_requests_company ON user_permission_requests(company_id);
CREATE INDEX idx_permission_requests_status ON user_permission_requests(status);

-- ============================================================================
-- 17. ACCIONES DISCIPLINARIAS (Disciplinary Actions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_disciplinary_actions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL CHECK (action_type IN ('advertencia_verbal', 'advertencia_escrita', 'suspension', 'descuento', 'despido', 'otro')),
    severity VARCHAR(50) CHECK (severity IN ('leve', 'moderada', 'grave', 'muy_grave')),
    date_occurred DATE NOT NULL,
    description TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    issued_by UUID NOT NULL REFERENCES users(user_id),
    issued_date DATE DEFAULT CURRENT_DATE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    employee_acknowledgement BOOLEAN DEFAULT FALSE,
    employee_comments TEXT,
    supporting_document_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disciplinary_actions_user ON user_disciplinary_actions(user_id);
CREATE INDEX idx_disciplinary_actions_company ON user_disciplinary_actions(company_id);

-- ============================================================================
-- 18. DATOS DE CONTACTO EXTENDIDOS (Extended Contact Info)
-- Ya existe en users, pero agregamos tabla para historial de cambios
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_contact_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES users(user_id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contact_history_user ON user_contact_history(user_id);

-- ============================================================================
-- 19. TRIGGERS PARA updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_work_history_updated_at BEFORE UPDATE ON user_work_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marital_status_updated_at BEFORE UPDATE ON user_marital_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON user_children FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON user_family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_education_updated_at BEFORE UPDATE ON user_education FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_primary_physician_updated_at BEFORE UPDATE ON user_primary_physician FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chronic_conditions_updated_at BEFORE UPDATE ON user_chronic_conditions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON user_medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_allergies_updated_at BEFORE UPDATE ON user_allergies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activity_restrictions_updated_at BEFORE UPDATE ON user_activity_restrictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_restrictions_updated_at BEFORE UPDATE ON user_work_restrictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vaccinations_updated_at BEFORE UPDATE ON user_vaccinations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_exams_updated_at BEFORE UPDATE ON user_medical_exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_documents_updated_at BEFORE UPDATE ON user_medical_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_documents_updated_at BEFORE UPDATE ON user_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permission_requests_updated_at BEFORE UPDATE ON user_permission_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disciplinary_actions_updated_at BEFORE UPDATE ON user_disciplinary_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 20. COMENTARIOS DE TABLAS
-- ============================================================================

COMMENT ON TABLE user_work_history IS 'Historial laboral del empleado';
COMMENT ON TABLE user_marital_status IS 'Estado civil y datos del cónyuge';
COMMENT ON TABLE user_children IS 'Hijos del empleado';
COMMENT ON TABLE user_family_members IS 'Otros familiares del empleado';
COMMENT ON TABLE user_education IS 'Historial educativo';
COMMENT ON TABLE user_primary_physician IS 'Médico de cabecera';
COMMENT ON TABLE user_chronic_conditions IS 'Enfermedades crónicas';
COMMENT ON TABLE user_medications IS 'Medicamentos actuales';
COMMENT ON TABLE user_allergies IS 'Alergias médicas';
COMMENT ON TABLE user_activity_restrictions IS 'Restricciones de actividad física';
COMMENT ON TABLE user_work_restrictions IS 'Restricciones laborales';
COMMENT ON TABLE user_vaccinations IS 'Historial de vacunación';
COMMENT ON TABLE user_medical_exams IS 'Exámenes médicos ocupacionales';
COMMENT ON TABLE user_medical_documents IS 'Documentos médicos escaneados';
COMMENT ON TABLE user_documents IS 'Documentos personales (DNI, pasaporte, etc)';
COMMENT ON TABLE user_permission_requests IS 'Solicitudes de permisos y ausencias';
COMMENT ON TABLE user_disciplinary_actions IS 'Acciones disciplinarias';
COMMENT ON TABLE user_contact_history IS 'Historial de cambios en datos de contacto';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
