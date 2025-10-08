-- SCRIPT SQL DIRECTO PARA ARREGLAR SCHEMA EN RENDER
-- Ejecutar manualmente en la consola SQL de Render

-- =====================================================
-- TABLA: attendances - Agregar columna status (CRÍTICO)
-- =====================================================

-- Verificar si la columna status existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'status'
    ) THEN
        -- Crear el tipo ENUM si no existe
        CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'late', 'early_leave', 'pending');

        -- Agregar columna status
        ALTER TABLE attendances
        ADD COLUMN status attendance_status_enum DEFAULT 'present';

        RAISE NOTICE 'Columna status agregada a attendances';
    ELSE
        RAISE NOTICE 'Columna status ya existe en attendances';
    END IF;
END $$;

-- =====================================================
-- TABLA: users - Agregar columnas faltantes
-- =====================================================

-- phone
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- departmentId
ALTER TABLE users ADD COLUMN IF NOT EXISTS "departmentId" BIGINT REFERENCES departments(id);

-- position
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);

-- hireDate
ALTER TABLE users ADD COLUMN IF NOT EXISTS "hireDate" DATE;

-- Permisos de autorización
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_authorize_late_arrivals BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_departments JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preference_late_arrivals VARCHAR(20) DEFAULT 'email';

-- Permisos de dispositivos
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_mobile_app BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_kiosk BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_use_all_kiosks BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS authorized_kiosks JSONB DEFAULT '[]';

-- Horarios flexibles
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_flexible_schedule BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flexible_schedule_notes TEXT;

-- Datos biométricos
ALTER TABLE users ADD COLUMN IF NOT EXISTS "hasFingerprint" BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "hasFacialData" BOOLEAN DEFAULT false;

-- =====================================================
-- TABLA: departments - Agregar columnas faltantes
-- =====================================================

-- description
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- address
ALTER TABLE departments ADD COLUMN IF NOT EXISTS address VARCHAR(255) DEFAULT '';

-- gps_lat
ALTER TABLE departments ADD COLUMN IF NOT EXISTS gps_lat DECIMAL(10, 8);

-- gps_lng
ALTER TABLE departments ADD COLUMN IF NOT EXISTS gps_lng DECIMAL(11, 8);

-- coverage_radius
ALTER TABLE departments ADD COLUMN IF NOT EXISTS coverage_radius INTEGER DEFAULT 50;

-- deleted_at (para soft delete)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- manager_id (de la migración 20251007120001)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(user_id);

-- budget (de la migración 20251007120001)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS budget DECIMAL(12, 2);

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Ver columnas de attendances
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendances'
ORDER BY ordinal_position;

-- Ver columnas de users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Ver columnas de departments
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'departments'
ORDER BY ordinal_position;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ Schema corregido - Todas las columnas agregadas';
END $$;
