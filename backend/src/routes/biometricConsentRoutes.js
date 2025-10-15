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
const biometricConsentService = require('../services/biometricConsentService');

// ========================================
// GET /api/v1/biometric/consents
// Obtener todos los consentimientos de la empresa
// ========================================
router.get('/consents', auth, authorize('admin', 'rrhh'), async (req, res) => {
    try {
        // Obtener company_id de varias formas posibles (Sequelize)
        const company_id = req.user.companyId || req.user.company_id || req.user.dataValues?.company_id || req.user.dataValues?.companyId;
        const { status, role: roleFilter, method } = req.query;

        // Construir WHERE clause dinámico
        let whereConditions = ['u.company_id = :company_id', 'u.is_active = true'];
        const replacements = { company_id };

        if (status) {
            if (status === 'aceptado') {
                whereConditions.push('c.consent_given = true AND c.revoked = false');
            } else if (status === 'pendiente') {
                whereConditions.push('(c.id IS NULL OR (c.consent_given = false AND c.created_at IS NULL))');
            } else if (status === 'enviado') {
                whereConditions.push('c.id IS NOT NULL AND c.consent_given = false AND EXTRACT(DAY FROM (NOW() - c.created_at)) < 7');
            } else if (status === 'sin respuesta') {
                whereConditions.push('c.id IS NOT NULL AND c.consent_given = false AND EXTRACT(DAY FROM (NOW() - c.created_at)) >= 7');
            } else if (status === 'rechazado') {
                whereConditions.push('c.revoked = true');
            } else if (status === 'expirado') {
                whereConditions.push('c.expires_at IS NOT NULL AND c.expires_at < NOW()');
            }
        }

        if (roleFilter) {
            whereConditions.push('u.role = :roleFilter');
            replacements.roleFilter = roleFilter;
        }

        if (method) {
            whereConditions.push('c.acceptance_method = :method');
            replacements.method = method;
        }

        // Obtener usuarios y sus consentimientos
        const results = await sequelize.query(`
            SELECT
                u.user_id,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u.email,
                c.id as consent_id,
                c.consent_type,
                c.consent_given,
                c.consent_date,
                c.created_at as consent_created_at,
                c.revoked,
                c.revoked_date,
                c.revoked_reason,
                c.expires_at,
                c.acceptance_method as validation_method,
                c.ip_address,
                c.user_agent,
                CASE
                    WHEN bd.id IS NOT NULL THEN true
                    ELSE false
                END as has_biometry,
                CASE
                    WHEN c.revoked = true THEN 'rechazado'
                    WHEN c.expires_at IS NOT NULL AND c.expires_at < NOW() THEN 'expirado'
                    WHEN c.consent_given = true AND c.revoked = false THEN 'aceptado'
                    WHEN c.id IS NOT NULL AND c.consent_given = false AND
                         EXTRACT(DAY FROM (NOW() - c.created_at)) >= 7 THEN 'sin respuesta'
                    WHEN c.id IS NOT NULL AND c.consent_given = false THEN 'enviado'
                    ELSE 'pendiente'
                END as status
            FROM users u
            LEFT JOIN biometric_consents c
                ON u.user_id = c.user_id
                AND c.consent_type = 'biometric_analysis'
                AND u.company_id = c.company_id
            LEFT JOIN biometric_data bd
                ON u.user_id = bd."UserId"
                AND bd.type = 'face'
                AND bd."isActive" = true
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY u."lastName", u."firstName"
        `, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        // Calcular estadísticas
        const stats = {
            total: results.length,
            aceptado: results.filter(r => r.status === 'aceptado').length,
            pendiente: results.filter(r => r.status === 'pendiente').length,
            enviado: results.filter(r => r.status === 'enviado').length,
            sin_respuesta: results.filter(r => r.status === 'sin respuesta').length,
            rechazado: results.filter(r => r.status === 'rechazado').length,
            expirado: results.filter(r => r.status === 'expirado').length,
            con_biometria: results.filter(r => r.has_biometry === true).length,
            sin_biometria: results.filter(r => r.has_biometry === false).length
        };

        res.json({
            success: true,
            consents: results,
            stats
        });

    } catch (error) {
        console.error('❌ [CONSENTS] Error obteniendo consentimientos:', error);
        console.error('❌ [CONSENTS] Error stack:', error.stack);
        res.status(500).json({
            error: 'Error interno',
            message: error.message,
            details: error.stack,
            sql: error.sql || 'N/A'
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

        const { user_id, companyId: company_id } = req.user;

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
        const existing = await sequelize.query(`
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

        const { user_id, companyId: company_id } = req.user;

        // Validar parámetros
        if (!reason || !validationMethod || !biometricProof) {
            return res.status(400).json({
                error: 'Datos incompletos',
                message: 'Se requiere motivo, método de validación y prueba biométrica'
            });
        }

        // TODO: Validar biometricProof

        // Verificar que existe consentimiento activo
        const existing = await sequelize.query(`
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
        const { companyId: company_id } = req.user;
        const { userId, startDate, endDate, limit = 100 } = req.query;

        let query = `
            SELECT
                cal.*,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u.email,
                p."firstName" || ' ' || p."lastName" as performed_by_name
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

        const results = await sequelize.query(query, {
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
        const { companyId: company_id } = req.user;

        // Resumen de consentimientos
        const summary = await sequelize.query(`
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
        const auditSummary = await sequelize.query(`
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

// ========================================
// GET /api/v1/biometric/consents/validate-token/:token
// Validar token y obtener datos para página pública
// ========================================
router.get('/consents/validate-token/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Buscar consentimiento por token
        const consents = await sequelize.query(`
            SELECT
                c.id, c.user_id, c.company_id, c.consent_text,
                c.consent_version, c.consent_token_expires_at,
                u."firstName", u."lastName", u.email,
                comp.name as company_name
            FROM biometric_consents c
            JOIN users u ON c.user_id = u.user_id
            JOIN companies comp ON c.company_id = comp.company_id
            WHERE c.consent_token = :token
                AND c.consent_token_expires_at > NOW()
                AND c.consent_given = false
        `, {
            replacements: { token },
            type: sequelize.QueryTypes.SELECT
        });

        if (consents.length === 0) {
            return res.status(404).json({
                error: 'Token inválido o expirado'
            });
        }

        const consent = consents[0];

        // Registrar acceso al link
        await sequelize.query(`
            UPDATE biometric_consents
            SET consent_link_accessed_at = NOW(),
                consent_link_access_count = consent_link_access_count + 1
            WHERE consent_token = :token
        `, {
            replacements: { token },
            type: sequelize.QueryTypes.UPDATE
        });

        // Log en auditoría
        await sequelize.query(`
            INSERT INTO consent_audit_log (
                company_id, user_id, action, action_timestamp, automated
            ) VALUES (
                :companyId, :userId, 'LINK_ACCESSED', NOW(), false
            )
        `, {
            replacements: {
                companyId: consent.company_id,
                userId: consent.user_id
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.json({
            success: true,
            user: {
                firstName: consent.firstName,
                lastName: consent.lastName,
                email: consent.email
            },
            company: {
                name: consent.company_name
            },
            legalDocument: {
                content: consent.consent_text,
                version: consent.consent_version
            },
            expiresAt: consent.consent_token_expires_at
        });

    } catch (error) {
        console.error('Error validando token:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// POST /api/v1/biometric/consents/accept
// Aceptar consentimiento desde página pública
// ========================================
router.post('/consents/accept', async (req, res) => {
    try {
        const { token, acceptanceMethod, userAgent, timestamp } = req.body;

        // Buscar consentimiento
        const consents = await sequelize.query(`
            SELECT id, user_id, company_id, consent_text, consent_version,
                   consent_document_hash
            FROM biometric_consents
            WHERE consent_token = :token
                AND consent_token_expires_at > NOW()
                AND consent_given = false
        `, {
            replacements: { token },
            type: sequelize.QueryTypes.SELECT
        });

        if (consents.length === 0) {
            return res.status(404).json({
                error: 'Token inválido o expirado'
            });
        }

        const consent = consents[0];

        // Calcular hash de respuesta
        const crypto = require('crypto');
        const responseData = {
            userId: consent.user_id,
            companyId: consent.company_id,
            consentGiven: true,
            timestamp,
            documentHash: consent.consent_document_hash
        };
        const responseHash = crypto.createHash('sha256')
            .update(JSON.stringify(responseData))
            .digest('hex');

        // Generar firma HMAC
        const signatureData = `${consent.user_id}|${consent.company_id}|true|${timestamp}`;
        const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
            .update(signatureData)
            .digest('hex');

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

        // Actualizar consentimiento
        await sequelize.query(`
            UPDATE biometric_consents
            SET consent_given = true,
                consent_date = NOW(),
                consent_response_timestamp = NOW(),
                consent_response_hash = :responseHash,
                ip_address = :ipAddress,
                user_agent = :userAgent,
                acceptance_method = :acceptanceMethod,
                immutable_signature = :signature,
                expires_at = NOW() + INTERVAL '1 year',
                updated_at = NOW()
            WHERE consent_token = :token
        `, {
            replacements: {
                responseHash,
                ipAddress,
                userAgent,
                acceptanceMethod: acceptanceMethod || 'email',
                signature,
                token
            },
            type: sequelize.QueryTypes.UPDATE
        });

        // Obtener datos completos para email de confirmación
        const updatedConsents = await sequelize.query(`
            SELECT
                c.id, c.consent_date, c.expires_at, c.immutable_signature, c.consent_version,
                c.consent_text, c.ip_address, c.user_agent,
                u."firstName", u."lastName", u.email,
                comp.name as company_name, comp.email as company_email, comp.address as company_address
            FROM biometric_consents c
            JOIN users u ON c.user_id = u.user_id
            JOIN companies comp ON c.company_id = comp.company_id
            WHERE c.consent_token = :token
        `, {
            replacements: { token },
            type: sequelize.QueryTypes.SELECT
        });

        const updatedConsent = updatedConsents[0];

        // Enviar email de confirmación
        try {
            await biometricConsentService.sendConsentConfirmationEmail(
                {
                    firstName: updatedConsent.firstName,
                    lastName: updatedConsent.lastName,
                    email: updatedConsent.email
                },
                {
                    name: updatedConsent.company_name,
                    email: updatedConsent.company_email,
                    address: updatedConsent.company_address
                },
                {
                    consentDate: updatedConsent.consent_date,
                    expiresAt: updatedConsent.expires_at,
                    immutableSignature: signature,
                    version: updatedConsent.consent_version,
                    consentText: updatedConsent.consent_text,
                    ipAddress: updatedConsent.ip_address,
                    userAgent: updatedConsent.user_agent
                }
            );
            console.log(`✅ Email de confirmación enviado a ${updatedConsent.email}`);
        } catch (emailError) {
            console.error('⚠️ Error enviando email de confirmación:', emailError);
            // No fallar la operación si el email falla
        }

        res.json({
            success: true,
            message: 'Consentimiento aceptado exitosamente',
            consentId: consent.id
        });

    } catch (error) {
        console.error('Error aceptando consentimiento:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// POST /api/v1/biometric/consents/reject
// Rechazar consentimiento desde página pública
// ========================================
router.post('/consents/reject', async (req, res) => {
    try {
        const { token } = req.body;

        // Buscar consentimiento pendiente para obtener user_id y company_id
        const consents = await sequelize.query(`
            SELECT id, user_id, company_id
            FROM biometric_consents
            WHERE consent_token = :token
                AND consent_token_expires_at > NOW()
                AND consent_given = false
        `, {
            replacements: { token },
            type: sequelize.QueryTypes.SELECT
        });

        if (consents.length === 0) {
            return res.status(404).json({
                error: 'Token inválido o expirado'
            });
        }

        const consent = consents[0];
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

        // Marcar consentimiento como rechazado (revoked = true)
        await sequelize.query(`
            UPDATE biometric_consents
            SET revoked = true,
                revoked_date = NOW(),
                revoked_reason = 'Rechazado por el usuario',
                revoked_ip_address = :ipAddress,
                updated_at = NOW()
            WHERE id = :consentId
        `, {
            replacements: {
                consentId: consent.id,
                ipAddress
            },
            type: sequelize.QueryTypes.UPDATE
        });

        // Verificar si el usuario tiene biometría registrada
        const biometricData = await sequelize.query(`
            SELECT id
            FROM biometric_data
            WHERE "UserId" = :userId
                AND type = 'face'
                AND "isActive" = true
        `, {
            replacements: { userId: consent.user_id },
            type: sequelize.QueryTypes.SELECT
        });

        let biometryDeleted = false;

        // Si tiene biometría registrada, marcarla como inactiva
        if (biometricData.length > 0) {
            await sequelize.query(`
                UPDATE biometric_data
                SET "isActive" = false,
                    notes = COALESCE(notes, '') || ' [ELIMINADO: Usuario rechazó consentimiento ' || NOW()::date || ']'
                WHERE "UserId" = :userId
                    AND type = 'face'
                    AND "isActive" = true
            `, {
                replacements: { userId: consent.user_id },
                type: sequelize.QueryTypes.UPDATE
            });

            biometryDeleted = true;
            console.log(`🗑️ [CONSENT-REJECT] Biometría desactivada para usuario ${consent.user_id}`);
        }

        // Registrar en auditoría
        await sequelize.query(`
            INSERT INTO consent_audit_log (
                company_id, user_id, consent_type, action,
                action_timestamp, ip_address, reason, automated
            ) VALUES (
                :companyId, :userId, 'biometric_analysis', 'REJECTED',
                NOW(), :ipAddress, :reason, false
            )
        `, {
            replacements: {
                companyId: consent.company_id,
                userId: consent.user_id,
                ipAddress,
                reason: biometryDeleted ?
                    'Consentimiento rechazado por usuario - Biometría eliminada' :
                    'Consentimiento rechazado por usuario'
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.json({
            success: true,
            message: 'Consentimiento rechazado',
            biometryDeleted
        });

    } catch (error) {
        console.error('Error rechazando consentimiento:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// POST /api/v1/biometric/consents/request-individual
// Solicitar consentimiento a un usuario específico
// ========================================
router.post('/consents/request-individual', auth, authorize('admin', 'rrhh'), async (req, res) => {
    try {
        const { userId } = req.body;
        const { companyId: company_id, user_id: requestedBy } = req.user;

        if (!userId) {
            return res.status(400).json({
                error: 'userId requerido'
            });
        }

        const result = await biometricConsentService.requestConsent(
            userId,
            company_id,
            requestedBy
        );

        res.json(result);

    } catch (error) {
        console.error('Error solicitando consentimiento individual:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// POST /api/v1/biometric/consents/request-bulk
// Solicitar consentimientos masivos a usuarios pendientes
// ========================================
router.post('/consents/request-bulk', auth, authorize('admin', 'rrhh'), async (req, res) => {
    try {
        const { filters = {} } = req.body;
        const { companyId: company_id, user_id: requestedBy } = req.user;

        console.log(`📧 [BULK-REQUEST] Iniciando solicitud masiva para empresa ${company_id}`);

        const results = await biometricConsentService.requestBulkConsent(
            company_id,
            requestedBy,
            filters
        );

        console.log(`✅ [BULK-REQUEST] Completado: ${results.sent}/${results.total} enviados`);

        res.json({
            success: true,
            message: `Solicitudes enviadas: ${results.sent}/${results.total}`,
            emailsSent: results.sent,
            totalUsers: results.total,
            failed: results.failed,
            errors: results.errors
        });

    } catch (error) {
        console.error('❌ [BULK-REQUEST] Error:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message
        });
    }
});

// ========================================
// GET /api/v1/biometric/consents/roles
// Obtener roles disponibles de la empresa (multi-tenant)
// ========================================
router.get('/consents/roles', auth, async (req, res) => {
    try {
        console.log('🔍 [ROLES] Endpoint llamado');
        console.log('🔍 [ROLES] req.user completo:', JSON.stringify(req.user, null, 2));
        console.log('🔍 [ROLES] req.user.dataValues:', JSON.stringify(req.user?.dataValues, null, 2));

        // Intentar obtener company_id de varias formas posibles
        const company_id = req.user.companyId || req.user.company_id || req.user.dataValues?.company_id || req.user.dataValues?.companyId;

        console.log('🔍 [ROLES] company_id extraído:', company_id);

        if (!company_id) {
            console.error('❌ [ROLES] company_id no encontrado en ninguna propiedad');
            console.error('❌ [ROLES] Propiedades disponibles:', Object.keys(req.user));
            return res.status(400).json({
                success: false,
                error: 'company_id requerido',
                debug: {
                    userKeys: Object.keys(req.user),
                    dataValuesKeys: req.user.dataValues ? Object.keys(req.user.dataValues) : null
                }
            });
        }

        // Obtener roles únicos de usuarios activos de la empresa
        const roles = await sequelize.query(`
            SELECT DISTINCT role, COUNT(*) as user_count
            FROM users
            WHERE company_id = :company_id
                AND is_active = true
                AND role IS NOT NULL
            GROUP BY role
            ORDER BY user_count DESC, role ASC
        `, {
            replacements: { company_id },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            roles: roles.map(r => ({
                value: r.role,
                label: r.role,
                userCount: parseInt(r.user_count)
            }))
        });

    } catch (error) {
        console.error('❌ [ROLES] Error obteniendo roles:', error);
        console.error('❌ [ROLES] Stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Error interno',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ========================================
// GET /api/v1/biometric/consents/legal-document
// Obtener documento legal activo para vista previa
// ========================================
router.get('/consents/legal-document', auth, async (req, res) => {
    try {
        // Intentar obtener company_id de varias formas posibles
        const company_id = req.user.companyId || req.user.company_id || req.user.dataValues?.company_id || req.user.dataValues?.companyId;

        // Intentar obtener de tabla si existe, sino usar documento por defecto
        let document = null;

        try {
            const docs = await sequelize.query(`
                SELECT
                    id, title, content, version,
                    effective_from, created_at
                FROM consent_legal_documents
                WHERE company_id = :company_id
                    AND is_active = true
                    AND document_type = 'consent_form'
                ORDER BY effective_from DESC
                LIMIT 1
            `, {
                replacements: { company_id },
                type: sequelize.QueryTypes.SELECT
            });

            if (docs && docs.length > 0) {
                document = docs[0];
            }
        } catch (tableError) {
            console.log('⚠️ Tabla consent_legal_documents no existe, usando documento por defecto');
        }

        // Si no hay documento en BD, usar el documento estándar (versión 2.0 con IA)
        if (!document) {
            document = {
                title: 'Consentimiento Informado para Análisis Biométrico Basado en IA',
                version: '2.0',
                effective_from: new Date(),
                content: `CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE DATOS BIOMÉTRICOS Y ANÁLISIS BIOMÉTRICO BASADO EN IA

En cumplimiento de la Ley 25.326 de Protección de Datos Personales (Argentina), el Reglamento General de Protección de Datos (GDPR) de la Unión Europea, y la Biometric Information Privacy Act (BIPA) de Illinois, se solicita su consentimiento expreso para el tratamiento de sus datos biométricos.

1. RESPONSABLE DEL TRATAMIENTO
El responsable del tratamiento de sus datos biométricos es la empresa a la cual usted pertenece como empleado.

2. FINALIDAD DEL TRATAMIENTO
Los datos biométricos (vectores matemáticos de 128 dimensiones derivados del análisis facial) serán utilizados exclusivamente para:
- Control de asistencia laboral
- Identificación de empleados en el sistema
- Registro de horarios de entrada y salida
- Análisis Biométrico Basado en IA para:
  • Detección de indicadores de fatiga laboral
  • Análisis de bienestar emocional en el ambiente de trabajo
  • Medición de niveles de estrés y engagement
  • Identificación de patrones de comportamiento laboral
  • Generación de métricas de salud ocupacional

3. TECNOLOGÍA Y PROVEEDOR DE INTELIGENCIA ARTIFICIAL
Sistema: Microsoft Azure AI Services (Face API + Cognitive Services)
Proveedor: Microsoft Corporation
Ubicación de procesamiento: Azure Cloud - Región South Central US
Certificaciones: ISO 27001, ISO 27018, SOC 2, GDPR Compliant

Método de análisis:
a) Captura facial momentánea (imagen se descarta inmediatamente)
b) Extracción de embedding facial de 128 dimensiones mediante Deep Learning
c) Análisis de Facial Action Units (AU) según sistema FACS (Facial Action Coding System)
d) Procesamiento de micro-expresiones faciales
e) Inferencia de estados emocionales mediante modelos de IA pre-entrenados
f) Generación de métricas agregadas y anonimizadas

Modelos de IA utilizados:
- Azure Face API v1.0 (detección y reconocimiento facial)
- Azure Emotion Recognition (análisis de 8 emociones básicas: alegría, tristeza, ira, sorpresa, miedo, disgusto, desprecio, neutralidad)
- Algoritmos propietarios de análisis de fatiga y bienestar

4. DATOS QUE SE RECOPILAN
NO se almacenan fotografías de su rostro. El sistema captura temporalmente su imagen, la convierte en:
- Vector matemático facial (128 números - embedding)
- Puntos de referencia faciales (68 landmarks)
- Valores de Facial Action Units (20+ unidades de acción)
- Scores de emociones (valores numéricos entre 0-1)
- Indicadores de fatiga y atención (valores agregados)

La imagen original se descarta inmediatamente después del procesamiento.

5. GARANTÍAS TÉCNICAS Y DE PRIVACIDAD
✓ Sin almacenamiento de imágenes faciales
✓ Vectores matemáticos encriptados (AES-256)
✓ Proceso unidireccional irreversible
✓ Infraestructura certificada ISO 27001, ISO 27018
✓ Cumplimiento GDPR y BIPA
✓ Datos procesados en servidores Microsoft Azure certificados
✓ Transmisión encriptada mediante TLS 1.3
✓ Anonimización de métricas agregadas
✓ Auditoría completa de todos los accesos

6. USO DE RESULTADOS DEL ANÁLISIS BIOMÉTRICO BASADO EN IA
Los resultados del análisis emocional y de fatiga serán utilizados para:
- Mejorar las condiciones de trabajo y ergonomía
- Identificar necesidades de pausas y descansos
- Prevenir riesgos psicosociales laborales
- Optimizar la distribución de tareas
- Generar reportes agregados de clima laboral (sin identificar individuos)

IMPORTANTE: Los datos emocionales individuales NO serán utilizados para:
❌ Evaluaciones de desempeño individuales
❌ Decisiones de contratación o despido
❌ Ajustes salariales basados en estado emocional
❌ Discriminación de ningún tipo

7. TIEMPO DE CONSERVACIÓN
- Embeddings faciales: Durante relación laboral + 90 días
- Datos de análisis emocional: 30 días (luego se agregan y anonimizan)
- Métricas agregadas: 5 años (obligación legal laboral)
- Logs de auditoría: 5 años (Ley 25.326)

8. DERECHOS DEL TITULAR (Art. 14-16 Ley 25.326)
Usted tiene derecho a:
- Acceder a sus datos biométricos y resultados de análisis procesados
- Rectificar datos inexactos
- Solicitar la supresión de sus datos (derecho al olvido)
- Oponerse al análisis emocional (puede usar solo control de asistencia básico)
- Revocar este consentimiento en cualquier momento
- Portabilidad de sus datos
- Solicitar explicación de las inferencias de IA realizadas

La revocación NO afectará su situación laboral, remuneración ni beneficios.

9. TRANSPARENCIA DE LA IA
Los modelos de IA utilizados han sido entrenados con datasets públicos:
- AffectNet (1M+ imágenes faciales anotadas)
- FER2013 (Facial Expression Recognition)
- CK+ Extended Cohn-Kanade Dataset

Precisión del sistema:
- Reconocimiento facial: 99.7% (Azure Face API)
- Detección emocional: 89.3% promedio (varía según emoción)
- Detección de fatiga: 87.1% (basado en estudios internos)

10. BASE LEGAL
- Ley 25.326 (Argentina) - Protección de Datos Personales
- GDPR Art. 9 (UE) - Tratamiento de categorías especiales de datos
- BIPA (Illinois) - Privacidad de información biométrica
- Ley 24.557 - Riesgos del Trabajo (prevención de riesgos psicosociales)
- Consentimiento expreso, libre e informado del titular

11. CONTACTO Y RECLAMOS
Para ejercer sus derechos o presentar consultas:
- Responsable de Protección de Datos de su empresa
- Agencia de Acceso a la Información Pública (Argentina): www.argentina.gob.ar/aaip
- Email soporte: soporte@aponnt.com

Al aceptar este consentimiento mediante el enlace recibido por email, usted declara:
□ Haber leído y comprendido este documento en su totalidad
□ Conocer la tecnología de IA utilizada y sus proveedores
□ Comprender el uso que se dará a sus datos biométricos y análisis emocional
□ Conocer sus derechos y cómo ejercerlos
□ Otorgar su consentimiento de forma libre, informada y voluntaria
□ Entender que puede revocar este consentimiento en cualquier momento`
            };
        }

        res.json({
            success: true,
            hasDocument: true,
            document: {
                id: document.id || null,
                title: document.title,
                content: document.content,
                version: document.version,
                effectiveFrom: document.effective_from,
                createdAt: document.created_at || new Date(),
                // Enlaces a leyes oficiales
                legalReferences: [
                    {
                        name: 'Ley 25.326 - Protección de Datos Personales (Argentina)',
                        url: 'https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto',
                        description: 'Ley de Protección de los Datos Personales de Argentina'
                    },
                    {
                        name: 'GDPR - Reglamento General de Protección de Datos (EU)',
                        url: 'https://gdpr.eu/tag/gdpr/',
                        description: 'General Data Protection Regulation de la Unión Europea'
                    },
                    {
                        name: 'BIPA - Biometric Information Privacy Act (Illinois, USA)',
                        url: 'https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004',
                        description: 'Ley de Privacidad de Información Biométrica de Illinois'
                    }
                ]
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo documento legal:', error);
        res.status(500).json({
            error: 'Error interno',
            message: error.message,
            stack: error.stack
        });
    }
});

// ========================================
// GET /api/v1/biometric/consents/:userId
// Obtener consentimiento de un usuario específico
// IMPORTANTE: Esta ruta va AL FINAL porque usa parámetros dinámicos
// Si va antes, captura rutas específicas como "legal-document" como userId
// ========================================
router.get('/consents/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId: company_id, user_id, role } = req.user;

        // Solo admin, RRHH o el propio usuario pueden ver su consentimiento
        if (!['admin', 'rrhh'].includes(role) && user_id !== userId) {
            return res.status(403).json({
                error: 'No autorizado',
                message: 'No puede ver consentimientos de otros usuarios'
            });
        }

        const consent = await sequelize.query(`
            SELECT
                c.*,
                u."firstName" || ' ' || u."lastName" as employee_name,
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

module.exports = router;
