-- ═══════════════════════════════════════════════════════════════════════════════
-- WAREHOUSE MANAGEMENT SYSTEM (WMS) - Sistema de Gestión de Almacenes y Depósitos
-- Migración: 20251230_create_warehouse_management_system.sql
-- Autor: Claude Code
-- Descripción: Sistema multi-tenant completo con:
--   - Jerarquía: Empresa → Sucursal → Depósitos (ilimitados)
--   - Plantillas fiscales parametrizables por país
--   - Listas de precios ilimitadas con sistema de espejos
--   - Promociones y bonificaciones flexibles
--   - Gestión de stock con lotes y vencimientos
--   - Cubicación y planogramas para góndolas
--   - Códigos compuestos para balanzas
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 1: CONFIGURACIÓN MULTI-PAÍS Y MONEDAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Monedas disponibles
CREATE TABLE IF NOT EXISTS wms_currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    decimal_places INTEGER DEFAULT 2,
    thousand_separator VARCHAR(1) DEFAULT '.',
    decimal_separator VARCHAR(1) DEFAULT ',',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Países disponibles
CREATE TABLE IF NOT EXISTS wms_countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    default_currency_id INTEGER REFERENCES wms_currencies(id),
    phone_code VARCHAR(5),
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar monedas básicas
INSERT INTO wms_currencies (code, name, symbol, decimal_places, thousand_separator, decimal_separator) VALUES
    ('ARS', 'Peso Argentino', '$', 2, '.', ','),
    ('USD', 'Dólar Estadounidense', 'US$', 2, ',', '.'),
    ('EUR', 'Euro', '€', 2, '.', ','),
    ('CLP', 'Peso Chileno', '$', 0, '.', ','),
    ('MXN', 'Peso Mexicano', '$', 2, ',', '.'),
    ('BRL', 'Real Brasileño', 'R$', 2, '.', ','),
    ('UYU', 'Peso Uruguayo', '$U', 2, '.', ','),
    ('PYG', 'Guaraní Paraguayo', '₲', 0, '.', ','),
    ('BOB', 'Boliviano', 'Bs', 2, '.', ','),
    ('PEN', 'Sol Peruano', 'S/', 2, ',', '.'),
    ('COP', 'Peso Colombiano', '$', 0, '.', ',')
ON CONFLICT (code) DO NOTHING;

-- Insertar países básicos
INSERT INTO wms_countries (code, name, default_currency_id, phone_code) VALUES
    ('ARG', 'Argentina', (SELECT id FROM wms_currencies WHERE code = 'ARS'), '+54'),
    ('USA', 'Estados Unidos', (SELECT id FROM wms_currencies WHERE code = 'USD'), '+1'),
    ('CHL', 'Chile', (SELECT id FROM wms_currencies WHERE code = 'CLP'), '+56'),
    ('MEX', 'México', (SELECT id FROM wms_currencies WHERE code = 'MXN'), '+52'),
    ('BRA', 'Brasil', (SELECT id FROM wms_currencies WHERE code = 'BRL'), '+55'),
    ('URY', 'Uruguay', (SELECT id FROM wms_currencies WHERE code = 'UYU'), '+598'),
    ('PRY', 'Paraguay', (SELECT id FROM wms_currencies WHERE code = 'PYG'), '+595'),
    ('BOL', 'Bolivia', (SELECT id FROM wms_currencies WHERE code = 'BOB'), '+591'),
    ('PER', 'Perú', (SELECT id FROM wms_currencies WHERE code = 'PEN'), '+51'),
    ('COL', 'Colombia', (SELECT id FROM wms_currencies WHERE code = 'COP'), '+57'),
    ('ESP', 'España', (SELECT id FROM wms_currencies WHERE code = 'EUR'), '+34')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 2: PLANTILLAS FISCALES PARAMETRIZABLES POR PAÍS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Plantillas fiscales
CREATE TABLE IF NOT EXISTS wms_tax_templates (
    id SERIAL PRIMARY KEY,
    country_id INTEGER REFERENCES wms_countries(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(country_id, code)
);

-- Tipos de impuestos en cada plantilla
CREATE TABLE IF NOT EXISTS wms_tax_template_items (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES wms_tax_templates(id) ON DELETE CASCADE,
    tax_code VARCHAR(20) NOT NULL,
    tax_name VARCHAR(100) NOT NULL,
    tax_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
    default_rate DECIMAL(10,4),
    applies_to VARCHAR(20) NOT NULL DEFAULT 'BOTH',
    calculation_order INTEGER DEFAULT 1,
    is_included_in_price BOOLEAN DEFAULT false,
    is_recoverable BOOLEAN DEFAULT true,
    affects_cost BOOLEAN DEFAULT true,
    affects_price BOOLEAN DEFAULT true,
    account_code_purchase VARCHAR(20),
    account_code_sale VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(template_id, tax_code)
);

-- Alícuotas disponibles por impuesto
CREATE TABLE IF NOT EXISTS wms_tax_rates (
    id SERIAL PRIMARY KEY,
    tax_item_id INTEGER REFERENCES wms_tax_template_items(id) ON DELETE CASCADE,
    rate DECIMAL(10,4) NOT NULL,
    name VARCHAR(50),
    description VARCHAR(200),
    is_default BOOLEAN DEFAULT false,
    is_exempt BOOLEAN DEFAULT false,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar plantilla fiscal Argentina
INSERT INTO wms_tax_templates (country_id, code, name, description, is_default) VALUES
    ((SELECT id FROM wms_countries WHERE code = 'ARG'), 'AR_GENERAL', 'Argentina - Régimen General', 'Plantilla fiscal estándar para Argentina con IVA e Impuestos Internos', true)
ON CONFLICT (country_id, code) DO NOTHING;

-- Insertar impuestos de Argentina
INSERT INTO wms_tax_template_items (template_id, tax_code, tax_name, tax_type, default_rate, applies_to, calculation_order, is_recoverable)
SELECT
    t.id,
    item.tax_code,
    item.tax_name,
    item.tax_type,
    item.default_rate,
    item.applies_to,
    item.calculation_order,
    item.is_recoverable
FROM wms_tax_templates t
CROSS JOIN (VALUES
    ('IVA', 'Impuesto al Valor Agregado', 'PERCENTAGE', 21.00, 'BOTH', 1, true),
    ('IIBB', 'Ingresos Brutos', 'PERCENTAGE', 3.50, 'SALE', 2, false),
    ('IINT', 'Impuestos Internos', 'PERCENTAGE', 0.00, 'BOTH', 3, false),
    ('PERC_IVA', 'Percepción IVA', 'PERCENTAGE', 0.00, 'PURCHASE', 4, true),
    ('PERC_IIBB', 'Percepción IIBB', 'PERCENTAGE', 0.00, 'PURCHASE', 5, false)
) AS item(tax_code, tax_name, tax_type, default_rate, applies_to, calculation_order, is_recoverable)
WHERE t.code = 'AR_GENERAL'
ON CONFLICT (template_id, tax_code) DO NOTHING;

-- Insertar alícuotas de IVA Argentina
INSERT INTO wms_tax_rates (tax_item_id, rate, name, is_default, is_exempt)
SELECT
    ti.id,
    rate.rate,
    rate.name,
    rate.is_default,
    rate.is_exempt
FROM wms_tax_template_items ti
JOIN wms_tax_templates t ON t.id = ti.template_id
CROSS JOIN (VALUES
    (21.00, 'Alícuota General 21%', true, false),
    (10.50, 'Alícuota Reducida 10.5%', false, false),
    (27.00, 'Alícuota Incrementada 27%', false, false),
    (0.00, 'Exento', false, true),
    (0.00, 'No Gravado', false, true)
) AS rate(rate, name, is_default, is_exempt)
WHERE t.code = 'AR_GENERAL' AND ti.tax_code = 'IVA'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 3: SUCURSALES Y DEPÓSITOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Sucursales (Nivel 2 Multi-tenant)
CREATE TABLE IF NOT EXISTS wms_branches (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    country_id INTEGER REFERENCES wms_countries(id),
    tax_template_id INTEGER REFERENCES wms_tax_templates(id),
    default_currency_id INTEGER REFERENCES wms_currencies(id),

    -- Dirección
    address TEXT,
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),

    -- Contacto
    phone VARCHAR(50),
    email VARCHAR(100),
    manager_name VARCHAR(100),

    -- Configuración
    timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
    is_headquarters BOOLEAN DEFAULT false,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, code)
);

