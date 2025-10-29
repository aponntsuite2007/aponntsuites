const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserDisciplinaryActions = sequelize.define('UserDisciplinaryActions', {
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
    action_type: {
        type: DataTypes.ENUM('advertencia_verbal', 'advertencia_escrita', 'suspension', 'descuento', 'despido', 'otro'),
        allowNull: false
    },
    severity: {
        type: DataTypes.ENUM('leve', 'moderada', 'grave', 'muy_grave'),
        allowNull: true
    },
    date_occurred: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    action_taken: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    issued_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    issued_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    follow_up_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    follow_up_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    employee_acknowledgement: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    employee_comments: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    supporting_document_url: {
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
    tableName: 'user_disciplinary_actions',
    timestamps: false
});

module.exports = UserDisciplinaryActions;
