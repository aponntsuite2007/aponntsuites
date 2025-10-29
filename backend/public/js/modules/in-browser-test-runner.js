/**
 * IN-BROWSER TEST RUNNER - Testing visual en navegador del usuario
 *
 * Ejecuta tests CRUD completos navegando por los módulos reales
 * sin abrir nueva ventana, usando la sesión actual del usuario.
 *
 * CARACTERÍSTICAS:
 * - Navegación visible en tiempo real
 * - Datos identificables con prefijo [TEST-AUDIT-{timestamp}]
 * - Cleanup automático al finalizar
 * - Vuelve al módulo auditoría con resultados
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

class InBrowserTestRunner {
  constructor() {
    this.testTimestamp = this.generateTimestamp();
    this.testPrefix = `[TEST-AUDIT-${this.testTimestamp}]`;
    this.results = [];
    this.createdRecords = []; // Para trackear qué se creó y poder borrarlo
    this.currentModule = null;
    this.onProgress = null; // Callback para reportar progreso
    this.onComplete = null; // Callback al finalizar
  }

  generateTimestamp() {
    const now = new Date();
    return now.getFullYear().toString() +
           (now.getMonth() + 1).toString().padStart(2, '0') +
           now.getDate().toString().padStart(2, '0') + '-' +
           now.getHours().toString().padStart(2, '0') +
           now.getMinutes().toString().padStart(2, '0') +
           now.getSeconds().toString().padStart(2, '0');
  }

  log(message, type = 'info') {
    console.log(`[TEST-RUNNER] ${message}`);
    if (this.onProgress) {
      this.onProgress({ message, type, timestamp: new Date() });
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═════════════════════════════════════════════════════════
  // NAVEGACIÓN A MÓDULOS
  // ═════════════════════════════════════════════════════════

  async navigateToModule(moduleId) {
    this.log(`📍 Navegando a módulo: ${moduleId}`, 'info');
    this.currentModule = moduleId;

    // Llamar a la función global que navega a módulos
    if (typeof showModuleContent === 'function') {
      // showModuleContent retorna una promesa
      await showModuleContent(moduleId);

      // Esperar a que el módulo esté realmente cargado
      await this.waitForModuleLoad(moduleId);

      return true;
    } else {
      this.log(`❌ Función showModuleContent no disponible`, 'error');
      return false;
    }
  }

  async waitForModuleLoad(moduleId) {
    this.log(`  ⏳ Esperando a que el módulo ${moduleId} se cargue completamente...`, 'info');

    // Esperar hasta 10 segundos a que el contenido del módulo esté visible
    const maxAttempts = 20; // 20 intentos × 500ms = 10 segundos
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Verificar si el mainContent tiene contenido del módulo
      const mainContent = document.getElementById('mainContent');

      if (mainContent && mainContent.innerHTML.trim() !== '') {
        // Verificar que no sea el fallback de error
        const hasFallback = mainContent.textContent.includes('no cargado') ||
                           mainContent.textContent.includes('pendiente de carga');

        if (!hasFallback) {
          this.log(`  ✅ Módulo ${moduleId} cargado correctamente`, 'success');
          await this.sleep(1000); // Espera adicional para asegurar que todo esté renderizado
          return true;
        }
      }

      await this.sleep(500);
      attempts++;
    }

    this.log(`  ⚠️ Timeout esperando carga de módulo ${moduleId}`, 'warning');
    return false;
  }

  async returnToAuditor() {
    this.log(`🔙 Volviendo al módulo de auditoría...`, 'info');
    await this.navigateToModule('auditor-dashboard');
    await this.sleep(1000);
  }

  // ═════════════════════════════════════════════════════════
  // TESTING CRUD
  // ═════════════════════════════════════════════════════════

  async testModuleCRUD(moduleId, moduleName) {
    this.log(`🧪 Iniciando test CRUD de: ${moduleName}`, 'info');

    const result = {
      module_id: moduleId,
      module_name: moduleName,
      timestamp: new Date(),
      tests: {
        navigation: false,
        create: false,
        read: false,
        update: false,
        delete: false
      },
      errors: [],
      records_created: []
    };

    try {
      // 1. NAVEGACIÓN
      this.log(`  1️⃣ Test de navegación...`, 'info');
      const navSuccess = await this.navigateToModule(moduleId);
      result.tests.navigation = navSuccess;

      if (!navSuccess) {
        result.errors.push('No se pudo navegar al módulo');
        return result;
      }

      await this.sleep(1500);

      // 2. CREATE - Buscar botón "Agregar"
      this.log(`  2️⃣ Test de CREATE...`, 'info');
      const createSuccess = await this.testCreate(moduleId);
      result.tests.create = createSuccess.success;
      if (createSuccess.record_id) {
        result.records_created.push(createSuccess.record_id);
        this.createdRecords.push({
          module: moduleId,
          record_id: createSuccess.record_id,
          record_name: createSuccess.record_name
        });
      }
      if (createSuccess.error) {
        result.errors.push(createSuccess.error);
      }

      await this.sleep(1000);

      // 3. READ - Verificar que aparece en la lista
      this.log(`  3️⃣ Test de READ...`, 'info');
      const readSuccess = await this.testRead(moduleId, createSuccess.record_name);
      result.tests.read = readSuccess.success;
      if (readSuccess.error) {
        result.errors.push(readSuccess.error);
      }

      await this.sleep(1000);

      // 4. UPDATE - Editar el registro
      if (createSuccess.record_id) {
        this.log(`  4️⃣ Test de UPDATE...`, 'info');
        const updateSuccess = await this.testUpdate(moduleId, createSuccess.record_id);
        result.tests.update = updateSuccess.success;
        if (updateSuccess.error) {
          result.errors.push(updateSuccess.error);
        }
      }

      await this.sleep(1000);

      // 5. DELETE - Eliminar el registro
      if (createSuccess.record_id) {
        this.log(`  5️⃣ Test de DELETE...`, 'info');
        const deleteSuccess = await this.testDelete(moduleId, createSuccess.record_id);
        result.tests.delete = deleteSuccess.success;
        if (deleteSuccess.error) {
          result.errors.push(deleteSuccess.error);
        }

        // Si se eliminó, quitarlo del tracking
        if (deleteSuccess.success) {
          this.createdRecords = this.createdRecords.filter(r => r.record_id !== createSuccess.record_id);
        }
      }

    } catch (error) {
      this.log(`❌ Error en test de ${moduleName}: ${error.message}`, 'error');
      result.errors.push(error.message);
    }

    // Calcular score
    const testsRun = Object.values(result.tests).length;
    const testsPassed = Object.values(result.tests).filter(t => t === true).length;
    result.success_rate = testsRun > 0 ? (testsPassed / testsRun * 100).toFixed(1) : 0;
    result.status = result.success_rate >= 80 ? 'passed' : 'failed';

    this.log(`  ✅ Test completado: ${result.success_rate}% éxito`, result.status === 'passed' ? 'success' : 'warning');

    return result;
  }

  // ═════════════════════════════════════════════════════════
  // OPERACIONES CRUD INDIVIDUALES
  // ═════════════════════════════════════════════════════════

  async testCreate(moduleId) {
    try {
      // Buscar botón de "Agregar" o "Nuevo"
      const addButton = document.querySelector('[onclick*="open"][onclick*="Modal"], [onclick*="add"], button:contains("Agregar"), button:contains("Nuevo")');

      if (!addButton) {
        return { success: false, error: 'No se encontró botón de agregar' };
      }

      // Click en agregar
      addButton.click();
      await this.sleep(1000);

      // Buscar modal abierto
      const modal = document.querySelector('.modal.show, .modal-overlay.active, [style*="display: block"]');

      if (!modal) {
        return { success: false, error: 'Modal no se abrió' };
      }

      // Llenar formulario con datos de prueba
      const testData = this.generateTestData(moduleId);
      const fillSuccess = await this.fillForm(modal, testData);

      if (!fillSuccess) {
        return { success: false, error: 'No se pudo llenar el formulario' };
      }

      // Buscar botón de guardar
      const saveButton = modal.querySelector('button[onclick*="save"], button:contains("Guardar"), .btn-primary');

      if (!saveButton) {
        return { success: false, error: 'No se encontró botón de guardar' };
      }

      // Guardar
      saveButton.click();
      await this.sleep(1500);

      // Verificar que se cerró el modal (success)
      const modalStillOpen = document.querySelector('.modal.show, .modal-overlay.active');

      if (modalStillOpen) {
        return { success: false, error: 'Modal no se cerró después de guardar' };
      }

      return {
        success: true,
        record_id: testData.id || Date.now(),
        record_name: testData.name
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testRead(moduleId, recordName) {
    try {
      // Buscar en la tabla/lista si aparece el registro creado
      await this.sleep(500);

      const tables = document.querySelectorAll('table tbody, .list-group, .data-grid');

      for (const table of tables) {
        if (table.textContent.includes(recordName)) {
          return { success: true };
        }
      }

      return { success: false, error: 'Registro no encontrado en la lista' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testUpdate(moduleId, recordId) {
    try {
      // Buscar botón de editar del registro creado
      const editButtons = document.querySelectorAll('[onclick*="edit"], [onclick*="Edit"], .btn-edit, button:contains("Editar")');

      if (editButtons.length === 0) {
        return { success: false, error: 'No se encontraron botones de editar' };
      }

      // Click en el primer botón de editar
      editButtons[0].click();
      await this.sleep(1000);

      // Verificar que se abrió el modal con datos
      const modal = document.querySelector('.modal.show, .modal-overlay.active');

      if (!modal) {
        return { success: false, error: 'Modal de edición no se abrió' };
      }

      // Modificar un campo
      const inputs = modal.querySelectorAll('input[type="text"], textarea');
      if (inputs.length > 0) {
        const originalValue = inputs[0].value;
        inputs[0].value = originalValue + ' [EDITADO]';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Guardar
      const saveButton = modal.querySelector('button[onclick*="save"], button:contains("Guardar")');
      if (saveButton) {
        saveButton.click();
        await this.sleep(1500);
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testDelete(moduleId, recordId) {
    try {
      // Buscar botón de eliminar
      const deleteButtons = document.querySelectorAll('[onclick*="delete"], [onclick*="Delete"], .btn-delete, button:contains("Eliminar")');

      if (deleteButtons.length === 0) {
        return { success: false, error: 'No se encontraron botones de eliminar' };
      }

      // Click en eliminar
      deleteButtons[0].click();
      await this.sleep(500);

      // Confirmar eliminación si hay modal de confirmación
      const confirmButton = document.querySelector('.swal2-confirm, button:contains("Confirmar"), button:contains("Sí")');
      if (confirmButton) {
        confirmButton.click();
        await this.sleep(1000);
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ═════════════════════════════════════════════════════════
  // GENERACIÓN DE DATOS DE PRUEBA
  // ═════════════════════════════════════════════════════════

  generateTestData(moduleId) {
    const baseData = {
      id: Date.now(),
      name: `${this.testPrefix} Test ${moduleId}`,
      description: `Registro de prueba creado automáticamente`,
      created_at: new Date().toISOString()
    };

    // Datos específicos por módulo
    const moduleSpecificData = {
      users: {
        email: `test-${this.testTimestamp}@test.com`,
        nombre: `${this.testPrefix} Usuario Test`,
        apellido: 'Prueba',
        dni: `${Math.floor(Math.random() * 90000000) + 10000000}`,
        telefono: '1234567890'
      },
      departments: {
        name: `${this.testPrefix} Departamento Test`,
        codigo: `TEST-${this.testTimestamp}`
      },
      shifts: {
        name: `${this.testPrefix} Turno Test`,
        hora_entrada: '09:00',
        hora_salida: '18:00'
      },
      medical: {
        motivo: `${this.testPrefix} Consulta Test`,
        diagnostico: 'Test de auditoría'
      },
      vacation: {
        motivo: `${this.testPrefix} Vacaciones Test`,
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
      }
    };

    return { ...baseData, ...(moduleSpecificData[moduleId] || {}) };
  }

  async fillForm(formContainer, testData) {
    try {
      // Llenar inputs de texto
      const textInputs = formContainer.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
      let filled = 0;

      for (const input of textInputs) {
        const name = input.name || input.id || '';

        // Mapear campos comunes
        if (name.includes('name') || name.includes('nombre')) {
          input.value = testData.name || testData.nombre;
          filled++;
        } else if (name.includes('email')) {
          input.value = testData.email;
          filled++;
        } else if (name.includes('dni') || name.includes('documento')) {
          input.value = testData.dni;
          filled++;
        } else if (name.includes('telefono') || name.includes('phone')) {
          input.value = testData.telefono;
          filled++;
        } else if (name.includes('apellido')) {
          input.value = testData.apellido;
          filled++;
        } else if (name.includes('codigo')) {
          input.value = testData.codigo;
          filled++;
        } else if (name.includes('motivo')) {
          input.value = testData.motivo;
          filled++;
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Llenar textareas
      const textareas = formContainer.querySelectorAll('textarea');
      for (const textarea of textareas) {
        textarea.value = testData.description || 'Test de auditoría';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        filled++;
      }

      return filled > 0;

    } catch (error) {
      console.error('Error llenando formulario:', error);
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════
  // CLEANUP - BORRAR DATOS DE PRUEBA
  // ═════════════════════════════════════════════════════════

  async cleanup() {
    this.log(`🧹 Iniciando cleanup de datos de prueba...`, 'info');

    const token = localStorage.getItem('authToken') || window.authToken;
    const cleanupResults = {
      attempted: this.createdRecords.length,
      deleted: 0,
      failed: 0,
      errors: []
    };

    for (const record of this.createdRecords) {
      try {
        this.log(`  🗑️ Eliminando ${record.module}: ${record.record_name}`, 'info');

        // Llamar al endpoint DELETE del módulo
        const deleteUrl = this.getDeleteEndpoint(record.module, record.record_id);

        if (!deleteUrl) {
          this.log(`  ⚠️ No se pudo determinar endpoint de eliminación para ${record.module}`, 'warning');
          cleanupResults.failed++;
          continue;
        }

        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          cleanupResults.deleted++;
          this.log(`  ✅ Eliminado correctamente`, 'success');
        } else {
          cleanupResults.failed++;
          cleanupResults.errors.push(`${record.module}/${record.record_id}: ${response.statusText}`);
        }

      } catch (error) {
        cleanupResults.failed++;
        cleanupResults.errors.push(`${record.module}/${record.record_id}: ${error.message}`);
        this.log(`  ❌ Error eliminando: ${error.message}`, 'error');
      }
    }

    this.log(`🧹 Cleanup completado: ${cleanupResults.deleted}/${cleanupResults.attempted} eliminados`, 'info');

    return cleanupResults;
  }

  getDeleteEndpoint(moduleId, recordId) {
    const endpointMap = {
      users: `/api/v1/users/${recordId}`,
      departments: `/api/v1/departments/${recordId}`,
      shifts: `/api/v1/shifts/${recordId}`,
      kiosks: `/api/v1/kiosks/${recordId}`,
      medical: `/api/v1/medical/${recordId}`,
      vacation: `/api/v1/vacation/${recordId}`,
      legal: `/api/v1/legal/${recordId}`,
      training: `/api/v1/training/${recordId}`
    };

    return endpointMap[moduleId];
  }

  // ═════════════════════════════════════════════════════════
  // EJECUTORES PRINCIPALES
  // ═════════════════════════════════════════════════════════

  async runGlobalTest(modules) {
    this.log(`🌍 Iniciando TEST GLOBAL de ${modules.length} módulos...`, 'info');
    this.results = [];

    for (const module of modules) {
      const result = await this.testModuleCRUD(module.id, module.name);
      this.results.push(result);
      await this.sleep(500);
    }

    // Cleanup
    const cleanupResults = await this.cleanup();

    // Volver a auditoría
    await this.returnToAuditor();

    // Calcular summary
    const summary = this.calculateSummary(cleanupResults);

    if (this.onComplete) {
      this.onComplete(summary);
    }

    return summary;
  }

  async runModuleTest(moduleId, moduleName) {
    this.log(`🎯 Iniciando TEST de módulo específico: ${moduleName}...`, 'info');
    this.results = [];

    const result = await this.testModuleCRUD(moduleId, moduleName);
    this.results.push(result);

    // Cleanup
    const cleanupResults = await this.cleanup();

    // Volver a auditoría
    await this.returnToAuditor();

    // Calcular summary
    const summary = this.calculateSummary(cleanupResults);

    if (this.onComplete) {
      this.onComplete(summary);
    }

    return summary;
  }

  calculateSummary(cleanupResults) {
    const totalTests = this.results.reduce((sum, r) => sum + Object.keys(r.tests).length, 0);
    const passedTests = this.results.reduce((sum, r) =>
      sum + Object.values(r.tests).filter(t => t === true).length, 0);
    const failedTests = totalTests - passedTests;

    const totalModules = this.results.length;
    const passedModules = this.results.filter(r => r.status === 'passed').length;

    return {
      execution_id: `in-browser-${this.testTimestamp}`,
      test_prefix: this.testPrefix,
      summary: {
        total_modules: totalModules,
        passed_modules: passedModules,
        failed_modules: totalModules - passedModules,
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: failedTests,
        success_rate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0
      },
      cleanup: cleanupResults,
      results: this.results,
      timestamp: new Date()
    };
  }
}

// Exponer globalmente
window.InBrowserTestRunner = InBrowserTestRunner;
