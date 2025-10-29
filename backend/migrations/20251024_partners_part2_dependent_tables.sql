/**
 * PARTNERS SYSTEM - PARTE 2: TABLAS DEPENDIENTES
 *
 * Tablas que dependen de partners:
 * - partner_documents
 * - partner_notifications
 * - partner_availability
 * - partner_service_requests
 */

-- ========================================
-- 3. PARTNER DOCUMENTS
-- ========================================

CREATE TABLE IF NOT EXISTS partner_documents (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    document_type VARCHAR(50) NOT NULL,
    -- 'license', 'insurance', 'certification', 'id_document', 'tax_document', 'cv', 'portfolio'

    document_name VARCHAR(255) NOT NULL,
    document_url TEXT NOT NULL,
    file_size INTEGER, -- bytes
    mime_type VARCHAR(100),

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by INTEGER, -- FK a users(id) - se agregará después
    verified_at TIMESTAMP,
    verification_notes TEXT,

    -- Expiry
    expiry_date DATE,
    is_expired BOOLEAN DEFAULT false,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_document_type CHECK (
        document_type IN ('license', 'insurance', 'certification', 'id_document', 'tax_document', 'cv', 'portfolio', 'other')
    )
);

-- ========================================
-- 4. PARTNER NOTIFICATIONS
-- ========================================

CREATE TABLE IF NOT EXISTS partner_notifications (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    notification_type VARCHAR(50) NOT NULL,
    -- 'new_service_request', 'service_confirmed', 'service_completed', 'payment_received',
    -- 'document_expiring', 'review_received', 'status_change', 'message_received'

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    related_service_request_id INTEGER, -- FK a agregar en parte 3

    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_notification_type CHECK (
        notification_type IN ('new_service_request', 'service_confirmed', 'service_completed',
                              'payment_received', 'document_expiring', 'review_received',
                              'status_change', 'message_received', 'system')
    )
);

-- ========================================
-- 5. PARTNER AVAILABILITY
-- ========================================

CREATE TABLE IF NOT EXISTS partner_availability (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    -- Date range
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Time slots
    start_time TIME,
    end_time TIME,

    -- Status
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available',
    -- 'available', 'busy', 'vacation', 'unavailable'

    -- Notes
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_time_range CHECK (end_time > start_time OR start_time IS NULL),
    CONSTRAINT valid_availability_status CHECK (
        availability_status IN ('available', 'busy', 'vacation', 'unavailable')
    )
);

-- ========================================
-- 6. PARTNER SERVICE REQUESTS
-- ========================================

CREATE TABLE IF NOT EXISTS partner_service_requests (
    id SERIAL PRIMARY KEY,

    -- Parties
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    -- user_id es quien solicita dentro de la empresa

    -- Service Details
    service_type VARCHAR(100) NOT NULL,
    service_description TEXT NOT NULL,

    -- Timing
    requested_date DATE,
    requested_time TIME,
    is_urgent BOOLEAN DEFAULT false,
    is_emergency BOOLEAN DEFAULT false,

    -- Location
    service_location VARCHAR(20) DEFAULT 'on_site',
    -- 'on_site' (en oficina empresa), 'partner_location' (en oficina partner), 'remote' (virtual)

    service_address TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled'

    -- Responses
    partner_response TEXT,
    partner_response_at TIMESTAMP,

    declined_reason TEXT,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20), -- 'client', 'partner', 'admin'

    -- Completion
    completed_at TIMESTAMP,
    completion_notes TEXT,

    -- Pricing
    quoted_price DECIMAL(10, 2),
    final_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_service_location CHECK (
        service_location IN ('on_site', 'partner_location', 'remote')
    ),

    CONSTRAINT valid_service_status CHECK (
        status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')
    )
);

-- ========================================
-- INDEXES (PARTE 2)
-- ========================================

CREATE INDEX idx_partner_documents_partner ON partner_documents(partner_id);
CREATE INDEX idx_partner_documents_type ON partner_documents(document_type);
CREATE INDEX idx_partner_documents_expiry ON partner_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_partner_notifications_partner ON partner_notifications(partner_id);
CREATE INDEX idx_partner_notifications_unread ON partner_notifications(partner_id, is_read) WHERE NOT is_read;

CREATE INDEX idx_partner_availability_partner ON partner_availability(partner_id);
CREATE INDEX idx_partner_availability_dates ON partner_availability(start_date, end_date);

CREATE INDEX idx_partner_service_requests_partner ON partner_service_requests(partner_id);
CREATE INDEX idx_partner_service_requests_company ON partner_service_requests(company_id);
CREATE INDEX idx_partner_service_requests_status ON partner_service_requests(status);
CREATE INDEX idx_partner_service_requests_date ON partner_service_requests(requested_date);

-- ========================================
-- COMMENTS (PARTE 2)
-- ========================================

COMMENT ON TABLE partner_documents IS 'Documentos subidos por partners (licencias, seguros, CVs)';
COMMENT ON TABLE partner_notifications IS 'Sistema de notificaciones para partners';
COMMENT ON TABLE partner_availability IS 'Disponibilidad de partners (calendario)';
COMMENT ON TABLE partner_service_requests IS 'Solicitudes de servicio de empresas a partners';
