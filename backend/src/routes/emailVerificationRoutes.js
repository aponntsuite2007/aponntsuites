const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const EmailVerificationService = require('../services/EmailVerificationService');
const ConsentService = require('../services/ConsentService');

/**
 * 📧 EMAIL VERIFICATION ROUTES
 *
 * PUBLIC ROUTES:
 * - POST /api/email-verification/verify - Verify token from email
 * - GET /api/email-verification/verify/:token - Alternative URL-based verification
 *
 * PROTECTED ROUTES:
 * - POST /api/email-verification/send - Send verification email
 * - POST /api/email-verification/resend - Resend verification email
 * - GET /api/email-verification/status/:userId/:userType - Check verification status
 *
 * ADMIN ROUTES:
 * - DELETE /api/email-verification/cleanup - Cleanup expired tokens
 */

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate user type
 */
const VALID_USER_TYPES = ['employee', 'vendor', 'leader', 'supervisor', 'partner', 'admin'];
const isValidUserType = (userType) => {
  return VALID_USER_TYPES.includes(userType);
};

/**
 * Validate token format (64-character hex string)
 */
const isValidToken = (token) => {
  const tokenRegex = /^[a-f0-9]{64}$/i;
  return tokenRegex.test(token);
};

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * POST /api/email-verification/verify
 * Verify email token (from email link or manual submission)
 *
 * Body: { token: string }
 * Returns: { success, message, user_type, email }
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    console.log('📧 [EMAIL-VERIFICATION] Verificando token...');

    // Validation
    if (!token) {
      return res.status(400).json({
        error: 'Token es requerido',
        details: { field: 'token' }
      });
    }

    if (!isValidToken(token)) {
      return res.status(400).json({
        error: 'Formato de token inválido',
        details: { expected: '64-character hex string' }
      });
    }

    // Verify token
    const result = await EmailVerificationService.verifyToken(token);

    if (!result.success) {
      console.log('❌ [EMAIL-VERIFICATION] Verificación fallida:', result.message || result.error);
      return res.status(400).json({
        error: result.error || result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [EMAIL-VERIFICATION] Email verificado exitosamente:', {
      user_type: result.userType,
      email: result.email
    });

    return res.status(200).json({
      success: true,
      message: '✅ Email verificado exitosamente. Su cuenta ha sido ACTIVADA. Ya puede iniciar sesión.',
      can_login: true,
      data: {
        user_type: result.userType,
        email: result.email,
        verified_at: result.verifiedAt,
        account_activated: true
      }
    });

  } catch (error) {
    console.error('❌ [EMAIL-VERIFICATION] Error al verificar token:', error);
    return res.status(500).json({
      error: 'Error interno al verificar email',
      details: { message: error.message }
    });
  }
});

/**
 * GET /api/email-verification/verify/:token
 * Alternative verification endpoint for URL clicks
 * Redirects to success/error page after verification
 *
 * Params: token (string)
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    console.log('📧 [EMAIL-VERIFICATION] Verificación vía URL...');

    // Validation
    if (!isValidToken(token)) {
      console.log('❌ [EMAIL-VERIFICATION] Token inválido en URL');
      // Redirect to error page
      return res.redirect(`/verification-error.html?reason=invalid_token`);
    }

    // Verify token
    const result = await EmailVerificationService.verifyToken(token);

    if (!result.success) {
      console.log('❌ [EMAIL-VERIFICATION] Verificación fallida (URL):', result.message);
      const reason = result.message.includes('expirado') ? 'expired' :
                     result.message.includes('usado') ? 'already_used' : 'invalid';
      return res.redirect(`/verification-error.html?reason=${reason}`);
    }

    console.log('✅ [EMAIL-VERIFICATION] Email verificado (URL):', result.email);

    // Redirect to success page
    return res.redirect(`/verification-success.html?email=${encodeURIComponent(result.email)}`);

  } catch (error) {
    console.error('❌ [EMAIL-VERIFICATION] Error al verificar (URL):', error);
    return res.redirect(`/verification-error.html?reason=server_error`);
  }
});

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

/**
 * POST /api/email-verification/send
 * Send verification email with pending consents
 *
 * Body: { user_id, user_type, email }
 * Returns: { success, message, token_id, expires_at }
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { user_id, user_type, email } = req.body;

    console.log('📧 [EMAIL-VERIFICATION] Enviando email de verificación...', {
      user_id,
      user_type,
      email
    });

    // Validation
    if (!user_id || !user_type || !email) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        details: {
          required: ['user_id', 'user_type', 'email'],
          received: { user_id: !!user_id, user_type: !!user_type, email: !!email }
        }
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Formato de email inválido',
        details: { email }
      });
    }

    if (!isValidUserType(user_type)) {
      return res.status(400).json({
        error: 'Tipo de usuario inválido',
        details: {
          valid_types: VALID_USER_TYPES,
          received: user_type
        }
      });
    }

    // Get pending consents for this role
    const pendingConsents = await ConsentService.getPendingConsents(user_id, user_type);
    console.log('📋 [EMAIL-VERIFICATION] Consentimientos pendientes:', pendingConsents.pending_consents?.length || 0);

    // Send verification email
    const result = await EmailVerificationService.sendVerificationEmail(
      user_id,
      user_type,
      email,
      {
        pending_consents: pendingConsents.pending_consents || [],
        company_id: req.user.companyId || req.user.companyId
      }
    );

    if (!result.success) {
      console.log('❌ [EMAIL-VERIFICATION] Fallo al enviar email:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [EMAIL-VERIFICATION] Email enviado exitosamente:', {
      token_id: result.token_id,
      expires_at: result.expires_at
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        token_id: result.token_id,
        expires_at: result.expires_at,
        pending_consents_count: pendingConsents.pending_consents?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ [EMAIL-VERIFICATION] Error al enviar email:', error);
    return res.status(500).json({
      error: 'Error interno al enviar email de verificación',
      details: { message: error.message }
    });
  }
});

/**
 * POST /api/email-verification/resend
 * Resend verification email
 *
 * Body: { user_id, user_type }
 * Returns: { success, message, new_expiration }
 */
