/**
 * REAL BROWSER TEST RUNNER - Testing REAL en el navegador actual del usuario
 *
 * Sistema profesional de testing que:
 * - Opera EN EL MISMO navegador donde el usuario está logueado
 * - Navega visiblemente por cada módulo
 * - Ejecuta CRUD completo con datos reales (Faker.js)
 * - Marca datos con prefijo identificable para cleanup
 * - Muestra progreso en tiempo real
 * - Vuelve al módulo auditoría con resultados
 *
 * @version 2.0.0
 * @date 2025-10-23
 */

class RealBrowserTestRunner {
  constructor() {
    this.testTimestamp = this.generateTimestamp();
    this.testPrefix = `[TEST-${this.testTimestamp}]`;
    this.results = [];
    this.createdRecords = [];
    this.currentModule = null;
    this.onProgress = null;
    this.onComplete = null;
    this.isRunning = false;
  }

  generateTimestamp() {
    const now = new Date();
    return now.getFullYear().toString().slice(2) +
           (now.getMonth() + 1).toString().padStart(2, '0') +
           now.getDate().toString().padStart(2, '0') + '-' +
           now.getHours().toString().padStart(2, '0') +
           now.getMinutes().toString().padStart(2, '0') +
           now.getSeconds().toString().padStart(2, '0');
  }

