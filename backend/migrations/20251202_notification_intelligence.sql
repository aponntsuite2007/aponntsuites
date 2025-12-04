-- ============================================================================
-- MIGRATION: Sistema de Inteligencia de Notificaciones con Ollama
-- Fecha: 2025-12-02
-- Descripción: Tablas para almacenar respuestas aprendidas, análisis de hilos,
--              sugerencias automáticas y patrones de Q&A
-- ============================================================================

-- 1. Tabla de respuestas aprendidas (Q&A Knowledge Base para notificaciones)
CREATE TABLE IF NOT EXISTS notification_learned_responses (
    id SERIAL PRIMARY KEY,

    -- Categorización
    category VARCHAR(100) NOT NULL,           -- 'vacation', 'documents', 'attendance', 'payroll', etc.
    subcategory VARCHAR(100),                 -- 'school_certificate', 'medical_leave', etc.
    department VARCHAR(100),                  -- 'rrhh', 'admin', 'supervisor', etc.

    -- La pregunta/patrón
    question_pattern TEXT NOT NULL,           -- Pregunta original normalizada
    question_keywords TEXT[],                 -- Palabras clave extraídas ["certificado", "escolaridad", "fecha"]
    question_embedding VECTOR(384),           -- Embedding para búsqueda semántica (si usamos pgvector)

    -- La respuesta aprendida
    answer_content TEXT NOT NULL,             -- Respuesta completa
    answer_summary VARCHAR(500),              -- Resumen corto de la respuesta
    answer_metadata JSONB DEFAULT '{}',       -- Datos estructurados (fechas, montos, etc.)

    -- Fuente y validación
    source_message_id UUID,                   -- Mensaje original de donde se aprendió
    source_group_id UUID,                     -- Grupo/hilo original
    learned_from_employee_id VARCHAR(100),    -- Quién hizo la pregunta original
    answered_by_employee_id VARCHAR(100),     -- Quién dio la respuesta
    answered_by_role VARCHAR(50),             -- Rol de quien respondió (para dar peso)

    -- Validez temporal
    valid_from DATE,                          -- Desde cuándo es válida
    valid_until DATE,                         -- Hasta cuándo es válida (para respuestas con fecha límite)
    is_temporal BOOLEAN DEFAULT FALSE,        -- TRUE si tiene vigencia temporal

    -- Uso y confianza
    times_suggested INTEGER DEFAULT 0,        -- Cuántas veces se sugirió
    times_accepted INTEGER DEFAULT 0,         -- Cuántas veces fue aceptada
    times_rejected INTEGER DEFAULT 0,         -- Cuántas veces fue rechazada
    confidence_score DECIMAL(5,4) DEFAULT 0.5, -- 0.0000 a 1.0000

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,        -- TRUE si RRHH/admin verificó la respuesta
    verified_by VARCHAR(100),
    verified_at TIMESTAMP,

    -- Multi-tenant
    company_id INTEGER,                       -- NULL = global, INTEGER = específico de empresa

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_learned_responses_category ON notification_learned_responses(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_learned_responses_keywords ON notification_learned_responses USING GIN(question_keywords);
CREATE INDEX IF NOT EXISTS idx_learned_responses_company ON notification_learned_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_learned_responses_confidence ON notification_learned_responses(confidence_score DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_learned_responses_temporal ON notification_learned_responses(valid_until) WHERE is_temporal = TRUE;

-- Comentarios
COMMENT ON TABLE notification_learned_responses IS 'Base de conocimiento de Q&A aprendidas de notificaciones anteriores';
COMMENT ON COLUMN notification_learned_responses.question_pattern IS 'Pregunta normalizada para matching';
COMMENT ON COLUMN notification_learned_responses.confidence_score IS 'Score de confianza basado en aceptación (times_accepted/times_suggested)';

-- 2. Tabla de análisis de hilos de notificación
CREATE TABLE IF NOT EXISTS notification_thread_analysis (
    id SERIAL PRIMARY KEY,

    -- Referencia al hilo
    group_id UUID NOT NULL,
    company_id INTEGER NOT NULL,

    -- Análisis del hilo
    thread_summary TEXT,                      -- Resumen generado por Ollama
    detected_intent VARCHAR(100),             -- 'question', 'request', 'complaint', 'info', etc.
    detected_topic VARCHAR(100),              -- Tema detectado
    detected_urgency VARCHAR(20),             -- 'low', 'medium', 'high', 'critical'
    detected_sentiment VARCHAR(20),           -- 'positive', 'neutral', 'negative', 'frustrated'

    -- Estado de resolución detectado
    is_resolved BOOLEAN DEFAULT FALSE,        -- Si Ollama detecta que ya fue resuelto
    resolution_message_id UUID,               -- Mensaje que contiene la resolución
    resolution_summary TEXT,                  -- Resumen de la resolución

    -- Anomalías detectadas
    has_anomalies BOOLEAN DEFAULT FALSE,
    anomalies JSONB DEFAULT '[]',             -- ["duplicate_question", "conflicting_info", etc.]

    -- Sugerencias pendientes
    pending_suggestions JSONB DEFAULT '[]',   -- Sugerencias que Ollama quiere hacer

    -- Timestamps de análisis
    last_analyzed_at TIMESTAMP DEFAULT NOW(),
    last_message_analyzed_id UUID,
    analysis_version INTEGER DEFAULT 1,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_analysis_group ON notification_thread_analysis(group_id);
CREATE INDEX IF NOT EXISTS idx_thread_analysis_company ON notification_thread_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_thread_analysis_unresolved ON notification_thread_analysis(is_resolved) WHERE is_resolved = FALSE;

COMMENT ON TABLE notification_thread_analysis IS 'Análisis inteligente de hilos de notificación por Ollama';

-- 3. Tabla de sugerencias automáticas de respuesta
CREATE TABLE IF NOT EXISTS notification_ai_suggestions (
    id SERIAL PRIMARY KEY,

    -- Contexto
    trigger_message_id UUID NOT NULL,         -- Mensaje que disparó la sugerencia
    group_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    recipient_id VARCHAR(100),                -- A quién se le sugiere

    -- La sugerencia
    suggestion_type VARCHAR(50) NOT NULL,     -- 'auto_response', 'similar_qa', 'knowledge_base', 'reminder'
    suggested_response TEXT NOT NULL,         -- Respuesta sugerida
    confidence DECIMAL(5,4) NOT NULL,         -- Confianza de la sugerencia

    -- Fuente de la sugerencia
    source_type VARCHAR(50),                  -- 'learned_response', 'similar_thread', 'policy', 'ollama_generated'
    source_id INTEGER,                        -- ID de notification_learned_responses si aplica
    source_thread_id UUID,                    -- ID de hilo similar si aplica

    -- Explicación para el usuario
    explanation TEXT,                         -- "Esta respuesta se basa en una consulta similar de Juan..."

    -- Estado de la sugerencia
    status VARCHAR(20) DEFAULT 'pending',     -- 'pending', 'accepted', 'rejected', 'modified', 'expired'
    user_response TEXT,                       -- Si el usuario modificó la respuesta

    -- Feedback
    feedback_rating INTEGER,                  -- 1-5 estrellas
    feedback_comment TEXT,

    -- Si fue aplicada automáticamente
    auto_applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP,
    applied_message_id UUID,                  -- Mensaje creado con la respuesta

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,                     -- Cuándo expira la sugerencia
    responded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_message ON notification_ai_suggestions(trigger_message_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_group ON notification_ai_suggestions(group_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_pending ON notification_ai_suggestions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_recipient ON notification_ai_suggestions(recipient_id);

COMMENT ON TABLE notification_ai_suggestions IS 'Sugerencias de respuesta generadas por IA para notificaciones';

-- 4. Tabla de patrones de preguntas frecuentes detectados
CREATE TABLE IF NOT EXISTS notification_faq_patterns (
    id SERIAL PRIMARY KEY,

    -- El patrón
    pattern_name VARCHAR(200) NOT NULL,
    pattern_description TEXT,
    category VARCHAR(100) NOT NULL,

    -- Detección
    regex_pattern TEXT,                       -- Regex para detectar
    keyword_patterns TEXT[],                  -- Palabras clave
    semantic_pattern TEXT,                    -- Descripción semántica para Ollama

    -- Respuesta estándar
    standard_response TEXT,                   -- Respuesta estándar aprobada
    response_variables JSONB DEFAULT '{}',   -- Variables que deben completarse {"deadline": "date", "amount": "number"}

    -- Configuración
    auto_respond BOOLEAN DEFAULT FALSE,       -- TRUE = responder automáticamente
    require_confirmation BOOLEAN DEFAULT TRUE, -- Pedir confirmación antes de enviar
    notify_original_recipient BOOLEAN DEFAULT TRUE, -- Notificar también al destinatario original

    -- Uso
    times_matched INTEGER DEFAULT 0,
    last_matched_at TIMESTAMP,

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    company_id INTEGER,                       -- NULL = global
    created_by VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faq_patterns_category ON notification_faq_patterns(category);
CREATE INDEX IF NOT EXISTS idx_faq_patterns_active ON notification_faq_patterns(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE notification_faq_patterns IS 'Patrones FAQ configurables para respuestas automáticas';

-- 5. Agregar campos a notification_messages para tracking de IA
ALTER TABLE notification_messages
ADD COLUMN IF NOT EXISTS ai_analyzed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_suggested_response_id INTEGER,
ADD COLUMN IF NOT EXISTS ai_auto_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS ai_source_type VARCHAR(50);

COMMENT ON COLUMN notification_messages.ai_analyzed IS 'TRUE si el mensaje fue analizado por Ollama';
COMMENT ON COLUMN notification_messages.ai_auto_generated IS 'TRUE si el mensaje fue generado automáticamente por IA';
COMMENT ON COLUMN notification_messages.ai_confidence IS 'Confianza de la IA en la respuesta generada';

-- 6. Agregar campos a notification_groups para tracking de análisis
ALTER TABLE notification_groups
ADD COLUMN IF NOT EXISTS ai_last_analyzed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_resolution_status VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS ai_detected_topic VARCHAR(100),
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

COMMENT ON COLUMN notification_groups.ai_resolution_status IS 'Estado de resolución detectado por IA: unknown, pending, resolved, needs_human';

-- 7. Función para calcular confianza de una respuesta aprendida
CREATE OR REPLACE FUNCTION calculate_response_confidence(
    p_times_suggested INTEGER,
    p_times_accepted INTEGER,
    p_times_rejected INTEGER,
    p_is_verified BOOLEAN
) RETURNS DECIMAL(5,4) AS $$
DECLARE
    base_confidence DECIMAL(5,4);
    acceptance_rate DECIMAL(5,4);
    verification_bonus DECIMAL(5,4);
BEGIN
    -- Si no hay sugerencias, confianza base
    IF p_times_suggested = 0 THEN
        RETURN CASE WHEN p_is_verified THEN 0.8000 ELSE 0.5000 END;
    END IF;

    -- Calcular tasa de aceptación
    acceptance_rate := p_times_accepted::DECIMAL / p_times_suggested::DECIMAL;

    -- Bonus por verificación
    verification_bonus := CASE WHEN p_is_verified THEN 0.1500 ELSE 0.0000 END;

    -- Calcular confianza final (máximo 0.9999)
    base_confidence := LEAST(acceptance_rate + verification_bonus, 0.9999);

    -- Penalizar si hay muchos rechazos
    IF p_times_rejected > p_times_accepted THEN
        base_confidence := base_confidence * 0.7;
    END IF;

    RETURN GREATEST(base_confidence, 0.1000); -- Mínimo 0.1
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para actualizar confianza automáticamente
CREATE OR REPLACE FUNCTION update_response_confidence()
RETURNS TRIGGER AS $$
BEGIN
    NEW.confidence_score := calculate_response_confidence(
        NEW.times_suggested,
        NEW.times_accepted,
        NEW.times_rejected,
        NEW.is_verified
    );
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_response_confidence ON notification_learned_responses;
CREATE TRIGGER trg_update_response_confidence
    BEFORE UPDATE ON notification_learned_responses
    FOR EACH ROW
    WHEN (OLD.times_suggested IS DISTINCT FROM NEW.times_suggested OR
          OLD.times_accepted IS DISTINCT FROM NEW.times_accepted OR
          OLD.times_rejected IS DISTINCT FROM NEW.times_rejected OR
          OLD.is_verified IS DISTINCT FROM NEW.is_verified)
    EXECUTE FUNCTION update_response_confidence();

-- 9. Función para buscar respuestas similares
CREATE OR REPLACE FUNCTION find_similar_responses(
    p_question TEXT,
    p_category VARCHAR(100) DEFAULT NULL,
    p_company_id INTEGER DEFAULT NULL,
    p_min_confidence DECIMAL DEFAULT 0.4,
    p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
    response_id INTEGER,
    question_pattern TEXT,
    answer_content TEXT,
    answer_summary VARCHAR(500),
    confidence_score DECIMAL,
    category VARCHAR(100),
    times_used INTEGER,
    is_verified BOOLEAN,
    similarity_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lr.id as response_id,
        lr.question_pattern,
        lr.answer_content,
        lr.answer_summary,
        lr.confidence_score,
        lr.category,
        (lr.times_accepted) as times_used,
        lr.is_verified,
        -- Similarity score básico basado en palabras clave
        (
            SELECT COUNT(*)::DECIMAL / GREATEST(array_length(lr.question_keywords, 1), 1)
            FROM unnest(lr.question_keywords) kw
            WHERE p_question ILIKE '%' || kw || '%'
        ) as similarity_score
    FROM notification_learned_responses lr
    WHERE lr.is_active = TRUE
      AND lr.confidence_score >= p_min_confidence
      AND (p_category IS NULL OR lr.category = p_category)
      AND (p_company_id IS NULL OR lr.company_id IS NULL OR lr.company_id = p_company_id)
      AND (lr.is_temporal = FALSE OR lr.valid_until IS NULL OR lr.valid_until >= CURRENT_DATE)
    ORDER BY
        -- Priorizar matches de keywords
        (
            SELECT COUNT(*)
            FROM unnest(lr.question_keywords) kw
            WHERE p_question ILIKE '%' || kw || '%'
        ) DESC,
        lr.confidence_score DESC,
        lr.times_accepted DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 10. Insertar algunos patrones FAQ iniciales
INSERT INTO notification_faq_patterns (pattern_name, category, keyword_patterns, standard_response, auto_respond, require_confirmation, company_id)
VALUES
    ('Fecha límite certificado escolaridad', 'documents',
     ARRAY['certificado', 'escolaridad', 'fecha', 'límite', 'plazo', 'tiempo'],
     'El plazo para presentar el certificado de escolaridad es hasta el {deadline}. Por favor, asegúrese de presentarlo antes de esa fecha para evitar inconvenientes.',
     FALSE, TRUE, NULL),

    ('Consulta días de vacaciones', 'vacation',
     ARRAY['vacaciones', 'días', 'cuántos', 'disponibles', 'tengo'],
     'Según nuestros registros, usted tiene {days_available} días de vacaciones disponibles. Para solicitarlas, utilice el módulo de Gestión de Vacaciones.',
     FALSE, TRUE, NULL),

    ('Horario de atención RRHH', 'general',
     ARRAY['horario', 'atención', 'rrhh', 'recursos humanos', 'oficina'],
     'El horario de atención de Recursos Humanos es de Lunes a Viernes de 9:00 a 18:00 hs. Para consultas urgentes fuera de horario, puede escribir a rrhh@empresa.com',
     TRUE, FALSE, NULL),

    ('Solicitud de recibo de sueldo', 'payroll',
     ARRAY['recibo', 'sueldo', 'pago', 'liquidación', 'descargar'],
     'Puede descargar su recibo de sueldo desde el módulo de Nómina/Liquidación en su panel de empleado. Si tiene problemas para acceder, contacte a soporte técnico.',
     TRUE, FALSE, NULL),

    ('Procedimiento licencia médica', 'medical',
     ARRAY['licencia', 'médica', 'enfermedad', 'certificado médico', 'ausencia'],
     'Para solicitar licencia médica: 1) Notifique a su supervisor inmediato. 2) Presente el certificado médico dentro de las 48hs. 3) El certificado debe indicar diagnóstico y días de reposo. 4) Suba el documento al sistema en el módulo de Ausencias.',
     FALSE, TRUE, NULL)
ON CONFLICT DO NOTHING;

-- Mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE 'Migración de Sistema de Inteligencia de Notificaciones completada exitosamente';
END $$;
