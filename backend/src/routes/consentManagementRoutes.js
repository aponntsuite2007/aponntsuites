const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const ConsentService = require('../services/ConsentService');

/**
 * 📋 CONSENT MANAGEMENT ROUTES
 *
 * PUBLIC ROUTES:
 * - GET /api/consents/for-role/:role - Get consents for specific role
 *
 * PROTECTED ROUTES:
 * - GET /api/consents/pending/:userId/:userType - Get pending consents
 * - POST /api/consents/accept - Accept consent
 * - POST /api/consents/reject - Reject consent
 * - POST /api/consents/revoke - Revoke previously accepted consent
 * - GET /api/consents/history/:userId/:userType - Get consent history
 *
 * ADMIN ROUTES:
 * - POST /api/consents/definitions - Create consent definition
 * - PUT /api/consents/definitions/:consentId - Update consent definition
 * - GET /api/consents/stats - Get consent statistics
 */

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate user role
 */
const VALID_ROLES = ['employee', 'vendor', 'leader', 'supervisor', 'partner', 'admin'];
const isValidRole = (role) => {
  return VALID_ROLES.includes(role);
};

/**
 * Validate consent category
 */
const VALID_CATEGORIES = [
  'data_privacy',
  'biometric_data',
  'medical_data',
  'location_tracking',
  'communication',
  'marketing',
  'third_party_sharing',
  'terms_of_service',
  'other'
];
const isValidCategory = (category) => {
  return VALID_CATEGORIES.includes(category);
};

/**
 * Validate UUID format
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Extract metadata from request
 */
const extractMetadata = (req, additionalData = {}) => {
  return {
    ip_address: req.ip || req.connection.remoteAddress || 'unknown',
    user_agent: req.get('user-agent') || 'Unknown',
    timestamp: new Date(),
    ...additionalData
  };
};

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * GET /api/consents/for-role/:role
 * Get all consent definitions applicable to a specific role
 *
 * Params: role (employee, vendor, leader, etc.)
 * Returns: { success, consents: [] }
 */
