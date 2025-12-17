/*
 * ================================================================
 * MIGRACIÓN: Sistema Completo de Beneficios y Amenities Laborales
 * ================================================================
 *
 * Descripción:
 * Sistema enterprise completo para gestión de beneficios, amenities y perks
 * que las empresas otorgan a empleados: viáticos, guarderías, colegios,
 * alquileres, bonos, préstamos de vehículos/teléfonos/computadoras, pasajes,
 * seguros, y cualquier otro beneficio laboral.
 *
 * Características principales:
 * - Catálogo extensible de tipos de beneficios
 * - Políticas configurables por empresa
 * - Asignación individual con workflow de aprobación
 * - Control de vencimientos y renovaciones
 * - Requisitos de documentación (integra con DMS)
 * - Integración con liquidación de sueldos (payroll concepts)
 * - Tracking de activos asignados (vehículos, dispositivos)
 * - Generación de contratos/comodatos
 * - Control de gastos y rendiciones
 * - Notificaciones automáticas (vencimientos, aprobaciones, alertas)
 *
 * Autor: Claude Code
 * Fecha: 2025-12-16
 * Versión: 1.0.0
 */

-- ================================================================
-- RESPETO A SSOT (Single Source of Truth)
-- ================================================================
/*
 * IMPORTANTE: Este sistema NO duplica datos de sistemas existentes.
 * Todas las funciones CONSULTAN SSOT en tiempo real.
 *
 * SSOT RESPETADAS:
 * - employees → Empleados (employee_id, company_id, supervisor_id)
 * - companies → Empresas (company_id, active_modules)
 * - document_types → DMS: Tipos de documentos (SSOT para docs)
 * - document_categories → DMS: Categorías de documentos
 * - payroll_concept_types → Payroll: Tipos de conceptos de nómina
 * - payroll_concept_classifications → Payroll: Clasificaciones de conceptos
 * - notifications → Sistema Central de Notificaciones
 * - consent_definitions → Módulo de Consentimientos
 * - user_consents → Consentimientos de usuarios
 * - branches → Sucursales (branch_id, country)
 * - roles → Estructura Organizacional (role_id para aprobadores)
 *
 * NUEVAS TABLAS (solo relaciones y metadata):
 * - benefit_types → Catálogo de tipos de beneficios
 * - company_benefit_policies → Políticas por empresa
 * - employee_benefits → Asignaciones a empleados
 * - benefit_document_requirements → Qué docs requiere cada beneficio
 * - employee_benefit_documents → Docs presentados por empleado
 * - benefit_approval_workflows → Workflow de aprobación
 * - benefit_approval_history → Historial de aprobaciones
 * - benefit_payroll_concepts → Vincula beneficios con conceptos de nómina
 * - employee_assigned_assets → Activos asignados (vehículos, teléfonos, etc.)
 * - asset_contracts → Contratos/comodatos de activos
 * - benefit_expense_allowances → Límites de gastos (pasajes, viáticos)
 * - benefit_expense_submissions → Rendiciones de gastos
 */

-- ================================================================
-- PARTE 1: CATÁLOGO DE TIPOS DE BENEFICIOS
-- ================================================================

CREATE TABLE IF NOT EXISTS benefit_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  name_en VARCHAR(150),
  description TEXT,

  -- Categoría de beneficio
  category VARCHAR(50) NOT NULL,
  -- Categorías: MONETARY, EDUCATION, HOUSING, TRANSPORTATION, HEALTH, TECHNOLOGY, CHILDCARE, INSURANCE, BONUS, OTHER

  -- Tipo de beneficio
  benefit_nature VARCHAR(30) NOT NULL,
  -- RECURRING = se paga periódicamente (guardería, alquiler)
  -- ONE_TIME = se otorga una vez (bono anual)
  -- ASSET_LOAN = préstamo de activo (auto, teléfono)
  -- EXPENSE_ALLOWANCE = límite de gastos (pasajes, viáticos)

  -- Configuración de periodicidad (para RECURRING)
  recurrence_period VARCHAR(20),
  -- MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL, BIWEEKLY

  -- ¿Requiere aprobación de superior?
  requires_approval BOOLEAN DEFAULT true,
  approval_levels INTEGER DEFAULT 1, -- Niveles de aprobación requeridos

  -- ¿Requiere documentación?
  requires_documentation BOOLEAN DEFAULT false,

  -- ¿Es taxable (grava impuestos)?
  is_taxable BOOLEAN DEFAULT true,

  -- ¿Afecta cálculo de salario base?
  affects_salary_base BOOLEAN DEFAULT false,

  -- ¿Tiene límite máximo?
  has_max_limit BOOLEAN DEFAULT false,
  default_max_amount DECIMAL(15,2),
  default_max_quantity INTEGER, -- Para activos o pasajes

  -- ¿Tiene vencimiento/renovación?
  has_expiration BOOLEAN DEFAULT false,
  default_duration_months INTEGER,
  requires_renewal BOOLEAN DEFAULT false,
  renewal_advance_days INTEGER DEFAULT 30, -- Días antes para notificar renovación

  -- Configuración de alertas
  alert_days_before_expiration INTEGER[] DEFAULT ARRAY[30, 15, 7, 1],

  -- Integración con payroll
  integrates_with_payroll BOOLEAN DEFAULT false,
  payroll_concept_type_id INTEGER REFERENCES payroll_concept_types(id),

  -- UI/UX
  icon VARCHAR(50),
  color_hex VARCHAR(7),
  display_order INTEGER DEFAULT 0,

  -- Metadata adicional (flexible)
  metadata JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE benefit_types IS 'SSOT: Catálogo de tipos de beneficios y amenities laborales';
COMMENT ON COLUMN benefit_types.benefit_nature IS 'RECURRING, ONE_TIME, ASSET_LOAN, EXPENSE_ALLOWANCE';
COMMENT ON COLUMN benefit_types.payroll_concept_type_id IS 'FK a payroll_concept_types (SSOT Payroll)';

CREATE INDEX IF NOT EXISTS idx_benefit_types_category ON benefit_types(category);
CREATE INDEX IF NOT EXISTS idx_benefit_types_active ON benefit_types(is_active);

-- Insertar tipos de beneficios comunes
INSERT INTO benefit_types
(code, name, name_en, description, category, benefit_nature, recurrence_period, requires_approval, requires_documentation, is_taxable, has_max_limit, default_max_amount, has_expiration, default_duration_months, requires_renewal, integrates_with_payroll, icon, color_hex, display_order)
VALUES
-- EDUCACIÓN
('CHILDCARE_ALLOWANCE', 'Guardería / Jardín de Infantes', 'Childcare Allowance',
 'Subsidio mensual para guardería o jardín de infantes de hijos del empleado',
 'CHILDCARE', 'RECURRING', 'MONTHLY', true, true, false, true, 50000.00, true, 12, true, true, '👶', '#10B981', 1),

('SCHOOL_TUITION', 'Colegio / Instituto Educativo', 'School Tuition',
 'Pago de matrícula y cuotas de colegio para hijos del empleado',
 'EDUCATION', 'RECURRING', 'MONTHLY', true, true, false, true, 100000.00, true, 12, true, true, '🏫', '#3B82F6', 2),

