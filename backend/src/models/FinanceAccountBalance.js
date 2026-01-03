/**
 * FinanceAccountBalance Model
 * Saldos pre-calculados de cuentas por período
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceAccountBalance = sequelize.define('FinanceAccountBalance', {
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
        account_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        fiscal_year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        fiscal_period: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '0=apertura, 1-12 meses, 13=cierre'
        },
        opening_debit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        opening_credit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        period_debit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        period_credit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        closing_debit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        closing_credit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        opening_balance: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Saldo inicial (+ débito, - crédito según naturaleza)'
        },
        period_movement: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        closing_balance: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        transaction_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        last_transaction_date: {
            type: DataTypes.DATEONLY
        }
    }, {
        tableName: 'finance_account_balances',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'account_id', 'fiscal_year', 'fiscal_period'] },
            { fields: ['company_id', 'fiscal_year'] },
            { fields: ['account_id'] }
        ]
    });

    // Recalcular saldos
    FinanceAccountBalance.prototype.recalculate = async function() {
        const ChartOfAccounts = sequelize.models.FinanceChartOfAccounts;
        const account = await ChartOfAccounts.findByPk(this.account_id);

        // Calcular saldo según naturaleza de la cuenta
        const openingNet = parseFloat(this.opening_debit) - parseFloat(this.opening_credit);
        const periodNet = parseFloat(this.period_debit) - parseFloat(this.period_credit);

        if (account.account_nature === 'debit') {
            this.opening_balance = openingNet;
            this.period_movement = periodNet;
            this.closing_balance = openingNet + periodNet;
        } else {
            this.opening_balance = -openingNet;
            this.period_movement = -periodNet;
            this.closing_balance = -openingNet - periodNet;
        }

        this.closing_debit = parseFloat(this.opening_debit) + parseFloat(this.period_debit);
        this.closing_credit = parseFloat(this.opening_credit) + parseFloat(this.period_credit);

        return this.save();
    };

    // Actualizar saldo con movimiento
    FinanceAccountBalance.updateBalance = async function(companyId, accountId, fiscalYear, fiscalPeriod, debitAmount, creditAmount) {
        const [balance, created] = await this.findOrCreate({
            where: { company_id: companyId, account_id: accountId, fiscal_year: fiscalYear, fiscal_period: fiscalPeriod },
            defaults: {
                opening_debit: 0,
                opening_credit: 0,
                period_debit: debitAmount,
                period_credit: creditAmount,
                transaction_count: 1,
                last_transaction_date: new Date()
            }
        });

        if (!created) {
            balance.period_debit = parseFloat(balance.period_debit) + parseFloat(debitAmount);
            balance.period_credit = parseFloat(balance.period_credit) + parseFloat(creditAmount);
            balance.transaction_count++;
            balance.last_transaction_date = new Date();
        }

        // Si no es período 1, copiar saldo inicial del período anterior
        if (fiscalPeriod > 1 && created) {
            const previousBalance = await this.findOne({
                where: {
                    company_id: companyId,
                    account_id: accountId,
                    fiscal_year: fiscalYear,
                    fiscal_period: fiscalPeriod - 1
                }
            });

            if (previousBalance) {
                balance.opening_debit = previousBalance.closing_debit;
                balance.opening_credit = previousBalance.closing_credit;
            }
        }

        await balance.recalculate();
        return balance;
    };

    // Obtener saldo de cuenta
    FinanceAccountBalance.getBalance = async function(companyId, accountId, fiscalYear, fiscalPeriod = null) {
        if (fiscalPeriod) {
            return this.findOne({
                where: { company_id: companyId, account_id: accountId, fiscal_year: fiscalYear, fiscal_period: fiscalPeriod }
            });
        }

        // Obtener último período con datos
        return this.findOne({
            where: { company_id: companyId, account_id: accountId, fiscal_year: fiscalYear },
            order: [['fiscal_period', 'DESC']]
        });
    };

    // Obtener saldos de múltiples cuentas
    FinanceAccountBalance.getBalances = async function(companyId, fiscalYear, fiscalPeriod) {
        return this.findAll({
            where: { company_id: companyId, fiscal_year: fiscalYear, fiscal_period: fiscalPeriod },
            order: [['account_id', 'ASC']]
        });
    };

    // Obtener evolución mensual de cuenta
    FinanceAccountBalance.getMonthlyEvolution = async function(companyId, accountId, fiscalYear) {
        return this.findAll({
            where: { company_id: companyId, account_id: accountId, fiscal_year: fiscalYear },
            order: [['fiscal_period', 'ASC']]
        });
    };

    // Generar balance de sumas y saldos
    FinanceAccountBalance.getTrialBalance = async function(companyId, fiscalYear, fiscalPeriod) {
        const ChartOfAccounts = sequelize.models.FinanceChartOfAccounts;

        const balances = await this.findAll({
            where: { company_id: companyId, fiscal_year: fiscalYear, fiscal_period: fiscalPeriod },
            include: [{
                model: ChartOfAccounts,
                as: 'account',
                attributes: ['account_code', 'name', 'account_type', 'account_nature', 'level', 'is_header']
            }],
            order: [[{ model: ChartOfAccounts, as: 'account' }, 'account_number', 'ASC']]
        });

        let totalOpeningDebit = 0;
        let totalOpeningCredit = 0;
        let totalPeriodDebit = 0;
        let totalPeriodCredit = 0;
        let totalClosingDebit = 0;
        let totalClosingCredit = 0;

        const entries = balances.map(b => {
            totalOpeningDebit += parseFloat(b.opening_debit) || 0;
            totalOpeningCredit += parseFloat(b.opening_credit) || 0;
            totalPeriodDebit += parseFloat(b.period_debit) || 0;
            totalPeriodCredit += parseFloat(b.period_credit) || 0;
            totalClosingDebit += parseFloat(b.closing_debit) || 0;
            totalClosingCredit += parseFloat(b.closing_credit) || 0;

            return {
                account_code: b.account?.account_code,
                account_name: b.account?.name,
                account_type: b.account?.account_type,
                opening_debit: b.opening_debit,
                opening_credit: b.opening_credit,
                period_debit: b.period_debit,
                period_credit: b.period_credit,
                closing_debit: b.closing_debit,
                closing_credit: b.closing_credit,
                closing_balance: b.closing_balance
            };
        });

        return {
            entries,
            totals: {
                opening_debit: totalOpeningDebit,
                opening_credit: totalOpeningCredit,
                period_debit: totalPeriodDebit,
                period_credit: totalPeriodCredit,
                closing_debit: totalClosingDebit,
                closing_credit: totalClosingCredit
            },
            is_balanced: Math.abs(totalClosingDebit - totalClosingCredit) < 0.01
        };
    };

    // Recalcular todos los saldos de un período
    FinanceAccountBalance.recalculatePeriod = async function(companyId, fiscalYear, fiscalPeriod) {
        const JournalEntry = sequelize.models.FinanceJournalEntry;
        const JournalEntryLine = sequelize.models.FinanceJournalEntryLine;

        // Obtener todas las líneas de asientos del período
        const lines = await JournalEntryLine.findAll({
            include: [{
                model: JournalEntry,
                as: 'entry',
                where: {
                    company_id: companyId,
                    fiscal_year: fiscalYear,
                    fiscal_period: fiscalPeriod,
                    status: 'posted'
                },
                attributes: []
            }],
            attributes: [
                'account_id',
                [sequelize.fn('SUM', sequelize.col('debit_amount')), 'total_debit'],
                [sequelize.fn('SUM', sequelize.col('credit_amount')), 'total_credit'],
                [sequelize.fn('COUNT', sequelize.col('FinanceJournalEntryLine.id')), 'count']
            ],
            group: ['account_id'],
            raw: true
        });

        for (const line of lines) {
            await this.updateBalance(
                companyId,
                line.account_id,
                fiscalYear,
                fiscalPeriod,
                parseFloat(line.total_debit) || 0,
                parseFloat(line.total_credit) || 0
            );
        }

        return lines.length;
    };

    return FinanceAccountBalance;
};
