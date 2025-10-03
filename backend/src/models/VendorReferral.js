const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const VendorReferral = sequelize.define('VendorReferral', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        referrerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Vendedor que refiere (el que gana comisión)'
        },
        referredId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Vendedor referido (el nuevo vendedor)'
        },
        referralDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            comment: 'Fecha en que se realizó el referido'
        },
        status: {
            type: DataTypes.ENUM('pending', 'active', 'inactive', 'expired'),
            defaultValue: 'pending',
            comment: 'Estado del referido'
        },
        activationDate: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha en que el referido se activó (primera venta/soporte)'
        },
        commissionPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 5.00,
            comment: 'Porcentaje de comisión por referido (sobre las comisiones del referido)'
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'Nivel en la pirámide (1 = directo, 2 = segundo nivel, etc.)'
        },
        totalCommissionEarned: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00,
            comment: 'Total de comisiones ganadas por este referido'
        },
        monthlyCommissionEarned: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.00,
            comment: 'Comisiones ganadas este mes por este referido'
        },
        lastCommissionDate: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Última fecha en que se generó comisión'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        contractStartDate: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha de inicio del contrato de referido'
        },
        contractEndDate: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha de fin del contrato (si aplica)'
        },
        referralCode: {
            type: DataTypes.STRING(20),
            allowNull: true,
            unique: true,
            comment: 'Código único para tracking del referido'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'vendor_referrals',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                fields: ['referrerId']
            },
            {
                fields: ['referredId']
            },
            {
                fields: ['status']
            },
            {
                fields: ['level']
            },
            {
                fields: ['referralCode']
            },
            {
                unique: true,
                fields: ['referrerId', 'referredId']
            }
        ]
    });

    // Generar código único de referido
    VendorReferral.generateReferralCode = function() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `REF-${timestamp}-${random}`.toUpperCase();
    };

    // Hooks
    VendorReferral.beforeCreate((referral) => {
        if (!referral.referralCode) {
            referral.referralCode = VendorReferral.generateReferralCode();
        }
    });

    // Método para calcular comisión
    VendorReferral.prototype.calculateCommission = function(baseCommissionAmount) {
        return (baseCommissionAmount * this.commissionPercentage / 100).toFixed(2);
    };

    // Método para activar referido
    VendorReferral.prototype.activate = async function() {
        this.status = 'active';
        this.activationDate = new Date();
        await this.save();
    };

    return VendorReferral;
};