/**
 * ========================================================================
 * MÓDULO: ART Incidents Management
 * ========================================================================
 * Entry point del módulo de gestión de incidentes/accidentes laborales ART
 *
 * Auto-registro en ModuleRegistry
 * Configuración de event listeners
 * Integración con SSOT (NotificationEnterpriseService, EventBus)
 *
 * Normativa: Ley 24.557 - Riesgos del Trabajo (Argentina)
 * Autoridad: SRT (Superintendencia de Riesgos del Trabajo)
 *
 * @version 1.0.0
 * ========================================================================
 */

const ArtIncidentService = require('./ArtIncidentService');
const routes = require('./routes');

module.exports = {
    /**
     * Inicializar módulo
     */
    init(database, notificationService, app) {
        try {
            console.log('🚨 [ART-INCIDENTS MODULE] Inicializando módulo...');

            // 1. Crear instancia del servicio
            const incidentService = new ArtIncidentService(database, notificationService);

            // 2. Registrar rutas
            const incidentRoutes = routes(database, notificationService);
            app.use('/api/art/incidents', incidentRoutes);

            console.log('✅ [ART-INCIDENTS MODULE] Rutas configuradas: /api/art/incidents/*');

            // 3. Configurar event listeners (si existe EventBus)
            if (global.EventBus) {
                this.setupEventListeners(incidentService, database);
            }

            // 4. Auto-registro en ModuleRegistry (si existe)
            if (global.ModuleRegistry) {
                this.registerInModuleRegistry(incidentService);
            }

            console.log('✅ [ART-INCIDENTS MODULE] Módulo inicializado correctamente');

            return incidentService;

        } catch (error) {
            console.error('❌ [ART-INCIDENTS MODULE] Error inicializando módulo:', error);
            throw error;
        }
    },

    /**
     * Configurar event listeners
     */
    setupEventListeners(incidentService, database) {
        try {
            // Escuchar evento de ficha médica grave
            // Si se crea una ficha médica con diagnóstico grave, verificar si hay incidente
            global.EventBus.on('medical:record:created', async (data) => {
                try {
                    if (data.severity === 'critical' || data.requires_hospitalization) {
                        console.log('📢 [ART-INCIDENTS] Ficha médica grave detectada, verificando incidente...');

                        // Buscar si ya existe un incidente para este empleado en las últimas 24 horas
                        const recentIncident = await database.ArtIncident.findOne({
                            where: {
                                employee_id: data.employee_id,
                                company_id: data.company_id,
                                incident_date: {
                                    [database.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
                                }
                            },
                            order: [['incident_date', 'DESC']]
                        });

                        if (!recentIncident) {
                            console.log('⚠️ [ART-INCIDENTS] Ficha médica grave sin incidente asociado - considerar crear uno');
                        } else {
                            // Asociar ficha médica al incidente
                            await recentIncident.update({
                                medical_record_id: data.medical_record_id
                            });
                            console.log(`✅ [ART-INCIDENTS] Ficha médica asociada al incidente ${recentIncident.incident_number}`);
                        }
                    }
                } catch (error) {
                    console.error('❌ [ART-INCIDENTS] Error procesando ficha médica:', error);
                }
            });

            // Escuchar evento de empleado inactivado
            // Si un empleado se inactiva, verificar si tiene incidentes abiertos
            global.EventBus.on('employee:deactivated', async (data) => {
                try {
                    const openIncidents = await database.ArtIncident.findAll({
                        where: {
                            employee_id: data.employee_id,
                            status: {
                                [database.Sequelize.Op.notIn]: ['closed', 'resolved']
                            }
                        }
                    });

                    if (openIncidents.length > 0) {
                        console.log(`⚠️ [ART-INCIDENTS] Empleado ${data.employee_id} tiene ${openIncidents.length} incidentes abiertos`);
                    }
                } catch (error) {
                    console.error('❌ [ART-INCIDENTS] Error verificando incidentes:', error);
                }
            });

            // Escuchar evento de investigación completada
            // Para generar reporte automático
            global.EventBus.on('art:incident:investigation_completed', async (data) => {
                try {
                    console.log(`📊 [ART-INCIDENTS] Investigación completada para ${data.incident_number}`);
                    // Aquí se puede generar un reporte PDF automático
                    // TODO: Implementar generación de reporte
                } catch (error) {
                    console.error('❌ [ART-INCIDENTS] Error procesando investigación:', error);
                }
            });

            console.log('✅ [ART-INCIDENTS] Event listeners configurados');

        } catch (error) {
            console.error('❌ [ART-INCIDENTS] Error configurando event listeners:', error);
        }
    },

    /**
     * Auto-registro en ModuleRegistry
     */
    registerInModuleRegistry(incidentService) {
        try {
            global.ModuleRegistry.register('art-incidents', {
                name: 'ART Incidents Management',
                version: '1.0.0',
                type: 'core', // Core para Argentina, optional para otros países
                category: 'safety',
                description: 'Gestión de incidentes y accidentes laborales para ART (Argentina)',

                // Dependencias
                dependencies: {
                    required: ['users', 'companies'],
                    optional: ['medical-dashboard', 'notifications-enterprise']
                },

                // Servicios que provee
                provides: [
                    'incident_management',
                    'art_notification',
                    'srt_notification',
                    'investigation_workflow',
                    'incident_statistics'
                ],

                // Plan requerido
                plan: 'basic', // Disponible en plan básico (requerido por ley en Argentina)

                // Servicio
                service: incidentService,

                // Rutas
                routes: '/api/art/incidents',

                // Modelos
                models: ['ArtIncident', 'ARTConfiguration'],

                // Normativa Argentina
                regulations: {
                    'AR': 'Ley 24.557 - Riesgos del Trabajo',
                    'authority': 'SRT (Superintendencia de Riesgos del Trabajo)'
                },

                // Feature flags
                features: {
                    incident_registration: true,
                    art_notification: true,
                    srt_notification: true,
                    investigation_workflow: true,
                    root_cause_analysis: true,
                    corrective_actions: true,
                    preventive_actions: true,
                    cost_tracking: true,
                    statistics: true,
                    reporting: true
                },

                // Tipos de incidentes soportados
                incident_types: [
                    'accident',              // Accidente de trabajo
                    'in_itinere',            // Accidente in itinere
                    'occupational_disease',  // Enfermedad profesional
                    'near_miss',             // Casi accidente
                    'unsafe_condition',      // Condición insegura
                    'unsafe_act'             // Acto inseguro
                ],

                // Niveles de severidad
                severity_levels: [
                    'fatal',       // Fatal
                    'serious',     // Grave (hospitalización)
                    'moderate',    // Moderado (atención médica)
                    'minor',       // Leve (primeros auxilios)
                    'no_injury'    // Sin lesión
                ],

                // Workflow states
                workflow_states: [
                    'draft',           // Borrador
                    'reported',        // Reportado
                    'under_review',    // En revisión
                    'art_pending',     // Pendiente respuesta ART
                    'in_treatment',    // En tratamiento
                    'resolved',        // Resuelto
                    'closed'           // Cerrado
                ],

                // Metadata
                metadata: {
                    icon: '🚨',
                    color: '#ff4444',
                    enabled: true,
                    visible_in_marketplace: true,
                    country_specific: 'AR',
                    legal_requirement: true
                },

                // KPIs
                kpis: [
                    'total_incidents',
                    'fatal_incidents',
                    'serious_incidents',
                    'incidents_this_month',
                    'incidents_this_year',
                    'total_days_off_work',
                    'total_cost',
                    'avg_investigation_time'
                ]
            });

            console.log('✅ [ART-INCIDENTS] Módulo registrado en ModuleRegistry');

        } catch (error) {
            console.error('❌ [ART-INCIDENTS] Error registrando en ModuleRegistry:', error);
        }
    }
};
