/**
 * SYSTEM REGISTRY - Registro Completo del Sistema
 *
 * Contiene TODA la información sobre módulos, dependencias, relaciones
 * Permite análisis de impacto, validación de coherencia, bundles comerciales
 *
 * @version 1.0.0
 * @date 2025-01-19
 */

const fs = require('fs').promises;
const path = require('path');

class SystemRegistry {
  constructor(database) {
    this.database = database;
    this.modules = new Map();
    this.endpoints = new Map();
    this.businessFlows = new Map();
    this.dependencies = new Map();

    // Auto-cargamos el registry al inicializar
    this.loaded = false;
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  async initialize() {
    if (this.loaded) return;

    console.log('🧠 [REGISTRY] Inicializando Sistema de Auto-Conocimiento...');

    // Cargar registry desde archivo
    await this.loadFromFile();

    // Auto-detectar endpoints
    await this.autoDetectEndpoints();

    // Validar integridad
    await this.validateIntegrity();

    this.loaded = true;
    console.log(`✅ [REGISTRY] ${this.modules.size} módulos registrados`);
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
}

module.exports = SystemRegistry;
