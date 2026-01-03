-- ============================================================================
-- FINANCE ENTERPRISE SSOT - Sistema Financiero Unificado
-- Migración: 20251231_create_finance_enterprise_system.sql
-- Versión: 1.0.0
-- Descripción: Sistema financiero completo inspirado en SAP FI/CO, Oracle, NetSuite
-- ============================================================================

-- ============================================
-- 1. PLAN DE CUENTAS (Chart of Accounts)
-- Estructura: 1XXX-7XXX Internacional
-- ============================================
CREATE TABLE IF NOT EXISTS finance_chart_of_accounts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),  -- NULL = plantilla global

    -- Código estructurado
    account_code VARCHAR(20) NOT NULL,
    account_number INTEGER NOT NULL,

    -- Jerarquía
    parent_id INTEGER REFERENCES finance_chart_of_accounts(id),
    level INTEGER NOT NULL DEFAULT 1,
    is_header BOOLEAN DEFAULT false,
    path VARCHAR(200),

    -- Descripción
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    description TEXT,

    -- Clasificación
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'order')),
    account_nature VARCHAR(10) NOT NULL CHECK (account_nature IN ('debit', 'credit')),

    -- Categorías para reportes
    bs_category VARCHAR(50),
    is_category VARCHAR(50),
    cf_category VARCHAR(50),

    -- Auto-posting
    auto_post_source VARCHAR(50),
    auto_post_type VARCHAR(50),

    -- Control
    requires_cost_center BOOLEAN DEFAULT false,
    requires_project BOOLEAN DEFAULT false,
    requires_aux_detail BOOLEAN DEFAULT false,

    -- Multi-moneda
    currency VARCHAR(3),
    is_foreign_currency BOOLEAN DEFAULT false,

    -- Presupuesto
    is_budgetable BOOLEAN DEFAULT true,
    budget_account_id INTEGER REFERENCES finance_chart_of_accounts(id),

    -- Estado
    is_active BOOLEAN DEFAULT true,
    blocked_for_posting BOOLEAN DEFAULT false,
    blocked_reason TEXT,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, account_code)
);

CREATE INDEX idx_finance_coa_company ON finance_chart_of_accounts(company_id);
CREATE INDEX idx_finance_coa_type ON finance_chart_of_accounts(account_type);
CREATE INDEX idx_finance_coa_parent ON finance_chart_of_accounts(parent_id);
CREATE INDEX idx_finance_coa_number ON finance_chart_of_accounts(account_number);

-- ============================================
-- 2. CENTROS DE COSTO (4 niveles jerárquicos)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_cost_centers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Código y jerarquía
    code VARCHAR(20) NOT NULL,
    parent_id INTEGER REFERENCES finance_cost_centers(id),
    level INTEGER NOT NULL DEFAULT 1,
    path VARCHAR(200),

    -- Descripción
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Tipo
    center_type VARCHAR(50) NOT NULL CHECK (center_type IN ('segment', 'profit_center', 'cost_center', 'project')),

    -- Responsable
    manager_id UUID REFERENCES users(user_id),
    department_id INTEGER REFERENCES departments(id),

    -- Control presupuestario
    has_budget BOOLEAN DEFAULT true,
    budget_control_type VARCHAR(20) DEFAULT 'warning' CHECK (budget_control_type IN ('warning', 'block', 'none')),

    -- Vigencia
    valid_from DATE,
    valid_until DATE,

    -- Estado
    is_active BOOLEAN DEFAULT true,
    allows_posting BOOLEAN DEFAULT true,

    -- Integración con módulos existentes
    payroll_entity_id INTEGER,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, code)
);

CREATE INDEX idx_finance_cc_company ON finance_cost_centers(company_id);
CREATE INDEX idx_finance_cc_parent ON finance_cost_centers(parent_id);
CREATE INDEX idx_finance_cc_type ON finance_cost_centers(center_type);

-- ============================================
-- 3. PERÍODOS FISCALES
-- ============================================
CREATE TABLE IF NOT EXISTS finance_fiscal_periods (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    fiscal_year INTEGER NOT NULL,
    period_number INTEGER NOT NULL,
    period_name VARCHAR(50),

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Estado
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked', 'adjustment')),

    -- Cierre
    closed_at TIMESTAMP,
    closed_by UUID REFERENCES users(user_id),

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, fiscal_year, period_number)
);

CREATE INDEX idx_finance_fp_company_year ON finance_fiscal_periods(company_id, fiscal_year);

-- ============================================
-- 4. DIMENSIONES CONTABLES (8 dimensiones Sage Intacct style)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_dimensions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Identificación
    dimension_number INTEGER NOT NULL CHECK (dimension_number BETWEEN 1 AND 8),
    dimension_name VARCHAR(100) NOT NULL,
    dimension_code VARCHAR(20) NOT NULL,

    -- Valores de la dimensión
    value_code VARCHAR(50) NOT NULL,
    value_name VARCHAR(200) NOT NULL,
    value_description TEXT,

    -- Jerarquía
    parent_value_id INTEGER REFERENCES finance_dimensions(id),

    -- Estado
    is_active BOOLEAN DEFAULT true,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, dimension_number, value_code)
);

CREATE INDEX idx_finance_dim_company ON finance_dimensions(company_id, dimension_number);

