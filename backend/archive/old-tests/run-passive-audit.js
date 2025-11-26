/**
 * AUDITOR PASIVO - Monitorea tu navegación ACTUAL sin abrir nuevo navegador
 *
 * CÓMO FUNCIONA:
 * 1. TÚ abres Chrome y te logueas manualmente
 * 2. Este script se conecta a tu navegador ACTUAL
 * 3. Navega automáticamente módulo por módulo
 * 4. Detecta errores en cada módulo
 * 5. NO abre navegador nuevo, usa el que YA tienes abierto
 *
 * INSTRUCCIONES:
 *
 * PASO 1: Abre Chrome con debugging remoto:
 *
 * Windows:
 * "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug" http://localhost:9999/panel-empresa.html
 *
 * Linux/Mac:
 * google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug http://localhost:9999/panel-empresa.html
 *
 * PASO 2: Loguéate manualmente en el sistema
 *
 * PASO 3: Ejecuta este script:
 * PORT=9999 MAX_CYCLES=1 node run-passive-audit.js
 *
 * PASO 4: El script navegará módulo por módulo automáticamente
 *
 * @version 1.0.0
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const database = require('./src/config/database');

const PORT = process.env.PORT || 9999;
const MAX_CYCLES = parseInt(process.env.MAX_CYCLES || '1');
const CHROME_DEBUG_PORT = process.env.CHROME_DEBUG_PORT || '9222';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Detectar errores visibles en la página
 */
async function detectVisibleErrors(page) {
  return await page.evaluate(() => {
    const errors = [];
    const allDivs = document.querySelectorAll('div');

    allDivs.forEach(div => {
      const text = div.textContent.trim();
      const computedStyle = window.getComputedStyle(div);
      const bgColor = computedStyle.backgroundColor;
      const display = computedStyle.display;

      // Detectar mensajes de error
      const hasErrorText = /error|falló|falla|problema|❌|no se pudo|failed/i.test(text);
      const hasRedBackground = bgColor.includes('rgb(220, 53, 69)') ||
                                bgColor.includes('rgb(239, 68, 68)') ||
                                bgColor.includes('rgb(185, 28, 28)');
      const isErrorDiv = div.id && (
        div.id.includes('error') ||
        div.id.includes('message')
      );

      // Excluir chat de IA (es un falso positivo)
      const isAIChat = div.id === 'ai-assistant-messages' ||
                       div.classList.contains('ai-message') ||
                       text.includes('Soy tu asistente de IA');

      if ((hasErrorText || hasRedBackground || isErrorDiv) &&
          text.length > 0 &&
          text.length < 300 &&
          display !== 'none' &&
          !isAIChat) {
        errors.push({
          id: div.id || null,
          text: text.substring(0, 150),
          backgroundColor: bgColor
        });
      }
    });

    return errors;
  });
}

/**
 * Navegar a un módulo específico
 */
async function navigateToModule(page, moduleId, moduleName) {
  console.log(`${colors.cyan}    → Navegando a: ${moduleName}${colors.reset}`);

  try {
    // Llamar a la función openModuleDirect del sistema
    await page.evaluate((modId, modName) => {
      if (typeof window.openModuleDirect === 'function') {
        window.openModuleDirect(modId, modName);
      } else if (typeof window.openModule === 'function') {
        window.openModule(modId);
      } else {
        console.error('No se encontró función de navegación');
      }
    }, moduleId, moduleName);

    // Esperar a que cargue
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Detectar errores
    const errors = await detectVisibleErrors(page);

    if (errors.length > 0) {
      console.log(`${colors.red}      ❌ ${errors.length} error(es) detectado(s):${colors.reset}`);
      errors.forEach(err => {
        console.log(`${colors.red}         • "${err.text}"${colors.reset}`);
      });
      return { success: false, errors };
    } else {
      console.log(`${colors.green}      ✅ Sin errores visibles${colors.reset}`);
      return { success: true, errors: [] };
    }

  } catch (error) {
    console.log(`${colors.red}      ❌ Error navegando: ${error.message}${colors.reset}`);
    return { success: false, errors: [{ text: error.message }] };
  }
}

