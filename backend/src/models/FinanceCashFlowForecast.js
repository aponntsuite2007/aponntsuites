/**
 * FinanceCashFlowForecast Model
 * Proyecciones de flujo de caja con escenarios
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCashFlowForecast = sequelize.define('FinanceCashFlowForecast', {
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
        forecast_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        forecast_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['daily', 'weekly', 'monthly']]
            }
        },
        scenario: {
            type: DataTypes.STRING(20),
            defaultValue: 'base',
            validate: {
                isIn: [['optimistic', 'base', 'pessimistic']]
            }
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        // Saldos
        opening_balance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        },
        // Entradas por tipo
        inflows_receivables: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Cobranzas esperadas'
        },
        inflows_sales: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Ventas de contado'
        },
        inflows_loans: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Préstamos/financiamiento'
        },
        inflows_other: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_inflows: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        // Salidas por tipo
        outflows_payables: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Pagos a proveedores'
        },
        outflows_payroll: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Sueldos y cargas sociales'
        },
        outflows_taxes: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Impuestos'
        },
        outflows_loans: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Cuotas de préstamos'
        },
        outflows_capex: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Inversiones de capital'
        },
        outflows_rent: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Alquileres'
        },
        outflows_utilities: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Servicios'
        },
        outflows_other: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_outflows: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        // Resultado
        net_flow: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        closing_balance: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        // Detalle
        details: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Detalle de items que componen cada categoría'
        },
        // Metadata
        is_actual: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'true=dato real consolidado, false=proyección'
        },
        confidence_level: {
            type: DataTypes.DECIMAL(5, 2),
            comment: 'Nivel de confianza de la proyección 0-100'
        },
        generated_at: {
            type: DataTypes.DATE
        },
        generated_by: {
            type: DataTypes.STRING(50),
            comment: 'system, user, scheduled'
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_cash_flow_forecast',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'forecast_date', 'forecast_type', 'scenario', 'currency'] },
            { fields: ['company_id', 'forecast_type'] },
            { fields: ['forecast_date'] }
        ]
    });

    // Recalcular totales
    FinanceCashFlowForecast.prototype.recalculate = function() {
        this.total_inflows = parseFloat(this.inflows_receivables || 0) +
            parseFloat(this.inflows_sales || 0) +
            parseFloat(this.inflows_loans || 0) +
            parseFloat(this.inflows_other || 0);

        this.total_outflows = parseFloat(this.outflows_payables || 0) +
            parseFloat(this.outflows_payroll || 0) +
            parseFloat(this.outflows_taxes || 0) +
            parseFloat(this.outflows_loans || 0) +
            parseFloat(this.outflows_capex || 0) +
            parseFloat(this.outflows_rent || 0) +
            parseFloat(this.outflows_utilities || 0) +
            parseFloat(this.outflows_other || 0);

        this.net_flow = this.total_inflows - this.total_outflows;
        this.closing_balance = parseFloat(this.opening_balance || 0) + this.net_flow;
    };

    // Guardar con recálculo
    FinanceCashFlowForecast.prototype.saveWithRecalculate = async function() {
        this.recalculate();
        return this.save();
    };

    // Generar proyección diaria
    FinanceCashFlowForecast.generateDaily = async function(companyId, days = 30, scenario = 'base') {
        const BankAccount = sequelize.models.FinanceBankAccount;
        const { Op } = sequelize.Sequelize;

        // Obtener saldo inicial
        const balances = await BankAccount.getTotalByCurrency(companyId);
        let openingBalance = 0;
        for (const b of balances) {
            if (b.currency === 'ARS') {
                openingBalance = parseFloat(b.total_balance) || 0;
            }
        }

        const forecasts = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const forecastDate = new Date(today);
            forecastDate.setDate(today.getDate() + i);

            // Aquí se integrarían las proyecciones de:
            // - Cobranzas (facturas por vencer)
            // - Pagos a proveedores
            // - Nómina
            // - Impuestos
            // - etc.

            const forecast = await this.create({
                company_id: companyId,
                forecast_date: forecastDate,
                forecast_type: 'daily',
                scenario,
                currency: 'ARS',
                opening_balance: openingBalance,
                generated_at: new Date(),
                generated_by: 'system'
            });

            await forecast.saveWithRecalculate();
            openingBalance = forecast.closing_balance;
            forecasts.push(forecast);
        }

        return forecasts;
    };

    // Obtener proyección
    FinanceCashFlowForecast.getForecast = async function(companyId, startDate, endDate, type = 'daily', scenario = 'base') {
        const { Op } = sequelize.Sequelize;

        return this.findAll({
            where: {
                company_id: companyId,
                forecast_date: { [Op.between]: [startDate, endDate] },
                forecast_type: type,
                scenario
            },
            order: [['forecast_date', 'ASC']]
        });
    };

    // Comparar escenarios
    FinanceCashFlowForecast.compareScenarios = async function(companyId, startDate, endDate, type = 'daily') {
        const { Op } = sequelize.Sequelize;

        const forecasts = await this.findAll({
            where: {
                company_id: companyId,
                forecast_date: { [Op.between]: [startDate, endDate] },
                forecast_type: type
            },
            order: [['forecast_date', 'ASC'], ['scenario', 'ASC']]
        });

        // Agrupar por fecha
        const byDate = {};
        for (const f of forecasts) {
            const dateKey = f.forecast_date;
            if (!byDate[dateKey]) {
                byDate[dateKey] = {};
            }
            byDate[dateKey][f.scenario] = {
                inflows: f.total_inflows,
                outflows: f.total_outflows,
                net_flow: f.net_flow,
                closing_balance: f.closing_balance
            };
        }

        return byDate;
    };

    // Actualizar con datos reales
    FinanceCashFlowForecast.updateWithActuals = async function(companyId, date) {
        const BankTransaction = sequelize.models.FinanceBankTransaction;

        // Obtener transacciones del día
        const transactions = await BankTransaction.findAll({
            where: {
                company_id: companyId,
                transaction_date: date,
                status: 'confirmed'
            }
        });

        // Calcular totales reales
        let actualInflows = 0;
        let actualOutflows = 0;

        for (const tx of transactions) {
            if (tx.amount > 0) {
                actualInflows += parseFloat(tx.amount);
            } else {
                actualOutflows += Math.abs(parseFloat(tx.amount));
            }
        }

        // Actualizar forecast
        const forecast = await this.findOne({
            where: {
                company_id: companyId,
                forecast_date: date,
                forecast_type: 'daily',
                scenario: 'base'
            }
        });

        if (forecast) {
            forecast.is_actual = true;
            forecast.total_inflows = actualInflows;
            forecast.total_outflows = actualOutflows;
            await forecast.saveWithRecalculate();
        }

        return forecast;
    };

    // Análisis de varianza
    FinanceCashFlowForecast.getVarianceAnalysis = async function(companyId, startDate, endDate) {
        const { Op } = sequelize.Sequelize;

        const forecasts = await this.findAll({
            where: {
                company_id: companyId,
                forecast_date: { [Op.between]: [startDate, endDate] },
                forecast_type: 'daily',
                scenario: 'base'
            },
            order: [['forecast_date', 'ASC']]
        });

        const analysis = {
            days_analyzed: forecasts.length,
            days_with_actual: 0,
            total_forecasted_inflows: 0,
            total_actual_inflows: 0,
            total_forecasted_outflows: 0,
            total_actual_outflows: 0,
            inflow_variance: 0,
            outflow_variance: 0,
            accuracy_percent: 0
        };

        for (const f of forecasts) {
            if (f.is_actual) {
                analysis.days_with_actual++;
                analysis.total_actual_inflows += parseFloat(f.total_inflows) || 0;
                analysis.total_actual_outflows += parseFloat(f.total_outflows) || 0;
            }
            analysis.total_forecasted_inflows += parseFloat(f.total_inflows) || 0;
            analysis.total_forecasted_outflows += parseFloat(f.total_outflows) || 0;
        }

        if (analysis.total_forecasted_inflows > 0) {
            analysis.inflow_variance = ((analysis.total_actual_inflows - analysis.total_forecasted_inflows) / analysis.total_forecasted_inflows) * 100;
        }

        if (analysis.total_forecasted_outflows > 0) {
            analysis.outflow_variance = ((analysis.total_actual_outflows - analysis.total_forecasted_outflows) / analysis.total_forecasted_outflows) * 100;
        }

        const totalVariance = Math.abs(analysis.inflow_variance) + Math.abs(analysis.outflow_variance);
        analysis.accuracy_percent = Math.max(0, 100 - totalVariance / 2);

        return analysis;
    };

    // Dashboard de cash flow
    FinanceCashFlowForecast.getDashboard = async function(companyId, days = 30) {
        const { Op } = sequelize.Sequelize;
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + days);

        const forecasts = await this.getForecast(companyId, today, endDate, 'daily', 'base');

        if (forecasts.length === 0) {
            return {
                has_forecast: false,
                message: 'No hay proyección generada'
            };
        }

        const dashboard = {
            has_forecast: true,
            current_balance: forecasts[0]?.opening_balance || 0,
            projected_end_balance: forecasts[forecasts.length - 1]?.closing_balance || 0,
            total_inflows: 0,
            total_outflows: 0,
            net_flow: 0,
            min_balance: Infinity,
            min_balance_date: null,
            days_negative: 0,
            daily_average_net: 0
        };

        for (const f of forecasts) {
            dashboard.total_inflows += parseFloat(f.total_inflows) || 0;
            dashboard.total_outflows += parseFloat(f.total_outflows) || 0;

            const balance = parseFloat(f.closing_balance) || 0;
            if (balance < dashboard.min_balance) {
                dashboard.min_balance = balance;
                dashboard.min_balance_date = f.forecast_date;
            }

            if (balance < 0) {
                dashboard.days_negative++;
            }
        }

        dashboard.net_flow = dashboard.total_inflows - dashboard.total_outflows;
        dashboard.daily_average_net = forecasts.length > 0 ? dashboard.net_flow / forecasts.length : 0;

        if (dashboard.min_balance === Infinity) {
            dashboard.min_balance = 0;
        }

        return dashboard;
    };

    return FinanceCashFlowForecast;
};
