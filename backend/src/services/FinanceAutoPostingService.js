/**
 * FinanceAutoPostingService
 * Motor de contabilización automática desde módulos (Payroll, Billing, Procurement)
 * Finance Enterprise SSOT - Sistema Financiero Unificado
 */

const db = require('../config/database');

class FinanceAutoPostingService {
    constructor() {
        this.initialized = false;
        this.activeModules = new Map(); // companyId -> Set of active modules
    }

    /**
     * Inicializar servicio para una empresa
     */
    async initialize(companyId) {
        try {
            const company = await db.Company.findByPk(companyId);
            if (!company) {
                throw new Error(`Empresa ${companyId} no encontrada`);
            }

            this.activeModules.set(companyId, new Set(company.active_modules || []));
            this.initialized = true;

            console.log(`✅ [FINANCE] AutoPosting inicializado para empresa ${companyId}`);
            return true;
        } catch (error) {
            console.error(`❌ [FINANCE] Error inicializando AutoPosting:`, error);
            throw error;
        }
    }

    /**
     * Verificar si un módulo está activo para una empresa
     */
    hasModule(companyId, moduleName) {
        const modules = this.activeModules.get(companyId);
        return modules ? modules.has(moduleName) : false;
    }

    /**
     * Obtener cuenta contable para auto-posting
     */
    async getAutoPostAccount(companyId, source, type) {
        const account = await db.FinanceChartOfAccounts.findOne({
            where: {
                company_id: companyId,
                auto_post_source: source,
                auto_post_type: type,
                is_active: true,
                blocked_for_posting: false
            }
        });

        return account;
    }

    /**
     * Crear asiento contable automático
     */
    async createAutoEntry(companyId, data) {
        const {
            sourceType,
            sourceModule,
            sourceDocumentId,
            sourceDocumentNumber,
            description,
            lines,
            entryDate = new Date(),
            userId = null
        } = data;

        // Verificar período fiscal abierto
        const period = await db.FinanceFiscalPeriod.getByDate(companyId, entryDate);
        if (!period) {
            throw new Error('No existe período fiscal para la fecha');
        }
        if (!period.isOpen()) {
            throw new Error(`El período ${period.period_name} está cerrado`);
        }

        // Crear asiento
        const entry = await db.FinanceJournalEntry.create({
            company_id: companyId,
            entry_number: await db.FinanceJournalEntry.getNextNumber(companyId, period.fiscal_year),
            fiscal_year: period.fiscal_year,
            fiscal_period: period.period_number,
            entry_date: entryDate,
            posting_date: entryDate,
            entry_type: 'standard',
            source_type: sourceType,
            source_module: sourceModule,
            source_document_id: sourceDocumentId,
            source_document_number: sourceDocumentNumber,
            description,
            status: 'draft',
            created_by: userId
        });

        // Crear líneas
        let lineNumber = 1;
        let totalDebit = 0;
        let totalCredit = 0;

        for (const line of lines) {
            await db.FinanceJournalEntryLine.create({
                journal_entry_id: entry.id,
                line_number: lineNumber++,
                account_id: line.accountId,
                cost_center_id: line.costCenterId || null,
                debit_amount: line.debit || 0,
                credit_amount: line.credit || 0,
                description: line.description || '',
                aux_type: line.auxType || null,
                aux_id: line.auxId || null,
                aux_name: line.auxName || null
            });

            totalDebit += parseFloat(line.debit) || 0;
            totalCredit += parseFloat(line.credit) || 0;
        }

        // Actualizar totales
        entry.total_debit = totalDebit;
        entry.total_credit = totalCredit;
        await entry.save();

        // Contabilizar automáticamente si está balanceado
        if (Math.abs(totalDebit - totalCredit) < 0.01) {
            await entry.post(userId);
        }

        return entry;
    }

