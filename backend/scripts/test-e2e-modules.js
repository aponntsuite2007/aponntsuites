/**
 * TEST E2E VISUAL - Verifica que módulos cargan correctamente en el navegador
 * Con scroll en formularios y viewport adecuado
 */
const puppeteer = require('puppeteer');

const MODULES_TO_TEST = [
  // Core RRHH (usando IDs mapeados)
  { id: 'departments', name: 'Estructura Organizacional' },
  { id: 'users', name: 'Usuarios' },
  { id: 'attendance', name: 'Asistencia' },
  { id: 'shifts', name: 'Turnos' },
  { id: 'vacation-management', name: 'Vacaciones' },
  { id: 'sanctions-management', name: 'Sanciones' },
  { id: 'visitors', name: 'Visitantes' },
  // Comunicaciones
  { id: 'notifications', name: 'Notificaciones' },
  // Biométrico
  { id: 'biometric-consent', name: 'Consentimiento Biométrico' },
  // Módulos adicionales
  { id: 'employee-map', name: 'Mapa de Empleados' },
  { id: 'employee-360', name: 'Employee 360' },
  { id: 'engineering-dashboard', name: 'Engineering Dashboard' },
  { id: 'logistics-dashboard', name: 'Logistics Dashboard' },
  { id: 'facturacion', name: 'Facturación' }
];

