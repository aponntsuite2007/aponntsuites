-- ============================================================================
-- MIGRACIÓN: Employee 360° - Schema Completo
-- Fecha: 2025-11-26
-- Descripción: Crea todas las tablas necesarias para el módulo Employee 360°
-- ============================================================================

-- ============================================================================
-- 1. TABLA: trainings (Capacitaciones disponibles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trainings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    duration INTEGER DEFAULT 60, -- duración en minutos
    is_mandatory BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainings_company ON trainings(company_id);
CREATE INDEX IF NOT EXISTS idx_trainings_category ON trainings(category);

-- ============================================================================
-- 2. TABLA: training_assignments (Asignaciones de capacitación)
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_assignments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    training_id INTEGER NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    time_spent_minutes INTEGER DEFAULT 0,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    score NUMERIC(5,2),
    certificate_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_assignments_company ON training_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_user ON training_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_training ON training_assignments(training_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);

-- ============================================================================
-- 3. TABLA: sanctions (Sanciones disciplinarias)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sanctions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    employee_id VARCHAR(50),
    employee_name VARCHAR(255),
    employee_department VARCHAR(255),
    sanction_type VARCHAR(100) NOT NULL CHECK (sanction_type IN ('warning', 'written_warning', 'suspension', 'dismissal', 'other')),
    severity VARCHAR(50) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sanction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'appealed')),
    points_deducted INTEGER DEFAULT 0,
    is_automatic BOOLEAN DEFAULT FALSE,
    related_attendance_id UUID,
    related_incident_id INTEGER,
    created_by UUID REFERENCES users(user_id),
    approved_by UUID REFERENCES users(user_id),
    approval_date TIMESTAMP WITH TIME ZONE,
    appeal_notes TEXT,
    appeal_date TIMESTAMP WITH TIME ZONE,
    appeal_resolved_by UUID REFERENCES users(user_id),
    appeal_resolution TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sanctions_company ON sanctions(company_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_user ON sanctions(user_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_type ON sanctions(sanction_type);
CREATE INDEX IF NOT EXISTS idx_sanctions_status ON sanctions(status);
CREATE INDEX IF NOT EXISTS idx_sanctions_date ON sanctions(sanction_date);

-- ============================================================================
-- 4. TABLA: vacation_requests (Solicitudes de vacaciones/licencias)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vacation_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    request_type VARCHAR(50) DEFAULT 'vacation' CHECK (request_type IN ('vacation', 'personal_leave', 'sick_leave', 'maternity', 'paternity', 'bereavement', 'study', 'other')),
    extraordinary_license_id INTEGER,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
    approved_by UUID REFERENCES users(user_id),
    approval_date TIMESTAMP WITH TIME ZONE,
    approval_comments TEXT,
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'system', 'mobile_app')),
    coverage_assignments JSONB DEFAULT '[]'::jsonb,
    supporting_documents JSONB DEFAULT '[]'::jsonb,
    is_auto_generated BOOLEAN DEFAULT FALSE,
    auto_generation_data JSONB,
    compatibility_score NUMERIC(5,2),
    conflicts JSONB DEFAULT '[]'::jsonb,
    modification_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_vacation_requests_company ON vacation_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_user ON vacation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_status ON vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_dates ON vacation_requests(start_date, end_date);

-- ============================================================================
-- 5. TABLA: medical_certificates (Certificados médicos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_certificates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    certificate_number VARCHAR(100),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    requested_days INTEGER NOT NULL,
    diagnosis_code VARCHAR(50),
    diagnosis VARCHAR(500),
    symptoms TEXT,
    has_visited_doctor BOOLEAN DEFAULT TRUE,
    medical_center VARCHAR(255),
    attending_physician VARCHAR(255),
    medical_prescription TEXT,
    questionnaire JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review', 'expired')),
    auditor_id UUID REFERENCES users(user_id),
    auditor_response TEXT,
    final_diagnosis VARCHAR(500),
    diagnosis_category VARCHAR(100),
    doctor_observations TEXT,
    medical_recommendations TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    treating_physician VARCHAR(255),
    treating_physician_license VARCHAR(100),
    medical_institution VARCHAR(255),
    notify_art BOOLEAN DEFAULT FALSE,
    art_notified BOOLEAN DEFAULT FALSE,
    art_notification_date TIMESTAMP WITH TIME ZONE,
    approved_days INTEGER,
    needs_audit BOOLEAN DEFAULT FALSE,
    is_justified BOOLEAN DEFAULT TRUE,
    audit_date TIMESTAMP WITH TIME ZONE,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES users(user_id),
    last_modified_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_medical_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_medical_certificates_company ON medical_certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_user ON medical_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_status ON medical_certificates(status);
CREATE INDEX IF NOT EXISTS idx_medical_certificates_dates ON medical_certificates(start_date, end_date);

-- ============================================================================
-- 6. Agregar company_id a attendances si no existe (para multi-tenant)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'company_id'
    ) THEN
        -- Agregar columna company_id
        ALTER TABLE attendances ADD COLUMN company_id INTEGER;

        -- Actualizar company_id desde la relación con users
        UPDATE attendances a
        SET company_id = u.company_id
        FROM users u
        WHERE a."UserId" = u.user_id;

        -- Crear índice
        CREATE INDEX IF NOT EXISTS idx_attendances_company ON attendances(company_id);
    END IF;
END $$;

-- ============================================================================
-- 7. Crear vistas para compatibilidad de nombres de columna
-- ============================================================================
CREATE OR REPLACE VIEW v_attendances_360 AS
SELECT
    id,
    "UserId" as user_id,
    company_id,
    date,
    "checkInTime" as check_in,
    "checkOutTime" as check_out,
    "checkInMethod" as "checkInMethod",
    "checkOutMethod" as "checkOutMethod",
    "workingHours" as "workingHours",
    status,
    notes,
    "BranchId" as branch_id,
    kiosk_id,
    origin_type,
    break_out,
    break_in,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM attendances;

-- ============================================================================
-- 8. Datos de ejemplo para testing (solo si las tablas están vacías)
-- ============================================================================

-- Insertar capacitaciones de ejemplo
INSERT INTO trainings (company_id, title, description, category, duration, is_mandatory)
SELECT 11, 'Inducción General', 'Capacitación de inducción para nuevos empleados', 'Inducción', 120, true
WHERE NOT EXISTS (SELECT 1 FROM trainings WHERE company_id = 11 LIMIT 1);

INSERT INTO trainings (company_id, title, description, category, duration, is_mandatory)
SELECT 11, 'Seguridad e Higiene', 'Normas de seguridad y prevención de riesgos', 'Seguridad', 60, true
WHERE NOT EXISTS (SELECT 1 FROM trainings WHERE company_id = 11 AND title = 'Seguridad e Higiene');

INSERT INTO trainings (company_id, title, description, category, duration, is_mandatory)
SELECT 11, 'Manejo de Conflictos', 'Técnicas de resolución de conflictos laborales', 'Desarrollo Personal', 90, false
WHERE NOT EXISTS (SELECT 1 FROM trainings WHERE company_id = 11 AND title = 'Manejo de Conflictos');

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
