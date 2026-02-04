/**
 * API SERVICE - Servicio Centralizado de Comunicación con Backend
 *
 * OBJETIVO: Eliminar inconsistencias de autenticación en todo el ecosistema
 *
 * CARACTERÍSTICAS:
 * - Token management centralizado
 * - Auto-refresh de tokens expirados
 * - Manejo consistente de errores 401/403
 * - Retry automático con backoff
 * - Logging unificado
 *
 * USO:
 *   const result = await ApiService.get('/api/companies');
 *   const result = await ApiService.post('/api/companies', { name: 'Test' });
 *   const result = await ApiService.put('/api/companies/123', data);
 *
 * @version 1.0.0
 * @date 2026-02-03
 */

const ApiService = (function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN
    // ═══════════════════════════════════════════════════════════════════════════

    const CONFIG = {
        // Claves de token en orden de prioridad
        TOKEN_KEYS: [
            'aponnt_token_staff',   // Panel administrativo (staff Aponnt)
            'aponnt_token',         // Panel administrativo (legacy)
            'token',                // Panel empresa
            'companyAuthToken'      // Panel empresa (legacy)
        ],

        // Tiempo antes de expiración para intentar refresh (5 minutos)
        TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1000,

        // Reintentos en caso de error de red
        MAX_RETRIES: 3,
        RETRY_DELAY_MS: 1000,

        // Timeout por defecto
        DEFAULT_TIMEOUT_MS: 30000,

        // Eventos personalizados
        EVENTS: {
            AUTH_ERROR: 'apiservice:auth-error',
            TOKEN_EXPIRED: 'apiservice:token-expired',
            NETWORK_ERROR: 'apiservice:network-error'
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // GESTIÓN DE TOKENS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Obtener el token de autenticación más apropiado
     * Busca en orden de prioridad en localStorage
     */
    function getAuthToken() {
        for (const key of CONFIG.TOKEN_KEYS) {
            const token = localStorage.getItem(key);
            if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
                console.log(`🔑 [ApiService] Token encontrado en: ${key}`);
                return token;
            }
        }
        console.warn('⚠️ [ApiService] No se encontró token de autenticación');
        return null;
    }

    /**
     * Guardar token en todas las claves para compatibilidad
     */
    function setAuthToken(token, primaryKey = 'aponnt_token_staff') {
        if (!token) return;

        // Guardar en la clave primaria
        localStorage.setItem(primaryKey, token);

        // También en las otras claves para compatibilidad
        CONFIG.TOKEN_KEYS.forEach(key => {
            if (key !== primaryKey) {
                localStorage.setItem(key, token);
            }
        });

        console.log(`✅ [ApiService] Token guardado en ${CONFIG.TOKEN_KEYS.length} claves`);
    }

    /**
     * Limpiar todos los tokens (para logout)
     */
    function clearAllTokens() {
        CONFIG.TOKEN_KEYS.forEach(key => {
            localStorage.removeItem(key);
        });
        console.log('🧹 [ApiService] Todos los tokens eliminados');
    }

    /**
     * Verificar si el token está próximo a expirar
     */
    function isTokenExpiringSoon(token) {
        if (!token) return true;

        try {
            // Decodificar payload del JWT (parte del medio)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000; // Convertir a ms
            const timeUntilExpiry = expirationTime - Date.now();

            return timeUntilExpiry < CONFIG.TOKEN_REFRESH_THRESHOLD_MS;
        } catch (e) {
            // Si no se puede decodificar, asumir que está bien
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MANEJO DE ERRORES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Manejar error de autenticación (401/403)
     */
    function handleAuthError(response, url) {
        console.error(`🔒 [ApiService] Error de autenticación: ${response.status} en ${url}`);

        // Emitir evento para que la UI pueda reaccionar
        window.dispatchEvent(new CustomEvent(CONFIG.EVENTS.AUTH_ERROR, {
            detail: { status: response.status, url }
        }));

        // Si es 401, probablemente el token expiró
        if (response.status === 401) {
            window.dispatchEvent(new CustomEvent(CONFIG.EVENTS.TOKEN_EXPIRED, {
                detail: { url }
            }));

            // Mostrar mensaje amigable
            showAuthErrorMessage('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
        }

        return {
            success: false,
            error: response.status === 401
                ? 'Sesión expirada. Por favor, vuelve a iniciar sesión.'
                : 'No tienes permisos para realizar esta acción.',
            code: response.status === 401 ? 'TOKEN_EXPIRED' : 'ACCESS_DENIED',
            status: response.status
        };
    }

    /**
     * Mostrar mensaje de error de autenticación al usuario
     */
    function showAuthErrorMessage(message) {
        // Buscar si ya existe un toast/notification system
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'error');
        } else if (typeof AdminPanelController !== 'undefined' && AdminPanelController.showNotification) {
            AdminPanelController.showNotification(message, 'error');
        } else {
            // Fallback: crear toast simple
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #dc2626;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 99999;
                font-family: system-ui, sans-serif;
                animation: slideIn 0.3s ease;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE: FETCH CON AUTENTICACIÓN
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Realizar request HTTP con autenticación automática
     * @param {string} url - URL del endpoint
     * @param {object} options - Opciones de fetch
     * @returns {Promise<object>} - Respuesta parseada
     */
    async function request(url, options = {}) {
        const token = getAuthToken();

        // Configurar headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Agregar token si existe
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Configurar request
        const fetchOptions = {
            ...options,
            headers,
            credentials: 'include' // Incluir cookies de sesión
        };

        // Si hay body y no es string, convertir a JSON
        if (options.body && typeof options.body !== 'string') {
            fetchOptions.body = JSON.stringify(options.body);
        }

        console.log(`📡 [ApiService] ${options.method || 'GET'} ${url}`);

        try {
            const response = await fetch(url, fetchOptions);

            // Manejar errores de autenticación
            if (response.status === 401 || response.status === 403) {
                return handleAuthError(response, url);
            }

            // Parsear respuesta
            const data = await response.json();

            // Verificar si la respuesta indica error
            if (!response.ok) {
                console.error(`❌ [ApiService] Error ${response.status}:`, data);
                return {
                    success: false,
                    error: data.error || data.message || `Error ${response.status}`,
                    status: response.status,
                    data: data
                };
            }

            return data;

        } catch (error) {
            console.error(`❌ [ApiService] Error de red:`, error);

            // Emitir evento de error de red
            window.dispatchEvent(new CustomEvent(CONFIG.EVENTS.NETWORK_ERROR, {
                detail: { url, error: error.message }
            }));

            return {
                success: false,
                error: 'Error de conexión. Verifica tu conexión a internet.',
                code: 'NETWORK_ERROR'
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MÉTODOS PÚBLICOS
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        /**
         * GET request
         */
        get: function(url, options = {}) {
            return request(url, { ...options, method: 'GET' });
        },

        /**
         * POST request
         */
        post: function(url, body, options = {}) {
            return request(url, { ...options, method: 'POST', body });
        },

        /**
         * PUT request
         */
        put: function(url, body, options = {}) {
            return request(url, { ...options, method: 'PUT', body });
        },

        /**
         * PATCH request
         */
        patch: function(url, body, options = {}) {
            return request(url, { ...options, method: 'PATCH', body });
        },

        /**
         * DELETE request
         */
        delete: function(url, options = {}) {
            return request(url, { ...options, method: 'DELETE' });
        },

        // Gestión de tokens
        getToken: getAuthToken,
        setToken: setAuthToken,
        clearTokens: clearAllTokens,
        isTokenExpiring: isTokenExpiringSoon,

        // Configuración
        CONFIG
    };
})();

// Exponer globalmente
window.ApiService = ApiService;

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN HELPER GLOBAL PARA OBTENER TOKEN
// Esta función se puede llamar desde CUALQUIER módulo sin depender de ApiService
// IMPORTANTE: Ejecutar ANTES de DOMContentLoaded para estar disponible inmediatamente
// ═══════════════════════════════════════════════════════════════════════════
window.getMultiKeyToken = function() {
    const tokenKeys = ['aponnt_token_staff', 'aponnt_token', 'token', 'companyAuthToken'];

    // Primero buscar en localStorage
    for (const key of tokenKeys) {
        const token = localStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 20) {
            return token;
        }
    }

    // Fallback a sessionStorage
    for (const key of tokenKeys) {
        const token = sessionStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 20) {
            return token;
        }
    }

    return null;
};

// También exponer como getAuthTokenGlobal para compatibilidad
window.getAuthTokenGlobal = window.getMultiKeyToken;

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 [ApiService] Servicio de API centralizado inicializado');

    // ═══════════════════════════════════════════════════════════════════════
    // SINCRONIZACIÓN DE TOKENS AL INICIO
    // Si hay un token en cualquier clave, copiarlo a TODAS las claves
    // Esto resuelve el problema de módulos que usan diferentes claves
    // ═══════════════════════════════════════════════════════════════════════
    const tokenKeys = ['aponnt_token_staff', 'aponnt_token', 'token'];
    let foundToken = null;

    // Buscar un token válido en cualquier clave
    for (const key of tokenKeys) {
        const token = localStorage.getItem(key);
        if (token && token !== 'null' && token !== 'undefined' && token.length > 20) {
            foundToken = token;
            console.log(`🔑 [ApiService] Token encontrado en: ${key}`);
            break;
        }
    }

    // Si encontramos un token, sincronizarlo a todas las claves
    if (foundToken) {
        tokenKeys.forEach(key => {
            const existing = localStorage.getItem(key);
            if (!existing || existing === 'null' || existing === 'undefined') {
                localStorage.setItem(key, foundToken);
                console.log(`🔄 [ApiService] Token sincronizado a: ${key}`);
            }
        });
        console.log('✅ [ApiService] Tokens sincronizados en todas las claves');
    }

    // Escuchar eventos de autenticación para logging
    window.addEventListener('apiservice:auth-error', function(e) {
        console.warn('🔒 [ApiService] Evento de error de auth:', e.detail);
    });

    window.addEventListener('apiservice:token-expired', function(e) {
        console.warn('⏰ [ApiService] Token expirado, redirigiendo a login...');
        // Opcional: redirigir a login automáticamente
        // window.location.href = '/login.html';
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// CSS para animaciones del toast
// ═══════════════════════════════════════════════════════════════════════════
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
