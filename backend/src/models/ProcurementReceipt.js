/**
 * ProcurementReceipt Model
 * Recepciones de mercadería con control de calidad
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementReceipt = sequelize.define('ProcurementReceipt', {
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
        receipt_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_orders', key: 'id' }
        },
        receipt_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        received_by: {
            type: DataTypes.UUID,
            allowNull: false
        },
        received_by_name: {
            type: DataTypes.STRING(200)
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'confirmed', 'rejected', 'partial']]
            }
        },
        delivery_note_number: {
            type: DataTypes.STRING(100),
            comment: 'Número de remito del proveedor'
        },
        delivery_note_date: {
            type: DataTypes.DATEONLY
        },
        carrier_name: {
            type: DataTypes.STRING(200)
        },
        carrier_document: {
            type: DataTypes.STRING(100)
        },
        general_observations: {
            type: DataTypes.TEXT
        },
        quality_status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'approved', 'rejected', 'conditional']]
            }
        },
        quality_notes: {
            type: DataTypes.TEXT
        },
        quality_checked_by: {
            type: DataTypes.UUID
        },
        quality_checked_at: {
            type: DataTypes.DATE
        },
        notification_sent_at: {
            type: DataTypes.DATE
        },
        notification_id: {
            type: DataTypes.BIGINT,
            references: { model: 'notifications', key: 'id' }
        },
        is_complete_delivery: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        photos: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'URLs de fotos de la recepción'
        },

        // ========== CAMPOS AGREGADOS P2P COMPLETE - Warehouse Integration ==========
        document_type: {
            type: DataTypes.STRING(30),
            defaultValue: 'delivery_note',
            validate: { isIn: [['delivery_note', 'invoice', 'internal']] },
            comment: 'Tipo de documento: remito proveedor, factura, o interno'
        },
        supplier_document_number: {
            type: DataTypes.STRING(100),
            comment: 'Número de remito/factura del proveedor'
        },
        supplier_document_date: {
            type: DataTypes.DATEONLY
        },
        warehouse_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a wms_warehouses - Depósito destino'
        },
        internal_receipt_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a procurement_internal_receipts si se genera remito interno'
        },
        quality_inspection_status: {
            type: DataTypes.STRING(30),
            defaultValue: 'pending',
            validate: { isIn: [['pending', 'passed', 'failed', 'partial']] }
        },
        quality_inspection_date: {
            type: DataTypes.DATE
        },
        quality_inspector_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        quality_inspection_notes: {
            type: DataTypes.TEXT
        },
        stock_movement_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a wms_stock_movements cuando se integra con stock'
        }
    }, {
        tableName: 'procurement_receipts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'receipt_number'] },
            { fields: ['order_id'] },
            { fields: ['receipt_date'] }
        ]
    });

    // Confirmar recepción
    ProcurementReceipt.prototype.confirm = async function(userId, isComplete = false) {
        this.status = 'confirmed';
        this.is_complete_delivery = isComplete;
        return this.save();
    };

    // Aprobar calidad
    ProcurementReceipt.prototype.approveQuality = async function(userId, notes = '') {
        this.quality_status = 'approved';
        this.quality_checked_by = userId;
        this.quality_checked_at = new Date();
        this.quality_notes = notes;
        return this.save();
    };

    // Rechazar calidad
    ProcurementReceipt.prototype.rejectQuality = async function(userId, reason) {
        this.quality_status = 'rejected';
        this.quality_checked_by = userId;
        this.quality_checked_at = new Date();
        this.quality_notes = reason;
        return this.save();
    };

    // Aprobar con condiciones
    ProcurementReceipt.prototype.conditionalApproval = async function(userId, conditions) {
        this.quality_status = 'conditional';
        this.quality_checked_by = userId;
        this.quality_checked_at = new Date();
        this.quality_notes = conditions;
        return this.save();
    };

    // Obtener recepciones de una orden
    ProcurementReceipt.getByOrder = async function(orderId) {
        return this.findAll({
            where: { order_id: orderId },
            order: [['receipt_date', 'DESC']]
        });
    };

    // Obtener recepciones pendientes de control de calidad
    ProcurementReceipt.getPendingQualityCheck = async function(companyId) {
        return this.findAll({
            where: {
                company_id: companyId,
                status: 'confirmed',
                quality_status: 'pending'
            },
            order: [['receipt_date', 'ASC']]
        });
    };

    // Obtener recepciones del día
    ProcurementReceipt.getTodayReceipts = async function(companyId) {
        const today = new Date().toISOString().split('T')[0];
        return this.findAll({
            where: {
                company_id: companyId,
                receipt_date: today
            },
            order: [['created_at', 'DESC']]
        });
    };

    // Estadísticas de recepciones
    ProcurementReceipt.getStats = async function(companyId, startDate = null, endDate = null) {
        const { Op } = sequelize.Sequelize;
        const where = { company_id: companyId };

        if (startDate && endDate) {
            where.receipt_date = { [Op.between]: [startDate, endDate] };
        }

        const [total, confirmed, rejected, pendingQuality] = await Promise.all([
            this.count({ where }),
            this.count({ where: { ...where, status: 'confirmed' } }),
            this.count({ where: { ...where, quality_status: 'rejected' } }),
            this.count({ where: { ...where, quality_status: 'pending' } })
        ]);

        return { total, confirmed, rejected, pending_quality: pendingQuality };
    };

    return ProcurementReceipt;
};
