/**
 * ============================================================================
 * PROCESS CHAIN GENERATOR - Generación Inteligente de Cadenas de Procesos
 * ============================================================================
 *
 * Genera cadenas de procesos DINÁMICAS basándose en:
 * - Estado actual del usuario (validation context)
 * - Módulos disponibles en la empresa
 * - Organigrama como SSOT (Single Source of Truth)
 * - Conocimiento acumulado del sistema (Brain + UX Discoveries)
 *
 * Capacidades:
 * - Generar pasos necesarios para lograr un objetivo
 * - Detectar prerequisitos faltantes y proponer cómo completarlos
 * - Ofrecer rutas alternativas si falta un módulo
 * - Calcular routing automático por cadena de mando
 *
 * Esto permite que el sistema guíe al usuario COMPLETO y CORRECTAMENTE,
 * reemplazando la necesidad de soporte humano en 80%+ de casos.
 *
 * @version 1.0.0
 * @date 2025-12-10
 * ============================================================================
 */

const { QueryTypes } = require('sequelize');
const ContextValidatorService = require('./ContextValidatorService');
const path = require('path');
const fs = require('fs');

class ProcessChainGenerator {
    constructor(sequelize, brainService = null) {
        this.db = sequelize;
        this.validator = new ContextValidatorService(sequelize, brainService);
        this.brain = brainService;

        // 🔥 CARGAR DEFINICIONES DINÁMICAMENTE DESDE JSON (108 PROCESOS)
        this.processDefinitions = this.loadProcessDefinitions();

        console.log(`🔗 [PROCESS CHAIN] Cargadas ${Object.keys(this.processDefinitions).length} definiciones de procesos`);

        if (this.brain) {
            console.log('🧠 [PROCESS CHAIN] Integrado con EcosystemBrainService');
        }
    }

    /**
     * Carga las definiciones de procesos desde JSON
     * 🔥 INTEGRACIÓN REAL - No hardcoding
     */
    loadProcessDefinitions() {
        try {
            const jsonPath = path.join(__dirname, '../auditor/registry/action-processes.json');

            if (!fs.existsSync(jsonPath)) {
                console.warn('⚠️  [PROCESS CHAIN] No se encontró action-processes.json, usando definiciones por defecto');
                return this.getDefaultProcessDefinitions();
            }

            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            return data.processes;

        } catch (error) {
            console.error('❌ [PROCESS CHAIN] Error cargando procesos:', error.message);
            return this.getDefaultProcessDefinitions();
        }
    }

