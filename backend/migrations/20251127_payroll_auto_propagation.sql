-- =====================================================
-- MIGRACIÓN: Sistema de Propagación Automática Payroll
-- Fecha: 2025-11-27
-- Descripción: TRIGGERs para propagación automática de cambios
--              en categorías salariales a configuración de usuarios
-- =====================================================

-- =====================================================
-- 1. FUNCIÓN: Propagar cambios de salary_categories a user_salary_config_v2
-- =====================================================
CREATE OR REPLACE FUNCTION fn_propagate_salary_category_changes()
RETURNS TRIGGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Solo propagar si cambió el salario base o valor hora
    IF OLD.base_salary_reference IS DISTINCT FROM NEW.base_salary_reference THEN

        -- Calcular valor hora (200 horas/mes estándar)
        DECLARE
            new_hourly_rate NUMERIC(10,2) := NEW.base_salary_reference / 200;
        BEGIN
            -- Actualizar todos los usuarios con esta categoría
            UPDATE user_salary_config_v2
            SET
                base_salary = NEW.base_salary_reference,
                gross_salary = NEW.base_salary_reference,
                hourly_rate = new_hourly_rate,
                overtime_rate_50 = new_hourly_rate * 1.5,
                overtime_rate_100 = new_hourly_rate * 2.0,
                previous_base_salary = OLD.base_salary_reference,
                salary_increase_percentage =
                    CASE WHEN OLD.base_salary_reference > 0
                    THEN ((NEW.base_salary_reference - OLD.base_salary_reference) / OLD.base_salary_reference * 100)
                    ELSE 0 END,
                salary_increase_reason = 'Actualización automática por cambio en categoría salarial',
                last_salary_update = CURRENT_DATE,
                updated_at = NOW()
            WHERE salary_category_id = NEW.id
            AND is_current = true;

            GET DIAGNOSTICS affected_count = ROW_COUNT;

            -- Log del cambio
            RAISE NOTICE 'Propagación automática: Categoría % actualizada de $% a $%. % usuarios afectados.',
                NEW.category_name, OLD.base_salary_reference, NEW.base_salary_reference, affected_count;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en salary_categories
DROP TRIGGER IF EXISTS trg_propagate_salary_category ON salary_categories;
CREATE TRIGGER trg_propagate_salary_category
    AFTER UPDATE ON salary_categories
    FOR EACH ROW
    EXECUTE FUNCTION fn_propagate_salary_category_changes();

-- =====================================================
-- 2. FUNCIÓN: Propagar cambios de salary_categories_v2 también
-- =====================================================
CREATE OR REPLACE FUNCTION fn_propagate_salary_category_v2_changes()
RETURNS TRIGGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Solo propagar si cambió el salario recomendado
    IF OLD.recommended_base_salary IS DISTINCT FROM NEW.recommended_base_salary
       OR OLD.recommended_hourly_rate IS DISTINCT FROM NEW.recommended_hourly_rate THEN

        -- También actualizar la tabla salary_categories si existe el mismo código
        UPDATE salary_categories sc
        SET base_salary_reference = NEW.recommended_base_salary
        WHERE sc.category_code = NEW.category_code
        AND sc.labor_agreement_id = (
            SELECT lac.id FROM labor_agreements_catalog lac
            WHERE lac.code = (SELECT lav.code FROM labor_agreements_v2 lav WHERE lav.id = NEW.labor_agreement_id)
        );

        GET DIAGNOSTICS affected_count = ROW_COUNT;

        RAISE NOTICE 'Sincronización V2->V1: Categoría % actualizada. % registros en salary_categories.',
            NEW.category_name, affected_count;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en salary_categories_v2
DROP TRIGGER IF EXISTS trg_propagate_salary_category_v2 ON salary_categories_v2;
CREATE TRIGGER trg_propagate_salary_category_v2
    AFTER UPDATE ON salary_categories_v2
    FOR EACH ROW
    EXECUTE FUNCTION fn_propagate_salary_category_v2_changes();

