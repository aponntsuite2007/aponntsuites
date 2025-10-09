-- =====================================================
-- MIGRACIÓN: Sistema de Kiosks para Control de Acceso
-- Fecha: 2025-10-02
-- Descripción: Tablas para gestión de kiosks físicos,
--              autorización de empleados y tracking de breaks
-- =====================================================

-- 1. Tabla de Kiosks
CREATE TABLE IF NOT EXISTS kiosks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    device_id VARCHAR(100) UNIQUE,
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    is_configured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    -- Constraints
    CONSTRAINT kiosks_unique_name_per_company UNIQUE (name, company_id),
    CONSTRAINT kiosks_gps_lat_range CHECK (gps_lat >= -90 AND gps_lat <= 90),
    CONSTRAINT kiosks_gps_lng_range CHECK (gps_lng >= -180 AND gps_lng <= 180),
    CONSTRAINT kiosks_both_gps_or_none CHECK (
        (gps_lat IS NULL AND gps_lng IS NULL) OR
        (gps_lat IS NOT NULL AND gps_lng IS NOT NULL)
    )
);

-- Índices para kiosks
CREATE INDEX idx_kiosks_company_id ON kiosks(company_id);
CREATE INDEX idx_kiosks_is_active ON kiosks(is_active);
CREATE INDEX idx_kiosks_is_configured ON kiosks(is_configured);
CREATE INDEX idx_kiosks_gps ON kiosks(gps_lat, gps_lng) WHERE gps_lat IS NOT NULL;
CREATE UNIQUE INDEX idx_kiosks_unique_gps_per_company ON kiosks(gps_lat, gps_lng, company_id)
    WHERE gps_lat IS NOT NULL AND gps_lng IS NOT NULL AND deleted_at IS NULL;

-- Trigger para actualizar updated_at en kiosks
CREATE OR REPLACE FUNCTION update_kiosks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;

    -- Auto-marcar como configurado si tiene nombre y GPS
    IF NEW.name IS NOT NULL AND NEW.gps_lat IS NOT NULL AND NEW.gps_lng IS NOT NULL THEN
        NEW.is_configured = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kiosks_timestamp
    BEFORE UPDATE ON kiosks
    FOR EACH ROW
    EXECUTE FUNCTION update_kiosks_timestamp();

-- 2. Agregar campos de autorización de kiosks a tabla users
-- (Si las columnas ya existen, esto fallará silenciosamente)
DO $$
BEGIN
    -- Kiosk and Mobile App Authorization
    ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_mobile_app BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_kiosk BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_all_kiosks BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_kiosks JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS has_flexible_schedule BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS flexible_schedule_notes TEXT;

    -- Crear índices
    CREATE INDEX IF NOT EXISTS idx_users_can_use_mobile_app ON users(can_use_mobile_app);
    CREATE INDEX IF NOT EXISTS idx_users_can_use_kiosk ON users(can_use_kiosk);
    CREATE INDEX IF NOT EXISTS idx_users_has_flexible_schedule ON users(has_flexible_schedule);
END $$;

-- 3. Agregar campos de kiosk y breaks a tabla attendances
DO $$
BEGIN
    -- Kiosk tracking
    ALTER TABLE attendances ADD COLUMN IF NOT EXISTS kiosk_id INTEGER REFERENCES kiosks(id) ON DELETE SET NULL;
    ALTER TABLE attendances ADD COLUMN IF NOT EXISTS origin_type VARCHAR(20) DEFAULT 'kiosk'
        CHECK (origin_type IN ('kiosk', 'mobile_app', 'web', 'manual'));

    -- Break tracking
    ALTER TABLE attendances ADD COLUMN IF NOT EXISTS break_out TIMESTAMP;
    ALTER TABLE attendances ADD COLUMN IF NOT EXISTS break_in TIMESTAMP;

    -- Crear índices
    CREATE INDEX IF NOT EXISTS idx_attendances_kiosk_id ON attendances(kiosk_id);
    CREATE INDEX IF NOT EXISTS idx_attendances_origin_type ON attendances(origin_type);
END $$;

-- 4. Función helper para calcular distancia GPS (Haversine)
CREATE OR REPLACE FUNCTION calculate_gps_distance(
    lat1 DECIMAL(10,8),
    lng1 DECIMAL(11,8),
    lat2 DECIMAL(10,8),
    lng2 DECIMAL(11,8)
)
RETURNS INTEGER AS $$
DECLARE
    r INTEGER := 6371000; -- Radio de la Tierra en metros
    dlat DECIMAL;
    dlng DECIMAL;
    a DECIMAL;
    c DECIMAL;
    distance INTEGER;
BEGIN
    IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
        RETURN NULL;
    END IF;

    dlat := RADIANS(lat2 - lat1);
    dlng := RADIANS(lng2 - lng1);

    a := SIN(dlat/2) * SIN(dlat/2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dlng/2) * SIN(dlng/2);

    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    distance := ROUND(r * c);

    RETURN distance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Insertar módulo de Kiosks en system_modules (si no existe)
