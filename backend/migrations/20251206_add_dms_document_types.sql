-- ============================================================================
-- MIGRACIÓN: Agregar tipos de documentos para TODOS los módulos
-- ============================================================================
-- Este script agrega los tipos de documento necesarios para que
-- TODOS los módulos del sistema puedan usar el DMS como fuente única de verdad.
-- ============================================================================

-- ===========================================
-- VACACIONES
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('VACATION_REQUEST', 'Solicitud de Vacaciones', 'Solicitud formal de período de vacaciones', 'RRHH', false, 5, ARRAY['pdf','doc','docx'], 1825),
  ('VACATION_APPROVAL', 'Aprobación de Vacaciones', 'Documento de aprobación de vacaciones', 'RRHH', false, 5, ARRAY['pdf'], 1825),
  ('VACATION_REJECTION', 'Rechazo de Vacaciones', 'Documento de rechazo de solicitud de vacaciones', 'RRHH', false, 5, ARRAY['pdf'], 1825),
  ('VACATION_CERTIFICATE', 'Certificado de Vacaciones', 'Certificado del período de vacaciones gozado', 'RRHH', false, 5, ARRAY['pdf'], 3650)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- SANCIONES
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('SANCTION_NOTIFICATION', 'Notificación de Sanción', 'Notificación formal de sanción disciplinaria', 'LEGAL', false, 5, ARRAY['pdf'], 3650),
  ('SANCTION_DESCARGO', 'Descargo de Sanción', 'Descargo presentado por el empleado (requiere validación)', 'LEGAL', true, 10, ARRAY['pdf','doc','docx','jpg','png'], 3650),
  ('SANCTION_RESOLUTION', 'Resolución de Sanción', 'Resolución final de proceso disciplinario', 'LEGAL', false, 5, ARRAY['pdf'], 3650),
  ('SANCTION_APPEAL', 'Apelación de Sanción', 'Apelación presentada por el empleado', 'LEGAL', true, 10, ARRAY['pdf','doc','docx'], 3650)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- CONTRATOS
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('CONTRACT_INITIAL', 'Contrato de Trabajo', 'Contrato laboral inicial', 'LEGAL', false, 10, ARRAY['pdf'], 7300),
  ('CONTRACT_AMENDMENT', 'Adenda Contractual', 'Modificación al contrato de trabajo', 'LEGAL', false, 10, ARRAY['pdf'], 7300),
  ('CONTRACT_TERMINATION', 'Finiquito', 'Documento de terminación de relación laboral', 'LEGAL', false, 10, ARRAY['pdf'], 7300),
  ('CONTRACT_NDA', 'Acuerdo de Confidencialidad', 'Acuerdo de no divulgación (NDA)', 'LEGAL', true, 10, ARRAY['pdf'], 7300)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- NÓMINA / PAYROLL
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('PAYROLL_PAYSLIP', 'Recibo de Sueldo', 'Comprobante mensual de remuneración', 'RRHH', false, 2, ARRAY['pdf'], 3650),
  ('PAYROLL_BONUS', 'Comprobante de Bonificación', 'Comprobante de pago de bonificación', 'RRHH', false, 2, ARRAY['pdf'], 3650),
  ('PAYROLL_DEDUCTION', 'Comprobante de Deducción', 'Comprobante de deducción salarial', 'RRHH', false, 2, ARRAY['pdf'], 3650),
  ('PAYROLL_SETTLEMENT', 'Liquidación Final', 'Documento de liquidación al término de relación laboral', 'RRHH', false, 10, ARRAY['pdf'], 7300)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- MÉDICO
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('MEDICAL_CERTIFICATE', 'Certificado Médico', 'Certificado médico para justificar ausencia', 'MEDICAL', true, 5, ARRAY['pdf','jpg','png'], 3650),
  ('MEDICAL_EXAM', 'Resultado de Examen', 'Resultado de examen médico', 'MEDICAL', false, 10, ARRAY['pdf'], 3650),
  ('MEDICAL_PRESCRIPTION', 'Receta Médica', 'Prescripción médica', 'MEDICAL', true, 5, ARRAY['pdf','jpg','png'], 1825),
  ('MEDICAL_DISABILITY', 'Certificado de Discapacidad', 'Certificado de discapacidad temporal o permanente', 'MEDICAL', true, 10, ARRAY['pdf'], 7300),
  ('MEDICAL_FIT_NOTE', 'Alta Médica', 'Certificado de alta médica', 'MEDICAL', false, 5, ARRAY['pdf'], 3650)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- SALUD OCUPACIONAL
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('OH_PRE_EMPLOYMENT', 'Examen Pre-Ocupacional', 'Examen médico de ingreso', 'MEDICAL', false, 15, ARRAY['pdf'], 7300),
  ('OH_PERIODIC', 'Examen Periódico', 'Examen médico periódico', 'MEDICAL', false, 15, ARRAY['pdf'], 7300),
  ('OH_EGRESS', 'Examen de Egreso', 'Examen médico de salida', 'MEDICAL', false, 15, ARRAY['pdf'], 7300),
  ('OH_SPECIAL', 'Examen Especial', 'Examen médico especial/por riesgo', 'MEDICAL', false, 15, ARRAY['pdf'], 7300),
  ('OH_APTITUDE', 'Certificado de Aptitud', 'Certificado de aptitud para el puesto', 'MEDICAL', false, 5, ARRAY['pdf'], 3650)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- CONSENTIMIENTO INFORMADO
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('CONSENT_GENERAL', 'Consentimiento General', 'Consentimiento informado general', 'LEGAL', false, 5, ARRAY['pdf'], 7300),
  ('CONSENT_BIOMETRIC', 'Consentimiento Biométrico', 'Consentimiento para uso de datos biométricos', 'LEGAL', false, 5, ARRAY['pdf'], 7300),
  ('CONSENT_MEDICAL', 'Consentimiento Médico', 'Consentimiento para tratamiento de información médica', 'MEDICAL', false, 5, ARRAY['pdf'], 7300),
  ('CONSENT_DATA', 'Consentimiento Datos Personales', 'Consentimiento para tratamiento de datos personales', 'LEGAL', false, 5, ARRAY['pdf'], 7300)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- CAPACITACIONES
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('TRAINING_MATERIAL', 'Material de Capacitación', 'Material didáctico para capacitación', 'TRAINING', false, 100, ARRAY['pdf','ppt','pptx','doc','docx','mp4','zip'], 3650),
  ('TRAINING_CERTIFICATE', 'Certificado de Capacitación', 'Certificado de finalización de capacitación', 'TRAINING', false, 5, ARRAY['pdf'], 3650),
  ('TRAINING_EVALUATION', 'Evaluación de Capacitación', 'Resultado de evaluación de capacitación', 'TRAINING', false, 5, ARRAY['pdf'], 1825),
  ('TRAINING_ATTENDANCE', 'Lista de Asistencia', 'Lista de asistencia a sesión de capacitación', 'TRAINING', false, 5, ARRAY['pdf','jpg','png'], 1825)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- INCIDENTES
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('INCIDENT_REPORT', 'Reporte de Incidente', 'Reporte formal de incidente/accidente', 'MEDICAL', false, 20, ARRAY['pdf','doc','docx'], 7300),
  ('INCIDENT_INVESTIGATION', 'Investigación de Incidente', 'Resultado de investigación de incidente', 'MEDICAL', false, 20, ARRAY['pdf'], 7300),
  ('INCIDENT_EVIDENCE', 'Evidencia de Incidente', 'Evidencia fotográfica o documental', 'MEDICAL', true, 50, ARRAY['pdf','jpg','png','mp4','zip'], 7300),
  ('INCIDENT_WITNESS', 'Declaración de Testigo', 'Declaración testimonial de testigos', 'MEDICAL', true, 10, ARRAY['pdf','doc','docx'], 7300)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- COMUNICACIONES LEGALES
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('LEGAL_NOTIFICATION', 'Notificación Legal', 'Notificación formal de carácter legal', 'LEGAL', false, 10, ARRAY['pdf'], 3650),
  ('LEGAL_ACKNOWLEDGMENT', 'Acuse de Recibo', 'Acuse de recibo firmado por empleado', 'LEGAL', true, 5, ARRAY['pdf','jpg','png'], 3650),
  ('LEGAL_WARNING', 'Amonestación', 'Documento de amonestación formal', 'LEGAL', false, 5, ARRAY['pdf'], 3650),
  ('LEGAL_MEMO', 'Memorando', 'Memorando interno', 'COMUNICACIONES', false, 5, ARRAY['pdf'], 1825)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- EVALUACIONES
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('EVAL_PERFORMANCE', 'Evaluación de Desempeño', 'Evaluación de desempeño del empleado', 'RRHH', false, 10, ARRAY['pdf'], 3650),
  ('EVAL_SELF', 'Autoevaluación', 'Autoevaluación del empleado', 'RRHH', true, 5, ARRAY['pdf','doc','docx'], 1825),
  ('EVAL_GOALS', 'Objetivos y Metas', 'Documento de objetivos y metas', 'RRHH', false, 5, ARRAY['pdf'], 1825),
  ('EVAL_FEEDBACK', 'Feedback/Retroalimentación', 'Documento de retroalimentación', 'RRHH', false, 5, ARRAY['pdf'], 1825)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- COMUNICACIONES GENERALES
