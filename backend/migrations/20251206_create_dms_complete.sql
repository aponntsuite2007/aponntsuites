-- ============================================
-- DOCUMENT MANAGEMENT SYSTEM (DMS) - COMPLETE MIGRATION
-- Sistema de Gestión Documental Enterprise
-- Fecha: 2025-12-06
-- ============================================

-- ============================================
-- PARTE 1: CATÁLOGOS GLOBALES (Schema Public)
-- ============================================

-- Categorías de documentos
CREATE TABLE IF NOT EXISTS document_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description TEXT,
    icon VARCHAR(10),
    color VARCHAR(7),
    parent_id INTEGER REFERENCES document_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Insertar categorías principales
INSERT INTO document_categories (code, name, name_en, icon, color, sort_order) VALUES
    ('HR', 'Recursos Humanos', 'Human Resources', '👥', '#3B82F6', 1),
    ('MED', 'Médico / Salud Ocupacional', 'Medical / Occupational Health', '🏥', '#10B981', 2),
    ('LEG', 'Legal / Compliance', 'Legal / Compliance', '⚖️', '#8B5CF6', 3),
    ('FIN', 'Financiero / Nómina', 'Finance / Payroll', '💰', '#F59E0B', 4),
    ('TRN', 'Capacitación', 'Training', '📚', '#EC4899', 5),
    ('REC', 'Reclutamiento', 'Recruitment', '🎯', '#14B8A6', 6),
    ('OPS', 'Operaciones', 'Operations', '⚙️', '#6366F1', 7),
    ('VND', 'Proveedores', 'Vendors', '🤝', '#78716C', 8),
    ('GEN', 'General', 'General', '📁', '#64748B', 9)
ON CONFLICT (code) DO NOTHING;

-- Subcategorías
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'HR.PER', 'Personal', 'Personal', '👤', '#3B82F6', id, 1 FROM document_categories WHERE code = 'HR'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'HR.LAB', 'Laboral', 'Employment', '📋', '#3B82F6', id, 2 FROM document_categories WHERE code = 'HR'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'HR.ONB', 'Onboarding', 'Onboarding', '🚀', '#3B82F6', id, 3 FROM document_categories WHERE code = 'HR'
ON CONFLICT (code) DO NOTHING;

INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'MED.EXA', 'Exámenes', 'Exams', '🔬', '#10B981', id, 1 FROM document_categories WHERE code = 'MED'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'MED.CER', 'Certificados', 'Certificates', '📜', '#10B981', id, 2 FROM document_categories WHERE code = 'MED'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'MED.APT', 'Aptitud', 'Fitness', '✅', '#10B981', id, 3 FROM document_categories WHERE code = 'MED'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'MED.ACC', 'Accidentes', 'Accidents', '🚨', '#10B981', id, 4 FROM document_categories WHERE code = 'MED'
ON CONFLICT (code) DO NOTHING;

INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'LEG.SAN', 'Sanciones', 'Sanctions', '⚠️', '#8B5CF6', id, 1 FROM document_categories WHERE code = 'LEG'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'LEG.COM', 'Comunicaciones', 'Communications', '📨', '#8B5CF6', id, 2 FROM document_categories WHERE code = 'LEG'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'LEG.CON', 'Contratos', 'Contracts', '📝', '#8B5CF6', id, 3 FROM document_categories WHERE code = 'LEG'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'LEG.LIT', 'Litigios', 'Litigation', '⚔️', '#8B5CF6', id, 4 FROM document_categories WHERE code = 'LEG'
ON CONFLICT (code) DO NOTHING;

INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'FIN.REC', 'Recibos', 'Receipts', '🧾', '#F59E0B', id, 1 FROM document_categories WHERE code = 'FIN'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'FIN.LIQ', 'Liquidaciones', 'Settlements', '💵', '#F59E0B', id, 2 FROM document_categories WHERE code = 'FIN'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'FIN.IMP', 'Impuestos', 'Taxes', '🏛️', '#F59E0B', id, 3 FROM document_categories WHERE code = 'FIN'
ON CONFLICT (code) DO NOTHING;

INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'TRN.CER', 'Certificados', 'Certificates', '🎓', '#EC4899', id, 1 FROM document_categories WHERE code = 'TRN'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'TRN.MAT', 'Materiales', 'Materials', '📖', '#EC4899', id, 2 FROM document_categories WHERE code = 'TRN'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'TRN.EVA', 'Evaluaciones', 'Evaluations', '📝', '#EC4899', id, 3 FROM document_categories WHERE code = 'TRN'
ON CONFLICT (code) DO NOTHING;

INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'REC.CV', 'Currículums', 'Resumes', '📄', '#14B8A6', id, 1 FROM document_categories WHERE code = 'REC'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'REC.ENT', 'Entrevistas', 'Interviews', '🎤', '#14B8A6', id, 2 FROM document_categories WHERE code = 'REC'
ON CONFLICT (code) DO NOTHING;
INSERT INTO document_categories (code, name, name_en, icon, color, parent_id, sort_order)
SELECT 'REC.OFE', 'Ofertas', 'Offers', '📬', '#14B8A6', id, 3 FROM document_categories WHERE code = 'REC'
ON CONFLICT (code) DO NOTHING;

-- Tipos de documentos
CREATE TABLE IF NOT EXISTS document_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    category_code VARCHAR(10) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_en VARCHAR(150),
    description TEXT,

    -- Configuración
    retention_years INTEGER,
    requires_expiration BOOLEAN DEFAULT false,
    requires_signature BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false,
    is_auto_generated BOOLEAN DEFAULT false,

    -- Metadatos requeridos
    required_metadata JSONB DEFAULT '[]',
    optional_metadata JSONB DEFAULT '[]',

    -- Validación
    allowed_extensions VARCHAR[] DEFAULT ARRAY['pdf','jpg','jpeg','png','doc','docx'],
    max_file_size_mb INTEGER DEFAULT 10,

    -- Permisos por defecto
    default_visibility VARCHAR(20) DEFAULT 'private',
    allowed_roles VARCHAR[] DEFAULT ARRAY['admin', 'hr_manager'],

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Insertar tipos de documentos
INSERT INTO document_types (code, category_code, name, name_en, retention_years, requires_expiration, is_sensitive) VALUES
    -- HR - Personal
    ('HR.PER.DNI', 'HR.PER', 'DNI / Documento de Identidad', 'ID Card', 10, true, false),
    ('HR.PER.PASSPORT', 'HR.PER', 'Pasaporte', 'Passport', 10, true, false),
    ('HR.PER.VISA', 'HR.PER', 'Visa de Trabajo', 'Work Visa', 10, true, false),
    ('HR.PER.LICENSE', 'HR.PER', 'Licencia de Conducir', 'Driver License', 5, true, false),
    ('HR.PER.PHOTO', 'HR.PER', 'Foto de Perfil', 'Profile Photo', NULL, false, false),
    ('HR.PER.BIRTH_CERT', 'HR.PER', 'Acta de Nacimiento', 'Birth Certificate', NULL, false, false),
    ('HR.PER.MARRIAGE_CERT', 'HR.PER', 'Acta de Matrimonio', 'Marriage Certificate', NULL, false, false),
    ('HR.PER.CUIL', 'HR.PER', 'Constancia de CUIL', 'CUIL Certificate', NULL, false, false),
    ('HR.PER.ANTECEDENTES', 'HR.PER', 'Certificado de Antecedentes', 'Background Check', 1, true, true),

    -- HR - Laboral
    ('HR.LAB.CONTRACT', 'HR.LAB', 'Contrato de Trabajo', 'Employment Contract', 10, false, false),
    ('HR.LAB.AMENDMENT', 'HR.LAB', 'Addendum de Contrato', 'Contract Amendment', 10, false, false),
    ('HR.LAB.JOB_DESC', 'HR.LAB', 'Descripción de Puesto', 'Job Description', 5, false, false),
    ('HR.LAB.WORK_CERT', 'HR.LAB', 'Certificado de Trabajo', 'Work Certificate', 10, false, false),
    ('HR.LAB.REFERENCE', 'HR.LAB', 'Carta de Referencia', 'Reference Letter', 5, false, false),
    ('HR.LAB.RESIGNATION', 'HR.LAB', 'Carta de Renuncia', 'Resignation Letter', 10, false, false),

    -- Medical
    ('MED.EXA.PREOCUP', 'MED.EXA', 'Examen Preocupacional', 'Pre-employment Exam', 30, false, true),
    ('MED.EXA.PERIOD', 'MED.EXA', 'Examen Periódico', 'Periodic Exam', 30, true, true),
    ('MED.EXA.RETIRO', 'MED.EXA', 'Examen de Retiro', 'Exit Exam', 30, false, true),
    ('MED.EXA.ESPECIAL', 'MED.EXA', 'Examen Especial', 'Special Exam', 30, false, true),
    ('MED.CER.AUSENCIA', 'MED.CER', 'Certificado Médico de Ausencia', 'Medical Leave Certificate', 5, false, true),
    ('MED.CER.APTITUD', 'MED.APT', 'Certificado de Aptitud', 'Fitness Certificate', 10, true, true),
    ('MED.ACC.REPORTE', 'MED.ACC', 'Reporte de Accidente', 'Accident Report', 30, false, true),
    ('MED.ACC.ART', 'MED.ACC', 'Denuncia ART', 'Workers Comp Claim', 30, false, true),

    -- Legal
    ('LEG.SAN.APERC', 'LEG.SAN', 'Apercibimiento', 'Warning', 7, false, false),
    ('LEG.SAN.SUSP', 'LEG.SAN', 'Suspensión', 'Suspension', 7, false, false),
    ('LEG.SAN.DESPIDO', 'LEG.SAN', 'Carta de Despido', 'Termination Letter', 10, false, false),
    ('LEG.COM.CARTA_DOC', 'LEG.COM', 'Carta Documento', 'Certified Letter', 10, false, false),
    ('LEG.COM.TELEGRAMA', 'LEG.COM', 'Telegrama', 'Telegram', 10, false, false),
    ('LEG.CON.CONFID', 'LEG.CON', 'Acuerdo de Confidencialidad', 'NDA', 10, false, false),
    ('LEG.LIT.DEMANDA', 'LEG.LIT', 'Demanda', 'Lawsuit', 20, false, true),
    ('LEG.LIT.SENTENCIA', 'LEG.LIT', 'Sentencia', 'Judgment', 20, false, true),

    -- Finance
    ('FIN.REC.SUELDO', 'FIN.REC', 'Recibo de Sueldo', 'Payslip', 10, false, false),
    ('FIN.REC.AGUINALDO', 'FIN.REC', 'Recibo de Aguinaldo', 'Bonus Receipt', 10, false, false),
    ('FIN.LIQ.FINAL', 'FIN.LIQ', 'Liquidación Final', 'Final Settlement', 10, false, false),
    ('FIN.IMP.F931', 'FIN.IMP', 'Formulario 931 AFIP', 'AFIP Form 931', 10, false, false),

    -- Training
    ('TRN.CER.CURSO', 'TRN.CER', 'Certificado de Curso', 'Course Certificate', 5, false, false),
    ('TRN.CER.SEGURIDAD', 'TRN.CER', 'Certificado Seguridad e Higiene', 'Safety Certificate', 5, true, false),
    ('TRN.MAT.PRESENT', 'TRN.MAT', 'Material de Capacitación', 'Training Material', 3, false, false),
    ('TRN.EVA.EXAMEN', 'TRN.EVA', 'Evaluación/Examen', 'Test/Exam', 3, false, false),

    -- Recruitment
    ('REC.CV.CURRICULUM', 'REC.CV', 'Curriculum Vitae', 'Resume/CV', 2, false, false),
    ('REC.CV.COVER', 'REC.CV', 'Carta de Presentación', 'Cover Letter', 2, false, false),
    ('REC.ENT.EVAL', 'REC.ENT', 'Evaluación de Entrevista', 'Interview Evaluation', 2, false, false),
    ('REC.OFE.PROPUESTA', 'REC.OFE', 'Propuesta Laboral', 'Job Offer', 5, false, false),

    -- Vendors
    ('VND.CON.SERVICIO', 'VND', 'Contrato de Servicio', 'Service Contract', 10, false, false),
    ('VND.FAC.PROVEEDOR', 'VND', 'Factura de Proveedor', 'Vendor Invoice', 10, false, false),
    ('VND.CER.AFIP', 'VND', 'Certificación AFIP', 'AFIP Certification', 5, true, false),

    -- General
    ('GEN.OTR.OTRO', 'GEN', 'Otro Documento', 'Other Document', NULL, false, false),
    ('GEN.TMP.TEMPORAL', 'GEN', 'Documento Temporal', 'Temporary Document', 1, false, false)
