-- ============================================================================
-- MIGRACIÓN: Sistema Completo de Vacaciones y Licencias
-- ============================================================================
-- Fecha: 2025-11-30
-- Descripción: Crea las 5 tablas necesarias para el módulo de vacaciones
-- Tablas: vacation_configurations, vacation_scales, extraordinary_licenses,
--         vacation_requests, task_compatibility
-- Multi-tenant: Todas las tablas incluyen company_id
-- ============================================================================

-- ============================================================================
-- 1. TABLA: vacation_configurations
-- Configuración general de vacaciones por empresa
-- ============================================================================
CREATE TABLE IF NOT EXISTS vacation_configurations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Configuración de fraccionamiento
    vacation_interruptible BOOLEAN DEFAULT true,
    min_continuous_days INTEGER DEFAULT 7,
    max_fractions INTEGER DEFAULT 3,

    -- Configuración de programación automática
    auto_scheduling_enabled BOOLEAN DEFAULT true,
    min_advance_notice_days INTEGER DEFAULT 15,
    max_simultaneous_percentage INTEGER DEFAULT 30,

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vacation_config_company ON vacation_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_vacation_config_active ON vacation_configurations(company_id, is_active);

COMMENT ON TABLE vacation_configurations IS 'Configuración general de vacaciones por empresa';
COMMENT ON COLUMN vacation_configurations.vacation_interruptible IS 'Si las vacaciones pueden ser interrumpidas';
COMMENT ON COLUMN vacation_configurations.min_continuous_days IS 'Mínimo de días continuos obligatorios (LCT Argentina: 7)';
COMMENT ON COLUMN vacation_configurations.max_fractions IS 'Máximo de fracciones permitidas por período';
COMMENT ON COLUMN vacation_configurations.max_simultaneous_percentage IS 'Porcentaje máximo de empleados de vacaciones simultáneamente';

-- ============================================================================
-- 2. TABLA: vacation_scales
-- Escalas de días de vacaciones según antigüedad (LCT Argentina)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vacation_scales (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Rango de antigüedad en años
    years_from DECIMAL(4,2) NOT NULL,
    years_to DECIMAL(4,2), -- NULL = sin límite superior
    range_description VARCHAR(100),

    -- Días de vacaciones
    vacation_days INTEGER NOT NULL,

    -- Prioridad para resolución de conflictos
    priority INTEGER DEFAULT 0,

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vacation_scale_company ON vacation_scales(company_id);
CREATE INDEX IF NOT EXISTS idx_vacation_scale_range ON vacation_scales(years_from, years_to, is_active);
CREATE INDEX IF NOT EXISTS idx_vacation_scale_priority ON vacation_scales(priority, is_active);

COMMENT ON TABLE vacation_scales IS 'Escalas de días de vacaciones según antigüedad';
COMMENT ON COLUMN vacation_scales.years_from IS 'Antigüedad mínima en años';
COMMENT ON COLUMN vacation_scales.years_to IS 'Antigüedad máxima en años (NULL = sin límite)';
COMMENT ON COLUMN vacation_scales.vacation_days IS 'Días de vacaciones correspondientes';

-- ============================================================================
-- 3. TABLA: extraordinary_licenses
-- Licencias extraordinarias (matrimonio, nacimiento, fallecimiento, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS extraordinary_licenses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Tipo y descripción
    type VARCHAR(100) NOT NULL,
    description TEXT,

    -- Días otorgados
    days INTEGER NOT NULL,
    day_type VARCHAR(20) DEFAULT 'corrido' CHECK (day_type IN ('habil', 'corrido')),

    -- Requisitos
    requires_approval BOOLEAN DEFAULT true,
    requires_documentation BOOLEAN DEFAULT false,
    max_per_year INTEGER, -- NULL = sin límite
    advance_notice_days INTEGER DEFAULT 0,

    -- Base legal
    legal_basis TEXT,

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_extraordinary_license_company ON extraordinary_licenses(company_id);
CREATE INDEX IF NOT EXISTS idx_extraordinary_license_type ON extraordinary_licenses(type, is_active);
CREATE INDEX IF NOT EXISTS idx_extraordinary_license_active ON extraordinary_licenses(is_active);

COMMENT ON TABLE extraordinary_licenses IS 'Licencias extraordinarias según LCT Argentina';
COMMENT ON COLUMN extraordinary_licenses.type IS 'Tipo de licencia (Matrimonio, Nacimiento, Fallecimiento, etc.)';
COMMENT ON COLUMN extraordinary_licenses.day_type IS 'habil = días hábiles, corrido = días corridos';
COMMENT ON COLUMN extraordinary_licenses.legal_basis IS 'Artículo de la LCT u otra ley aplicable';

-- ============================================================================
-- 4. TABLA: vacation_requests
-- Solicitudes de vacaciones y licencias
-- ============================================================================
CREATE TABLE IF NOT EXISTS vacation_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Tipo de solicitud
    request_type VARCHAR(20) DEFAULT 'vacation' CHECK (request_type IN ('vacation', 'extraordinary')),
    extraordinary_license_id INTEGER REFERENCES extraordinary_licenses(id),

    -- Fechas
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,

    -- Razón/motivo
    reason TEXT,

    -- Estado del flujo de aprobación
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'active', 'completed')),
    approved_by UUID REFERENCES users(user_id),
    approval_date DATE,
    approval_comments TEXT,

    -- Origen de la solicitud
    source VARCHAR(50) DEFAULT 'web',

    -- Cobertura de tareas (JSON)
    coverage_assignments JSONB DEFAULT '[]'::jsonb,

    -- Documentación de respaldo (JSON)
    supporting_documents JSONB DEFAULT '[]'::jsonb,

    -- Generación automática
    is_auto_generated BOOLEAN DEFAULT false,
    auto_generation_data JSONB,

    -- Análisis de compatibilidad
    compatibility_score DECIMAL(5,2),
    conflicts JSONB DEFAULT '[]'::jsonb,

    -- Historial de modificaciones
    modification_history JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vacation_req_company ON vacation_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_vacation_req_user ON vacation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vacation_req_user_status ON vacation_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_vacation_req_dates ON vacation_requests(start_date, end_date, status);
