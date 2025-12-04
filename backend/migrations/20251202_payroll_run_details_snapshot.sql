-- ============================================================================
-- MIGRACIÓN: Agregar campos de snapshot a payroll_run_details
-- Fecha: 2025-12-02
-- Descripción: Almacenar datos del empleado al momento de la liquidación
--              para preservar histórico aun si el cargo/template se elimina
-- ============================================================================

-- 1. Agregar columna JSONB para snapshot completo del empleado
DO $$
BEGIN
    -- employee_snapshot: Datos del empleado congelados al momento de liquidar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_run_details'
        AND column_name = 'employee_snapshot'
    ) THEN
        ALTER TABLE payroll_run_details
        ADD COLUMN employee_snapshot JSONB DEFAULT '{}';

        COMMENT ON COLUMN payroll_run_details.employee_snapshot IS
        'Snapshot del empleado al momento de liquidación. Estructura:
        {
            "employee_code": "EMP-001",
            "full_name": "Juan Pérez",
            "document_number": "12345678",
            "position": {
                "id": 1,
                "code": "GERENTE",
                "name": "Gerente General"
            },
            "department": {
                "id": 5,
                "name": "Administración"
            },
            "branch": {
                "id": 2,
                "name": "Sucursal Centro"
            },
            "template": {
                "id": 10,
                "code": "TPL-001",
                "name": "Plantilla Mensual"
            },
            "category": {
                "id": 3,
                "name": "Categoría A",
                "level": 1
            },
            "base_salary": 150000.00,
            "hire_date": "2020-01-15",
            "seniority_years": 4
        }';
    END IF;

    -- payslip_template_snapshot: Datos del template de recibo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_run_details'
        AND column_name = 'payslip_template_snapshot'
    ) THEN
        ALTER TABLE payroll_run_details
        ADD COLUMN payslip_template_snapshot JSONB DEFAULT '{}';

        COMMENT ON COLUMN payroll_run_details.payslip_template_snapshot IS
        'Snapshot del template de recibo usado. Incluye layout y bloques.';
    END IF;
END $$;

-- 2. Índice GIN para búsquedas dentro del snapshot
CREATE INDEX IF NOT EXISTS idx_payroll_run_details_snapshot_gin
ON payroll_run_details USING GIN (employee_snapshot);

