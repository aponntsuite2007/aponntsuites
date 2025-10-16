-- ═══════════════════════════════════════════════════════════════════════════════
-- SISTEMA DE NOTIFICACIONES AVANZADO V2.0 - MULTI-TENANT
-- Fecha creación: 2025-10-16
-- Descripción: Tablas para sistema de notificaciones con grupos/cadenas,
--              compliance, SLA tracking, centro de costos y módulos plug & play
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABLAS BASE DE NOTIFICACIONES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Grupos/Hilos de notificaciones (conversaciones)
CREATE TABLE IF NOT EXISTS notification_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_type VARCHAR(50) NOT NULL, -- 'permission_request', 'shift_swap', 'incident_report', etc.
    initiator_type VARCHAR(20) NOT NULL, -- 'employee', 'supervisor', 'rrhh', 'system', 'kiosk'
    initiator_id VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'pending', 'resolved', 'closed'
    priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    company_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP,
    closed_by VARCHAR(100),
    metadata JSONB, -- Datos adicionales específicos del tipo de solicitud
);

-- Mensajes individuales dentro de cada grupo
CREATE TABLE IF NOT EXISTS notification_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES notification_groups(id) ON DELETE CASCADE,
    sequence_number INT NOT NULL, -- Orden dentro del grupo

    -- Remitente y destinatario
    sender_type VARCHAR(20) NOT NULL, -- 'employee', 'supervisor', 'rrhh', 'system', 'kiosk', 'department'
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(255),

    recipient_type VARCHAR(20) NOT NULL, -- 'employee', 'supervisor', 'rrhh', 'system', 'department', 'massive'
    recipient_id VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(255),

    -- Contenido
    message_type VARCHAR(30) NOT NULL, -- 'request', 'response', 'approval', 'rejection', 'status', 'info'
    subject VARCHAR(255),
    content TEXT NOT NULL,
    content_encrypted TEXT, -- Contenido encriptado para validez legal

    -- Timestamps y deadlines
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deadline_at TIMESTAMP, -- NULL si no requiere respuesta
    requires_response BOOLEAN DEFAULT false,

    -- Estados de entrega
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    responded_at TIMESTAMP,

    -- Hash para validez legal (SHA-256)
    message_hash VARCHAR(64) NOT NULL,
    hash_algorithm VARCHAR(20) DEFAULT 'SHA-256',

    -- Canales de envío
    channels JSONB DEFAULT '["web"]', -- ['web', 'email', 'whatsapp', 'sms', 'apk']
    channel_status JSONB, -- Estado de envío por canal

    -- Adjuntos
    attachments JSONB,

    -- Auditoría (NO SE PUEDE BORRAR - sistema inmutable)
    is_deleted BOOLEAN DEFAULT false,
    company_id INT NOT NULL,

    UNIQUE(group_id, sequence_number)
);