-- ============================================
-- 5. PRESUPUESTOS
-- ============================================
CREATE TABLE IF NOT EXISTS finance_budgets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Identificación
    budget_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Período
    fiscal_year INTEGER NOT NULL,
    budget_type VARCHAR(50) NOT NULL CHECK (budget_type IN ('annual', 'quarterly', 'monthly', 'rolling')),
    version INTEGER DEFAULT 1,

    -- Tipo
    category VARCHAR(50) NOT NULL CHECK (category IN ('operational', 'capital', 'cash_flow', 'master')),

    -- Base de generación
    generation_method VARCHAR(50) CHECK (generation_method IN ('manual', 'historical', 'zero_based', 'incremental')),
    base_year INTEGER,
    base_budget_id INTEGER REFERENCES finance_budgets(id),

    -- Ajustes globales
    inflation_rate DECIMAL(5,2) DEFAULT 0,
    growth_rate DECIMAL(5,2) DEFAULT 0,

    -- Moneda
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Totales
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_expense DECIMAL(15,2) DEFAULT 0,
    total_capex DECIMAL(15,2) DEFAULT 0,
    net_result DECIMAL(15,2) DEFAULT 0,

    -- Estado
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'closed')),

    -- Control
    allow_overspend BOOLEAN DEFAULT false,
    overspend_tolerance_percent DECIMAL(5,2) DEFAULT 0,
    control_level VARCHAR(20) DEFAULT 'warning' CHECK (control_level IN ('none', 'warning', 'block')),

    -- Aprobación
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, budget_code, fiscal_year, version)
);

CREATE INDEX idx_finance_budget_company ON finance_budgets(company_id, fiscal_year);
CREATE INDEX idx_finance_budget_status ON finance_budgets(status);

-- ============================================
-- 6. LÍNEAS DE PRESUPUESTO
-- ============================================
CREATE TABLE IF NOT EXISTS finance_budget_lines (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER NOT NULL REFERENCES finance_budgets(id) ON DELETE CASCADE,

    -- Cuenta y centro de costo
    account_id INTEGER NOT NULL REFERENCES finance_chart_of_accounts(id),
    cost_center_id INTEGER REFERENCES finance_cost_centers(id),

    -- Tipo
    line_type VARCHAR(20) NOT NULL CHECK (line_type IN ('revenue', 'expense', 'capex', 'transfer')),

    -- Montos por período (12 meses + ajuste)
    period_01 DECIMAL(15,2) DEFAULT 0,
    period_02 DECIMAL(15,2) DEFAULT 0,
    period_03 DECIMAL(15,2) DEFAULT 0,
    period_04 DECIMAL(15,2) DEFAULT 0,
    period_05 DECIMAL(15,2) DEFAULT 0,
    period_06 DECIMAL(15,2) DEFAULT 0,
    period_07 DECIMAL(15,2) DEFAULT 0,
    period_08 DECIMAL(15,2) DEFAULT 0,
    period_09 DECIMAL(15,2) DEFAULT 0,
    period_10 DECIMAL(15,2) DEFAULT 0,
    period_11 DECIMAL(15,2) DEFAULT 0,
    period_12 DECIMAL(15,2) DEFAULT 0,
    period_13 DECIMAL(15,2) DEFAULT 0,

    -- Total anual
    annual_total DECIMAL(15,2) DEFAULT 0,

    -- Base histórica
    historical_amount DECIMAL(15,2),
    historical_source VARCHAR(50),

    -- Ajustes
    inflation_adjustment DECIMAL(15,2) DEFAULT 0,
    growth_adjustment DECIMAL(15,2) DEFAULT 0,
    manual_adjustment DECIMAL(15,2) DEFAULT 0,

    -- Driver
    driver_type VARCHAR(50),
    driver_value DECIMAL(15,4),
    driver_unit_cost DECIMAL(15,4),

    -- Notas
    notes TEXT,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(budget_id, account_id, cost_center_id)
);

CREATE INDEX idx_finance_bl_budget ON finance_budget_lines(budget_id);
CREATE INDEX idx_finance_bl_account ON finance_budget_lines(account_id);

-- ============================================
-- 7. INVERSIONES (CAPEX)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_budget_investments (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER NOT NULL REFERENCES finance_budgets(id) ON DELETE CASCADE,

    -- Identificación
    investment_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Clasificación
    investment_type VARCHAR(50) NOT NULL CHECK (investment_type IN ('equipment', 'technology', 'infrastructure', 'intangible', 'other')),
    category VARCHAR(50),
    priority VARCHAR(20) CHECK (priority IN ('critical', 'high', 'medium', 'low')),

    -- Montos
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',

    -- Cronograma
    disbursement_schedule JSONB DEFAULT '{}',

    -- ROI
    expected_roi_percent DECIMAL(5,2),
    payback_months INTEGER,
    npv DECIMAL(15,2),
    irr DECIMAL(5,2),

    -- Impacto
    future_opex_impact DECIMAL(15,2),
    future_savings DECIMAL(15,2),

    -- Vinculación contable
    asset_account_id INTEGER REFERENCES finance_chart_of_accounts(id),
    expense_account_id INTEGER REFERENCES finance_chart_of_accounts(id),
    cost_center_id INTEGER REFERENCES finance_cost_centers(id),

    -- Estado
    status VARCHAR(20) DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed', 'cancelled')),

    -- Aprobación
    requires_board_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,

    -- Real vs Presupuesto
    actual_spent DECIMAL(15,2) DEFAULT 0,
    variance_amount DECIMAL(15,2) DEFAULT 0,
    variance_percent DECIMAL(5,2) DEFAULT 0,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(budget_id, investment_code)
);

CREATE INDEX idx_finance_inv_budget ON finance_budget_investments(budget_id);
CREATE INDEX idx_finance_inv_status ON finance_budget_investments(status);

