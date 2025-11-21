const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserMedicalExams = sequelize.define('UserMedicalExams', {
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
    exam_type: {
        type: DataTypes.ENUM('preocupacional', 'periodico', 'reingreso', 'retiro', 'especial'),
        allowNull: false
    },
    exam_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    result: {
        type: DataTypes.ENUM('apto', 'apto_con_observaciones', 'no_apto', 'pendiente'),
        allowNull: true
    },
    observations: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    next_exam_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    medical_center: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    examining_doctor: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    certificate_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // ✅ FIX: Columnas removidas porque NO existen en la tabla PostgreSQL
    // - exam_frequency
    // - frequency_months
    // - auto_calculate_next_exam
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'user_medical_exams',
    timestamps: false
});

module.exports = UserMedicalExams;
