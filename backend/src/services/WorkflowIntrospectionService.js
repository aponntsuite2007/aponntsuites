/**
 * ============================================================================
 * WORKFLOW INTROSPECTION SERVICE
 * ============================================================================
 *
 * Servicio introspectivo que detecta, analiza y documenta workflows
 * de todos los módulos del sistema de forma automática.
 *
 * Funcionalidades:
 * 1. Detecta workflows desde código (rutas, servicios, frontend)
 * 2. Genera documentación automática de cada workflow
 * 3. Crea tutoriales paso a paso desde workflows
 * 4. Provee contexto al AI Assistant para ayuda de usuarios
 *
 * @version 1.0.0
 * @date 2025-12-16
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class WorkflowIntrospectionService {
  constructor() {
    // 🔐 SEGURIDAD: No usar fallback de password - debe venir de .env
    if (!process.env.DB_PASSWORD) {
      console.warn('⚠️ [SECURITY] DB_PASSWORD no configurado en .env');
    }
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'attendance_system',
      port: process.env.DB_PORT || 5432
    });

    this.basePath = path.join(__dirname, '../..');
    this.routesPath = path.join(this.basePath, 'src/routes');
    this.servicesPath = path.join(this.basePath, 'src/services');
    this.frontendPath = path.join(this.basePath, 'public/js/modules');

    // Cache de workflows detectados
    this.workflowCache = new Map();
    this.lastScanTime = null;

    // Patrones para detectar workflows en código
    this.patterns = {
      // Rutas CRUD
      crud: {
        create: /router\.(post)\s*\(\s*['"]([^'"]+)['"]/gi,
        read: /router\.(get)\s*\(\s*['"]([^'"]+)['"]/gi,
        update: /router\.(put|patch)\s*\(\s*['"]([^'"]+)['"]/gi,
        delete: /router\.(delete)\s*\(\s*['"]([^'"]+)['"]/gi
      },
      // Workflows de estado
      stateWorkflows: /status\s*[=:]\s*['"](\w+)['"]/gi,
      approvalWorkflows: /(approve|reject|pending|approved|rejected)/gi,
      // Formularios frontend
      formSubmit: /handleSubmit|onSubmit|submitForm|saveForm/gi,
      modalActions: /openModal|closeModal|showModal|hideModal/gi,
      // Validaciones
      validations: /validate|isValid|checkRequired|required:/gi,
      // Eventos de negocio
      businessEvents: /onCreate|onUpdate|onDelete|onApprove|onReject|emit\(/gi,
      // HSE AI Patterns
      hseAI: {
        ppeDetection: /ppe|detect|azure|customVision|helmet|gloves|vest|glasses|boots|harness/gi,
        hseCase: /hse.*case|investigation|verdict|PENDING_REVIEW|UNDER_INVESTIGATION|CLOSED_CONFIRMED/gi,
        consent: /consent|gdpr|privacy|alert.*mode|INDIVIDUAL|ANONYMOUS|AGGREGATE/gi,
        zones: /zone.*config|required.*ppe|threshold|camera/gi,
        violations: /violation|sanction|training.*threshold/gi
      }
    };

    console.log('🔍 [WORKFLOW-INTROSPECTION] Service initialized');
  }

  /**
   * Escanea todos los módulos y detecta sus workflows
   */
  async scanAllWorkflows(forceRefresh = false) {
    const cacheAge = this.lastScanTime ? Date.now() - this.lastScanTime : Infinity;

    // Usar cache si es reciente (menos de 5 minutos)
    if (!forceRefresh && cacheAge < 300000 && this.workflowCache.size > 0) {
      console.log('🔍 [WORKFLOW-INTROSPECTION] Using cached workflows');
      return Object.fromEntries(this.workflowCache);
    }

    console.log('🔍 [WORKFLOW-INTROSPECTION] Scanning all modules for workflows...');

    try {
      // 1. Obtener lista de módulos desde registry
      const modules = await this.getModulesFromRegistry();

      // 2. Escanear cada módulo
      const workflows = {};

      for (const mod of modules) {
        const moduleWorkflows = await this.scanModuleWorkflows(mod);
        if (moduleWorkflows && Object.keys(moduleWorkflows.workflows).length > 0) {
          workflows[mod.id] = moduleWorkflows;
          this.workflowCache.set(mod.id, moduleWorkflows);
        }
      }

      this.lastScanTime = Date.now();

      // 3. Guardar en BD para persistencia
      await this.saveWorkflowsToDatabase(workflows);

      console.log(`✅ [WORKFLOW-INTROSPECTION] Scanned ${Object.keys(workflows).length} modules`);

      return workflows;

    } catch (error) {
      console.error('❌ [WORKFLOW-INTROSPECTION] Error scanning workflows:', error);
      throw error;
    }
  }

  /**
   * Obtiene módulos desde el registry
   */
  async getModulesFromRegistry() {
    try {
      const registryPath = path.join(this.basePath, 'src/auditor/registry/modules-registry.json');
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      return registry.modules || [];
    } catch (error) {
      console.error('Error reading registry:', error);
      return [];
    }
  }

  /**
   * Escanea workflows de un módulo específico
   */
  async scanModuleWorkflows(module) {
    const moduleId = module.id;
    const moduleName = module.name || moduleId;

    const result = {
      moduleId,
      moduleName,
      description: module.description || '',
      taxonomy: module.taxonomy || {},
      workflows: {},
      tutorials: [],
      lastScanned: new Date().toISOString()
    };

    try {
      // 1. Analizar archivo de rutas si existe
      const routeWorkflows = await this.analyzeRouteFile(moduleId);
      if (routeWorkflows) {
        result.workflows = { ...result.workflows, ...routeWorkflows };
      }

      // 2. Analizar archivo frontend si existe
      const frontendFile = module.taxonomy?.frontend_file;
      if (frontendFile) {
        const frontendWorkflows = await this.analyzeFrontendFile(frontendFile, moduleId);
        if (frontendWorkflows) {
          result.workflows = { ...result.workflows, ...frontendWorkflows };
        }
      }

      // 3. Analizar servicio si existe
      const serviceWorkflows = await this.analyzeServiceFile(moduleId);
      if (serviceWorkflows) {
        result.workflows = { ...result.workflows, ...serviceWorkflows };
      }

      // 4. Generar tutoriales desde workflows
      result.tutorials = this.generateTutorialsFromWorkflows(result.workflows, moduleName);

      return result;

    } catch (error) {
      console.error(`Error scanning module ${moduleId}:`, error.message);
      return result;
    }
  }

  /**
   * Analiza archivo de rutas para detectar workflows
   */
  async analyzeRouteFile(moduleId) {
    const possibleNames = [
      `${moduleId}.js`,
      `${moduleId}Routes.js`,
      `${moduleId.replace(/-/g, '')}Routes.js`,
      `${this.toCamelCase(moduleId)}Routes.js`
    ];

    for (const fileName of possibleNames) {
      const filePath = path.join(this.routesPath, fileName);
      if (fs.existsSync(filePath)) {
        return this.parseRouteWorkflows(filePath, moduleId);
      }
    }

    return null;
  }

  /**
   * Parsea workflows desde archivo de rutas
   */
  parseRouteWorkflows(filePath, moduleId) {
    const content = fs.readFileSync(filePath, 'utf8');
    const workflows = {};

    // Detectar endpoints CRUD
    const endpoints = {
      create: [],
      read: [],
      update: [],
      delete: []
    };

    // POST endpoints (Create)
    let match;
    const postRegex = /router\.post\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = postRegex.exec(content)) !== null) {
      const endpoint = match[1];
      if (!endpoint.includes('login') && !endpoint.includes('logout')) {
        endpoints.create.push(endpoint);
      }
    }

    // GET endpoints (Read)
    const getRegex = /router\.get\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = getRegex.exec(content)) !== null) {
      endpoints.read.push(match[1]);
    }

    // PUT/PATCH endpoints (Update)
    const putRegex = /router\.(put|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = putRegex.exec(content)) !== null) {
      endpoints.update.push(match[2]);
    }

    // DELETE endpoints
    const deleteRegex = /router\.delete\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = deleteRegex.exec(content)) !== null) {
      endpoints.delete.push(match[1]);
    }

    // Generar workflows desde CRUD
    if (endpoints.create.length > 0) {
      workflows['create'] = {
        type: 'CRUD',
        operation: 'CREATE',
        name: `Crear ${this.humanize(moduleId)}`,
        description: `Crear un nuevo registro en ${this.humanize(moduleId)}`,
        endpoints: endpoints.create,
        steps: this.generateCrudSteps('create', moduleId),
        requiredFields: this.detectRequiredFields(content, 'create'),
        validations: this.detectValidations(content)
      };
    }

    if (endpoints.read.length > 0) {
      workflows['read'] = {
        type: 'CRUD',
        operation: 'READ',
        name: `Ver ${this.humanize(moduleId)}`,
        description: `Consultar registros de ${this.humanize(moduleId)}`,
        endpoints: endpoints.read,
        steps: this.generateCrudSteps('read', moduleId),
        filters: this.detectFilters(content)
      };
    }

    if (endpoints.update.length > 0) {
      workflows['update'] = {
        type: 'CRUD',
        operation: 'UPDATE',
        name: `Editar ${this.humanize(moduleId)}`,
        description: `Modificar un registro existente de ${this.humanize(moduleId)}`,
        endpoints: endpoints.update,
        steps: this.generateCrudSteps('update', moduleId),
        requiredFields: this.detectRequiredFields(content, 'update')
      };
    }

    if (endpoints.delete.length > 0) {
      workflows['delete'] = {
        type: 'CRUD',
        operation: 'DELETE',
        name: `Eliminar ${this.humanize(moduleId)}`,
        description: `Eliminar un registro de ${this.humanize(moduleId)}`,
        endpoints: endpoints.delete,
        steps: this.generateCrudSteps('delete', moduleId),
        requiresConfirmation: true
      };
    }

    // Detectar workflows de aprobación
    if (this.patterns.approvalWorkflows.test(content)) {
      workflows['approval'] = {
        type: 'APPROVAL',
        operation: 'APPROVE',
        name: `Aprobar ${this.humanize(moduleId)}`,
        description: `Flujo de aprobación para ${this.humanize(moduleId)}`,
        states: this.detectApprovalStates(content),
        steps: this.generateApprovalSteps(moduleId)
      };
    }

    // Detectar workflows de importación/exportación
    if (content.includes('export') || content.includes('import') || content.includes('upload')) {
      if (content.includes('export') || content.includes('download')) {
        workflows['export'] = {
          type: 'DATA',
          operation: 'EXPORT',
          name: `Exportar ${this.humanize(moduleId)}`,
          description: `Exportar datos de ${this.humanize(moduleId)}`,
          formats: this.detectExportFormats(content),
          steps: this.generateExportSteps(moduleId)
        };
      }
      if (content.includes('import') || content.includes('upload')) {
        workflows['import'] = {
          type: 'DATA',
          operation: 'IMPORT',
          name: `Importar ${this.humanize(moduleId)}`,
          description: `Importar datos a ${this.humanize(moduleId)}`,
          formats: this.detectImportFormats(content),
          steps: this.generateImportSteps(moduleId)
        };
      }
    }

    return Object.keys(workflows).length > 0 ? workflows : null;
  }

  /**
   * Analiza archivo frontend para detectar workflows de UI
   */
  async analyzeFrontendFile(fileName, moduleId) {
    const filePath = path.join(this.frontendPath, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const workflows = {};

    // Detectar workflows de formularios
    if (this.patterns.formSubmit.test(content)) {
      const formWorkflows = this.detectFormWorkflows(content, moduleId);
      Object.assign(workflows, formWorkflows);
    }

    // Detectar workflows de modales
    if (this.patterns.modalActions.test(content)) {
      const modalWorkflows = this.detectModalWorkflows(content, moduleId);
      Object.assign(workflows, modalWorkflows);
    }

    // Detectar workflows de tabs/navegación
    const tabWorkflows = this.detectTabWorkflows(content, moduleId);
    if (tabWorkflows) {
      Object.assign(workflows, tabWorkflows);
    }

    // Detectar acciones especiales del módulo
    const specialActions = this.detectSpecialActions(content, moduleId);
    if (specialActions) {
      Object.assign(workflows, specialActions);
    }

    return Object.keys(workflows).length > 0 ? workflows : null;
  }

  /**
   * Analiza archivo de servicio para detectar lógica de negocio
   */
  async analyzeServiceFile(moduleId) {
    const possibleNames = [
      `${moduleId}Service.js`,
      `${this.toCamelCase(moduleId)}Service.js`,
      `${moduleId.replace(/-/g, '')}Service.js`
    ];

    for (const fileName of possibleNames) {
      const filePath = path.join(this.servicesPath, fileName);
      if (fs.existsSync(filePath)) {
        return this.parseServiceWorkflows(filePath, moduleId);
      }
    }

    return null;
  }

  /**
   * Parsea workflows desde archivo de servicio
   */
  parseServiceWorkflows(filePath, moduleId) {
    const content = fs.readFileSync(filePath, 'utf8');
    const workflows = {};

    // Detectar métodos de negocio
    const methodRegex = /async\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let match;
    const businessMethods = [];

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      if (!methodName.startsWith('_') && !['constructor', 'init'].includes(methodName)) {
        businessMethods.push(methodName);
      }
    }

    // Crear workflows para métodos de negocio importantes
    for (const method of businessMethods) {
      if (this.isSignificantMethod(method)) {
        const workflowId = this.methodToWorkflowId(method);
        workflows[workflowId] = {
          type: 'BUSINESS_LOGIC',
          operation: method.toUpperCase(),
          name: this.humanize(method),
          description: `${this.humanize(method)} en ${this.humanize(moduleId)}`,
          method: method,
          steps: this.generateBusinessSteps(method, moduleId)
        };
      }
    }

    return Object.keys(workflows).length > 0 ? workflows : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERADORES DE PASOS
  // ═══════════════════════════════════════════════════════════════════════════

  generateCrudSteps(operation, moduleId) {
    const moduleName = this.humanize(moduleId);

    const steps = {
      create: [
        { step: 1, action: 'navigate', description: `Ir al módulo ${moduleName}` },
        { step: 2, action: 'click', description: 'Hacer clic en "Nuevo" o "Agregar"' },
        { step: 3, action: 'fill', description: 'Completar los campos requeridos del formulario' },
        { step: 4, action: 'validate', description: 'Verificar que no hay errores de validación' },
        { step: 5, action: 'submit', description: 'Hacer clic en "Guardar"' },
        { step: 6, action: 'verify', description: 'Confirmar que el registro aparece en la lista' }
      ],
      read: [
        { step: 1, action: 'navigate', description: `Ir al módulo ${moduleName}` },
        { step: 2, action: 'view', description: 'Ver la lista de registros' },
        { step: 3, action: 'filter', description: 'Usar filtros si es necesario' },
        { step: 4, action: 'click', description: 'Hacer clic en un registro para ver detalles' }
      ],
      update: [
        { step: 1, action: 'navigate', description: `Ir al módulo ${moduleName}` },
        { step: 2, action: 'select', description: 'Seleccionar el registro a editar' },
        { step: 3, action: 'click', description: 'Hacer clic en "Editar"' },
        { step: 4, action: 'modify', description: 'Modificar los campos necesarios' },
        { step: 5, action: 'submit', description: 'Hacer clic en "Guardar cambios"' },
        { step: 6, action: 'verify', description: 'Verificar que los cambios se guardaron' }
      ],
      delete: [
        { step: 1, action: 'navigate', description: `Ir al módulo ${moduleName}` },
        { step: 2, action: 'select', description: 'Seleccionar el registro a eliminar' },
        { step: 3, action: 'click', description: 'Hacer clic en "Eliminar"' },
        { step: 4, action: 'confirm', description: 'Confirmar la eliminación en el diálogo' },
        { step: 5, action: 'verify', description: 'Verificar que el registro ya no aparece' }
      ]
    };

    return steps[operation] || [];
  }

  generateApprovalSteps(moduleId) {
    const moduleName = this.humanize(moduleId);
    return [
      { step: 1, action: 'navigate', description: `Ir al módulo ${moduleName}` },
      { step: 2, action: 'filter', description: 'Filtrar por estado "Pendiente"' },
      { step: 3, action: 'select', description: 'Seleccionar el registro a aprobar' },
      { step: 4, action: 'review', description: 'Revisar los detalles del registro' },
      { step: 5, action: 'decide', description: 'Hacer clic en "Aprobar" o "Rechazar"' },
      { step: 6, action: 'comment', description: 'Agregar comentario si es requerido' },
      { step: 7, action: 'confirm', description: 'Confirmar la acción' }
    ];
  }

  generateExportSteps(moduleId) {
    const moduleName = this.humanize(moduleId);
    return [
      { step: 1, action: 'navigate', description: `Ir al módulo ${moduleName}` },
      { step: 2, action: 'filter', description: 'Aplicar filtros para los datos a exportar' },
      { step: 3, action: 'click', description: 'Hacer clic en "Exportar"' },
      { step: 4, action: 'select', description: 'Seleccionar formato (Excel, PDF, CSV)' },
      { step: 5, action: 'download', description: 'Descargar el archivo generado' }
    ];
  }

  generateImportSteps(moduleId) {
    const moduleName = this.humanize(moduleId);
    return [
      { step: 1, action: 'navigate', description: `Ir al módulo ${moduleName}` },
      { step: 2, action: 'click', description: 'Hacer clic en "Importar"' },
      { step: 3, action: 'download', description: 'Descargar plantilla si es necesario' },
      { step: 4, action: 'prepare', description: 'Preparar el archivo con los datos' },
      { step: 5, action: 'upload', description: 'Seleccionar y subir el archivo' },
      { step: 6, action: 'validate', description: 'Revisar validación de datos' },
      { step: 7, action: 'confirm', description: 'Confirmar la importación' }
    ];
  }

  generateBusinessSteps(method, moduleId) {
    return [
      { step: 1, action: 'prepare', description: `Preparar datos para ${this.humanize(method)}` },
      { step: 2, action: 'execute', description: `Ejecutar ${this.humanize(method)}` },
      { step: 3, action: 'verify', description: 'Verificar resultado de la operación' }
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECTORES
  // ═══════════════════════════════════════════════════════════════════════════

  detectRequiredFields(content, operation) {
    const fields = [];

    // Buscar validaciones Joi o similares
    const joiRegex = /\.required\(\)/g;
    const requiredRegex = /required:\s*true/g;
    const fieldNameRegex = /['"](\w+)['"]\s*:/g;

    // Buscar campos en el contexto
    let match;
    while ((match = fieldNameRegex.exec(content)) !== null) {
      const fieldName = match[1];
      if (!fields.includes(fieldName) && this.isUserField(fieldName)) {
        fields.push(fieldName);
      }
    }

    return fields.slice(0, 10); // Limitar a 10 campos
  }

  detectValidations(content) {
    const validations = [];

    if (content.includes('email') && content.includes('valid')) {
      validations.push({ field: 'email', type: 'email', message: 'Debe ser un email válido' });
    }
    if (content.includes('password') && content.includes('min')) {
      validations.push({ field: 'password', type: 'minLength', message: 'Mínimo 8 caracteres' });
    }
    if (content.includes('required')) {
      validations.push({ type: 'required', message: 'Campos obligatorios marcados con *' });
    }

    return validations;
  }

  detectFilters(content) {
    const filters = [];

    if (content.includes('status')) filters.push('status');
    if (content.includes('date') || content.includes('fecha')) filters.push('dateRange');
    if (content.includes('search') || content.includes('buscar')) filters.push('search');
    if (content.includes('department') || content.includes('departamento')) filters.push('department');
    if (content.includes('company') || content.includes('empresa')) filters.push('company');

    return filters;
  }

  detectApprovalStates(content) {
    const states = [];

    if (content.includes('pending') || content.includes('pendiente')) states.push('pending');
    if (content.includes('approved') || content.includes('aprobado')) states.push('approved');
    if (content.includes('rejected') || content.includes('rechazado')) states.push('rejected');
    if (content.includes('review') || content.includes('revisión')) states.push('in_review');

    return states.length > 0 ? states : ['pending', 'approved', 'rejected'];
  }

  detectExportFormats(content) {
    const formats = [];
    if (content.includes('xlsx') || content.includes('excel')) formats.push('excel');
    if (content.includes('pdf')) formats.push('pdf');
    if (content.includes('csv')) formats.push('csv');
    return formats.length > 0 ? formats : ['excel'];
  }

  detectImportFormats(content) {
    const formats = [];
    if (content.includes('xlsx') || content.includes('excel')) formats.push('excel');
    if (content.includes('csv')) formats.push('csv');
    return formats.length > 0 ? formats : ['excel', 'csv'];
  }

  detectFormWorkflows(content, moduleId) {
    const workflows = {};
    const moduleName = this.humanize(moduleId);

    // Detectar formularios de creación
    if (content.includes('handleSubmit') || content.includes('onSubmit')) {
      workflows['form_submit'] = {
        type: 'UI',
        operation: 'FORM_SUBMIT',
        name: `Enviar formulario de ${moduleName}`,
        description: `Completar y enviar formulario en ${moduleName}`,
        steps: [
          { step: 1, action: 'fill', description: 'Completar todos los campos requeridos' },
          { step: 2, action: 'validate', description: 'El sistema valida los datos ingresados' },
          { step: 3, action: 'submit', description: 'Enviar el formulario' },
          { step: 4, action: 'feedback', description: 'Ver mensaje de confirmación o error' }
        ]
      };
    }

    return workflows;
  }

  detectModalWorkflows(content, moduleId) {
    const workflows = {};
    const moduleName = this.humanize(moduleId);

    // Detectar modales de edición
    if (content.includes('editModal') || content.includes('Modal')) {
      workflows['modal_edit'] = {
        type: 'UI',
        operation: 'MODAL_EDIT',
        name: `Editar en modal - ${moduleName}`,
        description: `Usar modal para editar en ${moduleName}`,
        steps: [
          { step: 1, action: 'click', description: 'Hacer clic en el registro a editar' },
          { step: 2, action: 'wait', description: 'Esperar que cargue el modal' },
          { step: 3, action: 'modify', description: 'Realizar los cambios necesarios' },
          { step: 4, action: 'save', description: 'Guardar cambios' }
        ]
      };
    }

    return workflows;
  }

  detectTabWorkflows(content, moduleId) {
    if (!content.includes('tab') && !content.includes('Tab')) {
      return null;
    }

    const workflows = {};
    const moduleName = this.humanize(moduleId);

    workflows['tab_navigation'] = {
      type: 'UI',
      operation: 'TAB_NAVIGATION',
      name: `Navegar tabs - ${moduleName}`,
      description: `Usar navegación por tabs en ${moduleName}`,
      steps: [
        { step: 1, action: 'click', description: 'Hacer clic en el tab deseado' },
        { step: 2, action: 'wait', description: 'Esperar carga del contenido' },
        { step: 3, action: 'interact', description: 'Interactuar con el contenido del tab' }
      ]
    };

    return workflows;
  }

  detectSpecialActions(content, moduleId) {
    const workflows = {};
    const moduleName = this.humanize(moduleId);

    // Detectar calendario
    if (content.includes('calendar') || content.includes('Calendar')) {
      workflows['calendar_view'] = {
        type: 'UI',
        operation: 'CALENDAR',
        name: `Vista calendario - ${moduleName}`,
        description: `Usar vista de calendario en ${moduleName}`,
        steps: [
          { step: 1, action: 'navigate', description: 'Acceder a la vista de calendario' },
          { step: 2, action: 'select', description: 'Seleccionar fecha o rango' },
          { step: 3, action: 'view', description: 'Ver eventos o registros del período' }
        ]
      };
    }

    // Detectar búsqueda
    if (content.includes('search') || content.includes('Search')) {
      workflows['search'] = {
        type: 'UI',
        operation: 'SEARCH',
        name: `Buscar en ${moduleName}`,
        description: `Realizar búsquedas en ${moduleName}`,
        steps: [
          { step: 1, action: 'click', description: 'Hacer clic en el campo de búsqueda' },
          { step: 2, action: 'type', description: 'Escribir término de búsqueda' },
          { step: 3, action: 'wait', description: 'Ver resultados filtrados' }
        ]
      };
    }

    // Detectar reportes
    if (content.includes('report') || content.includes('Report')) {
      workflows['generate_report'] = {
        type: 'REPORT',
        operation: 'GENERATE',
        name: `Generar reporte - ${moduleName}`,
        description: `Generar reportes desde ${moduleName}`,
        steps: [
          { step: 1, action: 'configure', description: 'Configurar parámetros del reporte' },
          { step: 2, action: 'generate', description: 'Hacer clic en "Generar"' },
          { step: 3, action: 'download', description: 'Descargar o visualizar reporte' }
        ]
      };
    }

    // Detectar workflows HSE AI (PPE Detection)
    if (this.patterns.hseAI.ppeDetection.test(content)) {
      workflows['ppe_ai_detection'] = {
        type: 'AI_DETECTION',
        operation: 'PPE_DETECT',
        name: `Detección IA de EPP - ${moduleName}`,
        description: `Detección automática de Equipos de Protección Personal con Azure Custom Vision`,
        aiProvider: 'Azure Custom Vision',
        steps: [
          { step: 1, action: 'capture', description: 'Capturar imagen desde cámara o upload' },
          { step: 2, action: 'ai-analyze', description: 'Análisis automático con IA (Azure Custom Vision)' },
          { step: 3, action: 'review', description: 'Revisar detecciones y confianza' },
          { step: 4, action: 'decide', description: 'Confirmar, rechazar o escalar a caso HSE' }
        ],
        requiresConsent: true,
        gdprCompliant: true
      };
    }

    // Detectar workflows de casos HSE
    if (this.patterns.hseAI.hseCase.test(content)) {
      workflows['hse_case_management'] = {
        type: 'CASE_MANAGEMENT',
        operation: 'HSE_CASE',
        name: `Gestión de Casos HSE - ${moduleName}`,
        description: `Workflow de investigación de accidentes/enfermedades ocupacionales`,
        stages: ['PENDING_REVIEW', 'UNDER_INVESTIGATION', 'VERDICT_PENDING', 'TRAINING_ASSIGNED', 'SANCTION_APPLIED', 'CLOSED_CONFIRMED', 'CLOSED_UNCONFIRMED'],
        steps: [
          { step: 1, action: 'create', description: 'Crear caso desde detección IA, médico o reporte manual' },
          { step: 2, action: 'assign', description: 'Asignar investigador responsable' },
          { step: 3, action: 'investigate', description: 'Realizar investigación, agregar notas y evidencias' },
          { step: 4, action: 'verdict', description: 'Emitir veredicto y acciones correctivas' },
          { step: 5, action: 'close', description: 'Cerrar caso con resolución' }
        ]
      };
    }

    // Detectar workflows de consentimiento
    if (this.patterns.hseAI.consent.test(content)) {
      workflows['consent_management'] = {
        type: 'PRIVACY',
        operation: 'CONSENT',
        name: `Gestión de Consentimiento - ${moduleName}`,
        description: `Gestión de consentimientos para procesamiento de datos biométricos/IA`,
        privacyCompliant: true,
        alertModes: ['INDIVIDUAL', 'ANONYMOUS', 'AGGREGATE_ONLY'],
        steps: [
          { step: 1, action: 'read-terms', description: 'Leer términos y condiciones de privacidad' },
          { step: 2, action: 'select-preferences', description: 'Seleccionar preferencias de notificación' },
          { step: 3, action: 'confirm', description: 'Confirmar o revocar consentimiento' }
        ]
      };
    }

    // Detectar workflows de configuración de zonas HSE
    if (this.patterns.hseAI.zones.test(content)) {
      workflows['zone_configuration'] = {
        type: 'CONFIGURATION',
        operation: 'ZONE_CONFIG',
        name: `Configuración de Zonas HSE - ${moduleName}`,
        description: `Configurar zonas con EPP requeridos y umbrales de detección`,
        steps: [
          { step: 1, action: 'select-zone', description: 'Crear o seleccionar zona' },
          { step: 2, action: 'define-ppe', description: 'Definir EPP requeridos para la zona' },
          { step: 3, action: 'set-thresholds', description: 'Configurar umbrales de capacitación y sanción' },
          { step: 4, action: 'assign-cameras', description: 'Asignar cámaras para monitoreo' },
          { step: 5, action: 'activate', description: 'Activar zona para detección' }
        ]
      };
    }

    return Object.keys(workflows).length > 0 ? workflows : null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERACIÓN DE TUTORIALES
  // ═══════════════════════════════════════════════════════════════════════════

  generateTutorialsFromWorkflows(workflows, moduleName) {
    const tutorials = [];

    for (const [workflowId, workflow] of Object.entries(workflows)) {
      tutorials.push({
        id: `tutorial-${workflowId}`,
        title: workflow.name,
        description: workflow.description,
        workflowId: workflowId,
        workflowType: workflow.type,
        difficulty: this.estimateDifficulty(workflow),
        estimatedTime: this.estimateTime(workflow),
        steps: workflow.steps.map((step, idx) => ({
          ...step,
          tips: this.generateStepTips(step, workflow),
          warnings: this.generateStepWarnings(step, workflow)
        })),
        prerequisites: this.detectPrerequisites(workflow),
        relatedWorkflows: this.findRelatedWorkflows(workflowId, workflows),
        generatedAt: new Date().toISOString(),
        autoGenerated: true
      });
    }

    return tutorials;
  }

  estimateDifficulty(workflow) {
    const stepCount = workflow.steps?.length || 0;
    if (stepCount <= 3) return 'básico';
    if (stepCount <= 5) return 'intermedio';
    return 'avanzado';
  }

  estimateTime(workflow) {
    const stepCount = workflow.steps?.length || 0;
    const minutes = stepCount * 2; // ~2 minutos por paso
    return `${minutes} minutos`;
  }

  generateStepTips(step, workflow) {
    const tips = [];

    if (step.action === 'fill') {
      tips.push('Los campos marcados con * son obligatorios');
    }
    if (step.action === 'submit') {
      tips.push('Verifica los datos antes de guardar');
    }
    if (step.action === 'delete') {
      tips.push('Esta acción no se puede deshacer');
    }

    return tips;
  }

  generateStepWarnings(step, workflow) {
    const warnings = [];

    if (step.action === 'delete') {
      warnings.push('¡Atención! Los datos eliminados no se pueden recuperar');
    }
    if (workflow.type === 'APPROVAL' && step.action === 'decide') {
      warnings.push('Una vez aprobado/rechazado, no se puede cambiar el estado');
    }

    return warnings;
  }

  detectPrerequisites(workflow) {
    const prereqs = [];

    if (workflow.type === 'CRUD' && workflow.operation === 'UPDATE') {
      prereqs.push('Tener al menos un registro creado');
    }
    if (workflow.type === 'APPROVAL') {
      prereqs.push('Tener permisos de aprobación');
    }
    if (workflow.type === 'REPORT') {
      prereqs.push('Tener datos en el sistema');
    }

    return prereqs;
  }

  findRelatedWorkflows(workflowId, allWorkflows) {
    const related = [];

    // CRUD relacionados
    if (workflowId === 'create') {
      if (allWorkflows.read) related.push('read');
      if (allWorkflows.update) related.push('update');
    }
    if (workflowId === 'update' || workflowId === 'delete') {
      if (allWorkflows.read) related.push('read');
    }

    return related;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCIA EN BD
  // ═══════════════════════════════════════════════════════════════════════════

  async saveWorkflowsToDatabase(workflows) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const [moduleId, moduleData] of Object.entries(workflows)) {
        for (const [workflowId, workflow] of Object.entries(moduleData.workflows)) {
          // Generar ID único para el workflow
          const fullWorkflowKey = `${moduleId}-${workflowId}`;

          // Verificar si existe
          const exists = await client.query(
            'SELECT id FROM ecosystem_workflows WHERE workflow_key = $1',
            [fullWorkflowKey]
          );

          const tutorialContent = {
            difficulty: this.estimateDifficulty(workflow),
            estimatedTime: this.estimateTime(workflow),
            prerequisites: workflow.requiredFields || [],
            type: workflow.type,
            operation: workflow.operation
          };

          if (exists.rows.length > 0) {
            // Actualizar
            await client.query(`
              UPDATE ecosystem_workflows SET
                name = $1,
                description = $2,
                module_key = $3,
                trigger_type = $4,
                steps = $5,
                is_auto_generated = true,
                tutorial_enabled = true,
                tutorial_content = $6,
                updated_at = NOW()
              WHERE workflow_key = $7
            `, [
              workflow.name,
              workflow.description,
              moduleId,
              workflow.type,
              JSON.stringify(workflow.steps),
              JSON.stringify(tutorialContent),
              fullWorkflowKey
            ]);
          } else {
            // Insertar
            await client.query(`
              INSERT INTO ecosystem_workflows (
                id, workflow_key, name, description, module_key,
                trigger_type, steps, is_active, is_auto_generated,
                tutorial_enabled, tutorial_content, created_at, updated_at
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4,
                $5, $6, true, true,
                true, $7, NOW(), NOW()
              )
            `, [
              fullWorkflowKey,
              workflow.name,
              workflow.description,
              moduleId,
              workflow.type,
              JSON.stringify(workflow.steps),
              JSON.stringify(tutorialContent)
            ]);
          }
        }
      }

      await client.query('COMMIT');
      console.log('✅ Workflows saved to database');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving workflows:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API PARA AI ASSISTANT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene contexto de workflow para el AI Assistant
   */
  async getWorkflowContextForAssistant(moduleId, action = null) {
    const moduleWorkflows = this.workflowCache.get(moduleId);

    if (!moduleWorkflows) {
      await this.scanAllWorkflows();
    }

    const workflows = this.workflowCache.get(moduleId);

    if (!workflows) {
      return {
        found: false,
        message: `No se encontraron workflows para el módulo ${moduleId}`
      };
    }

    // Si se especifica acción, buscar workflow específico
    if (action) {
      const actionLower = action.toLowerCase();
      const matchingWorkflow = Object.entries(workflows.workflows).find(([key, wf]) => {
        return key.includes(actionLower) ||
               wf.operation?.toLowerCase().includes(actionLower) ||
               wf.name?.toLowerCase().includes(actionLower);
      });

      if (matchingWorkflow) {
        const [key, workflow] = matchingWorkflow;
        return {
          found: true,
          moduleId,
          moduleName: workflows.moduleName,
          workflow: workflow,
          tutorial: workflows.tutorials.find(t => t.workflowId === key),
          helpText: this.generateHelpText(workflow)
        };
      }
    }

    // Retornar todos los workflows del módulo
    return {
      found: true,
      moduleId,
      moduleName: workflows.moduleName,
      description: workflows.description,
      availableWorkflows: Object.keys(workflows.workflows),
      workflows: workflows.workflows,
      tutorials: workflows.tutorials,
      summary: this.generateModuleSummary(workflows)
    };
  }

  /**
   * Genera texto de ayuda para un workflow
   */
  generateHelpText(workflow) {
    let text = `## ${workflow.name}\n\n`;
    text += `${workflow.description}\n\n`;
    text += `### Pasos:\n`;

    for (const step of workflow.steps) {
      text += `${step.step}. ${step.description}\n`;
    }

    if (workflow.requiredFields?.length > 0) {
      text += `\n### Campos requeridos:\n`;
      text += workflow.requiredFields.map(f => `- ${this.humanize(f)}`).join('\n');
    }

    return text;
  }

  /**
   * Genera resumen del módulo
   */
  generateModuleSummary(moduleData) {
    const workflowCount = Object.keys(moduleData.workflows).length;
    const types = [...new Set(Object.values(moduleData.workflows).map(w => w.type))];

    return {
      totalWorkflows: workflowCount,
      workflowTypes: types,
      capabilities: Object.values(moduleData.workflows).map(w => w.operation),
      lastScanned: moduleData.lastScanned
    };
  }

  /**
   * Busca workflows relacionados con una pregunta
   */
  async searchWorkflowsByQuestion(question) {
    const keywords = question.toLowerCase().split(/\s+/);
    const results = [];

    // Asegurar que tenemos workflows cargados
    if (this.workflowCache.size === 0) {
      await this.scanAllWorkflows();
    }

    // Mapeo de palabras clave a operaciones
    const keywordMapping = {
      'crear': 'create', 'nuevo': 'create', 'agregar': 'create', 'añadir': 'create',
      'ver': 'read', 'consultar': 'read', 'listar': 'read', 'buscar': 'read',
      'editar': 'update', 'modificar': 'update', 'cambiar': 'update',
      'eliminar': 'delete', 'borrar': 'delete', 'quitar': 'delete',
      'aprobar': 'approval', 'rechazar': 'approval',
      'exportar': 'export', 'descargar': 'export',
      'importar': 'import', 'cargar': 'import', 'subir': 'import',
      // HSE AI keywords
      'epp': 'ppe_ai_detection', 'ppe': 'ppe_ai_detection',
      'casco': 'ppe_ai_detection', 'guantes': 'ppe_ai_detection', 'chaleco': 'ppe_ai_detection',
      'detectar': 'ppe_ai_detection', 'detección': 'ppe_ai_detection',
      'seguridad': 'hse_case_management', 'hse': 'hse_case_management',
      'accidente': 'hse_case_management', 'incidente': 'hse_case_management',
      'investigar': 'hse_case_management', 'investigación': 'hse_case_management',
      'veredicto': 'hse_case_management', 'caso': 'hse_case_management',
      'consentimiento': 'consent_management', 'privacidad': 'consent_management', 'gdpr': 'consent_management',
      'zona': 'zone_configuration', 'configurar': 'zone_configuration',
      'violación': 'ppe_ai_detection', 'sanción': 'hse_case_management',
      'capacitación': 'hse_case_management', 'ia': 'ppe_ai_detection', 'azure': 'ppe_ai_detection'
    };

    // Buscar en cada módulo
    for (const [moduleId, moduleData] of this.workflowCache.entries()) {
      for (const [workflowId, workflow] of Object.entries(moduleData.workflows)) {
        let score = 0;

        // Verificar coincidencia de keywords
        for (const keyword of keywords) {
          if (moduleId.includes(keyword)) score += 3;
          if (moduleData.moduleName.toLowerCase().includes(keyword)) score += 3;
          if (workflow.name.toLowerCase().includes(keyword)) score += 2;
          if (workflow.description?.toLowerCase().includes(keyword)) score += 1;

          // Verificar mapeo de operaciones
          if (keywordMapping[keyword] && workflowId.includes(keywordMapping[keyword])) {
            score += 5;
          }
        }

        if (score > 0) {
          results.push({
            moduleId,
            moduleName: moduleData.moduleName,
            workflowId,
            workflow,
            score,
            tutorial: moduleData.tutorials.find(t => t.workflowId === workflowId)
          });
        }
      }
    }

    // Ordenar por score y retornar top 5
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  humanize(str) {
    return str
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }

  isUserField(fieldName) {
    const systemFields = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'company_id', 'companyId'];
    return !systemFields.includes(fieldName);
  }

  isSignificantMethod(methodName) {
    const significantPrefixes = ['create', 'update', 'delete', 'get', 'find', 'process', 'approve', 'reject', 'calculate', 'generate', 'send', 'notify'];
    return significantPrefixes.some(prefix => methodName.toLowerCase().startsWith(prefix));
  }

  methodToWorkflowId(method) {
    return method.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }
}

// Singleton
const workflowIntrospectionService = new WorkflowIntrospectionService();
module.exports = workflowIntrospectionService;
