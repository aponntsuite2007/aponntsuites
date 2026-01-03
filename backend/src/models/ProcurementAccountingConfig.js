/**
 * ProcurementAccountingConfig Model
 * Configuración de cuentas contables por tipo de compra
 * Integra Procurement con Finance para auto-posting
 * Módulo Procurement - Gestión de Compras P2P
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementAccountingConfig = sequelize.define('ProcurementAccountingConfig', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'id' }
        },

        // Tipo de compra
        purchase_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            validate: {
                isIn: [['goods', 'services', 'assets', 'consumables', 'raw_materials', 'utilities', 'other']]
            }
        },

        // Categoría (opcional, para mayor detalle)
        category_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_categories', key: 'id' }
        },

        // Cuentas contables por defecto
        expense_account_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a finance_chart_of_accounts - Cuenta de Gasto'
        },
        asset_account_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a finance_chart_of_accounts - Cuenta de Activo (si capitaliza)'
        },
        liability_account_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a finance_chart_of_accounts - Cuenta de Proveedor'
        },
        tax_account_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a finance_chart_of_accounts - IVA Crédito Fiscal'
        },

        // Centro de costo por defecto
        default_cost_center_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a finance_cost_centers'
        },

        // Configuración de capitalización
        capitalize_threshold: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto mínimo para capitalizar como activo'
        },
        depreciation_method: {
            type: DataTypes.STRING(30),
            validate: {
                isIn: [['straight_line', 'declining_balance', 'units_of_production', null]]
            }
        },
        useful_life_months: {
            type: DataTypes.INTEGER
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'procurement_accounting_config',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['company_id', 'purchase_type', 'category_id'] },
            { fields: ['company_id', 'purchase_type', 'is_active'] }
        ]
    });

    // Obtener configuración de cuentas para un tipo de compra
    ProcurementAccountingConfig.getForPurchase = async function(companyId, purchaseType, categoryId = null) {
        // Primero buscar con categoría específica
        if (categoryId) {
            const specific = await this.findOne({
                where: {
                    company_id: companyId,
                    purchase_type: purchaseType,
                    category_id: categoryId,
                    is_active: true
                }
            });
            if (specific) return specific;
        }

        // Si no hay específico, buscar general (sin categoría)
        return this.findOne({
            where: {
                company_id: companyId,
                purchase_type: purchaseType,
                category_id: null,
                is_active: true
            }
        });
    };

    // Obtener cuenta contable según monto y tipo
    ProcurementAccountingConfig.prototype.getAccountForAmount = function(amount) {
        // Si supera el umbral de capitalización, usar cuenta de activo
        if (this.capitalize_threshold && amount >= parseFloat(this.capitalize_threshold)) {
            return {
                account_id: this.asset_account_id,
                account_type: 'asset',
                should_capitalize: true,
                depreciation_method: this.depreciation_method,
                useful_life_months: this.useful_life_months
            };
        }

        // Si no, usar cuenta de gasto
        return {
            account_id: this.expense_account_id,
            account_type: 'expense',
            should_capitalize: false
        };
    };

    // Generar asiento contable para una factura de compra
    ProcurementAccountingConfig.prototype.generateJournalEntryLines = function(invoice) {
        const lines = [];
        const accountInfo = this.getAccountForAmount(invoice.subtotal);

        // Línea 1: Débito a Gasto o Activo
        lines.push({
            account_id: accountInfo.account_id,
            debit_amount: invoice.subtotal,
            credit_amount: 0,
            cost_center_id: this.default_cost_center_id,
            description: `Compra - ${invoice.invoice_number}`
        });

        // Línea 2: Débito a IVA Crédito Fiscal
        if (invoice.tax_amount && this.tax_account_id) {
            lines.push({
                account_id: this.tax_account_id,
                debit_amount: invoice.tax_amount,
                credit_amount: 0,
                description: `IVA CF - ${invoice.invoice_number}`
            });
        }

        // Línea 3: Crédito a Proveedor
        if (this.liability_account_id) {
            lines.push({
                account_id: this.liability_account_id,
                debit_amount: 0,
                credit_amount: invoice.total_amount,
                aux_type: 'supplier',
                aux_id: invoice.supplier_id,
                description: `Proveedor - ${invoice.invoice_number}`
            });
        }

        return {
            lines,
            metadata: {
                should_capitalize: accountInfo.should_capitalize,
                depreciation_method: accountInfo.depreciation_method,
                useful_life_months: accountInfo.useful_life_months
            }
        };
    };

    // Inicializar configuración por defecto para una empresa
    ProcurementAccountingConfig.initializeDefaults = async function(companyId, accountIds = {}) {
        const defaults = [
            {
                purchase_type: 'goods',
                expense_account_id: accountIds.goods_expense || null,
                asset_account_id: accountIds.inventory || null,
                liability_account_id: accountIds.suppliers || null,
                tax_account_id: accountIds.vat_credit || null,
                capitalize_threshold: null
            },
            {
                purchase_type: 'services',
                expense_account_id: accountIds.services_expense || null,
                liability_account_id: accountIds.suppliers || null,
                tax_account_id: accountIds.vat_credit || null,
                capitalize_threshold: null
            },
            {
                purchase_type: 'assets',
                expense_account_id: accountIds.assets_expense || null,
                asset_account_id: accountIds.fixed_assets || null,
                liability_account_id: accountIds.suppliers || null,
                tax_account_id: accountIds.vat_credit || null,
                capitalize_threshold: 50000,
                depreciation_method: 'straight_line',
                useful_life_months: 60
            },
            {
                purchase_type: 'consumables',
                expense_account_id: accountIds.consumables_expense || null,
                liability_account_id: accountIds.suppliers || null,
                tax_account_id: accountIds.vat_credit || null,
                capitalize_threshold: null
            },
            {
                purchase_type: 'raw_materials',
                expense_account_id: accountIds.raw_materials_expense || null,
                asset_account_id: accountIds.raw_materials_inventory || null,
                liability_account_id: accountIds.suppliers || null,
                tax_account_id: accountIds.vat_credit || null,
                capitalize_threshold: null
            },
            {
                purchase_type: 'utilities',
                expense_account_id: accountIds.utilities_expense || null,
                liability_account_id: accountIds.suppliers || null,
                tax_account_id: accountIds.vat_credit || null,
                capitalize_threshold: null
            }
        ];

        for (const config of defaults) {
            await this.findOrCreate({
                where: {
                    company_id: companyId,
                    purchase_type: config.purchase_type,
                    category_id: null
                },
                defaults: {
                    ...config,
                    company_id: companyId
                }
            });
        }
    };

    return ProcurementAccountingConfig;
};
