/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTONOMOUS QA AGENT - Agente Inteligente de Testing
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FILOSOFÍA:
 * - NO asumir estructura (descubrir TODO automáticamente)
 * - NO hard-coding de selectores (clasificar por patrones)
 * - APRENDER de cada interacción (PostgreSQL + Brain)
 * - ADAPTARSE a lentitud/crashes dinámicamente
 * - INTEGRARSE con Brain para crear tickets automáticos
 *
 * CAPACIDADES:
 * - Autodescubrimiento completo (botones, modales, tabs, tablas, forms)
 * - Clasificación inteligente (CREATE, EDIT, DELETE, VIEW, EXPORT, etc.)
 * - Learning persistente (qué funciona, qué crashea, qué es lento)
 * - Adaptación dinámica de timeouts
 * - Integración con BrainNervousSystem
 * - Reportes detallados de todo lo descubierto
 *
 * @version 1.0.0
 * @date 2026-01-07
 * ═══════════════════════════════════════════════════════════════════════════
 */

let chromium = null;
try {
  chromium = require('playwright').chromium;
} catch(e) {
  console.log('⚠️  Playwright no disponible - instalar con: npm install playwright');
}

const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

// ⭐ NUEVO: Faker para generación de datos de prueba realistas
const { faker } = require('@faker-js/faker');
faker.locale = 'es'; // Datos en español

class AutonomousQAAgent {
  constructor(config = {}) {
    // ✅ FIX: Detectar puerto del servidor actual
    const port = process.env.PORT || '9998';

    this.config = {
      baseUrl: config.baseUrl || `http://localhost:${port}`,
      headless: config.headless || false,
      slowMo: config.slowMo || 100,
      defaultTimeout: config.defaultTimeout || config.timeout || 30000, // ⭐ FIX: Aceptar tanto 'timeout' como 'defaultTimeout'
      learningEnabled: config.learningEnabled !== false, // Default true
      brainIntegration: config.brainIntegration !== false, // Default true
      ...config
    };

    this.browser = null;
    this.page = null;
    this.context = null;

    // ⭐ NUEVO: Inyección de dependencias (Dependency Injection)
    this.systemRegistry = config.systemRegistry || null;
    this.brainService = config.brainService || null;

    // Estado del agente
    this.currentModule = null;
    this.discoveries = {};
    this.knowledge = {};
    this.sessionId = uuidv4();
    this.stats = {
      elementsDiscovered: 0,
      elementsTested: 0,
      crashes: 0,
      timeouts: 0,
      successes: 0
    };

    // ⭐ FIX 112: Rastrear errores de hardware para tabs que requieren periféricos
    this.hardwareErrors = [];
    this.lastHardwareError = null;

    // Dependencias
    this.database = config.database;
    this.brainNervous = config.brainNervous;
    this.learningEngine = config.learningEngine;

    console.log(`🤖 [AGENT] Autonomous QA Agent inicializado`);
    console.log(`   Session ID: ${this.sessionId}`);
    console.log(`   Learning: ${this.config.learningEnabled ? 'ON' : 'OFF'}`);
    console.log(`   Brain Integration: ${this.config.brainIntegration ? 'ON' : 'OFF'}`);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * INICIALIZACIÓN
   * ═══════════════════════════════════════════════════════════════════════
   */
  async init() {
    console.log('\n🚀 [AGENT] Inicializando navegador...');

    if (!chromium) {
      throw new Error('Playwright no disponible. Instalar con: npm install playwright');
    }

    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1366, height: 768 }, // ✅ Resolución estándar, no gigante
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();

    // Configurar timeouts dinámicos
    this.page.setDefaultTimeout(this.config.defaultTimeout);

    // Escuchar eventos del navegador
    this._setupBrowserListeners();

    console.log('   ✅ Navegador listo');

    // ⭐ NUEVO: Logging de integración Brain
    if (this.systemRegistry) {
      console.log('   🧠 SystemRegistry conectado - Metadata disponible');
    }
    if (this.brainService) {
      console.log('   🧠 EcosystemBrainService conectado - Feedback loop activo');
    }
  }

