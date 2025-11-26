/**
 * ============================================================================
 * PRE-TASK ANALYZER - ANÁLISIS INTELIGENTE ANTES DE EMPEZAR
 * ============================================================================
 *
 * PROPÓSITO:
 * Cuando Claude o humano recibe una nueva tarea, ANTES de empezar:
 * 1. Analizar si ya existe (total o parcial) en código
 * 2. Buscar en roadmap/modules si está registrada
 * 3. Evaluar dependencies
 * 4. Determinar desde dónde continuar
 * 5. Generar plan de ejecución inteligente
 *
 * FLUJO:
 * Nueva tarea → PreTaskAnalyzer → Plan → Ejecución
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

class PreTaskAnalyzer {
  constructor() {
    this.backendRoot = path.join(__dirname, '../..');
    this.metadataPath = path.join(this.backendRoot, 'engineering-metadata.js');
  }

  /**
   * ============================================================================
   * ANÁLISIS PRINCIPAL
   * ============================================================================
   */

  /**
   * Analiza una tarea ANTES de empezar
   * @param {Object} task - Descripción de la tarea
   * @param {string} task.description - Descripción en lenguaje natural
   * @param {string} task.moduleKey - Módulo relacionado (opcional)
   * @returns {Object} Plan de ejecución
   */
  async analyzeTask(task) {
    console.log(`\n🔍 [PRE-TASK ANALYZER] Analizando tarea antes de empezar...`);
    console.log(`   Descripción: "${task.description}"`);

    const analysis = {
      task: task.description,
      timestamp: new Date().toISOString(),
      existsInCode: false,
      existsInRoadmap: false,
      existsInModules: false,
      completionStatus: {
        estimated: 0,        // % estimado de completitud
        confidence: 0        // Confianza en la estimación
      },
      relatedEntries: [],    // Entradas relacionadas en metadata
      dependencies: [],       // Dependencies detectadas
      affectedModules: [],    // Módulos que se afectarán
      codeEvidence: {},       // Evidencia en código
      recommendation: '',     // Recomendación final
      executionPlan: []       // Plan de pasos a seguir
    };

    // Paso 1: Buscar en roadmap
    await this.searchInRoadmap(task, analysis);

    // Paso 2: Buscar en modules
    await this.searchInModules(task, analysis);

    // Paso 3: Buscar evidencia en código
    await this.searchInCode(task, analysis);

    // Paso 4: Analizar dependencies
    await this.analyzeDependencies(task, analysis);

    // Paso 5: Generar recomendación
    this.generateRecommendation(analysis);

    // Paso 6: Generar plan de ejecución
    this.generateExecutionPlan(analysis);

    // Mostrar resultados
    this.printResults(analysis);

    return analysis;
  }

  /**
   * ============================================================================
   * BÚSQUEDA EN ROADMAP
   * ============================================================================
   */

  async searchInRoadmap(task, analysis) {
    console.log(`\n📊 Buscando en roadmap...`);

    try {
      const metadata = require(this.metadataPath);
      const roadmap = metadata.roadmap || {};

      // Extraer keywords de la tarea
      const keywords = this.extractKeywords(task.description);

      for (const [phaseKey, phaseData] of Object.entries(roadmap)) {
        // Buscar en nombre de phase
        if (this.matchesKeywords(phaseData.name, keywords)) {
          analysis.existsInRoadmap = true;
          analysis.relatedEntries.push({
            type: 'roadmap_phase',
            key: phaseKey,
            name: phaseData.name,
            status: phaseData.status,
            progress: phaseData.progress,
            tasks: phaseData.tasks || []
          });

          console.log(`   ✅ Encontrado en roadmap: ${phaseKey} (${phaseData.progress}%)`);
        }

        // Buscar en tasks de la phase
        if (phaseData.tasks) {
          for (const taskItem of phaseData.tasks) {
            if (this.matchesKeywords(taskItem.name, keywords)) {
              analysis.existsInRoadmap = true;
              analysis.relatedEntries.push({
                type: 'roadmap_task',
                phaseKey,
                taskId: taskItem.id,
                name: taskItem.name,
                done: taskItem.done,
                completedDate: taskItem.completedDate
              });

              console.log(`   ✅ Encontrado task: ${taskItem.id} - ${taskItem.done ? 'DONE' : 'PENDING'}`);
            }
          }
        }
      }

      if (!analysis.existsInRoadmap) {
        console.log(`   ℹ️  No encontrado en roadmap`);
      }

    } catch (error) {
      console.error(`   ❌ Error buscando en roadmap: ${error.message}`);
    }
  }

  /**
   * ============================================================================
   * BÚSQUEDA EN MODULES
   * ============================================================================
   */

  async searchInModules(task, analysis) {
    console.log(`\n📦 Buscando en modules...`);

    try {
      const metadata = require(this.metadataPath);
      const modules = metadata.modules || {};

      const keywords = this.extractKeywords(task.description);

      for (const [moduleKey, moduleData] of Object.entries(modules)) {
        if (this.matchesKeywords(moduleData.name, keywords)) {
          analysis.existsInModules = true;
          analysis.affectedModules.push(moduleKey);
          analysis.relatedEntries.push({
            type: 'module',
            key: moduleKey,
            name: moduleData.name,
            status: moduleData.status,
            progress: moduleData.progress,
            subfeatures: moduleData.subfeatures
          });

          console.log(`   ✅ Encontrado en modules: ${moduleKey} (${moduleData.progress}%)`);
        }
      }

      if (!analysis.existsInModules) {
        console.log(`   ℹ️  No encontrado en modules`);
      }

    } catch (error) {
      console.error(`   ❌ Error buscando en modules: ${error.message}`);
    }
  }

  /**
   * ============================================================================
   * BÚSQUEDA EN CÓDIGO
   * ============================================================================
   */

  async searchInCode(task, analysis) {
    console.log(`\n💻 Buscando evidencia en código...`);

    const keywords = this.extractKeywords(task.description);
    const evidence = {
      backend: { models: [], routes: [], services: [] },
      frontend: { modules: [], components: [] },
      database: { tables: [], functions: [] }
    };

    // Buscar archivos relacionados
    try {
      // Backend models
      const modelsDir = path.join(this.backendRoot, 'src/models');
      if (fs.existsSync(modelsDir)) {
        const files = fs.readdirSync(modelsDir);
        for (const file of files) {
          if (keywords.some(kw => file.toLowerCase().includes(kw.toLowerCase()))) {
            evidence.backend.models.push(file);
            analysis.existsInCode = true;
          }
        }
      }

      // Backend routes
      const routesDir = path.join(this.backendRoot, 'src/routes');
      if (fs.existsSync(routesDir)) {
        const files = fs.readdirSync(routesDir);
        for (const file of files) {
          if (keywords.some(kw => file.toLowerCase().includes(kw.toLowerCase()))) {
            evidence.backend.routes.push(file);
            analysis.existsInCode = true;
          }
        }
      }

      // Frontend modules
      const modulesDir = path.join(this.backendRoot, 'public/js/modules');
      if (fs.existsSync(modulesDir)) {
        const files = fs.readdirSync(modulesDir);
        for (const file of files) {
          if (keywords.some(kw => file.toLowerCase().includes(kw.toLowerCase()))) {
            evidence.frontend.modules.push(file);
            analysis.existsInCode = true;
          }
        }
      }

      analysis.codeEvidence = evidence;

      if (analysis.existsInCode) {
        console.log(`   ✅ Evidencia encontrada en código:`);
        if (evidence.backend.models.length > 0) {
          console.log(`      - Models: ${evidence.backend.models.join(', ')}`);
        }
        if (evidence.backend.routes.length > 0) {
          console.log(`      - Routes: ${evidence.backend.routes.join(', ')}`);
        }
        if (evidence.frontend.modules.length > 0) {
          console.log(`      - Frontend: ${evidence.frontend.modules.join(', ')}`);
        }
      } else {
        console.log(`   ℹ️  No se encontró código relacionado`);
      }

    } catch (error) {
      console.error(`   ❌ Error buscando en código: ${error.message}`);
    }
  }

  /**
   * ============================================================================
   * ANÁLISIS DE DEPENDENCIES
   * ============================================================================
   */

  async analyzeDependencies(task, analysis) {
    console.log(`\n🔗 Analizando dependencies...`);

    try {
      const metadata = require(this.metadataPath);

      // Si encontramos entradas relacionadas, analizar sus dependencies
      for (const entry of analysis.relatedEntries) {
        if (entry.type === 'roadmap_phase') {
          const phase = metadata.roadmap[entry.key];
          if (phase.dependencies) {
            analysis.dependencies.push(...phase.dependencies);
          }
        }
      }

      if (analysis.dependencies.length > 0) {
        console.log(`   ✅ Dependencies encontradas: ${analysis.dependencies.join(', ')}`);
      } else {
        console.log(`   ℹ️  No se encontraron dependencies`);
      }

    } catch (error) {
      console.error(`   ❌ Error analizando dependencies: ${error.message}`);
    }
  }

  /**
   * ============================================================================
   * GENERACIÓN DE RECOMENDACIÓN
   * ============================================================================
   */

  generateRecommendation(analysis) {
    console.log(`\n💡 Generando recomendación...`);

    // Calcular completitud estimada
    let completionScore = 0;
    let confidence = 100;

    // Evidencia en código (40 puntos)
    if (analysis.existsInCode) {
      const codeScore = (
        (analysis.codeEvidence.backend.models.length * 10) +
        (analysis.codeEvidence.backend.routes.length * 10) +
        (analysis.codeEvidence.frontend.modules.length * 10)
      );
      completionScore += Math.min(40, codeScore);
    }

    // Evidencia en roadmap (30 puntos)
    if (analysis.existsInRoadmap) {
      const roadmapEntries = analysis.relatedEntries.filter(e => e.type.startsWith('roadmap'));
      const avgProgress = roadmapEntries.reduce((sum, e) => sum + (e.progress || 0), 0) / roadmapEntries.length;
      completionScore += (avgProgress * 0.3);
    }

    // Evidencia en modules (30 puntos)
    if (analysis.existsInModules) {
      const moduleEntries = analysis.relatedEntries.filter(e => e.type === 'module');
      const avgProgress = moduleEntries.reduce((sum, e) => sum + (e.progress || 0), 0) / moduleEntries.length;
      completionScore += (avgProgress * 0.3);
    }

    analysis.completionStatus = {
      estimated: Math.min(100, Math.round(completionScore)),
      confidence: Math.round(confidence)
    };

    // Generar recomendación textual
    if (completionScore >= 80) {
      analysis.recommendation = "✅ TAREA CASI COMPLETA - Revisar código existente y completar detalles faltantes";
    } else if (completionScore >= 50) {
      analysis.recommendation = "⚠️ TAREA PARCIALMENTE IMPLEMENTADA - Continuar desde el código existente";
    } else if (completionScore >= 20) {
      analysis.recommendation = "🟡 TAREA INICIADA - Existe infraestructura básica, implementar funcionalidades";
    } else {
      analysis.recommendation = "🆕 TAREA NUEVA - Comenzar desde cero con planificación completa";
    }

    console.log(`   ${analysis.recommendation}`);
    console.log(`   Completitud estimada: ${analysis.completionStatus.estimated}%`);
  }

  /**
   * ============================================================================
   * GENERACIÓN DE PLAN DE EJECUCIÓN
   * ============================================================================
   */

  generateExecutionPlan(analysis) {
    console.log(`\n📋 Generando plan de ejecución...`);

    const plan = [];

    // Plan según completitud
    if (analysis.completionStatus.estimated >= 80) {
      plan.push("1. Leer código existente completamente");
      plan.push("2. Identificar qué falta específicamente");
      plan.push("3. Completar funcionalidades faltantes");
      plan.push("4. Testing exhaustivo");
      plan.push("5. Actualizar roadmap (marcar done: true)");
    } else if (analysis.completionStatus.estimated >= 50) {
      plan.push("1. Analizar código existente");
      plan.push("2. Listar funcionalidades implementadas");
      plan.push("3. Implementar funcionalidades faltantes");
      plan.push("4. Integrar con código existente");
      plan.push("5. Testing completo");
      plan.push("6. Actualizar roadmap y modules");
    } else if (analysis.completionStatus.estimated >= 20) {
      plan.push("1. Revisar infraestructura existente");
      plan.push("2. Planificar arquitectura completa");
      plan.push("3. Implementar backend (modelos, rutas, servicios)");
      plan.push("4. Implementar frontend (UI, lógica)");
      plan.push("5. Implementar database (tablas, funciones)");
      plan.push("6. Testing e integración");
      plan.push("7. Actualizar roadmap completo");
    } else {
      plan.push("1. Análisis de requerimientos");
      plan.push("2. Diseño de arquitectura");
      plan.push("3. Crear entrada en roadmap");
      plan.push("4. Implementar backend completo");
      plan.push("5. Implementar frontend completo");
      plan.push("6. Implementar database schema");
      plan.push("7. Testing exhaustivo");
      plan.push("8. Documentación");
      plan.push("9. Actualizar engineering-metadata.js");
    }

    // Agregar nota sobre dependencies
    if (analysis.dependencies.length > 0) {
      plan.unshift(`⚠️ VERIFICAR DEPENDENCIES PRIMERO: ${analysis.dependencies.join(', ')}`);
    }

    analysis.executionPlan = plan;

    plan.forEach((step, i) => {
      console.log(`   ${step}`);
    });
  }

  /**
   * ============================================================================
   * UTILIDADES
   * ============================================================================
   */

  extractKeywords(text) {
    // Palabras a ignorar
    const stopWords = ['de', 'la', 'el', 'en', 'y', 'o', 'un', 'una', 'para', 'con', 'sistema', 'módulo'];

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));

    return [...new Set(words)]; // Unique
  }

  matchesKeywords(text, keywords) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return keywords.some(kw => lowerText.includes(kw));
  }

  printResults(analysis) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 RESUMEN DEL ANÁLISIS PRE-TAREA`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Tarea: "${analysis.task}"`);
    console.log(`Existe en roadmap: ${analysis.existsInRoadmap ? '✅ SÍ' : '❌ NO'}`);
    console.log(`Existe en modules: ${analysis.existsInModules ? '✅ SÍ' : '❌ NO'}`);
    console.log(`Existe en código: ${analysis.existsInCode ? '✅ SÍ' : '❌ NO'}`);
    console.log(`Completitud estimada: ${analysis.completionStatus.estimated}%`);
    console.log(`\n${analysis.recommendation}`);
    console.log(`${'='.repeat(70)}\n`);
  }
}

module.exports = new PreTaskAnalyzer();
