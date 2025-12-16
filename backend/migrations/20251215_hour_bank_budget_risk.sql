-- ============================================================================
-- HOUR BANK - PRESUPUESTO, LIMITES Y ANALISIS DE RIESGO
-- ============================================================================
-- Extiende el sistema de Banco de Horas con:
-- 1. Presupuesto por periodo (empresa/sucursal)
-- 2. Limites porcentuales para evitar sobreacumulacion
-- 3. Indicadores de riesgo de ciclo vicioso
-- 4. Tracking de destino de horas extras (pago vs banco)
-- ============================================================================

-- 1. AGREGAR CAMPOS DE PRESUPUESTO A PLANTILLAS
-- ============================================================================
ALTER TABLE hour_bank_templates ADD COLUMN IF NOT EXISTS
    budget_enabled BOOLEAN DEFAULT false;

ALTER TABLE hour_bank_templates ADD COLUMN IF NOT EXISTS
    budget_period_months INTEGER DEFAULT 6;

ALTER TABLE hour_bank_templates ADD COLUMN IF NOT EXISTS
    budget_total_hours DECIMAL(8,2) DEFAULT 150.00;

ALTER TABLE hour_bank_templates ADD COLUMN IF NOT EXISTS
    budget_alert_threshold_pct DECIMAL(5,2) DEFAULT 80.00;

ALTER TABLE hour_bank_templates ADD COLUMN IF NOT EXISTS
    budget_critical_threshold_pct DECIMAL(5,2) DEFAULT 95.00;

-- Limite porcentual: max % del salario que puede ser banco de horas
ALTER TABLE hour_bank_templates ADD COLUMN IF NOT EXISTS
    max_bank_salary_pct DECIMAL(5,2) DEFAULT 15.00;

-- Limite de impacto: max horas que un empleado puede devolver por mes sin generar deficit
ALTER TABLE hour_bank_templates ADD COLUMN IF NOT EXISTS
    max_monthly_return_hours DECIMAL(5,2) DEFAULT 16.00;

-- Umbral de riesgo: si devolver X horas genera > Y horas extras, alertar
ALTER TABLE hour_bank_templates ADD COLUMN IF NOT EXISTS
    risk_return_overtime_ratio DECIMAL(4,2) DEFAULT 0.50;

COMMENT ON COLUMN hour_bank_templates.budget_enabled IS 'Habilita control de presupuesto de horas a nivel empresa/sucursal';
COMMENT ON COLUMN hour_bank_templates.budget_period_months IS 'Periodo del presupuesto en meses (ej: 6 = semestral)';
COMMENT ON COLUMN hour_bank_templates.budget_total_hours IS 'Total de horas presupuestadas para el periodo';
COMMENT ON COLUMN hour_bank_templates.budget_alert_threshold_pct IS 'Porcentaje de uso que dispara alerta amarilla';
COMMENT ON COLUMN hour_bank_templates.budget_critical_threshold_pct IS 'Porcentaje de uso que dispara alerta roja/bloqueo';
COMMENT ON COLUMN hour_bank_templates.max_bank_salary_pct IS 'Max % del sueldo que puede estar en banco (evita sobreacumulacion)';
COMMENT ON COLUMN hour_bank_templates.max_monthly_return_hours IS 'Max horas que empleado puede usar por mes sin generar deficit operativo';
COMMENT ON COLUMN hour_bank_templates.risk_return_overtime_ratio IS 'Si devolver genera > este ratio de HE nuevas, hay ciclo vicioso';


