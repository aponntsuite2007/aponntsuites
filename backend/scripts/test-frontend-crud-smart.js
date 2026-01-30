/**
 * TEST FRONTEND CRUD SMART
 *
 * Test inteligente que analiza la estructura de cada módulo
 * y se adapta automáticamente a los selectores encontrados.
 *
 * Uso: node scripts/test-frontend-crud-smart.js
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';

// Lista COMPLETA de módulos a testear (46 módulos)
const MODULES = [
  // RRHH (12)
  'users',
  'attendance',
  'vacation-management',
  'sanctions-management',
  'training-management',
  'job-postings',
  'hour-bank',
  'payroll-liquidation',
  'benefits-management',
  'payslip-template-editor',
  'training',
  'clientes',

  // Organización (1)
  'organizational-structure',

  // Biométrico (5)
  'biometric-dashboard',
  'biometric-simple',
  'biometric-consent',
  'kiosks',
  'visitors',

  // Médico (4)
  'medical-dashboard',
  'art-management',
  'hse-management',
  'psychological-assessment',

  // Legal (4)
  'legal-dashboard',
  'procedures-manual',
  'my-procedures',
  'terms-conditions',

  // Finanzas (3)
  'quotes-management',
  'facturacion',
  'plantillas-fiscales',

  // Comunicaciones (4)
  'notifications-enterprise',
  'company-email-smtp-config',
  'company-email-process',
  'inbox',

  // Operaciones (2)
  'logistics-dashboard',
  'employee-map',

  // Marketplace (1)
  'associate-marketplace',

  // Auditoría (4)
  'audit-reports',
  'compliance-dashboard',
  'sla-tracking',
  'auditor-dashboard',

  // Sistema (3)
  'settings',
  'roles-permissions',
  'contextual-help',

  // Analytics (3)
  'predictive-workforce',
  'emotional-analysis',
  'dashboard'
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TEST FRONTEND CRUD SMART - Análisis Automático de UI');
  console.log(`   Total módulos: ${MODULES.length}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const results = { passed: 0, failed: 0, partial: 0, details: [] };

  try {
    // Login
    console.log('🔐 Login...');
    await page.goto(`${BASE_URL}/panel-empresa.html`, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      const select = document.querySelector('#companySelect');
      if (select && select.options.length > 1) {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change'));
      }
    });
    await page.waitForTimeout(500);
    await page.fill('#userInput', 'administrador');
    await page.fill('#passwordInput', 'admin123');
    await page.click('#loginButton');
    await page.waitForTimeout(4000);

    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    if (!token) throw new Error('Login failed');
    console.log('   ✅ Login exitoso\n');

    // Test cada módulo
    for (let i = 0; i < MODULES.length; i++) {
      const moduleKey = MODULES[i];
      const testNum = i + 1;

      console.log(`\n[${testNum}/${MODULES.length}] 📦 ${moduleKey}`);
      console.log('─'.repeat(60));

      const moduleResult = {
        key: moduleKey,
        steps: {
          load: false,
          findCreate: false,
          openModal: false,
          findFields: false,
          fillFields: false,
          save: false,
          verify: false
        }
      };

      try {
        // 1. Cargar módulo
        await page.evaluate(({ key }) => {
          if (typeof showModuleContent === 'function') showModuleContent(key, key);
        }, { key: moduleKey });
        await page.waitForTimeout(3000);
        moduleResult.steps.load = true;
        console.log('   ✅ [1] Módulo cargado');

        // Screenshot
        await page.screenshot({
          path: `test-results/smart-${testNum}-${moduleKey}-1-load.png`,
          timeout: 5000
        }).catch(() => {});

        // 2. Analizar y encontrar botón crear
        const createBtnInfo = await page.evaluate(() => {
          const keywords = ['nuevo', 'crear', 'agregar', 'new', 'create', 'add', '+', '➕'];
          const buttons = document.querySelectorAll('button, a[onclick], [onclick], .btn');

          for (const btn of buttons) {
            const text = (btn.textContent || '').toLowerCase().trim();
            const onclick = btn.getAttribute('onclick') || '';

            for (const kw of keywords) {
              if (text.includes(kw) || onclick.toLowerCase().includes(kw.replace('+', ''))) {
                return {
                  found: true,
                  text: btn.textContent?.trim().substring(0, 30),
                  onclick: onclick.substring(0, 50),
                  tag: btn.tagName
                };
              }
            }
          }
          return { found: false };
        });

        if (createBtnInfo.found) {
          moduleResult.steps.findCreate = true;
          console.log(`   ✅ [2] Botón crear: "${createBtnInfo.text}"`);

          // Click en botón crear
          await page.evaluate(() => {
            const keywords = ['nuevo', 'crear', 'agregar', 'new', 'create', 'add'];
            const buttons = document.querySelectorAll('button, a[onclick], [onclick], .btn');
            for (const btn of buttons) {
              const text = (btn.textContent || '').toLowerCase();
              const onclick = btn.getAttribute('onclick') || '';
              for (const kw of keywords) {
                if (text.includes(kw) || onclick.toLowerCase().includes(kw)) {
                  btn.click();
                  return true;
                }
              }
            }
            return false;
          });
          await page.waitForTimeout(1500);
        } else {
          console.log('   ⚠️ [2] No se encontró botón crear');
        }

        // 3. Detectar modal abierto
        const modalInfo = await page.evaluate(() => {
          // Buscar modales comunes
          const modalSelectors = [
            '.modal.show',
            '.modal[style*="display: block"]',
            '.modal[style*="display: flex"]',
            '[class*="modal"].active',
            '[class*="modal"][style*="flex"]',
            '[id*="modal"]:not([style*="none"])',
            '.overlay.active',
            '.popup.show'
          ];

          for (const selector of modalSelectors) {
            const modal = document.querySelector(selector);
            if (modal && modal.offsetParent !== null) {
              // Contar campos en el modal
              const inputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');
              const buttons = modal.querySelectorAll('button[type="submit"], [onclick*="save"], .btn-save');
              return {
                found: true,
                selector,
                inputCount: inputs.length,
                buttonCount: buttons.length
              };
            }
          }

          // Buscar formulario inline
          const forms = document.querySelectorAll('form');
          for (const form of forms) {
            const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
            if (inputs.length > 2 && form.offsetParent !== null) {
              return {
                found: true,
                selector: 'inline-form',
                inputCount: inputs.length,
                isInline: true
              };
            }
          }

          return { found: false };
        });

        if (modalInfo.found) {
          moduleResult.steps.openModal = true;
          console.log(`   ✅ [3] Modal/Form: ${modalInfo.inputCount} campos`);

          // Screenshot del modal
          await page.screenshot({
            path: `test-results/smart-${testNum}-${moduleKey}-2-modal.png`,
            timeout: 5000
          }).catch(() => {});
        } else {
          console.log('   ⚠️ [3] Modal no detectado');
        }

        // 4. Encontrar y analizar campos
        const fieldsInfo = await page.evaluate(() => {
          const fields = [];
          const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea');

          for (const input of inputs) {
            if (input.offsetParent === null) continue; // Skip hidden

            const name = input.name || input.id || '';
            const type = input.tagName.toLowerCase() === 'select' ? 'select' :
                        input.tagName.toLowerCase() === 'textarea' ? 'textarea' :
                        input.type || 'text';
            const label = input.previousElementSibling?.textContent ||
                         input.closest('label')?.textContent ||
                         input.placeholder || name;

            fields.push({
              name,
              type,
              label: label.substring(0, 30),
              tagName: input.tagName
            });
          }
          return fields;
        });

        if (fieldsInfo.length > 0) {
          moduleResult.steps.findFields = true;
          console.log(`   ✅ [4] Campos encontrados: ${fieldsInfo.length}`);
          // console.log(`       ${fieldsInfo.map(f => f.name || f.label).join(', ')}`);
        } else {
          console.log('   ⚠️ [4] Sin campos visibles');
        }

        // 5. Llenar campos
        const fillResult = await page.evaluate(() => {
          let filled = 0;
          const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea');

          for (const input of inputs) {
            if (input.offsetParent === null) continue;

            try {
              if (input.tagName === 'SELECT') {
                if (input.options.length > 1) {
                  input.selectedIndex = 1;
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                  filled++;
                }
              } else if (input.tagName === 'TEXTAREA') {
                input.value = 'Test E2E automático ' + new Date().toISOString();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filled++;
              } else if (input.type === 'date') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                input.value = tomorrow.toISOString().split('T')[0];
                input.dispatchEvent(new Event('change', { bubbles: true }));
                filled++;
              } else if (input.type === 'email') {
                input.value = 'test@e2e-auto.com';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filled++;
              } else if (input.type === 'number') {
                input.value = '100';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                filled++;
              } else if (input.type === 'text' || !input.type) {
                if (!input.value) {
                  input.value = 'Test E2E ' + Date.now();
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  filled++;
                }
              }
            } catch (e) {}
          }
          return filled;
        });

        if (fillResult > 0) {
          moduleResult.steps.fillFields = true;
          console.log(`   ✅ [5] Campos llenados: ${fillResult}`);

          // Screenshot con campos llenados
          await page.screenshot({
            path: `test-results/smart-${testNum}-${moduleKey}-3-filled.png`,
            timeout: 5000
          }).catch(() => {});
        } else {
          console.log('   ⚠️ [5] No se llenaron campos');
        }

        // 6. Guardar
        const saveResult = await page.evaluate(() => {
          const keywords = ['guardar', 'save', 'crear', 'create', 'enviar', 'submit', 'confirmar'];
          const buttons = document.querySelectorAll('button, input[type="submit"], [onclick]');

          for (const btn of buttons) {
            if (btn.offsetParent === null) continue;
            const text = (btn.textContent || '').toLowerCase();
            const type = btn.getAttribute('type');

            if (type === 'submit') {
              btn.click();
              return { clicked: true, text: btn.textContent };
            }

            for (const kw of keywords) {
              if (text.includes(kw)) {
                btn.click();
                return { clicked: true, text: btn.textContent };
              }
            }
          }
          return { clicked: false };
        });

        await page.waitForTimeout(2000);

        if (saveResult.clicked) {
          moduleResult.steps.save = true;
          console.log(`   ✅ [6] Save clickeado: "${saveResult.text?.substring(0, 20)}"`);
        } else {
          console.log('   ⚠️ [6] No se encontró botón guardar');
        }

        // Screenshot post-save
        await page.screenshot({
          path: `test-results/smart-${testNum}-${moduleKey}-4-saved.png`,
          timeout: 5000
        }).catch(() => {});

        // 7. Verificar resultado
        const verifyResult = await page.evaluate(() => {
          // Buscar indicadores de éxito
          const successIndicators = [
            '.alert-success',
            '.success',
            '.toast.success',
            '[class*="success"]',
            '.notification.success'
          ];

          for (const sel of successIndicators) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
              return { success: true, type: 'success-message' };
            }
          }

          // Verificar si el modal se cerró
          const modalOpen = document.querySelector('.modal.show, [class*="modal"].active');
          if (!modalOpen) {
            return { success: true, type: 'modal-closed' };
          }

          // Verificar si hay datos en tabla
          const rows = document.querySelectorAll('table tbody tr, .list-item, .card');
          if (rows.length > 0) {
            return { success: true, type: 'data-visible', count: rows.length };
          }

          return { success: false };
        });

        if (verifyResult.success) {
          moduleResult.steps.verify = true;
          console.log(`   ✅ [7] Verificado: ${verifyResult.type}`);
        } else {
          console.log('   ⚠️ [7] No se pudo verificar resultado');
        }

        // Evaluar resultado general
        const stepsCompleted = Object.values(moduleResult.steps).filter(Boolean).length;
        moduleResult.stepsCompleted = stepsCompleted;

        if (stepsCompleted >= 5) {
          results.passed++;
          moduleResult.status = 'PASS';
          console.log(`   ─── RESULTADO: ✅ PASS (${stepsCompleted}/7) ───`);
        } else if (stepsCompleted >= 3) {
          results.partial++;
          moduleResult.status = 'PARTIAL';
          console.log(`   ─── RESULTADO: ⚠️ PARTIAL (${stepsCompleted}/7) ───`);
        } else {
          results.failed++;
          moduleResult.status = 'FAIL';
          console.log(`   ─── RESULTADO: ❌ FAIL (${stepsCompleted}/7) ───`);
        }

      } catch (err) {
        results.failed++;
        moduleResult.status = 'ERROR';
        moduleResult.error = err.message;
        console.log(`   ❌ ERROR: ${err.message.substring(0, 50)}`);

        await page.screenshot({
          path: `test-results/smart-${testNum}-${moduleKey}-error.png`,
          timeout: 5000
        }).catch(() => {});
      }

      results.details.push(moduleResult);
    }

    // Resumen final
    console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FRONTEND CRUD SMART');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`   ✅ PASS:    ${results.passed}`);
    console.log(`   ⚠️ PARTIAL: ${results.partial}`);
    console.log(`   ❌ FAIL:    ${results.failed}`);

    const total = MODULES.length;
    const successRate = Math.round(((results.passed + results.partial * 0.5) / total) * 100);
    console.log(`\n   🎯 COBERTURA EFECTIVA: ${successRate}%`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    // Tabla detallada
    console.log('   DETALLE:');
    console.log('   ┌────────────────────────────┬────────┬───────────────────────┐');
    console.log('   │ Módulo                     │ Status │ Pasos                 │');
    console.log('   ├────────────────────────────┼────────┼───────────────────────┤');
    for (const d of results.details) {
      const steps = Object.entries(d.steps).map(([k, v]) => v ? '✓' : '·').join('');
      const status = d.status === 'PASS' ? '✅' : d.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`   │ ${d.key.padEnd(26)} │ ${status}     │ ${steps.padEnd(21)} │`);
    }
    console.log('   └────────────────────────────┴────────┴───────────────────────┘');
    console.log('   Pasos: L=Load F=FindCreate O=OpenModal F=FindFields F=Fill S=Save V=Verify\n');

    // Guardar JSON
    const fs = require('fs');
    fs.writeFileSync('test-results/frontend-crud-smart-results.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      passed: results.passed,
      partial: results.partial,
      failed: results.failed,
      coverage: `${successRate}%`,
      details: results.details
    }, null, 2));

    console.log('   📄 Resultados: test-results/frontend-crud-smart-results.json\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
  } finally {
    await browser.close();
  }

  process.exit(results.failed > results.passed ? 1 : 0);
}

main();
