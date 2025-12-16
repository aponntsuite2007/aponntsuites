-- ============================================================================
-- MIGRACIÓN: Crear tabla company_non_working_days
-- ============================================================================
-- Tabla para días no laborables manuales configurados por RRHH
--
-- Fecha: 2025-12-14
-- Autor: Sistema de Calendario Laboral
-- ============================================================================

-- 1. Crear tabla principal
CREATE TABLE IF NOT EXISTS company_non_working_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    affects VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (affects IN ('ALL', 'BRANCH', 'DEPARTMENT')),
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraint: Si affects = 'BRANCH', branch_id debe ser NOT NULL
    -- Constraint: Si affects = 'DEPARTMENT', department_id debe ser NOT NULL
    CONSTRAINT check_affects_branch CHECK (
        affects != 'BRANCH' OR branch_id IS NOT NULL
    ),
    CONSTRAINT check_affects_department CHECK (
        affects != 'DEPARTMENT' OR department_id IS NOT NULL
    )
);

-- 2. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_company_non_working_company_date
    ON company_non_working_days(company_id, date);

CREATE INDEX IF NOT EXISTS idx_company_non_working_branch
    ON company_non_working_days(branch_id, date)
    WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_non_working_department
    ON company_non_working_days(department_id, date)
    WHERE department_id IS NOT NULL;

-- 3. Crear tabla de excepciones de feriados
-- (Para cuando un empleado/departamento debe trabajar en un feriado)
CREATE TABLE IF NOT EXISTS holiday_work_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL = aplica a todos
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holiday_exceptions_lookup
    ON holiday_work_exceptions(company_id, date, is_active);

-- 4. Función helper: Verificar si es día laborable
CREATE OR REPLACE FUNCTION is_working_day(
    p_user_id INTEGER,
    p_date DATE,
    p_company_id INTEGER
) RETURNS TABLE (
    is_working BOOLEAN,
    reason VARCHAR(100),
    reason_code VARCHAR(50)
) AS $$
DECLARE
    v_branch_id INTEGER;
    v_department_id INTEGER;
    v_country VARCHAR(100);
BEGIN
    -- Obtener contexto del usuario
    SELECT d.branch_id, u."departmentId", b.country
    INTO v_branch_id, v_department_id, v_country
    FROM users u
    JOIN departments d ON u."departmentId" = d.id
    JOIN branches b ON d.branch_id = b.id
    WHERE u.id = p_user_id;

    -- 1. Verificar feriado nacional
    IF EXISTS (
        SELECT 1 FROM holidays
        WHERE country = v_country
          AND date = p_date
          AND is_national = true
    ) THEN
        -- Verificar si hay excepción
        IF NOT EXISTS (
            SELECT 1 FROM holiday_work_exceptions
            WHERE company_id = p_company_id
              AND date = p_date
              AND (user_id = p_user_id OR user_id IS NULL)
              AND is_active = true
        ) THEN
            RETURN QUERY SELECT false, 'Feriado nacional'::VARCHAR(100), 'NATIONAL_HOLIDAY'::VARCHAR(50);
            RETURN;
        END IF;
    END IF;

    -- 2. Verificar día no laborable de empresa
    IF EXISTS (
        SELECT 1 FROM company_non_working_days
        WHERE company_id = p_company_id
          AND date = p_date
          AND (
            affects = 'ALL'
            OR (affects = 'BRANCH' AND branch_id = v_branch_id)
            OR (affects = 'DEPARTMENT' AND department_id = v_department_id)
          )
    ) THEN
        RETURN QUERY SELECT false, 'Día no laborable empresa'::VARCHAR(100), 'COMPANY_NON_WORKING'::VARCHAR(50);
        RETURN;
    END IF;

    -- 3. Por defecto, es día laborable (el turno se valida en otra capa)
    RETURN QUERY SELECT true, 'Día laborable'::VARCHAR(100), 'WORKING_DAY'::VARCHAR(50);
END;
$$ LANGUAGE plpgsql;

-- 5. Función helper: Obtener feriados de un mes
CREATE OR REPLACE FUNCTION get_month_holidays(
    p_country VARCHAR(100),
    p_year INTEGER,
    p_month INTEGER
) RETURNS TABLE (
    holiday_date DATE,
    holiday_name VARCHAR(255),
    is_national BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT date, name, holidays.is_national
    FROM holidays
    WHERE country = p_country
      AND year = p_year
      AND EXTRACT(MONTH FROM date) = p_month
    ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentarios de documentación
COMMENT ON TABLE company_non_working_days IS 'Días no laborables configurados manualmente por RRHH';
COMMENT ON COLUMN company_non_working_days.affects IS 'Alcance: ALL=toda la empresa, BRANCH=sucursal específica, DEPARTMENT=departamento específico';
COMMENT ON TABLE holiday_work_exceptions IS 'Excepciones para trabajar en feriados (guardias, turnos especiales)';

-- 7. Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada: company_non_working_days y holiday_work_exceptions creadas';
END $$;
