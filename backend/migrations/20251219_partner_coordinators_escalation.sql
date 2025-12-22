-- ============================================================================
-- Migración: Sistema de Coordinadores de Asociados + Escalamiento Sin Huecos
-- Fecha: 2025-12-19
-- Descripción: Garantiza que toda notificación escale hasta el nivel más alto
-- ============================================================================

-- Tabla de coordinadores de asociados por empresa
CREATE TABLE IF NOT EXISTS partner_coordinators (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    partner_category VARCHAR(50) NOT NULL, -- 'medical', 'legal', 'hse'
    coordinator_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    coordinator_name VARCHAR(255),
    coordinator_email VARCHAR(255),
    coordinator_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    can_assign_substitutes BOOLEAN DEFAULT TRUE,
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, partner_category)
);

COMMENT ON TABLE partner_coordinators IS 'Coordinadores internos de la empresa para gestionar asociados externos (médicos, legales, HSE)';
COMMENT ON COLUMN partner_coordinators.partner_category IS 'Categoría: medical, legal, hse';
COMMENT ON COLUMN partner_coordinators.can_assign_substitutes IS 'Puede asignar médicos/abogados sustitutos';

-- Índices
CREATE INDEX IF NOT EXISTS idx_partner_coordinators_company ON partner_coordinators(company_id);
CREATE INDEX IF NOT EXISTS idx_partner_coordinators_category ON partner_coordinators(partner_category);
CREATE INDEX IF NOT EXISTS idx_partner_coordinators_active ON partner_coordinators(is_active);

-- Tabla de sustituciones temporales de partners
CREATE TABLE IF NOT EXISTS partner_substitutions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    original_partner_id INTEGER NOT NULL,
    substitute_partner_id INTEGER NOT NULL,
    partner_category VARCHAR(50) NOT NULL,
    reason VARCHAR(500),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    authorized_by_user_id UUID REFERENCES users(user_id),
    authorized_by_coordinator_id INTEGER REFERENCES partner_coordinators(id),
    status VARCHAR(50) DEFAULT 'active', -- active, completed, cancelled
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE partner_substitutions IS 'Registro de sustituciones temporales de partners (ej: médico en vacaciones)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_partner_substitutions_company ON partner_substitutions(company_id);
CREATE INDEX IF NOT EXISTS idx_partner_substitutions_dates ON partner_substitutions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_partner_substitutions_status ON partner_substitutions(status);

-- Extender unified_notifications con campos para partners (SIN foreign key constraint por ahora)
ALTER TABLE unified_notifications
ADD COLUMN IF NOT EXISTS partner_id INTEGER,
ADD COLUMN IF NOT EXISTS partner_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS partner_substitution_id INTEGER,
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS escalation_path TEXT; -- JSON con la cadena completa de escalamiento

-- Agregar constraint DESPUÉS de que las columnas existan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_unified_notifications_partner_substitution'
    ) THEN
        ALTER TABLE unified_notifications
        ADD CONSTRAINT fk_unified_notifications_partner_substitution
        FOREIGN KEY (partner_substitution_id) REFERENCES partner_substitutions(id);
    END IF;
END $$;

COMMENT ON COLUMN unified_notifications.partner_id IS 'ID del partner si la notificación es para un asociado externo';
COMMENT ON COLUMN unified_notifications.partner_category IS 'Categoría del partner: medical, legal, hse';
COMMENT ON COLUMN unified_notifications.escalation_path IS 'JSON: Ruta completa de escalamiento planificada';
COMMENT ON COLUMN unified_notifications.email_sent IS 'Si se envió copia por email';

