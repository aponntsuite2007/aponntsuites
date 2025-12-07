/**
 * Modelo: OrganizationalPosition
 * Posiciones/cargos organizacionales con template de recibo asignado
 *
 * SSOT (Single Source of Truth) para:
 * - Estructura jerárquica organizacional
 * - Clasificación de riesgo laboral por puesto
 * - Templates de nómina/recibos
 * - Segmentación para Risk Intelligence
 *
 * @version 2.0.0 - RBAC Unified SSOT
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const OrganizationalPosition = sequelize.define('OrganizationalPosition', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        position_code: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        position_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        parent_position_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'organizational_positions', key: 'id' }
        },
        level_order: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: '1=operativo, 2=supervisor, 3=gerente, etc.'
        },
        salary_category_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'salary_categories_v2', key: 'id' }
        },
        payslip_template_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'payroll_payslip_templates', key: 'id' }
        },
        payroll_template_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'payroll_templates', key: 'id' }
        },
        department_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        // =====================================================================
        // CAMPOS DE CLASIFICACIÓN LABORAL Y RIESGO (RBAC SSOT v2.0)
        // =====================================================================

        work_category: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'administrativo',
            validate: {
                isIn: [['administrativo', 'operativo', 'tecnico', 'comercial', 'gerencial', 'mixto']]
            },
            comment: 'Categoría de trabajo: administrativo, operativo, técnico, comercial, gerencial, mixto'
        },
        work_environment: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'oficina',
            validate: {
                isIn: [['oficina', 'planta', 'exterior', 'remoto', 'mixto']]
            },
            comment: 'Ambiente de trabajo: oficina, planta, exterior, remoto, mixto'
        },
        physical_demand_level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { min: 1, max: 5 },
            comment: 'Nivel de demanda física 1-5 (OIT): 1=Sedentario, 2=Ligero, 3=Moderado, 4=Pesado, 5=Muy pesado'
        },
        cognitive_demand_level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 3,
            validate: { min: 1, max: 5 },
            comment: 'Nivel de demanda cognitiva 1-5: 1=Rutinario, 2=Semi-rutinario, 3=Variable, 4=Complejo, 5=Muy complejo'
        },
        risk_exposure_level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { min: 1, max: 5 },
            comment: 'Nivel de exposición al riesgo 1-5: 1=Mínimo, 2=Bajo, 3=Moderado, 4=Alto, 5=Muy alto'
        },
        international_code_ciuo: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: 'Código CIUO-08 (Clasificación Internacional Uniforme de Ocupaciones OIT)'
        },
        international_code_srt: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'Código SRT Argentina (Superintendencia de Riesgos del Trabajo)'
        },
        applies_accident_risk: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Si aplica índice de riesgo de accidente (false para administrativos puros)'
        },
        applies_fatigue_index: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Si aplica índice de fatiga laboral'
        },
        custom_risk_weights: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
            comment: 'Pesos personalizados por posición: {"fatigue": 0.30, "accident": 0.10, "legal": 0.20, "performance": 0.25, "turnover": 0.15}'
        },
        custom_thresholds: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
            comment: 'Umbrales personalizados por posición: {"fatigue": {"low": 25, "medium": 50, "high": 70, "critical": 85}}'
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'organizational_positions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    OrganizationalPosition.associate = (models) => {
        // Empresa
        if (models.Company) {
            OrganizationalPosition.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }

        // Template de recibo
        if (models.PayrollPayslipTemplate) {
            OrganizationalPosition.belongsTo(models.PayrollPayslipTemplate, {
                foreignKey: 'payslip_template_id',
                as: 'payslipTemplate'
            });
        }

        // Template de liquidación
        if (models.PayrollTemplate) {
            OrganizationalPosition.belongsTo(models.PayrollTemplate, {
                foreignKey: 'payroll_template_id',
                as: 'payrollTemplate'
            });
        }

        // Auto-referencia (jerarquía)
        OrganizationalPosition.belongsTo(OrganizationalPosition, {
            foreignKey: 'parent_position_id',
            as: 'parentPosition'
        });
        OrganizationalPosition.hasMany(OrganizationalPosition, {
            foreignKey: 'parent_position_id',
            as: 'childPositions'
        });

        // Usuarios con esta posición
        if (models.User) {
            OrganizationalPosition.hasMany(models.User, {
                foreignKey: 'organizational_position_id',
                as: 'employees'
            });
        }
    };

    return OrganizationalPosition;
};
