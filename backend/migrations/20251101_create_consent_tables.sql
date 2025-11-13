/**
 * MIGRACIÓN: Sistema de Consentimientos
 * Fecha: 2025-11-01
 * Descripción: Tablas para gestión de consentimientos de todos los tipos de usuarios
 */

-- =========================================================================
-- TABLA 1: consent_definitions (Master de consentimientos)
-- =========================================================================
CREATE TABLE IF NOT EXISTS consent_definitions (
    consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    full_text TEXT NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    applicable_roles TEXT[] NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('privacy', 'legal', 'commercial', 'safety', 'operational')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE consent_definitions IS 'Definiciones maestras de consentimientos aplicables a diferentes roles';
COMMENT ON COLUMN consent_definitions.consent_key IS 'Identificador único: biometric_data, email_marketing, etc.';
COMMENT ON COLUMN consent_definitions.applicable_roles IS 'Roles a los que aplica: employee, vendor, leader, supervisor, partner, admin';
COMMENT ON COLUMN consent_definitions.is_required IS 'Si es obligatorio para operar el sistema';
COMMENT ON COLUMN consent_definitions.version IS 'Versión del consentimiento para control de cambios';

-- =========================================================================
-- TABLA 2: user_consents (Aceptaciones de usuarios)
-- =========================================================================
CREATE TABLE IF NOT EXISTS user_consents (
    user_consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('employee', 'vendor', 'leader', 'supervisor', 'partner', 'admin')),
    consent_id UUID NOT NULL REFERENCES consent_definitions(consent_id) ON DELETE CASCADE,
    consent_version VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')),
    accepted_at TIMESTAMP NULL,
    rejected_at TIMESTAMP NULL,
    revoked_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    signature_data TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE user_consents IS 'Registro de aceptaciones/rechazos de consentimientos por usuario';
COMMENT ON COLUMN user_consents.user_type IS 'Tipo de usuario: employee (users table), vendor/leader/supervisor/partner (partners table)';
COMMENT ON COLUMN user_consents.status IS 'Estado: pending, accepted, rejected, revoked';
COMMENT ON COLUMN user_consents.signature_data IS 'JSON con datos de firma digital si aplica';

-- =========================================================================
-- TABLA 3: consent_audit_log (Histórico de cambios)
-- =========================================================================
CREATE TABLE IF NOT EXISTS consent_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_consent_id UUID NOT NULL REFERENCES user_consents(user_consent_id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'accepted', 'rejected', 'revoked', 'updated', 'viewed')),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    ip_address VARCHAR(45),
    changed_by INTEGER,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE consent_audit_log IS 'Auditoría completa de cambios en consentimientos';
COMMENT ON COLUMN consent_audit_log.action IS 'Acción realizada: created, accepted, rejected, revoked, updated, viewed';
COMMENT ON COLUMN consent_audit_log.changed_by IS 'user_id de quien realizó el cambio (puede ser admin)';
COMMENT ON COLUMN consent_audit_log.metadata IS 'Datos adicionales en formato JSON';

-- =========================================================================
-- ÍNDICES
-- =========================================================================
CREATE INDEX idx_consent_definitions_roles ON consent_definitions USING GIN(applicable_roles);
CREATE INDEX idx_consent_definitions_active ON consent_definitions(is_active) WHERE is_active = true;
CREATE INDEX idx_consent_definitions_key ON consent_definitions(consent_key);

CREATE INDEX idx_user_consents_user ON user_consents(user_id, user_type);
CREATE INDEX idx_user_consents_consent ON user_consents(consent_id);
CREATE INDEX idx_user_consents_status ON user_consents(status);
CREATE INDEX idx_user_consents_pending ON user_consents(user_id, user_type, status) WHERE status = 'pending';

CREATE INDEX idx_consent_audit_user_consent ON consent_audit_log(user_consent_id);
CREATE INDEX idx_consent_audit_created_at ON consent_audit_log(created_at DESC);

-- =========================================================================
-- FUNCIONES HELPER
-- =========================================================================

