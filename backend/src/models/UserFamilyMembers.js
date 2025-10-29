const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserFamilyMembers = sequelize.define('UserFamilyMembers', {
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
    full_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    relationship: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    dni: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    lives_with_employee: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_dependent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_emergency_contact: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    health_insurance_coverage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
    tableName: 'user_family_members',
    timestamps: false
});

module.exports = UserFamilyMembers;
