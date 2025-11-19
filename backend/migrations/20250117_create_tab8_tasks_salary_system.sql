-- ============================================================================
-- MIGRACIÓN: TAB 8 - Config. Tareas y Configuración Salarial
-- Fecha: 2025-01-17
-- Descripción: Crea sistema completo para TAB 8 (tareas + salario)
-- ============================================================================

-- ============================================================================
-- TABLA 1: TAREAS DE LA EMPRESA (Company Tasks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_tasks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Información de la tarea
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    task_code VARCHAR(50), -- Código interno de tarea (ej: "TAREA-001")

    -- Categorización
    task_category VARCHAR(100), -- ej: "Administrativo", "Operativo", "Mantenimiento"
    task_type VARCHAR(100), -- ej: "Recurrente", "Proyecto", "Ad-hoc"

    -- Configuración
    estimated_hours DECIMAL(5,2), -- Horas estimadas para completar
    priority_default VARCHAR(50) CHECK (priority_default IN ('baja', 'media', 'alta', 'urgente')),

    -- Requiere aprobación
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_role VARCHAR(50), -- Rol que debe aprobar (ej: 'supervisor', 'manager')

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_template BOOLEAN DEFAULT FALSE, -- Si es una plantilla reutilizable

    -- Metadata
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_company_tasks_company ON company_tasks(company_id);
CREATE INDEX idx_company_tasks_category ON company_tasks(task_category);
CREATE INDEX idx_company_tasks_active ON company_tasks(is_active);
CREATE INDEX idx_company_tasks_template ON company_tasks(is_template);

-- Comentarios
COMMENT ON TABLE company_tasks IS 'Catálogo de tareas de la empresa (biblioteca de tareas disponibles)';
COMMENT ON COLUMN company_tasks.task_code IS 'Código interno único para identificar la tarea';
COMMENT ON COLUMN company_tasks.is_template IS 'Si es plantilla, se puede usar como modelo para crear nuevas tareas';

-- ============================================================================
-- TABLA 2: TAREAS ASIGNADAS A USUARIOS (User Assigned Tasks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_assigned_tasks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES company_tasks(id) ON DELETE CASCADE,

    -- Asignación
    assigned_by UUID REFERENCES users(user_id), -- Quién asignó la tarea
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE, -- Fecha límite

    -- Estado
    status VARCHAR(50) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada')),
    priority VARCHAR(50) CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),

    -- Progreso
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    start_date DATE, -- Cuándo se comenzó
    completion_date DATE, -- Cuándo se completó
    actual_hours DECIMAL(5,2), -- Horas reales dedicadas

    -- Aprobación (si la tarea lo requiere)
    requires_approval BOOLEAN DEFAULT FALSE,
    submitted_for_approval BOOLEAN DEFAULT FALSE,
    approval_date DATE,
    approved_by UUID REFERENCES users(user_id),
    approval_notes TEXT,

    -- Detalles
    notes TEXT, -- Notas del empleado
    attachments JSONB, -- Array de URLs de archivos adjuntos
    comments JSONB, -- Array de comentarios {user, date, text}

    -- Recordatorios
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_date DATE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_assigned_tasks_user ON user_assigned_tasks(user_id);
CREATE INDEX idx_assigned_tasks_company ON user_assigned_tasks(company_id);
CREATE INDEX idx_assigned_tasks_task ON user_assigned_tasks(task_id);
CREATE INDEX idx_assigned_tasks_status ON user_assigned_tasks(status);
CREATE INDEX idx_assigned_tasks_due_date ON user_assigned_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_assigned_tasks_assigned_by ON user_assigned_tasks(assigned_by);
CREATE INDEX idx_assigned_tasks_priority ON user_assigned_tasks(priority);

-- Comentarios
COMMENT ON TABLE user_assigned_tasks IS 'Tareas asignadas a empleados específicos';
COMMENT ON COLUMN user_assigned_tasks.progress_percentage IS 'Porcentaje de progreso (0-100)';
COMMENT ON COLUMN user_assigned_tasks.actual_hours IS 'Horas reales dedicadas a la tarea';
COMMENT ON COLUMN user_assigned_tasks.attachments IS 'JSON array de archivos adjuntos [{filename, url, uploadDate}]';
COMMENT ON COLUMN user_assigned_tasks.comments IS 'JSON array de comentarios [{userId, userName, date, text}]';

-- ============================================================================
-- TABLA 3: CONFIGURACIÓN SALARIAL (User Salary Config)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_salary_config (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Salario base
    base_salary DECIMAL(12,2) NOT NULL,
    salary_currency VARCHAR(10) DEFAULT 'ARS',
    salary_type VARCHAR(50) CHECK (salary_type IN ('mensual', 'jornal', 'por_hora', 'comision')),

    -- Frecuencia de pago
    payment_frequency VARCHAR(50) CHECK (payment_frequency IN ('mensual', 'quincenal', 'semanal', 'diario')),
    payment_day INTEGER, -- Día del mes o semana de pago (ej: 1, 15, 30)

    -- Datos bancarios
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_account_type VARCHAR(50) CHECK (bank_account_type IN ('caja_ahorro', 'cuenta_corriente')),
    cbu VARCHAR(22), -- 22 dígitos
    alias_cbu VARCHAR(100),
    swift_code VARCHAR(15), -- Para transferencias internacionales

    -- Método de pago
    payment_method VARCHAR(50) DEFAULT 'transferencia' CHECK (payment_method IN ('transferencia', 'cheque', 'efectivo', 'tarjeta')),
    payment_notes TEXT,

    -- Bonificaciones y adicionales
    bonuses JSONB, -- Array de bonos [{name, amount, frequency, description}]
    allowances JSONB, -- Asignaciones (viáticos, etc.) [{name, amount, frequency}]

    -- Descuentos
    deductions JSONB, -- Descuentos [{name, amount, type, description}]
    has_obra_social BOOLEAN DEFAULT TRUE,
    obra_social_deduction DECIMAL(10,2),
    has_sindicato BOOLEAN DEFAULT FALSE,
    sindicato_deduction DECIMAL(10,2),

    -- Retenciones fiscales
    tax_withholding_percentage DECIMAL(5,2), -- Porcentaje de retención
    has_tax_exemption BOOLEAN DEFAULT FALSE,
    tax_exemption_reason TEXT,

    -- Configuración de horas extra
    overtime_enabled BOOLEAN DEFAULT TRUE,
    overtime_rate_weekday DECIMAL(5,2) DEFAULT 1.50, -- 50% extra
    overtime_rate_weekend DECIMAL(5,2) DEFAULT 2.00, -- 100% extra
    overtime_rate_holiday DECIMAL(5,2) DEFAULT 2.00, -- 100% extra

    -- Vacaciones
    vacation_days_per_year INTEGER DEFAULT 14,
    vacation_days_used INTEGER DEFAULT 0,
    vacation_days_pending INTEGER DEFAULT 14,

    -- Aguinaldo (SAC - Sueldo Anual Complementario)
    sac_enabled BOOLEAN DEFAULT TRUE,
    sac_calculation_method VARCHAR(50) DEFAULT 'best_salary', -- 'average_salary' o 'best_salary'

    -- Cambios de salario
    last_salary_review_date DATE,
    next_salary_review_date DATE,
    salary_increase_percentage DECIMAL(5,2), -- Último aumento
    salary_increase_notes TEXT,

    -- Observaciones
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by UUID REFERENCES users(user_id),
    last_updated_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_salary_config_user ON user_salary_config(user_id);
CREATE INDEX idx_salary_config_company ON user_salary_config(company_id);
CREATE INDEX idx_salary_config_payment_frequency ON user_salary_config(payment_frequency);
CREATE INDEX idx_salary_config_next_review ON user_salary_config(next_salary_review_date) WHERE next_salary_review_date IS NOT NULL;

-- Comentarios
COMMENT ON TABLE user_salary_config IS 'Configuración salarial completa del empleado';
COMMENT ON COLUMN user_salary_config.base_salary IS 'Salario base (bruto)';
COMMENT ON COLUMN user_salary_config.salary_type IS 'Tipo de salario: mensual (fijo), jornal (diario), por_hora, comisión';
COMMENT ON COLUMN user_salary_config.cbu IS 'CBU de 22 dígitos para transferencias bancarias';
COMMENT ON COLUMN user_salary_config.bonuses IS 'JSON array de bonos [{name, amount, frequency, description}]';
COMMENT ON COLUMN user_salary_config.deductions IS 'JSON array de descuentos [{name, amount, type, description}]';
COMMENT ON COLUMN user_salary_config.overtime_rate_weekday IS 'Multiplicador para horas extra entre semana (ej: 1.50 = 50% más)';
COMMENT ON COLUMN user_salary_config.sac_enabled IS 'Si cobra aguinaldo (SAC - Sueldo Anual Complementario)';
COMMENT ON COLUMN user_salary_config.next_salary_review_date IS '🔔 Fecha de próxima revisión salarial';

-- ============================================================================
-- TRIGGERS PARA updated_at
-- ============================================================================

CREATE TRIGGER update_company_tasks_updated_at
BEFORE UPDATE ON company_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assigned_tasks_updated_at
BEFORE UPDATE ON user_assigned_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_config_updated_at
BEFORE UPDATE ON user_salary_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VISTA HELPER: RESUMEN DE TAREAS POR USUARIO
-- ============================================================================

CREATE OR REPLACE VIEW user_tasks_summary AS
SELECT
    u.user_id,
    u."firstName" || ' ' || u."lastName" AS full_name,
    u.company_id,
    COUNT(*) FILTER (WHERE uat.status = 'pendiente') AS tasks_pending,
    COUNT(*) FILTER (WHERE uat.status = 'en_progreso') AS tasks_in_progress,
    COUNT(*) FILTER (WHERE uat.status = 'completada') AS tasks_completed,
    COUNT(*) FILTER (WHERE uat.due_date < CURRENT_DATE AND uat.status NOT IN ('completada', 'cancelada')) AS tasks_overdue,
    COUNT(*) AS total_tasks
FROM users u
LEFT JOIN user_assigned_tasks uat ON u.user_id = uat.user_id
GROUP BY u.user_id, u."firstName", u."lastName", u.company_id;

COMMENT ON VIEW user_tasks_summary IS 'Resumen de tareas por usuario';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
