/**
 * MODULE HELP SYSTEM v1.0
 * Sistema Unificado de Ayuda Contextual para Todos los Módulos
 *
 * FUENTE ÚNICA DE VERDAD para ayuda contextual en el sistema.
 *
 * Características:
 * - Banners contextuales con tips (sin Ollama)
 * - Tooltips en campos con data-help="contexto.campo"
 * - Burbujas flotantes de explicación
 * - Chat integrado con Ollama (fallback si no disponible)
 * - Validación proactiva de formularios
 * - Auditoría automática de datos
 *
 * USO:
 * 1. Cada módulo registra su contenido: ModuleHelpSystem.registerModule('mi-modulo', {...})
 * 2. Inicializa en su contexto: ModuleHelpSystem.init('mi-modulo')
 * 3. Cambia contexto al navegar: ModuleHelpSystem.setContext('pantalla')
 * 4. Usa en HTML: data-help="pantalla.campo" para tooltips
 *
 * @technology Ollama + AssistantService (fallback) + Vanilla JS
 * @version 1.0.0
 * @created 2025-12-06
 */

(function() {
    'use strict';

    // Prevenir doble carga
    if (window.ModuleHelpSystem) {
        console.log('[ModuleHelp] Sistema ya cargado');
        return;
    }

    console.log('%c MODULE HELP SYSTEM v1.0 ', 'background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); color: white; font-size: 12px; padding: 6px 10px; border-radius: 4px; font-weight: bold;');

    // =========================================================================
    // SISTEMA PRINCIPAL
    // =========================================================================

    const ModuleHelpSystem = {
        // Registro global de contenido de ayuda por módulo
        modules: {},

        // Estado actual
        state: {
            currentModule: null,
            currentContext: 'dashboard',
            chatOpen: false,
            bubbleVisible: false,
            initialized: false
        },

        // Configuración
        config: {
            fabPosition: { bottom: 90, right: 24 },
            chatWidth: 380,
            chatMaxHeight: 500,
            prefix: 'mhs', // Prefijo CSS para evitar conflictos
            theme: 'dark'  // 'dark' o 'light'
        },

        // =====================================================================
        // REGISTRO DE MÓDULOS
        // =====================================================================

        /**
         * Registrar contenido de ayuda para un módulo
         * @param {string} moduleKey - Identificador del módulo
         * @param {Object} content - Contenido de ayuda estructurado
         *
         * Estructura esperada de content:
         * {
         *   moduleName: 'Nombre del Módulo',
         *   moduleDescription: 'Descripción general',
         *   contexts: {
         *     dashboard: {
         *       title: 'Panel Principal',
         *       description: 'Descripción de esta pantalla',
         *       tips: ['Tip 1', 'Tip 2'],
         *       warnings: ['Advertencia 1'],
         *       requirements: [{ check: 'Verificación', critical: true }],
         *       helpTopics: ['¿Pregunta 1?', '¿Pregunta 2?'],
         *       fieldHelp: {
         *         campo1: 'Explicación del campo',
         *         campo2: 'Explicación del campo 2'
         *       }
         *     }
         *   },
         *   fallbackResponses: {
         *     keyword1: 'Respuesta cuando detecta keyword1',
         *     keyword2: 'Respuesta cuando detecta keyword2'
         *   }
         * }
         */
        registerModule(moduleKey, content) {
            this.modules[moduleKey] = {
                ...content,
                registeredAt: new Date().toISOString()
            };
            console.log(`[ModuleHelp] Módulo '${moduleKey}' registrado con ${Object.keys(content.contexts || {}).length} contextos`);
        },

        /**
         * Obtener contenido de un módulo
         */
        getModuleContent(moduleKey) {
            return this.modules[moduleKey] || null;
        },

        // =====================================================================
        // INICIALIZACIÓN
        // =====================================================================

        /**
         * Inicializar el sistema para un módulo específico
         * @param {string} moduleKey - Módulo a activar
         * @param {Object} options - Opciones de configuración
         */
        init(moduleKey, options = {}) {
            if (!this.modules[moduleKey]) {
                console.warn(`[ModuleHelp] Módulo '${moduleKey}' no registrado. Use registerModule() primero.`);
                return;
            }

            this.state.currentModule = moduleKey;
            this.state.currentContext = options.initialContext || 'dashboard';
            this.config = { ...this.config, ...options };

            if (!this.state.initialized) {
                this.injectStyles();
                this.createFloatingElements();
                this.bindGlobalEvents();
                this.state.initialized = true;
            }

            this.updateSuggestions();
            console.log(`[ModuleHelp] Inicializado para módulo '${moduleKey}'`);
        },

        // =====================================================================
        // ESTILOS CSS
        // =====================================================================

        injectStyles() {
            if (document.getElementById('module-help-styles')) return;

            const p = this.config.prefix;
            const styles = document.createElement('style');
            styles.id = 'module-help-styles';
            styles.textContent = `
                /* ========== FLOATING ACTION BUTTON ========== */
                .${p}-fab {
                    position: fixed;
                    bottom: ${this.config.fabPosition.bottom}px;
                    right: ${this.config.fabPosition.right}px;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9998;
                    transition: all 0.3s ease;
                    color: white;
                    font-size: 24px;
                }
                .${p}-fab:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5);
                }
                .${p}-fab .${p}-badge {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: #ef4444;
                    color: white;
                    font-size: 11px;
                    min-width: 20px;
                    height: 20px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                }

                /* ========== CONTEXT BANNER ========== */
                .${p}-banner {
                    background: linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
                    border-left: 4px solid #6366f1;
                    padding: 12px 16px;
                    margin-bottom: 16px;
                    border-radius: 0 8px 8px 0;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }
                .${p}-banner .${p}-icon {
                    background: rgba(99, 102, 241, 0.15);
                    padding: 8px;
                    border-radius: 8px;
                    color: #6366f1;
                    font-size: 18px;
                }
                .${p}-banner .${p}-content h4 {
                    margin: 0 0 4px 0;
                    color: #e2e8f0;
                    font-size: 14px;
                }
                .${p}-banner .${p}-content p {
                    margin: 0;
                    color: #94a3b8;
                    font-size: 13px;
                }
                .${p}-banner .${p}-tips {
                    margin-top: 8px;
                    padding-left: 16px;
                }
                .${p}-banner .${p}-tips li {
                    color: #94a3b8;
                    font-size: 12px;
                    margin-bottom: 4px;
                }
                .${p}-banner .${p}-close {
                    margin-left: auto;
                    background: none;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    padding: 4px;
                    font-size: 18px;
                }

                /* ========== FLOATING BUBBLE ========== */
                .${p}-bubble {
                    position: absolute;
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 12px;
                    padding: 12px 16px;
                    max-width: 300px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    z-index: 9999;
                    animation: ${p}BubbleIn 0.3s ease;
                }
                @keyframes ${p}BubbleIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .${p}-bubble::before {
                    content: '';
                    position: absolute;
                    bottom: -8px;
                    left: 20px;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 8px solid #334155;
                }
                .${p}-bubble-title {
                    font-weight: 600;
                    color: #f1f5f9;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .${p}-bubble-content {
                    color: #cbd5e1;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .${p}-bubble-close {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: none;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    font-size: 16px;
                }

                /* ========== FIELD HELP INDICATORS ========== */
                [data-help] {
                    position: relative;
                }
                .${p}-field-help {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: rgba(99, 102, 241, 0.2);
                    color: #6366f1;
                    font-size: 10px;
                    font-weight: bold;
                    margin-left: 6px;
                    cursor: help;
                    transition: all 0.2s ease;
                }
                .${p}-field-help:hover {
                    background: #6366f1;
                    color: white;
                    transform: scale(1.1);
                }

                /* ========== CHAT PANEL ========== */
                .${p}-chat {
                    position: fixed;
                    bottom: 160px;
                    right: ${this.config.fabPosition.right}px;
                    width: ${this.config.chatWidth}px;
                    max-height: ${this.config.chatMaxHeight}px;
                    background: #0f172a;
                    border: 1px solid #1e293b;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
                    z-index: 9999;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                }
                .${p}-chat.open { display: flex; }

                .${p}-chat-header {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    padding: 14px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .${p}-chat-header h4 {
                    margin: 0;
                    color: white;
                    font-size: 14px;
                    flex: 1;
                }
                .${p}-chat-header button {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 18px;
                }

                .${p}-chat-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    background: #1e293b;
                    max-height: 300px;
                }
                .${p}-chat-body::-webkit-scrollbar { width: 6px; }
                .${p}-chat-body::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }

                .${p}-chat-message {
                    margin-bottom: 12px;
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 13px;
                    line-height: 1.5;
                    max-width: 85%;
                }
                .${p}-chat-message.user {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    margin-left: auto;
                    border-bottom-right-radius: 4px;
                }
                .${p}-chat-message.assistant {
                    background: #334155;
                    color: #e2e8f0;
                    border-bottom-left-radius: 4px;
                }
                .${p}-chat-message code {
                    background: rgba(0,0,0,0.3);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 12px;
                }

                .${p}-chat-suggestions {
                    padding: 10px 16px;
                    background: #0f172a;
                    border-top: 1px solid #1e293b;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .${p}-chat-suggestion {
                    background: rgba(99, 102, 241, 0.1);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    color: #a5b4fc;
                    padding: 6px 12px;
                    border-radius: 16px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .${p}-chat-suggestion:hover {
                    background: rgba(99, 102, 241, 0.2);
                    border-color: #6366f1;
                }

                .${p}-chat-input-container {
                    padding: 12px;
                    background: #0f172a;
                    border-top: 1px solid #1e293b;
                    display: flex;
                    gap: 8px;
                }
                .${p}-chat-input {
                    flex: 1;
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 20px;
                    padding: 10px 16px;
                    color: #e2e8f0;
                    font-size: 13px;
                    outline: none;
                }
                .${p}-chat-input::placeholder { color: #64748b; }
                .${p}-chat-input:focus { border-color: #6366f1; }
                .${p}-chat-send {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border: none;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                }

                /* ========== VALIDATION ALERTS ========== */
                .${p}-alert {
                    padding: 10px 14px;
                    border-radius: 8px;
                    margin-top: 8px;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    font-size: 13px;
                }
                .${p}-alert.warning {
                    background: rgba(251, 191, 36, 0.1);
                    border: 1px solid rgba(251, 191, 36, 0.3);
                    color: #fbbf24;
                }
                .${p}-alert.error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #ef4444;
                }
                .${p}-alert.success {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    color: #22c55e;
                }
                .${p}-alert.info {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    color: #3b82f6;
                }
            `;
            document.head.appendChild(styles);
        },

        // =====================================================================
        // ELEMENTOS FLOTANTES
        // =====================================================================

        createFloatingElements() {
            const p = this.config.prefix;

            // FAB Button
            const fab = document.createElement('button');
            fab.className = `${p}-fab`;
            fab.id = `${p}-fab`;
            fab.innerHTML = '?';
            fab.onclick = () => this.toggleChat();
            fab.title = 'Ayuda contextual';

            // Chat Panel
            const chat = document.createElement('div');
            chat.className = `${p}-chat`;
            chat.id = `${p}-chat`;
            chat.innerHTML = `
                <div class="${p}-chat-header">
                    <span style="font-size: 20px;">💡</span>
                    <h4>Asistente de Ayuda</h4>
                    <button onclick="ModuleHelpSystem.toggleChat()">×</button>
                </div>
                <div class="${p}-chat-body" id="${p}-chat-body">
                    <div class="${p}-chat-message assistant">
                        Hola! Estoy aquí para ayudarte. Selecciona una pregunta o escribe la tuya.
                    </div>
                </div>
                <div class="${p}-chat-suggestions" id="${p}-chat-suggestions"></div>
                <div class="${p}-chat-input-container">
                    <input type="text" class="${p}-chat-input" id="${p}-chat-input"
                           placeholder="Escribe tu pregunta..."
                           onkeypress="if(event.key==='Enter')ModuleHelpSystem.sendMessage()">
                    <button class="${p}-chat-send" onclick="ModuleHelpSystem.sendMessage()">➤</button>
                </div>
            `;

            document.body.appendChild(fab);
            document.body.appendChild(chat);
        },

        // =====================================================================
        // EVENTOS GLOBALES
        // =====================================================================

        bindGlobalEvents() {
            // Detectar hover en campos con data-help
            document.addEventListener('mouseenter', (e) => {
                // Verificar que e.target tenga el método closest (no todos los nodos lo tienen)
                if (e.target && typeof e.target.closest === 'function') {
                    const helpTrigger = e.target.closest('[data-help]');
                    if (helpTrigger) {
                        this.showFieldHelp(helpTrigger, helpTrigger.dataset.help);
                    }
                }
            }, true);

            // Cerrar bubble al hacer click fuera
            document.addEventListener('click', (e) => {
                if (e.target && typeof e.target.closest === 'function') {
                    if (this.state.bubbleVisible && !e.target.closest(`.${this.config.prefix}-bubble`)) {
                        this.closeBubble();
                    }
                }
            });
        },

        // =====================================================================
        // CONTEXTO
        // =====================================================================

        setContext(contextKey) {
            this.state.currentContext = contextKey;
            this.updateSuggestions();
            console.log(`[ModuleHelp] Contexto: ${contextKey}`);
        },

        getCurrentContext() {
            const moduleContent = this.getModuleContent(this.state.currentModule);
            return moduleContent?.contexts?.[this.state.currentContext] || null;
        },

        updateSuggestions() {
            const p = this.config.prefix;
            const container = document.getElementById(`${p}-chat-suggestions`);
            if (!container) return;

            const ctx = this.getCurrentContext();
            const topics = ctx?.helpTopics || [];

            container.innerHTML = topics.map(topic =>
                `<button class="${p}-chat-suggestion" onclick="ModuleHelpSystem.askQuestion('${topic.replace(/'/g, "\\'")}')">${topic}</button>`
            ).join('');
        },

        // =====================================================================
        // BANNERS CONTEXTUALES (SIN OLLAMA)
        // =====================================================================

        /**
         * Genera HTML de banner contextual
         * Usar en el render del módulo: ${ModuleHelpSystem.renderBanner('contexto')}
         */
        renderBanner(contextKey) {
            const p = this.config.prefix;
            const moduleContent = this.getModuleContent(this.state.currentModule);
            const ctx = moduleContent?.contexts?.[contextKey];

            if (!ctx) return '';

            const tipsHtml = ctx.tips?.length
                ? `<ul class="${p}-tips">${ctx.tips.map(t => `<li>💡 ${t}</li>`).join('')}</ul>`
                : '';

            return `
                <div class="${p}-banner" id="${p}-banner-${contextKey}">
                    <div class="${p}-icon">ℹ️</div>
                    <div class="${p}-content">
                        <h4>${ctx.title || contextKey}</h4>
                        <p>${ctx.description || ''}</p>
                        ${tipsHtml}
                    </div>
                    <button class="${p}-close" onclick="this.parentElement.style.display='none'">×</button>
                </div>
            `;
        },

        // =====================================================================
        // BURBUJAS FLOTANTES
        // =====================================================================

        showBubble(element, title, content) {
            this.closeBubble();

            const p = this.config.prefix;
            const bubble = document.createElement('div');
            bubble.className = `${p}-bubble`;
            bubble.id = `${p}-bubble`;
            bubble.innerHTML = `
                <button class="${p}-bubble-close" onclick="ModuleHelpSystem.closeBubble()">×</button>
                <div class="${p}-bubble-title">💡 ${title}</div>
                <div class="${p}-bubble-content">${content}</div>
            `;

            const rect = element.getBoundingClientRect();
            bubble.style.top = `${rect.top - 10 + window.scrollY}px`;
            bubble.style.left = `${rect.left + window.scrollX}px`;
            bubble.style.transform = 'translateY(-100%)';

            document.body.appendChild(bubble);
            this.state.bubbleVisible = true;
        },

        closeBubble() {
            const p = this.config.prefix;
            const bubble = document.getElementById(`${p}-bubble`);
            if (bubble) {
                bubble.remove();
                this.state.bubbleVisible = false;
            }
        },

        showFieldHelp(element, helpKey) {
            const [contextKey, fieldKey] = helpKey.includes('.')
                ? helpKey.split('.')
                : [this.state.currentContext, helpKey];

            const moduleContent = this.getModuleContent(this.state.currentModule);
            const ctx = moduleContent?.contexts?.[contextKey];
            const help = ctx?.fieldHelp?.[fieldKey];

            if (help) {
                this.showBubble(element, fieldKey.replace(/_/g, ' '), help);
            }
        },

        // =====================================================================
        // CHAT CON OLLAMA
        // =====================================================================

        toggleChat() {
            const p = this.config.prefix;
            const chat = document.getElementById(`${p}-chat`);
            if (chat) {
                chat.classList.toggle('open');
                this.state.chatOpen = chat.classList.contains('open');
                if (this.state.chatOpen) {
                    this.updateSuggestions();
                    document.getElementById(`${p}-chat-input`)?.focus();
                }
            }
        },

        async sendMessage() {
            const p = this.config.prefix;
            const input = document.getElementById(`${p}-chat-input`);
            const message = input?.value?.trim();
            if (!message) return;

            input.value = '';
            this.addChatMessage(message, 'user');

            const typingId = this.addChatMessage('Analizando...', 'assistant', true);

            try {
                const response = await this.askOllama(message);
                this.updateChatMessage(typingId, response);
            } catch (error) {
                this.updateChatMessage(typingId, 'Lo siento, no pude procesar tu pregunta. Intenta de nuevo.');
            }
        },

        async askQuestion(question) {
            const p = this.config.prefix;
            const input = document.getElementById(`${p}-chat-input`);
            if (input) input.value = question;
            await this.sendMessage();
        },

        addChatMessage(content, type, isTyping = false) {
            const p = this.config.prefix;
            const body = document.getElementById(`${p}-chat-body`);
            const id = 'msg-' + Date.now();
            const msg = document.createElement('div');
            msg.className = `${p}-chat-message ${type}`;
            msg.id = id;
            msg.innerHTML = isTyping ? '<em>Escribiendo...</em>' : content;
            body.appendChild(msg);
            body.scrollTop = body.scrollHeight;
            return id;
        },

        updateChatMessage(id, content) {
            const msg = document.getElementById(id);
            if (msg) {
                msg.innerHTML = content.replace(/\n/g, '<br>');
            }
        },

        async askOllama(question) {
            const moduleContent = this.getModuleContent(this.state.currentModule);
            const ctx = this.getCurrentContext();

            const systemPrompt = `Eres un asistente experto en el módulo "${moduleContent?.moduleName || this.state.currentModule}".
El usuario está en: ${ctx?.title || 'General'}.
${ctx?.description || ''}
Responde de forma concisa (máximo 150 palabras). Usa ejemplos concretos.`;

            try {
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

                if (!token) {
                    console.log('[ModuleHelp] Sin token, usando fallback');
                    return this.getFallbackResponse(question);
                }

                const response = await fetch('/api/assistant/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        question: question,
                        context: {
                            module: this.state.currentModule,
                            screen: this.state.currentContext,
                            systemPrompt: systemPrompt
                        }
                    })
                });

                if (!response.ok) {
                    console.log('[ModuleHelp] Error HTTP', response.status);
                    return this.getFallbackResponse(question);
                }

                const data = await response.json();
                const answer = data.response || data.answer || data.message;

                if (answer && answer.length > 10) {
                    return answer;
                }

                return this.getFallbackResponse(question);
            } catch (error) {
                console.error('[ModuleHelp] Ollama error:', error);
                return this.getFallbackResponse(question);
            }
        },

        getFallbackResponse(question) {
            const moduleContent = this.getModuleContent(this.state.currentModule);
            const fallbacks = moduleContent?.fallbackResponses || {};
            const q = question.toLowerCase();

            // Buscar keyword match
            for (const [keyword, response] of Object.entries(fallbacks)) {
                if (q.includes(keyword.toLowerCase())) {
                    return response;
                }
            }

            // Respuesta genérica
            const ctx = this.getCurrentContext();
            return `<strong>${ctx?.title || 'Ayuda'}</strong>

${ctx?.description || 'Estoy aquí para ayudarte.'}

${ctx?.tips?.length ? '<strong>Tips:</strong><br>• ' + ctx.tips.join('<br>• ') : ''}

¿Puedes ser más específico con tu pregunta?`;
        },

        // =====================================================================
        // VALIDACIÓN PROACTIVA
        // =====================================================================

        validateForm(formSelector, contextKey) {
            const moduleContent = this.getModuleContent(this.state.currentModule);
            const ctx = moduleContent?.contexts?.[contextKey];
            const validations = ctx?.validations || [];
            const form = document.querySelector(formSelector);

            if (!form) return { valid: true, errors: [] };

            const errors = [];

            for (const v of validations) {
                const field = form.querySelector(`[name="${v.field}"]`);
                if (!field) continue;

                const value = field.value?.trim();

                if (v.rule === 'required' && !value) {
                    errors.push({ field: v.field, message: v.message });
                }
                if (v.rule.startsWith('minLength:')) {
                    const minLen = parseInt(v.rule.split(':')[1]);
                    if (value && value.length < minLen) {
                        errors.push({ field: v.field, message: v.message });
                    }
                }
            }

            return { valid: errors.length === 0, errors };
        },

        showValidationErrors(errors, formElement) {
            const p = this.config.prefix;

            // Limpiar errores previos
            formElement.querySelectorAll(`.${p}-alert`).forEach(el => el.remove());

            for (const err of errors) {
                const field = formElement.querySelector(`[name="${err.field}"]`);
                if (field) {
                    const alert = document.createElement('div');
                    alert.className = `${p}-alert error`;
                    alert.innerHTML = `<span>⚠️</span> ${err.message}`;
                    field.parentElement.appendChild(alert);
                }
            }
        }
    };

    // Exponer globalmente
    window.ModuleHelpSystem = ModuleHelpSystem;

})();
