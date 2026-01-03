/**
 * FinanceReconciliationService
 * Conciliación bancaria automática y manual
 * Finance Enterprise SSOT - Sistema Financiero Unificado
 */

const db = require('../config/database');

class FinanceReconciliationService {
    /**
     * Obtener transacciones pendientes de conciliación
     */
    async getPendingTransactions(companyId, bankAccountId = null) {
        const where = {
            company_id: companyId,
            is_reconciled: false,
            status: 'confirmed'
        };

        if (bankAccountId) {
            where.bank_account_id = bankAccountId;
        }

        const transactions = await db.FinanceBankTransaction.findAll({
            where,
            include: [{
                model: db.FinanceBankAccount,
                as: 'bankAccount',
                attributes: ['id', 'account_name', 'bank_name', 'account_number']
            }],
            order: [['transaction_date', 'ASC']]
        });

        return transactions;
    }

    /**
     * Obtener líneas de asiento no conciliadas
     */
    async getUnreconciledJournalLines(companyId, bankAccountId) {
        // Obtener cuenta contable vinculada
        const bankAccount = await db.FinanceBankAccount.findByPk(bankAccountId);
        if (!bankAccount?.ledger_account_id) {
            throw new Error('Cuenta bancaria no tiene cuenta contable vinculada');
        }

        return db.FinanceJournalEntryLine.getUnreconciled(bankAccount.ledger_account_id);
    }

    /**
     * Sugerir conciliaciones automáticas
     */
    async suggestMatches(companyId, bankAccountId) {
        const transactions = await this.getPendingTransactions(companyId, bankAccountId);
        const journalLines = await this.getUnreconciledJournalLines(companyId, bankAccountId);

        const suggestions = [];

        for (const tx of transactions) {
            const matches = [];

            for (const line of journalLines) {
                const score = this.calculateMatchScore(tx, line);
                if (score >= 70) { // 70% mínimo para sugerir
                    matches.push({
                        journal_line_id: line.id,
                        entry_id: line.journal_entry_id,
                        entry_number: line.entry?.entry_number,
                        amount: line.debit_amount || line.credit_amount,
                        date: line.entry?.entry_date,
                        description: line.description,
                        score
                    });
                }
            }

            // Ordenar por score descendente
            matches.sort((a, b) => b.score - a.score);

            if (matches.length > 0) {
                suggestions.push({
                    transaction: {
                        id: tx.id,
                        date: tx.transaction_date,
                        amount: tx.amount,
                        description: tx.description,
                        bank_reference: tx.bank_reference
                    },
                    matches: matches.slice(0, 3) // Top 3 sugerencias
                });
            }
        }

        return suggestions;
    }

    /**
     * Calcular score de coincidencia entre transacción y línea de asiento
     */
    calculateMatchScore(transaction, journalLine) {
        let score = 0;

        // Coincidencia de monto (40 puntos)
        const txAmount = Math.abs(parseFloat(transaction.amount));
        const lineAmount = Math.abs(parseFloat(journalLine.debit_amount) || parseFloat(journalLine.credit_amount));

        if (Math.abs(txAmount - lineAmount) < 0.01) {
            score += 40;
        } else if (Math.abs(txAmount - lineAmount) / Math.max(txAmount, lineAmount) < 0.02) {
            score += 30; // Tolerancia 2%
        }

        // Coincidencia de fecha (30 puntos)
        const txDate = new Date(transaction.transaction_date);
        const lineDate = new Date(journalLine.entry?.entry_date);
        const daysDiff = Math.abs((txDate - lineDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            score += 30;
        } else if (daysDiff <= 1) {
            score += 25;
        } else if (daysDiff <= 3) {
            score += 15;
        } else if (daysDiff <= 7) {
            score += 5;
        }

        // Coincidencia de descripción (20 puntos)
        const txDesc = (transaction.description || '').toLowerCase();
        const lineDesc = (journalLine.description || '').toLowerCase();

        if (txDesc && lineDesc) {
            const words = txDesc.split(/\s+/).filter(w => w.length > 3);
            let matchedWords = 0;
            for (const word of words) {
                if (lineDesc.includes(word)) {
                    matchedWords++;
                }
            }
            if (words.length > 0) {
                score += Math.min(20, Math.round((matchedWords / words.length) * 20));
            }
        }

        // Coincidencia de referencia (10 puntos)
        if (transaction.bank_reference && journalLine.entry?.reference) {
            if (transaction.bank_reference === journalLine.entry.reference) {
                score += 10;
            } else if (transaction.bank_reference.includes(journalLine.entry.reference) ||
                       journalLine.entry.reference.includes(transaction.bank_reference)) {
                score += 5;
            }
        }

        return score;
    }

    /**
     * Conciliar transacción con línea de asiento
     */
    async reconcileTransaction(transactionId, journalEntryId, userId) {
        const transaction = await db.FinanceBankTransaction.findByPk(transactionId);
        if (!transaction) {
            throw new Error('Transacción no encontrada');
        }

        if (transaction.is_reconciled) {
            throw new Error('La transacción ya está conciliada');
        }

        // Verificar que el asiento existe y está contabilizado
        const entry = await db.FinanceJournalEntry.findByPk(journalEntryId);
        if (!entry || entry.status !== 'posted') {
            throw new Error('El asiento no está contabilizado');
        }

        await transaction.reconcile(journalEntryId, userId);

        // Marcar líneas del asiento como conciliadas
        await db.FinanceJournalEntryLine.update(
            { is_reconciled: true, reconciled_at: new Date() },
            { where: { journal_entry_id: journalEntryId } }
        );

        return transaction;
    }

    /**
     * Conciliación múltiple automática
     */
    async autoReconcile(companyId, bankAccountId, userId) {
        const suggestions = await this.suggestMatches(companyId, bankAccountId);
        const results = {
            reconciled: 0,
            failed: 0,
            errors: []
        };

        for (const suggestion of suggestions) {
            // Solo auto-conciliar si hay un match con score >= 90
            const bestMatch = suggestion.matches[0];
            if (bestMatch && bestMatch.score >= 90) {
                try {
                    await this.reconcileTransaction(
                        suggestion.transaction.id,
                        bestMatch.entry_id,
                        userId
                    );
                    results.reconciled++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        transaction_id: suggestion.transaction.id,
                        error: error.message
                    });
                }
            }
        }

