-- =====================================================
-- MIGRATION: Sistema de Inmutabilidad Medica
-- Fecha: 2025-12-03
-- Descripcion: Sistema completo de registros medicos con
--              inmutabilidad controlada, autorizaciones via
--              notificaciones proactivas, y auditoria legal
-- =====================================================

-- =====================================================
-- TABLA 1: medical_exam_templates
-- Plantillas de examenes configurables por empresa
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_exam_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Identificacion
    template_name VARCHAR(100) NOT NULL,
    template_code VARCHAR(20), -- Codigo corto para referencias
    exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN (
        'preocupacional', 'periodico', 'reingreso', 'retiro', 'especial'
    )),
    description TEXT,

    -- Configuracion de estudios y documentos requeridos
    required_studies JSONB DEFAULT '[]'::JSONB,
    -- Estructura: [{name, type, required, frequency_months, notes, condition}]

    required_documents JSONB DEFAULT '[]'::JSONB,
    -- Estructura: [{name, type, required, notes}]

    -- Validez y recordatorios
    validity_days INTEGER DEFAULT 365,
    reminder_days_before INTEGER DEFAULT 30,

    -- Estado
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Plantilla por defecto para el tipo

    -- Auditoria
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Restriccion: una sola plantilla default por tipo y empresa
    CONSTRAINT unique_default_template UNIQUE (company_id, exam_type, is_default)
        DEFERRABLE INITIALLY DEFERRED
);

-- Indices para busquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_medical_templates_company ON medical_exam_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_templates_type ON medical_exam_templates(exam_type);
CREATE INDEX IF NOT EXISTS idx_medical_templates_active ON medical_exam_templates(is_active);

COMMENT ON TABLE medical_exam_templates IS 'Plantillas de examenes medicos configurables por empresa segun normativa SRT';

-- =====================================================
-- TABLA 2: medical_records
-- Registros medicos con sistema de inmutabilidad
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Tipo de registro
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN (
        'exam', 'certificate', 'study', 'prescription',
        'antecedent', 'aptitude', 'disability', 'accident'
    )),
    template_id INTEGER REFERENCES medical_exam_templates(id),

    -- Datos del registro
    title VARCHAR(255) NOT NULL,
    description TEXT,
    exam_date DATE NOT NULL,
    expiration_date DATE, -- Calculado desde template.validity_days

    -- Resultado del examen
    result VARCHAR(50) CHECK (result IN (
        'apto', 'apto_con_observaciones', 'no_apto',
        'pendiente', 'vencido', 'suspendido'
    )),
    result_details TEXT, -- Detalles del resultado
    observations TEXT,
    restrictions JSONB DEFAULT '[]'::JSONB, -- Restricciones laborales

    -- Archivos adjuntos
    attachments JSONB DEFAULT '[]'::JSONB,
    -- Estructura: [{filename, original_name, url, mime_type, size_bytes, uploaded_at, checksum_sha256}]

    -- Estudios completados (referencia a template)
    completed_studies JSONB DEFAULT '[]'::JSONB,
    -- Estructura: [{study_name, completed, date, result, notes, attachment_index}]

    -- Documentos presentados
    submitted_documents JSONB DEFAULT '[]'::JSONB,
    -- Estructura: [{document_name, submitted, date, verified_by, attachment_index}]

    -- =====================================================
    -- VALIDEZ LEGAL - Firma digital
    -- =====================================================
    digital_signature VARCHAR(64), -- SHA-256 del contenido
    signature_timestamp TIMESTAMP WITH TIME ZONE,
    signature_data JSONB, -- Datos incluidos en la firma
    signed_by UUID REFERENCES users(user_id), -- Medico firmante

    -- =====================================================
    -- SISTEMA DE INMUTABILIDAD
    -- =====================================================
    -- Ventana de edicion: 48 horas desde creacion
    editable_until TIMESTAMP WITH TIME ZONE, -- created_at + 48 horas

    -- Estado de bloqueo
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by UUID REFERENCES users(user_id), -- NULL = automatico
    locked_reason VARCHAR(255) DEFAULT 'Ventana de edicion expirada',

    -- Contadores de edicion (para auditoria)
    edit_count INTEGER DEFAULT 0,
    last_edited_by UUID REFERENCES users(user_id),
    last_edited_at TIMESTAMP WITH TIME ZONE,

    -- =====================================================
    -- SOFT DELETE CON AUTORIZACION
    -- =====================================================
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(user_id),
    deletion_reason TEXT,
    deletion_authorized_by UUID REFERENCES users(user_id),
    deletion_authorization_id INTEGER, -- FK a medical_edit_authorizations

    -- =====================================================
    -- AUDITORIA BASICA
    -- =====================================================
    created_by UUID NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata adicional
    metadata JSONB DEFAULT '{}'::JSONB,
    version INTEGER DEFAULT 1 -- Para optimistic locking
);