    /**
     * Definiciones por defecto (fallback) - Solo las 3 originales
     */
    getDefaultProcessDefinitions() {
        return {
            'shift-swap': {
                name: 'Cambio de Turno',
                steps: [
                    {
                        step: 1,
                        action: 'navigate',
                        module: 'shifts',
                        screen: 'my-shifts',
                        description: 'Ir a Módulo de Turnos → Mis Turnos'
                    },
                    {
                        step: 2,
                        action: 'select',
                        target: 'shift-to-swap',
                        description: 'Seleccionar el turno que desea intercambiar',
                        validation: 'Debe seleccionar un turno futuro (no puede intercambiar turnos pasados)'
                    },
                    {
                        step: 3,
                        action: 'click',
                        button: 'Solicitar Cambio',
                        description: 'Click en botón "Solicitar Cambio"'
                    },
                    {
                        step: 4,
                        action: 'select-colleague',
                        description: 'Buscar y seleccionar al colega con quien desea intercambiar (ej: "Jose")',
                        validation: 'El colega debe tener el mismo rol y estar en el mismo departamento'
                    },
                    {
                        step: 5,
                        action: 'select-target-shift',
                        description: 'Seleccionar el turno del colega que desea tomar',
                        validation: 'El turno debe ser compatible con sus horarios'
                    },
                    {
                        step: 6,
                        action: 'add-justification',
                        description: 'Agregar justificación del cambio (opcional pero recomendado)'
                    },
                    {
                        step: 7,
                        action: 'submit',
                        button: 'Enviar Solicitud',
                        description: 'Click en "Enviar Solicitud"'
                    },
                    {
                        step: 8,
                        action: 'wait-response',
                        description: 'Esperar respuesta del colega (Jose debe aceptar el intercambio)',
                        expectedTime: '24-48 horas',
                        notifications: true
                    },
                    {
                        step: 9,
                        action: 'wait-approval',
                        description: 'Si Jose acepta, la solicitud irá a aprobación de su supervisor',
                        approver: 'supervisor-directo',
                        expectedTime: '48-72 horas',
                        notifications: true
                    }
                ],
                expectedOutcome: 'Una vez aprobado, el cambio se reflejará automáticamente en ambos calendarios.',
                notificationChannels: ['in-app', 'email']
            },

            'vacation-request': {
                name: 'Solicitud de Vacaciones',
                steps: [
                    {
                        step: 1,
                        action: 'navigate',
                        module: 'vacation-management',
                        screen: 'my-vacations',
                        description: 'Ir a Módulo de Gestión de Vacaciones → Mis Vacaciones'
                    },
                    {
                        step: 2,
                        action: 'click',
                        button: 'Nueva Solicitud',
                        description: 'Click en botón "Nueva Solicitud"'
                    },
                    {
                        step: 3,
                        action: 'select-dates',
                        description: 'Seleccionar fechas de inicio y fin de las vacaciones',
                        validation: 'No puede superponer con vacaciones ya aprobadas ni con períodos bloqueados'
                    },
                    {
                        step: 4,
                        action: 'check-balance',
                        description: 'Verificar días disponibles (saldo de vacaciones)',
                        validation: 'Debe tener días suficientes acumulados'
                    },
                    {
                        step: 5,
                        action: 'add-notes',
                        description: 'Agregar notas o comentarios (opcional)'
                    },
                    {
                        step: 6,
                        action: 'submit',
                        button: 'Enviar Solicitud',
                        description: 'Click en "Enviar Solicitud"'
                    },
                    {
                        step: 7,
                        action: 'wait-approval',
                        description: 'Esperar aprobación de supervisor directo',
                        approver: 'supervisor-directo',
                        ccTo: ['rrhh'],
                        expectedTime: '48-72 horas hábiles',
                        notifications: true
                    }
                ],
                expectedOutcome: 'Recibirá notificación de aprobación/rechazo. Si se aprueba, las fechas quedarán bloqueadas en el calendario.',
                notificationChannels: ['in-app', 'email']
            },

            'vacation-request-alternative': {
                name: 'Solicitud de Vacaciones (vía Notificaciones)',
                description: 'Ruta alternativa cuando no hay módulo de Gestión de Vacaciones',
                steps: [
                    {
                        step: 1,
                        action: 'navigate',
                        module: 'notifications-enterprise',
                        screen: 'new-notification',
                        description: 'Ir a Módulo de Notificaciones → Nueva Notificación'
                    },
                    {
                        step: 2,
                        action: 'select-category',
                        category: 'Solicitudes',
                        description: 'Seleccionar categoría "Solicitudes"'
                    },
                    {
                        step: 3,
                        action: 'select-type',
                        type: 'Vacaciones',
                        description: 'Seleccionar tipo "Vacaciones"'
                    },
                    {
                        step: 4,
                        action: 'write-request',
                        description: 'Escribir la solicitud incluyendo: fechas deseadas, cantidad de días, motivo',
                        template: 'Solicito vacaciones desde [fecha_inicio] hasta [fecha_fin] ([X] días hábiles). Motivo: [descripción].'
                    },
                    {
                        step: 5,
                        action: 'auto-route',
                        description: 'El sistema automáticamente enviará la solicitud a:',
                        routing: {
                            primary: 'supervisor-directo',
                            cc: ['rrhh', 'gerente-area'],
                            basedOn: 'organigrama (SSOT)'
                        }
                    },
                    {
                        step: 6,
                        action: 'submit',
                        button: 'Enviar',
                        description: 'Click en "Enviar"'
                    },
                    {
                        step: 7,
                        action: 'wait-response',
                        description: 'Esperar respuesta dentro de 48 horas hábiles',
                        expectedTime: '48 horas hábiles',
                        notifications: true,
                        checkIn: 'notifications-enterprise → Recibidas'
                    }
                ],
                expectedOutcome: 'Recibirá respuesta mediante el sistema de notificaciones. Revise la sección "Recibidas" para ver la respuesta.',
                notificationChannels: ['in-app']
            }
        };
    }

    /**
     * Obtiene una acción del proceso cargado dinámicamente
     */
    getProcessDefinition(actionKey) {
        return this.processDefinitions[actionKey] || null;
    }

