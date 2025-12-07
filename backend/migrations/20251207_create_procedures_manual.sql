-- ============================================================================
-- MANUAL DE PROCEDIMIENTOS
-- Sistema de Control Documental de Instructivos y Procedimientos
--
-- Estructura:
-- 1. procedures - Procedimientos/Instructivos principales
-- 2. procedure_versions - Historial de versiones
-- 3. procedure_roles - Roles alcanzados por cada procedimiento
-- 4. procedure_acknowledgements - Acuses de recibo
-- 5. procedure_attachments - Archivos adjuntos
--
-- @version 1.0.0
-- @date 2025-12-07
-- ============================================================================

-- 1. TABLA PRINCIPAL DE PROCEDIMIENTOS
CREATE TABLE IF NOT EXISTS procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Identificacion documental
    code VARCHAR(50) NOT NULL,                    -- Ej: PRO-RRHH-001, INS-OPE-015
    title VARCHAR(255) NOT NULL,                  -- Titulo del procedimiento
    type VARCHAR(20) DEFAULT 'instructivo',       -- 'procedimiento', 'instructivo', 'manual', 'politica'

    -- Versionado
    current_version INTEGER DEFAULT 1,
    version_label VARCHAR(20) DEFAULT '1.0',      -- Ej: 1.0, 1.1, 2.0

    -- Estado del documento
    status VARCHAR(20) DEFAULT 'draft',           -- draft, pending_review, approved, published, obsolete

    -- Contenido documental
    objective TEXT,                               -- Objetivo del procedimiento
    scope TEXT,                                   -- Alcance
    definitions TEXT,                             -- Definiciones y terminologia
    responsibilities TEXT,                        -- Responsabilidades
    procedure_content TEXT,                       -- Descripcion detallada del procedimiento
    "references" TEXT,                            -- Referencias a otros documentos
    annexes TEXT,                                 -- Anexos

    -- Segmentacion organizacional (NULL = aplica a toda la empresa)
    branch_id INTEGER,                            -- Referencia opcional a branches(id)
    department_id INTEGER,                        -- Referencia opcional a departments(id)
    sector_id INTEGER,                            -- Referencia opcional a sectors(id)

    -- Fechas importantes
    effective_date DATE,                          -- Fecha de entrada en vigor
    review_date DATE,                             -- Proxima fecha de revision
    obsolete_date DATE,                           -- Fecha de obsolescencia

    -- Workflow
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    published_by UUID REFERENCES users(user_id) ON DELETE SET NULL,

    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    published_at TIMESTAMP,

    -- Metadata
    tags TEXT[],                                  -- Tags para busqueda
    is_critical BOOLEAN DEFAULT false,            -- Procedimiento critico
    requires_training BOOLEAN DEFAULT false,      -- Requiere capacitacion asociada
    training_module_id UUID,                      -- Referencia a modulo de capacitacion

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, code)
);

-- 2. HISTORIAL DE VERSIONES
CREATE TABLE IF NOT EXISTS procedure_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,

    version_number INTEGER NOT NULL,
    version_label VARCHAR(20) NOT NULL,

    -- Contenido de esta version (snapshot)
    objective TEXT,
    scope TEXT,
    definitions TEXT,
    responsibilities TEXT,
    procedure_content TEXT,
    "references" TEXT,
    annexes TEXT,

    -- Control de cambios
    changes_summary TEXT,                         -- Resumen de cambios respecto a version anterior
    change_reason TEXT,                           -- Motivo del cambio

    -- Quien hizo esta version
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    published_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    published_at TIMESTAMP,

    -- Estado de esta version
    status VARCHAR(20) DEFAULT 'current',         -- current, superseded, draft

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(procedure_id, version_number)
);

-- 3. ROLES ALCANZADOS POR CADA PROCEDIMIENTO
CREATE TABLE IF NOT EXISTS procedure_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,

    -- Puede referenciar a organizational_positions o a roles especificos
    organizational_position_id INTEGER REFERENCES organizational_positions(id) ON DELETE CASCADE,
    role_name VARCHAR(100),                       -- Nombre del rol si no existe en positions

    -- Tipo de alcance
    scope_type VARCHAR(20) DEFAULT 'must_read',   -- must_read, must_execute, must_supervise

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(procedure_id, organizational_position_id)
);

-- 4. ACUSES DE RECIBO
CREATE TABLE IF NOT EXISTS procedure_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    procedure_version_id UUID REFERENCES procedure_versions(id) ON DELETE SET NULL,

    -- Usuario que debe dar acuse
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    employee_id VARCHAR(50),                      -- Legajo
    employee_name VARCHAR(255),                   -- Nombre completo (snapshot)

    -- Estado del acuse
    status VARCHAR(20) DEFAULT 'pending',         -- pending, acknowledged, expired

    -- Notificacion asociada
    notification_id UUID,                         -- Referencia a notification del sistema central
    notification_sent_at TIMESTAMP,

    -- Acuse de recibo
    acknowledged_at TIMESTAMP,
    acknowledgement_ip VARCHAR(45),               -- IP desde donde se dio acuse
    acknowledgement_method VARCHAR(20),           -- 'web', 'mobile', 'email'

    -- Recordatorios
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(procedure_id, procedure_version_id, user_id)
);