-- Log de acciones sobre notificaciones (auditoría inmutable)
CREATE TABLE IF NOT EXISTS notification_audit_log (
    id BIGSERIAL PRIMARY KEY,
    group_id UUID NOT NULL,
    message_id UUID,
    action VARCHAR(50) NOT NULL, -- 'created', 'delivered', 'read', 'responded', 'closed', 'escalated'
    actor_type VARCHAR(20),
    actor_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. TIPOS DE PARTICIPANTES Y FLUJOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tipos de participantes en notificaciones
CREATE TABLE IF NOT EXISTS notification_participant_types (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_action BOOLEAN DEFAULT false, -- Debe decidir/responder
    is_decisor BOOLEAN DEFAULT false, -- Puede aprobar/rechazar
    is_informative BOOLEAN DEFAULT false, -- Solo recibe información
    can_forward BOOLEAN DEFAULT false, -- Puede reenviar a otro participante
    creates_deadline BOOLEAN DEFAULT true -- Genera deadline automático
);

-- Tipos de solicitud estructurada
CREATE TABLE IF NOT EXISTS request_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- 'vacation_request', 'shift_swap', 'overtime_request'
    category VARCHAR(30) NOT NULL, -- 'time_off', 'schedule', 'administrative', 'medical'

    -- Nombres oficiales
    display_name_es VARCHAR(255) NOT NULL,
    display_name_en VARCHAR(255),
    display_name_pt VARCHAR(255),

    legal_term VARCHAR(100) NOT NULL, -- Término legal oficial
    description TEXT,

    -- Routing automático
    approval_chain JSONB NOT NULL,
    /* Ejemplo: [
        {"role": "supervisor", "deadline_hours": 48},
        {"role": "rrhh", "deadline_hours": 24}
    ] */

    -- Configuración del formulario dinámico
    form_fields JSONB NOT NULL,
    /* Ejemplo: [
        {"name": "start_date", "type": "date", "required": true, "label": "Fecha inicio"},
        {"name": "end_date", "type": "date", "required": true, "label": "Fecha fin"}
    ] */

    -- Validaciones de negocio
    validation_rules JSONB,
    /* Ejemplo: {
        "min_notice_days": 15,
        "requires_balance_check": true,
        "max_consecutive_days": 14
    } */

    -- Templates de email
    email_subject_template VARCHAR(255),
    email_body_template TEXT,

    -- Configuración
    requires_attachments BOOLEAN DEFAULT false,
    allowed_file_types VARCHAR(255),
    icon VARCHAR(50) DEFAULT '📋',
    color VARCHAR(7) DEFAULT '#007bff',
    active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Plantillas de flujo de notificaciones
CREATE TABLE IF NOT EXISTS notification_flow_templates (
    id SERIAL PRIMARY KEY,
    request_type_code VARCHAR(50) NOT NULL REFERENCES request_types(code),
    flow_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Definición del flujo (JSON con pasos secuenciales)
    flow_steps JSONB NOT NULL,
    /* Estructura: [
        {
            "step": 1,
            "participant_type": "acceptor",
            "role": "target_employee",
            "requires_action": true,
            "on_approve": "next_step",
            "on_reject": "end_chain",
            "validation_modules": ["shift_compatibility"]
        }
    ] */

    -- Módulos opcionales que pueden afectar el flujo
    optional_modules JSONB,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SISTEMA MODULAR PLUG & PLAY
-- ═══════════════════════════════════════════════════════════════════════════════

-- Módulos del sistema (catálogo)
CREATE TABLE IF NOT EXISTS system_modules (
    id SERIAL PRIMARY KEY,
    module_code VARCHAR(50) UNIQUE NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'core', 'premium', 'integration'

    -- Estado de disponibilidad
    is_core BOOLEAN DEFAULT false, -- Módulo base, siempre activo
    requires_license BOOLEAN DEFAULT true,

    -- Dependencias
    depends_on_modules JSONB, -- ["module_code_1", "module_code_2"]
    optional_for_modules JSONB, -- Módulos que pueden usarlo pero no lo requieren

    -- Configuración
    config_schema JSONB, -- Estructura de configuración esperada
    api_endpoints JSONB, -- Endpoints que expone el módulo

    version VARCHAR(20),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Módulos contratados por empresa (multi-tenant)
CREATE TABLE IF NOT EXISTS company_modules (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    module_code VARCHAR(50) NOT NULL REFERENCES system_modules(module_code),

    -- Estado de contratación
    is_active BOOLEAN DEFAULT true,
    licensed_since TIMESTAMP DEFAULT NOW(),
    license_expires_at TIMESTAMP,

    -- Configuración específica de la empresa para este módulo
    module_config JSONB,

    -- Límites
    user_limit INT, -- NULL = ilimitado
    usage_count INT DEFAULT 0,

    UNIQUE(company_id, module_code));

-- Validaciones de negocio parametrizables por empresa/departamento
CREATE TABLE IF NOT EXISTS business_validations (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    department_id INT, -- NULL = aplica a toda la empresa
    validation_code VARCHAR(50) NOT NULL,
    validation_name VARCHAR(100) NOT NULL,

    -- Configuración de la validación
    validation_type VARCHAR(30) NOT NULL, -- 'minimum_notice', 'max_consecutive_days', 'rest_period'
    validation_params JSONB NOT NULL,
    /* Ejemplos:
    {"minimum_notice_hours": 48}
    {"minimum_rest_hours": 12}
    {"max_overtime_hours_monthly": 30}
    */

    -- Severidad si se viola
    severity VARCHAR(20) DEFAULT 'error', -- 'info', 'warning', 'error', 'blocking'
    auto_reject BOOLEAN DEFAULT false, -- Rechaza automáticamente si se viola

    -- Mensaje personalizado
    error_message TEXT,

    active BOOLEAN DEFAULT true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. COMPLIANCE Y MÉTRICAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Reglas de compliance legal
CREATE TABLE IF NOT EXISTS compliance_rules (
    id SERIAL PRIMARY KEY,
    rule_code VARCHAR(50) UNIQUE NOT NULL,
    legal_reference VARCHAR(255), -- "Art. 197 LCT - Descanso entre jornadas"
    rule_type VARCHAR(30), -- 'rest_period', 'overtime_limit', 'vacation_expiry'
    severity VARCHAR(20), -- 'info', 'warning', 'critical'
    check_frequency VARCHAR(20), -- 'realtime', 'daily', 'weekly'
    -- fine_amount_min DECIMAL(10,2), -- REMOVIDO: No mostrar montos
    -- fine_amount_max DECIMAL(10,2), -- REMOVIDO: No mostrar montos
    validation_query TEXT, -- Query SQL para validar
    active BOOLEAN DEFAULT true
);

-- Violaciones de compliance detectadas
CREATE TABLE IF NOT EXISTS compliance_violations (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    rule_code VARCHAR(50) REFERENCES compliance_rules(rule_code),
    employee_id VARCHAR(100),
    violation_date TIMESTAMP DEFAULT NOW(),
    violation_data JSONB, -- Detalles específicos
    -- estimated_fine DECIMAL(10,2), -- REMOVIDO: No mostrar montos
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'exempted'
    resolved_at TIMESTAMP,
    resolution_notes TEXT);

-- Métricas de SLA (tiempos de respuesta)
CREATE TABLE IF NOT EXISTS sla_metrics (
    id SERIAL PRIMARY KEY,
    approver_id VARCHAR(100),
    approver_role VARCHAR(50),
    department_id INT,
    request_type VARCHAR(50),
    company_id INT NOT NULL,

    -- Métricas
    total_requests INT DEFAULT 0,
    avg_response_hours DECIMAL(10,2),
    median_response_hours DECIMAL(10,2),
    min_response_hours DECIMAL(10,2),
    max_response_hours DECIMAL(10,2),

    -- SLA
    sla_target_hours INT,
    within_sla_count INT DEFAULT 0,
    outside_sla_count INT DEFAULT 0,
    sla_compliance_percent DECIMAL(5,2),

    -- Período
    period_start DATE,
    period_end DATE);

-- Contexto enriquecido para decisores (info adicional para aprobar/rechazar)
CREATE TABLE IF NOT EXISTS notification_context_data (
    id SERIAL PRIMARY KEY,
    notification_message_id UUID NOT NULL REFERENCES notification_messages(id) ON DELETE CASCADE,

    -- Tipo de información contextual
    context_type VARCHAR(50) NOT NULL, -- 'overtime_warning', 'rest_period_violation', 'cost_estimate'

    -- Datos calculados
    context_data JSONB NOT NULL,

    -- Severidad para el decisor
    severity VARCHAR(20), -- 'info', 'warning', 'critical'
    display_as VARCHAR(20), -- 'badge', 'alert', 'inline'

    -- Mensaje para mostrar
    display_message TEXT,
    icon VARCHAR(10),

    calculated_at TIMESTAMP DEFAULT NOW());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. CENTRO DE COSTOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Presupuestos por empresa/departamento
CREATE TABLE IF NOT EXISTS cost_budgets (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    department_id INT,
    cost_category VARCHAR(50), -- 'overtime', 'leave', 'shift_swaps', 'medical_leave'
    -- budget_amount DECIMAL(10,2), -- REMOVIDO: No mostrar montos
    period_start DATE,
    period_end DATE,
    -- current_spent DECIMAL(10,2) DEFAULT 0, -- REMOVIDO: No mostrar montos
    alert_threshold_percent INT DEFAULT 90);

-- Transacciones de costos
CREATE TABLE IF NOT EXISTS cost_transactions (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    department_id INT,
    employee_id VARCHAR(100),
    notification_group_id UUID REFERENCES notification_groups(id),
    cost_category VARCHAR(50),
    -- amount DECIMAL(10,2), -- REMOVIDO: No mostrar montos
    description TEXT,
    transaction_date TIMESTAMP DEFAULT NOW(),
    metadata JSONB);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. NOTIFICACIONES PROACTIVAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Reglas proactivas configurables
CREATE TABLE IF NOT EXISTS proactive_rules (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    rule_name VARCHAR(100),
    rule_type VARCHAR(50), -- 'vacation_expiry', 'overtime_limit', 'rest_violation', 'document_expiry'

    -- Condición que dispara la regla
    trigger_condition TEXT, -- Query SQL o lógica
    trigger_threshold JSONB, -- {"days_until_expiry": 45, "percentage": 90}

    -- Acción automática
    auto_action VARCHAR(50), -- 'create_notification', 'send_alert', 'block_action'
    notification_recipients JSONB, -- ["employee", "supervisor", "rrhh"]
    notification_template_id INT,

    -- Prioridad
    priority VARCHAR(20), -- 'low', 'medium', 'high', 'critical'

    -- Frecuencia de chequeo
    check_frequency VARCHAR(20) DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly'
    last_checked TIMESTAMP,

    active BOOLEAN DEFAULT true);

-- Log de ejecución de reglas proactivas
CREATE TABLE IF NOT EXISTS proactive_executions (
    id BIGSERIAL PRIMARY KEY,
    rule_id INT REFERENCES proactive_rules(id),
    execution_time TIMESTAMP DEFAULT NOW(),
    matched_count INT DEFAULT 0,
    actions_taken INT DEFAULT 0,
    execution_details JSONB);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. CAMBIOS DE TURNO Y CONTROL DE KIOSCO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Cambios de turno aprobados (para control en kiosco)
CREATE TABLE IF NOT EXISTS approved_shift_swaps (
    id SERIAL PRIMARY KEY,
    notification_group_id UUID NOT NULL REFERENCES notification_groups(id),
    company_id INT NOT NULL,

    -- Empleados involucrados
    employee_1_id VARCHAR(100) NOT NULL, -- Solicitante original
    employee_2_id VARCHAR(100) NOT NULL, -- Empleado que acepta

    -- Detalles del cambio
    swap_date DATE NOT NULL,
    original_shift_id INT,
    replacement_shift_id INT,

    -- Control de ejecución
    status VARCHAR(20) DEFAULT 'approved', -- 'approved', 'executed', 'completed', 'cancelled'

    -- Información para kiosco
    employee_1_can_clock BOOLEAN DEFAULT false, -- Pedro NO puede fichar
    employee_2_can_clock BOOLEAN DEFAULT true,  -- Juan SÍ puede fichar

    -- Información de costos
    generates_overtime BOOLEAN DEFAULT false,
    overtime_hours DECIMAL(5,2),
    -- estimated_cost DECIMAL(10,2), -- REMOVIDO: No mostrar montos
    violates_rest_period BOOLEAN DEFAULT false,

    -- ART
    art_notified BOOLEAN DEFAULT false,
    art_notified_at TIMESTAMP,
    art_reference VARCHAR(100),

    -- Timestamps
    approved_at TIMESTAMP DEFAULT NOW(),
    executed_at TIMESTAMP, -- Cuando Juan efectivamente fichó

    UNIQUE(company_id, employee_1_id, employee_2_id, swap_date)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. INTEGRACIÓN CON CALENDARIOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Integraciones de calendario por empleado
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100) NOT NULL,
    calendar_provider VARCHAR(20), -- 'google', 'outlook', 'ical'
    access_token TEXT,
    refresh_token TEXT,
    calendar_id VARCHAR(255),
    sync_enabled BOOLEAN DEFAULT true,
    last_sync TIMESTAMP,
    sync_errors JSONB,
    UNIQUE(employee_id, calendar_provider));

-- Eventos sincronizados con calendarios externos
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    calendar_integration_id INT REFERENCES calendar_integrations(id),
    notification_group_id UUID REFERENCES notification_groups(id),
    employee_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50), -- 'shift_swap', 'vacation', 'leave', 'overtime'
    external_event_id VARCHAR(255), -- ID del evento en Google/Outlook
    event_start TIMESTAMP NOT NULL,
    event_end TIMESTAMP NOT NULL,
    event_title VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. TOKENS Y SEGURIDAD
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tokens de un solo uso para responder notificaciones
CREATE TABLE IF NOT EXISTS used_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) UNIQUE NOT NULL,
    message_id UUID REFERENCES notification_messages(id),
    used_at TIMESTAMP DEFAULT NOW(),
    used_by VARCHAR(100));

