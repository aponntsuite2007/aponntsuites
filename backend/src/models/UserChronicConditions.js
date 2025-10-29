const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserChronicConditions = sequelize.define('UserChronicConditions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
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
    condition_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    diagnosis_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    severity: {
        type: DataTypes.ENUM('leve', 'moderada', 'grave'),
        allowNull: true
    },
    requires_treatment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    requires_monitoring: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    notes: {
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
    tableName: 'user_chronic_conditions',
    timestamps: false
});

module.exports = UserChronicConditions;
