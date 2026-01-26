/**
 * ProcurementInternalReceipt Model
 * Documento interno de recepción (Remito Interno)
 * Se genera cuando no hay remito/factura del proveedor
 * Módulo Procurement - Gestión de Compras P2P
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementInternalReceipt = sequelize.define('ProcurementInternalReceipt', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'id' }
        },

        // Identificación
        receipt_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        receipt_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        // Referencia a recepción principal
        procurement_receipt_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_receipts', key: 'id' }
        },

        // Origen
        origin_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            validate: {
                isIn: [['purchase_order', 'transfer', 'return', 'adjustment', 'production']]
            }
        },
        origin_document_id: {
            type: DataTypes.INTEGER,
            comment: 'ID del documento origen'
        },
        origin_document_number: {
            type: DataTypes.STRING(100)
        },

        // Proveedor
        supplier_id: {
            type: DataTypes.INTEGER,
            references: { model: 'wms_suppliers', key: 'id' }
        },

        // Destino
        warehouse_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'FK a wms_warehouses'
        },

        // Transporte
        carrier_name: {
            type: DataTypes.STRING(200)
        },
        carrier_document: {
            type: DataTypes.STRING(100)
        },
        vehicle_plate: {
            type: DataTypes.STRING(20)
        },
        driver_name: {
            type: DataTypes.STRING(200)
        },
        driver_document: {
            type: DataTypes.STRING(50)
        },

        // Totales
        total_items: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_quantity: {
            type: DataTypes.DECIMAL(15, 4),
            defaultValue: 0
        },
        total_weight: {
            type: DataTypes.DECIMAL(15, 4)
        },
        total_volume: {
            type: DataTypes.DECIMAL(15, 4)
        },

        // Estado
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'draft',
            validate: {
                isIn: [['draft', 'pending_approval', 'approved', 'posted', 'cancelled']]
            }
        },

        // Aprobación
        approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        approved_at: {
            type: DataTypes.DATE
        },

        // Contabilización
        posted_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        posted_at: {
            type: DataTypes.DATE
        },
        stock_movement_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a wms_stock_movements'
        },

        // Observaciones
        observations: {
            type: DataTypes.TEXT
        },
        internal_notes: {
            type: DataTypes.TEXT
        },

        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'procurement_internal_receipts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'receipt_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['warehouse_id'] },
            { fields: ['receipt_date'] },
            { fields: ['origin_type', 'origin_document_id'] }
        ]
    });

    // Generar número de remito interno
    ProcurementInternalReceipt.generateNumber = async function(companyId) {
        const year = new Date().getFullYear();
        const last = await this.findOne({
            where: {
                company_id: companyId,
                receipt_number: { [sequelize.Sequelize.Op.like]: `RI-${year}-%` }
            },
            order: [['receipt_number', 'DESC']]
        });

        let sequence = 1;
        if (last) {
            const match = last.receipt_number.match(/RI-\d{4}-(\d+)/);
            if (match) sequence = parseInt(match[1]) + 1;
        }

        return `RI-${year}-${sequence.toString().padStart(6, '0')}`;
    };

    // Aprobar remito interno
    ProcurementInternalReceipt.prototype.approve = async function(userId) {
        if (this.status !== 'pending_approval') {
            throw new Error('Solo se pueden aprobar remitos pendientes');
        }

        this.status = 'approved';
        this.approved_by = userId;
        this.approved_at = new Date();
        return this.save();
    };

    // Contabilizar en stock
    ProcurementInternalReceipt.prototype.post = async function(userId, stockMovementId = null) {
        if (this.status !== 'approved') {
            throw new Error('El remito debe estar aprobado para contabilizar');
        }

        this.status = 'posted';
        this.posted_by = userId;
        this.posted_at = new Date();
        if (stockMovementId) {
            this.stock_movement_id = stockMovementId;
        }
        return this.save();
    };

    // Cancelar
    ProcurementInternalReceipt.prototype.cancel = async function(reason = null) {
        if (this.status === 'posted') {
            throw new Error('No se puede cancelar un remito contabilizado');
        }

        this.status = 'cancelled';
        if (reason) {
            this.internal_notes = (this.internal_notes || '') + `\n[CANCELADO] ${reason}`;
        }
        return this.save();
    };

    // Obtener remitos por estado
    ProcurementInternalReceipt.getByStatus = async function(companyId, status, options = {}) {
        const where = { company_id: companyId };
        if (status) {
            where.status = Array.isArray(status) ? { [sequelize.Sequelize.Op.in]: status } : status;
        }

        return this.findAll({
            where,
            order: [['receipt_date', 'DESC'], ['receipt_number', 'DESC']],
            limit: options.limit || 100,
            offset: options.offset || 0
        });
    };

    // Calcular totales desde items
    ProcurementInternalReceipt.prototype.calculateTotals = async function() {
        const items = await sequelize.models.ProcurementInternalReceiptItem.findAll({
            where: { internal_receipt_id: this.id }
        });

        let totalItems = 0;
        let totalQuantity = 0;

        items.forEach(item => {
            totalItems++;
            totalQuantity += parseFloat(item.quantity_received) || 0;
        });

        this.total_items = totalItems;
        this.total_quantity = totalQuantity;
        return this.save();
    };

    return ProcurementInternalReceipt;
};
