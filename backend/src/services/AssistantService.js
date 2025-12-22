/**
 * AssistantService.js
 *
 * Servicio de Asistente IA con Ollama + Llama 3.1 Local
 *
 * Características:
 * - Integración con Ollama (LLM local)
 * - RAG (Retrieval Augmented Generation) con knowledge base
 * - Context-aware (SystemRegistry + user context)
 * - Multi-tenant isolation
 * - Feedback loop (👍👎) para aprendizaje
 * - Integración con Auditor para diagnósticos
 *
 * @technology Ollama + Llama 3.1 (8B) + PostgreSQL + Node.js
 * @version 1.0.0
 * @created 2025-01-19
 */

const axios = require('axios');
const { database } = require('../config/database');
const SystemRegistry = require('../auditor/registry/SystemRegistry');
const AuditorEngine = require('../auditor/core/AuditorEngine');
const ProcessChainGenerator = require('./ProcessChainGenerator');
const ContextValidatorService = require('./ContextValidatorService');
const PrerequisiteChecker = require('../brain/services/PrerequisiteChecker');

class AssistantService {
  constructor(database, brainService = null) {
    // ✅ FIX 3: Guardar database para acceso a modelos
    this.database = database;

    // 🧠 BRAIN INTEGRATION - Para respuestas con datos LIVE del código
    this.brainService = brainService;

    // 🔗 PROCESS CHAIN INTEGRATION - Autoconocimiento integral
    try {
      this.processChainGenerator = new ProcessChainGenerator(database, brainService);
      this.contextValidator = new ContextValidatorService(database);
      console.log('🔗 ProcessChainGenerator & ContextValidator inicializados');
    } catch (e) {
      console.warn('⚠️ Process Chain Services no disponibles:', e.message);
      this.processChainGenerator = null;
      this.contextValidator = null;
    }

    // Configuración de Ollama desde environment variables
    this.ollamaBaseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.temperature = parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7');
    this.maxTokens = parseInt(process.env.OLLAMA_MAX_TOKENS || '500');
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '30000');

    // ✅ FIX: Inicializar SystemRegistry para acceso a metadata de módulos
    // 🧠 Ahora con soporte Brain para datos LIVE
    try {
      this.systemRegistry = new SystemRegistry(database, brainService);
    } catch (e) {
      console.warn('⚠️ SystemRegistry no disponible:', e.message);
      this.systemRegistry = null;
    }

    // 🧠 PREREQUISITE CHECKER - Verificación de prerrequisitos en tiempo real
    try {
      this.prerequisiteChecker = new PrerequisiteChecker(database);
      console.log('✅ PrerequisiteChecker inicializado');
    } catch (e) {
      console.warn('⚠️ PrerequisiteChecker no disponible:', e.message);
      this.prerequisiteChecker = null;
    }