router.post('/resend', auth, async (req, res) => {
  try {
    const { user_id, user_type } = req.body;

    console.log('📧 [EMAIL-VERIFICATION] Reenviando email de verificación...', {
      user_id,
      user_type
    });

    // Validation
    if (!user_id || !user_type) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        details: {
          required: ['user_id', 'user_type'],
          received: { user_id: !!user_id, user_type: !!user_type }
        }
      });
    }

    if (!isValidUserType(user_type)) {
      return res.status(400).json({
        error: 'Tipo de usuario inválido',
        details: {
          valid_types: VALID_USER_TYPES,
          received: user_type
        }
      });
    }

    // Resend verification email
    const result = await EmailVerificationService.resendVerificationEmail(user_id, user_type);

    if (!result.success) {
      console.log('❌ [EMAIL-VERIFICATION] Fallo al reenviar email:', result.message);
      return res.status(400).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [EMAIL-VERIFICATION] Email reenviado exitosamente');

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        new_expiration: result.new_expiration
      }
    });

  } catch (error) {
    console.error('❌ [EMAIL-VERIFICATION] Error al reenviar email:', error);
    return res.status(500).json({
      error: 'Error interno al reenviar email',
      details: { message: error.message }
    });
  }
});

/**
 * GET /api/email-verification/status/:userId/:userType
 * Check email verification status
 *
 * Params: userId, userType
 * Returns: { verified, verified_at, pending_consents_count }
 */
router.get('/status/:userId/:userType', auth, async (req, res) => {
  try {
    const { userId, userType } = req.params;

    console.log('📧 [EMAIL-VERIFICATION] Verificando estado...', {
      userId,
      userType
    });

    // Validation
    if (!isValidUserType(userType)) {
      return res.status(400).json({
        error: 'Tipo de usuario inválido',
        details: {
          valid_types: VALID_USER_TYPES,
          received: userType
        }
      });
    }

    // Check verification status
    const result = await EmailVerificationService.checkVerificationStatus(userId, userType);

    if (!result.success) {
      console.log('❌ [EMAIL-VERIFICATION] Error al verificar estado:', result.message);
      return res.status(404).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [EMAIL-VERIFICATION] Estado obtenido:', {
      verified: result.verified,
      verified_at: result.verified_at
    });

    return res.status(200).json({
      success: true,
      data: {
        verified: result.verified,
        verified_at: result.verified_at,
        pending_consents_count: result.pending_consents_count || 0
      }
    });

  } catch (error) {
    console.error('❌ [EMAIL-VERIFICATION] Error al obtener estado:', error);
    return res.status(500).json({
      error: 'Error interno al verificar estado',
      details: { message: error.message }
    });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * DELETE /api/email-verification/cleanup
 * Cleanup expired verification tokens
 * Admin only
 *
 * Returns: { success, deleted_count }
 */
router.delete('/cleanup', auth, adminOnly, async (req, res) => {
  try {
    console.log('📧 [EMAIL-VERIFICATION] Limpiando tokens expirados... (Admin)');

    // Cleanup expired tokens
    const result = await EmailVerificationService.cleanupExpiredTokens();

    if (!result.success) {
      console.log('❌ [EMAIL-VERIFICATION] Error al limpiar tokens:', result.message);
      return res.status(500).json({
        error: result.message,
        details: result.details || {}
      });
    }

    console.log('✅ [EMAIL-VERIFICATION] Tokens limpiados:', result.deleted_count);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        deleted_count: result.deleted_count
      }
    });

  } catch (error) {
    console.error('❌ [EMAIL-VERIFICATION] Error al limpiar tokens:', error);
    return res.status(500).json({
      error: 'Error interno al limpiar tokens',
      details: { message: error.message }
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/email-verification/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Email Verification API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
