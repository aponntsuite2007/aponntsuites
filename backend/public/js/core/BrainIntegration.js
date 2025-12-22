/**
 * ============================================================================
 * BRAIN INTEGRATION - Conexión Frontend con el Sistema Nervioso
 * ============================================================================
 *
 * ÚNICO punto de acceso del frontend a las capacidades del Brain:
 * - Verificación de prerrequisitos en tiempo real
 * - Integración con botones de acción
 * - Integración con tours interactivos
 * - Integración con asistente IA
 *
 * ARQUITECTURA:
 *                         ┌──────────────────────────┐
 *                         │   PrerequisiteChecker    │  ← Backend (fuente única)
 *                         └───────────┬──────────────┘
 *                                     │
 *                    /api/brain/prerequisites/:action
 *                                     │
 *         ┌───────────────────────────┼───────────────────────────┐
 *         │                           │                           │
 *         ▼                           ▼                           ▼
 * ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
 * │  UI BUTTONS     │        │  ASISTENTE IA   │        │     TOURS       │
 * │  pre-check      │        │  verificación   │        │  verificación   │
 * └─────────────────┘        └─────────────────┘        └─────────────────┘
 *         │                           │                           │
 *         └───────────────────────────┴───────────────────────────┘
 *                                     │
 *                         ┌───────────▼───────────┐
 *                         │  BrainIntegration.js  │  ← ESTE MÓDULO
 *                         └───────────────────────┘
 *
 * @version 1.0.0
 * @date 2025-12-21
 * ============================================================================
 */

