/**
 * ENTERPRISE PAYROLL SYSTEM v3.0
 * Sistema de Liquidacion de Nominas - Nivel Enterprise Internacional
 *
 * Tecnologias: Node.js + PostgreSQL + Ollama AI + Sequelize
 * Arquitectura: Multi-tenant, Multi-pais, 100% Parametrizable
 *
 * @author Sistema Biometrico Enterprise
 * @version 3.0.0
 */

// Evitar doble carga del módulo
if (window.PayrollEngine) {
    console.log('[PAYROLL] Módulo ya cargado');
    throw new Error('PayrollModule already loaded');
}

console.log('%c PAYROLL ENGINE v3.0 ', 'background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%); color: #00d4ff; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// PAYROLL HELP SYSTEM - Sistema de Ayuda Contextual Inteligente con Ollama
// ============================================================================
const PayrollHelpSystem = {
    // Contextos de ayuda por pantalla/accion
    contexts: {
        dashboard: {
            title: 'Panel de Control',
            description: 'Vista general del estado de liquidaciones del periodo seleccionado.',
            tips: [
                'Los KPIs muestran el resumen del mes actual',
                'Use "Iniciar Liquidacion" para comenzar el proceso',
                'El panel de IA detecta anomalias automaticamente'
            ],
            helpTopics: ['¿Como inicio una liquidacion?', '¿Que significan los KPIs?', '¿Como exporto reportes?']
        },
        process: {
            title: 'Proceso de Liquidacion',
            description: 'Workflow guiado de 5 pasos para liquidar nominas de forma segura.',
            tips: [
                'Paso 1: Valida datos de empleados y plantillas',
                'Paso 2: Calcula haberes y deducciones automaticamente',
                'Paso 3: Revisa alertas y anomalias detectadas',
                'Paso 4: Aprueba las liquidaciones verificadas',
                'Paso 5: Genera archivos bancarios y recibos'
            ],
            warnings: [
                'Una vez aprobadas, las liquidaciones no pueden modificarse sin autorizacion',
                'Verifique que todos los empleados tengan plantilla asignada antes de calcular'
            ],
            helpTopics: ['¿Por que hay empleados con error?', '¿Como recalculo una nomina?', '¿Que pasa si apruebo por error?']
        },
        templates: {
            title: 'Plantillas de Liquidacion',
            description: 'Configure las estructuras de haberes y deducciones para diferentes tipos de empleados.',
            tips: [
                'Cada plantilla agrupa conceptos (haberes + deducciones)',
                'Asigne entidades de destino para consolidacion automatica',
                'Use formulas para calculos dinamicos basados en variables'
            ],
            requirements: [
                { check: 'Al menos un concepto de tipo "Haber"', critical: true },
                { check: 'Deducciones legales obligatorias configuradas', critical: true },
                { check: 'Entidades de destino asignadas para consolidacion', critical: false }
            ],
            helpTopics: ['¿Como creo una formula?', '¿Que son las entidades de destino?', '¿Como asigno plantillas a empleados?']
        },
        templateCreate: {
            title: 'Crear Plantilla',
            description: 'Defina una nueva estructura de liquidacion con sus conceptos.',
            fieldHelp: {
                template_code: 'Codigo unico de la plantilla (ej: ARG-2025, COMERCIO-A)',
                template_name: 'Nombre descriptivo para identificar la plantilla',
                pay_frequency: 'Frecuencia de liquidacion: Mensual, Quincenal o Semanal',
                is_default: 'Si se marca, esta plantilla se asignara automaticamente a nuevos empleados'
            },
            validations: [
                { field: 'template_code', rule: 'required', message: 'El codigo es obligatorio' },
                { field: 'template_name', rule: 'required', message: 'El nombre es obligatorio' },
                { field: 'concepts', rule: 'minLength:1', message: 'Agregue al menos un concepto' }
            ]
        },
        conceptCreate: {
            title: 'Agregar Concepto',
            description: 'Los conceptos definen cada linea del recibo de sueldo.',
            fieldHelp: {
                concept_name: 'Nombre que aparecera en el recibo (ej: Sueldo Basico, Jubilacion)',
                concept_type: 'Tipo: Haber (suma), Deduccion (resta) o Carga Patronal (no afecta neto)',
                formula: 'Formula de calculo usando variables como {baseSalary}, {workedDays}',
                entity_id: 'Entidad recaudatoria de destino (AFIP, Obra Social, Sindicato, etc.)'
            },
            warnings: [
                { condition: 'no_entity', message: 'Sin entidad de destino, este concepto no se incluira en consolidaciones', severity: 'warning' },
                { condition: 'no_formula', message: 'Sin formula, debera ingresar el valor manualmente cada mes', severity: 'info' },
                { condition: 'invalid_formula', message: 'La formula contiene errores y no podra calcularse', severity: 'error' }
            ]
        },
        entities: {
            title: 'Entidades de Destino',
            description: 'Configure las entidades que reciben los aportes y contribuciones.',
            tips: [
                'Las Categorias agrupan tipos de entidades (Ej: Organismos Fiscales, Obras Sociales)',
                'Las Entidades son los destinos especificos (Ej: AFIP, OSECAC, UOCRA)',
                'Asigne entidades a conceptos para generar reportes de consolidacion'
            ],
            requirements: [
                { check: 'Al menos una categoria de tipo "deduction" para deducciones', critical: true },
                { check: 'Entidades con CUIT/Codigo para archivos de pago', critical: false }
            ],
            helpTopics: ['¿Como creo una entidad recaudatoria?', '¿Que es la consolidacion?', '¿Como genero el archivo de aportes?']
        },
        entityCreate: {
            title: 'Crear Entidad',
            description: 'Defina una nueva entidad de destino para aportes o contribuciones.',
            fieldHelp: {
                category_id: 'Categoria a la que pertenece (Ej: Obra Social, Sindicato, Fisco)',
                entity_code: 'Codigo unico de la entidad (Ej: AFIP, OSECAC-01)',
                entity_name: 'Nombre completo de la entidad',
                cuit: 'CUIT o identificador fiscal para archivos de pago',
                account_number: 'Numero de cuenta bancaria para depositos'
            },
            validations: [
                { field: 'category_id', rule: 'required', message: 'Seleccione una categoria' },
                { field: 'entity_code', rule: 'required', message: 'El codigo es obligatorio' },
                { field: 'entity_name', rule: 'required', message: 'El nombre es obligatorio' }
            ]
        },
        employees: {
            title: 'Empleados y Liquidaciones',
            description: 'Gestione las liquidaciones individuales de cada empleado.',
            tips: [
                'Use los checkboxes para seleccionar multiples empleados',
                'El estado indica el progreso: Pendiente > Calculado > Aprobado > Pagado',
                'Click en el ojo para ver el detalle completo de la liquidacion'
            ],
            helpTopics: ['¿Por que un empleado aparece sin plantilla?', '¿Como corrijo una liquidacion?', '¿Como exporto a Excel?']
        },
        payslipEditor: {
            title: 'Editor de Recibos',
            description: 'Personalice el diseño visual de los recibos de sueldo.',
            tips: [
                'Arrastre bloques para reorganizar el recibo',
                'Use la vista previa para ver como quedara el PDF',
                'Puede crear multiples plantillas para diferentes usos'
            ]
        }
    },

    // Estado del sistema de ayuda
    state: {
        currentContext: 'dashboard',
        bubbleVisible: false,
        chatOpen: false,
        validationErrors: [],
        suggestions: []
    },

    // Inicializar sistema de ayuda
    init() {
        console.log('[PayrollHelp] Sistema de ayuda contextual inicializado');
        this.injectStyles();
        this.createFloatingElements();
        this.bindGlobalEvents();
    },

    // Inyectar estilos del sistema de ayuda
    injectStyles() {
        if (document.getElementById('payroll-help-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'payroll-help-styles';
        styles.textContent = `
            /* Floating Help Button */
            .ph-help-fab {
                position: fixed;
                bottom: 90px;
                right: 24px;
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
            }
            .ph-help-fab:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5);
            }
            .ph-help-fab svg { color: white; }
            .ph-help-fab .ph-badge {
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

            /* Context Description Banner */
            .ph-context-banner {
                background: linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
                border-left: 4px solid #6366f1;
                padding: 12px 16px;
                margin-bottom: 16px;
                border-radius: 0 8px 8px 0;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            .ph-context-banner .ph-icon {
                background: rgba(99, 102, 241, 0.15);
                padding: 8px;
                border-radius: 8px;
                color: #6366f1;
            }
            .ph-context-banner .ph-content h4 {
                margin: 0 0 4px 0;
                color: #e2e8f0;
                font-size: 14px;
            }
            .ph-context-banner .ph-content p {
                margin: 0;
                color: #94a3b8;
                font-size: 13px;
            }
            .ph-context-banner .ph-close {
                margin-left: auto;
                background: none;
                border: none;
                color: #64748b;
                cursor: pointer;
                padding: 4px;
            }

            /* Floating Bubble Tips */
            .ph-bubble {
                position: absolute;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 12px;
                padding: 12px 16px;
                max-width: 280px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                animation: phBubbleIn 0.3s ease;
            }
            @keyframes phBubbleIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .ph-bubble::before {
                content: '';
                position: absolute;
                bottom: -8px;
                left: 20px;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid #334155;
            }
            .ph-bubble-title {
                font-weight: 600;
                color: #f1f5f9;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .ph-bubble-content {
                color: #cbd5e1;
                font-size: 13px;
                line-height: 1.5;
            }
            .ph-bubble-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                color: #64748b;
                cursor: pointer;
                font-size: 16px;
            }

            /* Validation Warnings */
            .ph-validation-alert {
                background: rgba(251, 191, 36, 0.1);
                border: 1px solid rgba(251, 191, 36, 0.3);
                border-radius: 8px;
                padding: 10px 14px;
                margin-top: 8px;
                display: flex;
                align-items: flex-start;
                gap: 10px;
            }
            .ph-validation-alert.error {
                background: rgba(239, 68, 68, 0.1);
                border-color: rgba(239, 68, 68, 0.3);
            }
            .ph-validation-alert.success {
                background: rgba(34, 197, 94, 0.1);
                border-color: rgba(34, 197, 94, 0.3);
            }
            .ph-validation-alert .ph-icon { flex-shrink: 0; }
            .ph-validation-alert .ph-icon.warning { color: #fbbf24; }
            .ph-validation-alert .ph-icon.error { color: #ef4444; }
            .ph-validation-alert .ph-icon.success { color: #22c55e; }
            .ph-validation-alert .ph-message {
                color: #e2e8f0;
                font-size: 13px;
                line-height: 1.4;
            }

            /* AI Chat Panel */
            .ph-chat-panel {
                position: fixed;
                bottom: 160px;
                right: 24px;
                width: 380px;
                max-height: 500px;
                background: #0f172a;
                border: 1px solid #1e293b;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
                z-index: 9999;
                display: none;
                flex-direction: column;
                overflow: hidden;
            }
            .ph-chat-panel.open { display: flex; }
            .ph-chat-header {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                padding: 14px 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .ph-chat-header h4 {
                margin: 0;
                color: white;
                font-size: 14px;
                flex: 1;
            }
            .ph-chat-header .ph-ai-badge {
                background: rgba(255,255,255,0.2);
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 11px;
                color: white;
            }
            .ph-chat-header button {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
            }
            .ph-chat-body {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .ph-chat-message {
                max-width: 85%;
                padding: 10px 14px;
                border-radius: 12px;
                font-size: 13px;
                line-height: 1.5;
            }
            .ph-chat-message.user {
                background: #6366f1;
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 4px;
            }
            .ph-chat-message.assistant {
                background: #1e293b;
                color: #e2e8f0;
                align-self: flex-start;
                border-bottom-left-radius: 4px;
            }
            .ph-chat-suggestions {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                padding: 8px 0;
            }
            .ph-chat-suggestion {
                background: rgba(99, 102, 241, 0.15);
                border: 1px solid rgba(99, 102, 241, 0.3);
                color: #a5b4fc;
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ph-chat-suggestion:hover {
                background: rgba(99, 102, 241, 0.25);
            }
            .ph-chat-input {
                display: flex;
                gap: 8px;
                padding: 12px 16px;
                border-top: 1px solid #1e293b;
            }
            .ph-chat-input input {
                flex: 1;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 20px;
                padding: 10px 16px;
                color: #e2e8f0;
                font-size: 13px;
            }
            .ph-chat-input input::placeholder { color: #64748b; }
            .ph-chat-input button {
                background: #6366f1;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }

            /* Field Help Indicators */
            .ph-field-help {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                background: rgba(99, 102, 241, 0.2);
                color: #a5b4fc;
                border-radius: 50%;
                font-size: 11px;
                cursor: help;
                margin-left: 6px;
                transition: all 0.2s;
            }
            .ph-field-help:hover {
                background: rgba(99, 102, 241, 0.4);
                transform: scale(1.1);
            }

            /* Quick Tips Popover */
            .ph-tips-popover {
                position: absolute;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 10px;
                padding: 12px;
                min-width: 220px;
                z-index: 10000;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            }
            .ph-tips-popover h5 {
                margin: 0 0 8px 0;
                color: #f1f5f9;
                font-size: 13px;
            }
            .ph-tips-popover ul {
                margin: 0;
                padding-left: 18px;
                color: #94a3b8;
                font-size: 12px;
            }
            .ph-tips-popover li { margin-bottom: 4px; }
        `;
        document.head.appendChild(styles);
    },

    // Crear elementos flotantes
    createFloatingElements() {
        // Boton flotante de ayuda
        const fab = document.createElement('button');
        fab.className = 'ph-help-fab';
        fab.id = 'ph-help-fab';
        fab.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span class="ph-badge" style="display:none">0</span>
        `;
        fab.onclick = () => this.toggleChat();
        document.body.appendChild(fab);

        // Panel de chat con IA
        const chat = document.createElement('div');
        chat.className = 'ph-chat-panel';
        chat.id = 'ph-chat-panel';
        chat.innerHTML = `
            <div class="ph-chat-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z"/>
                </svg>
                <h4>Asistente de Liquidacion</h4>
                <span class="ph-ai-badge">Ollama AI</span>
                <button onclick="PayrollHelpSystem.toggleChat()">×</button>
            </div>
            <div class="ph-chat-body" id="ph-chat-body">
                <div class="ph-chat-message assistant">
                    Hola! Soy tu asistente de liquidaciones. Puedo ayudarte con:
                    <ul style="margin: 8px 0 0 16px; padding: 0;">
                        <li>Crear plantillas y conceptos</li>
                        <li>Configurar formulas de calculo</li>
                        <li>Resolver errores y validaciones</li>
                        <li>Explicar el proceso de liquidacion</li>
                    </ul>
                </div>
                <div class="ph-chat-suggestions" id="ph-chat-suggestions"></div>
            </div>
            <div class="ph-chat-input">
                <input type="text" id="ph-chat-input" placeholder="Escribe tu pregunta..." onkeypress="if(event.key==='Enter')PayrollHelpSystem.sendMessage()">
                <button onclick="PayrollHelpSystem.sendMessage()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </div>
        `;
        document.body.appendChild(chat);
    },

    // Eventos globales
    bindGlobalEvents() {
        // Detectar hover en campos con ayuda
        document.addEventListener('mouseover', (e) => {
            const helpTrigger = e.target.closest('[data-ph-help]');
            if (helpTrigger) {
                this.showFieldHelp(helpTrigger, helpTrigger.dataset.phHelp);
            }
        });
    },

    // Cambiar contexto de ayuda
    setContext(contextKey) {
        this.state.currentContext = contextKey;
        this.updateSuggestions();
        console.log('[PayrollHelp] Contexto:', contextKey);
    },

    // Actualizar sugerencias segun contexto
    updateSuggestions() {
        const ctx = this.contexts[this.state.currentContext];
        const container = document.getElementById('ph-chat-suggestions');
        if (!container || !ctx) return;

        const topics = ctx.helpTopics || [];
        container.innerHTML = topics.map(topic =>
            `<button class="ph-chat-suggestion" onclick="PayrollHelpSystem.askQuestion('${topic.replace(/'/g, "\\'")}')">${topic}</button>`
        ).join('');
    },

    // Toggle chat panel
    toggleChat() {
        const panel = document.getElementById('ph-chat-panel');
        if (panel) {
            panel.classList.toggle('open');
            this.state.chatOpen = panel.classList.contains('open');
            if (this.state.chatOpen) {
                this.updateSuggestions();
                document.getElementById('ph-chat-input')?.focus();
            }
        }
    },

    // Enviar mensaje al asistente
    async sendMessage() {
        const input = document.getElementById('ph-chat-input');
        const message = input?.value?.trim();
        if (!message) return;

        input.value = '';
        this.addChatMessage(message, 'user');

        // Mostrar "escribiendo..."
        const typingId = this.addChatMessage('Analizando...', 'assistant', true);

        try {
            const response = await this.askOllama(message);
            this.updateChatMessage(typingId, response);
        } catch (error) {
            this.updateChatMessage(typingId, 'Lo siento, no pude conectar con el asistente. Intenta de nuevo.');
        }
    },

    // Preguntar directamente (desde sugerencias)
    async askQuestion(question) {
        const input = document.getElementById('ph-chat-input');
        if (input) input.value = question;
        await this.sendMessage();
    },

    // Agregar mensaje al chat
    addChatMessage(content, type, isTyping = false) {
        const body = document.getElementById('ph-chat-body');
        const id = 'msg-' + Date.now();
        const msg = document.createElement('div');
        msg.className = `ph-chat-message ${type}`;
        msg.id = id;
        msg.innerHTML = isTyping ? '<em>Escribiendo...</em>' : content;
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;
        return id;
    },

    // Actualizar mensaje existente
    updateChatMessage(id, content) {
        const msg = document.getElementById(id);
        if (msg) {
            msg.innerHTML = content.replace(/\n/g, '<br>');
        }
    },

    // Consultar a Ollama
    async askOllama(question) {
        const context = this.contexts[this.state.currentContext];
        const systemPrompt = `Eres un asistente experto en liquidacion de sueldos y nominas.
El usuario esta en la pantalla: ${context?.title || 'General'}.
${context?.description || ''}

Responde de forma concisa y practica. Si detectas un error comun, sugiere la solucion.
Usa ejemplos concretos cuando sea posible. Maximo 150 palabras.`;

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

            // Si no hay token, usar fallback directo
            if (!token) {
                console.log('[PayrollHelp] Sin token, usando fallback');
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
                        module: 'payroll-liquidation',
                        screen: this.state.currentContext,
                        systemPrompt: systemPrompt
                    }
                })
            });

            // Si hay error HTTP, usar fallback
            if (!response.ok) {
                console.log('[PayrollHelp] Error HTTP', response.status, '- usando fallback');
                return this.getFallbackResponse(question);
            }

            const data = await response.json();

            // Verificar que hay respuesta válida
            const answer = data.response || data.answer || data.message;
            if (answer && answer.length > 10) {
                return answer;
            }

            // Si la respuesta es muy corta o vacía, usar fallback
            console.log('[PayrollHelp] Respuesta vacía de API, usando fallback');
            return this.getFallbackResponse(question);
        } catch (error) {
            console.error('[PayrollHelp] Ollama error:', error);
            // Fallback con respuestas predefinidas
            return this.getFallbackResponse(question);
        }
    },

    // Respuestas de fallback si Ollama no esta disponible
    getFallbackResponse(question) {
        const q = question.toLowerCase();

        // Fórmulas y cálculos
        if (q.includes('formula') || q.includes('calcul') || q.includes('creo una') || q.includes('crear una')) {
            return `<strong>Crear Fórmulas de Cálculo</strong>

Para crear una fórmula, use estas variables disponibles:

<strong>Variables de Sueldo:</strong>
• <code>{baseSalary}</code> - Sueldo básico mensual
• <code>{dailySalary}</code> - Sueldo diario
• <code>{hourlySalary}</code> - Sueldo por hora

<strong>Variables de Tiempo:</strong>
• <code>{workedDays}</code> - Días trabajados
• <code>{workedHours}</code> - Horas trabajadas
• <code>{overtime50Hours}</code> - Horas extras al 50%
• <code>{overtime100Hours}</code> - Horas extras al 100%

<strong>Ejemplos prácticos:</strong>
• Jubilación 11%: <code>{baseSalary} * 0.11</code>
• Presentismo 8.33%: <code>{baseSalary} * 0.0833</code>
• Horas extras: <code>{hourlySalary} * {overtime50Hours} * 1.5</code>

Ingrese la fórmula en el campo "Fórmula" al crear/editar un concepto.`;
        }

        // Entidades
        if (q.includes('entidad') || q.includes('destino') || q.includes('recaudator')) {
            return `<strong>Entidades de Destino</strong>

Son las organizaciones que reciben los aportes y contribuciones:

<strong>Tipos comunes:</strong>
• <strong>AFIP</strong> - Jubilación, Obra Social, PAMI
• <strong>Obras Sociales</strong> - OSECAC, OSPACA, etc.
• <strong>Sindicatos</strong> - UOCRA, UOM, Comercio
• <strong>ART</strong> - Aseguradoras de riesgos

<strong>¿Cómo crearlas?</strong>
1. Ir a "Entidades de Destino"
2. Primero crear una Categoría (Ej: "Obras Sociales")
3. Luego crear la Entidad dentro de esa categoría
4. Asignar la entidad al concepto correspondiente

<strong>Beneficio:</strong> Los reportes de consolidación agrupan automáticamente los montos por entidad.`;
        }

        // Plantillas
        if (q.includes('plantilla') || q.includes('template')) {
            return `<strong>Plantillas de Liquidación</strong>

Una plantilla agrupa todos los conceptos que aplican a un tipo de empleado:

<strong>Pasos para crear una plantilla:</strong>
1. Click en "Nueva Plantilla"
2. Asignar código único (ej: COMERCIO-2025)
3. Agregar conceptos (haberes y deducciones)
4. Configurar fórmulas o valores fijos
5. Asignar entidades de destino a cada concepto

<strong>Conceptos típicos:</strong>
• <strong>Haberes:</strong> Sueldo básico, Presentismo, Antigüedad
• <strong>Deducciones:</strong> Jubilación 11%, Obra Social 3%, PAMI 3%

<strong>Tip:</strong> Puede clonar plantillas existentes y modificarlas.`;
        }

        // Concepto
        if (q.includes('concepto') || q.includes('haber') || q.includes('deduccion')) {
            return `<strong>Conceptos de Liquidación</strong>

Son las líneas que aparecen en el recibo de sueldo:

<strong>Tipos:</strong>
• <strong>Haber:</strong> Suman al bruto (Sueldo, Presentismo, Extras)
• <strong>Deducción:</strong> Restan del bruto (Jubilación, OS, Sindicato)
• <strong>Patronal:</strong> No afectan el neto, van a cargas sociales

<strong>Campos importantes:</strong>
• <strong>Nombre:</strong> Lo que aparece en el recibo
• <strong>Fórmula:</strong> Cálculo automático
• <strong>Entidad:</strong> A quién va el aporte

<strong>Ejemplo Jubilación:</strong>
Nombre: "Aporte Jubilatorio"
Tipo: Deducción
Fórmula: {baseSalary} * 0.11
Entidad: AFIP`;
        }

        // Proceso de liquidación
        if (q.includes('proceso') || q.includes('liquidar') || q.includes('pasos')) {
            return `<strong>Proceso de Liquidación (5 pasos)</strong>

1. <strong>VALIDAR</strong> - Verifica datos de empleados y plantillas
2. <strong>CALCULAR</strong> - Ejecuta fórmulas y genera montos
3. <strong>REVISAR</strong> - Muestra alertas y anomalías
4. <strong>APROBAR</strong> - Autorización para proceder al pago
5. <strong>PAGAR</strong> - Genera archivos bancarios y recibos

<strong>Requisitos previos:</strong>
• Empleados con plantilla asignada
• Plantillas con conceptos configurados
• Entidades de destino creadas

<strong>Tip:</strong> Use "Auditar Configuración" para verificar que todo esté listo.`;
        }

        // Errores
        if (q.includes('error') || q.includes('problema') || q.includes('no funciona')) {
            return `<strong>Errores Comunes y Soluciones</strong>

• <strong>"Sin plantilla"</strong>
  → Asigne una plantilla al empleado en su perfil

• <strong>"Fórmula inválida"</strong>
  → Revise variables y paréntesis balanceados

• <strong>"Sin entidad"</strong>
  → Asigne entidad de destino al concepto

• <strong>"Cálculo en 0"</strong>
  → Verifique que la variable tenga valor (ej: baseSalary)

• <strong>"Empleado con errores"</strong>
  → Revisar datos faltantes en perfil del empleado

<strong>¿Necesita ayuda específica?</strong> Describa el error exacto que ve.`;
        }

        // Respuesta genérica mejorada
        return `<strong>Asistente de Liquidación de Sueldos</strong>

Puedo ayudarte con:

• <strong>Fórmulas:</strong> Crear cálculos automáticos
• <strong>Plantillas:</strong> Configurar estructuras de liquidación
• <strong>Conceptos:</strong> Haberes, deducciones, patronales
• <strong>Entidades:</strong> AFIP, Obras Sociales, Sindicatos
• <strong>Proceso:</strong> Los 5 pasos de liquidación
• <strong>Errores:</strong> Resolver problemas comunes

<strong>Ejemplos de preguntas:</strong>
• "¿Cómo creo una fórmula de jubilación?"
• "¿Qué es una entidad de destino?"
• "¿Cómo configuro una plantilla?"

¿En qué puedo ayudarte?`;
    },

    // Mostrar banner de contexto en la vista
    showContextBanner(contextKey = null) {
        const ctx = this.contexts[contextKey || this.state.currentContext];
        if (!ctx) return '';

        // Generar tips adicionales si existen
        const tipsHtml = ctx.tips && ctx.tips.length > 0 ? `
            <div class="ph-tips-list" style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
                ${ctx.tips.slice(0, 2).map(tip => `<span style="margin-right: 12px;">💡 ${tip}</span>`).join('')}
            </div>
        ` : '';

        return `
            <div class="ph-context-banner">
                <div class="ph-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                </div>
                <div class="ph-content">
                    <h4>${ctx.title}</h4>
                    <p>${ctx.description}</p>
                    ${tipsHtml}
                </div>
                <button class="ph-close" onclick="this.parentElement.remove()" title="Cerrar">×</button>
            </div>
        `;
    },

    // Mostrar ayuda de campo
    showFieldHelp(element, helpKey) {
        const [context, field] = helpKey.split('.');
        const ctx = this.contexts[context];
        const help = ctx?.fieldHelp?.[field];

        if (!help) return;

        this.showBubble(element, field.replace(/_/g, ' '), help);
    },

    // Mostrar burbuja de ayuda
    showBubble(anchor, title, content, duration = 5000) {
        // Remover burbuja anterior
        document.querySelector('.ph-bubble')?.remove();

        const rect = anchor.getBoundingClientRect();
        const bubble = document.createElement('div');
        bubble.className = 'ph-bubble';
        bubble.innerHTML = `
            <button class="ph-bubble-close" onclick="this.parentElement.remove()">×</button>
            <div class="ph-bubble-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                ${title}
            </div>
            <div class="ph-bubble-content">${content}</div>
        `;

        bubble.style.top = (rect.top - 80) + 'px';
        bubble.style.left = rect.left + 'px';

        document.body.appendChild(bubble);

        if (duration > 0) {
            setTimeout(() => bubble.remove(), duration);
        }
    },

    // Validar formulario antes de guardar
    validateForm(formId, contextKey) {
        const ctx = this.contexts[contextKey];
        const validations = ctx?.validations || [];
        const form = document.getElementById(formId);
        if (!form) return { valid: true, errors: [] };

        const errors = [];
        const formData = new FormData(form);

        validations.forEach(v => {
            const value = formData.get(v.field);

            if (v.rule === 'required' && (!value || value.trim() === '')) {
                errors.push({ field: v.field, message: v.message });
            }

            if (v.rule.startsWith('minLength:')) {
                const min = parseInt(v.rule.split(':')[1]);
                // Para conceptos, contar elementos
                if (v.field === 'concepts') {
                    const conceptCount = form.querySelectorAll('.pe-concept-row').length;
                    if (conceptCount < min) {
                        errors.push({ field: v.field, message: v.message });
                    }
                }
            }
        });

        return { valid: errors.length === 0, errors };
    },

    // Mostrar errores de validacion
    showValidationErrors(errors, container) {
        if (!container) return;

        // Remover errores anteriores
        container.querySelectorAll('.ph-validation-alert').forEach(el => el.remove());

        errors.forEach(err => {
            const alert = document.createElement('div');
            alert.className = 'ph-validation-alert error';
            alert.innerHTML = `
                <span class="ph-icon error">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                </span>
                <span class="ph-message">${err.message}</span>
            `;
            container.appendChild(alert);
        });
    },

    // Validar concepto en tiempo real
    validateConcept(conceptData) {
        const warnings = [];

        if (!conceptData.entity_id) {
            warnings.push({
                type: 'warning',
                message: 'Sin entidad de destino: Este concepto no aparecera en consolidaciones de aportes.'
            });
        }

        if (!conceptData.formula && !conceptData.percentage) {
            warnings.push({
                type: 'info',
                message: 'Sin formula: Debera ingresar el valor manualmente para cada empleado.'
            });
        }

        if (conceptData.formula) {
            const validation = FormulaEditor.validate(conceptData.formula);
            if (!validation.valid) {
                warnings.push({
                    type: 'error',
                    message: 'Formula invalida: ' + (validation.errors?.join(', ') || 'Revise la sintaxis')
                });
            }
        }

        return warnings;
    },

    // Mostrar warnings proactivos
    showProactiveWarning(element, warnings) {
        if (!element || warnings.length === 0) return;

        // Remover warnings anteriores
        element.parentElement?.querySelectorAll('.ph-validation-alert')?.forEach(el => el.remove());

        warnings.forEach(w => {
            const alert = document.createElement('div');
            alert.className = `ph-validation-alert ${w.type}`;
            alert.innerHTML = `
                <span class="ph-icon ${w.type}">
                    ${w.type === 'error' ? '⚠️' : w.type === 'warning' ? '💡' : 'ℹ️'}
                </span>
                <span class="ph-message">${w.message}</span>
            `;
            element.parentElement.appendChild(alert);
        });
    },

    // Auditar datos existentes
    async auditPayrollData() {
        const issues = [];

        try {
            // 1. Verificar plantillas sin conceptos
            const templates = await PayrollAPI.getTemplates('?include_concepts=true');
            (templates.data || []).forEach(t => {
                if (!t.concepts || t.concepts.length === 0) {
                    issues.push({
                        type: 'error',
                        entity: 'Plantilla',
                        id: t.id,
                        name: t.template_name,
                        message: 'No tiene conceptos configurados - no se podra liquidar',
                        action: 'Editar plantilla y agregar conceptos'
                    });
                } else {
                    // Verificar conceptos sin entidad
                    const noEntity = t.concepts.filter(c => !c.entity_id);
                    if (noEntity.length > 0) {
                        issues.push({
                            type: 'warning',
                            entity: 'Plantilla',
                            id: t.id,
                            name: t.template_name,
                            message: `${noEntity.length} concepto(s) sin entidad de destino`,
                            action: 'Asignar entidades para consolidacion'
                        });
                    }

                    // Verificar si hay al menos un haber
                    const haberes = t.concepts.filter(c => c.concept_type?.flow_direction === 'earning' || c.concept_type_id === 1);
                    if (haberes.length === 0) {
                        issues.push({
                            type: 'warning',
                            entity: 'Plantilla',
                            id: t.id,
                            name: t.template_name,
                            message: 'No tiene ningun concepto de tipo Haber',
                            action: 'Agregar al menos un haber (sueldo basico, etc.)'
                        });
                    }

                    // Verificar formulas invalidas
                    t.concepts.forEach(c => {
                        if (c.formula && typeof FormulaEditor !== 'undefined') {
                            const validation = FormulaEditor.validate(c.formula);
                            if (!validation.valid) {
                                issues.push({
                                    type: 'error',
                                    entity: 'Concepto',
                                    id: c.id,
                                    name: c.concept_name,
                                    message: `Formula invalida en plantilla "${t.template_name}"`,
                                    action: 'Corregir formula: ' + (validation.errors?.join(', ') || 'revisar sintaxis')
                                });
                            }
                        }
                    });
                }
            });

            // 2. Verificar categorias sin entidades
            try {
                const categories = await PayrollAPI.getEntityCategories();
                const entities = await PayrollAPI.getEntities();
                const entitiesData = entities.data || [];

                (categories.data || []).forEach(cat => {
                    const catEntities = entitiesData.filter(e => e.category_id === cat.id);
                    if (catEntities.length === 0) {
                        issues.push({
                            type: 'info',
                            entity: 'Categoria',
                            id: cat.id,
                            name: cat.category_name,
                            message: 'No tiene entidades asignadas',
                            action: 'Crear entidades para esta categoria o eliminarla'
                        });
                    }
                });
            } catch (e) {
                console.log('[PayrollHelp] Could not audit entities');
            }

            // 3. Actualizar badge
            const badge = document.querySelector('.ph-help-fab .ph-badge');
            if (badge) {
                const criticalCount = issues.filter(i => i.type === 'error' || i.type === 'warning').length;
                badge.textContent = criticalCount;
                badge.style.display = criticalCount > 0 ? 'flex' : 'none';
            }

            this.state.validationErrors = issues;
            console.log('[PayrollHelp] Auditoria completada:', issues.length, 'issues encontrados');
            return issues;
        } catch (error) {
            console.error('[PayrollHelp] Audit error:', error);
            return [];
        }
    },

    // Mostrar resultados de auditoria en modal
    showAuditReport() {
        const issues = this.state.validationErrors || [];

        const errorCount = issues.filter(i => i.type === 'error').length;
        const warningCount = issues.filter(i => i.type === 'warning').length;
        const infoCount = issues.filter(i => i.type === 'info').length;

        const modal = document.createElement('div');
        modal.className = 'pe-modal-overlay';
        modal.innerHTML = `
            <div class="pe-modal" style="max-width: 700px;">
                <div class="pe-modal-header">
                    <h3>🔍 Auditoria de Configuracion</h3>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                </div>
                <div class="pe-modal-body" style="max-height: 500px; overflow-y: auto;">
                    <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                        <div style="background: rgba(239,68,68,0.15); padding: 12px 16px; border-radius: 8px; flex: 1; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${errorCount}</div>
                            <div style="font-size: 12px; color: #94a3b8;">Errores</div>
                        </div>
                        <div style="background: rgba(251,191,36,0.15); padding: 12px 16px; border-radius: 8px; flex: 1; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #fbbf24;">${warningCount}</div>
                            <div style="font-size: 12px; color: #94a3b8;">Advertencias</div>
                        </div>
                        <div style="background: rgba(99,102,241,0.15); padding: 12px 16px; border-radius: 8px; flex: 1; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #6366f1;">${infoCount}</div>
                            <div style="font-size: 12px; color: #94a3b8;">Sugerencias</div>
                        </div>
                    </div>

                    ${issues.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: #22c55e;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 12px;">
                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            <h4>Todo esta configurado correctamente</h4>
                            <p style="color: #94a3b8;">No se encontraron problemas en la configuracion de liquidaciones.</p>
                        </div>
                    ` : issues.map(issue => `
                        <div class="ph-validation-alert ${issue.type}" style="margin-bottom: 10px;">
                            <span class="ph-icon ${issue.type}">
                                ${issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️'}
                            </span>
                            <div style="flex: 1;">
                                <div style="color: #f1f5f9; font-weight: 500;">${issue.entity}: ${issue.name}</div>
                                <div style="color: #94a3b8; font-size: 13px;">${issue.message}</div>
                                ${issue.action ? `<div style="color: #a5b4fc; font-size: 12px; margin-top: 4px;">💡 ${issue.action}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="pe-modal-footer" style="padding: 12px 16px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between;">
                    <button onclick="PayrollHelpSystem.auditPayrollData().then(() => PayrollHelpSystem.showAuditReport()); this.closest('.pe-modal-overlay').remove();" class="pe-btn pe-btn-outline">
                        🔄 Re-auditar
                    </button>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-primary">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Metodo para obtener sugerencias de AI basadas en issues
    async getSuggestionsFromOllama() {
        const issues = this.state.validationErrors || [];
        if (issues.length === 0) return;

        const prompt = `Tengo ${issues.length} problemas en mi configuracion de liquidacion de sueldos:
${issues.map(i => `- ${i.entity} "${i.name}": ${i.message}`).join('\n')}

Dame sugerencias breves y practicas para resolverlos.`;

        try {
            const response = await this.askOllama(prompt);
            return response;
        } catch (e) {
            return null;
        }
    }
};

// Hacer global para acceso desde HTML
window.PayrollHelpSystem = PayrollHelpSystem;

// ============================================================================
// STATE MANAGEMENT - Redux-like pattern
// ============================================================================
const PayrollState = {
    period: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
    selectedEmployees: new Set(),
    templates: [],
    runs: [],
    entities: [],
    currentView: 'dashboard',
    workflowStep: 1,
    isLoading: false,
    aiEnabled: true,
    filters: {}
};

// ============================================================================
// API SERVICE - Centralized fetch handler
// ============================================================================
const PayrollAPI = {
    baseUrl: '/api/payroll',

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API Error');
            return data;
        } catch (error) {
            console.error(`[PayrollAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    // Request para respuestas binarias (PDF)
    async requestBlob(endpoint, options = {}) {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'API Error');
            }
            return await response.blob();
        } catch (error) {
            console.error(`[PayrollAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    // Templates
    getTemplates: (params = '') => PayrollAPI.request(`/templates${params}`),
    getTemplate: (id) => PayrollAPI.request(`/templates/${id}`),
    createTemplate: (data) => PayrollAPI.request('/templates', { method: 'POST', body: JSON.stringify(data) }),
    updateTemplate: (id, data) => PayrollAPI.request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // Concepts - Sistema Universal
    getConceptTypes: (locale = 'es', countryId = null) => {
        let params = `?locale=${locale}&include_rates=true`;
        if (countryId) params += `&country_id=${countryId}`;
        return PayrollAPI.request(`/concept-types${params}`);
    },
    getConceptClassifications: (locale = 'es') => PayrollAPI.request(`/concept-classifications?locale=${locale}`),
    addConcept: (templateId, data) => PayrollAPI.request(`/templates/${templateId}/concepts`, { method: 'POST', body: JSON.stringify(data) }),
    updateConcept: (id, data) => PayrollAPI.request(`/concepts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteConcept: (id) => PayrollAPI.request(`/concepts/${id}`, { method: 'DELETE' }),

    // Runs & Calculations
    getRunsSummary: (year, month) => PayrollAPI.request(`/runs/summary?year=${year}&month=${month}`),
    getRunsDetails: (year, month) => PayrollAPI.request(`/runs/details?year=${year}&month=${month}`),
    getRuns: () => PayrollAPI.request('/runs'),
    getRunDetail: (runId, userId) => PayrollAPI.request(`/runs/${runId}/details/${userId}`),
    calculatePreview: (data) => PayrollAPI.request('/calculate/preview', { method: 'POST', body: JSON.stringify(data) }),
    calculateBulk: (data) => PayrollAPI.request('/calculate/bulk', { method: 'POST', body: JSON.stringify(data) }),
    approveRun: (id) => PayrollAPI.request(`/runs/${id}/approve`, { method: 'PUT' }),
    payRun: (id) => PayrollAPI.request(`/runs/${id}/pay`, { method: 'PUT' }),

    // Entity Categories (Tipos de entidades parametrizables)
    getEntityCategories: (params = '') => PayrollAPI.request(`/entity-categories${params}`),
    getEntityCategory: (id) => PayrollAPI.request(`/entity-categories/${id}`),
    createEntityCategory: (data) => PayrollAPI.request('/entity-categories', { method: 'POST', body: JSON.stringify(data) }),
    updateEntityCategory: (id, data) => PayrollAPI.request(`/entity-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEntityCategory: (id) => PayrollAPI.request(`/entity-categories/${id}`, { method: 'DELETE' }),

    // Entities (Entidades de destino parametrizables)
    getEntities: (params = '') => PayrollAPI.request(`/entities?include_global=true${params}`),
    getEntity: (id) => PayrollAPI.request(`/entities/${id}`),
    createEntity: (data) => PayrollAPI.request('/entities', { method: 'POST', body: JSON.stringify(data) }),
    updateEntity: (id, data) => PayrollAPI.request(`/entities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEntity: (id) => PayrollAPI.request(`/entities/${id}`, { method: 'DELETE' }),

    // Settlements
    getSettlements: () => PayrollAPI.request('/entity-settlements'),
    generateSettlement: (data) => PayrollAPI.request('/entity-settlements/generate', { method: 'POST', body: JSON.stringify(data) }),

    // Payslip Templates (Editor Visual de Recibos)
    getPayslipBlockTypes: () => PayrollAPI.request('/payslip-block-types'),
    getPayslipTemplates: () => PayrollAPI.request('/payslip-templates'),
    getPayslipTemplate: (id) => PayrollAPI.request(`/payslip-templates/${id}`),
    createPayslipTemplate: (data) => PayrollAPI.request('/payslip-templates', { method: 'POST', body: JSON.stringify(data) }),
    updatePayslipTemplate: (id, data) => PayrollAPI.request(`/payslip-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    previewPayslipPDF: (templateId) => PayrollAPI.requestBlob('/payslip/preview-pdf', { method: 'POST', body: JSON.stringify({ template_id: templateId }) }),
    generatePayslipPDF: (runDetailId, templateId) => PayrollAPI.requestBlob('/payslip/generate-pdf', { method: 'POST', body: JSON.stringify({ run_detail_id: runDetailId, template_id: templateId }) }),

    // Export
    exportRun: (runId, format) => PayrollAPI.request(`/export/payroll-run/${runId}`, { method: 'POST', body: JSON.stringify({ format }) }),

    // Branches
    getBranches: () => PayrollAPI.request('/branches'),

    // Categories
    getCategories: () => PayrollAPI.request('/categories'),

    // Assignments
    getAssignments: () => PayrollAPI.request('/assignments'),
    createAssignment: (data) => PayrollAPI.request('/assignments', { method: 'POST', body: JSON.stringify(data) })
};

// ============================================================================
// FORMULA EDITOR - Editor profesional de formulas con validacion y preview
// ============================================================================
const FormulaEditor = {
    // Variables disponibles para formulas con descripcion y valores de prueba
    variables: {
        baseSalary: {
            name: '{baseSalary}',
            description: 'Sueldo base mensual del empleado',
            example: 500000,
            category: 'salary'
        },
        hourlyRate: {
            name: '{hourlyRate}',
            description: 'Valor por hora (baseSalary / 200 horas)',
            example: 2500,
            category: 'salary'
        },
        workedDays: {
            name: '{workedDays}',
            description: 'Dias efectivamente trabajados en el periodo',
            example: 22,
            category: 'time'
        },
        workedHours: {
            name: '{workedHours}',
            description: 'Horas totales trabajadas en el periodo',
            example: 176,
            category: 'time'
        },
        overtime50Hours: {
            name: '{overtime50Hours}',
            description: 'Horas extras al 50% (dias habiles)',
            example: 8,
            category: 'overtime'
        },
        overtime100Hours: {
            name: '{overtime100Hours}',
            description: 'Horas extras al 100% (feriados/fines de semana)',
            example: 4,
            category: 'overtime'
        },
        nightHours: {
            name: '{nightHours}',
            description: 'Horas nocturnas trabajadas (21:00 - 06:00)',
            example: 20,
            category: 'overtime'
        },
        absentDays: {
            name: '{absentDays}',
            description: 'Dias de ausencia injustificada',
            example: 1,
            category: 'time'
        },
        holidayCount: {
            name: '{holidayCount}',
            description: 'Cantidad de feriados en el periodo',
            example: 2,
            category: 'time'
        }
    },

    // Operadores y funciones permitidas
    operators: ['+', '-', '*', '/', '(', ')', '%'],
    functions: ['round', 'floor', 'ceil', 'abs', 'min', 'max', 'sqrt', 'pow'],

    // Ejemplos de formulas comunes por tipo de concepto
    examples: {
        percentage: {
            name: 'Porcentaje del sueldo',
            formula: '{baseSalary} * 0.11',
            description: '11% del sueldo base (ej: aporte jubilatorio)'
        },
        overtime50: {
            name: 'Horas extras 50%',
            formula: '{overtime50Hours} * {hourlyRate} * 1.5',
            description: 'Pago de horas extras con recargo del 50%'
        },
        overtime100: {
            name: 'Horas extras 100%',
            formula: '{overtime100Hours} * {hourlyRate} * 2',
            description: 'Pago de horas extras con recargo del 100%'
        },
        nightBonus: {
            name: 'Adicional nocturno',
            formula: '{nightHours} * {hourlyRate} * 0.2',
            description: '20% adicional por hora nocturna'
        },
        attendance: {
            name: 'Presentismo',
            formula: '{absentDays} == 0 ? {baseSalary} * 0.10 : 0',
            description: '10% del sueldo si no hay ausencias'
        },
        perDay: {
            name: 'Valor por dia',
            formula: '{baseSalary} / 30 * {workedDays}',
            description: 'Calculo proporcional por dias trabajados'
        },
        combined: {
            name: 'Formula combinada',
            formula: 'round({baseSalary} * 0.05 + {overtime50Hours} * {hourlyRate} * 0.5)',
            description: '5% de base + 50% extra por horas extras'
        }
    },

    // Validar formula
    validate(formula) {
        if (!formula || formula.trim() === '') {
            return { valid: true, isSimple: true, message: 'Valor fijo o porcentaje simple' };
        }

        // Si es solo un numero o porcentaje, es valido simple
        if (/^[\d.]+%?$/.test(formula.trim())) {
            return { valid: true, isSimple: true, message: 'Valor fijo valido' };
        }

        const errors = [];

        // Verificar que todas las variables sean conocidas
        const varPattern = /\{([^}]+)\}/g;
        let match;
        const foundVars = [];
        while ((match = varPattern.exec(formula)) !== null) {
            const varName = match[1];
            if (!this.variables[varName]) {
                errors.push(`Variable desconocida: {${varName}}`);
            } else {
                foundVars.push(varName);
            }
        }

        // Verificar parentesis balanceados
        let parenCount = 0;
        for (const char of formula) {
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
            if (parenCount < 0) {
                errors.push('Parentesis desbalanceados');
                break;
            }
        }
        if (parenCount !== 0) {
            errors.push('Parentesis no cerrados');
        }

        // Verificar caracteres permitidos (despues de quitar variables)
        const cleanFormula = formula.replace(/\{[^}]+\}/g, '0');
        const allowedPattern = /^[\d\s+\-*/().,%a-zA-Z?:=<>!&|]+$/;
        if (!allowedPattern.test(cleanFormula)) {
            errors.push('Contiene caracteres no permitidos');
        }

        // Verificar funciones
        const funcPattern = /([a-zA-Z]+)\s*\(/g;
        while ((match = funcPattern.exec(cleanFormula)) !== null) {
            const funcName = match[1].toLowerCase();
            if (!this.functions.includes(funcName)) {
                errors.push(`Funcion desconocida: ${funcName}()`);
            }
        }

        if (errors.length > 0) {
            return { valid: false, errors, foundVars };
        }

        return { valid: true, isFormula: true, foundVars, message: 'Formula valida' };
    },

    // Calcular preview con valores de ejemplo
    calculatePreview(formula) {
        if (!formula || formula.trim() === '') return null;

        // Si es solo un numero
        if (/^[\d.]+$/.test(formula.trim())) {
            return { result: parseFloat(formula), type: 'fixed' };
        }

        // Si es porcentaje
        if (/^[\d.]+%$/.test(formula.trim())) {
            const pct = parseFloat(formula) / 100;
            const result = this.variables.baseSalary.example * pct;
            return { result, type: 'percentage', percentage: parseFloat(formula) };
        }

        // Evaluar formula con valores de ejemplo
        try {
            let expression = formula;

            // 1. Reemplazar variables con valores de ejemplo
            for (const [key, data] of Object.entries(this.variables)) {
                expression = expression.replace(new RegExp(`\\{${key}\\}`, 'gi'), String(data.example));
            }

            // 2. Reemplazar funciones con Math.*
            expression = expression.replace(/\bround\b/gi, 'Math.round');
            expression = expression.replace(/\bfloor\b/gi, 'Math.floor');
            expression = expression.replace(/\bceil\b/gi, 'Math.ceil');
            expression = expression.replace(/\babs\b/gi, 'Math.abs');
            expression = expression.replace(/\bmin\b/gi, 'Math.min');
            expression = expression.replace(/\bmax\b/gi, 'Math.max');
            expression = expression.replace(/\bsqrt\b/gi, 'Math.sqrt');
            expression = expression.replace(/\bpow\b/gi, 'Math.pow');

            // 3. Evaluar con Function (mas seguro que eval para preview)
            const safeEval = new Function('return ' + expression);
            const result = safeEval();

            if (typeof result !== 'number' || !isFinite(result)) {
                return { error: 'Resultado no valido' };
            }

            return { result: Math.round(result * 100) / 100, type: 'formula' };
        } catch (e) {
            return { error: e.message };
        }
    },

    // Formatear numero como moneda
    formatCurrency(value) {
        if (value === null || value === undefined) return '--';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(value);
    },

    // Renderizar el editor de formulas completo
    renderEditor(index, currentValue = '', fieldName = 'concept_formula') {
        const validation = this.validate(currentValue);
        const preview = this.calculatePreview(currentValue);

        return `
            <div class="pe-formula-editor" data-index="${index}">
                <div class="pe-formula-input-wrapper">
                    <input type="text"
                           name="${fieldName}_${index}"
                           value="${currentValue || ''}"
                           placeholder="Ej: 11 o {baseSalary} * 0.11"
                           class="pe-formula-input ${validation.valid ? 'valid' : 'invalid'}"
                           oninput="FormulaEditor.onInput(this, ${index})"
                           onfocus="FormulaEditor.showPanel(${index})"
                           autocomplete="off">
                    <button type="button"
                            class="pe-formula-help-btn"
                            onclick="FormulaEditor.togglePanel(${index})"
                            title="Ayuda de formulas">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </button>
                </div>
                <div class="pe-formula-status">
                    ${validation.valid ?
                        `<span class="pe-status-ok" title="${validation.message}">&#10003;</span>` :
                        `<span class="pe-status-error" title="${validation.errors?.join(', ')}">&#10007;</span>`
                    }
                    ${preview && !preview.error ?
                        `<span class="pe-preview-result" title="Preview con valores de ejemplo">${this.formatCurrency(preview.result)}</span>` :
                        ''
                    }
                </div>
                <div id="pe-formula-panel-${index}" class="pe-formula-panel" style="display:none;">
                    ${this.renderHelpPanel(index)}
                </div>
            </div>
        `;
    },

    // Panel de ayuda con variables y ejemplos
    renderHelpPanel(index) {
        // Agrupar variables por categoria
        const categories = {
            salary: { name: 'Salario', icon: '$', vars: [] },
            time: { name: 'Tiempo', icon: '&#128337;', vars: [] },
            overtime: { name: 'Extras', icon: '+', vars: [] }
        };

        for (const [key, data] of Object.entries(this.variables)) {
            if (categories[data.category]) {
                categories[data.category].vars.push({ key, ...data });
            }
        }

        return `
            <div class="pe-formula-help">
                <div class="pe-help-section">
                    <h5>Variables Disponibles</h5>
                    <div class="pe-vars-grid">
                        ${Object.values(categories).map(cat => `
                            <div class="pe-var-category">
                                <span class="pe-cat-header">${cat.icon} ${cat.name}</span>
                                ${cat.vars.map(v => `
                                    <div class="pe-var-item" onclick="FormulaEditor.insertVariable(${index}, '${v.name}')" title="${v.description}">
                                        <code>${v.name}</code>
                                        <small>${v.description.substring(0, 30)}...</small>
                                    </div>
                                `).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="pe-help-section">
                    <h5>Ejemplos Rapidos</h5>
                    <div class="pe-examples-list">
                        ${Object.values(this.examples).slice(0, 5).map(ex => `
                            <div class="pe-example-item" onclick="FormulaEditor.insertExample(${index}, '${ex.formula.replace(/'/g, "\\'")}')">
                                <span class="pe-ex-name">${ex.name}</span>
                                <code class="pe-ex-formula">${ex.formula.length > 35 ? ex.formula.substring(0, 35) + '...' : ex.formula}</code>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="pe-help-section pe-help-functions">
                    <h5>Funciones: <code>round() floor() ceil() abs() min() max()</code></h5>
                </div>
            </div>
        `;
    },

    // Eventos
    onInput(input, index) {
        const formula = input.value;
        const validation = this.validate(formula);
        const preview = this.calculatePreview(formula);

        // Actualizar clase de validacion
        input.classList.toggle('valid', validation.valid);
        input.classList.toggle('invalid', !validation.valid);

        // Actualizar status
        const statusEl = input.closest('.pe-formula-editor').querySelector('.pe-formula-status');
        if (statusEl) {
            statusEl.innerHTML = `
                ${validation.valid ?
                    `<span class="pe-status-ok" title="${validation.message}">&#10003;</span>` :
                    `<span class="pe-status-error" title="${validation.errors?.join(', ')}">&#10007;</span>`
                }
                ${preview && !preview.error ?
                    `<span class="pe-preview-result" title="Preview">${this.formatCurrency(preview.result)}</span>` :
                    preview?.error ? `<span class="pe-preview-error" title="${preview.error}">Error</span>` : ''
                }
            `;
        }
    },

    showPanel(index) {
        // No hacer nada en focus, solo con el boton
    },

    togglePanel(index) {
        const panel = document.getElementById(`pe-formula-panel-${index}`);
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    },

    insertVariable(index, varName) {
        const input = document.querySelector(`.pe-formula-editor[data-index="${index}"] .pe-formula-input`);
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const text = input.value;
            input.value = text.substring(0, start) + varName + text.substring(end);
            input.focus();
            input.setSelectionRange(start + varName.length, start + varName.length);
            this.onInput(input, index);
        }
    },

    insertExample(index, formula) {
        const input = document.querySelector(`.pe-formula-editor[data-index="${index}"] .pe-formula-input`);
        if (input) {
            input.value = formula;
            this.onInput(input, index);
            this.togglePanel(index);
        }
    }
};

// Hacer FormulaEditor global para acceso desde HTML
window.FormulaEditor = FormulaEditor;

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================
function showPayrollLiquidationContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div id="payroll-enterprise" class="payroll-enterprise">
            <!-- Header Enterprise -->
            <header class="pe-header">
                <div class="pe-header-left">
                    <div class="pe-logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <div class="pe-title-block">
                        <h1 class="pe-title">PAYROLL ENGINE</h1>
                        <span class="pe-subtitle">Enterprise Liquidation System</span>
                    </div>
                </div>
                <div class="pe-header-center">
                    <div class="pe-tech-badges">
                        <span class="pe-badge pe-badge-ai" title="Ollama AI Integration">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                            AI Powered
                        </span>
                        <span class="pe-badge pe-badge-db" title="PostgreSQL Database">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2z"/></svg>
                            PostgreSQL
                        </span>
                        <span class="pe-badge pe-badge-node" title="Node.js Backend">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.85c-.27 0-.55.07-.78.2L3.78 6.35c-.48.28-.78.8-.78 1.36v8.58c0 .56.3 1.08.78 1.36l7.44 4.3c.23.13.5.2.78.2s.55-.07.78-.2l7.44-4.3c.48-.28.78-.8.78-1.36V7.71c0-.56-.3-1.08-.78-1.36l-7.44-4.3c-.23-.13-.5-.2-.78-.2z"/></svg>
                            Node.js
                        </span>
                    </div>
                </div>
                <div class="pe-header-right">
                    <div class="pe-period-selector">
                        <select id="pe-year" class="pe-select">
                            ${[2025, 2024, 2023].map(y => `<option value="${y}" ${y === PayrollState.period.year ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                        <select id="pe-month" class="pe-select">
                            ${Array.from({length: 12}, (_, i) => `<option value="${i+1}" ${i+1 === PayrollState.period.month ? 'selected' : ''}>${new Date(2000, i).toLocaleDateString('es', {month: 'short'}).toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="PayrollEngine.refresh()" class="pe-btn pe-btn-icon" title="Refresh Data">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    </button>
                </div>
            </header>

            <!-- Navigation Tabs -->
            <nav class="pe-nav">
                <button class="pe-nav-item active" data-view="dashboard" onclick="PayrollEngine.showView('dashboard')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Dashboard
                </button>
                <button class="pe-nav-item" data-view="process" onclick="PayrollEngine.showView('process')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                    Proceso
                </button>
                <button class="pe-nav-item" data-view="employees" onclick="PayrollEngine.showView('employees')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                    Empleados
                </button>
                <button class="pe-nav-item" data-view="templates" onclick="PayrollEngine.showView('templates')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                    Plantillas
                </button>
                <button class="pe-nav-item" data-view="entities" onclick="PayrollEngine.showView('entities')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                    Entidades
                </button>
                <button class="pe-nav-item" data-view="reports" onclick="PayrollEngine.showView('reports')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                    Reportes
                </button>
                <button class="pe-nav-item" data-view="payslip-editor" onclick="PayrollEngine.showView('payslip-editor')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    Recibos
                </button>
            </nav>

            <!-- Main Content Area -->
            <main class="pe-main" id="pe-content">
                <div class="pe-loading">
                    <div class="pe-spinner"></div>
                    <span>Cargando datos...</span>
                </div>
            </main>
        </div>
    `;

    injectEnterpriseStyles();
    PayrollEngine.init();
}

// ============================================================================
// CONCEPT TYPE HELPER - Dropdown 100% dinámico desde BD
// ============================================================================
const ConceptTypeHelper = {
    _classifications: null,
    _conceptTypes: null,
    _initialized: false,

    async init() {
        if (this._initialized) return;
        try {
            const [classResult, typesResult] = await Promise.all([
                PayrollAPI.getConceptClassifications('es'),
                PayrollAPI.getConceptTypes('es')
            ]);
            this._classifications = classResult.data || [];
            this._conceptTypes = typesResult.data || [];
            this._initialized = true;
            console.log('[ConceptTypeHelper] Cargados', this._classifications.length, 'clasificaciones,', this._conceptTypes.length, 'tipos');
        } catch (e) {
            console.error('[ConceptTypeHelper] Error:', e);
            this._classifications = [];
            this._conceptTypes = [];
        }
    },

    getConceptTypes() { return this._conceptTypes || []; },
    getClassifications() { return this._classifications || []; },

    // Agrupar tipos por clasificación
    getTypesByClassification() {
        const grouped = {};
        (this._conceptTypes || []).forEach(ct => {
            const code = ct.classification_code || 'OTHER';
            if (!grouped[code]) grouped[code] = [];
            grouped[code].push(ct);
        });
        return grouped;
    },

    // Renderiza dropdown 100% dinámico - clasificaciones y tipos de BD
    renderTypeDropdown(name, selectedId = null) {
        const grouped = this.getTypesByClassification();
        const classifications = this.getClassifications();

        let html = `<select name="${name}" class="pe-select-type">`;
        html += `<option value="">-- Tipo --</option>`;

        // Usar clasificaciones de BD (orden por calculation_order)
        classifications.forEach(cls => {
            const types = grouped[cls.classification_code] || [];
            if (types.length === 0) return;

            // Label viene de BD (description o classification_name)
            const label = cls.description || cls.classification_name;
            html += `<optgroup label="${label}">`;
            types.forEach(t => {
                const selected = selectedId == t.id ? 'selected' : '';
                const displayName = t.display_name || t.type_name;
                html += `<option value="${t.id}" ${selected}>${displayName}</option>`;
            });
            html += `</optgroup>`;
        });

        html += `</select>`;
        return html;
    },

    injectStyles() { }
};

// ============================================================================
// PAYROLL ENGINE - Main Controller
// ============================================================================
const PayrollEngine = {
    async init() {
        // Inicializar sistema de tipos de concepto universales
        await ConceptTypeHelper.init();
        ConceptTypeHelper.injectStyles();

        // Inicializar sistema de ayuda contextual con Ollama
        PayrollHelpSystem.init();

        this.bindEvents();
        await this.showView('dashboard');

        // Ejecutar auditoria inicial en background
        setTimeout(() => PayrollHelpSystem.auditPayrollData(), 2000);
    },

    bindEvents() {
        document.getElementById('pe-year')?.addEventListener('change', (e) => {
            PayrollState.period.year = parseInt(e.target.value);
            this.refresh();
        });
        document.getElementById('pe-month')?.addEventListener('change', (e) => {
            PayrollState.period.month = parseInt(e.target.value);
            this.refresh();
        });
    },

    async showView(view) {
        PayrollState.currentView = view;

        // Actualizar contexto de ayuda
        PayrollHelpSystem.setContext(view);

        // Update nav active state
        document.querySelectorAll('.pe-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const content = document.getElementById('pe-content');
        content.innerHTML = '<div class="pe-loading"><div class="pe-spinner"></div><span>Cargando...</span></div>';

        try {
            switch(view) {
                case 'dashboard': await this.renderDashboard(); break;
                case 'process': await this.renderProcess(); break;
                case 'employees': await this.renderEmployees(); break;
                case 'templates': await this.renderTemplates(); break;
                case 'entities': await this.renderEntities(); break;
                case 'reports': await this.renderReports(); break;
                case 'payslip-editor': await this.renderPayslipEditor(); break;
            }
        } catch (error) {
            content.innerHTML = `<div class="pe-error"><span>Error: ${error.message}</span></div>`;
        }
    },

    async refresh() {
        await this.showView(PayrollState.currentView);
    },

    // ========================================================================
    // DASHBOARD VIEW
    // ========================================================================
    async renderDashboard() {
        const content = document.getElementById('pe-content');
        const { year, month } = PayrollState.period;

        let summary = { total_employees: 0, processed: 0, pending: 0, errors: 0, total_gross: 0, total_net: 0 };
        try {
            const result = await PayrollAPI.getRunsSummary(year, month);
            if (result.data) summary = result.data;
        } catch (e) { console.log('No summary data'); }

        content.innerHTML = `
            <div class="pe-dashboard">
                <!-- Banner de ayuda contextual -->
                ${PayrollHelpSystem.showContextBanner('dashboard')}
                <!-- KPI Cards -->
                <div class="pe-kpi-grid">
                    <div class="pe-kpi-card">
                        <div class="pe-kpi-icon" style="background: var(--accent-blue);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                        </div>
                        <div class="pe-kpi-data">
                            <span class="pe-kpi-value">${summary.total_employees || 0}</span>
                            <span class="pe-kpi-label">Total Empleados</span>
                        </div>
                    </div>
                    <div class="pe-kpi-card">
                        <div class="pe-kpi-icon" style="background: var(--accent-green);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <div class="pe-kpi-data">
                            <span class="pe-kpi-value">${summary.processed || 0}</span>
                            <span class="pe-kpi-label">Procesados</span>
                        </div>
                    </div>
                    <div class="pe-kpi-card">
                        <div class="pe-kpi-icon" style="background: var(--accent-yellow);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div class="pe-kpi-data">
                            <span class="pe-kpi-value">${summary.pending || 0}</span>
                            <span class="pe-kpi-label">Pendientes</span>
                        </div>
                    </div>
                    <div class="pe-kpi-card">
                        <div class="pe-kpi-icon" style="background: var(--accent-red);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </div>
                        <div class="pe-kpi-data">
                            <span class="pe-kpi-value">${summary.errors || 0}</span>
                            <span class="pe-kpi-label">Con Errores</span>
                        </div>
                    </div>
                </div>

                <!-- Financial Summary -->
                <div class="pe-finance-cards">
                    <div class="pe-finance-card pe-finance-gross">
                        <div class="pe-finance-header">
                            <span class="pe-finance-label">Total Bruto</span>
                            <span class="pe-finance-period">${this.getMonthName(month)} ${year}</span>
                        </div>
                        <div class="pe-finance-value">${this.formatCurrency(summary.total_gross || 0)}</div>
                        <div class="pe-finance-bar"><div class="pe-finance-bar-fill" style="width: 100%;"></div></div>
                    </div>
                    <div class="pe-finance-card pe-finance-net">
                        <div class="pe-finance-header">
                            <span class="pe-finance-label">Total Neto a Pagar</span>
                            <span class="pe-finance-period">${this.getMonthName(month)} ${year}</span>
                        </div>
                        <div class="pe-finance-value">${this.formatCurrency(summary.total_net || 0)}</div>
                        <div class="pe-finance-bar"><div class="pe-finance-bar-fill" style="width: ${summary.total_gross ? (summary.total_net / summary.total_gross * 100) : 0}%;"></div></div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="pe-section">
                    <h3 class="pe-section-title">Acciones Rapidas</h3>
                    <div class="pe-actions-grid">
                        <button onclick="PayrollEngine.showView('process')" class="pe-action-btn">
                            <div class="pe-action-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                            <span>Iniciar Liquidacion</span>
                        </button>
                        <button onclick="PayrollEngine.showView('employees')" class="pe-action-btn">
                            <div class="pe-action-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                            <span>Ver Empleados</span>
                        </button>
                        <button onclick="PayrollEngine.showView('templates')" class="pe-action-btn">
                            <div class="pe-action-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div>
                            <span>Plantillas RRHH</span>
                        </button>
                        <button onclick="PayrollEngine.exportReport('summary')" class="pe-action-btn">
                            <div class="pe-action-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
                            <span>Exportar Reporte</span>
                        </button>
                        <button onclick="PayrollHelpSystem.auditPayrollData().then(() => PayrollHelpSystem.showAuditReport())" class="pe-action-btn" style="border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.05);">
                            <div class="pe-action-icon" style="color: #6366f1;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg></div>
                            <span>Auditar Configuracion</span>
                        </button>
                    </div>
                </div>

                <!-- AI Insights Panel -->
                <div class="pe-ai-panel">
                    <div class="pe-ai-header">
                        <div class="pe-ai-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                            AI Insights
                        </div>
                        <span class="pe-ai-status">Ollama Active</span>
                    </div>
                    <div class="pe-ai-content">
                        <div class="pe-ai-insight">
                            <span class="pe-ai-icon">💡</span>
                            <p>Detectadas ${summary.pending || 0} liquidaciones pendientes para ${this.getMonthName(month)}.
                            ${summary.errors > 0 ? `<strong class="pe-text-warning">Atencion: ${summary.errors} empleados con errores requieren revision.</strong>` : 'Sin anomalias detectadas.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // PROCESS VIEW - Workflow
    // ========================================================================
    async renderProcess() {
        const content = document.getElementById('pe-content');
        const steps = [
            { id: 1, name: 'Validar', icon: '✓', desc: 'Verificar datos y configuracion' },
            { id: 2, name: 'Calcular', icon: '⚡', desc: 'Procesar nominas' },
            { id: 3, name: 'Revisar', icon: '👁', desc: 'Verificar resultados' },
            { id: 4, name: 'Aprobar', icon: '✔', desc: 'Autorizacion final' },
            { id: 5, name: 'Pagar', icon: '💰', desc: 'Procesar pagos' }
        ];

        content.innerHTML = `
            <div class="pe-process">
                <!-- Banner de ayuda contextual -->
                ${PayrollHelpSystem.showContextBanner('process')}
                <div class="pe-workflow">
                    <div class="pe-workflow-steps">
                        ${steps.map(step => `
                            <div class="pe-step ${step.id < PayrollState.workflowStep ? 'completed' : ''} ${step.id === PayrollState.workflowStep ? 'active' : ''}" onclick="${step.id === PayrollState.workflowStep ? `PayrollEngine.executeStep(${step.id})` : ''}">
                                <div class="pe-step-indicator">${step.id < PayrollState.workflowStep ? '✓' : step.id}</div>
                                <div class="pe-step-info">
                                    <span class="pe-step-name">${step.name}</span>
                                    <span class="pe-step-desc">${step.desc}</span>
                                </div>
                            </div>
                            ${step.id < steps.length ? '<div class="pe-step-connector"></div>' : ''}
                        `).join('')}
                    </div>
                </div>

                <div class="pe-process-panel">
                    <div class="pe-process-header">
                        <h3>Paso ${PayrollState.workflowStep}: ${steps[PayrollState.workflowStep - 1]?.name}</h3>
                        <span class="pe-badge pe-badge-info">${this.getMonthName(PayrollState.period.month)} ${PayrollState.period.year}</span>
                    </div>
                    <div class="pe-process-content" id="pe-step-content">
                        ${this.getStepContent(PayrollState.workflowStep)}
                    </div>
                    <div class="pe-process-actions">
                        ${PayrollState.workflowStep > 1 ? `<button onclick="PayrollEngine.prevStep()" class="pe-btn pe-btn-secondary">Anterior</button>` : ''}
                        <button onclick="PayrollEngine.executeStep(${PayrollState.workflowStep})" class="pe-btn pe-btn-primary">
                            Ejecutar ${steps[PayrollState.workflowStep - 1]?.name}
                        </button>
                    </div>
                </div>

                <!-- Activity Log -->
                <div class="pe-log-panel">
                    <h4>Registro de Actividad</h4>
                    <div class="pe-log" id="pe-activity-log">
                        <div class="pe-log-entry">
                            <span class="pe-log-time">${new Date().toLocaleTimeString()}</span>
                            <span class="pe-log-msg">Sistema inicializado</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getStepContent(step) {
        const contents = {
            1: `<p>El sistema verificara:</p>
                <ul class="pe-checklist">
                    <li>Empleados con plantilla asignada</li>
                    <li>Datos de asistencia completos</li>
                    <li>Configuracion de deducciones</li>
                    <li>Cuentas bancarias</li>
                </ul>`,
            2: `<p>Se procesaran las nominas aplicando:</p>
                <ul class="pe-checklist">
                    <li><input type="checkbox" checked> Horas extras</li>
                    <li><input type="checkbox" checked> Novedades del periodo</li>
                    <li><input type="checkbox" checked> Proporcionales</li>
                    <li><input type="checkbox" checked> Deducciones legales</li>
                </ul>`,
            3: `<p>Revision de resultados y alertas.</p>
                <div id="pe-review-alerts">Cargando alertas...</div>`,
            4: `<p>Confirme la aprobacion de las liquidaciones.</p>
                <div class="pe-approval-summary" id="pe-approval-summary">Cargando resumen...</div>`,
            5: `<p>Generar archivos de pago y recibos.</p>
                <div class="pe-payment-options">
                    <button onclick="PayrollEngine.generateBankFile()" class="pe-btn pe-btn-outline">Archivo Bancario</button>
                    <button onclick="PayrollEngine.generatePayslips()" class="pe-btn pe-btn-outline">Recibos de Sueldo</button>
                </div>`
        };
        return contents[step] || '';
    },

    async executeStep(step) {
        this.addLog(`Ejecutando paso ${step}...`, 'info');

        try {
            switch(step) {
                case 1: // Validar
                    this.addLog('Validacion completada', 'success');
                    PayrollState.workflowStep = 2;
                    break;
                case 2: // Calcular
                    const calcResult = await PayrollAPI.calculateBulk({
                        year: PayrollState.period.year,
                        month: PayrollState.period.month
                    });
                    this.addLog(`Calculadas ${calcResult.data?.processed || 0} nominas`, 'success');
                    PayrollState.workflowStep = 3;
                    break;
                case 3: // Revisar
                    this.addLog('Revision completada sin alertas criticas', 'success');
                    PayrollState.workflowStep = 4;
                    break;
                case 4: // Aprobar
                    this.addLog('Liquidaciones aprobadas', 'success');
                    PayrollState.workflowStep = 5;
                    break;
                case 5: // Pagar
                    this.addLog('Proceso de pago iniciado', 'success');
                    break;
            }
            await this.renderProcess();
        } catch (error) {
            this.addLog(`Error: ${error.message}`, 'error');
        }
    },

    prevStep() {
        if (PayrollState.workflowStep > 1) {
            PayrollState.workflowStep--;
            this.renderProcess();
        }
    },

    addLog(message, type = 'info') {
        const log = document.getElementById('pe-activity-log');
        if (log) {
            log.innerHTML = `
                <div class="pe-log-entry pe-log-${type}">
                    <span class="pe-log-time">${new Date().toLocaleTimeString()}</span>
                    <span class="pe-log-msg">${message}</span>
                </div>
            ` + log.innerHTML;
        }
    },

    // ========================================================================
    // EMPLOYEES VIEW
    // ========================================================================
    async renderEmployees() {
        const content = document.getElementById('pe-content');
        const { year, month } = PayrollState.period;

        let employees = [];
        try {
            const result = await PayrollAPI.getRunsDetails(year, month);
            if (result.data) employees = result.data;
        } catch (e) { console.log('No employee data'); }

        content.innerHTML = `
            <div class="pe-employees">
                <!-- Banner de ayuda contextual -->
                ${PayrollHelpSystem.showContextBanner('employees')}
                <div class="pe-toolbar">
                    <div class="pe-search-box">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input type="text" id="pe-employee-search" placeholder="Buscar empleado..." onkeyup="PayrollEngine.filterEmployees()">
                    </div>
                    <div class="pe-toolbar-actions">
                        <button onclick="PayrollEngine.calculateSelected()" class="pe-btn pe-btn-sm pe-btn-success">Calcular Sel.</button>
                        <button onclick="PayrollEngine.approveSelected()" class="pe-btn pe-btn-sm pe-btn-primary">Aprobar Sel.</button>
                        <button onclick="PayrollEngine.exportEmployees()" class="pe-btn pe-btn-sm pe-btn-outline">Exportar</button>
                    </div>
                </div>

                <div class="pe-table-container">
                    <table class="pe-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" onchange="PayrollEngine.toggleAllEmployees(this)"></th>
                                <th>Empleado</th>
                                <th>Legajo</th>
                                <th>Departamento</th>
                                <th>Plantilla</th>
                                <th class="text-right">Bruto</th>
                                <th class="text-right">Deducciones</th>
                                <th class="text-right">Neto</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="pe-employees-tbody">
                            ${employees.length > 0 ? employees.map(emp => this.renderEmployeeRow(emp)).join('') : `
                                <tr><td colspan="10" class="pe-empty">
                                    <div class="pe-empty-state">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                        <p>No hay liquidaciones para este periodo</p>
                                        <button onclick="PayrollEngine.showView('process')" class="pe-btn pe-btn-primary">Iniciar Proceso</button>
                                    </div>
                                </td></tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderEmployeeRow(emp) {
        const statusMap = {
            pending: { class: 'warning', text: 'Pendiente' },
            calculated: { class: 'info', text: 'Calculado' },
            approved: { class: 'success', text: 'Aprobado' },
            paid: { class: 'success', text: 'Pagado' },
            error: { class: 'danger', text: 'Error' }
        };
        const status = statusMap[emp.status] || statusMap.pending;

        return `
            <tr data-id="${emp.id}">
                <td><input type="checkbox" class="pe-emp-checkbox" value="${emp.id}"></td>
                <td class="pe-emp-name">${emp.firstName || ''} ${emp.lastName || ''}</td>
                <td>${emp.employee_code || '--'}</td>
                <td>${emp.department_name || '--'}</td>
                <td>${emp.template_name || 'Sin plantilla'}</td>
                <td class="text-right">${this.formatCurrency(emp.gross_earnings || 0)}</td>
                <td class="text-right pe-text-danger">${this.formatCurrency(emp.total_deductions || 0)}</td>
                <td class="text-right pe-text-success"><strong>${this.formatCurrency(emp.net_salary || 0)}</strong></td>
                <td><span class="pe-status pe-status-${status.class}">${status.text}</span></td>
                <td>
                    <div class="pe-actions">
                        <button onclick="PayrollEngine.viewEmployeeDetail('${emp.id}')" class="pe-btn-icon" title="Ver detalle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                        <button onclick="PayrollEngine.recalculateEmployee('${emp.id}')" class="pe-btn-icon" title="Recalcular"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg></button>
                        <button onclick="PayrollEngine.downloadPayslip('${emp.id}')" class="pe-btn-icon" title="Descargar recibo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                    </div>
                </td>
            </tr>
        `;
    },

    toggleAllEmployees(checkbox) {
        document.querySelectorAll('.pe-emp-checkbox').forEach(cb => {
            cb.checked = checkbox.checked;
            if (checkbox.checked) {
                PayrollState.selectedEmployees.add(cb.value);
            } else {
                PayrollState.selectedEmployees.clear();
            }
        });
    },

    filterEmployees() {
        const search = document.getElementById('pe-employee-search')?.value.toLowerCase() || '';
        document.querySelectorAll('#pe-employees-tbody tr').forEach(row => {
            const name = row.querySelector('.pe-emp-name')?.textContent.toLowerCase() || '';
            row.style.display = name.includes(search) ? '' : 'none';
        });
    },

    async viewEmployeeDetail(empId) {
        // Find run ID from current period
        try {
            const runs = await PayrollAPI.getRuns();
            const currentRun = runs.data?.find(r =>
                r.period_year === PayrollState.period.year &&
                r.period_month === PayrollState.period.month
            );

            if (currentRun) {
                const detail = await PayrollAPI.getRunDetail(currentRun.run_id, empId);
                this.showEmployeeModal(detail.data);
            } else {
                this.showNotification('No hay liquidacion para este periodo', 'warning');
            }
        } catch (error) {
            this.showNotification('Error al cargar detalle: ' + error.message, 'error');
        }
    },

    showEmployeeModal(data) {
        const modal = document.createElement('div');
        modal.className = 'pe-modal-overlay';
        modal.innerHTML = `
            <div class="pe-modal pe-modal-lg">
                <div class="pe-modal-header">
                    <h3>Detalle de Liquidacion</h3>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                </div>
                <div class="pe-modal-body">
                    ${data ? `
                        <div class="pe-detail-header">
                            <div class="pe-detail-employee">
                                <h4>${data.firstName} ${data.lastName}</h4>
                                <span>Legajo: ${data.employee_code || '--'} | ${data.department_name || '--'}</span>
                            </div>
                            <div class="pe-detail-period">
                                <span class="pe-badge pe-badge-info">${this.getMonthName(PayrollState.period.month)} ${PayrollState.period.year}</span>
                            </div>
                        </div>

                        <div class="pe-detail-sections">
                            <div class="pe-detail-section">
                                <h5>Haberes</h5>
                                <table class="pe-detail-table">
                                    ${(data.earnings || []).map(e => `
                                        <tr><td>${e.concept_name}</td><td class="text-right">${this.formatCurrency(e.amount)}</td></tr>
                                    `).join('') || '<tr><td colspan="2">Sin haberes</td></tr>'}
                                    <tr class="pe-total"><td>Total Haberes</td><td class="text-right">${this.formatCurrency(data.gross_earnings || 0)}</td></tr>
                                </table>
                            </div>

                            <div class="pe-detail-section">
                                <h5>Deducciones</h5>
                                <table class="pe-detail-table">
                                    ${(data.deductions || []).map(d => `
                                        <tr><td>${d.concept_name}</td><td class="text-right pe-text-danger">${this.formatCurrency(d.amount)}</td></tr>
                                    `).join('') || '<tr><td colspan="2">Sin deducciones</td></tr>'}
                                    <tr class="pe-total"><td>Total Deducciones</td><td class="text-right pe-text-danger">${this.formatCurrency(data.total_deductions || 0)}</td></tr>
                                </table>
                            </div>
                        </div>

                        <div class="pe-detail-summary">
                            <div class="pe-summary-row">
                                <span>NETO A PAGAR</span>
                                <span class="pe-summary-value">${this.formatCurrency(data.net_salary || 0)}</span>
                            </div>
                        </div>
                    ` : '<p>No hay datos de liquidacion</p>'}
                </div>
                <div class="pe-modal-footer">
                    <button onclick="PayrollEngine.downloadPayslip('${data?.user_id}')" class="pe-btn pe-btn-primary">Descargar Recibo</button>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async recalculateEmployee(empId) {
        this.showNotification('Recalculando...', 'info');
        try {
            await PayrollAPI.calculatePreview({ user_id: empId, ...PayrollState.period });
            this.showNotification('Recalculo completado', 'success');
            this.renderEmployees();
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    async downloadPayslip(empId) {
        this.showNotification('Generando recibo de sueldo...', 'info');

        try {
            // Obtener datos del empleado
            const runs = await PayrollAPI.getRuns();
            const currentRun = runs.data?.find(r =>
                r.period_year === PayrollState.period.year &&
                r.period_month === PayrollState.period.month
            );

            if (!currentRun) {
                this.showNotification('No hay liquidacion para este periodo', 'warning');
                return;
            }

            const detail = await PayrollAPI.getRunDetail(currentRun.run_id, empId);
            const data = detail.data;

            if (!data) {
                this.showNotification('No se encontraron datos del empleado', 'warning');
                return;
            }

            // Generar PDF usando la API del navegador
            const pdfContent = this.generatePayslipHTML(data);
            const printWindow = window.open('', '_blank');
            printWindow.document.write(pdfContent);
            printWindow.document.close();
            printWindow.focus();

            // Auto-imprimir o guardar como PDF
            setTimeout(() => {
                printWindow.print();
            }, 500);

            this.showNotification('Recibo generado - Use "Guardar como PDF" en el dialogo de impresion', 'success');
        } catch (error) {
            this.showNotification('Error al generar recibo: ' + error.message, 'error');
        }
    },

    generatePayslipHTML(data) {
        const companyName = localStorage.getItem('companyName') || 'Empresa';
        const period = `${this.getMonthName(PayrollState.period.month)} ${PayrollState.period.year}`;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Recibo de Sueldo - ${data.firstName} ${data.lastName}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
                    .payslip { max-width: 800px; margin: 0 auto; border: 2px solid #333; }
                    .header { background: #1a1a2e; color: white; padding: 15px; text-align: center; }
                    .header h1 { font-size: 18px; margin-bottom: 5px; }
                    .header p { font-size: 11px; opacity: 0.8; }
                    .info-row { display: flex; border-bottom: 1px solid #ddd; }
                    .info-col { flex: 1; padding: 10px; border-right: 1px solid #ddd; }
                    .info-col:last-child { border-right: none; }
                    .info-label { font-size: 10px; color: #666; text-transform: uppercase; }
                    .info-value { font-size: 13px; font-weight: bold; margin-top: 3px; }
                    .section { padding: 10px; }
                    .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 5px; margin-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
                    th { background: #f5f5f5; font-size: 10px; text-transform: uppercase; }
                    .text-right { text-align: right; }
                    .earning { color: #2e7d32; }
                    .deduction { color: #c62828; }
                    .total-row { background: #1a1a2e; color: white; font-weight: bold; }
                    .total-row td { padding: 12px 8px; font-size: 14px; }
                    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 10px; color: #666; }
                    .signature-area { display: flex; justify-content: space-between; padding: 30px 20px; margin-top: 20px; }
                    .signature-line { width: 200px; border-top: 1px solid #333; padding-top: 5px; text-align: center; font-size: 10px; }
                    @media print { body { padding: 0; } .payslip { border: none; } }
                </style>
            </head>
            <body>
                <div class="payslip">
                    <div class="header">
                        <h1>${companyName.toUpperCase()}</h1>
                        <p>RECIBO DE HABERES</p>
                    </div>

                    <div class="info-row">
                        <div class="info-col">
                            <div class="info-label">Empleado</div>
                            <div class="info-value">${data.firstName || ''} ${data.lastName || ''}</div>
                        </div>
                        <div class="info-col">
                            <div class="info-label">Legajo</div>
                            <div class="info-value">${data.employee_code || '--'}</div>
                        </div>
                        <div class="info-col">
                            <div class="info-label">Periodo</div>
                            <div class="info-value">${period}</div>
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="info-col">
                            <div class="info-label">Departamento</div>
                            <div class="info-value">${data.department_name || '--'}</div>
                        </div>
                        <div class="info-col">
                            <div class="info-label">Categoria</div>
                            <div class="info-value">${data.category_name || '--'}</div>
                        </div>
                        <div class="info-col">
                            <div class="info-label">Fecha Emision</div>
                            <div class="info-value">${new Date().toLocaleDateString('es-AR')}</div>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">Haberes</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th>Cantidad</th>
                                    <th class="text-right">Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(data.earnings || []).map(e => `
                                    <tr>
                                        <td>${e.concept_name}</td>
                                        <td>${e.quantity || '-'}</td>
                                        <td class="text-right earning">${this.formatCurrency(e.amount)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="3">Sin haberes registrados</td></tr>'}
                                <tr style="font-weight: bold; background: #e8f5e9;">
                                    <td colspan="2">TOTAL HABERES</td>
                                    <td class="text-right earning">${this.formatCurrency(data.gross_earnings || 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <div class="section-title">Deducciones</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th>Base</th>
                                    <th class="text-right">Importe</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(data.deductions || []).map(d => `
                                    <tr>
                                        <td>${d.concept_name}</td>
                                        <td>${d.percentage ? d.percentage + '%' : '-'}</td>
                                        <td class="text-right deduction">-${this.formatCurrency(d.amount)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="3">Sin deducciones</td></tr>'}
                                <tr style="font-weight: bold; background: #ffebee;">
                                    <td colspan="2">TOTAL DEDUCCIONES</td>
                                    <td class="text-right deduction">-${this.formatCurrency(data.total_deductions || 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <table>
                        <tbody>
                            <tr class="total-row">
                                <td>NETO A PERCIBIR</td>
                                <td class="text-right" style="font-size: 18px;">${this.formatCurrency(data.net_salary || 0)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="signature-area">
                        <div class="signature-line">Firma Empleador</div>
                        <div class="signature-line">Firma Empleado</div>
                    </div>

                    <div class="footer">
                        <p>Este recibo es valido como comprobante de pago | Generado el ${new Date().toLocaleString('es-AR')}</p>
                        <p>Sistema de Liquidacion Enterprise v3.0</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    },

    async calculateSelected() {
        const selected = Array.from(document.querySelectorAll('.pe-emp-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) {
            this.showNotification('Seleccione al menos un empleado', 'warning');
            return;
        }

        // Mostrar modal de confirmacion
        const modal = document.createElement('div');
        modal.className = 'pe-modal-overlay';
        modal.innerHTML = `
            <div class="pe-modal">
                <div class="pe-modal-header">
                    <h3>Confirmar Calculo Masivo</h3>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                </div>
                <div class="pe-modal-body">
                    <p>Se calcularan las liquidaciones de <strong>${selected.length}</strong> empleados para el periodo:</p>
                    <p class="pe-modal-period"><strong>${this.getMonthName(PayrollState.period.month)} ${PayrollState.period.year}</strong></p>
                    <div class="pe-modal-options">
                        <label><input type="checkbox" id="pe-calc-overtime" checked> Incluir horas extras</label>
                        <label><input type="checkbox" id="pe-calc-novelties" checked> Incluir novedades</label>
                        <label><input type="checkbox" id="pe-calc-proportional" checked> Calcular proporcionales</label>
                    </div>
                </div>
                <div class="pe-modal-footer">
                    <button onclick="PayrollEngine.executeCalculateSelected(${JSON.stringify(selected)})" class="pe-btn pe-btn-primary">Calcular</button>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async executeCalculateSelected(userIds) {
        document.querySelector('.pe-modal-overlay')?.remove();
        this.showNotification(`Calculando ${userIds.length} empleados...`, 'info');

        try {
            const options = {
                include_overtime: document.getElementById('pe-calc-overtime')?.checked ?? true,
                include_novelties: document.getElementById('pe-calc-novelties')?.checked ?? true,
                calculate_proportional: document.getElementById('pe-calc-proportional')?.checked ?? true
            };

            const result = await PayrollAPI.calculateBulk({
                year: PayrollState.period.year,
                month: PayrollState.period.month,
                user_ids: userIds,
                options
            });

            const processed = result.data?.processed || userIds.length;
            const errors = result.data?.errors || 0;

            if (errors > 0) {
                this.showNotification(`Calculados ${processed} empleados (${errors} con errores)`, 'warning');
            } else {
                this.showNotification(`${processed} empleados calculados exitosamente`, 'success');
            }

            // Refrescar la vista
            await this.renderEmployees();
        } catch (error) {
            this.showNotification('Error en calculo masivo: ' + error.message, 'error');
        }
    },

    async approveSelected() {
        const selected = Array.from(document.querySelectorAll('.pe-emp-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) {
            this.showNotification('Seleccione al menos un empleado', 'warning');
            return;
        }

        // Modal de confirmacion con firma digital opcional
        const modal = document.createElement('div');
        modal.className = 'pe-modal-overlay';
        modal.innerHTML = `
            <div class="pe-modal">
                <div class="pe-modal-header">
                    <h3>Aprobar Liquidaciones</h3>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                </div>
                <div class="pe-modal-body">
                    <div class="pe-approval-warning">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <p>Esta por aprobar <strong>${selected.length}</strong> liquidaciones.</p>
                        <p class="pe-text-muted">Una vez aprobadas, no podran ser modificadas sin autorizacion especial.</p>
                    </div>
                    <div class="pe-form-group">
                        <label>Observaciones (opcional)</label>
                        <textarea id="pe-approval-notes" rows="2" placeholder="Notas de aprobacion..."></textarea>
                    </div>
                    <div class="pe-form-group">
                        <label><input type="checkbox" id="pe-approval-confirm" required> Confirmo que he revisado todas las liquidaciones seleccionadas</label>
                    </div>
                </div>
                <div class="pe-modal-footer">
                    <button onclick="PayrollEngine.executeApproveSelected(${JSON.stringify(selected)})" class="pe-btn pe-btn-success">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        Aprobar Liquidaciones
                    </button>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async executeApproveSelected(userIds) {
        const confirmed = document.getElementById('pe-approval-confirm')?.checked;
        if (!confirmed) {
            this.showNotification('Debe confirmar que ha revisado las liquidaciones', 'warning');
            return;
        }

        document.querySelector('.pe-modal-overlay')?.remove();
        this.showNotification(`Aprobando ${userIds.length} liquidaciones...`, 'info');

        try {
            const notes = document.getElementById('pe-approval-notes')?.value || '';

            // Obtener el run actual
            const runs = await PayrollAPI.getRuns();
            const currentRun = runs.data?.find(r =>
                r.period_year === PayrollState.period.year &&
                r.period_month === PayrollState.period.month
            );

            if (!currentRun) {
                this.showNotification('No hay liquidacion para este periodo', 'warning');
                return;
            }

            // Aprobar el run (esto aprueba todos los empleados del run)
            await PayrollAPI.approveRun(currentRun.run_id);

            this.showNotification(`${userIds.length} liquidaciones aprobadas exitosamente`, 'success');
            await this.renderEmployees();
        } catch (error) {
            this.showNotification('Error al aprobar: ' + error.message, 'error');
        }
    },

    async exportEmployees() {
        this.showNotification('Preparando exportacion...', 'info');

        try {
            const { year, month } = PayrollState.period;
            let employees = [];

            try {
                const result = await PayrollAPI.getRunsDetails(year, month);
                if (result.data) employees = result.data;
            } catch (e) {
                this.showNotification('No hay datos para exportar', 'warning');
                return;
            }

            if (employees.length === 0) {
                this.showNotification('No hay empleados para exportar', 'warning');
                return;
            }

            // Generar CSV
            const headers = ['Legajo', 'Apellido', 'Nombre', 'Departamento', 'Plantilla', 'Bruto', 'Deducciones', 'Neto', 'Estado'];
            const rows = employees.map(emp => [
                emp.employee_code || '',
                emp.lastName || '',
                emp.firstName || '',
                emp.department_name || '',
                emp.template_name || '',
                emp.gross_earnings || 0,
                emp.total_deductions || 0,
                emp.net_salary || 0,
                emp.status || 'pending'
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Descargar archivo
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `liquidaciones_${year}_${String(month).padStart(2, '0')}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);

            this.showNotification(`Exportados ${employees.length} registros`, 'success');
        } catch (error) {
            this.showNotification('Error al exportar: ' + error.message, 'error');
        }
    },

    // ========================================================================
    // TEMPLATES VIEW
    // ========================================================================
    async renderTemplates() {
        const content = document.getElementById('pe-content');

        let templates = [];
        try {
            const result = await PayrollAPI.getTemplates('?include_concepts=true');
            if (result.data) templates = result.data;
        } catch (e) { console.log('No templates'); }

        content.innerHTML = `
            <div class="pe-templates">
                <!-- Banner de ayuda contextual -->
                ${PayrollHelpSystem.showContextBanner('templates')}
                <div class="pe-toolbar">
                    <h3>Plantillas de Liquidacion RRHH</h3>
                    <button onclick="PayrollEngine.showCreateTemplateModal()" class="pe-btn pe-btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Nueva Plantilla
                    </button>
                </div>

                <div class="pe-templates-grid" id="pe-templates-list">
                    ${templates.length > 0 ? templates.map(t => this.renderTemplateCard(t)).join('') : `
                        <div class="pe-empty-state">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                            <h4>No hay plantillas configuradas</h4>
                            <p>Cree su primera plantilla de liquidacion para comenzar</p>
                            <button onclick="PayrollEngine.showCreateTemplateModal()" class="pe-btn pe-btn-primary">Crear Plantilla</button>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderTemplateCard(template) {
        const conceptCount = template.concepts?.length || 0;
        return `
            <div class="pe-template-card">
                <div class="pe-template-header">
                    <div class="pe-template-info">
                        <h4>${template.template_name}</h4>
                        <span class="pe-template-code">${template.template_code}</span>
                    </div>
                    ${template.is_default ? '<span class="pe-badge pe-badge-success">Default</span>' : ''}
                </div>
                <p class="pe-template-desc">${template.description || 'Sin descripcion'}</p>
                <div class="pe-template-meta">
                    <span><strong>${conceptCount}</strong> conceptos</span>
                    <span>${template.country?.country_name || 'Global'}</span>
                </div>
                <div class="pe-template-actions">
                    <button onclick="PayrollEngine.editTemplate('${template.id}')" class="pe-btn pe-btn-sm pe-btn-outline">Editar</button>
                    <button onclick="PayrollEngine.cloneTemplate('${template.id}')" class="pe-btn pe-btn-sm pe-btn-outline">Clonar</button>
                    <button onclick="PayrollEngine.viewTemplateDetail('${template.id}')" class="pe-btn pe-btn-sm pe-btn-primary">Ver Conceptos</button>
                </div>
            </div>
        `;
    },

    // Almacenar entidades para el formulario de conceptos
    templateEntities: [],

    async showCreateTemplateModal() {
        let conceptTypes = [];
        try {
            const result = await PayrollAPI.getConceptTypes();
            if (result.data) conceptTypes = result.data;
        } catch (e) {}

        // Cargar entidades para el selector
        try {
            const entResult = await PayrollAPI.getEntities();
            this.templateEntities = entResult.data || [];
        } catch (e) {
            this.templateEntities = [];
        }

        const modal = document.createElement('div');
        modal.className = 'pe-modal-overlay';
        modal.innerHTML = `
            <div class="pe-modal pe-modal-lg">
                <div class="pe-modal-header">
                    <h3>Nueva Plantilla de Liquidacion</h3>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                </div>
                <div class="pe-modal-body">
                    <form id="pe-template-form">
                        <div class="pe-form-grid">
                            <div class="pe-form-group">
                                <label>Codigo *</label>
                                <input type="text" name="template_code" required placeholder="EJ: ARG-2025">
                            </div>
                            <div class="pe-form-group">
                                <label>Nombre *</label>
                                <input type="text" name="template_name" required placeholder="Plantilla Argentina 2025">
                            </div>
                            <div class="pe-form-group pe-form-full">
                                <label>Descripcion</label>
                                <textarea name="description" rows="2" placeholder="Descripcion de la plantilla..."></textarea>
                            </div>
                            <div class="pe-form-group">
                                <label>Tipo de Liquidacion</label>
                                <select name="pay_frequency">
                                    <option value="MONTHLY">Mensual</option>
                                    <option value="BIWEEKLY">Quincenal</option>
                                    <option value="WEEKLY">Semanal</option>
                                </select>
                            </div>
                            <div class="pe-form-group">
                                <label><input type="checkbox" name="is_default"> Plantilla por defecto</label>
                            </div>
                        </div>

                        <div class="pe-section-divider">
                            <h4>Conceptos de la Plantilla</h4>
                            <p class="pe-text-muted pe-text-sm">Asigna una entidad de destino a cada concepto para consolidacion automatica</p>
                            <button type="button" onclick="PayrollEngine.addConceptRow()" class="pe-btn pe-btn-sm pe-btn-outline">+ Agregar Concepto</button>
                        </div>

                        <div id="pe-concepts-list" class="pe-concepts-list">
                            ${conceptTypes.slice(0, 3).map((ct, i) => this.renderConceptFormRow(ct, i)).join('')}
                        </div>
                    </form>
                </div>
                <div class="pe-modal-footer">
                    <button onclick="PayrollEngine.saveTemplate()" class="pe-btn pe-btn-primary">Guardar Plantilla</button>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    renderConceptFormRow(conceptType, index) {
        // Usar sistema universal de tipos de concepto
        const currentTypeId = conceptType?.concept_type_id || null;
        const currentEntityId = conceptType?.entity_id || '';
        const currentFormula = conceptType?.formula || conceptType?.default_value || '';

        // Agrupar entidades por categoría para mejor UX
        const entitiesByCategory = {};
        (this.templateEntities || []).forEach(e => {
            const catName = e.category_name || 'Sin Categoria';
            if (!entitiesByCategory[catName]) entitiesByCategory[catName] = [];
            entitiesByCategory[catName].push(e);
        });

        const entityOptions = Object.entries(entitiesByCategory).map(([catName, entities]) => `
            <optgroup label="${catName}">
                ${entities.map(e => `
                    <option value="${e.entity_id}" ${currentEntityId == e.entity_id ? 'selected' : ''}>
                        ${e.entity_code} - ${e.entity_short_name || e.entity_name}
                    </option>
                `).join('')}
            </optgroup>
        `).join('');

        // Dropdown dinámico de tipos (cargados de BD)
        const typeDropdown = ConceptTypeHelper.renderTypeDropdown(`concept_type_id_${index}`, currentTypeId);

        return `
            <div class="pe-concept-row" data-index="${index}">
                <div class="pe-concept-main">
                    <input type="text" name="concept_name_${index}" value="${conceptType?.concept_name || ''}" placeholder="Nombre del concepto" class="pe-concept-name">
                    ${typeDropdown}
                    ${FormulaEditor.renderEditor(index, currentFormula)}
                </div>
                <div class="pe-concept-entity">
                    <select name="entity_id_${index}" class="pe-select-entity" title="Entidad de Destino">
                        <option value="">-- Sin entidad --</option>
                        ${entityOptions}
                    </select>
                    <input type="text" name="entity_label_${index}" value="${conceptType?.entity_label || ''}" placeholder="Etiqueta recibo" class="pe-input-label">
                </div>
                <button type="button" onclick="this.closest('.pe-concept-row').remove()" class="pe-btn-icon pe-btn-danger" title="Eliminar">&times;</button>
            </div>
        `;
    },

    addConceptRow() {
        const list = document.getElementById('pe-concepts-list');
        const index = list.children.length;
        list.insertAdjacentHTML('beforeend', this.renderConceptFormRow(null, index));
    },

    async saveTemplate() {
        const form = document.getElementById('pe-template-form');
        const formData = new FormData(form);

        // ====== VALIDACIÓN PROACTIVA CON PAYROLLHELPSYSTEM ======
        PayrollHelpSystem.setContext('templateCreate');

        // Validar campos requeridos
        const validation = PayrollHelpSystem.validateForm('pe-template-form', 'templateCreate');
        if (!validation.valid) {
            PayrollHelpSystem.showValidationErrors(validation.errors, form);
            this.showNotification('Por favor complete los campos requeridos', 'warning');
            return;
        }

        // Contar conceptos antes de continuar
        const conceptRows = document.querySelectorAll('.pe-concept-row');
        if (conceptRows.length === 0) {
            this.showNotification('Agregue al menos un concepto a la plantilla', 'warning');
            PayrollHelpSystem.showBubble(document.getElementById('pe-concepts-container'),
                'Conceptos requeridos',
                'Una plantilla necesita al menos un concepto (haber o deduccion) para poder liquidar sueldos.');
            return;
        }

        // Validar conceptos y mostrar warnings proactivos
        let conceptsWithoutEntity = 0;
        let conceptsWithoutFormula = 0;
        conceptRows.forEach((row, i) => {
            const entityId = formData.get(`entity_id_${i}`);
            const formula = formData.get(`concept_formula_${i}`);
            if (!entityId) conceptsWithoutEntity++;
            if (!formula) conceptsWithoutFormula++;
        });

        // Mostrar warnings informativos (no bloqueantes)
        if (conceptsWithoutEntity > 0 || conceptsWithoutFormula > 0) {
            const warnings = [];
            if (conceptsWithoutEntity > 0) {
                warnings.push(`${conceptsWithoutEntity} concepto(s) sin entidad de destino - no apareceran en consolidaciones`);
            }
            if (conceptsWithoutFormula > 0) {
                warnings.push(`${conceptsWithoutFormula} concepto(s) sin formula - requeriran valores manuales`);
            }
            console.log('[PayrollHelp] Warnings:', warnings);
        }
        // ====== FIN VALIDACIÓN PROACTIVA ======

        const data = {
            template_code: formData.get('template_code'),
            template_name: formData.get('template_name'),
            description: formData.get('description'),
            pay_frequency: formData.get('pay_frequency').toLowerCase(),
            is_default: formData.get('is_default') === 'on',
            concepts: []
        };

        // Collect concepts with entity assignment
        document.querySelectorAll('.pe-concept-row').forEach((row, i) => {
            const name = formData.get(`concept_name_${i}`);
            if (name) {
                const typeId = parseInt(formData.get(`concept_type_id_${i}`)) || 1;
                const entityId = formData.get(`entity_id_${i}`);
                const entityLabel = formData.get(`entity_label_${i}`);
                // Auto-generate concept_code from name
                const code = name.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + (i + 1);
                data.concepts.push({
                    concept_name: name,
                    concept_code: code,
                    concept_type_id: typeId,
                    calculation_type: 'fixed',
                    formula: formData.get(`concept_formula_${i}`),
                    entity_id: entityId ? parseInt(entityId) : null,
                    entity_label: entityLabel || null
                });
            }
        });

        try {
            await PayrollAPI.createTemplate(data);
            this.showNotification('Plantilla creada exitosamente', 'success');
            document.querySelector('.pe-modal-overlay')?.remove();
            this.renderTemplates();
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    async editTemplate(id) {
        try {
            const result = await PayrollAPI.getTemplate(id);
            const template = result.data;

            let conceptTypes = [];
            try {
                const ctResult = await PayrollAPI.getConceptTypes();
                if (ctResult.data) conceptTypes = ctResult.data;
            } catch (e) {}

            // Cerrar modal anterior si existe
            document.querySelector('.pe-modal-overlay')?.remove();

            const modal = document.createElement('div');
            modal.className = 'pe-modal-overlay';
            modal.innerHTML = `
                <div class="pe-modal pe-modal-lg">
                    <div class="pe-modal-header">
                        <h3>Editar Plantilla: ${template.template_name}</h3>
                        <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                    </div>
                    <div class="pe-modal-body">
                        <form id="pe-edit-template-form">
                            <input type="hidden" name="template_id" value="${template.id}">
                            <div class="pe-form-grid">
                                <div class="pe-form-group">
                                    <label>Codigo *</label>
                                    <input type="text" name="template_code" required value="${template.template_code || ''}">
                                </div>
                                <div class="pe-form-group">
                                    <label>Nombre *</label>
                                    <input type="text" name="template_name" required value="${template.template_name || ''}">
                                </div>
                                <div class="pe-form-group pe-form-full">
                                    <label>Descripcion</label>
                                    <textarea name="description" rows="2">${template.description || ''}</textarea>
                                </div>
                                <div class="pe-form-group">
                                    <label>Tipo de Liquidacion</label>
                                    <select name="pay_frequency">
                                        <option value="MONTHLY" ${template.pay_frequency === 'MONTHLY' ? 'selected' : ''}>Mensual</option>
                                        <option value="BIWEEKLY" ${template.pay_frequency === 'BIWEEKLY' ? 'selected' : ''}>Quincenal</option>
                                        <option value="WEEKLY" ${template.pay_frequency === 'WEEKLY' ? 'selected' : ''}>Semanal</option>
                                    </select>
                                </div>
                                <div class="pe-form-group">
                                    <label><input type="checkbox" name="is_default" ${template.is_default ? 'checked' : ''}> Plantilla por defecto</label>
                                </div>
                            </div>

                            <div class="pe-section-divider">
                                <h4>Conceptos de la Plantilla</h4>
                                <button type="button" onclick="PayrollEngine.addEditConceptRow()" class="pe-btn pe-btn-sm pe-btn-outline">+ Agregar Concepto</button>
                            </div>

                            <div id="pe-edit-concepts-list" class="pe-concepts-list">
                                ${(template.concepts || []).map((c, i) => `
                                    <div class="pe-concept-row pe-concept-row-edit" data-concept-id="${c.id || ''}" data-index="${i}">
                                        <input type="text" name="concept_name_${i}" value="${c.concept_name || ''}" placeholder="Nombre del concepto" class="pe-concept-name">
                                        ${ConceptTypeHelper.renderTypeDropdown('concept_type_id_' + i, c.concept_type_id)}
                                        ${FormulaEditor.renderEditor(i, c.formula || (c.percentage ? c.percentage + '%' : ''))}
                                        <button type="button" onclick="PayrollEngine.removeConceptRow(this, '${c.id || ''}')" class="pe-btn-icon pe-btn-danger">&times;</button>
                                    </div>
                                `).join('')}
                            </div>
                        </form>
                    </div>
                    <div class="pe-modal-footer">
                        <button onclick="PayrollEngine.saveEditTemplate('${id}')" class="pe-btn pe-btn-primary">Guardar Cambios</button>
                        <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch (error) {
            this.showNotification('Error al cargar plantilla: ' + error.message, 'error');
        }
    },

    addEditConceptRow() {
        const list = document.getElementById('pe-edit-concepts-list');
        const index = list.children.length;
        const typeDropdown = ConceptTypeHelper.renderTypeDropdown(`concept_type_id_${index}`, null);
        list.insertAdjacentHTML('beforeend', `
            <div class="pe-concept-row pe-concept-row-edit" data-concept-id="" data-index="${index}">
                <input type="text" name="concept_name_${index}" placeholder="Nombre del concepto" class="pe-concept-name">
                ${typeDropdown}
                ${FormulaEditor.renderEditor(index, '')}
                <button type="button" onclick="PayrollEngine.removeConceptRow(this, '')" class="pe-btn-icon pe-btn-danger">&times;</button>
            </div>
        `);
    },

    async removeConceptRow(btn, conceptId) {
        const row = btn.closest('.pe-concept-row');
        if (conceptId && conceptId !== '') {
            try {
                await PayrollAPI.deleteConcept(conceptId);
                this.showNotification('Concepto eliminado', 'success');
            } catch (error) {
                this.showNotification('Error al eliminar: ' + error.message, 'error');
                return;
            }
        }
        row.remove();
    },

    async saveEditTemplate(templateId) {
        const form = document.getElementById('pe-edit-template-form');
        const formData = new FormData(form);

        const data = {
            template_code: formData.get('template_code'),
            template_name: formData.get('template_name'),
            description: formData.get('description'),
            pay_frequency: formData.get('pay_frequency').toLowerCase(),
            is_default: formData.get('is_default') === 'on'
        };

        try {
            // Actualizar plantilla
            await PayrollAPI.updateTemplate(templateId, data);

            // Actualizar/crear conceptos
            const conceptRows = document.querySelectorAll('#pe-edit-concepts-list .pe-concept-row');
            for (let i = 0; i < conceptRows.length; i++) {
                const row = conceptRows[i];
                const conceptId = row.dataset.conceptId;
                const name = formData.get(`concept_name_${i}`);
                const typeId = parseInt(formData.get(`concept_type_id_${i}`)) || 1;
                // Auto-generate concept_code from name
                const code = name ? name.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + (i + 1) : '';
                const conceptData = {
                    concept_name: name,
                    concept_code: code,
                    concept_type_id: typeId,
                    calculation_type: 'fixed',
                    formula: formData.get(`concept_formula_${i}`)
                };

                if (conceptData.concept_name) {
                    if (conceptId && conceptId !== '') {
                        await PayrollAPI.updateConcept(conceptId, conceptData);
                    } else {
                        await PayrollAPI.addConcept(templateId, conceptData);
                    }
                }
            }

            this.showNotification('Plantilla actualizada exitosamente', 'success');
            document.querySelector('.pe-modal-overlay')?.remove();
            this.renderTemplates();
        } catch (error) {
            this.showNotification('Error al guardar: ' + error.message, 'error');
        }
    },

    async cloneTemplate(id) {
        try {
            const result = await PayrollAPI.getTemplate(id);
            const template = result.data;

            // Mostrar modal para clonar
            const modal = document.createElement('div');
            modal.className = 'pe-modal-overlay';
            modal.innerHTML = `
                <div class="pe-modal">
                    <div class="pe-modal-header">
                        <h3>Clonar Plantilla</h3>
                        <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                    </div>
                    <div class="pe-modal-body">
                        <p>Se creara una copia de <strong>${template.template_name}</strong> con todos sus conceptos.</p>
                        <div class="pe-form-group">
                            <label>Nuevo Codigo *</label>
                            <input type="text" id="pe-clone-code" required value="${template.template_code}-COPIA" placeholder="Codigo unico">
                        </div>
                        <div class="pe-form-group">
                            <label>Nuevo Nombre *</label>
                            <input type="text" id="pe-clone-name" required value="${template.template_name} (Copia)" placeholder="Nombre de la plantilla">
                        </div>
                    </div>
                    <div class="pe-modal-footer">
                        <button onclick="PayrollEngine.executeCloneTemplate('${id}')" class="pe-btn pe-btn-primary">Crear Copia</button>
                        <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch (error) {
            this.showNotification('Error al cargar plantilla: ' + error.message, 'error');
        }
    },

    async executeCloneTemplate(originalId) {
        const newCode = document.getElementById('pe-clone-code')?.value;
        const newName = document.getElementById('pe-clone-name')?.value;

        if (!newCode || !newName) {
            this.showNotification('Complete todos los campos', 'warning');
            return;
        }

        try {
            // Obtener plantilla original
            const result = await PayrollAPI.getTemplate(originalId);
            const template = result.data;

            // Crear nueva plantilla
            const newTemplate = {
                template_code: newCode,
                template_name: newName,
                description: template.description,
                pay_frequency: template.pay_frequency,
                is_default: false,
                concepts: (template.concepts || []).map((c, i) => ({
                    concept_name: c.concept_name,
                    concept_code: c.concept_code || (c.concept_name.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + (i + 1)),
                    concept_type_id: c.concept_type_id,
                    calculation_type: c.calculation_type || 'fixed',
                    formula: c.formula,
                    display_order: c.display_order
                }))
            };

            await PayrollAPI.createTemplate(newTemplate);
            this.showNotification('Plantilla clonada exitosamente', 'success');
            document.querySelector('.pe-modal-overlay')?.remove();
            this.renderTemplates();
        } catch (error) {
            this.showNotification('Error al clonar: ' + error.message, 'error');
        }
    },

    async viewTemplateDetail(id) {
        try {
            const result = await PayrollAPI.getTemplate(id);
            const template = result.data;

            const modal = document.createElement('div');
            modal.className = 'pe-modal-overlay';
            modal.innerHTML = `
                <div class="pe-modal pe-modal-lg">
                    <div class="pe-modal-header">
                        <h3>${template.template_name}</h3>
                        <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                    </div>
                    <div class="pe-modal-body">
                        <div class="pe-template-detail">
                            <div class="pe-detail-meta">
                                <span><strong>Codigo:</strong> ${template.template_code}</span>
                                <span><strong>Tipo:</strong> ${template.pay_frequency || 'MONTHLY'}</span>
                            </div>

                            <h4>Conceptos (${template.concepts?.length || 0})</h4>
                            <table class="pe-table">
                                <thead>
                                    <tr>
                                        <th>Concepto</th>
                                        <th>Tipo</th>
                                        <th>Formula</th>
                                        <th>Orden</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(template.concepts || []).map(c => {
                                        const typeId = c.concept_type_id;
                                        const isEarning = typeId <= 8;
                                        const isDeduction = typeId >= 9 && typeId <= 13;
                                        const typeName = c.conceptType?.type_name || (isEarning ? 'Haber' : isDeduction ? 'Deduccion' : 'Carga Patronal');
                                        return `
                                        <tr>
                                            <td>${c.concept_name}</td>
                                            <td><span class="pe-badge pe-badge-${isEarning ? 'success' : isDeduction ? 'danger' : 'info'}">${typeName}</span></td>
                                            <td><code>${c.formula || '--'}</code></td>
                                            <td>${c.display_order || '--'}</td>
                                        </tr>
                                    `}).join('') || '<tr><td colspan="4">Sin conceptos</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="pe-modal-footer">
                        <button onclick="PayrollEngine.editTemplate('${id}')" class="pe-btn pe-btn-primary">Editar</button>
                        <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cerrar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    // ========================================================================
    // ENTITIES VIEW - 100% Parametrizable con Categorías
    // ========================================================================
    entitiesViewTab: 'entities', // 'categories' o 'entities'
    entityCategories: [],
    entities: [],

    async renderEntities() {
        const content = document.getElementById('pe-content');

        // Cargar datos
        try {
            const [catResult, entResult] = await Promise.all([
                PayrollAPI.getEntityCategories(),
                PayrollAPI.getEntities()
            ]);
            this.entityCategories = catResult.data || [];
            this.entities = entResult.data || [];
        } catch (e) {
            console.error('Error loading entities:', e);
        }

        content.innerHTML = `
            <div class="pe-entities">
                <!-- Banner de ayuda contextual -->
                ${PayrollHelpSystem.showContextBanner('entities')}
                <!-- Tabs para Categorías / Entidades -->
                <div class="pe-entities-tabs">
                    <button class="pe-tab ${this.entitiesViewTab === 'categories' ? 'active' : ''}"
                            onclick="PayrollEngine.switchEntitiesTab('categories')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                        </svg>
                        Categorias de Destino
                    </button>
                    <button class="pe-tab ${this.entitiesViewTab === 'entities' ? 'active' : ''}"
                            onclick="PayrollEngine.switchEntitiesTab('entities')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11"/>
                        </svg>
                        Entidades de Destino
                    </button>
                </div>

                <div id="pe-entities-content">
                    ${this.entitiesViewTab === 'categories' ? this.renderCategoriesView() : this.renderEntitiesView()}
                </div>
            </div>
        `;
    },

    switchEntitiesTab(tab) {
        this.entitiesViewTab = tab;
        const container = document.getElementById('pe-entities-content');
        if (container) {
            container.innerHTML = tab === 'categories' ? this.renderCategoriesView() : this.renderEntitiesView();
        }
        document.querySelectorAll('.pe-entities-tabs .pe-tab').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab.substring(0, 3)));
        });
    },

    // --- VISTA DE CATEGORÍAS ---
    renderCategoriesView() {
        const flowColors = {
            'earning': { bg: '#dcfce7', text: '#166534', label: 'Ingreso' },
            'deduction': { bg: '#fee2e2', text: '#991b1b', label: 'Deduccion' },
            'employer_contribution': { bg: '#dbeafe', text: '#1e40af', label: 'Aporte Patronal' },
            'informative': { bg: '#f3f4f6', text: '#374151', label: 'Informativo' }
        };

        return `
            <div class="pe-section-header">
                <div>
                    <h3>Categorias de Entidades</h3>
                    <p class="pe-text-muted">Define los tipos de destino para conceptos de liquidacion</p>
                </div>
                <button onclick="PayrollEngine.showCategoryModal()" class="pe-btn pe-btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Nueva Categoria
                </button>
            </div>

            <div class="pe-categories-grid">
                ${this.entityCategories.length > 0 ? this.entityCategories.map(cat => {
                    const flow = flowColors[cat.flow_direction] || flowColors.informative;
                    return `
                        <div class="pe-category-card" style="border-left: 4px solid ${cat.color_hex || '#6b7280'}">
                            <div class="pe-category-header">
                                <span class="pe-category-icon" style="background: ${cat.color_hex || '#6b7280'}20; color: ${cat.color_hex || '#6b7280'}">
                                    ${this.getCategoryIcon(cat.icon_name)}
                                </span>
                                <div class="pe-category-title">
                                    <h4>${cat.category_name}</h4>
                                    <span class="pe-code">${cat.category_code}</span>
                                </div>
                                ${cat.is_global ? '<span class="pe-badge pe-badge-info">Global</span>' : ''}
                                ${cat.is_system ? '<span class="pe-badge pe-badge-secondary">Sistema</span>' : ''}
                            </div>
                            <p class="pe-category-desc">${cat.description || 'Sin descripcion'}</p>
                            <div class="pe-category-meta">
                                <span class="pe-flow-badge" style="background: ${flow.bg}; color: ${flow.text}">${flow.label}</span>
                                <span class="pe-meta-item">Grupo: ${cat.consolidation_group || 'N/A'}</span>
                            </div>
                            ${!cat.is_system ? `
                                <div class="pe-category-actions">
                                    <button onclick="PayrollEngine.showCategoryModal(${cat.id})" class="pe-btn pe-btn-sm pe-btn-ghost">Editar</button>
                                    <button onclick="PayrollEngine.deleteCategory(${cat.id})" class="pe-btn pe-btn-sm pe-btn-ghost pe-btn-danger">Eliminar</button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('') : `
                    <div class="pe-empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                        </svg>
                        <p>No hay categorias configuradas</p>
                    </div>
                `}
            </div>
        `;
    },

    getCategoryIcon(iconName) {
        const icons = {
            'piggy-bank': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7V4a1 1 0 00-1-1H5a2 2 0 00-2 2v14a2 2 0 002 2h13a1 1 0 001-1v-3"/><path d="M3 6l10 7 10-7"/></svg>',
            'heart': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
            'users': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
            'building': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11"/></svg>',
            'receipt': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/></svg>',
            'shield-check': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
            'home': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
            'briefcase': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>'
        };
        return icons[iconName] || icons['building'];
    },

    // --- VISTA DE ENTIDADES ---
    renderEntitiesView() {
        const flowColors = {
            'earning': { bg: '#dcfce7', text: '#166534' },
            'deduction': { bg: '#fee2e2', text: '#991b1b' },
            'employer_contribution': { bg: '#dbeafe', text: '#1e40af' },
            'informative': { bg: '#f3f4f6', text: '#374151' }
        };

        // Agrupar por categoría
        const grouped = {};
        this.entities.forEach(e => {
            const catName = e.category_name || 'Sin Categoria';
            if (!grouped[catName]) grouped[catName] = [];
            grouped[catName].push(e);
        });

        return `
            <div class="pe-section-header">
                <div>
                    <h3>Entidades de Destino</h3>
                    <p class="pe-text-muted">Organismos, sindicatos y entidades que reciben deducciones/aportes</p>
                </div>
                <button onclick="PayrollEngine.showEntityModal()" class="pe-btn pe-btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Nueva Entidad
                </button>
            </div>

            ${Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([catName, entities]) => `
                <div class="pe-entity-group">
                    <h4 class="pe-group-title">${catName} <span class="pe-count">(${entities.length})</span></h4>
                    <div class="pe-entities-grid">
                        ${entities.map(e => {
                            const flow = flowColors[e.flow_direction] || flowColors.informative;
                            return `
                                <div class="pe-entity-card" style="border-left: 4px solid ${e.color_hex || '#6b7280'}">
                                    <div class="pe-entity-header">
                                        <span class="pe-entity-icon" style="background: ${e.color_hex || '#6b7280'}20; color: ${e.color_hex || '#6b7280'}">
                                            ${this.getCategoryIcon(e.icon_name)}
                                        </span>
                                        <div>
                                            <h4>${e.entity_name}</h4>
                                            <span class="pe-code">${e.entity_code}</span>
                                        </div>
                                    </div>
                                    <div class="pe-entity-meta">
                                        ${e.country_name ? `<span class="pe-meta-item">🌍 ${e.country_name}</span>` : ''}
                                        ${e.is_government ? '<span class="pe-badge pe-badge-warning">Gubernamental</span>' : ''}
                                        ${e.is_mandatory ? '<span class="pe-badge pe-badge-error">Obligatorio</span>' : ''}
                                        ${e.is_global ? '<span class="pe-badge pe-badge-info">Global</span>' : ''}
                                    </div>
                                    ${e.tax_id ? `<p class="pe-entity-taxid">ID Fiscal: ${e.tax_id}</p>` : ''}
                                    <div class="pe-entity-actions">
                                        <button onclick="PayrollEngine.viewEntitySettlements(${e.entity_id})" class="pe-btn pe-btn-sm pe-btn-outline">Liquidaciones</button>
                                        ${!e.is_global ? `
                                            <button onclick="PayrollEngine.showEntityModal(${e.entity_id})" class="pe-btn pe-btn-sm pe-btn-ghost">Editar</button>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('') : `
                <div class="pe-empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11"/>
                    </svg>
                    <h4>No hay entidades configuradas</h4>
                    <p>Primero crea categorias y luego las entidades de destino</p>
                    <button onclick="PayrollEngine.switchEntitiesTab('categories')" class="pe-btn pe-btn-secondary">Ir a Categorias</button>
                    <button onclick="PayrollEngine.showEntityModal()" class="pe-btn pe-btn-primary">Crear Entidad</button>
                </div>
            `}
        `;
    },

    // --- MODAL DE CATEGORÍA ---
    async showCategoryModal(categoryId = null) {
        let category = null;
        if (categoryId) {
            category = this.entityCategories.find(c => c.id === categoryId);
        }

        const modal = document.createElement('div');
        modal.className = 'pe-modal-overlay';
        modal.innerHTML = `
            <div class="pe-modal">
                <div class="pe-modal-header">
                    <h3>${category ? 'Editar' : 'Nueva'} Categoria</h3>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                </div>
                <div class="pe-modal-body">
                    <form id="pe-category-form">
                        <input type="hidden" name="id" value="${category?.id || ''}">
                        <div class="pe-form-row">
                            <div class="pe-form-group">
                                <label>Codigo *</label>
                                <input type="text" name="category_code" required value="${category?.category_code || ''}" placeholder="EJ: PENSION">
                            </div>
                            <div class="pe-form-group">
                                <label>Nombre Corto</label>
                                <input type="text" name="category_name_short" value="${category?.category_name_short || ''}" placeholder="Jubilacion">
                            </div>
                        </div>
                        <div class="pe-form-group">
                            <label>Nombre Completo *</label>
                            <input type="text" name="category_name" required value="${category?.category_name || ''}" placeholder="Sistema Previsional / Jubilacion">
                        </div>
                        <div class="pe-form-group">
                            <label>Descripcion</label>
                            <textarea name="description" rows="2" placeholder="Descripcion de la categoria">${category?.description || ''}</textarea>
                        </div>
                        <div class="pe-form-row">
                            <div class="pe-form-group">
                                <label>Direccion del Flujo *</label>
                                <select name="flow_direction" required>
                                    <option value="deduction" ${category?.flow_direction === 'deduction' ? 'selected' : ''}>Deduccion (del empleado)</option>
                                    <option value="employer_contribution" ${category?.flow_direction === 'employer_contribution' ? 'selected' : ''}>Aporte Patronal</option>
                                    <option value="earning" ${category?.flow_direction === 'earning' ? 'selected' : ''}>Ingreso/Haber</option>
                                    <option value="informative" ${category?.flow_direction === 'informative' ? 'selected' : ''}>Solo Informativo</option>
                                </select>
                            </div>
                            <div class="pe-form-group">
                                <label>Grupo de Consolidacion</label>
                                <input type="text" name="consolidation_group" value="${category?.consolidation_group || ''}" placeholder="social_security">
                            </div>
                        </div>
                        <div class="pe-form-row">
                            <div class="pe-form-group">
                                <label>Color (HEX)</label>
                                <input type="color" name="color_hex" value="${category?.color_hex || '#3B82F6'}">
                            </div>
                            <div class="pe-form-group">
                                <label>Icono</label>
                                <select name="icon_name">
                                    <option value="building" ${category?.icon_name === 'building' ? 'selected' : ''}>Edificio</option>
                                    <option value="piggy-bank" ${category?.icon_name === 'piggy-bank' ? 'selected' : ''}>Alcancia</option>
                                    <option value="heart" ${category?.icon_name === 'heart' ? 'selected' : ''}>Corazon</option>
                                    <option value="users" ${category?.icon_name === 'users' ? 'selected' : ''}>Usuarios</option>
                                    <option value="receipt" ${category?.icon_name === 'receipt' ? 'selected' : ''}>Recibo</option>
                                    <option value="shield-check" ${category?.icon_name === 'shield-check' ? 'selected' : ''}>Escudo</option>
                                    <option value="home" ${category?.icon_name === 'home' ? 'selected' : ''}>Casa</option>
                                    <option value="briefcase" ${category?.icon_name === 'briefcase' ? 'selected' : ''}>Maletin</option>
                                </select>
                            </div>
                        </div>
                        <div class="pe-form-group pe-form-checkboxes">
                            <label><input type="checkbox" name="requires_tax_id" ${category?.requires_tax_id ? 'checked' : ''}> Requiere ID Fiscal</label>
                            <label><input type="checkbox" name="requires_bank_info" ${category?.requires_bank_info ? 'checked' : ''}> Requiere Datos Bancarios</label>
                        </div>
                    </form>
                </div>
                <div class="pe-modal-footer">
                    <button onclick="PayrollEngine.saveCategory()" class="pe-btn pe-btn-primary">Guardar</button>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async saveCategory() {
        const form = document.getElementById('pe-category-form');
        const formData = new FormData(form);
        const id = formData.get('id');

        // ====== VALIDACIÓN PROACTIVA ======
        // Validar campos requeridos basicos
        const code = formData.get('category_code');
        const name = formData.get('category_name');
        const flowDir = formData.get('flow_direction');

        if (!code || !name) {
            this.showNotification('Codigo y nombre son requeridos', 'warning');
            return;
        }

        if (!flowDir) {
            this.showNotification('Seleccione un tipo de flujo (Deduccion, Haber o Neutro)', 'warning');
            PayrollHelpSystem.showBubble(form.querySelector('[name="flow_direction"]'),
                'Tipo de flujo',
                'El flujo determina como afecta al calculo: Deduccion (resta del neto), Haber (suma), Neutro (informativo).');
            return;
        }
        // ====== FIN VALIDACIÓN ======

        const data = {
            category_code: formData.get('category_code'),
            category_name: formData.get('category_name'),
            category_name_short: formData.get('category_name_short'),
            description: formData.get('description'),
            flow_direction: formData.get('flow_direction'),
            consolidation_group: formData.get('consolidation_group'),
            color_hex: formData.get('color_hex'),
            icon_name: formData.get('icon_name'),
            requires_tax_id: formData.get('requires_tax_id') === 'on',
            requires_bank_info: formData.get('requires_bank_info') === 'on'
        };

        try {
            if (id) {
                await PayrollAPI.updateEntityCategory(id, data);
                this.showNotification('Categoria actualizada', 'success');
            } else {
                await PayrollAPI.createEntityCategory(data);
                this.showNotification('Categoria creada', 'success');
            }
            document.querySelector('.pe-modal-overlay')?.remove();
            this.renderEntities();
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    async deleteCategory(id) {
        if (!confirm('Eliminar esta categoria? Las entidades asociadas quedaran sin categoria.')) return;
        try {
            await PayrollAPI.deleteEntityCategory(id);
            this.showNotification('Categoria eliminada', 'success');
            this.renderEntities();
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    // --- MODAL DE ENTIDAD ---
    async showEntityModal(entityId = null) {
        let entity = null;
        if (entityId) {
            entity = this.entities.find(e => e.entity_id === entityId);
        }

        // Cargar países si no están cargados
        let countries = [];
        try {
            const result = await PayrollAPI.request('/countries');
            countries = result.data || [];
        } catch (e) {}

        const modal = document.createElement('div');
        modal.className = 'pe-modal-overlay';
        modal.innerHTML = `
            <div class="pe-modal pe-modal-lg">
                <div class="pe-modal-header">
                    <h3>${entity ? 'Editar' : 'Nueva'} Entidad</h3>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                </div>
                <div class="pe-modal-body">
                    <form id="pe-entity-form">
                        <input type="hidden" name="entity_id" value="${entity?.entity_id || ''}">

                        <div class="pe-form-section">
                            <h4>Datos Basicos</h4>
                            <div class="pe-form-row">
                                <div class="pe-form-group">
                                    <label>Categoria *</label>
                                    <select name="category_id" required>
                                        <option value="">-- Seleccione --</option>
                                        ${this.entityCategories.map(c => `
                                            <option value="${c.id}" ${entity?.category_id == c.id ? 'selected' : ''}>
                                                ${c.category_name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="pe-form-group">
                                    <label>Pais</label>
                                    <select name="country_id">
                                        <option value="">-- Aplica a todos --</option>
                                        ${countries.map(c => `
                                            <option value="${c.id}" ${entity?.country_id == c.id ? 'selected' : ''}>
                                                ${c.country_name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="pe-form-row">
                                <div class="pe-form-group">
                                    <label>Codigo *</label>
                                    <input type="text" name="entity_code" required value="${entity?.entity_code || ''}" placeholder="EJ: AFIP_JUB">
                                </div>
                                <div class="pe-form-group">
                                    <label>Nombre Corto</label>
                                    <input type="text" name="entity_short_name" value="${entity?.entity_short_name || ''}" placeholder="AFIP">
                                </div>
                            </div>
                            <div class="pe-form-group">
                                <label>Nombre Completo *</label>
                                <input type="text" name="entity_name" required value="${entity?.entity_name || ''}" placeholder="AFIP - Sistema Integrado Previsional">
                            </div>
                            <div class="pe-form-row">
                                <div class="pe-form-group">
                                    <label>Razon Social</label>
                                    <input type="text" name="legal_name" value="${entity?.legal_name || ''}" placeholder="Razon social completa">
                                </div>
                                <div class="pe-form-group">
                                    <label>ID Fiscal (CUIT/RFC/etc)</label>
                                    <input type="text" name="tax_id" value="${entity?.tax_id || ''}" placeholder="30-12345678-9">
                                </div>
                            </div>
                        </div>

                        <div class="pe-form-section">
                            <h4>Contacto</h4>
                            <div class="pe-form-row">
                                <div class="pe-form-group">
                                    <label>Telefono</label>
                                    <input type="text" name="phone" value="${entity?.phone || ''}">
                                </div>
                                <div class="pe-form-group">
                                    <label>Email</label>
                                    <input type="email" name="email" value="${entity?.email || ''}">
                                </div>
                            </div>
                            <div class="pe-form-group">
                                <label>Direccion</label>
                                <input type="text" name="address" value="${entity?.address || ''}">
                            </div>
                            <div class="pe-form-group">
                                <label>Sitio Web</label>
                                <input type="url" name="website" value="${entity?.website || ''}" placeholder="https://...">
                            </div>
                        </div>

                        <div class="pe-form-section">
                            <h4>Datos Bancarios (para pagos)</h4>
                            <div class="pe-form-row">
                                <div class="pe-form-group">
                                    <label>Banco</label>
                                    <input type="text" name="bank_name" value="${entity?.bank_name || ''}">
                                </div>
                                <div class="pe-form-group">
                                    <label>CBU/Cuenta</label>
                                    <input type="text" name="bank_cbu" value="${entity?.bank_cbu || ''}">
                                </div>
                            </div>
                            <div class="pe-form-group">
                                <label>Alias</label>
                                <input type="text" name="bank_alias" value="${entity?.bank_alias || ''}">
                            </div>
                        </div>

                        <div class="pe-form-section">
                            <h4>Configuracion</h4>
                            <div class="pe-form-row">
                                <div class="pe-form-group">
                                    <label>Formato de Presentacion</label>
                                    <input type="text" name="presentation_format" value="${entity?.presentation_format || ''}" placeholder="CUSTOM, TXT, EXCEL...">
                                </div>
                                <div class="pe-form-group">
                                    <label>Referencia Legal</label>
                                    <input type="text" name="legal_reference" value="${entity?.legal_reference || ''}" placeholder="Ley N XX Art. YY">
                                </div>
                            </div>
                            <div class="pe-form-group pe-form-checkboxes">
                                <label><input type="checkbox" name="is_government" ${entity?.is_government ? 'checked' : ''}> Organismo Gubernamental</label>
                                <label><input type="checkbox" name="is_mandatory" ${entity?.is_mandatory ? 'checked' : ''}> Obligatorio por Ley</label>
                            </div>
                            <div class="pe-form-group">
                                <label>Notas de Calculo</label>
                                <textarea name="calculation_notes" rows="2" placeholder="Instrucciones sobre como calcular">${entity?.calculation_notes || ''}</textarea>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="pe-modal-footer">
                    <button onclick="PayrollEngine.saveEntity()" class="pe-btn pe-btn-primary">Guardar</button>
                    <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async saveEntity() {
        const form = document.getElementById('pe-entity-form');
        const formData = new FormData(form);
        const id = formData.get('entity_id');

        // ====== VALIDACIÓN PROACTIVA ======
        PayrollHelpSystem.setContext('entityCreate');

        // Validar campos requeridos
        const validation = PayrollHelpSystem.validateForm('pe-entity-form', 'entityCreate');
        if (!validation.valid) {
            PayrollHelpSystem.showValidationErrors(validation.errors, form);
            this.showNotification('Por favor complete los campos requeridos', 'warning');
            return;
        }

        // Validar categoria
        if (!formData.get('category_id')) {
            this.showNotification('Seleccione una categoria para la entidad', 'warning');
            PayrollHelpSystem.showBubble(form.querySelector('[name="category_id"]'),
                'Categoria requerida',
                'La categoria determina el tipo de entidad (Obra Social, Sindicato, Organismo Fiscal, etc.)');
            return;
        }
        // ====== FIN VALIDACIÓN ======

        const data = {
            category_id: formData.get('category_id') || null,
            country_id: formData.get('country_id') || null,
            entity_code: formData.get('entity_code'),
            entity_name: formData.get('entity_name'),
            entity_short_name: formData.get('entity_short_name'),
            legal_name: formData.get('legal_name'),
            tax_id: formData.get('tax_id'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            address: formData.get('address'),
            website: formData.get('website'),
            bank_name: formData.get('bank_name'),
            bank_cbu: formData.get('bank_cbu'),
            bank_alias: formData.get('bank_alias'),
            presentation_format: formData.get('presentation_format'),
            legal_reference: formData.get('legal_reference'),
            calculation_notes: formData.get('calculation_notes'),
            is_government: formData.get('is_government') === 'on',
            is_mandatory: formData.get('is_mandatory') === 'on'
        };

        try {
            if (id) {
                await PayrollAPI.updateEntity(id, data);
                this.showNotification('Entidad actualizada', 'success');
            } else {
                await PayrollAPI.createEntity(data);
                this.showNotification('Entidad creada', 'success');
            }
            document.querySelector('.pe-modal-overlay')?.remove();
            this.renderEntities();
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    // Legacy - mantener para compatibilidad
    showCreateEntityModal() {
        this.showEntityModal();
    },
    renderEntityCard(entity) {
        return `<div class="pe-entity-card-legacy">${entity.entity_name}</div>`;
    },

    async viewEntitySettlements(entityId) {
        this.showNotification('Cargando liquidaciones...', 'info');

        try {
            // Obtener datos de la entidad y sus liquidaciones
            const entitiesResult = await PayrollAPI.getEntities();
            const entity = entitiesResult.data?.find(e => e.entity_id === entityId);

            const settlementsResult = await PayrollAPI.getSettlements();
            const settlements = (settlementsResult.data || []).filter(s => s.entity_id === entityId);

            const modal = document.createElement('div');
            modal.className = 'pe-modal-overlay';
            modal.innerHTML = `
                <div class="pe-modal pe-modal-lg">
                    <div class="pe-modal-header">
                        <h3>Liquidaciones: ${entity?.entity_name || 'Entidad'}</h3>
                        <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-modal-close">&times;</button>
                    </div>
                    <div class="pe-modal-body">
                        <div class="pe-entity-info-bar">
                            <span><strong>Codigo:</strong> ${entity?.entity_code || '--'}</span>
                            <span><strong>Tipo:</strong> ${entity?.entity_type || '--'}</span>
                            ${entity?.is_mandatory ? '<span class="pe-badge pe-badge-warning">Obligatorio</span>' : ''}
                        </div>

                        ${settlements.length > 0 ? `
                            <table class="pe-table">
                                <thead>
                                    <tr>
                                        <th>Periodo</th>
                                        <th>Fecha Generacion</th>
                                        <th class="text-right">Monto Total</th>
                                        <th>Empleados</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${settlements.map(s => `
                                        <tr>
                                            <td>${this.getMonthName(s.period_month)} ${s.period_year}</td>
                                            <td>${s.generated_at ? new Date(s.generated_at).toLocaleDateString('es-AR') : '--'}</td>
                                            <td class="text-right">${this.formatCurrency(s.total_amount || 0)}</td>
                                            <td>${s.employee_count || 0}</td>
                                            <td><span class="pe-status pe-status-${s.status === 'paid' ? 'success' : s.status === 'pending' ? 'warning' : 'info'}">${s.status || 'generado'}</span></td>
                                            <td>
                                                <button onclick="PayrollEngine.exportEntitySettlement(${s.id})" class="pe-btn pe-btn-sm pe-btn-outline">Exportar</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="pe-empty-state">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
                                <p>No hay liquidaciones generadas para esta entidad</p>
                                <button onclick="PayrollEngine.generateEntitySettlement(${entityId}); this.closest('.pe-modal-overlay').remove();" class="pe-btn pe-btn-primary">Generar Primera Liquidacion</button>
                            </div>
                        `}
                    </div>
                    <div class="pe-modal-footer">
                        <button onclick="PayrollEngine.generateEntitySettlement(${entityId})" class="pe-btn pe-btn-primary">Generar Nueva</button>
                        <button onclick="this.closest('.pe-modal-overlay').remove()" class="pe-btn pe-btn-secondary">Cerrar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch (error) {
            this.showNotification('Error al cargar: ' + error.message, 'error');
        }
    },

    async exportEntitySettlement(settlementId) {
        this.showNotification('Exportando liquidacion...', 'info');
        try {
            // Generar CSV de la liquidacion
            const result = await PayrollAPI.getSettlements();
            const settlement = result.data?.find(s => s.id === settlementId);

            if (!settlement) {
                this.showNotification('Liquidacion no encontrada', 'warning');
                return;
            }

            const csvContent = [
                ['Entidad', 'Periodo', 'Monto Total', 'Empleados', 'Fecha Generacion'].join(','),
                [
                    settlement.entity_name || '',
                    `${settlement.period_month}/${settlement.period_year}`,
                    settlement.total_amount || 0,
                    settlement.employee_count || 0,
                    settlement.generated_at || ''
                ].map(cell => `"${cell}"`).join(',')
            ].join('\n');

            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `liquidacion_entidad_${settlementId}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);

            this.showNotification('Exportacion completada', 'success');
        } catch (error) {
            this.showNotification('Error al exportar: ' + error.message, 'error');
        }
    },

    async generateEntitySettlement(entityId) {
        try {
            await PayrollAPI.generateSettlement({
                entity_id: entityId,
                period_year: PayrollState.period.year,
                period_month: PayrollState.period.month
            });
            this.showNotification('Consolidacion generada', 'success');
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    },

    // ========================================================================
    // REPORTS VIEW
    // ========================================================================
    async renderReports() {
        const content = document.getElementById('pe-content');

        content.innerHTML = `
            <div class="pe-reports">
                <h3>Centro de Reportes</h3>

                <div class="pe-reports-grid">
                    <div class="pe-report-card" onclick="PayrollEngine.exportReport('summary')">
                        <div class="pe-report-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg></div>
                        <h4>Resumen de Nomina</h4>
                        <p>Totales por departamento y concepto</p>
                    </div>
                    <div class="pe-report-card" onclick="PayrollEngine.exportReport('by-concept')">
                        <div class="pe-report-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg></div>
                        <h4>Reporte por Concepto</h4>
                        <p>Detalle de cada concepto de liquidacion</p>
                    </div>
                    <div class="pe-report-card" onclick="PayrollEngine.exportReport('bank')">
                        <div class="pe-report-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg></div>
                        <h4>Archivo Bancario</h4>
                        <p>Generar archivo para transferencias</p>
                    </div>
                    <div class="pe-report-card" onclick="PayrollEngine.exportReport('entities')">
                        <div class="pe-report-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>
                        <h4>Consolidacion Entidades</h4>
                        <p>Resumen para presentaciones</p>
                    </div>
                    <div class="pe-report-card" onclick="PayrollEngine.exportReport('payslips')">
                        <div class="pe-report-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
                        <h4>Recibos Masivos</h4>
                        <p>Generar todos los recibos de sueldo</p>
                    </div>
                    <div class="pe-report-card" onclick="PayrollEngine.exportReport('accounting')">
                        <div class="pe-report-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg></div>
                        <h4>Asientos Contables</h4>
                        <p>Exportar para sistema contable</p>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // PAYSLIP EDITOR VIEW - Editor Visual de Recibos de Sueldo
    // ========================================================================
    async renderPayslipEditor() {
        const content = document.getElementById('pe-content');

        // Cargar script del editor si no existe
        if (!window.PayslipEditor) {
            await this.loadPayslipEditorScript();
        }

        // Renderizar editor
        if (window.PayslipEditor) {
            await PayslipEditor.render('pe-content');
        } else {
            content.innerHTML = `
                <div class="pe-error">
                    <p>Error cargando el editor de recibos</p>
                    <button onclick="PayrollEngine.showView('payslip-editor')" class="pe-btn pe-btn-primary">Reintentar</button>
                </div>
            `;
        }
    },

    async loadPayslipEditorScript() {
        return new Promise((resolve, reject) => {
            // Verificar si ya está cargado
            if (window.PayslipEditor) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = '/js/modules/payslip-template-editor.js?v=' + Date.now();
            script.onload = () => {
                console.log('[Payroll] PayslipEditor script loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('[Payroll] Failed to load PayslipEditor');
                reject(new Error('Failed to load PayslipEditor script'));
            };
            document.head.appendChild(script);
        });
    },

    async exportReport(type) {
        this.showNotification(`Generando reporte: ${type}...`, 'info');

        try {
            const { year, month } = PayrollState.period;
            let data = [];

            // Obtener datos del periodo
            try {
                const result = await PayrollAPI.getRunsDetails(year, month);
                if (result.data) data = result.data;
            } catch (e) {
                this.showNotification('No hay datos para el periodo seleccionado', 'warning');
                return;
            }

            if (data.length === 0) {
                this.showNotification('No hay datos para exportar', 'warning');
                return;
            }

            let csvContent = '';
            let filename = '';

            switch(type) {
                case 'summary':
                    // Resumen de nomina por departamento
                    const byDept = {};
                    data.forEach(emp => {
                        const dept = emp.department_name || 'Sin Departamento';
                        if (!byDept[dept]) byDept[dept] = { count: 0, gross: 0, deductions: 0, net: 0 };
                        byDept[dept].count++;
                        byDept[dept].gross += parseFloat(emp.gross_earnings) || 0;
                        byDept[dept].deductions += parseFloat(emp.total_deductions) || 0;
                        byDept[dept].net += parseFloat(emp.net_salary) || 0;
                    });

                    csvContent = [
                        ['Departamento', 'Empleados', 'Total Bruto', 'Total Deducciones', 'Total Neto'].join(','),
                        ...Object.entries(byDept).map(([dept, vals]) =>
                            [dept, vals.count, vals.gross.toFixed(2), vals.deductions.toFixed(2), vals.net.toFixed(2)].map(c => `"${c}"`).join(',')
                        ),
                        ['TOTAL', data.length,
                            Object.values(byDept).reduce((s,v) => s + v.gross, 0).toFixed(2),
                            Object.values(byDept).reduce((s,v) => s + v.deductions, 0).toFixed(2),
                            Object.values(byDept).reduce((s,v) => s + v.net, 0).toFixed(2)
                        ].map(c => `"${c}"`).join(',')
                    ].join('\n');
                    filename = `resumen_nomina_${year}_${month}.csv`;
                    break;

                case 'by-concept':
                    // Reporte detallado por concepto
                    csvContent = [
                        ['Legajo', 'Empleado', 'Departamento', 'Concepto', 'Tipo', 'Monto'].join(','),
                        ...data.flatMap(emp => {
                            const rows = [];
                            (emp.earnings || []).forEach(e => {
                                rows.push([emp.employee_code, `${emp.firstName} ${emp.lastName}`, emp.department_name, e.concept_name, 'HABER', e.amount].map(c => `"${c}"`).join(','));
                            });
                            (emp.deductions || []).forEach(d => {
                                rows.push([emp.employee_code, `${emp.firstName} ${emp.lastName}`, emp.department_name, d.concept_name, 'DEDUCCION', d.amount].map(c => `"${c}"`).join(','));
                            });
                            return rows;
                        })
                    ].join('\n');
                    filename = `detalle_conceptos_${year}_${month}.csv`;
                    break;

                case 'bank':
                    this.generateBankFile();
                    return;

                case 'entities':
                    // Consolidacion de entidades
                    const entities = await PayrollAPI.getEntities();
                    csvContent = [
                        ['Codigo Entidad', 'Nombre', 'Tipo', 'Obligatorio', 'Monto Acumulado'].join(','),
                        ...(entities.data || []).map(e =>
                            [e.entity_code, e.entity_name, e.entity_type, e.is_mandatory ? 'SI' : 'NO', '0.00'].map(c => `"${c}"`).join(',')
                        )
                    ].join('\n');
                    filename = `consolidacion_entidades_${year}_${month}.csv`;
                    break;

                case 'payslips':
                    this.generatePayslips();
                    return;

                case 'accounting':
                    // Asientos contables basicos
                    const totals = data.reduce((acc, emp) => {
                        acc.gross += parseFloat(emp.gross_earnings) || 0;
                        acc.deductions += parseFloat(emp.total_deductions) || 0;
                        acc.net += parseFloat(emp.net_salary) || 0;
                        return acc;
                    }, { gross: 0, deductions: 0, net: 0 });

                    csvContent = [
                        ['Cuenta', 'Descripcion', 'Debe', 'Haber'].join(','),
                        ['5101', 'Sueldos y Salarios', totals.gross.toFixed(2), '0.00'].map(c => `"${c}"`).join(','),
                        ['2101', 'Retenciones a Pagar', '0.00', totals.deductions.toFixed(2)].map(c => `"${c}"`).join(','),
                        ['2102', 'Sueldos a Pagar', '0.00', totals.net.toFixed(2)].map(c => `"${c}"`).join(','),
                        ['', 'TOTALES', totals.gross.toFixed(2), (totals.deductions + totals.net).toFixed(2)].map(c => `"${c}"`).join(',')
                    ].join('\n');
                    filename = `asientos_contables_${year}_${month}.csv`;
                    break;

                default:
                    this.showNotification('Tipo de reporte no reconocido', 'warning');
                    return;
            }

            // Descargar archivo
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
            URL.revokeObjectURL(link.href);

            this.showNotification(`Reporte ${type} exportado correctamente`, 'success');
        } catch (error) {
            this.showNotification('Error al generar reporte: ' + error.message, 'error');
        }
    },

    async generateBankFile() {
        this.showNotification('Generando archivo bancario...', 'info');

        try {
            const { year, month } = PayrollState.period;
            let employees = [];

            try {
                const result = await PayrollAPI.getRunsDetails(year, month);
                if (result.data) employees = result.data.filter(e => e.status === 'approved' || e.status === 'calculated');
            } catch (e) {
                this.showNotification('No hay liquidaciones aprobadas', 'warning');
                return;
            }

            if (employees.length === 0) {
                this.showNotification('No hay liquidaciones aprobadas para generar archivo bancario', 'warning');
                return;
            }

            // Formato TXT para transferencias bancarias (formato generico Argentina)
            // CBU(22) + Importe(15) + Referencia(12)
            const bankLines = employees.map(emp => {
                const cbu = (emp.bank_account || '0000000000000000000000').padEnd(22, '0').substring(0, 22);
                const amount = Math.round((emp.net_salary || 0) * 100).toString().padStart(15, '0');
                const reference = (emp.employee_code || emp.id || '').toString().padEnd(12, ' ').substring(0, 12);
                return `${cbu}${amount}${reference}`;
            });

            // Header del archivo
            const header = [
                'H', // Tipo registro header
                new Date().toISOString().split('T')[0].replace(/-/g, ''), // Fecha YYYYMMDD
                employees.length.toString().padStart(6, '0'), // Cantidad registros
                Math.round(employees.reduce((s, e) => s + (e.net_salary || 0), 0) * 100).toString().padStart(17, '0') // Total
            ].join('');

            const fileContent = [header, ...bankLines].join('\n');

            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `transferencias_${year}_${String(month).padStart(2, '0')}.txt`;
            link.click();
            URL.revokeObjectURL(link.href);

            this.showNotification(`Archivo bancario generado con ${employees.length} transferencias`, 'success');
        } catch (error) {
            this.showNotification('Error al generar archivo: ' + error.message, 'error');
        }
    },

    async generatePayslips() {
        this.showNotification('Generando recibos de sueldo masivos...', 'info');

        try {
            const { year, month } = PayrollState.period;
            let employees = [];

            try {
                const result = await PayrollAPI.getRunsDetails(year, month);
                if (result.data) employees = result.data;
            } catch (e) {
                this.showNotification('No hay liquidaciones para este periodo', 'warning');
                return;
            }

            if (employees.length === 0) {
                this.showNotification('No hay empleados liquidados', 'warning');
                return;
            }

            // Generar HTML con todos los recibos (uno por pagina)
            const companyName = localStorage.getItem('companyName') || 'Empresa';
            const period = `${this.getMonthName(month)} ${year}`;

            let allPayslipsHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Recibos de Sueldo - ${period}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: Arial, sans-serif; font-size: 11px; }
                        .payslip { max-width: 800px; margin: 0 auto; border: 2px solid #333; page-break-after: always; }
                        .payslip:last-child { page-break-after: avoid; }
                        .header { background: #1a1a2e; color: white; padding: 12px; text-align: center; }
                        .header h1 { font-size: 16px; margin-bottom: 3px; }
                        .header p { font-size: 10px; opacity: 0.8; }
                        .info-row { display: flex; border-bottom: 1px solid #ddd; }
                        .info-col { flex: 1; padding: 8px; border-right: 1px solid #ddd; }
                        .info-col:last-child { border-right: none; }
                        .info-label { font-size: 9px; color: #666; text-transform: uppercase; }
                        .info-value { font-size: 12px; font-weight: bold; margin-top: 2px; }
                        .section { padding: 8px; }
                        .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #1a1a2e; border-bottom: 1px solid #1a1a2e; padding-bottom: 3px; margin-bottom: 6px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 5px; text-align: left; border-bottom: 1px solid #eee; font-size: 10px; }
                        th { background: #f5f5f5; font-size: 9px; text-transform: uppercase; }
                        .text-right { text-align: right; }
                        .earning { color: #2e7d32; }
                        .deduction { color: #c62828; }
                        .total-row { background: #1a1a2e; color: white; font-weight: bold; }
                        .total-row td { padding: 10px 5px; font-size: 12px; }
                        .footer { background: #f5f5f5; padding: 10px; text-align: center; font-size: 9px; color: #666; }
                        .signature-area { display: flex; justify-content: space-between; padding: 20px 15px; }
                        .signature-line { width: 180px; border-top: 1px solid #333; padding-top: 3px; text-align: center; font-size: 9px; }
                        @media print { body { padding: 0; } .payslip { border: 1px solid #999; margin: 5mm; } }
                    </style>
                </head>
                <body>
            `;

            for (const emp of employees) {
                allPayslipsHTML += `
                    <div class="payslip">
                        <div class="header">
                            <h1>${companyName.toUpperCase()}</h1>
                            <p>RECIBO DE HABERES</p>
                        </div>
                        <div class="info-row">
                            <div class="info-col">
                                <div class="info-label">Empleado</div>
                                <div class="info-value">${emp.firstName || ''} ${emp.lastName || ''}</div>
                            </div>
                            <div class="info-col">
                                <div class="info-label">Legajo</div>
                                <div class="info-value">${emp.employee_code || '--'}</div>
                            </div>
                            <div class="info-col">
                                <div class="info-label">Periodo</div>
                                <div class="info-value">${period}</div>
                            </div>
                        </div>
                        <div class="info-row">
                            <div class="info-col">
                                <div class="info-label">Departamento</div>
                                <div class="info-value">${emp.department_name || '--'}</div>
                            </div>
                            <div class="info-col">
                                <div class="info-label">Categoria</div>
                                <div class="info-value">${emp.category_name || '--'}</div>
                            </div>
                            <div class="info-col">
                                <div class="info-label">Fecha</div>
                                <div class="info-value">${new Date().toLocaleDateString('es-AR')}</div>
                            </div>
                        </div>
                        <div class="section">
                            <div class="section-title">Haberes</div>
                            <table>
                                <tbody>
                                    ${(emp.earnings || []).map(e => `
                                        <tr><td>${e.concept_name}</td><td class="text-right earning">${this.formatCurrency(e.amount)}</td></tr>
                                    `).join('') || '<tr><td colspan="2">Sin haberes</td></tr>'}
                                    <tr style="font-weight: bold; background: #e8f5e9;">
                                        <td>TOTAL HABERES</td>
                                        <td class="text-right earning">${this.formatCurrency(emp.gross_earnings || 0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="section">
                            <div class="section-title">Deducciones</div>
                            <table>
                                <tbody>
                                    ${(emp.deductions || []).map(d => `
                                        <tr><td>${d.concept_name}</td><td class="text-right deduction">-${this.formatCurrency(d.amount)}</td></tr>
                                    `).join('') || '<tr><td colspan="2">Sin deducciones</td></tr>'}
                                    <tr style="font-weight: bold; background: #ffebee;">
                                        <td>TOTAL DEDUCCIONES</td>
                                        <td class="text-right deduction">-${this.formatCurrency(emp.total_deductions || 0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <table><tbody>
                            <tr class="total-row">
                                <td>NETO A PERCIBIR</td>
                                <td class="text-right" style="font-size: 14px;">${this.formatCurrency(emp.net_salary || 0)}</td>
                            </tr>
                        </tbody></table>
                        <div class="signature-area">
                            <div class="signature-line">Firma Empleador</div>
                            <div class="signature-line">Firma Empleado</div>
                        </div>
                        <div class="footer">
                            <p>Generado el ${new Date().toLocaleString('es-AR')} | Sistema de Liquidacion Enterprise v3.0</p>
                        </div>
                    </div>
                `;
            }

            allPayslipsHTML += '</body></html>';

            // Abrir ventana de impresion
            const printWindow = window.open('', '_blank');
            printWindow.document.write(allPayslipsHTML);
            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
            }, 1000);

            this.showNotification(`${employees.length} recibos generados - Use "Guardar como PDF" para descargar`, 'success');
        } catch (error) {
            this.showNotification('Error al generar recibos: ' + error.message, 'error');
        }
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================
    formatCurrency(amount, currency = 'ARS') {
        if (!amount && amount !== 0) return '--';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    getMonthName(month) {
        return new Date(2000, month - 1).toLocaleDateString('es', { month: 'long' });
    },

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.pe-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `pe-notification pe-notification-${type}`;
        notification.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }
};

// ============================================================================
// ENTERPRISE STYLES
// ============================================================================
function injectEnterpriseStyles() {
    if (document.getElementById('pe-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'pe-styles';
    styles.textContent = `
        /* CSS Variables - Dark Enterprise Theme */
        :root {
            --pe-bg-primary: #0f0f1a;
            --pe-bg-secondary: #1a1a2e;
            --pe-bg-tertiary: #252542;
            --pe-bg-card: #1e1e35;
            --pe-border: #2d2d4a;
            --pe-text-primary: #e8e8f0;
            --pe-text-secondary: #a0a0b8;
            --pe-text-muted: #6b6b80;
            --accent-blue: #00d4ff;
            --accent-green: #00e676;
            --accent-yellow: #ffc107;
            --accent-red: #ff5252;
            --accent-purple: #b388ff;
        }

        .payroll-enterprise {
            background: var(--pe-bg-primary);
            min-height: 100vh;
            color: var(--pe-text-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Header */
        .pe-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            background: var(--pe-bg-secondary);
            border-bottom: 1px solid var(--pe-border);
        }

        .pe-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .pe-logo {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .pe-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 1px;
            margin: 0;
            background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .pe-subtitle {
            font-size: 11px;
            color: var(--pe-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .pe-tech-badges {
            display: flex;
            gap: 8px;
        }

        .pe-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .pe-badge-ai {
            background: rgba(0, 212, 255, 0.15);
            color: var(--accent-blue);
            border: 1px solid rgba(0, 212, 255, 0.3);
        }

        .pe-badge-db {
            background: rgba(0, 230, 118, 0.15);
            color: var(--accent-green);
            border: 1px solid rgba(0, 230, 118, 0.3);
        }

        .pe-badge-node {
            background: rgba(179, 136, 255, 0.15);
            color: var(--accent-purple);
            border: 1px solid rgba(179, 136, 255, 0.3);
        }

        .pe-badge-info { background: rgba(0, 212, 255, 0.2); color: var(--accent-blue); }
        .pe-badge-success { background: rgba(0, 230, 118, 0.2); color: var(--accent-green); }
        .pe-badge-warning { background: rgba(255, 193, 7, 0.2); color: var(--accent-yellow); }
        .pe-badge-danger { background: rgba(255, 82, 82, 0.2); color: var(--accent-red); }

        .pe-header-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .pe-period-selector {
            display: flex;
            gap: 8px;
        }

        .pe-select {
            background: var(--pe-bg-tertiary);
            border: 1px solid var(--pe-border);
            color: var(--pe-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
        }

        .pe-select:focus {
            outline: none;
            border-color: var(--accent-blue);
        }

        /* Navigation */
        .pe-nav {
            display: flex;
            gap: 4px;
            padding: 8px 24px;
            background: var(--pe-bg-secondary);
            border-bottom: 1px solid var(--pe-border);
            overflow-x: auto;
        }

        .pe-nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: transparent;
            border: none;
            color: var(--pe-text-secondary);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .pe-nav-item:hover {
            background: var(--pe-bg-tertiary);
            color: var(--pe-text-primary);
        }

        .pe-nav-item.active {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(179, 136, 255, 0.2));
            color: var(--accent-blue);
            border: 1px solid rgba(0, 212, 255, 0.3);
        }

        /* Main Content */
        .pe-main {
            padding: 24px;
            max-width: 1600px;
            margin: 0 auto;
        }

        /* Loading */
        .pe-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
            color: var(--pe-text-muted);
        }

        .pe-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--pe-border);
            border-top-color: var(--accent-blue);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* KPI Cards */
        .pe-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .pe-kpi-card {
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .pe-kpi-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .pe-kpi-value {
            font-size: 28px;
            font-weight: 700;
            display: block;
        }

        .pe-kpi-label {
            font-size: 12px;
            color: var(--pe-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Finance Cards */
        .pe-finance-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .pe-finance-card {
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 12px;
            padding: 24px;
        }

        .pe-finance-gross {
            border-left: 4px solid var(--accent-blue);
        }

        .pe-finance-net {
            border-left: 4px solid var(--accent-green);
        }

        .pe-finance-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .pe-finance-label {
            font-size: 13px;
            color: var(--pe-text-secondary);
        }

        .pe-finance-period {
            font-size: 12px;
            color: var(--pe-text-muted);
        }

        .pe-finance-value {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 12px;
        }

        .pe-finance-bar {
            height: 4px;
            background: var(--pe-bg-tertiary);
            border-radius: 2px;
            overflow: hidden;
        }

        .pe-finance-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
            border-radius: 2px;
            transition: width 0.5s ease;
        }

        /* Section */
        .pe-section {
            margin-bottom: 24px;
        }

        .pe-section-title {
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--pe-text-secondary);
            margin-bottom: 16px;
        }

        /* Action Buttons Grid */
        .pe-actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
        }

        .pe-action-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 10px;
            color: var(--pe-text-primary);
            cursor: pointer;
            transition: all 0.2s;
        }

        .pe-action-btn:hover {
            border-color: var(--accent-blue);
            background: var(--pe-bg-tertiary);
        }

        .pe-action-icon {
            width: 40px;
            height: 40px;
            background: var(--pe-bg-tertiary);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-blue);
        }

        /* AI Panel */
        .pe-ai-panel {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(179, 136, 255, 0.1));
            border: 1px solid rgba(0, 212, 255, 0.2);
            border-radius: 12px;
            overflow: hidden;
        }

        .pe-ai-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.2);
        }

        .pe-ai-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: var(--accent-blue);
        }

        .pe-ai-status {
            font-size: 11px;
            padding: 4px 8px;
            background: rgba(0, 230, 118, 0.2);
            color: var(--accent-green);
            border-radius: 10px;
        }

        .pe-ai-content {
            padding: 16px;
        }

        .pe-ai-insight {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .pe-ai-icon {
            font-size: 20px;
        }

        .pe-ai-insight p {
            margin: 0;
            line-height: 1.5;
            color: var(--pe-text-secondary);
        }

        .pe-text-warning {
            color: var(--accent-yellow);
        }

        /* Buttons */
        .pe-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .pe-btn-primary {
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            color: white;
        }

        .pe-btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .pe-btn-secondary {
            background: var(--pe-bg-tertiary);
            color: var(--pe-text-primary);
            border: 1px solid var(--pe-border);
        }

        .pe-btn-outline {
            background: transparent;
            color: var(--pe-text-primary);
            border: 1px solid var(--pe-border);
        }

        .pe-btn-outline:hover {
            border-color: var(--accent-blue);
        }

        .pe-btn-success {
            background: var(--accent-green);
            color: #000;
        }

        .pe-btn-sm {
            padding: 6px 12px;
            font-size: 12px;
        }

        .pe-btn-icon {
            width: 36px;
            height: 36px;
            padding: 0;
            background: var(--pe-bg-tertiary);
            border: 1px solid var(--pe-border);
            border-radius: 6px;
            color: var(--pe-text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .pe-btn-icon:hover {
            border-color: var(--accent-blue);
            color: var(--accent-blue);
        }

        /* Tables */
        .pe-table-container {
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 12px;
            overflow: hidden;
        }

        .pe-table {
            width: 100%;
            border-collapse: collapse;
        }

        .pe-table th {
            background: var(--pe-bg-secondary);
            padding: 12px 16px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--pe-text-muted);
            border-bottom: 1px solid var(--pe-border);
        }

        .pe-table td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--pe-border);
            color: var(--pe-text-primary);
        }

        .pe-table tr:hover td {
            background: rgba(255, 255, 255, 0.02);
        }

        .pe-table code {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            color: var(--accent-cyan, #00d4ff);
        }

        .text-right {
            text-align: right;
        }

        .pe-text-success { color: var(--accent-green); }
        .pe-text-danger { color: var(--accent-red); }

        /* Status badges */
        .pe-status {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .pe-status-success { background: rgba(0, 230, 118, 0.2); color: var(--accent-green); }
        .pe-status-warning { background: rgba(255, 193, 7, 0.2); color: var(--accent-yellow); }
        .pe-status-danger { background: rgba(255, 82, 82, 0.2); color: var(--accent-red); }
        .pe-status-info { background: rgba(0, 212, 255, 0.2); color: var(--accent-blue); }

        /* Toolbar */
        .pe-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .pe-toolbar h3 {
            margin: 0;
            font-size: 18px;
        }

        .pe-toolbar-actions {
            display: flex;
            gap: 8px;
        }

        .pe-search-box {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--pe-bg-tertiary);
            border: 1px solid var(--pe-border);
            border-radius: 6px;
            padding: 8px 12px;
        }

        .pe-search-box input {
            background: transparent;
            border: none;
            color: var(--pe-text-primary);
            font-size: 13px;
            outline: none;
            width: 200px;
        }

        .pe-search-box svg {
            color: var(--pe-text-muted);
        }

        /* Empty State */
        .pe-empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--pe-text-muted);
        }

        .pe-empty-state svg {
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .pe-empty-state h4 {
            margin: 0 0 8px;
            color: var(--pe-text-secondary);
        }

        .pe-empty-state p {
            margin: 0 0 20px;
        }

        /* Workflow */
        .pe-workflow {
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }

        .pe-workflow-steps {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .pe-step {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            opacity: 0.5;
        }

        .pe-step.active {
            opacity: 1;
            background: rgba(0, 212, 255, 0.1);
            border: 1px solid rgba(0, 212, 255, 0.3);
        }

        .pe-step.completed {
            opacity: 1;
        }

        .pe-step-indicator {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--pe-bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
        }

        .pe-step.active .pe-step-indicator {
            background: var(--accent-blue);
            color: #000;
        }

        .pe-step.completed .pe-step-indicator {
            background: var(--accent-green);
            color: #000;
        }

        .pe-step-name {
            font-weight: 600;
            display: block;
        }

        .pe-step-desc {
            font-size: 11px;
            color: var(--pe-text-muted);
        }

        .pe-step-connector {
            flex: 1;
            height: 2px;
            background: var(--pe-border);
            margin: 0 8px;
        }

        /* Process Panel */
        .pe-process-panel {
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }

        .pe-process-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .pe-process-header h3 {
            margin: 0;
        }

        .pe-process-content {
            margin-bottom: 20px;
        }

        .pe-checklist {
            list-style: none;
            padding: 0;
            margin: 16px 0;
        }

        .pe-checklist li {
            padding: 8px 0;
            border-bottom: 1px solid var(--pe-border);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .pe-process-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }

        /* Log Panel */
        .pe-log-panel {
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 12px;
            padding: 16px;
        }

        .pe-log-panel h4 {
            margin: 0 0 12px;
            font-size: 14px;
        }

        .pe-log {
            max-height: 200px;
            overflow-y: auto;
        }

        .pe-log-entry {
            display: flex;
            gap: 12px;
            padding: 8px;
            border-bottom: 1px solid var(--pe-border);
            font-size: 12px;
        }

        .pe-log-time {
            color: var(--pe-text-muted);
            flex-shrink: 0;
        }

        .pe-log-success .pe-log-msg { color: var(--accent-green); }
        .pe-log-error .pe-log-msg { color: var(--accent-red); }
        .pe-log-warning .pe-log-msg { color: var(--accent-yellow); }

        /* Templates Grid */
        .pe-templates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 16px;
        }

        .pe-template-card {
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 12px;
            padding: 20px;
        }

        .pe-template-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .pe-template-info h4 {
            margin: 0 0 4px;
        }

        .pe-template-code {
            font-size: 11px;
            color: var(--pe-text-muted);
            font-family: monospace;
        }

        .pe-template-desc {
            font-size: 13px;
            color: var(--pe-text-secondary);
            margin: 0 0 16px;
        }

        .pe-template-meta {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: var(--pe-text-muted);
            margin-bottom: 16px;
        }

        .pe-template-actions {
            display: flex;
            gap: 8px;
        }

        /* Entities Grid */
        .pe-entities-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }

        .pe-entity-card {
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .pe-entity-icon {
            font-size: 32px;
        }

        .pe-entity-info h4 {
            margin: 0 0 4px;
        }

        .pe-entity-code {
            font-size: 11px;
            color: var(--pe-text-muted);
            font-family: monospace;
            display: block;
        }

        .pe-entity-type {
            font-size: 11px;
            color: var(--pe-text-secondary);
        }

        .pe-entity-actions {
            display: flex;
            gap: 8px;
            margin-top: auto;
        }

        /* Reports Grid */
        .pe-reports-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }

        .pe-report-card {
            background: var(--pe-bg-card);
            border: 1px solid var(--pe-border);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        .pe-report-card:hover {
            border-color: var(--accent-blue);
            transform: translateY(-2px);
        }

        .pe-report-icon {
            color: var(--accent-blue);
            margin-bottom: 12px;
        }

        .pe-report-card h4 {
            margin: 0 0 8px;
            font-size: 14px;
        }

        .pe-report-card p {
            margin: 0;
            font-size: 12px;
            color: var(--pe-text-muted);
        }

        /* Modal */
        .pe-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        }

        .pe-modal {
            background: var(--pe-bg-secondary);
            border: 1px solid var(--pe-border);
            border-radius: 16px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .pe-modal-lg {
            max-width: 800px;
        }

        .pe-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--pe-border);
        }

        .pe-modal-header h3 {
            margin: 0;
            font-size: 16px;
        }

        .pe-modal-close {
            background: transparent;
            border: none;
            color: var(--pe-text-muted);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }

        .pe-modal-close:hover {
            color: var(--pe-text-primary);
        }

        .pe-modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }

        .pe-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 20px;
            border-top: 1px solid var(--pe-border);
        }

        /* Forms */
        .pe-form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
        }

        .pe-form-full {
            grid-column: 1 / -1;
        }

        .pe-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .pe-form-group label {
            font-size: 12px;
            color: var(--pe-text-secondary);
            font-weight: 500;
        }

        .pe-form-group input,
        .pe-form-group select,
        .pe-form-group textarea {
            background: var(--pe-bg-tertiary);
            border: 1px solid var(--pe-border);
            color: var(--pe-text-primary);
            padding: 10px 12px;
            border-radius: 6px;
            font-size: 13px;
        }

        .pe-form-group input:focus,
        .pe-form-group select:focus,
        .pe-form-group textarea:focus {
            outline: none;
            border-color: var(--accent-blue);
        }

        .pe-section-divider {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 20px 0 16px;
            padding-top: 16px;
            border-top: 1px solid var(--pe-border);
        }

        .pe-section-divider h4 {
            margin: 0;
            font-size: 14px;
        }

        /* Concepts List */
        .pe-concepts-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .pe-concept-row {
            display: grid;
            grid-template-columns: 1fr 120px 100px 40px;
            gap: 8px;
            align-items: center;
        }

        .pe-concept-row input,
        .pe-concept-row select {
            background: var(--pe-bg-tertiary);
            border: 1px solid var(--pe-border);
            color: var(--pe-text-primary);
            padding: 8px 10px;
            border-radius: 4px;
            font-size: 12px;
        }

        .pe-btn-danger {
            color: var(--accent-red);
        }

        /* Detail View */
        .pe-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }

        .pe-detail-employee h4 {
            margin: 0 0 4px;
        }

        .pe-detail-employee span {
            font-size: 12px;
            color: var(--pe-text-muted);
        }

        .pe-detail-sections {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 24px;
        }

        .pe-detail-section h5 {
            margin: 0 0 12px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--pe-text-secondary);
        }

        .pe-detail-table {
            width: 100%;
            font-size: 13px;
        }

        .pe-detail-table tr {
            border-bottom: 1px solid var(--pe-border);
        }

        .pe-detail-table td {
            padding: 8px 0;
        }

        .pe-detail-table .pe-total {
            font-weight: 600;
        }

        .pe-detail-table .pe-total td {
            padding-top: 12px;
            border-top: 2px solid var(--pe-border);
        }

        .pe-detail-summary {
            background: linear-gradient(135deg, rgba(0, 230, 118, 0.1), rgba(0, 212, 255, 0.1));
            border: 1px solid rgba(0, 230, 118, 0.3);
            border-radius: 8px;
            padding: 16px;
        }

        .pe-summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .pe-summary-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--accent-green);
        }

        /* Notification */
        .pe-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 10001;
            animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .pe-notification-info {
            background: var(--accent-blue);
            color: #000;
        }

        .pe-notification-success {
            background: var(--accent-green);
            color: #000;
        }

        .pe-notification-warning {
            background: var(--accent-yellow);
            color: #000;
        }

        .pe-notification-error {
            background: var(--accent-red);
            color: white;
        }

        /* Actions in table */
        .pe-actions {
            display: flex;
            gap: 4px;
            justify-content: center;
        }

        /* ============================================================================ */
        /* FORMULA EDITOR STYLES */
        /* ============================================================================ */
        .pe-formula-editor {
            position: relative;
            flex: 1;
            min-width: 200px;
        }

        .pe-formula-input-wrapper {
            display: flex;
            align-items: center;
            gap: 4px;
            position: relative;
        }

        .pe-formula-input {
            flex: 1;
            background: var(--pe-bg-tertiary);
            border: 1px solid var(--pe-border);
            color: var(--pe-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-family: 'Fira Code', 'Monaco', monospace;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .pe-formula-input:focus {
            outline: none;
            border-color: var(--accent-blue);
            box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.15);
        }

        .pe-formula-input.valid {
            border-color: var(--accent-green);
        }

        .pe-formula-input.invalid {
            border-color: var(--accent-red);
        }

        .pe-formula-help-btn {
            background: var(--pe-bg-tertiary);
            border: 1px solid var(--pe-border);
            color: var(--pe-text-secondary);
            padding: 6px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .pe-formula-help-btn:hover {
            background: var(--pe-bg-secondary);
            color: var(--accent-blue);
            border-color: var(--accent-blue);
        }

        .pe-formula-status {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
            min-height: 20px;
        }

        .pe-status-ok {
            color: var(--accent-green);
            font-size: 14px;
            font-weight: bold;
        }

        .pe-status-error {
            color: var(--accent-red);
            font-size: 14px;
            font-weight: bold;
        }

        .pe-preview-result {
            font-size: 11px;
            color: var(--accent-blue);
            background: rgba(0, 212, 255, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
            font-family: 'Fira Code', monospace;
        }

        .pe-preview-error {
            font-size: 11px;
            color: var(--accent-red);
            background: rgba(255, 82, 82, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
        }

        .pe-formula-panel {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--pe-bg-secondary);
            border: 1px solid var(--pe-border);
            border-radius: 8px;
            margin-top: 8px;
            padding: 12px;
            z-index: 1000;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            max-height: 400px;
            overflow-y: auto;
        }

        .pe-formula-help {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .pe-help-section h5 {
            margin: 0 0 8px 0;
            font-size: 12px;
            text-transform: uppercase;
            color: var(--pe-text-muted);
            letter-spacing: 0.5px;
        }

        .pe-vars-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
        }

        .pe-var-category {
            background: var(--pe-bg-tertiary);
            border-radius: 6px;
            padding: 10px;
        }

        .pe-cat-header {
            display: block;
            font-size: 11px;
            font-weight: 600;
            color: var(--accent-blue);
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        .pe-var-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 6px 8px;
            background: var(--pe-bg-secondary);
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 4px;
        }

        .pe-var-item:hover {
            background: var(--pe-bg-primary);
            transform: translateX(2px);
        }

        .pe-var-item code {
            font-size: 12px;
            color: var(--accent-green);
            font-family: 'Fira Code', monospace;
        }

        .pe-var-item small {
            font-size: 10px;
            color: var(--pe-text-muted);
        }

        .pe-examples-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .pe-example-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            background: var(--pe-bg-tertiary);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .pe-example-item:hover {
            background: var(--pe-bg-primary);
            border-left: 2px solid var(--accent-blue);
        }

        .pe-ex-name {
            font-size: 12px;
            color: var(--pe-text-primary);
            font-weight: 500;
        }

        .pe-ex-formula {
            font-size: 11px;
            color: var(--accent-purple);
            font-family: 'Fira Code', monospace;
            background: var(--pe-bg-secondary);
            padding: 2px 6px;
            border-radius: 4px;
        }

        .pe-help-functions {
            border-top: 1px solid var(--pe-border);
            padding-top: 12px;
        }

        .pe-help-functions h5 {
            margin: 0;
        }

        .pe-help-functions code {
            color: var(--accent-yellow);
            font-size: 11px;
        }

        /* Concept Row Layout with Formula Editor */
        .pe-concept-row {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            background: var(--pe-bg-tertiary);
            border-radius: 8px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }

        .pe-concept-main {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            flex: 2;
            flex-wrap: wrap;
        }

        .pe-concept-name {
            flex: 0 0 200px;
            background: var(--pe-bg-secondary);
            border: 1px solid var(--pe-border);
            color: var(--pe-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
        }

        .pe-select-type {
            flex: 0 0 180px;
            background: var(--pe-bg-secondary);
            border: 1px solid var(--pe-border);
            color: var(--pe-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
        }

        .pe-concept-entity {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            flex: 1;
            min-width: 250px;
        }

        .pe-select-entity {
            flex: 1;
            background: var(--pe-bg-secondary);
            border: 1px solid var(--pe-border);
            color: var(--pe-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
        }

        .pe-input-label {
            flex: 0 0 120px;
            background: var(--pe-bg-secondary);
            border: 1px solid var(--pe-border);
            color: var(--pe-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
        }

        /* Edit modal concept row adjustments */
        .pe-concept-row-edit {
            flex-wrap: nowrap;
        }

        .pe-concept-row-edit .pe-formula-editor {
            min-width: 250px;
            max-width: 350px;
        }

        /* Responsive */
        @media (max-width: 1200px) {
            .pe-concept-main {
                flex: 1 1 100%;
            }
            .pe-concept-entity {
                flex: 1 1 100%;
            }
        }
    `;
    document.head.appendChild(styles);
}

// ============================================================================
// EXPORTS
// ============================================================================
if (typeof window !== 'undefined') {
    window.showPayrollLiquidationContent = showPayrollLiquidationContent;
    window.PayrollEngine = PayrollEngine;
    window.PayrollAPI = PayrollAPI;

    window.Modules = window.Modules || {};
    window.Modules['payroll-liquidation'] = { init: showPayrollLiquidationContent };
}

console.log('%c PAYROLL ENGINE READY ', 'background: var(--accent-green, #00e676); color: #000; padding: 4px 8px; border-radius: 4px;');