ON CONFLICT (code) DO NOTHING;

-- Estados de documentos
CREATE TABLE IF NOT EXISTS document_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    name_en VARCHAR(50),
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(10),
    sort_order INTEGER DEFAULT 0,
    is_final BOOLEAN DEFAULT false,
    allowed_transitions VARCHAR[] DEFAULT ARRAY[]::VARCHAR[]
);

INSERT INTO document_statuses (code, name, name_en, color, icon, sort_order, is_final, allowed_transitions) VALUES
    ('DRAFT', 'Borrador', 'Draft', '#94A3B8', '📝', 1, false, ARRAY['PENDING_REVIEW', 'DELETED']),
    ('REQUESTED', 'Solicitado', 'Requested', '#F97316', '📨', 2, false, ARRAY['PENDING_UPLOAD', 'CANCELLED']),
    ('PENDING_UPLOAD', 'Pendiente de Carga', 'Pending Upload', '#FBBF24', '⏳', 3, false, ARRAY['PENDING_REVIEW', 'CANCELLED']),
    ('PENDING_REVIEW', 'Pendiente de Revisión', 'Pending Review', '#3B82F6', '🔍', 4, false, ARRAY['IN_REVIEW', 'APPROVED', 'REJECTED']),
    ('IN_REVIEW', 'En Revisión', 'In Review', '#8B5CF6', '👁️', 5, false, ARRAY['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
    ('CHANGES_REQUESTED', 'Requiere Cambios', 'Changes Requested', '#EF4444', '🔄', 6, false, ARRAY['PENDING_REVIEW', 'CANCELLED']),
    ('APPROVED', 'Aprobado', 'Approved', '#10B981', '✅', 7, false, ARRAY['PENDING_SIGNATURE', 'PENDING_DELIVERY', 'LOCKED', 'ARCHIVED', 'EXPIRING_SOON']),
    ('PENDING_SIGNATURE', 'Pendiente de Firma', 'Pending Signature', '#6366F1', '✍️', 8, false, ARRAY['SIGNED', 'REJECTED']),
    ('SIGNED', 'Firmado', 'Signed', '#059669', '🔏', 9, false, ARRAY['LOCKED', 'ARCHIVED']),
    ('PENDING_DELIVERY', 'Pendiente de Envío', 'Pending Delivery', '#0EA5E9', '📤', 10, false, ARRAY['SENT', 'CANCELLED']),
    ('SENT', 'Enviado', 'Sent', '#0284C7', '📬', 11, false, ARRAY['DELIVERED', 'ARCHIVED']),
    ('DELIVERED', 'Entregado', 'Delivered', '#16A34A', '📥', 12, false, ARRAY['ARCHIVED']),
    ('EXPIRING_SOON', 'Por Vencer', 'Expiring Soon', '#F59E0B', '⚠️', 13, false, ARRAY['EXPIRED', 'APPROVED']),
    ('EXPIRED', 'Vencido', 'Expired', '#DC2626', '❌', 14, false, ARRAY['APPROVED', 'ARCHIVED']),
    ('ARCHIVED', 'Archivado', 'Archived', '#78716C', '📦', 15, true, ARRAY['APPROVED', 'DELETED']),
    ('LOCKED', 'Bloqueado', 'Locked', '#1E293B', '🔒', 16, true, ARRAY['APPROVED']),
    ('DELETED', 'Eliminado', 'Deleted', '#991B1B', '🗑️', 17, true, ARRAY['APPROVED']),
    ('CANCELLED', 'Cancelado', 'Cancelled', '#6B7280', '🚫', 18, true, ARRAY[])
ON CONFLICT (code) DO NOTHING;


-- ============================================
-- PARTE 2: TABLAS PRINCIPALES DEL DMS
-- ============================================

-- Carpetas
CREATE TABLE IF NOT EXISTS dms_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,
    parent_id UUID REFERENCES dms_folders(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,
    full_path VARCHAR(1000),
    depth INTEGER DEFAULT 0,

    -- Propietario
    owner_type VARCHAR(50) DEFAULT 'company',
    owner_id UUID,

    -- Configuración
    inherit_permissions BOOLEAN DEFAULT true,
    default_visibility VARCHAR(20) DEFAULT 'private',
    color VARCHAR(7),
    icon VARCHAR(10),

    -- Sistema
    is_system BOOLEAN DEFAULT false,
    folder_type VARCHAR(50),

    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,

    UNIQUE(company_id, full_path)
);

CREATE INDEX idx_dms_folders_company ON dms_folders(company_id) WHERE is_active = true;
CREATE INDEX idx_dms_folders_parent ON dms_folders(parent_id);
CREATE INDEX idx_dms_folders_owner ON dms_folders(owner_type, owner_id);


-- Documentos (tabla principal)
CREATE TABLE IF NOT EXISTS dms_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,

    -- Identificación
    document_number VARCHAR(50),
    external_reference VARCHAR(100),

    -- Clasificación
    category_code VARCHAR(10) NOT NULL,
    type_code VARCHAR(50) NOT NULL,
    folder_id UUID REFERENCES dms_folders(id),
    parent_document_id UUID REFERENCES dms_documents(id),

    -- Información básica
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Archivo
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(20) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,

    -- Propietario y entidad relacionada
    owner_type VARCHAR(50) NOT NULL DEFAULT 'user',
    owner_id UUID NOT NULL,
    owner_name VARCHAR(255),

    -- Origen (módulo que creó el documento)
    source_module VARCHAR(50),
    source_entity_type VARCHAR(50),
    source_entity_id UUID,

    -- Estado
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    previous_status VARCHAR(30),
    status_changed_at TIMESTAMP,
    status_changed_by UUID,
    status_reason TEXT,

    -- Versionamiento
    version INTEGER NOT NULL DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    superseded_by_id UUID REFERENCES dms_documents(id),
    supersedes_id UUID REFERENCES dms_documents(id),
    version_notes TEXT,

    -- Fechas importantes
    issue_date DATE,
    effective_date DATE,
    expiration_date DATE,
    expiration_alert_days INTEGER DEFAULT 30,
    last_expiration_alert_at TIMESTAMP,

    -- Firma digital
    requires_signature BOOLEAN DEFAULT false,
    is_signed BOOLEAN DEFAULT false,
    signature_data JSONB,
    signed_by UUID,
    signed_at TIMESTAMP,
    signature_ip VARCHAR(45),

    -- Seguridad
    visibility VARCHAR(20) DEFAULT 'private',
    is_confidential BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false,
    access_level INTEGER DEFAULT 1,

    -- Bloqueo
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    locked_by UUID,
    locked_reason TEXT,
    lock_expires_at TIMESTAMP,

    -- Check-out
    is_checked_out BOOLEAN DEFAULT false,
    checked_out_by UUID,
    checked_out_at TIMESTAMP,
    checkout_expires_at TIMESTAMP,

    -- Búsqueda
    content_text TEXT,
    search_vector tsvector,
    tags VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],

    -- Retención
    retention_until DATE,
    disposal_action VARCHAR(20),
    disposal_date DATE,

    -- Auditoría
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID,
    updated_at TIMESTAMP,

    -- Soft delete
    is_deleted BOOLEAN DEFAULT false,
    deleted_by UUID,
    deleted_at TIMESTAMP,
    deletion_reason TEXT,

    -- Métricas
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    last_accessed_by UUID
);