-- =====================================================
-- 3. FUNCIÓN: Propagar cambios de convenio a todas sus categorías
-- =====================================================
CREATE OR REPLACE FUNCTION fn_propagate_agreement_multipliers()
RETURNS TRIGGER AS $$
BEGIN
    -- Si cambian los multiplicadores de horas extra
    IF OLD.overtime_50_multiplier IS DISTINCT FROM NEW.overtime_50_multiplier
       OR OLD.overtime_100_multiplier IS DISTINCT FROM NEW.overtime_100_multiplier THEN

        -- Actualizar multiplicadores en user_salary_config_v2
        UPDATE user_salary_config_v2 usc
        SET
            overtime_rate_50 = usc.hourly_rate * NEW.overtime_50_multiplier,
            overtime_rate_100 = usc.hourly_rate * NEW.overtime_100_multiplier,
            updated_at = NOW()
        FROM salary_categories_v2 sc
        WHERE usc.salary_category_id = (
            SELECT scat.id FROM salary_categories scat
            WHERE scat.category_code = sc.category_code
        )
        AND sc.labor_agreement_id = NEW.id
        AND usc.is_current = true;

        RAISE NOTICE 'Multiplicadores de horas extra actualizados para convenio %', NEW.name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en labor_agreements_v2
DROP TRIGGER IF EXISTS trg_propagate_agreement_multipliers ON labor_agreements_v2;
CREATE TRIGGER trg_propagate_agreement_multipliers
    AFTER UPDATE ON labor_agreements_v2
    FOR EACH ROW
    EXECUTE FUNCTION fn_propagate_agreement_multipliers();

-- =====================================================
-- 4. FUNCIÓN: Recalcular liquidación cuando cambia config salarial
-- =====================================================
CREATE OR REPLACE FUNCTION fn_flag_payroll_recalculation()
RETURNS TRIGGER AS $$
BEGIN
    -- Marcar las liquidaciones draft/pending para recálculo
    UPDATE payroll_run_details prd
    SET
        status = 'needs_recalculation',
        error_message = 'Configuración salarial actualizada - requiere recálculo',
        updated_at = NOW()
    FROM payroll_runs pr
    WHERE prd.run_id = pr.id
    AND prd.user_id = NEW.user_id
    AND pr.status IN ('draft', 'pending', 'calculated')
    AND pr.period_start >= NEW.effective_from;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en user_salary_config_v2
DROP TRIGGER IF EXISTS trg_flag_payroll_recalculation ON user_salary_config_v2;
CREATE TRIGGER trg_flag_payroll_recalculation
    AFTER UPDATE ON user_salary_config_v2
    FOR EACH ROW
    WHEN (OLD.base_salary IS DISTINCT FROM NEW.base_salary)
    EXECUTE FUNCTION fn_flag_payroll_recalculation();

