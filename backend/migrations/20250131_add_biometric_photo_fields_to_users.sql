-- ==============================================================================
-- MIGRACIÓN: Agregar campos de foto biométrica a usuarios
-- ==============================================================================
-- Descripción: Agrega campos para gestionar fotos biométricas con vencimiento
--              anual y sistema de notificaciones automáticas
-- Fecha: 2025-01-31
-- Autor: Sistema Biométrico Enterprise
-- ==============================================================================

BEGIN;

-- 1. Agregar columnas de foto biométrica a la tabla users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS biometric_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS biometric_photo_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS biometric_photo_expiration TIMESTAMP;

-- 2. Agregar comentarios a las columnas
COMMENT ON COLUMN users.biometric_photo_url IS 'URL de la foto visible capturada durante el registro biométrico';
COMMENT ON COLUMN users.biometric_photo_date IS 'Fecha de captura de la foto biométrica';
COMMENT ON COLUMN users.biometric_photo_expiration IS 'Fecha de vencimiento de la foto biométrica (renovación anual)';

-- 3. Crear índice para búsquedas eficientes de fotos próximas a vencer
CREATE INDEX IF NOT EXISTS idx_users_biometric_photo_expiration
    ON users (biometric_photo_expiration)
    WHERE biometric_photo_expiration IS NOT NULL;

-- 4. Crear función helper para calcular fecha de vencimiento (1 año desde captura)
CREATE OR REPLACE FUNCTION calculate_biometric_photo_expiration(p_capture_date TIMESTAMP)
RETURNS TIMESTAMP AS $$
BEGIN
    -- Vencimiento: 1 año (365 días) desde la fecha de captura
    RETURN p_capture_date + INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_biometric_photo_expiration(TIMESTAMP) IS 'Calcula la fecha de vencimiento de foto biométrica (1 año desde captura)';

-- 5. Crear función para obtener usuarios con fotos próximas a vencer
CREATE OR REPLACE FUNCTION get_users_with_expiring_photos(p_days_threshold INTEGER DEFAULT 30)
RETURNS TABLE (
    user_id UUID,
    usuario VARCHAR(50),
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100),
    email VARCHAR(255),
    company_id INTEGER,
    biometric_photo_url TEXT,
    biometric_photo_date TIMESTAMP,
    biometric_photo_expiration TIMESTAMP,
    days_until_expiration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.user_id,
        u.usuario,
        u."firstName",
        u."lastName",
        u.email,
        u.company_id,
        u.biometric_photo_url,
        u.biometric_photo_date,
        u.biometric_photo_expiration,
        EXTRACT(DAY FROM (u.biometric_photo_expiration - NOW()))::INTEGER as days_until_expiration
    FROM users u
    WHERE u.biometric_photo_expiration IS NOT NULL
        AND u.biometric_photo_expiration <= (NOW() + (p_days_threshold || ' days')::INTERVAL)
        AND u.biometric_photo_expiration > NOW()
        AND u."isActive" = true
    ORDER BY u.biometric_photo_expiration ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_users_with_expiring_photos(INTEGER) IS 'Obtiene usuarios con fotos biométricas próximas a vencer (por defecto 30 días)';

-- 6. Crear función para obtener usuarios con fotos ya vencidas
CREATE OR REPLACE FUNCTION get_users_with_expired_photos()
RETURNS TABLE (
    user_id UUID,
    usuario VARCHAR(50),
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100),
    email VARCHAR(255),
    company_id INTEGER,
    biometric_photo_url TEXT,
    biometric_photo_date TIMESTAMP,
    biometric_photo_expiration TIMESTAMP,
    days_since_expiration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.user_id,
        u.usuario,
        u."firstName",
        u."lastName",
        u.email,
        u.company_id,
        u.biometric_photo_url,
        u.biometric_photo_date,
        u.biometric_photo_expiration,
        EXTRACT(DAY FROM (NOW() - u.biometric_photo_expiration))::INTEGER as days_since_expiration
    FROM users u
    WHERE u.biometric_photo_expiration IS NOT NULL
        AND u.biometric_photo_expiration < NOW()
        AND u."isActive" = true
    ORDER BY u.biometric_photo_expiration ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_users_with_expired_photos() IS 'Obtiene usuarios con fotos biométricas ya vencidas';

