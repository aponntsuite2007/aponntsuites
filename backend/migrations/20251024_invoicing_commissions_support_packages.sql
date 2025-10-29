-- ============================================================================
-- Migration: Sistema Completo de Facturación, Comisiones y Paquetes de Soporte
-- Date: 2025-01-24
-- Description:
--   1. Extender companies con seller_id, support_id, commission rates
--   2. Extender partners con leader_id, leader_commission_rate, scoring
--   3. Crear tabla invoices (facturas mensuales)
--   4. Crear tabla invoice_items (items de factura)
--   5. Crear tabla payments (pagos registrados)
--   6. Crear tabla commissions (comisiones de venta, soporte y líder)
--   7. Crear tabla support_packages (paquetes de soporte activos)
--   8. Crear tabla support_package_auctions (subastas de paquetes)
--   9. Crear tabla partner_ratings (calificaciones de clientes a partners)
--   10. Crear funciones helper para cálculos automáticos
-- ============================================================================

-- ============================================================================
-- 1. LIMPIAR CAMPOS VIEJOS EN PARTNERS
-- ============================================================================

-- Eliminar campos obsoletos de comisión en partners
ALTER TABLE partners DROP COLUMN IF EXISTS commission_calculation CASCADE;
ALTER TABLE partners DROP COLUMN IF EXISTS commission_percentage CASCADE;

-- ============================================================================
-- 2. EXTENDER TABLA COMPANIES - Vendedor, Soporte y Comisiones
-- ============================================================================

-- Agregar campos de vendedor y soporte
ALTER TABLE companies ADD COLUMN IF NOT EXISTS seller_id INTEGER NULL REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS support_id INTEGER NULL REFERENCES partners(id) ON DELETE SET NULL;

-- Agregar comisiones configurables por operación
ALTER TABLE companies ADD COLUMN IF NOT EXISTS seller_commission_rate DECIMAL(5,2) NULL DEFAULT 0.00;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS support_commission_rate DECIMAL(5,2) NULL DEFAULT 0.00;

-- Agregar campos de aprobación de operación
ALTER TABLE companies ADD COLUMN IF NOT EXISTS operation_approved_by UUID NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS operation_approved_at TIMESTAMP NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS operation_approval_notes TEXT NULL;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_companies_seller ON companies(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_support ON companies(support_id) WHERE support_id IS NOT NULL;

COMMENT ON COLUMN companies.seller_id IS 'Partner vendedor que gestionó esta venta';
COMMENT ON COLUMN companies.support_id IS 'Partner soporte asignado a esta empresa';
COMMENT ON COLUMN companies.seller_commission_rate IS '% comisión de venta para este vendedor (configurable por operación)';
COMMENT ON COLUMN companies.support_commission_rate IS '% comisión de soporte para este support (configurable por operación)';

-- ============================================================================
-- 3. EXTENDER TABLA PARTNERS - Líder, Scoring y Rol
-- ============================================================================

-- Agregar campo de líder (partner puede tener otro partner como líder)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS leader_id INTEGER NULL REFERENCES partners(id) ON DELETE SET NULL;

-- Agregar comisión del líder sobre las ventas de este partner
ALTER TABLE partners ADD COLUMN IF NOT EXISTS leader_commission_rate DECIMAL(5,2) NULL DEFAULT 0.00;

-- Agregar scoring automático (calculado diariamente)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS scoring_points DECIMAL(10,2) DEFAULT 0.00 NOT NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS last_scoring_calculated_at TIMESTAMP NULL;

-- Agregar campos de rendimiento
ALTER TABLE partners ADD COLUMN IF NOT EXISTS total_sales_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS total_sales_amount DECIMAL(12,2) DEFAULT 0.00 NOT NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS active_support_packages_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00 NOT NULL;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS total_ratings_count INTEGER DEFAULT 0 NOT NULL;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_partners_leader ON partners(leader_id) WHERE leader_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_scoring ON partners(scoring_points DESC);

COMMENT ON COLUMN partners.leader_id IS 'Partner líder al que reporta este asociado (NULL si no tiene líder)';
COMMENT ON COLUMN partners.leader_commission_rate IS '% que comisiona el líder sobre las VENTAS de este partner';
COMMENT ON COLUMN partners.scoring_points IS 'Puntaje automático calculado diariamente (ventas + facturación + paquetes + rating)';

-- ============================================================================
-- 4. CREAR TABLA INVOICES - Facturas Mensuales
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,

  -- Empresa
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Número de factura (formato: YYYY-MM-XXXXX)
  invoice_number VARCHAR(50) NOT NULL UNIQUE,

  -- Período de facturación
  billing_period_month INTEGER NOT NULL,  -- 1-12
  billing_period_year INTEGER NOT NULL,   -- 2025, 2026, etc.

  -- Montos
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,  -- % impuestos
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,

  -- Estado
  status VARCHAR(20) DEFAULT 'draft' NOT NULL,  -- draft, pending_approval, sent, paid, overdue, cancelled

  -- Fechas
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  sent_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,

  -- Notas
  notes TEXT NULL,
  internal_notes TEXT NULL,

  -- Auditoría
  created_by UUID NULL,
  approved_by UUID NULL,
  approved_at TIMESTAMP NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'pending_approval', 'sent', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT invoices_billing_period CHECK (billing_period_month BETWEEN 1 AND 12)
);

