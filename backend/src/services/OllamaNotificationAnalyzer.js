/**
 * OLLAMA NOTIFICATION ANALYZER SERVICE
 *
 * Sistema de Inteligencia Artificial para análisis proactivo de notificaciones
 *
 * Funcionalidades:
 * - Analiza hilos de notificaciones para detectar si ya fueron respondidos
 * - Busca respuestas similares en base de conocimiento aprendida
 * - Sugiere respuestas automáticas basadas en preguntas anteriores
 * - Aprende de respuestas aceptadas para mejorar sugerencias futuras
 * - Detecta anomalías y patrones en las comunicaciones
 *
 * Ejemplo de uso:
 * - José pregunta: "¿Hasta cuándo tengo tiempo de presentar el certificado de escolaridad?"
 * - RRHH responde: "Hasta el 15 de marzo"
 * - Pedro pregunta: "¿El certificado de escolaridad me lo dan el 10 de abril, estoy a tiempo?"
 * - Ollama detecta la pregunta similar, sugiere respuesta basada en la anterior
 *
 * @technology Ollama + Llama 3.1 (8B) + PostgreSQL
 * @version 1.0.0
 * @created 2025-12-02
 */

const { sequelize } = require('../config/database');
const axios = require('axios');
const cron = require('node-cron');

class OllamaNotificationAnalyzer {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;

        this.config = {
            ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
            temperature: parseFloat(process.env.OLLAMA_TEMPERATURE) || 0.3, // Lower for more consistent responses
            maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS) || 500,
            timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 30000,

            // Umbrales de confianza
            minConfidenceForSuggestion: 0.6,
            minConfidenceForAutoResponse: 0.85,
            minSimilarityScore: 0.4,

