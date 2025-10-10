-- Migración: Agregar allow_gps_attendance a departments
-- Fecha: 2025-10-09
-- Propósito: Permitir marcado por GPS desde APK Empleado (modo mixto con kiosks)

-- Agregar columna allow_gps_attendance (BOOLEAN)
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS allow_gps_attendance BOOLEAN DEFAULT false NOT NULL;

-- Comentario explicativo
COMMENT ON COLUMN departments.allow_gps_attendance IS 'Si true, empleados pueden marcar asistencia desde APK cuando estén dentro del radio de cobertura GPS. Si false, solo pueden marcar en kiosks autorizados.';

-- Migrar datos existentes:
-- Si el departamento tiene coordenadas GPS configuradas, asumir que permite GPS
UPDATE departments
SET allow_gps_attendance = true
WHERE gps_lat IS NOT NULL
  AND gps_lng IS NOT NULL
  AND coverage_radius > 0;

-- Verificar resultado
SELECT
    id,
    name,
    allow_gps_attendance,
    CASE
        WHEN gps_lat IS NOT NULL AND gps_lng IS NOT NULL THEN 'GPS configurado'
        ELSE 'Sin GPS'
    END as gps_status,
    CASE
        WHEN authorized_kiosks IS NOT NULL AND jsonb_array_length(authorized_kiosks) > 0
            THEN jsonb_array_length(authorized_kiosks) || ' kiosks'
        ELSE 'Sin kiosks'
    END as kiosks_status,
    CASE
        WHEN allow_gps_attendance = true AND authorized_kiosks IS NOT NULL AND jsonb_array_length(authorized_kiosks) > 0
            THEN 'Modo Mixto (GPS + Kiosks)'
        WHEN allow_gps_attendance = true
            THEN 'Solo GPS'
        WHEN authorized_kiosks IS NOT NULL AND jsonb_array_length(authorized_kiosks) > 0
            THEN 'Solo Kiosks'
        ELSE 'Sin configurar'
    END as modo_asistencia
FROM departments
WHERE deleted_at IS NULL
ORDER BY id;
