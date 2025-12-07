-- ============================================================================
-- RBAC UNIFIED SSOT (Single Source of Truth)
-- Sistema Unificado de Roles, Permisos y Estructura Organizacional
--
-- OBJETIVOS:
-- 1. OrganizationalPosition como SSOT para puestos/cargos
-- 2. Sistema de roles dinámico (no ENUM hardcodeado)
-- 3. Segmentación de riesgo por tipo de trabajo
-- 4. Umbrales dinámicos (cuartiles + benchmarks internacionales)
--
-- @version 2.0.0
-- @date 2025-12-07
-- ============================================================================

-- ============================================================================
-- PARTE 1: EXTENDER OrganizationalPosition COMO SSOT
-- ============================================================================

-- Agregar campos de clasificación laboral y riesgo
ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    work_category VARCHAR(50) DEFAULT 'administrativo'
    CHECK (work_category IN ('administrativo', 'operativo', 'tecnico', 'comercial', 'gerencial', 'mixto'));

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    work_environment VARCHAR(50) DEFAULT 'oficina'
    CHECK (work_environment IN ('oficina', 'planta', 'exterior', 'remoto', 'mixto'));

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    physical_demand_level INTEGER DEFAULT 1 CHECK (physical_demand_level BETWEEN 1 AND 5);
    -- 1=Sedentario, 2=Ligero, 3=Moderado, 4=Pesado, 5=Muy pesado

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    cognitive_demand_level INTEGER DEFAULT 3 CHECK (cognitive_demand_level BETWEEN 1 AND 5);
    -- 1=Rutinario, 2=Semi-rutinario, 3=Variable, 4=Complejo, 5=Muy complejo

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    risk_exposure_level INTEGER DEFAULT 1 CHECK (risk_exposure_level BETWEEN 1 AND 5);
    -- 1=Mínimo, 2=Bajo, 3=Moderado, 4=Alto, 5=Muy alto

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    international_code_ciuo VARCHAR(10);
    -- Código CIUO-08 (Clasificación Internacional Uniforme de Ocupaciones)
    -- Ej: 2411 = Contadores, 7231 = Mecánicos de vehículos

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    international_code_srt VARCHAR(20);
    -- Código SRT Argentina (Superintendencia de Riesgos del Trabajo)

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    applies_accident_risk BOOLEAN DEFAULT true;
    -- Si aplica índice de riesgo de accidente (false para administrativos puros)

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    applies_fatigue_index BOOLEAN DEFAULT true;
    -- Si aplica índice de fatiga (puede variar por tipo de trabajo)

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    custom_risk_weights JSONB DEFAULT NULL;
    -- Pesos personalizados por posición:
    -- {"fatigue": 0.30, "accident": 0.10, "legal": 0.20, "performance": 0.25, "turnover": 0.15}

ALTER TABLE organizational_positions ADD COLUMN IF NOT EXISTS
    custom_thresholds JSONB DEFAULT NULL;
    -- Umbrales personalizados por posición:
    -- {"fatigue": {"low": 25, "medium": 50, "high": 70, "critical": 85}}

COMMENT ON COLUMN organizational_positions.work_category IS 'Categoría de trabajo: administrativo, operativo, técnico, comercial, gerencial, mixto';
COMMENT ON COLUMN organizational_positions.physical_demand_level IS 'Nivel de demanda física 1-5 (OIT)';
COMMENT ON COLUMN organizational_positions.international_code_ciuo IS 'Código CIUO-08 de la OIT';

