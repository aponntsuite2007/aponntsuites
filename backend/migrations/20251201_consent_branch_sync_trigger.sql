-- =============================================
-- Migración: Sincronización Consentimiento-Sucursal
-- Fecha: 2025-12-01
-- Descripción: Cuando un usuario cambia de sucursal/país,
--              el consentimiento debe reiniciarse según las nuevas regulaciones
-- =============================================

-- 1. Agregar columnas de tracking a biometric_consents
ALTER TABLE biometric_consents
ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES company_branches(id),
ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES payroll_countries(id),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS invalidated_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS previous_consent_id INTEGER REFERENCES biometric_consents(id);

COMMENT ON COLUMN biometric_consents.branch_id IS 'Sucursal del usuario al momento de dar consentimiento';
COMMENT ON COLUMN biometric_consents.country_id IS 'País de la sucursal (fuente de verdad para regulaciones)';
COMMENT ON COLUMN biometric_consents.country_code IS 'Código ISO-3 del país para referencia rápida';
COMMENT ON COLUMN biometric_consents.invalidated_reason IS 'Razón de invalidación (BRANCH_CHANGE, COUNTRY_CHANGE, MANUAL, EXPIRED)';
COMMENT ON COLUMN biometric_consents.invalidated_at IS 'Fecha de invalidación';
COMMENT ON COLUMN biometric_consents.previous_consent_id IS 'Referencia al consentimiento anterior (historial)';

-- 2. Crear tabla de historial de cambios de consentimiento
CREATE TABLE IF NOT EXISTS consent_change_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(id),
    consent_id INTEGER REFERENCES biometric_consents(id),

    -- Datos anteriores
    old_branch_id INTEGER REFERENCES company_branches(id),
    old_country_id INTEGER REFERENCES payroll_countries(id),
    old_country_code VARCHAR(3),
    old_renewal_months INTEGER,
    old_consent_status VARCHAR(50),
    old_expires_at TIMESTAMP,

    -- Datos nuevos
    new_branch_id INTEGER REFERENCES company_branches(id),
    new_country_id INTEGER REFERENCES payroll_countries(id),
    new_country_code VARCHAR(3),
    new_renewal_months INTEGER,

    -- Metadata
    change_type VARCHAR(50) NOT NULL, -- BRANCH_CHANGE, COUNTRY_CHANGE, INITIAL, RENEWAL
    action_taken VARCHAR(50) NOT NULL, -- INVALIDATED, KEPT, CREATED
    triggered_by VARCHAR(50) DEFAULT 'SYSTEM', -- SYSTEM, ADMIN, USER
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consent_change_log_user ON consent_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_change_log_company ON consent_change_log(company_id);
CREATE INDEX IF NOT EXISTS idx_consent_change_log_type ON consent_change_log(change_type);

COMMENT ON TABLE consent_change_log IS 'Historial de todos los cambios de consentimiento - Auditoría completa';

