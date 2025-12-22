-- ============================================================================
-- Migración: Agregar campo profile_photo a aponnt_staff
-- Fecha: 2025-12-19
-- Descripción: Añade campo para almacenar URL de foto de perfil del staff
-- ============================================================================

-- Agregar columna profile_photo
ALTER TABLE aponnt_staff
ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(500);

COMMENT ON COLUMN aponnt_staff.profile_photo IS 'URL de la foto de perfil del miembro del staff';

-- Verificar la adición
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_staff'
        AND column_name = 'profile_photo'
    ) THEN
        RAISE NOTICE '✅ Campo profile_photo agregado exitosamente a aponnt_staff';
    ELSE
        RAISE EXCEPTION '❌ Error: Campo profile_photo no se agregó correctamente';
    END IF;
END $$;
