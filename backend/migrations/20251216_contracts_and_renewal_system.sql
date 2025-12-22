-- ============================================================================
-- SISTEMA DE CONTRATOS Y RENOVACIÓN AUTOMÁTICA
-- ============================================================================
-- Workflow: Budget APROBADO → Contrato → Firma → Vigente → Renovación
-- Incluye: 4 APKs (Kiosk, Medical, Legal, Employees) + Multi-país/sucursal
-- Auto-renovación: Alertas T-30, extensión automática 60 días si no renueva
-- ============================================================================

-- ============================================================================
-- TABLA: contract_templates
-- Plantillas de contrato por país/idioma
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación
    template_code VARCHAR(50) UNIQUE NOT NULL,  -- MSA-AR-ES-v1, MSA-BR-PT-v1
    template_name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',

    -- Localización
    country_code VARCHAR(3) NOT NULL,           -- ARG, BRA, MEX, USA, etc.
    language_code VARCHAR(5) NOT NULL,          -- es, pt, en, es-AR, pt-BR

    -- Contenido del contrato (MSA completo)
    content_json JSONB NOT NULL,                -- Estructura del contrato por secciones
    -- Estructura esperada:
    -- {
    --   "header": { "title": "...", "subtitle": "..." },
    --   "sections": [
    --     { "id": "A", "title": "Partes", "content": "..." },
    --     { "id": "B", "title": "Definiciones", "content": "..." },
    --     ...
    --   ],
    --   "apk_addendums": {
    --     "kiosk": { "title": "...", "content": "..." },
    --     "medical": { "title": "...", "content": "..." },
    --     "legal": { "title": "...", "content": "..." },
    --     "employee": { "title": "...", "content": "..." }
    --   }
    -- }

    -- Metadatos
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,           -- Template por defecto para el país

    -- Auditoría
    created_by UUID REFERENCES aponnt_staff(staff_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_default_per_country UNIQUE (country_code, is_default)
        DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- TABLA: contracts
-- Contratos firmados con empresas
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Trazabilidad (conecta con budget)
    trace_id VARCHAR(100) NOT NULL,             -- ONBOARDING-{UUID} del budget
    budget_id UUID REFERENCES budgets(id),

    -- Relaciones
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES aponnt_staff(staff_id),
    template_id UUID REFERENCES contract_templates(id),

    -- Identificación del contrato
    contract_code VARCHAR(50) UNIQUE NOT NULL,  -- CONT-YYYY-NNNN
    contract_version INTEGER DEFAULT 1,         -- Versión del contrato (renovaciones)

    -- Sucursal central (determina idioma y país del contrato)
    central_branch_id INTEGER REFERENCES branches(id),
    contract_country VARCHAR(3) NOT NULL,       -- País del contrato
    contract_language VARCHAR(5) NOT NULL,      -- Idioma del contrato

    -- Fechas
    contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,                   -- Inicio de vigencia
    end_date DATE NOT NULL,                     -- Fin de vigencia (normalmente 1 año)
    original_end_date DATE,                     -- Fecha original (antes de extensiones)
    grace_period_end DATE,                      -- Fin del período de gracia (+60 días)

    -- Contenido generado
    generated_content JSONB,                    -- Contrato generado con datos de la empresa

    -- Módulos y APKs contratados
    contracted_modules JSONB NOT NULL,          -- Módulos del sistema principal
    contracted_apks JSONB DEFAULT '[]',         -- APKs: ["kiosk", "medical", "legal", "employee"]

    -- Financiero (heredado del budget)
    contracted_employees INTEGER NOT NULL,
    monthly_amount DECIMAL(12,2) NOT NULL,
    annual_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Estado del contrato
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    -- DRAFT: Borrador generado
    -- SENT: Enviado al cliente
    -- PENDING_SIGNATURE: Esperando firma
    -- SIGNED: Firmado por cliente
    -- ACTIVE: Vigente
    -- RENEWAL_PENDING: En proceso de renovación (T-30)
    -- GRACE_PERIOD: Período de gracia (60 días extra)
    -- SUSPENDED: Suspendido por falta de pago/renovación
    -- TERMINATED: Terminado por el cliente
    -- EXPIRED: Expirado (reemplazado por nuevo contrato)

    -- Firma digital
    signed_at TIMESTAMP,
    signed_by_name VARCHAR(255),
    signed_by_email VARCHAR(255),
    signed_by_position VARCHAR(100),
    signature_ip VARCHAR(50),
    signature_hash VARCHAR(255),                -- Hash del documento firmado

    -- Renovación
    is_auto_renewed BOOLEAN DEFAULT false,      -- Se renovó automáticamente
    renewal_count INTEGER DEFAULT 0,            -- Cantidad de renovaciones
    last_renewal_date DATE,
    next_renewal_alert_date DATE,               -- Fecha próxima alerta (T-30)
    renewal_alerts_sent INTEGER DEFAULT 0,      -- Contador de alertas enviadas

    -- Contrato padre (para renovaciones)
    parent_contract_id UUID REFERENCES contracts(id),

    -- Notas
    notes TEXT,
    termination_reason TEXT,

    -- Auditoría
    created_by UUID REFERENCES aponnt_staff(staff_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT valid_status CHECK (status IN (
        'DRAFT', 'SENT', 'PENDING_SIGNATURE', 'SIGNED', 'ACTIVE',
        'RENEWAL_PENDING', 'GRACE_PERIOD', 'SUSPENDED', 'TERMINATED', 'EXPIRED'
    ))
);

-- ============================================================================
-- TABLA: contract_renewal_logs
-- Historial de renovaciones y alertas
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_renewal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

    -- Tipo de evento
    event_type VARCHAR(50) NOT NULL,
    -- ALERT_SENT: Alerta enviada
    -- ALERT_REMINDER: Recordatorio enviado
    -- MANUAL_RENEWAL_STARTED: Vendedor inició renovación manual
    -- AUTO_EXTENSION_APPLIED: Extensión automática de 60 días
    -- GRACE_PERIOD_STARTED: Inicio período de gracia
    -- GRACE_PERIOD_ENDED: Fin período de gracia
    -- SUSPENSION_APPLIED: Contrato suspendido
    -- RENEWAL_COMPLETED: Renovación completada

    -- Destinatarios de la alerta
    recipients JSONB,                           -- ["vendor@email", "aponntcomercial@gmail.com", "empresa@email"]

    -- Detalles
    details JSONB,
    days_until_expiry INTEGER,                  -- Días hasta vencimiento cuando se envió

    -- Resultado
    notification_sent BOOLEAN DEFAULT false,
    notification_error TEXT,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM'    -- SYSTEM o staff_id
);

