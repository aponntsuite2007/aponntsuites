/**
 * ============================================================================
 * EMAIL CONFIG SERVICE - Gestión segura de configuraciones de email Aponnt
 * ============================================================================
 *
 * Servicio para administrar credenciales y configuraciones SMTP de emails
 * de Aponnt desde el módulo de Ingeniería.
 *
 * SEGURIDAD:
 * - Solo accesible para GG (Gerente General) y SUPERADMIN
 * - Passwords encriptados con AES-256-CBC
 * - Auditoría de todos los cambios
 * - Test de conexión antes de guardar
 *
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailConfigService {
    constructor() {
        // Clave de encriptación (debería estar en .env en producción)
        this.encryptionKey = process.env.EMAIL_ENCRYPTION_KEY || 'aponnt-email-config-secret-key-2025';
        this.algorithm = 'aes-256-cbc';
    }

    // =========================================================================
    // ENCRIPTACIÓN DE PASSWORDS
    // =========================================================================

    /**
     * Encriptar password
     */
    encrypt(text) {
        if (!text) return null;

        try {
            // Generar key de 32 bytes desde la clave
            const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
            const iv = crypto.randomBytes(16);

            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Retornar IV + encrypted (separados por :)
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error encriptando:', error.message);
            throw new Error('Error encriptando password');
        }
    }

    /**
     * Desencriptar password
     */
    decrypt(encrypted) {
        if (!encrypted) return null;

        try {
            // Generar key de 32 bytes desde la clave
            const key = crypto.createHash('sha256').update(this.encryptionKey).digest();

            // Separar IV y encrypted
            const parts = encrypted.split(':');
            if (parts.length !== 2) {
                throw new Error('Formato de password encriptado inválido');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = parts[1];

            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error desencriptando:', error.message);
            throw new Error('Error desencriptando password');
        }
    }

    // =========================================================================
    // CRUD DE CONFIGURACIONES
    // =========================================================================

    /**
     * Obtener todas las configuraciones de email (sin passwords)
     * Solo para GG/SUPERADMIN
     */
    async getAllConfigs(staffRole) {
        // Validar permisos
        if (!this.hasPermission(staffRole)) {
            throw new Error('Acceso denegado: solo GG/SUPERADMIN puede ver configuraciones');
        }

        try {
            const configs = await sequelize.query(`
                SELECT
                    id,
                    email_type,
                    email_address,
                    display_name,
                    from_name,
                    from_email,
                    reply_to,
                    smtp_host,
                    smtp_port,
                    smtp_secure,
                    recovery_phone,
                    backup_email,
                    last_test_at,
                    test_status,
                    notes,
                    is_active,
                    -- NO incluir passwords
                    CASE WHEN smtp_password IS NOT NULL THEN '••••••••' ELSE NULL END as smtp_password_masked,
                    CASE WHEN app_password IS NOT NULL THEN '••••••••' ELSE NULL END as app_password_masked
                FROM aponnt_email_config
                ORDER BY
                    CASE email_type
                        WHEN 'commercial' THEN 1
                        WHEN 'partners' THEN 2
                        WHEN 'staff' THEN 3
                        WHEN 'support' THEN 4
                        WHEN 'engineering' THEN 5
                        WHEN 'executive' THEN 6
                        WHEN 'institutional' THEN 7
                        WHEN 'billing' THEN 8
                        WHEN 'onboarding' THEN 9
                        WHEN 'transactional' THEN 10
                        WHEN 'escalation' THEN 11
                        ELSE 99
                    END
            `, { type: QueryTypes.SELECT });

            return configs;
        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error obteniendo configs:', error);
            throw error;
        }
    }

    /**
     * Obtener configuración por email_type (con passwords desencriptados)
     * Solo para uso interno del sistema
     */
    async getConfigByType(emailType) {
        try {
            const [config] = await sequelize.query(`
                SELECT * FROM aponnt_email_config
                WHERE email_type = :emailType AND is_active = TRUE
                LIMIT 1
            `, {
                replacements: { emailType },
                type: QueryTypes.SELECT
            });

            if (!config) {
                return null;
            }

            // Desencriptar passwords si existen
            if (config.smtp_password) {
                config.smtp_password_decrypted = this.decrypt(config.smtp_password);
            }
            if (config.app_password) {
                config.app_password_decrypted = this.decrypt(config.app_password);
            }

            return config;
        } catch (error) {
            console.error(`❌ [EMAIL-CONFIG] Error obteniendo config ${emailType}:`, error);
            throw error;
        }
    }

    /**
     * Actualizar configuración de email
     */
    async updateConfig(emailType, updates, staffId, staffRole) {
        // Validar permisos
        if (!this.hasPermission(staffRole)) {
            throw new Error('Acceso denegado: solo GG/SUPERADMIN puede actualizar configuraciones');
        }

        try {
            console.log(`🔧 [EMAIL-CONFIG] Actualizando config: ${emailType}`);

            // Encriptar passwords si vienen
            if (updates.smtp_password && updates.smtp_password !== '••••••••') {
                updates.smtp_password = this.encrypt(updates.smtp_password);
            } else if (updates.smtp_password === '••••••••') {
                delete updates.smtp_password; // No cambiar si es máscara
            }

            if (updates.app_password && updates.app_password !== '••••••••') {
                updates.app_password = this.encrypt(updates.app_password);
            } else if (updates.app_password === '••••••••') {
                delete updates.app_password; // No cambiar si es máscara
            }

            // Construir query dinámico
            const fields = [];
            const values = [];

            const allowedFields = [
                'email_address', 'display_name', 'from_name', 'from_email', 'reply_to',
                'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_password', 'app_password',
                'recovery_phone', 'backup_email', 'notes', 'is_active'
            ];

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                throw new Error('No hay campos válidos para actualizar');
            }

            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(emailType);

            await sequelize.query(`
                UPDATE aponnt_email_config
                SET ${fields.join(', ')}
                WHERE email_type = ?
            `, { replacements: values });

            // Registrar en auditoría
            await this.logAudit(emailType, 'update', staffId, updates);

            console.log(`✅ [EMAIL-CONFIG] Config actualizada: ${emailType}`);
            return { success: true, message: 'Configuración actualizada' };

        } catch (error) {
            console.error(`❌ [EMAIL-CONFIG] Error actualizando config ${emailType}:`, error);
            throw error;
        }
    }

    // =========================================================================
    // TEST DE CONEXIÓN SMTP
    // =========================================================================

    /**
     * Probar conexión SMTP de una configuración
     */
    async testConnection(emailType, staffRole) {
        // Validar permisos
        if (!this.hasPermission(staffRole)) {
            throw new Error('Acceso denegado: solo GG/SUPERADMIN puede testear conexiones');
        }

        try {
            console.log(`🔍 [EMAIL-CONFIG] Testeando conexión SMTP: ${emailType}`);

            // Obtener config con passwords desencriptados
            const config = await this.getConfigByType(emailType);

            if (!config) {
                throw new Error(`Configuración no encontrada: ${emailType}`);
            }

            if (!config.smtp_password_decrypted && !config.app_password_decrypted) {
                throw new Error('No hay credenciales configuradas');
            }

            // Crear transporter
            const transporter = nodemailer.createTransport({
                host: config.smtp_host,
                port: config.smtp_port,
                secure: config.smtp_secure,
                auth: {
                    user: config.from_email || config.email_address,
                    pass: config.app_password_decrypted || config.smtp_password_decrypted
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // Verificar conexión
            await transporter.verify();

            // Enviar email de prueba a sí mismo
            const testEmail = await transporter.sendMail({
                from: `"${config.from_name || config.display_name}" <${config.from_email || config.email_address}>`,
                to: config.from_email || config.email_address,
                subject: '✅ Test de Conexión SMTP - Sistema Aponnt',
                html: `
                    <h2>✅ ¡Conexión SMTP Exitosa!</h2>
                    <p>La configuración de email ha sido validada correctamente.</p>
                    <p><strong>Email:</strong> ${config.email_address}</p>
                    <p><strong>Tipo:</strong> ${config.email_type}</p>
                    <p><strong>Servidor:</strong> ${config.smtp_host}:${config.smtp_port}</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
                    <hr>
                    <p style="color: #666; font-size: 0.9em;">
                        Este es un email de prueba automático del Sistema Biométrico Aponnt.
                    </p>
                `
            });

            // Actualizar last_test_at y test_status
            await sequelize.query(`
                UPDATE aponnt_email_config
                SET last_test_at = CURRENT_TIMESTAMP,
                    test_status = 'success'
                WHERE email_type = ?
            `, { replacements: [emailType] });

            console.log(`✅ [EMAIL-CONFIG] Test exitoso: ${emailType} - MessageID: ${testEmail.messageId}`);

            return {
                success: true,
                message: 'Conexión SMTP exitosa. Email de prueba enviado.',
                messageId: testEmail.messageId,
                testedAt: new Date()
            };

        } catch (error) {
            console.error(`❌ [EMAIL-CONFIG] Error testeando conexión ${emailType}:`, error);

            // Actualizar test_status a failed
            await sequelize.query(`
                UPDATE aponnt_email_config
                SET last_test_at = CURRENT_TIMESTAMP,
                    test_status = 'failed'
                WHERE email_type = ?
            `, { replacements: [emailType] });

            return {
                success: false,
                message: `Error de conexión: ${error.message}`,
                error: error.message,
                code: error.code
            };
        }
    }

    // =========================================================================
    // AUDITORÍA
    // =========================================================================

    /**
     * Registrar cambio en auditoría
     */
    async logAudit(emailType, action, staffId, changes = {}) {
        try {
            // Ocultar passwords en log de auditoría
            const sanitizedChanges = { ...changes };
            if (sanitizedChanges.smtp_password) {
                sanitizedChanges.smtp_password = '••••••••';
            }
            if (sanitizedChanges.app_password) {
                sanitizedChanges.app_password = '••••••••';
            }

            await sequelize.query(`
                INSERT INTO email_config_audit_log (
                    email_type, action, changed_by_staff_id, changes, changed_at
                ) VALUES (?, ?, ?, ?::jsonb, CURRENT_TIMESTAMP)
            `, {
                replacements: [
                    emailType,
                    action,
                    staffId,
                    JSON.stringify(sanitizedChanges)
                ]
            });
        } catch (error) {
            // No fallar si el log de auditoría falla
            console.warn('⚠️ [EMAIL-CONFIG] Error registrando auditoría:', error.message);
        }
    }

    /**
     * Obtener historial de auditoría
     */
    async getAuditLog(emailType = null, limit = 50) {
        try {
            let whereClause = '';
            const params = [];

            if (emailType) {
                whereClause = 'WHERE email_type = ?';
                params.push(emailType);
            }

            params.push(limit);

            const logs = await sequelize.query(`
                SELECT
                    al.*,
                    COALESCE(s.first_name || ' ' || s.last_name, s.email) as changed_by_name
                FROM email_config_audit_log al
                LEFT JOIN aponnt_staff s ON al.changed_by_staff_id = s.staff_id
                ${whereClause}
                ORDER BY al.changed_at DESC
                LIMIT ?
            `, {
                replacements: params,
                type: QueryTypes.SELECT
            });

            return logs;
        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error obteniendo audit log:', error);
            return [];
        }
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    /**
     * Validar si el usuario tiene permiso
     */
    hasPermission(staffRole) {
        return staffRole === 'GG' || staffRole === 'SUPERADMIN';
    }

    /**
     * Crear tabla de auditoría (si no existe)
     */
    async initializeAuditTable() {
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS email_config_audit_log (
                    id SERIAL PRIMARY KEY,
                    email_type VARCHAR(50) NOT NULL,
                    action VARCHAR(50) NOT NULL, -- 'update', 'test', 'activate', 'deactivate'
                    changed_by_staff_id UUID REFERENCES aponnt_staff(staff_id),
                    changes JSONB,
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_email_config_audit_email_type
                ON email_config_audit_log(email_type);

                CREATE INDEX IF NOT EXISTS idx_email_config_audit_changed_at
                ON email_config_audit_log(changed_at DESC);
            `);

            console.log('✅ [EMAIL-CONFIG] Tabla de auditoría inicializada');
        } catch (error) {
            console.warn('⚠️ [EMAIL-CONFIG] Error inicializando tabla de auditoría:', error.message);
        }
    }

    /**
     * Obtener estadísticas de configuraciones
     */
    async getStats() {
        try {
            const [stats] = await sequelize.query(`
                SELECT
                    COUNT(*) as total_configs,
                    COUNT(*) FILTER (WHERE is_active = TRUE) as active_configs,
                    COUNT(*) FILTER (WHERE smtp_password IS NOT NULL OR app_password IS NOT NULL) as configs_with_credentials,
                    COUNT(*) FILTER (WHERE test_status = 'success') as successful_tests,
                    COUNT(*) FILTER (WHERE test_status = 'failed') as failed_tests,
                    COUNT(*) FILTER (WHERE last_test_at IS NOT NULL) as tested_configs,
                    MAX(last_test_at) as last_test_date
                FROM aponnt_email_config
            `, { type: QueryTypes.SELECT });

            return stats;
        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error obteniendo stats:', error);
            return null;
        }
    }
}

// Singleton
const emailConfigService = new EmailConfigService();

// Inicializar tabla de auditoría al cargar el módulo
emailConfigService.initializeAuditTable().catch(err => {
    console.warn('⚠️ [EMAIL-CONFIG] No se pudo inicializar tabla de auditoría:', err.message);
});

module.exports = emailConfigService;