-- 7. Crear función para actualizar foto biométrica (usar al registrar nueva foto)
CREATE OR REPLACE FUNCTION update_biometric_photo(
    p_user_id UUID,
    p_photo_url TEXT,
    p_capture_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    success BOOLEAN,
    photo_url TEXT,
    capture_date TIMESTAMP,
    expiration_date TIMESTAMP
) AS $$
DECLARE
    v_expiration TIMESTAMP;
BEGIN
    -- Calcular fecha de vencimiento
    v_expiration := calculate_biometric_photo_expiration(p_capture_date);

    -- Actualizar usuario
    UPDATE users
    SET
        biometric_photo_url = p_photo_url,
        biometric_photo_date = p_capture_date,
        biometric_photo_expiration = v_expiration,
        "updatedAt" = NOW()
    WHERE user_id = p_user_id;

    -- Retornar resultado
    RETURN QUERY
    SELECT
        true as success,
        p_photo_url as photo_url,
        p_capture_date as capture_date,
        v_expiration as expiration_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_biometric_photo(UUID, TEXT, TIMESTAMP) IS 'Actualiza la foto biométrica de un usuario y calcula automáticamente la fecha de vencimiento';

-- 8. Crear función para verificar si un usuario necesita renovar foto
CREATE OR REPLACE FUNCTION user_needs_photo_renewal(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_expiration TIMESTAMP;
    v_needs_renewal BOOLEAN;
BEGIN
    SELECT biometric_photo_expiration
    INTO v_expiration
    FROM users
    WHERE user_id = p_user_id;

    -- Si no tiene foto o ya venció, necesita renovación
    IF v_expiration IS NULL OR v_expiration < NOW() THEN
        v_needs_renewal := true;
    -- Si está dentro de los 30 días previos al vencimiento
    ELSIF v_expiration <= (NOW() + INTERVAL '30 days') THEN
        v_needs_renewal := true;
    ELSE
        v_needs_renewal := false;
    END IF;

    RETURN v_needs_renewal;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION user_needs_photo_renewal(UUID) IS 'Determina si un usuario necesita renovar su foto biométrica (sin foto, vencida, o dentro de 30 días del vencimiento)';

-- 9. Crear vista para estadísticas de fotos biométricas
CREATE OR REPLACE VIEW biometric_photos_stats AS
SELECT
    COUNT(*) FILTER (WHERE biometric_photo_url IS NOT NULL) as total_with_photo,
    COUNT(*) FILTER (WHERE biometric_photo_url IS NULL) as total_without_photo,
    COUNT(*) FILTER (WHERE biometric_photo_expiration < NOW()) as total_expired,
    COUNT(*) FILTER (
        WHERE biometric_photo_expiration IS NOT NULL
        AND biometric_photo_expiration <= (NOW() + INTERVAL '30 days')
        AND biometric_photo_expiration > NOW()
    ) as total_expiring_soon,
    COUNT(*) FILTER (
        WHERE biometric_photo_expiration IS NOT NULL
        AND biometric_photo_expiration > (NOW() + INTERVAL '30 days')
    ) as total_valid
FROM users
WHERE "isActive" = true;

COMMENT ON VIEW biometric_photos_stats IS 'Estadísticas globales de fotos biométricas (con foto, sin foto, vencidas, próximas a vencer, válidas)';

-- 10. Log de migración
INSERT INTO schema_migrations (version, name, executed_at)
VALUES (
    '20250131_add_biometric_photo_fields',
    'Add biometric photo fields to users table',
    NOW()
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ==============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ==============================================================================

-- Verificar columnas agregadas
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
    AND column_name IN ('biometric_photo_url', 'biometric_photo_date', 'biometric_photo_expiration')
ORDER BY ordinal_position;

-- Verificar funciones creadas
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'calculate_biometric_photo_expiration',
    'get_users_with_expiring_photos',
    'get_users_with_expired_photos',
    'update_biometric_photo',
    'user_needs_photo_renewal'
)
AND routine_schema = 'public'
ORDER BY routine_name;

-- Verificar índice creado
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
    AND indexname = 'idx_users_biometric_photo_expiration';

-- Verificar vista creada
SELECT
    viewname,
    definition
FROM pg_views
WHERE viewname = 'biometric_photos_stats'
    AND schemaname = 'public';
