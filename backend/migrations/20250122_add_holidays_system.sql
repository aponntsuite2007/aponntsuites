-- =====================================================
-- MIGRACIÓN: Sistema de Feriados y Sucursales
-- Fecha: 2025-01-22
-- Descripción: Agrega soporte para feriados nacionales/provinciales
--              y asignación de turnos por sucursal
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TABLA DE FERIADOS (Holidays)
-- =====================================================
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NULL, -- NULL = nacional, valor = provincial
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_national BOOLEAN DEFAULT true,
    is_provincial BOOLEAN DEFAULT false,
    year INTEGER NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda rápida
CREATE INDEX idx_holidays_country ON holidays(country);
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_year ON holidays(year);
CREATE INDEX idx_holidays_country_date ON holidays(country, date);
CREATE INDEX idx_holidays_country_state_date ON holidays(country, state_province, date);

-- =====================================================
-- 2. EXTENDER TABLA BRANCHES (Sucursales)
-- =====================================================
ALTER TABLE branches
    ADD COLUMN IF NOT EXISTS country VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS state_province VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires';

COMMENT ON COLUMN branches.country IS 'País de la sucursal (ej: Argentina, Chile, Bolivia)';
COMMENT ON COLUMN branches.state_province IS 'Provincia/Estado de la sucursal (ej: Buenos Aires, Santiago)';

-- =====================================================
-- 3. EXTENDER TABLA USERS (Asignar usuarios a sucursal)
-- =====================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

COMMENT ON COLUMN users.branch_id IS 'Sucursal a la que pertenece el usuario (NULL = sin sucursal específica)';

-- =====================================================
-- 4. EXTENDER TABLA SHIFTS (Turnos por sucursal + feriados)
-- =====================================================
ALTER TABLE shifts
    ADD COLUMN IF NOT EXISTS branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS respect_national_holidays BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS respect_provincial_holidays BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS custom_non_working_days JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_shifts_branch_id ON shifts(branch_id);

COMMENT ON COLUMN shifts.branch_id IS 'Sucursal del turno (NULL = aplica a TODAS las sucursales)';
COMMENT ON COLUMN shifts.respect_national_holidays IS 'Si TRUE, excluye feriados nacionales del calendario';
COMMENT ON COLUMN shifts.respect_provincial_holidays IS 'Si TRUE, excluye feriados provinciales del calendario';
COMMENT ON COLUMN shifts.custom_non_working_days IS 'Array de fechas personalizadas no laborables: ["2025-12-24", "2026-01-02"]';

-- =====================================================
-- 5. FUNCIONES UTILITARIAS
-- =====================================================

-- Función para obtener feriados de un país y opcionalmente provincia
CREATE OR REPLACE FUNCTION get_holidays_for_location(
    p_country VARCHAR,
    p_state_province VARCHAR DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
    holiday_date DATE,
    holiday_name VARCHAR,
    is_national BOOLEAN,
    is_provincial BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.date,
        h.name,
        h.is_national,
        h.is_provincial
    FROM holidays h
    WHERE h.country = p_country
      AND (p_state_province IS NULL OR h.state_province IS NULL OR h.state_province = p_state_province)
      AND (p_start_date IS NULL OR h.date >= p_start_date)
      AND (p_end_date IS NULL OR h.date <= p_end_date)
    ORDER BY h.date;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si una fecha es feriado
CREATE OR REPLACE FUNCTION is_holiday(
    p_date DATE,
    p_country VARCHAR,
    p_state_province VARCHAR DEFAULT NULL,
    p_include_national BOOLEAN DEFAULT true,
    p_include_provincial BOOLEAN DEFAULT false
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM holidays h
    WHERE h.date = p_date
      AND h.country = p_country
      AND (
          (p_include_national AND h.is_national)
          OR
          (p_include_provincial AND h.is_provincial AND (h.state_province IS NULL OR h.state_province = p_state_province))
      );

    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMIT;
