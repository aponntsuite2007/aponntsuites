-- ===============================================
-- EXTENSIÓN DE TABLA biometric_consents
-- Agregar campos enterprise sin DROP
-- ===============================================

-- Agregar nuevos campos (IF NOT EXISTS funciona en versiones modernas de PostgreSQL)
DO $$
BEGIN
    -- Documentación legal
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_document_hash') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_document_hash VARCHAR(64);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_document_url') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_document_url TEXT;
    END IF;

    -- Proceso de solicitud
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_token') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_token UUID UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_token_expires_at') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_token_expires_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_email_sent_at') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_email_sent_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_link_accessed_at') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_link_accessed_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_link_access_count') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_link_access_count INTEGER DEFAULT 0;
    END IF;

    -- Respuesta del usuario
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_response_timestamp') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_response_timestamp TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_response_hash') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_response_hash VARCHAR(64);
    END IF;

    -- Audit trail expandido
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='consent_geolocation') THEN
        ALTER TABLE biometric_consents ADD COLUMN consent_geolocation JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='device_fingerprint') THEN
        ALTER TABLE biometric_consents ADD COLUMN device_fingerprint TEXT;
    END IF;

    -- Validación biométrica
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='biometric_validation_hash') THEN
        ALTER TABLE biometric_consents ADD COLUMN biometric_validation_hash VARCHAR(64);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='biometric_validation_image_url') THEN
        ALTER TABLE biometric_consents ADD COLUMN biometric_validation_image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='biometric_validation_confidence') THEN
        ALTER TABLE biometric_consents ADD COLUMN biometric_validation_confidence DECIMAL(5,2);
    END IF;

    -- Email thread
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='email_thread') THEN
        ALTER TABLE biometric_consents ADD COLUMN email_thread JSONB;
    END IF;

    -- Firma digital
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='immutable_signature') THEN
        ALTER TABLE biometric_consents ADD COLUMN immutable_signature VARCHAR(128);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='biometric_consents' AND column_name='signature_algorithm') THEN
        ALTER TABLE biometric_consents ADD COLUMN signature_algorithm VARCHAR(20) DEFAULT 'HMAC-SHA256';
    END IF;

END$$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_consents_user_company ON biometric_consents(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_consents_company_status ON biometric_consents(company_id, consent_given, revoked);
CREATE INDEX IF NOT EXISTS idx_consents_token ON biometric_consents(consent_token) WHERE consent_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consents_expires ON biometric_consents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consents_type ON biometric_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_consents_method ON biometric_consents(acceptance_method);

-- Crear tablas adicionales si no existen
CREATE TABLE IF NOT EXISTS consent_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    consent_id UUID,
    action VARCHAR(50) NOT NULL,
    action_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    performed_by_user_id UUID,
    automated BOOLEAN DEFAULT false,
    reason TEXT,
    metadata JSONB,
    event_signature VARCHAR(128),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_consent FOREIGN KEY (consent_id) REFERENCES biometric_consents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS consent_legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,
    version VARCHAR(20) NOT NULL,
    document_type VARCHAR(50) NOT NULL DEFAULT 'consent_form',
    language VARCHAR(10) NOT NULL DEFAULT 'es-AR',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    pdf_url TEXT,
    pdf_hash VARCHAR(64),
    regulations JSONB,
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMP,
    created_by_user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_legal_doc_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_legal_doc_creator FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT unique_version_company UNIQUE (company_id, version, document_type)
);

-- Índices para tablas nuevas
CREATE INDEX IF NOT EXISTS idx_audit_user ON consent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_company ON consent_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON consent_audit_log(action_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON consent_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_legal_docs_company_active ON consent_legal_documents(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_legal_docs_version ON consent_legal_documents(version);

-- Funciones helper
CREATE OR REPLACE FUNCTION generate_consent_signature(
    p_consent_id UUID,
    p_secret TEXT
) RETURNS VARCHAR AS $$
DECLARE
    v_data TEXT;
    v_signature VARCHAR;
BEGIN
    SELECT
        user_id::TEXT || company_id::TEXT || consent_type ||
        consent_given::TEXT || COALESCE(consent_date::TEXT, '') ||
        COALESCE(consent_document_hash, '') || COALESCE(consent_response_hash, '')
    INTO v_data
    FROM biometric_consents
    WHERE id = p_consent_id;

    SELECT encode(hmac(v_data, p_secret, 'sha256'), 'hex') INTO v_signature;
    RETURN v_signature;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_consent_valid(p_consent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    SELECT
        consent_given = true AND
        revoked = false AND
        (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    INTO v_valid
    FROM biometric_consents
    WHERE id = p_consent_id;

    RETURN COALESCE(v_valid, false);
END;
$$ LANGUAGE plpgsql;

-- Insertar documentos legales base
INSERT INTO consent_legal_documents (
    company_id,
    version,
    document_type,
    language,
    title,
    content,
    regulations,
    is_active
)
SELECT
    company_id,
    '1.0' as version,
    'consent_form' as document_type,
    'es-AR' as language,
    'Consentimiento para Análisis Biométrico' as title,
    'CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE DATOS BIOMÉTRICOS

De conformidad con la Ley N° 25.326 de Protección de Datos Personales de Argentina, GDPR y BIPA, solicito su consentimiento expreso para el tratamiento de sus datos biométricos.

1. RESPONSABLE: [EMPRESA]
2. FINALIDAD: Control de asistencia, análisis de bienestar y seguridad laboral
3. DATOS: Imagen facial, características faciales, análisis emocional
4. TECNOLOGÍA: Microsoft Azure Face API
5. CONSERVACIÓN: Duración de la relación laboral + 90 días
6. DERECHOS: Acceso, rectificación, supresión, revocación (Art. 14-16 Ley 25.326)
7. CONTACTO: [EMAIL]

Normativa: Ley 25.326 (Argentina), GDPR, BIPA' as content,
    '["Ley 25.326", "GDPR", "BIPA"]'::jsonb as regulations,
    true as is_active
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM consent_legal_documents cld
    WHERE cld.company_id = companies.company_id
    AND cld.version = '1.0'
);

COMMIT;