-- Función: Obtener cadena de escalamiento completa (SIN HUECOS)
CREATE OR REPLACE FUNCTION get_complete_escalation_chain(
    p_user_id UUID,
    p_company_id INTEGER,
    p_notification_type VARCHAR DEFAULT NULL,
    p_partner_category VARCHAR DEFAULT NULL
) RETURNS TABLE (
    level INTEGER,
    role_type VARCHAR,
    user_id UUID,
    user_name VARCHAR,
    user_email VARCHAR,
    fallback_to_general_manager BOOLEAN,
    notes TEXT
) AS $$
BEGIN
    -- Nivel 1: Supervisor inmediato (del organigrama)
    RETURN QUERY
    SELECT
        1 AS level,
        'supervisor' AS role_type,
        u.user_id,
        u."firstName" || ' ' || u."lastName" AS user_name,
        u.email AS user_email,
        FALSE AS fallback_to_general_manager,
        'Supervisor inmediato según organigrama' AS notes
    FROM users requester
    JOIN organizational_positions requester_op ON requester.organizational_position_id = requester_op.id
    JOIN users u ON u.organizational_position_id = requester_op.parent_position_id
    WHERE requester.user_id = p_user_id
      AND u.company_id = p_company_id
      AND u.is_active = TRUE
    LIMIT 1;

    -- Nivel 2: Gerente de RRHH o Coordinador específico (si aplica)
    IF p_partner_category IS NOT NULL THEN
        -- Si es notificación de partner, escalar a coordinador
        RETURN QUERY
        SELECT
            2 AS level,
            'coordinator_' || p_partner_category AS role_type,
            u.user_id,
            pc.coordinator_name AS user_name,
            pc.coordinator_email AS user_email,
            FALSE AS fallback_to_general_manager,
            'Coordinador de ' || p_partner_category AS notes
        FROM partner_coordinators pc
        LEFT JOIN users u ON pc.coordinator_user_id = u.user_id
        WHERE pc.company_id = p_company_id
          AND pc.partner_category = p_partner_category
          AND pc.is_active = TRUE
        LIMIT 1;
    ELSE
        -- Notificación normal, escalar a RRHH
        RETURN QUERY
        SELECT
            2 AS level,
            'rrhh' AS role_type,
            u.user_id,
            u."firstName" || ' ' || u."lastName" AS user_name,
            u.email AS user_email,
            FALSE AS fallback_to_general_manager,
            'Gerente de RRHH' AS notes
        FROM users u
        JOIN organizational_positions op ON u.organizational_position_id = op.id
        WHERE u.company_id = p_company_id
          AND u.is_active = TRUE
          AND (
              LOWER(op.position_name) LIKE '%rrhh%' OR
              LOWER(op.position_name) LIKE '%recursos humanos%' OR
              LOWER(op.position_name) LIKE '%hr%'
          )
        ORDER BY op.hierarchy_level ASC
        LIMIT 1;
    END IF;

    -- Nivel 3 (FINAL): Gerente General (SIEMPRE existe como fallback)
    RETURN QUERY
    SELECT
        3 AS level,
        'gerente_general' AS role_type,
        u.user_id,
        u."firstName" || ' ' || u."lastName" AS user_name,
        u.email AS user_email,
        TRUE AS fallback_to_general_manager,
        'Gerente General - Nivel más alto' AS notes
    FROM users u
    JOIN organizational_positions op ON u.organizational_position_id = op.id
    WHERE u.company_id = p_company_id
      AND u.is_active = TRUE
      AND op.hierarchy_level = 1 -- Nivel más alto (gerencia)
    ORDER BY op.hierarchy_level ASC
    LIMIT 1;

    -- Fallback absoluto: Administrador de la empresa
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            3 AS level,
            'admin_fallback' AS role_type,
            u.user_id,
            u."firstName" || ' ' || u."lastName" AS user_name,
            u.email AS user_email,
            TRUE AS fallback_to_general_manager,
            'Administrador - Fallback final' AS notes
        FROM users u
        WHERE u.company_id = p_company_id
          AND u.role = 'admin'
          AND u.is_active = TRUE
        ORDER BY u.created_at ASC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_complete_escalation_chain IS 'Retorna cadena completa de escalamiento SIN HUECOS garantizando llegada hasta gerente general';

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Tablas partner_coordinators y partner_substitutions creadas';
    RAISE NOTICE '✅ Campos extendidos en unified_notifications';
    RAISE NOTICE '✅ Función get_complete_escalation_chain() creada';
    RAISE NOTICE '✅ Sistema de escalamiento sin huecos LISTO';
END $$;
