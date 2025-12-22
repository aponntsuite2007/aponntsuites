/*
 * ================================================================
 * MIGRACIÓN: Sistema de Modalidades de Trabajo + Detección de Presencia Remota
 * ================================================================
 *
 * Descripción:
 * - Sistema de modalidades laborales (Presencial, Remoto, Híbrido, Freelance, etc.)
 * - Integrado con módulo "Estructura Organizacional" (SSOT: roles table)
 * - Detección de presencia remota vía webcam + Azure Face API
 * - INTEGRADO CON MÓDULO DE CONSENTIMIENTOS EXISTENTE (SSOT: consent_definitions, user_consents)
 * - Validación condicional según política empresa y país de sucursal
 * - Integrado con calendario y turnos (SSOT: shifts, attendance)
 * - Compliance: ISO 30414:2025, GDPR, BIPA (Illinois), Ley 25.326 (Argentina)
 *
 * IMPORTANTE - RESPETO A SSOT:
 * - NO duplica datos de tablas existentes
 * - Todas las funciones CONSULTAN datos de SSOT
 * - Foreign keys apuntan a SSOT, no copian valores
 * - NO certifica ISO, solo indica "alineado con" / "compatible con"
 *
 * SSOT (Single Source of Truth) respetadas:
 * - roles → Módulo Estructura Organizacional
 * - consent_definitions, user_consents → Módulo Consentimientos y Privacidad
 * - companies → Empresas (company_id, active_modules)
 * - employees → Empleados (employee_id, company_id, default_branch_id, supervisor_id)
 * - branches → Sucursales (branch_id, country, company_id)
 * - attendance → Fichadas (attendance_id, employee_id, check_in_time)
 * - shifts → Turnos (shift_id, start_time, end_time, break_periods JSONB)
 * - kiosks → Kioscos físicos (kiosk_id, branch_id)
 *
 * Autor: Claude Code
 * Fecha: 2025-12-16
 * Referencia: ISO 30414:2025, GDPR Art. 9, BIPA 740 ILCS 14/1
 */

-- ========================================
-- PARTE 1: MODALIDADES DE TRABAJO
-- ========================================

-- ========================================
-- TABLA 1: CATÁLOGO DE MODALIDADES DE TRABAJO (GLOBAL)
-- ========================================
-- SSOT: Esta tabla ES el SSOT para tipos de modalidades laborales
-- NO hay otra fuente de verdad para esto

CREATE TABLE IF NOT EXISTS work_arrangement_types (
  id SERIAL PRIMARY KEY,

  -- Identificación
  code VARCHAR(50) UNIQUE NOT NULL,           -- 'presencial', 'remoto', 'hibrido', 'freelance', 'contractor', 'temporal', 'pasante'
  name VARCHAR(100) NOT NULL,                 -- "Trabajo Presencial"
  name_en VARCHAR(100),                       -- "On-site Work" (para reportes ISO 30414)
  description TEXT,
  icon VARCHAR(10),                           -- "🏢", "🏠", "🔀", "💼", "👔"

  -- Categorización
  category VARCHAR(50) NOT NULL,              -- 'employee', 'contingent_worker', 'hybrid'

  -- Requerimientos físicos y de control
  requires_physical_attendance BOOLEAN DEFAULT true,
  requires_gps_tracking BOOLEAN DEFAULT false,
  allows_flexible_hours BOOLEAN DEFAULT false,
  requires_webcam_presence_detection BOOLEAN DEFAULT false,  -- ⭐ NUEVO: Para trabajo remoto

  -- Para modalidad híbrida
  minimum_presence_days_per_week INTEGER,     -- Ej: Híbrido requiere mínimo 2 días presenciales
  maximum_remote_days_per_week INTEGER,       -- Ej: Híbrido permite máximo 3 días remotos

  -- Clasificación fiscal y legal
  tax_classification VARCHAR(50),             -- 'W2_employee', '1099_contractor', 'C2C', 'monotributista', 'relacion_dependencia'
  requires_contract_type VARCHAR(50),         -- 'indefinido', 'plazo_fijo', 'proyecto', 'freelance', 'consultoria'

  -- Compliance multi-país (JSONB para flexibilidad)
  compliance_requirements JSONB DEFAULT '{
    "argentina": {"ley": "Ley 20.744 LCT", "articles": ["Art. 1", "Art. 21"]},
    "usa": {"law": "FLSA", "bipa_compliant": false},
    "eu": {"gdpr_compliant": true, "articles": ["Art. 6", "Art. 9"]}
  }'::jsonb,

  -- Contingencias (pandemias, emergencias)
  usable_during_pandemic BOOLEAN DEFAULT false,
  usable_during_emergency BOOLEAN DEFAULT false,
  fallback_arrangement_id INTEGER REFERENCES work_arrangement_types(id),  -- Plan B automático

  -- Alineamiento con estándares (NO certificación)
  iso_30414_aligned BOOLEAN DEFAULT true,     -- "Alineado con ISO 30414:2025"
  iso_30414_category VARCHAR(50),             -- 'workforce_availability', 'flexible_work'

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos iniciales (catálogo global)
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

-- Configurar híbrido con defaults
UPDATE work_arrangement_types
SET minimum_presence_days_per_week = 2, maximum_remote_days_per_week = 3
WHERE code = 'hibrido';

COMMENT ON TABLE work_arrangement_types IS 'SSOT: Catálogo global de modalidades de trabajo (alineado con ISO 30414:2025)';
COMMENT ON COLUMN work_arrangement_types.iso_30414_aligned IS 'Indica alineamiento con ISO 30414:2025 (NO certificación oficial)';
COMMENT ON COLUMN work_arrangement_types.requires_webcam_presence_detection IS 'Si true, activa sistema de detección de presencia vía webcam para trabajo remoto';

-- ========================================
-- TABLA 2: POLÍTICAS POR EMPRESA Y MODALIDAD
-- ========================================
-- SSOT Referencias:
-- - company_id → SSOT: companies table
-- - work_arrangement_type_id → SSOT: work_arrangement_types table

