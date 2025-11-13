/**
 * ============================================================================
 * MIGRATION: Add Email Verification Mandatory Fields
 * ============================================================================
 *
 * Agrega campos necesarios para hacer la verificación de email OBLIGATORIA
 * al momento de crear usuarios de cualquier tipo.
 *
 * Cambios:
 * - Tabla users: email_verified, verification_pending, account_status, email_verified_at
 * - Tabla partners: email_verified, verification_pending, account_status, email_verified_at
 * - Valor por defecto: verification_pending = true, isActive/is_active = false
 *
 * @version 1.0.0
 * @created 2025-11-01
 * ============================================================================
 */

-- ============================================================================
-- TABLA: users
-- ============================================================================

-- Agregar columna email_verified si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL;
        COMMENT ON COLUMN users.email_verified IS 'Indica si el email del usuario ha sido verificado';
    END IF;
END $$;

-- Agregar columna verification_pending si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'verification_pending'
    ) THEN
        ALTER TABLE users ADD COLUMN verification_pending BOOLEAN DEFAULT true NOT NULL;
        COMMENT ON COLUMN users.verification_pending IS 'Indica si el usuario está pendiente de verificación de email';
    END IF;
END $$;

-- Agregar columna account_status si no existe (ENUM)
DO $$
BEGIN
    -- Crear tipo ENUM si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_account_status') THEN
        CREATE TYPE user_account_status AS ENUM ('pending_verification', 'active', 'suspended', 'inactive');
    END IF;

    -- Agregar columna si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'account_status'
    ) THEN
        ALTER TABLE users ADD COLUMN account_status user_account_status DEFAULT 'pending_verification'::user_account_status NOT NULL;
        COMMENT ON COLUMN users.account_status IS 'Estado de la cuenta del usuario';
    END IF;
END $$;

-- Agregar columna email_verified_at si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email_verified_at'
    ) THEN
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN users.email_verified_at IS 'Fecha y hora en que se verificó el email';
    END IF;
END $$;

-- Crear índice para búsquedas rápidas por account_status
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status) WHERE account_status = 'pending_verification';
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified) WHERE email_verified = false;

-- ============================================================================
-- TABLA: partners
-- ============================================================================

-- Agregar columna email_verified si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'partners' AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE partners ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL;
        COMMENT ON COLUMN partners.email_verified IS 'Indica si el email del partner ha sido verificado';
    END IF;
END $$;

-- Agregar columna verification_pending si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'partners' AND column_name = 'verification_pending'
    ) THEN
        ALTER TABLE partners ADD COLUMN verification_pending BOOLEAN DEFAULT true NOT NULL;
        COMMENT ON COLUMN partners.verification_pending IS 'Indica si el partner está pendiente de verificación de email';
    END IF;
END $$;

-- Agregar columna account_status si no existe (ENUM)
DO $$
BEGIN
    -- Crear tipo ENUM si no existe (partners usa mismo tipo que users)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_account_status') THEN
        CREATE TYPE partner_account_status AS ENUM ('pending_verification', 'active', 'suspended', 'inactive');
    END IF;

    -- Agregar columna si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'partners' AND column_name = 'account_status'
    ) THEN
        ALTER TABLE partners ADD COLUMN account_status partner_account_status DEFAULT 'pending_verification'::partner_account_status NOT NULL;
        COMMENT ON COLUMN partners.account_status IS 'Estado de la cuenta del partner';
    END IF;
END $$;

-- Agregar columna email_verified_at si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'partners' AND column_name = 'email_verified_at'
    ) THEN
        ALTER TABLE partners ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN partners.email_verified_at IS 'Fecha y hora en que se verificó el email';
    END IF;
END $$;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_partners_account_status ON partners(account_status) WHERE account_status = 'pending_verification';
CREATE INDEX IF NOT EXISTS idx_partners_email_verified ON partners(email_verified) WHERE email_verified = false;

-- ============================================================================
-- ACTUALIZAR USUARIOS EXISTENTES (TRANSICIÓN SUAVE)
-- ============================================================================