-- 3. Función para crear el snapshot del empleado
CREATE OR REPLACE FUNCTION create_employee_liquidation_snapshot(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_snapshot JSONB;
    v_user RECORD;
    v_position RECORD;
    v_department RECORD;
    v_branch RECORD;
    v_assignment RECORD;
    v_template RECORD;
    v_category RECORD;
    v_payslip_template RECORD;
BEGIN
    -- Obtener datos del usuario
    SELECT
        u.user_id,
        u.employee_id AS employee_code,
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        u.document_number,
        u.organizational_position_id,
        u.department_id,
        u.branch_id,
        u.hire_date
    INTO v_user
    FROM users u
    WHERE u.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN '{}'::JSONB;
    END IF;

    -- Obtener posición/cargo
    IF v_user.organizational_position_id IS NOT NULL THEN
        SELECT
            op.id,
            op.position_code AS code,
            op.position_name AS name,
            op.payslip_template_id,
            op.payroll_template_id
        INTO v_position
        FROM organizational_positions op
        WHERE op.id = v_user.organizational_position_id;
    END IF;

    -- Obtener departamento
    IF v_user.department_id IS NOT NULL THEN
        SELECT
            d.id,
            d.department_name AS name
        INTO v_department
        FROM departments d
        WHERE d.id = v_user.department_id;
    END IF;

    -- Obtener sucursal
    IF v_user.branch_id IS NOT NULL THEN
        SELECT
            b.id,
            b.branch_name AS name
        INTO v_branch
        FROM company_branches b
        WHERE b.id = v_user.branch_id;
    END IF;

    -- Obtener asignación de payroll activa
    SELECT
        upa.id,
        upa.template_id,
        upa.category_id,
        upa.base_salary,
        upa.hourly_rate
    INTO v_assignment
    FROM user_payroll_assignment upa
    WHERE upa.user_id = p_user_id
    AND upa.is_current = true
    AND (upa.effective_to IS NULL OR upa.effective_to >= CURRENT_DATE)
    ORDER BY upa.effective_from DESC
    LIMIT 1;

    -- Obtener template de liquidación
    IF v_assignment.template_id IS NOT NULL THEN
        SELECT
            pt.id,
            pt.template_code AS code,
            pt.template_name AS name
        INTO v_template
        FROM payroll_templates pt
        WHERE pt.id = v_assignment.template_id;
    END IF;

    -- Obtener categoría salarial
    IF v_assignment.category_id IS NOT NULL THEN
        SELECT
            sc.id,
            sc.category_name AS name,
            sc.level_number AS level
        INTO v_category
        FROM salary_categories_v2 sc
        WHERE sc.id = v_assignment.category_id;
    END IF;

    -- Construir snapshot
    v_snapshot := jsonb_build_object(
        'employee_code', v_user.employee_code,
        'full_name', v_user.full_name,
        'document_number', v_user.document_number,
        'position', CASE WHEN v_position.id IS NOT NULL THEN
            jsonb_build_object(
                'id', v_position.id,
                'code', v_position.code,
                'name', v_position.name
            )
        ELSE NULL END,
        'department', CASE WHEN v_department.id IS NOT NULL THEN
            jsonb_build_object(
                'id', v_department.id,
                'name', v_department.name
            )
        ELSE NULL END,
        'branch', CASE WHEN v_branch.id IS NOT NULL THEN
            jsonb_build_object(
                'id', v_branch.id,
                'name', v_branch.name
            )
        ELSE NULL END,
        'template', CASE WHEN v_template.id IS NOT NULL THEN
            jsonb_build_object(
                'id', v_template.id,
                'code', v_template.code,
                'name', v_template.name
            )
        ELSE NULL END,
        'category', CASE WHEN v_category.id IS NOT NULL THEN
            jsonb_build_object(
                'id', v_category.id,
                'name', v_category.name,
                'level', v_category.level
            )
        ELSE NULL END,
        'base_salary', v_assignment.base_salary,
        'hourly_rate', v_assignment.hourly_rate,
        'hire_date', v_user.hire_date,
        'seniority_years', EXTRACT(YEAR FROM age(CURRENT_DATE, v_user.hire_date))::INTEGER,
        'snapshot_date', CURRENT_TIMESTAMP
    );

    RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para crear snapshot del template de recibo
CREATE OR REPLACE FUNCTION create_payslip_template_snapshot(p_template_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_template RECORD;
BEGIN
    IF p_template_id IS NULL THEN
        RETURN '{}'::JSONB;
    END IF;

    SELECT
        ppt.id,
        ppt.template_code,
        ppt.template_name,
        ppt.description,
        ppt.layout_config,
        ppt.header_config,
        ppt.footer_config,
        ppt.paper_size,
        ppt.orientation
    INTO v_template
    FROM payroll_payslip_templates ppt
    WHERE ppt.id = p_template_id;

    IF NOT FOUND THEN
        RETURN '{}'::JSONB;
    END IF;

    RETURN jsonb_build_object(
        'id', v_template.id,
        'code', v_template.template_code,
        'name', v_template.template_name,
        'description', v_template.description,
        'layout_config', v_template.layout_config,
        'header_config', v_template.header_config,
        'footer_config', v_template.footer_config,
        'paper_size', v_template.paper_size,
        'orientation', v_template.orientation,
        'snapshot_date', CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Vista para consultar histórico con datos del snapshot
CREATE OR REPLACE VIEW vw_payroll_historical_details AS
SELECT
    prd.id,
    prd.run_id,
    prd.user_id,
    pr.run_code,
    pr.period_year,
    pr.period_month,
    pr.period_start,
    pr.period_end,
    pr.payment_date,

    -- Datos del snapshot (inmutables)
    prd.employee_snapshot->>'employee_code' AS employee_code,
    prd.employee_snapshot->>'full_name' AS employee_name,
    prd.employee_snapshot->>'document_number' AS document_number,
    prd.employee_snapshot->'position'->>'name' AS position_name,
    prd.employee_snapshot->'position'->>'code' AS position_code,
    prd.employee_snapshot->'department'->>'name' AS department_name,
    prd.employee_snapshot->'branch'->>'name' AS branch_name,
    prd.employee_snapshot->'template'->>'name' AS template_name,
    prd.employee_snapshot->'category'->>'name' AS category_name,
    (prd.employee_snapshot->>'base_salary')::DECIMAL AS base_salary_at_time,
    (prd.employee_snapshot->>'seniority_years')::INTEGER AS seniority_at_time,

    -- Totales
    prd.gross_earnings,
    prd.total_deductions,
    prd.net_salary,
    prd.employer_contributions,

    -- Estado
    prd.status,
    prd.receipt_number,
    prd.receipt_generated_at,

    prd.created_at AS liquidation_date
FROM payroll_run_details prd
JOIN payroll_runs pr ON prd.run_id = pr.id
ORDER BY pr.period_year DESC, pr.period_month DESC;

-- 6. Comentarios
COMMENT ON VIEW vw_payroll_historical_details IS
'Vista de histórico de liquidaciones con datos snapshot.
Los datos del empleado/cargo/template se preservan aunque se modifiquen o eliminen posteriormente.';

-- 7. Log de migración (crear tabla si no existe)
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(200) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO migration_log (migration_name, executed_at, description)
SELECT 'payroll_run_details_snapshot', CURRENT_TIMESTAMP,
       'Agregados campos de snapshot para preservar histórico de liquidaciones'
WHERE NOT EXISTS (
    SELECT 1 FROM migration_log WHERE migration_name = 'payroll_run_details_snapshot'
);

-- ============================================================================
-- NOTA IMPORTANTE PARA DESARROLLO:
-- ============================================================================
-- Al crear una nueva liquidación (INSERT en payroll_run_details),
-- se debe llamar a estas funciones para poblar los snapshots:
--
-- INSERT INTO payroll_run_details (
--     run_id, user_id, assignment_id,
--     employee_snapshot, payslip_template_snapshot,
--     ...otros campos...
-- ) VALUES (
--     :run_id,
--     :user_id,
--     :assignment_id,
--     create_employee_liquidation_snapshot(:user_id),
--     create_payslip_template_snapshot(:payslip_template_id),
--     ...
-- );
-- ============================================================================
