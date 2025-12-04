-- ============================================================================
-- COMPANY COMMUNICATIONS - Comunicaciones APONNT <-> Empresas
-- Migración: 2025-02-02
-- NOTA: Presupuestos, Contratos y Facturas ya existen en:
--       - budgets (presupuestos)
--       - contracts (contratos)
--       - siac_facturas + siac_clientes (facturas)
-- ============================================================================

-- ============================================================================
-- COMUNICACIONES COMERCIALES (APONNT <-> Empresa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_communications (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL DEFAULT 'inbound',  -- inbound (APONNT->Empresa), outbound (Empresa->APONNT)
    department VARCHAR(30) DEFAULT 'support',  -- support, sales, admin, billing, technical
    from_user_id UUID,  -- user_id que envía (si es outbound)
    from_staff_id UUID REFERENCES aponnt_staff(staff_id),  -- staff_id si es inbound
    from_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, urgent
    status VARCHAR(30) DEFAULT 'unread',  -- unread, read, replied, archived
    requires_response BOOLEAN DEFAULT false,
    response_deadline TIMESTAMP WITH TIME ZONE,
    parent_id INTEGER REFERENCES company_communications(id),  -- Para hilos
    attachments JSONB DEFAULT '[]'::jsonb,
    read_at TIMESTAMP WITH TIME ZONE,
    read_by UUID,
    replied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_comms_company ON company_communications(company_id);
CREATE INDEX IF NOT EXISTS idx_company_comms_status ON company_communications(status);
CREATE INDEX IF NOT EXISTS idx_company_comms_direction ON company_communications(direction);
CREATE INDEX IF NOT EXISTS idx_company_comms_parent ON company_communications(parent_id);
CREATE INDEX IF NOT EXISTS idx_company_comms_created ON company_communications(created_at DESC);

-- ============================================================================
-- NOTIFICACIONES DE CUENTA (Para la campanita)
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_account_notifications (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id UUID,  -- Si NULL, para todos los admins
    notification_type VARCHAR(50) NOT NULL,  -- invoice_due, invoice_overdue, new_quote, contract_expiring, new_message
    title VARCHAR(255) NOT NULL,
    message TEXT,
    reference_type VARCHAR(30),  -- budget, contract, invoice, communication
    reference_id VARCHAR(100),  -- ID del elemento (puede ser UUID o INTEGER)
    priority VARCHAR(20) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    action_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_notif_company ON company_account_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_account_notif_user ON company_account_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_account_notif_unread ON company_account_notifications(company_id, is_read) WHERE is_read = false;

-- ============================================================================
-- TRIGGER updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_company_comms_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_company_comms_updated ON company_communications;
CREATE TRIGGER tr_company_comms_updated
    BEFORE UPDATE ON company_communications
    FOR EACH ROW EXECUTE FUNCTION update_company_comms_timestamp();

-- ============================================================================
-- FUNCIÓN: Crear notificación de cuenta
-- ============================================================================
CREATE OR REPLACE FUNCTION create_account_notification(
    p_company_id INTEGER,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT DEFAULT NULL,
    p_ref_type VARCHAR(30) DEFAULT NULL,
    p_ref_id VARCHAR(100) DEFAULT NULL,
    p_priority VARCHAR(20) DEFAULT 'normal'
)
RETURNS INTEGER AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO company_account_notifications (
        company_id, notification_type, title, message,
        reference_type, reference_id, priority
    ) VALUES (
        p_company_id, p_type, p_title, p_message,
        p_ref_type, p_ref_id, p_priority
    ) RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Contar notificaciones no leídas
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unread_account_notifications(p_company_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM company_account_notifications
        WHERE company_id = p_company_id
          AND is_read = false
          AND dismissed_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Tablas creadas:';
    RAISE NOTICE '   - company_communications (comunicaciones APONNT <-> Empresa)';
    RAISE NOTICE '   - company_account_notifications (campanita admins)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tablas EXISTENTES que se usarán:';
    RAISE NOTICE '   - budgets (presupuestos)';
    RAISE NOTICE '   - contracts (contratos)';
    RAISE NOTICE '   - siac_facturas + siac_clientes (facturas)';
END $$;
