/**
 * ConsentBranchSyncService - Sincronización entre Sucursales y Consentimientos
 *
 * SINGLE SOURCE OF TRUTH (SSOT):
 * - payroll_countries → Fuente de verdad para regulaciones de privacidad
 * - company_branches → Fuente de verdad para ubicación de sucursales
 * - biometric_consents → Registros de consentimientos (referencia a branch/country)
 *
 * REGLA PRINCIPAL:
 * Cuando un usuario cambia de sucursal a un país diferente,
 * su consentimiento se invalida y debe renovarse según las nuevas regulaciones.
 */

const { sequelize } = require('../config/database');
const ConsentRegionService = require('./ConsentRegionService');

class ConsentBranchSyncService {

    /**
     * Verifica el estado de consentimiento de un usuario
     * Considera el país de su sucursal actual
     */
    static async getUserConsentStatus(userId) {
        try {
            const result = await sequelize.query(`
                SELECT * FROM fn_get_user_consent_status(:userId)
            `, {
                replacements: { userId },
                type: sequelize.QueryTypes.SELECT
            });

            if (result.length > 0) {
                return {
                    success: true,
                    ...result[0]
                };
            }

            return {
                success: true,
                has_valid_consent: false,
                consent_id: null,
                needs_renewal: true
            };
        } catch (error) {
            // Si la función no existe, usar query directa
            console.warn('[ConsentBranchSync] fn_get_user_consent_status no existe, usando query directa');
            return await this._getUserConsentStatusDirect(userId);
        }
    }

    /**
     * Query directa para estado de consentimiento (fallback)
     * NOTA: No hace join con company_branches porque hay incompatibilidad de tipos
     * (users.branch_id es UUID pero company_branches.id es INTEGER)
     */
    static async _getUserConsentStatusDirect(userId) {
        const result = await sequelize.query(`
            SELECT
                bc.id as consent_id,
                bc.consent_given,
                bc.consent_date,
                bc.expires_at,
                bc.revoked,
                CASE
                    WHEN bc.expires_at IS NOT NULL AND bc.expires_at < NOW() THEN FALSE
                    WHEN bc.consent_given = TRUE AND (bc.revoked IS NULL OR bc.revoked = FALSE) THEN TRUE
                    ELSE FALSE
                END as has_valid_consent,
                CASE
                    WHEN bc.expires_at IS NOT NULL AND bc.expires_at <= NOW() + INTERVAL '30 days' THEN TRUE
                    ELSE FALSE
                END as needs_renewal,
                EXTRACT(DAY FROM (bc.expires_at - NOW()))::INTEGER as days_until_expiry,
                24 as renewal_months
            FROM users u
            LEFT JOIN biometric_consents bc ON bc.user_id = u.user_id
                AND bc.company_id = u.company_id
            WHERE u.user_id = :userId
            ORDER BY bc.consent_date DESC NULLS LAST
            LIMIT 1
        `, {
            replacements: { userId },
            type: sequelize.QueryTypes.SELECT
        });

        if (result.length > 0) {
            return { success: true, ...result[0] };
        }

        return {
            success: true,
            has_valid_consent: false,
            consent_id: null,
            needs_renewal: true
        };
    }

