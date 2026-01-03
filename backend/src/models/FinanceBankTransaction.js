/**
 * FinanceBankTransaction Model
 * Transacciones bancarias con conciliación automática
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceBankTransaction = sequelize.define('FinanceBankTransaction', {
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
        bank_account_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_bank_accounts', key: 'id' }
        },
        transaction_number: {
            type: DataTypes.STRING(50)
        },
        transaction_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        value_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha valor bancario'
        },
        transaction_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'fee', 'interest', 'check_deposit', 'check_payment', 'direct_debit', 'payroll', 'tax_payment']]
            }
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        running_balance: {
            type: DataTypes.DECIMAL(15, 2)
        },
        // Origen/Destino
        source_type: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['customer', 'supplier', 'employee', 'internal', 'government', 'other', null]]
            }
        },
        source_id: {
            type: DataTypes.INTEGER,
            comment: 'ID del cliente, proveedor, empleado, etc.'
        },
        source_name: {
            type: DataTypes.STRING(200)
        },
        counterpart_bank: {
            type: DataTypes.STRING(200)
        },
        counterpart_account: {
            type: DataTypes.STRING(50)
        },
        counterpart_cbu: {
            type: DataTypes.STRING(22)
        },
        // Referencia a documentos
        source_document_type: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['invoice', 'payment', 'payroll', 'receipt', 'procurement_payment', 'tax', null]]
            }
        },
        source_document_id: {
            type: DataTypes.INTEGER
        },
        source_document_number: {
            type: DataTypes.STRING(100)
        },
        // Conciliación
        is_reconciled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        reconciled_at: {
            type: DataTypes.DATE
        },
        reconciled_by: {
            type: DataTypes.UUID
        },
        journal_entry_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_journal_entries', key: 'id' }
        },
        // Descripción
        description: {
            type: DataTypes.TEXT
        },
        reference: {
            type: DataTypes.STRING(200)
        },
        bank_reference: {
            type: DataTypes.STRING(100),
            comment: 'Referencia del extracto bancario'
        },
        // Check específico
        check_number: {
            type: DataTypes.STRING(50)
        },
        check_date: {
            type: DataTypes.DATEONLY
        },
        // Importación
        imported_from: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['manual', 'bank_file', 'api', 'excel', null]]
            }
        },
        import_batch_id: {
            type: DataTypes.STRING(50)
        },
        // Estado
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'confirmed',
            validate: {
                isIn: [['pending', 'confirmed', 'rejected', 'reversed']]
            }
        }
    }, {
        tableName: 'finance_bank_transactions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id', 'bank_account_id', 'transaction_date'] },
            { fields: ['is_reconciled'] },
            { fields: ['source_document_type', 'source_document_id'] },
            { fields: ['transaction_number'] },
            { fields: ['bank_reference'] }
        ]
    });

    // Es entrada de dinero
    FinanceBankTransaction.prototype.isInflow = function() {
        return ['deposit', 'transfer_in', 'check_deposit', 'interest'].includes(this.transaction_type);
    };

    // Es salida de dinero
    FinanceBankTransaction.prototype.isOutflow = function() {
        return ['withdrawal', 'transfer_out', 'fee', 'check_payment', 'direct_debit', 'payroll', 'tax_payment'].includes(this.transaction_type);
    };

    // Conciliar transacción
    FinanceBankTransaction.prototype.reconcile = async function(journalEntryId, userId) {
        this.is_reconciled = true;
        this.reconciled_at = new Date();
        this.reconciled_by = userId;
        this.journal_entry_id = journalEntryId;
        return this.save();
    };

    // Deshacer conciliación
    FinanceBankTransaction.prototype.unreconcile = async function() {
        this.is_reconciled = false;
        this.reconciled_at = null;
        this.reconciled_by = null;
        this.journal_entry_id = null;
        return this.save();
    };

    // Registrar transacción y actualizar saldo
    FinanceBankTransaction.record = async function(data) {
        const BankAccount = sequelize.models.FinanceBankAccount;
        const account = await BankAccount.findByPk(data.bank_account_id);

        if (!account) {
            throw new Error('Cuenta bancaria no encontrada');
        }

        // Determinar signo del monto
        const signedAmount = ['deposit', 'transfer_in', 'check_deposit', 'interest'].includes(data.transaction_type)
            ? Math.abs(data.amount)
            : -Math.abs(data.amount);

        // Crear transacción
        const transaction = await this.create({
            ...data,
            company_id: account.company_id,
            amount: signedAmount
        });

        // Actualizar saldo de cuenta
        await account.updateBalance(signedAmount, data.transaction_date);

        // Actualizar running balance
        transaction.running_balance = account.current_balance;
        await transaction.save();

        return transaction;
    };

    // Obtener transacciones por cuenta y período
    FinanceBankTransaction.getByPeriod = async function(bankAccountId, startDate, endDate) {
        const { Op } = sequelize.Sequelize;

        return this.findAll({
            where: {
                bank_account_id: bankAccountId,
                transaction_date: { [Op.between]: [startDate, endDate] },
                status: 'confirmed'
            },
            order: [['transaction_date', 'ASC'], ['id', 'ASC']]
        });
    };

    // Obtener no conciliadas
    FinanceBankTransaction.getUnreconciled = async function(bankAccountId) {
        return this.findAll({
            where: {
                bank_account_id: bankAccountId,
                is_reconciled: false,
                status: 'confirmed'
            },
            order: [['transaction_date', 'ASC']]
        });
    };

    // Obtener por documento origen
    FinanceBankTransaction.getBySourceDocument = async function(documentType, documentId) {
        return this.findAll({
            where: {
                source_document_type: documentType,
                source_document_id: documentId
            }
        });
    };

    // Resumen por tipo de transacción
    FinanceBankTransaction.getSummaryByType = async function(bankAccountId, startDate, endDate) {
        const { Op } = sequelize.Sequelize;

        return this.findAll({
            where: {
                bank_account_id: bankAccountId,
                transaction_date: { [Op.between]: [startDate, endDate] },
                status: 'confirmed'
            },
            attributes: [
                'transaction_type',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            group: ['transaction_type'],
            raw: true
        });
    };

    // Flujo de caja diario
    FinanceBankTransaction.getDailyCashFlow = async function(companyId, startDate, endDate) {
        const { Op } = sequelize.Sequelize;

        return this.findAll({
            where: {
                company_id: companyId,
                transaction_date: { [Op.between]: [startDate, endDate] },
                status: 'confirmed'
            },
            attributes: [
                'transaction_date',
                [sequelize.fn('SUM', sequelize.literal(`CASE WHEN amount > 0 THEN amount ELSE 0 END`)), 'inflows'],
                [sequelize.fn('SUM', sequelize.literal(`CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END`)), 'outflows'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'net_flow']
            ],
            group: ['transaction_date'],
            order: [['transaction_date', 'ASC']],
            raw: true
        });
    };

    // Importar desde extracto
    FinanceBankTransaction.importFromStatement = async function(bankAccountId, transactions, batchId) {
        const results = {
            imported: 0,
            duplicates: 0,
            errors: []
        };

        for (const tx of transactions) {
            try {
                // Verificar duplicado
                const existing = await this.findOne({
                    where: {
                        bank_account_id: bankAccountId,
                        transaction_date: tx.date,
                        amount: tx.amount,
                        bank_reference: tx.reference
                    }
                });

                if (existing) {
                    results.duplicates++;
                    continue;
                }

                await this.record({
                    bank_account_id: bankAccountId,
                    transaction_number: tx.number,
                    transaction_date: tx.date,
                    value_date: tx.value_date,
                    transaction_type: tx.type,
                    amount: tx.amount,
                    description: tx.description,
                    bank_reference: tx.reference,
                    imported_from: 'bank_file',
                    import_batch_id: batchId
                });

                results.imported++;
            } catch (error) {
                results.errors.push({
                    transaction: tx,
                    error: error.message
                });
            }
        }

        return results;
    };

    return FinanceBankTransaction;
};
