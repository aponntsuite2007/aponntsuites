-- =====================================================
-- MIGRACIÓN: Crear tabla additional_role_types
-- Fecha: 2025-01-30
-- Descripción: Tabla para tipos de roles adicionales
--              en la estructura organizacional
-- =====================================================

-- 1. Crear ENUM para categoría de roles (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_category_enum') THEN
        CREATE TYPE role_category_enum AS ENUM (
            'seguridad',
            'salud',
            'capacitacion',
            'auditoria',
            'supervision',
            'representacion',
            'otros'
        );
        RAISE NOTICE '✅ ENUM role_category_enum creado';
    ELSE
        RAISE NOTICE '⏭️ ENUM role_category_enum ya existe';
    END IF;
END$$;

-- 2. Crear tabla additional_role_types
CREATE TABLE IF NOT EXISTS additional_role_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación del rol
    role_key VARCHAR(50) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Categoría (usando el ENUM)
    category role_category_enum NOT NULL DEFAULT 'otros',

    -- Presentación visual
    icon VARCHAR(10) DEFAULT '🏷️',
    color VARCHAR(20) DEFAULT '#6c757d',

    -- Configuración de certificación
    requires_certification BOOLEAN DEFAULT false,
    certification_validity_months INTEGER DEFAULT 12,

    -- Scoring y gamificación
    scoring_bonus DECIMAL(3,2) DEFAULT 0.05,

    -- Datos estructurados
    required_training JSONB DEFAULT '[]'::jsonb,
    responsibilities JSONB DEFAULT '[]'::jsonb,

    -- Multi-tenant
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Auditoría
    created_by UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_additional_role_types_company
    ON additional_role_types(company_id);

CREATE INDEX IF NOT EXISTS idx_additional_role_types_category
    ON additional_role_types(category);

CREATE INDEX IF NOT EXISTS idx_additional_role_types_active
    ON additional_role_types(is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_additional_role_types_key_company
    ON additional_role_types(role_key, company_id)
    WHERE company_id IS NOT NULL;

-- 4. Comentarios de documentación
COMMENT ON TABLE additional_role_types IS 'Tipos de roles adicionales para estructura organizacional (delegados, brigadistas, etc.)';
COMMENT ON COLUMN additional_role_types.role_key IS 'Identificador único del tipo de rol (ej: delegado_gremial)';
COMMENT ON COLUMN additional_role_types.category IS 'Categoría del rol: seguridad, salud, capacitacion, auditoria, supervision, representacion, otros';
COMMENT ON COLUMN additional_role_types.scoring_bonus IS 'Bonus de scoring para gamificación (ej: 0.05 = 5%)';
COMMENT ON COLUMN additional_role_types.required_training IS 'Array JSON de capacitaciones requeridas';
COMMENT ON COLUMN additional_role_types.responsibilities IS 'Array JSON de responsabilidades del rol';

-- 5. Insertar roles por defecto del sistema (company_id = NULL para globales)
INSERT INTO additional_role_types (role_key, role_name, description, category, icon, color, requires_certification, certification_validity_months, scoring_bonus, required_training, responsibilities)
VALUES
    ('delegado_gremial', 'Delegado Gremial', 'Representante sindical de los trabajadores', 'representacion', '🤝', '#2196F3', false, NULL, 0.05, '[]'::jsonb, '["Representar intereses de trabajadores", "Participar en negociaciones colectivas", "Canalizar reclamos laborales"]'::jsonb),

    ('brigadista_emergencias', 'Brigadista de Emergencias', 'Miembro de brigada de emergencias y evacuación', 'seguridad', '🚒', '#F44336', true, 12, 0.08, '["Primeros auxilios", "Evacuación de emergencia", "Uso de extintores"]'::jsonb, '["Actuar en emergencias", "Guiar evacuaciones", "Primeros auxilios básicos"]'::jsonb),

    ('oficial_seguridad', 'Oficial de Seguridad e Higiene', 'Responsable de seguridad laboral', 'seguridad', '🛡️', '#FF9800', true, 24, 0.10, '["Seguridad e higiene laboral", "Identificación de riesgos"]'::jsonb, '["Inspecciones de seguridad", "Reportar condiciones inseguras", "Capacitar en seguridad"]'::jsonb),

    ('socorrista', 'Socorrista', 'Personal capacitado en primeros auxilios', 'salud', '⛑️', '#E91E63', true, 12, 0.07, '["RCP y DEA", "Primeros auxilios avanzados"]'::jsonb, '["Atención de emergencias médicas", "Uso de DEA", "Estabilización de pacientes"]'::jsonb),

    ('capacitador_interno', 'Capacitador Interno', 'Formador y entrenador de personal', 'capacitacion', '📚', '#9C27B0', false, NULL, 0.06, '["Técnicas de enseñanza", "Diseño instruccional"]'::jsonb, '["Diseñar capacitaciones", "Impartir cursos", "Evaluar aprendizaje"]'::jsonb),

    ('auditor_interno', 'Auditor Interno', 'Responsable de auditorías internas de procesos', 'auditoria', '🔍', '#607D8B', true, 24, 0.08, '["Auditoría de procesos", "Normas ISO"]'::jsonb, '["Realizar auditorías", "Documentar hallazgos", "Proponer mejoras"]'::jsonb),

    ('supervisor_turno', 'Supervisor de Turno', 'Encargado de supervisar operaciones del turno', 'supervision', '👔', '#3F51B5', false, NULL, 0.05, '[]'::jsonb, '["Coordinar equipo", "Resolver incidencias", "Reportar novedades"]'::jsonb),

    ('representante_comite', 'Representante de Comité', 'Miembro de comité mixto o paritario', 'representacion', '🏛️', '#00BCD4', false, NULL, 0.04, '[]'::jsonb, '["Participar en reuniones de comité", "Representar área/sector", "Votar decisiones"]'::jsonb)

ON CONFLICT DO NOTHING;

-- 6. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla additional_role_types creada exitosamente con % roles por defecto',
        (SELECT COUNT(*) FROM additional_role_types);
END$$;
