-- Migración: Agregar columna test_description a audit_logs
-- Fecha: 2025-10-20
-- Descripción: Corrige error "column test_description does not exist"

-- Verificar si la columna ya existe antes de agregarla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'test_description'
    ) THEN
        ALTER TABLE audit_logs
        ADD COLUMN test_description TEXT NULL;

        RAISE NOTICE '✅ Columna test_description agregada exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️ Columna test_description ya existe';
    END IF;
END $$;
