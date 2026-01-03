/**
 * ========================================================================
 * SERVICIO: ART Incident Management
 * ========================================================================
 * Servicio para gestión de incidentes/accidentes laborales que deben
 * reportarse a la ART (Aseguradora de Riesgos del Trabajo) en Argentina
 *
 * Normativa: Ley 24.557 - Riesgos del Trabajo
 * Autoridad: SRT (Superintendencia de Riesgos del Trabajo)
 *
 * Features:
 * - Registro de incidentes (accidentes, in itinere, enfermedades profesionales)
 * - Auto-notificación a ART según severidad
 * - Workflow de investigación
 * - Integración con ficha médica
 * - Generación de reportes para SRT
 * - Estadísticas y KPIs
 *
 * @version 1.0.0
 * ========================================================================
 */

const { Op } = require('sequelize');

class ArtIncidentService {
    constructor(database, notificationService) {
        this.database = database;
        this.sequelize = database.sequelize;
        this.notificationService = notificationService;
        this.ArtIncident = database.ArtIncident;
        this.User = database.User;
        this.Company = database.Company;
        this.MedicalRecord = database.MedicalRecord;
        this.ARTConfiguration = database.ARTConfiguration;
    }

    // ====================================================================
    // CRUD OPERATIONS
    // ====================================================================

    /**
     * Crear nuevo incidente
     */
    async createIncident(data) {
        try {
            // 1. Validar datos requeridos
            this.validateIncidentData(data);

            // 2. Generar número de incidente
            const incidentNumber = await this.generateIncidentNumber(data.company_id);

            // 3. Auto-determinar si requiere notificación ART/SRT según severidad
            const requiresArtNotification = this.shouldNotifyArt(data);
            const requiresSrtNotification = this.shouldNotifySrt(data);

            // 4. Crear incidente
            const incident = await this.ArtIncident.create({
                ...data,
                incident_number: incidentNumber,
                requires_art_notification: requiresArtNotification,
                requires_srt_notification: requiresSrtNotification,
                status: 'reported',
                investigation_status: 'pending'
            });

            console.log(`✅ [ART-INCIDENT] Incidente creado: ${incidentNumber}`);

            // 5. Emitir evento
            this.emitEvent('art:incident:created', {
                incident_id: incident.id,
                incident_number: incidentNumber,
                employee_id: incident.employee_id,
                company_id: incident.company_id,
                severity: incident.severity,
                incident_type: incident.incident_type
            });

            // 6. Enviar notificaciones
            await this.notifyIncidentCreated(incident);

            // 7. Auto-notificar a ART si es necesario
            if (requiresArtNotification && data.severity in ['serious', 'fatal']) {
                await this.notifyArt(incident.id);
            }

            return incident;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error creando incidente:', error);
            throw error;
        }
    }

    /**
     * Obtener incidente por ID
     */
    async getIncidentById(incidentId) {
        try {
            const incident = await this.ArtIncident.findByPk(incidentId, {
                include: [
                    {
                        model: this.User,
                        as: 'employee',
                        attributes: ['user_id', 'firstName', 'lastName', 'email']
                    },
                    {
                        model: this.User,
                        as: 'reporter',
                        attributes: ['user_id', 'firstName', 'lastName', 'email']
                    },
                    {
                        model: this.User,
                        as: 'investigator',
                        attributes: ['user_id', 'firstName', 'lastName', 'email']
                    },
                    {
                        model: this.Company,
                        as: 'company',
                        attributes: ['id', 'name']
                    },
                    {
                        model: this.MedicalRecord,
                        as: 'medical_record',
                        required: false
                    }
                ]
            });

            return incident;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error obteniendo incidente:', error);
            throw error;
        }
    }

