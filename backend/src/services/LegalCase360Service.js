/**
 * LegalCase360Service.js
 * Servicio para generar expediente legal 360 completo del empleado
 *
 * Cuando se inicia un caso legal (demanda, reclamo, etc.),
 * este servicio trae ABSOLUTAMENTE TODO el historial del empleado:
 * - Datos personales y laborales
 * - Historial de asistencia (llegadas tarde, inasistencias)
 * - Sanciones disciplinarias
 * - Comunicaciones legales previas
 * - Examenes medicos (pre y post ocupacionales)
 * - Notificaciones enviadas/recibidas
 * - Historial de vacaciones
 * - Historial de nomina
 * - Cambios de departamento/posicion
 * - Y mas...
 *
 * El abogado NO tiene que solicitar nada adicional.
 */

const { sequelize } = require('../config/database');
const { Op, QueryTypes } = require('sequelize');

class LegalCase360Service {

    /**
     * Genera el expediente 360 completo de un empleado
     * @param {string} employeeId - UUID del empleado
     * @param {number} companyId - ID de la empresa
     * @param {object} options - Opciones adicionales
     * @returns {object} Expediente completo
     */
    static async generateFullDossier(employeeId, companyId, options = {}) {
        const startTime = Date.now();

        try {
            // Ejecutar todas las consultas en paralelo para mejor performance
            const [
                personalInfo,
                employmentInfo,
                attendanceHistory,
                disciplinaryHistory,
                legalCommunications,
                medicalHistory,
                notificationsHistory,
                vacationHistory,
                payrollHistory,
                positionChanges,
                trainingHistory,
                documentsHistory,
                previousCases
            ] = await Promise.all([
                this.getPersonalInfo(employeeId, companyId),
                this.getEmploymentInfo(employeeId, companyId),
                this.getAttendanceHistory(employeeId, companyId, options),
                this.getDisciplinaryHistory(employeeId, companyId),
                this.getLegalCommunications(employeeId, companyId),
                this.getMedicalHistory(employeeId, companyId),
                this.getNotificationsHistory(employeeId, companyId),
                this.getVacationHistory(employeeId, companyId),
                this.getPayrollHistory(employeeId, companyId, options),
                this.getPositionChanges(employeeId, companyId),
                this.getTrainingHistory(employeeId, companyId),
                this.getDocumentsHistory(employeeId, companyId),
                this.getPreviousCases(employeeId, companyId)
            ]);

            // Calcular estadisticas generales
            const statistics = this.calculateStatistics({
                attendanceHistory,
                disciplinaryHistory,
                vacationHistory,
                medicalHistory
            });

            // Generar timeline unificado
            const unifiedTimeline = this.generateUnifiedTimeline({
                attendanceHistory,
                disciplinaryHistory,
                legalCommunications,
                medicalHistory,
                notificationsHistory,
                vacationHistory,
                positionChanges
            });

            const dossier = {
                generated_at: new Date().toISOString(),
                generation_time_ms: Date.now() - startTime,
                employee_id: employeeId,
                company_id: companyId,

                // Datos del empleado
                personal: personalInfo,
                employment: employmentInfo,

                // Historiales
                attendance: attendanceHistory,
                disciplinary: disciplinaryHistory,
                legal_communications: legalCommunications,
                medical: medicalHistory,
                notifications: notificationsHistory,
                vacations: vacationHistory,
                payroll: payrollHistory,
                position_changes: positionChanges,
                training: trainingHistory,
                documents: documentsHistory,
                previous_cases: previousCases,

                // Estadisticas y resumen
                statistics,
                unified_timeline: unifiedTimeline,

                // Metadata
                sections_available: this.getSectionsAvailable({
                    personalInfo, employmentInfo, attendanceHistory,
                    disciplinaryHistory, legalCommunications, medicalHistory,
                    notificationsHistory, vacationHistory, payrollHistory,
                    positionChanges, trainingHistory, documentsHistory, previousCases
                })
            };

            return dossier;

        } catch (error) {
            console.error('[LegalCase360Service] Error generando expediente:', error);
            throw error;
        }
    }

