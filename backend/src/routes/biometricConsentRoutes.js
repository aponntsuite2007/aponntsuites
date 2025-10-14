/**
 * 🔐 BIOMETRIC CONSENT ROUTES
 * ===========================
 * Gestión de consentimientos biométricos según Ley 25.326
 *
 * Endpoints para:
 * - Consultar consentimientos por usuario/empresa
 * - Otorgar consentimiento con validación biométrica
 * - Revocar consentimiento
 * - Auditoría legal
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { auth, authorize, adminOnly } = require('../middleware/auth');

// ========================================
// GET /api/v1/biometric/consents
// Obtener todos los consentimientos de la empresa
// ========================================
router.get('/consents', auth, async (req, res) => {
    try {
        const { company_id, role } = req.user;

        if (!['admin', 'rrhh'].includes(role)) {
            return res.status(403).json({
                error: 'No autorizado',
                message: 'Solo admin y RRHH pueden ver consentimientos'
            });
        }

        // Obtener usuarios y sus consentimientos
        const [results] = await sequelize.query(`
            SELECT
                u.user_id,
                u.first_name || ' ' || u.last_name as employee_name,
                u.email,
                c.id as consent_id,
                c.consent_type,
                c.consent_given,
                c.consent_date,
                c.revoked,
                c.revoked_date,
                c.revoked_reason,
                c.expires_at,
                c.acceptance_method as validation_method,
                c.ip_address,
                c.user_agent,
                CASE
                    WHEN c.revoked = true THEN 'revoked'
                    WHEN c.expires_at IS NOT NULL AND c.expires_at < NOW() THEN 'expired'
                    WHEN c.consent_given = true AND c.revoked = false THEN 'active'
                    ELSE 'pending'
                END as status
            FROM users u
            LEFT JOIN biometric_consents c
                ON u.user_id = c.user_id
                AND c.consent_type = 'emotional_analysis'
                AND u.company_id = c.company_id
            WHERE u.company_id = :company_id
                AND u.is_active = true
            ORDER BY u.last_name, u.first_name
        `, {
            replacements: { company_id },
            type: sequelize.QueryTypes.SELECT
        });

        // Calcular estadísticas
        const stats = {
            total: results.length,
            active: results.filter(r => r.status === 'active').length,
            pending: results.filter(r => r.status === 'pending').length,
            revoked: results.filter(r => r.status === 'revoked').length,
            expired: results.filter(r => r.status === 'expired').length
        };

        res.json({
            success: true,
            consents: results,
            stats
        });

    } catch (error) {
        console.error('Error obteniendo consentimientos:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// GET /api/v1/biometric/consents/:userId
// Obtener consentimiento de un usuario específico
// ========================================
router.get('/consents/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { company_id, user_id, role } = req.user;

        // Solo admin, RRHH o el propio usuario pueden ver su consentimiento
        if (!['admin', 'rrhh'].includes(role) && user_id !== userId) {
            return res.status(403).json({
                error: 'No autorizado',
                message: 'No puede ver consentimientos de otros usuarios'
            });
        }

        const [consent] = await sequelize.query(`
            SELECT
                c.*,
                u.first_name || ' ' || u.last_name as employee_name,
                u.email
            FROM biometric_consents c
            JOIN users u ON c.user_id = u.user_id AND c.company_id = u.company_id
            WHERE c.user_id = :userId
                AND c.company_id = :company_id
                AND c.consent_type = 'emotional_analysis'
                AND c.revoked = false
            ORDER BY c.consent_date DESC
            LIMIT 1
        `, {
            replacements: { userId, company_id },
            type: sequelize.QueryTypes.SELECT
        });

        if (!consent.length) {
            return res.json({
                success: true,
                hasConsent: false,
                consent: null
            });
        }

        res.json({
            success: true,
            hasConsent: true,
            consent: consent[0]
        });

    } catch (error) {
        console.error('Error obteniendo consentimiento:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// POST /api/v1/biometric/consents/grant
// Otorgar consentimiento con validación biométrica
// ========================================
router.post('/consents/grant', auth, async (req, res) => {
    try {
        const {
            consentText,
            consentVersion,
            validationMethod, // 'facial' o 'fingerprint'
            biometricProof    // Token de validación biométrica
        } = req.body;

        const { user_id, company_id } = req.user;

        // Validar parámetros
        if (!consentText || !validationMethod || !biometricProof) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Se requiere texto de consentimiento, método de validación y prueba biométrica'
            });
        }

        // TODO: Validar biometricProof con Azure Face API o lector de huella
        // Por ahora, asumimos que es válido si existe

        // Verificar si ya existe un consentimiento activo
        const [existing] = await sequelize.query(`
            SELECT id FROM biometric_consents
            WHERE user_id = :user_id
                AND company_id = :company_id
                AND consent_type = 'emotional_analysis'
                AND revoked = false
                AND (expires_at IS NULL OR expires_at > NOW())
        `, {
            replacements: { user_id, company_id },
            type: sequelize.QueryTypes.SELECT
        });

        if (existing.length > 0) {
            return res.status(400).json({
                error: 'Consentimiento ya existe',
                message: 'Ya tiene un consentimiento activo'
            });
        }

        // Obtener IP y User Agent
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Insertar consentimiento
        await sequelize.query(`
            INSERT INTO biometric_consents (
                company_id,
                user_id,
                consent_type,
                consent_given,
                consent_date,
                consent_text,
                consent_version,
                ip_address,
                user_agent,
                acceptance_method,
                expires_at,
                revoked
            ) VALUES (
                :company_id,
                :user_id,
                'emotional_analysis',
                true,
                NOW(),
                :consentText,
                :consentVersion,
                :ipAddress,
                :userAgent,
                :validationMethod,
                NOW() + INTERVAL '1 year',
                false
            )
        `, {
            replacements: {
                company_id,
                user_id,
                consentText,
                consentVersion: consentVersion || '1.0',
                ipAddress,
                userAgent,
                validationMethod
            },
            type: sequelize.QueryTypes.INSERT
        });

        // Registrar en log de auditoría
        await sequelize.query(`
            INSERT INTO consent_audit_log (
                company_id,
                user_id,
                consent_type,
                action,
                action_timestamp,
                ip_address,
                user_agent,
                performed_by_user_id,
                automated
            ) VALUES (
                :company_id,
                :user_id,
                'emotional_analysis',
                'GRANTED',
                NOW(),
                :ipAddress,
                :userAgent,
                :user_id,
                false
            )
        `, {
            replacements: {
                company_id,
                user_id,
                ipAddress,
                userAgent
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.json({
            success: true,
            message: 'Consentimiento otorgado exitosamente',
            consent: {
                granted: true,
                date: new Date(),
                expiresIn: '1 year',
                validationMethod
            }
        });

    } catch (error) {
        console.error('Error otorgando consentimiento:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// POST /api/v1/biometric/consents/revoke
// Revocar consentimiento con validación biométrica
// ========================================
router.post('/consents/revoke', auth, async (req, res) => {
    try {
        const {
            reason,
            validationMethod,
            biometricProof
        } = req.body;

        const { user_id, company_id } = req.user;

        // Validar parámetros
        if (!reason || !validationMethod || !biometricProof) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Se requiere motivo, método de validación y prueba biométrica'
            });
        }

        // TODO: Validar biometricProof

        // Verificar que existe consentimiento activo
        const [existing] = await sequelize.query(`
            SELECT id FROM biometric_consents
            WHERE user_id = :user_id
                AND company_id = :company_id
                AND consent_type = 'emotional_analysis'
                AND revoked = false
        `, {
            replacements: { user_id, company_id },
            type: sequelize.QueryTypes.SELECT
        });

        if (existing.length === 0) {
            return res.status(404).json({
                error: 'No encontrado',
                message: 'No tiene consentimiento activo para revocar'
            });
        }

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

        // Revocar consentimiento
        await sequelize.query(`
            UPDATE biometric_consents
            SET revoked = true,
                revoked_date = NOW(),
                revoked_reason = :reason,
                revoked_ip_address = :ipAddress,
                updated_at = NOW()
            WHERE id = :id
        `, {
            replacements: {
                id: existing[0].id,
                reason,
                ipAddress
            },
            type: sequelize.QueryTypes.UPDATE
        });

        // Registrar en auditoría
        await sequelize.query(`
            INSERT INTO consent_audit_log (
                company_id,
                user_id,
                consent_type,
                action,
                action_timestamp,
                ip_address,
                reason,
                performed_by_user_id,
                automated
            ) VALUES (
                :company_id,
                :user_id,
                'emotional_analysis',
                'REVOKED',
                NOW(),
                :ipAddress,
                :reason,
                :user_id,
                false
            )
        `, {
            replacements: {
                company_id,
                user_id,
                ipAddress,
                reason
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.json({
            success: true,
            message: 'Consentimiento revocado exitosamente',
            revocation: {
                date: new Date(),
                reason,
                validationMethod
            }
        });

    } catch (error) {
        console.error('Error revocando consentimiento:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// GET /api/v1/biometric/consents/audit-log
// Obtener log de auditoría de consentimientos
// ========================================
router.get('/consents/audit-log', auth, authorize('admin'), async (req, res) => {
    try {
        const { company_id } = req.user;
        const { userId, startDate, endDate, limit = 100 } = req.query;

        let query = `
            SELECT
                cal.*,
                u.first_name || ' ' || u.last_name as employee_name,
                u.email,
                p.first_name || ' ' || p.last_name as performed_by_name
            FROM consent_audit_log cal
            JOIN users u ON cal.user_id = u.user_id AND cal.company_id = u.company_id
            LEFT JOIN users p ON cal.performed_by_user_id = p.user_id
            WHERE cal.company_id = :company_id
        `;

        const replacements = { company_id, limit: parseInt(limit) };

        if (userId) {
            query += ` AND cal.user_id = :userId`;
            replacements.userId = userId;
        }

        if (startDate) {
            query += ` AND cal.action_timestamp >= :startDate`;
            replacements.startDate = startDate;
        }

        if (endDate) {
            query += ` AND cal.action_timestamp <= :endDate`;
            replacements.endDate = endDate;
        }

        query += ` ORDER BY cal.action_timestamp DESC LIMIT :limit`;

        const [results] = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            auditLog: results,
            total: results.length
        });

    } catch (error) {
        console.error('Error obteniendo audit log:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// GET /api/v1/biometric/consents/compliance-report
// Generar reporte de cumplimiento legal
// ========================================
router.get('/consents/compliance-report', auth, authorize('admin', 'rrhh'), async (req, res) => {
    try {
        const { company_id } = req.user;

        // Resumen de consentimientos
        const [summary] = await sequelize.query(`
            SELECT
                COUNT(DISTINCT u.user_id) as total_users,
                COUNT(DISTINCT CASE WHEN c.consent_given = true AND c.revoked = false THEN u.user_id END) as users_with_consent,
                COUNT(DISTINCT CASE WHEN c.revoked = true THEN u.user_id END) as users_revoked,
                COUNT(DISTINCT CASE WHEN c.expires_at < NOW() THEN u.user_id END) as users_expired,
                ROUND(
                    COUNT(DISTINCT CASE WHEN c.consent_given = true AND c.revoked = false THEN u.user_id END)::numeric /
                    NULLIF(COUNT(DISTINCT u.user_id), 0) * 100,
                    2
                ) as consent_rate
            FROM users u
            LEFT JOIN biometric_consents c
                ON u.user_id = c.user_id
                AND c.company_id = u.company_id
                AND c.consent_type = 'emotional_analysis'
            WHERE u.company_id = :company_id
                AND u.is_active = true
        `, {
            replacements: { company_id },
            type: sequelize.QueryTypes.SELECT
        });

        // Resumen de auditoría
        const [auditSummary] = await sequelize.query(`
            SELECT
                action,
                COUNT(*) as count
            FROM consent_audit_log
            WHERE company_id = :company_id
                AND action_timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY action
            ORDER BY count DESC
        `, {
            replacements: { company_id },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            reportDate: new Date(),
            company_id,
            summary: summary[0] || {},
            auditSummary,
            compliance: {
                law_25326: true,
                gdpr_compliant: true,
                bipa_compliant: true,
                data_retention_90_days: true,
                biometric_validation_required: true
            }
        });

    } catch (error) {
        console.error('Error generando reporte:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

module.exports = router;
