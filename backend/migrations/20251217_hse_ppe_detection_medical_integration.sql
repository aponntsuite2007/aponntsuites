-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: HSE + Detección EPP con IA + Integración Médica
-- Fecha: 2025-12-17
-- Descripción: Sistema completo de detección de EPP con IA, integración con
--              módulo médico, regulaciones por país y correlación de accidentes
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 1: CATÁLOGO DE VIOLACIONES (SSOT)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hse_violation_catalog (
  -- Identificador único (SSOT key)
  code VARCHAR(50) PRIMARY KEY,

  -- Metadatos
  category VARCHAR(50) NOT NULL CHECK (category IN ('EPP', 'PROCEDIMIENTO', 'CONDICION')),
  name VARCHAR(200) NOT NULL,
  name_short VARCHAR(50),
  description TEXT,
  icon VARCHAR(10),

  -- Configuración detección IA
  is_detectable_by_ai BOOLEAN DEFAULT false,
  ai_model_tag VARCHAR(100),
  ai_confidence_threshold DECIMAL(3,2) DEFAULT 0.70,

  -- Configuración selección médica
  is_medical_selectable BOOLEAN DEFAULT true,
  related_cie10_codes TEXT[],
  body_locations TEXT[],

  -- Capacitación por defecto
  default_training_template_id INTEGER,
  training_is_mandatory BOOLEAN DEFAULT true,

  -- Sanción por defecto (si reincidente)
  default_sanction_type VARCHAR(50),
  reincidence_threshold INTEGER DEFAULT 3,

  -- Orden y visibilidad
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_violation_catalog_category ON hse_violation_catalog(category);
CREATE INDEX IF NOT EXISTS idx_violation_catalog_ai ON hse_violation_catalog(is_detectable_by_ai) WHERE is_detectable_by_ai = true;
CREATE INDEX IF NOT EXISTS idx_violation_catalog_medical ON hse_violation_catalog(is_medical_selectable) WHERE is_medical_selectable = true;
CREATE INDEX IF NOT EXISTS idx_violation_catalog_active ON hse_violation_catalog(is_active) WHERE is_active = true;

-- Datos iniciales del catálogo
INSERT INTO hse_violation_catalog (code, category, name, name_short, icon, is_detectable_by_ai, ai_model_tag, related_cie10_codes, body_locations, display_order) VALUES
-- EPP (Detectables por IA)
('EPP_CASCO', 'EPP', 'No uso o uso indebido de casco de seguridad', 'Casco', '⛑️', true, 'hard_hat', ARRAY['S00', 'S01', 'S02', 'S06', 'S07', 'S09'], ARRAY['cabeza', 'craneo'], 1),
('EPP_CHALECO', 'EPP', 'No uso o uso indebido de chaleco reflectante', 'Chaleco', '🦺', true, 'safety_vest', ARRAY['W20', 'W21', 'W22', 'V01', 'V09'], ARRAY['torso'], 2),
('EPP_GUANTES', 'EPP', 'No uso o uso indebido de guantes de protección', 'Guantes', '🧤', true, 'gloves', ARRAY['S60', 'S61', 'S62', 'S63', 'S64', 'S65', 'S66', 'S67', 'S68', 'S69'], ARRAY['mano', 'manos', 'dedos', 'muneca'], 3),
('EPP_GAFAS', 'EPP', 'No uso o uso indebido de gafas de seguridad', 'Gafas', '👓', true, 'safety_glasses', ARRAY['S05', 'T15', 'T26', 'H16', 'H44'], ARRAY['ojos', 'cara'], 4),
('EPP_AUDITIVA', 'EPP', 'No uso o uso indebido de protección auditiva', 'Auditiva', '👂', true, 'ear_protection', ARRAY['H83', 'H90', 'H91', 'H93'], ARRAY['oidos'], 5),
('EPP_CALZADO', 'EPP', 'No uso o uso indebido de calzado de seguridad', 'Calzado', '👟', true, 'safety_shoes', ARRAY['S90', 'S91', 'S92', 'S93', 'S97', 'S98', 'S99'], ARRAY['pie', 'pies', 'tobillo'], 6),
('EPP_MASCARILLA', 'EPP', 'No uso o uso indebido de mascarilla/respirador', 'Mascarilla', '😷', true, 'face_mask', ARRAY['J68', 'J70', 'T59', 'J44', 'J45'], ARRAY['vias_respiratorias', 'pulmones'], 7),
('EPP_ARNES', 'EPP', 'No uso o uso indebido de arnés de seguridad', 'Arnés', '🦾', false, NULL, ARRAY['W11', 'W12', 'W13', 'W17', 'W19', 'S32', 'S22', 'S72'], ARRAY['espalda', 'columna', 'cadera'], 8),
('EPP_DELANTAL', 'EPP', 'No uso o uso indebido de delantal protector', 'Delantal', '🥼', false, NULL, ARRAY['T20', 'T21', 'T30', 'T31'], ARRAY['torso', 'abdomen'], 9),
('EPP_CARETA', 'EPP', 'No uso o uso indebido de careta de soldador', 'Careta', '🎭', false, NULL, ARRAY['T26', 'H44', 'W89'], ARRAY['cara', 'ojos'], 10),

-- PROCEDIMIENTO (No detectables por IA, selección médica)
('PROC_MAQUINARIA', 'PROCEDIMIENTO', 'Uso incorrecto de maquinaria/equipos', 'Maquinaria', '⚙️', false, NULL, ARRAY['W24', 'W28', 'W29', 'W30', 'W31', 'W45'], NULL, 20),
('PROC_BLOQUEO', 'PROCEDIMIENTO', 'No aplicación de bloqueo/etiquetado (LOTO)', 'LOTO', '🔒', false, NULL, ARRAY['W24', 'W86', 'W87', 'W88'], NULL, 21),
('PROC_ERGONOMIA', 'PROCEDIMIENTO', 'Postura o levantamiento incorrecto', 'Ergonomía', '🏋️', false, NULL, ARRAY['M54', 'M62', 'M79', 'S33', 'S39'], ARRAY['espalda', 'columna', 'lumbar'], 22),
('PROC_SEÑALIZACION', 'PROCEDIMIENTO', 'Ignorar señalización de seguridad', 'Señalización', '🚧', false, NULL, NULL, NULL, 23),
('PROC_ZONA', 'PROCEDIMIENTO', 'Acceso a zona restringida sin autorización', 'Zona restringida', '⛔', false, NULL, NULL, NULL, 24),
('PROC_VELOCIDAD', 'PROCEDIMIENTO', 'Exceso de velocidad (vehículos/montacargas)', 'Velocidad', '🚗', false, NULL, ARRAY['V01', 'V09', 'V19', 'V29', 'V39', 'V49', 'V59', 'V69', 'V79', 'V89'], NULL, 25),
('PROC_QUIMICOS', 'PROCEDIMIENTO', 'Manipulación incorrecta de sustancias químicas', 'Químicos', '🧪', false, NULL, ARRAY['T51', 'T52', 'T53', 'T54', 'T55', 'T56', 'T57', 'T65'], ARRAY['piel', 'ojos', 'vias_respiratorias'], 26),
('PROC_ELECTRICO', 'PROCEDIMIENTO', 'Trabajo eléctrico sin protocolo de seguridad', 'Eléctrico', '⚡', false, NULL, ARRAY['T75', 'W85', 'W86', 'W87'], NULL, 27),
('PROC_ALTURA', 'PROCEDIMIENTO', 'Trabajo en altura sin protocolo de seguridad', 'Altura', '🪜', false, NULL, ARRAY['W11', 'W12', 'W13', 'W17', 'W19'], NULL, 28),
('PROC_ESPACIO_CONFINADO', 'PROCEDIMIENTO', 'Ingreso a espacio confinado sin protocolo', 'Esp. Confinado', '🕳️', false, NULL, ARRAY['T71', 'W81', 'X47'], ARRAY['vias_respiratorias'], 29),

-- CONDICION (No detectables por IA, para indicar causas no atribuibles al empleado)
('COND_INFRAESTRUCTURA', 'CONDICION', 'Condición insegura de instalaciones', 'Infraestructura', '🏗️', false, NULL, ARRAY['W20', 'W22', 'W23'], NULL, 40),
('COND_HERRAMIENTAS', 'CONDICION', 'Herramientas en mal estado', 'Herramientas', '🔧', false, NULL, ARRAY['W27', 'W45'], ARRAY['manos', 'ojos'], 41),
('COND_ILUMINACION', 'CONDICION', 'Iluminación deficiente', 'Iluminación', '💡', false, NULL, NULL, ARRAY['ojos'], 42),
('COND_ORDEN', 'CONDICION', 'Falta de orden y limpieza', 'Orden', '🧹', false, NULL, ARRAY['W01', 'W03', 'W04', 'W22'], NULL, 43),
('COND_VENTILACION', 'CONDICION', 'Ventilación insuficiente', 'Ventilación', '🌬️', false, NULL, ARRAY['J68', 'T59'], ARRAY['vias_respiratorias'], 44),
('COND_RUIDO', 'CONDICION', 'Nivel de ruido excesivo sin control', 'Ruido', '🔊', false, NULL, ARRAY['H83', 'H90', 'H91'], ARRAY['oidos'], 45),
('COND_TEMPERATURA', 'CONDICION', 'Temperatura extrema sin control', 'Temperatura', '🌡️', false, NULL, ARRAY['T67', 'T68', 'T69', 'T33', 'T34', 'T35'], NULL, 46),
('COND_TERCEROS', 'CONDICION', 'Acción de terceros', 'Terceros', '👥', false, NULL, NULL, NULL, 47),
('COND_EPP_NO_DISPONIBLE', 'CONDICION', 'EPP requerido no disponible', 'EPP no disponible', '📦', false, NULL, NULL, NULL, 48),
('COND_CAPACITACION_INSUFICIENTE', 'CONDICION', 'Falta de capacitación adecuada', 'Sin capacitación', '📚', false, NULL, NULL, NULL, 49)
ON CONFLICT (code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2: TIPOS DE AUSENCIA MÉDICA (SSOT)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS medical_absence_types (
  code VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Clasificación
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'ENFERMEDAD_COMUN',
    'ENFERMEDAD_PROFESIONAL',
    'ACCIDENTE_TRABAJO',
    'ENFERMEDAD_RELACIONADA'
  )),

  -- Subtipos (para accidentes)
  subtypes JSONB,

  -- Requiere revisión HSE
  requires_hse_review BOOLEAN DEFAULT false,

  -- Configuración de campos obligatorios
  requires_cie10 BOOLEAN DEFAULT true,
  requires_body_location BOOLEAN DEFAULT false,
  requires_violation_check BOOLEAN DEFAULT false,

  -- Regulación
  legal_framework TEXT,

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO medical_absence_types (code, name, category, subtypes, requires_hse_review, requires_cie10, requires_body_location, requires_violation_check, display_order) VALUES
('ENF_COMUN', 'Enfermedad Común', 'ENFERMEDAD_COMUN', NULL, false, true, false, false, 1),
('ENF_PROFESIONAL', 'Enfermedad Profesional', 'ENFERMEDAD_PROFESIONAL',
  '[{"code": "GRUPO1", "name": "Agentes químicos"}, {"code": "GRUPO2", "name": "Agentes físicos"}, {"code": "GRUPO3", "name": "Agentes biológicos"}, {"code": "GRUPO4", "name": "Inhalación de sustancias"}, {"code": "GRUPO5", "name": "Enfermedades de la piel"}, {"code": "GRUPO6", "name": "Agentes carcinógenos"}]'::JSONB,
  true, true, true, true, 2),
('ACC_TRABAJO', 'Accidente de Trabajo', 'ACCIDENTE_TRABAJO',
  '[{"code": "IN_LABORE", "name": "En lugar de trabajo"}, {"code": "IN_ITINERE", "name": "En trayecto (ida/vuelta)"}, {"code": "EN_MISION", "name": "En misión/comisión"}]'::JSONB,
  true, true, true, true, 3),
('ENF_RELACIONADA', 'Enfermedad Relacionada con el Trabajo', 'ENFERMEDAD_RELACIONADA',
  '[{"code": "ESTRES", "name": "Estrés laboral"}, {"code": "BURNOUT", "name": "Síndrome de burnout"}, {"code": "MOBBING", "name": "Acoso laboral"}, {"code": "MUSCULOESQUELETICO", "name": "Trastorno musculoesquelético"}, {"code": "EDIFICIO_ENFERMO", "name": "Síndrome del edificio enfermo"}]'::JSONB,
  true, true, false, false, 4)
ON CONFLICT (code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 3: REGULACIONES POR PAÍS (SSOT)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS country_safety_regulations (
  country_code VARCHAR(2) PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL,

  -- Regulación de monitoreo EPP
  allows_individual_tracking BOOLEAN DEFAULT true,
  requires_explicit_consent BOOLEAN DEFAULT true,
  consent_renewal_days INTEGER,

  -- Retención de datos
  image_retention_max_days INTEGER DEFAULT 30,
  detection_retention_max_days INTEGER DEFAULT 365,

  -- Documentos legales requeridos
  required_legal_documents JSONB,

  -- Normativa de referencia
  legal_framework TEXT,
  regulatory_body TEXT,

  -- Configuración de alertas
  alert_mode VARCHAR(20) DEFAULT 'INDIVIDUAL' CHECK (alert_mode IN ('INDIVIDUAL', 'ANONYMOUS', 'AGGREGATE_ONLY')),

  -- Sanciones por incumplimiento regulatorio
  max_fine_info TEXT,

  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by INTEGER
);

-- Datos por país
INSERT INTO country_safety_regulations (country_code, country_name, allows_individual_tracking, requires_explicit_consent, consent_renewal_days, legal_framework, regulatory_body, alert_mode, image_retention_max_days) VALUES
('AR', 'Argentina', true, true, 365, 'Ley 25.326 (Protección de Datos Personales) + Ley 24.557 (Riesgos del Trabajo)', 'AAIP', 'INDIVIDUAL', 30),
('ES', 'España', true, true, 365, 'GDPR + LOPD-GDD + Ley 31/1995 (Prevención Riesgos Laborales)', 'AEPD', 'INDIVIDUAL', 30),
('MX', 'México', true, true, NULL, 'LFPDPPP + NOM-030-STPS-2009', 'INAI', 'INDIVIDUAL', 30),
('CL', 'Chile', true, true, 365, 'Ley 19.628 + Ley 16.744 (Accidentes del Trabajo)', 'CPLT', 'INDIVIDUAL', 30),
('CO', 'Colombia', true, true, NULL, 'Ley 1581 de 2012 + Decreto 1072 de 2015 (SG-SST)', 'SIC', 'INDIVIDUAL', 30),
('BR', 'Brasil', true, true, 365, 'LGPD + NRs (Normas Regulamentadoras)', 'ANPD', 'INDIVIDUAL', 30),
('PE', 'Perú', true, true, 365, 'Ley 29733 + Ley 29783 (Seguridad y Salud en el Trabajo)', 'ANPD', 'INDIVIDUAL', 30),
('UY', 'Uruguay', true, true, NULL, 'Ley 18.331 + Decreto 291/007', 'URCDP', 'INDIVIDUAL', 30),
('EC', 'Ecuador', true, true, NULL, 'LOPDP + Decreto 2393', 'Defensoría del Pueblo', 'INDIVIDUAL', 30),
('BO', 'Bolivia', true, false, NULL, 'Ley General del Trabajo + DS 108', NULL, 'INDIVIDUAL', 30),
('PY', 'Paraguay', true, true, NULL, 'Ley 1682/01 + Código del Trabajo', 'Ministerio de Trabajo', 'INDIVIDUAL', 30),
('VE', 'Venezuela', true, true, NULL, 'LOPCYMAT + Ley de Protección de Datos', 'INPSASEL', 'INDIVIDUAL', 30),
('PA', 'Panamá', true, true, NULL, 'Ley 81 de 2019 + Código de Trabajo', 'ANTAI', 'INDIVIDUAL', 30),
('CR', 'Costa Rica', true, true, NULL, 'Ley 8968 + Código de Trabajo', 'PRODHAB', 'INDIVIDUAL', 30),
('GT', 'Guatemala', true, false, NULL, 'Código de Trabajo + Acuerdo Gubernativo 229-2014', NULL, 'INDIVIDUAL', 30),
('US', 'Estados Unidos', true, false, NULL, 'OSHA + State-specific laws', 'OSHA', 'INDIVIDUAL', 30),
('DE', 'Alemania', true, true, 365, 'GDPR + BDSG + ArbSchG', 'BfDI', 'INDIVIDUAL', 14),
('FR', 'Francia', true, true, 365, 'GDPR + Loi Informatique et Libertés + Code du travail', 'CNIL', 'INDIVIDUAL', 14),
('IT', 'Italia', true, true, 365, 'GDPR + D.Lgs. 81/2008 (Testo Unico Sicurezza)', 'Garante Privacy', 'INDIVIDUAL', 14),
('GB', 'Reino Unido', true, true, 365, 'UK GDPR + Health and Safety at Work Act', 'ICO', 'INDIVIDUAL', 30)
ON CONFLICT (country_code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 4: CONFIGURACIÓN DE ZONAS EPP
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hse_zone_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL,
  branch_id INTEGER,

  -- Identificación de zona
  zone_code VARCHAR(50) NOT NULL,
  zone_name VARCHAR(200) NOT NULL,
  zone_description TEXT,

  -- EPP requeridos (referencias a SSOT catalog)
  required_ppe_codes TEXT[] NOT NULL,

  -- Configuración de cámara
  camera_config JSONB,

  -- Horarios de monitoreo
  monitoring_schedule JSONB,
  monitoring_enabled BOOLEAN DEFAULT true,

  -- Umbrales de escalamiento
  alert_config JSONB DEFAULT '{
    "threshold_warning": 1,
    "threshold_training": 3,
    "threshold_sanction": 5,
    "period_days": 30,
    "confidence_min": 0.70,
    "check_interval_seconds": 300
  }'::JSONB,

  -- Puestos afectados (opcional)
  affected_position_ids INTEGER[],

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER,

  CONSTRAINT unique_zone_per_branch UNIQUE(company_id, branch_id, zone_code)
);

CREATE INDEX IF NOT EXISTS idx_zone_config_company ON hse_zone_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_zone_config_branch ON hse_zone_configurations(branch_id);
CREATE INDEX IF NOT EXISTS idx_zone_config_active ON hse_zone_configurations(is_active) WHERE is_active = true;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 5: DETECCIONES EPP (IA)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hse_ppe_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL,
  branch_id INTEGER,
  zone_config_id UUID REFERENCES hse_zone_configurations(id),

  -- Datos de detección
  detection_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  camera_id VARCHAR(100),
  zone_name VARCHAR(100),

  -- Resultado IA
  detected_ppe JSONB,
  missing_ppe TEXT[],
  confidence_scores JSONB,
  confidence_avg DECIMAL(5,2),

  -- Identificación (CONDICIONAL según regulación)
  employee_id INTEGER,
  is_anonymous BOOLEAN DEFAULT false,
  alert_mode VARCHAR(20) DEFAULT 'INDIVIDUAL',

  -- Evidencia
  image_url TEXT,
  image_blob_path TEXT,
  image_retention_until DATE,

  -- Acciones tomadas
  notification_sent BOOLEAN DEFAULT false,
  notification_id UUID,
  training_assigned BOOLEAN DEFAULT false,
  training_id INTEGER,
  sanction_created BOOLEAN DEFAULT false,
  sanction_id INTEGER,
  hse_case_id UUID,

  -- Estado
  status VARCHAR(20) DEFAULT 'NEW' CHECK (status IN ('NEW', 'NOTIFIED', 'REVIEWED', 'ACTIONED', 'DISMISSED')),
  reviewed_by INTEGER,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  azure_request_id VARCHAR(100),
  processing_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ppe_detections_company ON hse_ppe_detections(company_id);
CREATE INDEX IF NOT EXISTS idx_ppe_detections_employee ON hse_ppe_detections(employee_id);
CREATE INDEX IF NOT EXISTS idx_ppe_detections_timestamp ON hse_ppe_detections(detection_timestamp);
CREATE INDEX IF NOT EXISTS idx_ppe_detections_status ON hse_ppe_detections(status);
CREATE INDEX IF NOT EXISTS idx_ppe_detections_missing ON hse_ppe_detections USING GIN(missing_ppe);


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 6: CASOS HSE (Accidentes/Enfermedades Laborales)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hse_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL,
  branch_id INTEGER,

  -- Número de caso legible
  case_number VARCHAR(50) UNIQUE,

  -- Empleado afectado
  employee_id INTEGER NOT NULL,

  -- Origen del caso
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('MEDICAL_CERTIFICATE', 'PPE_DETECTION', 'MANUAL', 'EXTERNAL_REPORT')),
  source_id UUID,
  medical_certificate_id INTEGER,

  -- Clasificación
  case_type VARCHAR(50) NOT NULL CHECK (case_type IN ('ACCIDENTE_TRABAJO', 'ENFERMEDAD_PROFESIONAL', 'ENFERMEDAD_RELACIONADA', 'INCIDENTE_SIN_LESION')),
  case_subtype VARCHAR(50),

  -- Diagnóstico
  cie10_code VARCHAR(10),
  cie10_description TEXT,
  body_location VARCHAR(100),
  severity VARCHAR(20) CHECK (severity IN ('LEVE', 'MODERADO', 'GRAVE', 'MUY_GRAVE', 'FATAL')),
  days_off INTEGER DEFAULT 0,

  -- Violaciones indicadas
  indicated_violations TEXT[],
  violation_notes TEXT,

  -- Correlación con detecciones IA
  correlated_detections UUID[],
  correlation_score DECIMAL(5,2),
  correlation_details JSONB,

  -- Investigación HSE
  assigned_to INTEGER,
  assigned_at TIMESTAMPTZ,
  investigation_status VARCHAR(50) DEFAULT 'PENDING' CHECK (investigation_status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_INFO', 'COMPLETED', 'CLOSED')),
  investigation_deadline DATE,
  investigation_notes TEXT,

  -- Dictamen
  verdict VARCHAR(50) CHECK (verdict IN ('CONFIRMED_VIOLATION', 'NOT_CONFIRMED', 'UNSAFE_CONDITION', 'THIRD_PARTY', 'MIXED_CAUSES', 'UNDETERMINED')),
  verdict_notes TEXT,
  verdict_by INTEGER,
  verdict_at TIMESTAMPTZ,
  confirmed_violations TEXT[],

  -- Acciones tomadas
  training_assigned BOOLEAN DEFAULT false,
  training_ids INTEGER[],
  sanction_created BOOLEAN DEFAULT false,
  sanction_id INTEGER,
  corrective_actions JSONB,
  preventive_actions JSONB,

  -- Seguimiento
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,

  -- Reportes externos (ART, ministerio, etc.)
  external_report_required BOOLEAN DEFAULT false,
  external_report_sent BOOLEAN DEFAULT false,
  external_report_date DATE,
  external_report_number VARCHAR(100),

  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_hse_cases_company ON hse_cases(company_id);
CREATE INDEX IF NOT EXISTS idx_hse_cases_employee ON hse_cases(employee_id);
CREATE INDEX IF NOT EXISTS idx_hse_cases_status ON hse_cases(investigation_status);
CREATE INDEX IF NOT EXISTS idx_hse_cases_type ON hse_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_hse_cases_created ON hse_cases(created_at);
CREATE INDEX IF NOT EXISTS idx_hse_cases_violations ON hse_cases USING GIN(indicated_violations);

-- Trigger para generar número de caso
CREATE OR REPLACE FUNCTION generate_hse_case_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.case_number := 'HSE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('hse_case_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS hse_case_number_seq START 1;

DROP TRIGGER IF EXISTS trg_hse_case_number ON hse_cases;
CREATE TRIGGER trg_hse_case_number
  BEFORE INSERT ON hse_cases
  FOR EACH ROW
  WHEN (NEW.case_number IS NULL)
  EXECUTE FUNCTION generate_hse_case_number();


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 7: ESTADÍSTICAS AGREGADAS (ANÓNIMAS)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hse_ppe_stats (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  branch_id INTEGER,
  zone_name VARCHAR(100),
  stat_date DATE NOT NULL,

  -- Contadores
  total_checks INTEGER DEFAULT 0,
  compliant_count INTEGER DEFAULT 0,
  violation_count INTEGER DEFAULT 0,
  compliance_rate DECIMAL(5,2),

  -- Desglose por EPP
  violations_by_ppe JSONB,

  -- Desglose por hora
  violations_by_hour JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_stat_per_zone_date UNIQUE(company_id, branch_id, zone_name, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_ppe_stats_company_date ON hse_ppe_stats(company_id, stat_date);


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 8: EXTENSIÓN TABLA CERTIFICADOS MÉDICOS
-- ═══════════════════════════════════════════════════════════════════════════

-- Verificar si la tabla existe antes de alterarla
DO $$
BEGIN
  -- Solo agregar columnas si la tabla existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_certificates') THEN
    -- Agregar columnas si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_certificates' AND column_name = 'absence_type') THEN
      ALTER TABLE medical_certificates ADD COLUMN absence_type VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_certificates' AND column_name = 'absence_subtype') THEN
      ALTER TABLE medical_certificates ADD COLUMN absence_subtype VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_certificates' AND column_name = 'cie10_code') THEN
      ALTER TABLE medical_certificates ADD COLUMN cie10_code VARCHAR(10);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_certificates' AND column_name = 'body_location') THEN
      ALTER TABLE medical_certificates ADD COLUMN body_location VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_certificates' AND column_name = 'possible_safety_violations') THEN
      ALTER TABLE medical_certificates ADD COLUMN possible_safety_violations TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_certificates' AND column_name = 'safety_violation_notes') THEN
      ALTER TABLE medical_certificates ADD COLUMN safety_violation_notes TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_certificates' AND column_name = 'requires_hse_review') THEN
      ALTER TABLE medical_certificates ADD COLUMN requires_hse_review BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_certificates' AND column_name = 'hse_case_id') THEN
      ALTER TABLE medical_certificates ADD COLUMN hse_case_id UUID;
    END IF;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 9: CONSENTIMIENTOS EPP (Extensión de biometric-consent)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS employee_ppe_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,

  -- Tipo de consentimiento
  consent_type VARCHAR(50) DEFAULT 'PPE_MONITORING',

  -- Estado
  consent_given BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  consent_expires TIMESTAMPTZ,

  -- Detalles
  consent_document_version VARCHAR(20),
  consent_document_hash VARCHAR(64),
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Revocación
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_employee_consent UNIQUE(company_id, employee_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_ppe_consent_employee ON employee_ppe_consents(employee_id);
CREATE INDEX IF NOT EXISTS idx_ppe_consent_active ON employee_ppe_consents(consent_given, consent_expires)
  WHERE consent_given = true AND (consent_expires IS NULL OR consent_expires > NOW());


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 10: FUNCIONES HELPER
-- ═══════════════════════════════════════════════════════════════════════════

-- Función para calcular correlación automática
CREATE OR REPLACE FUNCTION calculate_violation_correlation(
  p_employee_id INTEGER,
  p_violations TEXT[],
  p_days_back INTEGER DEFAULT 30
) RETURNS TABLE (
  total_detections INTEGER,
  matching_detections INTEGER,
  correlation_score DECIMAL(5,2),
  detection_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_detections,
    COUNT(*) FILTER (WHERE d.missing_ppe && p_violations)::INTEGER as matching_detections,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE d.missing_ppe && p_violations)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
      ELSE 0
    END as correlation_score,
    ARRAY_AGG(d.id) FILTER (WHERE d.missing_ppe && p_violations) as detection_ids
  FROM hse_ppe_detections d
  WHERE d.employee_id = p_employee_id
    AND d.detection_timestamp >= NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;


-- Función para obtener estadísticas de casos HSE
CREATE OR REPLACE FUNCTION get_hse_case_stats(
  p_company_id INTEGER,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
  total_cases INTEGER,
  pending_cases INTEGER,
  in_progress_cases INTEGER,
  closed_cases INTEGER,
  cases_by_type JSONB,
  cases_by_severity JSONB,
  avg_resolution_days DECIMAL(10,2),
  correlation_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE investigation_status = 'PENDING')::INTEGER,
    COUNT(*) FILTER (WHERE investigation_status IN ('ASSIGNED', 'IN_PROGRESS', 'AWAITING_INFO'))::INTEGER,
    COUNT(*) FILTER (WHERE investigation_status = 'CLOSED')::INTEGER,
    JSONB_OBJECT_AGG(COALESCE(case_type, 'UNKNOWN'), type_count) as cases_by_type,
    JSONB_OBJECT_AGG(COALESCE(severity, 'UNKNOWN'), sev_count) as cases_by_severity,
    AVG(EXTRACT(DAY FROM (closed_at - created_at)))::DECIMAL(10,2),
    AVG(correlation_score)::DECIMAL(5,2)
  FROM hse_cases c
  LEFT JOIN LATERAL (
    SELECT case_type, COUNT(*) as type_count FROM hse_cases
    WHERE company_id = p_company_id GROUP BY case_type
  ) type_stats ON true
  LEFT JOIN LATERAL (
    SELECT severity, COUNT(*) as sev_count FROM hse_cases
    WHERE company_id = p_company_id GROUP BY severity
  ) sev_stats ON true
  WHERE c.company_id = p_company_id
    AND (p_start_date IS NULL OR c.created_at >= p_start_date)
    AND (p_end_date IS NULL OR c.created_at <= p_end_date)
  GROUP BY type_stats.case_type, type_stats.type_count, sev_stats.severity, sev_stats.sev_count
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;


-- Función para verificar consentimiento activo
CREATE OR REPLACE FUNCTION has_active_ppe_consent(
  p_employee_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employee_ppe_consents
    WHERE employee_id = p_employee_id
      AND consent_type = 'PPE_MONITORING'
      AND consent_given = true
      AND revoked = false
      AND (consent_expires IS NULL OR consent_expires > NOW())
  );
END;
$$ LANGUAGE plpgsql;


-- Función para actualizar estadísticas diarias
CREATE OR REPLACE FUNCTION update_daily_ppe_stats(
  p_company_id INTEGER,
  p_branch_id INTEGER,
  p_zone_name VARCHAR(100),
  p_date DATE
) RETURNS VOID AS $$
DECLARE
  v_total INTEGER;
  v_violations INTEGER;
  v_by_ppe JSONB;
BEGIN
  -- Calcular totales
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE array_length(missing_ppe, 1) > 0)
  INTO v_total, v_violations
  FROM hse_ppe_detections
  WHERE company_id = p_company_id
    AND (branch_id = p_branch_id OR p_branch_id IS NULL)
    AND (zone_name = p_zone_name OR p_zone_name IS NULL)
    AND DATE(detection_timestamp) = p_date;

  -- Calcular por EPP
  SELECT JSONB_OBJECT_AGG(epp, cnt)
  INTO v_by_ppe
  FROM (
    SELECT UNNEST(missing_ppe) as epp, COUNT(*) as cnt
    FROM hse_ppe_detections
    WHERE company_id = p_company_id
      AND (branch_id = p_branch_id OR p_branch_id IS NULL)
      AND (zone_name = p_zone_name OR p_zone_name IS NULL)
      AND DATE(detection_timestamp) = p_date
    GROUP BY UNNEST(missing_ppe)
  ) sub;

  -- Upsert estadísticas
  INSERT INTO hse_ppe_stats (company_id, branch_id, zone_name, stat_date, total_checks, compliant_count, violation_count, compliance_rate, violations_by_ppe)
  VALUES (
    p_company_id,
    p_branch_id,
    p_zone_name,
    p_date,
    v_total,
    v_total - v_violations,
    v_violations,
    CASE WHEN v_total > 0 THEN ROUND(((v_total - v_violations)::DECIMAL / v_total) * 100, 2) ELSE 100 END,
    v_by_ppe
  )
  ON CONFLICT (company_id, branch_id, zone_name, stat_date)
  DO UPDATE SET
    total_checks = EXCLUDED.total_checks,
    compliant_count = EXCLUDED.compliant_count,
    violation_count = EXCLUDED.violation_count,
    compliance_rate = EXCLUDED.compliance_rate,
    violations_by_ppe = EXCLUDED.violations_by_ppe,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 11: VISTAS ÚTILES
-- ═══════════════════════════════════════════════════════════════════════════

-- Vista de violaciones detectables por IA
CREATE OR REPLACE VIEW v_ai_detectable_violations AS
SELECT code, name, name_short, icon, ai_model_tag, ai_confidence_threshold
FROM hse_violation_catalog
WHERE is_detectable_by_ai = true AND is_active = true
ORDER BY display_order;

-- Vista de violaciones para selección médica
CREATE OR REPLACE VIEW v_medical_selectable_violations AS
SELECT code, category, name, name_short, icon, related_cie10_codes, body_locations
FROM hse_violation_catalog
WHERE is_medical_selectable = true AND is_active = true
ORDER BY category, display_order;

-- Vista de casos HSE pendientes
CREATE OR REPLACE VIEW v_hse_pending_cases AS
SELECT
  c.*,
  e.first_name || ' ' || e.last_name as employee_name,
  b.name as branch_name,
  u.name as assigned_to_name
FROM hse_cases c
LEFT JOIN employees e ON c.employee_id = e.id
LEFT JOIN branches b ON c.branch_id = b.id
LEFT JOIN users u ON c.assigned_to = u.id
WHERE c.investigation_status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_INFO')
ORDER BY
  CASE c.severity
    WHEN 'FATAL' THEN 1
    WHEN 'MUY_GRAVE' THEN 2
    WHEN 'GRAVE' THEN 3
    WHEN 'MODERADO' THEN 4
    ELSE 5
  END,
  c.created_at;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'hse_violation_catalog',
      'medical_absence_types',
      'country_safety_regulations',
      'hse_zone_configurations',
      'hse_ppe_detections',
      'hse_cases',
      'hse_ppe_stats',
      'employee_ppe_consents'
    );

  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRACIÓN HSE + EPP + MÉDICO COMPLETADA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Tablas creadas/verificadas: %/8', v_table_count;
  RAISE NOTICE 'Catálogo de violaciones: % registros', (SELECT COUNT(*) FROM hse_violation_catalog);
  RAISE NOTICE 'Tipos de ausencia médica: % registros', (SELECT COUNT(*) FROM medical_absence_types);
  RAISE NOTICE 'Regulaciones por país: % registros', (SELECT COUNT(*) FROM country_safety_regulations);
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;
