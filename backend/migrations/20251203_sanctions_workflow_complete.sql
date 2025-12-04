-- ═══════════════════════════════════════════════════════════════════════════════
-- SANCTIONS WORKFLOW COMPLETE - Sistema de Gestión de Sanciones Enterprise v2.0
-- Migración: 20251203_sanctions_workflow_complete.sql
-- Fecha: 2025-12-03
-- Descripción: Workflow multi-etapa, tipos parametrizables, historial de auditoría,
--              bloqueo de fichaje por suspensión
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABLA DE TIPOS DE SANCIÓN (Catálogo parametrizable)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sanction_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'other', -- attendance, training, behavior, performance, safety, other
    default_severity VARCHAR(50) DEFAULT 'warning', -- warning, minor, major, severe, termination
    default_points_deducted INTEGER DEFAULT 0,
    requires_legal_review BOOLEAN DEFAULT true,
    suspension_days_default INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false, -- true = tipo global del sistema, false = personalizado
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, code)
);

COMMENT ON TABLE sanction_types IS 'Catálogo de tipos de sanción parametrizables por empresa';
COMMENT ON COLUMN sanction_types.company_id IS 'NULL = tipo global disponible para todas las empresas';
COMMENT ON COLUMN sanction_types.is_system IS 'true = no puede ser modificado ni eliminado';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. AGREGAR COLUMNAS DE WORKFLOW A TABLA SANCTIONS EXISTENTE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Workflow status
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'draft';
COMMENT ON COLUMN sanctions.workflow_status IS 'draft, pending_lawyer, pending_hr, active, rejected, appealed, closed';

-- Tipo de sanción (referencia al catálogo)
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS sanction_type_id INTEGER REFERENCES sanction_types(id);

-- Solicitante (quien origina la sanción)
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES users(user_id);
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS requester_role VARCHAR(50);

-- Descripción original (para preservar si abogado modifica)
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS original_description TEXT;

-- Revisión legal
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS lawyer_id UUID REFERENCES users(user_id);
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS lawyer_review_date TIMESTAMP;
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS lawyer_notes TEXT;
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS lawyer_modified_description TEXT;

-- Confirmación RRHH
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS hr_confirmation_id UUID REFERENCES users(user_id);
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS hr_confirmation_date TIMESTAMP;
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS hr_notes TEXT;

-- Método de entrega
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50) DEFAULT 'system';
COMMENT ON COLUMN sanctions.delivery_method IS 'system, email, carta_documento, presencial';

-- Suspensión
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS suspension_start_date DATE;
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS suspension_days INTEGER DEFAULT 0;
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS suspension_end_date DATE;

-- Rechazo
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(user_id);
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

-- Apelación
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS appeal_status VARCHAR(50);
COMMENT ON COLUMN sanctions.appeal_status IS 'pending, approved, denied';
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS appeal_resolved_by UUID REFERENCES users(user_id);
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS appeal_resolved_at TIMESTAMP;
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS appeal_resolution_notes TEXT;

-- Puntos deducidos (para sistema de scoring)
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS points_deducted INTEGER DEFAULT 0;

