-- =====================================================
-- MIGRACIÓN: Sistema de Autorizaciones Legales
-- Fecha: 2025-12-03
-- Descripción: Crea tabla legal_edit_authorizations
--              Patrón copiado de medical_edit_authorizations
--
-- Funcionalidades:
--   - Ventanas de edición (48h inicial)
--   - Ventanas post-autorización (24h)
--   - Escalamiento a 2 niveles (RRHH -> Gerencia Legal)
--   - Integración con sistema de notificaciones
--   - Audit trail completo
-- =====================================================

-- Tabla principal de autorizaciones legales
CREATE TABLE IF NOT EXISTS legal_edit_authorizations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Referencia al registro legal
    record_id INTEGER NOT NULL,
    record_table VARCHAR(50) NOT NULL CHECK (record_table IN ('legal_communications', 'user_legal_issues')),
    record_type VARCHAR(50) NOT NULL,

    -- Solicitud
    requested_by UUID NOT NULL REFERENCES users(user_id),
    requested_at TIMESTAMP DEFAULT NOW(),
    request_reason TEXT NOT NULL CHECK (LENGTH(request_reason) >= 10),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('edit', 'delete')),
    proposed_changes JSONB,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Autorización
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'escalated')),
    authorized_by UUID REFERENCES users(user_id),
    authorized_at TIMESTAMP,
    authorization_response TEXT,

    -- Escalamiento
    current_step INTEGER DEFAULT 1 CHECK (current_step IN (1, 2)),
    escalated_at TIMESTAMP,
    escalation_reason VARCHAR(255),

    -- Ventana temporal post-aprobación
    authorization_window_start TIMESTAMP,
    authorization_window_end TIMESTAMP,
    window_used BOOLEAN DEFAULT FALSE,
    window_used_at TIMESTAMP,
    window_action_performed VARCHAR(50),

    -- Integración con notificaciones
    notification_id INTEGER,
    notification_group_id VARCHAR(100),

    -- Contexto legal (jurisdicción)
    jurisdiction_code VARCHAR(10),

    -- Audit trail
    audit_trail JSONB DEFAULT '[]'::JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_window_dates CHECK (
        authorization_window_end IS NULL OR
        authorization_window_start IS NULL OR
        authorization_window_end > authorization_window_start
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_legal_auth_company ON legal_edit_authorizations(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_auth_record ON legal_edit_authorizations(record_id, record_table);
CREATE INDEX IF NOT EXISTS idx_legal_auth_status ON legal_edit_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_legal_auth_requested_by ON legal_edit_authorizations(requested_by);
CREATE INDEX IF NOT EXISTS idx_legal_auth_authorized_by ON legal_edit_authorizations(authorized_by);
CREATE INDEX IF NOT EXISTS idx_legal_auth_notification ON legal_edit_authorizations(notification_id);
CREATE INDEX IF NOT EXISTS idx_legal_auth_pending_step ON legal_edit_authorizations(status, current_step) WHERE status IN ('pending', 'escalated');

-- Agregar columnas de inmutabilidad a legal_communications si no existen
DO $$
BEGIN
    -- is_locked
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_communications' AND column_name = 'is_locked') THEN
        ALTER TABLE legal_communications ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
    END IF;

    -- locked_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_communications' AND column_name = 'locked_at') THEN
        ALTER TABLE legal_communications ADD COLUMN locked_at TIMESTAMP;
    END IF;

    -- edit_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_communications' AND column_name = 'edit_count') THEN
        ALTER TABLE legal_communications ADD COLUMN edit_count INTEGER DEFAULT 0;
    END IF;

    -- last_edited_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_communications' AND column_name = 'last_edited_by') THEN
        ALTER TABLE legal_communications ADD COLUMN last_edited_by UUID REFERENCES users(user_id);
    END IF;

    -- last_edited_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_communications' AND column_name = 'last_edited_at') THEN
        ALTER TABLE legal_communications ADD COLUMN last_edited_at TIMESTAMP;
    END IF;

    -- is_deleted (soft delete)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_communications' AND column_name = 'is_deleted') THEN
        ALTER TABLE legal_communications ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;

    -- deleted_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_communications' AND column_name = 'deleted_at') THEN
        ALTER TABLE legal_communications ADD COLUMN deleted_at TIMESTAMP;
    END IF;

    -- deleted_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_communications' AND column_name = 'deleted_by') THEN
        ALTER TABLE legal_communications ADD COLUMN deleted_by UUID REFERENCES users(user_id);
    END IF;

    -- deletion_reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_communications' AND column_name = 'deletion_reason') THEN
        ALTER TABLE legal_communications ADD COLUMN deletion_reason TEXT;
    END IF;
END $$;

-- Agregar columnas de inmutabilidad a user_legal_issues si no existen
DO $$
BEGIN
    -- is_locked
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_legal_issues' AND column_name = 'is_locked') THEN
        ALTER TABLE user_legal_issues ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
    END IF;

    -- locked_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_legal_issues' AND column_name = 'locked_at') THEN
        ALTER TABLE user_legal_issues ADD COLUMN locked_at TIMESTAMP;
    END IF;

    -- edit_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_legal_issues' AND column_name = 'edit_count') THEN
        ALTER TABLE user_legal_issues ADD COLUMN edit_count INTEGER DEFAULT 0;
    END IF;

    -- last_edited_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_legal_issues' AND column_name = 'last_edited_by') THEN
        ALTER TABLE user_legal_issues ADD COLUMN last_edited_by UUID REFERENCES users(user_id);
    END IF;

    -- last_edited_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_legal_issues' AND column_name = 'last_edited_at') THEN
        ALTER TABLE user_legal_issues ADD COLUMN last_edited_at TIMESTAMP;
    END IF;

    -- is_deleted (soft delete)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_legal_issues' AND column_name = 'is_deleted') THEN
        ALTER TABLE user_legal_issues ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;

    -- deleted_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_legal_issues' AND column_name = 'deleted_at') THEN
        ALTER TABLE user_legal_issues ADD COLUMN deleted_at TIMESTAMP;
    END IF;

    -- deleted_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_legal_issues' AND column_name = 'deleted_by') THEN
        ALTER TABLE user_legal_issues ADD COLUMN deleted_by UUID REFERENCES users(user_id);
    END IF;

    -- deletion_reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_legal_issues' AND column_name = 'deletion_reason') THEN
        ALTER TABLE user_legal_issues ADD COLUMN deletion_reason TEXT;
    END IF;
END $$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_legal_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_auth_updated_at ON legal_edit_authorizations;
CREATE TRIGGER trg_legal_auth_updated_at
    BEFORE UPDATE ON legal_edit_authorizations
    FOR EACH ROW
    EXECUTE FUNCTION update_legal_auth_updated_at();

-- Función helper para obtener autorizaciones pendientes
CREATE OR REPLACE FUNCTION get_pending_legal_authorizations(p_company_id INTEGER, p_step INTEGER DEFAULT NULL)
RETURNS TABLE (
    auth_id INTEGER,
    record_id INTEGER,
    record_table VARCHAR,
    record_type VARCHAR,
    requested_by UUID,
    requestor_name VARCHAR,
    request_reason TEXT,
    action_type VARCHAR,
    priority VARCHAR,
    status VARCHAR,
    current_step INTEGER,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        la.id as auth_id,
        la.record_id,
        la.record_table,
        la.record_type,
        la.requested_by,
        u.name as requestor_name,
        la.request_reason,
        la.action_type::VARCHAR,
        la.priority::VARCHAR,
        la.status::VARCHAR,
        la.current_step,
        la.created_at
    FROM legal_edit_authorizations la
    JOIN users u ON la.requested_by = u.user_id
    WHERE la.company_id = p_company_id
      AND la.status IN ('pending', 'escalated')
      AND (p_step IS NULL OR la.current_step = p_step)
    ORDER BY
        CASE la.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
        END,
        la.requested_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE legal_edit_authorizations IS 'Autorizaciones para edición/eliminación de registros legales bloqueados';
COMMENT ON COLUMN legal_edit_authorizations.record_table IS 'Tabla origen: legal_communications o user_legal_issues';
COMMENT ON COLUMN legal_edit_authorizations.current_step IS '1=RRHH, 2=Gerencia Legal/Supervisor';
COMMENT ON COLUMN legal_edit_authorizations.authorization_window_end IS 'Usuario tiene 24h post-aprobación para actuar';
COMMENT ON COLUMN legal_edit_authorizations.jurisdiction_code IS 'Código país (ARG, BRA, etc) para contexto legal';

-- Verificación final
SELECT '✅ Migración legal_edit_authorizations completada' as status;
