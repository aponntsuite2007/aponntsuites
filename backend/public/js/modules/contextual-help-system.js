/**
 * CONTEXTUAL HELP SYSTEM v2.1
 * Sistema de ayuda contextual con Ollama AI
 *
 * Features v2.1:
 * - ✅ Botón DRAGGABLE (arrastrable) para no tapar contenido
 * - ✅ Detección correcta de Ollama (fixed: available vs isAvailable)
 * - ✅ Burbujas emergentes proactivas al cambiar de módulo
 * - Detección automática de módulo activo (integrado con showTab)
 * - Tooltips contextuales
 * - Integración con Ollama para preguntas en tiempo real
 * - Verificación de dependencias de módulos
 *
 * @version 2.1
 * @date 2025-12-06
 */

window.ContextualHelpSystem = (function() {
    'use strict';

    // Estado del sistema
    const state = {
        isInitialized: false,
        isHelpPanelOpen: false,
        currentModule: null,
        currentScreen: 'main',
        moduleHelp: null,
        ollamaAvailable: false,
        conversationHistory: [],
        isTyping: false,
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
        buttonPosition: { bottom: 100, right: 20 },
        shownBubbles: new Set(), // Para no repetir burbujas
        lastModuleChange: null
    };

    // Configuración
    const config = {
        apiBase: '/api/v1/help',
        bubbleDelay: 1500,
        tooltipDelay: 300,
        bubbleAutoCloseDelay: 8000
    };

    /**
     * Inicializar sistema de ayuda
     */
    function init() {
        if (state.isInitialized) return;

        // Crear elementos UI
        createHelpButton();
        createHelpPanel();
        createTooltipContainer();
        createBubbleContainer();

        // Detectar módulo actual
        detectCurrentModule();

        // Verificar estado de Ollama
        checkOllamaStatus();

        // Observar cambios de ruta
        observeRouteChanges();

        // Agregar estilos
        addStyles();

        state.isInitialized = true;
        console.log('💡 [HELP v2.1] Sistema de ayuda contextual inicializado');
    }

    /**
     * Agregar estilos CSS
     */
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -100%) translateY(10px); }
                to { opacity: 1; transform: translate(-50%, -100%) translateY(0); }
            }
            @keyframes pulse {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 1; }
            }
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(50px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes bounceIn {
                0% { transform: scale(0.5); opacity: 0; }
                60% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
            }
            .help-bubble-container {
                position: fixed;
                z-index: 9997;
                pointer-events: none;
            }
            .help-bubble {
                position: fixed;
                max-width: 320px;
                padding: 15px 20px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(155, 89, 182, 0.4);
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                color: #e0e0e0;
                font-size: 0.85rem;
                line-height: 1.5;
                animation: slideInRight 0.4s ease;
                pointer-events: auto;
            }
            .help-bubble::before {
                content: '';
                position: absolute;
                right: -8px;
                top: 20px;
                width: 0;
                height: 0;
                border-top: 8px solid transparent;
                border-bottom: 8px solid transparent;
                border-left: 8px solid rgba(155, 89, 182, 0.4);
            }
            .help-bubble-close {
                position: absolute;
                top: 5px;
                right: 8px;
                background: transparent;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 0.9rem;
                padding: 2px 6px;
            }
            .help-bubble-close:hover {
                color: #e74c3c;
            }
            .help-float-btn {
                position: fixed;
                width: 55px;
                height: 55px;
                background: linear-gradient(135deg, #9b59b6, #8e44ad);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: grab;
                box-shadow: 0 4px 20px rgba(155, 89, 182, 0.4);
                z-index: 9998;
                transition: box-shadow 0.3s ease;
                user-select: none;
            }
            .help-float-btn:hover {
                box-shadow: 0 6px 30px rgba(155, 89, 182, 0.6);
            }
            .help-float-btn:active {
                cursor: grabbing;
            }
            .help-float-btn.dragging {
                cursor: grabbing;
                box-shadow: 0 8px 40px rgba(155, 89, 182, 0.8);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Crear botón flotante de ayuda (DRAGGABLE)
     */
    function createHelpButton() {
        const button = document.createElement('div');
        button.id = 'help-float-button';
        button.className = 'help-float-btn';
        button.style.bottom = state.buttonPosition.bottom + 'px';
        button.style.right = state.buttonPosition.right + 'px';
        button.innerHTML = `
            <i class="fas fa-question" style="color: white; font-size: 1.3rem; pointer-events: none;"></i>
            <div id="help-notification-badge" style="
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: #e74c3c;
                border-radius: 50%;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 0.65rem;
                color: white;
                font-weight: bold;
                pointer-events: none;
            ">!</div>
        `;

        // Eventos de drag
        button.addEventListener('mousedown', startDrag);
        button.addEventListener('touchstart', startDrag, { passive: false });

        // Click solo si no fue drag
        button.addEventListener('click', (e) => {
            if (!state.wasDragged) {
                toggleHelpPanel();
            }
            state.wasDragged = false;
        });

        document.body.appendChild(button);

        // Eventos globales para drag
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }

    /**
     * Iniciar arrastre
     */
    function startDrag(e) {
        e.preventDefault();
        state.isDragging = true;
        state.wasDragged = false;

        const button = document.getElementById('help-float-button');
        button.classList.add('dragging');

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = button.getBoundingClientRect();
        state.dragOffset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    /**
     * Arrastrar
     */
    function drag(e) {
        if (!state.isDragging) return;
        e.preventDefault();
        state.wasDragged = true;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const button = document.getElementById('help-float-button');
        const panel = document.querySelector('#help-panel > div');

        // Calcular nueva posición
        const newRight = window.innerWidth - clientX - (55 - state.dragOffset.x);
        const newBottom = window.innerHeight - clientY - (55 - state.dragOffset.y);

        // Limitar dentro de la pantalla
        const boundedRight = Math.max(10, Math.min(window.innerWidth - 65, newRight));
        const boundedBottom = Math.max(10, Math.min(window.innerHeight - 65, newBottom));

        button.style.right = boundedRight + 'px';
        button.style.bottom = boundedBottom + 'px';

        // Actualizar posición del panel
        if (panel) {
            panel.style.right = boundedRight + 'px';
            panel.style.bottom = (boundedBottom + 70) + 'px';
        }

        state.buttonPosition = { right: boundedRight, bottom: boundedBottom };
    }

    /**
     * Detener arrastre
     */
    function stopDrag() {
        if (!state.isDragging) return;
        state.isDragging = false;

        const button = document.getElementById('help-float-button');
        button.classList.remove('dragging');
    }

    /**
     * Crear contenedor de burbujas emergentes
     */
    function createBubbleContainer() {
        const container = document.createElement('div');
        container.id = 'help-bubble-container';
        container.className = 'help-bubble-container';
        document.body.appendChild(container);
    }

    /**
     * Mostrar burbuja emergente proactiva
     */
    function showProactiveBubble(message, options = {}) {
        const container = document.getElementById('help-bubble-container');
        if (!container) return;

        // Evitar duplicados
        const bubbleKey = options.key || message.substring(0, 30);
        if (state.shownBubbles.has(bubbleKey)) return;
        state.shownBubbles.add(bubbleKey);

        const button = document.getElementById('help-float-button');
        const buttonRect = button.getBoundingClientRect();

        const bubble = document.createElement('div');
        bubble.className = 'help-bubble';
        bubble.style.right = (window.innerWidth - buttonRect.left + 15) + 'px';
        bubble.style.top = buttonRect.top + 'px';

        bubble.innerHTML = `
            <button class="help-bubble-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="
                    width: 35px;
                    height: 35px;
                    background: linear-gradient(135deg, #9b59b6, #8e44ad);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    <i class="fas ${options.icon || 'fa-lightbulb'}" style="color: white; font-size: 0.9rem;"></i>
                </div>
                <div>
                    ${options.title ? `<strong style="color: #9b59b6; display: block; margin-bottom: 5px;">${options.title}</strong>` : ''}
                    <span>${message}</span>
                    ${options.action ? `
                        <button onclick="${options.action.handler}" style="
                            margin-top: 10px;
                            padding: 6px 12px;
                            background: linear-gradient(135deg, #9b59b6, #8e44ad);
                            border: none;
                            border-radius: 5px;
                            color: white;
                            cursor: pointer;
                            font-size: 0.75rem;
                        ">${options.action.text}</button>
                    ` : ''}
                </div>
            </div>
        `;

        container.appendChild(bubble);

        // Auto-cerrar
        setTimeout(() => {
            if (bubble.parentElement) {
                bubble.style.opacity = '0';
                bubble.style.transform = 'translateX(50px)';
                bubble.style.transition = 'all 0.3s ease';
                setTimeout(() => bubble.remove(), 300);
            }
        }, options.duration || config.bubbleAutoCloseDelay);
    }

    /**
     * Mostrar burbujas de bienvenida al módulo
     */
    function showModuleWelcomeBubble(moduleKey) {
        // Esperar un poco para no interrumpir la carga
        setTimeout(() => {
            const welcomeMessages = {
                'users': {
                    title: '👥 Gestión de Usuarios',
                    message: 'Aquí puedes agregar, editar y gestionar empleados. ¿Necesitas ayuda para empezar?',
                    icon: 'fa-users'
                },
                'attendance': {
                    title: '⏰ Control de Asistencia',
                    message: 'Visualiza fichajes, genera reportes y gestiona ausencias.',
                    icon: 'fa-clock'
                },
                'vacation-management': {
                    title: '🏖️ Vacaciones y Licencias',
                    message: 'Gestiona solicitudes de vacaciones y aprueba licencias.',
                    icon: 'fa-umbrella-beach'
                },
                'payroll-liquidation': {
                    title: '💰 Liquidación de Sueldos',
                    message: 'Calcula sueldos, conceptos y genera recibos.',
                    icon: 'fa-money-bill-wave'
                },
                'sanctions-management': {
                    title: '⚠️ Gestión de Sanciones',
                    message: 'Crea y gestiona sanciones con workflow de aprobación.',
                    icon: 'fa-gavel'
                },
                'organizational': {
                    title: '🏢 Estructura Organizacional',
                    message: 'Configura departamentos, sucursales, turnos y más.',
                    icon: 'fa-building'
                },
                'roles-permissions': {
                    title: '🔐 Roles y Permisos',
                    message: 'Define roles y controla el acceso a módulos.',
                    icon: 'fa-lock'
                },
                'medical-dashboard': {
                    title: '🏥 Salud Ocupacional',
                    message: 'Gestiona exámenes médicos y fichas de salud.',
                    icon: 'fa-heartbeat'
                }
            };

            const welcome = welcomeMessages[moduleKey];
            if (welcome) {
                showProactiveBubble(welcome.message, {
                    key: `welcome-${moduleKey}`,
                    title: welcome.title,
                    icon: welcome.icon,
                    action: {
                        text: '💡 Ver más ayuda',
                        handler: 'ContextualHelpSystem.toggleHelpPanel()'
                    }
                });
            }
        }, config.bubbleDelay);
    }

    /**
     * Crear panel de ayuda
     */
    function createHelpPanel() {
        const panel = document.createElement('div');
        panel.id = 'help-panel';
        panel.innerHTML = `
            <div style="
                position: fixed;
                bottom: ${state.buttonPosition.bottom + 70}px;
                right: ${state.buttonPosition.right}px;
                width: 380px;
                max-height: 500px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(155, 89, 182, 0.3);
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                z-index: 9999;
                display: none;
                flex-direction: column;
                overflow: hidden;
            ">
                <!-- Header -->
                <div style="
                    padding: 15px 20px;
                    background: linear-gradient(135deg, #9b59b6, #8e44ad);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <h4 style="margin: 0; color: white; font-size: 0.95rem;">
                            <i class="fas fa-life-ring"></i> Ayuda Contextual
                        </h4>
                        <span id="help-module-indicator" style="
                            font-size: 0.7rem;
                            color: rgba(255,255,255,0.8);
                        ">General</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span id="help-ollama-status" style="
                            font-size: 0.65rem;
                            padding: 3px 8px;
                            border-radius: 10px;
                            background: rgba(231, 76, 60, 0.3);
                            color: #e74c3c;
                        ">
                            <i class="fas fa-circle"></i> IA Offline
                        </span>
                        <button onclick="ContextualHelpSystem.toggleHelpPanel()" style="
                            background: transparent;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 1.1rem;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="
                    display: flex;
                    background: rgba(0,0,0,0.2);
                    padding: 5px;
                ">
                    <button class="help-tab active" data-tab="quick" onclick="ContextualHelpSystem.switchTab('quick')" style="
                        flex: 1;
                        padding: 8px;
                        background: rgba(155, 89, 182, 0.2);
                        border: none;
                        color: #9b59b6;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.75rem;
                    ">
                        <i class="fas fa-bolt"></i> Rápido
                    </button>
                    <button class="help-tab" data-tab="ask" onclick="ContextualHelpSystem.switchTab('ask')" style="
                        flex: 1;
                        padding: 8px;
                        background: transparent;
                        border: none;
                        color: #888;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.75rem;
                    ">
                        <i class="fas fa-robot"></i> Pregunta IA
                    </button>
                    <button class="help-tab" data-tab="deps" onclick="ContextualHelpSystem.switchTab('deps')" style="
                        flex: 1;
                        padding: 8px;
                        background: transparent;
                        border: none;
                        color: #888;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.75rem;
                    ">
                        <i class="fas fa-check-circle"></i> Estado
                    </button>
                </div>

                <!-- Content -->
                <div id="help-content" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                ">
                    <!-- Se llena dinámicamente -->
                </div>
            </div>
        `;
        document.body.appendChild(panel);
    }

    /**
     * Crear contenedor de tooltips
     */
    function createTooltipContainer() {
        const container = document.createElement('div');
        container.id = 'help-tooltip-container';
        container.style.cssText = `
            position: fixed;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    /**
     * Toggle panel de ayuda
     */
    function toggleHelpPanel() {
        const panel = document.querySelector('#help-panel > div');
        state.isHelpPanelOpen = !state.isHelpPanelOpen;
        panel.style.display = state.isHelpPanelOpen ? 'flex' : 'none';

        // Actualizar posición del panel
        panel.style.right = state.buttonPosition.right + 'px';
        panel.style.bottom = (state.buttonPosition.bottom + 70) + 'px';

        if (state.isHelpPanelOpen) {
            loadModuleHelp();
            switchTab('quick');
        }
    }

    /**
     * Cambiar tab
     */
    function switchTab(tabName) {
        document.querySelectorAll('.help-tab').forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.style.background = isActive ? 'rgba(155, 89, 182, 0.2)' : 'transparent';
            btn.style.color = isActive ? '#9b59b6' : '#888';
            btn.classList.toggle('active', isActive);
        });

        const content = document.getElementById('help-content');

        switch (tabName) {
            case 'quick':
                content.innerHTML = renderQuickHelpTab();
                break;
            case 'ask':
                content.innerHTML = renderAskTab();
                attachAskListeners();
                break;
            case 'deps':
                content.innerHTML = renderDependenciesTab();
                loadDependencies();
                break;
        }
    }

    /**
     * Renderizar tab de ayuda rápida
     */
    function renderQuickHelpTab() {
        if (!state.moduleHelp) {
            return `
                <div style="text-align: center; padding: 20px; color: #888;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p style="margin-top: 10px;">Cargando ayuda...</p>
                </div>
            `;
        }

        const help = state.moduleHelp;

        return `
            <div>
                <!-- Título del módulo -->
                <div style="margin-bottom: 15px;">
                    <h5 style="margin: 0; color: #9b59b6; font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> ${help.helpTitle || help.name || help.module_name || 'Ayuda'}
                    </h5>
                    <p style="margin: 5px 0 0; color: #aaa; font-size: 0.8rem; line-height: 1.4;">
                        ${help.helpDescription || help.description || 'Información del módulo actual.'}
                    </p>
                </div>

                <!-- Primeros pasos -->
                ${help.gettingStarted ? `
                    <div style="
                        margin-bottom: 15px;
                        padding: 12px;
                        background: rgba(46, 204, 113, 0.1);
                        border: 1px solid rgba(46, 204, 113, 0.2);
                        border-radius: 8px;
                    ">
                        <h6 style="margin: 0 0 8px; color: #2ecc71; font-size: 0.8rem;">
                            <i class="fas fa-rocket"></i> Primeros pasos
                        </h6>
                        <p style="margin: 0; color: #aaa; font-size: 0.75rem; line-height: 1.5;">
                            ${help.gettingStarted}
                        </p>
                    </div>
                ` : ''}

                <!-- Tareas comunes -->
                ${help.commonTasks && help.commonTasks.length > 0 ? `
                    <div style="margin-bottom: 15px;">
                        <h6 style="margin: 0 0 10px; color: #888; font-size: 0.8rem;">
                            <i class="fas fa-tasks"></i> Tareas Comunes
                        </h6>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${(Array.isArray(help.commonTasks) ? help.commonTasks : help.commonTasks.split('\n').filter(t => t.trim())).map(task => `
                                <div style="
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                    padding: 8px 12px;
                                    background: rgba(255,255,255,0.03);
                                    border-radius: 8px;
                                    color: #e0e0e0;
                                    font-size: 0.75rem;
                                ">
                                    <i class="fas fa-check" style="color: #3498db;"></i>
                                    ${typeof task === 'string' ? task.replace(/^[\-\*]\s*/, '') : task}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Tip del módulo -->
                <div style="
                    padding: 12px;
                    background: rgba(155, 89, 182, 0.1);
                    border: 1px solid rgba(155, 89, 182, 0.2);
                    border-radius: 8px;
                ">
                    <h6 style="margin: 0 0 8px; color: #9b59b6; font-size: 0.8rem;">
                        <i class="fas fa-lightbulb"></i> Tip
                    </h6>
                    <p style="margin: 0; color: #aaa; font-size: 0.75rem;">
                        Puedes arrastrar el botón de ayuda (?) a cualquier parte de la pantalla si te molesta.
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar tab de preguntas IA
     */
    function renderAskTab() {
        return `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <!-- Chat area -->
                <div id="help-chat-messages" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px 0;
                    min-height: 200px;
                ">
                    ${state.conversationHistory.length === 0 ? `
                        <div style="text-align: center; padding: 30px; color: #888;">
                            <i class="fas fa-robot fa-2x" style="color: #9b59b6; opacity: 0.5;"></i>
                            <p style="margin-top: 15px; font-size: 0.85rem;">
                                ${state.ollamaAvailable
                                    ? '🤖 Pregúntame lo que necesites'
                                    : '⚠️ Conectando con IA...'}
                            </p>
                            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                                <span onclick="ContextualHelpSystem.askQuestion('¿Cómo agrego un usuario?')" style="
                                    cursor: pointer;
                                    padding: 8px;
                                    background: rgba(155,89,182,0.1);
                                    border-radius: 8px;
                                    font-size: 0.75rem;
                                    color: #9b59b6;
                                ">¿Cómo agrego un usuario?</span>
                                <span onclick="ContextualHelpSystem.askQuestion('¿Qué permisos necesito?')" style="
                                    cursor: pointer;
                                    padding: 8px;
                                    background: rgba(155,89,182,0.1);
                                    border-radius: 8px;
                                    font-size: 0.75rem;
                                    color: #9b59b6;
                                ">¿Qué permisos necesito?</span>
                            </div>
                        </div>
                    ` : state.conversationHistory.map(msg => `
                        <div style="
                            display: flex;
                            justify-content: ${msg.role === 'user' ? 'flex-end' : 'flex-start'};
                            margin-bottom: 10px;
                        ">
                            <div style="
                                max-width: 85%;
                                padding: 10px 14px;
                                border-radius: ${msg.role === 'user' ? '15px 15px 5px 15px' : '15px 15px 15px 5px'};
                                background: ${msg.role === 'user'
                                    ? 'linear-gradient(135deg, #9b59b6, #8e44ad)'
                                    : 'rgba(255,255,255,0.05)'};
                                color: ${msg.role === 'user' ? 'white' : '#e0e0e0'};
                                font-size: 0.8rem;
                                line-height: 1.5;
                            ">
                                ${msg.content}
                            </div>
                        </div>
                    `).join('')}
                    ${state.isTyping ? `
                        <div style="display: flex; gap: 5px; padding: 10px;">
                            <span style="animation: pulse 1s infinite; width: 8px; height: 8px; background: #9b59b6; border-radius: 50%;"></span>
                            <span style="animation: pulse 1s infinite 0.2s; width: 8px; height: 8px; background: #9b59b6; border-radius: 50%;"></span>
                            <span style="animation: pulse 1s infinite 0.4s; width: 8px; height: 8px; background: #9b59b6; border-radius: 50%;"></span>
                        </div>
                    ` : ''}
                </div>

                <!-- Input -->
                <div style="
                    display: flex;
                    gap: 8px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                ">
                    <input type="text" id="help-question-input" placeholder="Escribe tu pregunta..."
                        style="
                            flex: 1;
                            padding: 10px 15px;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 20px;
                            color: #e0e0e0;
                            font-size: 0.85rem;
                        ">
                    <button onclick="ContextualHelpSystem.sendQuestion()" style="
                        width: 40px;
                        height: 40px;
                        background: linear-gradient(135deg, #9b59b6, #8e44ad);
                        border: none;
                        border-radius: 50%;
                        color: white;
                        cursor: pointer;
                    ">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar tab de dependencias
     */
    function renderDependenciesTab() {
        return `
            <div id="help-dependencies-content">
                <div style="text-align: center; padding: 30px; color: #888;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p style="margin-top: 10px;">Verificando estado del módulo...</p>
                </div>
            </div>
        `;
    }

    /**
     * Cargar dependencias
     */
    async function loadDependencies() {
        if (!state.currentModule) {
            document.getElementById('help-dependencies-content').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #888;">
                    <p>Navegue a un módulo para ver su estado</p>
                </div>
            `;
            return;
        }

        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${config.apiBase}/readiness/${state.currentModule}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                document.getElementById('help-dependencies-content').innerHTML = renderDependenciesContent(data);
            }

        } catch (error) {
            console.error('[HELP] Error loading dependencies:', error);
            document.getElementById('help-dependencies-content').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p style="margin-top: 10px;">Error cargando estado</p>
                </div>
            `;
        }
    }

    /**
     * Renderizar contenido de dependencias
     */
    function renderDependenciesContent(data) {
        const { isReady, issues, warnings } = data;

        return `
            <div>
                <!-- Estado general -->
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 15px;
                    background: ${isReady ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)'};
                    border: 1px solid ${isReady ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'};
                    border-radius: 10px;
                    margin-bottom: 15px;
                ">
                    <div style="
                        width: 50px;
                        height: 50px;
                        background: ${isReady ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fas ${isReady ? 'fa-check' : 'fa-exclamation'}" style="
                            font-size: 1.5rem;
                            color: ${isReady ? '#2ecc71' : '#e74c3c'};
                        "></i>
                    </div>
                    <div>
                        <h5 style="margin: 0; color: ${isReady ? '#2ecc71' : '#e74c3c'}; font-size: 0.9rem;">
                            ${isReady ? 'Módulo Listo' : 'Configuración Requerida'}
                        </h5>
                        <p style="margin: 3px 0 0; color: #888; font-size: 0.75rem;">
                            ${isReady
                                ? 'Todas las dependencias están configuradas'
                                : `${issues?.length || 0} problema(s) encontrado(s)`}
                        </p>
                    </div>
                </div>

                <!-- Issues -->
                ${issues && issues.length > 0 ? `
                    <div style="margin-bottom: 15px;">
                        <h6 style="margin: 0 0 10px; color: #e74c3c; font-size: 0.8rem;">
                            <i class="fas fa-times-circle"></i> Problemas a Resolver
                        </h6>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${issues.map(issue => `
                                <div style="
                                    padding: 10px;
                                    background: rgba(231, 76, 60, 0.1);
                                    border: 1px solid rgba(231, 76, 60, 0.2);
                                    border-radius: 8px;
                                    color: #e0e0e0;
                                    font-size: 0.75rem;
                                ">
                                    <i class="fas fa-arrow-right" style="color: #e74c3c; margin-right: 8px;"></i>
                                    ${typeof issue === 'object' ? issue.message : issue}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Warnings -->
                ${warnings && warnings.length > 0 ? `
                    <div>
                        <h6 style="margin: 0 0 10px; color: #f39c12; font-size: 0.8rem;">
                            <i class="fas fa-exclamation-triangle"></i> Advertencias
                        </h6>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${warnings.map(warning => `
                                <div style="
                                    padding: 10px;
                                    background: rgba(243, 156, 18, 0.1);
                                    border: 1px solid rgba(243, 156, 18, 0.2);
                                    border-radius: 8px;
                                    color: #e0e0e0;
                                    font-size: 0.75rem;
                                ">
                                    <i class="fas fa-info" style="color: #f39c12; margin-right: 8px;"></i>
                                    ${typeof warning === 'object' ? warning.message : warning}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Cargar ayuda del módulo actual
     */
    async function loadModuleHelp() {
        if (!state.currentModule) {
            state.moduleHelp = {
                module_name: 'General',
                helpTitle: 'Ayuda del Sistema',
                helpDescription: 'Navegue a un módulo específico para ver ayuda contextual.',
                gettingStarted: 'Seleccione un módulo del menú para comenzar.',
                commonTasks: ['Navegar por los módulos', 'Consultar el estado del sistema', 'Hacer preguntas al asistente IA']
            };
            return;
        }

        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${config.apiBase}/full-context/${state.currentModule}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                state.moduleHelp = data.module || {};

                // Actualizar indicador
                const indicator = document.getElementById('help-module-indicator');
                if (indicator) {
                    indicator.textContent = state.moduleHelp.name || state.currentModule;
                }

                // Mostrar badge si hay issues
                const badge = document.getElementById('help-notification-badge');
                if (badge && data.readiness && !data.readiness.isReady) {
                    badge.style.display = 'flex';
                    badge.textContent = data.readiness.issues?.length || '!';
                } else if (badge) {
                    badge.style.display = 'none';
                }

                // Actualizar tab si está abierto
                if (state.isHelpPanelOpen) {
                    const activeTab = document.querySelector('.help-tab.active');
                    if (activeTab) {
                        switchTab(activeTab.dataset.tab);
                    }
                }
            }

        } catch (error) {
            console.error('[HELP] Error loading module help:', error);
        }
    }

    /**
     * Adjuntar listeners del tab de preguntas
     */
    function attachAskListeners() {
        const input = document.getElementById('help-question-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendQuestion();
                }
            });
        }
    }

    /**
     * Enviar pregunta
     */
    async function sendQuestion() {
        const input = document.getElementById('help-question-input');
        const question = input?.value?.trim();

        if (!question || state.isTyping) return;

        input.value = '';
        await askQuestion(question);
    }

    /**
     * Hacer pregunta al asistente
     */
    async function askQuestion(question) {
        if (state.isTyping) return;

        // Agregar mensaje del usuario
        state.conversationHistory.push({ role: 'user', content: question });
        state.isTyping = true;

        // Re-renderizar
        switchTab('ask');

        // Scroll al final
        const messages = document.getElementById('help-chat-messages');
        if (messages) {
            messages.scrollTop = messages.scrollHeight;
        }

        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${config.apiBase}/ask`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question,
                    moduleKey: state.currentModule,
                    screenKey: state.currentScreen
                })
            });

            const data = await res.json();

            state.isTyping = false;

            if (data.success && data.answer) {
                state.conversationHistory.push({ role: 'assistant', content: data.answer });
            } else {
                state.conversationHistory.push({
                    role: 'assistant',
                    content: data.answer || 'Lo siento, no pude procesar tu pregunta. Intenta reformularla.'
                });
            }

            switchTab('ask');

            // Scroll al final
            setTimeout(() => {
                const messages = document.getElementById('help-chat-messages');
                if (messages) {
                    messages.scrollTop = messages.scrollHeight;
                }
            }, 100);

        } catch (error) {
            console.error('[HELP] Error asking question:', error);
            state.isTyping = false;
            state.conversationHistory.push({
                role: 'assistant',
                content: 'Error conectando con el asistente. Verifique su conexión.'
            });
            switchTab('ask');
        }
    }

    /**
     * Verificar estado de Ollama (FIXED: data.available en vez de data.isAvailable)
     */
    async function checkOllamaStatus() {
        const token = localStorage.getItem('token');

        if (!token) {
            console.log('[HELP] No token, waiting for login...');
            setTimeout(checkOllamaStatus, 3000);
            return;
        }

        try {
            const res = await fetch(`${config.apiBase}/ai-status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // FIX: El API devuelve "available" no "isAvailable"
                state.ollamaAvailable = data.available || data.isAvailable || false;

                console.log('[HELP] Ollama status:', state.ollamaAvailable ? 'ONLINE' : 'OFFLINE', data);

                // Actualizar indicador
                const status = document.getElementById('help-ollama-status');
                if (status) {
                    if (state.ollamaAvailable) {
                        status.style.background = 'rgba(46, 204, 113, 0.3)';
                        status.style.color = '#2ecc71';
                        status.innerHTML = '<i class="fas fa-circle"></i> IA Online';
                    } else {
                        status.style.background = 'rgba(231, 76, 60, 0.3)';
                        status.style.color = '#e74c3c';
                        status.innerHTML = '<i class="fas fa-circle"></i> IA Offline';
                    }
                }
            }

        } catch (error) {
            console.error('[HELP] Error checking Ollama status:', error);
            state.ollamaAvailable = false;
        }
    }

    /**
     * Detectar módulo actual
     */
    function detectCurrentModule() {
        const url = window.location.href;

        const modulePatterns = {
            'users': ['users', 'empleados', 'personal'],
            'attendance': ['attendance', 'asistencia', 'fichaje'],
            'vacation-management': ['vacation', 'vacaciones', 'licencias'],
            'payroll-liquidation': ['payroll', 'liquidacion', 'nomina'],
            'sanctions-management': ['sanctions', 'sanciones'],
            'organizational': ['departments', 'departamentos', 'organizational'],
            'shifts': ['shifts', 'turnos'],
            'training': ['training', 'capacitacion']
        };

        for (const [moduleKey, patterns] of Object.entries(modulePatterns)) {
            if (patterns.some(p => url.toLowerCase().includes(p))) {
                state.currentModule = moduleKey;
                return;
            }
        }

        const activeMenuItem = document.querySelector('.menu-item.active, .nav-item.active');
        if (activeMenuItem) {
            const text = activeMenuItem.textContent.toLowerCase();
            for (const [moduleKey, patterns] of Object.entries(modulePatterns)) {
                if (patterns.some(p => text.includes(p))) {
                    state.currentModule = moduleKey;
                    return;
                }
            }
        }

        state.currentModule = null;
    }

    /**
     * Observar cambios de ruta
     */
    function observeRouteChanges() {
        window.addEventListener('hashchange', () => {
            detectCurrentModule();
            loadModuleHelp();
        });
    }

    /**
     * Mostrar tooltip
     */
    function showTooltip(element, content, options = {}) {
        const container = document.getElementById('help-tooltip-container');
        const rect = element.getBoundingClientRect();

        container.innerHTML = `
            <div style="
                position: fixed;
                top: ${rect.top - 10}px;
                left: ${rect.left + rect.width / 2}px;
                transform: translate(-50%, -100%);
                padding: 8px 12px;
                background: rgba(26, 26, 46, 0.95);
                border: 1px solid rgba(155, 89, 182, 0.3);
                border-radius: 8px;
                color: #e0e0e0;
                font-size: 0.75rem;
                max-width: 250px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                pointer-events: auto;
                animation: fadeIn 0.2s ease;
            ">
                ${content}
                <div style="
                    position: absolute;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-top: 6px solid rgba(155, 89, 182, 0.3);
                "></div>
            </div>
        `;

        if (options.autoClose !== false) {
            setTimeout(() => {
                container.innerHTML = '';
            }, options.duration || 3000);
        }
    }

    /**
     * Ocultar tooltip
     */
    function hideTooltip() {
        const container = document.getElementById('help-tooltip-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    // API pública
    return {
        init,
        toggleHelpPanel,
        switchTab,
        askQuestion,
        sendQuestion,
        showTooltip,
        hideTooltip,
        showProactiveBubble,
        setCurrentModule: (moduleKey) => {
            const previousModule = state.currentModule;
            state.currentModule = moduleKey;

            // Verificar Ollama si cambió de módulo
            if (previousModule !== moduleKey) {
                checkOllamaStatus();
                loadModuleHelp();

                // Mostrar burbuja de bienvenida al módulo
                if (moduleKey && moduleKey !== 'dashboard') {
                    showModuleWelcomeBubble(moduleKey);
                }
            }
        }
    };
})();

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        ContextualHelpSystem.init();
    }, 1500);
});
