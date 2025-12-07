/**
 * ============================================================================
 * UNIFIED HELP CENTER v1.0
 * ============================================================================
 * Centro de Ayuda Unificado con 3 tabs:
 * 1. Chat IA - Preguntas rápidas con Ollama
 * 2. Mis Tickets - Sistema de soporte via notificaciones
 * 3. Guías - Ayuda contextual del módulo actual
 *
 * PRINCIPIO: UN SOLO BOTÓN FLOTANTE para toda la ayuda
 * ============================================================================
 */

console.log('🎯 [UNIFIED-HELP] Centro de Ayuda Unificado v1.0 cargando...');

(function() {
    'use strict';

    // ========================================================================
    // CONFIGURACIÓN
    // ========================================================================

    const CONFIG = {
        apiBase: '/api/v1/help',
        position: { bottom: '20px', right: '20px' },
        panelWidth: '420px',
        panelHeight: '550px',
        animationDuration: 300,
        autoCloseDelay: 300000, // 5 minutos
        pollInterval: 30000 // 30 segundos para updates
    };

    // ========================================================================
    // ESTADO
    // ========================================================================

    const state = {
        isOpen: false,
        activeTab: 'chat',
        currentModule: null,
        chatHistory: [],
        tickets: [],
        contextualHelp: null,
        stats: {},
        isLoading: false,
        ollamaStatus: 'checking'
    };

    // ========================================================================
    // ESTILOS
    // ========================================================================

    const STYLES = `
        /* Container principal */
        #unified-help-container {
            position: fixed;
            bottom: ${CONFIG.position.bottom};
            right: ${CONFIG.position.right};
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Botón flotante único */
        #unified-help-btn {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            position: relative;
        }

        #unified-help-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
        }

        #unified-help-btn svg {
            width: 28px;
            height: 28px;
            fill: white;
        }

        /* Badge de notificaciones */
        #unified-help-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: white;
            font-size: 11px;
            font-weight: 600;
            min-width: 20px;
            height: 20px;
            border-radius: 10px;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 0 5px;
        }

        #unified-help-badge.visible {
            display: flex;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        /* Panel principal */
        #unified-help-panel {
            position: absolute;
            bottom: 70px;
            right: 0;
            width: ${CONFIG.panelWidth};
            height: ${CONFIG.panelHeight};
            background: #0f172a;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            display: none;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #334155;
        }

        #unified-help-panel.open {
            display: flex;
            animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* Header del panel */
        .uhc-header {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            padding: 16px;
            border-bottom: 1px solid #334155;
        }

        .uhc-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .uhc-title {
            color: #f1f5f9;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .uhc-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: #94a3b8;
        }

        .uhc-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22c55e;
        }

        .uhc-status-dot.offline {
            background: #ef4444;
        }

        .uhc-close-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s;
        }

        .uhc-close-btn:hover {
            background: #334155;
            color: #f1f5f9;
        }

        /* Tabs */
        .uhc-tabs {
            display: flex;
            gap: 4px;
            background: #1e293b;
            padding: 4px;
            border-radius: 8px;
        }

        .uhc-tab {
            flex: 1;
            padding: 8px 12px;
            border: none;
            background: transparent;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .uhc-tab:hover {
            background: #334155;
            color: #e2e8f0;
        }

        .uhc-tab.active {
            background: #6366f1;
            color: white;
        }

        .uhc-tab-badge {
            background: #ef4444;
            color: white;
            font-size: 10px;
            min-width: 16px;
            height: 16px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Content area */
        .uhc-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }

        .uhc-content::-webkit-scrollbar {
            width: 6px;
        }

        .uhc-content::-webkit-scrollbar-track {
            background: #1e293b;
        }

        .uhc-content::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 3px;
        }

        /* Tab: Chat IA */
        .uhc-chat-messages {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 16px;
        }

        .uhc-message {
            max-width: 90%;
            padding: 12px;
            border-radius: 12px;
            font-size: 13px;
            line-height: 1.5;
        }

        .uhc-message.user {
            align-self: flex-end;
            background: #6366f1;
            color: white;
            border-bottom-right-radius: 4px;
        }

        .uhc-message.assistant {
            align-self: flex-start;
            background: #1e293b;
            color: #e2e8f0;
            border-bottom-left-radius: 4px;
            border: 1px solid #334155;
        }

        .uhc-message-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
            font-size: 10px;
            color: #94a3b8;
        }

        .uhc-source-badge {
            background: #334155;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
        }

        .uhc-feedback-btns {
            display: flex;
            gap: 4px;
        }

        .uhc-feedback-btn {
            background: transparent;
            border: 1px solid #475569;
            color: #94a3b8;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }

        .uhc-feedback-btn:hover {
            background: #334155;
            color: #e2e8f0;
        }

        .uhc-feedback-btn.positive:hover {
            background: #22c55e;
            border-color: #22c55e;
            color: white;
        }

        .uhc-feedback-btn.negative:hover {
            background: #ef4444;
            border-color: #ef4444;
            color: white;
        }

        /* Chat input */
        .uhc-chat-input-container {
            display: flex;
            gap: 8px;
            padding: 12px;
            background: #1e293b;
            border-top: 1px solid #334155;
        }

        .uhc-chat-input {
            flex: 1;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 10px 14px;
            color: #e2e8f0;
            font-size: 13px;
            outline: none;
            transition: border-color 0.2s;
        }

        .uhc-chat-input:focus {
            border-color: #6366f1;
        }

        .uhc-chat-input::placeholder {
            color: #64748b;
        }

        .uhc-send-btn {
            background: #6366f1;
            border: none;
            border-radius: 8px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        .uhc-send-btn:hover {
            background: #4f46e5;
        }

        .uhc-send-btn:disabled {
            background: #475569;
            cursor: not-allowed;
        }

        .uhc-send-btn svg {
            fill: white;
            width: 18px;
            height: 18px;
        }

        /* Tab: Tickets */
        .uhc-ticket-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .uhc-ticket-item {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .uhc-ticket-item:hover {
            border-color: #6366f1;
            background: #1e3a5f;
        }

        .uhc-ticket-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .uhc-ticket-number {
            font-size: 11px;
            color: #6366f1;
            font-weight: 500;
        }

        .uhc-ticket-status {
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: 500;
        }

        .uhc-ticket-status.open {
            background: #22c55e20;
            color: #22c55e;
        }

        .uhc-ticket-status.pending {
            background: #f59e0b20;
            color: #f59e0b;
        }

        .uhc-ticket-status.closed {
            background: #64748b20;
            color: #64748b;
        }

        .uhc-ticket-subject {
            font-size: 13px;
            color: #e2e8f0;
            font-weight: 500;
            margin-bottom: 4px;
        }

        .uhc-ticket-preview {
            font-size: 12px;
            color: #94a3b8;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .uhc-ticket-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            font-size: 11px;
            color: #64748b;
        }

        .uhc-unread-badge {
            background: #ef4444;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
        }

        /* Create ticket button */
        .uhc-create-ticket-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            margin-bottom: 12px;
            transition: all 0.2s;
        }

        .uhc-create-ticket-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        /* Tab: Guías */
        .uhc-guide-section {
            margin-bottom: 16px;
        }

        .uhc-guide-title {
            font-size: 14px;
            font-weight: 600;
            color: #e2e8f0;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .uhc-guide-content {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 12px;
            font-size: 13px;
            color: #94a3b8;
            line-height: 1.6;
        }

        .uhc-quick-start {
            background: #1e3a5f;
            border-color: #6366f1;
        }

        .uhc-issues-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .uhc-issue-item {
            padding: 8px 0;
            border-bottom: 1px solid #334155;
        }

        .uhc-issue-item:last-child {
            border-bottom: none;
        }

        .uhc-issue-q {
            font-weight: 500;
            color: #e2e8f0;
            margin-bottom: 4px;
        }

        .uhc-issue-a {
            color: #94a3b8;
            font-size: 12px;
        }

        .uhc-walkthrough-btn {
            width: 100%;
            padding: 12px;
            background: #334155;
            border: 1px solid #475569;
            border-radius: 8px;
            color: #e2e8f0;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .uhc-walkthrough-btn:hover {
            background: #475569;
            border-color: #6366f1;
        }

        /* Empty states */
        .uhc-empty {
            text-align: center;
            padding: 40px 20px;
            color: #64748b;
        }

        .uhc-empty-icon {
            font-size: 40px;
            margin-bottom: 12px;
        }

        .uhc-empty-text {
            font-size: 13px;
            margin-bottom: 16px;
        }

        /* Loading */
        .uhc-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 20px;
            color: #94a3b8;
        }

        .uhc-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #334155;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Suggest ticket banner */
        .uhc-suggest-ticket {
            background: linear-gradient(135deg, #1e3a5f, #1e293b);
            border: 1px solid #6366f1;
            border-radius: 8px;
            padding: 12px;
            margin-top: 12px;
        }

        .uhc-suggest-ticket p {
            color: #e2e8f0;
            font-size: 12px;
            margin: 0 0 8px 0;
        }

        .uhc-suggest-ticket button {
            background: #6366f1;
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .uhc-suggest-ticket button:hover {
            background: #4f46e5;
        }

        /* Ticket detail modal */
        .uhc-ticket-detail {
            position: absolute;
            inset: 0;
            background: #0f172a;
            display: none;
            flex-direction: column;
        }

        .uhc-ticket-detail.open {
            display: flex;
        }

        .uhc-ticket-detail-header {
            padding: 16px;
            border-bottom: 1px solid #334155;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .uhc-back-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
        }

        .uhc-ticket-detail-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
    `;

    // ========================================================================
    // UTILIDADES
    // ========================================================================

    function getToken() {
        return localStorage.getItem('authToken') ||
               sessionStorage.getItem('authToken') ||
               localStorage.getItem('token');
    }

    function getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        };
    }

    async function apiCall(endpoint, options = {}) {
        const response = await fetch(`${CONFIG.apiBase}${endpoint}`, {
            headers: getAuthHeaders(),
            ...options
        });
        return response.json();
    }

    function getCurrentModule() {
        // Detectar módulo actual desde la UI
        const activeTab = document.querySelector('.nav-link.active, .menu-item.active');
        if (activeTab) {
            return activeTab.getAttribute('data-module') ||
                   activeTab.getAttribute('data-tab') ||
                   activeTab.textContent.trim().toLowerCase().replace(/\s+/g, '-');
        }
        return 'general';
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Ahora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }

    // ========================================================================
    // RENDERIZADO
    // ========================================================================

    function injectStyles() {
        if (document.getElementById('unified-help-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'unified-help-styles';
        styleSheet.textContent = STYLES;
        document.head.appendChild(styleSheet);
    }

    function createContainer() {
        if (document.getElementById('unified-help-container')) return;

        const container = document.createElement('div');
        container.id = 'unified-help-container';
        container.innerHTML = `
            <!-- Botón flotante único -->
            <button id="unified-help-btn" title="Centro de Ayuda">
                <svg viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                </svg>
                <span id="unified-help-badge"></span>
            </button>

            <!-- Panel principal -->
            <div id="unified-help-panel">
                <!-- Header -->
                <div class="uhc-header">
                    <div class="uhc-header-top">
                        <div class="uhc-title">
                            <span>🎯</span>
                            Centro de Ayuda
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="uhc-status">
                                <span class="uhc-status-dot" id="uhc-ollama-status"></span>
                                <span id="uhc-status-text">IA Activa</span>
                            </div>
                            <button class="uhc-close-btn" id="uhc-close-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Tabs -->
                    <div class="uhc-tabs">
                        <button class="uhc-tab active" data-tab="chat">
                            <span>💬</span> Chat IA
                        </button>
                        <button class="uhc-tab" data-tab="tickets">
                            <span>🎫</span> Tickets
                            <span class="uhc-tab-badge" id="uhc-tickets-badge" style="display:none">0</span>
                        </button>
                        <button class="uhc-tab" data-tab="guides">
                            <span>📖</span> Guías
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="uhc-content" id="uhc-content">
                    <!-- Se renderiza dinámicamente -->
                </div>

                <!-- Chat input (solo visible en tab chat) -->
                <div class="uhc-chat-input-container" id="uhc-chat-input-container">
                    <input type="text"
                           class="uhc-chat-input"
                           id="uhc-chat-input"
                           placeholder="Escribe tu pregunta..."
                           maxlength="500">
                    <button class="uhc-send-btn" id="uhc-send-btn">
                        <svg viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>

                <!-- Ticket detail view (hidden by default) -->
                <div class="uhc-ticket-detail" id="uhc-ticket-detail">
                    <!-- Se renderiza dinámicamente -->
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    function renderChatTab() {
        const content = document.getElementById('uhc-content');
        const inputContainer = document.getElementById('uhc-chat-input-container');

        inputContainer.style.display = 'flex';

        if (state.chatHistory.length === 0) {
            content.innerHTML = `
                <div class="uhc-empty">
                    <div class="uhc-empty-icon">💬</div>
                    <div class="uhc-empty-text">
                        ¡Hola! Soy tu asistente virtual.<br>
                        ¿En qué puedo ayudarte?
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                        <button class="uhc-quick-q" onclick="UnifiedHelpCenter.askQuestion('¿Cómo agrego un usuario?')">
                            👤 Agregar usuario
                        </button>
                        <button class="uhc-quick-q" onclick="UnifiedHelpCenter.askQuestion('¿Cómo registro asistencia?')">
                            ⏰ Registrar asistencia
                        </button>
                        <button class="uhc-quick-q" onclick="UnifiedHelpCenter.askQuestion('¿Cómo solicito vacaciones?')">
                            🏖️ Vacaciones
                        </button>
                    </div>
                </div>
            `;

            // Estilos para quick questions
            const style = document.createElement('style');
            style.textContent = `
                .uhc-quick-q {
                    background: #1e293b;
                    border: 1px solid #334155;
                    color: #e2e8f0;
                    padding: 8px 12px;
                    border-radius: 16px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .uhc-quick-q:hover {
                    background: #334155;
                    border-color: #6366f1;
                }
            `;
            content.appendChild(style);
            return;
        }

        let html = '<div class="uhc-chat-messages">';

        state.chatHistory.forEach((msg, index) => {
            html += `
                <div class="uhc-message ${msg.role}">
                    ${msg.content}
                    ${msg.role === 'assistant' ? `
                        <div class="uhc-message-meta">
                            ${msg.source ? `<span class="uhc-source-badge">${msg.source === 'ollama' ? '🧠 Ollama' : msg.source === 'knowledge_base' ? '📚 KB' : '💡'}</span>` : ''}
                            ${msg.confidence ? `<span>${Math.round(msg.confidence * 100)}%</span>` : ''}
                            <div class="uhc-feedback-btns">
                                <button class="uhc-feedback-btn positive" onclick="UnifiedHelpCenter.sendFeedback('${msg.id}', true)" title="Útil">👍</button>
                                <button class="uhc-feedback-btn negative" onclick="UnifiedHelpCenter.sendFeedback('${msg.id}', false)" title="No útil">👎</button>
                            </div>
                        </div>
                        ${msg.suggestTicket ? `
                            <div class="uhc-suggest-ticket">
                                <p>${msg.suggestTicketMessage || '¿No encontraste lo que buscabas?'}</p>
                                <button onclick="UnifiedHelpCenter.switchTab('tickets'); UnifiedHelpCenter.showCreateTicket();">
                                    Crear ticket de soporte
                                </button>
                            </div>
                        ` : ''}
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        content.innerHTML = html;

        // Scroll al final
        content.scrollTop = content.scrollHeight;
    }

    function renderTicketsTab() {
        const content = document.getElementById('uhc-content');
        const inputContainer = document.getElementById('uhc-chat-input-container');

        inputContainer.style.display = 'none';

        if (state.isLoading) {
            content.innerHTML = `
                <div class="uhc-loading">
                    <div class="uhc-spinner"></div>
                    <span>Cargando tickets...</span>
                </div>
            `;
            return;
        }

        let html = `
            <button class="uhc-create-ticket-btn" onclick="UnifiedHelpCenter.showCreateTicket()">
                ➕ Crear nuevo ticket
            </button>
        `;

        if (state.tickets.length === 0) {
            html += `
                <div class="uhc-empty">
                    <div class="uhc-empty-icon">🎫</div>
                    <div class="uhc-empty-text">
                        No tienes tickets de soporte.<br>
                        Crea uno si necesitas ayuda especializada.
                    </div>
                </div>
            `;
        } else {
            html += '<div class="uhc-ticket-list">';

            state.tickets.forEach(ticket => {
                const statusClass = ticket.status === 'closed' ? 'closed' :
                                   ticket.status === 'open' || ticket.status === 'pending' ? 'open' : 'pending';

                html += `
                    <div class="uhc-ticket-item" onclick="UnifiedHelpCenter.openTicket('${ticket.id}')">
                        <div class="uhc-ticket-header">
                            <span class="uhc-ticket-number">${ticket.ticket_number || '#' + ticket.id.substring(0, 8)}</span>
                            <span class="uhc-ticket-status ${statusClass}">${ticket.status}</span>
                        </div>
                        <div class="uhc-ticket-subject">${ticket.subject || 'Sin asunto'}</div>
                        <div class="uhc-ticket-preview">${ticket.last_message || ''}</div>
                        <div class="uhc-ticket-footer">
                            <span>${formatDate(ticket.last_activity || ticket.created_at)}</span>
                            ${ticket.unread_count > 0 ? `<span class="uhc-unread-badge">${ticket.unread_count}</span>` : ''}
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        }

        content.innerHTML = html;
    }

    function renderGuidesTab() {
        const content = document.getElementById('uhc-content');
        const inputContainer = document.getElementById('uhc-chat-input-container');

        inputContainer.style.display = 'none';

        const help = state.contextualHelp;

        if (!help) {
            content.innerHTML = `
                <div class="uhc-loading">
                    <div class="uhc-spinner"></div>
                    <span>Cargando guías...</span>
                </div>
            `;
            loadContextualHelp();
            return;
        }

        let html = `
            <div class="uhc-guide-section">
                <div class="uhc-guide-title">📍 ${help.title || 'Ayuda del módulo'}</div>
                <div class="uhc-guide-content">
                    ${help.description || 'Información del módulo actual.'}
                </div>
            </div>
        `;

        if (help.quick_start) {
            html += `
                <div class="uhc-guide-section">
                    <div class="uhc-guide-title">🚀 Inicio rápido</div>
                    <div class="uhc-guide-content uhc-quick-start">
                        ${help.quick_start}
                    </div>
                </div>
            `;
        }

        if (help.common_issues && help.common_issues.length > 0) {
            html += `
                <div class="uhc-guide-section">
                    <div class="uhc-guide-title">❓ Problemas frecuentes</div>
                    <div class="uhc-guide-content">
                        <ul class="uhc-issues-list">
                            ${help.common_issues.map(issue => `
                                <li class="uhc-issue-item">
                                    <div class="uhc-issue-q">${issue.issue}</div>
                                    <div class="uhc-issue-a">${issue.solution}</div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        if (help.walkthrough_steps && help.walkthrough_steps.length > 0) {
            html += `
                <button class="uhc-walkthrough-btn" onclick="UnifiedHelpCenter.startWalkthrough()">
                    🎓 Iniciar tutorial guiado
                </button>
            `;
        }

        content.innerHTML = html;
    }

    function showCreateTicketForm() {
        const content = document.getElementById('uhc-content');
        const inputContainer = document.getElementById('uhc-chat-input-container');

        inputContainer.style.display = 'none';

        content.innerHTML = `
            <div style="padding: 8px;">
                <h3 style="color: #e2e8f0; margin: 0 0 16px 0; font-size: 14px;">
                    ➕ Nuevo ticket de soporte
                </h3>

                <div style="margin-bottom: 12px;">
                    <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">Asunto</label>
                    <input type="text" id="uhc-ticket-subject"
                           style="width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 10px; color: #e2e8f0; font-size: 13px;"
                           placeholder="Describe brevemente tu problema">
                </div>

                <div style="margin-bottom: 12px;">
                    <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">Descripción</label>
                    <textarea id="uhc-ticket-message" rows="4"
                              style="width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 10px; color: #e2e8f0; font-size: 13px; resize: none;"
                              placeholder="Explica con detalle qué necesitas..."></textarea>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 4px;">Prioridad</label>
                    <select id="uhc-ticket-priority"
                            style="width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 10px; color: #e2e8f0; font-size: 13px;">
                        <option value="low">Baja</option>
                        <option value="medium" selected>Media</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                    </select>
                </div>

                <div style="display: flex; gap: 8px;">
                    <button onclick="UnifiedHelpCenter.submitTicket()"
                            style="flex: 1; background: #6366f1; border: none; border-radius: 6px; padding: 12px; color: white; font-size: 13px; cursor: pointer;">
                        Enviar ticket
                    </button>
                    <button onclick="UnifiedHelpCenter.switchTab('tickets')"
                            style="background: #334155; border: none; border-radius: 6px; padding: 12px; color: #e2e8f0; font-size: 13px; cursor: pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
    }

    // ========================================================================
    // API CALLS
    // ========================================================================

    async function sendMessage(question) {
        // Agregar mensaje del usuario
        state.chatHistory.push({
            role: 'user',
            content: question
        });
        renderChatTab();

        state.isLoading = true;

        try {
            const result = await apiCall('/ask', {
                method: 'POST',
                body: JSON.stringify({
                    question,
                    context: {
                        moduleContext: getCurrentModule(),
                        screenContext: document.title
                    }
                })
            });

            state.chatHistory.push({
                role: 'assistant',
                content: result.answer || 'Lo siento, no pude procesar tu pregunta.',
                source: result.source,
                confidence: result.confidence,
                suggestTicket: result.suggestTicket,
                suggestTicketMessage: result.suggestTicketMessage,
                id: result.interactionId || Date.now().toString()
            });

        } catch (error) {
            state.chatHistory.push({
                role: 'assistant',
                content: 'Error al conectar con el servidor. ¿Deseas crear un ticket de soporte?',
                suggestTicket: true
            });
        }

        state.isLoading = false;
        renderChatTab();
    }

    async function loadTickets() {
        state.isLoading = true;
        renderTicketsTab();

        try {
            const result = await apiCall('/tickets');
            state.tickets = result.tickets || [];

            // Actualizar badge
            const unreadCount = state.tickets.reduce((sum, t) => sum + (t.unread_count || 0), 0);
            updateBadge(unreadCount);

        } catch (error) {
            console.error('[UNIFIED-HELP] Error cargando tickets:', error);
            state.tickets = [];
        }

        state.isLoading = false;
        renderTicketsTab();
    }

    async function loadContextualHelp() {
        try {
            const moduleKey = getCurrentModule();
            const result = await apiCall(`/module/${moduleKey}`);
            state.contextualHelp = result.help || null;
        } catch (error) {
            console.error('[UNIFIED-HELP] Error cargando ayuda:', error);
            state.contextualHelp = {
                title: 'Ayuda del sistema',
                description: 'Información general del módulo.',
                quick_start: 'Navega por las opciones disponibles.'
            };
        }
        renderGuidesTab();
    }

    async function checkOllamaStatus() {
        try {
            const result = await apiCall('/health');
            state.ollamaStatus = result.ollama?.status || 'offline';
        } catch (error) {
            state.ollamaStatus = 'offline';
        }

        updateOllamaIndicator();
    }

    function updateOllamaIndicator() {
        const dot = document.getElementById('uhc-ollama-status');
        const text = document.getElementById('uhc-status-text');

        if (dot && text) {
            if (state.ollamaStatus === 'online') {
                dot.classList.remove('offline');
                text.textContent = 'IA Activa';
            } else {
                dot.classList.add('offline');
                text.textContent = 'Modo básico';
            }
        }
    }

    function updateBadge(count) {
        const badge = document.getElementById('unified-help-badge');
        const tabBadge = document.getElementById('uhc-tickets-badge');

        if (badge) {
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.classList.add('visible');
            } else {
                badge.classList.remove('visible');
            }
        }

        if (tabBadge) {
            if (count > 0) {
                tabBadge.textContent = count;
                tabBadge.style.display = 'flex';
            } else {
                tabBadge.style.display = 'none';
            }
        }
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    function setupEventListeners() {
        // Botón principal
        document.getElementById('unified-help-btn').addEventListener('click', () => {
            togglePanel();
        });

        // Cerrar panel
        document.getElementById('uhc-close-btn').addEventListener('click', () => {
            closePanel();
        });

        // Tabs
        document.querySelectorAll('.uhc-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                switchTab(tab.dataset.tab);
            });
        });

        // Chat input
        const chatInput = document.getElementById('uhc-chat-input');
        const sendBtn = document.getElementById('uhc-send-btn');

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitChatMessage();
            }
        });

        sendBtn.addEventListener('click', submitChatMessage);

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) {
                closePanel();
            }
        });
    }

    function togglePanel() {
        state.isOpen = !state.isOpen;
        const panel = document.getElementById('unified-help-panel');

        if (state.isOpen) {
            panel.classList.add('open');
            checkOllamaStatus();
            if (state.activeTab === 'tickets') {
                loadTickets();
            }
        } else {
            panel.classList.remove('open');
        }
    }

    function closePanel() {
        state.isOpen = false;
        document.getElementById('unified-help-panel').classList.remove('open');
    }

    function switchTab(tabName) {
        state.activeTab = tabName;

        // Actualizar tabs UI
        document.querySelectorAll('.uhc-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Renderizar contenido
        switch (tabName) {
            case 'chat':
                renderChatTab();
                break;
            case 'tickets':
                loadTickets();
                break;
            case 'guides':
                state.contextualHelp = null; // Forzar recarga
                renderGuidesTab();
                break;
        }
    }

    function submitChatMessage() {
        const input = document.getElementById('uhc-chat-input');
        const message = input.value.trim();

        if (message.length < 3) return;

        input.value = '';
        sendMessage(message);
    }

    // ========================================================================
    // API PÚBLICA
    // ========================================================================

    window.UnifiedHelpCenter = {
        init() {
            console.log('[UNIFIED-HELP] Inicializando...');
            injectStyles();
            createContainer();
            setupEventListeners();
            checkOllamaStatus();

            // Poll para actualizaciones
            setInterval(() => {
                if (state.isOpen && state.activeTab === 'tickets') {
                    loadTickets();
                }
            }, CONFIG.pollInterval);

            console.log('[UNIFIED-HELP] ✅ Inicializado correctamente');
        },

        open() {
            if (!state.isOpen) togglePanel();
        },

        close() {
            closePanel();
        },

        switchTab(tabName) {
            switchTab(tabName);
        },

        askQuestion(question) {
            state.activeTab = 'chat';
            switchTab('chat');
            if (!state.isOpen) togglePanel();
            sendMessage(question);
        },

        showCreateTicket() {
            showCreateTicketForm();
        },

        async submitTicket() {
            const subject = document.getElementById('uhc-ticket-subject').value.trim();
            const message = document.getElementById('uhc-ticket-message').value.trim();
            const priority = document.getElementById('uhc-ticket-priority').value;

            if (!subject || !message) {
                alert('Por favor completa el asunto y la descripción');
                return;
            }

            try {
                const result = await apiCall('/ticket', {
                    method: 'POST',
                    body: JSON.stringify({
                        subject,
                        message,
                        priority,
                        moduleContext: getCurrentModule()
                    })
                });

                if (result.success) {
                    alert(`✅ ${result.message}`);
                    loadTickets();
                } else {
                    alert(`Error: ${result.error}`);
                }
            } catch (error) {
                alert('Error al crear el ticket');
            }
        },

        async openTicket(threadId) {
            // TODO: Implementar vista de detalle de ticket
            console.log('Abriendo ticket:', threadId);
        },

        async sendFeedback(interactionId, isHelpful) {
            try {
                await apiCall(`/feedback/${interactionId}`, {
                    method: 'POST',
                    body: JSON.stringify({ isHelpful })
                });
                console.log('[UNIFIED-HELP] Feedback enviado');
            } catch (error) {
                console.error('[UNIFIED-HELP] Error enviando feedback:', error);
            }
        },

        startWalkthrough() {
            // TODO: Implementar walkthrough
            console.log('Iniciando walkthrough...');
        }
    };

    // Auto-inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => UnifiedHelpCenter.init());
    } else {
        UnifiedHelpCenter.init();
    }

})();
