-- SCRIPT MINIMALISTA - Solo columnas críticas para endpoints
-- Sin BEGIN/COMMIT (Sequelize maneja transacciones)

-- ============================================================================
-- USERS - Columnas críticas faltantes
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_mobile_app BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_kiosk BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_all_kiosks BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_kiosks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_flexible_schedule BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flexible_schedule_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_authorize_late_arrivals BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_departments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preference_late_arrivals VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "hasFingerprint" BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "hasFacialData" BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "hireDate" DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- DEPARTMENTS - Columnas críticas faltantes
-- ============================================================================
ALTER TABLE departments ADD COLUMN IF NOT EXISTS gps_lat NUMERIC(10, 8);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS gps_lng NUMERIC(11, 8);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS coverage_radius INTEGER DEFAULT 50;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS budget NUMERIC(12, 2);

-- ============================================================================
-- ATTENDANCES - Verificar que status existe
-- ============================================================================
-- Ya debería existir, pero por si acaso
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'status'
    ) THEN
        EXECUTE 'CREATE TYPE attendance_status_enum AS ENUM (''present'', ''absent'', ''late'', ''early_leave'', ''pending'')';
        EXECUTE 'ALTER TABLE attendances ADD COLUMN status attendance_status_enum DEFAULT ''present''';
    END IF;
END $$;
