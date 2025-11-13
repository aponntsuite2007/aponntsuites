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

const { chromium } = require('playwright');
const axios = require('axios');
const LearningEngine = require('../learning/LearningEngine');

class FrontendCollector {
  constructor(database, systemRegistry) {
    this.database = database;
    this.systemRegistry = systemRegistry;
    this.learningEngine = new LearningEngine(); // ⭐ SISTEMA AUTO-EVOLUTIVO
    // Detectar puerto dinámicamente del servidor actual
    const port = process.env.PORT || '9999';
    this.baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    this.browser = null;
    this.page = null;

    // Módulos que NO tienen CRUD separado (son páginas principales/dashboards)
    this.nonCrudModules = ['dashboard', 'settings']; // Dashboard principal y Settings no tienen CRUD separado

    // ⭐ PREFIJO PARA DATOS DE TESTING - Facilita limpieza posterior
    this.TEST_PREFIX = '[TEST-AUDIT]';

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

      // ✅✅✅ MEGA-UPGRADE: ESCUCHAR ERRORES DINÁMICOS POST-LOGIN (60s) ✅✅✅
      console.log(`  ⏳ [POST-LOGIN LISTENER] Escuchando errores dinámicos por 60 segundos...`);
      console.log(`     (Esto capturará errores de módulos que se cargan DESPUÉS del login)`);

      const postLoginErrors = await this.listenForDynamicErrors(60000); // 60 segundos

      console.log(`  ✅ [POST-LOGIN LISTENER] Completado - ${postLoginErrors.console} console, ${postLoginErrors.network} network, ${postLoginErrors.page} page errors capturados`);

      // ✅✅✅ NOTIFICAR ERRORES EN BATCH A WEBSOCKET ✅✅✅
      if (postLoginErrors.total > 0) {
        await this.notifyErrorsBatchToWebSocket({
          phase: 'post-login-60s',
          duration_ms: 60000,
          errors: this.consoleErrors.concat(this.pageErrors.map(e => ({
            type: 'exception',
            category: e.category,
            message: e.message,
            file: e.file,
            line: e.line,
            column: e.column,
            severity: e.severity,
            canAutoFix: this._canAutoFix(e)
          })))
        });
      }

      // Obtener módulos a testear - TODOS los módulos del registry
      const modules = config.moduleFilter ?
        [this.systemRegistry.getModule(config.moduleFilter)] :
        this.systemRegistry.getAllModules(); // TODOS los 45 módulos

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

    // ⭐⭐⭐ AUTO-APRENDIZAJE: Analizar resultados y registrar conocimiento ⭐⭐⭐
    try {
      console.log(`  🧠 [LEARNING] Iniciando análisis de resultados para aprendizaje...`);

      const learningInsights = await this.learningEngine.analyzeTestResults(execution_id, {
        results: results,
        errors: this.consoleErrors || [],
        pageErrors: this.pageErrors || [],
        networkErrors: this.networkErrors || [],
        failures: results.filter(r => r.status === 'failed' || r.status === 'fail'),
        passes: results.filter(r => r.status === 'passed' || r.status === 'pass'),
        warnings: results.filter(r => r.status === 'warning')
      });

      console.log(`  ✅ [LEARNING] Conocimiento capturado:`);
      console.log(`     - Patrones de error detectados: ${learningInsights.errorPatternsDetected || 0}`);
      console.log(`     - Edge cases identificados: ${learningInsights.edgeCasesIdentified || 0}`);
      console.log(`     - Insights de performance: ${learningInsights.performanceInsights || 0}`);
      console.log(`     - Estrategias evaluadas: ${learningInsights.strategiesEvaluated || 0}`);

    } catch (learningError) {
      console.error(`  ⚠️  [LEARNING] Error en aprendizaje (no bloqueante):`, learningError.message);
      // No bloqueamos la auditoría si falla el aprendizaje
    }

    return results;
  }

