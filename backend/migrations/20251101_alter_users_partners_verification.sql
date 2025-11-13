/**
 * MIGRACIÓN: Agregar campos de verificación a users y partners
 * Fecha: 2025-11-01
 * Descripción: Campos para email_verified y pending_consents
 */

-- =========================================================================
-- MODIFICAR: users (empleados de empresas)
-- =========================================================================

-- Agregar columnas si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified_at') THEN
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pending_consents') THEN
        ALTER TABLE users ADD COLUMN pending_consents UUID[] DEFAULT '{}';
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_pending_consents ON users USING GIN(pending_consents);

-- Comentarios
COMMENT ON COLUMN users.email_verified IS 'Indica si el email del usuario ha sido verificado';
COMMENT ON COLUMN users.email_verified_at IS 'Fecha y hora de verificación del email';
COMMENT ON COLUMN users.pending_consents IS 'Array de consent_ids pendientes de aceptación';

-- =========================================================================
-- MODIFICAR: partners (vendors, leaders, supervisors, associates)
-- =========================================================================

-- Agregar columnas si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'email_verified') THEN
        ALTER TABLE partners ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'email_verified_at') THEN
        ALTER TABLE partners ADD COLUMN email_verified_at TIMESTAMP NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'pending_consents') THEN
        ALTER TABLE partners ADD COLUMN pending_consents UUID[] DEFAULT '{}';
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_partners_email_verified ON partners(email_verified);
CREATE INDEX IF NOT EXISTS idx_partners_pending_consents ON partners USING GIN(pending_consents);

-- Comentarios
COMMENT ON COLUMN partners.email_verified IS 'Indica si el email del partner ha sido verificado';
COMMENT ON COLUMN partners.email_verified_at IS 'Fecha y hora de verificación del email';
COMMENT ON COLUMN partners.pending_consents IS 'Array de consent_ids pendientes de aceptación';

-- =========================================================================
-- FUNCIÓN: Verificar email de usuario
-- =========================================================================
CREATE OR REPLACE FUNCTION verify_user_email(
    p_user_id INTEGER,
    p_user_type VARCHAR,
    p_verification_timestamp TIMESTAMP DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_type = 'employee' THEN
        UPDATE users
        SET email_verified = TRUE,
            email_verified_at = p_verification_timestamp
        WHERE user_id = p_user_id;
    ELSE
        UPDATE partners
        SET email_verified = TRUE,
            email_verified_at = p_verification_timestamp
        WHERE id = p_user_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_user_email IS 'Marca el email de un usuario como verificado';

-- =========================================================================
-- FUNCIÓN: Agregar consentimiento pendiente
-- =========================================================================
CREATE OR REPLACE FUNCTION add_pending_consent(
    p_user_id INTEGER,
    p_user_type VARCHAR,
    p_consent_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_type = 'employee' THEN
        UPDATE users
        SET pending_consents = array_append(pending_consents, p_consent_id)
        WHERE user_id = p_user_id
        AND NOT (p_consent_id = ANY(pending_consents));
    ELSE
        UPDATE partners
        SET pending_consents = array_append(pending_consents, p_consent_id)
        WHERE id = p_user_id
        AND NOT (p_consent_id = ANY(pending_consents));
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_pending_consent IS 'Agrega un consentimiento pendiente al array del usuario';

-- =========================================================================
-- FUNCIÓN: Remover consentimiento pendiente
-- =========================================================================
CREATE OR REPLACE FUNCTION remove_pending_consent(
    p_user_id INTEGER,
    p_user_type VARCHAR,
    p_consent_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_type = 'employee' THEN
        UPDATE users
        SET pending_consents = array_remove(pending_consents, p_consent_id)
        WHERE user_id = p_user_id;
    ELSE
        UPDATE partners
        SET pending_consents = array_remove(pending_consents, p_consent_id)
        WHERE id = p_user_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remove_pending_consent IS 'Remueve un consentimiento pendiente del array del usuario';

-- =========================================================================
-- FUNCIÓN: Obtener info de usuario con verificación
-- =========================================================================
CREATE OR REPLACE FUNCTION get_user_verification_status(
    p_user_id INTEGER,
    p_user_type VARCHAR
)
RETURNS TABLE (
    user_id INTEGER,
    email VARCHAR,
    email_verified BOOLEAN,
    email_verified_at TIMESTAMP,
    pending_consents_count INTEGER,
    has_required_pending BOOLEAN
) AS $$
BEGIN
    IF p_user_type = 'employee' THEN
        RETURN QUERY
        SELECT
            u.user_id,
            u.email,
            u.email_verified,
            u.email_verified_at,
            COALESCE(array_length(u.pending_consents, 1), 0) as pending_consents_count,
            COALESCE(has_pending_required_consents(u.user_id, 'employee'), false) as has_required_pending
        FROM users u
        WHERE u.user_id = p_user_id;
    ELSE
        RETURN QUERY
        SELECT
            p.id as user_id,
            p.email,
            p.email_verified,
            p.email_verified_at,
            COALESCE(array_length(p.pending_consents, 1), 0) as pending_consents_count,
            COALESCE(has_pending_required_consents(p.id, p_user_type), false) as has_required_pending
        FROM partners p
        WHERE p.id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_verification_status IS 'Obtiene el estado de verificación completo de un usuario';

-- =========================================================================
-- DATOS INICIALES (opcional)
-- =========================================================================

-- Marcar emails existentes como NO verificados (para forzar verificación)
-- Los usuarios existentes tendrán que verificar su email la próxima vez que se logueen

-- Si quieres marcar todos los existentes como verificados (para producción):
-- UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE email IS NOT NULL;
-- UPDATE partners SET email_verified = TRUE, email_verified_at = NOW() WHERE email IS NOT NULL;

-- =========================================================================
-- FIN DE MIGRACIÓN
-- =========================================================================
