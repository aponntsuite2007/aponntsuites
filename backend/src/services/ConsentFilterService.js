/**
 * 🔍 CONSENT FILTER SERVICE
 * ==========================
 * Servicio para filtrar usuarios por estado de consentimiento biométrico
 * en consultas de estadísticas y reportes.
 *
 * Propósito:
 * - Excluir usuarios sin consentimiento de estadísticas
 * - Generar advertencias cuando hay usuarios excluidos
 * - Mantener integridad de métricas (no distorsionar con datos incompletos)
 *
 * Cumplimiento legal:
 * - Ley 25.326 (Argentina)
 * - GDPR Art. 9 (EU)
 * - BIPA (Illinois, USA)
 */

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const BiometricConsent = require('../models/BiometricConsent');

const CONSENT_TYPE = {
    BIOMETRIC_ANALYSIS: 'biometric_analysis',
    EMOTIONAL_ANALYSIS: 'emotional_analysis'
};

class ConsentFilterService {
    /**
     * Obtiene lista de user_ids CON consentimiento biométrico válido
     *
     * @param {number} companyId - ID de la empresa
     * @param {object} options - Opciones de filtrado
     * @param {string} options.consentType - Tipo de consentimiento (default: biometric_analysis)
     * @param {boolean} options.includeExpiring - Incluir próximos a vencer (30 días)
     * @returns {Promise<Array<number>>} - Array de user_ids
     */
    static async getUsersWithBiometricConsent(companyId, options = {}) {
        const consentType = options.consentType || CONSENT_TYPE.BIOMETRIC_ANALYSIS;

        try {
            const consents = await BiometricConsent.findAll({
                where: {
                    companyId: companyId,
                    consentType: consentType,
                    consentGiven: true,
                    revoked: false,
                    [Op.or]: [
                        { expiresAt: null },
                        { expiresAt: { [Op.gt]: new Date() } }
                    ]
                },
                attributes: ['userId'],
                raw: true
            });

            return consents.map(c => c.userId);
        } catch (error) {
            console.error('[ConsentFilterService] Error obteniendo usuarios con consent:', error);
            return [];
        }
    }

    /**
     * Obtiene información detallada de usuarios SIN consentimiento válido
     *
     * @param {number} companyId - ID de la empresa
     * @param {object} options - Opciones de filtrado
     * @returns {Promise<Array>} - Array de objetos con info de usuarios excluidos
     */
    static async getUsersWithoutConsent(companyId, options = {}) {
        const consentType = options.consentType || CONSENT_TYPE.BIOMETRIC_ANALYSIS;

        try {
            // Obtener todos los usuarios activos de la empresa
            const [allUsers] = await sequelize.query(`
                SELECT
                    u.user_id,
                    u."firstName",
                    u."lastName",
                    u.email,
                    d.name as department_name
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.company_id = :companyId
                  AND u.is_active = true
            `, {
                replacements: { companyId },
                type: sequelize.QueryTypes.SELECT
            });

            // Obtener usuarios CON consentimiento
            const usersWithConsent = await this.getUsersWithBiometricConsent(companyId, { consentType });
            const usersWithConsentSet = new Set(usersWithConsent.map(id => String(id)));

            // Filtrar los que NO tienen consentimiento
            const usersWithoutConsent = allUsers.filter(
                user => !usersWithConsentSet.has(String(user.user_id))
            );

            // Para cada usuario sin consentimiento, obtener el motivo
            const enrichedUsers = await Promise.all(
                usersWithoutConsent.map(async (user) => {
                    const lastConsent = await BiometricConsent.findOne({
                        where: {
                            userId: user.user_id,
                            companyId: companyId,
                            consentType: consentType
                        },
                        order: [['consentDate', 'DESC']]
                    });

                    let reason = 'never_requested';
                    let reasonLabel = 'Nunca solicitado';

                    if (lastConsent) {
                        if (lastConsent.revoked) {
                            reason = 'revoked';
                            reasonLabel = 'Revocado';
                        } else if (!lastConsent.consentGiven) {
                            reason = 'rejected';
                            reasonLabel = 'Rechazado';
                        } else if (lastConsent.expiresAt && lastConsent.expiresAt < new Date()) {
                            reason = 'expired';
                            reasonLabel = 'Expirado';
                        }
                    }

                    return {
                        userId: user.user_id,
                        fullName: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        department: user.department_name,
                        reason,
                        reasonLabel,
                        lastConsentDate: lastConsent?.consentDate || null
                    };
                })
            );

            return enrichedUsers;
        } catch (error) {
            console.error('[ConsentFilterService] Error obteniendo usuarios sin consent:', error);
            return [];
        }
    }