-- ============================================
-- 8. TASAS DE INFLACIÓN
-- ============================================
CREATE TABLE IF NOT EXISTS finance_inflation_rates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),

    -- Período
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

    -- Tasas
    monthly_rate DECIMAL(8,4) NOT NULL,
    annual_rate DECIMAL(8,4),
    accumulated_rate DECIMAL(8,4),

    -- Fuente
    source VARCHAR(50) CHECK (source IN ('indec', 'bcra', 'manual', 'projected', 'api')),
    is_projected BOOLEAN DEFAULT false,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, year, month)
);

CREATE INDEX idx_finance_ir_year ON finance_inflation_rates(year, month);

-- ============================================
-- 9. ASIENTOS CONTABLES (Journal Entries)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_journal_entries (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Identificación
    entry_number VARCHAR(50) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL,

    -- Fechas
    entry_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    document_date DATE,

    -- Tipo
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('standard', 'adjustment', 'closing', 'opening', 'reversal', 'template')),
    source_type VARCHAR(50) CHECK (source_type IN ('manual', 'payroll', 'billing', 'procurement', 'bank', 'auto')),
    source_module VARCHAR(50),
    source_document_id INTEGER,
    source_document_number VARCHAR(100),

    -- Descripción
    description TEXT NOT NULL,
    reference VARCHAR(200),

    -- Moneda
    currency VARCHAR(3) NOT NULL DEFAULT 'ARS',
    exchange_rate DECIMAL(15,6) DEFAULT 1,

    -- Totales
    total_debit DECIMAL(15,2) NOT NULL,
    total_credit DECIMAL(15,2) NOT NULL,

    -- Estado
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed', 'pending_approval')),

    -- Aprobación
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,

    -- Reversión
    is_reversal BOOLEAN DEFAULT false,
    reversed_entry_id INTEGER REFERENCES finance_journal_entries(id),
    reversal_date DATE,

    -- Cierre
    is_closing_entry BOOLEAN DEFAULT false,

    -- Auditoría
    posted_at TIMESTAMP,
    posted_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, entry_number, fiscal_year)
);

CREATE INDEX idx_finance_je_company ON finance_journal_entries(company_id);
CREATE INDEX idx_finance_je_year ON finance_journal_entries(fiscal_year, fiscal_period);
CREATE INDEX idx_finance_je_status ON finance_journal_entries(status);
CREATE INDEX idx_finance_je_date ON finance_journal_entries(entry_date);
CREATE INDEX idx_finance_je_source ON finance_journal_entries(source_type, source_module);

-- ============================================
-- 10. LÍNEAS DE ASIENTO
-- ============================================
CREATE TABLE IF NOT EXISTS finance_journal_entry_lines (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER NOT NULL REFERENCES finance_journal_entries(id) ON DELETE CASCADE,

    -- Secuencia
    line_number INTEGER NOT NULL,

    -- Cuenta
    account_id INTEGER NOT NULL REFERENCES finance_chart_of_accounts(id),

    -- Centro de costo
    cost_center_id INTEGER REFERENCES finance_cost_centers(id),
    project_id INTEGER REFERENCES finance_cost_centers(id),

    -- Dimensiones (8)
    dimension_1 VARCHAR(50),
    dimension_2 VARCHAR(50),
    dimension_3 VARCHAR(50),
    dimension_4 VARCHAR(50),
    dimension_5 VARCHAR(50),
    dimension_6 VARCHAR(50),
    dimension_7 VARCHAR(50),
    dimension_8 VARCHAR(50),

    -- Auxiliar
    aux_type VARCHAR(50),
    aux_id INTEGER,
    aux_name VARCHAR(200),

    -- Montos
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,

    -- Moneda original
    original_currency VARCHAR(3),
    original_amount DECIMAL(15,2),
    exchange_rate DECIMAL(15,6),

    -- Descripción
    description TEXT,

    -- Presupuesto
    budget_id INTEGER REFERENCES finance_budgets(id),
    budget_line_id INTEGER REFERENCES finance_budget_lines(id),

    -- Reconciliación
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP,
    reconciliation_id INTEGER,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(journal_entry_id, line_number)
);

CREATE INDEX idx_finance_jel_entry ON finance_journal_entry_lines(journal_entry_id);
CREATE INDEX idx_finance_jel_account ON finance_journal_entry_lines(account_id);
CREATE INDEX idx_finance_jel_cc ON finance_journal_entry_lines(cost_center_id);

-- ============================================
-- 11. SALDOS DE CUENTAS (para consultas rápidas)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_account_balances (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    account_id INTEGER NOT NULL REFERENCES finance_chart_of_accounts(id),
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL,
    opening_debit DECIMAL(15,2) DEFAULT 0,
    opening_credit DECIMAL(15,2) DEFAULT 0,
    period_debit DECIMAL(15,2) DEFAULT 0,
    period_credit DECIMAL(15,2) DEFAULT 0,
    closing_debit DECIMAL(15,2) DEFAULT 0,
    closing_credit DECIMAL(15,2) DEFAULT 0,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    period_movement DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    last_transaction_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, account_id, fiscal_year, fiscal_period)
);

CREATE INDEX idx_finance_ab_company ON finance_account_balances(company_id, fiscal_year);
CREATE INDEX idx_finance_ab_account ON finance_account_balances(account_id);

