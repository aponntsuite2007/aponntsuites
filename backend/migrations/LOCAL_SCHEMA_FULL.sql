-- ============================================================================
-- ESQUEMA COMPLETO DE BASE LOCAL (attendance_system)
-- Exportado: 2025-12-09T14:25:08.708Z
-- Total tablas: 334
-- ============================================================================

-- Tabla: UserShifts
CREATE TABLE IF NOT EXISTS UserShifts (
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL,
  UserUserId uuid NOT NULL,
  ShiftId uuid NOT NULL
);

-- Tabla: absence_cases
CREATE TABLE IF NOT EXISTS absence_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  employee_id uuid NOT NULL,
  absence_type character varying(50) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  requested_days integer NOT NULL,
  approved_days integer,
  assigned_doctor_id uuid,
  assignment_date timestamp without time zone,
  case_status character varying(50) NOT NULL DEFAULT 'pending'::character varying,
  certificate_id integer,
  employee_description text,
  employee_attachments jsonb DEFAULT '[]'::jsonb,
  medical_conclusion text,
  final_diagnosis text,
  is_justified boolean,
  justification_reason text,
  doctor_response_date timestamp without time zone,
  case_closed_date timestamp without time zone,
  closed_by uuid,
  notify_art boolean DEFAULT false,
  art_notified boolean DEFAULT false,
  art_notification_date timestamp without time zone,
  art_case_number character varying(100),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid NOT NULL,
  last_modified_by uuid,
  notification_group_id uuid
);

