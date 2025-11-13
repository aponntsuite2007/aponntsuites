/**
 * ============================================================================
 * EMAIL VERIFICATION SERVICE
 * ============================================================================
 *
 * Sistema de verificación de emails para todos los tipos de usuarios
 * (employee, vendor, leader, supervisor, partner, admin)
 *
 * Funcionalidades:
 * - Generación de tokens únicos de verificación
 * - Envío de emails con link de verificación + consentimientos pendientes
 * - Validación de tokens y actualización de estado
 * - Reenvío de emails de verificación
 * - Limpieza automática de tokens expirados
 *
 * Integración:
 * - EmailService.sendFromAponnt() para envío de emails
 * - Tabla: email_verification_tokens
 * - Actualiza: users.email_verified, partners.is_verified
 *
 * @version 1.0.0
 * @created 2025-11-01
 * ============================================================================
 */

const crypto = require('crypto');
const { sequelize } = require('../config/database');
const EmailService = require('./EmailService');
const EmailTemplateRenderer = require('../utils/EmailTemplateRenderer');
const NotificationService = require('./notificationService');
const { QueryTypes } = require('sequelize');

class EmailVerificationService {
    constructor() {
        this.TOKEN_EXPIRATION_HOURS = 48; // 48 horas
        this.BASE_URL = process.env.BASE_URL || 'http://localhost:9998';
    }

    /**
     * ========================================================================
     * ENVÍO DE EMAIL DE VERIFICACIÓN
     * ========================================================================
     */

