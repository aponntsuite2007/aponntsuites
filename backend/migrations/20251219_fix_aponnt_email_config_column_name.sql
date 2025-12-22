-- ============================================================================
-- FIX: Renombrar config_type a email_type en aponnt_email_config
-- ============================================================================
-- Fecha: 2025-12-19
-- Descripción: Actualiza la tabla aponnt_email_config para usar email_type
--              en vez de config_type (compatibilidad con frontend)
-- ============================================================================

-- Verificar si la columna config_type existe y email_type NO existe
DO $$
BEGIN
    -- Solo ejecutar si config_type existe y email_type NO existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'config_type'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'email_type'
    ) THEN
        -- Renombrar columna
        ALTER TABLE aponnt_email_config
        RENAME COLUMN config_type TO email_type;

        RAISE NOTICE 'Columna config_type renombrada a email_type exitosamente';
    ELSE
        RAISE NOTICE 'La columna email_type ya existe o config_type no existe - saltando migración';
    END IF;
END $$;

-- Agregar columnas que faltan de la nueva estructura (si no existen)

-- email_address
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'email_address'
    ) THEN
        ALTER TABLE aponnt_email_config
        ADD COLUMN email_address VARCHAR(255);

        -- Copiar valores de from_email a email_address
        UPDATE aponnt_email_config
        SET email_address = from_email;

        -- Hacer NOT NULL después de copiar datos
        ALTER TABLE aponnt_email_config
        ALTER COLUMN email_address SET NOT NULL;

        RAISE NOTICE 'Columna email_address agregada';
    END IF;
END $$;

-- display_name (renombrar from_name si es necesario)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'display_name'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'from_name'
    ) THEN
        ALTER TABLE aponnt_email_config
        RENAME COLUMN from_name TO display_name;

        RAISE NOTICE 'Columna from_name renombrada a display_name';
    END IF;
END $$;

-- smtp_password_encrypted
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'smtp_password_encrypted'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'smtp_password'
    ) THEN
        ALTER TABLE aponnt_email_config
        RENAME COLUMN smtp_password TO smtp_password_encrypted;

        RAISE NOTICE 'Columna smtp_password renombrada a smtp_password_encrypted';
    END IF;
END $$;

-- description
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'description'
    ) THEN
        ALTER TABLE aponnt_email_config
        ADD COLUMN description TEXT;

        -- Copiar notas a description
        UPDATE aponnt_email_config
        SET description = notes
        WHERE notes IS NOT NULL;

        RAISE NOTICE 'Columna description agregada';
    END IF;
END $$;

-- used_for
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'used_for'
    ) THEN
        ALTER TABLE aponnt_email_config
        ADD COLUMN used_for JSONB DEFAULT '[]';

        RAISE NOTICE 'Columna used_for agregada';
    END IF;
END $$;

-- is_default
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aponnt_email_config' AND column_name = 'is_default'
    ) THEN
        ALTER TABLE aponnt_email_config
        ADD COLUMN is_default BOOLEAN DEFAULT false;

        RAISE NOTICE 'Columna is_default agregada';
    END IF;
END $$;

-- Actualizar constraint UNIQUE
DO $$
BEGIN
    -- Eliminar constraint viejo si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'aponnt_email_config_config_type_key'
    ) THEN
        ALTER TABLE aponnt_email_config
        DROP CONSTRAINT aponnt_email_config_config_type_key;

        RAISE NOTICE 'Constraint viejo eliminado';
    END IF;

    -- Agregar constraint nuevo si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'unique_email_type'
    ) THEN
        ALTER TABLE aponnt_email_config
        ADD CONSTRAINT unique_email_type UNIQUE (email_type);

        RAISE NOTICE 'Constraint nuevo agregado';
    END IF;
END $$;

-- Actualizar valores de email_type para que coincidan con el frontend
-- El frontend espera: commercial, partners, staff, support, engineering, etc.
-- La tabla vieja tiene: transactional, marketing, support, billing

UPDATE aponnt_email_config
SET email_type = CASE
    WHEN email_type = 'transactional' THEN 'transactional'
    WHEN email_type = 'marketing' THEN 'commercial'
    WHEN email_type = 'support' THEN 'support'
    WHEN email_type = 'billing' THEN 'billing'
    ELSE email_type
END
WHERE email_type IN ('transactional', 'marketing', 'support', 'billing');

-- Insertar tipos de email que el frontend espera (si no existen)
INSERT INTO aponnt_email_config (
    email_type,
    email_address,
    display_name,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_password_encrypted,
    smtp_secure,
    is_active
)
VALUES
    ('commercial', 'aponntcomercial@gmail.com', 'Aponnt Comercial', 'smtp.gmail.com', 587, 'aponntcomercial@gmail.com', 'PENDIENTE_CONFIGURAR', true, true),
    ('partners', 'partners@aponnt.com', 'Aponnt Partners', 'smtp.gmail.com', 587, 'partners@aponnt.com', 'PENDIENTE_CONFIGURAR', true, true),
    ('staff', 'staff@aponnt.com', 'Aponnt Staff', 'smtp.gmail.com', 587, 'staff@aponnt.com', 'PENDIENTE_CONFIGURAR', true, true),
    ('engineering', 'engineering@aponnt.com', 'Aponnt Engineering', 'smtp.gmail.com', 587, 'engineering@aponnt.com', 'PENDIENTE_CONFIGURAR', true, true),
    ('executive', 'executive@aponnt.com', 'Aponnt Executive', 'smtp.gmail.com', 587, 'executive@aponnt.com', 'PENDIENTE_CONFIGURAR', true, true),
    ('institutional', 'contacto@aponnt.com', 'Aponnt Institucional', 'smtp.gmail.com', 587, 'contacto@aponnt.com', 'PENDIENTE_CONFIGURAR', true, true),
    ('onboarding', 'onboarding@aponnt.com', 'Aponnt Onboarding', 'smtp.gmail.com', 587, 'onboarding@aponnt.com', 'PENDIENTE_CONFIGURAR', true, true),
    ('escalation', 'escalation@aponnt.com', 'Aponnt Escalation', 'smtp.gmail.com', 587, 'escalation@aponnt.com', 'PENDIENTE_CONFIGURAR', true, true)
ON CONFLICT (email_type) DO NOTHING;

-- Comentarios
COMMENT ON COLUMN aponnt_email_config.email_type IS 'Tipo de email: commercial, partners, staff, support, engineering, executive, institutional, billing, onboarding, transactional, escalation';
COMMENT ON COLUMN aponnt_email_config.email_address IS 'Dirección de email de Aponnt para este tipo';
COMMENT ON COLUMN aponnt_email_config.used_for IS 'Array JSON de módulos que usan este email: ["presupuestos", "contratos", "tickets"]';

-- Log de migración exitosa
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada: aponnt_email_config ahora usa email_type';
END $$;