-- Metadata adicional (JSON para flexibilidad)
ALTER TABLE sanctions ADD COLUMN IF NOT EXISTS workflow_metadata JSONB DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. TABLA DE HISTORIAL DE SANCIONES (Audit Log Inmutable)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sanction_history (
    id SERIAL PRIMARY KEY,
    sanction_id INTEGER REFERENCES sanctions(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES users(user_id),
    actor_name VARCHAR(255),
    actor_role VARCHAR(50),
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE sanction_history IS 'Historial inmutable de todas las acciones sobre sanciones';
COMMENT ON COLUMN sanction_history.action IS 'created, submitted, lawyer_approved, lawyer_rejected, lawyer_modified, hr_confirmed, activated, appealed, appeal_resolved, closed, etc.';

-- Índice para búsquedas rápidas por sanción
CREATE INDEX IF NOT EXISTS idx_sanction_history_sanction_id ON sanction_history(sanction_id);
CREATE INDEX IF NOT EXISTS idx_sanction_history_created_at ON sanction_history(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. TABLA DE BLOQUEOS DE SUSPENSIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS suspension_blocks (
    id SERIAL PRIMARY KEY,
    sanction_id INTEGER REFERENCES sanctions(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_work_days INTEGER NOT NULL,
    days_served INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    block_type VARCHAR(50) DEFAULT 'full', -- full, partial (para futuro)
    blocked_actions JSONB DEFAULT '["checkin", "checkout"]', -- qué acciones bloquea
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deactivated_at TIMESTAMP,
    deactivated_by UUID REFERENCES users(user_id)
);

COMMENT ON TABLE suspension_blocks IS 'Bloqueos activos de fichaje por suspensión disciplinaria';
COMMENT ON COLUMN suspension_blocks.total_work_days IS 'Días laborables de suspensión (excluye fines de semana según turno)';
COMMENT ON COLUMN suspension_blocks.days_served IS 'Días de suspensión ya cumplidos';

-- Índices para verificación rápida en fichaje
CREATE INDEX IF NOT EXISTS idx_suspension_blocks_active ON suspension_blocks(employee_id, is_active, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_suspension_blocks_company ON suspension_blocks(company_id, is_active);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. ÍNDICES ADICIONALES PARA SANCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_sanctions_workflow_status ON sanctions(workflow_status);
CREATE INDEX IF NOT EXISTS idx_sanctions_employee_company ON sanctions(employee_id, company_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_requester ON sanctions(requester_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_lawyer ON sanctions(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_pending_lawyer ON sanctions(company_id, workflow_status) WHERE workflow_status = 'pending_lawyer';
CREATE INDEX IF NOT EXISTS idx_sanctions_pending_hr ON sanctions(company_id, workflow_status) WHERE workflow_status = 'pending_hr';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. SEED DE TIPOS DE SANCIÓN POR DEFECTO (Globales)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO sanction_types (company_id, code, name, description, category, default_severity, default_points_deducted, requires_legal_review, suspension_days_default, is_system, sort_order)
VALUES
    -- Asistencia
    (NULL, 'LATE_REPEATED', 'Llegadas tarde reiteradas', 'Más de 3 llegadas tarde en un período de 30 días sin justificación.', 'attendance', 'warning', 5, false, 0, true, 1),
    (NULL, 'ABSENT_UNJUSTIFIED', 'Ausencia injustificada', 'Inasistencia sin aviso previo ni justificación válida.', 'attendance', 'minor', 10, true, 1, true, 2),
    (NULL, 'ABSENT_REPEATED', 'Ausencias reiteradas', 'Patrón de ausencias frecuentes que afectan la operación.', 'attendance', 'major', 20, true, 3, true, 3),
    (NULL, 'ABANDON_POST', 'Abandono de puesto', 'Dejar el puesto de trabajo sin autorización durante horario laboral.', 'attendance', 'major', 25, true, 5, true, 4),

    -- Comportamiento
    (NULL, 'BEHAVIOR_INAPPROPRIATE', 'Comportamiento inadecuado', 'Conducta inapropiada en el lugar de trabajo.', 'behavior', 'minor', 10, true, 0, true, 10),
    (NULL, 'INSUBORDINATION', 'Insubordinación', 'Negativa a cumplir órdenes directas de superiores.', 'behavior', 'major', 25, true, 3, true, 11),
    (NULL, 'HARASSMENT', 'Acoso laboral', 'Conducta de hostigamiento hacia compañeros de trabajo.', 'behavior', 'severe', 40, true, 10, true, 12),
    (NULL, 'CONFLICT_PHYSICAL', 'Altercado físico', 'Agresión física en el lugar de trabajo.', 'behavior', 'severe', 50, true, 15, true, 13),

    -- Desempeño
    (NULL, 'PERFORMANCE_LOW', 'Bajo desempeño sostenido', 'Rendimiento por debajo de los estándares mínimos de forma continuada.', 'performance', 'warning', 5, false, 0, true, 20),
    (NULL, 'NEGLIGENCE', 'Negligencia', 'Falta de cuidado o atención en las tareas asignadas.', 'performance', 'minor', 15, true, 0, true, 21),
    (NULL, 'DAMAGE_PROPERTY', 'Daño a propiedad', 'Daño intencional o por negligencia grave a equipos o instalaciones.', 'performance', 'major', 30, true, 5, true, 22),

    -- Seguridad
    (NULL, 'SAFETY_VIOLATION', 'Violación de normas de seguridad', 'Incumplimiento de protocolos de seguridad establecidos.', 'safety', 'major', 20, true, 3, true, 30),
    (NULL, 'SAFETY_SERIOUS', 'Violación grave de seguridad', 'Poner en riesgo la integridad física propia o de terceros.', 'safety', 'severe', 35, true, 10, true, 31),

    -- Capacitación
    (NULL, 'TRAINING_INCOMPLETE', 'Capacitación no completada', 'No completar capacitaciones obligatorias en el plazo establecido.', 'training', 'warning', 5, false, 0, true, 40),
    (NULL, 'CERTIFICATION_EXPIRED', 'Certificación vencida', 'Permitir que expire una certificación requerida para el puesto.', 'training', 'minor', 10, false, 0, true, 41),

    -- Otros
    (NULL, 'CONFIDENTIALITY_BREACH', 'Violación de confidencialidad', 'Divulgación no autorizada de información confidencial.', 'other', 'severe', 40, true, 10, true, 50),
    (NULL, 'POLICY_VIOLATION', 'Violación de políticas internas', 'Incumplimiento de políticas o reglamentos de la empresa.', 'other', 'minor', 10, true, 0, true, 51),
    (NULL, 'OTHER', 'Otro motivo', 'Motivo no listado (especificar en descripción).', 'other', 'warning', 0, true, 0, true, 99)
ON CONFLICT (company_id, code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. FUNCIONES HELPER
-- ═══════════════════════════════════════════════════════════════════════════════

-- Función para calcular fecha fin de suspensión basada en turno del empleado
-- Si no tiene turno, usa días laborables estándar (L-V)
CREATE OR REPLACE FUNCTION calculate_suspension_end_date(
    p_start_date DATE,
    p_work_days INTEGER,
    p_employee_id UUID DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
    v_current_date DATE := p_start_date;
    v_days_counted INTEGER := 0;
    v_shift_days JSONB;
    v_day_of_week INTEGER;
    v_day_name TEXT;
BEGIN
    IF p_work_days <= 0 THEN
        RETURN p_start_date;
    END IF;

    -- Obtener días laborables del turno asignado al empleado
    IF p_employee_id IS NOT NULL THEN
        SELECT s.days::jsonb INTO v_shift_days
        FROM user_shift_assignments usa
        JOIN shifts s ON s.id = usa.shift_id
        WHERE usa.user_id = p_employee_id
          AND usa.is_active = true
          AND (usa.end_date IS NULL OR usa.end_date >= CURRENT_DATE)
        ORDER BY usa.start_date DESC
        LIMIT 1;
    END IF;

    -- Si no hay turno asignado, asumir L-V como días laborables
    IF v_shift_days IS NULL THEN
        v_shift_days := '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}'::jsonb;
    END IF;

    WHILE v_days_counted < p_work_days LOOP
        v_current_date := v_current_date + INTERVAL '1 day';
        v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;

        -- Mapear día de semana a nombre (0=Sunday, 1=Monday, etc.)
        v_day_name := CASE v_day_of_week
            WHEN 0 THEN 'sunday'
            WHEN 1 THEN 'monday'
            WHEN 2 THEN 'tuesday'
            WHEN 3 THEN 'wednesday'
            WHEN 4 THEN 'thursday'
            WHEN 5 THEN 'friday'
            WHEN 6 THEN 'saturday'
        END;

        -- Verificar si es día laborable según el turno
        IF COALESCE((v_shift_days->v_day_name)::boolean, false) THEN
            v_days_counted := v_days_counted + 1;
        END IF;
    END LOOP;

    RETURN v_current_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_suspension_end_date IS 'Calcula fecha fin de suspensión contando solo días laborables según el turno del empleado';

-- Función para verificar si empleado está suspendido
CREATE OR REPLACE FUNCTION is_employee_suspended(
    p_employee_id UUID,
    p_company_id INTEGER,
    p_check_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    is_blocked BOOLEAN,
    block_id INTEGER,
    sanction_id INTEGER,
    start_date DATE,
    end_date DATE,
    days_remaining INTEGER,
    block_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        true AS is_blocked,
        sb.id AS block_id,
        sb.sanction_id,
        sb.start_date,
        sb.end_date,
        (sb.end_date - p_check_date)::INTEGER AS days_remaining,
        COALESCE(s.description, 'Suspensión disciplinaria') AS block_reason
    FROM suspension_blocks sb
    LEFT JOIN sanctions s ON s.id = sb.sanction_id
    WHERE sb.employee_id = p_employee_id
      AND sb.company_id = p_company_id
      AND sb.is_active = true
      AND p_check_date BETWEEN sb.start_date AND sb.end_date
    ORDER BY sb.end_date DESC
    LIMIT 1;

    -- Si no hay bloqueo, retornar registro vacío con is_blocked = false
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            false AS is_blocked,
            NULL::INTEGER AS block_id,
            NULL::INTEGER AS sanction_id,
            NULL::DATE AS start_date,
            NULL::DATE AS end_date,
            NULL::INTEGER AS days_remaining,
            NULL::TEXT AS block_reason;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_employee_suspended IS 'Verifica si un empleado tiene suspensión activa en una fecha dada';

-- Función para obtener historial disciplinario de empleado
CREATE OR REPLACE FUNCTION get_employee_disciplinary_history(
    p_employee_id UUID,
    p_company_id INTEGER
)
RETURNS TABLE(
    sanction_id INTEGER,
    sanction_type_name VARCHAR,
    severity VARCHAR,
    status VARCHAR,
    workflow_status VARCHAR,
    created_at TIMESTAMP,
    description TEXT,
    suspension_days INTEGER,
    points_deducted INTEGER,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS sanction_id,
        COALESCE(st.name, s.sanction_type)::VARCHAR AS sanction_type_name,
        s.severity::VARCHAR,
        s.status::VARCHAR,
        s.workflow_status::VARCHAR,
        s.created_at::TIMESTAMP,
        s.description::TEXT,
        COALESCE(s.suspension_days, 0)::INTEGER AS suspension_days,
        COALESCE(s.points_deducted, 0)::INTEGER AS points_deducted,
        CASE WHEN s.status = 'active' AND s.workflow_status = 'active' THEN true ELSE false END AS is_active
    FROM sanctions s
    LEFT JOIN sanction_types st ON st.id = s.sanction_type_id
    WHERE s.user_id = p_employee_id
      AND s.company_id = p_company_id
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_employee_disciplinary_history IS 'Obtiene historial disciplinario completo de un empleado';

-- Función para estadísticas de sanciones
CREATE OR REPLACE FUNCTION get_sanction_stats(
    p_company_id INTEGER,
    p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    total_sanctions BIGINT,
    pending_lawyer BIGINT,
    pending_hr BIGINT,
    active BIGINT,
    rejected BIGINT,
    appealed BIGINT,
    by_severity JSONB,
    by_category JSONB,
    total_suspension_days BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_sanctions,
        COUNT(*) FILTER (WHERE workflow_status = 'pending_lawyer')::BIGINT AS pending_lawyer,
        COUNT(*) FILTER (WHERE workflow_status = 'pending_hr')::BIGINT AS pending_hr,
        COUNT(*) FILTER (WHERE workflow_status = 'active')::BIGINT AS active,
        COUNT(*) FILTER (WHERE workflow_status = 'rejected')::BIGINT AS rejected,
        COUNT(*) FILTER (WHERE workflow_status = 'appealed')::BIGINT AS appealed,
        jsonb_build_object(
            'warning', COUNT(*) FILTER (WHERE severity = 'warning'),
            'minor', COUNT(*) FILTER (WHERE severity = 'minor'),
            'major', COUNT(*) FILTER (WHERE severity = 'major'),
            'severe', COUNT(*) FILTER (WHERE severity = 'severe'),
            'termination', COUNT(*) FILTER (WHERE severity = 'termination')
        ) AS by_severity,
        jsonb_build_object(
            'attendance', COUNT(*) FILTER (WHERE st.category = 'attendance'),
            'behavior', COUNT(*) FILTER (WHERE st.category = 'behavior'),
            'performance', COUNT(*) FILTER (WHERE st.category = 'performance'),
            'safety', COUNT(*) FILTER (WHERE st.category = 'safety'),
            'training', COUNT(*) FILTER (WHERE st.category = 'training'),
            'other', COUNT(*) FILTER (WHERE st.category = 'other' OR st.category IS NULL)
        ) AS by_category,
        COALESCE(SUM(COALESCE(s.suspension_days, 0)), 0)::BIGINT AS total_suspension_days
    FROM sanctions s
    LEFT JOIN sanction_types st ON st.id = s.sanction_type_id
    WHERE s.company_id = p_company_id
      AND s.created_at >= NOW() - (p_period_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_sanction_stats IS 'Estadísticas de sanciones por empresa en un período';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Trigger para actualizar updated_at en sanction_types
CREATE OR REPLACE FUNCTION update_sanction_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sanction_types_updated_at ON sanction_types;
CREATE TRIGGER trg_sanction_types_updated_at
    BEFORE UPDATE ON sanction_types
    FOR EACH ROW
    EXECUTE FUNCTION update_sanction_types_updated_at();

-- Trigger para actualizar updated_at en suspension_blocks
CREATE OR REPLACE FUNCTION update_suspension_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suspension_blocks_updated_at ON suspension_blocks;
CREATE TRIGGER trg_suspension_blocks_updated_at
    BEFORE UPDATE ON suspension_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_suspension_blocks_updated_at();

-- Trigger para crear bloqueo automático cuando se activa sanción con suspensión
CREATE OR REPLACE FUNCTION create_suspension_block_on_activate()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo crear bloqueo si:
    -- 1. El workflow_status cambió a 'active'
    -- 2. Hay días de suspensión > 0
    -- 3. Hay fecha de inicio de suspensión
    IF NEW.workflow_status = 'active'
       AND OLD.workflow_status != 'active'
       AND COALESCE(NEW.suspension_days, 0) > 0
       AND NEW.suspension_start_date IS NOT NULL THEN

        -- Calcular fecha fin basada en calendario del empleado
        NEW.suspension_end_date := calculate_suspension_end_date(
            NEW.suspension_start_date,
            NEW.suspension_days,
            NEW.user_id  -- Pasar el empleado para usar su calendario de turno
        );

        -- Crear bloqueo (usar user_id que es el UUID del empleado)
        INSERT INTO suspension_blocks (
            sanction_id,
            employee_id,
            company_id,
            start_date,
            end_date,
            total_work_days,
            is_active,
            notes
        ) VALUES (
            NEW.id,
            NEW.user_id,
            NEW.company_id,
            NEW.suspension_start_date,
            NEW.suspension_end_date,
            NEW.suspension_days,
            true,
            'Bloqueo automático por activación de sanción #' || NEW.id
        );

        RAISE NOTICE 'Bloqueo de suspensión creado para empleado % hasta %', NEW.user_id, NEW.suspension_end_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_suspension_block ON sanctions;
CREATE TRIGGER trg_create_suspension_block
    BEFORE UPDATE ON sanctions
    FOR EACH ROW
    EXECUTE FUNCTION create_suspension_block_on_activate();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. MIGRAR DATOS EXISTENTES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Actualizar sanciones existentes sin workflow_status
UPDATE sanctions
SET workflow_status = CASE
    WHEN status = 'active' THEN 'active'
    WHEN status = 'pending' THEN 'pending_hr'
    WHEN status = 'resolved' THEN 'closed'
    WHEN status = 'appealed' THEN 'appealed'
    ELSE 'draft'
END
WHERE workflow_status IS NULL OR workflow_status = '';

-- Copiar descripción original donde no existe
UPDATE sanctions
SET original_description = description
WHERE original_description IS NULL AND description IS NOT NULL;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_sanction_types_count INTEGER;
    v_sanctions_cols INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_sanction_types_count FROM sanction_types WHERE is_system = true;
    SELECT COUNT(*) INTO v_sanctions_cols FROM information_schema.columns WHERE table_name = 'sanctions';

    RAISE NOTICE '══════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA: sanctions_workflow_complete';
    RAISE NOTICE '══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Tipos de sanción sistema: %', v_sanction_types_count;
    RAISE NOTICE '✅ Columnas en tabla sanctions: %', v_sanctions_cols;
    RAISE NOTICE '✅ Tabla sanction_history: CREADA';
    RAISE NOTICE '✅ Tabla suspension_blocks: CREADA';
    RAISE NOTICE '✅ Funciones helper: 4 creadas';
    RAISE NOTICE '✅ Triggers: 3 creados';
    RAISE NOTICE '══════════════════════════════════════════════════════════════════';
END $$;
