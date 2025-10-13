/**
 * ⚖️ RUTAS API: CONSENT MANAGEMENT
 * ================================
 * Endpoints para gestión de consentimientos legales
 */

const express = require('express');
const router = express.Router();
const consentManagementService = require('../services/consent-management-service');
const BiometricConsent = require('../models/BiometricConsent');

/**
 * POST /api/v1/consent/request
 * Solicitar consentimiento
 */
router.post('/request', async (req, res) => {
  try {
    const { userId, companyId, consentType } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await consentManagementService.requestConsent({
      userId,
      companyId,
      consentType,
      ipAddress,
      userAgent
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [CONSENT-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'REQUEST_ERROR',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/consent/grant
 * Otorgar consentimiento
 */
router.post('/grant', async (req, res) => {
  try {
    const { userId, companyId, consentType, consentText } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Calcular expiración (90 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Guardar en BD
    const consent = await BiometricConsent.create({
      companyId,
      userId,
      consentType,
      consentGiven: true,
      consentDate: new Date(),
      consentText,
      consentVersion: '1.0',
      ipAddress,
      userAgent,
      acceptanceMethod: 'web',
      revoked: false,
      expiresAt
    });

    // Log en servicio
    await consentManagementService.grantConsent({
      userId,
      companyId,
      consentType,
      ipAddress,
      userAgent,
      acceptedAt: consent.consentDate
    });

    res.json({
      success: true,
      message: 'Consentimiento registrado exitosamente',
      consentId: consent.id,
      expiresAt: consent.expiresAt
    });

  } catch (error) {
    console.error('❌ [CONSENT-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'GRANT_ERROR',
      message: error.message
    });
  }
});

/**
 * DELETE /api/v1/consent/revoke
 * Revocar consentimiento
 */
router.delete('/revoke', async (req, res) => {
  try {
    const { userId, companyId, consentType, reason } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Marcar como revocado en BD
    await BiometricConsent.update(
      {
        revoked: true,
        revokedDate: new Date(),
        revokedReason: reason,
        revokedIpAddress: ipAddress
      },
      {
        where: {
          userId,
          companyId,
          consentType,
          revoked: false
        }
      }
    );

    // Procesar revocación (eliminar datos asociados)
    await consentManagementService.revokeConsent({
      userId,
      companyId,
      consentType,
      reason,
      ipAddress
    });

    res.json({
      success: true,
      message: 'Consentimiento revocado exitosamente',
      dataDeleted: true
    });

  } catch (error) {
    console.error('❌ [CONSENT-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'REVOKE_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/consent/check/:userId/:consentType
 * Verificar si usuario tiene consentimiento activo
 */
router.get('/check/:userId/:consentType', async (req, res) => {
  try {
    const { userId, consentType } = req.params;
    const { companyId } = req.query;

    const consent = await BiometricConsent.findOne({
      where: {
        userId,
        companyId,
        consentType,
        revoked: false
      },
      order: [['consentDate', 'DESC']]
    });

    const hasConsent = consent && (!consent.expiresAt || consent.expiresAt > new Date());

    res.json({
      success: true,
      hasConsent,
      consent: hasConsent ? {
        consentId: consent.id,
        consentDate: consent.consentDate,
        expiresAt: consent.expiresAt
      } : null
    });

  } catch (error) {
    console.error('❌ [CONSENT-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'CHECK_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/consent/user/:userId
 * Obtener todos los consentimientos de un usuario
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId } = req.query;

    const consents = await BiometricConsent.findAll({
      where: {
        userId,
        companyId
      },
      order: [['consentDate', 'DESC']]
    });

    res.json({
      success: true,
      count: consents.length,
      consents
    });

  } catch (error) {
    console.error('❌ [CONSENT-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'QUERY_ERROR',
      message: error.message
    });
  }
});

module.exports = router;
