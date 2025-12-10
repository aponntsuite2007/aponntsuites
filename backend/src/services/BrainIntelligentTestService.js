/**
 * ============================================================================
 * BRAIN INTELLIGENT TEST SERVICE - Tests Generados por IA/Brain
 * ============================================================================
 *
 * Este servicio CONOCE EL CODIGO VIVO y genera tests inteligentes:
 * - Escanea formularios del frontend para saber qué campos existen
 * - Obtiene endpoints del Brain para saber qué API testear
 * - Detecta workflows de módulos (CRUD, validaciones, etc.)
 * - Genera tests dinámicos basados en el análisis del código
 *
 * NO es un testing semi-hardcodeado. TODO se genera desde el código vivo.
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

class BrainIntelligentTestService {
  constructor(brainService, database = null) {
    this.brainService = brainService;
    this.database = database;
    this.baseDir = path.join(__dirname, '../..');

    // Cache de análisis
    this.formCache = new Map();
    this.moduleTestPlanCache = new Map();
    this.cacheTimeout = 120000; // 2 minutos

    console.log('🧪 [BRAIN-TEST] BrainIntelligentTestService inicializado');
    console.log(`   Base directory: ${this.baseDir}`);
  }

  // =========================================================================
  // 1. ESCANEO DE FORMULARIOS FRONTEND (INTELIGENTE)
  // =========================================================================

  /**
   * Escanea archivos HTML para extraer información de formularios
   * Detecta: inputs, selects, textareas, botones de submit, modales
   */
  async scanFrontendForms() {
    console.log('\n🔍 [BRAIN-TEST] Escaneando formularios del frontend...');

    const publicDir = path.join(this.baseDir, 'public');
    const htmlFiles = this._findHtmlFiles(publicDir);

    const formsAnalysis = {
      scannedAt: new Date().toISOString(),
      totalFiles: htmlFiles.length,
      totalForms: 0,
      totalModals: 0,
      forms: [],
      byModule: {}
    };

    for (const htmlFile of htmlFiles) {
      try {
        const content = fs.readFileSync(htmlFile, 'utf8');
        const relativePath = path.relative(this.baseDir, htmlFile);
        const pageName = path.basename(htmlFile, '.html');

        // Extraer formularios
        const pageForms = this._extractFormsFromHtml(content, pageName);

        // Extraer modales (son formularios dentro de modales)
        const modals = this._extractModalsFromHtml(content, pageName);

        formsAnalysis.totalForms += pageForms.length;
        formsAnalysis.totalModals += modals.length;

        // Agregar a la lista
        for (const form of pageForms) {
          form.sourcePage = relativePath;
          formsAnalysis.forms.push(form);

          // Agrupar por módulo detectado
          const moduleKey = this._inferModuleFromForm(form);
          if (!formsAnalysis.byModule[moduleKey]) {
            formsAnalysis.byModule[moduleKey] = { forms: [], modals: [] };
          }
          formsAnalysis.byModule[moduleKey].forms.push(form);
        }

        for (const modal of modals) {
          modal.sourcePage = relativePath;
          modal.isModal = true;
          formsAnalysis.forms.push(modal);

          const moduleKey = this._inferModuleFromForm(modal);
          if (!formsAnalysis.byModule[moduleKey]) {
            formsAnalysis.byModule[moduleKey] = { forms: [], modals: [] };
          }
          formsAnalysis.byModule[moduleKey].modals.push(modal);
        }

      } catch (error) {
        console.error(`   ❌ Error escaneando ${htmlFile}:`, error.message);
      }
    }

    console.log(`   ✅ Encontrados: ${formsAnalysis.totalForms} forms, ${formsAnalysis.totalModals} modales`);
    console.log(`   📦 Módulos detectados: ${Object.keys(formsAnalysis.byModule).length}`);

    return formsAnalysis;
  }

  /**
   * Extrae formularios de HTML
   */
  _extractFormsFromHtml(html, pageName) {
    const forms = [];

    // Regex para encontrar formularios
    const formRegex = /<form[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/form>/gi;
    let match;

    while ((match = formRegex.exec(html)) !== null) {
      const formId = match[1];
      const formContent = match[2];

      forms.push({
        id: formId,
        type: 'form',
        pageName,
        fields: this._extractFieldsFromHtml(formContent),
        submitButton: this._findSubmitButton(formContent),
        action: this._extractAttribute(match[0], 'action'),
        method: this._extractAttribute(match[0], 'method') || 'POST'
      });
    }

    return forms;
  }

  /**
   * Extrae modales de HTML (contienen formularios)
   */
  _extractModalsFromHtml(html, pageName) {
    const modals = [];

    // Buscar divs con clase modal o data-modal
    const modalRegex = /<div[^>]*(?:class=["'][^"']*modal[^"']*["']|id=["']([^"']*(?:modal|Modal)[^"']*)["'])[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>)*(?=<(?:div|section|script)|$)/gi;
    let match;

    // Método alternativo: buscar por IDs comunes de modales
    const modalIdRegex = /id=["']([^"']*(?:modal|Modal|dialog|Dialog|popup|Popup)[^"']*)["'][^>]*>([\s\S]*?)(?=<div[^>]*id=["']|<script|$)/gi;

    while ((match = modalIdRegex.exec(html)) !== null) {
      const modalId = match[1];
      const modalContent = match[2];

      // Extraer campos del modal
      const fields = this._extractFieldsFromHtml(modalContent);

      // Solo agregar si tiene campos
      if (fields.length > 0) {
        modals.push({
          id: modalId,
          type: 'modal',
          pageName,
          fields: fields,
          submitButton: this._findSubmitButton(modalContent),
          cancelButton: this._findCancelButton(modalContent),
          title: this._extractModalTitle(modalContent)
        });
      }
    }

    return modals;
  }

  /**
   * Extrae campos de un fragmento HTML
   */
  _extractFieldsFromHtml(html) {
    const fields = [];

    // Inputs
    const inputRegex = /<input[^>]+>/gi;
    let match;
    while ((match = inputRegex.exec(html)) !== null) {
      const input = match[0];
      const type = this._extractAttribute(input, 'type') || 'text';
      const name = this._extractAttribute(input, 'name');
      const id = this._extractAttribute(input, 'id');

      if (name || id) {
        fields.push({
          elementType: 'input',
          type,
          name: name || id,
          id,
          required: input.includes('required'),
          placeholder: this._extractAttribute(input, 'placeholder'),
          pattern: this._extractAttribute(input, 'pattern'),
          minLength: this._extractAttribute(input, 'minlength'),
          maxLength: this._extractAttribute(input, 'maxlength'),
          min: this._extractAttribute(input, 'min'),
          max: this._extractAttribute(input, 'max'),
          dataType: this._inferDataType(type, name || id)
        });
      }
    }

    // Selects
    const selectRegex = /<select[^>]*(?:name=["']([^"']+)["']|id=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/select>/gi;
    while ((match = selectRegex.exec(html)) !== null) {
      const name = match[1] || match[2];
      const optionsHtml = match[3];
      const options = this._extractSelectOptions(optionsHtml);

      fields.push({
        elementType: 'select',
        type: 'select',
        name,
        id: this._extractAttribute(match[0], 'id'),
        required: match[0].includes('required'),
        options,
        optionCount: options.length,
        dataType: 'enum'
      });
    }

    // Textareas
    const textareaRegex = /<textarea[^>]*(?:name=["']([^"']+)["']|id=["']([^"']+)["'])[^>]*>/gi;
    while ((match = textareaRegex.exec(html)) !== null) {
      const name = match[1] || match[2];
      fields.push({
        elementType: 'textarea',
        type: 'textarea',
        name,
        id: this._extractAttribute(match[0], 'id'),
        required: match[0].includes('required'),
        dataType: 'text'
      });
    }

    return fields;
  }

  /**
   * Extrae opciones de un select
   */
  _extractSelectOptions(optionsHtml) {
    const options = [];
    const optionRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>([^<]*)</gi;
    let match;

    while ((match = optionRegex.exec(optionsHtml)) !== null) {
      options.push({
        value: match[1],
        label: match[2].trim()
      });
    }

    return options;
  }

  /**
   * Infiere el tipo de dato basado en el tipo de input y nombre
   */
  _inferDataType(inputType, name) {
    // Por tipo de input
    const typeMap = {
      'email': 'email',
      'password': 'password',
      'number': 'number',
      'date': 'date',
      'datetime-local': 'datetime',
      'time': 'time',
      'tel': 'phone',
      'url': 'url',
      'file': 'file',
      'checkbox': 'boolean',
      'radio': 'enum'
    };

    if (typeMap[inputType]) return typeMap[inputType];

    // Por nombre del campo
    const nameLower = (name || '').toLowerCase();
    if (nameLower.includes('email')) return 'email';
    if (nameLower.includes('phone') || nameLower.includes('tel')) return 'phone';
    if (nameLower.includes('date') || nameLower.includes('fecha')) return 'date';
    if (nameLower.includes('password') || nameLower.includes('clave')) return 'password';
    if (nameLower.includes('id') && !nameLower.includes('valid')) return 'id';
    if (nameLower.includes('name') || nameLower.includes('nombre')) return 'name';
    if (nameLower.includes('price') || nameLower.includes('precio') || nameLower.includes('amount')) return 'currency';
    if (nameLower.includes('count') || nameLower.includes('cantidad') || nameLower.includes('num')) return 'integer';

    return 'string';
  }

  /**
   * Infiere el módulo basado en el formulario
   */
  _inferModuleFromForm(form) {
    const id = (form.id || '').toLowerCase();
    const pageName = (form.pageName || '').toLowerCase();

    // Mapeo de patrones a módulos
    const patterns = {
      'user': ['user', 'usuario', 'empleado', 'employee'],
      'department': ['department', 'depart', 'dept', 'area'],
      'shift': ['shift', 'turno', 'horario', 'schedule'],
      'attendance': ['attendance', 'asistencia', 'marcaje', 'check'],
      'device': ['device', 'dispositivo', 'biometric', 'kiosk'],
      'company': ['company', 'empresa', 'organization'],
      'report': ['report', 'reporte', 'informe'],
      'vacation': ['vacation', 'vacacion', 'permiso', 'leave'],
      'medical': ['medical', 'medico', 'health', 'salud'],
      'notification': ['notification', 'notificacion', 'alert'],
      'job': ['job', 'posting', 'vacante', 'aplicacion', 'candidate']
    };

    for (const [module, keywords] of Object.entries(patterns)) {
      for (const keyword of keywords) {
        if (id.includes(keyword) || pageName.includes(keyword)) {
          return module;
        }
      }
    }

    // Extraer de campos del formulario
    for (const field of (form.fields || [])) {
      const fieldName = (field.name || '').toLowerCase();
      for (const [module, keywords] of Object.entries(patterns)) {
        for (const keyword of keywords) {
          if (fieldName.includes(keyword)) {
            return module;
          }
        }
      }
    }

    return 'unknown';
  }

  // =========================================================================
  // 2. GENERACIÓN DE PLAN DE TESTS (INTELIGENTE)
  // =========================================================================

  /**
   * Genera un plan de tests completo para un módulo
   * Combina: Brain data + Form scanning + CRUD detection
   */
  async generateModuleTestPlan(moduleKey) {
    console.log(`\n📋 [BRAIN-TEST] Generando plan de tests para: ${moduleKey}`);

    // 1. Obtener info del módulo desde el Brain
    let moduleInfo = null;
    try {
      const technicalModules = await this.brainService.getTechnicalModules();
      moduleInfo = technicalModules?.modules?.find(m =>
        m.key === moduleKey ||
        m.name?.toLowerCase().includes(moduleKey.toLowerCase()) ||
        m.routeFile?.includes(moduleKey)
      );
    } catch (e) {
      console.log(`   ⚠️ Error obteniendo info del Brain: ${e.message}`);
    }

    // 2. Escanear formularios relacionados
    const formsAnalysis = await this.scanFrontendForms();
    const moduleForms = formsAnalysis.byModule[moduleKey] || { forms: [], modals: [] };

    // 3. Construir plan de tests
    const testPlan = {
      moduleKey,
      generatedAt: new Date().toISOString(),
      source: 'brain-intelligent',

      // Info del módulo desde Brain
      moduleInfo: moduleInfo ? {
        name: moduleInfo.name,
        routeFile: moduleInfo.routeFile,
        endpoints: moduleInfo.endpoints || [],
        crudAnalysis: moduleInfo.crudAnalysis,
        status: moduleInfo.status,
        completeness: moduleInfo.completeness
      } : null,

      // Forms detectados
      forms: {
        total: moduleForms.forms.length + moduleForms.modals.length,
        regular: moduleForms.forms.length,
        modals: moduleForms.modals.length,
        details: [...moduleForms.forms, ...moduleForms.modals]
      },

      // Tests a ejecutar (generados dinámicamente)
      tests: []
    };

    // 4. Generar tests basados en endpoints
    if (moduleInfo?.endpoints) {
      for (const endpoint of moduleInfo.endpoints) {
        testPlan.tests.push(this._generateEndpointTest(endpoint, moduleKey));
      }
    }

    // 5. Generar tests de formularios
    for (const form of [...moduleForms.forms, ...moduleForms.modals]) {
      testPlan.tests.push(this._generateFormTest(form, moduleKey));
    }

    // 6. Generar tests CRUD si el Brain detectó CRUD
    if (moduleInfo?.crudAnalysis) {
      const crudTests = this._generateCrudTests(moduleInfo.crudAnalysis, moduleKey, moduleForms);
      testPlan.tests.push(...crudTests);
    }

    // 7. Generar tests de validación basados en campos required
    const validationTests = this._generateValidationTests(moduleForms, moduleKey);
    testPlan.tests.push(...validationTests);

    console.log(`   ✅ Plan generado: ${testPlan.tests.length} tests`);
    console.log(`   📡 Endpoints: ${moduleInfo?.endpoints?.length || 0}`);
    console.log(`   📝 Forms: ${testPlan.forms.total}`);

    return testPlan;
  }

  /**
   * Genera test para un endpoint específico
   */
  _generateEndpointTest(endpoint, moduleKey) {
    const method = (endpoint.method || 'GET').toUpperCase();
    const path = endpoint.path || endpoint.route;

    return {
      id: `${moduleKey}-api-${method.toLowerCase()}-${this._slugify(path)}`,
      type: 'api',
      category: 'endpoint',
      name: `API ${method} ${path}`,
      description: `Verificar que el endpoint ${method} ${path} responde correctamente`,

      // Configuración del test
      config: {
        method,
        path,
        expectedStatus: method === 'GET' ? 200 : [200, 201],
        requiresAuth: endpoint.requiresAuth !== false,
        timeout: 10000
      },

      // Datos de prueba (generados dinámicamente)
      testData: this._generateTestDataForEndpoint(endpoint, moduleKey),

      // Validaciones
      validations: [
        { type: 'status', expected: method === 'GET' ? 200 : 'success' },
        { type: 'responseType', expected: 'json' },
        { type: 'hasField', field: 'success' }
      ],

      priority: method === 'GET' ? 'high' : 'medium',
      estimatedDuration: 2000
    };
  }

  /**
   * Genera test para un formulario
   */
  _generateFormTest(form, moduleKey) {
    const isModal = form.isModal || form.type === 'modal';

    return {
      id: `${moduleKey}-form-${this._slugify(form.id)}`,
      type: 'e2e',
      category: isModal ? 'modal-form' : 'form',
      name: `${isModal ? 'Modal' : 'Form'}: ${form.id}`,
      description: `Testear formulario ${form.id} con ${form.fields?.length || 0} campos`,

      // Configuración del test
      config: {
        formId: form.id,
        isModal,
        sourcePage: form.sourcePage,
        fieldCount: form.fields?.length || 0
      },

      // Campos a completar con datos de prueba
      fields: form.fields?.map(field => ({
        name: field.name,
        type: field.type,
        dataType: field.dataType,
        required: field.required,
        testValue: this._generateTestValue(field),
        selector: field.id ? `#${field.id}` : `[name="${field.name}"]`
      })) || [],

      // Acciones del test
      actions: [
        ...(isModal ? [{ action: 'openModal', selector: this._guessModalTrigger(form) }] : []),
        { action: 'fillForm', fields: 'auto' },
        { action: 'submitForm', selector: form.submitButton?.selector || 'button[type="submit"]' },
        { action: 'waitForResponse', timeout: 5000 },
        { action: 'verifySuccess' }
      ],

      priority: form.fields?.some(f => f.required) ? 'high' : 'medium',
      estimatedDuration: 5000
    };
  }

  /**
   * Genera tests CRUD basados en análisis del Brain
   */
  _generateCrudTests(crudAnalysis, moduleKey, forms) {
    const tests = [];

    if (crudAnalysis.hasCreate) {
      tests.push({
        id: `${moduleKey}-crud-create`,
        type: 'e2e',
        category: 'crud',
        name: `CRUD Create: ${moduleKey}`,
        description: `Crear un nuevo registro en ${moduleKey}`,
        workflow: 'create',
        steps: [
          { action: 'navigate', to: crudAnalysis.createEndpoint || `/api/${moduleKey}` },
          { action: 'openCreateForm' },
          { action: 'fillRequiredFields' },
          { action: 'submit' },
          { action: 'verifyCreated' }
        ],
        priority: 'critical',
        estimatedDuration: 8000
      });
    }

    if (crudAnalysis.hasRead) {
      tests.push({
        id: `${moduleKey}-crud-read`,
        type: 'api',
        category: 'crud',
        name: `CRUD Read: ${moduleKey}`,
        description: `Leer registros de ${moduleKey}`,
        workflow: 'read',
        config: {
          method: 'GET',
          path: crudAnalysis.readEndpoint || `/api/${moduleKey}`,
          expectedStatus: 200
        },
        priority: 'high',
        estimatedDuration: 2000
      });
    }

    if (crudAnalysis.hasUpdate) {
      tests.push({
        id: `${moduleKey}-crud-update`,
        type: 'e2e',
        category: 'crud',
        name: `CRUD Update: ${moduleKey}`,
        description: `Actualizar un registro en ${moduleKey}`,
        workflow: 'update',
        steps: [
          { action: 'selectExisting' },
          { action: 'openEditForm' },
          { action: 'modifyField' },
          { action: 'submit' },
          { action: 'verifyUpdated' }
        ],
        priority: 'high',
        estimatedDuration: 8000
      });
    }

    if (crudAnalysis.hasDelete) {
      tests.push({
        id: `${moduleKey}-crud-delete`,
        type: 'e2e',
        category: 'crud',
        name: `CRUD Delete: ${moduleKey}`,
        description: `Eliminar un registro en ${moduleKey}`,
        workflow: 'delete',
        steps: [
          { action: 'selectExisting' },
          { action: 'clickDelete' },
          { action: 'confirmDelete' },
          { action: 'verifyDeleted' }
        ],
        priority: 'medium',
        estimatedDuration: 5000
      });
    }

    return tests;
  }

  /**
   * Genera tests de validación basados en campos required
   */
  _generateValidationTests(forms, moduleKey) {
    const tests = [];
    const allForms = [...(forms.forms || []), ...(forms.modals || [])];

    for (const form of allForms) {
      const requiredFields = form.fields?.filter(f => f.required) || [];

      if (requiredFields.length > 0) {
        // Test: enviar form vacío
        tests.push({
          id: `${moduleKey}-validation-empty-${this._slugify(form.id)}`,
          type: 'e2e',
          category: 'validation',
          name: `Validación: ${form.id} - campos vacíos`,
          description: `Verificar que no se puede enviar ${form.id} con campos requeridos vacíos`,
          config: {
            formId: form.id,
            requiredFields: requiredFields.map(f => f.name)
          },
          expectedBehavior: 'shouldFail',
          priority: 'high',
          estimatedDuration: 3000
        });

        // Test: validación de tipos
        const fieldsWithPatterns = form.fields?.filter(f => f.pattern || f.type === 'email') || [];
        for (const field of fieldsWithPatterns) {
          tests.push({
            id: `${moduleKey}-validation-${this._slugify(field.name)}`,
            type: 'e2e',
            category: 'validation',
            name: `Validación: ${field.name} - formato inválido`,
            description: `Verificar validación de formato para ${field.name}`,
            config: {
              formId: form.id,
              fieldName: field.name,
              invalidValue: this._generateInvalidValue(field)
            },
            expectedBehavior: 'shouldShowError',
            priority: 'medium',
            estimatedDuration: 2000
          });
        }
      }
    }

    return tests;
  }

  // =========================================================================
  // 3. GENERACIÓN DE DATOS DE PRUEBA (INTELIGENTE)
  // =========================================================================

  /**
   * Genera valor de prueba basado en el tipo de campo
   */
  _generateTestValue(field) {
    const dataType = field.dataType || this._inferDataType(field.type, field.name);
    const timestamp = Date.now();

    const generators = {
      'email': () => `test.${timestamp}@example.com`,
      'password': () => 'TestPass123!',
      'name': () => `Test User ${timestamp}`,
      'phone': () => '+1234567890',
      'date': () => new Date().toISOString().split('T')[0],
      'datetime': () => new Date().toISOString(),
      'time': () => '09:00',
      'number': () => Math.floor(Math.random() * 100),
      'integer': () => Math.floor(Math.random() * 100),
      'currency': () => (Math.random() * 1000).toFixed(2),
      'boolean': () => true,
      'url': () => 'https://example.com',
      'text': () => `Texto de prueba generado ${timestamp}`,
      'string': () => `Test ${timestamp}`,
      'id': () => null, // IDs usualmente se autogeneran
      'enum': () => field.options?.[0]?.value || 'option1'
    };

    return generators[dataType]?.() || `Test ${timestamp}`;
  }

  /**
   * Genera valor inválido para pruebas de validación
   */
  _generateInvalidValue(field) {
    const dataType = field.dataType || field.type;

    const invalidValues = {
      'email': 'not-an-email',
      'phone': 'abc123',
      'date': 'not-a-date',
      'number': 'not-a-number',
      'url': 'not-a-url'
    };

    return invalidValues[dataType] || '';
  }

  /**
   * Genera datos de prueba para un endpoint
   */
  _generateTestDataForEndpoint(endpoint, moduleKey) {
    const method = (endpoint.method || 'GET').toUpperCase();

    if (method === 'GET' || method === 'DELETE') {
      return null; // No necesitan body
    }

    // Para POST/PUT, generar datos basados en el módulo
    const dataTemplates = {
      'user': { name: 'Test User', email: 'test@example.com', role: 'user' },
      'department': { name: 'Test Dept', code: 'TEST' },
      'shift': { name: 'Test Shift', start_time: '09:00', end_time: '18:00' },
      'company': { name: 'Test Company', slug: 'test-company' },
      'attendance': { user_id: 1, check_type: 'in' },
      'device': { name: 'Test Device', serial_number: 'TEST001' }
    };

    return dataTemplates[moduleKey] || { test: true };
  }

  // =========================================================================
  // 4. EJECUCIÓN DE TESTS (ORQUESTACIÓN)
  // =========================================================================

  /**
   * Ejecuta el plan de tests de un módulo
   * Conecta con el infrastructure existente (visibleTesting, Phase4)
   */
  async executeModuleTests(moduleKey, options = {}) {
    console.log(`\n🚀 [BRAIN-TEST] Ejecutando tests inteligentes para: ${moduleKey}`);

    const testPlan = await this.generateModuleTestPlan(moduleKey);

    const executionId = `brain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const execution = {
      id: executionId,
      moduleKey,
      startedAt: new Date().toISOString(),
      testPlan,
      results: [],
      status: 'running',
      progress: 0
    };

    // Ejecutar tests en orden de prioridad
    const sortedTests = testPlan.tests.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priority[a.priority] || 3) - (priority[b.priority] || 3);
    });

    for (let i = 0; i < sortedTests.length; i++) {
      const test = sortedTests[i];
      execution.progress = Math.round((i / sortedTests.length) * 100);

      try {
        const result = await this._executeTest(test, options);
        execution.results.push({
          testId: test.id,
          testName: test.name,
          ...result
        });
      } catch (error) {
        execution.results.push({
          testId: test.id,
          testName: test.name,
          status: 'error',
          error: error.message
        });
      }
    }

    execution.status = 'completed';
    execution.progress = 100;
    execution.completedAt = new Date().toISOString();
    execution.summary = this._summarizeResults(execution.results);

    return execution;
  }

  /**
   * Ejecuta un test individual
   */
  async _executeTest(test, options = {}) {
    const startTime = Date.now();

    if (test.type === 'api') {
      return this._executeApiTest(test, options);
    } else if (test.type === 'e2e') {
      return this._executeE2ETest(test, options);
    }

    return {
      status: 'skipped',
      reason: `Test type '${test.type}' not implemented`,
      duration: Date.now() - startTime
    };
  }

  /**
   * Ejecuta test de API
   */
  async _executeApiTest(test, options = {}) {
    const startTime = Date.now();
    const config = test.config || {};

    try {
      // Usar fetch para testear el endpoint
      const baseUrl = options.baseUrl || 'http://localhost:9998';
      const url = `${baseUrl}${config.path}`;

      const fetchOptions = {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.authToken ? { 'Authorization': `Bearer ${options.authToken}` } : {})
        }
      };

      if (test.testData && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        fetchOptions.body = JSON.stringify(test.testData);
      }

      // En el servidor, no podemos usar fetch directamente
      // Retornamos un plan de ejecución para el cliente
      return {
        status: 'pending',
        type: 'api',
        executeOn: 'client',
        config: {
          url,
          ...fetchOptions
        },
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Ejecuta test E2E (retorna instrucciones para Playwright)
   */
  async _executeE2ETest(test, options = {}) {
    const startTime = Date.now();

    // Los tests E2E se ejecutan via visibleTestingRoutes
    // Aquí generamos las instrucciones
    return {
      status: 'pending',
      type: 'e2e',
      executeOn: 'playwright',
      instructions: {
        formId: test.config?.formId,
        fields: test.fields,
        actions: test.actions,
        expectedBehavior: test.expectedBehavior
      },
      duration: Date.now() - startTime
    };
  }

  /**
   * Resume los resultados de los tests
   */
  _summarizeResults(results) {
    return {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      errors: results.filter(r => r.status === 'error').length,
      pending: results.filter(r => r.status === 'pending').length,
      skipped: results.filter(r => r.status === 'skipped').length
    };
  }

  // =========================================================================
  // UTILIDADES
  // =========================================================================

  _findHtmlFiles(dir) {
    const files = [];
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && item.endsWith('.html')) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      console.error(`Error escaneando ${dir}:`, e.message);
    }
    return files;
  }

  _extractAttribute(html, attr) {
    const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
  }

  _findSubmitButton(html) {
    const submitRegex = /<button[^>]*type=["']submit["'][^>]*>([^<]*)</i;
    const match = html.match(submitRegex);
    if (match) {
      return { text: match[1], selector: 'button[type="submit"]' };
    }
    return null;
  }

  _findCancelButton(html) {
    const cancelRegex = /<button[^>]*(?:class=["'][^"']*cancel[^"']*["']|data-dismiss)[^>]*>([^<]*)</i;
    const match = html.match(cancelRegex);
    return match ? { text: match[1] } : null;
  }

  _extractModalTitle(html) {
    const titleRegex = /<(?:h[1-6]|div)[^>]*class=["'][^"']*(?:modal-title|title)[^"']*["'][^>]*>([^<]*)</i;
    const match = html.match(titleRegex);
    return match ? match[1].trim() : null;
  }

  _guessModalTrigger(form) {
    const formId = form.id || '';
    // Buscar botón que abra este modal
    return `[data-target="#${formId}"], [onclick*="${formId}"], button[data-modal="${formId}"]`;
  }

  _slugify(text) {
    return (text || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // =========================================================================
  // API PÚBLICA PARA EL DASHBOARD
  // =========================================================================

  /**
   * Obtiene resumen de capacidades de testing por módulo
   */
  async getTestingCapabilities() {
    console.log('\n📊 [BRAIN-TEST] Obteniendo capacidades de testing...');

    const formsAnalysis = await this.scanFrontendForms();
    let brainModules = [];

    try {
      const technicalData = await this.brainService.getTechnicalModules();
      brainModules = technicalData?.modules || [];
    } catch (e) {
      console.log(`   ⚠️ Error obteniendo módulos del Brain: ${e.message}`);
    }

    const capabilities = {
      totalModules: Object.keys(formsAnalysis.byModule).length,
      totalForms: formsAnalysis.totalForms,
      totalModals: formsAnalysis.totalModals,
      brainModulesCount: brainModules.length,
      modules: {}
    };

    // Combinar info de Brain + Forms
    for (const [moduleKey, forms] of Object.entries(formsAnalysis.byModule)) {
      const brainModule = brainModules.find(m =>
        m.key === moduleKey ||
        m.name?.toLowerCase().includes(moduleKey)
      );

      capabilities.modules[moduleKey] = {
        forms: forms.forms?.length || 0,
        modals: forms.modals?.length || 0,
        endpoints: brainModule?.endpoints?.length || 0,
        hasCrud: brainModule?.crudAnalysis?.isComplete || false,
        status: brainModule?.status || 'unknown',
        canTest: true,
        testTypes: [
          ...(brainModule?.endpoints?.length ? ['api'] : []),
          ...((forms.forms?.length || forms.modals?.length) ? ['e2e'] : []),
          ...(brainModule?.crudAnalysis?.isComplete ? ['crud'] : [])
        ]
      };
    }

    // Agregar módulos del Brain que no tienen forms
    for (const brainModule of brainModules) {
      const key = brainModule.key || this._slugify(brainModule.name);
      if (!capabilities.modules[key]) {
        capabilities.modules[key] = {
          forms: 0,
          modals: 0,
          endpoints: brainModule.endpoints?.length || 0,
          hasCrud: brainModule.crudAnalysis?.isComplete || false,
          status: brainModule.status || 'unknown',
          canTest: (brainModule.endpoints?.length || 0) > 0,
          testTypes: brainModule.endpoints?.length ? ['api'] : []
        };
      }
    }

    return capabilities;
  }
}

module.exports = BrainIntelligentTestService;
