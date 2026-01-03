/**
 * ========================================================================
 * RUTAS API: ART Incidents Management
 * ========================================================================
 * Endpoints REST para gestión de incidentes/accidentes laborales ART
 *
 * Base path: /api/art/incidents
 *
 * Autenticación: Requiere JWT token
 * Roles permitidos: admin, manager, hr, employee (limitado)
 * ========================================================================
 */

const express = require('express');
const router = express.Router();

module.exports = (database, notificationService) => {
    const ArtIncidentService = require('./ArtIncidentService');
    const incidentService = new ArtIncidentService(database, notificationService);

    /**
     * POST /api/art/incidents
     * Crear nuevo incidente
     *
     * Body:
     * {
     *   company_id: number,
     *   employee_id: number,
     *   reported_by: number,
     *   incident_type: 'accident' | 'in_itinere' | ...,
     *   severity: 'fatal' | 'serious' | 'moderate' | 'minor' | 'no_injury',
     *   incident_date: Date,
     *   location: string,
     *   description: string,
     *   injury_type?: string,
     *   body_part_affected?: string,
     *   days_off_work?: number,
     *   medical_attention_required?: boolean
     * }
     */
    router.post('/', async (req, res) => {
        try {
            const userId = req.user?.user_id || req.user?.id;

            // Solo admin, manager, o HR pueden crear incidentes
            const isAuthorized = ['admin', 'manager', 'hr'].includes(req.user?.role);

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para crear incidentes'
                });
            }

            const incidentData = {
                ...req.body,
                reported_by: userId
            };

            const incident = await incidentService.createIncident(incidentData);

            res.status(201).json({
                success: true,
                message: 'Incidente creado exitosamente',
                data: incident
            });

        } catch (error) {
            console.error('❌ [API-ART] Error creando incidente:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error creando incidente',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * GET /api/art/incidents/:id
     * Obtener incidente por ID
     */
    router.get('/:id', async (req, res) => {
        try {
            const incidentId = req.params.id;
            const userId = req.user?.user_id || req.user?.id;

            const incident = await incidentService.getIncidentById(incidentId);

            if (!incident) {
                return res.status(404).json({
                    success: false,
                    message: 'Incidente no encontrado'
                });
            }

            // Verificar permisos (admin, HR, manager, empleado afectado, investigador)
            const isAdmin = req.user?.role === 'admin';
            const isHr = req.user?.role === 'hr';
            const isManager = req.user?.role === 'manager';
            const isEmployee = incident.employee_id === parseInt(userId);
            const isInvestigator = incident.investigation_assigned_to === parseInt(userId);

            if (!isAdmin && !isHr && !isManager && !isEmployee && !isInvestigator) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para ver este incidente'
                });
            }

            res.json({
                success: true,
                data: incident
            });

        } catch (error) {
            console.error('❌ [API-ART] Error obteniendo incidente:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo incidente',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * GET /api/art/incidents/company/:companyId
     * Obtener incidentes de una empresa
     */
    router.get('/company/:companyId', async (req, res) => {
        try {
            const companyId = req.params.companyId;

            // Solo admin, manager, HR de la empresa pueden ver
            const isAuthorized = ['admin', 'manager', 'hr'].includes(req.user?.role);

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para ver incidentes de la empresa'
                });
            }

            const filters = {
                status: req.query.status,
                severity: req.query.severity,
                incident_type: req.query.incident_type,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                limit: req.query.limit ? parseInt(req.query.limit) : 100
            };

            const incidents = await incidentService.getCompanyIncidents(companyId, filters);

            res.json({
                success: true,
                count: incidents.length,
                data: incidents
            });

        } catch (error) {
            console.error('❌ [API-ART] Error obteniendo incidentes:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo incidentes',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * GET /api/art/incidents/employee/:employeeId
     * Obtener incidentes de un empleado
     */
    router.get('/employee/:employeeId', async (req, res) => {
        try {
            const employeeId = req.params.employeeId;
            const userId = req.user?.user_id || req.user?.id;

            // Verificar permisos (admin, HR, manager, o el empleado mismo)
            const isAdmin = req.user?.role === 'admin';
            const isHr = req.user?.role === 'hr';
            const isManager = req.user?.role === 'manager';
            const isOwner = parseInt(employeeId) === parseInt(userId);

            if (!isAdmin && !isHr && !isManager && !isOwner) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para ver estos incidentes'
                });
            }

            const incidents = await incidentService.getEmployeeIncidents(employeeId);

            res.json({
                success: true,
                count: incidents.length,
                data: incidents
            });

        } catch (error) {
            console.error('❌ [API-ART] Error obteniendo incidentes del empleado:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo incidentes',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * PUT /api/art/incidents/:id
     * Actualizar incidente
     */
    router.put('/:id', async (req, res) => {
        try {
            const incidentId = req.params.id;

            // Solo admin, manager, HR pueden actualizar
            const isAuthorized = ['admin', 'manager', 'hr'].includes(req.user?.role);

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para actualizar incidentes'
                });
            }

            const incident = await incidentService.updateIncident(incidentId, req.body);

            res.json({
                success: true,
                message: 'Incidente actualizado exitosamente',
                data: incident
            });

        } catch (error) {
            console.error('❌ [API-ART] Error actualizando incidente:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error actualizando incidente',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * POST /api/art/incidents/:id/notify-art
     * Notificar incidente a la ART
     */
    router.post('/:id/notify-art', async (req, res) => {
        try {
            const incidentId = req.params.id;

            // Solo admin, manager, HR pueden notificar ART
            const isAuthorized = ['admin', 'manager', 'hr'].includes(req.user?.role);

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para notificar a la ART'
                });
            }

            const incident = await incidentService.notifyArt(incidentId);

            res.json({
                success: true,
                message: 'Incidente notificado a la ART',
                data: incident
            });

        } catch (error) {
            console.error('❌ [API-ART] Error notificando a ART:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error notificando a ART',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * POST /api/art/incidents/:id/notify-srt
     * Notificar incidente GRAVE a la SRT
     */
    router.post('/:id/notify-srt', async (req, res) => {
        try {
            const incidentId = req.params.id;

            // Solo admin puede notificar SRT (casos graves)
            if (req.user?.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Solo administradores pueden notificar a la SRT'
                });
            }

            const incident = await incidentService.notifySrt(incidentId);

            res.json({
                success: true,
                message: 'Incidente GRAVE notificado a la SRT',
                data: incident
            });

        } catch (error) {
            console.error('❌ [API-ART] Error notificando a SRT:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error notificando a SRT',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * POST /api/art/incidents/:id/assign-investigator
     * Asignar investigador
     *
     * Body:
     * {
     *   investigator_id: number
     * }
     */
    router.post('/:id/assign-investigator', async (req, res) => {
        try {
            const incidentId = req.params.id;
            const { investigator_id } = req.body;

            // Solo admin, manager, HR pueden asignar investigador
            const isAuthorized = ['admin', 'manager', 'hr'].includes(req.user?.role);

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para asignar investigador'
                });
            }

            if (!investigator_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere investigator_id'
                });
            }

            const incident = await incidentService.assignInvestigator(incidentId, investigator_id);

            res.json({
                success: true,
                message: 'Investigador asignado exitosamente',
                data: incident
            });

        } catch (error) {
            console.error('❌ [API-ART] Error asignando investigador:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error asignando investigador',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * POST /api/art/incidents/:id/complete-investigation
     * Completar investigación
     *
     * Body:
     * {
     *   findings: string,
     *   root_cause: string,
     *   corrective_actions: array,
     *   preventive_actions: array
     * }
     */
    router.post('/:id/complete-investigation', async (req, res) => {
        try {
            const incidentId = req.params.id;
            const userId = req.user?.user_id || req.user?.id;

            // Verificar que sea el investigador asignado o admin
            const incident = await incidentService.getIncidentById(incidentId);

            if (!incident) {
                return res.status(404).json({
                    success: false,
                    message: 'Incidente no encontrado'
                });
            }

            const isInvestigator = incident.investigation_assigned_to === parseInt(userId);
            const isAdmin = req.user?.role === 'admin';

            if (!isInvestigator && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo el investigador asignado puede completar la investigación'
                });
            }

            const updatedIncident = await incidentService.completeInvestigation(incidentId, req.body);

            res.json({
                success: true,
                message: 'Investigación completada exitosamente',
                data: updatedIncident
            });

        } catch (error) {
            console.error('❌ [API-ART] Error completando investigación:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error completando investigación',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * POST /api/art/incidents/:id/close
     * Cerrar incidente
     *
     * Body:
     * {
     *   notes: string
     * }
     */
    router.post('/:id/close', async (req, res) => {
        try {
            const incidentId = req.params.id;
            const userId = req.user?.user_id || req.user?.id;
            const { notes } = req.body;

            // Solo admin, manager, HR pueden cerrar
            const isAuthorized = ['admin', 'manager', 'hr'].includes(req.user?.role);

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para cerrar incidentes'
                });
            }

            const incident = await incidentService.closeIncident(incidentId, userId, notes);

            res.json({
                success: true,
                message: 'Incidente cerrado exitosamente',
                data: incident
            });

        } catch (error) {
            console.error('❌ [API-ART] Error cerrando incidente:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error cerrando incidente',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * GET /api/art/incidents/stats/:companyId
     * Obtener estadísticas de incidentes por empresa
     */
    router.get('/stats/:companyId', async (req, res) => {
        try {
            const companyId = req.params.companyId;

            // Solo admin, manager, HR pueden ver stats
            const isAuthorized = ['admin', 'manager', 'hr'].includes(req.user?.role);

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para ver estadísticas'
                });
            }

            const stats = await incidentService.getCompanyStats(companyId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('❌ [API-ART] Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    return router;
};
