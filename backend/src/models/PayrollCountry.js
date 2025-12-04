/**
 * Modelo PayrollCountry - Países con configuración de nómina
 * Sistema de Liquidación Parametrizable v3.0
 * SINCRONIZADO con esquema BD real
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollCountry = sequelize.define('PayrollCountry', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        country_code: {
            type: DataTypes.STRING(3),
            allowNull: false,
            unique: true
        },
        country_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        currency_code: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'USD'
        },
        currency_symbol: {
            type: DataTypes.STRING(5),
            defaultValue: '$'
        },
        decimal_places: {
            type: DataTypes.INTEGER,
            defaultValue: 2
        },
        thousand_separator: {
            type: DataTypes.STRING(1),
            defaultValue: ','
        },
        decimal_separator: {
            type: DataTypes.STRING(1),
            defaultValue: '.'
        },
        labor_law_name: {
            type: DataTypes.STRING(100)
        },
        labor_law_reference: {
            type: DataTypes.STRING(255)
        },
        collective_agreement_name: {
            type: DataTypes.STRING(100)
        },
        default_pay_frequency: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly'
        },
        fiscal_year_start_month: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        aguinaldo_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        aguinaldo_frequency: {
            type: DataTypes.STRING(20)
        },
        vacation_calculation_method: {
            type: DataTypes.STRING(50)
        },
        tax_id_name: {
            type: DataTypes.STRING(50)
        },
        tax_id_format: {
            type: DataTypes.STRING(50)
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        // ═══════════════════════════════════════════════════════════════
        // PRIVACY & DATA PROTECTION FIELDS (Multi-Country Compliance)
        // Patrón Enterprise: Workday/SAP SuccessFactors style
        // ═══════════════════════════════════════════════════════════════

        // --- Identificación de Ley de Privacidad ---
        privacy_law_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Nombre de la ley de protección de datos (ej: GDPR, Ley 25.326)'
        },
        privacy_law_reference: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'URL o referencia oficial de la ley'
        },
        privacy_law_version: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Versión o fecha de última actualización de la ley'
        },

        // --- Autoridad de Protección de Datos ---
        data_protection_authority: {
            type: DataTypes.STRING(150),
            allowNull: true,
            comment: 'Nombre de la autoridad de control (ej: AAIP, AEPD, CNIL)'
        },
        dpa_contact_url: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'URL de contacto de la autoridad de protección de datos'
        },

        // --- Textos de Consentimiento (localizados) ---
        consent_intro_text: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Texto introductorio del consentimiento (idioma local)'
        },
        consent_biometric_text: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Texto específico para datos biométricos'
        },
        consent_emotional_text: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Texto específico para análisis emocional'
        },
        consent_data_sharing_text: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Texto sobre compartición de datos con terceros'
        },
        consent_rights_text: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Texto explicando derechos del titular'
        },
        consent_revocation_text: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Texto sobre cómo revocar el consentimiento'
        },
        consent_footer_text: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Texto final con información de contacto DPO'
        },

        // --- Derechos del Titular (ARCO, GDPR) ---
        data_subject_rights: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: 'Array de derechos (acceso, rectificación, supresión, etc.)'
        },
        rights_exercise_url: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'URL para ejercer derechos'
        },
        rights_response_days: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 30,
            comment: 'Días máximos para responder solicitudes de derechos'
        },

        // --- Retención de Datos ---
        biometric_data_retention_days: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 90,
            comment: 'Días de retención de datos biométricos'
        },
        emotional_data_retention_days: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 365,
            comment: 'Días de retención de datos de análisis emocional'
        },
        attendance_data_retention_years: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 5,
            comment: 'Años de retención de registros de asistencia'
        },

        // --- Requisitos Especiales ---
        requires_explicit_consent: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si requiere consentimiento explícito para datos sensibles'
        },
        requires_dpia: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si requiere Evaluación de Impacto (DPIA/EIPD)'
        },
        requires_dpo: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si requiere Delegado de Protección de Datos'
        },
        allows_biometric_for_attendance: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si permite uso de biometría para control de asistencia'
        },
        allows_emotional_analysis: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Si permite análisis emocional de empleados'
        },

        // --- Sanciones y Penalidades ---
        max_penalty_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            comment: 'Multa máxima en moneda local'
        },
        penalty_calculation_method: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Método de cálculo (% facturación, monto fijo, etc.)'
        },

        // --- Transferencias Internacionales ---
        allows_international_transfer: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Si permite transferencia internacional de datos'
        },
        transfer_mechanisms: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: 'Mecanismos permitidos (SCCs, BCRs, adecuación, etc.)'
        },
        adequate_countries: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: 'Países con nivel adecuado de protección'
        },

        // --- Notificación de Brechas ---
        breach_notification_hours: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 72,
            comment: 'Horas máximas para notificar brechas de seguridad'
        },
        breach_notification_authority: {
            type: DataTypes.STRING(150),
            allowNull: true,
            comment: 'Autoridad a notificar en caso de brecha'
        },

        // --- Metadatos ---
        privacy_config_version: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'Versión de la configuración de privacidad'
        },
        last_privacy_review: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha de última revisión legal'
        },
        next_privacy_review: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Fecha de próxima revisión programada'
        }
    }, {
        tableName: 'payroll_countries',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    PayrollCountry.associate = (models) => {
        if (models.CompanyBranch) {
            PayrollCountry.hasMany(models.CompanyBranch, {
                foreignKey: 'country_id',
                as: 'branches'
            });
        }
        if (models.LaborAgreementV2) {
            PayrollCountry.hasMany(models.LaborAgreementV2, {
                foreignKey: 'country_id',
                as: 'laborAgreements'
            });
        }
    };

    return PayrollCountry;
};
