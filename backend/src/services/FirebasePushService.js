/**
 * ============================================================================
 * FIREBASE PUSH NOTIFICATION SERVICE
 * ============================================================================
 *
 * Servicio para enviar push notifications vía Firebase Cloud Messaging (FCM)
 *
 * CONFIGURACIÓN REQUERIDA:
 * - FIREBASE_PROJECT_ID en .env
 * - FIREBASE_CLIENT_EMAIL en .env
 * - FIREBASE_PRIVATE_KEY en .env
 *
 * O archivo de credenciales:
 * - FIREBASE_SERVICE_ACCOUNT_PATH en .env (ruta al archivo JSON)
 *
 * ============================================================================
 */

const admin = require('firebase-admin');

class FirebasePushService {

    constructor() {
        this.initialized = false;
        this.app = null;

        this.initialize();
    }

    /**
     * Inicializar Firebase Admin SDK
     */
    initialize() {
        try {
            // Opción 1: Usar archivo de credenciales
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

            if (serviceAccountPath) {
                console.log('🔥 [FIREBASE] Inicializando con archivo de credenciales...');

                const serviceAccount = require(serviceAccountPath);

                this.app = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: serviceAccount.project_id
                });

                this.initialized = true;
                console.log('✅ [FIREBASE] Firebase Admin SDK inicializado correctamente');
                return;
            }