    /**
     * Informacion personal del empleado
     */
    static async getPersonalInfo(employeeId, companyId) {
        try {
            const [result] = await sequelize.query(`
                SELECT
                    u.user_id,
                    u.name,
                    u.email,
                    u.phone,
                    u.dni,
                    u.cuil,
                    u.birth_date,
                    u.gender,
                    u.nationality,
                    u.marital_status,
                    u.address,
                    u.city,
                    u.province,
                    u.postal_code,
                    u.country,
                    u.emergency_contact_name,
                    u.emergency_contact_phone,
                    u.emergency_contact_relationship,
                    u.photo_url,
                    u.created_at as registration_date
                FROM users u
                WHERE u.user_id = :employeeId
                  AND u.company_id = :companyId
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return result || null;
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo info personal:', error.message);
            return null;
        }
    }

    /**
     * Informacion laboral del empleado
     */
    static async getEmploymentInfo(employeeId, companyId) {
        try {
            const [result] = await sequelize.query(`
                SELECT
                    u.employee_id as legajo,
                    u.hire_date,
                    u.termination_date,
                    u.termination_reason,
                    u.position,
                    u.job_title,
                    d.name as department_name,
                    b.name as branch_name,
                    b.address as branch_address,
                    u.contract_type,
                    u.work_schedule,
                    u.is_active,
                    u.role,

                    -- Turno actual
                    s.name as shift_name,
                    s.start_time as shift_start,
                    s.end_time as shift_end,

                    -- Salario (si existe tabla)
                    (SELECT base_salary FROM user_salary_config_v2
                     WHERE user_id = u.user_id
                     ORDER BY effective_date DESC LIMIT 1) as current_salary,

                    -- Convenio colectivo
                    (SELECT la.name FROM labor_agreements_v2 la
                     JOIN user_labor_agreement ula ON la.id = ula.labor_agreement_id
                     WHERE ula.user_id = u.user_id LIMIT 1) as labor_agreement,

                    -- Categoria
                    (SELECT sc.name FROM salary_categories_v2 sc
                     JOIN user_salary_category usc ON sc.id = usc.salary_category_id
                     WHERE usc.user_id = u.user_id LIMIT 1) as salary_category

                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                LEFT JOIN branches b ON u.branch_id = b.id
                LEFT JOIN user_shift_assignments usa ON u.user_id = usa.user_id AND usa.is_active = TRUE
                LEFT JOIN shifts s ON usa.shift_id = s.id
                WHERE u.user_id = :employeeId
                  AND u.company_id = :companyId
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return result || null;
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo info laboral:', error.message);
            return null;
        }
    }

    /**
     * Historial de asistencia (llegadas tarde, inasistencias)
     */
    static async getAttendanceHistory(employeeId, companyId, options = {}) {
        const months = options.attendanceMonths || 24; // Ultimos 24 meses por defecto

        try {
            // Resumen de asistencia
            const summary = await sequelize.query(`
                SELECT
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as days_present,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as days_absent,
                    COUNT(CASE WHEN status = 'late' THEN 1 END) as days_late,
                    COUNT(CASE WHEN status = 'early_leave' THEN 1 END) as early_leaves,
                    COUNT(CASE WHEN is_justified = FALSE AND status IN ('absent', 'late') THEN 1 END) as unjustified_incidents,
                    SUM(CASE WHEN late_minutes > 0 THEN late_minutes ELSE 0 END) as total_late_minutes,
                    AVG(CASE WHEN late_minutes > 0 THEN late_minutes END) as avg_late_minutes
                FROM attendances
                WHERE user_id = :employeeId
                  AND company_id = :companyId
                  AND date >= NOW() - INTERVAL '${months} months'
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            // Detalle de incidentes (llegadas tarde e inasistencias)
            const incidents = await sequelize.query(`
                SELECT
                    id,
                    date,
                    status,
                    check_in_time,
                    check_out_time,
                    late_minutes,
                    is_justified,
                    justification_reason,
                    justification_document,
                    notes,
                    created_at
                FROM attendances
                WHERE user_id = :employeeId
                  AND company_id = :companyId
                  AND status IN ('absent', 'late', 'early_leave')
                ORDER BY date DESC
                LIMIT 200
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            // Patrones (dias con mas incidentes)
            const patterns = await sequelize.query(`
                SELECT
                    EXTRACT(DOW FROM date) as day_of_week,
                    COUNT(*) as incident_count
                FROM attendances
                WHERE user_id = :employeeId
                  AND company_id = :companyId
                  AND status IN ('absent', 'late')
                  AND date >= NOW() - INTERVAL '${months} months'
                GROUP BY EXTRACT(DOW FROM date)
                ORDER BY incident_count DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                summary: summary[0] || {},
                incidents,
                patterns,
                period_analyzed: `${months} meses`
            };
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo historial asistencia:', error.message);
            return { summary: {}, incidents: [], patterns: [], error: error.message };
        }
    }

    /**
     * Historial disciplinario (sanciones, apercibimientos)
     */
    static async getDisciplinaryHistory(employeeId, companyId) {
        try {
            const sanctions = await sequelize.query(`
                SELECT
                    lc.id,
                    lc.communication_type,
                    lc.subject,
                    lc.content,
                    lc.severity,
                    lc.communication_date,
                    lc.effective_date,
                    lc.expiration_date,
                    lc.status,
                    lc.response,
                    lc.response_date,
                    lc.is_locked,
                    lc.document_url,
                    u_created.name as created_by_name,
                    u_notified.name as notified_by_name
                FROM legal_communications lc
                LEFT JOIN users u_created ON lc.created_by = u_created.user_id
                LEFT JOIN users u_notified ON lc.notified_by = u_notified.user_id
                WHERE lc.employee_id = :employeeId
                  AND lc.company_id = :companyId
                  AND lc.communication_type IN ('warning', 'suspension', 'verbal_warning', 'written_warning')
                ORDER BY lc.communication_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            // Resumen por tipo
            const summary = await sequelize.query(`
                SELECT
                    communication_type,
                    COUNT(*) as count,
                    MAX(communication_date) as last_date
                FROM legal_communications
                WHERE employee_id = :employeeId
                  AND company_id = :companyId
                  AND communication_type IN ('warning', 'suspension', 'verbal_warning', 'written_warning')
                GROUP BY communication_type
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                sanctions,
                summary,
                total_count: sanctions.length
            };
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo historial disciplinario:', error.message);
            return { sanctions: [], summary: [], total_count: 0, error: error.message };
        }
    }

    /**
     * Comunicaciones legales (cartas documento, telegramas, etc.)
     */
    static async getLegalCommunications(employeeId, companyId) {
        try {
            const communications = await sequelize.query(`
                SELECT
                    lc.id,
                    lc.communication_type,
                    lc.subject,
                    lc.content,
                    lc.severity,
                    lc.communication_date,
                    lc.delivery_method,
                    lc.delivery_status,
                    lc.delivery_date,
                    lc.tracking_number,
                    lc.response,
                    lc.response_date,
                    lc.document_url,
                    lc.is_locked,
                    u_created.name as created_by_name
                FROM legal_communications lc
                LEFT JOIN users u_created ON lc.created_by = u_created.user_id
                WHERE lc.employee_id = :employeeId
                  AND lc.company_id = :companyId
                ORDER BY lc.communication_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return communications;
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo comunicaciones legales:', error.message);
            return [];
        }
    }

    /**
     * Historial medico (examenes pre y post ocupacionales)
     */
    static async getMedicalHistory(employeeId, companyId) {
        try {
            // Examenes medicos
            const exams = await sequelize.query(`
                SELECT
                    me.id,
                    me.exam_type,
                    me.exam_date,
                    me.exam_result,
                    me.fitness_status,
                    me.restrictions,
                    me.next_exam_date,
                    me.doctor_name,
                    me.medical_center,
                    me.notes,
                    me.document_url
                FROM medical_exams me
                WHERE me.employee_id = :employeeId
                  AND me.company_id = :companyId
                ORDER BY me.exam_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            // Licencias medicas
            const leaves = await sequelize.query(`
                SELECT
                    ml.id,
                    ml.leave_type,
                    ml.start_date,
                    ml.end_date,
                    ml.diagnosis,
                    ml.is_work_related,
                    ml.doctor_name,
                    ml.certificate_url,
                    ml.status,
                    ml.days_count
                FROM medical_leaves ml
                WHERE ml.employee_id = :employeeId
                  AND ml.company_id = :companyId
                ORDER BY ml.start_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            // Accidentes laborales (ART)
            const accidents = await sequelize.query(`
                SELECT
                    wa.id,
                    wa.accident_date,
                    wa.accident_type,
                    wa.description,
                    wa.body_part_affected,
                    wa.severity,
                    wa.days_off,
                    wa.return_date,
                    wa.art_claim_number,
                    wa.art_status,
                    wa.witnesses
                FROM workplace_accidents wa
                WHERE wa.employee_id = :employeeId
                  AND wa.company_id = :companyId
                ORDER BY wa.accident_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                exams,
                medical_leaves: leaves,
                workplace_accidents: accidents,
                summary: {
                    total_exams: exams.length,
                    total_leaves: leaves.length,
                    total_leave_days: leaves.reduce((sum, l) => sum + (l.days_count || 0), 0),
                    total_accidents: accidents.length
                }
            };
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo historial medico:', error.message);
            return { exams: [], medical_leaves: [], workplace_accidents: [], summary: {}, error: error.message };
        }
    }

    /**
     * Historial de notificaciones enviadas/recibidas
     */
    static async getNotificationsHistory(employeeId, companyId) {
        try {
            const notifications = await sequelize.query(`
                SELECT
                    ng.id as group_id,
                    ng.notification_type,
                    ng.title,
                    ng.source_module,
                    ng.priority,
                    ng.status,
                    ng.created_at,
                    ng.deadline,
                    nm.id as message_id,
                    nm.message_type,
                    nm.content,
                    nm.is_read,
                    nm.read_at,
                    nm.response,
                    nm.response_at
                FROM notification_groups ng
                JOIN notification_messages nm ON ng.id = nm.group_id
                WHERE nm.recipient_id = :employeeId
                  AND ng.company_id = :companyId
                ORDER BY ng.created_at DESC
                LIMIT 100
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            // Resumen
            const summary = await sequelize.query(`
                SELECT
                    ng.notification_type,
                    COUNT(*) as count,
                    COUNT(CASE WHEN nm.is_read = FALSE THEN 1 END) as unread_count
                FROM notification_groups ng
                JOIN notification_messages nm ON ng.id = nm.group_id
                WHERE nm.recipient_id = :employeeId
                  AND ng.company_id = :companyId
                GROUP BY ng.notification_type
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                notifications,
                summary,
                total_count: notifications.length
            };
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo historial notificaciones:', error.message);
            return { notifications: [], summary: [], total_count: 0, error: error.message };
        }
    }

    /**
     * Historial de vacaciones
     */
    static async getVacationHistory(employeeId, companyId) {
        try {
            const requests = await sequelize.query(`
                SELECT
                    vr.id,
                    vr.start_date,
                    vr.end_date,
                    vr.days_requested,
                    vr.vacation_type,
                    vr.status,
                    vr.approved_by,
                    vr.approved_at,
                    vr.rejection_reason,
                    vr.notes,
                    u_approved.name as approved_by_name
                FROM vacation_requests vr
                LEFT JOIN users u_approved ON vr.approved_by = u_approved.user_id
                WHERE vr.user_id = :employeeId
                  AND vr.company_id = :companyId
                ORDER BY vr.start_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            // Saldo actual
            const balance = await sequelize.query(`
                SELECT
                    total_days,
                    used_days,
                    pending_days,
                    available_days,
                    year
                FROM vacation_balances
                WHERE user_id = :employeeId
                  AND company_id = :companyId
                ORDER BY year DESC
                LIMIT 5
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                requests,
                balance,
                summary: {
                    total_requests: requests.length,
                    approved_requests: requests.filter(r => r.status === 'approved').length,
                    rejected_requests: requests.filter(r => r.status === 'rejected').length,
                    total_days_taken: requests
                        .filter(r => r.status === 'approved')
                        .reduce((sum, r) => sum + (r.days_requested || 0), 0)
                }
            };
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo historial vacaciones:', error.message);
            return { requests: [], balance: [], summary: {}, error: error.message };
        }
    }

    /**
     * Historial de nomina/recibos de sueldo
     */
    static async getPayrollHistory(employeeId, companyId, options = {}) {
        const months = options.payrollMonths || 24;

        try {
            const payslips = await sequelize.query(`
                SELECT
                    pr.id,
                    pr.period_month,
                    pr.period_year,
                    pr.gross_salary,
                    pr.net_salary,
                    pr.deductions,
                    pr.additions,
                    pr.payment_date,
                    pr.payment_method,
                    pr.status,
                    pr.payslip_url
                FROM payroll_records pr
                WHERE pr.employee_id = :employeeId
                  AND pr.company_id = :companyId
                  AND pr.created_at >= NOW() - INTERVAL '${months} months'
                ORDER BY pr.period_year DESC, pr.period_month DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            // Historial de cambios salariales
            const salaryChanges = await sequelize.query(`
                SELECT
                    usc.id,
                    usc.base_salary,
                    usc.effective_date,
                    usc.reason,
                    usc.previous_salary,
                    usc.percentage_change
                FROM user_salary_config_v2 usc
                WHERE usc.user_id = :employeeId
                ORDER BY usc.effective_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                payslips,
                salary_changes: salaryChanges,
                summary: {
                    total_payslips: payslips.length,
                    avg_net_salary: payslips.length > 0
                        ? payslips.reduce((sum, p) => sum + parseFloat(p.net_salary || 0), 0) / payslips.length
                        : 0
                }
            };
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo historial nomina:', error.message);
            return { payslips: [], salary_changes: [], summary: {}, error: error.message };
        }
    }

    /**
     * Cambios de posicion/departamento
     */
    static async getPositionChanges(employeeId, companyId) {
        try {
            // Cambios de departamento
            const deptChanges = await sequelize.query(`
                SELECT
                    dh.id,
                    dh.old_department_id,
                    d_old.name as old_department_name,
                    dh.new_department_id,
                    d_new.name as new_department_name,
                    dh.change_date,
                    dh.reason,
                    u_changed.name as changed_by_name
                FROM department_history dh
                LEFT JOIN departments d_old ON dh.old_department_id = d_old.id
                LEFT JOIN departments d_new ON dh.new_department_id = d_new.id
                LEFT JOIN users u_changed ON dh.changed_by = u_changed.user_id
                WHERE dh.user_id = :employeeId
                ORDER BY dh.change_date DESC
            `, {
                replacements: { employeeId },
                type: QueryTypes.SELECT
            });

            // Cambios de posicion/cargo
            const positionChanges = await sequelize.query(`
                SELECT
                    ph.id,
                    ph.old_position,
                    ph.new_position,
                    ph.change_date,
                    ph.reason,
                    ph.is_promotion
                FROM position_history ph
                WHERE ph.user_id = :employeeId
                ORDER BY ph.change_date DESC
            `, {
                replacements: { employeeId },
                type: QueryTypes.SELECT
            });

            return {
                department_changes: deptChanges,
                position_changes: positionChanges
            };
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo cambios de posicion:', error.message);
            return { department_changes: [], position_changes: [], error: error.message };
        }
    }

    /**
     * Historial de capacitaciones
     */
    static async getTrainingHistory(employeeId, companyId) {
        try {
            const trainings = await sequelize.query(`
                SELECT
                    ut.id,
                    t.name as training_name,
                    t.description,
                    ut.start_date,
                    ut.end_date,
                    ut.status,
                    ut.score,
                    ut.certificate_url,
                    ut.is_mandatory
                FROM user_trainings ut
                JOIN trainings t ON ut.training_id = t.id
                WHERE ut.user_id = :employeeId
                  AND ut.company_id = :companyId
                ORDER BY ut.start_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return trainings;
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo historial capacitaciones:', error.message);
            return [];
        }
    }

    /**
     * Documentos del empleado
     */
    static async getDocumentsHistory(employeeId, companyId) {
        try {
            const documents = await sequelize.query(`
                SELECT
                    ud.id,
                    ud.document_type,
                    ud.file_name,
                    ud.file_path,
                    ud.upload_date,
                    ud.expiration_date,
                    ud.is_verified,
                    ud.verified_by,
                    ud.notes
                FROM user_documents ud
                WHERE ud.user_id = :employeeId
                  AND ud.company_id = :companyId
                ORDER BY ud.upload_date DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return documents;
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo documentos:', error.message);
            return [];
        }
    }

    /**
     * Casos legales previos del empleado
     */
    static async getPreviousCases(employeeId, companyId) {
        try {
            const cases = await sequelize.query(`
                SELECT
                    lc.id,
                    lc.case_number,
                    lc.case_type,
                    lc.title,
                    lc.current_stage,
                    lc.resolution_type,
                    lc.resolution_amount,
                    lc.claimed_amount,
                    lc.created_at,
                    lc.closed_at,
                    lc.is_active
                FROM legal_cases lc
                WHERE lc.employee_id = :employeeId
                  AND lc.company_id = :companyId
                ORDER BY lc.created_at DESC
            `, {
                replacements: { employeeId, companyId },
                type: QueryTypes.SELECT
            });

            return cases;
        } catch (error) {
            console.error('[LegalCase360] Error obteniendo casos previos:', error.message);
            return [];
        }
    }

    /**
     * Calcula estadisticas generales
     */
    static calculateStatistics(data) {
        const { attendanceHistory, disciplinaryHistory, vacationHistory, medicalHistory } = data;

        return {
            attendance: {
                absence_rate: attendanceHistory.summary?.days_absent
                    ? (attendanceHistory.summary.days_absent / (attendanceHistory.summary.total_records || 1) * 100).toFixed(2)
                    : 0,
                tardiness_rate: attendanceHistory.summary?.days_late
                    ? (attendanceHistory.summary.days_late / (attendanceHistory.summary.total_records || 1) * 100).toFixed(2)
                    : 0,
                avg_late_minutes: attendanceHistory.summary?.avg_late_minutes || 0
            },
            disciplinary: {
                total_sanctions: disciplinaryHistory.total_count || 0,
                active_sanctions: disciplinaryHistory.sanctions?.filter(s => s.status === 'active').length || 0
            },
            medical: {
                fitness_status: medicalHistory.exams?.[0]?.fitness_status || 'unknown',
                total_leave_days: medicalHistory.summary?.total_leave_days || 0,
                work_accidents: medicalHistory.summary?.total_accidents || 0
            },
            vacations: {
                pending_days: vacationHistory.balance?.[0]?.available_days || 0
            },
            risk_indicators: this.calculateRiskIndicators(data)
        };
    }

    /**
     * Calcula indicadores de riesgo laboral
     */
    static calculateRiskIndicators(data) {
        const indicators = [];

        // Alta tasa de ausentismo
        const absenceRate = data.attendanceHistory.summary?.days_absent
            ? (data.attendanceHistory.summary.days_absent / (data.attendanceHistory.summary.total_records || 1) * 100)
            : 0;
        if (absenceRate > 10) {
            indicators.push({
                type: 'high_absence',
                severity: absenceRate > 20 ? 'high' : 'medium',
                description: `Tasa de ausentismo: ${absenceRate.toFixed(1)}%`
            });
        }

        // Multiples sanciones
        if (data.disciplinaryHistory.total_count > 3) {
            indicators.push({
                type: 'multiple_sanctions',
                severity: data.disciplinaryHistory.total_count > 5 ? 'high' : 'medium',
                description: `${data.disciplinaryHistory.total_count} sanciones disciplinarias registradas`
            });
        }

        // Accidentes laborales
        if (data.medicalHistory.summary?.total_accidents > 0) {
            indicators.push({
                type: 'work_accidents',
                severity: data.medicalHistory.summary.total_accidents > 2 ? 'high' : 'medium',
                description: `${data.medicalHistory.summary.total_accidents} accidentes laborales registrados`
            });
        }

        return indicators;
    }

    /**
     * Genera timeline unificado de todos los eventos
     */
    static generateUnifiedTimeline(data) {
        const events = [];

        // Agregar incidentes de asistencia
        if (data.attendanceHistory?.incidents) {
            data.attendanceHistory.incidents.forEach(inc => {
                events.push({
                    date: inc.date,
                    type: 'attendance',
                    subtype: inc.status,
                    title: inc.status === 'absent' ? 'Inasistencia' : 'Llegada tarde',
                    description: inc.justification_reason || `${inc.late_minutes || 0} minutos tarde`,
                    importance: inc.is_justified ? 'low' : 'medium',
                    source: 'attendances'
                });
            });
        }

        // Agregar sanciones
        if (data.disciplinaryHistory?.sanctions) {
            data.disciplinaryHistory.sanctions.forEach(sanc => {
                events.push({
                    date: sanc.communication_date,
                    type: 'disciplinary',
                    subtype: sanc.communication_type,
                    title: sanc.subject,
                    description: sanc.content?.substring(0, 200),
                    importance: sanc.severity === 'high' ? 'high' : 'medium',
                    source: 'legal_communications'
                });
            });
        }

        // Agregar comunicaciones legales
        if (data.legalCommunications) {
            data.legalCommunications.forEach(comm => {
                if (!['warning', 'suspension', 'verbal_warning', 'written_warning'].includes(comm.communication_type)) {
                    events.push({
                        date: comm.communication_date,
                        type: 'legal_communication',
                        subtype: comm.communication_type,
                        title: comm.subject,
                        description: comm.content?.substring(0, 200),
                        importance: 'high',
                        source: 'legal_communications'
                    });
                }
            });
        }

        // Agregar licencias medicas
        if (data.medicalHistory?.medical_leaves) {
            data.medicalHistory.medical_leaves.forEach(leave => {
                events.push({
                    date: leave.start_date,
                    type: 'medical',
                    subtype: 'leave',
                    title: `Licencia medica: ${leave.leave_type}`,
                    description: leave.diagnosis,
                    importance: leave.is_work_related ? 'high' : 'medium',
                    source: 'medical_leaves'
                });
            });
        }

        // Agregar cambios de posicion
        if (data.positionChanges?.position_changes) {
            data.positionChanges.position_changes.forEach(change => {
                events.push({
                    date: change.change_date,
                    type: 'position',
                    subtype: change.is_promotion ? 'promotion' : 'transfer',
                    title: `${change.old_position} -> ${change.new_position}`,
                    description: change.reason,
                    importance: 'medium',
                    source: 'position_history'
                });
            });
        }

        // Ordenar por fecha descendente
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        return events.slice(0, 100); // Limitar a 100 eventos
    }

    /**
     * Obtiene secciones disponibles
     */
    static getSectionsAvailable(data) {
        return {
            personal: !!data.personalInfo,
            employment: !!data.employmentInfo,
            attendance: data.attendanceHistory?.incidents?.length > 0,
            disciplinary: data.disciplinaryHistory?.sanctions?.length > 0,
            legal_communications: data.legalCommunications?.length > 0,
            medical: data.medicalHistory?.exams?.length > 0 || data.medicalHistory?.medical_leaves?.length > 0,
            notifications: data.notificationsHistory?.notifications?.length > 0,
            vacations: data.vacationHistory?.requests?.length > 0,
            payroll: data.payrollHistory?.payslips?.length > 0,
            position_changes: data.positionChanges?.position_changes?.length > 0 || data.positionChanges?.department_changes?.length > 0,
            training: data.trainingHistory?.length > 0,
            documents: data.documentsHistory?.length > 0,
            previous_cases: data.previousCases?.length > 0
        };
    }
}

module.exports = LegalCase360Service;
