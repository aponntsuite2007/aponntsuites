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

class AssistantService {
  constructor() {
    // Configuración de Ollama desde environment variables
    this.ollamaBaseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.temperature = parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7');
    this.maxTokens = parseInt(process.env.OLLAMA_MAX_TOKENS || '500');
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '30000');

    // Instancias de otros servicios
    this.systemRegistry = new SystemRegistry();
    this.auditorEngine = new AuditorEngine();

    console.log('🤖 AssistantService inicializado');
    console.log(`   Ollama URL: ${this.ollamaBaseURL}`);
    console.log(`   Modelo: ${this.model}`);
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
   * @returns {Promise<Object>} { answer, source, confidence, suggestions, diagnosticTriggered }
   */
  async chat(params) {
    const { companyId, userId, userRole, question, context = {} } = params;

    const startTime = Date.now();

    try {
      console.log(`\n🤖 Nueva pregunta de usuario ${userId} (${userRole}):`);
      console.log(`   Empresa: ${companyId}`);
      console.log(`   Pregunta: "${question}"`);
      console.log(`   Contexto: ${JSON.stringify(context)}`);

      // PASO 1: Buscar en knowledge base (RAG - Retrieval)
      const similarAnswers = await this.searchKnowledgeBase(question, companyId, context.module);

      // PASO 2: Construir contexto completo
      const fullContext = await this.buildContext(companyId, context, similarAnswers);

      // PASO 3: Verificar si necesita diagnóstico técnico
      const needsDiagnostic = this.shouldTriggerDiagnostic(question);
      let diagnosticResults = null;

      if (needsDiagnostic) {
        console.log('🔍 Disparando diagnóstico técnico del auditor...');
        diagnosticResults = await this.runDiagnostic(companyId, context.module);
      }

      // PASO 4: Generar respuesta con Ollama (Augmented Generation)
      const generatedAnswer = await this.generateAnswer(question, fullContext, diagnosticResults);

      // PASO 5: Guardar en knowledge base
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

      console.log(`✅ Respuesta generada en ${Date.now() - startTime}ms`);
      console.log(`   Fuente: ${generatedAnswer.source}`);
      console.log(`   Confianza: ${generatedAnswer.confidence}`);
      console.log(`   ID guardado: ${savedEntry.id}`);

      return {
        id: savedEntry.id,
        answer: generatedAnswer.answer,
        source: generatedAnswer.source,
        confidence: generatedAnswer.confidence,
        suggestedActions: generatedAnswer.suggestedActions,
        quickReplies: generatedAnswer.quickReplies,
        diagnosticTriggered: needsDiagnostic,
        diagnosticSummary: diagnosticResults ? this.summarizeDiagnostic(diagnosticResults) : null,
        responseTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Error en AssistantService.chat:', error.message);

      // Fallback: respuesta genérica si Ollama falla
      const fallbackAnswer = this.getFallbackAnswer(question, context);

      // Guardar error en knowledge base
      await this.saveToKnowledgeBase({
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

      return {
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
   */
  async searchKnowledgeBase(question, companyId, moduleName = null) {
    try {
      const query = `
        SELECT * FROM search_similar_answers($1, $2, $3, 3)
      `;

      const result = await database.sequelize.query(query, {
        bind: [question, companyId, moduleName],
        type: database.sequelize.QueryTypes.SELECT
      });

      console.log(`📚 Knowledge base: ${result.length} respuestas similares encontradas`);

      return result;
    } catch (error) {
      console.error('⚠️  Error buscando en knowledge base:', error.message);
      return [];
    }
  }

  /**
   * Construye contexto completo para enviar a Ollama
   */
  async buildContext(companyId, userContext, similarAnswers) {
    const context = {
      system: 'Eres un asistente experto en el Sistema de Asistencia Biométrico. Ayudas a usuarios a resolver problemas, entender funcionalidades y gestionar su sistema de RRHH.',
      company: { id: companyId },
      modules: [],
      knowledgeBase: [],
      currentContext: userContext
    };

    // Agregar información de módulos del SystemRegistry
    if (userContext.module) {
      const moduleInfo = this.systemRegistry.getModule(userContext.module);
      if (moduleInfo) {
        context.modules.push({
          name: moduleInfo.name,
          description: moduleInfo.description,
          category: moduleInfo.category,
          dependencies: moduleInfo.dependencies,
          help: moduleInfo.help
        });
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
  async generateAnswer(question, context, diagnosticResults = null) {
    try {
      // Construir prompt con contexto
      const systemPrompt = this.buildSystemPrompt(context, diagnosticResults);
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
   */
  buildSystemPrompt(context, diagnosticResults) {
    let prompt = context.system + '\n\n';

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
    prompt += '4. Sugiere acciones concretas cuando sea posible\n';
    prompt += '5. Usa formato Markdown para mejor legibilidad\n';
    prompt += '6. Si no estás seguro, dilo honestamente\n';

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
   * Guarda conversación en knowledge base
   */
  async saveToKnowledgeBase(data) {
    try {
      const { AssistantKnowledgeBase } = database;

      const normalizedQuestion = data.question
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Quitar acentos

      const entry = await AssistantKnowledgeBase.create({
        company_id: data.companyId,
        user_id: data.userId,
        user_role: data.userRole,
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

      return entry;
    } catch (error) {
      console.error('❌ Error guardando en knowledge base:', error.message);
      throw error;
    }
  }

  /**
   * Registra feedback del usuario (👍👎)
   */
  async submitFeedback(entryId, helpful, comment = null) {
    try {
      const { AssistantKnowledgeBase } = database;

      await AssistantKnowledgeBase.update(
        {
          helpful,
          feedback_comment: comment,
          feedback_at: new Date()
        },
        {
          where: { id: entryId }
        }
      );

      // Si es positivo, incrementar reused_count para futuras búsquedas
      if (helpful) {
        await AssistantKnowledgeBase.increment('reused_count', {
          where: { id: entryId }
        });
      }

      console.log(`📊 Feedback registrado: ${helpful ? '👍' : '👎'} para entry ${entryId}`);

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
   * Obtiene estadísticas del asistente
   */
  async getStats(companyId, daysBack = 30) {
    try {
      const query = `
        SELECT * FROM get_assistant_stats($1, $2)
      `;

      const result = await database.sequelize.query(query, {
        bind: [companyId, daysBack],
        type: database.sequelize.QueryTypes.SELECT
      });

      return result[0] || {};
    } catch (error) {
      console.error('❌ Error obteniendo stats:', error.message);
      return {};
    }
  }
}

module.exports = AssistantService;
