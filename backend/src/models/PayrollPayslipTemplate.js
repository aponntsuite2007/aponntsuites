/**
 * Modelo: PayrollPayslipTemplate
 * Plantillas HTML/CSS para generacion de recibos de sueldo
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollPayslipTemplate = sequelize.define('PayrollPayslipTemplate', {
        template_id: {
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
            type: DataTypes.STRING(50),
            allowNull: false
        },
        template_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        template_type: {
            type: DataTypes.STRING(30),
            defaultValue: 'standard',
            comment: 'standard, detailed, summary, legal'
        },
        output_format: {
            type: DataTypes.STRING(20),
            defaultValue: 'pdf',
            comment: 'pdf, html, both'
        },

        // Contenido HTML
        header_html: DataTypes.TEXT,
        body_html: DataTypes.TEXT,
        footer_html: DataTypes.TEXT,

        // Estilos CSS
        styles_css: DataTypes.TEXT,

        // Configuracion de pagina
        page_size: {
            type: DataTypes.STRING(10),
            defaultValue: 'A4'
        },
        page_orientation: {
            type: DataTypes.STRING(10),
            defaultValue: 'portrait'
        },
        margins: {
            type: DataTypes.JSONB,
            defaultValue: { top: 20, right: 15, bottom: 20, left: 15 }
        },

        // Opciones de visualizacion
        show_company_logo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        show_employee_signature: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        show_employer_signature: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        sections_config: {
            type: DataTypes.JSONB,
            defaultValue: {
                header: true,
                employee_info: true,
                earnings: true,
                deductions: true,
                non_remunerative: true,
                employer_contributions: false,
                totals: true,
                footer: true,
                legal_text: true
            }
        },

        legal_disclaimer: DataTypes.TEXT,

        is_default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'payroll_payslip_templates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    PayrollPayslipTemplate.associate = (models) => {
        PayrollPayslipTemplate.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        PayrollPayslipTemplate.belongsTo(models.PayrollCountry, {
            foreignKey: 'country_id',
            as: 'country'
        });
    };

    return PayrollPayslipTemplate;
};
