/**
 * PRODUCTION ERROR MONITOR - Sistema de Auto-Aprendizaje en Producción
 *
 * Este componente cierra el ciclo completo:
 * 1. Usuario navega y encuentra error
 * 2. Error se detecta automáticamente
 * 3. Auditor se dispara para diagnosticar
 * 4. Healer intenta reparar
 * 5. Resultado se documenta en Knowledge Base
 * 6. Ollama aprende del error
 * 7. Próximo usuario que pregunte recibe la solución
 *
 * CICLO DE AUTO-APRENDIZAJE:
 * Error Real → Diagnóstico → Reparación → Documentación → Aprendizaje → Asistencia
 *
 * @version 1.0.0
 * @date 2025-10-20
 */

const EventEmitter = require('events');

class ProductionErrorMonitor extends EventEmitter {
  constructor(database, auditorEngine, systemRegistry, assistantService) {
    super();
    this.database = database;
    this.auditorEngine = auditorEngine;
    this.systemRegistry = systemRegistry;
    this.assistantService = assistantService;

    this.isActive = false;
    this.errorBuffer = []; // Buffer de errores detectados
    this.processingQueue = new Set(); // Evitar duplicados
    this.learningMetrics = {
      errorsDetected: 0,
      errorsRepaired: 0,
      knowledgeEntriesCreated: 0,
      successRate: 0
    };

    console.log('🧠 [PRODUCTION-MONITOR] Inicializado - Auto-aprendizaje activo');
  }

  /**
   * PASO 1: Registrar error detectado en navegación real
   * Esto se llama cuando un usuario encuentra un error visible
   */
  async reportError(errorData) {
    const {
      companyId,
      userId,
      moduleId,
      errorMessage,
      errorElement, // ID o clase del div con error
      timestamp = new Date(),
      userContext
    } = errorData;

    console.log(`\n🔴 [PRODUCTION-ERROR] Error reportado en producción:`);
    console.log(`   Empresa: ${companyId}`);
    console.log(`   Módulo: ${moduleId}`);
    console.log(`   Error: "${errorMessage}"`);

    // Evitar procesar el mismo error múltiples veces
    const errorKey = `${moduleId}-${errorMessage}`;
    if (this.processingQueue.has(errorKey)) {
      console.log(`   ⏭️  Error ya está siendo procesado`);
      return;
    }

    this.processingQueue.add(errorKey);
    this.learningMetrics.errorsDetected++;

    try {
      // PASO 2: Disparar diagnóstico automático
      const diagnosis = await this.diagnoseError({
        companyId,
        moduleId,
        errorMessage,
        errorElement,
        userContext
      });

      // PASO 3: Intentar reparación
      const repairResult = await this.attemptRepair({
        diagnosis,
        moduleId,
        errorMessage
      });

      // PASO 4: Documentar en Knowledge Base (para Ollama)
      await this.documentLearning({
        companyId,
        userId,
        moduleId,
        errorMessage,
        diagnosis,
        repairResult,
        timestamp
      });

      // PASO 5: Emitir evento de aprendizaje completado
      this.emit('learning-complete', {
        moduleId,
        errorMessage,
        wasRepaired: repairResult.success,
        knowledgeEntryId: repairResult.knowledgeEntryId
      });

      if (repairResult.success) {
        this.learningMetrics.errorsRepaired++;
      }

      this.learningMetrics.knowledgeEntriesCreated++;
      this.learningMetrics.successRate = (
        (this.learningMetrics.errorsRepaired / this.learningMetrics.errorsDetected) * 100
      ).toFixed(1);

    } catch (error) {
      console.error(`❌ [PRODUCTION-MONITOR] Error procesando:`, error.message);
    } finally {
      this.processingQueue.delete(errorKey);
    }
  }