-- 2. TABLA DE PRESUPUESTOS POR PERIODO
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_budgets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER REFERENCES company_branches(id),
    department_id INTEGER,

    -- Periodo
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_label VARCHAR(50), -- "2025-S1", "2025-Q1", etc

    -- Presupuesto
    budget_hours DECIMAL(10,2) NOT NULL DEFAULT 150.00,
    allocated_hours DECIMAL(10,2) DEFAULT 0.00, -- Ya asignadas a empleados
    used_hours DECIMAL(10,2) DEFAULT 0.00, -- Ya usadas (descontadas del banco)
    available_hours DECIMAL(10,2) GENERATED ALWAYS AS (budget_hours - allocated_hours) STORED,

    -- Estado
    status VARCHAR(20) DEFAULT 'active', -- active, closed, exceeded
    alert_level VARCHAR(20) DEFAULT 'normal', -- normal, warning, critical

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,

    UNIQUE(company_id, branch_id, department_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_hb_budgets_company ON hour_bank_budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_hb_budgets_period ON hour_bank_budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_hb_budgets_status ON hour_bank_budgets(status, alert_level);


-- 3. AGREGAR TRACKING DE DESTINO EN TRANSACCIONES
-- ============================================================================
ALTER TABLE hour_bank_transactions ADD COLUMN IF NOT EXISTS
    overtime_destination VARCHAR(20); -- 'bank', 'pay', 'pending'

ALTER TABLE hour_bank_transactions ADD COLUMN IF NOT EXISTS
    attendance_id INTEGER;

ALTER TABLE hour_bank_transactions ADD COLUMN IF NOT EXISTS
    return_impact_hours DECIMAL(5,2); -- Horas extras generadas por esta devolucion

COMMENT ON COLUMN hour_bank_transactions.overtime_destination IS 'Destino de la hora extra: bank=acumulada, pay=pagada, pending=sin decidir';
COMMENT ON COLUMN hour_bank_transactions.attendance_id IS 'Referencia al fichaje que genero esta transaccion';
COMMENT ON COLUMN hour_bank_transactions.return_impact_hours IS 'Si es uso, cuantas HE genero cubrir este ausentismo';


-- 4. TABLA DE ANALISIS DE RIESGO POR EMPLEADO
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_risk_analysis (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    user_id INTEGER NOT NULL,
    branch_id INTEGER,
    department_id INTEGER,

    -- Periodo de analisis
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Metricas de acumulacion
    total_overtime_hours DECIMAL(8,2) DEFAULT 0, -- HE totales generadas
    hours_to_bank DECIMAL(8,2) DEFAULT 0, -- Enviadas al banco
    hours_to_pay DECIMAL(8,2) DEFAULT 0, -- Pagadas
    bank_ratio DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE WHEN total_overtime_hours > 0
        THEN hours_to_bank / total_overtime_hours
        ELSE 0 END
    ) STORED,

    -- Metricas de uso
    hours_used DECIMAL(8,2) DEFAULT 0, -- Usadas del banco
    hours_expired DECIMAL(8,2) DEFAULT 0, -- Vencidas
    current_balance DECIMAL(8,2) DEFAULT 0, -- Saldo actual

    -- Indicadores de riesgo
    usage_velocity DECIMAL(6,2) DEFAULT 0, -- Horas usadas por mes (promedio)
    accumulation_velocity DECIMAL(6,2) DEFAULT 0, -- Horas acumuladas por mes
    burn_rate DECIMAL(5,2) DEFAULT 0, -- % del saldo usado por mes
    months_until_zero DECIMAL(4,1), -- Meses hasta agotar saldo al ritmo actual

    -- Riesgo de ciclo vicioso
    return_generated_overtime DECIMAL(8,2) DEFAULT 0, -- HE generadas por cubrir ausencias
    vicious_cycle_ratio DECIMAL(5,4) DEFAULT 0, -- ratio HE generadas / horas devueltas
    vicious_cycle_risk VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical

    -- Impacto operativo
    coverage_deficit_hours DECIMAL(8,2) DEFAULT 0, -- Horas no cubiertas
    projected_overtime_cost DECIMAL(12,2) DEFAULT 0, -- Costo proyectado de HE

    -- Score consolidado
    health_score INTEGER DEFAULT 100, -- 0-100, donde 100 = saludable
    risk_factors JSONB DEFAULT '[]', -- Array de factores de riesgo detectados
    recommendations JSONB DEFAULT '[]', -- Array de recomendaciones

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, user_id, analysis_date)
);

CREATE INDEX IF NOT EXISTS idx_hb_risk_company ON hour_bank_risk_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_hb_risk_user ON hour_bank_risk_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_hb_risk_score ON hour_bank_risk_analysis(health_score);
CREATE INDEX IF NOT EXISTS idx_hb_risk_vicious ON hour_bank_risk_analysis(vicious_cycle_risk);


