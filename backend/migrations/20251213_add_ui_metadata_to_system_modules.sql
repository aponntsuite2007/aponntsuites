-- =====================================================
-- MIGRACIÓN: Agregar UI Metadata a system_modules
-- Fecha: 2025-12-13
-- Propósito: SSOT - Mover metadata UI del JSON a BD
-- =====================================================

-- Agregar columna ui_metadata JSONB
ALTER TABLE system_modules
ADD COLUMN IF NOT EXISTS ui_metadata JSONB DEFAULT '{
  "mainButtons": [],
  "tabs": [],
  "inputs": [],
  "modals": []
}'::jsonb;

-- Índice para búsquedas rápidas en JSONB
CREATE INDEX IF NOT EXISTS idx_system_modules_ui_metadata
ON system_modules USING GIN (ui_metadata);

-- Comentario descriptivo
COMMENT ON COLUMN system_modules.ui_metadata IS
'UI metadata discovered by Phase4 Auto-Healing (buttons, tabs, inputs, modals)';

-- Verificación
SELECT
    module_key,
    ui_metadata IS NOT NULL as has_ui_metadata,
    jsonb_array_length(ui_metadata->'mainButtons') as buttons_count
FROM system_modules
LIMIT 5;
