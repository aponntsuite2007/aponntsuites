const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserWorkHistory = sequelize.define('UserWorkHistory', {
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
    company_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    position: {
        type: DataTypes.STRING(255),
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
    currently_working: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    reason_for_leaving: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    responsibilities: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    supervisor_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    supervisor_contact: {
        type: DataTypes.STRING(100),
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
    tableName: 'user_work_history',
    timestamps: false
});

module.exports = UserWorkHistory;