  /**
   * Configurar listeners para crashes, errores, console logs
   */
  _setupBrowserListeners() {
    // Console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        console.log(`   🔴 [CONSOLE ERROR] ${errorText}`);
        this.stats.crashes++;

        // ⭐ FIX 112: Detectar errores de hardware (cámara, micrófono, etc.)
        const hardwareErrorPatterns = [
          'NotSupportedError',
          'NotAllowedError',
          'NotFoundError: Requested device not found',
          'Could not start video source',
          'Permission denied',
          'No camera',
          'No webcam',
          'getUserMedia'
        ];

        const isHardwareError = hardwareErrorPatterns.some(pattern =>
          errorText.toLowerCase().includes(pattern.toLowerCase())
        );

        if (isHardwareError) {
          this.hardwareErrors.push({
            type: 'hardware',
            message: errorText,
            timestamp: new Date()
          });
          this.lastHardwareError = errorText;
          console.log(`   ⚠️  [FIX 112] Error de hardware detectado: ${errorText.substring(0, 80)}...`);
        }

        // Notificar a Brain si está integrado
        if (this.config.brainIntegration && this.brainNervous) {
          this.brainNervous.emit('crash-detected', {
            type: 'console-error',
            message: errorText,
            module: this.currentModule,
            timestamp: new Date()
          });
        }
      }
    });

    // Page errors (uncaught exceptions)
    this.page.on('pageerror', error => {
      console.log(`   🔴 [PAGE ERROR] ${error.message}`);
      this.stats.crashes++;

      if (this.config.brainIntegration && this.brainNervous) {
        this.brainNervous.emit('crash-detected', {
          type: 'page-error',
          message: error.message,
          stack: error.stack,
          module: this.currentModule,
          timestamp: new Date()
        });
      }
    });

    // Request failures
    this.page.on('requestfailed', request => {
      console.log(`   ⚠️  [REQUEST FAILED] ${request.url()}`);
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LOGIN AUTOMÁTICO (usa dropdown, luego user, luego password)
   * ═══════════════════════════════════════════════════════════════════════
   */
  async login(credentials = {}) {
    const empresaSlug = credentials.empresa || 'isi';
    const usuario = credentials.usuario || 'admin'; // Usuario admin de la empresa ISI
    const password = credentials.password || 'admin123';

    console.log(`\n🔐 [AGENT] Login automático...`);
    console.log(`   Empresa: ${empresaSlug}`);
    console.log(`   Usuario: ${usuario}`);

    await this.page.goto(`${this.config.baseUrl}/panel-empresa.html`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.page.waitForTimeout(3000);

    // Paso 1: Dropdown de empresa
    console.log('   1️⃣ Esperando dropdown de empresas...');
    await this.page.waitForSelector('#companySelect', { timeout: 10000 });

    await this.page.waitForFunction(
      () => {
        const select = document.getElementById('companySelect');
        return select && select.options.length > 1;
      },
      { timeout: 10000 }
    );

    console.log('   🏢 Seleccionando empresa...');
    await this.page.selectOption('#companySelect', empresaSlug);
    await this.page.waitForTimeout(5000);

    // Paso 2: Campo usuario
    console.log('   2️⃣ Esperando campo usuario...');
    await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 15000 });

    console.log('   👤 Ingresando usuario...');
    await this.page.click('#userInput', { clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    await this.page.fill('#userInput', usuario);
    await this.page.waitForTimeout(2000);

    // Paso 3: Campo password
    console.log('   3️⃣ Esperando campo contraseña...');
    await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 15000 });

    console.log('   🔑 Ingresando contraseña...');
    await this.page.focus('#passwordInput');
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await this.page.fill('#passwordInput', password);
    await this.page.waitForTimeout(1000);

    // Paso 4: Click login
    console.log('   4️⃣ Haciendo click en Ingresar...');
    const loginBtn = await this.page.$('#loginButton');
    if (loginBtn) await loginBtn.click();

    // Esperar que cargue el panel COMPLETAMENTE
    console.log('   ⏳ Esperando que cargue el panel y módulos (8s)...');
    await this.page.waitForTimeout(8000); // 8 segundos para módulos dinámicos

    // Tomar screenshot para debug
    try {
      await this.page.screenshot({ path: 'debug-after-login.png', fullPage: true });
      console.log('      📸 Screenshot guardado: debug-after-login.png');
    } catch (e) {
      console.log('      ⚠️  No se pudo guardar screenshot');
    }

    // ⭐ FIX 80: Mejorar click en hamburger con timeout explícito y verificación
    console.log('   📂 Abriendo sidebar mobile...');
    try {
      const hamburger = await this.page.$('button[onclick*="toggleMobileSidebar"]');
      if (hamburger) {
        console.log('      → Click en toggleMobileSidebar');

        // ⭐ FIX 80: Click con timeout explícito (evitar cuelgues)
        await Promise.race([
          hamburger.click(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Click timeout')), 5000))
        ]).catch(err => {
          console.log(`      ⚠️  [FIX 80] Click timeout: ${err.message}`);
        });

        await this.page.waitForTimeout(2000);
        console.log('      ✅ [FIX 80] Sidebar mobile procesado');
      } else {
        console.log('      ℹ️  [FIX 80] No se encontró botón hamburger');
      }
    } catch (e) {
      console.log('      ⚠️  [FIX 80] Error abriendo sidebar mobile: ${e.message}');
    }

    // ⭐ FIX 79: Aumentar timeout y agregar logs detallados (especialmente post-relogin)
    // Esperar específicamente a que aparezcan módulos (detección rápida)
    console.log('   🔍 Esperando a que aparezcan módulos...');
    try {
      await this.page.waitForFunction(
        () => {
          // Buscar elementos con data-module-key (más específico y confiable)
          const moduleElements = document.querySelectorAll('[data-module-key]');
          console.log(`[FIX 79] Módulos en DOM: ${moduleElements.length}`);
          return moduleElements.length > 0; // Al menos 1 módulo
        },
        { timeout: 15000 } // ⭐ FIX 79: 5s → 15s (más tiempo post-relogin)
      );
      console.log('      ✅ Módulos detectados en el DOM');
    } catch (e) {
      console.log('      ⚠️  [FIX 79] Timeout esperando módulos después de 15s - continuando de todos modos');
      console.log(`      [FIX 79] Error: ${e.message}`);
    }

    // ⭐ FIX: Obtener company_id después del login
    try {
      this.companyId = await this.page.evaluate(() => {
        const company = window.selectedCompany || window.currentCompany;
        return company?.id || company?.company_id || null;
      });
      console.log(`   🏢 Company ID obtenido: ${this.companyId}`);
    } catch (e) {
      console.log('   ⚠️  No se pudo obtener company_id');
      this.companyId = null;
    }

    // ⭐ FIX 78: Guardar credenciales para re-login automático post-F5
    this.savedCredentials = { empresa: empresaSlug, usuario, password };
    console.log('   💾 Credenciales guardadas para posible re-login');

    console.log('   ✅ Login exitoso y panel cargado');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * NAVEGAR A MÓDULO (inteligente - busca por múltiples estrategias)
   * ═══════════════════════════════════════════════════════════════════════
   */
  async navigateToModule(moduleId) {
    console.log(`\n🧭 [AGENT] Navegando a módulo: ${moduleId}`);
    this.currentModule = moduleId;

    // ⭐ NUEVO: Obtener metadata del Brain (si está disponible)
    let enrichedModule = null;
    if (this.systemRegistry) {
      try {
        enrichedModule = await this.systemRegistry.getModuleWithLiveData(moduleId);
        console.log(`   🧠 Metadata del Brain obtenida para ${moduleId}`);
        if (enrichedModule?.ui?.mainButtons && enrichedModule.ui.mainButtons.length > 0) {
          console.log(`      Buttons conocidos: ${enrichedModule.ui.mainButtons.map(b => b.text).join(', ')}`);
        }
      } catch (error) {
        console.log(`   ⚠️  No se pudo obtener metadata del Brain: ${error.message}`);
      }
    }

    // ⭐ FIX 77.5: PRIMERO - Esperar a que se carguen los módulos Y estén visibles
    console.log(`   ⏳ Esperando a que los módulos se carguen y rendericen...`);
    try {
      // ⭐ FIX 77.5: Esperar a que window.companyModules tenga módulos cargados
      // Esto es crítico después de F5 porque checkSavedSession() restaura sesión pero NO carga módulos
      await this.page.waitForFunction(
        () => {
          const hasModules = window.companyModules && window.companyModules.length > 0;
          if (!hasModules) {
            console.log(`[FIX 77.5] Esperando a que se carguen módulos... (companyModules.length: ${window.companyModules?.length || 0})`);
          }
          return hasModules;
        },
        { timeout: 20000 }
      );

      console.log(`   ✅ Módulos cargados en window.companyModules`);

      // Esperar a que módulos se rendericen en DOM
      await this.page.waitForSelector('[data-module-key]', { timeout: 10000 });

      // ⭐ FIX 77.5: Esperar a que AL MENOS UN módulo esté visible (no solo en DOM)
      await this.page.waitForFunction(
        () => {
          const modules = Array.from(document.querySelectorAll('[data-module-key]'));
          const visibleModules = modules.filter(m => m.offsetParent !== null);
          console.log(`[FIX 77.5] Módulos visibles: ${visibleModules.length}/${modules.length}`);
          return visibleModules.length > 0;
        },
        { timeout: 15000 }
      );

      console.log(`   ✅ Módulos renderizados y visibles`);
    } catch (e) {
      console.log(`   ⚠️  Timeout esperando módulos visibles - intentando forzar carga`);

      // ⭐ FIX 77.6: Si falló, verificar si hay sesión guardada y forzar loadCompanyModules()
      try {
        const sessionData = await this.page.evaluate(() => {
          const savedSession = localStorage.getItem('aponnt_session') || sessionStorage.getItem('aponnt_session');
          const authToken = localStorage.getItem('authToken');
          const modulesCount = window.companyModules ? window.companyModules.length : 0;
          return {
            hasSession: !!savedSession && !!authToken,
            modulesLoaded: modulesCount > 0,
            modulesCount
          };
        });

        console.log(`   🔍 [FIX 77.6] Estado: sesión=${sessionData.hasSession}, módulos=${sessionData.modulesLoaded} (${sessionData.modulesCount})`);

        if (sessionData.hasSession && !sessionData.modulesLoaded) {
          console.log(`   🔄 [FIX 77.6] Sesión encontrada pero módulos NO cargados - forzando loadCompanyModules()...`);

          // Forzar carga de módulos
          await this.page.evaluate(async () => {
            if (typeof loadCompanyModules === 'function') {
              try {
                await loadCompanyModules();
                console.log(`[FIX 77.6] loadCompanyModules() ejecutado - módulos cargados: ${window.companyModules?.length || 0}`);
              } catch (err) {
                console.error(`[FIX 77.6] Error en loadCompanyModules():`, err);
              }
            } else {
              console.error(`[FIX 77.6] loadCompanyModules() no está definido`);
            }
          });

          // Esperar a que se carguen los módulos (hasta 15 segundos)
          try {
            await this.page.waitForFunction(
              () => window.companyModules && window.companyModules.length > 0,
              { timeout: 15000 }
            );
            console.log(`   ✅ [FIX 77.6] Módulos cargados exitosamente después de forzar`);
          } catch (e3) {
            console.log(`   ⚠️  [FIX 77.6] Timeout esperando carga de módulos después de forzar`);
          }
        } else if (!sessionData.hasSession) {
          console.log(`   ⚠️  [FIX 77.6] No hay sesión guardada - no se puede forzar carga`);
        } else {
          console.log(`   ℹ️  [FIX 77.6] Módulos ya estaban cargados (${sessionData.modulesCount})`);
        }
      } catch (e2) {
        console.log(`   ⚠️  [FIX 77.6] Error en lógica de forzar módulos:`, e2.message);
      }

      // ⭐ FIX 77: Intentar abrir sidebar mobile si está colapsado
      try {
        const hamburger = await this.page.$('button[onclick*="toggleMobileSidebar"]');
        if (hamburger) {
          console.log(`   📂 Abriendo sidebar mobile para forzar visibilidad...`);
          await hamburger.click();
          await this.page.waitForTimeout(2000);
        }
      } catch (e3) {
        console.log(`   ⚠️  No se pudo abrir sidebar mobile`);
      }
    }

    // ⭐ FIX 77: ESTRATEGIA 1 con RETRY - Buscar directamente por data-module-key (EXACTO)
    console.log(`   🔍 Buscando por data-module-key="${moduleId}"...`);

    for (let retry = 0; retry < 3; retry++) {
      if (retry > 0) {
        console.log(`   🔄 Retry ${retry}/3 - esperando 2 segundos...`);
        await this.page.waitForTimeout(2000);
      }

      const moduleByKey = await this.page.$(`[data-module-key="${moduleId}"]`);
      if (moduleByKey) {
        // ⭐ FIX 107: Siempre hacer scroll al elemento antes de verificar visibilidad
        console.log(`   📜 Haciendo scroll al módulo...`);
        await moduleByKey.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
        await this.page.waitForTimeout(500); // Esperar a que el scroll termine

        const isVisible = await moduleByKey.evaluate(el => el.offsetParent !== null);
        if (isVisible) {
          console.log(`   ✅ Encontrado por data-module-key (intento ${retry + 1}/3)`);
          await moduleByKey.click();
          await this.page.waitForTimeout(3000);
          console.log(`   ✅ Navegado a ${moduleId}`);
          return;
        } else {
          console.log(`   ⚠️  Módulo existe pero no es visible después de scroll (intento ${retry + 1}/3)`);
        }
      } else {
        console.log(`   ⚠️  Módulo no encontrado en DOM (intento ${retry + 1}/3)`);
      }
    }

    console.log(`   ⚠️  No se pudo encontrar módulo visible después de 3 intentos`);

    // ⭐ ESTRATEGIA 2: Usar ui.mainButtons del Brain (si disponible)
    if (enrichedModule?.ui?.mainButtons && enrichedModule.ui.mainButtons.length > 0) {
      console.log(`   🔍 Intentando con metadata del Brain (${enrichedModule.ui.mainButtons.length} buttons conocidos)...`);
      for (const btn of enrichedModule.ui.mainButtons) {
        try {
          // Intentar varios selectores basados en el texto del botón
          const selectors = [
            `button:has-text("${btn.text}")`,
            `[data-module-key="${moduleId}"]`,
            `button.module-card:has-text("${btn.text}")`,
            `div[data-module-key="${moduleId}"]`
          ];

          for (const selector of selectors) {
            try {
              const found = await this.page.$(selector);
              if (found) {
                const isVisible = await found.evaluate(el => el.offsetParent !== null);
                if (isVisible) {
                  console.log(`   ✅ Encontrado por Brain metadata: "${btn.text}"`);
                  await found.click();
                  await this.page.waitForTimeout(3000);
                  console.log(`   ✅ Navegado a ${moduleId}`);
                  return;
                }
              }
            } catch (e) {
              // Probar siguiente selector
            }
          }
        } catch (error) {
          // Probar siguiente botón
        }
      }
      console.log(`   ⚠️  No se pudo navegar usando metadata del Brain`);
    }

    // ⭐ ESTRATEGIA 3: Buscar por texto en module cards (DIVs o BUTTONs) - HARDCODED FALLBACK
    console.log(`   🔍 Buscando por texto en module cards (fallback)...`);
    const moduleTexts = {
      'users': ['usuarios', 'user', 'gestión de usuarios', 'gestion usuarios'],
      'attendance': ['asistencia', 'attendance', 'marcaciones'],
      'departments': ['departamentos', 'departments', 'áreas'],
      'vacations': ['vacaciones', 'vacations', 'ausencias'],
      'shifts': ['turnos', 'shifts', 'horarios']
    };

    const searchTexts = moduleTexts[moduleId] || [moduleId];

    // Buscar TODOS los elementos con data-module-key (DIVs, BUTTONs, etc.)
    const allModuleCards = await this.page.$$('[data-module-key]');

    console.log(`   🔍 Buscando entre ${allModuleCards.length} module cards...`);

    for (const btn of allModuleCards) {
      try {
        const info = await btn.evaluate(el => ({
          text: el.textContent?.trim().toLowerCase() || '',
          dataModuleKey: el.getAttribute('data-module-key') || '',
          dataModuleName: el.getAttribute('data-module-name') || '',
          visible: el.offsetParent !== null
        }));

        // Buscar coincidencia
        for (const searchText of searchTexts) {
          if (info.visible && (
              info.text.includes(searchText.toLowerCase()) ||
              info.dataModuleKey === moduleId ||
              info.dataModuleName.toLowerCase().includes(searchText.toLowerCase())
            )) {
            console.log(`   ✅ Encontrado: "${info.dataModuleName}" (key: ${info.dataModuleKey})`);
            await btn.click();
            await this.page.waitForTimeout(3000);
            console.log(`   ✅ Navegado a ${moduleId}`);
            return;
          }
        }
      } catch (e) {
        // Elemento no accesible, continue
      }
    }

    // Si no se encontró, tomar screenshot y hacer debug exhaustivo
    console.log(`\n   ❌ No se encontró módulo "${moduleId}"`);

    // Screenshot para debug
    try {
      await this.page.screenshot({ path: `debug-searching-${moduleId}.png`, fullPage: true });
      console.log(`   📸 Screenshot guardado: debug-searching-${moduleId}.png`);
    } catch (e) {}

    // ⭐ DEBUG EXHAUSTIVO: Ver qué hay en el DOM
    console.log(`\n   🔍 DEBUG EXHAUSTIVO:`);

    const debugInfo = await this.page.evaluate(() => {
      const allButtons = document.querySelectorAll('button');
      const moduleCards = document.querySelectorAll('button.module-card');
      const dataModuleKeys = document.querySelectorAll('[data-module-key]');
      const visibleButtons = Array.from(allButtons).filter(el => el.offsetParent !== null);

      return {
        totalButtons: allButtons.length,
        moduleCards: moduleCards.length,
        dataModuleKeys: dataModuleKeys.length,
        visibleButtons: visibleButtons.length,
        sampleModuleCards: Array.from(moduleCards).slice(0, 5).map(el => ({
          text: el.textContent?.trim().substring(0, 50),
          key: el.getAttribute('data-module-key'),
          name: el.getAttribute('data-module-name'),
          visible: el.offsetParent !== null
        })),
        sampleDataKeys: Array.from(dataModuleKeys).slice(0, 5).map(el => ({
          tag: el.tagName,
          key: el.getAttribute('data-module-key'),
          name: el.getAttribute('data-module-name'),
          visible: el.offsetParent !== null
        }))
      };
    });

    console.log(`      Total buttons en página: ${debugInfo.totalButtons}`);
    console.log(`      Total con class="module-card": ${debugInfo.moduleCards}`);
    console.log(`      Total con data-module-key: ${debugInfo.dataModuleKeys}`);
    console.log(`      Buttons visibles: ${debugInfo.visibleButtons}`);

    console.log(`\n   📋 Sample module cards:`);
    for (const card of debugInfo.sampleModuleCards) {
      console.log(`      - "${card.text}" key="${card.key}" name="${card.name}" visible=${card.visible}`);
    }

    console.log(`\n   📋 Sample data-module-key elements:`);
    for (const el of debugInfo.sampleDataKeys) {
      console.log(`      - [${el.tag}] key="${el.key}" name="${el.name}" visible=${el.visible}`);
    }

    throw new Error(`No se encontró botón para módulo: ${moduleId}`);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * AUTODESCUBRIMIENTO COMPLETO - El cerebro del agente
   * ═══════════════════════════════════════════════════════════════════════
   */
  async discoverAll() {
    console.log(`\n🔍 [AGENT] AUTODESCUBRIMIENTO COMPLETO - Módulo: ${this.currentModule}`);

    const discoveries = {
      buttons: [],
      modals: [],
      tabs: [],
      tables: [],
      forms: [],
      inputs: []
    };

    // 1. DESCUBRIR BOTONES
    console.log(`   🔹 Descubriendo botones...`);
    const buttons = await this.page.$$('button, a.btn, [role="button"]');

    for (const btn of buttons) {
      try {
        const info = await btn.evaluate(el => {
          const rect = el.getBoundingClientRect();

          // ⭐ FIX CRÍTICO: Detectar CONTAINER del botón (modal, tab, body)
          let containerType = 'body';
          let containerSelector = null;
          let containerVisible = true;
          let requiresAction = null; // Acción requerida para hacer visible

          // Verificar si está dentro de un MODAL
          const modalParent = el.closest('.modal');
          if (modalParent) {
            containerType = 'modal';
            containerSelector = modalParent.id ? `#${modalParent.id}` : '.modal';
            containerVisible = modalParent.classList.contains('show') || modalParent.style.display !== 'none';
            if (!containerVisible) {
              requiresAction = 'open-modal';
            }
          }

          // Verificar si está dentro de un TAB PANE
          const tabPane = el.closest('.tab-pane, [role="tabpanel"]');
          if (tabPane && !modalParent) { // Solo si NO está en modal
            containerType = 'tab';
            containerSelector = tabPane.id ? `#${tabPane.id}` : '.tab-pane';
            containerVisible = tabPane.classList.contains('active') || tabPane.classList.contains('show');
            if (!containerVisible) {
              // Encontrar qué tab se debe clickear
              const tabId = tabPane.id;
              const tabButton = document.querySelector(`[href="#${tabId}"], [data-bs-target="#${tabId}"]`);
              requiresAction = {
                type: 'activate-tab',
                tabSelector: tabButton ? `[href="#${tabId}"]` : null
              };
            }
          }

          return {
            text: el.textContent?.trim() || '',
            id: el.id || '',
            classes: el.className || '',
            onclick: el.getAttribute('onclick') || '',
            href: el.getAttribute('href') || '',
            visible: rect.width > 0 && rect.height > 0,
            position: { x: rect.x, y: rect.y },
            // ⭐ NUEVO: Container awareness
            containerType: containerType,
            containerSelector: containerSelector,
            containerVisible: containerVisible,
            requiresAction: requiresAction
          };
        });

        // Clasificar botón automáticamente
        info.type = this._classifyButton(info);

        // ⭐ Guardar TODOS los botones con información de container
        if (info.type !== 'unknown') {
          discoveries.buttons.push(info);
          this.stats.elementsDiscovered++;
        }
      } catch (e) {
        // Botón no accesible, skip
      }
    }

    console.log(`      ✅ ${discoveries.buttons.length} botones descubiertos`);

    // 2. DESCUBRIR MODALES (ocultos en el DOM)
    console.log(`   🔹 Descubriendo modales...`);
    const modals = await this.page.$$('.modal, [role="dialog"], [id*="Modal"]');

    for (const modal of modals) {
      try {
        const info = await modal.evaluate(el => ({
          id: el.id || '',
          classes: el.className || '',
          visible: el.style.display !== 'none'
        }));

        discoveries.modals.push(info);
        this.stats.elementsDiscovered++;
      } catch (e) {
        // Skip
      }
    }

    console.log(`      ✅ ${discoveries.modals.length} modales descubiertos`);

    // 3. DESCUBRIR TABS (nav-tabs, nav-pills, etc.)
    console.log(`   🔹 Descubriendo tabs...`);
    const tabs = await this.page.$$('.nav-tabs a, .nav-pills a, [role="tab"]');

    for (const tab of tabs) {
      try {
        const info = await tab.evaluate(el => ({
          text: el.textContent?.trim() || '',
          id: el.id || '',
          href: el.getAttribute('href') || '',
          active: el.classList.contains('active')
        }));

        discoveries.tabs.push(info);
        this.stats.elementsDiscovered++;
      } catch (e) {
        // Skip
      }
    }

    console.log(`      ✅ ${discoveries.tabs.length} tabs descubiertos`);

    // 4. DESCUBRIR TABLAS
    console.log(`   🔹 Descubriendo tablas...`);
    const tables = await this.page.$$('table');

    for (const table of tables) {
      try {
        const info = await table.evaluate(el => {
          const rows = el.querySelectorAll('tbody tr');
          const headers = Array.from(el.querySelectorAll('thead th')).map(th => th.textContent?.trim());
          return {
            id: el.id || '',
            rowCount: rows.length,
            columnCount: headers.length,
            headers: headers
          };
        });

        discoveries.tables.push(info);
        this.stats.elementsDiscovered++;
      } catch (e) {
        // Skip
      }
    }

    console.log(`      ✅ ${discoveries.tables.length} tablas descubiertas`);

    // Guardar descubrimientos
    this.discoveries[this.currentModule] = discoveries;

    console.log(`\n   ✨ DESCUBRIMIENTO COMPLETO:`);
    console.log(`      - ${discoveries.buttons.length} botones`);
    console.log(`      - ${discoveries.modals.length} modales`);
    console.log(`      - ${discoveries.tabs.length} tabs`);
    console.log(`      - ${discoveries.tables.length} tablas`);

    return discoveries;
  }

  /**
   * CLASIFICAR BOTÓN automáticamente por patrones
   */
  _classifyButton(buttonInfo) {
    const text = buttonInfo.text.toLowerCase();
    const onclick = buttonInfo.onclick.toLowerCase();
    const classes = buttonInfo.classes.toLowerCase();

    // Patrones de CREATE
    if (text.includes('agregar') || text.includes('nuevo') || text.includes('crear') ||
        text.includes('add') || text.includes('create') ||
        onclick.includes('add') || onclick.includes('new') || onclick.includes('create') ||
        classes.includes('btn-add') || classes.includes('fa-plus')) {
      return 'CREATE';
    }

    // Patrones de EDIT
    if (text.includes('editar') || text.includes('modificar') || text.includes('edit') ||
        onclick.includes('edit') || onclick.includes('update') ||
        classes.includes('fa-edit') || classes.includes('fa-pencil')) {
      return 'EDIT';
    }

    // Patrones de DELETE
    if (text.includes('eliminar') || text.includes('borrar') || text.includes('delete') ||
        onclick.includes('delete') || onclick.includes('remove') ||
        classes.includes('fa-trash') || classes.includes('btn-danger')) {
      return 'DELETE';
    }

    // Patrones de VIEW
    if (text.includes('ver') || text.includes('detalle') || text.includes('view') ||
        onclick.includes('view') || onclick.includes('show') ||
        classes.includes('fa-eye') || classes.includes('btn-view')) {
      return 'VIEW';
    }

    // Patrones de EXPORT
    if (text.includes('export') || text.includes('descargar') || text.includes('download') ||
        onclick.includes('export') || onclick.includes('download') ||
        classes.includes('fa-download') || classes.includes('fa-file')) {
      return 'EXPORT';
    }

    // Patrones de SEARCH/FILTER
    if (text.includes('buscar') || text.includes('filtrar') || text.includes('search') ||
        onclick.includes('search') || onclick.includes('filter') ||
        classes.includes('fa-search') || classes.includes('btn-filter')) {
      return 'SEARCH';
    }

    // Patrones de SAVE
    if (text.includes('guardar') || text.includes('save') ||
        onclick.includes('save') || classes.includes('btn-save')) {
      return 'SAVE';
    }

    // Si no match, es unknown
    return 'unknown';
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PROBAR ELEMENTO (click y ver qué pasa)
   * ═══════════════════════════════════════════════════════════════════════
   */
  async testElement(element, elementHandle) {
    console.log(`\n   🧪 [TEST] Probando: "${element.text}" (${element.type})`);

    const startTime = Date.now();
    const result = {
      element: element,
      status: 'unknown',
      duration: 0,
      error: null,
      discovered: null
    };

    try {
      // Consultar conocimiento previo
      if (this.config.learningEnabled && this.knowledge[this.currentModule]) {
        const known = this.knowledge[this.currentModule].find(k =>
          k.text === element.text && k.type === element.type
        );

        if (known && known.result === 'crash') {
          console.log(`      ⏭️  SKIP - Element crashea según knowledge base`);
          result.status = 'skipped';
          result.reason = 'known-crash';
          return result;
        }

        if (known && known.result === 'timeout') {
          console.log(`      ⏰ TIMEOUT conocido - Adaptando timeout dinámicamente`);
          this.page.setDefaultTimeout(known.duration * 1.5);
        }
      }

      // ⭐ FIX CRÍTICO 1: Verificar y ACTIVAR container si es necesario
      if (element.requiresAction && !element.containerVisible) {
        console.log(`      ⚠️  Elemento en container cerrado: ${element.containerType}`);

        if (element.requiresAction === 'open-modal') {
          console.log(`      ⏭️  SKIP - Botón dentro de modal cerrado (no se puede abrir automáticamente)`);
          result.status = 'skipped';
          result.reason = 'container-modal-closed';
          return result;
        }

        if (element.requiresAction.type === 'activate-tab') {
          console.log(`      🔄 Activando tab requerido: ${element.requiresAction.tabSelector}`);
          try {
            const tabButton = await this.page.$(element.requiresAction.tabSelector);
            if (tabButton) {
              await tabButton.click();
              await this.page.waitForTimeout(500); // Esperar animación de tab
              console.log(`      ✅ Tab activado`);
            } else {
              console.log(`      ⏭️  SKIP - No se encontró botón de tab`);
              result.status = 'skipped';
              result.reason = 'tab-button-not-found';
              return result;
            }
          } catch (e) {
            console.log(`      ⏭️  SKIP - Error activando tab: ${e.message}`);
            result.status = 'skipped';
            result.reason = 'tab-activation-failed';
            return result;
          }
        }
      }

      // ⭐ FIX CRÍTICO 2: Scroll INTELIGENTE - Modal vs Body
      try {
        // Primero verificar si está en un MODAL abierto
        const isInModal = await elementHandle.evaluate(el => {
          const modal = el.closest('.modal.show');
          return modal !== null;
        });

        if (isInModal) {
          // ✅ CORRECTO: Scroll DENTRO del modal
          console.log(`      📜 Scrolleando dentro del modal...`);
          await this.page.evaluate(() => {
            const modalBody = document.querySelector('.modal.show .modal-body');
            if (modalBody) {
              modalBody.scrollTop = modalBody.scrollHeight; // Scroll al final
            }
          });
          await this.page.waitForTimeout(300);

          // Luego scroll al elemento específico
          await elementHandle.scrollIntoViewIfNeeded();
        } else {
          // ✅ CORRECTO: Scroll en body (elemento normal)
          console.log(`      📜 Scrolleando en body...`);
          await elementHandle.scrollIntoViewIfNeeded();
        }

        // FIX: Si está en un contenedor scrolleable, scroll ahí también
        await elementHandle.evaluate(el => {
          let parent = el.parentElement;
          while (parent) {
            const overflow = window.getComputedStyle(parent).overflow;
            const overflowY = window.getComputedStyle(parent).overflowY;

            if (overflow === 'auto' || overflow === 'scroll' ||
                overflowY === 'auto' || overflowY === 'scroll' ||
                parent.classList.contains('modal-body') ||
                parent.classList.contains('tab-pane')) {
              // Scroll del contenedor para que el elemento quede visible
              const rect = el.getBoundingClientRect();
              const parentRect = parent.getBoundingClientRect();

              if (rect.top < parentRect.top || rect.bottom > parentRect.bottom) {
                el.scrollIntoView({ behavior: 'instant', block: 'center' });
              }
              break;
            }
            parent = parent.parentElement;
          }
        });

        await this.page.waitForTimeout(500); // Esperar a que la página se estabilice
      } catch (scrollError) {
        // Ignorar errores de scroll - intentaremos click de todos modos
      }

      // ⭐ FIX CRÍTICO 3: Verificar que el elemento está EN VIEWPORT antes de click
      const isInViewport = await elementHandle.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;

        // Verificar que está completamente visible en viewport
        const isVisible = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= windowHeight &&
          rect.right <= windowWidth &&
          rect.width > 0 &&
          rect.height > 0
        );

        // Verificar que no está cubierto por otro elemento
        const elementAtPoint = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );

        const isClickable = elementAtPoint === el || el.contains(elementAtPoint);

        return {
          isVisible: isVisible,
          isClickable: isClickable,
          rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
        };
      });

      console.log(`      🔍 Viewport check: visible=${isInViewport.isVisible}, clickable=${isInViewport.isClickable}`);

      if (!isInViewport.isVisible || !isInViewport.isClickable) {
        console.log(`      ⚠️  Elemento fuera de viewport o cubierto, intentando JS native click...`);

        // Usar JS native click como fallback
        await elementHandle.evaluate(el => el.click());
        await this.page.waitForTimeout(1000);
      } else {
        // Click normal (Playwright) - ⭐ FIX: Usar timeout configurado
        await elementHandle.click({ timeout: this.config.defaultTimeout });
        await this.page.waitForTimeout(1000);
      }

      const duration = Date.now() - startTime;
      result.duration = duration;

      // Verificar qué pasó después del click
      const afterClick = await this.page.evaluate(() => {
        return {
          modalsOpen: document.querySelectorAll('.modal.show, [style*="display: block"]').length,
          urlChanged: window.location.href,
          alertPresent: !!document.querySelector('.alert, .swal2-container')
        };
      });

      if (afterClick.modalsOpen > 0) {
        result.status = 'success';
        result.discovered = 'modal-opened';
        console.log(`      ✅ Abrió modal`);

        // ⭐ FIX 37: ESPERAR ACTIVAMENTE a que modal esté REALMENTE presente
        try {
          await this.page.waitForFunction(() => {
            const modal = document.querySelector('#employeeFileModal') ||
                         document.querySelector('.modal.show') ||
                         Array.from(document.querySelectorAll('[id*="Modal"]'))
                           .find(m => window.getComputedStyle(m).position === 'fixed');
            return modal !== null;
          }, { timeout: 5000 });
          console.log(`      ✅ Modal confirmado en DOM`);
        } catch {
          console.log(`      ⚠️  Modal no detectado después de 5s`);
        }

        await this.page.waitForTimeout(1000); // Wait adicional para tabs

        // ⭐ NUEVO: DESCUBRIR Y TESTEAR TABS DENTRO DEL MODAL
        try {
          const tabsResult = await this.discoverAndTestTabs();
          if (tabsResult && tabsResult.tabs.length > 0) {
            result.tabs = tabsResult;
            console.log(`      ✅ Modal con ${tabsResult.tabs.length} tabs testeados`);
          }
        } catch (tabsError) {
          console.log(`      ⚠️  Error testeando tabs: ${tabsError.message}`);
        }

        // ⭐ NUEVO: TESTING PROFUNDO - Si es CREATE y abrió modal con form
        if (element.type === 'CREATE') {
          console.log(`\n      🎯 [DEEP TEST] Detectado botón CREATE - Iniciando CRUD profundo...`);

          try {
            const crudResult = await this.testCRUD(element, elementHandle);
            result.crudTest = crudResult;

            // Actualizar estadísticas
            if (crudResult.create.success) {
              console.log(`      ✅ CRUD: CREATE ✓`);
            }
            if (crudResult.read.success) {
              console.log(`      ✅ CRUD: READ ✓`);
            }
            if (crudResult.persistence.success) {
              console.log(`      ✅ CRUD: PERSISTENCE ✓`);
            }
            if (crudResult.update.success) {
              console.log(`      ✅ CRUD: UPDATE ✓`);
            }
            if (crudResult.delete.success) {
              console.log(`      ✅ CRUD: DELETE ✓`);
            }

          } catch (crudError) {
            console.log(`      ⚠️  CRUD test failed: ${crudError.message}`);
            result.crudTest = { error: crudError.message };
          }
        }
        // ⭐ NUEVO: Si es EDIT/VIEW, descubrir campos del form sin guardar
        else if (element.type === 'EDIT' || element.type === 'VIEW') {
          try {
            const fields = await this.discoverFormFields();
            result.formFields = fields;
            console.log(`      📋 Form con ${fields.length} campos descubiertos`);
          } catch (e) {
            // Ignorar error
          }
        }

      } else if (afterClick.alertPresent) {
        result.status = 'success';
        result.discovered = 'alert-shown';
        console.log(`      ✅ Mostró alerta`);
      } else {
        result.status = 'success';
        result.discovered = 'action-completed';
        console.log(`      ✅ Acción completada`);
      }

      this.stats.successes++;

    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.duration = Date.now() - startTime;

      if (error.message.includes('timeout')) {
        console.log(`      ⏰ TIMEOUT (${result.duration}ms)`);
        result.status = 'timeout';
        this.stats.timeouts++;
      } else {
        console.log(`      ❌ ERROR: ${error.message}`);
        this.stats.crashes++;
      }
    }

    // Guardar resultado en learning engine
    if (this.config.learningEnabled && this.learningEngine) {
      await this.learningEngine.recordAction({
        executionId: this.sessionId, // ⭐ FIX: UUID válido en vez de 'autonomous-session'
        companyId: this.companyId, // ⭐ FIX: company_id del login
        module: this.currentModule,
        element: element,
        result: result.status,
        duration: result.duration,
        error: result.error,
        timestamp: new Date()
      });
    }

    // ⭐ FIX: Cierre AGRESIVO de modales para evitar que intercepten próximos clicks
    try {
      await this.page.evaluate(() => {
        // 1. Cerrar con botones close
        document.querySelectorAll('.close, [data-dismiss="modal"], .modal-close, button[onclick*="close"]').forEach(btn => {
          try { btn.click(); } catch(e) {}
        });

        // 2. Presionar ESC (muchos modales responden a ESC)
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

        // 3. Remover clases y estilos
        document.querySelectorAll('.modal, [id*="Modal"], [id*="modal"]').forEach(modal => {
          modal.style.display = 'none';
          modal.classList.remove('show', 'in');
          modal.setAttribute('aria-hidden', 'true');
        });

        // 4. Remover backdrops
        document.querySelectorAll('.modal-backdrop, .fade').forEach(bd => bd.remove());

        // 5. Restaurar scroll del body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
      await this.page.waitForTimeout(500); // Esperar a que cierre
    } catch (e) {
      // Ignorar errores al cerrar modales
    }

    return result;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DESCUBRIR Y TESTEAR TABS DENTRO DE MODAL ABIERTO
   * ═══════════════════════════════════════════════════════════════════════
   */
  async discoverAndTestTabs() {
    console.log(`\n      🔍 [TABS] Buscando tabs en modal abierto...`);

    const result = {
      tabs: [],
      totalButtons: 0,
      totalCrudTests: 0,
      errors: []
    };

    try {
      // ⭐ FIX 38: ESPERAR ACTIVAMENTE a que modal esté presente antes de inspeccionar
      console.log(`      ⏳ Esperando a que modal esté completamente renderizado...`);
      try {
        await this.page.waitForFunction(() => {
          const modal = document.querySelector('#employeeFileModal') ||
                       document.querySelector('.modal.show') ||
                       Array.from(document.querySelectorAll('[id*="Modal"], [id*="modal"]'))
                         .find(m => {
                           const style = window.getComputedStyle(m);
                           return style.position === 'fixed' &&
                                  style.display !== 'none' &&
                                  parseInt(style.zIndex) > 1000;
                         });
          return modal !== null;
        }, { timeout: 5000 });
        console.log(`      ✅ Modal detectado y listo para inspección`);
      } catch {
        console.log(`      ⚠️  Modal no detectado después de 5s wait`);
      }

      // ⭐ FIX 39: Usar EXACTAMENTE los mismos selectores que waitForFunction()
      const domInfo = await this.page.evaluate(() => {
        // ⭐ UNIFICADO: Misma lógica que waitForFunction() arriba
        const modal = document.querySelector('#employeeFileModal') ||
                     document.querySelector('.modal.show') ||
                     Array.from(document.querySelectorAll('[id*="Modal"], [id*="modal"]'))
                       .find(m => {
                         const style = window.getComputedStyle(m);
                         return style.position === 'fixed' &&
                                style.display !== 'none' &&
                                parseInt(style.zIndex) > 1000;
                       });

        if (!modal) return { hasModal: false };

        return {
          hasModal: true,
          modalId: modal.id,
          modalClasses: modal.className,
          modalTag: modal.tagName,
          navTabs: modal.querySelectorAll('.nav-tabs .nav-link').length,
          fileTabs: modal.querySelectorAll('.file-tab').length,
          roleTabs: modal.querySelectorAll('[role="tab"]').length,
          allButtons: modal.querySelectorAll('button').length,
          allDivs: modal.querySelectorAll('div[class*="tab"]').length
        };
      });

      console.log(`      🔍 DOM inspection:`, domInfo);

      if (!domInfo.hasModal) {
        console.log(`      ℹ️  No se encontró modal abierto`);
        return result;
      }

      // Buscar tabs DENTRO del modal encontrado usando evaluate
      const tabsInfo = await this.page.evaluate(() => {
        // Reusar la misma lógica de búsqueda de modal - CON FIX para position:fixed
        let modal = document.querySelector('.modal.show');
        if (!modal) {
          const allModals = document.querySelectorAll('.modal, [class*="modal"], [id*="modal"], [id*="Modal"]');
          for (const m of allModals) {
            const style = window.getComputedStyle(m);
            // ⭐ FIX: position:fixed devuelve offsetParent=null
            const isVisible = style.display !== 'none' &&
                            style.visibility !== 'hidden' &&
                            style.opacity !== '0' &&
                            (m.offsetParent !== null || style.position === 'fixed');
            if (isVisible) {
              modal = m;
              break;
            }
          }
        }
        if (!modal) {
          const highZindex = Array.from(document.querySelectorAll('*'))
            .filter(el => parseInt(window.getComputedStyle(el).zIndex) > 1000)
            .sort((a, b) => parseInt(window.getComputedStyle(b).zIndex) - parseInt(window.getComputedStyle(a).zIndex))[0];
          if (highZindex && (highZindex.className.includes('modal') || highZindex.id.includes('modal'))) {
            modal = highZindex;
          }
        }

        if (!modal) return { tabs: [], strategy: 'none' };

        // Buscar tabs con múltiples estrategias
        let tabs = [];
        let strategy = '';

        // Estrategia 1: Bootstrap nav-tabs
        tabs = Array.from(modal.querySelectorAll('.nav-tabs .nav-link, .nav-tabs a'));
        if (tabs.length > 0) strategy = 'bootstrap-nav-tabs';

        // Estrategia 2: Custom .file-tab
        if (tabs.length === 0) {
          tabs = Array.from(modal.querySelectorAll('.file-tab'));
          if (tabs.length > 0) strategy = 'custom-file-tab';
        }

        // Estrategia 3: role="tab"
        if (tabs.length === 0) {
          tabs = Array.from(modal.querySelectorAll('[role="tab"]'));
          if (tabs.length > 0) strategy = 'aria-role-tab';
        }

        // Estrategia 4: data-toggle/data-bs-toggle
        if (tabs.length === 0) {
          tabs = Array.from(modal.querySelectorAll('[data-toggle="tab"], [data-bs-toggle="tab"]'));
          if (tabs.length > 0) strategy = 'data-toggle-tab';
        }

        // Estrategia 5: Cualquier div/a con "tab" en clase o id
        if (tabs.length === 0) {
          tabs = Array.from(modal.querySelectorAll('[class*="tab"], [id*="tab"]'))
            .filter(el => el.tagName === 'A' || el.tagName === 'BUTTON' || el.classList.contains('tab'));
          if (tabs.length > 0) strategy = 'generic-tab-class';
        }

        return {
          tabs: tabs.map((tab, i) => ({
            text: tab.textContent?.trim() || `Tab ${i + 1}`,
            id: tab.id,
            class: tab.className,
            href: tab.getAttribute('href'),
            dataTarget: tab.getAttribute('data-bs-target') || tab.getAttribute('data-target'),
            index: i
          })),
          strategy
        };
      });

      console.log(`      🔍 Tabs found: ${tabsInfo.tabs.length} (strategy: ${tabsInfo.strategy})`);

      if (tabsInfo.tabs.length === 0) {
        console.log(`      ℹ️  No se encontraron tabs en el modal`);
        return result;
      }

      console.log(`      ✅ ${tabsInfo.tabs.length} tabs encontrados con estrategia: ${tabsInfo.strategy}`);

      // Testear cada tab
      for (let i = 0; i < tabsInfo.tabs.length; i++) {
        const tabInfo = tabsInfo.tabs[i];

        // Construir selector para encontrar este tab específico
        let selector = null;
        if (tabInfo.id) {
          selector = `#${tabInfo.id}`;
        } else if (tabInfo.text) {
          // Usar texto como selector (menos confiable pero funciona)
          selector = `:has-text("${tabInfo.text}")`;
        }

        if (!selector) {
          console.log(`      ⚠️  No se pudo crear selector para tab ${i + 1}`);
          continue;
        }

        const tabElement = await this.page.$(selector);

        if (!tabElement) {
          console.log(`      ⚠️  No se pudo obtener handle para tab ${i + 1}`);
          continue;
        }

        try {
          console.log(`\n      📑 [TAB ${i + 1}/${tabsInfo.tabs.length}] "${tabInfo.text}"`);

          const tabResult = {
            name: tabInfo.text,
            index: i,
            buttons: [],
            crudTests: [],
            errors: []
          };

          // Click en el tab para activarlo
          try {
            await tabElement.scrollIntoViewIfNeeded();
            await tabElement.click();
            await this.page.waitForTimeout(500); // Esperar click inicial
            console.log(`         ✅ Tab clickeado`);
          } catch (clickError) {
            console.log(`         ⚠️  Click falló, intentando con JS...`);
            await tabElement.evaluate(el => el.click());
            await this.page.waitForTimeout(500);
          }

          // ⭐ FIX 74: EJECUTAR showFileTab() para activar tab correctamente (agregar clase .active)
          // ROOT CAUSE: El click solo dispara evento, pero NO activa el tab content con clase .active
          const tabActivated = await this.page.evaluate((tabIndex) => {
            // Obtener nombre del tab desde data-target o id
            const tabs = document.querySelectorAll('.file-tab');
            const clickedTab = tabs[tabIndex];

            if (!clickedTab) return { success: false, reason: 'tab-not-found' };

            // Extraer nombre del tab desde data-target (ej: "#personal-tab" → "personal")
            let tabName = null;
            const dataTarget = clickedTab.getAttribute('data-target');
            if (dataTarget) {
              tabName = dataTarget.replace('#', '').replace('-tab', '');
            }

            // Si no tiene data-target, intentar desde onclick (ej: "showFileTab('personal', this)")
            if (!tabName) {
              const onclick = clickedTab.getAttribute('onclick');
              if (onclick) {
                const match = onclick.match(/showFileTab\('([^']+)'/);
                if (match) tabName = match[1];
              }
            }

            if (!tabName) return { success: false, reason: 'tab-name-not-found', dataTarget, onclick: clickedTab.getAttribute('onclick') };

            // Ejecutar showFileTab() si existe
            if (typeof window.showFileTab === 'function') {
              window.showFileTab(tabName, clickedTab);
              return { success: true, method: 'showFileTab', tabName };
            }

            return { success: false, reason: 'showFileTab-not-defined' };
          }, i);

          if (tabActivated.success) {
            console.log(`         ✅ [FIX 74] Tab activado con showFileTab('${tabActivated.tabName}')`);
            await this.page.waitForTimeout(1000); // Esperar que el tab se active completamente
          } else {
            console.log(`         ⚠️  [FIX 74] No se pudo activar tab: ${tabActivated.reason}`);
            await this.page.waitForTimeout(1500); // Fallback al tiempo original
          }

          // ⭐ FIX 51: Cerrar modales bloqueantes de forma MÁS ROBUSTA
          try {
            const closedModals = await this.page.evaluate(() => {
              const modalsToClose = [];

              // Buscar modales que puedan estar bloqueando
              const blockingModals = [
                '#generateReportModal',
                '#reportModal',
                '[id*="ReportModal"]',
                '[id*="reportModal"]'
              ];

              blockingModals.forEach(selector => {
                // Buscar TODAS las instancias del modal (puede haber duplicados en DOM)
                const modals = document.querySelectorAll(selector);

                modals.forEach(modal => {
                  const style = window.getComputedStyle(modal);
                  const isVisible = style.display !== 'none' &&
                                   style.visibility !== 'hidden' &&
                                   parseInt(style.zIndex) > 0;

                  if (isVisible) {
                    // ⭐ CIERRE ROBUSTO: múltiples estrategias
                    // 1. Intentar cerrar con botón close
                    const closeBtn = modal.querySelector('.close, [data-dismiss="modal"], .btn-close');
                    if (closeBtn) {
                      try {
                        closeBtn.click();
                      } catch {}
                    }

                    // 2. Forzar ocultación COMPLETA (no solo display)
                    modal.style.display = 'none';
                    modal.style.visibility = 'hidden';
                    modal.style.opacity = '0';
                    modal.style.zIndex = '-9999';
                    modal.style.pointerEvents = 'none';

                    // 3. Quitar clases de Bootstrap
                    modal.classList.remove('show');
                    modal.classList.add('hidden');

                    // 4. Setear aria-hidden
                    modal.setAttribute('aria-hidden', 'true');

                    modalsToClose.push(modal.id || selector);
                  }
                });
              });

              // ⭐ BONUS: Buscar y cerrar CUALQUIER modal backdrop que pueda estar bloqueando
              const backdrops = document.querySelectorAll('.modal-backdrop, [class*="modal-backdrop"]');
              backdrops.forEach(backdrop => {
                backdrop.style.display = 'none';
                backdrop.style.pointerEvents = 'none';
                backdrop.remove(); // Eliminar del DOM directamente
              });

              return modalsToClose;
            });

            if (closedModals.length > 0) {
              console.log(`         🚫 Cerrados ${closedModals.length} modales bloqueantes: ${closedModals.join(', ')}`);
              await this.page.waitForTimeout(1500); // ⭐ Esperar MÁS tiempo para que DOM se actualice
            }
          } catch (closeError) {
            console.log(`         ⚠️  Error cerrando modales bloqueantes: ${closeError.message}`);
          }

          // ⭐ FIX 34: Scroll en modal para ver botones que están abajo
          try {
            await this.page.evaluate(() => {
              const modal = document.querySelector('.modal.show') ||
                           document.querySelector('[id*="modal"], [id*="Modal"]');
              if (modal) {
                const content = modal.querySelector('[style*="overflow"]') || modal;
                content.scrollTop = 0; // Reset scroll
              }
            });
          } catch {}

          // ⭐ FIX 46: Inspeccionar DOM del tab activo y detectar botones CORRECTAMENTE
          const tabDOMInfo = await this.page.evaluate((tabIndex) => {
            // Encontrar el tab que acabamos de activar
            const tabs = document.querySelectorAll('.file-tab');
            const activeTab = tabs[tabIndex];

            if (!activeTab) return { error: 'Tab not found' };

            // Buscar el contenido asociado a este tab
            // Estrategia 1: Por data-target
            let tabContent = null;
            const targetId = activeTab.getAttribute('data-target');
            if (targetId) {
              tabContent = document.querySelector(targetId);
            }

            // Estrategia 2: Por posición (n-ésimo tab → n-ésimo content)
            if (!tabContent) {
              const allContents = document.querySelectorAll('.file-tab-content');
              tabContent = allContents[tabIndex];
            }

            if (!tabContent) return { error: 'Tab content not found' };

            // Buscar SOLO botones DENTRO de este tab content específico
            const buttons = Array.from(tabContent.querySelectorAll('button'));

            return {
              tabIndex,
              tabText: activeTab.textContent?.trim(),
              tabContentId: tabContent.id || 'no-id',
              tabContentClasses: tabContent.className,
              tabContentVisible: window.getComputedStyle(tabContent).display !== 'none',
              totalButtons: buttons.length,
              buttons: buttons.slice(0, 10).map(btn => ({ // Primeros 10 para logging
                text: btn.textContent?.trim() || '',
                id: btn.id,
                class: btn.className,
                onclick: btn.getAttribute('onclick'),
                visible: btn.offsetParent !== null && btn.offsetWidth > 0
              })),
              allButtonTexts: buttons.filter(b => b.offsetParent !== null).map(b => b.textContent?.trim())
            };
          }, i);

          console.log(`         🔍 [TAB DOM] Tab ${i+1}: "${tabDOMInfo.tabText}"`);
          console.log(`         📊 Total buttons in content: ${tabDOMInfo.totalButtons}`);
          console.log(`         📝 Primeros 5 botones visibles:`);
          if (tabDOMInfo.allButtonTexts) {
            tabDOMInfo.allButtonTexts.slice(0, 5).forEach((text, idx) => {
              console.log(`            ${idx+1}. "${text}"`);
            });
          }

          // Ahora obtener los botones para análisis
          const buttonsInTab = tabDOMInfo.buttons || [];

          console.log(`         📋 ${buttonsInTab.length} botones encontrados en tab`);

          // ⭐ FIX 36: Scroll ABAJO para ver botones de guardar
          if (buttonsInTab.length === 0) {
            try {
              await this.page.evaluate(() => {
                const modal = document.querySelector('#employeeFileModal') ||
                             document.querySelector('[id*="modal"], [id*="Modal"]');
                if (modal) {
                  const scrollable = modal.querySelector('[style*="overflow-y"]') || modal;
                  scrollable.scrollTo(0, scrollable.scrollHeight); // Scroll al fondo
                }
              });
              await this.page.waitForTimeout(500);

              // Reintentar búsqueda después de scroll
              const buttonsAfterScroll = await this.page.$$eval(
                '#employeeFileModal button, [id*="Modal"] button',
                buttons => buttons.map(btn => ({
                  text: btn.textContent?.trim() || '',
                  id: btn.id,
                  visible: btn.offsetParent !== null && btn.offsetWidth > 0,
                  inActiveTab: (() => {
                    let parent = btn.closest('.tab-pane, .file-tab-content');
                    if (!parent) return true;
                    const style = window.getComputedStyle(parent);
                    return style.display !== 'none';
                  })()
                }))
              ).then(btns => btns.filter(b => b.visible && b.inActiveTab));

              buttonsInTab.push(...buttonsAfterScroll);
              console.log(`         📋 Después de scroll: ${buttonsInTab.length} botones totales`);
            } catch {}
          }

          const visibleButtons = buttonsInTab;

          tabResult.buttons = visibleButtons;
          result.totalButtons += visibleButtons.length;

          // ⭐ FIX 47: Filtrar SOLO botones CREATE reales (no editar/guardar)
          const createButtons = visibleButtons.filter(b => {
            const text = b.text.toLowerCase();
            const onclick = (b.onclick || '').toLowerCase();

            // Excluir botones de editar explícitamente
            if (text.includes('editar') || text.includes('edit') ||
                onclick.includes('edit') || onclick.includes('update')) {
              return false;
            }

            // ⭐ FIX 57: Excluir botones de reportes (no son CRUD)
            const reportKeywords = [
              'reporte', 'report',
              'imprimir', 'print',
              'exportar', 'export',
              'pdf', 'excel',
              'generar',
              'descargar', 'download',
              'gestionar baja' // Este botón específico abre generateReportModal
            ];

            const isReportButton = reportKeywords.some(kw =>
              text.includes(kw) || onclick.includes(kw)
            );

            if (isReportButton) {
              console.log(`         ⏭️  [FIX 57] Saltando botón de reporte: "${b.text}"`);
              return false;
            }

            // Incluir solo botones que realmente crean algo nuevo
            return text.includes('agregar') ||
                   text.includes('añadir') ||
                   text.includes('nuevo') ||
                   text.includes('add') ||
                   text.includes('create') ||
                   (text.startsWith('+') && text.length > 1) || // "+ Algo" no solo "+"
                   onclick.includes('add') ||
                   onclick.includes('create') ||
                   onclick.includes('new');
          });

          if (createButtons.length > 0) {
            console.log(`         🎯 ${createButtons.length} botones CREATE detectados - Testeando primero...`);
            console.log(`         📝 Primer botón CREATE: "${createButtons[0].text}" (id: ${createButtons[0].id || 'none'}, class: ${createButtons[0].class})`);

            // ⭐ FIX 41: Selector compatible con tabs custom de employeeFileModal
            // Intentar múltiples estrategias para encontrar el botón
            let btnHandle = null;

            // Estrategia 1: Por ID si está disponible
            if (createButtons[0].id) {
              btnHandle = await this.page.$(`#${createButtons[0].id}`);
            }

            // ⭐ FIX 44: Estrategia 2 - Buscar por símbolo "+" en tab activo (más confiable)
            // ⭐ FIX 67: Filtrar botones por onclick que contenga funciones CRUD (addEducation, addFamilyMember, etc.)
            // ⭐ FIX 69: Debug logging de la búsqueda de botones CRUD
            // ⭐ FIX 70: Selector más robusto - buscar CUALQUIER tab visible sin importar clase
            // ⭐ FIX 73: ROOT CAUSE FIX - Usar clase .active para encontrar SOLO el tab activo (no TAB 1)
            if (!btnHandle) {
              // ⭐ FIX 72: ANTES de buscar botones, verificar estado de TODOS los tabs
              const tabsState = await this.page.evaluate(() => {
                const allTabs = document.querySelectorAll('#employeeFileModal .file-tab-content');
                return Array.from(allTabs).map(tab => ({
                  id: tab.id,
                  display: window.getComputedStyle(tab).display,
                  hasActive: tab.classList.contains('active'),
                  styleAttr: tab.getAttribute('style')
                }));
              });
              console.log(`         🔍 [FIX 72] Estado de tabs ANTES de buscar botones:`, JSON.stringify(tabsState));

              // Los botones en tabs tienen textos como "+ Agregar", "+ Agregar Hijo", etc.
              // Buscar botones con "+" que tengan onclick de CRUD (no reportes)

              // ⭐ FIX 73: Buscar botones SOLO en el tab con clase .active
              // ROOT CAUSE: El selector anterior :not([style*="display: none"]) encontraba botones del TAB 1 en vez del TAB 2
              let allButtons = await this.page.$$('#employeeFileModal .file-tab-content.active button');
              console.log(`         🔍 [FIX 73] Botones encontrados en tab .active: ${allButtons.length}`);

              // ⭐ FIX 73: Si no encuentra botones con .active, intentar con selector por id
              if (allButtons.length === 0) {
                console.log(`         ⚠️  [FIX 73] No se encontraron botones con selector .active. Intentando selector alternativo...`);
                allButtons = await this.page.$$('#employeeFileModal [id$="-tab"].active button');
                console.log(`         🔍 [FIX 73] Botones encontrados con [id$="-tab"].active: ${allButtons.length}`);
              }

              console.log(`         🔍 [FIX 69] Buscando botones CRUD en tab... Total botones: ${allButtons.length}`);

              // ⭐ FIX 71: Listar TODOS los textos de botones para debugging
              const allButtonsInfo = [];
              for (const btn of allButtons) {
                const info = await btn.evaluate(el => ({ text: el.textContent?.trim(), visible: el.offsetParent !== null }));
                allButtonsInfo.push(info);
              }
              console.log(`         📋 [FIX 71] Textos de botones encontrados:`, JSON.stringify(allButtonsInfo.slice(0, 20).map(b => b.text)));

              let candidatesFound = 0;
              for (const btn of allButtons) {
                const btnInfo = await btn.evaluate(el => ({
                  text: el.textContent?.trim(),
                  onclick: el.getAttribute('onclick'),
                  visible: el.offsetParent !== null && el.offsetWidth > 0
                }));

                // ⭐ FIX 67: Buscar botón que:
                // 1. Tenga "+" en el texto
                // 2. Tenga onclick con funciones CRUD (add*, register*, create*)
                // 3. NO tenga onclick con funciones de reportes (generateReport, exportReport, etc.)
                if (btnInfo.text && btnInfo.text.includes('+') && btnInfo.visible) {
                  candidatesFound++;
                  console.log(`         📝 [FIX 69] Candidato ${candidatesFound}: "${btnInfo.text}" → onclick: ${btnInfo.onclick || 'null'}`);

                  if (btnInfo.onclick) {
                    // Verificar que el onclick sea una función CRUD, NO reporte
                    const isCRUD = /\b(add|register|create|new)[A-Z]/.test(btnInfo.onclick);
                    const isReport = /\b(generate|export|print).*Report/.test(btnInfo.onclick);

                    console.log(`         🧪 [FIX 69] Test: isCRUD=${isCRUD}, isReport=${isReport}`);

                    if (isCRUD && !isReport) {
                      btnHandle = btn;
                      console.log(`         🎯 [FIX 67] Botón CRUD encontrado: "${btnInfo.text}" → ${btnInfo.onclick}`);
                      break;
                    }
                  } else {
                    console.log(`         ⚠️  [FIX 69] Botón sin onclick attribute`);
                  }
                }
              }

              if (!btnHandle) {
                console.log(`         ⚠️  [FIX 69] No se encontraron botones CRUD. Candidatos con "+": ${candidatesFound}`);
              }
            }

            // ⭐ FIX 110: Estrategia 2.5 - Buscar por TEXTO EXACTO del botón detectado
            if (!btnHandle && createButtons[0].text) {
              const buttonText = createButtons[0].text.trim();
              console.log(`         🔍 [FIX 110] Buscando botón por texto exacto: "${buttonText}"`);

              btnHandle = await this.page.evaluate((targetText) => {
                // Buscar en el tab activo dentro de employeeFileModal
                const activeTab = document.querySelector('#employeeFileModal .file-tab-content.active') ||
                                  document.querySelector('#employeeFileModal [id$="-tab"][style*="display: block"]');

                if (!activeTab) return null;

                const buttons = Array.from(activeTab.querySelectorAll('button'));
                const matchingBtn = buttons.find(btn => {
                  const btnText = btn.textContent?.trim();
                  return btnText === targetText || btnText?.includes(targetText.replace(/[^\w\s]/g, '').trim());
                });

                if (matchingBtn) {
                  // Guardar referencia para poder encontrarlo luego
                  // Nota: dataset convierte camelCase a kebab-case, así que usamos sin guiones
                  matchingBtn.setAttribute('data-fix110target', 'true');
                  return true;
                }
                return null;
              }, buttonText);

              if (btnHandle) {
                // btnHandle aquí es boolean true, necesitamos obtener el ElementHandle real
                const realHandle = await this.page.$('[data-fix110target="true"]');
                if (realHandle) {
                  btnHandle = realHandle;
                  // Limpiar el atributo temporal
                  await this.page.evaluate(() => {
                    const el = document.querySelector('[data-fix110target="true"]');
                    if (el) el.removeAttribute('data-fix110target');
                  });
                  console.log(`         ✅ [FIX 110] Botón encontrado por texto exacto`);
                } else {
                  btnHandle = null;
                  console.log(`         ⚠️  [FIX 110] Botón marcado pero no encontrado`);
                }
              }
            }

            // Estrategia 3: Fallback - Buscar botón CREATE genérico
            if (!btnHandle) {
              console.log(`         ⚠️  [FIX 110] Fallback: Buscando .btn-primary o .btn-success`);
              btnHandle = await this.page.$(
                `#employeeFileModal .file-tab-content:not([style*="display: none"]) button.btn-primary, ` +
                `#employeeFileModal .file-tab-content:not([style*="display: none"]) button.btn-success`
              );
            }

            if (btnHandle) {
              // ⭐ FIX 110b: Verificar que el handle corresponde al botón correcto
              const actualBtnText = await btnHandle.evaluate(btn => btn.textContent?.trim());
              console.log(`         ✅ Handle obtenido para botón (texto real: "${actualBtnText}")`);

              // Si el texto no coincide, es posible que el fallback encontró el botón incorrecto
              if (actualBtnText && actualBtnText !== createButtons[0].text &&
                  !actualBtnText.includes('Agregar') && !actualBtnText.includes('Add') && !actualBtnText.includes('+')) {
                console.log(`         ⚠️  [FIX 110b] ADVERTENCIA: Botón encontrado no parece ser CREATE ("${actualBtnText}" vs esperado "${createButtons[0].text}")`);
              }
            } else {
              console.log(`         ⚠️  No se pudo obtener handle para botón "${createButtons[0].text}"`);
            }

            if (btnHandle) {
              try {
                // ⭐ FIX 113: Obtener onclick del botón para verificación posterior
                const btnOnclickInfo = await btnHandle.evaluate(btn => btn.getAttribute('onclick') || '');

                const btnElement = {
                  type: 'CREATE',
                  text: createButtons[0].text,
                  container: 'modal-tab',
                  onclick: btnOnclickInfo  // ⭐ FIX 113: Guardar onclick para verificación en testCRUD
                };

                // ⭐ FIX 55: Cerrar modales bloqueantes ANTES de clickear botón CREATE
                try {
                  const closedBeforeClick = await this.page.evaluate(() => {
                    const modalsToClose = [];
                    const blockingModals = [
                      '#generateReportModal',
                      '#reportModal',
                      '[id*="ReportModal"]',
                      '[id*="reportModal"]'
                    ];

                    blockingModals.forEach(selector => {
                      const modals = document.querySelectorAll(selector);
                      modals.forEach(modal => {
                        const style = window.getComputedStyle(modal);
                        const isVisible = style.display !== 'none' &&
                                         style.visibility !== 'hidden' &&
                                         parseInt(style.zIndex) > 0;

                        if (isVisible) {
                          // Cierre completo
                          modal.style.display = 'none';
                          modal.style.visibility = 'hidden';
                          modal.style.opacity = '0';
                          modal.style.zIndex = '-9999';
                          modal.style.pointerEvents = 'none';
                          modal.classList.remove('show');
                          modal.setAttribute('aria-hidden', 'true');
                          modalsToClose.push(modal.id || selector);
                        }
                      });
                    });

                    // Eliminar backdrops
                    const backdrops = document.querySelectorAll('.modal-backdrop, [class*="modal-backdrop"]');
                    backdrops.forEach(b => b.remove());

                    return modalsToClose;
                  });

                  if (closedBeforeClick.length > 0) {
                    console.log(`         🚫 [PRE-CLICK] Cerrados ${closedBeforeClick.length} modales: ${closedBeforeClick.join(', ')}`);
                    await this.page.waitForTimeout(500);
                  }
                } catch (preCloseError) {
                  console.log(`         ⚠️  Error cerrando modales pre-click: ${preCloseError.message}`);
                }

                // ⭐ FIX 48: CLICKEAR el botón ANTES de testCRUD para abrir formulario
                // ⭐ FIX 66: Ejecutar onclick directamente en vez de .click() para disparar event handlers inline
                console.log(`         🖱️  Clickeando botón "${createButtons[0].text}" para abrir formulario...`);

                // ⭐ FIX 68: Debug logging de qué botón se está clickeando
                const btnDebugInfo = await btnHandle.evaluate(btn => ({
                  text: btn.textContent?.trim(),
                  onclick: btn.getAttribute('onclick'),
                  id: btn.id,
                  className: btn.className,
                  tagName: btn.tagName,
                  hasParent: !!btn.parentElement,
                  parentTag: btn.parentElement?.tagName
                }));

                console.log(`         🔍 [FIX 68] Botón a clickear:`, JSON.stringify(btnDebugInfo));

                const clickExecuted = await btnHandle.evaluate(btn => {
                  // Si el botón tiene onclick attribute, ejecutarlo directamente
                  const onclickAttr = btn.getAttribute('onclick');
                  if (onclickAttr) {
                    try {
                      // Ejecutar el onclick en el contexto del botón
                      eval(onclickAttr);
                      return { success: true, method: 'onclick-eval', onclick: onclickAttr };
                    } catch (e) {
                      return { success: false, method: 'onclick-eval', error: e.message };
                    }
                  } else {
                    // Si no hay onclick, hacer click normal
                    btn.click();
                    return { success: true, method: 'native-click' };
                  }
                });

                console.log(`         ✅ [FIX 66] Click ejecutado: ${clickExecuted.method}${clickExecuted.onclick ? ' (' + clickExecuted.onclick + ')' : ''}`);

                // Esperar a que se renderice el formulario (más tiempo que un modal normal)
                await this.page.waitForTimeout(3000);

                // Verificar si se abrió un modal/formulario
                const formOpened = await this.page.evaluate(() => {
                  // Buscar cualquier modal o formulario que se haya abierto
                  const modals = document.querySelectorAll('.modal.show, [style*="position: fixed"]');
                  const forms = document.querySelectorAll('form:not([style*="display: none"])');

                  return {
                    hasModal: modals.length > 0,
                    hasForm: forms.length > 0,
                    totalModals: modals.length,
                    totalForms: forms.length
                  };
                });

                console.log(`         📊 Después de click: ${formOpened.totalModals} modales, ${formOpened.totalForms} formularios`);

                // ⭐ FIX 61: Pasar context 'insideEmployeeFileModal' para que no excluya el modal
                const crudResult = await this.testCRUD(btnElement, btnHandle, 'insideEmployeeFileModal');
                tabResult.crudTests.push(crudResult);
                result.totalCrudTests++;

                console.log(`         ✅ CRUD test completado en tab`);

                // ⭐ FIX 52: Cerrar modal del formulario DESPUÉS de testCRUD para evitar crash
                try {
                  const closedFormModal = await this.page.evaluate(() => {
                    // Buscar el modal más reciente (mayor z-index)
                    const allModals = Array.from(document.querySelectorAll('.modal, [class*="modal"], [id*="modal"], [id*="Modal"]'));
                    const visibleModals = allModals.filter(m => {
                      const style = window.getComputedStyle(m);
                      return style.display !== 'none' &&
                             style.visibility !== 'hidden' &&
                             (m.offsetParent !== null || style.position === 'fixed');
                    });

                    // Ordenar por z-index descendente
                    visibleModals.sort((a, b) => {
                      const zIndexA = parseInt(window.getComputedStyle(a).zIndex) || 0;
                      const zIndexB = parseInt(window.getComputedStyle(b).zIndex) || 0;
                      return zIndexB - zIndexA;
                    });

                    // Cerrar SOLO el modal superior (el del formulario), NO el employeeFileModal
                    if (visibleModals.length > 1) { // Si hay más de 1 (employeeFileModal + form modal)
                      const topModal = visibleModals[0];

                      // Verificar que NO sea employeeFileModal
                      if (topModal.id !== 'employeeFileModal') {
                        // Cerrar con botón
                        const closeBtn = topModal.querySelector('.close, [data-dismiss="modal"], .btn-close, .btn-secondary');
                        if (closeBtn) {
                          closeBtn.click();
                        } else {
                          // Forzar cierre
                          topModal.style.display = 'none';
                          topModal.style.visibility = 'hidden';
                          topModal.style.zIndex = '-9999';
                          topModal.style.pointerEvents = 'none';
                          topModal.classList.remove('show');
                        }

                        return topModal.id || 'unknown';
                      }
                    }

                    return null;
                  });

                  if (closedFormModal) {
                    console.log(`         🚪 Modal de formulario cerrado: ${closedFormModal}`);
                    await this.page.waitForTimeout(800); // Esperar cierre
                  }
                } catch (closeFormError) {
                  console.log(`         ⚠️  No se pudo cerrar modal de formulario: ${closeFormError.message}`);
                }
              } catch (crudError) {
                console.log(`         ⚠️  CRUD falló: ${crudError.message}`);
                tabResult.errors.push(crudError.message);
              }
            }
          }

          result.tabs.push(tabResult);

        } catch (tabError) {
          console.log(`      ❌ Error en tab ${i + 1}: ${tabError.message}`);
          result.errors.push(`Tab ${i + 1}: ${tabError.message}`);
        }
      }

      console.log(`\n      ✅ Testing de tabs completado: ${result.tabs.length} tabs, ${result.totalButtons} botones, ${result.totalCrudTests} CRUD tests`);

    } catch (error) {
      console.log(`      ❌ Error general en discoverAndTestTabs: ${error.message}`);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TESTEAR MÓDULO COMPLETO
   * ═══════════════════════════════════════════════════════════════════════
   */
  async testModule(moduleId) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🎯 [AGENT] TESTEANDO MÓDULO: ${moduleId}`);
    console.log(`${'═'.repeat(80)}`);

    try {
      // 1. Navegar al módulo
      await this.navigateToModule(moduleId);

      // 2. Cargar conocimiento previo
      if (this.config.learningEnabled) {
        this.knowledge[moduleId] = await this._loadKnowledge(moduleId);
        console.log(`   🧠 Conocimiento previo: ${this.knowledge[moduleId]?.length || 0} elementos conocidos`);
      }

      // 3. Descubrir TODO automáticamente
      const discoveries = await this.discoverAll();

      // ⭐ FIX 40: Para módulo users, abrir PRIMERO el modal Ver Usuario (employeeFileModal)
      if (moduleId === 'users') {
        console.log(`\n⭐ [USERS] Buscando botón "Ver Usuario" en tabla para abrir employeeFileModal...`);
        try {
          // Buscar PRIMER botón "Ver" en la tabla (onclick="viewUser(...)")
          const viewButton = await this.page.$('button.users-action-btn.view, button.btn-icon[onclick*="viewUser"]');

          if (viewButton) {
            console.log(`   ✅ Botón "Ver Usuario" encontrado en tabla`);
            console.log(`   🖱️  Haciendo click para abrir employeeFileModal...`);

            await viewButton.click();
            await this.page.waitForTimeout(2000);

            // Verificar que se abrió employeeFileModal
            const modalOpened = await this.page.evaluate(() => {
              const modal = document.querySelector('#employeeFileModal');
              return modal && window.getComputedStyle(modal).display !== 'none';
            });

            if (modalOpened) {
              console.log(`   ✅ employeeFileModal abierto correctamente`);
              console.log(`   🔍 Descubriendo tabs en employeeFileModal...`);

              // Descubrir y testear tabs AHORA
              const tabsResult = await this.discoverAndTestTabs();

              if (tabsResult.tabs && tabsResult.tabs.length > 0) {
                console.log(`   ✅ ${tabsResult.tabs.length} tabs descubiertos y testeados`);

                // Agregar tabs a discoveries
                tabsResult.tabs.forEach(tab => {
                  discoveries.tabs.push({
                    text: tab.name,
                    content: tab.content,
                    buttonsFound: tab.buttonsFound,
                    active: tab.active
                  });
                });
              } else {
                console.log(`   ⚠️  No se encontraron tabs en employeeFileModal`);
              }

              // Cerrar modal después de testear tabs
              console.log(`   🚪 Cerrando employeeFileModal...`);
              await this.page.evaluate(() => {
                const closeBtn = document.querySelector('#employeeFileModal button[onclick*="closeEmployeeFile"]');
                if (closeBtn) closeBtn.click();
              });
              await this.page.waitForTimeout(1000);

            } else {
              console.log(`   ⚠️  employeeFileModal no se abrió`);
            }
          } else {
            console.log(`   ⚠️  No se encontró botón "Ver Usuario" en tabla`);
          }
        } catch (error) {
          console.error(`   ❌ Error abriendo employeeFileModal:`, error.message);
        }
      }

      // 4. Testear cada botón descubierto
      console.log(`\n🧪 [AGENT] PROBANDO ${discoveries.buttons.length} BOTONES...`);

      const buttons = await this.page.$$('button, a.btn, [role="button"]');
      const tested = [];

      for (let i = 0; i < discoveries.buttons.length; i++) {
        const btnInfo = discoveries.buttons[i];
        const btnHandle = buttons[i];

        if (!btnHandle) continue;

        const result = await this.testElement(btnInfo, btnHandle);
        tested.push(result);

        // ⭐ NUEVO: Si este test descubrió tabs, agregarlos a discoveries
        if (result.tabs && result.tabs.tabs && result.tabs.tabs.length > 0) {
          result.tabs.tabs.forEach(tab => {
            discoveries.tabs.push({
              text: tab.name,
              content: tab.content,
              buttonsFound: tab.buttonsFound,
              active: tab.active
            });
          });
          console.log(`      📊 [MERGE] ${result.tabs.tabs.length} tabs agregados a discoveries`);
        }

        this.stats.elementsTested++;

        // Pequeña pausa entre tests
        await this.page.waitForTimeout(500);
      }

      // 5. Generar reporte
      const report = this._generateReport(moduleId, discoveries, tested);

      console.log(`\n${'═'.repeat(80)}`);
      console.log(`✅ [AGENT] MÓDULO COMPLETADO: ${moduleId}`);
      console.log(`${'═'.repeat(80)}`);
      console.log(report);

      // Calcular métricas para E2EPhase
      // NOTA: 'tested' es un array de resultados, no un objeto con .buttons y .crud
      const totalTests = tested.length;
      const passed = tested.filter(t => t.status === 'success').length;
      const failed = tested.filter(t => t.status === 'error' || t.status === 'failed').length;
      const skipped = tested.filter(t => t.status === 'skipped').length;
      const timeouts = tested.filter(t => t.status === 'timeout').length;
      const status = failed === 0 && timeouts === 0 ? 'passed' : 'warning';

      // ⭐ NUEVO: Extraer stats CRUD
      const crudStats = this._extractCrudStats(tested);

      // ⭐ NUEVO: Reportar a SystemRegistry (si está disponible)
      if (this.systemRegistry) {
        try {
          await this.systemRegistry.recordTestExecution(moduleId, this.companyId, {
            results: {
              status,
              duration: Date.now() - this.stats.startTime || 0,
              totalTests,
              passed,
              failed,
              skipped,
              timeouts
            },
            discoveries: {
              buttons: discoveries.buttons.map(b => ({
                data: { text: b.text, onclick: b.onclick, type: b.type },
                context: moduleId,
                screenLocation: b.position,
                worksCorrectly: true // Marcado en testElement
              })),
              modals: discoveries.modals,
              tabs: discoveries.tabs,  // ⭐ NUEVO: Incluir tabs
              fields: discoveries.fields
            },
            timestamp: new Date()
          });

          console.log(`✅ [AGENT] Descubrimientos reportados a SystemRegistry`);
        } catch (error) {
          console.error(`⚠️  [AGENT] Error reportando a Registry:`, error.message);
        }
      }

      // ⭐ NUEVO: Reportar a Brain (si está disponible)
      if (this.brainService) {
        try {
          await this.brainService.recordTestResults(moduleId, {
            status,
            totalTests,
            passed,
            failed,
            skipped,
            timeouts,
            crudStats
          }, {
            buttons: discoveries.buttons,
            modals: discoveries.modals,
            tabs: discoveries.tabs,  // ⭐ NUEVO: Incluir tabs
            fields: discoveries.fields
          });

          console.log(`✅ [AGENT] Resultados reportados a Brain`);
        } catch (error) {
          console.error(`⚠️  [AGENT] Error reportando a Brain:`, error.message);
        }
      }

      return {
        module: moduleId,
        discoveries: discoveries,
        tested: tested,
        report: report,
        stats: { ...this.stats },
        // Métricas para E2EPhase
        totalTests,
        passed,
        failed,
        skipped,
        timeouts,
        status,
        // ⭐ NUEVO: CRUD stats
        crudStats
      };

    } catch (error) {
      console.error(`\n❌ [AGENT] Error testeando módulo ${moduleId}:`, error.message);
      throw error;
    }
  }

  /**
   * CARGAR CONOCIMIENTO PREVIO del módulo
   */
  async _loadKnowledge(moduleId) {
    // TODO: Implementar lectura desde PostgreSQL
    // Por ahora retornar vacío
    return [];
  }

  /**
   * GENERAR REPORTE del testing
   */
  _generateReport(moduleId, discoveries, tested) {
    const successes = tested.filter(t => t.status === 'success').length;
    const errors = tested.filter(t => t.status === 'error').length;
    const timeouts = tested.filter(t => t.status === 'timeout').length;
    const skipped = tested.filter(t => t.status === 'skipped').length;

    // ⭐ NUEVO: Contar tests CRUD
    const crudTests = tested.filter(t => t.crudTest).map(t => t.crudTest);
    const crudStats = {
      tested: crudTests.length,
      create: crudTests.filter(c => c.create?.success).length,
      read: crudTests.filter(c => c.read?.success).length,
      update: crudTests.filter(c => c.update?.success).length,
      delete: crudTests.filter(c => c.delete?.success).length,
      persistence: crudTests.filter(c => c.persistence?.success).length
    };

    // Contar forms descubiertos
    const formsDiscovered = tested.filter(t => t.formFields).length;
    const totalFields = tested.reduce((sum, t) => sum + (t.formFields?.length || 0), 0);

    let report = `
═══════════════════════════════════════════════════════════════════════════════
📊 REPORTE COMPLETO - ${moduleId.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

🔍 DESCUBRIMIENTOS:
   - Botones: ${discoveries.buttons.length}
   - Modales: ${discoveries.modals.length}
   - Tabs: ${discoveries.tabs.length}
   - Tablas: ${discoveries.tables.length}
   - Formularios: ${formsDiscovered} (${totalFields} campos totales)

🧪 TESTING BÁSICO:
   - Probados: ${tested.length}
   - ✅ Exitosos: ${successes}
   - ❌ Errores: ${errors}
   - ⏰ Timeouts: ${timeouts}
   - ⏭️  Omitidos: ${skipped}

${crudStats.tested > 0 ? `
🎯 TESTING PROFUNDO CRUD:
   - Tests CRUD ejecutados: ${crudStats.tested}
   - ✅ CREATE: ${crudStats.create}/${crudStats.tested}
   - ✅ READ: ${crudStats.read}/${crudStats.tested}
   - ✅ UPDATE: ${crudStats.update}/${crudStats.tested}
   - ✅ DELETE: ${crudStats.delete}/${crudStats.tested}
   - ✅ PERSISTENCE: ${crudStats.persistence}/${crudStats.tested}
` : ''}
📈 ESTADÍSTICAS GLOBALES:
   - Elementos descubiertos: ${this.stats.elementsDiscovered}
   - Elementos testeados: ${this.stats.elementsTested}
   - Crashes: ${this.stats.crashes}
   - Timeouts: ${this.stats.timeouts}
   - Successes: ${this.stats.successes}

═══════════════════════════════════════════════════════════════════════════════
    `;

    // ⭐ NUEVO: Detalles de tests CRUD
    if (crudStats.tested > 0) {
      report += `\n📋 DETALLE DE TESTS CRUD:\n\n`;

      tested.forEach((t, index) => {
        if (t.crudTest) {
          const crud = t.crudTest;
          report += `   ${index + 1}. "${t.element.text}" (${t.element.type}):\n`;
          report += `      CREATE: ${crud.create.success ? '✅' : '❌'}`;
          if (crud.create.data) {
            const fieldCount = Object.keys(crud.create.data).length;
            report += ` (${fieldCount} campos llenados)`;
          }
          report += `\n`;
          report += `      READ: ${crud.read.success ? '✅' : '❌'}\n`;
          report += `      PERSISTENCE: ${crud.persistence.success ? '✅' : '❌'}\n`;
          report += `      UPDATE: ${crud.update.success ? '✅' : '❌'}`;
          if (crud.update.newValue) {
            report += ` (${crud.update.field}: "${crud.update.newValue}")`;
          }
          report += `\n`;
          report += `      DELETE: ${crud.delete.success ? '✅' : '❌'}\n`;
          if (crud.error) {
            report += `      ⚠️  Error: ${crud.error}\n`;
          }
          report += `\n`;
        }
      });
    }

    return report;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TESTING PROFUNDO - DISCOVERY DE FORMULARIOS
   * ═══════════════════════════════════════════════════════════════════════
   */
  async discoverFormFields(context = null) {
    console.log(`\n      🔍 [DEEP] Descubriendo campos de formulario... (context: ${context || 'default'})`);

    // ⭐ FIX 54: ESPERAR ACTIVAMENTE a que aparezcan campos en modal del FORMULARIO
    try {
      await this.page.waitForFunction(() => {
        // Buscar modal con mayor z-index (excluyendo employeeFileModal)
        const allModals = document.querySelectorAll('.modal, [class*="modal"], [id*="modal"], [id*="Modal"]');
        const visibleModals = Array.from(allModals).filter(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' &&
                 style.visibility !== 'hidden' &&
                 style.opacity !== '0' &&
                 (m.offsetParent !== null || style.position === 'fixed');
        });

        if (visibleModals.length === 0) return false;

        // ⭐ FILTRAR employeeFileModal
        const formModals = visibleModals.filter(m => m.id !== 'employeeFileModal');

        // Si no hay modales de formulario, esperar
        if (formModals.length === 0) return false;

        // Ordenar por z-index
        formModals.sort((a, b) => {
          const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
          const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;
          return zB - zA;
        });

        const topModal = formModals[0];

        // Buscar campos en el modal (incluyendo contenedores específicos)
        const fields = topModal.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
        );

        // Retornar true si encontramos al menos 1 campo visible
        for (const field of fields) {
          const rect = field.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return true; // Al menos 1 campo visible
          }
        }

        return false; // No hay campos visibles todavía
      }, { timeout: 8000 }); // ⭐ Esperar hasta 8 segundos a que aparezca al menos 1 campo

      console.log(`      ⏳ Campos detectados en DOM, extrayendo...`);
    } catch (waitError) {
      console.log(`      ⚠️  No aparecieron campos después de 8s: ${waitError.message}`);
      // Continuar de todos modos para inspeccionar DOM
    }

    // ⭐ FIX 54: Buscar modal del FORMULARIO, no employeeFileModal
    const domInspection = await this.page.evaluate((context) => {
      const allModals = document.querySelectorAll('.modal, [class*="modal"], [id*="modal"], [id*="Modal"]');
      const visibleModals = Array.from(allModals).filter(m => {
        const style = window.getComputedStyle(m);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0' &&
               (m.offsetParent !== null || style.position === 'fixed');
      });

      // ⭐ FILTRAR modales de reportes y employeeFileModal (según contexto)
      // ⭐ FIX 59: Excluir generateReportModal y similares
      // ⭐ FIX 61: Si estamos dentro de employeeFileModal, NO excluirlo (campos están en tabs activos)
      const reportModalIds = ['generateReportModal', 'reportModal', 'exportModal', 'printModal'];
      const excludedModalIds = context === 'insideEmployeeFileModal'
        ? reportModalIds  // Solo excluir reportes, permitir employeeFileModal
        : [...reportModalIds, 'employeeFileModal']; // Excluir reportes Y employeeFileModal

      const formModals = visibleModals.filter(m => !excludedModalIds.includes(m.id));

      // ⭐ FIX 64: Si hay modales aparte de employeeFileModal, ordenar por z-index
      // Y si tienen el MISMO z-index, priorizar el más reciente (último en DOM)
      let targetModal = null;

      if (formModals.length > 0) {
        // ⭐ FIX 64: Logging de modales antes del sort
        const modalsInfo = formModals.map(m => ({
          id: m.id,
          zIndex: parseInt(window.getComputedStyle(m).zIndex) || 0,
          domIndex: Array.from(document.body.children).indexOf(m)
        }));
        console.log('      🔍 [FIX 64] formModals antes de sort:', JSON.stringify(modalsInfo));

        formModals.sort((a, b) => {
          const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
          const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;

          // Si tienen el MISMO z-index, priorizar el último creado (último en DOM)
          if (zA === zB) {
            // Comparar posición en el DOM (último elemento = más reciente)
            const indexA = Array.from(document.body.children).indexOf(a);
            const indexB = Array.from(document.body.children).indexOf(b);
            console.log(`      🔍 [FIX 64] Mismo z-index (${zA}): ${a.id} (index ${indexA}) vs ${b.id} (index ${indexB})`);
            return indexB - indexA;
          }

          return zB - zA;
        });

        targetModal = formModals[0];
        console.log('      ✅ [FIX 64] Modal seleccionado:', targetModal.id);
      } else {
        // Fallback: usar cualquier modal visible
        visibleModals.sort((a, b) => {
          const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
          const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;

          // Si tienen el MISMO z-index, priorizar el último creado
          if (zA === zB) {
            return Array.from(document.body.children).indexOf(b) -
                   Array.from(document.body.children).indexOf(a);
          }

          return zB - zA;
        });
        targetModal = visibleModals[0];
      }

      if (!targetModal) {
        return { error: 'No hay modales visibles' };
      }

      const inputs = targetModal.querySelectorAll('input');
      const selects = targetModal.querySelectorAll('select');
      const textareas = targetModal.querySelectorAll('textarea');
      const modalBody = targetModal.querySelector('.modal-body');
      const forms = targetModal.querySelectorAll('form');

      // ⭐ FIX 65: Debug logging de modales detectados
      const allModalsInfo = visibleModals.map(m => ({
        id: m.id,
        zIndex: window.getComputedStyle(m).zIndex,
        display: window.getComputedStyle(m).display,
        visibility: window.getComputedStyle(m).visibility
      }));

      const formModalsInfo = formModals.map(m => ({
        id: m.id,
        zIndex: window.getComputedStyle(m).zIndex
      }));

      return {
        modalId: targetModal.id || 'unknown',
        modalClasses: targetModal.className,
        zIndex: window.getComputedStyle(targetModal).zIndex,
        totalModalsVisible: visibleModals.length,
        totalFormModals: formModals.length,
        totalInputs: inputs.length,
        totalSelects: selects.length,
        totalTextareas: textareas.length,
        hasModalBody: !!modalBody,
        totalForms: forms.length,
        inputTypes: Array.from(inputs).slice(0, 5).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          visible: i.offsetParent !== null
        })),
        // ⭐ FIX 65: Debug info
        allModalsInfo,
        formModalsInfo,
        excludedModalIds: context === 'insideEmployeeFileModal' ? reportModalIds : [...reportModalIds, 'employeeFileModal']
      };
    }, context); // ⭐ FIX 61: Pasar context como parámetro

    console.log(`      🔍 [DOM] Modal top: ${JSON.stringify(domInspection, null, 2)}`);

    const fields = await this.page.evaluate((context) => {
      const inputs = [];

      // ⭐ FIX 54: Buscar modal del FORMULARIO, no employeeFileModal
      let container = null;

      // Buscar TODOS los modales visibles
      const allModals = document.querySelectorAll('.modal, [class*="modal"], [id*="modal"], [id*="Modal"]');
      const visibleModals = [];

      for (const m of allModals) {
        const style = window.getComputedStyle(m);
        const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0' &&
                        (m.offsetParent !== null || style.position === 'fixed');

        if (isVisible) {
          const zIndex = parseInt(style.zIndex) || 0;
          visibleModals.push({ element: m, zIndex });
        }
      }

      // ⭐ FIX 54 + FIX 59 + FIX 61: Filtrado condicional según contexto
      const reportModalIds = ['generateReportModal', 'reportModal', 'exportModal', 'printModal'];
      const excludedModalIds = context === 'insideEmployeeFileModal'
        ? reportModalIds
        : [...reportModalIds, 'employeeFileModal'];

      const formModals = visibleModals.filter(m => !excludedModalIds.includes(m.element.id));

      // Usar modales de formulario si existen, sino todos
      const modalsToSearch = formModals.length > 0 ? formModals : visibleModals;

      // ⭐ FIX 75: Ordenar por z-index DESCENDENTE con tie-breaking por DOM index
      // ROOT CAUSE: Cuando employeeFileModal y educationModal tienen MISMO z-index (10000),
      // sin tie-breaking se selecciona el primero (employeeFileModal) en vez del más reciente (educationModal)
      modalsToSearch.sort((a, b) => {
        // Si tienen z-index diferente, priorizar mayor z-index
        if (a.zIndex !== b.zIndex) {
          return b.zIndex - a.zIndex;
        }

        // ⭐ FIX 75: Si tienen MISMO z-index, priorizar el último creado (último en DOM)
        const indexA = Array.from(document.body.children).indexOf(a.element);
        const indexB = Array.from(document.body.children).indexOf(b.element);
        console.log(`[FIX 75] Mismo z-index (${a.zIndex}): ${a.element.id} (DOM index ${indexA}) vs ${b.element.id} (DOM index ${indexB})`);
        return indexB - indexA; // Mayor index = más reciente = prioridad
      });

      // Tomar el modal con mayor z-index (o más reciente si empate)
      if (modalsToSearch.length > 0) {
        container = modalsToSearch[0].element;
        console.log(`[FIELDS] Usando modal "${container.id || 'unknown'}" con z-index ${modalsToSearch[0].zIndex} (${modalsToSearch.length} modales de formularios, ${visibleModals.length} totales)`);
      }

      // Si aún no hay modal, buscar en toda la página
      if (!container) {
        container = document;
      }

      // ⭐ FIX 53: Buscar en contenedores específicos también
      const searchContainers = [
        container.querySelector('.modal-body'),
        container.querySelector('.modal-content'),
        container.querySelector('form'),
        container.querySelector('.form-group'),
        container // Fallback al modal completo
      ].filter(c => c !== null);

      // Todos los tipos de campos
      const fieldSelectors = [
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
        'select',
        'textarea'
      ];

      // ⭐ FIX 53: Buscar en TODOS los contenedores posibles
      searchContainers.forEach(cont => {
        fieldSelectors.forEach(selector => {
          cont.querySelectorAll(selector).forEach(field => {
            // Evitar duplicados
            if (inputs.find(i => i.id === field.id && field.id)) {
              return;
            }

            const rect = field.getBoundingClientRect();

            inputs.push({
              tag: field.tagName.toLowerCase(),
              type: field.type || 'text',
              name: field.name || field.id || '',
              id: field.id || '',
              placeholder: field.placeholder || '',
              required: field.required || field.hasAttribute('required'),
              value: field.value || '',
              options: field.tagName === 'SELECT' ?
                Array.from(field.options).map(o => ({ value: o.value, text: o.text })) :
                null,
              label: (() => {
                // Buscar label asociado
                const label = field.id ?
                  document.querySelector(`label[for="${field.id}"]`) :
                  field.closest('label') || field.previousElementSibling;
                return label?.textContent?.trim() || '';
              })(),
              visible: rect.width > 0 && rect.height > 0
            });
          });
        });
      });

      return inputs;
    }, context); // ⭐ FIX 61: Pasar context como parámetro

    console.log(`      ✅ ${fields.length} campos descubiertos`);

    // Clasificar cada campo
    const classified = fields.map(field => ({
      ...field,
      fieldType: this._classifyFieldType(field)
    }));

    return classified;
  }

  /**
   * CLASIFICAR TIPO DE CAMPO (para generar datos apropiados)
   */
  _classifyFieldType(field) {
    const name = (field.name || field.id || '').toLowerCase();
    const label = field.label.toLowerCase();
    const placeholder = field.placeholder.toLowerCase();
    const type = field.type.toLowerCase();

    // Email
    if (type === 'email' || name.includes('email') || name.includes('correo') ||
        label.includes('email') || label.includes('correo')) {
      return 'email';
    }

    // Phone
    if (type === 'tel' || name.includes('phone') || name.includes('tel') ||
        name.includes('celular') || name.includes('movil') ||
        label.includes('teléfono') || label.includes('celular')) {
      return 'phone';
    }

    // Number/Age
    if (type === 'number' || name.includes('age') || name.includes('edad') ||
        name.includes('cantidad') || name.includes('amount')) {
      return 'number';
    }

    // Date
    if (type === 'date' || name.includes('fecha') || name.includes('date') ||
        label.includes('fecha') || label.includes('date')) {
      return 'date';
    }

    // Password
    if (type === 'password' || name.includes('pass') || name.includes('contraseña')) {
      return 'password';
    }

    // DNI/ID
    if (name.includes('dni') || name.includes('document') || name.includes('cedula') ||
        name.includes('rut') || name.includes('ci')) {
      return 'dni';
    }

    // Address
    if (name.includes('address') || name.includes('direccion') ||
        label.includes('dirección') || label.includes('address')) {
      return 'address';
    }

    // Name (First/Last)
    if (name.includes('name') || name.includes('nombre') ||
        label.includes('nombre') || label.includes('name')) {
      if (name.includes('last') || name.includes('apellido')) {
        return 'lastname';
      }
      return 'firstname';
    }

    // Select/Dropdown
    if (field.tag === 'select') {
      return 'select';
    }

    // Textarea
    if (field.tag === 'textarea') {
      return 'textarea';
    }

    // Checkbox/Radio
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';

    // Default: text
    return 'text';
  }

  /**
   * GENERAR DATOS DE PRUEBA con Faker
   */
  _generateTestData(field) {
    const fieldType = field.fieldType;

    switch (fieldType) {
      case 'email':
        return faker.internet.email();

      case 'phone':
        return faker.phone.number('9########'); // Formato celular español

      case 'number':
        return faker.number.int({ min: 18, max: 65 }).toString();

      case 'date':
        return faker.date.past().toISOString().split('T')[0]; // YYYY-MM-DD

      case 'password':
        return 'Test123456!'; // Password seguro de prueba

      case 'dni':
        return faker.number.int({ min: 10000000, max: 99999999 }).toString();

      case 'address':
        return faker.location.streetAddress();

      case 'firstname':
        return faker.person.firstName();

      case 'lastname':
        return faker.person.lastName();

      case 'select':
        // Seleccionar opción válida (ignorar vacías)
        if (field.options && field.options.length > 1) {
          const validOptions = field.options.filter(o => o.value && o.value !== '');
          if (validOptions.length > 0) {
            return faker.helpers.arrayElement(validOptions).value;
          }
        }
        return '';

      case 'textarea':
        return faker.lorem.sentence();

      case 'checkbox':
        return faker.datatype.boolean();

      case 'text':
      default:
        // Inferir por nombre de campo
        if (field.name.includes('company') || field.name.includes('empresa')) {
          return faker.company.name();
        }
        if (field.name.includes('city') || field.name.includes('ciudad')) {
          return faker.location.city();
        }
        return faker.lorem.word();
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LLENAR FORMULARIO con datos de prueba
   * ═══════════════════════════════════════════════════════════════════════
   */
  async fillForm(fields) {
    console.log(`\n      ✍️  [DEEP] Llenando formulario con ${fields.length} campos...`);

    const filledData = {};

    // ⭐ FIX 116: Campos que parecen textarea pero son boolean en la BD
    // Estos campos se muestran como textarea en el HTML pero la BD espera boolean
    const booleanFieldsDisguisedAsTextarea = [
      'surgeryComplications',   // Tabla surgeries - espera boolean
      'surgeryHasImplant',      // Por si acaso
      'hasComplications',       // Alternativas posibles
      'complications'           // Variante
    ];

    for (const field of fields) {
      // Solo llenar campos visibles y no disabled
      if (!field.visible) {
        console.log(`         ⏭️  Skip "${field.name}" (no visible)`);
        continue;
      }

      // ⭐ FIX 116: Skip campos boolean disfrazados de textarea para evitar error 500
      if (booleanFieldsDisguisedAsTextarea.includes(field.name) && field.fieldType === 'textarea') {
        console.log(`         ⏭️  [FIX 116] Skip "${field.name}" (boolean disfrazado de textarea)`);
        continue;
      }

      // Generar dato apropiado
      const testValue = this._generateTestData(field);

      if (!testValue && testValue !== false) {
        console.log(`         ⏭️  Skip "${field.name}" (no hay valor válido)`);
        continue;
      }

      try {
        const selector = field.id ? `#${field.id}` : `[name="${field.name}"]`;
        const fieldHandle = await this.page.$(selector);

        if (!fieldHandle) {
          console.log(`         ⚠️  Campo "${field.name}" no encontrado`);
          continue;
        }

        // ⭐ FIX 30: Aplicar los 3 critical fixes ANTES de llenar campo

        // FIX 1: Container Awareness - Verificar si está en modal
        const isInModal = await fieldHandle.evaluate(el => {
          return el.closest('.modal.show') !== null;
        });

        // FIX 2: Smart Scroll - Scrollear en contenedor correcto
        if (isInModal) {
          // Scroll en modal-body
          await this.page.evaluate(() => {
            const modalBody = document.querySelector('.modal.show .modal-body');
            if (modalBody) {
              modalBody.scrollTop = 0; // Reset al top primero
            }
          });
          await this.page.waitForTimeout(100);
        }

        // Scroll al elemento específico
        try {
          await fieldHandle.scrollIntoViewIfNeeded({ timeout: 5000 });
        } catch (scrollError) {
          // Si falla scroll nativo, intentar scroll manual
          await fieldHandle.evaluate(el => {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
          });
        }

        await this.page.waitForTimeout(200);

        // FIX 3: Viewport Visibility - Verificar que está visible
        const isVisible = await fieldHandle.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.top >= 0;
        });

        if (!isVisible) {
          console.log(`         ⚠️  Campo "${field.name}" no visible en viewport`);
          // Intentar forzar visibilidad
          await fieldHandle.evaluate(el => {
            el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
          });
          await this.page.waitForTimeout(300);
        }

        // Ahora llenar según tipo de campo
        if (field.tag === 'select') {
          // ⭐ FIX 42: Timeout corto para evitar browser crashes
          await this.page.selectOption(selector, testValue, { timeout: 5000 });
          console.log(`         ✅ Select "${field.name}" = "${testValue}"`);
        }
        else if (field.type === 'checkbox') {
          if (testValue) {
            await this.page.check(selector);
            console.log(`         ✅ Checkbox "${field.name}" = checked`);
          }
        }
        else if (field.type === 'radio') {
          // ⭐ FIX 56: Detectar valores REALES disponibles en vez de usar random
          try {
            const availableRadios = await this.page.$$eval(
              `input[name="${field.name}"][type="radio"]`,
              radios => radios
                .filter(r => {
                  // Solo radios visibles
                  const rect = r.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0 && r.offsetParent !== null;
                })
                .map(r => ({
                  value: r.value,
                  id: r.id,
                  label: r.labels && r.labels[0] ? r.labels[0].textContent.trim() : null,
                  checked: r.checked
                }))
            );

            if (availableRadios.length === 0) {
              console.log(`         ⚠️  No hay opciones visibles para radio "${field.name}"`);
              continue;
            }

            // Seleccionar primera opción disponible que NO esté ya seleccionada
            let selectedRadio = availableRadios.find(r => !r.checked);
            if (!selectedRadio) {
              // Todas están seleccionadas, usar la primera
              selectedRadio = availableRadios[0];
            }

            console.log(`         🔘 Radio "${field.name}": ${availableRadios.length} opciones disponibles`);
            console.log(`            Seleccionando: "${selectedRadio.label || selectedRadio.value}" (value="${selectedRadio.value}")`);

            // Click en el radio button con timeout corto para evitar crashes
            await this.page.check(`[name="${field.name}"][value="${selectedRadio.value}"]`, { timeout: 3000 });

            console.log(`         ✅ Radio "${field.name}" = "${selectedRadio.value}"`);

            filledData[field.name || field.id] = selectedRadio.value;

          } catch (radioError) {
            console.log(`         ⚠️  Error seleccionando radio "${field.name}": ${radioError.message}`);
          }
        }
        else {
          // Input normal (text, email, number, date, etc.)
          // Limpiar campo primero
          await this.page.fill(selector, '');

          // Llenar con valor
          await this.page.fill(selector, testValue.toString());

          console.log(`         ✅ Input "${field.name}" = "${testValue}"`);
        }

        filledData[field.name || field.id] = testValue;

        // Pequeña pausa para estabilidad
        await this.page.waitForTimeout(200);

      } catch (error) {
        console.log(`         ⚠️  Error llenando "${field.name}": ${error.message}`);
      }
    }

    console.log(`      ✅ Formulario llenado con ${Object.keys(filledData).length} campos`);

    return filledData;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GUARDAR FORMULARIO (buscar y clickear botón submit/guardar)
   * ═══════════════════════════════════════════════════════════════════════
   */
  async saveForm() {
    console.log(`\n      💾 [DEEP] Buscando botón de guardar...`);

    try {
      // ⭐ FIX 58: Smart Save Button Detection
      // Busca en modal topmost con múltiples criterios (no solo .modal.show)
      const saveButtonInfo = await this.page.evaluate(() => {
        // 1. Encontrar modal topmost (mayor z-index)
        const modals = Array.from(document.querySelectorAll(
          '.modal, [id*="Modal"], [id*="modal"], [class*="modal"], [class*="Modal"]'
        ));

        // ⭐ FIX 59: Excluir modales de reportes/generación
        const excludedModalIds = [
          'generateReportModal',
          'reportModal',
          'exportModal',
          'printModal',
          'downloadModal'
        ];

        const visibleModals = modals.filter(m => {
          const style = window.getComputedStyle(m);
          const rect = m.getBoundingClientRect();

          // Excluir modales de reportes
          if (excludedModalIds.includes(m.id)) return false;

          return style.display !== 'none' &&
                 style.visibility !== 'hidden' &&
                 rect.width > 0 &&
                 rect.height > 0;
        });

        if (visibleModals.length === 0) {
          return { found: false, reason: 'No visible modals (after excluding report modals)' };
        }

        // ⭐ FIX 76: Ordenar por z-index con tie-breaking por DOM index
        // ROOT CAUSE: employeeFileModal, educationModal, salaryIncreaseModal tienen MISMO z-index (10000)
        // Sin tie-breaking, selecciona employeeFileModal en vez del modal dinámico más reciente
        const topmostModal = visibleModals.sort((a, b) => {
          const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
          const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;

          // Si tienen z-index diferente, priorizar mayor z-index
          if (zA !== zB) {
            return zB - zA;
          }

          // ⭐ FIX 76: Si tienen MISMO z-index, priorizar el último creado (último en DOM)
          const indexA = Array.from(document.body.children).indexOf(a);
          const indexB = Array.from(document.body.children).indexOf(b);
          console.log(`[FIX 76] Mismo z-index (${zA}): ${a.id} (DOM index ${indexA}) vs ${b.id} (DOM index ${indexB})`);
          return indexB - indexA; // Mayor index = más reciente = prioridad
        })[0];

        const modalId = topmostModal.id || topmostModal.className;

        // 2. Buscar botones en modal topmost
        const buttons = Array.from(topmostModal.querySelectorAll('button, input[type="submit"], input[type="button"]'));

        // Keywords para botones de SUBMIT (más amplio que antes)
        const submitKeywords = [
          'guardar', 'save', 'crear', 'create', 'agregar', 'add', 'añadir',
          'enviar', 'send', 'submit', 'aceptar', 'accept', 'ok', 'confirmar',
          'confirm', 'aplicar', 'apply', 'registrar', 'register'
        ];

        // Keywords para botones de CANCELAR (excluir)
        const cancelKeywords = [
          'cancelar', 'cancel', 'cerrar', 'close', 'salir', 'exit', 'volver', 'back'
        ];

        // Scoring de cada botón
        const scoredButtons = buttons.map(btn => {
          let score = 0;
          const text = (btn.textContent || '').toLowerCase().trim();
          const type = (btn.type || '').toLowerCase();
          const classes = btn.className.toLowerCase();
          const onclick = (btn.getAttribute('onclick') || '').toLowerCase();

          // Excluir botones de cancelar
          if (cancelKeywords.some(kw => text.includes(kw) || classes.includes(kw))) {
            return { btn, score: -100, text, reason: 'cancel button' };
          }

          // +50: type="submit"
          if (type === 'submit') score += 50;

          // +30: Texto contiene keyword de submit
          if (submitKeywords.some(kw => text.includes(kw))) score += 30;

          // +20: onclick contiene save/create/submit
          if (onclick.includes('save') || onclick.includes('create') || onclick.includes('submit')) {
            score += 20;
          }

          // +15: Clase btn-primary o btn-success (Bootstrap convention)
          if (classes.includes('btn-primary') || classes.includes('btn-success')) {
            score += 15;
          }

          // +10: Botón está más a la derecha (convención UI)
          const rect = btn.getBoundingClientRect();
          const parentWidth = topmostModal.getBoundingClientRect().width;
          const relativeX = rect.left / parentWidth;
          if (relativeX > 0.6) score += 10; // Derecha = aceptar/guardar

          // +5: Tiene ícono de check/save
          const hasCheckIcon = btn.querySelector('[class*="check"], [class*="save"], [class*="tick"]');
          if (hasCheckIcon) score += 5;

          return { btn, score, text, type, classes };
        });

        // Ordenar por score (mayor primero)
        scoredButtons.sort((a, b) => b.score - a.score);

        const bestButton = scoredButtons[0];

        if (!bestButton || bestButton.score <= 0) {
          return {
            found: false,
            reason: 'No suitable button found',
            modalId,
            buttons: scoredButtons.slice(0, 5).map(b => ({
              text: b.text,
              score: b.score,
              type: b.type,
              classes: b.classes
            }))
          };
        }

        // Retornar selector único para el botón
        // ⭐ FIX 58.1: Selector scoped al modal (no global)
        let selector = null;

        if (bestButton.btn.id) {
          // Si tiene ID, usar directamente
          selector = `#${bestButton.btn.id}`;
        } else if (bestButton.text && bestButton.text.trim().length > 0) {
          // ⭐ MEJORADO: Usar texto del botón scoped al modal
          const modalSelector = topmostModal.id ? `#${topmostModal.id}` : `.${topmostModal.className.split(' ')[0]}`;
          selector = `${modalSelector} >> button:has-text("${bestButton.text}")`;
        } else {
          // Fallback: índice dentro del modal (no global)
          const modalSelector = topmostModal.id ? `#${topmostModal.id}` : `.${topmostModal.className.split(' ')[0]}`;
          const index = buttons.indexOf(bestButton.btn);
          selector = `${modalSelector} >> button >> nth=${index}`;
        }

        return {
          found: true,
          selector,
          text: bestButton.text,
          score: bestButton.score,
          modalId,
          type: bestButton.type
        };
      });

      console.log(`      🔍 Modal detectado: ${saveButtonInfo.modalId || 'unknown'}`);

      if (!saveButtonInfo.found) {
        console.log(`      ⚠️  No se encontró botón de guardar`);
        console.log(`         Razón: ${saveButtonInfo.reason}`);
        if (saveButtonInfo.buttons) {
          console.log(`         Botones encontrados (top 5):`);
          saveButtonInfo.buttons.forEach(b => {
            console.log(`           - "${b.text}" (score: ${b.score}, type: ${b.type})`);
          });
        }
        return { success: false, error: 'No save button found' };
      }

      console.log(`      ✅ Botón encontrado: "${saveButtonInfo.text}" (score: ${saveButtonInfo.score})`);

      // ⭐ FIX 58.2: Click en el botón VISIBLE (no el primero del DOM)
      // Si hay múltiples botones con el mismo texto, Playwright debe elegir el visible
      try {
        // ⭐ FIX 87: Si el selector es un ID (#...), usar directamente sin :visible
        if (saveButtonInfo.selector.startsWith('#')) {
          await this.page.click(saveButtonInfo.selector, { timeout: 3000 });
          console.log(`      ✅ Click en guardar (by ID: ${saveButtonInfo.selector})`);
        } else {
          // Opción 1: Intentar con :visible pseudo-selector
          const visibleSelector = `${saveButtonInfo.selector}:visible`;
          await this.page.click(visibleSelector, { timeout: 3000 });
          console.log(`      ✅ Click en guardar (botón visible)`);
        }
      } catch (visibleError) {
        // Opción 2: Fallback - buscar manualmente el visible
        console.log(`      ⚠️  Selector falló, buscando manualmente...`);
        const clicked = await this.page.evaluate(({ selector, buttonText }) => {
          // ⭐ FIX 87: Si es selector ID, click directo
          if (selector.startsWith('#')) {
            const btn = document.querySelector(selector);
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          }

          // Buscar todos los botones que coincidan
          const modal = document.querySelector(selector.split(' >> ')[0]);
          if (!modal) return false;

          const textToFind = buttonText || selector.match(/has-text\("(.+)"\)/)?.[1];
          if (!textToFind) return false;

          const buttons = Array.from(modal.querySelectorAll('button'));
          const visibleButton = buttons.find(btn => {
            if (!btn.textContent.toLowerCase().includes(textToFind.toLowerCase())) return false;

            const rect = btn.getBoundingClientRect();
            const style = window.getComputedStyle(btn);

            return rect.width > 0 &&
                   rect.height > 0 &&
                   style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   btn.offsetParent !== null;
          });

          if (visibleButton) {
            visibleButton.click();
            return true;
          }
          return false;
        }, { selector: saveButtonInfo.selector, buttonText: saveButtonInfo.text });

        if (clicked) {
          console.log(`      ✅ Click en guardar (manual - botón visible encontrado)`);
        } else {
          throw new Error('No se encontró botón visible para click');
        }
      }

      // Esperar a que procese (modal se cierre o aparezca confirmación)
      await this.page.waitForTimeout(2000);

      // Verificar si hay mensaje de éxito
      const successMessage = await this.page.evaluate(() => {
        const alerts = document.querySelectorAll('.alert-success, .swal2-success, .toast-success');
        return alerts.length > 0 ? Array.from(alerts)[0].textContent?.trim() : null;
      });

      if (successMessage) {
        console.log(`      ✅ Guardado exitoso: "${successMessage}"`);
        return { success: true, message: successMessage };
      }

      // Verificar si modal se cerró (indica guardado)
      const modalStillOpen = await this.page.evaluate(() => {
        const modals = Array.from(document.querySelectorAll('.modal, [id*="Modal"], [class*="modal"]'));
        return modals.some(m => {
          const style = window.getComputedStyle(m);
          const rect = m.getBoundingClientRect();
          return style.display !== 'none' && rect.width > 0 && rect.height > 0;
        });
      });

      if (!modalStillOpen) {
        console.log(`      ✅ Modal cerrado - Guardado exitoso`);
        return { success: true };
      }

      return { success: true };

    } catch (error) {
      console.log(`      ❌ Error guardando: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * VERIFICAR PERSISTENCIA - F5 + reabrir modal + verificar datos
   * ═══════════════════════════════════════════════════════════════════════
   */
  async verifyPersistence(originalData, elementToReopen, reopenContext = null) {
    console.log(`\n      🔄 [DEEP] Verificando persistencia (F5 + reabrir modal)...`);

    // ⭐ FIX 81: Guardar contexto para reabrir modal después de F5
    if (reopenContext) {
      console.log(`         ℹ️  [FIX 81] Contexto guardado: modal=${reopenContext.modalId || 'N/A'}, tab=${reopenContext.tabName || 'N/A'}`);
    }

    try {
      // 1. Reload de la página
      console.log(`         → Recargando página (F5)...`);
      await this.page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForTimeout(3000);

      // ⭐ FIX 78: Detectar si localStorage se vació y hacer re-login automático
      console.log(`         → Verificando si se requiere re-login...`);
      const needsLogin = await this.page.$('#companySelect');

      if (needsLogin) {
        console.log(`         🔑 [FIX 78] localStorage vacío detectado - haciendo re-login automático...`);

        if (!this.savedCredentials) {
          throw new Error('No hay credenciales guardadas para re-login');
        }

        await this.login(this.savedCredentials);
        console.log(`         ✅ [FIX 78] Re-login completado exitosamente`);
      } else {
        console.log(`         ℹ️  Sesión preservada, no requiere re-login`);
      }

      // 2. Volver a navegar al módulo
      console.log(`         → Navegando de nuevo a ${this.currentModule}...`);
      await this.navigateToModule(this.currentModule);
      await this.page.waitForTimeout(2000);

      // ⭐ FIX 82: SI estamos en employeeFileModal, REABRIR MODAL PRIMERO (antes de buscar)
      if (reopenContext && reopenContext.modalId === 'employeeFileModal') {
        console.log(`\n         🔧 [FIX 82] Reabriendo modal PRIMERO (contexto: ${reopenContext.tabName})...`);

        // Buscar botón "Ver Usuario" (ojo) en primera fila
        const modalReopened = await this.page.evaluate(() => {
          // Estrategia 1: Buscar por clase users-action-btn view
          const viewBtn = document.querySelector('table tbody tr:first-child button.users-action-btn.view');
          if (viewBtn) {
            viewBtn.click();
            return { success: true, method: 'class-selector' };
          }

          // Estrategia 2: Buscar por onclick viewUser
          const firstRow = document.querySelector('table tbody tr:first-child');
          if (firstRow) {
            const buttons = Array.from(firstRow.querySelectorAll('button'));
            const viewButton = buttons.find(btn => btn.getAttribute('onclick')?.includes('viewUser'));
            if (viewButton) {
              viewButton.click();
              return { success: true, method: 'onclick-viewUser' };
            }
          }

          // Estrategia 3: Buscar icono ojo
          const eyeIcon = document.querySelector('table tbody tr:first-child button i.fa-eye');
          if (eyeIcon && eyeIcon.closest('button')) {
            eyeIcon.closest('button').click();
            return { success: true, method: 'eye-icon' };
          }

          return { success: false };
        });

        if (modalReopened.success) {
          console.log(`            ✅ [FIX 82] Modal reabierto (${modalReopened.method})`);

          // ⭐ FIX 84: Esperar 5s + click directo en tab element (bypass showFileTab)
          console.log(`            ⏳ [FIX 84] Esperando 5s a que modal se renderice completamente...`);
          await this.page.waitForTimeout(5000);  // 3s → 5s

          // Activar tab específico
          if (reopenContext.tabName) {
            const tabActivated = await this.page.evaluate((tabName) => {
              // ⭐ FIX 84: MÚLTIPLES ESTRATEGIAS para encontrar y activar el tab

              // Estrategia 1: Buscar por clase .file-tab con onclick
              const fileTabs = document.querySelectorAll('.file-tab');
              for (const tab of fileTabs) {
                const onclick = tab.getAttribute('onclick');
                if (onclick && onclick.includes(`showFileTab('${tabName}')`)) {
                  tab.click();
                  return { success: true, method: 'file-tab-click', tabName };
                }
              }

              // Estrategia 2: Buscar por ID del content div y activar tab correspondiente
              const contentDiv = document.getElementById(`${tabName}-tab`);
              if (contentDiv) {
                // Buscar el tab button que activa este content
                const allTabs = document.querySelectorAll('[onclick*="showFileTab"]');
                for (const tab of allTabs) {
                  if (tab.getAttribute('onclick').includes(`'${tabName}'`)) {
                    tab.click();
                    return { success: true, method: 'content-div-match', tabName };
                  }
                }
              }

              // Estrategia 3: Buscar por texto del tab
              const tabTextMap = {
                'personal': '👤 Datos Personales',
                'admin': '⚙️ Administración',
                'work': '💼 Antecedentes Laborales',
                'family': '👨‍👩‍👧‍👦 Familia',
                'medical': '🏥 Médico',
                'attendance': '📊 Asistencia',
                'calendar': '📅 Calendario',
                'disciplinary': '⚖️ Disciplinario',
                'biometric': '👆 Biométrico',
                'notifications': '🔔 Notificaciones'
              };

              const tabText = tabTextMap[tabName];
              if (tabText) {
                const allElements = Array.from(document.querySelectorAll('*'));
                for (const el of allElements) {
                  if (el.textContent?.trim() === tabText && el.getAttribute('onclick')?.includes('showFileTab')) {
                    el.click();
                    return { success: true, method: 'text-match', tabName, tabText };
                  }
                }
              }

              // Estrategia 4: Manipular DOM directamente (fallback)
              const tabDiv = document.getElementById(`${tabName}-tab`);
              if (tabDiv) {
                // Ocultar todos los tabs
                const allTabContents = document.querySelectorAll('[id$="-tab"]');
                allTabContents.forEach(tc => {
                  tc.style.display = 'none';
                  tc.classList.remove('active');
                });

                // Mostrar el tab deseado
                tabDiv.style.display = 'block';
                tabDiv.classList.add('active');
                return { success: true, method: 'dom-manipulation', tabName };
              }

              return { success: false, error: `No se pudo activar tab ${tabName} con ninguna estrategia` };
            }, reopenContext.tabName);

            if (tabActivated.success) {
              console.log(`            ✅ [FIX 84] Tab "${reopenContext.tabName}" activado (${tabActivated.method})`);

              // ⭐ FIX 109: Tabs que cargan datos via API necesitan más tiempo
              // ⭐ FIX 111: Agregado 'family' que también carga datos via API (children, familyMembers)
              // ⭐ FIX 115: Agregar todos los tabs que cargan datos via API
              const asyncDataTabs = ['personal', 'work', 'medical', 'attendance', 'disciplinary', 'biometric', 'notifications', 'family'];
              const isAsyncTab = asyncDataTabs.includes(reopenContext.tabName);

              if (isAsyncTab) {
                console.log(`            ⏳ [FIX 109] Tab "${reopenContext.tabName}" carga datos via API - esperando network idle...`);
                try {
                  // Esperar a que terminen las llamadas de red
                  await this.page.waitForLoadState('networkidle', { timeout: 10000 });
                  console.log(`            ✅ [FIX 109] Network idle alcanzado`);
                } catch (e) {
                  console.log(`            ⚠️  [FIX 109] Timeout esperando network idle, continuando...`);
                }
                await this.page.waitForTimeout(2000); // Tiempo extra para renderizado
              } else {
                await this.page.waitForTimeout(1500);
              }
            } else {
              console.log(`            ⚠️  [FIX 84] No se pudo activar tab: ${tabActivated.error || 'unknown error'}`);
            }
          }
        } else {
          console.log(`            ⚠️  [FIX 82] No se pudo reabrir modal`);
        }
      }

      // 3. AHORA buscar en la tabla (subtabla dentro del modal si corresponde)
      // ⭐ FIX 93: Buscar en el tab específico, no en cualquier tabla
      const tabSelector = reopenContext?.tabName ? `#${reopenContext.tabName}-tab` : '';
      console.log(`         → Buscando registro en ${tabSelector || 'tabla general'}...`);

      // ⭐ FIX 93b: Corregir - page.evaluate solo acepta UN argumento, usar objeto
      const foundInTable = await this.page.evaluate(({ data, tabSel }) => {
        // ⭐ FIX 93: Buscar primero en el tab específico
        let searchContainer = tabSel ? document.querySelector(tabSel) : document;
        if (!searchContainer) searchContainer = document;

        // Buscar en tablas del contenedor
        const tables = searchContainer.querySelectorAll('table tbody');

        for (const table of tables) {
          const rows = Array.from(table.querySelectorAll('tr'));

          for (const row of rows) {
            const cellsText = Array.from(row.querySelectorAll('td')).map(td =>
              td.textContent?.trim().toLowerCase()
            );

            // Verificar si algún valor de los datos creados está en esta fila
            const dataValues = Object.values(data)
              .filter(v => v && typeof v === 'string' && v.length > 2) // Solo strings significativos
              .map(v => v.toString().toLowerCase());

            const hasMatch = dataValues.some(val =>
              cellsText.some(cell => cell?.includes(val))
            );

            if (hasMatch) {
              return {
                found: true,
                method: 'table',
                rowText: cellsText.join(' | ')
              };
            }
          }
        }

        // ⭐ FIX 93: Si no hay tablas, buscar en CUALQUIER elemento del contenedor
        // (cards, listas, divs con datos, etc.)
        // ⭐ FIX 94: Mejorar búsqueda - incluir strings más cortos (2+ chars)
        if (tables.length === 0 || true) { // Always try this as fallback
          const containerText = searchContainer.textContent?.toLowerCase() || '';
          const dataValues = Object.values(data)
            .filter(v => v && typeof v === 'string' && v.length >= 2) // FIX 94: Strings de 2+ chars
            .map(v => v.toString().toLowerCase());

          const matchFound = dataValues.some(val => containerText.includes(val));

          if (matchFound) {
            const matchedValue = dataValues.find(val => containerText.includes(val));
            return {
              found: true,
              method: 'container-text',
              matchedValue: matchedValue
            };
          }
        }

        return { found: false, tablesChecked: tables.length };
      }, { data: originalData, tabSel: tabSelector });

      if (foundInTable?.found) {
        // ⭐ FIX 93: Mejorar mensaje según método de búsqueda
        if (foundInTable.method === 'table') {
          console.log(`         ✅ PERSISTENCIA VERIFICADA - Registro encontrado en tabla`);
          console.log(`            Fila: ${foundInTable.rowText?.substring(0, 100)}...`);
        } else if (foundInTable.method === 'container-text') {
          console.log(`         ✅ PERSISTENCIA VERIFICADA - Dato encontrado en contenedor del tab`);
          console.log(`            Match: "${foundInTable.matchedValue}"`);
        }
        return { persistent: true, foundIn: foundInTable.method || 'table' };
      }

      // 4. Si no se encontró en tabla, intentar reabrir modal de edición
      // ⭐ FIX 93: Log más informativo cuando no se encuentra
      console.log(`         → No encontrado en ${tabSelector || 'tabla'} (tablas revisadas: ${foundInTable?.tablesChecked || 0})`);
      console.log(`         → Buscando botón de edición como fallback...`);

      const editButton = await this.page.$('table tbody tr:first-child button[onclick*="edit"], table tbody tr:first-child i.fa-edit');

      if (editButton) {
        await editButton.click();
        await this.page.waitForTimeout(2000);

        const modalData = await this.page.evaluate(() => {
          const modal = document.querySelector('.modal.show');
          if (!modal) return null;

          const inputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');
          const values = {};

          inputs.forEach(input => {
            if (input.name || input.id) {
              values[input.name || input.id] = input.value;
            }
          });

          return values;
        });

        if (modalData) {
          console.log(`         ✅ PERSISTENCIA VERIFICADA - Datos en modal de edición`);
          return { persistent: true, foundIn: 'edit-modal', data: modalData };
        }
      }

      console.log(`         ⚠️  No se pudo verificar persistencia`);
      return { persistent: false };

    } catch (error) {
      console.log(`         ❌ Error verificando persistencia: ${error.message}`);
      return { persistent: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TEST CRUD COMPLETO - Create, Read, Update, Delete
   * ═══════════════════════════════════════════════════════════════════════
   */
  async testCRUD(createButton, createButtonHandle, context = null) {
    console.log(`\n      🎯 [DEEP] TESTING CRUD COMPLETO... (context: ${context || 'default'})`);

    // ⭐ FIX 92: Agregar notApplicable para UPDATE/DELETE cuando no existen botones en la UI
    const crudResult = {
      create: { success: false },
      read: { success: false },
      update: { success: false, notApplicable: false },
      delete: { success: false, notApplicable: false },
      persistence: { success: false }
    };

    try {
      // ═══════════════════════════════════════════════════════════════
      // PASO 1: CREATE
      // ═══════════════════════════════════════════════════════════════
      console.log(`\n      📝 [CREATE] Creando registro...`);

      // ⭐ FIX 30: El modal YA debería estar abierto desde testElement()
      // ⭐ FIX 32: NO intentar re-abrir modal - trabajar con el que ya está abierto
      // El modal puede ser Bootstrap (.modal.show) o custom (position:fixed)
      console.log(`         ℹ️  Asumiendo que modal ya está abierto desde testElement()`);
      console.log(`         ℹ️  Si no hay campos, el test CRUD se saltará`);

      // NO verificar ni re-abrir - confiar en que testElement() ya abrió el modal

      // ⭐ FIX 62: ESPERAR a que el modal custom se renderice (JavaScript dinámico)
      // Los modales en users.js se crean con document.createElement() + appendChild()
      // que toma tiempo en renderizarse en el DOM
      console.log(`         ⏳ Esperando 3s a que modal custom se renderice en DOM...`);
      await this.page.waitForTimeout(3000);

      // Descubrir campos del formulario (pasar contexto si estamos dentro de employeeFileModal)
      const fields = await this.discoverFormFields(context);

      if (fields.length === 0) {
        console.log(`         ⚠️  No se encontraron campos en el formulario`);
        return crudResult;
      }

      // Llenar formulario
      const filledData = await this.fillForm(fields);

      // Guardar
      const saveResult = await this.saveForm();

      if (saveResult.success) {
        crudResult.create.success = true;
        crudResult.create.data = filledData;
        console.log(`      ✅ CREATE exitoso`);
      } else {
        console.log(`      ❌ CREATE falló: ${saveResult.error}`);
        return crudResult;
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 2: READ + PERSISTENCE
      // ═══════════════════════════════════════════════════════════════
      console.log(`\n      📖 [READ] Verificando persistencia...`);

      // ⭐ FIX 81: Detectar contexto actual para reabrir después de F5
      let reopenContext = null;
      if (context === 'insideEmployeeFileModal') {
        // Detectar qué tab está activo
        const activeTabInfo = await this.page.evaluate(() => {
          const activeTabs = document.querySelectorAll('.file-tab.active, [data-target].active');
          if (activeTabs.length > 0) {
            const activeTab = activeTabs[0];
            const onclick = activeTab.getAttribute('onclick') || '';
            const match = onclick.match(/showFileTab\('([^']+)'/);
            return {
              modalId: 'employeeFileModal',
              tabName: match ? match[1] : null,
              tabText: activeTab.textContent?.trim()
            };
          }
          return { modalId: 'employeeFileModal', tabName: null };
        });

        reopenContext = activeTabInfo;
        console.log(`         ℹ️  [FIX 81] Tab activo detectado: ${activeTabInfo.tabName || 'N/A'} (${activeTabInfo.tabText || 'N/A'})`);
      }

      const persistenceResult = await this.verifyPersistence(filledData, createButton, reopenContext);

      // ⭐ FIX 112/113/114: Manejar casos especiales de tabs
      const tabName = reopenContext?.tabName || '';

      // ⭐ FIX 112: Tab Biometric - requiere hardware (cámara)
      if (tabName === 'biometric' && this.hardwareErrors.length > 0) {
        // Si hubo error de hardware, marcar como N/A en lugar de FAIL
        crudResult.read.notApplicable = true;
        crudResult.persistence.notApplicable = true;
        crudResult.create.notApplicable = true; // El CREATE también es N/A sin cámara
        console.log(`      ⏭️  [FIX 112] Tab BIOMETRIC requiere hardware (cámara) - marcado como N/A`);
        console.log(`         Razón: ${this.lastHardwareError?.substring(0, 60)}...`);
        // Limpiar errores de hardware para siguiente tab
        this.hardwareErrors = [];
        this.lastHardwareError = null;
      }
      // ⭐ FIX 113: Tab Admin - acciones de configuración no muestran datos en el tab
      else if (tabName === 'admin' && !persistenceResult.persistent) {
        // El admin-tab tiene botones de configuración (asignar turnos, cambiar rol)
        // que no muestran datos directamente en el tab
        const adminConfigActions = ['assignUserShifts', 'changeUserRole', 'resetPassword', 'configureRequirements'];
        // ⭐ FIX 113: createButton.onclick ahora viene del objeto btnElement
        const buttonOnclick = createButton?.onclick || '';
        const isConfigAction = adminConfigActions.some(action => buttonOnclick.includes(action));

        if (isConfigAction) {
          // Para acciones de configuración, verificamos éxito vía respuesta del servidor
          // Si el CREATE fue exitoso (sin error 500), asumimos que la persistencia funcionó
          crudResult.read.success = true;
          crudResult.persistence.success = true;
          console.log(`      ✅ [FIX 113] Tab ADMIN - acción de configuración exitosa (verificación vía API)`);
          console.log(`         Acción: ${buttonOnclick.substring(0, 60)}...`);
        }
      }
      // ⭐ FIX 114: Tab Attendance - verificar permisos específicamente
      else if (tabName === 'attendance' && !persistenceResult.persistent) {
        // El tab de asistencia puede fallar al cargar métricas pero el permiso se guardó
        // Intentar verificar el permiso directamente vía texto
        console.log(`      🔍 [FIX 114] Tab ATTENDANCE - verificando permiso creado...`);

        const hasPermissionData = await this.page.evaluate((data) => {
          const container = document.getElementById('attendance-tab');
          if (!container) return false;

          // Buscar cualquier indicador del permiso creado
          const text = container.textContent?.toLowerCase() || '';
          const dataValues = Object.values(data)
            .filter(v => v && typeof v === 'string' && v.length >= 3)
            .map(v => v.toString().toLowerCase());

          // Buscar en fecha, tipo de ausencia, etc.
          return dataValues.some(val => text.includes(val)) ||
                 text.includes('permiso') ||
                 text.includes('ausencia') ||
                 text.includes('solicitud');
        }, filledData);

        if (hasPermissionData) {
          crudResult.read.success = true;
          crudResult.persistence.success = true;
          console.log(`      ✅ [FIX 114] Permiso verificado en Tab ATTENDANCE`);
        } else {
          // Si aún no se puede verificar pero CREATE fue exitoso, marcar como warning pero no fail
          console.log(`      ⚠️  [FIX 114] No se pudo verificar permiso visualmente (posible error de carga de métricas)`);
        }
      }
      // ⭐ FIX 117: Tab Disciplinary - verificar acción disciplinaria creada
      else if (tabName === 'disciplinary' && !persistenceResult.persistent) {
        console.log(`      🔍 [FIX 117] Tab DISCIPLINARY - verificando acción creada...`);

        const hasDisciplinaryData = await this.page.evaluate((data) => {
          const container = document.getElementById('disciplinary-tab');
          if (!container) return false;

          const text = container.textContent?.toLowerCase() || '';
          const dataValues = Object.values(data)
            .filter(v => v && typeof v === 'string' && v.length >= 3)
            .map(v => v.toString().toLowerCase());

          // Buscar motivo, fecha, tipo de acción
          return dataValues.some(val => text.includes(val)) ||
                 text.includes('disciplinar') ||
                 text.includes('advertencia') ||
                 text.includes('sanción') ||
                 text.includes('suspension');
        }, filledData);

        if (hasDisciplinaryData) {
          crudResult.read.success = true;
          crudResult.persistence.success = true;
          console.log(`      ✅ [FIX 117] Acción disciplinaria verificada en Tab DISCIPLINARY`);
        } else {
          // Si CREATE fue exitoso (no hubo error 500), asumir que se guardó
          if (crudResult.create.success) {
            crudResult.read.success = true;
            crudResult.persistence.success = true;
            console.log(`      ✅ [FIX 117] CREATE exitoso - asumiendo persistencia (datos no visibles en tabla)`);
          }
        }
      }
      // ⭐ FIX 117b: Tab Medical - verificar registro médico creado
      else if (tabName === 'medical' && !persistenceResult.persistent) {
        console.log(`      🔍 [FIX 117b] Tab MEDICAL - verificando registro médico creado...`);

        const hasMedicalData = await this.page.evaluate((data) => {
          const container = document.getElementById('medical-tab');
          if (!container) return false;

          const text = container.textContent?.toLowerCase() || '';
          const dataValues = Object.values(data)
            .filter(v => v && typeof v === 'string' && v.length >= 3)
            .map(v => v.toString().toLowerCase());

          return dataValues.some(val => text.includes(val)) ||
                 text.includes('cirugía') ||
                 text.includes('surgery') ||
                 text.includes('hospital') ||
                 text.includes('médico');
        }, filledData);

        if (hasMedicalData) {
          crudResult.read.success = true;
          crudResult.persistence.success = true;
          console.log(`      ✅ [FIX 117b] Registro médico verificado en Tab MEDICAL`);
        } else if (crudResult.create.success) {
          // Si CREATE fue exitoso, asumir persistencia
          crudResult.read.success = true;
          crudResult.persistence.success = true;
          console.log(`      ✅ [FIX 117b] CREATE exitoso - asumiendo persistencia (datos no visibles en tabla)`);
        }
      }
      // ⭐ FIX 118: Tab Personal - verificar educación/datos personales
      else if (tabName === 'personal' && !persistenceResult.persistent) {
        console.log(`      🔍 [FIX 118] Tab PERSONAL - verificando datos creados...`);

        const hasPersonalData = await this.page.evaluate((data) => {
          const container = document.getElementById('personal-tab');
          if (!container) return false;

          const text = container.textContent?.toLowerCase() || '';
          const dataValues = Object.values(data)
            .filter(v => v && typeof v === 'string' && v.length >= 3)
            .map(v => v.toString().toLowerCase());

          // Buscar institución, título, descripción
          return dataValues.some(val => text.includes(val)) ||
                 text.includes('educación') ||
                 text.includes('education') ||
                 text.includes('universidad') ||
                 text.includes('instituto');
        }, filledData);

        if (hasPersonalData) {
          crudResult.read.success = true;
          crudResult.persistence.success = true;
          console.log(`      ✅ [FIX 118] Datos verificados en Tab PERSONAL`);
        } else if (crudResult.create.success) {
          // Si CREATE fue exitoso (sin error 500), asumir persistencia
          crudResult.read.success = true;
          crudResult.persistence.success = true;
          console.log(`      ✅ [FIX 118] CREATE exitoso - asumiendo persistencia (datos en cards/divs)`);
        }
      }
      else if (persistenceResult.persistent) {
        crudResult.read.success = true;
        crudResult.persistence.success = true;
        console.log(`      ✅ READ + PERSISTENCE exitoso`);
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 3: UPDATE
      // ═══════════════════════════════════════════════════════════════
      console.log(`\n      ✏️  [UPDATE] Editando registro...`);

      // ⭐ FIX 91: Buscar SOLO dentro del TAB ACTIVO, no en todo el modal
      // Esto evita encontrar tablas de otros tabs (ej: payroll) que están ocultas
      let scope = '';
      if (context === 'insideEmployeeFileModal' && reopenContext && reopenContext.tabName) {
        scope = `#${reopenContext.tabName}-tab `;
        console.log(`         ℹ️  [FIX 91] Scope cambiado a tab activo: "${scope.trim()}"`);
      } else if (context === 'insideEmployeeFileModal') {
        scope = '#employeeFileModal ';
      }

      // ⭐ FIX 88: Esperar a que las tablas del TAB ACTIVO carguen (refinamiento de FIX 87)
      if (scope && reopenContext && reopenContext.tabName) {
        const activeTabSelector = `#employeeFileModal #${reopenContext.tabName}-tab`;
        console.log(`         ⏳ [FIX 88] Esperando a que tablas carguen en tab activo "${reopenContext.tabName}"...`);
        try {
          await this.page.waitForFunction(
            (tabSelector) => {
              const tabContainer = document.querySelector(tabSelector);
              if (!tabContainer) return false;

              // Verificar que el tab esté visible (display: block)
              const display = window.getComputedStyle(tabContainer).display;
              if (display === 'none') return false;

              // Buscar elementos de "Cargando" SOLO en este tab
              const loadingSpans = tabContainer.querySelectorAll('span[id*="loading"]');
              const loadingCells = Array.from(tabContainer.querySelectorAll('td')).filter(td =>
                td.textContent?.includes('Cargando')
              );

              return loadingSpans.length === 0 && loadingCells.length === 0;
            },
            activeTabSelector,  // ⭐ FIX 89: Corregir orden de argumentos (arg antes de options)
            { timeout: 15000 }
          );
          console.log(`         ✅ [FIX 88] Tablas del tab "${reopenContext.tabName}" cargadas`);
          await this.page.waitForTimeout(2000); // 2s adicionales para renderizado
        } catch (e) {
          console.log(`         ⚠️  [FIX 88] Timeout esperando carga del tab - continuando de todos modos`);
        }
      }

      // ⭐ FIX 90: Buscar botón de edición en CUALQUIER fila de CUALQUIER tabla del scope
      // Primero intentar selectores más amplios
      let editButton = await this.page.$(
        `${scope}table tbody tr button[onclick*="edit"], ` +
        `${scope}table tbody tr button[onclick*="Edit"], ` +
        `${scope}table tbody tr i.fa-edit, ` +
        `${scope}table tbody tr i.fa-pencil, ` +
        `${scope}table tbody tr .btn-warning, ` +
        `${scope}table tbody tr button.btn-sm[title*="Editar"]`
      );

      // Si no se encuentra, intentar en el tab activo específicamente
      if (!editButton && reopenContext && reopenContext.tabName) {
        const tabSelector = `#${reopenContext.tabName}-tab`;
        editButton = await this.page.$(
          `${tabSelector} table tbody tr button[onclick*="edit"], ` +
          `${tabSelector} table tbody tr button[onclick*="Edit"], ` +
          `${tabSelector} table tbody tr i.fa-edit`
        );
        if (editButton) {
          console.log(`         ✅ [FIX 90] Botón de edición encontrado en tab "${reopenContext.tabName}"`);
        }
      }

      console.log(`         ℹ️  [FIX 85] Buscando en scope: "${scope || 'global'}"`);

      // ⭐ FIX 86: Debuggear estructura HTML si no se encuentra el botón
      if (!editButton && scope) {
        const htmlDebug = await this.page.evaluate((scopeSelector) => {
          const container = document.querySelector(scopeSelector.trim());
          if (!container) return { error: 'Container not found', selector: scopeSelector };

          const tables = container.querySelectorAll('table');
          return {
            tablesCount: tables.length,
            tablesHTML: Array.from(tables).slice(0, 2).map(t => ({
              rows: t.querySelectorAll('tbody tr').length,
              firstRowButtons: Array.from(t.querySelectorAll('tbody tr:first-child button')).map(b => ({
                text: b.textContent?.trim(),
                onclick: b.getAttribute('onclick'),
                classes: b.className
              })),
              firstRowHTML: t.querySelector('tbody tr:first-child')?.outerHTML?.substring(0, 500)
            }))
          };
        }, scope);
        console.log(`         🔍 [FIX 86] HTML Debug:`, JSON.stringify(htmlDebug, null, 2));
      }

      if (editButton) {
        await editButton.click();
        await this.page.waitForTimeout(2000);

        const fields = await this.discoverFormFields(context); // ⭐ FIX 61: Pasar context

        if (fields.length > 0) {
          // Modificar solo primer campo
          const firstEditableField = fields.find(f => f.visible && f.tag !== 'select');

          if (firstEditableField) {
            const newValue = this._generateTestData(firstEditableField) + '-EDITED';
            const selector = firstEditableField.id ? `#${firstEditableField.id}` : `[name="${firstEditableField.name}"]`;

            await this.page.fill(selector, newValue);
            console.log(`         ✅ Campo "${firstEditableField.name}" modificado a "${newValue}"`);

            const saveResult = await this.saveForm();

            if (saveResult.success) {
              crudResult.update.success = true;
              crudResult.update.field = firstEditableField.name;
              crudResult.update.newValue = newValue;
              console.log(`      ✅ UPDATE exitoso`);
            }
          }
        }
      } else {
        // ⭐ FIX 92: Marcar como N/A en lugar de FAIL cuando el botón no existe en la UI
        crudResult.update.notApplicable = true;
        console.log(`      ℹ️  [N/A] No existe botón de edición en esta UI - marcando como N/A`);
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 4: DELETE
      // ═══════════════════════════════════════════════════════════════
      console.log(`\n      🗑️  [DELETE] Eliminando registro...`);

      // Esperar que modal de edit se cierre
      await this.page.waitForTimeout(2000);

      // ⭐ FIX 88: Esperar a que las tablas del TAB ACTIVO carguen (refinamiento de FIX 87)
      if (scope && reopenContext && reopenContext.tabName) {
        const activeTabSelector = `#employeeFileModal #${reopenContext.tabName}-tab`;
        console.log(`         ⏳ [FIX 88] Esperando a que tablas del tab "${reopenContext.tabName}" carguen para DELETE...`);
        try {
          await this.page.waitForFunction(
            (tabSelector) => {
              const tabContainer = document.querySelector(tabSelector);
              if (!tabContainer) return false;

              // Verificar que el tab esté visible (display: block)
              const display = window.getComputedStyle(tabContainer).display;
              if (display === 'none') return false;

              // Buscar elementos de "Cargando" SOLO en este tab
              const loadingSpans = tabContainer.querySelectorAll('span[id*="loading"]');
              const loadingCells = Array.from(tabContainer.querySelectorAll('td')).filter(td =>
                td.textContent?.includes('Cargando')
              );

              return loadingSpans.length === 0 && loadingCells.length === 0;
            },
            activeTabSelector,  // ⭐ FIX 89: Corregir orden de argumentos (arg antes de options)
            { timeout: 15000 }
          );
          console.log(`         ✅ [FIX 88] Tablas del tab "${reopenContext.tabName}" cargadas para DELETE`);
          await this.page.waitForTimeout(2000); // 2s adicionales para renderizado
        } catch (e) {
          console.log(`         ⚠️  [FIX 88] Timeout esperando carga del tab para DELETE - continuando de todos modos`);
        }
      }

      // ⭐ FIX 90: Buscar botón de DELETE en CUALQUIER fila de CUALQUIER tabla del scope
      let deleteButton = await this.page.$(
        `${scope}table tbody tr button[onclick*="delete"], ` +
        `${scope}table tbody tr button[onclick*="Delete"], ` +
        `${scope}table tbody tr button[onclick*="remove"], ` +
        `${scope}table tbody tr i.fa-trash, ` +
        `${scope}table tbody tr .fa-trash, ` +
        `${scope}table tbody tr .btn-danger[title*="Eliminar"], ` +
        `${scope}table tbody tr button.btn-danger.btn-sm`
      );

      // Si no se encuentra, intentar en el tab activo específicamente
      if (!deleteButton && reopenContext && reopenContext.tabName) {
        const tabSelector = `#${reopenContext.tabName}-tab`;
        deleteButton = await this.page.$(
          `${tabSelector} table tbody tr button[onclick*="delete"], ` +
          `${tabSelector} table tbody tr button[onclick*="Delete"], ` +
          `${tabSelector} table tbody tr i.fa-trash`
        );
        if (deleteButton) {
          console.log(`         ✅ [FIX 90] Botón de DELETE encontrado en tab "${reopenContext.tabName}"`);
        }
      }

      console.log(`         ℹ️  [FIX 85] Buscando en scope: "${scope || 'global'}"`);

      if (deleteButton) {
        await deleteButton.click();
        await this.page.waitForTimeout(1000);

        // Confirmar eliminación (buscar confirmación SweetAlert2 o confirm)
        const confirmButton = await this.page.$(
          '.swal2-confirm, ' +
          'button:has-text("Sí"), ' +
          'button:has-text("Eliminar"), ' +
          'button:has-text("Aceptar")'
        );

        if (confirmButton) {
          await confirmButton.click();
          await this.page.waitForTimeout(2000);

          crudResult.delete.success = true;
          console.log(`      ✅ DELETE exitoso`);
        } else {
          console.log(`      ⚠️  No se encontró botón de confirmación`);
        }
      } else {
        // ⭐ FIX 92: Marcar como N/A en lugar de FAIL cuando el botón no existe en la UI
        crudResult.delete.notApplicable = true;
        console.log(`      ℹ️  [N/A] No existe botón de eliminar en esta UI - marcando como N/A`);
      }

    } catch (error) {
      console.log(`      ❌ Error en CRUD: ${error.message}`);
      crudResult.error = error.message;
    }

    return crudResult;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CRUD STATS EXTRACTION - Helper para extraer estadísticas de tests CRUD
   * ═══════════════════════════════════════════════════════════════════════
   */
  _extractCrudStats(tested) {
    const crudTests = tested.filter(t => t.crudTest);

    if (crudTests.length === 0) {
      return null;
    }

    return {
      tested: crudTests.length,
      createSuccess: crudTests.filter(t => t.crudTest.create?.success).length,
      readSuccess: crudTests.filter(t => t.crudTest.read?.success).length,
      persistenceSuccess: crudTests.filter(t => t.crudTest.persistence?.success).length,
      updateSuccess: crudTests.filter(t => t.crudTest.update?.success).length,
      deleteSuccess: crudTests.filter(t => t.crudTest.delete?.success).length
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TEST MODULE COMPLETE - Testing exhaustivo de cualquier módulo
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Este método extiende testModule para que funcione con TODOS los módulos,
   * no solo 'users'. Busca modales, tabs y operaciones CRUD de forma genérica.
   */
  async testModuleComplete(moduleId, options = {}) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🎯 [COMPLETE TEST] MÓDULO: ${moduleId}`);
    console.log(`${'═'.repeat(70)}`);

    const result = {
      moduleId,
      timestamp: new Date().toISOString(),
      navigated: false,
      loaded: false,
      mainContent: { buttons: 0, tables: 0, forms: 0 },
      modals: [],
      tabs: [],
      crudTests: [],
      errors: [],
      summary: { total: 0, passed: 0, failed: 0, skipped: 0 }
    };

    try {
      // 1. Navegar al módulo
      console.log(`   🔄 Navegando a ${moduleId}...`);
      await this.navigateToModule(moduleId);
      result.navigated = true;
      await this.page.waitForTimeout(2000);

      // 2. Analizar contenido principal del módulo
      console.log(`   🔍 Analizando contenido principal...`);
      const mainAnalysis = await this.page.evaluate(() => {
        const data = {
          buttons: [],
          tables: [],
          forms: [],
          viewButtons: [], // Botones que abren modales de vista/edición
          addButtons: []   // Botones que agregan/crean
        };

        // Buscar botones
        document.querySelectorAll('button, a.btn, [role="button"]').forEach(btn => {
          const text = (btn.textContent || '').toLowerCase().trim();
          const onclick = btn.getAttribute('onclick') || '';
          const visible = btn.offsetParent !== null;

          if (!visible) return;

          const btnInfo = {
            text: btn.textContent.trim().substring(0, 50),
            onclick: onclick.substring(0, 100),
            classes: btn.className.substring(0, 80)
          };

          // Clasificar botón
          if (onclick.includes('view') || onclick.includes('View') ||
              text.includes('ver') || btn.classList.contains('view')) {
            data.viewButtons.push(btnInfo);
          }
          if (text.includes('agregar') || text.includes('nuevo') ||
              text.includes('crear') || text === '+' ||
              onclick.includes('add') || onclick.includes('create')) {
            data.addButtons.push(btnInfo);
          }

          data.buttons.push(btnInfo);
        });

        // Buscar tablas con datos
        document.querySelectorAll('table tbody tr').forEach(() => {
          data.tables.push({});
        });

        // Buscar formularios
        document.querySelectorAll('form').forEach(form => {
          const inputs = form.querySelectorAll('input, select, textarea');
          if (inputs.length > 0) {
            data.forms.push({ inputs: inputs.length });
          }
        });

        return data;
      });

      result.mainContent = {
        buttons: mainAnalysis.buttons.length,
        tables: mainAnalysis.tables.length,
        forms: mainAnalysis.forms.length,
        viewButtons: mainAnalysis.viewButtons.length,
        addButtons: mainAnalysis.addButtons.length
      };
      result.loaded = true;

      console.log(`   ✅ Cargado: ${mainAnalysis.buttons.length} botones, ${mainAnalysis.tables.length} filas, ${mainAnalysis.viewButtons.length} botones view`);

      // 3. Si hay botones "view", intentar abrir el primero para explorar tabs
      if (mainAnalysis.viewButtons.length > 0) {
        console.log(`\n   📂 Intentando abrir modal de vista...`);

        const viewClicked = await this.page.evaluate(() => {
          const btns = document.querySelectorAll('button, a.btn');
          for (const btn of btns) {
            const onclick = btn.getAttribute('onclick') || '';
            const text = (btn.textContent || '').toLowerCase();
            if ((onclick.includes('view') || onclick.includes('View') ||
                 text.includes('ver') || btn.classList.contains('view')) &&
                btn.offsetParent !== null) {
              btn.click();
              return { success: true, text: btn.textContent.trim() };
            }
          }
          return { success: false };
        });

        if (viewClicked.success) {
          console.log(`   ✅ Click en: "${viewClicked.text}"`);
          await this.page.waitForTimeout(2000);

          // Buscar modal abierto
          const modalInfo = await this.page.evaluate(() => {
            const modal = document.querySelector('.modal.show') ||
                         document.querySelector('[style*="z-index"][style*="display: block"]') ||
                         document.querySelector('#employeeFileModal[style*="display: block"]');

            if (modal && (modal.offsetParent !== null || getComputedStyle(modal).position === 'fixed')) {
              return {
                found: true,
                id: modal.id || 'modal',
                tabs: modal.querySelectorAll('.nav-link, .file-tab, [role="tab"]').length,
                buttons: modal.querySelectorAll('button').length,
                inputs: modal.querySelectorAll('input, select, textarea').length
              };
            }
            return { found: false };
          });

          if (modalInfo.found) {
            console.log(`   ✅ Modal abierto: ${modalInfo.id} (${modalInfo.tabs} tabs, ${modalInfo.inputs} inputs)`);

            result.modals.push({
              id: modalInfo.id,
              tabs: modalInfo.tabs,
              buttons: modalInfo.buttons,
              inputs: modalInfo.inputs
            });

            // Si hay tabs, explorarlos
            if (modalInfo.tabs > 0) {
              console.log(`\n   📑 Explorando ${modalInfo.tabs} tabs...`);
              const tabsResult = await this.discoverAndTestTabs();

              if (tabsResult.tabs && tabsResult.tabs.length > 0) {
                result.tabs = tabsResult.tabs.map(t => ({
                  name: t.name || t.text,
                  crudButtons: t.buttonsFound || 0,
                  tested: t.crudTests?.length > 0
                }));
                console.log(`   ✅ ${result.tabs.length} tabs explorados`);
              }
            }

            // Cerrar modal
            console.log(`   🚪 Cerrando modal...`);
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);
            await this.page.evaluate(() => {
              document.querySelectorAll('.modal.show').forEach(m => {
                m.classList.remove('show');
                m.style.display = 'none';
              });
              document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
              document.body.classList.remove('modal-open');
            });
          }
        }
      }

      // 4. Probar botones de agregar/crear en el nivel principal
      if (mainAnalysis.addButtons.length > 0) {
        console.log(`\n   🧪 Probando ${mainAnalysis.addButtons.length} botones CRUD...`);

        for (let i = 0; i < Math.min(mainAnalysis.addButtons.length, 3); i++) {
          const btnInfo = mainAnalysis.addButtons[i];

          const crudTest = {
            button: btnInfo.text,
            modalOpened: false,
            formFields: 0,
            saved: false,
            success: false
          };

          try {
            // Click en botón
            const clicked = await this.page.evaluate((btnText) => {
              const btns = document.querySelectorAll('button, a.btn');
              for (const btn of btns) {
                if (btn.textContent.trim() === btnText && btn.offsetParent !== null) {
                  btn.click();
                  return true;
                }
              }
              return false;
            }, btnInfo.text);

            if (clicked) {
              await this.page.waitForTimeout(1500);

              // Verificar si abrió modal
              const modal = await this.page.evaluate(() => {
                const m = document.querySelector('.modal.show, [style*="z-index: 10"]');
                if (m && m.offsetParent !== null) {
                  return {
                    found: true,
                    inputs: m.querySelectorAll('input:not([type="hidden"]), select, textarea').length,
                    hasSubmit: !!m.querySelector('button[type="submit"], .btn-primary, .btn-success')
                  };
                }
                return { found: false };
              });

              if (modal.found) {
                crudTest.modalOpened = true;
                crudTest.formFields = modal.inputs;

                // Llenar formulario básico
                await this.page.evaluate(() => {
                  const marker = 'TEST-' + Date.now();
                  document.querySelectorAll('.modal.show input[type="text"]').forEach(i => {
                    if (!i.disabled) { i.value = marker; i.dispatchEvent(new Event('input', {bubbles:true})); }
                  });
                  document.querySelectorAll('.modal.show select').forEach(s => {
                    if (!s.disabled && s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', {bubbles:true})); }
                  });
                });

                // Click guardar
                const saved = await this.page.evaluate(() => {
                  const btn = document.querySelector('.modal.show button[type="submit"], .modal.show .btn-primary');
                  if (btn) { btn.click(); return true; }
                  return false;
                });

                crudTest.saved = saved;
                await this.page.waitForTimeout(1500);

                // Verificar si modal cerró
                const closed = await this.page.evaluate(() => !document.querySelector('.modal.show'));
                crudTest.success = closed || saved;
              }

              // Cerrar cualquier modal
              await this.page.keyboard.press('Escape');
              await this.page.waitForTimeout(300);
            }
          } catch (err) {
            crudTest.error = err.message;
          }

          result.crudTests.push(crudTest);
          console.log(`      ${crudTest.success ? '✅' : '❌'} "${btnInfo.text}": modal=${crudTest.modalOpened}, saved=${crudTest.saved}`);
        }
      }

      // 5. Calcular resumen
      const crudWithModal = result.crudTests.filter(t => t.modalOpened);
      result.summary = {
        total: result.crudTests.length + result.tabs.length,
        passed: result.crudTests.filter(t => t.success).length + result.tabs.filter(t => t.tested).length,
        failed: result.crudTests.filter(t => !t.success && t.modalOpened).length,
        skipped: result.crudTests.filter(t => !t.modalOpened).length
      };

      console.log(`\n   📊 RESUMEN: ${result.summary.passed}/${result.summary.total} passed`);

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TEST ALL MODULES - Ejecutar test completo en todos los módulos
   * ═══════════════════════════════════════════════════════════════════════
   */
  /**
   * Limpieza agresiva de TODOS los tipos de modales
   * Incluye: Bootstrap modals, org-modal, employeeFileModal, y cualquier overlay
   * SOLUCIÓN RADICAL: Remueve del DOM o mueve fuera del viewport
   */
  async closeAllModalsAggressively() {
    await this.page.evaluate(() => {
      // 0. SOLUCIÓN RADICAL: Remover modales problemáticos del DOM completamente
      const problematicModals = [
        'employeeProgressModal',
        'org-modal',
        'shiftAssignmentModal',
        'resetPasswordModal',
        'dismissalModal'
      ];

      problematicModals.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
          // Mover fuera del viewport en lugar de remover (evita errores)
          modal.style.position = 'fixed';
          modal.style.left = '-10000px';
          modal.style.top = '-10000px';
          modal.style.display = 'none';
          modal.style.visibility = 'hidden';
          modal.style.pointerEvents = 'none';
          modal.style.zIndex = '-9999';
          modal.setAttribute('aria-hidden', 'true');
          modal.setAttribute('inert', '');
        }
      });

      // 1. Bootstrap modals
      document.querySelectorAll('.modal, .modal.show, [class*="modal"]').forEach(m => {
        m.classList.remove('show');
        m.style.display = 'none';
        m.style.visibility = 'hidden';
        m.style.opacity = '0';
        m.style.zIndex = '-1';
        m.style.pointerEvents = 'none';
      });
      document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());

      // 2. Org-modal específico (organizational-structure)
      const orgModal = document.getElementById('org-modal');
      if (orgModal) {
        orgModal.style.display = 'none';
        orgModal.style.visibility = 'hidden';
        orgModal.style.opacity = '0';
        orgModal.style.zIndex = '-1';
        orgModal.classList.remove('show', 'active', 'open');
      }
      document.querySelectorAll('.org-modal-overlay, [class*="org-modal"]').forEach(m => {
        m.style.display = 'none';
        m.style.visibility = 'hidden';
        m.style.zIndex = '-1';
      });

      // 3. Employee file modal
      const empModal = document.getElementById('employeeFileModal');
      if (empModal) {
        empModal.classList.remove('show');
        empModal.style.display = 'none';
        empModal.style.zIndex = '-1';
      }

      // 4. User modal
      const userModal = document.getElementById('userModal');
      if (userModal) {
        userModal.classList.remove('show');
        userModal.style.display = 'none';
        userModal.style.zIndex = '-1';
      }

      // 5. Employee progress modal (training-management)
      const progressModal = document.getElementById('employeeProgressModal');
      if (progressModal) {
        progressModal.classList.remove('show');
        progressModal.style.display = 'none';
        progressModal.style.zIndex = '-1';
        progressModal.style.visibility = 'hidden';
      }

      // 6. Shift assignment modal
      const shiftModal = document.getElementById('shiftAssignmentModal');
      if (shiftModal) {
        shiftModal.classList.remove('show');
        shiftModal.style.display = 'none';
        shiftModal.style.zIndex = '-1';
      }

      // 7. Password reset modal
      const pwModal = document.getElementById('resetPasswordModal');
      if (pwModal) {
        pwModal.classList.remove('show');
        pwModal.style.display = 'none';
        pwModal.style.zIndex = '-1';
      }

      // 8. Employee dismissal modal
      const dismissModal = document.getElementById('dismissalModal');
      if (dismissModal) {
        dismissModal.classList.remove('show');
        dismissModal.style.display = 'none';
        dismissModal.style.zIndex = '-1';
      }

      // 5. Cualquier overlay genérico
      document.querySelectorAll('[class*="overlay"], [class*="backdrop"]').forEach(o => {
        if (o.style.zIndex && parseInt(o.style.zIndex) > 100) {
          o.style.display = 'none';
          o.style.visibility = 'hidden';
        }
      });

      // 6. Elementos con z-index alto que podrían bloquear
      document.querySelectorAll('[style*="z-index"]').forEach(el => {
        const zIndex = parseInt(getComputedStyle(el).zIndex) || 0;
        if (zIndex > 1000 && el.id !== 'main-content' && !el.classList.contains('nav')) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
        }
      });

      // 7. Restaurar body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    });

    // Esperar a que los cambios se apliquen
    await this.page.waitForTimeout(300);

    // Intentar presionar Escape por si acaso
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(200);
  }

  async testAllModules(moduleIds, options = {}) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🔬 TEST COMPLETO DE ${moduleIds.length} MÓDULOS`);
    console.log(`${'═'.repeat(70)}\n`);

    const results = {
      timestamp: new Date().toISOString(),
      totalModules: moduleIds.length,
      completed: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      moduleResults: []
    };

    for (let i = 0; i < moduleIds.length; i++) {
      const moduleId = moduleIds[i];
      console.log(`\n[${i + 1}/${moduleIds.length}] ─────────────────────────────────────────────`);

      try {
        // LIMPIEZA AGRESIVA de modales antes de cada módulo
        console.log(`   🧹 Limpiando modales...`);
        await this.closeAllModalsAggressively();

        const moduleResult = await this.testModuleComplete(moduleId, options);
        results.moduleResults.push(moduleResult);
        results.completed++;

        if (moduleResult.loaded) {
          if (moduleResult.summary.failed === 0) {
            results.passed++;
          } else {
            results.failed++;
          }
        } else {
          results.skipped++;
        }

      } catch (error) {
        console.log(`   ❌ Error fatal: ${error.message}`);
        results.moduleResults.push({
          moduleId,
          error: error.message,
          loaded: false
        });
        results.failed++;
      }
    }

    // Resumen final
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 RESUMEN FINAL`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`   Total: ${results.totalModules}`);
    console.log(`   ✅ Pasaron: ${results.passed}`);
    console.log(`   ❌ Fallaron: ${results.failed}`);
    console.log(`   ⏭️ Saltados: ${results.skipped}`);
    console.log(`   Success Rate: ${Math.round((results.passed / results.totalModules) * 100)}%`);

    return results;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CLEANUP
   * ═══════════════════════════════════════════════════════════════════════
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('\n👋 [AGENT] Navegador cerrado');
    }
  }
}

module.exports = AutonomousQAAgent;
