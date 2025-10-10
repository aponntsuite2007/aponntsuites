-- Migración: Agregar authorized_kiosks a departments
-- Fecha: 2025-10-09
-- Propósito: Cambiar de un solo default_kiosk_id a múltiples kiosks autorizados

-- Agregar columna authorized_kiosks (JSONB array)
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS authorized_kiosks JSONB DEFAULT '[]';

-- Comentario explicativo
COMMENT ON COLUMN departments.authorized_kiosks IS 'Array de kiosk_id autorizados para este departamento. Si está vacío, solo pueden marcar por GPS. Ejemplo: [9, 10, 17]';

-- Migrar datos existentes de default_kiosk_id a authorized_kiosks
-- Solo para departamentos que tienen un default_kiosk_id configurado
UPDATE departments
SET authorized_kiosks = jsonb_build_array(default_kiosk_id)
WHERE default_kiosk_id IS NOT NULL
  AND (authorized_kiosks IS NULL OR authorized_kiosks = '[]'::jsonb);

-- Crear índice GIN para búsquedas eficientes en el array JSONB
CREATE INDEX IF NOT EXISTS idx_departments_authorized_kiosks
ON departments USING GIN (authorized_kiosks);

-- Verificar resultado
SELECT
    id,
    name,
    default_kiosk_id,
    authorized_kiosks,
    CASE
        WHEN authorized_kiosks = '[]'::jsonb OR authorized_kiosks IS NULL THEN 'Solo GPS'
        WHEN jsonb_array_length(authorized_kiosks) = 1 THEN '1 kiosk'
        ELSE jsonb_array_length(authorized_kiosks) || ' kiosks'
    END as kiosks_count
FROM departments
WHERE deleted_at IS NULL
ORDER BY id;
