/**
 * ============================================================================
 * SUPPORT AI AGENT - Agente de Soporte Autónomo 24/7
 * ============================================================================
 *
 * Reemplaza al equipo de soporte humano:
 * - Responde preguntas de usuarios en tiempo real
 * - Guía paso a paso para resolver problemas
 * - Diagnóstica errores automáticamente
 * - Escala SOLO si no puede resolver
 *
 * INTEGRADO CON:
 * - NLU Service: Comprensión de lenguaje natural
 * - Knowledge Database: Base de conocimiento
 * - Flow Recorder: Flujos y tutoriales
 * - Brain Nervous System: Diagnóstico de errores
 *
 * @version 2.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const { getInstance: getKnowledgeDB } = require('../services/KnowledgeDatabase');
const { getInstance: getNLU } = require('../services/NLUService');
const FlowRecorder = require('../crawlers/FlowRecorder');

class SupportAIAgent {
    constructor(options = {}) {
        this.config = {
            maxAutoAttempts: 3,
            escalationThreshold: 0.3, // Escalar si confidence < 30%
            useNLU: true, // Usar procesamiento de lenguaje natural
            ...options
        };

        this.knowledgeDB = null;
        this.flowRecorder = null;
        this.nlu = null;
        this.conversationHistory = new Map(); // sessionId -> messages[]

        this.stats = {
            questionsAnswered: 0,
            autoResolved: 0,
            escalated: 0,
            avgConfidence: 0,
            avgNLUTime: 0
        };
    }

    /**
     * Inicializar el agente
     */
    async initialize() {
        console.log('🤖 [SUPPORT-AI] Inicializando agente de soporte...');

        this.knowledgeDB = await getKnowledgeDB();
        this.flowRecorder = new FlowRecorder();
        this.nlu = getNLU();

        console.log('   📚 Knowledge Database: conectado');
        console.log('   🧠 NLU Service: conectado');
        console.log('✅ [SUPPORT-AI] Agente listo');
        return this;
    }

    /**
     * ========================================================================
     * PROCESAR PREGUNTA DEL USUARIO
     * ========================================================================
     */

    /**
     * Responder a una pregunta del usuario
     */
    async handleQuestion(question, context = {}) {
        const startTime = Date.now();
        this.stats.questionsAnswered++;

        console.log(`\n💬 [SUPPORT-AI] Pregunta: "${question.substring(0, 50)}..."`);

        const response = {
            question,
            answer: null,
            steps: [],
            suggestedActions: [],
            relatedFlows: [],
            confidence: 0,
            escalated: false,
            responseTime: 0,
            nlu: null // Resultados del NLU para el frontend
        };

        try {
            // 1. Procesar con NLU (comprensión de lenguaje natural)
            let nluResult = null;
            let intent = null;

            if (this.config.useNLU && this.nlu) {
                nluResult = this.nlu.process(question, context);
                intent = nluResult.intent;
                response.nlu = {
                    intent: nluResult.intent,
                    entities: nluResult.entities,
                    sentiment: nluResult.sentiment,
                    urgency: nluResult.urgency,
                    isQuestion: nluResult.isQuestion
                };
                console.log(`   🧠 NLU Intent: ${intent.type} (${intent.confidence.toFixed(2)})`);
                console.log(`   📦 Entities: ${nluResult.entities.modules.map(m => m.key).join(', ') || 'ninguno'}`);
                console.log(`   😊 Sentiment: ${nluResult.sentiment.type} | Urgency: ${nluResult.urgency.level}`);
            } else {
                // Fallback al análisis básico
                intent = this.analyzeIntent(question);
                console.log(`   Intent: ${intent.type} (${intent.confidence.toFixed(2)})`);
            }

            // Mapear intents de NLU a los tipos internos
            const intentType = this.mapNLUIntent(intent.type);

            // 2. Buscar en base de conocimiento (usando keywords del NLU si está disponible)
            const searchQuery = nluResult?.keywords?.join(' ') || question;
            const searchResults = await this.knowledgeDB.search(searchQuery, {
                ...context,
                detectedModules: nluResult?.entities?.modules?.map(m => m.key) || []
            });

            // 3. Generar respuesta según el tipo de intent
            switch (intentType) {
                case 'howTo':
                    response.answer = await this.generateHowToAnswer(question, searchResults, context, nluResult);
                    break;

                case 'troubleshoot':
                    response.answer = await this.generateTroubleshootAnswer(question, searchResults, context, nluResult);
                    break;

                case 'info':
                    response.answer = await this.generateInfoAnswer(question, searchResults, context, nluResult);
                    break;

                case 'action':
                    response.answer = await this.generateActionAnswer(question, searchResults, context, nluResult);
                    break;

                case 'navigation':
                    response.answer = await this.generateNavigationAnswer(question, searchResults, context, nluResult);
                    break;

                case 'greeting':
                    response.answer = this.generateGreetingResponse(context);
                    response.confidence = 1.0;
                    break;

                case 'farewell':
                    response.answer = this.generateFarewellResponse(context);
                    response.confidence = 1.0;
                    break;

                case 'confirmation':
                    response.answer = '¡Perfecto! ¿En qué más puedo ayudarte?';
                    response.confidence = 1.0;
                    break;

                case 'pricing':
                    response.answer = await this.generatePricingAnswer(question, context, nluResult);
                    break;

                default:
                    response.answer = await this.generateGenericAnswer(question, searchResults, context, nluResult);
            }

            // 4. Agregar flujos relacionados
            if (searchResults.relatedFlows?.length > 0) {
                response.relatedFlows = searchResults.relatedFlows.map(f => ({
                    id: f.flowId,
                    name: f.name,
                    description: f.description
                }));
            }

            // 5. Agregar acciones sugeridas
            if (searchResults.suggestedActions?.length > 0) {
                response.suggestedActions = searchResults.suggestedActions;
            }

            // 6. Calcular confianza
            response.confidence = this.calculateConfidence(searchResults, intent);

            // 7. Verificar si necesita escalamiento
            if (response.confidence < this.config.escalationThreshold) {
                response.escalated = true;
                response.answer = this.addEscalationNote(response.answer);
                this.stats.escalated++;
            } else {
                this.stats.autoResolved++;
            }

            // Actualizar estadísticas
            this.stats.avgConfidence = (
                (this.stats.avgConfidence * (this.stats.questionsAnswered - 1) + response.confidence) /
                this.stats.questionsAnswered
            );

        } catch (error) {
            console.error('   ❌ Error:', error.message);
            response.answer = 'Lo siento, hubo un error procesando tu pregunta. Por favor, intenta reformularla.';
            response.confidence = 0;
            response.escalated = true;
        }

        response.responseTime = Date.now() - startTime;
        console.log(`   ✅ Respondido en ${response.responseTime}ms (confidence: ${(response.confidence * 100).toFixed(0)}%)`);

        return response;
    }

    /**
     * ========================================================================
     * ANÁLISIS DE INTENCIÓN
     * ========================================================================
     */

    /**
     * Analizar la intención de una pregunta
     */
    analyzeIntent(question) {
        const q = question.toLowerCase();

        // Patrones de intención
        const patterns = {
            'how-to': {
                keywords: ['cómo', 'como', 'de qué manera', 'pasos para', 'forma de', 'manera de', 'puedo'],
                weight: 0.9
            },
            'troubleshoot': {
                keywords: ['no funciona', 'error', 'problema', 'falla', 'no puedo', 'no me deja', 'no carga', 'se traba'],
                weight: 0.95
            },
            'info': {
                keywords: ['qué es', 'que es', 'para qué sirve', 'para que sirve', 'significa', 'cuál es', 'cual es'],
                weight: 0.8
            },
            'action': {
                keywords: ['necesito', 'quiero', 'ayúdame a', 'ayudame a', 'haz', 'ejecuta', 'muestra'],
                weight: 0.85
            }
        };

        let bestMatch = { type: 'generic', confidence: 0.5, matchedKeywords: [] };

        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = pattern.keywords.filter(kw => q.includes(kw));
            if (matches.length > 0) {
                const confidence = (matches.length / pattern.keywords.length) * pattern.weight;
                if (confidence > bestMatch.confidence) {
                    bestMatch = {
                        type,
                        confidence: Math.min(confidence + 0.3, 1),
                        matchedKeywords: matches
                    };
                }
            }
        }

        return bestMatch;
    }

    /**
     * ========================================================================
     * GENERACIÓN DE RESPUESTAS
     * ========================================================================
     */

    /**
     * Generar respuesta tipo "cómo hacer"
     */
    async generateHowToAnswer(question, searchResults, context) {
        let answer = '';

        // Si hay FAQ relevante
        if (searchResults.answers?.length > 0) {
            const topAnswer = searchResults.answers[0];
            answer = topAnswer.answer;

            // Si hay un flujo relacionado, agregar los pasos
            if (searchResults.relatedFlows?.length > 0) {
                const flow = this.flowRecorder.getFlow(searchResults.relatedFlows[0].flowId);
                if (flow?.steps) {
                    answer += '\n\n**Pasos detallados:**\n';
                    flow.steps.forEach((step, i) => {
                        answer += `${i + 1}. ${step.description}\n`;
                    });
                }
            }
        } else {
            // Respuesta genérica basada en el módulo detectado
            if (searchResults.suggestedActions?.length > 0) {
                const action = searchResults.suggestedActions[0];
                answer = `Para realizar esta acción, ve a "${action.label}" y sigue las instrucciones en pantalla.`;
            } else {
                answer = 'No encontré instrucciones específicas para esto. ¿Podrías darme más detalles sobre qué intentas hacer?';
            }
        }

        return answer;
    }

    /**
     * Generar respuesta de troubleshooting
     */
    async generateTroubleshootAnswer(question, searchResults, context) {
        const q = question.toLowerCase();

        // Diagnóstico basado en palabras clave
        const diagnostics = [
            {
                keywords: ['no carga', 'no aparece', 'vacío', 'vacio'],
                solution: '1. Refresca la página (F5)\n2. Limpia el caché del navegador\n3. Verifica tu conexión a internet\n4. Si persiste, cierra sesión y vuelve a entrar'
            },
            {
                keywords: ['error', 'falla', 'crashed'],
                solution: '1. Toma una captura del error\n2. Refresca la página\n3. Intenta la acción nuevamente\n4. Si el error persiste, reporta con la captura'
            },
            {
                keywords: ['no puedo', 'no me deja', 'bloqueado'],
                solution: '1. Verifica que tienes los permisos necesarios\n2. Revisa que todos los campos requeridos estén completos\n3. Intenta con otro navegador\n4. Contacta a tu administrador si crees que deberías tener acceso'
            },
            {
                keywords: ['lento', 'tarda', 'demora'],
                solution: '1. Verifica tu conexión a internet\n2. Cierra otras pestañas del navegador\n3. Limpia el caché\n4. Intenta en otro momento si el problema persiste'
            }
        ];

        for (const diag of diagnostics) {
            if (diag.keywords.some(kw => q.includes(kw))) {
                return `**Diagnóstico automático:**\n\n${diag.solution}`;
            }
        }

        // Respuesta genérica de troubleshooting
        return `**Pasos generales de solución:**

1. Refresca la página (F5 o Ctrl+R)
2. Cierra sesión y vuelve a iniciar
3. Intenta con otro navegador
4. Limpia caché y cookies

Si el problema persiste, describe exactamente:
- ¿Qué acción intentabas realizar?
- ¿Qué mensaje de error viste?
- ¿En qué pantalla ocurrió?`;
    }

    /**
     * Generar respuesta informativa
     */
    async generateInfoAnswer(question, searchResults, context) {
        if (searchResults.answers?.length > 0) {
            return searchResults.answers[0].answer;
        }

        // Buscar en módulos
        const moduleMatch = Object.entries(this.knowledgeDB.cache.modules || {})
            .find(([key, mod]) => question.toLowerCase().includes(key));

        if (moduleMatch) {
            return `**${moduleMatch[0]}** es un módulo del sistema que permite gestionar ${moduleMatch[0].replace(/_/g, ' ')}.

Para más información, navega al módulo desde el menú lateral.`;
        }

        return 'No encontré información específica sobre esto. ¿Podrías ser más específico?';
    }

    /**
     * Generar respuesta de acción
     */
    async generateActionAnswer(question, searchResults, context) {
        if (searchResults.suggestedActions?.length > 0) {
            const action = searchResults.suggestedActions[0];
            return `Para ayudarte, te sugiero:\n\n**Acción:** ${action.label}\n\nHaz click en el botón correspondiente o navega a la sección indicada.`;
        }

        return 'Entiendo que quieres realizar una acción. ¿Podrías especificar qué tarea necesitas completar?';
    }

    /**
     * Generar respuesta genérica
     */
    async generateGenericAnswer(question, searchResults, context) {
        if (searchResults.answers?.length > 0) {
            return searchResults.answers[0].answer;
        }

        return `Gracias por tu pregunta. Para poder ayudarte mejor:

1. Especifica qué módulo o función estás usando
2. Describe el resultado que esperas
3. Menciona si ves algún mensaje de error

Estoy aquí para ayudarte con cualquier duda sobre el sistema.`;
    }

    /**
     * ========================================================================
     * UTILIDADES
     * ========================================================================
     */

    /**
     * Calcular confianza de la respuesta
     */
    calculateConfidence(searchResults, intent) {
        let confidence = intent.confidence * 0.3; // Base del intent

        if (searchResults.answers?.length > 0) {
            confidence += searchResults.answers[0].score * 0.4;
        }

        if (searchResults.relatedFlows?.length > 0) {
            confidence += 0.2;
        }

        if (searchResults.suggestedActions?.length > 0) {
            confidence += 0.1;
        }

        return Math.min(confidence, 1);
    }

    /**
     * Agregar nota de escalamiento
     */
    addEscalationNote(answer) {
        return `${answer}

---
⚠️ *Esta respuesta tiene baja confianza. Si no resuelve tu problema, un agente humano será notificado para asistirte.*`;
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        return {
            ...this.stats,
            resolutionRate: this.stats.questionsAnswered > 0
                ? ((this.stats.autoResolved / this.stats.questionsAnswered) * 100).toFixed(1) + '%'
                : 'N/A'
        };
    }

    /**
     * Procesar feedback del usuario
     */
    async processFeedback(questionId, helpful, comment = '') {
        // Aprender de feedback positivo
        if (helpful) {
            console.log(`   👍 Feedback positivo para pregunta ${questionId}`);
            // Podría agregar a la base de conocimiento
        } else {
            console.log(`   👎 Feedback negativo para pregunta ${questionId}: ${comment}`);
            // Marcar para revisión humana
        }
    }

    /**
     * ========================================================================
     * MÉTODOS DE NLU INTEGRADOS
     * ========================================================================
     */

    /**
     * Mapear intents del NLU a tipos internos
     */
    mapNLUIntent(nluIntent) {
        const mapping = {
            'how-to': 'howTo',
            'howTo': 'howTo',
            'troubleshoot': 'troubleshoot',
            'info': 'info',
            'action': 'action',
            'navigation': 'navigation',
            'pricing': 'pricing',
            'confirmation': 'confirmation',
            'cancellation': 'cancellation',
            'greeting': 'greeting',
            'farewell': 'farewell'
        };
        return mapping[nluIntent] || 'generic';
    }

    /**
     * Generar respuesta de navegación
     */
    async generateNavigationAnswer(question, searchResults, context, nluResult) {
        if (nluResult?.entities?.modules?.length > 0) {
            const module = nluResult.entities.modules[0];
            return `Para acceder a **${module.label}**, sigue estos pasos:

1. En el menú lateral izquierdo, busca la sección correspondiente
2. Haz click en "${module.label}"
3. Se abrirá el panel principal del módulo

💡 **Tip:** Puedes usar el buscador rápido (Ctrl+K) para navegar más rápido.`;
        }

        return 'Por favor, indicame a qué sección quieres ir y te guiaré.';
    }

    /**
     * Generar respuesta de saludo
     */
    generateGreetingResponse(context) {
        const userName = context.userName || 'usuario';
        const hour = new Date().getHours();

        let greeting = '¡Hola';
        if (hour < 12) greeting = '¡Buenos días';
        else if (hour < 19) greeting = '¡Buenas tardes';
        else greeting = '¡Buenas noches';

        return `${greeting}, ${userName}! 👋

Soy tu asistente virtual del Sistema de Asistencia. Puedo ayudarte con:

📋 **Consultas sobre módulos** - Usuarios, Asistencia, Vacaciones, etc.
🔧 **Solución de problemas** - Si algo no funciona, dime qué pasa
📖 **Tutoriales** - Te guío paso a paso
📊 **Reportes** - Cómo generarlos y descargarlos

¿En qué puedo ayudarte hoy?`;
    }

    /**
     * Generar respuesta de despedida
     */
    generateFarewellResponse(context) {
        return `¡Gracias por usar el asistente!

Si necesitas más ayuda, estaré aquí. 👋

📌 **Recuerda:** Puedes volver a consultarme en cualquier momento haciendo click en el ícono de chat.`;
    }

    /**
     * Generar respuesta de pricing (redirige a Sales AI)
     */
    async generatePricingAnswer(question, context, nluResult) {
        return `Para información sobre **planes y precios**, te puedo conectar con nuestro asistente de ventas que tiene toda la información actualizada.

💰 **Opciones disponibles:**
- **Starter:** Ideal para empresas pequeñas (hasta 25 empleados)
- **Professional:** Para empresas en crecimiento (hasta 100 empleados)
- **Enterprise:** Sin límites, todo incluido

¿Te gustaría iniciar una **demo interactiva** para ver todas las funcionalidades?

*Escribe "demo" para comenzar un tour guiado del sistema.*`;
    }

    /**
     * ========================================================================
     * HISTORIAL DE CONVERSACIÓN (Para tours y contexto)
     * ========================================================================
     */

    /**
     * Guardar mensaje en historial
     */
    saveToHistory(sessionId, role, message) {
        if (!this.conversationHistory.has(sessionId)) {
            this.conversationHistory.set(sessionId, []);
        }

        this.conversationHistory.get(sessionId).push({
            role, // 'user' o 'assistant'
            message,
            timestamp: new Date().toISOString()
        });

        // Mantener solo los últimos 20 mensajes
        const history = this.conversationHistory.get(sessionId);
        if (history.length > 20) {
            history.shift();
        }
    }

    /**
     * Obtener historial de conversación
     */
    getHistory(sessionId) {
        return this.conversationHistory.get(sessionId) || [];
    }

    /**
     * Limpiar historial
     */
    clearHistory(sessionId) {
        this.conversationHistory.delete(sessionId);
    }

    /**
     * Obtener contexto de la conversación para respuestas más inteligentes
     */
    getConversationContext(sessionId) {
        const history = this.getHistory(sessionId);
        if (history.length === 0) return null;

        // Analizar los últimos mensajes para entender contexto
        const lastMessages = history.slice(-5);
        const topics = new Set();
        const actions = new Set();

        for (const msg of lastMessages) {
            if (msg.role === 'user' && this.nlu) {
                const analysis = this.nlu.process(msg.message);
                analysis.entities.modules.forEach(m => topics.add(m.key));
                analysis.entities.actions.forEach(a => actions.add(a));
            }
        }

        return {
            messageCount: history.length,
            topics: Array.from(topics),
            actions: Array.from(actions),
            lastMessageTime: history[history.length - 1]?.timestamp
        };
    }
}

// Singleton
let instance = null;

module.exports = {
    SupportAIAgent,
    getInstance: async () => {
        if (!instance) {
            instance = new SupportAIAgent();
            await instance.initialize();
        }
        return instance;
    }
};
