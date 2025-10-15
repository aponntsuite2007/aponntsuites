-- ========================================
-- SISTEMA DE CONSENTIMIENTOS BIOMÉTRICOS ENTERPRISE
-- Cumplimiento: Ley 25.326 (Argentina), GDPR, BIPA
-- ========================================

-- 1. TABLA PRINCIPAL DE CONSENTIMIENTOS
CREATE TABLE IF NOT EXISTS biometric_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,
    user_id UUID NOT NULL,

    -- Tipo y estado del consentimiento
    consent_type VARCHAR(50) NOT NULL DEFAULT 'biometric_analysis',
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMP,
    revoked BOOLEAN NOT NULL DEFAULT false,
    revoked_date TIMESTAMP,
    revoked_reason TEXT,
    revoked_ip_address INET,
    expires_at TIMESTAMP,

    -- Documentación legal
    consent_text TEXT NOT NULL,
    consent_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    consent_document_hash VARCHAR(64), -- SHA-256 del PDF
    consent_document_url TEXT, -- URL al PDF almacenado

    -- Proceso de solicitud
    consent_token UUID UNIQUE, -- Token único para el link de consentimiento
    consent_token_expires_at TIMESTAMP,
    consent_email_sent_at TIMESTAMP,
    consent_link_accessed_at TIMESTAMP,
    consent_link_access_count INTEGER DEFAULT 0,

    -- Respuesta del usuario
    consent_response_timestamp TIMESTAMP,
    consent_response_hash VARCHAR(64), -- SHA-256 de toda la respuesta
    acceptance_method VARCHAR(50), -- 'facial', 'fingerprint', 'email', 'biometric_validation'

    -- Audit trail
    ip_address INET,
    user_agent TEXT,
    consent_geolocation JSONB, -- {lat, lng, city, country}
    device_fingerprint TEXT,

    -- Validación biométrica (para consentimientos que requieren foto)
    biometric_validation_hash VARCHAR(64), -- Hash de la foto tomada al aceptar
    biometric_validation_image_url TEXT, -- URL segura de la imagen
    biometric_validation_confidence DECIMAL(5,2), -- Confianza de validación facial

    -- Thread de emails
    email_thread JSONB, -- Array de {subject, sent_at, message_id, status}

    -- Firma digital inmutable (HMAC de todos los campos críticos)
    immutable_signature VARCHAR(128),
    signature_algorithm VARCHAR(20) DEFAULT 'HMAC-SHA256',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_consent_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_consent_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Constraints
    CONSTRAINT check_consent_dates CHECK (
        (consent_given = true AND consent_date IS NOT NULL) OR
        (consent_given = false)
    ),
    CONSTRAINT check_token_expiry CHECK (
        consent_token IS NULL OR
        consent_token_expires_at IS NOT NULL
    )
);

-- 2. TABLA DE AUDITORÍA INMUTABLE (append-only)
CREATE TABLE IF NOT EXISTS consent_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    consent_id UUID, -- Referencia al consentimiento

    -- Evento
    action VARCHAR(50) NOT NULL, -- 'REQUESTED', 'GRANTED', 'REVOKED', 'EXPIRED', 'EMAIL_SENT', 'LINK_ACCESSED'
    action_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Detalles
    ip_address INET,
    user_agent TEXT,
    performed_by_user_id UUID, -- Quién realizó la acción (puede ser diferente del user_id)
    automated BOOLEAN DEFAULT false, -- Si fue acción automática del sistema
    reason TEXT,

    -- Metadata
    metadata JSONB, -- Datos adicionales del evento

    -- Firma digital para prevenir tampering
    event_signature VARCHAR(128),

    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_consent FOREIGN KEY (consent_id) REFERENCES biometric_consents(id) ON DELETE SET NULL
);

-- 3. TABLA DE DOCUMENTOS LEGALES (versiones del documento de consentimiento)
CREATE TABLE IF NOT EXISTS consent_legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,

    -- Documento
    version VARCHAR(20) NOT NULL,
    document_type VARCHAR(50) NOT NULL DEFAULT 'consent_form',
    language VARCHAR(10) NOT NULL DEFAULT 'es-AR',

    -- Contenido
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Texto completo del documento
    pdf_url TEXT,
    pdf_hash VARCHAR(64), -- SHA-256 del PDF

    -- Regulaciones aplicadas
    regulations JSONB, -- ['Ley 25.326', 'GDPR', 'BIPA']

    -- Estado
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMP,

    -- Metadata
    created_by_user_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_legal_doc_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_legal_doc_creator FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT unique_version_company UNIQUE (company_id, version, document_type)
);

-- ==============================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ==============================================================