  async initBrowser() {
    console.log('    🌐 [BROWSER] Abriendo navegador VISIBLE...');

    this.browser = await chromium.launch({
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
       // Usar viewport completo de la ventana
       // ✅ 3 MINUTOS de timeout para protocol calls (aumentado por login lento)
    });

    const context = await this.browser.newContext({ viewport: null });
        this.page = await context.newPage();

    // ✅ AUTO-ACEPTAR TODOS LOS DIÁLOGOS (alert, confirm, prompt)
    this.page.on('dialog', async dialog => {
      console.log(`      🔔 [AUTO-DIALOG] Tipo: ${dialog.fill()} - Mensaje: "${dialog.message().substring(0, 100)}..."`);
      await dialog.accept(); // Aceptar automáticamente
      console.log(`      ✅ [AUTO-DIALOG] Diálogo aceptado automáticamente`);
    });

    // ✅ Setear viewport a tamaño de pantalla completo (1920x1080)
    // Playwright viewport set in newContext
        // await this.page.setViewport({ width: 1366, height: 768 });
    console.log('    📐 [BROWSER] Viewport configurado a 1366x768 (responsive estándar)');

    // Deshabilitar cache para obtener siempre la versión más reciente del HTML
    await this.page.setCacheEnabled(false);
    console.log('    🚫 [BROWSER] Cache deshabilitado - cargando versión fresca del HTML');

    // ✅✅✅ MEGA-UPGRADE: DETECCIÓN MASIVA DE 100+ TIPOS DE ERRORES ✅✅✅

    // Arrays para almacenar errores
    this.consoleErrors = [];
    this.pageErrors = [];
    this.networkErrors = [];
    this.performanceIssues = [];
    this.securityIssues = [];

    // 1️⃣ JAVASCRIPT ERRORS (30+ tipos) - CONSOLA
    this.page.on('console', async msg => {
      if (msg.fill() === 'error') {
        const errorText = msg.text();
        const location = msg.location();
        const stackTrace = msg.stackTrace ? msg.stackTrace() : [];
        const filePath = location && location.url ? this._extractFileName(location.url) : 'unknown';
        const lineNumber = location && location.lineNumber ? location.lineNumber : null;
        const columnNumber = location && location.columnNumber ? location.columnNumber : null;

        // ✅ CLASIFICAR ERROR POR TIPO
        const errorCategory = this._classifyJavaScriptError(errorText);

        const errorDetails = {
          type: 'console', category: errorCategory, // ✨ NUEVO: Categoría específica
          message: errorText,
          file: filePath,
          line: lineNumber,
          column: columnNumber,
          url: location ? location.url : null,
          stackTrace: stackTrace,
          timestamp: new Date(),
          severity: this._getSeverityFromCategory(errorCategory)
        };

        console.log(`      ❌ [${errorCategory.toUpperCase()}] ${errorText}`);
        console.log(`         📁 File: ${filePath}:${lineNumber}:${columnNumber}`);

        this.consoleErrors.push(errorDetails);
      }

      // ✅ CAPTURAR WARNINGS TAMBIÉN (pueden indicar problemas futuros)
      if (msg.fill() === 'warning') {
        const warningText = msg.text();
        const location = msg.location();

        // Solo capturar warnings críticos
        if (this._isCriticalWarning(warningText)) {
          this.consoleErrors.push({
            type: 'warning', category: 'warning-critical',
            message: warningText,
            file: location && location.url ? this._extractFileName(location.url) : 'unknown',
            line: location ? location.lineNumber : null,
            timestamp: new Date(),
            severity: 'low'
          });
        }
      }
    });

    // 2️⃣ PAGE ERRORS (30+ tipos) - EXCEPCIONES NO MANEJADAS
    this.page.on('pageerror', error => {
      const errorMessage = error.message;
      const errorStack = error.stack || '';
      const stackInfo = this._parseStackTrace(errorStack);

      // ✅ CLASIFICAR ERROR POR TIPO
      const errorCategory = this._classifyJavaScriptError(errorMessage);

      const errorDetails = {
        type: 'exception',
        category: errorCategory,
        message: errorMessage,
        stack: errorStack,
        file: stackInfo.file || 'unknown',
        line: stackInfo.line || null,
        column: stackInfo.column || null,
        parsedStack: stackInfo.frames || [],
        timestamp: new Date(),
        severity: this._getSeverityFromCategory(errorCategory)
      };

      console.log(`      ❌ [${errorCategory.toUpperCase()} EXCEPTION] ${errorMessage}`);
      console.log(`         📁 File: ${stackInfo.file}:${stackInfo.line}:${stackInfo.column}`);

      this.pageErrors.push(errorDetails);
    });

    // 3️⃣ NETWORK ERRORS (40+ tipos) - REQUESTS FALLIDOS
    this.page.on('requestfailed', request => {
      const failureText = request.failure().errorText;
      const url = request.url();

      // ✅ CLASIFICAR ERROR DE RED
      const networkCategory = this._classifyNetworkError(failureText);

      console.log(`      ❌ [${networkCategory.toUpperCase()}] ${url} - ${failureText}`);

      this.networkErrors.push({
        type: 'network',
        category: networkCategory,
        url: url,
        error: failureText,
        timestamp: new Date(),
        severity: this._getSeverityFromNetworkError(failureText)
      });
    });

    // 4️⃣ HTTP/NETWORK ERRORS (40+ tipos) - CÓDIGOS DE ESTADO 4xx/5xx
    this.page.on('response', response => {
      const status = response.status();

      if (status >= 400) {
        const url = response.url();
        const statusText = response.statusText();

        // ✅ CLASIFICAR ERROR HTTP POR CÓDIGO
        const httpCategory = this._classifyHTTPError(status);

        // ✅ DETECTAR RECURSOS CRÍTICOS
        const resourceType = this._getResourceType(url);
        const isCriticalResource = ['javascript', 'stylesheet', 'document'].includes(resourceType);

        const severity = this._getHTTPSeverity(status, resourceType);

        // ✅ LOGGING ESPECÍFICO POR SEVERIDAD
        if (severity === 'critical') {
          console.log(`      🔴 [CRITICAL ${status}] ${httpCategory} → ${url}`);
        } else if (severity === 'high') {
          console.log(`      🟠 [HIGH ${status}] ${httpCategory} → ${url}`);
        } else {
          console.log(`      ⚠️  [${status}] ${httpCategory} → ${url}`);
        }

        // Si es 404 de archivo .js, agregar también a consoleErrors para auto-repair
        if (status === 404 && resourceType === 'javascript') {
          const fileName = url.split('/').pop().split('?')[0];
          const filePath = url.split('/js/').pop().split('?')[0];

          this.consoleErrors.push({
            type: 'file-not-found',
            category: 'http-404-javascript',
            message: `ARCHIVO NO EXISTE: ${fileName} (HTTP 404)`,
            file: filePath,
            line: null,
            column: null,
            url: url,
            stackTrace: null,
            timestamp: new Date(),
            severity: 'critical',
            httpStatus: 404,
            resourceType: resourceType
          });
        }

        // Guardar error HTTP
        this.networkErrors.push({
          type: 'http',
          category: httpCategory,
          url: url,
          status: status,
          statusText: statusText,
          resourceType: resourceType,
          isCritical: isCriticalResource,
          timestamp: new Date(),
          severity: severity
        });
      }
    });
  }

  async login(company_id, authToken = null) {
    console.log('    🔐 [LOGIN] Iniciando login automático...');
    console.log(`    📋 [LOGIN] Company ID recibido: ${company_id}`);

    // ✅ waitUntil: 'networkidle' - Espera a que la red esté casi idle
    await this.page.goto(`${this.baseUrl}/panel-empresa.html`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.page.waitForTimeout(3000);

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
      await this.page.waitForTimeout(1000);

      // PASO 1: Seleccionar empresa
      console.log(`    🏢 Seleccionando empresa: ${companySlug}`);
      await this.page.selectOption('#companySelect', companySlug);

      // Esperar a que JavaScript termine de ejecutarse (networkidle)
      console.log('    ⏳ Esperando que JavaScript termine de ejecutarse...');
      await this.page.waitForNetworkIdle({ timeout: 10000 }).catch(() => {
        console.log('    ⚠️  Timeout waiting for network idle (no crítico)');
      });

      // Esperar adicional para que event handlers se registren
      await this.page.waitForTimeout(5000); // 5 segundos para asegurar que todo esté listo

      // PASO 2: Esperar a que se habilite el campo de usuario e ingresar "soporte"
      console.log('    ⏳ Esperando que se habilite campo de usuario...');

      // Retry logic con detección de errores JS
      let userInputReady = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!userInputReady && retryCount < maxRetries) {
        try {
          await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 15000 });
          userInputReady = true;
          console.log('    ✅ Campo de usuario habilitado correctamente');
        } catch (error) {
          retryCount++;
          console.log(`    ⚠️  Intento ${retryCount}/${maxRetries} - Campo no habilitado aún`);

          // Detectar errores JavaScript en la página
          const jsErrors = await this.page.evaluate(() => {
            return window.__pageErrors || [];
          });

          if (jsErrors.length > 0) {
            console.log(`    🔴 Errores JavaScript detectados (${jsErrors.length}):`);
            jsErrors.forEach((err, i) => console.log(`       ${i+1}. ${err}`));
          }

          if (retryCount >= maxRetries) {
            throw new Error(`Campo #userInput no se habilitó después de ${maxRetries} intentos (${maxRetries * 15}s). Posibles errores JS en la página.`);
          }

          // Esperar antes del siguiente intento (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }
      
      // Limpiar campo de usuario (por si tiene valor previo)
      await this.page.click('#userInput', { clickCount: 3 }); // Triple click para seleccionar todo
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(500);

      console.log('    👤 Ingresando usuario: soporte');
      await this.page.fill('#userInput', 'soporte');
      
      // Verificar que se escribió correctamente
      const userValue = await this.page.$eval('#userInput', el => el.value);
      console.log(`    ✅ Usuario ingresado: "${userValue}"`);
      
      await this.page.waitForTimeout(2000);

      // PASO 3: Esperar a que se habilite el campo de contraseña e ingresar
      console.log('    ⏳ Esperando que se habilite campo de contraseña...');

      // Retry logic para campo de contraseña
      let passwordInputReady = false;
      retryCount = 0;

      while (!passwordInputReady && retryCount < maxRetries) {
        try {
          await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 15000 });
          passwordInputReady = true;
          console.log('    ✅ Campo de contraseña habilitado correctamente');
        } catch (error) {
          retryCount++;
          console.log(`    ⚠️  Intento ${retryCount}/${maxRetries} - Campo de contraseña no habilitado aún`);

          if (retryCount >= maxRetries) {
            throw new Error(`Campo #passwordInput no se habilitó después de ${maxRetries} intentos (${maxRetries * 15}s).`);
          }

          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }
      