-- Índices para documentos
CREATE INDEX idx_dms_docs_company ON dms_documents(company_id) WHERE is_deleted = false;
CREATE INDEX idx_dms_docs_owner ON dms_documents(owner_type, owner_id) WHERE is_deleted = false;
CREATE INDEX idx_dms_docs_category ON dms_documents(category_code, type_code) WHERE is_deleted = false;
CREATE INDEX idx_dms_docs_status ON dms_documents(status) WHERE is_deleted = false;
CREATE INDEX idx_dms_docs_expiration ON dms_documents(expiration_date) WHERE is_deleted = false AND expiration_date IS NOT NULL;
CREATE INDEX idx_dms_docs_source ON dms_documents(source_module, source_entity_type, source_entity_id) WHERE is_deleted = false;
CREATE INDEX idx_dms_docs_folder ON dms_documents(folder_id) WHERE is_deleted = false;
CREATE INDEX idx_dms_docs_search ON dms_documents USING GIN(search_vector);
CREATE INDEX idx_dms_docs_tags ON dms_documents USING GIN(tags);

-- Trigger para actualizar search_vector
CREATE OR REPLACE FUNCTION dms_documents_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('spanish', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('spanish', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('spanish', COALESCE(NEW.owner_name, '')), 'C') ||
        setweight(to_tsvector('spanish', COALESCE(NEW.content_text, '')), 'D') ||
        setweight(to_tsvector('spanish', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dms_documents_search_update ON dms_documents;
CREATE TRIGGER dms_documents_search_update
    BEFORE INSERT OR UPDATE OF title, description, owner_name, content_text, tags
    ON dms_documents
    FOR EACH ROW
    EXECUTE FUNCTION dms_documents_search_trigger();


-- Versiones de documentos
CREATE TABLE IF NOT EXISTS dms_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms_documents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,

    -- Archivo
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,

    -- Cambios
    change_summary TEXT,
    changed_fields JSONB,

    -- Auditoría
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    created_from_ip VARCHAR(45),

    UNIQUE(document_id, version_number)
);

CREATE INDEX idx_dms_versions ON dms_document_versions(document_id, version_number DESC);


-- Metadatos personalizados
CREATE TABLE IF NOT EXISTS dms_document_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms_documents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL,

    metadata_key VARCHAR(100) NOT NULL,
    metadata_value TEXT,
    data_type VARCHAR(20) NOT NULL DEFAULT 'string',

    is_searchable BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,

    UNIQUE(document_id, metadata_key)
);

CREATE INDEX idx_dms_metadata ON dms_document_metadata(metadata_key, metadata_value) WHERE is_searchable = true;


-- Log de acceso (auditoría inmutable)
CREATE TABLE IF NOT EXISTS dms_access_log (
    id BIGSERIAL PRIMARY KEY,
    document_id UUID NOT NULL,
    document_version INTEGER,
    company_id INTEGER NOT NULL,

    user_id UUID NOT NULL,
    user_name VARCHAR(255),
    user_role VARCHAR(50),

    action VARCHAR(30) NOT NULL,
    action_detail TEXT,

    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    device_type VARCHAR(20),

    success BOOLEAN DEFAULT true,
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dms_access_document ON dms_access_log(document_id, created_at DESC);
CREATE INDEX idx_dms_access_user ON dms_access_log(user_id, created_at DESC);
CREATE INDEX idx_dms_access_company ON dms_access_log(company_id, created_at DESC);
CREATE INDEX idx_dms_access_action ON dms_access_log(action, created_at DESC);

-- Hacer la tabla append-only
CREATE OR REPLACE FUNCTION prevent_dms_access_log_modification() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'dms_access_log is append-only. Updates and deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dms_access_log_immutable ON dms_access_log;
CREATE TRIGGER dms_access_log_immutable
    BEFORE UPDATE OR DELETE ON dms_access_log
    FOR EACH ROW EXECUTE FUNCTION prevent_dms_access_log_modification();


-- Permisos de documentos
CREATE TABLE IF NOT EXISTS dms_document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms_documents(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL,

    grantee_type VARCHAR(20) NOT NULL,
    grantee_id UUID,
    grantee_role VARCHAR(50),

    permission_level VARCHAR(20) NOT NULL,

    can_view BOOLEAN DEFAULT true,
    can_download BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_sign BOOLEAN DEFAULT false,
    can_approve BOOLEAN DEFAULT false,
    can_share BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,

    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,

    granted_by UUID NOT NULL,
    granted_at TIMESTAMP DEFAULT NOW(),
    revoked_by UUID,
    revoked_at TIMESTAMP,

    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_dms_permissions ON dms_document_permissions(document_id, grantee_type, grantee_id) WHERE is_active = true;


-- Solicitudes de documentos
CREATE TABLE IF NOT EXISTS dms_document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL,

    type_code VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    description TEXT,

    requested_from_type VARCHAR(20) NOT NULL,
    requested_from_id UUID NOT NULL,
    requested_from_name VARCHAR(255),

    requested_by UUID NOT NULL,
    requested_by_name VARCHAR(255),

    priority VARCHAR(20) DEFAULT 'normal',
    due_date DATE,

    status VARCHAR(20) DEFAULT 'pending',

    document_id UUID REFERENCES dms_documents(id),
    uploaded_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    reminder_count INTEGER DEFAULT 0
);

CREATE INDEX idx_dms_requests ON dms_document_requests(requested_from_id, status);
CREATE INDEX idx_dms_requests_company ON dms_document_requests(company_id, status);


-- Alertas de documentos
CREATE TABLE IF NOT EXISTS dms_document_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES dms_documents(id),
    request_id UUID REFERENCES dms_document_requests(id),
    company_id INTEGER NOT NULL,

    alert_type VARCHAR(30) NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning',

    title VARCHAR(255) NOT NULL,
    message TEXT,

    user_id UUID NOT NULL,

    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,

    trigger_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP
);

CREATE INDEX idx_dms_alerts ON dms_document_alerts(user_id, is_read, is_dismissed);
CREATE INDEX idx_dms_alerts_company ON dms_document_alerts(company_id, created_at DESC);


-- ============================================
-- PARTE 3: WORKFLOWS
-- ============================================

-- Plantillas de workflow
CREATE TABLE IF NOT EXISTS dms_workflow_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    steps JSONB NOT NULL DEFAULT '[]',
    trigger_on_types VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],

    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- Insertar workflows del sistema