-- Obtener consentimientos pendientes de un usuario
CREATE OR REPLACE FUNCTION get_pending_consents(p_user_id INTEGER, p_user_type VARCHAR)
RETURNS TABLE (
    consent_id UUID,
    consent_key VARCHAR,
    title VARCHAR,
    description TEXT,
    is_required BOOLEAN,
    category VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cd.consent_id,
        cd.consent_key,
        cd.title,
        cd.description,
        cd.is_required,
        cd.category
    FROM consent_definitions cd
    WHERE cd.is_active = true
    AND p_user_type = ANY(cd.applicable_roles)
    AND NOT EXISTS (
        SELECT 1 FROM user_consents uc
        WHERE uc.user_id = p_user_id
        AND uc.user_type = p_user_type
        AND uc.consent_id = cd.consent_id
        AND uc.status IN ('accepted', 'pending')
    )
    ORDER BY cd.is_required DESC, cd.created_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_consents IS 'Obtiene consentimientos pendientes de un usuario según su tipo';

-- Verificar si un usuario tiene consentimientos obligatorios pendientes
CREATE OR REPLACE FUNCTION has_pending_required_consents(p_user_id INTEGER, p_user_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    pending_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pending_count
    FROM consent_definitions cd
    WHERE cd.is_active = true
    AND cd.is_required = true
    AND p_user_type = ANY(cd.applicable_roles)
    AND NOT EXISTS (
        SELECT 1 FROM user_consents uc
        WHERE uc.user_id = p_user_id
        AND uc.user_type = p_user_type
        AND uc.consent_id = cd.consent_id
        AND uc.status = 'accepted'
    );

    RETURN pending_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION has_pending_required_consents IS 'Verifica si un usuario tiene consentimientos obligatorios sin aceptar';

-- Obtener estadísticas de consentimientos por tipo de usuario
CREATE OR REPLACE FUNCTION get_consent_stats_by_role(p_user_type VARCHAR)
RETURNS TABLE (
    consent_key VARCHAR,
    title VARCHAR,
    total_applicable INTEGER,
    total_accepted INTEGER,
    total_rejected INTEGER,
    total_pending INTEGER,
    acceptance_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cd.consent_key,
        cd.title,
        COUNT(DISTINCT CASE WHEN p_user_type = ANY(cd.applicable_roles) THEN cd.consent_id END)::INTEGER as total_applicable,
        COUNT(DISTINCT CASE WHEN uc.status = 'accepted' THEN uc.user_consent_id END)::INTEGER as total_accepted,
        COUNT(DISTINCT CASE WHEN uc.status = 'rejected' THEN uc.user_consent_id END)::INTEGER as total_rejected,
        COUNT(DISTINCT CASE WHEN uc.status = 'pending' THEN uc.user_consent_id END)::INTEGER as total_pending,
        ROUND(
            CASE
                WHEN COUNT(DISTINCT uc.user_consent_id) > 0
                THEN (COUNT(DISTINCT CASE WHEN uc.status = 'accepted' THEN uc.user_consent_id END)::NUMERIC /
                      COUNT(DISTINCT uc.user_consent_id)::NUMERIC) * 100
                ELSE 0
            END, 2
        ) as acceptance_rate
    FROM consent_definitions cd
    LEFT JOIN user_consents uc ON uc.consent_id = cd.consent_id AND uc.user_type = p_user_type
    WHERE cd.is_active = true
    AND p_user_type = ANY(cd.applicable_roles)
    GROUP BY cd.consent_key, cd.title
    ORDER BY cd.consent_key;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_consent_stats_by_role IS 'Estadísticas de aceptación de consentimientos por rol';

-- =========================================================================
-- DATOS INICIALES: Consentimientos base
-- =========================================================================

-- CONSENTIMIENTOS PARA EMPLEADOS (employee)
INSERT INTO consent_definitions (consent_key, title, description, full_text, version, applicable_roles, is_required, category) VALUES
('biometric_data_employee',
 'Consentimiento de Datos Biométricos',
 'Autorización para captura y procesamiento de datos biométricos (huella dactilar, reconocimiento facial) para control de asistencia.',
 '<h3>Consentimiento Informado para el Tratamiento de Datos Biométricos</h3>
<p>Yo, en mi carácter de empleado, autorizo expresamente a la empresa a capturar, almacenar y procesar mis datos biométricos (huellas dactilares y reconocimiento facial) con el único propósito de registrar mi asistencia laboral.</p>
<h4>Declaro que:</h4>
<ul>
  <li>He sido informado sobre el uso exclusivo de estos datos para control de asistencia</li>
  <li>Mis datos serán almacenados de forma segura y encriptada</li>
  <li>No se compartirán con terceros sin mi consentimiento adicional</li>
  <li>Puedo revocar este consentimiento en cualquier momento</li>
</ul>
<h4>Base legal:</h4>
<p>Ley de Protección de Datos Personales 25.326 (Argentina) y normativas vigentes.</p>',
 '1.0',
 ARRAY['employee'],
 true,
 'safety'),

('privacy_policy_employee',
 'Política de Privacidad',
 'Aceptación de la política de privacidad y tratamiento de datos personales.',
 '<h3>Política de Privacidad y Protección de Datos</h3>
<p>Al aceptar esta política, usted reconoce que ha leído, comprendido y acepta cómo tratamos sus datos personales.</p>
<h4>Datos que recopilamos:</h4>
<ul>
  <li>Datos de identificación (nombre, DNI, CUIL)</li>
  <li>Datos de contacto (email, teléfono, dirección)</li>
  <li>Datos laborales (puesto, departamento, horarios)</li>
  <li>Registros de asistencia</li>
</ul>
<h4>Sus derechos:</h4>
<ul>
  <li>Acceso a sus datos personales</li>
  <li>Rectificación de datos incorrectos</li>
  <li>Supresión de datos (derecho al olvido)</li>
  <li>Portabilidad de datos</li>
</ul>',
 '1.0',
 ARRAY['employee'],
 true,
 'privacy'),

('terms_of_service_employee',
 'Términos de Servicio',
 'Aceptación de los términos y condiciones de uso del sistema.',
 '<h3>Términos y Condiciones de Uso del Sistema</h3>
<p>Este acuerdo rige el uso del sistema de control de asistencia biométrico.</p>
<h4>Obligaciones del usuario:</h4>
<ul>
  <li>Registrar correctamente su asistencia diaria</li>
  <li>No compartir sus credenciales de acceso</li>
  <li>Notificar irregularidades inmediatamente</li>
  <li>Usar el sistema solo para fines laborales autorizados</li>
</ul>
<h4>La empresa se compromete a:</h4>
<ul>
  <li>Mantener el sistema disponible y funcional</li>
  <li>Proteger sus datos con medidas de seguridad adecuadas</li>
  <li>Notificar cualquier incidente de seguridad</li>
</ul>',
 '1.0',
 ARRAY['employee'],
 true,
 'legal');

-- CONSENTIMIENTOS PARA VENDEDORES (vendor)
INSERT INTO consent_definitions (consent_key, title, description, full_text, version, applicable_roles, is_required, category) VALUES
('commission_agreement_vendor',
 'Acuerdo de Comisiones',
 'Aceptación de términos y condiciones del sistema de comisiones por ventas.',
 '<h3>Acuerdo de Comisiones - Vendedor</h3>
<p>Este acuerdo establece los términos del sistema de comisiones por ventas de licencias.</p>
<h4>Comisiones:</h4>
<ul>
  <li>Comisión estándar: Según tarifa vigente por empresa activa</li>
  <li>Bonificaciones por metas: Sujeto a cumplimiento de objetivos</li>
  <li>Pago mensual: Dentro de los primeros 10 días hábiles</li>
</ul>
<h4>Condiciones:</h4>
<ul>
  <li>La comisión se genera mientras la empresa mantenga licencia activa</li>
  <li>No hay comisión por empresas en mora mayor a 60 días</li>
  <li>Cambios en tarifas serán notificados con 30 días de anticipación</li>
</ul>',
 '1.0',
 ARRAY['vendor'],
 true,
 'commercial'),

('confidentiality_vendor',
 'Acuerdo de Confidencialidad',
 'Compromiso de confidencialidad sobre información de clientes y de la plataforma.',
 '<h3>Acuerdo de Confidencialidad</h3>
<p>Como vendedor, usted tendrá acceso a información confidencial que debe proteger.</p>
<h4>Información confidencial incluye:</h4>
<ul>
  <li>Datos de empresas clientes</li>
  <li>Información comercial (precios, descuentos, estrategias)</li>
  <li>Información técnica de la plataforma</li>
  <li>Datos de otros vendedores y partners</li>
</ul>
<h4>Compromisos:</h4>
<ul>
  <li>No divulgar información confidencial a terceros</li>
  <li>No usar información para beneficio personal fuera de Aponnt</li>
  <li>Mantener confidencialidad incluso después de cesar relación comercial</li>
</ul>',
 '1.0',
 ARRAY['vendor', 'leader', 'supervisor'],
 true,
 'legal'),

('code_of_ethics_vendor',
 'Código de Ética Comercial',
 'Aceptación del código de ética y buenas prácticas comerciales.',
 '<h3>Código de Ética Comercial</h3>
<p>Estándares éticos que deben guiar su actividad como vendedor.</p>
<h4>Prácticas éticas:</h4>
<ul>
  <li>Honestidad en presentación de productos y servicios</li>
  <li>No prometer funcionalidades inexistentes</li>
  <li>Respetar precio de lista (no descuentos no autorizados)</li>
  <li>No competencia desleal con otros vendedores</li>
</ul>
<h4>Prohibiciones:</h4>
<ul>
  <li>Sobornos o pagos indebidos</li>
  <li>Conflictos de interés no declarados</li>
  <li>Malversación de fondos o recursos</li>
  <li>Acoso o discriminación</li>
</ul>',
 '1.0',
 ARRAY['vendor', 'leader', 'supervisor', 'partner'],
 true,
 'legal');

-- CONSENTIMIENTOS PARA SUPERVISORES (supervisor)
INSERT INTO consent_definitions (consent_key, title, description, full_text, version, applicable_roles, is_required, category) VALUES
('escalation_protocol_supervisor',
 'Protocolo de Escalamiento',
 'Compromiso de atención a tickets escalados según SLA establecido.',
 '<h3>Protocolo de Escalamiento - Supervisor de Soporte</h3>
<p>Como supervisor, usted es responsable de atender tickets críticos escalados.</p>
<h4>SLA de Supervisores:</h4>
<ul>
  <li>Tickets urgentes escalados: Respuesta en 1 hora</li>
  <li>Tickets high escalados: Respuesta en 4 horas</li>
  <li>Disponibilidad: Horario laboral + guardias programadas</li>
</ul>
<h4>Responsabilidades:</h4>
<ul>
  <li>Revisar tickets escalados diariamente</li>
  <li>Proveer soluciones técnicas avanzadas</li>
  <li>Supervisar rendimiento de vendedores de soporte</li>
  <li>Escalar a desarrollo si es necesario</li>
</ul>',
 '1.0',
 ARRAY['supervisor'],
 true,
 'operational'),

('support_agreement_supervisor',
 'Acuerdo de Soporte Técnico',
 'Términos de prestación de soporte técnico avanzado.',
 '<h3>Acuerdo de Soporte Técnico Avanzado</h3>
<p>Condiciones de su rol como supervisor de soporte técnico.</p>
<h4>Alcance:</h4>
<ul>
  <li>Soporte de nivel 2 y 3</li>
  <li>Diagnóstico de problemas complejos</li>
  <li>Coordinación con equipo de desarrollo</li>
  <li>Capacitación a vendedores</li>
</ul>
<h4>Herramientas:</h4>
<ul>
  <li>Acceso a panel administrativo completo</li>
  <li>Auditor Engine para diagnósticos</li>
  <li>Logs completos del sistema</li>
  <li>Acceso temporal a empresas (con autorización)</li>
</ul>',
 '1.0',
 ARRAY['supervisor'],
 true,
 'operational');

-- CONSENTIMIENTOS PARA ASOCIADOS (partner)
INSERT INTO consent_definitions (consent_key, title, description, full_text, version, applicable_roles, is_required, category) VALUES
('partnership_agreement',
 'Acuerdo de Partnership',
 'Términos del acuerdo de partnership estratégico con Aponnt.',
 '<h3>Acuerdo de Partnership Estratégico</h3>
<p>Condiciones de la relación comercial como socio estratégico de Aponnt.</p>
<h4>Beneficios del Partner:</h4>
<ul>
  <li>Comisiones especiales sobre ventas</li>
  <li>Acceso a recursos de marketing</li>
  <li>Soporte prioritario</li>
  <li>Participación en decisiones estratégicas</li>
</ul>
<h4>Obligaciones:</h4>
<ul>
  <li>Cumplimiento de objetivos trimestrales</li>
  <li>Representar la marca de forma profesional</li>
  <li>Proveer feedback constructivo</li>
  <li>Colaborar en desarrollo de nuevos features</li>
</ul>',
 '1.0',
 ARRAY['partner'],
 true,
 'commercial'),

('sla_agreement_partner',
 'Acuerdo de Nivel de Servicio',
 'SLA especial para partners y sus clientes referidos.',
 '<h3>Acuerdo de Nivel de Servicio (SLA) - Partner</h3>
<p>Como partner, sus clientes tendrán SLA mejorado.</p>
<h4>SLA Partners:</h4>
<ul>
  <li>Soporte prioritario: Atención en menos de 2 horas</li>
  <li>Resolución acelerada: Targets más agresivos</li>
  <li>Gestor de cuenta dedicado</li>
  <li>Acceso directo a equipo técnico</li>
</ul>
<h4>Garantías:</h4>
<ul>
  <li>Uptime 99.9% mensual</li>
  <li>Respaldos diarios automáticos</li>
  <li>Notificación proactiva de incidentes</li>
</ul>',
 '1.0',
 ARRAY['partner'],
 false,
 'commercial');

-- =========================================================================
-- TRIGGERS
-- =========================================================================

-- Trigger para actualizar updated_at en consent_definitions
CREATE OR REPLACE FUNCTION update_consent_definitions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consent_definitions_updated_at
BEFORE UPDATE ON consent_definitions
FOR EACH ROW
EXECUTE FUNCTION update_consent_definitions_timestamp();

-- Trigger para actualizar updated_at en user_consents
CREATE OR REPLACE FUNCTION update_user_consents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_consents_updated_at
BEFORE UPDATE ON user_consents
FOR EACH ROW
EXECUTE FUNCTION update_user_consents_timestamp();

-- Trigger para registrar cambios en consent_audit_log
CREATE OR REPLACE FUNCTION log_consent_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO consent_audit_log (user_consent_id, action, new_status, ip_address, changed_by)
        VALUES (NEW.user_consent_id, 'created', NEW.status, NEW.ip_address, NEW.user_id);
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO consent_audit_log (user_consent_id, action, old_status, new_status, ip_address, changed_by)
        VALUES (NEW.user_consent_id,
                CASE NEW.status
                    WHEN 'accepted' THEN 'accepted'
                    WHEN 'rejected' THEN 'rejected'
                    WHEN 'revoked' THEN 'revoked'
                    ELSE 'updated'
                END,
                OLD.status, NEW.status, NEW.ip_address, NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_consent_changes
AFTER INSERT OR UPDATE ON user_consents
FOR EACH ROW
EXECUTE FUNCTION log_consent_changes();

-- =========================================================================
-- FIN DE MIGRACIÓN
-- =========================================================================
