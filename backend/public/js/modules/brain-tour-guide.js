/**
 * ============================================================================
 * BRAIN TOUR GUIDE - Componente Frontend para Tours Interactivos
 * ============================================================================
 *
 * Sistema de tours guiados que consume la API del Brain para generar
 * tutoriales interactivos step-by-step.
 *
 * USO:
 *   BrainTourGuide.init();
 *   BrainTourGuide.startTour('tour-onboarding-admin');
 *   BrainTourGuide.startModuleTour('users');
 *   BrainTourGuide.startWorkflowTour('crear-usuario');
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const BrainTourGuide = {
    // Estado
    isActive: false,
    currentTour: null,
    currentStepIndex: 0,
    overlay: null,
    tooltip: null,
    spotlight: null,

    // Configuracion
    config: {
        apiBaseUrl: '/api/brain/tours',
        animationSpeed: 300,
        spotlightPadding: 10,
        tooltipOffset: 15,
        autoAdvanceDelay: 0, // 0 = manual
        showProgress: true,
        showCloseButton: true,
        keyboardNavigation: true
    },

    /**
     * Inicializar el sistema de tours
     */
    init(options = {}) {
        Object.assign(this.config, options);
        this._createStyles();
        this._createElements();
        this._bindEvents();
        console.log('[BRAIN-TOUR] Sistema de tours inicializado');
    },

    /**
     * ========================================================================
     * API DE TOURS
     * ========================================================================
     */

    /**
     * Obtener lista de tours disponibles
     */
    async getAvailableTours(role = 'employee', modules = []) {
        try {
            const params = new URLSearchParams();
            if (role) params.append('role', role);
            if (modules.length) params.append('modules', modules.join(','));

            const res = await fetch(`${this.config.apiBaseUrl}?${params}`);
            const data = await res.json();
            return data.success ? data.data : [];
        } catch (e) {
            console.error('[BRAIN-TOUR] Error obteniendo tours:', e);
            return [];
        }
    },

    /**
     * Iniciar un tour por ID
     */
    async startTour(tourId) {
        console.log(`🎯 [BRAIN-TOUR] startTour llamado con: ${tourId}`);
        try {
            const res = await fetch(`${this.config.apiBaseUrl}/${tourId}`);
            const data = await res.json();
            console.log(`📥 [BRAIN-TOUR] Respuesta API:`, data.success ? 'OK' : data.error);

            if (!data.success) {
                console.error('[BRAIN-TOUR] Tour no encontrado:', data.error);
                return false;
            }

            return await this._runTour(data.data);
        } catch (e) {
            console.error('[BRAIN-TOUR] Error iniciando tour:', e);
            return false;
        }
    },

    /**
     * Iniciar tour de onboarding para un rol
     */
    async startOnboardingTour(role = 'employee') {
        try {
            const res = await fetch(`${this.config.apiBaseUrl}/onboarding/${role}`);
            const data = await res.json();
            return data.success ? await this._runTour(data.data) : false;
        } catch (e) {
            console.error('[BRAIN-TOUR] Error iniciando onboarding:', e);
            return false;
        }
    },

    /**
     * Iniciar tour de un modulo especifico
     */
    async startModuleTour(moduleKey) {
        try {
            const res = await fetch(`${this.config.apiBaseUrl}/module/${moduleKey}`);
            const data = await res.json();
            return data.success ? await this._runTour(data.data) : false;
        } catch (e) {
            console.error('[BRAIN-TOUR] Error iniciando tour de modulo:', e);
            return false;
        }
    },

    /**
     * Iniciar tour de workflow
     */
    async startWorkflowTour(workflowName) {
        try {
            const res = await fetch(`${this.config.apiBaseUrl}/workflow/${workflowName}`);
            const data = await res.json();
            return data.success ? await this._runTour(data.data) : false;
        } catch (e) {
            console.error('[BRAIN-TOUR] Error iniciando workflow:', e);
            return false;
        }
    },

    /**
     * ========================================================================
     * EJECUCION DEL TOUR
     * ========================================================================
     */

    async _runTour(tour) {
        if (!tour || !tour.steps || tour.steps.length === 0) {
            console.warn('[BRAIN-TOUR] Tour sin pasos');
            return false;
        }

        // 🧠 BRAIN INTEGRATION - Verificar prerrequisitos antes de iniciar
        if (tour.actionKey && typeof BrainIntegration !== 'undefined') {
            console.log(`🧠 [BRAIN-TOUR] Verificando prerrequisitos para: ${tour.actionKey}`);

            const prereqResult = await BrainIntegration.verifyForTour(tour.actionKey);

            if (!prereqResult.canStartTour) {
                console.log('🚫 [BRAIN-TOUR] Prerrequisitos faltantes');
                this._showPrerequisiteModal(tour, prereqResult);
                return false;
            }

            console.log('✅ [BRAIN-TOUR] Prerrequisitos OK');
        }

        this.currentTour = tour;
        this.currentStepIndex = 0;
        this.isActive = true;
        this._draggedPosition = false; // Reset posición de arrastre

        console.log(`🚀 [BRAIN-TOUR] INICIANDO TOUR: ${tour.name} (${tour.steps.length} pasos)`);

        this._showOverlay();
        await this._showStep(this.currentStepIndex);

        console.log(`✅ [BRAIN-TOUR] Tour iniciado correctamente`);
        return true;
    },

    /**
     * 🧠 Mostrar modal de prerrequisitos faltantes
     */
    _showPrerequisiteModal(tour, prereqResult) {
        // Usar BrainIntegration si está disponible
        if (typeof BrainIntegration !== 'undefined' && BrainIntegration.showMissingPrerequisitesModal) {
            BrainIntegration.showMissingPrerequisitesModal({
                action: tour.actionKey,
                actionName: tour.name,
                summary: {
                    emoji: '⚠️',
                    title: 'Configuración requerida',
                    message: prereqResult.message
                },
                missing: prereqResult.missingSteps?.map(s => ({
                    description: s.description,
                    howToFix: s.howToFix,
                    relatedModule: s.module
                })) || []
            }, () => {
                // Callback: reintentar el tour
                this._runTour(tour);
            });
            return;
        }

        // Fallback: alert simple
        const message = `Para completar "${tour.name}" necesitas:\n\n` +
            prereqResult.missingSteps?.map((s, i) => `${i + 1}. ${s.description}`).join('\n') +
            `\n\n${prereqResult.suggestion || 'Completa estos pasos y vuelve a intentar.'}`;

        alert(message);
    },

    async _showStep(index) {
        console.log(`📍 [BRAIN-TOUR] _showStep(${index}) iniciando...`);

        if (!this.currentTour || index >= this.currentTour.steps.length) {
            console.log('🏁 [BRAIN-TOUR] No hay más pasos, finalizando tour');
            this._endTour();
            return;
        }

        const step = this.currentTour.steps[index];
        console.log(`📍 [BRAIN-TOUR] Paso ${index + 1}/${this.currentTour.steps.length}: ${step.id || step.title}`);

        // 🧠 EJECUTAR PREACTION ANTES DE MOSTRAR EL PASO
        if (step.preAction) {
            console.log(`🎬 [BRAIN-TOUR] Ejecutando preAction: ${step.preAction.type} -> ${step.preAction.target || step.preAction.module || ''}`);
            try {
                await this._executePreAction(step.preAction);
                console.log(`✅ [BRAIN-TOUR] preAction completado`);
            } catch (err) {
                console.error(`❌ [BRAIN-TOUR] Error en preAction:`, err);
            }
        }

        // Scroll al inicio del contenido
        await new Promise(r => setTimeout(r, 200));
        this._scrollToTop();

        // Compatibilidad: usar 'target' o 'element'
        let element = this._findElement(step.target || step.element);

        // Si no encontramos el elemento, esperar un poco (el DOM puede estar cargando)
        if (!element && step.target) {
            console.log(`⏳ [BRAIN-TOUR] Esperando elemento: ${step.target}`);
            element = await this._waitForElement(step.target || step.element, step.timeout || 3000);
        }

        // Scroll al elemento target si existe
        if (element) {
            this._highlightElement(element);
        }

        // Mostrar tooltip SIEMPRE (centrado si no hay elemento)
        this._showTooltip(step, element, index);
        console.log(`✅ [BRAIN-TOUR] Paso ${index + 1} mostrado correctamente`);
    },

    /**
     * Esperar a que un elemento aparezca en el DOM
     */
    async _waitForElement(selector, timeout = 3000) {
        const startTime = Date.now();
        const selectors = selector.split(',').map(s => s.trim());

        while (Date.now() - startTime < timeout) {
            for (const sel of selectors) {
                try {
                    const el = document.querySelector(sel);
                    if (el && el.offsetParent !== null) {
                        console.log(`✅ [BRAIN-TOUR] Elemento encontrado: ${sel}`);
                        return el;
                    }
                } catch (e) { /* selector inválido */ }
            }
            await new Promise(r => setTimeout(r, 200));
        }

        console.log(`❌ [BRAIN-TOUR] Timeout esperando: ${selector}`);
        return null;
    },

    /**
     * 🧠 Ejecutar acciones previas al paso (navegación, clicks, etc.)
     */
    async _executePreAction(preAction) {
        const waitTime = preAction.waitAfter || 1000;

        try {
            switch (preAction.type) {
                case 'navigate':
                    // Navegar a un módulo usando showModuleContent
                    if (typeof window.showModuleContent === 'function') {
                        console.log(`📂 [BRAIN-TOUR] Navegando a: ${preAction.module}`);
                        window.showModuleContent(preAction.module, preAction.moduleName || preAction.module);
                    } else if (typeof window.loadModule === 'function') {
                        window.loadModule(preAction.module);
                    } else {
                        console.warn('[BRAIN-TOUR] No se encontró función de navegación');
                    }
                    break;

                case 'click':
                    console.log(`🖱️ [BRAIN-TOUR] Click: ${preAction.target}`);

                    // ABRIR USUARIO - Estrategia simple y directa
                    if (preAction.target.includes('.users-action-btn.view')) {
                        const btn = document.querySelector('.users-table tbody tr:nth-child(2) .users-action-btn.view');
                        if (btn) {
                            console.log('🖱️ [BRAIN-TOUR] Haciendo click en botón Ver...');
                            btn.click();

                            // Esperar a que el modal aparezca
                            await new Promise(r => setTimeout(r, 1500));
                            const modal = document.getElementById('employeeFileModal');
                            if (modal) {
                                console.log('✅ [BRAIN-TOUR] Modal abierto correctamente');
                                // Scroll al inicio del modal
                                this._scrollToTop();
                            } else {
                                console.warn('⚠️ [BRAIN-TOUR] Modal no apareció');
                            }
                        } else {
                            console.warn('❌ [BRAIN-TOUR] Botón Ver no encontrado');
                        }
                    }
                    // CAMBIAR TAB - Click directo en el botón del tab
                    else if (preAction.target.includes('.file-tab:nth-child')) {
                        const match = preAction.target.match(/nth-child\((\d+)\)/);
                        if (match) {
                            const tabIndex = parseInt(match[1]);
                            console.log(`📑 [BRAIN-TOUR] Buscando tab ${tabIndex}...`);

                            // Buscar el botón del tab y hacer click
                            const tabs = document.querySelectorAll('#employeeFileModal .file-tab, .file-tabs-container .file-tab');
                            if (tabs.length >= tabIndex) {
                                const tab = tabs[tabIndex - 1];
                                tab.click();
                                console.log(`✅ [BRAIN-TOUR] Click en tab ${tabIndex}`);
                            } else {
                                console.warn(`❌ [BRAIN-TOUR] Tab ${tabIndex} no encontrado (hay ${tabs.length} tabs)`);
                            }

                            // Esperar y hacer scroll al inicio
                            await new Promise(r => setTimeout(r, 500));
                            this._scrollToTop();
                        }
                    }
                    // CUALQUIER OTRO CLICK
                    else {
                        const el = document.querySelector(preAction.target);
                        if (el) {
                            el.click();
                            console.log(`✅ [BRAIN-TOUR] Click ejecutado`);
                        } else {
                            console.warn(`❌ [BRAIN-TOUR] Elemento NO encontrado: ${preAction.target}`);
                        }
                    }
                    break;

                case 'switchTab':
                    // Cambiar pestaña en modal (deprecated, usar 'click')
                    const tabTarget = await this._waitForElement(preAction.target, 2000);
                    if (tabTarget) {
                        console.log(`📑 [BRAIN-TOUR] Cambiando tab: ${preAction.target}`);
                        tabTarget.click();
                    } else {
                        console.warn(`❌ [BRAIN-TOUR] Tab no encontrado: ${preAction.target}`);
                    }
                    break;

                case 'closeModal':
                    // Cerrar modal activo - buscar varios selectores
                    console.log(`🔍 [BRAIN-TOUR] Buscando botón cerrar modal...`);
                    const closeSelectors = [
                        '[onclick*="closeEmployeeFile"]', // Botón X del modal de usuarios
                        '#employeeFileModal button[onclick]', // Cualquier botón con onclick en el modal
                        '.employee-file-modal .close-modal-btn',
                        '.modal .close-btn',
                        '.modal-close',
                        '.btn-close',
                        '[onclick*="closeModal"]',
                        '.modal-header button[aria-label="Close"]'
                    ];
                    let closeBtn = null;
                    for (const sel of closeSelectors) {
                        closeBtn = document.querySelector(sel);
                        if (closeBtn) {
                            console.log(`✅ [BRAIN-TOUR] Encontrado botón cerrar: ${sel}`);
                            break;
                        }
                    }
                    if (closeBtn) {
                        closeBtn.click();
                        console.log(`✅ [BRAIN-TOUR] Modal cerrado con click`);
                    } else {
                        // Fallback: llamar función directamente
                        if (typeof window.closeEmployeeFile === 'function') {
                            window.closeEmployeeFile();
                            console.log(`✅ [BRAIN-TOUR] Modal cerrado con closeEmployeeFile()`);
                        } else {
                            // Fallback 2: ocultar modal directamente
                            const modal = document.querySelector('#employeeFileModal, .employee-file-modal');
                            if (modal) {
                                modal.remove();
                                console.log(`✅ [BRAIN-TOUR] Modal removido (fallback)`);
                            }
                        }
                    }
                    break;

                case 'scroll':
                    // Scroll a elemento
                    const scrollTarget = document.querySelector(preAction.target);
                    if (scrollTarget) {
                        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    break;

                case 'input':
                    // Escribir en input
                    const inputTarget = document.querySelector(preAction.target);
                    if (inputTarget && preAction.value) {
                        inputTarget.value = preAction.value;
                        inputTarget.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    break;

                default:
                    console.log(`[BRAIN-TOUR] PreAction desconocido: ${preAction.type}`);
            }
        } catch (e) {
            console.error('[BRAIN-TOUR] Error ejecutando preAction:', e);
        }

        // Esperar para que la UI se actualice
        await new Promise(resolve => setTimeout(resolve, waitTime));
    },

    _findElement(selector) {
        if (!selector) return null;

        // El selector puede ser multiple separado por comas
        const selectors = selector.split(',').map(s => s.trim());

        for (const sel of selectors) {
            try {
                const el = document.querySelector(sel);
                if (el && el.offsetParent !== null) {
                    return el;
                }
            } catch (e) {
                // Selector invalido, ignorar
            }
        }

        return null;
    },

    _highlightElement(element) {
        // Spotlight eliminado - solo hacemos scroll al elemento
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    _hideSpotlight() {
        // Spotlight eliminado
    },

    _showTooltip(step, element, index) {
        const total = this.currentTour.steps.length;
        const isLastStep = index === total - 1;
        const progress = this.config.showProgress ?
            `<div class="brain-tour-progress">${index + 1} / ${total}</div>` : '';

        const closeBtn = this.config.showCloseButton ?
            `<button class="brain-tour-close" onclick="BrainTourGuide._endTour()">&times;</button>` : '';

        const actionIcon = this._getActionIcon(step.action);

        // Compatibilidad: usar 'content' o 'description' (nunca undefined)
        const stepDescription = step.content || step.description || 'Continúa con el siguiente paso.';
        const stepTitle = step.title || `Paso ${index + 1}`;

        // Mostrar tips si existen
        const tips = Array.isArray(step.tips) && step.tips.length > 0
            ? `<div class="brain-tour-tips">
                ${step.tips.map(tip => `<div class="brain-tour-tip">💡 ${tip || ''}</div>`).join('')}
               </div>`
            : '';

        this.tooltip.innerHTML = `
            <div class="brain-tour-drag-handle" title="Arrastra para mover"></div>
            ${closeBtn}
            ${progress}
            <div class="brain-tour-icon">${actionIcon}</div>
            <h4 class="brain-tour-title">${stepTitle}</h4>
            <p class="brain-tour-description">${stepDescription}</p>
            ${tips}
            <div class="brain-tour-buttons">
                ${index > 0 ? '<button class="brain-tour-btn brain-tour-prev">Anterior</button>' : ''}
                ${isLastStep ?
                    '<button class="brain-tour-btn brain-tour-finish">Finalizar</button>' :
                    '<button class="brain-tour-btn brain-tour-next">Siguiente</button>'
                }
            </div>
        `;

        // Habilitar drag en el tooltip
        this._enableDrag();

        // Posicionar tooltip
        this._positionTooltip(element, step.position);
        this.tooltip.style.display = 'block';
        this.tooltip.style.zIndex = '999999'; // Forzar z-index máximo
        console.log(`🎫 [BRAIN-TOUR] Tooltip mostrado - posición: ${this.tooltip.style.top}, ${this.tooltip.style.left}`);

        // Bind eventos de botones (async)
        const prevBtn = this.tooltip.querySelector('.brain-tour-prev');
        const nextBtn = this.tooltip.querySelector('.brain-tour-next');
        const finishBtn = this.tooltip.querySelector('.brain-tour-finish');

        if (prevBtn) prevBtn.onclick = () => {
            console.log('⬅️ [BRAIN-TOUR] Botón Anterior clickeado');
            this.prevStep();
        };
        if (nextBtn) nextBtn.onclick = () => {
            console.log('➡️ [BRAIN-TOUR] Botón Siguiente clickeado');
            this.nextStep();
        };
        if (finishBtn) finishBtn.onclick = () => {
            console.log('🏁 [BRAIN-TOUR] Botón Finalizar clickeado');
            this._endTour();
        };
    },

    _positionTooltip(element, position = 'bottom') {
        // Posicionar en esquina inferior derecha por defecto
        // Si el usuario lo arrastró, mantener esa posición
        const tooltip = this.tooltip;

        if (!this._draggedPosition) {
            // Posición inicial: esquina inferior derecha
            tooltip.style.top = 'auto';
            tooltip.style.left = 'auto';
            tooltip.style.bottom = '20px';
            tooltip.style.right = '20px';
        }
        // Si fue arrastrado, mantener la posición donde lo dejó el usuario
    },

    /**
     * Habilitar arrastre del tooltip
     */
    _enableDrag() {
        const tooltip = this.tooltip;
        const handle = tooltip.querySelector('.brain-tour-drag-handle');
        if (!handle) return;

        let isDragging = false;
        let startX, startY, initialX, initialY;

        const onMouseDown = (e) => {
            // Solo arrastrar desde el handle o el borde superior
            if (e.target.closest('.brain-tour-btn') || e.target.closest('.brain-tour-close')) return;

            isDragging = true;
            tooltip.classList.add('dragging');

            // Obtener posición actual del tooltip
            const rect = tooltip.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialX = rect.left;
            initialY = rect.top;

            // Cambiar a posicionamiento top/left para el drag
            tooltip.style.bottom = 'auto';
            tooltip.style.right = 'auto';
            tooltip.style.top = initialY + 'px';
            tooltip.style.left = initialX + 'px';

            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            let newX = initialX + deltaX;
            let newY = initialY + deltaY;

            // Limitar a los bordes de la pantalla
            const tooltipRect = tooltip.getBoundingClientRect();
            newX = Math.max(0, Math.min(newX, window.innerWidth - tooltipRect.width));
            newY = Math.max(0, Math.min(newY, window.innerHeight - tooltipRect.height));

            tooltip.style.left = newX + 'px';
            tooltip.style.top = newY + 'px';
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                tooltip.classList.remove('dragging');
                this._draggedPosition = true; // Marcar que fue arrastrado
            }
        };

        // Remover listeners anteriores si existen
        handle.onmousedown = onMouseDown;
        tooltip.onmousedown = (e) => {
            if (e.target === tooltip || e.target.classList.contains('brain-tour-drag-handle')) {
                onMouseDown(e);
            }
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Soporte táctil (móviles)
        handle.ontouchstart = (e) => {
            const touch = e.touches[0];
            onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
        };
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        });
        document.addEventListener('touchend', onMouseUp);
    },

    /**
     * Scroll al inicio - Simple y directo
     */
    _scrollToTop() {
        // 1. Buscar el contenedor scrollable del modal de empleado
        const modal = document.getElementById('employeeFileModal');
        if (modal) {
            // El contenedor scrollable está después del banner (tiene overflow-y: auto)
            const scrollableContainer = modal.querySelector('[style*="overflow-y: auto"], [style*="overflow-y:auto"]');
            if (scrollableContainer) {
                scrollableContainer.scrollTop = 0;
                console.log('📜 [BRAIN-TOUR] Scroll to top: modal scrollable container');
                return;
            }

            // Fallback: buscar el contenedor que tiene los tabs
            const tabContentContainer = modal.querySelector('.file-tab-content')?.parentElement;
            if (tabContentContainer) {
                tabContentContainer.scrollTop = 0;
                console.log('📜 [BRAIN-TOUR] Scroll to top: tab content parent');
                return;
            }
        }

        // 2. Contenedor principal
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }

        // 3. Window
        window.scrollTo(0, 0);
        console.log('📜 [BRAIN-TOUR] Scroll to top ejecutado');
    },

    /**
     * Verificar el estado actual de la UI y sincronizar
     */
    _verifyUIState() {
        const state = {
            activeModule: null,
            modalOpen: false,
            modalType: null,
            activeTab: null
        };

        // Detectar módulo activo
        const moduleContent = document.querySelector('.module-content[style*="display: block"], .module-content:not([style*="display: none"])');
        if (moduleContent) {
            state.activeModule = moduleContent.id || moduleContent.dataset.module;
        }

        // Detectar modal abierto
        const modal = document.querySelector('#employeeFileModal[style*="display: block"], .employee-file-modal:not([style*="display: none"])');
        if (modal) {
            state.modalOpen = true;
            state.modalType = 'employee-file';

            // Detectar tab activo en el modal
            const activeTabBtn = modal.querySelector('.file-tab.active, .tab-btn.active');
            if (activeTabBtn) {
                state.activeTab = activeTabBtn.dataset.tab || activeTabBtn.textContent.trim();
            }
        }

        console.log('🔍 [BRAIN-TOUR] Estado UI:', state);
        return state;
    },

    _getActionIcon(action) {
        const icons = {
            'highlight': '👆',
            'click': '🖱️',
            'input': '⌨️',
            'select': '📋',
            'search': '🔍',
            'info': 'ℹ️',
            'warning': '⚠️'
        };
        return icons[action] || '💡';
    },

    /**
     * ========================================================================
     * NAVEGACION
     * ========================================================================
     */

    async nextStep() {
        // Prevenir múltiples clicks seguidos
        if (this._isNavigating) {
            console.log('⏳ [BRAIN-TOUR] Navegación en progreso, ignorando...');
            return;
        }
        this._isNavigating = true;

        try {
            console.log(`➡️ [BRAIN-TOUR] nextStep: ${this.currentStepIndex} -> ${this.currentStepIndex + 1}`);
            if (this.currentStepIndex < this.currentTour.steps.length - 1) {
                this.currentStepIndex++;
                await this._showStep(this.currentStepIndex);
            } else {
                this._endTour();
            }
        } catch (err) {
            console.error('❌ [BRAIN-TOUR] Error en nextStep:', err);
        } finally {
            this._isNavigating = false;
        }
    },

    async prevStep() {
        // Prevenir múltiples clicks seguidos
        if (this._isNavigating) return;
        this._isNavigating = true;

        try {
            console.log(`⬅️ [BRAIN-TOUR] prevStep: ${this.currentStepIndex} -> ${this.currentStepIndex - 1}`);
            if (this.currentStepIndex > 0) {
                this.currentStepIndex--;
                await this._showStep(this.currentStepIndex);
            }
        } catch (err) {
            console.error('❌ [BRAIN-TOUR] Error en prevStep:', err);
        } finally {
            this._isNavigating = false;
        }
    },

    skipTour() {
        this._endTour(true);
    },

    _endTour(skipped = false) {
        this.isActive = false;
        this._hideOverlay();
        this._hideSpotlight();
        this.tooltip.style.display = 'none';

        if (this.currentTour) {
            console.log(`[BRAIN-TOUR] ${skipped ? 'Saltado' : 'Finalizado'}: ${this.currentTour.name}`);

            // Guardar progreso (opcional)
            this._saveProgress(skipped);
        }

        this.currentTour = null;
        this.currentStepIndex = 0;
    },

    async _saveProgress(skipped) {
        // Obtener userId del contexto global (si existe)
        const userId = window.currentUser?.id || window.userId;
        if (!userId || !this.currentTour) return;

        try {
            await fetch(`${this.config.apiBaseUrl}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    tourId: this.currentTour.id,
                    completedSteps: this.currentTour.steps.slice(0, this.currentStepIndex + 1).map(s => s.id),
                    isCompleted: !skipped && this.currentStepIndex === this.currentTour.steps.length - 1
                })
            });
        } catch (e) {
            // Ignorar errores de guardado
        }
    },

    /**
     * ========================================================================
     * UI ELEMENTS
     * ========================================================================
     */

    _showOverlay() {
        // Overlay deshabilitado - no bloquea nada
    },

    _hideOverlay() {
        // Overlay deshabilitado
    },

    _createElements() {
        // Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'brain-tour-overlay';
        document.body.appendChild(this.overlay);

        // Spotlight
        this.spotlight = document.createElement('div');
        this.spotlight.className = 'brain-tour-spotlight';
        document.body.appendChild(this.spotlight);

        // Tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'brain-tour-tooltip';
        document.body.appendChild(this.tooltip);
    },

    _createStyles() {
        if (document.getElementById('brain-tour-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'brain-tour-styles';
        styles.textContent = `
            .brain-tour-overlay {
                display: none;
                /* Overlay invisible, no bloquea nada */
            }

            .brain-tour-spotlight {
                display: none !important;
                /* Spotlight eliminado */
            }

            .brain-tour-tooltip {
                display: none;
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                top: auto !important;
                left: auto !important;
                max-width: 280px;
                min-width: 200px;
                background: linear-gradient(135deg, #1e3a5f 0%, #0d1f33 100%);
                border: 2px solid #00d4ff;
                border-radius: 10px;
                padding: 12px 15px;
                color: white;
                font-size: 13px;
                z-index: 999999 !important;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
                pointer-events: auto;
                cursor: move;
                user-select: none;
            }

            .brain-tour-tooltip.dragging {
                opacity: 0.9;
                box-shadow: 0 10px 30px rgba(0, 212, 255, 0.4);
            }

            .brain-tour-drag-handle {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 25px;
                cursor: move;
                border-radius: 8px 8px 0 0;
                background: linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.1) 50%, transparent 100%);
            }

            .brain-tour-drag-handle::before {
                content: '⋮⋮';
                position: absolute;
                left: 50%;
                top: 5px;
                transform: translateX(-50%);
                color: #00d4ff;
                font-size: 10px;
                letter-spacing: 2px;
                opacity: 0.6;
            }

            @keyframes brainTourFadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .brain-tour-close {
                position: absolute;
                top: 5px;
                right: 8px;
                background: transparent;
                border: none;
                color: #00d4ff;
                font-size: 16px;
                cursor: pointer;
            }

            .brain-tour-progress {
                font-size: 10px;
                color: #00d4ff;
                margin-bottom: 5px;
            }

            .brain-tour-icon {
                display: none; /* Ocultar icono para ahorrar espacio */
            }

            .brain-tour-title {
                margin: 0 0 5px 0;
                font-size: 14px;
                color: #00d4ff;
            }

            .brain-tour-description {
                margin: 0 0 8px 0;
                font-size: 12px;
                line-height: 1.4;
                color: #e0e0e0;
            }

            .brain-tour-tips {
                display: none; /* Ocultar tips para ahorrar espacio */
            }

            .brain-tour-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            }

            .brain-tour-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
            }

            .brain-tour-prev {
                background: transparent;
                border: 1px solid #00d4ff;
                color: #00d4ff;
            }

            .brain-tour-prev:hover {
                background: rgba(0, 212, 255, 0.1);
            }

            .brain-tour-next,
            .brain-tour-finish {
                background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
                color: #0d1f33;
            }

            .brain-tour-next:hover,
            .brain-tour-finish:hover {
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(0, 212, 255, 0.4);
            }

            /* Tour launcher button (optional floating button) */
            .brain-tour-launcher {
                position: fixed;
                bottom: 100px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #00d4ff 0%, #0088cc 100%);
                border: none;
                cursor: pointer;
                z-index: 9999;
                box-shadow: 0 5px 20px rgba(0, 212, 255, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
            }

            .brain-tour-launcher:hover {
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(styles);
    },

    _bindEvents() {
        // Keyboard navigation (solo flechas, NO Enter para evitar duplicados con botones)
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;

            switch (e.key) {
                case 'ArrowRight':
                    this.nextStep();
                    break;
                case 'ArrowLeft':
                    this.prevStep();
                    break;
                case 'Escape':
                    this.skipTour();
                    break;
            }
        });

        // Resize handler
        window.addEventListener('resize', () => {
            if (this.isActive) {
                this._showStep(this.currentStepIndex);
            }
        });
    },

    /**
     * ========================================================================
     * UI HELPERS
     * ========================================================================
     */

    /**
     * Crear boton flotante para acceder a tours
     */
    createLauncherButton() {
        const btn = document.createElement('button');
        btn.className = 'brain-tour-launcher';
        btn.innerHTML = '🎯';
        btn.title = 'Tours Guiados';
        btn.onclick = () => this.showTourSelector();
        document.body.appendChild(btn);
        return btn;
    },

    /**
     * Mostrar selector de tours
     */
    async showTourSelector() {
        const tours = await this.getAvailableTours();
        if (!tours.length) {
            alert('No hay tours disponibles');
            return;
        }

        // Crear modal simple
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1e3a5f 0%, #0d1f33 100%);
            border: 2px solid #00d4ff;
            border-radius: 12px;
            padding: 30px;
            z-index: 99999;
            max-height: 80vh;
            overflow-y: auto;
            min-width: 400px;
        `;

        modal.innerHTML = `
            <h3 style="color: #00d4ff; margin: 0 0 20px 0; text-align: center;">
                🎯 Tours Guiados Disponibles
            </h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${tours.map(t => `
                    <button onclick="BrainTourGuide.startTour('${t.id}'); this.closest('div').parentElement.remove();"
                        style="padding: 15px; background: rgba(0, 212, 255, 0.1); border: 1px solid #00d4ff;
                               border-radius: 8px; color: white; cursor: pointer; text-align: left;">
                        <strong style="color: #00d4ff;">${t.name}</strong><br>
                        <small>${t.description || ''}</small><br>
                        <span style="font-size: 11px; opacity: 0.7;">${t.estimatedTime}</span>
                    </button>
                `).join('')}
            </div>
            <button onclick="this.parentElement.remove()"
                style="margin-top: 20px; width: 100%; padding: 10px; background: transparent;
                       border: 1px solid #666; color: #aaa; border-radius: 6px; cursor: pointer;">
                Cerrar
            </button>
        `;

        // Overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: transparent;
            z-index: 99998;
        `;
        overlay.onclick = () => { overlay.remove(); modal.remove(); };

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }
};

// Auto-init si no se hace manualmente
if (typeof window !== 'undefined') {
    window.BrainTourGuide = BrainTourGuide;
}
