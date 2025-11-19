-- ============================================================================
-- MIGRACIÓN: TAB 3 - Antecedentes Legales y Afiliación Sindical
-- Fecha: 2025-01-17
-- Descripción: Crea tablas para antecedentes legales/judiciales y afiliación sindical
-- ============================================================================

-- ============================================================================
-- TABLA 1: ANTECEDENTES LEGALES/JUDICIALES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_legal_issues (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Tipo de causa
    issue_type VARCHAR(100) NOT NULL CHECK (issue_type IN ('penal', 'civil', 'laboral', 'comercial', 'administrativo', 'otro')),
    issue_subtype VARCHAR(255), -- ej: "Daños y perjuicios", "Incumplimiento contractual"

    -- Información de la causa
    case_number VARCHAR(100), -- Número de expediente
    court VARCHAR(255), -- Juzgado/tribunal
    jurisdiction VARCHAR(255), -- Jurisdicción (ej: "Buenos Aires", "Federal")

    -- Fechas
    filing_date DATE, -- Fecha de inicio de la causa
    resolution_date DATE, -- Fecha de resolución (si ya finalizó)
    last_hearing_date DATE, -- Última audiencia
    next_hearing_date DATE, -- Próxima audiencia

    -- Estado
    status VARCHAR(50) CHECK (status IN ('en_tramite', 'resuelto', 'archivado', 'desestimado', 'apelacion', 'ejecutoria')),

    -- Detalles
    description TEXT, -- Descripción breve de la causa
    plaintiff VARCHAR(255), -- Demandante/querellante
    defendant VARCHAR(255), -- Demandado

    -- Resolución
    outcome TEXT, -- Resultado/sentencia
    sentence_details TEXT, -- Detalles de la condena (si aplica)
    fine_amount DECIMAL(12,2), -- Multa impuesta (si aplica)

    -- Impacto laboral
    affects_employment BOOLEAN DEFAULT FALSE,
    employment_restriction_details TEXT, -- Detalles si afecta el empleo

    -- Documentación
    document_url TEXT, -- URL de documentos escaneados

    -- Observaciones
    notes TEXT,
    is_confidential BOOLEAN DEFAULT FALSE, -- Si es información confidencial

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para user_legal_issues
CREATE INDEX idx_legal_issues_user ON user_legal_issues(user_id);
CREATE INDEX idx_legal_issues_company ON user_legal_issues(company_id);
CREATE INDEX idx_legal_issues_type ON user_legal_issues(issue_type);
CREATE INDEX idx_legal_issues_status ON user_legal_issues(status);
CREATE INDEX idx_legal_issues_employment ON user_legal_issues(affects_employment);

-- Comentarios
COMMENT ON TABLE user_legal_issues IS 'Antecedentes legales y judiciales del empleado';
COMMENT ON COLUMN user_legal_issues.issue_type IS 'Tipo de causa: penal, civil, laboral, comercial, administrativo';
COMMENT ON COLUMN user_legal_issues.affects_employment IS 'Si el caso afecta la elegibilidad para el empleo actual';
COMMENT ON COLUMN user_legal_issues.is_confidential IS 'Marca información sensible que requiere permisos especiales para visualizar';

-- ============================================================================
-- TABLA 2: AFILIACIÓN SINDICAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_union_affiliation (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Información del sindicato
    union_name VARCHAR(255) NOT NULL, -- ej: "UOM", "Sindicato de Empleados de Comercio"
    union_full_name VARCHAR(500), -- Nombre completo oficial
    union_cuit VARCHAR(15), -- CUIT del sindicato

    -- Afiliación
    membership_number VARCHAR(100), -- Número de afiliado
    affiliation_date DATE NOT NULL, -- Fecha de afiliación
    resignation_date DATE, -- Fecha de desafiliación (si aplica)
    is_active BOOLEAN DEFAULT TRUE,

    -- Rol en el sindicato
    delegate_role VARCHAR(100), -- ej: 'delegado', 'subdelegado', 'miembro_comision', 'afiliado_simple'
    delegate_start_date DATE, -- Si es delegado, desde cuándo
    delegate_end_date DATE, -- Si fue delegado, hasta cuándo

    -- Información adicional
    section_or_branch VARCHAR(255), -- Sección o rama del sindicato
    workplace_delegate BOOLEAN DEFAULT FALSE, -- Si es delegado de planta
    has_fuero_sindical BOOLEAN DEFAULT FALSE, -- Si tiene fuero sindical
    fuero_start_date DATE,
    fuero_end_date DATE,

    -- Cuota sindical
    monthly_dues DECIMAL(10,2), -- Cuota mensual
    dues_payment_method VARCHAR(50) CHECK (dues_payment_method IN ('descuento_automatico', 'transferencia', 'efectivo', 'debito')),
    last_payment_date DATE,

    -- Contacto del sindicato
    union_phone VARCHAR(50),
    union_email VARCHAR(255),
    union_address TEXT,
    union_delegate_contact VARCHAR(255), -- Contacto del delegado general

    -- Documentación
    membership_card_url TEXT, -- Foto del carnet sindical
    certificate_url TEXT, -- Certificado de afiliación

    -- Observaciones
    benefits TEXT, -- Beneficios sindicales (ej: descuentos, obra social)
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para user_union_affiliation
CREATE INDEX idx_union_affiliation_user ON user_union_affiliation(user_id);
CREATE INDEX idx_union_affiliation_company ON user_union_affiliation(company_id);
CREATE INDEX idx_union_affiliation_union ON user_union_affiliation(union_name);
CREATE INDEX idx_union_affiliation_active ON user_union_affiliation(is_active);
CREATE INDEX idx_union_affiliation_delegate ON user_union_affiliation(workplace_delegate);
CREATE INDEX idx_union_affiliation_fuero ON user_union_affiliation(has_fuero_sindical);

-- Comentarios
COMMENT ON TABLE user_union_affiliation IS 'Afiliación sindical del empleado';
COMMENT ON COLUMN user_union_affiliation.union_name IS 'Nombre del sindicato (ej: UOM, Camioneros, UOCRA)';
COMMENT ON COLUMN user_union_affiliation.delegate_role IS 'Rol dentro del sindicato: delegado, subdelegado, miembro de comisión, afiliado simple';
COMMENT ON COLUMN user_union_affiliation.has_fuero_sindical IS 'Si el empleado tiene fuero sindical (protección legal especial)';
COMMENT ON COLUMN user_union_affiliation.workplace_delegate IS 'Si es delegado de planta/establecimiento';
COMMENT ON COLUMN user_union_affiliation.dues_payment_method IS 'Método de pago de cuota sindical';

-- Triggers para updated_at
CREATE TRIGGER update_legal_issues_updated_at
BEFORE UPDATE ON user_legal_issues
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_union_affiliation_updated_at
BEFORE UPDATE ON user_union_affiliation
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
