/**
 * Modelo: EppRoleRequirement
 * Matriz de EPP requerido por posicion organizacional
 *
 * @version 1.0.0
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const EppRoleRequirement = sequelize.define('EppRoleRequirement', {
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
        position_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'organizational_positions', key: 'id' }
        },
        epp_catalog_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'epp_catalog', key: 'id' }
        },
        is_mandatory: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'true = Obligatorio, false = Recomendado'
        },
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: '1=Critico, 2=Importante, 3=Complementario'
        },
        quantity_required: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'Cuantas unidades (ej: 2 pares de guantes)'
        },
        custom_lifespan_days: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Override de vida util si el rol tiene desgaste especial'
        },
        conditions: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Condiciones especiales: "Solo para trabajo en altura"'
        },
        applicable_work_environments: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null,
            comment: '["planta", "exterior"] del OrganizationalPosition'
        },
        specific_procedure_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Procedimiento especifico para este rol+EPP'
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        tableName: 'epp_role_requirements',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'position_id', 'epp_catalog_id'] }
        ]
    });

    EppRoleRequirement.associate = (models) => {
        if (models.Company) {
            EppRoleRequirement.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }

        if (models.OrganizationalPosition) {
            EppRoleRequirement.belongsTo(models.OrganizationalPosition, {
                foreignKey: 'position_id',
                as: 'position'
            });
        }

        if (models.EppCatalog) {
            EppRoleRequirement.belongsTo(models.EppCatalog, {
                foreignKey: 'epp_catalog_id',
                as: 'eppItem'
            });
        }

        if (models.EppDelivery) {
            EppRoleRequirement.hasMany(models.EppDelivery, {
                foreignKey: 'requirement_id',
                as: 'deliveries'
            });
        }
    };

    return EppRoleRequirement;
};