  /**
   * PASO 2: Diagnosticar el error usando el Auditor
   */
  async diagnoseError({ companyId, moduleId, errorMessage, errorElement, userContext }) {
    console.log(`\n🔍 [DIAGNÓSTICO] Analizando error en ${moduleId}...`);

    try {
      // Ejecutar auditoría específica del módulo
      const auditResult = await this.auditorEngine.runModuleAudit(moduleId, {
        company_id: companyId,
        focusOnError: errorMessage // Hint para el auditor
      });

      // Analizar logs de la auditoría
      const { AuditLog } = this.database;
      const recentLogs = await AuditLog.findAll({
        where: {
          module_name: moduleId,
          status: 'fail'
        },
        order: [['created_at', 'DESC']],
        limit: 5
      });

      // Buscar información del módulo en SystemRegistry
      const moduleInfo = this.systemRegistry.getModule(moduleId);

      return {
        moduleId,
        errorMessage,
        errorElement,
        auditLogs: recentLogs,
        moduleInfo,
        possibleCauses: this.identifyPossibleCauses(recentLogs, errorMessage),
        relatedModules: moduleInfo?.dependencies?.required || [],
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ [DIAGNÓSTICO] Error:`, error.message);
      return {
        moduleId,
        errorMessage,
        diagnosisError: error.message
      };
    }
  }

  /**
   * Identificar posibles causas del error
   */
  identifyPossibleCauses(auditLogs, errorMessage) {
    const causes = [];

    // Causa 1: Endpoint no existe o retorna error
    if (errorMessage.includes('Error cargando') || errorMessage.includes('servidor')) {
      causes.push({
        type: 'api-error',
        description: 'Endpoint de API no existe o retorna error',
        likelihood: 'high'
      });
    }

    // Causa 2: Datos vacíos
    if (errorMessage.includes('no hay') || errorMessage.includes('vacío')) {
      causes.push({
        type: 'empty-data',
        description: 'No hay datos en la base de datos',
        likelihood: 'medium'
      });
    }

    // Causa 3: Permiso denegado
    if (errorMessage.includes('permiso') || errorMessage.includes('acceso')) {
      causes.push({
        type: 'permission-denied',
        description: 'Usuario no tiene permisos para acceder',
        likelihood: 'medium'
      });
    }

    // Causa 4: Función JavaScript no existe
    if (auditLogs.some(log => log.error_message?.includes('is not a function'))) {
      causes.push({
        type: 'js-error',
        description: 'Función JavaScript no está definida',
        likelihood: 'high'
      });
    }

    return causes;
  }

  /**
   * PASO 3: Intentar reparar el error usando los Healers
   */
  async attemptRepair({ diagnosis, moduleId, errorMessage }) {
    console.log(`\n🔧 [REPARACIÓN] Intentando reparar error en ${moduleId}...`);

    try {
      // Obtener el healer más apropiado
      const healer = this.auditorEngine.getHealer('advanced') ||
                     this.auditorEngine.getHealer('hybrid');

      if (!healer) {
        console.log(`⚠️  [REPARACIÓN] No hay healer disponible`);
        return {
          success: false,
          reason: 'No healer available',
          suggestions: diagnosis.possibleCauses
        };
      }

      // Simular un "failure" para que el healer pueda procesarlo
      const failure = {
        module: moduleId,
        error_message: errorMessage,
        error_type: diagnosis.possibleCauses[0]?.type || 'unknown',
        error_context: {
          causes: diagnosis.possibleCauses,
          auditLogs: diagnosis.auditLogs?.map(log => ({
            test_name: log.test_name,
            error: log.error_message
          }))
        }
      };

      // Intentar reparación
      const healResult = await healer.heal(failure, 'production-auto-repair');

      if (healResult.success) {
        console.log(`✅ [REPARACIÓN] Error reparado exitosamente`);
        console.log(`   Estrategia: ${healResult.strategy}`);
        return {
          success: true,
          strategy: healResult.strategy,
          changes: healResult.changes_applied || healResult.suggestion,
          confidence: healResult.confidence
        };
      } else {
        console.log(`⚠️  [REPARACIÓN] No se pudo reparar automáticamente`);
        return {
          success: false,
          reason: healResult.reason,
          suggestions: healResult.suggestion ? [healResult.suggestion] : diagnosis.possibleCauses
        };
      }

    } catch (error) {
      console.error(`❌ [REPARACIÓN] Error:`, error.message);
      return {
        success: false,
        reason: error.message,
        suggestions: diagnosis.possibleCauses
      };
    }
  }

  /**
   * PASO 4: Documentar el aprendizaje en Knowledge Base
   * Esto alimenta a Ollama para que aprenda del error
   */
  async documentLearning({ companyId, userId, moduleId, errorMessage, diagnosis, repairResult, timestamp }) {
    console.log(`\n📚 [KNOWLEDGE-BASE] Documentando aprendizaje...`);

    try {
      // FIX: Verificar que el modelo exista antes de destructurar
      if (!this.database.AssistantKnowledgeBase) {
        console.warn('⚠️  [KNOWLEDGE-BASE] AssistantKnowledgeBase model no está registrado - saltando documentación');
        return null;
      }

      const { AssistantKnowledgeBase } = this.database;

      // Construir la pregunta que haría un usuario
      const userQuestion = this.generateUserQuestion(moduleId, errorMessage);

      // Construir la respuesta con el conocimiento adquirido
      const assistantAnswer = this.generateAssistantAnswer({
        moduleId,
        errorMessage,
        diagnosis,
        repairResult
      });

      // Guardar en Knowledge Base GLOBAL (todas las empresas aprenden)
      const knowledgeEntry = await AssistantKnowledgeBase.create({
        // company_id: NULL → GLOBAL (todas las empresas se benefician)
        user_id: userId,
        user_role: 'system', // Aprendizaje del sistema, no de un usuario específico
        question: userQuestion,
        question_embedding: null, // TODO: Generar embedding si se implementa búsqueda semántica
        context_module: moduleId,
        context_submodule: null,
        answer_text: assistantAnswer.text,
        answer_source: 'production-auto-learning',
        model_used: 'system-auditor',
        tokens_used: 0,
        response_time_ms: 0,
        confidence_score: repairResult.success ? 0.9 : 0.6,
        diagnostic_triggered: true,
        diagnostic_results: {
          diagnosis,
          repairResult
        },
        suggested_actions: assistantAnswer.actions,
        quick_replies: assistantAnswer.quickReplies,
        feedback_score: repairResult.success ? 1 : 0, // Auto-feedback
        feedback_comment: repairResult.success ?
          'Error reparado automáticamente en producción' :
          'Error detectado pero no reparado automáticamente',
        usage_count: 0,
        last_used_at: timestamp
      });

      console.log(`✅ [KNOWLEDGE-BASE] Entrada creada: ID ${knowledgeEntry.id}`);
      console.log(`   Pregunta: "${userQuestion}"`);
      console.log(`   Respuesta: "${assistantAnswer.text.substring(0, 100)}..."`);

      return {
        knowledgeEntryId: knowledgeEntry.id,
        question: userQuestion,
        answer: assistantAnswer.text
      };

    } catch (error) {
      console.error(`❌ [KNOWLEDGE-BASE] Error:`, error.message);
      return null;
    }
  }

  /**
   * Generar pregunta que haría un usuario al ver este error
   */
  generateUserQuestion(moduleId, errorMessage) {
    // Mapeo de errores a preguntas naturales
    const errorPatterns = [
      {
        pattern: /error cargando (.*?) del servidor/i,
        question: (match) => `¿Por qué no se cargan las ${match[1]}?`
      },
      {
        pattern: /no se pudo (.*)/i,
        question: (match) => `¿Qué hago si ${match[0].toLowerCase()}?`
      },
      {
        pattern: /(.*?) no funciona/i,
        question: (match) => `¿Por qué ${match[1]} no funciona?`
      }
    ];

    for (const { pattern, question } of errorPatterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        return question(match);
      }
    }

    // Pregunta genérica
    return `¿Por qué aparece el error "${errorMessage}" en ${moduleId}?`;
  }

  /**
   * Generar respuesta del asistente con el conocimiento adquirido
   */
  generateAssistantAnswer({ moduleId, errorMessage, diagnosis, repairResult }) {
    let text = '';
    const actions = [];
    const quickReplies = [];

    if (repairResult.success) {
      // Error reparado
      text = `✅ Este error fue detectado y reparado automáticamente por el sistema.\n\n`;
      text += `**Error original:** ${errorMessage}\n\n`;
      text += `**Solución aplicada:** ${repairResult.strategy}\n\n`;

      if (repairResult.changes) {
        text += `**Cambios realizados:**\n${JSON.stringify(repairResult.changes, null, 2)}\n\n`;
      }

      text += `Si vuelves a ver este error, prueba refrescar la página (F5). Si persiste, contacta al soporte técnico.`;

      actions.push({
        label: 'Refrescar página',
        action: 'reload'
      });

    } else {
      // Error no reparado
      text = `⚠️ Este es un error conocido que el sistema aún no puede reparar automáticamente.\n\n`;
      text += `**Error:** ${errorMessage}\n\n`;
      text += `**Posibles causas:**\n`;

      diagnosis.possibleCauses?.forEach((cause, index) => {
        text += `${index + 1}. ${cause.description} (probabilidad: ${cause.likelihood})\n`;
      });

      text += `\n**Soluciones sugeridas:**\n`;

      if (repairResult.suggestions) {
        repairResult.suggestions.forEach((suggestion, index) => {
          text += `${index + 1}. ${suggestion.description || suggestion.solution || JSON.stringify(suggestion)}\n`;
        });
      }

      actions.push({
        label: 'Reportar al soporte',
        action: 'report-support',
        data: { moduleId, errorMessage }
      });

      actions.push({
        label: 'Ver documentación',
        action: 'open-docs',
        data: { moduleId }
      });
    }

    quickReplies.push('¿Cómo prevengo este error?');
    quickReplies.push('¿Necesito permisos especiales?');
    quickReplies.push('Contactar soporte');

    return {
      text,
      actions,
      quickReplies
    };
  }

  /**
   * Obtener métricas de aprendizaje
   */
  getMetrics() {
    return {
      ...this.learningMetrics,
      bufferSize: this.errorBuffer.length,
      processing: this.processingQueue.size
    };
  }

  /**
   * Activar/Desactivar monitor
   */
  activate() {
    this.isActive = true;
    console.log('✅ [PRODUCTION-MONITOR] Activado');
  }

  deactivate() {
    this.isActive = false;
    console.log('⏸️  [PRODUCTION-MONITOR] Desactivado');
  }
}

module.exports = ProductionErrorMonitor;
