-- ============================================================================
-- MIGRACIÓN: PP-7-IMPL-1 - Agregar campos de justificación a attendance
-- Fecha: 2025-11-27
-- Tarea: [2025-11-27] Backend DB: Agregar campos justificación a attendance
-- Prioridad: CRITICAL
-- ============================================================================
--
-- PROPÓSITO:
-- Habilitar FALLBACK de justificación manual de ausencias para empresas
-- que NO tienen contratado el módulo médico. Estos campos permiten que
-- RRHH justifique ausencias directamente en la tabla attendance.
--
-- PRINCIPIO: DATO ÚNICO (Single Source of Truth)
-- La justificación de ausencia se guarda EN UN SOLO LUGAR (attendance)
-- y la liquidación LEE de este campo único.
--
-- ============================================================================

-- Verificar que la tabla existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendances') THEN
        RAISE EXCEPTION 'Tabla attendances no existe';
    END IF;
END $$;

-- ============================================================================
-- 1. CREAR TIPO ENUM PARA TIPOS DE AUSENCIA (si no existe)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'absence_type_enum') THEN
        CREATE TYPE absence_type_enum AS ENUM (
            'medical',      -- Certificado médico
            'vacation',     -- Vacaciones
            'suspension',   -- Suspensión disciplinaria
            'personal',     -- Día personal / Asuntos propios
            'bereavement',  -- Duelo / Fallecimiento familiar
            'maternity',    -- Licencia maternidad
            'paternity',    -- Licencia paternidad
            'study',        -- Día de estudio / Examen
            'union',        -- Actividad sindical
            'other'         -- Otro (requiere descripción)
        );
        RAISE NOTICE 'Tipo absence_type_enum creado';
    ELSE
        RAISE NOTICE 'Tipo absence_type_enum ya existe';
    END IF;
END $$;

-- ============================================================================
-- 2. AGREGAR COLUMNA is_justified (CRÍTICO)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'is_justified'
    ) THEN
        ALTER TABLE attendances ADD COLUMN is_justified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Columna is_justified agregada';
    ELSE
        RAISE NOTICE 'Columna is_justified ya existe';
    END IF;
END $$;

-- ============================================================================
-- 3. AGREGAR COLUMNA absence_type (ENUM)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'absence_type'
    ) THEN
        ALTER TABLE attendances ADD COLUMN absence_type absence_type_enum;
        RAISE NOTICE 'Columna absence_type agregada';
    ELSE
        RAISE NOTICE 'Columna absence_type ya existe';
    END IF;
END $$;

-- ============================================================================
-- 4. AGREGAR COLUMNA absence_reason (TEXT)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'absence_reason'
    ) THEN
        ALTER TABLE attendances ADD COLUMN absence_reason TEXT;
        RAISE NOTICE 'Columna absence_reason agregada';
    ELSE
        RAISE NOTICE 'Columna absence_reason ya existe';
    END IF;
END $$;

-- ============================================================================
-- 5. AGREGAR COLUMNA justified_by (FK a users)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'justified_by'
    ) THEN
        ALTER TABLE attendances ADD COLUMN justified_by UUID;
        RAISE NOTICE 'Columna justified_by agregada';

        -- Agregar FK constraint (si la tabla users existe)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE attendances
            ADD CONSTRAINT fk_attendance_justified_by
            FOREIGN KEY (justified_by) REFERENCES users(user_id)
            ON DELETE SET NULL;
            RAISE NOTICE 'FK fk_attendance_justified_by creada';
        END IF;
    ELSE
        RAISE NOTICE 'Columna justified_by ya existe';
    END IF;
END $$;

-- ============================================================================
-- 6. AGREGAR COLUMNA justified_at (TIMESTAMP)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'justified_at'
    ) THEN
        ALTER TABLE attendances ADD COLUMN justified_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Columna justified_at agregada';
    ELSE
        RAISE NOTICE 'Columna justified_at ya existe';
    END IF;
END $$;

-- ============================================================================
-- 7. AGREGAR COLUMNA medical_certificate_id (FK para integración con módulo médico)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendances' AND column_name = 'medical_certificate_id'
    ) THEN
        ALTER TABLE attendances ADD COLUMN medical_certificate_id INTEGER;
        RAISE NOTICE 'Columna medical_certificate_id agregada';

        -- Agregar FK constraint (si la tabla medical_certificates existe)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_certificates') THEN
            ALTER TABLE attendances
            ADD CONSTRAINT fk_attendance_medical_certificate
            FOREIGN KEY (medical_certificate_id) REFERENCES medical_certificates(id)
            ON DELETE SET NULL;
            RAISE NOTICE 'FK fk_attendance_medical_certificate creada';
        END IF;
    ELSE
        RAISE NOTICE 'Columna medical_certificate_id ya existe';
    END IF;
END $$;

-- ============================================================================
-- 8. CREAR ÍNDICES PARA CONSULTAS FRECUENTES
-- ============================================================================

-- Índice para buscar ausencias justificadas/no justificadas
CREATE INDEX IF NOT EXISTS idx_attendance_justified
ON attendances (company_id, is_justified, date)
WHERE status IN ('absent', 'no_show', 'late');

-- Índice para buscar por tipo de ausencia
CREATE INDEX IF NOT EXISTS idx_attendance_absence_type
ON attendances (company_id, absence_type, date)
WHERE absence_type IS NOT NULL;

-- Índice para reportes de justificaciones por período
CREATE INDEX IF NOT EXISTS idx_attendance_justification_reporting
ON attendances (company_id, justified_at, justified_by)
WHERE is_justified = true;

-- ============================================================================
-- 9. COMENTARIOS EN COLUMNAS
-- ============================================================================
COMMENT ON COLUMN attendances.is_justified IS 'DATO ÚNICO: Si la ausencia/tardanza está justificada (true/false). Usado por liquidación.';
COMMENT ON COLUMN attendances.absence_type IS 'Tipo de ausencia (medical, vacation, personal, etc.). ENUM absence_type_enum.';
COMMENT ON COLUMN attendances.absence_reason IS 'Descripción/motivo de la ausencia. Requerido si absence_type = "other".';
COMMENT ON COLUMN attendances.justified_by IS 'UUID del usuario (RRHH/admin) que justificó la ausencia.';
COMMENT ON COLUMN attendances.justified_at IS 'Timestamp de cuándo se justificó la ausencia.';
COMMENT ON COLUMN attendances.medical_certificate_id IS 'FK al certificado médico (si la justificación viene del módulo médico).';

-- ============================================================================
-- 10. VERIFICACIÓN FINAL
-- ============================================================================
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'attendances'
    AND column_name IN ('is_justified', 'absence_type', 'absence_reason', 'justified_by', 'justified_at', 'medical_certificate_id');

    IF col_count = 6 THEN
        RAISE NOTICE '✅ MIGRACIÓN PP-7-IMPL-1 COMPLETADA: 6/6 columnas de justificación agregadas';
    ELSE
        RAISE NOTICE '⚠️ MIGRACIÓN PARCIAL: Solo %/6 columnas agregadas', col_count;
    END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