('LANGUAGE_COURSES', 'Instituto de Idiomas', 'Language Courses',
 'Cursos de idiomas para el empleado o sus hijos',
 'EDUCATION', 'RECURRING', 'MONTHLY', true, true, false, true, 30000.00, true, 6, true, true, '🌍', '#8B5CF6', 3),

('PROFESSIONAL_TRAINING', 'Capacitación Profesional', 'Professional Training',
 'Cursos, postgrados, certificaciones profesionales',
 'EDUCATION', 'ONE_TIME', NULL, true, true, false, true, 200000.00, false, NULL, false, false, '🎓', '#EC4899', 4),

-- VIVIENDA
('HOUSING_RENTAL', 'Alquiler de Vivienda', 'Housing Rental Allowance',
 'Subsidio mensual para alquiler de vivienda del empleado',
 'HOUSING', 'RECURRING', 'MONTHLY', true, true, false, true, 150000.00, true, 12, true, true, '🏠', '#F59E0B', 10),

('RELOCATION_ASSISTANCE', 'Asistencia de Mudanza', 'Relocation Assistance',
 'Subsidio por mudanza (una sola vez)',
 'HOUSING', 'ONE_TIME', NULL, true, true, false, true, 300000.00, false, NULL, false, true, '📦', '#78716C', 11),

-- TRANSPORTE
('COMPANY_CAR', 'Automóvil de la Empresa', 'Company Car',
 'Préstamo de vehículo de la empresa al empleado',
 'TRANSPORTATION', 'ASSET_LOAN', NULL, true, true, true, false, NULL, true, 24, true, false, '🚗', '#EF4444', 20),

('FUEL_ALLOWANCE', 'Viático de Combustible', 'Fuel Allowance',
 'Subsidio mensual para combustible',
 'TRANSPORTATION', 'RECURRING', 'MONTHLY', true, false, false, true, 40000.00, true, 12, true, true, '⛽', '#F97316', 21),

('PARKING_ALLOWANCE', 'Estacionamiento', 'Parking Allowance',
 'Pago de estacionamiento mensual',
 'TRANSPORTATION', 'RECURRING', 'MONTHLY', true, true, false, true, 15000.00, true, 12, true, true, '🅿️', '#14B8A6', 22),

('FLIGHT_TICKETS', 'Pasajes Aéreos', 'Flight Tickets',
 'Límite anual de pasajes aéreos para el empleado',
 'TRANSPORTATION', 'EXPENSE_ALLOWANCE', 'ANNUAL', true, true, false, true, NULL, true, 12, true, false, '✈️', '#06B6D4', 23),

-- TECNOLOGÍA
('MOBILE_PHONE', 'Teléfono Móvil', 'Mobile Phone',
 'Teléfono corporativo asignado al empleado',
 'TECHNOLOGY', 'ASSET_LOAN', NULL, true, false, false, false, NULL, true, 24, true, false, '📱', '#6366F1', 30),

('LAPTOP_COMPUTER', 'Computadora Portátil', 'Laptop Computer',
 'Laptop asignada al empleado para trabajo',
 'TECHNOLOGY', 'ASSET_LOAN', NULL, true, false, false, false, NULL, true, 36, true, false, '💻', '#8B5CF6', 31),

('INTERNET_ALLOWANCE', 'Subsidio de Internet', 'Internet Allowance',
 'Pago mensual de servicio de internet en domicilio',
 'TECHNOLOGY', 'RECURRING', 'MONTHLY', true, true, false, true, 8000.00, true, 12, true, true, '📡', '#EC4899', 32),

-- SEGUROS
('LIFE_INSURANCE', 'Seguro de Vida', 'Life Insurance',
 'Póliza de seguro de vida para el empleado',
 'INSURANCE', 'RECURRING', 'MONTHLY', true, true, false, false, NULL, true, 12, true, true, '🛡️', '#10B981', 40),

('CAR_INSURANCE', 'Seguro de Automóvil', 'Car Insurance',
 'Póliza de seguro para vehículo asignado',
 'INSURANCE', 'RECURRING', 'MONTHLY', true, true, false, false, NULL, true, 12, true, true, '🚘', '#F59E0B', 41),

('HEALTH_INSURANCE_PREMIUM', 'Prepaga Premium', 'Premium Health Insurance',
 'Cobertura de salud premium (adicional a obra social)',
 'HEALTH', 'RECURRING', 'MONTHLY', true, true, false, true, 80000.00, true, 12, true, true, '🏥', '#3B82F6', 50),

-- BONOS
('PERFORMANCE_BONUS_MONTHLY', 'Bono por Productividad Mensual', 'Monthly Performance Bonus',
 'Bono mensual basado en cumplimiento de objetivos',
 'BONUS', 'RECURRING', 'MONTHLY', true, false, true, true, 100000.00, false, NULL, false, true, '🎯', '#10B981', 60),

('ANNUAL_BONUS', 'Bono Anual', 'Annual Bonus',
 'Bono de fin de año / 13º salario adicional',
 'BONUS', 'ONE_TIME', NULL, true, false, true, true, 500000.00, false, NULL, false, true, '🎁', '#F59E0B', 61),

('SEMIANNUAL_BONUS', 'Bono Semestral', 'Semiannual Bonus',
 'Bono cada 6 meses por objetivos cumplidos',
 'BONUS', 'RECURRING', 'SEMIANNUAL', true, false, true, true, 200000.00, false, NULL, false, true, '💰', '#EF4444', 62),

-- OTROS
('MEAL_VOUCHERS', 'Vales de Comida', 'Meal Vouchers',
 'Tickets de alimentación mensuales',
 'MONETARY', 'RECURRING', 'MONTHLY', false, false, false, true, 50000.00, false, NULL, false, true, '🍽️', '#F97316', 70),

('GYM_MEMBERSHIP', 'Membresía de Gimnasio', 'Gym Membership',
 'Pago de membresía de gimnasio',
 'HEALTH', 'RECURRING', 'MONTHLY', true, true, false, true, 20000.00, true, 12, true, true, '💪', '#10B981', 71),

('REMOTE_WORK_SETUP', 'Kit de Trabajo Remoto', 'Remote Work Setup',
 'Subsidio para equipar espacio de trabajo remoto (una vez)',
 'TECHNOLOGY', 'ONE_TIME', NULL, true, true, false, true, 150000.00, false, NULL, false, true, '🏡', '#8B5CF6', 72)

ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- PARTE 2: POLÍTICAS DE BENEFICIOS POR EMPRESA
-- ================================================================

CREATE TABLE IF NOT EXISTS company_benefit_policies (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- ⭐ SSOT: benefit_types table
  benefit_type_id INTEGER NOT NULL REFERENCES benefit_types(id) ON DELETE RESTRICT,

  -- ¿La empresa ofrece este beneficio?
  is_enabled BOOLEAN DEFAULT false,

  -- Límites específicos de la empresa (overrides defaults)
  max_amount DECIMAL(15,2),
  max_quantity INTEGER,
  max_beneficiaries_per_employee INTEGER DEFAULT 1, -- Ej: 3 hijos pueden tener guardería

  -- Duración y renovación (overrides defaults)
  duration_months INTEGER,
  renewal_required BOOLEAN,
  renewal_advance_days INTEGER,

  -- Aprobación (overrides defaults)
  requires_approval BOOLEAN,
  approval_levels INTEGER,
  -- Si approval_levels > 1, requiere aprobación en cadena (ej: supervisor → gerente → RRHH)

  -- Restricciones de elegibilidad
  eligible_roles INTEGER[], -- Array de role_ids (SSOT: roles table)
  eligible_departments INTEGER[], -- Array de department_ids
  min_seniority_months INTEGER, -- Meses mínimos en la empresa para ser elegible

  -- Configuración de pagos (si integra con payroll)
  payment_frequency VARCHAR(20), -- MONTHLY, BIWEEKLY, etc.
  payment_day INTEGER, -- Día del mes para pago (1-31)

  -- Metadata adicional
  terms_and_conditions TEXT,
  internal_notes TEXT,
  metadata JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(user_id),

  UNIQUE(company_id, benefit_type_id)
);