-- Indices para busquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_medical_records_company ON medical_records(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_employee ON medical_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_medical_records_exam_date ON medical_records(exam_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_result ON medical_records(result);
CREATE INDEX IF NOT EXISTS idx_medical_records_locked ON medical_records(is_locked);
CREATE INDEX IF NOT EXISTS idx_medical_records_deleted ON medical_records(is_deleted);
CREATE INDEX IF NOT EXISTS idx_medical_records_editable ON medical_records(editable_until);
CREATE INDEX IF NOT EXISTS idx_medical_records_expiration ON medical_records(expiration_date);

-- Indice parcial para registros activos
CREATE INDEX IF NOT EXISTS idx_medical_records_active ON medical_records(company_id, employee_id)
    WHERE is_deleted = false;

COMMENT ON TABLE medical_records IS 'Registros medicos con inmutabilidad controlada y validez legal segun Ley 19.587';

-- =====================================================
-- TABLA 3: medical_edit_authorizations
-- Autorizaciones de edicion/borrado via notificaciones
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_edit_authorizations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Registro a modificar
    record_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL, -- Redundante pero util para queries

    -- =====================================================
    -- SOLICITUD
    -- =====================================================
    requested_by UUID NOT NULL REFERENCES users(user_id), -- Medico solicitante
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    request_reason TEXT NOT NULL, -- Explicacion obligatoria
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('edit', 'delete')),

    -- Para ediciones: cambios propuestos
    proposed_changes JSONB, -- {field: {old_value, new_value}}

    -- Urgencia
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- =====================================================
    -- AUTORIZACION
    -- =====================================================
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'expired', 'cancelled', 'escalated'
    )),

    -- Quien autorizo
    authorized_by UUID REFERENCES users(user_id), -- RRHH o Supervisor
    authorized_at TIMESTAMP WITH TIME ZONE,
    authorization_response TEXT, -- Respuesta/comentario del autorizador

    -- Nivel de escalamiento actual
    current_step INTEGER DEFAULT 1,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalation_reason VARCHAR(255),

    -- =====================================================
    -- VENTANA TEMPORAL (post-aprobacion)
    -- =====================================================
    authorization_window_start TIMESTAMP WITH TIME ZONE,
    authorization_window_end TIMESTAMP WITH TIME ZONE, -- start + 24 horas

    -- Control de uso de ventana
    window_used BOOLEAN DEFAULT false,
    window_used_at TIMESTAMP WITH TIME ZONE,
    window_action_performed VARCHAR(50), -- 'edited', 'deleted', 'expired_unused'

    -- =====================================================
    -- INTEGRACION CON NOTIFICACIONES PROACTIVAS
    -- =====================================================
    notification_id INTEGER, -- FK a notifications (fuente unica de verdad)
    notification_group_id VARCHAR(100), -- Para agrupar notificaciones relacionadas

    -- =====================================================
    -- AUDIT TRAIL INTERNO
    -- =====================================================
    audit_trail JSONB DEFAULT '[]'::JSONB,
    -- Estructura: [{timestamp, action, user_id, user_name, details, ip_address}]

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE -- Cuando expira la solicitud si no se responde
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_medical_auth_company ON medical_edit_authorizations(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_auth_record ON medical_edit_authorizations(record_id);
CREATE INDEX IF NOT EXISTS idx_medical_auth_status ON medical_edit_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_medical_auth_requested_by ON medical_edit_authorizations(requested_by);
CREATE INDEX IF NOT EXISTS idx_medical_auth_authorized_by ON medical_edit_authorizations(authorized_by);
CREATE INDEX IF NOT EXISTS idx_medical_auth_notification ON medical_edit_authorizations(notification_id);
CREATE INDEX IF NOT EXISTS idx_medical_auth_pending ON medical_edit_authorizations(company_id, status)
    WHERE status = 'pending';

COMMENT ON TABLE medical_edit_authorizations IS 'Autorizaciones de edicion/borrado de registros medicos via notificaciones proactivas';

-- =====================================================
-- TABLA 4: medical_record_audit_log
-- Log de auditoria INMUTABLE (append-only)
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_record_audit_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,

    -- Registro afectado
    record_id INTEGER NOT NULL,
    record_type VARCHAR(50) NOT NULL,

    -- Accion realizada
    action VARCHAR(30) NOT NULL CHECK (action IN (
        'created', 'viewed', 'edited', 'signed',
        'locked', 'unlocked_temporary',
        'delete_requested', 'delete_approved', 'delete_rejected',
        'deleted', 'restored',
        'authorization_requested', 'authorization_approved',
        'authorization_rejected', 'authorization_expired',
        'window_opened', 'window_used', 'window_expired',
        'attachment_added', 'attachment_removed',
        'exported', 'printed'
    )),

    -- Quien realizo la accion
    action_by UUID, -- NULL para acciones automaticas del sistema
    action_by_name VARCHAR(255), -- Redundante pero util para reportes
    action_by_role VARCHAR(50),
    action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Valores antes y despues
    old_values JSONB,
    new_values JSONB,

    -- Contexto de la accion
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),

    -- Referencia a autorizacion (si aplica)
    authorization_id INTEGER,

    -- Notas adicionales
    notes TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB

    -- NOTA: Esta tabla NO tiene updated_at porque es append-only
    -- Los registros NUNCA se modifican ni eliminan
);