-- Índices
CREATE INDEX idx_invoices_company ON invoices(company_id, created_at DESC);
CREATE INDEX idx_invoices_status ON invoices(status, created_at DESC);
CREATE INDEX idx_invoices_period ON invoices(billing_period_year, billing_period_month);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE UNIQUE INDEX idx_invoices_company_period ON invoices(company_id, billing_period_year, billing_period_month)
  WHERE status NOT IN ('cancelled');

COMMENT ON TABLE invoices IS 'Facturas mensuales generadas automáticamente para cada empresa';
COMMENT ON COLUMN invoices.invoice_number IS 'Número único de factura (ej: 2025-03-00125)';

-- ============================================================================
-- 5. CREAR TABLA INVOICE_ITEMS - Items de Factura
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGSERIAL PRIMARY KEY,

  -- Factura
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Item
  description TEXT NOT NULL,
  item_type VARCHAR(50) NOT NULL,  -- subscription, module, users, support, other
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,

  -- Metadata (módulos, usuarios, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_type ON invoice_items(item_type);

COMMENT ON TABLE invoice_items IS 'Items individuales de cada factura (suscripción, módulos, usuarios, etc.)';

-- ============================================================================
-- 6. CREAR TABLA PAYMENTS - Pagos Registrados
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,

  -- Factura
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Monto
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,

  -- Método de pago
  payment_method VARCHAR(50) NULL,  -- bank_transfer, credit_card, paypal, cash, etc.
  payment_reference VARCHAR(255) NULL,  -- Número de transferencia, recibo, etc.

  -- Fecha
  payment_date DATE NOT NULL,

  -- Archivo adjunto (comprobante)
  receipt_file_path TEXT NULL,
  receipt_file_name VARCHAR(255) NULL,

  -- Notas
  notes TEXT NULL,

  -- Auditoría
  registered_by UUID NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Comisiones generadas (se llenan automáticamente al registrar pago)
  commissions_generated BOOLEAN DEFAULT FALSE,
  commissions_generated_at TIMESTAMP NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_company ON payments(company_id, payment_date DESC);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);

COMMENT ON TABLE payments IS 'Registro de pagos recibidos de empresas (imputación automática a facturas)';
COMMENT ON COLUMN payments.commissions_generated IS 'TRUE si ya se generaron las comisiones automáticamente';

-- ============================================================================
-- 7. CREAR TABLA COMMISSIONS - Comisiones (Venta, Soporte, Líder)
-- ============================================================================

CREATE TABLE IF NOT EXISTS commissions (
  id BIGSERIAL PRIMARY KEY,

  -- Partner que recibe la comisión
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- Tipo de comisión
  commission_type VARCHAR(20) NOT NULL,  -- sale, support, leader

  -- Factura y pago que generaron esta comisión
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Montos
  base_amount DECIMAL(12,2) NOT NULL,  -- Monto base sobre el que se calcula
  commission_rate DECIMAL(5,2) NOT NULL,  -- % de comisión
  commission_amount DECIMAL(12,2) NOT NULL,  -- Comisión calculada
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,

  -- Si es comisión de líder, referencia al vendedor
  originated_from_partner_id INTEGER NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- Período de facturación
  billing_period_month INTEGER NOT NULL,
  billing_period_year INTEGER NOT NULL,

  -- Estado
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,  -- pending, paid, cancelled
  paid_at TIMESTAMP NULL,

  -- Notas
  notes TEXT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT commissions_type_check CHECK (commission_type IN ('sale', 'support', 'leader'))
);