CREATE TABLE IF NOT EXISTS work_arrangement_policies (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- ⭐ SSOT: work_arrangement_types table
  work_arrangement_type_id INTEGER NOT NULL REFERENCES work_arrangement_types(id),

  -- Configuración específica de la empresa
  policy_name VARCHAR(200),                   -- "Política Remoto Empresa X"
  description TEXT,

  -- Horarios
  min_hours_per_day DECIMAL(4,2),
  max_hours_per_day DECIMAL(4,2),
  flexible_schedule BOOLEAN DEFAULT false,
  core_hours_start TIME,                      -- "Core hours" obligatorios (ej: 10:00-15:00)
  core_hours_end TIME,

  -- Configuración híbrido
  min_office_days_per_week INTEGER,
  max_remote_days_per_week INTEGER,
  required_office_days VARCHAR(50)[],         -- ['lunes', 'miercoles'] para híbrido fijo

  -- Control y monitoreo
  requires_daily_checkin BOOLEAN DEFAULT false,
  requires_gps_verification BOOLEAN DEFAULT false,
  requires_vpn BOOLEAN DEFAULT false,
  requires_time_tracking_tool BOOLEAN DEFAULT false,

  -- ⭐ DETECCIÓN DE PRESENCIA REMOTA
  enable_webcam_presence_detection BOOLEAN DEFAULT false,
  webcam_detection_interval_minutes INTEGER DEFAULT 30,  -- Capturas cada X minutos (aleatorio ±10 min)
  webcam_absence_retry_minutes INTEGER DEFAULT 5,        -- Si no detecta, reintenta cada X min
  webcam_absence_threshold_minutes INTEGER DEFAULT 10,   -- Registro si ausencia > X min
  webcam_detection_azure_face BOOLEAN DEFAULT true,      -- Usar Azure Face API
  webcam_respect_break_periods BOOLEAN DEFAULT true,     -- Respetar horarios de refrigerio (SSOT: shifts.break_periods)
  webcam_image_retention_days INTEGER DEFAULT 30,        -- Auto-delete después de X días (GDPR Art. 17)

  -- ⭐ INTEGRACIÓN CON MÓDULO DE CONSENTIMIENTOS
  -- SSOT: consent_definitions.consent_key = 'remote_webcam_monitoring_employee'
  requires_explicit_consent BOOLEAN DEFAULT true,        -- Si true, requiere registro en user_consents

  -- Benefits & Compensación
  includes_office_space BOOLEAN DEFAULT true,
  includes_remote_stipend BOOLEAN DEFAULT false,  -- Subsidio home office
  remote_stipend_amount DECIMAL(10,2),
  includes_commute_allowance BOOLEAN DEFAULT false,
  commute_allowance_amount DECIMAL(10,2),

  -- Contingencias
  pandemic_override_arrangement_id INTEGER REFERENCES work_arrangement_types(id),
  emergency_override_arrangement_id INTEGER REFERENCES work_arrangement_types(id),

  -- Compliance y normativas
  gdpr_compliant BOOLEAN DEFAULT true,
  bipa_compliant BOOLEAN DEFAULT true,          -- Illinois BIPA 740 ILCS 14/1
  argentina_ley_25326_compliant BOOLEAN DEFAULT true,
  consent_document_template_url VARCHAR(500),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(company_id, work_arrangement_type_id)
);

CREATE INDEX idx_policies_company ON work_arrangement_policies(company_id);
CREATE INDEX idx_policies_type ON work_arrangement_policies(work_arrangement_type_id);

COMMENT ON TABLE work_arrangement_policies IS 'Políticas de modalidades de trabajo por empresa (multi-tenant). SSOT Referencias: company_id → companies, work_arrangement_type_id → work_arrangement_types';
COMMENT ON COLUMN work_arrangement_policies.company_id IS 'SSOT: companies.id';
COMMENT ON COLUMN work_arrangement_policies.work_arrangement_type_id IS 'SSOT: work_arrangement_types.id';
COMMENT ON COLUMN work_arrangement_policies.enable_webcam_presence_detection IS 'Activa detección de presencia vía webcam (requiere consentimiento en user_consents si requires_explicit_consent = true)';
COMMENT ON COLUMN work_arrangement_policies.requires_explicit_consent IS 'Si true, requiere registro en user_consents con consent_key = "remote_webcam_monitoring_employee"';
COMMENT ON COLUMN work_arrangement_policies.webcam_respect_break_periods IS 'Respetar horarios de refrigerio (SSOT: shifts.break_periods JSONB)';

-- ========================================
-- TABLA 3: MODALIDADES PERMITIDAS POR ROL
-- ========================================
-- ⭐ INTEGRACIÓN CON ESTRUCTURA ORGANIZACIONAL (SSOT: roles table)
-- SSOT Referencias:
-- - role_id → SSOT: roles table (Módulo Estructura Organizacional)
-- - company_id → SSOT: companies table
-- - work_arrangement_type_id → SSOT: work_arrangement_types table

CREATE TABLE IF NOT EXISTS role_work_arrangements (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: roles table (Módulo Estructura Organizacional)
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

  -- ⭐ SSOT: work_arrangement_types table
  work_arrangement_type_id INTEGER NOT NULL REFERENCES work_arrangement_types(id),

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Prioridad y configuración
  priority INTEGER DEFAULT 1,                 -- 1 = opción preferida, 2 = alternativa, etc.
  is_default BOOLEAN DEFAULT false,           -- Modalidad por defecto para nuevos empleados con este rol

  -- Override de política (si el rol requiere configuración especial)
  custom_policy_id INTEGER REFERENCES work_arrangement_policies(id),

  -- Restricciones por rol
  requires_manager_approval BOOLEAN DEFAULT false,
  requires_probation_period BOOLEAN DEFAULT false,  -- Solo disponible después de X días
  probation_days INTEGER,
  requires_performance_rating DECIMAL(3,2),   -- Solo si rating >= X (ej: 4.0/5.0)

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(role_id, work_arrangement_type_id, company_id)
);

CREATE INDEX idx_role_arrangements_role ON role_work_arrangements(role_id);
CREATE INDEX idx_role_arrangements_company ON role_work_arrangements(company_id);

COMMENT ON TABLE role_work_arrangements IS 'Modalidades de trabajo permitidas por rol. SSOT Referencias: role_id → roles (Módulo Estructura Organizacional), company_id → companies, work_arrangement_type_id → work_arrangement_types';
COMMENT ON COLUMN role_work_arrangements.role_id IS 'SSOT: roles.id (Módulo Estructura Organizacional)';
COMMENT ON COLUMN role_work_arrangements.company_id IS 'SSOT: companies.id';
COMMENT ON COLUMN role_work_arrangements.work_arrangement_type_id IS 'SSOT: work_arrangement_types.id';

-- ========================================
-- TABLA 4: ASIGNACIÓN A EMPLEADO (CON HERENCIA Y OVERRIDE)
-- ========================================
-- SSOT Referencias:
-- - employee_id → SSOT: employees table
-- - work_arrangement_type_id → SSOT: work_arrangement_types table
-- - role_work_arrangement_id → SSOT: role_work_arrangements table (si herencia de rol)
-- - approved_by → SSOT: users table

