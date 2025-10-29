/**
 * PARTNERS SYSTEM - PARTE 3: TABLAS DE INTERACCIÓN
 *
 * Tablas de interacción entre usuarios y partners:
 * - partner_reviews (bidireccional)
 * - partner_service_conversations
 */

-- ========================================
-- 7. PARTNER REVIEWS (Bidireccional)
-- ========================================

CREATE TABLE IF NOT EXISTS partner_reviews (
    id SERIAL PRIMARY KEY,

    -- Parties
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- reviewer_id es el usuario de la empresa que califica

    service_request_id INTEGER REFERENCES partner_service_requests(id) ON DELETE SET NULL,

    -- Rating (1-5 stars)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

    -- Detailed ratings (optional)
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),

    -- Comments
    comment TEXT,
    pros TEXT[],
    cons TEXT[],

    -- Partner Response (bidireccional)
    partner_response TEXT,
    partner_response_at TIMESTAMP,

    -- Visibility
    is_public BOOLEAN DEFAULT true,
    is_verified_service BOOLEAN DEFAULT false, -- si se verificó que realmente ocurrió el servicio

    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    moderated_by INTEGER REFERENCES users(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(partner_id, reviewer_id, service_request_id)
);

-- ========================================
-- 8. PARTNER SERVICE CONVERSATIONS
-- ========================================

CREATE TABLE IF NOT EXISTS partner_service_conversations (
    id SERIAL PRIMARY KEY,

    service_request_id INTEGER NOT NULL REFERENCES partner_service_requests(id) ON DELETE CASCADE,

    sender_type VARCHAR(20) NOT NULL,
    -- 'client' (usuario empresa), 'partner', 'admin', 'mediator'

    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    -- Si sender_type = 'partner', es NULL (partner usa su propia tabla)
    -- Si sender_type = 'client'/'admin'/'mediator', es user_id de tabla users

    partner_sender_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,
    -- Si sender_type = 'partner', se usa este campo

    message TEXT NOT NULL,

    -- Attachments
    attachments JSONB, -- [{ filename, url, size, mime_type }]

    -- Threading/SLA
    parent_message_id INTEGER REFERENCES partner_service_conversations(id),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_deadline TIMESTAMP,
    is_urgent BOOLEAN DEFAULT false,

    -- Read status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,

    CONSTRAINT valid_sender_type CHECK (
        sender_type IN ('client', 'partner', 'admin', 'mediator')
    ),

    CONSTRAINT valid_sender CHECK (
        (sender_type = 'partner' AND partner_sender_id IS NOT NULL AND sender_id IS NULL) OR
        (sender_type != 'partner' AND sender_id IS NOT NULL AND partner_sender_id IS NULL)
    )
);

-- ========================================
-- FK CONSTRAINT ADD (Parte 2 → Parte 3)
-- ========================================

-- Ahora que partner_service_requests existe, agregamos FK a partner_notifications
ALTER TABLE partner_notifications
ADD CONSTRAINT fk_partner_notifications_service_request
FOREIGN KEY (related_service_request_id)
REFERENCES partner_service_requests(id)
ON DELETE SET NULL;

-- ========================================
-- INDEXES (PARTE 3)
-- ========================================

CREATE INDEX idx_partner_reviews_partner ON partner_reviews(partner_id);
CREATE INDEX idx_partner_reviews_reviewer ON partner_reviews(reviewer_id);
CREATE INDEX idx_partner_reviews_rating ON partner_reviews(rating);
CREATE INDEX idx_partner_reviews_public ON partner_reviews(is_public) WHERE is_public = true;

CREATE INDEX idx_partner_conversations_service ON partner_service_conversations(service_request_id);
CREATE INDEX idx_partner_conversations_sender ON partner_service_conversations(sender_id);
CREATE INDEX idx_partner_conversations_partner_sender ON partner_service_conversations(partner_sender_id);
CREATE INDEX idx_partner_conversations_unread ON partner_service_conversations(is_read) WHERE NOT is_read;

-- ========================================
-- COMMENTS (PARTE 3)
-- ========================================

COMMENT ON TABLE partner_reviews IS 'Reviews bidireccionales: empresas califican partners, partners responden';
COMMENT ON TABLE partner_service_conversations IS 'Conversaciones entre empresa y partner sobre servicios';
COMMENT ON COLUMN partner_service_conversations.response_deadline IS 'SLA deadline para respuesta';
