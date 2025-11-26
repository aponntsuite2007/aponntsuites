-- ============================================
-- MIGRACIÓN: Sistema de Roles Adicionales v1.0
-- Fecha: 2025-01-25
-- Descripción: Crea el sistema de roles adicionales internos
--              (bombero, capacitador, auditor, etc.)
-- ============================================

-- 1. CREAR TIPO ENUM PARA CATEGORÍAS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'additional_role_category') THEN
        CREATE TYPE additional_role_category AS ENUM (
            'seguridad',
            'salud',
            'capacitacion',
            'auditoria',
            'supervision',
            'representacion',
            'otros'
        );
    END IF;
END
$$;

-- 2. CREAR TABLA DE TIPOS DE ROLES ADICIONALES
CREATE TABLE IF NOT EXISTS additional_role_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key VARCHAR(50) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    category additional_role_category NOT NULL DEFAULT 'otros',
    icon VARCHAR(10) DEFAULT '🏷️',
    color VARCHAR(20) DEFAULT '#6c757d',
    requires_certification BOOLEAN DEFAULT false,
    certification_validity_months INTEGER DEFAULT 12,
    scoring_bonus DECIMAL(3,2) DEFAULT 0.05,
    required_training JSONB DEFAULT '[]'::jsonb,
    responsibilities JSONB DEFAULT '[]'::jsonb,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_key, company_id)
);

-- 3. AGREGAR COLUMNA additional_roles A USERS
ALTER TABLE users
ADD COLUMN IF NOT EXISTS additional_roles JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN users.additional_roles IS 'Roles adicionales internos del empleado (bombero, capacitador, auditor, etc.)';

-- 4. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_additional_role_types_company
ON additional_role_types(company_id);

CREATE INDEX IF NOT EXISTS idx_additional_role_types_category
ON additional_role_types(category);

CREATE INDEX IF NOT EXISTS idx_additional_role_types_active
ON additional_role_types(is_active);

-- Índice GIN para búsquedas en additional_roles de users
CREATE INDEX IF NOT EXISTS idx_users_additional_roles
ON users USING GIN(additional_roles);