-- 3. Función que detecta si cambió el país al cambiar de sucursal
CREATE OR REPLACE FUNCTION fn_get_branch_country(p_branch_id INTEGER)
RETURNS TABLE(country_id INTEGER, country_code VARCHAR, country_name VARCHAR, renewal_months INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pc.id as country_id,
        pc.country_code::VARCHAR,
        pc.country_name::VARCHAR,
        COALESCE(pc.consent_renewal_months, 24) as renewal_months
    FROM company_branches cb
    LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
    WHERE cb.id = p_branch_id
    LIMIT 1;
END;
$$;

-- 4. Función principal: Manejar cambio de sucursal
CREATE OR REPLACE FUNCTION fn_handle_user_branch_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_country RECORD;
    v_new_country RECORD;
    v_consent RECORD;
    v_requires_new_consent BOOLEAN := FALSE;
    v_change_type VARCHAR(50);
    v_action_taken VARCHAR(50);
BEGIN
    -- Solo procesar si cambió branch_id o default_branch_id
    IF (OLD.branch_id IS DISTINCT FROM NEW.branch_id) OR
       (OLD.default_branch_id IS DISTINCT FROM NEW.default_branch_id) THEN

        -- Obtener país de la sucursal anterior
        IF OLD.branch_id IS NOT NULL OR OLD.default_branch_id IS NOT NULL THEN
            SELECT * INTO v_old_country
            FROM fn_get_branch_country(COALESCE(OLD.branch_id, OLD.default_branch_id));
        END IF;

        -- Obtener país de la sucursal nueva
        IF NEW.branch_id IS NOT NULL OR NEW.default_branch_id IS NOT NULL THEN
            SELECT * INTO v_new_country
            FROM fn_get_branch_country(COALESCE(NEW.branch_id, NEW.default_branch_id));
        END IF;

        -- Determinar tipo de cambio
        IF v_old_country.country_id IS NULL AND v_new_country.country_id IS NOT NULL THEN
            v_change_type := 'INITIAL';
            v_requires_new_consent := FALSE; -- Primera asignación, no invalida nada
        ELSIF v_old_country.country_id != v_new_country.country_id THEN
            v_change_type := 'COUNTRY_CHANGE';
            v_requires_new_consent := TRUE; -- Cambió de país = requiere nuevo consentimiento
        ELSE
            v_change_type := 'BRANCH_CHANGE';
            v_requires_new_consent := FALSE; -- Mismo país = mantener consentimiento
        END IF;

        -- Buscar consentimiento activo del usuario
        SELECT * INTO v_consent
        FROM biometric_consents
        WHERE user_id = NEW.user_id
          AND company_id = NEW.company_id
          AND consent_given = TRUE
          AND (revoked = FALSE OR revoked IS NULL)
          AND (invalidated_at IS NULL)
        ORDER BY consent_date DESC
        LIMIT 1;

        -- Si requiere nuevo consentimiento (cambió de país)
        IF v_requires_new_consent AND v_consent.id IS NOT NULL THEN
            -- Invalidar consentimiento actual
            UPDATE biometric_consents
            SET invalidated_reason = 'COUNTRY_CHANGE',
                invalidated_at = NOW(),
                revoked = TRUE,
                revoked_date = NOW(),
                revoked_reason = 'Cambio de país: ' ||
                    COALESCE(v_old_country.country_name, 'Sin país') || ' → ' ||
                    COALESCE(v_new_country.country_name, 'Sin país')
            WHERE id = v_consent.id;

            v_action_taken := 'INVALIDATED';

            -- Log del cambio
            RAISE NOTICE 'CONSENT INVALIDATED: User % changed from % to %',
                NEW.user_id,
                v_old_country.country_code,
                v_new_country.country_code;
        ELSIF v_consent.id IS NOT NULL THEN
            v_action_taken := 'KEPT';
        ELSE
            v_action_taken := 'NO_CONSENT';
        END IF;

        -- Registrar en log de cambios
        INSERT INTO consent_change_log (
            user_id, company_id, consent_id,
            old_branch_id, old_country_id, old_country_code, old_renewal_months,
            old_consent_status, old_expires_at,
            new_branch_id, new_country_id, new_country_code, new_renewal_months,
            change_type, action_taken, triggered_by, notes
        ) VALUES (
            NEW.user_id, NEW.company_id, v_consent.id,
            COALESCE(OLD.branch_id, OLD.default_branch_id),
            v_old_country.country_id,
            v_old_country.country_code,
            v_old_country.renewal_months,
            CASE WHEN v_consent.id IS NOT NULL THEN 'ACTIVE' ELSE 'NONE' END,
            v_consent.expires_at,
            COALESCE(NEW.branch_id, NEW.default_branch_id),
            v_new_country.country_id,
            v_new_country.country_code,
            v_new_country.renewal_months,
            v_change_type,
            v_action_taken,
            'SYSTEM',
            CASE
                WHEN v_requires_new_consent THEN
                    'Usuario cambió de país. Regulaciones diferentes: ' ||
                    COALESCE(v_old_country.renewal_months::TEXT, '?') || ' meses → ' ||
                    COALESCE(v_new_country.renewal_months::TEXT, '?') || ' meses'
                ELSE
                    'Cambio de sucursal dentro del mismo país. Consentimiento mantenido.'
            END
        );
    END IF;

    RETURN NEW;
END;
$$;

-- 5. Crear trigger en tabla users
DROP TRIGGER IF EXISTS trg_user_branch_change_consent ON users;
CREATE TRIGGER trg_user_branch_change_consent
    AFTER UPDATE OF branch_id, default_branch_id ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_handle_user_branch_change();

COMMENT ON TRIGGER trg_user_branch_change_consent ON users IS
    'Detecta cambios de sucursal y maneja invalidación de consentimientos si cambia el país';

-- 6. Función para obtener estado de consentimiento de un usuario
CREATE OR REPLACE FUNCTION fn_get_user_consent_status(p_user_id UUID)
RETURNS TABLE(
    has_valid_consent BOOLEAN,
    consent_id INTEGER,
    consent_date TIMESTAMP,
    expires_at TIMESTAMP,
    days_until_expiry INTEGER,
    country_code VARCHAR,
    country_name VARCHAR,
    renewal_months INTEGER,
    needs_renewal BOOLEAN,
    invalidated BOOLEAN,
    invalidated_reason VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (bc.id IS NOT NULL AND bc.consent_given = TRUE AND
         (bc.revoked = FALSE OR bc.revoked IS NULL) AND
         bc.invalidated_at IS NULL AND
         (bc.expires_at IS NULL OR bc.expires_at > NOW())) as has_valid_consent,
        bc.id as consent_id,
        bc.consent_date,
        bc.expires_at,
        EXTRACT(DAY FROM (bc.expires_at - NOW()))::INTEGER as days_until_expiry,
        pc.country_code::VARCHAR,
        pc.country_name::VARCHAR,
        COALESCE(pc.consent_renewal_months, 24) as renewal_months,
        (bc.expires_at IS NOT NULL AND bc.expires_at <= NOW() + INTERVAL '30 days') as needs_renewal,
        (bc.invalidated_at IS NOT NULL) as invalidated,
        bc.invalidated_reason::VARCHAR
    FROM users u
    LEFT JOIN biometric_consents bc ON bc.user_id = u.user_id
        AND bc.company_id = u.company_id
        AND bc.consent_given = TRUE
        AND (bc.revoked = FALSE OR bc.revoked IS NULL)
    LEFT JOIN company_branches cb ON cb.id = COALESCE(u.branch_id, u.default_branch_id)
    LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
    WHERE u.user_id = p_user_id
    ORDER BY bc.consent_date DESC NULLS LAST
    LIMIT 1;
END;
$$;

-- 7. Vista para dashboard de consentimientos con estado completo
CREATE OR REPLACE VIEW vw_consent_dashboard AS
SELECT
    u.user_id,
    u."firstName" || ' ' || u."lastName" as employee_name,
    u.email,
    u.company_id,
    c.name as company_name,
    COALESCE(u.branch_id, u.default_branch_id) as current_branch_id,
    cb.name as branch_name,
    pc.country_code,
    pc.country_name,
    COALESCE(pc.consent_renewal_months, 24) as renewal_months,
    bc.id as consent_id,
    bc.consent_given,
    bc.consent_date,
    bc.expires_at,
    CASE
        WHEN bc.invalidated_at IS NOT NULL THEN 'INVALIDATED'
        WHEN bc.revoked = TRUE THEN 'REVOKED'
        WHEN bc.expires_at IS NOT NULL AND bc.expires_at < NOW() THEN 'EXPIRED'
        WHEN bc.expires_at IS NOT NULL AND bc.expires_at <= NOW() + INTERVAL '30 days' THEN 'EXPIRING_SOON'
        WHEN bc.consent_given = TRUE THEN 'ACTIVE'
        WHEN bc.id IS NOT NULL THEN 'PENDING'
        ELSE 'NO_CONSENT'
    END as consent_status,
    bc.invalidated_reason,
    bc.invalidated_at,
    EXTRACT(DAY FROM (bc.expires_at - NOW()))::INTEGER as days_until_expiry
FROM users u
JOIN companies c ON c.id = u.company_id
LEFT JOIN company_branches cb ON cb.id = COALESCE(u.branch_id, u.default_branch_id)
LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
LEFT JOIN biometric_consents bc ON bc.user_id = u.user_id
    AND bc.company_id = u.company_id
    AND bc.id = (
        SELECT MAX(bc2.id)
        FROM biometric_consents bc2
        WHERE bc2.user_id = u.user_id AND bc2.company_id = u.company_id
    )
WHERE u.is_active = TRUE;

COMMENT ON VIEW vw_consent_dashboard IS 'Vista completa de estado de consentimientos con info de país y sucursal';

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_consents_user_company ON biometric_consents(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_consents_expires ON biometric_consents(expires_at) WHERE consent_given = TRUE;
CREATE INDEX IF NOT EXISTS idx_consents_invalidated ON biometric_consents(invalidated_at) WHERE invalidated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_default_branch ON users(default_branch_id) WHERE default_branch_id IS NOT NULL;

-- 9. Actualizar consentimientos existentes con datos de branch/country
UPDATE biometric_consents bc
SET
    branch_id = COALESCE(u.branch_id, u.default_branch_id),
    country_id = cb.country_id,
    country_code = pc.country_code
FROM users u
LEFT JOIN company_branches cb ON cb.id = COALESCE(u.branch_id, u.default_branch_id)
LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
WHERE bc.user_id = u.user_id
  AND bc.branch_id IS NULL;

-- 10. Log de migración
DO $$
DECLARE
    v_consents_updated INTEGER;
    v_trigger_created BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO v_consents_updated
    FROM biometric_consents WHERE branch_id IS NOT NULL;

    SELECT EXISTS(
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_branch_change_consent'
    ) INTO v_trigger_created;

    RAISE NOTICE '=== MIGRACIÓN CONSENT-BRANCH-SYNC COMPLETADA ===';
    RAISE NOTICE 'Consentimientos actualizados con branch_id: %', v_consents_updated;
    RAISE NOTICE 'Trigger creado: %', v_trigger_created;
    RAISE NOTICE '';
    RAISE NOTICE 'FUNCIONALIDAD:';
    RAISE NOTICE '1. Cuando un usuario cambia de sucursal a un país diferente:';
    RAISE NOTICE '   → Su consentimiento se INVALIDA automáticamente';
    RAISE NOTICE '   → Debe dar nuevo consentimiento con las reglas del nuevo país';
    RAISE NOTICE '';
    RAISE NOTICE '2. Si cambia de sucursal pero mismo país:';
    RAISE NOTICE '   → Su consentimiento se MANTIENE válido';
    RAISE NOTICE '';
    RAISE NOTICE '3. Todos los cambios quedan registrados en consent_change_log';
END $$;
