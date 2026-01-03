/**
 * FinanceFiscalPeriod Model
 * Períodos fiscales con control de apertura/cierre
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceFiscalPeriod = sequelize.define('FinanceFiscalPeriod', {
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
        fiscal_year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        period_number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '1-12 meses normales, 13 período de ajuste'
        },
        period_name: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'open',
            validate: {
                isIn: [['open', 'closed', 'locked', 'adjustment']]
            }
        },
        is_adjustment_period: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        closed_at: {
            type: DataTypes.DATE
        },
        closed_by: {
            type: DataTypes.UUID
        },
        reopened_at: {
            type: DataTypes.DATE
        },
        reopened_by: {
            type: DataTypes.UUID
        },
        reopen_reason: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_fiscal_periods',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'fiscal_year', 'period_number'] },
            { fields: ['company_id', 'status'] }
        ]
    });

    // Verificar si permite imputaciones
    FinanceFiscalPeriod.prototype.isOpen = function() {
        return this.status === 'open' || this.status === 'adjustment';
    };

    // Cerrar período
    FinanceFiscalPeriod.prototype.close = async function(userId) {
        if (this.status === 'locked') {
            throw new Error('El período está bloqueado permanentemente');
        }

        this.status = 'closed';
        this.closed_at = new Date();
        this.closed_by = userId;
        return this.save();
    };

    // Reabrir período
    FinanceFiscalPeriod.prototype.reopen = async function(userId, reason) {
        if (this.status === 'locked') {
            throw new Error('El período está bloqueado permanentemente');
        }

        this.status = 'open';
        this.reopened_at = new Date();
        this.reopened_by = userId;
        this.reopen_reason = reason;
        return this.save();
    };

    // Bloquear período permanentemente
    FinanceFiscalPeriod.prototype.lock = async function(userId) {
        this.status = 'locked';
        this.closed_at = new Date();
        this.closed_by = userId;
        return this.save();
    };

    // Obtener período actual
    FinanceFiscalPeriod.getCurrent = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        const today = new Date();

        return this.findOne({
            where: {
                company_id: companyId,
                start_date: { [Op.lte]: today },
                end_date: { [Op.gte]: today },
                is_adjustment_period: false
            }
        });
    };

    // Obtener período por fecha
    FinanceFiscalPeriod.getByDate = async function(companyId, date) {
        const { Op } = sequelize.Sequelize;

        return this.findOne({
            where: {
                company_id: companyId,
                start_date: { [Op.lte]: date },
                end_date: { [Op.gte]: date },
                is_adjustment_period: false
            }
        });
    };

    // Obtener períodos de un año fiscal
    FinanceFiscalPeriod.getByYear = async function(companyId, fiscalYear) {
        return this.findAll({
            where: {
                company_id: companyId,
                fiscal_year: fiscalYear
            },
            order: [['period_number', 'ASC']]
        });
    };

    // Obtener períodos abiertos
    FinanceFiscalPeriod.getOpen = async function(companyId) {
        const { Op } = sequelize.Sequelize;

        return this.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['open', 'adjustment'] }
            },
            order: [['fiscal_year', 'ASC'], ['period_number', 'ASC']]
        });
    };

    // Crear períodos para un año fiscal
    FinanceFiscalPeriod.createYearPeriods = async function(companyId, fiscalYear, startMonth = 1) {
        const periods = [];

        for (let i = 0; i < 12; i++) {
            const month = ((startMonth - 1 + i) % 12) + 1;
            const year = fiscalYear + Math.floor((startMonth - 1 + i) / 12);

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];

            periods.push(await this.create({
                company_id: companyId,
                fiscal_year: fiscalYear,
                period_number: i + 1,
                period_name: `${monthNames[month - 1]} ${year}`,
                start_date: startDate,
                end_date: endDate,
                status: 'open',
                is_adjustment_period: false
            }));
        }

        // Período 13 de ajuste
        const lastPeriod = periods[11];
        periods.push(await this.create({
            company_id: companyId,
            fiscal_year: fiscalYear,
            period_number: 13,
            period_name: `Ajuste ${fiscalYear}`,
            start_date: lastPeriod.end_date,
            end_date: lastPeriod.end_date,
            status: 'closed',
            is_adjustment_period: true
        }));

        return periods;
    };

    // Verificar si una fecha puede imputarse
    FinanceFiscalPeriod.canPost = async function(companyId, date) {
        const period = await this.getByDate(companyId, date);
        if (!period) return { canPost: false, reason: 'No existe período fiscal para la fecha' };
        if (!period.isOpen()) return { canPost: false, reason: `El período ${period.period_name} está cerrado` };
        return { canPost: true, period };
    };

    return FinanceFiscalPeriod;
};
