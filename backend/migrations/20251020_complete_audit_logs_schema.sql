-- Migración COMPLETA: Sincronizar audit_logs con el modelo
-- Fecha: 2025-10-20
-- Descripción: Agrega TODAS las columnas faltantes en audit_logs

DO $$
BEGIN
    -- 1. Agregar test_description si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'test_description'
    ) THEN
        ALTER TABLE audit_logs
        ADD COLUMN test_description TEXT NULL;
        RAISE NOTICE '✅ Columna test_description agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna test_description ya existe';
    END IF;

    -- 2. Agregar severity si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'severity'
    ) THEN
        -- Primero crear el tipo ENUM si no existe
        DO $enum$
        BEGIN
            CREATE TYPE audit_log_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $enum$;

        ALTER TABLE audit_logs
        ADD COLUMN severity audit_log_severity NULL;
        RAISE NOTICE '✅ Columna severity agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna severity ya existe';
    END IF;

    -- 3. Agregar tags si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE audit_logs
        ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Columna tags agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna tags ya existe';
    END IF;

    -- 4. Agregar notes si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE audit_logs
        ADD COLUMN notes TEXT NULL;
        RAISE NOTICE '✅ Columna notes agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna notes ya existe';
    END IF;

    -- 5. Agregar test_data si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
        AND column_name = 'test_data'
    ) THEN
        ALTER TABLE audit_logs
        ADD COLUMN test_data JSONB NULL;
        RAISE NOTICE '✅ Columna test_data agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna test_data ya existe';
    END IF;

    RAISE NOTICE '🎉 Migración completa finalizada exitosamente';

END $$;