    /**
     * Obtiene estadísticas de consentimiento para una empresa
     *
     * @param {number} companyId - ID de la empresa
     * @returns {Promise<object>} - Estadísticas de consentimiento
     */
    static async getConsentStats(companyId) {
        try {
            // Total de usuarios activos
            const [totalResult] = await sequelize.query(`
                SELECT COUNT(*) as total
                FROM users
                WHERE company_id = :companyId AND is_active = true
            `, {
                replacements: { companyId },
                type: sequelize.QueryTypes.SELECT
            });
            const totalUsers = parseInt(totalResult?.total || 0);

            // Usuarios con consentimiento válido
            const usersWithConsent = await this.getUsersWithBiometricConsent(companyId);
            const withConsentCount = usersWithConsent.length;

            // Usuarios sin consentimiento (desglosado)
            const usersWithoutConsent = await this.getUsersWithoutConsent(companyId);

            const byReason = {
                never_requested: usersWithoutConsent.filter(u => u.reason === 'never_requested').length,
                rejected: usersWithoutConsent.filter(u => u.reason === 'rejected').length,
                revoked: usersWithoutConsent.filter(u => u.reason === 'revoked').length,
                expired: usersWithoutConsent.filter(u => u.reason === 'expired').length
            };

            // Porcentaje de cumplimiento
            const complianceRate = totalUsers > 0
                ? Math.round((withConsentCount / totalUsers) * 100)
                : 0;

            return {
                totalUsers,
                withConsent: withConsentCount,
                withoutConsent: usersWithoutConsent.length,
                complianceRate,
                byReason,
                excludedUsers: usersWithoutConsent
            };
        } catch (error) {
            console.error('[ConsentFilterService] Error obteniendo stats:', error);
            return {
                totalUsers: 0,
                withConsent: 0,
                withoutConsent: 0,
                complianceRate: 0,
                byReason: {},
                excludedUsers: [],
                error: error.message
            };
        }
    }

    /**
     * Genera metadata de consentimiento para incluir en respuestas de estadísticas
     *
     * @param {number} companyId - ID de la empresa
     * @param {number} totalInQuery - Total de registros en la consulta actual
     * @returns {Promise<object>} - Metadata para incluir en respuesta
     */
    static async generateStatsMetadata(companyId, totalInQuery = null) {
        const stats = await this.getConsentStats(companyId);

        const metadata = {
            consentFilter: {
                applied: true,
                totalUsers: stats.totalUsers,
                includedUsers: stats.withConsent,
                excludedUsers: stats.withoutConsent,
                complianceRate: stats.complianceRate,
                warning: null,
                excludedList: stats.excludedUsers.slice(0, 10), // Máximo 10 para no saturar
                hasMoreExcluded: stats.excludedUsers.length > 10
            },
            legal: {
                regulation: 'Ley 25.326 / GDPR / BIPA',
                note: 'Usuarios sin consentimiento biométrico son excluidos de estadísticas para cumplimiento legal'
            }
        };

        // Generar advertencia si hay exclusiones significativas
        if (stats.withoutConsent > 0) {
            const percentage = Math.round((stats.withoutConsent / stats.totalUsers) * 100);
            if (percentage >= 30) {
                metadata.consentFilter.warning = `⚠️ ATENCIÓN: ${stats.withoutConsent} empleados (${percentage}%) excluidos de estas estadísticas por falta de consentimiento biométrico. Las métricas pueden no ser representativas.`;
            } else if (percentage >= 10) {
                metadata.consentFilter.warning = `ℹ️ ${stats.withoutConsent} empleados (${percentage}%) excluidos por falta de consentimiento biométrico.`;
            } else {
                metadata.consentFilter.warning = `${stats.withoutConsent} empleados excluidos por falta de consentimiento.`;
            }
        }

        return metadata;
    }