INSERT INTO system_modules (id, module_key, name, description, icon, category, is_active, base_price, features, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'kiosks',
    'Gestión de Kioscos',
    'Control de kioscos físicos para registro de asistencia con validación GPS',
    '📟',
    'security',
    true,
    0.00,
    '["Múltiples kioscos por empresa", "Validación GPS automática", "Autorización por empleado", "Configuración remota"]'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (module_key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    features = EXCLUDED.features,
    updated_at = CURRENT_TIMESTAMP;

-- 6. Asignar módulo de kiosks a empresa ISI (ID 11)
-- NOTA: Esto se puede hacer manualmente desde el panel administrativo
-- o ejecutar el siguiente SQL una vez creado el módulo:
-- DO $$
-- DECLARE
--     v_kiosks_id UUID;
--     v_company_id UUID;
-- BEGIN
--     SELECT id INTO v_kiosks_id FROM system_modules WHERE module_key = 'kiosks';
--     SELECT company_id INTO v_company_id FROM companies WHERE company_id = 11;
--
--     IF v_kiosks_id IS NOT NULL AND v_company_id IS NOT NULL THEN
--         INSERT INTO company_modules (company_id, system_module_id, is_active, contracted_price, employee_tier)
--         VALUES (v_company_id, v_kiosks_id, true, 0.00, '1-50')
--         ON CONFLICT (company_id, system_module_id) DO UPDATE SET
--             is_active = true;
--     END IF;
-- END $$;

-- 7. Vista para kioscos activos con información de empresa
CREATE OR REPLACE VIEW v_active_kiosks AS
SELECT
    k.id,
    k.name,
    k.description,
    k.device_id,
    k.gps_lat,
    k.gps_lng,
    k.is_configured,
    k.company_id,
    c.name as company_name,
    c.slug as company_slug,
    k.created_at,
    COUNT(DISTINCT a.id) as total_attendances
FROM kiosks k
JOIN companies c ON k.company_id = c.company_id
LEFT JOIN attendances a ON a.kiosk_id = k.id
WHERE k.is_active = true AND k.deleted_at IS NULL
GROUP BY k.id, c.name, c.slug;

-- 8. Función para validar si un empleado puede usar un kiosk específico
CREATE OR REPLACE FUNCTION can_user_use_kiosk(
    p_user_id UUID,
    p_kiosk_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_can_use_kiosk BOOLEAN;
    v_can_use_all_kiosks BOOLEAN;
    v_authorized_kiosks JSONB;
    v_result BOOLEAN := false;
BEGIN
    -- Obtener configuración del usuario
    SELECT
        can_use_kiosk,
        can_use_all_kiosks,
        authorized_kiosks
    INTO
        v_can_use_kiosk,
        v_can_use_all_kiosks,
        v_authorized_kiosks
    FROM users
    WHERE user_id = p_user_id AND is_active = true;

    -- Si no puede usar kiosks en absoluto
    IF NOT v_can_use_kiosk THEN
        RETURN false;
    END IF;

    -- Si puede usar todos los kiosks
    IF v_can_use_all_kiosks THEN
        RETURN true;
    END IF;

    -- Verificar si está en la lista de kiosks autorizados
    IF v_authorized_kiosks ? p_kiosk_id::text THEN
        RETURN true;
    END IF;

    -- Verificar si el kiosk_id está en el array JSON
    IF v_authorized_kiosks @> to_jsonb(p_kiosk_id) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Comentarios en tablas
COMMENT ON TABLE kiosks IS 'Kioscos físicos para registro de asistencia biométrica';
COMMENT ON COLUMN kiosks.device_id IS 'Identificador único del dispositivo (MAC, serial, etc.)';
COMMENT ON COLUMN kiosks.is_configured IS 'Indica si el kiosko está completamente configurado (nombre + GPS)';
COMMENT ON COLUMN users.can_use_mobile_app IS 'Permite al empleado usar app móvil para fichar';
COMMENT ON COLUMN users.can_use_kiosk IS 'Permite al empleado usar kioscos físicos';
COMMENT ON COLUMN users.can_use_all_kiosks IS 'Si true, puede usar cualquier kiosko de la empresa';
COMMENT ON COLUMN users.authorized_kiosks IS 'Array JSON de IDs de kiosks autorizados para este empleado';
COMMENT ON COLUMN users.has_flexible_schedule IS 'Si true, puede fichar sin restricciones de horario';
COMMENT ON COLUMN attendances.kiosk_id IS 'Kiosko usado para el registro (NULL si es app móvil)';
COMMENT ON COLUMN attendances.origin_type IS 'Origen del registro: kiosk, mobile_app, web, manual';
COMMENT ON COLUMN attendances.break_out IS 'Timestamp de inicio de break/descanso';
COMMENT ON COLUMN attendances.break_in IS 'Timestamp de retorno de break/descanso';

-- 10. Grants de permisos (ajustar según roles de la aplicación)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON kiosks TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE kiosks_id_seq TO app_user;
-- GRANT SELECT ON v_active_kiosks TO app_user;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

-- Verificación de migración
DO $$
BEGIN
    RAISE NOTICE '✅ Migración de Kiosks completada exitosamente';
    RAISE NOTICE '📟 Tabla kiosks creada';
    RAISE NOTICE '👤 Campos de autorización agregados a users';
    RAISE NOTICE '📊 Campos de kiosk y breaks agregados a attendances';
    RAISE NOTICE '🔧 Funciones helper creadas';
    RAISE NOTICE '📋 Módulo kiosks registrado en system_modules';
END $$;
