/**
 * CheckManagementService
 * Servicio para Gestión de Cartera de Cheques
 * Maneja: Chequeras, Cheques emitidos, Cartera, Tracking de estados
 */

const { Op, QueryTypes } = require('sequelize');

class CheckManagementService {
    constructor(db) {
        this.db = db;
        this.FinanceCheckBook = db.FinanceCheckBook;
        this.FinanceIssuedCheck = db.FinanceIssuedCheck;
        this.FinanceBankAccount = db.FinanceBankAccount;
        this.sequelize = db.sequelize;
    }

    // ==========================================
    // GESTIÓN DE CHEQUERAS
    // ==========================================

    /**
     * Crear nueva chequera
     */
    async createCheckbook(data, userId) {
        // Validar rango de cheques
        if (data.last_check_number <= data.first_check_number) {
            throw new Error('El último número de cheque debe ser mayor al primero');
        }

        // Verificar que no exista chequera con mismo número
        const existing = await this.FinanceCheckBook.findOne({
            where: {
                company_id: data.company_id,
                checkbook_number: data.checkbook_number
            }
        });

        if (existing) {
            throw new Error(`Ya existe una chequera con número ${data.checkbook_number}`);
        }

        // Obtener datos del banco si se proporciona bank_account_id
        let bankData = {};
        if (data.bank_account_id && this.FinanceBankAccount) {
            const bankAccount = await this.FinanceBankAccount.findByPk(data.bank_account_id);
            if (bankAccount) {
                bankData = {
                    bank_name: bankAccount.bank_name,
                    account_number: bankAccount.account_number,
                    currency: bankAccount.currency
                };
            }
        }

        const checkbook = await this.FinanceCheckBook.create({
            company_id: data.company_id,
            branch_id: data.branch_id,
            checkbook_number: data.checkbook_number,
            checkbook_code: data.checkbook_code,
            bank_account_id: data.bank_account_id,
            ...bankData,
            first_check_number: data.first_check_number,
            last_check_number: data.last_check_number,
            current_check_number: data.first_check_number,
            received_date: data.received_date || new Date(),
            activated_date: data.activated_date,
            expiry_date: data.expiry_date,
            location: data.location,
            assigned_to: data.assigned_to,
            notes: data.notes,
            created_by: userId
        });

        return checkbook;
    }

    /**
     * Obtener chequeras de una empresa
     */
    async getCheckbooks(companyId, filters = {}) {
        const where = { company_id: companyId };

        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.bank_account_id) {
            where.bank_account_id = filters.bank_account_id;
        }
        if (filters.assigned_to) {
            where.assigned_to = filters.assigned_to;
        }