-- ============================================================================
-- TABLA: contract_apk_licenses
-- Licencias de APKs por contrato
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_apk_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- APK
    apk_type VARCHAR(50) NOT NULL,              -- kiosk, medical, legal, employee
    apk_name VARCHAR(100) NOT NULL,             -- Nombre comercial

    -- Licencias
    max_devices INTEGER,                        -- Máximo de dispositivos (kiosk)
    max_users INTEGER,                          -- Máximo de usuarios (employee app)

    -- Estado
    is_active BOOLEAN DEFAULT true,
    activated_at TIMESTAMP,
    deactivated_at TIMESTAMP,

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_apk_type CHECK (apk_type IN ('kiosk', 'medical', 'legal', 'employee')),
    CONSTRAINT unique_apk_per_contract UNIQUE (contract_id, apk_type)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contracts_trace_id ON contracts(trace_id);
CREATE INDEX idx_contracts_renewal_alert ON contracts(next_renewal_alert_date)
    WHERE status IN ('ACTIVE', 'RENEWAL_PENDING');
CREATE INDEX idx_contracts_grace_period ON contracts(grace_period_end)
    WHERE status = 'GRACE_PERIOD';

CREATE INDEX idx_contract_templates_country ON contract_templates(country_code);
CREATE INDEX idx_contract_templates_active ON contract_templates(is_active, country_code);