    /**
     * Post de nómina (si módulo payroll-liquidation está activo)
     */
    async postPayroll(companyId, payrollRunId, userId) {
        if (!this.hasModule(companyId, 'payroll-liquidation')) {
            console.log(`[FINANCE] Módulo payroll-liquidation no activo para empresa ${companyId}`);
            return null;
        }

        const payrollRun = await db.PayrollRun.findByPk(payrollRunId);
        if (!payrollRun || payrollRun.company_id !== companyId) {
            throw new Error('Liquidación de nómina no encontrada');
        }

        // Obtener cuentas de auto-posting
        const expenseAccount = await this.getAutoPostAccount(companyId, 'payroll', 'debit');
        const payableAccount = await this.getAutoPostAccount(companyId, 'payroll', 'credit');

        if (!expenseAccount || !payableAccount) {
            throw new Error('Cuentas de auto-posting para nómina no configuradas');
        }

        const lines = [
            {
                accountId: expenseAccount.id,
                debit: payrollRun.total_gross,
                credit: 0,
                description: 'Gastos de Personal',
                costCenterId: payrollRun.cost_center_id
            },
            {
                accountId: payableAccount.id,
                debit: 0,
                credit: payrollRun.total_net,
                description: 'Sueldos a Pagar'
            }
        ];

        // Si hay contribuciones patronales, agregar línea
        if (payrollRun.total_contributions > 0) {
            const contribAccount = await db.FinanceChartOfAccounts.findOne({
                where: {
                    company_id: companyId,
                    account_code: { [db.Sequelize.Op.like]: '2103%' }, // Cargas Sociales
                    is_active: true
                }
            });

            if (contribAccount) {
                lines.push({
                    accountId: contribAccount.id,
                    debit: 0,
                    credit: payrollRun.total_contributions,
                    description: 'Cargas Sociales a Pagar'
                });
            }
        }

        return this.createAutoEntry(companyId, {
            sourceType: 'payroll',
            sourceModule: 'payroll-liquidation',
            sourceDocumentId: payrollRunId,
            sourceDocumentNumber: payrollRun.period,
            description: `Liquidación de haberes ${payrollRun.period}`,
            lines,
            entryDate: payrollRun.payment_date || new Date(),
            userId
        });
    }

    /**
     * Post de factura de venta (si módulo siac-commercial está activo)
     */
    async postSalesInvoice(companyId, invoiceData, userId) {
        if (!this.hasModule(companyId, 'siac-commercial')) {
            console.log(`[FINANCE] Módulo siac-commercial no activo para empresa ${companyId}`);
            return null;
        }

        const receivableAccount = await this.getAutoPostAccount(companyId, 'billing', 'debit');
        const revenueAccount = await this.getAutoPostAccount(companyId, 'billing', 'credit');

        if (!receivableAccount || !revenueAccount) {
            throw new Error('Cuentas de auto-posting para facturación no configuradas');
        }

        const lines = [
            {
                accountId: receivableAccount.id,
                debit: invoiceData.total,
                credit: 0,
                description: 'Deudores por Ventas',
                auxType: 'customer',
                auxId: invoiceData.clienteId,
                auxName: invoiceData.clienteNombre
            },
            {
                accountId: revenueAccount.id,
                debit: 0,
                credit: invoiceData.subtotal,
                description: 'Ventas'
            }
        ];

        // Si hay IVA, agregar línea
        if (invoiceData.iva > 0) {
            const ivaAccount = await db.FinanceChartOfAccounts.findOne({
                where: {
                    company_id: companyId,
                    account_code: { [db.Sequelize.Op.like]: '2102%' }, // IVA Débito Fiscal
                    is_active: true
                }
            });

            if (ivaAccount) {
                lines.push({
                    accountId: ivaAccount.id,
                    debit: 0,
                    credit: invoiceData.iva,
                    description: 'IVA Débito Fiscal'
                });
            }
        }

        return this.createAutoEntry(companyId, {
            sourceType: 'billing',
            sourceModule: 'siac-commercial',
            sourceDocumentId: invoiceData.id,
            sourceDocumentNumber: invoiceData.numero,
            description: `Factura ${invoiceData.numero} - ${invoiceData.clienteNombre}`,
            lines,
            entryDate: invoiceData.fecha || new Date(),
            userId
        });
    }