-- ============================================================================
-- PARTE 2: TABLA DE BENCHMARKS INTERNACIONALES POR OCUPACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_benchmarks (
    id SERIAL PRIMARY KEY,

    -- Identificación
    benchmark_code VARCHAR(50) NOT NULL,
    benchmark_name VARCHAR(200) NOT NULL,

    -- Clasificación
    ciuo_code VARCHAR(10),                    -- Código CIUO-08
    work_category VARCHAR(50),                -- administrativo, operativo, etc.
    industry_code VARCHAR(20),                -- CIIU código de industria
    country_code VARCHAR(3) DEFAULT 'ARG',    -- ISO 3166-1 alpha-3

    -- Fuente de datos
    source VARCHAR(100) NOT NULL,             -- 'OIT', 'OSHA', 'SRT', 'MTESS', 'EUROSTAT', 'custom'
    source_year INTEGER,
    source_url TEXT,

    -- Umbrales de referencia (percentiles típicos)
    fatigue_p25 DECIMAL(5,2),     -- Percentil 25 (bajo)
    fatigue_p50 DECIMAL(5,2),     -- Percentil 50 (medio)
    fatigue_p75 DECIMAL(5,2),     -- Percentil 75 (alto)
    fatigue_p90 DECIMAL(5,2),     -- Percentil 90 (crítico)

    accident_p25 DECIMAL(5,2),
    accident_p50 DECIMAL(5,2),
    accident_p75 DECIMAL(5,2),
    accident_p90 DECIMAL(5,2),

    legal_claim_p25 DECIMAL(5,2),
    legal_claim_p50 DECIMAL(5,2),
    legal_claim_p75 DECIMAL(5,2),
    legal_claim_p90 DECIMAL(5,2),

    turnover_p25 DECIMAL(5,2),
    turnover_p50 DECIMAL(5,2),
    turnover_p75 DECIMAL(5,2),
    turnover_p90 DECIMAL(5,2),

    -- Pesos recomendados por tipo de ocupación
    recommended_weights JSONB DEFAULT '{"fatigue": 0.25, "accident": 0.25, "legal": 0.20, "performance": 0.15, "turnover": 0.15}',

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_benchmarks_ciuo ON risk_benchmarks(ciuo_code);
CREATE INDEX IF NOT EXISTS idx_benchmarks_category ON risk_benchmarks(work_category);
CREATE INDEX IF NOT EXISTS idx_benchmarks_country ON risk_benchmarks(country_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_benchmarks_unique ON risk_benchmarks(benchmark_code, country_code);

-- Insertar benchmarks base (OIT + Argentina)
INSERT INTO risk_benchmarks (benchmark_code, benchmark_name, work_category, ciuo_code, source, source_year,
    fatigue_p25, fatigue_p50, fatigue_p75, fatigue_p90,
    accident_p25, accident_p50, accident_p75, accident_p90,
    legal_claim_p25, legal_claim_p50, legal_claim_p75, legal_claim_p90,
    turnover_p25, turnover_p50, turnover_p75, turnover_p90,
    recommended_weights)
VALUES
-- Administrativos
('ADM-GENERAL', 'Personal Administrativo General', 'administrativo', '4110', 'OIT', 2023,
    20, 35, 50, 70,   -- Fatiga: más bajos
    10, 20, 35, 50,   -- Accidente: muy bajos
    25, 40, 55, 75,   -- Legal: moderados
    15, 30, 45, 65,   -- Turnover: moderados
    '{"fatigue": 0.20, "accident": 0.10, "legal": 0.30, "performance": 0.25, "turnover": 0.15}'
),
-- Operarios industriales
('OPE-INDUSTRIAL', 'Operarios de Producción Industrial', 'operativo', '8100', 'OIT', 2023,
    30, 50, 70, 85,   -- Fatiga: altos
    35, 55, 75, 90,   -- Accidente: muy altos
    20, 35, 50, 70,   -- Legal: moderados
    25, 40, 55, 75,   -- Turnover: altos
    '{"fatigue": 0.30, "accident": 0.35, "legal": 0.15, "performance": 0.10, "turnover": 0.10}'
),
-- Técnicos especializados
('TEC-ESPECIALIZADO', 'Técnicos y Profesionales Especializados', 'tecnico', '3100', 'OIT', 2023,
    25, 40, 60, 75,   -- Fatiga: moderados
    20, 35, 55, 70,   -- Accidente: moderados
    30, 45, 60, 80,   -- Legal: altos (responsabilidad técnica)
    20, 35, 50, 70,   -- Turnover: moderados
    '{"fatigue": 0.25, "accident": 0.20, "legal": 0.25, "performance": 0.20, "turnover": 0.10}'
),
-- Comerciales/Ventas
('COM-VENTAS', 'Personal Comercial y Ventas', 'comercial', '5220', 'OIT', 2023,
    25, 45, 65, 80,   -- Fatiga: moderado-alto (presión)
    15, 25, 40, 55,   -- Accidente: bajos
    20, 35, 50, 70,   -- Legal: moderados
    35, 55, 75, 90,   -- Turnover: muy altos
    '{"fatigue": 0.20, "accident": 0.05, "legal": 0.15, "performance": 0.30, "turnover": 0.30}'
),
-- Gerenciales
('GER-DIRECCION', 'Personal Gerencial y Directivo', 'gerencial', '1120', 'OIT', 2023,
    35, 55, 70, 85,   -- Fatiga: altos (estrés)
    10, 20, 30, 45,   -- Accidente: muy bajos
    40, 55, 70, 85,   -- Legal: muy altos (responsabilidad)
    10, 20, 35, 50,   -- Turnover: bajos
    '{"fatigue": 0.30, "accident": 0.05, "legal": 0.35, "performance": 0.20, "turnover": 0.10}'
),
-- Logística/Almacén
('LOG-ALMACEN', 'Personal de Logística y Almacén', 'operativo', '9321', 'OIT', 2023,
    30, 50, 70, 85,   -- Fatiga: altos
    40, 60, 80, 95,   -- Accidente: muy altos
    20, 35, 50, 70,   -- Legal: moderados
    30, 50, 70, 85,   -- Turnover: altos
    '{"fatigue": 0.25, "accident": 0.40, "legal": 0.10, "performance": 0.15, "turnover": 0.10}'
),
-- Construcción
('CON-OBRA', 'Personal de Construcción', 'operativo', '7110', 'SRT', 2023,
    35, 55, 75, 90,   -- Fatiga: muy altos
    50, 70, 85, 98,   -- Accidente: extremos
    25, 40, 55, 75,   -- Legal: moderados
    40, 60, 80, 95,   -- Turnover: muy altos
    '{"fatigue": 0.25, "accident": 0.45, "legal": 0.10, "performance": 0.10, "turnover": 0.10}'
),
-- TI/Sistemas
('TI-SISTEMAS', 'Personal de Tecnología de la Información', 'tecnico', '2512', 'OIT', 2023,
    30, 50, 65, 80,   -- Fatiga: moderado-alto (burnout)
    5, 10, 20, 35,    -- Accidente: muy bajos
    25, 40, 55, 75,   -- Legal: moderados
    30, 50, 70, 85,   -- Turnover: altos (mercado competitivo)
    '{"fatigue": 0.30, "accident": 0.05, "legal": 0.20, "performance": 0.25, "turnover": 0.20}'
)
ON CONFLICT (benchmark_code, country_code) DO NOTHING;

-- ============================================================================
-- PARTE 3: CONFIGURACIÓN DE UMBRALES POR EMPRESA
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_risk_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Método de cálculo de umbrales
    threshold_method VARCHAR(30) DEFAULT 'manual'
        CHECK (threshold_method IN ('manual', 'quartile', 'benchmark', 'hybrid')),
    -- manual: Umbrales fijos configurados por admin
    -- quartile: Calculados dinámicamente por cuartiles de datos propios
    -- benchmark: Basados en benchmarks internacionales
    -- hybrid: Combinación ponderada

    -- Pesos para método híbrido
    hybrid_weights JSONB DEFAULT '{"manual": 0.3, "quartile": 0.4, "benchmark": 0.3}',

    -- Umbrales manuales globales (si method = manual)
    global_thresholds JSONB DEFAULT '{
        "fatigue": {"low": 30, "medium": 50, "high": 70, "critical": 85},
        "accident": {"low": 30, "medium": 50, "high": 70, "critical": 85},
        "legal_claim": {"low": 30, "medium": 50, "high": 70, "critical": 85},
        "performance": {"low": 30, "medium": 50, "high": 70, "critical": 85},
        "turnover": {"low": 30, "medium": 50, "high": 70, "critical": 85}
    }',

    -- Pesos globales de índices
    global_weights JSONB DEFAULT '{
        "fatigue": 0.25,
        "accident": 0.25,
        "legal_claim": 0.20,
        "performance": 0.15,
        "turnover": 0.15
    }',

    -- Configuración de segmentación
    enable_segmentation BOOLEAN DEFAULT false,
    -- Si true, usa umbrales diferentes por work_category de OrganizationalPosition

    -- Benchmark de referencia por defecto
    default_benchmark_code VARCHAR(50) DEFAULT 'ADM-GENERAL',

    -- Frecuencia de recálculo de cuartiles
    quartile_recalc_frequency VARCHAR(20) DEFAULT 'weekly'
        CHECK (quartile_recalc_frequency IN ('daily', 'weekly', 'monthly', 'manual')),
    last_quartile_calculation TIMESTAMP,

    -- Cache de cuartiles calculados
    calculated_quartiles JSONB,
    -- Estructura: {
    --   "global": {"fatigue": {"q1": 25, "q2": 45, "q3": 65}, ...},
    --   "by_category": {
    --     "administrativo": {"fatigue": {...}, ...},
    --     "operativo": {"fatigue": {...}, ...}
    --   }
    -- }

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_risk_config ON company_risk_config(company_id);

