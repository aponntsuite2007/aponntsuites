-- ============================================================================
-- MIGRACIÓN: Sistema de Ayuda Unificado v1.0
-- ============================================================================
-- Integra tickets de soporte con el sistema de notificaciones central
-- Fecha: 2024-12-07
-- NOTA: Adaptada para trabajar con estructuras existentes
-- ============================================================================

-- 1. Agregar columnas de integración a support_tickets (si existe)
-- ============================================================================
DO $$
BEGIN
    -- Verificar si la tabla support_tickets existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
        -- Agregar columnas solo si no existen
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'thread_id') THEN
            ALTER TABLE support_tickets ADD COLUMN thread_id UUID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'notification_id') THEN
            ALTER TABLE support_tickets ADD COLUMN notification_id UUID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'rating') THEN
            ALTER TABLE support_tickets ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'feedback') THEN
            ALTER TABLE support_tickets ADD COLUMN feedback TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'closed_at') THEN
            ALTER TABLE support_tickets ADD COLUMN closed_at TIMESTAMPTZ;
        END IF;

        -- Crear índice
        CREATE INDEX IF NOT EXISTS idx_support_tickets_thread_id ON support_tickets(thread_id);
    ELSE
        -- Crear tabla support_tickets si no existe
        CREATE TABLE support_tickets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id INTEGER NOT NULL,
            user_id UUID NOT NULL,
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            category VARCHAR(50) DEFAULT 'general',
            priority VARCHAR(20) DEFAULT 'medium',
            status VARCHAR(20) DEFAULT 'open',
            thread_id UUID,
            notification_id UUID,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            feedback TEXT,
            closed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_thread_id ON support_tickets(thread_id);
    END IF;
END $$;

-- 2. Tabla de interacciones del centro de ayuda unificado
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_help_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('chat', 'ticket_created', 'ticket_reply', 'walkthrough', 'feedback')),

    -- Contenido
    question TEXT,
    answer TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_unified_help_user ON unified_help_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_help_company ON unified_help_interactions(company_id);
CREATE INDEX IF NOT EXISTS idx_unified_help_type ON unified_help_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_unified_help_created ON unified_help_interactions(created_at DESC);

-- 3. Agregar columnas a contextual_help existente para unificación
-- ============================================================================
DO $$
BEGIN
    -- Agregar columnas de quick_start y common_issues si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contextual_help' AND column_name = 'quick_start') THEN
        ALTER TABLE contextual_help ADD COLUMN quick_start TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contextual_help' AND column_name = 'common_issues') THEN
        ALTER TABLE contextual_help ADD COLUMN common_issues JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contextual_help' AND column_name = 'walkthrough_steps') THEN
        ALTER TABLE contextual_help ADD COLUMN walkthrough_steps JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contextual_help' AND column_name = 'documentation_url') THEN
        ALTER TABLE contextual_help ADD COLUMN documentation_url TEXT;
    END IF;
END $$;