    /**
     * Post de factura de proveedor (si módulo procurement-management está activo)
     */
    async postPurchaseInvoice(companyId, invoiceId, userId) {
        if (!this.hasModule(companyId, 'procurement-management')) {
            console.log(`[FINANCE] Módulo procurement-management no activo para empresa ${companyId}`);
            return null;
        }

        const invoice = await db.ProcurementInvoice.findByPk(invoiceId, {
            include: [{ model: db.ProcurementSupplier, as: 'supplier' }]
        });

        if (!invoice || invoice.company_id !== companyId) {
            throw new Error('Factura de proveedor no encontrada');
        }

        // Obtener cuenta de proveedores
        const payableAccount = await this.getAutoPostAccount(companyId, 'procurement', 'credit');
        if (!payableAccount) {
            throw new Error('Cuenta de proveedores no configurada');
        }

        // Determinar cuenta de gasto o activo
        let expenseAccount = await this.getAutoPostAccount(companyId, 'procurement', 'debit');
        if (!expenseAccount) {
            // Fallback a cuenta de gastos generales
            expenseAccount = await db.FinanceChartOfAccounts.findOne({
                where: {
                    company_id: companyId,
                    account_code: { [db.Sequelize.Op.like]: '52%' },
                    is_active: true,
                    is_header: false
                }
            });
        }

        const lines = [
            {
                accountId: expenseAccount.id,
                debit: invoice.subtotal,
                credit: 0,
                description: 'Compras/Gastos'
            },
            {
                accountId: payableAccount.id,
                debit: 0,
                credit: invoice.total_amount,
                description: 'Proveedores',
                auxType: 'supplier',
                auxId: invoice.supplier_id,
                auxName: invoice.supplier?.business_name
            }
        ];

        // Si hay IVA, agregar línea
        if (invoice.tax_amount > 0) {
            const ivaAccount = await db.FinanceChartOfAccounts.findOne({
                where: {
                    company_id: companyId,
                    account_code: { [db.Sequelize.Op.like]: '1104%' }, // IVA Crédito Fiscal
                    is_active: true
                }
            });

            if (ivaAccount) {
                lines.push({
                    accountId: ivaAccount.id,
                    debit: invoice.tax_amount,
                    credit: 0,
                    description: 'IVA Crédito Fiscal'
                });
            }
        }

        return this.createAutoEntry(companyId, {
            sourceType: 'procurement',
            sourceModule: 'procurement-management',
            sourceDocumentId: invoiceId,
            sourceDocumentNumber: invoice.invoice_number,
            description: `Factura Proveedor ${invoice.invoice_number} - ${invoice.supplier?.business_name}`,
            lines,
            entryDate: invoice.invoice_date || new Date(),
            userId
        });
    }