    console.log('🤖 AssistantService inicializado');
    console.log(`   Ollama URL: ${this.ollamaBaseURL}`);
    console.log(`   Modelo: ${this.model}`);
    if (brainService) {
      console.log(`   🧠 Brain Service: Conectado`);
    }
  }

  /**
   * 🧠 Inyectar Brain Service post-construcción
   */
  setBrainService(brainService) {
    this.brainService = brainService;
    if (this.systemRegistry) {
      this.systemRegistry.setBrainService(brainService);
      console.log('🧠 [ASSISTANT] Brain Service conectado dinámicamente');
    }
  }

  /**
   * Detecta si la pregunta del usuario es una INTENCIÓN DE ACCIÓN
   * (ej: "quiero pedir vacaciones", "necesito cambiar mi turno", etc.)
   *
   * @param {string} question - Pregunta del usuario
   * @returns {Object|null} { isActionIntent: true, actionKey, confidence, keywords } o null
   */
  detectActionIntent(question) {
    const lowerQuestion = question.toLowerCase();

    // Mapeo de keywords → actionKey
    // 🔥 Usar las 108 acciones cargadas dinámicamente
    const intentPatterns = [
      // VACACIONES
      { keywords: ['vacaciones', 'vacacione', 'descanso', 'pedir vacaciones', 'solicitar vacaciones'], actionKey: 'vacation-request' },
      { keywords: ['días libres', 'dia libre', 'ausencia', 'permiso'], actionKey: 'time-off-request' },

      // TURNOS
      { keywords: ['cambiar turno', 'cambio de turno', 'intercambiar turno', 'swap turno', 'cambiar mi turno'], actionKey: 'shift-swap' },
      { keywords: ['consultar turno', 'ver mi turno', 'mi turno', 'horario turno'], actionKey: 'shift-check' },

      // HORAS EXTRA
      { keywords: ['horas extra', 'hora extra', 'overtime', 'trabajar extra', 'solicitar horas extra'], actionKey: 'overtime-request' },

      // MÉDICO
      { keywords: ['turno médico', 'turno medico', 'consulta médica', 'consulta medica', 'cita médica', 'doctor'], actionKey: 'medical-appointment' },

      // REPORTES/PROBLEMAS
      { keywords: ['reportar problema', 'problema con', 'no funciona', 'roto', 'error en'], actionKey: 'report-issue' },

      // NOTIFICACIONES
      { keywords: ['enviar notificación', 'notificar', 'avisar', 'comunicar'], actionKey: 'send-notification' }
    ];

    // Buscar match con mejor confidence
    let bestMatch = null;
    let maxConfidence = 0;

    for (const pattern of intentPatterns) {
      let matchCount = 0;
      const matchedKeywords = [];

      for (const keyword of pattern.keywords) {
        if (lowerQuestion.includes(keyword)) {
          matchCount++;
          matchedKeywords.push(keyword);
        }
      }

      if (matchCount > 0) {
        const confidence = matchCount / pattern.keywords.length;

        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = {
            isActionIntent: true,
            actionKey: pattern.actionKey,
            confidence: Math.min(confidence, 1.0),
            matchedKeywords
          };
        }
      }
    }

    // Detectar intenciones generales (quiero, necesito, etc.)
    const generalIntentKeywords = ['quiero', 'necesito', 'puedo', 'cómo hago para', 'como hago para', 'pedir', 'solicitar'];
    const hasGeneralIntent = generalIntentKeywords.some(k => lowerQuestion.includes(k));

    if (bestMatch && bestMatch.confidence >= 0.3) {
      console.log(`🎯 [INTENT DETECTION] Detectada intención: ${bestMatch.actionKey} (confidence: ${bestMatch.confidence.toFixed(2)})`);
      console.log(`   Keywords matched: ${bestMatch.matchedKeywords.join(', ')}`);
      return bestMatch;
    }

    if (hasGeneralIntent) {
      console.log(`🎯 [INTENT DETECTION] Intención general detectada, pero sin acción específica`);
      return {
        isActionIntent: true,
        actionKey: null, // No sabemos qué acción específica
        confidence: 0.5,
        matchedKeywords: generalIntentKeywords.filter(k => lowerQuestion.includes(k)),
        needsClarification: true
      };
    }

    return null;
  }

  /**
   * 🧠 DETECTAR INTENCIÓN DE VERIFICACIÓN
   * Detecta si el usuario quiere VERIFICAR si puede hacer algo (no ejecutar la acción)
   * Ej: "¿puedo liquidar sueldos?", "verifica que pueda", "qué me falta para..."
   */
  detectVerificationIntent(question) {
    const lowerQuestion = question.toLowerCase();

    // Patrones que indican intención de VERIFICACIÓN (no acción)
    const verificationPatterns = [
      { pattern: /(?:puedo|podré|podria)\s+(?:hacer|realizar|ejecutar|procesar|liquidar|generar)/i, type: 'can_i' },
      { pattern: /(?:tengo|tenemos)\s+(?:todo|todos?|lo necesario)\s+(?:para|listo)/i, type: 'have_all' },
      { pattern: /(?:estoy|estamos)\s+(?:listo|preparado|en condiciones)\s+(?:para)?/i, type: 'ready' },
      { pattern: /(?:verificar?|chequear?|revisar?|comprobar?)\s+(?:si|que|requisitos|prerrequisitos)/i, type: 'verify' },
      { pattern: /(?:qué|que)\s+(?:me|nos)\s+falta\s+(?:para)?/i, type: 'whats_missing' },
      { pattern: /(?:requisitos|prerrequisitos|condiciones)\s+(?:para|de)/i, type: 'requirements' },
      { pattern: /(?:falta|faltan)\s+(?:algo|datos?|configurar?)/i, type: 'missing' },
      { pattern: /(?:está|esta)\s+(?:todo|listo|ok|bien)\s+(?:para)?/i, type: 'is_ok' },
      { pattern: /(?:antes de|previo a)\s+(?:liquidar|procesar|generar)/i, type: 'before' }
    ];

    for (const { pattern, type } of verificationPatterns) {
      if (pattern.test(lowerQuestion)) {
        // Extraer la acción que quiere verificar
        const actionMatch = this.extractActionFromVerification(lowerQuestion);

        console.log(`✅ [VERIFICATION INTENT] Tipo: ${type}, Acción: ${actionMatch?.actionKey || 'desconocida'}`);

        return {
          isVerificationIntent: true,
          verificationType: type,
          actionKey: actionMatch?.actionKey || null,
          confidence: actionMatch ? 0.9 : 0.6,
          originalQuestion: question
        };
      }
    }

    return null;
  }

  /**
   * Extrae la acción específica de una pregunta de verificación
   */
  extractActionFromVerification(question) {
    const actionMappings = [
      // NÓMINA/PAYROLL
      { keywords: ['liquidar', 'liquidación', 'nómina', 'nomina', 'sueldos', 'salarios', 'quincena'], actionKey: 'payroll-liquidation' },
      { keywords: ['recibo', 'recibos de sueldo'], actionKey: 'payroll-receipt-generate' },

      // ASISTENCIA
      { keywords: ['check-in', 'checkin', 'fichar', 'marcar entrada', 'registrar asistencia'], actionKey: 'check-in' },
      { keywords: ['check-out', 'checkout', 'marcar salida'], actionKey: 'check-out' },
      { keywords: ['reporte de asistencia', 'informe asistencia'], actionKey: 'attendance-report' },

      // VACACIONES
      { keywords: ['vacaciones', 'pedir vacaciones', 'solicitar vacaciones'], actionKey: 'vacation-request' },
      { keywords: ['aprobar vacaciones'], actionKey: 'vacation-approve' },

      // TURNOS
      { keywords: ['cambiar turno', 'cambio de turno', 'intercambiar turno'], actionKey: 'shift-swap' },
      { keywords: ['asignar turno'], actionKey: 'shift-assign' },

      // USUARIOS
      { keywords: ['crear usuario', 'agregar usuario', 'nuevo usuario', 'alta usuario'], actionKey: 'user-create' },
      { keywords: ['editar usuario', 'modificar usuario'], actionKey: 'user-update' },

      // HORAS EXTRA
      { keywords: ['horas extra', 'overtime', 'extras'], actionKey: 'overtime-request' },

      // MÉDICO
      { keywords: ['licencia médica', 'licencia medica', 'parte médico'], actionKey: 'medical-leave' },

      // REPORTES
      { keywords: ['generar reporte', 'crear reporte', 'exportar'], actionKey: 'report-generate' }
    ];

    const lowerQuestion = question.toLowerCase();

    for (const mapping of actionMappings) {
      for (const keyword of mapping.keywords) {
        if (lowerQuestion.includes(keyword)) {
          return { actionKey: mapping.actionKey, matchedKeyword: keyword };
        }
      }
    }

    return null;
  }

  /**
   * 🧠 MANEJAR VERIFICACIÓN DE PRERREQUISITOS
   * Usa PrerequisiteChecker para verificar y devolver resultado estructurado
   */
  async handleVerificationRequest(verificationIntent, companyId, userId) {
    if (!this.prerequisiteChecker) {
      return {
        success: false,
        error: 'PrerequisiteChecker no disponible',
        suggestion: 'El sistema de verificación no está configurado'
      };
    }

    if (!verificationIntent.actionKey) {
      // No sabemos qué acción verificar, listar disponibles
      const actions = this.prerequisiteChecker.getAvailableActions();
      return {
        success: true,
        type: 'action_list',
        message: 'No especificaste qué acción verificar. Estas son las acciones disponibles:',
        availableActions: actions.slice(0, 15),
        totalActions: actions.length,
        hint: 'Pregunta algo como "¿puedo liquidar sueldos?" o "¿tengo todo para generar recibos?"'
      };
    }

    // Verificar prerrequisitos de la acción específica
    const result = await this.prerequisiteChecker.checkPrerequisites(
      verificationIntent.actionKey,
      companyId,
      userId
    );

    return {
      success: true,
      type: 'prerequisite_check',
      actionKey: verificationIntent.actionKey,
      actionName: result.actionName,
      canProceed: result.canProceed,
      verified: result.verified,
      missing: result.missing,
      warnings: result.warnings,
      modules: result.modules,
      process: result.process,
      summary: result.summary,
      checkDurationMs: result.checkDurationMs
    };
  }

  /**
   * 🧠 GENERAR RESPUESTA NATURAL PARA VERIFICACIÓN
   * Convierte el resultado de verificación en respuesta legible
   */
  generateVerificationResponse(verificationResult) {
    if (!verificationResult.success) {
      return {
        answer: `❌ ${verificationResult.error}. ${verificationResult.suggestion || ''}`,
        source: 'prerequisite_checker_error',
        confidence: 0.5
      };
    }

    if (verificationResult.type === 'action_list') {
      const actionsList = verificationResult.availableActions
        .map(a => `• ${a.name}`)
        .join('\n');

      return {
        answer: `${verificationResult.message}\n\n${actionsList}\n\n💡 ${verificationResult.hint}`,
        source: 'prerequisite_checker',
        confidence: 0.8
      };
    }

    // Resultado de verificación de prerrequisitos
    const { summary, canProceed, verified, missing, process } = verificationResult;

    let answer = `${summary.emoji} **${summary.title}**\n\n${summary.message}\n\n`;

    if (canProceed) {
      // TODO OK - mostrar pasos a seguir
      answer += `**✅ Verificaciones pasadas:**\n`;
      verified.slice(0, 5).forEach(v => {
        answer += `• ${v.description}${v.value ? ` (${v.value})` : ''}\n`;
      });

      if (process && process.steps) {
        answer += `\n**📋 Próximos pasos:**\n`;
        process.steps.slice(0, 3).forEach((step, i) => {
          answer += `${i + 1}. ${step.description || step}\n`;
        });
      }
    } else {
      // FALTA ALGO - mostrar qué y cómo solucionarlo
      answer += `**❌ Falta completar:**\n`;
      missing.forEach(m => {
        answer += `• ${m.description}\n`;
        if (m.howToFix) {
          answer += `  → ${m.howToFix}\n`;
        }
      });

      if (summary.alternative) {
        answer += `\n**💡 Alternativa:** ${summary.alternative.message}\n`;
      }
    }

    return {
      answer,
      source: 'prerequisite_checker',
      confidence: 0.95,
      verificationResult
    };
  }

  /**
   * Método principal: Responder pregunta del usuario
   *
   * @param {Object} params
   * @param {number} params.companyId - ID de la empresa (multi-tenant)
   * @param {string} params.userId - UUID del usuario
   * @param {string} params.userRole - Rol del usuario (admin, rrhh, employee)
   * @param {string} params.question - Pregunta del usuario
   * @param {Object} params.context - Contexto: { module, submodule, screen, action }
   *
   * @returns {Promise<Object>} { answer, source, confidence, suggestions, diagnosticTriggered, processChain }
   */
  async chat(params) {
    const { companyId, userId, userRole, question, context = {} } = params;

    const startTime = Date.now();

    try {
      console.log(`\n🤖 Nueva pregunta de usuario ${userId} (${userRole}):`);
      console.log(`   Empresa: ${companyId}`);
      console.log(`   Pregunta: "${question}"`);
      console.log(`   Contexto: ${JSON.stringify(context)}`);

      // 🧠 PASO 0: DETECTAR INTENCIÓN DE VERIFICACIÓN (PRIORIDAD MÁXIMA)
      const verificationIntent = this.detectVerificationIntent(question);

      if (verificationIntent && verificationIntent.isVerificationIntent) {
        console.log(`🧠 [VERIFICATION] Detectada intención de verificación: ${verificationIntent.verificationType}`);

        // Manejar verificación usando PrerequisiteChecker
        const verificationResult = await this.handleVerificationRequest(
          verificationIntent,
          companyId,
          userId
        );

        // Generar respuesta natural
        const response = this.generateVerificationResponse(verificationResult);

        // Guardar en knowledge base y conversación
        const savedEntry = await this.saveToKnowledgeBase({
          companyId,
          userId,
          userRole,
          question,
          context,
          answer: response.answer,
          answerSource: 'prerequisite_checker',
          modelUsed: 'prerequisite_checker',
          tokensUsed: 0,
          responseTimeMs: Date.now() - startTime,
          confidenceScore: response.confidence,
          diagnosticTriggered: false
        });

        const conversation = await this.saveConversation({
          companyId,
          userId,
          question,
          answer: response.answer,
          knowledgeEntryId: savedEntry.id,
          context,
          answerSource: 'prerequisite_checker',
          confidenceScore: response.confidence,
          responseTimeMs: Date.now() - startTime,
          diagnosticTriggered: false
        });

        console.log(`✅ Verificación completada en ${Date.now() - startTime}ms`);

        return {
          id: conversation.id,
          answer: response.answer,
          source: 'prerequisite_checker',
          confidence: response.confidence,
          verificationResult: verificationResult,
          responseTimeMs: Date.now() - startTime,
          suggestedActions: verificationResult.canProceed
            ? [{ label: 'Proceder', action: verificationResult.actionKey }]
            : verificationResult.missing?.map(m => ({ label: m.howToFix, module: m.relatedModule })) || []
        };
      }

      // PASO 0.5: 🔥 DETECTAR INTENCIÓN DE ACCIÓN
      const actionIntent = this.detectActionIntent(question);
      let processChain = null;

      if (actionIntent && actionIntent.isActionIntent && actionIntent.actionKey) {
        console.log(`🔗 [PROCESS CHAIN] Generando cadena para: ${actionIntent.actionKey}`);

        // Generar process chain automáticamente
        if (this.processChainGenerator) {
          try {
            processChain = await this.processChainGenerator.generateProcessChain(
              userId,
              companyId,
              actionIntent.actionKey,
              question // Pasar la pregunta original como contexto
            );

            console.log(`✅ [PROCESS CHAIN] Cadena generada con ${processChain.processSteps?.length || 0} pasos`);

          } catch (chainError) {
            console.error(`❌ [PROCESS CHAIN] Error generando cadena:`, chainError.message);
            // Continuar sin process chain
          }
        } else {
          console.warn(`⚠️ [PROCESS CHAIN] ProcessChainGenerator no disponible`);
        }
      }

      // PASO 1: Buscar en knowledge base (RAG - Retrieval)
      const similarAnswers = await this.searchKnowledgeBase(question, companyId, context.module);

      // PASO 2: Construir contexto completo (incluir process chain si existe)
      const fullContext = await this.buildContext(companyId, context, similarAnswers);

      // Agregar info del process chain al contexto para Ollama
      if (processChain) {
        fullContext.processChain = {
          action: processChain.action,
          canProceed: processChain.canProceed,
          stepsCount: processChain.processSteps?.length || 0,
          hasPrerequisites: (processChain.prerequisiteSteps?.length || 0) > 0,
          hasAlternativeRoute: !!processChain.alternativeRoute
        };
      }

      // PASO 3: Verificar si necesita diagnóstico técnico
      const needsDiagnostic = this.shouldTriggerDiagnostic(question);
      let diagnosticResults = null;

      if (needsDiagnostic) {
        console.log('🔍 Disparando diagnóstico técnico del auditor...');
        diagnosticResults = await this.runDiagnostic(companyId, context.module);
      }

      // PASO 4: Generar respuesta con Ollama (Augmented Generation)
      const generatedAnswer = await this.generateAnswer(question, fullContext, diagnosticResults, processChain);

      // PASO 5: Guardar en knowledge base GLOBAL (para aprendizaje compartido)
      const savedEntry = await this.saveToKnowledgeBase({
        companyId,
        userId,
        userRole,
        question,
        context,
        answer: generatedAnswer.answer,
        answerSource: generatedAnswer.source,
        modelUsed: this.model,
        tokensUsed: generatedAnswer.tokensUsed,
        responseTimeMs: Date.now() - startTime,
        confidenceScore: generatedAnswer.confidence,
        diagnosticTriggered: needsDiagnostic,
        diagnosticResults,
        suggestedActions: generatedAnswer.suggestedActions,
        quickReplies: generatedAnswer.quickReplies
      });

      // PASO 6: Guardar conversación MULTI-TENANT (historial privado)
      const conversation = await this.saveConversation({
        companyId,
        userId,
        question,
        answer: generatedAnswer.answer,
        knowledgeEntryId: savedEntry.id,
        context,
        answerSource: generatedAnswer.source,
        confidenceScore: generatedAnswer.confidence,
        responseTimeMs: Date.now() - startTime,
        diagnosticTriggered: needsDiagnostic
      });

      console.log(`✅ Respuesta generada en ${Date.now() - startTime}ms`);
      console.log(`   Fuente: ${generatedAnswer.source}`);
      console.log(`   Confianza: ${generatedAnswer.confidence}`);
      console.log(`   Knowledge base: ${savedEntry.id} (global)`);
      console.log(`   Conversación: ${conversation.id} (multi-tenant)`);

      return {
        id: conversation.id, // Retornar ID de conversación (multi-tenant)
        answer: generatedAnswer.answer,
        source: generatedAnswer.source,
        confidence: generatedAnswer.confidence,
        suggestedActions: generatedAnswer.suggestedActions,
        quickReplies: generatedAnswer.quickReplies,
        diagnosticTriggered: needsDiagnostic,
        diagnosticSummary: diagnosticResults ? this.summarizeDiagnostic(diagnosticResults) : null,
        responseTimeMs: Date.now() - startTime,
        // 🔥 PROCESS CHAIN - Incluir en respuesta
        processChain: processChain || null,
        actionIntent: actionIntent || null
      };

    } catch (error) {
      console.error('❌ Error en AssistantService.chat:', error.message);

      // Fallback: respuesta genérica si Ollama falla
      const fallbackAnswer = this.getFallbackAnswer(question, context);

      // Guardar error en knowledge base GLOBAL
      const fallbackEntry = await this.saveToKnowledgeBase({
        companyId,
        userId,
        userRole,
        question,
        context,
        answer: fallbackAnswer,
        answerSource: 'fallback',
        modelUsed: 'none',
        responseTimeMs: Date.now() - startTime,
        confidenceScore: 0.3
      });

      // Guardar conversación MULTI-TENANT
      const fallbackConversation = await this.saveConversation({
        companyId,
        userId,
        question,
        answer: fallbackAnswer,
        knowledgeEntryId: fallbackEntry.id,
        context,
        answerSource: 'fallback',
        confidenceScore: 0.3,
        responseTimeMs: Date.now() - startTime,
        diagnosticTriggered: false
      });

      return {
        id: fallbackConversation.id,
        answer: fallbackAnswer,
        source: 'fallback',
        confidence: 0.3,
        error: true,
        errorMessage: error.message
      };
    }
  }

  /**
   * Busca respuestas similares en knowledge base (RAG)
   * BÚSQUEDA GLOBAL - No filtra por empresa (aprendizaje compartido)
   */
  async searchKnowledgeBase(question, companyId, moduleName = null) {
    try {
      const query = `
        SELECT * FROM search_similar_answers($1, NULL, $2, 3)
      `;

      // Pasar NULL como company_id para búsqueda GLOBAL
      const result = await this.database.sequelize.query(query, {
        bind: [question, moduleName],
        type: this.database.sequelize.QueryTypes.SELECT
      });

      console.log(`🌐 Knowledge base GLOBAL: ${result.length} respuestas similares encontradas`);

      return result;
    } catch (error) {
      console.error('⚠️  Error buscando en knowledge base:', error.message);
      return [];
    }
  }

  /**
   * Construye contexto completo para enviar a Ollama
   * 🧠 Ahora con datos LIVE del Brain cuando está disponible
   */
  async buildContext(companyId, userContext, similarAnswers) {
    const context = {
      system: 'Eres un asistente experto en el Sistema de Asistencia Biométrico. Ayudas a usuarios a resolver problemas, entender funcionalidades y gestionar su sistema de RRHH.',
      company: { id: companyId },
      modules: [],
      knowledgeBase: [],
      currentContext: userContext,
      brainConnected: false,
      liveCodeInfo: null
    };

    // Agregar información de módulos del SystemRegistry
    // 🧠 Si Brain está conectado, enriquecer con datos LIVE
    if (userContext.module && this.systemRegistry) {
      try {
        let moduleInfo;
        let liveData = null;

        // 🧠 Intentar obtener datos enriquecidos con Brain
        if (this.brainService && this.systemRegistry.getModuleWithLiveData) {
          const enrichedModule = await this.systemRegistry.getModuleWithLiveData(userContext.module);
          if (enrichedModule) {
            moduleInfo = enrichedModule;
            liveData = enrichedModule.liveData;
            context.brainConnected = enrichedModule.brainConnected || false;

            // Si hay drift, avisar al sistema
            if (enrichedModule.drift?.hasDrift) {
              context.liveCodeInfo = {
                hasDrift: true,
                driftSummary: enrichedModule.drift.summary,
                newEndpoints: enrichedModule.drift.newEndpoints?.length || 0,
                missingEndpoints: enrichedModule.drift.missingEndpoints?.length || 0
              };
              console.log(`🧠 [CONTEXT] Drift detectado en ${userContext.module}: ${enrichedModule.drift.summary}`);
            }
          }
        }

        // Fallback a datos estáticos si no hay Brain
        if (!moduleInfo) {
          moduleInfo = this.systemRegistry.getModule(userContext.module);
        }

        if (moduleInfo) {
          const moduleContext = {
            name: moduleInfo.name,
            description: moduleInfo.description,
            category: moduleInfo.category,
            dependencies: moduleInfo.dependencies,
            help: moduleInfo.help
          };

          // 🧠 BRAIN DATA: Agregar info LIVE si está disponible
          if (liveData) {
            moduleContext.liveStatus = {
              filesFound: liveData.files?.length || 0,
              endpointsActive: liveData.endpoints?.length || 0,
              hasWorkflow: !!liveData.workflow,
              scannedAt: liveData.scannedAt
            };
            // Incluir endpoints reales detectados
            if (liveData.endpoints?.length > 0) {
              moduleContext.activeEndpoints = liveData.endpoints.slice(0, 5); // Top 5
            }
          }

          // ✅ Info específica de payroll-liquidation
          if (userContext.module === 'payroll-liquidation') {
            if (moduleInfo.formulas) moduleContext.formulas = moduleInfo.formulas;
            if (moduleInfo.entities) moduleContext.entities = moduleInfo.entities;
            if (moduleInfo.workflow) moduleContext.workflow = moduleInfo.workflow;
          }

          context.modules.push(moduleContext);
        }
      } catch (e) {
        console.warn('⚠️ Error obteniendo módulo de registry:', e.message);
      }
    }

    // Agregar respuestas previas similares
    if (similarAnswers.length > 0) {
      context.knowledgeBase = similarAnswers.map(ans => ({
        question: ans.question,
        answer: ans.answer,
        similarity: ans.similarity
      }));
    }

    return context;
  }

  /**
   * Genera respuesta usando Ollama
   */
  async generateAnswer(question, context, diagnosticResults = null, processChain = null) {
    try {
      // Construir prompt con contexto (incluir process chain si existe)
      const systemPrompt = this.buildSystemPrompt(context, diagnosticResults, processChain);
      const userPrompt = question;

      console.log('📤 Enviando request a Ollama...');

      const response = await axios.post(
        `${this.ollamaBaseURL}/api/chat`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          options: {
            temperature: this.temperature,
            num_predict: this.maxTokens
          }
        },
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const rawAnswer = response.data.message.content;

      // Parsear respuesta y extraer sugerencias/acciones
      const parsed = this.parseAnswer(rawAnswer);

      return {
        answer: parsed.answer,
        source: 'ollama',
        confidence: this.calculateConfidence(context, diagnosticResults),
        tokensUsed: response.data.eval_count || 0,
        suggestedActions: parsed.suggestedActions,
        quickReplies: parsed.quickReplies
      };

    } catch (error) {
      console.error('❌ Error llamando a Ollama:', error.message);

      // Si hay respuestas similares en knowledge base, usar la mejor
      if (context.knowledgeBase && context.knowledgeBase.length > 0) {
        const bestMatch = context.knowledgeBase[0];
        console.log('✅ Usando respuesta de knowledge base (cache)');

        return {
          answer: bestMatch.answer,
          source: 'cache',
          confidence: bestMatch.similarity,
          tokensUsed: 0,
          suggestedActions: [],
          quickReplies: []
        };
      }

      throw error;
    }
  }

  /**
   * Construye el system prompt con todo el contexto
   * 🔥 INCLUYE PROCESS CHAIN si está disponible
   */
  buildSystemPrompt(context, diagnosticResults, processChain = null) {
    let prompt = context.system + '\n\n';

    // 🔥 PROCESS CHAIN - Agregar PRIMERO si existe
    if (processChain) {
      prompt += '## 🔗 CADENA DE PROCESOS GENERADA:\n\n';
      prompt += `**Acción solicitada:** ${processChain.action}\n`;
      prompt += `**¿Puede proceder?** ${processChain.canProceed ? '✅ SÍ' : '❌ NO'}\n\n`;

      // Si hay prerequisitos faltantes
      if (processChain.prerequisiteSteps && processChain.prerequisiteSteps.length > 0) {
        prompt += `### ⚠️ PREREQUISITOS FALTANTES:\n`;
        prompt += `El usuario NO puede realizar esta acción porque le faltan los siguientes datos:\n\n`;
        processChain.prerequisiteSteps.forEach((prereq, idx) => {
          prompt += `${idx + 1}. **${prereq.missing}**: ${prereq.description}\n`;
          prompt += `   - Razón: ${prereq.reason}\n`;
          prompt += `   - Cómo solucionarlo: ${prereq.howToFix}\n\n`;
        });
        prompt += `**IMPORTANTE:** En tu respuesta, explica al usuario QUÉ le falta y CÓMO puede completarlo.\n\n`;
      }

      // Si puede proceder, mostrar pasos
      if (processChain.canProceed && processChain.processSteps && processChain.processSteps.length > 0) {
        prompt += `### ✅ PASOS A SEGUIR (${processChain.processSteps.length} pasos):\n\n`;
        processChain.processSteps.forEach((step, idx) => {
          prompt += `**Paso ${step.step || idx + 1}:** ${step.description}\n`;
          if (step.validation) prompt += `   ⚠️ Validación: ${step.validation}\n`;
          if (step.expectedTime) prompt += `   ⏱️ Tiempo estimado: ${step.expectedTime}\n`;
          prompt += '\n';
        });

        if (processChain.estimatedTime) {
          prompt += `**Tiempo total estimado:** ${processChain.estimatedTime}\n\n`;
        }

        if (processChain.expectedOutcome) {
          prompt += `**Resultado esperado:** ${processChain.expectedOutcome}\n\n`;
        }
      }

      // Ruta alternativa
      if (processChain.alternativeRoute) {
        prompt += `### 🔄 RUTA ALTERNATIVA:\n`;
        prompt += `${processChain.warnings.join('\n')}\n\n`;
      }

      // Warnings
      if (processChain.warnings && processChain.warnings.length > 0) {
        prompt += `### ⚠️ ADVERTENCIAS:\n`;
        processChain.warnings.forEach(w => prompt += `- ${w}\n`);
        prompt += '\n';
      }

      // Tips del Brain
      if (processChain.tips && processChain.tips.length > 0) {
        prompt += `### 💡 TIPS ACUMULADOS:\n`;
        processChain.tips.forEach(t => prompt += `- ${t}\n`);
        prompt += '\n';
      }

      prompt += '---\n\n';
    }

    // Agregar información de módulos
    if (context.modules.length > 0) {
      prompt += '## Módulo Actual:\n';
      context.modules.forEach(mod => {
        prompt += `**${mod.name}** (${mod.category})\n`;
        prompt += `${mod.description}\n\n`;

        if (mod.help && mod.help.quickStart) {
          prompt += `### Inicio Rápido:\n${mod.help.quickStart}\n\n`;
        }

        if (mod.help && mod.help.commonIssues && mod.help.commonIssues.length > 0) {
          prompt += `### Problemas Comunes:\n`;
          mod.help.commonIssues.forEach(issue => {
            prompt += `- **${issue.issue}:** ${issue.solution}\n`;
          });
          prompt += '\n';
        }
      });
    }

    // Agregar knowledge base (respuestas previas similares)
    if (context.knowledgeBase.length > 0) {
      prompt += '## Respuestas Previas Relevantes:\n';
      context.knowledgeBase.forEach((kb, i) => {
        prompt += `${i + 1}. Q: ${kb.question}\n   A: ${kb.answer}\n\n`;
      });
    }

    // Agregar resultados de diagnóstico si existen
    if (diagnosticResults) {
      prompt += '## Diagnóstico Técnico:\n';
      prompt += JSON.stringify(diagnosticResults, null, 2) + '\n\n';
    }

    prompt += '\n## Instrucciones:\n';
    prompt += '1. Responde en español de forma clara y concisa\n';
    prompt += '2. Si hay respuestas previas relevantes, úsalas como referencia\n';
    prompt += '3. Si hay diagnóstico técnico, incorpóralo en tu respuesta\n';
    if (processChain) {
      prompt += '4. **IMPORTANTE:** Si hay una CADENA DE PROCESOS generada arriba, tu respuesta DEBE:\n';
      prompt += '   - Explicar los pasos de forma amigable y clara\n';
      prompt += '   - Si faltan prerequisitos, explicar QUÉ falta y CÓMO solucionarlo\n';
      prompt += '   - Si hay ruta alternativa, explicarla claramente\n';
      prompt += '   - Mencionar el tiempo estimado total\n';
    }
    prompt += '5. Sugiere acciones concretas cuando sea posible\n';
    prompt += '6. Usa formato Markdown para mejor legibilidad\n';
    prompt += '7. Si no estás seguro, dilo honestamente\n';

    return prompt;
  }

  /**
   * Parsea la respuesta de Ollama para extraer acciones y quick replies
   */
  parseAnswer(rawAnswer) {
    // Por ahora retorna sin parsear, pero se puede mejorar
    // para detectar patrones como "ACCIÓN: [...]" o "OPCIONES: [...]"

    return {
      answer: rawAnswer,
      suggestedActions: [], // TODO: Parsear acciones del texto
      quickReplies: ['Sí, entiendo', 'Necesito más ayuda', 'Probar otra cosa']
    };
  }

  /**
   * Calcula score de confianza basado en contexto
   */
  calculateConfidence(context, diagnosticResults) {
    let confidence = 0.7; // Base

    // Mayor confianza si hay knowledge base
    if (context.knowledgeBase && context.knowledgeBase.length > 0) {
      confidence += 0.15;
    }

    // Mayor confianza si hay diagnóstico
    if (diagnosticResults) {
      confidence += 0.10;
    }

    // Mayor confianza si hay módulo específico
    if (context.modules && context.modules.length > 0) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Determina si la pregunta requiere diagnóstico técnico
   */
  shouldTriggerDiagnostic(question) {
    const diagnosticKeywords = [
      'no funciona',
      'error',
      'roto',
      'problema',
      'bug',
      'no carga',
      'no guarda',
      'falla',
      'crashed',
      'no responde',
      'lento'
    ];

    const lowerQuestion = question.toLowerCase();
    return diagnosticKeywords.some(keyword => lowerQuestion.includes(keyword));
  }

  /**
   * Ejecuta diagnóstico con AuditorEngine
   */
  async runDiagnostic(companyId, moduleName = null) {
    try {
      if (moduleName) {
        const results = await this.auditorEngine.runModuleAudit(moduleName, companyId);
        return results;
      } else {
        const results = await this.auditorEngine.runFullAudit(companyId);
        return results;
      }
    } catch (error) {
      console.error('⚠️  Error ejecutando diagnóstico:', error.message);
      return null;
    }
  }

  /**
   * Resume resultados de diagnóstico para mostrar al usuario
   */
  summarizeDiagnostic(diagnosticResults) {
    if (!diagnosticResults) return null;

    return {
      executionId: diagnosticResults.executionId,
      totalTests: diagnosticResults.summary?.total || 0,
      passed: diagnosticResults.summary?.passed || 0,
      failed: diagnosticResults.summary?.failed || 0,
      message: diagnosticResults.summary?.failed > 0
        ? `Se detectaron ${diagnosticResults.summary.failed} problemas que requieren atención.`
        : 'El sistema está funcionando correctamente.'
    };
  }

  /**
   * Guarda conversación en knowledge base GLOBAL (opcional company_id para analytics)
   */
  async saveToKnowledgeBase(data) {
    try {
      // FIX: Verificar que el modelo exista antes de destructurar
      if (!this.database.AssistantKnowledgeBase) {
        console.warn('⚠️  [SAVE-KB] AssistantKnowledgeBase model no está registrado - saltando guardado');
        return { id: null }; // Retornar objeto mock para no romper flujo
      }

      const { AssistantKnowledgeBase } = this.database;

      const normalizedQuestion = data.question
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Quitar acentos

      const entry = await AssistantKnowledgeBase.create({
        company_id: data.companyId || null, // OPCIONAL para analytics
        user_id: data.userId || null,
        user_role: data.userRole || null,
        question: data.question,
        question_normalized: normalizedQuestion,
        context: data.context,
        module_name: data.context?.module || null,
        answer: data.answer,
        answer_source: data.answerSource,
        model_used: data.modelUsed,
        tokens_used: data.tokensUsed,
        response_time_ms: data.responseTimeMs,
        confidence_score: data.confidenceScore,
        diagnostic_triggered: data.diagnosticTriggered || false,
        diagnostic_execution_id: data.diagnosticResults?.executionId || null,
        diagnostic_results: data.diagnosticResults || null,
        suggested_actions: data.suggestedActions || null,
        quick_replies: data.quickReplies || null
      });

      console.log(`🌐 Guardado en knowledge base GLOBAL: ${entry.id}`);

      return entry;
    } catch (error) {
      console.error('❌ Error guardando en knowledge base:', error.message);
      throw error;
    }
  }

  /**
   * Guarda conversación en historial MULTI-TENANT (company_id obligatorio)
   */
  async saveConversation(data) {
    try {
      // FIX: Verificar que el modelo exista antes de destructurar
      if (!this.database.AssistantConversation) {
        console.warn('⚠️  [SAVE-CONV] AssistantConversation model no está registrado - saltando guardado');
        return { id: null }; // Retornar objeto mock para no romper flujo
      }

      const { AssistantConversation } = this.database;

      if (!data.companyId) {
        throw new Error('company_id es obligatorio para conversaciones');
      }

      const conversation = await AssistantConversation.create({
        company_id: data.companyId,
        user_id: data.userId,
        question: data.question,
        answer: data.answer,
        knowledge_entry_id: data.knowledgeEntryId || null,
        context: data.context,
        module_name: data.context?.module || null,
        screen_name: data.context?.screen || null,
        answer_source: data.answerSource,
        confidence: data.confidenceScore || 0.0,
        response_time_ms: data.responseTimeMs,
        diagnostic_triggered: data.diagnosticTriggered || false
      });

      console.log(`🔒 Conversación guardada (multi-tenant): ${conversation.id} - Empresa: ${data.companyId}`);

      return conversation;
    } catch (error) {
      console.error('❌ Error guardando conversación:', error.message);
      throw error;
    }
  }

  /**
   * Registra feedback del usuario (👍👎)
   * El entryId es el ID de la CONVERSACIÓN (multi-tenant)
   */
  async submitFeedback(entryId, helpful, comment = null) {
    try {
      // FIX: Verificar que los modelos existan antes de destructurar
      if (!database.AssistantConversation || !database.AssistantKnowledgeBase) {
        console.warn('⚠️  [FEEDBACK] Modelos de Assistant no están registrados - saltando feedback');
        return { success: false, error: 'Models not initialized' };
      }

      const { AssistantConversation, AssistantKnowledgeBase } = database;

      // 1. Actualizar conversación (multi-tenant)
      await AssistantConversation.update(
        {
          helpful,
          feedback_comment: comment,
          feedback_at: new Date()
        },
        {
          where: { id: entryId }
        }
      );

      // 2. Buscar si esta conversación está vinculada a una entrada del knowledge base
      const conversation = await AssistantConversation.findOne({
        where: { id: entryId },
        attributes: ['knowledge_entry_id']
      });

      // 3. Si existe vinculación, actualizar también el knowledge base GLOBAL
      if (conversation && conversation.knowledge_entry_id) {
        await AssistantKnowledgeBase.update(
          {
            helpful,
            feedback_comment: comment,
            feedback_at: new Date()
          },
          {
            where: { id: conversation.knowledge_entry_id }
          }
        );

        // Si es positivo, incrementar reused_count para futuras búsquedas GLOBALES
        if (helpful) {
          await AssistantKnowledgeBase.increment('reused_count', {
            where: { id: conversation.knowledge_entry_id }
          });
        }

        console.log(`📊 Feedback registrado: ${helpful ? '👍' : '👎'}`);
        console.log(`   Conversación: ${entryId}`);
        console.log(`   Knowledge base: ${conversation.knowledge_entry_id}`);
      } else {
        console.log(`📊 Feedback registrado: ${helpful ? '👍' : '👎'} (solo conversación ${entryId})`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error guardando feedback:', error.message);
      throw error;
    }
  }

  /**
   * Respuesta de fallback cuando Ollama no está disponible
   */
  getFallbackAnswer(question, context) {
    const moduleName = context.module || 'del sistema';

    return `Lo siento, estoy experimentando problemas técnicos en este momento y no puedo generar una respuesta personalizada.

**Sugerencias para resolver tu pregunta sobre ${moduleName}:**

1. Consulta la documentación del módulo en el menú de ayuda
2. Verifica que todos los campos requeridos estén completos
3. Intenta refrescar la página (F5)
4. Si el problema persiste, contacta al administrador del sistema

**Pregunta:** ${question}

*Esta es una respuesta automática de emergencia. El sistema de IA se restaurará pronto.*`;
  }

  /**
   * Verifica si Ollama está disponible
   */
  async checkHealth() {
    try {
      const response = await axios.get(this.ollamaBaseURL, { timeout: 5000 });
      return {
        available: true,
        message: 'Ollama is running',
        baseURL: this.ollamaBaseURL
      };
    } catch (error) {
      return {
        available: false,
        message: error.message,
        baseURL: this.ollamaBaseURL
      };
    }
  }

  /**
   * Obtiene estadísticas del asistente (MULTI-TENANT - por empresa)
   */
  async getStats(companyId, daysBack = 30) {
    try {
      const query = `
        SELECT * FROM get_company_conversation_stats($1, $2)
      `;

      const result = await this.database.sequelize.query(query, {
        bind: [companyId, daysBack],
        type: this.database.sequelize.QueryTypes.SELECT
      });

      // También obtener stats globales del knowledge base
      const globalQuery = `
        SELECT * FROM get_global_knowledge_stats()
      `;

      const globalResult = await this.database.sequelize.query(globalQuery, {
        type: this.database.sequelize.QueryTypes.SELECT
      });

      return {
        company: result[0] || {},
        global: globalResult[0] || {}
      };
    } catch (error) {
      console.error('❌ Error obteniendo stats:', error.message);
      return { company: {}, global: {} };
    }
  }
}

module.exports = AssistantService;
