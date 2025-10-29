/**
 * ai-assistant-chat.js
 *
 * Chat Flotante de Asistente IA con Ollama + Llama 3.1
 *
 * Características:
 * - Floating chat widget (bottom-right)
 * - Tech stack badges visibles (Ollama, Llama 3.1, Node.js, PostgreSQL)
 * - RAG (Retrieval Augmented Generation)
 * - Feedback system (👍👎)
 * - Historial de conversaciones
 * - Integración con /api/assistant/*
 * - Auto-diagnostic trigger
 * - Context-aware (módulo actual)
 *
 * @technology Ollama + Llama 3.1 (8B) + Vanilla JS + JWT
 * @version 1.0.0
 * @created 2025-01-19
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════

  const CONFIG = {
    apiBaseURL: window.progressiveAdmin?.getApiUrl?.() || '',
    endpoints: {
      chat: '/api/assistant/chat',
      feedback: '/api/assistant/feedback',
      history: '/api/assistant/history',
      health: '/api/assistant/health'
    },
    animation: {
      fadeInDuration: 300,
      typingDelay: 50
    },
    maxHistoryMessages: 20
  };

  // ═══════════════════════════════════════════════════════════
  // ESTADO GLOBAL
  // ═══════════════════════════════════════════════════════════

  let STATE = {
    isOpen: false,
    isLoading: false,
    currentModule: null,
    currentScreen: null,
    conversationHistory: [],
    ollamaStatus: 'unknown' // 'available', 'unavailable', 'unknown'
  };

  // ═══════════════════════════════════════════════════════════
  // ESTILOS CSS
  // ═══════════════════════════════════════════════════════════

  const STYLES = `
    /* ========== CHAT FLOTANTE ASISTENTE IA ========== */

    #ai-assistant-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    /* BOTÓN FLOTANTE */
    #ai-assistant-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    #ai-assistant-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
    }

    #ai-assistant-button:active {
      transform: scale(0.95);
    }

    #ai-assistant-button .pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      animation: pulse 2s ease-out infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    /* VENTANA DE CHAT */
    #ai-assistant-window {
      display: none;
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 420px;
      max-width: calc(100vw - 40px);
      height: 320px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s ease-out;
    }

    #ai-assistant-window.open {
      display: flex;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* HEADER */
    #ai-assistant-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      cursor: move;
      user-select: none;
    }

    #ai-assistant-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    #ai-assistant-header-icon {
      font-size: 28px;
    }

    #ai-assistant-header-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    #ai-assistant-header-subtitle {
      font-size: 11px;
      opacity: 0.9;
      margin: 0;
      font-weight: 400;
    }

    #ai-assistant-close-button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: background 0.2s;
    }

    #ai-assistant-close-button:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* TECH STACK BADGES */
    #ai-assistant-tech-stack {
      background: #f8f9fa;
      padding: 10px 16px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .ai-tech-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      color: #495057;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .ai-tech-badge-icon {
      font-size: 12px;
    }

    .ai-tech-badge.ollama { border-color: #667eea; color: #667eea; }
    .ai-tech-badge.nodejs { border-color: #68a063; color: #68a063; }
    .ai-tech-badge.postgresql { border-color: #336791; color: #336791; }
    .ai-tech-badge.rag { border-color: #764ba2; color: #764ba2; }

    /* Estado de IA detallado */
    .ai-status-indicator {
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ai-status-local, .ai-status-render {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      text-align: center;
    }

    .ai-status-divider {
      width: 1px;
      height: 30px;
      background: #e0e0e0;
      margin: 0 10px;
    }

    .ai-status-icon {
      font-size: 16px;
      margin-bottom: 2px;
    }

    .ai-status-label {
      font-weight: bold;
      color: #333;
      margin-bottom: 2px;
    }

    .ai-status-value {
      color: #666;
      font-size: 10px;
    }

    .ai-models-available {
      background: rgba(240, 248, 255, 0.9);
      border: 1px solid #b3d9ff;
      border-radius: 8px;
      padding: 6px 8px;
      margin: 4px 0;
      font-size: 10px;
      color: #0066cc;
      text-align: center;
    }

    /* MENSAJES */
    #ai-assistant-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f8f9fa;
    }

    #ai-assistant-messages::-webkit-scrollbar {
      width: 6px;
    }

    #ai-assistant-messages::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 3px;
    }

    .ai-message {
      margin-bottom: 16px;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ai-message-user {
      display: flex;
      justify-content: flex-end;
    }

    .ai-message-assistant {
      display: flex;
      justify-content: flex-start;
    }

    .ai-message-bubble {
      max-width: 75%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .ai-message-user .ai-message-bubble {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .ai-message-assistant .ai-message-bubble {
      background: white;
      color: #2d3748;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .ai-message-meta {
      font-size: 11px;
      color: #718096;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ai-message-source {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }

    .ai-message-confidence {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    /* FEEDBACK BUTTONS */
    .ai-message-feedback {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .ai-feedback-btn {
      background: white;
      border: 1px solid #e2e8f0;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ai-feedback-btn:hover {
      background: #f7fafc;
      border-color: #cbd5e0;
    }

    .ai-feedback-btn.helpful {
      background: #48bb78;
      color: white;
      border-color: #48bb78;
    }

    .ai-feedback-btn.not-helpful {
      background: #f56565;
      color: white;
      border-color: #f56565;
    }

    /* LOADING */
    .ai-typing-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-width: 75px;
    }

    .ai-typing-dot {
      width: 8px;
      height: 8px;
      background: #cbd5e0;
      border-radius: 50%;
      animation: typingDot 1.4s infinite;
    }

    .ai-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .ai-typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingDot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-10px); opacity: 1; }
    }

    /* INPUT */
    #ai-assistant-input-area {
      padding: 16px;
      background: white;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    #ai-assistant-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      max-height: 100px;
      min-height: 44px;
    }

    #ai-assistant-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    #ai-assistant-send-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 18px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      height: 44px;
    }

    #ai-assistant-send-button:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    #ai-assistant-send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* STATUS INDICATOR */
    .ai-status-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }

    .ai-status-available { background: #48bb78; }
    .ai-status-unavailable { background: #f56565; }
    .ai-status-unknown { background: #ecc94b; }

    /* RESPONSIVE */
    @media (max-width: 480px) {
      #ai-assistant-window {
        width: calc(100vw - 40px);
        height: calc(100vh - 120px);
        bottom: 80px;
        right: 20px;
      }
    }
  `;

  // ═══════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════

  function init() {
    // Prevenir inicializaciones múltiples
    if (document.getElementById('ai-assistant-widget')) {
      console.log('⚠️  AI Assistant Chat ya fue inicializado - skipping');
      return;
    }

    console.log('🤖 Inicializando AI Assistant Chat...');

    // Inyectar estilos
    injectStyles();

    // Crear HTML
    createChatWidget();

    // Event listeners
    attachEventListeners();

    // Check Ollama health
    checkOllamaHealth();

    // Verificar estado IA (local y render)
    updateAIStatus();

    // Detectar módulo actual
    detectCurrentContext();

    console.log('✅ AI Assistant Chat inicializado');
  }

  function injectStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = STYLES;
    document.head.appendChild(styleElement);
  }

  function createChatWidget() {
    const widgetHTML = `
      <div id="ai-assistant-widget">
        <!-- BOTÓN FLOTANTE -->
        <button id="ai-assistant-button" aria-label="Abrir asistente IA">
          <div class="pulse"></div>
          🤖
        </button>

        <!-- VENTANA DE CHAT -->
        <div id="ai-assistant-window">
          <!-- HEADER -->
          <div id="ai-assistant-header">
            <div id="ai-assistant-header-left">
              <div id="ai-assistant-header-icon">🤖</div>
              <div>
                <h3 id="ai-assistant-header-title">Asistente IA</h3>
                <p id="ai-assistant-header-subtitle">
                  <span class="ai-status-indicator ai-status-unknown"></span>
                  Ollama + Llama 3.1 (8B)
                </p>
              </div>
            </div>
            <button id="ai-assistant-close-button" aria-label="Cerrar">×</button>
          </div>

          <!-- TECH STACK BADGES -->
          <div id="ai-assistant-tech-stack">
            <span class="ai-tech-badge ollama">
              <span class="ai-tech-badge-icon">🧠</span>
              Ollama + Llama 3.1
            </span>
            <span class="ai-tech-badge nodejs">
              <span class="ai-tech-badge-icon">⚡</span>
              Node.js
            </span>
            <span class="ai-tech-badge postgresql">
              <span class="ai-tech-badge-icon">🐘</span>
              PostgreSQL
            </span>
            <span class="ai-tech-badge rag">
              <span class="ai-tech-badge-icon">📚</span>
              RAG
            </span>
          </div>

          <!-- INDICADOR DE ESTADO IA -->
          <div class="ai-status-indicator">
            <div class="ai-status-local">
              <div class="ai-status-icon" id="ai-local-icon">🔴</div>
              <div class="ai-status-label">Localhost</div>
              <div class="ai-status-value" id="ai-local-status">Verificando...</div>
            </div>
            <div class="ai-status-divider"></div>
            <div class="ai-status-render">
              <div class="ai-status-icon" id="ai-render-icon">🟡</div>
              <div class="ai-status-label">Render</div>
              <div class="ai-status-value" id="ai-render-status">Fallback</div>
            </div>
          </div>

          <!-- MODELOS DISPONIBLES -->
          <div class="ai-models-available" id="ai-models-info">
            📚 Compatible: OpenAI GPT-4, Claude 3.5, Ollama (Local)
          </div>

          <!-- MENSAJES -->
          <div id="ai-assistant-messages">
            <!-- Mensaje de bienvenida -->
          </div>

          <!-- INPUT -->
          <div id="ai-assistant-input-area">
            <textarea
              id="ai-assistant-input"
              placeholder="Pregunta algo sobre el sistema..."
              rows="1"
            ></textarea>
            <button id="ai-assistant-send-button" aria-label="Enviar">
              ➤
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);

    // Mensaje de bienvenida
    addWelcomeMessage();
  }

  function addWelcomeMessage() {
    const messagesContainer = document.getElementById('ai-assistant-messages');

    const welcomeHTML = `
      <div class="ai-message ai-message-assistant">
        <div class="ai-message-bubble">
          <strong>¡Hola! 👋</strong><br><br>
          Soy tu asistente de IA inteligente. Estoy aquí para ayudarte con cualquier duda sobre el sistema de asistencia biométrico.<br><br>
          💡 <strong>Puedes preguntarme:</strong><br>
          • Cómo usar cualquier módulo<br>
          • Solucionar problemas<br>
          • Entender funcionalidades<br>
          • Obtener ayuda contextual<br><br>
          <small>🧠 Potenciado por Ollama + Llama 3.1 (IA Local)</small>
        </div>
      </div>
    `;

    messagesContainer.innerHTML = welcomeHTML;
  }

  // ═══════════════════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════

  function attachEventListeners() {
    // Toggle chat
    document.getElementById('ai-assistant-button').addEventListener('click', toggleChat);
    document.getElementById('ai-assistant-close-button').addEventListener('click', closeChat);

    // Send message
    document.getElementById('ai-assistant-send-button').addEventListener('click', sendMessage);

    // Enter to send (Ctrl+Enter for new line)
    const input = document.getElementById('ai-assistant-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Make chat draggable
    makeDraggable();

    // Global keyboard shortcut: Ctrl+K para abrir chat
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        if (!STATE.isOpen) {
          toggleChat();
        }
        document.getElementById('ai-assistant-input').focus();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // DRAGGABLE FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════

  function makeDraggable() {
    const chatWindow = document.getElementById('ai-assistant-window');
    const header = document.getElementById('ai-assistant-header');

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      // Don't drag if clicking on close button
      if (e.target.id === 'ai-assistant-close-button' || e.target.closest('#ai-assistant-close-button')) {
        return;
      }

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || header.contains(e.target)) {
        isDragging = true;
        chatWindow.style.transition = 'none';
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, chatWindow);
      }
    }

    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      chatWindow.style.transition = '';
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
  }

  function toggleChat() {
    const window = document.getElementById('ai-assistant-window');
    STATE.isOpen = !STATE.isOpen;

    if (STATE.isOpen) {
      window.classList.add('open');
      document.getElementById('ai-assistant-input').focus();
    } else {
      window.classList.remove('open');
    }
  }

  function closeChat() {
    STATE.isOpen = false;
    document.getElementById('ai-assistant-window').classList.remove('open');
  }

  // ═══════════════════════════════════════════════════════════
  // CHAT FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  async function sendMessage() {
    const input = document.getElementById('ai-assistant-input');
    const question = input.value.trim();

    if (!question || STATE.isLoading) return;

    // Agregar mensaje del usuario
    addUserMessage(question);

    // Limpiar input
    input.value = '';
    input.style.height = 'auto';

    // Mostrar typing indicator
    showTypingIndicator();

    STATE.isLoading = true;
    document.getElementById('ai-assistant-send-button').disabled = true;

    try {
      // Enviar a API
      const response = await fetch(CONFIG.apiBaseURL + CONFIG.endpoints.chat, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || ''),
          'X-User-Id': localStorage.getItem('userId') || '',
          'X-Company-Id': localStorage.getItem('companyId') || '',
          'X-User-Role': localStorage.getItem('userRole') || 'employee'
        },
        body: JSON.stringify({
          question,
          context: {
            module: STATE.currentModule,
            screen: STATE.currentScreen,
            timestamp: new Date().toISOString()
          }
        })
      });

      hideTypingIndicator();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Agregar respuesta del asistente
        addAssistantMessage(data.data);
      } else {
        addErrorMessage('No se pudo obtener respuesta del asistente.');
      }

    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      hideTypingIndicator();
      addErrorMessage('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      STATE.isLoading = false;
      document.getElementById('ai-assistant-send-button').disabled = false;
    }
  }

  function addUserMessage(text) {
    const messagesContainer = document.getElementById('ai-assistant-messages');

    const messageHTML = `
      <div class="ai-message ai-message-user">
        <div class="ai-message-bubble">
          ${escapeHtml(text)}
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    scrollToBottom();
  }

  function addAssistantMessage(data) {
    const messagesContainer = document.getElementById('ai-assistant-messages');

    const sourceIcons = {
      ollama: '🧠',
      cache: '📚',
      diagnostic: '🔍',
      fallback: '⚠️'
    };

    const sourceIcon = sourceIcons[data.source] || '🤖';
    const confidencePercent = Math.round((data.confidence || 0) * 100);

    let feedbackHTML = '';
    if (data.id) {
      feedbackHTML = `
        <div class="ai-message-feedback">
          <button class="ai-feedback-btn" data-entry-id="${data.id}" data-helpful="true">
            👍 Útil
          </button>
          <button class="ai-feedback-btn" data-entry-id="${data.id}" data-helpful="false">
            👎 No útil
          </button>
        </div>
      `;
    }

    const messageHTML = `
      <div class="ai-message ai-message-assistant">
        <div>
          <div class="ai-message-bubble">
            ${formatMarkdown(data.answer)}
          </div>
          <div class="ai-message-meta">
            <span class="ai-message-source">
              ${sourceIcon} ${data.source}
            </span>
            <span class="ai-message-confidence">
              📊 ${confidencePercent}%
            </span>
            ${data.diagnosticTriggered ? '<span>🔍 Diagnóstico ejecutado</span>' : ''}
          </div>
          ${feedbackHTML}
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);

    // Attach feedback listeners
    if (data.id) {
      attachFeedbackListeners(data.id);
    }

    scrollToBottom();
  }

  function attachFeedbackListeners(entryId) {
    const buttons = document.querySelectorAll(`[data-entry-id="${entryId}"]`);

    buttons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const helpful = btn.dataset.helpful === 'true';
        await submitFeedback(entryId, helpful);

        // Marcar como seleccionado
        buttons.forEach(b => b.classList.remove('helpful', 'not-helpful'));
        btn.classList.add(helpful ? 'helpful' : 'not-helpful');
        btn.disabled = true;
      });
    });
  }

  async function submitFeedback(entryId, helpful) {
    try {
      await fetch(CONFIG.apiBaseURL + CONFIG.endpoints.feedback, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (localStorage.getItem('authToken') || '')
        },
        body: JSON.stringify({
          entryId,
          helpful
        })
      });

      console.log(`✅ Feedback enviado: ${helpful ? '👍' : '👎'}`);
    } catch (error) {
      console.error('❌ Error enviando feedback:', error);
    }
  }

  function addErrorMessage(text) {
    const messagesContainer = document.getElementById('ai-assistant-messages');

    const messageHTML = `
      <div class="ai-message ai-message-assistant">
        <div class="ai-message-bubble" style="background: #fee; border: 1px solid #fcc;">
          ⚠️ ${escapeHtml(text)}
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const messagesContainer = document.getElementById('ai-assistant-messages');

    const indicatorHTML = `
      <div class="ai-message ai-message-assistant" id="ai-typing-indicator">
        <div class="ai-typing-indicator">
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
          <div class="ai-typing-dot"></div>
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', indicatorHTML);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    const indicator = document.getElementById('ai-typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  function scrollToBottom() {
    const messagesContainer = document.getElementById('ai-assistant-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // ═══════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMarkdown(text) {
    // Simple markdown to HTML (básico)
    let html = escapeHtml(text);

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '• $1');

    return html;
  }

  async function checkOllamaHealth() {
    try {
      const response = await fetch(CONFIG.apiBaseURL + CONFIG.endpoints.health);
      const data = await response.json();

      STATE.ollamaStatus = data.ollama?.available ? 'available' : 'unavailable';

      // Actualizar indicador en UI
      const indicator = document.querySelector('.ai-status-indicator');
      if (indicator) {
        indicator.classList.remove('ai-status-unknown', 'ai-status-available', 'ai-status-unavailable');
        indicator.classList.add(`ai-status-${STATE.ollamaStatus}`);
      }

      console.log(`🏥 Ollama status: ${STATE.ollamaStatus}`);
    } catch (error) {
      console.warn('⚠️ No se pudo verificar estado de Ollama:', error);
      STATE.ollamaStatus = 'unknown';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // VERIFICACIÓN DE ESTADO IA DETALLADO
  // ═══════════════════════════════════════════════════════════

  async function updateAIStatus() {
    try {
      // Verificar estado localhost vs render
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      // Verificar estado de Ollama
      const healthResponse = await fetch(CONFIG.apiBaseURL + CONFIG.endpoints.health);
      const healthData = await healthResponse.json();

      const localIcon = document.getElementById('ai-local-icon');
      const localStatus = document.getElementById('ai-local-status');
      const renderIcon = document.getElementById('ai-render-icon');
      const renderStatus = document.getElementById('ai-render-status');
      const modelsInfo = document.getElementById('ai-models-info');

      if (isLocalhost) {
        // LOCALHOST
        if (healthData.ollama?.available) {
          localIcon.textContent = '🟢';
          localStatus.textContent = 'Ollama Activo';
        } else {
          localIcon.textContent = '🔴';
          localStatus.textContent = 'Ollama NO instalado';
        }

        // Render simulado
        renderIcon.textContent = '🟡';
        renderStatus.textContent = 'Fallback Ready';

        modelsInfo.innerHTML = '🏠 <strong>Localhost:</strong> Ollama + Llama 3.1 | ☁️ <strong>Render:</strong> Fallback + RAG';
      } else {
        // RENDER/PRODUCCIÓN
        localIcon.textContent = '🔴';
        localStatus.textContent = 'No disponible';

        renderIcon.textContent = '🟡';
        renderStatus.textContent = 'Fallback + RAG';

        modelsInfo.innerHTML = '💰 <strong>Upgrade disponible:</strong> OpenAI GPT-4 ($5-15/mes) | Claude 3.5 ($10-25/mes)';
      }

    } catch (error) {
      console.warn('⚠️ Error verificando estado IA:', error);

      // Estado de error
      document.getElementById('ai-local-icon').textContent = '❓';
      document.getElementById('ai-local-status').textContent = 'Error';
      document.getElementById('ai-render-icon').textContent = '❓';
      document.getElementById('ai-render-status').textContent = 'Error';
    }
  }

  function detectCurrentContext() {
    // Detectar módulo actual desde URL o estado global
    const urlParams = new URLSearchParams(window.location.search);
    STATE.currentModule = urlParams.get('module') || null;

    console.log('📍 Contexto detectado:', { module: STATE.currentModule });
  }

  // ═══════════════════════════════════════════════════════════
  // EXPORT GLOBAL
  // ═══════════════════════════════════════════════════════════

  window.AIAssistantChat = {
    init,
    open: () => { STATE.isOpen = false; toggleChat(); },
    close: closeChat,
    sendMessage: (text) => {
      document.getElementById('ai-assistant-input').value = text;
      sendMessage();
    },
    setContext: (module, screen) => {
      STATE.currentModule = module;
      STATE.currentScreen = screen;
      console.log('📍 Contexto actualizado:', { module, screen });
    }
  };

  // Auto-init cuando el DOM está listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
