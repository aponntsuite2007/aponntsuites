-- =====================================================
-- MIGRACION: Sistema de Workflow Legal Completo
-- Fecha: 2025-12-03
-- Descripcion: Expedientes legales con workflow completo
--              Prejudicial -> Mediacion -> Judicial
--              Expediente 360 + Timeline + Documentos
--
-- Funcionalidades:
--   - Expedientes legales (demandas, reclamos)
--   - Workflow de 3 etapas con sub-estados
--   - Timeline visual de eventos
--   - Gestion de documentos PDF
--   - Sistema de vencimientos y alertas
--   - Integracion con notificaciones centrales
-- =====================================================

-- ===========================================
-- TABLA 1: legal_cases (Expedientes Legales)
-- ===========================================
CREATE TABLE IF NOT EXISTS legal_cases (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Numero de expediente interno
    case_number VARCHAR(50) NOT NULL,
    external_case_number VARCHAR(100), -- Numero de expediente judicial/mediacion

    -- Tipo de caso
    case_type VARCHAR(50) NOT NULL CHECK (case_type IN (
        'lawsuit_employee',      -- Demanda iniciada por empleado
        'lawsuit_company',       -- Demanda iniciada por empresa
        'labor_claim',           -- Reclamo laboral
        'mediation_request',     -- Solicitud de mediacion
        'administrative_claim',  -- Reclamo administrativo (ministerio trabajo)
        'union_dispute',         -- Conflicto sindical
        'workplace_accident',    -- Accidente laboral (juicio)
        'occupational_disease',  -- Enfermedad profesional (juicio)
        'wrongful_termination',  -- Despido injustificado
        'discrimination',        -- Discriminacion
        'harassment',            -- Acoso laboral/sexual
        'other'
    )),

    -- Empleado involucrado
    employee_id UUID NOT NULL REFERENCES users(user_id),
    employee_name VARCHAR(255), -- Snapshot del nombre
    employee_position VARCHAR(255), -- Snapshot del cargo
    employee_department VARCHAR(255), -- Snapshot del departamento
    employee_hire_date DATE, -- Snapshot fecha ingreso
    employee_termination_date DATE, -- Si aplica

    -- Detalles del caso
    title VARCHAR(500) NOT NULL,
    description TEXT,
    claimed_amount DECIMAL(15,2), -- Monto reclamado
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Representacion legal
    plaintiff_lawyer VARCHAR(255), -- Abogado demandante
    plaintiff_lawyer_contact TEXT, -- Datos contacto abogado demandante
    defendant_lawyer VARCHAR(255), -- Abogado defensor (empresa)
    defendant_lawyer_id UUID REFERENCES users(user_id), -- Si es interno

    -- Jurisdiccion
    jurisdiction VARCHAR(100), -- Ej: "Juzgado Laboral N5 CABA"
    jurisdiction_code VARCHAR(10), -- ARG, BRA, etc
    judge_name VARCHAR(255),

    -- Estado actual
    current_stage VARCHAR(30) DEFAULT 'prejudicial' CHECK (current_stage IN (
        'prejudicial',  -- Etapa previa (intimaciones, cartas documento)
        'mediation',    -- Mediacion obligatoria
        'judicial',     -- Proceso judicial
        'appeal',       -- Apelacion
        'execution',    -- Ejecucion de sentencia
        'closed'        -- Cerrado
    )),
    current_sub_status VARCHAR(50),

    -- Resultado final
    resolution_type VARCHAR(30) CHECK (resolution_type IN (
        'favorable',           -- Favorable a empresa
        'unfavorable',         -- Desfavorable a empresa
        'partial',             -- Parcialmente favorable
        'settlement',          -- Acuerdo/conciliacion
        'withdrawal',          -- Desistimiento
        'dismissal',           -- Rechazo de demanda
        'prescription',        -- Prescripcion
        'in_progress'          -- En curso
    )),
    resolution_amount DECIMAL(15,2),
    resolution_date DATE,
    resolution_summary TEXT,

    -- Fechas importantes
    incident_date DATE, -- Fecha del hecho que origino el caso
    notification_date DATE, -- Fecha notificacion demanda/reclamo
    filing_date DATE, -- Fecha presentacion demanda

    -- Prioridad y riesgo
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    risk_assessment VARCHAR(20) CHECK (risk_assessment IN ('low', 'medium', 'high', 'very_high')),
    estimated_exposure DECIMAL(15,2), -- Exposicion economica estimada

    -- Flags
    is_active BOOLEAN DEFAULT TRUE,
    is_confidential BOOLEAN DEFAULT FALSE,
    requires_reserve BOOLEAN DEFAULT FALSE, -- Requiere reserva contable
    reserve_amount DECIMAL(15,2),

    -- Snapshot del expediente 360 al momento de crear
    employee_360_snapshot JSONB,

    -- Metadata
    created_by UUID REFERENCES users(user_id),
    assigned_to UUID REFERENCES users(user_id), -- Abogado asignado
    tags TEXT[], -- Tags para busqueda

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP,

    -- Unique constraint
    CONSTRAINT uk_legal_case_number UNIQUE (company_id, case_number)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_legal_cases_company ON legal_cases(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_employee ON legal_cases(employee_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_stage ON legal_cases(current_stage);
CREATE INDEX IF NOT EXISTS idx_legal_cases_type ON legal_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_legal_cases_active ON legal_cases(is_active);
CREATE INDEX IF NOT EXISTS idx_legal_cases_assigned ON legal_cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_legal_cases_dates ON legal_cases(filing_date, notification_date);

-- ===========================================
-- TABLA 2: legal_case_stages (Etapas del caso)
-- ===========================================
CREATE TABLE IF NOT EXISTS legal_case_stages (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,

    -- Etapa
    stage VARCHAR(30) NOT NULL CHECK (stage IN (
        'prejudicial', 'mediation', 'judicial', 'appeal', 'execution', 'closed'
    )),

    -- Sub-estados por etapa
    sub_status VARCHAR(50) NOT NULL,
    -- Prejudicial: 'carta_documento_enviada', 'carta_documento_recibida', 'intimacion', 'respuesta_intimacion', 'negociacion'
    -- Mediacion: 'citacion', 'primera_audiencia', 'audiencias_posteriores', 'acuerdo', 'fracaso'
    -- Judicial: 'demanda_presentada', 'contestacion', 'prueba', 'alegatos', 'sentencia_primera', 'sentencia_firme'
    -- Appeal: 'recurso_presentado', 'traslado', 'resolucion_camara'
    -- Execution: 'liquidacion', 'embargo', 'pago', 'cierre'

    -- Descripcion
    description TEXT,
    notes TEXT,

    -- Fechas
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,

    -- Resultado de la etapa
    outcome VARCHAR(50),
    outcome_details TEXT,

    -- Usuario que registro
    recorded_by UUID REFERENCES users(user_id),

    -- Orden para timeline
    sequence_order INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_stages_case ON legal_case_stages(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_stages_stage ON legal_case_stages(stage);

-- ===========================================
-- TABLA 3: legal_case_timeline_events (Linea de tiempo)
-- ===========================================
CREATE TABLE IF NOT EXISTS legal_case_timeline_events (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES legal_case_stages(id),

    -- Tipo de evento
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        -- Documentos
        'document_sent',        -- Documento enviado
        'document_received',    -- Documento recibido
        'document_filed',       -- Documento presentado en juzgado

        -- Audiencias
        'hearing_scheduled',    -- Audiencia programada
        'hearing_held',         -- Audiencia realizada
        'hearing_postponed',    -- Audiencia postergada

        -- Resoluciones
        'resolution_issued',    -- Resolucion emitida
        'sentence_issued',      -- Sentencia emitida
        'appeal_filed',         -- Apelacion presentada

        -- Notificaciones
        'notification_sent',    -- Notificacion enviada
        'notification_received',-- Notificacion recibida

        -- Pagos
        'payment_made',         -- Pago realizado
        'payment_received',     -- Pago recibido

        -- Cambios de estado
        'stage_change',         -- Cambio de etapa
        'status_change',        -- Cambio de estado

        -- Otros
        'note_added',           -- Nota agregada
        'meeting_held',         -- Reunion realizada
        'deadline_set',         -- Vencimiento establecido
        'deadline_met',         -- Vencimiento cumplido
        'deadline_missed',      -- Vencimiento incumplido
        'alert_triggered',      -- Alerta disparada
        'other'
    )),

    -- Contenido
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Fecha del evento (puede ser diferente a created_at)
    event_date TIMESTAMP NOT NULL,

    -- Importancia
    importance VARCHAR(20) DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high', 'critical')),

    -- Visibilidad
    is_public BOOLEAN DEFAULT TRUE, -- Visible para todos o solo abogados
    is_milestone BOOLEAN DEFAULT FALSE, -- Hito importante

    -- Referencias
    document_id INTEGER, -- FK a legal_case_documents si aplica
    related_event_id INTEGER REFERENCES legal_case_timeline_events(id),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Usuario
    created_by UUID REFERENCES users(user_id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_timeline_case ON legal_case_timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_timeline_date ON legal_case_timeline_events(event_date);
CREATE INDEX IF NOT EXISTS idx_legal_timeline_type ON legal_case_timeline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_legal_timeline_milestone ON legal_case_timeline_events(is_milestone) WHERE is_milestone = TRUE;

-- ===========================================
-- TABLA 4: legal_case_documents (Documentos)
-- ===========================================
CREATE TABLE IF NOT EXISTS legal_case_documents (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES legal_case_stages(id),
    timeline_event_id INTEGER REFERENCES legal_case_timeline_events(id),

    -- Tipo de documento
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        -- Laborales previos
        'employment_contract',   -- Contrato de trabajo
        'salary_receipt',        -- Recibo de sueldo
        'warning_letter',        -- Apercibimiento
        'suspension_letter',     -- Suspension
        'termination_letter',    -- Carta de despido
        'resignation_letter',    -- Renuncia

        -- Comunicaciones
        'carta_documento',       -- Carta documento
        'telegrama',             -- Telegrama colacionado
        'email_evidence',        -- Email como evidencia
        'internal_memo',         -- Memo interno

        -- Judiciales
        'demanda',               -- Escrito de demanda
        'contestacion',          -- Contestacion de demanda
        'prueba_documental',     -- Prueba documental
        'prueba_testimonial',    -- Acta prueba testimonial
        'prueba_pericial',       -- Informe pericial
        'alegato',               -- Alegato
        'sentencia',             -- Sentencia
        'recurso',               -- Recurso (apelacion, etc)
        'resolucion',            -- Resolucion judicial

        -- Mediacion
        'acta_mediacion',        -- Acta de mediacion
        'acuerdo_mediacion',     -- Acuerdo de mediacion

        -- Otros
        'medical_certificate',   -- Certificado medico
        'attendance_report',     -- Reporte de asistencia
        'witness_statement',     -- Declaracion testigo
        'photo_evidence',        -- Evidencia fotografica
        'video_evidence',        -- Evidencia en video
        'other'
    )),

    -- Archivo
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Metadata documento
    document_date DATE, -- Fecha del documento
    document_number VARCHAR(100), -- Numero/referencia del documento

    -- Descripcion
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Origen
    source VARCHAR(50) CHECK (source IN (
        'internal',      -- Generado internamente
        'employee',      -- Provisto por empleado
        'court',         -- Provisto por juzgado
        'opposing_party',-- Provisto por parte contraria
        'third_party',   -- Provisto por tercero
        'auto_generated' -- Generado automaticamente por sistema
    )),

    -- Estado
    is_confidential BOOLEAN DEFAULT FALSE,
    is_original BOOLEAN DEFAULT FALSE,
    is_certified BOOLEAN DEFAULT FALSE,

    -- Vinculacion con empleado 360
    from_employee_360 BOOLEAN DEFAULT FALSE, -- Importado del expediente 360
    original_table VARCHAR(100), -- Tabla origen si es de 360
    original_id INTEGER, -- ID en tabla origen

    -- Usuario
    uploaded_by UUID REFERENCES users(user_id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_docs_case ON legal_case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_docs_type ON legal_case_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_legal_docs_date ON legal_case_documents(document_date);

-- ===========================================
-- TABLA 5: legal_deadlines (Vencimientos)
-- ===========================================
CREATE TABLE IF NOT EXISTS legal_deadlines (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    stage_id INTEGER REFERENCES legal_case_stages(id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Tipo de vencimiento
    deadline_type VARCHAR(50) NOT NULL CHECK (deadline_type IN (
        'response_deadline',      -- Plazo para contestar
        'appeal_deadline',        -- Plazo para apelar
        'evidence_deadline',      -- Plazo probatorio
        'hearing_date',           -- Fecha de audiencia
        'payment_deadline',       -- Plazo de pago
        'filing_deadline',        -- Plazo para presentar escrito
        'prescription_date',      -- Fecha prescripcion
        'mediation_deadline',     -- Plazo mediacion
        'internal_review',        -- Revision interna
        'report_due',             -- Informe debido
        'custom'                  -- Personalizado
    )),

    -- Descripcion
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Fechas
    due_date TIMESTAMP NOT NULL,
    reminder_date TIMESTAMP, -- Cuando enviar recordatorio

    -- Dias de anticipacion para alertas
    alert_days_before INTEGER DEFAULT 3,

    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',    -- Pendiente
        'completed',  -- Completado
        'overdue',    -- Vencido
        'cancelled',  -- Cancelado
        'extended'    -- Extendido
    )),
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(user_id),

    -- Prioridad
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),

    -- Asignacion
    assigned_to UUID REFERENCES users(user_id), -- Responsable principal
    notify_users UUID[], -- Usuarios adicionales a notificar

    -- Integracion con notificaciones (SSOT)
    notification_id INTEGER, -- FK a notifications
    notification_group_id VARCHAR(100),
    notifications_sent JSONB DEFAULT '[]', -- Historial de notificaciones enviadas

    -- Recurrencia (opcional)
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- daily, weekly, monthly
    recurrence_end_date DATE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Usuario
    created_by UUID REFERENCES users(user_id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_deadlines_case ON legal_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_deadlines_due ON legal_deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_legal_deadlines_status ON legal_deadlines(status);
CREATE INDEX IF NOT EXISTS idx_legal_deadlines_assigned ON legal_deadlines(assigned_to);
CREATE INDEX IF NOT EXISTS idx_legal_deadlines_company ON legal_deadlines(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_deadlines_pending ON legal_deadlines(status, due_date) WHERE status = 'pending';

-- ===========================================
-- TABLA 6: legal_case_parties (Partes involucradas)
-- ===========================================
CREATE TABLE IF NOT EXISTS legal_case_parties (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,

    -- Tipo de parte
    party_type VARCHAR(30) NOT NULL CHECK (party_type IN (
        'plaintiff',     -- Demandante
        'defendant',     -- Demandado
        'witness',       -- Testigo
        'expert',        -- Perito
        'mediator',      -- Mediador
        'judge',         -- Juez
        'lawyer',        -- Abogado
        'union_rep',     -- Representante sindical
        'other'
    )),

    -- Datos de la parte
    name VARCHAR(255) NOT NULL,
    role_description VARCHAR(255),

    -- Contacto
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,

    -- Si es empleado interno
    is_internal BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES users(user_id),

    -- Notas
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_parties_case ON legal_case_parties(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_parties_type ON legal_case_parties(party_type);

-- ===========================================
-- TABLA 7: legal_ai_analysis (Analisis IA Ollama)
-- ===========================================
CREATE TABLE IF NOT EXISTS legal_ai_analysis (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES legal_cases(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Tipo de analisis
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN (
        'risk_assessment',       -- Evaluacion de riesgo
        'case_summary',          -- Resumen del caso
        'deadline_alert',        -- Alerta de vencimiento
        'pattern_detection',     -- Deteccion de patrones
        'recommendation',        -- Recomendacion
        'document_analysis',     -- Analisis de documento
        'precedent_search',      -- Busqueda de precedentes
        'exposure_calculation',  -- Calculo de exposicion
        'timeline_analysis',     -- Analisis de timeline
        'employee_history'       -- Analisis historial empleado
    )),

    -- Contenido
    prompt_used TEXT,
    analysis_result TEXT NOT NULL,
    confidence_score DECIMAL(3,2), -- 0.00 a 1.00

    -- Datos estructurados
    structured_data JSONB,

    -- Referencias
    related_deadline_id INTEGER REFERENCES legal_deadlines(id),
    related_document_id INTEGER REFERENCES legal_case_documents(id),

    -- Modelo usado
    model_used VARCHAR(50) DEFAULT 'llama3.1:8b',
    tokens_used INTEGER,
    processing_time_ms INTEGER,

    -- Estado
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_ai_case ON legal_ai_analysis(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_ai_type ON legal_ai_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_legal_ai_company ON legal_ai_analysis(company_id);

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Trigger para updated_at en legal_cases
CREATE OR REPLACE FUNCTION update_legal_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_cases_updated_at ON legal_cases;
CREATE TRIGGER trg_legal_cases_updated_at
    BEFORE UPDATE ON legal_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_legal_cases_updated_at();

-- Trigger para auto-generar case_number
CREATE OR REPLACE FUNCTION generate_legal_case_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str VARCHAR(4);
    seq_num INTEGER;
BEGIN
    IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
        year_str := TO_CHAR(NOW(), 'YYYY');

        SELECT COALESCE(MAX(
            CAST(SUBSTRING(case_number FROM 'LEG-' || year_str || '-(\d+)') AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM legal_cases
        WHERE company_id = NEW.company_id
          AND case_number LIKE 'LEG-' || year_str || '-%';

        NEW.case_number := 'LEG-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_case_number ON legal_cases;
CREATE TRIGGER trg_legal_case_number
    BEFORE INSERT ON legal_cases
    FOR EACH ROW
    EXECUTE FUNCTION generate_legal_case_number();

-- Trigger para crear evento en timeline al cambiar etapa
CREATE OR REPLACE FUNCTION log_legal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
        INSERT INTO legal_case_timeline_events (
            case_id, event_type, title, description, event_date,
            importance, is_milestone, created_by
        ) VALUES (
            NEW.id,
            'stage_change',
            'Cambio de etapa: ' || OLD.current_stage || ' -> ' || NEW.current_stage,
            'El caso paso de la etapa ' || OLD.current_stage || ' a ' || NEW.current_stage,
            NOW(),
            'high',
            TRUE,
            NEW.assigned_to
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_stage_change ON legal_cases;
CREATE TRIGGER trg_legal_stage_change
    AFTER UPDATE ON legal_cases
    FOR EACH ROW
    EXECUTE FUNCTION log_legal_stage_change();

-- ===========================================
-- FUNCIONES HELPER
-- ===========================================

-- Funcion para obtener resumen de caso
CREATE OR REPLACE FUNCTION get_legal_case_summary(p_case_id INTEGER)
RETURNS TABLE (
    case_id INTEGER,
    case_number VARCHAR,
    case_type VARCHAR,
    current_stage VARCHAR,
    employee_name VARCHAR,
    claimed_amount DECIMAL,
    days_open INTEGER,
    pending_deadlines BIGINT,
    total_documents BIGINT,
    last_event_date TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lc.id,
        lc.case_number,
        lc.case_type,
        lc.current_stage,
        lc.employee_name,
        lc.claimed_amount,
        EXTRACT(DAY FROM NOW() - lc.created_at)::INTEGER as days_open,
        (SELECT COUNT(*) FROM legal_deadlines ld WHERE ld.case_id = lc.id AND ld.status = 'pending'),
        (SELECT COUNT(*) FROM legal_case_documents lcd WHERE lcd.case_id = lc.id),
        (SELECT MAX(event_date) FROM legal_case_timeline_events lte WHERE lte.case_id = lc.id)
    FROM legal_cases lc
    WHERE lc.id = p_case_id;
END;
$$ LANGUAGE plpgsql;

-- Funcion para obtener vencimientos proximos
CREATE OR REPLACE FUNCTION get_upcoming_legal_deadlines(
    p_company_id INTEGER,
    p_days_ahead INTEGER DEFAULT 7,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    deadline_id INTEGER,
    case_id INTEGER,
    case_number VARCHAR,
    deadline_type VARCHAR,
    title VARCHAR,
    due_date TIMESTAMP,
    days_remaining INTEGER,
    priority VARCHAR,
    assigned_to UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ld.id,
        ld.case_id,
        lc.case_number,
        ld.deadline_type,
        ld.title,
        ld.due_date,
        EXTRACT(DAY FROM ld.due_date - NOW())::INTEGER as days_remaining,
        ld.priority,
        ld.assigned_to
    FROM legal_deadlines ld
    JOIN legal_cases lc ON ld.case_id = lc.id
    WHERE ld.company_id = p_company_id
      AND ld.status = 'pending'
      AND ld.due_date <= NOW() + (p_days_ahead || ' days')::INTERVAL
      AND (p_user_id IS NULL OR ld.assigned_to = p_user_id OR p_user_id = ANY(ld.notify_users))
    ORDER BY ld.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Funcion para estadisticas del dashboard
CREATE OR REPLACE FUNCTION get_legal_dashboard_stats(p_company_id INTEGER)
RETURNS TABLE (
    total_cases BIGINT,
    active_cases BIGINT,
    cases_by_stage JSONB,
    cases_by_type JSONB,
    pending_deadlines BIGINT,
    overdue_deadlines BIGINT,
    total_exposure DECIMAL,
    avg_case_duration_days NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM legal_cases WHERE company_id = p_company_id),
        (SELECT COUNT(*) FROM legal_cases WHERE company_id = p_company_id AND is_active = TRUE),
        (SELECT jsonb_object_agg(current_stage, cnt) FROM (
            SELECT current_stage, COUNT(*) as cnt
            FROM legal_cases WHERE company_id = p_company_id AND is_active = TRUE
            GROUP BY current_stage
        ) s),
        (SELECT jsonb_object_agg(case_type, cnt) FROM (
            SELECT case_type, COUNT(*) as cnt
            FROM legal_cases WHERE company_id = p_company_id
            GROUP BY case_type
        ) t),
        (SELECT COUNT(*) FROM legal_deadlines WHERE company_id = p_company_id AND status = 'pending'),
        (SELECT COUNT(*) FROM legal_deadlines WHERE company_id = p_company_id AND status = 'pending' AND due_date < NOW()),
        (SELECT COALESCE(SUM(estimated_exposure), 0) FROM legal_cases WHERE company_id = p_company_id AND is_active = TRUE),
        (SELECT AVG(EXTRACT(DAY FROM COALESCE(closed_at, NOW()) - created_at))
         FROM legal_cases WHERE company_id = p_company_id);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMENTARIOS
-- ===========================================
COMMENT ON TABLE legal_cases IS 'Expedientes legales - Demandas, reclamos, mediaciones';
COMMENT ON TABLE legal_case_stages IS 'Etapas del workflow legal: prejudicial -> mediacion -> judicial';
COMMENT ON TABLE legal_case_timeline_events IS 'Linea de tiempo de eventos del caso';
COMMENT ON TABLE legal_case_documents IS 'Documentos adjuntos al expediente legal';
COMMENT ON TABLE legal_deadlines IS 'Vencimientos y plazos procesales integrados con notificaciones';
COMMENT ON TABLE legal_case_parties IS 'Partes involucradas en el caso (testigos, peritos, etc)';
COMMENT ON TABLE legal_ai_analysis IS 'Analisis de IA (Ollama) sobre casos legales';

-- ===========================================
-- VERIFICACION FINAL
-- ===========================================
SELECT '✅ Migracion legal_workflow_complete ejecutada correctamente' as status;
