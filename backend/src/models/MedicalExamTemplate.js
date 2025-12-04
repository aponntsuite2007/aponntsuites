/**
 * MedicalExamTemplate Model
 * Plantillas de examenes medicos configurables por empresa
 * Segun normativa SRT Argentina (Res. 37/10, 43/97, 905/15)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const MedicalExamTemplate = sequelize.define('MedicalExamTemplate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // NULL = plantilla global/template
            references: {
                model: 'companies',
                key: 'company_id'
            }
        },
        template_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [3, 100]
            }
        },
        template_code: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        exam_type: {
            type: DataTypes.ENUM('preocupacional', 'periodico', 'reingreso', 'retiro', 'especial'),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        required_studies: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array: [{name, type, required, frequency_months, notes, condition}]'
        },
        required_documents: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array: [{name, type, required, notes}]'
        },
        validity_days: {
            type: DataTypes.INTEGER,
            defaultValue: 365,
            validate: {
                min: 1,
                max: 3650 // Max 10 años
            }
        },
        reminder_days_before: {
            type: DataTypes.INTEGER,
            defaultValue: 30,
            validate: {
                min: 0,
                max: 365
            }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'medical_exam_templates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id'] },
            { fields: ['exam_type'] },
            { fields: ['is_active'] }
        ]
    });

    // Metodos de instancia
    MedicalExamTemplate.prototype.getRequiredStudies = function(filter = {}) {
        let studies = this.required_studies || [];
        if (filter.required !== undefined) {
            studies = studies.filter(s => s.required === filter.required);
        }
        if (filter.type) {
            studies = studies.filter(s => s.type === filter.type);
        }
        return studies;
    };

    MedicalExamTemplate.prototype.getRequiredDocuments = function(filter = {}) {
        let docs = this.required_documents || [];
        if (filter.required !== undefined) {
            docs = docs.filter(d => d.required === filter.required);
        }
        return docs;
    };

    // Metodos de clase
    MedicalExamTemplate.getForCompany = async function(companyId, options = {}) {
        const where = {
            is_active: true,
            [sequelize.Sequelize.Op.or]: [
                { company_id: companyId },
                { company_id: null } // Plantillas globales
            ]
        };

        if (options.examType) {
            where.exam_type = options.examType;
        }

        return this.findAll({
            where,
            order: [
                ['company_id', 'DESC NULLS LAST'], // Prioridad a plantillas de empresa
                ['exam_type', 'ASC'],
                ['template_name', 'ASC']
            ]
        });
    };

    MedicalExamTemplate.getDefaultForType = async function(companyId, examType) {
        // Primero buscar default de empresa
        let template = await this.findOne({
            where: {
                company_id: companyId,
                exam_type: examType,
                is_default: true,
                is_active: true
            }
        });

        // Si no hay, buscar default global
        if (!template) {
            template = await this.findOne({
                where: {
                    company_id: null,
                    exam_type: examType,
                    is_active: true
                },
                order: [['id', 'ASC']] // La primera insertada
            });
        }

        return template;
    };

    MedicalExamTemplate.cloneForCompany = async function(templateId, companyId, userId) {
        const original = await this.findByPk(templateId);
        if (!original) {
            throw new Error('Plantilla no encontrada');
        }

        const cloned = await this.create({
            company_id: companyId,
            template_name: `${original.template_name} (Personalizada)`,
            template_code: original.template_code ? `${original.template_code}-${companyId}` : null,
            exam_type: original.exam_type,
            description: original.description,
            required_studies: original.required_studies,
            required_documents: original.required_documents,
            validity_days: original.validity_days,
            reminder_days_before: original.reminder_days_before,
            is_active: true,
            is_default: false,
            created_by: userId
        });

        return cloned;
    };

    // Asociaciones
    MedicalExamTemplate.associate = function(models) {
        MedicalExamTemplate.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        MedicalExamTemplate.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        MedicalExamTemplate.hasMany(models.MedicalRecord, {
            foreignKey: 'template_id',
            as: 'records'
        });
    };

    return MedicalExamTemplate;
};