-- ============================================
-- 12. EJECUCIÓN PRESUPUESTARIA
-- ============================================
CREATE TABLE IF NOT EXISTS finance_budget_execution (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Budget
    budget_id INTEGER NOT NULL REFERENCES finance_budgets(id),
    budget_line_id INTEGER REFERENCES finance_budget_lines(id),

    -- Cuenta y centro
    account_id INTEGER NOT NULL REFERENCES finance_chart_of_accounts(id),
    cost_center_id INTEGER REFERENCES finance_cost_centers(id),

    -- Período
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL,

    -- Montos
    budgeted_amount DECIMAL(15,2) DEFAULT 0,
    committed_amount DECIMAL(15,2) DEFAULT 0,
    actual_amount DECIMAL(15,2) DEFAULT 0,
    available_amount DECIMAL(15,2) DEFAULT 0,

    -- Varianza
    variance_amount DECIMAL(15,2) DEFAULT 0,
    variance_percent DECIMAL(5,2) DEFAULT 0,

    -- Estado
    status VARCHAR(20) DEFAULT 'ok' CHECK (status IN ('ok', 'warning', 'exceeded')),

    -- Auditoría
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(budget_id, account_id, cost_center_id, fiscal_period)
);

CREATE INDEX idx_finance_be_budget ON finance_budget_execution(budget_id);
CREATE INDEX idx_finance_be_period ON finance_budget_execution(fiscal_year, fiscal_period);

-- ============================================
-- 13. CUENTAS BANCARIAS
-- ============================================
CREATE TABLE IF NOT EXISTS finance_bank_accounts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Identificación
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(200) NOT NULL,

    -- Datos bancarios
    bank_name VARCHAR(200) NOT NULL,
    bank_branch VARCHAR(100),
    account_number VARCHAR(50) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('checking', 'savings', 'investment', 'credit_line')),

    -- Argentina específico
    cbu VARCHAR(22),
    alias VARCHAR(50),

    -- Moneda
    currency VARCHAR(3) NOT NULL DEFAULT 'ARS',

    -- Saldos
    current_balance DECIMAL(15,2) DEFAULT 0,
    available_balance DECIMAL(15,2) DEFAULT 0,
    last_balance_date DATE,

    -- Límites
    overdraft_limit DECIMAL(15,2) DEFAULT 0,
    credit_limit DECIMAL(15,2) DEFAULT 0,

    -- Vinculación contable
    ledger_account_id INTEGER REFERENCES finance_chart_of_accounts(id),

    -- Estado
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,

    -- Conciliación
    last_reconciliation_date DATE,
    last_statement_balance DECIMAL(15,2),

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, account_code)
);

CREATE INDEX idx_finance_ba_company ON finance_bank_accounts(company_id);
CREATE INDEX idx_finance_ba_currency ON finance_bank_accounts(currency);

-- ============================================
-- 14. TRANSACCIONES BANCARIAS
-- ============================================
CREATE TABLE IF NOT EXISTS finance_bank_transactions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    bank_account_id INTEGER NOT NULL REFERENCES finance_bank_accounts(id),

    -- Identificación
    transaction_number VARCHAR(50),
    transaction_date DATE NOT NULL,
    value_date DATE,

    -- Tipo
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee', 'interest', 'check', 'direct_debit')),

    -- Montos
    amount DECIMAL(15,2) NOT NULL,
    running_balance DECIMAL(15,2),

    -- Origen/Destino
    source_type VARCHAR(50),
    source_id INTEGER,
    source_name VARCHAR(200),
    counterpart_bank VARCHAR(200),
    counterpart_account VARCHAR(50),
    counterpart_cbu VARCHAR(22),

    -- Referencia a documentos
    source_document_type VARCHAR(50),
    source_document_id INTEGER,

    -- Check details
    check_number VARCHAR(50),
    check_date DATE,
    check_status VARCHAR(20),

    -- Conciliación
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP,
    reconciled_by UUID REFERENCES users(user_id),
    journal_entry_id INTEGER REFERENCES finance_journal_entries(id),
    bank_statement_line VARCHAR(100),

    -- Descripción
    description TEXT,
    reference VARCHAR(200),

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    imported_from VARCHAR(50),
    import_batch_id VARCHAR(50),

    UNIQUE(company_id, bank_account_id, transaction_number)
);

CREATE INDEX idx_finance_bt_account ON finance_bank_transactions(bank_account_id);
CREATE INDEX idx_finance_bt_date ON finance_bank_transactions(transaction_date);
CREATE INDEX idx_finance_bt_reconciled ON finance_bank_transactions(is_reconciled);
CREATE INDEX idx_finance_bt_type ON finance_bank_transactions(transaction_type);

-- ============================================
-- 15. FLUJO DE CAJA (Cash Flow Forecast)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_cash_flow_forecast (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Período
    forecast_date DATE NOT NULL,
    forecast_type VARCHAR(20) NOT NULL CHECK (forecast_type IN ('daily', 'weekly', 'monthly')),

    -- Saldos
    opening_balance DECIMAL(15,2) NOT NULL,

    -- Entradas
    inflows_receivables DECIMAL(15,2) DEFAULT 0,
    inflows_other DECIMAL(15,2) DEFAULT 0,
    total_inflows DECIMAL(15,2) DEFAULT 0,

    -- Salidas
    outflows_payables DECIMAL(15,2) DEFAULT 0,
    outflows_payroll DECIMAL(15,2) DEFAULT 0,
    outflows_taxes DECIMAL(15,2) DEFAULT 0,
    outflows_loans DECIMAL(15,2) DEFAULT 0,
    outflows_capex DECIMAL(15,2) DEFAULT 0,
    outflows_other DECIMAL(15,2) DEFAULT 0,
    total_outflows DECIMAL(15,2) DEFAULT 0,

    -- Resultado
    net_flow DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2) DEFAULT 0,

    -- Detalles
    details JSONB DEFAULT '{}',

    -- Estado
    is_actual BOOLEAN DEFAULT false,
    confidence_level DECIMAL(5,2),
    scenario VARCHAR(20) DEFAULT 'base' CHECK (scenario IN ('base', 'optimistic', 'pessimistic')),

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),

    UNIQUE(company_id, forecast_date, forecast_type, scenario)
);