-- Indices para busquedas y reportes
CREATE INDEX IF NOT EXISTS idx_medical_audit_company ON medical_record_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_audit_record ON medical_record_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_medical_audit_action ON medical_record_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_medical_audit_action_by ON medical_record_audit_log(action_by);
CREATE INDEX IF NOT EXISTS idx_medical_audit_action_at ON medical_record_audit_log(action_at);
CREATE INDEX IF NOT EXISTS idx_medical_audit_authorization ON medical_record_audit_log(authorization_id);

-- Indice compuesto para timeline de un registro
CREATE INDEX IF NOT EXISTS idx_medical_audit_timeline ON medical_record_audit_log(record_id, action_at DESC);

COMMENT ON TABLE medical_record_audit_log IS 'Log de auditoria inmutable (append-only) para trazabilidad legal completa';

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Funcion para generar firma digital SHA-256
CREATE OR REPLACE FUNCTION generate_medical_record_signature(
    p_record_id INTEGER
) RETURNS VARCHAR(64) AS $$
DECLARE
    v_data TEXT;
    v_signature VARCHAR(64);
BEGIN
    -- Construir datos para firmar
    SELECT
        CONCAT(
            id::TEXT, '|',
            company_id::TEXT, '|',
            employee_id::TEXT, '|',
            record_type, '|',
            title, '|',
            COALESCE(description, ''), '|',
            exam_date::TEXT, '|',
            COALESCE(result, ''), '|',
            created_at::TEXT, '|',
            created_by::TEXT
        )
    INTO v_data
    FROM medical_records
    WHERE id = p_record_id;

    -- Generar SHA-256
    v_signature := encode(digest(v_data, 'sha256'), 'hex');

    RETURN v_signature;
END;
$$ LANGUAGE plpgsql;

-- Funcion para bloquear automaticamente registros expirados
CREATE OR REPLACE FUNCTION lock_expired_medical_records() RETURNS INTEGER AS $$
DECLARE
    v_locked_count INTEGER;
BEGIN
    UPDATE medical_records
    SET
        is_locked = true,
        locked_at = NOW(),
        locked_reason = 'Ventana de edicion expirada (automatico)',
        updated_at = NOW()
    WHERE
        is_locked = false
        AND is_deleted = false
        AND editable_until IS NOT NULL
        AND editable_until < NOW();

    GET DIAGNOSTICS v_locked_count = ROW_COUNT;

    -- Registrar en audit log
    INSERT INTO medical_record_audit_log (
        company_id, record_id, record_type, action,
        action_by, action_by_name, action_by_role,
        notes, metadata
    )
    SELECT
        company_id, id, record_type, 'locked',
        0, 'SYSTEM', 'system',
        'Bloqueo automatico por expiracion de ventana de edicion',
        jsonb_build_object('locked_count', v_locked_count, 'batch_lock', true)
    FROM medical_records
    WHERE
        is_locked = true
        AND locked_at >= NOW() - INTERVAL '1 minute'
        AND locked_reason LIKE '%automatico%';

    RETURN v_locked_count;
