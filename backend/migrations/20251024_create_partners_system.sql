-- ===============================================
-- SISTEMA DE PARTNERS/ASOCIADOS - APONNT
-- Fecha: 2025-10-24
-- Descripción: Sistema completo de marketplace de servicios profesionales
-- ===============================================

-- 1. TABLA: partner_roles (Roles configurables de Partners)
CREATE TABLE IF NOT EXISTS partner_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    role_description TEXT,
    category VARCHAR(50), -- 'legal', 'medical', 'safety', 'coaching', 'audit', 'emergency', 'health', 'psychology', 'transport', 'other'
    is_active BOOLEAN DEFAULT true,
    requires_license BOOLEAN DEFAULT false, -- Requiere matrícula profesional
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles predeterminados
INSERT INTO partner_roles (role_name, role_description, category, requires_license) VALUES
('Abogado', 'Servicios legales y asesoría jurídica', 'legal', true),
('Médico', 'Atención médica y consultas', 'medical', true),
('Resp. Seguridad e Higiene', 'Responsable de seguridad e higiene laboral', 'safety', true),
('Coach', 'Coaching empresarial y personal', 'coaching', false),
('Auditor Externo', 'Auditorías contables y administrativas', 'audit', true),
('Servicio de Emergencias', 'Atención de emergencias 24/7', 'emergency', false),
('Enfermero', 'Atención de enfermería', 'medical', true),
('Nutricionista', 'Asesoramiento nutricional', 'health', true),
('Psicólogo Laboral', 'Atención psicológica en el trabajo', 'psychology', true),
('Transporte de Personal', 'Servicio de transporte para empleados', 'transport', false)
ON CONFLICT (role_name) DO NOTHING;

