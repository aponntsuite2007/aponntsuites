-- ============================================================================
-- MIGRACIÓN: Crear tabla de mapeo email-proceso para empresas (multi-tenant)
-- Fecha: 2025-12-21
-- Descripción: Permite a cada empresa asignar sus emails configurados a los
--              procesos de notificación (scope=company)
-- ============================================================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS company_email_process_mapping (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    email_config_id UUID NOT NULL,
    process_key VARCHAR(100) NOT NULL,

    -- Info redundante para queries rápidas (desnormalizado pero útil)
    process_name VARCHAR(255),
    module VARCHAR(50),

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_company
        FOREIGN KEY (company_id)
        REFERENCES companies(company_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_email_config
        FOREIGN KEY (email_config_id)
        REFERENCES company_email_config(id)
        ON DELETE CASCADE,

    -- Cada empresa puede asignar un email a un proceso solo una vez
    CONSTRAINT unique_company_process
        UNIQUE (company_id, process_key)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_company_email_process_company
    ON company_email_process_mapping(company_id);

CREATE INDEX IF NOT EXISTS idx_company_email_process_email_config
    ON company_email_process_mapping(email_config_id);

CREATE INDEX IF NOT EXISTS idx_company_email_process_process_key
    ON company_email_process_mapping(process_key);

CREATE INDEX IF NOT EXISTS idx_company_email_process_module
    ON company_email_process_mapping(module);

-- 3. Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_company_email_process_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_email_process_mapping
    BEFORE UPDATE ON company_email_process_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_company_email_process_mapping_updated_at();

-- 4. Verificar creación
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'TABLA CREADA - company_email_process_mapping';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Tabla multi-tenant para asignar emails de empresa a procesos';
    RAISE NOTICE 'Constraints:';
    RAISE NOTICE '  • FK a companies (cascade delete)';
    RAISE NOTICE '  • FK a company_email_config (cascade delete)';
    RAISE NOTICE '  • UNIQUE (company_id, process_key)';
    RAISE NOTICE '';
    RAISE NOTICE 'Índices creados para:';
    RAISE NOTICE '  • company_id (queries por empresa)';
    RAISE NOTICE '  • email_config_id (queries por email)';
    RAISE NOTICE '  • process_key (búsqueda de proceso)';
    RAISE NOTICE '  • module (agrupación por módulo)';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
END $$;
