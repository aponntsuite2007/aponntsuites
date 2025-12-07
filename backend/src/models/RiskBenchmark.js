/**
 * Modelo: RiskBenchmark
 * Benchmarks internacionales de riesgo laboral por tipo de ocupación
 *
 * Fuentes de datos:
 * - OIT (Organización Internacional del Trabajo)
 * - OSHA (Occupational Safety and Health Administration - USA)
 * - SRT (Superintendencia de Riesgos del Trabajo - Argentina)
 * - EUROSTAT (Oficina Estadística de la UE)
 *
 * Los benchmarks proporcionan percentiles de referencia para cada índice de riesgo
 * basados en estadísticas internacionales por tipo de ocupación (CIUO-08).
 *
 * @version 1.0.0 - RBAC Unified SSOT
 * @date 2025-12-07
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const RiskBenchmark = sequelize.define('RiskBenchmark', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // Identificación
        benchmark_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Código único del benchmark (ej: ADM-GENERAL, OPE-INDUSTRIAL)'
        },
        benchmark_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: 'Nombre descriptivo del benchmark'
        },

        // Clasificación
        ciuo_code: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: 'Código CIUO-08 (Clasificación Internacional Uniforme de Ocupaciones)'
        },
        work_category: {
            type: DataTypes.STRING(50),
            allowNull: true,
            validate: {
                isIn: [['administrativo', 'operativo', 'tecnico', 'comercial', 'gerencial', 'mixto']]
            },
            comment: 'Categoría de trabajo'
        },
        industry_code: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'Código CIIU de industria'
        },
        country_code: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'ARG',
            comment: 'ISO 3166-1 alpha-3 country code'
        },

        // Fuente de datos
        source: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                isIn: [['OIT', 'OSHA', 'SRT', 'MTESS', 'EUROSTAT', 'custom']]
            },
            comment: 'Fuente de los datos estadísticos'
        },
        source_year: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Año de publicación de los datos'
        },
        source_url: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'URL de la fuente original'
        },

        // Umbrales de FATIGA (percentiles)
        fatigue_p25: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 25 (bajo) para fatiga'
        },
        fatigue_p50: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 50 (medio) para fatiga'
        },
        fatigue_p75: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 75 (alto) para fatiga'
        },
        fatigue_p90: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 90 (crítico) para fatiga'
        },

        // Umbrales de ACCIDENTE (percentiles)
        accident_p25: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 25 (bajo) para accidente'
        },
        accident_p50: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 50 (medio) para accidente'
        },
        accident_p75: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 75 (alto) para accidente'
        },
        accident_p90: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 90 (crítico) para accidente'
        },

        // Umbrales de RECLAMO LEGAL (percentiles)
        legal_claim_p25: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 25 (bajo) para reclamos legales'
        },
        legal_claim_p50: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 50 (medio) para reclamos legales'
        },
        legal_claim_p75: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 75 (alto) para reclamos legales'
        },
        legal_claim_p90: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 90 (crítico) para reclamos legales'
        },

        // Umbrales de ROTACIÓN (percentiles)
        turnover_p25: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 25 (bajo) para rotación'
        },
        turnover_p50: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 50 (medio) para rotación'
        },
        turnover_p75: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 75 (alto) para rotación'
        },
        turnover_p90: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentil 90 (crítico) para rotación'
        },

        // Pesos recomendados
        recommended_weights: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: { fatigue: 0.25, accident: 0.25, legal: 0.20, performance: 0.15, turnover: 0.15 },
            comment: 'Pesos recomendados por tipo de ocupación'
        },

        // Metadata
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Notas adicionales sobre el benchmark'
        }
    }, {
        tableName: 'risk_benchmarks',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { name: 'idx_benchmarks_ciuo', fields: ['ciuo_code'] },
            { name: 'idx_benchmarks_category', fields: ['work_category'] },
            { name: 'idx_benchmarks_country', fields: ['country_code'] },
            { unique: true, name: 'idx_benchmarks_unique', fields: ['benchmark_code', 'country_code'] }
        ]
    });

    // Instance methods
    RiskBenchmark.prototype.getThresholdsForIndex = function(indexName) {
        const prefix = indexName.toLowerCase().replace('_index', '').replace('_claim', '_claim');
        return {
            low: this[`${prefix}_p25`],
            medium: this[`${prefix}_p50`],
            high: this[`${prefix}_p75`],
            critical: this[`${prefix}_p90`]
        };
    };

    RiskBenchmark.prototype.getAllThresholds = function() {
        return {
            fatigue: this.getThresholdsForIndex('fatigue'),
            accident: this.getThresholdsForIndex('accident'),
            legal_claim: this.getThresholdsForIndex('legal_claim'),
            turnover: this.getThresholdsForIndex('turnover')
        };
    };

    // Class methods
    RiskBenchmark.findByWorkCategory = async function(category, countryCode = 'ARG') {
        return this.findOne({
            where: {
                work_category: category,
                country_code: countryCode,
                is_active: true
            }
        });
    };

    RiskBenchmark.findByCIUO = async function(ciuoCode, countryCode = 'ARG') {
        return this.findOne({
            where: {
                ciuo_code: ciuoCode,
                country_code: countryCode,
                is_active: true
            }
        });
    };

    return RiskBenchmark;
};
