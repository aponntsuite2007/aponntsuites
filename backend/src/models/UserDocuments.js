const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserDocuments = sequelize.define('UserDocuments', {
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
    document_type: {
        type: DataTypes.ENUM('dni', 'pasaporte', 'licencia_conducir', 'visa', 'certificado_antecedentes', 'otro'),
        allowNull: false
    },
    document_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    issue_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    expiration_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    issuing_authority: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    file_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_verified: {
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
    tableName: 'user_documents',
    timestamps: false
});

module.exports = UserDocuments;
