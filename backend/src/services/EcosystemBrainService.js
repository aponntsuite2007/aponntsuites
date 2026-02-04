/**
 * ============================================================================
 * ECOSYSTEM BRAIN SERVICE - Cerebro Vivo del Ecosistema
 * ============================================================================
 *
 * Este servicio proporciona información EN TIEMPO REAL del sistema:
 * - Escaneo de archivos backend/frontend
 * - Estado de módulos desde BD
 * - Roadmap/CPM con auto-detección de completitud
 * - Workflows generados desde código
 * - Dependencias vivas
 *
 * PRINCIPIO: NO hay datos guardados estáticamente. Todo se escanea en vivo.
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class EcosystemBrainService {
  constructor(database) {
    this.db = database;
    this.baseDir = path.resolve(__dirname, '../..');
    this.cacheTimeout = 60000; // 1 minuto
    this.cache = new Map();

    console.log('🧠 [BRAIN] EcosystemBrainService inicializado');
    console.log(`   Base directory: ${this.baseDir}`);
  }

  /**
   * Escanear directorio recursivamente usando fs nativo
   * @param {string} dir - Directorio base
   * @param {string} extension - Extensión de archivos a buscar
   * @param {boolean} recursive - Si buscar recursivamente
   * @returns {string[]} - Array de rutas de archivos
   */
  scanDirectory(dir, extension = '.js', recursive = true) {
    const results = [];

    try {
      if (!fsSync.existsSync(dir)) {
        console.log(`   ⚠️ Directorio no existe: ${dir}`);
        return results;
      }

      const items = fsSync.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fsSync.statSync(fullPath);

        if (stat.isDirectory() && recursive) {
          // Ignorar node_modules y backups
          if (item !== 'node_modules' && !item.includes('backup') && !item.includes('BACKUP')) {
            results.push(...this.scanDirectory(fullPath, extension, recursive));
          }
        } else if (stat.isFile() && item.endsWith(extension)) {
          // Ignorar backups
          if (!item.includes('backup') && !item.includes('BACKUP')) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`   ❌ Error escaneando ${dir}:`, error.message);
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ARCHIVOS BACKEND - ESCANEO EN VIVO
  // ═══════════════════════════════════════════════════════════════════════════

  async scanBackendFiles() {
    const cacheKey = 'backend_files';
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    console.log('🔍 [BRAIN] Escaneando archivos backend EN VIVO...');
    console.log(`   Base directory: ${this.baseDir}`);

    const categories = {
      routes: { dir: 'src/routes', ext: '.js', files: [] },
      services: { dir: 'src/services', ext: '.js', files: [] },
      models: { dir: 'src/models', ext: '.js', files: [] },
      middleware: { dir: 'src/middleware', ext: '.js', files: [] },
      auditor: { dir: 'src/auditor', ext: '.js', files: [] },
      config: { dir: 'src/config', ext: '.js', files: [] },
      migrations: { dir: 'migrations', ext: '.sql', files: [] }
    };

    for (const [category, config] of Object.entries(categories)) {
      try {
        const dirPath = path.join(this.baseDir, config.dir);
        console.log(`   📂 [${category}] Dir: ${dirPath}`);
        const filePaths = this.scanDirectory(dirPath, config.ext, true);
        console.log(`      Found: ${filePaths.length} files`);

        for (const filePath of filePaths) {
          const stats = await fs.stat(filePath);
          const relativePath = path.relative(this.baseDir, filePath);

          const fileInfo = {
            path: relativePath.replace(/\\/g, '/'),
            name: path.basename(filePath),
            size: stats.size,
            lines: await this.countLines(filePath),
            lastModified: stats.mtime,
            category: category
          };

          // Parsear exports/endpoints para routes
          if (category === 'routes') {
            fileInfo.endpoints = await this.extractEndpoints(filePath);
          }

          // Parsear clases para services/models
          if (category === 'services' || category === 'models') {
            fileInfo.exports = await this.extractExports(filePath);
          }

          config.files.push(fileInfo);
        }

        // Ordenar por fecha de modificación (más reciente primero)
        config.files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      } catch (error) {
        console.error(`❌ [BRAIN] Error escaneando ${category}:`, error.message);
      }
    }

    const result = {
      scannedAt: new Date().toISOString(),
      totalFiles: Object.values(categories).reduce((sum, cat) => sum + cat.files.length, 0),
      categories
    };

    this.setCache(cacheKey, result);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ARCHIVOS FRONTEND - ESCANEO EN VIVO
  // ═══════════════════════════════════════════════════════════════════════════

  async scanFrontendFiles() {
    const cacheKey = 'frontend_files';
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    console.log('🔍 [BRAIN] Escaneando archivos frontend EN VIVO...');

    const categories = {
      modules: { dir: 'public/js/modules', ext: '.js', files: [] },
      core: { dir: 'public/js/core', ext: '.js', files: [] },
      services: { dir: 'public/js/services', ext: '.js', files: [] },
      html: { dir: 'public', ext: '.html', files: [], recursive: false },
      css: { dir: 'public/css', ext: '.css', files: [] },
      locales: { dir: 'public/locales', ext: '.json', files: [] }
    };

    for (const [category, config] of Object.entries(categories)) {
      try {
        const dirPath = path.join(this.baseDir, config.dir);
        console.log(`   📂 [${category}] Dir: ${dirPath}`);
        const recursive = config.recursive !== false;
        const filePaths = this.scanDirectory(dirPath, config.ext, recursive);
        console.log(`      Found: ${filePaths.length} files`);

        for (const filePath of filePaths) {
          const stats = await fs.stat(filePath);
          const relativePath = path.relative(this.baseDir, filePath);

          const fileInfo = {
            path: relativePath.replace(/\\/g, '/'),
            name: path.basename(filePath),
            size: stats.size,
            lines: await this.countLines(filePath),
            lastModified: stats.mtime,
            category: category
          };

          // Para módulos JS, extraer el nombre del módulo
          if (category === 'modules') {
            fileInfo.moduleName = path.basename(filePath, '.js');
            fileInfo.exports = await this.extractExports(filePath);
          }

          config.files.push(fileInfo);
        }

        config.files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      } catch (error) {
        console.error(`❌ [BRAIN] Error escaneando frontend ${category}:`, error.message);
      }
    }

    const result = {
      scannedAt: new Date().toISOString(),
      totalFiles: Object.values(categories).reduce((sum, cat) => sum + cat.files.length, 0),
      categories
    };

    this.setCache(cacheKey, result);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÓDULOS COMERCIALES - DIRECTO DESDE BD (VIVO)
  // ═══════════════════════════════════════════════════════════════════════════

  async getCommercialModules() {
    console.log('🔍 [BRAIN] Obteniendo módulos comerciales desde BD...');

    try {
      const { sequelize } = this.db;

      const [modules] = await sequelize.query(`
        SELECT
          sm.id,
          sm.module_key as key,
          sm.name,
          sm.icon,
          sm.category,
          sm.is_core as "isCore",
          sm.base_price as "basePrice",
          sm.description,
          sm.features,
          sm.requirements,
          sm.integrates_with as "integratesWith",
          sm.provides_to as "providesTo",
          sm.bundled_modules as "bundledModules",
          sm.available_in as "availableIn",
          sm.version,
          sm.display_order as "displayOrder",
          sm.is_active as "isActive",
          sm.created_at as "createdAt",
          sm.updated_at as "updatedAt",
          -- Contar empresas que lo tienen contratado
          (SELECT COUNT(*) FROM company_modules cm WHERE cm.system_module_id = sm.id AND cm.is_active = true) as "activeContracts"
        FROM system_modules sm
        WHERE sm.is_active = true
        ORDER BY sm.display_order, sm.name
      `);

      // Agrupar por categoría
      const byCategory = {};
      for (const mod of modules) {
        const cat = mod.category || 'other';
        if (!byCategory[cat]) {
          byCategory[cat] = { name: this.getCategoryName(cat), modules: [] };
        }
        byCategory[cat].modules.push(mod);
      }

      return {
        scannedAt: new Date().toISOString(),
        totalModules: modules.length,
        modules: modules,
        byCategory: byCategory,
        stats: {
          core: modules.filter(m => m.isCore).length,
          premium: modules.filter(m => !m.isCore).length,
          totalActiveContracts: modules.reduce((sum, m) => sum + parseInt(m.activeContracts || 0), 0)
        }
      };
    } catch (error) {
      console.error('❌ [BRAIN] Error obteniendo módulos comerciales:', error.message);
      throw error;
    }
  }

  getCategoryName(key) {
    const names = {
      core: 'Módulos Core',
      rrhh: 'Recursos Humanos',
      operations: 'Operaciones',
      compliance: 'Compliance & Legal',
      analytics: 'Analytics & Reporting',
      communication: 'Comunicación',
      hardware: 'Hardware & Biometría',
      advanced: 'Avanzado'
    };
    return names[key] || key;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INFERENCIA DE STATUS DESDE CÓDIGO - DATOS 100% VIVOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inferir status de un módulo basado en análisis de código
   * @param {Object} moduleInfo - Información del módulo
   * @returns {string} - Status inferido: production, in_progress, development, planned
   */
  inferModuleStatus(moduleInfo) {
    const { hasRoutes, hasService, hasFrontend } = moduleInfo.completeness;
    const endpointCount = moduleInfo.stats.endpointCount || 0;
    const hasCrud = moduleInfo.crudAnalysis?.isComplete || false;

    // PRODUCTION: CRUD completo + Service + Frontend
    if (hasCrud && hasService && hasFrontend && endpointCount >= 4) {
      return 'production';
    }

    // IN_PROGRESS: Tiene CRUD parcial o tiene 2 de 3 componentes
    if ((hasRoutes && hasService) || (hasRoutes && hasFrontend) || endpointCount >= 3) {
      return 'in_progress';
    }

    // DEVELOPMENT: Solo tiene route con algunos endpoints
    if (hasRoutes && endpointCount >= 1) {
      return 'development';
    }

    // PLANNED: Solo existe el archivo pero sin endpoints funcionales
    return 'planned';
  }

  /**
   * Calcular progress de un módulo basado en features detectadas
   * @param {Object} moduleInfo - Información del módulo
   * @returns {number} - Progress 0-100
   */
  calculateModuleProgress(moduleInfo) {
    let score = 0;
    const weights = {
      hasRoutes: 15,          // 15%
      hasService: 15,         // 15%
      hasFrontend: 15,        // 15%
      hasCrudCreate: 10,      // 10%
      hasCrudRead: 10,        // 10%
      hasCrudUpdate: 10,      // 10%
      hasCrudDelete: 10,      // 10%
      hasValidation: 5,       // 5%
      hasErrorHandling: 5,    // 5%
      hasComments: 5          // 5%
    };

    if (moduleInfo.completeness.hasRoutes) score += weights.hasRoutes;
    if (moduleInfo.completeness.hasService) score += weights.hasService;
    if (moduleInfo.completeness.hasFrontend) score += weights.hasFrontend;

    const crud = moduleInfo.crudAnalysis || {};
    if (crud.hasCreate) score += weights.hasCrudCreate;
    if (crud.hasRead) score += weights.hasCrudRead;
    if (crud.hasUpdate) score += weights.hasCrudUpdate;
    if (crud.hasDelete) score += weights.hasCrudDelete;

    const codeQuality = moduleInfo.codeQuality || {};
    if (codeQuality.hasValidation) score += weights.hasValidation;
    if (codeQuality.hasErrorHandling) score += weights.hasErrorHandling;
    if (codeQuality.hasComments) score += weights.hasComments;

    return Math.min(100, Math.round(score));
  }

  /**
   * Analizar CRUD de endpoints
   * @param {Array} endpoints - Lista de endpoints
   * @returns {Object} - Análisis de CRUD
   */
  analyzeCrud(endpoints) {
    const hasCreate = endpoints.some(e => e.method === 'POST' && !e.path.includes('login') && !e.path.includes('auth'));
    const hasRead = endpoints.some(e => e.method === 'GET');
    const hasUpdate = endpoints.some(e => e.method === 'PUT' || e.method === 'PATCH');
    const hasDelete = endpoints.some(e => e.method === 'DELETE');

    return {
      hasCreate,
      hasRead,
      hasUpdate,
      hasDelete,
      isComplete: hasCreate && hasRead && hasUpdate && hasDelete,
      completedOps: [hasCreate, hasRead, hasUpdate, hasDelete].filter(Boolean).length,
      totalOps: 4
    };
  }

  /**
   * Analizar calidad de código
   * @param {string} content - Contenido del archivo
   * @returns {Object} - Métricas de calidad
   */
  analyzeCodeQuality(content) {
    return {
      hasValidation: /validate|validator|joi|yup|zod|required|isValid/i.test(content),
      hasErrorHandling: /try\s*\{|catch\s*\(|\.catch\(|throw\s+new/i.test(content),
      hasComments: /\/\*\*|\/\/\s+\w|@param|@returns/i.test(content),
      hasLogging: /console\.(log|error|warn)|logger\./i.test(content),
      hasAsync: /async\s+|await\s+|\.then\(|Promise/i.test(content)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÓDULOS TÉCNICOS - ESCANEADOS DEL CÓDIGO (NO DESDE JSON MUERTO)
  // ═══════════════════════════════════════════════════════════════════════════

  async getTechnicalModules() {
    console.log('🔍 [BRAIN] Detectando módulos técnicos desde código VIVO...');

    const modules = [];

    // 1. Escanear routes para encontrar módulos
    const routesDir = path.join(this.baseDir, 'src/routes');
    try {
      const routeFiles = await fs.readdir(routesDir);

      for (const file of routeFiles) {
        if (!file.endsWith('.js') || file.includes('backup')) continue;

        const moduleName = file.replace(/Routes?\.js$/i, '').replace(/-/g, '');
        const filePath = path.join(routesDir, file);
        const stats = await fs.stat(filePath);
        const endpoints = await this.extractEndpoints(filePath);
        const lines = await this.countLines(filePath);
        const content = await fs.readFile(filePath, 'utf8');

        // Buscar service correspondiente
        const servicePath = path.join(this.baseDir, 'src/services', `${moduleName}Service.js`);
        let hasService = false;
        let serviceLines = 0;
        try {
          await fs.access(servicePath);
          hasService = true;
          serviceLines = await this.countLines(servicePath);
        } catch {}

        // Buscar frontend correspondiente
        const frontendPath = path.join(this.baseDir, 'public/js/modules', `${moduleName}.js`);
        let hasFrontend = false;
        let frontendLines = 0;
        try {
          await fs.access(frontendPath);
          hasFrontend = true;
          frontendLines = await this.countLines(frontendPath);
        } catch {}

        // Análisis de CRUD
        const crudAnalysis = this.analyzeCrud(endpoints);

        // Análisis de calidad
        const codeQuality = this.analyzeCodeQuality(content);

        // Construir info del módulo
        const moduleInfo = {
          key: moduleName.toLowerCase(),
          name: this.formatModuleName(moduleName),
          source: 'live_scan',
          files: {
            routes: `src/routes/${file}`,
            service: hasService ? `src/services/${moduleName}Service.js` : null,
            frontend: hasFrontend ? `public/js/modules/${moduleName}.js` : null
          },
          stats: {
            routeLines: lines,
            serviceLines: serviceLines,
            frontendLines: frontendLines,
            totalLines: lines + serviceLines + frontendLines,
            endpointCount: endpoints.length,
            lastModified: stats.mtime
          },
          endpoints: endpoints,
          completeness: {
            hasRoutes: true,
            hasService: hasService,
            hasFrontend: hasFrontend,
            score: (1 + (hasService ? 1 : 0) + (hasFrontend ? 1 : 0)) / 3 * 100
          },
          crudAnalysis: crudAnalysis,
          codeQuality: codeQuality
        };

        // ⭐ INFERIR STATUS Y PROGRESS DESDE CÓDIGO - 100% VIVO
        moduleInfo.status = this.inferModuleStatus(moduleInfo);
        moduleInfo.progress = this.calculateModuleProgress(moduleInfo);
        moduleInfo.description = this.generateModuleDescription(moduleInfo);

        modules.push(moduleInfo);
      }
    } catch (error) {
      console.error('❌ [BRAIN] Error escaneando módulos técnicos:', error.message);
    }

    // Ordenar por progress (más completos primero)
    modules.sort((a, b) => b.progress - a.progress);

    // Calcular stats por status
    const statusCounts = {
      production: modules.filter(m => m.status === 'production').length,
      in_progress: modules.filter(m => m.status === 'in_progress').length,
      development: modules.filter(m => m.status === 'development').length,
      planned: modules.filter(m => m.status === 'planned').length
    };

    return {
      scannedAt: new Date().toISOString(),
      totalModules: modules.length,
      modules: modules,
      stats: {
        complete: modules.filter(m => m.completeness.score === 100).length,
        partial: modules.filter(m => m.completeness.score > 33 && m.completeness.score < 100).length,
        minimal: modules.filter(m => m.completeness.score <= 33).length,
        ...statusCounts,
        averageProgress: modules.length > 0
          ? Math.round(modules.reduce((sum, m) => sum + m.progress, 0) / modules.length)
          : 0
      }
    };
  }

  /**
   * Generar descripción automática del módulo basada en su análisis
   */
  generateModuleDescription(moduleInfo) {
    const parts = [];

    if (moduleInfo.crudAnalysis?.isComplete) {
      parts.push('CRUD completo');
    } else if (moduleInfo.crudAnalysis?.completedOps > 0) {
      parts.push(`CRUD parcial (${moduleInfo.crudAnalysis.completedOps}/4)`);
    }

    if (moduleInfo.completeness.hasService) parts.push('con servicio');
    if (moduleInfo.completeness.hasFrontend) parts.push('con UI');
    if (moduleInfo.stats.endpointCount > 0) parts.push(`${moduleInfo.stats.endpointCount} endpoints`);

    return parts.length > 0
      ? `Módulo ${parts.join(', ')}`
      : 'Módulo en desarrollo inicial';
  }

  formatModuleName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROADMAP & CPM - DESDE BD CON AUTO-DETECCIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  async getRoadmap() {
    console.log('🔍 [BRAIN] Obteniendo roadmap desde BD...');

    try {
      const { sequelize } = this.db;

      // Obtener fases
      const [phases] = await sequelize.query(`
        SELECT * FROM ecosystem_phases ORDER BY priority, created_at
      `);

      // Obtener tareas por fase
      for (const phase of phases) {
        const [tasks] = await sequelize.query(`
          SELECT * FROM ecosystem_tasks
          WHERE phase_id = :phaseId
          ORDER BY priority, created_at
        `, { replacements: { phaseId: phase.id } });

        phase.tasks = tasks;
        phase.progress = await this.calculatePhaseProgress(phase.id);
      }

      return {
        scannedAt: new Date().toISOString(),
        phases: phases,
        stats: {
          totalPhases: phases.length,
          completed: phases.filter(p => p.status === 'complete').length,
          inProgress: phases.filter(p => p.status === 'in_progress').length,
          planned: phases.filter(p => p.status === 'planned').length
        }
      };
    } catch (error) {
      // Si las tablas no existen aún, retornar estructura vacía
      console.warn('⚠️ [BRAIN] Tablas de roadmap no existen aún:', error.message);
      return {
        scannedAt: new Date().toISOString(),
        phases: [],
        stats: { totalPhases: 0, completed: 0, inProgress: 0, planned: 0 },
        message: 'Ejecutar migración: 20251209_ecosystem_brain_tables.sql'
      };
    }
  }

  async calculatePhaseProgress(phaseId) {
    try {
      const { sequelize } = this.db;
      const [[result]] = await sequelize.query(`
        SELECT calculate_phase_progress(:phaseId) as progress
      `, { replacements: { phaseId } });
      return result?.progress || 0;
    } catch {
      return 0;
    }
  }

  async getCriticalPath() {
    console.log('🔍 [BRAIN] Calculando camino crítico desde ROADMAP...');

    try {
      // Cargar roadmap del metadata
      let metadata;
      try {
        delete require.cache[require.resolve('../../engineering-metadata')];
        metadata = require('../../engineering-metadata');
      } catch {
        console.warn('⚠️ [BRAIN] No se pudo cargar engineering-metadata');
        return {
          scannedAt: new Date().toISOString(),
          tasks: [],
          criticalTasks: [],
          phases: [],
          stats: { total: 0, critical: 0, blocked: 0, pending: 0 },
          message: 'engineering-metadata.js no disponible'
        };
      }

      const roadmap = metadata?.roadmap || {};
      const allTasks = [];
      const phases = [];

      // Extraer todas las tareas de todas las fases
      for (const [phaseKey, phase] of Object.entries(roadmap)) {
        const phaseInfo = {
          key: phaseKey,
          name: phase.name || phaseKey,
          status: phase.status || 'PLANNED',
          priority: phase.priority || 'MEDIUM',
          progress: phase.progress || 0,
          dependencies: phase.dependencies || [],
          tasks: []
        };

        if (phase.tasks && Array.isArray(phase.tasks)) {
          for (const task of phase.tasks) {
            const taskInfo = {
              id: task.id,
              name: task.name,
              phase: phaseKey,
              phaseName: phase.name || phaseKey,
              done: task.done || false,
              completedDate: task.completedDate || null,
              dependencies: task.dependencies || [],
              priority: this.inferTaskPriority(task, phase),
              estimatedHours: task.estimatedHours || this.estimateTaskHours(task),
              isCritical: false, // Se calculará después
              isBlocked: false   // Se calculará después
            };

            allTasks.push(taskInfo);
            phaseInfo.tasks.push(taskInfo);
          }
        }

        phases.push(phaseInfo);
      }

      // Calcular tareas bloqueadas (tienen dependencias no completadas)
      const taskMap = new Map(allTasks.map(t => [t.id, t]));
      for (const task of allTasks) {
        if (!task.done && task.dependencies.length > 0) {
          const blockedBy = task.dependencies.filter(depId => {
            const dep = taskMap.get(depId);
            return dep && !dep.done;
          });
          task.isBlocked = blockedBy.length > 0;
          task.blockedBy = blockedBy;
        }
      }

      // Calcular camino crítico (tareas pendientes sin bloqueos, ordenadas por prioridad)
      const pendingTasks = allTasks.filter(t => !t.done);
      const unblockedTasks = pendingTasks.filter(t => !t.isBlocked);

      // Ordenar por prioridad: HIGH > MEDIUM > LOW
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      unblockedTasks.sort((a, b) => {
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      });

      // Las tareas críticas son las de alta prioridad sin bloqueos
      const criticalTasks = unblockedTasks.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL');
      criticalTasks.forEach(t => t.isCritical = true);

      // Si no hay tareas críticas explícitas, las primeras 5 pendientes son críticas
      if (criticalTasks.length === 0) {
        unblockedTasks.slice(0, 5).forEach(t => t.isCritical = true);
      }

      return {
        scannedAt: new Date().toISOString(),
        source: 'ROADMAP_METADATA',
        tasks: allTasks,
        criticalTasks: allTasks.filter(t => t.isCritical),
        pendingTasks: pendingTasks,
        blockedTasks: allTasks.filter(t => t.isBlocked),
        phases: phases,
        stats: {
          total: allTasks.length,
          completed: allTasks.filter(t => t.done).length,
          pending: pendingTasks.length,
          critical: allTasks.filter(t => t.isCritical).length,
          blocked: allTasks.filter(t => t.isBlocked).length,
          phases: phases.length,
          completedPhases: phases.filter(p => p.status === 'COMPLETE').length,
          inProgressPhases: phases.filter(p => p.status === 'IN_PROGRESS').length
        }
      };
    } catch (error) {
      console.error('❌ [BRAIN] Error calculando CPM:', error.message);
      return {
        scannedAt: new Date().toISOString(),
        tasks: [],
        criticalTasks: [],
        phases: [],
        stats: { total: 0, critical: 0, blocked: 0, pending: 0 },
        error: error.message
      };
    }
  }

  /**
   * Inferir prioridad de tarea basada en contexto
   */
  inferTaskPriority(task, phase) {
    // Si la fase tiene prioridad HIGH, las tareas heredan
    if (phase.priority === 'HIGH' || phase.priority === 'CRITICAL') {
      return 'HIGH';
    }

    // Si el nombre contiene palabras clave de urgencia
    const name = (task.name || '').toLowerCase();
    if (name.includes('critical') || name.includes('urgent') || name.includes('blocker')) {
      return 'HIGH';
    }
    if (name.includes('fix') || name.includes('bug') || name.includes('error')) {
      return 'HIGH';
    }

    return phase.priority || 'MEDIUM';
  }

  /**
   * Estimar horas de tarea basado en nombre
   */
  estimateTaskHours(task) {
    const name = (task.name || '').toLowerCase();

    if (name.includes('backend') && name.includes('frontend')) return 8;
    if (name.includes('migration') || name.includes('database')) return 4;
    if (name.includes('api') || name.includes('endpoint')) return 3;
    if (name.includes('ui') || name.includes('component')) return 4;
    if (name.includes('test') || name.includes('testing')) return 2;
    if (name.includes('fix') || name.includes('bug')) return 2;
    if (name.includes('refactor')) return 4;

    return 3; // Default 3 horas
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOWS - DETECTADOS DESDE CÓDIGO CON STATUS INFERIDO
  // ═══════════════════════════════════════════════════════════════════════════

  async getWorkflows() {
    console.log('🔍 [BRAIN] Detectando workflows desde código...');

    const workflows = [];

    // 1. Buscar archivos de servicios que tengan workflows
    const servicesDir = path.join(this.baseDir, 'src/services');
    try {
      const serviceFiles = await fs.readdir(servicesDir);

      for (const file of serviceFiles) {
        if (!file.endsWith('.js')) continue;

        const filePath = path.join(servicesDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const stats = await fs.stat(filePath);

        // Detectar patrones de workflow
        const workflowPatterns = [
          { pattern: /async\s+(\w+Workflow)\s*\(/g, type: 'explicit' },
          { pattern: /status.*=.*['"](\w+)['"].*→.*['"](\w+)['"]/g, type: 'state_machine' },
          { pattern: /escalate|notify|approve|reject|submit/gi, type: 'action' }
        ];

        for (const wp of workflowPatterns) {
          const matches = content.matchAll(wp.pattern);
          for (const match of matches) {
            if (wp.type === 'explicit') {
              workflows.push({
                name: match[1],
                type: 'explicit_workflow',
                source: `src/services/${file}`,
                status: this.inferWorkflowStatus(content, match[1]),
                detectedAt: new Date().toISOString()
              });
            }
          }
        }

        // Detectar estados de workflow
        const statePattern = /status\s*(?:===?|!==?)\s*['"](draft|pending|approved|rejected|active|inactive|completed|cancelled)['"]/gi;
        const states = new Set();
        let stateMatch;
        while ((stateMatch = statePattern.exec(content)) !== null) {
          states.add(stateMatch[1].toLowerCase());
        }

        if (states.size >= 3) {
          const statesArray = Array.from(states);
          workflows.push({
            name: `${file.replace('.js', '')} State Machine`,
            type: 'state_machine',
            states: statesArray,
            source: `src/services/${file}`,
            status: this.inferStateMachineStatus(content, statesArray),
            lastModified: stats.mtime,
            detectedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ [BRAIN] Error detectando workflows:', error.message);
    }

    return {
      scannedAt: new Date().toISOString(),
      workflows: workflows,
      stats: {
        total: workflows.length,
        explicit: workflows.filter(w => w.type === 'explicit_workflow').length,
        stateMachines: workflows.filter(w => w.type === 'state_machine').length,
        implemented: workflows.filter(w => w.status === 'implemented').length,
        partial: workflows.filter(w => w.status === 'partial').length,
        planned: workflows.filter(w => w.status === 'planned').length
      }
    };
  }

  /**
   * Inferir status de un workflow explícito
   */
  inferWorkflowStatus(content, workflowName) {
    // Buscar si el workflow tiene implementación real
    const hasAwait = new RegExp(`${workflowName}[\\s\\S]{0,500}await\\s+`, 'i').test(content);
    const hasReturnValue = new RegExp(`${workflowName}[\\s\\S]{0,500}return\\s+\\{`, 'i').test(content);
    const hasTryCatch = new RegExp(`${workflowName}[\\s\\S]{0,500}try\\s*\\{`, 'i').test(content);

    if (hasAwait && hasReturnValue && hasTryCatch) {
      return 'implemented';
    } else if (hasAwait || hasReturnValue) {
      return 'partial';
    }
    return 'planned';
  }

  /**
   * Inferir status de una máquina de estados
   */
  inferStateMachineStatus(content, states) {
    // Si tiene transiciones explícitas entre estados, está implementada
    let transitions = 0;
    for (const state of states) {
      const transitionPattern = new RegExp(`status\\s*=\\s*['"]${state}['"]`, 'gi');
      const matches = content.match(transitionPattern);
      if (matches) transitions += matches.length;
    }

    if (transitions >= states.length) {
      return 'implemented';
    } else if (transitions > 0) {
      return 'partial';
    }
    return 'planned';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOWS CONECTADOS - SISTEMA DE DETECCIÓN AVANZADA + TUTORIALES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtener workflows CONECTADOS con pasos, módulos y capacidad de tutorial
   * Esta es la versión avanzada que reemplaza getWorkflows()
   *
   * PROCESO:
   * 1. Regenera workflows derivados si hay cambios en código fuente
   * 2. Escanea archivos buscando `static STAGES = {...}`
   * 3. Retorna workflows detectados con source: 'LIVE_CODE_SCAN'
   */
  async getWorkflowsConnected() {
    console.log('🔍 [BRAIN] Detectando workflows CONECTADOS desde código...');

    // PASO 0: Regenerar workflows derivados si hay cambios en código fuente
    await this.regenerateDerivedWorkflows();

    const workflows = [];
    const servicesDir = path.join(this.baseDir, 'src/services');
    const routesDir = path.join(this.baseDir, 'src/routes');

    try {
      const serviceFiles = await fs.readdir(servicesDir);

      for (const file of serviceFiles) {
        if (!file.endsWith('.js') || !file.includes('Workflow') && !file.includes('Service')) continue;

        const filePath = path.join(servicesDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const stats = await fs.stat(filePath);

        // 1. Detectar STAGES estructurados (como en LegalWorkflowService)
        const stages = this.extractWorkflowStagesFromCode(content, file);
        if (stages.length > 0) {
          const workflowName = file.replace('.js', '').replace('Service', '');

          // Buscar rutas relacionadas
          const relatedRoutes = await this.findRelatedRoutes(workflowName, routesDir);

          // Determinar módulos conectados
          const connectedModules = this.detectConnectedModules(content, file);

          workflows.push({
            id: `wf-${workflowName.toLowerCase()}`,
            name: workflowName,
            displayName: this.formatWorkflowName(workflowName),
            type: 'structured_workflow',
            source: `src/services/${file}`,
            lastModified: stats.mtime,

            // STAGES del workflow (para tutoriales)
            stages: stages,
            stageCount: stages.length,
            totalSteps: stages.reduce((acc, s) => acc + (s.subStatuses?.length || 0), 0),

            // Conexiones
            connectedModules: connectedModules,
            relatedRoutes: relatedRoutes,

            // Status inferido
            status: this.inferAdvancedWorkflowStatus(stages, content),
            completeness: this.calculateWorkflowCompleteness(stages, content),

            // Metadata para tutoriales
            tutorialCapable: stages.length > 0 && stages.some(s => s.subStatuses?.length > 0),
            tutorialSteps: this.generateTutorialSteps(stages, workflowName),

            detectedAt: new Date().toISOString()
          });
        }

        // 2. Detectar workflows implícitos (patrones async xxxWorkflow)
        const implicitWorkflows = this.extractImplicitWorkflows(content, file);
        for (const iw of implicitWorkflows) {
          // Solo agregar si no es duplicado
          if (!workflows.find(w => w.name === iw.name)) {
            workflows.push({
              ...iw,
              id: `wf-${iw.name.toLowerCase()}`,
              type: 'implicit_workflow',
              source: `src/services/${file}`,
              tutorialCapable: false
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ [BRAIN] Error detectando workflows conectados:', error.message);
    }

    // Ordenar por completeness
    workflows.sort((a, b) => (b.completeness || 0) - (a.completeness || 0));

    return {
      scannedAt: new Date().toISOString(),
      source: 'LIVE_CODE_SCAN',
      workflows: workflows,
      stats: {
        total: workflows.length,
        structured: workflows.filter(w => w.type === 'structured_workflow').length,
        implicit: workflows.filter(w => w.type === 'implicit_workflow').length,
        tutorialCapable: workflows.filter(w => w.tutorialCapable).length,
        implemented: workflows.filter(w => w.status === 'implemented').length,
        partial: workflows.filter(w => w.status === 'partial').length,
        planned: workflows.filter(w => w.status === 'planned').length,
        totalStages: workflows.reduce((acc, w) => acc + (w.stageCount || 0), 0),
        totalSteps: workflows.reduce((acc, w) => acc + (w.totalSteps || 0), 0)
      }
    };
  }

  /**
   * Extraer STAGES estructurados desde código
   * Busca patrones como: static STAGES = { ... }
   * MEJORADO: Maneja llaves anidadas correctamente
   */
  extractWorkflowStagesFromCode(content, fileName) {
    const stages = [];

    // Patrón 1: static STAGES = { ... } - Buscar inicio
    const stagesStartMatch = content.match(/static\s+STAGES\s*=\s*\{/);
    if (stagesStartMatch) {
      try {
        // Encontrar el objeto STAGES completo manejando llaves anidadas
        const startIndex = stagesStartMatch.index + stagesStartMatch[0].length - 1;
        const stagesContent = this.extractBalancedBraces(content, startIndex);

        if (stagesContent) {
          // Ahora extraer cada stage individualmente
          // Buscar patrones: stageName: { ... }
          const stageNames = stagesContent.match(/^\s*(\w+):\s*\{/gm);

          if (stageNames) {
            for (const stageStart of stageNames) {
              const stageName = stageStart.match(/(\w+):/)[1];
              const stageStartIndex = stagesContent.indexOf(stageStart);
              const openBraceIndex = stagesContent.indexOf('{', stageStartIndex);

              if (openBraceIndex >= 0) {
                const stageContent = this.extractBalancedBraces(stagesContent, openBraceIndex);

                if (stageContent) {
                  // Extraer propiedades del stage
                  const nameMatch = stageContent.match(/name:\s*['"]([^'"]+)['"]/);
                  const orderMatch = stageContent.match(/order:\s*(\d+)/);

                  // Extraer sub_statuses (array)
                  const subStatuses = this.extractSubStatusesImproved(stageContent);

                  // Extraer transitions_to
                  const transitionsMatch = stageContent.match(/transitions_to:\s*\[([\s\S]*?)\]/);
                  const transitions = transitionsMatch ?
                    transitionsMatch[1].match(/['"](\w+)['"]/g)?.map(s => s.replace(/['"]/g, '')) || [] :
                    [];

                  stages.push({
                    code: stageName,
                    name: nameMatch ? nameMatch[1] : this.formatStageName(stageName),
                    order: orderMatch ? parseInt(orderMatch[1]) : stages.length + 1,
                    subStatuses: subStatuses,
                    transitionsTo: transitions,
                    stepCount: subStatuses.length
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.log(`   ⚠️ Error parseando STAGES en ${fileName}: ${e.message}`);
      }
    }

    // Patrón 2: Buscar patrones de status transitions en el código
    if (stages.length === 0) {
      const statusPattern = /status\s*(?:===?|!==?)\s*['"]([\w_]+)['"]/gi;
      const foundStatuses = new Set();
      let statusMatch;
      while ((statusMatch = statusPattern.exec(content)) !== null) {
        foundStatuses.add(statusMatch[1].toLowerCase());
      }

      if (foundStatuses.size >= 3) {
        const statusArray = Array.from(foundStatuses);
        stages.push({
          code: 'inferred_states',
          name: 'Estados Detectados',
          order: 1,
          subStatuses: statusArray.map((s, idx) => ({
            code: s,
            name: this.formatStatusName(s),
            order: idx + 1
          })),
          transitionsTo: [],
          stepCount: statusArray.length,
          inferred: true
        });
      }
    }

    // Ordenar por order
    stages.sort((a, b) => a.order - b.order);

    return stages;
  }

  /**
   * Extraer contenido balanceado entre llaves
   * Maneja llaves anidadas correctamente
   */
  extractBalancedBraces(content, startIndex) {
    if (content[startIndex] !== '{') return null;

    let braceCount = 0;
    let result = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      result += char;

      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return result;
        }
      }
    }

    return null; // No se cerró correctamente
  }

  /**
   * Extraer sub_statuses de forma mejorada
   * Parsea el array de objetos correctamente
   */
  extractSubStatusesImproved(stageContent) {
    const subStatuses = [];

    // Buscar el array sub_statuses
    const subStatusArrayMatch = stageContent.match(/sub_statuses:\s*\[([\s\S]*?)\]\s*(?:,|$)/);
    if (!subStatusArrayMatch) return subStatuses;

    const arrayContent = subStatusArrayMatch[1];

    // Extraer cada objeto { code: '...', name: '...', next: [...] }
    const objectPattern = /\{\s*code:\s*['"](\w+)['"],\s*name:\s*['"]([^'"]+)['"]/g;
    let match;

    while ((match = objectPattern.exec(arrayContent)) !== null) {
      const code = match[1];
      const name = match[2];

      // Buscar 'next' para este objeto (buscar desde la posición actual)
      const remainingContent = arrayContent.substring(match.index);
      const nextMatch = remainingContent.match(/next:\s*\[(.*?)\]/);
      const nextTransitions = nextMatch ?
        nextMatch[1].match(/['"](\w+)['"]/g)?.map(s => s.replace(/['"]/g, '')) || [] :
        [];

      subStatuses.push({
        code: code,
        name: name,
        order: subStatuses.length + 1,
        nextTransitions: nextTransitions,
        canTransitionTo: nextTransitions.length
      });
    }

    return subStatuses;
  }

  /**
   * Extraer sub_statuses de un bloque de stage
   */
  extractSubStatuses(stageContent) {
    const subStatuses = [];

    // Buscar array de sub_statuses
    const subStatusPattern = /\{\s*code:\s*['"](\w+)['"],\s*name:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = subStatusPattern.exec(stageContent)) !== null) {
      // Buscar 'next' transitions para este sub_status
      const nextPattern = new RegExp(`code:\\s*['"]${match[1]}['"][^}]*next:\\s*\\[([^\\]]*)]`);
      const nextMatch = stageContent.match(nextPattern);
      const nextTransitions = nextMatch ?
        nextMatch[1].match(/['"](\w+)['"]/g)?.map(s => s.replace(/['"]/g, '')) || [] :
        [];

      subStatuses.push({
        code: match[1],
        name: match[2],
        order: subStatuses.length + 1,
        nextTransitions: nextTransitions,
        canTransitionTo: nextTransitions.length
      });
    }

    return subStatuses;
  }

  /**
   * Detectar workflows implícitos (funciones async xxxWorkflow)
   */
  extractImplicitWorkflows(content, fileName) {
    const workflows = [];
    const pattern = /async\s+(\w*[Ww]orkflow\w*)\s*\([^)]*\)\s*\{/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const name = match[1];
      const functionBody = this.extractFunctionBody(content, match.index);

      workflows.push({
        name: name,
        displayName: this.formatWorkflowName(name),
        status: this.inferWorkflowStatus(content, name),
        hasAwait: /await\s+/.test(functionBody),
        hasTryCatch: /try\s*\{/.test(functionBody),
        hasTransaction: /transaction|commit|rollback/i.test(functionBody),
        estimatedComplexity: this.estimateWorkflowComplexity(functionBody)
      });
    }

    return workflows;
  }

  /**
   * Extraer cuerpo de función para análisis
   */
  extractFunctionBody(content, startIndex) {
    let braceCount = 0;
    let started = false;
    let body = '';

    for (let i = startIndex; i < content.length && i < startIndex + 2000; i++) {
      const char = content[i];
      if (char === '{') {
        braceCount++;
        started = true;
      } else if (char === '}') {
        braceCount--;
        if (started && braceCount === 0) break;
      }
      if (started) body += char;
    }

    return body;
  }

  /**
   * Estimar complejidad de un workflow
   */
  estimateWorkflowComplexity(functionBody) {
    let score = 0;

    // Contar awaits (asincronía)
    const awaitCount = (functionBody.match(/await\s+/g) || []).length;
    score += Math.min(awaitCount * 10, 30);

    // Contar conditionals
    const ifCount = (functionBody.match(/if\s*\(/g) || []).length;
    score += Math.min(ifCount * 5, 20);

    // Contar loops
    const loopCount = (functionBody.match(/for\s*\(|while\s*\(|\.forEach|\.map/g) || []).length;
    score += Math.min(loopCount * 8, 24);

    // Try/catch (manejo de errores)
    if (/try\s*\{/.test(functionBody)) score += 10;

    // Transacciones
    if (/transaction|commit|rollback/i.test(functionBody)) score += 16;

    return Math.min(100, score);
  }

  /**
   * Encontrar rutas relacionadas a un workflow
   */
  async findRelatedRoutes(workflowName, routesDir) {
    const routes = [];
    const normalizedName = workflowName.toLowerCase().replace('workflow', '');

    try {
      const routeFiles = await fs.readdir(routesDir);

      for (const file of routeFiles) {
        if (!file.endsWith('.js')) continue;

        const filePath = path.join(routesDir, file);
        const content = await fs.readFile(filePath, 'utf8');

        // Buscar si el archivo importa o usa este workflow/service
        if (content.toLowerCase().includes(normalizedName) ||
            content.includes(workflowName)) {

          // Extraer endpoints relacionados
          const endpointPattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi;
          let match;
          while ((match = endpointPattern.exec(content)) !== null) {
            if (content.substring(Math.max(0, match.index - 500), match.index + 500)
                .toLowerCase().includes(normalizedName)) {
              routes.push({
                method: match[1].toUpperCase(),
                path: match[2],
                file: `src/routes/${file}`,
                action: this.inferActionFromEndpoint(match[2], match[1])
              });
            }
          }
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Error buscando rutas relacionadas: ${error.message}`);
    }

    return routes;
  }

  /**
   * Inferir acción desde un endpoint
   */
  inferActionFromEndpoint(path, method) {
    if (path.includes('approve')) return 'aprobar';
    if (path.includes('reject')) return 'rechazar';
    if (path.includes('escalate')) return 'escalar';
    if (path.includes('cancel')) return 'cancelar';
    if (path.includes('submit')) return 'enviar';
    if (path.includes('close')) return 'cerrar';
    if (method.toLowerCase() === 'post' && !path.includes(':')) return 'crear';
    if (method.toLowerCase() === 'put' || method.toLowerCase() === 'patch') return 'actualizar';
    if (method.toLowerCase() === 'delete') return 'eliminar';
    if (method.toLowerCase() === 'get' && path.includes(':')) return 'obtener';
    if (method.toLowerCase() === 'get') return 'listar';
    return 'ejecutar';
  }

  /**
   * Detectar módulos conectados a un workflow
   */
  detectConnectedModules(content, fileName) {
    const modules = [];

    // Patrones de módulos conocidos
    const modulePatterns = {
      'users': /User|usuario|employee|empleado/i,
      'attendance': /Attendance|asistencia|marcaje|clock/i,
      'vacation': /Vacation|vacacion|ausencia|leave/i,
      'medical': /Medical|medic|exam|salud/i,
      'legal': /Legal|case|caso|juridic/i,
      'notifications': /Notification|notific|alert/i,
      'departments': /Department|departamento|area/i,
      'shifts': /Shift|turno|horario/i,
      'sanctions': /Sanction|sancion|disciplin/i,
      'documents': /Document|documento|archivo/i,
      'payroll': /Payroll|nomina|salary/i
    };

    for (const [module, pattern] of Object.entries(modulePatterns)) {
      if (pattern.test(content) || pattern.test(fileName)) {
        modules.push(module);
      }
    }

    return [...new Set(modules)]; // Remover duplicados
  }

  /**
   * Inferir status avanzado de un workflow
   */
  inferAdvancedWorkflowStatus(stages, content) {
    if (stages.length === 0) return 'planned';

    // Verificar si hay implementación real
    const hasTransitions = stages.some(s => s.transitionsTo?.length > 0);
    const hasSubStatuses = stages.some(s => s.subStatuses?.length > 2);
    const hasDbOperations = /\.create\(|\.update\(|\.findOne\(|\.query\(/i.test(content);
    const hasValidation = /validate|check|verify|ensure/i.test(content);

    if (hasTransitions && hasSubStatuses && hasDbOperations && hasValidation) {
      return 'implemented';
    }
    if (hasTransitions && hasSubStatuses) {
      return 'partial';
    }
    if (stages.some(s => !s.inferred)) {
      return 'partial';
    }
    return 'planned';
  }

  /**
   * Calcular completeness de un workflow (0-100)
   */
  calculateWorkflowCompleteness(stages, content) {
    let score = 0;

    // Puntos por stages definidos
    if (stages.length > 0) score += 15;
    if (stages.length >= 3) score += 10;
    if (stages.length >= 5) score += 5;

    // Puntos por sub_statuses
    const totalSubStatuses = stages.reduce((acc, s) => acc + (s.subStatuses?.length || 0), 0);
    if (totalSubStatuses > 0) score += 15;
    if (totalSubStatuses >= 10) score += 10;
    if (totalSubStatuses >= 20) score += 5;

    // Puntos por transitions definidas
    const hasTransitions = stages.some(s => s.transitionsTo?.length > 0);
    if (hasTransitions) score += 15;

    // Puntos por implementación
    if (/async\s+\w+/.test(content)) score += 5;
    if (/await\s+/.test(content)) score += 5;
    if (/try\s*\{/.test(content)) score += 5;
    if (/transaction|commit/i.test(content)) score += 5;
    if (/validate|check/i.test(content)) score += 5;

    return Math.min(100, score);
  }

  /**
   * Generar pasos de tutorial desde stages
   * ESTA ES LA FUNCIÓN CLAVE PARA TUTORIALES DINÁMICOS
   */
  generateTutorialSteps(stages, workflowName) {
    const tutorialSteps = [];
    let stepNumber = 1;

    for (const stage of stages) {
      // Paso principal del stage
      tutorialSteps.push({
        step: stepNumber++,
        type: 'stage',
        title: `Etapa: ${stage.name}`,
        description: `El workflow "${this.formatWorkflowName(workflowName)}" entra en la etapa "${stage.name}"`,
        code: stage.code,
        isMainStep: true,
        subSteps: []
      });

      // Sub-pasos
      if (stage.subStatuses && stage.subStatuses.length > 0) {
        for (const subStatus of stage.subStatuses) {
          tutorialSteps[tutorialSteps.length - 1].subSteps.push({
            step: stepNumber++,
            type: 'sub_status',
            title: subStatus.name,
            code: subStatus.code,
            action: this.generateActionDescription(subStatus),
            nextOptions: subStatus.nextTransitions || [],
            canProceedTo: subStatus.nextTransitions?.map(t =>
              this.findSubStatusName(stages, t)
            ).filter(Boolean) || []
          });
        }
      }

      // Transiciones a otras etapas
      if (stage.transitionsTo && stage.transitionsTo.length > 0) {
        tutorialSteps.push({
          step: stepNumber++,
          type: 'transition',
          title: `Transición desde ${stage.name}`,
          description: `Después de "${stage.name}", el workflow puede continuar a:`,
          options: stage.transitionsTo.map(t => ({
            code: t,
            name: this.findStageName(stages, t) || this.formatStageName(t)
          }))
        });
      }
    }

    return tutorialSteps;
  }

  /**
   * Generar descripción de acción para un sub-status
   */
  generateActionDescription(subStatus) {
    const code = subStatus.code.toLowerCase();

    if (code.includes('sent') || code.includes('enviado')) {
      return 'Enviar documento o notificación';
    }
    if (code.includes('received') || code.includes('recibido')) {
      return 'Confirmar recepción';
    }
    if (code.includes('review') || code.includes('revision')) {
      return 'Revisar y analizar información';
    }
    if (code.includes('analysis') || code.includes('analisis')) {
      return 'Realizar análisis detallado';
    }
    if (code.includes('negotiation') || code.includes('negociacion')) {
      return 'Iniciar proceso de negociación';
    }
    if (code.includes('settlement') || code.includes('acuerdo')) {
      return 'Formalizar acuerdo alcanzado';
    }
    if (code.includes('hearing') || code.includes('audiencia')) {
      return 'Preparar y asistir a audiencia';
    }
    if (code.includes('filed') || code.includes('presentad')) {
      return 'Presentar documentación';
    }
    if (code.includes('approval') || code.includes('approved') || code.includes('aprobad')) {
      return 'Aprobar solicitud';
    }
    if (code.includes('reject') || code.includes('rechaz')) {
      return 'Rechazar con justificación';
    }
    if (code.includes('pending') || code.includes('pendiente')) {
      return 'Aguardar resolución';
    }
    if (code.includes('closed') || code.includes('cerrado')) {
      return 'Cerrar caso';
    }
    if (code.includes('payment') || code.includes('pago')) {
      return 'Procesar pago';
    }

    return `Ejecutar: ${subStatus.name}`;
  }

  /**
   * Buscar nombre de stage por código
   */
  findStageName(stages, code) {
    const stage = stages.find(s => s.code === code);
    return stage ? stage.name : null;
  }

  /**
   * Buscar nombre de sub-status en todos los stages
   */
  findSubStatusName(stages, code) {
    for (const stage of stages) {
      const sub = stage.subStatuses?.find(s => s.code === code);
      if (sub) return sub.name;
    }
    return null;
  }

  /**
   * Formatear nombre de workflow para display
   */
  formatWorkflowName(name) {
    return name
      .replace(/Workflow|Service/g, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }

  /**
   * Formatear nombre de stage
   */
  formatStageName(code) {
    return code
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  /**
   * Formatear nombre de status
   */
  formatStatusName(code) {
    return code
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generar tutorial completo para un workflow específico
   * @param {string} workflowId - ID del workflow (ej: 'wf-legal')
   * @returns {Object} Tutorial estructurado
   */
  async generateTutorialForWorkflow(workflowId) {
    console.log(`📚 [BRAIN] Generando tutorial para workflow: ${workflowId}`);

    const { workflows } = await this.getWorkflowsConnected();
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow) {
      return { error: `Workflow ${workflowId} no encontrado`, available: workflows.map(w => w.id) };
    }

    if (!workflow.tutorialCapable) {
      return {
        error: 'Este workflow no tiene estructura suficiente para generar tutorial',
        workflow: workflow.name,
        suggestion: 'Agregar STAGES con sub_statuses al código del servicio'
      };
    }

    // Generar tutorial estructurado
    const tutorial = {
      id: `tutorial-${workflowId}`,
      workflowId: workflowId,
      title: `Tutorial: ${workflow.displayName}`,
      generatedAt: new Date().toISOString(),
      source: 'LIVE_CODE_ANALYSIS',

      // Overview
      overview: {
        description: `Este tutorial explica el flujo completo del workflow "${workflow.displayName}"`,
        totalStages: workflow.stageCount,
        totalSteps: workflow.totalSteps,
        estimatedTime: this.estimateTutorialTime(workflow),
        difficulty: this.estimateDifficulty(workflow),
        prerequisites: this.generatePrerequisites(workflow),
        connectedModules: workflow.connectedModules
      },

      // Stages detallados
      stages: workflow.stages.map((stage, idx) => ({
        number: idx + 1,
        id: stage.code,
        title: stage.name,
        description: `Etapa ${idx + 1} de ${workflow.stageCount}: ${stage.name}`,
        steps: stage.subStatuses?.map((sub, subIdx) => ({
          number: `${idx + 1}.${subIdx + 1}`,
          id: sub.code,
          title: sub.name,
          action: this.generateActionDescription(sub),
          instructions: this.generateStepInstructions(sub, stage, workflow),
          tips: this.generateStepTips(sub),
          nextOptions: sub.nextTransitions?.map(next => ({
            code: next,
            name: this.findSubStatusName(workflow.stages, next) || this.formatStatusName(next),
            description: `Continuar a: ${this.findSubStatusName(workflow.stages, next) || next}`
          })) || []
        })) || [],
        canTransitionTo: stage.transitionsTo?.map(t => ({
          code: t,
          name: this.findStageName(workflow.stages, t) || this.formatStageName(t)
        })) || []
      })),

      // Rutas API relacionadas
      apiEndpoints: workflow.relatedRoutes?.map(route => ({
        method: route.method,
        path: route.path,
        action: route.action,
        file: route.file,
        usage: `${route.method} ${route.path} → ${route.action}`
      })) || [],

      // Resumen final
      summary: {
        keyTakeaways: this.generateKeyTakeaways(workflow),
        commonMistakes: this.generateCommonMistakes(workflow),
        bestPractices: this.generateBestPractices(workflow)
      }
    };

    return tutorial;
  }

  /**
   * Estimar tiempo del tutorial
   */
  estimateTutorialTime(workflow) {
    const baseTime = 5; // minutos
    const stageTime = (workflow.stageCount || 0) * 2;
    const stepTime = (workflow.totalSteps || 0) * 0.5;
    const total = Math.round(baseTime + stageTime + stepTime);
    return `${total}-${total + 5} minutos`;
  }

  /**
   * Estimar dificultad
   */
  estimateDifficulty(workflow) {
    const completeness = workflow.completeness || 0;
    const stages = workflow.stageCount || 0;

    if (stages > 5 || completeness > 80) return 'Avanzado';
    if (stages > 2 || completeness > 50) return 'Intermedio';
    return 'Básico';
  }

  /**
   * Generar prerequisitos
   */
  generatePrerequisites(workflow) {
    const prereqs = ['Acceso al sistema'];

    if (workflow.connectedModules?.includes('users')) {
      prereqs.push('Permisos de gestión de usuarios');
    }
    if (workflow.connectedModules?.includes('legal')) {
      prereqs.push('Acceso al módulo legal');
    }
    if (workflow.connectedModules?.includes('medical')) {
      prereqs.push('Permisos de salud ocupacional');
    }
    if (workflow.connectedModules?.includes('payroll')) {
      prereqs.push('Acceso a módulo de nómina');
    }

    return prereqs;
  }

  /**
   * Generar instrucciones para un paso
   */
  generateStepInstructions(subStatus, stage, workflow) {
    const instructions = [];
    const code = subStatus.code.toLowerCase();

    instructions.push(`1. Acceder al módulo de ${workflow.displayName || 'gestión'}`);
    instructions.push(`2. Localizar el caso/item en estado "${stage.name}"`);
    instructions.push(`3. Ejecutar acción: ${this.generateActionDescription(subStatus)}`);

    if (subStatus.nextTransitions?.length > 0) {
      instructions.push(`4. Seleccionar siguiente estado: ${subStatus.nextTransitions.join(' o ')}`);
    }

    if (code.includes('approval') || code.includes('review')) {
      instructions.push('5. Agregar comentarios si es necesario');
      instructions.push('6. Confirmar la acción');
    }

    return instructions;
  }

  /**
   * Generar tips para un paso
   */
  generateStepTips(subStatus) {
    const tips = [];
    const code = subStatus.code.toLowerCase();

    if (code.includes('review') || code.includes('analysis')) {
      tips.push('💡 Tómese el tiempo necesario para revisar toda la documentación');
    }
    if (code.includes('sent') || code.includes('notification')) {
      tips.push('💡 Verifique la dirección de correo/destinatario antes de enviar');
    }
    if (code.includes('approval')) {
      tips.push('💡 Asegúrese de tener autoridad para aprobar');
    }
    if (code.includes('reject')) {
      tips.push('💡 Siempre incluya una justificación clara');
    }
    if (code.includes('hearing') || code.includes('audiencia')) {
      tips.push('💡 Prepare la documentación con anticipación');
    }

    if (tips.length === 0) {
      tips.push('💡 Verifique toda la información antes de continuar');
    }

    return tips;
  }

  /**
   * Generar puntos clave del tutorial
   */
  generateKeyTakeaways(workflow) {
    return [
      `El workflow "${workflow.displayName}" tiene ${workflow.stageCount} etapas principales`,
      `Cada etapa tiene sub-estados que definen el progreso`,
      `Las transiciones solo pueden hacerse a estados permitidos`,
      `Todo cambio queda registrado en el historial`
    ];
  }

  /**
   * Generar errores comunes
   */
  generateCommonMistakes(workflow) {
    return [
      'Intentar saltar etapas sin completar las anteriores',
      'No documentar las razones de cambio de estado',
      'Olvidar notificar a las partes involucradas',
      'No verificar permisos antes de ejecutar acciones'
    ];
  }

  /**
   * Generar mejores prácticas
   */
  generateBestPractices(workflow) {
    return [
      'Seguir el flujo de estados en orden',
      'Documentar cada decisión importante',
      'Mantener comunicación con las partes',
      'Revisar el historial antes de tomar decisiones',
      'Escalar cuando sea necesario'
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATABASE SCHEMA - INTROSPECCIÓN EN VIVO
  // ═══════════════════════════════════════════════════════════════════════════

  async getDatabaseSchema() {
    console.log('🔍 [BRAIN] Introspectando schema de BD EN VIVO...');

    try {
      const { sequelize } = this.db;

      // Obtener todas las tablas
      const [tables] = await sequelize.query(`
        SELECT
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      // Para cada tabla, obtener columnas
      const schema = [];
      for (const table of tables.slice(0, 50)) { // Limitar a 50 tablas para performance
        const [columns] = await sequelize.query(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = :tableName
          ORDER BY ordinal_position
        `, { replacements: { tableName: table.table_name } });

        // Contar registros
        let rowCount = 0;
        try {
          const [[countResult]] = await sequelize.query(
            `SELECT COUNT(*) as count FROM "${table.table_name}"`,
            { raw: true }
          );
          rowCount = parseInt(countResult?.count || 0);
        } catch {}

        schema.push({
          name: table.table_name,
          columnCount: parseInt(table.column_count),
          rowCount: rowCount,
          columns: columns
        });
      }

      // Agrupar por prefijo
      const grouped = {};
      for (const table of schema) {
        const prefix = table.name.split('_')[0] || 'other';
        if (!grouped[prefix]) grouped[prefix] = [];
        grouped[prefix].push(table);
      }

      return {
        scannedAt: new Date().toISOString(),
        totalTables: tables.length,
        schema: schema,
        grouped: grouped,
        stats: {
          totalRows: schema.reduce((sum, t) => sum + t.rowCount, 0),
          totalColumns: schema.reduce((sum, t) => sum + t.columnCount, 0)
        }
      };
    } catch (error) {
      console.error('❌ [BRAIN] Error en introspección de BD:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APLICACIONES DEL ECOSISTEMA - CON STATUS INFERIDO
  // ═══════════════════════════════════════════════════════════════════════════

  async getApplications() {
    console.log('🔍 [BRAIN] Detectando aplicaciones del ecosistema...');

    const apps = [];

    // Panel Administrativo
    const adminHtml = path.join(this.baseDir, 'public/panel-administrativo.html');
    if (await this.fileExists(adminHtml)) {
      const stats = await fs.stat(adminHtml);
      const lines = await this.countLines(adminHtml);
      const content = await fs.readFile(adminHtml, 'utf8');
      apps.push({
        key: 'panel-administrativo',
        name: 'Panel Administrativo Aponnt',
        type: 'web',
        platform: 'Web Desktop',
        status: this.inferAppStatus(content, lines),
        progress: this.calculateAppProgress(content, lines),
        url: '/panel-administrativo.html',
        entryFile: 'public/panel-administrativo.html',
        lastModified: stats.mtime,
        lines: lines,
        description: `Panel de administración con ${lines} líneas de código`
      });
    }

    // Panel Empresa
    const empresaHtml = path.join(this.baseDir, 'public/panel-empresa.html');
    if (await this.fileExists(empresaHtml)) {
      const stats = await fs.stat(empresaHtml);
      const lines = await this.countLines(empresaHtml);
      const content = await fs.readFile(empresaHtml, 'utf8');
      apps.push({
        key: 'panel-empresa',
        name: 'Panel Empresa (Clientes)',
        type: 'web',
        platform: 'Web Desktop + Mobile',
        status: this.inferAppStatus(content, lines),
        progress: this.calculateAppProgress(content, lines),
        url: '/panel-empresa.html',
        entryFile: 'public/panel-empresa.html',
        lastModified: stats.mtime,
        lines: lines,
        description: `Panel de empresa con ${lines} líneas de código`
      });
    }

    // Index (Landing)
    const indexHtml = path.join(this.baseDir, 'public/index.html');
    if (await this.fileExists(indexHtml)) {
      const stats = await fs.stat(indexHtml);
      const lines = await this.countLines(indexHtml);
      const content = await fs.readFile(indexHtml, 'utf8');
      apps.push({
        key: 'landing',
        name: 'Landing Page',
        type: 'web',
        platform: 'Web',
        status: this.inferAppStatus(content, lines),
        progress: this.calculateAppProgress(content, lines),
        url: '/index.html',
        entryFile: 'public/index.html',
        lastModified: stats.mtime,
        lines: lines,
        description: `Landing page con ${lines} líneas`
      });
    }

    // Detectar APKs desde android/
    const androidDir = path.join(this.baseDir, '..', 'android');
    try {
      await fs.access(androidDir);
      apps.push({
        key: 'apk-kiosk',
        name: 'APK Kiosk Biométrico',
        type: 'mobile',
        platform: 'Android',
        status: 'production',
        progress: 85,
        entryFile: '../android/',
        description: 'Aplicación Android para kiosk biométrico',
        note: 'Detectado directorio android/'
      });
    } catch {}

    return {
      scannedAt: new Date().toISOString(),
      applications: apps,
      stats: {
        total: apps.length,
        web: apps.filter(a => a.type === 'web').length,
        mobile: apps.filter(a => a.type === 'mobile').length,
        production: apps.filter(a => a.status === 'production').length,
        in_progress: apps.filter(a => a.status === 'in_progress').length,
        averageProgress: apps.length > 0
          ? Math.round(apps.reduce((sum, a) => sum + (a.progress || 0), 0) / apps.length)
          : 0
      }
    };
  }

  /**
   * Inferir status de una aplicación desde su contenido
   */
  inferAppStatus(content, lines) {
    // Si tiene más de 1000 líneas y funcionalidades clave, está en producción
    const hasLogin = /login|auth|signin/i.test(content);
    const hasNavigation = /navbar|sidebar|menu/i.test(content);
    const hasModules = /module|loadModule|initModule/i.test(content);
    const hasForms = /<form|form-control|submit/i.test(content);

    const features = [hasLogin, hasNavigation, hasModules, hasForms].filter(Boolean).length;

    if (lines > 1000 && features >= 3) {
      return 'production';
    } else if (lines > 500 && features >= 2) {
      return 'in_progress';
    } else if (lines > 100) {
      return 'development';
    }
    return 'planned';
  }

  /**
   * Calcular progress de una aplicación
   */
  calculateAppProgress(content, lines) {
    let score = 0;

    // Por líneas de código (max 30%)
    score += Math.min(30, Math.floor(lines / 200));

    // Por features detectadas (max 70%)
    const features = {
      hasLogin: /login|auth|signin/i.test(content),
      hasNavigation: /navbar|sidebar|menu/i.test(content),
      hasModules: /module|loadModule|initModule/i.test(content),
      hasForms: /<form|form-control|submit/i.test(content),
      hasApi: /fetch|axios|api|endpoint/i.test(content),
      hasValidation: /validate|required|error/i.test(content),
      hasResponsive: /responsive|mobile|@media/i.test(content)
    };

    const featureCount = Object.values(features).filter(Boolean).length;
    score += Math.floor((featureCount / 7) * 70);

    return Math.min(100, score);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANIGRAMA APONNT
  // ═══════════════════════════════════════════════════════════════════════════

  async getOrganigrama() {
    console.log('🔍 [BRAIN] Obteniendo organigrama desde BD...');

    try {
      const { sequelize } = this.db;

      // Intentar obtener de aponnt_staff con jerarquía
      const [staff] = await sequelize.query(`
        SELECT
          s.staff_id as id,
          s.first_name || ' ' || s.last_name as name,
          s.email,
          s.position,
          r.role_name as role,
          r.role_code,
          s.reports_to_staff_id as reports_to,
          s.is_active
        FROM aponnt_staff s
        LEFT JOIN aponnt_staff_roles r ON s.role_id = r.role_id
        WHERE s.is_active = true
        ORDER BY r.level, s.first_name
      `);

      // Construir árbol jerárquico
      const tree = this.buildHierarchyTree(staff);

      return {
        scannedAt: new Date().toISOString(),
        staff: staff,
        tree: tree,
        stats: {
          totalStaff: staff.length,
          roles: [...new Set(staff.map(s => s.role).filter(Boolean))]
        }
      };
    } catch (error) {
      console.warn('⚠️ [BRAIN] Error obteniendo organigrama:', error.message);
      return {
        scannedAt: new Date().toISOString(),
        staff: [],
        tree: null,
        stats: { totalStaff: 0, roles: [] }
      };
    }
  }

  buildHierarchyTree(staff) {
    const map = new Map();
    const roots = [];

    // Crear mapa
    for (const s of staff) {
      map.set(s.id, { ...s, children: [] });
    }

    // Construir árbol
    for (const s of staff) {
      const node = map.get(s.id);
      if (s.reports_to && map.has(s.reports_to)) {
        map.get(s.reports_to).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANIGRAMA INTELIGENTE - VERSIÓN AVANZADA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtener organigrama de Aponnt (staff interno) con análisis inteligente
   */
  async getOrgChartAponnt() {
    console.log('🧠 [BRAIN-ORGCHART] Generando organigrama inteligente de Aponnt...');

    try {
      const { sequelize } = this.db;

      // Query optimizada con todas las relaciones
      const [staff] = await sequelize.query(`
        SELECT
          s.staff_id,
          s.first_name || ' ' || s.last_name as full_name,
          s.first_name,
          s.last_name,
          s.email,
          s.phone,
          s.profile_photo,
          r.role_name as position,
          s.created_at as hire_date,
          s.reports_to_staff_id,
          s.is_active,
          s.level,
          s.area,
          r.role_id,
          r.role_name,
          r.role_code,
          r.level as role_level,
          r.role_area
        FROM aponnt_staff s
        LEFT JOIN aponnt_staff_roles r ON s.role_id = r.role_id
        WHERE s.is_active = true
        ORDER BY r.level NULLS LAST, s.first_name
      `);

      // Obtener todas las posiciones/roles definidos (incluso sin staff)
      const [allRoles] = await sequelize.query(`
        SELECT
          role_id,
          role_name,
          role_code,
          level,
          role_area,
          description,
          reports_to_role_code
        FROM aponnt_staff_roles
        ORDER BY level, role_name
      `);

      // Construir nodos (staff + vacantes)
      const nodes = this._buildOrgNodes(staff, allRoles);

      // Construir edges (relaciones)
      const edges = this._buildOrgEdges(staff);

      // Construir árbol jerárquico
      const tree = this._buildAdvancedHierarchy(nodes);

      // Análisis inteligente
      const insights = this._analyzeOrgStructure(nodes, edges);

      // Stats agregadas
      const stats = this._calculateOrgStats(nodes, staff, allRoles);

      return {
        type: 'aponnt',
        scannedAt: new Date().toISOString(),
        nodes,
        edges,
        tree,
        insights,
        stats
      };

    } catch (error) {
      console.error('❌ [BRAIN-ORGCHART] Error en organigrama Aponnt:', error);
      throw error;
    }
  }

  /**
   * Obtener organigrama de empresa (empleados) con análisis inteligente
   */
  async getOrgChartCompany(companyId) {
    console.log(`🧠 [BRAIN-ORGCHART] Generando organigrama inteligente para empresa ${companyId}...`);

    try {
      const { sequelize } = this.db;

      // Query optimizada con empleados y posiciones
      const [employees] = await sequelize.query(`
        SELECT
          u.user_id,
          u."firstName" || ' ' || u."lastName" as full_name,
          u."firstName",
          u."lastName",
          u.email,
          u.phone,
          u.position,
          u."hireDate" as hire_date,
          NULL as manager_id,
          u.is_active,
          d.id as department_id,
          d.name as department_name,
          s.id as sector_id,
          s.name as sector_name,
          s.display_order as sector_order
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN sectors s ON u.sector_id = s.id
        WHERE u.company_id = :companyId
          AND u.is_active = true
        ORDER BY d.name, s.display_order, u."firstName"
      `, {
        replacements: { companyId },
        type: sequelize.QueryTypes.SELECT
      });

      // Obtener posiciones organizacionales definidas
      let positions = [];
      try {
        positions = await sequelize.query(`
        SELECT
          p.id as position_id,
          p.position_name,
          p.position_code,
          p.description,
          p.hierarchy_level,
          p.parent_position_id,
          p.department_id,
          p.color_hex,
          p.can_approve_permissions,
          p.max_approval_days,
          COUNT(u.user_id) as assigned_count
        FROM organizational_positions p
        LEFT JOIN users u ON u.position = p.position_name AND u.company_id = p.company_id AND u.is_active = true
        WHERE p.company_id = :companyId
          AND p.is_active = true
        GROUP BY p.id
        ORDER BY p.hierarchy_level, p.position_name
      `, {
        replacements: { companyId },
        type: sequelize.QueryTypes.SELECT
      });
        if (!Array.isArray(positions)) positions = [];
      } catch (posErr) {
        console.warn('[BRAIN] Error obteniendo posiciones, usando array vacío:', posErr.message);
        positions = [];
      }

      // Construir nodos
      const nodes = this._buildCompanyOrgNodes(employees, positions);

      // Construir edges
      const edges = this._buildCompanyOrgEdges(employees);

      // Construir árbol
      const tree = this._buildAdvancedHierarchy(nodes);

      // Análisis inteligente
      const insights = this._analyzeOrgStructure(nodes, edges);

      // Stats
      const stats = this._calculateCompanyOrgStats(nodes, employees, positions);

      return {
        type: 'company',
        companyId,
        scannedAt: new Date().toISOString(),
        nodes,
        edges,
        tree,
        insights,
        stats
      };

    } catch (error) {
      console.error(`❌ [BRAIN-ORGCHART] Error en organigrama empresa ${companyId}:`, error);
      throw error;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HELPERS - Construcción de Nodos y Edges
  // ───────────────────────────────────────────────────────────────────────────

  _buildOrgNodes(staff, allRoles) {
    const nodes = [];
    const roleMap = new Map();

    // Mapear roles con su staff asignado
    allRoles.forEach(role => {
      roleMap.set(role.role_id, {
        ...role,
        staff: []
      });
    });

    // Asignar staff a roles
    staff.forEach(s => {
      if (s.role_id && roleMap.has(s.role_id)) {
        roleMap.get(s.role_id).staff.push(s);
      }
    });

    // Crear nodos (incluyendo vacantes)
    roleMap.forEach((role, roleId) => {
      if (role.staff.length > 0) {
        // Rol con staff asignado
        role.staff.forEach((s, idx) => {
          nodes.push({
            id: `staff_${s.staff_id}`,
            entityId: s.staff_id,
            type: 'staff',
            name: s.full_name,
            firstName: s.first_name,
            lastName: s.last_name,
            email: s.email,
            phone: s.phone,
            profile_photo: s.profile_photo,
            position: s.position,
            hireDate: s.hire_date,
            role: role.role_name,
            roleCode: role.role_code,
            level: role.level || 99,
            area: role.role_area || 'general',
            reportsTo: s.reports_to_staff_id ? `staff_${s.reports_to_staff_id}` : null,
            isVacant: false,
            avatar: this._generateAvatar(s.full_name)
          });
        });
      } else {
        // Rol vacante (sin staff)
        nodes.push({
          id: `vacant_role_${roleId}`,
          entityId: roleId,
          type: 'vacant',
          name: role.role_name,
          position: role.role_name,
          role: role.role_name,
          roleCode: role.role_code,
          level: role.level || 99,
          area: role.role_area || 'general',
          reportsTo: role.reports_to_role_code ? `vacant_role_${role.reports_to_role_code}` : null,
          isVacant: true,
          vacancyReason: 'Sin asignar',
          avatar: '❓'
        });
      }
    });

    return nodes;
  }

  _buildCompanyOrgNodes(employees, positions) {
    const nodes = [];
    const positionMap = new Map();

    // Mapear posiciones
    positions.forEach(pos => {
      positionMap.set(pos.position_id, pos);
    });

    // Crear nodos de empleados
    employees.forEach(emp => {
      nodes.push({
        id: `user_${emp.user_id}`,
        entityId: emp.user_id,
        type: 'employee',
        name: emp.full_name,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        hireDate: emp.hire_date,
        department: emp.department_name,
        departmentId: emp.department_id,
        sector: emp.sector_name,
        sectorId: emp.sector_id,
        level: 4, // Por defecto operativo, se puede mejorar con lógica
        reportsTo: emp.manager_id ? `user_${emp.manager_id}` : null,
        isVacant: false,
        avatar: this._generateAvatar(emp.full_name)
      });
    });

    // Agregar posiciones vacantes
    positions.forEach(pos => {
      if (pos.assigned_count === 0) {
        nodes.push({
          id: `vacant_pos_${pos.position_id}`,
          entityId: pos.position_id,
          type: 'vacant',
          name: pos.position_name,
          position: pos.position_name,
          positionCode: pos.position_code,
          level: pos.hierarchy_level || 99,
          department: null,
          reportsTo: pos.parent_position_id ? `vacant_pos_${pos.parent_position_id}` : null,
          isVacant: true,
          vacancyReason: 'Posición sin cubrir',
          color: pos.color_hex,
          avatar: '❓'
        });
      }
    });

    return nodes;
  }

  _buildOrgEdges(staff) {
    const edges = [];
    staff.forEach(s => {
      if (s.reports_to_staff_id) {
        edges.push({
          from: `staff_${s.staff_id}`,
          to: `staff_${s.reports_to_staff_id}`,
          type: 'reports_to',
          strength: 1
        });
      }
    });
    return edges;
  }

  _buildCompanyOrgEdges(employees) {
    const edges = [];
    employees.forEach(emp => {
      if (emp.manager_id) {
        edges.push({
          from: `user_${emp.user_id}`,
          to: `user_${emp.manager_id}`,
          type: 'reports_to',
          strength: 1
        });
      }
    });
    return edges;
  }

  _buildAdvancedHierarchy(nodes) {
    const map = new Map();
    const roots = [];

    // Crear mapa
    nodes.forEach(n => {
      map.set(n.id, { ...n, children: [], directReports: 0 });
    });

    // Construir árbol
    nodes.forEach(n => {
      const node = map.get(n.id);
      if (n.reportsTo && map.has(n.reportsTo)) {
        const parent = map.get(n.reportsTo);
        parent.children.push(node);
        parent.directReports++;
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ANÁLISIS INTELIGENTE - Brain Insights
  // ───────────────────────────────────────────────────────────────────────────

  _analyzeOrgStructure(nodes, edges) {
    const insights = {
      bottlenecks: [],
      vacancies: [],
      orphans: [],
      recommendations: [],
      healthScore: 100
    };

    // Detectar bottlenecks (managers con >8 reportes directos)
    const reportCounts = new Map();
    edges.forEach(edge => {
      reportCounts.set(edge.to, (reportCounts.get(edge.to) || 0) + 1);
    });

    reportCounts.forEach((count, nodeId) => {
      if (count > 8) {
        const node = nodes.find(n => n.id === nodeId);
        insights.bottlenecks.push({
          nodeId,
          name: node?.name || 'Unknown',
          directReports: count,
          severity: count > 12 ? 'high' : 'medium',
          recommendation: `Considerar crear posición intermedia. ${node?.name} tiene ${count} reportes directos (ideal: 5-8).`
        });
        insights.healthScore -= 5;
      }
    });

    // Detectar vacantes
    const vacantNodes = nodes.filter(n => n.isVacant);
    vacantNodes.forEach(v => {
      insights.vacancies.push({
        nodeId: v.id,
        position: v.name,
        level: v.level,
        area: v.area,
        priority: v.level <= 2 ? 'high' : 'medium'
      });
      insights.healthScore -= (v.level <= 2 ? 3 : 1);
    });

    // Detectar huérfanos (empleados sin manager)
    const orphanNodes = nodes.filter(n => !n.isVacant && !n.reportsTo && n.level > 0);
    orphanNodes.forEach(o => {
      insights.orphans.push({
        nodeId: o.id,
        name: o.name,
        position: o.position,
        recommendation: `Asignar manager a ${o.name}`
      });
      insights.healthScore -= 2;
    });

    // Generar recomendaciones generales
    if (insights.bottlenecks.length > 0) {
      insights.recommendations.push({
        type: 'structure',
        priority: 'high',
        message: `Se detectaron ${insights.bottlenecks.length} bottlenecks organizacionales. Considere reestructurar.`
      });
    }

    if (vacantNodes.length > 3) {
      insights.recommendations.push({
        type: 'hiring',
        priority: 'medium',
        message: `${vacantNodes.length} posiciones vacantes detectadas. Priorizar reclutamiento.`
      });
    }

    insights.healthScore = Math.max(0, insights.healthScore);

    return insights;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATS CALCULADOS
  // ───────────────────────────────────────────────────────────────────────────

  _calculateOrgStats(nodes, staff, allRoles) {
    const byLevel = {};
    const byArea = {};

    nodes.forEach(n => {
      // Por nivel
      byLevel[n.level] = (byLevel[n.level] || 0) + 1;

      // Por área
      if (n.area) {
        byArea[n.area] = (byArea[n.area] || 0) + 1;
      }
    });

    return {
      totalNodes: nodes.length,
      totalStaff: staff.length,
      totalRoles: allRoles.length,
      vacancies: nodes.filter(n => n.isVacant).length,
      byLevel,
      byArea,
      avgDirectReports: staff.length > 0 ? (staff.filter(s => s.reports_to_staff_id).length / staff.length).toFixed(2) : 0
    };
  }

  _calculateCompanyOrgStats(nodes, employees, positions) {
    const byLevel = {};
    const byDepartment = {};

    nodes.forEach(n => {
      byLevel[n.level] = (byLevel[n.level] || 0) + 1;

      if (n.department) {
        byDepartment[n.department] = (byDepartment[n.department] || 0) + 1;
      }
    });

    return {
      totalNodes: nodes.length,
      totalEmployees: employees.length,
      totalPositions: positions.length,
      vacancies: nodes.filter(n => n.isVacant).length,
      byLevel,
      byDepartment,
      avgDirectReports: employees.length > 0 ? (employees.filter(e => e.manager_id).length / employees.length).toFixed(2) : 0
    };
  }

  _generateAvatar(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERVIEW / STATS GLOBALES
  // ═══════════════════════════════════════════════════════════════════════════

  async getOverview() {
    console.log('🔍 [BRAIN] Generando overview del ecosistema...');

    const [backend, frontend, commercial, apps] = await Promise.all([
      this.scanBackendFiles(),
      this.scanFrontendFiles(),
      this.getCommercialModules(),
      this.getApplications()
    ]);

    return {
      scannedAt: new Date().toISOString(),
      project: {
        name: 'Sistema de Asistencia Biométrico Aponnt',
        version: '2.0.0-beta',
        architecture: 'Modular Monolith Multi-Tenant'
      },
      stats: {
        backend: {
          totalFiles: backend.totalFiles,
          routes: backend.categories.routes.files.length,
          services: backend.categories.services.files.length,
          models: backend.categories.models.files.length
        },
        frontend: {
          totalFiles: frontend.totalFiles,
          modules: frontend.categories.modules.files.length,
          html: frontend.categories.html.files.length
        },
        modules: {
          commercial: commercial.totalModules,
          core: commercial.stats.core,
          premium: commercial.stats.premium
        },
        applications: {
          total: apps.stats.total,
          production: apps.stats.production
        }
      },
      recentActivity: [
        ...backend.categories.routes.files.slice(0, 3).map(f => ({
          type: 'backend',
          file: f.path,
          modified: f.lastModified
        })),
        ...frontend.categories.modules.files.slice(0, 3).map(f => ({
          type: 'frontend',
          file: f.path,
          modified: f.lastModified
        }))
      ].sort((a, b) => new Date(b.modified) - new Date(a.modified)).slice(0, 5)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  async countLines(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  async extractEndpoints(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const endpoints = [];

      // router.get/post/put/delete/patch
      const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"](\/[^'"]*)['"]/gi;
      let match;
      while ((match = routePattern.exec(content)) !== null) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2]
        });
      }

      return endpoints;
    } catch {
      return [];
    }
  }

  async extractExports(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const exports = [];

      // module.exports = X or exports.X
      const exportPattern = /(?:module\.exports\s*=\s*|exports\.(\w+)\s*=)/g;
      let match;
      while ((match = exportPattern.exec(content)) !== null) {
        if (match[1]) {
          exports.push(match[1]);
        }
      }

      // class X
      const classPattern = /class\s+(\w+)/g;
      while ((match = classPattern.exec(content)) !== null) {
        exports.push(match[1]);
      }

      return [...new Set(exports)];
    } catch {
      return [];
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Cache helpers
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
    console.log('🧹 [BRAIN] Cache limpiado');
  }

  // ═══════════════════════════════════════════════════════════
  // BIDIRECTIONAL FEEDBACK LOOP - Aprender de tests
  // ═══════════════════════════════════════════════════════════

  /**
   * Registrar resultados de tests y descubrimientos
   * Este es el método que SystemRegistry llama para que Brain aprenda
   * MEJORADO: Ahora persiste en BD y actualiza learning patterns
   *
   * @param {string} moduleKey - Clave del módulo testeado
   * @param {object} results - Resultados del test (passed, failed, etc.)
   * @param {object} discoveries - Descubrimientos UX (botones, modales, campos, flujos)
   */
  async recordTestResults(moduleKey, results, discoveries) {
    console.log(`🧠 [BRAIN] Recibiendo feedback de tests de ${moduleKey}...`);

    try {
      console.log(`   📊 Tests: ${results.passed || 0} passed, ${results.failed || 0} failed`);

      // 1. PERSISTIR RESULTADOS EN BD
      if (this.db && this.db.sequelize) {
        await this.persistTestResultsToDB(moduleKey, results);
      }

      // 2. PROCESAR DESCUBRIMIENTOS
      if (discoveries) {
        if (discoveries.buttons && discoveries.buttons.length > 0) {
          console.log(`   🔘 ${discoveries.buttons.length} botones descubiertos`);
          await this.persistDiscoveries(moduleKey, 'button', discoveries.buttons);
        }

        if (discoveries.modals && discoveries.modals.length > 0) {
          console.log(`   🪟 ${discoveries.modals.length} modales descubiertos`);
          await this.persistDiscoveries(moduleKey, 'modal', discoveries.modals);
        }

        if (discoveries.fields && discoveries.fields.length > 0) {
          console.log(`   📝 ${discoveries.fields.length} campos descubiertos`);
          await this.persistDiscoveries(moduleKey, 'field', discoveries.fields);
        }

        if (discoveries.flows && discoveries.flows.length > 0) {
          console.log(`   🔄 ${discoveries.flows.length} flujos testeados`);
          const flowsWorking = discoveries.flows.filter(f => f.worksCorrectly);
          console.log(`      Funcionando: ${flowsWorking.length}/${discoveries.flows.length}`);
          await this.persistDiscoveries(moduleKey, 'flow', discoveries.flows);
        }

        if (discoveries.endpoints && discoveries.endpoints.length > 0) {
          console.log(`   🌐 ${discoveries.endpoints.length} endpoints descubiertos`);
          await this.persistDiscoveries(moduleKey, 'endpoint', discoveries.endpoints);
        }
      }

      // 3. ACTUALIZAR LEARNING PATTERNS EN MEMORIA
      await this.updateLearningPatterns(moduleKey, results);

      // 4. CALCULAR Y ACTUALIZAR MODULE SCORE
      const newScore = this.calculateScoreFromResults(results);
      await this.updateModuleScore(moduleKey, newScore);

      // 5. INVALIDAR CACHE
      this.invalidateCache(`module_${moduleKey}`);
      this.invalidateCache('technical_modules');

      console.log(`✅ [BRAIN] Feedback procesado y persistido correctamente`);

    } catch (error) {
      console.error(`❌ [BRAIN] Error procesando feedback:`, error.message);
    }
  }

  /**
   * Persistir resultados de test en BD
   */
  async persistTestResultsToDB(moduleKey, results) {
    if (!this.db || !this.db.sequelize) return;

    try {
      await this.db.sequelize.query(`
        INSERT INTO test_results (
          module_key, test_timestamp, total_tests, passed, failed,
          coverage, duration_ms, results_json
        ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
        ON CONFLICT (module_key, DATE(test_timestamp))
        DO UPDATE SET
          total_tests = EXCLUDED.total_tests,
          passed = EXCLUDED.passed,
          failed = EXCLUDED.failed,
          coverage = EXCLUDED.coverage,
          duration_ms = EXCLUDED.duration_ms,
          results_json = EXCLUDED.results_json,
          updated_at = NOW()
      `, {
        bind: [
          moduleKey,
          results.total || 0,
          results.passed || 0,
          results.failed || 0,
          results.coverage || 0,
          results.duration || 0,
          JSON.stringify(results)
        ]
      });

      console.log(`   💾 Resultados persistidos en test_results`);
    } catch (error) {
      // Tabla puede no existir aún
      console.log(`   ⚠️ No se pudo persistir test_results:`, error.message);
    }
  }

  /**
   * Persistir descubrimientos en BD
   */
  async persistDiscoveries(moduleKey, discoveryType, items) {
    if (!this.db || !this.db.sequelize || !items || items.length === 0) return;

    try {
      for (const item of items) {
        const discoveryData = item.data || item;
        const context = item.context || 'general';
        const worksCorrectly = item.worksCorrectly !== false;

        await this.db.sequelize.query(`
          INSERT INTO ux_discoveries (
            module_key, discovery_type, discovery_data, context,
            validation_count, works_correctly, validation_status,
            first_seen_at, last_seen_at
          ) VALUES ($1, $2, $3, $4, 1, $5, 'pending', NOW(), NOW())
          ON CONFLICT (module_key, discovery_type, MD5(discovery_data::text))
          DO UPDATE SET
            validation_count = ux_discoveries.validation_count + 1,
            works_correctly = EXCLUDED.works_correctly,
            last_seen_at = NOW(),
            validation_status = CASE
              WHEN ux_discoveries.validation_count >= 2 THEN 'validated'
              ELSE 'pending'
            END
        `, {
          bind: [moduleKey, discoveryType, JSON.stringify(discoveryData), context, worksCorrectly]
        });
      }
    } catch (error) {
      console.log(`   ⚠️ No se pudo persistir discoveries:`, error.message);
    }
  }

  /**
   * Actualizar learning patterns en memoria
   */
  async updateLearningPatterns(moduleKey, results) {
    if (!this.learningPatterns) {
      this.learningPatterns = new Map();
    }

    const existing = this.learningPatterns.get(moduleKey) || {
      testCount: 0,
      totalPassed: 0,
      totalFailed: 0,
      lastScore: 0,
      errorPatterns: new Map(),
      lastTested: null
    };

    existing.testCount++;
    existing.totalPassed += (results.passed || 0);
    existing.totalFailed += (results.failed || 0);
    existing.lastTested = new Date().toISOString();

    // Aprender de errores
    if (results.errors && Array.isArray(results.errors)) {
      for (const error of results.errors) {
        const errorKey = `${error.type || 'unknown'}:${(error.error || error.message || '').substring(0, 50)}`;
        const count = existing.errorPatterns.get(errorKey) || 0;
        existing.errorPatterns.set(errorKey, count + 1);
      }
    }

    this.learningPatterns.set(moduleKey, existing);

    // Persistir en BD si es posible
    await this.persistLearningPatterns(moduleKey, existing);
  }

  /**
   * Persistir learning patterns en BD
   */
  async persistLearningPatterns(moduleKey, patterns) {
    if (!this.db || !this.db.sequelize) return;

    try {
      await this.db.sequelize.query(`
        INSERT INTO learning_patterns (
          module_key, test_count, total_passed, total_failed,
          last_score, patterns_json, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (module_key)
        DO UPDATE SET
          test_count = EXCLUDED.test_count,
          total_passed = EXCLUDED.total_passed,
          total_failed = EXCLUDED.total_failed,
          last_score = EXCLUDED.last_score,
          patterns_json = EXCLUDED.patterns_json,
          updated_at = NOW()
      `, {
        bind: [
          moduleKey,
          patterns.testCount,
          patterns.totalPassed,
          patterns.totalFailed,
          patterns.lastScore || 0,
          JSON.stringify(Object.fromEntries(patterns.errorPatterns || []))
        ]
      });
    } catch (error) {
      // Tabla puede no existir aún
    }
  }

  /**
   * Calcular score desde resultados
   */
  calculateScoreFromResults(results) {
    if (!results || results.total === 0) return 0;
    const passRate = (results.passed || 0) / (results.total || 1);
    const coverageBonus = ((results.coverage || 0) / 100) * 0.2;
    return Math.round((passRate * 0.8 + coverageBonus) * 100);
  }

  /**
   * Actualizar score de un módulo
   */
  async updateModuleScore(moduleKey, score) {
    if (!this.moduleScores) {
      this.moduleScores = new Map();
    }
    this.moduleScores.set(moduleKey, {
      score,
      updatedAt: new Date().toISOString()
    });
    console.log(`   📈 Score de ${moduleKey} actualizado: ${score}`);
  }

  /**
   * Invalidar cache por key
   */
  invalidateCache(key) {
    if (key === 'workflows') {
      // Invalidar todos los caches de workflows
      for (const cacheKey of this.cache.keys()) {
        if (cacheKey.includes('workflow') || cacheKey.includes('technical')) {
          this.cache.delete(cacheKey);
        }
      }
      console.log(`   🔄 Cache de workflows invalidado`);
    } else if (this.cache.has(key)) {
      this.cache.delete(key);
      console.log(`   🔄 Cache de ${key} invalidado`);
    }
  }

  /**
   * Registrar descubrimientos (método helper para integración)
   */
  async recordDiscoveries(moduleKey, discoveries) {
    if (!discoveries) return;

    if (discoveries.buttons) await this.persistDiscoveries(moduleKey, 'button', discoveries.buttons);
    if (discoveries.modals) await this.persistDiscoveries(moduleKey, 'modal', discoveries.modals);
    if (discoveries.fields) await this.persistDiscoveries(moduleKey, 'field', discoveries.fields);
    if (discoveries.flows) await this.persistDiscoveries(moduleKey, 'flow', discoveries.flows);
    if (discoveries.endpoints) await this.persistDiscoveries(moduleKey, 'endpoint', discoveries.endpoints);
  }

  /**
   * Obtener descubrimientos históricos de un módulo
   * Consulta ux_discoveries para conocimiento acumulado
   */
  async getHistoricalDiscoveries(moduleKey) {
    try {
      if (!this.db || !this.db.sequelize) {
        console.warn('⚠️  [BRAIN] Database no disponible para consultar discoveries');
        return null;
      }

      const { QueryTypes } = require('sequelize');

      // Consultar descubrimientos validados (vistos 3+ veces)
      const discoveries = await this.db.sequelize.query(
        `SELECT discovery_type, discovery_data, context, validation_count, works_correctly, last_seen_at
         FROM ux_discoveries
         WHERE module_key = :moduleKey
           AND validation_status = 'validated'
           AND validation_count >= 3
         ORDER BY validation_count DESC, last_seen_at DESC`,
        {
          replacements: { moduleKey },
          type: QueryTypes.SELECT
        }
      );

      // Organizar por tipo
      const organized = {
        buttons: [],
        modals: [],
        fields: [],
        flows: [],
        lastUpdated: null,
        totalDiscoveries: discoveries.length
      };

      discoveries.forEach(d => {
        const parsed = {
          ...d.discovery_data,
          context: d.context,
          validationCount: d.validation_count,
          worksCorrectly: d.works_correctly,
          lastSeen: d.last_seen_at
        };

        if (d.discovery_type === 'button') organized.buttons.push(parsed);
        else if (d.discovery_type === 'modal') organized.modals.push(parsed);
        else if (d.discovery_type === 'field') organized.fields.push(parsed);
        else if (d.discovery_type === 'flow') organized.flows.push(parsed);

        // Track most recent update
        if (!organized.lastUpdated || d.last_seen_at > organized.lastUpdated) {
          organized.lastUpdated = d.last_seen_at;
        }
      });

      console.log(`📚 [BRAIN] Conocimiento histórico de ${moduleKey}:`, {
        buttons: organized.buttons.length,
        modals: organized.modals.length,
        fields: organized.fields.length,
        flows: organized.flows.length,
        lastUpdated: organized.lastUpdated
      });

      return organized;

    } catch (error) {
      console.error(`Error obteniendo descubrimientos históricos:`, error.message);
      return null;
    }
  }

  /**
   * Obtener resultados de tests más recientes de un módulo
   * Útil para ajustar progress scores con data real
   */
  async getLatestTestResults(moduleKey) {
    try {
      if (!this.db || !this.db.sequelize) return null;

      const { QueryTypes } = require('sequelize');

      // Consultar flows testeados (CRUD completeness real)
      const flows = await this.db.sequelize.query(
        `SELECT discovery_data->>'flowType' as flow_type,
                works_correctly,
                validation_count,
                last_seen_at
         FROM ux_discoveries
         WHERE module_key = :moduleKey
           AND discovery_type = 'flow'
           AND validation_count >= 2
         ORDER BY last_seen_at DESC
         LIMIT 10`,
        {
          replacements: { moduleKey },
          type: QueryTypes.SELECT
        }
      );

      // Organizar por tipo de flow
      const results = {
        crud: {
          create: { tested: false, passed: false },
          read: { tested: false, passed: false },
          update: { tested: false, passed: false },
          delete: { tested: false, passed: false }
        },
        lastTested: null,
        testCount: 0
      };

      flows.forEach(f => {
        const flowType = f.flow_type;
        if (results.crud[flowType]) {
          results.crud[flowType].tested = true;
          results.crud[flowType].passed = f.works_correctly;
          results.testCount++;

          if (!results.lastTested || f.last_seen_at > results.lastTested) {
            results.lastTested = f.last_seen_at;
          }
        }
      });

      return results;

    } catch (error) {
      console.error(`Error obteniendo test results:`, error.message);
      return null;
    }
  }

  /**
   * Calcular progress score REAL basado en código + tests
   * Combina análisis estático con resultados de tests reales
   */
  async calculateRealProgress(module) {
    try {
      // 1. Score base del código (análisis estático)
      let score = this.calculateModuleProgress(module);  // Método existente

      // 2. Ajustar con resultados de tests reales
      const testResults = await this.getLatestTestResults(module.key);
      if (testResults && testResults.testCount > 0) {
        console.log(`📊 [BRAIN] Ajustando score de ${module.key} con ${testResults.testCount} tests reales`);

        // Bonificación por flows que funcionan
        if (testResults.crud.create.tested && testResults.crud.create.passed) score += 5;
        if (testResults.crud.read.tested && testResults.crud.read.passed) score += 5;
        if (testResults.crud.update.tested && testResults.crud.update.passed) score += 5;
        if (testResults.crud.delete.tested && testResults.crud.delete.passed) score += 5;

        // Penalización por flows que fallan
        if (testResults.crud.create.tested && !testResults.crud.create.passed) score -= 10;
        if (testResults.crud.update.tested && !testResults.crud.update.passed) score -= 10;
        if (testResults.crud.delete.tested && !testResults.crud.delete.passed) score -= 10;
      }

      return Math.min(100, Math.max(0, score));

    } catch (error) {
      console.error(`Error calculando real progress:`, error.message);
      return this.calculateModuleProgress(module);  // Fallback al método original
    }
  }

  /**
   * ============================================================================
   * LIVE METADATA GENERATION - 100% Introspectivo, 0% Hardcoded
   * ============================================================================
   */

  /**
   * Detectar dependencies desde código real (requires/imports)
   * @param {string} filePath - Ruta al archivo
   * @returns {object} - { required: [], optional: [], providesTo: [] }
   */
  async detectDependenciesFromCode(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const dependencies = { required: [], optional: [], providesTo: [] };

      // Detectar requires/imports
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;

      let match;
      while ((match = requireRegex.exec(content)) !== null) {
        const dep = match[1];
        // Solo módulos internos (./...), ignorar node_modules
        if (dep.startsWith('./') || dep.startsWith('../')) {
          const moduleName = path.basename(dep, path.extname(dep));
          if (!dependencies.required.includes(moduleName)) {
            dependencies.required.push(moduleName);
          }
        }
      }

      while ((match = importRegex.exec(content)) !== null) {
        const dep = match[1];
        if (dep.startsWith('./') || dep.startsWith('../')) {
          const moduleName = path.basename(dep, path.extname(dep));
          if (!dependencies.required.includes(moduleName)) {
            dependencies.required.push(moduleName);
          }
        }
      }

      // Detectar optional dependencies (try/catch requires)
      const tryRequireRegex = /try\s*{[^}]*require\(['"]([^'"]+)['"]\)/g;
      while ((match = tryRequireRegex.exec(content)) !== null) {
        const dep = match[1];
        if ((dep.startsWith('./') || dep.startsWith('../'))) {
          const moduleName = path.basename(dep, path.extname(dep));
          if (!dependencies.optional.includes(moduleName)) {
            dependencies.optional.push(moduleName);
          }
        }
      }

      return dependencies;
    } catch (error) {
      console.error(`Error detectando dependencies en ${filePath}:`, error.message);
      return { required: [], optional: [], providesTo: [] };
    }
  }

  /**
   * Detectar API endpoints desde archivos de routes
   * @param {string} moduleName - Nombre del módulo
   * @returns {array} - Lista de endpoints
   */
  async detectAPIEndpoints(moduleName) {
    const endpoints = [];

    try {
      // Buscar archivo de rutas del módulo
      const routesDir = path.join(this.baseDir, 'src', 'routes');
      const possibleFiles = [
        `${moduleName}Routes.js`,
        `${moduleName}-routes.js`,
        `${moduleName}.js`
      ];

      for (const file of possibleFiles) {
        const routePath = path.join(routesDir, file);
        if (fsSync.existsSync(routePath)) {
          const content = await fs.readFile(routePath, 'utf8');

          // Detectar rutas: router.get/post/put/delete/patch('path', ...)
          const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
          let match;

          while ((match = routeRegex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const route = match[2];

            endpoints.push({
              method,
              path: `/api/${moduleName}${route}`,
              file: path.basename(routePath)
            });
          }

          break;  // Encontrado archivo de rutas
        }
      }

      return endpoints;
    } catch (error) {
      console.error(`Error detectando endpoints para ${moduleName}:`, error.message);
      return [];
    }
  }

  /**
   * Detectar tablas de BD desde modelos Sequelize
   * @param {string} moduleName - Nombre del módulo
   * @returns {array} - Lista de tablas
   */
  async detectDatabaseTables(moduleName) {
    const tables = [];

    try {
      const modelsDir = path.join(this.baseDir, 'src', 'models');

      // Buscar archivos de modelo relacionados
      const files = this.scanDirectory(modelsDir, '.js', false);

      for (const file of files) {
        const fileName = path.basename(file, '.js');
        const lowerFileName = fileName.toLowerCase();
        const lowerModuleName = moduleName.toLowerCase();

        // Verificar si el archivo de modelo pertenece a este módulo
        if (lowerFileName.includes(lowerModuleName) ||
            lowerModuleName.includes(lowerFileName.replace(/model$/i, ''))) {

          const content = await fs.readFile(file, 'utf8');

          // Detectar tableName: 'nombre' o tableName: "nombre"
          const tableNameRegex = /tableName:\s*['"]([^'"]+)['"]/;
          const match = content.match(tableNameRegex);

          if (match) {
            tables.push({
              table: match[1],
              model: fileName,
              file: path.basename(file)
            });
          } else {
            // Si no hay tableName explícito, usar nombre del modelo en plural
            const inferredTable = fileName.toLowerCase().replace(/model$/i, '') + 's';
            tables.push({
              table: inferredTable,
              model: fileName,
              file: path.basename(file),
              inferred: true
            });
          }
        }
      }

      return tables;
    } catch (error) {
      console.error(`Error detectando tablas para ${moduleName}:`, error.message);
      return [];
    }
  }

  /**
   * Generar metadata VIVA para un módulo específico
   * Escanea código real, tests UX, BD - NADA hardcodeado
   * @param {string} moduleName - Nombre del módulo
   * @returns {object} - Metadata completa generada en vivo
   */
  async generateLiveModuleMetadata(moduleName) {
    console.log(`\n🔍 [BRAIN] Generando metadata VIVA para "${moduleName}"...`);

    try {
      const metadata = {
        name: moduleName,
        generatedAt: new Date().toISOString(),
        source: 'live-introspection',

        // Auto-detectar archivos backend
        files: {
          backend: [],
          frontend: []
        },

        // Auto-detectar dependencies
        dependencies: {
          required: [],
          optional: [],
          integrates_with: [],
          provides_to: []
        },

        // Auto-detectar API endpoints
        apiEndpoints: [],

        // Auto-detectar tablas BD
        databaseTables: [],

        // Progress desde tests UX reales
        progress: 0,
        uxTestResults: null,

        // Metadata de código
        linesOfCode: 0,
        lastModified: null,
        complexity: 'unknown'
      };

      // 1. ESCANEAR ARCHIVOS BACKEND
      const backendFiles = this.scanDirectory(path.join(this.baseDir, 'src'), '.js');
      metadata.files.backend = backendFiles
        .filter(f => {
          const fileName = path.basename(f).toLowerCase();
          return fileName.includes(moduleName.toLowerCase());
        })
        .map(f => path.relative(this.baseDir, f));

      // 2. ESCANEAR ARCHIVOS FRONTEND
      const frontendFiles = this.scanDirectory(path.join(this.baseDir, '../public/js/modules'), '.js', false);
      metadata.files.frontend = frontendFiles
        .filter(f => {
          const fileName = path.basename(f).toLowerCase();
          return fileName.includes(moduleName.toLowerCase());
        })
        .map(f => path.relative(path.join(this.baseDir, '..'), f));

      // 3. DETECTAR DEPENDENCIES DESDE CÓDIGO
      if (metadata.files.backend.length > 0) {
        const mainFile = path.join(this.baseDir, metadata.files.backend[0]);
        const deps = await this.detectDependenciesFromCode(mainFile);
        metadata.dependencies.required = deps.required;
        metadata.dependencies.optional = deps.optional;
      }

      // 4. DETECTAR API ENDPOINTS
      metadata.apiEndpoints = await this.detectAPIEndpoints(moduleName);

      // 5. DETECTAR TABLAS BD
      metadata.databaseTables = await this.detectDatabaseTables(moduleName);

      // 6. PROGRESS DESDE UX DISCOVERIES (tests reales)
      const uxResults = await this.getLatestTestResults(moduleName);
      if (uxResults && uxResults.testCount > 0) {
        metadata.uxTestResults = uxResults;

        // Calcular progress basado en CRUD completeness real
        let crudScore = 0;
        const crud = uxResults.crud;
        if (crud.create.tested && crud.create.passed) crudScore += 25;
        if (crud.read.tested && crud.read.passed) crudScore += 25;
        if (crud.update.tested && crud.update.passed) crudScore += 25;
        if (crud.delete.tested && crud.delete.passed) crudScore += 25;

        metadata.progress = crudScore;
      } else {
        // Fallback: análisis estático de archivos
        const hasBackend = metadata.files.backend.length > 0;
        const hasFrontend = metadata.files.frontend.length > 0;
        const hasAPI = metadata.apiEndpoints.length > 0;
        const hasDB = metadata.databaseTables.length > 0;

        let staticProgress = 0;
        if (hasBackend) staticProgress += 25;
        if (hasFrontend) staticProgress += 25;
        if (hasAPI) staticProgress += 25;
        if (hasDB) staticProgress += 25;

        metadata.progress = staticProgress;
      }

      // 7. LINES OF CODE (sumar todos los archivos)
      let totalLines = 0;
      let latestMod = null;

      for (const file of metadata.files.backend) {
        const filePath = path.join(this.baseDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          totalLines += content.split('\n').length;

          const stats = await fs.stat(filePath);
          if (!latestMod || stats.mtime > latestMod) {
            latestMod = stats.mtime;
          }
        } catch (err) {
          // Ignorar archivos que no se puedan leer
        }
      }

      metadata.linesOfCode = totalLines;
      metadata.lastModified = latestMod ? latestMod.toISOString() : null;

      // 8. COMPLEJIDAD (basada en LOC y dependencies)
      if (totalLines < 200 && metadata.dependencies.required.length < 3) {
        metadata.complexity = 'simple';
      } else if (totalLines < 500 && metadata.dependencies.required.length < 7) {
        metadata.complexity = 'moderate';
      } else {
        metadata.complexity = 'complex';
      }

      console.log(`✅ [BRAIN] Metadata viva generada: ${metadata.progress}% complete, ${totalLines} LOC`);

      return metadata;

    } catch (error) {
      console.error(`❌ [BRAIN] Error generando metadata para ${moduleName}:`, error.message);
      return null;
    }
  }

  /**
   * Generar TODA la metadata de ingeniería en vivo
   * Escanea TODOS los módulos del sistema
   * @returns {object} - Engineering metadata completa 100% viva
   */
  async generateFullEngineeringMetadata() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  GENERANDO ENGINEERING METADATA 100% VIVA            ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    const fullMetadata = {
      generatedAt: new Date().toISOString(),
      source: 'live-introspection',
      generator: 'EcosystemBrainService',
      version: '2.0.0-live',
      modules: {}
    };

    try {
      // Auto-detectar módulos desde archivos routes
      const routesDir = path.join(this.baseDir, 'src', 'routes');
      const routeFiles = this.scanDirectory(routesDir, '.js', false);

      const moduleNames = new Set();

      for (const routeFile of routeFiles) {
        let moduleName = path.basename(routeFile, '.js');

        // Limpiar nombres: usersRoutes → users, user-routes → user
        moduleName = moduleName
          .replace(/Routes?$/i, '')
          .replace(/-routes?$/i, '');

        if (moduleName && moduleName !== 'index') {
          moduleNames.add(moduleName);
        }
      }

      console.log(`📋 [BRAIN] ${moduleNames.size} módulos detectados automáticamente\n`);

      // Generar metadata para cada módulo
      let count = 0;
      for (const moduleName of Array.from(moduleNames)) {
        count++;
        console.log(`[${count}/${moduleNames.size}] Procesando ${moduleName}...`);

        const moduleMetadata = await this.generateLiveModuleMetadata(moduleName);
        if (moduleMetadata) {
          fullMetadata.modules[moduleName] = moduleMetadata;
        }
      }

      // Calcular estadísticas globales
      const stats = {
        totalModules: Object.keys(fullMetadata.modules).length,
        averageProgress: 0,
        totalLinesOfCode: 0,
        totalEndpoints: 0,
        totalTables: 0,
        modulesByComplexity: { simple: 0, moderate: 0, complex: 0 }
      };

      for (const [name, mod] of Object.entries(fullMetadata.modules)) {
        stats.averageProgress += mod.progress;
        stats.totalLinesOfCode += mod.linesOfCode;
        stats.totalEndpoints += mod.apiEndpoints.length;
        stats.totalTables += mod.databaseTables.length;
        stats.modulesByComplexity[mod.complexity]++;
      }

      stats.averageProgress = Math.round(stats.averageProgress / stats.totalModules);

      fullMetadata.stats = stats;

      console.log('\n╔══════════════════════════════════════════════════════╗');
      console.log('║  METADATA VIVA GENERADA CON ÉXITO                    ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║  Módulos: ${stats.totalModules}`);
      console.log(`║  Progress promedio: ${stats.averageProgress}%`);
      console.log(`║  Total LOC: ${stats.totalLinesOfCode.toLocaleString()}`);
      console.log(`║  Total endpoints: ${stats.totalEndpoints}`);
      console.log(`║  Total tablas: ${stats.totalTables}`);
      console.log('╚══════════════════════════════════════════════════════╝\n');

      return fullMetadata;

    } catch (error) {
      console.error('❌ [BRAIN] Error generando full metadata:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW AUTO-REGENERATION - Sincroniza STAGES con código fuente real
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Regenera workflows derivados si hay cambios en código fuente
   *
   * ESTO HACE QUE EL WORKFLOW SEA VERDADERAMENTE INTROSPECTIVO:
   * - Cuando cambias LateArrivalAuthorizationService.js
   * - Este método regenera AttendanceWorkflowService.js
   * - Los STAGES se actualizan automáticamente
   * - Brain detecta el cambio via LIVE_CODE_SCAN
   */
  async regenerateDerivedWorkflows() {
    try {
      // Intentar usar el Universal primero (para TODOS los módulos)
      let generator;
      let result;

      try {
        const UniversalWorkflowGenerator = require('./UniversalWorkflowGenerator');
        generator = new UniversalWorkflowGenerator();

        // Regenerar solo los que cambiaron
        result = await generator.regenerateChangedWorkflows();

        if (result.regenerated && result.regenerated.length > 0) {
          console.log(`   🔄 [BRAIN] Workflows regenerados: ${result.regenerated.join(', ')}`);
        }

        return result;
      } catch (universalError) {
        // Fallback al generador legacy para solo attendance
        console.log(`   ⚠️ UniversalWorkflowGenerator no disponible, usando legacy`);

        const WorkflowAutoGenerator = require('./WorkflowAutoGenerator');
        generator = new WorkflowAutoGenerator();

        result = await generator.regenerateIfChanged();

        if (result.regenerated) {
          console.log(`   🔄 [BRAIN] Workflow regenerado (legacy): ${result.stagesCount} stages`);
        }

        return result;
      }
    } catch (error) {
      console.log(`   ⚠️ [BRAIN] Auto-regeneration skipped: ${error.message}`);
      return { regenerated: false, reason: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INTEGRATION METHODS - Para BrainPhase4Integration
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtener información de un módulo específico
   * Usado por BrainPhase4Integration para crear planes de test
   */
  async getModuleInfo(moduleKey) {
    console.log(`🔍 [BRAIN] Obteniendo info de módulo: ${moduleKey}`);

    try {
      // Obtener módulos técnicos
      const technicalModules = await this.getTechnicalModules();
      const module = technicalModules.modules?.find(m =>
        m.key === moduleKey || m.key.toLowerCase() === moduleKey.toLowerCase()
      );

      if (!module) {
        // Intentar buscar en el registry
        const registryPath = path.join(this.baseDir, 'src/auditor/registry/modules-registry.json');
        if (fsSync.existsSync(registryPath)) {
          const registry = JSON.parse(fsSync.readFileSync(registryPath, 'utf8'));
          const registryModule = registry.modules?.find(m =>
            m.key === moduleKey || m.moduleKey === moduleKey
          );

          if (registryModule) {
            return {
              key: moduleKey,
              name: registryModule.name,
              category: registryModule.category,
              endpoints: registryModule.api_endpoints || [],
              tables: registryModule.database?.tables || [],
              dependencies: registryModule.dependencies || {},
              businessFlows: registryModule.businessFlows || [],
              source: 'registry'
            };
          }
        }

        return null;
      }

      return {
        key: module.key,
        name: module.name,
        status: module.status,
        progress: module.progress,
        endpoints: module.endpoints || [],
        files: module.files,
        stats: module.stats,
        completeness: module.completeness,
        crudAnalysis: module.crudAnalysis,
        source: 'live_scan'
      };
    } catch (error) {
      console.error(`❌ [BRAIN] Error obteniendo info de ${moduleKey}:`, error.message);
      return null;
    }
  }

  /**
   * Callback cuando un workflow es actualizado (desde FileWatcher)
   */
  async onWorkflowUpdated(moduleKey, result) {
    console.log(`📢 [BRAIN] Notificado de actualización de workflow: ${moduleKey}`);

    // Invalidar caches relacionados
    this.invalidateCache('workflows');
    this.invalidateCache(`module_${moduleKey}`);
    this.invalidateCache('technical_modules');

    // Actualizar tutoriales si el módulo tiene workflow con stages
    if (result && result.stagesCount > 0) {
      await this.updateTutorialForModule(moduleKey, result);
    }

    // Emitir evento para listeners externos
    if (this.onWorkflowChangedCallback) {
      this.onWorkflowChangedCallback(moduleKey, result);
    }

    return { processed: true, moduleKey };
  }

  /**
   * Callback cuando todos los workflows son regenerados
   */
  async onWorkflowsRegenerated(data) {
    console.log(`📢 [BRAIN] Notificado de regeneración completa de workflows`);

    // Invalidar todos los caches
    this.invalidateCache('workflows');
    this.invalidateCache('technical_modules');
    this.cache.clear();

    // Actualizar estadísticas
    if (data && data.totalModules) {
      console.log(`   → ${data.totalModules} módulos, ${data.totalStages} stages totales`);
    }

    return { processed: true, timestamp: new Date().toISOString() };
  }

  /**
   * Actualizar tutorial para un módulo
   */
  async updateTutorialForModule(moduleKey, workflowResult) {
    try {
      const stages = workflowResult.stages || [];
      if (stages.length === 0) return;

      const tutorialSteps = stages
        .filter(s => !s.is_final)
        .map((stage, index) => ({
          step: index + 1,
          title: stage.name,
          description: stage.description || `Paso ${index + 1} del proceso`,
          category: stage.category,
          validations: stage.validations || [],
          transitions: stage.transitions_to || []
        }));

      // Guardar en memoria
      if (!this.moduleTutorials) {
        this.moduleTutorials = new Map();
      }

      this.moduleTutorials.set(moduleKey, {
        moduleKey,
        workflowName: workflowResult.workflowName || moduleKey,
        stagesCount: workflowResult.stagesCount,
        steps: tutorialSteps,
        generatedAt: new Date().toISOString(),
        version: workflowResult.version || '1.0.0'
      });

      console.log(`   📚 Tutorial actualizado para ${moduleKey}: ${tutorialSteps.length} pasos`);

    } catch (error) {
      console.error(`   ⚠️ Error actualizando tutorial:`, error.message);
    }
  }

  /**
   * Obtener tutorial de un módulo
   */
  getTutorial(moduleKey) {
    if (!this.moduleTutorials) return null;
    return this.moduleTutorials.get(moduleKey);
  }

  /**
   * Obtener todos los tutoriales disponibles
   */
  getAllTutorials() {
    if (!this.moduleTutorials) return [];
    return Array.from(this.moduleTutorials.values());
  }

  /**
   * Registrar callback para cambios de workflow
   */
  onWorkflowChanged(callback) {
    this.onWorkflowChangedCallback = callback;
  }

  /**
   * Obtener score de un módulo
   */
  getModuleScore(moduleKey) {
    if (!this.moduleScores) return null;
    return this.moduleScores.get(moduleKey);
  }

  /**
   * Obtener learning patterns de un módulo
   */
  getLearningPatterns(moduleKey) {
    if (!this.learningPatterns) return null;
    if (moduleKey) {
      return this.learningPatterns.get(moduleKey);
    }
    return Object.fromEntries(this.learningPatterns);
  }

  /**
   * ============================================================================
   * ⭐ NUEVO: DETECCIÓN DE PIEZAS SUELTAS (LOOSE PIECES)
   * ============================================================================
   *
   * Detecta archivos y módulos que existen pero NO están conectados/registrados:
   * - Routes sin modelo
   * - Servicios sin routes
   * - Frontends sin backend
   * - Archivos sin referencias
   * - Código muerto
   */
  async detectLoosePieces() {
    console.log('\n🔍 [BRAIN] Detectando piezas sueltas en el código...');

    const loosePieces = {
      timestamp: new Date().toISOString(),
      summary: {
        totalLoosePieces: 0,
        byCategory: {}
      },
      categories: {
        routesWithoutModel: [],
        servicesWithoutRoutes: [],
        frontendsWithoutBackend: [],
        unreferencedFiles: [],
        orphanedModules: []
      }
    };

    try {
      // 1. Escanear rutas y modelos
      const routesFiles = this.scanDirectory(path.join(this.baseDir, 'src/routes'), '.js');
      const modelsFiles = this.scanDirectory(path.join(this.baseDir, 'src/models'), '.js');

      // Extraer nombres de modelos
      const modelNames = modelsFiles.map(f => {
        const basename = path.basename(f, '.js');
        return basename.toLowerCase();
      });

      console.log(`   📂 Routes escaneados: ${routesFiles.length}`);
      console.log(`   📂 Modelos encontrados: ${modelNames.length}`);

      // Detectar routes sin modelo asociado
      for (const routeFile of routesFiles) {
        try {
          const routeName = path.basename(routeFile, '.js')
            .replace('Routes', '')
            .replace('routes', '')
            .toLowerCase();

          // Skip archivos especiales
          if (routeName === 'index' || routeName.includes('test')) continue;

          // Buscar modelo correspondiente
          const hasModel = modelNames.some(m =>
            m === routeName ||
            m === routeName + 's' ||
            m === routeName.slice(0, -1) // singular
          );

          if (!hasModel) {
            // Leer archivo para verificar si usa sequelize
            const content = fsSync.readFileSync(routeFile, 'utf8');
            if (content.includes('sequelize') || content.includes('db.')) {
              loosePieces.categories.routesWithoutModel.push({
                file: path.relative(this.baseDir, routeFile),
                routeName,
                severity: 'medium',
                suggestion: `Considerar crear modelo ${routeName}.js en src/models/`
              });
            }
          }
        } catch (e) {
          // Ignorar errores de lectura
        }
      }

      // 2. Detectar servicios sin routes
      const servicesFiles = this.scanDirectory(path.join(this.baseDir, 'src/services'), '.js');

      console.log(`   📂 Servicios escaneados: ${servicesFiles.length}`);

      for (const serviceFile of servicesFiles) {
        try {
          const serviceName = path.basename(serviceFile, '.js')
            .replace('Service', '')
            .replace('service', '')
            .toLowerCase();

          // Skip archivos especiales
          if (serviceName.includes('brain') || serviceName.includes('test')) continue;

          // Buscar route correspondiente
          const hasRoute = routesFiles.some(r => {
            const routeName = path.basename(r, '.js').toLowerCase();
            return routeName.includes(serviceName);
          });

          if (!hasRoute) {
            // Verificar si el servicio está siendo usado
            let isReferenced = false;
            for (const routeFile of routesFiles) {
              const content = fsSync.readFileSync(routeFile, 'utf8');
              if (content.includes(path.basename(serviceFile))) {
                isReferenced = true;
                break;
              }
            }

            if (!isReferenced) {
              loosePieces.categories.servicesWithoutRoutes.push({
                file: path.relative(this.baseDir, serviceFile),
                serviceName,
                severity: 'low',
                suggestion: `Servicio no referenciado - considerar eliminar o crear route ${serviceName}Routes.js`
              });
            }
          }
        } catch (e) {
          // Ignorar errores
        }
      }

      // 3. Detectar frontends sin backend
      const frontendModules = this.scanDirectory(path.join(this.baseDir, 'public/js/modules'), '.js');

      console.log(`   📂 Módulos frontend escaneados: ${frontendModules.length}`);

      for (const frontendFile of frontendModules) {
        try {
          const moduleName = path.basename(frontendFile, '.js')
            .replace('-dashboard', '')
            .replace('dashboard', '')
            .toLowerCase();

          // Leer contenido del frontend
          const content = fsSync.readFileSync(frontendFile, 'utf8');

          // Buscar fetch API calls
          const fetchRegex = /fetch\(['"`]([^'"`]+)['")`]/g;
          const apiCalls = [];
          let match;

          while ((match = fetchRegex.exec(content)) !== null) {
            apiCalls.push(match[1]);
          }

          if (apiCalls.length > 0) {
            // Verificar si todos los endpoints existen
            for (const apiCall of apiCalls.slice(0, 10)) { // Limitar a 10
              // Extraer endpoint base (sin query params)
              const endpoint = apiCall.split('?')[0];

              // Buscar en routes files
              let found = false;
              for (const routeFile of routesFiles) {
                const routeContent = fsSync.readFileSync(routeFile, 'utf8');
                if (routeContent.includes(endpoint)) {
                  found = true;
                  break;
                }
              }

              if (!found && endpoint.startsWith('/api/')) {
                loosePieces.categories.frontendsWithoutBackend.push({
                  file: path.relative(this.baseDir, frontendFile),
                  endpoint,
                  severity: 'high',
                  suggestion: `Endpoint ${endpoint} llamado desde frontend pero no encontrado en backend`
                });
              }
            }
          }
        } catch (e) {
          // Ignorar errores
        }
      }

      // 4. Calcular totales
      loosePieces.summary.totalLoosePieces =
        loosePieces.categories.routesWithoutModel.length +
        loosePieces.categories.servicesWithoutRoutes.length +
        loosePieces.categories.frontendsWithoutBackend.length;

      loosePieces.summary.byCategory = {
        routesWithoutModel: loosePieces.categories.routesWithoutModel.length,
        servicesWithoutRoutes: loosePieces.categories.servicesWithoutRoutes.length,
        frontendsWithoutBackend: loosePieces.categories.frontendsWithoutBackend.length
      };

      console.log(`\n✅ [BRAIN] Detección completada:`);
      console.log(`   Total piezas sueltas: ${loosePieces.summary.totalLoosePieces}`);
      console.log(`   - Routes sin modelo: ${loosePieces.summary.byCategory.routesWithoutModel}`);
      console.log(`   - Servicios sin routes: ${loosePieces.summary.byCategory.servicesWithoutRoutes}`);
      console.log(`   - Frontends sin backend: ${loosePieces.summary.byCategory.frontendsWithoutBackend}`);

      return loosePieces;

    } catch (error) {
      console.error('❌ [BRAIN] Error detectando piezas sueltas:', error);
      return {
        error: true,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * ============================================================================
   * ESCANEO DE BASE DE DATOS - Schema Vivo desde Sequelize
   * ============================================================================
   * Escanea los modelos Sequelize para generar schema de BD en tiempo real.
   * Para cada campo, detecta qué módulos/procesos del código lo usan.
   */
  async getDatabaseSchema() {
    console.log('\n🗄️ [BRAIN] Generando Database Schema desde Sequelize...');

    try {
      const schema = {};
      const modificationRules = [
        '⚠️ Antes de modificar un campo, revisar qué módulos lo usan',
        '🔍 Si un campo dice CRÍTICO (>10 módulos), NO eliminarlo sin migración',
        '📝 Si un campo dice CUIDADO (5-10 módulos), planificar cambios',
        '✅ Si un campo dice SEGURO (<5 módulos), cambios más seguros'
      ];

      // Si no tenemos acceso a modelos, retornar vacío
      if (!this.db || !this.db.sequelize || !this.db.sequelize.models) {
        console.log('   ⚠️ No hay modelos Sequelize disponibles');
        return {
          schema: {},
          modificationRules,
          scannedAt: new Date().toISOString(),
          source: 'NO_MODELS'
        };
      }

      const models = this.db.sequelize.models;
      console.log(`   Escaneando ${Object.keys(models).length} modelos Sequelize...`);

      // Por cada modelo de Sequelize
      for (const [modelName, model] of Object.entries(models)) {
        const tableName = model.tableName || modelName;
        const attributes = model.rawAttributes || model.fieldRawAttributesMap || {};

        console.log(`   📋 Escaneando tabla: ${tableName} (${Object.keys(attributes).length} campos)`);

        const fields = [];

        // Por cada campo del modelo
        for (const [fieldName, fieldDef] of Object.entries(attributes)) {
          // Detectar tipo de dato
          let type = 'UNKNOWN';
          if (fieldDef.type) {
            type = fieldDef.type.constructor?.name || fieldDef.type.toString();
            // Simplificar nombres largos de Sequelize
            type = type.replace('DataTypes.', '').replace('Sequelize.', '');
          }

          // Detectar si es nullable
          const nullable = fieldDef.allowNull !== false;

          // Detectar qué módulos usan este campo
          const usedBy = await this.detectFieldUsage(tableName, fieldName);

          fields.push({
            name: fieldName,
            type,
            nullable,
            usedBy,
            primaryKey: fieldDef.primaryKey || false,
            autoIncrement: fieldDef.autoIncrement || false,
            defaultValue: fieldDef.defaultValue !== undefined ? String(fieldDef.defaultValue) : null
          });
        }

        schema[tableName] = {
          model: modelName,
          fields,
          totalFields: fields.length
        };
      }

      console.log(`\n✅ [BRAIN] Database Schema generado:`);
      console.log(`   Tablas: ${Object.keys(schema).length}`);
      console.log(`   Campos totales: ${Object.values(schema).reduce((sum, t) => sum + t.fields.length, 0)}`);

      return {
        schema,
        modificationRules,
        scannedAt: new Date().toISOString(),
        source: 'LIVE_SEQUELIZE',
        stats: {
          totalTables: Object.keys(schema).length,
          totalFields: Object.values(schema).reduce((sum, t) => sum + t.fields.length, 0)
        }
      };

    } catch (error) {
      console.error('❌ [BRAIN] Error generando Database Schema:', error);
      return {
        error: true,
        message: error.message,
        schema: {},
        modificationRules: [],
        scannedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Detectar en qué módulos/archivos se usa un campo específico de una tabla
   * Escanea código buscando referencias a tableName.fieldName o fieldName
   */
  async detectFieldUsage(tableName, fieldName) {
    const usedBy = [];
    const searchPatterns = [
      new RegExp(`['"\`]${fieldName}['"\`]`, 'g'), // "fieldName" en queries
      new RegExp(`\\.${fieldName}\\b`, 'g'),       // .fieldName
      new RegExp(`${tableName}\\.${fieldName}`, 'g') // tableName.fieldName
    ];

    try {
      // Escanear archivos backend
      const backendFiles = [
        ...this.scanDirectory(path.join(this.baseDir, 'src/routes'), '.js', true),
        ...this.scanDirectory(path.join(this.baseDir, 'src/services'), '.js', true),
        ...this.scanDirectory(path.join(this.baseDir, 'src/controllers'), '.js', true)
      ];

      for (const file of backendFiles) {
        try {
          const content = fsSync.readFileSync(file, 'utf8');

          // Verificar si algún pattern coincide
          const hasMatch = searchPatterns.some(pattern => pattern.test(content));

          if (hasMatch) {
            const moduleName = path.basename(file, '.js');
            if (!usedBy.includes(moduleName)) {
              usedBy.push(moduleName);
            }
          }
        } catch (err) {
          // Ignorar errores de lectura de archivos individuales
        }
      }

      // Escanear archivos frontend (JS modules)
      const frontendFiles = this.scanDirectory(path.join(this.baseDir, 'public/js/modules'), '.js', true);

      for (const file of frontendFiles) {
        try {
          const content = fsSync.readFileSync(file, 'utf8');

          const hasMatch = searchPatterns.some(pattern => pattern.test(content));

          if (hasMatch) {
            const moduleName = path.basename(file, '.js');
            if (!usedBy.includes(moduleName)) {
              usedBy.push(moduleName);
            }
          }
        } catch (err) {
          // Ignorar errores
        }
      }

    } catch (error) {
      console.error(`   ⚠️ Error detectando uso de ${tableName}.${fieldName}:`, error.message);
    }

    return usedBy;
  }

  /**
   * ============================================================================
   * INTEGRACIÓN CON PHASE4 SMART E2E TESTING
   * ============================================================================
   * Métodos para que Phase4TestOrchestrator pueda consultar al Brain
   * y hacer testing inteligente basado en módulos contratados.
   */

  /**
   * Obtener módulos activos para una empresa
   * @param {number} companyId - ID de la empresa
   * @returns {Promise<Array>} Lista de módulos activos con metadata
   */
  async getActiveModulesForCompany(companyId) {
    console.log(`\n🔍 [BRAIN] Consultando módulos activos para empresa ${companyId}...`);

    try {
      if (!this.db || !this.db.CompanyModule) {
        console.log('   ⚠️ No hay acceso a CompanyModule model');
        return [];
      }

      const { CompanyModule } = this.db;

      const activeModules = await CompanyModule.findAll({
        where: {
          company_id: companyId,
          is_active: true
        },
        raw: true
      });

      console.log(`   ✅ Encontrados ${activeModules.length} módulos activos`);

      return activeModules.map(m => ({
        module_key: m.module_key,
        module_name: m.module_name,
        category: m.category || 'general'
      }));

    } catch (error) {
      console.error('❌ [BRAIN] Error consultando módulos activos:', error.message);
      return [];
    }
  }

  /**
   * Obtener elementos UI esperados para un módulo
   * Escanea archivos HTML/JS buscando elementos con data-module="moduleKey"
   * @param {string} moduleKey - Clave del módulo (ej: 'users', 'vacations')
   * @returns {Promise<Array>} Lista de elementos UI esperados
   */
  async getModuleUIElements(moduleKey) {
    console.log(`\n🔍 [BRAIN] Escaneando elementos UI para módulo "${moduleKey}"...`);

    const elements = [];

    try {
      // Escanear archivos HTML
      const htmlFiles = this.scanDirectory(
        path.join(this.baseDir, 'public'),
        '.html',
        true
      );

      for (const file of htmlFiles) {
        try {
          const content = fsSync.readFileSync(file, 'utf8');

          // Regex para encontrar elementos con data-module
          const patterns = [
            // Botones: <button ... data-module="X" ...>
            {
              regex: /<button([^>]*)data-module=["']([^"']+)["']([^>]*)>/gi,
              type: 'button'
            },
            // Inputs: <input ... data-module="X" ...>
            {
              regex: /<input([^>]*)data-module=["']([^"']+)["']([^>]*)>/gi,
              type: 'input'
            },
            // Divs con data-module (contenedores de módulos)
            {
              regex: /<div([^>]*)data-module=["']([^"']+)["']([^>]*)>/gi,
              type: 'container'
            }
          ];

          for (const { regex, type } of patterns) {
            let match;
            while ((match = regex.exec(content)) !== null) {
              const fullMatch = match[0];
              const dataModuleValue = match[2];

              if (dataModuleValue === moduleKey) {
                // Extraer atributos importantes
                const idMatch = fullMatch.match(/id=["']([^"']+)["']/);
                const classMatch = fullMatch.match(/class=["']([^"']+)["']/);

                // Para botones, intentar extraer el texto
                let text = null;
                if (type === 'button') {
                  const textMatch = content.substring(match.index).match(/>([^<]+)</);
                  text = textMatch ? textMatch[1].trim() : null;
                }

                // Para inputs, extraer placeholder
                let placeholder = null;
                if (type === 'input') {
                  const placeholderMatch = fullMatch.match(/placeholder=["']([^"']+)["']/);
                  placeholder = placeholderMatch ? placeholderMatch[1] : null;
                }

                elements.push({
                  type,
                  selector: idMatch ? `#${idMatch[1]}` : null,
                  id: idMatch ? idMatch[1] : null,
                  class: classMatch ? classMatch[1] : null,
                  text,
                  placeholder,
                  dataModule: moduleKey,
                  file: path.basename(file)
                });
              }
            }
          }

        } catch (err) {
          // Ignorar errores de lectura
        }
      }

      console.log(`   ✅ Encontrados ${elements.length} elementos UI para "${moduleKey}"`);
      if (elements.length > 0) {
        console.log(`      Tipos: ${elements.filter(e => e.type === 'button').length} botones, ${elements.filter(e => e.type === 'input').length} inputs, ${elements.filter(e => e.type === 'container').length} containers`);
      }

      return elements;

    } catch (error) {
      console.error(`❌ [BRAIN] Error escaneando UI para módulo "${moduleKey}":`, error.message);
      return [];
    }
  }

  /**
   * Obtener endpoints esperados para un módulo
   * Escanea archivos de routes buscando endpoints relacionados al módulo
   * @param {string} moduleKey - Clave del módulo (ej: 'users', 'vacations')
   * @returns {Promise<Array>} Lista de endpoints esperados
   */
  async getModuleEndpoints(moduleKey) {
    console.log(`\n🔍 [BRAIN] Escaneando endpoints para módulo "${moduleKey}"...`);

    const endpoints = [];

    try {
      // Escanear archivos de routes
      const routesFiles = this.scanDirectory(
        path.join(this.baseDir, 'src/routes'),
        '.js',
        true
      );

      for (const file of routesFiles) {
        try {
          const content = fsSync.readFileSync(file, 'utf8');
          const fileName = path.basename(file, '.js');

          // Verificar si el archivo está relacionado con el módulo
          const isRelevant = fileName.toLowerCase().includes(moduleKey.toLowerCase()) ||
                            content.toLowerCase().includes(`/${moduleKey}/`) ||
                            content.toLowerCase().includes(`/${moduleKey}s/`) ||
                            content.toLowerCase().includes(`module_key: '${moduleKey}'`);

          if (!isRelevant && !content.includes(`'${moduleKey}'`) && !content.includes(`"${moduleKey}"`)) {
            continue;
          }

          // Regex para encontrar definiciones de routes
          const routeRegex = /router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/gi;

          let match;
          while ((match = routeRegex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const routePath = match[2];

            // Verificar si el path está relacionado con el módulo
            if (routePath.toLowerCase().includes(moduleKey.toLowerCase())) {
              endpoints.push({
                method,
                path: routePath,
                file: fileName
              });
            }
          }

        } catch (err) {
          // Ignorar errores de lectura
        }
      }

      console.log(`   ✅ Encontrados ${endpoints.length} endpoints para "${moduleKey}"`);
      if (endpoints.length > 0) {
        const methodCounts = endpoints.reduce((acc, e) => {
          acc[e.method] = (acc[e.method] || 0) + 1;
          return acc;
        }, {});
        console.log(`      Métodos: ${Object.entries(methodCounts).map(([k, v]) => `${k}:${v}`).join(', ')}`);
      }

      return endpoints;

    } catch (error) {
      console.error(`❌ [BRAIN] Error escaneando endpoints para módulo "${moduleKey}":`, error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTING FEEDBACK LOOP - Registro de Resultados de Tests
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Registrar resultados de tests y actualizar metadata VIVO
   *
   * @param {string} moduleKey - ID del módulo testeado
   * @param {Object} results - Resultados del test
   * @param {Object} discoveries - Descubrimientos del test (botones, modales, campos)
   *
   * PROPÓSITO:
   * - Actualizar cache del Brain con resultados de testing
   * - Incrementar progress si tests pasaron
   * - Registrar descubrimientos (botones, modales, campos)
   * - Notificar a WebSocket (si BrainNervousSystem está disponible)
   */
  async recordTestResults(moduleKey, results, discoveries) {
    try {
      console.log(`🧠 [BRAIN] Registrando resultados de test para módulo: ${moduleKey}`);

      // 1. Actualizar cache del Brain
      const technicalModulesData = await this.getTechnicalModules();
      const technicalModules = technicalModulesData.modules || [];  // ⭐ FIX: Extraer array de módulos
      const module = technicalModules.find(m => m.key === moduleKey);

      if (module) {
        // Actualizar progress si tests pasaron
        if (results.status === 'passed') {
          module.progress = Math.min(100, (module.progress || 0) + 5);
          module.status = module.progress === 100 ? 'production' : 'in_progress';
          console.log(`   ✅ Progress actualizado: ${module.progress}%`);
        }

        // Agregar descubrimientos a metadata
        module.testResults = {
          lastTested: new Date(),
          status: results.status,
          discoveries: {
            buttons: discoveries.buttons?.length || 0,
            modals: discoveries.modals?.length || 0,
            fields: discoveries.fields?.length || 0
          },
          crudStats: results.crudStats || null,
          metrics: {
            totalTests: results.totalTests || 0,
            passed: results.passed || 0,
            failed: results.failed || 0,
            skipped: results.skipped || 0,
            timeouts: results.timeouts || 0
          }
        };

        console.log(`   📊 Métricas registradas:`);
        console.log(`      - Tests: ${results.passed || 0}/${results.totalTests || 0}`);
        console.log(`      - Descubrimientos: ${discoveries.buttons?.length || 0} botones, ${discoveries.modals?.length || 0} modales`);

        if (results.crudStats) {
          console.log(`      - CRUD: ${results.crudStats.tested || 0} tests CRUD ejecutados`);
        }
      } else {
        console.log(`   ⚠️  Módulo "${moduleKey}" no encontrado en cache del Brain`);
      }

      // 2. Notificar a WebSocket (si está disponible)
      if (this.brainNervous) {
        this.brainNervous.emit('test-completed', {
          module: moduleKey,
          status: results.status,
          timestamp: new Date(),
          metrics: results
        });
        console.log(`   📡 Notificación enviada a BrainNervousSystem`);
      }

      return {
        success: true,
        module: moduleKey,
        updated: !!module
      };

    } catch (error) {
      console.error(`❌ [BRAIN] Error registrando resultados de test:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Conectar BrainNervousSystem para notificaciones en tiempo real
   * @param {Object} brainNervous - Instancia de BrainNervousSystem
   */
  setBrainNervousSystem(brainNervous) {
    this.brainNervous = brainNervous;
    console.log('🧠 [BRAIN] BrainNervousSystem conectado');
  }
}

module.exports = EcosystemBrainService;