-- 5. ARCHIVOS ADJUNTOS
CREATE TABLE IF NOT EXISTS procedure_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    procedure_version_id UUID REFERENCES procedure_versions(id) ON DELETE SET NULL,

    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),                        -- pdf, docx, xlsx, etc.
    file_size INTEGER,                            -- Tamano en bytes
    file_path TEXT,                               -- Ruta en storage
    mime_type VARCHAR(100),

    description TEXT,
    is_main_document BOOLEAN DEFAULT false,       -- Documento principal vs anexo

    uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. COMENTARIOS Y REVISIONES
CREATE TABLE IF NOT EXISTS procedure_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    procedure_version_id UUID REFERENCES procedure_versions(id) ON DELETE SET NULL,

    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    comment_type VARCHAR(20) DEFAULT 'comment',   -- comment, review, approval, rejection
    content TEXT NOT NULL,

    -- Para workflow de aprobacion
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_procedures_company ON procedures(company_id);
CREATE INDEX IF NOT EXISTS idx_procedures_status ON procedures(status);
CREATE INDEX IF NOT EXISTS idx_procedures_code ON procedures(code);
CREATE INDEX IF NOT EXISTS idx_procedures_type ON procedures(type);
CREATE INDEX IF NOT EXISTS idx_procedures_branch ON procedures(branch_id);
CREATE INDEX IF NOT EXISTS idx_procedures_department ON procedures(department_id);
CREATE INDEX IF NOT EXISTS idx_procedures_sector ON procedures(sector_id);

CREATE INDEX IF NOT EXISTS idx_procedure_versions_procedure ON procedure_versions(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_versions_status ON procedure_versions(status);

CREATE INDEX IF NOT EXISTS idx_procedure_roles_procedure ON procedure_roles(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_roles_position ON procedure_roles(organizational_position_id);

CREATE INDEX IF NOT EXISTS idx_procedure_acks_procedure ON procedure_acknowledgements(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_acks_user ON procedure_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_procedure_acks_status ON procedure_acknowledgements(status);

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Funcion para obtener usuarios alcanzados por un procedimiento
CREATE OR REPLACE FUNCTION get_procedure_target_users(p_procedure_id UUID)
RETURNS TABLE (
    user_id UUID,
    employee_id VARCHAR(50),
    full_name VARCHAR(255),
    position_name VARCHAR(100),
    department_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        u.user_id,
        u."employeeId" as employee_id,
        u."firstName" || ' ' || u."lastName" as full_name,
        op.position_name,
        d.name as department_name
    FROM users u
    LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
    LEFT JOIN departments d ON u.department_id = d.id
    INNER JOIN procedure_roles pr ON pr.organizational_position_id = op.id
    WHERE pr.procedure_id = p_procedure_id
      AND u.is_active = true
      AND u.company_id = (SELECT company_id FROM procedures WHERE id = p_procedure_id);
END;
$$ LANGUAGE plpgsql;

-- Funcion para obtener estadisticas de acuses
CREATE OR REPLACE FUNCTION get_procedure_ack_stats(p_procedure_id UUID, p_version_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_users INTEGER,
    acknowledged INTEGER,
    pending INTEGER,
    expired INTEGER,
    ack_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_users,
        COUNT(CASE WHEN pa.status = 'acknowledged' THEN 1 END)::INTEGER as acknowledged,
        COUNT(CASE WHEN pa.status = 'pending' THEN 1 END)::INTEGER as pending,
        COUNT(CASE WHEN pa.status = 'expired' THEN 1 END)::INTEGER as expired,
        ROUND(
            COUNT(CASE WHEN pa.status = 'acknowledged' THEN 1 END)::NUMERIC /
            NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
        ) as ack_percentage
    FROM procedure_acknowledgements pa
    WHERE pa.procedure_id = p_procedure_id
      AND (p_version_id IS NULL OR pa.procedure_version_id = p_version_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VISTA PARA MI ESPACIO - Instructivos del empleado
-- ============================================================================
CREATE OR REPLACE VIEW v_employee_procedures AS
SELECT
    u.user_id,
    u."employeeId" as employee_id,
    u.company_id,
    p.id as procedure_id,
    p.code,
    p.title,
    p.type,
    p.version_label,
    p.status,
    p.effective_date,
    p.is_critical,
    pa.status as acknowledgement_status,
    pa.acknowledged_at,
    pa.notification_sent_at,
    pr.scope_type
FROM users u
INNER JOIN organizational_positions op ON u.organizational_position_id = op.id
INNER JOIN procedure_roles pr ON pr.organizational_position_id = op.id
INNER JOIN procedures p ON p.id = pr.procedure_id
LEFT JOIN procedure_acknowledgements pa ON pa.procedure_id = p.id
    AND pa.user_id = u.user_id
    AND pa.procedure_version_id = (
        SELECT id FROM procedure_versions
        WHERE procedure_id = p.id AND status = 'current'
        LIMIT 1
    )
WHERE p.status = 'published'
  AND u.is_active = true;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE procedures IS 'Manual de Procedimientos - Control Documental';
COMMENT ON TABLE procedure_versions IS 'Historial de versiones de procedimientos';
COMMENT ON TABLE procedure_roles IS 'Roles organizacionales alcanzados por cada procedimiento';
COMMENT ON TABLE procedure_acknowledgements IS 'Acuses de recibo de procedimientos';
COMMENT ON TABLE procedure_attachments IS 'Archivos adjuntos a procedimientos';
COMMENT ON TABLE procedure_comments IS 'Comentarios y revisiones de procedimientos';

-- ============================================================================
-- DATOS INICIALES - Tipos de procedimiento
-- ============================================================================
-- No se insertan datos iniciales, cada empresa crea sus propios procedimientos