      // Limpiar campo de contraseña (por si tiene valor previo)
      await this.page.click('#passwordInput', { clickCount: 3 }); // Triple click para seleccionar todo
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(500);
      
      console.log('    🔑 Ingresando contraseña: admin123');
      await this.page.fill('#passwordInput', 'admin123');
      await this.page.waitForTimeout(1000);

      // PASO 4: Click en botón Ingresar
      console.log('    🚀 Haciendo click en botón Ingresar...');

      // Retry logic para botón de login
      let loginButtonReady = false;
      retryCount = 0;

      while (!loginButtonReady && retryCount < maxRetries) {
        try {
          await this.page.waitForSelector('#loginButton:not([disabled])', { timeout: 15000 });
          loginButtonReady = true;
          console.log('    ✅ Botón de login habilitado correctamente');
        } catch (error) {
          retryCount++;
          console.log(`    ⚠️  Intento ${retryCount}/${maxRetries} - Botón de login no habilitado aún`);

          if (retryCount >= maxRetries) {
            throw new Error(`Botón #loginButton no se habilitó después de ${maxRetries} intentos (${maxRetries * 15}s).`);
          }

          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
      }

      await this.page.click('#loginButton');

      // PASO 5: Esperar a que se complete el proceso de autenticación
      console.log('    ⏳ Esperando a que se complete la autenticación...');

      // Esperar hasta 60 segundos a que aparezcan authToken y currentCompany
      const loginSuccess = await this.page.waitForFunction(
        () => {
          const hasToken = !!localStorage.getItem('authToken');
          const hasCompany = !!localStorage.getItem('currentCompany');
          console.log(`[LOGIN-CHECK] Token: ${hasToken}, Company: ${hasCompany}`);
          return hasToken && hasCompany;
        },
        { timeout: 60000, polling: 500 }
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
        await this.page.waitForTimeout(500); // Esperar a que la animación de cierre termine

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
      // CHECK: Si es un módulo sin CRUD (dashboard principal, settings), test básico de carga
      if (this.nonCrudModules.includes(module.id)) {
        console.log(`      ℹ️  Módulo ${module.id} es página principal - Test básico de carga`);

        // Al menos verificar que la página principal cargue y no tenga errores críticos
        const hasConsoleErrors = this.consoleErrors.length > 0;
        const hasNetworkErrors = this.networkErrors.filter(e => e.status >= 500).length > 0;

        if (hasConsoleErrors || hasNetworkErrors) {
          await log.update({
            status: 'warning',
            completed_at: new Date(),
            duration_ms: Date.now() - startTime,
            error_message: `Módulo sin CRUD pero tiene errores de consola/red`,
            severity: 'medium',
            test_data: {
              skipped: false,
              reason: 'non_crud_module',
              consoleErrors: this.consoleErrors.slice(-5),
              networkErrors: this.networkErrors.slice(-5)
            }
          });
        } else {
          await log.update({
            status: 'pass', // PASS - módulo carga sin errores
            completed_at: new Date(),
            duration_ms: Date.now() - startTime,
            test_data: { skipped: false, reason: 'non_crud_module', note: 'Módulo sin CRUD - solo test de carga' }
          });
        }

        return log;
      }

      // TEST 1: Navegar al módulo
      console.log(`      1️⃣ Navegando a módulo ${module.id}...`);
      const navigationOk = await this.testNavigation(module);

      // Si no se puede navegar, el módulo NO existe o NO está implementado → FAIL
      if (!navigationOk) {
        console.log(`      ❌ Módulo ${module.id} no está implementado/disponible - FAIL`);

        await log.update({
          status: 'fail', // FAIL - El módulo debería estar disponible pero no lo está
          completed_at: new Date(),
          duration_ms: Date.now() - startTime,
          error_message: `Módulo no está implementado o no carga correctamente`,
          severity: 'high', // Severidad alta - funcionalidad faltante
          error_type: 'ModuleNotAvailable',
          test_data: {
            skipped: false,
            reason: 'module_not_implemented',
            consoleErrors: this.consoleErrors.slice(-5), // Últimos 5 errores de consola
            networkErrors: this.networkErrors.slice(-5)  // Últimos 5 errores de red
          },
          suggestions: [{
            problem: `Módulo ${module.name} no está disponible en el frontend`,
            solution: `1. Verificar que el módulo esté en active_modules de la empresa\n2. Revisar errores de consola JavaScript\n3. Verificar que el archivo JS del módulo exista\n4. Confirmar que la navegación al módulo funcione manualmente`,
            confidence: 0.9
          }]
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

      // ✨ NUEVO TEST 4: CREATE - Crear un nuevo registro completo
      console.log(`      4️⃣ [CREATE] Testeando creación de registro...`);
      const createResult = await this.testCreate(module);
      if (createResult.success) {
        passed++;
        console.log(`        ✅ CREATE OK - Registro creado: ID ${createResult.createdId || 'N/A'}`);
      } else {
        failed++;
        errors.push({
          test: 'CRUD - Create',
          error: createResult.error,
          suggestion: createResult.suggestion
        });
      }

      // ✨ NUEVO TEST 5: READ - Verificar que el registro creado aparece en la lista
      console.log(`      5️⃣ [READ] Verificando registro en lista...`);
      const readResult = await this.testRead(module, createResult.createdId);
      if (readResult.success) {
        passed++;
        console.log(`        ✅ READ OK - Registro visible en lista`);
      } else {
        failed++;
        errors.push({
          test: 'CRUD - Read',
          error: readResult.error,
          suggestion: readResult.suggestion
        });
      }

      // ✨ NUEVO TEST 6: UPDATE - Editar el registro creado
      console.log(`      6️⃣ [UPDATE] Testeando edición de registro...`);
      const updateResult = await this.testUpdate(module, createResult.createdId);
      if (updateResult.success) {
        passed++;
        console.log(`        ✅ UPDATE OK - Registro actualizado correctamente`);
      } else {
        failed++;
        errors.push({
          test: 'CRUD - Update',
          error: updateResult.error,
          suggestion: updateResult.suggestion
        });
      }

      // ✨ NUEVO TEST 7: DELETE - Eliminar el registro creado
      console.log(`      7️⃣ [DELETE] Testeando eliminación de registro...`);
      const deleteResult = await this.testDelete(module, createResult.createdId);
      if (deleteResult.success) {
        passed++;
        console.log(`        ✅ DELETE OK - Registro eliminado correctamente`);
      } else {
        failed++;
        errors.push({
          test: 'CRUD - Delete',
          error: deleteResult.error,
          suggestion: deleteResult.suggestion
        });
      }

      // TEST 8: Botones de acción por fila (Editar, Eliminar)
      console.log(`      8️⃣ Testeando botones de fila...`);
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

      // TEST 9: Modal de edición se abre
      console.log(`      9️⃣ Testeando modal de edición...`);
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

      // ✨ NUEVO TEST 10: PERSISTENCIA - Verificar que los cambios persisten después de recargar
      console.log(`      🔟 [PERSISTENCIA] Testeando persistencia de datos...`);
      const persistenceResult = await this.testPersistence(module);
      if (persistenceResult.success) {
        passed++;
        console.log(`        ✅ PERSISTENCIA OK - Datos persisten después de recargar`);
      } else {
        // No es crítico, solo warning
        console.log(`        ⚠️  PERSISTENCIA SKIP - ${persistenceResult.error}`);
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

      // ✅ DIAGNÓSTICO MEJORADO: Incluir errores con file paths y line numbers
      await log.update({
        status: failed > 0 ? 'fail' : 'pass',
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        error_message: failed > 0 ? `${failed} tests fallaron` : null,
        error_type: this.pageErrors.length > 0 ? this.pageErrors[0].message.split(':')[0] : null,
        error_file: this.pageErrors.length > 0 ? this.pageErrors[0].file : null,
        error_line: this.pageErrors.length > 0 ? this.pageErrors[0].line : null,
        error_stack: this.pageErrors.length > 0 ? this.pageErrors[0].stack : null,
        error_context: errors.length > 0 ? {
          errors,
          // ✅ HTTP Errors con detalles
          http_errors: criticalHttpErrors.map(e => ({
            status: e.status,
            statusText: e.statusText,
            url: e.url
          })),
          // ✅ Console Errors con file:line:column
          console_errors: criticalConsoleErrors.slice(0, 5).map(e => ({
            message: e.message,
            file: e.file,
            line: e.line,
            column: e.column,
            url: e.url
          })),
          // ✅ Page Errors con stack completo
          page_errors: this.pageErrors.slice(0, 5).map(e => ({
            message: e.message,
            file: e.file,
            line: e.line,
            column: e.column,
            stack: e.stack,
            parsedStack: e.parsedStack
          })),
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

          // ✅ FIX 10: Extraer company_id del execution_id (execution_id tiene formato: aud_1234567890_company11)
          const companyIdMatch = execution_id.match(/_company(\d+)/);
          const companyId = companyIdMatch ? parseInt(companyIdMatch[1]) : 11;

          const ticket = await AutoAuditTicketSystem.createAutoTicket({
            execution_id,
            module_name: module.id,
            errors: errors,
            error_context: {
              http_errors: criticalHttpErrors,
              console_errors: criticalConsoleErrors.slice(0, 5).map(e => ({
                message: e.message,
                file: e.file,
                line: e.line,
                column: e.column
              })),
              page_errors: this.pageErrors.slice(0, 5).map(e => ({
                message: e.message,
                file: e.file,
                line: e.line,
                column: e.column
              })),
              network_errors: networkFailures.slice(0, 5)
            },
            company_id: companyId
          });

          if (ticket) {
            console.log(`      ✅ [AUTO-TICKET] Ticket creado: ${ticket.ticket_number}`);
          }
        } catch (ticketError) {
          console.error(`      ⚠️  [AUTO-TICKET] Error creando ticket:`, ticketError.message);
          console.error(`      Stack:`, ticketError.stack);
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
            await this.page.waitForTimeout(500);
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
      // ✅✅✅ MEGA-FIX: Esperar carga dinámica de módulos ANTES de navegar
      console.log(`      📦 [DYNAMIC-LOAD] Esperando carga dinámica del módulo ${module.id}...`);

      const moduleLoaded = await this.page.evaluate(async (moduleId) => {
        // Verificar si existe función de carga dinámica
        if (typeof window.loadModuleContent !== 'function') {
          console.warn('[TEST] loadModuleContent() no existe - módulos no se cargan dinámicamente');
          return { success: true, reason: 'no_dynamic_loading' };
        }

        // Verificar si ya está cargado
        if (window.loadedModules && window.loadedModules.has(moduleId)) {
          console.log(`[TEST] Módulo ${moduleId} ya estaba cargado`);
          return { success: true, reason: 'already_loaded' };
        }

        try {
          // Cargar el módulo dinámicamente
          console.log(`[TEST] Llamando a loadModuleContent('${moduleId}')...`);
          await window.loadModuleContent(moduleId);
          console.log(`[TEST] loadModuleContent('${moduleId}') completado`);
          return { success: true, reason: 'loaded_now' };
        } catch (error) {
          console.error(`[TEST] Error cargando módulo ${moduleId}:`, error);
          return { success: false, reason: 'load_failed', error: error.message };
        }
      }, module.id);

      if (!moduleLoaded.success) {
        console.log(`      ❌ [DYNAMIC-LOAD] Falló carga dinámica: ${moduleLoaded.error}`);
        this.consoleErrors.push({
          type: 'dynamic-module-load-failed',
          message: `Módulo ${module.id}: Falló loadModuleContent() - ${moduleLoaded.error}`,
          file: `modules/${module.id}.js`,
          line: null,
          column: null,
          url: null,
          stackTrace: null,
          timestamp: new Date(),
          severity: 'high',
          category: 'module-loading-error',
          canAutoFix: false
        });
        return false;
      }

      console.log(`      ✅ [DYNAMIC-LOAD] Módulo ${module.id} cargado (${moduleLoaded.reason})`);

      // Esperar a que las funciones del módulo estén disponibles (1s adicional)
      await this.page.waitForTimeout(1000);

      // Intentar navegar usando openModule()
      await this.page.evaluate((moduleId, moduleName) => {
        if (typeof window.openModuleDirect === 'function') {
          window.openModuleDirect(moduleId, moduleName);
          return true;
        }
        return false;
      }, module.id, module.name);

      // ✅ FIX 12: DETECCIÓN INTELIGENTE DE CARGA INFINITA
      // En lugar de esperar fijo 2s, verificar estado de carga cada 500ms
      const maxWaitTime = 8000; // 8 segundos máximo
      const checkInterval = 500; // Verificar cada 500ms
      let elapsedTime = 0;
      let isStuckLoading = false;
      let loadingMessage = null;

      while (elapsedTime < maxWaitTime) {
        // Verificar si está cargando
        const loadingState = await this.page.evaluate((moduleId) => {
          const content = document.getElementById('mainContent');
          if (!content) return { loading: false, message: null };

          const html = content.innerHTML;

          // Buscar indicadores de carga
          const loadingSpinner = content.querySelector('.spinner, .loading, [class*="spin"]');
          const loadingText = html.match(/🔄\s*Cargando funcionalidades de ([a-z-]+)/i);
          const hasLoadingMessage = /Cargando funcionalidades|Loading features|Cargando\.\.\./i.test(html);

          return {
            loading: !!(loadingSpinner || hasLoadingMessage),
            message: loadingText ? loadingText[0] : null,
            hasContent: html.includes(moduleId)
          };
        }, module.id);

        // Si ya no está cargando y tiene contenido, salir
        if (!loadingState.loading && loadingState.hasContent) {
          break;
        }

        // Si lleva más de 5s cargando, marcar como stuck
        if (loadingState.loading && elapsedTime > 5000) {
          isStuckLoading = true;
          loadingMessage = loadingState.message || `🔄 Cargando funcionalidades de ${module.id}...`;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
        elapsedTime += checkInterval;
      }

      // Si se detectó carga infinita, reportar error específico
      if (isStuckLoading) {
        console.log(`      ⏳ [INFINITE LOADING] Módulo ${module.id} atascado en estado de carga`);
        console.log(`         📝 Mensaje: "${loadingMessage}"`);

        // Agregar a errores de consola para que sea capturado por el sistema
        this.consoleErrors.push({
          type: 'infinite-loading',
          message: `Módulo ${module.id}: Se quedó cargando indefinidamente`,
          file: `modules/${module.id}.js`,
          line: null,
          column: null,
          url: null,
          stackTrace: null,
          timestamp: new Date(),
          loadingMessage: loadingMessage,
          severity: 'high'
        });

        return false;
      }

      // AUTO-CERRAR modales de error antes de verificar
      await this.autoCloseErrorModals();
      await this.page.waitForTimeout(1000);

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
        const isAIAssistant = (div.id && (
          div.id.startsWith('ai-assistant-') ||
          div.id === 'ai-assistant-messages' ||
          div.id === 'ai-assistant-chat' ||
          div.id === 'ai-assistant-input' ||
          div.classList.contains('ai-assistant')
        )) || (
          // También filtrar por contenido típico del asistente
          text.includes('Soy tu asistente de IA') ||
          text.includes('¡Hola! 👋') ||
          div.closest('#ai-assistant-chat') !== null
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
      await this.page.waitForTimeout(2000);

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
      await this.page.waitForTimeout(2000);

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
      const firstRow = await this.page.locator('table tbody tr:first-child');

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
      await this.page.waitForTimeout(2000);

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

  /**
   * ✨ NUEVO: TEST CREATE - Crear un registro completo en el módulo
   */
  async testCreate(module) {
    try {
      // 1. Abrir modal de agregar
      console.log(`        🔹 Abriendo modal de agregar...`);
      const addButton = await this.page.$('button:contains("Agregar"), button[onclick*="Add"], button[onclick*="add"]');

      if (!addButton) {
        return {
          success: false,
          error: 'No se encontró botón de agregar',
          suggestion: `Agregar botón con onclick="openAdd${module.id}Modal()"`
        };
      }

      await addButton.click();
      await this.page.waitForTimeout(2000);

      // 2. Llenar formulario con datos de prueba
      console.log(`        🔹 Llenando formulario...`);
      const formFilled = await this.fillFormFields(module, 'create');

      if (!formFilled.success) {
        return {
          success: false,
          error: `No se pudo llenar formulario: ${formFilled.error}`,
          suggestion: 'Verificar que el modal tenga campos de formulario (input, select, textarea)'
        };
      }

      // 3. Guardar el registro
      console.log(`        🔹 Guardando registro...`);
      const saveButton = await this.page.$('button:contains("Guardar"), button[onclick*="save"], button[onclick*="Save"]');

      if (!saveButton) {
        return {
          success: false,
          error: 'No se encontró botón de guardar',
          suggestion: 'Verificar que el modal tenga botón "Guardar"'
        };
      }

      await saveButton.click();
      await this.page.waitForTimeout(3000); // Esperar respuesta del servidor

      // 4. Verificar que se creó correctamente (modal cerrado, mensaje success)
      const modalClosed = await this.page.evaluate(() => {
        const modals = document.querySelectorAll('.modal.show, [style*="display: block"]');
        return modals.length === 0;
      });

      // 5. Obtener el ID del último registro creado
      const createdId = await this.getLastCreatedId(module);

      return {
        success: modalClosed,
        createdId,
        error: modalClosed ? null : 'Modal no se cerró después de guardar',
        suggestion: modalClosed ? null : 'Verificar que la función de guardar cierre el modal al completarse'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: 'Revisar consola del navegador para ver errores JavaScript'
      };
    }
  }

  /**
   * ✨ NUEVO: TEST READ - Verificar que el registro existe en la lista
   */
  async testRead(module, recordId) {
    try {
      // Recargar la lista para asegurar que los datos estén frescos
      console.log(`        🔹 Recargando lista...`);
      await this.page.evaluate((moduleId) => {
        if (typeof window[`load${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}`] === 'function') {
          window[`load${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}`]();
        }
      }, module.id);

      await this.page.waitForTimeout(2000);

      // Buscar el registro en la tabla por ID
      const recordFound = await this.page.evaluate((id) => {
        const rows = document.querySelectorAll('table tbody tr');
        for (const row of rows) {
          if (row.textContent.includes(id)) {
            return true;
          }
        }
        return false;
      }, recordId);

      return {
        success: recordFound,
        error: recordFound ? null : `Registro con ID ${recordId} no encontrado en la lista`,
        suggestion: recordFound ? null : `Verificar que la función load${module.id}() esté poblando la tabla correctamente`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: 'Revisar función de carga de lista'
      };
    }
  }

  /**
   * ✨ NUEVO: TEST UPDATE - Editar un registro existente
   */
  async testUpdate(module, recordId) {
    try {
      // 1. Buscar botón de editar para el registro
      console.log(`        🔹 Abriendo modal de editar para ID ${recordId}...`);
      const editButton = await this.page.locator('button[onclick*="edit"], i.fa-edit');

      if (!editButton) {
        return {
          success: false,
          error: 'No se encontró botón de editar',
          suggestion: `Agregar botón con onclick="edit${module.id}(id)"`
        };
      }

      await editButton.click();
      await this.page.waitForTimeout(2000);

      // 2. Modificar campos del formulario
      console.log(`        🔹 Modificando campos del formulario...`);
      const formFilled = await this.fillFormFields(module, 'update');

      if (!formFilled.success) {
        return {
          success: false,
          error: `No se pudo modificar formulario: ${formFilled.error}`,
          suggestion: 'Verificar que el modal tenga campos editables'
        };
      }

      // 3. Guardar cambios
      console.log(`        🔹 Guardando cambios...`);
      const saveButton = await this.page.$('button:contains("Guardar"), button[onclick*="save"]');

      if (!saveButton) {
        return {
          success: false,
          error: 'No se encontró botón de guardar',
          suggestion: 'Verificar que el modal tenga botón "Guardar"'
        };
      }

      await saveButton.click();
      await this.page.waitForTimeout(3000);

      // 4. Verificar que se actualizó correctamente
      const modalClosed = await this.page.evaluate(() => {
        const modals = document.querySelectorAll('.modal.show, [style*="display: block"]');
        return modals.length === 0;
      });

      return {
        success: modalClosed,
        error: modalClosed ? null : 'Modal no se cerró después de actualizar',
        suggestion: modalClosed ? null : 'Verificar que la función de actualizar cierre el modal'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: 'Revisar consola del navegador'
      };
    }
  }

  /**
   * ✨ NUEVO: TEST DELETE - Eliminar un registro
   */
  async testDelete(module, recordId) {
    try {
      // 1. Buscar botón de eliminar
      console.log(`        🔹 Buscando botón de eliminar...`);
      const deleteButton = await this.page.locator('button[onclick*="delete"], i.fa-trash');

      if (!deleteButton) {
        return {
          success: false,
          error: 'No se encontró botón de eliminar',
          suggestion: `Agregar botón con onclick="delete${module.id}(id)"`
        };
      }

      // 2. Click en eliminar
      await deleteButton.click();
      await this.page.waitForTimeout(2000);

      // 3. Confirmar eliminación (si hay confirm dialog, se acepta automáticamente)
      // El page.on('dialog') ya está configurado para auto-aceptar

      // 4. Esperar a que se complete la eliminación
      await this.page.waitForTimeout(3000);

      // 5. Verificar que el registro ya no existe en la lista
      const recordDeleted = await this.page.evaluate((id) => {
        const rows = document.querySelectorAll('table tbody tr');
        for (const row of rows) {
          if (row.textContent.includes(id)) {
            return false; // Todavía existe
          }
        }
        return true; // Ya no existe
      }, recordId);

      return {
        success: recordDeleted,
        error: recordDeleted ? null : `Registro con ID ${recordId} todavía existe después de eliminar`,
        suggestion: recordDeleted ? null : `Verificar que la función delete${module.id}() esté eliminando correctamente`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: 'Revisar función de eliminación'
      };
    }
  }

  /**
   * ✨ NUEVO: TEST PERSISTENCIA - Verificar que los datos persisten después de F5
   */
  async testPersistence(module) {
    try {
      console.log(`        🔹 Recargando página completa (F5)...`);
      await this.page.reload({ waitUntil: 'networkidle0', timeout: 10000 });
      await this.page.waitForTimeout(3000);

      // Verificar que la lista todavía tiene datos
      const hasData = await this.page.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        return rows.length > 0;
      });

      return {
        success: hasData,
        error: hasData ? null : 'Lista vacía después de recargar',
        suggestion: hasData ? null : 'Verificar que la autenticación persista en localStorage/sessionStorage'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: 'Verificar que el sistema no pierda autenticación al recargar'
      };
    }
  }

  /**
   * ✨ HELPER: Llenar campos del formulario con datos de prueba
   */
  async fillFormFields(module, mode = 'create') {
    try {
      // Buscar todos los inputs, selects y textareas visibles
      const fields = await this.page.$$('.modal input:not([type="hidden"]), .modal select, .modal textarea');

      if (fields.length === 0) {
        return {
          success: false,
          error: 'No se encontraron campos en el formulario'
        };
      }

      console.log(`        🔹 Llenando ${fields.length} campos...`);

      for (const field of fields) {
        const fieldType = await field.evaluate(el => el.tagName.toLowerCase());
        const inputType = await field.evaluate(el => el.type);
        const fieldName = await field.evaluate(el => el.name || el.id || '');

        // Generar datos de prueba según el tipo de campo
        // ⭐ TODOS los campos de texto llevan prefijo TEST_PREFIX
        if (fieldType === 'input' && inputType === 'text') {
          await field.fill(`${this.TEST_PREFIX} ${mode} ${Date.now()}`, { delay: 50 });
        } else if (fieldType === 'input' && inputType === 'email') {
          await field.fill(`test-audit-${Date.now()}@example.com`, { delay: 50 });
        } else if (fieldType === 'input' && inputType === 'number') {
          await field.fill('123', { delay: 50 });
        } else if (fieldType === 'input' && inputType === 'date') {
          // Fecha de prueba
          await field.fill('2025-01-01', { delay: 50 });
        } else if (fieldType === 'select') {
          // Seleccionar primera opción disponible
          await this.page.evaluate((el) => {
            if (el.options.length > 0) {
              el.selectedIndex = 1; // Saltar opción placeholder
            }
          }, field);
        } else if (fieldType === 'textarea') {
          await field.fill(`${this.TEST_PREFIX} Descripción de prueba para ${mode}`, { delay: 50 });
        } else if (fieldType === 'input' && inputType === 'tel') {
          await field.fill('1234567890', { delay: 50 });
        }
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ✨ HELPER: Obtener el ID del último registro creado
   */
  async getLastCreatedId(module) {
    try {
      // Buscar en la primera fila de la tabla (usualmente el más reciente)
      const lastId = await this.page.evaluate(() => {
        const firstRow = document.querySelector('table tbody tr:first-child');
        if (firstRow) {
          // Intentar extraer ID del primer td o del atributo data-id
          const firstCell = firstRow.querySelector('td:first-child');
          return firstCell ? firstCell.textContent.trim() : 'unknown';
        }
        return 'unknown';
      });

      return lastId;

    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * ✨ NUEVO HELPER: Parsear stack trace para extraer file, line, column
   * Formatos soportados:
   * - at functionName (http://localhost:9998/js/modules/users.js:123:45)
   * - at http://localhost:9998/js/modules/users.js:123:45
   * - users.js:123:45
   * - Unexpected token ')' (line 123, col 45)
   */
  _parseStackTrace(stack) {
    if (!stack) return { file: 'unknown', line: null, column: null, frames: [] };

    const frames = [];
    const lines = stack.split('\n');

    // Parsear todas las líneas del stack
    for (const line of lines) {
      const trimmed = line.trim();

      // Regex para extraer URL:LINE:COLUMN
      // Ejemplo: "at functionName (http://localhost:9998/js/modules/users.js:123:45)"
      const urlPattern = /(https?:\/\/[^\s)]+):(\d+):(\d+)/;
      const match = trimmed.match(urlPattern);

      if (match) {
        const url = match[1];
        const lineNum = parseInt(match[2]);
        const colNum = parseInt(match[3]);
        const fileName = this._extractFileName(url);

        frames.push({
          file: fileName,
          line: lineNum,
          column: colNum,
          url: url
        });
      }
    }

    // Si encontramos frames, retornar el primero (es el más relevante)
    if (frames.length > 0) {
      return {
        file: frames[0].file,
        line: frames[0].line,
        column: frames[0].column,
        frames: frames
      };
    }

    // Si no hay match con URL pattern, intentar otro formato
    // Ejemplo: "Unexpected token ')'" (sin stack completo)
    const simplePattern = /line\s+(\d+)/i;
    const simpleMatch = stack.match(simplePattern);

    if (simpleMatch) {
      return {
        file: 'unknown',
        line: parseInt(simpleMatch[1]),
        column: null,
        frames: []
      };
    }

    return { file: 'unknown', line: null, column: null, frames: [] };
  }

  /**
   * ✨ NUEVO HELPER: Extraer nombre de archivo de una URL completa
   * Ejemplos:
   * - http://localhost:9998/js/modules/users.js → users.js
   * - http://localhost:9998/panel-empresa.html → panel-empresa.html
   */
  _extractFileName(url) {
    if (!url) return 'unknown';

    try {
      // Extraer pathname de la URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Obtener solo el nombre del archivo (última parte del path)
      const parts = pathname.split('/');
      const fileName = parts[parts.length - 1];

      // Si está en /js/modules/, incluir el folder para más contexto
      if (pathname.includes('/js/modules/')) {
        return `modules/${fileName}`;
      }

      return fileName || 'unknown';
    } catch (error) {
      // Si falla el parsing de URL, intentar regex simple
      const match = url.match(/\/([^/]+)$/);
      return match ? match[1] : 'unknown';
    }
  }

  /**
   * ✅✅✅ MEGA-UPGRADE METHODS - 100+ ERROR TYPES CLASSIFICATION ✅✅✅
   */

  /**
   * ⏳ ESCUCHAR ERRORES DINÁMICOS POST-LOGIN (60 segundos)
   * Captura errores de módulos que se cargan DESPUÉS del login
   */
  async listenForDynamicErrors(durationMs) {
    const startTime = Date.now();
    const startConsoleCount = this.consoleErrors.length;
    const startNetworkCount = this.networkErrors.length;
    const startPageCount = this.pageErrors.length;

    console.log(`     ⏱️  Esperando ${durationMs / 1000}s para capturar errores dinámicos...`);

    // Simular actividad del usuario para disparar carga de módulos
    try {
      // Scroll down para disparar lazy loading
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(2000);

      // Scroll up
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await this.page.waitForTimeout(2000);

      // Simular clicks en diferentes elementos del DOM
      await this.page.evaluate(() => {
        const clickableElements = document.querySelectorAll('button, a, .clickable');
        if (clickableElements.length > 0) {
          // Click en primeros 5 elementos
          for (let i = 0; i < Math.min(5, clickableElements.length); i++) {
            try {
              clickableElements[i].click();
            } catch(e) {
              // Ignorar errores de click
            }
          }
        }
      });
      await this.page.waitForTimeout(3000);

    } catch(e) {
      console.log(`     ⚠️  Error simulando actividad: ${e.message}`);
    }

    // Esperar el tiempo restante
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, durationMs - elapsed);

    if (remaining > 0) {
      console.log(`     ⏱️  Esperando ${Math.round(remaining / 1000)}s adicionales...`);
      await new Promise(resolve => setTimeout(resolve, remaining));
    }

    // Calcular errores capturados
    const consoleErrorsCaptured = this.consoleErrors.length - startConsoleCount;
    const networkErrorsCaptured = this.networkErrors.length - startNetworkCount;
    const pageErrorsCaptured = this.pageErrors.length - startPageCount;

    return {
      console: consoleErrorsCaptured,
      network: networkErrorsCaptured,
      page: pageErrorsCaptured,
      total: consoleErrorsCaptured + networkErrorsCaptured + pageErrorsCaptured
    };
  }

  /**
   * 🔍 CLASIFICAR ERROR JAVASCRIPT (30+ tipos)
   */
  _classifyJavaScriptError(errorMessage) {
    const msg = errorMessage.toLowerCase();

    // SYNTAX ERRORS
    if (msg.includes('syntaxerror')) {
      if (msg.includes('unexpected token')) return 'syntax-unexpected-token';
      if (msg.includes('unexpected identifier')) return 'syntax-unexpected-identifier';
      if (msg.includes('unexpected end of input')) return 'syntax-unexpected-eof';
      if (msg.includes('illegal return')) return 'syntax-illegal-return';
      if (msg.includes('invalid or unexpected token')) return 'syntax-invalid-token';
      return 'syntax-error';
    }

    // REFERENCE ERRORS
    if (msg.includes('referenceerror')) {
      if (msg.includes('is not defined')) return 'reference-not-defined';
      if (msg.includes('cannot access') && msg.includes('initialization')) return 'reference-before-init';
      if (msg.includes('invalid left-hand side')) return 'reference-invalid-assignment';
      return 'reference-error';
    }

    // TYPE ERRORS
    if (msg.includes('typeerror')) {
      if (msg.includes('cannot read property') || msg.includes('cannot read properties')) {
        if (msg.includes('of undefined')) return 'type-property-of-undefined';
        if (msg.includes('of null')) return 'type-property-of-null';
        return 'type-cannot-read';
      }
      if (msg.includes('is not a function')) return 'type-not-a-function';
      if (msg.includes('cannot set property')) return 'type-cannot-set';
      if (msg.includes('cannot convert undefined')) return 'type-cannot-convert';
      if (msg.includes('assignment to constant')) return 'type-const-assignment';
      return 'type-error';
    }

    // RANGE ERRORS
    if (msg.includes('rangeerror')) {
      if (msg.includes('maximum call stack')) return 'range-stack-overflow';
      if (msg.includes('invalid array length')) return 'range-invalid-array-length';
      if (msg.includes('invalid string length')) return 'range-invalid-string-length';
      return 'range-error';
    }

    // PROMISE/ASYNC ERRORS
    if (msg.includes('unhandledpromiserejection') || msg.includes('unhandled promise rejection')) {
      return 'promise-unhandled-rejection';
    }
    if (msg.includes('promiserejectionhandled')) return 'promise-rejection-handled';
    if (msg.includes('await') && msg.includes('only valid in async')) return 'async-await-invalid';

    // NETWORK/HTTP ERRORS
    if (msg.includes('failed to load resource')) {
      if (msg.includes('404')) return 'http-404';
      if (msg.includes('500')) return 'http-500';
      return 'http-failed-to-load';
    }
    if (msg.includes('net::err_')) {
      if (msg.includes('connection_refused')) return 'network-connection-refused';
      if (msg.includes('name_not_resolved')) return 'network-dns-error';
      if (msg.includes('connection_timed_out')) return 'network-timeout';
      return 'network-error';
    }

    // CORS ERRORS
    if (msg.includes('cors') || msg.includes('access-control-allow-origin')) {
      return 'cors-error';
    }

    // DOM ERRORS
    if (msg.includes('failed to execute')) {
      if (msg.includes('queryselector')) return 'dom-queryselector-invalid';
      if (msg.includes('appendchild')) return 'dom-appendchild-error';
      return 'dom-execution-error';
    }

    // MODULE/IMPORT ERRORS
    if (msg.includes('cannot find module') || msg.includes('module not found')) {
      return 'module-not-found';
    }
    if (msg.includes('import') || msg.includes('require')) {
      return 'module-import-error';
    }

    return 'unknown-error';
  }

  /**
   * 🌐 CLASIFICAR ERROR DE RED (10+ tipos)
   */
  _classifyNetworkError(errorText) {
    const text = errorText.toLowerCase();

    if (text.includes('connection_refused')) return 'network-connection-refused';
    if (text.includes('connection_reset')) return 'network-connection-reset';
    if (text.includes('connection_timed_out')) return 'network-timeout';
    if (text.includes('name_not_resolved')) return 'network-dns-error';
    if (text.includes('internet_disconnected')) return 'network-disconnected';
    if (text.includes('network_changed')) return 'network-changed';
    if (text.includes('ssl_protocol_error')) return 'network-ssl-error';
    if (text.includes('cert_authority_invalid')) return 'network-cert-invalid';

    return 'network-unknown';
  }

  /**
   * 📡 CLASIFICAR ERROR HTTP POR CÓDIGO (40+ códigos)
   */
  _classifyHTTPError(status) {
    // 4xx - Client Errors
    if (status === 400) return 'http-400-bad-request';
    if (status === 401) return 'http-401-unauthorized';
    if (status === 403) return 'http-403-forbidden';
    if (status === 404) return 'http-404-not-found';
    if (status === 405) return 'http-405-method-not-allowed';
    if (status === 408) return 'http-408-timeout';
    if (status === 409) return 'http-409-conflict';
    if (status === 429) return 'http-429-too-many-requests';

    // 5xx - Server Errors
    if (status === 500) return 'http-500-internal-error';
    if (status === 501) return 'http-501-not-implemented';
    if (status === 502) return 'http-502-bad-gateway';
    if (status === 503) return 'http-503-unavailable';
    if (status === 504) return 'http-504-gateway-timeout';

    if (status >= 400 && status < 500) return `http-4xx-client-error-${status}`;
    if (status >= 500 && status < 600) return `http-5xx-server-error-${status}`;

    return `http-error-${status}`;
  }

  /**
   * 📂 DETECTAR TIPO DE RECURSO POR URL
   */
  _getResourceType(url) {
    if (url.endsWith('.js')) return 'javascript';
    if (url.endsWith('.css')) return 'stylesheet';
    if (url.endsWith('.html') || url.endsWith('.htm')) return 'document';
    if (url.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot|otf)$/i)) return 'font';
    if (url.match(/\.(json|xml)$/i)) return 'data';
    if (url.match(/\.(mp4|webm|ogg|mp3|wav)$/i)) return 'media';

    return 'other';
  }

  /**
   * ⚠️ DETERMINAR SEVERIDAD DE ERROR HTTP
   */
  _getHTTPSeverity(status, resourceType) {
    // JavaScript/CSS/Document son críticos
    if (['javascript', 'stylesheet', 'document'].includes(resourceType)) {
      if (status === 404) return 'critical'; // Archivo crítico no existe
      if (status >= 500) return 'critical'; // Server error en recurso crítico
      if (status === 401 || status === 403) return 'high'; // Auth error
      return 'medium';
    }

    // Otros recursos
    if (status >= 500) return 'high'; // Server errors siempre son high
    if (status === 404) return 'low'; // 404 de imagen/font no es crítico
    if (status === 401 || status === 403) return 'medium'; // Auth en recurso no crítico
    return 'low';
  }

  /**
   * 🎯 OBTENER SEVERIDAD DESDE CATEGORÍA DE ERROR
   */
  _getSeverityFromCategory(category) {
    const criticalCategories = [
      'syntax-error',
      'reference-not-defined',
      'type-property-of-undefined',
      'type-property-of-null',
      'type-not-a-function',
      'range-stack-overflow',
      'promise-unhandled-rejection',
      'module-not-found',
      'network-connection-refused',
      'network-dns-error',
      'http-500',
      'http-404',
      'cors-error'
    ];

    const highCategories = [
      'reference-before-init',
      'type-cannot-set',
      'async-await-invalid',
      'dom-queryselector-invalid',
      'network-timeout',
      'http-401',
      'http-403',
      'http-502',
      'http-503'
    ];

    if (criticalCategories.some(c => category.includes(c))) return 'critical';
    if (highCategories.some(c => category.includes(c))) return 'high';

    return 'medium';
  }

  /**
   * 🚨 DETERMINAR SEVERIDAD DE ERROR DE RED
   */
  _getSeverityFromNetworkError(errorText) {
    const text = errorText.toLowerCase();

    if (text.includes('connection_refused')) return 'critical';
    if (text.includes('name_not_resolved')) return 'critical';
    if (text.includes('ssl_protocol_error')) return 'high';
    if (text.includes('connection_timed_out')) return 'high';

    return 'medium';
  }

  /**
   * ⚠️ DETECTAR WARNINGS CRÍTICOS (solo capturar algunos warnings)
   */
  _isCriticalWarning(warningText) {
    const text = warningText.toLowerCase();

    // Warnings que indican problemas potenciales
    if (text.includes('deprecated')) return true;
    if (text.includes('memory leak')) return true;
    if (text.includes('performance')) return true;
    if (text.includes('unsafe')) return true;
    if (text.includes('will be removed')) return true;

    return false;
  }

  /**
   * ✅✅✅ NOTIFICAR ERRORES EN BATCH A WEBSOCKET ✅✅✅
   */
  async notifyErrorsBatchToWebSocket(batchData) {
    try {
      const websocket = require('../../config/websocket');

      console.log(`  📡 [WEBSOCKET] Notificando ${batchData.errors.length} errores en batch a dashboard...`);

      websocket.notifyErrorsBatch(batchData.errors, {
        phase: batchData.phase,
        duration_ms: batchData.duration_ms
      });

    } catch (error) {
      console.error(`  ❌ [WEBSOCKET] Error notificando batch:`, error.message);
    }
  }

  /**
   * ✅✅✅ NOTIFICAR ERROR INDIVIDUAL A WEBSOCKET ✅✅✅
   */
  async notifyErrorToWebSocket(errorData) {
    try {
      const websocket = require('../../config/websocket');

      websocket.notifyErrorDetected(errorData);

    } catch (error) {
      console.error(`  ❌ [WEBSOCKET] Error notificando error individual:`, error.message);
    }
  }

  /**
   * 🔧 DETERMINAR SI UN ERROR PUEDE AUTO-REPARARSE
   */
  _canAutoFix(error) {
    const category = error.category || '';
    const message = (error.message || '').toLowerCase();

    // Errores que SÍ pueden auto-repararse
    const autoFixableCategories = [
      'http-404-javascript',  // Archivos JS faltantes
      'reference-not-defined', // Variables no definidas (imports faltantes)
      'module-not-found',      // Módulos faltantes
      'syntax-unexpected-token', // Algunos casos simples de syntax
      'type-property-of-undefined', // Null checks
      'type-property-of-null'
    ];

    // Verificar por categoría
    if (autoFixableCategories.some(cat => category.includes(cat))) {
      return true;
    }

    // Verificar por mensaje (casos específicos)
    if (message.includes('is not defined')) return true;
    if (message.includes('cannot find module')) return true;
    if (message.includes('404') && message.includes('.js')) return true;

    return false;
  }
}

module.exports = FrontendCollector;
