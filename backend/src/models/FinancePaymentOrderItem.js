/**
 * Finance Payment Order Item Model
 * Items de una Orden de Pago - Facturas incluidas
 * Permite pagos parciales y aplicación de retenciones
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinancePaymentOrderItem = sequelize.define('FinancePaymentOrderItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        payment_order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_payment_orders', key: 'id' }
        },

        // Factura de compra
        invoice_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_invoices', key: 'id' }
        },
        invoice_number: {
            type: DataTypes.STRING(100),
            comment: 'Número de factura desnormalizado'
        },
        invoice_date: {
            type: DataTypes.DATEONLY
        },
        invoice_due_date: {
            type: DataTypes.DATEONLY
        },
        invoice_total: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Total de la factura'
        },
        invoice_pending: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Saldo pendiente de la factura antes de este pago'
        },

        // Monto a pagar (puede ser parcial)
        amount_to_pay: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Monto que se pagará con esta OP'
        },
        is_partial_payment: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'true si no se paga el total pendiente'
        },

        // Retenciones (Argentina)
        retention_iibb: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Retención Ingresos Brutos'
        },
        retention_ganancias: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Retención Ganancias'
        },
        retention_iva: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Retención IVA'
        },
        retention_suss: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Retención SUSS'
        },
        other_retentions: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Otras retenciones'
        },
        retention_details: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Detalle de retenciones: {alicuota, certificado, etc}'
        },

        // Descuentos
        early_payment_discount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Descuento por pronto pago'
        },
        other_discounts: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },

        // Totales calculados
        total_retentions: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Suma de todas las retenciones'
        },
        total_discounts: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Suma de todos los descuentos'
        },
        net_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'amount_to_pay - retentions - discounts'
        },

        // Clasificación (para cubo OLAP)
        purchase_type: {
            type: DataTypes.STRING(30),
            validate: {
                isIn: [['goods', 'services', 'assets', 'utilities', 'taxes', 'rent', 'other', null]]
            },
            comment: 'Tipo de compra para análisis'
        },
        category_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_categories', key: 'id' }
        },

        // Notas
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_payment_order_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
            { fields: ['payment_order_id'] },
            { fields: ['invoice_id'] },
            { fields: ['purchase_type'] },
            { fields: ['category_id'] }
        ],
        hooks: {
            beforeSave: async (item) => {
                // Calcular totales automáticamente
                item.total_retentions = parseFloat(item.retention_iibb || 0) +
                    parseFloat(item.retention_ganancias || 0) +
                    parseFloat(item.retention_iva || 0) +
                    parseFloat(item.retention_suss || 0) +
                    parseFloat(item.other_retentions || 0);

                item.total_discounts = parseFloat(item.early_payment_discount || 0) +
                    parseFloat(item.other_discounts || 0);

                item.net_amount = parseFloat(item.amount_to_pay || 0) -
                    item.total_retentions -
                    item.total_discounts;

                // Determinar si es pago parcial
                if (item.invoice_pending && item.amount_to_pay) {
                    item.is_partial_payment = parseFloat(item.amount_to_pay) < parseFloat(item.invoice_pending);
                }
            }
        }
    });

    // Calcular retenciones automáticamente según alícuotas
    FinancePaymentOrderItem.calculateRetentions = async function(invoiceId, amount, supplierData) {
        const retentions = {
            retention_iibb: 0,
            retention_ganancias: 0,
            retention_iva: 0,
            retention_suss: 0,
            other_retentions: 0,
            retention_details: {}
        };

        // TODO: Implementar cálculo según regímenes de retención
        // Esto depende de la configuración de la empresa y el proveedor
        // Por ahora retorna 0s, el usuario puede editarlos manualmente

        return retentions;
    };

    // Validar que el monto no exceda el pendiente
    FinancePaymentOrderItem.prototype.validateAmount = function() {
        if (this.amount_to_pay > this.invoice_pending) {
            throw new Error(`El monto a pagar (${this.amount_to_pay}) excede el pendiente de la factura (${this.invoice_pending})`);
        }
        return true;
    };

    // Asociaciones
    FinancePaymentOrderItem.associate = (models) => {
        FinancePaymentOrderItem.belongsTo(models.FinancePaymentOrder, {
            foreignKey: 'payment_order_id',
            as: 'paymentOrder'
        });
        FinancePaymentOrderItem.belongsTo(models.ProcurementInvoice, {
            foreignKey: 'invoice_id',
            as: 'invoice'
        });
        FinancePaymentOrderItem.belongsTo(models.ProcurementCategory, {
            foreignKey: 'category_id',
            as: 'category'
        });
    };

    return FinancePaymentOrderItem;
};