    /**
     * Obtener incidentes de una empresa
     */
    async getCompanyIncidents(companyId, filters = {}) {
        try {
            const where = {
                company_id: companyId
            };

            // Filtros opcionales
            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.severity) {
                where.severity = filters.severity;
            }

            if (filters.incident_type) {
                where.incident_type = filters.incident_type;
            }

            if (filters.date_from) {
                where.incident_date = {
                    [Op.gte]: new Date(filters.date_from)
                };
            }

            if (filters.date_to) {
                where.incident_date = {
                    ...where.incident_date,
                    [Op.lte]: new Date(filters.date_to)
                };
            }

            const incidents = await this.ArtIncident.findAll({
                where,
                include: [
                    {
                        model: this.User,
                        as: 'employee',
                        attributes: ['user_id', 'firstName', 'lastName']
                    },
                    {
                        model: this.User,
                        as: 'reporter',
                        attributes: ['user_id', 'firstName', 'lastName']
                    }
                ],
                order: [['incident_date', 'DESC']],
                limit: filters.limit || 100
            });

            return incidents;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error obteniendo incidentes:', error);
            throw error;
        }
    }

    /**
     * Obtener incidentes de un empleado
     */
    async getEmployeeIncidents(employeeId) {
        try {
            const incidents = await this.ArtIncident.findAll({
                where: {
                    employee_id: employeeId
                },
                include: [
                    {
                        model: this.Company,
                        as: 'company',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['incident_date', 'DESC']]
            });

            return incidents;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error obteniendo incidentes del empleado:', error);
            throw error;
        }
    }

    /**
     * Actualizar incidente
     */
    async updateIncident(incidentId, data) {
        try {
            const incident = await this.ArtIncident.findByPk(incidentId);

            if (!incident) {
                throw new Error('Incidente no encontrado');
            }

            // No permitir editar si está cerrado
            if (incident.status === 'closed') {
                throw new Error('No se puede editar un incidente cerrado');
            }

            await incident.update(data);

            console.log(`✅ [ART-INCIDENT] Incidente actualizado: ${incident.incident_number}`);

            // Emitir evento
            this.emitEvent('art:incident:updated', {
                incident_id: incident.id,
                incident_number: incident.incident_number
            });

            return incident;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error actualizando incidente:', error);
            throw error;
        }
    }

    // ====================================================================
    // NOTIFICACIONES A ART/SRT
    // ====================================================================

    /**
     * Notificar a la ART
     */
    async notifyArt(incidentId) {
        try {
            const incident = await this.getIncidentById(incidentId);

            if (!incident) {
                throw new Error('Incidente no encontrado');
            }

            if (incident.art_notified) {
                throw new Error('El incidente ya fue notificado a la ART');
            }

            // Obtener configuración de la ART de la empresa
            const artConfig = await this.ARTConfiguration.findOne({
                where: {
                    companyId: incident.company_id,
                    isActive: true
                }
            });

            if (!artConfig) {
                throw new Error('No hay configuración de ART para esta empresa');
            }

            // TODO: Integración real con sistema de la ART
            // Por ahora solo marcar como notificado
            await incident.update({
                art_notified: true,
                art_notification_date: new Date(),
                status: 'art_pending'
            });

            console.log(`📨 [ART-INCIDENT] Incidente ${incident.incident_number} notificado a ART`);

            // Emitir evento
            this.emitEvent('art:incident:art_notified', {
                incident_id: incident.id,
                incident_number: incident.incident_number,
                art_name: artConfig.artName
            });

            // Enviar notificación interna
            await this.notificationService.createNotification({
                companyId: incident.company_id.toString(),
                fromModule: 'art',
                toUserId: incident.reported_by,
                notificationType: 'system_alert',
                title: `🚨 Incidente Notificado a ART`,
                message: `El incidente ${incident.incident_number} fue notificado a ${artConfig.artName}`,
                priority: 'high',
                channels: ['internal', 'email'],
                metadata: {
                    type: 'art_notification',
                    incident_id: incident.id,
                    incident_number: incident.incident_number,
                    art_name: artConfig.artName
                }
            });

            return incident;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error notificando a ART:', error);
            throw error;
        }
    }

    /**
     * Notificar a la SRT (casos graves/fatales)
     */
    async notifySrt(incidentId) {
        try {
            const incident = await this.getIncidentById(incidentId);

            if (!incident) {
                throw new Error('Incidente no encontrado');
            }

            if (incident.srt_notified) {
                throw new Error('El incidente ya fue notificado a la SRT');
            }

            if (incident.severity !== 'fatal' && incident.severity !== 'serious') {
                throw new Error('Solo incidentes graves o fatales requieren notificación a SRT');
            }

            // TODO: Integración real con sistema SRT
            // Por ahora solo marcar como notificado
            await incident.update({
                srt_notified: true,
                srt_notification_date: new Date()
            });

            console.log(`🚨 [ART-INCIDENT] Incidente GRAVE ${incident.incident_number} notificado a SRT`);

            // Emitir evento
            this.emitEvent('art:incident:srt_notified', {
                incident_id: incident.id,
                incident_number: incident.incident_number,
                severity: incident.severity
            });

            return incident;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error notificando a SRT:', error);
            throw error;
        }
    }

    // ====================================================================
    // INVESTIGACIÓN
    // ====================================================================

    /**
     * Asignar investigador
     */
    async assignInvestigator(incidentId, investigatorId) {
        try {
            const incident = await this.ArtIncident.findByPk(incidentId);

            if (!incident) {
                throw new Error('Incidente no encontrado');
            }

            await incident.update({
                investigation_assigned_to: investigatorId,
                investigation_status: 'in_progress',
                status: 'under_review'
            });

            console.log(`✅ [ART-INCIDENT] Investigador asignado al incidente ${incident.incident_number}`);

            // Emitir evento
            this.emitEvent('art:incident:investigator_assigned', {
                incident_id: incident.id,
                investigator_id: investigatorId
            });

            return incident;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error asignando investigador:', error);
            throw error;
        }
    }

    /**
     * Completar investigación
     */
    async completeInvestigation(incidentId, data) {
        try {
            const incident = await this.ArtIncident.findByPk(incidentId);

            if (!incident) {
                throw new Error('Incidente no encontrado');
            }

            await incident.update({
                investigation_status: 'completed',
                investigation_findings: data.findings,
                root_cause: data.root_cause,
                corrective_actions: data.corrective_actions || [],
                preventive_actions: data.preventive_actions || [],
                status: 'resolved'
            });

            console.log(`✅ [ART-INCIDENT] Investigación completada: ${incident.incident_number}`);

            // Emitir evento
            this.emitEvent('art:incident:investigation_completed', {
                incident_id: incident.id,
                incident_number: incident.incident_number
            });

            return incident;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error completando investigación:', error);
            throw error;
        }
    }

    /**
     * Cerrar incidente
     */
    async closeIncident(incidentId, closedBy, notes) {
        try {
            const incident = await this.ArtIncident.findByPk(incidentId);

            if (!incident) {
                throw new Error('Incidente no encontrado');
            }

            if (incident.investigation_status !== 'completed') {
                throw new Error('No se puede cerrar un incidente sin investigación completada');
            }

            await incident.update({
                status: 'closed',
                closed_date: new Date(),
                closed_by: closedBy,
                notes: notes,
                investigation_status: 'closed'
            });

            console.log(`✅ [ART-INCIDENT] Incidente cerrado: ${incident.incident_number}`);

            // Emitir evento
            this.emitEvent('art:incident:closed', {
                incident_id: incident.id,
                incident_number: incident.incident_number,
                closed_by: closedBy
            });

            return incident;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error cerrando incidente:', error);
            throw error;
        }
    }

    // ====================================================================
    // ESTADÍSTICAS
    // ====================================================================

    /**
     * Obtener estadísticas de incidentes por empresa
     */
    async getCompanyStats(companyId) {
        try {
            const [stats] = await this.sequelize.query(`
                SELECT * FROM get_art_incident_stats(:companyId)
            `, {
                replacements: { companyId }
            });

            return stats[0] || {
                total_incidents: 0,
                fatal_incidents: 0,
                serious_incidents: 0,
                moderate_incidents: 0,
                total_days_off_work: 0,
                total_cost: 0,
                avg_investigation_time_days: 0,
                incidents_this_month: 0,
                incidents_this_year: 0
            };

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    /**
     * Validar datos de incidente
     */
    validateIncidentData(data) {
        const required = [
            'company_id',
            'employee_id',
            'reported_by',
            'incident_type',
            'severity',
            'incident_date',
            'location',
            'description'
        ];

        for (const field of required) {
            if (!data[field]) {
                throw new Error(`Campo requerido: ${field}`);
            }
        }

        // Validar tipos
        const validIncidentTypes = [
            'accident',
            'in_itinere',
            'occupational_disease',
            'near_miss',
            'unsafe_condition',
            'unsafe_act'
        ];

        if (!validIncidentTypes.includes(data.incident_type)) {
            throw new Error(`Tipo de incidente inválido: ${data.incident_type}`);
        }

        const validSeverities = ['fatal', 'serious', 'moderate', 'minor', 'no_injury'];

        if (!validSeverities.includes(data.severity)) {
            throw new Error(`Severidad inválida: ${data.severity}`);
        }
    }

    /**
     * Generar número de incidente
     */
    async generateIncidentNumber(companyId) {
        try {
            const [result] = await this.sequelize.query(`
                SELECT generate_art_incident_number(:companyId) AS incident_number
            `, {
                replacements: { companyId }
            });

            return result[0].incident_number;

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error generando número:', error);
            throw error;
        }
    }

    /**
     * Determinar si debe notificar a ART
     */
    shouldNotifyArt(data) {
        // Notificar si:
        // 1. Es accidente o in itinere
        // 2. Severidad moderada o superior
        // 3. Requiere más de 3 días de baja
        // 4. Requiere hospitalización

        if (data.severity === 'serious' || data.severity === 'fatal') {
            return true;
        }

        if (data.incident_type === 'accident' || data.incident_type === 'in_itinere') {
            if (data.severity === 'moderate') {
                return true;
            }
        }

        if (data.days_off_work && data.days_off_work > 3) {
            return true;
        }

        if (data.hospitalization_required) {
            return true;
        }

        return false;
    }

    /**
     * Determinar si debe notificar a SRT
     */
    shouldNotifySrt(data) {
        // Notificar a SRT solo si es fatal
        return data.severity === 'fatal';
    }

    /**
     * Enviar notificación de incidente creado
     */
    async notifyIncidentCreated(incident) {
        try {
            // Notificar al empleado afectado
            await this.notificationService.createNotification({
                companyId: incident.company_id.toString(),
                fromModule: 'art',
                toUserId: incident.employee_id,
                notificationType: 'system_alert',
                title: '🚨 Incidente Laboral Registrado',
                message: `Se ha registrado un incidente ${incident.incident_type} con severidad ${incident.severity}`,
                priority: incident.severity === 'fatal' || incident.severity === 'serious' ? 'urgent' : 'high',
                channels: ['internal'],
                metadata: {
                    type: 'incident_created',
                    incident_id: incident.id,
                    incident_number: incident.incident_number,
                    incident_type: incident.incident_type,
                    severity: incident.severity
                }
            });

        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error enviando notificación:', error);
        }
    }

    /**
     * Emitir evento
     */
    emitEvent(eventName, data) {
        try {
            if (global.EventBus) {
                global.EventBus.emitWithMetadata(eventName, data);
            }
        } catch (error) {
            console.error('❌ [ART-INCIDENT] Error emitiendo evento:', error);
        }
    }
}

module.exports = ArtIncidentService;
