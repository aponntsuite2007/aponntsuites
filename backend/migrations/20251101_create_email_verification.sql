/**
 * MIGRACIÓN: Sistema de Verificación de Email
 * Fecha: 2025-11-01
 * Descripción: Tabla para tokens de verificación de email de TODOS los tipos de usuarios
 */

-- =========================================================================
-- TABLA: email_verification_tokens
-- =========================================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('employee', 'vendor', 'leader', 'supervisor', 'partner', 'admin')),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================================
-- ÍNDICES
-- =========================================================================
CREATE INDEX idx_email_verification_user ON email_verification_tokens(user_id, user_type);
CREATE INDEX idx_email_verification_token ON email_verification_tokens(token) WHERE is_verified = FALSE;
CREATE INDEX idx_email_verification_expires ON email_verification_tokens(expires_at) WHERE is_verified = FALSE;

-- =========================================================================
-- COMENTARIOS
-- =========================================================================
COMMENT ON TABLE email_verification_tokens IS 'Tokens de verificación de email para todos los tipos de usuarios del sistema';
COMMENT ON COLUMN email_verification_tokens.user_type IS 'Tipo de usuario: employee (users table), vendor/leader/supervisor/partner (partners table)';
COMMENT ON COLUMN email_verification_tokens.token IS 'Token único de verificación (UUID o hash)';
COMMENT ON COLUMN email_verification_tokens.expires_at IS 'Fecha de expiración del token (típicamente 24-48 horas)';

-- =========================================================================
-- FUNCIÓN: Limpiar tokens expirados
-- =========================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_verification_tokens
    WHERE is_verified = FALSE
      AND expires_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_verification_tokens() IS 'Limpia tokens expirados no verificados con más de 7 días de antigüedad';

-- =========================================================================
-- DATOS INICIALES (opcional)
-- =========================================================================
-- No se requieren datos iniciales