async function testModules() {
  console.log('\n========================================');
  console.log('  TEST E2E VISUAL DE MÓDULOS');
  console.log('========================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Capturar errores de consola
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // LOGIN
    console.log('1. Iniciando login...');
    await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle0', timeout: 30000 });

    // Esperar que carguen las empresas en el dropdown
    await page.waitForSelector('#companySelect', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000)); // Esperar carga de empresas

    // Seleccionar empresa por valor del option
    await page.select('#companySelect', 'aponnt-empresa-demo');
    await new Promise(r => setTimeout(r, 1000));

    // Ingresar credenciales
    await page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
    await page.type('#userInput', 'administrador');
    await page.type('#passwordInput', 'admin123');

    // Click en login
    await page.click('#loginButton');
    await new Promise(r => setTimeout(r, 4000));

    console.log('   Login completado\n');

    // Resultados
    const results = {
      passed: [],
      partial: [],
      failed: []
    };

    // TESTEAR CADA MÓDULO
    for (const mod of MODULES_TO_TEST) {
      console.log(`2. Testing: ${mod.name} (${mod.id})`);
      consoleErrors.length = 0; // Reset errores

      try {
        // Intentar cargar el módulo
        const loaded = await page.evaluate((moduleId) => {
          return new Promise((resolve) => {
            try {
              if (typeof window.showModuleContent === 'function') {
                window.showModuleContent(moduleId, moduleId);
                setTimeout(() => resolve(true), 3000);
              } else if (typeof window.showTab === 'function') {
                window.showTab(moduleId);
                setTimeout(() => resolve(true), 3000);
              } else {
                resolve(false);
              }
            } catch (e) {
              console.error('Error loading module:', e);
              resolve(false);
            }
          });
        }, mod.id);

        await new Promise(r => setTimeout(r, 2500));

        // Verificar contenido
        const contentCheck = await page.evaluate(() => {
          const main = document.getElementById('mainContent');
          if (!main) return { found: false, text: '' };

          const text = main.innerText.trim();
          const lowerText = text.toLowerCase();

          // Solo detectar errores REALES, no menciones de "error" en labels o clases
          const errorPatterns = [
            /error:\s*\S/i,              // "Error: mensaje"
            /failed to load/i,           // "Failed to load"
            /no se pudo/i,               // "No se pudo cargar"
            /❌.*error/i,                 // Emoji + error
            /error.*❌/i,                 // Error + emoji
            /error\s+al\s+/i,            // "Error al cargar"
            /error\s+cargando/i,         // "Error cargando"
            /error\s+loading/i           // "Error loading"
          ];

          const hasRealError = errorPatterns.some(p => p.test(text));
          const hasLoading = text.includes('Cargando') || text.includes('Loading');
          // Solo detectar 404 real como error HTTP, no parte de otros números
          const has404Pattern = /\b404\b/.test(text) || lowerText.includes('página no encontrada') || lowerText.includes('módulo no encontrado');
          const has404 = has404Pattern;
          const hasContent = text.length > 200;

          // Debug: find what triggered has404
          let found404Reason = null;
          if (has404) {
            if (/\b404\b/.test(text)) found404Reason = 'contains "404" as word boundary';
            else if (lowerText.includes('página no encontrada')) found404Reason = 'contains "página no encontrada"';
            else if (lowerText.includes('módulo no encontrado')) found404Reason = 'contains "módulo no encontrado"';
            else found404Reason = 'unknown trigger!';
          }

          return {
            found: true,
            length: text.length,
            hasError: hasRealError,
            hasLoading,
            has404,
            hasContent,
            sample: text.substring(0, 150).replace(/\n/g, ' '),
            fullText: text.substring(0, 800).replace(/\n/g, ' '),
            found404Reason
          };
        });

        // Determinar resultado
        if (contentCheck.found && contentCheck.hasContent && !contentCheck.hasError && !contentCheck.hasLoading && !contentCheck.has404) {
          console.log(`   [OK] ${contentCheck.length} chars - Contenido cargado`);
          results.passed.push(mod);
        } else if (contentCheck.hasLoading) {
          console.log(`   [PARTIAL] Sigue mostrando "Cargando..."`);
          results.partial.push({ ...mod, reason: 'Loading stuck' });
        } else if (contentCheck.hasError || contentCheck.has404) {
          console.log(`   [FAIL] Error visible (hasError=${contentCheck.hasError}, has404=${contentCheck.has404}, reason=${contentCheck.found404Reason})`);
          console.log(`   DEBUG FULL: ${contentCheck.fullText}`);
          results.failed.push({ ...mod, reason: 'Error in content' });
        } else {
          console.log(`   [PARTIAL] ${contentCheck.length} chars - Contenido mínimo`);
          results.partial.push({ ...mod, reason: `Only ${contentCheck.length} chars`, sample: contentCheck.sample });
        }

        // Mostrar errores de consola si hay
        if (consoleErrors.length > 0) {
          console.log(`   Console errors: ${consoleErrors.length}`);
        }

      } catch (err) {
        console.log(`   [FAIL] Exception: ${err.message}`);
        results.failed.push({ ...mod, reason: err.message });
      }
    }

    // RESUMEN
    console.log('\n========================================');
    console.log('  RESUMEN DE RESULTADOS');
    console.log('========================================');
    console.log(`\n[OK] PASARON: ${results.passed.length}/${MODULES_TO_TEST.length}`);
    results.passed.forEach(m => console.log(`    - ${m.name}`));

    if (results.partial.length > 0) {
      console.log(`\n[PARTIAL] PARCIALES: ${results.partial.length}`);
      results.partial.forEach(m => console.log(`    - ${m.name}: ${m.reason}`));
    }

    if (results.failed.length > 0) {
      console.log(`\n[FAIL] FALLARON: ${results.failed.length}`);
      results.failed.forEach(m => console.log(`    - ${m.name}: ${m.reason}`));
    }

    const passRate = Math.round((results.passed.length / MODULES_TO_TEST.length) * 100);
    console.log(`\n========================================`);
    console.log(`  TASA DE ÉXITO: ${passRate}%`);
    console.log(`========================================\n`);

    // Cerrar browser y retornar resultados
    await browser.close();
    console.log('Test completado');
    process.exit(passRate >= 70 ? 0 : 1);

  } catch (error) {
    console.error('Error general:', error);
    await browser.close();
    process.exit(1);
  }
}

testModules().catch(console.error);
