const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserMedications = sequelize.define('UserMedications', {
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
    medication_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    dosage: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    frequency: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    route: {
        type: DataTypes.ENUM('oral', 'inyectable', 'topico', 'inhalado', 'otro'),
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    is_continuous: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    prescribing_doctor: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    purpose: {
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
    tableName: 'user_medications',
    timestamps: false
});

module.exports = UserMedications;