-- 2. TABLA: partners (Datos principales del Partner)
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,

    -- DATOS DE REGISTRO
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended', 'active'

    -- DATOS PERSONALES/EMPRESARIALES
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200), -- Si es empresa
    tax_id VARCHAR(50), -- CUIT/CUIL/RUT
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    alternative_phone VARCHAR(20),

    -- DIRECCIÓN
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Argentina',
    postal_code VARCHAR(20),

    -- ROL Y ESPECIALIDAD
    role_id INTEGER REFERENCES partner_roles(id),
    specialization TEXT, -- Especialización específica dentro del rol

    -- MATRÍCULAS PROFESIONALES (múltiples por jurisdicción)
    professional_licenses JSONB, -- Array de matrículas: [{type: 'nacional', number: '12345', issuer: 'Consejo Profesional', jurisdiction: 'Nacional', issue_date: '2020-01-01', expiry_date: '2025-01-01', file_url: '/docs/matricula.pdf'}]
    -- Ejemplos:
    -- Médico: [{type: 'nacional', number: 'MN 123456', issuer: 'Ministerio de Salud', jurisdiction: 'Nacional'}, {type: 'provincial', number: 'MP 78910', issuer: 'Colegio Médico', jurisdiction: 'Buenos Aires'}]
    -- Abogado: [{type: 'provincial', number: 'T 123 F 456', issuer: 'Colegio de Abogados', jurisdiction: 'CABA'}, {type: 'provincial', number: 'T 789 F 012', issuer: 'Colegio de Abogados', jurisdiction: 'Buenos Aires'}]
    -- Psicólogo: [{type: 'nacional', number: 'MN 98765', issuer: 'Ministerio de Salud', jurisdiction: 'Nacional'}]

    -- PERFIL PROFESIONAL
    profile_photo VARCHAR(500), -- URL de la foto de perfil
    bio TEXT, -- Biografía/Presentación profesional
    years_of_experience INTEGER,
    education JSONB, -- Array de estudios: [{institution, title, year, file_url}]
    certifications JSONB, -- Array de certificaciones: [{name, issuer, year, file_url}]
    languages JSONB, -- Array de idiomas: [{language, level}]

    -- DISPONIBILIDAD GEOGRÁFICA
    service_coverage VARCHAR(50) DEFAULT 'local', -- 'local', 'provincial', 'national', 'international'
    coverage_cities TEXT[], -- Array de ciudades donde presta servicios

    -- DISPONIBILIDAD HORARIA
    availability_schedule JSONB, -- {monday: {from: '09:00', to: '18:00', available: true}, ...}
    time_zone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',

    -- MODALIDAD DE CONTRATACIÓN
    contract_type VARCHAR(50), -- 'per_service', 'eventual', 'part_time', 'full_time'
    hourly_rate DECIMAL(10, 2), -- Tarifa por hora
    service_rate DECIMAL(10, 2), -- Tarifa por servicio único

    -- COMISIONES Y MONTOS FIJOS
    commission_percentage DECIMAL(5, 2), -- % de comisión por usuario contratado por módulo (ej: emergencias 5% por usuario)
    fixed_rate_per_employee DECIMAL(10, 2), -- Monto fijo por empleado contratado (ej: $500/empleado/mes)
    commission_calculation VARCHAR(50) DEFAULT 'per_module_user', -- 'per_module_user', 'per_employee', 'per_company', 'per_service'

    min_service_duration INTEGER, -- Duración mínima de servicio en minutos

    -- EJEMPLO DE CÁLCULO DE COMISIÓN:
    -- Servicio de Emergencias Full-Time:
    --   - commission_percentage = 5.00 (5%)
    --   - commission_calculation = 'per_module_user'
    --   - Si empresa tiene 50 empleados con módulo emergencias → 50 * $X * 5%
    -- O bien:
    --   - fixed_rate_per_employee = 500.00
    --   - commission_calculation = 'per_employee'
    --   - Si empresa tiene 50 empleados → 50 * $500 = $25,000/mes

    -- FIRMA DIGITAL Y VALIDACIÓN
    digital_signature TEXT, -- Firma digital encriptada
    signature_timestamp TIMESTAMP, -- Timestamp de la firma
    declaration_accepted BOOLEAN DEFAULT false, -- Aceptó declaración jurada
    declaration_timestamp TIMESTAMP,
    declaration_ip VARCHAR(50), -- IP desde donde aceptó

    -- VISIBILIDAD Y MARKETING
    is_public BOOLEAN DEFAULT false, -- Visible en marketplace
    featured BOOLEAN DEFAULT false, -- Destacado en marketplace
    rating DECIMAL(3, 2) DEFAULT 0.00, -- Calificación promedio (0.00 - 5.00)
    total_reviews INTEGER DEFAULT 0,
    total_services INTEGER DEFAULT 0, -- Cantidad de servicios completados

    -- METADATOS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    approved_by INTEGER REFERENCES users(id), -- Admin que aprobó
    approved_at TIMESTAMP,

    -- ÍNDICES
    CONSTRAINT partners_email_unique UNIQUE (email)
);

-- 3. TABLA: partner_documents (Documentación de respaldo)
CREATE TABLE IF NOT EXISTS partner_documents (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    document_type VARCHAR(50) NOT NULL, -- 'dni', 'license', 'certificate', 'diploma', 'insurance', 'cv', 'portfolio', 'other'
    document_name VARCHAR(200) NOT NULL,
    file_url VARCHAR(500) NOT NULL, -- URL del archivo almacenado
    file_size INTEGER, -- Tamaño en bytes
    file_type VARCHAR(50), -- 'pdf', 'jpg', 'png', 'doc', etc.

    -- VALIDACIÓN
    verified BOOLEAN DEFAULT false,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    expiration_date DATE, -- Para documentos con vencimiento (seguros, matrículas)

    -- METADATOS
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT, -- Notas del admin sobre el documento

    CONSTRAINT partner_documents_unique UNIQUE (partner_id, document_type, document_name)
);

