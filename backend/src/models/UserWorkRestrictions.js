const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserWorkRestrictions = sequelize.define('UserWorkRestrictions', {
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
    restriction_type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    is_permanent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    medical_certificate_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    issuing_doctor: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    affects_current_role: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    accommodation_needed: {
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
    tableName: 'user_work_restrictions',
    timestamps: false
});

module.exports = UserWorkRestrictions;
