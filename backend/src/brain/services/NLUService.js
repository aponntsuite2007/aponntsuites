/**
 * ============================================================================
 * NLU SERVICE - Comprensión de Lenguaje Natural
 * ============================================================================
 *
 * Servicio central de NLU usado por TODOS los agentes:
 * - Support AI: Entender preguntas de usuarios
 * - Sales AI: Entender objeciones y necesidades
 * - Trainer AI: Entender nivel del usuario
 * - Tour Engine: Entender intenciones durante el tour
 *
 * Características:
 * - Detección de intención (intent)
 * - Extracción de entidades (módulos, acciones, objetos)
 * - Análisis de sentimiento
 * - Detección de urgencia
 * - Normalización de sinónimos
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

class NLUService {
    constructor() {
        // Diccionario de sinónimos para normalización
        this.synonyms = this.buildSynonymsDictionary();

        // Patrones de intención
        this.intentPatterns = this.buildIntentPatterns();

        // Entidades conocidas
        this.knownEntities = this.buildKnownEntities();

        // Palabras de sentimiento
        this.sentimentWords = this.buildSentimentWords();

        this.stats = {
            queriesProcessed: 0,
            avgProcessingTime: 0
        };
    }

    /**
     * ========================================================================
     * DICCIONARIOS Y PATRONES
     * ========================================================================
     */

    buildSynonymsDictionary() {
        return {
            // Acciones
            crear: ['crear', 'agregar', 'nuevo', 'añadir', 'registrar', 'dar de alta', 'incorporar'],
            editar: ['editar', 'modificar', 'cambiar', 'actualizar', 'corregir'],
            eliminar: ['eliminar', 'borrar', 'quitar', 'remover', 'dar de baja', 'sacar'],
            ver: ['ver', 'mostrar', 'consultar', 'visualizar', 'abrir', 'buscar', 'encontrar'],
            exportar: ['exportar', 'descargar', 'bajar', 'generar reporte', 'sacar reporte'],

            // Módulos
            usuario: ['usuario', 'usuarios', 'empleado', 'empleados', 'persona', 'personal', 'colaborador', 'trabajador'],
            asistencia: ['asistencia', 'asistencias', 'entrada', 'salida', 'marcación', 'fichaje', 'registro'],
            vacaciones: ['vacaciones', 'licencia', 'licencias', 'permiso', 'permisos', 'días libres', 'descanso'],
            turno: ['turno', 'turnos', 'horario', 'horarios', 'jornada', 'schedule'],
            departamento: ['departamento', 'departamentos', 'área', 'áreas', 'sector', 'sectores'],
            reporte: ['reporte', 'reportes', 'informe', 'informes', 'estadística', 'estadísticas'],
            kiosco: ['kiosco', 'kioscos', 'terminal', 'terminales', 'reloj', 'biométrico'],

            // Estados
            activo: ['activo', 'activado', 'habilitado', 'encendido', 'funcionando'],
            inactivo: ['inactivo', 'desactivado', 'deshabilitado', 'apagado', 'suspendido'],
            pendiente: ['pendiente', 'en espera', 'por aprobar', 'sin procesar'],
            aprobado: ['aprobado', 'aceptado', 'confirmado', 'autorizado'],
            rechazado: ['rechazado', 'denegado', 'no aprobado'],

            // Tiempo
            hoy: ['hoy', 'ahora', 'este momento', 'en este instante'],
            ayer: ['ayer', 'día anterior'],
            semana: ['semana', 'esta semana', 'semana actual', 'últimos 7 días'],
            mes: ['mes', 'este mes', 'mes actual', 'últimos 30 días']
        };
    }

    buildIntentPatterns() {
        return {
            // Preguntas de "cómo hacer"
            howTo: {
                patterns: [
                    /^cómo\s+(puedo\s+)?/i,
                    /^de qué (manera|forma)\s+/i,
                    /^cuál es la forma de\s+/i,
                    /^pasos para\s+/i,
                    /^qué debo hacer para\s+/i,
                    /^necesito\s+/i,
                    /^quiero\s+/i,
                    /^ayuda para\s+/i,
                    /^me (ayudas?|explicas?|enseñas?)\s+/i
                ],
                confidence: 0.9
            },

            // Problemas/Troubleshooting
            troubleshoot: {
                patterns: [
                    /no (puedo|funciona|me deja|carga|aparece|abre)/i,
                    /error\s+/i,
                    /problema\s+/i,
                    /falla\s+/i,
                    /se (traba|congela|cuelga)/i,
                    /está (roto|mal|fallando)/i,
                    /por qué no\s+/i,
                    /qué pasa (con|cuando)/i
                ],
                confidence: 0.95
            },

            // Preguntas informativas
            info: {
                patterns: [
                    /^qué (es|son|significa)\s+/i,
                    /^cuál (es|son)\s+/i,
                    /^para qué (sirve|se usa)\s+/i,
                    /^dónde (está|encuentro|veo)\s+/i,
                    /^cuánto[s]?\s+/i,
                    /^cuándo\s+/i,
                    /^quién\s+/i,
                    /^explica(me)?\s+/i
                ],
                confidence: 0.85
            },

            // Acciones directas
            action: {
                patterns: [
                    /^(crear|agregar|nuevo)\s+/i,
                    /^(editar|modificar|cambiar)\s+/i,
                    /^(eliminar|borrar|quitar)\s+/i,
                    /^(ver|mostrar|abrir)\s+/i,
                    /^(exportar|descargar|generar)\s+/i,
                    /^(buscar|encontrar)\s+/i,
                    /^(aprobar|rechazar|autorizar)\s+/i
                ],
                confidence: 0.9
            },

            // Navegación
            navigation: {
                patterns: [
                    /^ir a\s+/i,
                    /^llévame a\s+/i,
                    /^abre\s+/i,
                    /^muéstrame\s+/i,
                    /^quiero ver\s+/i,
                    /^dónde está\s+/i
                ],
                confidence: 0.85
            },

            // Comparación/Pricing (para demos)
            pricing: {
                patterns: [
                    /cuánto (cuesta|vale|sale)/i,
                    /precio/i,
                    /costo/i,
                    /plan(es)?\s*/i,
                    /presupuesto/i,
                    /cotiza(ción|r)/i
                ],
                confidence: 0.9
            },

            // Confirmación
            confirmation: {
                patterns: [
                    /^(sí|si|ok|dale|bueno|perfecto|listo|entendido|claro)/i,
                    /^(continuar?|seguir?|adelante)/i,
                    /^de acuerdo/i
                ],
                confidence: 0.95
            },

            // Negación/Cancelar
            cancellation: {
                patterns: [
                    /^(no|cancelar|parar|detener|salir|cerrar)/i,
                    /^(volver|regresar|atrás)/i,
                    /^(después|luego|más tarde)/i
                ],
                confidence: 0.95
            },

            // Saludo
            greeting: {
                patterns: [
                    /^(hola|buenos?\s+(días|tardes|noches)|hey|hi)/i,
                    /^(qué tal|cómo estás?)/i
                ],
                confidence: 0.95
            },

            // Despedida
            farewell: {
                patterns: [
                    /^(adiós|chau|hasta (luego|pronto)|bye|gracias)/i,
                    /^(eso es todo|terminamos|listo|nada más)/i
                ],
                confidence: 0.95
            }
        };
    }

    buildKnownEntities() {
        return {
            modules: {
                keywords: {
                    'usuarios': { key: 'users', label: 'Gestión de Usuarios' },
                    'usuario': { key: 'users', label: 'Gestión de Usuarios' },
                    'empleados': { key: 'users', label: 'Gestión de Usuarios' },
                    'personal': { key: 'users', label: 'Gestión de Usuarios' },
                    'asistencia': { key: 'attendance', label: 'Control de Asistencia' },
                    'asistencias': { key: 'attendance', label: 'Control de Asistencia' },
                    'marcaciones': { key: 'attendance', label: 'Control de Asistencia' },
                    'vacaciones': { key: 'vacation', label: 'Gestión de Vacaciones' },
                    'licencias': { key: 'vacation', label: 'Gestión de Vacaciones' },
                    'permisos': { key: 'vacation', label: 'Gestión de Vacaciones' },
                    'turnos': { key: 'shifts', label: 'Gestión de Turnos' },
                    'horarios': { key: 'shifts', label: 'Gestión de Turnos' },
                    'departamentos': { key: 'departments', label: 'Departamentos' },
                    'áreas': { key: 'departments', label: 'Departamentos' },
                    'reportes': { key: 'reports', label: 'Reportes' },
                    'informes': { key: 'reports', label: 'Reportes' },
                    'kioscos': { key: 'kiosks', label: 'Kioscos Biométricos' },
                    'terminales': { key: 'kiosks', label: 'Kioscos Biométricos' },
                    'notificaciones': { key: 'notifications', label: 'Notificaciones' },
                    'alertas': { key: 'notifications', label: 'Notificaciones' },
                    'dashboard': { key: 'dashboard', label: 'Dashboard' },
                    'panel': { key: 'dashboard', label: 'Dashboard' },
                    'médico': { key: 'medical', label: 'Datos Médicos' },
                    'salud': { key: 'medical', label: 'Datos Médicos' },
                    'nómina': { key: 'payroll', label: 'Nómina' },
                    'sueldos': { key: 'payroll', label: 'Nómina' },
                    'salarios': { key: 'payroll', label: 'Nómina' }
                }
            },

            actions: {
                keywords: {
                    'crear': 'create',
                    'agregar': 'create',
                    'nuevo': 'create',
                    'añadir': 'create',
                    'editar': 'update',
                    'modificar': 'update',
                    'cambiar': 'update',
                    'actualizar': 'update',
                    'eliminar': 'delete',
                    'borrar': 'delete',
                    'quitar': 'delete',
                    'ver': 'read',
                    'mostrar': 'read',
                    'consultar': 'read',
                    'buscar': 'search',
                    'encontrar': 'search',
                    'filtrar': 'filter',
                    'exportar': 'export',
                    'descargar': 'export',
                    'imprimir': 'print',
                    'aprobar': 'approve',
                    'rechazar': 'reject',
                    'autorizar': 'approve'
                }
            },

            timeframes: {
                keywords: {
                    'hoy': { type: 'day', offset: 0 },
                    'ayer': { type: 'day', offset: -1 },
                    'mañana': { type: 'day', offset: 1 },
                    'esta semana': { type: 'week', offset: 0 },
                    'semana pasada': { type: 'week', offset: -1 },
                    'este mes': { type: 'month', offset: 0 },
                    'mes pasado': { type: 'month', offset: -1 },
                    'este año': { type: 'year', offset: 0 }
                }
            }
        };
    }

    buildSentimentWords() {
        return {
            positive: [
                'excelente', 'perfecto', 'genial', 'bueno', 'bien', 'gracias',
                'funciona', 'me gusta', 'fácil', 'rápido', 'útil', 'claro',
                'entendí', 'listo', 'ok', 'sí', 'correcto', 'exacto'
            ],
            negative: [
                'mal', 'error', 'problema', 'no funciona', 'difícil', 'confuso',
                'lento', 'malo', 'horrible', 'no entiendo', 'frustrado', 'enojado',
                'falla', 'roto', 'imposible', 'complicado', 'no sirve'
            ],
            urgent: [
                'urgente', 'emergencia', 'ahora', 'ya', 'inmediato', 'rápido',
                'ayuda', 'socorro', 'crítico', 'importante', 'prioridad'
            ]
        };
    }

    /**
     * ========================================================================
     * PROCESAMIENTO PRINCIPAL
     * ========================================================================
     */

    /**
     * Procesar texto y extraer toda la información
     */
    process(text, context = {}) {
        const startTime = Date.now();
        this.stats.queriesProcessed++;

        // Normalizar texto
        const normalized = this.normalize(text);

        // Detectar intención
        const intent = this.detectIntent(normalized);

        // Extraer entidades
        const entities = this.extractEntities(normalized);

        // Analizar sentimiento
        const sentiment = this.analyzeSentiment(normalized);

        // Detectar urgencia
        const urgency = this.detectUrgency(normalized);

        // Extraer palabras clave
        const keywords = this.extractKeywords(normalized);

        // Detectar si es pregunta
        const isQuestion = this.isQuestion(text);

        // Detectar idioma/formalidad
        const formality = this.detectFormality(text);

        const processingTime = Date.now() - startTime;
        this.updateAvgProcessingTime(processingTime);

        return {
            original: text,
            normalized,
            intent,
            entities,
            sentiment,
            urgency,
            keywords,
            isQuestion,
            formality,
            processingTime,
            context: this.enrichContext(context, { intent, entities })
        };
    }

    /**
     * Normalizar texto
     */
    normalize(text) {
        let normalized = text.toLowerCase().trim();

        // Remover signos de puntuación extra pero mantener acentos
        normalized = normalized.replace(/[¿?¡!.,;:]+/g, ' ').trim();

        // Normalizar espacios múltiples
        normalized = normalized.replace(/\s+/g, ' ');

        // Expandir contracciones comunes
        normalized = normalized
            .replace(/\bq\b/g, 'que')
            .replace(/\bxq\b/g, 'porque')
            .replace(/\bx\b/g, 'por')
            .replace(/\bpq\b/g, 'porque')
            .replace(/\btb\b/g, 'también')
            .replace(/\bpf\b/g, 'por favor')
            .replace(/\bd\b/g, 'de');

        return normalized;
    }

    /**
     * Detectar intención principal
     */
    detectIntent(text) {
        let bestMatch = {
            type: 'unknown',
            confidence: 0,
            matchedPattern: null
        };

        for (const [intentType, config] of Object.entries(this.intentPatterns)) {
            for (const pattern of config.patterns) {
                if (pattern.test(text)) {
                    const confidence = config.confidence;
                    if (confidence > bestMatch.confidence) {
                        bestMatch = {
                            type: intentType,
                            confidence,
                            matchedPattern: pattern.toString()
                        };
                    }
                }
            }
        }

        // Si no hay match, intentar por palabras clave
        if (bestMatch.type === 'unknown') {
            bestMatch = this.detectIntentByKeywords(text);
        }

        return bestMatch;
    }

    /**
     * Detectar intención por palabras clave
     */
    detectIntentByKeywords(text) {
        const words = text.split(' ');

        // Buscar acciones
        for (const word of words) {
            if (this.knownEntities.actions.keywords[word]) {
                return {
                    type: 'action',
                    confidence: 0.7,
                    matchedKeyword: word
                };
            }
        }

        // Si menciona un módulo, probablemente quiere navegar o info
        for (const word of words) {
            if (this.knownEntities.modules.keywords[word]) {
                return {
                    type: 'navigation',
                    confidence: 0.6,
                    matchedKeyword: word
                };
            }
        }

        return { type: 'unknown', confidence: 0.3 };
    }

    /**
     * Extraer entidades del texto
     */
    extractEntities(text) {
        const entities = {
            modules: [],
            actions: [],
            timeframes: [],
            numbers: [],
            names: []
        };

        const words = text.split(' ');

        // Buscar módulos
        for (const word of words) {
            const moduleMatch = this.knownEntities.modules.keywords[word];
            if (moduleMatch && !entities.modules.find(m => m.key === moduleMatch.key)) {
                entities.modules.push(moduleMatch);
            }
        }

        // Buscar acciones
        for (const word of words) {
            const actionMatch = this.knownEntities.actions.keywords[word];
            if (actionMatch && !entities.actions.includes(actionMatch)) {
                entities.actions.push(actionMatch);
            }
        }

        // Buscar timeframes (frases de tiempo)
        for (const [phrase, config] of Object.entries(this.knownEntities.timeframes.keywords)) {
            if (text.includes(phrase)) {
                entities.timeframes.push({ phrase, ...config });
            }
        }

        // Extraer números
        const numbers = text.match(/\d+/g);
        if (numbers) {
            entities.numbers = numbers.map(n => parseInt(n));
        }

        return entities;
    }

    /**
     * Analizar sentimiento
     */
    analyzeSentiment(text) {
        let positiveScore = 0;
        let negativeScore = 0;

        for (const word of this.sentimentWords.positive) {
            if (text.includes(word)) positiveScore++;
        }

        for (const word of this.sentimentWords.negative) {
            if (text.includes(word)) negativeScore++;
        }

        const total = positiveScore + negativeScore;

        if (total === 0) {
            return { type: 'neutral', score: 0 };
        }

        const score = (positiveScore - negativeScore) / total;

        return {
            type: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
            score,
            positiveWords: positiveScore,
            negativeWords: negativeScore
        };
    }

    /**
     * Detectar urgencia
     */
    detectUrgency(text) {
        let urgencyScore = 0;
        const urgentWordsFound = [];

        for (const word of this.sentimentWords.urgent) {
            if (text.includes(word)) {
                urgencyScore++;
                urgentWordsFound.push(word);
            }
        }

        // Mayúsculas también indican urgencia
        const originalText = text;
        const upperRatio = (originalText.match(/[A-Z]/g) || []).length / originalText.length;
        if (upperRatio > 0.3) urgencyScore++;

        // Signos de exclamación
        if ((originalText.match(/!/g) || []).length > 1) urgencyScore++;

        return {
            level: urgencyScore >= 3 ? 'high' : urgencyScore >= 1 ? 'medium' : 'low',
            score: urgencyScore,
            indicators: urgentWordsFound
        };
    }

    /**
     * Extraer palabras clave
     */
    extractKeywords(text) {
        const stopWords = [
            'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
            'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para',
            'que', 'qué', 'como', 'cómo', 'donde', 'dónde', 'cuando', 'cuándo',
            'es', 'son', 'está', 'están', 'hay', 'tiene', 'tienen',
            'y', 'o', 'pero', 'si', 'no', 'me', 'te', 'se', 'le', 'lo',
            'mi', 'tu', 'su', 'este', 'esta', 'ese', 'esa', 'aquí', 'ahí'
        ];

        return text.split(' ')
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .slice(0, 10);
    }

    /**
     * Detectar si es pregunta
     */
    isQuestion(text) {
        const questionIndicators = [
            /^\s*¿/,
            /\?\s*$/,
            /^(qué|cómo|cuál|cuándo|dónde|quién|por qué|para qué)/i,
            /^(es|son|está|hay|tiene|puede|puedo)/i
        ];

        return questionIndicators.some(pattern => pattern.test(text.trim()));
    }

    /**
     * Detectar formalidad
     */
    detectFormality(text) {
        const formalIndicators = ['usted', 'por favor', 'podría', 'sería', 'estimado'];
        const informalIndicators = ['che', 'vos', 'dale', 'onda', 'loco', 'boludo'];

        let formalScore = 0;
        let informalScore = 0;

        for (const word of formalIndicators) {
            if (text.toLowerCase().includes(word)) formalScore++;
        }

        for (const word of informalIndicators) {
            if (text.toLowerCase().includes(word)) informalScore++;
        }

        return {
            level: formalScore > informalScore ? 'formal' :
                   informalScore > formalScore ? 'informal' : 'neutral',
            score: formalScore - informalScore
        };
    }

    /**
     * Enriquecer contexto con la información extraída
     */
    enrichContext(existingContext, extracted) {
        return {
            ...existingContext,
            lastIntent: extracted.intent.type,
            detectedModules: extracted.entities.modules.map(m => m.key),
            detectedActions: extracted.entities.actions,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Actualizar promedio de tiempo de procesamiento
     */
    updateAvgProcessingTime(newTime) {
        const count = this.stats.queriesProcessed;
        this.stats.avgProcessingTime =
            ((this.stats.avgProcessingTime * (count - 1)) + newTime) / count;
    }

    /**
     * ========================================================================
     * MÉTODOS DE ALTO NIVEL
     * ========================================================================
     */

    /**
     * Obtener sugerencia de respuesta basada en intención
     */
    getSuggestedResponseType(intent) {
        const responseMap = {
            howTo: 'tutorial',
            troubleshoot: 'diagnostic',
            info: 'explanation',
            action: 'confirmation',
            navigation: 'redirect',
            pricing: 'pricing-table',
            confirmation: 'continue',
            cancellation: 'stop',
            greeting: 'welcome',
            farewell: 'goodbye'
        };

        return responseMap[intent.type] || 'clarification';
    }

    /**
     * Generar prompt enriquecido para LLM (si se usa Ollama)
     */
    enrichPromptForLLM(userMessage, nluResult) {
        return `
[CONTEXTO NLU]
- Intención detectada: ${nluResult.intent.type} (confianza: ${nluResult.intent.confidence})
- Módulos mencionados: ${nluResult.entities.modules.map(m => m.label).join(', ') || 'ninguno'}
- Acciones detectadas: ${nluResult.entities.actions.join(', ') || 'ninguna'}
- Sentimiento: ${nluResult.sentiment.type}
- Urgencia: ${nluResult.urgency.level}
- Es pregunta: ${nluResult.isQuestion ? 'Sí' : 'No'}

[MENSAJE DEL USUARIO]
${userMessage}

[INSTRUCCIONES]
Responde de manera ${nluResult.formality.level === 'formal' ? 'formal' : 'amigable y cercana'}.
${nluResult.urgency.level === 'high' ? 'El usuario parece tener urgencia, sé conciso.' : ''}
${nluResult.sentiment.type === 'negative' ? 'El usuario parece frustrado, sé empático.' : ''}
        `.trim();
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        return {
            ...this.stats,
            avgProcessingTimeMs: this.stats.avgProcessingTime.toFixed(2)
        };
    }
}

// Singleton
let instance = null;

module.exports = {
    NLUService,
    getInstance: () => {
        if (!instance) {
            instance = new NLUService();
        }
        return instance;
    }
};
