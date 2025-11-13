/**
 * ============================================================================
 * CONSENT SERVICE
 * ============================================================================
 *
 * Sistema de gestión de consentimientos para todos los tipos de usuarios
 * (employee, vendor, leader, supervisor, partner, admin)
 *
 * Funcionalidades:
 * - Obtener consentimientos aplicables por rol
 * - Registrar aceptaciones/rechazos/revocaciones
 * - Audit trail completo de todos los cambios
 * - Estadísticas y reportes de consentimientos
 * - Gestión de versiones de consentimientos
 *
 * Tablas:
 * - consent_definitions: Master de consentimientos
 * - user_consents: Aceptaciones de usuarios
 * - consent_audit_log: Histórico de cambios (trigger automático)
 *
 * @version 1.0.0
 * @created 2025-11-01
 * ============================================================================
 */

const { sequelize } = require('../config/database');

class ConsentService {
    /**
     * ========================================================================
     * CONSULTAS DE CONSENTIMIENTOS
     * ========================================================================
     */

    /**
     * Obtener consentimientos activos para un rol específico
     *
     * @param {string} role - 'employee', 'vendor', 'leader', 'supervisor', 'partner', 'admin'
     * @returns {Promise<array>} Lista de consentimientos aplicables
     */
    async getConsentsForRole(role) {
        try {
            console.log(`📋 [CONSENTS] Obteniendo consentimientos para rol: ${role}`);

            const consents = await sequelize.query(`
                SELECT
                    consent_id,
                    consent_key,
                    title,
                    description,
                    full_text,
                    version,
                    applicable_roles,
                    is_required,
                    category,
                    created_at,
                    updated_at
                FROM consent_definitions
                WHERE is_active = true
                AND :role = ANY(applicable_roles)
                ORDER BY is_required DESC, category, created_at ASC
            `, {
                replacements: { role },
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`✅ [CONSENTS] ${consents.length} consentimientos encontrados para rol: ${role}`);
            return consents;

        } catch (error) {
            console.error(`❌ [CONSENTS] Error obteniendo consentimientos por rol:`, error.message);
            throw error;
        }
    }

    /**
     * Obtener consentimientos pendientes de un usuario con texto completo
     *
     * @param {number} userId
     * @param {string} userType
     * @returns {Promise<array>} Lista de consentimientos pendientes con full_text
     */
    async getPendingConsents(userId, userType) {
        try {
            console.log(`📋 [CONSENTS] Obteniendo consentimientos pendientes para user_id: ${userId} (${userType})`);

            const pendingConsents = await sequelize.query(`
                SELECT
                    cd.consent_id,
                    cd.consent_key,
                    cd.title,
                    cd.description,
                    cd.full_text,
                    cd.version,
                    cd.is_required,
                    cd.category,
                    cd.created_at
                FROM consent_definitions cd
                WHERE cd.is_active = true
                AND :userType = ANY(cd.applicable_roles)
                AND NOT EXISTS (
                    SELECT 1 FROM user_consents uc
                    WHERE uc.user_id = :userId
                    AND uc.user_type = :userType
                    AND uc.consent_id = cd.consent_id
                    AND uc.status IN ('accepted', 'pending')
                )
                ORDER BY cd.is_required DESC, cd.category, cd.created_at ASC
            `, {
                replacements: { userId, userType },
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`✅ [CONSENTS] ${pendingConsents.length} consentimientos pendientes encontrados`);
            return pendingConsents;

        } catch (error) {
            console.error(`❌ [CONSENTS] Error obteniendo consentimientos pendientes:`, error.message);
            throw error;
        }
    }

    /**
     * Obtener historial completo de consentimientos de un usuario
     *
     * @param {number} userId
     * @param {string} userType
     * @returns {Promise<array>} Historial de consentimientos con audit trail
     */
    async getUserConsentHistory(userId, userType) {
        try {
            console.log(`📋 [CONSENTS] Obteniendo historial de user_id: ${userId} (${userType})`);

            const history = await sequelize.query(`
                SELECT
                    uc.user_consent_id,
                    uc.consent_id,
                    cd.consent_key,
                    cd.title,
                    cd.category,
                    uc.consent_version,
                    uc.status,
                    uc.accepted_at,
                    uc.rejected_at,
                    uc.revoked_at,
                    uc.ip_address,
                    uc.user_agent,
                    uc.notes,
                    uc.created_at,
                    uc.updated_at,
                    -- Audit trail (últimas 5 acciones)
                    (
                        SELECT json_agg(
                            json_build_object(
                                'audit_id', cal.audit_id,
                                'action', cal.action,
                                'old_status', cal.old_status,
                                'new_status', cal.new_status,
                                'ip_address', cal.ip_address,
                                'created_at', cal.created_at
                            )
                            ORDER BY cal.created_at DESC
                        )
                        FROM consent_audit_log cal
                        WHERE cal.user_consent_id = uc.user_consent_id
                        LIMIT 5
                    ) as audit_trail
                FROM user_consents uc
                JOIN consent_definitions cd ON cd.consent_id = uc.consent_id
                WHERE uc.user_id = :userId
                AND uc.user_type = :userType
                ORDER BY uc.created_at DESC
            `, {
                replacements: { userId, userType },
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`✅ [CONSENTS] ${history.length} registros de consentimientos encontrados`);
            return history;

        } catch (error) {
            console.error(`❌ [CONSENTS] Error obteniendo historial:`, error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * ACEPTACIÓN Y RECHAZO DE CONSENTIMIENTOS
     * ========================================================================
     */

    /**
     * Aceptar un consentimiento (con metadata completa)
     *
     * @param {number} userId
     * @param {string} userType
     * @param {string} consentId - UUID del consentimiento
     * @param {object} metadata - { ipAddress, userAgent, signatureData, notes }
     * @returns {Promise<object>} Registro de aceptación
     */
    async acceptConsent(userId, userType, consentId, metadata = {}) {
        try {
            console.log(`📋 [CONSENTS] Aceptando consent_id: ${consentId} para user_id: ${userId} (${userType})`);

            // 1. Verificar que el consentimiento existe y está activo
            const [consentDef] = await sequelize.query(`
                SELECT consent_id, version, title
                FROM consent_definitions
                WHERE consent_id = :consentId
                AND is_active = true
                LIMIT 1
            `, {
                replacements: { consentId },
                type: sequelize.QueryTypes.SELECT
            });

            if (!consentDef) {
                throw new Error(`Consentimiento no encontrado o inactivo: ${consentId}`);
            }

            // 2. Verificar si ya existe un registro previo
            const [existing] = await sequelize.query(`
                SELECT user_consent_id, status
                FROM user_consents
                WHERE user_id = :userId
                AND user_type = :userType
                AND consent_id = :consentId
                LIMIT 1
            `, {
                replacements: { userId, userType, consentId },
                type: sequelize.QueryTypes.SELECT
            });

            if (existing && existing.status === 'accepted') {
                console.log(`⚠️  [CONSENTS] Consentimiento ya aceptado previamente`);
                return {
                    success: true,
                    alreadyAccepted: true,
                    userConsentId: existing.user_consent_id
                };
            }

            // 3. Insertar o actualizar registro
            let userConsentId;

            if (existing) {
                // Actualizar registro existente
                await sequelize.query(`
                    UPDATE user_consents
                    SET status = 'accepted',
                        consent_version = :version,
                        accepted_at = NOW(),
                        rejected_at = NULL,
                        revoked_at = NULL,
                        ip_address = :ipAddress,
                        user_agent = :userAgent,
                        signature_data = :signatureData,
                        notes = :notes,
                        updated_at = NOW()
                    WHERE user_consent_id = :userConsentId
                `, {
                    replacements: {
                        userConsentId: existing.user_consent_id,
                        version: consentDef.version,
                        ipAddress: metadata.ipAddress || null,
                        userAgent: metadata.userAgent || null,
                        signatureData: metadata.signatureData || null,
                        notes: metadata.notes || null
                    }
                });
                userConsentId = existing.user_consent_id;
            } else {
                // Crear nuevo registro
                const [result] = await sequelize.query(`
                    INSERT INTO user_consents (
                        user_id, user_type, consent_id, consent_version,
                        status, accepted_at,
                        ip_address, user_agent, signature_data, notes
                    ) VALUES (
                        :userId, :userType, :consentId, :version,
                        'accepted', NOW(),
                        :ipAddress, :userAgent, :signatureData, :notes
                    )
                    RETURNING user_consent_id
                `, {
                    replacements: {
                        userId,
                        userType,
                        consentId,
                        version: consentDef.version,
                        ipAddress: metadata.ipAddress || null,
                        userAgent: metadata.userAgent || null,
                        signatureData: metadata.signatureData || null,
                        notes: metadata.notes || null
                    },
                    type: sequelize.QueryTypes.INSERT
                });
                userConsentId = result[0].user_consent_id;
            }

            console.log(`✅ [CONSENTS] Consentimiento "${consentDef.title}" aceptado exitosamente`);

            return {
                success: true,
                userConsentId,
                consentTitle: consentDef.title,
                acceptedAt: new Date()
            };

        } catch (error) {
            console.error(`❌ [CONSENTS] Error aceptando consentimiento:`, error.message);
            throw error;
        }
    }

    /**
     * Rechazar un consentimiento
     *
     * @param {number} userId
     * @param {string} userType
     * @param {string} consentId
     * @param {string} reason - Razón del rechazo
     * @param {object} metadata - { ipAddress, userAgent }
     * @returns {Promise<object>}
     */
    async rejectConsent(userId, userType, consentId, reason, metadata = {}) {
        try {
            console.log(`📋 [CONSENTS] Rechazando consent_id: ${consentId} para user_id: ${userId} (${userType})`);

            // 1. Verificar que el consentimiento existe
            const [consentDef] = await sequelize.query(`
                SELECT consent_id, version, title, is_required
                FROM consent_definitions
                WHERE consent_id = :consentId
                AND is_active = true
                LIMIT 1
            `, {
                replacements: { consentId },
                type: sequelize.QueryTypes.SELECT
            });

            if (!consentDef) {
                throw new Error(`Consentimiento no encontrado: ${consentId}`);
            }

            // 2. Verificar si es obligatorio (warning)
            if (consentDef.is_required) {
                console.log(`⚠️  [CONSENTS] ADVERTENCIA: Rechazando consentimiento OBLIGATORIO: ${consentDef.title}`);
            }

            // 3. Insertar o actualizar registro
            const [existing] = await sequelize.query(`
                SELECT user_consent_id
                FROM user_consents
                WHERE user_id = :userId
                AND user_type = :userType
                AND consent_id = :consentId
                LIMIT 1
            `, {
                replacements: { userId, userType, consentId },
                type: sequelize.QueryTypes.SELECT
            });

            let userConsentId;

            if (existing) {
                // Actualizar
                await sequelize.query(`
                    UPDATE user_consents
                    SET status = 'rejected',
                        consent_version = :version,
                        rejected_at = NOW(),
                        accepted_at = NULL,
                        revoked_at = NULL,
                        ip_address = :ipAddress,
                        user_agent = :userAgent,
                        notes = :reason,
                        updated_at = NOW()
                    WHERE user_consent_id = :userConsentId
                `, {
                    replacements: {
                        userConsentId: existing.user_consent_id,
                        version: consentDef.version,
                        ipAddress: metadata.ipAddress || null,
                        userAgent: metadata.userAgent || null,
                        reason: reason || 'Usuario rechazó el consentimiento'
                    }
                });
                userConsentId = existing.user_consent_id;
            } else {
                // Crear
                const [result] = await sequelize.query(`
                    INSERT INTO user_consents (
                        user_id, user_type, consent_id, consent_version,
                        status, rejected_at,
                        ip_address, user_agent, notes
                    ) VALUES (
                        :userId, :userType, :consentId, :version,
                        'rejected', NOW(),
                        :ipAddress, :userAgent, :reason
                    )
                    RETURNING user_consent_id
                `, {
                    replacements: {
                        userId,
                        userType,
                        consentId,
                        version: consentDef.version,
                        ipAddress: metadata.ipAddress || null,
                        userAgent: metadata.userAgent || null,
                        reason: reason || 'Usuario rechazó el consentimiento'
                    },
                    type: sequelize.QueryTypes.INSERT
                });
                userConsentId = result[0].user_consent_id;
            }

            console.log(`✅ [CONSENTS] Consentimiento "${consentDef.title}" rechazado`);

            return {
                success: true,
                userConsentId,
                consentTitle: consentDef.title,
                isRequired: consentDef.is_required,
                rejectedAt: new Date()
            };

        } catch (error) {
            console.error(`❌ [CONSENTS] Error rechazando consentimiento:`, error.message);
            throw error;
        }
    }

    /**
     * Revocar un consentimiento previamente aceptado
     *
     * @param {number} userId
     * @param {string} userType
     * @param {string} consentId
     * @param {string} reason - Razón de la revocación
     * @param {object} metadata - { ipAddress, userAgent }
     * @returns {Promise<object>}
     */
    async revokeConsent(userId, userType, consentId, reason, metadata = {}) {
        try {
            console.log(`📋 [CONSENTS] Revocando consent_id: ${consentId} para user_id: ${userId} (${userType})`);

            // 1. Verificar que existe y está aceptado
            const [existing] = await sequelize.query(`
                SELECT uc.user_consent_id, cd.title, cd.is_required
                FROM user_consents uc
                JOIN consent_definitions cd ON cd.consent_id = uc.consent_id
                WHERE uc.user_id = :userId
                AND uc.user_type = :userType
                AND uc.consent_id = :consentId
                AND uc.status = 'accepted'
                LIMIT 1
            `, {
                replacements: { userId, userType, consentId },
                type: sequelize.QueryTypes.SELECT
            });

            if (!existing) {
                return {
                    success: false,
                    error: 'Consentimiento no encontrado o no está aceptado',
                    code: 'NOT_ACCEPTED'
                };
            }

            // 2. Actualizar a revocado
            await sequelize.query(`
                UPDATE user_consents
                SET status = 'revoked',
                    revoked_at = NOW(),
                    ip_address = :ipAddress,
                    user_agent = :userAgent,
                    notes = :reason,
                    updated_at = NOW()
                WHERE user_consent_id = :userConsentId
            `, {
                replacements: {
                    userConsentId: existing.user_consent_id,
                    ipAddress: metadata.ipAddress || null,
                    userAgent: metadata.userAgent || null,
                    reason: reason || 'Usuario revocó el consentimiento'
                }
            });

            console.log(`✅ [CONSENTS] Consentimiento "${existing.title}" revocado exitosamente`);

            return {
                success: true,
                userConsentId: existing.user_consent_id,
                consentTitle: existing.title,
                isRequired: existing.is_required,
                revokedAt: new Date()
            };

        } catch (error) {
            console.error(`❌ [CONSENTS] Error revocando consentimiento:`, error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * GESTIÓN DE CONSENT DEFINITIONS (Admin)
     * ========================================================================
     */

    /**
     * Crear nuevo consentimiento (solo admin)
     *
     * @param {object} consentData
     * @returns {Promise<object>}
     */
    async createConsentDefinition(consentData) {
        try {
            console.log(`📋 [CONSENTS] Creando nueva definición: ${consentData.consent_key}`);

            const {
                consent_key,
                title,
                description,
                full_text,
                applicable_roles,
                is_required = false,
                category
            } = consentData;

            // Validar categoría
            const validCategories = ['privacy', 'legal', 'commercial', 'safety', 'operational'];
            if (!validCategories.includes(category)) {
                throw new Error(`Categoría inválida: ${category}`);
            }

            // Crear definición
            const [result] = await sequelize.query(`
                INSERT INTO consent_definitions (
                    consent_key, title, description, full_text,
                    version, applicable_roles, is_required, category, is_active
                ) VALUES (
                    :consent_key, :title, :description, :full_text,
                    '1.0', :applicable_roles, :is_required, :category, true
                )
                RETURNING consent_id, consent_key, version
            `, {
                replacements: {
                    consent_key,
                    title,
                    description,
                    full_text,
                    applicable_roles: `{${applicable_roles.join(',')}}`,
                    is_required,
                    category
                },
                type: sequelize.QueryTypes.INSERT
            });

            console.log(`✅ [CONSENTS] Definición creada: ${result[0].consent_key} v${result[0].version}`);

            return {
                success: true,
                consentId: result[0].consent_id,
                consentKey: result[0].consent_key,
                version: result[0].version
            };

        } catch (error) {
            console.error(`❌ [CONSENTS] Error creando definición:`, error.message);
            throw error;
        }
    }

    /**
     * Actualizar consentimiento existente (incrementa versión)
     *
     * @param {string} consentId - UUID
     * @param {object} updates - Campos a actualizar
     * @returns {Promise<object>}
     */
    async updateConsentDefinition(consentId, updates) {
        try {
            console.log(`📋 [CONSENTS] Actualizando consent_id: ${consentId}`);

            // 1. Obtener versión actual
            const [current] = await sequelize.query(`
                SELECT version, consent_key
                FROM consent_definitions
                WHERE consent_id = :consentId
                LIMIT 1
            `, {
                replacements: { consentId },
                type: sequelize.QueryTypes.SELECT
            });

            if (!current) {
                throw new Error(`Consentimiento no encontrado: ${consentId}`);
            }

            // 2. Incrementar versión (1.0 -> 1.1 -> 2.0)
            const [major, minor] = current.version.split('.').map(Number);
            const newVersion = updates.majorChange ? `${major + 1}.0` : `${major}.${minor + 1}`;

            // 3. Construir UPDATE dinámico
            const allowedFields = ['title', 'description', 'full_text', 'applicable_roles', 'is_required', 'category', 'is_active'];
            const updateFields = [];
            const replacements = { consentId, newVersion };

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    if (key === 'applicable_roles' && Array.isArray(value)) {
                        updateFields.push(`${key} = '{${value.join(',')}}'`);
                    } else {
                        updateFields.push(`${key} = :${key}`);
                        replacements[key] = value;
                    }
                }
            }

            if (updateFields.length === 0) {
                return { success: false, error: 'No hay campos para actualizar' };
            }

            // 4. Ejecutar UPDATE
            await sequelize.query(`
                UPDATE consent_definitions
                SET ${updateFields.join(', ')},
                    version = :newVersion,
                    updated_at = NOW()
                WHERE consent_id = :consentId
            `, {
                replacements
            });

            console.log(`✅ [CONSENTS] Definición "${current.consent_key}" actualizada a v${newVersion}`);

            return {
                success: true,
                consentId,
                oldVersion: current.version,
                newVersion
            };

        } catch (error) {
            console.error(`❌ [CONSENTS] Error actualizando definición:`, error.message);
            throw error;
        }
    }

    /**
     * ========================================================================
     * ESTADÍSTICAS Y REPORTES
     * ========================================================================
     */

    /**
     * Obtener estadísticas globales de consentimientos
     *
     * @returns {Promise<object>}
     */
    async getConsentStats() {
        try {
            console.log(`📋 [CONSENTS] Obteniendo estadísticas globales...`);

            const [stats] = await sequelize.query(`
                WITH consent_stats AS (
                    SELECT
                        COUNT(DISTINCT cd.consent_id) as total_definitions,
                        COUNT(DISTINCT cd.consent_id) FILTER (WHERE cd.is_required = true) as total_required,
                        COUNT(DISTINCT uc.user_consent_id) as total_user_consents,
                        COUNT(DISTINCT uc.user_consent_id) FILTER (WHERE uc.status = 'accepted') as total_accepted,
                        COUNT(DISTINCT uc.user_consent_id) FILTER (WHERE uc.status = 'rejected') as total_rejected,
                        COUNT(DISTINCT uc.user_consent_id) FILTER (WHERE uc.status = 'revoked') as total_revoked,
                        COUNT(DISTINCT uc.user_consent_id) FILTER (WHERE uc.status = 'pending') as total_pending
                    FROM consent_definitions cd
                    LEFT JOIN user_consents uc ON uc.consent_id = cd.consent_id
                    WHERE cd.is_active = true
                )
                SELECT
                    *,
                    ROUND(
                        CASE
                            WHEN total_user_consents > 0
                            THEN (total_accepted::NUMERIC / total_user_consents::NUMERIC) * 100
                            ELSE 0
                        END, 2
                    ) as acceptance_rate
                FROM consent_stats
            `, {
                type: sequelize.QueryTypes.SELECT
            });

            // Estadísticas por categoría
            const byCategory = await sequelize.query(`
                SELECT
                    cd.category,
                    COUNT(DISTINCT cd.consent_id) as total_definitions,
                    COUNT(DISTINCT uc.user_consent_id) FILTER (WHERE uc.status = 'accepted') as total_accepted,
                    COUNT(DISTINCT uc.user_consent_id) FILTER (WHERE uc.status = 'rejected') as total_rejected
                FROM consent_definitions cd
                LEFT JOIN user_consents uc ON uc.consent_id = cd.consent_id
                WHERE cd.is_active = true
                GROUP BY cd.category
                ORDER BY cd.category
            `, {
                type: sequelize.QueryTypes.SELECT
            });

            console.log(`✅ [CONSENTS] Estadísticas obtenidas`);

            return {
                global: stats,
                byCategory
            };

        } catch (error) {
            console.error(`❌ [CONSENTS] Error obteniendo estadísticas:`, error.message);
            throw error;
        }
    }
}

// Singleton
const consentService = new ConsentService();

module.exports = consentService;