INSERT INTO dms_workflow_templates (company_id, name, description, steps, trigger_on_types, is_system) VALUES
    (NULL, 'Aprobación Simple', 'Requiere aprobación de un supervisor',
     '[{"step": 1, "name": "Aprobación", "type": "approval", "assignee_type": "role", "assignee_value": "supervisor", "timeout_hours": 48}]',
     ARRAY['HR.LAB.CONTRACT', 'LEG.SAN.APERC'], true),
    (NULL, 'Aprobación Doble', 'Requiere aprobación de supervisor y HR',
     '[{"step": 1, "name": "Aprobación Supervisor", "type": "approval", "assignee_type": "role", "assignee_value": "supervisor", "timeout_hours": 48}, {"step": 2, "name": "Aprobación HR", "type": "approval", "assignee_type": "role", "assignee_value": "hr_manager", "timeout_hours": 48}]',
     ARRAY['HR.LAB.CONTRACT', 'LEG.SAN.SUSP', 'LEG.SAN.DESPIDO'], true),
    (NULL, 'Revisión Médica', 'Revisión por médico laboral',
     '[{"step": 1, "name": "Revisión Médico", "type": "approval", "assignee_type": "role", "assignee_value": "medical_officer", "timeout_hours": 72}]',
     ARRAY['MED.EXA.PREOCUP', 'MED.EXA.PERIOD', 'MED.CER.APTITUD'], true)
