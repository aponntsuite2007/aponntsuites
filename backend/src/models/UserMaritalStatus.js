const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserMaritalStatus = sequelize.define('UserMaritalStatus', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'companies',
            key: 'company_id'
        }
    },
    marital_status: {
        type: DataTypes.ENUM('soltero', 'casado', 'divorciado', 'viudo', 'union_libre'),
        allowNull: false
    },
    spouse_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    spouse_dni: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    spouse_phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    spouse_occupation: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    marriage_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'user_marital_status',
    timestamps: false
});

module.exports = UserMaritalStatus;
