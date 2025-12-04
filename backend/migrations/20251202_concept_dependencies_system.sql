-- ============================================================================
-- SISTEMA DE DEPENDENCIAS DE CONCEPTOS (Multi-Tenant)
-- Permite vincular conceptos de liquidación con condiciones/documentos
-- 100% agnóstico de país - cada empresa configura sus propias dependencias
-- ============================================================================
-- Fecha: 2024-12-02
-- Autor: Claude AI
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TIPOS DE DEPENDENCIA (Genéricos del sistema)
-- Solo 4 tipos base, el resto lo configura cada empresa
-- ============================================================================

CREATE TABLE IF NOT EXISTS dependency_types (
    id SERIAL PRIMARY KEY,

    -- Identificación
    type_code VARCHAR(30) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    type_name_i18n JSONB DEFAULT '{}',  -- {"es": "...", "en": "...", "pt": "..."}
    description TEXT,
    icon VARCHAR(50) DEFAULT 'file-text',
    color_hex VARCHAR(7) DEFAULT '#6c757d',

    -- Comportamiento del tipo
    requires_expiration BOOLEAN DEFAULT true,    -- ¿Tiene fecha de vencimiento?
    requires_file BOOLEAN DEFAULT false,         -- ¿Requiere archivo adjunto?
    requires_family_member BOOLEAN DEFAULT false, -- ¿Se asocia a familiar?

    -- Control
    is_system BOOLEAN DEFAULT false,  -- TRUE = tipo del sistema, no se puede eliminar
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar tipos base del sistema
INSERT INTO dependency_types (type_code, type_name, type_name_i18n, description, icon, requires_expiration, requires_file, requires_family_member, is_system, display_order) VALUES
('DOCUMENT_VALID', 'Documento con Vigencia',
 '{"es": "Documento con Vigencia", "en": "Valid Document", "pt": "Documento Válido"}',
 'Documento que debe estar vigente para que se aplique el concepto (certificados, constancias, etc.)',
 'file-check', true, true, true, true, 1),

('ATTENDANCE_RULE', 'Regla de Asistencia',
 '{"es": "Regla de Asistencia", "en": "Attendance Rule", "pt": "Regra de Presença"}',
 'Condición basada en asistencia (presentismo, puntualidad, etc.)',
 'clock', false, false, false, true, 2),

('FAMILY_CONDITION', 'Condición Familiar',
 '{"es": "Condición Familiar", "en": "Family Condition", "pt": "Condição Familiar"}',
 'Condición basada en composición familiar (cantidad de hijos, estado civil, etc.)',
 'users', false, false, false, true, 3),

('CUSTOM_FORMULA', 'Fórmula Personalizada',
 '{"es": "Fórmula Personalizada", "en": "Custom Formula", "pt": "Fórmula Personalizada"}',
 'Condición evaluada mediante fórmula personalizada',
 'function-square', false, false, false, true, 4)
ON CONFLICT (type_code) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_dependency_types_code ON dependency_types(type_code);
CREATE INDEX IF NOT EXISTS idx_dependency_types_active ON dependency_types(is_active);


-- ============================================================================
-- 2. DEPENDENCIAS DEFINIDAS POR EMPRESA (Multi-Tenant)
-- Cada empresa crea sus propias dependencias
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_dependencies (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Identificación
    dependency_code VARCHAR(50) NOT NULL,
    dependency_name VARCHAR(150) NOT NULL,
    dependency_name_i18n JSONB DEFAULT '{}',
    description TEXT,

    -- Tipo base (FK a dependency_types)
    dependency_type_id INT NOT NULL REFERENCES dependency_types(id),

    -- Configuración según el tipo (JSONB flexible)
    config JSONB DEFAULT '{}',
    /*
      Para DOCUMENT_VALID:
      {
        "validity_period": "ANNUAL",        -- ANNUAL, SEMESTER, QUARTERLY, MONTHLY, CUSTOM
        "validity_months": 12,              -- Si es CUSTOM
        "renewal_window_days": 30,          -- Días antes del vencimiento para avisar
        "notification_days": [30, 15, 7, 1],-- Cuándo notificar
        "requires_file": true,
        "allowed_extensions": ["pdf", "jpg", "png"],
        "max_file_size_mb": 5,
        "applies_to": "FAMILY_MEMBER",      -- SELF, FAMILY_MEMBER, ANY
        "family_member_filter": {
          "types": ["CHILD", "SPOUSE"],     -- Tipos de familiar
          "age_min": 4,                     -- Edad mínima (NULL = sin límite)
          "age_max": 18,                    -- Edad máxima (NULL = sin límite)
          "must_be_dependent": true         -- Solo si es dependiente
        }
      }

      Para ATTENDANCE_RULE:
      {
        "period": "CURRENT_MONTH",          -- CURRENT_MONTH, PREVIOUS_MONTH, CURRENT_YEAR
        "max_absences": 0,                  -- Máximo de faltas permitidas
        "max_tardiness": 0,                 -- Máximo de llegadas tarde
        "max_early_leaves": 0,              -- Máximo de salidas anticipadas
        "exclude_justified": true,          -- No contar justificadas
        "min_worked_days_pct": 100          -- % mínimo de días trabajados
      }

      Para FAMILY_CONDITION:
      {
        "min_children": 1,
        "max_children": null,
        "min_dependents": 0,
        "requires_spouse": false,
        "child_age_min": null,
        "child_age_max": null
      }

      Para CUSTOM_FORMULA:
      {
        "formula": "{children_with_valid_cert} > 0",
        "variables": ["children_count", "dependents_count", "worked_days", "absences"]
      }
    */

    -- UI
    icon VARCHAR(50),
    color_hex VARCHAR(7),
    display_order INT DEFAULT 0,

    -- Control
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),

    -- Unique por empresa
    CONSTRAINT uq_company_dependency_code UNIQUE (company_id, dependency_code)
);

