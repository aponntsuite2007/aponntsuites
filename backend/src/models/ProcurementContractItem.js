/**
 * ProcurementContractItem Model
 * Items de contrato con precios pre-acordados y descuentos por volumen
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementContractItem = sequelize.define('ProcurementContractItem', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        contract_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_contracts', key: 'id' }
        },
        item_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_items', key: 'id' }
        },
        item_code: {
            type: DataTypes.STRING(100)
        },
        item_description: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        unit_of_measure: {
            type: DataTypes.STRING(50)
        },
        agreed_price: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        volume_discounts: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{min_qty: 100, discount_percent: 5}, {min_qty: 500, discount_percent: 10}]'
        },
        max_quantity: {
            type: DataTypes.DECIMAL(15, 4),
            comment: 'NULL = sin límite'
        },
        consumed_quantity: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0
        },
        valid_from: {
            type: DataTypes.DATEONLY
        },
        valid_until: {
            type: DataTypes.DATEONLY
        },
        notes: {
            type: DataTypes.TEXT
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'procurement_contract_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['contract_id'] },
            { fields: ['item_id'] }
        ]
    });

    // Calcular precio con descuento por volumen
    ProcurementContractItem.prototype.getPriceForQuantity = function(quantity) {
        let price = parseFloat(this.agreed_price);
        let discountPercent = 0;

        if (this.volume_discounts && this.volume_discounts.length > 0) {
            // Ordenar descuentos por cantidad mínima desc
            const sortedDiscounts = [...this.volume_discounts].sort((a, b) => b.min_qty - a.min_qty);
            for (const discount of sortedDiscounts) {
                if (quantity >= discount.min_qty) {
                    discountPercent = discount.discount_percent;
                    break;
                }
            }
        }

        const discountedPrice = price * (1 - discountPercent / 100);
        return {
            base_price: price,
            discount_percent: discountPercent,
            final_price: discountedPrice,
            total: discountedPrice * quantity
        };
    };

    // Verificar disponibilidad de cantidad
    ProcurementContractItem.prototype.hasAvailableQuantity = function(quantity) {
        if (!this.max_quantity) return true;
        const remaining = parseFloat(this.max_quantity) - parseFloat(this.consumed_quantity || 0);
        return remaining >= quantity;
    };

    // Obtener items activos de un contrato
    ProcurementContractItem.getByContract = async function(contractId) {
        return this.findAll({
            where: { contract_id: contractId, is_active: true },
            order: [['item_description', 'ASC']]
        });
    };

    return ProcurementContractItem;
};
