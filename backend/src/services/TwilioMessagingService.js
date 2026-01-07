/**
 * ============================================================================
 * TWILIO MESSAGING SERVICE
 * ============================================================================
 *
 * Servicio unificado para enviar SMS y WhatsApp vía Twilio
 *
 * CONFIGURACIÓN REQUERIDA:
 * - TWILIO_ACCOUNT_SID en .env
 * - TWILIO_AUTH_TOKEN en .env
 * - TWILIO_PHONE_NUMBER en .env (para SMS)
 * - TWILIO_WHATSAPP_NUMBER en .env (para WhatsApp, formato: whatsapp:+14155238886)
 *
 * ============================================================================
 */

const twilio = require('twilio');

class TwilioMessagingService {

    constructor() {
        this.initialized = false;
        this.client = null;
        this.phoneNumber = null;
        this.whatsappNumber = null;

        this.initialize();
    }

    /**
     * Inicializar Twilio Client
     */
    initialize() {
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
            this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

            if (!accountSid || !authToken) {
                console.warn('⚠️  [TWILIO] Twilio no configurado - SMS/WhatsApp NO se enviarán');
                console.warn('⚠️  [TWILIO] Para habilitar, configura en .env:');
                console.warn('   - TWILIO_ACCOUNT_SID');
                console.warn('   - TWILIO_AUTH_TOKEN');
                console.warn('   - TWILIO_PHONE_NUMBER (para SMS)');
                console.warn('   - TWILIO_WHATSAPP_NUMBER (para WhatsApp)');
                return;
            }

            this.client = twilio(accountSid, authToken);
            this.initialized = true;

            console.log('✅ [TWILIO] Twilio Client inicializado correctamente');
            if (this.phoneNumber) {
                console.log(`   📱 SMS habilitado desde: ${this.phoneNumber}`);
            }
            if (this.whatsappNumber) {
                console.log(`   💬 WhatsApp habilitado desde: ${this.whatsappNumber}`);
            }

        } catch (error) {
            console.error('❌ [TWILIO] Error inicializando Twilio:', error.message);
        }
    }

    /**
     * ========================================================================
     * ENVIAR SMS
     * ========================================================================
     */
    async sendSMS(params) {
        if (!this.initialized) {
            console.warn('⚠️  [TWILIO-SMS] No inicializado - simulando envío');
            return {
                success: false,
                provider: 'twilio_sms',
                status: 'not_configured',
                messageSid: null
            };
        }

        if (!this.phoneNumber) {
            console.warn('⚠️  [TWILIO-SMS] TWILIO_PHONE_NUMBER no configurado');
            return {
                success: false,
                provider: 'twilio_sms',
                status: 'no_phone_configured',
                messageSid: null
            };
        }

        try {
            const { to, body } = params;

            if (!to) {
                throw new Error('Número de teléfono destino requerido');
            }

            // Normalizar número de teléfono (asegurar formato internacional)
            const toNumber = this.normalizePhoneNumber(to);

            console.log(`📱 [TWILIO-SMS] Enviando SMS a: ${toNumber}`);

            const message = await this.client.messages.create({
                from: this.phoneNumber,
                to: toNumber,
                body
            });

            console.log(`✅ [TWILIO-SMS] SMS enviado: ${message.sid}`);

            return {
                success: true,
                provider: 'twilio_sms',
                status: message.status,
                messageSid: message.sid,
                details: {
                    to: message.to,
                    from: message.from,
                    dateCreated: message.dateCreated,
                    price: message.price,
                    priceUnit: message.priceUnit
                }
            };

        } catch (error) {
            console.error('❌ [TWILIO-SMS] Error enviando SMS:', error.message);

            return {
                success: false,
                provider: 'twilio_sms',
                status: 'failed',
                error: error.message,
                errorCode: error.code
            };
        }
    }

    /**
     * ========================================================================
     * ENVIAR WHATSAPP
     * ========================================================================
     */
    async sendWhatsApp(params) {
        if (!this.initialized) {
            console.warn('⚠️  [TWILIO-WHATSAPP] No inicializado - simulando envío');
            return {
                success: false,
                provider: 'twilio_whatsapp',
                status: 'not_configured',
                messageSid: null
            };
        }

        if (!this.whatsappNumber) {
            console.warn('⚠️  [TWILIO-WHATSAPP] TWILIO_WHATSAPP_NUMBER no configurado');
            return {
                success: false,
                provider: 'twilio_whatsapp',
                status: 'no_whatsapp_configured',
                messageSid: null
            };
        }

        try {
            const { to, body, mediaUrl } = params;

            if (!to) {
                throw new Error('Número de teléfono destino requerido');
            }

            // Normalizar número de WhatsApp (formato: whatsapp:+1234567890)
            const toWhatsApp = this.normalizeWhatsAppNumber(to);

            console.log(`💬 [TWILIO-WHATSAPP] Enviando WhatsApp a: ${toWhatsApp}`);

            const messageParams = {
                from: this.whatsappNumber,
                to: toWhatsApp,
                body
            };

            // Agregar media si se proporciona
            if (mediaUrl) {
                messageParams.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
            }

            const message = await this.client.messages.create(messageParams);

            console.log(`✅ [TWILIO-WHATSAPP] WhatsApp enviado: ${message.sid}`);

            return {
                success: true,
                provider: 'twilio_whatsapp',
                status: message.status,
                messageSid: message.sid,
                details: {
                    to: message.to,
                    from: message.from,
                    dateCreated: message.dateCreated,
                    price: message.price,
                    priceUnit: message.priceUnit,
                    numMedia: message.numMedia
                }
            };

        } catch (error) {
            console.error('❌ [TWILIO-WHATSAPP] Error enviando WhatsApp:', error.message);

            return {
                success: false,
                provider: 'twilio_whatsapp',
                status: 'failed',
                error: error.message,
                errorCode: error.code
            };
        }
    }

    /**
     * ========================================================================
     * ENVIAR MENSAJE BULK (SMS o WhatsApp)
     * ========================================================================
     */
    async sendBulk(params) {
        const { recipients, body, type = 'sms' } = params;

        if (!recipients || recipients.length === 0) {
            throw new Error('Lista de destinatarios requerida');
        }

        console.log(`📤 [TWILIO-BULK] Enviando ${type.toUpperCase()} a ${recipients.length} destinatarios...`);

        const results = {
            total: recipients.length,
            success: 0,
            failed: 0,
            details: []
        };

        for (const to of recipients) {
            try {
                let result;

                if (type === 'whatsapp') {
                    result = await this.sendWhatsApp({ to, body });
                } else {
                    result = await this.sendSMS({ to, body });
                }

                if (result.success) {
                    results.success++;
                } else {
                    results.failed++;
                }

                results.details.push({
                    to,
                    success: result.success,
                    messageSid: result.messageSid,
                    error: result.error
                });

            } catch (error) {
                results.failed++;
                results.details.push({
                    to,
                    success: false,
                    error: error.message
                });
            }
        }

        console.log(`✅ [TWILIO-BULK] Finalizado: ${results.success} éxitos, ${results.failed} fallos`);

        return results;
    }

    /**
     * ========================================================================
     * UTILIDADES
     * ========================================================================
     */

    /**
     * Normalizar número de teléfono a formato internacional
     */
    normalizePhoneNumber(phone) {
        // Remover espacios, guiones y paréntesis
        let normalized = phone.replace(/[\s\-\(\)]/g, '');

        // Si no empieza con +, agregar + (asume que ya tiene código de país)
        if (!normalized.startsWith('+')) {
            normalized = '+' + normalized;
        }

        return normalized;
    }

    /**
     * Normalizar número de WhatsApp a formato Twilio
     */
    normalizeWhatsAppNumber(phone) {
        // Normalizar número primero
        let normalized = this.normalizePhoneNumber(phone);

        // Si ya tiene prefijo whatsapp:, retornar
        if (normalized.startsWith('whatsapp:')) {
            return normalized;
        }

        // Agregar prefijo whatsapp:
        return `whatsapp:${normalized}`;
    }

    /**
     * Verificar si Twilio está inicializado
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Verificar status de un mensaje enviado
     */
    async getMessageStatus(messageSid) {
        if (!this.initialized) {
            throw new Error('Twilio no inicializado');
        }

        try {
            const message = await this.client.messages(messageSid).fetch();

            return {
                sid: message.sid,
                status: message.status,
                to: message.to,
                from: message.from,
                body: message.body,
                dateCreated: message.dateCreated,
                dateSent: message.dateSent,
                dateUpdated: message.dateUpdated,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage
            };
        } catch (error) {
            console.error('❌ [TWILIO] Error obteniendo status de mensaje:', error.message);
            throw error;
        }
    }
}

// Exportar singleton
const twilioMessagingService = new TwilioMessagingService();
module.exports = twilioMessagingService;
