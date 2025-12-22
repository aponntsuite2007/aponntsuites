-- ============================================================================
-- MIGRACIÓN: Agregar sistema de renovación automática a contracts
-- Fecha: 2025-12-16
-- Descripción: Agrega columnas para grace period, APKs contratadas y alertas
-- ============================================================================

-- 1. Agregar columna vendor_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'vendor_id') THEN
        ALTER TABLE contracts ADD COLUMN vendor_id UUID REFERENCES aponnt_staff(staff_id);
        COMMENT ON COLUMN contracts.vendor_id IS 'Vendedor asignado al contrato';
    END IF;
END $$;

-- 2. Agregar columna grace_period_end
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'grace_period_end') THEN
        ALTER TABLE contracts ADD COLUMN grace_period_end DATE;
        COMMENT ON COLUMN contracts.grace_period_end IS 'Fecha fin del período de gracia (60 días después de end_date)';
    END IF;
END $$;

-- 3. Agregar columna contracted_apks (JSONB para las 4 APKs)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'contracted_apks') THEN
        ALTER TABLE contracts ADD COLUMN contracted_apks JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN contracts.contracted_apks IS 'APKs contratadas: kiosk, medical, legal, employee';
    END IF;
END $$;

-- 4. Agregar columna next_renewal_alert_date
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'next_renewal_alert_date') THEN
        ALTER TABLE contracts ADD COLUMN next_renewal_alert_date DATE;
        COMMENT ON COLUMN contracts.next_renewal_alert_date IS 'Próxima fecha de alerta de renovación';
    END IF;
END $$;

-- 5. Agregar columna auto_extension_count
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'auto_extension_count') THEN
        ALTER TABLE contracts ADD COLUMN auto_extension_count INTEGER DEFAULT 0;
        COMMENT ON COLUMN contracts.auto_extension_count IS 'Cantidad de extensiones automáticas aplicadas';
    END IF;
END $$;

-- 6. Agregar columna renewal_alert_sent_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'renewal_alert_sent_at') THEN
        ALTER TABLE contracts ADD COLUMN renewal_alert_sent_at TIMESTAMP;
        COMMENT ON COLUMN contracts.renewal_alert_sent_at IS 'Última alerta de renovación enviada';
    END IF;
END $$;

-- 7. Agregar columna original_end_date (para tracking de extensiones)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'original_end_date') THEN
        ALTER TABLE contracts ADD COLUMN original_end_date DATE;
        COMMENT ON COLUMN contracts.original_end_date IS 'Fecha original de fin antes de extensiones';
    END IF;
END $$;

-- 8. Agregar columna template_id para vincular con contract_templates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contracts' AND column_name = 'template_id') THEN
        ALTER TABLE contracts ADD COLUMN template_id UUID REFERENCES contract_templates(id);
    END IF;
END $$;

-- 9. Actualizar CHECK constraint para incluir nuevos estados
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS valid_contract_status;
ALTER TABLE contracts ADD CONSTRAINT valid_contract_status CHECK (
    status IN (
        'DRAFT', 'SENT', 'VIEWED', 'PENDING_SIGNATURE', 'SIGNED',
        'REJECTED', 'EXPIRED', 'CANCELLED', 'ACTIVE',
        'RENEWAL_PENDING', 'GRACE_PERIOD', 'SUSPENDED', 'TERMINATED'
    )
);

-- 10. Crear índices para nuevas columnas
CREATE INDEX IF NOT EXISTS idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_renewal_alert ON contracts(next_renewal_alert_date) WHERE status IN ('ACTIVE', 'RENEWAL_PENDING', 'GRACE_PERIOD');
CREATE INDEX IF NOT EXISTS idx_contracts_grace_period ON contracts(grace_period_end) WHERE status = 'GRACE_PERIOD';

-- 11. Actualizar función de cálculo de fecha de alerta
CREATE OR REPLACE FUNCTION calculate_renewal_alert_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular próxima fecha de alerta (30 días antes del vencimiento)
    IF NEW.end_date IS NOT NULL AND NEW.status IN ('ACTIVE', 'RENEWAL_PENDING') THEN
        NEW.next_renewal_alert_date := NEW.end_date - INTERVAL '30 days';
    END IF;

    -- Calcular grace_period_end si entra en grace period
    IF NEW.status = 'GRACE_PERIOD' AND NEW.grace_period_end IS NULL THEN
        NEW.grace_period_end := COALESCE(NEW.end_date, CURRENT_DATE) + INTERVAL '60 days';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Actualizar función de extensión automática