-- ===========================================
INSERT INTO dms_document_types (code, name, description, category_code, requires_approval, max_size_mb, allowed_extensions, retention_days)
VALUES
  ('COMM_ANNOUNCEMENT', 'Anuncio', 'Anuncio corporativo', 'COMUNICACIONES', false, 10, ARRAY['pdf','jpg','png'], 1825),
  ('COMM_MEMO', 'Memo Interno', 'Memorando de comunicación interna', 'COMUNICACIONES', false, 5, ARRAY['pdf'], 1825),
  ('COMM_CIRCULAR', 'Circular', 'Circular informativa', 'COMUNICACIONES', false, 10, ARRAY['pdf'], 1825)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- CATEGORÍA ADICIONAL: TRAINING
-- ===========================================
INSERT INTO dms_document_categories (code, name, description, icon, color, sort_order)
VALUES
  ('TRAINING', 'Capacitación', 'Materiales y certificados de capacitación', 'academic-cap', '#8B5CF6', 6)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- CATEGORÍA ADICIONAL: COMUNICACIONES
-- ===========================================
INSERT INTO dms_document_categories (code, name, description, icon, color, sort_order)
VALUES
  ('COMUNICACIONES', 'Comunicaciones', 'Anuncios, memos y circulares', 'speakerphone', '#F59E0B', 7)
ON CONFLICT (code) DO NOTHING;

-- ===========================================
-- ÍNDICES PARA BÚSQUEDA POR MÓDULO
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_dms_documents_source_module ON dms_documents(source_module);
CREATE INDEX IF NOT EXISTS idx_dms_documents_source_entity ON dms_documents(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_dms_documents_owner_module ON dms_documents(owner_id, source_module);

-- ===========================================
-- VERIFICACIÓN
-- ===========================================
DO $$
DECLARE
  type_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO type_count FROM dms_document_types;
  RAISE NOTICE '✅ Total tipos de documento en catálogo: %', type_count;
END $$;