-- Búsquedas por usuario y empresa
CREATE INDEX IF NOT EXISTS idx_consents_user_company ON biometric_consents(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_consents_company_status ON biometric_consents(company_id, consent_given, revoked);
CREATE INDEX IF NOT EXISTS idx_consents_token ON biometric_consents(consent_token) WHERE consent_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consents_expires ON biometric_consents(expires_at) WHERE expires_at IS NOT NULL;

-- Búsquedas por tipo y método
CREATE INDEX IF NOT EXISTS idx_consents_type ON biometric_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_consents_method ON biometric_consents(acceptance_method);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_user ON consent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_company ON consent_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON consent_audit_log(action_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON consent_audit_log(action);

-- Documentos legales
CREATE INDEX IF NOT EXISTS idx_legal_docs_company_active ON consent_legal_documents(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_legal_docs_version ON consent_legal_documents(version);

-- ==============================================================
-- TRIGGERS
-- ==============================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_biometric_consent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_consent_updated_at ON biometric_consents;
CREATE TRIGGER trigger_consent_updated_at
    BEFORE UPDATE ON biometric_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_biometric_consent_updated_at();

-- Trigger para logging automático de cambios
CREATE OR REPLACE FUNCTION log_consent_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO consent_audit_log (company_id, user_id, consent_id, action, performed_by_user_id, automated)
        VALUES (NEW.company_id, NEW.user_id, NEW.id, 'CREATED', NEW.user_id, false);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.consent_given = false AND NEW.consent_given = true THEN
            INSERT INTO consent_audit_log (company_id, user_id, consent_id, action, performed_by_user_id, automated, metadata)
            VALUES (NEW.company_id, NEW.user_id, NEW.id, 'GRANTED', NEW.user_id, false,
                    jsonb_build_object('method', NEW.acceptance_method, 'timestamp', NEW.consent_date));
        ELSIF OLD.revoked = false AND NEW.revoked = true THEN
            INSERT INTO consent_audit_log (company_id, user_id, consent_id, action, performed_by_user_id, automated, reason, metadata)
            VALUES (NEW.company_id, NEW.user_id, NEW.id, 'REVOKED', NEW.user_id, false, NEW.revoked_reason,
                    jsonb_build_object('revoked_at', NEW.revoked_date, 'ip', NEW.revoked_ip_address));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_log_consent_changes ON biometric_consents;
CREATE TRIGGER trigger_log_consent_changes
    AFTER INSERT OR UPDATE ON biometric_consents
    FOR EACH ROW
    EXECUTE FUNCTION log_consent_changes();

-- ==============================================================
-- FUNCIONES HELPER
-- ==============================================================

-- Función para generar firma HMAC de un consentimiento
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

    -- En PostgreSQL, usamos encode(hmac(...)) para generar HMAC
    SELECT encode(hmac(v_data, p_secret, 'sha256'), 'hex') INTO v_signature;

    RETURN v_signature;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un consentimiento es válido
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

-- ==============================================================
-- GRANTS (ajustar según tus roles)
-- ==============================================================
-- GRANT SELECT, INSERT, UPDATE ON biometric_consents TO your_app_role;
-- GRANT SELECT, INSERT ON consent_audit_log TO your_app_role;
-- GRANT SELECT ON consent_legal_documents TO your_app_role;

-- ==============================================================
-- DATOS INICIALES
-- ==============================================================

-- Insertar documento legal base en español (Ley 25.326)
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

De conformidad con la Ley N° 25.326 de Protección de Datos Personales de Argentina y sus disposiciones complementarias, solicito su consentimiento expreso, libre e informado para el tratamiento de sus datos biométricos.

1. RESPONSABLE DEL TRATAMIENTO
[NOMBRE DE LA EMPRESA] con domicilio en [DIRECCIÓN], es responsable del tratamiento de sus datos personales.

2. FINALIDAD DEL TRATAMIENTO
Los datos biométricos (reconocimiento facial y análisis emocional) serán utilizados exclusivamente para:
- Control de asistencia laboral
- Análisis de bienestar y fatiga del personal
- Mejora de la seguridad en el ambiente laboral
- Cumplimiento de normativas laborales vigentes

3. DATOS RECOPILADOS
Se capturarán y procesarán los siguientes datos biométricos:
- Imagen facial (foto)
- Características faciales únicas (template facial)
- Análisis de expresiones emocionales (opcional)
- Indicadores de fatiga y bienestar (opcional)

4. TECNOLOGÍA UTILIZADA
Utilizamos Microsoft Azure Face API para el procesamiento de imágenes faciales, con servidores ubicados en [REGIÓN AZURE].

5. TIEMPO DE CONSERVACIÓN
Los datos biométricos se conservarán durante el tiempo que dure la relación laboral y hasta 90 días después de su finalización, salvo que existan obligaciones legales que requieran su conservación por más tiempo.

6. TRANSFERENCIA INTERNACIONAL
Los datos pueden ser procesados en servidores de Microsoft Azure ubicados fuera de Argentina, con garantías adecuadas de protección según la Ley 25.326.

7. SUS DERECHOS (Art. 14, 15, 16 Ley 25.326)
Usted tiene derecho a:
- Acceder a sus datos biométricos
- Rectificar datos inexactos o incompletos
- Suprimir sus datos cuando corresponda
- Oponerse al tratamiento en determinadas circunstancias
- Revocar este consentimiento en cualquier momento

Para ejercer estos derechos, puede contactar a: [EMAIL/TELÉFONO]

8. CARÁCTER VOLUNTARIO
El otorgamiento de este consentimiento es voluntario. La negativa a otorgarlo no afectará negativamente su situación laboral, aunque podrá limitar el acceso a ciertos sistemas biométricos de control de asistencia.

9. REVOCACIÓN
Puede revocar este consentimiento en cualquier momento mediante comunicación escrita a [EMAIL], sin efectos retroactivos.

10. SEGURIDAD
Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos biométricos contra acceso no autorizado, pérdida o destrucción.

Al aceptar este consentimiento, declara haber leído, comprendido y aceptado todos los términos aquí expuestos.

Normativa aplicable:
- Ley 25.326 de Protección de Datos Personales (Argentina)
- Decreto 1558/2001 (Reglamentario)
- Disposición AAIP 60/2016
- GDPR (Reglamento UE 2016/679) - aplicable
- BIPA (Illinois Biometric Information Privacy Act) - como referencia de mejores prácticas' as content,
    '["Ley 25.326", "GDPR", "BIPA"]'::jsonb as regulations,
    true as is_active
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM consent_legal_documents
    WHERE company_id = companies.company_id
    AND version = '1.0'
    AND document_type = 'consent_form'
);

COMMIT;