CREATE INDEX idx_commissions_partner ON commissions(partner_id, created_at DESC);
CREATE INDEX idx_commissions_type ON commissions(commission_type, created_at DESC);
CREATE INDEX idx_commissions_payment ON commissions(payment_id);
CREATE INDEX idx_commissions_company ON commissions(company_id);
CREATE INDEX idx_commissions_period ON commissions(billing_period_year, billing_period_month);
CREATE INDEX idx_commissions_status ON commissions(status);

COMMENT ON TABLE commissions IS 'Comisiones generadas automáticamente al registrar pagos (venta, soporte, líder)';
COMMENT ON COLUMN commissions.commission_type IS 'sale=venta, support=soporte, leader=comisión de líder sobre ventas de liderado';
COMMENT ON COLUMN commissions.originated_from_partner_id IS 'Si es comisión de líder, indica el partner vendedor que generó la venta';

-- ============================================================================
-- 8. CREAR TABLA SUPPORT_PACKAGES - Paquetes de Soporte Activos
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_packages (
  id BIGSERIAL PRIMARY KEY,

  -- Empresa cliente
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Partner soporte asignado actualmente
  current_support_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

  -- Partner soporte original (al crear la venta)
  original_support_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

  -- Vendedor que originó la venta
  seller_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

  -- Estado
  status VARCHAR(20) DEFAULT 'active' NOT NULL,  -- active, lost, suspended, cancelled

  -- Comisión mensual de soporte
  monthly_commission_rate DECIMAL(5,2) NOT NULL,
  estimated_monthly_amount DECIMAL(12,2) NOT NULL,

  -- Calificación actual
  current_rating DECIMAL(3,2) DEFAULT 0.00,
  ratings_count INTEGER DEFAULT 0,

  -- Fechas
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lost_at TIMESTAMP NULL,
  lost_reason TEXT NULL,

  -- Auditoría de cambios
  last_support_change_at TIMESTAMP NULL,
  last_support_change_reason TEXT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT support_packages_status_check CHECK (status IN ('active', 'lost', 'suspended', 'cancelled'))
);

CREATE INDEX idx_support_packages_company ON support_packages(company_id);
CREATE INDEX idx_support_packages_current_support ON support_packages(current_support_id, status);
CREATE INDEX idx_support_packages_seller ON support_packages(seller_id);
CREATE INDEX idx_support_packages_status ON support_packages(status);

COMMENT ON TABLE support_packages IS 'Paquetes de soporte activos (se pierde si rating < 2 estrellas)';
COMMENT ON COLUMN support_packages.current_support_id IS 'Partner soporte actualmente asignado (puede cambiar por subasta)';
COMMENT ON COLUMN support_packages.original_support_id IS 'Partner soporte original (el que vendió)';

-- ============================================================================
-- 9. CREAR TABLA SUPPORT_PACKAGE_AUCTIONS - Subastas de Paquetes
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_package_auctions (
  id BIGSERIAL PRIMARY KEY,

  -- Paquete subastado
  support_package_id BIGINT NOT NULL REFERENCES support_packages(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Partner que perdió el paquete
  lost_by_partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  lost_reason TEXT NOT NULL,

  -- Estado de la subasta
  status VARCHAR(20) DEFAULT 'open' NOT NULL,  -- open, assigned, cancelled

  -- Partner asignado (si ya se cerró la subasta)
  assigned_to_partner_id INTEGER NULL REFERENCES partners(id) ON DELETE SET NULL,
  assigned_by_user_id UUID NULL,  -- Supervisor que asignó
  assigned_at TIMESTAMP NULL,
  assignment_notes TEXT NULL,

  -- Ofertas (array de partners interesados con su scoring)
  bids JSONB DEFAULT '[]'::jsonb,  -- [{partner_id, partner_name, scoring, bid_at}, ...]

  -- Fechas
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,

  -- Notificaciones
  partner_notified BOOLEAN DEFAULT FALSE,
  supervisor_notified BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT support_package_auctions_status_check CHECK (status IN ('open', 'assigned', 'cancelled'))
);

CREATE INDEX idx_support_auctions_package ON support_package_auctions(support_package_id);
CREATE INDEX idx_support_auctions_status ON support_package_auctions(status, opened_at DESC);
CREATE INDEX idx_support_auctions_lost_by ON support_package_auctions(lost_by_partner_id);

COMMENT ON TABLE support_package_auctions IS 'Subastas de paquetes de soporte perdidos (rating < 2 estrellas)';
COMMENT ON COLUMN support_package_auctions.bids IS 'Array de ofertas: [{partner_id, partner_name, scoring, bid_at}]';

-- ============================================================================
-- 10. CREAR TABLA PARTNER_RATINGS - Calificaciones de Clientes
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_ratings (
  id BIGSERIAL PRIMARY KEY,

  -- Partner calificado
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- Empresa que califica
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Paquete de soporte
  support_package_id BIGINT NULL REFERENCES support_packages(id) ON DELETE SET NULL,

  -- Calificación (1-5 estrellas)
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),

  -- Comentarios
  comment TEXT NULL,

  -- Fecha
  rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Período
  rating_period_month INTEGER NOT NULL,
  rating_period_year INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(partner_id, company_id, rating_period_year, rating_period_month)
);

