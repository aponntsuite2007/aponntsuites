const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserPermissionRequests = sequelize.define('UserPermissionRequests', {
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
    request_type: {
        type: DataTypes.ENUM('vacaciones', 'licencia_medica', 'permiso_personal', 'estudio', 'duelo', 'maternidad', 'paternidad', 'otro'),
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    total_days: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado', 'cancelado'),
        defaultValue: 'pendiente'
    },
    requested_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    approval_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rejection_reason: {
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
    tableName: 'user_permission_requests',
    timestamps: false
});

module.exports = UserPermissionRequests;
