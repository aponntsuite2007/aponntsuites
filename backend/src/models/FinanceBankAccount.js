/**
 * FinanceBankAccount Model
 * Cuentas bancarias con CBU, alias y multi-moneda
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceBankAccount = sequelize.define('FinanceBankAccount', {
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
        account_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        account_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        bank_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        bank_branch: {
            type: DataTypes.STRING(100)
        },
        account_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        account_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['checking', 'savings', 'investment', 'foreign_currency']]
            }
        },
        // Argentina específico
        cbu: {
            type: DataTypes.STRING(22),
            comment: 'Clave Bancaria Uniforme (22 dígitos)'
        },
        alias: {
            type: DataTypes.STRING(50),
            comment: 'Alias de transferencia'
        },
        // Internacional
        swift_code: {
            type: DataTypes.STRING(11)
        },
        iban: {
            type: DataTypes.STRING(34)
        },
        // Moneda
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'ARS'
        },
        // Saldos
        current_balance: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        available_balance: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        last_balance_date: {
            type: DataTypes.DATEONLY
        },
        // Límites
        overdraft_limit: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        daily_transfer_limit: {
            type: DataTypes.DECIMAL(15, 2)
        },
        // Vinculación contable
        ledger_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        // Contacto banco
        bank_contact_name: {
            type: DataTypes.STRING(200)
        },
        bank_contact_phone: {
            type: DataTypes.STRING(50)
        },
        bank_contact_email: {
            type: DataTypes.STRING(200)
        },
        // Estado
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_primary: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        // Configuración
        allows_payments: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        allows_collections: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        auto_reconcile: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        // Auditoría
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_bank_accounts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'account_code'] },
            { fields: ['company_id', 'currency'] },
            { fields: ['company_id', 'is_active'] },
            { fields: ['cbu'] }
        ]
    });

    // Actualizar saldo
    FinanceBankAccount.prototype.updateBalance = async function(amount, date = new Date()) {
        this.current_balance = parseFloat(this.current_balance) + parseFloat(amount);
        this.available_balance = parseFloat(this.available_balance) + parseFloat(amount);
        this.last_balance_date = date;
        return this.save();
    };

    // Verificar disponibilidad para transferencia
    FinanceBankAccount.prototype.canTransfer = function(amount) {
        const available = parseFloat(this.available_balance) + parseFloat(this.overdraft_limit || 0);
        return {
            can_transfer: amount <= available,
            available_amount: available,
            requested_amount: amount,
            overdraft_used: amount > parseFloat(this.available_balance)
        };
    };

    // Marcar como principal
    FinanceBankAccount.prototype.setAsPrimary = async function() {
        // Desmarcar otras como principal
        await FinanceBankAccount.update(
            { is_primary: false },
            {
                where: {
                    company_id: this.company_id,
                    currency: this.currency,
                    id: { [sequelize.Sequelize.Op.ne]: this.id }
                }
            }
        );

        this.is_primary = true;
        return this.save();
    };

    // Obtener cuenta principal
    FinanceBankAccount.getPrimary = async function(companyId, currency = 'ARS') {
        return this.findOne({
            where: {
                company_id: companyId,
                currency: currency,
                is_primary: true,
                is_active: true
            }
        });
    };

    // Obtener cuentas activas
    FinanceBankAccount.getActive = async function(companyId) {
        return this.findAll({
            where: { company_id: companyId, is_active: true },
            order: [['is_primary', 'DESC'], ['currency', 'ASC'], ['account_name', 'ASC']]
        });
    };

    // Obtener cuentas por moneda
    FinanceBankAccount.getByCurrency = async function(companyId, currency) {
        return this.findAll({
            where: { company_id: companyId, currency: currency, is_active: true },
            order: [['is_primary', 'DESC'], ['account_name', 'ASC']]
        });
    };

    // Obtener saldo total por moneda
    FinanceBankAccount.getTotalByCurrency = async function(companyId) {
        return this.findAll({
            where: { company_id: companyId, is_active: true },
            attributes: [
                'currency',
                [sequelize.fn('SUM', sequelize.col('current_balance')), 'total_balance'],
                [sequelize.fn('SUM', sequelize.col('available_balance')), 'total_available'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'account_count']
            ],
            group: ['currency'],
            raw: true
        });
    };

    // Buscar por CBU
    FinanceBankAccount.findByCBU = async function(cbu) {
        return this.findOne({ where: { cbu } });
    };

    // Buscar por alias
    FinanceBankAccount.findByAlias = async function(alias) {
        return this.findOne({ where: { alias } });
    };

    // Obtener cuentas para pagos
    FinanceBankAccount.getForPayments = async function(companyId, currency = null) {
        const where = {
            company_id: companyId,
            is_active: true,
            allows_payments: true
        };

        if (currency) {
            where.currency = currency;
        }

        return this.findAll({
            where,
            order: [['is_primary', 'DESC'], ['current_balance', 'DESC']]
        });
    };

    // Obtener cuentas para cobranzas
    FinanceBankAccount.getForCollections = async function(companyId) {
        return this.findAll({
            where: {
                company_id: companyId,
                is_active: true,
                allows_collections: true
            },
            order: [['is_primary', 'DESC'], ['account_name', 'ASC']]
        });
    };

    // Dashboard de cuentas
    FinanceBankAccount.getDashboard = async function(companyId) {
        const accounts = await this.getActive(companyId);
        const byMoney = await this.getTotalByCurrency(companyId);

        const dashboard = {
            total_accounts: accounts.length,
            by_currency: {},
            accounts: accounts.map(a => ({
                id: a.id,
                name: a.account_name,
                bank: a.bank_name,
                currency: a.currency,
                balance: a.current_balance,
                available: a.available_balance,
                is_primary: a.is_primary
            }))
        };

        for (const currency of byMoney) {
            dashboard.by_currency[currency.currency] = {
                total_balance: parseFloat(currency.total_balance) || 0,
                total_available: parseFloat(currency.total_available) || 0,
                account_count: parseInt(currency.account_count) || 0
            };
        }

        return dashboard;
    };

    return FinanceBankAccount;
};
