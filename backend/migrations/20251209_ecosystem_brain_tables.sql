-- ============================================================================
-- ECOSYSTEM BRAIN - Tablas para Cerebro del Ecosistema
-- ============================================================================
-- Fecha: 2025-12-09
-- Descripción: Sistema de auto-conocimiento con datos VIVOS
-- ============================================================================

-- 1. FASES DEL ECOSYSTEM (Roadmap phases)
CREATE TABLE IF NOT EXISTS ecosystem_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_key VARCHAR(100) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'complete', 'blocked')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    start_date DATE,
    target_date DATE,
    completion_date DATE,
    depends_on TEXT[] DEFAULT '{}',
    assigned_to VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. TAREAS DEL ECOSYSTEM (CPM tasks)
CREATE TABLE IF NOT EXISTS ecosystem_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_code VARCHAR(50) UNIQUE NOT NULL,
    phase_id UUID REFERENCES ecosystem_phases(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'obsolete')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),

    -- Auto-detección
    auto_detected BOOLEAN DEFAULT FALSE,
    detection_method VARCHAR(100),
    detection_rule JSONB,
    last_detection_check TIMESTAMP,

    -- Relaciones
    assigned_module VARCHAR(100),
    depends_on TEXT[] DEFAULT '{}',
    blocks TEXT[] DEFAULT '{}',

    -- Asignación
    assigned_to VARCHAR(100),
    assigned_type VARCHAR(20) CHECK (assigned_type IN ('human', 'claude', 'auto')),

    -- Timestamps
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    verified_by_test VARCHAR(100),

    -- Metadata
    estimated_hours DECIMAL(5,1),
    actual_hours DECIMAL(5,1),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. WORKFLOWS (Flujos de trabajo vivos)
CREATE TABLE IF NOT EXISTS ecosystem_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_key VARCHAR(100) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    module_key VARCHAR(100),

    -- Definición del workflow
    trigger_type VARCHAR(50),
    trigger_config JSONB,
    steps JSONB NOT NULL DEFAULT '[]',

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_auto_generated BOOLEAN DEFAULT FALSE,
    source_file VARCHAR(500),
    source_line INTEGER,

    -- Métricas
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP,
    avg_duration_ms INTEGER,

    -- Para tutoriales
    tutorial_enabled BOOLEAN DEFAULT FALSE,
    tutorial_content JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. APLICACIONES DEL ECOSISTEMA
CREATE TABLE IF NOT EXISTS ecosystem_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_key VARCHAR(100) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    app_type VARCHAR(50) CHECK (app_type IN ('web', 'mobile', 'api', 'desktop')),
    platform VARCHAR(100),
    description TEXT,

    -- Estado
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'production', 'deprecated')),
    progress INTEGER DEFAULT 0,
    version VARCHAR(20),

    -- URLs/Paths
    url VARCHAR(500),
    entry_file VARCHAR(500),

    -- Relaciones
    depends_on_modules TEXT[] DEFAULT '{}',

    -- Metadata
    users TEXT[] DEFAULT '{}',
    tech_stack JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. CACHÉ DE ESCANEO DE ARCHIVOS (para performance)
CREATE TABLE IF NOT EXISTS ecosystem_file_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path VARCHAR(1000) UNIQUE NOT NULL,
    file_type VARCHAR(50),
    file_category VARCHAR(50),

    -- Contenido parseado
    exports JSONB DEFAULT '{}',
    imports JSONB DEFAULT '{}',
    functions JSONB DEFAULT '{}',
    classes JSONB DEFAULT '{}',
    endpoints JSONB DEFAULT '{}',

    -- Metadata
    file_size INTEGER,
    line_count INTEGER,
    last_modified TIMESTAMP,
    checksum VARCHAR(64),

    -- Para invalidación de cache
    scanned_at TIMESTAMP DEFAULT NOW(),
    is_valid BOOLEAN DEFAULT TRUE
);

-- 6. HANDLERS DE ACCIONES DEL ASISTENTE
CREATE TABLE IF NOT EXISTS assistant_action_handlers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_pattern TEXT NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    handler_service VARCHAR(100) NOT NULL,
    handler_method VARCHAR(100) NOT NULL,
    required_params JSONB DEFAULT '[]',
    required_role TEXT[] DEFAULT '{}',
    description TEXT,
    examples JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_ecosystem_tasks_phase ON ecosystem_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_tasks_status ON ecosystem_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ecosystem_tasks_module ON ecosystem_tasks(assigned_module);
CREATE INDEX IF NOT EXISTS idx_ecosystem_workflows_module ON ecosystem_workflows(module_key);
CREATE INDEX IF NOT EXISTS idx_ecosystem_file_cache_type ON ecosystem_file_cache(file_type, file_category);
CREATE INDEX IF NOT EXISTS idx_ecosystem_file_cache_valid ON ecosystem_file_cache(is_valid);