/**
 * MAIN
 */
async function main() {
  console.clear();

  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   AUDITOR PASIVO - Monitoreo de Navegación Actual${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.yellow}📋 INSTRUCCIONES:${colors.reset}`);
  console.log(`${colors.yellow}   1. Abre Chrome con debugging:${colors.reset}`);
  console.log(`      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\ChromeDebug" http://localhost:9999/panel-empresa.html`);
  console.log(`${colors.yellow}   2. Loguéate manualmente en el sistema${colors.reset}`);
  console.log(`${colors.yellow}   3. Este script navegará automáticamente cada módulo${colors.reset}\n`);

  try {
    console.log(`${colors.cyan}🔌 Conectando a base de datos...${colors.reset}`);
    await database.sequelize.authenticate();
    console.log(`${colors.green}✅ Conectado a base de datos${colors.reset}\n`);

    console.log(`${colors.cyan}🔗 Conectando a Chrome en puerto ${CHROME_DEBUG_PORT}...${colors.reset}`);

    let browser;
    try {
      browser = await puppeteer.connect({
        browserURL: `http://localhost:${CHROME_DEBUG_PORT}`,
        defaultViewport: null
      });
      console.log(`${colors.green}✅ Conectado al navegador${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.red}❌ No se pudo conectar al navegador${colors.reset}`);
      console.log(`${colors.yellow}\n⚠️  Asegúrate de haber abierto Chrome con:${colors.reset}`);
      console.log(`   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\ChromeDebug"\n`);
      process.exit(1);
    }

    // Obtener la página activa
    const pages = await browser.pages();
    const page = pages[pages.length - 1]; // Última pestaña abierta

    console.log(`${colors.cyan}📄 Usando pestaña actual${colors.reset}\n`);

    // Cargar registry de módulos
    const SystemRegistry = require('./src/auditor/registry/SystemRegistry');
    const systemRegistry = new SystemRegistry(database);
    await systemRegistry.initialize();
    const modules = systemRegistry.getAllModules();

    console.log(`${colors.bright}${colors.blue}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║  🔍 INICIANDO AUDITORÍA PASIVA                            ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.cyan}📊 Módulos a testear: ${modules.length}${colors.reset}\n`);

    let totalErrors = 0;
    let modulesWithErrors = 0;
    const results = [];

    // Navegar cada módulo
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];

      console.log(`${colors.bright}[${i + 1}/${modules.length}] ${module.name}${colors.reset}`);

      const result = await navigateToModule(page, module.id, module.name);

      if (!result.success) {
        modulesWithErrors++;
        totalErrors += result.errors.length;
      }

      results.push({
        module: module.name,
        moduleId: module.id,
        success: result.success,
        errors: result.errors
      });

      // Pequeña pausa entre módulos
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Resumen final
    console.log('\n');
    console.log(`${colors.bright}${colors.blue}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║  📊 RESUMEN FINAL                                         ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.cyan}Módulos testeados:${colors.reset}     ${modules.length}`);
    console.log(`${colors.green}✅ Módulos sin errores:${colors.reset} ${modules.length - modulesWithErrors}`);
    console.log(`${colors.red}❌ Módulos con errores:${colors.reset} ${modulesWithErrors}`);
    console.log(`${colors.red}📛 Total de errores:${colors.reset}    ${totalErrors}\n`);

    if (modulesWithErrors > 0) {
      console.log(`${colors.bright}${colors.red}═══════════════════════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.bright}${colors.red}MÓDULOS CON ERRORES:${colors.reset}\n`);

      results.filter(r => !r.success).forEach(result => {
        console.log(`${colors.red}• ${result.module}${colors.reset}`);
        result.errors.forEach(err => {
          console.log(`  - "${err.text.substring(0, 80)}..."`);
        });
        console.log('');
      });
    }

    console.log(`${colors.green}✅ Auditoría completada${colors.reset}\n`);

    await database.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error(`\n${colors.red}❌ ERROR FATAL:${colors.reset}`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
