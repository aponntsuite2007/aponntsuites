/**
 * ============================================================================
 * INTERACTIVE TOUR ENGINE - Motor de Tours Inteligentes
 * ============================================================================
 *
 * Tour interactivo que:
 * - Muestra burbujas emergentes destacando elementos
 * - Pausa automáticamente mientras explica
 * - Detecta cuando el usuario quiere preguntar
 * - Se integra con Support AI para responder en contexto
 * - Tiene audio TTS opcional
 * - Guarda progreso y permite continuar
 *
 * NO es un PowerPoint - Es una experiencia inmersiva EN VIVO
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

class InteractiveTourEngine {
    constructor(options = {}) {
        this.config = {
            apiBaseUrl: options.apiBaseUrl || '/api/brain/agents',
            enableTTS: options.enableTTS !== false,
            bubbleDelay: options.bubbleDelay || 500,  // ms entre bubbles
            readingSpeed: options.readingSpeed || 150, // palabras por minuto
            highlightColor: options.highlightColor || 'rgba(59, 130, 246, 0.3)',
            ...options
        };

        // Estado del tour
        this.state = {
            isActive: false,
            isPaused: false,
            isWaitingForUser: false,
            currentTour: null,
            currentStep: 0,
            sessionId: null,
            startTime: null,
            questionMode: false
        };

        // Historial del tour
        this.history = [];

        // Elementos DOM
        this.elements = {
            overlay: null,
            bubble: null,
            chatPanel: null,
            progressBar: null,
            controls: null
        };

        // TTS
        this.tts = {
            synth: window.speechSynthesis,
            voice: null,
            speaking: false
        };

        // Event handlers
        this.handlers = {};

        // Callbacks
        this.onStepChange = options.onStepChange || null;
        this.onComplete = options.onComplete || null;
        this.onPause = options.onPause || null;
        this.onResume = options.onResume || null;
        this.onQuestion = options.onQuestion || null;

        this.init();
    }

    /**
     * ========================================================================
     * INICIALIZACIÓN
     * ========================================================================
     */

    init() {
        this.createDOMElements();
        this.setupTTS();
        this.bindEvents();
        console.log('🎯 [TOUR-ENGINE] Inicializado');
    }

    createDOMElements() {
        // Overlay oscuro
        this.elements.overlay = document.createElement('div');
        this.elements.overlay.id = 'tour-overlay';
        this.elements.overlay.innerHTML = `
            <style>
                #tour-overlay {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 99998;
                    pointer-events: none;
                }
                #tour-overlay.active {
                    display: block;
                }
                #tour-overlay .tour-highlight {
                    position: absolute;
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
                    border-radius: 8px;
                    transition: all 0.4s ease;
                    pointer-events: auto;
                }

                /* Burbuja principal */
                #tour-bubble {
                    display: none;
                    position: fixed;
                    max-width: 400px;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    z-index: 99999;
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    animation: bubbleAppear 0.4s ease;
                    pointer-events: auto;
                }
                #tour-bubble.active {
                    display: block;
                }
                @keyframes bubbleAppear {
                    from { opacity: 0; transform: translateY(20px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                #tour-bubble .bubble-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                #tour-bubble .bubble-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #60a5fa;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                #tour-bubble .bubble-step {
                    font-size: 12px;
                    color: #94a3b8;
                    background: rgba(255,255,255,0.1);
                    padding: 4px 10px;
                    border-radius: 12px;
                }

                #tour-bubble .bubble-content {
                    padding: 20px;
                }
                #tour-bubble .bubble-text {
                    font-size: 15px;
                    line-height: 1.6;
                    color: #e2e8f0;
                    margin-bottom: 16px;
                }
                #tour-bubble .bubble-highlight-text {
                    color: #fbbf24;
                    font-weight: 500;
                }
                #tour-bubble .bubble-tip {
                    background: rgba(59, 130, 246, 0.2);
                    border-left: 3px solid #3b82f6;
                    padding: 12px 16px;
                    border-radius: 0 8px 8px 0;
                    font-size: 13px;
                    color: #93c5fd;
                    margin-top: 12px;
                }

                #tour-bubble .bubble-actions {
                    padding: 16px 20px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                }
                #tour-bubble .bubble-btn {
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }
                #tour-bubble .bubble-btn-primary {
                    background: #3b82f6;
                    color: white;
                }
                #tour-bubble .bubble-btn-primary:hover {
                    background: #2563eb;
                }
                #tour-bubble .bubble-btn-secondary {
                    background: rgba(255,255,255,0.1);
                    color: #94a3b8;
                }
                #tour-bubble .bubble-btn-secondary:hover {
                    background: rgba(255,255,255,0.15);
                    color: white;
                }
                #tour-bubble .bubble-btn-icon {
                    padding: 8px;
                    background: transparent;
                    color: #64748b;
                }
                #tour-bubble .bubble-btn-icon:hover {
                    color: white;
                }

                /* Panel de Chat (para preguntas) */
                #tour-chat-panel {
                    display: none;
                    position: fixed;
                    bottom: 100px;
                    right: 20px;
                    width: 380px;
                    max-height: 500px;
                    background: #0f172a;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    z-index: 100000;
                    overflow: hidden;
                    animation: slideUp 0.3s ease;
                }
                #tour-chat-panel.active {
                    display: flex;
                    flex-direction: column;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                #tour-chat-panel .chat-header {
                    padding: 16px;
                    background: #1e293b;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                #tour-chat-panel .chat-header h3 {
                    color: white;
                    font-size: 16px;
                    margin: 0;
                }
                #tour-chat-panel .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    max-height: 300px;
                }
                #tour-chat-panel .chat-message {
                    margin-bottom: 12px;
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.5;
                }
                #tour-chat-panel .chat-message.user {
                    background: #3b82f6;
                    color: white;
                    margin-left: 40px;
                }
                #tour-chat-panel .chat-message.assistant {
                    background: #1e293b;
                    color: #e2e8f0;
                    margin-right: 40px;
                }
                #tour-chat-panel .chat-input-container {
                    padding: 16px;
                    background: #1e293b;
                    display: flex;
                    gap: 8px;
                }
                #tour-chat-panel .chat-input {
                    flex: 1;
                    padding: 12px 16px;
                    border-radius: 24px;
                    border: 1px solid #334155;
                    background: #0f172a;
                    color: white;
                    font-size: 14px;
                    outline: none;
                }
                #tour-chat-panel .chat-input:focus {
                    border-color: #3b82f6;
                }
                #tour-chat-panel .chat-send-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: #3b82f6;
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* Barra de progreso */
                #tour-progress {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 4px;
                    background: rgba(0,0,0,0.3);
                    z-index: 100001;
                }
                #tour-progress.active {
                    display: block;
                }
                #tour-progress .progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                    transition: width 0.4s ease;
                }

                /* Controles flotantes - SOLO visibles durante tour activo */
                #tour-controls {
                    display: none !important;
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(15, 23, 42, 0.95);
                    padding: 12px 24px;
                    border-radius: 40px;
                    gap: 16px;
                    align-items: center;
                    z-index: 100001;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    cursor: move;
                    user-select: none;
                }
                #tour-controls.active {
                    display: flex !important;
                }
                #tour-controls button {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    transition: all 0.2s;
                }
                #tour-controls button:hover {
                    background: #3b82f6;
                }
                #tour-controls .control-divider {
                    width: 1px;
                    height: 24px;
                    background: rgba(255,255,255,0.2);
                }
                #tour-controls .tour-status {
                    color: #94a3b8;
                    font-size: 13px;
                    padding: 0 12px;
                }
            </style>
        `;
        document.body.appendChild(this.elements.overlay);

        // Burbuja de explicación
        this.elements.bubble = document.createElement('div');
        this.elements.bubble.id = 'tour-bubble';
        document.body.appendChild(this.elements.bubble);

        // Panel de chat
        this.elements.chatPanel = document.createElement('div');
        this.elements.chatPanel.id = 'tour-chat-panel';
        this.elements.chatPanel.innerHTML = `
            <div class="chat-header">
                <h3>💬 ¿Tienes una pregunta?</h3>
                <button onclick="window.tourEngine.closeChatPanel()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:20px;">×</button>
            </div>
            <div class="chat-messages" id="tour-chat-messages"></div>
            <div class="chat-input-container">
                <input type="text" class="chat-input" id="tour-chat-input" placeholder="Escribe tu pregunta..." />
                <button class="chat-send-btn" onclick="window.tourEngine.sendQuestion()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                </button>
            </div>
        `;
        document.body.appendChild(this.elements.chatPanel);

        // Barra de progreso
        this.elements.progressBar = document.createElement('div');
        this.elements.progressBar.id = 'tour-progress';
        this.elements.progressBar.innerHTML = '<div class="progress-bar" style="width: 0%"></div>';
        document.body.appendChild(this.elements.progressBar);

        // Controles flotantes
        this.elements.controls = document.createElement('div');
        this.elements.controls.id = 'tour-controls';
        this.elements.controls.innerHTML = `
            <button onclick="window.tourEngine.prevStep()" title="Anterior">⏮</button>
            <button onclick="window.tourEngine.togglePause()" id="tour-pause-btn" title="Pausar/Continuar">⏸</button>
            <button onclick="window.tourEngine.nextStep()" title="Siguiente">⏭</button>
            <div class="control-divider"></div>
            <button onclick="window.tourEngine.toggleTTS()" id="tour-tts-btn" title="Audio">🔊</button>
            <button onclick="window.tourEngine.openChatPanel()" title="Preguntar">💬</button>
            <div class="control-divider"></div>
            <span class="tour-status" id="tour-status-text">Paso 1 de 10</span>
            <div class="control-divider"></div>
            <button onclick="window.tourEngine.endTour()" title="Finalizar" style="background:#ef4444;">✕</button>
        `;
        document.body.appendChild(this.elements.controls);

        // Exponer globalmente para los onclick
        window.tourEngine = this;
    }

    setupTTS() {
        if (!this.config.enableTTS || !this.tts.synth) return;

        // Cargar voces en español
        const loadVoices = () => {
            const voices = this.tts.synth.getVoices();
            this.tts.voice = voices.find(v =>
                v.lang.startsWith('es') && v.name.includes('Female')
            ) || voices.find(v => v.lang.startsWith('es')) || voices[0];
        };

        loadVoices();
        this.tts.synth.onvoiceschanged = loadVoices;
    }

    bindEvents() {
        // Detectar cuando el usuario empieza a escribir (en cualquier lugar)
        document.addEventListener('keydown', (e) => {
            if (!this.state.isActive || this.state.questionMode) return;

            // Si presiona cualquier tecla de letra, pausar y abrir chat
            if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9áéíóúñ]/)) {
                this.pauseTourForQuestion(e.key);
            }
        });

        // Enter en el chat
        document.getElementById('tour-chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendQuestion();
            }
        });

        // ESC para cerrar tour
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.isActive) {
                if (this.state.questionMode) {
                    this.closeChatPanel();
                } else {
                    this.endTour();
                }
            }
        });

        // Hacer controles arrastrables
        this.makeDraggable(this.elements.controls);
    }

    /**
     * Hacer un elemento arrastrable
     */
    makeDraggable(element) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        element.addEventListener('mousedown', (e) => {
            // Solo arrastrar si el click es en el fondo del control, no en botones
            if (e.target.tagName === 'BUTTON') return;

            isDragging = true;
            const rect = element.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // Quitar el transform para posicionar absolutamente
            element.style.transform = 'none';
            element.style.left = `${e.clientX - offsetX}px`;
            element.style.top = `${e.clientY - offsetY}px`;
            element.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'move';
            }
        });
    }

    /**
     * ========================================================================
     * CONTROL DEL TOUR
     * ========================================================================
     */

    async startTour(tourData, options = {}) {
        console.log('🎬 [TOUR] Iniciando tour:', tourData.name);

        // 🧠 BRAIN INTEGRATION - Verificar prerrequisitos antes de iniciar tour
        if (tourData.actionKey && typeof BrainIntegration !== 'undefined') {
            console.log(`🧠 [TOUR] Verificando prerrequisitos para: ${tourData.actionKey}`);

            const prereqResult = await BrainIntegration.verifyForTour(tourData.actionKey);

            if (!prereqResult.canStartTour) {
                console.log('🚫 [TOUR] Prerrequisitos faltantes, mostrando pasos previos');

                // Mostrar modal con prerrequisitos faltantes
                this.showPrerequisiteModal(tourData, prereqResult);
                return null; // No iniciar el tour
            }

            console.log('✅ [TOUR] Prerrequisitos verificados, iniciando tour');
        }

        // 🔥 NAVEGACIÓN AUTOMÁTICA AL MÓDULO
        if (tourData.module && tourData.module !== 'onboarding' && tourData.module !== 'general') {
            console.log(`📍 [TOUR] Navegando al módulo: ${tourData.module}`);

            // Verificar si ya estamos en ese módulo
            const currentModule = document.querySelector(`[data-current-module="${tourData.module}"]`);
            if (!currentModule) {
                // Navegar al módulo usando la función global
                if (typeof window.showModuleContent === 'function') {
                    const moduleName = tourData.name || tourData.module;
                    window.showModuleContent(tourData.module, moduleName);

                    // Esperar a que la UI cargue
                    console.log('⏳ [TOUR] Esperando carga del módulo...');
                    await new Promise(r => setTimeout(r, 1500));
                } else {
                    console.warn('⚠️ [TOUR] window.showModuleContent no disponible');
                }
            }
        }

        this.state.isActive = true;
        this.state.isPaused = false;
        this.state.currentTour = tourData;
        this.state.currentStep = options.resumeFromStep || 0;
        this.state.sessionId = `tour-${Date.now()}`;
        this.state.startTime = new Date();

        // Activar elementos
        this.elements.overlay.classList.add('active');
        this.elements.progressBar.classList.add('active');
        this.elements.controls.classList.add('active');

        // Guardar en localStorage para poder resumir
        this.saveProgress();

        // Iniciar primer paso
        await this.showStep(this.state.currentStep);

        return this.state.sessionId;
    }

    /**
     * 🧠 Mostrar modal de prerrequisitos faltantes
     */
    showPrerequisiteModal(tourData, prereqResult) {
        const modal = document.createElement('div');
        modal.className = 'tour-prereq-modal';
        modal.innerHTML = `
            <div class="tour-prereq-overlay"></div>
            <div class="tour-prereq-content">
                <div class="tour-prereq-header">
                    <span class="tour-prereq-icon">⚠️</span>
                    <h3>Antes de comenzar el tour</h3>
                    <button class="tour-prereq-close">&times;</button>
                </div>
                <div class="tour-prereq-body">
                    <p class="tour-prereq-message">
                        Para completar el tour <strong>"${tourData.name}"</strong>, necesitas configurar algunos elementos primero.
                    </p>

                    <div class="tour-prereq-steps">
                        <h4>Pasos previos necesarios:</h4>
                        <ul>
                            ${prereqResult.missingSteps?.map((step, i) => `
                                <li class="tour-prereq-step">
                                    <span class="tour-prereq-step-num">${i + 1}</span>
                                    <div class="tour-prereq-step-content">
                                        <strong>${step.description}</strong>
                                        ${step.howToFix ? `<p>${step.howToFix}</p>` : ''}
                                        ${step.navigateTo ? `
                                            <button class="tour-prereq-goto" data-menu="${step.navigateTo.menu}" data-submenu="${step.navigateTo.submenu}">
                                                Ir a configurar →
                                            </button>
                                        ` : ''}
                                    </div>
                                </li>
                            `).join('') || '<li>Configuraciones pendientes</li>'}
                        </ul>
                    </div>

                    <p class="tour-prereq-hint">
                        💡 ${prereqResult.suggestion || 'Completa estos pasos y vuelve a intentar el tour.'}
                    </p>
                </div>
                <div class="tour-prereq-footer">
                    <button class="tour-prereq-btn-secondary" id="tour-prereq-close">Entendido</button>
                    <button class="tour-prereq-btn-primary" id="tour-prereq-start-config">Comenzar configuración</button>
                </div>
            </div>
        `;

        // Estilos
        const style = document.createElement('style');
        style.id = 'tour-prereq-styles';
        style.textContent = `
            .tour-prereq-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .tour-prereq-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); }
            .tour-prereq-content { position: relative; background: linear-gradient(145deg, #1e1e2e 0%, #2a2a3e 100%); border-radius: 16px; max-width: 520px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 25px 80px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); }
            .tour-prereq-header { display: flex; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); gap: 12px; }
            .tour-prereq-icon { font-size: 28px; }
            .tour-prereq-header h3 { flex: 1; margin: 0; color: #fff; font-size: 18px; font-weight: 600; }
            .tour-prereq-close { background: none; border: none; color: #666; font-size: 28px; cursor: pointer; padding: 0; line-height: 1; }
            .tour-prereq-close:hover { color: #fff; }
            .tour-prereq-body { padding: 24px; }
            .tour-prereq-message { color: #b0b0c0; margin: 0 0 20px; line-height: 1.6; font-size: 15px; }
            .tour-prereq-steps h4 { color: #fff; font-size: 14px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.5px; }
            .tour-prereq-steps ul { list-style: none; padding: 0; margin: 0; }
            .tour-prereq-step { display: flex; gap: 16px; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05); }
            .tour-prereq-step-num { width: 32px; height: 32px; background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; }
            .tour-prereq-step-content { flex: 1; }
            .tour-prereq-step-content strong { color: #fff; display: block; margin-bottom: 6px; font-size: 14px; }
            .tour-prereq-step-content p { color: #888; font-size: 13px; margin: 0 0 10px; }
            .tour-prereq-goto { background: rgba(79, 70, 229, 0.2); color: #a5b4fc; border: 1px solid rgba(79, 70, 229, 0.3); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
            .tour-prereq-goto:hover { background: rgba(79, 70, 229, 0.4); color: #fff; }
            .tour-prereq-hint { color: #888; font-size: 13px; margin: 20px 0 0; padding: 12px 16px; background: rgba(99,102,241,0.1); border-radius: 8px; border-left: 3px solid #6366f1; }
            .tour-prereq-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.1); }
            .tour-prereq-btn-secondary { background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
            .tour-prereq-btn-primary { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #fff; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
            .tour-prereq-btn-secondary:hover { background: rgba(255,255,255,0.2); }
            .tour-prereq-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,70,229,0.4); }
        `;

        if (!document.getElementById('tour-prereq-styles')) {
            document.head.appendChild(style);
        }
        document.body.appendChild(modal);

        // Event listeners
        const closeModal = () => {
            modal.remove();
        };

        modal.querySelector('.tour-prereq-close').addEventListener('click', closeModal);
        modal.querySelector('.tour-prereq-overlay').addEventListener('click', closeModal);
        modal.querySelector('#tour-prereq-close').addEventListener('click', closeModal);

        // Comenzar configuración - navegar al primer paso
        modal.querySelector('#tour-prereq-start-config').addEventListener('click', () => {
            const firstStep = prereqResult.missingSteps?.[0];
            if (firstStep?.navigateTo && typeof window.navigateToMenu === 'function') {
                window.navigateToMenu(firstStep.navigateTo.menu, firstStep.navigateTo.submenu);
            } else if (firstStep?.navigateTo && typeof BrainIntegration !== 'undefined') {
                BrainIntegration.navigateToModule(firstStep.module);
            }
            closeModal();
        });

        // Botones de navegación individual
        modal.querySelectorAll('.tour-prereq-goto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const menu = e.target.dataset.menu;
                const submenu = e.target.dataset.submenu;
                if (typeof window.navigateToMenu === 'function') {
                    window.navigateToMenu(menu, submenu);
                }
                closeModal();
            });
        });

        return modal;
    }

    async showStep(stepIndex) {
        const tour = this.state.currentTour;
        if (!tour || stepIndex < 0 || stepIndex >= tour.steps.length) return;

        this.state.currentStep = stepIndex;
        const step = tour.steps[stepIndex];

        console.log(`📍 [TOUR] Paso ${stepIndex + 1}/${tour.steps.length}: ${step.title}`);

        // Actualizar progreso
        this.updateProgress();

        // 🔥 EJECUTAR PRE-ACCIÓN si existe (navegar, abrir modal, etc)
        if (step.preAction) {
            console.log(`⚡ [TOUR] Ejecutando preAction: ${step.preAction.type}`);
            await this.executeAction(step.preAction);
            // Esperar a que la UI se actualice
            await new Promise(r => setTimeout(r, step.preAction.waitAfter || 800));
        }

        // Esperar que el elemento exista (con retry)
        if (step.target) {
            const found = await this.waitForElement(step.target, step.timeout || 3000);
            if (found) {
                await this.highlightElement(step.target);
            } else {
                console.warn(`⚠️ [TOUR] Elemento no encontrado después de esperar: ${step.target}`);
                this.clearHighlight();
            }
        } else {
            this.clearHighlight();
        }

        // Mostrar burbuja
        await this.showBubble(step);

        // Reproducir audio si está habilitado
        if (this.config.enableTTS && !this.state.isPaused) {
            this.speak(step.text || step.content);
        }

        // Auto-avanzar DESHABILITADO por defecto para tours interactivos
        // El usuario debe hacer clic en "Siguiente"
        if (step.autoAdvance === true && !this.state.isPaused) {
            const readTime = this.calculateReadTime(step.text || step.content);
            this.autoAdvanceTimeout = setTimeout(() => {
                if (!this.state.isPaused && !this.state.questionMode) {
                    this.nextStep();
                }
            }, readTime);
        }

        // Callback
        if (this.onStepChange) {
            this.onStepChange(stepIndex, step);
        }

        // Guardar progreso
        this.saveProgress();
    }

    /**
     * Esperar a que un elemento aparezca en el DOM
     */
    async waitForElement(selector, timeout = 3000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = document.querySelector(selector);
            if (el) return el;
            await new Promise(r => setTimeout(r, 100));
        }
        return null;
    }

    /**
     * Ejecutar una acción (click, navegar, etc)
     */
    async executeAction(action) {
        if (!action) return;

        switch (action.type) {
            case 'click':
                const el = document.querySelector(action.target);
                if (el) {
                    console.log(`🖱️ [TOUR] Click en: ${action.target}`);
                    el.click();
                } else {
                    console.warn(`⚠️ [TOUR] No se pudo hacer click, elemento no encontrado: ${action.target}`);
                }
                break;

            case 'navigate':
                if (typeof window.showModuleContent === 'function') {
                    console.log(`🧭 [TOUR] Navegando a módulo: ${action.module}`);
                    window.showModuleContent(action.module, action.moduleName || action.module);
                }
                break;

            case 'openModal':
                const modalTrigger = document.querySelector(action.target);
                if (modalTrigger) {
                    console.log(`📂 [TOUR] Abriendo modal via: ${action.target}`);
                    modalTrigger.click();
                }
                break;

            case 'switchTab':
                const tab = document.querySelector(action.target);
                if (tab) {
                    console.log(`📑 [TOUR] Cambiando a tab: ${action.target}`);
                    tab.click();
                }
                break;

            case 'closeModal':
                const closeBtn = document.querySelector('.modal .close, .modal-close, [data-dismiss="modal"], .btn-close');
                if (closeBtn) {
                    console.log(`❌ [TOUR] Cerrando modal`);
                    closeBtn.click();
                }
                break;

            case 'custom':
                if (typeof action.fn === 'function') {
                    await action.fn();
                }
                break;
        }
    }

    async highlightElement(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`[TOUR] Elemento no encontrado: ${selector}`);
            return;
        }

        // Hacer scroll al elemento
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        await new Promise(r => setTimeout(r, 300));

        // Crear highlight
        const rect = element.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.className = 'tour-highlight';
        highlight.style.cssText = `
            top: ${rect.top - 8}px;
            left: ${rect.left - 8}px;
            width: ${rect.width + 16}px;
            height: ${rect.height + 16}px;
        `;

        // Limpiar highlight anterior
        this.clearHighlight();

        this.elements.overlay.appendChild(highlight);
        this.currentHighlight = { element, highlight, rect };
    }

    clearHighlight() {
        const existing = this.elements.overlay.querySelector('.tour-highlight');
        if (existing) existing.remove();
        this.currentHighlight = null;
    }

    async showBubble(step) {
        const bubble = this.elements.bubble;
        const tour = this.state.currentTour;

        // Contenido de la burbuja
        bubble.innerHTML = `
            <div class="bubble-header">
                <span class="bubble-title">
                    ${step.icon || '💡'} ${step.title}
                </span>
                <span class="bubble-step">Paso ${this.state.currentStep + 1} de ${tour.steps.length}</span>
            </div>
            <div class="bubble-content">
                <div class="bubble-text">${this.formatText(step.text || step.content)}</div>
                ${step.tip ? `<div class="bubble-tip">💡 <strong>Tip:</strong> ${step.tip}</div>` : ''}
            </div>
            <div class="bubble-actions">
                <div>
                    <button class="bubble-btn bubble-btn-icon" onclick="window.tourEngine.openChatPanel()" title="Hacer pregunta">
                        💬
                    </button>
                    <button class="bubble-btn bubble-btn-icon" onclick="window.tourEngine.toggleTTS()" title="Audio">
                        ${this.config.enableTTS ? '🔊' : '🔇'}
                    </button>
                </div>
                <div style="display:flex;gap:8px;">
                    ${this.state.currentStep > 0 ? '<button class="bubble-btn bubble-btn-secondary" onclick="window.tourEngine.prevStep()">← Anterior</button>' : ''}
                    ${this.state.currentStep < tour.steps.length - 1 ?
                        '<button class="bubble-btn bubble-btn-primary" onclick="window.tourEngine.nextStep()">Siguiente →</button>' :
                        '<button class="bubble-btn bubble-btn-primary" onclick="window.tourEngine.endTour()" style="background:#10b981;">✓ Finalizar</button>'
                    }
                </div>
            </div>
        `;

        // Posicionar burbuja
        this.positionBubble(step);

        // Mostrar con animación
        bubble.classList.add('active');
        console.log('💬 [TOUR] Burbuja mostrada para paso:', step.title);
        console.log('💬 [TOUR] Botones disponibles:', this.state.currentStep > 0 ? '← Anterior' : '', this.state.currentStep < tour.steps.length - 1 ? 'Siguiente →' : '✓ Finalizar');
    }

    positionBubble(step) {
        const bubble = this.elements.bubble;

        if (this.currentHighlight) {
            const rect = this.currentHighlight.rect;
            const position = step.bubblePosition || step.position || 'bottom';

            let top, left;

            switch (position) {
                case 'top':
                    top = rect.top - bubble.offsetHeight - 20;
                    left = rect.left + (rect.width / 2) - (bubble.offsetWidth / 2);
                    break;
                case 'right':
                    top = rect.top + (rect.height / 2) - (bubble.offsetHeight / 2);
                    left = rect.right + 20;
                    break;
                case 'left':
                    top = rect.top + (rect.height / 2) - (bubble.offsetHeight / 2);
                    left = rect.left - bubble.offsetWidth - 20;
                    break;
                default: // bottom
                    top = rect.bottom + 20;
                    left = rect.left + (rect.width / 2) - (bubble.offsetWidth / 2);
            }

            // Ajustar si sale de pantalla
            const margin = 20;
            left = Math.max(margin, Math.min(left, window.innerWidth - bubble.offsetWidth - margin));
            top = Math.max(margin, Math.min(top, window.innerHeight - bubble.offsetHeight - margin));

            // Resetear transform y posicionar
            bubble.style.transform = 'none';
            bubble.style.top = `${top}px`;
            bubble.style.left = `${left}px`;
            console.log(`📍 [TOUR] Burbuja posicionada en: top=${top}px, left=${left}px`);
        } else {
            // Centrar en pantalla
            bubble.style.top = '50%';
            bubble.style.left = '50%';
            bubble.style.transform = 'translate(-50%, -50%)';
            console.log('📍 [TOUR] Burbuja centrada en pantalla');
        }
    }

    formatText(text) {
        if (!text) return '';

        // Convertir **texto** a <strong>
        text = text.replace(/\*\*([^*]+)\*\*/g, '<span class="bubble-highlight-text">$1</span>');

        // Convertir saltos de línea
        text = text.replace(/\n/g, '<br>');

        return text;
    }

    calculateReadTime(text) {
        if (!text) return 3000;
        const words = text.split(/\s+/).length;
        const minutes = words / this.config.readingSpeed;
        return Math.max(3000, Math.min(minutes * 60000, 15000)); // Entre 3 y 15 segundos
    }

    /**
     * ========================================================================
     * NAVEGACIÓN
     * ========================================================================
     */

    async nextStep() {
        console.log('▶️ [TOUR] nextStep() llamado, paso actual:', this.state.currentStep);
        if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);
        this.stopSpeaking();

        if (this.state.currentStep < this.state.currentTour.steps.length - 1) {
            console.log('▶️ [TOUR] Avanzando al paso:', this.state.currentStep + 1);
            await this.showStep(this.state.currentStep + 1);
        } else {
            console.log('▶️ [TOUR] Último paso, finalizando tour');
            this.endTour();
        }
    }

    async prevStep() {
        if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);
        this.stopSpeaking();

        if (this.state.currentStep > 0) {
            await this.showStep(this.state.currentStep - 1);
        }
    }

    async goToStep(stepIndex) {
        if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);
        this.stopSpeaking();
        await this.showStep(stepIndex);
    }

    togglePause() {
        if (this.state.isPaused) {
            this.resumeTour();
        } else {
            this.pauseTour();
        }
    }

    pauseTour() {
        this.state.isPaused = true;
        if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);
        this.stopSpeaking();

        document.getElementById('tour-pause-btn').textContent = '▶';

        if (this.onPause) this.onPause();
        console.log('⏸ [TOUR] Pausado');
    }

    resumeTour() {
        this.state.isPaused = false;
        document.getElementById('tour-pause-btn').textContent = '⏸';

        if (this.onResume) this.onResume();
        console.log('▶ [TOUR] Resumido');

        // Re-mostrar paso actual
        this.showStep(this.state.currentStep);
    }

    pauseTourForQuestion(initialChar = '') {
        this.pauseTour();
        this.openChatPanel();

        // Pre-llenar con la tecla presionada
        const input = document.getElementById('tour-chat-input');
        if (input && initialChar) {
            input.value = initialChar;
            input.focus();
        }
    }

    updateProgress() {
        const tour = this.state.currentTour;
        const progress = ((this.state.currentStep + 1) / tour.steps.length) * 100;

        const progressBar = this.elements.progressBar.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        const statusText = document.getElementById('tour-status-text');
        if (statusText) {
            statusText.textContent = `Paso ${this.state.currentStep + 1} de ${tour.steps.length}`;
        }
    }

    endTour() {
        console.log('🏁 [TOUR] Finalizando tour');

        if (this.autoAdvanceTimeout) clearTimeout(this.autoAdvanceTimeout);
        this.stopSpeaking();

        // Ocultar elementos
        this.elements.overlay.classList.remove('active');
        this.elements.bubble.classList.remove('active');
        this.elements.progressBar.classList.remove('active');
        this.elements.controls.classList.remove('active');
        this.elements.chatPanel.classList.remove('active');

        this.clearHighlight();

        // Limpiar progreso guardado
        localStorage.removeItem('tourProgress');

        // Callback
        if (this.onComplete) {
            this.onComplete({
                tourId: this.state.currentTour?.id,
                completedSteps: this.state.currentStep + 1,
                totalSteps: this.state.currentTour?.steps?.length,
                duration: Date.now() - this.state.startTime.getTime()
            });
        }

        // Reset estado
        this.state.isActive = false;
        this.state.currentTour = null;
        this.state.currentStep = 0;
    }

    /**
     * ========================================================================
     * CHAT / PREGUNTAS
     * ========================================================================
     */

    openChatPanel() {
        this.state.questionMode = true;
        this.pauseTour();

        this.elements.chatPanel.classList.add('active');
        document.getElementById('tour-chat-input')?.focus();
    }

    closeChatPanel() {
        this.state.questionMode = false;
        this.elements.chatPanel.classList.remove('active');

        // NO resumir automáticamente - dejar que el usuario decida
    }

    async sendQuestion() {
        const input = document.getElementById('tour-chat-input');
        const question = input?.value?.trim();

        if (!question) return;

        // Mostrar pregunta del usuario
        this.addChatMessage(question, 'user');
        input.value = '';

        // Llamar al Support AI
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/support/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    question,
                    context: {
                        tourId: this.state.currentTour?.id,
                        currentStep: this.state.currentStep,
                        module: this.state.currentTour?.module
                    }
                })
            });

            const data = await response.json();

            if (data.answer) {
                this.addChatMessage(data.answer, 'assistant');

                // Leer respuesta si TTS está habilitado
                if (this.config.enableTTS) {
                    this.speak(data.answer.replace(/\*\*/g, '').replace(/\n/g, '. '));
                }
            } else {
                this.addChatMessage('Lo siento, no pude procesar tu pregunta. ¿Puedes reformularla?', 'assistant');
            }

        } catch (error) {
            console.error('[TOUR] Error al enviar pregunta:', error);
            this.addChatMessage('Hubo un error de conexión. Por favor, intenta de nuevo.', 'assistant');
        }

        // Callback
        if (this.onQuestion) {
            this.onQuestion(question);
        }
    }

    addChatMessage(text, role) {
        const messagesContainer = document.getElementById('tour-chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        messageDiv.innerHTML = this.formatText(text);

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * ========================================================================
     * TTS (Text-to-Speech)
     * ========================================================================
     */

    speak(text) {
        if (!this.config.enableTTS || !this.tts.synth) return;

        this.stopSpeaking();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.tts.voice;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.lang = 'es-ES';

        this.tts.speaking = true;
        this.tts.synth.speak(utterance);

        utterance.onend = () => {
            this.tts.speaking = false;
        };
    }

    stopSpeaking() {
        if (this.tts.synth) {
            this.tts.synth.cancel();
            this.tts.speaking = false;
        }
    }

    toggleTTS() {
        this.config.enableTTS = !this.config.enableTTS;

        const btn = document.getElementById('tour-tts-btn');
        if (btn) {
            btn.textContent = this.config.enableTTS ? '🔊' : '🔇';
        }

        if (!this.config.enableTTS) {
            this.stopSpeaking();
        }
    }

    /**
     * ========================================================================
     * PERSISTENCIA
     * ========================================================================
     */

    saveProgress() {
        const progress = {
            tourId: this.state.currentTour?.id,
            currentStep: this.state.currentStep,
            sessionId: this.state.sessionId,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('tourProgress', JSON.stringify(progress));
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('tourProgress');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    }

    canResume() {
        const progress = this.loadProgress();
        if (!progress) return false;

        // Si fue guardado hace menos de 1 hora, se puede resumir
        const savedTime = new Date(progress.savedAt).getTime();
        const oneHour = 60 * 60 * 1000;
        return Date.now() - savedTime < oneHour;
    }

    async resumeTourFromProgress(tourData) {
        const progress = this.loadProgress();
        if (!progress || progress.tourId !== tourData.id) {
            return this.startTour(tourData);
        }

        return this.startTour(tourData, { resumeFromStep: progress.currentStep });
    }

    /**
     * Cargar tour desde API e iniciarlo
     */
    async loadAndStart(tourId, options = {}) {
        console.log(`🎬 [TOUR-ENGINE] Cargando tour: ${tourId}`);

        try {
            const response = await fetch(`${this.config.apiBaseUrl}/${tourId}`);
            const result = await response.json();

            if (!result.success) {
                console.error(`❌ [TOUR-ENGINE] Tour no encontrado: ${tourId}`);
                console.log('   Tours disponibles:', result.available);
                return false;
            }

            const tourData = result.data;
            console.log(`✅ [TOUR-ENGINE] Tour cargado: ${tourData.name} (${tourData.steps?.length || 0} pasos)`);

            // Iniciar el tour
            return this.startTour(tourData, options);

        } catch (error) {
            console.error(`❌ [TOUR-ENGINE] Error cargando tour:`, error);
            return false;
        }
    }

    /**
     * Configurar opciones adicionales
     */
    configure(options = {}) {
        Object.assign(this.config, options);
        console.log('🎬 [TOUR-ENGINE] Configuración actualizada:', this.config);
    }
}

// Crear instancia singleton
const tourEngineInstance = new InteractiveTourEngine({
    apiBaseUrl: '/api/brain/tours',
    enableTTS: false
});

// Exportar singleton globalmente
window.InteractiveTourEngine = tourEngineInstance;

// Función helper global
window.startInteractiveTour = function(tourId) {
    tourEngineInstance.loadAndStart(tourId || 'first-steps');
};

console.log('✅ [TOUR-ENGINE] Interactive Tour Engine cargado (singleton)');
