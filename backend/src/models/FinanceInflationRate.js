/**
 * FinanceInflationRate Model
 * Tasas de inflación mensuales para ajustes presupuestarios
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceInflationRate = sequelize.define('FinanceInflationRate', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            references: { model: 'companies', key: 'company_id' },
            comment: 'NULL para tasas globales'
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        month: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 12
            }
        },
        monthly_rate: {
            type: DataTypes.DECIMAL(8, 4),
            allowNull: false,
            comment: 'Tasa mensual %'
        },
        annual_rate: {
            type: DataTypes.DECIMAL(8, 4),
            comment: 'Tasa anualizada %'
        },
        accumulated_rate: {
            type: DataTypes.DECIMAL(8, 4),
            comment: 'Acumulada del año %'
        },
        source: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['indec', 'bcra', 'manual', 'projected', null]]
            }
        },
        is_projected: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'finance_inflation_rates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'year', 'month'] },
            { fields: ['year', 'is_projected'] }
        ]
    });

    // Calcular tasa anualizada desde mensual
    FinanceInflationRate.calculateAnnualized = function(monthlyRate) {
        return (Math.pow(1 + monthlyRate / 100, 12) - 1) * 100;
    };

    // Obtener tasa de un mes específico
    FinanceInflationRate.getRate = async function(companyId, year, month) {
        // Primero buscar específica de empresa
        let rate = await this.findOne({
            where: { company_id: companyId, year, month }
        });

        // Si no existe, buscar global
        if (!rate) {
            rate = await this.findOne({
                where: { company_id: null, year, month }
            });
        }

        return rate;
    };

    // Obtener tasas de un año
    FinanceInflationRate.getYearRates = async function(companyId, year) {
        const { Op } = sequelize.Sequelize;

        // Obtener tasas de empresa y globales
        const rates = await this.findAll({
            where: {
                [Op.or]: [
                    { company_id: companyId },
                    { company_id: null }
                ],
                year
            },
            order: [['month', 'ASC']]
        });

        // Consolidar (prioridad empresa sobre global)
        const result = {};
        for (const rate of rates) {
            if (!result[rate.month] || rate.company_id !== null) {
                result[rate.month] = rate;
            }
        }

        return Object.values(result).sort((a, b) => a.month - b.month);
    };

    // Calcular acumulada del año
    FinanceInflationRate.calculateYearAccumulated = async function(companyId, year, upToMonth = 12) {
        const rates = await this.getYearRates(companyId, year);

        let accumulated = 1;
        for (const rate of rates) {
            if (rate.month <= upToMonth) {
                accumulated *= (1 + rate.monthly_rate / 100);
            }
        }

        return (accumulated - 1) * 100;
    };

    // Obtener proyección para un período
    FinanceInflationRate.getProjection = async function(companyId, fromYear, fromMonth, months) {
        const projections = [];
        let currentYear = fromYear;
        let currentMonth = fromMonth;

        for (let i = 0; i < months; i++) {
            const rate = await this.getRate(companyId, currentYear, currentMonth);

            projections.push({
                year: currentYear,
                month: currentMonth,
                rate: rate ? rate.monthly_rate : null,
                is_projected: rate ? rate.is_projected : true,
                source: rate ? rate.source : 'unknown'
            });

            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }

        return projections;
    };

    // Registrar tasa mensual
    FinanceInflationRate.setRate = async function(companyId, year, month, rate, source = 'manual', isProjected = false) {
        const [record, created] = await this.findOrCreate({
            where: { company_id: companyId, year, month },
            defaults: {
                monthly_rate: rate,
                annual_rate: this.calculateAnnualized(rate),
                source,
                is_projected: isProjected
            }
        });

        if (!created) {
            record.monthly_rate = rate;
            record.annual_rate = this.calculateAnnualized(rate);
            record.source = source;
            record.is_projected = isProjected;
            await record.save();
        }

        // Recalcular acumulada
        record.accumulated_rate = await this.calculateYearAccumulated(companyId, year, month);
        await record.save();

        return record;
    };

    // Importar tasas desde array
    FinanceInflationRate.bulkImport = async function(companyId, year, rates, source = 'manual') {
        // rates es array de 12 valores [enero, febrero, ...]
        const results = [];

        for (let i = 0; i < rates.length && i < 12; i++) {
            if (rates[i] !== null && rates[i] !== undefined) {
                const result = await this.setRate(companyId, year, i + 1, rates[i], source);
                results.push(result);
            }
        }

        return results;
    };

    // Obtener estadísticas de inflación
    FinanceInflationRate.getStats = async function(companyId, year) {
        const rates = await this.getYearRates(companyId, year);

        if (rates.length === 0) {
            return {
                average_monthly: 0,
                max_monthly: 0,
                min_monthly: 0,
                accumulated: 0,
                months_with_data: 0
            };
        }

        const monthlyRates = rates.map(r => parseFloat(r.monthly_rate));

        return {
            average_monthly: monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length,
            max_monthly: Math.max(...monthlyRates),
            min_monthly: Math.min(...monthlyRates),
            accumulated: await this.calculateYearAccumulated(companyId, year, rates.length),
            months_with_data: rates.length
        };
    };

    return FinanceInflationRate;
};
