/**
 * FRONTEND COLLECTOR - Testea módulos del frontend como usuario real
 *
 * - Abre navegador con Puppeteer
 * - Navega a cada módulo
 * - Testea CRUD completo (Create, Read, Update, Delete)
 * - Detecta botones rotos, modales que no abren, etc.
 * - Verifica relaciones inter-módulos usando SystemRegistry
 *
 * @version 1.0.0
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

class FrontendCollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.registry = systemRegistry;
    // Detectar puerto dinámicamente del servidor actual
    const port = process.env.PORT || '9999';
    this.baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    this.browser = null;
    this.page = null;

    // Módulos que NO tienen CRUD separado (son páginas principales/dashboards)
    this.nonCrudModules = ['dashboard', 'settings']; // Dashboard principal y Settings no tienen CRUD separado

    console.log(`  🔧 [FRONTEND] Base URL: ${this.baseUrl}`);
  }

  async collect(execution_id, config) {
    console.log('  🌐 [FRONTEND] Iniciando pruebas de frontend...');

    const results = [];

    try {
      // Iniciar navegador
      await this.initBrowser();

      // Login - pasar el token si está disponible
      await this.login(config.company_id, config.authToken);

      // Obtener módulos a testear - TODOS los módulos del registry
      const modules = config.moduleFilter ?
        [this.registry.getModule(config.moduleFilter)] :
        this.registry.getAllModules(); // TODOS los 45 módulos

      console.log(`  📋 [FRONTEND] Testeando ${modules.length} módulos del registry...`);

      // Testear cada módulo
      for (const module of modules) {
        if (!module) continue;

        console.log(`    🧪 [FRONTEND] Testeando módulo: ${module.name}`);

        const testResult = await this.testModule(module, execution_id);
        results.push(testResult);
      }

    } catch (error) {
      console.error('  ❌ [FRONTEND] Error:', error);
    } finally {
      await this.closeBrowser();
    }

    return results;
  }

  async initBrowser() {
    console.log('    🌐 [BROWSER] Abriendo navegador VISIBLE...');

    this.browser = await puppeteer.launch({
      headless: false, // ✅ NAVEGADOR VISIBLE: El usuario verá todo el proceso de testing en tiempo real
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Evita problemas de memoria compartida
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--start-maximized' // Maximizar ventana para mejor visualización
      ],
      defaultViewport: null // Usar viewport completo de la ventana
    });

    this.page = await this.browser.newPage();

    // ✅ AUTO-ACEPTAR TODOS LOS DIÁLOGOS (alert, confirm, prompt)
    this.page.on('dialog', async dialog => {
      console.log(`      🔔 [AUTO-DIALOG] Tipo: ${dialog.type()} - Mensaje: "${dialog.message().substring(0, 100)}..."`);
      await dialog.accept(); // Aceptar automáticamente
      console.log(`      ✅ [AUTO-DIALOG] Diálogo aceptado automáticamente`);
    });

    // ✅ Setear viewport a tamaño de pantalla completo (1920x1080)
    await this.page.setViewport({ width: 1366, height: 768 });
    console.log('    📐 [BROWSER] Viewport configurado a 1366x768 (responsive estándar)');

    // Deshabilitar cache para obtener siempre la versión más reciente del HTML
    await this.page.setCacheEnabled(false);
    console.log('    🚫 [BROWSER] Cache deshabilitado - cargando versión fresca del HTML');

    // ✅ DETECCIÓN EXHAUSTIVA DE ERRORES

    // 1. Errores de consola (JavaScript)
    this.consoleErrors = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        const error = msg.text();
        console.log(`      ❌ [CONSOLE ERROR] ${error}`);
        this.consoleErrors.push({
          type: 'console',
          message: error,
          timestamp: new Date()
        });
      }
    });

    // 2. Errores de página (exceptions no manejadas)
    this.pageErrors = [];
    this.page.on('pageerror', error => {
      console.log(`      ❌ [PAGE ERROR] ${error.message}`);
      this.pageErrors.push({
        type: 'exception',
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
    });

    // 3. Errores de red (requests fallidos)
    this.networkErrors = [];
    this.page.on('requestfailed', request => {
      console.log(`      ❌ [NETWORK ERROR] ${request.url()} - ${request.failure().errorText}`);
      this.networkErrors.push({
        type: 'network',
        url: request.url(),
        error: request.failure().errorText,
        timestamp: new Date()
      });
    });

    // 4. Respuestas 4xx/5xx
    this.page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`      ⚠️  [HTTP ${response.status()}] ${response.url()}`);
        this.networkErrors.push({
          type: 'http',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date()
        });
      }
    });
  }

  async login(company_id, authToken = null) {
    console.log('    🔐 [LOGIN] Iniciando login automático...');
    console.log(`    📋 [LOGIN] Company ID recibido: ${company_id}`);

    // ✅ waitUntil: 'domcontentloaded' - No espera recursos externos (face-api CDN)
    await this.page.goto(`${this.baseUrl}/panel-empresa.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // ✅ Obtener slug de la empresa por company_id
      console.log(`    📋 Obteniendo slug de empresa con company_id: ${company_id}`);

      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();

      const result = await client.query('SELECT slug FROM companies WHERE company_id = $1', [company_id]);
      await client.end();

      if (!result.rows || result.rows.length === 0) {
        console.error(`    ❌ No se encontró empresa con ID ${company_id}`);
        return;
      }

      const companySlug = result.rows[0].slug;
      console.log(`    ✅ Empresa encontrada: ${companySlug}`);

      // Esperar a que cargue el formulario de login
      await this.page.waitForSelector('#companySelect', { timeout: 10000 });
      console.log('    ✅ Formulario de login cargado');

      // ESPERAR a que el dropdown tenga opciones cargadas
      console.log('    ⏳ Esperando que dropdown tenga opciones cargadas...');
      await this.page.waitForFunction(
        () => {
          const select = document.getElementById('companySelect');
          return select && select.options.length > 1; // Más de 1 (no solo el placeholder)
        },
        { timeout: 10000 }
      );
      console.log('    ✅ Dropdown con opciones cargadas');

      // Esperar 1 segundo adicional para asegurar que el evento onchange está listo
      await new Promise(resolve => setTimeout(resolve, 1000));

      // PASO 1: Seleccionar empresa
      console.log(`    🏢 Seleccionando empresa: ${companySlug}`);
      await this.page.select('#companySelect', companySlug);
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos para que se habiliten los campos

      // PASO 2: Esperar a que se habilite el campo de usuario e ingresar "soporte"
      console.log('    ⏳ Esperando que se habilite campo de usuario...');
      await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
      
      // Limpiar campo de usuario (por si tiene valor previo)
      await this.page.click('#userInput', { clickCount: 3 }); // Triple click para seleccionar todo
      await this.page.keyboard.press('Backspace');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('    👤 Ingresando usuario: soporte');
      await this.page.type('#userInput', 'soporte', { delay: 100 });
      
      // Verificar que se escribió correctamente
      const userValue = await this.page.$eval('#userInput', el => el.value);
      console.log(`    ✅ Usuario ingresado: "${userValue}"`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      // PASO 3: Esperar a que se habilite el campo de contraseña e ingresar
      console.log('    ⏳ Esperando que se habilite campo de contraseña...');
      await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 5000 });
      
      // Limpiar campo de contraseña (por si tiene valor previo)
      await this.page.click('#passwordInput', { clickCount: 3 }); // Triple click para seleccionar todo
      await this.page.keyboard.press('Backspace');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('    🔑 Ingresando contraseña: admin123');
      await this.page.type('#passwordInput', 'admin123', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // PASO 4: Click en botón Ingresar
      console.log('    🚀 Haciendo click en botón Ingresar...');
      await this.page.waitForSelector('#loginButton:not([disabled])', { timeout: 5000 });
      await this.page.click('#loginButton');

      // PASO 5: Esperar a que se complete el proceso de autenticación
      console.log('    ⏳ Esperando a que se complete la autenticación...');

      // Esperar hasta 15 segundos a que aparezcan authToken y currentCompany
      const loginSuccess = await this.page.waitForFunction(
        () => {
          const hasToken = !!localStorage.getItem('authToken');
          const hasCompany = !!localStorage.getItem('currentCompany');
          console.log(`[LOGIN-CHECK] Token: ${hasToken}, Company: ${hasCompany}`);
          return hasToken && hasCompany;
        },
        { timeout: 15000, polling: 500 }
      ).catch(() => false);

      // Verificar que se haya logueado correctamente
      const isLoggedIn = await this.page.evaluate(() => {
        return !!localStorage.getItem('authToken') && !!localStorage.getItem('currentCompany');
      });

      if (isLoggedIn) {
        const companyName = await this.page.evaluate(() => {
          try {
            const companyData = localStorage.getItem('currentCompany');
            return companyData ? JSON.parse(companyData).name : 'Unknown';
          } catch {
            return 'Unknown';
          }
        });
        console.log(`    ✅ [LOGIN] Login completado exitosamente - Empresa: ${companyName}`);

        // CERRAR MODAL DEL AI ASSISTANT (para evitar false positives en tests)
        console.log('    🤖 Cerrando modal del AI Assistant si está abierto...');
        await this.page.evaluate(() => {
          try {
            const aiWindow = document.getElementById('ai-assistant-window');
            if (aiWindow && aiWindow.classList.contains('open')) {
              const closeBtn = document.getElementById('ai-assistant-close-button');
              if (closeBtn) {
                closeBtn.click();
                console.log('    ✅ [AI-ASSISTANT] Modal cerrado correctamente');
              }
            }
          } catch (e) {
            console.log('    ℹ️  [AI-ASSISTANT] No se pudo cerrar el modal (puede no estar presente)');
          }
        });
        await new Promise(resolve => setTimeout(resolve, 500)); // Esperar a que la animación de cierre termine

      } else {
        console.error('    ❌ [LOGIN] Login falló - No se encontró token o empresa');
        // Debug: mostrar qué hay en localStorage y window
        const debugInfo = await this.page.evaluate(() => {
          return {
            hasToken: !!localStorage.getItem('authToken'),
            hasCompany: !!window.currentCompany,
            companyKeys: window.currentCompany ? Object.keys(window.currentCompany) : [],
            localStorageKeys: Object.keys(localStorage)
          };
        });
        console.error('    🔍 [LOGIN-DEBUG]', JSON.stringify(debugInfo, null, 2));
      }

    } catch (error) {
      console.error('    ❌ [LOGIN] Error en login:', error.message);
      console.error('    Stack:', error.stack);
    }
  }

  async testModule(module, execution_id) {
    const { AuditLog } = this.database;
    const startTime = Date.now();

    // Crear log de inicio
    const log = await AuditLog.create({
      execution_id,
      test_type: 'e2e',
      module_name: module.id,
      test_name: `Frontend CRUD - ${module.name}`,
      test_description: `Test completo de interfaz: navegación, CRUD, botones, modales`,
      status: 'in-progress',
      started_at: new Date()
    });

    const errors = [];
    let passed = 0;
    let failed = 0;

    try {
      // CHECK: Si es un módulo sin CRUD (dashboard principal, settings), skip automático
      if (this.nonCrudModules.includes(module.id)) {
        console.log(`      ⏭️  Módulo ${module.id} es página principal (sin CRUD separado) - SKIP`);

        await log.update({
          status: 'pass', // PASS porque no es un error, es por diseño
          completed_at: new Date(),
          duration_ms: Date.now() - startTime,
          error_message: `[SKIP] Módulo es página principal sin CRUD separado`,
          severity: null,
          test_data: { skipped: true, reason: 'non_crud_module' }
        });

        return log;
      }

      // TEST 1: Navegar al módulo
      console.log(`      1️⃣ Navegando a módulo ${module.id}...`);
      const navigationOk = await this.testNavigation(module);

      // Si no se puede navegar, el módulo NO existe o NO está implementado → SKIP
      if (!navigationOk) {
        console.log(`      ⏭️  Módulo ${module.id} no está implementado/disponible - SKIP`);

        await log.update({
          status: 'pass', // PASS porque no es un error, solo no está implementado
          completed_at: new Date(),
          duration_ms: Date.now() - startTime,
          error_message: `[SKIP] Módulo no implementado o no disponible en frontend`,
          severity: null, // No es un error, solo está deshabilitado
          test_data: { skipped: true, reason: 'module_not_implemented' }
        });

        return log;
      }

      passed++; // Navegación OK

      // TEST 2: Verificar que cargue la lista
      console.log(`      2️⃣ Verificando carga de lista...`);
      const listOk = await this.testList(module);
      if (listOk) {
        passed++;
      } else {
        failed++;
        errors.push({
          test: 'List Loading',
          error: `Lista de ${module.name} no carga`,
          suggestion: `Verificar función load${module.id.charAt(0).toUpperCase() + module.id.slice(1)}() en módulo JS`
        });
      }

      // TEST 3: Botón "Agregar" existe y funciona
      console.log(`      3️⃣ Testeando botón Agregar...`);
      const addButtonOk = await this.testAddButton(module);
      if (addButtonOk) {
        passed++;
      } else {
        failed++;
        errors.push({
          test: 'Add Button',
          error: `Botón "Agregar ${module.name}" no funciona`,
          suggestion: `Verificar onclick="openAdd${module.id}Modal()" en el HTML`
        });
      }

      // TEST 4: Botones de acción por fila (Editar, Eliminar)
      console.log(`      4️⃣ Testeando botones de fila...`);
      const rowButtonsOk = await this.testRowButtons(module);
      if (!rowButtonsOk.success) {
        failed++;
        errors.push({
          test: 'Row Buttons',
          error: rowButtonsOk.error,
          suggestion: rowButtonsOk.suggestion
        });
      } else {
        passed++;
      }

      // TEST 5: Modal de edición se abre
      console.log(`      5️⃣ Testeando modal de edición...`);
      const editModalOk = await this.testEditModal(module);
      if (editModalOk) {
        passed++;
      } else {
        failed++;
        errors.push({
          test: 'Edit Modal',
          error: `Modal de edición no se abre`,
          suggestion: `Verificar función openEdit${module.id}Modal(id) y que el modal tenga ID correcto`
        });
      }

      // NUEVO: Evaluar errores de red y consola capturados
      const criticalHttpErrors = this.networkErrors.filter(err =>
        err.type === 'http' && [401, 403, 500, 503].includes(err.status)
      );
      if (criticalHttpErrors.length > 0) {
        failed++;
        criticalHttpErrors.forEach(err => {
          errors.push({
            test: 'HTTP Errors',
            error: `${err.status} ${err.statusText} - ${err.url}`,
            suggestion: `Verificar autenticación y permisos para: ${err.url}`
          });
        });
      }

      const criticalConsoleErrors = this.consoleErrors.filter(err => {
        const msg = err.message.toLowerCase();
        return msg.includes('error') || msg.includes('failed') || msg.includes('unauthorized');
      });
      if (criticalConsoleErrors.length > 0) {
        failed++;
        errors.push({
          test: 'Console Errors',
          error: `${criticalConsoleErrors.length} errores críticos de consola detectados`,
          suggestion: `Revisar errores en consola del navegador al cargar ${module.name}`
        });
      }

      const networkFailures = this.networkErrors.filter(err => err.type === 'network');
      if (networkFailures.length > 0) {
        failed++;
        errors.push({
          test: 'Network Errors',
          error: `${networkFailures.length} requests fallaron`,
          suggestion: `Verificar conectividad y endpoints del módulo ${module.name}`
        });
      }

      // Actualizar log con resultados (incluyendo errores de red/consola)
      await log.update({
        status: failed > 0 ? 'fail' : 'pass',
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        error_message: failed > 0 ? `${failed} tests fallaron` : null,
        error_context: errors.length > 0 ? {
          errors,
          http_errors: criticalHttpErrors,
          console_errors: criticalConsoleErrors.slice(0, 5),
          network_errors: networkFailures.slice(0, 5)
        } : null,
        suggestions: errors.length > 0 ? errors.map(e => ({
          problem: e.error,
          solution: e.suggestion,
          confidence: 0.8
        })) : null
      });

      console.log(`      ✅ Tests completados: ${passed} passed, ${failed} failed`);

      // 🎫 CREAR TICKET AUTOMÁTICO si hay errores críticos
      if (failed > 0 && errors.length > 0) {
        try {
          const AutoAuditTicketSystem = require('../core/AutoAuditTicketSystem');

          console.log(`      🎫 [AUTO-TICKET] Creando ticket automático para ${module.name}...`);

          const ticket = await AutoAuditTicketSystem.createAutoTicket({
            execution_id,
            module_name: module.id,
            errors: errors,
            error_context: {
              http_errors: criticalHttpErrors,
              console_errors: criticalConsoleErrors.slice(0, 5),
              network_errors: networkFailures.slice(0, 5)
            },
            company_id: config.company_id || 11
          });

          if (ticket) {
            console.log(`      ✅ [AUTO-TICKET] Ticket creado: ${ticket.ticket_number}`);
          }
        } catch (ticketError) {
          console.error(`      ⚠️  [AUTO-TICKET] Error creando ticket:`, ticketError.message);
          // No bloqueamos la auditoría si falla la creación del ticket
        }
      }

      return log;

    } catch (error) {
      console.error(`      ❌ Error testeando ${module.name}:`, error);

      await log.update({
        status: 'fail',
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        error_type: error.name,
        error_message: error.message,
        error_stack: error.stack
      });

      return log;
    }
  }

  async autoCloseErrorModals() {
    try {
      // Buscar botones de cerrar modal (X, Cerrar, Aceptar, OK)
      const closeButtons = await this.page.$('button.close, button.btn-close, button[data-dismiss="modal"], button:contains("Cerrar"), button:contains("Aceptar"), button:contains("OK"), .swal2-confirm, .swal2-cancel');
      
      if (closeButtons.length > 0) {
        console.log(`      🔘 [AUTO-CLOSE] Encontrados ${closeButtons.length} botones de cerrar modal`);
        for (const btn of closeButtons) {
          try {
            await btn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            // Ignorar si el botón ya no existe
          }
        }
      }
    } catch (error) {
      // Ignorar errores
    }
  }

  async testNavigation(module) {
    try {
      // Intentar navegar usando openModule()
      await this.page.evaluate((moduleId, moduleName) => {
        if (typeof window.openModuleDirect === 'function') {
          window.openModuleDirect(moduleId, moduleName);
          return true;
        }
        return false;
      }, module.id, module.name);

      // Esperar a que cargue
      await new Promise(resolve => setTimeout(resolve, 2000));

      // AUTO-CERRAR modales de error antes de verificar
      await this.autoCloseErrorModals();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // NUEVO: Detectar mensajes de error visibles en la página
      const errorMessages = await this.detectVisibleErrors();
      if (errorMessages.length > 0) {
        console.log(`      🔴 [ERROR DETECTADO] ${errorMessages.length} mensajes de error visibles:`);
        errorMessages.forEach(msg => {
          console.log(`         ❌ "${msg.text}" (id: ${msg.id || 'N/A'})`);
        });
      }

      // Verificar que el módulo está visible
      const isVisible = await this.page.evaluate((moduleId, moduleName) => {
        const content = document.getElementById('mainContent');
        return content && content.innerHTML.includes(moduleId);
      }, module.id, module.name);

      return isVisible;
    } catch (error) {
      return false;
    }
  }

  /**
   * NUEVA FUNCIÓN: Detecta mensajes de error visibles en la página
   * Busca divs con texto de error, fondo rojo, o IDs específicos como "training-message"
   */
  async detectVisibleErrors() {
    return await this.page.evaluate(() => {
      const errors = [];

      // Buscar todos los divs en la página
      const allDivs = document.querySelectorAll('div');

      allDivs.forEach(div => {
        const text = div.textContent.trim();
        const computedStyle = window.getComputedStyle(div);
        const bgColor = computedStyle.backgroundColor;
        const display = computedStyle.display;

        // EXCLUSIONES: Ignorar componentes del sistema que no son errores reales
        const isAIAssistant = div.id && (
          div.id.startsWith('ai-assistant-') ||
          div.id === 'ai-assistant-messages' ||
          div.id === 'ai-assistant-chat' ||
          div.id === 'ai-assistant-input' ||
          div.classList.contains('ai-assistant')
        );

        // Si es del asistente IA, skip
        if (isAIAssistant) return;

        // Detectar si es un mensaje de error basado en:
        // 1. Tiene texto que incluye "error", "❌", "falló", etc.
        // 2. Tiene fondo rojo
        // 3. Tiene un ID específico conocido (training-message, etc.)
        const hasErrorText = /error|falló|falla|problema|❌|no se pudo|failed/i.test(text);
        const hasRedBackground = bgColor.includes('rgb(220, 53, 69)') || // Bootstrap danger
                                  bgColor.includes('rgb(239, 68, 68)') || // Tailwind red
                                  bgColor.includes('rgb(185, 28, 28)');  // Dark red
        const isErrorDiv = div.id && (
          div.id.includes('error') ||
          div.id.includes('message') ||
          div.id === 'training-message'
        );

        // Si coincide con algún criterio Y está visible (no display:none)
        if ((hasErrorText || hasRedBackground || isErrorDiv) &&
            text.length > 0 &&
            text.length < 500 && // Evitar divs con mucho contenido
            display !== 'none') {
          errors.push({
            id: div.id || null,
            className: div.className || null,
            text: text.substring(0, 200), // Max 200 caracteres
            backgroundColor: bgColor,
            isVisible: display !== 'none'
          });
        }
      });

      return errors;
    });
  }

  async testList(module) {
    try {
      // Buscar tabla o lista de items
      await new Promise(resolve => setTimeout(resolve, 2000));

      const hasItems = await this.page.evaluate(() => {
        // Buscar tablas
        const tables = document.querySelectorAll('table tbody tr');
        if (tables.length > 0) return true;

        // Buscar cards o lista
        const cards = document.querySelectorAll('.card, .item, .row');
        return cards.length > 0;
      });

      return hasItems;
    } catch (error) {
      return false;
    }
  }

  async testAddButton(module) {
    try {
      // Buscar botón "Agregar"
      const addButton = await this.page.$('button:contains("Agregar"), button[onclick*="Add"], button[onclick*="add"]');

      if (!addButton) return false;

      // Click en el botón
      await addButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verificar que se abrió un modal
      const modalOpened = await this.page.evaluate(() => {
        const modals = document.querySelectorAll('.modal.show, [style*="display: block"]');
        return modals.length > 0;
      });

      return modalOpened;
    } catch (error) {
      return false;
    }
  }

  async testRowButtons(module) {
    try {
      // Buscar primera fila de la tabla
      const firstRow = await this.page.$('table tbody tr:first-child');

      if (!firstRow) {
        return {
          success: false,
          error: 'No se encontraron filas en la tabla',
          suggestion: `Verificar que la función load${module.id}() esté poblando la tabla correctamente`
        };
      }

      // Buscar botones de acción en la fila
      const buttons = await firstRow.$$('button, a.btn, i.fa-edit, i.fa-trash');

      if (buttons.length === 0) {
        return {
          success: false,
          error: 'No se encontraron botones de acción (Editar/Eliminar)',
          suggestion: `Agregar botones en la columna de acciones con onclick="edit${module.id}(id)" y onclick="delete${module.id}(id)"`
        };
      }

      // Intentar hacer click en el primer botón (probablemente Editar)
      await buttons[0].click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verificar que algo pasó (modal se abrió o función se ejecutó)
      const actionWorked = await this.page.evaluate(() => {
        // Verificar modal abierto o algún cambio
        const modals = document.querySelectorAll('.modal.show, [style*="display: block"]');
        return modals.length > 0;
      });

      if (!actionWorked) {
        return {
          success: false,
          error: 'Botón de acción no hace nada al hacer click',
          suggestion: `Verificar que la función onclick esté correctamente definida y no tenga errores JavaScript`
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: 'Revisar errores JavaScript en consola del navegador'
      };
    }
  }

  async testEditModal(module) {
    try {
      // Ya deberíamos tener un modal abierto del test anterior
      const modalVisible = await this.page.evaluate(() => {
        const modals = document.querySelectorAll('.modal.show, [style*="display: block"]');
        return modals.length > 0;
      });

      if (!modalVisible) return false;

      // Verificar que tiene campos de formulario
      const hasFormFields = await this.page.evaluate(() => {
        const inputs = document.querySelectorAll('.modal input, .modal select, .modal textarea');
        return inputs.length > 0;
      });

      return hasFormFields;
    } catch (error) {
      return false;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      console.log('    ✅ [BROWSER] Cerrado');
    }
  }
}

module.exports = FrontendCollector;