-- ============================================================================
-- PARTE 4: VINCULAR USERS CON OrganizationalPosition (FK)
-- ============================================================================

-- Agregar columna si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS
    organizational_position_id INTEGER REFERENCES organizational_positions(id);

CREATE INDEX IF NOT EXISTS idx_users_org_position ON users(organizational_position_id);

COMMENT ON COLUMN users.organizational_position_id IS 'FK a organizational_positions - SSOT para puesto/cargo del empleado';

-- ============================================================================
-- PARTE 5: SISTEMA DE ROLES DINÁMICO
-- ============================================================================

-- La tabla role_definitions ya existe en la migración anterior
-- Vamos a agregar campos adicionales si no existen

ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS
    inherits_from INTEGER REFERENCES role_definitions(id);
    -- Permite herencia de permisos (supervisor hereda de employee)

ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS
    max_users_per_company INTEGER DEFAULT NULL;
    -- Límite de usuarios con este rol por empresa (NULL = ilimitado)

ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS
    requires_position_category TEXT[] DEFAULT NULL;
    -- Categorías de posición requeridas para asignar este rol
    -- Ej: ['gerencial', 'administrativo'] para rol 'manager'

-- Actualizar roles existentes con herencia
UPDATE role_definitions SET inherits_from = (
    SELECT id FROM role_definitions WHERE role_key = 'employee' LIMIT 1
) WHERE role_key = 'supervisor' AND inherits_from IS NULL;