    /**
     * Wrapper para agregar filtro de consentimiento a una consulta SQL
     *
     * @param {string} baseQuery - Query SQL base
     * @param {number} companyId - ID de la empresa
     * @param {string} userIdColumn - Nombre de la columna de user_id en la query (default: 'user_id')
     * @returns {Promise<string>} - Query modificada con filtro
     */
    static async addConsentFilter(baseQuery, companyId, userIdColumn = 'user_id') {
        const usersWithConsent = await this.getUsersWithBiometricConsent(companyId);

        if (usersWithConsent.length === 0) {
            // Si no hay usuarios con consentimiento, retornar query que no devuelve nada
            console.warn('[ConsentFilterService] No hay usuarios con consentimiento en company', companyId);
            return baseQuery.replace(
                /WHERE/i,
                `WHERE ${userIdColumn} IN (NULL) AND`
            );
        }

        const userIdsList = usersWithConsent.join(',');

        // Buscar si ya tiene WHERE
        if (/WHERE/i.test(baseQuery)) {
            return baseQuery.replace(
                /WHERE/i,
                `WHERE ${userIdColumn} IN (${userIdsList}) AND`
            );
        } else if (/FROM/i.test(baseQuery)) {
            return baseQuery.replace(
                /FROM/i,
                `FROM ... WHERE ${userIdColumn} IN (${userIdsList})`
            );
        }

        return baseQuery;
    }

    /**
     * Filtra un array de resultados removiendo usuarios sin consentimiento
     *
     * @param {Array} results - Array de resultados a filtrar
     * @param {number} companyId - ID de la empresa
     * @param {string} userIdField - Campo que contiene el user_id (default: 'user_id')
     * @returns {Promise<{filtered: Array, excluded: Array, metadata: object}>}
     */
    static async filterResultsByConsent(results, companyId, userIdField = 'user_id') {
        const usersWithConsent = await this.getUsersWithBiometricConsent(companyId);
        const usersWithConsentSet = new Set(usersWithConsent.map(id => String(id)));

        const filtered = [];
        const excluded = [];

        for (const item of results) {
            const userId = String(item[userIdField]);
            if (usersWithConsentSet.has(userId)) {
                filtered.push(item);
            } else {
                excluded.push(item);
            }
        }

        const metadata = await this.generateStatsMetadata(companyId, results.length);
        metadata.consentFilter.originalCount = results.length;
        metadata.consentFilter.filteredCount = filtered.length;
        metadata.consentFilter.removedCount = excluded.length;

        return { filtered, excluded, metadata };
    }

    /**
     * Verifica si un usuario específico tiene consentimiento
     *
     * @param {number} userId - ID del usuario
     * @param {number} companyId - ID de la empresa
     * @param {string} consentType - Tipo de consentimiento
     * @returns {Promise<{hasConsent: boolean, details: object}>}
     */
    static async checkUserConsent(userId, companyId, consentType = CONSENT_TYPE.BIOMETRIC_ANALYSIS) {
        try {
            const consent = await BiometricConsent.findOne({
                where: {
                    userId: userId,
                    companyId: companyId,
                    consentType: consentType,
                    consentGiven: true,
                    revoked: false,
                    [Op.or]: [
                        { expiresAt: null },
                        { expiresAt: { [Op.gt]: new Date() } }
                    ]
                },
                order: [['consentDate', 'DESC']]
            });

            if (consent) {
                return {
                    hasConsent: true,
                    details: {
                        consentId: consent.id,
                        consentDate: consent.consentDate,
                        consentVersion: consent.consentVersion,
                        expiresAt: consent.expiresAt,
                        daysUntilExpiry: consent.expiresAt
                            ? Math.ceil((consent.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
                            : null
                    }
                };
            }

            // Buscar el último registro para dar contexto
            const lastRecord = await BiometricConsent.findOne({
                where: {
                    userId: userId,
                    companyId: companyId,
                    consentType: consentType
                },
                order: [['consentDate', 'DESC']]
            });

            let reason = 'no_record';
            if (lastRecord) {
                if (lastRecord.revoked) reason = 'revoked';
                else if (!lastRecord.consentGiven) reason = 'rejected';
                else if (lastRecord.expiresAt && lastRecord.expiresAt < new Date()) reason = 'expired';
            }

            return {
                hasConsent: false,
                details: {
                    reason,
                    lastRecordDate: lastRecord?.consentDate || null
                }
            };
        } catch (error) {
            console.error('[ConsentFilterService] Error verificando consent de usuario:', error);
            return {
                hasConsent: false,
                details: { reason: 'error', error: error.message }
            };
        }
    }
}

module.exports = ConsentFilterService;
module.exports.CONSENT_TYPE = CONSENT_TYPE;