ON CONFLICT DO NOTHING;

-- Instancias de workflow
CREATE TABLE IF NOT EXISTS dms_workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES dms_documents(id),
    template_id INTEGER REFERENCES dms_workflow_templates(id),
    company_id INTEGER NOT NULL,

    name VARCHAR(100) NOT NULL,

    status VARCHAR(20) DEFAULT 'active',
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER NOT NULL,

    steps_data JSONB NOT NULL DEFAULT '[]',

    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    deadline TIMESTAMP,

    started_by UUID NOT NULL,
    completed_by UUID,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX idx_dms_workflows ON dms_workflow_instances(document_id, status);
CREATE INDEX idx_dms_workflows_company ON dms_workflow_instances(company_id, status);


-- Aprobaciones de workflow
CREATE TABLE IF NOT EXISTS dms_workflow_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES dms_workflow_instances(id),
    document_id UUID NOT NULL REFERENCES dms_documents(id),
    company_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,

    assigned_to UUID NOT NULL,
    assigned_role VARCHAR(50),

    decision VARCHAR(20) DEFAULT 'pending',
    decision_comment TEXT,
    decision_at TIMESTAMP,

    delegated_to UUID,
    delegated_at TIMESTAMP,
    delegation_reason TEXT,

    due_at TIMESTAMP,
    reminded_at TIMESTAMP,
    reminder_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dms_approvals ON dms_workflow_approvals(assigned_to, decision) WHERE decision = 'pending';
