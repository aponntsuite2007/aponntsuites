-- Agregar nuevos tipos de test al enum audit_log_test_type
-- Fecha: 2025-10-23

-- Agregar los nuevos tipos de test que faltan
ALTER TYPE audit_log_test_type ADD VALUE IF NOT EXISTS 'real-ux';
ALTER TYPE audit_log_test_type ADD VALUE IF NOT EXISTS 'deep-simulation';

-- Note: Los valores IF NOT EXISTS solo están disponibles en PostgreSQL 9.3+
-- Si hay error, usar este enfoque alternativo:

-- Método alternativo (comentar las líneas de arriba y usar esto si da error):
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'audit_log_test_type' AND e.enumlabel = 'real-ux') THEN
--         ALTER TYPE audit_log_test_type ADD VALUE 'real-ux';
--     END IF;
--
--     IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'audit_log_test_type' AND e.enumlabel = 'deep-simulation') THEN
--         ALTER TYPE audit_log_test_type ADD VALUE 'deep-simulation';
--     END IF;
-- END $$;