-- 5. INSERTAR ROLES ADICIONALES GLOBALES (company_id = NULL)
INSERT INTO additional_role_types (role_key, role_name, description, category, icon, color, requires_certification, certification_validity_months, scoring_bonus, responsibilities)
VALUES
    -- SEGURIDAD
    ('bombero_interno', 'Bombero Interno', 'Personal capacitado en prevención y combate de incendios dentro de las instalaciones de la empresa', 'seguridad', '🧑‍🚒', '#dc3545', true, 12, 0.08, '["Prevención de incendios", "Uso de extintores", "Evacuación de emergencia", "Primeros auxilios básicos"]'::jsonb),
    ('brigadista', 'Brigadista de Emergencia', 'Miembro de la brigada de emergencias de la empresa', 'seguridad', '🦺', '#fd7e14', true, 12, 0.06, '["Coordinación de evacuaciones", "Primeros auxilios", "Control de emergencias", "Señalización de rutas"]'::jsonb),
    ('coordinador_evacuacion', 'Coordinador de Evacuación', 'Responsable de coordinar evacuaciones en su área/piso', 'seguridad', '🚨', '#e74c3c', true, 12, 0.05, '["Coordinar evacuación del área", "Verificar ausentes", "Guiar a punto de encuentro", "Reportar novedades"]'::jsonb),

    -- SALUD
    ('primeros_auxilios', 'Socorrista - Primeros Auxilios', 'Personal capacitado en primeros auxilios y atención de emergencias médicas', 'salud', '🩺', '#28a745', true, 24, 0.07, '["RCP", "Control de hemorragias", "Inmovilización", "Uso de DEA"]'::jsonb),
    ('auxiliar_medico', 'Auxiliar Médico Interno', 'Asistente del servicio médico de la empresa', 'salud', '⚕️', '#17a2b8', true, 12, 0.05, '["Asistir al médico laboral", "Control de signos vitales", "Administrar medicación básica", "Mantener botiquines"]'::jsonb),

    -- CAPACITACIÓN
    ('capacitador_interno', 'Capacitador Interno', 'Personal autorizado para dictar capacitaciones a otros empleados', 'capacitacion', '📚', '#6f42c1', true, 24, 0.10, '["Diseñar contenidos", "Dictar capacitaciones", "Evaluar aprendizaje", "Actualizar materiales"]'::jsonb),
    ('mentor', 'Mentor de Nuevos Ingresos', 'Encargado de guiar y acompañar a nuevos empleados en su proceso de inducción', 'capacitacion', '🎓', '#9b59b6', false, 0, 0.05, '["Acompañar nuevos ingresos", "Transmitir cultura organizacional", "Facilitar adaptación", "Evaluar período de prueba"]'::jsonb),
    ('instructor_seguridad', 'Instructor de Seguridad', 'Capacitador especializado en temas de seguridad e higiene', 'capacitacion', '🛡️', '#e67e22', true, 12, 0.08, '["Dictar capacitaciones de seguridad", "Evaluar conocimientos", "Actualizar procedimientos", "Realizar simulacros"]'::jsonb),

    -- AUDITORÍA
    ('auditor_interno', 'Auditor Interno', 'Personal capacitado para realizar auditorías internas de procesos y calidad', 'auditoria', '🔍', '#3498db', true, 24, 0.10, '["Realizar auditorías", "Documentar hallazgos", "Proponer mejoras", "Seguimiento de acciones correctivas"]'::jsonb),
    ('inspector_seguridad', 'Inspector de Seguridad', 'Encargado de inspecciones de seguridad e higiene en el trabajo', 'auditoria', '📋', '#f39c12', true, 12, 0.07, '["Inspeccionar instalaciones", "Verificar EPP", "Detectar riesgos", "Reportar incidentes"]'::jsonb),
    ('auditor_calidad', 'Auditor de Calidad', 'Personal capacitado en auditorías de sistemas de gestión de calidad', 'auditoria', '✅', '#27ae60', true, 36, 0.08, '["Auditorías ISO 9001", "Control de documentación", "Análisis de no conformidades", "Mejora continua"]'::jsonb),

    -- SUPERVISIÓN
    ('lider_equipo', 'Líder de Equipo', 'Coordinador de un equipo de trabajo específico', 'supervision', '👥', '#2c3e50', false, 0, 0.06, '["Coordinar equipo", "Distribuir tareas", "Supervisar calidad", "Resolver conflictos"]'::jsonb),
    ('coordinador_turno', 'Coordinador de Turno', 'Responsable de la operación durante su turno de trabajo', 'supervision', '⏰', '#34495e', false, 0, 0.07, '["Supervisar operaciones", "Resolver incidencias", "Autorizar permisos", "Reportar novedades"]'::jsonb),

    -- REPRESENTACIÓN
    ('delegado_sindical', 'Delegado Sindical', 'Representante gremial de los trabajadores', 'representacion', '🤝', '#8e44ad', false, 0, 0.03, '["Representar trabajadores", "Mediar conflictos", "Canalizar reclamos", "Participar en negociaciones"]'::jsonb),
    ('representante_cymat', 'Representante CyMAT', 'Representante en el Comité de Condiciones y Medio Ambiente de Trabajo', 'representacion', '🏛️', '#16a085', true, 24, 0.05, '["Participar en CyMAT", "Identificar riesgos", "Proponer mejoras", "Velar por condiciones laborales"]'::jsonb),

    -- OTROS
    ('responsable_ambiental', 'Responsable Ambiental', 'Encargado de temas medioambientales en su área', 'otros', '🌱', '#2ecc71', true, 12, 0.05, '["Gestión de residuos", "Eficiencia energética", "Cumplimiento ambiental", "Concientización"]'::jsonb),
    ('padrino_5s', 'Padrino 5S', 'Responsable de mantener y auditar el programa 5S en su área', 'otros', '🧹', '#1abc9c', true, 12, 0.04, '["Auditar área 5S", "Capacitar en metodología", "Mantener estándares", "Liderar mejoras"]'::jsonb)

ON CONFLICT (role_key, company_id) DO UPDATE
SET
    role_name = EXCLUDED.role_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    requires_certification = EXCLUDED.requires_certification,
    certification_validity_months = EXCLUDED.certification_validity_months,
    scoring_bonus = EXCLUDED.scoring_bonus,
    responsibilities = EXCLUDED.responsibilities,
    updated_at = NOW();

-- 6. VERIFICAR CREACIÓN
SELECT
    role_key,
    role_name,
    category,
    icon,
    scoring_bonus,
    requires_certification
FROM additional_role_types
WHERE company_id IS NULL
ORDER BY category, role_key;