-- Tabla: access_audit_log
CREATE TABLE IF NOT EXISTS access_audit_log (
  id bigint NOT NULL DEFAULT nextval('access_audit_log_id_seq'::regclass),
  user_id uuid,
  company_id integer,
  action character varying(50) NOT NULL,
  module_key character varying(100),
  requested_action character varying(20),
  was_allowed boolean NOT NULL,
  denial_reason text,
  resource_type character varying(50),
  resource_id character varying(100),
  ip_address inet,
  user_agent text,
  request_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: access_notifications
CREATE TABLE IF NOT EXISTS access_notifications (
  id integer NOT NULL DEFAULT nextval('access_notifications_id_seq'::regclass),
  notification_type character varying(50) NOT NULL,
  priority character varying(20) NOT NULL DEFAULT 'medium'::character varying,
  recipient_user_id uuid,
  title character varying(255) NOT NULL,
  message text NOT NULL,
  related_visitor_id integer,
  related_user_id uuid,
  related_kiosk_id integer,
  related_attendance_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  action_taken boolean NOT NULL DEFAULT false,
  action_type character varying(100),
  action_notes text,
  action_taken_by uuid,
  action_taken_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  expires_at timestamp with time zone,
  company_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: additional_role_types
CREATE TABLE IF NOT EXISTS additional_role_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_key character varying(50) NOT NULL,
  role_name character varying(100) NOT NULL,
  description text,
  category role_category_enum NOT NULL DEFAULT 'otros'::role_category_enum,
  icon character varying(10) DEFAULT '🏷️'::character varying,
  color character varying(20) DEFAULT '#6c757d'::character varying,
  requires_certification boolean DEFAULT false,
  certification_validity_months integer DEFAULT 12,
  scoring_bonus numeric(3,2) DEFAULT 0.05,
  required_training jsonb DEFAULT '[]'::jsonb,
  responsibilities jsonb DEFAULT '[]'::jsonb,
  company_id integer,
  is_active boolean DEFAULT true,
  created_by uuid,
  createdAt timestamp with time zone DEFAULT now(),
  updatedAt timestamp with time zone DEFAULT now()
);

-- Tabla: administrative_tasks
CREATE TABLE IF NOT EXISTS administrative_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trace_id character varying(100),
  task_type character varying(100) NOT NULL,
  task_category character varying(50) NOT NULL DEFAULT 'ONBOARDING'::character varying,
  priority character varying(20) NOT NULL DEFAULT 'NORMAL'::character varying,
  company_id integer,
  related_entity_type character varying(50),
  related_entity_id uuid,
  title character varying(255) NOT NULL,
  description text NOT NULL,
  instructions text,
  context_data jsonb,
  attachments jsonb,
  assigned_to uuid,
  assigned_at timestamp without time zone,
  assigned_by uuid,
  due_date date,
  escalation_date date,
  status character varying(50) NOT NULL DEFAULT 'PENDING'::character varying,
  resolution character varying(50),
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamp without time zone,
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamp without time zone,
  reminder_count integer DEFAULT 0,
  last_reminder_at timestamp without time zone,
  source character varying(50) DEFAULT 'SYSTEM'::character varying,
  created_by uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: afip_auth_log
CREATE TABLE IF NOT EXISTS afip_auth_log (
  id integer NOT NULL DEFAULT nextval('afip_auth_log_id_seq'::regclass),
  company_id integer NOT NULL,
  service character varying(50) NOT NULL,
  token_hash character varying(64),
  sign_hash character varying(64),
  generation_time timestamp without time zone NOT NULL,
  expiration_time timestamp without time zone NOT NULL,
  tra_xml text,
  response_xml text,
  success boolean DEFAULT false,
  error_message text,
  environment character varying(20),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: afip_cae_log
CREATE TABLE IF NOT EXISTS afip_cae_log (
  id integer NOT NULL DEFAULT nextval('afip_cae_log_id_seq'::regclass),
  company_id integer NOT NULL,
  factura_id integer,
  punto_venta integer NOT NULL,
  tipo_comprobante integer NOT NULL,
  numero_comprobante bigint NOT NULL,
  cae character varying(14) NOT NULL,
  cae_vencimiento date NOT NULL,
  request_xml text,
  response_xml text,
  resultado character varying(1),
  fecha_proceso date,
  observaciones text,
  errores text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: aponnt_associates
CREATE TABLE IF NOT EXISTS aponnt_associates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name character varying(100) NOT NULL,
  last_name character varying(100) NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(50),
  secondary_phone character varying(50),
  dni character varying(20),
  photo_url text,
  bio text,
  linkedin_url character varying(255),
  category associate_category NOT NULL,
  specialty character varying(200),
  sub_specialties ARRAY,
  license_number character varying(100),
  license_issuer character varying(100),
  license_expiry date,
  certifications jsonb DEFAULT '[]'::jsonb,
  user_id uuid,
  availability jsonb DEFAULT '{}'::jsonb,
  service_regions ARRAY DEFAULT '{}'::text[],
  remote_available boolean DEFAULT false,
  hourly_rate numeric(10,2),
  currency character varying(3) DEFAULT 'ARS'::character varying,
  payment_terms text,
  rating_average numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  contracts_completed integer DEFAULT 0,
  active_contracts integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  verified_at timestamp without time zone,
  verified_by uuid,
  verification_notes text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: aponnt_email_config
CREATE TABLE IF NOT EXISTS aponnt_email_config (
  id integer NOT NULL DEFAULT nextval('aponnt_email_config_id_seq'::regclass),
  config_type character varying(50) NOT NULL,
  from_email character varying(255) NOT NULL,
  from_name character varying(255) NOT NULL,
  reply_to character varying(255),
  smtp_host character varying(255) NOT NULL,
  smtp_port integer NOT NULL,
  smtp_user character varying(255) NOT NULL,
  smtp_password text NOT NULL,
  smtp_secure boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: aponnt_staff
CREATE TABLE IF NOT EXISTS aponnt_staff (
  staff_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  first_name character varying(100) NOT NULL,
  last_name character varying(100) NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(50),
  document_type character varying(20),
  document_number character varying(50),
  role_id uuid NOT NULL,
  reports_to_staff_id uuid,
  country character varying(2) NOT NULL,
  nationality character varying(2),
  level integer NOT NULL,
  area character varying(50) NOT NULL,
  language_preference character varying(2) DEFAULT 'es'::character varying,
  contract_type character varying(20),
  hire_date date,
  termination_date date,
  cbu character varying(50),
  bank_name character varying(100),
  bank_account_type character varying(20),
  accepts_support_packages boolean DEFAULT false,
  accepts_auctions boolean DEFAULT false,
  whatsapp_number character varying(50),
  global_rating numeric(3,2) DEFAULT 0.00,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  pyramid_commission_percentage_override numeric(5,2) DEFAULT NULL::numeric,
  alias_cbu character varying(100),
  account_type character varying(50),
  account_number character varying(100),
  payment_method_preference character varying(50) DEFAULT 'TRANSFERENCIA'::character varying,
  virtual_wallet_provider character varying(100),
  virtual_wallet_account character varying(255),
  tax_id character varying(50),
  tax_condition character varying(100),
  accepts_electronic_payment boolean DEFAULT true,
  bank_data_verified boolean DEFAULT false,
  bank_data_verified_at timestamp without time zone,
  bank_data_verified_by uuid
);

-- Tabla: aponnt_staff_companies
CREATE TABLE IF NOT EXISTS aponnt_staff_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  company_id integer NOT NULL,
  assigned_at timestamp without time zone DEFAULT now(),
  assigned_by uuid,
  assignment_note text,
  is_active boolean DEFAULT true,
  deactivated_at timestamp without time zone,
  deactivated_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: aponnt_staff_roles
CREATE TABLE IF NOT EXISTS aponnt_staff_roles (
  role_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_code character varying(10) NOT NULL,
  role_name character varying(100) NOT NULL,
  role_name_i18n jsonb DEFAULT '{}'::jsonb,
  role_area character varying(50),
  level integer NOT NULL,
  is_sales_role boolean DEFAULT false,
  is_country_specific boolean DEFAULT false,
  reports_to_role_code character varying(10),
  description text,
  responsibilities jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  pyramid_commission_percentage numeric(5,2) DEFAULT 0.00
);

-- Tabla: approved_shift_swaps
CREATE TABLE IF NOT EXISTS approved_shift_swaps (
  id integer NOT NULL DEFAULT nextval('approved_shift_swaps_id_seq'::regclass),
  notification_group_id uuid NOT NULL,
  company_id integer NOT NULL,
  employee_1_id character varying(100) NOT NULL,
  employee_2_id character varying(100) NOT NULL,
  swap_date date NOT NULL,
  original_shift_id integer,
  replacement_shift_id integer,
  status character varying(20) DEFAULT 'approved'::character varying,
  employee_1_can_clock boolean DEFAULT false,
  employee_2_can_clock boolean DEFAULT true,
  generates_overtime boolean DEFAULT false,
  overtime_hours numeric(5,2),
  violates_rest_period boolean DEFAULT false,
  art_notified boolean DEFAULT false,
  art_notified_at timestamp without time zone,
  art_reference character varying(100),
  approved_at timestamp without time zone DEFAULT now(),
  executed_at timestamp without time zone
);

-- Tabla: art_configurations
CREATE TABLE IF NOT EXISTS art_configurations (
  id uuid NOT NULL,
  artName character varying(255) NOT NULL,
  artCode character varying(255),
  primaryContactName character varying(255),
  primaryContactRole character varying(255),
  phone character varying(255),
  whatsappNumber character varying(255),
  email character varying(255),
  emergencyPhone character varying(255),
  notificationPreferences json DEFAULT '{"whatsapp":true,"sms":false,"email":true}'::json,
  notificationTriggers json DEFAULT '{"accidents":true,"occupational_diseases":true,"work_related_injuries":true,"long_absences":true,"recurring_cases":true}'::json,
  thresholds json DEFAULT '{"long_absence_days":15,"recurring_case_count":3,"recurring_case_period_months":6}'::json,
  businessHours json DEFAULT '{"start":"08:00","end":"18:00","timezone":"America/Argentina/Buenos_Aires"}'::json,
  companyId uuid,
  isActive boolean DEFAULT true,
  lastNotificationSent timestamp with time zone,
  totalNotificationsSent integer DEFAULT 0,
  customFields json,
  notes text,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL
);

-- Tabla: assistant_conversations
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id uuid NOT NULL,
  company_id integer NOT NULL,
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  knowledge_entry_id uuid,
  context jsonb DEFAULT '{}'::jsonb,
  module_name character varying(100),
  screen_name character varying(100),
  answer_source character varying(50) DEFAULT 'ollama'::character varying,
  confidence numeric(3,2) DEFAULT 0,
  response_time_ms integer,
  helpful boolean,
  feedback_comment text,
  feedback_at timestamp with time zone,
  diagnostic_triggered boolean DEFAULT false,
  created_at timestamp with time zone
);

-- Tabla: assistant_knowledge_base
CREATE TABLE IF NOT EXISTS assistant_knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer,
  user_id uuid,
  user_role character varying(50),
  question text NOT NULL,
  question_normalized text,
  context jsonb,
  module_name character varying(100),
  answer text NOT NULL,
  answer_source character varying(50) DEFAULT 'ollama'::character varying,
  model_used character varying(100) DEFAULT 'llama3.1:8b'::character varying,
  tokens_used integer,
  response_time_ms integer,
  confidence_score numeric(3,2),
  diagnostic_triggered boolean DEFAULT false,
  diagnostic_execution_id uuid,
  diagnostic_results jsonb,
  suggested_actions jsonb,
  quick_replies jsonb,
  helpful boolean,
  feedback_comment text,
  feedback_at timestamp without time zone,
  reused_count integer DEFAULT 0,
  improved_answer text,
  verified_by_admin uuid,
  verified_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  feedback_text text
);

-- Tabla: associate_employee_assignments
CREATE TABLE IF NOT EXISTS associate_employee_assignments (
  id integer NOT NULL DEFAULT nextval('associate_employee_assignments_id_seq'::regclass),
  contract_id integer NOT NULL,
  employee_id uuid NOT NULL,
  assignment_reason text,
  assignment_type character varying(50) DEFAULT 'manual'::character varying,
  assigned_at timestamp without time zone DEFAULT now(),
  assigned_by uuid,
  expires_at timestamp without time zone,
  is_active boolean DEFAULT true,
  deactivated_at timestamp without time zone,
  deactivated_by uuid,
  deactivation_reason text
);

-- Tabla: attendance_analytics_cache
CREATE TABLE IF NOT EXISTS attendance_analytics_cache (
  id bigint NOT NULL DEFAULT nextval('attendance_analytics_cache_id_seq'::regclass),
  company_id integer NOT NULL,
  cache_key character varying(255) NOT NULL,
  cache_type character varying(50),
  dimension_1 character varying(50),
  dimension_1_value character varying(255),
  dimension_2 character varying(50),
  dimension_2_value character varying(255),
  period_start date,
  period_end date,
  cached_data jsonb NOT NULL,
  calculated_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone,
  hit_count integer DEFAULT 0,
  last_hit_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: attendance_patterns
CREATE TABLE IF NOT EXISTS attendance_patterns (
  id bigint NOT NULL DEFAULT nextval('attendance_patterns_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  pattern_id character varying(50) NOT NULL,
  pattern_name character varying(255),
  pattern_category character varying(50),
  detection_date date NOT NULL,
  severity character varying(20),
  confidence_score numeric(5,2) DEFAULT 0.00,
  occurrences_count integer DEFAULT 1,
  detection_period_start date,
  detection_period_end date,
  threshold_value numeric(10,2),
  actual_value numeric(10,2),
  scoring_impact numeric(5,2) DEFAULT 0.00,
  requires_action boolean DEFAULT false,
  action_taken text,
  action_taken_at timestamp without time zone,
  action_taken_by uuid,
  status character varying(20) DEFAULT 'active'::character varying,
  resolved_at timestamp without time zone,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: attendance_profiles
CREATE TABLE IF NOT EXISTS attendance_profiles (
  id bigint NOT NULL DEFAULT nextval('attendance_profiles_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  employee_id character varying(50),
  department_id bigint,
  shift_id bigint,
  branch_id bigint,
  scoring_total numeric(5,2) DEFAULT 100.00,
  scoring_punctuality numeric(5,2) DEFAULT 100.00,
  scoring_absence numeric(5,2) DEFAULT 100.00,
  scoring_late_arrival numeric(5,2) DEFAULT 100.00,
  scoring_early_departure numeric(5,2) DEFAULT 100.00,
  total_days integer DEFAULT 0,
  present_days integer DEFAULT 0,
  absent_days integer DEFAULT 0,
  late_arrivals_count integer DEFAULT 0,
  early_departures_count integer DEFAULT 0,
  tolerance_usage_rate numeric(5,2) DEFAULT 0.00,
  avg_late_minutes integer DEFAULT 0,
  overtime_hours_total numeric(10,2) DEFAULT 0.00,
  active_patterns ARRAY,
  positive_patterns ARRAY,
  negative_patterns ARRAY,
  last_calculated_at timestamp without time zone DEFAULT now(),
  calculation_period_start date,
  calculation_period_end date,
  profile_category character varying(50),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: attendances
CREATE TABLE IF NOT EXISTS attendances (
  id uuid NOT NULL,
  date date NOT NULL,
  checkInTime timestamp with time zone,
  checkOutTime timestamp with time zone,
  checkInMethod enum_attendances_checkInMethod,
  checkOutMethod enum_attendances_checkOutMethod,
  workingHours numeric(4,2) DEFAULT 0,
  status enum_attendances_status DEFAULT 'present'::enum_attendances_status,
  notes text,
  BranchId uuid,
  UserId uuid NOT NULL,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL,
  authorization_status character varying(20),
  authorization_token character varying(255),
  authorized_by_user_id uuid,
  authorized_at timestamp without time zone,
  authorization_notes text,
  notified_authorizers jsonb DEFAULT '[]'::jsonb,
  authorization_requested_at timestamp without time zone,
  kiosk_id integer,
  origin_type character varying(20) DEFAULT 'kiosk'::character varying,
  break_out timestamp without time zone,
  break_in timestamp without time zone,
  company_id integer,
  is_justified boolean DEFAULT false,
  absence_type character varying(50),
  absence_reason text,
  justified_by uuid,
  justified_at timestamp with time zone,
  medical_certificate_id integer,
  check_in_latitude numeric(10,8),
  check_in_longitude numeric(11,8),
  check_in_accuracy numeric(6,2),
  check_out_latitude numeric(10,8),
  check_out_longitude numeric(11,8),
  check_out_accuracy numeric(6,2),
  employee_id character varying(50),
  checkInLocation character varying(255),
  checkOutLocation character varying(255),
  clock_in_location text,
  clock_out_location text,
  clock_in_ip character varying(45),
  clock_out_ip character varying(45),
  break_time integer DEFAULT 0,
  overtime_hours numeric(5,2) DEFAULT 0,
  approved_by bigint,
  approved_at timestamp without time zone,
  is_processed boolean DEFAULT false,
  batch_id uuid,
  processing_queue integer,
  work_date date,
  department_id bigint,
  shift_id bigint,
  version integer DEFAULT 1
);

-- Tabla: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  company_id integer,
  action character varying(100) NOT NULL,
  module_id character varying(50),
  entity_type character varying(50),
  entity_id character varying(100),
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  session_id character varying(100),
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  test_description text
);

-- Tabla: audit_reports
CREATE TABLE IF NOT EXISTS audit_reports (
  id integer NOT NULL DEFAULT nextval('audit_reports_id_seq'::regclass),
  company_id integer NOT NULL,
  report_type character varying(50) NOT NULL,
  generated_at timestamp without time zone NOT NULL DEFAULT now(),
  generated_by character varying(100) NOT NULL,
  parameters jsonb NOT NULL,
  digital_signature character varying(64) NOT NULL,
  verification_code character varying(32) NOT NULL,
  file_path character varying(255),
  file_size_bytes integer,
  status character varying(20) DEFAULT 'generated'::character varying,
  is_deleted boolean DEFAULT false
);

-- Tabla: audit_test_logs
CREATE TABLE IF NOT EXISTS audit_test_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL,
  company_id integer NOT NULL,
  module_name character varying(100) NOT NULL,
  test_name character varying(200) NOT NULL,
  test_type character varying(50) DEFAULT 'e2e'::character varying,
  test_category character varying(100),
  status character varying(50) NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  duration_ms integer,
  error_type character varying(100),
  error_message text,
  error_stack text,
  screenshot_path character varying(500),
  fix_attempted boolean DEFAULT false,
  fix_strategy character varying(100),
  fix_code text,
  fix_applied boolean DEFAULT false,
  fix_successful boolean,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment character varying(50) DEFAULT 'local'::character varying,
  triggered_by character varying(50) DEFAULT 'manual'::character varying,
  severity character varying(20),
  test_description text,
  error_file character varying(500),
  error_line integer,
  error_context jsonb,
  endpoint character varying(500),
  http_method character varying(10),
  request_body jsonb,
  request_headers jsonb,
  response_status integer,
  response_body jsonb,
  response_time_ms integer,
  metrics jsonb,
  fix_result character varying(50),
  suggestions jsonb,
  notes text,
  test_data jsonb,
  tags ARRAY
);

-- Tabla: biometric_ai_analysis
CREATE TABLE IF NOT EXISTS biometric_ai_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  employee_id uuid NOT NULL,
  template_id uuid,
  emotion_analysis jsonb,
  emotion_confidence numeric(5,4),
  behavior_patterns jsonb,
  behavior_confidence numeric(5,4),
  facial_features jsonb,
  facial_landmarks jsonb,
  health_indicators jsonb,
  fatigue_score numeric(5,4),
  stress_score numeric(5,4),
  processed_at timestamp with time zone DEFAULT now(),
  processing_time_ms integer,
  analysis_version character varying(20) DEFAULT '1.0.0'::character varying,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla: biometric_alerts
CREATE TABLE IF NOT EXISTS biometric_alerts (
  alert_id bigint NOT NULL DEFAULT nextval('biometric_alerts_alert_id_seq'::regclass),
  tenant_id integer NOT NULL,
  company_id integer NOT NULL,
  user_id bigint NOT NULL,
  scan_id bigint NOT NULL,
  alert_type character varying(50) NOT NULL,
  severity character varying(20) NOT NULL,
  message text NOT NULL,
  recommendations jsonb,
  status character varying(20) DEFAULT 'active'::character varying,
  acknowledged_by character varying(100),
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla: biometric_audit_log
CREATE TABLE IF NOT EXISTS biometric_audit_log (
  id integer NOT NULL DEFAULT nextval('biometric_audit_log_id_seq'::regclass),
  company_id integer NOT NULL,
  template_id integer,
  employee_id text,
  action character varying(50) NOT NULL,
  reason text,
  performed_by text,
  user_name text,
  old_employee_id text,
  new_employee_id text,
  timestamp timestamp without time zone DEFAULT now()
);

-- Tabla: biometric_company_config
CREATE TABLE IF NOT EXISTS biometric_company_config (
  id integer NOT NULL DEFAULT nextval('biometric_company_config_id_seq'::regclass),
  company_id integer NOT NULL,
  confidence_threshold numeric(4,2) DEFAULT 0.85,
  quality_threshold numeric(4,2) DEFAULT 70.0,
  ai_analysis_enabled boolean DEFAULT true,
  emotion_analysis_enabled boolean DEFAULT true,
  fatigue_detection_enabled boolean DEFAULT true,
  behavior_analysis_enabled boolean DEFAULT false,
  realtime_alerts_enabled boolean DEFAULT true,
  email_reports_enabled boolean DEFAULT false,
  alert_email character varying(255),
  batch_processing_enabled boolean DEFAULT true,
  cache_templates boolean DEFAULT true,
  retention_days integer DEFAULT 90,
  max_devices_per_user integer DEFAULT 3,
  device_registration_required boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: biometric_consents
CREATE TABLE IF NOT EXISTS biometric_consents (
  id integer NOT NULL DEFAULT nextval('biometric_consents_id_seq'::regclass),
  company_id integer NOT NULL,
  user_id uuid NOT NULL,
  consent_type character varying(50) NOT NULL,
  consent_given boolean NOT NULL,
  consent_date timestamp with time zone DEFAULT now(),
  consent_text text NOT NULL,
  consent_version character varying(20) DEFAULT '1.0'::character varying,
  ip_address character varying(45),
  user_agent text,
  acceptance_method character varying(50),
  revoked boolean DEFAULT false,
  revoked_date timestamp with time zone,
  revoked_reason text,
  revoked_ip_address character varying(45),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  consent_document_hash character varying(64),
  consent_document_url text,
  consent_token uuid,
  consent_token_expires_at timestamp without time zone,
  consent_email_sent_at timestamp without time zone,
  consent_link_accessed_at timestamp without time zone,
  consent_link_access_count integer DEFAULT 0,
  consent_response_timestamp timestamp without time zone,
  consent_response_hash character varying(64),
  consent_geolocation jsonb,
  device_fingerprint text,
  biometric_validation_hash character varying(64),
  biometric_validation_image_url text,
  biometric_validation_confidence numeric(5,2),
  email_thread jsonb,
  immutable_signature character varying(128),
  signature_algorithm character varying(20) DEFAULT 'HMAC-SHA256'::character varying,
  branch_id integer,
  country_id integer,
  country_code character varying(3),
  invalidated_reason character varying(255),
  invalidated_at timestamp without time zone,
  previous_consent_id integer
);

-- Tabla: biometric_data
CREATE TABLE IF NOT EXISTS biometric_data (
  id uuid NOT NULL,
  type enum_biometric_data_type NOT NULL,
  fingerIndex integer,
  template text NOT NULL,
  quality integer DEFAULT 0,
  algorithm character varying(255) DEFAULT 'default'::character varying,
  isActive boolean DEFAULT true,
  createdBy uuid,
  lastUsed timestamp with time zone,
  usageCount integer DEFAULT 0,
  deviceId character varying(255),
  notes text,
  UserId uuid NOT NULL,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL,
  user_id uuid
);

-- Tabla: biometric_detections
CREATE TABLE IF NOT EXISTS biometric_detections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  employee_id uuid NOT NULL,
  employee_name character varying(255) NOT NULL,
  similarity numeric(5,3) NOT NULL,
  quality_score numeric(5,3),
  was_registered boolean NOT NULL DEFAULT false,
  attendance_id uuid,
  operation_type character varying(20),
  skip_reason character varying(100),
  detection_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  processing_time_ms integer,
  kiosk_mode boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: biometric_devices
CREATE TABLE IF NOT EXISTS biometric_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  device_id character varying(255) NOT NULL,
  device_name character varying(255),
  device_type character varying(50) DEFAULT 'mobile'::character varying,
  os_info character varying(255),
  app_version character varying(50),
  hardware_info jsonb,
  is_active boolean DEFAULT true,
  last_seen timestamp without time zone,
  registration_date timestamp without time zone DEFAULT now(),
  allow_registration boolean DEFAULT true,
  allow_verification boolean DEFAULT true,
  allow_monitoring boolean DEFAULT false,
  location_name character varying(255),
  location_coordinates jsonb,
  registered_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: biometric_emotional_analysis
CREATE TABLE IF NOT EXISTS biometric_emotional_analysis (
  id integer NOT NULL DEFAULT nextval('biometric_emotional_analysis_id_seq'::regclass),
  company_id integer NOT NULL,
  user_id uuid NOT NULL,
  scan_timestamp timestamp with time zone DEFAULT now(),
  emotion_anger numeric(5,4),
  emotion_contempt numeric(5,4),
  emotion_disgust numeric(5,4),
  emotion_fear numeric(5,4),
  emotion_happiness numeric(5,4),
  emotion_neutral numeric(5,4),
  emotion_sadness numeric(5,4),
  emotion_surprise numeric(5,4),
  dominant_emotion character varying(20),
  emotional_valence numeric(5,4),
  emotional_arousal numeric(5,4),
  eye_occlusion_left numeric(5,4),
  eye_occlusion_right numeric(5,4),
  head_pose_pitch numeric(6,2),
  head_pose_roll numeric(6,2),
  head_pose_yaw numeric(6,2),
  smile_intensity numeric(5,4),
  fatigue_score numeric(5,4),
  has_glasses boolean,
  glasses_type character varying(20),
  facial_hair_moustache numeric(5,4),
  facial_hair_beard numeric(5,4),
  facial_hair_sideburns numeric(5,4),
  estimated_age integer,
  time_of_day character varying(20),
  day_of_week integer,
  stress_score numeric(5,4),
  wellness_score integer,
  processing_time_ms integer,
  data_source character varying(50) DEFAULT 'azure-face-api'::character varying,
  azure_face_id character varying(255),
  quality_score numeric(5,4),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: biometric_events
CREATE TABLE IF NOT EXISTS biometric_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  company_id integer NOT NULL,
  event_type character varying(50) NOT NULL,
  biometric_type character varying(20) NOT NULL,
  success boolean NOT NULL,
  confidence_score numeric(5,2),
  device_id character varying(255),
  device_location character varying(255),
  timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb
);

-- Tabla: biometric_scans
CREATE TABLE IF NOT EXISTS biometric_scans (
  scan_id bigint NOT NULL DEFAULT nextval('biometric_scans_scan_id_seq'::regclass),
  tenant_id integer NOT NULL,
  company_id integer NOT NULL,
  user_id bigint NOT NULL,
  scan_data jsonb NOT NULL,
  template_hash character varying(128) NOT NULL,
  template_vector ARRAY NOT NULL,
  quality_score numeric(5,4) NOT NULL,
  anti_spoofing_score numeric(5,4) NOT NULL,
  ai_analysis jsonb,
  wellness_score integer,
  alert_count integer DEFAULT 0,
  source character varying(50) NOT NULL,
  source_device_id character varying(100),
  processing_time_ms integer,
  processing_id uuid DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: biometric_settings
CREATE TABLE IF NOT EXISTS biometric_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  face_recognition_enabled boolean DEFAULT true,
  fingerprint_enabled boolean DEFAULT true,
  iris_enabled boolean DEFAULT false,
  voice_enabled boolean DEFAULT false,
  min_confidence_threshold numeric(5,2) DEFAULT 85.0,
  max_attempts integer DEFAULT 3,
  template_update_interval integer DEFAULT 30,
  settings jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: biometric_templates
CREATE TABLE IF NOT EXISTS biometric_templates (
  id integer NOT NULL DEFAULT nextval('biometric_templates_id_seq'::regclass),
  company_id integer NOT NULL,
  employee_id character varying(255) NOT NULL,
  embedding_encrypted text NOT NULL,
  embedding_hash character varying(64) NOT NULL,
  algorithm character varying(50) NOT NULL DEFAULT 'face-api-js-v0.22.2'::character varying,
  model_version character varying(50) NOT NULL DEFAULT 'faceRecognitionNet'::character varying,
  template_version character varying(20) NOT NULL DEFAULT '1.0.0'::character varying,
  quality_score numeric(5,3) NOT NULL,
  confidence_score numeric(5,3) NOT NULL,
  face_size_ratio numeric(5,3),
  position_score numeric(5,3),
  lighting_score numeric(5,3),
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_validated boolean DEFAULT false,
  match_count integer DEFAULT 0,
  last_matched timestamp without time zone,
  capture_session_id character varying(100),
  capture_timestamp timestamp without time zone NOT NULL DEFAULT now(),
  encryption_algorithm character varying(50) NOT NULL DEFAULT 'AES-256-CBC'::character varying,
  encryption_key_version character varying(20) NOT NULL DEFAULT '1.0'::character varying,
  created_by integer,
  gdpr_consent boolean NOT NULL DEFAULT false,
  retention_expires timestamp without time zone,
  embedding_magnitude numeric(10,6),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: branch_offices_fiscal
CREATE TABLE IF NOT EXISTS branch_offices_fiscal (
  id integer NOT NULL DEFAULT nextval('branch_offices_fiscal_id_seq'::regclass),
  company_id integer NOT NULL,
  branch_office_id integer,
  nombre character varying(255) NOT NULL,
  codigo character varying(50),
  punto_venta integer NOT NULL,
  punto_venta_descripcion character varying(255),
  domicilio_fiscal character varying(500) NOT NULL,
  codigo_postal character varying(10),
  localidad character varying(100),
  provincia character varying(100),
  pais character varying(100) DEFAULT 'Argentina'::character varying,
  comprobantes_habilitados jsonb DEFAULT '[]'::jsonb,
  ultimo_numero_factura_a integer DEFAULT 0,
  ultimo_numero_factura_b integer DEFAULT 0,
  ultimo_numero_factura_c integer DEFAULT 0,
  ultimo_numero_nc_a integer DEFAULT 0,
  ultimo_numero_nc_b integer DEFAULT 0,
  ultimo_numero_nc_c integer DEFAULT 0,
  ultimo_numero_nd_a integer DEFAULT 0,
  ultimo_numero_nd_b integer DEFAULT 0,
  ultimo_numero_nd_c integer DEFAULT 0,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: branches
CREATE TABLE IF NOT EXISTS branches (
  id uuid NOT NULL,
  name character varying(255) NOT NULL,
  code character varying(255),
  address text,
  phone character varying(255),
  email character varying(255),
  latitude numeric(10,8),
  longitude numeric(11,8),
  radius integer DEFAULT 50,
  isActive boolean DEFAULT true,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL,
  company_id integer,
  country character varying(100),
  state_province character varying(100),
  postal_code character varying(20),
  city character varying(100),
  timezone character varying(50) DEFAULT 'America/Argentina/Buenos_Aires'::character varying,
  is_main boolean DEFAULT false
);

-- Tabla: budgets
CREATE TABLE IF NOT EXISTS budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trace_id character varying(100) NOT NULL,
  company_id integer NOT NULL,
  vendor_id uuid NOT NULL,
  budget_code character varying(50) NOT NULL,
  budget_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL,
  selected_modules jsonb NOT NULL,
  contracted_employees integer NOT NULL,
  price_per_employee numeric(10,2) NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  total_monthly numeric(12,2) NOT NULL,
  client_contact_name character varying(255) NOT NULL,
  client_contact_email character varying(255) NOT NULL,
  client_contact_phone character varying(50),
  status character varying(50) NOT NULL DEFAULT 'PENDING'::character varying,
  sent_at timestamp without time zone,
  viewed_at timestamp without time zone,
  accepted_at timestamp without time zone,
  rejected_at timestamp without time zone,
  rejection_reason text,
  notes text,
  payment_method character varying(50) DEFAULT 'TRANSFERENCIA'::character varying,
  created_by uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: business_validations
CREATE TABLE IF NOT EXISTS business_validations (
  id integer NOT NULL DEFAULT nextval('business_validations_id_seq'::regclass),
  company_id integer NOT NULL,
  department_id integer,
  validation_code character varying(50) NOT NULL,
  validation_name character varying(100) NOT NULL,
  validation_type character varying(30) NOT NULL,
  validation_params jsonb NOT NULL,
  severity character varying(20) DEFAULT 'error'::character varying,
  auto_reject boolean DEFAULT false,
  error_message text,
  active boolean DEFAULT true
);

-- Tabla: calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
  id integer NOT NULL DEFAULT nextval('calendar_events_id_seq'::regclass),
  calendar_integration_id integer,
  notification_group_id uuid,
  employee_id character varying(100) NOT NULL,
  event_type character varying(50),
  external_event_id character varying(255),
  event_start timestamp without time zone NOT NULL,
  event_end timestamp without time zone NOT NULL,
  event_title character varying(255),
  synced_at timestamp without time zone DEFAULT now(),
  last_updated timestamp without time zone
);

-- Tabla: calendar_integrations
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id integer NOT NULL DEFAULT nextval('calendar_integrations_id_seq'::regclass),
  employee_id character varying(100) NOT NULL,
  calendar_provider character varying(20),
  access_token text,
  refresh_token text,
  calendar_id character varying(255),
  sync_enabled boolean DEFAULT true,
  last_sync timestamp without time zone,
  sync_errors jsonb
);

-- Tabla: chronic_conditions_catalog
CREATE TABLE IF NOT EXISTS chronic_conditions_catalog (
  id integer NOT NULL DEFAULT nextval('chronic_conditions_catalog_id_seq'::regclass),
  code character varying(20) NOT NULL,
  name character varying(200) NOT NULL,
  category character varying(100),
  description text,
  severity_default character varying(20) DEFAULT 'moderate'::character varying,
  requires_medication boolean DEFAULT false,
  requires_monitoring boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: commission_liquidations
CREATE TABLE IF NOT EXISTS commission_liquidations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trace_id character varying(100) NOT NULL,
  invoice_id uuid,
  company_id integer NOT NULL,
  liquidation_type character varying(50) NOT NULL,
  liquidation_code character varying(50) NOT NULL,
  liquidation_date date NOT NULL DEFAULT CURRENT_DATE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  invoice_amount numeric(12,2) NOT NULL,
  invoice_number character varying(100),
  invoice_date date,
  total_commissionable numeric(12,2) NOT NULL,
  total_commission_amount numeric(12,2) NOT NULL,
  commission_breakdown jsonb NOT NULL,
  status character varying(50) NOT NULL DEFAULT 'CALCULATED'::character varying,
  approved_by uuid,
  approved_at timestamp without time zone,
  rejection_reason text,
  payment_batch_id uuid,
  payment_scheduled_date date,
  payment_executed_date date,
  payment_method character varying(50) DEFAULT 'TRANSFERENCIA'::character varying,
  notes text,
  source character varying(50) DEFAULT 'SYSTEM'::character varying,
  created_by uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: commission_payments
CREATE TABLE IF NOT EXISTS commission_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trace_id character varying(100) NOT NULL,
  liquidation_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  company_id integer NOT NULL,
  payment_code character varying(50) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  commission_amount numeric(12,2) NOT NULL,
  tax_withholding numeric(12,2) DEFAULT 0.00,
  net_amount numeric(12,2) NOT NULL,
  commission_type character varying(50) NOT NULL,
  commission_percentage numeric(5,2) NOT NULL,
  payment_method character varying(50) NOT NULL DEFAULT 'TRANSFERENCIA'::character varying,
  bank_name character varying(255),
  account_type character varying(50),
  account_number character varying(100),
  cbu character varying(22),
  alias character varying(100),
  wallet_provider character varying(100),
  wallet_account character varying(255),
  status character varying(50) NOT NULL DEFAULT 'PENDING'::character varying,
  scheduled_date date,
  executed_date date,
  confirmation_code character varying(100),
  transaction_id character varying(255),
  failure_reason text,
  failure_date timestamp without time zone,
  retry_count integer DEFAULT 0,
  last_retry_at timestamp without time zone,
  reconciled boolean DEFAULT false,
  reconciled_at timestamp without time zone,
  reconciled_by uuid,
  receipt_url character varying(500),
  receipt_generated_at timestamp without time zone,
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamp without time zone,
  notes text,
  payment_batch_id uuid,
  created_by uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: companies
CREATE TABLE IF NOT EXISTS companies (
  company_id integer NOT NULL DEFAULT nextval('companies_id_seq'::regclass),
  name character varying(255) NOT NULL,
  slug character varying(255) NOT NULL,
  contact_email character varying(255),
  phone character varying(50),
  address text,
  tax_id character varying(50),
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  displayName character varying(255),
  description text,
  max_employees integer DEFAULT 50,
  modules_data jsonb,
  modules_pricing jsonb,
  monthly_total numeric(10,2) DEFAULT 0,
  license_type character varying(50) DEFAULT 'basic'::character varying,
  createdAt timestamp with time zone DEFAULT now(),
  updatedAt timestamp with time zone DEFAULT now(),
  legal_name character varying(255),
  contact_phone character varying(50),
  city character varying(255),
  province character varying(255),
  country character varying(255) NOT NULL DEFAULT 'Argentina'::character varying,
  website character varying(255),
  registration_number character varying(255),
  timezone character varying(255) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires'::character varying,
  locale character varying(10) NOT NULL DEFAULT 'es-AR'::character varying,
  currency character varying(3) NOT NULL DEFAULT 'ARS'::character varying,
  logo text,
  primary_color character varying(7) DEFAULT '#0066CC'::character varying,
  secondary_color character varying(7) DEFAULT '#666666'::character varying,
  subscription_type enum_companies_subscription_type NOT NULL DEFAULT 'basic'::enum_companies_subscription_type,
  max_branches integer DEFAULT 5,
  status character varying(20) NOT NULL DEFAULT 'active'::character varying,
  is_trial boolean NOT NULL DEFAULT false,
  trial_ends_at timestamp with time zone,
  subscription_expires_at timestamp with time zone,
  features jsonb DEFAULT '{"medical": false, "reports": true, "apiAccess": false, "biometric": true, "multiuser": true, "attendance": true, "departments": true, "gpsTracking": false, "offlineMode": false, "realTimeSync": true, "customBranding": false, "ssoIntegration": false, "advancedReports": false}'::jsonb,
  pricing_info jsonb DEFAULT '{}'::jsonb,
  password_policy jsonb DEFAULT '{"maxAge": null, "minLength": 6, "requireNumbers": false, "requireSymbols": false, "requireLowercase": false, "requireUppercase": false}'::jsonb,
  two_factor_required boolean NOT NULL DEFAULT false,
  session_timeout integer NOT NULL DEFAULT 480,
  settings jsonb DEFAULT '{}'::jsonb,
  created_by integer,
  last_config_update timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  display_name character varying(255),
  postal_code character varying(20) DEFAULT ''::character varying,
  vendor character varying(255) DEFAULT ''::character varying,
  commission_percentage numeric(5,2) DEFAULT 10.0,
  cbu character varying(50) DEFAULT ''::character varying,
  pricing jsonb,
  modules jsonb DEFAULT '[]'::jsonb,
  contracted_employees integer NOT NULL DEFAULT 1,
  monthly_subtotal numeric(10,2) DEFAULT 0,
  monthly_tax numeric(10,2) DEFAULT 0,
  state character varying(255),
  email character varying(255),
  fallback_notification_email character varying(255),
  fallback_notification_whatsapp character varying(20),
  active_modules text,
  created_by_staff_id uuid,
  assigned_vendor_id uuid,
  support_vendor_id uuid,
  sales_commission_usd numeric(12,2) DEFAULT 0.00,
  support_commission_usd numeric(12,2) DEFAULT 0.00,
  multi_branch_enabled boolean NOT NULL DEFAULT false,
  onboarding_status character varying(50) DEFAULT 'PENDING'::character varying,
  requiere_supervision_factura boolean DEFAULT false,
  activated_at timestamp without time zone,
  onboarding_trace_id character varying(100),
  vendor_id uuid,
  modules_trial jsonb DEFAULT '[]'::jsonb,
  support_sla_plan_id uuid
);

-- Tabla: company_account_notifications
CREATE TABLE IF NOT EXISTS company_account_notifications (
  id integer NOT NULL DEFAULT nextval('company_account_notifications_id_seq'::regclass),
  company_id integer NOT NULL,
  user_id uuid,
  notification_type character varying(50) NOT NULL,
  title character varying(255) NOT NULL,
  message text,
  reference_type character varying(30),
  reference_id character varying(100),
  priority character varying(20) DEFAULT 'normal'::character varying,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  action_url character varying(255),
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla: company_associate_contracts
CREATE TABLE IF NOT EXISTS company_associate_contracts (
  id integer NOT NULL DEFAULT nextval('company_associate_contracts_id_seq'::regclass),
  company_id integer NOT NULL,
  associate_id uuid NOT NULL,
  contract_type contract_type NOT NULL,
  scope_type contract_scope NOT NULL DEFAULT 'all_company'::contract_scope,
  assigned_branches ARRAY DEFAULT '{}'::uuid[],
  assigned_departments ARRAY DEFAULT '{}'::integer[],
  role_id integer,
  custom_permissions jsonb,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status contract_status DEFAULT 'pending'::contract_status,
  terms_accepted boolean DEFAULT false,
  terms_accepted_at timestamp without time zone,
  hourly_rate_agreed numeric(10,2),
  currency character varying(3) DEFAULT 'ARS'::character varying,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  approved_by uuid,
  approved_at timestamp without time zone,
  terminated_by uuid,
  terminated_at timestamp without time zone,
  termination_reason text
);

-- Tabla: company_branches
CREATE TABLE IF NOT EXISTS company_branches (
  id integer NOT NULL DEFAULT nextval('company_branches_id_seq'::regclass),
  company_id integer NOT NULL,
  country_id integer,
  branch_code character varying(20) NOT NULL,
  branch_name character varying(200) NOT NULL,
  address text,
  city character varying(100),
  state_province character varying(100),
  postal_code character varying(20),
  phone character varying(50),
  email character varying(200),
  local_tax_id character varying(50),
  local_registration_number character varying(100),
  local_labor_authority character varying(200),
  default_pay_day integer DEFAULT 5,
  pay_frequency_override character varying(20),
  timezone character varying(50) DEFAULT 'America/Argentina/Buenos_Aires'::character varying,
  is_headquarters boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  default_agreement_id integer,
  default_template_id integer,
  payroll_settings jsonb DEFAULT '{}'::jsonb
);

-- Tabla: company_communications
CREATE TABLE IF NOT EXISTS company_communications (
  id integer NOT NULL DEFAULT nextval('company_communications_id_seq'::regclass),
  company_id integer NOT NULL,
  direction character varying(10) NOT NULL DEFAULT 'inbound'::character varying,
  department character varying(30) DEFAULT 'support'::character varying,
  from_user_id uuid,
  from_staff_id uuid,
  from_name character varying(255),
  subject character varying(255) NOT NULL,
  message text NOT NULL,
  priority character varying(20) DEFAULT 'normal'::character varying,
  status character varying(30) DEFAULT 'unread'::character varying,
  requires_response boolean DEFAULT false,
  response_deadline timestamp with time zone,
  parent_id integer,
  attachments jsonb DEFAULT '[]'::jsonb,
  read_at timestamp with time zone,
  read_by uuid,
  replied_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: company_dependencies
CREATE TABLE IF NOT EXISTS company_dependencies (
  id integer NOT NULL DEFAULT nextval('company_dependencies_id_seq'::regclass),
  company_id integer NOT NULL,
  dependency_code character varying(50) NOT NULL,
  dependency_name character varying(150) NOT NULL,
  dependency_name_i18n jsonb DEFAULT '{}'::jsonb,
  description text,
  dependency_type_id integer NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  icon character varying(50),
  color_hex character varying(7),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid
);

-- Tabla: company_fiscal_config
CREATE TABLE IF NOT EXISTS company_fiscal_config (
  id integer NOT NULL DEFAULT nextval('company_fiscal_config_id_seq'::regclass),
  company_id integer NOT NULL,
  cuit character varying(13) NOT NULL,
  razon_social character varying(255) NOT NULL,
  condicion_iva character varying(50) NOT NULL,
  inicio_actividades date,
  certificate_pem text,
  private_key_encrypted text,
  certificate_expiration timestamp without time zone,
  certificate_type character varying(20) DEFAULT 'TESTING'::character varying,
  afip_environment character varying(20) DEFAULT 'TESTING'::character varying,
  cached_token text,
  cached_sign text,
  token_expiration timestamp without time zone,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by integer,
  updated_by integer
);

-- Tabla: company_medical_staff
CREATE TABLE IF NOT EXISTS company_medical_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  partner_id uuid NOT NULL,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  assigned_by uuid
);

-- Tabla: company_modules
CREATE TABLE IF NOT EXISTS company_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  system_module_id uuid NOT NULL,
  precio_mensual numeric(10,2) NOT NULL DEFAULT 0.00,
  activo boolean NOT NULL DEFAULT true,
  fecha_asignacion timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_bundled boolean DEFAULT false,
  bundled_with uuid,
  auto_activated boolean DEFAULT false,
  is_active boolean DEFAULT true,
  contracted_price numeric(10,2),
  employee_tier character varying(20),
  expires_at timestamp without time zone,
  suspended_at timestamp without time zone,
  suspended_reason text,
  last_billed_at timestamp without time zone,
  next_billing_at timestamp without time zone,
  usage_stats jsonb DEFAULT '{}'::jsonb,
  configuration jsonb DEFAULT '{}'::jsonb,
  notes text
);

-- Tabla: company_risk_config
CREATE TABLE IF NOT EXISTS company_risk_config (
  id integer NOT NULL DEFAULT nextval('company_risk_config_id_seq'::regclass),
  company_id integer NOT NULL,
  threshold_method character varying(30) DEFAULT 'manual'::character varying,
  hybrid_weights jsonb DEFAULT '{"manual": 0.3, "quartile": 0.4, "benchmark": 0.3}'::jsonb,
  global_thresholds jsonb DEFAULT '{"fatigue": {"low": 30, "high": 70, "medium": 50, "critical": 85}, "accident": {"low": 30, "high": 70, "medium": 50, "critical": 85}, "turnover": {"low": 30, "high": 70, "medium": 50, "critical": 85}, "legal_claim": {"low": 30, "high": 70, "medium": 50, "critical": 85}, "performance": {"low": 30, "high": 70, "medium": 50, "critical": 85}}'::jsonb,
  global_weights jsonb DEFAULT '{"fatigue": 0.25, "accident": 0.25, "turnover": 0.15, "legal_claim": 0.20, "performance": 0.15}'::jsonb,
  enable_segmentation boolean DEFAULT false,
  default_benchmark_code character varying(50) DEFAULT 'ADM-GENERAL'::character varying,
  quartile_recalc_frequency character varying(20) DEFAULT 'weekly'::character varying,
  last_quartile_calculation timestamp without time zone,
  calculated_quartiles jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  updated_by uuid
);

-- Tabla: company_support_assignments
CREATE TABLE IF NOT EXISTS company_support_assignments (
  assignment_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id integer NOT NULL,
  support_type character varying(50) NOT NULL,
  assigned_vendor_id uuid,
  original_vendor_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  notes text,
  assigned_by_user_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone
);

-- Tabla: company_tasks
CREATE TABLE IF NOT EXISTS company_tasks (
  id integer NOT NULL DEFAULT nextval('company_tasks_id_seq'::regclass),
  company_id integer NOT NULL,
  task_name character varying(255) NOT NULL,
  task_description text,
  task_code character varying(50),
  task_category character varying(100),
  task_type character varying(100),
  estimated_hours numeric(5,2),
  priority_default character varying(50),
  requires_approval boolean DEFAULT false,
  approval_role character varying(50),
  is_active boolean DEFAULT true,
  is_template boolean DEFAULT false,
  created_by uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: company_tax_config
CREATE TABLE IF NOT EXISTS company_tax_config (
  id integer NOT NULL DEFAULT nextval('company_tax_config_id_seq'::regclass),
  company_id integer NOT NULL,
  tax_template_id integer NOT NULL,
  custom_tax_id character varying(50),
  custom_condition_code character varying(20),
  custom_currencies jsonb,
  concept_overrides jsonb DEFAULT '{}'::jsonb,
  factura_a_numero integer DEFAULT 1,
  factura_b_numero integer DEFAULT 1,
  factura_c_numero integer DEFAULT 1,
  remito_numero integer DEFAULT 1,
  recibo_numero integer DEFAULT 1,
  punto_venta integer DEFAULT 1,
  actividad_principal character varying(200),
  descuento_maximo numeric(5,2) DEFAULT 0,
  recargo_maximo numeric(5,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: comparative_analytics
CREATE TABLE IF NOT EXISTS comparative_analytics (
  id bigint NOT NULL DEFAULT nextval('comparative_analytics_id_seq'::regclass),
  company_id integer NOT NULL,
  cube_id character varying(100) NOT NULL,
  dimension_time character varying(50),
  dimension_time_value character varying(50),
  dimension_org character varying(50),
  dimension_org_value character varying(255),
  dimension_geo character varying(50),
  dimension_geo_value character varying(255),
  measure_name character varying(50),
  measure_value numeric(15,4),
  measure_unit character varying(20),
  comparison_baseline_value numeric(15,4),
  comparison_diff_absolute numeric(15,4),
  comparison_diff_percent numeric(7,2),
  sample_size integer,
  confidence_level numeric(5,2),
  calculated_at timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: compliance_rules
CREATE TABLE IF NOT EXISTS compliance_rules (
  id integer NOT NULL DEFAULT nextval('compliance_rules_id_seq'::regclass),
  rule_code character varying(50) NOT NULL,
  legal_reference character varying(255),
  rule_type character varying(30),
  severity character varying(20),
  check_frequency character varying(20),
  validation_query text,
  active boolean DEFAULT true
);

-- Tabla: compliance_violations
CREATE TABLE IF NOT EXISTS compliance_violations (
  id integer NOT NULL DEFAULT nextval('compliance_violations_id_seq'::regclass),
  company_id integer NOT NULL,
  rule_code character varying(50),
  employee_id character varying(100),
  violation_date timestamp without time zone DEFAULT now(),
  violation_data jsonb,
  status character varying(20) DEFAULT 'active'::character varying,
  resolved_at timestamp without time zone,
  resolution_notes text
);

-- Tabla: concept_dependencies
CREATE TABLE IF NOT EXISTS concept_dependencies (
  id integer NOT NULL DEFAULT nextval('concept_dependencies_id_seq'::regclass),
  company_id integer NOT NULL,
  concept_id integer NOT NULL,
  dependency_id integer NOT NULL,
  on_failure character varying(20) DEFAULT 'SKIP'::character varying,
  failure_message character varying(255),
  multiplier_mode character varying(20) DEFAULT 'NONE'::character varying,
  evaluation_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: consent_audit_log
CREATE TABLE IF NOT EXISTS consent_audit_log (
  audit_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_consent_id uuid NOT NULL,
  action character varying(50) NOT NULL,
  old_status character varying(20),
  new_status character varying(20),
  ip_address character varying(45),
  changed_by integer,
  notes text,
  metadata jsonb,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: consent_change_log
CREATE TABLE IF NOT EXISTS consent_change_log (
  id integer NOT NULL DEFAULT nextval('consent_change_log_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  consent_id integer,
  old_branch_id integer,
  old_country_id integer,
  old_country_code character varying(3),
  old_renewal_months integer,
  old_consent_status character varying(50),
  old_expires_at timestamp without time zone,
  new_branch_id integer,
  new_country_id integer,
  new_country_code character varying(3),
  new_renewal_months integer,
  change_type character varying(50) NOT NULL,
  action_taken character varying(50) NOT NULL,
  triggered_by character varying(50) DEFAULT 'SYSTEM'::character varying,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: consent_definitions
CREATE TABLE IF NOT EXISTS consent_definitions (
  consent_id uuid NOT NULL DEFAULT gen_random_uuid(),
  consent_key character varying(100) NOT NULL,
  title character varying(255) NOT NULL,
  description text NOT NULL,
  full_text text NOT NULL,
  version character varying(20) NOT NULL DEFAULT '1.0'::character varying,
  applicable_roles ARRAY NOT NULL,
  is_required boolean DEFAULT false,
  category character varying(50) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: consent_legal_documents
CREATE TABLE IF NOT EXISTS consent_legal_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  version character varying(20) NOT NULL,
  document_type character varying(50) NOT NULL DEFAULT 'consent_form'::character varying,
  language character varying(10) NOT NULL DEFAULT 'es-AR'::character varying,
  title text NOT NULL,
  content text NOT NULL,
  pdf_url text,
  pdf_hash character varying(64),
  regulations jsonb,
  is_active boolean DEFAULT true,
  effective_from timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_until timestamp without time zone,
  created_by_user_id uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: contextual_help
CREATE TABLE IF NOT EXISTS contextual_help (
  id integer NOT NULL DEFAULT nextval('contextual_help_id_seq'::regclass),
  module_key character varying(100) NOT NULL,
  screen_key character varying(100),
  element_key character varying(100),
  help_type character varying(20) DEFAULT 'tooltip'::character varying,
  title character varying(200),
  content text NOT NULL,
  content_html text,
  step_order integer,
  show_condition jsonb DEFAULT '{}'::jsonb,
  image_url text,
  video_url text,
  position character varying(20) DEFAULT 'auto'::character varying,
  style jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  quick_start text,
  common_issues jsonb DEFAULT '[]'::jsonb,
  walkthrough_steps jsonb DEFAULT '[]'::jsonb,
  documentation_url text
);

-- Tabla: contracts
CREATE TABLE IF NOT EXISTS contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trace_id character varying(100) NOT NULL,
  budget_id uuid NOT NULL,
  company_id integer NOT NULL,
  contract_code character varying(50) NOT NULL,
  contract_type character varying(50) NOT NULL DEFAULT 'EULA'::character varying,
  contract_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  template_version character varying(20) NOT NULL DEFAULT '1.0'::character varying,
  template_content text NOT NULL,
  selected_modules jsonb NOT NULL,
  contracted_employees integer NOT NULL,
  total_monthly numeric(12,2) NOT NULL,
  payment_method character varying(50) DEFAULT 'TRANSFERENCIA'::character varying,
  signature_required boolean DEFAULT true,
  signature_method character varying(50),
  signer_name character varying(255),
  signer_email character varying(255),
  signer_dni character varying(50),
  signer_role character varying(100),
  signed_at timestamp without time zone,
  signature_ip character varying(100),
  signature_hash character varying(255),
  signature_certificate text,
  status character varying(50) NOT NULL DEFAULT 'DRAFT'::character varying,
  sent_at timestamp without time zone,
  viewed_at timestamp without time zone,
  rejected_at timestamp without time zone,
  rejection_reason text,
  activated_at timestamp without time zone,
  notes text,
  legal_representative jsonb,
  created_by uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  contract_number character varying(50),
  quote_id integer,
  seller_id integer,
  support_partner_id integer,
  modules_data jsonb DEFAULT '[]'::jsonb,
  monthly_total numeric(10,2) DEFAULT 0,
  start_date timestamp without time zone,
  end_date timestamp without time zone,
  termination_date timestamp without time zone,
  termination_reason text,
  billing_cycle character varying(20) DEFAULT 'monthly'::character varying,
  payment_day integer DEFAULT 10,
  payment_terms_days integer DEFAULT 10,
  late_payment_surcharge_percentage numeric(5,2) DEFAULT 10,
  suspension_days_threshold integer DEFAULT 20,
  termination_days_threshold integer DEFAULT 30,
  seller_commission_percentage numeric(5,2),
  seller_sale_commission_percentage numeric(5,2),
  seller_support_commission_percentage numeric(5,2),
  support_commission_percentage numeric(5,2),
  pdf_file_path character varying(500),
  signed_pdf_file_path character varying(500),
  client_signature_date timestamp without time zone,
  company_signature_date timestamp without time zone,
  terms_and_conditions text,
  sla_terms jsonb,
  renewal_notification_sent boolean DEFAULT false,
  renewal_date timestamp without time zone,
  updated_by integer
);

-- Tabla: cost_budgets
CREATE TABLE IF NOT EXISTS cost_budgets (
  id integer NOT NULL DEFAULT nextval('cost_budgets_id_seq'::regclass),
  company_id integer NOT NULL,
  department_id integer,
  cost_category character varying(50),
  period_start date,
  period_end date,
  alert_threshold_percent integer DEFAULT 90
);

-- Tabla: cost_transactions
CREATE TABLE IF NOT EXISTS cost_transactions (
  id integer NOT NULL DEFAULT nextval('cost_transactions_id_seq'::regclass),
  company_id integer NOT NULL,
  department_id integer,
  employee_id character varying(100),
  notification_group_id uuid,
  cost_category character varying(50),
  description text,
  transaction_date timestamp without time zone DEFAULT now(),
  metadata jsonb
);

-- Tabla: data_integrity_log
CREATE TABLE IF NOT EXISTS data_integrity_log (
  id integer NOT NULL DEFAULT nextval('data_integrity_log_id_seq'::regclass),
  check_type character varying(50) NOT NULL,
  table_name character varying(50) NOT NULL,
  record_id character varying(100),
  company_id integer,
  issue_description text,
  auto_fixed boolean DEFAULT false,
  fix_description text,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: departments
CREATE TABLE IF NOT EXISTS departments (
  name character varying(100) NOT NULL,
  description text DEFAULT ''::text,
  address character varying(255) DEFAULT ''::character varying,
  gps_lat numeric(10,8),
  gps_lng numeric(11,8),
  coverage_radius integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone,
  company_id integer NOT NULL,
  id integer NOT NULL DEFAULT nextval('departments_id_seq'::regclass),
  branch_id uuid,
  default_kiosk_id integer,
  authorized_kiosks jsonb DEFAULT '[]'::jsonb,
  allow_gps_attendance boolean NOT NULL DEFAULT false
);

-- Tabla: dependency_evaluations
CREATE TABLE IF NOT EXISTS dependency_evaluations (
  id integer NOT NULL DEFAULT nextval('dependency_evaluations_id_seq'::regclass),
  company_id integer NOT NULL,
  payroll_run_id integer,
  payroll_period character varying(20),
  user_id uuid NOT NULL,
  concept_id integer NOT NULL,
  dependency_id integer NOT NULL,
  evaluation_result boolean NOT NULL,
  evaluation_details jsonb DEFAULT '{}'::jsonb,
  action_taken character varying(20),
  original_amount numeric(15,2),
  final_amount numeric(15,2),
  reduction_reason text,
  evaluated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: dependency_types
CREATE TABLE IF NOT EXISTS dependency_types (
  id integer NOT NULL DEFAULT nextval('dependency_types_id_seq'::regclass),
  type_code character varying(30) NOT NULL,
  type_name character varying(100) NOT NULL,
  type_name_i18n jsonb DEFAULT '{}'::jsonb,
  description text,
  icon character varying(50) DEFAULT 'file-text'::character varying,
  color_hex character varying(7) DEFAULT '#6c757d'::character varying,
  requires_expiration boolean DEFAULT true,
  requires_file boolean DEFAULT false,
  requires_family_member boolean DEFAULT false,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: dms_access_log
CREATE TABLE IF NOT EXISTS dms_access_log (
  id bigint NOT NULL DEFAULT nextval('dms_access_log_id_seq'::regclass),
  document_id uuid NOT NULL,
  document_version integer,
  company_id integer NOT NULL,
  user_id uuid NOT NULL,
  user_name character varying(255),
  user_role character varying(50),
  action character varying(30) NOT NULL,
  action_detail text,
  ip_address character varying(45),
  user_agent text,
  session_id character varying(100),
  device_type character varying(20),
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: dms_document_alerts
CREATE TABLE IF NOT EXISTS dms_document_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid,
  request_id uuid,
  company_id integer NOT NULL,
  alert_type character varying(30) NOT NULL,
  severity character varying(20) DEFAULT 'warning'::character varying,
  title character varying(255) NOT NULL,
  message text,
  user_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  trigger_date date,
  created_at timestamp without time zone DEFAULT now(),
  read_at timestamp without time zone,
  dismissed_at timestamp without time zone
);

-- Tabla: dms_document_categories
CREATE TABLE IF NOT EXISTS dms_document_categories (
  code character varying(50) NOT NULL,
  name character varying(100) NOT NULL,
  description text,
  icon character varying(50),
  color character varying(20),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: dms_document_metadata
CREATE TABLE IF NOT EXISTS dms_document_metadata (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  company_id integer NOT NULL,
  metadata_key character varying(100) NOT NULL,
  metadata_value text,
  data_type character varying(20) NOT NULL DEFAULT 'string'::character varying,
  is_searchable boolean DEFAULT true,
  is_required boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone
);

-- Tabla: dms_document_permissions
CREATE TABLE IF NOT EXISTS dms_document_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  company_id integer NOT NULL,
  grantee_type character varying(20) NOT NULL,
  grantee_id uuid,
  grantee_role character varying(50),
  permission_level character varying(20) NOT NULL,
  can_view boolean DEFAULT true,
  can_download boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_sign boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  can_share boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  valid_from timestamp without time zone DEFAULT now(),
  valid_until timestamp without time zone,
  granted_by uuid NOT NULL,
  granted_at timestamp without time zone DEFAULT now(),
  revoked_by uuid,
  revoked_at timestamp without time zone,
  is_active boolean DEFAULT true
);

-- Tabla: dms_document_requests
CREATE TABLE IF NOT EXISTS dms_document_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  type_code character varying(50) NOT NULL,
  title character varying(255),
  description text,
  requested_from_type character varying(20) NOT NULL,
  requested_from_id uuid NOT NULL,
  requested_from_name character varying(255),
  requested_by uuid NOT NULL,
  requested_by_name character varying(255),
  priority character varying(20) DEFAULT 'normal'::character varying,
  due_date date,
  status character varying(20) DEFAULT 'pending'::character varying,
  document_id uuid,
  uploaded_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  reminder_sent_at timestamp without time zone,
  reminder_count integer DEFAULT 0
);

-- Tabla: dms_document_statuses
CREATE TABLE IF NOT EXISTS dms_document_statuses (
  code character varying(50) NOT NULL,
  name character varying(100) NOT NULL,
  description text,
  color character varying(20),
  icon character varying(50),
  is_active boolean DEFAULT true
);

-- Tabla: dms_document_types
CREATE TABLE IF NOT EXISTS dms_document_types (
  code character varying(50) NOT NULL,
  name character varying(100) NOT NULL,
  description text,
  category_code character varying(50),
  requires_approval boolean DEFAULT false,
  max_size_mb integer DEFAULT 10,
  allowed_extensions ARRAY,
  retention_days integer DEFAULT 3650,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: dms_document_versions
CREATE TABLE IF NOT EXISTS dms_document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  company_id integer NOT NULL,
  version_number integer NOT NULL,
  original_filename character varying(255) NOT NULL,
  stored_filename character varying(255) NOT NULL,
  storage_path character varying(500) NOT NULL,
  file_size_bytes bigint NOT NULL,
  mime_type character varying(100) NOT NULL,
  checksum_sha256 character varying(64) NOT NULL,
  change_summary text,
  changed_fields jsonb,
  created_by uuid NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  created_from_ip character varying(45)
);

-- Tabla: dms_documents
CREATE TABLE IF NOT EXISTS dms_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  document_number character varying(50),
  external_reference character varying(100),
  category_code character varying(10) NOT NULL,
  type_code character varying(50) NOT NULL,
  folder_id uuid,
  parent_document_id uuid,
  title character varying(255) NOT NULL,
  description text,
  original_filename character varying(255) NOT NULL,
  stored_filename character varying(255) NOT NULL,
  storage_path character varying(500) NOT NULL,
  file_size_bytes bigint NOT NULL,
  mime_type character varying(100) NOT NULL,
  file_extension character varying(20) NOT NULL,
  checksum_sha256 character varying(64) NOT NULL,
  owner_type character varying(50) NOT NULL DEFAULT 'user'::character varying,
  owner_id uuid NOT NULL,
  owner_name character varying(255),
  source_module character varying(50),
  source_entity_type character varying(50),
  source_entity_id uuid,
  status character varying(30) NOT NULL DEFAULT 'DRAFT'::character varying,
  previous_status character varying(30),
  status_changed_at timestamp without time zone,
  status_changed_by uuid,
  status_reason text,
  version integer NOT NULL DEFAULT 1,
  is_current_version boolean DEFAULT true,
  superseded_by_id uuid,
  supersedes_id uuid,
  version_notes text,
  issue_date date,
  effective_date date,
  expiration_date date,
  expiration_alert_days integer DEFAULT 30,
  last_expiration_alert_at timestamp without time zone,
  requires_signature boolean DEFAULT false,
  is_signed boolean DEFAULT false,
  signature_data jsonb,
  signed_by uuid,
  signed_at timestamp without time zone,
  signature_ip character varying(45),
  visibility character varying(20) DEFAULT 'private'::character varying,
  is_confidential boolean DEFAULT false,
  is_sensitive boolean DEFAULT false,
  access_level integer DEFAULT 1,
  is_locked boolean DEFAULT false,
  locked_at timestamp without time zone,
  locked_by uuid,
  locked_reason text,
  lock_expires_at timestamp without time zone,
  is_checked_out boolean DEFAULT false,
  checked_out_by uuid,
  checked_out_at timestamp without time zone,
  checkout_expires_at timestamp without time zone,
  content_text text,
  search_vector tsvector,
  tags ARRAY DEFAULT ARRAY[]::character varying[],
  retention_until date,
  disposal_action character varying(20),
  disposal_date date,
  created_by uuid NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_by uuid,
  updated_at timestamp without time zone,
  is_deleted boolean DEFAULT false,
  deleted_by uuid,
  deleted_at timestamp without time zone,
  deletion_reason text,
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  last_accessed_at timestamp without time zone,
  last_accessed_by uuid
);

-- Tabla: dms_folders
CREATE TABLE IF NOT EXISTS dms_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  parent_id uuid,
  name character varying(255) NOT NULL,
  description text,
  full_path character varying(1000),
  depth integer DEFAULT 0,
  owner_type character varying(50) DEFAULT 'company'::character varying,
  owner_id uuid,
  inherit_permissions boolean DEFAULT true,
  default_visibility character varying(20) DEFAULT 'private'::character varying,
  color character varying(7),
  icon character varying(10),
  is_system boolean DEFAULT false,
  folder_type character varying(50),
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone
);

-- Tabla: dms_workflow_approvals
CREATE TABLE IF NOT EXISTS dms_workflow_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  document_id uuid NOT NULL,
  company_id integer NOT NULL,
  step_number integer NOT NULL,
  assigned_to uuid NOT NULL,
  assigned_role character varying(50),
  decision character varying(20) DEFAULT 'pending'::character varying,
  decision_comment text,
  decision_at timestamp without time zone,
  delegated_to uuid,
  delegated_at timestamp without time zone,
  delegation_reason text,
  due_at timestamp without time zone,
  reminded_at timestamp without time zone,
  reminder_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: dms_workflow_instances
CREATE TABLE IF NOT EXISTS dms_workflow_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  template_id integer,
  company_id integer NOT NULL,
  name character varying(100) NOT NULL,
  status character varying(20) DEFAULT 'active'::character varying,
  current_step integer DEFAULT 1,
  total_steps integer NOT NULL,
  steps_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamp without time zone DEFAULT now(),
  completed_at timestamp without time zone,
  deadline timestamp without time zone,
  started_by uuid NOT NULL,
  completed_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone
);

-- Tabla: dms_workflow_templates
CREATE TABLE IF NOT EXISTS dms_workflow_templates (
  id integer NOT NULL DEFAULT nextval('dms_workflow_templates_id_seq'::regclass),
  company_id integer,
  name character varying(100) NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  trigger_on_types ARRAY DEFAULT ARRAY[]::character varying[],
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone
);

-- Tabla: document_categories
CREATE TABLE IF NOT EXISTS document_categories (
  id integer NOT NULL DEFAULT nextval('document_categories_id_seq'::regclass),
  code character varying(10) NOT NULL,
  name character varying(100) NOT NULL,
  name_en character varying(100),
  description text,
  icon character varying(10),
  color character varying(7),
  parent_id integer,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone
);

-- Tabla: document_statuses
CREATE TABLE IF NOT EXISTS document_statuses (
  id integer NOT NULL DEFAULT nextval('document_statuses_id_seq'::regclass),
  code character varying(30) NOT NULL,
  name character varying(50) NOT NULL,
  name_en character varying(50),
  description text,
  color character varying(7),
  icon character varying(10),
  sort_order integer DEFAULT 0,
  is_final boolean DEFAULT false,
  allowed_transitions ARRAY DEFAULT ARRAY[]::character varying[]
);

-- Tabla: document_types
CREATE TABLE IF NOT EXISTS document_types (
  id integer NOT NULL DEFAULT nextval('document_types_id_seq'::regclass),
  code character varying(50) NOT NULL,
  category_code character varying(10) NOT NULL,
  name character varying(150) NOT NULL,
  name_en character varying(150),
  description text,
  retention_years integer,
  requires_expiration boolean DEFAULT false,
  requires_signature boolean DEFAULT false,
  is_sensitive boolean DEFAULT false,
  is_auto_generated boolean DEFAULT false,
  required_metadata jsonb DEFAULT '[]'::jsonb,
  optional_metadata jsonb DEFAULT '[]'::jsonb,
  allowed_extensions ARRAY DEFAULT ARRAY['pdf'::text, 'jpg'::text, 'jpeg'::text, 'png'::text, 'doc'::text, 'docx'::text],
  max_file_size_mb integer DEFAULT 10,
  default_visibility character varying(20) DEFAULT 'private'::character varying,
  allowed_roles ARRAY DEFAULT ARRAY['admin'::text, 'hr_manager'::text],
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone
);

-- Tabla: email_configurations
CREATE TABLE IF NOT EXISTS email_configurations (
  id integer NOT NULL DEFAULT nextval('email_configurations_id_seq'::regclass),
  company_id integer NOT NULL,
  institutional_email character varying(255) NOT NULL,
  display_name character varying(255) NOT NULL,
  smtp_host character varying(255) NOT NULL,
  smtp_port integer NOT NULL,
  smtp_user character varying(255) NOT NULL,
  smtp_password text NOT NULL,
  smtp_secure boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verification_token character varying(255),
  verified_at timestamp without time zone,
  last_verification_attempt timestamp without time zone,
  verification_attempts integer DEFAULT 0,
  daily_limit integer DEFAULT 500,
  monthly_limit integer DEFAULT 10000,
  current_daily_count integer DEFAULT 0,
  current_monthly_count integer DEFAULT 0,
  last_reset_daily timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  last_reset_monthly timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  from_name character varying(255),
  reply_to character varying(255),
  cc_copy character varying(255),
  bcc_copy character varying(255),
  use_company_templates boolean DEFAULT true,
  signature text,
  is_active boolean DEFAULT true,
  suspended boolean DEFAULT false,
  suspended_reason text,
  suspended_at timestamp without time zone,
  last_error text,
  last_error_at timestamp without time zone,
  error_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  updated_by uuid
);

-- Tabla: email_logs
CREATE TABLE IF NOT EXISTS email_logs (
  id integer NOT NULL DEFAULT nextval('email_logs_id_seq'::regclass),
  sender_type character varying(50) NOT NULL,
  sender_id character varying(255),
  email_config_id integer,
  recipient_email character varying(255) NOT NULL,
  recipient_name character varying(255),
  recipient_type character varying(50),
  recipient_id character varying(255),
  subject text NOT NULL,
  body_html text,
  body_text text,
  notification_id integer,
  template_id integer,
  category character varying(100),
  priority character varying(20) DEFAULT 'normal'::character varying,
  has_attachments boolean DEFAULT false,
  attachments jsonb,
  status character varying(50) DEFAULT 'pending'::character varying,
  sent_at timestamp without time zone,
  delivered_at timestamp without time zone,
  opened_at timestamp without time zone,
  clicked_at timestamp without time zone,
  bounced_at timestamp without time zone,
  message_id character varying(255),
  tracking_id uuid DEFAULT gen_random_uuid(),
  error_message text,
  error_code character varying(50),
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: email_templates
CREATE TABLE IF NOT EXISTS email_templates (
  id integer NOT NULL DEFAULT nextval('email_templates_id_seq'::regclass),
  company_id integer,
  template_key character varying(100) NOT NULL,
  template_name character varying(255) NOT NULL,
  description text,
  subject character varying(500) NOT NULL,
  body_html text NOT NULL,
  body_text text,
  available_variables jsonb,
  category character varying(100),
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid
);

-- Tabla: email_verification_tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type character varying(50) NOT NULL,
  email character varying(255) NOT NULL,
  token character varying(255) NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  verified_at timestamp without time zone,
  is_verified boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  company_id integer
);

-- Tabla: employee_dependency_documents
CREATE TABLE IF NOT EXISTS employee_dependency_documents (
  id integer NOT NULL DEFAULT nextval('employee_dependency_documents_id_seq'::regclass),
  company_id integer NOT NULL,
  user_id uuid NOT NULL,
  dependency_id integer NOT NULL,
  family_member_type character varying(20),
  family_member_id integer,
  family_member_name character varying(150),
  issue_date date NOT NULL,
  expiration_date date,
  file_url character varying(500),
  file_name character varying(255),
  file_size integer,
  file_mime_type character varying(100),
  status character varying(20) DEFAULT 'VALID'::character varying,
  days_until_expiration integer,
  replaced_by_id integer,
  is_current boolean DEFAULT true,
  notes text,
  uploaded_by uuid,
  reviewed_by uuid,
  reviewed_at timestamp without time zone,
  review_notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: employee_documents
CREATE TABLE IF NOT EXISTS employee_documents (
  id integer NOT NULL DEFAULT nextval('employee_documents_id_seq'::regclass),
  userId uuid NOT NULL,
  documentType enum_employee_documents_documentType NOT NULL,
  documentNumber character varying(100),
  issuingAuthority character varying(255),
  issuingCountry character varying(100),
  issueDate timestamp with time zone,
  expiryDate timestamp with time zone,
  documentData json DEFAULT '{}'::json,
  frontPhotoPath character varying(500),
  backPhotoPath character varying(500),
  additionalFiles json DEFAULT '[]'::json,
  status enum_employee_documents_status DEFAULT 'valid'::enum_employee_documents_status,
  alertDays integer DEFAULT 30,
  lastAlertSent timestamp with time zone,
  notes text,
  isActive boolean DEFAULT true,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL
);

-- Tabla: employee_locations
CREATE TABLE IF NOT EXISTS employee_locations (
  id uuid NOT NULL,
  userId uuid NOT NULL,
  company_id integer NOT NULL,
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  accuracy double precision,
  altitude double precision,
  heading double precision,
  speed double precision,
  isWorkingHours boolean DEFAULT false,
  isOnBreak boolean DEFAULT false,
  isInGeofence boolean DEFAULT false,
  currentActivity enum_employee_locations_currentActivity DEFAULT 'idle'::"enum_employee_locations_currentActivity",
  deviceId character varying(255),
  appVersion character varying(255),
  batteryLevel integer,
  connectionType enum_employee_locations_connectionType DEFAULT 'unknown'::"enum_employee_locations_connectionType",
  address character varying(255),
  nearbyLandmarks json,
  weatherConditions json,
  isPrivacyMode boolean DEFAULT false,
  sharingLevel enum_employee_locations_sharingLevel DEFAULT 'full'::"enum_employee_locations_sharingLevel",
  reportedAt timestamp with time zone NOT NULL,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL
);

-- Tabla: epp_catalog
CREATE TABLE IF NOT EXISTS epp_catalog (
  id integer NOT NULL DEFAULT nextval('epp_catalog_id_seq'::regclass),
  company_id integer NOT NULL,
  category_id integer NOT NULL,
  code character varying(50) NOT NULL,
  name character varying(200) NOT NULL,
  description text,
  brand character varying(100),
  model character varying(100),
  certifications jsonb,
  default_lifespan_days integer,
  lifespan_unit character varying(20) DEFAULT 'days'::character varying,
  max_uses integer,
  available_sizes jsonb,
  unit_cost numeric(10,2),
  min_stock_alert integer DEFAULT 5,
  usage_instructions text,
  maintenance_instructions text,
  storage_instructions text,
  disposal_instructions text,
  procedure_id integer,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: epp_categories
CREATE TABLE IF NOT EXISTS epp_categories (
  id integer NOT NULL DEFAULT nextval('epp_categories_id_seq'::regclass),
  code character varying(20) NOT NULL,
  name_es character varying(100) NOT NULL,
  name_en character varying(100) NOT NULL,
  icon character varying(50),
  body_zone character varying(50),
  iso_reference character varying(50),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: epp_deliveries
CREATE TABLE IF NOT EXISTS epp_deliveries (
  id integer NOT NULL DEFAULT nextval('epp_deliveries_id_seq'::regclass),
  company_id integer NOT NULL,
  employee_id uuid NOT NULL,
  epp_catalog_id integer NOT NULL,
  requirement_id integer,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  delivered_by uuid,
  quantity_delivered integer DEFAULT 1,
  size_delivered character varying(20),
  serial_number character varying(100),
  batch_number character varying(100),
  manufacture_date date,
  expiration_date date,
  calculated_replacement_date date NOT NULL,
  status character varying(30) DEFAULT 'active'::character varying,
  employee_signature_date timestamp without time zone,
  employee_signature_method character varying(30),
  signature_document_url text,
  return_date date,
  return_reason character varying(100),
  return_notes text,
  replaced_by_delivery_id integer,
  notification_30_sent boolean DEFAULT false,
  notification_15_sent boolean DEFAULT false,
  notification_7_sent boolean DEFAULT false,
  notification_expired_sent boolean DEFAULT false,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: epp_inspections
CREATE TABLE IF NOT EXISTS epp_inspections (
  id integer NOT NULL DEFAULT nextval('epp_inspections_id_seq'::regclass),
  delivery_id integer NOT NULL,
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  inspector_id uuid NOT NULL,
  condition character varying(30) NOT NULL,
  is_compliant boolean DEFAULT true,
  checklist_results jsonb,
  action_required character varying(50),
  action_notes text,
  action_deadline date,
  action_completed boolean DEFAULT false,
  photos jsonb,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: epp_role_requirements
CREATE TABLE IF NOT EXISTS epp_role_requirements (
  id integer NOT NULL DEFAULT nextval('epp_role_requirements_id_seq'::regclass),
  company_id integer NOT NULL,
  position_id integer NOT NULL,
  epp_catalog_id integer NOT NULL,
  is_mandatory boolean DEFAULT true,
  priority integer DEFAULT 1,
  quantity_required integer DEFAULT 1,
  custom_lifespan_days integer,
  conditions text,
  applicable_work_environments jsonb,
  specific_procedure_id integer,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: extraordinary_licenses
CREATE TABLE IF NOT EXISTS extraordinary_licenses (
  id integer NOT NULL DEFAULT nextval('extraordinary_licenses_id_seq'::regclass),
  company_id integer NOT NULL,
  type character varying(100) NOT NULL,
  description text,
  days integer NOT NULL,
  day_type character varying(20) DEFAULT 'corrido'::character varying,
  requires_approval boolean DEFAULT true,
  requires_documentation boolean DEFAULT false,
  max_per_year integer,
  advance_notice_days integer DEFAULT 0,
  legal_basis text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: facial_biometric_data
CREATE TABLE IF NOT EXISTS facial_biometric_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  face_encoding text NOT NULL,
  face_template bytea,
  quality_score numeric(5,2) DEFAULT 0.0,
  capture_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  device_info jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: fingerprint_biometric_data
CREATE TABLE IF NOT EXISTS fingerprint_biometric_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  finger_position integer,
  template_data bytea NOT NULL,
  minutiae_data jsonb,
  quality_score numeric(5,2) DEFAULT 0.0,
  capture_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  device_info jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: holidays
CREATE TABLE IF NOT EXISTS holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country character varying(100) NOT NULL,
  state_province character varying(100),
  date date NOT NULL,
  name character varying(255) NOT NULL,
  is_national boolean DEFAULT true,
  is_provincial boolean DEFAULT false,
  year integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: hse_company_config
CREATE TABLE IF NOT EXISTS hse_company_config (
  id integer NOT NULL DEFAULT nextval('hse_company_config_id_seq'::regclass),
  company_id integer NOT NULL,
  primary_standard character varying(30) DEFAULT 'ISO45001'::character varying,
  secondary_standards jsonb,
  alert_days_before jsonb DEFAULT '[30, 15, 7, 1]'::jsonb,
  notify_employee boolean DEFAULT true,
  notify_supervisor boolean DEFAULT true,
  notify_hse_manager boolean DEFAULT true,
  notify_hr boolean DEFAULT false,
  block_work_without_epp boolean DEFAULT false,
  require_signature_on_delivery boolean DEFAULT true,
  auto_schedule_inspections boolean DEFAULT true,
  inspection_frequency_days integer DEFAULT 90,
  hse_manager_role_id integer,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id bigint NOT NULL DEFAULT nextval('invoices_id_seq'::regclass),
  company_id integer NOT NULL,
  invoice_number character varying(50) NOT NULL,
  billing_period_month integer NOT NULL,
  billing_period_year integer NOT NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL,
  currency character varying(3) NOT NULL DEFAULT 'USD'::character varying,
  status character varying(20) NOT NULL DEFAULT 'draft'::character varying,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  sent_at timestamp with time zone,
  paid_at timestamp with time zone,
  notes text,
  internal_notes text,
  created_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

-- Tabla: job_application_notes
CREATE TABLE IF NOT EXISTS job_application_notes (
  id integer NOT NULL DEFAULT nextval('job_application_notes_id_seq'::regclass),
  application_id integer NOT NULL,
  note_type character varying(50) DEFAULT 'general'::character varying,
  content text NOT NULL,
  is_private boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla: job_applications
CREATE TABLE IF NOT EXISTS job_applications (
  id integer NOT NULL DEFAULT nextval('job_applications_id_seq'::regclass),
  company_id integer NOT NULL,
  job_posting_id integer NOT NULL,
  candidate_first_name character varying(100) NOT NULL,
  candidate_last_name character varying(100) NOT NULL,
  candidate_email character varying(255) NOT NULL,
  candidate_phone character varying(50),
  candidate_dni character varying(20),
  candidate_birth_date date,
  candidate_gender character varying(20),
  candidate_nationality character varying(100),
  candidate_address text,
  candidate_city character varying(100),
  candidate_province character varying(100),
  candidate_postal_code character varying(20),
  experience_years integer,
  current_position character varying(255),
  current_company character varying(255),
  education_level character varying(50),
  education_title character varying(255),
  skills jsonb DEFAULT '[]'::jsonb,
  languages jsonb DEFAULT '[]'::jsonb,
  certifications jsonb DEFAULT '[]'::jsonb,
  cv_file_path character varying(500),
  cv_file_name character varying(255),
  cv_uploaded_at timestamp with time zone,
  cover_letter text,
  additional_documents jsonb DEFAULT '[]'::jsonb,
  salary_expectation numeric(12,2),
  availability character varying(50),
  preferred_schedule character varying(100),
  willing_to_relocate boolean DEFAULT false,
  status character varying(50) DEFAULT 'nuevo'::character varying,
  status_history jsonb DEFAULT '[]'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  review_score integer,
  interview_scheduled_at timestamp with time zone,
  interview_location character varying(255),
  interview_type character varying(50),
  interview_notes text,
  interview_score integer,
  interviewer_id uuid,
  admin_approved_by uuid,
  admin_approved_at timestamp with time zone,
  admin_approval_notes text,
  medical_record_id integer,
  medical_exam_date date,
  medical_result character varying(50),
  medical_observations text,
  medical_restrictions jsonb DEFAULT '[]'::jsonb,
  medical_approved_by uuid,
  medical_approved_at timestamp with time zone,
  hired_at timestamp with time zone,
  hired_by uuid,
  employee_user_id uuid,
  start_date date,
  assigned_department_id integer,
  assigned_position character varying(255),
  final_salary numeric(12,2),
  contract_type character varying(50),
  rejected_at timestamp with time zone,
  rejected_by uuid,
  rejection_reason character varying(255),
  rejection_notes text,
  rejection_stage character varying(50),
  notification_sent_to_medical boolean DEFAULT false,
  notification_sent_at timestamp with time zone,
  notification_id integer,
  source character varying(100),
  referrer_employee_id uuid,
  ip_address character varying(45),
  user_agent text,
  applied_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: job_postings
CREATE TABLE IF NOT EXISTS job_postings (
  id integer NOT NULL DEFAULT nextval('job_postings_id_seq'::regclass),
  company_id integer NOT NULL,
  title character varying(255) NOT NULL,
  description text,
  requirements text,
  responsibilities text,
  department_id integer,
  department_name character varying(100),
  location character varying(255),
  job_type character varying(50) DEFAULT 'full-time'::character varying,
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  salary_currency character varying(3) DEFAULT 'ARS'::character varying,
  salary_period character varying(20) DEFAULT 'monthly'::character varying,
  benefits jsonb DEFAULT '[]'::jsonb,
  status character varying(30) DEFAULT 'draft'::character varying,
  is_public boolean DEFAULT true,
  is_internal boolean DEFAULT false,
  max_applications integer,
  auto_close_date date,
  requires_cv boolean DEFAULT true,
  requires_cover_letter boolean DEFAULT false,
  tags jsonb DEFAULT '[]'::jsonb,
  skills_required jsonb DEFAULT '[]'::jsonb,
  hiring_manager_id uuid,
  recruiter_id uuid,
  views_count integer DEFAULT 0,
  applications_count integer DEFAULT 0,
  posted_at timestamp with time zone,
  closed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  search_scope character varying(20) DEFAULT 'external'::character varying,
  internal_matching_enabled boolean DEFAULT true,
  internal_matching_criteria jsonb DEFAULT '{"match_skills": true, "match_education": true, "min_match_score": 50, "match_experience": true, "match_certifications": true}'::jsonb,
  internal_candidates_notified jsonb DEFAULT '[]'::jsonb,
  internal_matching_executed_at timestamp without time zone,
  internal_candidates_count integer DEFAULT 0
);

-- Tabla: kiosks
CREATE TABLE IF NOT EXISTS kiosks (
  id integer NOT NULL DEFAULT nextval('kiosks_id_seq'::regclass),
  name character varying(100) NOT NULL,
  description text,
  device_id character varying(100),
  gps_lat numeric(10,8),
  gps_lng numeric(11,8),
  is_configured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  company_id integer NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone,
  location text,
  authorized_departments jsonb DEFAULT '[]'::jsonb,
  has_external_reader boolean DEFAULT false,
  reader_model character varying(100),
  reader_config jsonb DEFAULT '{}'::jsonb,
  ip_address character varying(50),
  port integer DEFAULT 9998,
  last_seen timestamp without time zone,
  apk_version character varying(20)
);

-- Tabla: labor_agreements_catalog
CREATE TABLE IF NOT EXISTS labor_agreements_catalog (
  id integer NOT NULL DEFAULT nextval('labor_agreements_catalog_id_seq'::regclass),
  code character varying(20) NOT NULL,
  name character varying(300) NOT NULL,
  industry character varying(100),
  union_name character varying(200),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: labor_agreements_v2
CREATE TABLE IF NOT EXISTS labor_agreements_v2 (
  id integer NOT NULL DEFAULT nextval('labor_agreements_v2_id_seq'::regclass),
  country_id integer,
  company_id integer,
  code character varying(50) NOT NULL,
  name character varying(300) NOT NULL,
  short_name character varying(100),
  industry character varying(200),
  legal_references jsonb DEFAULT '[]'::jsonb,
  effective_date date,
  expiration_date date,
  base_work_hours_weekly numeric(5,2) DEFAULT 48,
  base_work_hours_daily numeric(5,2) DEFAULT 8,
  overtime_threshold_daily numeric(5,2) DEFAULT 8,
  overtime_50_multiplier numeric(4,2) DEFAULT 1.50,
  overtime_100_multiplier numeric(4,2) DEFAULT 2.00,
  night_shift_multiplier numeric(4,2) DEFAULT 1.00,
  vacation_days_by_seniority jsonb DEFAULT '[{"days": 14, "max_years": 5, "min_years": 0}, {"days": 21, "max_years": 10, "min_years": 5}, {"days": 28, "max_years": 20, "min_years": 10}, {"days": 35, "max_years": null, "min_years": 20}]'::jsonb,
  receipt_legal_text text,
  receipt_footer_text text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: legal_ai_analysis
CREATE TABLE IF NOT EXISTS legal_ai_analysis (
  id integer NOT NULL DEFAULT nextval('legal_ai_analysis_id_seq'::regclass),
  case_id integer,
  company_id integer NOT NULL,
  analysis_type character varying(50) NOT NULL,
  prompt_used text,
  analysis_result text NOT NULL,
  confidence_score numeric(3,2),
  structured_data jsonb,
  related_deadline_id integer,
  related_document_id integer,
  model_used character varying(50) DEFAULT 'llama3.1:8b'::character varying,
  tokens_used integer,
  processing_time_ms integer,
  is_reviewed boolean DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamp without time zone,
  review_notes text,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: legal_case_documents
CREATE TABLE IF NOT EXISTS legal_case_documents (
  id integer NOT NULL DEFAULT nextval('legal_case_documents_id_seq'::regclass),
  case_id integer NOT NULL,
  stage_id integer,
  timeline_event_id integer,
  document_type character varying(50) NOT NULL,
  file_name character varying(500) NOT NULL,
  file_path character varying(1000) NOT NULL,
  file_size integer,
  mime_type character varying(100),
  document_date date,
  document_number character varying(100),
  title character varying(500) NOT NULL,
  description text,
  source character varying(50),
  is_confidential boolean DEFAULT false,
  is_original boolean DEFAULT false,
  is_certified boolean DEFAULT false,
  from_employee_360 boolean DEFAULT false,
  original_table character varying(100),
  original_id integer,
  uploaded_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  expects_response boolean DEFAULT false,
  response_type character varying(50),
  response_deadline date,
  response_received boolean DEFAULT false,
  response_received_at timestamp without time zone,
  response_document_id integer,
  is_locked boolean DEFAULT false,
  locked_at timestamp without time zone,
  lock_reason character varying(255),
  edit_window_hours integer DEFAULT 72,
  can_edit_until timestamp without time zone
);

-- Tabla: legal_case_parties
CREATE TABLE IF NOT EXISTS legal_case_parties (
  id integer NOT NULL DEFAULT nextval('legal_case_parties_id_seq'::regclass),
  case_id integer NOT NULL,
  party_type character varying(30) NOT NULL,
  name character varying(255) NOT NULL,
  role_description character varying(255),
  email character varying(255),
  phone character varying(50),
  address text,
  is_internal boolean DEFAULT false,
  user_id uuid,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: legal_case_stages
CREATE TABLE IF NOT EXISTS legal_case_stages (
  id integer NOT NULL DEFAULT nextval('legal_case_stages_id_seq'::regclass),
  case_id integer NOT NULL,
  stage character varying(30) NOT NULL,
  sub_status character varying(50) NOT NULL,
  description text,
  notes text,
  start_date timestamp without time zone DEFAULT now(),
  end_date timestamp without time zone,
  outcome character varying(50),
  outcome_details text,
  recorded_by uuid,
  sequence_order integer,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: legal_case_timeline_events
CREATE TABLE IF NOT EXISTS legal_case_timeline_events (
  id integer NOT NULL DEFAULT nextval('legal_case_timeline_events_id_seq'::regclass),
  case_id integer NOT NULL,
  stage_id integer,
  event_type character varying(50) NOT NULL,
  title character varying(500) NOT NULL,
  description text,
  event_date timestamp without time zone NOT NULL,
  importance character varying(20) DEFAULT 'normal'::character varying,
  is_public boolean DEFAULT true,
  is_milestone boolean DEFAULT false,
  document_id integer,
  related_event_id integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: legal_cases
CREATE TABLE IF NOT EXISTS legal_cases (
  id integer NOT NULL DEFAULT nextval('legal_cases_id_seq'::regclass),
  company_id integer NOT NULL,
  case_number character varying(50) NOT NULL,
  external_case_number character varying(100),
  case_type character varying(50) NOT NULL,
  employee_id uuid NOT NULL,
  employee_name character varying(255),
  employee_position character varying(255),
  employee_department character varying(255),
  employee_hire_date date,
  employee_termination_date date,
  title character varying(500) NOT NULL,
  description text,
  claimed_amount numeric(15,2),
  currency character varying(3) DEFAULT 'ARS'::character varying,
  plaintiff_lawyer character varying(255),
  plaintiff_lawyer_contact text,
  defendant_lawyer character varying(255),
  defendant_lawyer_id uuid,
  jurisdiction character varying(100),
  jurisdiction_code character varying(10),
  judge_name character varying(255),
  current_stage character varying(30) DEFAULT 'prejudicial'::character varying,
  current_sub_status character varying(50),
  resolution_type character varying(30),
  resolution_amount numeric(15,2),
  resolution_date date,
  resolution_summary text,
  incident_date date,
  notification_date date,
  filing_date date,
  priority character varying(20) DEFAULT 'normal'::character varying,
  risk_assessment character varying(20),
  estimated_exposure numeric(15,2),
  is_active boolean DEFAULT true,
  is_confidential boolean DEFAULT false,
  requires_reserve boolean DEFAULT false,
  reserve_amount numeric(15,2),
  employee_360_snapshot jsonb,
  created_by uuid,
  assigned_to uuid,
  tags ARRAY,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  closed_at timestamp without time zone
);

-- Tabla: legal_communication_types
CREATE TABLE IF NOT EXISTS legal_communication_types (
  id character varying(50) NOT NULL,
  name character varying(255) NOT NULL,
  description text,
  category character varying(50) NOT NULL,
  severity character varying(20) NOT NULL,
  legal_basis text,
  legal_requirements text,
  requires_response boolean DEFAULT false,
  response_days integer DEFAULT 5,
  requires_witness boolean DEFAULT false,
  requires_signature boolean DEFAULT true,
  requires_notification_receipt boolean DEFAULT true,
  template_content text,
  creates_antecedent boolean DEFAULT true,
  max_before_escalation integer,
  escalation_type_id character varying(50),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: legal_communications
CREATE TABLE IF NOT EXISTS legal_communications (
  id character varying(100) NOT NULL,
  company_id integer NOT NULL,
  employee_id uuid NOT NULL,
  type_id character varying(50) NOT NULL,
  reference_number character varying(100) NOT NULL,
  subject character varying(500) NOT NULL,
  description text,
  facts_description text,
  legal_articles text,
  status character varying(50) NOT NULL DEFAULT 'draft'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  scheduled_date date,
  sent_date timestamp without time zone,
  delivery_date timestamp without time zone,
  response_deadline date,
  response_date timestamp without time zone,
  closed_date timestamp without time zone,
  employee_response text,
  employee_accepted boolean,
  witness_1_name character varying(255),
  witness_1_id character varying(50),
  witness_1_signature boolean DEFAULT false,
  witness_2_name character varying(255),
  witness_2_id character varying(50),
  witness_2_signature boolean DEFAULT false,
  pdf_path text,
  signed_pdf_path text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_locked boolean DEFAULT false,
  locked_at timestamp without time zone,
  edit_count integer DEFAULT 0,
  last_edited_by uuid,
  last_edited_at timestamp without time zone,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp without time zone,
  deleted_by uuid,
  deletion_reason text
);

-- Tabla: legal_deadlines
CREATE TABLE IF NOT EXISTS legal_deadlines (
  id integer NOT NULL DEFAULT nextval('legal_deadlines_id_seq'::regclass),
  case_id integer NOT NULL,
  stage_id integer,
  company_id integer NOT NULL,
  deadline_type character varying(50) NOT NULL,
  title character varying(500) NOT NULL,
  description text,
  due_date timestamp without time zone NOT NULL,
  reminder_date timestamp without time zone,
  alert_days_before integer DEFAULT 3,
  status character varying(20) DEFAULT 'pending'::character varying,
  completed_at timestamp without time zone,
  completed_by uuid,
  priority character varying(20) DEFAULT 'normal'::character varying,
  assigned_to uuid,
  notify_users ARRAY,
  notification_id integer,
  notification_group_id character varying(100),
  notifications_sent jsonb DEFAULT '[]'::jsonb,
  is_recurring boolean DEFAULT false,
  recurrence_pattern character varying(50),
  recurrence_end_date date,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: legal_document_alerts
CREATE TABLE IF NOT EXISTS legal_document_alerts (
  id integer NOT NULL DEFAULT nextval('legal_document_alerts_id_seq'::regclass),
  document_id integer,
  case_id integer,
  company_id integer,
  alert_type character varying(50) NOT NULL,
  message text NOT NULL,
  severity character varying(20) DEFAULT 'warning'::character varying,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp without time zone,
  resolved_by uuid,
  due_date date,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: legal_edit_authorizations
CREATE TABLE IF NOT EXISTS legal_edit_authorizations (
  id integer NOT NULL DEFAULT nextval('legal_edit_authorizations_id_seq'::regclass),
  company_id integer NOT NULL,
  record_id integer NOT NULL,
  record_table character varying(50) NOT NULL,
  record_type character varying(50) NOT NULL,
  requested_by uuid NOT NULL,
  requested_at timestamp without time zone DEFAULT now(),
  request_reason text NOT NULL,
  action_type character varying(20) NOT NULL,
  proposed_changes jsonb,
  priority character varying(20) DEFAULT 'normal'::character varying,
  status character varying(20) DEFAULT 'pending'::character varying,
  authorized_by uuid,
  authorized_at timestamp without time zone,
  authorization_response text,
  current_step integer DEFAULT 1,
  escalated_at timestamp without time zone,
  escalation_reason character varying(255),
  authorization_window_start timestamp without time zone,
  authorization_window_end timestamp without time zone,
  window_used boolean DEFAULT false,
  window_used_at timestamp without time zone,
  window_action_performed character varying(50),
  notification_id integer,
  notification_group_id character varying(100),
  jurisdiction_code character varying(10),
  audit_trail jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone
);

-- Tabla: medical_certificates
CREATE TABLE IF NOT EXISTS medical_certificates (
  id integer NOT NULL DEFAULT nextval('medical_certificates_id_seq'::regclass),
  company_id integer NOT NULL,
  user_id uuid NOT NULL,
  certificate_number character varying(100),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  requested_days integer NOT NULL,
  diagnosis_code character varying(50),
  diagnosis character varying(500),
  symptoms text,
  has_visited_doctor boolean DEFAULT true,
  medical_center character varying(255),
  attending_physician character varying(255),
  medical_prescription text,
  questionnaire jsonb,
  status character varying(50) DEFAULT 'pending'::character varying,
  auditor_id uuid,
  auditor_response text,
  final_diagnosis character varying(500),
  diagnosis_category character varying(100),
  doctor_observations text,
  medical_recommendations text,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  treating_physician character varying(255),
  treating_physician_license character varying(100),
  medical_institution character varying(255),
  notify_art boolean DEFAULT false,
  art_notified boolean DEFAULT false,
  art_notification_date timestamp with time zone,
  approved_days integer,
  needs_audit boolean DEFAULT false,
  is_justified boolean DEFAULT true,
  audit_date timestamp with time zone,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  last_modified_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  userId uuid,
  certificateNumber character varying(255),
  issueDate timestamp without time zone,
  startDate timestamp without time zone,
  endDate timestamp without time zone,
  requestedDays integer,
  diagnosisCode character varying(255),
  hasVisitedDoctor boolean DEFAULT false,
  medicalCenter character varying(255),
  attendingPhysician character varying(255),
  medicalPrescription text,
  auditorId uuid,
  auditorResponse text,
  finalDiagnosis text,
  diagnosisCategory character varying(255),
  doctorObservations text,
  medicalRecommendations text,
  followUpRequired boolean DEFAULT false,
  followUpDate timestamp without time zone,
  treatingPhysician character varying(255),
  treatingPhysicianLicense character varying(255),
  medicalInstitution character varying(255),
  notifyART boolean DEFAULT false,
  artNotified boolean DEFAULT false,
  artNotificationDate timestamp without time zone,
  approvedDays integer,
  needsAudit boolean DEFAULT true,
  isJustified boolean,
  auditDate timestamp without time zone,
  createdBy uuid,
  lastModifiedBy uuid,
  createdAt timestamp without time zone,
  updatedAt timestamp without time zone
);

-- Tabla: medical_communications
CREATE TABLE IF NOT EXISTS medical_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  absence_case_id uuid NOT NULL,
  sender_type character varying(20) NOT NULL,
  sender_id uuid,
  receiver_type character varying(20) NOT NULL,
  receiver_id uuid,
  message_type character varying(50) NOT NULL,
  subject character varying(255),
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  read_at timestamp without time zone,
  requires_response boolean DEFAULT false,
  response_deadline timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: medical_diagnoses
CREATE TABLE IF NOT EXISTS medical_diagnoses (
  id uuid NOT NULL,
  code character varying(255) NOT NULL,
  description text NOT NULL,
  category character varying(255),
  subcategory character varying(255),
  typicalDaysOff integer,
  minDaysOff integer,
  maxDaysOff integer,
  requiresAudit boolean DEFAULT true,
  requiresCertificate boolean DEFAULT true,
  isWorkRelated boolean DEFAULT false,
  isActive boolean DEFAULT true,
  createdBy uuid NOT NULL,
  lastModifiedBy uuid,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL
);

-- Tabla: medical_edit_authorizations
CREATE TABLE IF NOT EXISTS medical_edit_authorizations (
  id integer NOT NULL DEFAULT nextval('medical_edit_authorizations_id_seq'::regclass),
  company_id integer NOT NULL,
  record_id integer NOT NULL,
  record_type character varying(50) NOT NULL,
  requested_by uuid NOT NULL,
  requested_at timestamp with time zone DEFAULT now(),
  request_reason text NOT NULL,
  action_type character varying(20) NOT NULL,
  proposed_changes jsonb,
  priority character varying(20) DEFAULT 'normal'::character varying,
  status character varying(20) DEFAULT 'pending'::character varying,
  authorized_by uuid,
  authorized_at timestamp with time zone,
  authorization_response text,
  current_step integer DEFAULT 1,
  escalated_at timestamp with time zone,
  escalation_reason character varying(255),
  authorization_window_start timestamp with time zone,
  authorization_window_end timestamp with time zone,
  window_used boolean DEFAULT false,
  window_used_at timestamp with time zone,
  window_action_performed character varying(50),
  notification_id integer,
  notification_group_id character varying(100),
  audit_trail jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

-- Tabla: medical_exam_templates
CREATE TABLE IF NOT EXISTS medical_exam_templates (
  id integer NOT NULL DEFAULT nextval('medical_exam_templates_id_seq'::regclass),
  company_id integer,
  template_name character varying(100) NOT NULL,
  template_code character varying(20),
  exam_type character varying(50) NOT NULL,
  description text,
  required_studies jsonb DEFAULT '[]'::jsonb,
  required_documents jsonb DEFAULT '[]'::jsonb,
  validity_days integer DEFAULT 365,
  reminder_days_before integer DEFAULT 30,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: medical_record_audit_log
CREATE TABLE IF NOT EXISTS medical_record_audit_log (
  id integer NOT NULL DEFAULT nextval('medical_record_audit_log_id_seq'::regclass),
  company_id integer NOT NULL,
  record_id integer NOT NULL,
  record_type character varying(50) NOT NULL,
  action character varying(30) NOT NULL,
  action_by uuid NOT NULL,
  action_by_name character varying(255),
  action_by_role character varying(50),
  action_at timestamp with time zone DEFAULT now(),
  old_values jsonb,
  new_values jsonb,
  ip_address character varying(45),
  user_agent text,
  session_id character varying(100),
  authorization_id integer,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Tabla: medical_records
CREATE TABLE IF NOT EXISTS medical_records (
  id integer NOT NULL DEFAULT nextval('medical_records_id_seq'::regclass),
  company_id integer NOT NULL,
  employee_id uuid NOT NULL,
  record_type character varying(50) NOT NULL,
  template_id integer,
  title character varying(255) NOT NULL,
  description text,
  exam_date date NOT NULL,
  expiration_date date,
  result character varying(50),
  result_details text,
  observations text,
  restrictions jsonb DEFAULT '[]'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  completed_studies jsonb DEFAULT '[]'::jsonb,
  submitted_documents jsonb DEFAULT '[]'::jsonb,
  digital_signature character varying(64),
  signature_timestamp timestamp with time zone,
  signature_data jsonb,
  signed_by uuid,
  editable_until timestamp with time zone,
  is_locked boolean DEFAULT false,
  locked_at timestamp with time zone,
  locked_by uuid,
  locked_reason character varying(255) DEFAULT 'Ventana de edicion expirada'::character varying,
  edit_count integer DEFAULT 0,
  last_edited_by uuid,
  last_edited_at timestamp with time zone,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  deletion_reason text,
  deletion_authorized_by uuid,
  deletion_authorization_id integer,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  version integer DEFAULT 1
);

-- Tabla: medical_staff
CREATE TABLE IF NOT EXISTS medical_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  user_id uuid,
  first_name character varying(100) NOT NULL,
  last_name character varying(100) NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(50),
  license_number character varying(50) NOT NULL,
  specialty character varying(100),
  sub_specialty character varying(100),
  password_hash text,
  is_active boolean DEFAULT true,
  can_access_web boolean DEFAULT true,
  can_access_app boolean DEFAULT true,
  notification_preferences jsonb DEFAULT '{"sms": false, "push": true, "email": true}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid
);

-- Tabla: messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid NOT NULL,
  title character varying(255) NOT NULL,
  content text NOT NULL,
  type enum_messages_type DEFAULT 'notification'::enum_messages_type,
  priority enum_messages_priority DEFAULT 'normal'::enum_messages_priority,
  isRead boolean DEFAULT false,
  readAt timestamp with time zone,
  requiresBiometricConfirmation boolean DEFAULT false,
  biometricConfirmedAt timestamp with time zone,
  expiresAt timestamp with time zone,
  attachments json DEFAULT '[]'::json,
  metadata json DEFAULT '{}'::json,
  recipientId uuid NOT NULL,
  senderId uuid,
  relatedEntity character varying(255),
  relatedEntityId uuid,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL
);

-- Tabla: migration_log
CREATE TABLE IF NOT EXISTS migration_log (
  id integer NOT NULL DEFAULT nextval('migration_log_id_seq'::regclass),
  migration_name character varying(200) NOT NULL,
  executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  description text
);

-- Tabla: module_actions
CREATE TABLE IF NOT EXISTS module_actions (
  id character varying(100) NOT NULL,
  module_key character varying(50) NOT NULL,
  action_name character varying(50) NOT NULL,
  display_name character varying(100) NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: module_definitions
CREATE TABLE IF NOT EXISTS module_definitions (
  id integer NOT NULL DEFAULT nextval('module_definitions_id_seq'::regclass),
  module_key character varying(100) NOT NULL,
  module_name character varying(200) NOT NULL,
  description text,
  category character varying(50),
  icon character varying(50),
  available_actions ARRAY DEFAULT ARRAY['read'::text, 'create'::text, 'update'::text, 'delete'::text],
  available_scopes ARRAY DEFAULT ARRAY['all'::text, 'own_branch'::text, 'own_department'::text, 'own'::text, 'assigned_only'::text],
  required_dependencies ARRAY DEFAULT '{}'::text[],
  help_title character varying(200),
  help_description text,
  help_getting_started text,
  help_common_tasks jsonb DEFAULT '[]'::jsonb,
  prerequisite_data jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_premium boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: multiple_art_configurations
CREATE TABLE IF NOT EXISTS multiple_art_configurations (
  id integer NOT NULL DEFAULT nextval('multiple_art_configurations_id_seq'::regclass),
  name character varying(255) NOT NULL,
  clientCode character varying(100),
  email character varying(255) NOT NULL,
  phone character varying(50),
  emergencyContact character varying(255),
  preferredChannel enum_multiple_art_configurations_preferredChannel DEFAULT 'email'::"enum_multiple_art_configurations_preferredChannel",
  priority enum_multiple_art_configurations_priority DEFAULT 'secondary'::enum_multiple_art_configurations_priority,
  schedule text,
  isActive boolean DEFAULT true,
  notificationSettings json DEFAULT '{"enableEmergency":true,"enableRoutine":true,"responseTimeout":24,"escalationEnabled":true}'::json,
  address text,
  website character varying(255),
  notes text,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL
);

-- Tabla: notification_actions_log
CREATE TABLE IF NOT EXISTS notification_actions_log (
  id bigint NOT NULL DEFAULT nextval('notification_actions_log_id_seq'::regclass),
  notification_id uuid NOT NULL,
  thread_id uuid,
  company_id integer,
  action character varying(50) NOT NULL,
  action_by uuid,
  action_by_name character varying(255),
  action_by_role character varying(50),
  action_at timestamp without time zone DEFAULT now(),
  previous_status character varying(50),
  new_status character varying(50),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  device_type character varying(50)
);

-- Tabla: notification_ai_learning
CREATE TABLE IF NOT EXISTS notification_ai_learning (
  id integer NOT NULL DEFAULT nextval('notification_ai_learning_id_seq'::regclass),
  company_id integer,
  category character varying(100),
  module character varying(50),
  question_pattern text NOT NULL,
  question_keywords ARRAY,
  answer_content text NOT NULL,
  answer_summary character varying(500),
  learned_from_thread_id uuid,
  learned_from_notification_id uuid,
  answered_by_user_id uuid,
  answered_by_role character varying(50),
  times_suggested integer DEFAULT 0,
  times_accepted integer DEFAULT 0,
  times_rejected integer DEFAULT 0,
  confidence_score numeric(5,4) DEFAULT 0.5,
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  verified_by uuid,
  verified_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: notification_ai_suggestions
CREATE TABLE IF NOT EXISTS notification_ai_suggestions (
  id integer NOT NULL DEFAULT nextval('notification_ai_suggestions_id_seq'::regclass),
  trigger_message_id uuid NOT NULL,
  group_id uuid NOT NULL,
  company_id integer NOT NULL,
  recipient_id character varying(100),
  suggestion_type character varying(50) NOT NULL,
  suggested_response text NOT NULL,
  confidence numeric(5,4) NOT NULL,
  source_type character varying(50),
  source_id integer,
  source_thread_id uuid,
  explanation text,
  status character varying(20) DEFAULT 'pending'::character varying,
  user_response text,
  feedback_rating integer,
  feedback_comment text,
  auto_applied boolean DEFAULT false,
  applied_at timestamp without time zone,
  applied_message_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone,
  responded_at timestamp without time zone
);

-- Tabla: notification_audit_log
CREATE TABLE IF NOT EXISTS notification_audit_log (
  id bigint NOT NULL DEFAULT nextval('notification_audit_log_id_seq'::regclass),
  group_id uuid NOT NULL,
  message_id uuid,
  action character varying(50) NOT NULL,
  actor_type character varying(20),
  actor_id character varying(100),
  timestamp timestamp without time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  metadata jsonb
);

-- Tabla: notification_context_data
CREATE TABLE IF NOT EXISTS notification_context_data (
  id integer NOT NULL DEFAULT nextval('notification_context_data_id_seq'::regclass),
  notification_message_id uuid NOT NULL,
  context_type character varying(50) NOT NULL,
  context_data jsonb NOT NULL,
  severity character varying(20),
  display_as character varying(20),
  display_message text,
  icon character varying(10),
  calculated_at timestamp without time zone DEFAULT now()
);

-- Tabla: notification_escalations
CREATE TABLE IF NOT EXISTS notification_escalations (
  id integer NOT NULL DEFAULT nextval('notification_escalations_id_seq'::regclass),
  message_id uuid,
  original_deadline timestamp without time zone NOT NULL,
  escalation_level integer DEFAULT 1,
  escalated_to character varying(100),
  escalated_at timestamp without time zone DEFAULT now(),
  reason text
);

-- Tabla: notification_faq_patterns
CREATE TABLE IF NOT EXISTS notification_faq_patterns (
  id integer NOT NULL DEFAULT nextval('notification_faq_patterns_id_seq'::regclass),
  pattern_name character varying(200) NOT NULL,
  pattern_description text,
  category character varying(100) NOT NULL,
  regex_pattern text,
  keyword_patterns ARRAY,
  semantic_pattern text,
  standard_response text,
  response_variables jsonb DEFAULT '{}'::jsonb,
  auto_respond boolean DEFAULT false,
  require_confirmation boolean DEFAULT true,
  notify_original_recipient boolean DEFAULT true,
  times_matched integer DEFAULT 0,
  last_matched_at timestamp without time zone,
  is_active boolean DEFAULT true,
  company_id integer,
  created_by character varying(100),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: notification_flow_templates
CREATE TABLE IF NOT EXISTS notification_flow_templates (
  id integer NOT NULL DEFAULT nextval('notification_flow_templates_id_seq'::regclass),
  request_type_code character varying(50) NOT NULL,
  flow_name character varying(100) NOT NULL,
  description text,
  flow_steps jsonb NOT NULL,
  optional_modules jsonb,
  active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: notification_groups
CREATE TABLE IF NOT EXISTS notification_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_type character varying(50) NOT NULL,
  initiator_type character varying(20) NOT NULL,
  initiator_id character varying(100) NOT NULL,
  subject character varying(255) NOT NULL,
  status character varying(20) DEFAULT 'open'::character varying,
  priority character varying(10) DEFAULT 'normal'::character varying,
  company_id integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  closed_at timestamp without time zone,
  closed_by character varying(100),
  metadata jsonb,
  requires_sla boolean DEFAULT true,
  default_sla_hours integer DEFAULT 24,
  auto_escalate boolean DEFAULT true,
  escalation_chain jsonb DEFAULT '["supervisor", "rrhh", "gerencia"]'::jsonb,
  total_escalations integer DEFAULT 0,
  last_activity_at timestamp without time zone,
  ai_last_analyzed_at timestamp without time zone,
  ai_resolution_status character varying(50) DEFAULT 'unknown'::character varying,
  ai_detected_topic character varying(100),
  ai_summary text
);

-- Tabla: notification_learned_responses
CREATE TABLE IF NOT EXISTS notification_learned_responses (
  id integer NOT NULL DEFAULT nextval('notification_learned_responses_id_seq'::regclass),
  category character varying(100) NOT NULL,
  subcategory character varying(100),
  department character varying(100),
  question_pattern text NOT NULL,
  question_keywords ARRAY,
  answer_content text NOT NULL,
  answer_summary character varying(500),
  answer_metadata jsonb DEFAULT '{}'::jsonb,
  source_message_id uuid,
  source_group_id uuid,
  learned_from_employee_id character varying(100),
  answered_by_employee_id character varying(100),
  answered_by_role character varying(50),
  valid_from date,
  valid_until date,
  is_temporal boolean DEFAULT false,
  times_suggested integer DEFAULT 0,
  times_accepted integer DEFAULT 0,
  times_rejected integer DEFAULT 0,
  confidence_score numeric(5,4) DEFAULT 0.5,
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  verified_by character varying(100),
  verified_at timestamp without time zone,
  company_id integer,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: notification_messages
CREATE TABLE IF NOT EXISTS notification_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  sequence_number integer NOT NULL,
  sender_type character varying(20) NOT NULL,
  sender_id character varying(100) NOT NULL,
  sender_name character varying(255),
  recipient_type character varying(20) NOT NULL,
  recipient_id character varying(100) NOT NULL,
  recipient_name character varying(255),
  message_type character varying(30) NOT NULL,
  subject character varying(255),
  content text NOT NULL,
  content_encrypted text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  deadline_at timestamp without time zone,
  requires_response boolean DEFAULT false,
  delivered_at timestamp without time zone,
  read_at timestamp without time zone,
  responded_at timestamp without time zone,
  message_hash character varying(64) NOT NULL,
  hash_algorithm character varying(20) DEFAULT 'SHA-256'::character varying,
  channels jsonb DEFAULT '["web"]'::jsonb,
  channel_status jsonb,
  attachments jsonb,
  is_deleted boolean DEFAULT false,
  company_id integer NOT NULL,
  sla_response_hours integer DEFAULT 24,
  sla_breach boolean DEFAULT false,
  sla_breach_at timestamp without time zone,
  sender_notified_at timestamp without time zone,
  sender_notified_response boolean DEFAULT false,
  recipient_notified_at timestamp without time zone,
  escalation_status character varying(20) DEFAULT 'none'::character varying,
  escalation_level integer DEFAULT 0,
  escalated_to_id character varying(100),
  escalated_at timestamp without time zone,
  impact_on_evaluation boolean DEFAULT false,
  evaluation_score_impact numeric(5,2) DEFAULT 0,
  discharge_reason text,
  discharge_at timestamp without time zone,
  discharge_accepted boolean,
  ai_analyzed boolean DEFAULT false,
  ai_analyzed_at timestamp without time zone,
  ai_suggested_response_id integer,
  ai_auto_generated boolean DEFAULT false,
  ai_confidence numeric(5,4),
  ai_source_type character varying(50)
);

-- Tabla: notification_participant_types
CREATE TABLE IF NOT EXISTS notification_participant_types (
  id integer NOT NULL DEFAULT nextval('notification_participant_types_id_seq'::regclass),
  type_code character varying(30) NOT NULL,
  name character varying(100) NOT NULL,
  description text,
  requires_action boolean DEFAULT false,
  is_decisor boolean DEFAULT false,
  is_informative boolean DEFAULT false,
  can_forward boolean DEFAULT false,
  creates_deadline boolean DEFAULT true
);

-- Tabla: notification_queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id character varying(255) NOT NULL,
  company_id character varying(50) NOT NULL,
  notification_id character varying(255) NOT NULL,
  channel enum_notification_queue_channel NOT NULL,
  status enum_notification_queue_status DEFAULT 'pending'::enum_notification_queue_status,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  scheduled_at timestamp with time zone,
  processed_at timestamp with time zone,
  error_message text
);

-- Tabla: notification_sla_config
CREATE TABLE IF NOT EXISTS notification_sla_config (
  id integer NOT NULL DEFAULT nextval('notification_sla_config_id_seq'::regclass),
  company_id integer NOT NULL,
  notification_type character varying(50) NOT NULL,
  sla_hours integer DEFAULT 24,
  warning_hours integer DEFAULT 4,
  escalation_enabled boolean DEFAULT true,
  escalation_chain jsonb DEFAULT '["supervisor", "rrhh"]'::jsonb,
  evaluation_impact numeric(5,2) DEFAULT '-2.00'::numeric,
  active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: notification_sla_records
CREATE TABLE IF NOT EXISTS notification_sla_records (
  id integer NOT NULL DEFAULT nextval('notification_sla_records_id_seq'::regclass),
  message_id uuid,
  employee_id character varying(100) NOT NULL,
  company_id integer NOT NULL,
  sla_type character varying(50) NOT NULL,
  expected_response_at timestamp without time zone NOT NULL,
  actual_response_at timestamp without time zone,
  sla_met boolean,
  breach_minutes integer,
  escalation_triggered boolean DEFAULT false,
  escalation_level integer DEFAULT 0,
  evaluation_impact numeric(5,2) DEFAULT 0,
  discharge_filed boolean DEFAULT false,
  discharge_reason text,
  discharge_verdict character varying(20),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: notification_templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id integer NOT NULL DEFAULT nextval('notification_templates_id_seq'::regclass),
  company_id integer,
  template_key character varying(100) NOT NULL,
  template_name character varying(255) NOT NULL,
  module character varying(50) NOT NULL,
  category character varying(50) DEFAULT 'general'::character varying,
  title_template character varying(255),
  message_template text,
  short_message_template character varying(280),
  available_variables jsonb DEFAULT '[]'::jsonb,
  default_priority character varying(20) DEFAULT 'medium'::character varying,
  default_channels jsonb DEFAULT '["app"]'::jsonb,
  requires_action boolean DEFAULT false,
  default_action_type character varying(50),
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  email_template text,
  default_send_email boolean DEFAULT false,
  default_send_whatsapp boolean DEFAULT false,
  default_send_sms boolean DEFAULT false
);

-- Tabla: notification_thread_analysis
CREATE TABLE IF NOT EXISTS notification_thread_analysis (
  id integer NOT NULL DEFAULT nextval('notification_thread_analysis_id_seq'::regclass),
  group_id uuid NOT NULL,
  company_id integer NOT NULL,
  thread_summary text,
  detected_intent character varying(100),
  detected_topic character varying(100),
  detected_urgency character varying(20),
  detected_sentiment character varying(20),
  is_resolved boolean DEFAULT false,
  resolution_message_id uuid,
  resolution_summary text,
  has_anomalies boolean DEFAULT false,
  anomalies jsonb DEFAULT '[]'::jsonb,
  pending_suggestions jsonb DEFAULT '[]'::jsonb,
  last_analyzed_at timestamp without time zone DEFAULT now(),
  last_message_analyzed_id uuid,
  analysis_version integer DEFAULT 1,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: notification_threads
CREATE TABLE IF NOT EXISTS notification_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer,
  subject character varying(255) NOT NULL,
  category character varying(50) NOT NULL,
  module character varying(50),
  thread_type character varying(50) NOT NULL,
  initiator_type character varying(50),
  initiator_id character varying(100),
  initiator_name character varying(255),
  participants jsonb DEFAULT '[]'::jsonb,
  status character varying(50) DEFAULT 'open'::character varying,
  priority character varying(20) DEFAULT 'medium'::character varying,
  message_count integer DEFAULT 0,
  unread_count integer DEFAULT 0,
  current_workflow_step integer DEFAULT 0,
  workflow_id integer,
  sla_deadline timestamp without time zone,
  sla_breached boolean DEFAULT false,
  ai_summary text,
  ai_topic character varying(100),
  ai_resolution_status character varying(50),
  last_message_at timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  closed_at timestamp without time zone,
  closed_by uuid
);

-- Tabla: notification_workflows
CREATE TABLE IF NOT EXISTS notification_workflows (
  id integer NOT NULL DEFAULT nextval('notification_workflows_id_seq'::regclass),
  company_id integer,
  workflow_key character varying(100) NOT NULL,
  workflow_name character varying(255) NOT NULL,
  module character varying(50) NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  activation_conditions jsonb DEFAULT '{}'::jsonb,
  on_approval_actions jsonb DEFAULT '[]'::jsonb,
  on_rejection_actions jsonb DEFAULT '[]'::jsonb,
  on_timeout_actions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: notifications
CREATE TABLE IF NOT EXISTS notifications (
  id bigint NOT NULL DEFAULT nextval('notifications_id_seq'::regclass),
  uuid uuid DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  module character varying(50) NOT NULL,
  category character varying(50) NOT NULL DEFAULT 'info'::character varying,
  notification_type character varying(100) NOT NULL,
  priority character varying(20) NOT NULL DEFAULT 'medium'::character varying,
  recipient_user_id uuid,
  recipient_role character varying(50),
  recipient_department_id integer,
  recipient_shift_id uuid,
  recipient_custom_list jsonb DEFAULT '[]'::jsonb,
  is_broadcast boolean DEFAULT false,
  title character varying(255) NOT NULL,
  message text NOT NULL,
  short_message character varying(140),
  email_body text,
  related_entity_type character varying(50),
  related_entity_id bigint,
  related_user_id uuid,
  related_department_id integer,
  related_kiosk_id integer,
  related_attendance_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  read_at timestamp without time zone,
  read_by uuid,
  requires_action boolean DEFAULT false,
  action_status character varying(50) DEFAULT 'pending'::character varying,
  action_type character varying(50),
  action_deadline timestamp without time zone,
  action_taken_at timestamp without time zone,
  action_taken_by uuid,
  action_response text,
  action_options jsonb DEFAULT '[]'::jsonb,
  escalation_level integer DEFAULT 0,
  escalated_from_notification_id bigint,
  escalated_to_notification_id bigint,
  escalation_reason character varying(255),
  sent_via_app boolean DEFAULT true,
  sent_via_email boolean DEFAULT false,
  sent_via_whatsapp boolean DEFAULT false,
  sent_via_sms boolean DEFAULT false,
  email_sent_at timestamp without time zone,
  whatsapp_sent_at timestamp without time zone,
  sms_sent_at timestamp without time zone,
  reminder_sent boolean DEFAULT false,
  reminder_sent_at timestamp without time zone,
  reminder_count integer DEFAULT 0,
  expires_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  deleted_at timestamp without time zone,
  deleted_by uuid
);

-- Tabla: notifications_enterprise
CREATE TABLE IF NOT EXISTS notifications_enterprise (
  id character varying(255) NOT NULL,
  company_id character varying(50) NOT NULL,
  notification_code character varying(200) NOT NULL,
  from_module enum_notifications_enterprise_from_module NOT NULL,
  from_user_id character varying(255),
  to_user_id character varying(255) NOT NULL,
  to_role enum_notifications_enterprise_to_role NOT NULL,
  title character varying(255) NOT NULL,
  message text NOT NULL,
  notification_type enum_notifications_enterprise_notification_type NOT NULL,
  status enum_notifications_enterprise_status DEFAULT 'pending'::enum_notifications_enterprise_status,
  priority enum_notifications_enterprise_priority DEFAULT 'medium'::enum_notifications_enterprise_priority,
  channels json,
  delivery_attempts integer DEFAULT 0,
  metadata json,
  requires_response boolean DEFAULT false,
  response_data json,
  response_at timestamp with time zone,
  read_at timestamp with time zone,
  delivered_at timestamp with time zone,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL
);

-- Tabla: oh_certification_alert_config
CREATE TABLE IF NOT EXISTS oh_certification_alert_config (
  id integer NOT NULL DEFAULT nextval('oh_certification_alert_config_id_seq'::regclass),
  company_id integer NOT NULL,
  alert_days_schedule ARRAY DEFAULT '{30,15,7,1}'::integer[],
  alerts_enabled boolean DEFAULT true,
  default_recipients ARRAY,
  notify_employee boolean DEFAULT true,
  notify_supervisor boolean DEFAULT true,
  notify_hr boolean DEFAULT true,
  hr_email character varying(200),
  send_time time without time zone DEFAULT '09:00:00'::time without time zone,
  timezone character varying(50) DEFAULT 'America/Buenos_Aires'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  last_updated_at timestamp with time zone DEFAULT now(),
  last_updated_by character varying(100)
);

-- Tabla: oh_certification_alerts
CREATE TABLE IF NOT EXISTS oh_certification_alerts (
  id integer NOT NULL DEFAULT nextval('oh_certification_alerts_id_seq'::regclass),
  certification_id integer NOT NULL,
  company_id integer NOT NULL,
  employee_id character varying(50) NOT NULL,
  alert_type character varying(50) NOT NULL,
  days_until_expiration integer NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  sent_to character varying(500) NOT NULL,
  sent_via character varying(50) DEFAULT 'email'::character varying,
  status character varying(50) DEFAULT 'sent'::character varying,
  subject text,
  message_body text,
  send_response jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla: oh_certification_types
CREATE TABLE IF NOT EXISTS oh_certification_types (
  id integer NOT NULL DEFAULT nextval('oh_certification_types_id_seq'::regclass),
  type_code character varying(100) NOT NULL,
  name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  description_i18n jsonb DEFAULT '{}'::jsonb,
  category character varying(50) NOT NULL,
  default_alert_days integer DEFAULT 30,
  is_mandatory boolean DEFAULT false,
  requires_renewal boolean DEFAULT true,
  standard_validity_months integer DEFAULT 12,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  last_updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: oh_claim_documents
CREATE TABLE IF NOT EXISTS oh_claim_documents (
  id integer NOT NULL DEFAULT nextval('oh_claim_documents_id_seq'::regclass),
  claim_id integer NOT NULL,
  document_type character varying(100) NOT NULL,
  file_name character varying(500) NOT NULL,
  file_path character varying(1000) NOT NULL,
  file_size integer,
  file_type character varying(100),
  uploaded_by character varying(200),
  upload_date timestamp with time zone DEFAULT now(),
  description text,
  is_required boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verified_by character varying(200),
  verified_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla: oh_claim_status_history
CREATE TABLE IF NOT EXISTS oh_claim_status_history (
  id integer NOT NULL DEFAULT nextval('oh_claim_status_history_id_seq'::regclass),
  claim_id integer NOT NULL,
  previous_status character varying(50),
  new_status character varying(50) NOT NULL,
  changed_by character varying(200) NOT NULL,
  change_reason text,
  notes text,
  changed_at timestamp with time zone DEFAULT now()
);

-- Tabla: oh_claim_types
CREATE TABLE IF NOT EXISTS oh_claim_types (
  id integer NOT NULL DEFAULT nextval('oh_claim_types_id_seq'::regclass),
  region character varying(10) NOT NULL,
  type_code character varying(50) NOT NULL,
  name_i18n jsonb NOT NULL,
  description_i18n jsonb,
  severity_level character varying(20),
  requires_medical_report boolean DEFAULT true,
  requires_witness_statement boolean DEFAULT false,
  requires_employer_report boolean DEFAULT true,
  typical_recovery_days integer,
  legal_deadline_days integer,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: oh_employee_certifications
CREATE TABLE IF NOT EXISTS oh_employee_certifications (
  id integer NOT NULL DEFAULT nextval('oh_employee_certifications_id_seq'::regclass),
  company_id integer NOT NULL,
  employee_id character varying(50) NOT NULL,
  employee_name character varying(200),
  employee_email character varying(200),
  department character varying(100),
  certification_type_id integer NOT NULL,
  certification_number character varying(200),
  issue_date date NOT NULL,
  expiration_date date NOT NULL,
  alert_days_before integer DEFAULT 30,
  last_alert_sent_at timestamp with time zone,
  alert_count integer DEFAULT 0,
  status character varying(50) NOT NULL DEFAULT 'active'::character varying,
  issuing_authority character varying(200),
  issuing_country character varying(10),
  document_path text,
  document_filename character varying(500),
  document_size bigint,
  document_type character varying(100),
  renewed_by_certification_id integer,
  is_renewal_of_certification_id integer,
  notes text,
  created_by character varying(100),
  created_at timestamp with time zone DEFAULT now(),
  last_updated_at timestamp with time zone DEFAULT now(),
  last_updated_by character varying(100),
  deleted_at timestamp with time zone
);

-- Tabla: oh_pre_employment_screenings
CREATE TABLE IF NOT EXISTS oh_pre_employment_screenings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  candidate_first_name character varying(255) NOT NULL,
  candidate_last_name character varying(255) NOT NULL,
  candidate_email character varying(255),
  candidate_phone character varying(50),
  candidate_id_number character varying(100),
  candidate_date_of_birth date,
  candidate_gender character varying(20),
  position_title character varying(255) NOT NULL,
  department character varying(255),
  position_level character varying(100),
  job_category character varying(100),
  expected_start_date date,
  screening_type_id integer,
  screening_type_code character varying(100),
  scheduled_date timestamp without time zone,
  completed_date timestamp without time zone,
  country_code character varying(2) NOT NULL,
  location_address text,
  location_city character varying(255),
  location_state character varying(100),
  location_postal_code character varying(20),
  provider_name character varying(255),
  provider_license_number character varying(100),
  physician_name character varying(255),
  physician_license_number character varying(100),
  overall_result character varying(50),
  result_summary text,
  result_details jsonb,
  has_restrictions boolean DEFAULT false,
  restrictions_description text,
  requires_accommodations boolean DEFAULT false,
  accommodations_description text,
  accommodation_cost_estimate numeric(10,2),
  requires_follow_up boolean DEFAULT false,
  follow_up_date date,
  follow_up_reason text,
  follow_up_completed boolean DEFAULT false,
  has_documents boolean DEFAULT false,
  documents_count integer DEFAULT 0,
  valid_from date,
  valid_until date,
  screening_cost_usd numeric(10,2),
  paid_by character varying(50) DEFAULT 'company'::character varying,
  payment_status character varying(50) DEFAULT 'pending'::character varying,
  status character varying(50) DEFAULT 'scheduled'::character varying,
  workflow_stage character varying(100),
  reviewed_by character varying(255),
  reviewed_at timestamp without time zone,
  review_notes text,
  approved_for_hiring boolean,
  approval_date timestamp without time zone,
  approved_by character varying(255),
  rejection_reason text,
  candidate_notified boolean DEFAULT false,
  candidate_notified_at timestamp without time zone,
  hr_notified boolean DEFAULT false,
  hr_notified_at timestamp without time zone,
  consent_signed boolean DEFAULT false,
  consent_signed_at timestamp without time zone,
  consent_document_url text,
  hipaa_compliant boolean DEFAULT true,
  gdpr_compliant boolean DEFAULT true,
  lgpd_compliant boolean DEFAULT true,
  metadata jsonb,
  tags ARRAY,
  created_by character varying(255),
  updated_by character varying(255),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone
);

-- Tabla: oh_screening_config
CREATE TABLE IF NOT EXISTS oh_screening_config (
  id integer NOT NULL DEFAULT nextval('oh_screening_config_id_seq'::regclass),
  company_id integer NOT NULL,
  country_code character varying(2) NOT NULL,
  required_screening_types ARRAY DEFAULT ARRAY[]::integer[],
  default_validity_days integer DEFAULT 365,
  require_renewal boolean DEFAULT true,
  renewal_reminder_days integer DEFAULT 30,
  requires_hr_approval boolean DEFAULT true,
  requires_medical_approval boolean DEFAULT false,
  requires_manager_approval boolean DEFAULT false,
  auto_approve_pass_results boolean DEFAULT false,
  company_pays boolean DEFAULT true,
  max_reimbursement_usd numeric(10,2),
  preferred_providers ARRAY,
  blacklisted_providers ARRAY,
  notify_candidate_on_schedule boolean DEFAULT true,
  notify_candidate_on_results boolean DEFAULT true,
  notify_hr_on_results boolean DEFAULT true,
  notification_template_id integer,
  require_consent_form boolean DEFAULT true,
  consent_template_url text,
  data_retention_days integer DEFAULT 2555,
  config_data jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by character varying(255),
  updated_by character varying(255),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: oh_screening_documents
CREATE TABLE IF NOT EXISTS oh_screening_documents (
  id integer NOT NULL DEFAULT nextval('oh_screening_documents_id_seq'::regclass),
  screening_id uuid NOT NULL,
  company_id integer NOT NULL,
  document_type character varying(100) NOT NULL,
  document_name character varying(255) NOT NULL,
  file_name character varying(255) NOT NULL,
  file_path text NOT NULL,
  file_size_bytes bigint,
  mime_type character varying(100),
  document_date date,
  issued_by character varying(255),
  language character varying(10),
  is_confidential boolean DEFAULT true,
  requires_physician_review boolean DEFAULT false,
  viewed_by ARRAY,
  view_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  verified_by character varying(255),
  verified_at timestamp without time zone,
  status character varying(50) DEFAULT 'active'::character varying,
  uploaded_by character varying(255),
  uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone
);

-- Tabla: oh_screening_results
CREATE TABLE IF NOT EXISTS oh_screening_results (
  id integer NOT NULL DEFAULT nextval('oh_screening_results_id_seq'::regclass),
  screening_id uuid NOT NULL,
  company_id integer NOT NULL,
  test_category character varying(100) NOT NULL,
  test_name character varying(255) NOT NULL,
  test_code character varying(100),
  result_value character varying(500),
  result_unit character varying(50),
  result_status character varying(50),
  reference_range character varying(255),
  interpretation text,
  is_within_normal boolean,
  requires_attention boolean DEFAULT false,
  clinical_significance character varying(100),
  result_data jsonb,
  notes text,
  tested_at timestamp without time zone,
  reported_at timestamp without time zone,
  reviewed_by character varying(255),
  reviewed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: oh_screening_types
CREATE TABLE IF NOT EXISTS oh_screening_types (
  id integer NOT NULL DEFAULT nextval('oh_screening_types_id_seq'::regclass),
  code character varying(100) NOT NULL,
  name_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
  description_i18n jsonb DEFAULT '{}'::jsonb,
  category character varying(50) NOT NULL,
  country_codes ARRAY DEFAULT ARRAY['*'::text],
  region character varying(50),
  is_mandatory boolean DEFAULT false,
  required_for_roles ARRAY,
  requires_physician boolean DEFAULT false,
  requires_lab boolean DEFAULT false,
  validity_days integer,
  renewal_reminder_days integer DEFAULT 30,
  result_types jsonb DEFAULT '["pass", "fail", "conditional"]'::jsonb,
  pass_criteria jsonb,
  estimated_cost_usd numeric(10,2),
  estimated_duration_minutes integer,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_by character varying(255),
  updated_by character varying(255),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp without time zone
);

-- Tabla: oh_workers_compensation_claims
CREATE TABLE IF NOT EXISTS oh_workers_compensation_claims (
  id integer NOT NULL DEFAULT nextval('oh_workers_compensation_claims_id_seq'::regclass),
  company_id integer NOT NULL,
  employee_id character varying(50) NOT NULL,
  claim_number character varying(100) NOT NULL,
  incident_date date NOT NULL,
  incident_time time without time zone,
  incident_location text,
  department character varying(100),
  supervisor_name character varying(200),
  claim_type_id integer NOT NULL,
  country_code character varying(10) NOT NULL,
  injury_description text NOT NULL,
  body_part_affected character varying(100),
  injury_cause text,
  witnesses text,
  status character varying(50) NOT NULL DEFAULT 'reported'::character varying,
  medical_treatment_required boolean DEFAULT false,
  medical_facility_name character varying(200),
  treating_physician character varying(200),
  first_aid_provided boolean DEFAULT false,
  first_aid_description text,
  hospitalization_required boolean DEFAULT false,
  work_days_lost integer DEFAULT 0,
  estimated_return_date date,
  actual_return_date date,
  art_company_name character varying(200),
  art_policy_number character varying(100),
  art_claim_number character varying(100),
  art_case_manager character varying(200),
  art_case_manager_phone character varying(50),
  art_case_manager_email character varying(200),
  osha_recordable boolean DEFAULT false,
  osha_classification character varying(50),
  reported_to_authority boolean DEFAULT false,
  authority_reference_number character varying(100),
  reported_to_authority_date date,
  estimated_cost_medical numeric(10,2),
  estimated_cost_compensation numeric(10,2),
  actual_cost_medical numeric(10,2),
  actual_cost_compensation numeric(10,2),
  preventive_measures_taken text,
  similar_incidents_count integer DEFAULT 0,
  case_notes text,
  resolution_notes text,
  closed_date date,
  closed_by character varying(200),
  documents_count integer DEFAULT 0,
  reported_by character varying(200),
  reported_date timestamp with time zone DEFAULT now(),
  last_updated_by character varying(200),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);

-- Tabla: organizational_positions
CREATE TABLE IF NOT EXISTS organizational_positions (
  id integer NOT NULL DEFAULT nextval('organizational_positions_id_seq'::regclass),
  company_id integer NOT NULL,
  position_code character varying(30) NOT NULL,
  position_name character varying(100) NOT NULL,
  description text,
  parent_position_id integer,
  level_order integer DEFAULT 1,
  salary_category_id integer,
  payslip_template_id integer,
  payroll_template_id integer,
  department_id integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  work_environment character varying(50) DEFAULT 'oficina'::character varying,
  physical_demand_level integer DEFAULT 1,
  work_category character varying(50) DEFAULT 'administrativo'::character varying,
  cognitive_demand_level integer DEFAULT 3,
  risk_exposure_level integer DEFAULT 1,
  international_code_ciuo character varying(10),
  international_code_srt character varying(20),
  applies_accident_risk boolean DEFAULT true,
  applies_fatigue_index boolean DEFAULT true,
  custom_risk_weights jsonb,
  custom_thresholds jsonb
);

-- Tabla: partner_commission_summaries
CREATE TABLE IF NOT EXISTS partner_commission_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  total_cases integer NOT NULL DEFAULT 0,
  total_billable numeric(12,2) NOT NULL DEFAULT 0,
  total_commission numeric(12,2) NOT NULL DEFAULT 0,
  total_net numeric(12,2) NOT NULL DEFAULT 0,
  pending_amount numeric(12,2) NOT NULL DEFAULT 0,
  invoiced_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  status character varying(20) NOT NULL DEFAULT 'open'::character varying,
  closed_at timestamp with time zone,
  settled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabla: partner_commission_transactions
CREATE TABLE IF NOT EXISTS partner_commission_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  partner_commission_id uuid,
  reference_type character varying(50) NOT NULL,
  reference_id uuid NOT NULL,
  company_id integer,
  billable_amount numeric(12,2) NOT NULL DEFAULT 0,
  commission_percentage numeric(5,2) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  net_amount numeric(12,2) NOT NULL,
  status character varying(20) NOT NULL DEFAULT 'pending'::character varying,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  invoiced_at timestamp with time zone,
  paid_at timestamp with time zone,
  invoice_number character varying(50),
  payment_reference character varying(100),
  payment_method character varying(30),
  description text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabla: partner_commissions
CREATE TABLE IF NOT EXISTS partner_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  commission_type character varying(30) NOT NULL DEFAULT 'percentage'::character varying,
  percentage numeric(5,2) DEFAULT 15.00,
  fixed_amount numeric(10,2) DEFAULT 0,
  tiered_config jsonb,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabla: partner_roles
CREATE TABLE IF NOT EXISTS partner_roles (
  id integer NOT NULL DEFAULT nextval('partner_roles_id_seq'::regclass),
  role_name character varying(100) NOT NULL,
  category character varying(50) NOT NULL,
  description text,
  requires_license boolean DEFAULT false,
  requires_insurance boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL
);

-- Tabla: partners
CREATE TABLE IF NOT EXISTS partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name character varying(100) NOT NULL,
  last_name character varying(100) NOT NULL,
  dni character varying(20) NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(20),
  partner_role_id uuid,
  approval_status character varying(20) DEFAULT 'pending'::character varying,
  approved_by uuid,
  approved_at timestamp without time zone,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  username character varying(50),
  password character varying(255),
  first_login boolean DEFAULT true,
  last_login_at timestamp without time zone,
  password_changed_at timestamp without time zone,
  face_image_url character varying(500),
  face_descriptor text,
  face_registered_at timestamp without time zone,
  fingerprint_data text,
  biometric_enabled boolean DEFAULT false,
  denial_reason text,
  approval_notes text,
  email_verified boolean DEFAULT false,
  email_verified_at timestamp without time zone,
  pending_consents ARRAY DEFAULT '{}'::uuid[],
  verification_pending boolean NOT NULL DEFAULT true,
  account_status partner_account_status NOT NULL DEFAULT 'pending_verification'::partner_account_status,
  specialty character varying(100),
  license_number character varying(50),
  is_medical_staff boolean DEFAULT false,
  password_hash character varying(255),
  mobile character varying(20),
  profile_photo_url text,
  bio text,
  languages jsonb,
  professional_licenses jsonb,
  education jsonb,
  certifications jsonb,
  experience_years integer,
  specialties jsonb,
  contract_type character varying(50) DEFAULT 'per_service'::character varying,
  commission_calculation character varying(50) DEFAULT 'per_module_user'::character varying,
  commission_percentage numeric(5,2),
  fixed_monthly_rate numeric(10,2),
  fixed_per_employee_rate numeric(10,2),
  city character varying(100),
  province character varying(100),
  country character varying(100),
  service_area jsonb,
  rating numeric(3,2) DEFAULT 0,
  total_reviews integer DEFAULT 0,
  total_services integer DEFAULT 0,
  status character varying(20) DEFAULT 'pending'::character varying
);

-- Tabla: password_auth_attempts
CREATE TABLE IF NOT EXISTS password_auth_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid,
  company_id integer NOT NULL,
  kiosk_id integer,
  password_valid boolean,
  facial_similarity numeric,
  security_photo bytea,
  success boolean,
  requires_hr_review boolean DEFAULT false,
  timestamp timestamp without time zone DEFAULT now(),
  device_id character varying(255),
  ip_address character varying(50),
  notes text,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: payments
CREATE TABLE IF NOT EXISTS payments (
  id bigint NOT NULL DEFAULT nextval('payments_id_seq'::regclass),
  invoice_id bigint NOT NULL,
  company_id integer NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency character varying(3) NOT NULL DEFAULT 'USD'::character varying,
  payment_method character varying(50),
  payment_reference character varying(255),
  payment_date date NOT NULL,
  receipt_file_path text,
  receipt_file_name character varying(255),
  notes text,
  registered_by uuid NOT NULL,
  registered_at timestamp with time zone,
  commissions_generated boolean DEFAULT false,
  commissions_generated_at timestamp with time zone,
  created_at timestamp with time zone
);

-- Tabla: payroll_concept_classifications
CREATE TABLE IF NOT EXISTS payroll_concept_classifications (
  id integer NOT NULL DEFAULT nextval('payroll_concept_classifications_id_seq'::regclass),
  classification_code character varying(30) NOT NULL,
  classification_name character varying(100) NOT NULL,
  descriptions jsonb DEFAULT '{}'::jsonb,
  sign integer NOT NULL,
  affects_employee_net boolean NOT NULL DEFAULT false,
  affects_employer_cost boolean NOT NULL DEFAULT false,
  calculation_order integer NOT NULL DEFAULT 0,
  is_system boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: payroll_concept_type_rates
CREATE TABLE IF NOT EXISTS payroll_concept_type_rates (
  id integer NOT NULL DEFAULT nextval('payroll_concept_type_rates_id_seq'::regclass),
  concept_type_id integer NOT NULL,
  country_id integer,
  employee_rate numeric(8,4) NOT NULL DEFAULT 0,
  employer_rate numeric(8,4) NOT NULL DEFAULT 0,
  rate_ceiling numeric(15,2),
  rate_floor numeric(15,2),
  calculation_base character varying(30) DEFAULT 'GROSS'::character varying,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  legal_reference text,
  legal_url character varying(500),
  help_text text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: payroll_concept_types
CREATE TABLE IF NOT EXISTS payroll_concept_types (
  id integer NOT NULL DEFAULT nextval('payroll_concept_types_id_seq'::regclass),
  type_code character varying(30) NOT NULL,
  type_name character varying(100) NOT NULL,
  description text,
  affects_gross boolean DEFAULT true,
  affects_net boolean DEFAULT true,
  is_taxable boolean DEFAULT true,
  is_deduction boolean DEFAULT false,
  is_employer_cost boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  country_id integer,
  company_id integer,
  classification_id integer,
  is_remunerative boolean DEFAULT true,
  is_pre_tax boolean DEFAULT false,
  is_mandatory boolean DEFAULT false,
  is_social_security_base boolean DEFAULT true,
  is_proportional_to_time boolean DEFAULT true,
  is_one_time boolean DEFAULT false,
  default_employee_rate numeric(8,4) DEFAULT 0,
  default_employer_rate numeric(8,4) DEFAULT 0,
  rate_ceiling numeric(15,2),
  calculation_base_type character varying(30) DEFAULT 'GROSS'::character varying,
  help_tooltip character varying(200),
  help_detailed text,
  legal_reference text,
  examples_by_country jsonb DEFAULT '{}'::jsonb,
  icon_name character varying(50),
  color_hex character varying(7),
  names_by_locale jsonb DEFAULT '{}'::jsonb
);

-- Tabla: payroll_countries
CREATE TABLE IF NOT EXISTS payroll_countries (
  id integer NOT NULL DEFAULT nextval('payroll_countries_id_seq'::regclass),
  country_code character varying(3) NOT NULL,
  country_name character varying(100) NOT NULL,
  currency_code character varying(3) NOT NULL,
  currency_symbol character varying(10) DEFAULT '$'::character varying,
  decimal_places integer DEFAULT 2,
  thousand_separator character varying(1) DEFAULT '.'::character varying,
  decimal_separator character varying(1) DEFAULT ','::character varying,
  labor_law_name character varying(200),
  labor_law_reference character varying(500),
  collective_agreement_name character varying(100) DEFAULT 'Convenio Colectivo de Trabajo'::character varying,
  default_pay_frequency character varying(20) DEFAULT 'monthly'::character varying,
  fiscal_year_start_month integer DEFAULT 1,
  aguinaldo_enabled boolean DEFAULT false,
  aguinaldo_frequency character varying(20) DEFAULT 'biannual'::character varying,
  vacation_calculation_method character varying(50) DEFAULT 'calendar_days'::character varying,
  tax_id_name character varying(50) DEFAULT 'CUIL'::character varying,
  tax_id_format character varying(100),
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  privacy_law_name character varying(100),
  privacy_law_full_name character varying(255),
  privacy_law_url character varying(500),
  privacy_authority_name character varying(255),
  privacy_authority_url character varying(500),
  privacy_authority_email character varying(255),
  requires_explicit_consent boolean DEFAULT true,
  biometric_data_retention_days integer DEFAULT 90,
  emotional_data_retention_days integer DEFAULT 30,
  audit_log_retention_years integer DEFAULT 5,
  allows_automated_decisions boolean DEFAULT false,
  requires_dpo boolean DEFAULT false,
  min_age_consent integer DEFAULT 18,
  allows_employer_monitoring boolean DEFAULT true,
  requires_works_council_approval boolean DEFAULT false,
  data_subject_rights jsonb DEFAULT '[]'::jsonb,
  legal_bases_allowed jsonb DEFAULT '[]'::jsonb,
  consent_intro_text text,
  consent_biometric_text text,
  consent_emotional_text text,
  consent_rights_text text,
  consent_revocation_text text,
  consent_footer_text text,
  breach_notification_hours integer DEFAULT 72,
  consent_expiry_warning_days integer DEFAULT 30,
  requires_dpia_biometric boolean DEFAULT true,
  dpia_template_url character varying(500),
  max_penalty_description character varying(500),
  penalty_currency character varying(10),
  max_penalty_amount numeric(15,2),
  penalty_percentage_revenue numeric(5,2),
  privacy_config_version character varying(20) DEFAULT '1.0'::character varying,
  privacy_config_updated_at timestamp without time zone DEFAULT now(),
  is_gdpr_equivalent boolean DEFAULT false,
  gdpr_adequacy_decision boolean DEFAULT false,
  consent_renewal_months integer DEFAULT 24,
  privacy_law_reference character varying(255),
  privacy_law_version character varying(50),
  data_protection_authority character varying(150),
  dpa_contact_url character varying(255),
  consent_data_sharing_text text,
  rights_exercise_url character varying(255),
  rights_response_days integer DEFAULT 30,
  attendance_data_retention_years integer DEFAULT 5,
  requires_dpia boolean DEFAULT false,
  allows_biometric_for_attendance boolean DEFAULT true,
  allows_emotional_analysis boolean DEFAULT true,
  penalty_calculation_method character varying(100),
  allows_international_transfer boolean DEFAULT false,
  transfer_mechanisms jsonb DEFAULT '[]'::jsonb,
  adequate_countries jsonb DEFAULT '[]'::jsonb,
  breach_notification_authority character varying(150),
  last_privacy_review timestamp without time zone,
  next_privacy_review timestamp without time zone
);

-- Tabla: payroll_entities
CREATE TABLE IF NOT EXISTS payroll_entities (
  entity_id integer NOT NULL DEFAULT nextval('payroll_entities_entity_id_seq'::regclass),
  company_id integer,
  country_id integer,
  entity_code character varying(30) NOT NULL,
  entity_name character varying(200) NOT NULL,
  entity_type character varying(50) NOT NULL,
  tax_id character varying(30),
  legal_name character varying(200),
  address text,
  phone character varying(50),
  email character varying(100),
  website character varying(200),
  bank_name character varying(100),
  bank_account_number character varying(50),
  bank_account_type character varying(30),
  bank_cbu character varying(30),
  bank_alias character varying(100),
  presentation_format character varying(50),
  presentation_frequency character varying(20) DEFAULT 'monthly'::character varying,
  presentation_deadline_day integer,
  settings jsonb DEFAULT '{}'::jsonb,
  is_government boolean DEFAULT false,
  is_mandatory boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  category_id integer,
  entity_short_name character varying(50),
  requires_employee_affiliation boolean DEFAULT false,
  affiliation_id_name character varying(50),
  calculation_notes text,
  legal_reference text
);

-- Tabla: payroll_entity_categories
CREATE TABLE IF NOT EXISTS payroll_entity_categories (
  id integer NOT NULL DEFAULT nextval('payroll_entity_categories_id_seq'::regclass),
  country_id integer,
  company_id integer,
  category_code character varying(50) NOT NULL,
  category_name character varying(200) NOT NULL,
  category_name_short character varying(50),
  description text,
  flow_direction character varying(30) NOT NULL DEFAULT 'deduction'::character varying,
  icon_name character varying(50),
  color_hex character varying(7),
  consolidation_group character varying(50),
  requires_tax_id boolean DEFAULT false,
  requires_bank_info boolean DEFAULT false,
  default_presentation_format character varying(50),
  presentation_entity_name character varying(200),
  display_order integer DEFAULT 0,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: payroll_entity_settlement_details
CREATE TABLE IF NOT EXISTS payroll_entity_settlement_details (
  detail_id integer NOT NULL DEFAULT nextval('payroll_entity_settlement_details_detail_id_seq'::regclass),
  settlement_id integer NOT NULL,
  user_id uuid NOT NULL,
  run_detail_id integer,
  employee_name character varying(200),
  employee_tax_id character varying(30),
  employee_code character varying(50),
  base_amount numeric(15,2) DEFAULT 0,
  employee_amount numeric(15,2) DEFAULT 0,
  employer_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  concepts_breakdown jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: payroll_entity_settlements
CREATE TABLE IF NOT EXISTS payroll_entity_settlements (
  settlement_id integer NOT NULL DEFAULT nextval('payroll_entity_settlements_settlement_id_seq'::regclass),
  company_id integer NOT NULL,
  branch_id integer,
  entity_id integer NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  run_id integer,
  settlement_code character varying(50) NOT NULL,
  total_employees integer DEFAULT 0,
  total_amount numeric(18,2) DEFAULT 0,
  total_employer_contribution numeric(18,2) DEFAULT 0,
  total_employee_contribution numeric(18,2) DEFAULT 0,
  grand_total numeric(18,2) DEFAULT 0,
  status character varying(20) DEFAULT 'pending'::character varying,
  generated_at timestamp without time zone,
  reviewed_at timestamp without time zone,
  approved_at timestamp without time zone,
  submitted_at timestamp without time zone,
  paid_at timestamp without time zone,
  generated_by uuid,
  reviewed_by uuid,
  approved_by uuid,
  payment_reference character varying(100),
  payment_date date,
  payment_method character varying(30),
  payment_receipt_url character varying(500),
  presentation_file_url character varying(500),
  presentation_format character varying(50),
  presentation_response jsonb,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: payroll_payslip_block_types
CREATE TABLE IF NOT EXISTS payroll_payslip_block_types (
  id integer NOT NULL DEFAULT nextval('payroll_payslip_block_types_id_seq'::regclass),
  block_type character varying(50) NOT NULL,
  block_name character varying(100) NOT NULL,
  description text,
  icon character varying(50),
  configurable_fields jsonb DEFAULT '[]'::jsonb,
  html_template text,
  suggested_order integer DEFAULT 50,
  required_for_countries jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true
);

-- Tabla: payroll_payslip_templates
CREATE TABLE IF NOT EXISTS payroll_payslip_templates (
  id integer NOT NULL DEFAULT nextval('payroll_payslip_templates_id_seq'::regclass),
  country_id integer,
  company_id integer,
  template_code character varying(30) NOT NULL,
  template_name character varying(100) NOT NULL,
  description text,
  layout_config jsonb NOT NULL DEFAULT '{"style": {"margins": {"top": 20, "left": 15, "right": 15, "bottom": 20}, "font_size": 10, "paper_size": "A4", "font_family": "Arial", "orientation": "portrait", "primary_color": "#1a1a2e", "secondary_color": "#4a5568"}, "blocks": []}'::jsonb,
  required_fields jsonb DEFAULT '[]'::jsonb,
  legal_disclaimers jsonb DEFAULT '[]'::jsonb,
  logo_url character varying(500),
  signature_config jsonb DEFAULT '{"employee_signature": true, "employer_signature": true, "digital_signature_enabled": false}'::jsonb,
  is_default boolean DEFAULT false,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: payroll_run_concept_details
CREATE TABLE IF NOT EXISTS payroll_run_concept_details (
  id integer NOT NULL DEFAULT nextval('payroll_run_concept_details_id_seq'::regclass),
  run_detail_id integer NOT NULL,
  template_concept_id integer,
  concept_type_id integer,
  concept_code character varying(50) NOT NULL,
  concept_name character varying(200) NOT NULL,
  quantity numeric(10,4),
  rate numeric(15,4),
  amount numeric(15,2) NOT NULL,
  calculation_detail text,
  is_override boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  entity_id integer,
  entity_code character varying(30),
  entity_name character varying(200),
  concept_detail_id integer,
  detail_id integer,
  concept_id integer,
  concept_type character varying(30),
  calculation_type character varying(20),
  base_amount numeric(15,2),
  calculated_amount numeric(15,2),
  is_remunerative boolean DEFAULT true,
  is_taxable boolean DEFAULT true,
  is_bonus boolean DEFAULT false,
  show_in_payslip boolean DEFAULT true,
  calculation_details jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp without time zone
);

-- Tabla: payroll_run_details
CREATE TABLE IF NOT EXISTS payroll_run_details (
  id integer NOT NULL DEFAULT nextval('payroll_run_details_id_seq'::regclass),
  run_id integer NOT NULL,
  user_id uuid NOT NULL,
  assignment_id integer,
  worked_days numeric(5,2),
  worked_hours numeric(7,2),
  overtime_50_hours numeric(6,2) DEFAULT 0,
  overtime_100_hours numeric(6,2) DEFAULT 0,
  night_hours numeric(6,2) DEFAULT 0,
  absent_days numeric(5,2) DEFAULT 0,
  gross_earnings numeric(15,2) DEFAULT 0,
  non_remunerative numeric(15,2) DEFAULT 0,
  total_deductions numeric(15,2) DEFAULT 0,
  net_salary numeric(15,2) DEFAULT 0,
  employer_contributions numeric(15,2) DEFAULT 0,
  earnings_detail jsonb DEFAULT '[]'::jsonb,
  deductions_detail jsonb DEFAULT '[]'::jsonb,
  employer_detail jsonb DEFAULT '[]'::jsonb,
  status character varying(30) DEFAULT 'calculated'::character varying,
  error_message text,
  receipt_number character varying(50),
  receipt_generated_at timestamp without time zone,
  receipt_url text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  employee_snapshot jsonb DEFAULT '{}'::jsonb,
  payslip_template_snapshot jsonb DEFAULT '{}'::jsonb
);

-- Tabla: payroll_runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  id integer NOT NULL DEFAULT nextval('payroll_runs_id_seq'::regclass),
  company_id integer NOT NULL,
  branch_id integer,
  run_code character varying(50) NOT NULL,
  run_name character varying(200),
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_half integer,
  period_week integer,
  period_start date NOT NULL,
  period_end date NOT NULL,
  payment_date date,
  total_employees integer DEFAULT 0,
  total_gross numeric(18,2) DEFAULT 0,
  total_deductions numeric(18,2) DEFAULT 0,
  total_net numeric(18,2) DEFAULT 0,
  total_employer_cost numeric(18,2) DEFAULT 0,
  status character varying(30) DEFAULT 'draft'::character varying,
  approved_by uuid,
  approved_at timestamp without time zone,
  paid_at timestamp without time zone,
  notes text,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: payroll_template_concepts
CREATE TABLE IF NOT EXISTS payroll_template_concepts (
  id integer NOT NULL DEFAULT nextval('payroll_template_concepts_id_seq'::regclass),
  template_id integer NOT NULL,
  concept_type_id integer NOT NULL,
  concept_code character varying(50) NOT NULL,
  concept_name character varying(200) NOT NULL,
  short_name character varying(50),
  description text,
  calculation_type character varying(30) NOT NULL DEFAULT 'fixed'::character varying,
  default_value numeric(15,4) DEFAULT 0,
  percentage_base character varying(100),
  formula text,
  min_value numeric(15,4),
  max_value numeric(15,4),
  cap_value numeric(15,4),
  applies_to_hourly boolean DEFAULT true,
  applies_to_monthly boolean DEFAULT true,
  is_mandatory boolean DEFAULT false,
  is_visible_receipt boolean DEFAULT true,
  is_editable_per_user boolean DEFAULT true,
  employee_contribution_rate numeric(6,4),
  employer_contribution_rate numeric(6,4),
  legal_reference text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  entity_id integer,
  entity_account_code character varying(50),
  entity_label character varying(100),
  receipt_note text
);

-- Tabla: payroll_templates
CREATE TABLE IF NOT EXISTS payroll_templates (
  id integer NOT NULL DEFAULT nextval('payroll_templates_id_seq'::regclass),
  company_id integer NOT NULL,
  country_id integer,
  branch_id integer,
  labor_agreement_id integer,
  template_code character varying(50) NOT NULL,
  template_name character varying(200) NOT NULL,
  description text,
  pay_frequency character varying(20) NOT NULL DEFAULT 'monthly'::character varying,
  calculation_basis character varying(20) NOT NULL DEFAULT 'monthly'::character varying,
  work_hours_per_day numeric(5,2) DEFAULT 8,
  work_days_per_week numeric(3,1) DEFAULT 5,
  work_hours_per_month numeric(6,2) DEFAULT 200,
  overtime_50_after_hours numeric(5,2) DEFAULT 8,
  overtime_100_after_hours numeric(5,2) DEFAULT 12,
  night_shift_start time without time zone DEFAULT '21:00:00'::time without time zone,
  night_shift_end time without time zone DEFAULT '06:00:00'::time without time zone,
  round_to_cents boolean DEFAULT true,
  round_method character varying(20) DEFAULT 'nearest'::character varying,
  receipt_header text,
  receipt_legal_text text,
  receipt_footer text,
  version integer DEFAULT 1,
  is_current_version boolean DEFAULT true,
  parent_template_id integer,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: permissions
CREATE TABLE IF NOT EXISTS permissions (
  id uuid NOT NULL,
  type enum_permissions_type NOT NULL,
  startDate timestamp with time zone NOT NULL,
  endDate timestamp with time zone NOT NULL,
  hours numeric(4,2),
  reason text NOT NULL,
  status enum_permissions_status DEFAULT 'pending'::enum_permissions_status,
  approvedBy uuid,
  approvedAt timestamp with time zone,
  rejectionReason text,
  documents json DEFAULT '[]'::json,
  isEmergency boolean DEFAULT false,
  notificationSent boolean DEFAULT false,
  UserId uuid NOT NULL,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL,
  user_id uuid
);

-- Tabla: proactive_executions
CREATE TABLE IF NOT EXISTS proactive_executions (
  id bigint NOT NULL DEFAULT nextval('proactive_executions_id_seq'::regclass),
  rule_id integer,
  execution_time timestamp without time zone DEFAULT now(),
  matched_count integer DEFAULT 0,
  actions_taken integer DEFAULT 0,
  execution_details jsonb
);

-- Tabla: proactive_rules
CREATE TABLE IF NOT EXISTS proactive_rules (
  id integer NOT NULL DEFAULT nextval('proactive_rules_id_seq'::regclass),
  company_id integer NOT NULL,
  rule_name character varying(100),
  rule_type character varying(50),
  trigger_condition text,
  trigger_threshold jsonb,
  auto_action character varying(50),
  notification_recipients jsonb,
  notification_template_id integer,
  priority character varying(20),
  check_frequency character varying(20) DEFAULT 'daily'::character varying,
  last_checked timestamp without time zone,
  active boolean DEFAULT true
);

-- Tabla: procedure_acknowledgements
CREATE TABLE IF NOT EXISTS procedure_acknowledgements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL,
  procedure_version_id uuid,
  user_id uuid NOT NULL,
  employee_id character varying(50),
  employee_name character varying(255),
  status character varying(20) DEFAULT 'pending'::character varying,
  notification_id uuid,
  notification_sent_at timestamp without time zone,
  acknowledged_at timestamp without time zone,
  acknowledgement_ip character varying(45),
  acknowledgement_method character varying(20),
  reminder_count integer DEFAULT 0,
  last_reminder_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: procedure_attachments
CREATE TABLE IF NOT EXISTS procedure_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL,
  procedure_version_id uuid,
  file_name character varying(255) NOT NULL,
  file_type character varying(50),
  file_size integer,
  file_path text,
  mime_type character varying(100),
  description text,
  is_main_document boolean DEFAULT false,
  uploaded_by uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: procedure_comments
CREATE TABLE IF NOT EXISTS procedure_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL,
  procedure_version_id uuid,
  user_id uuid NOT NULL,
  comment_type character varying(20) DEFAULT 'comment'::character varying,
  content text NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: procedure_draft_locks
CREATE TABLE IF NOT EXISTS procedure_draft_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL,
  locked_by uuid NOT NULL,
  locked_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unlocked_at timestamp without time zone,
  unlock_reason character varying(50),
  expires_at timestamp without time zone NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: procedure_roles
CREATE TABLE IF NOT EXISTS procedure_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL,
  organizational_position_id integer,
  role_name character varying(100),
  scope_type character varying(20) DEFAULT 'must_read'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: procedure_versions
CREATE TABLE IF NOT EXISTS procedure_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL,
  version_number integer NOT NULL,
  version_label character varying(20) NOT NULL,
  objective text,
  scope text,
  definitions text,
  responsibilities text,
  procedure_content text,
  references text,
  annexes text,
  changes_summary text,
  change_reason text,
  created_by uuid,
  published_by uuid,
  published_at timestamp without time zone,
  status character varying(20) DEFAULT 'current'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: procedures
CREATE TABLE IF NOT EXISTS procedures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer NOT NULL,
  code character varying(50) NOT NULL,
  title character varying(255) NOT NULL,
  type character varying(20) DEFAULT 'instructivo'::character varying,
  current_version integer DEFAULT 1,
  version_label character varying(20) DEFAULT '1.0'::character varying,
  status character varying(20) DEFAULT 'draft'::character varying,
  objective text,
  scope text,
  definitions text,
  responsibilities text,
  procedure_content text,
  references text,
  annexes text,
  branch_id integer,
  department_id integer,
  sector_id integer,
  effective_date date,
  review_date date,
  obsolete_date date,
  created_by uuid,
  reviewed_by uuid,
  approved_by uuid,
  published_by uuid,
  reviewed_at timestamp without time zone,
  approved_at timestamp without time zone,
  published_at timestamp without time zone,
  tags ARRAY,
  is_critical boolean DEFAULT false,
  requires_training boolean DEFAULT false,
  training_module_id uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  owners jsonb DEFAULT '[]'::jsonb,
  expiry_date date,
  scope_type procedure_scope_type DEFAULT 'company'::procedure_scope_type,
  scope_entities jsonb DEFAULT '[]'::jsonb,
  draft_locked_by uuid,
  draft_locked_at timestamp without time zone,
  draft_expires_at timestamp without time zone,
  parent_id uuid,
  hierarchy_level integer DEFAULT 4,
  hierarchy_path text,
  inherit_scope boolean DEFAULT true
);

-- Tabla: report_access_log
CREATE TABLE IF NOT EXISTS report_access_log (
  id bigint NOT NULL DEFAULT nextval('report_access_log_id_seq'::regclass),
  report_id integer NOT NULL,
  access_type character varying(30) NOT NULL,
  accessed_at timestamp without time zone NOT NULL DEFAULT now(),
  accessed_by character varying(100),
  success boolean DEFAULT true,
  ip_address inet,
  user_agent text
);

-- Tabla: request_types
CREATE TABLE IF NOT EXISTS request_types (
  id integer NOT NULL DEFAULT nextval('request_types_id_seq'::regclass),
  code character varying(50) NOT NULL,
  category character varying(30) NOT NULL,
  display_name_es character varying(255) NOT NULL,
  display_name_en character varying(255),
  display_name_pt character varying(255),
  legal_term character varying(100) NOT NULL,
  description text,
  approval_chain jsonb NOT NULL,
  form_fields jsonb NOT NULL,
  validation_rules jsonb,
  email_subject_template character varying(255),
  email_body_template text,
  requires_attachments boolean DEFAULT false,
  allowed_file_types character varying(255),
  icon character varying(50) DEFAULT '📋'::character varying,
  color character varying(7) DEFAULT '#007bff'::character varying,
  active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: risk_benchmarks
CREATE TABLE IF NOT EXISTS risk_benchmarks (
  id integer NOT NULL DEFAULT nextval('risk_benchmarks_id_seq'::regclass),
  benchmark_code character varying(50) NOT NULL,
  benchmark_name character varying(200) NOT NULL,
  ciuo_code character varying(10),
  work_category character varying(50),
  industry_code character varying(20),
  country_code character varying(3) DEFAULT 'ARG'::character varying,
  source character varying(100) NOT NULL,
  source_year integer,
  source_url text,
  fatigue_p25 numeric(5,2),
  fatigue_p50 numeric(5,2),
  fatigue_p75 numeric(5,2),
  fatigue_p90 numeric(5,2),
  accident_p25 numeric(5,2),
  accident_p50 numeric(5,2),
  accident_p75 numeric(5,2),
  accident_p90 numeric(5,2),
  legal_claim_p25 numeric(5,2),
  legal_claim_p50 numeric(5,2),
  legal_claim_p75 numeric(5,2),
  legal_claim_p90 numeric(5,2),
  turnover_p25 numeric(5,2),
  turnover_p50 numeric(5,2),
  turnover_p75 numeric(5,2),
  turnover_p90 numeric(5,2),
  recommended_weights jsonb DEFAULT '{"legal": 0.20, "fatigue": 0.25, "accident": 0.25, "turnover": 0.15, "performance": 0.15}'::jsonb,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: role_definitions
CREATE TABLE IF NOT EXISTS role_definitions (
  id integer NOT NULL DEFAULT nextval('role_definitions_id_seq'::regclass),
  company_id integer,
  role_key character varying(50) NOT NULL,
  role_name character varying(100) NOT NULL,
  description text,
  category character varying(50) DEFAULT 'internal'::character varying,
  module_permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  special_permissions jsonb DEFAULT '{}'::jsonb,
  is_system_role boolean DEFAULT false,
  is_default_for_new_users boolean DEFAULT false,
  priority integer DEFAULT 0,
  color character varying(20) DEFAULT '#6c757d'::character varying,
  icon character varying(50) DEFAULT 'fa-user'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  inherits_from integer,
  max_users_per_company integer,
  requires_position_category ARRAY
);

-- Tabla: role_template_permissions
CREATE TABLE IF NOT EXISTS role_template_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_template_id character varying(50) NOT NULL,
  action_id character varying(100) NOT NULL,
  has_access boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: salary_categories
CREATE TABLE IF NOT EXISTS salary_categories (
  id integer NOT NULL DEFAULT nextval('salary_categories_id_seq'::regclass),
  labor_agreement_id integer,
  category_code character varying(20) NOT NULL,
  category_name character varying(200) NOT NULL,
  description text,
  base_salary_reference numeric(12,2),
  effective_date date,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: salary_categories_v2
CREATE TABLE IF NOT EXISTS salary_categories_v2 (
  id integer NOT NULL DEFAULT nextval('salary_categories_v2_id_seq'::regclass),
  labor_agreement_id integer,
  company_id integer,
  category_code character varying(50) NOT NULL,
  category_name character varying(200) NOT NULL,
  description text,
  base_salary_min numeric(15,2),
  base_salary_max numeric(15,2),
  hourly_rate_min numeric(10,4),
  hourly_rate_max numeric(10,4),
  recommended_base_salary numeric(15,2),
  recommended_hourly_rate numeric(10,4),
  seniority_level integer DEFAULT 1,
  is_active boolean DEFAULT true,
  effective_from date,
  effective_to date,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  category_id integer,
  agreement_id integer,
  base_salary numeric(15,2),
  hourly_rate numeric(10,2),
  level integer DEFAULT 1,
  requires_degree boolean DEFAULT false,
  min_experience_years integer DEFAULT 0
);

-- Tabla: sanction_history
CREATE TABLE IF NOT EXISTS sanction_history (
  id integer NOT NULL DEFAULT nextval('sanction_history_id_seq'::regclass),
  sanction_id integer,
  action character varying(50) NOT NULL,
  actor_id uuid,
  actor_name character varying(255),
  actor_role character varying(50),
  previous_status character varying(50),
  new_status character varying(50),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address character varying(45),
  user_agent text,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: sanction_types
CREATE TABLE IF NOT EXISTS sanction_types (
  id integer NOT NULL DEFAULT nextval('sanction_types_id_seq'::regclass),
  company_id integer,
  code character varying(50) NOT NULL,
  name character varying(200) NOT NULL,
  description text,
  category character varying(50) DEFAULT 'other'::character varying,
  default_severity character varying(50) DEFAULT 'warning'::character varying,
  default_points_deducted integer DEFAULT 0,
  requires_legal_review boolean DEFAULT true,
  suspension_days_default integer DEFAULT 0,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: sanctions
CREATE TABLE IF NOT EXISTS sanctions (
  id integer NOT NULL DEFAULT nextval('sanctions_id_seq'::regclass),
  company_id integer NOT NULL,
  user_id uuid NOT NULL,
  employee_id character varying(50),
  employee_name character varying(255),
  employee_department character varying(255),
  sanction_type character varying(100) NOT NULL,
  severity character varying(50) DEFAULT 'low'::character varying,
  title character varying(255) NOT NULL,
  description text,
  sanction_date date NOT NULL DEFAULT CURRENT_DATE,
  expiration_date date,
  status character varying(50) DEFAULT 'active'::character varying,
  points_deducted integer DEFAULT 0,
  is_automatic boolean DEFAULT false,
  related_attendance_id uuid,
  related_incident_id integer,
  created_by uuid,
  approved_by uuid,
  approval_date timestamp with time zone,
  appeal_notes text,
  appeal_date timestamp with time zone,
  appeal_resolved_by uuid,
  appeal_resolution text,
  documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  workflow_status character varying(50) DEFAULT 'draft'::character varying,
  sanction_type_id integer,
  requester_id uuid,
  requester_role character varying(50),
  original_description text,
  lawyer_id uuid,
  lawyer_review_date timestamp without time zone,
  lawyer_notes text,
  lawyer_modified_description text,
  hr_confirmation_id uuid,
  hr_confirmation_date timestamp without time zone,
  hr_notes text,
  delivery_method character varying(50) DEFAULT 'system'::character varying,
  suspension_start_date date,
  suspension_days integer DEFAULT 0,
  suspension_end_date date,
  rejection_reason text,
  rejected_by uuid,
  rejected_at timestamp without time zone,
  appeal_status character varying(50),
  appeal_resolved_at timestamp without time zone,
  appeal_resolution_notes text,
  workflow_metadata jsonb DEFAULT '{}'::jsonb
);

-- Tabla: schema_migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  version character varying(255) NOT NULL,
  name character varying(500) NOT NULL,
  executed_at timestamp without time zone DEFAULT now()
);

-- Tabla: scoring_history
CREATE TABLE IF NOT EXISTS scoring_history (
  id bigint NOT NULL DEFAULT nextval('scoring_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  snapshot_date date NOT NULL,
  scoring_total numeric(5,2),
  scoring_punctuality numeric(5,2),
  scoring_absence numeric(5,2),
  scoring_late_arrival numeric(5,2),
  scoring_early_departure numeric(5,2),
  change_from_previous numeric(6,2),
  change_reason character varying(255),
  trend character varying(20),
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: sectors
CREATE TABLE IF NOT EXISTS sectors (
  id integer NOT NULL DEFAULT nextval('sectors_id_seq'::regclass),
  company_id integer NOT NULL,
  department_id integer NOT NULL,
  name character varying(100) NOT NULL,
  code character varying(20),
  description text,
  supervisor_id uuid,
  gps_lat numeric(10,8),
  gps_lng numeric(11,8),
  coverage_radius integer DEFAULT 50,
  max_employees integer,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: shifts
CREATE TABLE IF NOT EXISTS shifts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(255) NOT NULL,
  startTime time without time zone NOT NULL,
  endTime time without time zone NOT NULL,
  toleranceMinutes integer DEFAULT 10,
  isActive boolean DEFAULT true,
  description text,
  days json,
  toleranceMinutesEntry integer DEFAULT 10,
  toleranceMinutesExit integer DEFAULT 15,
  shiftType enum_shifts_shiftType DEFAULT 'standard'::"enum_shifts_shiftType",
  breakStartTime time without time zone,
  breakEndTime time without time zone,
  rotationPattern character varying(255),
  cycleStartDate date,
  workDays integer,
  restDays integer,
  flashStartDate date,
  flashEndDate date,
  flashPriority enum_shifts_flashPriority DEFAULT 'normal'::"enum_shifts_flashPriority",
  allowOverride boolean DEFAULT false,
  permanentPriority enum_shifts_permanentPriority DEFAULT 'normal'::"enum_shifts_permanentPriority",
  hourlyRates json DEFAULT '{"normal":1,"overtime":1.5,"weekend":1.5,"holiday":2}'::json,
  color character varying(7) DEFAULT '#007bff'::character varying,
  notes text,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL,
  company_id integer,
  toleranceConfig jsonb DEFAULT '{"exit": {"after": 30, "before": 0}, "entry": {"after": 10, "before": 15}}'::jsonb,
  global_cycle_start_date date,
  phases jsonb DEFAULT '[]'::jsonb,
  branch_id uuid,
  respect_national_holidays boolean DEFAULT false,
  respect_provincial_holidays boolean DEFAULT false,
  custom_non_working_days jsonb DEFAULT '[]'::jsonb
);

-- Tabla: siac_cajas
CREATE TABLE IF NOT EXISTS siac_cajas (
  id integer NOT NULL DEFAULT nextval('siac_cajas_id_seq'::regclass),
  punto_venta_id integer NOT NULL,
  codigo_caja character varying(10) NOT NULL,
  nombre_caja character varying(100) NOT NULL,
  descripcion text,
  tipo_caja character varying(20) DEFAULT 'GENERAL'::character varying,
  permite_efectivo boolean DEFAULT true,
  permite_tarjetas boolean DEFAULT true,
  permite_cheques boolean DEFAULT false,
  permite_transferencias boolean DEFAULT false,
  permite_cuenta_corriente boolean DEFAULT false,
  limite_efectivo numeric(12,2) DEFAULT 0,
  limite_descuento_porcentaje numeric(5,2) DEFAULT 0,
  requiere_autorizacion_descuento boolean DEFAULT false,
  requiere_supervisor_anulacion boolean DEFAULT true,
  activo boolean DEFAULT true,
  predeterminada boolean DEFAULT false,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by integer,
  updated_by integer
);

-- Tabla: siac_clientes
CREATE TABLE IF NOT EXISTS siac_clientes (
  id integer NOT NULL DEFAULT nextval('siac_clientes_id_seq'::regclass),
  company_id integer NOT NULL,
  codigo_cliente character varying(20) NOT NULL,
  razon_social character varying(255) NOT NULL,
  nombre_fantasia character varying(255),
  tipo_cliente character varying(20) DEFAULT 'PERSONA_FISICA'::character varying,
  documento_tipo character varying(20) DEFAULT 'CUIT'::character varying,
  documento_numero character varying(20) NOT NULL,
  documento_formateado character varying(30),
  email character varying(255),
  telefono character varying(50),
  celular character varying(50),
  whatsapp character varying(50),
  website character varying(255),
  domicilio_calle character varying(255),
  domicilio_numero character varying(20),
  domicilio_piso character varying(10),
  domicilio_depto character varying(10),
  domicilio_completo text,
  ciudad character varying(100),
  provincia_estado character varying(100),
  codigo_postal character varying(20),
  pais character varying(100) DEFAULT 'Argentina'::character varying,
  latitud numeric(10,8),
  longitud numeric(11,8),
  categoria_cliente character varying(50) DEFAULT 'GENERAL'::character varying,
  lista_precio character varying(50) DEFAULT 'GENERAL'::character varying,
  descuento_maximo numeric(5,2) DEFAULT 0.00,
  limite_credito numeric(15,4) DEFAULT 0,
  credito_disponible numeric(15,4) DEFAULT 0,
  dias_vencimiento integer DEFAULT 30,
  vendedor_asignado_id integer,
  canal_venta character varying(50) DEFAULT 'DIRECTO'::character varying,
  origen_cliente character varying(50) DEFAULT 'MANUAL'::character varying,
  requiere_orden_compra boolean DEFAULT false,
  formato_facturacion character varying(20) DEFAULT 'A'::character varying,
  email_facturacion character varying(255),
  fecha_alta date DEFAULT CURRENT_DATE,
  fecha_primera_compra date,
  fecha_ultima_compra date,
  total_compras numeric(15,4) DEFAULT 0,
  cantidad_facturas integer DEFAULT 0,
  promedio_compra numeric(15,4) DEFAULT 0,
  observaciones text,
  notas_internas text,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  datos_extra jsonb DEFAULT '{}'::jsonb,
  estado character varying(20) DEFAULT 'ACTIVO'::character varying,
  motivo_inactivacion text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  provincia character varying(100),
  localidad character varying(100),
  calle character varying(200),
  numero character varying(20),
  piso character varying(10),
  departamento character varying(10),
  condicion_fiscal character varying(50),
  condicion_fiscal_code character varying(20),
  cuenta_corriente_habilitada boolean DEFAULT false,
  plazo_pago_dias integer DEFAULT 0,
  credito_maximo numeric(12,2) DEFAULT 0,
  credito_utilizado numeric(12,2) DEFAULT 0,
  bloqueo_por_vencimiento boolean DEFAULT false,
  bloqueo_por_credito boolean DEFAULT false,
  fecha_ultimo_analisis date,
  observaciones_credito text,
  banco character varying(100),
  tipo_cuenta character varying(50),
  numero_cuenta character varying(50),
  cbu character varying(22),
  alias_cbu character varying(100),
  descuento_general numeric(5,2) DEFAULT 0,
  lista_precios_id integer,
  vendedor_id integer,
  zona_comercial character varying(100)
);

-- Tabla: siac_clientes_contactos
CREATE TABLE IF NOT EXISTS siac_clientes_contactos (
  id integer NOT NULL DEFAULT nextval('siac_clientes_contactos_id_seq'::regclass),
  cliente_id integer NOT NULL,
  nombre character varying(100) NOT NULL,
  apellido character varying(100),
  cargo character varying(100),
  departamento character varying(100),
  telefono character varying(50),
  celular character varying(50),
  email character varying(255),
  es_contacto_principal boolean DEFAULT false,
  recibe_facturas boolean DEFAULT false,
  recibe_cobranzas boolean DEFAULT false,
  recibe_marketing boolean DEFAULT true,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_clientes_direcciones
CREATE TABLE IF NOT EXISTS siac_clientes_direcciones (
  id integer NOT NULL DEFAULT nextval('siac_clientes_direcciones_id_seq'::regclass),
  cliente_id integer NOT NULL,
  tipo_direccion character varying(30) NOT NULL DEFAULT 'ADICIONAL'::character varying,
  nombre_direccion character varying(100),
  calle character varying(255) NOT NULL,
  numero character varying(20),
  piso character varying(10),
  departamento character varying(10),
  entre_calles character varying(255),
  referencias text,
  ciudad character varying(100),
  provincia_estado character varying(100),
  codigo_postal character varying(20),
  pais character varying(100) DEFAULT 'Argentina'::character varying,
  latitud numeric(10,8),
  longitud numeric(11,8),
  es_direccion_principal boolean DEFAULT false,
  activa_para_facturacion boolean DEFAULT true,
  activa_para_entrega boolean DEFAULT true,
  horarios_entrega jsonb DEFAULT '{}'::jsonb,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_clientes_precios_especiales
CREATE TABLE IF NOT EXISTS siac_clientes_precios_especiales (
  id integer NOT NULL DEFAULT nextval('siac_clientes_precios_especiales_id_seq'::regclass),
  cliente_id integer NOT NULL,
  producto_id integer,
  producto_codigo character varying(50),
  producto_descripcion character varying(255),
  precio_especial numeric(15,4) NOT NULL,
  moneda character varying(3) DEFAULT 'ARS'::character varying,
  tipo_precio character varying(20) DEFAULT 'FIJO'::character varying,
  valor_descuento numeric(15,4),
  fecha_desde date DEFAULT CURRENT_DATE,
  fecha_hasta date,
  cantidad_minima integer DEFAULT 1,
  solo_contado boolean DEFAULT false,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_configuracion_empresa
CREATE TABLE IF NOT EXISTS siac_configuracion_empresa (
  id integer NOT NULL DEFAULT nextval('siac_configuracion_empresa_id_seq'::regclass),
  company_id integer NOT NULL,
  razon_social character varying(255),
  domicilio character varying(255),
  cuit character varying(15),
  ingresos_brutos character varying(20),
  condicion_iva character varying(50) DEFAULT 'RESPONSABLE_INSCRIPTO'::character varying,
  punto_venta integer DEFAULT 1,
  agente_retencion_iva boolean DEFAULT false,
  agente_percepcion_iva boolean DEFAULT false,
  agente_retencion_ib boolean DEFAULT false,
  agente_percepcion_ib boolean DEFAULT false,
  porc_retencion_iva numeric(5,2) DEFAULT 10.50,
  porc_percepcion_iva numeric(5,2) DEFAULT 21.00,
  porc_retencion_ib numeric(5,2) DEFAULT 3.00,
  porc_percepcion_ib numeric(5,2) DEFAULT 3.50,
  habilita_facturacion boolean DEFAULT true,
  factura_a_numero integer DEFAULT 1,
  factura_b_numero integer DEFAULT 1,
  factura_c_numero integer DEFAULT 1,
  pais character varying(3) DEFAULT 'ARG'::character varying,
  moneda character varying(3) DEFAULT 'ARS'::character varying,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_configuracion_terminal
CREATE TABLE IF NOT EXISTS siac_configuracion_terminal (
  id integer NOT NULL DEFAULT nextval('siac_configuracion_terminal_id_seq'::regclass),
  company_id integer NOT NULL,
  terminal_id character varying(50) NOT NULL,
  nombre_terminal character varying(100),
  tipo_terminal character varying(30) DEFAULT 'CAJA'::character varying,
  impresora_principal character varying(100),
  impresora_tickets character varying(100),
  display_cliente character varying(100),
  lector_codigo_barras character varying(100),
  modulos_habilitados jsonb DEFAULT '[]'::jsonb,
  permisos_especiales jsonb DEFAULT '{}'::jsonb,
  punto_venta_asignado integer,
  certificado_fiscal character varying(255),
  activo boolean DEFAULT true,
  ultimo_uso timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_facturas
CREATE TABLE IF NOT EXISTS siac_facturas (
  id integer NOT NULL DEFAULT nextval('siac_facturas_id_seq'::regclass),
  caja_id integer NOT NULL,
  tipo_comprobante_id integer NOT NULL,
  numero_completo character varying(50) NOT NULL,
  prefijo character varying(10),
  numero integer NOT NULL,
  fecha_factura date NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento date,
  fecha_entrega date,
  cliente_id integer,
  cliente_codigo character varying(50),
  cliente_razon_social character varying(200) NOT NULL,
  cliente_documento_tipo character varying(10),
  cliente_documento_numero character varying(20),
  cliente_direccion text,
  cliente_telefono character varying(50),
  cliente_email character varying(100),
  cliente_condicion_iva character varying(50) DEFAULT 'CONSUMIDOR_FINAL'::character varying,
  subtotal numeric(12,2) DEFAULT 0,
  descuento_porcentaje numeric(5,2) DEFAULT 0,
  descuento_importe numeric(12,2) DEFAULT 0,
  total_impuestos numeric(12,2) DEFAULT 0,
  total_neto numeric(12,2) DEFAULT 0,
  total_factura numeric(12,2) NOT NULL DEFAULT 0,
  estado character varying(20) DEFAULT 'PENDIENTE'::character varying,
  factura_original_id integer,
  motivo_anulacion text,
  autorizada_por integer,
  cae character varying(50),
  cae_vencimiento date,
  codigo_barras text,
  observaciones text,
  notas_internas text,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by integer NOT NULL,
  updated_by integer,
  presupuesto_id integer,
  company_id integer NOT NULL DEFAULT 1,
  punto_venta integer,
  tipo_comprobante_afip integer,
  numero_comprobante bigint,
  estado_afip character varying(20) DEFAULT 'PENDIENTE'::character varying,
  observaciones_afip text,
  cliente_cuit character varying(13),
  concepto integer DEFAULT 1,
  moneda character varying(3) DEFAULT 'PES'::character varying,
  cotizacion numeric(10,4) DEFAULT 1,
  fecha_servicio_desde date,
  fecha_servicio_hasta date,
  items jsonb DEFAULT '[]'::jsonb,
  impuestos jsonb DEFAULT '[]'::jsonb,
  invoice_number character varying(50)
);

-- Tabla: siac_facturas_impuestos
CREATE TABLE IF NOT EXISTS siac_facturas_impuestos (
  id integer NOT NULL DEFAULT nextval('siac_facturas_impuestos_id_seq'::regclass),
  factura_id integer NOT NULL,
  codigo_impuesto character varying(20) NOT NULL,
  nombre_impuesto character varying(100) NOT NULL,
  tipo_impuesto character varying(50) DEFAULT 'IVA'::character varying,
  base_imponible numeric(12,2) NOT NULL DEFAULT 0,
  alicuota_porcentaje numeric(8,2) NOT NULL DEFAULT 0,
  importe_impuesto numeric(12,2) NOT NULL DEFAULT 0,
  condicion_impuesto character varying(50),
  codigo_afip integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_facturas_items
CREATE TABLE IF NOT EXISTS siac_facturas_items (
  id integer NOT NULL DEFAULT nextval('siac_facturas_items_id_seq'::regclass),
  factura_id integer NOT NULL,
  numero_item integer NOT NULL,
  producto_id integer,
  producto_codigo character varying(50) NOT NULL,
  producto_descripcion text NOT NULL,
  producto_unidad_medida character varying(20) DEFAULT 'UNI'::character varying,
  cantidad numeric(10,3) NOT NULL DEFAULT 1,
  precio_unitario numeric(12,2) NOT NULL DEFAULT 0,
  descuento_porcentaje numeric(5,2) DEFAULT 0,
  descuento_importe numeric(12,2) DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  subtotal_con_descuento numeric(12,2) NOT NULL DEFAULT 0,
  alicuota_iva numeric(5,2) DEFAULT 21.00,
  importe_iva numeric(12,2) DEFAULT 0,
  otros_impuestos numeric(12,2) DEFAULT 0,
  total_item numeric(12,2) NOT NULL DEFAULT 0,
  categoria_producto character varying(100),
  marca_producto character varying(100),
  codigo_barras character varying(50),
  notas text,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_facturas_pagos
CREATE TABLE IF NOT EXISTS siac_facturas_pagos (
  id integer NOT NULL DEFAULT nextval('siac_facturas_pagos_id_seq'::regclass),
  factura_id integer NOT NULL,
  forma_pago character varying(50) NOT NULL,
  descripcion_pago character varying(200),
  importe_pago numeric(12,2) NOT NULL DEFAULT 0,
  numero_tarjeta character varying(20),
  tipo_tarjeta character varying(50),
  numero_cupon character varying(50),
  numero_lote character varying(20),
  codigo_autorizacion character varying(50),
  numero_cheque character varying(50),
  banco_cheque character varying(100),
  fecha_cheque date,
  fecha_vencimiento_cheque date,
  numero_operacion character varying(50),
  banco_origen character varying(100),
  genera_cuenta_corriente boolean DEFAULT false,
  estado_pago character varying(20) DEFAULT 'CONFIRMADO'::character varying,
  fecha_pago timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_listas_precios
CREATE TABLE IF NOT EXISTS siac_listas_precios (
  id integer NOT NULL DEFAULT nextval('siac_listas_precios_id_seq'::regclass),
  company_id integer NOT NULL,
  codigo_lista character varying(20) NOT NULL,
  nombre_lista character varying(100) NOT NULL,
  descripcion text,
  tipo_lista character varying(20) DEFAULT 'GENERAL'::character varying,
  factor_multiplicador numeric(8,4) DEFAULT 1.0000,
  redondeo character varying(20) DEFAULT 'CENTAVO'::character varying,
  fecha_vigencia_desde date DEFAULT CURRENT_DATE,
  fecha_vigencia_hasta date,
  aplica_automaticamente boolean DEFAULT false,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_modulos_empresa
CREATE TABLE IF NOT EXISTS siac_modulos_empresa (
  id integer NOT NULL DEFAULT nextval('siac_modulos_empresa_id_seq'::regclass),
  company_id integer NOT NULL,
  modulo_codigo character varying(50) NOT NULL,
  modulo_nombre character varying(100) NOT NULL,
  modulo_descripcion text,
  activo boolean DEFAULT true,
  fecha_contratacion date DEFAULT CURRENT_DATE,
  fecha_vencimiento date,
  configuracion jsonb DEFAULT '{}'::jsonb,
  precio_mensual numeric(10,2) DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_numeracion_comprobantes
CREATE TABLE IF NOT EXISTS siac_numeracion_comprobantes (
  id integer NOT NULL DEFAULT nextval('siac_numeracion_comprobantes_id_seq'::regclass),
  caja_id integer NOT NULL,
  tipo_comprobante_id integer NOT NULL,
  numero_actual integer DEFAULT 0,
  prefijo character varying(10) DEFAULT ''::character varying,
  sufijo character varying(10) DEFAULT ''::character varying,
  numero_desde integer DEFAULT 1,
  numero_hasta integer DEFAULT 999999999,
  fecha_autorizacion date,
  fecha_vencimiento_autorizacion date,
  activo boolean DEFAULT true,
  requiere_cae boolean DEFAULT false,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_numeracion_log
CREATE TABLE IF NOT EXISTS siac_numeracion_log (
  id integer NOT NULL DEFAULT nextval('siac_numeracion_log_id_seq'::regclass),
  company_id integer NOT NULL,
  tipo_comprobante character varying(50) NOT NULL,
  numero_asignado integer NOT NULL,
  numero_anterior integer,
  session_id character varying(100),
  user_id integer,
  terminal_id character varying(50),
  timestamp_asignacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_presupuestos
CREATE TABLE IF NOT EXISTS siac_presupuestos (
  id integer NOT NULL DEFAULT nextval('siac_presupuestos_id_seq'::regclass),
  company_id integer NOT NULL,
  numero_presupuesto character varying(50) NOT NULL,
  prefijo character varying(10),
  numero integer NOT NULL,
  cliente_id integer,
  cliente_codigo character varying(50),
  cliente_razon_social character varying(200) NOT NULL,
  cliente_documento_tipo character varying(10),
  cliente_documento_numero character varying(20),
  cliente_direccion text,
  cliente_telefono character varying(50),
  cliente_email character varying(100),
  cliente_condicion_iva character varying(50) DEFAULT 'CONSUMIDOR_FINAL'::character varying,
  fecha_emision date NOT NULL DEFAULT CURRENT_DATE,
  fecha_validez date,
  tipo_facturacion character varying(20) DEFAULT 'OCASIONAL'::character varying,
  frecuencia_facturacion character varying(20),
  fecha_inicio_facturacion date,
  fecha_fin_facturacion date,
  proximo_periodo_facturacion date,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) DEFAULT 0,
  descuento_porcentaje numeric(5,2) DEFAULT 0,
  descuento_importe numeric(12,2) DEFAULT 0,
  total_impuestos numeric(12,2) DEFAULT 0,
  total_neto numeric(12,2) DEFAULT 0,
  total_presupuesto numeric(12,2) NOT NULL DEFAULT 0,
  estado character varying(20) DEFAULT 'PENDIENTE'::character varying,
  fecha_aprobacion timestamp without time zone,
  aprobado_por character varying(255),
  cantidad_facturas_generadas integer DEFAULT 0,
  facturas_generadas jsonb DEFAULT '[]'::jsonb,
  contract_id uuid,
  observaciones text,
  notas_internas text,
  terminos_condiciones text,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by integer NOT NULL,
  updated_by integer
);

-- Tabla: siac_productos
CREATE TABLE IF NOT EXISTS siac_productos (
  id integer NOT NULL DEFAULT nextval('siac_productos_id_seq'::regclass),
  company_id integer NOT NULL,
  codigo_producto character varying(50) NOT NULL,
  codigo_barras character varying(50),
  codigo_fabricante character varying(50),
  codigo_proveedor character varying(50),
  nombre_producto character varying(255) NOT NULL,
  descripcion_corta character varying(500),
  descripcion_larga text,
  categoria_id integer,
  marca_id integer,
  proveedor_principal_id integer,
  unidad_medida character varying(20) DEFAULT 'UNIDAD'::character varying,
  unidad_compra character varying(20) DEFAULT 'UNIDAD'::character varying,
  factor_conversion numeric(10,4) DEFAULT 1,
  precio_compra numeric(15,4) DEFAULT 0,
  precio_venta numeric(15,4) NOT NULL DEFAULT 0,
  precio_lista numeric(15,4) DEFAULT 0,
  moneda character varying(3) DEFAULT 'ARS'::character varying,
  margen_porcentaje numeric(5,2) DEFAULT 0,
  margen_absoluto numeric(15,4) DEFAULT 0,
  precio_minimo numeric(15,4) DEFAULT 0,
  precio_sugerido numeric(15,4) DEFAULT 0,
  controla_stock boolean DEFAULT true,
  stock_actual numeric(15,4) DEFAULT 0,
  stock_minimo numeric(15,4) DEFAULT 0,
  stock_maximo numeric(15,4) DEFAULT 1000,
  punto_reposicion numeric(15,4) DEFAULT 10,
  peso numeric(10,4) DEFAULT 0,
  volumen numeric(10,4) DEFAULT 0,
  dimensiones jsonb DEFAULT '{}'::jsonb,
  aplica_iva boolean DEFAULT true,
  alicuota_iva numeric(5,2) DEFAULT 21.00,
  aplica_impuesto_interno boolean DEFAULT false,
  alicuota_impuesto_interno numeric(5,2) DEFAULT 0,
  permite_fraccionamiento boolean DEFAULT false,
  requiere_lote boolean DEFAULT false,
  requiere_vencimiento boolean DEFAULT false,
  dias_vida_util integer,
  es_servicio boolean DEFAULT false,
  es_combo boolean DEFAULT false,
  imagen_principal character varying(500),
  imagenes_adicionales jsonb DEFAULT '[]'::jsonb,
  ficha_tecnica_url character varying(500),
  slug character varying(255),
  keywords text,
  meta_description character varying(500),
  visible_web boolean DEFAULT false,
  destacado boolean DEFAULT false,
  atributos_especiales jsonb DEFAULT '{}'::jsonb,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  estado character varying(20) DEFAULT 'ACTIVO'::character varying,
  motivo_inactivacion text,
  fecha_alta date DEFAULT CURRENT_DATE,
  fecha_baja date,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_productos_categorias
CREATE TABLE IF NOT EXISTS siac_productos_categorias (
  id integer NOT NULL DEFAULT nextval('siac_productos_categorias_id_seq'::regclass),
  company_id integer NOT NULL,
  codigo_categoria character varying(20) NOT NULL,
  nombre_categoria character varying(100) NOT NULL,
  descripcion text,
  categoria_padre_id integer,
  nivel_jerarquia integer DEFAULT 1,
  orden_visualizacion integer DEFAULT 1,
  imagen_url character varying(500),
  configuracion_especial jsonb DEFAULT '{}'::jsonb,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_productos_componentes
CREATE TABLE IF NOT EXISTS siac_productos_componentes (
  id integer NOT NULL DEFAULT nextval('siac_productos_componentes_id_seq'::regclass),
  producto_padre_id integer NOT NULL,
  producto_componente_id integer NOT NULL,
  cantidad_componente numeric(10,4) NOT NULL DEFAULT 1,
  precio_componente numeric(15,4),
  es_opcional boolean DEFAULT false,
  orden_visualizacion integer DEFAULT 1,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_productos_marcas
CREATE TABLE IF NOT EXISTS siac_productos_marcas (
  id integer NOT NULL DEFAULT nextval('siac_productos_marcas_id_seq'::regclass),
  company_id integer NOT NULL,
  codigo_marca character varying(20) NOT NULL,
  nombre_marca character varying(100) NOT NULL,
  descripcion text,
  logo_url character varying(500),
  sitio_web character varying(255),
  contacto_proveedor character varying(255),
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_productos_precios
CREATE TABLE IF NOT EXISTS siac_productos_precios (
  id integer NOT NULL DEFAULT nextval('siac_productos_precios_id_seq'::regclass),
  producto_id integer NOT NULL,
  lista_precios_id integer NOT NULL,
  precio_especial numeric(15,4) NOT NULL,
  precio_con_descuento numeric(15,4),
  descuento_porcentaje numeric(5,2) DEFAULT 0,
  fecha_vigencia_desde date DEFAULT CURRENT_DATE,
  fecha_vigencia_hasta date,
  cantidad_minima numeric(10,4) DEFAULT 1,
  activo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_puntos_venta
CREATE TABLE IF NOT EXISTS siac_puntos_venta (
  id integer NOT NULL DEFAULT nextval('siac_puntos_venta_id_seq'::regclass),
  company_id integer NOT NULL,
  codigo_punto_venta character varying(10) NOT NULL,
  nombre_punto_venta character varying(100) NOT NULL,
  direccion text,
  telefono character varying(50),
  email character varying(100),
  responsable_nombre character varying(100),
  responsable_documento character varying(20),
  cuit_empresa character varying(13) NOT NULL,
  razon_social_empresa character varying(200) NOT NULL,
  condicion_iva character varying(50) NOT NULL DEFAULT 'RESPONSABLE_INSCRIPTO'::character varying,
  punto_venta_afip integer,
  certificado_afip text,
  clave_fiscal text,
  permite_factura_a boolean DEFAULT true,
  permite_factura_b boolean DEFAULT true,
  permite_factura_c boolean DEFAULT true,
  permite_nota_credito boolean DEFAULT true,
  permite_nota_debito boolean DEFAULT true,
  permite_presupuestos boolean DEFAULT true,
  activo boolean DEFAULT true,
  predeterminado boolean DEFAULT false,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by integer,
  updated_by integer
);

-- Tabla: siac_sesiones_caja
CREATE TABLE IF NOT EXISTS siac_sesiones_caja (
  id integer NOT NULL DEFAULT nextval('siac_sesiones_caja_id_seq'::regclass),
  caja_id integer NOT NULL,
  fecha_apertura timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre timestamp without time zone,
  usuario_apertura integer NOT NULL,
  usuario_cierre integer,
  monto_inicial_efectivo numeric(12,2) DEFAULT 0,
  monto_final_efectivo numeric(12,2) DEFAULT 0,
  diferencia_efectivo numeric(12,2) DEFAULT 0,
  total_ventas_efectivo numeric(12,2) DEFAULT 0,
  total_ventas_tarjetas numeric(12,2) DEFAULT 0,
  total_ventas_otros numeric(12,2) DEFAULT 0,
  total_ventas_sesion numeric(12,2) DEFAULT 0,
  cantidad_facturas integer DEFAULT 0,
  cantidad_notas_credito integer DEFAULT 0,
  cantidad_anulaciones integer DEFAULT 0,
  estado character varying(20) DEFAULT 'ABIERTA'::character varying,
  observaciones_apertura text,
  observaciones_cierre text,
  motivo_diferencia text,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_sesiones_locales
CREATE TABLE IF NOT EXISTS siac_sesiones_locales (
  id integer NOT NULL DEFAULT nextval('siac_sesiones_locales_id_seq'::regclass),
  company_id integer NOT NULL,
  session_id character varying(100) NOT NULL,
  terminal_id character varying(50) NOT NULL,
  user_id integer NOT NULL,
  facturacion_temp jsonb DEFAULT '[]'::jsonb,
  recibos_temp jsonb DEFAULT '[]'::jsonb,
  ordenes_pago_temp jsonb DEFAULT '[]'::jsonb,
  otros_temp jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  locked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  last_activity timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  configuracion_local jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_stock_movimientos
CREATE TABLE IF NOT EXISTS siac_stock_movimientos (
  id integer NOT NULL DEFAULT nextval('siac_stock_movimientos_id_seq'::regclass),
  company_id integer NOT NULL,
  producto_id integer NOT NULL,
  tipo_movimiento character varying(20) NOT NULL,
  cantidad numeric(15,4) NOT NULL,
  precio_unitario numeric(15,4) DEFAULT 0,
  stock_anterior numeric(15,4) NOT NULL,
  stock_resultante numeric(15,4) NOT NULL,
  factura_id integer,
  compra_id integer,
  ajuste_id integer,
  motivo character varying(100),
  observaciones text,
  lote character varying(50),
  fecha_vencimiento date,
  deposito character varying(50) DEFAULT 'PRINCIPAL'::character varying,
  ubicacion character varying(100),
  usuario_id integer,
  fecha_movimiento timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_tipos_comprobantes
CREATE TABLE IF NOT EXISTS siac_tipos_comprobantes (
  id integer NOT NULL DEFAULT nextval('siac_tipos_comprobantes_id_seq'::regclass),
  company_id integer NOT NULL,
  codigo_tipo character varying(10) NOT NULL,
  nombre_tipo character varying(100) NOT NULL,
  descripcion text,
  codigo_afip integer,
  letra_comprobante character(1),
  discrimina_iva boolean DEFAULT false,
  es_factura boolean DEFAULT true,
  es_nota_credito boolean DEFAULT false,
  es_nota_debito boolean DEFAULT false,
  es_presupuesto boolean DEFAULT false,
  afecta_stock boolean DEFAULT true,
  afecta_cuenta_corriente boolean DEFAULT true,
  requiere_autorizacion boolean DEFAULT false,
  permite_descuento boolean DEFAULT true,
  usa_numeracion_automatica boolean DEFAULT true,
  formato_numero character varying(50) DEFAULT '00000-00000000'::character varying,
  activo boolean DEFAULT true,
  predeterminado boolean DEFAULT false,
  configuracion_adicional jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: siac_transacciones_pendientes
CREATE TABLE IF NOT EXISTS siac_transacciones_pendientes (
  id integer NOT NULL DEFAULT nextval('siac_transacciones_pendientes_id_seq'::regclass),
  company_id integer NOT NULL,
  session_id character varying(100) NOT NULL,
  tipo_operacion character varying(50) NOT NULL,
  estado character varying(20) DEFAULT 'INICIADA'::character varying,
  datos_operacion jsonb NOT NULL,
  numero_comprobante integer,
  iniciada_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  completada_at timestamp without time zone,
  error_message text,
  reintentos integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Tabla: sla_metrics
CREATE TABLE IF NOT EXISTS sla_metrics (
  id integer NOT NULL DEFAULT nextval('sla_metrics_id_seq'::regclass),
  approver_id character varying(100),
  approver_role character varying(50),
  department_id integer,
  request_type character varying(50),
  company_id integer NOT NULL,
  total_requests integer DEFAULT 0,
  avg_response_hours numeric(10,2),
  median_response_hours numeric(10,2),
  min_response_hours numeric(10,2),
  max_response_hours numeric(10,2),
  sla_target_hours integer,
  within_sla_count integer DEFAULT 0,
  outside_sla_count integer DEFAULT 0,
  sla_compliance_percent numeric(5,2),
  period_start date,
  period_end date
);

-- Tabla: sports_catalog
CREATE TABLE IF NOT EXISTS sports_catalog (
  id integer NOT NULL DEFAULT nextval('sports_catalog_id_seq'::regclass),
  name character varying(100) NOT NULL,
  category character varying(50),
  is_extreme boolean DEFAULT false,
  risk_level character varying(20) DEFAULT 'low'::character varying,
  requires_medical_clearance boolean DEFAULT false,
  description text,
  is_active boolean DEFAULT true
);

-- Tabla: super_users
CREATE TABLE IF NOT EXISTS super_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying(50) NOT NULL,
  password character varying(255) NOT NULL,
  full_name character varying(200) NOT NULL,
  email character varying(255) NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  last_login timestamp without time zone
);

-- Tabla: support_activity_log
CREATE TABLE IF NOT EXISTS support_activity_log (
  log_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL,
  support_user_id uuid NOT NULL,
  company_id integer NOT NULL,
  session_id uuid NOT NULL,
  session_started_at timestamp with time zone,
  session_ended_at timestamp with time zone,
  activity_type character varying(100) NOT NULL,
  module_name character varying(100),
  action_description text NOT NULL,
  affected_data jsonb,
  ip_address character varying(45),
  user_agent text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: support_assistant_attempts
CREATE TABLE IF NOT EXISTS support_assistant_attempts (
  attempt_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL,
  assistant_type character varying(50) NOT NULL,
  user_question text NOT NULL,
  assistant_response text NOT NULL,
  confidence_score numeric(3,2),
  user_satisfied boolean,
  user_feedback text,
  attempted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  responded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: support_escalations
CREATE TABLE IF NOT EXISTS support_escalations (
  escalation_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL,
  escalated_from_user_id uuid,
  escalated_to_user_id uuid NOT NULL,
  escalation_reason character varying(100) NOT NULL,
  escalated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  resolved_at timestamp with time zone,
  escalation_notes text,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: support_sla_config
CREATE TABLE IF NOT EXISTS support_sla_config (
  id integer NOT NULL DEFAULT nextval('support_sla_config_id_seq'::regclass),
  priority character varying(20) NOT NULL,
  response_time_hours integer NOT NULL,
  resolution_time_hours integer NOT NULL,
  escalation_time_hours integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: support_sla_plans
CREATE TABLE IF NOT EXISTS support_sla_plans (
  plan_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  plan_name character varying(100) NOT NULL,
  display_name character varying(200) NOT NULL,
  first_response_hours integer NOT NULL,
  resolution_hours integer NOT NULL,
  escalation_hours integer NOT NULL,
  price_monthly numeric(10,2) DEFAULT 0.00,
  has_ai_assistant boolean DEFAULT false,
  priority_level integer DEFAULT 3,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: support_ticket_escalations
CREATE TABLE IF NOT EXISTS support_ticket_escalations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  from_level integer NOT NULL,
  to_level integer NOT NULL,
  from_staff_id uuid,
  to_staff_id uuid,
  escalation_type character varying(20) NOT NULL,
  reason text,
  escalated_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla: support_ticket_messages
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  message_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_role character varying(50) NOT NULL,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_internal boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ticket_number character varying(50) NOT NULL,
  company_id integer NOT NULL,
  created_by_user_id uuid NOT NULL,
  module_name character varying(100) NOT NULL,
  module_display_name character varying(200),
  subject character varying(500) NOT NULL,
  description text NOT NULL,
  priority character varying(20) DEFAULT 'medium'::character varying,
  allow_support_access boolean DEFAULT false,
  temp_support_user_id uuid,
  temp_password_hash character varying(255),
  temp_password_expires_at timestamp with time zone,
  temp_access_granted_at timestamp with time zone,
  assigned_to_vendor_id uuid,
  assigned_at timestamp with time zone,
  status character varying(50) DEFAULT 'open'::character varying,
  closed_by_user_id uuid,
  closed_at timestamp with time zone,
  close_reason text,
  rating integer,
  rating_comment text,
  rated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  sla_first_response_deadline timestamp with time zone,
  sla_resolution_deadline timestamp with time zone,
  sla_escalation_deadline timestamp with time zone,
  first_response_at timestamp with time zone,
  escalated_to_supervisor_id uuid,
  assistant_attempted boolean DEFAULT false,
  assistant_resolved boolean DEFAULT false,
  thread_id uuid,
  notification_id uuid,
  feedback text,
  escalation_level integer DEFAULT 1,
  assigned_staff_id uuid,
  escalated_at timestamp with time zone,
  escalation_reason text,
  sla_breach_at timestamp with time zone
);

-- Tabla: support_vendor_stats
CREATE TABLE IF NOT EXISTS support_vendor_stats (
  stat_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  vendor_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_tickets integer DEFAULT 0,
  tickets_resolved integer DEFAULT 0,
  tickets_closed integer DEFAULT 0,
  avg_resolution_time_hours numeric(10,2),
  avg_rating numeric(3,2),
  calculated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: support_vendor_supervisors
CREATE TABLE IF NOT EXISTS support_vendor_supervisors (
  assignment_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  vendor_id uuid NOT NULL,
  supervisor_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  assigned_by_user_id uuid,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: suspension_blocks
CREATE TABLE IF NOT EXISTS suspension_blocks (
  id integer NOT NULL DEFAULT nextval('suspension_blocks_id_seq'::regclass),
  sanction_id integer,
  employee_id uuid,
  company_id integer,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_work_days integer NOT NULL,
  days_served integer DEFAULT 0,
  is_active boolean DEFAULT true,
  block_type character varying(50) DEFAULT 'full'::character varying,
  blocked_actions jsonb DEFAULT '["checkin", "checkout"]'::jsonb,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  deactivated_at timestamp without time zone,
  deactivated_by uuid
);

-- Tabla: system_config
CREATE TABLE IF NOT EXISTS system_config (
  id uuid NOT NULL,
  connectionMode enum_system_config_connectionMode DEFAULT 'local'::"enum_system_config_connectionMode",
  toleranceMinutesEntry integer DEFAULT 10,
  toleranceMinutesExit integer DEFAULT 15,
  maxOvertimeHours numeric(4,2) DEFAULT 3,
  gpsRadius integer DEFAULT 50,
  requireAdminApproval boolean DEFAULT true,
  sendNotifications boolean DEFAULT true,
  autoBackup boolean DEFAULT true,
  backupHour integer DEFAULT 2,
  maxLoginAttempts integer DEFAULT 5,
  lockoutDuration integer DEFAULT 30,
  sessionTimeout integer DEFAULT 24,
  companyName character varying(255) DEFAULT 'Mi Empresa'::character varying,
  companyLogo character varying(255),
  timezone character varying(255) DEFAULT 'America/Argentina/Buenos_Aires'::character varying,
  locale character varying(255) DEFAULT 'es-AR'::character varying,
  currency character varying(255) DEFAULT 'ARS'::character varying,
  emailSettings json DEFAULT '{}'::json,
  smsSettings json DEFAULT '{}'::json,
  whatsappSettings json DEFAULT '{}'::json,
  biometricSettings json DEFAULT '{"fingerprintEnabled":true,"faceRecognitionEnabled":true,"maxFingerprints":5,"readerType":"zkteco"}'::json,
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL
);

-- Tabla: system_consciousness_log
CREATE TABLE IF NOT EXISTS system_consciousness_log (
  log_id bigint NOT NULL DEFAULT nextval('system_consciousness_log_log_id_seq'::regclass),
  event_type character varying(50) NOT NULL,
  module_key character varying(100),
  company_id integer,
  event_data jsonb,
  result character varying(20) NOT NULL,
  message text,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: system_metadata
CREATE TABLE IF NOT EXISTS system_metadata (
  metadata_id integer NOT NULL DEFAULT nextval('system_metadata_metadata_id_seq'::regclass),
  metadata_key character varying(100) NOT NULL,
  metadata_value jsonb NOT NULL,
  metadata_type character varying(50) NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: system_modules
CREATE TABLE IF NOT EXISTS system_modules (
  id uuid NOT NULL,
  module_key character varying(50) NOT NULL,
  name character varying(100) NOT NULL,
  description text,
  icon character varying(50),
  color character varying(7),
  category enum_system_modules_category NOT NULL DEFAULT 'core'::enum_system_modules_category,
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_core boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  requirements jsonb DEFAULT '[]'::jsonb,
  version character varying(20) NOT NULL DEFAULT '1.0.0'::character varying,
  min_employees integer,
  max_employees integer,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  rubro character varying(100) DEFAULT 'General'::character varying,
  bundled_modules jsonb DEFAULT '[]'::jsonb,
  available_in character varying(20) DEFAULT 'both'::character varying,
  provides_to jsonb DEFAULT '[]'::jsonb,
  integrates_with jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Tabla: system_modules_registry
CREATE TABLE IF NOT EXISTS system_modules_registry (
  registry_id integer NOT NULL DEFAULT nextval('system_modules_registry_registry_id_seq'::regclass),
  module_key character varying(100) NOT NULL,
  module_name character varying(255) NOT NULL,
  module_category character varying(50) NOT NULL,
  pricing numeric(10,2) DEFAULT 0.00,
  dependencies jsonb DEFAULT '[]'::jsonb,
  optional_dependencies jsonb DEFAULT '[]'::jsonb,
  provides_to jsonb DEFAULT '[]'::jsonb,
  integrates_with jsonb DEFAULT '[]'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  features jsonb DEFAULT '[]'::jsonb,
  description text,
  icon character varying(50),
  version character varying(20) DEFAULT '1.0.0'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: task_compatibility
CREATE TABLE IF NOT EXISTS task_compatibility (
  id integer NOT NULL DEFAULT nextval('task_compatibility_id_seq'::regclass),
  company_id integer NOT NULL,
  primary_user_id uuid NOT NULL,
  cover_user_id uuid NOT NULL,
  compatibility_score numeric(5,2) DEFAULT 0,
  coverable_tasks jsonb DEFAULT '[]'::jsonb,
  max_coverage_hours integer,
  max_concurrent_tasks integer DEFAULT 3,
  last_performance_score numeric(5,2),
  total_coverage_hours integer DEFAULT 0,
  successful_coverages integer DEFAULT 0,
  is_auto_calculated boolean DEFAULT false,
  last_calculation_date date,
  calculation_data jsonb,
  is_active boolean DEFAULT true,
  manual_notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: tax_concepts
CREATE TABLE IF NOT EXISTS tax_concepts (
  id integer NOT NULL DEFAULT nextval('tax_concepts_id_seq'::regclass),
  tax_template_id integer NOT NULL,
  concept_code character varying(20) NOT NULL,
  concept_name character varying(100) NOT NULL,
  description text,
  calculation_order integer NOT NULL DEFAULT 1,
  base_amount character varying(20) NOT NULL DEFAULT 'neto_final'::character varying,
  concept_type character varying(20) NOT NULL DEFAULT 'tax'::character varying,
  is_percentage boolean DEFAULT true,
  is_compound boolean DEFAULT false,
  affects_total boolean DEFAULT true,
  is_mandatory boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: tax_conditions
CREATE TABLE IF NOT EXISTS tax_conditions (
  id integer NOT NULL DEFAULT nextval('tax_conditions_id_seq'::regclass),
  tax_template_id integer NOT NULL,
  condition_code character varying(20) NOT NULL,
  condition_name character varying(100) NOT NULL,
  description text,
  display_order integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: tax_rates
CREATE TABLE IF NOT EXISTS tax_rates (
  id integer NOT NULL DEFAULT nextval('tax_rates_id_seq'::regclass),
  tax_concept_id integer NOT NULL,
  rate_code character varying(20) NOT NULL,
  rate_name character varying(100) NOT NULL,
  rate_percentage numeric(8,4) NOT NULL,
  minimum_amount numeric(15,4) DEFAULT 0,
  maximum_amount numeric(15,4),
  is_default boolean DEFAULT false,
  applicable_conditions jsonb,
  date_from date,
  date_to date,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: tax_templates
CREATE TABLE IF NOT EXISTS tax_templates (
  id integer NOT NULL DEFAULT nextval('tax_templates_id_seq'::regclass),
  country character varying(50) NOT NULL,
  country_code character varying(3) NOT NULL,
  template_name character varying(100) NOT NULL,
  tax_id_format character varying(50),
  tax_id_field_name character varying(50) DEFAULT 'CUIT'::character varying,
  tax_id_validation_regex character varying(200),
  remove_separators boolean DEFAULT true,
  currencies jsonb DEFAULT '["ARS"]'::jsonb,
  default_currency character varying(3) DEFAULT 'ARS'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  tax_id_field_description character varying(200),
  tax_id_format_mask character varying(50),
  tax_id_min_length integer DEFAULT 8,
  tax_id_max_length integer DEFAULT 15,
  tax_id_required_for_invoicing boolean DEFAULT true
);

-- Tabla: test_executions
CREATE TABLE IF NOT EXISTS test_executions (
  id integer NOT NULL DEFAULT nextval('test_executions_id_seq'::regclass),
  execution_id uuid NOT NULL,
  environment character varying(20) NOT NULL,
  module character varying(100) NOT NULL,
  company_id integer,
  company_name character varying(255),
  cycles integer NOT NULL DEFAULT 1,
  slow_mo integer NOT NULL DEFAULT 50,
  base_url character varying(500),
  status character varying(20) NOT NULL DEFAULT 'pending'::character varying,
  total_tests integer DEFAULT 0,
  ui_tests_passed integer DEFAULT 0,
  ui_tests_failed integer DEFAULT 0,
  db_tests_passed integer DEFAULT 0,
  db_tests_failed integer DEFAULT 0,
  success_rate numeric(5,2),
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  end_time timestamp with time zone,
  duration_seconds numeric(10,2),
  errors jsonb DEFAULT '[]'::jsonb,
  tickets jsonb DEFAULT '[]'::jsonb,
  logs jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabla: testing_tickets
CREATE TABLE IF NOT EXISTS testing_tickets (
  id integer NOT NULL DEFAULT nextval('testing_tickets_id_seq'::regclass),
  ticket_number character varying(20) NOT NULL,
  status character varying(50) NOT NULL DEFAULT 'PENDING_REPAIR'::character varying,
  priority character varying(20) NOT NULL DEFAULT 'medium'::character varying,
  module_name character varying(100) NOT NULL,
  error_type character varying(100),
  error_message text NOT NULL,
  error_stack text,
  error_details jsonb,
  file_path character varying(500),
  line_number integer,
  function_name character varying(255),
  test_name character varying(255),
  test_type character varying(50),
  test_context jsonb,
  created_by character varying(100) NOT NULL DEFAULT 'ollama-auditor'::character varying,
  assigned_to character varying(100) DEFAULT 'claude-code'::character varying,
  fix_attempted boolean DEFAULT false,
  fix_strategy character varying(255),
  fix_description text,
  fix_files_modified jsonb,
  fix_applied_at timestamp with time zone,
  fix_applied_by character varying(100),
  retest_count integer DEFAULT 0,
  retest_passed boolean,
  retest_last_at timestamp with time zone,
  retest_details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone,
  time_to_fix_minutes integer,
  time_to_close_minutes integer,
  last_message text,
  conversation_log jsonb DEFAULT '[]'::jsonb
);

-- Tabla: training_assignments
CREATE TABLE IF NOT EXISTS training_assignments (
  id integer NOT NULL DEFAULT nextval('training_assignments_id_seq'::regclass),
  company_id integer NOT NULL,
  training_id integer NOT NULL,
  user_id uuid NOT NULL,
  status character varying(50) DEFAULT 'pending'::character varying,
  progress_percentage integer DEFAULT 0,
  time_spent_minutes integer DEFAULT 0,
  assigned_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  due_date date,
  score numeric(5,2),
  certificate_url character varying(500),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: trainings
CREATE TABLE IF NOT EXISTS trainings (
  id integer NOT NULL DEFAULT nextval('trainings_id_seq'::regclass),
  company_id integer NOT NULL,
  title character varying(255) NOT NULL,
  description text,
  category character varying(100),
  duration integer DEFAULT 60,
  is_mandatory boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  type character varying(50),
  content_url text,
  start_date date,
  deadline date,
  instructor character varying(255),
  max_score integer DEFAULT 100,
  min_score integer DEFAULT 70,
  attempts integer DEFAULT 2,
  mandatory boolean DEFAULT false,
  certificate boolean DEFAULT false,
  status character varying(20) DEFAULT 'active'::character varying,
  participants integer DEFAULT 0,
  completed integer DEFAULT 0,
  progress integer DEFAULT 0
);

-- Tabla: unauthorized_access_attempts
CREATE TABLE IF NOT EXISTS unauthorized_access_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kiosk_id integer,
  employee_id uuid,
  company_id integer NOT NULL,
  employee_name character varying(255),
  employee_department character varying(100),
  kiosk_authorized_departments jsonb,
  attempt_type character varying(50),
  biometric_similarity numeric,
  security_photo bytea,
  timestamp timestamp without time zone DEFAULT now(),
  device_id character varying(255),
  ip_address character varying(50),
  reason character varying(255),
  requires_hr_review boolean DEFAULT true,
  reviewed_by uuid,
  reviewed_at timestamp without time zone,
  review_notes text,
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: unified_help_interactions
CREATE TABLE IF NOT EXISTS unified_help_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  interaction_type character varying(20) NOT NULL,
  question text,
  answer text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla: unified_notifications
CREATE TABLE IF NOT EXISTS unified_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id integer,
  thread_id uuid,
  parent_id uuid,
  sequence_in_thread integer DEFAULT 1,
  origin_type character varying(50) NOT NULL,
  origin_id character varying(100),
  origin_name character varying(255),
  origin_role character varying(50),
  recipient_type character varying(50) NOT NULL,
  recipient_id character varying(100),
  recipient_name character varying(255),
  recipient_role character varying(50),
  recipient_department_id integer,
  recipient_hierarchy_level integer DEFAULT 0,
  category character varying(50) NOT NULL DEFAULT 'general'::character varying,
  module character varying(50),
  notification_type character varying(100),
  priority character varying(20) DEFAULT 'medium'::character varying,
  title character varying(255) NOT NULL,
  message text NOT NULL,
  short_message character varying(280),
  metadata jsonb DEFAULT '{}'::jsonb,
  related_entity_type character varying(50),
  related_entity_id character varying(100),
  is_read boolean DEFAULT false,
  read_at timestamp without time zone,
  read_by uuid,
  requires_action boolean DEFAULT false,
  action_type character varying(50),
  action_options jsonb DEFAULT '[]'::jsonb,
  action_status character varying(50) DEFAULT 'pending'::character varying,
  action_deadline timestamp without time zone,
  action_taken_at timestamp without time zone,
  action_taken_by uuid,
  action_response text,
  action_notes text,
  workflow_id integer,
  workflow_step integer DEFAULT 0,
  workflow_status character varying(50),
  sla_hours integer,
  sla_deadline timestamp without time zone,
  sla_breached boolean DEFAULT false,
  sla_breach_at timestamp without time zone,
  escalation_level integer DEFAULT 0,
  escalated_from_id uuid,
  escalated_to_id uuid,
  escalation_reason text,
  channels jsonb DEFAULT '["app"]'::jsonb,
  sent_via_app boolean DEFAULT true,
  sent_via_email boolean DEFAULT false,
  sent_via_push boolean DEFAULT false,
  email_sent_at timestamp without time zone,
  push_sent_at timestamp without time zone,
  ai_analyzed boolean DEFAULT false,
  ai_analyzed_at timestamp without time zone,
  ai_suggested_response text,
  ai_confidence numeric(5,4),
  ai_auto_responded boolean DEFAULT false,
  ai_topic character varying(100),
  ai_sentiment character varying(20),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  expires_at timestamp without time zone,
  deleted_at timestamp without time zone,
  deleted_by uuid
);

-- Tabla: used_tokens
CREATE TABLE IF NOT EXISTS used_tokens (
  id integer NOT NULL DEFAULT nextval('used_tokens_id_seq'::regclass),
  token character varying(500) NOT NULL,
  message_id uuid,
  used_at timestamp without time zone DEFAULT now(),
  used_by character varying(100)
);

-- Tabla: user_activity_restrictions
CREATE TABLE IF NOT EXISTS user_activity_restrictions (
  id integer NOT NULL DEFAULT nextval('user_activity_restrictions_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  restriction_type character varying(100) NOT NULL,
  description text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_permanent boolean DEFAULT false,
  medical_certificate_url text,
  issuing_doctor character varying(255),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_allergies
CREATE TABLE IF NOT EXISTS user_allergies (
  id integer NOT NULL DEFAULT nextval('user_allergies_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  allergen character varying(255) NOT NULL,
  allergy_type character varying(50),
  severity character varying(50),
  symptoms text,
  diagnosed_date date,
  requires_epipen boolean DEFAULT false,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_anthropometric_data
CREATE TABLE IF NOT EXISTS user_anthropometric_data (
  id integer NOT NULL DEFAULT nextval('user_anthropometric_data_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  measurement_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  bmi numeric(4,2),
  waist_circumference_cm numeric(5,2),
  hip_circumference_cm numeric(5,2),
  body_fat_percentage numeric(4,2),
  muscle_mass_kg numeric(5,2),
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  heart_rate_bpm integer,
  blood_type character varying(5),
  rh_factor character varying(10),
  measured_by character varying(200),
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_assigned_tasks
CREATE TABLE IF NOT EXISTS user_assigned_tasks (
  id integer NOT NULL DEFAULT nextval('user_assigned_tasks_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  task_id integer NOT NULL,
  assigned_by uuid,
  assigned_date date DEFAULT CURRENT_DATE,
  due_date date,
  status character varying(50) DEFAULT 'pendiente'::character varying,
  priority character varying(50),
  progress_percentage integer DEFAULT 0,
  start_date date,
  completion_date date,
  actual_hours numeric(5,2),
  requires_approval boolean DEFAULT false,
  submitted_for_approval boolean DEFAULT false,
  approval_date date,
  approved_by uuid,
  approval_notes text,
  notes text,
  attachments jsonb,
  comments jsonb,
  reminder_sent boolean DEFAULT false,
  reminder_date date,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_audit_logs
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id integer NOT NULL DEFAULT nextval('user_audit_logs_id_seq'::regclass),
  user_id uuid NOT NULL,
  changed_by_user_id uuid,
  company_id integer,
  action character varying(50) NOT NULL,
  field_name character varying(100),
  old_value text,
  new_value text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address character varying(45),
  user_agent text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_children
CREATE TABLE IF NOT EXISTS user_children (
  id integer NOT NULL DEFAULT nextval('user_children_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  full_name character varying(255) NOT NULL,
  dni character varying(50),
  birth_date date NOT NULL,
  gender character varying(20),
  lives_with_employee boolean DEFAULT true,
  is_dependent boolean DEFAULT true,
  health_insurance_coverage boolean DEFAULT false,
  special_needs text,
  school_name character varying(255),
  grade_level character varying(50),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_chronic_conditions
CREATE TABLE IF NOT EXISTS user_chronic_conditions (
  id integer NOT NULL DEFAULT nextval('user_chronic_conditions_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  condition_name character varying(255) NOT NULL,
  diagnosis_date date,
  severity character varying(50),
  requires_treatment boolean DEFAULT false,
  requires_monitoring boolean DEFAULT false,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_chronic_conditions_v2
CREATE TABLE IF NOT EXISTS user_chronic_conditions_v2 (
  id integer NOT NULL DEFAULT nextval('user_chronic_conditions_v2_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  condition_catalog_id integer,
  condition_name character varying(200),
  diagnosis_date date,
  diagnosed_by character varying(200),
  severity character varying(20) DEFAULT 'moderate'::character varying,
  current_status character varying(30) DEFAULT 'active'::character varying,
  treatment_status character varying(30),
  affects_work_capacity boolean DEFAULT false,
  work_restrictions text,
  medications_required text,
  monitoring_frequency character varying(50),
  last_checkup_date date,
  next_checkup_date date,
  specialist_doctor character varying(200),
  specialist_phone character varying(50),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_consents
CREATE TABLE IF NOT EXISTS user_consents (
  user_consent_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id integer NOT NULL,
  user_type character varying(50) NOT NULL,
  consent_id uuid NOT NULL,
  consent_version character varying(20) NOT NULL,
  status character varying(20) NOT NULL,
  accepted_at timestamp without time zone,
  rejected_at timestamp without time zone,
  revoked_at timestamp without time zone,
  ip_address character varying(45),
  user_agent text,
  signature_data text,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  company_id integer
);

-- Tabla: user_contact_history
CREATE TABLE IF NOT EXISTS user_contact_history (
  id integer NOT NULL DEFAULT nextval('user_contact_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  field_name character varying(100) NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  change_reason text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_disciplinary_actions
CREATE TABLE IF NOT EXISTS user_disciplinary_actions (
  id integer NOT NULL DEFAULT nextval('user_disciplinary_actions_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  action_type character varying(100) NOT NULL,
  severity character varying(50),
  date_occurred date NOT NULL,
  description text NOT NULL,
  action_taken text NOT NULL,
  issued_by uuid NOT NULL,
  issued_date date DEFAULT CURRENT_DATE,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  employee_acknowledgement boolean DEFAULT false,
  employee_comments text,
  supporting_document_url text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_documents
CREATE TABLE IF NOT EXISTS user_documents (
  id integer NOT NULL DEFAULT nextval('user_documents_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  document_type character varying(100) NOT NULL,
  document_number character varying(100),
  issue_date date,
  expiration_date date,
  issuing_authority character varying(255),
  file_url text,
  is_verified boolean DEFAULT false,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_driver_licenses
CREATE TABLE IF NOT EXISTS user_driver_licenses (
  id integer NOT NULL DEFAULT nextval('user_driver_licenses_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  license_type character varying(50) NOT NULL,
  license_number character varying(100),
  license_class character varying(20),
  subclass character varying(50),
  issue_date date,
  expiry_date date,
  photo_url text,
  issuing_authority character varying(255),
  issuing_country character varying(100) DEFAULT 'Argentina'::character varying,
  restrictions text,
  observations text,
  requires_glasses boolean DEFAULT false,
  is_active boolean DEFAULT true,
  suspension_start_date date,
  suspension_end_date date,
  suspension_reason text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_education
CREATE TABLE IF NOT EXISTS user_education (
  id integer NOT NULL DEFAULT nextval('user_education_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  education_level character varying(100) NOT NULL,
  institution_name character varying(255) NOT NULL,
  degree_title character varying(255),
  field_of_study character varying(255),
  start_date date,
  end_date date,
  graduated boolean DEFAULT false,
  certificate_file_url text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_emails
CREATE TABLE IF NOT EXISTS user_emails (
  id integer NOT NULL DEFAULT nextval('user_emails_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  email character varying(255) NOT NULL,
  is_primary boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  verification_token character varying(255),
  verified_at timestamp without time zone,
  receive_system_notifications boolean DEFAULT true,
  receive_attendance_alerts boolean DEFAULT true,
  receive_vacation_updates boolean DEFAULT true,
  receive_medical_notifications boolean DEFAULT true,
  receive_legal_notices boolean DEFAULT true,
  receive_shifts_changes boolean DEFAULT true,
  receive_payroll_notifications boolean DEFAULT true,
  email_format character varying(20) DEFAULT 'html'::character varying,
  email_frequency character varying(20) DEFAULT 'instant'::character varying,
  is_active boolean DEFAULT true,
  bounced boolean DEFAULT false,
  bounced_at timestamp without time zone,
  bounce_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  last_email_sent timestamp without time zone
);

-- Tabla: user_family_members
CREATE TABLE IF NOT EXISTS user_family_members (
  id integer NOT NULL DEFAULT nextval('user_family_members_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  full_name character varying(255) NOT NULL,
  relationship character varying(100) NOT NULL,
  dni character varying(50),
  birth_date date,
  phone character varying(50),
  lives_with_employee boolean DEFAULT false,
  is_dependent boolean DEFAULT false,
  is_emergency_contact boolean DEFAULT false,
  health_insurance_coverage boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_healthy_habits
CREATE TABLE IF NOT EXISTS user_healthy_habits (
  id integer NOT NULL DEFAULT nextval('user_healthy_habits_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  does_regular_exercise boolean DEFAULT false,
  exercise_minutes_per_week integer,
  sedentary_hours_per_day integer,
  smoking_status character varying(30),
  cigarettes_per_day integer,
  smoking_years integer,
  quit_date date,
  alcohol_consumption character varying(30),
  drinks_per_week integer,
  diet_type character varying(50),
  diet_restrictions text,
  meals_per_day integer,
  drinks_water_liters numeric(3,1),
  average_sleep_hours numeric(3,1),
  sleep_quality character varying(30),
  has_sleep_disorders boolean DEFAULT false,
  sleep_disorder_details text,
  stress_level character varying(30),
  stress_management_activities text,
  last_general_checkup date,
  last_dental_checkup date,
  last_vision_checkup date,
  last_gynecological_checkup date,
  last_urological_checkup date,
  notes text,
  last_updated date DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_legal_issues
CREATE TABLE IF NOT EXISTS user_legal_issues (
  id integer NOT NULL DEFAULT nextval('user_legal_issues_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  issue_type character varying(100) NOT NULL,
  issue_subtype character varying(255),
  case_number character varying(100),
  court character varying(255),
  jurisdiction character varying(255),
  filing_date date,
  resolution_date date,
  last_hearing_date date,
  next_hearing_date date,
  status character varying(50),
  description text,
  plaintiff character varying(255),
  defendant character varying(255),
  outcome text,
  sentence_details text,
  fine_amount numeric(12,2),
  affects_employment boolean DEFAULT false,
  employment_restriction_details text,
  document_url text,
  notes text,
  is_confidential boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_locked boolean DEFAULT false,
  locked_at timestamp without time zone,
  edit_count integer DEFAULT 0,
  last_edited_by uuid,
  last_edited_at timestamp without time zone,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp without time zone,
  deleted_by uuid,
  deletion_reason text
);

-- Tabla: user_marital_status
CREATE TABLE IF NOT EXISTS user_marital_status (
  id integer NOT NULL DEFAULT nextval('user_marital_status_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  marital_status character varying(50) NOT NULL,
  spouse_name character varying(255),
  spouse_dni character varying(50),
  spouse_phone character varying(50),
  spouse_occupation character varying(255),
  marriage_date date,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_medical_documents
CREATE TABLE IF NOT EXISTS user_medical_documents (
  id integer NOT NULL DEFAULT nextval('user_medical_documents_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  document_type character varying(100) NOT NULL,
  document_name character varying(255) NOT NULL,
  file_url text NOT NULL,
  upload_date date DEFAULT CURRENT_DATE,
  expiration_date date,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_medical_exams
CREATE TABLE IF NOT EXISTS user_medical_exams (
  id integer NOT NULL DEFAULT nextval('user_medical_exams_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  exam_type character varying(100) NOT NULL,
  exam_date date NOT NULL,
  result character varying(50),
  observations text,
  next_exam_date date,
  medical_center character varying(255),
  examining_doctor character varying(255),
  certificate_url text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_medications
CREATE TABLE IF NOT EXISTS user_medications (
  id integer NOT NULL DEFAULT nextval('user_medications_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  medication_name character varying(255) NOT NULL,
  dosage character varying(100),
  frequency character varying(100),
  route character varying(50),
  start_date date,
  end_date date,
  is_continuous boolean DEFAULT false,
  prescribing_doctor character varying(255),
  purpose text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_notification_preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id integer NOT NULL DEFAULT nextval('user_notification_preferences_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer,
  module character varying(50),
  receive_app boolean DEFAULT true,
  receive_email boolean DEFAULT true,
  receive_push boolean DEFAULT true,
  receive_whatsapp boolean DEFAULT false,
  receive_sms boolean DEFAULT false,
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
  quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone,
  quiet_days jsonb DEFAULT '[]'::jsonb,
  daily_digest boolean DEFAULT false,
  digest_time time without time zone DEFAULT '08:00:00'::time without time zone,
  allow_ai_responses boolean DEFAULT true,
  ai_auto_respond_threshold numeric(3,2) DEFAULT 0.85,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: user_payroll_assignment
CREATE TABLE IF NOT EXISTS user_payroll_assignment (
  id integer NOT NULL DEFAULT nextval('user_payroll_assignment_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  branch_id integer,
  template_id integer NOT NULL,
  category_id integer,
  base_salary numeric(15,2) NOT NULL,
  hourly_rate numeric(10,4),
  calculation_basis character varying(20) DEFAULT 'monthly'::character varying,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_current boolean DEFAULT true,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  assignment_id integer,
  salary_type character varying(20) DEFAULT 'monthly'::character varying,
  bank_name character varying(100),
  bank_account_number character varying(50),
  bank_account_type character varying(20),
  payment_method character varying(20) DEFAULT 'bank_transfer'::character varying,
  tax_id character varying(20),
  hire_date date,
  seniority_date date,
  termination_date date,
  work_schedule jsonb DEFAULT '{"type": "full_time", "days_per_week": 5, "hours_per_week": 40}'::jsonb,
  notes text,
  is_active boolean DEFAULT true
);

-- Tabla: user_payroll_bonuses
CREATE TABLE IF NOT EXISTS user_payroll_bonuses (
  id integer NOT NULL DEFAULT nextval('user_payroll_bonuses_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  bonus_code character varying(50) NOT NULL,
  bonus_name character varying(200) NOT NULL,
  description text,
  bonus_type character varying(30) NOT NULL,
  concept_type_id integer,
  amount numeric(15,2),
  percentage numeric(6,4),
  percentage_base character varying(100),
  frequency character varying(30) NOT NULL DEFAULT 'monthly'::character varying,
  next_payment_date date,
  last_payment_date date,
  requires_approval boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamp without time zone,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  reason_category character varying(50),
  reason_detail text,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  bonus_id integer,
  is_remunerative boolean DEFAULT true,
  is_taxable boolean DEFAULT true,
  payment_month integer,
  reason text
);

-- Tabla: user_payroll_concept_overrides
CREATE TABLE IF NOT EXISTS user_payroll_concept_overrides (
  id integer NOT NULL DEFAULT nextval('user_payroll_concept_overrides_id_seq'::regclass),
  user_id uuid NOT NULL,
  assignment_id integer NOT NULL,
  template_concept_id integer,
  concept_type_id integer,
  custom_concept_code character varying(50),
  custom_concept_name character varying(200),
  override_value numeric(15,4),
  override_percentage numeric(6,4),
  is_percentage boolean DEFAULT false,
  is_active boolean DEFAULT true,
  applies_from date,
  applies_to date,
  reason text,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  override_id integer,
  concept_id integer,
  override_type character varying(20) DEFAULT 'replace'::character varying,
  fixed_amount numeric(15,2),
  percentage_value numeric(8,4),
  is_remunerative boolean,
  approved_by uuid,
  approved_at timestamp without time zone,
  effective_to date
);

-- Tabla: user_payroll_records
CREATE TABLE IF NOT EXISTS user_payroll_records (
  id integer NOT NULL DEFAULT nextval('user_payroll_records_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_type character varying(30),
  payment_date date,
  base_salary numeric(12,2),
  seniority_bonus numeric(12,2) DEFAULT 0,
  presentation_bonus numeric(12,2) DEFAULT 0,
  overtime_hours numeric(6,2) DEFAULT 0,
  overtime_50_amount numeric(12,2) DEFAULT 0,
  overtime_100_amount numeric(12,2) DEFAULT 0,
  vacation_days_paid integer DEFAULT 0,
  vacation_amount numeric(12,2) DEFAULT 0,
  sac_aguinaldo numeric(12,2) DEFAULT 0,
  commissions numeric(12,2) DEFAULT 0,
  bonuses numeric(12,2) DEFAULT 0,
  other_earnings numeric(12,2) DEFAULT 0,
  other_earnings_detail text,
  gross_total numeric(12,2),
  jubilacion numeric(12,2) DEFAULT 0,
  obra_social numeric(12,2) DEFAULT 0,
  ley_19032 numeric(12,2) DEFAULT 0,
  sindicato numeric(12,2) DEFAULT 0,
  ganancias numeric(12,2) DEFAULT 0,
  other_deductions numeric(12,2) DEFAULT 0,
  other_deductions_detail text,
  deductions_total numeric(12,2),
  net_salary numeric(12,2),
  regular_hours_worked numeric(6,2),
  overtime_50_hours numeric(6,2) DEFAULT 0,
  overtime_100_hours numeric(6,2) DEFAULT 0,
  total_hours_worked numeric(6,2),
  days_worked integer,
  absent_days integer DEFAULT 0,
  vacation_days_taken integer DEFAULT 0,
  sick_days integer DEFAULT 0,
  status character varying(30) DEFAULT 'draft'::character varying,
  receipt_number character varying(50),
  digital_receipt_url text,
  signed_by_employee boolean DEFAULT false,
  signed_date date,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  approved_by uuid
);

-- Tabla: user_permission_requests
CREATE TABLE IF NOT EXISTS user_permission_requests (
  id integer NOT NULL DEFAULT nextval('user_permission_requests_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  request_type character varying(100) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL,
  reason text,
  status character varying(50) DEFAULT 'pendiente'::character varying,
  requested_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  approved_by uuid,
  approval_date timestamp without time zone,
  rejection_reason text,
  supporting_document_url text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  module_id character varying(50) NOT NULL,
  action_id character varying(100) NOT NULL,
  has_access boolean DEFAULT true,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now(),
  revoked_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: user_primary_physician
CREATE TABLE IF NOT EXISTS user_primary_physician (
  id integer NOT NULL DEFAULT nextval('user_primary_physician_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  physician_name character varying(255) NOT NULL,
  specialty character varying(255),
  phone character varying(50),
  email character varying(255),
  clinic_name character varying(255),
  clinic_address text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_professional_licenses
CREATE TABLE IF NOT EXISTS user_professional_licenses (
  id integer NOT NULL DEFAULT nextval('user_professional_licenses_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  license_name character varying(255) NOT NULL,
  profession character varying(255),
  license_number character varying(100),
  issuing_body character varying(255),
  issuing_country character varying(100) DEFAULT 'Argentina'::character varying,
  jurisdiction character varying(255),
  issue_date date,
  expiry_date date,
  certificate_url text,
  verification_url text,
  is_active boolean DEFAULT true,
  requires_renewal boolean DEFAULT true,
  renewal_frequency character varying(50),
  last_renewal_date date,
  is_suspended boolean DEFAULT false,
  suspension_start_date date,
  suspension_end_date date,
  suspension_reason text,
  specializations text,
  observations text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_psychiatric_treatments
CREATE TABLE IF NOT EXISTS user_psychiatric_treatments (
  id integer NOT NULL DEFAULT nextval('user_psychiatric_treatments_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  treatment_type character varying(50) NOT NULL,
  condition_treated character varying(200),
  diagnosis_date date,
  treatment_start_date date,
  treatment_end_date date,
  is_current boolean DEFAULT true,
  treating_professional character varying(200),
  professional_type character varying(50),
  professional_license character varying(50),
  professional_phone character varying(50),
  session_frequency character varying(50),
  takes_psychiatric_medication boolean DEFAULT false,
  medication_details text,
  medication_side_effects text,
  affects_work_performance boolean DEFAULT false,
  work_accommodations_needed text,
  emergency_protocol text,
  hospitalization_history boolean DEFAULT false,
  hospitalization_details text,
  last_crisis_date date,
  crisis_frequency character varying(50),
  confidentiality_level character varying(20) DEFAULT 'restricted'::character varying,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_role_assignments
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id integer NOT NULL DEFAULT nextval('user_role_assignments_id_seq'::regclass),
  user_id uuid NOT NULL,
  role_id integer NOT NULL,
  scope_override jsonb,
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  is_active boolean DEFAULT true,
  is_primary boolean DEFAULT false,
  assigned_at timestamp without time zone DEFAULT now(),
  assigned_by uuid,
  deactivated_at timestamp without time zone,
  deactivated_by uuid,
  deactivation_reason text
);

-- Tabla: user_salary_config
CREATE TABLE IF NOT EXISTS user_salary_config (
  id integer NOT NULL DEFAULT nextval('user_salary_config_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  base_salary numeric(12,2) NOT NULL,
  salary_currency character varying(10) DEFAULT 'ARS'::character varying,
  salary_type character varying(50),
  payment_frequency character varying(50),
  payment_day integer,
  bank_name character varying(255),
  bank_account_number character varying(100),
  bank_account_type character varying(50),
  cbu character varying(22),
  alias_cbu character varying(100),
  swift_code character varying(15),
  payment_method character varying(50) DEFAULT 'transferencia'::character varying,
  payment_notes text,
  bonuses jsonb,
  allowances jsonb,
  deductions jsonb,
  has_obra_social boolean DEFAULT true,
  obra_social_deduction numeric(10,2),
  has_sindicato boolean DEFAULT false,
  sindicato_deduction numeric(10,2),
  tax_withholding_percentage numeric(5,2),
  has_tax_exemption boolean DEFAULT false,
  tax_exemption_reason text,
  overtime_enabled boolean DEFAULT true,
  overtime_rate_weekday numeric(5,2) DEFAULT 1.50,
  overtime_rate_weekend numeric(5,2) DEFAULT 2.00,
  overtime_rate_holiday numeric(5,2) DEFAULT 2.00,
  vacation_days_per_year integer DEFAULT 14,
  vacation_days_used integer DEFAULT 0,
  vacation_days_pending integer DEFAULT 14,
  sac_enabled boolean DEFAULT true,
  sac_calculation_method character varying(50) DEFAULT 'best_salary'::character varying,
  last_salary_review_date date,
  next_salary_review_date date,
  salary_increase_percentage numeric(5,2),
  salary_increase_notes text,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid,
  last_updated_by uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_salary_config_v2
CREATE TABLE IF NOT EXISTS user_salary_config_v2 (
  id integer NOT NULL DEFAULT nextval('user_salary_config_v2_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  labor_agreement_id integer,
  salary_category_id integer,
  custom_category character varying(100),
  payment_type character varying(30) NOT NULL,
  base_salary numeric(12,2) NOT NULL,
  gross_salary numeric(12,2),
  net_salary numeric(12,2),
  currency character varying(10) DEFAULT 'ARS'::character varying,
  seniority_bonus numeric(12,2) DEFAULT 0,
  presentation_bonus numeric(12,2) DEFAULT 0,
  food_allowance numeric(12,2) DEFAULT 0,
  transport_allowance numeric(12,2) DEFAULT 0,
  other_bonuses numeric(12,2) DEFAULT 0,
  other_bonuses_detail text,
  contracted_hours_per_week numeric(4,1) DEFAULT 48,
  work_schedule_type character varying(30),
  hourly_rate numeric(10,2),
  overtime_rate_50 numeric(10,2),
  overtime_rate_100 numeric(10,2),
  last_salary_update date,
  previous_base_salary numeric(12,2),
  salary_increase_percentage numeric(5,2),
  salary_increase_reason character varying(200),
  next_review_date date,
  bank_name character varying(100),
  bank_account_type character varying(30),
  bank_account_number character varying(50),
  bank_cbu character varying(30),
  bank_alias character varying(50),
  effective_from date NOT NULL,
  effective_to date,
  is_current boolean DEFAULT true,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid
);

-- Tabla: user_shift_assignments
CREATE TABLE IF NOT EXISTS user_shift_assignments (
  id bigint NOT NULL DEFAULT nextval('user_shift_assignments_id_seq'::regclass),
  user_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  company_id integer NOT NULL,
  join_date date NOT NULL,
  assigned_phase character varying(50) NOT NULL,
  group_name character varying(255),
  sector character varying(100),
  assigned_by uuid,
  assigned_at timestamp without time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  deactivated_at timestamp without time zone,
  deactivated_by uuid,
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Tabla: user_shifts
CREATE TABLE IF NOT EXISTS user_shifts (
  user_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  createdAt timestamp with time zone DEFAULT now(),
  updatedAt timestamp with time zone DEFAULT now()
);

-- Tabla: user_sports_activities
CREATE TABLE IF NOT EXISTS user_sports_activities (
  id integer NOT NULL DEFAULT nextval('user_sports_activities_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  sport_catalog_id integer,
  sport_name character varying(100),
  practice_level character varying(30) NOT NULL,
  frequency character varying(30),
  hours_per_week numeric(4,1),
  years_practicing integer,
  is_federated boolean DEFAULT false,
  federation_name character varying(200),
  license_number character varying(50),
  team_club_name character varying(200),
  participates_in_competitions boolean DEFAULT false,
  competition_level character varying(50),
  competitions_per_year integer,
  last_competition_date date,
  achievements text,
  has_coach boolean DEFAULT false,
  coach_name character varying(200),
  training_location character varying(200),
  medical_clearance_required boolean DEFAULT false,
  medical_clearance_date date,
  medical_clearance_expiry date,
  is_extreme_sport boolean DEFAULT false,
  insurance_required boolean DEFAULT false,
  insurance_company character varying(200),
  insurance_policy character varying(100),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_surgeries
CREATE TABLE IF NOT EXISTS user_surgeries (
  id integer NOT NULL DEFAULT nextval('user_surgeries_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  surgery_type character varying(200) NOT NULL,
  surgery_date date,
  hospital_clinic character varying(200),
  surgeon_name character varying(200),
  reason text,
  complications boolean DEFAULT false,
  complications_details text,
  recovery_days integer,
  return_to_work_date date,
  has_permanent_effects boolean DEFAULT false,
  permanent_effects_details text,
  follow_up_required boolean DEFAULT false,
  follow_up_frequency character varying(50),
  last_follow_up_date date,
  documents_attached ARRAY,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_union_affiliation
CREATE TABLE IF NOT EXISTS user_union_affiliation (
  id integer NOT NULL DEFAULT nextval('user_union_affiliation_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  union_name character varying(255) NOT NULL,
  union_full_name character varying(500),
  union_cuit character varying(15),
  membership_number character varying(100),
  affiliation_date date NOT NULL,
  resignation_date date,
  is_active boolean DEFAULT true,
  delegate_role character varying(100),
  delegate_start_date date,
  delegate_end_date date,
  section_or_branch character varying(255),
  workplace_delegate boolean DEFAULT false,
  has_fuero_sindical boolean DEFAULT false,
  fuero_start_date date,
  fuero_end_date date,
  monthly_dues numeric(10,2),
  dues_payment_method character varying(50),
  last_payment_date date,
  union_phone character varying(50),
  union_email character varying(255),
  union_address text,
  union_delegate_contact character varying(255),
  membership_card_url text,
  certificate_url text,
  benefits text,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_vaccinations
CREATE TABLE IF NOT EXISTS user_vaccinations (
  id integer NOT NULL DEFAULT nextval('user_vaccinations_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  vaccine_name character varying(255) NOT NULL,
  vaccine_type character varying(100),
  dose_number integer,
  total_doses integer,
  date_administered date NOT NULL,
  next_dose_date date,
  administering_institution character varying(255),
  lot_number character varying(100),
  certificate_url text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_work_history
CREATE TABLE IF NOT EXISTS user_work_history (
  id integer NOT NULL DEFAULT nextval('user_work_history_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  company_name character varying(255) NOT NULL,
  position character varying(255) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  currently_working boolean DEFAULT false,
  reason_for_leaving text,
  responsibilities text,
  supervisor_name character varying(255),
  supervisor_contact character varying(100),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_work_restrictions
CREATE TABLE IF NOT EXISTS user_work_restrictions (
  id integer NOT NULL DEFAULT nextval('user_work_restrictions_id_seq'::regclass),
  user_id uuid NOT NULL,
  company_id integer NOT NULL,
  restriction_type character varying(100) NOT NULL,
  description text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_permanent boolean DEFAULT false,
  medical_certificate_url text,
  issuing_doctor character varying(255),
  affects_current_role boolean DEFAULT false,
  accommodation_needed text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: users
CREATE TABLE IF NOT EXISTS users (
  user_id uuid NOT NULL,
  employeeId character varying(255) NOT NULL,
  firstName character varying(255) NOT NULL,
  lastName character varying(255) NOT NULL,
  email character varying(255) NOT NULL,
  dni character varying(20) NOT NULL,
  phone character varying(255),
  password character varying(255) NOT NULL,
  role enum_users_role DEFAULT 'employee'::enum_users_role,
  position character varying(255),
  salary numeric(10,2),
  hireDate date,
  birthDate date,
  address text,
  emergencyContact character varying(255),
  emergencyPhone character varying(255),
  allowOutsideRadius boolean NOT NULL DEFAULT false,
  convenioColectivo character varying(200),
  createdAt timestamp with time zone NOT NULL,
  updatedAt timestamp with time zone NOT NULL,
  company_id integer,
  is_active boolean DEFAULT true,
  whatsapp_number character varying(20),
  accepts_support_packages boolean DEFAULT true,
  accepts_auctions boolean DEFAULT true,
  accepts_email_notifications boolean DEFAULT true,
  accepts_whatsapp_notifications boolean DEFAULT true,
  accepts_sms_notifications boolean DEFAULT true,
  communication_consent_date timestamp with time zone,
  global_rating numeric(3,2),
  cbu character varying(22),
  bank_name character varying(100),
  notes text,
  usuario character varying(50),
  department_id bigint,
  default_branch_id uuid,
  birth_date date,
  cuil character varying(15),
  emergency_contact jsonb,
  work_schedule jsonb DEFAULT '{}'::jsonb,
  last_login timestamp with time zone,
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamp with time zone,
  password_reset_token character varying(255),
  password_reset_expires timestamp with time zone,
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret character varying(255),
  permissions jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  has_fingerprint boolean DEFAULT false,
  has_facial_data boolean DEFAULT false,
  biometric_last_updated timestamp with time zone,
  gps_enabled boolean DEFAULT false,
  allowed_locations jsonb DEFAULT '[]'::jsonb,
  concurrent_sessions integer DEFAULT 0,
  last_activity timestamp with time zone,
  display_name character varying(255),
  vendor_code character varying(20),
  version integer DEFAULT 1,
  biometric_enrolled boolean DEFAULT false,
  biometric_templates_count integer DEFAULT 0,
  last_biometric_scan timestamp without time zone,
  biometric_quality_avg numeric(4,2),
  ai_analysis_enabled boolean DEFAULT true,
  fatigue_monitoring boolean DEFAULT false,
  emotion_monitoring boolean DEFAULT false,
  biometric_notes text,
  can_authorize_late_arrivals boolean NOT NULL DEFAULT false,
  authorized_departments jsonb DEFAULT '[]'::jsonb,
  notification_preference_late_arrivals character varying(20) DEFAULT 'email'::character varying,
  can_use_mobile_app boolean NOT NULL DEFAULT true,
  can_use_kiosk boolean NOT NULL DEFAULT true,
  can_use_all_kiosks boolean NOT NULL DEFAULT false,
  authorized_kiosks jsonb DEFAULT '[]'::jsonb,
  has_flexible_schedule boolean NOT NULL DEFAULT false,
  flexible_schedule_notes text,
  legajo character varying(50),
  isActive boolean DEFAULT true,
  biometric_photo_url text,
  biometric_photo_date timestamp without time zone,
  biometric_photo_expiration timestamp without time zone,
  email_verified boolean DEFAULT false,
  email_verified_at timestamp without time zone,
  pending_consents ARRAY DEFAULT '{}'::uuid[],
  verification_pending boolean NOT NULL DEFAULT true,
  account_status user_account_status NOT NULL DEFAULT 'pending_verification'::user_account_status,
  secondary_phone character varying(20),
  home_phone character varying(20),
  city character varying(100),
  province character varying(100),
  postal_code character varying(10),
  neighborhood character varying(100),
  street character varying(255),
  street_number character varying(20),
  floor_apt character varying(20),
  health_insurance_provider character varying(255),
  health_insurance_plan character varying(255),
  health_insurance_number character varying(100),
  health_insurance_expiry date,
  branch_id uuid,
  additional_roles jsonb DEFAULT '[]'::jsonb,
  branch_scope jsonb,
  is_core_user boolean DEFAULT false,
  force_password_change boolean DEFAULT false,
  password_changed_at timestamp without time zone,
  core_user_created_at timestamp without time zone,
  onboarding_trace_id character varying(100),
  sector_id integer,
  salary_category_id integer,
  organizational_position_id integer
);

-- Tabla: vacation_configurations
CREATE TABLE IF NOT EXISTS vacation_configurations (
  id integer NOT NULL DEFAULT nextval('vacation_configurations_id_seq'::regclass),
  company_id integer NOT NULL,
  vacation_interruptible boolean DEFAULT true,
  min_continuous_days integer DEFAULT 7,
  max_fractions integer DEFAULT 3,
  auto_scheduling_enabled boolean DEFAULT true,
  min_advance_notice_days integer DEFAULT 15,
  max_simultaneous_percentage integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: vacation_requests
CREATE TABLE IF NOT EXISTS vacation_requests (
  id integer NOT NULL DEFAULT nextval('vacation_requests_id_seq'::regclass),
  company_id integer NOT NULL,
  user_id uuid NOT NULL,
  request_type character varying(50) DEFAULT 'vacation'::character varying,
  extraordinary_license_id integer,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days integer NOT NULL,
  reason text,
  status character varying(50) DEFAULT 'pending'::character varying,
  approved_by uuid,
  approval_date timestamp with time zone,
  approval_comments text,
  source character varying(50) DEFAULT 'manual'::character varying,
  coverage_assignments jsonb DEFAULT '[]'::jsonb,
  supporting_documents jsonb DEFAULT '[]'::jsonb,
  is_auto_generated boolean DEFAULT false,
  auto_generation_data jsonb,
  compatibility_score numeric(5,2),
  conflicts jsonb DEFAULT '[]'::jsonb,
  modification_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: vacation_scales
CREATE TABLE IF NOT EXISTS vacation_scales (
  id integer NOT NULL DEFAULT nextval('vacation_scales_id_seq'::regclass),
  company_id integer NOT NULL,
  years_from numeric(4,2) NOT NULL,
  years_to numeric(4,2),
  range_description character varying(100),
  vacation_days integer NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: vendor_commissions
CREATE TABLE IF NOT EXISTS vendor_commissions (
  id bigint NOT NULL DEFAULT nextval('vendor_commissions_id_seq'::regclass),
  vendor_id uuid NOT NULL,
  company_id integer NOT NULL,
  commission_type character varying(20) NOT NULL,
  percentage numeric(5,2) NOT NULL,
  monthly_amount numeric(10,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_transferable boolean NOT NULL DEFAULT false,
  original_vendor_id uuid,
  transferred_date timestamp with time zone,
  transfer_reason text,
  referral_id bigint,
  base_commission_amount numeric(10,2) DEFAULT 0,
  total_users integer DEFAULT 0,
  start_date date,
  end_date date,
  last_calculated timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabla: vendor_ratings
CREATE TABLE IF NOT EXISTS vendor_ratings (
  id bigint NOT NULL DEFAULT nextval('vendor_ratings_id_seq'::regclass),
  vendor_id uuid NOT NULL,
  company_id integer NOT NULL,
  rating numeric(3,2) NOT NULL,
  response_time_score numeric(3,2) DEFAULT 5.0,
  resolution_quality_score numeric(3,2) DEFAULT 5.0,
  customer_satisfaction_score numeric(3,2) DEFAULT 5.0,
  total_tickets integer DEFAULT 0,
  resolved_tickets integer DEFAULT 0,
  avg_response_time integer DEFAULT 0,
  avg_resolution_time integer DEFAULT 0,
  last_review_date timestamp with time zone,
  improvement_plan text,
  is_under_review boolean DEFAULT false,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  responseTimeScore numeric(3,2) DEFAULT 5,
  resolutionQualityScore numeric(3,2) DEFAULT 5,
  customerSatisfactionScore numeric(3,2) DEFAULT 5,
  totalTickets integer DEFAULT 0,
  resolvedTickets integer DEFAULT 0,
  averageResponseTimeMinutes integer,
  averageResolutionTimeHours numeric(8,2),
  is_active boolean DEFAULT true,
  reviewStartDate timestamp without time zone,
  improvementPlan text,
  notes text,
  createdAt timestamp without time zone,
  updatedAt timestamp without time zone
);

-- Tabla: vendor_referrals
CREATE TABLE IF NOT EXISTS vendor_referrals (
  id bigint NOT NULL DEFAULT nextval('vendor_referrals_id_seq'::regclass),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code character varying(50) NOT NULL,
  level integer NOT NULL DEFAULT 1,
  commission_percentage numeric(5,2) NOT NULL DEFAULT 5.0,
  total_commission_earned numeric(10,2) DEFAULT 0,
  status character varying(20) NOT NULL DEFAULT 'pending'::character varying,
  activation_date timestamp with time zone,
  last_commission_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  referrerId integer,
  referredId integer,
  activationDate timestamp without time zone,
  commissionPercentage numeric(5,2) DEFAULT 5,
  totalCommissionEarned numeric(10,2) DEFAULT 0,
  monthlyCommissionEarned numeric(10,2) DEFAULT 0,
  lastCommissionDate timestamp without time zone,
  isActive boolean DEFAULT true,
  contractStartDate timestamp without time zone,
  contractEndDate timestamp without time zone,
  referralCode character varying(20),
  notes text,
  createdAt timestamp without time zone,
  updatedAt timestamp without time zone,
  deletedAt timestamp without time zone
);

-- Tabla: vendor_statistics
CREATE TABLE IF NOT EXISTS vendor_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  total_companies integer DEFAULT 0,
  sales_companies integer DEFAULT 0,
  support_companies integer DEFAULT 0,
  total_users integer DEFAULT 0,
  sales_users integer DEFAULT 0,
  support_users integer DEFAULT 0,
  sales_commission_percentage numeric(5,2) DEFAULT 10.00,
  total_sales_commission_usd numeric(12,2) DEFAULT 0.00,
  monthly_sales_commission_usd numeric(12,2) DEFAULT 0.00,
  support_commission_percentage numeric(5,2) DEFAULT 0.00,
  total_support_commission_usd numeric(12,2) DEFAULT 0.00,
  monthly_support_commission_usd numeric(12,2) DEFAULT 0.00,
  total_referrals integer DEFAULT 0,
  referral_commission_usd numeric(12,2) DEFAULT 0.00,
  grand_total_commission_usd numeric(12,2) DEFAULT 0.00,
  total_modules_value_usd numeric(12,2) DEFAULT 0.00,
  rating numeric(3,1) DEFAULT 0.0,
  total_ratings integer DEFAULT 0,
  cbu character varying(22),
  last_updated_at timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now()
);

-- Tabla: visitor_gps_tracking
CREATE TABLE IF NOT EXISTS visitor_gps_tracking (
  id integer NOT NULL DEFAULT nextval('visitor_gps_tracking_id_seq'::regclass),
  visitor_id integer NOT NULL,
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  accuracy numeric(6,2),
  recorded_at timestamp with time zone NOT NULL,
  is_inside_facility boolean NOT NULL DEFAULT true,
  distance_from_center_meters numeric(10,2),
  battery_level integer,
  signal_strength integer,
  company_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gps_lat numeric(10,8),
  gps_lng numeric(11,8),
  altitude numeric(8,2),
  speed numeric(6,2),
  distance_from_facility numeric(10,2),
  alert_generated boolean DEFAULT false,
  alert_type character varying(255),
  alert_message text,
  area_id integer,
  area_name character varying(100),
  device_id character varying(100)
);

-- Tabla: visitors
CREATE TABLE IF NOT EXISTS visitors (
  id integer NOT NULL DEFAULT nextval('visitors_id_seq'::regclass),
  dni character varying(20) NOT NULL,
  first_name character varying(100) NOT NULL,
  last_name character varying(100) NOT NULL,
  email character varying(255),
  phone character varying(20),
  visit_reason text NOT NULL,
  visiting_department_id integer,
  responsible_employee_id uuid,
  authorization_status character varying(20) NOT NULL DEFAULT 'pending'::character varying,
  authorized_by uuid,
  authorized_at timestamp with time zone,
  rejection_reason text,
  gps_tracking_enabled boolean NOT NULL DEFAULT false,
  keyring_id character varying(50),
  facial_template text,
  photo_url text,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  kiosk_id integer,
  scheduled_visit_date timestamp with time zone NOT NULL,
  expected_duration_minutes integer DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  company_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at timestamp with time zone
);

