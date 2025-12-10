/**
 * SYSTEM REGISTRY - Registro Completo del Sistema
 *
 * Contiene TODA la información sobre módulos, dependencias, relaciones
 * Permite análisis de impacto, validación de coherencia, bundles comerciales
 *
 * INTEGRACIÓN CON ECOSYSTEM BRAIN (v1.1.0):
 * - Enriquece módulos con datos LIVE escaneados del código
 * - Detecta drift entre registro y código real
 * - Provee endpoints/archivos verificados
 *
 * @version 1.1.0
 * @date 2025-12-09
 */

const fs = require('fs').promises;
const path = require('path');

// Brain Service para datos LIVE (lazy load)
let EcosystemBrainService = null;

class SystemRegistry {
  constructor(database, brainService = null) {
    this.database = database;
    this.modules = new Map();
    this.endpoints = new Map();
    this.businessFlows = new Map();
    this.dependencies = new Map();

    // 🧠 BRAIN INTEGRATION - Para datos LIVE del código
    this.brainService = brainService;
    this.brainData = null; // Cache de datos del Brain
    this.brainDataTimestamp = null;
    this.brainCacheTTL = 60000; // 1 minuto de cache

    // Auto-cargamos el registry al inicializar
    this.loaded = false;
  }

  /**
   * Inyectar Brain Service después de construcción
   */
  setBrainService(brainService) {
    this.brainService = brainService;
    console.log('🧠 [REGISTRY] Brain Service conectado');
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  async initialize() {
    if (this.loaded) return;

    console.log('🧠 [REGISTRY] Inicializando Sistema de Auto-Conocimiento...');

    // Cargar registry desde base de datos (ahora es la fuente principal)
    await this.loadFromDatabase();

    // Fallback a archivo JSON si la BD falla
    if (this.modules.size === 0) {
      console.warn('⚠️  [REGISTRY] BD vacía, intentando cargar desde archivo JSON...');
      await this.loadFromFile();
    }

    // Auto-detectar endpoints
    await this.autoDetectEndpoints();

    // Validar integridad
    await this.validateIntegrity();

    this.loaded = true;
    console.log(`✅ [REGISTRY] ${this.modules.size} módulos registrados`);
  }

  /**
   * Carga módulos desde la base de datos (system_modules)
   * Esta es ahora la fuente principal de verdad
   */
  async loadFromDatabase() {
    try {
      const { SystemModule } = this.database;

      // Obtener todos los módulos activos
      const modules = await SystemModule.findAll({
        where: { isActive: true },
        order: [['displayOrder', 'ASC'], ['name', 'ASC']]
      });

      console.log(`📊 [REGISTRY] Cargando ${modules.length} módulos desde BD...`);

      // Registrar cada módulo
      for (const mod of modules) {
        const moduleData = {
          id: mod.moduleKey,
          name: mod.name,
          category: mod.category,
          version: mod.version,
          description: mod.description,

          // Características
          features: mod.features || [],
          objectives: [], // No existe en BD aún

          // Datos técnicos (no existen en BD aún, se pueden agregar después)
          files: [],
          database_tables: [],
          api_endpoints: [],

          // DEPENDENCIAS - Mapeadas desde BD
          dependencies: {
            required: mod.requirements || [],
            optional: [], // Se puede inferir de integrates_with
            bundled: mod.bundledModules || [], // Módulos incluidos gratis
            integrates_with: mod.integratesWith || [],
            provides_to: mod.providesTo || []
          },

          // Relaciones (no existen en BD aún)
          relationships: [],

          // Health indicators (no existen en BD aún)
          health_indicators: {
            critical: [],
            performance: []
          },

          // Metadata comercial
          commercial: {
            is_core: mod.isCore,
            standalone: !mod.isCore && (!mod.bundledModules || mod.bundledModules.length === 0),
            base_price: parseFloat(mod.basePrice),
            bundled_modules: mod.bundledModules || [],
            available_in: mod.availableIn,
            suggested_bundles: [], // Se puede calcular dinámicamente
            enhances_modules: mod.integratesWith || []
          },

          // Metadata adicional
          metadata: mod.metadata || {}
        };

        this.registerModule(moduleData);
      }

      console.log(`✅ [REGISTRY] ${this.modules.size} módulos cargados desde BD`);

    } catch (error) {
      console.error('❌ [REGISTRY] Error cargando desde BD:', error.message);
      console.warn('   Usando fallback a archivo JSON o defaults');
    }
  }

  async loadFromFile() {
    try {
      const registryPath = path.join(__dirname, 'modules-registry.json');
      const data = await fs.readFile(registryPath, 'utf8');
      const registry = JSON.parse(data);

      // Cargar módulos
      for (const module of registry.modules) {
        this.registerModule(module);
      }

      // Cargar flujos de negocio
      for (const flow of registry.businessFlows || []) {
        this.businessFlows.set(flow.id, flow);
      }

    } catch (error) {
      console.warn('⚠️  [REGISTRY] No se pudo cargar registry, usando defaults');
      this.loadDefaultRegistry();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // MODULE REGISTRATION
  // ═══════════════════════════════════════════════════════════

  registerModule(moduleData) {
    const module = {
      id: moduleData.id,
      name: moduleData.name,
      category: moduleData.category || 'general',
      version: moduleData.version || '1.0.0',
      description: moduleData.description,

      // Características
      features: moduleData.features || [],
      objectives: moduleData.objectives || [],

      // Datos técnicos
      files: moduleData.files || [],
      database_tables: moduleData.database_tables || [],
      api_endpoints: moduleData.api_endpoints || [],

      // DEPENDENCIAS - LO MÁS IMPORTANTE
      dependencies: {
        // Módulos SIN los cuales NO puede funcionar
        required: moduleData.dependencies?.required || [],

        // Módulos que MEJORAN funcionalidad si están
        optional: moduleData.dependencies?.optional || [],

        // Módulos que se INTEGRAN automáticamente si detecta
        integrates_with: moduleData.dependencies?.integrates_with || [],

        // Módulos que este PROVEE servicios
        provides_to: moduleData.dependencies?.provides_to || []
      },

      // Relaciones de base de datos
      relationships: moduleData.relationships || [],

      // Indicadores de salud
      health_indicators: moduleData.health_indicators || {
        critical: [],
        performance: []
      },

      // Metadata comercial
      commercial: {
        is_core: moduleData.commercial?.is_core || false,
        standalone: moduleData.commercial?.standalone || false,
        suggested_bundles: moduleData.commercial?.suggested_bundles || [],
        enhances_modules: moduleData.commercial?.enhances_modules || []
      },

      // Estado
      status: 'active',
      last_updated: new Date()
    };

    this.modules.set(module.id, module);

    // Registrar dependencias para búsqueda rápida
    this._indexDependencies(module);

    return module;
  }

  _indexDependencies(module) {
    const allDeps = [
      ...module.dependencies.required,
      ...module.dependencies.optional,
      ...module.dependencies.integrates_with
    ];

    for (const dep of allDeps) {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, {
          required_by: [],
          optional_for: [],
          integrates_with: [],
          provided_by: []
        });
      }

      const depInfo = this.dependencies.get(dep);

      if (module.dependencies.required.includes(dep)) {
        depInfo.required_by.push(module.id);
      }
      if (module.dependencies.optional.includes(dep)) {
        depInfo.optional_for.push(module.id);
      }
      if (module.dependencies.integrates_with.includes(dep)) {
        depInfo.integrates_with.push(module.id);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DEPENDENCY ANALYSIS
  // ═══════════════════════════════════════════════════════════

  /**
   * Analiza si un módulo puede funcionar con los módulos activos de una empresa
   */
  async canModuleWork(moduleId, companyId) {
    const module = this.modules.get(moduleId);
    if (!module) {
      return { can_work: false, reason: 'Module not found' };
    }

    // Obtener módulos activos de la empresa
    const activeModules = await this._getCompanyActiveModules(companyId);

    // Verificar dependencias requeridas
    const missingRequired = module.dependencies.required.filter(
      dep => !activeModules.includes(dep)
    );

    if (missingRequired.length > 0) {
      return {
        can_work: false,
        reason: 'Missing required dependencies',
        missing: missingRequired,
        suggestion: `Activar: ${missingRequired.join(', ')}`
      };
    }

    // Verificar dependencias opcionales disponibles
    const availableOptional = module.dependencies.optional.filter(
      dep => activeModules.includes(dep)
    );

    return {
      can_work: true,
      with_full_features: availableOptional.length === module.dependencies.optional.length,
      available_optional: availableOptional,
      missing_optional: module.dependencies.optional.filter(
        dep => !activeModules.includes(dep)
      )
    };
  }

  /**
   * Analiza el impacto de desactivar un módulo
   */
  analyzeDeactivationImpact(moduleId) {
    const depInfo = this.dependencies.get(moduleId);

    if (!depInfo) {
      return { safe: true, affected: [] };
    }

    const affected = [];

    // Módulos que lo requieren (CRÍTICO)
    for (const requiredBy of depInfo.required_by) {
      affected.push({
        module: requiredBy,
        impact: 'critical',
        reason: `${requiredBy} NO PUEDE funcionar sin ${moduleId}`
      });
    }

    // Módulos que lo usan opcionalmente (WARNING)
    for (const optionalFor of depInfo.optional_for) {
      affected.push({
        module: optionalFor,
        impact: 'degraded',
        reason: `${optionalFor} funcionará pero con features reducidas`
      });
    }

    return {
      safe: depInfo.required_by.length === 0,
      critical_affected: depInfo.required_by.length,
      degraded_affected: depInfo.optional_for.length,
      affected
    };
  }

  /**
   * Sugiere bundles comerciales basados en módulos activos
   */
  async suggestBundles(companyId) {
    const activeModules = await this._getCompanyActiveModules(companyId);
    const suggestions = [];

    // Para cada módulo activo, ver qué otros mejorarían la experiencia
    for (const moduleId of activeModules) {
      const module = this.modules.get(moduleId);
      if (!module) continue;

      // Módulos que integran bien con este
      for (const integratesWith of module.dependencies.integrates_with) {
        if (!activeModules.includes(integratesWith)) {
          const targetModule = this.modules.get(integratesWith);

          suggestions.push({
            type: 'integration',
            current: moduleId,
            suggested: integratesWith,
            benefit: `${targetModule?.name} se integra automáticamente con ${module.name}`,
            commercial_bundle: this._findBundle([moduleId, integratesWith])
          });
        }
      }

      // Bundles sugeridos comercialmente
      for (const bundle of module.commercial.suggested_bundles) {
        const bundleModules = bundle.modules || [];
        const missing = bundleModules.filter(m => !activeModules.includes(m));

        if (missing.length > 0 && missing.length < bundleModules.length) {
          suggestions.push({
            type: 'bundle',
            name: bundle.name,
            description: bundle.description,
            current_modules: bundleModules.filter(m => activeModules.includes(m)),
            missing_modules: missing,
            benefit: bundle.benefit
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Valida que los módulos activos de una empresa sean coherentes
   */
  async validateCompanyModules(companyId) {
    const activeModules = await this._getCompanyActiveModules(companyId);
    const issues = [];

    for (const moduleId of activeModules) {
      const module = this.modules.get(moduleId);
      if (!module) {
        issues.push({
          severity: 'error',
          module: moduleId,
          message: `Módulo ${moduleId} activo pero no existe en registry`
        });
        continue;
      }

      // Verificar dependencias requeridas
      for (const required of module.dependencies.required) {
        if (!activeModules.includes(required)) {
          issues.push({
            severity: 'critical',
            module: moduleId,
            message: `${module.name} requiere ${required} pero no está activo`,
            fix: `Activar módulo ${required}`
          });
        }
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'critical').length === 0,
      issues
    };
  }

  // ═══════════════════════════════════════════════════════════
  // AUTO-DETECTION
  // ═══════════════════════════════════════════════════════════

  async autoDetectEndpoints() {
    // TODO: Escanear archivos de routes y detectar endpoints automáticamente
    // Por ahora, los endpoints vienen del registry JSON
  }

  async validateIntegrity() {
    const issues = [];

    // Validar que todas las dependencias existan
    for (const [moduleId, module] of this.modules) {
      const allDeps = [
        ...module.dependencies.required,
        ...module.dependencies.optional,
        ...module.dependencies.integrates_with
      ];

      for (const dep of allDeps) {
        if (!this.modules.has(dep)) {
          issues.push({
            severity: 'warning',
            module: moduleId,
            message: `Dependencia ${dep} declarada pero no existe en registry`
          });
        }
      }
    }

    if (issues.length > 0) {
      console.warn(`⚠️  [REGISTRY] ${issues.length} problemas de integridad detectados`);
      for (const issue of issues) {
        console.warn(`  - ${issue.module}: ${issue.message}`);
      }
    }

    return issues;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  async _getCompanyActiveModules(companyId) {
    const { CompanyModule, SystemModule } = this.database;

    const activeModules = await CompanyModule.findAll({
      where: { company_id: companyId },
      include: [{
        model: SystemModule,
        as: 'systemModule',
        where: { is_active: true }
      }]
    });

    return activeModules
      .filter(cm => cm.isOperational())
      .map(cm => cm.systemModule.module_key);
  }

  _findBundle(moduleIds) {
    // Buscar bundles comerciales que contengan estos módulos
    for (const [_, module] of this.modules) {
      for (const bundle of module.commercial.suggested_bundles) {
        if (moduleIds.every(id => bundle.modules?.includes(id))) {
          return bundle;
        }
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════

  getModule(moduleId) {
    return this.modules.get(moduleId);
  }

  getAllModules() {
    return Array.from(this.modules.values());
  }

  getCoreModules() {
    return Array.from(this.modules.values())
      .filter(m => m.commercial.is_core);
  }

  getStandaloneModules() {
    return Array.from(this.modules.values())
      .filter(m => m.commercial.standalone);
  }

  getModulesByCategory(category) {
    return Array.from(this.modules.values())
      .filter(m => m.category === category);
  }

  // ═══════════════════════════════════════════════════════════
  // DEFAULT REGISTRY (si no existe archivo)
  // ═══════════════════════════════════════════════════════════

  loadDefaultRegistry() {
    console.log('📋 [REGISTRY] Cargando registry por defecto...');

    // Módulos CORE (incluidos en todos los planes)
    this.registerModule({
      id: 'users',
      name: 'Gestión de Usuarios',
      category: 'core',
      dependencies: {
        required: ['database', 'companies'],
        optional: ['biometric-enterprise', 'departments', 'shifts'],
        integrates_with: ['attendance', 'notifications-enterprise'],
        provides_to: ['attendance', 'medical', 'vacation', 'legal']
      },
      commercial: {
        is_core: true,
        standalone: false
      }
    });

    this.registerModule({
      id: 'attendance',
      name: 'Control de Asistencia',
      category: 'core',
      dependencies: {
        required: ['users', 'companies', 'database'],
        optional: ['kiosks', 'biometric-enterprise', 'shifts', 'notifications-enterprise'],
        integrates_with: ['medical', 'vacation', 'dashboard'],
        provides_to: ['reports', 'payroll']
      },
      commercial: {
        is_core: true,
        standalone: false,
        suggested_bundles: [
          {
            name: 'Bundle Asistencia Completo',
            modules: ['attendance', 'kiosks', 'biometric-enterprise', 'shifts'],
            benefit: 'Control completo con biometría y múltiples turnos'
          }
        ]
      }
    });

    this.registerModule({
      id: 'medical',
      name: 'Gestión Médica',
      category: 'rrhh',
      dependencies: {
        required: ['users', 'companies'],
        optional: ['notifications-enterprise', 'documents'],
        integrates_with: ['attendance', 'vacation', 'dashboard'],
        provides_to: ['reports', 'legal']
      },
      commercial: {
        is_core: false,
        standalone: true,
        suggested_bundles: [
          {
            name: 'Bundle RRHH Completo',
            modules: ['medical', 'vacation', 'notifications-enterprise'],
            benefit: 'Gestión integral de RRHH con notificaciones automáticas'
          }
        ]
      }
    });

    this.registerModule({
      id: 'vacation',
      name: 'Gestión de Vacaciones',
      category: 'rrhh',
      dependencies: {
        required: ['users', 'companies'],
        optional: ['notifications-enterprise', 'dashboard'],
        integrates_with: ['attendance', 'medical'],
        provides_to: ['reports', 'payroll']
      },
      commercial: {
        is_core: false,
        standalone: true,
        enhances_modules: ['attendance', 'medical']
      }
    });

    this.registerModule({
      id: 'notifications-enterprise',
      name: 'Notificaciones Enterprise',
      category: 'communication',
      dependencies: {
        required: ['users', 'companies'],
        optional: [],
        integrates_with: ['attendance', 'medical', 'vacation', 'legal', 'kiosks'],
        provides_to: ['ALL'] // Se integra con TODOS los módulos
      },
      commercial: {
        is_core: false,
        standalone: true,
        enhances_modules: ['attendance', 'medical', 'vacation', 'legal']
      }
    });

    // Agregar más módulos...
    console.log(`✅ [REGISTRY] ${this.modules.size} módulos por defecto cargados`);
  }

  // ═══════════════════════════════════════════════════════════
  // EXPORT / SAVE
  // ═══════════════════════════════════════════════════════════

  async saveToFile() {
    const registry = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      modules: Array.from(this.modules.values()),
      businessFlows: Array.from(this.businessFlows.values())
    };

    const registryPath = path.join(__dirname, 'modules-registry.json');
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

    console.log(`💾 [REGISTRY] Guardado en ${registryPath}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧠 BRAIN INTEGRATION - Datos LIVE del Código
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtener datos frescos del Brain (con cache)
   */
  async getBrainData(forceRefresh = false) {
    if (!this.brainService) {
      console.log('⚠️ [REGISTRY] Brain Service no disponible');
      return null;
    }

    // Verificar cache
    const now = Date.now();
    if (!forceRefresh && this.brainData && this.brainDataTimestamp) {
      if (now - this.brainDataTimestamp < this.brainCacheTTL) {
        return this.brainData;
      }
    }

    try {
      console.log('🧠 [REGISTRY] Obteniendo datos LIVE del Brain...');

      // Obtener escaneos del Brain
      const [backendFiles, frontendFiles, workflows] = await Promise.all([
        this.brainService.scanBackendFiles(),
        this.brainService.scanFrontendFiles(),
        this.brainService.getWorkflowsConnected ? this.brainService.getWorkflowsConnected() : null
      ]);

      this.brainData = {
        backend: backendFiles,
        frontend: frontendFiles,
        workflows: workflows,
        scannedAt: new Date().toISOString()
      };
      this.brainDataTimestamp = now;

      console.log(`✅ [REGISTRY] Brain: ${backendFiles?.totalFiles || 0} backend, ${frontendFiles?.totalFiles || 0} frontend`);

      return this.brainData;
    } catch (error) {
      console.error('❌ [REGISTRY] Error obteniendo datos del Brain:', error.message);
      return null;
    }
  }

  /**
   * Obtener un módulo ENRIQUECIDO con datos LIVE del Brain
   *
   * @param {string} moduleKey - Key del módulo (ej: 'users', 'attendance')
   * @returns {Object} Módulo con datos estáticos + LIVE
   */
  async getModuleWithLiveData(moduleKey) {
    await this.initialize();

    const module = this.modules.get(moduleKey);
    if (!module) {
      return null;
    }

    // Obtener datos del Brain
    const brainData = await this.getBrainData();
    if (!brainData) {
      // Sin Brain, retornar módulo sin enriquecer
      return {
        ...module,
        liveData: null,
        brainConnected: false
      };
    }

    // Buscar archivos relacionados en el Brain
    const liveFiles = this.findModuleFilesInBrain(moduleKey, brainData);
    const liveEndpoints = this.findModuleEndpointsInBrain(moduleKey, brainData);
    const liveWorkflow = this.findModuleWorkflowInBrain(moduleKey, brainData);

    // Detectar drift (diferencias entre registro y código real)
    const drift = this.detectDrift(module, liveFiles, liveEndpoints);

    return {
      ...module,
      liveData: {
        files: liveFiles,
        endpoints: liveEndpoints,
        workflow: liveWorkflow,
        scannedAt: brainData.scannedAt
      },
      drift,
      brainConnected: true
    };
  }

  /**
   * Buscar archivos del módulo en datos del Brain
   */
  findModuleFilesInBrain(moduleKey, brainData) {
    const files = {
      routes: [],
      services: [],
      models: [],
      frontend: []
    };

    const keyLower = moduleKey.toLowerCase();
    const variations = [
      keyLower,
      keyLower.replace(/-/g, ''),
      keyLower.replace(/_/g, ''),
      keyLower + 's', // plural
      keyLower.slice(0, -1) // singular si termina en s
    ];

    // Buscar en backend
    const backendCategories = brainData.backend?.categories || {};
    for (const [category, data] of Object.entries(backendCategories)) {
      const categoryFiles = data.files || [];
      for (const file of categoryFiles) {
        const fileName = (file.name || '').toLowerCase().replace('.js', '');
        if (variations.some(v => fileName.includes(v) || v.includes(fileName))) {
          if (category === 'routes') files.routes.push(file);
          else if (category === 'services') files.services.push(file);
          else if (category === 'models') files.models.push(file);
        }
      }
    }

    // Buscar en frontend
    const frontendCategories = brainData.frontend?.categories || {};
    for (const data of Object.values(frontendCategories)) {
      const categoryFiles = data.files || [];
      for (const file of categoryFiles) {
        const fileName = (file.name || '').toLowerCase().replace('.js', '');
        if (variations.some(v => fileName.includes(v))) {
          files.frontend.push(file);
        }
      }
    }

    return files;
  }

  /**
   * Buscar endpoints del módulo en datos del Brain
   */
  findModuleEndpointsInBrain(moduleKey, brainData) {
    const endpoints = [];
    const keyLower = moduleKey.toLowerCase();

    const routes = brainData.backend?.categories?.routes?.files || [];
    for (const routeFile of routes) {
      const fileName = (routeFile.name || '').toLowerCase();
      if (fileName.includes(keyLower)) {
        // Agregar todos los endpoints de este archivo
        const fileEndpoints = routeFile.endpoints || [];
        endpoints.push(...fileEndpoints.map(ep => ({
          ...ep,
          sourceFile: routeFile.path
        })));
      }
    }

    return endpoints;
  }

  /**
   * Buscar workflow del módulo en datos del Brain
   */
  findModuleWorkflowInBrain(moduleKey, brainData) {
    if (!brainData.workflows?.workflows) return null;

    const keyLower = moduleKey.toLowerCase();
    return brainData.workflows.workflows.find(wf => {
      const wfName = (wf.name || '').toLowerCase();
      return wfName.includes(keyLower) || keyLower.includes(wfName.replace('workflow', ''));
    }) || null;
  }

  /**
   * Detectar drift entre registro estático y código real
   */
  detectDrift(module, liveFiles, liveEndpoints) {
    const drift = {
      hasDrift: false,
      newEndpoints: [],
      missingEndpoints: [],
      newFiles: [],
      summary: ''
    };

    // Comparar endpoints
    const registeredEndpoints = module.api_endpoints || [];
    const liveEndpointPaths = liveEndpoints.map(e => e.path);
    const registeredPaths = registeredEndpoints.map(e => e.path || e);

    // Endpoints en código pero no en registro
    drift.newEndpoints = liveEndpointPaths.filter(p => !registeredPaths.includes(p));

    // Endpoints en registro pero no en código
    drift.missingEndpoints = registeredPaths.filter(p => !liveEndpointPaths.includes(p));

    // Archivos nuevos no registrados
    const allLiveFiles = [
      ...liveFiles.routes,
      ...liveFiles.services,
      ...liveFiles.models,
      ...liveFiles.frontend
    ];
    const registeredFiles = module.files || [];
    drift.newFiles = allLiveFiles
      .map(f => f.path)
      .filter(p => !registeredFiles.some(rf => p.includes(rf) || rf.includes(p)));

    // Hay drift si hay diferencias
    drift.hasDrift = drift.newEndpoints.length > 0 ||
                     drift.missingEndpoints.length > 0 ||
                     drift.newFiles.length > 0;

    if (drift.hasDrift) {
      drift.summary = `Drift detectado: ${drift.newEndpoints.length} nuevos endpoints, ` +
                      `${drift.missingEndpoints.length} faltantes, ${drift.newFiles.length} archivos nuevos`;
    }

    return drift;
  }

  /**
   * Obtener todos los módulos con datos LIVE
   */
  async getAllModulesWithLiveData() {
    await this.initialize();

    const modules = [];
    for (const moduleKey of this.modules.keys()) {
      const enrichedModule = await this.getModuleWithLiveData(moduleKey);
      modules.push(enrichedModule);
    }

    return modules;
  }

  /**
   * Obtener resumen de estado del sistema con Brain
   */
  async getSystemStatusWithBrain() {
    const brainData = await this.getBrainData();

    return {
      registry: {
        modulesCount: this.modules.size,
        endpointsCount: this.endpoints.size,
        loaded: this.loaded
      },
      brain: {
        connected: !!brainData,
        backendFiles: brainData?.backend?.totalFiles || 0,
        frontendFiles: brainData?.frontend?.totalFiles || 0,
        workflowsDetected: brainData?.workflows?.stats?.total || 0,
        scannedAt: brainData?.scannedAt || null
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // BIDIRECTIONAL FEEDBACK LOOP - Recibir datos de tests
  // ═══════════════════════════════════════════════════════════

  /**
   * Registrar ejecución de test y sus descubrimientos
   * Este es el método que IntelligentUXTester llama para reportar hallazgos
   *
   * @param {string} moduleKey - Clave del módulo testeado
   * @param {number} companyId - ID de la empresa (null para descubrimientos globales)
   * @param {object} testData - Resultados y descubrimientos del test
   */
  async recordTestExecution(moduleKey, companyId, testData) {
    console.log(`📥 [REGISTRY] Recibiendo descubrimientos de ${moduleKey}...`);

    try {
      const { QueryTypes } = require('sequelize');
      const { results, discoveries, timestamp } = testData;

      // 1. PERSISTIR BOTONES DESCUBIERTOS
      if (discoveries.buttons && discoveries.buttons.length > 0) {
        for (const button of discoveries.buttons) {
          await this.persistDiscovery(moduleKey, companyId, 'button', button, timestamp);
        }
        console.log(`   ✅ ${discoveries.buttons.length} botones guardados`);
      }

      // 2. PERSISTIR MODALES DESCUBIERTOS
      if (discoveries.modals && discoveries.modals.length > 0) {
        for (const modal of discoveries.modals) {
          await this.persistDiscovery(moduleKey, companyId, 'modal', modal, timestamp);
        }
        console.log(`   ✅ ${discoveries.modals.length} modales guardados`);
      }

      // 3. PERSISTIR CAMPOS DESCUBIERTOS
      if (discoveries.fields && discoveries.fields.length > 0) {
        for (const field of discoveries.fields) {
          await this.persistDiscovery(moduleKey, companyId, 'field', field, timestamp);
        }
        console.log(`   ✅ ${discoveries.fields.length} campos guardados`);
      }

      // 4. PERSISTIR FLUJOS CRUD TESTEADOS
      if (discoveries.flows && discoveries.flows.length > 0) {
        for (const flow of discoveries.flows) {
          await this.persistDiscovery(moduleKey, companyId, 'flow', flow, timestamp);
        }
        console.log(`   ✅ ${discoveries.flows.length} flujos guardados`);
      }

      // 5. PROPAGAR AL BRAIN (si está conectado)
      if (this.brainService && typeof this.brainService.recordTestResults === 'function') {
        await this.brainService.recordTestResults(moduleKey, results, discoveries);
        console.log(`   🧠 Datos propagados al Brain`);
      } else {
        console.log(`   ⚠️  Brain no tiene método recordTestResults() - propagación incompleta`);
      }

      console.log(`✅ [REGISTRY] Descubrimientos procesados correctamente`);

    } catch (error) {
      console.error(`❌ [REGISTRY] Error guardando descubrimientos:`, error.message);
      throw error;
    }
  }

  /**
   * Persistir un descubrimiento individual en ux_discoveries
   * Incluye deduplicación inteligente
   */
  async persistDiscovery(moduleKey, companyId, discoveryType, discoveryData, timestamp) {
    try {
      const { QueryTypes } = require('sequelize');

      // Preparar datos para guardar
      const data = discoveryData.data;
      const context = discoveryData.context;
      const screenLocation = discoveryData.screenLocation;
      const worksCorrectly = discoveryData.worksCorrectly;

      // Buscar descubrimientos similares (deduplicación)
      const similar = await this.database.sequelize.query(
        `SELECT * FROM find_similar_discovery(:moduleKey, :discoveryType, :data, :companyId)`,
        {
          replacements: {
            moduleKey,
            discoveryType,
            data: JSON.stringify(data),
            companyId: companyId || null
          },
          type: QueryTypes.SELECT
        }
      );

      if (similar && similar.length > 0 && similar[0].similarity_score >= 0.8) {
        // Ya existe, incrementar validation_count
        await this.database.sequelize.query(
          `SELECT increment_discovery_validation(:discoveryId)`,
          {
            replacements: { discoveryId: similar[0].id },
            type: QueryTypes.SELECT
          }
        );
        console.log(`      🔄 Validación incrementada (${discoveryType})`);
      } else {
        // Nuevo descubrimiento, insertar
        await this.database.sequelize.query(
          `INSERT INTO ux_discoveries
           (module_key, company_id, discovery_type, discovery_data, context, screen_location,
            works_correctly, test_execution_id, created_at, updated_at)
           VALUES (:moduleKey, :companyId, :discoveryType, :data, :context, :screenLocation,
                   :worksCorrectly, :executionId, NOW(), NOW())`,
          {
            replacements: {
              moduleKey,
              companyId: companyId || null,
              discoveryType,
              data: JSON.stringify(data),
              context: context || null,
              screenLocation: screenLocation || null,
              worksCorrectly: worksCorrectly !== undefined ? worksCorrectly : null,
              executionId: timestamp || new Date().toISOString()
            },
            type: QueryTypes.INSERT
          }
        );
        console.log(`      ✨ Nuevo descubrimiento guardado (${discoveryType})`);
      }

    } catch (error) {
      console.error(`   ❌ Error persistiendo ${discoveryType}:`, error.message);
      // No lanzar error, solo loggear (no queremos que un fallo de persistencia rompa el test)
    }
  }

  /**
   * Obtener descubrimientos validados de un módulo
   * Útil para que futuros tests sepan qué ya se ha encontrado
   */
  async getValidatedDiscoveries(moduleKey, minValidationCount = 3) {
    try {
      const { QueryTypes } = require('sequelize');

      const discoveries = await this.database.sequelize.query(
        `SELECT * FROM get_validated_discoveries(:moduleKey, :minValidationCount)`,
        {
          replacements: { moduleKey, minValidationCount },
          type: QueryTypes.SELECT
        }
      );

      return discoveries;

    } catch (error) {
      console.error(`Error obteniendo descubrimientos validados:`, error.message);
      return [];
    }
  }

  /**
   * Obtener estadísticas UX de un módulo
   */
  async getModuleUXStats(moduleKey) {
    try {
      const { QueryTypes } = require('sequelize');

      const stats = await this.database.sequelize.query(
        `SELECT * FROM get_module_ux_stats(:moduleKey)`,
        {
          replacements: { moduleKey },
          type: QueryTypes.SELECT
        }
      );

      return stats[0] || null;

    } catch (error) {
      console.error(`Error obteniendo stats UX:`, error.message);
      return null;
    }
  }
}

module.exports = SystemRegistry;
