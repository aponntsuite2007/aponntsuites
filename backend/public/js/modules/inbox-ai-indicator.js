/**
 * ============================================================================
 * INBOX AI INDICATOR - Indicador Visual de IA en Notificaciones
 * ============================================================================
 * Componente visual elegante que muestra el estado de la IA trabajando
 * en el sistema de notificaciones. Powered by Ollama + Llama 3.1
 *
 * @version 1.0
 * @date 2025-12-02
 * ============================================================================
 */

const InboxAIIndicator = {
    isInitialized: false,
    aiStatus: null,
    pendingSuggestions: 0,
    lastAnalysisTime: null,
    isAnalyzing: false,
    animationInterval: null,
    statusCheckInterval: null,

    // Configuración de estados visuales
    STATUS_CONFIG: {
        online: {
            color: '#00ff88',
            glow: '0 0 20px rgba(0, 255, 136, 0.6)',
            text: 'IA Activa',
            icon: '🧠'
        },
        analyzing: {
            color: '#00d4ff',
            glow: '0 0 25px rgba(0, 212, 255, 0.8)',
            text: 'Analizando...',
            icon: '⚡'
        },
        offline: {
            color: '#ff4757',
            glow: '0 0 15px rgba(255, 71, 87, 0.5)',
            text: 'IA Desconectada',
            icon: '💤'
        },
        learning: {
            color: '#ffd700',
            glow: '0 0 20px rgba(255, 215, 0, 0.6)',
            text: 'Aprendiendo',
            icon: '📚'
        }
    },

    async init() {
        if (this.isInitialized) return;
        console.log('🤖 [AI-INDICATOR] Inicializando indicador visual de IA...');

        await this.injectStyles();
        await this.checkAIStatus();
        this.startStatusMonitoring();
        this.isInitialized = true;
    },

    async injectStyles() {
        if (document.getElementById('ai-indicator-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'ai-indicator-styles';
        styles.textContent = `
            /* ============================================
               AI INDICATOR - FUTURISTIC DESIGN
               ============================================ */

            @keyframes ai-pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.85; }
            }

            @keyframes ai-glow {
                0%, 100% { filter: brightness(1) drop-shadow(0 0 8px currentColor); }
                50% { filter: brightness(1.2) drop-shadow(0 0 15px currentColor); }
            }

            @keyframes ai-rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @keyframes ai-wave {
                0% { transform: translateY(0); }
                25% { transform: translateY(-2px); }
                50% { transform: translateY(0); }
                75% { transform: translateY(2px); }
                100% { transform: translateY(0); }
            }

            @keyframes ai-typing {
                0%, 60%, 100% { opacity: 0; }
                30% { opacity: 1; }
            }

            @keyframes neural-flow {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }

            @keyframes particle-float {
                0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
                25% { transform: translate(10px, -10px) scale(1.2); opacity: 1; }
                50% { transform: translate(20px, 0) scale(1); opacity: 0.6; }
                75% { transform: translate(10px, 10px) scale(0.8); opacity: 0.8; }
            }

            /* Container Principal */
            .ai-indicator-container {
                position: relative;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 16px;
                background: linear-gradient(135deg,
                    rgba(15, 23, 42, 0.95) 0%,
                    rgba(30, 41, 59, 0.95) 50%,
                    rgba(15, 23, 42, 0.95) 100%);
                border: 1px solid rgba(100, 116, 139, 0.3);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
            }

            .ai-indicator-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 200%;
                height: 100%;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(0, 212, 255, 0.1),
                    transparent);
                animation: neural-flow 3s ease-in-out infinite;
            }

            .ai-indicator-container:hover {
                border-color: rgba(0, 212, 255, 0.5);
                box-shadow: 0 4px 20px rgba(0, 212, 255, 0.2);
                transform: translateY(-1px);
            }

            /* Orbe de IA */
            .ai-orb {
                position: relative;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .ai-orb-core {
                position: relative;
                width: 28px;
                height: 28px;
                background: radial-gradient(circle at 30% 30%,
                    rgba(0, 212, 255, 0.8) 0%,
                    rgba(0, 150, 255, 0.6) 40%,
                    rgba(0, 100, 200, 0.4) 70%,
                    transparent 100%);
                border-radius: 50%;
                animation: ai-pulse 2s ease-in-out infinite;
                z-index: 2;
            }

            .ai-orb-core.analyzing {
                animation: ai-pulse 0.8s ease-in-out infinite;
            }

            .ai-orb-ring {
                position: absolute;
                width: 36px;
                height: 36px;
                border: 2px solid transparent;
                border-top-color: rgba(0, 212, 255, 0.6);
                border-right-color: rgba(0, 212, 255, 0.3);
                border-radius: 50%;
                animation: ai-rotate 3s linear infinite;
            }

            .ai-orb-ring.analyzing {
                animation: ai-rotate 1s linear infinite;
                border-top-color: rgba(0, 255, 136, 0.8);
            }

            .ai-orb-particles {
                position: absolute;
                width: 100%;
                height: 100%;
            }

            .ai-particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: rgba(0, 212, 255, 0.8);
                border-radius: 50%;
                animation: particle-float 4s ease-in-out infinite;
            }

            .ai-particle:nth-child(1) { top: 0; left: 50%; animation-delay: 0s; }
            .ai-particle:nth-child(2) { top: 50%; right: 0; animation-delay: 1s; }
            .ai-particle:nth-child(3) { bottom: 0; left: 50%; animation-delay: 2s; }
            .ai-particle:nth-child(4) { top: 50%; left: 0; animation-delay: 3s; }

            /* Info de IA */
            .ai-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 120px;
            }

            .ai-status-text {
                font-size: 12px;
                font-weight: 600;
                color: #00d4ff;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .ai-status-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: currentColor;
                animation: ai-glow 2s ease-in-out infinite;
            }

            .ai-model-text {
                font-size: 10px;
                color: rgba(148, 163, 184, 0.8);
                font-family: 'Monaco', 'Menlo', monospace;
            }

            /* Badge de Sugerencias */
            .ai-suggestions-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                min-width: 18px;
                height: 18px;
                background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
                border-radius: 9px;
                font-size: 10px;
                font-weight: 700;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                box-shadow: 0 2px 8px rgba(255, 107, 107, 0.5);
                animation: ai-pulse 2s ease-in-out infinite;
                z-index: 10;
            }

            .ai-suggestions-badge.hidden {
                display: none;
            }

            /* Tech Stack Pills */
            .ai-tech-stack {
                display: flex;
                gap: 4px;
                margin-top: 4px;
            }

            .ai-tech-pill {
                font-size: 8px;
                padding: 2px 6px;
                background: rgba(100, 116, 139, 0.3);
                border-radius: 4px;
                color: rgba(148, 163, 184, 0.9);
                font-family: 'Monaco', 'Menlo', monospace;
            }

            .ai-tech-pill.ollama {
                background: rgba(0, 212, 255, 0.2);
                color: #00d4ff;
            }

            .ai-tech-pill.llama {
                background: rgba(168, 85, 247, 0.2);
                color: #a855f7;
            }

            /* Popup de Detalles */
            .ai-details-popup {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                width: 320px;
                background: linear-gradient(135deg,
                    rgba(15, 23, 42, 0.98) 0%,
                    rgba(30, 41, 59, 0.98) 100%);
                border: 1px solid rgba(100, 116, 139, 0.3);
                border-radius: 16px;
                padding: 0;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1000;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                overflow: hidden;
            }

            .ai-indicator-container:hover .ai-details-popup,
            .ai-details-popup.active {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .ai-popup-header {
                padding: 16px;
                background: linear-gradient(135deg,
                    rgba(0, 212, 255, 0.1) 0%,
                    rgba(168, 85, 247, 0.1) 100%);
                border-bottom: 1px solid rgba(100, 116, 139, 0.2);
            }

            .ai-popup-title {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }

            .ai-popup-title h4 {
                margin: 0;
                font-size: 14px;
                color: #f1f5f9;
                font-weight: 600;
            }

            .ai-popup-title .ai-badge {
                font-size: 9px;
                padding: 3px 8px;
                background: linear-gradient(135deg, #00d4ff, #00ff88);
                border-radius: 4px;
                color: #0f172a;
                font-weight: 700;
                text-transform: uppercase;
            }

            .ai-popup-subtitle {
                font-size: 11px;
                color: rgba(148, 163, 184, 0.8);
                margin: 0;
            }

            .ai-popup-body {
                padding: 16px;
            }

            /* Stats Grid */
            .ai-stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 16px;
            }

            .ai-stat-card {
                background: rgba(30, 41, 59, 0.5);
                border-radius: 10px;
                padding: 12px;
                text-align: center;
                border: 1px solid rgba(100, 116, 139, 0.2);
                transition: all 0.2s;
            }

            .ai-stat-card:hover {
                border-color: rgba(0, 212, 255, 0.3);
                background: rgba(0, 212, 255, 0.05);
            }

            .ai-stat-value {
                font-size: 20px;
                font-weight: 700;
                color: #00d4ff;
                margin-bottom: 4px;
            }

            .ai-stat-label {
                font-size: 10px;
                color: rgba(148, 163, 184, 0.8);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* Features List */
            .ai-features {
                margin-top: 12px;
            }

            .ai-feature {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(100, 116, 139, 0.1);
            }

            .ai-feature:last-child {
                border-bottom: none;
            }

            .ai-feature-icon {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 212, 255, 0.1);
                border-radius: 6px;
                font-size: 12px;
            }

            .ai-feature-text {
                flex: 1;
                font-size: 11px;
                color: rgba(226, 232, 240, 0.9);
            }

            .ai-feature-status {
                font-size: 10px;
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: 600;
            }

            .ai-feature-status.active {
                background: rgba(0, 255, 136, 0.2);
                color: #00ff88;
            }

            .ai-feature-status.learning {
                background: rgba(255, 215, 0, 0.2);
                color: #ffd700;
            }

            /* Powered By Footer */
            .ai-popup-footer {
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.3);
                border-top: 1px solid rgba(100, 116, 139, 0.2);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .ai-powered-by {
                font-size: 9px;
                color: rgba(148, 163, 184, 0.6);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .ai-tech-logos {
                display: flex;
                gap: 8px;
            }

            .ai-tech-logo {
                font-size: 10px;
                padding: 4px 8px;
                background: rgba(100, 116, 139, 0.2);
                border-radius: 4px;
                color: rgba(226, 232, 240, 0.8);
                font-family: 'Monaco', 'Menlo', monospace;
            }

            /* Typing Animation */
            .ai-typing-indicator {
                display: flex;
                gap: 4px;
                padding: 4px 0;
            }

            .ai-typing-dot {
                width: 4px;
                height: 4px;
                background: #00d4ff;
                border-radius: 50%;
                animation: ai-typing 1.4s ease-in-out infinite;
            }

            .ai-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .ai-typing-dot:nth-child(3) { animation-delay: 0.4s; }

            /* Dark Theme Adaptation */
            @media (prefers-color-scheme: light) {
                .ai-indicator-container {
                    background: linear-gradient(135deg,
                        rgba(241, 245, 249, 0.95) 0%,
                        rgba(226, 232, 240, 0.95) 100%);
                    border-color: rgba(148, 163, 184, 0.3);
                }

                .ai-details-popup {
                    background: linear-gradient(135deg,
                        rgba(255, 255, 255, 0.98) 0%,
                        rgba(241, 245, 249, 0.98) 100%);
                }
            }

            /* Responsive */
            @media (max-width: 768px) {
                .ai-indicator-container {
                    padding: 6px 12px;
                }

                .ai-info {
                    display: none;
                }

                .ai-details-popup {
                    width: 280px;
                    right: -50px;
                }
            }
        `;
        document.head.appendChild(styles);
    },

    async checkAIStatus() {
        try {
            const token = localStorage.getItem('token');
            const [statusResponse, suggestionsResponse] = await Promise.all([
                fetch('/api/inbox/ai/status', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/inbox/ai/suggestions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (statusResponse.ok) {
                const data = await statusResponse.json();
                this.aiStatus = data.status;
            }

            if (suggestionsResponse.ok) {
                const data = await suggestionsResponse.json();
                this.pendingSuggestions = data.count || 0;
            }

            this.updateIndicator();
        } catch (error) {
            console.error('🤖 [AI-INDICATOR] Error verificando estado:', error);
            this.aiStatus = { isRunning: false, ollamaAvailable: false };
            this.updateIndicator();
        }
    },

    startStatusMonitoring() {
        // Verificar estado cada 30 segundos
        this.statusCheckInterval = setInterval(() => {
            this.checkAIStatus();
        }, 30000);
    },

    stopStatusMonitoring() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
    },

    getStatusState() {
        if (!this.aiStatus || !this.aiStatus.isRunning) {
            return 'offline';
        }
        if (this.isAnalyzing) {
            return 'analyzing';
        }
        return 'online';
    },

    render() {
        const state = this.getStatusState();
        const config = this.STATUS_CONFIG[state];
        const isOnline = this.aiStatus?.isRunning && this.aiStatus?.ollamaAvailable;

        return `
            <div class="ai-indicator-container" id="aiIndicator" onclick="InboxAIIndicator.toggleDetails()">
                <!-- Badge de sugerencias pendientes -->
                <div class="ai-suggestions-badge ${this.pendingSuggestions === 0 ? 'hidden' : ''}" id="aiSuggestionsBadge">
                    ${this.pendingSuggestions}
                </div>

                <!-- Orbe de IA animado -->
                <div class="ai-orb">
                    <div class="ai-orb-ring ${state === 'analyzing' ? 'analyzing' : ''}"></div>
                    <div class="ai-orb-core ${state === 'analyzing' ? 'analyzing' : ''}"
                         style="background: radial-gradient(circle at 30% 30%, ${config.color}cc 0%, ${config.color}99 40%, ${config.color}66 70%, transparent 100%);">
                    </div>
                    <div class="ai-orb-particles">
                        <div class="ai-particle" style="background: ${config.color};"></div>
                        <div class="ai-particle" style="background: ${config.color};"></div>
                        <div class="ai-particle" style="background: ${config.color};"></div>
                        <div class="ai-particle" style="background: ${config.color};"></div>
                    </div>
                </div>

                <!-- Info de estado -->
                <div class="ai-info">
                    <div class="ai-status-text" style="color: ${config.color}">
                        <span class="ai-status-dot"></span>
                        ${config.text}
                    </div>
                    <div class="ai-model-text">
                        ${isOnline ? this.aiStatus?.config?.model || 'llama3.1:8b' : 'Desconectado'}
                    </div>
                    <div class="ai-tech-stack">
                        <span class="ai-tech-pill ollama">Ollama</span>
                        <span class="ai-tech-pill llama">Llama 3.1</span>
                    </div>
                </div>

                <!-- Popup de detalles -->
                <div class="ai-details-popup" id="aiDetailsPopup">
                    <div class="ai-popup-header">
                        <div class="ai-popup-title">
                            <h4>🧠 Asistente de Notificaciones IA</h4>
                            <span class="ai-badge">BETA</span>
                        </div>
                        <p class="ai-popup-subtitle">
                            Sistema inteligente que analiza y aprende de tus conversaciones
                        </p>
                    </div>

                    <div class="ai-popup-body">
                        <div class="ai-stats-grid">
                            <div class="ai-stat-card">
                                <div class="ai-stat-value" id="aiSuggestionsCount">${this.pendingSuggestions}</div>
                                <div class="ai-stat-label">Sugerencias</div>
                            </div>
                            <div class="ai-stat-card">
                                <div class="ai-stat-value" style="color: #00ff88;">
                                    ${isOnline ? '99.9%' : '0%'}
                                </div>
                                <div class="ai-stat-label">Uptime</div>
                            </div>
                            <div class="ai-stat-card">
                                <div class="ai-stat-value" style="color: #a855f7;">60%</div>
                                <div class="ai-stat-label">Min. Confianza</div>
                            </div>
                            <div class="ai-stat-card">
                                <div class="ai-stat-value" style="color: #ffd700;">5m</div>
                                <div class="ai-stat-label">Ciclo Análisis</div>
                            </div>
                        </div>

                        <div class="ai-features">
                            <div class="ai-feature">
                                <div class="ai-feature-icon">🔍</div>
                                <div class="ai-feature-text">Detección de preguntas similares</div>
                                <span class="ai-feature-status active">Activo</span>
                            </div>
                            <div class="ai-feature">
                                <div class="ai-feature-icon">💡</div>
                                <div class="ai-feature-text">Sugerencias automáticas de respuesta</div>
                                <span class="ai-feature-status active">Activo</span>
                            </div>
                            <div class="ai-feature">
                                <div class="ai-feature-icon">📚</div>
                                <div class="ai-feature-text">Aprendizaje de conversaciones</div>
                                <span class="ai-feature-status learning">Aprendiendo</span>
                            </div>
                            <div class="ai-feature">
                                <div class="ai-feature-icon">⚡</div>
                                <div class="ai-feature-text">Auto-respuestas (>85% confianza)</div>
                                <span class="ai-feature-status active">Activo</span>
                            </div>
                        </div>
                    </div>

                    <div class="ai-popup-footer">
                        <span class="ai-powered-by">Powered by</span>
                        <div class="ai-tech-logos">
                            <span class="ai-tech-logo">🦙 Ollama</span>
                            <span class="ai-tech-logo">🧠 Llama 3.1</span>
                            <span class="ai-tech-logo">🐘 PostgreSQL</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    updateIndicator() {
        const container = document.getElementById('aiIndicator');
        if (container) {
            container.outerHTML = this.render();
        }
    },

    toggleDetails() {
        const popup = document.getElementById('aiDetailsPopup');
        if (popup) {
            popup.classList.toggle('active');
        }
    },

    // Método para simular análisis (efecto visual)
    simulateAnalysis() {
        this.isAnalyzing = true;
        this.updateIndicator();

        setTimeout(() => {
            this.isAnalyzing = false;
            this.updateIndicator();
        }, 3000);
    },

    // Llamar cuando se recibe una nueva sugerencia
    notifyNewSuggestion() {
        this.pendingSuggestions++;
        this.updateIndicator();

        // Efecto de notificación
        const badge = document.getElementById('aiSuggestionsBadge');
        if (badge) {
            badge.style.animation = 'none';
            badge.offsetHeight; // Trigger reflow
            badge.style.animation = 'ai-pulse 0.5s ease-in-out 3';
        }
    },

    destroy() {
        this.stopStatusMonitoring();
        const indicator = document.getElementById('aiIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
};

// Auto-inicializar cuando se carga el módulo inbox
document.addEventListener('DOMContentLoaded', () => {
    // Se inicializa desde el módulo inbox
});

// Exportar para uso externo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InboxAIIndicator;
}
