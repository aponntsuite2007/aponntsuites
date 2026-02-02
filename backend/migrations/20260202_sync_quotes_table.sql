-- ============================================================================
-- MIGRACIÓN: Sincronizar tabla quotes
-- Fecha: 2026-02-02
-- Descripción: Agrega columnas faltantes del modelo Quote.js
-- ============================================================================

-- Columnas nuevas del modelo que faltan
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_type VARCHAR(30) DEFAULT 'manual';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_detail JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS seller_assigned_at TIMESTAMP;

-- Columnas existentes que podrían faltar en Render
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS seller_id INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS modules_data JSONB DEFAULT '[]';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS trial_modules JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS has_trial BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS trial_bonification_percentage NUMERIC(5,2) DEFAULT 100.00;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS previous_quote_id INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS replaces_quote_id INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS replaced_by_quote_id INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_upgrade BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_downgrade BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_modification BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS added_modules JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS removed_modules JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_date TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_date TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rejected_date TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_notes TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS pdf_file_path VARCHAR(500);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_by INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS invoice_id INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contract_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contract_sent_at TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contract_signer_name VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contract_signer_dni VARCHAR(20);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contract_signature_ip VARCHAR(45);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contract_acceptance_data JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sales_lead_id UUID;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_sales_lead_id ON quotes(sales_lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_seller_id ON quotes(seller_id);
CREATE INDEX IF NOT EXISTS idx_quotes_origin_type ON quotes(origin_type);

-- Comentarios
COMMENT ON COLUMN quotes.origin_type IS 'Origen: marketing_lead, sales_lead, direct, referral, partner, manual';
COMMENT ON COLUMN quotes.origin_detail IS 'Metadata del origen (campaign, lead_email, etc.)';
COMMENT ON COLUMN quotes.seller_assigned_at IS 'Fecha en que se asignó el vendedor';

SELECT 'Migración quotes completada' as status;
