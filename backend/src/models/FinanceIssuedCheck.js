/**
 * Finance Issued Check Model
 * Cheques Emitidos - Trazabilidad completa del ciclo de vida
 * Estados: emitido → entregado → cobrado/rechazado/anulado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceIssuedCheck = sequelize.define('FinanceIssuedCheck', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },

        // Chequera origen
        checkbook_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_checkbooks', key: 'id' }
        },
        check_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Número impreso en el cheque'
        },

        // Orden de pago
        payment_order_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_payment_orders', key: 'id' }
        },

        // Beneficiario
        beneficiary_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: 'Nombre del beneficiario'
        },
        beneficiary_cuit: {
            type: DataTypes.STRING(20)
        },
        beneficiary_type: {
            type: DataTypes.STRING(30),
            validate: {
                isIn: [['supplier', 'employee', 'third_party', 'other', null]]
            }
        },
        beneficiary_id: {
            type: DataTypes.INTEGER,
            comment: 'ID del proveedor/empleado si aplica'
        },

        // Monto
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        amount_in_words: {
            type: DataTypes.TEXT,
            comment: 'Monto en letras'
        },

        // Fechas
        issue_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Fecha de emisión del cheque'
        },
        payment_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha de pago (diferido) o NULL si al día'
        },
        is_postdated: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'true si es cheque diferido'
        },

        // Tipo de cheque
        check_type: {
            type: DataTypes.STRING(30),
            defaultValue: 'common',
            validate: {
                isIn: [['common', 'certified', 'crossed', 'not_to_order']]
            }
        },

        // Estado del cheque
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'issued',
            validate: {
                isIn: [[
                    'issued',      // Emitido, aún en poder de la empresa
                    'delivered',   // Entregado al beneficiario
                    'cashed',      // Cobrado por el beneficiario
                    'bounced',     // Rechazado por el banco
                    'voided',      // Anulado antes de entrega
                    'cancelled',   // Cancelado después de entrega
                    'replaced'     // Reemplazado por otro cheque
                ]]
            }
        },

        // Tracking de entrega
        delivered_to: {
            type: DataTypes.STRING(200),
            comment: 'Persona que recibió el cheque'
        },
        delivered_at: {
            type: DataTypes.DATE
        },
        delivery_notes: {
            type: DataTypes.TEXT
        },

        // Tracking de cobro
        cashed_at: {
            type: DataTypes.DATE
        },
        cashed_bank: {
            type: DataTypes.STRING(200),
            comment: 'Banco donde se depositó/cobró'
        },

        // Si rebotó
        bounced_at: {
            type: DataTypes.DATE
        },
        bounce_reason: {
            type: DataTypes.TEXT,
            comment: 'Motivo del rechazo'
        },
        bounce_code: {
            type: DataTypes.STRING(10),
            comment: 'Código de rechazo bancario'
        },

        // Si fue reemplazado
        replacement_check_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_issued_checks', key: 'id' },
            comment: 'ID del cheque que lo reemplaza'
        },

        // Anulación
        voided_at: {
            type: DataTypes.DATE
        },
        voided_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        void_reason: {
            type: DataTypes.TEXT
        },

        // Integración con movimientos de caja
        cash_movement_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_movements', key: 'id' }
        },

        // Notas
        notes: {
            type: DataTypes.TEXT
        },
        internal_notes: {
            type: DataTypes.TEXT,
            comment: 'Notas internas'
        },

        // Audit trail
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // Auditoría
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_issued_checks',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['checkbook_id', 'check_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['payment_order_id'] },
            { fields: ['beneficiary_id'] },
            { fields: ['payment_date'] },
            { fields: ['status', 'payment_date'] }
        ],
        hooks: {
            beforeCreate: async (check) => {
                // Determinar si es diferido
                if (check.payment_date && check.issue_date) {
                    const issue = new Date(check.issue_date);
                    const payment = new Date(check.payment_date);
                    check.is_postdated = payment > issue;
                }
            }
        }
    });

    // Agregar entrada de auditoría
    FinanceIssuedCheck.prototype.addAuditEntry = function(action, userId, details = {}) {
        const trail = this.audit_trail || [];
        trail.push({
            action,
            user_id: userId,
            timestamp: new Date().toISOString(),
            previous_status: this.status,
            details
        });
        this.audit_trail = trail;
    };

    // Marcar como entregado
    FinanceIssuedCheck.prototype.markDelivered = async function(deliveredTo, userId, notes = '') {
        if (this.status !== 'issued') {
            throw new Error('Solo cheques emitidos pueden marcarse como entregados');
        }

        this.status = 'delivered';
        this.delivered_to = deliveredTo;
        this.delivered_at = new Date();
        this.delivery_notes = notes;
        this.addAuditEntry('delivered', userId, { delivered_to: deliveredTo });

        return this.save();
    };

    // Marcar como cobrado
    FinanceIssuedCheck.prototype.markCashed = async function(userId, bank = null) {
        if (this.status !== 'delivered') {
            throw new Error('Solo cheques entregados pueden marcarse como cobrados');
        }

        this.status = 'cashed';
        this.cashed_at = new Date();
        this.cashed_bank = bank;
        this.addAuditEntry('cashed', userId, { bank });

        return this.save();
    };

    // Marcar como rebotado
    FinanceIssuedCheck.prototype.markBounced = async function(reason, bounceCode, userId) {
        if (!['delivered', 'cashed'].includes(this.status)) {
            throw new Error('Solo cheques entregados o en proceso de cobro pueden rechazarse');
        }

        this.status = 'bounced';
        this.bounced_at = new Date();
        this.bounce_reason = reason;
        this.bounce_code = bounceCode;
        this.addAuditEntry('bounced', userId, { reason, code: bounceCode });

        return this.save();
    };

    // Anular cheque (antes de entregar)
    FinanceIssuedCheck.prototype.void = async function(reason, userId) {
        if (this.status !== 'issued') {
            throw new Error('Solo cheques no entregados pueden anularse');
        }

        this.status = 'voided';
        this.voided_at = new Date();
        this.voided_by = userId;
        this.void_reason = reason;
        this.addAuditEntry('voided', userId, { reason });

        return this.save();
    };

    // Cancelar cheque (después de entregar)
    FinanceIssuedCheck.prototype.cancel = async function(reason, userId) {
        if (this.status !== 'delivered') {
            throw new Error('Solo cheques entregados pueden cancelarse');
        }

        this.status = 'cancelled';
        this.voided_at = new Date();
        this.voided_by = userId;
        this.void_reason = reason;
        this.addAuditEntry('cancelled', userId, { reason });

        return this.save();
    };

    // Crear cheque de reemplazo
    FinanceIssuedCheck.prototype.createReplacement = async function(newCheckData, userId) {
        if (!['bounced', 'cancelled', 'voided'].includes(this.status)) {
            throw new Error('Solo cheques rebotados, cancelados o anulados pueden reemplazarse');
        }

        const replacement = await FinanceIssuedCheck.create({
            ...newCheckData,
            notes: `Reemplaza cheque #${this.check_number}`
        });

        this.status = 'replaced';
        this.replacement_check_id = replacement.id;
        this.addAuditEntry('replaced', userId, { replacement_id: replacement.id });
        await this.save();

        return replacement;
    };

    // Convertir monto a palabras (español)
    FinanceIssuedCheck.amountToWords = function(amount, currency = 'ARS') {
        // Implementación simplificada - en producción usar librería
        const currencyNames = {
            'ARS': 'PESOS',
            'USD': 'DÓLARES ESTADOUNIDENSES',
            'EUR': 'EUROS'
        };

        const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];

        // TODO: Implementar conversión completa
        return `${currencyNames[currency] || currency} ${amount.toLocaleString('es-AR')}`;
    };

    // Obtener cartera de cheques (pendientes de cobro)
    FinanceIssuedCheck.getPortfolio = async function(companyId, dateFrom = null, dateTo = null) {
        const { Op } = sequelize.Sequelize;
        const where = {
            company_id: companyId,
            status: { [Op.in]: ['issued', 'delivered'] }
        };

        if (dateFrom && dateTo) {
            where.payment_date = { [Op.between]: [dateFrom, dateTo] };
        }

        return this.findAll({
            where,
            order: [['payment_date', 'ASC']],
            include: [{
                model: sequelize.models.FinanceCheckBook,
                as: 'checkbook',
                attributes: ['bank_name', 'account_number']
            }]
        });
    };

    // Obtener cheques rebotados
    FinanceIssuedCheck.getBounced = async function(companyId) {
        return this.findAll({
            where: {
                company_id: companyId,
                status: 'bounced'
            },
            order: [['bounced_at', 'DESC']]
        });
    };

    // Obtener cheques por vencer (próximos X días)
    FinanceIssuedCheck.getUpcoming = async function(companyId, days = 7) {
        const { Op } = sequelize.Sequelize;
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + days);

        return this.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['issued', 'delivered'] },
                payment_date: { [Op.between]: [today, endDate] }
            },
            order: [['payment_date', 'ASC']]
        });
    };

    // Estadísticas de cheques
    FinanceIssuedCheck.getStats = async function(companyId) {
        const { Op } = sequelize.Sequelize;

        const [issued, delivered, cashed, bounced, totalPending, totalBounced] = await Promise.all([
            this.count({ where: { company_id: companyId, status: 'issued' } }),
            this.count({ where: { company_id: companyId, status: 'delivered' } }),
            this.count({ where: { company_id: companyId, status: 'cashed' } }),
            this.count({ where: { company_id: companyId, status: 'bounced' } }),
            this.sum('amount', {
                where: { company_id: companyId, status: { [Op.in]: ['issued', 'delivered'] } }
            }),
            this.sum('amount', {
                where: { company_id: companyId, status: 'bounced' }
            })
        ]);

        return {
            issued: issued || 0,
            delivered: delivered || 0,
            cashed: cashed || 0,
            bounced: bounced || 0,
            total_pending_amount: parseFloat(totalPending) || 0,
            total_bounced_amount: parseFloat(totalBounced) || 0,
            bounce_rate: (issued + delivered + cashed + bounced) > 0
                ? ((bounced / (issued + delivered + cashed + bounced)) * 100).toFixed(2)
                : 0
        };
    };

    // Asociaciones
    FinanceIssuedCheck.associate = (models) => {
        FinanceIssuedCheck.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinanceIssuedCheck.belongsTo(models.FinanceCheckBook, {
            foreignKey: 'checkbook_id',
            as: 'checkbook'
        });
        FinanceIssuedCheck.belongsTo(models.FinancePaymentOrder, {
            foreignKey: 'payment_order_id',
            as: 'paymentOrder'
        });
        FinanceIssuedCheck.belongsTo(models.FinanceCashMovement, {
            foreignKey: 'cash_movement_id',
            as: 'cashMovement'
        });
        FinanceIssuedCheck.belongsTo(models.FinanceIssuedCheck, {
            foreignKey: 'replacement_check_id',
            as: 'replacementCheck'
        });
        FinanceIssuedCheck.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        FinanceIssuedCheck.belongsTo(models.User, {
            foreignKey: 'voided_by',
            as: 'voider'
        });
    };

    return FinanceIssuedCheck;
};