    /**
     * Genera la cadena de procesos completa para un usuario y acción
     */
    async generateProcessChain(userId, companyId, actionKey, userIntent = null) {
        console.log(`\n🔗 [PROCESS CHAIN] Generando cadena para acción: ${actionKey}`);
        console.log(`   Usuario: ${userId} | Empresa: ${companyId}\n`);

        try {
            // 1. VALIDAR CONTEXTO DEL USUARIO
            const validation = await this.validator.validateUserContext(userId, companyId, actionKey);

            if (!validation || validation.error) {
                return {
                    success: false,
                    error: validation.error || 'Error validando contexto'
                };
            }

            const chain = {
                action: validation.action,
                userContext: {
                    user: validation.userData,
                    contextValid: validation.valid,
                    missingPrerequisites: validation.missingPrerequisites || [],
                    fulfilledPrerequisites: validation.fulfilledPrerequisites || []
                },
                processSteps: [],
                prerequisiteSteps: [],
                alternativeRoute: null,
                expectedOutcome: null,
                estimatedTime: null,
                canProceed: true,
                warnings: [],
                tips: []
            };

            // 2. SI FALTAN PREREQUISITOS → Generar pasos para completarlos PRIMERO
            if (validation.missingPrerequisites && validation.missingPrerequisites.length > 0) {
                chain.canProceed = false;
                chain.warnings.push(
                    `⚠️ No puede realizar esta acción porque le faltan ${validation.missingPrerequisites.length} prerequisitos.`
                );

                chain.prerequisiteSteps = validation.missingPrerequisites.map((missing, idx) => ({
                    step: idx + 1,
                    type: 'prerequisite',
                    missing: missing.entity,
                    description: missing.description,
                    reason: missing.reason,
                    howToFix: missing.howToFix,
                    action: 'Contactar a RRHH o su supervisor para completar este dato'
                }));

                return chain;
            }

            // 3. SI FALTAN MÓDULOS → Ofrecer ruta alternativa
            if (validation.missingModules && validation.missingModules.length > 0) {
                if (validation.availableAlternatives) {
                    chain.warnings.push(
                        `⚠️ ${validation.availableAlternatives.message}`
                    );

                    // Usar ruta alternativa
                    const alternativeKey = `${actionKey}-alternative`;
                    const alternativeDef = this.processDefinitions[alternativeKey];

                    if (alternativeDef) {
                        chain.alternativeRoute = {
                            module: validation.availableAlternatives.module,
                            reason: validation.availableAlternatives.message,
                            steps: alternativeDef.steps
                        };

                        chain.processSteps = alternativeDef.steps;
                        chain.expectedOutcome = alternativeDef.expectedOutcome;

                        // Calcular tiempo estimado
                        chain.estimatedTime = this.calculateEstimatedTime(alternativeDef.steps);
                    }
                } else {
                    chain.canProceed = false;
                    chain.warnings.push(
                        `❌ Su empresa no tiene contratado el módulo necesario: ${validation.missingModules.join(', ')}`
                    );
                    chain.warnings.push(
                        `Contacte al administrador de su empresa para contratar el módulo.`
                    );

                    return chain;
                }
            } else {
                // 4. CONTEXTO VÁLIDO → Generar cadena normal
                const processDef = this.processDefinitions[actionKey];

                if (processDef) {
                    chain.processSteps = processDef.steps;
                    chain.expectedOutcome = processDef.expectedOutcome;
                    chain.estimatedTime = this.calculateEstimatedTime(processDef.steps);

                    // Enriquecer con routing automático si corresponde
                    chain.processSteps = await this.enrichWithOrganizationalRouting(
                        chain.processSteps,
                        userId,
                        companyId
                    );
                }
            }

            // 5. AGREGAR TIPS DEL BRAIN (si está disponible)
            if (this.brain) {
                const tips = await this.brain.getHistoricalDiscoveries(actionKey);
                if (tips && tips.totalDiscoveries > 0) {
                    chain.tips.push(`💡 Hay ${tips.totalDiscoveries} tips acumulados de usuarios previos para esta acción.`);
                }
            }

            return chain;

        } catch (error) {
            console.error('❌ Error generando process chain:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Enriquece los pasos con routing automático basado en organigrama
     */
    async enrichWithOrganizationalRouting(steps, userId, companyId) {
        const enrichedSteps = [];

        for (const step of steps) {
            const enrichedStep = { ...step };

            // Si el paso requiere aprobación/routing
            if (step.approver || step.routing) {
                const routing = await this.calculateOrganizationalRouting(userId, companyId, step);

                if (routing) {
                    enrichedStep.routingDetails = routing;
                    enrichedStep.description += ` → ${routing.primaryApprover.name} (${routing.primaryApprover.position})`;

                    if (routing.ccTo && routing.ccTo.length > 0) {
                        enrichedStep.description += ` (con copia a: ${routing.ccTo.map(c => c.name).join(', ')})`;
                    }
                }
            }

            enrichedSteps.push(enrichedStep);
        }

        return enrichedSteps;
    }

    /**
     * Calcula routing automático usando organigrama como SSOT
     */
    async calculateOrganizationalRouting(userId, companyId, step) {
        try {
            // Obtener posición del usuario en el organigrama
            const userPosition = await this.db.query(
                `SELECT u.id as user_id, u.username, u.department_id,
                        os.id as position_id, os.title as position_title,
                        os.parent_position_id, os.reports_to_user_id
                 FROM users u
                 LEFT JOIN organizational_structure os ON os.user_id = u.id
                 WHERE u.id = :userId AND u.company_id = :companyId`,
                {
                    replacements: { userId, companyId },
                    type: QueryTypes.SELECT
                }
            );

            if (!userPosition || userPosition.length === 0) {
                return null;
            }

            const position = userPosition[0];

            // Si el paso requiere "supervisor-directo"
            if (step.approver === 'supervisor-directo' || step.routing?.primary === 'supervisor-directo') {
                const supervisor = await this.findDirectSupervisor(position);

                const routing = {
                    type: 'hierarchical',
                    basedOn: 'organizational_structure (SSOT)',
                    primaryApprover: supervisor || { name: 'RRHH', position: 'Recursos Humanos (fallback)' },
                    ccTo: []
                };

                // Agregar CCs si están definidos
                if (step.ccTo) {
                    for (const ccRole of step.ccTo) {
                        if (ccRole === 'rrhh') {
                            const rrhh = await this.findRRHHContacts(companyId);
                            routing.ccTo.push(...rrhh);
                        } else if (ccRole === 'gerente-area') {
                            const manager = await this.findAreaManager(position.department_id, companyId);
                            if (manager) routing.ccTo.push(manager);
                        }
                    }
                }

                return routing;
            }

            return null;

        } catch (error) {
            console.error('Error calculando routing:', error.message);
            return null;
        }
    }

    /**
     * Encuentra al supervisor directo en el organigrama
     */
    async findDirectSupervisor(userPosition) {
        try {
            if (!userPosition.reports_to_user_id) {
                return null;
            }

            const supervisor = await this.db.query(
                `SELECT u.id, u.username as name, os.title as position
                 FROM users u
                 LEFT JOIN organizational_structure os ON os.user_id = u.id
                 WHERE u.id = :supervisorId`,
                {
                    replacements: { supervisorId: userPosition.reports_to_user_id },
                    type: QueryTypes.SELECT
                }
            );

            return supervisor && supervisor.length > 0 ? supervisor[0] : null;

        } catch (error) {
            console.error('Error buscando supervisor:', error.message);
            return null;
        }
    }

    /**
     * Encuentra contactos de RRHH
     */
    async findRRHHContacts(companyId) {
        try {
            const rrhh = await this.db.query(
                `SELECT u.id, u.username as name, 'RRHH' as position
                 FROM users u
                 LEFT JOIN departments d ON d.id = u.department_id
                 WHERE u.company_id = :companyId
                   AND (d.name ILIKE '%recursos humanos%' OR d.name ILIKE '%rrhh%' OR u.role = 'rrhh')
                 LIMIT 3`,
                {
                    replacements: { companyId },
                    type: QueryTypes.SELECT
                }
            );

            return rrhh || [];

        } catch (error) {
            console.error('Error buscando RRHH:', error.message);
            return [];
        }
    }

    /**
     * Encuentra al gerente de área
     */
    async findAreaManager(departmentId, companyId) {
        try {
            const manager = await this.db.query(
                `SELECT u.id, u.username as name, os.title as position
                 FROM users u
                 LEFT JOIN organizational_structure os ON os.user_id = u.id
                 WHERE u.department_id = :departmentId
                   AND u.company_id = :companyId
                   AND (os.title ILIKE '%gerente%' OR os.title ILIKE '%manager%' OR u.role = 'manager')
                 ORDER BY os.hierarchy_level ASC
                 LIMIT 1`,
                {
                    replacements: { departmentId, companyId },
                    type: QueryTypes.SELECT
                }
            );

            return manager && manager.length > 0 ? manager[0] : null;

        } catch (error) {
            console.error('Error buscando gerente:', error.message);
            return null;
        }
    }

    /**
     * Calcula tiempo estimado total de la cadena
     */
    calculateEstimatedTime(steps) {
        let totalMinutes = 0;

        for (const step of steps) {
            if (step.expectedTime) {
                // Parsear "24-48 horas" → tomar el promedio en minutos
                const match = step.expectedTime.match(/(\d+)-(\d+)\s*(hora|horas|h)/i);
                if (match) {
                    const min = parseInt(match[1]);
                    const max = parseInt(match[2]);
                    const avg = (min + max) / 2;
                    totalMinutes += avg * 60;
                }
            } else {
                // Asumir 2 minutos por paso interactivo
                if (step.action === 'navigate' || step.action === 'click' || step.action === 'select') {
                    totalMinutes += 2;
                } else {
                    totalMinutes += 5;
                }
            }
        }

        if (totalMinutes < 60) {
            return `${Math.round(totalMinutes)} minutos`;
        } else {
            const hours = Math.round(totalMinutes / 60);
            return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        }
    }
}

module.exports = ProcessChainGenerator;