END;
$$ LANGUAGE plpgsql;

-- Funcion para verificar si un registro es editable
CREATE OR REPLACE FUNCTION is_medical_record_editable(
    p_record_id INTEGER,
    p_user_id INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_record RECORD;
    v_authorization RECORD;
    v_result JSONB;
BEGIN
    -- Obtener registro
    SELECT * INTO v_record FROM medical_records WHERE id = p_record_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('editable', false, 'reason', 'Registro no encontrado');
    END IF;

    -- Verificar si esta eliminado
    IF v_record.is_deleted THEN
        RETURN jsonb_build_object('editable', false, 'reason', 'Registro eliminado');
    END IF;

    -- Verificar ventana de edicion normal
    IF NOT v_record.is_locked AND v_record.editable_until > NOW() THEN
        RETURN jsonb_build_object(
            'editable', true,
            'reason', 'Dentro de ventana de edicion',
            'editable_until', v_record.editable_until,
            'requires_authorization', false
        );
    END IF;

    -- Verificar si hay autorizacion activa
    SELECT * INTO v_authorization
    FROM medical_edit_authorizations
    WHERE
        record_id = p_record_id
        AND status = 'approved'
        AND window_used = false
        AND authorization_window_end > NOW()
        AND (p_user_id IS NULL OR requested_by = p_user_id)
    ORDER BY authorized_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'editable', true,
            'reason', 'Autorizacion activa',
            'authorization_id', v_authorization.id,
            'window_end', v_authorization.authorization_window_end,
            'requires_authorization', false
        );
    END IF;

    -- No editable
    RETURN jsonb_build_object(
        'editable', false,
        'reason', 'Registro bloqueado - requiere autorizacion',
        'locked_at', v_record.locked_at,
        'requires_authorization', true
    );
END;
$$ LANGUAGE plpgsql;