const BrainIntegration = (function() {
    'use strict';

    // Estado interno
    let currentCompanyId = null;
    let currentUserId = null;
    let cache = new Map();
    const CACHE_TTL = 30000; // 30 segundos

    /**
     * Inicializar con contexto del usuario
     */
    function init(companyId, userId) {
        currentCompanyId = companyId;
        currentUserId = userId;
        console.log(`🧠 [BRAIN-INTEGRATION] Inicializado para empresa ${companyId}`);
    }

    /**
     * Obtener headers de autenticación
     */
    function getAuthHeaders() {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    /**
     * ============================================================================
     * VERIFICACIÓN PRE-ACCIÓN (Para botones UI)
     * ============================================================================
     * Verifica si el usuario puede ejecutar una acción ANTES de abrir el modal
     *
     * @param {string} actionKey - Clave de la acción (ej: 'payroll-liquidation')
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Object>} Resultado de verificación
     */
    async function checkBeforeAction(actionKey, options = {}) {
        const companyId = options.companyId || currentCompanyId;
        const userId = options.userId || currentUserId;

        if (!companyId) {
            console.error('🧠 [BRAIN] No hay companyId configurado');
            return { canProceed: true, error: 'No company context' };
        }

        // Verificar cache
        const cacheKey = `${actionKey}-${companyId}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`🧠 [BRAIN] Cache hit para ${actionKey}`);
            return cached.data;
        }

        try {
            const url = `/api/brain/prerequisites/${actionKey}?company_id=${companyId}${userId ? `&user_id=${userId}` : ''}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            // Guardar en cache
            cache.set(cacheKey, { data: result, timestamp: Date.now() });

            console.log(`🧠 [BRAIN] Verificación ${actionKey}: ${result.canProceed ? '✅ OK' : '❌ BLOCKED'}`);

            return result;

        } catch (error) {
            console.error(`🧠 [BRAIN] Error verificando ${actionKey}:`, error);
            // En caso de error, permitir (fail-open)
            return { canProceed: true, error: error.message };
        }
    }

    /**
     * ============================================================================
     * VERIFICACIÓN PARA TOUR (Para tours interactivos)
     * ============================================================================
     * Verifica prerrequisitos antes de iniciar un tour
     *
     * @param {string} actionKey - Acción asociada al tour
     * @returns {Promise<Object>} Resultado con instrucciones para el tour
     */
    async function verifyForTour(actionKey) {
        const result = await checkBeforeAction(actionKey);

        if (result.canProceed) {
            return {
                canStartTour: true,
                message: result.summary?.message || 'Todo listo para comenzar',
                steps: result.process?.steps || []
            };
        }

        // No puede proceder - devolver pasos de prerrequisitos
        return {
            canStartTour: false,
            message: result.summary?.message || 'Faltan configuraciones previas',
            missingSteps: result.missing?.map(m => ({
                description: m.description,
                howToFix: m.howToFix,
                module: m.relatedModule,
                navigateTo: getNavigationPath(m.relatedModule)
            })) || [],
            suggestion: 'Completa estas configuraciones primero, luego vuelve a intentar el tour.'
        };
    }

    /**
     * ============================================================================
     * OBTENER ESTADO COMPLETO DE EMPRESA
     * ============================================================================
     * Obtiene todas las acciones disponibles y bloqueadas para la empresa
     *
     * @returns {Promise<Object>} { available, blocked, summary }
     */
    async function getCompanyReadiness() {
        const companyId = currentCompanyId;

        if (!companyId) {
            return { available: [], blocked: [], error: 'No company context' };
        }

        try {
            const response = await fetch(`/api/brain/check-readiness?company_id=${companyId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('🧠 [BRAIN] Error obteniendo readiness:', error);
            return { available: [], blocked: [], error: error.message };
        }
    }

    /**
     * ============================================================================
     * MOSTRAR MODAL DE PRERREQUISITOS FALTANTES
     * ============================================================================
     * Muestra un modal informativo cuando faltan prerrequisitos
     *
     * @param {Object} result - Resultado de checkBeforeAction
     * @param {Function} onComplete - Callback cuando el usuario completa los pasos
     */
    function showMissingPrerequisitesModal(result, onComplete = null) {
        const modal = document.createElement('div');
        modal.className = 'brain-prereq-modal';
        modal.innerHTML = `
            <div class="brain-prereq-overlay"></div>
            <div class="brain-prereq-content">
                <div class="brain-prereq-header">
                    <span class="brain-prereq-icon">${result.summary?.emoji || '⚠️'}</span>
                    <h3>${result.summary?.title || 'Prerrequisitos Faltantes'}</h3>
                    <button class="brain-prereq-close">&times;</button>
                </div>
                <div class="brain-prereq-body">
                    <p class="brain-prereq-message">${result.summary?.message || 'Faltan configuraciones para esta acción.'}</p>

                    ${result.missing && result.missing.length > 0 ? `
                        <div class="brain-prereq-list">
                            <h4>Qué falta:</h4>
                            <ul>
                                ${result.missing.map(m => `
                                    <li class="brain-prereq-item ${m.critical ? 'critical' : ''}">
                                        <span class="brain-prereq-item-icon">${m.critical ? '🚫' : '⚠️'}</span>
                                        <div class="brain-prereq-item-content">
                                            <strong>${m.description}</strong>
                                            ${m.howToFix ? `<p class="brain-prereq-fix">${m.howToFix}</p>` : ''}
                                            ${m.relatedModule ? `
                                                <button class="brain-prereq-goto" data-module="${m.relatedModule}">
                                                    Ir a configurar →
                                                </button>
                                            ` : ''}
                                        </div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${result.modules?.missingRequired?.length > 0 ? `
                        <div class="brain-prereq-modules">
                            <h4>Módulos requeridos no contratados:</h4>
                            <ul>
                                ${result.modules.missingRequired.map(m => `
                                    <li>
                                        <span class="brain-prereq-module-badge">${m}</span>
                                        <a href="#" class="brain-prereq-contact">Contactar ventas</a>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                <div class="brain-prereq-footer">
                    <button class="brain-prereq-btn-secondary" id="brain-prereq-close">Cerrar</button>
                    ${onComplete ? `<button class="brain-prereq-btn-primary" id="brain-prereq-check-again">Verificar de nuevo</button>` : ''}
                </div>
            </div>
        `;

        // Estilos inline (para no depender de CSS externo)
        const style = document.createElement('style');
        style.textContent = `
            .brain-prereq-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; }
            .brain-prereq-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: transparent; pointer-events: none; }
            .brain-prereq-content { position: relative; background: #1e1e2e; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
            .brain-prereq-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #333; gap: 12px; }
            .brain-prereq-icon { font-size: 24px; }
            .brain-prereq-header h3 { flex: 1; margin: 0; color: #fff; font-size: 18px; }
            .brain-prereq-close { background: none; border: none; color: #888; font-size: 24px; cursor: pointer; padding: 0; }
            .brain-prereq-close:hover { color: #fff; }
            .brain-prereq-body { padding: 20px; }
            .brain-prereq-message { color: #ccc; margin: 0 0 16px; line-height: 1.5; }
            .brain-prereq-list h4, .brain-prereq-modules h4 { color: #fff; font-size: 14px; margin: 0 0 12px; }
            .brain-prereq-list ul, .brain-prereq-modules ul { list-style: none; padding: 0; margin: 0; }
            .brain-prereq-item { display: flex; gap: 12px; padding: 12px; background: #262636; border-radius: 8px; margin-bottom: 8px; }
            .brain-prereq-item.critical { border-left: 3px solid #ef4444; }
            .brain-prereq-item-icon { font-size: 20px; }
            .brain-prereq-item-content { flex: 1; }
            .brain-prereq-item-content strong { color: #fff; display: block; margin-bottom: 4px; }
            .brain-prereq-fix { color: #888; font-size: 13px; margin: 4px 0 8px; }
            .brain-prereq-goto { background: #4f46e5; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
            .brain-prereq-goto:hover { background: #6366f1; }
            .brain-prereq-modules { margin-top: 16px; padding-top: 16px; border-top: 1px solid #333; }
            .brain-prereq-module-badge { background: #dc2626; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .brain-prereq-contact { color: #60a5fa; margin-left: 12px; font-size: 12px; }
            .brain-prereq-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #333; }
            .brain-prereq-btn-secondary { background: #333; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
            .brain-prereq-btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
            .brain-prereq-btn-secondary:hover { background: #444; }
            .brain-prereq-btn-primary:hover { background: #6366f1; }
        `;

        document.head.appendChild(style);
        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.brain-prereq-close').addEventListener('click', () => {
            modal.remove();
            style.remove();
        });

        modal.querySelector('.brain-prereq-overlay').addEventListener('click', () => {
            modal.remove();
            style.remove();
        });

        modal.querySelector('#brain-prereq-close').addEventListener('click', () => {
            modal.remove();
            style.remove();
        });

        const checkAgainBtn = modal.querySelector('#brain-prereq-check-again');
        if (checkAgainBtn && onComplete) {
            checkAgainBtn.addEventListener('click', async () => {
                // Limpiar cache y verificar de nuevo
                cache.clear();
                const newResult = await checkBeforeAction(result.action);
                if (newResult.canProceed) {
                    modal.remove();
                    style.remove();
                    onComplete();
                } else {
                    // Actualizar el modal con nuevo resultado
                    modal.remove();
                    showMissingPrerequisitesModal(newResult, onComplete);
                }
            });
        }

        // Botones de navegación
        modal.querySelectorAll('.brain-prereq-goto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const module = e.target.dataset.module;
                navigateToModule(module);
                modal.remove();
                style.remove();
            });
        });

        return modal;
    }

    /**
     * Obtener ruta de navegación para un módulo
     */
    function getNavigationPath(moduleKey) {
        const paths = {
            'branches': { menu: 'organization', submenu: 'branches' },
            'departments': { menu: 'organization', submenu: 'departments' },
            'sectors': { menu: 'organization', submenu: 'sectors' },
            'shifts': { menu: 'schedules', submenu: 'shifts' },
            'users': { menu: 'users', submenu: 'list' },
            'organizational-structure': { menu: 'organization', submenu: 'structure' }
        };
        return paths[moduleKey] || null;
    }

    /**
     * Navegar a un módulo específico
     */
    function navigateToModule(moduleKey) {
        const path = getNavigationPath(moduleKey);
        if (path && typeof window.navigateToMenu === 'function') {
            window.navigateToMenu(path.menu, path.submenu);
        } else {
            console.log(`🧠 [BRAIN] Navegación a ${moduleKey} no implementada`);
        }
    }

    /**
     * ============================================================================
     * WRAPPER PARA BOTONES DE ACCIÓN
     * ============================================================================
     * Envuelve una función de acción para verificar prerrequisitos primero
     *
     * @param {string} actionKey - Clave de la acción
     * @param {Function} originalAction - Función original a ejecutar
     * @returns {Function} Función envuelta con verificación
     *
     * @example
     * // Antes:
     * btnLiquidar.onclick = () => openLiquidationModal();
     *
     * // Después:
     * btnLiquidar.onclick = BrainIntegration.wrapAction('payroll-liquidation', openLiquidationModal);
     */
    function wrapAction(actionKey, originalAction) {
        return async function(...args) {
            const result = await checkBeforeAction(actionKey);

            if (result.canProceed) {
                // Puede proceder - ejecutar acción original
                return originalAction.apply(this, args);
            }

            // No puede proceder - mostrar modal de prerrequisitos
            showMissingPrerequisitesModal(result, () => {
                // Callback: cuando complete los prerrequisitos, ejecutar acción
                originalAction.apply(this, args);
            });
        };
    }

    /**
     * ============================================================================
     * DECORATOR PARA BOTONES (Más elegante)
     * ============================================================================
     * Agrega verificación de prerrequisitos a un botón existente
     *
     * @param {HTMLElement|string} button - Botón o selector
     * @param {string} actionKey - Clave de la acción
     *
     * @example
     * BrainIntegration.decorateButton('#btn-liquidar', 'payroll-liquidation');
     */
    function decorateButton(button, actionKey) {
        const btn = typeof button === 'string' ? document.querySelector(button) : button;
        if (!btn) return;

        const originalHandler = btn.onclick;

        btn.onclick = wrapAction(actionKey, originalHandler || (() => {}));

        // Agregar atributo para identificar botones decorados
        btn.setAttribute('data-brain-action', actionKey);

        console.log(`🧠 [BRAIN] Botón decorado con verificación: ${actionKey}`);
    }

    /**
     * Limpiar cache
     */
    function clearCache() {
        cache.clear();
        console.log('🧠 [BRAIN] Cache limpiado');
    }

    // Exponer API pública
    return {
        init,
        checkBeforeAction,
        verifyForTour,
        getCompanyReadiness,
        showMissingPrerequisitesModal,
        wrapAction,
        decorateButton,
        clearCache,
        getNavigationPath,
        navigateToModule
    };

})();

// Exportar para uso como módulo ES6 si está disponible
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrainIntegration;
}
