/**
 * JobApplication Model
 * Postulaciones a ofertas laborales con flujo completo hasta contratación
 *
 * FLUJO DE ESTADOS:
 * nuevo → revision → entrevista_pendiente → entrevista_realizada →
 * aprobado_administrativo → examen_pendiente → examen_realizado →
 * apto/apto_con_observaciones/no_apto → contratado
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
    const JobApplication = sequelize.define('JobApplication', {
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
        job_posting_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'job_postings', key: 'id' }
        },

        // =====================================================
        // DATOS DEL CANDIDATO
        // =====================================================
        candidate_first_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        candidate_last_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        candidate_email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: { isEmail: true }
        },
        candidate_phone: {
            type: DataTypes.STRING(50)
        },
        candidate_dni: {
            type: DataTypes.STRING(20)
        },
        candidate_birth_date: {
            type: DataTypes.DATEONLY
        },
        candidate_gender: {
            type: DataTypes.STRING(20)
        },
        candidate_nationality: {
            type: DataTypes.STRING(100)
        },
        candidate_address: {
            type: DataTypes.TEXT
        },
        candidate_city: {
            type: DataTypes.STRING(100)
        },
        candidate_province: {
            type: DataTypes.STRING(100)
        },
        candidate_postal_code: {
            type: DataTypes.STRING(20)
        },

        // =====================================================
        // INFORMACIÓN PROFESIONAL
        // =====================================================
        experience_years: {
            type: DataTypes.INTEGER
        },
        current_position: {
            type: DataTypes.STRING(255)
        },
        current_company: {
            type: DataTypes.STRING(255)
        },
        education_level: {
            type: DataTypes.STRING(50)
        },
        education_title: {
            type: DataTypes.STRING(255)
        },
        skills: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        languages: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        certifications: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // =====================================================
        // DOCUMENTOS
        // =====================================================
        cv_file_path: {
            type: DataTypes.STRING(500)
        },
        cv_file_name: {
            type: DataTypes.STRING(255)
        },
        cv_uploaded_at: {
            type: DataTypes.DATE
        },
        cover_letter: {
            type: DataTypes.TEXT
        },
        additional_documents: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // =====================================================
        // EXPECTATIVAS
        // =====================================================
        salary_expectation: {
            type: DataTypes.DECIMAL(12, 2)
        },
        availability: {
            type: DataTypes.STRING(50)
        },
        preferred_schedule: {
            type: DataTypes.STRING(100)
        },
        willing_to_relocate: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // =====================================================
        // ESTADO (CRÍTICO)
        // =====================================================
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'nuevo',
            validate: {
                isIn: [[
                    'nuevo',
                    'revision',
                    'entrevista_pendiente',
                    'entrevista_realizada',
                    'aprobado_administrativo',
                    'examen_pendiente',
                    'examen_realizado',
                    'apto',
                    'apto_con_observaciones',
                    'no_apto',
                    'contratado',
                    'rechazado',
                    'desistio'
                ]]
            }
        },
        status_history: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // =====================================================
        // REVISIÓN RRHH
        // =====================================================
        reviewed_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        reviewed_at: {
            type: DataTypes.DATE
        },
        review_notes: {
            type: DataTypes.TEXT
        },
        review_score: {
            type: DataTypes.INTEGER,
            validate: { min: 1, max: 10 }
        },

        // =====================================================
        // ENTREVISTA
        // =====================================================
        interview_scheduled_at: {
            type: DataTypes.DATE
        },
        interview_location: {
            type: DataTypes.STRING(255)
        },
        interview_type: {
            type: DataTypes.STRING(50)
        },
        interview_notes: {
            type: DataTypes.TEXT
        },
        interview_score: {
            type: DataTypes.INTEGER,
            validate: { min: 1, max: 10 }
        },
        interviewer_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },

        // =====================================================
        // APROBACIÓN ADMINISTRATIVA
        // =====================================================
        admin_approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        admin_approved_at: {
            type: DataTypes.DATE
        },
        admin_approval_notes: {
            type: DataTypes.TEXT
        },

        // =====================================================
        // INTEGRACIÓN MÉDICA
        // =====================================================
        medical_record_id: {
            type: DataTypes.INTEGER,
            references: { model: 'medical_records', key: 'id' }
        },
        medical_exam_date: {
            type: DataTypes.DATEONLY
        },
        medical_result: {
            type: DataTypes.STRING(50)
        },
        medical_observations: {
            type: DataTypes.TEXT
        },
        medical_restrictions: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        medical_approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        medical_approved_at: {
            type: DataTypes.DATE
        },

        // =====================================================
        // CONTRATACIÓN
        // =====================================================
        hired_at: {
            type: DataTypes.DATE
        },
        hired_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        employee_user_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        start_date: {
            type: DataTypes.DATEONLY
        },
        assigned_department_id: {
            type: DataTypes.INTEGER,
            references: { model: 'departments', key: 'id' }
        },
        assigned_position: {
            type: DataTypes.STRING(255)
        },
        final_salary: {
            type: DataTypes.DECIMAL(12, 2)
        },
        contract_type: {
            type: DataTypes.STRING(50)
        },

        // =====================================================
        // RECHAZO
        // =====================================================
        rejected_at: {
            type: DataTypes.DATE
        },
        rejected_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        rejection_reason: {
            type: DataTypes.STRING(255)
        },
        rejection_notes: {
            type: DataTypes.TEXT
        },
        rejection_stage: {
            type: DataTypes.STRING(50)
        },

        // =====================================================
        // NOTIFICACIONES
        // =====================================================
        notification_sent_to_medical: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        notification_sent_at: {
            type: DataTypes.DATE
        },
        notification_id: {
            type: DataTypes.INTEGER
        },

        // =====================================================
        // METADATA
        // =====================================================
        source: {
            type: DataTypes.STRING(100)
        },
        referrer_employee_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        ip_address: {
            type: DataTypes.STRING(45)
        },
        user_agent: {
            type: DataTypes.TEXT
        },

        applied_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'job_applications',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // =====================================================
    // CONSTANTES DE ESTADOS
    // =====================================================
    JobApplication.STATUSES = {
        NUEVO: 'nuevo',
        REVISION: 'revision',
        ENTREVISTA_PENDIENTE: 'entrevista_pendiente',
        ENTREVISTA_REALIZADA: 'entrevista_realizada',
        APROBADO_ADMIN: 'aprobado_administrativo',
        EXAMEN_PENDIENTE: 'examen_pendiente',
        EXAMEN_REALIZADO: 'examen_realizado',
        APTO: 'apto',
        APTO_CON_OBS: 'apto_con_observaciones',
        NO_APTO: 'no_apto',
        CONTRATADO: 'contratado',
        RECHAZADO: 'rechazado',
        DESISTIO: 'desistio'
    };

    // Estados que requieren notificación al médico
    JobApplication.MEDICAL_TRIGGER_STATUSES = [
        'aprobado_administrativo'
    ];

    // Estados finales
    JobApplication.FINAL_STATUSES = [
        'contratado', 'rechazado', 'no_apto', 'desistio'
    ];

    // =====================================================
    // MÉTODOS DE INSTANCIA
    // =====================================================

    /**
     * Nombre completo del candidato
     */
    JobApplication.prototype.getFullName = function() {
        return `${this.candidate_first_name} ${this.candidate_last_name}`;
    };

    /**
     * Cambiar estado con tracking
     */
    JobApplication.prototype.changeStatus = async function(newStatus, userId, notes = '') {
        const oldStatus = this.status;

        // Registrar en historial
        const history = this.status_history || [];
        history.push({
            from_status: oldStatus,
            to_status: newStatus,
            changed_at: new Date().toISOString(),
            changed_by: userId,
            notes
        });

        this.status = newStatus;
        this.status_history = history;

        return this.save();
    };

    /**
     * Aprobar administrativamente (dispara notificación a médico)
     */
    JobApplication.prototype.approveAdministrative = async function(userId, notes = '') {
        this.admin_approved_by = userId;
        this.admin_approved_at = new Date();
        this.admin_approval_notes = notes;

        await this.changeStatus(JobApplication.STATUSES.APROBADO_ADMIN, userId, notes);

        // Retornar true para indicar que debe dispararse notificación
        return { shouldNotifyMedical: true };
    };

    /**
     * Registrar resultado de examen médico
     */
    JobApplication.prototype.setMedicalResult = async function(result, medicalRecordId, userId, observations = '', restrictions = []) {
        this.medical_result = result;
        this.medical_record_id = medicalRecordId;
        this.medical_observations = observations;
        this.medical_restrictions = restrictions;
        this.medical_approved_by = userId;
        this.medical_approved_at = new Date();

        let newStatus;
        switch (result) {
            case 'apto':
                newStatus = JobApplication.STATUSES.APTO;
                break;
            case 'apto_con_observaciones':
                newStatus = JobApplication.STATUSES.APTO_CON_OBS;
                break;
            case 'no_apto':
                newStatus = JobApplication.STATUSES.NO_APTO;
                break;
            default:
                newStatus = JobApplication.STATUSES.EXAMEN_REALIZADO;
        }

        await this.changeStatus(newStatus, userId, `Resultado médico: ${result}`);

        return {
            canBeHired: result === 'apto' || result === 'apto_con_observaciones',
            result,
            restrictions
        };
    };

    /**
     * Contratar (crear usuario/empleado)
     */
    JobApplication.prototype.hire = async function(userId, employeeUserId, options = {}) {
        const { startDate, departmentId, position, salary, contractType } = options;

        this.hired_at = new Date();
        this.hired_by = userId;
        this.employee_user_id = employeeUserId;
        this.start_date = startDate;
        this.assigned_department_id = departmentId;
        this.assigned_position = position;
        this.final_salary = salary;
        this.contract_type = contractType;

        await this.changeStatus(JobApplication.STATUSES.CONTRATADO, userId, 'Candidato contratado');

        return this.save();
    };

    /**
     * Rechazar candidato
     */
    JobApplication.prototype.reject = async function(userId, reason, notes = '') {
        this.rejected_at = new Date();
        this.rejected_by = userId;
        this.rejection_reason = reason;
        this.rejection_notes = notes;
        this.rejection_stage = this.status;

        await this.changeStatus(JobApplication.STATUSES.RECHAZADO, userId, `Rechazado: ${reason}`);

        return this.save();
    };

    // =====================================================
    // MÉTODOS ESTÁTICOS
    // =====================================================

    /**
     * Obtener candidatos pendientes de examen médico
     */
    JobApplication.getPendingMedicalExam = async function(companyId) {
        return this.findAll({
            where: {
                company_id: companyId,
                status: {
                    [Op.in]: [
                        JobApplication.STATUSES.APROBADO_ADMIN,
                        JobApplication.STATUSES.EXAMEN_PENDIENTE
                    ]
                }
            },
            order: [['admin_approved_at', 'ASC']]
        });
    };

    /**
     * Obtener candidatos aptos para contratar
     */
    JobApplication.getReadyToHire = async function(companyId) {
        return this.findAll({
            where: {
                company_id: companyId,
                status: {
                    [Op.in]: [
                        JobApplication.STATUSES.APTO,
                        JobApplication.STATUSES.APTO_CON_OBS
                    ]
                }
            },
            order: [['medical_approved_at', 'ASC']]
        });
    };

    /**
     * Estadísticas por empresa
     */
    JobApplication.getStatsByCompany = async function(companyId) {
        const [results] = await sequelize.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'nuevo') AS nuevas,
                COUNT(*) FILTER (WHERE status = 'revision') AS en_revision,
                COUNT(*) FILTER (WHERE status IN ('entrevista_pendiente', 'entrevista_realizada')) AS en_entrevista,
                COUNT(*) FILTER (WHERE status = 'aprobado_administrativo') AS aprobadas_admin,
                COUNT(*) FILTER (WHERE status IN ('examen_pendiente', 'examen_realizado')) AS en_examen,
                COUNT(*) FILTER (WHERE status IN ('apto', 'apto_con_observaciones')) AS aptos,
                COUNT(*) FILTER (WHERE status = 'contratado') AS contratados,
                COUNT(*) FILTER (WHERE status = 'rechazado') AS rechazados,
                COUNT(*) FILTER (WHERE status = 'no_apto') AS no_aptos
            FROM job_applications
            WHERE company_id = :companyId
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        return results || {};
    };

    /**
     * Verificar si email ya postuló a esta oferta
     */
    JobApplication.hasApplied = async function(email, jobPostingId) {
        const count = await this.count({
            where: {
                candidate_email: email,
                job_posting_id: jobPostingId,
                status: { [Op.notIn]: ['rechazado', 'desistio'] }
            }
        });
        return count > 0;
    };

    return JobApplication;
};
