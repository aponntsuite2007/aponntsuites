/**
 * ============================================================================
 * BRAIN ESCALATION SERVICE - Sistema Nervioso del Brain
 * ============================================================================
 *
 * Implementa la metafora del "sistema nervioso":
 * 1. DETECTAR la "picazon" (problema) instantaneamente
 * 2. DECIDIR que "mano" (solucion) es la mas adecuada
 * 3. EJECUTAR la accion (auto-reparar o escalar)
 * 4. VERIFICAR que ya no pica (test de regresion)
 * 5. REGISTRAR que pico, donde y como se soluciono
 * 6. SI SIGUE PICANDO, volver al paso 2
 *
 * Si el Brain NO puede resolver automaticamente:
 * → Escala a soporte Aponnt via cadena del organigrama
 * → Genera ticket detallado con todo el contexto
 * → Eventualmente llega a una sesion de Claude Code
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

// 🔥 NCE: Central Telefónica de Notificaciones (elimina bypass EmailService)
const NCE = require('../../services/NotificationCentralExchange');

// Imports del sistema
let sequelize, AponntStaff, AponntStaffRole, NotificationUnifiedService, EmailService;

class BrainEscalationService extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = {
            maxAutoRepairAttempts: 3,           // Intentos de auto-reparacion
            escalationDelayMs: 5000,            // Delay antes de escalar (para dar chance a auto-repair)
            supportAreas: ['desarrollo', 'admin'], // Areas de soporte de Aponnt
            severityLevels: {
                low: { maxLevel: 4, timeout: '24h' },      // Operativos
                medium: { maxLevel: 3, timeout: '4h' },    // Coordinadores
                high: { maxLevel: 2, timeout: '1h' },      // Jefes
                critical: { maxLevel: 1, timeout: '15m' }  // Gerentes
            },
            ...options
        };

        this.isRunning = false;
        this.activeIncidents = new Map();  // incidentId -> incident data
        this.fileWatcher = null;
        this.ollamaAnalyzer = null;
        this.autonomousRepairAgent = null;

        // Estado del servicio
        this.stats = {
            incidentsDetected: 0,
            autoRepairsAttempted: 0,
            autoRepairsSuccessful: 0,
            escalationsCreated: 0,
            ticketsGenerated: 0
        };

        console.log('🧠 [BRAIN-ESCALATION] BrainEscalationService inicializado');
    }

    /**
     * ========================================================================
     * INICIALIZACION
     * ========================================================================
     */
    async initialize() {
        try {
            console.log('🧠 [BRAIN-ESCALATION] Inicializando conexiones...');

            // Cargar dependencias lazy
            const database = require('../../config/database');
            sequelize = database.sequelize;
            AponntStaff = database.AponntStaff;
            AponntStaffRole = database.AponntStaffRole;

            NotificationUnifiedService = require('../../services/NotificationUnifiedService');
            EmailService = require('../../services/EmailService');

            // Intentar cargar AutonomousRepairAgent si existe
            try {
                const AutonomousRepairAgent = require('../../auditor/core/AutonomousRepairAgent');
                this.autonomousRepairAgent = new AutonomousRepairAgent(database, null, null);
            } catch (e) {
                console.log('⚠️ [BRAIN-ESCALATION] AutonomousRepairAgent no disponible, continuando sin auto-repair');
            }

            // Intentar cargar OllamaAnalyzer si existe
            try {
                const OllamaAnalyzer = require('../../auditor/core/OllamaAnalyzer');
                this.ollamaAnalyzer = new OllamaAnalyzer();
            } catch (e) {
                console.log('⚠️ [BRAIN-ESCALATION] OllamaAnalyzer no disponible, continuando sin diagnostico IA');
            }

            console.log('✅ [BRAIN-ESCALATION] Conexiones inicializadas');
            return true;

        } catch (error) {
            console.error('❌ [BRAIN-ESCALATION] Error en inicializacion:', error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * DETECCION DE PROBLEMAS (LA "PICAZON")
     * ========================================================================
     */

    /**
     * Recibir un problema detectado y procesarlo
     * @param {Object} problem - Datos del problema detectado
     */
    async onProblemDetected(problem) {
        this.stats.incidentsDetected++;

        const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log('\n' + '='.repeat(80));
        console.log(`🔔 [BRAIN-ESCALATION] PROBLEMA DETECTADO - ${incidentId}`);
        console.log('='.repeat(80));
        console.log(`   Tipo: ${problem.type || 'unknown'}`);
        console.log(`   Modulo: ${problem.module || 'N/A'}`);
        console.log(`   Severidad: ${problem.severity || 'medium'}`);
        console.log(`   Mensaje: ${(problem.message || 'Sin mensaje').substring(0, 100)}`);

        // Crear registro del incidente
        const incident = {
            id: incidentId,
            problem,
            status: 'detected',
            detectedAt: new Date(),
            autoRepairAttempts: 0,
            escalated: false,
            escalationLevel: 0,
            timeline: [{
                action: 'detected',
                timestamp: new Date(),
                details: problem
            }]
        };

        this.activeIncidents.set(incidentId, incident);

        // Emitir evento
        this.emit('incident:detected', incident);

        // Iniciar flujo de resolucion
        await this.processIncident(incidentId);

        return incident;
    }

    /**
     * ========================================================================
     * PROCESAMIENTO DEL INCIDENTE (DECIDIR QUE MANO USAR)
     * ========================================================================
     */

    /**
     * Procesar un incidente - intentar auto-reparar o escalar
     */
    async processIncident(incidentId) {
        const incident = this.activeIncidents.get(incidentId);
        if (!incident) {
            console.error(`❌ [BRAIN-ESCALATION] Incidente ${incidentId} no encontrado`);
            return;
        }

        try {
            // PASO 1: Analizar con IA (si disponible)
            let diagnosis = null;
            if (this.ollamaAnalyzer && incident.problem.type !== 'manual') {
                console.log('🧠 [BRAIN-ESCALATION] Analizando problema con Ollama...');
                try {
                    diagnosis = await this.ollamaAnalyzer.diagnose({
                        module_name: incident.problem.module,
                        test_name: incident.problem.type,
                        error_message: incident.problem.message,
                        error_stack: incident.problem.stack
                    });
                    incident.diagnosis = diagnosis;
                    incident.timeline.push({
                        action: 'diagnosis',
                        timestamp: new Date(),
                        details: { diagnosis }
                    });
                    console.log(`   💡 Diagnostico: ${(diagnosis.root_cause || 'N/A').substring(0, 100)}`);
                } catch (e) {
                    console.log(`   ⚠️ Ollama no disponible: ${e.message}`);
                    // Usar diagnóstico inteligente sin IA
                    diagnosis = this.generateFallbackDiagnosis(incident.problem);
                    incident.diagnosis = diagnosis;
                    incident.timeline.push({
                        action: 'diagnosis',
                        timestamp: new Date(),
                        details: { diagnosis, source: 'fallback' }
                    });
                }
            } else {
                // Sin Ollama, usar diagnóstico fallback
                diagnosis = this.generateFallbackDiagnosis(incident.problem);
                incident.diagnosis = diagnosis;
                incident.timeline.push({
                    action: 'diagnosis',
                    timestamp: new Date(),
                    details: { diagnosis, source: 'fallback' }
                });
            }

            // PASO 2: Intentar auto-reparacion (si disponible y es auto-reparable)
            if (this.canAutoRepair(incident)) {
                const repaired = await this.attemptAutoRepair(incidentId, diagnosis);
                if (repaired) {
                    return; // Exito! No escalar
                }
            }

            // PASO 3: No se pudo auto-reparar -> ESCALAR
            await this.escalateToSupport(incidentId);

        } catch (error) {
            console.error(`❌ [BRAIN-ESCALATION] Error procesando incidente ${incidentId}:`, error);
            // En caso de error, escalar de todas formas
            await this.escalateToSupport(incidentId);
        }
    }

    /**
     * Verificar si el problema es auto-reparable
     */
    canAutoRepair(incident) {
        // Si no tenemos AutonomousRepairAgent, no podemos
        if (!this.autonomousRepairAgent) {
            return false;
        }

        // Problemas criticos no se auto-reparan
        if (incident.problem.severity === 'critical') {
            return false;
        }

        // Si ya superamos los intentos maximos
        if (incident.autoRepairAttempts >= this.config.maxAutoRepairAttempts) {
            return false;
        }

        // Por defecto, intentar auto-reparar
        return true;
    }

    /**
     * ========================================================================
     * AUTO-REPARACION (RASCARSE SOLO)
     * ========================================================================
     */

    /**
     * Intentar auto-reparar el problema
     */
    async attemptAutoRepair(incidentId, diagnosis) {
        const incident = this.activeIncidents.get(incidentId);
        if (!incident) return false;

        incident.autoRepairAttempts++;
        this.stats.autoRepairsAttempted++;

        console.log(`\n🔧 [BRAIN-ESCALATION] Intento de auto-reparacion #${incident.autoRepairAttempts}/${this.config.maxAutoRepairAttempts}`);

        incident.timeline.push({
            action: 'auto_repair_attempt',
            timestamp: new Date(),
            details: { attempt: incident.autoRepairAttempts }
        });

        try {
            // Generar ticket para el AutonomousRepairAgent
            const testData = {
                id: incidentId,
                module_name: incident.problem.module || 'unknown',
                test_name: incident.problem.type || 'auto-detected',
                error_message: incident.problem.message,
                error_stack: incident.problem.stack,
                error_type: incident.problem.errorType || 'runtime'
            };

            // Intentar reparar
            const repairResult = await this.autonomousRepairAgent.repairSingleTest(
                testData,
                1, // maxRetries para este intento
                true // autoApprove
            );

            if (repairResult.status === 'success') {
                console.log('✅ [BRAIN-ESCALATION] Auto-reparacion EXITOSA!');

                this.stats.autoRepairsSuccessful++;
                incident.status = 'resolved';
                incident.resolvedAt = new Date();
                incident.resolution = {
                    type: 'auto_repair',
                    details: repairResult
                };

                incident.timeline.push({
                    action: 'resolved',
                    timestamp: new Date(),
                    details: { method: 'auto_repair', result: repairResult }
                });

                // Emitir evento
                this.emit('incident:resolved', incident);

                // Registrar para aprendizaje
                await this.logIncidentResolution(incident);

                return true;
            }

            console.log(`⚠️ [BRAIN-ESCALATION] Auto-reparacion fallida: ${repairResult.error || 'unknown'}`);
            return false;

        } catch (error) {
            console.error(`❌ [BRAIN-ESCALATION] Error en auto-reparacion:`, error.message);
            return false;
        }
    }

    /**
     * ========================================================================
     * ESCALAMIENTO A SOPORTE (PEDIR AYUDA)
     * ========================================================================
     */

    /**
     * Escalar el incidente al soporte de Aponnt
     */
    async escalateToSupport(incidentId) {
        const incident = this.activeIncidents.get(incidentId);
        if (!incident) return;

        console.log('\n' + '─'.repeat(80));
        console.log(`🚨 [BRAIN-ESCALATION] ESCALANDO INCIDENTE ${incidentId} A SOPORTE`);
        console.log('─'.repeat(80));

        incident.status = 'escalated';
        incident.escalated = true;
        incident.escalatedAt = new Date();
        this.stats.escalationsCreated++;

        incident.timeline.push({
            action: 'escalation_started',
            timestamp: new Date(),
            details: { reason: 'auto_repair_failed_or_not_possible' }
        });

        try {
            // 1. Determinar severidad y cadena de escalamiento
            const severity = (incident.problem.severity || 'medium').toLowerCase();

            // 🔍 DEBUG: Verificar configuración
            console.log(`   🔍 [DEBUG] severity: "${severity}"`);
            console.log(`   🔍 [DEBUG] this.config existe: ${!!this.config}`);
            console.log(`   🔍 [DEBUG] this.config.severityLevels existe: ${!!this.config?.severityLevels}`);
            console.log(`   🔍 [DEBUG] Claves disponibles: ${Object.keys(this.config?.severityLevels || {}).join(', ')}`);

            const escalationConfig = this.config.severityLevels[severity];
            console.log(`   🔍 [DEBUG] escalationConfig: ${escalationConfig ? JSON.stringify(escalationConfig) : 'undefined'}`);

            if (!escalationConfig) {
                console.error(`   ❌ [DEBUG] No se encontró configuración para severity "${severity}"`);
                throw new Error(`Configuración de severidad "${severity}" no encontrada`);
            }

            // 2. Obtener staff de soporte segun severidad
            const supportStaff = await this.getSupportStaff(escalationConfig.maxLevel);

            if (!supportStaff || supportStaff.length === 0) {
                console.log('⚠️ [BRAIN-ESCALATION] No se encontro staff de soporte, creando ticket generico');
                await this.createGenericTicket(incident);
                return;
            }

            console.log(`   📋 Staff de soporte encontrado: ${supportStaff.length} personas`);
            supportStaff.slice(0, 3).forEach(s => {
                console.log(`      - ${s.first_name} ${s.last_name} (${s.role_name || s.area}, Nivel ${s.level})`);
            });

            // 3. Generar ticket detallado
            const ticket = await this.generateDetailedTicket(incident, supportStaff[0]);
            this.stats.ticketsGenerated++;

            // 4. Crear notificacion unificada
            await this.createSupportNotification(incident, ticket, supportStaff);

            // 5. Enviar email a soporte
            await this.sendEscalationEmail(incident, ticket, supportStaff);

            incident.timeline.push({
                action: 'escalation_completed',
                timestamp: new Date(),
                details: {
                    ticket: ticket.id,
                    assignedTo: supportStaff.map(s => s.staff_id),
                    severity
                }
            });

            console.log(`✅ [BRAIN-ESCALATION] Escalamiento completado - Ticket: ${ticket.id}`);

            // Emitir evento
            this.emit('incident:escalated', { incident, ticket, supportStaff });

        } catch (error) {
            console.error(`❌ [BRAIN-ESCALATION] Error en escalamiento:`, error);
            incident.timeline.push({
                action: 'escalation_error',
                timestamp: new Date(),
                details: { error: error.message }
            });
        }
    }

    /**
     * Obtener staff de soporte segun nivel requerido
     */
    async getSupportStaff(maxLevel) {
        try {
            if (!AponntStaff) {
                console.log('⚠️ [BRAIN-ESCALATION] Modelo AponntStaff no disponible');
                return [];
            }

            // Buscar staff de desarrollo/admin activos con nivel <= maxLevel
            const staff = await sequelize.query(`
                SELECT
                    s.staff_id,
                    s.first_name,
                    s.last_name,
                    s.email,
                    s.phone,
                    s.level,
                    s.area,
                    r.role_name,
                    r.role_code
                FROM aponnt_staff s
                LEFT JOIN aponnt_staff_roles r ON s.role_id = r.role_id
                WHERE s.is_active = TRUE
                  AND s.area IN ('desarrollo', 'admin')
                  AND s.level <= $1
                ORDER BY s.level ASC, s.area DESC
                LIMIT 5
            `, {
                bind: [maxLevel],
                type: sequelize.QueryTypes.SELECT
            });

            // Asegurar que sea un array
            return Array.isArray(staff) ? staff : [];

        } catch (error) {
            console.error('❌ [BRAIN-ESCALATION] Error obteniendo staff:', error);
            return [];
        }
    }

    /**
     * Generar ticket detallado con todo el contexto
     */
    async generateDetailedTicket(incident, assignee) {
        const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        const ticket = {
            id: ticketId,
            incidentId: incident.id,
            createdAt: new Date(),
            priority: this.mapSeverityToPriority(incident.problem.severity),
            status: 'open',
            assignedTo: assignee?.staff_id || null,

            // Datos del problema
            title: `[BRAIN AUTO-DETECT] ${incident.problem.type || 'Error'} en ${incident.problem.module || 'Sistema'}`,
            description: this.buildTicketDescription(incident),

            // Contexto tecnico
            technical: {
                module: incident.problem.module,
                errorType: incident.problem.type,
                errorMessage: incident.problem.message,
                errorStack: incident.problem.stack,
                timestamp: incident.detectedAt,

                // Diagnostico IA (si hay)
                aiDiagnosis: incident.diagnosis ? {
                    rootCause: incident.diagnosis.root_cause,
                    suggestedFix: incident.diagnosis.suggested_fix,
                    confidence: incident.diagnosis.confidence
                } : null,

                // Intentos de auto-reparacion
                autoRepairAttempts: incident.autoRepairAttempts,

                // Timeline completo
                timeline: incident.timeline
            },

            // Para Claude Code
            claudeCodeContext: {
                prompt: this.buildClaudeCodePrompt(incident),
                files: incident.problem.affectedFiles || [],
                testToRun: incident.problem.testCommand || null
            }
        };

        // Guardar ticket en BD (si la tabla existe)
        try {
            await this.saveTicketToDatabase(ticket);
        } catch (e) {
            console.log('⚠️ [BRAIN-ESCALATION] No se pudo guardar ticket en BD:', e.message);
        }

        return ticket;
    }

    /**
     * Construir descripcion del ticket
     */
    buildTicketDescription(incident) {
        const lines = [
            '## Problema Detectado Automaticamente por Brain',
            '',
            `**Tipo:** ${incident.problem.type || 'Unknown'}`,
            `**Modulo:** ${incident.problem.module || 'N/A'}`,
            `**Severidad:** ${incident.problem.severity || 'medium'}`,
            `**Detectado:** ${incident.detectedAt.toISOString()}`,
            '',
            '### Mensaje de Error',
            '```',
            incident.problem.message || 'Sin mensaje',
            '```',
            ''
        ];

        if (incident.problem.stack) {
            lines.push('### Stack Trace');
            lines.push('```');
            lines.push(incident.problem.stack.substring(0, 2000));
            lines.push('```');
            lines.push('');
        }

        if (incident.diagnosis) {
            lines.push('### Diagnostico IA (Ollama)');
            lines.push(`**Causa raiz probable:** ${incident.diagnosis.root_cause || 'No determinada'}`);
            lines.push(`**Solucion sugerida:** ${incident.diagnosis.suggested_fix || 'No disponible'}`);
            lines.push(`**Confianza:** ${incident.diagnosis.confidence || 'N/A'}`);
            lines.push('');
        }

        lines.push('### Intentos de Auto-Reparacion');
        lines.push(`Se intentaron ${incident.autoRepairAttempts} reparaciones automaticas sin exito.`);
        lines.push('');

        lines.push('### Timeline');
        for (const event of incident.timeline) {
            lines.push(`- **${event.action}** (${new Date(event.timestamp).toLocaleTimeString()})`);
        }

        return lines.join('\n');
    }

    /**
     * Construir prompt para Claude Code
     */
    buildClaudeCodePrompt(incident) {
        return `
## Contexto del Problema

El sistema Brain de Aponnt ha detectado automaticamente el siguiente problema que no pudo ser resuelto automaticamente.

**Modulo afectado:** ${incident.problem.module || 'Desconocido'}
**Tipo de error:** ${incident.problem.type || 'Runtime error'}

### Error
\`\`\`
${incident.problem.message || 'Sin mensaje de error'}
\`\`\`

${incident.problem.stack ? `### Stack Trace
\`\`\`
${incident.problem.stack.substring(0, 1500)}
\`\`\`
` : ''}

${incident.diagnosis ? `### Diagnostico IA
- **Causa probable:** ${incident.diagnosis.root_cause}
- **Solucion sugerida:** ${incident.diagnosis.suggested_fix}
` : ''}

### Tarea
1. Analiza el error y su contexto
2. Identifica la causa raiz
3. Implementa la solucion minima necesaria
4. Ejecuta los tests para verificar la correccion
5. Si el problema persiste, documenta los hallazgos

### Notas
- Este ticket fue generado automaticamente por el sistema Brain
- Se intentaron ${incident.autoRepairAttempts} auto-reparaciones sin exito
- El problema tiene severidad: ${incident.problem.severity || 'medium'}
        `.trim();
    }

    /**
     * Crear notificacion unificada para el soporte
     */
    async createSupportNotification(incident, ticket, supportStaff) {
        try {
            // NotificationUnifiedService es un singleton (instancia), no una clase
            // No se puede hacer 'new', usar directamente la instancia
            const notificationService = NotificationUnifiedService;

            for (const staff of supportStaff.slice(0, 3)) {
                await sequelize.query(`
                    INSERT INTO unified_notifications (
                        company_id, thread_id,
                        origin_type, origin_id, origin_name,
                        recipient_type, recipient_id, recipient_name,
                        category, module, notification_type, priority,
                        title, message, short_message,
                        requires_action, metadata, created_by
                    ) VALUES (
                        NULL, $1,
                        'brain', 'brain-escalation', 'Brain Auto-Detect',
                        'staff', $2, $3,
                        'technical', 'brain', 'incident_escalation', $4,
                        $5, $6, $7,
                        TRUE, $8, 'brain_escalation_service'
                    )
                `, {
                    bind: [
                        ticket.id,
                        staff.staff_id,
                        `${staff.first_name} ${staff.last_name}`,
                        ticket.priority,
                        ticket.title,
                        ticket.description.substring(0, 5000),
                        `Incidente Brain #${incident.id.substring(0, 12)}`,
                        JSON.stringify({
                            incidentId: incident.id,
                            ticketId: ticket.id,
                            claudeCodePrompt: ticket.claudeCodeContext.prompt
                        })
                    ]
                });
            }

            console.log(`   📬 Notificaciones creadas para ${supportStaff.length} miembros del staff`);

        } catch (error) {
            console.error('❌ [BRAIN-ESCALATION] Error creando notificacion:', error);
        }
    }

    /**
     * Enviar email de escalamiento
     * 🔥 MIGRADO A NCE: Central Telefónica
     */
    async sendEscalationEmail(incident, ticket, supportStaff) {
        try {
            const emailHtml = `
                <h2>🧠 Incidente Detectado por Brain</h2>
                <p>El sistema Brain ha detectado un problema que no pudo resolverse automaticamente.</p>

                <hr>
                <h3>Detalles del Incidente</h3>
                <ul>
                    <li><strong>ID:</strong> ${incident.id}</li>
                    <li><strong>Ticket:</strong> ${ticket.id}</li>
                    <li><strong>Modulo:</strong> ${incident.problem.module || 'N/A'}</li>
                    <li><strong>Severidad:</strong> ${incident.problem.severity || 'medium'}</li>
                    <li><strong>Detectado:</strong> ${incident.detectedAt.toLocaleString('es-AR')}</li>
                </ul>

                <h3>Error</h3>
                <pre style="background: #f4f4f4; padding: 10px; overflow-x: auto;">
${(incident.problem.message || 'Sin mensaje').substring(0, 500)}
                </pre>

                ${incident.diagnosis ? `
                <h3>Diagnostico IA</h3>
                <p><strong>Causa probable:</strong> ${incident.diagnosis.root_cause}</p>
                <p><strong>Solucion sugerida:</strong> ${incident.diagnosis.suggested_fix}</p>
                ` : ''}

                <h3>Intentos de Auto-Reparacion</h3>
                <p>Se realizaron ${incident.autoRepairAttempts} intentos de reparacion automatica sin exito.</p>

                <hr>
                <p><strong>Por favor, revisa el panel de soporte para tomar accion.</strong></p>
                <p>Saludos,<br>Sistema Brain - Aponnt</p>
            `;

            for (const staff of supportStaff.slice(0, 2)) {
                if (!staff.email) continue;

                // 🔥 NCE: Central Telefónica
                await NCE.send({
                    companyId: null, // Scope aponnt (global - soporte interno)
                    module: 'brain',
                    originType: 'brain_escalation',
                    originId: `incident-${incident.id}-${staff.staff_id}`,

                    workflowKey: 'brain.escalation_alert',

                    recipientType: 'user',
                    recipientId: staff.user_id || staff.staff_id,
                    recipientEmail: staff.email,

                    title: `🚨 [BRAIN] Incidente Escalado - ${ticket.id}`,
                    message: `Brain detectó problema en ${incident.problem.module || 'sistema'}: ${(incident.problem.message || '').substring(0, 100)}`,

                    metadata: {
                        incidentId: incident.id,
                        ticketId: ticket.id,
                        module: incident.problem.module,
                        severity: incident.problem.severity,
                        autoRepairAttempts: incident.autoRepairAttempts,
                        staffId: staff.staff_id,
                        htmlContent: emailHtml
                    },

                    priority: 'urgent',
                    requiresAction: true,
                    actionType: 'resolution',
                    slaHours: 4,

                    channels: ['email', 'inbox'],
                });

                console.log(`   📧 [NCE] Email enviado a ${staff.email}`);
            }

        } catch (error) {
            console.error('❌ [NCE] Error enviando email:', error.message);
        }
    }

    /**
     * Crear ticket generico cuando no hay staff disponible
     */
    async createGenericTicket(incident) {
        const ticket = await this.generateDetailedTicket(incident, null);

        // Guardar en archivo para revision manual
        const ticketPath = path.join(__dirname, '../../brain/tickets', `${ticket.id}.json`);
        try {
            const ticketsDir = path.dirname(ticketPath);
            if (!fs.existsSync(ticketsDir)) {
                fs.mkdirSync(ticketsDir, { recursive: true });
            }
            fs.writeFileSync(ticketPath, JSON.stringify(ticket, null, 2));
            console.log(`   📄 Ticket guardado en: ${ticketPath}`);
        } catch (e) {
            console.log('⚠️ [BRAIN-ESCALATION] No se pudo guardar ticket en archivo');
        }

        return ticket;
    }

    /**
     * Guardar ticket en base de datos
     */
    async saveTicketToDatabase(ticket) {
        // Por ahora solo log, podria guardarse en support_tickets_v2 u otra tabla
        console.log(`   💾 Ticket ${ticket.id} registrado`);
    }

    /**
     * ========================================================================
     * VERIFICACION (CONFIRMAR QUE YA NO PICA)
     * ========================================================================
     */

    /**
     * Verificar si un incidente fue resuelto ejecutando tests
     */
    async verifyResolution(incidentId, testCommand) {
        const incident = this.activeIncidents.get(incidentId);
        if (!incident) return false;

        console.log(`🔍 [BRAIN-ESCALATION] Verificando resolucion de ${incidentId}...`);

        try {
            // Ejecutar test especifico si se proporciono
            if (testCommand) {
                const { exec } = require('child_process');
                const result = await new Promise((resolve, reject) => {
                    exec(testCommand, { timeout: 60000 }, (error, stdout, stderr) => {
                        if (error) {
                            resolve({ success: false, output: stderr || error.message });
                        } else {
                            resolve({ success: true, output: stdout });
                        }
                    });
                });

                incident.timeline.push({
                    action: 'verification_test',
                    timestamp: new Date(),
                    details: result
                });

                if (result.success) {
                    incident.status = 'verified';
                    console.log('✅ [BRAIN-ESCALATION] Verificacion exitosa');
                    this.emit('incident:verified', incident);
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.error(`❌ [BRAIN-ESCALATION] Error en verificacion:`, error);
            return false;
        }
    }

    /**
     * ========================================================================
     * REGISTRO Y APRENDIZAJE
     * ========================================================================
     */

    /**
     * Registrar resolucion del incidente para aprendizaje
     */
    async logIncidentResolution(incident) {
        try {
            // Guardar en la base de conocimiento del Brain
            const logEntry = {
                incidentId: incident.id,
                problem: {
                    type: incident.problem.type,
                    module: incident.problem.module,
                    severity: incident.problem.severity,
                    message: incident.problem.message
                },
                resolution: incident.resolution,
                diagnosis: incident.diagnosis,
                timeline: incident.timeline,
                stats: {
                    autoRepairAttempts: incident.autoRepairAttempts,
                    timeToResolve: incident.resolvedAt - incident.detectedAt
                },
                resolvedAt: incident.resolvedAt
            };

            // Intentar guardar en assistant_knowledge_base (tabla global del sistema IA)
            if (sequelize) {
                await sequelize.query(`
                    INSERT INTO assistant_knowledge_base (
                        company_id, question, answer, context_type, context_module,
                        source, feedback_positive, feedback_negative, usage_count, metadata
                    ) VALUES (
                        NULL,
                        $1,
                        $2,
                        'technical',
                        $3,
                        'brain_auto_repair',
                        1, 0, 1,
                        $4
                    )
                `, {
                    bind: [
                        `Error: ${incident.problem.message}`,
                        `Solucion: ${incident.resolution?.details?.suggested_fix || 'Auto-reparado'}`,
                        incident.problem.module,
                        JSON.stringify(logEntry)
                    ]
                });
                console.log('   📚 Conocimiento guardado para futuros incidentes');
            }

        } catch (error) {
            console.log('⚠️ [BRAIN-ESCALATION] No se pudo guardar en knowledge base:', error.message);
        }
    }

    /**
     * ========================================================================
     * UTILIDADES
     * ========================================================================
     */

    /**
     * Generar diagnóstico inteligente sin IA cuando Ollama no está disponible
     * Analiza patrones conocidos en el problema para sugerir soluciones
     */
    generateFallbackDiagnosis(problem) {
        const message = (problem.message || '').toLowerCase();
        const type = (problem.type || '').toLowerCase();
        const module = (problem.module || '').toLowerCase();
        const stack = (problem.stack || '').toLowerCase();

        // Patrones de problemas conocidos con diagnósticos específicos
        const patterns = [
            // Problemas de memoria
            {
                match: () => message.includes('memory') || message.includes('heap') || type.includes('memory'),
                diagnosis: {
                    root_cause: 'Consumo excesivo de memoria - posible memory leak o carga pesada',
                    suggested_fix: 'Revisar consultas sin paginación, caches sin límite, o listeners no liberados. Considerar aumentar --max-old-space-size o reiniciar el proceso.',
                    confidence: 0.75,
                    category: 'performance'
                }
            },
            // Event loop bloqueado
            {
                match: () => message.includes('event loop') || message.includes('lag') || type.includes('eventloop'),
                diagnosis: {
                    root_cause: 'Event loop bloqueado - operaciones síncronas pesadas o I/O lento',
                    suggested_fix: 'Identificar operaciones CPU-intensive y moverlas a worker threads. Revisar queries de BD lentos o llamadas externas sin timeout.',
                    confidence: 0.70,
                    category: 'performance'
                }
            },
            // Errores de base de datos
            {
                match: () => message.includes('sequelize') || message.includes('database') || message.includes('column') || message.includes('relation'),
                diagnosis: {
                    root_cause: 'Error de base de datos - posible esquema inconsistente o conexión fallida',
                    suggested_fix: 'Verificar que las migraciones estén aplicadas. Revisar el pool de conexiones y la disponibilidad del servidor PostgreSQL.',
                    confidence: 0.80,
                    category: 'database'
                }
            },
            // Errores de autenticación
            {
                match: () => message.includes('unauthorized') || message.includes('jwt') || message.includes('token') || message.includes('auth'),
                diagnosis: {
                    root_cause: 'Error de autenticación - token inválido, expirado o secreto mal configurado',
                    suggested_fix: 'Verificar JWT_SECRET en .env, revisar expiración de tokens, y confirmar que el middleware de auth está correctamente configurado.',
                    confidence: 0.85,
                    category: 'security'
                }
            },
            // Errores de endpoints/rutas
            {
                match: () => message.includes('404') || message.includes('not found') || message.includes('cannot get'),
                diagnosis: {
                    root_cause: 'Endpoint no encontrado - ruta mal configurada o no registrada',
                    suggested_fix: 'Verificar que la ruta esté registrada en server.js y que el archivo de rutas exporte el router correctamente.',
                    confidence: 0.85,
                    category: 'routing'
                }
            },
            // Errores de timeout
            {
                match: () => message.includes('timeout') || message.includes('etimedout') || message.includes('econnrefused'),
                diagnosis: {
                    root_cause: 'Timeout de conexión - servicio externo no responde o red saturada',
                    suggested_fix: 'Aumentar timeouts, implementar circuit breaker, o verificar disponibilidad del servicio externo (Ollama, API, etc).',
                    confidence: 0.75,
                    category: 'network'
                }
            },
            // Errores de sintaxis/imports
            {
                match: () => message.includes('syntaxerror') || message.includes('unexpected token') || message.includes('cannot find module'),
                diagnosis: {
                    root_cause: 'Error de sintaxis o módulo faltante - código mal formado o dependencia no instalada',
                    suggested_fix: 'Revisar el archivo mencionado en el stack trace. Si es módulo faltante, ejecutar npm install.',
                    confidence: 0.90,
                    category: 'code'
                }
            },
            // Errores de permisos
            {
                match: () => message.includes('permission') || message.includes('forbidden') || message.includes('eacces'),
                diagnosis: {
                    root_cause: 'Error de permisos - usuario sin acceso o archivo protegido',
                    suggested_fix: 'Verificar rol del usuario, permisos del módulo, o permisos del sistema de archivos.',
                    confidence: 0.80,
                    category: 'security'
                }
            },
            // Test E2E genérico
            {
                match: () => type.includes('e2e') || type.includes('test'),
                diagnosis: {
                    root_cause: `Test fallido en módulo ${module || 'desconocido'} - verificar implementación`,
                    suggested_fix: `Ejecutar test individual del módulo ${module} para obtener detalles. Revisar logs del servidor durante la ejecución.`,
                    confidence: 0.60,
                    category: 'testing'
                }
            },
            // Errores de validación
            {
                match: () => message.includes('validation') || message.includes('invalid') || message.includes('required'),
                diagnosis: {
                    root_cause: 'Error de validación - datos de entrada incompletos o mal formados',
                    suggested_fix: 'Revisar el payload enviado al endpoint. Verificar que todos los campos requeridos estén presentes y con el formato correcto.',
                    confidence: 0.80,
                    category: 'validation'
                }
            }
        ];

        // Buscar el primer patrón que coincida
        for (const pattern of patterns) {
            if (pattern.match()) {
                console.log(`   💡 Diagnóstico fallback (${pattern.diagnosis.category}): ${pattern.diagnosis.root_cause.substring(0, 60)}...`);
                return pattern.diagnosis;
            }
        }

        // Diagnóstico genérico si no coincide ningún patrón
        return {
            root_cause: `Error detectado en ${module || 'sistema'}: ${(problem.message || 'sin detalle').substring(0, 100)}`,
            suggested_fix: 'Revisar logs del servidor para más contexto. Ejecutar tests del módulo afectado. Verificar configuración del entorno.',
            confidence: 0.40,
            category: 'unknown'
        };
    }

    mapSeverityToPriority(severity) {
        const map = {
            critical: 'urgent',
            high: 'high',
            medium: 'normal',
            low: 'low'
        };
        return map[severity] || 'normal';
    }

    /**
     * Obtener estadisticas del servicio
     */
    getStats() {
        return {
            ...this.stats,
            activeIncidents: this.activeIncidents.size,
            isRunning: this.isRunning
        };
    }

    /**
     * Obtener incidentes activos
     */
    getActiveIncidents() {
        return Array.from(this.activeIncidents.values());
    }

    /**
     * Limpiar incidentes resueltos
     */
    cleanupResolvedIncidents() {
        const resolved = [];
        for (const [id, incident] of this.activeIncidents) {
            if (incident.status === 'resolved' || incident.status === 'verified') {
                resolved.push(id);
                this.activeIncidents.delete(id);
            }
        }
        console.log(`🧹 [BRAIN-ESCALATION] Limpiados ${resolved.length} incidentes resueltos`);
        return resolved;
    }
}

// Singleton
const brainEscalationService = new BrainEscalationService();

module.exports = brainEscalationService;