COMMENT ON TABLE company_benefit_policies IS 'Políticas de beneficios configuradas por cada empresa';
COMMENT ON COLUMN company_benefit_policies.company_id IS 'SSOT: companies.company_id';
COMMENT ON COLUMN company_benefit_policies.benefit_type_id IS 'SSOT: benefit_types.id';
COMMENT ON COLUMN company_benefit_policies.eligible_roles IS 'SSOT: Array de roles.id';

CREATE INDEX IF NOT EXISTS idx_company_benefits_company ON company_benefit_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_company_benefits_benefit ON company_benefit_policies(benefit_type_id);
CREATE INDEX IF NOT EXISTS idx_company_benefits_active ON company_benefit_policies(is_active, company_id);

-- ================================================================
-- PARTE 3: ASIGNACIONES DE BENEFICIOS A EMPLEADOS
-- ================================================================

CREATE TABLE IF NOT EXISTS employee_benefits (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employees table
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- ⭐ SSOT: benefit_types via company_benefit_policies
  company_benefit_policy_id INTEGER NOT NULL REFERENCES company_benefit_policies(id) ON DELETE RESTRICT,

  -- Monto/cantidad asignada
  assigned_amount DECIMAL(15,2),
  assigned_quantity INTEGER,

  -- Vigencia
  effective_from DATE NOT NULL,
  effective_until DATE,

  -- Estado del beneficio
  status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
  -- Estados: pending_approval, approved, active, suspended, cancelled, expired, rejected

  -- Razón de suspensión/cancelación
  status_reason TEXT,
  status_changed_at TIMESTAMP,
  status_changed_by UUID REFERENCES users(user_id),

  -- Beneficiarios (para guarderías, colegios)
  beneficiary_type VARCHAR(30), -- EMPLOYEE, CHILD, SPOUSE, FAMILY
  beneficiary_name VARCHAR(200),
  beneficiary_relationship VARCHAR(50),
  beneficiary_document_id VARCHAR(50),
  beneficiary_birth_date DATE,
  beneficiary_metadata JSONB DEFAULT '{}', -- Flexibilidad para datos adicionales

  -- Proveedor del beneficio (ej: nombre de la guardería, colegio)
  provider_name VARCHAR(200),
  provider_tax_id VARCHAR(50),
  provider_address TEXT,
  provider_contact_info JSONB DEFAULT '{}',

  -- Documentación (vincula a DMS)
  has_required_documents BOOLEAN DEFAULT false,
  documents_last_verified_at TIMESTAMP,
  documents_next_verification_date DATE,

  -- Renovación
  renewal_status VARCHAR(30), -- not_required, pending, in_progress, completed
  renewal_requested_at TIMESTAMP,
  renewal_approved_at TIMESTAMP,

  -- Notas internas
  internal_notes TEXT,

  -- Metadata flexible
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(user_id)
);

COMMENT ON TABLE employee_benefits IS 'Beneficios asignados a empleados individuales';
COMMENT ON COLUMN employee_benefits.user_id IS 'SSOT: users.user_id';
COMMENT ON COLUMN employee_benefits.company_id IS 'SSOT: companies.company_id';
COMMENT ON COLUMN employee_benefits.company_benefit_policy_id IS 'SSOT: company_benefit_policies.id → benefit_types.id';
COMMENT ON COLUMN employee_benefits.status IS 'pending_approval, approved, active, suspended, cancelled, expired, rejected';