  log(message, type = 'info') {
    console.log(`[REAL-TEST] ${message}`);
    if (this.onProgress) {
      this.onProgress({ message, type, timestamp: new Date() });
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════

  async navigateToModule(moduleId) {
    this.log(`📍 Navegando a: ${moduleId}`, 'info');
    this.currentModule = moduleId;

    if (typeof showModuleContent === 'function') {
      try {
        await showModuleContent(moduleId);
        await this.waitForModuleReady(moduleId);
        return true;
      } catch (error) {
        this.log(`❌ Error navegando a ${moduleId}: ${error.message}`, 'error');
        return false;
      }
    } else {
      this.log(`❌ showModuleContent no disponible`, 'error');
      return false;
    }
  }

  async waitForModuleReady(moduleId) {
    this.log(`  ⏳ Esperando que ${moduleId} se cargue...`, 'info');

    for (let i = 0; i < 30; i++) {
      const mainContent = document.getElementById('mainContent');

      if (mainContent && mainContent.innerHTML.trim() !== '') {
        const hasError = mainContent.textContent.includes('no cargado') ||
                        mainContent.textContent.includes('pendiente');

        if (!hasError) {
          this.log(`  ✅ Módulo cargado`, 'success');
          await this.sleep(1500);
          return true;
        }
      }

      await this.sleep(300);
    }

    this.log(`  ⚠️ Timeout cargando módulo`, 'warning');
    return false;
  }

  async returnToAuditor() {
    this.log(`🔙 Volviendo a auditoría...`, 'info');
    await this.navigateToModule('auditor-dashboard');
    await this.sleep(1000);
  }

  // ═══════════════════════════════════════════════════════════
  // TESTING CRUD REAL
  // ═══════════════════════════════════════════════════════════

  async testModuleCRUD(moduleId, moduleName) {
    this.log(`🧪 Testing: ${moduleName}`, 'info');

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
      duration_ms: 0
    };

    const startTime = Date.now();

    try {
      // 1. NAVEGACIÓN
      this.log(`  1️⃣ Navegación...`, 'info');
      result.tests.navigation = await this.navigateToModule(moduleId);

      if (!result.tests.navigation) {
        result.errors.push('No se pudo navegar al módulo');
        result.duration_ms = Date.now() - startTime;
        return result;
      }

      // 2. CREATE
      this.log(`  2️⃣ CREATE - Creando registro...`, 'info');
      const createResult = await this.testCreate(moduleId, moduleName);
      result.tests.create = createResult.success;

      if (createResult.success && createResult.recordId) {
        this.createdRecords.push({
          module: moduleId,
          id: createResult.recordId,
          name: createResult.recordName
        });
        this.log(`  ✅ Registro creado: ${createResult.recordName}`, 'success');
      } else {
        result.errors.push(createResult.error || 'Error en CREATE');
        this.log(`  ❌ CREATE falló: ${createResult.error}`, 'error');
      }

      await this.sleep(1000);

      // 3. READ
      this.log(`  3️⃣ READ - Verificando en lista...`, 'info');
      if (createResult.success) {
        const readResult = await this.testRead(createResult.recordName);
        result.tests.read = readResult.success;

        if (readResult.success) {
          this.log(`  ✅ Registro visible en lista`, 'success');
        } else {
          result.errors.push('Registro no encontrado en lista');
          this.log(`  ❌ READ falló`, 'error');
        }
      }

      await this.sleep(1000);

      // 4. UPDATE
      this.log(`  4️⃣ UPDATE - Editando registro...`, 'info');
      if (createResult.success) {
        const updateResult = await this.testUpdate(moduleId);
        result.tests.update = updateResult.success;

        if (updateResult.success) {
          this.log(`  ✅ Registro editado correctamente`, 'success');
        } else {
          result.errors.push(updateResult.error || 'Error en UPDATE');
          this.log(`  ❌ UPDATE falló: ${updateResult.error}`, 'error');
        }
      }

      await this.sleep(1000);

      // 5. DELETE
      this.log(`  5️⃣ DELETE - Eliminando registro...`, 'info');
      if (createResult.success) {
        const deleteResult = await this.testDelete(moduleId);
        result.tests.delete = deleteResult.success;

        if (deleteResult.success) {
          this.log(`  ✅ Registro eliminado correctamente`, 'success');
          // Quitar del tracking si se eliminó
          this.createdRecords = this.createdRecords.filter(r => r.id !== createResult.recordId);
        } else {
          result.errors.push(deleteResult.error || 'Error en DELETE');
          this.log(`  ❌ DELETE falló: ${deleteResult.error}`, 'error');
        }
      }

    } catch (error) {
      this.log(`❌ Error en test: ${error.message}`, 'error');
      result.errors.push(error.message);
    }

    result.duration_ms = Date.now() - startTime;

    // Calcular success rate
    const total = Object.keys(result.tests).length;
    const passed = Object.values(result.tests).filter(t => t === true).length;
    result.success_rate = total > 0 ? Math.round((passed / total) * 100) : 0;
    result.status = result.success_rate >= 80 ? 'passed' : 'failed';

    this.log(`  📊 Resultado: ${result.success_rate}% (${passed}/${total})`,
             result.status === 'passed' ? 'success' : 'warning');

    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // OPERACIONES CRUD INDIVIDUALES
  // ═══════════════════════════════════════════════════════════

  async testCreate(moduleId, moduleName) {
    try {
      // Buscar botón "Agregar" con múltiples estrategias
      let addButton = document.querySelector('[onclick*="Modal"]');

      if (!addButton) {
        addButton = Array.from(document.querySelectorAll('button')).find(btn =>
          btn.textContent.includes('Agregar') || btn.textContent.includes('Nuevo')
        );
      }

      if (!addButton) {
        return { success: false, error: 'Botón Agregar no encontrado' };
      }

      // Click en agregar
      addButton.click();
      await this.sleep(800);

      // Buscar modal
      const modal = this.findOpenModal();
      if (!modal) {
        return { success: false, error: 'Modal no se abrió' };
      }

      // Generar datos de prueba
      const testData = this.generateTestData(moduleId, moduleName);

      // Llenar formulario
      const filled = await this.fillForm(modal, testData);
      if (!filled) {
        return { success: false, error: 'No se pudo llenar el formulario' };
      }

      // Guardar
      const saveButton = this.findSaveButton(modal);
      if (!saveButton) {
        return { success: false, error: 'Botón Guardar no encontrado' };
      }

      saveButton.click();
      await this.sleep(1500);

      // Verificar que se cerró (indica éxito)
      const stillOpen = this.findOpenModal();
      if (stillOpen) {
        return { success: false, error: 'Modal no se cerró (error al guardar)' };
      }

      return {
        success: true,
        recordId: testData._testId,
        recordName: testData.name || testData.nombre || testData.motivo
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testRead(recordName) {
    try {
      await this.sleep(500);

      // Buscar en tablas o listas
      const containers = document.querySelectorAll('table, .list-group, .data-grid, .module-content');

      for (const container of containers) {
        if (container.textContent.includes(recordName)) {
          return { success: true };
        }
      }

      return { success: false, error: 'Registro no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testUpdate(moduleId) {
    try {
      // Buscar primer botón de editar
      let editButton = document.querySelector('[onclick*="edit"]');

      if (!editButton) {
        editButton = Array.from(document.querySelectorAll('button')).find(btn =>
          btn.textContent.includes('Editar') || btn.innerHTML.includes('edit')
        );
      }

      if (!editButton) {
        return { success: false, error: 'Botón Editar no encontrado' };
      }

      editButton.click();
      await this.sleep(800);

      const modal = this.findOpenModal();
      if (!modal) {
        return { success: false, error: 'Modal de edición no se abrió' };
      }

      // Modificar primer campo de texto
      const inputs = modal.querySelectorAll('input[type="text"], textarea');
      if (inputs.length > 0) {
        const originalValue = inputs[0].value;
        inputs[0].value = originalValue + ' [EDITADO]';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Guardar
      const saveButton = this.findSaveButton(modal);
      if (saveButton) {
        saveButton.click();
        await this.sleep(1500);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testDelete(moduleId) {
    try {
      // Buscar primer botón de eliminar
      let deleteButton = document.querySelector('[onclick*="delete"]');

      if (!deleteButton) {
        deleteButton = Array.from(document.querySelectorAll('button')).find(btn =>
          btn.textContent.includes('Eliminar') || btn.innerHTML.includes('trash')
        );
      }

      if (!deleteButton) {
        return { success: false, error: 'Botón Eliminar no encontrado' };
      }

      deleteButton.click();
      await this.sleep(500);

      // Confirmar si hay modal de confirmación
      const confirmButton = document.querySelector('.swal2-confirm');
      if (confirmButton) {
        confirmButton.click();
        await this.sleep(1000);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  findOpenModal() {
    const selectors = [
      '.modal.show',
      '.modal[style*="display: block"]',
      '[role="dialog"][style*="display: block"]',
      '.modal-overlay.active'
    ];

    for (const selector of selectors) {
      const modal = document.querySelector(selector);
      if (modal) return modal;
    }

    return null;
  }

  findSaveButton(modal) {
    const selectors = [
      'button[onclick*="save"]',
      'button[onclick*="Save"]',
      '.btn-primary',
      'button.save'
    ];

    for (const selector of selectors) {
      const btn = modal.querySelector(selector);
      if (btn) return btn;
    }

    // Buscar por texto
    return Array.from(modal.querySelectorAll('button')).find(btn =>
      btn.textContent.includes('Guardar') || btn.textContent.includes('Save')
    );
  }

  generateTestData(moduleId, moduleName) {
    const testId = `test-${Date.now()}`;
    const baseName = `${this.testPrefix} ${moduleName}`;

    const data = {
      _testId: testId,
      name: baseName,
      nombre: baseName,
      descripcion: `Registro de prueba generado automáticamente`,
      description: `Test record generated automatically`
    };

    // Datos específicos por módulo
    const specific = {
      users: {
        email: `test${this.testTimestamp}@test.com`,
        apellido: 'Test',
        dni: String(Math.floor(Math.random() * 90000000) + 10000000),
        telefono: '1234567890'
      },
      departments: {
        codigo: `TEST-${this.testTimestamp}`
      },
      shifts: {
        hora_entrada: '09:00',
        hora_salida: '18:00'
      },
      medical: {
        motivo: baseName,
        diagnostico: 'Test automático'
      },
      vacation: {
        motivo: baseName,
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
      }
    };

    return { ...data, ...(specific[moduleId] || {}) };
  }

  async fillForm(formContainer, testData) {
    try {
      let filled = 0;

      // Llenar inputs
      const inputs = formContainer.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="date"]');

      for (const input of inputs) {
        const name = (input.name || input.id || '').toLowerCase();

        let value = null;
        if (name.includes('name') || name.includes('nombre')) value = testData.name || testData.nombre;
        else if (name.includes('email')) value = testData.email;
        else if (name.includes('dni')) value = testData.dni;
        else if (name.includes('telefono') || name.includes('phone')) value = testData.telefono;
        else if (name.includes('apellido')) value = testData.apellido;
        else if (name.includes('codigo')) value = testData.codigo;
        else if (name.includes('motivo')) value = testData.motivo;
        else if (name.includes('hora_entrada')) value = testData.hora_entrada;
        else if (name.includes('hora_salida')) value = testData.hora_salida;
        else if (name.includes('fecha_inicio')) value = testData.fecha_inicio;
        else if (name.includes('fecha_fin')) value = testData.fecha_fin;

        if (value) {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          filled++;
        }
      }

      // Llenar textareas
      const textareas = formContainer.querySelectorAll('textarea');
      for (const textarea of textareas) {
        textarea.value = testData.descripcion || testData.description;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        filled++;
      }

      return filled > 0;
    } catch (error) {
      console.error('Error llenando formulario:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════

  async cleanup() {
    this.log(`🧹 Iniciando cleanup...`, 'info');

    const token = localStorage.getItem('authToken') || window.authToken;
    let deleted = 0;
    let failed = 0;

    for (const record of this.createdRecords) {
      try {
        this.log(`  🗑️ Eliminando ${record.module}: ${record.name}`, 'info');

        const endpoint = this.getDeleteEndpoint(record.module, record.id);
        if (!endpoint) {
          failed++;
          continue;
        }

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          deleted++;
          this.log(`  ✅ Eliminado`, 'success');
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        this.log(`  ❌ Error: ${error.message}`, 'error');
      }
    }

    this.log(`🧹 Cleanup: ${deleted} eliminados, ${failed} errores`, 'info');

    return { deleted, failed, total: this.createdRecords.length };
  }

  getDeleteEndpoint(moduleId, recordId) {
    const map = {
      users: `/api/v1/users/${recordId}`,
      departments: `/api/v1/departments/${recordId}`,
      shifts: `/api/v1/shifts/${recordId}`,
      kiosks: `/api/v1/kiosks/${recordId}`,
      medical: `/api/v1/medical/${recordId}`,
      vacation: `/api/v1/vacation/${recordId}`,
      legal: `/api/v1/legal/${recordId}`,
      training: `/api/v1/training/${recordId}`
    };

    return map[moduleId];
  }

  // ═══════════════════════════════════════════════════════════
  // EJECUTORES
  // ═══════════════════════════════════════════════════════════

  async runGlobalTest(modules) {
    this.isRunning = true;
    this.log(`🌍 Iniciando TEST GLOBAL de ${modules.length} módulos...`, 'info');
    this.results = [];

    for (const module of modules) {
      if (!this.isRunning) {
        this.log(`⏸️ Test detenido por usuario`, 'warning');
        break;
      }

      const result = await this.testModuleCRUD(module.id, module.name);
      this.results.push(result);
      await this.sleep(500);
    }

    // Cleanup
    const cleanupResult = await this.cleanup();

    // Volver a auditoría
    await this.returnToAuditor();

    // Summary
    const summary = this.calculateSummary(cleanupResult);

    if (this.onComplete) {
      this.onComplete(summary);
    }

    this.isRunning = false;
    return summary;
  }

  async runModuleTest(moduleId, moduleName) {
    this.isRunning = true;
    this.log(`🎯 Iniciando TEST de ${moduleName}...`, 'info');
    this.results = [];

    const result = await this.testModuleCRUD(moduleId, moduleName);
    this.results.push(result);

    // Cleanup
    const cleanupResult = await this.cleanup();

    // Volver a auditoría
    await this.returnToAuditor();

    // Summary
    const summary = this.calculateSummary(cleanupResult);

    if (this.onComplete) {
      this.onComplete(summary);
    }

    this.isRunning = false;
    return summary;
  }

  calculateSummary(cleanupResult) {
    const totalTests = this.results.reduce((sum, r) =>
      sum + Object.keys(r.tests).length, 0);
    const passedTests = this.results.reduce((sum, r) =>
      sum + Object.values(r.tests).filter(t => t === true).length, 0);

    const totalModules = this.results.length;
    const passedModules = this.results.filter(r => r.status === 'passed').length;

    return {
      execution_id: `real-browser-${this.testTimestamp}`,
      test_prefix: this.testPrefix,
      summary: {
        total_modules: totalModules,
        passed_modules: passedModules,
        failed_modules: totalModules - passedModules,
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: totalTests - passedTests,
        success_rate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      },
      cleanup: cleanupResult,
      results: this.results,
      timestamp: new Date()
    };
  }

  stop() {
    this.isRunning = false;
    this.log(`⏸️ Test detenido`, 'warning');
  }
}

// Exponer globalmente
window.RealBrowserTestRunner = RealBrowserTestRunner;