router.get('/for-role/:role', async (req, res) => {
  try {
    const { role } = req.params;

    console.log('📋 [CONSENTS] Obteniendo consentimientos para rol:', role);

    // Validation
    if (!isValidRole(role)) {
      return res.status(400).json({
        error: 'Rol inválido',
        details: {
          valid_roles: VALID_ROLES,
          received: role
        }
      });
    }

    // Get consents for role
    const result = await ConsentService.getConsentsForRole(role);

    if (!result.success) {
      console.log('❌ [CONSENTS] Error al obtener consentimientos:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [CONSENTS] Consentimientos obtenidos:', result.consents?.length || 0);

    return res.status(200).json({
      success: true,
      data: {
        role,
        consents: result.consents,
        count: result.consents?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ [CONSENTS] Error al obtener consentimientos:', error);
    return res.status(500).json({
      error: 'Error interno al obtener consentimientos',
      details: { message: error.message }
    });
  }
});

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

/**
 * GET /api/consents/pending/:userId/:userType
 * Get pending consents for a user
 *
 * Params: userId, userType
 * Returns: { success, pending_consents: [], required_count }
 */
router.get('/pending/:userId/:userType', auth, async (req, res) => {
  try {
    const { userId, userType } = req.params;

    console.log('📋 [CONSENTS] Obteniendo consentimientos pendientes:', {
      userId,
      userType
    });

    // Validation
    if (!isValidRole(userType)) {
      return res.status(400).json({
        error: 'Tipo de usuario inválido',
        details: {
          valid_types: VALID_ROLES,
          received: userType
        }
      });
    }

    // Get pending consents
    const result = await ConsentService.getPendingConsents(userId, userType);

    if (!result.success) {
      console.log('❌ [CONSENTS] Error al obtener pendientes:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [CONSENTS] Pendientes obtenidos:', {
      total: result.pending_consents?.length || 0,
      required: result.required_count || 0
    });

    return res.status(200).json({
      success: true,
      data: {
        pending_consents: result.pending_consents,
        required_count: result.required_count,
        optional_count: (result.pending_consents?.length || 0) - (result.required_count || 0)
      }
    });

  } catch (error) {
    console.error('❌ [CONSENTS] Error al obtener pendientes:', error);
    return res.status(500).json({
      error: 'Error interno al obtener consentimientos pendientes',
      details: { message: error.message }
    });
  }
});

/**
 * POST /api/consents/accept
 * Accept a consent
 *
 * Body: { user_id, user_type, consent_id, signature_data }
 * Returns: { success, message, consent_acceptance_id }
 */
router.post('/accept', auth, async (req, res) => {
  try {
    const { user_id, user_type, consent_id, signature_data } = req.body;

    console.log('📋 [CONSENTS] Aceptando consentimiento...', {
      user_id,
      user_type,
      consent_id
    });

    // Validation
    if (!user_id || !user_type || !consent_id) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        details: {
          required: ['user_id', 'user_type', 'consent_id'],
          received: { user_id: !!user_id, user_type: !!user_type, consent_id: !!consent_id }
        }
      });
    }

    if (!isValidRole(user_type)) {
      return res.status(400).json({
        error: 'Tipo de usuario inválido',
        details: {
          valid_types: VALID_ROLES,
          received: user_type
        }
      });
    }

    if (!isValidUUID(consent_id)) {
      return res.status(400).json({
        error: 'ID de consentimiento inválido',
        details: { expected: 'UUID format', received: consent_id }
      });
    }

    // Extract metadata
    const metadata = extractMetadata(req, {
      signature_data: signature_data || null
    });

    // Accept consent
    const result = await ConsentService.acceptConsent(
      user_id,
      user_type,
      consent_id,
      metadata
    );

    if (!result.success) {
      console.log('❌ [CONSENTS] Error al aceptar:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [CONSENTS] Consentimiento aceptado:', result.consent_acceptance_id);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        consent_acceptance_id: result.consent_acceptance_id,
        accepted_at: result.accepted_at
      }
    });

  } catch (error) {
    console.error('❌ [CONSENTS] Error al aceptar consentimiento:', error);
    return res.status(500).json({
      error: 'Error interno al aceptar consentimiento',
      details: { message: error.message }
    });
  }
});

/**
 * POST /api/consents/reject
 * Reject a consent
 *
 * Body: { user_id, user_type, consent_id, reason }
 * Returns: { success, message, warning_if_required }
 */
router.post('/reject', auth, async (req, res) => {
  try {
    const { user_id, user_type, consent_id, reason } = req.body;

    console.log('📋 [CONSENTS] Rechazando consentimiento...', {
      user_id,
      user_type,
      consent_id
    });

    // Validation
    if (!user_id || !user_type || !consent_id) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        details: {
          required: ['user_id', 'user_type', 'consent_id'],
          received: { user_id: !!user_id, user_type: !!user_type, consent_id: !!consent_id }
        }
      });
    }

    if (!isValidRole(user_type)) {
      return res.status(400).json({
        error: 'Tipo de usuario inválido',
        details: {
          valid_types: VALID_ROLES,
          received: user_type
        }
      });
    }

    if (!isValidUUID(consent_id)) {
      return res.status(400).json({
        error: 'ID de consentimiento inválido',
        details: { expected: 'UUID format', received: consent_id }
      });
    }

    // Extract metadata
    const metadata = extractMetadata(req);

    // Reject consent
    const result = await ConsentService.rejectConsent(
      user_id,
      user_type,
      consent_id,
      reason || 'Usuario rechazó el consentimiento',
      metadata
    );

    if (!result.success) {
      console.log('❌ [CONSENTS] Error al rechazar:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [CONSENTS] Consentimiento rechazado');

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        warning: result.warning || null,
        is_required: result.is_required || false
      }
    });

  } catch (error) {
    console.error('❌ [CONSENTS] Error al rechazar consentimiento:', error);
    return res.status(500).json({
      error: 'Error interno al rechazar consentimiento',
      details: { message: error.message }
    });
  }
});

/**
 * POST /api/consents/revoke
 * Revoke a previously accepted consent
 *
 * Body: { user_id, user_type, consent_id, reason }
 * Returns: { success, message }
 */
