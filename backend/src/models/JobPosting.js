/**
 * JobPosting Model
 * Ofertas laborales publicadas por empresas
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    const JobPosting = sequelize.define('JobPosting', {
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

        // Información básica
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        requirements: {
            type: DataTypes.TEXT
        },
        responsibilities: {
            type: DataTypes.TEXT
        },

        // Clasificación
        department_id: {
            type: DataTypes.INTEGER,
            references: { model: 'departments', key: 'id' }
        },
        department_name: {
            type: DataTypes.STRING(100)
        },
        location: {
            type: DataTypes.STRING(255)
        },
        job_type: {
            type: DataTypes.STRING(50),
            defaultValue: 'full-time',
            validate: {
                isIn: [['full-time', 'part-time', 'contract', 'temporary', 'internship']]
            }
        },

        // Compensación
        salary_min: {
            type: DataTypes.DECIMAL(12, 2)
        },
        salary_max: {
            type: DataTypes.DECIMAL(12, 2)
        },
        salary_currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        salary_period: {
            type: DataTypes.STRING(20),
            defaultValue: 'monthly',
            validate: {
                isIn: [['hourly', 'daily', 'weekly', 'monthly', 'yearly']]
            }
        },
        benefits: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // Estado
        status: {
            type: DataTypes.STRING(30),
            defaultValue: 'draft',
            validate: {
                isIn: [['draft', 'active', 'paused', 'closed', 'filled']]
            }
        },
        is_public: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        is_internal: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // =====================================================
        // ALCANCE DE BÚSQUEDA (INTERNO/EXTERNO/AMBOS)
        // =====================================================
        search_scope: {
            type: DataTypes.STRING(20),
            defaultValue: 'external',
            validate: {
                isIn: [['internal', 'external', 'both']]
            },
            comment: 'internal=solo empleados, external=solo público, both=ambos'
        },

        // Matching interno automático
        internal_matching_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Activar escaneo automático de candidatos internos'
        },
        internal_matching_criteria: {
            type: DataTypes.JSONB,
            defaultValue: {
                match_skills: true,
                match_experience: true,
                match_certifications: true,
                match_education: true,
                min_match_score: 50
            },
            comment: 'Criterios de matching para candidatos internos'
        },
        internal_candidates_notified: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Lista de user_ids ya notificados'
        },
        internal_matching_executed_at: {
            type: DataTypes.DATE,
            comment: 'Última vez que se ejecutó el matching'
        },
        internal_candidates_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        // Configuración
        max_applications: {
            type: DataTypes.INTEGER
        },
        auto_close_date: {
            type: DataTypes.DATEONLY
        },
        requires_cv: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        requires_cover_letter: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // Tags y skills
        tags: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        skills_required: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // Responsables
        hiring_manager_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        recruiter_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },

        // Métricas
        views_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        applications_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        // Timestamps especiales
        posted_at: {
            type: DataTypes.DATE
        },
        closed_at: {
            type: DataTypes.DATE
        },
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'job_postings',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // =====================================================
    // MÉTODOS DE INSTANCIA
    // =====================================================

    /**
     * Publicar oferta
     */
    JobPosting.prototype.publish = async function() {
        this.status = 'active';
        this.posted_at = new Date();
        return this.save();
    };

    /**
     * Pausar oferta
     */
    JobPosting.prototype.pause = async function() {
        this.status = 'paused';
        return this.save();
    };

    /**
     * Cerrar oferta
     */
    JobPosting.prototype.close = async function(reason = 'manual') {
        this.status = reason === 'filled' ? 'filled' : 'closed';
        this.closed_at = new Date();
        return this.save();
    };

    /**
     * Incrementar vistas
     */
    JobPosting.prototype.incrementViews = async function() {
        this.views_count += 1;
        return this.save();
    };

    // =====================================================
    // MÉTODOS ESTÁTICOS
    // =====================================================

    /**
     * Obtener ofertas activas de una empresa
     */
    JobPosting.getActiveByCompany = async function(companyId, options = {}) {
        const { includeInternal = false, limit = 50 } = options;

        const where = {
            company_id: companyId,
            status: 'active'
        };

        if (!includeInternal) {
            where.is_internal = false;
        }

        return this.findAll({
            where,
            order: [['posted_at', 'DESC']],
            limit
        });
    };

    /**
     * Obtener ofertas públicas (para portal de empleo)
     */
    JobPosting.getPublicOffers = async function(filters = {}) {
        const { location, job_type, department_id, search, limit = 20, offset = 0 } = filters;

        const where = {
            status: 'active',
            is_public: true
        };

        if (location) where.location = { [Op.iLike]: `%${location}%` };
        if (job_type) where.job_type = job_type;
        if (department_id) where.department_id = department_id;
        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        return this.findAndCountAll({
            where,
            order: [['posted_at', 'DESC']],
            limit,
            offset
        });
    };

    /**
     * Verificar si puede recibir más postulaciones
     */
    JobPosting.prototype.canReceiveApplications = function() {
        if (this.status !== 'active') return false;
        if (this.max_applications && this.applications_count >= this.max_applications) return false;
        if (this.auto_close_date && new Date() > new Date(this.auto_close_date)) return false;
        return true;
    };

    return JobPosting;
};