-- 4. Insertar ayuda contextual base para módulos principales (usando columnas existentes)
-- ============================================================================
INSERT INTO contextual_help (module_key, title, content, quick_start, common_issues, walkthrough_steps, is_active)
VALUES
    ('users', 'Gestión de Usuarios',
     'Administra los empleados de tu empresa: altas, bajas, modificaciones y control de accesos.',
     'Para agregar un usuario, haz clic en "Agregar Usuario" y completa el formulario con los datos del empleado.',
     '[{"issue": "No puedo agregar usuarios", "solution": "Verifica que tengas permisos de administrador y que no hayas alcanzado el límite de empleados contratados."}]',
     '[{"step": 1, "title": "Acceder al módulo", "description": "Haz clic en Usuarios en el menú lateral"}, {"step": 2, "title": "Agregar empleado", "description": "Clic en el botón Agregar Usuario"}]',
     true),

    ('attendance', 'Control de Asistencia',
     'Monitorea los registros de entrada y salida de tus empleados en tiempo real.',
     'La asistencia se registra automáticamente desde los kioscos o la app móvil. Aquí puedes ver el historial y generar reportes.',
     '[{"issue": "No veo registros de hoy", "solution": "Verifica que los kioscos estén configurados correctamente y tengan conexión a internet."}]',
     '[{"step": 1, "title": "Ver registros", "description": "Accede a Control de Asistencia desde el menú"}, {"step": 2, "title": "Filtrar", "description": "Usa los filtros de fecha y empleado"}]',
     true),

    ('vacation-management', 'Gestión de Vacaciones',
     'Administra las solicitudes de vacaciones, licencias y permisos de los empleados.',
     'Los empleados solicitan vacaciones desde Mi Espacio. Aquí puedes aprobar o rechazar las solicitudes.',
     '[{"issue": "No puedo aprobar vacaciones", "solution": "Solo supervisores y RRHH pueden aprobar solicitudes. Verifica tu rol."}]',
     '[{"step": 1, "title": "Ver solicitudes", "description": "Accede a Gestión de Vacaciones"}, {"step": 2, "title": "Aprobar/Rechazar", "description": "Clic en la solicitud y selecciona la acción"}]',
     true),

    ('payroll-liquidation', 'Liquidación de Sueldos',
     'Calcula y genera las liquidaciones de sueldo mensuales de tus empleados.',
     'Selecciona el período y los empleados a liquidar, luego genera los recibos de sueldo.',
     '[{"issue": "Los cálculos no son correctos", "solution": "Verifica que los conceptos de nómina estén configurados correctamente en la parametrización."}]',
     '[{"step": 1, "title": "Seleccionar período", "description": "Elige mes y año"}, {"step": 2, "title": "Generar liquidación", "description": "Clic en Calcular y luego en Generar"}]',
     true),

    ('kiosks', 'Gestión de Kioscos',
     'Configura y monitorea los kioscos biométricos de registro de asistencia.',
     'Agrega kioscos, configura su ubicación GPS y monitorea su estado de conexión.',
     '[{"issue": "El kiosko aparece offline", "solution": "Verifica la conexión a internet del dispositivo y que la app esté actualizada."}]',
     '[{"step": 1, "title": "Agregar kiosko", "description": "Clic en Agregar Kiosko"}, {"step": 2, "title": "Configurar GPS", "description": "Ingresa latitud y longitud"}]',
     true)
ON CONFLICT DO NOTHING;

-- 5. Agregar columna feedback_text a knowledge base si existe
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assistant_knowledge_base') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assistant_knowledge_base' AND column_name = 'feedback_text') THEN
            ALTER TABLE assistant_knowledge_base ADD COLUMN feedback_text TEXT;
        END IF;
    END IF;
END $$;

-- 6. Crear función para búsqueda por similitud si pg_trgm está disponible
-- ============================================================================
DO $$
BEGIN
    -- Intentar crear extensión pg_trgm si no existe
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    -- Crear índice de similitud en knowledge base si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assistant_knowledge_base') THEN
        CREATE INDEX IF NOT EXISTS idx_kb_question_trgm
        ON assistant_knowledge_base
        USING gin (question gin_trgm_ops);
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm extension not available, skipping similarity index';
END $$;

-- 7. Vista para estadísticas del centro de ayuda
-- ============================================================================
CREATE OR REPLACE VIEW unified_help_stats AS
SELECT
    company_id,
    COUNT(*) FILTER (WHERE interaction_type = 'chat') as chat_count,
    COUNT(*) FILTER (WHERE interaction_type = 'ticket_created') as tickets_created,
    COUNT(*) FILTER (WHERE interaction_type = 'feedback' AND (metadata->>'isHelpful')::boolean = true) as positive_feedback,
    COUNT(*) FILTER (WHERE interaction_type = 'feedback' AND (metadata->>'isHelpful')::boolean = false) as negative_feedback,
    DATE_TRUNC('day', created_at) as day
FROM unified_help_interactions
GROUP BY company_id, DATE_TRUNC('day', created_at);

-- 8. Comentarios
-- ============================================================================
COMMENT ON TABLE unified_help_interactions IS 'Registro unificado de todas las interacciones del centro de ayuda';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
