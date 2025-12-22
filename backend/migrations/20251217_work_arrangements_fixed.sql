/*
 * ================================================================
 * MIGRACIÓN CORREGIDA: Sistema de Modalidades de Trabajo + Detección de Presencia Remota
 * ================================================================
 * CORRIGE: Referencias a company_id, user_id (UUID), sin tabla employees
 */

-- ========================================
-- TABLA 1: CATÁLOGO DE MODALIDADES DE TRABAJO (GLOBAL)
-- ========================================
CREATE TABLE IF NOT EXISTS work_arrangement_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  icon VARCHAR(10),
  category VARCHAR(50) NOT NULL,
  requires_physical_attendance BOOLEAN DEFAULT true,
  requires_gps_tracking BOOLEAN DEFAULT false,
  allows_flexible_hours BOOLEAN DEFAULT false,
  requires_webcam_presence_detection BOOLEAN DEFAULT false,
  minimum_presence_days_per_week INTEGER,
  maximum_remote_days_per_week INTEGER,
  tax_classification VARCHAR(50),
  requires_contract_type VARCHAR(50),
  compliance_requirements JSONB DEFAULT '{}'::jsonb,
  usable_during_pandemic BOOLEAN DEFAULT false,
  usable_during_emergency BOOLEAN DEFAULT false,
  fallback_arrangement_id INTEGER REFERENCES work_arrangement_types(id),
  iso_30414_aligned BOOLEAN DEFAULT true,
  iso_30414_category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales
INSERT INTO work_arrangement_types (
  code, name, name_en, icon, category,
  requires_physical_attendance, requires_gps_tracking, allows_flexible_hours,
  requires_webcam_presence_detection, usable_during_pandemic, iso_30414_category
) VALUES
('presencial', 'Trabajo Presencial', 'On-site Work', '🏢', 'employee', true, true, false, false, false, 'workforce_availability'),
('remoto', 'Trabajo Remoto 100%', 'Remote Work', '🏠', 'employee', false, false, true, true, true, 'flexible_work'),
('hibrido', 'Trabajo Híbrido', 'Hybrid Work', '🔀', 'hybrid', true, false, true, true, true, 'flexible_work'),
('freelance', 'Freelance', 'Freelance Worker', '💼', 'contingent_worker', false, false, true, false, true, 'contingent_workforce'),
('contractor', 'Contratista (C2C)', 'Contractor', '👔', 'contingent_worker', false, false, true, false, true, 'contingent_workforce'),
('temporal', 'Temporal / Estacional', 'Temporary Worker', '⏱️', 'contingent_worker', true, true, false, false, false, 'contingent_workforce'),
('pasante', 'Pasante / Intern', 'Intern', '🎓', 'employee', true, false, false, false, false, 'workforce_availability')
ON CONFLICT (code) DO NOTHING;

UPDATE work_arrangement_types SET minimum_presence_days_per_week = 2, maximum_remote_days_per_week = 3 WHERE code = 'hibrido';