        return results;
    }

    /**
     * Deshacer conciliación
     */
    async unreconcile(transactionId, userId) {
        const transaction = await db.FinanceBankTransaction.findByPk(transactionId);
        if (!transaction) {
            throw new Error('Transacción no encontrada');
        }

        if (!transaction.is_reconciled) {
            throw new Error('La transacción no está conciliada');
        }

        const journalEntryId = transaction.journal_entry_id;

        await transaction.unreconcile();

        // Desmarcar líneas del asiento
        if (journalEntryId) {
            await db.FinanceJournalEntryLine.update(
                { is_reconciled: false, reconciled_at: null },
                { where: { journal_entry_id: journalEntryId } }
            );
        }

        return transaction;
    }

    /**
     * Obtener resumen de conciliación
     */
    async getReconciliationSummary(companyId, bankAccountId, asOfDate) {
        const bankAccount = await db.FinanceBankAccount.findByPk(bankAccountId);
        if (!bankAccount) {
            throw new Error('Cuenta bancaria no encontrada');
        }

        const { Op } = db.Sequelize;

        // Saldo según banco
        const bankBalance = parseFloat(bankAccount.current_balance) || 0;

        // Transacciones no conciliadas
        const unreconciledTransactions = await db.FinanceBankTransaction.findAll({
            where: {
                bank_account_id: bankAccountId,
                is_reconciled: false,
                transaction_date: { [Op.lte]: asOfDate },
                status: 'confirmed'
            }
        });

        let unreconciledDeposits = 0;
        let unreconciledWithdrawals = 0;

        for (const tx of unreconciledTransactions) {
            const amount = parseFloat(tx.amount) || 0;
            if (amount > 0) {
                unreconciledDeposits += amount;
            } else {
                unreconciledWithdrawals += Math.abs(amount);
            }
        }

        // Saldo según libros
        if (bankAccount.ledger_account_id) {
            const period = await db.FinanceFiscalPeriod.getByDate(companyId, asOfDate);
            const balance = await db.FinanceAccountBalance.getBalance(
                companyId,
                bankAccount.ledger_account_id,
                period?.fiscal_year,
                period?.period_number
            );
            var bookBalance = parseFloat(balance?.closing_balance) || 0;
        } else {
            var bookBalance = bankBalance;
        }

        // Diferencia
        const adjustedBookBalance = bookBalance + unreconciledDeposits - unreconciledWithdrawals;
        const difference = bankBalance - adjustedBookBalance;

        return {
            bank_account_id: bankAccountId,
            bank_name: bankAccount.bank_name,
            account_number: bankAccount.account_number,
            as_of_date: asOfDate,
            bank_balance: bankBalance,
            book_balance: bookBalance,
            unreconciled_deposits: unreconciledDeposits,
            unreconciled_deposits_count: unreconciledTransactions.filter(t => t.amount > 0).length,
            unreconciled_withdrawals: unreconciledWithdrawals,
            unreconciled_withdrawals_count: unreconciledTransactions.filter(t => t.amount < 0).length,
            adjusted_book_balance: adjustedBookBalance,
            difference,
            is_reconciled: Math.abs(difference) < 0.01
        };
    }

    /**
     * Importar extracto bancario
     */
    async importBankStatement(bankAccountId, transactions, userId) {
        return db.FinanceBankTransaction.importFromStatement(
            bankAccountId,
            transactions,
            `IMPORT-${Date.now()}`
        );
    }
}

module.exports = new FinanceReconciliationService();
