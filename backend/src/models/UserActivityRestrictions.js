const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserActivityRestrictions = sequelize.define('UserActivityRestrictions', {
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
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'user_activity_restrictions',
    timestamps: false
});

module.exports = UserActivityRestrictions;