-- Marcar usuarios EXISTENTES como verificados (transición suave)
-- Los usuarios creados ANTES de esta migración se consideran verificados automáticamente
UPDATE users
SET
    email_verified = true,
    verification_pending = false,
    account_status = 'active'::user_account_status,
    email_verified_at = NOW()
WHERE "createdAt" < NOW() AND email_verified = false;

UPDATE partners
SET
    email_verified = true,
    verification_pending = false,
    account_status = 'active'::partner_account_status,
    email_verified_at = NOW()
WHERE created_at < NOW() AND email_verified = false;

-- ============================================================================
-- FUNCIÓN HELPER: Verificar si usuario puede iniciar sesión
-- ============================================================================

CREATE OR REPLACE FUNCTION can_user_login(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_email_verified BOOLEAN;
    v_account_status user_account_status;
    v_is_active BOOLEAN;
BEGIN
    SELECT email_verified, account_status, is_active
    INTO v_email_verified, v_account_status, v_is_active
    FROM users
    WHERE user_id = p_user_id;

    -- Usuario puede loguearse SOLO si:
    -- 1. Email verificado
    -- 2. Account status = 'active'
    -- 3. is_active = true
    RETURN v_email_verified = true
        AND v_account_status = 'active'::user_account_status
        AND v_is_active = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_user_login IS 'Verifica si un usuario puede iniciar sesión (email verificado + cuenta activa)';

-- ============================================================================
-- FUNCIÓN HELPER: Verificar si partner puede iniciar sesión
-- ============================================================================

CREATE OR REPLACE FUNCTION can_partner_login(p_partner_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_email_verified BOOLEAN;
    v_account_status partner_account_status;
    v_is_active BOOLEAN;
BEGIN
    SELECT email_verified, account_status, is_active
    INTO v_email_verified, v_account_status, v_is_active
    FROM partners
    WHERE partner_id = p_partner_id;

    -- Partner puede loguearse SOLO si:
    -- 1. Email verificado
    -- 2. Account status = 'active'
    -- 3. is_active = true
    RETURN v_email_verified = true
        AND v_account_status = 'active'::partner_account_status
        AND v_is_active = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_partner_login IS 'Verifica si un partner puede iniciar sesión (email verificado + cuenta activa)';

-- ============================================================================
-- REGISTRO EN SYSTEM CONSCIOUSNESS
-- ============================================================================

INSERT INTO system_consciousness_log (
    event_type,
    result,
    message,
    event_data
) VALUES (
    'migration_executed',
    'success',
    'Email verification OBLIGATORIO activado - Migración 20251101',
    jsonb_build_object(
        'migration', '20251101_add_email_verification_mandatory_fields',
        'tables_modified', ARRAY['users', 'partners'],
        'new_columns', ARRAY['email_verified', 'verification_pending', 'account_status', 'email_verified_at'],
        'impact', 'TODOS los nuevos usuarios deben verificar email antes de activar cuenta',
        'backward_compatibility', 'Usuarios existentes marcados como verificados automáticamente'
    )
);

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- Mostrar resumen de cambios
DO $$
DECLARE
    v_pending_users INTEGER;
    v_pending_partners INTEGER;
    v_active_users INTEGER;
    v_active_partners INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_pending_users FROM users WHERE account_status = 'pending_verification';
    SELECT COUNT(*) INTO v_pending_partners FROM partners WHERE account_status = 'pending_verification';
    SELECT COUNT(*) INTO v_active_users FROM users WHERE account_status = 'active';
    SELECT COUNT(*) INTO v_active_partners FROM partners WHERE account_status = 'active';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Users pendientes de verificación: %', v_pending_users;
    RAISE NOTICE 'Users activos: %', v_active_users;
    RAISE NOTICE 'Partners pendientes de verificación: %', v_pending_partners;
    RAISE NOTICE 'Partners activos: %', v_active_partners;
    RAISE NOTICE '========================================';
END $$;
