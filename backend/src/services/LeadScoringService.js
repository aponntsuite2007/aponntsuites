/**
 * ============================================================================
 * LEAD SCORING SERVICE - Enterprise Lead Management
 * ============================================================================
 *
 * Servicio de gestión de leads con:
 * - Lifecycle stages (Lead → MQL → SQL → Opportunity → Customer)
 * - Temperature tracking (Hot, Warm, Cold, Dead)
 * - BANT scoring (Budget, Authority, Need, Timeline)
 * - Behavioral scoring automático
 * - Decay por inactividad
 * - Integración con SalesOrchestrationService
 *
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class LeadScoringService {
    constructor() {
        this.initialized = false;
    }

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    async initialize() {
        if (this.initialized) return;

        try {
            // Verificar que las tablas existen
            const [tables] = await sequelize.query(`
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN ('sales_leads', 'sales_lead_activities', 'lead_scoring_config')
            `, { type: QueryTypes.SELECT });

            if (tables && tables.length >= 1) {
                this.initialized = true;
                console.log('✅ [LEAD-SCORING] Lead Scoring Service inicializado');
            } else {
                console.warn('⚠️ [LEAD-SCORING] Tablas de leads no encontradas - ejecutar migración');
            }
        } catch (error) {
            console.error('❌ [LEAD-SCORING] Error inicializando:', error.message);
        }
    }

    // =========================================================================
    // GESTIÓN DE LEADS
    // =========================================================================

    /**
     * Crear o actualizar lead desde datos de reunión
     * Si ya existe un lead con el mismo email, lo actualiza
     */
    async createOrUpdateLeadFromMeeting(meetingData, vendorId, createdBy = null) {
        await this.initialize();
        if (!this.initialized) return null;

        try {
            // Buscar lead existente por email
            const [existingLead] = await sequelize.query(`
                SELECT id, lifecycle_stage, total_score
                FROM sales_leads
                WHERE contact_email = ? OR company_name ILIKE ?
                LIMIT 1
            `, {
                replacements: [
                    meetingData.prospectEmail || meetingData.prospect_email,
                    meetingData.prospectCompanyName || meetingData.prospect_company_name
                ],
                type: QueryTypes.SELECT
            });

            if (existingLead) {
                // Actualizar lead existente
                console.log(`🔄 [LEAD-SCORING] Actualizando lead existente: ${existingLead.id}`);

                await sequelize.query(`
                    UPDATE sales_leads SET
                        assigned_vendor_id = COALESCE(?, assigned_vendor_id),
                        assigned_at = CASE WHEN assigned_vendor_id IS NULL THEN CURRENT_TIMESTAMP ELSE assigned_at END,
                        company_employee_count = COALESCE(?, company_employee_count),
                        company_website = COALESCE(?, company_website),
                        contact_phone = COALESCE(?, contact_phone),
                        notes = COALESCE(notes || E'\\n', '') || ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, {
                    replacements: [
                        vendorId,
                        meetingData.prospectEmployeeCount || meetingData.prospect_employee_count,
                        meetingData.prospectWebsite || meetingData.prospect_website,
                        meetingData.prospectPhone || meetingData.prospect_phone,
                        `[${new Date().toISOString()}] Reunión agendada`,
                        existingLead.id
                    ]
                });

                // Registrar actividad: reunión agendada
                await this.recordActivity(existingLead.id, 'meeting_scheduled', 'Reunión de venta agendada');

                return existingLead.id;
            }

            // Crear nuevo lead
            const [newLead] = await sequelize.query(`
                INSERT INTO sales_leads (
                    company_name, company_industry, company_employee_count,
                    company_country, company_province, company_city, company_website,
                    contact_name, contact_email, contact_phone, contact_whatsapp,
                    contact_job_title, contact_is_decision_maker,
                    lead_source, lead_source_detail,
                    assigned_vendor_id, assigned_at,
                    lifecycle_stage, temperature,
                    notes, created_by
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, CURRENT_TIMESTAMP,
                    'lead', 'cold',
                    ?, ?
                )
                RETURNING id
            `, {
                replacements: [
                    (meetingData.prospectCompanyName || meetingData.prospect_company_name || '').toUpperCase(),
                    meetingData.prospectCompanyType || meetingData.prospect_company_type || 'otro',
                    meetingData.prospectEmployeeCount || meetingData.prospect_employee_count,
                    meetingData.prospectCountry || meetingData.prospect_country || 'Argentina',
                    meetingData.prospectProvince || meetingData.prospect_province,
                    meetingData.prospectCity || meetingData.prospect_city,
                    meetingData.prospectWebsite || meetingData.prospect_website,
                    // Contacto - usar primer asistente o datos del prospecto
                    meetingData.attendees?.[0]?.fullName || meetingData.prospectCompanyName || 'Contacto Principal',
                    meetingData.attendees?.[0]?.email || meetingData.prospectEmail || meetingData.prospect_email,
                    meetingData.attendees?.[0]?.phone || meetingData.prospectPhone || meetingData.prospect_phone,
                    meetingData.attendees?.[0]?.whatsapp,
                    meetingData.attendees?.[0]?.jobTitle,
                    meetingData.attendees?.[0]?.isDecisionMaker || false,
                    // Source
                    'demo_request',
                    'Reunión agendada desde panel administrativo',
                    vendorId,
                    `Lead creado desde reunión agendada`,
                    createdBy
                ],
                type: QueryTypes.SELECT
            });

            const leadId = newLead?.id;

            if (leadId) {
                console.log(`✅ [LEAD-SCORING] Nuevo lead creado: ${leadId}`);

                // Registrar actividad inicial
                await this.recordActivity(leadId, 'meeting_scheduled', 'Primera reunión de venta agendada');
            }

            return leadId;

        } catch (error) {
            console.error('❌ [LEAD-SCORING] Error creando/actualizando lead:', error.message);
            return null;
        }
    }

    /**
     * Registrar actividad y actualizar score
     */
    async recordActivity(leadId, activityType, description = null, metadata = {}, createdBy = null) {
        await this.initialize();
        if (!this.initialized) return null;

        try {
            const [result] = await sequelize.query(`
                SELECT * FROM record_lead_activity(?, ?::lead_activity_type, ?, ?::jsonb, ?)
            `, {
                replacements: [leadId, activityType, description, JSON.stringify(metadata), createdBy],
                type: QueryTypes.SELECT
            });

            console.log(`📊 [LEAD-SCORING] Actividad registrada: ${activityType} → Score: ${result?.new_score}, Temp: ${result?.new_temperature}`);

            return result;
        } catch (error) {
            console.error(`❌ [LEAD-SCORING] Error registrando actividad:`, error.message);
            return null;
        }
    }

    /**
     * Actualizar BANT score
     */
    async updateBANT(leadId, { budget, authority, need, timeline, notes = {} }) {
        await this.initialize();
        if (!this.initialized) return null;

        try {
            const [result] = await sequelize.query(`
                SELECT update_lead_bant(?, ?, ?, ?, ?, ?::jsonb) as total_score
            `, {
                replacements: [leadId, budget, authority, need, timeline, JSON.stringify(notes)],
                type: QueryTypes.SELECT
            });

            console.log(`📊 [LEAD-SCORING] BANT actualizado: B=${budget} A=${authority} N=${need} T=${timeline} → Total: ${result?.total_score}`);

            // Verificar si debe cambiar de lifecycle
            await this.checkAndUpdateLifecycle(leadId);

            return result?.total_score;
        } catch (error) {
            console.error(`❌ [LEAD-SCORING] Error actualizando BANT:`, error.message);
            return null;
        }
    }

    /**
     * Cambiar lifecycle stage
     */
    async changeLifecycle(leadId, newStage, reason = null, changedBy = null) {
        await this.initialize();
        if (!this.initialized) return false;

        try {
            const [result] = await sequelize.query(`
                SELECT change_lead_lifecycle(?, ?::lead_lifecycle_stage, ?, ?) as changed
            `, {
                replacements: [leadId, newStage, reason, changedBy],
                type: QueryTypes.SELECT
            });

            if (result?.changed) {
                console.log(`🔄 [LEAD-SCORING] Lifecycle cambiado a: ${newStage}`);
            }

            return result?.changed || false;
        } catch (error) {
            console.error(`❌ [LEAD-SCORING] Error cambiando lifecycle:`, error.message);
            return false;
        }
    }

    /**
     * Descalificar lead
     */
    async disqualifyLead(leadId, reason, notes = null, canReactivate = true, reactivateAfter = null, disqualifiedBy = null) {
        await this.initialize();
        if (!this.initialized) return false;

        try {
            const [result] = await sequelize.query(`
                SELECT disqualify_lead(?, ?::disqualification_reason, ?, ?, ?, ?) as success
            `, {
                replacements: [leadId, reason, notes, canReactivate, reactivateAfter, disqualifiedBy],
                type: QueryTypes.SELECT
            });

            console.log(`❌ [LEAD-SCORING] Lead descalificado: ${reason}`);

            return result?.success || false;
        } catch (error) {
            console.error(`❌ [LEAD-SCORING] Error descalificando lead:`, error.message);
            return false;
        }
    }

    /**
     * Verificar y actualizar lifecycle basado en score y actividades
     */
    async checkAndUpdateLifecycle(leadId) {
        try {
            const [lead] = await sequelize.query(`
                SELECT
                    id, lifecycle_stage, total_score, temperature,
                    bant_budget, bant_authority, bant_need, bant_timeline,
                    meetings_attended, contact_is_decision_maker
                FROM sales_leads WHERE id = ?
            `, {
                replacements: [leadId],
                type: QueryTypes.SELECT
            });

            if (!lead) return;

            const bantTotal = lead.bant_budget + lead.bant_authority + lead.bant_need + lead.bant_timeline;
            let newStage = lead.lifecycle_stage;
            let reason = null;

            // Reglas de transición automática
            if (lead.lifecycle_stage === 'lead') {
                // Lead → MQL: Score >= 30 o tuvo demo
                if (lead.total_score >= 30) {
                    newStage = 'mql';
                    reason = `Score alcanzó ${lead.total_score} puntos`;
                }
            } else if (lead.lifecycle_stage === 'mql') {
                // MQL → SQL: Score >= 60 + BANT >= 50 + reunión asistida
                if (lead.total_score >= 60 && bantTotal >= 50 && lead.meetings_attended > 0) {
                    newStage = 'sql';
                    reason = `Score ${lead.total_score}, BANT ${bantTotal}, ${lead.meetings_attended} reuniones`;
                }
            } else if (lead.lifecycle_stage === 'sql') {
                // SQL → Opportunity: BANT >= 70 + presupuesto solicitado
                if (bantTotal >= 70) {
                    // Verificar si pidió presupuesto
                    const [quoteActivity] = await sequelize.query(`
                        SELECT 1 FROM sales_lead_activities
                        WHERE lead_id = ? AND activity_type = 'quote_requested'
                        LIMIT 1
                    `, { replacements: [leadId], type: QueryTypes.SELECT });

                    if (quoteActivity) {
                        newStage = 'opportunity';
                        reason = `BANT ${bantTotal} + presupuesto solicitado`;
                    }
                }
            }

            // Aplicar cambio si hay nuevo stage
            if (newStage !== lead.lifecycle_stage) {
                await this.changeLifecycle(leadId, newStage, reason);
            }

        } catch (error) {
            console.error(`❌ [LEAD-SCORING] Error verificando lifecycle:`, error.message);
        }
    }

    // =========================================================================
    // INTEGRACIONES CON SALES ORCHESTRATION
    // =========================================================================

    /**
     * Procesar encuesta completada
     * Llamar desde SalesOrchestrationService.processSurveyResponse
     */
    async onSurveyCompleted(leadId, surveyData) {
        await this.recordActivity(leadId, 'survey_completed', 'Encuesta de interés completada', {
            modulesInterested: surveyData.modulesInterested,
            preferredFocus: surveyData.preferredFocus
        });

        // Actualizar módulos de interés
        if (surveyData.modulesInterested?.length > 0) {
            await sequelize.query(`
                UPDATE sales_leads SET
                    interested_modules = ?::jsonb,
                    primary_interest = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, {
                replacements: [
                    JSON.stringify(surveyData.modulesInterested),
                    surveyData.modulesInterested[0],
                    leadId
                ]
            });
        }

        // Inferir BANT Need basado en cantidad de módulos
        const moduleCount = surveyData.modulesInterested?.length || 0;
        if (moduleCount >= 5) {
            await this.updateBANT(leadId, { need: 20 }); // Alta necesidad
        } else if (moduleCount >= 3) {
            await this.updateBANT(leadId, { need: 15 }); // Necesidad media
        }

        await this.checkAndUpdateLifecycle(leadId);
    }

    /**
     * Procesar reunión asistida
     * Llamar desde SalesOrchestrationService.endMeeting
     */
    async onMeetingAttended(leadId, meetingData) {
        await this.recordActivity(leadId, 'meeting_attended', 'Asistió a reunión de venta', {
            meetingId: meetingData.meetingId,
            duration: meetingData.duration
        });

        // Actualizar BANT Authority si hay decision maker
        if (meetingData.hasDecisionMaker) {
            await this.updateBANT(leadId, { authority: 20 });
        }

        await this.checkAndUpdateLifecycle(leadId);
    }

    /**
     * Procesar no-show a reunión
     */
    async onMeetingNoShow(leadId, meetingId) {
        await this.recordActivity(leadId, 'meeting_no_show', 'No asistió a reunión agendada', {
            meetingId
        });
    }

    /**
     * Procesar feedback post-reunión
     * Llamar desde SalesOrchestrationService.submitFeedback
     */
    async onFeedbackSubmitted(leadId, feedbackData) {
        // Actualizar BANT basado en feedback
        const bantUpdates = {};

        // Budget
        if (feedbackData.budgetDiscussed) {
            bantUpdates.budget = feedbackData.hasBudget ? 20 : 5;
            bantUpdates.notes = { budget: feedbackData.budgetNotes };
        }

        // Timeline
        if (feedbackData.timelineDiscussed) {
            if (feedbackData.timeline === 'immediate') {
                bantUpdates.timeline = 25; // Quiere ya
            } else if (feedbackData.timeline === 'quarter') {
                bantUpdates.timeline = 20; // Este trimestre
            } else if (feedbackData.timeline === 'semester') {
                bantUpdates.timeline = 15; // Este semestre
            } else if (feedbackData.timeline === 'year') {
                bantUpdates.timeline = 10; // Este año
            } else {
                bantUpdates.timeline = 5; // Más adelante
            }
        }

        // Authority - si confirmaron quién decide
        if (feedbackData.decisionMakerConfirmed) {
            bantUpdates.authority = feedbackData.isDecisionMaker ? 25 : 10;
        }

        if (Object.keys(bantUpdates).length > 0) {
            await this.updateBANT(leadId, bantUpdates);
        }

        // Si solicitó presupuesto
        if (feedbackData.quoteRequested) {
            await this.recordActivity(leadId, 'quote_requested', 'Solicitó presupuesto en reunión');
        }

        // Manejar resultado del feedback
        if (feedbackData.result === 'won') {
            await this.changeLifecycle(leadId, 'customer', 'Cerrado ganado en reunión');
        } else if (feedbackData.result === 'lost') {
            await this.changeLifecycle(leadId, 'lost', feedbackData.lostReason || 'Perdido');
        } else if (feedbackData.result === 'not_interested') {
            await this.disqualifyLead(leadId, 'no_need', feedbackData.notes, true, feedbackData.recontactDate);
        }

        await this.checkAndUpdateLifecycle(leadId);
    }

    /**
     * Procesar demo solicitada
     */
    async onDemoRequested(leadId, demoData = {}) {
        await this.recordActivity(leadId, 'demo_requested', 'Solicitó demo del sistema', demoData);
        await this.checkAndUpdateLifecycle(leadId);
    }

    /**
     * Procesar demo asistida
     */
    async onDemoAttended(leadId, demoData = {}) {
        await this.recordActivity(leadId, 'demo_attended', 'Asistió a demo del sistema', demoData);
        await this.checkAndUpdateLifecycle(leadId);
    }

    // =========================================================================
    // CONSULTAS Y REPORTES
    // =========================================================================

    /**
     * Obtener lead por ID
     */
    async getLeadById(leadId) {
        const [lead] = await sequelize.query(`
            SELECT l.*,
                   l.bant_budget + l.bant_authority + l.bant_need + l.bant_timeline AS bant_total,
                   COALESCE(s.first_name || ' ' || s.last_name, s.email) AS vendor_name,
                   s.email AS vendor_email
            FROM sales_leads l
            LEFT JOIN aponnt_staff s ON l.assigned_vendor_id = s.staff_id
            WHERE l.id = ?
        `, {
            replacements: [leadId],
            type: QueryTypes.SELECT
        });

        return lead;
    }

    /**
     * Obtener lead por email de contacto
     */
    async getLeadByEmail(email) {
        const [lead] = await sequelize.query(`
            SELECT * FROM sales_leads WHERE contact_email = ?
        `, {
            replacements: [email],
            type: QueryTypes.SELECT
        });

        return lead;
    }

    /**
     * Obtener leads por vendedor
     */
    async getLeadsByVendor(vendorId, filters = {}) {
        let whereClause = 'assigned_vendor_id = ?';
        const params = [vendorId];

        if (filters.lifecycle) {
            whereClause += ' AND lifecycle_stage = ?';
            params.push(filters.lifecycle);
        }

        if (filters.temperature) {
            whereClause += ' AND temperature = ?';
            params.push(filters.temperature);
        }

        if (filters.notDisqualified !== false) {
            whereClause += ' AND is_disqualified = false';
        }

        const leads = await sequelize.query(`
            SELECT l.*,
                   l.bant_budget + l.bant_authority + l.bant_need + l.bant_timeline AS bant_total
            FROM sales_leads l
            WHERE ${whereClause}
            ORDER BY
                CASE temperature
                    WHEN 'hot' THEN 1
                    WHEN 'warm' THEN 2
                    WHEN 'cold' THEN 3
                    ELSE 4
                END,
                total_score DESC
        `, {
            replacements: params,
            type: QueryTypes.SELECT
        });

        return leads;
    }

    /**
     * Obtener pipeline completo
     */
    async getPipeline() {
        const pipeline = await sequelize.query(`
            SELECT * FROM v_lead_pipeline
        `, { type: QueryTypes.SELECT });

        return pipeline;
    }

    /**
     * Obtener leads hot para seguimiento urgente
     */
    async getHotLeads(vendorId = null) {
        let whereClause = "temperature = 'hot' AND is_disqualified = false";
        const params = [];

        if (vendorId) {
            whereClause += ' AND assigned_vendor_id = ?';
            params.push(vendorId);
        }

        const leads = await sequelize.query(`
            SELECT l.*,
                   l.bant_budget + l.bant_authority + l.bant_need + l.bant_timeline AS bant_total,
                   COALESCE(s.first_name || ' ' || s.last_name, s.email) AS vendor_name
            FROM sales_leads l
            LEFT JOIN aponnt_staff s ON l.assigned_vendor_id = s.staff_id
            WHERE ${whereClause}
            ORDER BY total_score DESC
        `, {
            replacements: params,
            type: QueryTypes.SELECT
        });

        return leads;
    }

    /**
     * Obtener leads para reactivar
     */
    async getLeadsToReactivate() {
        const leads = await sequelize.query(`
            SELECT * FROM v_leads_to_reactivate
            ORDER BY reactivate_after ASC NULLS FIRST
        `, { type: QueryTypes.SELECT });

        return leads;
    }

    /**
     * Obtener actividades de un lead
     */
    async getLeadActivities(leadId, limit = 50) {
        const activities = await sequelize.query(`
            SELECT * FROM sales_lead_activities
            WHERE lead_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, {
            replacements: [leadId, limit],
            type: QueryTypes.SELECT
        });

        return activities;
    }

    /**
     * Obtener estadísticas por vendedor
     */
    async getVendorStats(vendorId) {
        const [stats] = await sequelize.query(`
            SELECT * FROM v_leads_by_vendor WHERE staff_id = ?
        `, {
            replacements: [vendorId],
            type: QueryTypes.SELECT
        });

        return stats;
    }

    /**
     * Ejecutar decay de inactividad (llamar desde cron job)
     */
    async runInactivityDecay() {
        try {
            const [result] = await sequelize.query(`
                SELECT apply_lead_inactivity_decay() AS affected_count
            `, { type: QueryTypes.SELECT });

            console.log(`🔄 [LEAD-SCORING] Decay aplicado a ${result?.affected_count || 0} leads`);
            return result?.affected_count || 0;
        } catch (error) {
            console.error('❌ [LEAD-SCORING] Error ejecutando decay:', error.message);
            return 0;
        }
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    /**
     * Vincular lead con reunión existente
     */
    async linkLeadToMeeting(leadId, meetingId) {
        try {
            // Buscar email del prospecto en la reunión
            const [meeting] = await sequelize.query(`
                SELECT prospect_email, prospect_company_name FROM sales_meetings WHERE id = ?
            `, { replacements: [meetingId], type: QueryTypes.SELECT });

            if (!meeting) return false;

            // Actualizar lead con referencia a reunión
            await sequelize.query(`
                UPDATE sales_leads SET
                    notes = COALESCE(notes || E'\\n', '') || ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, {
                replacements: [
                    `[MEETING] Vinculado a reunión ${meetingId}`,
                    leadId
                ]
            });

            return true;
        } catch (error) {
            console.error('❌ [LEAD-SCORING] Error vinculando lead:', error.message);
            return false;
        }
    }

    /**
     * Buscar lead por datos de reunión
     */
    async findLeadByMeetingData(prospectEmail, prospectCompanyName) {
        const [lead] = await sequelize.query(`
            SELECT id FROM sales_leads
            WHERE contact_email = ? OR company_name ILIKE ?
            LIMIT 1
        `, {
            replacements: [prospectEmail, prospectCompanyName],
            type: QueryTypes.SELECT
        });

        return lead?.id;
    }
}

// Singleton
const leadScoringService = new LeadScoringService();

module.exports = leadScoringService;
