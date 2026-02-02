-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Control Manual de Estado de Empresa
-- Fecha: 2026-02-02
-- Descripción: Agrega campos para trackear cambios manuales de estado
-- ═══════════════════════════════════════════════════════════════════════════

-- Campos para trackear si el ALTA/BAJA fue manual
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_manual BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_manual_reason TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_manual_by INTEGER REFERENCES aponnt_staff(staff_id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_manual_at TIMESTAMP;

-- Campos para trackear si el ESTADO OPERATIVO fue manual
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status_manual BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status_manual_reason TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status_manual_by INTEGER REFERENCES aponnt_staff(staff_id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status_manual_at TIMESTAMP;

-- Comentarios
COMMENT ON COLUMN companies.onboarding_manual IS 'True si el alta/baja fue realizada manualmente';
COMMENT ON COLUMN companies.onboarding_manual_reason IS 'Motivo por el cual se realizó el alta/baja manual';
COMMENT ON COLUMN companies.onboarding_manual_by IS 'Staff que realizó el cambio manual de onboarding';
COMMENT ON COLUMN companies.onboarding_manual_at IS 'Fecha/hora del cambio manual de onboarding';

COMMENT ON COLUMN companies.status_manual IS 'True si el estado operativo fue cambiado manualmente';
COMMENT ON COLUMN companies.status_manual_reason IS 'Motivo por el cual se cambió el estado manualmente';
COMMENT ON COLUMN companies.status_manual_by IS 'Staff que realizó el cambio manual de estado';
COMMENT ON COLUMN companies.status_manual_at IS 'Fecha/hora del cambio manual de estado';

-- Índices para queries
CREATE INDEX IF NOT EXISTS idx_companies_onboarding_manual ON companies(onboarding_manual) WHERE onboarding_manual = TRUE;
CREATE INDEX IF NOT EXISTS idx_companies_status_manual ON companies(status_manual) WHERE status_manual = TRUE;