    /**
     * Enviar email de verificación inicial (con consentimientos pendientes)
     *
     * @param {number} userId - ID del usuario
     * @param {string} userType - 'employee', 'vendor', 'leader', 'supervisor', 'partner', 'admin'
     * @param {string} email - Email del usuario
     * @param {array} consents - Array de consentimientos pendientes (opcional)
     * @returns {Promise<object>} { success, token, expiresAt }
     */
    async sendVerificationEmail(userId, userType, email, consents = []) {
        try {
            console.log(`🔐 [EMAIL-VERIFY] Enviando verificación a user_id: ${userId} (${userType}), email: ${email}`);

            // 1. Validar inputs
            this._validateUserType(userType);
            this._validateEmail(email);

            // 2. Verificar si ya existe un token no expirado
            const existingToken = await this._getActiveToken(userId, userType);
            if (existingToken && !this._isTokenExpired(existingToken.expires_at)) {
                console.log(`⚠️  [EMAIL-VERIFY] Token activo existente, reenviando mismo link`);

                // Reenviar email con mismo token
                await this._sendVerificationEmailMessage(
                    email,
                    existingToken.token,
                    existingToken.expires_at,
                    consents,
                    userType
                );

                // Crear notificación de reenvío (integración PLUG AND PLAY)
                await this._createEmailNotification(userId, userType, email, existingToken.token, existingToken.expires_at, true);

                return {
                    success: true,
                    token: existingToken.token,
                    expiresAt: existingToken.expires_at,
                    resent: true
                };
            }

            // 3. Generar nuevo token único
            const token = this._generateToken();
            const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);

            // 4. Guardar token en base de datos
            await sequelize.query(`
                INSERT INTO email_verification_tokens (
                    user_id, user_type, email, token, expires_at, is_verified
                ) VALUES (
                    :userId, :userType, :email, :token, :expiresAt, false
                )
            `, {
                replacements: { userId, userType, email, token, expiresAt }
            });

            // 5. Enviar email de verificación
            await this._sendVerificationEmailMessage(email, token, expiresAt, consents, userType);

            // 6. Crear notificación en el sistema de notificaciones (integración PLUG AND PLAY)
            await this._createEmailNotification(userId, userType, email, token, expiresAt, false);

            console.log(`✅ [EMAIL-VERIFY] Email de verificación enviado exitosamente`);
            return {
                success: true,
                token,
                expiresAt
            };

        } catch (error) {
            console.error(`❌ [EMAIL-VERIFY] Error enviando email de verificación:`, error.message);
            throw error;
        }
    }

    /**
     * Reenviar email de verificación (si no está verificado y no expiró)
     *
     * @param {number} userId
     * @param {string} userType
     * @returns {Promise<object>}
     */
    async resendVerificationEmail(userId, userType) {
        try {
            console.log(`🔐 [EMAIL-VERIFY] Reenviando verificación a user_id: ${userId} (${userType})`);

            // 1. Obtener usuario y su email
            const userData = await this._getUserData(userId, userType);
            if (!userData) {
                throw new Error(`Usuario no encontrado: ${userId} (${userType})`);
            }

            // 2. Verificar si ya está verificado
            if (userData.is_verified) {
                return {
                    success: false,
                    error: 'Email ya verificado',
                    code: 'ALREADY_VERIFIED'
                };
            }

            // 3. Obtener consentimientos pendientes
            const consents = await this._getPendingConsents(userId, userType);

            // 4. Enviar email (reutilizará token activo o creará nuevo)
            const result = await this.sendVerificationEmail(
                userId,
                userType,
                userData.email,
                consents
            );

            return result;

        } catch (error) {
            console.error(`❌ [EMAIL-VERIFY] Error reenviando email:`, error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * VERIFICACIÓN DE TOKEN
     * ========================================================================
     */

    /**
     * Verificar token y marcar email como verificado
     *
     * @param {string} token - Token de verificación
     * @returns {Promise<object>} { success, userId, userType, email }
     */
    async verifyToken(token) {
        try {
            console.log(`🔐 [EMAIL-VERIFY] Verificando token: ${token.substring(0, 10)}...`);

            // 1. Buscar token en base de datos
            const [tokenData] = await sequelize.query(`
                SELECT *
                FROM email_verification_tokens
                WHERE token = :token
                AND is_verified = false
                LIMIT 1
            `, {
                replacements: { token },
                type: sequelize.QueryTypes.SELECT
            });

            if (!tokenData) {
                return {
                    success: false,
                    error: 'Token inválido o ya usado',
                    code: 'INVALID_TOKEN'
                };
            }

            // 2. Verificar si expiró
            if (this._isTokenExpired(tokenData.expires_at)) {
                return {
                    success: false,
                    error: 'Token expirado',
                    code: 'EXPIRED_TOKEN',
                    expiresAt: tokenData.expires_at
                };
            }

            // 3. Marcar token como verificado
            await sequelize.query(`
                UPDATE email_verification_tokens
                SET is_verified = true,
                    verified_at = NOW()
                WHERE token = :token
            `, {
                replacements: { token }
            });

            // 4. Actualizar tabla del usuario correspondiente
            await this._markUserAsVerified(tokenData.user_id, tokenData.user_type, tokenData.email);

            // 5. Crear notificación de verificación exitosa (integración PLUG AND PLAY)
            await this._createEmailVerifiedNotification(tokenData.user_id, tokenData.user_type, tokenData.email);

            console.log(`✅ [EMAIL-VERIFY] Email verificado exitosamente para user_id: ${tokenData.user_id} (${tokenData.user_type})`);

            return {
                success: true,
                userId: tokenData.user_id,
                userType: tokenData.user_type,
                email: tokenData.email,
                verifiedAt: new Date()
            };

        } catch (error) {
            console.error(`❌ [EMAIL-VERIFY] Error verificando token:`, error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * CONSULTAS DE ESTADO
     * ========================================================================
     */

    /**
     * Verificar estado de verificación de un usuario
     *
     * @param {number} userId
     * @param {string} userType
     * @returns {Promise<object>}
     */
    async checkVerificationStatus(userId, userType) {
        try {
            const userData = await this._getUserData(userId, userType);

            if (!userData) {
                return {
                    exists: false,
                    isVerified: false
                };
            }

            const tokenData = await this._getActiveToken(userId, userType);

            return {
                exists: true,
                isVerified: userData.is_verified,
                email: userData.email,
                hasPendingToken: !!tokenData && !this._isTokenExpired(tokenData.expires_at),
                tokenExpiresAt: tokenData ? tokenData.expires_at : null
            };

        } catch (error) {
            console.error(`❌ [EMAIL-VERIFY] Error verificando estado:`, error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * LIMPIEZA Y MANTENIMIENTO
     * ========================================================================
     */

    /**
     * Limpiar tokens expirados (llamar desde cron job)
     *
     * @returns {Promise<number>} Cantidad de tokens eliminados
     */
    async cleanupExpiredTokens() {
        try {
            console.log(`🧹 [EMAIL-VERIFY] Limpiando tokens expirados...`);

            const [result] = await sequelize.query(`
                SELECT cleanup_expired_verification_tokens() as deleted_count
            `);

            const deletedCount = result[0].deleted_count;
            console.log(`✅ [EMAIL-VERIFY] ${deletedCount} tokens expirados eliminados`);

            return deletedCount;

        } catch (error) {
            console.error(`❌ [EMAIL-VERIFY] Error limpiando tokens:`, error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * FUNCIONES HELPER PRIVADAS
     * ========================================================================
     */

    /**
     * Generar token único de verificación
     */
    _generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Validar tipo de usuario
     */
    _validateUserType(userType) {
        const validTypes = ['employee', 'vendor', 'leader', 'supervisor', 'partner', 'admin'];
        if (!validTypes.includes(userType)) {
            throw new Error(`Tipo de usuario inválido: ${userType}`);
        }
    }

    /**
     * Validar formato de email
     */
    _validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error(`Email inválido: ${email}`);
        }
    }

    /**
     * Verificar si un token expiró
     */
    _isTokenExpired(expiresAt) {
        return new Date(expiresAt) < new Date();
    }

    /**
     * Obtener token activo (no expirado) de un usuario
     */
    async _getActiveToken(userId, userType) {
        const [token] = await sequelize.query(`
            SELECT *
            FROM email_verification_tokens
            WHERE user_id = :userId
            AND user_type = :userType
            AND is_verified = false
            ORDER BY created_at DESC
            LIMIT 1
        `, {
            replacements: { userId, userType },
            type: sequelize.QueryTypes.SELECT
        });

        return token;
    }

    /**
     * Obtener datos del usuario según su tipo
     */
    async _getUserData(userId, userType) {
        if (userType === 'employee') {
            // Tabla: users
            const [user] = await sequelize.query(`
                SELECT user_id, email, email_verified as is_verified, "firstName", "lastName"
                FROM users
                WHERE user_id = :userId
                LIMIT 1
            `, {
                replacements: { userId },
                type: sequelize.QueryTypes.SELECT
            });
            return user;
        } else {
            // Tabla: partners (vendor, leader, supervisor, partner)
            const [partner] = await sequelize.query(`
                SELECT partner_id as user_id, email, is_verified, first_name, last_name
                FROM partners
                WHERE partner_id = :userId
                AND partner_type = :userType
                LIMIT 1
            `, {
                replacements: { userId, userType },
                type: sequelize.QueryTypes.SELECT
            });
            return partner;
        }
    }

    /**
     * Obtener consentimientos pendientes del usuario
     */
    async _getPendingConsents(userId, userType) {
        const consents = await sequelize.query(`
            SELECT * FROM get_pending_consents(:userId, :userType)
        `, {
            replacements: { userId, userType },
            type: sequelize.QueryTypes.SELECT
        });

        return consents;
    }

    /**
     * Marcar usuario como verificado en su tabla correspondiente
     * ⚠️ IMPORTANTE: También ACTIVA la cuenta (isActive = true, account_status = 'active')
     */
    async _markUserAsVerified(userId, userType, email) {
        if (userType === 'employee') {
            // Actualizar tabla users
            await sequelize.query(`
                UPDATE users
                SET email_verified = true,
                    email_verified_at = NOW(),
                    verification_pending = false,
                    account_status = 'active',
                    is_active = true
                WHERE user_id = :userId
            `, {
                replacements: { userId }
            });

            console.log(`✅ [EMAIL-VERIFY] Usuario ACTIVADO: ${userId} (employee)`);
        } else {
            // Actualizar tabla partners
            await sequelize.query(`
                UPDATE partners
                SET email_verified = true,
                    email_verified_at = NOW(),
                    verification_pending = false,
                    account_status = 'active',
                    is_active = true
                WHERE id = :userId
            `, {
                replacements: { userId }
            });

            console.log(`✅ [EMAIL-VERIFY] Partner ACTIVADO: ${userId} (${userType})`);
        }

        console.log(`✅ [EMAIL-VERIFY] Usuario marcado como verificado en tabla ${userType === 'employee' ? 'users' : 'partners'}`);
    }

    /**
     * Enviar email de verificación con template completo
     */
    async _sendVerificationEmailMessage(email, token, expiresAt, consents, userType) {
        try {
            const verificationLink = `${this.BASE_URL}/verify-email?token=${token}`;
            const expiresAtFormatted = new Date(expiresAt).toLocaleString('es-AR', {
                dateStyle: 'long',
                timeStyle: 'short'
            });

            // Obtener datos del usuario (si está disponible)
            const userData = await this._getUserDataByEmail(email, userType);

            // Preparar datos para el template
            const templateData = {
                user_name: userData?.firstName || userData?.first_name || email.split('@')[0],
                user_email: email,
                user_type: this._getUserTypeLabel(userType),
                verification_link: verificationLink,
                expiration_hours: this.TOKEN_EXPIRATION_HOURS,
                expires_at_formatted: expiresAtFormatted,
                pending_consents: consents || [],
                support_email: 'soporte@aponnt.com',
                base_url: this.BASE_URL
            };

            // Renderizar HTML desde template
            const emailHTML = await EmailTemplateRenderer.render('email-verification', templateData);

            // Texto plano alternativo
            const emailText = `
                Verificación de Email - Aponnt

                ¡Bienvenido!

                Has sido registrado en el Sistema de Asistencia Biométrico Aponnt como ${this._getUserTypeLabel(userType)}.

                Para activar tu cuenta, verifica tu email haciendo clic en el siguiente enlace:
                ${verificationLink}

                Este enlace expira el: ${expiresAtFormatted}

                Si no solicitaste esta verificación, puedes ignorar este email.

                ---
                Aponnt - Sistema de Asistencia Biométrico
                Soporte: soporte@aponnt.com
            `;

            // Enviar email usando EmailService de Aponnt
            await EmailService.sendFromAponnt('support', {
                to: email,
                subject: '🔐 Verifica tu email - Aponnt',
                html: emailHTML,
                text: emailText,
                category: 'verification',
                recipientName: templateData.user_name
            });

            console.log(`✅ [EMAIL-VERIFY] Email de verificación enviado a: ${email}`);

        } catch (error) {
            console.error(`❌ [EMAIL-VERIFY] Error enviando email:`, error.message);
            throw error;
        }
    }

    /**
     * Obtener datos básicos del usuario por email (helper para templates)
     */
    async _getUserDataByEmail(email, userType) {
        try {
            if (userType === 'employee') {
                const [user] = await sequelize.query(`
                    SELECT "firstName", "lastName", email
                    FROM users
                    WHERE email = :email
                    LIMIT 1
                `, {
                    replacements: { email },
                    type: sequelize.QueryTypes.SELECT
                });
                return user;
            } else {
                const [partner] = await sequelize.query(`
                    SELECT first_name, last_name, email
                    FROM partners
                    WHERE email = :email
                    AND partner_type = :userType
                    LIMIT 1
                `, {
                    replacements: { email, userType },
                    type: sequelize.QueryTypes.SELECT
                });
                return partner;
            }
        } catch (error) {
            console.warn(`⚠️  [EMAIL-VERIFY] No se pudo obtener datos del usuario: ${error.message}`);
            return null;
        }
    }

    /**
     * Obtener label legible del tipo de usuario
     */
    _getUserTypeLabel(userType) {
        const labels = {
            'employee': 'Empleado',
            'vendor': 'Vendedor',
            'leader': 'Líder de Equipo',
            'supervisor': 'Supervisor de Soporte',
            'partner': 'Socio Partner',
            'admin': 'Administrador'
        };
        return labels[userType] || userType;
    }

    /**
     * Crear notificación de email verificado exitosamente
     *
     * @param {number} userId - ID del usuario
     * @param {string} userType - Tipo de usuario
     * @param {string} email - Email verificado
     */
    async _createEmailVerifiedNotification(userId, userType, email) {
        try {
            console.log(`✅ [EMAIL-VERIFY] Creando notificación de verificación exitosa...`);

            // 1. Obtener company_id y datos del usuario
            let companyId;
            let userName;

            if (userType === 'employee') {
                const [user] = await sequelize.query(`
                    SELECT company_id, "firstName", "lastName"
                    FROM users
                    WHERE user_id = :userId
                    LIMIT 1
                `, {
                    replacements: { userId },
                    type: QueryTypes.SELECT
                });

                if (!user) {
                    console.warn(`⚠️  [EMAIL-VERIFY] Usuario no encontrado: ${userId}`);
                    return;
                }

                companyId = user.company_id;
                userName = `${user.firstName} ${user.lastName}`;
            } else {
                console.log(`ℹ️  [EMAIL-VERIFY] Usuario tipo ${userType}, omitiendo notificación (no pertenece a empresa)`);
                return;
            }

            // 2. Obtener administradores de la empresa
            const admins = await sequelize.query(`
                SELECT user_id::text as user_id_str
                FROM users
                WHERE company_id = :companyId
                AND role IN ('admin', 'super_admin')
                AND "isActive" = true
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            if (admins.length === 0) {
                console.warn(`⚠️  [EMAIL-VERIFY] No hay admins activos en company_id: ${companyId}`);
                return;
            }

            const participantIds = admins.map(a => a.user_id_str);

            // 3. Buscar grupo de notificación existente para este usuario
            const [existingGroup] = await sequelize.query(`
                SELECT group_id
                FROM notification_groups
                WHERE company_id = :companyId
                AND context_type = 'email_verification'
                AND (group_metadata->>'user_id')::uuid = :userId
                AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 1
            `, {
                replacements: { companyId: companyId.toString(), userId },
                type: QueryTypes.SELECT
            });

            let groupId;

            if (existingGroup) {
                // Usar grupo existente
                groupId = existingGroup.group_id;
                console.log(`ℹ️  [EMAIL-VERIFY] Usando grupo de notificación existente: ${groupId}`);
            } else {
                // Crear nuevo grupo si no existe
                const groupMetadata = {
                    user_id: userId,
                    user_type: userType,
                    email: email,
                    verification_completed: true,
                    completed_at: new Date()
                };

                const notificationGroup = await NotificationService.createGroup(
                    companyId.toString(),
                    'email_verification',
                    participantIds,
                    groupMetadata,
                    'normal'
                );

                groupId = notificationGroup.group_id;
                console.log(`✅ [EMAIL-VERIFY] Grupo de notificación creado: ${groupId}`);
            }

            // 4. Crear mensaje de verificación exitosa
            const messageText = `✅ ${userName} (${email}) ha verificado su email exitosamente. Cuenta activada.`;

            const messageMetadata = {
                action: 'email_verified_successfully',
                recipient_email: email,
                recipient_name: userName,
                user_id: userId,
                user_type: userType,
                verified_at: new Date()
            };

            const message = await NotificationService.createMessage(
                groupId,
                'system',
                'system',
                messageText,
                messageMetadata
            );

            console.log(`✅ [EMAIL-VERIFY] Mensaje de verificación exitosa creado: ${message.message_id}`);

        } catch (error) {
            console.error(`❌ [EMAIL-VERIFY] Error creando notificación de verificación:`, error.message);
            // No lanzamos el error para no bloquear la verificación
        }
    }

    /**
     * Crear notificación en el sistema de notificaciones existente
     * Integración PLUG AND PLAY con notification_groups y notification_messages
     *
     * @param {number} userId - ID del usuario
     * @param {string} userType - Tipo de usuario
     * @param {string} email - Email del destinatario
     * @param {string} token - Token de verificación generado
     * @param {Date} expiresAt - Fecha de expiración del token
     * @param {boolean} isResend - Si es un reenvío
     */
    async _createEmailNotification(userId, userType, email, token, expiresAt, isResend = false) {
        try {
            console.log(`📧 [EMAIL-VERIFY] Creando notificación en sistema de notificaciones...`);

            // 1. Obtener company_id y datos del usuario
            let companyId;
            let userName;

            if (userType === 'employee') {
                const [user] = await sequelize.query(`
                    SELECT company_id, "firstName", "lastName"
                    FROM users
                    WHERE user_id = :userId
                    LIMIT 1
                `, {
                    replacements: { userId },
                    type: QueryTypes.SELECT
                });

                if (!user) {
                    console.warn(`⚠️  [EMAIL-VERIFY] Usuario no encontrado: ${userId}`);
                    return;
                }

                companyId = user.company_id;
                userName = `${user.firstName} ${user.lastName}`;
            } else {
                // Para partners, el company_id podría ser null (staff de Aponnt)
                // En ese caso, usamos un company_id especial o lo omitimos
                console.log(`ℹ️  [EMAIL-VERIFY] Usuario tipo ${userType}, omitiendo notificación (no pertenece a empresa)`);
                return;
            }

            // 2. Obtener administradores de la empresa que deben ver la notificación
            const admins = await sequelize.query(`
                SELECT user_id::text as user_id_str
                FROM users
                WHERE company_id = :companyId
                AND role IN ('admin', 'super_admin')
                AND "isActive" = true
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            if (admins.length === 0) {
                console.warn(`⚠️  [EMAIL-VERIFY] No hay admins activos en company_id: ${companyId}`);
                return;
            }

            const participantIds = admins.map(a => a.user_id_str);

            // 3. Crear grupo de notificación
            const groupMetadata = {
                user_id: userId,
                user_type: userType,
                email: email,
                token_expiration: expiresAt,
                is_resend: isResend,
                created_at: new Date()
            };

            const notificationGroup = await NotificationService.createGroup(
                companyId.toString(),
                'email_verification',
                participantIds,
                groupMetadata,
                'normal' // priority
            );

            console.log(`✅ [EMAIL-VERIFY] Grupo de notificación creado: ${notificationGroup.group_id}`);

            // 4. Crear mensaje en el grupo
            const messageText = isResend
                ? `✉️ Email de verificación reenviado a ${userName} (${email}). Expira: ${new Date(expiresAt).toLocaleString('es-AR')}`
                : `✉️ Email de verificación enviado a ${userName} (${email}). Expira: ${new Date(expiresAt).toLocaleString('es-AR')}`;

            const messageMetadata = {
                action: 'email_verification_sent',
                recipient_email: email,
                recipient_name: userName,
                user_id: userId,
                user_type: userType,
                expires_at: expiresAt,
                is_resend: isResend
            };

            const message = await NotificationService.createMessage(
                notificationGroup.group_id,
                'system', // sender_id
                'system', // sender_type
                messageText,
                messageMetadata
            );

            console.log(`✅ [EMAIL-VERIFY] Mensaje de notificación creado: ${message.message_id}`);
            console.log(`📊 [EMAIL-VERIFY] Notificación visible para ${participantIds.length} administrador(es)`);

        } catch (error) {
            console.error(`❌ [EMAIL-VERIFY] Error creando notificación:`, error.message);
            // No lanzamos el error para no bloquear el envío del email
            // La notificación es "best effort"
        }
    }
}

// Singleton
const emailVerificationService = new EmailVerificationService();

module.exports = emailVerificationService;
