/**
 * Modelo Sector - Subdivisiones de Departamentos
 * Sistema de Estructura Organizacional Enterprise
 *
 * Multi-tenant: company_id
 * Jerarquía: Empresa → Sucursal → Departamento → Sector → Empleado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Sector = sequelize.define('Sector', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // Multi-tenant
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'company_id'
            },
            comment: 'ID de la empresa (multi-tenant)'
        },

        // Relación con departamento
        department_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'departments',
                key: 'id'
            },
            comment: 'Departamento al que pertenece este sector'
        },

        // Información básica
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 100]
            },
            comment: 'Nombre del sector'
        },

        code: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'Código interno del sector'
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Descripción del sector'
        },

        // Supervisor
        supervisor_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            },
            comment: 'Supervisor/Encargado del sector'
        },

        // Ubicación GPS (opcional, hereda del departamento)
        gps_lat: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
            validate: {
                min: -90,
                max: 90
            }
        },

        gps_lng: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
            validate: {
                min: -180,
                max: 180
            }
        },

        coverage_radius: {
            type: DataTypes.INTEGER,
            defaultValue: 50,
            validate: {
                min: 10,
                max: 1000
            },
            comment: 'Radio de cobertura GPS en metros'
        },

        // Configuración
        max_employees: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Capacidad máxima de empleados (null = sin límite)'
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Orden de visualización'
        }

    }, {
        tableName: 'sectors',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id'] },
            { fields: ['department_id'] },
            { fields: ['supervisor_id'] },
            { fields: ['company_id', 'is_active'] },
            {
                unique: true,
                fields: ['department_id', 'name'],
                where: { is_active: true }
            }
        ]
    });

    // Asociaciones
    Sector.associate = (models) => {
        // Pertenece a una empresa
        if (models.Company) {
            Sector.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }

        // Pertenece a un departamento
        if (models.Department) {
            Sector.belongsTo(models.Department, {
                foreignKey: 'department_id',
                as: 'department'
            });
        }

        // Tiene un supervisor (usuario)
        if (models.User) {
            Sector.belongsTo(models.User, {
                foreignKey: 'supervisor_id',
                as: 'supervisor'
            });

            // Tiene muchos empleados
            Sector.hasMany(models.User, {
                foreignKey: 'sector_id',
                as: 'employees'
            });
        }
    };

    // Método: Obtener ubicación GPS
    Sector.prototype.getGpsLocation = function() {
        if (this.gps_lat && this.gps_lng) {
            return {
                lat: parseFloat(this.gps_lat),
                lng: parseFloat(this.gps_lng)
            };
        }
        return null;
    };

    // Método: Contar empleados activos
    Sector.prototype.countActiveEmployees = async function() {
        const { User } = sequelize.models;
        return await User.count({
            where: {
                sector_id: this.id,
                is_active: true
            }
        });
    };

    // Método estático: Obtener sectores por departamento
    Sector.getByDepartment = async function(departmentId, companyId) {
        return await this.findAll({
            where: {
                department_id: departmentId,
                company_id: companyId,
                is_active: true
            },
            order: [['display_order', 'ASC'], ['name', 'ASC']]
        });
    };

    return Sector;
};