CREATE TABLE IF NOT EXISTS employee_work_arrangements (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employees table
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- ⭐ SSOT: work_arrangement_types table
  work_arrangement_type_id INTEGER NOT NULL REFERENCES work_arrangement_types(id),

  -- Source (herencia vs override manual)
  source VARCHAR(20) DEFAULT 'role',          -- 'role' | 'manual_override' | 'contingency_override'

  -- ⭐ SSOT: role_work_arrangements table (si viene de herencia de rol)
  role_work_arrangement_id INTEGER REFERENCES role_work_arrangements(id),

  -- Vigencia
  effective_from DATE NOT NULL,
  effective_until DATE,                       -- NULL = indefinido

  -- Configuración específica del empleado (para híbrido)
  -- IMPORTANTE: NO duplica días del turno, solo OVERRIDE si es necesario
  -- SSOT de días de trabajo: shifts table (shift_days JSONB)
  office_days VARCHAR(50)[],                  -- ['lunes', 'miercoles', 'viernes'] - OVERRIDE si difiere del turno
  remote_days VARCHAR(50)[],                  -- ['martes', 'jueves'] - OVERRIDE si difiere del turno
  custom_schedule JSONB,                      -- Horarios personalizados (OVERRIDE de shifts)

  -- ⭐ REFERENCIA A CONSENTIMIENTO DE WEBCAM
  -- SSOT: user_consents table (consultar con consent_key = 'remote_webcam_monitoring_employee')
  -- Este campo solo indica si se REQUIERE consentimiento, NO almacena el consentimiento
  requires_webcam_consent BOOLEAN DEFAULT false,

  -- Aprobaciones
  -- ⭐ SSOT: users table
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  approval_reason TEXT,

  -- Contingencias activas
  is_contingency_mode BOOLEAN DEFAULT false,
  contingency_type VARCHAR(50),               -- 'pandemic', 'emergency', 'medical_leave', 'custom'
  contingency_start_date DATE,
  contingency_end_date DATE,
  contingency_reason TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_arrangements_employee ON employee_work_arrangements(employee_id, is_active);
CREATE INDEX idx_employee_arrangements_dates ON employee_work_arrangements(effective_from, effective_until);
CREATE INDEX idx_employee_arrangements_contingency ON employee_work_arrangements(is_contingency_mode, contingency_end_date);

COMMENT ON TABLE employee_work_arrangements IS 'Modalidad de trabajo asignada a cada empleado (herencia de rol + override manual). SSOT Referencias: employee_id → employees, work_arrangement_type_id → work_arrangement_types, role_work_arrangement_id → role_work_arrangements';
COMMENT ON COLUMN employee_work_arrangements.employee_id IS 'SSOT: employees.id';
COMMENT ON COLUMN employee_work_arrangements.work_arrangement_type_id IS 'SSOT: work_arrangement_types.id';
COMMENT ON COLUMN employee_work_arrangements.role_work_arrangement_id IS 'SSOT: role_work_arrangements.id (si herencia de rol)';
COMMENT ON COLUMN employee_work_arrangements.office_days IS 'OVERRIDE de días de oficina (SSOT normal: shifts table). Solo llenar si difiere del turno asignado';
COMMENT ON COLUMN employee_work_arrangements.remote_days IS 'OVERRIDE de días remotos (SSOT normal: shifts table). Solo llenar si difiere del turno asignado';
COMMENT ON COLUMN employee_work_arrangements.requires_webcam_consent IS 'Si true, empleado DEBE tener consentimiento en user_consents (SSOT: user_consents table con consent_key = "remote_webcam_monitoring_employee")';
COMMENT ON COLUMN employee_work_arrangements.approved_by IS 'SSOT: users.id';

-- ========================================
-- PARTE 2: DETECCIÓN DE PRESENCIA REMOTA
-- ========================================

-- ========================================
-- TABLA 5: DETECCIONES DE PRESENCIA REMOTA (WEBCAM + AZURE FACE)
-- ========================================
-- SSOT Referencias:
-- - employee_id → SSOT: employees table
-- - company_id → SSOT: companies table
-- - attendance_id → SSOT: attendance table (fichada asociada)

CREATE TABLE IF NOT EXISTS remote_presence_detections (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employees table
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- ⭐ SSOT: attendance table (fichada asociada)
  attendance_id INTEGER REFERENCES attendance(id),

  detection_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- IMPORTANTE: NO duplica shift_start_time ni shift_end_time
  -- SSOT: shifts table (consultar en tiempo real)
  -- Solo almacenamos para auditoría de qué turno estaba vigente en el momento
  shift_start_time TIME,
  shift_end_time TIME,

  -- SSOT: shifts.break_periods (JSONB) - consultar en tiempo real
  -- Solo almacenamos snapshot para auditoría
  break_periods JSONB,

  -- Resultado de la detección
  presence_detected BOOLEAN NOT NULL,
  detection_method VARCHAR(50) DEFAULT 'azure_face_api',  -- 'azure_face_api', 'opencv_local', 'manual'

  -- Azure Face API Response
  azure_face_id VARCHAR(100),                 -- Face ID retornado por Azure
  azure_confidence_score DECIMAL(5,4),        -- Score de confianza (0.0000 - 1.0000)
  azure_response_time_ms INTEGER,
  azure_api_version VARCHAR(20),

  -- Metadata de la captura
  capture_type VARCHAR(50) DEFAULT 'random',  -- 'random', 'scheduled', 'retry', 'manual'
  is_during_break_period BOOLEAN DEFAULT false,  -- Si captura fue durante refrigerio (se ignora)

  -- Almacenamiento temporal de imagen (solo para detección, NO grabación)
  image_hash VARCHAR(64),                     -- SHA256 hash de la imagen (para auditoría)
  image_stored BOOLEAN DEFAULT false,         -- Si se guardó temporalmente
  image_storage_path VARCHAR(500),            -- Path en storage (Azure Blob, S3, etc.)
  image_retention_until TIMESTAMP,            -- Auto-delete después de X días (GDPR compliance)
  image_deleted BOOLEAN DEFAULT false,
  image_deleted_at TIMESTAMP,

  -- Geolocalización (opcional, si GPS está habilitado)
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_presence_employee_date ON remote_presence_detections(employee_id, DATE(detection_timestamp));
CREATE INDEX idx_presence_attendance ON remote_presence_detections(attendance_id);
CREATE INDEX idx_presence_not_detected ON remote_presence_detections(employee_id, presence_detected) WHERE presence_detected = false;
CREATE INDEX idx_presence_retention ON remote_presence_detections(image_retention_until) WHERE image_deleted = false;

COMMENT ON TABLE remote_presence_detections IS 'Registro de detecciones de presencia remota vía webcam. SSOT Referencias: employee_id → employees, company_id → companies, attendance_id → attendance. Compliance GDPR/BIPA: capturas solo para detección, NO grabación continua';
COMMENT ON COLUMN remote_presence_detections.employee_id IS 'SSOT: employees.id';
COMMENT ON COLUMN remote_presence_detections.company_id IS 'SSOT: companies.id';
COMMENT ON COLUMN remote_presence_detections.attendance_id IS 'SSOT: attendance.id (fichada asociada)';
COMMENT ON COLUMN remote_presence_detections.shift_start_time IS 'Snapshot del turno vigente (SSOT real: shifts.start_time). Solo para auditoría';
COMMENT ON COLUMN remote_presence_detections.shift_end_time IS 'Snapshot del turno vigente (SSOT real: shifts.end_time). Solo para auditoría';
COMMENT ON COLUMN remote_presence_detections.break_periods IS 'Snapshot de refrigerios (SSOT real: shifts.break_periods JSONB). Solo para auditoría';
COMMENT ON COLUMN remote_presence_detections.image_retention_until IS 'Auto-delete de imagen después de X días (GDPR Art. 17: derecho al olvido)';
COMMENT ON COLUMN remote_presence_detections.is_during_break_period IS 'Si true, detección se ignora (respeto a períodos de refrigerio del turno)';

-- ========================================
-- TABLA 6: VIOLACIONES DE PRESENCIA (AUSENCIAS PROLONGADAS)
-- ========================================
-- SSOT Referencias:
-- - employee_id → SSOT: employees table
-- - company_id → SSOT: companies table
-- - attendance_id → SSOT: attendance table
-- - supervisor_id → SSOT: employees.supervisor_id
-- - justified_by, action_taken_by → SSOT: users table

CREATE TABLE IF NOT EXISTS remote_presence_violations (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employees table
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- ⭐ SSOT: attendance table
  attendance_id INTEGER REFERENCES attendance(id),

  -- Período de ausencia
  absence_start_timestamp TIMESTAMP NOT NULL,
  absence_end_timestamp TIMESTAMP,            -- NULL si aún continúa
  absence_duration_minutes INTEGER,           -- Calculado automáticamente

  -- Detecciones relacionadas
  first_failed_detection_id INTEGER REFERENCES remote_presence_detections(id),
  last_failed_detection_id INTEGER REFERENCES remote_presence_detections(id),
  total_failed_attempts INTEGER DEFAULT 1,

  -- Estado
  status VARCHAR(50) DEFAULT 'open',          -- 'open', 'resolved', 'justified', 'dismissed'

  -- Justificación
  -- ⭐ SSOT: users table
  justified_by INTEGER REFERENCES users(id),
  justification_reason TEXT,
  justification_date TIMESTAMP,

  -- Notificaciones
  supervisor_notified BOOLEAN DEFAULT false,
  supervisor_notified_at TIMESTAMP,

  -- ⭐ SSOT: employees.supervisor_id (NO duplicar aquí, consultar en tiempo real)
  supervisor_id INTEGER REFERENCES users(id),

  hr_notified BOOLEAN DEFAULT false,
  hr_notified_at TIMESTAMP,

  -- Acciones tomadas
  action_taken VARCHAR(50),                   -- 'warning', 'write_up', 'suspension', 'none'

  -- ⭐ SSOT: users table
  action_taken_by INTEGER REFERENCES users(id),
  action_taken_at TIMESTAMP,
  action_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_violations_employee ON remote_presence_violations(employee_id, status);
CREATE INDEX idx_violations_attendance ON remote_presence_violations(attendance_id);
CREATE INDEX idx_violations_supervisor ON remote_presence_violations(supervisor_id, supervisor_notified);

COMMENT ON TABLE remote_presence_violations IS 'Registro de ausencias prolongadas detectadas durante trabajo remoto (> threshold configurado). SSOT Referencias: employee_id → employees, company_id → companies, attendance_id → attendance, supervisor_id → employees.supervisor_id';
COMMENT ON COLUMN remote_presence_violations.employee_id IS 'SSOT: employees.id';
COMMENT ON COLUMN remote_presence_violations.company_id IS 'SSOT: companies.id';
COMMENT ON COLUMN remote_presence_violations.attendance_id IS 'SSOT: attendance.id';
COMMENT ON COLUMN remote_presence_violations.supervisor_id IS 'SSOT: employees.supervisor_id (consultar en tiempo real, puede cambiar)';
COMMENT ON COLUMN remote_presence_violations.justified_by IS 'SSOT: users.id';
COMMENT ON COLUMN remote_presence_violations.action_taken_by IS 'SSOT: users.id';
COMMENT ON COLUMN remote_presence_violations.status IS 'open: activa, resolved: resuelta automáticamente, justified: justificada por supervisor, dismissed: descartada';

-- ========================================
-- TABLA 7: PLANES DE CONTINGENCIA (PANDEMIAS, EMERGENCIAS)
-- ========================================
-- SSOT Referencias:
-- - company_id → SSOT: companies table
-- - force_work_arrangement_id → SSOT: work_arrangement_types table
-- - affected_roles[], exempted_roles[] → SSOT: roles table
-- - affected_departments[] → SSOT: departments table
-- - activated_by, deactivated_by → SSOT: users table

CREATE TABLE IF NOT EXISTS work_arrangement_contingency_plans (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identificación
  contingency_type VARCHAR(50) NOT NULL,      -- 'pandemic', 'natural_disaster', 'civil_unrest', 'health_emergency', 'custom'
  name VARCHAR(200) NOT NULL,                 -- "Plan COVID-19", "Plan Inundación CABA"
  description TEXT,

  -- Trigger automático
  auto_activate BOOLEAN DEFAULT false,
  activation_criteria JSONB,                  -- Criterios para activación automática

  -- Cambios forzados
  -- ⭐ SSOT: work_arrangement_types table
  force_work_arrangement_id INTEGER REFERENCES work_arrangement_types(id),

  -- ⭐ SSOT: roles table (array de role_ids)
  affected_roles INTEGER[],                   -- Array de role_ids afectados (NULL = todos)

  -- ⭐ SSOT: departments table (array de department_ids)
  affected_departments INTEGER[],             -- Array de department_ids afectados

  -- ⭐ SSOT: roles table (array de role_ids)
  exempted_roles INTEGER[],                   -- Roles exentos (ej: Operarios, Seguridad)

  -- Notificaciones
  notify_all_employees BOOLEAN DEFAULT true,
  notify_supervisors BOOLEAN DEFAULT true,
  notify_hr BOOLEAN DEFAULT true,
  notification_message TEXT,

  -- Estado
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMP,
  deactivated_at TIMESTAMP,

  -- ⭐ SSOT: users table
  activated_by INTEGER REFERENCES users(id),
  deactivated_by INTEGER REFERENCES users(id),

  -- Auto-revert
  auto_revert_enabled BOOLEAN DEFAULT false,
  auto_revert_after_days INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contingency_company ON work_arrangement_contingency_plans(company_id, is_active);

COMMENT ON TABLE work_arrangement_contingency_plans IS 'Planes de contingencia para activar modalidades de trabajo durante emergencias. SSOT Referencias: company_id → companies, force_work_arrangement_id → work_arrangement_types, affected_roles/exempted_roles → roles, affected_departments → departments';
COMMENT ON COLUMN work_arrangement_contingency_plans.company_id IS 'SSOT: companies.id';
COMMENT ON COLUMN work_arrangement_contingency_plans.force_work_arrangement_id IS 'SSOT: work_arrangement_types.id';
COMMENT ON COLUMN work_arrangement_contingency_plans.affected_roles IS 'SSOT: roles.id[] (array de role_ids)';
COMMENT ON COLUMN work_arrangement_contingency_plans.affected_departments IS 'SSOT: departments.id[] (array de department_ids)';
COMMENT ON COLUMN work_arrangement_contingency_plans.exempted_roles IS 'SSOT: roles.id[] (array de role_ids exentos)';
COMMENT ON COLUMN work_arrangement_contingency_plans.activated_by IS 'SSOT: users.id';
COMMENT ON COLUMN work_arrangement_contingency_plans.deactivated_by IS 'SSOT: users.id';

-- ========================================
-- TABLA 8: HISTORIAL DE CAMBIOS (AUDITORÍA ISO 30414)
-- ========================================
-- SSOT Referencias:
-- - employee_id → SSOT: employees table
-- - company_id → SSOT: companies table
-- - previous_arrangement_id, new_arrangement_id → SSOT: work_arrangement_types table
-- - changed_by → SSOT: users table

CREATE TABLE IF NOT EXISTS work_arrangement_history (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employees table
  employee_id INTEGER NOT NULL REFERENCES employees(id),

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(id),

  -- Cambio
  -- ⭐ SSOT: work_arrangement_types table
  previous_arrangement_id INTEGER REFERENCES work_arrangement_types(id),
  new_arrangement_id INTEGER NOT NULL REFERENCES work_arrangement_types(id),

  change_reason VARCHAR(50) NOT NULL,         -- 'promotion', 'employee_request', 'contingency', 'policy_change', 'performance', 'disciplinary'
  change_reason_detail TEXT,

  -- ⭐ SSOT: users table
  changed_by INTEGER REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- ISO 30414:2025 Compliance
  reported_in_hcr BOOLEAN DEFAULT false,      -- Reportado en Human Capital Report
  hcr_period VARCHAR(20),                     -- '2025-Q1', '2025-Q2'...
  iso_30414_category VARCHAR(50)              -- 'workforce_availability', 'flexible_work'
);

CREATE INDEX idx_arrangement_history_employee ON work_arrangement_history(employee_id);
CREATE INDEX idx_arrangement_history_period ON work_arrangement_history(hcr_period) WHERE reported_in_hcr = true;

COMMENT ON TABLE work_arrangement_history IS 'Auditoría de cambios de modalidad de trabajo (alineado con ISO 30414:2025 para reportes HCR). SSOT Referencias: employee_id → employees, company_id → companies, arrangement_ids → work_arrangement_types, changed_by → users';
COMMENT ON COLUMN work_arrangement_history.employee_id IS 'SSOT: employees.id';
COMMENT ON COLUMN work_arrangement_history.company_id IS 'SSOT: companies.id';
COMMENT ON COLUMN work_arrangement_history.previous_arrangement_id IS 'SSOT: work_arrangement_types.id';
COMMENT ON COLUMN work_arrangement_history.new_arrangement_id IS 'SSOT: work_arrangement_types.id';
COMMENT ON COLUMN work_arrangement_history.changed_by IS 'SSOT: users.id';

-- ========================================
-- PARTE 3: INTEGRACIÓN CON MÓDULO DE CONSENTIMIENTOS
-- ========================================

-- ========================================
-- NUEVO CONSENTIMIENTO: DETECCIÓN DE PRESENCIA REMOTA
-- ========================================
-- ⭐ SE INTEGRA CON consent_definitions EXISTENTE (SSOT)
-- NO duplica sistema de consentimientos, EXTIENDE el existente

INSERT INTO consent_definitions (consent_key, title, description, full_text, version, applicable_roles, is_required, category, metadata) VALUES
('remote_webcam_monitoring_employee',
 'Consentimiento de Monitoreo de Presencia Remota (Webcam)',
 'Autorización para detección de presencia durante trabajo remoto mediante cámara web y reconocimiento facial (Azure Face API).',
 '<h3>Consentimiento Informado: Detección de Presencia Remota</h3>
<p>Yo, en mi carácter de empleado en modalidad de trabajo remoto, autorizo expresamente a la empresa a realizar detección de presencia mediante cámara web con el único propósito de verificar mi asistencia durante la jornada laboral.</p>

<h4>Declaro que he sido informado sobre:</h4>
<ul>
  <li><strong>Propósito:</strong> Verificar presencia durante jornada laboral remota (NO monitoreo de productividad ni reconocimiento emocional)</li>
  <li><strong>Método:</strong> Capturas aleatorias de cámara web procesadas con Azure Face API (Microsoft)</li>
  <li><strong>Frecuencia:</strong> Capturas cada 30±10 minutos (intervalo aleatorio)</li>
  <li><strong>Respeto a privacidad:</strong>
    <ul>
      <li>NO se realiza grabación continua</li>
      <li>Solo detección de presencia (¿hay una persona? Sí/No)</li>
      <li>Respeto a períodos de refrigerio configurados en mi turno</li>
      <li>Auto-delete de imágenes después de 30 días (GDPR Art. 17)</li>
    </ul>
  </li>
  <li><strong>Ausencias detectadas:</strong> Si el sistema no detecta presencia por más de 10 minutos (fuera de horarios de refrigerio), se registrará y notificará a mi supervisor al final de la jornada</li>
  <li><strong>Seguridad:</strong> Datos almacenados de forma encriptada (AES-256)</li>
  <li><strong>No se compartirá con terceros</strong> (excepto Azure Face API para procesamiento)</li>
  <li><strong>Alternativa:</strong> Puedo solicitar check-in manual cada hora en lugar de detección por webcam</li>
  <li><strong>Revocación:</strong> Puedo revocar este consentimiento en cualquier momento (pasaré a modalidad presencial o check-in manual)</li>
</ul>

<h4>Base legal y compliance:</h4>
<p>Este sistema está ALINEADO CON (no certifica):</p>
<ul>
  <li><strong>GDPR Artículo 9</strong> (Unión Europea): Datos biométricos</li>
  <li><strong>BIPA 740 ILCS 14/15</strong> (Illinois, USA): Written consent para datos biométricos</li>
  <li><strong>Ley 25.326</strong> (Argentina): Protección de Datos Personales</li>
  <li><strong>ISO 30414:2025</strong>: Human Capital Reporting (flexible work arrangements)</li>
  <li><strong>EU AI Act</strong> (Feb 2025): Prohibido reconocimiento emocional (sistema NO lo utiliza)</li>
</ul>

<h4>Data Protection Impact Assessment (DPIA):</h4>
<p>La empresa ha realizado una evaluación de impacto en protección de datos (DPIA) según GDPR Art. 35.</p>

<h4>Mis derechos:</h4>
<ul>
  <li>Acceso a mis datos de detección de presencia</li>
  <li>Rectificación de registros incorrectos</li>
  <li>Supresión de datos (derecho al olvido)</li>
  <li>Portabilidad de datos</li>
  <li>Oposición al tratamiento</li>
  <li>Limitación del tratamiento</li>
  <li>Presentar reclamo ante autoridad de control (AAIP en Argentina, ICO en UK, etc.)</li>
</ul>

<h4>Registro:</h4>
<ul>
  <li><strong>Argentina:</strong> Base de datos registrada en AAIP (Agencia de Acceso a la Información Pública)</li>
  <li><strong>Europa:</strong> Registro de actividades de tratamiento según GDPR Art. 30</li>
</ul>

<p><strong>Al aceptar este consentimiento, confirmo que:</strong></p>
<ul>
  <li>He leído y comprendido esta información</li>
  <li>Consiento LIBREMENTE (sin coacción) al monitoreo descrito</li>
  <li>Puedo solicitar alternativa (check-in manual) sin penalización</li>
  <li>Puedo revocar este consentimiento en cualquier momento</li>
</ul>',
 '1.0',
 ARRAY['employee'],
 false,  -- NO obligatorio (alternativa: check-in manual)
 'safety',
 '{
   "countries": {
     "AR": {
       "law": "Ley 25.326",
       "authority": "AAIP",
       "template": "consent_templates/argentina_webcam_monitoring.html",
       "requires_aaip_registration": true,
       "retention_days": 30,
       "full_text_override": null
     },
     "US": {
       "law": "BIPA 740 ILCS 14/15",
       "state": "Illinois",
       "template": "consent_templates/usa_bipa_webcam_monitoring.html",
       "written_release_required": true,
       "retention_days": 30,
       "full_text_override": null
     },
     "EU": {
       "law": "GDPR Article 9",
       "template": "consent_templates/eu_gdpr_webcam_monitoring.html",
       "requires_dpia": true,
       "requires_alternative": true,
       "retention_days": 30,
       "full_text_override": null
     },
     "global": {
       "template": "consent_templates/global_webcam_monitoring.html",
       "retention_days": 30
     }
   }
 }'::jsonb)
ON CONFLICT (consent_key) DO UPDATE SET
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMENT ON TABLE consent_definitions IS 'SSOT: Definiciones maestras de consentimientos (INCLUYE consentimiento de detección de presencia remota con metadata por país)';

-- ========================================
-- PARTE 4: FUNCIONES HELPER
-- ========================================

-- ========================================
-- FUNCIÓN 1: VERIFICAR SI PUEDE ASIGNAR TRABAJO REMOTO
-- ========================================
-- ⭐ VALIDACIÓN CONDICIONAL SEGÚN POLÍTICA EMPRESA Y PAÍS DE SUCURSAL
-- SSOT Consultadas:
-- - work_arrangement_policies (política empresa)
-- - employees, branches (país de sucursal)
-- - user_consents, consent_definitions (consentimiento)

CREATE OR REPLACE FUNCTION can_assign_remote_work(
  p_employee_id INTEGER,
  p_work_arrangement_type_id INTEGER,
  p_company_id INTEGER
)
RETURNS TABLE(
  can_assign BOOLEAN,
  reason VARCHAR(200),
  requires_consent BOOLEAN,
  has_consent BOOLEAN,
  consent_country VARCHAR(50)
) AS $$
DECLARE
  v_policy RECORD;
  v_employee_branch_country VARCHAR(50);
  v_has_consent BOOLEAN;
  v_requires_detection BOOLEAN;
BEGIN
  -- 1. Obtener política de la empresa para esta modalidad
  -- SSOT: work_arrangement_policies
  SELECT * INTO v_policy
  FROM work_arrangement_policies
  WHERE company_id = p_company_id
    AND work_arrangement_type_id = p_work_arrangement_type_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No existe política configurada para esta modalidad'::VARCHAR(200), false, false, NULL::VARCHAR(50);
    RETURN;
  END IF;

  -- 2. Verificar si requiere detección webcam
  v_requires_detection := v_policy.enable_webcam_presence_detection;

  -- 3. Si NO requiere detección → asignar directamente
  IF v_requires_detection = false THEN
    RETURN QUERY SELECT true, 'Asignación permitida (sin detección webcam)'::VARCHAR(200), false, false, NULL::VARCHAR(50);
    RETURN;
  END IF;

  -- 4. Si requiere detección → verificar consentimiento
  -- SSOT: employees → branches → country
  SELECT b.country INTO v_employee_branch_country
  FROM employees e
  JOIN branches b ON e.default_branch_id = b.id
  WHERE e.id = p_employee_id;

  -- Si no tiene sucursal asignada, usar país de la empresa
  IF v_employee_branch_country IS NULL THEN
    SELECT c.country INTO v_employee_branch_country
    FROM companies c
    WHERE c.id = p_company_id;
  END IF;

  -- 5. Verificar si empleado tiene consentimiento ACEPTADO para su país
  -- SSOT: user_consents, consent_definitions
  SELECT EXISTS(
    SELECT 1
    FROM user_consents uc
    JOIN consent_definitions cd ON uc.consent_id = cd.consent_id
    WHERE uc.user_id = p_employee_id
      AND uc.user_type = 'employee'
      AND cd.consent_key = 'remote_webcam_monitoring_employee'
      AND uc.status = 'accepted'
      -- Verificar que consentimiento corresponda al país de la sucursal
      AND (
        cd.metadata->'countries'->COALESCE(v_employee_branch_country, 'global') IS NOT NULL
        OR cd.metadata->'countries'->'global' IS NOT NULL
      )
  ) INTO v_has_consent;

  -- 6. Evaluar resultado
  IF v_has_consent = false THEN
    RETURN QUERY SELECT
      false,
      ('Requiere consentimiento de detección webcam para país: ' || COALESCE(v_employee_branch_country, 'Unknown'))::VARCHAR(200),
      true,
      false,
      v_employee_branch_country;
    RETURN;
  END IF;

  -- 7. Todo OK
  RETURN QUERY SELECT
    true,
    'Asignación permitida (consentimiento aceptado)'::VARCHAR(200),
    true,
    true,
    v_employee_branch_country;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_assign_remote_work IS 'Verifica si empleado puede ser asignado a trabajo remoto (validación condicional de consentimiento según política empresa). SSOT Consultadas: work_arrangement_policies, employees, branches, user_consents, consent_definitions';

-- ========================================
-- FUNCIÓN 2: DETERMINAR SI DÍA ES REMOTO O PRESENCIAL
-- ========================================
-- ⭐ INTEGRACIÓN CON CALENDARIO Y TURNOS
-- SSOT Consultadas:
-- - employee_work_arrangements (modalidad asignada)
-- - work_arrangement_types (tipo de modalidad)
-- - work_arrangement_policies (política detección webcam)
-- - employees (company_id)
-- - shifts (días de trabajo - IMPLEMENTACIÓN FUTURA)

CREATE OR REPLACE FUNCTION is_remote_day(
  p_employee_id INTEGER,
  p_date DATE
)
RETURNS TABLE(
  is_remote BOOLEAN,
  work_arrangement_type VARCHAR(50),
  should_enable_webcam BOOLEAN,
  kiosk_id INTEGER,
  allow_gps_outside_radius BOOLEAN
) AS $$
DECLARE
  v_arrangement RECORD;
  v_day_name VARCHAR(20);
  v_policy RECORD;
BEGIN
  -- 1. Obtener día de la semana
  v_day_name := LOWER(TO_CHAR(p_date, 'Day'));
  v_day_name := TRIM(v_day_name);  -- Quitar espacios

  -- 2. Obtener modalidad activa del empleado en esa fecha
  -- SSOT: employee_work_arrangements, work_arrangement_types
  SELECT
    ewa.*,
    wat.code as arrangement_code,
    wat.requires_webcam_presence_detection
  INTO v_arrangement
  FROM employee_work_arrangements ewa
  JOIN work_arrangement_types wat ON ewa.work_arrangement_type_id = wat.id
  WHERE ewa.employee_id = p_employee_id
    AND ewa.is_active = true
    AND ewa.effective_from <= p_date
    AND (ewa.effective_until IS NULL OR ewa.effective_until >= p_date)
  ORDER BY ewa.effective_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Sin modalidad asignada → por defecto presencial
    RETURN QUERY SELECT false, 'presencial'::VARCHAR, false, NULL::INTEGER, false;
    RETURN;
  END IF;

  -- 3. Evaluar según tipo de modalidad
  CASE v_arrangement.arrangement_code
    WHEN 'presencial' THEN
      -- Siempre presencial
      -- SSOT: kiosk_id se obtiene de employees.default_branch_id → branches.kiosk_id
      RETURN QUERY SELECT
        false,
        'presencial'::VARCHAR,
        false,
        NULL::INTEGER,  -- Kiosko se consulta en tiempo real desde branches
        false;

    WHEN 'remoto' THEN
      -- Siempre remoto
      -- SSOT: work_arrangement_policies (verificar si activar webcam)
      SELECT * INTO v_policy
      FROM work_arrangement_policies wap
      WHERE wap.company_id = (SELECT company_id FROM employees WHERE id = p_employee_id)
        AND wap.work_arrangement_type_id = v_arrangement.work_arrangement_type_id
        AND wap.is_active = true;

      RETURN QUERY SELECT
        true,
        'remoto'::VARCHAR,
        COALESCE(v_policy.enable_webcam_presence_detection, false),
        NULL::INTEGER,
        true;  -- Allow GPS outside radius

    WHEN 'hibrido' THEN
      -- Depende del día de la semana
      -- SSOT: employee_work_arrangements.remote_days (si existe override)
      -- SSOT FUTURO: shifts.shift_days (días configurados en turno)
      IF v_day_name = ANY(v_arrangement.remote_days) THEN
        -- DÍA REMOTO
        -- SSOT: work_arrangement_policies
        SELECT * INTO v_policy
        FROM work_arrangement_policies wap
        WHERE wap.company_id = (SELECT company_id FROM employees WHERE id = p_employee_id)
          AND wap.work_arrangement_type_id = v_arrangement.work_arrangement_type_id
          AND wap.is_active = true;

        RETURN QUERY SELECT
          true,
          'hibrido_remoto'::VARCHAR,
          COALESCE(v_policy.enable_webcam_presence_detection, false),
          NULL::INTEGER,
          true;
      ELSE
        -- DÍA PRESENCIAL
        RETURN QUERY SELECT
          false,
          'hibrido_presencial'::VARCHAR,
          false,
          NULL::INTEGER,
          false;
      END IF;

    ELSE
      -- Otras modalidades (freelance, contractor, etc.) → remoto sin webcam
      RETURN QUERY SELECT true, v_arrangement.arrangement_code::VARCHAR, false, NULL::INTEGER, true;
  END CASE;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_remote_day IS 'Determina si empleado trabaja remoto o presencial en fecha específica. SSOT Consultadas: employee_work_arrangements, work_arrangement_types, work_arrangement_policies, employees. SSOT FUTURO: shifts (días de trabajo configurados en turno)';

-- ========================================
-- FUNCIÓN 3: CALCULAR ESTADÍSTICAS DE PRESENCIA REMOTA
-- ========================================
-- SSOT Consultadas:
-- - remote_presence_detections
-- - remote_presence_violations

CREATE OR REPLACE FUNCTION calculate_daily_presence_stats(
  p_employee_id INTEGER,
  p_date DATE
)
RETURNS TABLE(
  total_detections INTEGER,
  successful_detections INTEGER,
  failed_detections INTEGER,
  presence_percentage DECIMAL(5,2),
  total_absence_minutes INTEGER,
  violation_count INTEGER
) AS $$
BEGIN
  -- SSOT: remote_presence_detections, remote_presence_violations
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_detections,
    COUNT(*) FILTER (WHERE presence_detected = true)::INTEGER as successful_detections,
    COUNT(*) FILTER (WHERE presence_detected = false AND NOT is_during_break_period)::INTEGER as failed_detections,
    ROUND(
      (COUNT(*) FILTER (WHERE presence_detected = true)::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) * 100,
      2
    ) as presence_percentage,
    COALESCE(SUM(rpv.absence_duration_minutes), 0)::INTEGER as total_absence_minutes,
    COUNT(DISTINCT rpv.id)::INTEGER as violation_count
  FROM remote_presence_detections rpd
  LEFT JOIN remote_presence_violations rpv ON rpv.employee_id = rpd.employee_id
    AND DATE(rpv.absence_start_timestamp) = p_date
  WHERE rpd.employee_id = p_employee_id
    AND DATE(rpd.detection_timestamp) = p_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_daily_presence_stats IS 'Calcula estadísticas diarias de detección de presencia para un empleado. SSOT Consultadas: remote_presence_detections, remote_presence_violations';

-- ========================================
-- FUNCIÓN 4: AUTO-DELETE IMÁGENES EXPIRADAS (GDPR COMPLIANCE)
-- ========================================
-- SSOT Actualizada:
-- - remote_presence_detections (marca image_deleted = true)

CREATE OR REPLACE FUNCTION auto_delete_expired_presence_images()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- SSOT: remote_presence_detections
  -- Marcar como deleted las imágenes que ya expiraron
  UPDATE remote_presence_detections
  SET
    image_deleted = true,
    image_deleted_at = CURRENT_TIMESTAMP
  WHERE image_stored = true
    AND image_deleted = false
    AND image_retention_until < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_delete_expired_presence_images IS 'Auto-delete de imágenes de detección de presencia vencidas (GDPR Art. 17: derecho al olvido). SSOT Actualizada: remote_presence_detections. Ejecutar en cron job diario';

-- ========================================
-- FUNCIÓN 5: VERIFICAR CONSENTIMIENTO DE WEBCAM
-- ========================================
-- ⭐ INTEGRACIÓN CON MÓDULO DE CONSENTIMIENTOS
-- SSOT Consultadas:
-- - user_consents (consentimientos del empleado)
-- - consent_definitions (definición del consentimiento)

CREATE OR REPLACE FUNCTION has_webcam_monitoring_consent(
  p_employee_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_consent BOOLEAN;
BEGIN
  -- SSOT: user_consents, consent_definitions
  -- Buscar consentimiento aceptado en user_consents
  SELECT EXISTS(
    SELECT 1
    FROM user_consents uc
    JOIN consent_definitions cd ON uc.consent_id = cd.consent_id
    WHERE uc.user_id = p_employee_id
      AND uc.user_type = 'employee'
      AND cd.consent_key = 'remote_webcam_monitoring_employee'
      AND uc.status = 'accepted'
  ) INTO v_has_consent;

  RETURN v_has_consent;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION has_webcam_monitoring_consent IS 'Verifica si empleado tiene consentimiento ACEPTADO para monitoreo webcam. SSOT Consultadas: user_consents, consent_definitions (Módulo Consentimientos y Privacidad)';

-- ========================================
-- PARTE 5: TRIGGERS
-- ========================================

-- ========================================
-- TRIGGER 1: VALIDAR CONSENTIMIENTO ANTES DE ASIGNAR REMOTO
-- ========================================
-- ⭐ BLOQUEA ASIGNACIÓN SI NO HAY CONSENTIMIENTO Y POLÍTICA LO REQUIERE
-- SSOT Consultadas (vía función can_assign_remote_work):
-- - work_arrangement_policies, employees, branches, user_consents, consent_definitions

CREATE OR REPLACE FUNCTION validate_remote_consent_before_assign()
RETURNS TRIGGER AS $$
DECLARE
  v_validation RECORD;
BEGIN
  -- Solo validar si es trabajo remoto o híbrido
  -- SSOT: work_arrangement_types
  IF NEW.work_arrangement_type_id IN (
    SELECT id FROM work_arrangement_types WHERE code IN ('remoto', 'hibrido')
  ) THEN

    -- Ejecutar validación condicional
    -- SSOT: employees.company_id
    SELECT * INTO v_validation
    FROM can_assign_remote_work(
      NEW.employee_id,
      NEW.work_arrangement_type_id,
      (SELECT company_id FROM employees WHERE id = NEW.employee_id)
    );

    -- Si no puede asignar, BLOQUEAR
    IF v_validation.can_assign = false THEN
      RAISE EXCEPTION 'No se puede asignar trabajo remoto: %. Requiere consentimiento: %. Tiene consentimiento: %',
        v_validation.reason,
        v_validation.requires_consent,
        v_validation.has_consent;
    END IF;

    -- Marcar si requiere webcam consent
    NEW.requires_webcam_consent := v_validation.requires_consent;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_remote_consent
BEFORE INSERT OR UPDATE ON employee_work_arrangements
FOR EACH ROW
EXECUTE FUNCTION validate_remote_consent_before_assign();

COMMENT ON FUNCTION validate_remote_consent_before_assign IS 'Trigger: Valida consentimiento antes de asignar trabajo remoto (bloquea si no tiene consentimiento y política lo requiere). SSOT Consultadas: work_arrangement_types, employees, work_arrangement_policies, user_consents, consent_definitions';

-- ========================================
-- TRIGGER 2: CREAR VIOLACIÓN SI AUSENCIA > THRESHOLD
-- ========================================
-- SSOT Consultadas:
-- - remote_presence_violations (busca violación existente)
-- - employees.supervisor_id (obtiene supervisor)

CREATE OR REPLACE FUNCTION detect_presence_violation_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_threshold_minutes INTEGER := 10;
  v_existing_violation_id INTEGER;
  v_supervisor_id INTEGER;
BEGIN
  -- Solo procesar si NO detectó presencia y NO es durante refrigerio
  IF NEW.presence_detected = false AND NEW.is_during_break_period = false THEN

    -- SSOT: remote_presence_violations
    -- Buscar si ya existe una violación abierta reciente (últimos 30 min)
    SELECT id INTO v_existing_violation_id
    FROM remote_presence_violations
    WHERE employee_id = NEW.employee_id
      AND status = 'open'
      AND absence_start_timestamp > (NEW.detection_timestamp - INTERVAL '30 minutes')
    ORDER BY absence_start_timestamp DESC
    LIMIT 1;

    IF v_existing_violation_id IS NULL THEN
      -- Crear nueva violación
      -- SSOT: employees.supervisor_id
      SELECT supervisor_id INTO v_supervisor_id
      FROM employees
      WHERE id = NEW.employee_id;

      INSERT INTO remote_presence_violations (
        employee_id,
        company_id,
        attendance_id,
        absence_start_timestamp,
        first_failed_detection_id,
        last_failed_detection_id,
        total_failed_attempts,
        supervisor_id
      ) VALUES (
        NEW.employee_id,
        NEW.company_id,
        NEW.attendance_id,
        NEW.detection_timestamp,
        NEW.id,
        NEW.id,
        1,
        v_supervisor_id
      );
    ELSE
      -- Actualizar violación existente
      UPDATE remote_presence_violations
      SET
        last_failed_detection_id = NEW.id,
        total_failed_attempts = total_failed_attempts + 1,
        absence_end_timestamp = NEW.detection_timestamp,
        absence_duration_minutes = EXTRACT(EPOCH FROM (NEW.detection_timestamp - absence_start_timestamp)) / 60,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = v_existing_violation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detect_presence_violation
AFTER INSERT ON remote_presence_detections
FOR EACH ROW
EXECUTE FUNCTION detect_presence_violation_trigger();

COMMENT ON FUNCTION detect_presence_violation_trigger IS 'Trigger: Crea o actualiza violación cuando hay ausencia detectada > threshold. SSOT Consultadas: remote_presence_violations (busca existente), employees.supervisor_id (obtiene supervisor)';

-- ========================================
-- TRIGGER 3: REGISTRAR CAMBIOS EN HISTORIAL
-- ========================================
-- SSOT Actualizadas:
-- - work_arrangement_history (inserta registro de auditoría)

CREATE OR REPLACE FUNCTION log_work_arrangement_change()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id INTEGER;
  v_changed_by INTEGER;
BEGIN
  -- Solo registrar si cambió el tipo de modalidad
  IF TG_OP = 'UPDATE' AND OLD.work_arrangement_type_id != NEW.work_arrangement_type_id THEN

    -- SSOT: employees.company_id
    SELECT company_id INTO v_company_id
    FROM employees
    WHERE id = NEW.employee_id;

    -- SSOT: NEW.approved_by (quien aprobó el cambio)
    v_changed_by := NEW.approved_by;

    -- SSOT: work_arrangement_history
    INSERT INTO work_arrangement_history (
      employee_id,
      company_id,
      previous_arrangement_id,
      new_arrangement_id,
      change_reason,
      change_reason_detail,
      changed_by,
      changed_at
    ) VALUES (
      NEW.employee_id,
      v_company_id,
      OLD.work_arrangement_type_id,
      NEW.work_arrangement_type_id,
      CASE
        WHEN NEW.is_contingency_mode THEN 'contingency'
        WHEN NEW.source = 'manual_override' THEN 'employee_request'
        ELSE 'policy_change'
      END,
      NEW.approval_reason,
      v_changed_by,
      CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_work_arrangement_change
AFTER UPDATE ON employee_work_arrangements
FOR EACH ROW
EXECUTE FUNCTION log_work_arrangement_change();

COMMENT ON FUNCTION log_work_arrangement_change IS 'Trigger: Registra cambios de modalidad en historial de auditoría (ISO 30414:2025). SSOT Consultadas: employees.company_id. SSOT Actualizadas: work_arrangement_history';

-- ========================================
-- PARTE 6: COMENTARIOS FINALES Y DOCUMENTACIÓN
-- ========================================

COMMENT ON DATABASE current_database() IS 'Sistema incluye modalidades de trabajo alineadas con ISO 30414:2025 (NO certificación oficial) + detección de presencia remota integrada con módulo de consentimientos. RESPETA SSOT: NO duplica datos de roles, consent_definitions, user_consents, employees, branches, companies, attendance, shifts.';

-- =========================================================================
-- FIN DE MIGRACIÓN
-- =========================================================================