-- Tabla para tracking de deadlines y escalaciones
CREATE TABLE IF NOT EXISTS notification_escalations (
    id SERIAL PRIMARY KEY,
    message_id UUID REFERENCES notification_messages(id),
    original_deadline TIMESTAMP NOT NULL,
    escalation_level INT DEFAULT 1,
    escalated_to VARCHAR(100), -- Usuario/rol al que se escaló
    escalated_at TIMESTAMP DEFAULT NOW(),
    reason TEXT);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. COMENTARIOS Y NOTAS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE notification_groups IS 'Grupos/hilos de notificaciones - Cada conversación tiene un ID único';
COMMENT ON TABLE notification_messages IS 'Mensajes individuales dentro de un grupo - Sistema inmutable con hash SHA-256';
COMMENT ON TABLE notification_audit_log IS 'Log de auditoría inmutable de todas las acciones sobre notificaciones';
COMMENT ON TABLE system_modules IS 'Catálogo de módulos del sistema - Core y premium';
COMMENT ON TABLE company_modules IS 'Módulos contratados por cada empresa (multi-tenant)';
COMMENT ON TABLE compliance_rules IS 'Reglas de cumplimiento legal argentino (LCT)';
COMMENT ON TABLE sla_metrics IS 'Métricas de tiempos de respuesta para rankings y cuellos de botella';
COMMENT ON TABLE cost_budgets IS 'Presupuestos por empresa/departamento para control de costos';
COMMENT ON TABLE proactive_rules IS 'Reglas que detectan problemas ANTES de que ocurran';
COMMENT ON TABLE approved_shift_swaps IS 'Cambios de turno aprobados - Controla qué empleado puede fichar en kiosco';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. AUDIT REPORTS (REPORTES CON VALIDEZ LEGAL)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Reportes de auditoría generados
CREATE TABLE IF NOT EXISTS audit_reports (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'compliance_audit', 'sla_performance', 'resource_utilization', etc.
    generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    generated_by VARCHAR(100) NOT NULL, -- Employee ID que solicitó el reporte

    -- Parámetros usados para generar el reporte
    parameters JSONB NOT NULL,

    -- Firma digital y verificación
    digital_signature VARCHAR(64) NOT NULL, -- Hash SHA-256 del PDF
    verification_code VARCHAR(32) UNIQUE NOT NULL, -- Código único para verificación pública

    -- Archivo
    file_path VARCHAR(255), -- Ruta relativa al directorio de reportes
    file_size_bytes INT,

    -- Estado
    status VARCHAR(20) DEFAULT 'generated', -- 'generated', 'archived', 'corrupted'

    -- Auditoría (NO SE PUEDE BORRAR - inmutable)
    is_deleted BOOLEAN DEFAULT false);

-- Log de accesos a reportes (auditoría completa)
CREATE TABLE IF NOT EXISTS report_access_log (
    id BIGSERIAL PRIMARY KEY,
    report_id INT NOT NULL REFERENCES audit_reports(id) ON DELETE CASCADE,
    access_type VARCHAR(30) NOT NULL, -- 'download', 'verification', 'view'
    accessed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    accessed_by VARCHAR(100), -- NULL si es verificación pública
    success BOOLEAN DEFAULT true,
    ip_address INET,
    user_agent TEXT);

COMMENT ON TABLE audit_reports IS 'Reportes de auditoría con validez legal - Incluyen firma digital y código QR';
COMMENT ON TABLE report_access_log IS 'Log inmutable de accesos a reportes para trazabilidad completa';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRACION
-- ═══════════════════════════════════════════════════════════════════════════════
