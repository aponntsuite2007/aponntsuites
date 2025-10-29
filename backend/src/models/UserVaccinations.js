const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserVaccinations = sequelize.define('UserVaccinations', {
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
    vaccine_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    vaccine_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    dose_number: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    total_doses: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    date_administered: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    next_dose_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    administering_institution: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    lot_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    certificate_url: {
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
    tableName: 'user_vaccinations',
    timestamps: false
});

module.exports = UserVaccinations;
