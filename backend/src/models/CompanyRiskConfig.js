/**
 * Modelo: CompanyRiskConfig
 * Configuración de umbrales de riesgo por empresa
 *
 * Permite configurar el método de cálculo de umbrales:
 * - manual: Umbrales fijos definidos por administrador
 * - quartile: Calculados dinámicamente por cuartiles de datos propios
 * - benchmark: Basados en benchmarks internacionales (OIT, OSHA, SRT)
 * - hybrid: Combinación ponderada de los tres métodos
 *
 * @version 1.0.0 - RBAC Unified SSOT
 * @date 2025-12-07
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CompanyRiskConfig = sequelize.define('CompanyRiskConfig', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: 'companies', key: 'id' },
            comment: 'Empresa a la que pertenece esta configuración'
        },

        // Método de cálculo de umbrales
        threshold_method: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'manual',
            validate: {
                isIn: [['manual', 'quartile', 'benchmark', 'hybrid']]
            },
            comment: 'Método de cálculo: manual, quartile, benchmark, hybrid'
        },

        // Pesos para método híbrido
        hybrid_weights: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: { manual: 0.3, quartile: 0.4, benchmark: 0.3 },
            comment: 'Pesos para cada fuente en método híbrido'
        },

        // Umbrales manuales globales
        global_thresholds: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {
                fatigue: { low: 30, medium: 50, high: 70, critical: 85 },
                accident: { low: 30, medium: 50, high: 70, critical: 85 },
                legal_claim: { low: 30, medium: 50, high: 70, critical: 85 },
                performance: { low: 30, medium: 50, high: 70, critical: 85 },
                turnover: { low: 30, medium: 50, high: 70, critical: 85 }
            },
            comment: 'Umbrales manuales globales para todos los índices'
        },

        // Pesos globales de índices
        global_weights: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {
                fatigue: 0.25,
                accident: 0.25,
                legal_claim: 0.20,
                performance: 0.15,
                turnover: 0.15
            },
            comment: 'Pesos globales para cálculo del índice compuesto'
        },

        // Configuración de segmentación
        enable_segmentation: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Si true, usa umbrales diferentes por work_category de OrganizationalPosition'
        },

        // Benchmark de referencia por defecto
        default_benchmark_code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: 'ADM-GENERAL',
            comment: 'Código del benchmark a usar por defecto'
        },

        // Frecuencia de recálculo de cuartiles
        quartile_recalc_frequency: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'weekly',
            validate: {
                isIn: [['daily', 'weekly', 'monthly', 'manual']]
            },
            comment: 'Frecuencia de recálculo de cuartiles: daily, weekly, monthly, manual'
        },
        last_quartile_calculation: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Última vez que se recalcularon los cuartiles'
        },

        // Cache de cuartiles calculados
        calculated_quartiles: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Cache de cuartiles calculados: { global: {...}, by_category: {...} }'
        },

        // Metadata
        updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'users', key: 'user_id' },
            comment: 'Último usuario que modificó la configuración'
        }
    }, {
        tableName: 'company_risk_config',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, name: 'idx_company_risk_config', fields: ['company_id'] }
        ]
    });

    // Associations
    CompanyRiskConfig.associate = (models) => {
        if (models.Company) {
            CompanyRiskConfig.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }
        if (models.User) {
            CompanyRiskConfig.belongsTo(models.User, {
                foreignKey: 'updated_by',
                targetKey: 'user_id',
                as: 'updater'
            });
        }
    };

    // Instance methods
    CompanyRiskConfig.prototype.needsQuartileRecalc = function() {
        if (this.threshold_method !== 'quartile' && this.threshold_method !== 'hybrid') {
            return false;
        }

        if (!this.last_quartile_calculation) {
            return true;
        }

        const now = new Date();
        const lastCalc = new Date(this.last_quartile_calculation);
        const diffHours = (now - lastCalc) / (1000 * 60 * 60);

        switch (this.quartile_recalc_frequency) {
            case 'daily':
                return diffHours >= 24;
            case 'weekly':
                return diffHours >= 168; // 7 * 24
            case 'monthly':
                return diffHours >= 720; // 30 * 24
            case 'manual':
            default:
                return false;
        }
    };

    CompanyRiskConfig.prototype.getEffectiveThresholds = function(workCategory = null) {
        if (!this.enable_segmentation || !workCategory) {
            return this.global_thresholds;
        }

        // Si hay segmentación y tenemos cuartiles por categoría
        if (this.calculated_quartiles?.by_category?.[workCategory]) {
            const categoryQuartiles = this.calculated_quartiles.by_category[workCategory];
            return {
                fatigue: {
                    low: categoryQuartiles.fatigue?.q1 || this.global_thresholds.fatigue.low,
                    medium: categoryQuartiles.fatigue?.q2 || this.global_thresholds.fatigue.medium,
                    high: categoryQuartiles.fatigue?.q3 || this.global_thresholds.fatigue.high,
                    critical: 90
                },
                accident: {
                    low: categoryQuartiles.accident?.q1 || this.global_thresholds.accident.low,
                    medium: categoryQuartiles.accident?.q2 || this.global_thresholds.accident.medium,
                    high: categoryQuartiles.accident?.q3 || this.global_thresholds.accident.high,
                    critical: 90
                },
                legal_claim: {
                    low: categoryQuartiles.legal_claim?.q1 || this.global_thresholds.legal_claim.low,
                    medium: categoryQuartiles.legal_claim?.q2 || this.global_thresholds.legal_claim.medium,
                    high: categoryQuartiles.legal_claim?.q3 || this.global_thresholds.legal_claim.high,
                    critical: 90
                },
                performance: this.global_thresholds.performance,
                turnover: this.global_thresholds.turnover
            };
        }

        return this.global_thresholds;
    };

    // Class methods
    CompanyRiskConfig.findOrCreateForCompany = async function(companyId) {
        const [config, created] = await this.findOrCreate({
            where: { company_id: companyId },
            defaults: {
                threshold_method: 'manual',
                enable_segmentation: false
            }
        });
        return config;
    };

    return CompanyRiskConfig;
};
