const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserEducation = sequelize.define('UserEducation', {
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
    education_level: {
        type: DataTypes.ENUM('primaria', 'secundaria', 'terciaria', 'universitaria', 'posgrado', 'doctorado'),
        allowNull: false
    },
    institution_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    degree_title: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    field_of_study: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    graduated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    certificate_file_url: {
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
    tableName: 'user_education',
    timestamps: false
});

module.exports = UserEducation;
