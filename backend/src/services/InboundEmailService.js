/**
 * ============================================================================
 * INBOUND EMAIL SERVICE - Procesamiento Universal de Emails Entrantes
 * ============================================================================
 *
 * Servicio que procesa emails entrantes (respuestas) y los vincula con el
 * sistema de notificaciones central.
 *
 * Compatible con:
 * - SendGrid Inbound Parse
 * - Mailgun Routes
 * - Postmark Inbound
 * - Amazon SES (via SNS)
 * - Manual (IMAP polling)
 *
 * Funcionalidades:
 * - Parseo de headers (In-Reply-To, References, Message-ID)
 * - Vinculación automática con threads de notificaciones
 * - Creación de mensajes en bandeja de entrada
 * - Notificación a destinatarios originales
 * - Detección de spam y auto-replies
 * - Soporte multi-tenant
 *
 * @version 1.0
 * @date 2025-12-17
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const inboxService = require('./inboxService');
const crypto = require('crypto');

class InboundEmailService {
    constructor() {
        // Patrones para detectar auto-replies
        this.autoReplyPatterns = [
            /^(auto|automatic)\s*reply/i,
            /out\s*of\s*(the\s*)?office/i,
            /fuera\s*de\s*(la\s*)?oficina/i,
            /respuesta\s*autom[aá]tica/i,
            /vacation\s*(reply|response)/i,
            /away\s*message/i,
            /undeliverable/i,
            /delivery\s*(status|failure|notification)/i,
            /mailer-daemon/i,
            /postmaster/i
        ];

        // Headers que indican auto-reply
        this.autoReplyHeaders = [
            'x-auto-response-suppress',
            'x-autoreply',
            'x-autorespond',
            'auto-submitted'
        ];

        console.log('[INBOUND-EMAIL] Servicio inicializado');
    }

    /**
     * ========================================================================
     * MÉTODO PRINCIPAL: Procesar email entrante
     * ========================================================================
     * Recibe un email desde webhook y lo procesa completamente
     */
    async processInboundEmail(emailData, provider = 'unknown') {
        console.log(`📧 [INBOUND] Procesando email de ${emailData.from} vía ${provider}`);

        const transaction = await sequelize.transaction();

        try {
            // 1. Normalizar datos del email (diferentes proveedores tienen diferentes formatos)
            const normalizedEmail = this.normalizeEmailData(emailData, provider);

            // 2. Guardar en log de emails entrantes
            const inboundRecord = await this.saveInboundLog(normalizedEmail, provider, transaction);

            // 3. Verificar si es auto-reply o spam
            if (this.isAutoReply(normalizedEmail)) {
                await this.markAsAutoReply(inboundRecord.id, transaction);
                await transaction.commit();
                console.log(`📧 [INBOUND] Email ${inboundRecord.id} marcado como auto-reply, ignorando`);
                return { success: true, status: 'auto_reply', inboundId: inboundRecord.id };
            }

            // 4. Buscar thread/notificación relacionada
            const linkedData = await this.findLinkedThread(normalizedEmail, transaction);

            if (!linkedData) {
                // Email huérfano - no se encontró thread relacionado
                await this.markAsOrphan(inboundRecord.id, transaction);
                await transaction.commit();
                console.log(`📧 [INBOUND] Email ${inboundRecord.id} sin thread relacionado (huérfano)`);
                return { success: true, status: 'orphan', inboundId: inboundRecord.id };
            }

            // 5. Actualizar registro con datos de vinculación
            await this.updateInboundWithLinking(inboundRecord.id, linkedData, transaction);

            // 6. Crear mensaje en el thread de notificaciones
            const messageId = await this.createMessageInThread(
                inboundRecord.id,
                linkedData,
                normalizedEmail,
                transaction
            );

            // 7. Notificar a los participantes del thread
            await this.notifyThreadParticipants(linkedData, normalizedEmail, messageId, transaction);

            await transaction.commit();

            console.log(`✅ [INBOUND] Email procesado exitosamente: ${inboundRecord.id} → Thread ${linkedData.group_id || linkedData.thread_id}`);

            return {
                success: true,
                status: 'linked',
                inboundId: inboundRecord.id,
                messageId,
                linkedTo: linkedData
            };

        } catch (error) {
            await transaction.rollback();
            console.error('❌ [INBOUND] Error procesando email:', error);
            throw error;
        }
    }

    /**
     * ========================================================================
     * NORMALIZAR DATOS DE EMAIL (por proveedor)
     * ========================================================================
     */
    normalizeEmailData(emailData, provider) {
        let normalized = {
            messageId: null,
            inReplyTo: null,
            references: null,
            fromEmail: null,
            fromName: null,
            toEmail: null,
            toName: null,
            ccEmails: [],
            subject: null,
            bodyText: null,
            bodyHtml: null,
            attachments: [],
            rawHeaders: {},
            spamScore: null
        };

        switch (provider.toLowerCase()) {
            case 'sendgrid':
                normalized = this.normalizeSendGrid(emailData, normalized);
                break;

            case 'mailgun':
                normalized = this.normalizeMailgun(emailData, normalized);
                break;

            case 'postmark':
                normalized = this.normalizePostmark(emailData, normalized);
                break;

            case 'ses':
            case 'amazon_ses':
                normalized = this.normalizeAmazonSES(emailData, normalized);
                break;

            default:
                // Formato genérico / manual
                normalized = this.normalizeGeneric(emailData, normalized);
        }

        return normalized;
    }

    /**
     * Normalizar formato SendGrid Inbound Parse
     */
    normalizeSendGrid(data, normalized) {
        // SendGrid envía headers como string, hay que parsearlos
        const headers = this.parseHeadersString(data.headers || '');

        normalized.messageId = headers['message-id'] || data.message_id;
        normalized.inReplyTo = headers['in-reply-to'] || data.in_reply_to;
        normalized.references = headers['references'];
        normalized.fromEmail = this.extractEmail(data.from);
        normalized.fromName = this.extractName(data.from);
        normalized.toEmail = this.extractEmail(data.to);
        normalized.toName = this.extractName(data.to);
        normalized.ccEmails = data.cc ? data.cc.split(',').map(e => this.extractEmail(e.trim())) : [];
        normalized.subject = data.subject;
        normalized.bodyText = data.text || data.plain;
        normalized.bodyHtml = data.html;
        normalized.attachments = this.parseAttachments(data.attachments, 'sendgrid');
        normalized.rawHeaders = headers;
        normalized.spamScore = parseFloat(data.spam_score) || null;

        return normalized;
    }

    /**
     * Normalizar formato Mailgun
     */
    normalizeMailgun(data, normalized) {
        normalized.messageId = data['Message-Id'] || data.message_id;
        normalized.inReplyTo = data['In-Reply-To'] || data.in_reply_to;
        normalized.references = data['References'];
        normalized.fromEmail = this.extractEmail(data.sender || data.from);
        normalized.fromName = this.extractName(data.sender || data.from);
        normalized.toEmail = this.extractEmail(data.recipient || data.to);
        normalized.toName = this.extractName(data.recipient || data.to);
        normalized.ccEmails = data.Cc ? data.Cc.split(',').map(e => this.extractEmail(e.trim())) : [];
        normalized.subject = data.subject || data.Subject;
        normalized.bodyText = data['body-plain'] || data.text;
        normalized.bodyHtml = data['body-html'] || data.html;
        normalized.attachments = this.parseAttachments(data.attachments, 'mailgun');
        normalized.rawHeaders = data['message-headers'] ? JSON.parse(data['message-headers']) : {};
        normalized.spamScore = parseFloat(data['X-Mailgun-Sscore']) || null;

        return normalized;
    }

    /**
     * Normalizar formato Postmark
     */
    normalizePostmark(data, normalized) {
        normalized.messageId = data.MessageID;
        normalized.inReplyTo = data.Headers?.find(h => h.Name === 'In-Reply-To')?.Value;
        normalized.references = data.Headers?.find(h => h.Name === 'References')?.Value;
        normalized.fromEmail = data.FromFull?.Email || data.From;
        normalized.fromName = data.FromFull?.Name;
        normalized.toEmail = data.ToFull?.[0]?.Email || data.To;
        normalized.toName = data.ToFull?.[0]?.Name;
        normalized.ccEmails = (data.CcFull || []).map(c => c.Email);
        normalized.subject = data.Subject;
        normalized.bodyText = data.TextBody;
        normalized.bodyHtml = data.HtmlBody;
        normalized.attachments = this.parseAttachments(data.Attachments, 'postmark');
        normalized.rawHeaders = data.Headers || [];

        return normalized;
    }

    /**
     * Normalizar formato Amazon SES (via SNS)
     */
    normalizeAmazonSES(data, normalized) {
        // SES puede venir envuelto en SNS message
        const mail = data.mail || data;
        const content = data.content || {};

        normalized.messageId = mail.messageId;
        normalized.inReplyTo = mail.commonHeaders?.['in-reply-to'];
        normalized.references = mail.commonHeaders?.references;
        normalized.fromEmail = this.extractEmail(mail.source || mail.commonHeaders?.from?.[0]);
        normalized.fromName = this.extractName(mail.commonHeaders?.from?.[0]);
        normalized.toEmail = mail.destination?.[0] || mail.commonHeaders?.to?.[0];
        normalized.subject = mail.commonHeaders?.subject;
        normalized.bodyText = content.text || data.text;
        normalized.bodyHtml = content.html || data.html;
        normalized.rawHeaders = mail.headers || [];

        return normalized;
    }

    /**
     * Normalizar formato genérico / manual
     */
    normalizeGeneric(data, normalized) {
        normalized.messageId = data.messageId || data.message_id || data['Message-ID'];
        normalized.inReplyTo = data.inReplyTo || data.in_reply_to || data['In-Reply-To'];
        normalized.references = data.references || data.References;
        normalized.fromEmail = this.extractEmail(data.from || data.fromEmail || data.from_email);
        normalized.fromName = data.fromName || data.from_name || this.extractName(data.from);
        normalized.toEmail = this.extractEmail(data.to || data.toEmail || data.to_email);
        normalized.toName = data.toName || data.to_name || this.extractName(data.to);
        normalized.ccEmails = data.cc ? (Array.isArray(data.cc) ? data.cc : data.cc.split(',')) : [];
        normalized.subject = data.subject;
        normalized.bodyText = data.text || data.bodyText || data.body_text || data.body;
        normalized.bodyHtml = data.html || data.bodyHtml || data.body_html;
        normalized.attachments = data.attachments || [];
        normalized.rawHeaders = data.headers || data.rawHeaders || {};
        normalized.spamScore = data.spamScore || data.spam_score;

        return normalized;
    }

    /**
     * ========================================================================
     * HELPERS DE PARSEO
     * ========================================================================
     */

    extractEmail(str) {
        if (!str) return null;
        const match = str.match(/<([^>]+)>/) || str.match(/([^\s<]+@[^\s>]+)/);
        return match ? match[1].toLowerCase().trim() : str.toLowerCase().trim();
    }

    extractName(str) {
        if (!str) return null;
        const match = str.match(/^([^<]+)</);
        return match ? match[1].trim().replace(/"/g, '') : null;
    }

    parseHeadersString(headersStr) {
        const headers = {};
        if (!headersStr) return headers;

        const lines = headersStr.split(/\r?\n/);
        let currentHeader = '';
        let currentValue = '';

        for (const line of lines) {
            if (line.match(/^\s/)) {
                // Continuation of previous header
                currentValue += ' ' + line.trim();
            } else {
                // Save previous header
                if (currentHeader) {
                    headers[currentHeader.toLowerCase()] = currentValue;
                }
                // Start new header
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    currentHeader = line.substring(0, colonIndex).trim();
                    currentValue = line.substring(colonIndex + 1).trim();
                }
            }
        }

        // Save last header
        if (currentHeader) {
            headers[currentHeader.toLowerCase()] = currentValue;
        }

        return headers;
    }

    parseAttachments(attachments, provider) {
        if (!attachments) return [];

        return (Array.isArray(attachments) ? attachments : [attachments]).map(att => ({
            filename: att.filename || att.name || att.Name || 'attachment',
            size: att.size || att['content-length'] || att.ContentLength || 0,
            contentType: att.type || att['content-type'] || att.ContentType || 'application/octet-stream',
            url: att.url || att.ContentID || null
        }));
    }

    /**
     * ========================================================================
     * DETECCIÓN DE AUTO-REPLIES
     * ========================================================================
     */

    isAutoReply(email) {
        // Verificar subject
        for (const pattern of this.autoReplyPatterns) {
            if (pattern.test(email.subject || '')) {
                return true;
            }
        }

        // Verificar headers
        const headers = email.rawHeaders || {};
        for (const header of this.autoReplyHeaders) {
            if (headers[header]) {
                return true;
            }
        }

        // Verificar Auto-Submitted header
        if (headers['auto-submitted'] && headers['auto-submitted'] !== 'no') {
            return true;
        }

        // Verificar Precedence header
        if (['bulk', 'junk', 'list'].includes(headers['precedence']?.toLowerCase())) {
            return true;
        }

        return false;
    }

    /**
     * ========================================================================
     * OPERACIONES DE BASE DE DATOS
     * ========================================================================
     */

    async saveInboundLog(email, provider, transaction) {
        const [result] = await sequelize.query(`
            INSERT INTO email_inbound_log (
                message_id, in_reply_to, references_header,
                from_email, from_name, to_email, to_name, cc_emails,
                subject, body_text, body_html, attachments,
                raw_headers, email_provider, spam_score,
                processing_status, created_at
            ) VALUES (
                :messageId, :inReplyTo, :references,
                :fromEmail, :fromName, :toEmail, :toName, :ccEmails::jsonb,
                :subject, :bodyText, :bodyHtml, :attachments::jsonb,
                :rawHeaders::jsonb, :provider, :spamScore,
                'PENDING', CURRENT_TIMESTAMP
            )
            RETURNING id
        `, {
            replacements: {
                messageId: email.messageId,
                inReplyTo: email.inReplyTo,
                references: email.references,
                fromEmail: email.fromEmail,
                fromName: email.fromName,
                toEmail: email.toEmail,
                toName: email.toName,
                ccEmails: JSON.stringify(email.ccEmails || []),
                subject: email.subject,
                bodyText: email.bodyText,
                bodyHtml: email.bodyHtml,
                attachments: JSON.stringify(email.attachments || []),
                rawHeaders: JSON.stringify(email.rawHeaders || {}),
                provider,
                spamScore: email.spamScore
            },
            type: QueryTypes.INSERT,
            transaction
        });

        return { id: result[0]?.id || result };
    }

    async findLinkedThread(email, transaction) {
        // Usar la función PostgreSQL para buscar thread
        const [results] = await sequelize.query(`
            SELECT * FROM find_thread_by_email_reference(:messageId, :inReplyTo)
        `, {
            replacements: {
                messageId: email.messageId,
                inReplyTo: email.inReplyTo
            },
            type: QueryTypes.SELECT,
            transaction
        });

        if (results && results.notification_id) {
            return results;
        }

        // Si no encontramos por headers, intentar por email del remitente
        // Buscar el último thread activo donde este email fue destinatario
        const [recentThread] = await sequelize.query(`
            SELECT
                etm.notification_id,
                etm.thread_id,
                etm.group_id,
                etm.company_id,
                etm.entity_type,
                etm.entity_id,
                etm.recipient_type
            FROM email_thread_mapping etm
            WHERE etm.recipient_email = :fromEmail
              AND etm.is_active = true
              AND etm.created_at > NOW() - INTERVAL '30 days'
            ORDER BY etm.created_at DESC
            LIMIT 1
        `, {
            replacements: { fromEmail: email.fromEmail },
            type: QueryTypes.SELECT,
            transaction
        });

        return recentThread || null;
    }

    async markAsAutoReply(inboundId, transaction) {
        await sequelize.query(`
            UPDATE email_inbound_log
            SET processing_status = 'AUTO_REPLY',
                is_auto_reply = true,
                processed_at = CURRENT_TIMESTAMP
            WHERE id = :id
        `, {
            replacements: { id: inboundId },
            type: QueryTypes.UPDATE,
            transaction
        });
    }

    async markAsOrphan(inboundId, transaction) {
        await sequelize.query(`
            UPDATE email_inbound_log
            SET processing_status = 'ORPHAN',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = :id
        `, {
            replacements: { id: inboundId },
            type: QueryTypes.UPDATE,
            transaction
        });
    }

    async updateInboundWithLinking(inboundId, linkedData, transaction) {
        await sequelize.query(`
            UPDATE email_inbound_log
            SET linked_notification_id = :notificationId,
                linked_thread_id = :threadId,
                linked_group_id = :groupId,
                linked_company_id = :companyId,
                processing_status = 'PROCESSING'
            WHERE id = :id
        `, {
            replacements: {
                id: inboundId,
                notificationId: linkedData.notification_id,
                threadId: linkedData.thread_id,
                groupId: linkedData.group_id,
                companyId: linkedData.company_id
            },
            type: QueryTypes.UPDATE,
            transaction
        });
    }

    async createMessageInThread(inboundId, linkedData, email, transaction) {
        // Si tenemos group_id, usar la función PostgreSQL para crear mensaje
        if (linkedData.group_id) {
            const [result] = await sequelize.query(`
                SELECT process_inbound_email_to_thread(
                    :inboundId::uuid,
                    :groupId::uuid,
                    :fromEmail,
                    :fromName,
                    :subject,
                    :bodyText,
                    :companyId
                ) as message_id
            `, {
                replacements: {
                    inboundId,
                    groupId: linkedData.group_id,
                    fromEmail: email.fromEmail,
                    fromName: email.fromName,
                    subject: email.subject,
                    bodyText: email.bodyText,
                    companyId: linkedData.company_id
                },
                type: QueryTypes.SELECT,
                transaction
            });

            return result?.message_id;
        }

        // Si solo tenemos notification_id, crear una notificación de respuesta
        if (linkedData.notification_id) {
            const [result] = await sequelize.query(`
                INSERT INTO unified_notifications (
                    company_id,
                    origin_type,
                    origin_id,
                    origin_name,
                    recipient_type,
                    recipient_id,
                    recipient_name,
                    notification_type,
                    category,
                    title,
                    message,
                    priority,
                    status,
                    thread_id,
                    parent_notification_id,
                    source_channel,
                    created_at
                ) VALUES (
                    :companyId,
                    'external',
                    NULL,
                    :fromName,
                    'system',
                    NULL,
                    'Sistema',
                    'email_reply',
                    :entityType,
                    :subject,
                    :bodyText,
                    'normal',
                    'unread',
                    :threadId,
                    :parentNotificationId,
                    'email_inbound',
                    CURRENT_TIMESTAMP
                )
                RETURNING id
            `, {
                replacements: {
                    companyId: linkedData.company_id,
                    fromName: email.fromName || email.fromEmail,
                    entityType: linkedData.entity_type || 'general',
                    subject: `RE: ${email.subject || 'Sin asunto'}`,
                    bodyText: email.bodyText,
                    threadId: linkedData.thread_id,
                    parentNotificationId: linkedData.notification_id
                },
                type: QueryTypes.INSERT,
                transaction
            });

            const messageId = result[0]?.id || result;

            // Actualizar inbound log
            await sequelize.query(`
                UPDATE email_inbound_log
                SET processing_status = 'LINKED',
                    created_message_id = :messageId,
                    processed_at = CURRENT_TIMESTAMP
                WHERE id = :inboundId
            `, {
                replacements: { messageId, inboundId },
                type: QueryTypes.UPDATE,
                transaction
            });

            return messageId;
        }

        return null;
    }

    async notifyThreadParticipants(linkedData, email, messageId, transaction) {
        // Notificar al staff de APONNT si es una empresa respondiendo
        if (linkedData.recipient_type === 'company' || linkedData.recipient_type === 'external') {
            // Buscar vendedor asignado
            if (linkedData.entity_type === 'contract_renewal') {
                // Para renovaciones de contrato, notificar al vendedor y comercial
                await this.notifyVendorOfReply(linkedData, email, messageId, transaction);
            }
        }

        // Si es un empleado interno respondiendo, notificar al destinatario original
        if (linkedData.recipient_type === 'vendor' || linkedData.recipient_type === 'staff') {
            await this.notifyCompanyOfReply(linkedData, email, messageId, transaction);
        }
    }

    async notifyVendorOfReply(linkedData, email, messageId, transaction) {
        // Buscar vendedor del contrato/presupuesto
        const [vendorInfo] = await sequelize.query(`
            SELECT
                s.staff_id,
                s.email as vendor_email,
                s.first_name || ' ' || s.last_name as vendor_name,
                c.name as company_name
            FROM contracts ct
            JOIN companies c ON ct.company_id = c.company_id
            LEFT JOIN aponnt_staff s ON ct.vendor_id = s.staff_id
            WHERE ct.id = :entityId::uuid
               OR ct.company_id = :companyId
            LIMIT 1
        `, {
            replacements: {
                entityId: linkedData.entity_id,
                companyId: linkedData.company_id
            },
            type: QueryTypes.SELECT,
            transaction
        });

        if (vendorInfo) {
            console.log(`📧 [INBOUND] Notificando a vendedor ${vendorInfo.vendor_email} sobre respuesta de ${email.fromEmail}`);
            // Aquí podríamos crear una notificación interna para el vendedor
            // y/o enviar un email de notificación
        }
    }

    async notifyCompanyOfReply(linkedData, email, messageId, transaction) {
        // Implementar notificación a la empresa si es necesario
        console.log(`📧 [INBOUND] Respuesta del staff registrada para company ${linkedData.company_id}`);
    }

    /**
     * ========================================================================
     * REGISTRO DE MAPEO PARA EMAILS SALIENTES
     * ========================================================================
     * Llamar este método cuando se envía un email que espera respuesta
     */
    async registerOutboundForReply(outboundMessageId, data) {
        try {
            await sequelize.query(`
                INSERT INTO email_thread_mapping (
                    outbound_message_id,
                    notification_id,
                    thread_id,
                    group_id,
                    company_id,
                    entity_type,
                    entity_id,
                    recipient_email,
                    recipient_name,
                    recipient_type,
                    created_at
                ) VALUES (
                    :outboundMessageId,
                    :notificationId,
                    :threadId,
                    :groupId,
                    :companyId,
                    :entityType,
                    :entityId,
                    :recipientEmail,
                    :recipientName,
                    :recipientType,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (outbound_message_id) DO UPDATE SET
                    notification_id = EXCLUDED.notification_id,
                    thread_id = EXCLUDED.thread_id,
                    group_id = EXCLUDED.group_id
            `, {
                replacements: {
                    outboundMessageId,
                    notificationId: data.notificationId || null,
                    threadId: data.threadId || null,
                    groupId: data.groupId || null,
                    companyId: data.companyId || null,
                    entityType: data.entityType || null,
                    entityId: data.entityId || null,
                    recipientEmail: data.recipientEmail,
                    recipientName: data.recipientName || null,
                    recipientType: data.recipientType || 'external'
                },
                type: QueryTypes.INSERT
            });

            console.log(`📧 [INBOUND] Registrado mapeo para Message-ID: ${outboundMessageId}`);

        } catch (error) {
            console.error('❌ [INBOUND] Error registrando mapeo:', error.message);
        }
    }

    /**
     * ========================================================================
     * ESTADÍSTICAS
     * ========================================================================
     */
    async getStats(companyId = null) {
        let whereClause = '';
        const replacements = {};

        if (companyId) {
            whereClause = 'WHERE linked_company_id = :companyId';
            replacements.companyId = companyId;
        }

        const [stats] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE processing_status = 'LINKED') as linked,
                COUNT(*) FILTER (WHERE processing_status = 'ORPHAN') as orphan,
                COUNT(*) FILTER (WHERE processing_status = 'AUTO_REPLY') as auto_replies,
                COUNT(*) FILTER (WHERE processing_status = 'PENDING') as pending,
                COUNT(*) FILTER (WHERE processing_status = 'ERROR') as errors,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d
            FROM email_inbound_log
            ${whereClause}
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        return stats;
    }
}

module.exports = new InboundEmailService();
