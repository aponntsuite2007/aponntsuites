const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserMedicalDocuments = sequelize.define('UserMedicalDocuments', {
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
        type: DataTypes.STRING(100),
        allowNull: false
    },
    document_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    file_url: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    upload_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    expiration_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
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
    tableName: 'user_medical_documents',
    timestamps: false
});

module.exports = UserMedicalDocuments;
