-- Migration: Add security-related columns to kiosks table
-- Date: 2025-12-16
-- Description: Add columns for external reader support, security config, and tracking

-- Add new columns if they don't exist
DO $$
BEGIN
    -- has_external_reader
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kiosks' AND column_name = 'has_external_reader') THEN
        ALTER TABLE kiosks ADD COLUMN has_external_reader BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added has_external_reader column';
    END IF;

    -- reader_model
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kiosks' AND column_name = 'reader_model') THEN
        ALTER TABLE kiosks ADD COLUMN reader_model VARCHAR(100);
        RAISE NOTICE 'Added reader_model column';
    END IF;

    -- reader_config
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kiosks' AND column_name = 'reader_config') THEN
        ALTER TABLE kiosks ADD COLUMN reader_config JSONB DEFAULT '{}';
        RAISE NOTICE 'Added reader_config column';
    END IF;

    -- authorized_departments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kiosks' AND column_name = 'authorized_departments') THEN
        ALTER TABLE kiosks ADD COLUMN authorized_departments JSONB DEFAULT '[]';
        RAISE NOTICE 'Added authorized_departments column';
    END IF;

    -- ip_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kiosks' AND column_name = 'ip_address') THEN
        ALTER TABLE kiosks ADD COLUMN ip_address VARCHAR(50);
        RAISE NOTICE 'Added ip_address column';
    END IF;

    -- port
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kiosks' AND column_name = 'port') THEN
        ALTER TABLE kiosks ADD COLUMN port INTEGER DEFAULT 9998;
        RAISE NOTICE 'Added port column';
    END IF;

    -- last_seen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kiosks' AND column_name = 'last_seen') THEN
        ALTER TABLE kiosks ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_seen column';
    END IF;

    -- apk_version
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kiosks' AND column_name = 'apk_version') THEN
        ALTER TABLE kiosks ADD COLUMN apk_version VARCHAR(20);
        RAISE NOTICE 'Added apk_version column';
    END IF;

    -- deleted_at (for soft delete/paranoid mode)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kiosks' AND column_name = 'deleted_at') THEN
        ALTER TABLE kiosks ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added deleted_at column';
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN kiosks.has_external_reader IS 'Indica si el kiosko tiene un lector de huellas/rostros externo';
COMMENT ON COLUMN kiosks.reader_model IS 'Modelo del lector externo (si aplica)';
COMMENT ON COLUMN kiosks.reader_config IS 'Configuración JSON del lector externo';
COMMENT ON COLUMN kiosks.authorized_departments IS 'Array de department_id autorizados para este kiosk';
COMMENT ON COLUMN kiosks.ip_address IS 'IP del kiosko en la red local';
COMMENT ON COLUMN kiosks.port IS 'Puerto de comunicación del kiosko';
COMMENT ON COLUMN kiosks.last_seen IS 'Última vez que el kiosko se conectó';
COMMENT ON COLUMN kiosks.apk_version IS 'Versión de la APK instalada en el kiosko';
COMMENT ON COLUMN kiosks.deleted_at IS 'Timestamp de borrado suave (soft delete)';

-- Show current structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'kiosks'
ORDER BY ordinal_position;
