-- ============================================
-- MIGRACIÓN: Campos de Auditoría Médica v1.1
-- Fecha: 2025-01-25
-- Descripción: Agrega campos de diagnóstico final y observaciones médicas
-- ============================================

-- Agregar campos de diagnóstico final y observaciones al auditor
ALTER TABLE medical_certificates
ADD COLUMN IF NOT EXISTS final_diagnosis TEXT,
ADD COLUMN IF NOT EXISTS diagnosis_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS doctor_observations TEXT,
ADD COLUMN IF NOT EXISTS medical_recommendations TEXT,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP;

-- Comentarios descriptivos
COMMENT ON COLUMN medical_certificates.final_diagnosis IS 'Diagnóstico final confirmado por el médico auditor';
COMMENT ON COLUMN medical_certificates.diagnosis_category IS 'Categoría del diagnóstico (respiratorio, muscular, digestivo, mental, etc.)';
COMMENT ON COLUMN medical_certificates.doctor_observations IS 'Observaciones médicas detalladas del auditor';
COMMENT ON COLUMN medical_certificates.medical_recommendations IS 'Recomendaciones médicas para el empleado';
COMMENT ON COLUMN medical_certificates.follow_up_required IS 'Si requiere seguimiento médico posterior';
COMMENT ON COLUMN medical_certificates.follow_up_date IS 'Fecha del próximo seguimiento médico';

-- Índice para búsquedas por categoría de diagnóstico
CREATE INDEX IF NOT EXISTS idx_medical_certificates_diagnosis_category
ON medical_certificates(diagnosis_category);

-- Índice para seguimientos pendientes
CREATE INDEX IF NOT EXISTS idx_medical_certificates_follow_up
ON medical_certificates(follow_up_required, follow_up_date)
WHERE follow_up_required = true;

-- Verificar campos creados
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'medical_certificates'
AND column_name IN ('final_diagnosis', 'diagnosis_category', 'doctor_observations',
                    'medical_recommendations', 'follow_up_required', 'follow_up_date')
ORDER BY column_name;