-- Funcion para obtener estadisticas de registros medicos
CREATE OR REPLACE FUNCTION get_medical_records_stats(
    p_company_id INTEGER,
    p_employee_id INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_records', COUNT(*),
        'by_type', jsonb_object_agg(
            COALESCE(record_type, 'unknown'),
            type_count
        ),
        'by_result', jsonb_object_agg(
            COALESCE(result, 'sin_resultado'),
            result_count
        ),
        'locked_records', SUM(CASE WHEN is_locked THEN 1 ELSE 0 END),
        'pending_authorizations', (
            SELECT COUNT(*) FROM medical_edit_authorizations
            WHERE company_id = p_company_id AND status = 'pending'
        ),
        'expiring_soon', SUM(
            CASE WHEN expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
            THEN 1 ELSE 0 END
        )
    )
    INTO v_stats
    FROM (
        SELECT
            record_type,
            result,
            is_locked,
            expiration_date,
            COUNT(*) OVER (PARTITION BY record_type) as type_count,
            COUNT(*) OVER (PARTITION BY result) as result_count
        FROM medical_records
        WHERE
            company_id = p_company_id
            AND is_deleted = false
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
    ) subq;

    RETURN COALESCE(v_stats, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_medical_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_medical_templates_updated
    BEFORE UPDATE ON medical_exam_templates
    FOR EACH ROW EXECUTE FUNCTION update_medical_updated_at();

CREATE TRIGGER trg_medical_records_updated
    BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_medical_updated_at();

CREATE TRIGGER trg_medical_authorizations_updated
    BEFORE UPDATE ON medical_edit_authorizations
    FOR EACH ROW EXECUTE FUNCTION update_medical_updated_at();

-- Trigger para auto-calcular editable_until al crear registro
CREATE OR REPLACE FUNCTION set_medical_record_editable_until()
RETURNS TRIGGER AS $$
BEGIN
    -- Ventana de 48 horas desde creacion
    NEW.editable_until = NEW.created_at + INTERVAL '48 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_medical_record_editable_until
    BEFORE INSERT ON medical_records
    FOR EACH ROW EXECUTE FUNCTION set_medical_record_editable_until();

-- Trigger para auto-calcular expiration_date basado en template
CREATE OR REPLACE FUNCTION set_medical_record_expiration()
RETURNS TRIGGER AS $$
DECLARE
    v_validity_days INTEGER;
BEGIN
    IF NEW.template_id IS NOT NULL AND NEW.expiration_date IS NULL THEN
        SELECT validity_days INTO v_validity_days
        FROM medical_exam_templates
        WHERE id = NEW.template_id;

        IF v_validity_days IS NOT NULL THEN
            NEW.expiration_date = NEW.exam_date + (v_validity_days || ' days')::INTERVAL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_medical_record_expiration
    BEFORE INSERT OR UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION set_medical_record_expiration();

-- Trigger para registrar cambios en audit log
CREATE OR REPLACE FUNCTION audit_medical_record_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action VARCHAR(30);
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_new_values := to_jsonb(NEW);

        INSERT INTO medical_record_audit_log (
            company_id, record_id, record_type, action,
            action_by, new_values
        ) VALUES (
            NEW.company_id, NEW.id, NEW.record_type, v_action,
            NEW.created_by, v_new_values
        );

    ELSIF TG_OP = 'UPDATE' THEN
        -- Determinar tipo de accion
        IF OLD.is_locked = false AND NEW.is_locked = true THEN
            v_action := 'locked';
        ELSIF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            v_action := 'deleted';
        ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            v_action := 'restored';
        ELSE
            v_action := 'edited';
        END IF;

        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);

        INSERT INTO medical_record_audit_log (
            company_id, record_id, record_type, action,
            action_by, old_values, new_values
        ) VALUES (
            NEW.company_id, NEW.id, NEW.record_type, v_action,
            COALESCE(NEW.last_edited_by, NEW.created_by), v_old_values, v_new_values
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_medical_records
    AFTER INSERT OR UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION audit_medical_record_changes();

-- =====================================================
-- DATOS INICIALES: Plantillas predefinidas globales
-- (company_id = NULL significa plantilla global/template)
-- =====================================================

-- Plantilla 1: Preocupacional Standard
INSERT INTO medical_exam_templates (
    company_id, template_name, template_code, exam_type, description,
    required_studies, required_documents, validity_days, reminder_days_before,
    is_active, is_default
) VALUES (
    NULL,
    'Examen Preocupacional Standard',
    'PRE-STD',
    'preocupacional',
    'Examen medico de ingreso segun Res. SRT 37/10. Evalua aptitud fisica y psiquica para el puesto de trabajo.',
    '[
        {"name": "Laboratorio Completo", "type": "lab", "required": true, "notes": "Hemograma, glucemia, uremia, hepatograma"},
        {"name": "Radiografia de Torax", "type": "imaging", "required": true, "notes": "Frente y perfil"},
        {"name": "Electrocardiograma", "type": "cardio", "required": true, "notes": "ECG de 12 derivaciones"},
        {"name": "Examen Clinico General", "type": "clinical", "required": true, "notes": "Incluye examen fisico completo"},
        {"name": "Audiometria", "type": "audio", "required": false, "notes": "Obligatorio para puestos con exposicion a ruido > 85dB"},
        {"name": "Espirometria", "type": "respiratory", "required": false, "notes": "Obligatorio para exposicion a polvos/humos"},
        {"name": "Examen Visual", "type": "vision", "required": true, "notes": "Agudeza visual, vision cromatica"}
    ]'::JSONB,
    '[
        {"name": "DNI/Pasaporte", "type": "identity", "required": true},
        {"name": "Declaracion Jurada de Salud", "type": "health_declaration", "required": true},
        {"name": "Antecedentes de Obra Social", "type": "insurance", "required": false}
    ]'::JSONB,
    180, -- 6 meses validez
    30,
    true, false
) ON CONFLICT DO NOTHING;

-- Plantilla 2: Periodico Anual
INSERT INTO medical_exam_templates (
    company_id, template_name, template_code, exam_type, description,
    required_studies, required_documents, validity_days, reminder_days_before,
    is_active, is_default
) VALUES (
    NULL,
    'Examen Periodico Anual',
    'PER-ANL',
    'periodico',
    'Examen medico periodico segun Res. SRT 43/97. Control de salud durante la relacion laboral.',
    '[
        {"name": "Laboratorio Basico", "type": "lab", "required": true, "notes": "Hemograma, glucemia, orina completa"},
        {"name": "Examen Clinico", "type": "clinical", "required": true},
        {"name": "Control de Peso/Tension", "type": "vitals", "required": true},
        {"name": "Audiometria", "type": "audio", "required": false, "condition": "exposicion_ruido"},
        {"name": "Espirometria", "type": "respiratory", "required": false, "condition": "exposicion_quimicos"}
    ]'::JSONB,
    '[]'::JSONB,
    365, -- 1 año
    60,
    true, false
) ON CONFLICT DO NOTHING;

