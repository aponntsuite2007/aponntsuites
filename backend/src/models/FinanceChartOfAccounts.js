/**
 * FinanceChartOfAccounts Model
 * Plan de Cuentas profesional con estructura internacional 1XXX-7XXX
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceChartOfAccounts = sequelize.define('FinanceChartOfAccounts', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'companies', key: 'company_id' },
            comment: 'NULL para cuentas template globales'
        },
        account_code: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'Código estructurado: 1.1.01.001'
        },
        account_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Número para ordenamiento: 1101001'
        },
        parent_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '1=Tipo, 2=Mayor, 3=SubMayor, 4=Auxiliar'
        },
        is_header: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'true=grupo/encabezado, false=cuenta imputables'
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        name_en: {
            type: DataTypes.STRING(200),
            comment: 'Nombre en inglés para reportes internacionales'
        },
        description: {
            type: DataTypes.TEXT
        },
        account_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['asset', 'liability', 'equity', 'revenue', 'expense', 'order']]
            }
        },
        account_nature: {
            type: DataTypes.STRING(10),
            allowNull: false,
            validate: {
                isIn: [['debit', 'credit']]
            }
        },
        bs_category: {
            type: DataTypes.STRING(50),
            comment: 'Categoría Balance: current_asset, fixed_asset, current_liability, etc.'
        },
        is_category: {
            type: DataTypes.STRING(50),
            comment: 'Categoría Estado de Resultados: operating_revenue, operating_expense, financial'
        },
        cf_category: {
            type: DataTypes.STRING(50),
            comment: 'Categoría Cash Flow: operating, investing, financing'
        },
        auto_post_source: {
            type: DataTypes.STRING(50),
            comment: 'Fuente auto-posting: payroll, billing, procurement, bank, NULL'
        },
        auto_post_type: {
            type: DataTypes.STRING(50),
            comment: 'Tipo auto-posting: debit, credit, NULL'
        },
        requires_cost_center: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        requires_project: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        requires_aux_detail: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Requiere detalle auxiliar: proveedor, cliente, empleado'
        },
        currency: {
            type: DataTypes.STRING(3),
            comment: 'NULL=moneda empresa, USD=solo USD'
        },
        is_foreign_currency: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_budgetable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        budget_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_chart_of_accounts', key: 'id' },
            comment: 'Cuenta presupuestaria vinculada'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        blocked_for_posting: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        blocked_reason: {
            type: DataTypes.TEXT
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'finance_chart_of_accounts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id', 'account_code'] },
            { fields: ['company_id', 'account_type'] },
            { fields: ['parent_id'] },
            { fields: ['account_number'] }
        ]
    });

    // Obtener path completo de la cuenta
    FinanceChartOfAccounts.prototype.getFullPath = async function() {
        const path = [this.name];
        let current = this;

        while (current.parent_id) {
            current = await FinanceChartOfAccounts.findByPk(current.parent_id);
            if (current) {
                path.unshift(current.name);
            } else {
                break;
            }
        }

        return path.join(' > ');
    };

    // Obtener todas las cuentas hijas (recursivo)
    FinanceChartOfAccounts.prototype.getAllChildren = async function() {
        const children = await FinanceChartOfAccounts.findAll({
            where: { parent_id: this.id }
        });

        let allChildren = [...children];
        for (const child of children) {
            const grandChildren = await child.getAllChildren();
            allChildren = allChildren.concat(grandChildren);
        }

        return allChildren;
    };

    // Verificar si es cuenta imputable (sin hijos)
    FinanceChartOfAccounts.prototype.isPostable = async function() {
        if (this.is_header) return false;
        if (this.blocked_for_posting) return false;

        const childCount = await FinanceChartOfAccounts.count({
            where: { parent_id: this.id }
        });

        return childCount === 0;
    };

    // Obtener cuentas por tipo
    FinanceChartOfAccounts.getByType = async function(companyId, accountType) {
        return this.findAll({
            where: {
                company_id: companyId,
                account_type: accountType,
                is_active: true
            },
            order: [['account_number', 'ASC']]
        });
    };

    // Obtener cuentas imputables
    FinanceChartOfAccounts.getPostable = async function(companyId) {
        return this.findAll({
            where: {
                company_id: companyId,
                is_header: false,
                blocked_for_posting: false,
                is_active: true
            },
            order: [['account_number', 'ASC']]
        });
    };

    // Obtener estructura jerárquica
    FinanceChartOfAccounts.getHierarchy = async function(companyId, parentId = null) {
        const accounts = await this.findAll({
            where: {
                company_id: companyId,
                parent_id: parentId,
                is_active: true
            },
            order: [['account_number', 'ASC']]
        });

        const result = [];
        for (const account of accounts) {
            const children = await this.getHierarchy(companyId, account.id);
            result.push({
                ...account.toJSON(),
                children
            });
        }

        return result;
    };

    // Buscar cuenta por código
    FinanceChartOfAccounts.findByCode = async function(companyId, accountCode) {
        return this.findOne({
            where: { company_id: companyId, account_code: accountCode }
        });
    };

    // Obtener cuentas para auto-posting
    FinanceChartOfAccounts.getAutoPostAccounts = async function(companyId, source) {
        return this.findAll({
            where: {
                company_id: companyId,
                auto_post_source: source,
                is_active: true,
                blocked_for_posting: false
            },
            order: [['auto_post_type', 'ASC'], ['account_number', 'ASC']]
        });
    };

    // Copiar plan de cuentas template a empresa
    FinanceChartOfAccounts.copyTemplateToCompany = async function(companyId, createdBy) {
        const templates = await this.findAll({
            where: { company_id: null },
            order: [['level', 'ASC'], ['account_number', 'ASC']]
        });

        const idMapping = {};

        for (const template of templates) {
            const newAccount = await this.create({
                company_id: companyId,
                account_code: template.account_code,
                account_number: template.account_number,
                parent_id: template.parent_id ? idMapping[template.parent_id] : null,
                level: template.level,
                is_header: template.is_header,
                name: template.name,
                name_en: template.name_en,
                description: template.description,
                account_type: template.account_type,
                account_nature: template.account_nature,
                bs_category: template.bs_category,
                is_category: template.is_category,
                cf_category: template.cf_category,
                auto_post_source: template.auto_post_source,
                auto_post_type: template.auto_post_type,
                requires_cost_center: template.requires_cost_center,
                requires_project: template.requires_project,
                requires_aux_detail: template.requires_aux_detail,
                is_budgetable: template.is_budgetable,
                created_by: createdBy
            });

            idMapping[template.id] = newAccount.id;
        }

        return Object.keys(idMapping).length;
    };

    return FinanceChartOfAccounts;
};