-- 5. TABLA DE METRICAS AGREGADAS (DRILL-DOWN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hour_bank_metrics_aggregated (
    id SERIAL PRIMARY KEY,

    -- Nivel de agregacion
    aggregation_level VARCHAR(20) NOT NULL, -- 'company', 'branch', 'department', 'user'
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    branch_id INTEGER,
    department_id INTEGER,
    user_id INTEGER,

    -- Periodo
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
    period_date DATE NOT NULL,

    -- Metricas de HE
    total_overtime_hours DECIMAL(10,2) DEFAULT 0,
    overtime_to_bank_hours DECIMAL(10,2) DEFAULT 0,
    overtime_to_pay_hours DECIMAL(10,2) DEFAULT 0,
    overtime_pending_hours DECIMAL(10,2) DEFAULT 0,

    -- Metricas de uso
    bank_hours_used DECIMAL(10,2) DEFAULT 0,
    bank_hours_expired DECIMAL(10,2) DEFAULT 0,

    -- Saldos agregados
    total_bank_balance DECIMAL(12,2) DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    avg_balance_per_employee DECIMAL(8,2) DEFAULT 0,

    -- Presupuesto
    budget_hours DECIMAL(10,2),
    budget_used_pct DECIMAL(5,2),
    budget_status VARCHAR(20),

    -- Riesgo agregado
    employees_at_risk INTEGER DEFAULT 0,
    avg_health_score DECIMAL(5,2) DEFAULT 100,
    vicious_cycle_employees INTEGER DEFAULT 0,

    -- Financiero
    estimated_liability DECIMAL(14,2) DEFAULT 0, -- Pasivo estimado por horas acumuladas
    overtime_cost_saved DECIMAL(14,2) DEFAULT 0, -- Ahorro por horas al banco vs pago

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(aggregation_level, company_id, branch_id, department_id, user_id, period_type, period_date)
);

CREATE INDEX IF NOT EXISTS idx_hb_metrics_level ON hour_bank_metrics_aggregated(aggregation_level);
CREATE INDEX IF NOT EXISTS idx_hb_metrics_company ON hour_bank_metrics_aggregated(company_id);
CREATE INDEX IF NOT EXISTS idx_hb_metrics_period ON hour_bank_metrics_aggregated(period_type, period_date);


-- 6. FUNCION: CALCULAR RIESGO DE CICLO VICIOSO
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_vicious_cycle_risk(
    p_company_id INTEGER,
    p_user_id INTEGER,
    p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
    hours_returned DECIMAL,
    overtime_generated DECIMAL,
    ratio DECIMAL,
    risk_level VARCHAR,
    is_vicious_cycle BOOLEAN,
    recommendation TEXT
) AS $$
DECLARE
    v_hours_returned DECIMAL := 0;
    v_overtime_generated DECIMAL := 0;
    v_ratio DECIMAL := 0;
    v_risk_level VARCHAR := 'low';
    v_is_vicious BOOLEAN := false;
    v_recommendation TEXT := '';
BEGIN
    -- Obtener horas devueltas (usos del banco)
    SELECT COALESCE(SUM(ABS(hours_final)), 0)
    INTO v_hours_returned
    FROM hour_bank_transactions
    WHERE company_id = p_company_id
      AND user_id = p_user_id
      AND transaction_type = 'usage'
      AND created_at >= CURRENT_DATE - (p_months || ' months')::INTERVAL;

    -- Obtener horas extras generadas por esas ausencias
    -- (estimacion: si alguien uso banco, otro tuvo que cubrir con HE)
    SELECT COALESCE(SUM(return_impact_hours), 0)
    INTO v_overtime_generated
    FROM hour_bank_transactions
    WHERE company_id = p_company_id
      AND user_id = p_user_id
      AND transaction_type = 'usage'
      AND return_impact_hours > 0
      AND created_at >= CURRENT_DATE - (p_months || ' months')::INTERVAL;

    -- Calcular ratio
    IF v_hours_returned > 0 THEN
        v_ratio := v_overtime_generated / v_hours_returned;
    END IF;

    -- Determinar nivel de riesgo
    IF v_ratio >= 1.0 THEN
        v_risk_level := 'critical';
        v_is_vicious := true;
        v_recommendation := 'ALERTA CRITICA: Cada hora devuelta genera mas de 1 hora extra. Revisar distribucion de carga de trabajo.';
    ELSIF v_ratio >= 0.7 THEN
        v_risk_level := 'high';
        v_is_vicious := true;
        v_recommendation := 'Riesgo alto de ciclo vicioso. Considerar redistribuir turnos o contratar personal temporal.';
    ELSIF v_ratio >= 0.5 THEN
        v_risk_level := 'medium';
        v_recommendation := 'Riesgo moderado. Monitorear patrones de uso y cobertura.';
    ELSE
        v_risk_level := 'low';
        v_recommendation := 'Uso saludable del banco de horas.';
    END IF;

    RETURN QUERY SELECT
        v_hours_returned,
        v_overtime_generated,
        v_ratio,
        v_risk_level,
        v_is_vicious,
        v_recommendation;
END;
$$ LANGUAGE plpgsql;


-- 7. FUNCION: ANALIZAR SALUD DE CUENTA CORRIENTE
-- ============================================================================
CREATE OR REPLACE FUNCTION analyze_hour_bank_health(
    p_company_id INTEGER,
    p_user_id INTEGER
)
RETURNS TABLE (
    current_balance DECIMAL,
    monthly_avg_usage DECIMAL,
    monthly_avg_accrual DECIMAL,
    months_until_zero DECIMAL,
    burn_rate DECIMAL,
    health_score INTEGER,
    status VARCHAR,
    factors JSONB,
    recommendations JSONB
) AS $$
DECLARE
    v_balance DECIMAL := 0;
    v_avg_usage DECIMAL := 0;
    v_avg_accrual DECIMAL := 0;
    v_months_zero DECIMAL := NULL;
    v_burn_rate DECIMAL := 0;
    v_score INTEGER := 100;
    v_status VARCHAR := 'healthy';
    v_factors JSONB := '[]'::JSONB;
    v_recommendations JSONB := '[]'::JSONB;
    v_vicious_result RECORD;
BEGIN
    -- Obtener saldo actual
    SELECT COALESCE(hbb.current_balance, 0)
    INTO v_balance
    FROM hour_bank_balances hbb
    WHERE hbb.company_id = p_company_id AND hbb.user_id = p_user_id;

    -- Calcular promedio mensual de uso (ultimos 6 meses)
    SELECT COALESCE(AVG(monthly_usage), 0)
    INTO v_avg_usage
    FROM (
        SELECT DATE_TRUNC('month', created_at) as month,
               SUM(ABS(hours_final)) as monthly_usage
        FROM hour_bank_transactions
        WHERE company_id = p_company_id
          AND user_id = p_user_id
          AND transaction_type = 'usage'
          AND created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
    ) monthly;

    -- Calcular promedio mensual de acumulacion
    SELECT COALESCE(AVG(monthly_accrual), 0)
    INTO v_avg_accrual
    FROM (
        SELECT DATE_TRUNC('month', created_at) as month,
               SUM(hours_final) as monthly_accrual
        FROM hour_bank_transactions
        WHERE company_id = p_company_id
          AND user_id = p_user_id
          AND transaction_type = 'accrual'
          AND created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
    ) monthly;

    -- Calcular meses hasta agotar saldo
    IF v_avg_usage > v_avg_accrual AND (v_avg_usage - v_avg_accrual) > 0 THEN
        v_months_zero := v_balance / (v_avg_usage - v_avg_accrual);
    END IF;

    -- Calcular burn rate
    IF v_balance > 0 THEN
        v_burn_rate := (v_avg_usage / v_balance) * 100;
    END IF;

    -- Analizar ciclo vicioso
    SELECT * INTO v_vicious_result FROM calculate_vicious_cycle_risk(p_company_id, p_user_id, 6);

    -- Calcular score y factores
    -- Factor 1: Burn rate alto
    IF v_burn_rate > 50 THEN
        v_score := v_score - 30;
        v_factors := v_factors || '["Burn rate muy alto (>50% mensual)"]'::JSONB;
        v_recommendations := v_recommendations || '["Reducir uso de banco de horas o aumentar acumulacion"]'::JSONB;
    ELSIF v_burn_rate > 25 THEN
        v_score := v_score - 15;
        v_factors := v_factors || '["Burn rate elevado (>25% mensual)"]'::JSONB;
    END IF;

    -- Factor 2: Meses hasta cero
    IF v_months_zero IS NOT NULL AND v_months_zero < 2 THEN
        v_score := v_score - 25;
        v_factors := v_factors || '["Saldo se agotara en menos de 2 meses"]'::JSONB;
        v_recommendations := v_recommendations || '["Urgente: limitar uso de horas del banco"]'::JSONB;
    ELSIF v_months_zero IS NOT NULL AND v_months_zero < 4 THEN
        v_score := v_score - 10;
        v_factors := v_factors || '["Saldo se agotara en menos de 4 meses"]'::JSONB;
    END IF;

    -- Factor 3: Ciclo vicioso
    IF v_vicious_result.is_vicious_cycle THEN
        v_score := v_score - 30;
        v_factors := v_factors || ('["Ciclo vicioso detectado: ratio ' || v_vicious_result.ratio::TEXT || '"]')::JSONB;
        v_recommendations := v_recommendations || ('["' || v_vicious_result.recommendation || '"]')::JSONB;
    END IF;

    -- Factor 4: Saldo negativo
    IF v_balance < 0 THEN
        v_score := v_score - 20;
        v_factors := v_factors || '["Saldo negativo - debe horas"]'::JSONB;
        v_recommendations := v_recommendations || '["Acumular horas extras para compensar deficit"]'::JSONB;
    END IF;

    -- Determinar status
    IF v_score >= 80 THEN v_status := 'healthy';
    ELSIF v_score >= 60 THEN v_status := 'warning';
    ELSIF v_score >= 40 THEN v_status := 'at_risk';
    ELSE v_status := 'critical';
    END IF;

    v_score := GREATEST(0, v_score);

    RETURN QUERY SELECT
        v_balance,
        v_avg_usage,
        v_avg_accrual,
        v_months_zero,
        v_burn_rate,
        v_score,
        v_status,
        v_factors,
        v_recommendations;
END;
$$ LANGUAGE plpgsql;


-- 8. FUNCION: VERIFICAR PRESUPUESTO DISPONIBLE
-- ============================================================================
CREATE OR REPLACE FUNCTION check_budget_availability(
    p_company_id INTEGER,
    p_branch_id INTEGER DEFAULT NULL,
    p_hours_requested DECIMAL DEFAULT 0
)
RETURNS TABLE (
    budget_exists BOOLEAN,
    total_budget DECIMAL,
    allocated DECIMAL,
    used DECIMAL,
    available DECIMAL,
    can_allocate BOOLEAN,
    alert_level VARCHAR,
    message TEXT
) AS $$
DECLARE
    v_budget RECORD;
    v_new_allocated DECIMAL;
    v_pct_used DECIMAL;
BEGIN
    -- Buscar presupuesto activo
    SELECT * INTO v_budget
    FROM hour_bank_budgets
    WHERE company_id = p_company_id
      AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
      AND status = 'active'
      AND CURRENT_DATE BETWEEN period_start AND period_end
    ORDER BY branch_id NULLS LAST
    LIMIT 1;

    IF v_budget IS NULL THEN
        RETURN QUERY SELECT
            false, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL,
            true, 'none'::VARCHAR, 'No hay presupuesto configurado - sin limites'::TEXT;
        RETURN;
    END IF;

    v_new_allocated := v_budget.allocated_hours + p_hours_requested;
    v_pct_used := (v_new_allocated / v_budget.budget_hours) * 100;

    RETURN QUERY SELECT
        true,
        v_budget.budget_hours,
        v_budget.allocated_hours,
        v_budget.used_hours,
        v_budget.available_hours,
        v_new_allocated <= v_budget.budget_hours,
        CASE
            WHEN v_pct_used >= 95 THEN 'critical'
            WHEN v_pct_used >= 80 THEN 'warning'
            ELSE 'normal'
        END::VARCHAR,
        CASE
            WHEN v_new_allocated > v_budget.budget_hours THEN
                'Presupuesto excedido. Disponible: ' || v_budget.available_hours || 'h'
            WHEN v_pct_used >= 95 THEN
                'Presupuesto al ' || ROUND(v_pct_used) || '%. Quedan ' || v_budget.available_hours || 'h'
            WHEN v_pct_used >= 80 THEN
                'Alerta: Presupuesto al ' || ROUND(v_pct_used) || '%'
            ELSE
                'OK. Presupuesto disponible: ' || v_budget.available_hours || 'h'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;


-- 9. TRIGGER PARA ACTUALIZAR PRESUPUESTO AL ACREDITAR HORAS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_budget_on_accrual()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'accrual' THEN
        UPDATE hour_bank_budgets
        SET allocated_hours = allocated_hours + NEW.hours_final,
            updated_at = CURRENT_TIMESTAMP,
            alert_level = CASE
                WHEN (allocated_hours + NEW.hours_final) / budget_hours >= 0.95 THEN 'critical'
                WHEN (allocated_hours + NEW.hours_final) / budget_hours >= 0.80 THEN 'warning'
                ELSE 'normal'
            END
        WHERE company_id = NEW.company_id
          AND status = 'active'
          AND CURRENT_DATE BETWEEN period_start AND period_end;

    ELSIF NEW.transaction_type = 'usage' THEN
        UPDATE hour_bank_budgets
        SET used_hours = used_hours + ABS(NEW.hours_final),
            updated_at = CURRENT_TIMESTAMP
        WHERE company_id = NEW.company_id
          AND status = 'active'
          AND CURRENT_DATE BETWEEN period_start AND period_end;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_budget_on_transaction ON hour_bank_transactions;
CREATE TRIGGER trg_update_budget_on_transaction
    AFTER INSERT ON hour_bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_on_accrual();


-- 10. AGREGAR REFERENCIA EN ATTENDANCES PARA TRACKING
-- ============================================================================
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS
    overtime_destination VARCHAR(20); -- 'bank', 'pay', 'pending', NULL

ALTER TABLE attendances ADD COLUMN IF NOT EXISTS
    hour_bank_transaction_id INTEGER;

COMMENT ON COLUMN attendances.overtime_destination IS 'Destino de las HE de este fichaje: bank/pay/pending';
COMMENT ON COLUMN attendances.hour_bank_transaction_id IS 'ID de transaccion en hour_bank_transactions';


-- 11. VISTA PARA DRILL-DOWN DE METRICAS
-- ============================================================================
CREATE OR REPLACE VIEW vw_hour_bank_drilldown AS
WITH user_metrics AS (
    SELECT
        t.company_id,
        u.branch_id,
        u.department_id,
        t.user_id,
        COALESCE(u."firstName" || ' ' || u."lastName", u.display_name, 'Sin nombre') as user_name,
        COALESCE(u.legajo, u."employeeId") as legajo,
        SUM(CASE WHEN t.transaction_type = 'accrual' THEN t.hours_final ELSE 0 END) as hours_accrued,
        SUM(CASE WHEN t.transaction_type = 'usage' THEN ABS(t.hours_final) ELSE 0 END) as hours_used,
        SUM(CASE WHEN t.overtime_destination = 'bank' THEN t.hours_raw ELSE 0 END) as overtime_to_bank,
        SUM(CASE WHEN t.overtime_destination = 'pay' THEN t.hours_raw ELSE 0 END) as overtime_to_pay,
        COUNT(CASE WHEN t.overtime_destination = 'pending' THEN 1 END) as decisions_pending,
        b.current_balance
    FROM hour_bank_transactions t
    INNER JOIN users u ON t.user_id = u.user_id
    LEFT JOIN hour_bank_balances b ON t.company_id = b.company_id AND t.user_id = b.user_id
    WHERE t.created_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY t.company_id, u.branch_id, u.department_id, t.user_id,
             u."firstName", u."lastName", u.display_name, u.legajo, u."employeeId", b.current_balance
)
SELECT
    company_id,
    branch_id,
    department_id,
    user_id,
    user_name,
    legajo,
    hours_accrued,
    hours_used,
    overtime_to_bank,
    overtime_to_pay,
    CASE WHEN (overtime_to_bank + overtime_to_pay) > 0
        THEN ROUND((overtime_to_bank / (overtime_to_bank + overtime_to_pay)) * 100, 1)
        ELSE 0
    END as bank_ratio_pct,
    decisions_pending,
    COALESCE(current_balance, 0) as current_balance
FROM user_metrics;


-- 12. COMENTARIOS FINALES
-- ============================================================================
COMMENT ON TABLE hour_bank_budgets IS 'Presupuestos de horas por periodo para empresa/sucursal/departamento';
COMMENT ON TABLE hour_bank_risk_analysis IS 'Analisis de riesgo y salud de cuenta corriente por empleado';
COMMENT ON TABLE hour_bank_metrics_aggregated IS 'Metricas agregadas para drill-down en dashboards';
COMMENT ON VIEW vw_hour_bank_drilldown IS 'Vista consolidada para reportes con drill-down jerarquico';
