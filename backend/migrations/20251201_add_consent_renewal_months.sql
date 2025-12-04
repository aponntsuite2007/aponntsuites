-- =============================================
-- Migración: Agregar período de renovación de consentimiento dinámico
-- Fecha: 2025-12-01
-- Descripción: Hace dinámico el período de renovación por país
-- =============================================

-- 1. Agregar columna consent_renewal_months a payroll_countries
ALTER TABLE payroll_countries
ADD COLUMN IF NOT EXISTS consent_renewal_months INTEGER DEFAULT 24;

-- 2. Agregar comentario explicativo
COMMENT ON COLUMN payroll_countries.consent_renewal_months IS
    'Período de renovación del consentimiento biométrico en meses. Varía según regulaciones de privacidad del país.';

-- 3. Actualizar países existentes con períodos conocidos
-- Basado en regulaciones de privacidad por país

-- Argentina (Ley 25.326) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'ARG';

-- España (LOPDGDD + GDPR) - 12 meses
UPDATE payroll_countries SET consent_renewal_months = 12 WHERE country_code = 'ESP';

-- México (LFPDPPP) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'MEX';

-- Brasil (LGPD) - 12 meses
UPDATE payroll_countries SET consent_renewal_months = 12 WHERE country_code = 'BRA';

-- USA (CCPA/BIPA) - 36 meses (más permisivo)
UPDATE payroll_countries SET consent_renewal_months = 36 WHERE country_code = 'USA';

-- Colombia (Ley 1581) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'COL';

-- Chile (Ley 19.628 + reforma) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'CHL';

-- Perú (Ley 29733) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'PER';

-- Uruguay (Ley 18.331) - 12 meses (GDPR equivalent)
UPDATE payroll_countries SET consent_renewal_months = 12 WHERE country_code = 'URY';

-- Ecuador (LOPDP) - 12 meses
UPDATE payroll_countries SET consent_renewal_months = 12 WHERE country_code = 'ECU';

-- Panamá (Ley 81) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'PAN';

-- Costa Rica (Ley 8968) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'CRI';

-- Países UE (GDPR) - 12 meses estricto
UPDATE payroll_countries SET consent_renewal_months = 12
WHERE country_code IN ('DEU', 'FRA', 'ITA', 'NLD', 'BEL', 'AUT', 'PRT', 'GRC', 'POL', 'CZE', 'HUN', 'ROU', 'BGR', 'HRV', 'SVN', 'SVK', 'EST', 'LVA', 'LTU', 'FIN', 'SWE', 'DNK', 'IRL', 'LUX', 'MLT', 'CYP');

-- UK (UK GDPR) - 12 meses
UPDATE payroll_countries SET consent_renewal_months = 12 WHERE country_code = 'GBR';

-- Canadá (PIPEDA) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'CAN';

-- Australia (Privacy Act) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'AUS';

-- Nueva Zelanda (Privacy Act 2020) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'NZL';

-- Japón (APPI) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'JPN';

-- Corea del Sur (PIPA) - 12 meses (muy estricto)
UPDATE payroll_countries SET consent_renewal_months = 12 WHERE country_code = 'KOR';

-- Singapur (PDPA) - 24 meses
UPDATE payroll_countries SET consent_renewal_months = 24 WHERE country_code = 'SGP';

-- 4. Log de migración
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM payroll_countries WHERE consent_renewal_months IS NOT NULL;
    RAISE NOTICE 'Migración consent_renewal_months: % países actualizados', updated_count;
END $$;