            // Opción 2: Usar variables de entorno individuales
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (projectId && clientEmail && privateKey) {
                console.log('🔥 [FIREBASE] Inicializando con variables de entorno...');

                this.app = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey: privateKey.replace(/\\n/g, '\n')
                    }),
                    projectId
                });

                this.initialized = true;
                console.log('✅ [FIREBASE] Firebase Admin SDK inicializado correctamente');
                return;
            }

            // Sin configuración - modo fallback
            console.warn('⚠️  [FIREBASE] Firebase no configurado - las push notifications NO se enviarán');
            console.warn('⚠️  [FIREBASE] Para habilitar, configura en .env:');
            console.warn('   - FIREBASE_PROJECT_ID');
            console.warn('   - FIREBASE_CLIENT_EMAIL');
            console.warn('   - FIREBASE_PRIVATE_KEY');
            console.warn('   O:');
            console.warn('   - FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-credentials.json');

        } catch (error) {
            console.error('❌ [FIREBASE] Error inicializando Firebase:', error.message);
        }
    }

    /**
     * Enviar push notification a un dispositivo
     *
     * @param {Object} params
     * @param {string} params.token - FCM device token
     * @param {string} params.title - Título de la notificación
     * @param {string} params.body - Cuerpo del mensaje
     * @param {Object} params.data - Data adicional
     * @param {Object} params.options - Opciones de FCM
     */
    async sendToDevice(params) {
        if (!this.initialized) {
            console.warn('⚠️  [FIREBASE] No inicializado - simulando envío');
            return {
                success: false,
                provider: 'fcm',
                status: 'not_configured',
                messageId: null
            };
        }

        try {
            const { token, title, body, data = {}, options = {} } = params;

            if (!token) {
                throw new Error('Token de dispositivo requerido');
            }

            // Construir mensaje FCM
            const message = {
                token,
                notification: {
                    title,
                    body
                },
                data: {
                    ...data,
                    timestamp: Date.now().toString()
                },
                android: options.android || {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                    }
                },
                apns: options.apns || {
                    headers: {
                        'apns-priority': '10'
                    },
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                },
                webpush: options.webpush || {
                    notification: {
                        icon: '/icon-192x192.png',
                        badge: '/badge-72x72.png'
                    }
                }
            };

            // Enviar mensaje
            console.log(`🔥 [FIREBASE] Enviando push a token: ${token.substring(0, 20)}...`);
            const response = await admin.messaging().send(message);

            console.log(`✅ [FIREBASE] Push enviado exitosamente: ${response}`);

            return {
                success: true,
                provider: 'fcm',
                status: 'sent',
                messageId: response
            };

        } catch (error) {
            console.error('❌ [FIREBASE] Error enviando push:', error.message);

            return {
                success: false,
                provider: 'fcm',
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Enviar push notification a múltiples dispositivos
     *
     * @param {Object} params
     * @param {Array<string>} params.tokens - Array de FCM device tokens
     * @param {string} params.title - Título de la notificación
     * @param {string} params.body - Cuerpo del mensaje
     * @param {Object} params.data - Data adicional
     */
    async sendToMultipleDevices(params) {
        if (!this.initialized) {
            console.warn('⚠️  [FIREBASE] No inicializado - simulando envío');
            return {
                success: false,
                provider: 'fcm',
                status: 'not_configured',
                successCount: 0,
                failureCount: 0
            };
        }

        try {
            const { tokens, title, body, data = {} } = params;

            if (!tokens || tokens.length === 0) {
                throw new Error('Tokens de dispositivos requeridos');
            }

            // Construir mensaje FCM multicast
            const message = {
                tokens,
                notification: {
                    title,
                    body
                },
                data: {
                    ...data,
                    timestamp: Date.now().toString()
                },
                android: {
                    priority: 'high'
                },
                apns: {
                    headers: {
                        'apns-priority': '10'
                    }
                }
            };

            // Enviar mensaje multicast
            console.log(`🔥 [FIREBASE] Enviando push a ${tokens.length} dispositivos...`);
            const response = await admin.messaging().sendMulticast(message);

            console.log(`✅ [FIREBASE] Push multicast: ${response.successCount} éxitos, ${response.failureCount} fallos`);

            // Procesar tokens inválidos
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push({
                            token: tokens[idx],
                            error: resp.error?.message
                        });
                    }
                });

                console.warn(`⚠️  [FIREBASE] Tokens fallidos: ${JSON.stringify(failedTokens, null, 2)}`);
            }

            return {
                success: response.successCount > 0,
                provider: 'fcm',
                status: 'sent',
                successCount: response.successCount,
                failureCount: response.failureCount,
                responses: response.responses
            };

        } catch (error) {
            console.error('❌ [FIREBASE] Error enviando push multicast:', error.message);

            return {
                success: false,
                provider: 'fcm',
                status: 'failed',
                error: error.message,
                successCount: 0,
                failureCount: tokens?.length || 0
            };
        }
    }

    /**
     * Enviar push notification a un topic
     *
     * @param {Object} params
     * @param {string} params.topic - Nombre del topic
     * @param {string} params.title - Título
     * @param {string} params.body - Cuerpo
     * @param {Object} params.data - Data adicional
     */
    async sendToTopic(params) {
        if (!this.initialized) {
            console.warn('⚠️  [FIREBASE] No inicializado - simulando envío');
            return {
                success: false,
                provider: 'fcm',
                status: 'not_configured'
            };
        }

        try {
            const { topic, title, body, data = {} } = params;

            const message = {
                topic,
                notification: {
                    title,
                    body
                },
                data: {
                    ...data,
                    timestamp: Date.now().toString()
                }
            };

            console.log(`🔥 [FIREBASE] Enviando push a topic: ${topic}`);
            const response = await admin.messaging().send(message);

            console.log(`✅ [FIREBASE] Push enviado a topic: ${response}`);

            return {
                success: true,
                provider: 'fcm',
                status: 'sent',
                messageId: response
            };

        } catch (error) {
            console.error('❌ [FIREBASE] Error enviando push a topic:', error.message);

            return {
                success: false,
                provider: 'fcm',
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Suscribir dispositivos a un topic
     */
    async subscribeToTopic(tokens, topic) {
        if (!this.initialized) {
            console.warn('⚠️  [FIREBASE] No inicializado');
            return { success: false };
        }

        try {
            const response = await admin.messaging().subscribeToTopic(tokens, topic);
            console.log(`✅ [FIREBASE] ${response.successCount} dispositivos suscritos a topic: ${topic}`);
            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount
            };
        } catch (error) {
            console.error('❌ [FIREBASE] Error suscribiendo a topic:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Desuscribir dispositivos de un topic
     */
    async unsubscribeFromTopic(tokens, topic) {
        if (!this.initialized) {
            console.warn('⚠️  [FIREBASE] No inicializado');
            return { success: false };
        }

        try {
            const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
            console.log(`✅ [FIREBASE] ${response.successCount} dispositivos desuscritos de topic: ${topic}`);
            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount
            };
        } catch (error) {
            console.error('❌ [FIREBASE] Error desuscribiendo de topic:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar si Firebase está inicializado
     */
    isInitialized() {
        return this.initialized;
    }
}

// Exportar singleton
const firebasePushService = new FirebasePushService();
module.exports = firebasePushService;
