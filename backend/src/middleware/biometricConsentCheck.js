/**
 * 🔐 MIDDLEWARE: BIOMETRIC CONSENT CHECK
 * =======================================
 * Valida que el usuario tenga consentimiento biométrico activo
 * antes de permitir operaciones biométricas.
 *
 * Cumplimiento legal:
 * - Argentina: Ley 25.326 (Protección de Datos Personales)
 * - EU: GDPR (Art. 9 - Datos biométricos)
 * - USA: BIPA (Illinois), CCPA (California)
 *
 * Uso:
 *   router.post('/face-register', requireBiometricConsent, controller);
 *   router.post('/clock-in', optionalBiometricConsent, controller);
 */

const { Op } = require('sequelize');
const BiometricConsent = require('../models/BiometricConsent');

/**
 * Constantes de tipos de consentimiento
 */
const CONSENT_TYPES = {
    BIOMETRIC_ANALYSIS: 'biometric_analysis',
    EMOTIONAL_ANALYSIS: 'emotional_analysis',
    FACIAL_RECOGNITION: 'facial_recognition',
    FINGERPRINT: 'fingerprint',
    VOICE_BIOMETRIC: 'voice_biometric'
};

/**
 * Códigos de error estandarizados
 */
const CONSENT_ERROR_CODES = {
    NOT_FOUND: 'CONSENT_NOT_FOUND',
    EXPIRED: 'CONSENT_EXPIRED',
    REVOKED: 'CONSENT_REVOKED',
    REJECTED: 'CONSENT_REJECTED',
    REQUIRED: 'CONSENT_REQUIRED'
};

/**
 * Obtiene el userId desde diferentes fuentes del request
 */
function extractUserId(req) {
    // Prioridad: user autenticado > body > params > query
    return req.user?.user_id ||
           req.user?.userId ||
           req.body?.userId ||
           req.body?.user_id ||
           req.params?.userId ||
           req.params?.user_id ||
           req.query?.userId ||
           req.query?.user_id;
}

/**
 * Obtiene el companyId desde diferentes fuentes del request
 */
function extractCompanyId(req) {
    return req.user?.company_id ||
           req.user?.companyId ||
           req.body?.companyId ||
           req.body?.company_id ||
           req.params?.companyId ||
           req.query?.companyId;
}

/**
 * Verifica si existe un consentimiento válido
 */
