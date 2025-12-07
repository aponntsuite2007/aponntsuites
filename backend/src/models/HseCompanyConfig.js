/**
 * Modelo: HseCompanyConfig
 * Configuracion del modulo HSE por empresa
 *
 * @version 1.0.0
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const HseCompanyConfig = sequelize.define('HseCompanyConfig', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: 'companies', key: 'company_id' }
        },

        // Estandar primario
        primary_standard: {
            type: DataTypes.STRING(30),
            defaultValue: 'ISO45001',
            validate: {
                isIn: [['ISO45001', 'OSHA', 'EU_OSHA', 'SRT', 'NOM_017_STPS', 'NR6']]
            },
            comment: 'ISO45001, OSHA, EU_OSHA, SRT, NOM_017_STPS, NR6'
        },
        secondary_standards: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: '["SRT", "ISO14001"]'
        },

        // Alertas de vencimiento
        alert_days_before: {
            type: DataTypes.JSONB,
            defaultValue: [30, 15, 7, 1],
            comment: 'Dias antes para alertar vencimiento'
        },

        // Notificaciones
        notify_employee: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notify_supervisor: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notify_hse_manager: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notify_hr: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // Reglas de negocio
        block_work_without_epp: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Bloquear fichaje si EPP vencido?'
        },
        require_signature_on_delivery: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        auto_schedule_inspections: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        inspection_frequency_days: {
            type: DataTypes.INTEGER,
            defaultValue: 90,
            comment: 'Cada cuantos dias inspeccionar EPP'
        },

        // Roles responsables
        hse_manager_role_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'organizational_positions', key: 'id' }
        }
    }, {
        tableName: 'hse_company_config',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    HseCompanyConfig.associate = (models) => {
        if (models.Company) {
            HseCompanyConfig.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }

        if (models.OrganizationalPosition) {
            HseCompanyConfig.belongsTo(models.OrganizationalPosition, {
                foreignKey: 'hse_manager_role_id',
                as: 'hseManagerRole'
            });
        }
    };

    return HseCompanyConfig;
};
