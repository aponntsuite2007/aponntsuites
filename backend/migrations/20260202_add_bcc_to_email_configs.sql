-- ============================================================================
-- MIGRATION: Add BCC Email Field to Email Configurations
-- ============================================================================
-- Date: 2026-02-02
-- Description: Adds bcc_email column to aponnt_email_config and company_email_config
--              for automatic BCC on all outgoing emails
-- ============================================================================

-- ============================================
-- 1. ADD BCC TO APONNT_EMAIL_CONFIG
-- ============================================

ALTER TABLE aponnt_email_config
ADD COLUMN IF NOT EXISTS bcc_email VARCHAR(255);

COMMENT ON COLUMN aponnt_email_config.bcc_email IS
'Email address for automatic BCC on all emails sent with this configuration';

-- ============================================
-- 2. ADD BCC TO COMPANY_EMAIL_CONFIG
-- ============================================

ALTER TABLE company_email_config
ADD COLUMN IF NOT EXISTS bcc_email VARCHAR(255);

COMMENT ON COLUMN company_email_config.bcc_email IS
'Email address for automatic BCC on all emails sent with this configuration';

-- ============================================
-- 3. ADD BCC TO EMAIL_CONFIGURATIONS (legacy)
-- ============================================

-- Note: email_configurations already has bcc_copy, but let's ensure consistency
-- We'll add bcc_email as an alias if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_configurations'
        AND column_name = 'bcc_email'
    ) THEN
        ALTER TABLE email_configurations
        ADD COLUMN bcc_email VARCHAR(255);

        -- Copy existing bcc_copy values to bcc_email
        UPDATE email_configurations
        SET bcc_email = bcc_copy
        WHERE bcc_copy IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- SUMMARY
-- ============================================

SELECT 'Migration completed: BCC email columns added to:' AS status;
SELECT '  - aponnt_email_config.bcc_email' AS table1;
SELECT '  - company_email_config.bcc_email' AS table2;
SELECT '  - email_configurations.bcc_email' AS table3;
