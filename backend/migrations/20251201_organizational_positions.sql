-- ============================================================================
-- ORGANIZATIONAL POSITIONS - Posiciones/Cargos con Template de Recibo
-- Sistema: Employee -> Position -> Payslip Template
-- Similar a SAP Pay Scale Grouping
-- ============================================================================

-- Tabla de posiciones organizacionales
CREATE TABLE IF NOT EXISTS organizational_positions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Identificación
    position_code VARCHAR(30) NOT NULL,
    position_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Jerarquía
    parent_position_id INTEGER REFERENCES organizational_positions(id),
    level_order INTEGER DEFAULT 1, -- 1=operativo, 2=supervisor, 3=gerente, etc.

    -- Categoría salarial (opcional, para convenios)
    salary_category_id INTEGER REFERENCES salary_categories_v2(id),

    -- Template de recibo asignado
    payslip_template_id INTEGER REFERENCES payroll_payslip_templates(id),

    -- Configuración de liquidación
    payroll_template_id INTEGER REFERENCES payroll_templates(id), -- Template de conceptos

    -- Departamento asociado (opcional)
    department_id INTEGER,

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(company_id, position_code)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_org_positions_company ON organizational_positions(company_id);
CREATE INDEX IF NOT EXISTS idx_org_positions_template ON organizational_positions(payslip_template_id);
CREATE INDEX IF NOT EXISTS idx_org_positions_parent ON organizational_positions(parent_position_id);
CREATE INDEX IF NOT EXISTS idx_org_positions_active ON organizational_positions(company_id, is_active);

-- Agregar columna position_id a users si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'organizational_position_id'
    ) THEN
        ALTER TABLE users ADD COLUMN organizational_position_id INTEGER REFERENCES organizational_positions(id);
        CREATE INDEX idx_users_org_position ON users(organizational_position_id);
    END IF;
END $$;

-- Comentarios
COMMENT ON TABLE organizational_positions IS 'Posiciones/cargos organizacionales con template de recibo asignado';
COMMENT ON COLUMN organizational_positions.position_code IS 'Código único del cargo dentro de la empresa';
COMMENT ON COLUMN organizational_positions.payslip_template_id IS 'Template de recibo de sueldo para este cargo';
COMMENT ON COLUMN organizational_positions.payroll_template_id IS 'Template de conceptos de liquidación para este cargo';
COMMENT ON COLUMN organizational_positions.level_order IS 'Nivel jerárquico: 1=operativo, 2=supervisor, 3=gerente, etc.';

-- Función para obtener el template de recibo de un empleado
CREATE OR REPLACE FUNCTION get_employee_payslip_template(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_template_id INTEGER;
BEGIN
    -- Buscar template por posición del empleado
    SELECT op.payslip_template_id INTO v_template_id
    FROM users u
    JOIN organizational_positions op ON u.organizational_position_id = op.id
    WHERE u.user_id = p_user_id AND op.is_active = true;

    -- Si no tiene posición o la posición no tiene template, usar el default de la empresa
    IF v_template_id IS NULL THEN
        SELECT ppt.id INTO v_template_id
        FROM users u
        JOIN payroll_payslip_templates ppt ON ppt.company_id = u.company_id
        WHERE u.user_id = p_user_id AND ppt.is_default = true AND ppt.is_active = true
        LIMIT 1;
    END IF;

    -- Si aún no hay template, usar el default global del país
    IF v_template_id IS NULL THEN
        SELECT ppt.id INTO v_template_id
        FROM payroll_payslip_templates ppt
        WHERE ppt.company_id IS NULL AND ppt.is_default = true AND ppt.is_active = true
        LIMIT 1;
    END IF;

    RETURN v_template_id;
END;
$$ LANGUAGE plpgsql;

-- Insertar posiciones de ejemplo para empresa 11
INSERT INTO organizational_positions (company_id, position_code, position_name, description, level_order, payslip_template_id)
SELECT
    11,
    code,
    name,
    description,
    level_order,
    (SELECT id FROM payroll_payslip_templates WHERE template_code = 'ARG_STANDARD' LIMIT 1)
FROM (VALUES
    ('DIR', 'Director General', 'Máxima autoridad de la empresa', 5),
    ('GER', 'Gerente', 'Responsable de área', 4),
    ('JEF', 'Jefe de Sector', 'Supervisor de equipo', 3),
    ('ANA-SR', 'Analista Senior', 'Profesional con experiencia', 2),
    ('ANA-JR', 'Analista Junior', 'Profesional en formación', 2),
    ('OPE', 'Operador', 'Personal operativo', 1),
    ('ADM', 'Administrativo', 'Personal administrativo', 1),
    ('PAS', 'Pasante', 'Personal en formación', 1)
) AS positions(code, name, description, level_order)
WHERE NOT EXISTS (SELECT 1 FROM organizational_positions WHERE company_id = 11 AND position_code = code);

-- Vista para listar posiciones con su template
CREATE OR REPLACE VIEW vw_positions_with_templates AS
SELECT
    op.*,
    ppt.template_name,
    ppt.template_code,
    c.name as company_name,
    parent.position_name as parent_position_name
FROM organizational_positions op
LEFT JOIN payroll_payslip_templates ppt ON op.payslip_template_id = ppt.id
LEFT JOIN companies c ON op.company_id = c.company_id
LEFT JOIN organizational_positions parent ON op.parent_position_id = parent.id;

-- Log de migración
INSERT INTO migration_log (migration_name, executed_at, description)
SELECT 'organizational_positions', CURRENT_TIMESTAMP, 'Tabla de posiciones organizacionales con vinculación a templates de recibo'
WHERE NOT EXISTS (SELECT 1 FROM migration_log WHERE migration_name = 'organizational_positions');