router.post('/revoke', auth, async (req, res) => {
  try {
    const { user_id, user_type, consent_id, reason } = req.body;

    console.log('📋 [CONSENTS] Revocando consentimiento...', {
      user_id,
      user_type,
      consent_id
    });

    // Validation
    if (!user_id || !user_type || !consent_id) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        details: {
          required: ['user_id', 'user_type', 'consent_id'],
          received: { user_id: !!user_id, user_type: !!user_type, consent_id: !!consent_id }
        }
      });
    }

    if (!isValidRole(user_type)) {
      return res.status(400).json({
        error: 'Tipo de usuario inválido',
        details: {
          valid_types: VALID_ROLES,
          received: user_type
        }
      });
    }

    if (!isValidUUID(consent_id)) {
      return res.status(400).json({
        error: 'ID de consentimiento inválido',
        details: { expected: 'UUID format', received: consent_id }
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Se requiere una razón para revocar el consentimiento',
        details: { field: 'reason' }
      });
    }

    // Extract metadata
    const metadata = extractMetadata(req);

    // Revoke consent
    const result = await ConsentService.revokeConsent(
      user_id,
      user_type,
      consent_id,
      reason,
      metadata
    );

    if (!result.success) {
      console.log('❌ [CONSENTS] Error al revocar:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [CONSENTS] Consentimiento revocado');

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        revoked_at: result.revoked_at
      }
    });

  } catch (error) {
    console.error('❌ [CONSENTS] Error al revocar consentimiento:', error);
    return res.status(500).json({
      error: 'Error interno al revocar consentimiento',
      details: { message: error.message }
    });
  }
});

/**
 * GET /api/consents/history/:userId/:userType
 * Get complete consent history for a user
 *
 * Params: userId, userType
 * Returns: { success, history: [], summary: {} }
 */
router.get('/history/:userId/:userType', auth, async (req, res) => {
  try {
    const { userId, userType } = req.params;

    console.log('📋 [CONSENTS] Obteniendo historial:', {
      userId,
      userType
    });

    // Validation
    if (!isValidRole(userType)) {
      return res.status(400).json({
        error: 'Tipo de usuario inválido',
        details: {
          valid_types: VALID_ROLES,
          received: userType
        }
      });
    }

    // Get consent history
    const result = await ConsentService.getUserConsentHistory(userId, userType);

    if (!result.success) {
      console.log('❌ [CONSENTS] Error al obtener historial:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [CONSENTS] Historial obtenido:', {
      total_records: result.history?.length || 0
    });

    return res.status(200).json({
      success: true,
      data: {
        history: result.history,
        summary: result.summary
      }
    });

  } catch (error) {
    console.error('❌ [CONSENTS] Error al obtener historial:', error);
    return res.status(500).json({
      error: 'Error interno al obtener historial',
      details: { message: error.message }
    });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * POST /api/consents/definitions
 * Create a new consent definition
 * Admin only
 *
 * Body: {
 *   consent_key,
 *   title,
 *   description,
 *   full_text,
 *   applicable_roles,
 *   is_required,
 *   category
 * }
 * Returns: { success, consent_id }
 */
router.post('/definitions', auth, adminOnly, async (req, res) => {
  try {
    const {
      consent_key,
      title,
      description,
      full_text,
      applicable_roles,
      is_required,
      category
    } = req.body;

    console.log('📋 [CONSENTS] Creando definición de consentimiento... (Admin)');

    // Validation
    if (!consent_key || !title || !description || !full_text || !applicable_roles || !category) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        details: {
          required: ['consent_key', 'title', 'description', 'full_text', 'applicable_roles', 'category'],
          received: {
            consent_key: !!consent_key,
            title: !!title,
            description: !!description,
            full_text: !!full_text,
            applicable_roles: !!applicable_roles,
            category: !!category
          }
        }
      });
    }

    if (!Array.isArray(applicable_roles) || applicable_roles.length === 0) {
      return res.status(400).json({
        error: 'applicable_roles debe ser un array no vacío',
        details: { received: applicable_roles }
      });
    }

    // Validate all roles
    const invalidRoles = applicable_roles.filter(role => !isValidRole(role));
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        error: 'Roles inválidos en applicable_roles',
        details: {
          valid_roles: VALID_ROLES,
          invalid_roles: invalidRoles
        }
      });
    }

    if (!isValidCategory(category)) {
      return res.status(400).json({
        error: 'Categoría inválida',
        details: {
          valid_categories: VALID_CATEGORIES,
          received: category
        }
      });
    }

    // Create consent definition
    const consentData = {
      consent_key,
      title,
      description,
      full_text,
      applicable_roles,
      is_required: is_required !== false, // Default to true
      category
    };

    const result = await ConsentService.createConsentDefinition(consentData);

    if (!result.success) {
      console.log('❌ [CONSENTS] Error al crear definición:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [CONSENTS] Definición creada:', result.consent_id);

    return res.status(201).json({
      success: true,
      message: result.message,
      data: {
        consent_id: result.consent_id
      }
    });

  } catch (error) {
    console.error('❌ [CONSENTS] Error al crear definición:', error);
    return res.status(500).json({
      error: 'Error interno al crear definición de consentimiento',
      details: { message: error.message }
    });
  }
});

