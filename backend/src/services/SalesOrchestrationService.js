// TEST MARKER
/**
 * ============================================================================
 * SALES ORCHESTRATION SERVICE - Sales Orchestration Brain
 * ============================================================================
 *
 * Servicio de orquestación inteligente de ventas que:
 * - Gestiona el ciclo completo de reuniones de venta
 * - Envía comunicaciones automáticas (emails)
 * - Usa el Brain para generar pitches personalizados
 * - Detecta supervisores del organigrama
 * - Genera roadmaps ajustados al tiempo disponible
 *
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const EmailService = require('./EmailService');

class SalesOrchestrationService {
    constructor() {
        this.brainHub = null;
        this.emailService = null;
        this.initialized = false;
    }

    /**
     * Validar si un valor es un UUID válido
     */
    isValidUUID(value) {
        if (!value || typeof value !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
    }

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    async initialize() {
        if (this.initialized) return;

        try {
            // Cargar BrainHub
            this.brainHub = require('../brain/services/BrainIntegrationHub');
            if (!this.brainHub.isInitialized) {
                await this.brainHub.initialize();
            }
            console.log('🧠 [SALES-ORCH] BrainHub conectado');

            // Usar EmailService centralizado con tipo 'commercial'
            this.emailService = EmailService;
            console.log('📧 [SALES-ORCH] Usando EmailService con email comercial (aponntcomercial@gmail.com)');

            this.initialized = true;
            console.log('✅ [SALES-ORCH] Sales Orchestration Service inicializado');
        } catch (error) {
            console.error('❌ [SALES-ORCH] Error inicializando:', error.message);
        }
    }

    // =========================================================================
    // GESTIÓN DE REUNIONES
    // =========================================================================

    /**
     * Crear nueva reunión de venta
     */
    async createMeeting(data, createdById) {
        await this.initialize();

        const transaction = await sequelize.transaction();
        try {
            // Detectar supervisor del vendedor asignado
            const supervisorId = await this.getSupervisorId(data.assignedVendorId);

            // Si createdById no es UUID válido (ej: 'SUPERADMIN'), usar assignedVendorId
            const effectiveCreatedById = this.isValidUUID(createdById)
                ? createdById
                : data.assignedVendorId;

            // Insertar reunión
            const [meetingResult] = await sequelize.query(`
                INSERT INTO sales_meetings (
                    prospect_company_name, prospect_company_type, prospect_country,
                    prospect_province, prospect_city, prospect_employee_count,
                    prospect_phone, prospect_email, prospect_website, prospect_notes,
                    meeting_date, meeting_time, meeting_duration_minutes,
                    meeting_location, meeting_platform, meeting_link,
                    assigned_vendor_id, created_by_id, supervisor_id,
                    status, send_reminder_24h
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
                RETURNING *
            `, {
                replacements: [
                    data.prospectCompanyName?.toUpperCase() || null,  // Nombres en MAYÚSCULAS
                    data.prospectCompanyType || 'otro',
                    data.prospectCountry || 'Argentina',
                    data.prospectProvince?.toUpperCase() || null,
                    data.prospectCity?.toUpperCase() || null,
                    data.prospectEmployeeCount || null,
                    data.prospectPhone || null,
                    data.prospectEmail?.toLowerCase() || null,  // Emails en minúsculas
                    data.prospectWebsite?.toLowerCase() || null,
                    data.prospectNotes || null,
                    data.meetingDate,
                    data.meetingTime,
                    data.meetingDurationMinutes || 60,
                    data.meetingLocation?.toUpperCase() || null,
                    data.meetingPlatform || 'Zoom',
                    data.meetingLink || null,
                    data.assignedVendorId,
                    effectiveCreatedById,  // Usar el ID efectivo (UUID válido)
                    supervisorId,
                    data.sendReminder24h !== false
                ],
                transaction
            });

            const meeting = meetingResult[0];

            // Insertar asistentes
            if (data.attendees && data.attendees.length > 0) {
                for (const attendee of data.attendees) {
                    await sequelize.query(`
                        INSERT INTO sales_meeting_attendees (
                            meeting_id, full_name, email, phone, whatsapp,
                            job_title, department, is_decision_maker
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, {
                        replacements: [
                            meeting.id,
                            attendee.fullName?.toUpperCase() || null,  // Nombres en MAYÚSCULAS
                            attendee.email?.toLowerCase() || null,  // Emails en minúsculas
                            attendee.phone || null,
                            attendee.whatsapp || null,
                            attendee.jobTitle?.toUpperCase() || null,
                            attendee.department?.toUpperCase() || null,
                            attendee.isDecisionMaker || false
                        ],
                        transaction
                    });
                }
            }

            await transaction.commit();

            // Notificar al vendedor y supervisor
            await this.notifyMeetingCreated(meeting, supervisorId);

            return {
                success: true,
                meeting: meeting,
                message: 'Reunión creada exitosamente'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [SALES-ORCH] Error creando reunión:', error);
            throw error;
        }
    }

    /**
     * Obtener supervisor del vendedor
     */
    async getSupervisorId(vendorId) {
        // Si vendorId no es UUID válido (ej: 'SUPERADMIN'), retornar null
        if (!this.isValidUUID(vendorId)) {
            return null;
        }
        try {
            const result = await sequelize.query(`
                SELECT reports_to_staff_id FROM aponnt_staff WHERE staff_id = ?
            `, { replacements: [vendorId], type: QueryTypes.SELECT });
            return result[0]?.reports_to_staff_id || null;
        } catch (error) {
            console.warn('⚠️ [SALES-ORCH] Error obteniendo supervisor:', error.message);
            return null;
        }
    }

    /**
     * Confirmar y enviar encuesta a asistentes
     */
    async confirmAndSendSurvey(meetingId) {
        await this.initialize();

        try {
            // Obtener reunión y asistentes
            const meeting = await this.getMeetingById(meetingId);
            if (!meeting) throw new Error('Reunión no encontrada');

            const attendees = await this.getMeetingAttendees(meetingId);
            if (attendees.length === 0) throw new Error('No hay asistentes registrados');

            // Obtener módulos disponibles para la encuesta
            const modules = await this.getModulesForSurvey();

            // Enviar email a cada asistente
            for (const attendee of attendees) {
                await this.sendSurveyEmail(meeting, attendee, modules);
            }

            // Actualizar estado de la reunión
            await sequelize.query(`
                UPDATE sales_meetings
                SET status = 'survey_sent',
                    survey_sent_at = NOW(),
                    survey_deadline = NOW() + INTERVAL '3 days',
                    updated_at = NOW()
                WHERE id = ?
            `, { replacements: [meetingId] });

            return {
                success: true,
                emailsSent: attendees.length,
                message: `Encuesta enviada a ${attendees.length} asistentes`
            };

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error enviando encuesta:', error);
            throw error;
        }
    }

    /**
     * Obtener módulos para la encuesta
     */
    async getModulesForSurvey() {
        const result = await sequelize.query(`
            SELECT module_key, short_description, sales_pitch, icon, color, display_order,
                   target_audience, key_benefits
            FROM sales_module_descriptions
            WHERE is_active = true
            ORDER BY display_order
        `, { type: QueryTypes.SELECT });
        return result;
    }

    /**
     * Procesar respuesta de encuesta de un asistente
     */
    async processSurveyResponse(attendeeToken, responses) {
        await this.initialize();

        const transaction = await sequelize.transaction();
        try {
            // Buscar asistente por token
            const attendeeResult = await sequelize.query(`
                SELECT a.*, m.id as meeting_id, m.status as meeting_status
                FROM sales_meeting_attendees a
                JOIN sales_meetings m ON a.meeting_id = m.id
                WHERE a.survey_token = ?
            `, { replacements: [attendeeToken], type: QueryTypes.SELECT, transaction });

            if (attendeeResult.length === 0) {
                await transaction.rollback();
                throw new Error('Token de encuesta inválido');
            }

            const attendee = attendeeResult[0];

            if (attendee.survey_completed_at) {
                await transaction.rollback();
                return { success: false, message: 'Esta encuesta ya fue completada' };
            }

            // Guardar preferencias del asistente
            await sequelize.query(`
                UPDATE sales_meeting_attendees
                SET preferred_focus = ?,
                    wants_reminder = ?,
                    survey_completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            `, {
                replacements: [
                    responses.preferredFocus || 'mixed',
                    responses.wantsReminder !== false,
                    attendee.id
                ],
                transaction
            });

            // Guardar interés en módulos
            if (responses.moduleInterests && responses.moduleInterests.length > 0) {
                for (let i = 0; i < responses.moduleInterests.length; i++) {
                    const interest = responses.moduleInterests[i];
                    await sequelize.query(`
                        INSERT INTO sales_meeting_module_interests (
                            meeting_id, attendee_id, module_key, module_name,
                            interest_level, priority_order, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (attendee_id, module_key) DO UPDATE SET
                            interest_level = EXCLUDED.interest_level,
                            priority_order = EXCLUDED.priority_order,
                            notes = EXCLUDED.notes
                    `, {
                        replacements: [
                            attendee.meeting_id,
                            attendee.id,
                            interest.moduleKey || 'unknown',
                            interest.moduleName || 'Módulo',
                            interest.interestLevel || 'medium',
                            interest.priority ?? (i + 1),  // Usar índice si no hay priority
                            interest.notes || null
                        ],
                        transaction
                    });
                }
            }

            await transaction.commit();

            // SIEMPRE generar/actualizar el pitch con los datos disponibles
            // No esperar a que todos respondan
            await this.updatePitchAndNotify(attendee.meeting_id, attendee);

            return {
                success: true,
                message: 'Gracias por completar la encuesta. Nos vemos pronto!'
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [SALES-ORCH] Error procesando encuesta:', error);
            throw error;
        }
    }

    /**
     * Actualizar pitch y notificar al vendedor cuando alguien responde
     * Se ejecuta CADA VEZ que un participante responde (no espera a todos)
     */
    async updatePitchAndNotify(meetingId, respondent) {
        try {
            // Obtener info de la reunión y estadísticas
            const meeting = await this.getMeetingById(meetingId);
            const attendees = await this.getMeetingAttendees(meetingId);

            const totalAttendees = attendees.length;
            const completedCount = attendees.filter(a => a.survey_completed_at).length;
            const allComplete = completedCount === totalAttendees;

            console.log(`📊 [SALES-ORCH] Encuesta completada: ${completedCount}/${totalAttendees}`);

            // SIEMPRE generar/actualizar el pitch con los datos disponibles
            await this.generatePitch(meetingId);

            // Cambiar status a pitch_ready (el pitch está disponible aunque no todos hayan respondido)
            await sequelize.query(`
                UPDATE sales_meetings
                SET status = 'pitch_ready',
                    updated_at = NOW()
                WHERE id = ? AND status = 'survey_sent'
            `, { replacements: [meetingId] });

            // Notificar al vendedor
            await this.notifyVendorSurveyResponse(meeting, respondent, completedCount, totalAttendees, allComplete);

            console.log(`✅ [SALES-ORCH] Pitch actualizado y vendedor notificado`);

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error actualizando pitch:', error);
            // No lanzar error - la encuesta ya se guardó, esto es secundario
        }
    }

    /**
     * Notificar al vendedor que un participante respondió la encuesta
     */
    async notifyVendorSurveyResponse(meeting, respondent, completedCount, totalAttendees, allComplete) {
        try {
            const vendor = await this.getVendorInfo(meeting.assigned_vendor_id);
            if (!vendor?.email) {
                console.warn('⚠️ [SALES-ORCH] Vendedor sin email, no se puede notificar');
                return;
            }

            const subject = allComplete
                ? `✅ ${meeting.prospect_company_name} - ¡Todas las encuestas completas! Pitch listo`
                : `📋 ${meeting.prospect_company_name} - ${respondent.full_name} respondió la encuesta (${completedCount}/${totalAttendees})`;

            const pendingNames = await this.getPendingAttendeeNames(meeting.id);

            const html = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f23; color: #e5e5e5; border-radius: 12px; overflow: hidden;">
                    <!-- Header profesional -->
                    <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); padding: 25px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                            <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 22px; font-weight: bold;">A</span>
                            </div>
                            <div style="text-align: left;">
                                <div style="font-size: 22px; font-weight: 800; color: #f59e0b;">APONNT 360º</div>
                                <div style="font-size: 9px; color: #8b5cf6; font-weight: 600; letter-spacing: 2px;">INTELLIGENT ECOSYSTEM</div>
                            </div>
                        </div>
                        <div style="font-size: 9px; color: rgba(255,255,255,0.4);">SaaS B2B Multi-Tenant · Ecosistema Inteligente de Administración y Planificación de Recursos Empresariales</div>
                    </div>

                    <div style="padding: 25px;">

                    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="color: #22c55e; margin: 0 0 10px 0;">
                            ${allComplete ? '🎉 ¡Todas las encuestas completas!' : '📋 Nueva respuesta de encuesta'}
                        </h2>
                        <p style="margin: 0; color: #e5e5e5;">
                            <strong>${respondent.full_name}</strong> (${respondent.role || 'Sin cargo'}) completó su encuesta.
                        </p>
                    </div>

                    <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #f59e0b; margin: 0 0 15px 0;">📊 Estado de Encuestas</h3>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <div style="flex: 1; background: #333; border-radius: 10px; height: 20px; overflow: hidden;">
                                <div style="width: ${(completedCount/totalAttendees)*100}%; background: linear-gradient(90deg, #22c55e, #16a34a); height: 100%; border-radius: 10px;"></div>
                            </div>
                            <span style="font-weight: bold; color: #22c55e;">${completedCount}/${totalAttendees}</span>
                        </div>
                        ${pendingNames.length > 0 ? `
                            <p style="color: #f59e0b; margin: 0;">
                                ⏳ Pendientes: ${pendingNames.join(', ')}
                            </p>
                        ` : ''}
                    </div>

                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #f59e0b; margin: 0 0 10px 0;">🎯 Pitch ${allComplete ? 'COMPLETO' : 'PARCIAL'} Disponible</h3>
                        <p style="margin: 0 0 15px 0;">
                            ${allComplete
                                ? 'El pitch está listo con las preferencias de todos los asistentes.'
                                : 'Puedes ver el pitch con los datos recibidos hasta ahora. Se actualizará cuando respondan los demás.'}
                        </p>
                        <a href="${process.env.APP_URL || 'http://localhost:9998'}/panel-administrativo.html#sales-orchestration"
                           style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                            Ver Pitch y Preparar Reunión
                        </a>
                    </div>

                    <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 15px;">
                        <p style="margin: 0; color: #888; font-size: 14px;">
                            <strong>Reunión:</strong> ${meeting.prospect_company_name}<br>
                            <strong>Fecha:</strong> ${this.formatDate(meeting.meeting_date)} a las ${meeting.meeting_time?.slice(0,5)}<br>
                            <strong>Lugar:</strong> ${meeting.meeting_location || 'Virtual'}
                        </p>
                    </div>
                </div>
            `;

            await this.sendEmail({
                to: vendor.email,
                subject,
                html
            });

            console.log(`📧 [SALES-ORCH] Notificación enviada a vendedor: ${vendor.email}`);

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error notificando a vendedor:', error);
        }
    }

    /**
     * Obtener nombres de asistentes que aún no respondieron
     */
    async getPendingAttendeeNames(meetingId) {
        const result = await sequelize.query(`
            SELECT full_name FROM sales_meeting_attendees
            WHERE meeting_id = ? AND survey_completed_at IS NULL
        `, { replacements: [meetingId], type: QueryTypes.SELECT });

        return result.map(r => r.full_name);
    }

    /**
     * Verificar si todas las encuestas están completas (legacy - mantenido por compatibilidad)
     */
    async checkAndGeneratePitch(meetingId) {
        const result = await sequelize.query(`
            SELECT check_meeting_surveys_complete(?) as complete
        `, { replacements: [meetingId], type: QueryTypes.SELECT });

        if (result[0]?.complete) {
            console.log('✅ [SALES-ORCH] Todas las encuestas completas, generando pitch...');
            await this.generatePitch(meetingId);
        }
    }

    // =========================================================================
    // GENERACIÓN DE PITCH CON BRAIN
    // =========================================================================

    /**
     * Generar pitch personalizado usando BrainHub
     */
    async generatePitch(meetingId) {
        await this.initialize();

        try {
            const meeting = await this.getMeetingById(meetingId);
            const attendees = await this.getMeetingAttendees(meetingId);
            const consolidatedInterests = await this.getConsolidatedInterests(meetingId);

            // Generar pitch para cada asistente
            const attendeePitches = [];
            for (const attendee of attendees) {
                const attendeeInterests = await this.getAttendeeInterests(attendee.id);
                const pitch = await this.generateAttendeePitch(attendee, attendeeInterests, meeting);
                attendeePitches.push({ attendee, pitch });

                // Guardar pitch del asistente
                await sequelize.query(`
                    UPDATE sales_meeting_attendees
                    SET personal_pitch_data = ?, updated_at = NOW()
                    WHERE id = ?
                `, { replacements: [JSON.stringify(pitch), attendee.id] });
            }

            // Generar pitch consolidado para vendedor
            const vendorPitch = await this.generateVendorPitch(meeting, attendees, consolidatedInterests);

            // Guardar pitches en la reunión
            await sequelize.query(`
                UPDATE sales_meetings
                SET status = 'pitch_ready',
                    pitch_generated_at = NOW(),
                    pitch_data = ?,
                    vendor_pitch_data = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, {
                replacements: [
                    JSON.stringify(attendeePitches),
                    JSON.stringify(vendorPitch),
                    meetingId
                ]
            });

            console.log('✅ [SALES-ORCH] Pitch generado para reunión:', meetingId);

            // Notificar al vendedor que el pitch está listo
            await this.notifyPitchReady(meeting, vendorPitch);

            return { success: true, vendorPitch, attendeePitches };

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error generando pitch:', error);
            throw error;
        }
    }

    /**
     * Generar pitch para un asistente específico
     */
    async generateAttendeePitch(attendee, interests, meeting) {
        const modules = [];

        for (const interest of interests) {
            // Obtener info del módulo desde Brain
            let moduleContext = null;
            if (this.brainHub && this.brainHub.isInitialized) {
                try {
                    const allModules = this.brainHub.getAllModules();
                    moduleContext = allModules.find(m => m.key === interest.module_key);
                } catch (e) {
                    console.warn('⚠️ [SALES-ORCH] Error obteniendo contexto de Brain');
                }
            }

            // Obtener descripción comercial
            const descResult = await sequelize.query(`
                SELECT * FROM sales_module_descriptions WHERE module_key = ?
            `, { replacements: [interest.module_key], type: QueryTypes.SELECT });
            const desc = descResult[0] || {};

            modules.push({
                key: interest.module_key,
                name: interest.module_name || desc.short_description,
                interestLevel: interest.interest_level,
                priority: interest.priority_order,
                description: desc.sales_pitch || moduleContext?.description || '',
                benefits: desc.key_benefits || [],
                icon: desc.icon || 'fa-cube',
                color: desc.color || '#3b82f6',
                screenshotUrl: desc.screenshot_url,
                dependencies: moduleContext?.dependencies || [],
                relatedModules: moduleContext?.integrations || []
            });
        }

        // Ordenar por prioridad e interés
        modules.sort((a, b) => {
            const interestOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return (interestOrder[a.interestLevel] || 4) - (interestOrder[b.interestLevel] || 4);
        });

        // Calcular tiempo por módulo según duración disponible
        const timePerModule = Math.floor(meeting.meeting_duration_minutes / Math.max(modules.length, 1));

        return {
            attendee: {
                name: attendee.full_name,
                role: attendee.job_title,
                focus: attendee.preferred_focus
            },
            modules: modules,
            recommendedOrder: modules.map(m => m.key),
            timeAllocation: modules.map(m => ({
                module: m.key,
                minutes: timePerModule,
                depth: m.interestLevel === 'critical' ? 'detailed' :
                       m.interestLevel === 'high' ? 'standard' : 'brief'
            })),
            totalModules: modules.length,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Generar pitch consolidado para vendedor
     */
    async generateVendorPitch(meeting, attendees, consolidatedInterests) {
        const moduleAttendeeMap = {};
        const allModules = [];

        // Mapear qué asistente está interesado en qué módulo
        for (const interest of consolidatedInterests) {
            if (!moduleAttendeeMap[interest.module_key]) {
                moduleAttendeeMap[interest.module_key] = {
                    moduleKey: interest.module_key,
                    moduleName: interest.module_name,
                    interestedAttendees: [],
                    maxInterest: interest.max_interest_level
                };
            }
            moduleAttendeeMap[interest.module_key].interestedAttendees = interest.interested_attendees;
        }

        // Obtener info completa de cada módulo
        for (const [moduleKey, moduleInfo] of Object.entries(moduleAttendeeMap)) {
            const descResult = await sequelize.query(`
                SELECT * FROM sales_module_descriptions WHERE module_key = ?
            `, { replacements: [moduleKey], type: QueryTypes.SELECT });
            const desc = descResult[0] || {};

            // Obtener dependencias del Brain
            let dependencies = [];
            let relatedModules = [];
            if (this.brainHub && this.brainHub.isInitialized) {
                try {
                    const impact = this.brainHub.whatIfFails(moduleKey);
                    dependencies = impact?.dependencies || [];
                    relatedModules = impact?.directlyAffected?.map(m => m.key || m) || [];
                } catch (e) { }
            }

            allModules.push({
                key: moduleKey,
                name: moduleInfo.moduleName || desc.short_description,
                interestedAttendees: moduleInfo.interestedAttendees,
                maxInterest: moduleInfo.maxInterest,
                description: desc.sales_pitch || '',
                benefits: desc.key_benefits || [],
                icon: desc.icon || 'fa-cube',
                color: desc.color || '#3b82f6',
                screenshotUrl: desc.screenshot_url,
                dependencies: dependencies,
                relatedModules: relatedModules,
                targetTip: `Dirigirse a: ${moduleInfo.interestedAttendees.join(', ')}`
            });
        }

        // Ordenar por cantidad de interesados y nivel de interés
        allModules.sort((a, b) => {
            const interestOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const aOrder = interestOrder[a.maxInterest] || 4;
            const bOrder = interestOrder[b.maxInterest] || 4;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return b.interestedAttendees.length - a.interestedAttendees.length;
        });

        // Calcular tiempo por módulo
        const totalMinutes = meeting.meeting_duration_minutes;
        const introTime = 5; // 5 min intro
        const closingTime = 10; // 10 min cierre
        const availableTime = totalMinutes - introTime - closingTime;
        const timePerModule = Math.floor(availableTime / Math.max(allModules.length, 1));

        return {
            meeting: {
                company: meeting.prospect_company_name,
                date: meeting.meeting_date,
                time: meeting.meeting_time,
                duration: meeting.meeting_duration_minutes,
                location: meeting.meeting_location
            },
            attendees: attendees.map(a => ({
                name: a.full_name,
                role: a.job_title,
                focus: a.preferred_focus,
                isDecisionMaker: a.is_decision_maker
            })),
            modules: allModules,
            roadmap: {
                intro: { minutes: introTime, notes: 'Presentación y confirmación de agenda' },
                modules: allModules.map((m, i) => ({
                    order: i + 1,
                    module: m.key,
                    name: m.name,
                    minutes: timePerModule,
                    targetAttendees: m.interestedAttendees,
                    depth: m.maxInterest === 'critical' ? 'detailed' :
                           m.maxInterest === 'high' ? 'standard' : 'brief'
                })),
                closing: { minutes: closingTime, notes: 'Preguntas, próximos pasos, presupuesto' }
            },
            totalModules: allModules.length,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Obtener intereses consolidados de toda la reunión
     */
    async getConsolidatedInterests(meetingId) {
        const result = await sequelize.query(`
            SELECT * FROM get_meeting_consolidated_interests(?)
        `, { replacements: [meetingId], type: QueryTypes.SELECT });
        return result;
    }

    /**
     * Obtener intereses de un asistente específico
     */
    async getAttendeeInterests(attendeeId) {
        const result = await sequelize.query(`
            SELECT * FROM sales_meeting_module_interests
            WHERE attendee_id = ? AND interest_level IN ('medium', 'high', 'critical')
            ORDER BY
                CASE interest_level
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    ELSE 4
                END,
                priority_order NULLS LAST
        `, { replacements: [attendeeId], type: QueryTypes.SELECT });
        return result;
    }

    // =========================================================================
    // EJECUCIÓN DE REUNIÓN
    // =========================================================================

    /**
     * Enviar recordatorio 24h antes
     */
    async sendReminder24h(meetingId) {
        const meeting = await this.getMeetingById(meetingId);
        if (!meeting) return;

        const attendees = await this.getMeetingAttendees(meetingId);

        for (const attendee of attendees) {
            if (attendee.wants_reminder) {
                await this.sendReminderEmail(meeting, attendee);
            }
        }

        await sequelize.query(`
            UPDATE sales_meetings
            SET status = 'reminder_sent', reminder_sent_at = NOW(), updated_at = NOW()
            WHERE id = ?
        `, { replacements: [meetingId] });
    }

    /**
     * Iniciar reunión (envía mensaje de bienvenida)
     */
    async startMeeting(meetingId) {
        await this.initialize();

        const meeting = await this.getMeetingById(meetingId);
        if (!meeting) throw new Error('Reunión no encontrada');

        const attendees = await this.getMeetingAttendees(meetingId);
        const vendor = await this.getVendorInfo(meeting.assigned_vendor_id);

        // Enviar mensaje de bienvenida a todos los asistentes
        for (const attendee of attendees) {
            await this.sendWelcomeEmail(meeting, attendee, vendor);
        }

        await sequelize.query(`
            UPDATE sales_meetings
            SET status = 'in_progress',
                meeting_started_at = NOW(),
                welcome_message_sent_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `, { replacements: [meetingId] });

        return { success: true, message: 'Reunión iniciada, mensaje de bienvenida enviado' };
    }

    /**
     * Finalizar reunión
     */
    async endMeeting(meetingId) {
        await this.initialize();

        try {
            const meeting = await this.getMeetingById(meetingId);
            const attendees = await this.getMeetingAttendees(meetingId);
            const vendor = await this.getVendorInfo(meeting.assigned_vendor_id);

            // Actualizar status
            await sequelize.query(`
                UPDATE sales_meetings
                SET status = 'feedback_pending',
                    meeting_ended_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            `, { replacements: [meetingId] });

            // Enviar email de agradecimiento a cada participante
            let sentCount = 0;
            for (const attendee of attendees) {
                if (!attendee.email) continue;

                const html = this.generateThankYouEmailHTML(meeting, attendee, vendor);

                await this.sendEmail({
                    to: attendee.email,
                    subject: `🙏 Gracias por tu tiempo - ${meeting.prospect_company_name} | APONNT`,
                    html
                });

                sentCount++;
                console.log(`📧 [SALES-ORCH] Email de agradecimiento enviado a ${attendee.email}`);
            }

            return {
                success: true,
                message: `Reunión finalizada. Email de agradecimiento enviado a ${sentCount} participante(s). Recuerde cargar el feedback dentro de 24h.`,
                sentCount
            };

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error finalizando reunión:', error);
            throw error;
        }
    }

    /**
     * Generar el Flyer/Banner promocional para incluir en todos los emails
     * Un diseño profesional con acceso a demo y web institucional
     */
    generatePromoFlyer() {
        return `
            <!-- ═══════════════════════════════════════════════════════════════════════════ -->
            <!-- FLYER PROMOCIONAL APONNT - Incluir en todos los emails -->
            <!-- ═══════════════════════════════════════════════════════════════════════════ -->
            <div style="margin: 30px 0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15);">
                <!-- Header del Flyer -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); padding: 30px; text-align: center;">
                    <div style="display: inline-block; margin-bottom: 15px;">
                        <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 18px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(245,158,11,0.4);">
                            <span style="color: white; font-size: 38px; font-weight: bold;">A</span>
                        </div>
                    </div>
                    <h2 style="color: #f59e0b; font-size: 32px; margin: 0; font-weight: 800; letter-spacing: -1px;">APONNT 360º</h2>
                    <p style="color: #8b5cf6; font-size: 14px; margin: 5px 0 0 0; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;">Intelligent Ecosystem</p>
                    <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 10px 0 0 0; letter-spacing: 1px;">SaaS B2B Multi-Tenant</p>
                </div>

                <!-- Contenido del Flyer -->
                <div style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); padding: 30px;">
                    <p style="text-align: center; color: #1f2937; font-size: 18px; margin: 0 0 25px 0; font-weight: 500;">
                        Descubrí el ecosistema que está transformando<br>
                        la gestión empresarial en Latinoamérica
                    </p>

                    <!-- Features Icons -->
                    <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 25px; flex-wrap: wrap;">
                        <div style="text-align: center; width: 80px;">
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 22px;">👥</span>
                            </div>
                            <span style="font-size: 11px; color: #6b7280;">RRHH</span>
                        </div>
                        <div style="text-align: center; width: 80px;">
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 22px;">⏰</span>
                            </div>
                            <span style="font-size: 11px; color: #6b7280;">Asistencia</span>
                        </div>
                        <div style="text-align: center; width: 80px;">
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 22px;">💰</span>
                            </div>
                            <span style="font-size: 11px; color: #6b7280;">Nómina</span>
                        </div>
                        <div style="text-align: center; width: 80px;">
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 22px;">📊</span>
                            </div>
                            <span style="font-size: 11px; color: #6b7280;">Analytics</span>
                        </div>
                        <div style="text-align: center; width: 80px;">
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #ec4899, #db2777); border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 22px;">🤖</span>
                            </div>
                            <span style="font-size: 11px; color: #6b7280;">IA</span>
                        </div>
                    </div>

                    <!-- Botón Web -->
                    <div style="text-align: center; margin-bottom: 25px;">
                        <a href="https://www.aponnt.com" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; text-decoration: none; padding: 15px 40px; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(245,158,11,0.4); transition: transform 0.2s;">
                            🌐 Visitar www.aponnt.com
                        </a>
                    </div>

                    <!-- Separador -->
                    <div style="border-top: 2px dashed #e5e7eb; margin: 25px 0;"></div>

                    <!-- Acceso Demo -->
                    <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); border-radius: 16px; padding: 25px; text-align: center;">
                        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); display: inline-block; padding: 5px 20px; border-radius: 20px; margin-bottom: 15px;">
                            <span style="color: white; font-size: 12px; font-weight: 600;">🎮 ACCESO DEMO GRATUITO</span>
                        </div>
                        <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 20px 0;">
                            Explorá la plataforma completa sin compromiso
                        </p>

                        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                            <table style="width: 100%; max-width: 300px; margin: 0 auto; text-align: left;">
                                <tr>
                                    <td style="color: #9ca3af; padding: 5px 10px; font-size: 13px;">🔗 URL:</td>
                                    <td style="color: #3b82f6; padding: 5px 10px; font-size: 13px; font-weight: 600;">aponnt.onrender.com</td>
                                </tr>
                                <tr>
                                    <td style="color: #9ca3af; padding: 5px 10px; font-size: 13px;">🏢 Empresa:</td>
                                    <td style="color: white; padding: 5px 10px; font-size: 13px; font-weight: 600;">aponnt-empresa-demo</td>
                                </tr>
                                <tr>
                                    <td style="color: #9ca3af; padding: 5px 10px; font-size: 13px;">👤 Usuario:</td>
                                    <td style="color: white; padding: 5px 10px; font-size: 13px; font-weight: 600;">demo-viewer</td>
                                </tr>
                                <tr>
                                    <td style="color: #9ca3af; padding: 5px 10px; font-size: 13px;">🔑 Clave:</td>
                                    <td style="color: #22c55e; padding: 5px 10px; font-size: 13px; font-weight: 600; font-family: monospace;">Demo2025!</td>
                                </tr>
                            </table>
                        </div>

                        <a href="https://www.aponnt.com/panel-empresa.html" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: 600; font-size: 14px;">
                            🚀 Ingresar a la Demo
                        </a>
                    </div>
                </div>

                <!-- Footer del Flyer -->
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 15px; text-align: center;">
                    <p style="color: white; margin: 0; font-size: 13px; font-weight: 500;">
                        +50 módulos integrados • +200 empresas confían en nosotros • Soporte 24/7
                    </p>
                </div>
            </div>
            <!-- ═══════════════════════════════════════════════════════════════════════════ -->
        `;
    }

    /**
     * 🤖 FLYER INNOVADOR: "Preguntale a tu IA Favorita"
     * Invita al prospecto a consultar a ChatGPT, Claude, Gemini sobre APONNT
     * La página www.aponnt.com tiene metadata optimizada para que las IAs puedan evaluarnos
     * @param {string} leadName - Nombre del lead para personalizar el saludo
     * @param {string} language - Idioma del flyer (es, en, pt, etc.)
     */
    generateAskYourAIFlyer(leadName = '', language = 'es') {
        // Extraer primer nombre para saludo más personal
        const firstName = leadName ? leadName.split(' ')[0] : '';
        const greeting = firstName ? `Hola ${firstName},` : 'Hola,';

        return `
            <!-- ═══════════════════════════════════════════════════════════════════════════ -->
            <!-- FLYER INNOVADOR: PREGUNTALE A TU IA FAVORITA -->
            <!-- ═══════════════════════════════════════════════════════════════════════════ -->
            <div style="margin: 30px 0; border-radius: 24px; overflow: hidden; box-shadow: 0 15px 50px rgba(0,0,0,0.2);">

                <!-- ═══════════════════════════════════════════════════════════════════════════ -->
                <!-- HEADER BRANDING APONNT -->
                <!-- ═══════════════════════════════════════════════════════════════════════════ -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); padding: 30px; text-align: center;">
                    <!-- Logo APONNT -->
                    <div style="display: inline-flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(245,158,11,0.3);">
                            <span style="color: white; font-size: 32px; font-weight: bold;">A</span>
                        </div>
                        <div style="text-align: left;">
                            <div style="font-size: 32px; font-weight: 800; color: #f59e0b; letter-spacing: -0.5px;">APONNT</div>
                            <div style="font-size: 18px; font-weight: 700; color: #8b5cf6;">360º</div>
                        </div>
                    </div>
                    <div style="font-size: 14px; color: #a78bfa; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px;">
                        Intelligent Ecosystem
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 10px;">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.6); line-height: 1.6; max-width: 450px; margin: 0 auto;">
                            Ecosistema Inteligente de Administración y Planificación de Recursos Empresariales<br>
                            <span style="color: rgba(255,255,255,0.4);">SaaS B2B • Biometría • RRHH • IA Predictiva • 6 idiomas</span>
                        </div>
                    </div>
                </div>

                <!-- Saludo Personalizado -->
                <div style="background: #faf5ff; padding: 25px 30px; border-bottom: 1px solid #e9d5ff;">
                    <p style="margin: 0; font-size: 20px; color: #4c1d95; font-weight: 600;">
                        ${greeting}
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 15px; color: #6b7280; line-height: 1.5;">
                        Te escribimos desde <strong>APONNT</strong> con una propuesta diferente: en lugar de hablarte maravillas de nuestro sistema, te invitamos a que consultes a una <strong>IA imparcial</strong> sobre nosotros.
                    </p>
                </div>

                <!-- Header Llamativo -->
                <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%); padding: 35px 30px; text-align: center; position: relative;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"20\" cy=\"20\" r=\"2\" fill=\"rgba(255,255,255,0.1)\"/><circle cx=\"80\" cy=\"80\" r=\"3\" fill=\"rgba(255,255,255,0.1)\"/><circle cx=\"60\" cy=\"30\" r=\"1.5\" fill=\"rgba(255,255,255,0.1)\"/></svg>'); opacity: 0.5;"></div>

                    <!-- Iconos de IAs -->
                    <div style="margin-bottom: 20px; position: relative;">
                        <span style="font-size: 50px; margin: 0 5px;">🤖</span>
                        <span style="font-size: 35px; margin: 0 5px; vertical-align: middle;">💬</span>
                        <span style="font-size: 50px; margin: 0 5px;">🧠</span>
                    </div>

                    <h2 style="color: white; font-size: 28px; margin: 0 0 10px 0; font-weight: 800; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                        ¿Querés una opinión imparcial?
                    </h2>
                    <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 0; font-weight: 500;">
                        Preguntale a tu IA favorita sobre nosotros
                    </p>
                </div>

                <!-- Contenido Principal -->
                <div style="background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%); padding: 30px;">
                    <p style="text-align: center; color: #4b5563; font-size: 15px; margin: 0 0 25px 0; line-height: 1.6;">
                        <strong>Preguntale a tu IA de confianza</strong> acerca de nosotros y nuestra competencia a nivel mundial.<br>
                        Nuestra web tiene información estructurada para que las IAs puedan evaluarnos objetivamente.
                    </p>

                    <!-- Logos de IAs -->
                    <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 25px; flex-wrap: wrap;">
                        <div style="text-align: center;">
                            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10a37f, #0d8c6d); border-radius: 15px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(16,163,127,0.3);">
                                <span style="color: white; font-size: 28px; font-weight: bold;">G</span>
                            </div>
                            <span style="font-size: 12px; color: #6b7280; font-weight: 500;">ChatGPT</span>
                        </div>
                        <div style="text-align: center;">
                            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #d97706, #b45309); border-radius: 15px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(217,119,6,0.3);">
                                <span style="color: white; font-size: 28px; font-weight: bold;">C</span>
                            </div>
                            <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Claude</span>
                        </div>
                        <div style="text-align: center;">
                            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #4285f4, #1a73e8); border-radius: 15px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(66,133,244,0.3);">
                                <span style="color: white; font-size: 28px; font-weight: bold;">G</span>
                            </div>
                            <span style="font-size: 12px; color: #6b7280; font-weight: 500;">Gemini</span>
                        </div>
                    </div>

                    <!-- Prompt Sugerido -->
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 25px; margin-bottom: 25px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
                            💡 Copiá y pegá este prompt en tu IA favorita:
                        </p>
                        <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 15px; border-left: 4px solid #8b5cf6;">
                            <p style="color: #e2e8f0; font-size: 14px; margin: 0; font-family: monospace; line-height: 1.6;">
                                "Accedé a esta URL y analizá el JSON: https://www.aponnt.com/llm-context.json
                                Comparalo con otros software de RRHH del mercado.
                                Dame una evaluación objetiva de las ventajas de APONNT para gestión de RRHH."
                            </p>
                        </div>
                        <p style="color: #64748b; font-size: 11px; margin: 15px 0 0 0; text-align: right;">
                            📋 Hacé click derecho → Copiar
                        </p>
                    </div>

                    <!-- URL alternativa -->
                    <div style="background: rgba(139,92,246,0.1); border-radius: 8px; padding: 12px; margin-bottom: 20px; border: 1px dashed rgba(139,92,246,0.3);">
                        <p style="color: #a78bfa; font-size: 12px; margin: 0; text-align: center;">
                            💡 <strong>Tip:</strong> Si tu IA no puede acceder al link, copiá el contenido de
                            <a href="https://www.aponnt.com/llm-context.json" target="_blank" style="color: #c4b5fd; text-decoration: underline;">este archivo JSON</a>
                            y pegalo directamente en el chat.
                        </p>
                    </div>

                    <!-- Por qué funciona -->
                    <div style="background: #fef3c7; border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b;">
                        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                            <strong>¿Por qué esto funciona?</strong><br>
                            El archivo contiene <strong>metadata estructurada</strong> (JSON-LD, schema.org) que las IAs pueden analizar.
                            No hay marketing exagerado, solo información técnica verificable:
                            <strong>22 módulos, IA local con Ollama, multi-idioma, multi-tenant</strong>.
                        </p>
                    </div>
                </div>

                <!-- Sección "¿Te interesa?" -->
                <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 25px 30px;">
                    <h3 style="color: white; font-size: 20px; margin: 0 0 15px 0; text-align: center; font-weight: 700;">
                        🤝 ¿Te gustó lo que viste? ¡Hablemos!
                    </h3>
                    <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 15px 0; text-align: center; line-height: 1.6;">
                        Si estás interesado, podés solicitar una <strong>reunión presencial o virtual</strong> con nuestro equipo de ventas:
                    </p>
                    <div style="text-align: center; margin-bottom: 15px;">
                        <a href="mailto:aponntcomercial@gmail.com?subject=Solicitud%20de%20reunión%20-%20APONNT" style="display: inline-block; background: white; color: #059669; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                            📧 aponntcomercial@gmail.com
                        </a>
                    </div>
                </div>

                <!-- Demo gratuita -->
                <div style="background: #1e293b; padding: 25px 30px;">
                    <h4 style="color: #f59e0b; font-size: 16px; margin: 0 0 15px 0; text-align: center;">
                        🎮 O probá la demo gratuita ahora mismo
                    </h4>
                    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.1);">
                        <ol style="color: #e2e8f0; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li>Ingresá a <a href="https://www.aponnt.com/panel-empresa.html" style="color: #a78bfa; text-decoration: none; font-weight: 600;">www.aponnt.com/panel-empresa.html</a></li>
                            <li>En <strong>Empresa:</strong> escribí <code style="background: rgba(139,92,246,0.2); padding: 2px 6px; border-radius: 4px; color: #c4b5fd;">aponnt-empresa-demo</code></li>
                            <li>En <strong>Usuario:</strong> escribí <code style="background: rgba(139,92,246,0.2); padding: 2px 6px; border-radius: 4px; color: #c4b5fd;">demo-viewer</code></li>
                            <li>En <strong>Contraseña:</strong> escribí <code style="background: rgba(139,92,246,0.2); padding: 2px 6px; border-radius: 4px; color: #c4b5fd;">Demo2025!</code></li>
                            <li>¡Listo! Explorá todos los módulos libremente 🚀</li>
                        </ol>
                    </div>
                </div>

                <!-- CTA Footer -->
                <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 20px; text-align: center;">
                    <a href="https://www.aponnt.com" style="display: inline-block; background: white; color: #4f46e5; text-decoration: none; padding: 14px 35px; border-radius: 30px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                        🌐 Visitar www.aponnt.com
                    </a>
                    <p style="color: rgba(255,255,255,0.7); font-size: 11px; margin: 15px 0 0 0;">
                        © ${new Date().getFullYear()} APONNT 360º • Intelligent Ecosystem • SaaS B2B Multi-Tenant
                    </p>
                </div>
            </div>
            <!-- ═══════════════════════════════════════════════════════════════════════════ -->
        `;
    }

    /**
     * 📱 VERSIÓN WHATSAPP del flyer "Preguntale a tu IA"
     * Texto plano para compartir por WhatsApp
     * @param {string} leadName - Nombre del lead para personalizar el saludo
     * @param {string} language - Idioma del flyer (es, en, pt, etc.)
     */
    generateAskYourAIWhatsApp(leadName = '', language = 'es') {
        // Extraer primer nombre para saludo más personal
        const firstName = leadName ? leadName.split(' ')[0] : '';
        const greeting = firstName ? `Hola ${firstName}! 👋` : 'Hola! 👋';

        return `━━━━━━━━━━━━━━━━━━━━━
🅰️ *APONNT 360º*
_Intelligent Ecosystem_
━━━━━━━━━━━━━━━━━━━━━
Ecosistema Inteligente de Administración y Planificación de Recursos Empresariales

SaaS B2B • Biometría • RRHH • IA Predictiva • 6 idiomas
━━━━━━━━━━━━━━━━━━━━━

${greeting}

🤖 *¿Querés una opinión IMPARCIAL sobre software de RRHH?*

*Preguntale a tu IA de confianza* acerca de nosotros y nuestra competencia a nivel mundial.

💬 *Copiá este prompt y pegalo en ChatGPT, Claude o Gemini:*

---
_"Accedé a esta URL y analizá el JSON: https://www.aponnt.com/llm-context.json
Comparalo con otros software de RRHH del mercado.
Dame una evaluación objetiva de las ventajas de APONNT para gestión de RRHH."_
---

💡 *Tip:* Si tu IA no puede acceder al link, abrí el link en tu navegador, copiá todo el contenido y pegalo en el chat.

✅ *¿Por qué funciona?*
El archivo contiene metadata estructurada que las IAs pueden analizar: 22 módulos, IA local con Ollama, multi-idioma, multi-tenant.

━━━━━━━━━━━━━━━━━━━━━
🤝 *¿Te gustó lo que viste?*
━━━━━━━━━━━━━━━━━━━━━

Si estás interesado, podés solicitar una *reunión presencial o virtual* con nuestro equipo de ventas:

📧 *aponntcomercial@gmail.com*

━━━━━━━━━━━━━━━━━━━━━
🎮 *O probá la demo gratis:*
━━━━━━━━━━━━━━━━━━━━━

1️⃣ Ingresá a: www.aponnt.com/panel-empresa.html
2️⃣ Empresa: *aponnt-empresa-demo*
3️⃣ Usuario: *demo-viewer*
4️⃣ Clave: *Demo2025!*
5️⃣ ¡Listo! Explorá todos los módulos 🚀

🌐 www.aponnt.com

━━━━━━━━━━━━━━━━━━━━━
_APONNT 360º - Intelligent Ecosystem_
Plataforma SaaS B2B de gestión de asistencias, biometría y recursos humanos.`;
    }

    /**
     * Generar email de agradecimiento post-reunión
     */
    generateThankYouEmailHTML(meeting, attendee, vendor) {
        return `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
                <!-- Header con branding APONNT -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); padding: 35px 30px; text-align: center;">
                    <div style="margin-bottom: 15px;">
                        <div style="display: inline-flex; align-items: center; gap: 15px;">
                            <div style="width: 55px; height: 55px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(245,158,11,0.3);">
                                <span style="color: white; font-size: 28px; font-weight: bold;">A</span>
                            </div>
                            <div style="text-align: left;">
                                <div style="font-size: 28px; font-weight: 800; color: #f59e0b; letter-spacing: -0.5px;">APONNT 360º</div>
                                <div style="font-size: 11px; color: #8b5cf6; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Intelligent Ecosystem</div>
                            </div>
                        </div>
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: 5px;">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 1px; margin-bottom: 4px;">SaaS B2B Multi-Tenant</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.4); font-style: italic;">Ecosistema Inteligente de Administración y Planificación de Recursos Empresariales</div>
                    </div>
                </div>

                <!-- Contenido principal -->
                <div style="padding: 30px;">
                    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                        <h1 style="color: white; font-size: 24px; margin: 0;">🙏 ¡Gracias por tu tiempo!</h1>
                    </div>

                    <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                        Hola <strong>${attendee.full_name}</strong>,
                    </p>

                    <p style="color: #6b7280; font-size: 15px; margin: 0 0 20px 0;">
                        Fue un placer reunirnos contigo y con el equipo de <strong>${meeting.prospect_company_name}</strong>.
                        Esperamos que la presentación de <strong>APONNT 360º</strong> haya sido de tu interés.
                    </p>

                    <!-- Próximos pasos -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📋 Próximos Pasos</h3>
                        <ul style="color: #374151; padding-left: 20px; margin: 0;">
                            <li style="margin-bottom: 8px;">Te enviaremos un presupuesto personalizado basado en tus intereses</li>
                            <li style="margin-bottom: 8px;">Podés acceder a la demo en cualquier momento para explorar los módulos</li>
                            <li style="margin-bottom: 8px;">Estaremos disponibles para cualquier consulta o aclaración</li>
                        </ul>
                    </div>

                    <!-- CTA Demo -->
                    <div style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                        <p style="color: #5b21b6; margin: 0 0 15px 0; font-size: 15px;">
                            ¿Querés seguir explorando la plataforma?
                        </p>
                        <a href="https://www.aponnt.com" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; text-decoration: none; padding: 12px 30px; border-radius: 10px; font-weight: 600;">
                            🌐 Visitar www.aponnt.com
                        </a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; text-align: center;">
                        Cualquier duda o consulta, no dudes en contactarnos.<br>
                        ¡Estamos para ayudarte!
                    </p>

                    <!-- FLYER PROMOCIONAL -->
                    ${this.generatePromoFlyer()}
                </div>

                <!-- Footer con datos del vendedor -->
                <div style="background: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;">
                            ${(vendor?.full_name || 'A').charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #1f2937; font-size: 16px;">${vendor?.full_name || 'Equipo Comercial APONNT'}</div>
                            <div style="color: #6b7280; font-size: 13px;">Tu contacto comercial</div>
                            ${vendor?.email ? `<div style="color: #6b7280; font-size: 13px;">📧 ${vendor.email}</div>` : ''}
                            ${vendor?.phone ? `<div style="color: #6b7280; font-size: 13px;">📱 ${vendor.phone}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Footer APONNT -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); padding: 20px; text-align: center;">
                    <span style="color: #f59e0b; font-weight: 700; font-size: 14px;">APONNT 360º</span>
                    <span style="color: #8b5cf6; font-size: 9px; margin-left: 8px; letter-spacing: 1px;">INTELLIGENT ECOSYSTEM</span>
                    <p style="color: rgba(255,255,255,0.3); font-size: 9px; margin: 8px 0 0 0;">
                        © ${new Date().getFullYear()} APONNT - Todos los derechos reservados |
                        <a href="https://www.aponnt.com" style="color: rgba(255,255,255,0.5);">www.aponnt.com</a>
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Cargar feedback post-reunión
     */
    async submitFeedback(meetingId, feedbackData) {
        await this.initialize();

        const meeting = await this.getMeetingById(meetingId);
        const attendees = await this.getMeetingAttendees(meetingId);

        // Guardar feedback
        await sequelize.query(`
            UPDATE sales_meetings
            SET status = 'completed',
                feedback_submitted_at = NOW(),
                feedback_data = ?,
                follow_up_required = ?,
                follow_up_type = ?,
                quote_requested = ?,
                quote_modules = ?,
                updated_at = NOW()
            WHERE id = ?
        `, {
            replacements: [
                JSON.stringify(feedbackData),
                feedbackData.followUpRequired || false,
                feedbackData.followUpType,
                feedbackData.quoteRequested || false,
                JSON.stringify(feedbackData.quoteModules || []),
                meetingId
            ]
        });

        // Enviar encuesta de satisfacción a asistentes
        for (const attendee of attendees) {
            await this.sendSatisfactionEmail(meeting, attendee);
        }

        await sequelize.query(`
            UPDATE sales_meetings
            SET satisfaction_sent_at = NOW()
            WHERE id = ?
        `, { replacements: [meetingId] });

        return { success: true, message: 'Feedback registrado. Encuesta de satisfacción enviada a asistentes.' };
    }

    // =========================================================================
    // EMAILS
    // =========================================================================

    /**
     * Enviar email de encuesta
     */
    async sendSurveyEmail(meeting, attendee, modules) {
        console.log(`📧 [SALES-ORCH] sendSurveyEmail() iniciado`);
        console.log(`   Reunión: ${meeting?.id} - ${meeting?.prospect_company_name}`);
        console.log(`   Asistente: ${attendee?.email}`);

        // Obtener info del vendedor asignado
        const vendor = await this.getVendorInfo(meeting.assigned_vendor_id);
        console.log(`   Vendedor: ${vendor?.full_name || 'No asignado'}`);

        const surveyUrl = `${process.env.APP_URL || 'http://localhost:9998'}/survey/${attendee.survey_token}`;

        const modulesList = modules ? modules.map(m => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px;">
                    <i class="${m.icon}" style="color: ${m.color}; margin-right: 8px;"></i>
                    <strong>${m.short_description}</strong>
                </td>
            </tr>
        `).join('') : '';

        const html = this.getEmailTemplate('survey', {
            attendeeName: attendee.full_name,
            companyName: meeting.prospect_company_name,
            meetingDate: this.formatDate(meeting.meeting_date),
            meetingTime: meeting.meeting_time,
            meetingLocation: meeting.meeting_location || meeting.meeting_platform || 'Virtual',
            vendorName: vendor?.full_name || 'APONNT Comercial',
            vendorEmail: vendor?.email || 'comercial@aponnt.com',
            vendorPhone: vendor?.phone || '',
            vendorInitial: vendor?.full_name?.charAt(0) || 'A',
            surveyUrl,
            modulesList
        });

        console.log(`   📤 Enviando email a: ${attendee.email}...`);
        const emailResult = await this.sendEmail({
            to: attendee.email,
            subject: `📋 ${meeting.prospect_company_name} - Preparemos tu reunión con APONNT`,
            html
        });
        console.log(`   ✅ Email enviado: ${emailResult ? 'OK' : 'FALLÓ'}`);

        await sequelize.query(`
            UPDATE sales_meeting_attendees
            SET survey_sent_at = NOW()
            WHERE id = ?
        `, { replacements: [attendee.id] });

        await this.logCommunication(meeting.id, attendee.id, 'survey_invite', 'email');
    }

    /**
     * Enviar email de recordatorio
     */
    async sendReminderEmail(meeting, attendee) {
        const html = this.getEmailTemplate('reminder', {
            attendeeName: attendee.full_name,
            companyName: meeting.prospect_company_name,
            meetingDate: this.formatDate(meeting.meeting_date),
            meetingTime: meeting.meeting_time,
            meetingLocation: meeting.meeting_location || 'Virtual',
            meetingLink: meeting.meeting_link
        });

        await this.sendEmail({
            to: attendee.email,
            subject: `⏰ Recordatorio: Reunión mañana - APONNT`,
            html
        });

        await this.logCommunication(meeting.id, attendee.id, 'reminder', 'email');
    }

    /**
     * Enviar email de bienvenida (inicio de reunión)
     */
    async sendWelcomeEmail(meeting, attendee, vendor) {
        const html = this.getEmailTemplate('welcome', {
            attendeeName: attendee.full_name,
            vendorName: vendor?.full_name || 'APONNT',
            companyName: meeting.prospect_company_name
        });

        await this.sendEmail({
            to: attendee.email,
            subject: `🎉 ¡Comenzamos! Reunión APONNT`,
            html
        });

        await this.logCommunication(meeting.id, attendee.id, 'welcome', 'email');
    }

    /**
     * Enviar email de agradecimiento y satisfacción
     */
    async sendSatisfactionEmail(meeting, attendee) {
        const satisfactionUrl = `${process.env.APP_URL || 'http://localhost:9998'}/satisfaction/${attendee.survey_token}`;

        const html = this.getEmailTemplate('satisfaction', {
            attendeeName: attendee.full_name,
            companyName: meeting.prospect_company_name,
            satisfactionUrl
        });

        await this.sendEmail({
            to: attendee.email,
            subject: `🙏 Gracias por tu tiempo - APONNT`,
            html
        });

        await sequelize.query(`
            UPDATE sales_meeting_attendees
            SET satisfaction_sent_at = NOW()
            WHERE id = ?
        `, { replacements: [attendee.id] });

        await this.logCommunication(meeting.id, attendee.id, 'thankyou', 'email');
    }

    /**
     * Enviar email genérico
     */
    async sendEmail({ to, subject, html }) {
        try {
            // Asegurar que emailService esté disponible
            if (!this.emailService) {
                this.emailService = require('./EmailService');
            }

            // Usar EmailService centralizado con tipo 'commercial' (aponntcomercial@gmail.com)
            const result = await this.emailService.sendFromAponnt('commercial', {
                to,
                subject,
                html
            });

            if (result && result.success !== false) {
                console.log(`📧 [SALES-ORCH] Email comercial enviado a ${to}`);
                return true;
            } else {
                console.error(`❌ [SALES-ORCH] Error enviando email comercial:`, result?.error || 'Error desconocido');
                return false;
            }
        } catch (error) {
            console.error(`❌ [SALES-ORCH] Error enviando email a ${to}:`, error.message);
            return false;
        }
    }

    /**
     * Registrar comunicación en historial
     */
    async logCommunication(meetingId, attendeeId, commType, channel) {
        await sequelize.query(`
            INSERT INTO sales_meeting_communications (meeting_id, attendee_id, comm_type, channel, sent_at)
            VALUES (?, ?, ?, ?, NOW())
        `, { replacements: [meetingId, attendeeId, commType, channel] });
    }

    // =========================================================================
    // TEMPLATES DE EMAIL
    // =========================================================================

    getEmailTemplate(type, data) {
        const templates = {
            survey: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5;">
    <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
        <!-- Logo Header -->
        
<div style="text-align: center; margin-bottom: 20px;">
    <div style="display: inline-block; padding: 15px 25px; background: #1a1a2e; border-radius: 12px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 5px;">
            <span style="color: #60a5fa; font-size: 32px; font-weight: 700; font-style: italic; transform: skewX(-12deg); display: inline-block;">A</span>
            <span style="color: white; font-size: 24px; font-weight: 400;">ponnt</span>
            <span style="color: #60a5fa; font-size: 16px; font-weight: 600; margin-left: 3px;">360º</span>
        </div>
        <div style="color: #60a5fa; font-size: 11px; letter-spacing: 1.5px; margin-top: 2px; font-weight: 500;">INTELLIGENT ECOSYSTEM</div>
    </div>
</div>

        <!-- Main Card -->
        <div style="background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
            <!-- Gradient Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 35px 30px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                    Preparemos tu Reunión con APONNT
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                    Solo 2 minutos para personalizar tu experiencia
                </p>
            </div>

            <!-- Content -->
            <div style="padding: 35px 30px;">
                <p style="font-size: 16px; color: #333; line-height: 1.7; margin: 0 0 20px 0;">
                    Estimado/a <strong>${data.attendeeName}</strong>,
                </p>

                <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 25px 0;">
                    Es un placer dirigirnos a usted en nombre de <strong>APONNT</strong>. Le agradecemos sinceramente
                    el tiempo que ha decidido dedicarnos para conocer nuestras soluciones de gestión empresarial.
                </p>

                <!-- Meeting Details Box -->
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 25px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
                        📋 Detalles de la Reunión
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 130px;">Empresa:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${data.companyName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Fecha:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${data.meetingDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Hora:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${data.meetingTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Lugar:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${data.meetingLocation || 'Por confirmar'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Ejecutivo:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${data.vendorName}</td>
                        </tr>
                    </table>
                </div>

                <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 25px 0;">
                    Para optimizar nuestro encuentro y enfocarnos en lo que realmente le interesa,
                    hemos preparado una breve encuesta que nos permitirá <strong>diseñar un roadmap
                    personalizado</strong> de acuerdo a sus necesidades.
                </p>

                <!-- Modules Preview -->
                <div style="background: #fafafa; padding: 20px; border-radius: 10px; margin: 25px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333; font-size: 14px; font-weight: 600;">
                        📦 Algunos módulos disponibles:
                    </h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        ${data.modulesList}
                    </table>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 35px 0;">
                    <a href="${data.surveyUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 45px; border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                        ✨ Completar Encuesta
                    </a>
                </div>

                <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
                    La encuesta le tomará aproximadamente 2 minutos
                </p>

                <!-- FLYER PROMOCIONAL -->
                ${this.generatePromoFlyer()}
            </div>

            <!-- Vendor Signature -->
            <div style="background: #f8fafc; padding: 25px 30px; border-top: 1px solid #e2e8f0;">
                <table style="width: 100%;">
                    <tr>
                        <td style="vertical-align: top; width: 60px;">
                            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 20px; font-weight: 600; line-height: 50px; text-align: center; display: block; width: 50px;">${data.vendorInitial || 'A'}</span>
                            </div>
                        </td>
                        <td style="vertical-align: top; padding-left: 15px;">
                            <p style="margin: 0; font-weight: 600; color: #1e293b; font-size: 15px;">${data.vendorName}</p>
                            <p style="margin: 3px 0 0 0; color: #64748b; font-size: 13px;">Ejecutivo Comercial | APONNT</p>
                            ${data.vendorEmail ? '<p style="margin: 3px 0 0 0; color: #64748b; font-size: 12px;">📧 ' + data.vendorEmail + '</p>' : ''}
                            ${data.vendorPhone ? '<p style="margin: 3px 0 0 0; color: #64748b; font-size: 12px;">📱 ' + data.vendorPhone + '</p>' : ''}
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 25px; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0 0 5px 0;">APONNT 360º | Intelligent Ecosystem</p>
            <p style="margin: 0;">Gestión Empresarial Inteligente con IA Local</p>
            <p style="margin: 10px 0 0 0; color: #cbd5e1;">
                Este correo fue enviado porque tiene una reunión programada con nuestro equipo comercial.
            </p>
        </div>
    </div>
</body>
</html>`,

            reminder: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px;">⏰ Recordatorio</h1>
        </div>
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px;">
            <p style="font-size: 16px; color: #333;">Hola <strong>${data.attendeeName}</strong>,</p>
            <p style="font-size: 16px; color: #333;">
                Te recordamos que <strong>mañana ${data.meetingDate}</strong> a las <strong>${data.meetingTime}</strong>
                tenemos nuestra reunión programada.
            </p>
            <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                    📍 <strong>Lugar:</strong> ${data.meetingLocation}<br>
                    ${data.meetingLink ? `🔗 <strong>Link:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a>` : ''}
                </p>
            </div>
            <p style="font-size: 14px; color: #666; text-align: center;">¡Nos vemos mañana!</p>

            <!-- FLYER PROMOCIONAL -->
            ${this.generatePromoFlyer()}
        </div>
    </div>
</body>
</html>`,

            welcome: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; border-radius: 16px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px;">🎉 ¡Bienvenidos!</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 15px 0 0 0;">
                Gracias por su tiempo.
            </p>
            <p style="color: white; font-size: 18px; margin: 20px 0 0 0;">
                <strong>${data.vendorName}</strong> está disponible para responder sus preguntas
                y recorrer juntos este roadmap personalizado.
            </p>
        </div>

        <!-- FLYER PROMOCIONAL -->
        ${this.generatePromoFlyer()}
    </div>
</body>
</html>`,

            satisfaction: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px;">🙏 ¡Gracias!</h1>
        </div>
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px;">
            <p style="font-size: 16px; color: #333;">Hola <strong>${data.attendeeName}</strong>,</p>
            <p style="font-size: 16px; color: #333;">
                Gracias por dedicar tu tiempo a conocer APONNT. Tu opinión es muy valiosa para nosotros.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.satisfactionUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 16px 40px; border-radius: 30px; text-decoration: none; font-weight: 600;">
                    ⭐ Calificar Reunión (1 min)
                </a>
            </div>
            <p style="font-size: 14px; color: #666; text-align: center;">
                Si te quedaron dudas o necesitas más información, no dudes en contactarnos.
            </p>

            <!-- FLYER PROMOCIONAL -->
            ${this.generatePromoFlyer()}
        </div>
    </div>
</body>
</html>`
        };

        return templates[type] || '';
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    
    /**
     * Reenviar encuestas a asistentes
     * @param {string} meetingId - ID de la reunión
     * @param {boolean} toAll - Si true, reenvía a todos; si false, solo a pendientes
     */
    async resendSurveys(meetingId, toAll = false) {
        try {
            const meeting = await this.getMeetingById(meetingId);
            if (!meeting) {
                throw new Error('Reunión no encontrada');
            }

            const attendees = await this.getMeetingAttendees(meetingId);

            // Filtrar: solo pendientes si toAll es false
            const targetAttendees = toAll
                ? attendees
                : attendees.filter(a => !a.survey_completed_at);

            if (targetAttendees.length === 0) {
                return {
                    success: true,
                    message: toAll ? 'No hay asistentes' : 'Todos los asistentes ya completaron la encuesta',
                    emailsSent: 0
                };
            }

            let emailsSent = 0;
            const errors = [];

            for (const attendee of targetAttendees) {
                try {
                    await this.sendSurveyEmail(meeting, attendee);
                    emailsSent++;
                    console.log(`📧 [SALES-ORCH] Encuesta reenviada a ${attendee.email}`);
                } catch (error) {
                    console.error(`❌ [SALES-ORCH] Error reenviando a ${attendee.email}:`, error.message);
                    errors.push({ email: attendee.email, error: error.message });
                }
            }

            // Actualizar timestamp de envío
            await sequelize.query(
                `UPDATE sales_meetings SET survey_sent_at = NOW(), updated_at = NOW() WHERE id = ?`,
                { replacements: [meetingId] }
            );

            return {
                success: true,
                message: `Encuestas reenviadas a ${emailsSent} de ${targetAttendees.length} asistentes`,
                emailsSent,
                totalTargeted: targetAttendees.length,
                errors: errors.length > 0 ? errors : undefined
            };
        } catch (error) {
            console.error('❌ [SALES-ORCH] Error en resendSurveys:', error);
            throw error;
        }
    }

    async getMeetingById(meetingId) {
        const result = await sequelize.query(`SELECT * FROM sales_meetings WHERE id = ?`,
            { replacements: [meetingId], type: QueryTypes.SELECT });
        return result[0];
    }

    async getMeetingAttendees(meetingId) {
        const result = await sequelize.query(`
            SELECT * FROM sales_meeting_attendees WHERE meeting_id = ? ORDER BY full_name
        `, { replacements: [meetingId], type: QueryTypes.SELECT });
        return result;
    }

    async getVendorInfo(vendorId) {
        // Si vendorId no es UUID valido (ej: SUPERADMIN), retornar null
        if (!this.isValidUUID(vendorId)) {
            return null;
        }
        const result = await sequelize.query(`
            SELECT staff_id, first_name, last_name, email, phone,
                   CONCAT(first_name, ' ', last_name) as full_name
            FROM aponnt_staff WHERE staff_id = ?
        `, { replacements: [vendorId], type: QueryTypes.SELECT });
        return result[0];
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Parsear JSON de manera segura (maneja tanto strings como objetos)
     */
    safeParseJSON(data) {
        if (!data) return null;
        if (typeof data === 'object') return data; // Ya es objeto
        try {
            return JSON.parse(data);
        } catch (e) {
            console.warn('⚠️ [SALES-ORCH] Error parseando JSON:', e.message);
            return null;
        }
    }

    /**
     * Notificar creación de reunión al vendedor y supervisor
     */
    async notifyMeetingCreated(meeting, supervisorId) {
        try {
            console.log(`📢 [SALES-ORCH] Notificando reunión ${meeting.id} a vendedor y supervisor`);

            // 1. Obtener info del vendedor asignado
            const vendor = await this.getVendorInfo(meeting.assigned_vendor_id);

            // 2. Si hay asistentes con email, enviar welcome email al primero
            const attendees = await this.getMeetingAttendees(meeting.id);
            const primaryAttendee = attendees.find(a => a.email) || attendees[0];

            if (primaryAttendee && primaryAttendee.email) {
                // Formatear fecha para el email
                const meetingDate = new Date(meeting.meeting_date).toLocaleDateString('es-AR', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });

                // Enviar email de confirmación al prospecto
                const emailHtml = this.getEmailTemplate('welcome', {
                    attendeeName: primaryAttendee.full_name || 'Estimado/a',
                    companyName: meeting.prospect_company_name,
                    meetingDate: meetingDate,
                    meetingTime: meeting.meeting_time,
                    vendorName: vendor?.full_name || 'APONNT Comercial',
                    meetingPlatform: meeting.meeting_platform || 'por definir',
                    meetingLink: meeting.meeting_link || ''
                });

                await this.sendEmail({
                    to: primaryAttendee.email,
                    subject: `🤝 Reunión confirmada: ${meeting.prospect_company_name} - APONNT`,
                    html: emailHtml
                });

                console.log(`📧 [SALES-ORCH] Email de confirmación enviado a ${primaryAttendee.email}`);
            } else {
                console.log('⚠️ [SALES-ORCH] No hay asistentes con email para notificar');
            }

        } catch (error) {
            // No fallar silenciosamente pero tampoco bloquear la creación
            console.error('❌ [SALES-ORCH] Error enviando notificación de reunión:', error.message);
        }
    }

    /**
     * Notificar que el pitch está listo
     */
    async notifyPitchReady(meeting, vendorPitch) {
        // TODO: Integrar con sistema de notificaciones existente
        console.log(`📢 [SALES-ORCH] Pitch listo para reunión ${meeting.id}`);
    }

    // =========================================================================
    // API PÚBLICA - Consultas
    // =========================================================================

    /**
     * Obtener reuniones del vendedor
     */
    async getVendorMeetings(vendorId, filters = {}) {
        // Si es SUPERADMIN o rol especial, mostrar TODAS las reuniones
        const isAdmin = !vendorId || vendorId === 'SUPERADMIN' || vendorId === 'admin';

        let query = `
            SELECT m.*,
                   CONCAT(v.first_name, ' ', v.last_name) as vendor_name,
                   (SELECT COUNT(*) FROM sales_meeting_attendees WHERE meeting_id = m.id) as attendee_count
            FROM sales_meetings m
            LEFT JOIN aponnt_staff v ON m.assigned_vendor_id = v.staff_id
        `;
        const params = [];

        // Solo filtrar por vendor si NO es admin
        if (!isAdmin) {
            query += ` WHERE m.assigned_vendor_id = ?`;
            params.push(vendorId);
        } else {
            query += ` WHERE 1=1`;  // Para que los AND funcionen
        }

        if (filters.status) {
            query += ` AND m.status = ?`;
            params.push(filters.status);
        }

        if (filters.fromDate) {
            query += ` AND m.meeting_date >= ?`;
            params.push(filters.fromDate);
        }

        query += ` ORDER BY m.meeting_date DESC, m.meeting_time DESC`;

        const result = await sequelize.query(query, { replacements: params, type: QueryTypes.SELECT });
        return result;
    }

    /**
     * Obtener detalle completo de reunión
     */
    async getMeetingDetail(meetingId) {
        const meeting = await this.getMeetingById(meetingId);
        if (!meeting) return null;

        const attendees = await this.getMeetingAttendees(meetingId);
        const vendor = await this.getVendorInfo(meeting.assigned_vendor_id);
        const interests = await this.getConsolidatedInterests(meetingId);

        return {
            ...meeting,
            vendor,
            attendees,
            consolidatedInterests: interests,
            vendorPitch: this.safeParseJSON(meeting.vendor_pitch_data)
        };
    }

    /**
     * Enviar pitch por email (individual o masivo)
     */
    async sendPitchEmail(meetingId, attendeeId = null, toAll = false) {
        try {
            const meeting = await this.getMeetingById(meetingId);
            const allAttendees = await this.getMeetingAttendees(meetingId);
            const vendor = await this.getVendorInfo(meeting.assigned_vendor_id);

            // Determinar a quién enviar
            let targetAttendees = [];
            if (attendeeId) {
                // Enviar a un asistente específico
                const attendee = allAttendees.find(a => a.id === attendeeId);
                if (attendee) targetAttendees = [attendee];
            } else if (toAll) {
                // Enviar a todos los que completaron encuesta
                targetAttendees = allAttendees.filter(a => a.survey_completed_at && a.email);
            }

            if (targetAttendees.length === 0) {
                return { success: false, error: 'No hay participantes válidos para enviar' };
            }

            let sentCount = 0;
            let lastAttendeeName = '';

            for (const attendee of targetAttendees) {
                const pitch = this.safeParseJSON(attendee.personal_pitch_data);

                // Generar HTML del pitch con logo APONNT y datos del vendedor
                const html = this.generatePitchEmailHTML(meeting, attendee, pitch, vendor);

                await this.sendEmail({
                    to: attendee.email,
                    subject: `🎯 ${meeting.prospect_company_name} - Tu Roadmap Personalizado | APONNT 360º`,
                    html
                });

                sentCount++;
                lastAttendeeName = attendee.full_name;
                console.log(`📧 [SALES-ORCH] Pitch enviado a ${attendee.email}`);
            }

            return {
                success: true,
                sentCount,
                attendeeName: lastAttendeeName,
                message: `Pitch enviado a ${sentCount} participante(s)`
            };

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error enviando pitch:', error);
            throw error;
        }
    }

    /**
     * Generar HTML del email de pitch con logo y datos del vendedor
     */
    generatePitchEmailHTML(meeting, attendee, pitch, vendor) {
        const modules = pitch?.modules || [];
        const modulesList = modules.map(m => `
            <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; margin-bottom: 10px; border-left: 4px solid ${m.color || '#667eea'};">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <i class="fas ${m.icon || 'fa-cube'}" style="color: ${m.color || '#667eea'}; font-size: 20px;"></i>
                    <strong style="color: #1f2937; font-size: 16px;">${m.name}</strong>
                    <span style="background: ${m.interestLevel === 'high' ? '#dcfce7' : m.interestLevel === 'medium' ? '#fef3c7' : '#e5e7eb'}; color: ${m.interestLevel === 'high' ? '#166534' : m.interestLevel === 'medium' ? '#92400e' : '#374151'}; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                        ${m.interestLevel === 'high' ? '🔥 Alto interés' : m.interestLevel === 'medium' ? '👍 Interés medio' : 'Interés'}
                    </span>
                </div>
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">${m.description || ''}</p>
                ${m.benefits?.length ? `
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${m.benefits.slice(0, 3).map(b => `
                            <span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 15px; font-size: 12px;">✓ ${b}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');

        return `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
                <!-- Header con branding APONNT profesional -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); padding: 35px 30px; text-align: center;">
                    <!-- Logo y nombre -->
                    <div style="margin-bottom: 15px;">
                        <div style="display: inline-flex; align-items: center; gap: 15px;">
                            <div style="width: 55px; height: 55px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(245,158,11,0.3);">
                                <span style="color: white; font-size: 28px; font-weight: bold;">A</span>
                            </div>
                            <div style="text-align: left;">
                                <div style="font-size: 28px; font-weight: 800; color: #f59e0b; letter-spacing: -0.5px;">APONNT 360º</div>
                                <div style="font-size: 11px; color: #8b5cf6; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Intelligent Ecosystem</div>
                            </div>
                        </div>
                    </div>
                    <!-- Taglines -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: 5px;">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 1px; margin-bottom: 4px;">SaaS B2B Multi-Tenant</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.4); font-style: italic;">Ecosistema Inteligente de Administración y Planificación de Recursos Empresariales</div>
                    </div>
                </div>

                <!-- Contenido principal -->
                <div style="padding: 30px;">
                    <!-- Saludo -->
                    <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 10px 0;">
                        Hola ${attendee.full_name} 👋
                    </h1>
                    <p style="color: #6b7280; font-size: 16px; margin: 0 0 25px 0;">
                        Gracias por completar la encuesta. Aquí está tu <strong>roadmap personalizado</strong> para nuestra próxima reunión.
                    </p>

                    <!-- Info de la reunión -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 20px; color: white; margin-bottom: 25px;">
                        <h2 style="margin: 0 0 15px 0; font-size: 20px;">📅 ${meeting.prospect_company_name}</h2>
                        <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                            <div>
                                <div style="opacity: 0.8; font-size: 12px;">FECHA</div>
                                <div style="font-weight: 600;">${this.formatDate(meeting.meeting_date)}</div>
                            </div>
                            <div>
                                <div style="opacity: 0.8; font-size: 12px;">HORA</div>
                                <div style="font-weight: 600;">${meeting.meeting_time?.slice(0,5) || ''}</div>
                            </div>
                            <div>
                                <div style="opacity: 0.8; font-size: 12px;">LUGAR</div>
                                <div style="font-weight: 600;">${meeting.meeting_location || 'Virtual'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Módulos de interés -->
                    <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0;">
                        🎯 Módulos que veremos juntos (${modules.length})
                    </h3>
                    ${modulesList || '<p style="color: #6b7280;">Basado en tus preferencias, prepararemos una demo personalizada.</p>'}

                    <!-- Mensaje de cierre -->
                    <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 12px; padding: 20px; margin-top: 25px;">
                        <p style="color: #166534; margin: 0; font-size: 15px;">
                            <strong>¿Tienes alguna pregunta antes de la reunión?</strong><br>
                            No dudes en contactarme directamente.
                        </p>
                    </div>
                </div>

                <!-- Footer con datos del vendedor -->
                <div style="background: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;">
                            ${(vendor?.full_name || 'A').charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #1f2937; font-size: 16px;">${vendor?.full_name || 'Equipo Comercial APONNT'}</div>
                            ${vendor?.email ? `<div style="color: #6b7280; font-size: 14px;">📧 ${vendor.email}</div>` : ''}
                            ${vendor?.phone ? `<div style="color: #6b7280; font-size: 14px;">📱 ${vendor.phone}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Footer APONNT profesional -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); padding: 25px; text-align: center;">
                    <div style="margin-bottom: 10px;">
                        <span style="color: #f59e0b; font-weight: 700; font-size: 16px;">APONNT 360º</span>
                        <span style="color: #8b5cf6; font-size: 10px; margin-left: 8px; letter-spacing: 1px;">INTELLIGENT ECOSYSTEM</span>
                    </div>
                    <div style="font-size: 9px; color: rgba(255,255,255,0.4); margin-bottom: 8px;">SaaS B2B Multi-Tenant</div>
                    <p style="color: rgba(255,255,255,0.3); font-size: 10px; margin: 0; font-style: italic;">
                        Ecosistema Inteligente de Administración y Planificación de Recursos Empresariales
                    </p>
                    <p style="color: rgba(255,255,255,0.2); font-size: 9px; margin: 10px 0 0 0;">
                        © ${new Date().getFullYear()} APONNT - Todos los derechos reservados
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Reprogramar reunión y notificar a todos los participantes
     */
    async rescheduleMeeting(meetingId, newData, rescheduledBy) {
        await this.initialize();

        try {
            const oldMeeting = await this.getMeetingById(meetingId);
            if (!oldMeeting) {
                throw new Error('Reunión no encontrada');
            }

            // Detectar qué cambió
            const changes = [];
            if (newData.meetingDate && newData.meetingDate !== oldMeeting.meeting_date) {
                changes.push({ field: 'Fecha', old: this.formatDate(oldMeeting.meeting_date), new: this.formatDate(newData.meetingDate) });
            }
            if (newData.meetingTime && newData.meetingTime !== oldMeeting.meeting_time) {
                changes.push({ field: 'Hora', old: oldMeeting.meeting_time?.slice(0,5), new: newData.meetingTime?.slice(0,5) });
            }
            if (newData.meetingLocation && newData.meetingLocation !== oldMeeting.meeting_location) {
                changes.push({ field: 'Lugar', old: oldMeeting.meeting_location || 'Sin definir', new: newData.meetingLocation });
            }
            if (newData.meetingPlatform && newData.meetingPlatform !== oldMeeting.meeting_platform) {
                changes.push({ field: 'Plataforma', old: oldMeeting.meeting_platform || 'Sin definir', new: newData.meetingPlatform });
            }
            if (newData.meetingLink && newData.meetingLink !== oldMeeting.meeting_link) {
                changes.push({ field: 'Link', old: oldMeeting.meeting_link || 'Sin definir', new: newData.meetingLink });
            }

            // Actualizar en DB
            const fields = [];
            const values = [];

            if (newData.meetingDate) { fields.push('meeting_date = ?'); values.push(newData.meetingDate); }
            if (newData.meetingTime) { fields.push('meeting_time = ?'); values.push(newData.meetingTime); }
            if (newData.meetingLocation) { fields.push('meeting_location = ?'); values.push(newData.meetingLocation); }
            if (newData.meetingPlatform) { fields.push('meeting_platform = ?'); values.push(newData.meetingPlatform); }
            if (newData.meetingLink) { fields.push('meeting_link = ?'); values.push(newData.meetingLink); }
            if (newData.meetingDurationMinutes) { fields.push('meeting_duration_minutes = ?'); values.push(newData.meetingDurationMinutes); }

            fields.push('rescheduled_at = NOW()');
            fields.push('rescheduled_by = ?');
            values.push(rescheduledBy);
            fields.push('updated_at = NOW()');
            values.push(meetingId);

            await sequelize.query(
                `UPDATE sales_meetings SET ${fields.join(', ')} WHERE id = ?`,
                { replacements: values }
            );

            // Si hubo cambios significativos, notificar a los participantes
            if (changes.length > 0) {
                const updatedMeeting = await this.getMeetingById(meetingId);
                const attendees = await this.getMeetingAttendees(meetingId);
                const vendor = await this.getVendorInfo(updatedMeeting.assigned_vendor_id);

                for (const attendee of attendees) {
                    if (attendee.email) {
                        await this.sendRescheduleNotification(updatedMeeting, attendee, vendor, changes);
                    }
                }

                console.log(`📧 [SALES-ORCH] Notificación de reprogramación enviada a ${attendees.filter(a => a.email).length} participantes`);
            }

            return {
                success: true,
                message: changes.length > 0
                    ? `Reunión reprogramada. Se notificó a los participantes.`
                    : 'Reunión actualizada sin cambios significativos.',
                changes
            };

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error reprogramando reunión:', error);
            throw error;
        }
    }

    /**
     * Enviar notificación de reprogramación a un asistente
     */
    async sendRescheduleNotification(meeting, attendee, vendor, changes) {
        const changesHtml = changes.map(c => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${c.field}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-decoration: line-through; color: #ef4444;">${c.old}</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #22c55e;">${c.new}</td>
            </tr>
        `).join('');

        const html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
                <!-- Header con branding APONNT -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); padding: 35px 30px; text-align: center;">
                    <div style="margin-bottom: 15px;">
                        <div style="display: inline-flex; align-items: center; gap: 15px;">
                            <div style="width: 55px; height: 55px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(245,158,11,0.3);">
                                <span style="color: white; font-size: 28px; font-weight: bold;">A</span>
                            </div>
                            <div style="text-align: left;">
                                <div style="font-size: 28px; font-weight: 800; color: #f59e0b; letter-spacing: -0.5px;">APONNT 360º</div>
                                <div style="font-size: 11px; color: #8b5cf6; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Intelligent Ecosystem</div>
                            </div>
                        </div>
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: 5px;">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 1px; margin-bottom: 4px;">SaaS B2B Multi-Tenant</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.4); font-style: italic;">Ecosistema Inteligente de Administración y Planificación de Recursos Empresariales</div>
                    </div>
                </div>

                <!-- Contenido -->
                <div style="padding: 30px;">
                    <!-- Alerta de reprogramación -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                        <h1 style="color: #92400e; font-size: 24px; margin: 0 0 5px 0;">📅 Reunión Reprogramada</h1>
                        <p style="color: #b45309; margin: 0;">Se han realizado cambios en los detalles de tu reunión</p>
                    </div>

                    <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                        Hola <strong>${attendee.full_name}</strong>,
                    </p>

                    <p style="color: #6b7280; font-size: 15px; margin: 0 0 25px 0;">
                        Te informamos que la reunión con <strong>${meeting.prospect_company_name}</strong> ha sido reprogramada.
                        Por favor, toma nota de los siguientes cambios:
                    </p>

                    <!-- Tabla de cambios -->
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 12px; text-align: left; color: #374151; font-size: 14px;">Campo</th>
                                <th style="padding: 12px; text-align: left; color: #374151; font-size: 14px;">Antes</th>
                                <th style="padding: 12px; text-align: left; color: #374151; font-size: 14px;">Ahora</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${changesHtml}
                        </tbody>
                    </table>

                    <!-- Nueva info de reunión -->
                    <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                        <h3 style="color: #166534; margin: 0 0 15px 0;">✅ Nueva información de la reunión</h3>
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 5px 0; color: #166534; width: 100px;"><strong>Fecha:</strong></td>
                                <td style="padding: 5px 0; color: #15803d;">${this.formatDate(meeting.meeting_date)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #166534;"><strong>Hora:</strong></td>
                                <td style="padding: 5px 0; color: #15803d;">${meeting.meeting_time?.slice(0,5) || ''}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #166534;"><strong>Lugar:</strong></td>
                                <td style="padding: 5px 0; color: #15803d;">${meeting.meeting_location || meeting.meeting_platform || 'Virtual'}</td>
                            </tr>
                            ${meeting.meeting_link ? `
                            <tr>
                                <td style="padding: 5px 0; color: #166534;"><strong>Link:</strong></td>
                                <td style="padding: 5px 0;"><a href="${meeting.meeting_link}" style="color: #2563eb;">${meeting.meeting_link}</a></td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; text-align: center;">
                        Si tienes alguna pregunta o inconveniente con el nuevo horario, no dudes en contactarnos.
                    </p>

                    <!-- FLYER PROMOCIONAL -->
                    ${this.generatePromoFlyer()}
                </div>

                <!-- Footer con datos del vendedor -->
                <div style="background: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;">
                            ${(vendor?.full_name || 'A').charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #1f2937; font-size: 16px;">${vendor?.full_name || 'Equipo Comercial APONNT'}</div>
                            ${vendor?.email ? `<div style="color: #6b7280; font-size: 14px;">📧 ${vendor.email}</div>` : ''}
                            ${vendor?.phone ? `<div style="color: #6b7280; font-size: 14px;">📱 ${vendor.phone}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Footer APONNT -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); padding: 20px; text-align: center;">
                    <span style="color: #f59e0b; font-weight: 700; font-size: 14px;">APONNT 360º</span>
                    <span style="color: #8b5cf6; font-size: 9px; margin-left: 8px; letter-spacing: 1px;">INTELLIGENT ECOSYSTEM</span>
                    <p style="color: rgba(255,255,255,0.3); font-size: 9px; margin: 8px 0 0 0;">
                        © ${new Date().getFullYear()} APONNT - Todos los derechos reservados
                    </p>
                </div>
            </div>
        `;

        await this.sendEmail({
            to: attendee.email,
            subject: `📅 Reunión Reprogramada: ${meeting.prospect_company_name} | APONNT`,
            html
        });
    }

    /**
     * Agregar nuevo asistente a una reunión existente
     */
    async addAttendee(meetingId, attendeeData) {
        try {
            const meeting = await this.getMeetingById(meetingId);
            if (!meeting) {
                throw new Error('Reunión no encontrada');
            }

            // Insertar asistente
            const [result] = await sequelize.query(`
                INSERT INTO sales_meeting_attendees (
                    meeting_id, full_name, email, phone, whatsapp,
                    job_title, department, is_decision_maker
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
            `, {
                replacements: [
                    meetingId,
                    attendeeData.fullName?.toUpperCase() || null,
                    attendeeData.email?.toLowerCase() || null,
                    attendeeData.phone || null,
                    attendeeData.whatsapp || null,
                    attendeeData.jobTitle?.toUpperCase() || null,
                    attendeeData.department?.toUpperCase() || null,
                    attendeeData.isDecisionMaker || false
                ]
            });

            const newAttendee = result[0];

            // Si la reunión ya tiene encuesta enviada, enviar encuesta al nuevo participante
            if (['survey_sent', 'pitch_ready', 'pitch_approved'].includes(meeting.status)) {
                const modules = await this.getModulesForSurvey();
                await this.sendSurveyEmail(meeting, newAttendee, modules);
                console.log(`📧 [SALES-ORCH] Encuesta enviada al nuevo participante: ${newAttendee.email}`);
            }

            return { success: true, data: newAttendee };

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error agregando asistente:', error);
            throw error;
        }
    }

    /**
     * Actualizar asistente existente
     */
    async updateAttendee(attendeeId, attendeeData) {
        try {
            const fields = [];
            const values = [];

            if (attendeeData.fullName !== undefined) { fields.push('full_name = ?'); values.push(attendeeData.fullName?.toUpperCase()); }
            if (attendeeData.email !== undefined) { fields.push('email = ?'); values.push(attendeeData.email?.toLowerCase()); }
            if (attendeeData.phone !== undefined) { fields.push('phone = ?'); values.push(attendeeData.phone); }
            if (attendeeData.whatsapp !== undefined) { fields.push('whatsapp = ?'); values.push(attendeeData.whatsapp); }
            if (attendeeData.jobTitle !== undefined) { fields.push('job_title = ?'); values.push(attendeeData.jobTitle?.toUpperCase()); }
            if (attendeeData.department !== undefined) { fields.push('department = ?'); values.push(attendeeData.department?.toUpperCase()); }
            if (attendeeData.isDecisionMaker !== undefined) { fields.push('is_decision_maker = ?'); values.push(attendeeData.isDecisionMaker); }

            if (fields.length === 0) {
                return { success: false, error: 'No hay campos para actualizar' };
            }

            fields.push('updated_at = NOW()');
            values.push(attendeeId);

            await sequelize.query(
                `UPDATE sales_meeting_attendees SET ${fields.join(', ')} WHERE id = ?`,
                { replacements: values }
            );

            // Obtener asistente actualizado
            const [updated] = await sequelize.query(
                'SELECT * FROM sales_meeting_attendees WHERE id = ?',
                { replacements: [attendeeId], type: QueryTypes.SELECT }
            );

            return { success: true, data: updated };

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error actualizando asistente:', error);
            throw error;
        }
    }

    /**
     * Eliminar asistente de una reunión
     */
    async removeAttendee(attendeeId) {
        try {
            // Primero eliminar intereses relacionados
            await sequelize.query(
                'DELETE FROM sales_meeting_module_interests WHERE attendee_id = ?',
                { replacements: [attendeeId] }
            );

            // Luego eliminar el asistente
            await sequelize.query(
                'DELETE FROM sales_meeting_attendees WHERE id = ?',
                { replacements: [attendeeId] }
            );

            return { success: true, message: 'Asistente eliminado' };

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error eliminando asistente:', error);
            throw error;
        }
    }

    /**
     * Enviar pitches personalizados a cada asistente (método legacy)
     */
    async sendPitchesToAttendees(meetingId) {
        try {
            const meeting = await this.getMeetingById(meetingId);
            const attendees = await this.getMeetingAttendees(meetingId);
            const vendor = await this.getVendorInfo(meeting.assigned_vendor_id);

            for (const attendee of attendees) {
                if (!attendee.email) continue;

                const pitch = this.safeParseJSON(attendee.personal_pitch_data);

                if (!pitch) continue;

                // Generar email con pitch personalizado
                const html = this.getEmailTemplate('pitch', {
                    attendeeName: attendee.full_name,
                    companyName: meeting.prospect_company_name,
                    meetingDate: new Date(meeting.meeting_date).toLocaleDateString('es-AR'),
                    meetingTime: meeting.meeting_time,
                    vendorName: vendor?.full_name || 'APONNT Comercial',
                    modules: pitch.modules || [],
                    totalModules: pitch.totalModules || 0
                });

                await this.sendEmail({
                    to: attendee.email,
                    subject: `📊 Tu roadmap personalizado para la reunión - ${meeting.prospect_company_name}`,
                    html
                });

                console.log(`📧 [SALES-ORCH] Pitch enviado a ${attendee.email}`);
            }

            return { success: true, sentTo: attendees.filter(a => a.email).length };
        } catch (error) {
            console.error('❌ [SALES-ORCH] Error enviando pitches:', error);
            throw error;
        }
    }

    /**
     * Enviar acceso a DEMO (para reuniones tipo demo_only)
     */
    async sendDemoAccess(meetingId) {
        await this.initialize();

        try {
            const meeting = await this.getMeetingById(meetingId);
            const attendees = await this.getMeetingAttendees(meetingId);
            const vendor = await this.getVendorInfo(meeting.assigned_vendor_id);

            // Credenciales de la empresa DEMO (hardcodeadas por ahora)
            const demoCredentials = {
                url: 'https://www.aponnt.com',
                panelUrl: 'https://aponnt.onrender.com/panel-empresa.html',
                company: 'aponnt-empresa-demo',
                user: 'demo-viewer',
                password: 'Demo2025!'
            };

            // Obtener módulos de interés consolidados
            const consolidatedInterests = await this.getConsolidatedInterests(meetingId);
            const interestedModules = consolidatedInterests.map(i => ({
                name: i.module_name,
                key: i.module_key
            }));

            let sentCount = 0;
            for (const attendee of attendees) {
                if (!attendee.email) continue;

                const html = this.generateDemoAccessEmailHTML(meeting, attendee, vendor, demoCredentials, interestedModules);

                await this.sendEmail({
                    to: attendee.email,
                    subject: `🎮 Tu Acceso a DEMO APONNT 360º - ${meeting.prospect_company_name}`,
                    html
                });

                sentCount++;
                console.log(`📧 [SALES-ORCH] Acceso DEMO enviado a ${attendee.email}`);
            }

            // Actualizar status de la reunión
            await sequelize.query(`
                UPDATE sales_meetings
                SET status = 'demo_sent', demo_sent_at = NOW(), updated_at = NOW()
                WHERE id = ?
            `, { replacements: [meetingId] });

            return { success: true, sentCount };

        } catch (error) {
            console.error('❌ [SALES-ORCH] Error enviando acceso DEMO:', error);
            throw error;
        }
    }

    /**
     * Generar email de acceso a DEMO
     */
    generateDemoAccessEmailHTML(meeting, attendee, vendor, credentials, modules) {
        const modulesList = modules.length > 0
            ? modules.map(m => `<li style="margin-bottom: 5px;">${m.name || m.key}</li>`).join('')
            : '<li>Todos los módulos disponibles</li>';

        return `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
                <!-- Header con branding APONNT -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%); padding: 35px 30px; text-align: center;">
                    <div style="margin-bottom: 15px;">
                        <div style="display: inline-flex; align-items: center; gap: 15px;">
                            <div style="width: 55px; height: 55px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(245,158,11,0.3);">
                                <span style="color: white; font-size: 28px; font-weight: bold;">A</span>
                            </div>
                            <div style="text-align: left;">
                                <div style="font-size: 28px; font-weight: 800; color: #f59e0b; letter-spacing: -0.5px;">APONNT 360º</div>
                                <div style="font-size: 11px; color: #8b5cf6; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Intelligent Ecosystem</div>
                            </div>
                        </div>
                    </div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: 5px;">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 1px; margin-bottom: 4px;">SaaS B2B Multi-Tenant</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.4); font-style: italic;">Ecosistema Inteligente de Administración y Planificación de Recursos Empresariales</div>
                    </div>
                </div>

                <!-- Contenido principal -->
                <div style="padding: 30px;">
                    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                        <h1 style="color: white; font-size: 24px; margin: 0;">🎮 Tu Acceso a DEMO está Listo</h1>
                    </div>

                    <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                        Hola <strong>${attendee.full_name}</strong>,
                    </p>

                    <p style="color: #6b7280; font-size: 15px; margin: 0 0 25px 0;">
                        Te enviamos las credenciales para explorar la plataforma <strong>APONNT 360º</strong>
                        y conocer las soluciones que pueden transformar la gestión de <strong>${meeting.prospect_company_name}</strong>.
                    </p>

                    <!-- Credenciales -->
                    <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); border-radius: 16px; padding: 25px; margin-bottom: 25px;">
                        <h3 style="color: #f59e0b; margin: 0 0 20px 0; font-size: 16px;">🔐 Credenciales de Acceso</h3>

                        <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #9ca3af; width: 100px;">URL:</td>
                                    <td style="padding: 8px 0;"><a href="${credentials.panelUrl}" style="color: #3b82f6; font-weight: 600;">${credentials.panelUrl}</a></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #9ca3af;">Empresa:</td>
                                    <td style="padding: 8px 0; color: white; font-weight: 600;">${credentials.company}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #9ca3af;">Usuario:</td>
                                    <td style="padding: 8px 0; color: white; font-weight: 600;">${credentials.user}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #9ca3af;">Contraseña:</td>
                                    <td style="padding: 8px 0; color: #22c55e; font-weight: 600; font-family: monospace;">${credentials.password}</td>
                                </tr>
                            </table>
                        </div>

                        <a href="${credentials.panelUrl}" style="display: block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; text-decoration: none; padding: 15px 30px; border-radius: 10px; text-align: center; font-weight: 600; font-size: 16px;">
                            🚀 Ingresar a la DEMO
                        </a>
                    </div>

                    <!-- Módulos recomendados -->
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📋 Módulos Recomendados para Explorar</h3>
                        <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 13px;">
                            Basado en los intereses de ${meeting.prospect_company_name}:
                        </p>
                        <ul style="color: #374151; padding-left: 20px; margin: 0;">
                            ${modulesList}
                        </ul>
                    </div>

                    <!-- Web APONNT -->
                    <div style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                        <p style="color: #5b21b6; margin: 0 0 10px 0;">¿Querés conocer más sobre APONNT?</p>
                        <a href="${credentials.url}" style="color: #7c3aed; font-weight: 600; font-size: 18px;">🌐 www.aponnt.com</a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; text-align: center;">
                        Si tenés alguna pregunta o necesitás una demostración personalizada,<br>
                        no dudes en contactarnos.
                    </p>

                    <!-- FLYER PROMOCIONAL -->
                    ${this.generatePromoFlyer()}
                </div>

                <!-- Footer con datos del vendedor -->
                <div style="background: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;">
                            ${(vendor?.full_name || 'A').charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #1f2937; font-size: 16px;">${vendor?.full_name || 'Equipo Comercial APONNT'}</div>
                            <div style="color: #6b7280; font-size: 13px;">Tu contacto comercial</div>
                            ${vendor?.email ? `<div style="color: #6b7280; font-size: 13px;">📧 ${vendor.email}</div>` : ''}
                            ${vendor?.phone ? `<div style="color: #6b7280; font-size: 13px;">📱 ${vendor.phone}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Footer APONNT -->
                <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); padding: 20px; text-align: center;">
                    <span style="color: #f59e0b; font-weight: 700; font-size: 14px;">APONNT 360º</span>
                    <span style="color: #8b5cf6; font-size: 9px; margin-left: 8px; letter-spacing: 1px;">INTELLIGENT ECOSYSTEM</span>
                    <p style="color: rgba(255,255,255,0.3); font-size: 9px; margin: 8px 0 0 0;">
                        © ${new Date().getFullYear()} APONNT - Todos los derechos reservados |
                        <a href="https://www.aponnt.com" style="color: rgba(255,255,255,0.5);">www.aponnt.com</a>
                    </p>
                </div>
            </div>
        `;
    }
}

// Singleton
const salesOrchestrationService = new SalesOrchestrationService();

module.exports = salesOrchestrationService;
