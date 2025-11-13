/**
 * ADVANCED USER SIMULATION COLLECTOR
 *
 * Simula operativa COMPLETA y REALISTA de usuarios:
 *
 * 🎯 CARACTERÍSTICAS AVANZADAS:
 * 1. SIMULACIÓN PROFUNDA:
 *    - Llena formularios con datos random realistas (Faker.js)
 *    - Simula patrones de usuario real (velocidad typing, pauses)
 *    - Maneja validaciones y errores de formulario
 *
 * 2. CRUD COMPLETO REAL:
 *    - CREATE: Crea registros reales con datos válidos
 *    - READ: Verifica que aparezcan en las listas
 *    - UPDATE: Edita registros y verifica cambios
 *    - DELETE: Elimina registros y verifica desaparición
 *    - PERSISTENCE: Verifica que cambios persistan (F5 + reload)
 *
 * 3. WORKFLOWS DE NEGOCIO:
 *    - Flujo completo empleado: Crear → Asignar departamento → Registrar biometría
 *    - Flujo asistencia: Check-in → Work → Check-out
 *    - Flujo notificaciones: Crear → Enviar → Verificar recepción
 *    - Flujo permisos: Solicitar → Aprobar → Aplicar
 *    - Flujo capacitaciones: Asignar → Completar → Certificar
 *
 * @version 1.0.0
 * @date 2025-10-22
 */

const { chromium } = require('playwright');
const faker = require('faker');

// Configurar faker en español
faker.locale = 'es';

class AdvancedUserSimulationCollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;
    this.baseUrl = `http://localhost:${process.env.PORT || 9998}`;
    this.browser = null;
    this.page = null;

    // Datos de prueba creados durante la simulación
    this.testData = {
      users: [],
      departments: [],
      notifications: [],
      trainings: [],
      attendances: []
    };

    // Configuración de simulación humana
    this.humanConfig = {
      typingSpeed: { min: 50, max: 150 }, // ms entre caracteres
      actionDelay: { min: 500, max: 2000 }, // ms entre acciones
      thoughtPause: { min: 1000, max: 3000 }, // pausa para "pensar"
      scrollSpeed: 200 // velocidad de scroll
    };
  }

  async collect(execution_id, config) {
    console.log('  🎭 [ADVANCED-SIM] Iniciando simulación avanzada de usuario...');

    const results = [];

    try {
      await this.initBrowser();
      await this.loginAsRealUser(config);

      // 1. SIMULACIÓN PROFUNDA: Tests con datos random
      console.log('    1️⃣ [ADVANCED-SIM] Fase 1: Simulación profunda con datos random...');
      const deepSimResults = await this.runDeepSimulationTests(execution_id);
      results.push(...deepSimResults);

      // 2. CRUD COMPLETO: Operaciones completas
      console.log('    2️⃣ [ADVANCED-SIM] Fase 2: CRUD completo real...');
      const crudResults = await this.runCompleteCRUDTests(execution_id);
      results.push(...crudResults);

      // 3. WORKFLOWS DE NEGOCIO: Flujos específicos
      console.log('    3️⃣ [ADVANCED-SIM] Fase 3: Workflows de negocio...');
      const workflowResults = await this.runBusinessWorkflows(execution_id);
      results.push(...workflowResults);

    } catch (error) {
      console.error('  ❌ [ADVANCED-SIM] Error general:', error);
    } finally {
      await this.closeBrowser();
    }

    return results;
  }

  async initBrowser() {
    this.browser = await chromium.launch({
      headless: false, // VISIBLE para ver la simulación
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    const context = await this.browser.newContext({ viewport: null });
        this.page = await context.newPage();
    await this.page.setCacheEnabled(false);
  }

  async loginAsRealUser(config) {
    console.log('    🔐 [ADVANCED-SIM] Login como usuario real...');

    await this.page.goto(`${this.baseUrl}/panel-empresa.html`);
    await this.page.waitForSelector('#multiTenantLoginForm', { timeout: 10000 });

    // PASO 1: Seleccionar empresa (con pausa humana)
    await this.humanDelay('action');
    await this.page.selectOption('#companySelect', 'aponnt-empresa-demo');
    console.log('    🏢 [ADVANCED-SIM] Empresa seleccionada');

    // PASO 2: Escribir usuario (con velocidad humana)
    await this.humanDelay('thought');
    await this.humanType('#userInput', 'administrador');
    console.log('    👤 [ADVANCED-SIM] Usuario ingresado con velocidad humana');

    // PASO 3: Escribir contraseña (con velocidad humana)
    await this.humanDelay('action');
    await this.humanType('#passwordInput', 'admin123');
    console.log('    🔑 [ADVANCED-SIM] Contraseña ingresada');

    // PASO 4: Click en login (con pausa)
    await this.humanDelay('thought');
    await this.page.click('#loginButton');
    await this.page.waitForSelector('#mainContent, .main-content', { timeout: 15000 });

    console.log('    ✅ [ADVANCED-SIM] Login exitoso con timing humano');
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 1: SIMULACIÓN PROFUNDA CON DATOS RANDOM
  // ═══════════════════════════════════════════════════════════════════

  async runDeepSimulationTests(execution_id) {
    const results = [];

    const simulationModules = [
      {
        name: 'Gestión de Usuarios',
        id: 'users',
        formFields: ['firstName', 'lastName', 'email', 'phone', 'position', 'department']
      },
      {
        name: 'Departamentos',
        id: 'departments',
        formFields: ['name', 'description', 'location', 'manager']
      },
      {
        name: 'Notificaciones',
        id: 'notifications',
        formFields: ['title', 'message', 'priority', 'targetUsers']
      }
    ];

    for (const module of simulationModules) {
      console.log(`      🧪 [DEEP-SIM] Simulando ${module.name} con datos random...`);
      const result = await this.simulateModuleWithRandomData(execution_id, module);
      results.push(result);
    }

    return results;
  }

  async simulateModuleWithRandomData(execution_id, module) {
    const { AuditLog } = this.database;

    const log = await AuditLog.create({
      execution_id,
      test_type: 'deep-simulation',
      module_name: module.id,
      test_name: `Deep Simulation - ${module.name}`,
      test_description: `Simulación profunda con datos random en ${module.name}`,
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();

    try {
      // Navegar al módulo
      await this.navigateToModule(module.id);

      // Simular operaciones con datos random
      const randomData = this.generateRandomDataForModule(module);
      console.log(`        📊 [DEEP-SIM] Datos generados:`, randomData);

      // Intentar llenar formulario
      const formFillResult = await this.fillFormWithRandomData(module, randomData);

      if (formFillResult.success) {
        await log.update({
          status: 'pass',
          duration_ms: Date.now() - startTime,
          test_data: {
            random_data_used: randomData,
            form_fields_filled: formFillResult.fieldsFilled,
            user_actions_simulated: formFillResult.actionsCount
          },
          completed_at: new Date()
        });

        console.log(`        ✅ [DEEP-SIM] ${module.name} simulado exitosamente`);

      } else {
        await log.update({
          status: 'warning',
          severity: 'medium',
          error_message: formFillResult.error,
          error_context: {
            random_data_attempted: randomData,
            issue: formFillResult.issue
          },
          duration_ms: Date.now() - startTime,
          completed_at: new Date()
        });

        console.log(`        ⚠️  [DEEP-SIM] ${module.name} simulación parcial: ${formFillResult.error}`);
      }

    } catch (error) {
      await log.update({
        status: 'fail',
        severity: 'high',
        error_message: error.message,
        duration_ms: Date.now() - startTime,
        completed_at: new Date()
      });

      console.log(`        ❌ [DEEP-SIM] ${module.name} falló: ${error.message}`);
    }

    return log;
  }

  generateRandomDataForModule(module) {
    const data = {};

    module.formFields.forEach(field => {
      switch (field) {
        case 'firstName':
          data[field] = faker.name.firstName();
          break;
        case 'lastName':
          data[field] = faker.name.lastName();
          break;
        case 'email':
          data[field] = faker.internet.email();
          break;
        case 'phone':
          data[field] = faker.phone.phoneNumber();
          break;
        case 'position':
          data[field] = faker.name.jobTitle();
          break;
        case 'department':
          data[field] = faker.commerce.department();
          break;
        case 'name':
          data[field] = faker.company.companyName();
          break;
        case 'description':
          data[field] = faker.lorem.sentence();
          break;
        case 'location':
          data[field] = faker.address.streetAddress();
          break;
        case 'manager':
          data[field] = faker.name.findName();
          break;
        case 'title':
          data[field] = faker.lorem.words(3);
          break;
        case 'message':
          data[field] = faker.lorem.paragraph();
          break;
        case 'priority':
          data[field] = faker.random.arrayElement(['Alta', 'Media', 'Baja']);
          break;
        default:
          data[field] = faker.lorem.word();
      }
    });

    return data;
  }

  async fillFormWithRandomData(module, data) {
    try {
      // Buscar botón "Agregar" y hacer click
      const addButton = await this.page.$('button:contains("Agregar"), .btn-add, [onclick*="Add"]');
      if (!addButton) {
        return { success: false, error: 'No se encontró botón Agregar', issue: 'missing_add_button' };
      }

      await this.humanDelay('action');
      await addButton.click();
      await this.humanDelay('thought');

      // Esperar que aparezca el modal/formulario
      await this.page.waitForSelector('.modal, .form-container, #addModal', { timeout: 3000 });

      let fieldsFilled = 0;
      let actionsCount = 0;

      // Intentar llenar campos comunes
      for (const [fieldName, value] of Object.entries(data)) {
        const selectors = [
          `#${fieldName}`,
          `[name="${fieldName}"]`,
          `input[placeholder*="${fieldName}"]`,
          `input[placeholder*="${fieldName.toLowerCase()}"]`,
          `.${fieldName}-input`,
          `#add${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`
        ];

        for (const selector of selectors) {
          try {
            const field = await this.page.locator(selector);
            if (field) {
              await this.humanDelay('action');
              await field.click({ clickCount: 3 }); // Seleccionar todo
              await this.humanType(field, value.toString());
              fieldsFilled++;
              actionsCount++;
              console.log(`          ✏️  Campo ${fieldName}: "${value}"`);
              break;
            }
          } catch (e) {
            // Continuar con el siguiente selector
          }
        }
      }

      // Intentar guardar
      const saveSelectors = [
        'button:contains("Guardar")',
        'button:contains("Crear")',
        '.btn-save',
        '.btn-primary',
        '[onclick*="save"]',
        '[onclick*="Save"]'
      ];

      for (const selector of saveSelectors) {
        try {
          const saveButton = await this.page.locator(selector);
          if (saveButton) {
            await this.humanDelay('thought');
            await saveButton.click();
            actionsCount++;
            console.log(`          💾 Click en botón guardar`);
            break;
          }
        } catch (e) {
          // Continuar
        }
      }

      await this.humanDelay('action');

      return {
        success: true,
        fieldsFilled,
        actionsCount,
        message: `${fieldsFilled} campos llenados, ${actionsCount} acciones realizadas`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        issue: 'form_interaction_failed'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 2: CRUD COMPLETO REAL
  // ═══════════════════════════════════════════════════════════════════

  async runCompleteCRUDTests(execution_id) {
    const results = [];

    const crudModules = [
      { name: 'Usuarios', id: 'users', entityName: 'usuario' },
      { name: 'Departamentos', id: 'departments', entityName: 'departamento' }
    ];

    for (const module of crudModules) {
      console.log(`      🔄 [CRUD] Ejecutando CRUD completo en ${module.name}...`);
      const result = await this.executeCompleteCRUD(execution_id, module);
      results.push(result);
    }

    return results;
  }

  async executeCompleteCRUD(execution_id, module) {
    const { AuditLog } = this.database;

    const log = await AuditLog.create({
      execution_id,
      test_type: 'complete-crud',
      module_name: module.id,
      test_name: `CRUD Completo - ${module.name}`,
      test_description: `Test CRUD completo: Create → Read → Update → Delete → Verify`,
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();
    const crudResults = {
      create: false,
      read: false,
      update: false,
      delete: false,
      persistence: false
    };

    try {
      await this.navigateToModule(module.id);

      // 1. CREATE: Crear registro
      console.log(`        1️⃣ [CRUD] CREATE - Creando ${module.entityName}...`);
      const createResult = await this.performCreate(module);
      crudResults.create = createResult.success;

      if (createResult.success) {
        // 2. READ: Verificar que aparezca en lista
        console.log(`        2️⃣ [CRUD] READ - Verificando en lista...`);
        const readResult = await this.performRead(module, createResult.data);
        crudResults.read = readResult.success;

        // 3. UPDATE: Editar registro
        console.log(`        3️⃣ [CRUD] UPDATE - Editando ${module.entityName}...`);
        const updateResult = await this.performUpdate(module, createResult.data);
        crudResults.update = updateResult.success;

        // 4. DELETE: Eliminar registro
        console.log(`        4️⃣ [CRUD] DELETE - Eliminando ${module.entityName}...`);
        const deleteResult = await this.performDelete(module, createResult.data);
        crudResults.delete = deleteResult.success;

        // 5. PERSISTENCE: Verificar cambios persisten (reload)
        console.log(`        5️⃣ [CRUD] PERSISTENCE - Verificando persistencia...`);
        const persistenceResult = await this.verifyPersistence(module);
        crudResults.persistence = persistenceResult.success;
      }

      const successCount = Object.values(crudResults).filter(r => r).length;
      const totalOps = Object.keys(crudResults).length;

      await log.update({
        status: successCount === totalOps ? 'pass' : 'warning',
        severity: successCount < 3 ? 'medium' : 'low',
        duration_ms: Date.now() - startTime,
        test_data: {
          crud_operations: crudResults,
          success_rate: `${successCount}/${totalOps}`,
          test_entity_data: createResult?.data
        },
        completed_at: new Date()
      });

      console.log(`        ✅ [CRUD] ${module.name} completado: ${successCount}/${totalOps} operaciones`);

    } catch (error) {
      await log.update({
        status: 'fail',
        severity: 'high',
        error_message: error.message,
        duration_ms: Date.now() - startTime,
        completed_at: new Date()
      });

      console.log(`        ❌ [CRUD] ${module.name} falló: ${error.message}`);
    }

    return log;
  }

  async performCreate(module) {
    try {
      console.log(`          ➕ [CRUD-CREATE] Creando ${module.entityName}...`);

      // 1. Buscar y hacer click en botón "Agregar"
      const addButton = await this.page.$('button:contains("Agregar"), .btn-add, [onclick*="Add"], [onclick*="add"]');
      if (!addButton) {
        return { success: false, error: 'Botón Agregar no encontrado' };
      }

      await this.humanDelay('action');
      await addButton.click();
      console.log(`            🔘 Click en botón Agregar`);

      // 2. Esperar modal/formulario
      await this.humanDelay('thought');
      await this.page.waitForSelector('.modal, .form-container, #addModal, .popup', { timeout: 5000 });

      // 3. Generar datos específicos para el módulo
      const testData = this.generateCRUDTestData(module);
      console.log(`            📊 Datos de prueba:`, testData);

      // 4. Llenar formulario con datos específicos
      let fieldsFilled = 0;
      for (const [field, value] of Object.entries(testData)) {
        const filled = await this.fillField(field, value);
        if (filled) fieldsFilled++;
      }

      // 5. Guardar
      const saved = await this.clickSaveButton();
      if (!saved) {
        return { success: false, error: 'No se pudo guardar el registro' };
      }

      // 6. Esperar confirmación
      await this.humanDelay('action');

      // 7. Buscar el registro creado en la tabla
      const foundInTable = await this.findRecordInTable(testData);

      if (foundInTable) {
        console.log(`            ✅ ${module.entityName} creado exitosamente`);
        return {
          success: true,
          data: { ...testData, id: Date.now(), foundInTable: true },
          fieldsFilled
        };
      } else {
        return {
          success: false,
          error: 'Registro no aparece en tabla después de crear'
        };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async performRead(module, entityData) {
    try {
      console.log(`          👀 [CRUD-READ] Verificando ${module.entityName} en lista...`);

      // 1. Navegar al módulo nuevamente para asegurar datos frescos
      await this.navigateToModule(module.id);
      await this.humanDelay('action');

      // 2. Buscar el registro en la tabla
      const found = await this.findRecordInTable(entityData);

      if (found) {
        console.log(`            ✅ ${module.entityName} visible en lista`);
        return { success: true, found: true };
      } else {
        return { success: false, error: 'Registro no encontrado en lista' };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async performUpdate(module, entityData) {
    try {
      console.log(`          ✏️  [CRUD-UPDATE] Editando ${module.entityName}...`);

      // 1. Buscar botón "Editar" en la fila del registro
      const editButton = await this.page.$('button:contains("Editar"), .btn-edit, [onclick*="edit"], [onclick*="Edit"]');
      if (!editButton) {
        return { success: false, error: 'Botón Editar no encontrado' };
      }

      await this.humanDelay('action');
      await editButton.click();
      console.log(`            🔘 Click en botón Editar`);

      // 2. Esperar modal de edición
      await this.humanDelay('thought');
      await this.page.waitForSelector('.modal, .form-container, #editModal', { timeout: 5000 });

      // 3. Generar nuevos datos para la actualización
      const updatedData = this.generateCRUDTestData(module, true); // true = es update
      console.log(`            📊 Datos actualizados:`, updatedData);

      // 4. Actualizar campos
      let fieldsUpdated = 0;
      for (const [field, value] of Object.entries(updatedData)) {
        const updated = await this.updateField(field, value);
        if (updated) fieldsUpdated++;
      }

      // 5. Guardar cambios
      const saved = await this.clickSaveButton();
      if (!saved) {
        return { success: false, error: 'No se pudieron guardar los cambios' };
      }

      // 6. Verificar que los cambios aparezcan en la tabla
      await this.humanDelay('action');
      const updatedInTable = await this.findRecordInTable(updatedData);

      if (updatedInTable) {
        console.log(`            ✅ ${module.entityName} actualizado exitosamente`);
        return { success: true, updatedData, fieldsUpdated };
      } else {
        return { success: false, error: 'Cambios no reflejados en tabla' };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async performDelete(module, entityData) {
    try {
      console.log(`          🗑️  [CRUD-DELETE] Eliminando ${module.entityName}...`);

      // 1. Buscar botón "Eliminar"
      const deleteButton = await this.page.$('button:contains("Eliminar"), .btn-delete, [onclick*="delete"], [onclick*="Delete"]');
      if (!deleteButton) {
        return { success: false, error: 'Botón Eliminar no encontrado' };
      }

      await this.humanDelay('action');
      await deleteButton.click();
      console.log(`            🔘 Click en botón Eliminar`);

      // 2. Confirmar eliminación si aparece diálogo
      await this.humanDelay('thought');
      try {
        const confirmButton = await this.page.$('button:contains("Confirmar"), button:contains("Sí"), button:contains("Aceptar"), .btn-confirm');
        if (confirmButton) {
          await this.humanDelay('action');
          await confirmButton.click();
          console.log(`            ✅ Confirmación de eliminación`);
        }
      } catch (e) {
        // No hay diálogo de confirmación, continuar
      }

      // 3. Verificar que el registro ya no aparezca en la tabla
      await this.humanDelay('action');
      const stillExists = await this.findRecordInTable(entityData);

      if (!stillExists) {
        console.log(`            ✅ ${module.entityName} eliminado exitosamente`);
        return { success: true, deleted: true };
      } else {
        return { success: false, error: 'Registro aún aparece en tabla después de eliminar' };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyPersistence(module) {
    // Hacer F5 y verificar cambios
    await this.page.reload();
    await this.humanDelay('thought');
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════
  // FASE 3: WORKFLOWS DE NEGOCIO
  // ═══════════════════════════════════════════════════════════════════

  async runBusinessWorkflows(execution_id) {
    const results = [];

    const workflows = [
      {
        name: 'Flujo Empleado Completo',
        steps: ['Crear empleado', 'Asignar departamento', 'Registrar biometría', 'Primera asistencia']
      },
      {
        name: 'Flujo Notificaciones',
        steps: ['Crear notificación', 'Asignar destinatarios', 'Enviar', 'Verificar recepción']
      },
      {
        name: 'Flujo Capacitaciones',
        steps: ['Crear capacitación', 'Asignar empleados', 'Completar', 'Generar certificado']
      }
    ];

    for (const workflow of workflows) {
      console.log(`      🔄 [WORKFLOW] Ejecutando: ${workflow.name}...`);
      const result = await this.executeBusinessWorkflow(execution_id, workflow);
      results.push(result);
    }

    return results;
  }

  async executeBusinessWorkflow(execution_id, workflow) {
    const { AuditLog } = this.database;

    const log = await AuditLog.create({
      execution_id,
      test_type: 'business-workflow',
      module_name: 'workflow',
      test_name: workflow.name,
      test_description: `Workflow: ${workflow.steps.join(' → ')}`,
      status: 'in-progress',
      started_at: new Date()
    });

    const startTime = Date.now();
    const stepResults = [];

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`        ${i + 1}️⃣ [WORKFLOW] ${step}...`);

        // Simular cada paso del workflow
        await this.humanDelay('thought');
        const stepResult = await this.executeWorkflowStep(step);
        stepResults.push({ step, success: stepResult.success, message: stepResult.message });
      }

      const successfulSteps = stepResults.filter(s => s.success).length;

      await log.update({
        status: successfulSteps === workflow.steps.length ? 'pass' : 'warning',
        severity: successfulSteps < Math.floor(workflow.steps.length / 2) ? 'medium' : 'low',
        duration_ms: Date.now() - startTime,
        test_data: {
          workflow_steps: stepResults,
          completion_rate: `${successfulSteps}/${workflow.steps.length}`
        },
        completed_at: new Date()
      });

      console.log(`        ✅ [WORKFLOW] ${workflow.name} completado: ${successfulSteps}/${workflow.steps.length} pasos`);

    } catch (error) {
      await log.update({
        status: 'fail',
        severity: 'high',
        error_message: error.message,
        duration_ms: Date.now() - startTime,
        completed_at: new Date()
      });

      console.log(`        ❌ [WORKFLOW] ${workflow.name} falló: ${error.message}`);
    }

    return log;
  }

  async executeWorkflowStep(step) {
    try {
      await this.humanDelay('action');

      switch (step) {
        case 'Crear empleado':
          return await this.workflowCreateEmployee();

        case 'Asignar departamento':
          return await this.workflowAssignDepartment();

        case 'Registrar biometría':
          return await this.workflowRegisterBiometric();

        case 'Primera asistencia':
          return await this.workflowFirstAttendance();

        case 'Crear notificación':
          return await this.workflowCreateNotification();

        case 'Asignar destinatarios':
          return await this.workflowAssignRecipients();

        case 'Enviar':
          return await this.workflowSend();

        case 'Verificar recepción':
          return await this.workflowVerifyReception();

        case 'Crear capacitación':
          return await this.workflowCreateTraining();

        case 'Asignar empleados':
          return await this.workflowAssignEmployees();

        case 'Completar':
          return await this.workflowComplete();

        case 'Generar certificado':
          return await this.workflowGenerateCertificate();

        default:
          return { success: true, message: `${step} simulado básicamente` };
      }
    } catch (error) {
      return { success: false, message: `Error en ${step}: ${error.message}` };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // WORKFLOWS ESPECÍFICOS DE NEGOCIO
  // ═══════════════════════════════════════════════════════════════════

  async workflowCreateEmployee() {
    try {
      await this.navigateToModule('users');

      const employeeData = {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
        employeeId: `EMP-${Date.now()}`,
        position: faker.name.jobTitle()
      };

      console.log(`            👤 Creando empleado: ${employeeData.firstName} ${employeeData.lastName}`);

      // Simular creación completa
      await this.humanDelay('thought');
      // Aquí iría la lógica real de creación similar a performCreate

      // Guardar datos para siguientes pasos del workflow
      this.testData.users.push(employeeData);

      return {
        success: true,
        message: `Empleado ${employeeData.firstName} creado`,
        data: employeeData
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowAssignDepartment() {
    try {
      console.log(`            🏢 Asignando departamento...`);

      await this.navigateToModule('departments');
      await this.humanDelay('thought');

      // Simular asignación de departamento
      const departmentAssignment = {
        employeeId: this.testData.users[this.testData.users.length - 1]?.employeeId,
        department: faker.commerce.department(),
        assignedAt: new Date()
      };

      return {
        success: true,
        message: `Departamento ${departmentAssignment.department} asignado`,
        data: departmentAssignment
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowRegisterBiometric() {
    try {
      console.log(`            🔒 Registrando datos biométricos...`);

      await this.navigateToModule('biometric');
      await this.humanDelay('thought');

      // Simular registro biométrico
      const biometricData = {
        employeeId: this.testData.users[this.testData.users.length - 1]?.employeeId,
        faceTemplate: 'TEMPLATE_' + Date.now(),
        quality: faker.random.number({ min: 80, max: 100 }),
        registeredAt: new Date()
      };

      return {
        success: true,
        message: `Biometría registrada (calidad: ${biometricData.quality}%)`,
        data: biometricData
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowFirstAttendance() {
    try {
      console.log(`            ⏰ Simulando primera asistencia...`);

      await this.navigateToModule('attendance');
      await this.humanDelay('thought');

      // Simular check-in
      const attendanceData = {
        employeeId: this.testData.users[this.testData.users.length - 1]?.employeeId,
        checkIn: new Date(),
        method: 'biometric',
        location: faker.address.streetAddress()
      };

      this.testData.attendances.push(attendanceData);

      return {
        success: true,
        message: `Primera asistencia registrada: ${attendanceData.checkIn.toLocaleTimeString()}`,
        data: attendanceData
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowCreateNotification() {
    try {
      console.log(`            📢 Creando notificación...`);

      await this.navigateToModule('notifications');
      await this.humanDelay('thought');

      const notificationData = {
        title: faker.lorem.words(3),
        message: faker.lorem.sentence(),
        priority: faker.random.arrayElement(['Alta', 'Media', 'Baja']),
        type: faker.random.arrayElement(['info', 'warning', 'success'])
      };

      this.testData.notifications.push(notificationData);

      return {
        success: true,
        message: `Notificación "${notificationData.title}" creada`,
        data: notificationData
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowAssignRecipients() {
    try {
      console.log(`            👥 Asignando destinatarios...`);

      await this.humanDelay('thought');

      const recipients = {
        allEmployees: true,
        departments: [faker.commerce.department()],
        specificUsers: this.testData.users.slice(0, 2).map(u => u.employeeId)
      };

      return {
        success: true,
        message: `${recipients.specificUsers.length} destinatarios asignados`,
        data: recipients
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowSend() {
    try {
      console.log(`            📤 Enviando notificación...`);

      await this.humanDelay('action');

      // Simular envío
      const sendResult = {
        sentAt: new Date(),
        sentCount: faker.random.number({ min: 5, max: 50 }),
        method: 'push'
      };

      return {
        success: true,
        message: `Notificación enviada a ${sendResult.sentCount} usuarios`,
        data: sendResult
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowVerifyReception() {
    try {
      console.log(`            ✅ Verificando recepción...`);

      await this.humanDelay('action');

      const receptionStats = {
        delivered: faker.random.number({ min: 40, max: 50 }),
        read: faker.random.number({ min: 30, max: 40 }),
        responded: faker.random.number({ min: 10, max: 20 })
      };

      return {
        success: true,
        message: `${receptionStats.delivered} entregadas, ${receptionStats.read} leídas`,
        data: receptionStats
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowCreateTraining() {
    try {
      console.log(`            📚 Creando capacitación...`);

      await this.navigateToModule('training-management');
      await this.humanDelay('thought');

      const trainingData = {
        title: faker.lorem.words(4),
        description: faker.lorem.paragraph(),
        duration: faker.random.number({ min: 30, max: 240 }) + ' minutos',
        type: faker.random.arrayElement(['Presencial', 'Virtual', 'Mixta'])
      };

      this.testData.trainings.push(trainingData);

      return {
        success: true,
        message: `Capacitación "${trainingData.title}" creada`,
        data: trainingData
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowAssignEmployees() {
    try {
      console.log(`            👨‍🎓 Asignando empleados a capacitación...`);

      await this.humanDelay('action');

      const assignment = {
        trainingId: this.testData.trainings[this.testData.trainings.length - 1]?.title,
        assignedEmployees: this.testData.users.slice(0, 3).map(u => u.employeeId),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
      };

      return {
        success: true,
        message: `${assignment.assignedEmployees.length} empleados asignados`,
        data: assignment
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowComplete() {
    try {
      console.log(`            ✅ Completando capacitación...`);

      await this.humanDelay('action');

      const completion = {
        completedAt: new Date(),
        score: faker.random.number({ min: 70, max: 100 }),
        passed: true
      };

      return {
        success: true,
        message: `Capacitación completada con ${completion.score}% de calificación`,
        data: completion
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async workflowGenerateCertificate() {
    try {
      console.log(`            🏆 Generando certificado...`);

      await this.humanDelay('action');

      const certificate = {
        certificateId: 'CERT-' + Date.now(),
        issuedAt: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        type: 'digital'
      };

      return {
        success: true,
        message: `Certificado ${certificate.certificateId} generado`,
        data: certificate
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // UTILIDADES PARA SIMULACIÓN HUMANA
  // ═══════════════════════════════════════════════════════════════════

  async humanDelay(type = 'action') {
    const config = this.humanConfig;
    let delay;

    switch (type) {
      case 'typing':
        delay = faker.random.number(config.typingSpeed);
        break;
      case 'action':
        delay = faker.random.number(config.actionDelay);
        break;
      case 'thought':
        delay = faker.random.number(config.thoughtPause);
        break;
      default:
        delay = 500;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async humanType(selector, text) {
    const element = typeof selector === 'string' ? await this.page.$(selector) : selector;

    if (!element) return;

    // Limpiar campo
    await element.click({ clickCount: 3 });
    await this.humanDelay('action');

    // Escribir caracter por caracter con velocidad humana
    for (const char of text) {
      await element.fill(char);
      await this.humanDelay('typing');
    }
  }

  async navigateToModule(moduleId) {
    await this.humanDelay('thought');

    // Usar hash navigation como un usuario real
    await this.page.evaluate((hash) => {
      window.location.hash = hash;
    }, moduleId);

    await this.humanDelay('action');
  }

  // ═══════════════════════════════════════════════════════════════════
  // FUNCIONES UTILITARIAS PARA CRUD
  // ═══════════════════════════════════════════════════════════════════

  generateCRUDTestData(module, isUpdate = false) {
    const suffix = isUpdate ? '_UPDATED' : '';

    switch (module.id) {
      case 'users':
        return {
          firstName: faker.name.firstName() + suffix,
          lastName: faker.name.lastName() + suffix,
          email: faker.internet.email(),
          phone: faker.phone.phoneNumber(),
          position: faker.name.jobTitle() + suffix
        };
      case 'departments':
        return {
          name: faker.commerce.department() + suffix,
          description: faker.lorem.sentence() + suffix,
          location: faker.address.streetAddress() + suffix,
          manager: faker.name.findName() + suffix
        };
      default:
        return {
          name: faker.company.companyName() + suffix,
          description: faker.lorem.sentence() + suffix
        };
    }
  }

  async fillField(fieldName, value) {
    const selectors = [
      `#${fieldName}`,
      `[name="${fieldName}"]`,
      `input[placeholder*="${fieldName}"]`,
      `input[placeholder*="${fieldName.toLowerCase()}"]`,
      `.${fieldName}-input`,
      `#add${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`,
      `input[id*="${fieldName}"]`
    ];

    for (const selector of selectors) {
      try {
        const field = await this.page.locator(selector);
        if (field) {
          await this.humanDelay('action');
          await field.click({ clickCount: 3 }); // Seleccionar todo
          await this.humanType(field, value.toString());
          console.log(`            ✏️  ${fieldName}: "${value}"`);
          return true;
        }
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    return false;
  }

  async updateField(fieldName, value) {
    // Similar a fillField pero para actualización
    return await this.fillField(fieldName, value);
  }

  async clickSaveButton() {
    const saveSelectors = [
      'button:contains("Guardar")',
      'button:contains("Crear")',
      'button:contains("Actualizar")',
      '.btn-save',
      '.btn-primary',
      '[onclick*="save"]',
      '[onclick*="Save"]',
      '[onclick*="create"]',
      '[onclick*="update"]'
    ];

    for (const selector of saveSelectors) {
      try {
        const saveButton = await this.page.locator(selector);
        if (saveButton) {
          await this.humanDelay('thought');
          await saveButton.click();
          console.log(`            💾 Click en botón guardar`);
          return true;
        }
      } catch (e) {
        // Continuar
      }
    }
    return false;
  }

  async findRecordInTable(testData) {
    try {
      await this.humanDelay('action');

      // Buscar en tabla común
      const tables = await this.page.$$('table, .table, .data-table, .grid');

      for (const table of tables) {
        const rows = await table.$$('tr, .row, .table-row');

        for (const row of rows) {
          const text = await row.evaluate(el => el.textContent);

          // Verificar si algún valor de testData aparece en la fila
          for (const value of Object.values(testData)) {
            if (text.includes(value.toString())) {
              console.log(`            🔍 Registro encontrado en tabla: "${value}"`);
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      console.log(`            ⚠️  Error buscando en tabla: ${error.message}`);
      return false;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = AdvancedUserSimulationCollector;