-- 4. TABLA: partner_service_requests (Solicitudes de servicio)
CREATE TABLE IF NOT EXISTS partner_service_requests (
    id SERIAL PRIMARY KEY,

    -- RELACIONES
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Usuario que solicita

    -- DATOS DEL SERVICIO
    service_type VARCHAR(50) NOT NULL, -- Tipo de servicio solicitado
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

    -- FECHAS Y HORARIOS
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    preferred_date TIMESTAMP, -- Fecha preferida para el servicio
    scheduled_date TIMESTAMP, -- Fecha confirmada
    completed_date TIMESTAMP,

    -- ESTADO
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'
    status_history JSONB, -- Historial de cambios de estado

    -- UBICACIÓN
    service_location TEXT, -- Ubicación donde se prestará el servicio
    is_remote BOOLEAN DEFAULT false, -- Servicio remoto/online

    -- COSTO
    estimated_cost DECIMAL(10, 2),
    final_cost DECIMAL(10, 2),
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'partial', 'refunded'

    -- EVALUACIÓN
    rating INTEGER, -- Calificación del servicio (1-5)
    review TEXT, -- Reseña del servicio
    reviewed_at TIMESTAMP,

    -- ARCHIVOS ADJUNTOS
    attachments JSONB, -- Array de archivos adjuntos: [{name, url, type}]

    -- METADATOS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT partner_service_requests_valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- 5. TABLA: partner_availability (Disponibilidad específica/bloqueos)
CREATE TABLE IF NOT EXISTS partner_availability (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    -- TIPO DE DISPONIBILIDAD
    availability_type VARCHAR(20) NOT NULL, -- 'available', 'blocked', 'vacation', 'busy'

    -- RANGO DE FECHAS/HORAS
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,

    -- DETALLES
    reason TEXT,
    is_recurring BOOLEAN DEFAULT false, -- Si se repite semanalmente
    recurrence_pattern VARCHAR(50), -- 'weekly', 'monthly', etc.

    -- METADATOS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT partner_availability_valid_dates CHECK (end_datetime > start_datetime)
);

-- 6. TABLA: partner_reviews (Reseñas y calificaciones)
CREATE TABLE IF NOT EXISTS partner_reviews (
    id SERIAL PRIMARY KEY,

    -- RELACIONES
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    service_request_id INTEGER REFERENCES partner_service_requests(id) ON DELETE SET NULL,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- CALIFICACIÓN
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,

    -- ASPECTOS CALIFICADOS (opcional)
    professionalism_rating INTEGER CHECK (professionalism_rating IS NULL OR (professionalism_rating >= 1 AND professionalism_rating <= 5)),
    punctuality_rating INTEGER CHECK (punctuality_rating IS NULL OR (punctuality_rating >= 1 AND punctuality_rating <= 5)),
    quality_rating INTEGER CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
    communication_rating INTEGER CHECK (communication_rating IS NULL OR (communication_rating >= 1 AND communication_rating <= 5)),

    -- RESPUESTA DEL PARTNER
    partner_response TEXT,
    partner_response_date TIMESTAMP,

    -- MODERACIÓN
    is_public BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false, -- Verificado como cliente real
    moderated_by INTEGER REFERENCES users(id),
    moderation_notes TEXT,

    -- METADATOS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA: partner_notifications (Notificaciones para partners)
CREATE TABLE IF NOT EXISTS partner_notifications (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    notification_type VARCHAR(50) NOT NULL, -- 'new_request', 'request_accepted', 'payment_received', 'review_received', 'document_verified', etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    link VARCHAR(500), -- URL de acción relacionada

    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,

    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_role_id ON partners(role_id);
CREATE INDEX IF NOT EXISTS idx_partners_is_public ON partners(is_public);
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);

CREATE INDEX IF NOT EXISTS idx_partner_documents_partner_id ON partner_documents(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_documents_verified ON partner_documents(verified);

CREATE INDEX IF NOT EXISTS idx_service_requests_partner_id ON partner_service_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_company_id ON partner_service_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON partner_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_requested_date ON partner_service_requests(requested_date);

CREATE INDEX IF NOT EXISTS idx_partner_availability_partner_id ON partner_availability(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_availability_dates ON partner_availability(start_datetime, end_datetime);

CREATE INDEX IF NOT EXISTS idx_partner_reviews_partner_id ON partner_reviews(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_reviews_rating ON partner_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_partner_reviews_is_public ON partner_reviews(is_public);

CREATE INDEX IF NOT EXISTS idx_partner_notifications_partner_id ON partner_notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_notifications_is_read ON partner_notifications(is_read);

-- ===============================================
-- TRIGGERS PARA UPDATED_AT
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_service_requests_updated_at BEFORE UPDATE ON partner_service_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_availability_updated_at BEFORE UPDATE ON partner_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_reviews_updated_at BEFORE UPDATE ON partner_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- FUNCIÓN: Actualizar rating del partner
-- ===============================================

CREATE OR REPLACE FUNCTION update_partner_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar rating y total de reviews del partner
    UPDATE partners
    SET
        rating = (
            SELECT COALESCE(AVG(rating), 0.00)
            FROM partner_reviews
            WHERE partner_id = NEW.partner_id AND is_public = true
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM partner_reviews
            WHERE partner_id = NEW.partner_id AND is_public = true
        )
    WHERE id = NEW.partner_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_partner_rating
    AFTER INSERT OR UPDATE ON partner_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_rating();

-- ===============================================
-- FUNCIÓN: Incrementar total de servicios completados
-- ===============================================

CREATE OR REPLACE FUNCTION increment_partner_services()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE partners
        SET total_services = total_services + 1
        WHERE id = NEW.partner_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_partner_services
    AFTER INSERT OR UPDATE ON partner_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION increment_partner_services();

-- 8. TABLA: partner_service_conversations (Hilo de conversación de solicitudes)
CREATE TABLE IF NOT EXISTS partner_service_conversations (
    id SERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL REFERENCES partner_service_requests(id) ON DELETE CASCADE,

    -- MENSAJE
    sender_type VARCHAR(20) NOT NULL, -- 'client', 'partner', 'admin', 'mediator'
    sender_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,

    -- ARCHIVOS ADJUNTOS
    attachments JSONB, -- [{name, url, type, size}]

    -- SLA Y TIMESTAMPS
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    response_deadline TIMESTAMP, -- Deadline para respuesta (SLA)
    is_urgent BOOLEAN DEFAULT false,

    -- METADATOS
    is_internal_note BOOLEAN DEFAULT false, -- Nota interna solo visible para admins
    edited_at TIMESTAMP,
    edited_by INTEGER REFERENCES users(id)
);

-- 9. TABLA: partner_mediation_cases (Casos de mediación por conflictos)
CREATE TABLE IF NOT EXISTS partner_mediation_cases (
    id SERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL REFERENCES partner_service_requests(id) ON DELETE CASCADE,

    -- PARTES INVOLUCRADAS
    partner_id INTEGER NOT NULL REFERENCES partners(id),
    client_company_id INTEGER NOT NULL REFERENCES companies(company_id),
    client_user_id INTEGER NOT NULL REFERENCES users(id),

    -- MEDIADOR ASIGNADO
    mediator_id INTEGER REFERENCES users(id), -- Admin o Supervisor asignado
    mediator_assigned_at TIMESTAMP,

    -- MOTIVO Y DESCRIPCIÓN
    reason VARCHAR(100) NOT NULL, -- 'quality_issue', 'payment_dispute', 'deadline_breach', 'unprofessional_conduct', 'other'
    description TEXT NOT NULL,
    escalated_by INTEGER NOT NULL REFERENCES users(id), -- Quién escaló el conflicto
    escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- ESTADO
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'closed'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    -- RESOLUCIÓN
    resolution TEXT,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_type VARCHAR(50), -- 'refund_issued', 'warning_partner', 'warning_client', 'service_redo', 'no_action', 'suspended_partner', 'other'

    -- ACCIONES TOMADAS
    actions_taken JSONB, -- [{action: 'refund_50%', taken_by: user_id, taken_at: timestamp, notes: '...'}]

    -- METADATOS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

-- 10. TABLA: partner_legal_consents (Consentimientos legales firmados)
CREATE TABLE IF NOT EXISTS partner_legal_consents (
    id SERIAL PRIMARY KEY,

    -- TIPO DE DOCUMENTO
    consent_type VARCHAR(50) NOT NULL, -- 'partner_registration', 'service_terms', 'commission_agreement', 'liability_waiver', 'privacy_policy'
    consent_version VARCHAR(20) NOT NULL, -- 'v1.0', 'v2.0', etc.

    -- FIRMANTE
    entity_type VARCHAR(20) NOT NULL, -- 'partner', 'company', 'user'
    entity_id INTEGER NOT NULL, -- ID del partner, company o user
    signed_by_name VARCHAR(200) NOT NULL,
    signed_by_email VARCHAR(255) NOT NULL,

    -- FIRMA DIGITAL
    digital_signature TEXT NOT NULL, -- Hash/firma encriptada
    signature_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signature_ip VARCHAR(50) NOT NULL,
    signature_user_agent TEXT,

    -- CONTENIDO DEL CONSENTIMIENTO
    consent_text TEXT NOT NULL, -- Texto completo del consentimiento aceptado
    consent_text_hash VARCHAR(64) NOT NULL, -- SHA256 del texto para verificar integridad

    -- TÉRMINOS ESPECÍFICOS
    commission_rate DECIMAL(5, 2), -- % de comisión acordado (si aplica)
    commission_terms TEXT, -- Términos específicos de comisión

    -- VALIDEZ
    is_valid BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP,
    revoked_by INTEGER REFERENCES users(id),
    revocation_reason TEXT,

    -- METADATOS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT partner_legal_consents_unique UNIQUE (entity_type, entity_id, consent_type, consent_version, signature_timestamp)
);

-- 11. TABLA: partner_commissions_log (Registro de comisiones generadas)
CREATE TABLE IF NOT EXISTS partner_commissions_log (
    id SERIAL PRIMARY KEY,

    -- RELACIONES
    partner_id INTEGER NOT NULL REFERENCES partners(id),
    service_request_id INTEGER REFERENCES partner_service_requests(id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- CÁLCULO
    calculation_type VARCHAR(50) NOT NULL, -- 'per_service', 'per_module_user', 'per_employee', 'per_company'
    base_amount DECIMAL(10, 2) NOT NULL, -- Monto base sobre el cual se calcula
    commission_percentage DECIMAL(5, 2) NOT NULL, -- % aplicado
    commission_amount DECIMAL(10, 2) NOT NULL, -- Monto final de comisión

    -- PERÍODO
    period_start DATE,
    period_end DATE,

    -- ESTADO
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'disputed', 'cancelled'
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    payment_reference VARCHAR(100),

    -- NOTAS
    notes TEXT,

    -- METADATOS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- ÍNDICES ADICIONALES
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_service_conversations_request_id ON partner_service_conversations(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_conversations_sent_at ON partner_service_conversations(sent_at);

CREATE INDEX IF NOT EXISTS idx_mediation_cases_status ON partner_mediation_cases(status);
CREATE INDEX IF NOT EXISTS idx_mediation_cases_mediator_id ON partner_mediation_cases(mediator_id);
CREATE INDEX IF NOT EXISTS idx_mediation_cases_partner_id ON partner_mediation_cases(partner_id);

CREATE INDEX IF NOT EXISTS idx_legal_consents_entity ON partner_legal_consents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_legal_consents_type ON partner_legal_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_legal_consents_is_valid ON partner_legal_consents(is_valid);

CREATE INDEX IF NOT EXISTS idx_commissions_log_partner_id ON partner_commissions_log(partner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_log_status ON partner_commissions_log(status);
CREATE INDEX IF NOT EXISTS idx_commissions_log_period ON partner_commissions_log(period_start, period_end);

-- ===============================================
-- TRIGGERS ADICIONALES
-- ===============================================

CREATE TRIGGER update_mediation_cases_updated_at BEFORE UPDATE ON partner_mediation_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_log_updated_at BEFORE UPDATE ON partner_commissions_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- FUNCIÓN: Crear conversación automática al crear solicitud
-- ===============================================

CREATE OR REPLACE FUNCTION create_initial_conversation_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear mensaje inicial automático
    INSERT INTO partner_service_conversations (
        service_request_id,
        sender_type,
        sender_id,
        message,
        response_deadline
    ) VALUES (
        NEW.id,
        'client',
        NEW.user_id,
        CONCAT('Solicitud creada: ', NEW.title, E'\n\n', NEW.description),
        NEW.preferred_date -- Deadline es la fecha preferida
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_initial_conversation
    AFTER INSERT ON partner_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_conversation_message();

-- ===============================================
-- FUNCIÓN: Calcular y registrar comisión automáticamente
-- ===============================================

CREATE OR REPLACE FUNCTION calculate_commission_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    partner_record RECORD;
    company_employees INTEGER;
    base_amount_calc DECIMAL(10, 2);
    commission_calc DECIMAL(10, 2);
BEGIN
    -- Solo calcular si el servicio se completó
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

        -- Obtener datos del partner
        SELECT * INTO partner_record FROM partners WHERE id = NEW.partner_id;

        IF partner_record.commission_percentage IS NOT NULL AND partner_record.commission_percentage > 0 THEN

            -- Calcular base según tipo de cálculo
            CASE partner_record.commission_calculation
                WHEN 'per_service' THEN
                    base_amount_calc := NEW.final_cost;

                WHEN 'per_employee' THEN
                    -- Contar empleados de la empresa
                    SELECT COUNT(*) INTO company_employees FROM users WHERE company_id = NEW.company_id;
                    base_amount_calc := partner_record.fixed_rate_per_employee * company_employees;

                WHEN 'per_module_user' THEN
                    -- Calcular por usuarios que tienen el módulo (lógica personalizada)
                    base_amount_calc := NEW.final_cost; -- Simplificado

                ELSE
                    base_amount_calc := NEW.final_cost;
            END CASE;

            -- Calcular comisión
            commission_calc := (base_amount_calc * partner_record.commission_percentage) / 100;

            -- Registrar en log de comisiones
            INSERT INTO partner_commissions_log (
                partner_id,
                service_request_id,
                company_id,
                calculation_type,
                base_amount,
                commission_percentage,
                commission_amount,
                status
            ) VALUES (
                NEW.partner_id,
                NEW.id,
                NEW.company_id,
                partner_record.commission_calculation,
                base_amount_calc,
                partner_record.commission_percentage,
                commission_calc,
                'pending'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_commission
    AFTER INSERT OR UPDATE ON partner_service_requests
    FOR EACH ROW
    EXECUTE FUNCTION calculate_commission_on_completion();

-- ===============================================
-- COMENTARIOS EN TABLAS (Documentación)
-- ===============================================

COMMENT ON TABLE partners IS 'Partners/Asociados profesionales que ofrecen servicios en la plataforma';
COMMENT ON TABLE partner_roles IS 'Roles configurables de partners (abogados, médicos, etc)';
COMMENT ON TABLE partner_documents IS 'Documentación de respaldo de partners (CV, matrículas, certificados)';
COMMENT ON TABLE partner_service_requests IS 'Solicitudes de servicio de empresas a partners';
COMMENT ON TABLE partner_availability IS 'Disponibilidad y bloqueos de horarios de partners';
COMMENT ON TABLE partner_reviews IS 'Reseñas y calificaciones de servicios de partners';
COMMENT ON TABLE partner_notifications IS 'Notificaciones enviadas a partners';
COMMENT ON TABLE partner_service_conversations IS 'Hilo de conversación de solicitudes (incluye timestamp, SLA, deadline)';
COMMENT ON TABLE partner_mediation_cases IS 'Casos de mediación para resolver conflictos entre cliente y partner';
COMMENT ON TABLE partner_legal_consents IS 'Consentimientos legales firmados digitalmente (deslinde responsabilidad, comisiones)';
COMMENT ON TABLE partner_commissions_log IS 'Registro de comisiones generadas por servicios completados';

-- ===============================================
-- FIN DE MIGRACIÓN
-- ===============================================