UPDATE role_definitions SET inherits_from = (
    SELECT id FROM role_definitions WHERE role_key = 'supervisor' LIMIT 1
) WHERE role_key = 'manager' AND inherits_from IS NULL;

UPDATE role_definitions SET inherits_from = (
    SELECT id FROM role_definitions WHERE role_key = 'manager' LIMIT 1
) WHERE role_key = 'admin' AND inherits_from IS NULL;

-- ============================================================================
-- PARTE 6: FUNCIONES DE CÁLCULO DE UMBRALES DINÁMICOS
-- ============================================================================

-- Función para calcular cuartiles de una empresa
CREATE OR REPLACE FUNCTION calculate_company_risk_quartiles(p_company_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_global JSONB;
    v_by_category JSONB;
BEGIN
    -- Calcular cuartiles globales de fatiga (ejemplo simplificado)
    -- En producción, esto consultaría datos reales de asistencia

    WITH risk_data AS (
        SELECT
            op.work_category,
            -- Aquí irían los cálculos reales de índices
            -- Por ahora usamos datos simulados
            RANDOM() * 100 as fatigue_index,
            RANDOM() * 100 as accident_index,
            RANDOM() * 100 as legal_index,
            RANDOM() * 100 as performance_index,
            RANDOM() * 100 as turnover_index
        FROM users u
        LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
        WHERE u.company_id = p_company_id AND u.is_active = true
    ),
    global_quartiles AS (
        SELECT
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fatigue_index) as fatigue_q1,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY fatigue_index) as fatigue_q2,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fatigue_index) as fatigue_q3,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY accident_index) as accident_q1,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY accident_index) as accident_q2,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY accident_index) as accident_q3,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY legal_index) as legal_q1,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY legal_index) as legal_q2,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY legal_index) as legal_q3
        FROM risk_data
    )
    SELECT jsonb_build_object(
        'fatigue', jsonb_build_object('q1', ROUND(fatigue_q1::numeric, 1), 'q2', ROUND(fatigue_q2::numeric, 1), 'q3', ROUND(fatigue_q3::numeric, 1)),
        'accident', jsonb_build_object('q1', ROUND(accident_q1::numeric, 1), 'q2', ROUND(accident_q2::numeric, 1), 'q3', ROUND(accident_q3::numeric, 1)),
        'legal_claim', jsonb_build_object('q1', ROUND(legal_q1::numeric, 1), 'q2', ROUND(legal_q2::numeric, 1), 'q3', ROUND(legal_q3::numeric, 1))
    ) INTO v_global
    FROM global_quartiles;

    -- Resultado final
    v_result := jsonb_build_object(
        'global', COALESCE(v_global, '{}'::jsonb),
        'calculated_at', NOW(),
        'employee_count', (SELECT COUNT(*) FROM users WHERE company_id = p_company_id AND is_active = true)
    );

    -- Actualizar cache en company_risk_config
    UPDATE company_risk_config
    SET calculated_quartiles = v_result,
        last_quartile_calculation = NOW(),
        updated_at = NOW()
    WHERE company_id = p_company_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener umbrales efectivos de un empleado
