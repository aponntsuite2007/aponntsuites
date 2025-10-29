-- ============================================================================
-- Migration: Partner Status History + Notification Integration
-- Date: 2025-01-24
-- Description:
--   1. Create partner_status_history table for audit trail
--   2. Update partners table with new status ENUM
--   3. Extend notifications table with partner-related fields
-- ============================================================================

-- ============================================================================
-- 1. UPDATE PARTNERS TABLE - New Status ENUM
-- ============================================================================

-- Drop old status check if exists
ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_status_check;

-- Add new status ENUM with 5 states
ALTER TABLE partners
  ADD CONSTRAINT partners_status_check
  CHECK (status IN ('pendiente_aprobacion', 'activo', 'suspendido', 'baja', 'renuncia'));

-- Update default status for new partners
ALTER TABLE partners
  ALTER COLUMN status SET DEFAULT 'pendiente_aprobacion';

-- Migrate existing data (if any old statuses exist)
UPDATE partners SET status = 'pendiente_aprobacion' WHERE status = 'pending';
UPDATE partners SET status = 'activo' WHERE status = 'approved';
UPDATE partners SET status = 'baja' WHERE status = 'rejected';

-- ============================================================================
-- 2. CREATE PARTNER_STATUS_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_status_history (
  id BIGSERIAL PRIMARY KEY,

  -- Partner reference
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- Status change
  old_status VARCHAR(50) NULL,  -- NULL for initial creation
  new_status VARCHAR(50) NOT NULL CHECK (new_status IN ('pendiente_aprobacion', 'activo', 'suspendido', 'baja', 'renuncia')),

  -- Who made the change
  changed_by_user_id UUID NOT NULL,  -- Admin/Gerente user ID
  changed_by_role VARCHAR(50) NOT NULL,  -- admin, gerente
  changed_by_name VARCHAR(255) NOT NULL,  -- For display

  -- Reason for change (required for: baja, suspendido, renuncia)
  change_reason TEXT NULL,
  change_notes TEXT NULL,  -- Additional internal notes

  -- Notification sent
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP NULL,
  email_sent_to VARCHAR(255) NULL,  -- Partner email

  -- Client notifications (for active contracts)
  clients_notified JSONB DEFAULT '[]'::jsonb,  -- [{company_id, company_name, email, sent_at}, ...]
  active_contracts_count INTEGER DEFAULT 0,

  -- Auditoría web
  ip_address INET NULL,
  user_agent TEXT NULL,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  CONSTRAINT fk_partner_status_history_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_partner_status_history_partner ON partner_status_history(partner_id, created_at DESC);
CREATE INDEX idx_partner_status_history_changed_by ON partner_status_history(changed_by_user_id);
CREATE INDEX idx_partner_status_history_status ON partner_status_history(new_status, created_at DESC);
CREATE INDEX idx_partner_status_history_notification ON partner_status_history(notification_sent) WHERE notification_sent = FALSE;

COMMENT ON TABLE partner_status_history IS 'Historial completo de cambios de estado de asociados con notificaciones';
COMMENT ON COLUMN partner_status_history.clients_notified IS 'Array de clientes notificados: [{company_id, company_name, email, sent_at}]';

-- ============================================================================
-- 3. EXTEND NOTIFICATIONS TABLE - Add Partner Fields
-- ============================================================================

-- Check if notifications table exists (should exist from Notification Model)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN

    -- Add partner-related fields if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'notifications' AND column_name = 'related_partner_id') THEN
      ALTER TABLE notifications ADD COLUMN related_partner_id INTEGER NULL REFERENCES partners(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'notifications' AND column_name = 'related_service_request_id') THEN
      ALTER TABLE notifications ADD COLUMN related_service_request_id INTEGER NULL REFERENCES partner_service_requests(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'notifications' AND column_name = 'sender_user_id') THEN
      ALTER TABLE notifications ADD COLUMN sender_user_id UUID NULL;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns
                   WHERE table_name = 'notifications' AND column_name = 'sender_type') THEN
      ALTER TABLE notifications ADD COLUMN sender_type VARCHAR(50) NULL DEFAULT 'user';
      ALTER TABLE notifications ADD CONSTRAINT notifications_sender_type_check
        CHECK (sender_type IN ('user', 'system', 'admin', 'partner', 'vendor'));
    END IF;

    -- Add indexes for partner queries
    CREATE INDEX IF NOT EXISTS idx_notifications_partner ON notifications(related_partner_id, created_at DESC) WHERE related_partner_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_notifications_service_request ON notifications(related_service_request_id) WHERE related_service_request_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_user_id, sender_type);

    -- Update module ENUM to include 'partners' if not already there
    -- (Assuming module is VARCHAR, not ENUM for flexibility)

  END IF;
