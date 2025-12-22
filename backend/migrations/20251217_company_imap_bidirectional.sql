-- ============================================================================
-- SISTEMA BIDIRECCIONAL DE EMAILS POR EMPRESA
-- ============================================================================
-- Agrega configuración IMAP para leer buzón de entrada de cada empresa
-- Permite recibir respuestas a emails enviados desde el sistema
-- Fecha: 2025-12-17
-- ============================================================================

-- 1. Agregar columnas IMAP a company_email_config (si existe)
DO $$
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_email_config') THEN
        -- Agregar columnas IMAP si no existen
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'imap_host') THEN
            ALTER TABLE company_email_config ADD COLUMN imap_host VARCHAR(255);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'imap_port') THEN
            ALTER TABLE company_email_config ADD COLUMN imap_port INTEGER DEFAULT 993;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'imap_user') THEN
            ALTER TABLE company_email_config ADD COLUMN imap_user VARCHAR(255);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'imap_password') THEN
            ALTER TABLE company_email_config ADD COLUMN imap_password VARCHAR(500);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'imap_secure') THEN
            ALTER TABLE company_email_config ADD COLUMN imap_secure BOOLEAN DEFAULT true;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'imap_enabled') THEN
            ALTER TABLE company_email_config ADD COLUMN imap_enabled BOOLEAN DEFAULT false;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'imap_last_poll') THEN
            ALTER TABLE company_email_config ADD COLUMN imap_last_poll TIMESTAMP;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'imap_last_uid') THEN
            ALTER TABLE company_email_config ADD COLUMN imap_last_uid INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'imap_folder') THEN
            ALTER TABLE company_email_config ADD COLUMN imap_folder VARCHAR(100) DEFAULT 'INBOX';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'company_email_config' AND column_name = 'bidirectional_enabled') THEN
            ALTER TABLE company_email_config ADD COLUMN bidirectional_enabled BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;

-- 2. Crear tabla de configuración de email de empresa si no existe
CREATE TABLE IF NOT EXISTS company_email_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Configuración SMTP (salida)
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER DEFAULT 587,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_password VARCHAR(500) NOT NULL,
    smtp_secure BOOLEAN DEFAULT false,
    smtp_from_email VARCHAR(255) NOT NULL,
    smtp_from_name VARCHAR(255),
    smtp_reply_to VARCHAR(255),

    -- Configuración IMAP (entrada - para bidireccional)
    imap_host VARCHAR(255),
    imap_port INTEGER DEFAULT 993,
    imap_user VARCHAR(255),
    imap_password VARCHAR(500),
    imap_secure BOOLEAN DEFAULT true,
    imap_enabled BOOLEAN DEFAULT false,
    imap_folder VARCHAR(100) DEFAULT 'INBOX',
    imap_last_poll TIMESTAMP,
    imap_last_uid INTEGER DEFAULT 0,

    -- Control bidireccional
    bidirectional_enabled BOOLEAN DEFAULT false,
    poll_interval_seconds INTEGER DEFAULT 60,

    -- Estado
    is_active BOOLEAN DEFAULT true,
    is_validated BOOLEAN DEFAULT false,
    validated_at TIMESTAMP,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_email_config_company ON company_email_config(company_id);
CREATE INDEX IF NOT EXISTS idx_company_email_config_imap_enabled ON company_email_config(imap_enabled) WHERE imap_enabled = true;
CREATE INDEX IF NOT EXISTS idx_company_email_config_bidirectional ON company_email_config(bidirectional_enabled) WHERE bidirectional_enabled = true;

-- 3. Tabla para trackear emails procesados del inbox de empresa
CREATE TABLE IF NOT EXISTS company_inbox_processed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,
    message_uid INTEGER NOT NULL,                -- UID del mensaje en IMAP
    message_id VARCHAR(500),                     -- Message-ID header
    from_email VARCHAR(255) NOT NULL,
    subject VARCHAR(1000),
    received_at TIMESTAMP,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'PROCESSED',
    linked_inbound_id UUID REFERENCES email_inbound_log(id),
    error_message TEXT,

    UNIQUE(company_id, message_uid)
);

CREATE INDEX IF NOT EXISTS idx_company_inbox_company ON company_inbox_processed(company_id);
CREATE INDEX IF NOT EXISTS idx_company_inbox_message_id ON company_inbox_processed(message_id);

-- 4. Vista para empresas con IMAP habilitado
CREATE OR REPLACE VIEW v_companies_with_imap AS
SELECT
    cec.id as config_id,
    cec.company_id,
    c.name as company_name,
    c.slug as company_slug,
    cec.imap_host,
    cec.imap_port,
    cec.imap_user,
    cec.imap_folder,
    cec.imap_last_poll,
    cec.imap_last_uid,
    cec.poll_interval_seconds,
    cec.smtp_from_email,
    cec.bidirectional_enabled
FROM company_email_config cec
JOIN companies c ON cec.company_id = c.company_id
WHERE cec.imap_enabled = true
  AND cec.bidirectional_enabled = true
  AND cec.is_active = true
  AND c.is_active = true;

-- 5. Función para obtener empresas que necesitan polling
CREATE OR REPLACE FUNCTION get_companies_needing_poll()
RETURNS TABLE(
    config_id UUID,
    company_id INTEGER,
    company_name VARCHAR,
    imap_host VARCHAR,
    imap_port INTEGER,
    imap_user VARCHAR,
    imap_password VARCHAR,
    imap_secure BOOLEAN,
    imap_folder VARCHAR,
    imap_last_uid INTEGER,
    smtp_from_email VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cec.id as config_id,
        cec.company_id,
        c.name as company_name,
        cec.imap_host,
        cec.imap_port,
        cec.imap_user,
        cec.imap_password,
        cec.imap_secure,
        cec.imap_folder,
        cec.imap_last_uid,
        cec.smtp_from_email
    FROM company_email_config cec
    JOIN companies c ON cec.company_id = c.company_id
    WHERE cec.imap_enabled = true
      AND cec.bidirectional_enabled = true
      AND cec.is_active = true
      AND c.is_active = true
      AND (
          cec.imap_last_poll IS NULL
          OR cec.imap_last_poll < NOW() - (cec.poll_interval_seconds || ' seconds')::INTERVAL
      );
END;
$$ LANGUAGE plpgsql;

-- 6. Función para actualizar último poll
CREATE OR REPLACE FUNCTION update_imap_poll_status(
    p_config_id UUID,
    p_last_uid INTEGER,
    p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE company_email_config
    SET
        imap_last_poll = CURRENT_TIMESTAMP,
        imap_last_uid = COALESCE(p_last_uid, imap_last_uid),
        last_error = p_error,
        error_count = CASE WHEN p_error IS NOT NULL THEN error_count + 1 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_config_id;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE company_email_config IS 'Configuración de email SMTP/IMAP por empresa para sistema bidireccional';
COMMENT ON TABLE company_inbox_processed IS 'Tracking de emails procesados del inbox de cada empresa';
COMMENT ON COLUMN company_email_config.bidirectional_enabled IS 'Si está habilitado el sistema bidireccional (emails de respuesta)';
COMMENT ON COLUMN company_email_config.imap_last_uid IS 'Último UID procesado del inbox (para no reprocesar)';

SELECT 'Migración completada: Sistema bidireccional de emails por empresa' as resultado;
