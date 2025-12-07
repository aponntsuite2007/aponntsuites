/**
 * Modelo: EppDelivery
 * Registro de entregas de EPP a empleados con tracking de vencimiento
 *
 * @version 1.0.0
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const EppDelivery = sequelize.define('EppDelivery', {
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
        employee_id: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: 'Empleado que recibe el EPP'
        },
        epp_catalog_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'epp_catalog', key: 'id' }
        },
        requirement_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'epp_role_requirements', key: 'id' }
        },

        // Detalles de entrega
        delivery_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        delivered_by: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'Usuario que entrego el EPP'
        },
        quantity_delivered: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        size_delivered: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'S, M, L, XL, etc.'
        },
        serial_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Si el EPP tiene numero de serie'
        },
        batch_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Lote de fabricacion'
        },

        // Fechas de control
        manufacture_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Fecha de fabricacion'
        },
        expiration_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Vencimiento segun fabricante'
        },
        calculated_replacement_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'delivery_date + lifespan_days'
        },

        // Estado
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'active',
            validate: {
                isIn: [['active', 'expired', 'replaced', 'lost', 'damaged', 'returned']]
            }
        },

        // Firma/Confirmacion del empleado
        employee_signature_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        employee_signature_method: {
            type: DataTypes.STRING(30),
            allowNull: true,
            comment: 'digital, physical, biometric'
        },
        signature_document_url: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'URL al documento firmado'
        },

        // Devolucion/Reemplazo
        return_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        return_reason: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'expired, damaged, size_change, termination'
        },
        return_notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        replaced_by_delivery_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'epp_deliveries', key: 'id' }
        },

        // Notificaciones
        notification_30_sent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        notification_15_sent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        notification_7_sent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        notification_expired_sent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // Auditoria
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'epp_deliveries',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    EppDelivery.associate = (models) => {
        if (models.Company) {
            EppDelivery.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }

        if (models.User) {
            EppDelivery.belongsTo(models.User, {
                foreignKey: 'employee_id',
                as: 'employee'
            });

            EppDelivery.belongsTo(models.User, {
                foreignKey: 'delivered_by',
                as: 'deliverer'
            });
        }

        if (models.EppCatalog) {
            EppDelivery.belongsTo(models.EppCatalog, {
                foreignKey: 'epp_catalog_id',
                as: 'eppItem'
            });
        }

        if (models.EppRoleRequirement) {
            EppDelivery.belongsTo(models.EppRoleRequirement, {
                foreignKey: 'requirement_id',
                as: 'requirement'
            });
        }

        if (models.EppInspection) {
            EppDelivery.hasMany(models.EppInspection, {
                foreignKey: 'delivery_id',
                as: 'inspections'
            });
        }

        // Auto-referencia para reemplazos
        EppDelivery.belongsTo(EppDelivery, {
            foreignKey: 'replaced_by_delivery_id',
            as: 'replacement'
        });
    };

    return EppDelivery;
};
