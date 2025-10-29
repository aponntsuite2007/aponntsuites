const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserChildren = sequelize.define('UserChildren', {
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
    dni: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    gender: {
        type: DataTypes.ENUM('masculino', 'femenino', 'otro'),
        allowNull: true
    },
    lives_with_employee: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_dependent: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    health_insurance_coverage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    special_needs: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    school_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    grade_level: {
        type: DataTypes.STRING(50),
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
    tableName: 'user_children',
    timestamps: false
});

module.exports = UserChildren;
