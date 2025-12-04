/**
 * Modelo: PayrollPayslipTemplate
 * Sistema de diseño visual de recibos con bloques arrastrables
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollPayslipTemplate = sequelize.define('PayrollPayslipTemplate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'companies', key: 'company_id' }
        },
        country_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'payroll_countries', key: 'id' }
        },
        template_code: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        template_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // Layout visual con bloques configurables
        layout_config: {
            type: DataTypes.JSONB,
            defaultValue: {
                blocks: [],
                style: {
                    font_family: 'Arial',
                    font_size: 10,
                    primary_color: '#1a1a2e',
                    secondary_color: '#4a5568',
                    paper_size: 'A4',
                    orientation: 'portrait',
                    margins: { top: 20, right: 15, bottom: 20, left: 15 }
                }
            }
        },

        // Campos obligatorios por ley del pais
        required_fields: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // Leyendas legales obligatorias
        legal_disclaimers: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // Logo de empresa
        logo_url: {
            type: DataTypes.STRING(500),
            allowNull: true
        },

        // Configuracion de firmas
        signature_config: {
            type: DataTypes.JSONB,
            defaultValue: {
                employer_signature: true,
                employee_signature: true,
                digital_signature_enabled: false
            }
        },

        is_default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'payroll_payslip_templates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    PayrollPayslipTemplate.associate = (models) => {
        if (models.Company) {
            PayrollPayslipTemplate.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }
        if (models.PayrollCountry) {
            PayrollPayslipTemplate.belongsTo(models.PayrollCountry, {
                foreignKey: 'country_id',
                as: 'country'
            });
        }
    };

    return PayrollPayslipTemplate;
};
