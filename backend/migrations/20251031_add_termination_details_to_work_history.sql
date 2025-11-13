-- ============================================================================
-- MIGRACIÓN: Campos Detallados de Desvinculación y Litigios
-- Fecha: 2025-10-31
-- Descripción: Expande user_work_history con información detallada de
--              desvinculación laboral, indemnizaciones, acuerdos y litigios
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR CAMPOS DE DESVINCULACIÓN DETALLADA
-- ============================================================================

-- Tipo de desvinculación (más granular que reason_for_leaving)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS termination_type VARCHAR(100)
CHECK (termination_type IN (
    'renuncia_voluntaria',
    'despido_con_causa',
    'despido_sin_causa',
    'jubilacion',
    'mutual_agreement',
    'fin_contrato',
    'abandono',
    'fallecimiento',
    'otro'
));

-- Subcategoría del tipo de desvinculación
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS termination_subcategory VARCHAR(255);

-- Fecha efectiva de desvinculación (puede diferir de end_date por períodos de preaviso)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS termination_date DATE;

-- Período de preaviso
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS notice_period_days INTEGER;

-- Si cumplió el preaviso completo
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS notice_period_completed BOOLEAN DEFAULT true;

-- Notas adicionales sobre el preaviso
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS notice_period_notes TEXT;

-- ============================================================================
-- 2. INFORMACIÓN DE INDEMNIZACIÓN / LIQUIDACIÓN
-- ============================================================================

-- Si recibió indemnización
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS received_severance BOOLEAN DEFAULT false;

-- Monto de indemnización (en moneda local)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS severance_amount DECIMAL(12,2);

-- Moneda de la indemnización
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS severance_currency VARCHAR(10) DEFAULT 'ARS';

-- Fecha de pago de indemnización
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS severance_payment_date DATE;

-- Método de pago (transferencia, cheque, efectivo)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS severance_payment_method VARCHAR(50)
CHECK (severance_payment_method IN ('transferencia', 'cheque', 'efectivo', 'compensacion', 'otro'));

-- Conceptos incluidos en la liquidación
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS severance_breakdown JSON;
-- Ejemplo: {"antiguedad": 15000, "preaviso": 8000, "vacaciones": 3000, "sac": 2000}

-- URL del recibo de liquidación final
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS severance_receipt_url TEXT;

-- ============================================================================
-- 3. ACUERDOS EXTRAJUDICIALES
-- ============================================================================

-- Si hubo acuerdo extrajudicial
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS has_settlement_agreement BOOLEAN DEFAULT false;

-- Fecha del acuerdo
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS settlement_date DATE;

-- Tipo de acuerdo
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(100)
CHECK (settlement_type IN ('conciliatorio', 'transaccional', 'homologacion_ministerial', 'privado', 'otro'));

-- Monto adicional del acuerdo (si aplica)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS settlement_amount DECIMAL(12,2);

-- Términos resumidos del acuerdo
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS settlement_terms TEXT;

-- URL del documento de acuerdo escaneado
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS settlement_document_url TEXT;

-- Organismo/institución donde se homologó (si aplica)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS settlement_authority VARCHAR(255);

-- Número de expediente/trámite del acuerdo
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS settlement_file_number VARCHAR(100);

-- ============================================================================
-- 4. INFORMACIÓN DE LITIGIOS
-- ============================================================================

-- Si hubo litigio judicial
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS has_litigation BOOLEAN DEFAULT false;

-- Estado del litigio
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS litigation_status VARCHAR(50)
CHECK (litigation_status IN ('en_tramite', 'mediacion', 'conciliacion', 'sentencia_favorable', 'sentencia_desfavorable', 'apelacion', 'finalizado', 'desistido'));

-- Fecha de inicio del litigio
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS litigation_start_date DATE;

-- Fecha de finalización del litigio
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS litigation_end_date DATE;

-- Juzgado/tribunal
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS litigation_court VARCHAR(255);