CREATE OR REPLACE FUNCTION apply_contract_auto_extension()
RETURNS TABLE(
    contract_id UUID,
    company_name VARCHAR,
    contract_code VARCHAR,
    old_end_date DATE,
    new_end_date DATE,
    extension_count INTEGER
) AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT
            c.id, c.contract_code, c.end_date, c.auto_extension_count,
            co.name as company_name
        FROM contracts c
        JOIN companies co ON c.company_id = co.company_id
        WHERE c.status = 'ACTIVE'
          AND c.end_date <= CURRENT_DATE
    LOOP
        -- Guardar fecha original si es primera extensión
        IF rec.auto_extension_count = 0 THEN
            UPDATE contracts SET original_end_date = rec.end_date WHERE id = rec.id;
        END IF;

        -- Aplicar extensión de 60 días
        UPDATE contracts
        SET
            status = 'GRACE_PERIOD',
            grace_period_end = rec.end_date + INTERVAL '60 days',
            auto_extension_count = rec.auto_extension_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = rec.id;

        -- Registrar en logs
        INSERT INTO contract_renewal_logs (
            contract_id, action_type, action_date,
            old_end_date, new_end_date, alert_recipients,
            notes, created_at
        ) VALUES (
            rec.id, 'AUTO_EXTENSION', CURRENT_TIMESTAMP,
            rec.end_date, rec.end_date + INTERVAL '60 days',
            '[]'::jsonb,
            'Extensión automática aplicada por el sistema (60 días de gracia)',
            CURRENT_TIMESTAMP
        );

        contract_id := rec.id;
        company_name := rec.company_name;
        contract_code := rec.contract_code;
        old_end_date := rec.end_date;
        new_end_date := rec.end_date + INTERVAL '60 days';
        extension_count := rec.auto_extension_count + 1;

        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 13. Función para obtener contratos que necesitan alerta de renovación
CREATE OR REPLACE FUNCTION get_contracts_needing_renewal_alert()
RETURNS TABLE(
    contract_id UUID,
    contract_code VARCHAR,
    company_id INTEGER,
    company_name VARCHAR,
    company_email VARCHAR,
    vendor_id UUID,
    vendor_email VARCHAR,
    end_date DATE,
    days_until_expiry INTEGER,
    status VARCHAR,
    is_grace_period BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as contract_id,
        c.contract_code,
        c.company_id,
        co.name as company_name,
        COALESCE(co.contact_email, b.email) as company_email,
        c.vendor_id,
        s.email as vendor_email,
        COALESCE(c.grace_period_end, c.end_date::DATE) as end_date,
        (COALESCE(c.grace_period_end, c.end_date::DATE) - CURRENT_DATE)::INTEGER as days_until_expiry,
        c.status,
        (c.status = 'GRACE_PERIOD') as is_grace_period
    FROM contracts c
    JOIN companies co ON c.company_id = co.company_id
    LEFT JOIN branches b ON b.company_id = co.company_id AND b.is_main = true
    LEFT JOIN aponnt_staff s ON c.vendor_id = s.staff_id
    WHERE c.status IN ('ACTIVE', 'RENEWAL_PENDING', 'GRACE_PERIOD')
      AND (
        -- Alerta T-30 para contratos activos
        (c.status = 'ACTIVE' AND c.end_date::DATE - INTERVAL '30 days' <= CURRENT_DATE)
        OR
        -- Alerta continua para contratos en grace period
        (c.status = 'GRACE_PERIOD' AND c.grace_period_end >= CURRENT_DATE)
        OR
        -- Alerta para renewal_pending
        (c.status = 'RENEWAL_PENDING')
      )
      AND (
        c.renewal_alert_sent_at IS NULL
        OR c.renewal_alert_sent_at < CURRENT_DATE - INTERVAL '3 days'
      )
    ORDER BY end_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 14. Función para suspender contratos con grace period expirado
CREATE OR REPLACE FUNCTION suspend_expired_grace_contracts()
RETURNS TABLE(
    contract_id UUID,
    contract_code VARCHAR,
    company_name VARCHAR,
    grace_period_end DATE
) AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT
            c.id, c.contract_code, c.grace_period_end,
            co.name as company_name
        FROM contracts c
        JOIN companies co ON c.company_id = co.company_id
        WHERE c.status = 'GRACE_PERIOD'
          AND c.grace_period_end < CURRENT_DATE
    LOOP
        UPDATE contracts
        SET
            status = 'SUSPENDED',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = rec.id;

        -- Registrar en logs
        INSERT INTO contract_renewal_logs (
            contract_id, action_type, action_date,
            notes, created_at
        ) VALUES (
            rec.id, 'SUSPENSION', CURRENT_TIMESTAMP,
            'Contrato suspendido por vencimiento del período de gracia',
            CURRENT_TIMESTAMP
        );

        contract_id := rec.id;
        contract_code := rec.contract_code;
        company_name := rec.company_name;
        grace_period_end := rec.grace_period_end;

        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 15. Migrar datos existentes: Llenar vendor_id desde seller_id si existe
UPDATE contracts c
SET vendor_id = (
    SELECT staff_id FROM aponnt_staff
    WHERE user_id = c.seller_id
    LIMIT 1
)
WHERE c.vendor_id IS NULL AND c.seller_id IS NOT NULL;

-- 16. Calcular next_renewal_alert_date para contratos activos existentes
UPDATE contracts
SET next_renewal_alert_date = end_date::DATE - INTERVAL '30 days'
WHERE status = 'ACTIVE'
  AND end_date IS NOT NULL
  AND next_renewal_alert_date IS NULL;

SELECT 'Migración completada: Sistema de renovación automática agregado a contracts' as resultado;
