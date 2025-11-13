-- ============================================================================
-- Migration: Add Kiosk-Related Fields to Departments Table
-- Date: 2025-11-06
-- Description: Add default_kiosk_id, authorized_kiosks, and allow_gps_attendance
-- ============================================================================

-- Add default_kiosk_id (FK to kiosks table)
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS default_kiosk_id INTEGER NULL
REFERENCES kiosks(id) ON DELETE SET NULL;

-- Add authorized_kiosks (JSONB array of kiosk IDs)
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS authorized_kiosks JSONB DEFAULT '[]'::jsonb;

-- Add allow_gps_attendance flag
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS allow_gps_attendance BOOLEAN NOT NULL DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN departments.default_kiosk_id IS 'DEPRECADO - Kiosk por defecto donde este departamento debe marcar. Usar authorized_kiosks en su lugar';
COMMENT ON COLUMN departments.authorized_kiosks IS 'Array de kiosk_id autorizados para este departamento. Si está vacío, solo pueden marcar por GPS. Ejemplo: [9, 10, 17]';
COMMENT ON COLUMN departments.allow_gps_attendance IS 'Si true, empleados pueden marcar asistencia desde APK cuando estén dentro del radio de cobertura GPS';

-- Create index on default_kiosk_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_departments_default_kiosk_id ON departments(default_kiosk_id);

-- Create index on allow_gps_attendance for filtering
CREATE INDEX IF NOT EXISTS idx_departments_allow_gps_attendance ON departments(allow_gps_attendance);

COMMIT;