-- Número de expediente judicial
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS litigation_case_number VARCHAR(100);

-- Materia del reclamo (despido, diferencias salariales, accidente laboral, etc.)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS litigation_subject VARCHAR(255);

-- Monto reclamado
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS litigation_claimed_amount DECIMAL(12,2);

-- Monto de la sentencia/resolución final
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS litigation_awarded_amount DECIMAL(12,2);

-- Resumen del resultado del litigio
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS litigation_outcome_summary TEXT;

-- Abogado/estudio jurídico que representó a la empresa
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS company_legal_representative VARCHAR(255);

-- Abogado que representó al empleado (si se conoce)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS employee_legal_representative VARCHAR(255);

-- ============================================================================
-- 5. DOCUMENTACIÓN Y EVIDENCIA
-- ============================================================================

-- Telegrama de despido / carta renuncia URL
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS termination_letter_url TEXT;

-- Certificado de trabajo URL
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS work_certificate_url TEXT;

-- Certificación de haberes URL
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS salary_certification_url TEXT;

-- URLs de documentos adicionales (JSON array)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS additional_documents JSON;
-- Ejemplo: [{"name": "Acta notarial", "url": "..."}, {"name": "Pericia médica", "url": "..."}]

-- ============================================================================
-- 6. NOTAS Y SEGUIMIENTO INTERNO
-- ============================================================================

-- Observaciones internas sobre la desvinculación
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Si el empleado es elegible para recontratación
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS eligible_for_rehire BOOLEAN DEFAULT true;

-- Razón de no elegibilidad (si aplica)
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS rehire_ineligibility_reason TEXT;

-- Si se envió carta de recomendación
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS recommendation_letter_sent BOOLEAN DEFAULT false;

-- URL de la carta de recomendación
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS recommendation_letter_url TEXT;

-- Última actualización del registro
ALTER TABLE user_work_history
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES users(user_id);

-- ============================================================================
-- 7. COMENTARIOS DE CAMPOS
-- ============================================================================

COMMENT ON COLUMN user_work_history.termination_type IS 'Tipo de desvinculación laboral';
COMMENT ON COLUMN user_work_history.termination_date IS 'Fecha efectiva de fin de relación laboral';
COMMENT ON COLUMN user_work_history.received_severance IS 'Si recibió indemnización por despido';
COMMENT ON COLUMN user_work_history.severance_amount IS 'Monto total de la indemnización';
COMMENT ON COLUMN user_work_history.severance_breakdown IS 'Desglose de conceptos de la liquidación';
COMMENT ON COLUMN user_work_history.has_settlement_agreement IS 'Si hubo acuerdo extrajudicial';
COMMENT ON COLUMN user_work_history.settlement_type IS 'Tipo de acuerdo: conciliatorio, transaccional, homologación, etc.';
COMMENT ON COLUMN user_work_history.has_litigation IS 'Si existió litigio judicial';
COMMENT ON COLUMN user_work_history.litigation_status IS 'Estado actual del litigio';
COMMENT ON COLUMN user_work_history.litigation_case_number IS 'Número de expediente judicial';
COMMENT ON COLUMN user_work_history.litigation_outcome_summary IS 'Resumen del resultado del proceso judicial';
COMMENT ON COLUMN user_work_history.eligible_for_rehire IS 'Si el ex-empleado es elegible para recontratación';
COMMENT ON COLUMN user_work_history.internal_notes IS 'Notas internas sobre el caso (confidenciales)';

-- ============================================================================
-- 8. ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_work_history_termination_type ON user_work_history(termination_type);
CREATE INDEX IF NOT EXISTS idx_work_history_termination_date ON user_work_history(termination_date) WHERE termination_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_history_has_litigation ON user_work_history(has_litigation) WHERE has_litigation = true;
CREATE INDEX IF NOT EXISTS idx_work_history_litigation_status ON user_work_history(litigation_status) WHERE litigation_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_history_eligible_rehire ON user_work_history(eligible_for_rehire);

