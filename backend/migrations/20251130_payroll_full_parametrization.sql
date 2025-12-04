-- ============================================================================
-- MIGRACIÓN: Parametrización Total de Entidades de Liquidación
-- Fecha: 2025-11-30
-- Versión: 4.0.0
--
-- OBJETIVO: Eliminar TODAS las referencias hardcodeadas a entidades específicas
--           (AFIP, ANSES, etc.) y hacer el sistema 100% parametrizable.
--
-- ARQUITECTURA:
--   1. PAÍS → Define moneda, leyes laborales base
--   2. CATEGORÍA DE ENTIDAD → Tipos de destino (Jubilación, Salud, Sindicato...)
--   3. ENTIDAD → Organismo real (creado por empresa o global por país)
--   4. CONCEPTO → Haber/Deducción con entidad de destino asignada
-- ============================================================================

-- ============================================================================
-- 1. TABLA: payroll_entity_categories - Categorías parametrizables de entidades
-- ============================================================================
-- En lugar de hardcodear "TAX_AUTHORITY", "UNION", etc., ahora las categorías
-- son creadas por país o por empresa.

CREATE TABLE IF NOT EXISTS payroll_entity_categories (
    id SERIAL PRIMARY KEY,

    -- Alcance: NULL = global, country_id = por país, company_id = privado empresa
    country_id INTEGER REFERENCES payroll_countries(id),
    company_id INTEGER REFERENCES companies(company_id),

    -- Identificación
    category_code VARCHAR(50) NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    category_name_short VARCHAR(50),  -- Para UI compacta
    description TEXT,

    -- Clasificación del flujo de dinero
    flow_direction VARCHAR(30) NOT NULL DEFAULT 'deduction',  -- 'earning', 'deduction', 'employer_contribution', 'informative'

    -- Ícono y color para UI
    icon_name VARCHAR(50),        -- Nombre de ícono (ej: 'building', 'heart', 'users')
    color_hex VARCHAR(7),         -- Color para badges (ej: '#3B82F6')

    -- Configuración de consolidación
    consolidation_group VARCHAR(50),  -- Agrupación para reportes (ej: 'government', 'private', 'union')
    requires_tax_id BOOLEAN DEFAULT false,  -- Si la entidad de este tipo requiere CUIT/RFC/etc
    requires_bank_info BOOLEAN DEFAULT false,  -- Si requiere datos bancarios

    -- Configuración de presentación
    default_presentation_format VARCHAR(50),  -- Formato por defecto para este tipo
    presentation_entity_name VARCHAR(200),    -- Nombre del organismo receptor (ej: "AFIP" en Argentina)

    -- Orden y visualización
    display_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false,  -- Si es categoría del sistema (no editable)
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unicidad: código único por alcance
    UNIQUE NULLS NOT DISTINCT (country_id, company_id, category_code)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_entity_categories_country ON payroll_entity_categories(country_id);
CREATE INDEX IF NOT EXISTS idx_entity_categories_company ON payroll_entity_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_categories_flow ON payroll_entity_categories(flow_direction);

COMMENT ON TABLE payroll_entity_categories IS 'Categorías parametrizables de entidades (reemplaza entity_type hardcodeado)';
COMMENT ON COLUMN payroll_entity_categories.flow_direction IS 'Dirección del flujo: earning=ingreso, deduction=descuento empleado, employer_contribution=aporte patronal, informative=solo informativo';

-- ============================================================================
-- 2. DATOS SEMILLA: Categorías base por país (editables, no hardcodeadas)
-- ============================================================================

-- Categorías GLOBALES (aplican a todos los países como base)
INSERT INTO payroll_entity_categories (category_code, category_name, category_name_short, description, flow_direction, icon_name, color_hex, consolidation_group, requires_tax_id, requires_bank_info, display_order, is_system) VALUES
('PENSION', 'Sistema Previsional / Jubilación', 'Jubilación', 'Aportes para jubilación y pensión', 'deduction', 'piggy-bank', '#8B5CF6', 'social_security', true, true, 1, true),
('PENSION_EMPLOYER', 'Contribución Patronal Previsional', 'Contrib. Jubilación', 'Contribuciones del empleador al sistema previsional', 'employer_contribution', 'building', '#7C3AED', 'social_security', true, true, 2, true),
('HEALTH', 'Seguro de Salud / Obra Social', 'Salud', 'Aportes a obra social o seguro médico', 'deduction', 'heart', '#EF4444', 'health', true, true, 3, true),
('HEALTH_EMPLOYER', 'Contribución Patronal Salud', 'Contrib. Salud', 'Contribuciones del empleador a salud', 'employer_contribution', 'heart-pulse', '#DC2626', 'health', true, true, 4, true),
('UNION', 'Cuota Sindical', 'Sindicato', 'Aportes al sindicato del trabajador', 'deduction', 'users', '#F59E0B', 'union', true, true, 5, false),
('INCOME_TAX', 'Impuesto sobre Ingresos', 'Imp. Ganancias', 'Retención de impuesto a las ganancias/renta', 'deduction', 'receipt', '#10B981', 'taxes', true, false, 6, true),
('WORK_RISK', 'Seguro de Riesgos Laborales', 'ART/Riesgos', 'Seguro de accidentes y enfermedades laborales', 'employer_contribution', 'shield-check', '#3B82F6', 'insurance', true, true, 7, true),
('HOUSING', 'Fondo de Vivienda', 'Vivienda', 'Aportes a fondos de vivienda', 'employer_contribution', 'home', '#6366F1', 'housing', true, true, 8, false),
('UNEMPLOYMENT', 'Seguro de Desempleo', 'Desempleo', 'Aportes al seguro de desempleo', 'employer_contribution', 'briefcase', '#EC4899', 'social_security', true, false, 9, false),
('FAMILY_ALLOWANCE', 'Asignaciones Familiares', 'Asig. Fam.', 'Contribuciones para asignaciones familiares', 'employer_contribution', 'users', '#14B8A6', 'social_security', true, false, 10, false),
('BANK', 'Entidad Bancaria', 'Banco', 'Cuenta bancaria para depósito de haberes', 'earning', 'building-bank', '#0EA5E9', 'bank', false, true, 11, true),
('ADVANCE', 'Adelantos y Préstamos', 'Adelantos', 'Descuentos por adelantos o préstamos', 'deduction', 'cash', '#F97316', 'company', false, false, 12, false),
('GARNISHMENT', 'Embargos Judiciales', 'Embargos', 'Retenciones por embargos judiciales', 'deduction', 'gavel', '#64748B', 'legal', true, true, 13, false),
('OTHER_DEDUCTION', 'Otras Deducciones', 'Otros Desc.', 'Otras deducciones varias', 'deduction', 'minus-circle', '#94A3B8', 'other', false, false, 20, false),
('OTHER_CONTRIBUTION', 'Otras Contribuciones Patronales', 'Otros Aportes', 'Otras contribuciones del empleador', 'employer_contribution', 'plus-circle', '#475569', 'other', false, false, 21, false)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. MODIFICAR payroll_entities - Agregar FK a categoría
-- ============================================================================

-- Agregar columna category_id si no existe
ALTER TABLE payroll_entities
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES payroll_entity_categories(id);

-- Agregar campos adicionales para mejor parametrización
ALTER TABLE payroll_entities
ADD COLUMN IF NOT EXISTS entity_short_name VARCHAR(50);

ALTER TABLE payroll_entities
ADD COLUMN IF NOT EXISTS requires_employee_affiliation BOOLEAN DEFAULT false;

ALTER TABLE payroll_entities
ADD COLUMN IF NOT EXISTS affiliation_id_name VARCHAR(50);  -- Nombre del ID de afiliación (ej: "N° de Afiliado", "CUIL", etc.)

ALTER TABLE payroll_entities
ADD COLUMN IF NOT EXISTS calculation_notes TEXT;  -- Notas sobre cómo se calcula (para ayuda al usuario)

ALTER TABLE payroll_entities
ADD COLUMN IF NOT EXISTS legal_reference TEXT;  -- Referencia legal (ley, artículo)

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_payroll_entities_category ON payroll_entities(category_id);

-- ============================================================================
-- 4. MIGRAR entity_type existente a category_id
-- ============================================================================

-- Actualizar entidades existentes para usar las nuevas categorías
UPDATE payroll_entities pe
SET category_id = pec.id
FROM payroll_entity_categories pec
WHERE pe.category_id IS NULL
AND (
    (pe.entity_type = 'TAX_AUTHORITY' AND pec.category_code = 'INCOME_TAX')
    OR (pe.entity_type = 'SOCIAL_SECURITY' AND pec.category_code = 'PENSION')
    OR (pe.entity_type = 'UNION' AND pec.category_code = 'UNION')
    OR (pe.entity_type = 'HEALTH_INSURANCE' AND pec.category_code = 'HEALTH')
    OR (pe.entity_type = 'PENSION_FUND' AND pec.category_code = 'PENSION')
    OR (pe.entity_type = 'BANK' AND pec.category_code = 'BANK')
    OR (pe.entity_type = 'OTHER' AND pec.category_code IN ('WORK_RISK', 'OTHER_DEDUCTION'))
)
AND pec.country_id IS NULL
AND pec.company_id IS NULL;

-- ============================================================================
-- 5. AGREGAR CAMPO destination_label a payroll_template_concepts
-- ============================================================================

-- Label personalizado para mostrar en recibo
ALTER TABLE payroll_template_concepts
ADD COLUMN IF NOT EXISTS entity_label VARCHAR(100);  -- Etiqueta personalizada (ej: "Aporte Jubilatorio ANSES")

-- Notas del concepto para el recibo
ALTER TABLE payroll_template_concepts
ADD COLUMN IF NOT EXISTS receipt_note TEXT;

-- ============================================================================
-- 6. VISTA: Entidades con categoría (para dropdown en UI)
-- ============================================================================
DROP VIEW IF EXISTS v_payroll_entities_with_category;
CREATE OR REPLACE VIEW v_payroll_entities_with_category AS
SELECT
    pe.entity_id,
    pe.company_id,
    pe.country_id,
    pc.country_code,
    pc.country_name,
    pe.category_id,
    pec.category_code,
    pec.category_name,
    pec.flow_direction,
    pec.icon_name,
    pec.color_hex,
    pec.consolidation_group,
    pe.entity_code,
    pe.entity_name,
    pe.entity_short_name,
    pe.entity_type,  -- Legacy, para compatibilidad
    pe.tax_id,
    pe.legal_name,
    pe.bank_name,
    pe.bank_cbu,
    pe.presentation_format,
    pe.is_government,
    pe.is_mandatory,
    pe.is_active,
    pe.settings
FROM payroll_entities pe
LEFT JOIN payroll_countries pc ON pe.country_id = pc.id
LEFT JOIN payroll_entity_categories pec ON pe.category_id = pec.id
WHERE pe.is_active = true;

COMMENT ON VIEW v_payroll_entities_with_category IS 'Vista de entidades con datos de categoría para UI';

-- ============================================================================
-- 7. VISTA: Conceptos con entidad asignada
-- ============================================================================
DROP VIEW IF EXISTS v_template_concepts_with_entity;
CREATE OR REPLACE VIEW v_template_concepts_with_entity AS
SELECT
    ptc.id as concept_id,
    ptc.template_id,
    pt.template_name,
    pt.company_id,
    ptc.concept_code,
    ptc.concept_name,
    ptc.short_name,
    ptc.calculation_type,
    ptc.default_value,
    pct.type_code as concept_type_code,
    pct.type_name as concept_type_name,
    pct.is_deduction,
    pct.is_employer_cost,
    pct.is_taxable,
    pct.affects_gross,
    ptc.entity_id,
    pe.entity_code,
    pe.entity_name,
    pec.category_code as entity_category_code,
    pec.category_name as entity_category_name,
    pec.flow_direction as entity_flow,
    pec.color_hex as entity_color,
    ptc.entity_label,
    ptc.entity_account_code,
    ptc.display_order,
    ptc.is_active
FROM payroll_template_concepts ptc
JOIN payroll_templates pt ON ptc.template_id = pt.id
JOIN payroll_concept_types pct ON ptc.concept_type_id = pct.id
LEFT JOIN payroll_entities pe ON ptc.entity_id = pe.entity_id
LEFT JOIN payroll_entity_categories pec ON pe.category_id = pec.id;

COMMENT ON VIEW v_template_concepts_with_entity IS 'Vista de conceptos de plantilla con datos de entidad para UI';

-- ============================================================================
-- 8. FUNCIÓN: Obtener entidades disponibles para una empresa
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_entities_for_company(
    p_company_id INTEGER,
    p_country_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    entity_id INTEGER,
    entity_code VARCHAR(30),
    entity_name VARCHAR(200),
    entity_short_name VARCHAR(50),
    category_id INTEGER,
    category_code VARCHAR(50),
    category_name VARCHAR(200),
    flow_direction VARCHAR(20),
    icon_name VARCHAR(50),
    color_hex VARCHAR(7),
    is_global BOOLEAN,
    country_code VARCHAR(3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pe.entity_id,
        pe.entity_code,
        pe.entity_name,
        pe.entity_short_name,
        pe.category_id,
        pec.category_code,
        pec.category_name,
        pec.flow_direction,
        pec.icon_name,
        pec.color_hex,
        (pe.company_id IS NULL) as is_global,
        pc.country_code
    FROM payroll_entities pe
    LEFT JOIN payroll_entity_categories pec ON pe.category_id = pec.id
    LEFT JOIN payroll_countries pc ON pe.country_id = pc.id
    WHERE pe.is_active = true
    AND (
        pe.company_id IS NULL  -- Entidades globales
        OR pe.company_id = p_company_id  -- Entidades de la empresa
    )
    AND (
        p_country_id IS NULL
        OR pe.country_id IS NULL  -- Sin país = aplica a todos
        OR pe.country_id = p_country_id
    )
    ORDER BY pec.display_order, pe.entity_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_entities_for_company IS 'Retorna entidades disponibles para una empresa (globales + propias)';

-- ============================================================================
-- 9. FUNCIÓN: Obtener categorías disponibles para una empresa
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_entity_categories(
    p_company_id INTEGER DEFAULT NULL,
    p_country_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    category_code VARCHAR(50),
    category_name VARCHAR(200),
    category_name_short VARCHAR(50),
    flow_direction VARCHAR(20),
    icon_name VARCHAR(50),
    color_hex VARCHAR(7),
    consolidation_group VARCHAR(50),
    is_global BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pec.id,
        pec.category_code,
        pec.category_name,
        pec.category_name_short,
        pec.flow_direction,
        pec.icon_name,
        pec.color_hex,
        pec.consolidation_group,
        (pec.company_id IS NULL AND pec.country_id IS NULL) as is_global
    FROM payroll_entity_categories pec
    WHERE pec.is_active = true
    AND (
        (pec.company_id IS NULL AND pec.country_id IS NULL)  -- Globales
        OR pec.country_id = p_country_id  -- Del país
        OR pec.company_id = p_company_id  -- De la empresa
    )
    ORDER BY pec.display_order, pec.category_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. MEJORAR FUNCIÓN generate_entity_settlement
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_entity_settlement_v2(
    p_company_id INTEGER,
    p_entity_id INTEGER,
    p_run_id INTEGER,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_settlement_id INTEGER;
    v_period RECORD;
    v_settlement_code VARCHAR(50);
    v_totals RECORD;
    v_entity RECORD;
BEGIN
    -- Obtener datos del período
    SELECT period_year, period_month, period_start, period_end
    INTO v_period
    FROM payroll_runs
    WHERE id = p_run_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Run ID % no encontrado', p_run_id;
    END IF;

    -- Obtener datos de la entidad
    SELECT entity_code, entity_name, category_id
    INTO v_entity
    FROM payroll_entities
    WHERE entity_id = p_entity_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Entidad ID % no encontrada', p_entity_id;
    END IF;

    -- Generar código único
    v_settlement_code := 'SET-' || p_company_id || '-' || v_entity.entity_code || '-' ||
                         v_period.period_year || LPAD(v_period.period_month::TEXT, 2, '0');

    -- Calcular totales usando la entidad asignada a cada concepto
    SELECT
        COUNT(DISTINCT prd.user_id) as total_employees,
        COALESCE(SUM(CASE
            WHEN pct.is_employer_cost THEN prcd.amount
            ELSE 0
        END), 0) as total_employer,
        COALESCE(SUM(CASE
            WHEN pct.is_deduction AND NOT pct.is_employer_cost THEN prcd.amount
            ELSE 0
        END), 0) as total_employee
    INTO v_totals
    FROM payroll_run_concept_details prcd
    JOIN payroll_run_details prd ON prcd.run_detail_id = prd.id
    LEFT JOIN payroll_template_concepts ptc ON prcd.template_concept_id = ptc.id
    LEFT JOIN payroll_concept_types pct ON prcd.concept_type_id = pct.id
    WHERE prd.run_id = p_run_id
    AND (
        ptc.entity_id = p_entity_id  -- Conceptos con entidad asignada directamente
        OR prcd.entity_id = p_entity_id  -- O en el detalle de la corrida
    );

    -- Crear o actualizar liquidación
    INSERT INTO payroll_entity_settlements (
        company_id, entity_id, run_id,
        period_year, period_month, period_start, period_end,
        settlement_code,
        total_employees,
        total_employer_contribution,
        total_employee_contribution,
        grand_total,
        status, generated_at, generated_by
    ) VALUES (
        p_company_id, p_entity_id, p_run_id,
        v_period.period_year, v_period.period_month,
        v_period.period_start, v_period.period_end,
        v_settlement_code,
        COALESCE(v_totals.total_employees, 0),
        COALESCE(v_totals.total_employer, 0),
        COALESCE(v_totals.total_employee, 0),
        COALESCE(v_totals.total_employer, 0) + COALESCE(v_totals.total_employee, 0),
        'generated', NOW(), p_user_id
    )
    ON CONFLICT (company_id, entity_id, period_year, period_month)
    DO UPDATE SET
        run_id = EXCLUDED.run_id,
        total_employees = EXCLUDED.total_employees,
        total_employer_contribution = EXCLUDED.total_employer_contribution,
        total_employee_contribution = EXCLUDED.total_employee_contribution,
        grand_total = EXCLUDED.grand_total,
        status = 'generated',
        generated_at = NOW(),
        generated_by = EXCLUDED.generated_by,
        updated_at = NOW()
    RETURNING settlement_id INTO v_settlement_id;

    -- Limpiar detalles anteriores
    DELETE FROM payroll_entity_settlement_details WHERE settlement_id = v_settlement_id;

    -- Insertar detalles por empleado
    INSERT INTO payroll_entity_settlement_details (
        settlement_id, user_id, run_detail_id,
        employee_name, employee_tax_id, employee_code,
        base_amount, employee_amount, employer_amount, total_amount,
        concepts_breakdown
    )
    SELECT
        v_settlement_id,
        prd.user_id,
        prd.id,
        u."firstName" || ' ' || u."lastName",
        u.dni,
        u.employee_code,
        prd.gross_earnings,
        COALESCE(SUM(CASE
            WHEN pct.is_deduction AND NOT pct.is_employer_cost THEN prcd.amount
            ELSE 0
        END), 0),
        COALESCE(SUM(CASE
            WHEN pct.is_employer_cost THEN prcd.amount
            ELSE 0
        END), 0),
        COALESCE(SUM(prcd.amount), 0),
        jsonb_agg(jsonb_build_object(
            'concept_code', prcd.concept_code,
            'concept_name', prcd.concept_name,
            'amount', prcd.amount,
            'is_employer', pct.is_employer_cost,
            'is_deduction', pct.is_deduction
        ))
    FROM payroll_run_details prd
    JOIN users u ON prd.user_id = u.user_id
    JOIN payroll_run_concept_details prcd ON prd.id = prcd.run_detail_id
    LEFT JOIN payroll_template_concepts ptc ON prcd.template_concept_id = ptc.id
    LEFT JOIN payroll_concept_types pct ON prcd.concept_type_id = pct.id
    WHERE prd.run_id = p_run_id
    AND (
        ptc.entity_id = p_entity_id
        OR prcd.entity_id = p_entity_id
    )
    GROUP BY prd.user_id, prd.id, u."firstName", u."lastName", u.dni, u.employee_code, prd.gross_earnings;

    RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. VISTA: Resumen de entidades con totales por período
-- ============================================================================
CREATE OR REPLACE VIEW v_entities_period_summary AS
SELECT
    pe.entity_id,
    pe.entity_code,
    pe.entity_name,
    pec.category_name,
    pec.flow_direction,
    pec.color_hex,
    es.company_id,
    es.period_year,
    es.period_month,
    es.total_employees,
    es.total_employer_contribution,
    es.total_employee_contribution,
    es.grand_total,
    es.status,
    es.paid_at IS NOT NULL as is_paid
FROM payroll_entities pe
LEFT JOIN payroll_entity_categories pec ON pe.category_id = pec.id
LEFT JOIN payroll_entity_settlements es ON pe.entity_id = es.entity_id;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Migración completada: Parametrización Total v4.0';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 NUEVAS TABLAS:';
    RAISE NOTICE '   - payroll_entity_categories (categorías parametrizables)';
    RAISE NOTICE '';
    RAISE NOTICE '📝 COLUMNAS AGREGADAS:';
    RAISE NOTICE '   - payroll_entities.category_id (FK a categorías)';
    RAISE NOTICE '   - payroll_entities.entity_short_name';
    RAISE NOTICE '   - payroll_entities.requires_employee_affiliation';
    RAISE NOTICE '   - payroll_entities.affiliation_id_name';
    RAISE NOTICE '   - payroll_entities.calculation_notes';
    RAISE NOTICE '   - payroll_entities.legal_reference';
    RAISE NOTICE '   - payroll_template_concepts.entity_label';
    RAISE NOTICE '   - payroll_template_concepts.receipt_note';
    RAISE NOTICE '';
    RAISE NOTICE '👁️ VISTAS CREADAS:';
    RAISE NOTICE '   - v_payroll_entities_with_category';
    RAISE NOTICE '   - v_template_concepts_with_entity';
    RAISE NOTICE '   - v_entities_period_summary';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FUNCIONES:';
    RAISE NOTICE '   - get_available_entities_for_company()';
    RAISE NOTICE '   - get_available_entity_categories()';
    RAISE NOTICE '   - generate_entity_settlement_v2()';
    RAISE NOTICE '';
    RAISE NOTICE '💡 AHORA PUEDES:';
    RAISE NOTICE '   1. Crear categorías de entidades personalizadas';
    RAISE NOTICE '   2. Crear entidades de cualquier país';
    RAISE NOTICE '   3. Asignar entidad a cada concepto';
    RAISE NOTICE '   4. Generar liquidaciones consolidadas automáticamente';
END $$;
