/**
 * CandidateProfile Model
 * Pool de candidatos que registran su CV sin aplicar a oferta específica
 * Parte del Portal de Empleo Público
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CandidateProfile = sequelize.define('CandidateProfile', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        verification_code: {
            type: DataTypes.STRING(6),
            allowNull: true,
            comment: 'Código de 6 dígitos para verificar email'
        },
        verification_code_expires: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Expiración del código (15 min)'
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        full_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        location: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Ubicación: {city, province, country}'
        },
        professional_title: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Ej: "Desarrollador Full Stack", "Contador Público"'
        },
        years_experience: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 0,
                max: 50
            }
        },
        skills: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array de skills: ["JavaScript", "React", "Node.js"]'
        },
        education: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array de educación: [{title, institution, year}]'
        },
        experience: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array de experiencia: [{company, position, from, to, description}]'
        },
        cv_file_path: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'Ruta al archivo CV subido'
        },
        cv_original_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Nombre original del archivo CV'
        },
        preferences: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Preferencias: {salary_expectation, work_mode, availability, willing_to_relocate}'
        },
        visibility: {
            type: DataTypes.ENUM('public', 'hidden'),
            defaultValue: 'public',
            comment: 'Visibilidad en el pool de CVs'
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'hired'),
            defaultValue: 'active'
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true
        },
        profile_views: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Contador de veces que empresas vieron el perfil'
        }
    }, {
        tableName: 'candidate_profiles',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                name: 'idx_candidates_email',
                unique: true,
                fields: ['email']
            },
            {
                name: 'idx_candidates_status_visibility',
                fields: ['status', 'visibility']
            },
            {
                name: 'idx_candidates_skills',
                using: 'GIN',
                fields: ['skills']
            },
            {
                name: 'idx_candidates_location',
                using: 'GIN',
                fields: ['location']
            }
        ]
    });

    // Métodos de instancia
    CandidateProfile.prototype.generateVerificationCode = function() {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        this.verification_code = code;
        this.verification_code_expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        return code;
    };

    CandidateProfile.prototype.isCodeValid = function(code) {
        if (!this.verification_code || !this.verification_code_expires) {
            return false;
        }
        return this.verification_code === code && new Date() < new Date(this.verification_code_expires);
    };

    CandidateProfile.prototype.toPublicJSON = function() {
        return {
            id: this.id,
            full_name: this.full_name,
            professional_title: this.professional_title,
            location: this.location,
            years_experience: this.years_experience,
            skills: this.skills,
            education: this.education,
            experience: this.experience,
            preferences: {
                work_mode: this.preferences?.work_mode,
                availability: this.preferences?.availability,
                willing_to_relocate: this.preferences?.willing_to_relocate
                // NO incluir salary_expectation en vista pública
            },
            created_at: this.created_at
        };
    };

    // Métodos estáticos
    CandidateProfile.searchPool = async function(filters = {}) {
        const where = {
            status: 'active',
            visibility: 'public',
            is_verified: true
        };

        const { Op } = require('sequelize');

        // Filtro por skills (buscar si tiene al menos uno de los skills)
        if (filters.skills && filters.skills.length > 0) {
            where.skills = {
                [Op.overlap]: filters.skills
            };
        }

        // Filtro por experiencia mínima
        if (filters.experience_min) {
            where.years_experience = {
                [Op.gte]: parseInt(filters.experience_min)
            };
        }

        // Filtro por ubicación
        if (filters.location) {
            where.location = {
                [Op.contains]: { city: filters.location }
            };
        }

        // Paginación
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const offset = (page - 1) * limit;

        const { count, rows } = await this.findAndCountAll({
            where,
            limit,
            offset,
            order: [['created_at', 'DESC']],
            attributes: {
                exclude: ['verification_code', 'verification_code_expires', 'email', 'phone']
            }
        });

        return {
            candidates: rows.map(c => c.toPublicJSON()),
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        };
    };

    return CandidateProfile;
};