-- ============================================================================
-- 9. FUNCIÓN: Obtener estadísticas de desvinculación por empresa
-- ============================================================================

CREATE OR REPLACE FUNCTION get_termination_stats_by_company(p_company_id INTEGER)
RETURNS TABLE (
    total_terminations BIGINT,
    voluntary_resignations BIGINT,
    terminations_with_cause BIGINT,
    terminations_without_cause BIGINT,
    mutual_agreements BIGINT,
    retirements BIGINT,
    active_litigations BIGINT,
    settled_litigations BIGINT,
    total_severance_paid NUMERIC,
    total_litigation_awards NUMERIC,
    avg_severance_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) AS total_terminations,
        COUNT(*) FILTER (WHERE termination_type = 'renuncia_voluntaria') AS voluntary_resignations,
        COUNT(*) FILTER (WHERE termination_type = 'despido_con_causa') AS terminations_with_cause,
        COUNT(*) FILTER (WHERE termination_type = 'despido_sin_causa') AS terminations_without_cause,
        COUNT(*) FILTER (WHERE termination_type = 'mutual_agreement') AS mutual_agreements,
        COUNT(*) FILTER (WHERE termination_type = 'jubilacion') AS retirements,
        COUNT(*) FILTER (WHERE has_litigation = true AND litigation_status IN ('en_tramite', 'mediacion', 'apelacion')) AS active_litigations,
        COUNT(*) FILTER (WHERE has_litigation = true AND litigation_status = 'finalizado') AS settled_litigations,
        COALESCE(SUM(severance_amount), 0) AS total_severance_paid,
        COALESCE(SUM(litigation_awarded_amount), 0) AS total_litigation_awards,
        COALESCE(AVG(severance_amount), 0) AS avg_severance_amount
    FROM user_work_history
    WHERE company_id = p_company_id
        AND end_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_termination_stats_by_company IS 'Obtiene estadísticas de desvinculación para una empresa específica';

-- ============================================================================
-- 10. FUNCIÓN: Obtener empleados con litigios activos
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_litigations(p_company_id INTEGER DEFAULT NULL)
RETURNS TABLE (
    work_history_id INTEGER,
    user_id UUID,
    company_id INTEGER,
    usuario VARCHAR,
    full_name VARCHAR,
    company_name VARCHAR,
    position VARCHAR,
    termination_date DATE,
    litigation_status VARCHAR,
    litigation_start_date DATE,
    litigation_case_number VARCHAR,
    litigation_claimed_amount NUMERIC,
    litigation_court VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wh.id AS work_history_id,
        wh.user_id,
        wh.company_id,
        u.usuario,
        CONCAT(u."firstName", ' ', u."lastName") AS full_name,
        wh.company_name,
        wh.position,
        wh.termination_date,
        wh.litigation_status,
        wh.litigation_start_date,
        wh.litigation_case_number,
        wh.litigation_claimed_amount,
        wh.litigation_court
    FROM user_work_history wh
    INNER JOIN users u ON wh.user_id = u.user_id
    WHERE wh.has_litigation = true
        AND wh.litigation_status IN ('en_tramite', 'mediacion', 'conciliacion', 'apelacion')
        AND (p_company_id IS NULL OR wh.company_id = p_company_id)
    ORDER BY wh.litigation_start_date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_litigations IS 'Obtiene todos los litigios laborales activos (en trámite)';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

-- NOTAS:
-- 1. Esta migración agrega 40+ campos para tracking completo de desvinculaciones
-- 2. Incluye soporte para indemnizaciones, acuerdos extrajudiciales y litigios judiciales
-- 3. Funciones auxiliares para reportes y estadísticas de RRHH
-- 4. Campos JSON para desglose de pagos y documentos adicionales
-- 5. Flags para elegibilidad de recontratación y seguimiento interno