END $$;

-- ============================================================================
-- 4. CREATE HELPER FUNCTION - Get Partner Status Timeline
-- ============================================================================

CREATE OR REPLACE FUNCTION get_partner_status_timeline(p_partner_id INTEGER)
RETURNS TABLE (
  change_date TIMESTAMP,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by VARCHAR(255),
  change_reason TEXT,
  notification_sent BOOLEAN,
  clients_notified_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    psh.created_at,
    psh.old_status,
    psh.new_status,
    psh.changed_by_name,
    psh.change_reason,
    psh.notification_sent,
    psh.active_contracts_count
  FROM partner_status_history psh
  WHERE psh.partner_id = p_partner_id
  ORDER BY psh.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_partner_status_timeline(INTEGER) IS 'Retorna timeline completo de cambios de estado de un asociado';

-- ============================================================================
-- 5. CREATE TRIGGER - Auto-create history entry on status change
-- ============================================================================

CREATE OR REPLACE FUNCTION partner_status_change_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN

    INSERT INTO partner_status_history (
      partner_id,
      old_status,
      new_status,
      changed_by_user_id,
      changed_by_role,
      changed_by_name,
      change_reason,
      email_sent_to
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      COALESCE(NEW.updated_by, NEW.created_by, '00000000-0000-0000-0000-000000000000'),  -- Fallback UUID
      'system',  -- Will be updated by application
      'Sistema',  -- Will be updated by application
      NULL,  -- Will be set by application if required
      NEW.email
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS partner_status_change_audit ON partners;

-- Create trigger
CREATE TRIGGER partner_status_change_audit
  AFTER INSERT OR UPDATE OF status ON partners
  FOR EACH ROW
  EXECUTE FUNCTION partner_status_change_trigger();

COMMENT ON TRIGGER partner_status_change_audit ON partners IS 'Auto-registra cambios de estado en partner_status_history';

-- ============================================================================
-- 6. CREATE HELPER FUNCTION - Get Partners with Active Contracts
-- ============================================================================

CREATE OR REPLACE FUNCTION get_partner_active_contracts(p_partner_id INTEGER)
RETURNS TABLE (
  company_id INTEGER,
  company_name VARCHAR(255),
  contact_email VARCHAR(255),
  service_request_id INTEGER,
  service_type VARCHAR(100),
  start_date DATE,
  end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.contact_email,
    psr.id,
    psr.service_type,
    psr.start_date,
    psr.end_date
  FROM partner_service_requests psr
  INNER JOIN companies c ON c.id = psr.company_id
  WHERE psr.partner_id = p_partner_id
    AND psr.status IN ('in_progress', 'accepted')  -- Active contracts
    AND (psr.end_date IS NULL OR psr.end_date >= CURRENT_DATE)
  ORDER BY psr.start_date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_partner_active_contracts(INTEGER) IS 'Retorna contratos activos de un asociado para notificar clientes';

-- ============================================================================
-- 7. GRANT PERMISSIONS (if needed)
-- ============================================================================

-- GRANT ALL ON partner_status_history TO your_app_user;
-- GRANT ALL ON SEQUENCE partner_status_history_id_seq TO your_app_user;

-- ============================================================================
-- 8. INSERT TEST DATA (opcional - comentar en producción)
-- ============================================================================

-- Ejemplo de entrada de historial (comentado)
-- INSERT INTO partner_status_history (
--   partner_id, old_status, new_status,
--   changed_by_user_id, changed_by_role, changed_by_name,
--   change_reason
-- ) VALUES (
--   1, NULL, 'pendiente_aprobacion',
--   '00000000-0000-0000-0000-000000000001', 'system', 'Sistema de Registro',
--   'Registro inicial'
-- );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
