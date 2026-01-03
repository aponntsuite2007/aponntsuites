/**
 * ProcurementExchangeRate Model
 * Tipos de cambio para operaciones multi-moneda
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementExchangeRate = sequelize.define('ProcurementExchangeRate', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // NULL = tipo de cambio global
            references: { model: 'companies', key: 'id' }
        },
        from_currency: {
            type: DataTypes.STRING(3),
            allowNull: false
        },
        to_currency: {
            type: DataTypes.STRING(3),
            allowNull: false
        },
        rate: {
            type: DataTypes.DECIMAL(15, 6),
            allowNull: false
        },
        rate_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        source: {
            type: DataTypes.STRING(50),
            defaultValue: 'manual',
            validate: { isIn: [['manual', 'bcra', 'api', 'bloomberg']] }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'procurement_exchange_rates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { unique: true, fields: ['company_id', 'from_currency', 'to_currency', 'rate_date'] },
            { fields: ['rate_date'] },
            { fields: ['from_currency', 'to_currency'] }
        ]
    });

    // Monedas soportadas
    ProcurementExchangeRate.CURRENCIES = {
        ARS: { name: 'Peso Argentino', symbol: '$', decimals: 2, locale: 'es-AR' },
        USD: { name: 'Dólar Estadounidense', symbol: 'US$', decimals: 2, locale: 'en-US' },
        EUR: { name: 'Euro', symbol: '€', decimals: 2, locale: 'de-DE' },
        BRL: { name: 'Real Brasileño', symbol: 'R$', decimals: 2, locale: 'pt-BR' }
    };

    // Obtener tipo de cambio para una fecha
    ProcurementExchangeRate.getRate = async function(fromCurrency, toCurrency, date = null, companyId = null) {
        const { Op } = sequelize.Sequelize;
        const targetDate = date || new Date();

        // Buscar primero en la empresa, luego global
        const whereConditions = {
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate_date: { [Op.lte]: targetDate },
            is_active: true
        };

        // Primero buscar específico de empresa
        if (companyId) {
            const companyRate = await this.findOne({
                where: { ...whereConditions, company_id: companyId },
                order: [['rate_date', 'DESC']]
            });
            if (companyRate) return companyRate;
        }

        // Si no hay de empresa, buscar global
        return this.findOne({
            where: { ...whereConditions, company_id: null },
            order: [['rate_date', 'DESC']]
        });
    };

    // Convertir monto
    ProcurementExchangeRate.convert = async function(amount, fromCurrency, toCurrency, date = null, companyId = null) {
        if (fromCurrency === toCurrency) return amount;

        const rate = await this.getRate(fromCurrency, toCurrency, date, companyId);
        if (!rate) {
            throw new Error(`No se encontró tipo de cambio para ${fromCurrency} a ${toCurrency}`);
        }

        return parseFloat(amount) * parseFloat(rate.rate);
    };

    // Formatear monto en moneda
    ProcurementExchangeRate.formatCurrency = function(amount, currencyCode) {
        const currency = this.CURRENCIES[currencyCode] || this.CURRENCIES.ARS;
        return parseFloat(amount).toLocaleString(currency.locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: currency.decimals
        });
    };

    return ProcurementExchangeRate;
};
