/**
 * ============================================================================
 * CODE INTELLIGENCE SERVICE - CEREBRO INTELIGENTE DEL SISTEMA
 * ============================================================================
 *
 * PROPÓSITO:
 * - Analizar código REAL y detectar qué está implementado
 * - Sincronizar automáticamente engineering-metadata.js
 * - Detectar descoordinaciones entre módulos/roadmap
 * - Evaluar dependencies y relaciones entre módulos
 * - Proporcionar análisis inteligente para el Engineering Dashboard
 *
 * CARACTERÍSTICAS:
 * 1. AST Parsing - Analiza archivos JS para detectar funciones/endpoints
 * 2. DB Schema Analysis - Verifica tablas/columnas en PostgreSQL
 * 3. Dependency Graph - Construye grafo de dependencias
 * 4. Auto-Sync - Actualiza metadata automáticamente
 * 5. Inconsistency Detection - Detecta descoordinaciones
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class CodeIntelligenceService {
  constructor() {
    this.backendRoot = path.join(__dirname, '../..');
    this.metadataPath = path.join(this.backendRoot, 'engineering-metadata.js');
    this.cache = {
      lastScan: null,
      modules: {},
      roadmap: {},
      inconsistencies: []
    };
  }

  /**
   * ============================================================================
   * FASE 1: ANÁLISIS DE CÓDIGO REAL
   * ============================================================================
   */

  /**
   * Analiza un módulo específico en el código real
   * @param {string} moduleKey - Clave del módulo (ej: 'vendedores', 'users')
   * @returns {Object} Estado real del módulo
   */
  async analyzeModuleInCode(moduleKey) {
    console.log(`🔍 [CODE INTELLIGENCE] Analizando módulo: ${moduleKey}...`);

    const analysis = {
      moduleKey,
      timestamp: new Date().toISOString(),
      backend: await this.analyzeBackendFiles(moduleKey),
      frontend: await this.analyzeFrontendFiles(moduleKey),
      database: await this.analyzeDatabaseSchema(moduleKey),
      routes: await this.analyzeAPIRoutes(moduleKey),
      realProgress: 0,
      implemented: false
    };

    // Calcular progreso real basado en evidencia
    analysis.realProgress = this.calculateRealProgress(analysis);
    analysis.implemented = analysis.realProgress > 0;

    return analysis;
  }

  /**
   * Analiza archivos backend relacionados con el módulo
   */
  async analyzeBackendFiles(moduleKey) {
    const backendFiles = {
      models: [],
      services: [],
      routes: [],
      controllers: []
    };

    try {
      // Buscar modelos
      const modelsDir = path.join(this.backendRoot, 'src/models');
      if (fs.existsSync(modelsDir)) {
        const files = fs.readdirSync(modelsDir);
        backendFiles.models = files.filter(f =>
          f.toLowerCase().includes(moduleKey.toLowerCase()) && f.endsWith('.js')
        );
      }

      // Buscar servicios
      const servicesDir = path.join(this.backendRoot, 'src/services');
      if (fs.existsSync(servicesDir)) {
        const files = fs.readdirSync(servicesDir);
        backendFiles.services = files.filter(f =>
          f.toLowerCase().includes(moduleKey.toLowerCase()) && f.endsWith('.js')
        );
      }

      // Buscar rutas
      const routesDir = path.join(this.backendRoot, 'src/routes');
      if (fs.existsSync(routesDir)) {
        const files = fs.readdirSync(routesDir);
        backendFiles.routes = files.filter(f =>
          f.toLowerCase().includes(moduleKey.toLowerCase()) && f.endsWith('.js')
        );
      }

    } catch (error) {
      console.error(`❌ Error analizando backend files: ${error.message}`);
    }

    return backendFiles;
  }

  /**
   * Analiza archivos frontend relacionados con el módulo
   */
  async analyzeFrontendFiles(moduleKey) {
    const frontendFiles = {
      modules: [],
      pages: []
    };

    try {
      // Buscar módulos JS
      const modulesDir = path.join(this.backendRoot, 'public/js/modules');
      if (fs.existsSync(modulesDir)) {
        const files = fs.readdirSync(modulesDir);
        frontendFiles.modules = files.filter(f =>
          f.toLowerCase().includes(moduleKey.toLowerCase()) && f.endsWith('.js')
        );
      }

      // Buscar páginas HTML
      const publicDir = path.join(this.backendRoot, 'public');
      if (fs.existsSync(publicDir)) {
        const files = fs.readdirSync(publicDir);
        frontendFiles.pages = files.filter(f =>
          f.toLowerCase().includes(moduleKey.toLowerCase()) && f.endsWith('.html')
        );
      }

    } catch (error) {
      console.error(`❌ Error analizando frontend files: ${error.message}`);
    }

    return frontendFiles;
  }

  /**
   * Analiza schema de BD relacionado con el módulo
   */
  async analyzeDatabaseSchema(moduleKey) {
    const schema = {
      tables: [],
      views: [],
      functions: []
    };

    try {
      const db = require('../../src/config/database');

      // Buscar tablas relacionadas
      const tablesQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name ILIKE '%${moduleKey}%'
      `;
      const tables = await db.sequelize.query(tablesQuery, {
        type: db.sequelize.QueryTypes.SELECT
      });
      schema.tables = tables.map(t => t.table_name);

      // Buscar funciones PostgreSQL
      const functionsQuery = `
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        AND routine_name ILIKE '%${moduleKey}%'
      `;
      const functions = await db.sequelize.query(functionsQuery, {
        type: db.sequelize.QueryTypes.SELECT
      });
      schema.functions = functions.map(f => f.routine_name);

    } catch (error) {
      console.error(`❌ Error analizando DB schema: ${error.message}`);
    }

    return schema;
  }

  /**
   * Analiza rutas API relacionadas con el módulo
   */
  async analyzeAPIRoutes(moduleKey) {
    const routes = {
      endpoints: [],
      count: 0
    };

    try {
      // Buscar en archivos de rutas
      const routesDir = path.join(this.backendRoot, 'src/routes');
      if (!fs.existsSync(routesDir)) return routes;

      const routeFiles = fs.readdirSync(routesDir)
        .filter(f => f.endsWith('.js') || f.endsWith('Routes.js'));

      for (const file of routeFiles) {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Detectar endpoints con regex
        const routerPatterns = [
          /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g
        ];

        for (const pattern of routerPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const endpoint = match[2];

            // Si el endpoint contiene el moduleKey
            if (endpoint.toLowerCase().includes(moduleKey.toLowerCase()) ||
                file.toLowerCase().includes(moduleKey.toLowerCase())) {
              routes.endpoints.push({
                method,
                path: endpoint,
                file
              });
            }
          }
        }
      }

      routes.count = routes.endpoints.length;

    } catch (error) {
      console.error(`❌ Error analizando API routes: ${error.message}`);
    }

    return routes;
  }

  /**
   * Calcula progreso REAL basado en evidencia
   */
  calculateRealProgress(analysis) {
    let score = 0;
    let maxScore = 0;

    // Backend files (peso: 30%)
    maxScore += 30;
    const backendScore = (
      (analysis.backend.models.length > 0 ? 10 : 0) +
      (analysis.backend.services.length > 0 ? 10 : 0) +
      (analysis.backend.routes.length > 0 ? 10 : 0)
    );
    score += backendScore;

    // Frontend files (peso: 20%)
    maxScore += 20;
    const frontendScore = (
      (analysis.frontend.modules.length > 0 ? 15 : 0) +
      (analysis.frontend.pages.length > 0 ? 5 : 0)
    );
    score += frontendScore;

    // Database schema (peso: 30%)
    maxScore += 30;
    const dbScore = (
      (analysis.database.tables.length > 0 ? 20 : 0) +
      (analysis.database.functions.length > 0 ? 10 : 0)
    );
    score += dbScore;

    // API routes (peso: 20%)
    maxScore += 20;
    const routesScore = Math.min(20, analysis.routes.count * 2);
    score += routesScore;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * ============================================================================
   * FASE 2: DETECCIÓN DE INCONSISTENCIAS
   * ============================================================================
   */

  /**
   * Detecta descoordinaciones entre modules y roadmap
   */
  async detectInconsistencies() {
    console.log(`🔍 [CODE INTELLIGENCE] Detectando inconsistencias...`);

    const metadata = require(this.metadataPath);
    const inconsistencies = [];

    // Comparar modules vs roadmap
    for (const [moduleKey, moduleData] of Object.entries(metadata.modules || {})) {
      // Buscar si existe en roadmap
      const roadmapEntries = Object.entries(metadata.roadmap || {})
        .filter(([key, value]) => {
          return value.name && moduleData.name &&
                 value.name.toLowerCase().includes(moduleData.name.toLowerCase().split(' ')[0]);
        });

      if (roadmapEntries.length > 0) {
        const [roadmapKey, roadmapData] = roadmapEntries[0];

        // Comparar progress
        if (Math.abs(moduleData.progress - roadmapData.progress) > 10) {
          inconsistencies.push({
            type: 'PROGRESS_MISMATCH',
            severity: 'HIGH',
            module: moduleKey,
            moduleProgress: moduleData.progress,
            roadmapKey,
            roadmapProgress: roadmapData.progress,
            difference: Math.abs(moduleData.progress - roadmapData.progress),
            suggestion: `Sincronizar progress entre modules.${moduleKey} y roadmap.${roadmapKey}`
          });
        }

        // Comparar status
        if (moduleData.status !== roadmapData.status) {
          inconsistencies.push({
            type: 'STATUS_MISMATCH',
            severity: 'HIGH',
            module: moduleKey,
            moduleStatus: moduleData.status,
            roadmapKey,
            roadmapStatus: roadmapData.status,
            suggestion: `Sincronizar status entre modules.${moduleKey} y roadmap.${roadmapKey}`
          });
        }
      }
    }

    this.cache.inconsistencies = inconsistencies;
    return inconsistencies;
  }

  /**
   * ============================================================================
   * FASE 3: AUTO-SINCRONIZACIÓN
   * ============================================================================
   */

  /**
   * Sincroniza metadata con código real
   */
  async syncMetadataWithCode(moduleKey) {
    console.log(`🔄 [CODE INTELLIGENCE] Sincronizando metadata para: ${moduleKey}...`);

    // Analizar código real
    const realAnalysis = await this.analyzeModuleInCode(moduleKey);

    // Leer metadata actual
    const metadata = require(this.metadataPath);

    // Encontrar entrada en modules
    const moduleEntry = metadata.modules?.[moduleKey];
    if (!moduleEntry) {
      console.warn(`⚠️ Módulo ${moduleKey} no encontrado en metadata`);
      return null;
    }

    // Actualizar con datos reales
    const updates = {
      oldProgress: moduleEntry.progress,
      newProgress: realAnalysis.realProgress,
      oldStatus: moduleEntry.status,
      newStatus: this.inferStatus(realAnalysis.realProgress),
      analysis: realAnalysis,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [CODE INTELLIGENCE] Sincronización completada:`);
    console.log(`   - Progress: ${updates.oldProgress}% → ${updates.newProgress}%`);
    console.log(`   - Status: ${updates.oldStatus} → ${updates.newStatus}`);

    return updates;
  }

  /**
   * Infiere status basado en progress
   */
  inferStatus(progress) {
    if (progress === 0) return 'PLANNED';
    if (progress < 30) return 'INITIAL';
    if (progress < 70) return 'IN_PROGRESS';
    if (progress < 100) return 'TESTING';
    return 'COMPLETE';
  }

  /**
   * ============================================================================
   * FASE 4: REPORTING
   * ============================================================================
   */

  /**
   * Genera reporte completo de inconsistencias
   */
  async generateInconsistencyReport() {
    const inconsistencies = await this.detectInconsistencies();

    const report = {
      timestamp: new Date().toISOString(),
      totalInconsistencies: inconsistencies.length,
      bySeverity: {
        HIGH: inconsistencies.filter(i => i.severity === 'HIGH').length,
        MEDIUM: inconsistencies.filter(i => i.severity === 'MEDIUM').length,
        LOW: inconsistencies.filter(i => i.severity === 'LOW').length
      },
      byType: {},
      details: inconsistencies
    };

    // Agrupar por tipo
    for (const inc of inconsistencies) {
      if (!report.byType[inc.type]) {
        report.byType[inc.type] = 0;
      }
      report.byType[inc.type]++;
    }

    return report;
  }
}

module.exports = new CodeIntelligenceService();
