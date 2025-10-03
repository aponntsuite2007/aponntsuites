const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const VendorCommission = sequelize.define('VendorCommission', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        vendorId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'vendor_id',
            references: {
                model: 'users',
                key: 'id'
            }
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'company_id',
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        commissionType: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: 'commission_type',
            validate: {
                isIn: [['sales', 'support', 'referral']]
            },
            comment: 'sales = comisión por ventas (no transferible), support = comisión por soporte (transferible), referral = comisión por referidos'
        },
        percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            validate: {
                min: 0,
                max: 100
            }
        },
        monthlyAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            field: 'monthly_amount',
            defaultValue: 0,
            comment: 'Monto calculado automáticamente cada mes'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            field: 'is_active',
            defaultValue: true
        },
        isTransferable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            field: 'is_transferable',
            defaultValue: false,
            comment: 'Solo las comisiones de soporte son transferibles'
        },
        originalVendorId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'original_vendor_id',
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Vendedor original de la venta (para tracking)'
        },
        transferredDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'transferred_date'
        },
        transferReason: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'transfer_reason'
        },
        lastCalculated: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_calculated'
        },
        referralId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            field: 'referral_id',
            references: {
                model: 'vendor_referrals',
                key: 'id'
            },
            comment: 'ID del referido asociado (solo para commissionType = referral)'
        },
        baseCommissionAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            field: 'base_commission_amount',
            defaultValue: 0,
            comment: 'Monto base sobre el cual se calcula la comisión de referido'
        },
        totalUsers: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'total_users',
            defaultValue: 0,
            comment: 'Total de usuarios de la empresa por los que comisiona'
        },
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'start_date'
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'end_date'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'vendor_commissions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
        indexes: [
            {
                fields: ['vendor_id', 'is_active']
            },
            {
                fields: ['company_id', 'is_active']
            },
            {
                fields: ['commission_type']
            },
            {
                unique: true,
                fields: ['vendor_id', 'company_id', 'commission_type']
            }
        ]
    });

    // Hooks para validaciones automáticas
    VendorCommission.beforeCreate((commission) => {
        if (commission.commissionType === 'sales') {
            commission.isTransferable = false;
        } else if (commission.commissionType === 'support') {
            commission.isTransferable = true;
        }
    });

    VendorCommission.beforeUpdate((commission) => {
        if (commission.commissionType === 'sales') {
            commission.isTransferable = false;
        } else if (commission.commissionType === 'support') {
            commission.isTransferable = true;
        }
    });

    return VendorCommission;
};