/**
 * PUT /api/consents/definitions/:consentId
 * Update a consent definition (creates new version)
 * Admin only
 *
 * Body: { updates } (any fields to update)
 * Returns: { success, new_version }
 */
router.put('/definitions/:consentId', auth, adminOnly, async (req, res) => {
  try {
    const { consentId } = req.params;
    const updates = req.body;

    console.log('📋 [CONSENTS] Actualizando definición... (Admin):', consentId);

    // Validation
    if (!isValidUUID(consentId)) {
      return res.status(400).json({
        error: 'ID de consentimiento inválido',
        details: { expected: 'UUID format', received: consentId }
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No se proporcionaron actualizaciones',
        details: { received: updates }
      });
    }

    // Validate applicable_roles if provided
    if (updates.applicable_roles) {
      if (!Array.isArray(updates.applicable_roles)) {
        return res.status(400).json({
          error: 'applicable_roles debe ser un array',
          details: { received: updates.applicable_roles }
        });
      }

      const invalidRoles = updates.applicable_roles.filter(role => !isValidRole(role));
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          error: 'Roles inválidos en applicable_roles',
          details: {
            valid_roles: VALID_ROLES,
            invalid_roles: invalidRoles
          }
        });
      }
    }

    // Validate category if provided
    if (updates.category && !isValidCategory(updates.category)) {
      return res.status(400).json({
        error: 'Categoría inválida',
        details: {
          valid_categories: VALID_CATEGORIES,
          received: updates.category
        }
      });
    }

    // Update consent definition
    const result = await ConsentService.updateConsentDefinition(consentId, updates);

    if (!result.success) {
      console.log('❌ [CONSENTS] Error al actualizar definición:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [CONSENTS] Definición actualizada, nueva versión:', result.new_version);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        new_version: result.new_version
      }
    });

  } catch (error) {
    console.error('❌ [CONSENTS] Error al actualizar definición:', error);
    return res.status(500).json({
      error: 'Error interno al actualizar definición',
      details: { message: error.message }
    });
  }
});

/**
 * GET /api/consents/stats
 * Get global consent statistics
 * Admin only
 *
 * Returns: { success, global_stats, by_category }
 */
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    console.log('📋 [CONSENTS] Obteniendo estadísticas globales... (Admin)');

    // Get consent stats
    const result = await ConsentService.getConsentStats();

    if (!result.success) {
      console.log('❌ [CONSENTS] Error al obtener estadísticas:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [CONSENTS] Estadísticas obtenidas');

    return res.status(200).json({
      success: true,
      data: {
        global_stats: result.global_stats,
        by_category: result.by_category
      }
    });

  } catch (error) {
    console.error('❌ [CONSENTS] Error al obtener estadísticas:', error);
    return res.status(500).json({
      error: 'Error interno al obtener estadísticas',
      details: { message: error.message }
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/consents/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Consent Management API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
