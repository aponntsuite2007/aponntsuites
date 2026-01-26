-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Sistema de Baja de Empresa (Company Offboarding)
-- Fecha: 2026-01-24
-- Descripción: Campos de offboarding en companies + tabla de eventos
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. CAMPOS NUEVOS EN COMPANIES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE companies ADD COLUMN IF NOT EXISTS offboarding_status VARCHAR(30)
  CHECK (offboarding_status IN (
    'warning_sent', 'grace_period', 'export_pending',
    'export_ready', 'pending_confirmation', 'purging', 'completed'
  ));

ALTER TABLE companies ADD COLUMN IF NOT EXISTS offboarding_initiated_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS offboarding_warning_sent_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS offboarding_grace_deadline DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS offboarding_confirmed_by INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS offboarding_confirmed_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_export_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS data_export_generated_at TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cancellation_invoice_id INTEGER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. TABLA DE EVENTOS DE OFFBOARDING
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_offboarding_events (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  triggered_by_staff_id INTEGER,
  invoice_id INTEGER,
  export_file_path TEXT,
  drive_url TEXT,
  drive_file_id TEXT,
  records_exported JSONB DEFAULT '{}',
  records_deleted JSONB DEFAULT '{}',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_offboarding_events_company
  ON company_offboarding_events(company_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_events_type
  ON company_offboarding_events(event_type);
CREATE INDEX IF NOT EXISTS idx_offboarding_events_created
  ON company_offboarding_events(created_at DESC);

-- Índice en companies para queries del cron
CREATE INDEX IF NOT EXISTS idx_companies_offboarding_status
  ON companies(offboarding_status) WHERE offboarding_status IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. FUNCIÓN HELPER: Resumen de offboarding
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_offboarding_summary(p_company_id INTEGER)
RETURNS JSONB AS $$
  SELECT COALESCE(
    jsonb_build_object(
      'total_events', COUNT(*),
      'last_event', MAX(created_at),
      'events', COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'type', event_type,
          'date', created_at,
          'by_staff', triggered_by_staff_id,
          'error', error_message
        ) ORDER BY created_at DESC
      ), '[]'::jsonb)
    ),
    '{"total_events": 0, "events": []}'::jsonb
  )
  FROM company_offboarding_events
  WHERE company_id = p_company_id;
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. FUNCIÓN HELPER: Empresas en riesgo (facturas vencidas > 30 días)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_companies_at_risk()
RETURNS TABLE (
  company_id INTEGER,
  company_name VARCHAR,
  invoice_id INTEGER,
  invoice_number VARCHAR,
  amount DECIMAL,
  due_date DATE,
  days_overdue INTEGER,
  offboarding_status VARCHAR
) AS $$
  SELECT
    c.company_id AS company_id,
    c.name AS company_name,
    i.id AS invoice_id,
    i.invoice_number,
    i.total_amount AS amount,
    i.due_date::DATE,
    (CURRENT_DATE - i.due_date::DATE) AS days_overdue,
    c.offboarding_status
  FROM invoices i
  JOIN companies c ON c.company_id = i.company_id
  WHERE i.status IN ('overdue', 'sent')
    AND i.due_date < CURRENT_DATE - INTERVAL '30 days'
    AND c.is_active = true
    AND c.status != 'cancelled'
  ORDER BY days_overdue DESC;
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Migración company_offboarding ejecutada correctamente';
  RAISE NOTICE '   - Campos offboarding agregados a companies';
  RAISE NOTICE '   - Tabla company_offboarding_events creada';
  RAISE NOTICE '   - Funciones helper creadas';
END $$;