CREATE INDEX idx_dms_approvals_company ON dms_workflow_approvals(company_id, decision);


-- ============================================
-- PARTE 4: FUNCIONES HELPER
-- ============================================

-- Función para generar número de documento
CREATE OR REPLACE FUNCTION generate_document_number(p_company_id INTEGER, p_category_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INTEGER;
    v_number VARCHAR(50);
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CASE
            WHEN document_number ~ ('^' || p_category_code || '-' || v_year || '-[0-9]+$')
            THEN CAST(SPLIT_PART(document_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO v_sequence
    FROM dms_documents
    WHERE company_id = p_company_id
      AND category_code = p_category_code;

    v_number := p_category_code || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

    RETURN v_number;
END;
$$ LANGUAGE plpgsql;


-- Función para obtener estadísticas del DMS por empresa
CREATE OR REPLACE FUNCTION get_dms_stats(p_company_id INTEGER)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_documents', (SELECT COUNT(*) FROM dms_documents WHERE company_id = p_company_id AND is_deleted = false),
        'total_size_bytes', (SELECT COALESCE(SUM(file_size_bytes), 0) FROM dms_documents WHERE company_id = p_company_id AND is_deleted = false),
        'by_status', (
            SELECT json_object_agg(status, cnt)
            FROM (
                SELECT status, COUNT(*) as cnt
                FROM dms_documents
                WHERE company_id = p_company_id AND is_deleted = false
                GROUP BY status
            ) s
        ),
        'by_category', (
            SELECT json_object_agg(category_code, cnt)
            FROM (
                SELECT category_code, COUNT(*) as cnt
                FROM dms_documents
                WHERE company_id = p_company_id AND is_deleted = false
                GROUP BY category_code
            ) c
        ),
        'expiring_soon', (
            SELECT COUNT(*)
            FROM dms_documents
            WHERE company_id = p_company_id
              AND is_deleted = false
              AND expiration_date IS NOT NULL
              AND expiration_date <= CURRENT_DATE + INTERVAL '30 days'
              AND expiration_date > CURRENT_DATE
        ),
        'expired', (
            SELECT COUNT(*)
            FROM dms_documents
            WHERE company_id = p_company_id
              AND is_deleted = false
              AND expiration_date IS NOT NULL
              AND expiration_date < CURRENT_DATE
        ),
        'pending_approvals', (
            SELECT COUNT(*)
            FROM dms_workflow_approvals
            WHERE company_id = p_company_id
              AND decision = 'pending'
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- Función para obtener documentos de un usuario (para GDPR export)
CREATE OR REPLACE FUNCTION get_user_documents_for_export(p_user_id UUID, p_company_id INTEGER)
RETURNS TABLE (
    document_id UUID,
    document_number VARCHAR,
    title VARCHAR,
    category VARCHAR,
    type VARCHAR,
    status VARCHAR,
    created_at TIMESTAMP,
    file_path VARCHAR,
    file_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.document_number,
        d.title,
        d.category_code,
        d.type_code,
        d.status,
        d.created_at,
        d.storage_path,
        d.file_size_bytes
    FROM dms_documents d
    WHERE d.owner_id = p_user_id
      AND d.company_id = p_company_id
      AND d.is_deleted = false
    ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql;


-- Función para verificar permisos
CREATE OR REPLACE FUNCTION check_document_permission(
    p_document_id UUID,
    p_user_id UUID,
    p_action VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN := false;
    v_doc_owner_id UUID;
    v_doc_visibility VARCHAR;
BEGIN
    -- Obtener info del documento
    SELECT owner_id, visibility
    INTO v_doc_owner_id, v_doc_visibility
    FROM dms_documents
    WHERE id = p_document_id AND is_deleted = false;

    -- El propietario siempre tiene permiso
    IF v_doc_owner_id = p_user_id THEN
        RETURN true;
    END IF;

    -- Verificar permisos explícitos
    SELECT EXISTS(
        SELECT 1 FROM dms_document_permissions
        WHERE document_id = p_document_id
          AND grantee_id = p_user_id
          AND is_active = true
          AND (valid_until IS NULL OR valid_until > NOW())
          AND CASE p_action
              WHEN 'view' THEN can_view
              WHEN 'download' THEN can_download
              WHEN 'edit' THEN can_edit
              WHEN 'sign' THEN can_sign
              WHEN 'approve' THEN can_approve
              WHEN 'share' THEN can_share
              WHEN 'delete' THEN can_delete
              ELSE false
          END
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- PARTE 5: ÍNDICES ADICIONALES Y OPTIMIZACIONES
-- ============================================

-- Índice parcial para documentos activos
CREATE INDEX IF NOT EXISTS idx_dms_docs_active
ON dms_documents(company_id, created_at DESC)
WHERE is_deleted = false AND status NOT IN ('DELETED', 'ARCHIVED');

-- Índice para búsqueda por propietario
CREATE INDEX IF NOT EXISTS idx_dms_docs_user_active
ON dms_documents(owner_id, category_code, created_at DESC)
WHERE is_deleted = false AND owner_type = 'user';

-- Estadísticas para el query planner
ANALYZE dms_documents;
ANALYZE dms_document_versions;
ANALYZE dms_access_log;


-- ============================================
-- MENSAJE DE ÉXITO
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ DMS (Document Management System) migration completed successfully!';
    RAISE NOTICE '📁 Created tables: document_categories, document_types, document_statuses';
    RAISE NOTICE '📁 Created tables: dms_folders, dms_documents, dms_document_versions';
    RAISE NOTICE '📁 Created tables: dms_document_metadata, dms_access_log, dms_document_permissions';
    RAISE NOTICE '📁 Created tables: dms_document_requests, dms_document_alerts';
    RAISE NOTICE '📁 Created tables: dms_workflow_templates, dms_workflow_instances, dms_workflow_approvals';
    RAISE NOTICE '🔧 Created functions: generate_document_number, get_dms_stats, get_user_documents_for_export, check_document_permission';
END $$;