-- Plantilla 3: Reingreso
INSERT INTO medical_exam_templates (
    company_id, template_name, template_code, exam_type, description,
    required_studies, required_documents, validity_days, reminder_days_before,
    is_active, is_default
) VALUES (
    NULL,
    'Examen de Reingreso',
    'REING',
    'reingreso',
    'Examen medico post-ausencia prolongada (> 30 dias). Evalua aptitud para retomar tareas habituales.',
    '[
        {"name": "Examen Clinico Focalizado", "type": "clinical", "required": true, "notes": "Enfocado en patologia previa"},
        {"name": "Evaluacion de Aptitud", "type": "fitness", "required": true},
        {"name": "Estudios segun patologia previa", "type": "specific", "required": false}
    ]'::JSONB,
    '[
        {"name": "Alta Medica", "type": "medical_release", "required": true},
        {"name": "Epicrisis", "type": "discharge_summary", "required": false, "notes": "Si hubo internacion"}
    ]'::JSONB,
    30, -- Valido solo para ese reingreso
    0,
    true, false
) ON CONFLICT DO NOTHING;

-- Plantilla 4: Retiro/Egreso
INSERT INTO medical_exam_templates (
    company_id, template_name, template_code, exam_type, description,
    required_studies, required_documents, validity_days, reminder_days_before,
    is_active, is_default
) VALUES (
    NULL,
    'Examen de Egreso',
    'EGRESO',
    'retiro',
    'Examen medico de desvinculacion segun Ley 19.587. Documenta estado de salud al finalizar relacion laboral.',
    '[
        {"name": "Examen Clinico Completo", "type": "clinical", "required": true},
        {"name": "Laboratorio Completo", "type": "lab", "required": true},
        {"name": "Radiografia de Torax", "type": "imaging", "required": true},
        {"name": "Audiometria", "type": "audio", "required": true, "notes": "Comparativo con ingreso"},
        {"name": "Espirometria", "type": "respiratory", "required": false}
    ]'::JSONB,
    '[
        {"name": "Constancia de Estado de Salud", "type": "health_status", "required": true}
    ]'::JSONB,
    30,
    0,
    true, false
) ON CONFLICT DO NOTHING;

-- Plantilla 5: Especial - Trabajo en Altura
INSERT INTO medical_exam_templates (
    company_id, template_name, template_code, exam_type, description,
    required_studies, required_documents, validity_days, reminder_days_before,
    is_active, is_default
) VALUES (
    NULL,
    'Examen Especial - Trabajo en Altura',
    'ESP-ALT',
    'especial',
    'Examen especifico para tareas en altura (> 2 metros). Segun Res. SRT 905/15.',
    '[
        {"name": "Examen Cardiovascular Completo", "type": "cardio", "required": true, "notes": "ECG + ergometria"},
        {"name": "Evaluacion Neurologica", "type": "neuro", "required": true},
        {"name": "Test de Vertigo/Equilibrio", "type": "vestibular", "required": true},
        {"name": "Examen Visual Completo", "type": "vision", "required": true, "notes": "Incluye vision profunda"},
        {"name": "Audiometria", "type": "audio", "required": true}
    ]'::JSONB,
    '[]'::JSONB,
    180,
    30,
    true, false
) ON CONFLICT DO NOTHING;

-- =====================================================
-- PERMISOS Y SEGURIDAD
-- =====================================================

-- Revocar permisos de DELETE en audit_log (append-only)
-- NOTA: Esto debe ejecutarse con el usuario apropiado
-- REVOKE DELETE ON medical_record_audit_log FROM PUBLIC;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

COMMENT ON FUNCTION generate_medical_record_signature IS 'Genera firma digital SHA-256 para validez legal del registro';
COMMENT ON FUNCTION lock_expired_medical_records IS 'Bloquea automaticamente registros cuya ventana de edicion expiro';
COMMENT ON FUNCTION is_medical_record_editable IS 'Verifica si un registro es editable (ventana o autorizacion)';
COMMENT ON FUNCTION get_medical_records_stats IS 'Obtiene estadisticas de registros medicos por empresa/empleado';

-- =====================================================
-- FIN DE MIGRACION
-- =====================================================
