-- ============================================================================
-- MIGRACIÓN: Agregar campos de perfiles de hardware a kiosks
-- Fecha: 2026-02-01
-- Descripción: Agrega campos para guardar la configuración de hardware
--              de reconocimiento facial y lector de huellas
-- ============================================================================

-- Agregar campos de hardware de reconocimiento facial
ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS hardware_profile VARCHAR(100);
COMMENT ON COLUMN kiosks.hardware_profile IS 'ID del perfil de hardware facial seleccionado (ej: ipad_pro_12, galaxy_tab_s9)';

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS hardware_category VARCHAR(50);
COMMENT ON COLUMN kiosks.hardware_category IS 'Categoría del hardware (enterprise, tablet_ios, tablet_android, phone_ios, phone_android)';

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS detection_method_facial VARCHAR(100);
COMMENT ON COLUMN kiosks.detection_method_facial IS 'Tecnología de detección facial (TrueDepth, ML Kit, etc.)';

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS detection_method_fingerprint VARCHAR(100);
COMMENT ON COLUMN kiosks.detection_method_fingerprint IS 'ID del perfil de lector de huella (opcional)';

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS performance_score INTEGER DEFAULT 0;
COMMENT ON COLUMN kiosks.performance_score IS 'Score de rendimiento del hardware (0-100)';

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS supports_walkthrough BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN kiosks.supports_walkthrough IS 'Si el hardware soporta detección walk-through';

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS supports_liveness BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN kiosks.supports_liveness IS 'Si el hardware soporta detección de vida (anti-spoofing)';

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS biometric_modes JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN kiosks.biometric_modes IS 'Array de modos biométricos habilitados (facial, fingerprint)';

ALTER TABLE kiosks ADD COLUMN IF NOT EXISTS hardware_specs JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN kiosks.hardware_specs IS 'Especificaciones técnicas del hardware seleccionado';

-- Crear índice para búsquedas por perfil de hardware
CREATE INDEX IF NOT EXISTS idx_kiosks_hardware_profile ON kiosks(hardware_profile);
CREATE INDEX IF NOT EXISTS idx_kiosks_hardware_category ON kiosks(hardware_category);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada: Campos de hardware agregados a kiosks';
END $$;