            // Análisis automático cada 5 minutos
            analysisSchedule: '*/5 * * * *'
        };

        this.ollamaAvailable = false;
    }

    /**
     * Iniciar el servicio
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ [OLLAMA-ANALYZER] Servicio ya está corriendo');
            return;
        }

        console.log('🧠 [OLLAMA-ANALYZER] Iniciando servicio de análisis inteligente...');

        // Verificar conexión con Ollama
        await this.checkOllamaConnection();

        if (!this.ollamaAvailable) {
            console.warn('⚠️ [OLLAMA-ANALYZER] Ollama no disponible. Servicio funcionará en modo limitado.');
        }

        // Cron job para análisis periódico
        this.cronJob = cron.schedule(this.config.analysisSchedule, async () => {
            await this.runAnalysisCycle();
        }, {
            timezone: 'America/Argentina/Buenos_Aires'
        });

        this.isRunning = true;
        console.log('✅ [OLLAMA-ANALYZER] Servicio iniciado correctamente');
        console.log(`   🤖 Modelo: ${this.config.model}`);
        console.log(`   📊 Confianza mínima para sugerir: ${this.config.minConfidenceForSuggestion * 100}%`);
        console.log(`   ⚡ Confianza mínima para auto-responder: ${this.config.minConfidenceForAutoResponse * 100}%`);

        // Ejecutar análisis inicial después de 10 segundos
        setTimeout(() => this.runAnalysisCycle(), 10000);
    }

    /**
     * Verificar conexión con Ollama
     */
    async checkOllamaConnection() {
        try {
            const response = await axios.get(`${this.config.ollamaUrl}/api/tags`, {
                timeout: 5000
            });

            if (response.data && response.data.models) {
                const hasModel = response.data.models.some(m =>
                    m.name.includes('llama') || m.name.includes(this.config.model.split(':')[0])
                );
                this.ollamaAvailable = hasModel;
                console.log(`🟢 [OLLAMA-ANALYZER] Conexión establecida. Modelos disponibles: ${response.data.models.map(m => m.name).join(', ')}`);
            }
        } catch (error) {
            this.ollamaAvailable = false;
            console.warn(`🔴 [OLLAMA-ANALYZER] No se pudo conectar a Ollama: ${error.message}`);
        }
    }

    /**
     * Ejecutar ciclo de análisis
     */
    async runAnalysisCycle() {
        console.log('🔄 [OLLAMA-ANALYZER] Ejecutando ciclo de análisis...');

        try {
            // 1. Buscar mensajes nuevos no analizados
            const unanalyzedMessages = await this.getUnanalyzedMessages();
            console.log(`   📨 Mensajes por analizar: ${unanalyzedMessages.length}`);

            for (const message of unanalyzedMessages) {
                await this.analyzeMessage(message);
            }

            // 2. Buscar hilos con actividad reciente
            const activeThreads = await this.getActiveThreads();
            console.log(`   📋 Hilos activos analizados: ${activeThreads.length}`);

            for (const thread of activeThreads) {
                await this.analyzeThread(thread);
            }

            console.log('✅ [OLLAMA-ANALYZER] Ciclo de análisis completado');

        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error en ciclo de análisis:', error.message);
        }
    }

    /**
     * Obtener mensajes no analizados
     */
    async getUnanalyzedMessages() {
        try {
            const [messages] = await sequelize.query(`
                SELECT
                    nm.id, nm.content, nm.message_type, nm.sender_id, nm.recipient_id,
                    nm.group_id, nm.company_id, nm.requires_response, nm.created_at,
                    ng.subject, ng.group_type
                FROM notification_messages nm
                JOIN notification_groups ng ON ng.id = nm.group_id
                WHERE nm.ai_analyzed = FALSE
                  AND nm.is_deleted = FALSE
                  AND nm.created_at > NOW() - INTERVAL '24 hours'
                ORDER BY nm.created_at DESC
                LIMIT 50
            `);
            return messages;
        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error obteniendo mensajes:', error.message);
            return [];
        }
    }

    /**
     * Obtener hilos activos
     */
    async getActiveThreads() {
        try {
            const [threads] = await sequelize.query(`
                SELECT
                    ng.id as group_id, ng.subject, ng.group_type, ng.company_id,
                    ng.status, ng.ai_resolution_status,
                    COUNT(nm.id) as message_count,
                    MAX(nm.created_at) as last_message_at
                FROM notification_groups ng
                JOIN notification_messages nm ON nm.group_id = ng.id
                WHERE ng.status != 'closed'
                  AND nm.created_at > NOW() - INTERVAL '48 hours'
                  AND (ng.ai_last_analyzed_at IS NULL OR ng.ai_last_analyzed_at < NOW() - INTERVAL '1 hour')
                GROUP BY ng.id
                ORDER BY MAX(nm.created_at) DESC
                LIMIT 20
            `);
            return threads;
        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error obteniendo hilos:', error.message);
            return [];
        }
    }

    /**
     * Analizar un mensaje individual
     */
    async analyzeMessage(message) {
        try {
            // Detectar si es una pregunta
            const isQuestion = await this.detectIfQuestion(message.content);

            if (isQuestion) {
                // Buscar respuestas similares en la base de conocimiento
                const similarResponses = await this.findSimilarResponses(message.content, message.company_id);

                if (similarResponses.length > 0) {
                    const bestMatch = similarResponses[0];

                    if (bestMatch.similarity_score >= this.config.minSimilarityScore) {
                        // Crear sugerencia automática
                        await this.createSuggestion(message, bestMatch);
                    }
                }
            }

            // Marcar mensaje como analizado
            await sequelize.query(`
                UPDATE notification_messages
                SET ai_analyzed = TRUE, ai_analyzed_at = NOW()
                WHERE id = $1
            `, { bind: [message.id] });

        } catch (error) {
            console.error(`❌ [OLLAMA-ANALYZER] Error analizando mensaje ${message.id}:`, error.message);
        }
    }

    /**
     * Detectar si un texto es una pregunta
     */
    async detectIfQuestion(text) {
        // Detección básica sin Ollama
        const questionIndicators = [
            '?', '¿',
            'cuándo', 'cuando', 'cómo', 'como', 'dónde', 'donde',
            'qué', 'que', 'cuál', 'cual', 'quién', 'quien',
            'puedo', 'podría', 'es posible', 'se puede',
            'tengo tiempo', 'hasta cuándo', 'fecha límite', 'plazo'
        ];

        const lowerText = text.toLowerCase();
        return questionIndicators.some(indicator => lowerText.includes(indicator));
    }

    /**
     * Buscar respuestas similares en la base de conocimiento
     */
    async findSimilarResponses(question, companyId) {
        try {
            // Extraer palabras clave de la pregunta
            const keywords = this.extractKeywords(question);

            const [responses] = await sequelize.query(`
                SELECT
                    lr.id, lr.question_pattern, lr.answer_content, lr.answer_summary,
                    lr.confidence_score, lr.category, lr.times_accepted, lr.is_verified,
                    lr.valid_until, lr.is_temporal,
                    (
                        SELECT COUNT(*)::DECIMAL / GREATEST(array_length(lr.question_keywords, 1), 1)
                        FROM unnest(lr.question_keywords) kw
                        WHERE $1 ILIKE '%' || kw || '%'
                    ) as similarity_score
                FROM notification_learned_responses lr
                WHERE lr.is_active = TRUE
                  AND lr.confidence_score >= $2
                  AND (lr.company_id IS NULL OR lr.company_id = $3)
                  AND (lr.is_temporal = FALSE OR lr.valid_until IS NULL OR lr.valid_until >= CURRENT_DATE)
                ORDER BY
                    (
                        SELECT COUNT(*)
                        FROM unnest(lr.question_keywords) kw
                        WHERE $1 ILIKE '%' || kw || '%'
                    ) DESC,
                    lr.confidence_score DESC
                LIMIT 5
            `, {
                bind: [question.toLowerCase(), this.config.minConfidenceForSuggestion, companyId]
            });

            return responses;
        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error buscando respuestas similares:', error.message);
            return [];
        }
    }

    /**
     * Extraer palabras clave de un texto
     */
    extractKeywords(text) {
        // Palabras vacías en español
        const stopWords = new Set([
            'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
            'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para',
            'es', 'son', 'está', 'están', 'fue', 'era', 'ser', 'estar',
            'que', 'como', 'cuando', 'donde', 'cual', 'quien',
            'me', 'te', 'se', 'nos', 'les', 'lo', 'le',
            'y', 'o', 'pero', 'si', 'no', 'más', 'muy',
            'mi', 'tu', 'su', 'nuestro', 'este', 'ese', 'aquel'
        ]);

        return text.toLowerCase()
            .replace(/[¿?¡!.,;:()]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
    }

    /**
     * Crear sugerencia de respuesta automática
     */
    async createSuggestion(message, match) {
        try {
            // Generar explicación
            const explanation = `Esta respuesta se basa en una consulta similar que fue respondida anteriormente ` +
                `(confianza: ${Math.round(match.confidence_score * 100)}%). ` +
                (match.is_verified ? 'Respuesta verificada por RRHH.' : '');

            // Si la confianza es muy alta, preparar para auto-respuesta
            const canAutoRespond = match.confidence_score >= this.config.minConfidenceForAutoResponse &&
                                   match.is_verified;

            await sequelize.query(`
                INSERT INTO notification_ai_suggestions (
                    trigger_message_id, group_id, company_id, recipient_id,
                    suggestion_type, suggested_response, confidence,
                    source_type, source_id,
                    explanation, status, expires_at
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7,
                    'learned_response', $8,
                    $9, 'pending', NOW() + INTERVAL '24 hours'
                )
            `, {
                bind: [
                    message.id, message.group_id, message.company_id, message.recipient_id,
                    canAutoRespond ? 'auto_response' : 'similar_qa',
                    match.answer_content, match.confidence_score,
                    match.id,
                    explanation
                ]
            });

            // Actualizar estadísticas
            await sequelize.query(`
                UPDATE notification_learned_responses
                SET times_suggested = times_suggested + 1
                WHERE id = $1
            `, { bind: [match.id] });

            // Si es auto-respuesta y tiene suficiente confianza, crear mensaje
            if (canAutoRespond) {
                await this.createAutoResponse(message, match);
            }

            console.log(`   💡 Sugerencia creada para mensaje ${message.id} (confianza: ${Math.round(match.confidence_score * 100)}%)`);

        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error creando sugerencia:', error.message);
        }
    }

    /**
     * Crear respuesta automática
     */
    async createAutoResponse(message, match) {
        try {
            // Obtener siguiente número de secuencia
            const [seqResult] = await sequelize.query(`
                SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
                FROM notification_messages WHERE group_id = $1
            `, { bind: [message.group_id] });

            const autoResponseContent = `
🤖 **Respuesta automática del Asistente IA**

${match.answer_content}

---
_Esta respuesta fue generada automáticamente basándose en consultas similares anteriores._
_Confianza: ${Math.round(match.confidence_score * 100)}%_

¿Esta respuesta resuelve tu consulta? Si no es así, un representante de RRHH te responderá pronto.
            `.trim();

            // Crear mensaje de respuesta
            const [insertResult] = await sequelize.query(`
                INSERT INTO notification_messages (
                    group_id, sequence_number,
                    sender_type, sender_id, sender_name,
                    recipient_type, recipient_id, recipient_name,
                    message_type, content, channels,
                    ai_auto_generated, ai_confidence, ai_source_type,
                    company_id
                ) VALUES (
                    $1, $2,
                    'system', 'AI_ASSISTANT', 'Asistente IA',
                    'employee', $3, $3,
                    'auto_response', $4, '["web"]',
                    TRUE, $5, 'learned_response',
                    $6
                )
                RETURNING id
            `, {
                bind: [
                    message.group_id, seqResult[0].next_seq,
                    message.sender_id,
                    autoResponseContent, match.confidence_score,
                    message.company_id
                ]
            });

            // Actualizar la sugerencia como aplicada
            await sequelize.query(`
                UPDATE notification_ai_suggestions
                SET status = 'accepted', auto_applied = TRUE, applied_at = NOW(),
                    applied_message_id = $1
                WHERE trigger_message_id = $2 AND status = 'pending'
            `, { bind: [insertResult[0].id, message.id] });

            console.log(`   ⚡ Auto-respuesta creada para mensaje ${message.id}`);

        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error creando auto-respuesta:', error.message);
        }
    }

    /**
     * Analizar un hilo completo
     */
    async analyzeThread(thread) {
        try {
            // Obtener todos los mensajes del hilo
            const [messages] = await sequelize.query(`
                SELECT id, content, sender_type, sender_id, message_type, created_at
                FROM notification_messages
                WHERE group_id = $1
                ORDER BY sequence_number ASC
            `, { bind: [thread.group_id] });

            if (messages.length === 0) return;

            // Detectar si el hilo fue resuelto
            const resolution = await this.detectResolution(messages, thread);

            // Actualizar análisis del hilo
            await sequelize.query(`
                UPDATE notification_groups
                SET
                    ai_last_analyzed_at = NOW(),
                    ai_resolution_status = $1,
                    ai_detected_topic = $2,
                    ai_summary = $3
                WHERE id = $4
            `, {
                bind: [
                    resolution.status,
                    resolution.topic,
                    resolution.summary,
                    thread.group_id
                ]
            });

            // Si encontramos una resolución, aprender de ella
            if (resolution.isResolved && resolution.question && resolution.answer) {
                await this.learnFromResolution(thread, resolution);
            }

        } catch (error) {
            console.error(`❌ [OLLAMA-ANALYZER] Error analizando hilo ${thread.group_id}:`, error.message);
        }
    }

    /**
     * Detectar si un hilo fue resuelto
     */
    async detectResolution(messages, thread) {
        const result = {
            isResolved: false,
            status: 'pending',
            topic: null,
            summary: null,
            question: null,
            answer: null
        };

        // Buscar patrones de resolución
        const lastMessages = messages.slice(-3); // Últimos 3 mensajes

        for (const msg of lastMessages) {
            const content = msg.content.toLowerCase();

            // Indicadores de resolución
            const resolutionIndicators = [
                'gracias', 'perfecto', 'entendido', 'ok', 'listo',
                'quedó claro', 'solucionado', 'resuelto', 'ya está'
            ];

            if (resolutionIndicators.some(ind => content.includes(ind))) {
                result.isResolved = true;
                result.status = 'resolved';
                break;
            }
        }

        // Detectar tema
        const allContent = messages.map(m => m.content).join(' ').toLowerCase();
        result.topic = this.detectTopic(allContent);

        // Buscar pregunta y respuesta original
        if (messages.length >= 2) {
            const firstMsg = messages[0];
            if (this.detectIfQuestion(firstMsg.content)) {
                result.question = firstMsg.content;

                // Buscar primera respuesta de RRHH o sistema
                const answerMsg = messages.find(m =>
                    m.sender_type === 'admin' ||
                    m.sender_type === 'rrhh' ||
                    m.sender_id !== firstMsg.sender_id
                );

                if (answerMsg) {
                    result.answer = answerMsg.content;
                }
            }
        }

        // Generar resumen simple
        if (messages.length > 0) {
            result.summary = `Hilo con ${messages.length} mensajes sobre ${result.topic || 'tema general'}. ` +
                `Estado: ${result.isResolved ? 'Resuelto' : 'Pendiente'}`;
        }

        return result;
    }

    /**
     * Detectar tema de una conversación
     */
    detectTopic(text) {
        const topics = {
            'vacaciones': ['vacaciones', 'días', 'descanso', 'feriado', 'licencia'],
            'documentos': ['certificado', 'documento', 'constancia', 'comprobante', 'escolaridad'],
            'asistencia': ['asistencia', 'llegada', 'tarde', 'ausencia', 'horario', 'marcación'],
            'sueldo': ['sueldo', 'pago', 'liquidación', 'recibo', 'salario', 'aguinaldo'],
            'licencia_medica': ['médico', 'enfermedad', 'licencia médica', 'certificado médico', 'reposo'],
            'capacitacion': ['capacitación', 'curso', 'formación', 'entrenamiento'],
            'general': []
        };

        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(kw => text.includes(kw))) {
                return topic;
            }
        }

        return 'general';
    }

    /**
     * Aprender de una resolución (crear entrada en knowledge base)
     */
    async learnFromResolution(thread, resolution) {
        try {
            // Verificar que no exista ya una respuesta muy similar
            const existing = await this.findSimilarResponses(resolution.question, thread.company_id);

            if (existing.length > 0 && existing[0].similarity_score > 0.8) {
                // Ya existe, solo actualizar estadísticas
                console.log(`   📚 Respuesta similar ya existe en KB (similarity: ${existing[0].similarity_score})`);
                return;
            }

            // Extraer keywords
            const keywords = this.extractKeywords(resolution.question);

            // Crear nueva entrada aprendida
            await sequelize.query(`
                INSERT INTO notification_learned_responses (
                    category, subcategory, department,
                    question_pattern, question_keywords,
                    answer_content, answer_summary,
                    source_group_id, company_id,
                    confidence_score
                ) VALUES (
                    $1, NULL, 'rrhh',
                    $2, $3,
                    $4, $5,
                    $6, $7,
                    0.5
                )
            `, {
                bind: [
                    resolution.topic,
                    resolution.question,
                    keywords,
                    resolution.answer,
                    resolution.answer.substring(0, 200),
                    thread.group_id,
                    thread.company_id
                ]
            });

            console.log(`   📚 Nueva respuesta aprendida del hilo ${thread.group_id}`);

        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error aprendiendo de resolución:', error.message);
        }
    }

    /**
     * Analizar un mensaje con Ollama (cuando está disponible)
     */
    async analyzeWithOllama(content, context = {}) {
        if (!this.ollamaAvailable) {
            return null;
        }

        try {
            const prompt = `Analiza el siguiente mensaje de una notificación empresarial.

Mensaje: "${content}"

Contexto: ${JSON.stringify(context)}

Responde en JSON con el siguiente formato:
{
    "is_question": true/false,
    "topic": "categoria del tema",
    "sentiment": "positive/neutral/negative",
    "urgency": "low/medium/high",
    "needs_response": true/false,
    "suggested_response": "respuesta sugerida si aplica",
    "key_entities": ["entidades importantes mencionadas"]
}`;

            const response = await axios.post(`${this.config.ollamaUrl}/api/generate`, {
                model: this.config.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: this.config.temperature,
                    num_predict: this.config.maxTokens
                }
            }, {
                timeout: this.config.timeout
            });

            // Intentar parsear JSON de la respuesta
            const responseText = response.data.response;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return null;

        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error en análisis Ollama:', error.message);
            return null;
        }
    }

    /**
     * Aceptar una sugerencia (feedback positivo)
     */
    async acceptSuggestion(suggestionId, userId, modifiedResponse = null) {
        try {
            const [suggestion] = await sequelize.query(`
                SELECT * FROM notification_ai_suggestions WHERE id = $1
            `, { bind: [suggestionId] });

            if (!suggestion || suggestion.length === 0) {
                throw new Error('Sugerencia no encontrada');
            }

            const sugg = suggestion[0];

            // Actualizar sugerencia
            await sequelize.query(`
                UPDATE notification_ai_suggestions
                SET
                    status = 'accepted',
                    user_response = $1,
                    responded_at = NOW()
                WHERE id = $2
            `, { bind: [modifiedResponse, suggestionId] });

            // Actualizar estadísticas de la respuesta aprendida
            if (sugg.source_id) {
                await sequelize.query(`
                    UPDATE notification_learned_responses
                    SET times_accepted = times_accepted + 1
                    WHERE id = $1
                `, { bind: [sugg.source_id] });
            }

            return { success: true, message: 'Sugerencia aceptada' };

        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error aceptando sugerencia:', error.message);
            throw error;
        }
    }

    /**
     * Rechazar una sugerencia (feedback negativo)
     */
    async rejectSuggestion(suggestionId, userId, reason = null) {
        try {
            const [suggestion] = await sequelize.query(`
                SELECT * FROM notification_ai_suggestions WHERE id = $1
            `, { bind: [suggestionId] });

            if (!suggestion || suggestion.length === 0) {
                throw new Error('Sugerencia no encontrada');
            }

            const sugg = suggestion[0];

            // Actualizar sugerencia
            await sequelize.query(`
                UPDATE notification_ai_suggestions
                SET
                    status = 'rejected',
                    feedback_comment = $1,
                    responded_at = NOW()
                WHERE id = $2
            `, { bind: [reason, suggestionId] });

            // Actualizar estadísticas de la respuesta aprendida
            if (sugg.source_id) {
                await sequelize.query(`
                    UPDATE notification_learned_responses
                    SET times_rejected = times_rejected + 1
                    WHERE id = $1
                `, { bind: [sugg.source_id] });
            }

            return { success: true, message: 'Sugerencia rechazada' };

        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error rechazando sugerencia:', error.message);
            throw error;
        }
    }

    /**
     * Obtener sugerencias pendientes para un usuario
     */
    async getPendingSuggestions(recipientId, companyId) {
        try {
            const [suggestions] = await sequelize.query(`
                SELECT
                    s.id, s.trigger_message_id, s.group_id, s.suggestion_type,
                    s.suggested_response, s.confidence, s.explanation,
                    s.created_at, s.expires_at,
                    ng.subject as thread_subject,
                    nm.content as original_message
                FROM notification_ai_suggestions s
                JOIN notification_groups ng ON ng.id = s.group_id
                JOIN notification_messages nm ON nm.id = s.trigger_message_id
                WHERE s.recipient_id = $1
                  AND s.company_id = $2
                  AND s.status = 'pending'
                  AND (s.expires_at IS NULL OR s.expires_at > NOW())
                ORDER BY s.confidence DESC, s.created_at DESC
            `, { bind: [recipientId, companyId] });

            return suggestions;

        } catch (error) {
            console.error('❌ [OLLAMA-ANALYZER] Error obteniendo sugerencias:', error.message);
            return [];
        }
    }

    /**
     * Obtener estado del servicio
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            ollamaAvailable: this.ollamaAvailable,
            config: {
                model: this.config.model,
                minConfidenceForSuggestion: this.config.minConfidenceForSuggestion,
                minConfidenceForAutoResponse: this.config.minConfidenceForAutoResponse,
                analysisSchedule: this.config.analysisSchedule
            }
        };
    }

    /**
     * Detener el servicio
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
        this.isRunning = false;
        console.log('🛑 [OLLAMA-ANALYZER] Servicio detenido');
    }
}

// Singleton
const ollamaNotificationAnalyzer = new OllamaNotificationAnalyzer();

module.exports = ollamaNotificationAnalyzer;
