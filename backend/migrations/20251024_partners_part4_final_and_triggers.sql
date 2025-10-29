/**
 * PARTNERS SYSTEM - PARTE 4: TABLAS FINALES Y TRIGGERS
 *
 * Tablas finales:
 * - partner_mediation_cases
 * - partner_legal_consents
 * - partner_commissions_log
 *
 * Triggers y funciones automáticas
 */

-- ========================================
-- 9. PARTNER MEDIATION CASES
-- ========================================

CREATE TABLE IF NOT EXISTS partner_mediation_cases (
    id SERIAL PRIMARY KEY,

    service_request_id INTEGER NOT NULL REFERENCES partner_service_requests(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Case info
    case_type VARCHAR(50) NOT NULL,
    -- 'payment_dispute', 'service_quality', 'cancellation_dispute', 'contract_breach', 'other'

    filed_by VARCHAR(20) NOT NULL,
    -- 'client', 'partner'

    description TEXT NOT NULL,
    evidence_urls TEXT[],

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    -- 'open', 'under_review', 'resolved', 'closed'

    -- Resolution
    resolution TEXT,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,

    -- Outcome
    outcome VARCHAR(50),
    -- 'favor_partner', 'favor_client', 'mutual_agreement', 'no_fault', 'dismissed'

    -- Actions taken
    refund_amount DECIMAL(10, 2),
    compensation_amount DECIMAL(10, 2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_case_type CHECK (
        case_type IN ('payment_dispute', 'service_quality', 'cancellation_dispute', 'contract_breach', 'other')
    ),

    CONSTRAINT valid_filed_by CHECK (
        filed_by IN ('client', 'partner')
    ),

    CONSTRAINT valid_mediation_status CHECK (
        status IN ('open', 'under_review', 'resolved', 'closed')
    )
);

-- ========================================
-- 10. PARTNER LEGAL CONSENTS
-- ========================================

CREATE TABLE IF NOT EXISTS partner_legal_consents (
    id SERIAL PRIMARY KEY,

    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    consent_type VARCHAR(50) NOT NULL,
    -- 'terms_of_service', 'privacy_policy', 'commission_agreement', 'liability_waiver'

    consent_version VARCHAR(20) NOT NULL,
    -- e.g., 'v1.0', 'v2.1'

    -- Digital signature
    digital_signature TEXT NOT NULL,
    -- SHA256 hash of (consent_text + partner_id + timestamp + secret)

    signature_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    signature_ip VARCHAR(50) NOT NULL,
    user_agent TEXT,

    -- Consent text (snapshot)
    consent_text TEXT NOT NULL,
    consent_text_hash VARCHAR(64) NOT NULL,
    -- SHA256 hash del texto completo para verificar integridad

    -- Commission details (si aplica)
    commission_rate DECIMAL(5, 2),
    commission_calculation VARCHAR(50),

    -- Validity
    is_valid BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP,
    revoked_reason TEXT,

    CONSTRAINT valid_consent_type CHECK (
        consent_type IN ('terms_of_service', 'privacy_policy', 'commission_agreement', 'liability_waiver', 'data_processing')
    )
);

-- ========================================
-- 11. PARTNER COMMISSIONS LOG
-- ========================================

CREATE TABLE IF NOT EXISTS partner_commissions_log (
    id SERIAL PRIMARY KEY,

    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    service_request_id INTEGER REFERENCES partner_service_requests(id) ON DELETE SET NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,

    -- Commission calculation
    calculation_method VARCHAR(50) NOT NULL,
    -- 'per_module_user', 'per_employee', 'per_company', 'per_service'

    base_amount DECIMAL(10, 2) NOT NULL,
    -- Monto base sobre el cual se calcula comisión

    commission_percentage DECIMAL(5, 2),
    fixed_amount DECIMAL(10, 2),

    commission_amount DECIMAL(10, 2) NOT NULL,
    -- Monto final de comisión

    currency VARCHAR(3) DEFAULT 'ARS',

    -- Period (si aplica para cálculos mensuales)
    period_start DATE,
    period_end DATE,

    -- Payment status
    payment_status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'processing', 'paid', 'cancelled'

    paid_at TIMESTAMP,
    payment_reference VARCHAR(255),

    -- Metadata
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_calculation_method CHECK (
        calculation_method IN ('per_module_user', 'per_employee', 'per_company', 'per_service')
    ),

    CONSTRAINT valid_payment_status CHECK (
        payment_status IN ('pending', 'processing', 'paid', 'cancelled')
    )
);

-- ========================================
-- INDEXES (PARTE 4)
-- ========================================

CREATE INDEX idx_partner_mediation_partner ON partner_mediation_cases(partner_id);
CREATE INDEX idx_partner_mediation_company ON partner_mediation_cases(company_id);
CREATE INDEX idx_partner_mediation_status ON partner_mediation_cases(status);

CREATE INDEX idx_partner_consents_partner ON partner_legal_consents(partner_id);
CREATE INDEX idx_partner_consents_type ON partner_legal_consents(consent_type);
CREATE INDEX idx_partner_consents_valid ON partner_legal_consents(is_valid) WHERE is_valid = true;

CREATE INDEX idx_partner_commissions_partner ON partner_commissions_log(partner_id);
CREATE INDEX idx_partner_commissions_company ON partner_commissions_log(company_id);
CREATE INDEX idx_partner_commissions_status ON partner_commissions_log(payment_status);
CREATE INDEX idx_partner_commissions_period ON partner_commissions_log(period_start, period_end);

-- ========================================
-- TRIGGERS & FUNCTIONS
-- ========================================

-- Trigger 1: Actualizar rating promedio del partner cuando se crea review
CREATE OR REPLACE FUNCTION update_partner_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE partners
    SET
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM partner_reviews
            WHERE partner_id = NEW.partner_id AND is_public = true
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM partner_reviews
            WHERE partner_id = NEW.partner_id AND is_public = true
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.partner_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_partner_rating
AFTER INSERT OR UPDATE ON partner_reviews
FOR EACH ROW
EXECUTE FUNCTION update_partner_rating();

-- Trigger 2: Incrementar contador de servicios cuando se completa
CREATE OR REPLACE FUNCTION increment_partner_services()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE partners
        SET
            total_services = total_services + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.partner_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_partner_services
AFTER UPDATE ON partner_service_requests
FOR EACH ROW
EXECUTE FUNCTION increment_partner_services();

-- Trigger 3: Auto-generar primera conversación cuando se crea service request
CREATE OR REPLACE FUNCTION create_initial_conversation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO partner_service_conversations (
        service_request_id,
        sender_type,
        sender_id,
        message,
        sent_at
    ) VALUES (
        NEW.id,
        'client',
        NEW.user_id,
        'Solicitud de servicio creada: ' || NEW.service_description,
        NEW.created_at
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_initial_conversation
AFTER INSERT ON partner_service_requests
FOR EACH ROW
EXECUTE FUNCTION create_initial_conversation();

-- Trigger 4: Crear notificación para partner cuando se crea service request
CREATE OR REPLACE FUNCTION notify_partner_new_request()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO partner_notifications (
        partner_id,
        notification_type,
        title,
        message,
        related_service_request_id,
        created_at
    ) VALUES (
        NEW.partner_id,
        'new_service_request',
        'Nueva solicitud de servicio',
        'Tienes una nueva solicitud de servicio de ' ||
        (SELECT name FROM companies WHERE id = NEW.company_id),
        NEW.id,
        NEW.created_at
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_partner_new_request
AFTER INSERT ON partner_service_requests
FOR EACH ROW
EXECUTE FUNCTION notify_partner_new_request();

-- Trigger 5: Actualizar updated_at en varias tablas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_partners_updated_at
BEFORE UPDATE ON partners
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_partner_reviews_updated_at
BEFORE UPDATE ON partner_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_partner_service_requests_updated_at
BEFORE UPDATE ON partner_service_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_partner_mediation_updated_at
BEFORE UPDATE ON partner_mediation_cases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMMENTS (PARTE 4)
-- ========================================

COMMENT ON TABLE partner_mediation_cases IS 'Casos de mediación/disputas entre partners y empresas';
COMMENT ON TABLE partner_legal_consents IS 'Consentimientos legales firmados digitalmente por partners';
COMMENT ON TABLE partner_commissions_log IS 'Log de comisiones calculadas y pagadas a partners';

COMMENT ON FUNCTION update_partner_rating() IS 'Trigger: Actualiza rating promedio cuando se crea/modifica review';
COMMENT ON FUNCTION increment_partner_services() IS 'Trigger: Incrementa contador de servicios al completar';
COMMENT ON FUNCTION create_initial_conversation() IS 'Trigger: Crea mensaje inicial en conversación';
COMMENT ON FUNCTION notify_partner_new_request() IS 'Trigger: Notifica a partner sobre nueva solicitud';

-- ========================================
-- FINAL SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Partners System - Parte 4 completada exitosamente!';
    RAISE NOTICE '   - 3 tablas creadas (mediation, consents, commissions)';
    RAISE NOTICE '   - 5 triggers instalados';
    RAISE NOTICE '   - Sistema Partners 100%% funcional';
END $$;