-- Índices para multi-tenant
CREATE INDEX IF NOT EXISTS idx_company_dependencies_company ON company_dependencies(company_id);
CREATE INDEX IF NOT EXISTS idx_company_dependencies_type ON company_dependencies(dependency_type_id);
CREATE INDEX IF NOT EXISTS idx_company_dependencies_active ON company_dependencies(company_id, is_active);


-- ============================================================================
-- 3. VINCULACIÓN CONCEPTO ↔ DEPENDENCIA
-- Un concepto de liquidación puede tener múltiples dependencias
-- ============================================================================

CREATE TABLE IF NOT EXISTS concept_dependencies (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- El concepto de liquidación
    concept_id INT NOT NULL REFERENCES payroll_template_concepts(id) ON DELETE CASCADE,

    -- La dependencia que debe cumplir
    dependency_id INT NOT NULL REFERENCES company_dependencies(id) ON DELETE CASCADE,

    -- Comportamiento si NO se cumple la dependencia
    on_failure VARCHAR(20) DEFAULT 'SKIP' CHECK (on_failure IN ('SKIP', 'REDUCE_PROPORTIONAL', 'WARN_ONLY')),
    -- SKIP = No aplicar el concepto
    -- REDUCE_PROPORTIONAL = Reducir proporcionalmente (ej: $X por cada hijo que cumple)
    -- WARN_ONLY = Aplicar pero generar advertencia

    failure_message VARCHAR(255),  -- "Falta {dependency_name} para {family_member}"

    -- Multiplicador (para conceptos que dependen de cantidad)
    multiplier_mode VARCHAR(20) DEFAULT 'NONE' CHECK (multiplier_mode IN ('NONE', 'PER_VALID', 'FIXED')),
    -- NONE = Se aplica o no (binario)
    -- PER_VALID = Monto × cantidad que cumplen (ej: $15000 × 2 hijos con certificado)
    -- FIXED = Monto fijo si al menos uno cumple

    -- Orden de evaluación (menor = primero)
    evaluation_order INT DEFAULT 0,

    -- Control
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique: un concepto no puede tener la misma dependencia dos veces
    CONSTRAINT uq_concept_dependency UNIQUE (concept_id, dependency_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_concept_dependencies_company ON concept_dependencies(company_id);
CREATE INDEX IF NOT EXISTS idx_concept_dependencies_concept ON concept_dependencies(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_dependencies_dependency ON concept_dependencies(dependency_id);


-- ============================================================================
-- 4. DOCUMENTOS DEL EMPLEADO (Satisfacen dependencias tipo DOCUMENT_VALID)
-- Multi-tenant: cada empresa ve solo sus documentos
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_dependency_documents (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Qué dependencia satisface este documento
    dependency_id INT NOT NULL REFERENCES company_dependencies(id) ON DELETE CASCADE,

    -- A quién aplica (si es documento de familiar)
    family_member_type VARCHAR(20) CHECK (family_member_type IN ('SELF', 'CHILD', 'SPOUSE', 'OTHER')),
    family_member_id INT,          -- FK a user_children o user_family_members según type
    family_member_name VARCHAR(150),  -- Denormalizado para histórico/reportes

    -- Vigencia
    issue_date DATE NOT NULL,
    expiration_date DATE,          -- NULL si el documento no vence

    -- Archivo adjunto
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size INT,                 -- En bytes
    file_mime_type VARCHAR(100),

    -- Estado (calculado automáticamente por trigger/job)
    status VARCHAR(20) DEFAULT 'VALID' CHECK (status IN ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'PENDING_REVIEW')),
    days_until_expiration INT,     -- Calculado: NULL si no vence

    -- Reemplazo (para histórico)
    replaced_by_id INT REFERENCES employee_dependency_documents(id),
    is_current BOOLEAN DEFAULT true,  -- FALSE si fue reemplazado

    -- Auditoría
    notes TEXT,
    uploaded_by UUID REFERENCES users(user_id),
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para multi-tenant y búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_emp_dep_docs_company ON employee_dependency_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_emp_dep_docs_user ON employee_dependency_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_dep_docs_dependency ON employee_dependency_documents(dependency_id);
CREATE INDEX IF NOT EXISTS idx_emp_dep_docs_status ON employee_dependency_documents(status);
CREATE INDEX IF NOT EXISTS idx_emp_dep_docs_expiration ON employee_dependency_documents(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emp_dep_docs_current ON employee_dependency_documents(user_id, dependency_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_emp_dep_docs_family ON employee_dependency_documents(family_member_type, family_member_id);


-- ============================================================================
-- 5. HISTORIAL DE EVALUACIÓN DE DEPENDENCIAS (Auditoría)
-- Registra cada evaluación durante liquidación
-- ============================================================================

CREATE TABLE IF NOT EXISTS dependency_evaluations (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Contexto de la liquidación
    payroll_run_id INT,            -- FK a payroll_runs cuando exista
    payroll_period VARCHAR(20),    -- '2024-12' formato YYYY-MM
    user_id UUID NOT NULL REFERENCES users(user_id),

    -- Qué se evaluó
    concept_id INT NOT NULL REFERENCES payroll_template_concepts(id),
    dependency_id INT NOT NULL REFERENCES company_dependencies(id),

    -- Resultado
    evaluation_result BOOLEAN NOT NULL,  -- TRUE = cumple, FALSE = no cumple
    evaluation_details JSONB DEFAULT '{}',
    /*
      {
        "evaluated_at": "2024-12-02T10:30:00Z",
        "dependency_type": "DOCUMENT_VALID",
        "family_members_evaluated": [
          {"name": "María García", "type": "CHILD", "age": 8, "has_valid_doc": true},
          {"name": "Juan García", "type": "CHILD", "age": 12, "has_valid_doc": false, "reason": "Documento vencido 2024-11-15"}
        ],
        "valid_count": 1,
        "invalid_count": 1,
        "documents_found": [123, 124]
      }
    */

    -- Acción tomada
    action_taken VARCHAR(20) CHECK (action_taken IN ('APPLIED', 'SKIPPED', 'REDUCED', 'WARNED')),
    original_amount DECIMAL(15,2),  -- Monto original del concepto
    final_amount DECIMAL(15,2),     -- Monto después de aplicar dependencias
    reduction_reason TEXT,          -- Si hubo reducción, por qué

    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_dep_evaluations_company ON dependency_evaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_dep_evaluations_user ON dependency_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_dep_evaluations_period ON dependency_evaluations(payroll_period);
CREATE INDEX IF NOT EXISTS idx_dep_evaluations_concept ON dependency_evaluations(concept_id);
CREATE INDEX IF NOT EXISTS idx_dep_evaluations_run ON dependency_evaluations(payroll_run_id) WHERE payroll_run_id IS NOT NULL;


-- ============================================================================
-- 6. FUNCIONES HELPER
-- ============================================================================

-- Función para actualizar status de documentos según vencimiento
CREATE OR REPLACE FUNCTION update_document_expiration_status()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Actualizar documentos que vencieron
    UPDATE employee_dependency_documents
    SET
        status = 'EXPIRED',
        days_until_expiration = DATE_PART('day', expiration_date - CURRENT_DATE)::INT,
        updated_at = CURRENT_TIMESTAMP
    WHERE expiration_date IS NOT NULL
      AND expiration_date < CURRENT_DATE
      AND status != 'EXPIRED'
      AND is_current = true;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    -- Actualizar documentos próximos a vencer (30 días)
    UPDATE employee_dependency_documents
    SET
        status = 'EXPIRING_SOON',
        days_until_expiration = DATE_PART('day', expiration_date - CURRENT_DATE)::INT,
        updated_at = CURRENT_TIMESTAMP
    WHERE expiration_date IS NOT NULL
      AND expiration_date >= CURRENT_DATE
      AND expiration_date <= CURRENT_DATE + INTERVAL '30 days'
      AND status NOT IN ('EXPIRED', 'EXPIRING_SOON')
      AND is_current = true;

    -- Actualizar días hasta vencimiento para todos
    UPDATE employee_dependency_documents
    SET days_until_expiration = DATE_PART('day', expiration_date - CURRENT_DATE)::INT
    WHERE expiration_date IS NOT NULL
      AND is_current = true;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener documentos vigentes de un empleado por dependencia
CREATE OR REPLACE FUNCTION get_valid_documents_for_dependency(
    p_user_id UUID,
    p_dependency_id INT,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    document_id INT,
    family_member_type VARCHAR,
    family_member_id INT,
    family_member_name VARCHAR,
    issue_date DATE,
    expiration_date DATE,
    status VARCHAR,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        edd.id as document_id,
        edd.family_member_type,
        edd.family_member_id,
        edd.family_member_name,
        edd.issue_date,
        edd.expiration_date,
        edd.status,
        (edd.expiration_date IS NULL OR edd.expiration_date >= p_as_of_date) as is_valid
    FROM employee_dependency_documents edd
    WHERE edd.user_id = p_user_id
      AND edd.dependency_id = p_dependency_id
      AND edd.is_current = true
    ORDER BY edd.family_member_name;
END;
$$ LANGUAGE plpgsql;

-- Función para evaluar si un empleado cumple una dependencia
CREATE OR REPLACE FUNCTION evaluate_employee_dependency(
    p_user_id UUID,
    p_company_id INT,
    p_dependency_id INT,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    v_dependency RECORD;
    v_result JSONB;
    v_valid_count INT := 0;
    v_invalid_count INT := 0;
    v_doc RECORD;
BEGIN
    -- Obtener la dependencia
    SELECT cd.*, dt.type_code as dependency_type_code
    INTO v_dependency
    FROM company_dependencies cd
    JOIN dependency_types dt ON dt.id = cd.dependency_type_id
    WHERE cd.id = p_dependency_id AND cd.company_id = p_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Dependency not found');
    END IF;

    -- Evaluar según tipo
    CASE v_dependency.dependency_type_code
        WHEN 'DOCUMENT_VALID' THEN
            -- Contar documentos válidos
            SELECT
                COUNT(*) FILTER (WHERE expiration_date IS NULL OR expiration_date >= p_as_of_date),
                COUNT(*) FILTER (WHERE expiration_date IS NOT NULL AND expiration_date < p_as_of_date)
            INTO v_valid_count, v_invalid_count
            FROM employee_dependency_documents
            WHERE user_id = p_user_id
              AND dependency_id = p_dependency_id
              AND is_current = true;

            v_result := jsonb_build_object(
                'success', true,
                'dependency_type', 'DOCUMENT_VALID',
                'dependency_name', v_dependency.dependency_name,
                'is_satisfied', v_valid_count > 0,
                'valid_count', v_valid_count,
                'invalid_count', v_invalid_count,
                'evaluated_at', CURRENT_TIMESTAMP
            );

        WHEN 'ATTENDANCE_RULE' THEN
            -- TODO: Implementar evaluación de asistencia
            v_result := jsonb_build_object(
                'success', true,
                'dependency_type', 'ATTENDANCE_RULE',
                'dependency_name', v_dependency.dependency_name,
                'is_satisfied', true,  -- Placeholder
                'note', 'Attendance evaluation not yet implemented'
            );

        WHEN 'FAMILY_CONDITION' THEN
            -- TODO: Implementar evaluación de condición familiar
            v_result := jsonb_build_object(
                'success', true,
                'dependency_type', 'FAMILY_CONDITION',
                'dependency_name', v_dependency.dependency_name,
                'is_satisfied', true,  -- Placeholder
                'note', 'Family condition evaluation not yet implemented'
            );

        ELSE
            v_result := jsonb_build_object(
                'success', false,
                'error', 'Unknown dependency type'
            );
    END CASE;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 7. VISTAS ÚTILES
-- ============================================================================

-- Vista: Documentos por vencer en los próximos 30 días (para notificaciones)
CREATE OR REPLACE VIEW v_expiring_documents AS
SELECT
    edd.id,
    edd.company_id,
    c.name as company_name,
    edd.user_id,
    u."firstName" || ' ' || u."lastName" as employee_name,
    u.email as employee_email,
    cd.dependency_name,
    edd.family_member_name,
    edd.expiration_date,
    edd.days_until_expiration,
    edd.status,
    cd.config->'notification_days' as notification_days
FROM employee_dependency_documents edd
JOIN companies c ON c.company_id = edd.company_id
JOIN users u ON u.user_id = edd.user_id
JOIN company_dependencies cd ON cd.id = edd.dependency_id
WHERE edd.is_current = true
  AND edd.expiration_date IS NOT NULL
  AND edd.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
  AND edd.expiration_date >= CURRENT_DATE
ORDER BY edd.expiration_date;

-- Vista: Resumen de dependencias por concepto
CREATE OR REPLACE VIEW v_concept_dependencies_summary AS
SELECT
    cd.concept_id,
    ptc.concept_name,
    cd.company_id,
    COUNT(cd.id) as total_dependencies,
    STRING_AGG(dep.dependency_name, ', ' ORDER BY cd.evaluation_order) as dependencies_list
FROM concept_dependencies cd
JOIN company_dependencies dep ON dep.id = cd.dependency_id
JOIN payroll_template_concepts ptc ON ptc.id = cd.concept_id
WHERE cd.is_active = true
GROUP BY cd.concept_id, ptc.concept_name, cd.company_id;


-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a las tablas que tienen updated_at
DROP TRIGGER IF EXISTS trg_company_dependencies_updated ON company_dependencies;
CREATE TRIGGER trg_company_dependencies_updated
    BEFORE UPDATE ON company_dependencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_concept_dependencies_updated ON concept_dependencies;
CREATE TRIGGER trg_concept_dependencies_updated
    BEFORE UPDATE ON concept_dependencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_emp_dep_docs_updated ON employee_dependency_documents;
CREATE TRIGGER trg_emp_dep_docs_updated
    BEFORE UPDATE ON employee_dependency_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 9. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE dependency_types IS 'Tipos base de dependencias (del sistema). Solo 4 tipos genéricos.';
COMMENT ON TABLE company_dependencies IS 'Dependencias definidas por cada empresa (multi-tenant). Cada empresa crea las suyas.';
COMMENT ON TABLE concept_dependencies IS 'Vinculación entre conceptos de liquidación y sus dependencias requeridas.';
COMMENT ON TABLE employee_dependency_documents IS 'Documentos/certificados cargados por empleados que satisfacen dependencias.';
COMMENT ON TABLE dependency_evaluations IS 'Historial de evaluación de dependencias durante liquidación (auditoría).';

COMMENT ON COLUMN company_dependencies.config IS 'Configuración específica según el tipo de dependencia (JSONB flexible)';
COMMENT ON COLUMN concept_dependencies.on_failure IS 'Qué hacer si no se cumple: SKIP=no aplicar, REDUCE_PROPORTIONAL=reducir, WARN_ONLY=advertir';
COMMENT ON COLUMN concept_dependencies.multiplier_mode IS 'Cómo multiplicar: NONE=binario, PER_VALID=por cada válido, FIXED=monto fijo';


COMMIT;

-- ============================================================================
-- RESUMEN DE TABLAS CREADAS:
-- 1. dependency_types         - Tipos base del sistema (4 tipos)
-- 2. company_dependencies     - Dependencias de cada empresa (multi-tenant)
-- 3. concept_dependencies     - Vinculación concepto ↔ dependencia
-- 4. employee_dependency_documents - Documentos del empleado
-- 5. dependency_evaluations   - Historial de evaluación (auditoría)
-- ============================================================================