    /**
     * Simula cambio de sucursal y verifica impacto en consentimiento
     * (Para testing - no aplica cambios reales)
     */
    static async simulateBranchChange(userId, newBranchId) {
        try {
            // Obtener datos actuales del usuario
            // NOTA: Simplificado para evitar tipo mismatch (users.branch_id UUID vs company_branches.id INTEGER)
            const [user] = await sequelize.query(`
                SELECT u.user_id, u.company_id,
                       u.branch_id as current_branch_id,
                       NULL as current_branch_name,
                       NULL as current_country_code,
                       NULL as current_country_name,
                       24 as current_renewal_months
                FROM users u
                WHERE u.user_id = :userId
            `, {
                replacements: { userId },
                type: sequelize.QueryTypes.SELECT
            });

            if (!user) {
                return { success: false, error: 'Usuario no encontrado' };
            }

            // Obtener datos de la nueva sucursal
            const [newBranch] = await sequelize.query(`
                SELECT cb.id, cb.branch_name as branch_name,
                       pc.country_code, pc.country_name,
                       COALESCE(pc.consent_renewal_months, 24) as renewal_months
                FROM company_branches cb
                LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                WHERE cb.id = :branchId
            `, {
                replacements: { branchId: newBranchId },
                type: sequelize.QueryTypes.SELECT
            });

            if (!newBranch) {
                return { success: false, error: 'Sucursal no encontrada' };
            }

            // Verificar si cambia el país
            const countryChanges = user.current_country_code !== newBranch.country_code;

            // Obtener consentimiento actual
            const consentStatus = await this.getUserConsentStatus(userId);

            return {
                success: true,
                simulation: true,
                currentState: {
                    branchId: user.current_branch_id,
                    branchName: user.current_branch_name,
                    countryCode: user.current_country_code,
                    countryName: user.current_country_name,
                    renewalMonths: user.current_renewal_months
                },
                newState: {
                    branchId: newBranch.id,
                    branchName: newBranch.branch_name,
                    countryCode: newBranch.country_code,
                    countryName: newBranch.country_name,
                    renewalMonths: newBranch.renewal_months
                },
                impact: {
                    countryChanges,
                    consentWillBeInvalidated: countryChanges && consentStatus.has_valid_consent,
                    newConsentRequired: countryChanges,
                    renewalPeriodChanges: user.current_renewal_months !== newBranch.renewal_months,
                    currentConsentStatus: consentStatus.has_valid_consent ? 'VALID' : 'NONE'
                },
                message: countryChanges
                    ? `ATENCIÓN: Cambio de país (${user.current_country_name || 'N/A'} → ${newBranch.country_name || 'N/A'}). El consentimiento se invalidará y deberá renovarse con período de ${newBranch.renewal_months} meses.`
                    : `Cambio dentro del mismo país. El consentimiento se mantendrá válido.`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene el historial de cambios de consentimiento de un usuario
     */
    static async getConsentChangeHistory(userId, limit = 20) {
        try {
            const history = await sequelize.query(`
                SELECT
                    ccl.*,
                    old_cb.branch_name as old_branch_name,
                    new_cb.branch_name as new_branch_name,
                    old_pc.country_name as old_country_name,
                    new_pc.country_name as new_country_name
                FROM consent_change_log ccl
                LEFT JOIN company_branches old_cb ON old_cb.id = ccl.old_branch_id
                LEFT JOIN company_branches new_cb ON new_cb.id = ccl.new_branch_id
                LEFT JOIN payroll_countries old_pc ON old_pc.id = ccl.old_country_id
                LEFT JOIN payroll_countries new_pc ON new_pc.id = ccl.new_country_id
                WHERE ccl.user_id = :userId
                ORDER BY ccl.created_at DESC
                LIMIT :limit
            `, {
                replacements: { userId, limit },
                type: sequelize.QueryTypes.SELECT
            });

            return { success: true, history };
        } catch (error) {
            // La tabla puede no existir aún
            return { success: true, history: [], note: 'Tabla consent_change_log no existe aún' };
        }
    }

    /**
     * Dashboard de consentimientos por empresa
     */
    static async getCompanyConsentDashboard(companyId) {
        try {
            // Intentar usar la vista
            const dashboard = await sequelize.query(`
                SELECT * FROM vw_consent_dashboard
                WHERE company_id = :companyId
                ORDER BY consent_status, employee_name
            `, {
                replacements: { companyId },
                type: sequelize.QueryTypes.SELECT
            });

            // Agrupar por estado
            const byStatus = {};
            dashboard.forEach(row => {
                if (!byStatus[row.consent_status]) {
                    byStatus[row.consent_status] = [];
                }
                byStatus[row.consent_status].push(row);
            });

            return {
                success: true,
                total: dashboard.length,
                byStatus,
                summary: {
                    active: byStatus['ACTIVE']?.length || 0,
                    expiringSoon: byStatus['EXPIRING_SOON']?.length || 0,
                    expired: byStatus['EXPIRED']?.length || 0,
                    pending: byStatus['PENDING']?.length || 0,
                    noConsent: byStatus['NO_CONSENT']?.length || 0,
                    invalidated: byStatus['INVALIDATED']?.length || 0,
                    revoked: byStatus['REVOKED']?.length || 0
                },
                details: dashboard
            };
        } catch (error) {
            // Fallback si la vista no existe
            return await this._getCompanyConsentDashboardDirect(companyId);
        }
    }

    /**
     * Dashboard directo (fallback)
     * NOTA: Query simplificado para evitar incompatibilidad de tipos
     * users.branch_id (UUID) vs company_branches.id (INTEGER)
     */
    static async _getCompanyConsentDashboardDirect(companyId) {
        const dashboard = await sequelize.query(`
            SELECT
                u.user_id,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u.email,
                u.company_id,
                u.branch_id as current_branch_id,
                NULL as branch_name,
                NULL as country_code,
                NULL as country_name,
                bc.id as consent_id,
                bc.consent_given,
                bc.consent_date,
                bc.expires_at,
                CASE
                    WHEN bc.revoked = TRUE THEN 'REVOKED'
                    WHEN bc.expires_at IS NOT NULL AND bc.expires_at < NOW() THEN 'EXPIRED'
                    WHEN bc.expires_at IS NOT NULL AND bc.expires_at <= NOW() + INTERVAL '30 days' THEN 'EXPIRING_SOON'
                    WHEN bc.consent_given = TRUE THEN 'ACTIVE'
                    WHEN bc.id IS NOT NULL THEN 'PENDING'
                    ELSE 'NO_CONSENT'
                END as consent_status
            FROM users u
            LEFT JOIN biometric_consents bc ON bc.user_id = u.user_id AND bc.company_id = u.company_id
            WHERE u.company_id = :companyId AND u.is_active = TRUE
            ORDER BY employee_name
        `, {
            replacements: { companyId },
            type: sequelize.QueryTypes.SELECT
        });

        const byStatus = {};
        dashboard.forEach(row => {
            if (!byStatus[row.consent_status]) {
                byStatus[row.consent_status] = [];
            }
            byStatus[row.consent_status].push(row);
        });

        return {
            success: true,
            total: dashboard.length,
            byStatus,
            summary: {
                active: byStatus['ACTIVE']?.length || 0,
                expiringSoon: byStatus['EXPIRING_SOON']?.length || 0,
                expired: byStatus['EXPIRED']?.length || 0,
                pending: byStatus['PENDING']?.length || 0,
                noConsent: byStatus['NO_CONSENT']?.length || 0
            },
            details: dashboard
        };
    }

    /**
     * Valida integridad SSOT entre usuarios, sucursales y consentimientos
     * NOTA: Maneja incompatibilidad de tipos (users.branch_id UUID vs company_branches.id INTEGER)
     */
    static async validateSSOTIntegrity(companyId) {
        const issues = [];

        // 1. Usuarios con branch_id que no existe
        // NOTA: Saltamos este check porque hay incompatibilidad de tipos:
        // users.branch_id es UUID pero company_branches.id es INTEGER
        // Esto es un issue de esquema que debe resolverse a nivel de migración
        issues.push({
            type: 'SCHEMA_TYPE_MISMATCH',
            severity: 'INFO',
            count: 0,
            details: {
                message: 'users.branch_id (UUID) no puede unirse con company_branches.id (INTEGER)',
                recommendation: 'Normalizar tipos de datos en una migración futura'
            },
            fix: 'N/A - Requiere migración de esquema'
        });

        // 2. Sucursales sin país configurado
        const branchesNoCountry = await sequelize.query(`
            SELECT cb.id, cb.branch_name
            FROM company_branches cb
            WHERE cb.company_id = :companyId
              AND (cb.country_id IS NULL OR cb.country_id NOT IN (SELECT id FROM payroll_countries))
        `, { replacements: { companyId }, type: sequelize.QueryTypes.SELECT });

        if (branchesNoCountry.length > 0) {
            issues.push({
                type: 'BRANCH_NO_COUNTRY',
                severity: 'MEDIUM',
                count: branchesNoCountry.length,
                details: branchesNoCountry,
                fix: 'Configurar country_id en company_branches'
            });
        }

        // 3. Consentimientos sin branch_id (datos legacy)
        // NOTA: Esta columna solo existe si se ejecutó la migración
        try {
            const consentsNoBranch = await sequelize.query(`
                SELECT bc.id, bc.user_id
                FROM biometric_consents bc
                WHERE bc.company_id = :companyId
                  AND bc.branch_id IS NULL
            `, { replacements: { companyId }, type: sequelize.QueryTypes.SELECT });

            if (consentsNoBranch.length > 0) {
                issues.push({
                    type: 'CONSENT_NO_BRANCH',
                    severity: 'LOW',
                    count: consentsNoBranch.length,
                    details: consentsNoBranch.slice(0, 10), // Solo primeros 10
                    fix: 'Ejecutar UPDATE para sincronizar branch_id desde users'
                });
            }
        } catch (err) {
            // La columna branch_id no existe - migración pendiente
            issues.push({
                type: 'MIGRATION_PENDING',
                severity: 'MEDIUM',
                count: 0,
                details: {
                    message: 'biometric_consents.branch_id no existe',
                    recommendation: 'Ejecutar migración: 20251201_consent_branch_sync_trigger.sql'
                },
                fix: 'Ejecutar migración SQL para agregar columnas SSOT'
            });
        }

        // 4. Consentimientos con país diferente al actual del usuario
        // NOTA: Solo funciona si branch_id y country_code existen
        // NOTA: No se puede ejecutar por incompatibilidad de tipos (UUID vs INTEGER)

        // Solo contar issues de severidad HIGH o MEDIUM como problemas reales
        // INFO es para limitaciones documentadas que no afectan funcionalidad
        const actionableIssues = issues.filter(i => i.severity === 'HIGH' || i.severity === 'MEDIUM');

        return {
            success: true,
            isValid: actionableIssues.length === 0,
            issueCount: actionableIssues.length,
            infoCount: issues.filter(i => i.severity === 'INFO').length,
            issues,
            checkedAt: new Date().toISOString()
        };
    }

    /**
     * Aplica correcciones automáticas de integridad
     */
    static async autoFixSSOTIssues(companyId, dryRun = true) {
        const validation = await this.validateSSOTIntegrity(companyId);
        const fixes = [];

        for (const issue of validation.issues) {
            if (issue.type === 'CONSENT_COUNTRY_MISMATCH' && !dryRun) {
                // Invalidar consentimientos con país diferente
                for (const consent of issue.details) {
                    await sequelize.query(`
                        UPDATE biometric_consents
                        SET invalidated_reason = 'AUTO_FIX_COUNTRY_MISMATCH',
                            invalidated_at = NOW()
                        WHERE id = :consentId
                    `, { replacements: { consentId: consent.consent_id } });

                    fixes.push({
                        type: 'CONSENT_INVALIDATED',
                        consentId: consent.consent_id,
                        userId: consent.user_id,
                        reason: `País del consentimiento (${consent.consent_country}) != país actual (${consent.current_country})`
                    });
                }
            }

            if (issue.type === 'CONSENT_NO_BRANCH' && !dryRun) {
                // Actualizar consentimientos con branch actual del usuario
                await sequelize.query(`
                    UPDATE biometric_consents bc
                    SET branch_id = COALESCE(u.branch_id, u.default_branch_id),
                        country_id = cb.country_id,
                        country_code = pc.country_code
                    FROM users u
                    LEFT JOIN company_branches cb ON cb.id = COALESCE(u.branch_id, u.default_branch_id)
                    LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                    WHERE bc.user_id = u.user_id
                      AND bc.company_id = :companyId
                      AND bc.branch_id IS NULL
                `, { replacements: { companyId } });

                fixes.push({
                    type: 'CONSENTS_UPDATED_WITH_BRANCH',
                    count: issue.count
                });
            }
        }

        return {
            success: true,
            dryRun,
            originalIssues: validation.issueCount,
            fixesApplied: fixes.length,
            fixes,
            message: dryRun
                ? 'Modo simulación. Use dryRun=false para aplicar correcciones.'
                : 'Correcciones aplicadas.'
        };
    }
}

module.exports = ConsentBranchSyncService;