CREATE INDEX IF NOT EXISTS idx_employee_benefits_employee ON employee_benefits(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_company ON employee_benefits(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_policy ON employee_benefits(company_benefit_policy_id);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_status ON employee_benefits(status);
CREATE INDEX IF NOT EXISTS idx_employee_benefits_active_dates ON employee_benefits(effective_from, effective_until) WHERE status = 'active';

-- ================================================================
-- PARTE 4: REQUISITOS DE DOCUMENTACIÓN
-- ================================================================

CREATE TABLE IF NOT EXISTS benefit_document_requirements (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: benefit_types table
  benefit_type_id INTEGER NOT NULL REFERENCES benefit_types(id) ON DELETE CASCADE,

  -- ⭐ SSOT: DMS - document_types table
  document_type_id INTEGER NOT NULL REFERENCES document_types(id) ON DELETE RESTRICT,

  -- ¿Es obligatorio o opcional?
  is_mandatory BOOLEAN DEFAULT true,

  -- ¿Debe renovarse periódicamente?
  requires_renewal BOOLEAN DEFAULT false,
  renewal_frequency_months INTEGER,

  -- ¿Se valida al asignar o solo al renovar?
  validate_on_assignment BOOLEAN DEFAULT true,
  validate_on_renewal BOOLEAN DEFAULT true,

  -- Días de anticipación para alerta de vencimiento
  alert_days_before_expiration INTEGER DEFAULT 30,

  -- Descripción de qué se espera del documento
  requirements_description TEXT,

  -- Orden de presentación en UI
  display_order INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE benefit_document_requirements IS 'Qué documentos requiere cada tipo de beneficio (SSOT: DMS document_types)';
COMMENT ON COLUMN benefit_document_requirements.benefit_type_id IS 'SSOT: benefit_types.id';
COMMENT ON COLUMN benefit_document_requirements.document_type_id IS 'SSOT: document_types.id (DMS)';

CREATE INDEX IF NOT EXISTS idx_benefit_doc_reqs_benefit ON benefit_document_requirements(benefit_type_id);
CREATE INDEX IF NOT EXISTS idx_benefit_doc_reqs_doctype ON benefit_document_requirements(document_type_id);

-- Insertar requisitos de documentación comunes
INSERT INTO benefit_document_requirements
(benefit_type_id, document_type_id, is_mandatory, requires_renewal, renewal_frequency_months, validate_on_assignment, validate_on_renewal, alert_days_before_expiration, requirements_description)
SELECT
  bt.id,
  dt.id,
  true, -- mandatory
  true, -- requires renewal
  12, -- cada 12 meses
  true, -- validate on assignment
  true, -- validate on renewal
  30, -- alert 30 days before
  'Certificado de escolaridad vigente del beneficiario'
FROM benefit_types bt
CROSS JOIN document_types dt
WHERE bt.code = 'SCHOOL_TUITION'
  AND dt.code = 'TRN.CER' -- Certificado de capacitación/escolaridad (usando categoría TRN)
ON CONFLICT DO NOTHING;

-- Guardería requiere certificado de nacimiento
INSERT INTO benefit_document_requirements
(benefit_type_id, document_type_id, is_mandatory, requires_renewal, renewal_frequency_months, validate_on_assignment, requirements_description)
SELECT
  bt.id,
  dt.id,
  true,
  false, -- No se renueva (permanente)
  NULL,
  true,
  'Acta de nacimiento del niño/a para validar edad elegible para guardería'
FROM benefit_types bt
CROSS JOIN document_types dt
WHERE bt.code = 'CHILDCARE_ALLOWANCE'
  AND dt.code = 'HR.PER.BIRTH_CERT'
ON CONFLICT DO NOTHING;

-- Auto de empresa requiere licencia de conducir
INSERT INTO benefit_document_requirements
(benefit_type_id, document_type_id, is_mandatory, requires_renewal, renewal_frequency_months, validate_on_assignment, validate_on_renewal, alert_days_before_expiration, requirements_description)
SELECT
  bt.id,
  dt.id,
  true,
  true, -- La licencia vence
  NULL, -- Renovación según vencimiento del documento
  true,
  true,
  60, -- Alertar 60 días antes de vencimiento de licencia
  'Licencia de conducir vigente categoría acorde al vehículo asignado'
FROM benefit_types bt
CROSS JOIN document_types dt
WHERE bt.code = 'COMPANY_CAR'
  AND dt.code = 'HR.PER.LICENSE'
ON CONFLICT DO NOTHING;

-- ================================================================
-- PARTE 5: DOCUMENTOS PRESENTADOS POR EMPLEADO
-- ================================================================

CREATE TABLE IF NOT EXISTS employee_benefit_documents (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employee_benefits table
  employee_benefit_id INTEGER NOT NULL REFERENCES employee_benefits(id) ON DELETE CASCADE,

  -- ⭐ SSOT: benefit_document_requirements table
  requirement_id INTEGER NOT NULL REFERENCES benefit_document_requirements(id) ON DELETE RESTRICT,

  -- ⭐ SSOT: DMS - Aquí NO se duplica el archivo, solo se REFERENCIA
  -- El archivo físico está en DMS (table: documents o similar)
  dms_document_id INTEGER, -- FK a tabla de documentos en DMS (cuando esté disponible)
  document_file_path VARCHAR(500), -- Path temporal hasta integración completa con DMS

  -- Información del documento
  document_number VARCHAR(100),
  issue_date DATE,
  expiration_date DATE,
  issuing_authority VARCHAR(200),

  -- Validación
  verification_status VARCHAR(30) DEFAULT 'pending',
  -- Estados: pending, verified, rejected, expired
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(user_id),
  verification_notes TEXT,

  -- Alertas de vencimiento
  expiration_alert_sent BOOLEAN DEFAULT false,
  expiration_alert_sent_at TIMESTAMP,

  is_current BOOLEAN DEFAULT true, -- Si se sube un nuevo documento, el anterior pasa a false

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by UUID REFERENCES users(user_id)
);

COMMENT ON TABLE employee_benefit_documents IS 'Documentos presentados por empleados para beneficios (SSOT: DMS para archivos físicos)';
COMMENT ON COLUMN employee_benefit_documents.employee_benefit_id IS 'SSOT: employee_benefits.id';
COMMENT ON COLUMN employee_benefit_documents.requirement_id IS 'SSOT: benefit_document_requirements.id';
COMMENT ON COLUMN employee_benefit_documents.dms_document_id IS 'SSOT: DMS documents table (cuando esté integrado)';
COMMENT ON COLUMN employee_benefit_documents.verification_status IS 'pending, verified, rejected, expired';

CREATE INDEX IF NOT EXISTS idx_benefit_docs_benefit ON employee_benefit_documents(employee_benefit_id);
CREATE INDEX IF NOT EXISTS idx_benefit_docs_requirement ON employee_benefit_documents(requirement_id);
CREATE INDEX IF NOT EXISTS idx_benefit_docs_status ON employee_benefit_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_benefit_docs_expiration ON employee_benefit_documents(expiration_date) WHERE is_current = true;

-- ================================================================
-- PARTE 6: WORKFLOW DE APROBACIÓN
-- ================================================================

CREATE TABLE IF NOT EXISTS benefit_approval_workflows (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: benefit_types table
  benefit_type_id INTEGER NOT NULL REFERENCES benefit_types(id) ON DELETE CASCADE,

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Nivel de aprobación (1 = primer nivel, 2 = segundo nivel, etc.)
  approval_level INTEGER NOT NULL,

  -- ¿Quién aprueba? (rol o usuario específico)
  approver_type VARCHAR(30) NOT NULL,
  -- Tipos: DIRECT_SUPERVISOR, ROLE, SPECIFIC_USER, DEPARTMENT_HEAD, HR_MANAGER

  -- Si approver_type = 'ROLE'
  -- NOTA: Tabla roles no existe, se podría usar aponnt_staff_roles(role_id) UUID
  approver_role_id INTEGER, -- TODO: Definir FK correcta cuando se implemente sistema de roles

  -- Si approver_type = 'SPECIFIC_USER'
  approver_user_id UUID REFERENCES users(user_id),

  -- Si approver_type = 'DEPARTMENT_HEAD' → se resuelve dinámicamente

  -- ¿Requiere que TODOS aprueben (AND) o con UNO alcanza (OR)?
  approval_logic VARCHAR(10) DEFAULT 'ALL', -- ALL, ANY

  -- Orden de procesamiento
  sequence_order INTEGER NOT NULL,

  -- Timeout de aprobación (días)
  timeout_days INTEGER DEFAULT 7,

  -- ¿Auto-aprobar si no hay respuesta?
  auto_approve_on_timeout BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(company_id, benefit_type_id, approval_level, sequence_order)
);

COMMENT ON TABLE benefit_approval_workflows IS 'Configuración de workflows de aprobación por beneficio y empresa';
COMMENT ON COLUMN benefit_approval_workflows.approver_type IS 'DIRECT_SUPERVISOR, ROLE, SPECIFIC_USER, DEPARTMENT_HEAD, HR_MANAGER';
COMMENT ON COLUMN benefit_approval_workflows.approver_role_id IS 'SSOT: roles.id';

CREATE INDEX IF NOT EXISTS idx_approval_workflows_benefit ON benefit_approval_workflows(benefit_type_id, company_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_level ON benefit_approval_workflows(approval_level);

-- ================================================================
-- PARTE 7: HISTORIAL DE APROBACIONES
-- ================================================================

CREATE TABLE IF NOT EXISTS benefit_approval_history (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employee_benefits table
  employee_benefit_id INTEGER NOT NULL REFERENCES employee_benefits(id) ON DELETE CASCADE,

  -- ⭐ SSOT: benefit_approval_workflows table
  workflow_id INTEGER NOT NULL REFERENCES benefit_approval_workflows(id) ON DELETE RESTRICT,

  -- Nivel de aprobación procesado
  approval_level INTEGER NOT NULL,

  -- ⭐ SSOT: users table (aprobador)
  approver_user_id UUID NOT NULL REFERENCES users(user_id),

  -- Decisión
  decision VARCHAR(30) NOT NULL,
  -- Decisiones: approved, rejected, pending, timed_out
  decision_date TIMESTAMP,
  decision_notes TEXT,

  -- Notificación
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE benefit_approval_history IS 'Historial de aprobaciones de beneficios';
COMMENT ON COLUMN benefit_approval_history.employee_benefit_id IS 'SSOT: employee_benefits.id';
COMMENT ON COLUMN benefit_approval_history.approver_user_id IS 'SSOT: users.id';
COMMENT ON COLUMN benefit_approval_history.decision IS 'approved, rejected, pending, timed_out';

CREATE INDEX IF NOT EXISTS idx_approval_history_benefit ON benefit_approval_history(employee_benefit_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver ON benefit_approval_history(approver_user_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_decision ON benefit_approval_history(decision);

-- ================================================================
-- PARTE 8: INTEGRACIÓN CON PAYROLL
-- ================================================================

CREATE TABLE IF NOT EXISTS benefit_payroll_concepts (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: benefit_types table
  benefit_type_id INTEGER NOT NULL REFERENCES benefit_types(id) ON DELETE CASCADE,

  -- ⭐ SSOT: payroll_concept_types table (Módulo Payroll)
  payroll_concept_type_id INTEGER NOT NULL REFERENCES payroll_concept_types(id) ON DELETE RESTRICT,

  -- ⭐ SSOT: companies table
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Condición para aplicar el concepto
  application_condition VARCHAR(50) NOT NULL,
  -- Condiciones: BENEFIT_ACTIVE, BENEFIT_ACTIVE_WITH_DOCS, BENEFIT_AMOUNT_BASED, FIXED_AMOUNT

  -- Si es FIXED_AMOUNT
  fixed_amount DECIMAL(15,2),

  -- Si es BENEFIT_AMOUNT_BASED (% del monto del beneficio)
  percentage_of_benefit DECIMAL(5,2),

  -- Límites
  min_amount DECIMAL(15,2),
  max_amount DECIMAL(15,2),

  -- ¿Se aplica automáticamente en liquidación?
  auto_apply_in_payroll BOOLEAN DEFAULT true,

  -- ¿Requiere validación de documentos al calcular?
  require_valid_documents BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(benefit_type_id, payroll_concept_type_id, company_id)
);

COMMENT ON TABLE benefit_payroll_concepts IS 'Vincula beneficios con conceptos de liquidación de sueldos';
COMMENT ON COLUMN benefit_payroll_concepts.benefit_type_id IS 'SSOT: benefit_types.id';
COMMENT ON COLUMN benefit_payroll_concepts.payroll_concept_type_id IS 'SSOT: payroll_concept_types.id (Módulo Payroll)';
COMMENT ON COLUMN benefit_payroll_concepts.application_condition IS 'BENEFIT_ACTIVE, BENEFIT_ACTIVE_WITH_DOCS, BENEFIT_AMOUNT_BASED, FIXED_AMOUNT';

CREATE INDEX IF NOT EXISTS idx_benefit_payroll_benefit ON benefit_payroll_concepts(benefit_type_id);
CREATE INDEX IF NOT EXISTS idx_benefit_payroll_concept ON benefit_payroll_concepts(payroll_concept_type_id);
CREATE INDEX IF NOT EXISTS idx_benefit_payroll_company ON benefit_payroll_concepts(company_id);

-- ================================================================
-- PARTE 9: ASSET TRACKING (Vehículos, Teléfonos, Computadoras)
-- ================================================================

CREATE TABLE IF NOT EXISTS employee_assigned_assets (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employee_benefits table (vincula al beneficio que otorga el activo)
  employee_benefit_id INTEGER NOT NULL REFERENCES employee_benefits(id) ON DELETE CASCADE,

  -- ⭐ SSOT: employees table
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Tipo de activo
  asset_type VARCHAR(50) NOT NULL,
  -- Tipos: VEHICLE, MOBILE_PHONE, LAPTOP, DESKTOP, TABLET, OTHER

  -- Identificación del activo
  asset_brand VARCHAR(100),
  asset_model VARCHAR(100),
  asset_serial_number VARCHAR(200),
  asset_imei VARCHAR(50), -- Para teléfonos
  asset_plate_number VARCHAR(20), -- Para vehículos
  asset_vin VARCHAR(50), -- Vehicle Identification Number

  -- Valorización
  asset_value DECIMAL(15,2),
  depreciation_rate DECIMAL(5,2), -- % anual de depreciación
  current_value DECIMAL(15,2),

  -- Estado del activo
  asset_condition VARCHAR(30) DEFAULT 'new',
  -- Condiciones: new, good, fair, poor, damaged, lost

  -- Fechas
  assignment_date DATE NOT NULL,
  expected_return_date DATE,
  actual_return_date DATE,

  -- Estado de asignación
  status VARCHAR(30) DEFAULT 'assigned',
  -- Estados: assigned, in_use, returned, damaged, lost, stolen

  -- Responsabilidad del empleado
  employee_responsible BOOLEAN DEFAULT true,
  deposit_amount DECIMAL(15,2), -- Depósito en garantía (si aplica)
  deposit_paid BOOLEAN DEFAULT false,

  -- Mantenimiento (para vehículos principalmente)
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_notes TEXT,

  -- Seguro (para vehículos)
  insurance_policy_number VARCHAR(100),
  insurance_company VARCHAR(200),
  insurance_expiration_date DATE,

  -- Notas
  assignment_notes TEXT,
  return_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(user_id)
);

COMMENT ON TABLE employee_assigned_assets IS 'Activos físicos asignados a empleados (vehículos, teléfonos, computadoras)';
COMMENT ON COLUMN employee_assigned_assets.employee_benefit_id IS 'SSOT: employee_benefits.id';
COMMENT ON COLUMN employee_assigned_assets.user_id IS 'SSOT: users.user_id';
COMMENT ON COLUMN employee_assigned_assets.asset_type IS 'VEHICLE, MOBILE_PHONE, LAPTOP, DESKTOP, TABLET, OTHER';
COMMENT ON COLUMN employee_assigned_assets.status IS 'assigned, in_use, returned, damaged, lost, stolen';

CREATE INDEX IF NOT EXISTS idx_assets_employee ON employee_assigned_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_benefit ON employee_assigned_assets(employee_benefit_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON employee_assigned_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON employee_assigned_assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_maintenance ON employee_assigned_assets(next_maintenance_date) WHERE asset_type = 'VEHICLE';

-- ================================================================
-- PARTE 10: CONTRATOS / COMODATOS DE ACTIVOS
-- ================================================================

CREATE TABLE IF NOT EXISTS asset_contracts (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employee_assigned_assets table
  asset_assignment_id INTEGER NOT NULL REFERENCES employee_assigned_assets(id) ON DELETE CASCADE,

  -- Tipo de contrato
  contract_type VARCHAR(30) NOT NULL,
  -- Tipos: COMODATO (préstamo gratuito), LEASE, LOAN, OTHER

  -- Número de contrato
  contract_number VARCHAR(100) UNIQUE,

  -- Fechas del contrato
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,

  -- ⭐ SSOT: DMS - El contrato PDF generado se guarda en DMS
  dms_contract_document_id INTEGER, -- FK a DMS cuando esté integrado
  contract_file_path VARCHAR(500), -- Path temporal

  -- Términos y condiciones
  terms_and_conditions TEXT,

  -- Firmas
  employee_signature_date DATE,
  company_signature_date DATE,
  employee_signed_by UUID REFERENCES users(user_id),
  company_signed_by UUID REFERENCES users(user_id),

  -- Estado del contrato
  status VARCHAR(30) DEFAULT 'draft',
  -- Estados: draft, pending_signature, signed, active, completed, terminated

  -- Terminación anticipada
  termination_date DATE,
  termination_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(user_id)
);

COMMENT ON TABLE asset_contracts IS 'Contratos y comodatos de activos asignados (SSOT: DMS para PDFs generados)';
COMMENT ON COLUMN asset_contracts.asset_assignment_id IS 'SSOT: employee_assigned_assets.id';
COMMENT ON COLUMN asset_contracts.dms_contract_document_id IS 'SSOT: DMS documents table';
COMMENT ON COLUMN asset_contracts.contract_type IS 'COMODATO, LEASE, LOAN, OTHER';
COMMENT ON COLUMN asset_contracts.status IS 'draft, pending_signature, signed, active, completed, terminated';

CREATE INDEX IF NOT EXISTS idx_contracts_asset ON asset_contracts(asset_assignment_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON asset_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON asset_contracts(contract_start_date, contract_end_date);

-- ================================================================
-- PARTE 11: LÍMITES DE GASTOS Y VIÁTICOS (Pasajes, etc.)
-- ================================================================

CREATE TABLE IF NOT EXISTS benefit_expense_allowances (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: employee_benefits table
  employee_benefit_id INTEGER NOT NULL REFERENCES employee_benefits(id) ON DELETE CASCADE,

  -- Período de vigencia del límite
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Límite asignado
  allowance_type VARCHAR(30) NOT NULL,
  -- Tipos: AMOUNT_BASED (límite en monto), QUANTITY_BASED (ej: 4 pasajes al año)

  max_amount DECIMAL(15,2),
  max_quantity INTEGER,

  -- Consumo actual
  consumed_amount DECIMAL(15,2) DEFAULT 0,
  consumed_quantity INTEGER DEFAULT 0,

  -- ¿Renovación automática al siguiente período?
  auto_renew BOOLEAN DEFAULT false,

  -- Estado
  status VARCHAR(30) DEFAULT 'active',
  -- Estados: active, expired, exhausted, cancelled

  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE benefit_expense_allowances IS 'Límites de gastos para beneficios tipo EXPENSE_ALLOWANCE (pasajes, viáticos)';
COMMENT ON COLUMN benefit_expense_allowances.employee_benefit_id IS 'SSOT: employee_benefits.id';
COMMENT ON COLUMN benefit_expense_allowances.allowance_type IS 'AMOUNT_BASED, QUANTITY_BASED';
COMMENT ON COLUMN benefit_expense_allowances.status IS 'active, expired, exhausted, cancelled';

CREATE INDEX IF NOT EXISTS idx_allowances_benefit ON benefit_expense_allowances(employee_benefit_id);
CREATE INDEX IF NOT EXISTS idx_allowances_period ON benefit_expense_allowances(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_allowances_status ON benefit_expense_allowances(status);

-- ================================================================
-- PARTE 12: RENDICIONES DE GASTOS
-- ================================================================

CREATE TABLE IF NOT EXISTS benefit_expense_submissions (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: benefit_expense_allowances table
  allowance_id INTEGER NOT NULL REFERENCES benefit_expense_allowances(id) ON DELETE CASCADE,

  -- ⭐ SSOT: employees table
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Tipo de gasto
  expense_type VARCHAR(50),
  -- Tipos: FLIGHT, HOTEL, MEAL, TRANSPORT, OTHER

  -- Descripción del gasto
  description TEXT NOT NULL,

  -- Fecha del gasto
  expense_date DATE NOT NULL,

  -- Monto
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ARS',

  -- Cantidad (si aplica)
  quantity INTEGER DEFAULT 1,

  -- Documentación soporte (facturas, tickets)
  -- ⭐ SSOT: DMS para archivos
  supporting_documents JSONB DEFAULT '[]', -- Array de DMS document IDs

  -- Validación
  verification_status VARCHAR(30) DEFAULT 'pending',
  -- Estados: pending, verified, rejected, reimbursed
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(user_id),
  verification_notes TEXT,

  -- Reembolso
  reimbursement_status VARCHAR(30) DEFAULT 'pending',
  -- Estados: pending, approved, paid, rejected
  reimbursement_date DATE,
  reimbursement_amount DECIMAL(15,2),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_by UUID REFERENCES users(user_id)
);

COMMENT ON TABLE benefit_expense_submissions IS 'Rendiciones de gastos de empleados contra allowances asignados';
COMMENT ON COLUMN benefit_expense_submissions.allowance_id IS 'SSOT: benefit_expense_allowances.id';
COMMENT ON COLUMN benefit_expense_submissions.user_id IS 'SSOT: users.user_id';
COMMENT ON COLUMN benefit_expense_submissions.supporting_documents IS 'SSOT: Array de DMS document IDs';
COMMENT ON COLUMN benefit_expense_submissions.verification_status IS 'pending, verified, rejected, reimbursed';
COMMENT ON COLUMN benefit_expense_submissions.reimbursement_status IS 'pending, approved, paid, rejected';

CREATE INDEX IF NOT EXISTS idx_submissions_allowance ON benefit_expense_submissions(allowance_id);
CREATE INDEX IF NOT EXISTS idx_submissions_employee ON benefit_expense_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON benefit_expense_submissions(verification_status);
CREATE INDEX IF NOT EXISTS idx_submissions_reimbursement ON benefit_expense_submissions(reimbursement_status);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON benefit_expense_submissions(expense_date);

-- ================================================================
-- PARTE 13: FUNCIONES POSTGRESQL
-- ================================================================

-- Función 1: Verificar si empleado es elegible para un beneficio
CREATE OR REPLACE FUNCTION is_employee_eligible_for_benefit(
  p_user_id UUID,
  p_benefit_type_id INTEGER,
  p_company_id INTEGER
)
RETURNS TABLE(
  is_eligible BOOLEAN,
  reason VARCHAR(500),
  policy_id INTEGER
) AS $$
DECLARE
  v_policy RECORD;
  v_user RECORD;
  v_seniority_months INTEGER;
BEGIN
  -- Obtener política del beneficio para la empresa
  SELECT * INTO v_policy
  FROM company_benefit_policies
  WHERE company_id = p_company_id
    AND benefit_type_id = p_benefit_type_id
    AND is_enabled = true
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'La empresa no ofrece este beneficio'::VARCHAR(500), NULL::INTEGER;
    RETURN;
  END IF;

  -- Obtener datos del usuario/empleado
  SELECT *
  INTO v_user
  FROM users e
  WHERE e.user_id = p_user_id AND e.company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Empleado no encontrado o no pertenece a la empresa'::VARCHAR(500), NULL::INTEGER;
    RETURN;
  END IF;

  -- Verificar rol elegible
  IF v_policy.eligible_roles IS NOT NULL AND array_length(v_policy.eligible_roles, 1) > 0 THEN
    IF NOT (v_user.role_id = ANY(v_policy.eligible_roles)) THEN
      RETURN QUERY SELECT false, 'El rol del empleado no es elegible para este beneficio'::VARCHAR(500), v_policy.id;
      RETURN;
    END IF;
  END IF;

  -- Verificar departamento elegible
  IF v_policy.eligible_departments IS NOT NULL AND array_length(v_policy.eligible_departments, 1) > 0 THEN
    IF NOT (v_user.department_id = ANY(v_policy.eligible_departments)) THEN
      RETURN QUERY SELECT false, 'El departamento del empleado no es elegible para este beneficio'::VARCHAR(500), v_policy.id;
      RETURN;
    END IF;
  END IF;

  -- Verificar antigüedad mínima
  IF v_policy.min_seniority_months IS NOT NULL THEN
    SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_user.hire_date)) * 12 +
           EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_user.hire_date))
    INTO v_seniority_months;

    IF v_seniority_months < v_policy.min_seniority_months THEN
      RETURN QUERY SELECT false,
        format('Requiere al menos %s meses de antigüedad (tienes %s meses)', v_policy.min_seniority_months, v_seniority_months)::VARCHAR(500),
        v_policy.id;
      RETURN;
    END IF;
  END IF;

  -- Empleado es elegible
  RETURN QUERY SELECT true, 'Empleado elegible para este beneficio'::VARCHAR(500), v_policy.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_employee_eligible_for_benefit IS 'Verifica si un empleado cumple los requisitos de elegibilidad para un beneficio';

-- Función 2: Calcular próximo vencimiento de documentos de un beneficio
CREATE OR REPLACE FUNCTION get_benefit_documents_expiring_soon(
  p_employee_benefit_id INTEGER,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE(
  document_id INTEGER,
  requirement_id INTEGER,
  document_type_code VARCHAR(50),
  expiration_date DATE,
  days_to_expiration INTEGER,
  is_mandatory BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ebd.id,
    ebd.requirement_id,
    dt.code,
    ebd.expiration_date,
    (ebd.expiration_date - CURRENT_DATE)::INTEGER,
    bdr.is_mandatory
  FROM employee_benefit_documents ebd
  JOIN benefit_document_requirements bdr ON ebd.requirement_id = bdr.id
  JOIN document_types dt ON bdr.document_type_id = dt.id
  WHERE ebd.employee_benefit_id = p_employee_benefit_id
    AND ebd.is_current = true
    AND ebd.verification_status = 'verified'
    AND ebd.expiration_date IS NOT NULL
    AND ebd.expiration_date <= (CURRENT_DATE + p_days_ahead)
  ORDER BY ebd.expiration_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_benefit_documents_expiring_soon IS 'Retorna documentos de un beneficio que vencen próximamente';

-- Función 3: Validar que todos los documentos obligatorios estén presentes y vigentes
CREATE OR REPLACE FUNCTION validate_benefit_documents(
  p_employee_benefit_id INTEGER
)
RETURNS TABLE(
  all_valid BOOLEAN,
  missing_documents INTEGER,
  expired_documents INTEGER,
  pending_verification INTEGER,
  details JSONB
) AS $$
DECLARE
  v_benefit RECORD;
  v_missing INTEGER := 0;
  v_expired INTEGER := 0;
  v_pending INTEGER := 0;
  v_details JSONB := '[]'::jsonb;
  v_req RECORD;
BEGIN
  -- Obtener el beneficio
  SELECT * INTO v_benefit
  FROM employee_benefits
  WHERE id = p_employee_benefit_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 0, '[]'::jsonb;
    RETURN;
  END IF;

  -- Iterar sobre requisitos obligatorios
  FOR v_req IN
    SELECT bdr.*, dt.code as doc_type_code, dt.name as doc_type_name
    FROM benefit_document_requirements bdr
    JOIN company_benefit_policies cbp ON bdr.benefit_type_id = cbp.benefit_type_id
    JOIN document_types dt ON bdr.document_type_id = dt.id
    WHERE cbp.id = v_benefit.company_benefit_policy_id
      AND bdr.is_mandatory = true
      AND bdr.is_active = true
  LOOP
    -- Buscar documento actual del empleado
    DECLARE
      v_doc RECORD;
    BEGIN
      SELECT * INTO v_doc
      FROM employee_benefit_documents
      WHERE employee_benefit_id = p_employee_benefit_id
        AND requirement_id = v_req.id
        AND is_current = true
      ORDER BY created_at DESC
      LIMIT 1;

      IF NOT FOUND THEN
        -- Documento faltante
        v_missing := v_missing + 1;
        v_details := v_details || jsonb_build_object(
          'type', 'missing',
          'requirement_id', v_req.id,
          'document_type', v_req.doc_type_code,
          'document_name', v_req.doc_type_name
        );
      ELSIF v_doc.expiration_date IS NOT NULL AND v_doc.expiration_date < CURRENT_DATE THEN
        -- Documento vencido
        v_expired := v_expired + 1;
        v_details := v_details || jsonb_build_object(
          'type', 'expired',
          'requirement_id', v_req.id,
          'document_type', v_req.doc_type_code,
          'document_name', v_req.doc_type_name,
          'expiration_date', v_doc.expiration_date
        );
      ELSIF v_doc.verification_status = 'pending' THEN
        -- Documento pendiente de verificación
        v_pending := v_pending + 1;
        v_details := v_details || jsonb_build_object(
          'type', 'pending_verification',
          'requirement_id', v_req.id,
          'document_type', v_req.doc_type_code,
          'document_name', v_req.doc_type_name
        );
      END IF;
    END;
  END LOOP;

  -- Retornar resultado
  RETURN QUERY SELECT
    (v_missing = 0 AND v_expired = 0)::BOOLEAN,
    v_missing,
    v_expired,
    v_pending,
    v_details;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_benefit_documents IS 'Valida que todos los documentos obligatorios de un beneficio estén presentes y vigentes';

-- Función 4: Calcular consumo de allowance
CREATE OR REPLACE FUNCTION calculate_allowance_consumption(
  p_allowance_id INTEGER
)
RETURNS TABLE(
  consumed_amount DECIMAL(15,2),
  consumed_quantity INTEGER,
  remaining_amount DECIMAL(15,2),
  remaining_quantity INTEGER,
  consumption_percentage DECIMAL(5,2)
) AS $$
DECLARE
  v_allowance RECORD;
  v_total_amount DECIMAL(15,2);
  v_total_quantity INTEGER;
BEGIN
  -- Obtener allowance
  SELECT * INTO v_allowance
  FROM benefit_expense_allowances
  WHERE id = p_allowance_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::DECIMAL(15,2), 0, 0::DECIMAL(15,2), 0, 0::DECIMAL(5,2);
    RETURN;
  END IF;

  -- Calcular consumo de rendiciones aprobadas
  SELECT
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(quantity), 0)
  INTO v_total_amount, v_total_quantity
  FROM benefit_expense_submissions
  WHERE allowance_id = p_allowance_id
    AND verification_status IN ('verified', 'reimbursed');

  -- Retornar cálculo
  RETURN QUERY SELECT
    v_total_amount,
    v_total_quantity,
    GREATEST(COALESCE(v_allowance.max_amount, 0) - v_total_amount, 0),
    GREATEST(COALESCE(v_allowance.max_quantity, 0) - v_total_quantity, 0),
    CASE
      WHEN v_allowance.max_amount > 0 THEN (v_total_amount / v_allowance.max_amount * 100)
      WHEN v_allowance.max_quantity > 0 THEN (v_total_quantity::DECIMAL / v_allowance.max_quantity * 100)
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_allowance_consumption IS 'Calcula consumo y saldo disponible de un expense allowance';

-- ================================================================
-- PARTE 14: TRIGGERS PARA AUTOMATIZACIÓN
-- ================================================================

-- Trigger 1: Actualizar estado de employee_benefit cuando todos los documentos son válidos
CREATE OR REPLACE FUNCTION update_benefit_documents_status()
RETURNS TRIGGER AS $$
DECLARE
  v_validation RECORD;
BEGIN
  -- Validar documentos del beneficio
  SELECT * INTO v_validation
  FROM validate_benefit_documents(NEW.employee_benefit_id);

  -- Actualizar campo has_required_documents en employee_benefits
  UPDATE employee_benefits
  SET
    has_required_documents = v_validation.all_valid,
    documents_last_verified_at = CURRENT_TIMESTAMP
  WHERE id = NEW.employee_benefit_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_benefit_docs_status ON employee_benefit_documents;
CREATE TRIGGER trg_update_benefit_docs_status
AFTER INSERT OR UPDATE ON employee_benefit_documents
FOR EACH ROW
EXECUTE FUNCTION update_benefit_documents_status();

COMMENT ON TRIGGER trg_update_benefit_docs_status ON employee_benefit_documents IS 'Actualiza estado de documentación del beneficio';

-- Trigger 2: Crear notificación cuando beneficio es aprobado
CREATE OR REPLACE FUNCTION notify_benefit_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Aquí se insertaría en la tabla de notificaciones del sistema central
    -- Por ahora, solo registramos en logs
    RAISE NOTICE 'NOTIFICACIÓN: Beneficio ID % aprobado para empleado ID %', NEW.id, NEW.user_id;

    -- TODO: INSERT INTO notifications (user_id, type, title, message, ...)
    -- VALUES (NEW.user_id, 'benefit_approved', 'Beneficio Aprobado', '...', ...)
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_benefit_approved ON employee_benefits;
CREATE TRIGGER trg_notify_benefit_approved
AFTER UPDATE ON employee_benefits
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION notify_benefit_approved();

COMMENT ON TRIGGER trg_notify_benefit_approved ON employee_benefits IS 'Genera notificación cuando un beneficio es aprobado';

-- Trigger 3: Actualizar consumo en allowance cuando se aprueba una rendición
CREATE OR REPLACE FUNCTION update_allowance_consumption()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'verified' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'verified') THEN
    UPDATE benefit_expense_allowances
    SET
      consumed_amount = consumed_amount + NEW.amount,
      consumed_quantity = consumed_quantity + NEW.quantity,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.allowance_id;

    -- Verificar si se agotó el límite
    UPDATE benefit_expense_allowances
    SET status = 'exhausted'
    WHERE id = NEW.allowance_id
      AND (
        (max_amount IS NOT NULL AND consumed_amount >= max_amount) OR
        (max_quantity IS NOT NULL AND consumed_quantity >= max_quantity)
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_allowance_consumption ON benefit_expense_submissions;
CREATE TRIGGER trg_update_allowance_consumption
AFTER INSERT OR UPDATE ON benefit_expense_submissions
FOR EACH ROW
EXECUTE FUNCTION update_allowance_consumption();

COMMENT ON TRIGGER trg_update_allowance_consumption ON benefit_expense_submissions IS 'Actualiza consumo de allowance cuando se aprueba una rendición';

-- Trigger 4: Marcar beneficio como expirado cuando vence
-- (Este trigger debería ejecutarse mediante un JOB programado, pero lo dejamos como función)
CREATE OR REPLACE FUNCTION expire_benefits()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE employee_benefits
  SET
    status = 'expired',
    status_reason = 'Beneficio vencido por fecha de expiración',
    status_changed_at = CURRENT_TIMESTAMP
  WHERE status = 'active'
    AND effective_until < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_benefits IS 'Marca como expirados los beneficios que pasaron su fecha de vencimiento (ejecutar diariamente)';

-- ================================================================
-- PARTE 15: VISTAS PARA REPORTES
-- ================================================================

-- Vista 1: Resumen de beneficios activos por empleado
CREATE OR REPLACE VIEW v_employee_benefits_summary AS
SELECT
  eb.user_id,
  e."firstName" || ' ' || e."lastName" as employee_name,
  e.company_id,
  c.name as company_name,
  bt.code as benefit_code,
  bt.name as benefit_name,
  bt.category,
  eb.status,
  eb.assigned_amount,
  eb.assigned_quantity,
  eb.effective_from,
  eb.effective_until,
  eb.has_required_documents,
  CASE
    WHEN eb.effective_until IS NOT NULL AND eb.effective_until < CURRENT_DATE THEN 'Vencido'
    WHEN eb.effective_until IS NOT NULL AND eb.effective_until - CURRENT_DATE <= 30 THEN 'Por vencer'
    ELSE 'Vigente'
  END as expiration_status
FROM employee_benefits eb
JOIN users e ON eb.user_id = e.user_id
JOIN companies c ON eb.company_id = c.company_id
JOIN company_benefit_policies cbp ON eb.company_benefit_policy_id = cbp.id
JOIN benefit_types bt ON cbp.benefit_type_id = bt.id;

COMMENT ON VIEW v_employee_benefits_summary IS 'Resumen de beneficios activos por empleado';

-- Vista 2: Activos asignados con información completa
CREATE OR REPLACE VIEW v_assigned_assets_full AS
SELECT
  eaa.id as assignment_id,
  eaa.user_id,
  e."firstName" || ' ' || e."lastName" as employee_name,
  e.company_id,
  bt.name as benefit_name,
  eaa.asset_type,
  eaa.asset_brand,
  eaa.asset_model,
  eaa.asset_serial_number,
  eaa.asset_plate_number,
  eaa.asset_value,
  eaa.current_value,
  eaa.assignment_date,
  eaa.expected_return_date,
  eaa.actual_return_date,
  eaa.status,
  eaa.asset_condition,
  ac.contract_number,
  ac.contract_type,
  ac.status as contract_status
FROM employee_assigned_assets eaa
JOIN employee_benefits eb ON eaa.employee_benefit_id = eb.id
JOIN company_benefit_policies cbp ON eb.company_benefit_policy_id = cbp.id
JOIN benefit_types bt ON cbp.benefit_type_id = bt.id
JOIN users e ON eaa.user_id = e.user_id
LEFT JOIN asset_contracts ac ON ac.asset_assignment_id = eaa.id;

COMMENT ON VIEW v_assigned_assets_full IS 'Activos asignados con información completa de empleado y contrato';

-- ================================================================
-- FIN DE LA MIGRACIÓN
-- ================================================================

-- Log de ejecución
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE 'Sistema de Beneficios y Amenities Laborales';
  RAISE NOTICE 'Tablas creadas: 12';
  RAISE NOTICE 'Funciones creadas: 4';
  RAISE NOTICE 'Triggers creados: 4';
  RAISE NOTICE 'Vistas creadas: 2';
  RAISE NOTICE 'Fecha: %', CURRENT_TIMESTAMP;
  RAISE NOTICE '===========================================';
END $$;
