/**
 * ============================================================================
 * TRAINING & KNOWLEDGE SERVICE - Sistema de Capacitación Inteligente
 * ============================================================================
 *
 * Servicio unificado para:
 * - Tutoriales por módulo (auto-generados desde Brain)
 * - Capacitación con autoevaluación obligatoria
 * - Notificaciones de novedades a staff/asociados
 * - Generación de tutoriales personalizados para tickets
 * - Tracking de progreso de capacitación
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const { Op } = require('sequelize');

class TrainingKnowledgeService {
  constructor(database, brainService = null, brainAnalyzer = null) {
    this.database = database;
    this.brainService = brainService;
    this.brainAnalyzer = brainAnalyzer;

    // Cache de tutoriales generados
    this.tutorialCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutos

    // Configuración
    this.config = {
      autoEvaluationPassScore: 70, // % mínimo para aprobar
      notifyNewModules: true,
      notifyUpdates: true,
      tutorialFormats: ['video_script', 'step_by_step', 'faq', 'quick_reference']
    };

    console.log('📚 [TRAINING-KB] Training & Knowledge Service inicializado');
  }

  /**
   * Inyectar Brain Service después de construcción
   */
  setBrainService(brainService) {
    this.brainService = brainService;
    console.log('📚 [TRAINING-KB] Brain Service conectado');
  }

  setBrainAnalyzer(brainAnalyzer) {
    this.brainAnalyzer = brainAnalyzer;
    console.log('📚 [TRAINING-KB] Brain Analyzer conectado');
  }

  // =========================================================================
  // 1. GENERACIÓN DE TUTORIALES POR MÓDULO
  // =========================================================================

  /**
   * Genera un tutorial completo para un módulo específico
   */
  async generateModuleTutorial(moduleKey, options = {}) {
    const {
      format = 'step_by_step',
      audience = 'user', // user, admin, support, associate
      language = 'es',
      includeExamples = true,
      includeScreenshots = false
    } = options;

    console.log(`📖 [TRAINING-KB] Generando tutorial para: ${moduleKey}`);

    // Obtener información del módulo desde el Brain
    let moduleInfo = null;
    if (this.brainService) {
      try {
        moduleInfo = await this.brainService.getModuleWithLiveData?.(moduleKey);
      } catch (e) {
        console.log(`   ⚠️ Brain no disponible: ${e.message}`);
      }
    }

    // Fallback a registry si no hay Brain
    if (!moduleInfo) {
      moduleInfo = await this._getModuleFromRegistry(moduleKey);
    }

    if (!moduleInfo) {
      return {
        success: false,
        error: `Módulo ${moduleKey} no encontrado`
      };
    }

    // Generar tutorial según formato
    const tutorial = await this._buildTutorial(moduleInfo, format, audience, language, includeExamples);

    // Cachear resultado
    const cacheKey = `${moduleKey}_${format}_${audience}`;
    this.tutorialCache.set(cacheKey, {
      data: tutorial,
      timestamp: Date.now()
    });

    return {
      success: true,
      tutorial,
      metadata: {
        moduleKey,
        format,
        audience,
        generatedAt: new Date().toISOString(),
        brainConnected: !!this.brainService
      }
    };
  }

  /**
   * Construye el tutorial según el formato solicitado
   */
  async _buildTutorial(moduleInfo, format, audience, language, includeExamples) {
    const baseInfo = {
      title: moduleInfo.name || moduleInfo.key,
      description: moduleInfo.description || 'Sin descripción disponible',
      category: moduleInfo.category || 'general',
      version: moduleInfo.version || '1.0.0',
      dependencies: moduleInfo.dependencies || [],
      prerequisites: this._getPrerequisites(moduleInfo, audience)
    };

    switch (format) {
      case 'step_by_step':
        return this._buildStepByStepTutorial(baseInfo, moduleInfo, audience, includeExamples);

      case 'video_script':
        return this._buildVideoScript(baseInfo, moduleInfo, audience);

      case 'faq':
        return this._buildFAQ(baseInfo, moduleInfo, audience);

      case 'quick_reference':
        return this._buildQuickReference(baseInfo, moduleInfo, audience);

      default:
        return this._buildStepByStepTutorial(baseInfo, moduleInfo, audience, includeExamples);
    }
  }

  /**
   * Tutorial paso a paso
   */
  _buildStepByStepTutorial(baseInfo, moduleInfo, audience, includeExamples) {
    const steps = [];

    // Paso 1: Introducción
    steps.push({
      step: 1,
      title: `Introducción a ${baseInfo.title}`,
      content: baseInfo.description,
      duration: '2 min',
      type: 'theory'
    });

    // Paso 2: Requisitos previos
    if (baseInfo.prerequisites.length > 0) {
      steps.push({
        step: 2,
        title: 'Requisitos Previos',
        content: `Antes de usar este módulo, asegúrese de tener configurado: ${baseInfo.prerequisites.join(', ')}`,
        duration: '1 min',
        type: 'checklist',
        items: baseInfo.prerequisites
      });
    }

    // Paso 3: Acceso al módulo
    steps.push({
      step: steps.length + 1,
      title: 'Cómo Acceder',
      content: this._getAccessInstructions(moduleInfo, audience),
      duration: '1 min',
      type: 'navigation'
    });

    // Paso 4+: Funcionalidades principales
    const features = this._extractFeatures(moduleInfo);
    features.forEach((feature, idx) => {
      steps.push({
        step: steps.length + 1,
        title: feature.name,
        content: feature.description,
        duration: `${2 + idx}  min`,
        type: 'feature',
        actions: feature.actions || [],
        tips: feature.tips || []
      });
    });

    // Paso final: Mejores prácticas
    steps.push({
      step: steps.length + 1,
      title: 'Mejores Prácticas',
      content: this._getBestPractices(moduleInfo, audience),
      duration: '2 min',
      type: 'best_practices'
    });

    return {
      ...baseInfo,
      format: 'step_by_step',
      totalSteps: steps.length,
      estimatedDuration: `${steps.length * 2} min`,
      steps,
      quiz: this._generateQuiz(moduleInfo, steps)
    };
  }

  /**
   * Script para video tutorial
   */
  _buildVideoScript(baseInfo, moduleInfo, audience) {
    return {
      ...baseInfo,
      format: 'video_script',
      estimatedDuration: '5-7 min',
      sections: [
        {
          timestamp: '0:00',
          title: 'Introducción',
          script: `Bienvenido al tutorial de ${baseInfo.title}. ${baseInfo.description}`,
          visualNotes: 'Mostrar logo del módulo y pantalla principal'
        },
        {
          timestamp: '0:30',
          title: 'Vista General',
          script: `${baseInfo.title} es parte de la categoría ${baseInfo.category}. ` +
                  `${moduleInfo.commercial?.description || 'Este módulo facilita sus operaciones diarias.'}`,
          visualNotes: 'Navegación general del módulo'
        },
        {
          timestamp: '1:30',
          title: 'Funciones Principales',
          script: this._extractFeatures(moduleInfo).map(f => f.name).join(', '),
          visualNotes: 'Demostración de cada función'
        },
        {
          timestamp: '4:00',
          title: 'Consejos y Trucos',
          script: this._getBestPractices(moduleInfo, audience),
          visualNotes: 'Highlight de accesos rápidos'
        },
        {
          timestamp: '5:30',
          title: 'Cierre',
          script: `Eso es todo por hoy. Si tiene dudas, puede contactar a soporte o consultar la documentación en línea.`,
          visualNotes: 'Mostrar información de contacto'
        }
      ]
    };
  }

  /**
   * Preguntas frecuentes
   */
  _buildFAQ(baseInfo, moduleInfo, audience) {
    const faqs = [
      {
        question: `¿Qué es ${baseInfo.title}?`,
        answer: baseInfo.description
      },
      {
        question: `¿Cómo accedo a ${baseInfo.title}?`,
        answer: this._getAccessInstructions(moduleInfo, audience)
      },
      {
        question: `¿Qué permisos necesito para usar ${baseInfo.title}?`,
        answer: this._getPermissionInfo(moduleInfo, audience)
      },
      {
        question: `¿${baseInfo.title} tiene dependencias de otros módulos?`,
        answer: baseInfo.dependencies.length > 0
          ? `Sí, requiere: ${baseInfo.dependencies.join(', ')}`
          : 'No, funciona de forma independiente.'
      }
    ];

    // Agregar FAQs específicas del módulo si existen
    if (moduleInfo.help?.commonIssues) {
      moduleInfo.help.commonIssues.forEach(issue => {
        faqs.push({
          question: issue.problem || issue.question,
          answer: issue.solution || issue.answer,
          category: 'troubleshooting'
        });
      });
    }

    return {
      ...baseInfo,
      format: 'faq',
      totalQuestions: faqs.length,
      faqs
    };
  }

  /**
   * Referencia rápida
   */
  _buildQuickReference(baseInfo, moduleInfo, audience) {
    const features = this._extractFeatures(moduleInfo);

    return {
      ...baseInfo,
      format: 'quick_reference',
      shortcuts: this._getKeyboardShortcuts(moduleInfo),
      quickActions: features.slice(0, 5).map(f => ({
        action: f.name,
        howTo: f.description?.substring(0, 100) || 'Ver documentación'
      })),
      commonTasks: [
        {
          task: 'Acceder al módulo',
          steps: ['Iniciar sesión', `Ir a ${moduleInfo.category || 'Módulos'}`, `Seleccionar ${baseInfo.title}`]
        }
      ],
      contactInfo: {
        support: 'soporte@aponnt.com',
        documentation: `/docs/${moduleInfo.key || 'general'}`
      }
    };
  }

  // =========================================================================
  // 2. SISTEMA DE CAPACITACIÓN CON AUTOEVALUACIÓN
  // =========================================================================

  /**
   * Obtiene el plan de capacitación para un usuario
   */
  async getTrainingPlan(userId, userRole = 'user') {
    console.log(`📚 [TRAINING-KB] Obteniendo plan de capacitación para usuario ${userId}`);

    // Obtener módulos activos de la empresa del usuario
    const activeModules = await this._getActiveModulesForUser(userId);

    // Obtener progreso actual
    const progress = await this._getTrainingProgress(userId);

    // Construir plan
    const plan = {
      userId,
      userRole,
      totalModules: activeModules.length,
      completedModules: 0,
      pendingModules: 0,
      overallProgress: 0,
      modules: []
    };

    for (const module of activeModules) {
      const moduleProgress = progress.find(p => p.moduleKey === module.key) || null;

      const moduleTraining = {
        key: module.key,
        name: module.name,
        category: module.category,
        mandatory: this._isTrainingMandatory(module, userRole),
        status: moduleProgress?.status || 'not_started',
        completedSteps: moduleProgress?.completedSteps || 0,
        totalSteps: moduleProgress?.totalSteps || 5,
        quizScore: moduleProgress?.quizScore || null,
        quizPassed: moduleProgress?.quizPassed || false,
        lastAccessed: moduleProgress?.lastAccessed || null,
        certificate: moduleProgress?.certificateId || null
      };

      if (moduleTraining.status === 'completed') {
        plan.completedModules++;
      } else {
        plan.pendingModules++;
      }

      plan.modules.push(moduleTraining);
    }

    plan.overallProgress = plan.totalModules > 0
      ? Math.round((plan.completedModules / plan.totalModules) * 100)
      : 0;

    return plan;
  }

  /**
   * Genera quiz de autoevaluación para un módulo
   */
  _generateQuiz(moduleInfo, tutorialSteps) {
    const questions = [];

    // Pregunta sobre propósito del módulo
    questions.push({
      id: 1,
      type: 'multiple_choice',
      question: `¿Cuál es el propósito principal de ${moduleInfo.name || moduleInfo.key}?`,
      options: [
        { id: 'a', text: moduleInfo.description?.substring(0, 80) || 'Gestionar operaciones del sistema', correct: true },
        { id: 'b', text: 'Configurar aspectos técnicos del servidor', correct: false },
        { id: 'c', text: 'Administrar la base de datos directamente', correct: false },
        { id: 'd', text: 'Ninguna de las anteriores', correct: false }
      ],
      points: 20
    });

    // Pregunta sobre acceso
    questions.push({
      id: 2,
      type: 'true_false',
      question: `Para acceder a ${moduleInfo.name || moduleInfo.key} necesito permisos especiales.`,
      correctAnswer: true, // Generalmente es verdad
      explanation: 'Cada módulo tiene permisos específicos según el rol del usuario.',
      points: 15
    });

    // Pregunta sobre dependencias
    const deps = moduleInfo.dependencies || [];
    questions.push({
      id: 3,
      type: 'multiple_choice',
      question: `¿Este módulo depende de otros módulos para funcionar?`,
      options: [
        { id: 'a', text: deps.length > 0 ? `Sí, requiere: ${deps.slice(0,2).join(', ')}` : 'No, funciona independientemente', correct: true },
        { id: 'b', text: deps.length > 0 ? 'No, funciona independientemente' : 'Sí, requiere otros módulos', correct: false },
        { id: 'c', text: 'Depende de la configuración', correct: false },
        { id: 'd', text: 'No estoy seguro', correct: false }
      ],
      points: 15
    });

    // Preguntas basadas en pasos del tutorial
    if (tutorialSteps && tutorialSteps.length > 2) {
      const featureStep = tutorialSteps.find(s => s.type === 'feature');
      if (featureStep) {
        questions.push({
          id: 4,
          type: 'multiple_choice',
          question: `¿Qué función permite "${featureStep.title}"?`,
          options: [
            { id: 'a', text: featureStep.content?.substring(0, 60) || 'Gestionar esta funcionalidad', correct: true },
            { id: 'b', text: 'Eliminar todos los datos', correct: false },
            { id: 'c', text: 'Configurar el servidor', correct: false },
            { id: 'd', text: 'Cerrar la sesión', correct: false }
          ],
          points: 25
        });
      }
    }

    // Pregunta final de comprensión
    questions.push({
      id: 5,
      type: 'multiple_choice',
      question: '¿Qué debe hacer si encuentra un problema usando este módulo?',
      options: [
        { id: 'a', text: 'Reiniciar el computador', correct: false },
        { id: 'b', text: 'Contactar a soporte técnico a través del sistema de tickets', correct: true },
        { id: 'c', text: 'Ignorar el problema', correct: false },
        { id: 'd', text: 'Desinstalar el módulo', correct: false }
      ],
      points: 25
    });

    return {
      totalQuestions: questions.length,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      passingScore: this.config.autoEvaluationPassScore,
      timeLimit: 10, // minutos
      questions
    };
  }

  /**
   * Evalúa respuestas del quiz
   */
  async evaluateQuiz(userId, moduleKey, answers) {
    console.log(`📝 [TRAINING-KB] Evaluando quiz de ${moduleKey} para usuario ${userId}`);

    // Obtener tutorial con quiz
    const tutorialResult = await this.generateModuleTutorial(moduleKey, { format: 'step_by_step' });
    if (!tutorialResult.success) {
      return { success: false, error: 'No se pudo cargar el quiz' };
    }

    const quiz = tutorialResult.tutorial.quiz;
    let totalScore = 0;
    let correctAnswers = 0;
    const results = [];

    for (const question of quiz.questions) {
      const userAnswer = answers.find(a => a.questionId === question.id);
      let isCorrect = false;

      if (question.type === 'multiple_choice') {
        const correctOption = question.options.find(o => o.correct);
        isCorrect = userAnswer?.answer === correctOption?.id;
      } else if (question.type === 'true_false') {
        isCorrect = userAnswer?.answer === question.correctAnswer;
      }

      if (isCorrect) {
        totalScore += question.points;
        correctAnswers++;
      }

      results.push({
        questionId: question.id,
        userAnswer: userAnswer?.answer,
        isCorrect,
        points: isCorrect ? question.points : 0,
        explanation: question.explanation || null
      });
    }

    const scorePercentage = Math.round((totalScore / quiz.totalPoints) * 100);
    const passed = scorePercentage >= quiz.passingScore;

    // Guardar resultado
    await this._saveQuizResult(userId, moduleKey, {
      score: scorePercentage,
      passed,
      correctAnswers,
      totalQuestions: quiz.totalQuestions,
      completedAt: new Date()
    });

    return {
      success: true,
      score: scorePercentage,
      passed,
      passingScore: quiz.passingScore,
      correctAnswers,
      totalQuestions: quiz.totalQuestions,
      results,
      message: passed
        ? '¡Felicitaciones! Ha aprobado la evaluación.'
        : `Necesita ${quiz.passingScore}% para aprobar. Intente nuevamente.`,
      certificate: passed ? await this._generateCertificate(userId, moduleKey, scorePercentage) : null
    };
  }

  // =========================================================================
  // 3. TUTORIALES PERSONALIZADOS PARA TICKETS
  // =========================================================================

  /**
   * Genera tutorial personalizado basado en un ticket de soporte
   */
  async generateTicketTutorial(ticketId, ticketData) {
    console.log(`🎫 [TRAINING-KB] Generando tutorial para ticket ${ticketId}`);

    const { subject, description, category, moduleKey, userLevel = 'basic' } = ticketData;

    // Detectar módulo relacionado si no se especificó
    const detectedModule = moduleKey || await this._detectModuleFromText(subject + ' ' + description);

    // Obtener info del módulo
    let moduleInfo = null;
    if (detectedModule && this.brainService) {
      try {
        moduleInfo = await this.brainService.getModuleWithLiveData?.(detectedModule);
      } catch (e) {
        moduleInfo = await this._getModuleFromRegistry(detectedModule);
      }
    }

    // Generar respuesta contextual
    const tutorial = {
      ticketId,
      generatedFor: subject,
      detectedModule: detectedModule || 'general',
      userLevel,
      sections: []
    };

    // Sección 1: Entendimiento del problema
    tutorial.sections.push({
      title: 'Entendemos su consulta',
      content: `Hemos identificado que su consulta está relacionada con ${moduleInfo?.name || 'el sistema'}. A continuación le proporcionamos información que puede ayudarle.`,
      type: 'intro'
    });

    // Sección 2: Solución paso a paso
    const steps = await this._generateSolutionSteps(ticketData, moduleInfo);
    tutorial.sections.push({
      title: 'Pasos para resolver',
      content: steps,
      type: 'steps'
    });

    // Sección 3: Recursos adicionales
    if (moduleInfo) {
      tutorial.sections.push({
        title: 'Recursos adicionales',
        content: {
          tutorialLink: `/training/${detectedModule}`,
          faqLink: `/faq/${detectedModule}`,
          videoLink: moduleInfo.help?.videoUrl || null
        },
        type: 'resources'
      });
    }

    // Sección 4: Contacto
    tutorial.sections.push({
      title: '¿Necesita más ayuda?',
      content: 'Si estos pasos no resolvieron su consulta, nuestro equipo de soporte está aquí para ayudarle. Responda a este ticket con más detalles.',
      type: 'contact'
    });

    return {
      success: true,
      tutorial,
      canAutoResolve: steps.confidence > 0.8,
      suggestedPriority: this._calculateTicketPriority(ticketData, moduleInfo)
    };
  }

  /**
   * Genera pasos de solución basados en el ticket
   */
  async _generateSolutionSteps(ticketData, moduleInfo) {
    const { description, category } = ticketData;
    const steps = [];
    let confidence = 0.5;

    // Detectar tipo de problema
    const problemTypes = this._detectProblemType(description);

    if (problemTypes.includes('access') || problemTypes.includes('login')) {
      steps.push({
        step: 1,
        action: 'Verifique que está usando las credenciales correctas',
        detail: 'Asegúrese de escribir su usuario y contraseña exactamente como se le proporcionaron.'
      });
      steps.push({
        step: 2,
        action: 'Intente restablecer su contraseña',
        detail: 'Use la opción "Olvidé mi contraseña" en la pantalla de inicio de sesión.'
      });
      confidence = 0.85;
    }

    if (problemTypes.includes('error') || problemTypes.includes('no funciona')) {
      steps.push({
        step: 1,
        action: 'Actualice la página',
        detail: 'Presione Ctrl+F5 para recargar la página completamente.'
      });
      steps.push({
        step: 2,
        action: 'Limpie la caché del navegador',
        detail: 'Vaya a Configuración > Privacidad > Limpiar datos de navegación.'
      });
      steps.push({
        step: 3,
        action: 'Intente con otro navegador',
        detail: 'Recomendamos Chrome, Firefox o Edge actualizados.'
      });
      confidence = 0.7;
    }

    if (problemTypes.includes('lento') || problemTypes.includes('demora')) {
      steps.push({
        step: 1,
        action: 'Verifique su conexión a internet',
        detail: 'Realice un test de velocidad en speedtest.net'
      });
      steps.push({
        step: 2,
        action: 'Cierre otras pestañas y aplicaciones',
        detail: 'Libere recursos de su computador.'
      });
      confidence = 0.75;
    }

    // Si hay info del módulo, agregar pasos específicos
    if (moduleInfo?.help?.commonIssues) {
      const relevantIssue = moduleInfo.help.commonIssues.find(issue =>
        description.toLowerCase().includes(issue.keywords?.join(' ').toLowerCase() || '')
      );
      if (relevantIssue) {
        steps.push({
          step: steps.length + 1,
          action: relevantIssue.solution?.title || 'Solución específica',
          detail: relevantIssue.solution?.steps?.join('. ') || relevantIssue.solution
        });
        confidence = 0.9;
      }
    }

    // Si no detectamos nada específico
    if (steps.length === 0) {
      steps.push({
        step: 1,
        action: 'Describa el problema con más detalle',
        detail: 'Por favor, indique qué acción estaba realizando cuando ocurrió el problema.'
      });
      steps.push({
        step: 2,
        action: 'Incluya capturas de pantalla si es posible',
        detail: 'Las imágenes nos ayudan a entender mejor la situación.'
      });
      confidence = 0.3;
    }

    return { steps, confidence };
  }

  // =========================================================================
  // 4. NOTIFICACIONES DE NOVEDADES
  // =========================================================================

  /**
   * Notifica sobre nuevos módulos o actualizaciones
   */
  async notifyNewFeatures(notificationData) {
    const {
      type, // 'new_module', 'update', 'important'
      moduleKey,
      title,
      description,
      affectedRoles = ['admin', 'support', 'associate'],
      requiresTraining = true,
      priority = 'normal'
    } = notificationData;

    console.log(`📢 [TRAINING-KB] Notificando: ${type} - ${title}`);

    // Obtener usuarios afectados
    const users = await this._getUsersByRoles(affectedRoles);

    const notification = {
      type,
      moduleKey,
      title,
      description,
      requiresTraining,
      priority,
      createdAt: new Date(),
      readBy: [],
      acknowledgedBy: []
    };

    // Crear registro de la novedad
    const featureUpdateId = await this._saveFeatureUpdate(notification);

    // Crear notificaciones individuales
    const notifications = [];
    for (const user of users) {
      notifications.push({
        userId: user.id,
        type: 'feature_update',
        referenceId: featureUpdateId,
        title: `Nueva funcionalidad: ${title}`,
        message: description,
        priority,
        requiresAction: requiresTraining,
        actionUrl: requiresTraining ? `/training/${moduleKey}` : null,
        createdAt: new Date()
      });
    }

    // Enviar notificaciones (batch)
    await this._sendBatchNotifications(notifications);

    return {
      success: true,
      featureUpdateId,
      notifiedUsers: users.length,
      affectedRoles
    };
  }

  /**
   * Obtiene novedades pendientes de leer para un usuario
   */
  async getPendingUpdates(userId) {
    // Obtener actualizaciones no leídas
    const updates = await this._getUnreadUpdates(userId);

    return {
      total: updates.length,
      requiresTraining: updates.filter(u => u.requiresTraining && !u.trainingCompleted).length,
      updates: updates.map(u => ({
        id: u.id,
        type: u.type,
        title: u.title,
        description: u.description,
        moduleKey: u.moduleKey,
        priority: u.priority,
        requiresTraining: u.requiresTraining,
        trainingCompleted: u.trainingCompleted || false,
        createdAt: u.createdAt
      }))
    };
  }

  // =========================================================================
  // 5. DASHBOARD DE SOPORTE CON BRAIN ANALYTICS
  // =========================================================================

  /**
   * Obtiene métricas del Brain para mostrar en soporte
   */
  async getSupportDashboardData(userRole = 'support') {
    console.log(`📊 [TRAINING-KB] Obteniendo datos de dashboard para: ${userRole}`);

    const dashboard = {
      systemHealth: null,
      moduleStats: null,
      trainingStats: null,
      recentUpdates: [],
      brainConnected: !!this.brainService
    };

    // Health del sistema desde Brain Analyzer
    if (this.brainAnalyzer) {
      try {
        const health = await this.brainAnalyzer.getHealthDashboard?.();
        dashboard.systemHealth = {
          overallScore: health?.overallScore || null,
          status: health?.status || 'unknown',
          lastCheck: new Date().toISOString()
        };
      } catch (e) {
        console.log(`   ⚠️ Brain Analyzer no disponible: ${e.message}`);
      }
    }

    // Stats de módulos
    if (this.brainService) {
      try {
        const backendFiles = await this.brainService.scanBackendFiles();
        const frontendFiles = await this.brainService.scanFrontendFiles();

        dashboard.moduleStats = {
          totalRoutes: backendFiles?.categories?.routes?.files?.length || 0,
          totalServices: backendFiles?.categories?.services?.files?.length || 0,
          totalModels: backendFiles?.categories?.models?.files?.length || 0,
          totalFrontendModules: frontendFiles?.categories?.modules?.files?.length || 0,
          lastScanned: new Date().toISOString()
        };
      } catch (e) {
        console.log(`   ⚠️ Error escaneando: ${e.message}`);
      }
    }

    // Stats de capacitación (simulado por ahora)
    dashboard.trainingStats = {
      totalTrainings: 0,
      completedToday: 0,
      pendingEvaluations: 0,
      averageScore: 0
    };

    // Actualizaciones recientes
    dashboard.recentUpdates = await this._getRecentUpdates(5);

    return dashboard;
  }

  // =========================================================================
  // HELPERS PRIVADOS
  // =========================================================================

  async _getModuleFromRegistry(moduleKey) {
    try {
      // Primero intentar obtener del Brain
      if (this.brainService) {
        const techModules = await this.brainService.getTechnicalModules?.();
        if (techModules?.modules) {
          // Buscar por key exacto o parcial
          const found = techModules.modules.find(m =>
            m.key === moduleKey ||
            m.key?.toLowerCase() === moduleKey.toLowerCase()
          );
          if (found) {
            return {
              key: found.key,
              name: found.name,
              description: found.description,
              category: found.category || 'general',
              endpoints: found.endpoints || [],
              features: found.features || {},
              version: '1.0.0'
            };
          }
        }
      }

      // Fallback al registry antiguo
      const registryPath = require('path').join(__dirname, '../auditor/registry/modules-registry.json');
      const registry = require(registryPath);

      // Buscar en el registry por key o por nombre
      if (Array.isArray(registry.modules)) {
        const found = registry.modules.find(m =>
          m.key === moduleKey ||
          m.name?.toLowerCase().replace(/\s+/g, '') === moduleKey.toLowerCase()
        );
        if (found) return found;
      } else if (registry.modules) {
        // Si es objeto, buscar por key
        return registry.modules[moduleKey] || null;
      }

      return null;
    } catch (e) {
      console.log(`   [TRAINING-KB] Error en registry: ${e.message}`);
      return null;
    }
  }

  _getPrerequisites(moduleInfo, audience) {
    const prereqs = [];
    if (moduleInfo.dependencies?.required) {
      prereqs.push(...moduleInfo.dependencies.required);
    }
    if (audience === 'admin') {
      prereqs.push('Permisos de administrador');
    }
    return prereqs;
  }

  _getAccessInstructions(moduleInfo, audience) {
    const category = moduleInfo.category || 'Módulos';
    return `Desde el panel principal, navegue a "${category}" y seleccione "${moduleInfo.name || moduleInfo.key}". ` +
           `Asegúrese de tener los permisos necesarios para acceder a esta funcionalidad.`;
  }

  _getPermissionInfo(moduleInfo, audience) {
    if (audience === 'admin') {
      return 'Como administrador, tiene acceso completo a todas las funciones.';
    }
    return 'El acceso a este módulo depende de los permisos asignados por su administrador.';
  }

  _extractFeatures(moduleInfo) {
    const features = [];

    if (moduleInfo.api?.endpoints) {
      moduleInfo.api.endpoints.forEach(ep => {
        features.push({
          name: ep.description || ep.path,
          description: `Permite ${ep.method} ${ep.path}`,
          actions: [ep.method]
        });
      });
    }

    if (moduleInfo.business_flows) {
      moduleInfo.business_flows.forEach(flow => {
        features.push({
          name: flow.name || flow,
          description: flow.description || `Flujo de ${flow}`,
          actions: flow.steps || []
        });
      });
    }

    // Si no hay features detectadas, agregar genéricas
    if (features.length === 0) {
      features.push({
        name: 'Gestión de datos',
        description: 'Permite crear, ver, editar y eliminar registros.',
        actions: ['Crear', 'Ver', 'Editar', 'Eliminar']
      });
    }

    return features.slice(0, 5); // Máximo 5 features
  }

  _getBestPractices(moduleInfo, audience) {
    const practices = [
      'Guarde sus cambios frecuentemente',
      'Revise los datos antes de confirmar',
      'Use los filtros para encontrar información rápidamente'
    ];

    if (moduleInfo.help?.tips) {
      practices.push(...moduleInfo.help.tips);
    }

    return practices.join('. ') + '.';
  }

  _getKeyboardShortcuts(moduleInfo) {
    return [
      { keys: 'Ctrl + S', action: 'Guardar' },
      { keys: 'Ctrl + F', action: 'Buscar' },
      { keys: 'Esc', action: 'Cerrar modal' },
      { keys: 'Enter', action: 'Confirmar' }
    ];
  }

  _detectProblemType(text) {
    const types = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('acceso') || lowerText.includes('login') || lowerText.includes('contraseña')) {
      types.push('access');
      types.push('login');
    }
    if (lowerText.includes('error') || lowerText.includes('falla') || lowerText.includes('no funciona')) {
      types.push('error');
      types.push('no funciona');
    }
    if (lowerText.includes('lento') || lowerText.includes('demora') || lowerText.includes('tarda')) {
      types.push('lento');
      types.push('demora');
    }

    return types;
  }

  async _detectModuleFromText(text) {
    const lowerText = text.toLowerCase();

    // Mapeo simple de keywords a módulos
    const moduleKeywords = {
      'usuario': 'users',
      'empleado': 'users',
      'asistencia': 'attendance',
      'biométrico': 'biometric-enterprise',
      'facial': 'facial-biometric',
      'vacaciones': 'vacation-management',
      'licencia': 'licensing-management',
      'médico': 'medical',
      'documento': 'document-management',
      'factura': 'facturacion',
      'cliente': 'clientes',
      'notificación': 'notifications-enterprise',
      'turno': 'shifts',
      'departamento': 'departments'
    };

    for (const [keyword, moduleKey] of Object.entries(moduleKeywords)) {
      if (lowerText.includes(keyword)) {
        return moduleKey;
      }
    }

    return null;
  }

  _calculateTicketPriority(ticketData, moduleInfo) {
    let priority = 'normal';

    const urgentWords = ['urgente', 'crítico', 'bloqueado', 'producción', 'no puedo trabajar'];
    if (urgentWords.some(w => ticketData.description?.toLowerCase().includes(w))) {
      priority = 'high';
    }

    if (moduleInfo?.commercial?.is_core) {
      priority = 'high';
    }

    return priority;
  }

  _isTrainingMandatory(module, userRole) {
    // Core modules son mandatorios para todos
    if (module.commercial?.is_core) return true;

    // Para admins, todos son mandatorios
    if (userRole === 'admin') return true;

    // Para soporte, módulos de atención son mandatorios
    if (userRole === 'support' && ['support', 'notifications', 'inbox'].includes(module.category)) {
      return true;
    }

    return false;
  }

  // Métodos de base de datos (stubs - requieren implementación con modelo real)
  async _getActiveModulesForUser(userId) {
    // TODO: Implementar consulta real a la BD
    return [];
  }

  async _getTrainingProgress(userId) {
    // TODO: Implementar consulta real a la BD
    return [];
  }

  async _saveQuizResult(userId, moduleKey, result) {
    // TODO: Implementar guardado en BD
    console.log(`   💾 Quiz guardado: ${moduleKey} - Score: ${result.score}%`);
    return true;
  }

  async _generateCertificate(userId, moduleKey, score) {
    // TODO: Implementar generación de certificado
    return {
      id: `CERT-${Date.now()}`,
      userId,
      moduleKey,
      score,
      issuedAt: new Date().toISOString()
    };
  }

  async _getUsersByRoles(roles) {
    // TODO: Implementar consulta real
    return [];
  }

  async _saveFeatureUpdate(notification) {
    // TODO: Implementar guardado en BD
    return `UPDATE-${Date.now()}`;
  }

  async _sendBatchNotifications(notifications) {
    // TODO: Implementar envío real
    console.log(`   📤 Enviando ${notifications.length} notificaciones`);
    return true;
  }

  async _getUnreadUpdates(userId) {
    // TODO: Implementar consulta real
    return [];
  }

  async _getRecentUpdates(limit = 5) {
    // TODO: Implementar consulta real
    return [];
  }
}

module.exports = TrainingKnowledgeService;
