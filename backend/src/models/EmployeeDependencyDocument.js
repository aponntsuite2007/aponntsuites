/**
 * EmployeeDependencyDocument Model
 * Documentos/certificados cargados por empleados que satisfacen dependencias
 * Ej: Certificado de escolaridad de un hijo
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const EmployeeDependencyDocument = sequelize.define('EmployeeDependencyDocument', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'company_id'
            }
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            },
            comment: 'El empleado dueño del documento'
        },
        dependency_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'company_dependencies',
                key: 'id'
            },
            comment: 'Qué dependencia satisface este documento'
        },
        family_member_type: {
            type: DataTypes.ENUM('SELF', 'CHILD', 'SPOUSE', 'OTHER'),
            allowNull: true,
            comment: 'A quién aplica el documento'
        },
        family_member_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'FK a user_children o user_family_members según type'
        },
        family_member_name: {
            type: DataTypes.STRING(150),
            allowNull: true,
            comment: 'Nombre denormalizado para reportes'
        },
        issue_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Fecha de emisión del documento'
        },
        expiration_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'Fecha de vencimiento (NULL si no vence)'
        },
        file_url: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        file_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        file_size: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Tamaño en bytes'
        },
        file_mime_type: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('VALID', 'EXPIRING_SOON', 'EXPIRED', 'PENDING_REVIEW'),
            defaultValue: 'VALID',
            comment: 'Estado calculado automáticamente'
        },
        days_until_expiration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Días hasta vencimiento (calculado)'
        },
        replaced_by_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employee_dependency_documents',
                key: 'id'
            },
            comment: 'Si fue renovado, apunta al nuevo documento'
        },
        is_current: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'FALSE si fue reemplazado por otro'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        uploaded_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        reviewed_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        reviewed_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        review_notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'employee_dependency_documents',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    EmployeeDependencyDocument.associate = (models) => {
        EmployeeDependencyDocument.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });

        EmployeeDependencyDocument.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'employee'
        });

        EmployeeDependencyDocument.belongsTo(models.CompanyDependency, {
            foreignKey: 'dependency_id',
            as: 'dependency'
        });

        EmployeeDependencyDocument.belongsTo(models.User, {
            foreignKey: 'uploaded_by',
            as: 'uploader'
        });

        EmployeeDependencyDocument.belongsTo(models.User, {
            foreignKey: 'reviewed_by',
            as: 'reviewer'
        });

        EmployeeDependencyDocument.belongsTo(models.EmployeeDependencyDocument, {
            foreignKey: 'replaced_by_id',
            as: 'replacement'
        });
    };

    // Método para calcular el status basado en la fecha de vencimiento
    EmployeeDependencyDocument.prototype.updateStatus = function() {
        if (!this.expiration_date) {
            this.status = 'VALID';
            this.days_until_expiration = null;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(this.expiration_date);
        expDate.setHours(0, 0, 0, 0);

        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        this.days_until_expiration = diffDays;

        if (diffDays < 0) {
            this.status = 'EXPIRED';
        } else if (diffDays <= 30) {
            this.status = 'EXPIRING_SOON';
        } else {
            this.status = 'VALID';
        }
    };

    return EmployeeDependencyDocument;
};
