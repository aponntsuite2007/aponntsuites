-- ============================================================================
-- MIGRACIÓN: Crear tabla training_progress
-- Fecha: 2026-01-21
-- Descripción: Tabla para rastrear el progreso de usuarios en capacitaciones
-- ============================================================================

-- 1. Crear tabla training_progress
CREATE TABLE IF NOT EXISTS training_progress (
    id SERIAL PRIMARY KEY,
    training_id INTEGER NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Progreso
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),

    -- Tiempos
    last_activity_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Evaluación
    score INTEGER CHECK (score >= 0 AND score <= 100),
    attempts INTEGER DEFAULT 0,
    passed BOOLEAN DEFAULT FALSE,

    -- Estado
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),

    -- Metadata
    time_spent_minutes INTEGER DEFAULT 0,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: Un usuario tiene un solo registro de progreso por training
    UNIQUE(training_id, user_id)
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_training_progress_training_id ON training_progress(training_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_user_id ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_company_id ON training_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_status ON training_progress(status);
CREATE INDEX IF NOT EXISTS idx_training_progress_completed_at ON training_progress(completed_at);

-- 3. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_training_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_training_progress_updated_at ON training_progress;
CREATE TRIGGER trigger_training_progress_updated_at
    BEFORE UPDATE ON training_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_training_progress_updated_at();

-- 4. Verificar que training_assignments existe (necesaria para el módulo)
CREATE TABLE IF NOT EXISTS training_assignments (
    id SERIAL PRIMARY KEY,
    training_id INTEGER NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Asignación
    assigned_by UUID REFERENCES users(user_id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,

    -- Estado
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'expired', 'cancelled')),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    notes TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique: Un usuario solo puede estar asignado una vez a un training
    UNIQUE(training_id, user_id)
);

-- 5. Índices para training_assignments
CREATE INDEX IF NOT EXISTS idx_training_assignments_training_id ON training_assignments(training_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_user_id ON training_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_company_id ON training_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_due_date ON training_assignments(due_date);

-- 6. Trigger para actualizar updated_at en assignments
DROP TRIGGER IF EXISTS trigger_training_assignments_updated_at ON training_assignments;
CREATE TRIGGER trigger_training_assignments_updated_at
    BEFORE UPDATE ON training_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_training_progress_updated_at();

-- 7. Vista de resumen de progreso por training
CREATE OR REPLACE VIEW v_training_progress_summary AS
SELECT
    t.id AS training_id,
    t.company_id,
    t.title AS training_title,
    t.mandatory,
    COUNT(DISTINCT ta.user_id) AS total_assigned,
    COUNT(DISTINCT CASE WHEN tp.status = 'completed' THEN tp.user_id END) AS total_completed,
    COUNT(DISTINCT CASE WHEN tp.status = 'in_progress' THEN tp.user_id END) AS total_in_progress,
    ROUND(
        CASE
            WHEN COUNT(DISTINCT ta.user_id) > 0
            THEN (COUNT(DISTINCT CASE WHEN tp.status = 'completed' THEN tp.user_id END)::DECIMAL / COUNT(DISTINCT ta.user_id) * 100)
            ELSE 0
        END, 2
    ) AS completion_rate,
    AVG(tp.score) FILTER (WHERE tp.score IS NOT NULL) AS avg_score,
    AVG(tp.time_spent_minutes) FILTER (WHERE tp.time_spent_minutes > 0) AS avg_time_spent
FROM trainings t
LEFT JOIN training_assignments ta ON t.id = ta.training_id
LEFT JOIN training_progress tp ON t.id = tp.training_id AND ta.user_id = tp.user_id
GROUP BY t.id, t.company_id, t.title, t.mandatory;

-- 8. Comentarios
COMMENT ON TABLE training_progress IS 'Registro de progreso de usuarios en capacitaciones';
COMMENT ON COLUMN training_progress.progress_percent IS 'Porcentaje de avance 0-100';
COMMENT ON COLUMN training_progress.score IS 'Puntaje obtenido en evaluación';
COMMENT ON COLUMN training_progress.passed IS 'TRUE si aprobó la capacitación';
COMMENT ON COLUMN training_progress.time_spent_minutes IS 'Tiempo total dedicado en minutos';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
