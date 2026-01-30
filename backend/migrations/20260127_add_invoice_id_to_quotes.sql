-- Migration: Add invoice_id to quotes table
-- Date: 2026-01-27
-- Purpose: Link quotes directly to invoices for the Quote → Invoice → Payment circuit

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_invoice_id ON quotes(invoice_id);

COMMENT ON COLUMN quotes.invoice_id IS 'Factura generada desde este presupuesto';