-- =====================================================
-- 5. FUNCIÓN: Clonar plantilla para nueva sucursal
-- =====================================================
CREATE OR REPLACE FUNCTION fn_clone_payroll_template_for_branch(
    p_source_template_id INTEGER,
    p_target_branch_id INTEGER,
    p_target_country_id INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_template_id INTEGER;
    new_country_id INTEGER;
    branch_name_str VARCHAR;
BEGIN
    -- Obtener nombre de sucursal para usar en template
    SELECT cb.name, cb.country_id INTO branch_name_str, new_country_id
    FROM company_branches cb
    WHERE cb.id = p_target_branch_id;

    -- Si se especificó país, usarlo
    IF p_target_country_id IS NOT NULL THEN
        new_country_id := p_target_country_id;
    END IF;

    -- Clonar plantilla
    INSERT INTO payroll_templates (
        company_id, country_id, branch_id, labor_agreement_id,
        template_code, template_name, description, pay_frequency, calculation_basis,
        work_hours_per_day, work_days_per_week, work_hours_per_month,
        overtime_50_after_hours, overtime_100_after_hours,
        night_shift_start, night_shift_end, round_to_cents, round_method,
        receipt_header, receipt_legal_text, receipt_footer,
        version, is_current_version, parent_template_id, is_active,
        created_at, updated_at
    )
    SELECT
        pt.company_id, COALESCE(new_country_id, pt.country_id), p_target_branch_id, pt.labor_agreement_id,
        pt.template_code || '-' || COALESCE(branch_name_str, 'BR'),
        pt.template_name || ' (' || COALESCE(branch_name_str, 'Nueva Sucursal') || ')',
        pt.description, pt.pay_frequency, pt.calculation_basis,
        pt.work_hours_per_day, pt.work_days_per_week, pt.work_hours_per_month,
        pt.overtime_50_after_hours, pt.overtime_100_after_hours,
        pt.night_shift_start, pt.night_shift_end, pt.round_to_cents, pt.round_method,
        pt.receipt_header, pt.receipt_legal_text, pt.receipt_footer,
        1, true, pt.id, true,
        NOW(), NOW()
    FROM payroll_templates pt
    WHERE pt.id = p_source_template_id
    RETURNING id INTO new_template_id;

    -- Clonar conceptos de la plantilla
    INSERT INTO payroll_template_concepts (
        template_id, concept_type_id, concept_code, concept_name, short_name,
        description, calculation_type, default_value, percentage_base, formula,
        min_value, max_value, cap_value,
        applies_to_hourly, applies_to_monthly, is_mandatory, is_visible_receipt,
        is_editable_per_user, employee_contribution_rate, employer_contribution_rate,
        legal_reference, display_order, is_active, created_at, updated_at
    )
    SELECT
        new_template_id, concept_type_id, concept_code, concept_name, short_name,
        description, calculation_type, default_value, percentage_base, formula,
        min_value, max_value, cap_value,
        applies_to_hourly, applies_to_monthly, is_mandatory, is_visible_receipt,
        is_editable_per_user, employee_contribution_rate, employer_contribution_rate,
        legal_reference, display_order, is_active, NOW(), NOW()
    FROM payroll_template_concepts
    WHERE template_id = p_source_template_id;

    RAISE NOTICE 'Plantilla % clonada para sucursal %. Nueva plantilla ID: %',
        p_source_template_id, p_target_branch_id, new_template_id;

    RETURN new_template_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNCIÓN: Auto-crear config salarial al asignar convenio a usuario
-- NOTA: users.branch_id es UUID pero company_branches.id es INTEGER
--       Por lo tanto, usamos el company_id para buscar convenio por defecto
-- =====================================================
CREATE OR REPLACE FUNCTION fn_auto_create_user_salary_config()
RETURNS TRIGGER AS $$
DECLARE
    default_agreement_id INTEGER;
    default_category_id INTEGER;
    default_salary NUMERIC(15,2);
BEGIN
    -- Solo si no existe config salarial para este usuario
    IF NOT EXISTS (
        SELECT 1 FROM user_salary_config_v2
        WHERE user_id = NEW.user_id AND is_current = true
    ) THEN
        -- Obtener convenio y categoría por defecto de la empresa (no sucursal por incompatibilidad de tipos)
        SELECT lac.id, sc.id, sc.base_salary_reference
        INTO default_agreement_id, default_category_id, default_salary
        FROM labor_agreements_catalog lac
        LEFT JOIN salary_categories sc ON sc.labor_agreement_id = lac.id AND sc.is_active = true
        WHERE lac.is_active = true  -- FIXED: lac no tiene company_id
        -- (linea removida porque el WHERE ya tiene is_active)
        ORDER BY lac.id
        LIMIT 1;

        -- Si hay convenio por defecto, crear config salarial
        IF default_agreement_id IS NOT NULL THEN
            INSERT INTO user_salary_config_v2 (
                user_id, company_id, labor_agreement_id, salary_category_id,
                payment_type, base_salary, gross_salary, hourly_rate,
                overtime_rate_50, overtime_rate_100, currency,
                effective_from, is_current, notes, created_at, updated_at
            )
            VALUES (
                NEW.user_id, NEW.company_id, default_agreement_id, default_category_id,
                'monthly', COALESCE(default_salary, 0), COALESCE(default_salary, 0),
                COALESCE(default_salary / 200, 0),
                COALESCE(default_salary / 200 * 1.5, 0), COALESCE(default_salary / 200 * 2, 0),
                'ARS', CURRENT_DATE, true, 'Auto-creado al asignar empresa', NOW(), NOW()
            );

            RAISE NOTICE 'Config salarial auto-creada para usuario % en empresa %',
                NEW.user_id, NEW.company_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en users (cuando se asigna company_id)
DROP TRIGGER IF EXISTS trg_auto_create_user_salary_config ON users;
CREATE TRIGGER trg_auto_create_user_salary_config
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW
    WHEN (NEW.company_id IS NOT NULL)
    EXECUTE FUNCTION fn_auto_create_user_salary_config();

-- =====================================================
-- 7. VISTA: Resumen completo User -> Convenio -> Categoría -> Salario
-- NOTA: No podemos usar u.branch_id para JOIN con company_branches porque
--       users.branch_id es UUID y company_branches.id es INTEGER
-- =====================================================
CREATE OR REPLACE VIEW vw_user_salary_complete AS
SELECT
    u.user_id,
    u."firstName" || ' ' || u."lastName" AS employee_name,
    u.company_id,
    c.name AS company_name,
    u.branch_id AS user_branch_uuid,
    lac.code AS agreement_code,
    lac.name AS agreement_name,
    sc.category_code,
    sc.category_name,
    sc.base_salary_reference AS category_base_salary,
    usc.base_salary AS user_base_salary,
    usc.gross_salary,
    usc.hourly_rate,
    usc.overtime_rate_50,
    usc.overtime_rate_100,
    usc.currency,
    usc.effective_from,
    usc.last_salary_update,
    usc.salary_increase_percentage AS last_increase_pct,
    usc.is_current
FROM users u
LEFT JOIN companies c ON c.company_id = u.company_id
LEFT JOIN user_salary_config_v2 usc ON usc.user_id = u.user_id AND usc.is_current = true
LEFT JOIN labor_agreements_catalog lac ON lac.id = usc.labor_agreement_id
LEFT JOIN salary_categories sc ON sc.id = usc.salary_category_id
WHERE u.is_active = true;

-- =====================================================
-- 8. FUNCIÓN: Obtener plantilla correcta por usuario/empresa
-- NOTA: Simplificada para evitar incompatibilidad UUID vs INTEGER
-- =====================================================
CREATE OR REPLACE FUNCTION fn_get_user_payroll_template(p_user_id UUID)
RETURNS TABLE (
    template_id INTEGER,
    template_code VARCHAR,
    template_name VARCHAR,
    country_name VARCHAR,
    agreement_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pt.id,
        pt.template_code,
        pt.template_name,
        pc.country_name,
        lav.name
    FROM users u
    LEFT JOIN payroll_templates pt ON (
        pt.company_id = u.company_id
        AND pt.is_active = true
        AND pt.is_current_version = true
    )
    LEFT JOIN payroll_countries pc ON pc.id = pt.country_id
    LEFT JOIN labor_agreements_v2 lav ON lav.id = pt.labor_agreement_id
    WHERE u.user_id = p_user_id
    ORDER BY
        CASE WHEN pt.branch_id IS NOT NULL THEN 1 ELSE 2 END,
        pt.id DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. Agregar columnas faltantes a company_branches
-- =====================================================
DO $$
BEGIN
    -- Agregar country_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'company_branches' AND column_name = 'country_id') THEN
        ALTER TABLE company_branches ADD COLUMN country_id INTEGER REFERENCES payroll_countries(id);
    END IF;

    -- Agregar default_agreement_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'company_branches' AND column_name = 'default_agreement_id') THEN
        ALTER TABLE company_branches ADD COLUMN default_agreement_id INTEGER REFERENCES labor_agreements_catalog(id);
    END IF;

    -- Agregar default_template_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'company_branches' AND column_name = 'default_template_id') THEN
        ALTER TABLE company_branches ADD COLUMN default_template_id INTEGER REFERENCES payroll_templates(id);
    END IF;

    -- Agregar payroll_settings si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'company_branches' AND column_name = 'payroll_settings') THEN
        ALTER TABLE company_branches ADD COLUMN payroll_settings JSONB DEFAULT '{}';
    END IF;
END $$;

-- =====================================================
-- 10. Índices para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_salary_config_v2_category ON user_salary_config_v2(salary_category_id);
CREATE INDEX IF NOT EXISTS idx_user_salary_config_v2_agreement ON user_salary_config_v2(labor_agreement_id);
CREATE INDEX IF NOT EXISTS idx_user_salary_config_v2_current ON user_salary_config_v2(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_payroll_templates_branch ON payroll_templates(branch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_templates_country ON payroll_templates(country_id);
CREATE INDEX IF NOT EXISTS idx_company_branches_country ON company_branches(country_id);

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
COMMENT ON FUNCTION fn_propagate_salary_category_changes() IS
'Propaga automáticamente cambios de salario en categorías a todos los usuarios con esa categoría';

COMMENT ON FUNCTION fn_clone_payroll_template_for_branch() IS
'Clona una plantilla de liquidación para una nueva sucursal, respetando país y legislación';

COMMENT ON VIEW vw_user_salary_complete IS
'Vista completa de la cadena User → Convenio → Categoría → Salario con datos de sucursal y país';
