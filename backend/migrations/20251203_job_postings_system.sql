-- =====================================================
-- SISTEMA DE POSTULACIONES LABORALES
-- Migración: 20251203_job_postings_system.sql
-- =====================================================
-- Flujo: Postulación → Aprobación RRHH → Examen Médico → Alta Empleado
-- =====================================================

-- =====================================================
-- TABLA 1: job_postings (Ofertas laborales)
-- =====================================================
CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Información básica de la oferta
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    responsibilities TEXT,

    -- Clasificación
    department_id INTEGER REFERENCES departments(id),
    department_name VARCHAR(100), -- Redundante para queries rápidas
    location VARCHAR(255),
    job_type VARCHAR(50) DEFAULT 'full-time' CHECK (job_type IN (
        'full-time', 'part-time', 'contract', 'temporary', 'internship'
    )),

    -- Compensación
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    salary_currency VARCHAR(3) DEFAULT 'ARS',
    salary_period VARCHAR(20) DEFAULT 'monthly' CHECK (salary_period IN (
        'hourly', 'daily', 'weekly', 'monthly', 'yearly'
    )),
    benefits JSONB DEFAULT '[]'::JSONB, -- [{name, description}]

    -- Estado y visibilidad
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
        'draft', 'active', 'paused', 'closed', 'filled'
    )),
    is_public BOOLEAN DEFAULT true, -- Visible en portal público
    is_internal BOOLEAN DEFAULT false, -- Solo para empleados actuales

    -- Configuración
    max_applications INTEGER, -- NULL = sin límite
    auto_close_date DATE, -- Cierre automático
    requires_cv BOOLEAN DEFAULT true,
    requires_cover_letter BOOLEAN DEFAULT false,

    -- Tags y búsqueda
    tags JSONB DEFAULT '[]'::JSONB, -- ["remoto", "senior", etc.]
    skills_required JSONB DEFAULT '[]'::JSONB, -- [{skill, level, required}]

    -- Responsables
    hiring_manager_id UUID REFERENCES users(user_id),
    recruiter_id UUID REFERENCES users(user_id),

    -- Métricas
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,

    -- Timestamps
    posted_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_job_postings_company ON job_postings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings(department_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_active ON job_postings(company_id, status) WHERE status = 'active';

COMMENT ON TABLE job_postings IS 'Ofertas laborales publicadas por empresas';

-- =====================================================
-- TABLA 2: job_applications (Postulaciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS job_applications (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    job_posting_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,

    -- =====================================================
    -- DATOS DEL CANDIDATO (antes de ser empleado)
    -- =====================================================
    candidate_first_name VARCHAR(100) NOT NULL,
    candidate_last_name VARCHAR(100) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    candidate_phone VARCHAR(50),
    candidate_dni VARCHAR(20), -- DNI/Documento
    candidate_birth_date DATE,
    candidate_gender VARCHAR(20),
    candidate_nationality VARCHAR(100),
    candidate_address TEXT,
    candidate_city VARCHAR(100),
    candidate_province VARCHAR(100),
    candidate_postal_code VARCHAR(20),

    -- =====================================================
    -- INFORMACIÓN PROFESIONAL
    -- =====================================================
    experience_years INTEGER,
    current_position VARCHAR(255),
    current_company VARCHAR(255),
    education_level VARCHAR(50), -- secundario, terciario, universitario, posgrado
    education_title VARCHAR(255),
    skills JSONB DEFAULT '[]'::JSONB, -- [{skill, level}]
    languages JSONB DEFAULT '[]'::JSONB, -- [{language, level}]
    certifications JSONB DEFAULT '[]'::JSONB,

    -- =====================================================
    -- DOCUMENTOS
    -- =====================================================
    cv_file_path VARCHAR(500),
    cv_file_name VARCHAR(255),
    cv_uploaded_at TIMESTAMP WITH TIME ZONE,
    cover_letter TEXT,
    additional_documents JSONB DEFAULT '[]'::JSONB, -- [{name, path, type}]

    -- =====================================================
    -- EXPECTATIVAS
    -- =====================================================
    salary_expectation DECIMAL(12,2),
    availability VARCHAR(50), -- inmediata, 15_dias, 30_dias, etc.
    preferred_schedule VARCHAR(100),
    willing_to_relocate BOOLEAN DEFAULT false,

    -- =====================================================
    -- FLUJO DE ESTADOS (CRÍTICO)
    -- =====================================================
    status VARCHAR(50) DEFAULT 'nuevo' CHECK (status IN (
        'nuevo',                    -- Recién postulado
        'revision',                 -- RRHH está revisando
        'entrevista_pendiente',     -- Citado a entrevista
        'entrevista_realizada',     -- Entrevista completada
        'aprobado_administrativo',  -- ✅ RRHH aprobó → DISPARA NOTIF MÉDICO
        'examen_pendiente',         -- Esperando examen preocupacional
        'examen_realizado',         -- Examen completado, esperando resultado
        'apto',                     -- ✅ Examen aprobado → PUEDE SER EMPLEADO
        'apto_con_observaciones',   -- Apto pero con restricciones
        'no_apto',                  -- ❌ No apto médicamente
        'contratado',               -- ✅ Ya es empleado (user creado)
        'rechazado',                -- ❌ Rechazado en cualquier etapa
        'desistio'                  -- Candidato desistió
    )),

    -- =====================================================
    -- TRACKING DE ESTADOS
    -- =====================================================
    status_history JSONB DEFAULT '[]'::JSONB,
    -- [{status, changed_at, changed_by, notes}]

    -- Revisión RRHH
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    review_score INTEGER CHECK (review_score >= 1 AND review_score <= 10),

    -- Entrevista
    interview_scheduled_at TIMESTAMP WITH TIME ZONE,
    interview_location VARCHAR(255),
    interview_type VARCHAR(50), -- presencial, virtual, telefonica
    interview_notes TEXT,
    interview_score INTEGER CHECK (interview_score >= 1 AND review_score <= 10),
    interviewer_id UUID REFERENCES users(user_id),

    -- Aprobación administrativa
    admin_approved_by UUID REFERENCES users(user_id),
    admin_approved_at TIMESTAMP WITH TIME ZONE,
    admin_approval_notes TEXT,

    -- =====================================================
    -- INTEGRACIÓN CON SISTEMA MÉDICO
    -- =====================================================
    medical_record_id INTEGER REFERENCES medical_records(id),
    medical_exam_date DATE,
    medical_result VARCHAR(50), -- apto, no_apto, apto_con_observaciones
    medical_observations TEXT,
    medical_restrictions JSONB DEFAULT '[]'::JSONB,
    medical_approved_by UUID REFERENCES users(user_id),
    medical_approved_at TIMESTAMP WITH TIME ZONE,

    -- =====================================================
    -- CONTRATACIÓN (cuando pasa a empleado)
    -- =====================================================
    hired_at TIMESTAMP WITH TIME ZONE,
    hired_by UUID REFERENCES users(user_id),
    employee_user_id UUID REFERENCES users(user_id), -- FK al usuario creado
    start_date DATE, -- Fecha de inicio laboral
    assigned_department_id INTEGER REFERENCES departments(id),
    assigned_position VARCHAR(255),
    final_salary DECIMAL(12,2),
    contract_type VARCHAR(50), -- indefinido, temporal, prueba

    -- =====================================================
    -- RECHAZO
    -- =====================================================
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES users(user_id),
    rejection_reason VARCHAR(255),
    rejection_notes TEXT,
    rejection_stage VARCHAR(50), -- en qué etapa fue rechazado

    -- =====================================================
    -- NOTIFICACIONES
    -- =====================================================
    notification_sent_to_medical BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    notification_id INTEGER, -- FK a notifications si existe

    -- =====================================================
    -- METADATA
    -- =====================================================
    source VARCHAR(100), -- portal, linkedin, referido, headhunter
    referrer_employee_id UUID REFERENCES users(user_id), -- Si fue referido
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Timestamps
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_job_applications_company ON job_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_posting ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(candidate_email);
CREATE INDEX IF NOT EXISTS idx_job_applications_dni ON job_applications(candidate_dni);
CREATE INDEX IF NOT EXISTS idx_job_applications_pending_medical ON job_applications(company_id, status)
    WHERE status IN ('aprobado_administrativo', 'examen_pendiente');
CREATE INDEX IF NOT EXISTS idx_job_applications_hired ON job_applications(employee_user_id)
    WHERE employee_user_id IS NOT NULL;

COMMENT ON TABLE job_applications IS 'Postulaciones a ofertas laborales con flujo completo hasta contratación';

-- =====================================================
-- TABLA 3: job_application_notes (Notas/Comentarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS job_application_notes (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,

    note_type VARCHAR(50) DEFAULT 'general' CHECK (note_type IN (
        'general', 'rrhh', 'entrevista', 'medico', 'tecnica', 'referencia'
    )),
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false, -- Solo visible para ciertos roles

    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_app_notes_application ON job_application_notes(application_id);

-- =====================================================
-- FUNCIÓN: Actualizar contador de postulaciones
-- =====================================================
CREATE OR REPLACE FUNCTION update_job_posting_applications_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE job_postings
        SET applications_count = applications_count + 1,
            updated_at = NOW()
        WHERE id = NEW.job_posting_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE job_postings
        SET applications_count = applications_count - 1,
            updated_at = NOW()
        WHERE id = OLD.job_posting_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_applications_count ON job_applications;
CREATE TRIGGER trg_update_applications_count
AFTER INSERT OR DELETE ON job_applications
FOR EACH ROW EXECUTE FUNCTION update_job_posting_applications_count();

-- =====================================================
-- FUNCIÓN: Registrar cambio de estado en historial
-- =====================================================
CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_history = COALESCE(NEW.status_history, '[]'::JSONB) ||
            jsonb_build_object(
                'from_status', OLD.status,
                'to_status', NEW.status,
                'changed_at', NOW(),
                'changed_by', COALESCE(NEW.reviewed_by, NEW.admin_approved_by, NEW.medical_approved_by, NEW.hired_by)
            );
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_status_change ON job_applications;
CREATE TRIGGER trg_log_status_change
BEFORE UPDATE ON job_applications
FOR EACH ROW EXECUTE FUNCTION log_application_status_change();

-- =====================================================
-- VISTA: Candidatos pendientes de examen médico
-- =====================================================
CREATE OR REPLACE VIEW v_candidates_pending_medical AS
SELECT
    ja.id AS application_id,
    ja.company_id,
    ja.job_posting_id,
    jp.title AS job_title,
    jp.department_name,
    ja.candidate_first_name,
    ja.candidate_last_name,
    ja.candidate_first_name || ' ' || ja.candidate_last_name AS candidate_full_name,
    ja.candidate_email,
    ja.candidate_phone,
    ja.candidate_dni,
    ja.candidate_birth_date,
    ja.candidate_gender,
    ja.status,
    ja.admin_approved_at,
    ja.admin_approved_by,
    ja.notification_sent_to_medical,
    ja.notification_sent_at,
    ja.applied_at,
    -- Días desde aprobación administrativa
    EXTRACT(DAY FROM NOW() - ja.admin_approved_at) AS days_since_approval
FROM job_applications ja
JOIN job_postings jp ON ja.job_posting_id = jp.id
WHERE ja.status IN ('aprobado_administrativo', 'examen_pendiente')
ORDER BY ja.admin_approved_at ASC;

COMMENT ON VIEW v_candidates_pending_medical IS 'Vista para médicos: candidatos pendientes de examen preocupacional';

-- =====================================================
-- VISTA: Resumen de postulaciones por empresa
-- =====================================================
CREATE OR REPLACE VIEW v_job_applications_summary AS
SELECT
    company_id,
    COUNT(*) AS total_applications,
    COUNT(*) FILTER (WHERE status = 'nuevo') AS nuevas,
    COUNT(*) FILTER (WHERE status = 'revision') AS en_revision,
    COUNT(*) FILTER (WHERE status IN ('entrevista_pendiente', 'entrevista_realizada')) AS en_entrevista,
    COUNT(*) FILTER (WHERE status = 'aprobado_administrativo') AS aprobadas_admin,
    COUNT(*) FILTER (WHERE status IN ('examen_pendiente', 'examen_realizado')) AS en_examen_medico,
    COUNT(*) FILTER (WHERE status = 'apto') AS aptos,
    COUNT(*) FILTER (WHERE status = 'contratado') AS contratados,
    COUNT(*) FILTER (WHERE status = 'rechazado') AS rechazados,
    COUNT(*) FILTER (WHERE status = 'no_apto') AS no_aptos
FROM job_applications
GROUP BY company_id;

-- =====================================================
-- GRANT PERMISOS
-- =====================================================
-- (Los permisos se manejan a nivel de aplicación)