-- ========================================
-- TABLA 2: POLÍTICAS POR EMPRESA Y MODALIDAD
-- ========================================
CREATE TABLE IF NOT EXISTS work_arrangement_policies (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  work_arrangement_type_id INTEGER NOT NULL REFERENCES work_arrangement_types(id),
  policy_name VARCHAR(200),
  description TEXT,
  min_hours_per_day DECIMAL(4,2),
  max_hours_per_day DECIMAL(4,2),
  flexible_schedule BOOLEAN DEFAULT false,
  core_hours_start TIME,
  core_hours_end TIME,
  min_office_days_per_week INTEGER,
  max_remote_days_per_week INTEGER,
  required_office_days VARCHAR(50)[],
  requires_daily_checkin BOOLEAN DEFAULT false,
  requires_gps_verification BOOLEAN DEFAULT false,
  requires_vpn BOOLEAN DEFAULT false,
  requires_time_tracking_tool BOOLEAN DEFAULT false,
  enable_webcam_presence_detection BOOLEAN DEFAULT false,
  webcam_detection_interval_minutes INTEGER DEFAULT 30,
  webcam_absence_retry_minutes INTEGER DEFAULT 5,
  webcam_absence_threshold_minutes INTEGER DEFAULT 10,
  webcam_detection_azure_face BOOLEAN DEFAULT true,
  webcam_respect_break_periods BOOLEAN DEFAULT true,
  webcam_image_retention_days INTEGER DEFAULT 30,
  requires_explicit_consent BOOLEAN DEFAULT true,
  includes_office_space BOOLEAN DEFAULT true,
  includes_remote_stipend BOOLEAN DEFAULT false,
  remote_stipend_amount DECIMAL(10,2),
  includes_commute_allowance BOOLEAN DEFAULT false,
  commute_allowance_amount DECIMAL(10,2),
  pandemic_override_arrangement_id INTEGER REFERENCES work_arrangement_types(id),
  emergency_override_arrangement_id INTEGER REFERENCES work_arrangement_types(id),
  gdpr_compliant BOOLEAN DEFAULT true,
  bipa_compliant BOOLEAN DEFAULT true,
  argentina_ley_25326_compliant BOOLEAN DEFAULT true,
  consent_document_template_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, work_arrangement_type_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_policies_company ON work_arrangement_policies(company_id);

-- ========================================
-- TABLA 3: ASIGNACIÓN A EMPLEADO (USER)
-- ========================================
CREATE TABLE IF NOT EXISTS user_work_arrangements (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,
  work_arrangement_type_id INTEGER NOT NULL REFERENCES work_arrangement_types(id),
  source VARCHAR(20) DEFAULT 'manual',
  effective_from DATE NOT NULL,
  effective_until DATE,
  office_days VARCHAR(50)[],
  remote_days VARCHAR(50)[],
  custom_schedule JSONB,
  requires_webcam_consent BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(user_id),
  approved_at TIMESTAMP,
  approval_reason TEXT,
  is_contingency_mode BOOLEAN DEFAULT false,
  contingency_type VARCHAR(50),
  contingency_start_date DATE,
  contingency_end_date DATE,
  contingency_reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_wa_user ON user_work_arrangements(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_wa_dates ON user_work_arrangements(effective_from, effective_until);

-- ========================================
-- TABLA 4: DETECCIONES DE PRESENCIA REMOTA
-- ========================================
CREATE TABLE IF NOT EXISTS remote_presence_detections (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,
  attendance_id INTEGER,
  detection_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  shift_start_time TIME,
  shift_end_time TIME,
  break_periods JSONB,
  presence_detected BOOLEAN NOT NULL,
  detection_method VARCHAR(50) DEFAULT 'azure_face_api',
  azure_face_id VARCHAR(100),
  azure_confidence_score DECIMAL(5,4),
  azure_response_time_ms INTEGER,
  azure_api_version VARCHAR(20),
  capture_type VARCHAR(50) DEFAULT 'random',
  is_during_break_period BOOLEAN DEFAULT false,
  image_hash VARCHAR(64),
  image_stored BOOLEAN DEFAULT false,
  image_storage_path VARCHAR(500),
  image_retention_until TIMESTAMP,
  image_deleted BOOLEAN DEFAULT false,
  image_deleted_at TIMESTAMP,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_presence_user_date ON remote_presence_detections(user_id, DATE(detection_timestamp));
CREATE INDEX IF NOT EXISTS idx_presence_not_detected ON remote_presence_detections(user_id, presence_detected) WHERE presence_detected = false;

-- ========================================
-- TABLA 5: VIOLACIONES DE PRESENCIA
-- ========================================
CREATE TABLE IF NOT EXISTS remote_presence_violations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,
  attendance_id INTEGER,
  absence_start_timestamp TIMESTAMP NOT NULL,
  absence_end_timestamp TIMESTAMP,
  absence_duration_minutes INTEGER,
  first_failed_detection_id INTEGER REFERENCES remote_presence_detections(id),
  last_failed_detection_id INTEGER REFERENCES remote_presence_detections(id),
  total_failed_attempts INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'open',
  justified_by UUID REFERENCES users(user_id),
  justification_reason TEXT,
  justification_date TIMESTAMP,
  supervisor_notified BOOLEAN DEFAULT false,
  supervisor_notified_at TIMESTAMP,
  supervisor_id UUID REFERENCES users(user_id),
  hr_notified BOOLEAN DEFAULT false,
  hr_notified_at TIMESTAMP,
  action_taken VARCHAR(50),
  action_taken_by UUID REFERENCES users(user_id),
  action_taken_at TIMESTAMP,
  action_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_violations_user ON remote_presence_violations(user_id, status);

-- ========================================
-- TABLA 6: PLANES DE CONTINGENCIA
-- ========================================
CREATE TABLE IF NOT EXISTS work_arrangement_contingency_plans (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  contingency_type VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  auto_activate BOOLEAN DEFAULT false,
  activation_criteria JSONB,
  force_work_arrangement_id INTEGER REFERENCES work_arrangement_types(id),
  affected_departments INTEGER[],
  exempted_roles TEXT[],
  notify_all_employees BOOLEAN DEFAULT true,
  notify_supervisors BOOLEAN DEFAULT true,
  notify_hr BOOLEAN DEFAULT true,
  notification_message TEXT,
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMP,
  deactivated_at TIMESTAMP,
  activated_by UUID REFERENCES users(user_id),
  deactivated_by UUID REFERENCES users(user_id),
  auto_revert_enabled BOOLEAN DEFAULT false,
  auto_revert_after_days INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contingency_company ON work_arrangement_contingency_plans(company_id, is_active);

-- ========================================
-- TABLA 7: HISTORIAL DE CAMBIOS
-- ========================================
CREATE TABLE IF NOT EXISTS work_arrangement_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  company_id INTEGER NOT NULL,
  previous_arrangement_id INTEGER REFERENCES work_arrangement_types(id),
  new_arrangement_id INTEGER NOT NULL REFERENCES work_arrangement_types(id),
  change_reason VARCHAR(50) NOT NULL,
  change_reason_detail TEXT,
  changed_by UUID REFERENCES users(user_id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reported_in_hcr BOOLEAN DEFAULT false,
  hcr_period VARCHAR(20),
  iso_30414_category VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_wa_history_user ON work_arrangement_history(user_id);

-- ========================================
-- TABLA 8: CONSENTIMIENTOS DE WEBCAM
-- ========================================
CREATE TABLE IF NOT EXISTS webcam_monitoring_consents (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,
  consent_version VARCHAR(20) DEFAULT '1.0',
  consent_type VARCHAR(50) DEFAULT 'remote_webcam_monitoring',
  status VARCHAR(20) DEFAULT 'pending',
  consented_at TIMESTAMP,
  consent_ip_address VARCHAR(45),
  consent_user_agent TEXT,
  declined_at TIMESTAMP,
  decline_reason TEXT,
  revoked_at TIMESTAMP,
  revoke_reason TEXT,
  alternative_method VARCHAR(50),
  country_code VARCHAR(10),
  legal_framework VARCHAR(100),
  full_text_hash VARCHAR(64),
  signature_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, company_id, consent_version)
);

CREATE INDEX IF NOT EXISTS idx_webcam_consent_user ON webcam_monitoring_consents(user_id, status);

-- ========================================
-- FUNCIONES HELPER
-- ========================================

-- Función: Verificar consentimiento de webcam
CREATE OR REPLACE FUNCTION has_webcam_consent(p_user_id UUID, p_company_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM webcam_monitoring_consents
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener modalidad actual del usuario
CREATE OR REPLACE FUNCTION get_user_work_arrangement(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  arrangement_code VARCHAR,
  arrangement_name VARCHAR,
  is_remote BOOLEAN,
  requires_webcam BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wat.code::VARCHAR,
    wat.name::VARCHAR,
    (NOT wat.requires_physical_attendance)::BOOLEAN,
    wat.requires_webcam_presence_detection::BOOLEAN
  FROM user_work_arrangements uwa
  JOIN work_arrangement_types wat ON uwa.work_arrangement_type_id = wat.id
  WHERE uwa.user_id = p_user_id
    AND uwa.is_active = true
    AND uwa.effective_from <= p_date
    AND (uwa.effective_until IS NULL OR uwa.effective_until >= p_date)
  ORDER BY uwa.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función: Determinar si día es remoto (para híbrido)
CREATE OR REPLACE FUNCTION is_remote_day_for_user(p_user_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
  v_arrangement RECORD;
  v_day_name VARCHAR(20);
BEGIN
  v_day_name := LOWER(TRIM(TO_CHAR(p_date, 'Day')));

  SELECT
    uwa.remote_days,
    wat.code as arrangement_code
  INTO v_arrangement
  FROM user_work_arrangements uwa
  JOIN work_arrangement_types wat ON uwa.work_arrangement_type_id = wat.id
  WHERE uwa.user_id = p_user_id
    AND uwa.is_active = true
    AND uwa.effective_from <= p_date
    AND (uwa.effective_until IS NULL OR uwa.effective_until >= p_date)
  ORDER BY uwa.effective_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_arrangement.arrangement_code = 'remoto' THEN
    RETURN true;
  ELSIF v_arrangement.arrangement_code = 'presencial' THEN
    RETURN false;
  ELSIF v_arrangement.arrangement_code = 'hibrido' THEN
    RETURN v_day_name = ANY(v_arrangement.remote_days);
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular estadísticas diarias de presencia
CREATE OR REPLACE FUNCTION get_daily_presence_stats(p_user_id UUID, p_date DATE)
RETURNS TABLE(
  total_detections INTEGER,
  successful_detections INTEGER,
  failed_detections INTEGER,
  presence_percentage DECIMAL,
  violation_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE presence_detected = true)::INTEGER,
    COUNT(*) FILTER (WHERE presence_detected = false AND NOT is_during_break_period)::INTEGER,
    ROUND((COUNT(*) FILTER (WHERE presence_detected = true)::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 2),
    (SELECT COUNT(*)::INTEGER FROM remote_presence_violations rpv
     WHERE rpv.user_id = p_user_id AND DATE(rpv.absence_start_timestamp) = p_date)
  FROM remote_presence_detections
  WHERE user_id = p_user_id
    AND DATE(detection_timestamp) = p_date;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGER: Registrar cambios en historial
-- ========================================
CREATE OR REPLACE FUNCTION log_work_arrangement_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.work_arrangement_type_id != NEW.work_arrangement_type_id THEN
    INSERT INTO work_arrangement_history (
      user_id, company_id, previous_arrangement_id, new_arrangement_id,
      change_reason, change_reason_detail, changed_by, changed_at
    ) VALUES (
      NEW.user_id, NEW.company_id, OLD.work_arrangement_type_id, NEW.work_arrangement_type_id,
      CASE WHEN NEW.is_contingency_mode THEN 'contingency' ELSE 'policy_change' END,
      NEW.approval_reason, NEW.approved_by, CURRENT_TIMESTAMP
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_work_arrangement_change ON user_work_arrangements;
CREATE TRIGGER trg_log_work_arrangement_change
AFTER UPDATE ON user_work_arrangements
FOR EACH ROW
EXECUTE FUNCTION log_work_arrangement_change();

-- ========================================
-- VISTA: Resumen de modalidades por empresa
-- ========================================
CREATE OR REPLACE VIEW v_company_work_arrangements_summary AS
SELECT
  uwa.company_id,
  wat.code as arrangement_code,
  wat.name as arrangement_name,
  wat.icon,
  COUNT(DISTINCT uwa.user_id) as employee_count,
  wat.requires_webcam_presence_detection as requires_webcam
FROM user_work_arrangements uwa
JOIN work_arrangement_types wat ON uwa.work_arrangement_type_id = wat.id
WHERE uwa.is_active = true
  AND (uwa.effective_until IS NULL OR uwa.effective_until >= CURRENT_DATE)
GROUP BY uwa.company_id, wat.code, wat.name, wat.icon, wat.requires_webcam_presence_detection;

-- ========================================
-- FIN DE MIGRACIÓN
-- ========================================