    /**
     * Post de pago a proveedor
     */
    async postSupplierPayment(companyId, paymentId, userId) {
        if (!this.hasModule(companyId, 'procurement-management')) {
            return null;
        }

        const payment = await db.ProcurementPayment.findByPk(paymentId, {
            include: [{ model: db.ProcurementSupplier, as: 'supplier' }]
        });

        if (!payment || payment.company_id !== companyId) {
            throw new Error('Pago no encontrado');
        }

        // Obtener cuenta bancaria
        const bankData = payment.bank_account;
        let bankAccountModel = null;
        if (bankData?.cbu) {
            bankAccountModel = await db.FinanceBankAccount.findOne({
                where: { company_id: companyId, cbu: bankData.cbu }
            });
        }

        const bankLedgerAccount = bankAccountModel?.ledger_account_id
            ? await db.FinanceChartOfAccounts.findByPk(bankAccountModel.ledger_account_id)
            : await db.FinanceChartOfAccounts.findOne({
                where: {
                    company_id: companyId,
                    account_code: { [db.Sequelize.Op.like]: '1101%' },
                    is_active: true,
                    is_header: false
                }
            });

        const payableAccount = await this.getAutoPostAccount(companyId, 'procurement', 'credit');

        const lines = [
            {
                accountId: payableAccount.id,
                debit: payment.total_amount,
                credit: 0,
                description: 'Cancelación Proveedor',
                auxType: 'supplier',
                auxId: payment.supplier_id,
                auxName: payment.supplier?.business_name
            },
            {
                accountId: bankLedgerAccount.id,
                debit: 0,
                credit: payment.net_amount || payment.total_amount,
                description: 'Banco'
            }
        ];

        // Si hay retenciones
        if (payment.retentions && payment.retentions.length > 0) {
            for (const ret of payment.retentions) {
                const retAccount = await db.FinanceChartOfAccounts.findOne({
                    where: {
                        company_id: companyId,
                        account_code: { [db.Sequelize.Op.like]: `2102%` }, // Retenciones
                        is_active: true
                    }
                });

                if (retAccount) {
                    lines.push({
                        accountId: retAccount.id,
                        debit: 0,
                        credit: ret.amount,
                        description: `Retención ${ret.type}`
                    });
                }
            }
        }

        return this.createAutoEntry(companyId, {
            sourceType: 'procurement',
            sourceModule: 'procurement-management',
            sourceDocumentId: paymentId,
            sourceDocumentNumber: payment.payment_number,
            description: `Pago ${payment.payment_number} - ${payment.supplier?.business_name}`,
            lines,
            entryDate: payment.executed_at || new Date(),
            userId
        });
    }

    /**
     * Post de transacción bancaria
     */
    async postBankTransaction(companyId, transactionId, userId) {
        const transaction = await db.FinanceBankTransaction.findByPk(transactionId, {
            include: [{ model: db.FinanceBankAccount, as: 'bankAccount' }]
        });

        if (!transaction || transaction.company_id !== companyId) {
            throw new Error('Transacción bancaria no encontrada');
        }

        // Si ya está reconciliada, no hacer nada
        if (transaction.is_reconciled) {
            return null;
        }

        const bankAccount = transaction.bankAccount;
        if (!bankAccount?.ledger_account_id) {
            throw new Error('Cuenta bancaria no tiene cuenta contable vinculada');
        }

        const bankLedgerAccount = await db.FinanceChartOfAccounts.findByPk(bankAccount.ledger_account_id);

        // Determinar contracuenta según tipo de transacción
        let contraAccountCode;
        switch (transaction.transaction_type) {
            case 'fee':
                contraAccountCode = '6101%'; // Gastos Bancarios
                break;
            case 'interest':
                contraAccountCode = '6102%'; // Intereses Ganados
                break;
            default:
                contraAccountCode = '1109%'; // Fondos a Identificar
        }

        const contraAccount = await db.FinanceChartOfAccounts.findOne({
            where: {
                company_id: companyId,
                account_code: { [db.Sequelize.Op.like]: contraAccountCode },
                is_active: true,
                is_header: false
            }
        });

        if (!contraAccount) {
            throw new Error('Cuenta contraria no encontrada');
        }

        const amount = Math.abs(parseFloat(transaction.amount));
        const isDebit = transaction.isInflow();

        const lines = [
            {
                accountId: bankLedgerAccount.id,
                debit: isDebit ? amount : 0,
                credit: isDebit ? 0 : amount,
                description: 'Banco'
            },
            {
                accountId: contraAccount.id,
                debit: isDebit ? 0 : amount,
                credit: isDebit ? amount : 0,
                description: transaction.description || 'Movimiento bancario'
            }
        ];

        const entry = await this.createAutoEntry(companyId, {
            sourceType: 'bank',
            sourceModule: 'finance-enterprise',
            sourceDocumentId: transactionId,
            sourceDocumentNumber: transaction.transaction_number || `TRX-${transactionId}`,
            description: transaction.description || `Transacción bancaria ${transaction.transaction_type}`,
            lines,
            entryDate: transaction.transaction_date,
            userId
        });

        // Marcar transacción como reconciliada
        await transaction.reconcile(entry.id, userId);

        return entry;
    }
}

// Singleton
const financeAutoPostingService = new FinanceAutoPostingService();

module.exports = financeAutoPostingService;