CREATE INDEX idx_partner_ratings_partner ON partner_ratings(partner_id, rated_at DESC);
CREATE INDEX idx_partner_ratings_company ON partner_ratings(company_id);
CREATE INDEX idx_partner_ratings_period ON partner_ratings(rating_period_year, rating_period_month);

COMMENT ON TABLE partner_ratings IS 'Calificaciones mensuales de clientes a partners de soporte (1-5 estrellas)';

-- ============================================================================
-- 11. FUNCIONES HELPER - Cálculos Automáticos
-- ============================================================================

-- Función: Generar número de factura automático
CREATE OR REPLACE FUNCTION generate_invoice_number(p_year INTEGER, p_month INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_count INTEGER;
  v_number VARCHAR(50);
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE billing_period_year = p_year AND billing_period_month = p_month;

  v_number := FORMAT('%s-%s-%s',
    LPAD(p_year::TEXT, 4, '0'),
    LPAD(p_month::TEXT, 2, '0'),
    LPAD(v_count::TEXT, 5, '0')
  );

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular scoring de partner
CREATE OR REPLACE FUNCTION calculate_partner_scoring(p_partner_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_scoring DECIMAL(10,2);
  v_sales_count INTEGER;
  v_sales_amount DECIMAL(12,2);
  v_packages_count INTEGER;
  v_avg_rating DECIMAL(3,2);
BEGIN
  -- Obtener métricas del partner
  SELECT
    total_sales_count,
    total_sales_amount,
    active_support_packages_count,
    average_rating
  INTO v_sales_count, v_sales_amount, v_packages_count, v_avg_rating
  FROM partners
  WHERE id = p_partner_id;

  -- Cálculo de scoring (ponderado)
  -- Cantidad de ventas: 25 puntos
  -- Montos de facturación: 30 puntos (por cada $10,000 = 1 punto)
  -- Paquetes activos: 20 puntos (por paquete = 2 puntos)
  -- Rating promedio: 25 puntos (por estrella = 5 puntos)

  v_scoring :=
    (v_sales_count * 0.25) +
    ((v_sales_amount / 10000) * 0.30) +
    (v_packages_count * 2 * 0.20) +
    (v_avg_rating * 5 * 0.25);

  RETURN ROUND(v_scoring, 2);
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar métricas de partner
CREATE OR REPLACE FUNCTION update_partner_metrics(p_partner_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE partners
  SET
    -- Total de ventas
    total_sales_count = (
      SELECT COUNT(*)
      FROM companies
      WHERE seller_id = p_partner_id
    ),

    -- Monto total facturado
    total_sales_amount = COALESCE((
      SELECT SUM(total_amount)
      FROM invoices inv
      INNER JOIN companies c ON c.company_id = inv.company_id
      WHERE c.seller_id = p_partner_id AND inv.status = 'paid'
    ), 0),

    -- Paquetes de soporte activos
    active_support_packages_count = (
      SELECT COUNT(*)
      FROM support_packages
      WHERE current_support_id = p_partner_id AND status = 'active'
    ),

    -- Rating promedio
    average_rating = COALESCE((
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM partner_ratings
      WHERE partner_id = p_partner_id
    ), 0),

    -- Total de calificaciones
    total_ratings_count = (
      SELECT COUNT(*)
      FROM partner_ratings
      WHERE partner_id = p_partner_id
    ),

    -- Actualizar timestamp
    last_scoring_calculated_at = CURRENT_TIMESTAMP
  WHERE id = p_partner_id;

  -- Calcular y actualizar scoring
  UPDATE partners
  SET scoring_points = calculate_partner_scoring(p_partner_id)
  WHERE id = p_partner_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_partner_metrics(INTEGER) IS 'Actualiza todas las métricas y scoring de un partner';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
