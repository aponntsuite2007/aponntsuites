const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserAllergies = sequelize.define('UserAllergies', {
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
    allergen: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    allergy_type: {
        type: DataTypes.ENUM('medicamento', 'alimento', 'ambiental', 'insecto', 'contacto', 'otro'),
        allowNull: true
    },
    severity: {
        type: DataTypes.ENUM('leve', 'moderada', 'grave', 'anafilaxia'),
        allowNull: true
    },
    symptoms: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    diagnosed_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    requires_epipen: {
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
    tableName: 'user_allergies',
    timestamps: false
});

module.exports = UserAllergies;