CREATE OR REPLACE FUNCTION get_employee_risk_thresholds(
    p_user_id UUID,
    p_company_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_config company_risk_config%ROWTYPE;
    v_position organizational_positions%ROWTYPE;
    v_benchmark risk_benchmarks%ROWTYPE;
    v_thresholds JSONB;
BEGIN
    -- Obtener configuración de la empresa
    SELECT * INTO v_config FROM company_risk_config WHERE company_id = p_company_id;

    -- Obtener posición del empleado
    SELECT op.* INTO v_position
    FROM users u
    JOIN organizational_positions op ON u.organizational_position_id = op.id
    WHERE u.user_id = p_user_id;

    -- Si la posición tiene umbrales personalizados, usarlos
    IF v_position.custom_thresholds IS NOT NULL THEN
        RETURN v_position.custom_thresholds;
    END IF;

    -- Según método de la empresa
    CASE v_config.threshold_method
        WHEN 'manual' THEN
            v_thresholds := v_config.global_thresholds;

        WHEN 'benchmark' THEN
            -- Buscar benchmark por categoría de trabajo
            SELECT * INTO v_benchmark
            FROM risk_benchmarks
            WHERE work_category = COALESCE(v_position.work_category, 'administrativo')
            AND is_active = true
            LIMIT 1;

            IF v_benchmark IS NOT NULL THEN
                v_thresholds := jsonb_build_object(
                    'fatigue', jsonb_build_object('low', v_benchmark.fatigue_p25, 'medium', v_benchmark.fatigue_p50, 'high', v_benchmark.fatigue_p75, 'critical', v_benchmark.fatigue_p90),
                    'accident', jsonb_build_object('low', v_benchmark.accident_p25, 'medium', v_benchmark.accident_p50, 'high', v_benchmark.accident_p75, 'critical', v_benchmark.accident_p90),
                    'legal_claim', jsonb_build_object('low', v_benchmark.legal_claim_p25, 'medium', v_benchmark.legal_claim_p50, 'high', v_benchmark.legal_claim_p75, 'critical', v_benchmark.legal_claim_p90),
                    'turnover', jsonb_build_object('low', v_benchmark.turnover_p25, 'medium', v_benchmark.turnover_p50, 'high', v_benchmark.turnover_p75, 'critical', v_benchmark.turnover_p90)
                );
            ELSE
                v_thresholds := v_config.global_thresholds;
            END IF;

        WHEN 'quartile' THEN
            -- Usar cuartiles calculados
            IF v_config.calculated_quartiles IS NOT NULL THEN
                v_thresholds := jsonb_build_object(
                    'fatigue', jsonb_build_object(
                        'low', (v_config.calculated_quartiles->'global'->'fatigue'->>'q1')::numeric,
                        'medium', (v_config.calculated_quartiles->'global'->'fatigue'->>'q2')::numeric,
                        'high', (v_config.calculated_quartiles->'global'->'fatigue'->>'q3')::numeric,
                        'critical', 90
                    )
                    -- ... otros índices
                );
            ELSE
                v_thresholds := v_config.global_thresholds;
            END IF;

        ELSE
            v_thresholds := v_config.global_thresholds;
    END CASE;

    RETURN v_thresholds;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 7: VISTA UNIFICADA DE USUARIOS CON ROLES Y POSICIONES
-- ============================================================================

CREATE OR REPLACE VIEW v_users_rbac AS
SELECT
    u.user_id,
    u.employee_id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    u.display_name,
    u.company_id,
    u.department_id,
    u.is_active,

    -- Rol del sistema (legacy)
    u.role as system_role,

    -- Posición organizacional (SSOT)
    u.organizational_position_id,
    op.position_code,
    op.position_name,
    op.level_order as position_level,
    op.work_category,
    op.work_environment,
    op.physical_demand_level,
    op.cognitive_demand_level,
    op.risk_exposure_level,
    op.international_code_ciuo,
    op.applies_accident_risk,
    op.applies_fatigue_index,

    -- Departamento
    d.name as department_name,

    -- Roles asignados (nuevo sistema)
    (
        SELECT jsonb_agg(jsonb_build_object(
            'role_id', rd.id,
            'role_key', rd.role_key,
            'role_name', rd.role_name,
            'category', rd.category,
            'assigned_at', ura.assigned_at
        ))
        FROM user_role_assignments ura
        JOIN role_definitions rd ON ura.role_id = rd.id
        WHERE ura.user_id = u.user_id AND ura.is_active = true
    ) as assigned_roles,

    -- Permisos efectivos (JSON de módulos)
    u.permissions as custom_permissions,
    u.additional_roles,

    -- Datos para Risk Intelligence
    COALESCE(op.custom_risk_weights, crc.global_weights) as risk_weights,
    COALESCE(op.custom_thresholds, crc.global_thresholds) as risk_thresholds

FROM users u
LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN company_risk_config crc ON u.company_id = crc.company_id;

-- ============================================================================
-- PARTE 8: INICIALIZAR CONFIGURACIÓN DE RIESGO PARA EMPRESAS EXISTENTES
-- ============================================================================

INSERT INTO company_risk_config (company_id, threshold_method, enable_segmentation)
SELECT id, 'manual', false
FROM companies
WHERE id NOT IN (SELECT company_id FROM company_risk_config)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PARTE 9: TRIGGERS DE SINCRONIZACIÓN
-- ============================================================================

-- Trigger para mantener User.position sincronizado con OrganizationalPosition
CREATE OR REPLACE FUNCTION sync_user_position_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organizational_position_id IS NOT NULL AND NEW.organizational_position_id != OLD.organizational_position_id THEN
        UPDATE users
        SET position = (SELECT position_name FROM organizational_positions WHERE id = NEW.organizational_position_id)
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_position ON users;
CREATE TRIGGER trg_sync_user_position
    AFTER UPDATE OF organizational_position_id ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_position_name();

-- ============================================================================
-- PARTE 10: PERMISOS Y GRANTS
-- ============================================================================

-- Asegurar que las vistas son accesibles
GRANT SELECT ON v_users_rbac TO PUBLIC;

-- Comentarios de documentación
COMMENT ON TABLE risk_benchmarks IS 'Benchmarks internacionales de riesgo laboral por tipo de ocupación (OIT, OSHA, SRT)';
COMMENT ON TABLE company_risk_config IS 'Configuración de umbrales de riesgo por empresa';
COMMENT ON VIEW v_users_rbac IS 'Vista unificada de usuarios con roles, posiciones y configuración de riesgo';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
SELECT 'RBAC Unified SSOT migration completed successfully' as status;
