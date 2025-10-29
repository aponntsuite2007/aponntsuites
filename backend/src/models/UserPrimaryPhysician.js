const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserPrimaryPhysician = sequelize.define('UserPrimaryPhysician', {
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
    physician_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    specialty: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    clinic_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    clinic_address: {
        type: DataTypes.TEXT,
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
    tableName: 'user_primary_physician',
    timestamps: false
});

module.exports = UserPrimaryPhysician;
