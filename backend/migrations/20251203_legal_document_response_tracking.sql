-- Migration: Legal Document Response Tracking
-- Agrega campos para seguimiento de respuestas esperadas y ventana de edición

-- 1. Agregar campos a legal_case_documents para tracking de respuestas
ALTER TABLE legal_case_documents
ADD COLUMN IF NOT EXISTS expects_response BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS response_deadline DATE,
ADD COLUMN IF NOT EXISTS response_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_received_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS response_document_id INTEGER REFERENCES legal_case_documents(id),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS lock_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS edit_window_hours INTEGER DEFAULT 72,
ADD COLUMN IF NOT EXISTS can_edit_until TIMESTAMP;

-- Constraint para response_type
ALTER TABLE legal_case_documents DROP CONSTRAINT IF EXISTS legal_case_documents_response_type_check;
ALTER TABLE legal_case_documents ADD CONSTRAINT legal_case_documents_response_type_check
CHECK (response_type IS NULL OR response_type IN (
    'acuse_recibo',           -- Acuse de recibo simple
    'contestacion_extrajudicial', -- Respuesta extrajudicial del empleado
    'contestacion_judicial',  -- Respuesta judicial
    'notificacion_judicial',  -- Notificación del juzgado
    'resolucion',             -- Resolución/Sentencia
    'apelacion',              -- Recurso de apelación
    'recurso_extraordinario', -- Recurso extraordinario
    'none'                    -- No espera respuesta
));

-- 2. Agregar más tipos de documentos si no existen
DO $$
BEGIN
    -- Agregar acuse_recibo si no está en el CHECK constraint
    ALTER TABLE legal_case_documents DROP CONSTRAINT IF EXISTS legal_case_documents_document_type_check;

    ALTER TABLE legal_case_documents ADD CONSTRAINT legal_case_documents_document_type_check
    CHECK (document_type IN (
        -- Contratos y documentos laborales
        'employment_contract', 'salary_receipt', 'warning_letter', 'suspension_letter',
        'termination_letter', 'resignation_letter',
        -- Comunicaciones fehacientes
        'carta_documento', 'telegrama', 'email_evidence', 'internal_memo',
        -- Acuses y respuestas
        'acuse_recibo', 'constancia_entrega', 'respuesta_empleado', 'descargo',
        -- Documentos judiciales
        'demanda', 'contestacion', 'prueba_documental', 'prueba_testimonial',
        'prueba_pericial', 'alegato', 'sentencia', 'recurso', 'resolucion',
        -- Mediación
        'acta_mediacion', 'acuerdo_mediacion', 'citacion_mediacion',
        -- Otros
        'medical_certificate', 'attendance_report', 'witness_statement',
        'photo_evidence', 'video_evidence', 'informe_tecnico', 'dictamen_pericial',
        'expediente_completo', 'other'
    ));
END $$;

-- 3. Crear función para calcular ventana de edición
CREATE OR REPLACE FUNCTION set_document_edit_window()
RETURNS TRIGGER AS $$
BEGIN
    -- Por defecto 72 horas para editar después de creación
    IF NEW.can_edit_until IS NULL THEN
        NEW.can_edit_until := NEW.created_at + (COALESCE(NEW.edit_window_hours, 72) || ' hours')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para ventana de edición automática
DROP TRIGGER IF EXISTS trg_document_edit_window ON legal_case_documents;
CREATE TRIGGER trg_document_edit_window
    BEFORE INSERT ON legal_case_documents
    FOR EACH ROW
    EXECUTE FUNCTION set_document_edit_window();

-- 5. Función para bloquear documento (inmutabilidad)
CREATE OR REPLACE FUNCTION lock_legal_document(doc_id INTEGER, reason VARCHAR DEFAULT 'Período de edición expirado')
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE legal_case_documents
    SET is_locked = true,
        locked_at = NOW(),
        lock_reason = reason
    WHERE id = doc_id AND is_locked = false;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear tabla para alertas de documentos pendientes
CREATE TABLE IF NOT EXISTS legal_document_alerts (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES legal_case_documents(id) ON DELETE CASCADE,
    case_id INTEGER REFERENCES legal_cases(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning',
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(user_id),
    due_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Constraint para alert_type
ALTER TABLE legal_document_alerts DROP CONSTRAINT IF EXISTS legal_document_alerts_type_check;
ALTER TABLE legal_document_alerts ADD CONSTRAINT legal_document_alerts_type_check
CHECK (alert_type IN (
    'missing_acuse',          -- Falta acuse de recibo
    'response_overdue',       -- Respuesta vencida
    'edit_window_expiring',   -- Ventana de edición por vencer
    'document_locked',        -- Documento bloqueado
    'missing_attachment',     -- Falta adjunto requerido
    'deadline_approaching',   -- Vencimiento próximo
    'action_required'         -- Acción requerida
));

ALTER TABLE legal_document_alerts DROP CONSTRAINT IF EXISTS legal_document_alerts_severity_check;
ALTER TABLE legal_document_alerts ADD CONSTRAINT legal_document_alerts_severity_check
CHECK (severity IN ('info', 'warning', 'error', 'critical'));

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_legal_doc_alerts_company ON legal_document_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_doc_alerts_unresolved ON legal_document_alerts(is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_legal_doc_alerts_due ON legal_document_alerts(due_date);

-- 7. Función para crear alerta de acuse faltante
CREATE OR REPLACE FUNCTION check_missing_acuse()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el documento espera respuesta y pasó el deadline sin recibirla
    IF NEW.expects_response = true
       AND NEW.response_received = false
       AND NEW.response_deadline < CURRENT_DATE THEN

        INSERT INTO legal_document_alerts (document_id, case_id, company_id, alert_type, message, severity, due_date)
        SELECT NEW.id, NEW.case_id, lc.company_id, 'missing_acuse',
               'Falta acuse de recibo/respuesta para: ' || NEW.title,
               'warning', NEW.response_deadline
        FROM legal_cases lc WHERE lc.id = NEW.case_id
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE legal_document_alerts IS 'Alertas de documentos legales pendientes - acuses, respuestas, vencimientos';
COMMENT ON COLUMN legal_case_documents.expects_response IS 'Indica si este documento espera una respuesta (acuse, contestación)';
COMMENT ON COLUMN legal_case_documents.response_type IS 'Tipo de respuesta esperada';
COMMENT ON COLUMN legal_case_documents.can_edit_until IS 'Fecha límite para editar (después se bloquea)';