        return this.FinanceCheckBook.findAll({
            where,
            order: [['status', 'ASC'], ['created_at', 'DESC']],
            include: this.FinanceBankAccount ? [{
                model: this.FinanceBankAccount,
                as: 'bankAccount',
                attributes: ['id', 'account_name', 'bank_name', 'account_number']
            }] : []
        });
    }

    /**
     * Obtener chequera por ID
     */
    async getCheckbookById(id) {
        return this.FinanceCheckBook.findByPk(id, {
            include: [
                this.FinanceBankAccount ? {
                    model: this.FinanceBankAccount,
                    as: 'bankAccount'
                } : null,
                {
                    model: this.FinanceIssuedCheck,
                    as: 'issuedChecks',
                    order: [['check_number', 'ASC']]
                }
            ].filter(Boolean)
        });
    }

    /**
     * Obtener chequeras con cheques disponibles
     */
    async getAvailableCheckbooks(companyId, currency = null) {
        return this.FinanceCheckBook.getWithAvailableChecks(companyId, null);
    }

    /**
     * Cancelar chequera
     */
    async cancelCheckbook(id, reason, userId) {
        const checkbook = await this.FinanceCheckBook.findByPk(id);
        if (!checkbook) {
            throw new Error('Chequera no encontrada');
        }

        // Verificar que no tenga cheques pendientes
        const pendingChecks = await this.FinanceIssuedCheck.count({
            where: {
                checkbook_id: id,
                status: { [Op.in]: ['issued', 'delivered'] }
            }
        });

        if (pendingChecks > 0) {
            throw new Error(`No se puede cancelar: hay ${pendingChecks} cheques pendientes`);
        }

        return checkbook.cancel(reason);
    }

    /**
     * Estadísticas de chequeras
     */
    async getCheckbookStats(companyId) {
        return this.FinanceCheckBook.getStats(companyId);
    }

    // ==========================================
    // GESTIÓN DE CHEQUES EMITIDOS
    // ==========================================

    /**
     * Emitir cheque manualmente (sin orden de pago)
     */
    async issueCheck(data, userId) {
        const transaction = await this.sequelize.transaction();

        try {
            const checkbook = await this.FinanceCheckBook.findByPk(data.checkbook_id);
            if (!checkbook) {
                throw new Error('Chequera no encontrada');
            }

            // Obtener próximo número de cheque
            const checkNumber = await checkbook.useCheck();

            // Crear el cheque
            const check = await this.FinanceIssuedCheck.create({
                company_id: data.company_id || checkbook.company_id,
                checkbook_id: checkbook.id,
                check_number: checkNumber,
                payment_order_id: data.payment_order_id,
                beneficiary_name: data.beneficiary_name,
                beneficiary_cuit: data.beneficiary_cuit,
                beneficiary_type: data.beneficiary_type,
                beneficiary_id: data.beneficiary_id,
                amount: data.amount,
                currency: data.currency || checkbook.currency || 'ARS',
                amount_in_words: this.FinanceIssuedCheck.amountToWords(
                    parseFloat(data.amount),
                    data.currency || 'ARS'
                ),
                issue_date: data.issue_date || new Date(),
                payment_date: data.payment_date,
                check_type: data.check_type || 'common',
                status: 'issued',
                notes: data.notes,
                created_by: userId
            }, { transaction });

            check.addAuditEntry('issued', userId, {
                amount: data.amount,
                beneficiary: data.beneficiary_name
            });
            await check.save({ transaction });

            await transaction.commit();
            return check;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Listar cheques emitidos
     */
    async getIssuedChecks(companyId, filters = {}) {
        const where = { company_id: companyId };

        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.checkbook_id) {
            where.checkbook_id = filters.checkbook_id;
        }
        if (filters.beneficiary_type) {
            where.beneficiary_type = filters.beneficiary_type;
        }
        if (filters.beneficiary_id) {
            where.beneficiary_id = filters.beneficiary_id;
        }
        if (filters.date_from && filters.date_to) {
            where.payment_date = {
                [Op.between]: [filters.date_from, filters.date_to]
            };
        }

        const options = {
            where,
            include: [{
                model: this.FinanceCheckBook,
                as: 'checkbook',
                attributes: ['id', 'checkbook_number', 'bank_name', 'account_number']
            }],
            order: [[filters.sort_by || 'payment_date', filters.sort_order || 'ASC']],
            limit: filters.limit || 100,
            offset: filters.offset || 0
        };

        const { count, rows } = await this.FinanceIssuedCheck.findAndCountAll(options);

        return {
            total: count,
            data: rows,
            page: Math.floor((filters.offset || 0) / (filters.limit || 100)) + 1,
            pages: Math.ceil(count / (filters.limit || 100))
        };
    }

    /**
     * Obtener cheque por ID
     */
    async getCheckById(id) {
        return this.FinanceIssuedCheck.findByPk(id, {
            include: [
                {
                    model: this.FinanceCheckBook,
                    as: 'checkbook',
                    attributes: ['id', 'checkbook_number', 'bank_name', 'account_number']
                },
                {
                    model: this.db.FinancePaymentOrder,
                    as: 'paymentOrder',
                    attributes: ['id', 'order_number', 'supplier_name']
                }
            ]
        });
    }

    /**
     * Marcar cheque como entregado
     */
    async deliverCheck(id, deliveredTo, userId, notes = '') {
        const check = await this.FinanceIssuedCheck.findByPk(id);
        if (!check) {
            throw new Error('Cheque no encontrado');
        }
        return check.markDelivered(deliveredTo, userId, notes);
    }

    /**
     * Marcar cheque como cobrado
     */
    async cashCheck(id, userId, bank = null) {
        const check = await this.FinanceIssuedCheck.findByPk(id);
        if (!check) {
            throw new Error('Cheque no encontrado');
        }
        return check.markCashed(userId, bank);
    }

    /**
     * Marcar cheque como rebotado
     */
    async bounceCheck(id, reason, bounceCode, userId) {
        const check = await this.FinanceIssuedCheck.findByPk(id);
        if (!check) {
            throw new Error('Cheque no encontrado');
        }
        return check.markBounced(reason, bounceCode, userId);
    }

    /**
     * Anular cheque (antes de entregar)
     */
    async voidCheck(id, reason, userId) {
        const check = await this.FinanceIssuedCheck.findByPk(id);
        if (!check) {
            throw new Error('Cheque no encontrado');
        }
        return check.void(reason, userId);
    }

    /**
     * Cancelar cheque (después de entregar)
     */
    async cancelCheck(id, reason, userId) {
        const check = await this.FinanceIssuedCheck.findByPk(id);
        if (!check) {
            throw new Error('Cheque no encontrado');
        }
        return check.cancel(reason, userId);
    }

    /**
     * Reemplazar cheque rebotado/anulado
     */
    async replaceCheck(id, newCheckData, userId) {
        const check = await this.FinanceIssuedCheck.findByPk(id);
        if (!check) {
            throw new Error('Cheque no encontrado');
        }

        // Preparar datos del nuevo cheque
        const replacementData = {
            company_id: check.company_id,
            checkbook_id: newCheckData.checkbook_id || check.checkbook_id,
            beneficiary_name: check.beneficiary_name,
            beneficiary_cuit: check.beneficiary_cuit,
            beneficiary_type: check.beneficiary_type,
            beneficiary_id: check.beneficiary_id,
            amount: newCheckData.amount || check.amount,
            currency: check.currency,
            issue_date: new Date(),
            payment_date: newCheckData.payment_date,
            check_type: newCheckData.check_type || check.check_type,
            payment_order_id: check.payment_order_id,
            created_by: userId
        };

        return check.createReplacement(replacementData, userId);
    }

    // ==========================================
    // CARTERA DE CHEQUES
    // ==========================================

    /**
     * Obtener cartera de cheques (pendientes de cobro)
     */
    async getPortfolio(companyId, dateFrom = null, dateTo = null) {
        return this.FinanceIssuedCheck.getPortfolio(companyId, dateFrom, dateTo);
    }

    /**
     * Obtener cheques rebotados
     */
    async getBouncedChecks(companyId) {
        return this.FinanceIssuedCheck.getBounced(companyId);
    }

    /**
     * Obtener cheques próximos a vencer
     */
    async getUpcomingChecks(companyId, days = 7) {
        return this.FinanceIssuedCheck.getUpcoming(companyId, days);
    }

    /**
     * Estadísticas de cheques
     */
    async getCheckStats(companyId) {
        return this.FinanceIssuedCheck.getStats(companyId);
    }

    /**
     * Resumen completo de cartera
     */
    async getPortfolioSummary(companyId) {
        const query = `SELECT * FROM get_checks_portfolio_summary($1)`;
        const [result] = await this.sequelize.query(query, {
            bind: [companyId],
            type: QueryTypes.SELECT
        });
        return result;
    }

    /**
     * Análisis de vencimientos de cartera
     */
    async getMaturityAnalysis(companyId) {
        const today = new Date();
        const week = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const fortnight = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
        const month = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        const query = `
            SELECT
                CASE
                    WHEN payment_date < CURRENT_DATE THEN 'overdue'
                    WHEN payment_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
                    WHEN payment_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'next_week'
                    WHEN payment_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'this_month'
                    ELSE 'later'
                END as period,
                COUNT(*) as check_count,
                SUM(amount) as total_amount
            FROM finance_issued_checks
            WHERE company_id = :company_id
              AND status IN ('issued', 'delivered')
            GROUP BY
                CASE
                    WHEN payment_date < CURRENT_DATE THEN 'overdue'
                    WHEN payment_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'this_week'
                    WHEN payment_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'next_week'
                    WHEN payment_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'this_month'
                    ELSE 'later'
                END
            ORDER BY
                CASE
                    WHEN payment_date < CURRENT_DATE THEN 1
                    WHEN payment_date <= CURRENT_DATE + INTERVAL '7 days' THEN 2
                    WHEN payment_date <= CURRENT_DATE + INTERVAL '14 days' THEN 3
                    WHEN payment_date <= CURRENT_DATE + INTERVAL '30 days' THEN 4
                    ELSE 5
                END
        `;

        const result = await this.sequelize.query(query, {
            replacements: { company_id: companyId },
            type: QueryTypes.SELECT
        });

        // Formatear resultado
        const analysis = {
            overdue: { count: 0, amount: 0 },
            this_week: { count: 0, amount: 0 },
            next_week: { count: 0, amount: 0 },
            this_month: { count: 0, amount: 0 },
            later: { count: 0, amount: 0 }
        };

        result.forEach(row => {
            analysis[row.period] = {
                count: parseInt(row.check_count),
                amount: parseFloat(row.total_amount)
            };
        });

        return analysis;
    }

    /**
     * Cheques por beneficiario
     */
    async getChecksByBeneficiary(companyId, beneficiaryId = null, beneficiaryType = null) {
        const where = {
            company_id: companyId,
            status: { [Op.in]: ['issued', 'delivered'] }
        };

        if (beneficiaryId) {
            where.beneficiary_id = beneficiaryId;
        }
        if (beneficiaryType) {
            where.beneficiary_type = beneficiaryType;
        }

        const query = `
            SELECT
                beneficiary_id,
                beneficiary_name,
                beneficiary_type,
                COUNT(*) as check_count,
                SUM(amount) as total_amount,
                MIN(payment_date) as earliest_payment,
                MAX(payment_date) as latest_payment
            FROM finance_issued_checks
            WHERE company_id = :company_id
              AND status IN ('issued', 'delivered')
              ${beneficiaryType ? 'AND beneficiary_type = :beneficiary_type' : ''}
            GROUP BY beneficiary_id, beneficiary_name, beneficiary_type
            ORDER BY total_amount DESC
            LIMIT 50
        `;

        return this.sequelize.query(query, {
            replacements: { company_id: companyId, beneficiary_type: beneficiaryType },
            type: QueryTypes.SELECT
        });
    }

    /**
     * Timeline de cheques (para visualización)
     */
    async getCheckTimeline(companyId, days = 60) {
        const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        const query = `
            SELECT
                payment_date,
                COUNT(*) as check_count,
                SUM(amount) as total_amount,
                STRING_AGG(DISTINCT beneficiary_name, ', ') as beneficiaries
            FROM finance_issued_checks
            WHERE company_id = :company_id
              AND status IN ('issued', 'delivered')
              AND payment_date BETWEEN CURRENT_DATE AND :end_date
            GROUP BY payment_date
            ORDER BY payment_date
        `;

        const result = await this.sequelize.query(query, {
            replacements: { company_id: companyId, end_date: endDate },
            type: QueryTypes.SELECT
        });

        // Llenar días sin cheques
        const timeline = [];
        let currentDate = new Date();

        for (let i = 0; i < days; i++) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const existing = result.find(r =>
                new Date(r.payment_date).toISOString().split('T')[0] === dateStr
            );

            timeline.push({
                date: dateStr,
                check_count: parseInt(existing?.check_count || 0),
                total_amount: parseFloat(existing?.total_amount || 0),
                beneficiaries: existing?.beneficiaries || null,
                has_checks: !!existing
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return timeline;
    }

    /**
     * Obtener historial de un cheque
     */
    async getCheckHistory(id) {
        const check = await this.FinanceIssuedCheck.findByPk(id);
        if (!check) {
            throw new Error('Cheque no encontrado');
        }

        return {
            check: {
                id: check.id,
                check_number: check.check_number,
                beneficiary_name: check.beneficiary_name,
                amount: check.amount,
                status: check.status
            },
            history: check.audit_trail || [],
            events: [
                { event: 'Emitido', date: check.created_at },
                check.delivered_at && { event: 'Entregado', date: check.delivered_at, to: check.delivered_to },
                check.cashed_at && { event: 'Cobrado', date: check.cashed_at, bank: check.cashed_bank },
                check.bounced_at && { event: 'Rechazado', date: check.bounced_at, reason: check.bounce_reason },
                check.voided_at && { event: 'Anulado', date: check.voided_at, reason: check.void_reason }
            ].filter(Boolean)
        };
    }

    /**
     * Búsqueda de cheques
     */
    async searchChecks(companyId, searchTerm) {
        const where = {
            company_id: companyId,
            [Op.or]: [
                { beneficiary_name: { [Op.iLike]: `%${searchTerm}%` } },
                { beneficiary_cuit: { [Op.iLike]: `%${searchTerm}%` } },
                this.sequelize.where(
                    this.sequelize.cast(this.sequelize.col('check_number'), 'TEXT'),
                    { [Op.iLike]: `%${searchTerm}%` }
                )
            ]
        };

        return this.FinanceIssuedCheck.findAll({
            where,
            include: [{
                model: this.FinanceCheckBook,
                as: 'checkbook',
                attributes: ['checkbook_number', 'bank_name']
            }],
            order: [['created_at', 'DESC']],
            limit: 50
        });
    }

    /**
     * Dashboard de cartera de cheques
     */
    async getDashboardData(companyId) {
        const [
            stats,
            portfolioSummary,
            maturityAnalysis,
            upcomingChecks,
            bouncedChecks
        ] = await Promise.all([
            this.getCheckStats(companyId),
            this.getPortfolioSummary(companyId),
            this.getMaturityAnalysis(companyId),
            this.getUpcomingChecks(companyId, 7),
            this.getBouncedChecks(companyId)
        ]);

        return {
            stats,
            portfolioSummary,
            maturityAnalysis,
            upcomingChecks: upcomingChecks.slice(0, 10),
            bouncedChecks: bouncedChecks.slice(0, 5),
            alerts: this.generateAlerts(stats, maturityAnalysis, bouncedChecks)
        };
    }

    /**
     * Generar alertas basadas en estado de cartera
     */
    generateAlerts(stats, maturityAnalysis, bouncedChecks) {
        const alerts = [];

        // Alerta de cheques rebotados
        if (bouncedChecks.length > 0) {
            alerts.push({
                type: 'danger',
                title: 'Cheques Rechazados',
                message: `Hay ${bouncedChecks.length} cheque(s) rechazado(s) pendientes de gestión`,
                count: bouncedChecks.length
            });
        }

        // Alerta de cheques vencidos
        if (maturityAnalysis.overdue.count > 0) {
            alerts.push({
                type: 'warning',
                title: 'Cheques Vencidos',
                message: `${maturityAnalysis.overdue.count} cheque(s) con fecha de pago vencida`,
                amount: maturityAnalysis.overdue.amount
            });
        }

        // Alerta de vencimientos próximos
        if (maturityAnalysis.this_week.count > 5) {
            alerts.push({
                type: 'info',
                title: 'Vencimientos Esta Semana',
                message: `${maturityAnalysis.this_week.count} cheques vencen esta semana`,
                amount: maturityAnalysis.this_week.amount
            });
        }

        // Alerta de tasa de rechazo alta
        const bounceRate = parseFloat(stats.bounce_rate);
        if (bounceRate > 5) {
            alerts.push({
                type: 'warning',
                title: 'Tasa de Rechazo Alta',
                message: `Tasa de rechazo: ${bounceRate}%. Considere revisar beneficiarios`,
                rate: bounceRate
            });
        }

        return alerts;
    }
}

module.exports = CheckManagementService;