async function checkConsentStatus(userId, companyId, consentType = CONSENT_TYPES.BIOMETRIC_ANALYSIS) {
    if (!userId) {
        return {
            hasConsent: false,
            errorCode: CONSENT_ERROR_CODES.REQUIRED,
            message: 'No se pudo identificar al usuario'
        };
    }

    try {
        const consent = await BiometricConsent.findOne({
            where: {
                userId: userId,
                ...(companyId && { companyId: companyId }),
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

        if (!consent) {
            // Verificar si existe pero fue rechazado o revocado
            const existingConsent = await BiometricConsent.findOne({
                where: {
                    userId: userId,
                    ...(companyId && { companyId: companyId }),
                    consentType: consentType
                },
                order: [['consentDate', 'DESC']]
            });

            if (existingConsent) {
                if (existingConsent.revoked) {
                    return {
                        hasConsent: false,
                        errorCode: CONSENT_ERROR_CODES.REVOKED,
                        message: 'El consentimiento biométrico fue revocado',
                        revokedDate: existingConsent.revokedDate,
                        revokedReason: existingConsent.revokedReason
                    };
                }
                if (!existingConsent.consentGiven) {
                    return {
                        hasConsent: false,
                        errorCode: CONSENT_ERROR_CODES.REJECTED,
                        message: 'El usuario rechazó el consentimiento biométrico',
                        rejectedDate: existingConsent.consentDate
                    };
                }
                if (existingConsent.expiresAt && existingConsent.expiresAt < new Date()) {
                    return {
                        hasConsent: false,
                        errorCode: CONSENT_ERROR_CODES.EXPIRED,
                        message: 'El consentimiento biométrico ha expirado',
                        expiredDate: existingConsent.expiresAt
                    };
                }
            }

            return {
                hasConsent: false,
                errorCode: CONSENT_ERROR_CODES.NOT_FOUND,
                message: 'No se encontró consentimiento biométrico para este usuario'
            };
        }

        return {
            hasConsent: true,
            consent: {
                id: consent.id,
                consentDate: consent.consentDate,
                consentVersion: consent.consentVersion,
                expiresAt: consent.expiresAt,
                consentType: consent.consentType
            }
        };

    } catch (error) {
        console.error('[BiometricConsentCheck] Error verificando consentimiento:', error);
        return {
            hasConsent: false,
            errorCode: 'INTERNAL_ERROR',
            message: 'Error al verificar el consentimiento biométrico'
        };
    }
}

/**
 * MIDDLEWARE: Requiere consentimiento biométrico (BLOQUEA si no tiene)
 *
 * Uso: router.post('/face-register', requireBiometricConsent, handler);
 */
async function requireBiometricConsent(req, res, next) {
    const userId = extractUserId(req);
    const companyId = extractCompanyId(req);

    console.log(`[BiometricConsent] Verificando consent para user=${userId}, company=${companyId}`);

    const result = await checkConsentStatus(userId, companyId);

    if (!result.hasConsent) {
        console.log(`[BiometricConsent] BLOQUEADO: ${result.errorCode} - ${result.message}`);
        return res.status(403).json({
            success: false,
            error: result.errorCode,
            message: result.message,
            details: {
                userId,
                consentRequired: true,
                requestConsentUrl: `/api/v1/biometric/consents/request?userId=${userId}`,
                ...(result.revokedDate && { revokedDate: result.revokedDate }),
                ...(result.rejectedDate && { rejectedDate: result.rejectedDate }),
                ...(result.expiredDate && { expiredDate: result.expiredDate })
            },
            legal: {
                regulation: 'Ley 25.326 (Argentina) / GDPR (EU)',
                requirement: 'Se requiere consentimiento explícito para procesamiento de datos biométricos'
            }
        });
    }

    // Adjuntar información del consentimiento al request
    req.biometricConsent = result.consent;
    console.log(`[BiometricConsent] PERMITIDO: consent válido hasta ${result.consent.expiresAt || 'sin vencimiento'}`);
    next();
}

/**
 * MIDDLEWARE: Consentimiento biométrico opcional (NO BLOQUEA, pero registra)
 *
 * Uso para operaciones que pueden funcionar sin biometría
 * pero que necesitan saber el estado del consentimiento.
 */
async function optionalBiometricConsent(req, res, next) {
    const userId = extractUserId(req);
    const companyId = extractCompanyId(req);

    const result = await checkConsentStatus(userId, companyId);

    req.biometricConsent = result.hasConsent ? result.consent : null;
    req.biometricConsentStatus = result;

    next();
}

/**
 * MIDDLEWARE: Requiere consentimiento de análisis emocional
 */
async function requireEmotionalConsent(req, res, next) {
    const userId = extractUserId(req);
    const companyId = extractCompanyId(req);

    const result = await checkConsentStatus(userId, companyId, CONSENT_TYPES.EMOTIONAL_ANALYSIS);

    if (!result.hasConsent) {
        return res.status(403).json({
            success: false,
            error: result.errorCode,
            message: 'Se requiere consentimiento para análisis emocional',
            details: {
                userId,
                consentType: CONSENT_TYPES.EMOTIONAL_ANALYSIS,
                consentRequired: true
            }
        });
    }

    req.emotionalConsent = result.consent;
    next();
}

/**
 * MIDDLEWARE FACTORY: Crea middleware para cualquier tipo de consentimiento
 */
function requireConsentType(consentType) {
    return async (req, res, next) => {
        const userId = extractUserId(req);
        const companyId = extractCompanyId(req);

        const result = await checkConsentStatus(userId, companyId, consentType);

        if (!result.hasConsent) {
            return res.status(403).json({
                success: false,
                error: result.errorCode,
                message: `Se requiere consentimiento de tipo: ${consentType}`,
                details: {
                    userId,
                    consentType,
                    consentRequired: true
                }
            });
        }

        req[`${consentType}Consent`] = result.consent;
        next();
    };
}

/**
 * Utilidad para verificar consentimiento desde código (no middleware)
 */
async function hasValidConsent(userId, companyId, consentType = CONSENT_TYPES.BIOMETRIC_ANALYSIS) {
    const result = await checkConsentStatus(userId, companyId, consentType);
    return result.hasConsent;
}

/**
 * Obtiene lista de usuarios CON consentimiento válido
 * (útil para filtrar estadísticas)
 */
async function getUsersWithValidConsent(companyId, consentType = CONSENT_TYPES.BIOMETRIC_ANALYSIS) {
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
        console.error('[BiometricConsentCheck] Error obteniendo usuarios con consent:', error);
        return [];
    }
}

/**
 * Obtiene lista de usuarios SIN consentimiento válido
 * (útil para advertencias en estadísticas)
 */
async function getUsersWithoutValidConsent(companyId, allUserIds, consentType = CONSENT_TYPES.BIOMETRIC_ANALYSIS) {
    const usersWithConsent = await getUsersWithValidConsent(companyId, consentType);
    const usersWithConsentSet = new Set(usersWithConsent.map(id => String(id)));

    return allUserIds.filter(id => !usersWithConsentSet.has(String(id)));
}

module.exports = {
    // Middlewares
    requireBiometricConsent,
    optionalBiometricConsent,
    requireEmotionalConsent,
    requireConsentType,

    // Utilidades
    checkConsentStatus,
    hasValidConsent,
    getUsersWithValidConsent,
    getUsersWithoutValidConsent,
    extractUserId,
    extractCompanyId,

    // Constantes
    CONSENT_TYPES,
    CONSENT_ERROR_CODES
};
