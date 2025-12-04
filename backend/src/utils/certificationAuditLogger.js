/**
 * OH-V6-19: CERTIFICATION AUDIT LOGGER
 * Utilidad para registrar automáticamente todas las acciones sobre certificaciones
 *
 * USO:
 * const { logCertificationAction } = require('../utils/certificationAuditLogger');
 *
 * await logCertificationAction(pool, {
 *     companyId,
 *     certificationId,
 *     action: 'created',
 *     userId: req.user.id,
 *     userName: req.user.name,
 *     changes: { new: newCertData },
 *     req
 * });
 */

/**
 * Registrar acción en audit log
 *
 * @param {Object} pool - PostgreSQL pool
 * @param {Object} data - Datos del log
 * @param {number} data.companyId - ID de la empresa
 * @param {number} data.certificationId - ID de la certificación (nullable)
 * @param {string} data.action - Acción realizada (created, updated, deleted, uploaded_doc, bulk_upload, status_changed, renewed)
 * @param {string} data.userId - ID del usuario que realizó la acción
 * @param {string} data.userName - Nombre del usuario
 * @param {Object} data.changes - Objeto con old/new values
 * @param {Object} data.req - Request object (para extraer IP y user agent)
 */
async function logCertificationAction(pool, data) {
    const {
        companyId,
        certificationId = null,
        action,
        userId,
        userName,
        changes = null,
        req
    } = data;

    try {
        // Validar acción
        const validActions = [
            'created',
            'updated',
            'deleted',
            'uploaded_doc',
            'bulk_upload',
            'status_changed',
            'renewed',
            'restored',
            'exported'
        ];

        if (!validActions.includes(action)) {
            console.warn(`⚠️ [AUDIT] Unknown action type: ${action}`);
        }

        // Extraer IP y user agent
        const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
        const userAgent = req?.headers?.['user-agent'] || null;

        // Preparar changes para JSONB
        let changesJSON = null;
        if (changes) {
            changesJSON = JSON.stringify(changes);
        }

        const query = `
            INSERT INTO oh_certification_audit_log (
                company_id,
                certification_id,
                action,
                user_id,
                user_name,
                changes,
                ip_address,
                user_agent,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id
        `;

        const values = [
            companyId,
            certificationId,
            action,
            userId,
            userName,
            changesJSON,
            ipAddress,
            userAgent
        ];

        const result = await pool.query(query, values);

        console.log(`📝 [AUDIT] Logged action "${action}" for certification ${certificationId || 'N/A'} (log ID: ${result.rows[0].id})`);

        return result.rows[0].id;

    } catch (error) {
        // No fallar la operación principal si el log falla
        console.error('❌ [AUDIT] Error logging certification action:', error.message);
        return null;
    }
}

/**
 * Obtener historial de auditoría de una certificación
 *
 * @param {Object} pool - PostgreSQL pool
 * @param {number} companyId - ID de la empresa
 * @param {number} certificationId - ID de la certificación
 * @param {Object} options - Opciones de consulta
 * @param {number} options.limit - Límite de resultados (default: 50)
 * @param {number} options.offset - Offset para paginación (default: 0)
 */
async function getCertificationAuditLog(pool, companyId, certificationId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    try {
        const query = `
            SELECT
                id,
                action,
                user_id,
                user_name,
                changes,
                ip_address,
                created_at
            FROM oh_certification_audit_log
            WHERE company_id = $1 AND certification_id = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `;

        const result = await pool.query(query, [companyId, certificationId, limit, offset]);

        return result.rows;

    } catch (error) {
        console.error('❌ [AUDIT] Error fetching audit log:', error.message);
        throw error;
    }
}

/**
 * Obtener estadísticas de auditoría de una empresa
 *
 * @param {Object} pool - PostgreSQL pool
 * @param {number} companyId - ID de la empresa
 * @param {number} days - Días hacia atrás para calcular stats (default: 30)
 */
async function getAuditStats(pool, companyId, days = 30) {
    try {
        const query = `SELECT * FROM get_audit_stats($1, $2)`;
        const result = await pool.query(query, [companyId, days]);

        return result.rows[0];

    } catch (error) {
        console.error('❌ [AUDIT] Error fetching audit stats:', error.message);
        throw error;
    }
}

/**
 * Express middleware para logging automático de acciones
 *
 * USO:
 * router.post('/certifications', auth, auditMiddleware('created'), async (req, res) => {
 *     // ... crear certificación ...
 *     req.auditData = {
 *         certificationId: newCert.id,
 *         changes: { new: newCert }
 *     };
 * });
 */
function auditMiddleware(action) {
    return async (req, res, next) => {
        // Guardar referencia original de res.json
        const originalJson = res.json.bind(res);

        // Override res.json para capturar la respuesta
        res.json = function(data) {
            // Si la operación fue exitosa y hay datos de audit
            if (data.success && req.auditData) {
                const pool = req.app.locals.pool || req.pool;

                if (pool) {
                    logCertificationAction(pool, {
                        companyId: req.user.company_id,
                        certificationId: req.auditData.certificationId,
                        action,
                        userId: req.user.id,
                        userName: req.user.name || req.user.username,
                        changes: req.auditData.changes,
                        req
                    }).catch(err => {
                        console.error('❌ [AUDIT MIDDLEWARE] Error:', err.message);
                    });
                }
            }

            // Llamar al json original
            return originalJson(data);
        };

        next();
    };
}

/**
 * Comparar dos objetos y generar objeto de cambios para audit log
 *
 * @param {Object} oldData - Datos anteriores
 * @param {Object} newData - Datos nuevos
 * @returns {Object} Objeto con { old, new } solo de campos modificados
 */
function generateChangesObject(oldData, newData) {
    const changes = { old: {}, new: {} };

    // Comparar cada campo del nuevo objeto
    Object.keys(newData).forEach(key => {
        if (oldData[key] !== newData[key]) {
            changes.old[key] = oldData[key];
            changes.new[key] = newData[key];
        }
    });

    // Si no hay cambios, retornar null
    if (Object.keys(changes.old).length === 0) {
        return null;
    }

    return changes;
}

module.exports = {
    logCertificationAction,
    getCertificationAuditLog,
    getAuditStats,
    auditMiddleware,
    generateChangesObject
};
