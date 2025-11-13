/**
 * ============================================================================
 * EMAIL VERIFICATION UI MODULE
 * ============================================================================
 *
 * Módulo para mostrar banner de verificación pendiente y permitir reenvío
 * de emails de verificación.
 *
 * Funcionalidades:
 * - Mostrar banner cuando usuario tiene email pendiente de verificación
 * - Botón para reenviar email de verificación
 * - Integración con panel-empresa.html y panel-administrativo.html
 *
 * @version 1.0.0
 * @created 2025-11-01
 * ============================================================================
 */

class EmailVerificationUI {
    /**
     * Mostrar banner de verificación pendiente
     *
     * @param {object} user - Objeto usuario con { id, email, type, account_status }
     */
    static showPendingVerificationBanner(user) {
        console.log('📧 [EMAIL-VERIFICATION-UI] Mostrando banner de verificación pendiente:', user);

        const containerId = 'verification-banner-container';
        let container = document.getElementById(containerId);

        // Crear contenedor si no existe
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.right = '0';
            container.style.zIndex = '9999';
            document.body.insertBefore(container, document.body.firstChild);
        }

        const banner = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert" style="
                margin: 0;
                border-radius: 0;
                border: none;
                border-bottom: 3px solid #ffc107;
                background: linear-gradient(135deg, #fff3cd 0%, #fff9e6 100%);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                padding: 15px 20px;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
                    <div style="flex: 1; min-width: 300px;">
                        <strong style="font-size: 18px;">⚠️ Email no verificado</strong>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">
                            Su cuenta está pendiente de verificación.
                            <strong>Debe verificar su email (${user.email}) para activar completamente su cuenta.</strong>
                            <br>
                            <small style="color: #856404;">
                                Revise su bandeja de entrada y carpeta de spam.
                                El enlace de verificación es válido por 48 horas.
                            </small>
                        </p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button
                            class="btn btn-primary"
                            onclick="EmailVerificationUI.resendEmail(${user.id}, '${user.type}')"
                            style="
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                border: none;
                                padding: 10px 20px;
                                font-weight: 500;
                                white-space: nowrap;
                            ">
                            📧 Reenviar Email
                        </button>
                        <button
                            type="button"
                            class="close"
                            data-dismiss="alert"
                            aria-label="Close"
                            style="
                                font-size: 28px;
                                font-weight: 300;
                                opacity: 0.5;
                                margin-left: 10px;
                            ">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = banner;
    }

    /**
     * Reenviar email de verificación
     *
     * @param {string|number} userId - ID del usuario
     * @param {string} userType - Tipo de usuario ('employee', 'vendor', etc.)
     */
    static async resendEmail(userId, userType) {
        try {
            console.log(`📧 [EMAIL-VERIFICATION-UI] Reenviando email para user_id: ${userId}, type: ${userType}`);

            // Mostrar loading
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '⏳ Enviando...';

            const response = await fetch('/api/email-verification/resend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    user_type: userType
                })
            });

            const result = await response.json();

            // Restaurar botón
            btn.disabled = false;
            btn.innerHTML = originalText;

            if (result.success) {
                console.log('✅ [EMAIL-VERIFICATION-UI] Email reenviado exitosamente');
                alert('✅ Email de verificación reenviado exitosamente.\n\nRevise su bandeja de entrada y carpeta de spam.');
            } else {
                console.error('❌ [EMAIL-VERIFICATION-UI] Error reenviando email:', result.error);
                alert(`❌ Error: ${result.error || 'No se pudo reenviar el email'}`);
            }

        } catch (error) {
            console.error('❌ [EMAIL-VERIFICATION-UI] Error reenviando email:', error);
            alert('❌ Error de conexión. Por favor, intente nuevamente.');
        }
    }

    /**
     * Verificar estado de verificación del usuario actual
     * (útil para mostrar banner automáticamente al cargar página)
     */
    static async checkCurrentUserVerificationStatus() {
        try {
            // Obtener datos del usuario del localStorage o del token
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('⚠️ [EMAIL-VERIFICATION-UI] No hay token de sesión');
                return;
            }

            // Decodificar token para obtener user_id (básico, sin validación)
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                console.log('⚠️ [EMAIL-VERIFICATION-UI] Token inválido');
                return;
            }

            const payload = JSON.parse(atob(tokenParts[1]));
            const userId = payload.id || payload.user_id;
            const userType = 'employee'; // Default, puede venir del token

            console.log(`📧 [EMAIL-VERIFICATION-UI] Verificando estado de user_id: ${userId}`);

            const response = await fetch(`/api/email-verification/status/${userId}/${userType}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.log('⚠️ [EMAIL-VERIFICATION-UI] No se pudo verificar estado');
                return;
            }

            const result = await response.json();

            if (result.success && !result.data.verified) {
                // Usuario NO verificado - mostrar banner
                console.log('⚠️ [EMAIL-VERIFICATION-UI] Usuario no verificado, mostrando banner');
                EmailVerificationUI.showPendingVerificationBanner({
                    id: userId,
                    email: result.data.email || 'su email',
                    type: userType,
                    account_status: 'pending_verification'
                });
            }

        } catch (error) {
            console.error('❌ [EMAIL-VERIFICATION-UI] Error verificando estado:', error);
        }
    }

    /**
     * Ocultar banner de verificación
     */
    static hideBanner() {
        const container = document.getElementById('verification-banner-container');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Auto-ejecutar verificación al cargar el módulo (opcional)
// Comentado por defecto, descomentar si se desea auto-verificación
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => {
//         EmailVerificationUI.checkCurrentUserVerificationStatus();
//     });
// } else {
//     EmailVerificationUI.checkCurrentUserVerificationStatus();
// }

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.EmailVerificationUI = EmailVerificationUI;
}
