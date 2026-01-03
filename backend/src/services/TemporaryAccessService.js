/**
 * ============================================================================
 * SERVICIO: TemporaryAccessService
 * ============================================================================
 * Gestión profesional de accesos temporales digitales
 * - Creación y revocación de accesos
 * - Validación de credenciales
 * - Auditoría y monitoreo
 * - Notificaciones automáticas
 * - Templates predefinidos
 * ============================================================================
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class TemporaryAccessService {
    constructor() {
        this.SALT_ROUNDS = 10;
        this.MAX_FAILED_ATTEMPTS = 5;
        this.LOCKOUT_DURATION_MINUTES = 30;
    }

    /**
     * ========================================================================
     * CREACIÓN DE ACCESOS TEMPORALES
     * ========================================================================
     */

    /**
     * Crear nuevo acceso temporal
     */
    async createTemporaryAccess(data, createdByUserId) {
        const {
            companyId,
            fullName,
            email,
            dni,
            phone,
            organization,
            accessType,
            templateKey, // Si usa un template predefinido
            allowedModules,
            permissionLevel,
            validFrom,
            validUntil,
            durationDays, // Alternativa a validUntil
            purpose,
            internalNotes,
            requirePasswordChange = true,
            twoFactorEnabled = false,
            maxConcurrentSessions = 1,
            allowedIpRanges = null
        } = data;

        console.log('🔐 [TEMP-ACCESS] Creando nuevo acceso temporal');
        console.log('   👤 Usuario:', fullName);
        console.log('   🏢 Empresa:', companyId);
        console.log('   📋 Tipo:', accessType);

        try {
            // 1. Validar datos básicos
            if (!companyId || !fullName || !email || !accessType) {
                throw new Error('Datos obligatorios faltantes');
            }

            // 2. Verificar si ya existe un acceso activo para este email en esta empresa
            const [existing] = await sequelize.query(`
                SELECT id, username, status, valid_until
                FROM temporary_access_grants
                WHERE company_id = :companyId
                AND email = :email
                AND status IN ('active', 'pending')
                LIMIT 1
            `, {
                replacements: { companyId, email },
                type: QueryTypes.SELECT
            });

            if (existing) {
                throw new Error(`Ya existe un acceso ${existing.status} para ${email} (username: ${existing.username})`);
            }

            // 3. Si usa template, cargar configuración
            let templateConfig = null;
            if (templateKey) {
                [templateConfig] = await sequelize.query(`
                    SELECT * FROM temporary_access_templates
                    WHERE template_key = :templateKey
                    AND (company_id = :companyId OR is_global = true)
                    AND is_active = true
                    LIMIT 1
                `, {
                    replacements: { templateKey, companyId },
                    type: QueryTypes.SELECT
                });

                if (!templateConfig) {
                    throw new Error(`Template "${templateKey}" no encontrado`);
                }

                console.log('   📄 Usando template:', templateConfig.name);
            }

            // 4. Generar username único
            const username = await this.generateUsername(fullName, companyId, accessType);

            // 5. Generar contraseña temporal segura
            const tempPassword = this.generateSecurePassword();
            const passwordHash = await bcrypt.hash(tempPassword, this.SALT_ROUNDS);

            // Encriptar password plano para envío posterior
            const tempPasswordEncrypted = this.encryptPassword(tempPassword);

            // 6. Calcular fechas de vigencia
            let finalValidFrom = validFrom ? new Date(validFrom) : new Date();
            let finalValidUntil;

            if (validUntil) {
                finalValidUntil = new Date(validUntil);
            } else if (durationDays) {
                finalValidUntil = new Date(finalValidFrom);
                finalValidUntil.setDate(finalValidUntil.getDate() + parseInt(durationDays));
            } else if (templateConfig) {
                finalValidUntil = new Date(finalValidFrom);
                finalValidUntil.setDate(finalValidUntil.getDate() + templateConfig.default_duration_days);
            } else {
                // Por defecto: 30 días
                finalValidUntil = new Date(finalValidFrom);
                finalValidUntil.setDate(finalValidUntil.getDate() + 30);
            }

            // 7. Determinar módulos permitidos
            const finalAllowedModules = allowedModules || templateConfig?.allowed_modules || [];

            // 8. Crear registro en base de datos
            const [result] = await sequelize.query(`
                INSERT INTO temporary_access_grants (
                    company_id,
                    full_name,
                    email,
                    dni,
                    phone,
                    organization,
                    access_type,
                    username,
                    password_hash,
                    temp_password_plain,
                    allowed_modules,
                    permission_level,
                    require_password_change,
                    two_factor_enabled,
                    max_concurrent_sessions,
                    allowed_ip_ranges,
                    valid_from,
                    valid_until,
                    status,
                    purpose,
                    internal_notes,
                    created_by,
                    metadata
                ) VALUES (
                    :companyId,
                    :fullName,
                    :email,
                    :dni,
                    :phone,
                    :organization,
                    :accessType,
                    :username,
                    :passwordHash,
                    :tempPasswordEncrypted,
                    :allowedModules,
                    :permissionLevel,
                    :requirePasswordChange,
                    :twoFactorEnabled,
                    :maxConcurrentSessions,
                    :allowedIpRanges,
                    :validFrom,
                    :validUntil,
                    'pending',
                    :purpose,
                    :internalNotes,
                    :createdBy,
                    :metadata
                )
                RETURNING *
            `, {
                replacements: {
                    companyId,
                    fullName,
                    email,
                    dni: dni || null,
                    phone: phone || null,
                    organization: organization || null,
                    accessType,
                    username,
                    passwordHash,
                    tempPasswordEncrypted,
                    allowedModules: JSON.stringify(finalAllowedModules),
                    permissionLevel: permissionLevel || templateConfig?.permission_level || 'read_only',
                    requirePasswordChange,
                    twoFactorEnabled,
                    maxConcurrentSessions,
                    allowedIpRanges: allowedIpRanges || null,
                    validFrom: finalValidFrom,
                    validUntil: finalValidUntil,
                    purpose: purpose || null,
                    internalNotes: internalNotes || null,
                    createdBy: createdByUserId,
                    metadata: JSON.stringify({
                        templateUsed: templateKey || null,
                        autoGenerated: true
                    })
                },
                type: QueryTypes.INSERT
            });

            const grantId = result[0].id;

            console.log('   ✅ Acceso temporal creado:', grantId);
            console.log('   👤 Username:', username);
            console.log('   📅 Vigencia:', finalValidFrom.toISOString().split('T')[0], '-', finalValidUntil.toISOString().split('T')[0]);

            // 9. Crear notificación para envío de credenciales
            await this.createNotification({
                grantId,
                notificationType: 'credentials_sent',
                channel: 'email',
                recipientEmail: email,
                recipientPhone: phone,
                subject: `Credenciales de Acceso Temporal - ${accessType}`,
                content: this.buildCredentialsEmail(fullName, username, tempPassword, finalValidUntil, accessType)
            });

            // 10. Registrar actividad
            await this.logActivity({
                grantId,
                companyId,
                activityType: 'access_created',
                metadata: {
                    createdBy: createdByUserId,
                    templateUsed: templateKey
                }
            });

            // Retornar datos (sin password hash)
            return {
                success: true,
                grant: {
                    id: grantId,
                    username,
                    email,
                    fullName,
                    accessType,
                    validFrom: finalValidFrom,
                    validUntil: finalValidUntil,
                    allowedModules: finalAllowedModules,
                    permissionLevel: result[0].permission_level,
                    status: 'pending'
                },
                tempPassword // Solo para mostrar UNA VEZ al admin que creó el acceso
            };

        } catch (error) {
            console.error('❌ [TEMP-ACCESS] Error creando acceso:', error);
            throw error;
        }
    }

    /**
     * Activar acceso temporal (aprobar)
     */
    async activateAccess(grantId, approvedByUserId) {
        console.log('✅ [TEMP-ACCESS] Activando acceso:', grantId);

        const [result] = await sequelize.query(`
            UPDATE temporary_access_grants
            SET
                status = 'active',
                approved_by = :approvedBy,
                approved_at = NOW(),
                updated_at = NOW()
            WHERE id = :grantId
            AND status = 'pending'
            RETURNING *
        `, {
            replacements: { grantId, approvedBy: approvedByUserId },
            type: QueryTypes.UPDATE
        });

        if (!result || result.length === 0) {
            throw new Error('Acceso no encontrado o ya activado');
        }

        const grant = result[0];

        // Registrar actividad
        await this.logActivity({
            grantId,
            companyId: grant.company_id,
            activityType: 'access_activated',
            metadata: { approvedBy: approvedByUserId }
        });

        // Enviar notificación de activación
        await this.createNotification({
            grantId,
            notificationType: 'access_activated',
            channel: 'email',
            recipientEmail: grant.email,
            subject: 'Acceso Temporal Activado',
            content: `Su acceso temporal ha sido activado. Ya puede ingresar al sistema con username: ${grant.username}`
        });

        return {
            success: true,
            message: 'Acceso activado correctamente'
        };
    }

    /**
     * Revocar acceso temporal
     */
    async revokeAccess(grantId, revokedByUserId, reason) {
        console.log('🚫 [TEMP-ACCESS] Revocando acceso:', grantId);

        const [result] = await sequelize.query(`
            UPDATE temporary_access_grants
            SET
                status = 'revoked',
                revoked_by = :revokedBy,
                revoked_at = NOW(),
                revocation_reason = :reason,
                updated_at = NOW()
            WHERE id = :grantId
            AND status IN ('pending', 'active')
            RETURNING *
        `, {
            replacements: {
                grantId,
                revokedBy: revokedByUserId,
                reason: reason || 'Revocado manualmente'
            },
            type: QueryTypes.UPDATE
        });

        if (!result || result.length === 0) {
            throw new Error('Acceso no encontrado o ya revocado');
        }

        const grant = result[0];

        // Registrar actividad
        await this.logActivity({
            grantId,
            companyId: grant.company_id,
            activityType: 'access_revoked',
            metadata: {
                revokedBy: revokedByUserId,
                reason
            }
        });

        // Notificar al usuario
        await this.createNotification({
            grantId,
            notificationType: 'access_revoked',
            channel: 'email',
            recipientEmail: grant.email,
            subject: 'Acceso Temporal Revocado',
            content: `Su acceso temporal ha sido revocado.\nMotivo: ${reason || 'No especificado'}`
        });

        return {
            success: true,
            message: 'Acceso revocado correctamente'
        };
    }

    /**
     * ========================================================================
     * AUTENTICACIÓN Y VALIDACIÓN
     * ========================================================================
     */

    /**
     * Validar credenciales de usuario temporal
     */
    async validateCredentials(username, password, ipAddress = null) {
        console.log('🔐 [TEMP-ACCESS] Validando credenciales:', username);

        try {
            // 1. Buscar el grant
            const [grant] = await sequelize.query(`
                SELECT * FROM temporary_access_grants
                WHERE username = :username
                LIMIT 1
            `, {
                replacements: { username },
                type: QueryTypes.SELECT
            });

            if (!grant) {
                await this.logActivity({
                    grantId: null,
                    companyId: null,
                    activityType: 'login_failed',
                    metadata: { username, reason: 'user_not_found' }
                });
                throw new Error('Credenciales inválidas');
            }

            // 2. Verificar estado
            if (grant.status !== 'active') {
                await this.logActivity({
                    grantId: grant.id,
                    companyId: grant.company_id,
                    activityType: 'login_failed',
                    ipAddress,
                    metadata: { reason: `status_${grant.status}` }
                });
                throw new Error(`Acceso ${grant.status}`);
            }

            // 3. Verificar vigencia
            const now = new Date();
            if (now < new Date(grant.valid_from) || now > new Date(grant.valid_until)) {
                await this.logActivity({
                    grantId: grant.id,
                    companyId: grant.company_id,
                    activityType: 'login_failed',
                    ipAddress,
                    metadata: { reason: 'expired' }
                });
                throw new Error('Acceso expirado');
            }

            // 4. Verificar intentos fallidos
            if (grant.failed_login_attempts >= this.MAX_FAILED_ATTEMPTS) {
                const lockoutUntil = new Date(grant.last_failed_login_at);
                lockoutUntil.setMinutes(lockoutUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

                if (now < lockoutUntil) {
                    throw new Error('Cuenta bloqueada temporalmente por múltiples intentos fallidos');
                }

                // Reset contador si pasó el tiempo de bloqueo
                await sequelize.query(`
                    UPDATE temporary_access_grants
                    SET failed_login_attempts = 0
                    WHERE id = :grantId
                `, { replacements: { grantId: grant.id } });
            }

            // 5. Verificar IP si está configurada
            if (grant.allowed_ip_ranges && grant.allowed_ip_ranges.length > 0 && ipAddress) {
                const ipAllowed = grant.allowed_ip_ranges.some(range => {
                    // Simplificado: comparación exacta o CIDR básico
                    return ipAddress.startsWith(range) || ipAddress === range;
                });

                if (!ipAllowed) {
                    await this.logActivity({
                        grantId: grant.id,
                        companyId: grant.company_id,
                        activityType: 'login_failed',
                        ipAddress,
                        metadata: { reason: 'ip_not_allowed' }
                    });
                    throw new Error('IP no autorizada');
                }
            }

            // 6. Verificar contraseña
            const passwordValid = await bcrypt.compare(password, grant.password_hash);

            if (!passwordValid) {
                // Incrementar contador de fallos
                await sequelize.query(`
                    UPDATE temporary_access_grants
                    SET
                        failed_login_attempts = failed_login_attempts + 1,
                        last_failed_login_at = NOW()
                    WHERE id = :grantId
                `, { replacements: { grantId: grant.id } });

                await this.logActivity({
                    grantId: grant.id,
                    companyId: grant.company_id,
                    activityType: 'login_failed',
                    ipAddress,
                    metadata: { reason: 'invalid_password' }
                });

                throw new Error('Credenciales inválidas');
            }

            // 7. LOGIN EXITOSO
            console.log('   ✅ Credenciales válidas');

            // Actualizar flags de login
            await sequelize.query(`
                UPDATE temporary_access_grants
                SET
                    total_logins = total_logins + 1,
                    last_login_at = NOW(),
                    first_login_at = COALESCE(first_login_at, NOW()),
                    failed_login_attempts = 0
                WHERE id = :grantId
            `, { replacements: { grantId: grant.id } });

            // Registrar login exitoso
            await this.logActivity({
                grantId: grant.id,
                companyId: grant.company_id,
                activityType: 'login_success',
                ipAddress
            });

            // Retornar datos del grant (sin password)
            return {
                success: true,
                grant: {
                    id: grant.id,
                    companyId: grant.company_id,
                    fullName: grant.full_name,
                    email: grant.email,
                    username: grant.username,
                    accessType: grant.access_type,
                    allowedModules: grant.allowed_modules,
                    permissionLevel: grant.permission_level,
                    requirePasswordChange: grant.require_password_change && !grant.password_changed,
                    validUntil: grant.valid_until
                }
            };

        } catch (error) {
            console.error('❌ [TEMP-ACCESS] Error validando credenciales:', error);
            throw error;
        }
    }

    /**
     * Cambiar contraseña
     */
    async changePassword(grantId, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

        await sequelize.query(`
            UPDATE temporary_access_grants
            SET
                password_hash = :passwordHash,
                password_changed = true,
                password_changed_at = NOW(),
                temp_password_plain = NULL,
                require_password_change = false,
                updated_at = NOW()
            WHERE id = :grantId
        `, {
            replacements: { grantId, passwordHash }
        });

        const [grant] = await sequelize.query(`
            SELECT company_id FROM temporary_access_grants WHERE id = :grantId
        `, {
            replacements: { grantId },
            type: QueryTypes.SELECT
        });

        await this.logActivity({
            grantId,
            companyId: grant.company_id,
            activityType: 'password_changed'
        });

        return { success: true, message: 'Contraseña actualizada correctamente' };
    }

    /**
     * ========================================================================
     * CONSULTAS Y REPORTES
     * ========================================================================
     */

    /**
     * Listar accesos temporales de una empresa
     */
    async listAccessesByCompany(companyId, filters = {}) {
        const { status, accessType, search, limit = 50, offset = 0 } = filters;

        let whereClause = 'WHERE g.company_id = :companyId';
        const replacements = { companyId, limit, offset };

        if (status) {
            whereClause += ' AND g.status = :status';
            replacements.status = status;
        }

        if (accessType) {
            whereClause += ' AND g.access_type = :accessType';
            replacements.accessType = accessType;
        }

        if (search) {
            whereClause += ` AND (
                g.full_name ILIKE :search
                OR g.email ILIKE :search
                OR g.username ILIKE :search
            )`;
            replacements.search = `%${search}%`;
        }

        const grants = await sequelize.query(`
            SELECT
                g.id,
                g.full_name,
                g.email,
                g.username,
                g.access_type,
                g.organization,
                g.allowed_modules,
                g.permission_level,
                g.status,
                g.valid_from,
                g.valid_until,
                g.first_login_at,
                g.last_login_at,
                g.total_logins,
                g.created_at,
                EXTRACT(DAY FROM (g.valid_until - NOW())) as days_remaining,
                u.email as created_by_email
            FROM temporary_access_grants g
            LEFT JOIN users u ON g.created_by = u.user_id
            ${whereClause}
            ORDER BY g.created_at DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        return {
            success: true,
            grants,
            count: grants.length
        };
    }

    /**
     * Obtener estadísticas de accesos temporales
     */
    async getStatistics(companyId) {
        const [stats] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'active') as active_count,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
                COUNT(*) FILTER (WHERE status = 'revoked') as revoked_count,
                COUNT(*) FILTER (WHERE status = 'active' AND EXTRACT(DAY FROM (valid_until - NOW())) <= 7) as expiring_soon_count,
                COUNT(*) FILTER (WHERE first_login_at IS NOT NULL) as used_count,
                SUM(total_logins) as total_logins
            FROM temporary_access_grants
            WHERE company_id = :companyId
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        return {
            success: true,
            stats: stats[0] || {}
        };
    }

    /**
     * Obtener actividad reciente
     */
    async getRecentActivity(companyId, limit = 50) {
        const logs = await sequelize.query(`
            SELECT
                l.id,
                l.grant_id,
                g.full_name,
                g.username,
                l.activity_type,
                l.module_accessed,
                l.ip_address,
                l.created_at
            FROM temporary_access_activity_log l
            JOIN temporary_access_grants g ON l.grant_id = g.id
            WHERE l.company_id = :companyId
            ORDER BY l.created_at DESC
            LIMIT :limit
        `, {
            replacements: { companyId, limit },
            type: QueryTypes.SELECT
        });

        return {
            success: true,
            logs
        };
    }

    /**
     * ========================================================================
     * TEMPLATES
     * ========================================================================
     */

    /**
     * Listar templates disponibles
     */
    async getTemplates(companyId) {
        const templates = await sequelize.query(`
            SELECT
                id,
                template_key,
                name,
                description,
                icon,
                color,
                access_type,
                default_duration_days,
                allowed_modules,
                permission_level,
                display_order
            FROM temporary_access_templates
            WHERE (company_id = :companyId OR is_global = true)
            AND is_active = true
            ORDER BY display_order, name
        `, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        return {
            success: true,
            templates
        };
    }

    /**
     * ========================================================================
     * AUTO-EXPIRACIÓN (CRON JOB)
     * ========================================================================
     */

    /**
     * Expirar accesos vencidos automáticamente
     */
    async autoExpireAccesses() {
        console.log('⏰ [TEMP-ACCESS] Ejecutando auto-expiración...');

        const [result] = await sequelize.query(`
            UPDATE temporary_access_grants
            SET
                status = 'expired',
                updated_at = NOW()
            WHERE
                status = 'active'
                AND valid_until < NOW()
                AND auto_revoke_on_expiry = true
            RETURNING id, company_id, email, full_name
        `, {
            type: QueryTypes.UPDATE
        });

        console.log(`   ✅ ${result.length} accesos expirados`);

        // Notificar a cada usuario expirado
        for (const grant of result) {
            await this.createNotification({
                grantId: grant.id,
                notificationType: 'access_expired',
                channel: 'email',
                recipientEmail: grant.email,
                subject: 'Acceso Temporal Expirado',
                content: `Su acceso temporal ha expirado. Si necesita renovarlo, contacte con el administrador.`
            });
        }

        return {
            success: true,
            expiredCount: result.length
        };
    }

    /**
     * Enviar alertas de próxima expiración (7 días antes)
     */
    async sendExpiryWarnings() {
        console.log('⚠️  [TEMP-ACCESS] Enviando alertas de expiración...');

        const grants = await sequelize.query(`
            SELECT id, email, full_name, valid_until
            FROM temporary_access_grants
            WHERE
                status = 'active'
                AND EXTRACT(DAY FROM (valid_until - NOW())) <= 7
                AND EXTRACT(DAY FROM (valid_until - NOW())) > 0
        `, {
            type: QueryTypes.SELECT
        });

        for (const grant of grants) {
            const daysRemaining = Math.ceil((new Date(grant.valid_until) - new Date()) / (1000 * 60 * 60 * 24));

            await this.createNotification({
                grantId: grant.id,
                notificationType: 'expiry_warning',
                channel: 'email',
                recipientEmail: grant.email,
                subject: `Su acceso temporal expira en ${daysRemaining} días`,
                content: `Su acceso temporal expirará el ${new Date(grant.valid_until).toLocaleDateString('es-AR')}. Si necesita una extensión, contacte con el administrador.`
            });
        }

        console.log(`   ✅ ${grants.length} alertas enviadas`);

        return {
            success: true,
            warningsSent: grants.length
        };
    }

    /**
     * ========================================================================
     * HELPERS PRIVADOS
     * ========================================================================
     */

    /**
     * Generar username único
     */
    async generateUsername(fullName, companyId, accessType) {
        const prefix = {
            external_auditor: 'aud',
            external_advisor: 'adv',
            external_doctor: 'doc',
            consultant: 'con',
            contractor: 'ctr',
            temp_staff: 'tmp'
        }[accessType] || 'ext';

        const firstPart = fullName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
        let base = `${prefix}_${firstPart}${companyId}`;

        let username = base;
        let counter = 1;

        while (true) {
            const [exists] = await sequelize.query(`
                SELECT 1 FROM temporary_access_grants WHERE username = :username
            `, {
                replacements: { username },
                type: QueryTypes.SELECT
            });

            if (!exists) break;

            username = `${base}_${counter}`;
            counter++;
        }

        return username;
    }

    /**
     * Generar contraseña segura
     */
    generateSecurePassword(length = 16) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&';
        let password = '';

        for (let i = 0; i < length; i++) {
            password += chars[Math.floor(Math.random() * chars.length)];
        }

        return password;
    }

    /**
     * Encriptar contraseña (AES-256) para almacenamiento temporal
     */
    encryptPassword(password) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.JWT_SECRET || 'default-secret', 'salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(password, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return `${iv.toString('hex')}:${encrypted}`;
    }

    /**
     * Desencriptar contraseña
     */
    decryptPassword(encrypted) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.JWT_SECRET || 'default-secret', 'salt', 32);

        const [ivHex, encryptedText] = encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Construir email de credenciales
     */
    buildCredentialsEmail(fullName, username, password, validUntil, accessType) {
        const typeLabels = {
            external_auditor: 'Auditor Externo',
            external_advisor: 'Asesor/Consultor',
            external_doctor: 'Médico Externo',
            consultant: 'Consultor',
            contractor: 'Contratista',
            temp_staff: 'Personal Temporal'
        };

        return `
Estimado/a ${fullName},

Se le ha otorgado un acceso temporal como ${typeLabels[accessType] || accessType}.

**CREDENCIALES DE ACCESO:**
Username: ${username}
Password: ${password}

⚠️  IMPORTANTE:
- Guarde esta contraseña en un lugar seguro
- Se le solicitará cambiarla en el primer inicio de sesión
- Este acceso es válido hasta: ${new Date(validUntil).toLocaleDateString('es-AR')}

URL de acceso: ${process.env.APP_URL || 'https://sistema.aponnt.com'}/panel-empresa.html

Saludos,
Equipo de Administración
        `.trim();
    }

    /**
     * Registrar actividad en log
     */
    async logActivity(data) {
        try {
            await sequelize.query(`
                INSERT INTO temporary_access_activity_log (
                    grant_id,
                    company_id,
                    activity_type,
                    module_accessed,
                    ip_address,
                    user_agent,
                    metadata
                ) VALUES (
                    :grantId,
                    :companyId,
                    :activityType,
                    :moduleAccessed,
                    :ipAddress,
                    :userAgent,
                    :metadata
                )
            `, {
                replacements: {
                    grantId: data.grantId || null,
                    companyId: data.companyId || null,
                    activityType: data.activityType,
                    moduleAccessed: data.moduleAccessed || null,
                    ipAddress: data.ipAddress || null,
                    userAgent: data.userAgent || null,
                    metadata: JSON.stringify(data.metadata || {})
                }
            });
        } catch (error) {
            console.error('❌ Error registrando actividad:', error);
        }
    }

    /**
     * Crear notificación
     */
    async createNotification(data) {
        try {
            await sequelize.query(`
                INSERT INTO temporary_access_notifications (
                    grant_id,
                    notification_type,
                    channel,
                    recipient_email,
                    recipient_phone,
                    subject,
                    content,
                    status
                ) VALUES (
                    :grantId,
                    :notificationType,
                    :channel,
                    :recipientEmail,
                    :recipientPhone,
                    :subject,
                    :content,
                    'pending'
                )
            `, {
                replacements: {
                    grantId: data.grantId,
                    notificationType: data.notificationType,
                    channel: data.channel,
                    recipientEmail: data.recipientEmail || null,
                    recipientPhone: data.recipientPhone || null,
                    subject: data.subject,
                    content: data.content
                }
            });

            console.log('   📧 Notificación creada:', data.notificationType);
        } catch (error) {
            console.error('❌ Error creando notificación:', error);
        }
    }
}

module.exports = new TemporaryAccessService();
