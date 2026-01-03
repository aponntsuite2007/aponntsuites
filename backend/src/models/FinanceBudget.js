/**
 * FinanceBudget Model
 * Presupuestos con generación inteligente (histórico + inflación + inversiones)
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceBudget = sequelize.define('FinanceBudget', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        budget_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        fiscal_year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        budget_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['annual', 'quarterly', 'monthly', 'rolling']]
            }
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'Para múltiples versiones del presupuesto'
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['operational', 'capital', 'cash_flow', 'master']]
            }
        },
        generation_method: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['manual', 'historical', 'zero_based', 'incremental', null]]
            }
        },
        base_year: {
            type: DataTypes.INTEGER,
            comment: 'Año base si es histórico'
        },
        base_budget_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_budgets', key: 'id' },
            comment: 'Presupuesto base para comparación'
        },
        inflation_rate: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            comment: '% inflación anual esperada'
        },
        growth_rate: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0,
            comment: '% crecimiento esperado'
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        total_revenue: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_expense: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_capex: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        net_result: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'draft',
            validate: {
                isIn: [['draft', 'pending_approval', 'approved', 'active', 'closed']]
            }
        },
        allow_overspend: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        overspend_tolerance_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        control_level: {
            type: DataTypes.STRING(20),
            defaultValue: 'warning',
            validate: {
                isIn: [['none', 'warning', 'block']]
            }
        },
        approved_by: {
            type: DataTypes.UUID
        },
        approved_at: {
            type: DataTypes.DATE
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'finance_budgets',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'budget_code', 'fiscal_year', 'version'] },
            { fields: ['company_id', 'status'] },
            { fields: ['fiscal_year'] }
        ]
    });

    // Recalcular totales
    FinanceBudget.prototype.recalculateTotals = async function() {
        const BudgetLine = sequelize.models.FinanceBudgetLine;
        const BudgetInvestment = sequelize.models.FinanceBudgetInvestment;

        // Totales de líneas
        const lineStats = await BudgetLine.findAll({
            where: { budget_id: this.id },
            attributes: [
                'line_type',
                [sequelize.fn('SUM', sequelize.col('annual_total')), 'total']
            ],
            group: ['line_type'],
            raw: true
        });

        this.total_revenue = 0;
        this.total_expense = 0;

        for (const stat of lineStats) {
            if (stat.line_type === 'revenue') {
                this.total_revenue = parseFloat(stat.total) || 0;
            } else if (stat.line_type === 'expense') {
                this.total_expense = parseFloat(stat.total) || 0;
            }
        }

        // Total CAPEX
        const capexTotal = await BudgetInvestment.sum('total_amount', {
            where: { budget_id: this.id }
        });
        this.total_capex = capexTotal || 0;

        // Resultado neto
        this.net_result = this.total_revenue - this.total_expense;

        return this.save();
    };

    // Aprobar presupuesto
    FinanceBudget.prototype.approve = async function(userId) {
        this.status = 'approved';
        this.approved_by = userId;
        this.approved_at = new Date();
        return this.save();
    };

    // Activar presupuesto
    FinanceBudget.prototype.activate = async function() {
        if (this.status !== 'approved') {
            throw new Error('El presupuesto debe estar aprobado');
        }

        // Desactivar presupuesto activo anterior del mismo año
        await FinanceBudget.update(
            { status: 'closed' },
            {
                where: {
                    company_id: this.company_id,
                    fiscal_year: this.fiscal_year,
                    status: 'active',
                    id: { [sequelize.Sequelize.Op.ne]: this.id }
                }
            }
        );

        this.status = 'active';
        return this.save();
    };

    // Crear nueva versión
    FinanceBudget.prototype.createNewVersion = async function(userId) {
        const BudgetLine = sequelize.models.FinanceBudgetLine;
        const BudgetInvestment = sequelize.models.FinanceBudgetInvestment;

        // Obtener última versión
        const latestVersion = await FinanceBudget.max('version', {
            where: {
                company_id: this.company_id,
                budget_code: this.budget_code,
                fiscal_year: this.fiscal_year
            }
        });

        // Crear nuevo presupuesto
        const newBudget = await FinanceBudget.create({
            ...this.toJSON(),
            id: undefined,
            version: latestVersion + 1,
            status: 'draft',
            approved_by: null,
            approved_at: null,
            created_by: userId,
            created_at: undefined,
            updated_at: undefined
        });

        // Copiar líneas
        const lines = await BudgetLine.findAll({ where: { budget_id: this.id } });
        for (const line of lines) {
            await BudgetLine.create({
                ...line.toJSON(),
                id: undefined,
                budget_id: newBudget.id,
                created_at: undefined,
                updated_at: undefined
            });
        }

        // Copiar inversiones
        const investments = await BudgetInvestment.findAll({ where: { budget_id: this.id } });
        for (const inv of investments) {
            await BudgetInvestment.create({
                ...inv.toJSON(),
                id: undefined,
                budget_id: newBudget.id,
                actual_spent: 0,
                variance_amount: 0,
                variance_percent: 0,
                created_at: undefined
            });
        }

        return newBudget;
    };

    // Obtener presupuesto activo
    FinanceBudget.getActive = async function(companyId, fiscalYear) {
        return this.findOne({
            where: {
                company_id: companyId,
                fiscal_year: fiscalYear,
                status: 'active'
            }
        });
    };

    // Obtener todos los presupuestos de un año
    FinanceBudget.getByYear = async function(companyId, fiscalYear) {
        return this.findAll({
            where: {
                company_id: companyId,
                fiscal_year: fiscalYear
            },
            order: [['version', 'DESC']]
        });
    };

    // Comparar dos presupuestos
    FinanceBudget.compare = async function(budgetId1, budgetId2) {
        const BudgetLine = sequelize.models.FinanceBudgetLine;

        const [lines1, lines2] = await Promise.all([
            BudgetLine.findAll({ where: { budget_id: budgetId1 } }),
            BudgetLine.findAll({ where: { budget_id: budgetId2 } })
        ]);

        const comparison = [];
        const lines2Map = new Map(lines2.map(l => [`${l.account_id}-${l.cost_center_id}`, l]));

        for (const line1 of lines1) {
            const key = `${line1.account_id}-${line1.cost_center_id}`;
            const line2 = lines2Map.get(key);

            comparison.push({
                account_id: line1.account_id,
                cost_center_id: line1.cost_center_id,
                budget1_amount: line1.annual_total,
                budget2_amount: line2 ? line2.annual_total : 0,
                variance: line1.annual_total - (line2 ? line2.annual_total : 0),
                variance_percent: line2 && line2.annual_total !== 0
                    ? ((line1.annual_total - line2.annual_total) / line2.annual_total * 100)
                    : null
            });

            lines2Map.delete(key);
        }

        // Agregar líneas que solo están en budget2
        for (const [key, line2] of lines2Map) {
            comparison.push({
                account_id: line2.account_id,
                cost_center_id: line2.cost_center_id,
                budget1_amount: 0,
                budget2_amount: line2.annual_total,
                variance: -line2.annual_total,
                variance_percent: -100
            });
        }

        return comparison;
    };

    return FinanceBudget;
};