CREATE INDEX idx_finance_cf_company ON finance_cash_flow_forecast(company_id);
CREATE INDEX idx_finance_cf_date ON finance_cash_flow_forecast(forecast_date);
CREATE INDEX idx_finance_cf_type ON finance_cash_flow_forecast(forecast_type);

-- ============================================
-- DATOS SEMILLA: Plan de Cuentas Estándar
-- ============================================
INSERT INTO finance_chart_of_accounts (company_id, account_code, account_number, level, is_header, name, name_en, account_type, account_nature, bs_category, cf_category)
VALUES
-- 1XXX ACTIVO
(NULL, '1', 1000, 1, true, 'ACTIVO', 'ASSETS', 'asset', 'debit', NULL, NULL),
(NULL, '1.1', 1100, 2, true, 'Activo Corriente', 'Current Assets', 'asset', 'debit', 'current_asset', NULL),
(NULL, '1.1.01', 1101, 3, true, 'Caja y Bancos', 'Cash and Banks', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.01.001', 1101001, 4, false, 'Caja', 'Cash', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.01.002', 1101002, 4, false, 'Banco Cuenta Corriente', 'Bank Checking Account', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.01.003', 1101003, 4, false, 'Banco Caja de Ahorro', 'Bank Savings Account', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.02', 1102, 3, true, 'Inversiones Temporarias', 'Short-term Investments', 'asset', 'debit', 'current_asset', 'investing'),
(NULL, '1.1.02.001', 1102001, 4, false, 'Plazos Fijos', 'Fixed Term Deposits', 'asset', 'debit', 'current_asset', 'investing'),
(NULL, '1.1.02.002', 1102002, 4, false, 'Fondos Comunes de Inversión', 'Mutual Funds', 'asset', 'debit', 'current_asset', 'investing'),
(NULL, '1.1.03', 1103, 3, true, 'Créditos por Ventas', 'Trade Receivables', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.03.001', 1103001, 4, false, 'Deudores por Ventas', 'Accounts Receivable', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.03.002', 1103002, 4, false, 'Documentos a Cobrar', 'Notes Receivable', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.03.003', 1103003, 4, false, 'Previsión Deudores Incobrables', 'Allowance for Bad Debts', 'asset', 'credit', 'current_asset', 'operating'),
(NULL, '1.1.04', 1104, 3, true, 'Otros Créditos', 'Other Receivables', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.04.001', 1104001, 4, false, 'Anticipos a Proveedores', 'Advances to Suppliers', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.04.002', 1104002, 4, false, 'Anticipos de Sueldos', 'Salary Advances', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.04.003', 1104003, 4, false, 'IVA Crédito Fiscal', 'VAT Input', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.05', 1105, 3, true, 'Bienes de Cambio', 'Inventory', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.05.001', 1105001, 4, false, 'Mercaderías', 'Merchandise', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.1.05.002', 1105002, 4, false, 'Materias Primas', 'Raw Materials', 'asset', 'debit', 'current_asset', 'operating'),
(NULL, '1.2', 1200, 2, true, 'Activo No Corriente', 'Non-Current Assets', 'asset', 'debit', 'non_current_asset', NULL),
(NULL, '1.2.01', 1201, 3, true, 'Bienes de Uso', 'Property, Plant and Equipment', 'asset', 'debit', 'fixed_asset', 'investing'),
(NULL, '1.2.01.001', 1201001, 4, false, 'Muebles y Útiles', 'Furniture and Fixtures', 'asset', 'debit', 'fixed_asset', 'investing'),
(NULL, '1.2.01.002', 1201002, 4, false, 'Equipos de Computación', 'Computer Equipment', 'asset', 'debit', 'fixed_asset', 'investing'),
(NULL, '1.2.01.003', 1201003, 4, false, 'Maquinarias', 'Machinery', 'asset', 'debit', 'fixed_asset', 'investing'),
(NULL, '1.2.01.004', 1201004, 4, false, 'Rodados', 'Vehicles', 'asset', 'debit', 'fixed_asset', 'investing'),
(NULL, '1.2.01.005', 1201005, 4, false, 'Inmuebles', 'Buildings', 'asset', 'debit', 'fixed_asset', 'investing'),
(NULL, '1.2.02', 1202, 3, true, 'Depreciaciones Acumuladas', 'Accumulated Depreciation', 'asset', 'credit', 'fixed_asset', NULL),
(NULL, '1.2.02.001', 1202001, 4, false, 'Dep. Acum. Muebles y Útiles', 'Accum. Depr. Furniture', 'asset', 'credit', 'fixed_asset', NULL),
(NULL, '1.2.02.002', 1202002, 4, false, 'Dep. Acum. Equipos de Computación', 'Accum. Depr. Computer Equipment', 'asset', 'credit', 'fixed_asset', NULL),
(NULL, '1.2.03', 1203, 3, true, 'Activos Intangibles', 'Intangible Assets', 'asset', 'debit', 'intangible_asset', 'investing'),
(NULL, '1.2.03.001', 1203001, 4, false, 'Software', 'Software', 'asset', 'debit', 'intangible_asset', 'investing'),
(NULL, '1.2.03.002', 1203002, 4, false, 'Patentes y Marcas', 'Patents and Trademarks', 'asset', 'debit', 'intangible_asset', 'investing'),

-- 2XXX PASIVO
(NULL, '2', 2000, 1, true, 'PASIVO', 'LIABILITIES', 'liability', 'credit', NULL, NULL),
(NULL, '2.1', 2100, 2, true, 'Pasivo Corriente', 'Current Liabilities', 'liability', 'credit', 'current_liability', NULL),
(NULL, '2.1.01', 2101, 3, true, 'Deudas Comerciales', 'Trade Payables', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.01.001', 2101001, 4, false, 'Proveedores', 'Accounts Payable', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.01.002', 2101002, 4, false, 'Documentos a Pagar', 'Notes Payable', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.02', 2102, 3, true, 'Deudas Fiscales', 'Tax Liabilities', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.02.001', 2102001, 4, false, 'IVA Débito Fiscal', 'VAT Output', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.02.002', 2102002, 4, false, 'Impuesto a las Ganancias a Pagar', 'Income Tax Payable', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.02.003', 2102003, 4, false, 'Ingresos Brutos a Pagar', 'Gross Income Tax Payable', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.03', 2103, 3, true, 'Deudas Sociales', 'Social Liabilities', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.03.001', 2103001, 4, false, 'Sueldos y Jornales a Pagar', 'Salaries Payable', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.03.002', 2103002, 4, false, 'Cargas Sociales a Pagar', 'Social Security Payable', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.03.003', 2103003, 4, false, 'Provisión SAC', 'Bonus Provision', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.03.004', 2103004, 4, false, 'Provisión Vacaciones', 'Vacation Provision', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.04', 2104, 3, true, 'Deudas Financieras', 'Financial Liabilities', 'liability', 'credit', 'current_liability', 'financing'),
(NULL, '2.1.04.001', 2104001, 4, false, 'Préstamos Bancarios CP', 'Short-term Bank Loans', 'liability', 'credit', 'current_liability', 'financing'),
(NULL, '2.1.04.002', 2104002, 4, false, 'Descubiertos Bancarios', 'Bank Overdrafts', 'liability', 'credit', 'current_liability', 'financing'),
(NULL, '2.1.05', 2105, 3, true, 'Otras Deudas', 'Other Liabilities', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.1.05.001', 2105001, 4, false, 'Anticipos de Clientes', 'Customer Advances', 'liability', 'credit', 'current_liability', 'operating'),
(NULL, '2.2', 2200, 2, true, 'Pasivo No Corriente', 'Non-Current Liabilities', 'liability', 'credit', 'non_current_liability', NULL),
(NULL, '2.2.01', 2201, 3, true, 'Deudas Financieras LP', 'Long-term Financial Liabilities', 'liability', 'credit', 'non_current_liability', 'financing'),
(NULL, '2.2.01.001', 2201001, 4, false, 'Préstamos Bancarios LP', 'Long-term Bank Loans', 'liability', 'credit', 'non_current_liability', 'financing'),
(NULL, '2.2.02', 2202, 3, true, 'Provisiones', 'Provisions', 'liability', 'credit', 'non_current_liability', NULL),
(NULL, '2.2.02.001', 2202001, 4, false, 'Provisión Indemnizaciones', 'Severance Provision', 'liability', 'credit', 'non_current_liability', NULL),

-- 3XXX PATRIMONIO NETO
(NULL, '3', 3000, 1, true, 'PATRIMONIO NETO', 'EQUITY', 'equity', 'credit', NULL, NULL),
(NULL, '3.1', 3100, 2, true, 'Capital', 'Capital', 'equity', 'credit', 'equity', 'financing'),
(NULL, '3.1.01', 3101, 3, false, 'Capital Social', 'Share Capital', 'equity', 'credit', 'equity', 'financing'),
(NULL, '3.1.02', 3102, 3, false, 'Aportes Irrevocables', 'Capital Contributions', 'equity', 'credit', 'equity', 'financing'),
(NULL, '3.2', 3200, 2, true, 'Reservas', 'Reserves', 'equity', 'credit', 'equity', NULL),
(NULL, '3.2.01', 3201, 3, false, 'Reserva Legal', 'Legal Reserve', 'equity', 'credit', 'equity', NULL),
(NULL, '3.2.02', 3202, 3, false, 'Reserva Facultativa', 'Optional Reserve', 'equity', 'credit', 'equity', NULL),
(NULL, '3.3', 3300, 2, true, 'Resultados', 'Retained Earnings', 'equity', 'credit', 'equity', NULL),
(NULL, '3.3.01', 3301, 3, false, 'Resultados Acumulados', 'Accumulated Earnings', 'equity', 'credit', 'equity', NULL),
(NULL, '3.3.02', 3302, 3, false, 'Resultado del Ejercicio', 'Current Year Earnings', 'equity', 'credit', 'equity', NULL),

-- 4XXX INGRESOS
(NULL, '4', 4000, 1, true, 'INGRESOS', 'REVENUES', 'revenue', 'credit', NULL, NULL),
(NULL, '4.1', 4100, 2, true, 'Ventas', 'Sales', 'revenue', 'credit', NULL, 'operating'),
(NULL, '4.1.01', 4101, 3, false, 'Ventas de Servicios', 'Service Revenue', 'revenue', 'credit', NULL, 'operating'),
(NULL, '4.1.02', 4102, 3, false, 'Ventas de Productos', 'Product Revenue', 'revenue', 'credit', NULL, 'operating'),
(NULL, '4.1.03', 4103, 3, false, 'Descuentos Otorgados', 'Sales Discounts', 'revenue', 'debit', NULL, 'operating'),
(NULL, '4.2', 4200, 2, true, 'Otros Ingresos Operativos', 'Other Operating Income', 'revenue', 'credit', NULL, 'operating'),
(NULL, '4.2.01', 4201, 3, false, 'Recupero de Gastos', 'Expense Recovery', 'revenue', 'credit', NULL, 'operating'),
(NULL, '4.3', 4300, 2, true, 'Ingresos Financieros', 'Financial Income', 'revenue', 'credit', NULL, 'operating'),
(NULL, '4.3.01', 4301, 3, false, 'Intereses Ganados', 'Interest Income', 'revenue', 'credit', NULL, 'operating'),
(NULL, '4.3.02', 4302, 3, false, 'Diferencia de Cambio Positiva', 'Foreign Exchange Gain', 'revenue', 'credit', NULL, 'operating'),

-- 5XXX GASTOS
(NULL, '5', 5000, 1, true, 'GASTOS', 'EXPENSES', 'expense', 'debit', NULL, NULL),
(NULL, '5.1', 5100, 2, true, 'Gastos de Personal', 'Personnel Expenses', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.1.01', 5101, 3, false, 'Sueldos y Jornales', 'Salaries and Wages', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.1.02', 5102, 3, false, 'Cargas Sociales', 'Social Security Contributions', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.1.03', 5103, 3, false, 'SAC', 'Annual Bonus', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.1.04', 5104, 3, false, 'Vacaciones', 'Vacation Expense', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.1.05', 5105, 3, false, 'Indemnizaciones', 'Severance', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.1.06', 5106, 3, false, 'Capacitación', 'Training', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.2', 5200, 2, true, 'Gastos Generales', 'General Expenses', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.2.01', 5201, 3, false, 'Alquileres', 'Rent', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.2.02', 5202, 3, false, 'Expensas', 'Building Expenses', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.2.03', 5203, 3, false, 'Seguros', 'Insurance', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.2.04', 5204, 3, false, 'Mantenimiento', 'Maintenance', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.2.05', 5205, 3, false, 'Papelería y Útiles', 'Office Supplies', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.3', 5300, 2, true, 'Servicios', 'Services', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.3.01', 5301, 3, false, 'Electricidad', 'Electricity', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.3.02', 5302, 3, false, 'Gas', 'Gas', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.3.03', 5303, 3, false, 'Agua', 'Water', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.3.04', 5304, 3, false, 'Teléfono e Internet', 'Phone and Internet', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.3.05', 5305, 3, false, 'Servicios Profesionales', 'Professional Services', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.4', 5400, 2, true, 'Impuestos y Tasas', 'Taxes and Fees', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.4.01', 5401, 3, false, 'Ingresos Brutos', 'Gross Income Tax', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.4.02', 5402, 3, false, 'Tasas Municipales', 'Municipal Fees', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.4.03', 5403, 3, false, 'Impuesto a los Débitos y Créditos', 'Bank Transaction Tax', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.5', 5500, 2, true, 'Depreciaciones', 'Depreciation', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.5.01', 5501, 3, false, 'Depreciación Bienes de Uso', 'PP&E Depreciation', 'expense', 'debit', NULL, 'operating'),
(NULL, '5.5.02', 5502, 3, false, 'Amortización Intangibles', 'Intangible Amortization', 'expense', 'debit', NULL, 'operating'),

-- 6XXX OTROS RESULTADOS
(NULL, '6', 6000, 1, true, 'OTROS RESULTADOS', 'OTHER RESULTS', 'expense', 'debit', NULL, NULL),
(NULL, '6.1', 6100, 2, true, 'Resultados Financieros', 'Financial Results', 'expense', 'debit', NULL, 'operating'),
(NULL, '6.1.01', 6101, 3, false, 'Intereses Pagados', 'Interest Expense', 'expense', 'debit', NULL, 'operating'),
(NULL, '6.1.02', 6102, 3, false, 'Comisiones Bancarias', 'Bank Fees', 'expense', 'debit', NULL, 'operating'),
(NULL, '6.1.03', 6103, 3, false, 'Diferencia de Cambio Negativa', 'Foreign Exchange Loss', 'expense', 'debit', NULL, 'operating'),
(NULL, '6.2', 6200, 2, true, 'Resultados Extraordinarios', 'Extraordinary Items', 'expense', 'debit', NULL, 'operating'),
(NULL, '6.2.01', 6201, 3, false, 'Resultado Venta Bienes de Uso', 'Gain/Loss on Asset Disposal', 'expense', 'debit', NULL, 'investing'),

-- 7XXX CUENTAS DE ORDEN
(NULL, '7', 7000, 1, true, 'CUENTAS DE ORDEN', 'MEMORANDUM ACCOUNTS', 'order', 'debit', NULL, NULL),
(NULL, '7.1', 7100, 2, true, 'Contingencias', 'Contingencies', 'order', 'debit', NULL, NULL),
(NULL, '7.1.01', 7101, 3, false, 'Garantías Otorgadas', 'Guarantees Given', 'order', 'debit', NULL, NULL),
(NULL, '7.1.02', 7102, 3, false, 'Acreedores por Garantías', 'Guarantees Liability', 'order', 'credit', NULL, NULL)

ON CONFLICT (company_id, account_code) DO NOTHING;

-- ============================================
-- FUNCIONES DE AYUDA
-- ============================================

-- Función para generar número de asiento
CREATE OR REPLACE FUNCTION finance_next_entry_number(p_company_id INTEGER, p_fiscal_year INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_next INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 3) AS INTEGER)), 0) + 1
    INTO v_next
    FROM finance_journal_entries
    WHERE company_id = p_company_id
    AND fiscal_year = p_fiscal_year;

    RETURN 'JE' || LPAD(v_next::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para calcular saldo de cuenta
CREATE OR REPLACE FUNCTION finance_get_account_balance(
    p_company_id INTEGER,
    p_account_id INTEGER,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_balance DECIMAL(15,2);
    v_account_nature VARCHAR(10);
BEGIN
    SELECT account_nature INTO v_account_nature
    FROM finance_chart_of_accounts WHERE id = p_account_id;

    SELECT COALESCE(SUM(
        CASE WHEN v_account_nature = 'debit'
             THEN debit_amount - credit_amount
             ELSE credit_amount - debit_amount
        END
    ), 0)
    INTO v_balance
    FROM finance_journal_entry_lines jel
    JOIN finance_journal_entries je ON je.id = jel.journal_entry_id
    WHERE je.company_id = p_company_id
    AND jel.account_id = p_account_id
    AND je.status = 'posted'
    AND je.posting_date <= p_as_of_date;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar balance de asiento
CREATE OR REPLACE FUNCTION finance_check_entry_balance(p_entry_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_debit DECIMAL(15,2);
    v_credit DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
    INTO v_debit, v_credit
    FROM finance_journal_entry_lines
    WHERE journal_entry_id = p_entry_id;

    RETURN v_debit = v_credit;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular ejecución presupuestaria
CREATE OR REPLACE FUNCTION finance_calculate_budget_execution(
    p_budget_id INTEGER,
    p_period INTEGER DEFAULT NULL
)
RETURNS TABLE(
    account_id INTEGER,
    cost_center_id INTEGER,
    budgeted DECIMAL(15,2),
    actual DECIMAL(15,2),
    variance DECIMAL(15,2),
    variance_pct DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bl.account_id,
        bl.cost_center_id,
        CASE WHEN p_period IS NULL THEN bl.annual_total
             ELSE (
                CASE p_period
                    WHEN 1 THEN bl.period_01
                    WHEN 2 THEN bl.period_02
                    WHEN 3 THEN bl.period_03
                    WHEN 4 THEN bl.period_04
                    WHEN 5 THEN bl.period_05
                    WHEN 6 THEN bl.period_06
                    WHEN 7 THEN bl.period_07
                    WHEN 8 THEN bl.period_08
                    WHEN 9 THEN bl.period_09
                    WHEN 10 THEN bl.period_10
                    WHEN 11 THEN bl.period_11
                    WHEN 12 THEN bl.period_12
                    ELSE bl.period_13
                END
             )
        END AS budgeted,
        COALESCE((
            SELECT SUM(
                CASE WHEN coa.account_nature = 'debit'
                     THEN jel.debit_amount - jel.credit_amount
                     ELSE jel.credit_amount - jel.debit_amount
                END
            )
            FROM finance_journal_entry_lines jel
            JOIN finance_journal_entries je ON je.id = jel.journal_entry_id
            JOIN finance_chart_of_accounts coa ON coa.id = jel.account_id
            WHERE je.company_id = b.company_id
            AND jel.account_id = bl.account_id
            AND (bl.cost_center_id IS NULL OR jel.cost_center_id = bl.cost_center_id)
            AND je.status = 'posted'
            AND je.fiscal_year = b.fiscal_year
            AND (p_period IS NULL OR je.fiscal_period <= p_period)
        ), 0) AS actual,
        0::DECIMAL(15,2) AS variance,
        0::DECIMAL(5,2) AS variance_pct
    FROM finance_budget_lines bl
    JOIN finance_budgets b ON b.id = bl.budget_id
    WHERE bl.budget_id = p_budget_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER para actualizar saldos
-- ============================================
CREATE OR REPLACE FUNCTION finance_update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Actualizar saldo de la cuenta
        INSERT INTO finance_account_balances (
            company_id, account_id, cost_center_id, fiscal_year, fiscal_period,
            period_debit, period_credit
        )
        SELECT
            je.company_id,
            NEW.account_id,
            NEW.cost_center_id,
            je.fiscal_year,
            je.fiscal_period,
            NEW.debit_amount,
            NEW.credit_amount
        FROM finance_journal_entries je
        WHERE je.id = NEW.journal_entry_id
        AND je.status = 'posted'
        ON CONFLICT (company_id, account_id, cost_center_id, fiscal_year, fiscal_period)
        DO UPDATE SET
            period_debit = finance_account_balances.period_debit + EXCLUDED.period_debit,
            period_credit = finance_account_balances.period_credit + EXCLUDED.period_credit,
            closing_balance = finance_account_balances.opening_balance +
                finance_account_balances.period_debit + EXCLUDED.period_debit -
                finance_account_balances.period_credit - EXCLUDED.period_credit,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (comentado por defecto para no afectar performance)
-- CREATE TRIGGER trg_finance_update_balance
-- AFTER INSERT OR UPDATE ON finance_journal_entry_lines
-- FOR EACH ROW EXECUTE FUNCTION finance_update_account_balance();

-- ============================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_finance_je_company_year_period
    ON finance_journal_entries(company_id, fiscal_year, fiscal_period);

CREATE INDEX IF NOT EXISTS idx_finance_jel_account_cc
    ON finance_journal_entry_lines(account_id, cost_center_id);

CREATE INDEX IF NOT EXISTS idx_finance_bt_company_date
    ON finance_bank_transactions(company_id, transaction_date DESC);

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================
COMMENT ON TABLE finance_chart_of_accounts IS 'Plan de cuentas contable con estructura jerárquica 1XXX-7XXX';
COMMENT ON TABLE finance_cost_centers IS 'Centros de costo con 4 niveles: Segment > Profit Center > Cost Center > Project';
COMMENT ON TABLE finance_journal_entries IS 'Asientos contables con soporte multi-moneda y auto-posting';
COMMENT ON TABLE finance_budgets IS 'Presupuestos con soporte para inflación, inversiones y generación histórica';
COMMENT ON TABLE finance_bank_accounts IS 'Cuentas bancarias con soporte para conciliación y CBU/alias';
COMMENT ON TABLE finance_cash_flow_forecast IS 'Proyecciones de flujo de caja con múltiples escenarios';