-- TRIGGERS para updated_at
CREATE OR REPLACE FUNCTION update_ecosystem_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ecosystem_phases_updated ON ecosystem_phases;
CREATE TRIGGER trg_ecosystem_phases_updated
    BEFORE UPDATE ON ecosystem_phases
    FOR EACH ROW EXECUTE FUNCTION update_ecosystem_timestamp();

DROP TRIGGER IF EXISTS trg_ecosystem_tasks_updated ON ecosystem_tasks;
CREATE TRIGGER trg_ecosystem_tasks_updated
    BEFORE UPDATE ON ecosystem_tasks
    FOR EACH ROW EXECUTE FUNCTION update_ecosystem_timestamp();

DROP TRIGGER IF EXISTS trg_ecosystem_workflows_updated ON ecosystem_workflows;
CREATE TRIGGER trg_ecosystem_workflows_updated
    BEFORE UPDATE ON ecosystem_workflows
    FOR EACH ROW EXECUTE FUNCTION update_ecosystem_timestamp();

-- FUNCIÓN: Calcular progreso de fase automáticamente
CREATE OR REPLACE FUNCTION calculate_phase_progress(p_phase_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total, v_completed
    FROM ecosystem_tasks
    WHERE phase_id = p_phase_id;

    IF v_total = 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND((v_completed::DECIMAL / v_total) * 100);
END;
$$ LANGUAGE plpgsql;

-- FUNCIÓN: Obtener camino crítico (CPM)
CREATE OR REPLACE FUNCTION get_critical_path()
RETURNS TABLE (
    task_code VARCHAR(50),
    name TEXT,
    status VARCHAR(20),
    depends_on TEXT[],
    blocks TEXT[],
    is_critical BOOLEAN,
    earliest_start DATE,
    latest_start DATE,
    slack_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE task_chain AS (
        -- Tareas sin dependencias (inicio)
        SELECT
            t.task_code,
            t.name,
            t.status,
            t.depends_on,
            ARRAY(SELECT task_code FROM ecosystem_tasks WHERE t.task_code = ANY(depends_on)) as blocks,
            0 as depth,
            CURRENT_DATE as calc_start
        FROM ecosystem_tasks t
        WHERE cardinality(t.depends_on) = 0 AND t.status != 'completed'

        UNION ALL

        -- Tareas dependientes
        SELECT
            t.task_code,
            t.name,
            t.status,
            t.depends_on,
            ARRAY(SELECT task_code FROM ecosystem_tasks WHERE t.task_code = ANY(depends_on)),
            tc.depth + 1,
            tc.calc_start + INTERVAL '1 day' * COALESCE(t.estimated_hours / 8, 1)
        FROM ecosystem_tasks t
        JOIN task_chain tc ON tc.task_code = ANY(t.depends_on)
        WHERE t.status != 'completed'
    )
    SELECT DISTINCT
        tc.task_code,
        tc.name,
        tc.status,
        tc.depends_on,
        tc.blocks,
        (cardinality(tc.blocks) > 0) as is_critical,
        tc.calc_start::DATE as earliest_start,
        (tc.calc_start + INTERVAL '7 days')::DATE as latest_start,
        7 as slack_days
    FROM task_chain tc
    ORDER BY tc.task_code;
END;
$$ LANGUAGE plpgsql;

-- DATOS INICIALES: Handlers de acciones comunes
INSERT INTO assistant_action_handlers (action_pattern, action_type, handler_service, handler_method, required_params, required_role, description, examples) VALUES
('(crear|agregar|dar de alta).*(usuario|empleado)', 'create_user', 'UserService', 'createUser', '["firstName", "lastName", "dni"]', '{"admin", "rrhh"}', 'Crear nuevo usuario/empleado', '[{"input": "crea un usuario Juan Perez DNI 12345678", "params": {"firstName": "Juan", "lastName": "Perez", "dni": "12345678"}}]'),
('(reporte|informe).*(asistencia)', 'attendance_report', 'ReportService', 'generateAttendanceReport', '["dateFrom", "dateTo"]', '{"admin", "rrhh", "supervisor"}', 'Generar reporte de asistencias', '[{"input": "dame el reporte de asistencia de esta semana", "params": {"dateFrom": "2025-12-02", "dateTo": "2025-12-09"}}]'),
('(listar|mostrar|ver).*(usuarios|empleados)', 'list_users', 'UserService', 'listUsers', '[]', '{"admin", "rrhh", "supervisor"}', 'Listar usuarios del sistema', '[{"input": "mostrame todos los empleados", "params": {}}]'),
('(estado|health|salud).*(sistema|modulo)', 'system_health', 'EcosystemBrainService', 'getSystemHealth', '[]', '{"admin"}', 'Verificar estado del sistema', '[{"input": "como esta el sistema?", "params": {}}]')
ON CONFLICT (action_type) DO NOTHING;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