-- Depósitos (Ilimitados por Sucursal)
CREATE TABLE IF NOT EXISTS wms_warehouses (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES wms_branches(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,

    -- Tipo de depósito
    warehouse_type VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    -- GENERAL, RAW_MATERIAL, FINISHED_GOODS, TOOLS, SHOWROOM,
    -- COLD_STORAGE, HAZARDOUS, TRANSIT, RETURNS

    -- Configuración de Espejo (para compartir catálogo)
    mirror_catalog_from_id INTEGER REFERENCES wms_warehouses(id),
    mirror_prices BOOLEAN DEFAULT false,
    price_adjustment_type VARCHAR(20),
    price_adjustment_value DECIMAL(10,4),
    mirror_categories BOOLEAN DEFAULT false,

    -- Configuración de Inventario
    allows_negative_stock BOOLEAN DEFAULT false,
    track_batches BOOLEAN DEFAULT false,
    track_expiry BOOLEAN DEFAULT false,
    track_serial_numbers BOOLEAN DEFAULT false,
    track_locations BOOLEAN DEFAULT false,

    -- Configuración de costos
    costing_method VARCHAR(20) DEFAULT 'WEIGHTED_AVG',
    -- WEIGHTED_AVG, FIFO, LIFO, SPECIFIC

    -- Dirección (si es diferente a la sucursal)
    address TEXT,

    -- Responsable
    manager_name VARCHAR(100),
    manager_email VARCHAR(100),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(branch_id, code)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 4: CATÁLOGO DE PRODUCTOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Unidades de Medida
CREATE TABLE IF NOT EXISTS wms_units_of_measure (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    name_plural VARCHAR(50),
    symbol VARCHAR(10),
    unit_type VARCHAR(20) NOT NULL DEFAULT 'UNIT',
    -- UNIT, WEIGHT, VOLUME, LENGTH, AREA, TIME
    base_unit_id INTEGER REFERENCES wms_units_of_measure(id),
    conversion_factor DECIMAL(15,6) DEFAULT 1,
    is_divisible BOOLEAN DEFAULT true,
    decimal_places INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT true
);

-- Insertar unidades básicas
INSERT INTO wms_units_of_measure (code, name, name_plural, symbol, unit_type, is_divisible, decimal_places) VALUES
    ('UN', 'Unidad', 'Unidades', 'u', 'UNIT', false, 0),
    ('KG', 'Kilogramo', 'Kilogramos', 'kg', 'WEIGHT', true, 3),
    ('GR', 'Gramo', 'Gramos', 'g', 'WEIGHT', true, 0),
    ('LT', 'Litro', 'Litros', 'l', 'VOLUME', true, 3),
    ('ML', 'Mililitro', 'Mililitros', 'ml', 'VOLUME', true, 0),
    ('MT', 'Metro', 'Metros', 'm', 'LENGTH', true, 2),
    ('CM', 'Centímetro', 'Centímetros', 'cm', 'LENGTH', true, 0),
    ('M2', 'Metro Cuadrado', 'Metros Cuadrados', 'm²', 'AREA', true, 2),
    ('M3', 'Metro Cúbico', 'Metros Cúbicos', 'm³', 'VOLUME', true, 3),
    ('PAR', 'Par', 'Pares', 'par', 'UNIT', false, 0),
    ('DOC', 'Docena', 'Docenas', 'doc', 'UNIT', false, 0),
    ('CJ', 'Caja', 'Cajas', 'cj', 'UNIT', false, 0),
    ('BLT', 'Bulto', 'Bultos', 'blt', 'UNIT', false, 0),
    ('PK', 'Pack', 'Packs', 'pk', 'UNIT', false, 0),
    ('HR', 'Hora', 'Horas', 'hr', 'TIME', true, 2)
ON CONFLICT (code) DO NOTHING;

-- Actualizar conversiones
UPDATE wms_units_of_measure SET base_unit_id = (SELECT id FROM wms_units_of_measure WHERE code = 'KG'), conversion_factor = 0.001 WHERE code = 'GR';
UPDATE wms_units_of_measure SET base_unit_id = (SELECT id FROM wms_units_of_measure WHERE code = 'LT'), conversion_factor = 0.001 WHERE code = 'ML';
UPDATE wms_units_of_measure SET base_unit_id = (SELECT id FROM wms_units_of_measure WHERE code = 'MT'), conversion_factor = 0.01 WHERE code = 'CM';

-- Categorías (Rubros, SubRubros, Familias)
CREATE TABLE IF NOT EXISTS wms_categories (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES wms_warehouses(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Jerarquía
    parent_id INTEGER REFERENCES wms_categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    full_path VARCHAR(500),

    -- Configuración
    default_tax_rate_id INTEGER REFERENCES wms_tax_rates(id),
    default_margin_percent DECIMAL(10,4),

    -- Visualización
    sort_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(7),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(warehouse_id, code)
);

-- Marcas
CREATE TABLE IF NOT EXISTS wms_brands (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(200),
    is_own_brand BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Proveedores
CREATE TABLE IF NOT EXISTS wms_suppliers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    legal_name VARCHAR(200),
    tax_id VARCHAR(30),
    country_id INTEGER REFERENCES wms_countries(id),

    -- Contacto
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    contact_name VARCHAR(100),

    -- Comercial
    payment_terms INTEGER DEFAULT 30,
    currency_id INTEGER REFERENCES wms_currencies(id),
    credit_limit DECIMAL(15,2),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, code)
);

-- Productos (Padrón de Artículos)
CREATE TABLE IF NOT EXISTS wms_products (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES wms_warehouses(id) ON DELETE CASCADE,

    -- ═══════════════════════════════════════════════════════════════════
    -- IDENTIFICACIÓN
    -- ═══════════════════════════════════════════════════════════════════
    internal_code VARCHAR(50) NOT NULL,
    barcode VARCHAR(50),
    supplier_code VARCHAR(50),
    family_code VARCHAR(50),

    -- ═══════════════════════════════════════════════════════════════════
    -- DESCRIPCIÓN
    -- ═══════════════════════════════════════════════════════════════════
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    description TEXT,

    -- ═══════════════════════════════════════════════════════════════════
    -- CLASIFICACIÓN
    -- ═══════════════════════════════════════════════════════════════════
    category_id INTEGER REFERENCES wms_categories(id),
    brand_id INTEGER REFERENCES wms_brands(id),
    supplier_id INTEGER REFERENCES wms_suppliers(id),
    product_type VARCHAR(20) NOT NULL DEFAULT 'RESALE',
    -- RESALE, MANUFACTURED, SERVICE, RAW_MATERIAL, CONSUMABLE

    -- ═══════════════════════════════════════════════════════════════════
    -- UNIDADES Y PRESENTACIÓN
    -- ═══════════════════════════════════════════════════════════════════
    unit_of_measure_id INTEGER REFERENCES wms_units_of_measure(id),
    units_per_pack INTEGER DEFAULT 1,
    packaging_type VARCHAR(50),

    -- Atributos
    size VARCHAR(50),
    color VARCHAR(50),
    flavor VARCHAR(50),
    weight_net DECIMAL(12,4),
    weight_gross DECIMAL(12,4),

    -- ═══════════════════════════════════════════════════════════════════
    -- CONFIGURACIÓN CÓDIGO COMPUESTO (Balanzas)
    -- ═══════════════════════════════════════════════════════════════════
    is_weighted BOOLEAN DEFAULT false,
    barcode_contains_weight BOOLEAN DEFAULT false,
    barcode_contains_price BOOLEAN DEFAULT false,
    barcode_article_digits INTEGER,
    barcode_value_digits INTEGER,
    barcode_value_decimals INTEGER DEFAULT 3,

    -- ═══════════════════════════════════════════════════════════════════
    -- PRODUCTOS PERECEDEROS
    -- ═══════════════════════════════════════════════════════════════════
    is_perishable BOOLEAN DEFAULT false,
    shelf_life_days INTEGER,
    requires_batch_tracking BOOLEAN DEFAULT false,
    requires_cold_chain BOOLEAN DEFAULT false,
    storage_temperature_min DECIMAL(5,2),
    storage_temperature_max DECIMAL(5,2),

    -- ═══════════════════════════════════════════════════════════════════
    -- CONFIGURACIÓN DE VENTA
    -- ═══════════════════════════════════════════════════════════════════
    is_sellable BOOLEAN DEFAULT true,
    is_purchasable BOOLEAN DEFAULT true,
    allows_discount BOOLEAN DEFAULT true,
    allows_returns BOOLEAN DEFAULT true,
    commission_percent DECIMAL(5,2),

    -- ═══════════════════════════════════════════════════════════════════
    -- RELACIÓN PADRE/HIJO (Kits, Combos)
    -- ═══════════════════════════════════════════════════════════════════
    is_kit BOOLEAN DEFAULT false,
    parent_product_id INTEGER REFERENCES wms_products(id),

    -- ═══════════════════════════════════════════════════════════════════
    -- CUBICACIÓN (Dimensiones para almacenamiento)
    -- ═══════════════════════════════════════════════════════════════════
    length_cm DECIMAL(10,2),
    width_cm DECIMAL(10,2),
    height_cm DECIMAL(10,2),
    volume_cm3 DECIMAL(15,2),
    stacking_limit INTEGER,

    -- ═══════════════════════════════════════════════════════════════════
    -- CONTROL DE PRECIOS
    -- ═══════════════════════════════════════════════════════════════════
    is_price_locked BOOLEAN DEFAULT false,
    price_lock_expires_at TIMESTAMPTZ,
    price_lock_reason VARCHAR(200),

    -- ═══════════════════════════════════════════════════════════════════
    -- ESTADO
    -- ═══════════════════════════════════════════════════════════════════
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    blocked_reason VARCHAR(100),

    -- ═══════════════════════════════════════════════════════════════════
    -- IMÁGENES
    -- ═══════════════════════════════════════════════════════════════════
    image_url VARCHAR(500),
    thumbnail_url VARCHAR(500),

    -- ═══════════════════════════════════════════════════════════════════
    -- AUDITORÍA
    -- ═══════════════════════════════════════════════════════════════════
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),

    UNIQUE(warehouse_id, internal_code)
);

-- Códigos alternativos (múltiples barcodes)
CREATE TABLE IF NOT EXISTS wms_product_barcodes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES wms_products(id) ON DELETE CASCADE,
    barcode VARCHAR(50) NOT NULL,
    barcode_type VARCHAR(20) DEFAULT 'EAN13',
    description VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Componentes de kit/combo
CREATE TABLE IF NOT EXISTS wms_product_kit_components (
    id SERIAL PRIMARY KEY,
    kit_product_id INTEGER REFERENCES wms_products(id) ON DELETE CASCADE,
    component_product_id INTEGER REFERENCES wms_products(id) ON DELETE CASCADE,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
    is_optional BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(kit_product_id, component_product_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 5: COSTOS DE PRODUCTOS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_product_costs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES wms_products(id) ON DELETE CASCADE,

    -- Costo base (sin impuestos, en moneda original)
    purchase_cost DECIMAL(15,4) NOT NULL DEFAULT 0,
    currency_id INTEGER REFERENCES wms_currencies(id),
    exchange_rate DECIMAL(15,6) DEFAULT 1,
    cost_in_local_currency DECIMAL(15,4),

    -- Costos adicionales
    freight_cost DECIMAL(15,4) DEFAULT 0,
    insurance_cost DECIMAL(15,4) DEFAULT 0,
    customs_cost DECIMAL(15,4) DEFAULT 0,
    other_costs DECIMAL(15,4) DEFAULT 0,
    other_costs_description TEXT,

    -- Subtotal antes de impuestos
    subtotal_before_tax DECIMAL(15,4),

    -- Total impuestos (calculado)
    total_taxes DECIMAL(15,4) DEFAULT 0,

    -- Costo final
    total_cost DECIMAL(15,4),

    -- Control de vigencia
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    is_current BOOLEAN DEFAULT true,

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    notes TEXT
);

-- Impuestos del costo (dinámico según plantilla fiscal)
CREATE TABLE IF NOT EXISTS wms_product_cost_taxes (
    id SERIAL PRIMARY KEY,
    product_cost_id INTEGER REFERENCES wms_product_costs(id) ON DELETE CASCADE,
    tax_rate_id INTEGER REFERENCES wms_tax_rates(id),
    tax_code VARCHAR(20) NOT NULL,
    tax_name VARCHAR(100),
    rate DECIMAL(10,4),
    base_amount DECIMAL(15,4),
    tax_amount DECIMAL(15,4),
    calculation_order INTEGER DEFAULT 1
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 6: LISTAS DE PRECIOS (Ilimitadas con Espejos)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_price_lists (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES wms_warehouses(id) ON DELETE CASCADE,

    -- Identificación
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- ═══════════════════════════════════════════════════════════════════
    -- SISTEMA DE ESPEJO
    -- ═══════════════════════════════════════════════════════════════════
    is_mirror BOOLEAN DEFAULT false,
    mirror_from_id INTEGER REFERENCES wms_price_lists(id),
    mirror_adjustment_type VARCHAR(20),
    -- PERCENTAGE: -10 = 10% menos, +5 = 5% más
    -- FIXED_AMOUNT: -100 = $100 menos
    mirror_adjustment_value DECIMAL(10,4),
    mirror_update_mode VARCHAR(20) DEFAULT 'AUTOMATIC',
    -- AUTOMATIC: actualiza al cambiar origen
    -- MANUAL: requiere confirmación

    -- ═══════════════════════════════════════════════════════════════════
    -- APLICACIÓN
    -- ═══════════════════════════════════════════════════════════════════
    applies_to VARCHAR(20) DEFAULT 'ALL',
    -- ALL, SELECTED_CATEGORIES, SELECTED_PRODUCTS
    currency_id INTEGER REFERENCES wms_currencies(id),

    -- ═══════════════════════════════════════════════════════════════════
    -- VIGENCIA
    -- ═══════════════════════════════════════════════════════════════════
    valid_from DATE,
    valid_to DATE,

    -- ═══════════════════════════════════════════════════════════════════
    -- REDONDEO INTELIGENTE
    -- ═══════════════════════════════════════════════════════════════════
    rounding_enabled BOOLEAN DEFAULT false,
    rounding_type VARCHAR(20) DEFAULT 'DECIMALS',
    -- NONE: sin redondeo
    -- DECIMALS: a X decimales
    -- NEAREST: al múltiplo más cercano
    -- UP: siempre hacia arriba
    -- DOWN: siempre hacia abajo
    rounding_decimals INTEGER DEFAULT 2,
    rounding_to_nearest DECIMAL(10,2),
    -- 0.50 = redondear a 0.50, 1 = enteros, 10 = decenas, 100 = centenas

    -- ═══════════════════════════════════════════════════════════════════
    -- CONFIGURACIÓN
    -- ═══════════════════════════════════════════════════════════════════
    tax_included BOOLEAN DEFAULT true,
    -- true: precios con impuestos incluidos
    -- false: precios sin impuestos

    show_in_pos BOOLEAN DEFAULT true,
    show_in_ecommerce BOOLEAN DEFAULT false,
    requires_authorization BOOLEAN DEFAULT false,

    priority INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(warehouse_id, code)
);

-- Categorías incluidas en una lista de precios (cuando applies_to = 'SELECTED_CATEGORIES')
CREATE TABLE IF NOT EXISTS wms_price_list_categories (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER REFERENCES wms_price_lists(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES wms_categories(id) ON DELETE CASCADE,
    include_children BOOLEAN DEFAULT true,
    UNIQUE(price_list_id, category_id)
);

-- Precios por producto
CREATE TABLE IF NOT EXISTS wms_product_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES wms_products(id) ON DELETE CASCADE,
    price_list_id INTEGER REFERENCES wms_price_lists(id) ON DELETE CASCADE,

    -- ═══════════════════════════════════════════════════════════════════
    -- PRECIO Y MARGEN
    -- ═══════════════════════════════════════════════════════════════════
    markup_percent DECIMAL(10,4),
    -- Porcentaje sobre costo

    net_price DECIMAL(15,4),
    -- Precio sin impuestos

    tax_amount DECIMAL(15,4),
    -- Impuestos calculados

    final_price DECIMAL(15,4),
    -- Precio final (con o sin impuestos según config de lista)

    price_per_pack DECIMAL(15,4),
    -- Precio por pack/bulto

    -- ═══════════════════════════════════════════════════════════════════
    -- MARGEN REAL (después de redondeo)
    -- ═══════════════════════════════════════════════════════════════════
    actual_margin_amount DECIMAL(15,4),
    actual_margin_percent DECIMAL(10,4),
    actual_margin_per_pack DECIMAL(15,4),

    -- ═══════════════════════════════════════════════════════════════════
    -- PRECIO SUGERIDO (antes de redondeo)
    -- ═══════════════════════════════════════════════════════════════════
    suggested_price DECIMAL(15,4),
    was_rounded BOOLEAN DEFAULT false,
    rounding_difference DECIMAL(15,4),

    -- ═══════════════════════════════════════════════════════════════════
    -- PROTECCIÓN DE PRECIO
    -- ═══════════════════════════════════════════════════════════════════
    is_price_locked BOOLEAN DEFAULT false,
    lock_expires_at TIMESTAMPTZ,
    lock_reason VARCHAR(200),

    -- ═══════════════════════════════════════════════════════════════════
    -- PRECIO MANUAL
    -- ═══════════════════════════════════════════════════════════════════
    is_manual_price BOOLEAN DEFAULT false,
    -- Si es true, no se recalcula automáticamente

    -- ═══════════════════════════════════════════════════════════════════
    -- AUDITORÍA
    -- ═══════════════════════════════════════════════════════════════════
    last_cost_used DECIMAL(15,4),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(100),

    UNIQUE(product_id, price_list_id)
);

-- Historial de precios
CREATE TABLE IF NOT EXISTS wms_product_price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES wms_products(id) ON DELETE CASCADE,
    price_list_id INTEGER REFERENCES wms_price_lists(id) ON DELETE CASCADE,

    old_price DECIMAL(15,4),
    new_price DECIMAL(15,4),
    old_cost DECIMAL(15,4),
    new_cost DECIMAL(15,4),
    old_margin_percent DECIMAL(10,4),
    new_margin_percent DECIMAL(10,4),

    change_type VARCHAR(20),
    -- MANUAL, COST_UPDATE, MASS_UPDATE, MIRROR_SYNC

    change_reason TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 7: PROMOCIONES Y BONIFICACIONES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_promotions (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES wms_warehouses(id) ON DELETE CASCADE,

    -- Identificación
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- ═══════════════════════════════════════════════════════════════════
    -- TIPO DE PROMOCIÓN
    -- ═══════════════════════════════════════════════════════════════════
    promotion_type VARCHAR(30) NOT NULL,
    -- PERCENTAGE_DISCOUNT: X% de descuento
    -- FIXED_DISCOUNT: $X de descuento
    -- BUY_X_GET_Y: Compra X lleva Y (2x1, 3x2, etc.)
    -- BUY_X_GET_Y_FREE: Compra X lleva Y gratis
    -- QUANTITY_DISCOUNT: Descuento por cantidad (>10 = 5%)
    -- TIERED_PRICING: Precios escalonados por cantidad
    -- BUNDLE: Pack/Combo a precio especial
    -- SECOND_UNIT: 2da unidad a X%
    -- HAPPY_HOUR: Descuento por horario

    -- ═══════════════════════════════════════════════════════════════════
    -- VALORES
    -- ═══════════════════════════════════════════════════════════════════
    discount_percent DECIMAL(10,4),
    discount_amount DECIMAL(15,4),
    buy_quantity INTEGER,
    get_quantity INTEGER,
    special_price DECIMAL(15,4),

    -- ═══════════════════════════════════════════════════════════════════
    -- LÍMITES
    -- ═══════════════════════════════════════════════════════════════════
    min_quantity DECIMAL(15,4),
    max_quantity DECIMAL(15,4),
    min_amount DECIMAL(15,4),
    max_discount_amount DECIMAL(15,4),
    max_uses_total INTEGER,
    max_uses_per_customer INTEGER,
    max_uses_per_transaction INTEGER,

    -- ═══════════════════════════════════════════════════════════════════
    -- VIGENCIA
    -- ═══════════════════════════════════════════════════════════════════
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    valid_days_of_week VARCHAR(20),
    -- '1,2,3,4,5' = Lunes a Viernes
    valid_time_from TIME,
    valid_time_to TIME,
    valid_until_stock_depleted BOOLEAN DEFAULT false,
    stock_for_promotion INTEGER,

    -- ═══════════════════════════════════════════════════════════════════
    -- APLICACIÓN
    -- ═══════════════════════════════════════════════════════════════════
    applies_to VARCHAR(20) NOT NULL DEFAULT 'SELECTED',
    -- ALL, SELECTED_CATEGORIES, SELECTED_PRODUCTS, SELECTED_BRANDS

    applies_to_price_lists VARCHAR(100),
    -- IDs de listas de precios donde aplica, vacío = todas

    is_combinable BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    requires_coupon BOOLEAN DEFAULT false,
    coupon_code VARCHAR(30),

    -- ═══════════════════════════════════════════════════════════════════
    -- ESTADO
    -- ═══════════════════════════════════════════════════════════════════
    is_active BOOLEAN DEFAULT true,
    current_uses INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),

    UNIQUE(warehouse_id, code)
);

-- Items a los que aplica la promoción
CREATE TABLE IF NOT EXISTS wms_promotion_items (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER REFERENCES wms_promotions(id) ON DELETE CASCADE,

    item_type VARCHAR(20) NOT NULL,
    -- PRODUCT, CATEGORY, BRAND, SUPPLIER

    product_id INTEGER REFERENCES wms_products(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES wms_categories(id) ON DELETE CASCADE,
    brand_id INTEGER REFERENCES wms_brands(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES wms_suppliers(id) ON DELETE CASCADE,

    -- Para promociones tipo BUNDLE
    quantity_required DECIMAL(15,4) DEFAULT 1,
    is_bonus_item BOOLEAN DEFAULT false
);

-- Escalas de descuento (para TIERED_PRICING y QUANTITY_DISCOUNT)
CREATE TABLE IF NOT EXISTS wms_promotion_tiers (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER REFERENCES wms_promotions(id) ON DELETE CASCADE,

    min_quantity DECIMAL(15,4) NOT NULL,
    max_quantity DECIMAL(15,4),

    discount_percent DECIMAL(10,4),
    discount_amount DECIMAL(15,4),
    unit_price DECIMAL(15,4),

    tier_name VARCHAR(50),

    UNIQUE(promotion_id, min_quantity)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 8: STOCK Y MOVIMIENTOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Stock por producto/depósito
CREATE TABLE IF NOT EXISTS wms_stock (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES wms_products(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES wms_warehouses(id) ON DELETE CASCADE,

    -- Cantidades
    quantity_on_hand DECIMAL(15,4) DEFAULT 0,
    quantity_reserved DECIMAL(15,4) DEFAULT 0,
    quantity_available DECIMAL(15,4) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    quantity_incoming DECIMAL(15,4) DEFAULT 0,
    quantity_in_transit DECIMAL(15,4) DEFAULT 0,

    -- Valorización
    average_cost DECIMAL(15,4) DEFAULT 0,
    total_value DECIMAL(15,4) DEFAULT 0,

    -- Control de inventario
    reorder_point DECIMAL(15,4),
    min_stock DECIMAL(15,4),
    max_stock DECIMAL(15,4),
    safety_stock DECIMAL(15,4),

    -- Estado
    inventory_status VARCHAR(20) DEFAULT 'ACTIVE',
    -- ACTIVE, BLOCKED, LOW, CRITICAL, OBSOLETE

    -- Auditoría
    last_count_date TIMESTAMPTZ,
    last_count_quantity DECIMAL(15,4),
    last_movement_date TIMESTAMPTZ,
    last_sale_date TIMESTAMPTZ,
    last_purchase_date TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(product_id, warehouse_id)
);

-- Lotes (para perecederos y trazabilidad)
CREATE TABLE IF NOT EXISTS wms_stock_batches (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER REFERENCES wms_stock(id) ON DELETE CASCADE,

    batch_number VARCHAR(50) NOT NULL,
    lot_number VARCHAR(50),
    serial_number VARCHAR(50),

    quantity DECIMAL(15,4) NOT NULL,
    quantity_reserved DECIMAL(15,4) DEFAULT 0,
    quantity_available DECIMAL(15,4) GENERATED ALWAYS AS (quantity - quantity_reserved) STORED,

    -- Fechas
    production_date DATE,
    expiry_date DATE,
    received_date DATE,

    -- Origen
    supplier_id INTEGER REFERENCES wms_suppliers(id),
    purchase_order_ref VARCHAR(50),
    invoice_ref VARCHAR(50),

    -- Costo específico del lote
    unit_cost DECIMAL(15,4),

    -- Estado
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    -- AVAILABLE, RESERVED, QUARANTINE, EXPIRED, DEPLETED

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movimientos de stock
CREATE TABLE IF NOT EXISTS wms_stock_movements (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES wms_warehouses(id),
    product_id INTEGER REFERENCES wms_products(id),
    stock_id INTEGER REFERENCES wms_stock(id),
    batch_id INTEGER REFERENCES wms_stock_batches(id),

    -- Tipo de movimiento
    movement_type VARCHAR(30) NOT NULL,
    -- PURCHASE: Compra
    -- SALE: Venta
    -- ADJUSTMENT_IN: Ajuste positivo
    -- ADJUSTMENT_OUT: Ajuste negativo
    -- TRANSFER_OUT: Transferencia saliente
    -- TRANSFER_IN: Transferencia entrante
    -- RETURN_FROM_CUSTOMER: Devolución de cliente
    -- RETURN_TO_SUPPLIER: Devolución a proveedor
    -- PRODUCTION_IN: Ingreso por producción
    -- PRODUCTION_OUT: Consumo en producción
    -- DAMAGE: Merma/Rotura
    -- EXPIRY: Vencimiento
    -- INITIAL: Stock inicial

    movement_date TIMESTAMPTZ DEFAULT NOW(),

    -- Cantidades
    quantity_before DECIMAL(15,4),
    quantity_moved DECIMAL(15,4),
    quantity_after DECIMAL(15,4),

    -- Costos y precios
    unit_cost DECIMAL(15,4),
    total_cost DECIMAL(15,4),
    unit_price DECIMAL(15,4),
    total_price DECIMAL(15,4),

    -- Referencias
    document_type VARCHAR(30),
    document_number VARCHAR(50),
    document_line INTEGER,

    -- Transferencias
    from_warehouse_id INTEGER REFERENCES wms_warehouses(id),
    to_warehouse_id INTEGER REFERENCES wms_warehouses(id),
    transfer_id INTEGER,

    -- Auditoría
    notes TEXT,
    user_id INTEGER,
    user_name VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 9: CUBICACIÓN Y UBICACIONES (Gestión de Góndolas)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Zonas del depósito
CREATE TABLE IF NOT EXISTS wms_warehouse_zones (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES wms_warehouses(id) ON DELETE CASCADE,

    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,

    zone_type VARCHAR(30) NOT NULL,
    -- STORAGE: Almacenamiento general
    -- SHOWROOM: Sala de ventas
    -- COLD: Cámara fría
    -- FROZEN: Cámara de congelados
    -- PICKING: Zona de preparación
    -- RECEIVING: Recepción
    -- SHIPPING: Despacho
    -- QUARANTINE: Cuarentena
    -- RETURNS: Devoluciones

    -- Dimensiones
    total_area_m2 DECIMAL(10,2),
    total_volume_m3 DECIMAL(10,2),
    usable_area_m2 DECIMAL(10,2),

    -- Control de temperatura
    temperature_controlled BOOLEAN DEFAULT false,
    temperature_min DECIMAL(5,2),
    temperature_max DECIMAL(5,2),
    humidity_min DECIMAL(5,2),
    humidity_max DECIMAL(5,2),

    -- Capacidad
    max_weight_kg DECIMAL(15,2),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(warehouse_id, code)
);

-- Ubicaciones específicas (estantes, góndolas, racks, bins)
CREATE TABLE IF NOT EXISTS wms_locations (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER REFERENCES wms_warehouse_zones(id) ON DELETE CASCADE,

    -- Código estructurado: Pasillo-Rack-Nivel-Posición
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100),
    barcode VARCHAR(50),

    location_type VARCHAR(30) NOT NULL,
    -- SHELF: Estante
    -- GONDOLA: Góndola de supermercado
    -- RACK: Rack industrial
    -- BIN: Contenedor/Caja
    -- FLOOR: Piso
    -- PALLET: Posición de pallet
    -- ENDCAP: Cabecera de góndola
    -- CHECKOUT: Línea de cajas

    -- Posición física
    aisle VARCHAR(10),
    rack VARCHAR(10),
    level VARCHAR(10),
    position VARCHAR(10),

    -- Dimensiones
    length_cm DECIMAL(10,2),
    width_cm DECIMAL(10,2),
    height_cm DECIMAL(10,2),
    max_weight_kg DECIMAL(10,2),
    volume_cm3 DECIMAL(15,2),

    -- Para góndolas/showroom
    facing_slots INTEGER,
    -- Cantidad de "caras" frontales disponibles

    is_prime_location BOOLEAN DEFAULT false,
    -- Ubicación premium (altura de ojos, cabecera, etc.)

    traffic_score INTEGER,
    -- 1-10 nivel de tráfico estimado

    -- Restricciones
    product_restrictions TEXT,
    -- JSON con restricciones: categorías permitidas, etc.

    is_pickable BOOLEAN DEFAULT true,
    is_storable BOOLEAN DEFAULT true,
    is_countable BOOLEAN DEFAULT true,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(zone_id, code)
);

-- Asignación de productos a ubicaciones (Planograma)
CREATE TABLE IF NOT EXISTS wms_location_assignments (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES wms_locations(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES wms_products(id) ON DELETE CASCADE,

    -- Cantidad asignada
    facings INTEGER DEFAULT 1,
    -- Cantidad de "caras" frontales asignadas

    depth INTEGER DEFAULT 1,
    -- Profundidad (productos detrás)

    stack_height INTEGER DEFAULT 1,
    -- Altura de apilamiento

    max_quantity INTEGER,
    min_quantity INTEGER,
    reorder_quantity INTEGER,

    -- Posición en el planograma
    position_x INTEGER,
    position_y INTEGER,
    position_z INTEGER,

    -- Espacio calculado
    space_used_cm3 DECIMAL(15,2),
    space_percent DECIMAL(5,2),

    -- Tipo de asignación
    is_permanent BOOLEAN DEFAULT false,
    is_promotional BOOLEAN DEFAULT false,

    valid_from DATE,
    valid_to DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 10: CONFIGURACIÓN DE CÓDIGOS COMPUESTOS (Balanzas)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_barcode_configs (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES wms_warehouses(id) ON DELETE CASCADE,

    config_name VARCHAR(50) NOT NULL,
    description TEXT,

    -- Estructura del código
    total_digits INTEGER NOT NULL DEFAULT 13,

    -- Prefijo
    prefix_start INTEGER DEFAULT 1,
    prefix_digits INTEGER DEFAULT 2,
    prefix_values VARCHAR(100),
    -- "20,21,22" = prefijos que activan esta configuración

    -- Código de artículo
    article_start INTEGER NOT NULL,
    article_digits INTEGER NOT NULL,

    -- Valor (peso o precio)
    value_start INTEGER NOT NULL,
    value_digits INTEGER NOT NULL,
    value_decimals INTEGER DEFAULT 3,
    value_type VARCHAR(20) NOT NULL,
    -- WEIGHT: el valor es peso en kg
    -- PRICE: el valor es precio
    -- QUANTITY: el valor es cantidad

    -- Dígito verificador
    has_checksum BOOLEAN DEFAULT true,
    checksum_position INTEGER,

    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(warehouse_id, config_name)
);

-- Insertar configuración estándar de balanzas Argentina
INSERT INTO wms_barcode_configs (
    warehouse_id, config_name, description, total_digits,
    prefix_start, prefix_digits, prefix_values,
    article_start, article_digits,
    value_start, value_digits, value_decimals, value_type,
    has_checksum, checksum_position, is_default
) VALUES (
    NULL, 'BALANZA_PESO_ARG', 'Balanzas Argentina - Peso', 13,
    1, 2, '20,21,22',
    3, 5,
    8, 5, 3, 'WEIGHT',
    true, 13, true
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 11: ÍNDICES PARA PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_wms_products_warehouse ON wms_products(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_products_category ON wms_products(category_id);
CREATE INDEX IF NOT EXISTS idx_wms_products_brand ON wms_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_wms_products_supplier ON wms_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_wms_products_barcode ON wms_products(barcode);
CREATE INDEX IF NOT EXISTS idx_wms_products_internal_code ON wms_products(internal_code);
CREATE INDEX IF NOT EXISTS idx_wms_products_name ON wms_products(name);
CREATE INDEX IF NOT EXISTS idx_wms_products_active ON wms_products(is_active);

CREATE INDEX IF NOT EXISTS idx_wms_product_barcodes_barcode ON wms_product_barcodes(barcode);
CREATE INDEX IF NOT EXISTS idx_wms_product_barcodes_product ON wms_product_barcodes(product_id);

CREATE INDEX IF NOT EXISTS idx_wms_stock_product ON wms_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_stock_warehouse ON wms_stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_stock_status ON wms_stock(inventory_status);

CREATE INDEX IF NOT EXISTS idx_wms_stock_batches_expiry ON wms_stock_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_wms_stock_batches_status ON wms_stock_batches(status);

CREATE INDEX IF NOT EXISTS idx_wms_stock_movements_product ON wms_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_stock_movements_warehouse ON wms_stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_stock_movements_date ON wms_stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_wms_stock_movements_type ON wms_stock_movements(movement_type);

CREATE INDEX IF NOT EXISTS idx_wms_product_prices_product ON wms_product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_product_prices_list ON wms_product_prices(price_list_id);

CREATE INDEX IF NOT EXISTS idx_wms_promotions_warehouse ON wms_promotions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_promotions_active ON wms_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_wms_promotions_dates ON wms_promotions(valid_from, valid_to);

CREATE INDEX IF NOT EXISTS idx_wms_categories_warehouse ON wms_categories(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_categories_parent ON wms_categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_wms_branches_company ON wms_branches(company_id);
CREATE INDEX IF NOT EXISTS idx_wms_warehouses_branch ON wms_warehouses(branch_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 12: FUNCIONES Y TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION wms_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar timestamp
DROP TRIGGER IF EXISTS trg_wms_products_updated ON wms_products;
CREATE TRIGGER trg_wms_products_updated
    BEFORE UPDATE ON wms_products
    FOR EACH ROW EXECUTE FUNCTION wms_update_timestamp();

DROP TRIGGER IF EXISTS trg_wms_stock_updated ON wms_stock;
CREATE TRIGGER trg_wms_stock_updated
    BEFORE UPDATE ON wms_stock
    FOR EACH ROW EXECUTE FUNCTION wms_update_timestamp();

DROP TRIGGER IF EXISTS trg_wms_price_lists_updated ON wms_price_lists;
CREATE TRIGGER trg_wms_price_lists_updated
    BEFORE UPDATE ON wms_price_lists
    FOR EACH ROW EXECUTE FUNCTION wms_update_timestamp();

-- Función para calcular volumen del producto
CREATE OR REPLACE FUNCTION wms_calculate_product_volume()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.length_cm IS NOT NULL AND NEW.width_cm IS NOT NULL AND NEW.height_cm IS NOT NULL THEN
        NEW.volume_cm3 = NEW.length_cm * NEW.width_cm * NEW.height_cm;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wms_products_volume ON wms_products;
CREATE TRIGGER trg_wms_products_volume
    BEFORE INSERT OR UPDATE ON wms_products
    FOR EACH ROW EXECUTE FUNCTION wms_calculate_product_volume();

-- Función para actualizar stock valorizado
CREATE OR REPLACE FUNCTION wms_update_stock_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_value = NEW.quantity_on_hand * COALESCE(NEW.average_cost, 0);

    -- Actualizar estado según niveles
    IF NEW.quantity_on_hand <= 0 THEN
        NEW.inventory_status = 'CRITICAL';
    ELSIF NEW.quantity_on_hand <= COALESCE(NEW.min_stock, 0) THEN
        NEW.inventory_status = 'LOW';
    ELSIF NEW.quantity_on_hand <= COALESCE(NEW.reorder_point, 0) THEN
        NEW.inventory_status = 'LOW';
    ELSE
        NEW.inventory_status = 'ACTIVE';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wms_stock_value ON wms_stock;
CREATE TRIGGER trg_wms_stock_value
    BEFORE INSERT OR UPDATE ON wms_stock
    FOR EACH ROW EXECUTE FUNCTION wms_update_stock_value();

-- Función para sincronizar precios espejo
CREATE OR REPLACE FUNCTION wms_sync_mirror_prices()
RETURNS TRIGGER AS $$
DECLARE
    mirror_list RECORD;
    adjustment DECIMAL(15,4);
    new_price DECIMAL(15,4);
BEGIN
    -- Buscar listas espejo de esta lista
    FOR mirror_list IN
        SELECT pl.*
        FROM wms_price_lists pl
        WHERE pl.mirror_from_id = NEW.price_list_id
        AND pl.is_mirror = true
        AND pl.mirror_update_mode = 'AUTOMATIC'
    LOOP
        -- Calcular ajuste
        IF mirror_list.mirror_adjustment_type = 'PERCENTAGE' THEN
            new_price = NEW.final_price * (1 + (mirror_list.mirror_adjustment_value / 100));
        ELSIF mirror_list.mirror_adjustment_type = 'FIXED_AMOUNT' THEN
            new_price = NEW.final_price + mirror_list.mirror_adjustment_value;
        ELSE
            new_price = NEW.final_price;
        END IF;

        -- Aplicar redondeo si está configurado
        IF mirror_list.rounding_enabled THEN
            IF mirror_list.rounding_type = 'NEAREST' AND mirror_list.rounding_to_nearest > 0 THEN
                new_price = ROUND(new_price / mirror_list.rounding_to_nearest) * mirror_list.rounding_to_nearest;
            ELSIF mirror_list.rounding_type = 'DECIMALS' THEN
                new_price = ROUND(new_price, mirror_list.rounding_decimals);
            END IF;
        END IF;

        -- Actualizar o insertar precio
        INSERT INTO wms_product_prices (
            product_id, price_list_id, final_price,
            last_cost_used, last_updated, updated_by
        ) VALUES (
            NEW.product_id, mirror_list.id, new_price,
            NEW.last_cost_used, NOW(), 'MIRROR_SYNC'
        )
        ON CONFLICT (product_id, price_list_id)
        DO UPDATE SET
            final_price = EXCLUDED.final_price,
            last_cost_used = EXCLUDED.last_cost_used,
            last_updated = EXCLUDED.last_updated,
            updated_by = EXCLUDED.updated_by
        WHERE wms_product_prices.is_manual_price = false
        AND wms_product_prices.is_price_locked = false;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wms_sync_mirror_prices ON wms_product_prices;
CREATE TRIGGER trg_wms_sync_mirror_prices
    AFTER INSERT OR UPDATE ON wms_product_prices
    FOR EACH ROW EXECUTE FUNCTION wms_sync_mirror_prices();

-- Función para actualizar full_path de categorías
CREATE OR REPLACE FUNCTION wms_update_category_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path VARCHAR(500);
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.full_path = NEW.name;
        NEW.level = 1;
    ELSE
        SELECT full_path, level INTO parent_path, NEW.level
        FROM wms_categories WHERE id = NEW.parent_id;

        NEW.full_path = parent_path || ' > ' || NEW.name;
        NEW.level = NEW.level + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wms_category_path ON wms_categories;
CREATE TRIGGER trg_wms_category_path
    BEFORE INSERT OR UPDATE ON wms_categories
    FOR EACH ROW EXECUTE FUNCTION wms_update_category_path();

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 13: VISTAS ÚTILES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Vista de productos con stock y precios
CREATE OR REPLACE VIEW wms_products_full_view AS
SELECT
    p.*,
    c.name AS category_name,
    c.full_path AS category_path,
    b.name AS brand_name,
    s.name AS supplier_name,
    u.code AS unit_code,
    u.name AS unit_name,
    st.quantity_on_hand,
    st.quantity_available,
    st.quantity_reserved,
    st.average_cost,
    st.total_value,
    st.inventory_status,
    st.reorder_point,
    st.min_stock,
    st.max_stock,
    pc.purchase_cost AS current_cost,
    pc.total_cost AS current_total_cost
FROM wms_products p
LEFT JOIN wms_categories c ON c.id = p.category_id
LEFT JOIN wms_brands b ON b.id = p.brand_id
LEFT JOIN wms_suppliers s ON s.id = p.supplier_id
LEFT JOIN wms_units_of_measure u ON u.id = p.unit_of_measure_id
LEFT JOIN wms_stock st ON st.product_id = p.id AND st.warehouse_id = p.warehouse_id
LEFT JOIN wms_product_costs pc ON pc.product_id = p.id AND pc.is_current = true;

-- Vista de stock crítico
CREATE OR REPLACE VIEW wms_stock_alerts_view AS
SELECT
    w.name AS warehouse_name,
    p.internal_code,
    p.name AS product_name,
    s.quantity_on_hand,
    s.quantity_available,
    s.reorder_point,
    s.min_stock,
    s.inventory_status,
    CASE
        WHEN s.quantity_on_hand <= 0 THEN 'SIN STOCK'
        WHEN s.quantity_on_hand <= COALESCE(s.min_stock, 0) THEN 'BAJO MÍNIMO'
        WHEN s.quantity_on_hand <= COALESCE(s.reorder_point, 0) THEN 'REPONER'
        ELSE 'OK'
    END AS alert_type
FROM wms_stock s
JOIN wms_products p ON p.id = s.product_id
JOIN wms_warehouses w ON w.id = s.warehouse_id
WHERE s.quantity_on_hand <= COALESCE(s.reorder_point, s.min_stock, 0)
   OR s.quantity_on_hand <= 0
ORDER BY s.quantity_on_hand ASC;

-- Vista de productos próximos a vencer
CREATE OR REPLACE VIEW wms_expiry_alerts_view AS
SELECT
    w.name AS warehouse_name,
    p.internal_code,
    p.name AS product_name,
    b.batch_number,
    b.lot_number,
    b.expiry_date,
    b.quantity AS batch_quantity,
    b.status AS batch_status,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
    CASE
        WHEN b.expiry_date <= CURRENT_DATE THEN 'VENCIDO'
        WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'VENCE EN 7 DÍAS'
        WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'VENCE EN 30 DÍAS'
        ELSE 'OK'
    END AS alert_type
FROM wms_stock_batches b
JOIN wms_stock s ON s.id = b.stock_id
JOIN wms_products p ON p.id = s.product_id
JOIN wms_warehouses w ON w.id = s.warehouse_id
WHERE b.expiry_date IS NOT NULL
  AND b.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
  AND b.quantity > 0
  AND b.status != 'DEPLETED'
ORDER BY b.expiry_date ASC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

-- Log de migración
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'MIGRACIÓN WMS COMPLETADA EXITOSAMENTE';
    RAISE NOTICE 'Fecha: %', NOW();
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Tablas creadas:';
    RAISE NOTICE '  - wms_currencies, wms_countries';
    RAISE NOTICE '  - wms_tax_templates, wms_tax_template_items, wms_tax_rates';
    RAISE NOTICE '  - wms_branches, wms_warehouses';
    RAISE NOTICE '  - wms_units_of_measure, wms_categories, wms_brands, wms_suppliers';
    RAISE NOTICE '  - wms_products, wms_product_barcodes, wms_product_kit_components';
    RAISE NOTICE '  - wms_product_costs, wms_product_cost_taxes';
    RAISE NOTICE '  - wms_price_lists, wms_price_list_categories, wms_product_prices, wms_product_price_history';
    RAISE NOTICE '  - wms_promotions, wms_promotion_items, wms_promotion_tiers';
    RAISE NOTICE '  - wms_stock, wms_stock_batches, wms_stock_movements';
    RAISE NOTICE '  - wms_warehouse_zones, wms_locations, wms_location_assignments';
    RAISE NOTICE '  - wms_barcode_configs';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════════════';
END $$;