CREATE INDEX idx_renewal_logs_contract ON contract_renewal_logs(contract_id);
CREATE INDEX idx_renewal_logs_created ON contract_renewal_logs(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para updated_at en contracts
CREATE OR REPLACE FUNCTION update_contracts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_timestamp();

-- Trigger para calcular next_renewal_alert_date automáticamente
CREATE OR REPLACE FUNCTION calculate_renewal_alert_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular fecha de alerta: 30 días antes del vencimiento
    IF NEW.status = 'ACTIVE' AND NEW.end_date IS NOT NULL THEN
        NEW.next_renewal_alert_date := NEW.end_date - INTERVAL '30 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_set_renewal_alert
    BEFORE INSERT OR UPDATE OF end_date, status ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION calculate_renewal_alert_date();

-- ============================================================================
-- FUNCIONES
-- ============================================================================

-- Función para generar contract_code
CREATE OR REPLACE FUNCTION generate_contract_code()
RETURNS VARCHAR AS $$
DECLARE
    year VARCHAR(4);
    seq_num INTEGER;
    code VARCHAR(50);
BEGIN
    year := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(contract_code FROM 'CONT-\d{4}-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM contracts
    WHERE contract_code LIKE 'CONT-' || year || '-%';

    code := 'CONT-' || year || '-' || LPAD(seq_num::TEXT, 4, '0');

    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener contratos próximos a vencer (para cron job)
CREATE OR REPLACE FUNCTION get_contracts_needing_renewal_alert()
RETURNS TABLE (
    contract_id UUID,
    company_id INTEGER,
    company_name VARCHAR,
    vendor_id UUID,
    vendor_email VARCHAR,
    company_email VARCHAR,
    end_date DATE,
    days_until_expiry INTEGER,
    renewal_alerts_sent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as contract_id,
        c.company_id,
        co.name as company_name,
        c.vendor_id,
        s.email as vendor_email,
        co.contact_email as company_email,
        c.end_date,
        (c.end_date - CURRENT_DATE)::INTEGER as days_until_expiry,
        c.renewal_alerts_sent
    FROM contracts c
    JOIN companies co ON c.company_id = co.company_id
    LEFT JOIN aponnt_staff s ON c.vendor_id = s.staff_id
    WHERE c.status IN ('ACTIVE', 'RENEWAL_PENDING')
      AND c.end_date <= CURRENT_DATE + INTERVAL '30 days'
      AND c.end_date > CURRENT_DATE
    ORDER BY c.end_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener contratos en período de gracia que expiran
CREATE OR REPLACE FUNCTION get_contracts_grace_period_expiring()
RETURNS TABLE (
    contract_id UUID,
    company_id INTEGER,
    company_name VARCHAR,
    grace_period_end DATE,
    days_until_suspension INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id as contract_id,
        c.company_id,
        co.name as company_name,
        c.grace_period_end,
        (c.grace_period_end - CURRENT_DATE)::INTEGER as days_until_suspension
    FROM contracts c
    JOIN companies co ON c.company_id = co.company_id
    WHERE c.status = 'GRACE_PERIOD'
      AND c.grace_period_end <= CURRENT_DATE + INTERVAL '7 days'
    ORDER BY c.grace_period_end ASC;
END;
$$ LANGUAGE plpgsql;

-- Función para aplicar extensión automática de 60 días
CREATE OR REPLACE FUNCTION apply_auto_extension(p_contract_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_contract contracts%ROWTYPE;
BEGIN
    SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;

    IF v_contract IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Solo aplicar si está en ACTIVE o RENEWAL_PENDING y ya venció
    IF v_contract.status NOT IN ('ACTIVE', 'RENEWAL_PENDING') THEN
        RETURN FALSE;
    END IF;

    IF v_contract.end_date > CURRENT_DATE THEN
        RETURN FALSE; -- Aún no venció
    END IF;

    -- Guardar fecha original si es la primera extensión
    IF v_contract.original_end_date IS NULL THEN
        UPDATE contracts SET original_end_date = end_date WHERE id = p_contract_id;
    END IF;

    -- Aplicar extensión de 60 días
    UPDATE contracts
    SET
        status = 'GRACE_PERIOD',
        grace_period_end = CURRENT_DATE + INTERVAL '60 days',
        is_auto_renewed = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_contract_id;

    -- Registrar en log
    INSERT INTO contract_renewal_logs (contract_id, event_type, details, days_until_expiry)
    VALUES (
        p_contract_id,
        'AUTO_EXTENSION_APPLIED',
        jsonb_build_object(
            'original_end_date', v_contract.end_date,
            'new_grace_period_end', CURRENT_DATE + INTERVAL '60 days',
            'reason', 'Extensión automática por falta de renovación manual'
        ),
        0
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función para suspender contratos que pasaron el período de gracia
CREATE OR REPLACE FUNCTION suspend_expired_grace_period_contracts()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_contract RECORD;
BEGIN
    FOR v_contract IN
        SELECT id, company_id
        FROM contracts
        WHERE status = 'GRACE_PERIOD'
          AND grace_period_end < CURRENT_DATE
    LOOP
        UPDATE contracts
        SET status = 'SUSPENDED',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_contract.id;

        -- Registrar en log
        INSERT INTO contract_renewal_logs (contract_id, event_type, details)
        VALUES (
            v_contract.id,
            'SUSPENSION_APPLIED',
            jsonb_build_object(
                'reason', 'Período de gracia expirado sin renovación',
                'suspended_at', CURRENT_TIMESTAMP
            )
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE contract_templates IS 'Plantillas de contrato MSA por país/idioma';
COMMENT ON TABLE contracts IS 'Contratos firmados con empresas cliente';
COMMENT ON TABLE contract_renewal_logs IS 'Historial de eventos de renovación y alertas';
COMMENT ON TABLE contract_apk_licenses IS 'Licencias de APKs (Kiosk, Medical, Legal, Employee) por contrato';

COMMENT ON COLUMN contracts.status IS 'Estados: DRAFT, SENT, PENDING_SIGNATURE, SIGNED, ACTIVE, RENEWAL_PENDING, GRACE_PERIOD, SUSPENDED, TERMINATED, EXPIRED';
COMMENT ON COLUMN contracts.grace_period_end IS 'Fecha límite del período de gracia (+60 días desde vencimiento)';
COMMENT ON COLUMN contracts.contracted_apks IS 'APKs contratados: kiosk, medical, legal, employee';

-- ============================================================================
-- DATOS INICIALES - Template Argentina (Español)
-- ============================================================================
INSERT INTO contract_templates (
    template_code,
    template_name,
    version,
    country_code,
    language_code,
    is_default,
    content_json
) VALUES (
    'MSA-ARG-ES-v1',
    'Contrato Marco de Suscripción - Argentina',
    '1.0.0',
    'ARG',
    'es',
    true,
    '{
        "header": {
            "title": "CONTRATO MARCO DE SUSCRIPCIÓN DE SERVICIOS",
            "subtitle": "Sistema de Gestión de Asistencia y Recursos Humanos APONNT"
        },
        "sections": [
            {
                "id": "A",
                "title": "PARTES CONTRATANTES",
                "content": "Entre {{APONNT_LEGAL_NAME}}, con domicilio en {{APONNT_ADDRESS}}, CUIT {{APONNT_CUIT}}, en adelante \"EL PROVEEDOR\", y {{COMPANY_LEGAL_NAME}}, con domicilio en {{COMPANY_ADDRESS}}, CUIT {{COMPANY_CUIT}}, en adelante \"EL CLIENTE\", se celebra el presente Contrato Marco de Suscripción de Servicios."
            },
            {
                "id": "B",
                "title": "DEFINICIONES",
                "content": "A los efectos del presente contrato se entenderá por:\n- **Servicio**: Acceso al sistema APONNT de gestión de asistencia y recursos humanos en modalidad SaaS.\n- **Usuario**: Toda persona autorizada por EL CLIENTE para acceder al Servicio.\n- **Datos del Cliente**: Toda información ingresada por EL CLIENTE o sus Usuarios al Servicio.\n- **APK**: Aplicaciones móviles complementarias (Kiosk, Medical, Legal, Employee).\n- **Sucursal**: Cada ubicación física de EL CLIENTE donde opera el Servicio."
            },
            {
                "id": "C",
                "title": "OBJETO Y ALCANCE",
                "content": "EL PROVEEDOR otorga a EL CLIENTE un derecho de acceso no exclusivo, intransferible y revocable al Servicio, incluyendo los módulos y APKs detallados en el Anexo A (Order Form), para uso exclusivo en las operaciones de EL CLIENTE."
            },
            {
                "id": "D",
                "title": "DURACIÓN Y VIGENCIA",
                "content": "El presente contrato tendrá una vigencia de DOCE (12) meses contados desde la Fecha de Inicio indicada en el Anexo A. Se renovará automáticamente por períodos iguales salvo notificación en contrario con TREINTA (30) días de anticipación."
            },
            {
                "id": "E",
                "title": "PRECIO Y FORMA DE PAGO",
                "content": "EL CLIENTE abonará el monto mensual indicado en el Anexo A mediante transferencia bancaria dentro de los DIEZ (10) días de emitida la factura. La falta de pago habilitará la suspensión del Servicio sin responsabilidad para EL PROVEEDOR."
            },
            {
                "id": "F",
                "title": "NIVELES DE SERVICIO (SLA)",
                "content": "EL PROVEEDOR garantiza una disponibilidad del Servicio del NOVENTA Y NUEVE COMA CINCO POR CIENTO (99.5%) mensual, excluyendo mantenimientos programados notificados con 48hs de anticipación. El soporte técnico estará disponible de Lunes a Viernes de 9:00 a 18:00 hs (GMT-3)."
            },
            {
                "id": "G",
                "title": "PROTECCIÓN DE DATOS PERSONALES",
                "content": "EL PROVEEDOR actuará como Encargado del Tratamiento de los datos personales que EL CLIENTE ingrese al Servicio, conforme la Ley 25.326 de Protección de Datos Personales de Argentina. Los datos serán procesados únicamente para la prestación del Servicio y no serán cedidos a terceros sin consentimiento expreso."
            },
            {
                "id": "H",
                "title": "PROPIEDAD INTELECTUAL",
                "content": "El Servicio, incluyendo su código fuente, diseño, documentación y marcas, son propiedad exclusiva de EL PROVEEDOR. EL CLIENTE no adquiere ningún derecho de propiedad sobre el Servicio, solo un derecho de uso conforme este contrato."
            },
            {
                "id": "I",
                "title": "CONFIDENCIALIDAD",
                "content": "Las partes se obligan a mantener confidencial toda información técnica, comercial o de cualquier otra índole que reciban de la otra parte, por un plazo de CINCO (5) años desde la terminación del contrato."
            },
            {
                "id": "J",
                "title": "LIMITACIÓN DE RESPONSABILIDAD",
                "content": "La responsabilidad de EL PROVEEDOR se limitará al monto efectivamente abonado por EL CLIENTE en los últimos DOCE (12) meses. EL PROVEEDOR no será responsable por daños indirectos, lucro cesante o pérdida de datos ocasionados por causas ajenas a su control."
            },
            {
                "id": "K",
                "title": "TERMINACIÓN",
                "content": "Cualquiera de las partes podrá dar por terminado el contrato con TREINTA (30) días de preaviso. En caso de incumplimiento grave, la parte afectada podrá resolver el contrato de pleno derecho. A la terminación, EL CLIENTE podrá exportar sus datos dentro de los TREINTA (30) días siguientes."
            },
            {
                "id": "L",
                "title": "LEY APLICABLE Y JURISDICCIÓN",
                "content": "El presente contrato se regirá por las leyes de la República Argentina. Para cualquier controversia, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero."
            },
            {
                "id": "M",
                "title": "DISPOSICIONES GENERALES",
                "content": "El presente contrato constituye el acuerdo íntegro entre las partes. Ninguna modificación será válida sin firma de ambas partes. La nulidad de alguna cláusula no afectará la validez de las restantes."
            }
        ],
        "apk_addendums": {
            "kiosk": {
                "title": "ADDENDUM: APK KIOSK",
                "content": "El módulo APK Kiosk permite el fichaje biométrico mediante dispositivos dedicados. EL CLIENTE es responsable de la instalación y mantenimiento del hardware. Máximo de dispositivos según Anexo A."
            },
            "medical": {
                "title": "ADDENDUM: APK MEDICAL",
                "content": "El módulo APK Medical está destinado exclusivamente a profesionales médicos autorizados por EL CLIENTE. Los datos médicos se procesarán conforme la normativa de salud vigente y la Ley 25.326."
            },
            "legal": {
                "title": "ADDENDUM: APK LEGAL",
                "content": "El módulo APK Legal está destinado a profesionales legales para gestión de casos laborales. La información legal se manejará con estricta confidencialidad profesional."
            },
            "employee": {
                "title": "ADDENDUM: APK EMPLOYEE",
                "content": "El módulo APK Employee permite a los empleados de EL CLIENTE consultar su información, fichar y gestionar solicitudes. EL CLIENTE es responsable de informar a sus empleados sobre el uso del sistema."
            }
        },
        "annexes": {
            "order_form": {
                "title": "ANEXO A: ORDER FORM",
                "fields": [
                    "Razón Social del Cliente",
                    "CUIT",
                    "Domicilio Legal",
                    "Sucursal Central",
                    "Cantidad de Empleados Contratados",
                    "Módulos Contratados",
                    "APKs Contratados",
                    "Monto Mensual",
                    "Fecha de Inicio",
                    "Fecha de Vencimiento"
                ]
            }
        },
        "signatures": {
            "provider": {
                "label": "Por EL PROVEEDOR",
                "fields": ["Nombre", "Cargo", "Firma", "Fecha"]
            },
            "client": {
                "label": "Por EL CLIENTE",
                "fields": ["Nombre", "Cargo", "Firma", "Fecha"]
            }
        }
    }'
) ON CONFLICT (template_code) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    updated_at = CURRENT_TIMESTAMP;

-- Template Brasil (Portugués)
INSERT INTO contract_templates (
    template_code,
    template_name,
    version,
    country_code,
    language_code,
    is_default,
    content_json
) VALUES (
    'MSA-BRA-PT-v1',
    'Contrato de Assinatura de Serviços - Brasil',
    '1.0.0',
    'BRA',
    'pt',
    true,
    '{
        "header": {
            "title": "CONTRATO DE ASSINATURA DE SERVIÇOS",
            "subtitle": "Sistema de Gestão de Presença e Recursos Humanos APONNT"
        },
        "sections": [
            {
                "id": "A",
                "title": "PARTES CONTRATANTES",
                "content": "Entre {{APONNT_LEGAL_NAME}}, com sede em {{APONNT_ADDRESS}}, CNPJ {{APONNT_CNPJ}}, doravante denominado \"FORNECEDOR\", e {{COMPANY_LEGAL_NAME}}, com sede em {{COMPANY_ADDRESS}}, CNPJ {{COMPANY_CNPJ}}, doravante denominado \"CLIENTE\", celebra-se o presente Contrato de Assinatura de Serviços."
            },
            {
                "id": "B",
                "title": "DEFINIÇÕES",
                "content": "Para os fins deste contrato, entende-se por:\n- **Serviço**: Acesso ao sistema APONNT de gestão de presença e recursos humanos em modalidade SaaS.\n- **Usuário**: Toda pessoa autorizada pelo CLIENTE para acessar o Serviço.\n- **Dados do Cliente**: Toda informação inserida pelo CLIENTE ou seus Usuários no Serviço.\n- **APK**: Aplicativos móveis complementares (Kiosk, Medical, Legal, Employee).\n- **Filial**: Cada localização física do CLIENTE onde opera o Serviço."
            }
        ],
        "apk_addendums": {
            "kiosk": {
                "title": "ADENDO: APK KIOSK",
                "content": "O módulo APK Kiosk permite o registro biométrico através de dispositivos dedicados."
            }
        },
        "note": "Template resumido - expandir según legislación brasileña (LGPD, Código Civil)"
    }'
) ON CONFLICT (template_code) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    updated_at = CURRENT_TIMESTAMP;

-- Template México (Español)
INSERT INTO contract_templates (
    template_code,
    template_name,
    version,
    country_code,
    language_code,
    is_default,
    content_json
) VALUES (
    'MSA-MEX-ES-v1',
    'Contrato de Suscripción de Servicios - México',
    '1.0.0',
    'MEX',
    'es',
    true,
    '{
        "header": {
            "title": "CONTRATO DE SUSCRIPCIÓN DE SERVICIOS",
            "subtitle": "Sistema de Gestión de Asistencia y Recursos Humanos APONNT"
        },
        "sections": [
            {
                "id": "A",
                "title": "PARTES CONTRATANTES",
                "content": "Entre {{APONNT_LEGAL_NAME}}, con domicilio en {{APONNT_ADDRESS}}, RFC {{APONNT_RFC}}, en lo sucesivo \"EL PROVEEDOR\", y {{COMPANY_LEGAL_NAME}}, con domicilio en {{COMPANY_ADDRESS}}, RFC {{COMPANY_RFC}}, en lo sucesivo \"EL CLIENTE\", celebran el presente Contrato de Suscripción de Servicios."
            }
        ],
        "apk_addendums": {
            "kiosk": {
                "title": "ANEXO: APK KIOSK",
                "content": "El módulo APK Kiosk permite el registro biométrico mediante dispositivos dedicados."
            }
        },
        "note": "Template resumido - expandir según legislación mexicana (LFPDPPP)"
    }'
) ON CONFLICT (template_code) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    updated_at = CURRENT_TIMESTAMP;

-- Template USA (English)
INSERT INTO contract_templates (
    template_code,
    template_name,
    version,
    country_code,
    language_code,
    is_default,
    content_json
) VALUES (
    'MSA-USA-EN-v1',
    'Master Subscription Agreement - USA',
    '1.0.0',
    'USA',
    'en',
    true,
    '{
        "header": {
            "title": "MASTER SUBSCRIPTION AGREEMENT",
            "subtitle": "APONNT Attendance and Human Resources Management System"
        },
        "sections": [
            {
                "id": "A",
                "title": "PARTIES",
                "content": "This Master Subscription Agreement (\"Agreement\") is entered into by and between {{APONNT_LEGAL_NAME}}, located at {{APONNT_ADDRESS}} (\"Provider\"), and {{COMPANY_LEGAL_NAME}}, located at {{COMPANY_ADDRESS}} (\"Customer\")."
            },
            {
                "id": "B",
                "title": "DEFINITIONS",
                "content": "- \"Service\" means access to the APONNT attendance and HR management system delivered as SaaS.\n- \"User\" means any individual authorized by Customer to access the Service.\n- \"Customer Data\" means all data entered into the Service by Customer or Users.\n- \"APK\" means mobile applications (Kiosk, Medical, Legal, Employee).\n- \"Branch\" means each physical location of Customer where the Service operates."
            }
        ],
        "apk_addendums": {
            "kiosk": {
                "title": "EXHIBIT: KIOSK APK",
                "content": "The Kiosk APK module enables biometric time tracking through dedicated devices."
            }
        },
        "note": "Condensed template - expand according to US law (state-specific variations, CCPA)"
    }'
) ON CONFLICT (template_code) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    updated_at = CURRENT_TIMESTAMP;