CREATE INDEX IF NOT EXISTS idx_vacation_req_type ON vacation_requests(request_type, status);
CREATE INDEX IF NOT EXISTS idx_vacation_req_approval ON vacation_requests(approved_by, approval_date);
CREATE INDEX IF NOT EXISTS idx_vacation_req_source ON vacation_requests(source);

COMMENT ON TABLE vacation_requests IS 'Solicitudes de vacaciones y licencias extraordinarias';
COMMENT ON COLUMN vacation_requests.source IS 'Origen: web, mobile-apk, system';
COMMENT ON COLUMN vacation_requests.coverage_assignments IS 'Asignaciones de cobertura de tareas durante ausencia';
COMMENT ON COLUMN vacation_requests.conflicts IS 'Conflictos detectados con otras solicitudes';

-- ============================================================================
-- 5. TABLA: task_compatibility
-- Matriz de compatibilidad para cobertura de tareas
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_compatibility (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Empleados
    primary_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    cover_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Puntuación de compatibilidad
    compatibility_score DECIMAL(5,2) DEFAULT 0,

    -- Tareas que puede cubrir (JSON)
    coverable_tasks JSONB DEFAULT '[]'::jsonb,

    -- Límites de cobertura
    max_coverage_hours INTEGER,
    max_concurrent_tasks INTEGER DEFAULT 3,

    -- Métricas de desempeño
    last_performance_score DECIMAL(5,2),
    total_coverage_hours INTEGER DEFAULT 0,
    successful_coverages INTEGER DEFAULT 0,

    -- Cálculo automático
    is_auto_calculated BOOLEAN DEFAULT false,
    last_calculation_date DATE,
    calculation_data JSONB,

    -- Estado y notas
    is_active BOOLEAN DEFAULT true,
    manual_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Restricción de unicidad
    CONSTRAINT unique_task_compatibility_pair UNIQUE (primary_user_id, cover_user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_task_compat_company ON task_compatibility(company_id);
CREATE INDEX IF NOT EXISTS idx_task_compat_primary ON task_compatibility(primary_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_task_compat_cover ON task_compatibility(cover_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_task_compat_score ON task_compatibility(compatibility_score, is_active);

COMMENT ON TABLE task_compatibility IS 'Matriz de compatibilidad para cobertura de tareas durante ausencias';
COMMENT ON COLUMN task_compatibility.compatibility_score IS 'Puntuación de compatibilidad (0-100)';
COMMENT ON COLUMN task_compatibility.coverable_tasks IS 'Array JSON de tareas que puede cubrir con nivel de competencia';

-- ============================================================================
-- DATOS INICIALES: Escalas de vacaciones LCT Argentina
-- ============================================================================
INSERT INTO vacation_scales (company_id, years_from, years_to, range_description, vacation_days, priority, is_active)
SELECT
    c.company_id,
    scales.years_from,
    scales.years_to,
    scales.range_description,
    scales.vacation_days,
    scales.priority,
    true
FROM companies c
CROSS JOIN (
    VALUES
        (0.00, 5.00, 'Hasta 5 años de antigüedad', 14, 1),
        (5.00, 10.00, 'De 5 a 10 años de antigüedad', 21, 2),
        (10.00, 20.00, 'De 10 a 20 años de antigüedad', 28, 3),
        (20.00, NULL::DECIMAL, 'Más de 20 años de antigüedad', 35, 4)
) AS scales(years_from, years_to, range_description, vacation_days, priority)
WHERE c.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DATOS INICIALES: Licencias extraordinarias LCT Argentina (Art. 158)
-- ============================================================================
INSERT INTO extraordinary_licenses (company_id, type, description, days, day_type, requires_approval, requires_documentation, legal_basis, is_active)
SELECT
    c.company_id,
    licenses.type,
    licenses.description,
    licenses.days,
    licenses.day_type,
    licenses.requires_approval,
    licenses.requires_documentation,
    licenses.legal_basis,
    true
FROM companies c
CROSS JOIN (
    VALUES
        ('Matrimonio', 'Licencia por matrimonio del trabajador', 10, 'corrido', true, true, 'Art. 158 inc. a) LCT'),
        ('Nacimiento', 'Licencia por nacimiento de hijo', 2, 'corrido', false, true, 'Art. 158 inc. b) LCT'),
        ('Fallecimiento cónyuge/hijos', 'Licencia por fallecimiento de cónyuge o hijos', 3, 'corrido', false, true, 'Art. 158 inc. c) LCT'),
        ('Fallecimiento padres/hermanos', 'Licencia por fallecimiento de padres o hermanos', 1, 'habil', false, true, 'Art. 158 inc. c) LCT'),
        ('Examen', 'Licencia por examen universitario', 2, 'habil', true, true, 'Art. 158 inc. d) LCT'),
        ('Mudanza', 'Licencia por mudanza', 1, 'habil', true, false, 'Convenio colectivo'),
        ('Donación de sangre', 'Licencia por donación de sangre', 1, 'habil', false, true, 'Ley 22.990'),
        ('Trámites personales', 'Licencia para trámites personales', 1, 'habil', true, false, 'Política empresa')
) AS licenses(type, description, days, day_type, requires_approval, requires_documentation, legal_basis)
WHERE c.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DATOS INICIALES: Configuración por defecto para cada empresa
-- ============================================================================
INSERT INTO vacation_configurations (company_id, vacation_interruptible, min_continuous_days, max_fractions, auto_scheduling_enabled, min_advance_notice_days, max_simultaneous_percentage, is_active)
SELECT
    c.company_id,
    true,   -- vacation_interruptible
    7,      -- min_continuous_days (LCT Argentina)
    3,      -- max_fractions
    true,   -- auto_scheduling_enabled
    15,     -- min_advance_notice_days
    30,     -- max_simultaneous_percentage
    true    -- is_active
FROM companies c
WHERE c.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCIÓN: Calcular días de vacaciones según antigüedad
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_vacation_days(
    p_company_id INTEGER,
    p_hire_date DATE
) RETURNS INTEGER AS $$
DECLARE
    v_years DECIMAL(4,2);
    v_days INTEGER;
BEGIN
    -- Calcular años de antigüedad
    v_years := EXTRACT(YEAR FROM age(CURRENT_DATE, p_hire_date)) +
               (EXTRACT(MONTH FROM age(CURRENT_DATE, p_hire_date)) / 12.0);

    -- Buscar escala correspondiente
    SELECT vacation_days INTO v_days
    FROM vacation_scales
    WHERE company_id = p_company_id
      AND is_active = true
      AND years_from <= v_years
      AND (years_to IS NULL OR years_to > v_years)
    ORDER BY priority DESC
    LIMIT 1;

    RETURN COALESCE(v_days, 14); -- Default: 14 días
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_vacation_days IS 'Calcula días de vacaciones según antigüedad del empleado';

-- ============================================================================
-- FUNCIÓN: Verificar conflictos de vacaciones
-- ============================================================================
CREATE OR REPLACE FUNCTION check_vacation_conflicts(
    p_company_id INTEGER,
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_request_id INTEGER DEFAULT NULL
) RETURNS TABLE (
    conflict_id INTEGER,
    conflict_user_id UUID,
    conflict_start DATE,
    conflict_end DATE,
    overlap_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vr.id,
        vr.user_id,
        vr.start_date,
        vr.end_date,
        (LEAST(vr.end_date, p_end_date) - GREATEST(vr.start_date, p_start_date) + 1)::INTEGER
    FROM vacation_requests vr
    WHERE vr.company_id = p_company_id
      AND vr.status IN ('pending', 'approved', 'active')
      AND vr.start_date <= p_end_date
      AND vr.end_date >= p_start_date
      AND (p_exclude_request_id IS NULL OR vr.id != p_exclude_request_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_vacation_conflicts IS 'Verifica conflictos de fechas con otras solicitudes de vacaciones';

-- ============================================================================
-- FUNCIÓN: Obtener balance de vacaciones de un empleado
-- ============================================================================
CREATE OR REPLACE FUNCTION get_vacation_balance(
    p_company_id INTEGER,
    p_user_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
) RETURNS TABLE (
    total_days INTEGER,
    used_days INTEGER,
    pending_days INTEGER,
    available_days INTEGER
) AS $$
DECLARE
    v_hire_date DATE;
    v_total INTEGER;
    v_used INTEGER;
    v_pending INTEGER;
BEGIN
    -- Obtener fecha de ingreso
    SELECT hire_date INTO v_hire_date
    FROM users
    WHERE user_id = p_user_id AND company_id = p_company_id;

    -- Calcular días totales según antigüedad
    v_total := calculate_vacation_days(p_company_id, v_hire_date);

    -- Días usados (aprobados y completados)
    SELECT COALESCE(SUM(total_days), 0) INTO v_used
    FROM vacation_requests
    WHERE company_id = p_company_id
      AND user_id = p_user_id
      AND request_type = 'vacation'
      AND status IN ('approved', 'active', 'completed')
      AND EXTRACT(YEAR FROM start_date) = p_year;

    -- Días pendientes de aprobación
    SELECT COALESCE(SUM(total_days), 0) INTO v_pending
    FROM vacation_requests
    WHERE company_id = p_company_id
      AND user_id = p_user_id
      AND request_type = 'vacation'
      AND status = 'pending'
      AND EXTRACT(YEAR FROM start_date) = p_year;

    RETURN QUERY SELECT v_total, v_used, v_pending, (v_total - v_used - v_pending);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_vacation_balance IS 'Obtiene el balance de días de vacaciones de un empleado';

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_vacation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas
DROP TRIGGER IF EXISTS update_vacation_configurations_timestamp ON vacation_configurations;
CREATE TRIGGER update_vacation_configurations_timestamp
    BEFORE UPDATE ON vacation_configurations
    FOR EACH ROW EXECUTE FUNCTION update_vacation_timestamp();

DROP TRIGGER IF EXISTS update_vacation_scales_timestamp ON vacation_scales;
CREATE TRIGGER update_vacation_scales_timestamp
    BEFORE UPDATE ON vacation_scales
    FOR EACH ROW EXECUTE FUNCTION update_vacation_timestamp();

DROP TRIGGER IF EXISTS update_extraordinary_licenses_timestamp ON extraordinary_licenses;
CREATE TRIGGER update_extraordinary_licenses_timestamp
    BEFORE UPDATE ON extraordinary_licenses
    FOR EACH ROW EXECUTE FUNCTION update_vacation_timestamp();

DROP TRIGGER IF EXISTS update_vacation_requests_timestamp ON vacation_requests;
CREATE TRIGGER update_vacation_requests_timestamp
    BEFORE UPDATE ON vacation_requests
    FOR EACH ROW EXECUTE FUNCTION update_vacation_timestamp();

DROP TRIGGER IF EXISTS update_task_compatibility_timestamp ON task_compatibility;
CREATE TRIGGER update_task_compatibility_timestamp
    BEFORE UPDATE ON task_compatibility
    FOR EACH ROW EXECUTE FUNCTION update_vacation_timestamp();

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
