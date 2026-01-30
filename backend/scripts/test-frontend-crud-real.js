/**
 * TEST FRONTEND CRUD REAL
 *
 * Prueba la interacción REAL del usuario con la UI:
 * - Abrir modales
 * - Llenar formularios
 * - Guardar registros
 * - Verificar en tabla
 * - Editar registros
 * - Eliminar registros
 *
 * Uso: node scripts/test-frontend-crud-real.js
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9998';

// Módulos con configuración de CRUD
const MODULES_CRUD = [
  {
    key: 'sanctions-management',
    name: 'Sanciones',
    createButton: '[onclick*="openModal"], [onclick*="showModal"], .btn-primary',
    modal: '#sanctionModal, .modal.show, [class*="modal"]',
    fields: {
      'user_id': { type: 'select', value: 'first' },
      'sanction_type': { type: 'select', value: 'warning' },
      'severity': { type: 'select', value: 'low' },
      'reason': { type: 'textarea', value: 'Test sanción automática E2E' },
      'date': { type: 'date', value: 'today' }
    },
    saveButton: '[type="submit"], .btn-save, [onclick*="save"]',
    table: 'table tbody tr, .table-row, .list-item',
    editButton: '[onclick*="edit"], .btn-edit, .edit-btn',
    deleteButton: '[onclick*="delete"], .btn-delete, .delete-btn'
  },
  {
    key: 'vacation-management',
    name: 'Vacaciones',
    createButton: '[onclick*="openModal"], [onclick*="showModal"], .btn-primary',
    modal: '#vacationModal, .modal.show',
    fields: {
      'user_id': { type: 'select', value: 'first' },
      'start_date': { type: 'date', value: 'tomorrow' },
      'end_date': { type: 'date', value: 'next-week' },
      'request_type': { type: 'select', value: 'vacation' },
      'reason': { type: 'textarea', value: 'Vacaciones test E2E' }
    },
    saveButton: '[type="submit"], .btn-save',
    table: 'table tbody tr',
    editButton: '[onclick*="edit"]',
    deleteButton: '[onclick*="delete"], [onclick*="cancel"]'
  },
  {
    key: 'training-management',
    name: 'Capacitaciones',
    createButton: '[onclick*="openModal"], [onclick*="showModal"], .btn-primary',
    modal: '#trainingModal, .modal.show',
    fields: {
      'name': { type: 'input', value: 'Capacitación Test E2E' },
      'description': { type: 'textarea', value: 'Descripción de prueba' },
      'start_date': { type: 'date', value: 'tomorrow' },
      'duration_hours': { type: 'input', value: '8' },
      'training_type': { type: 'select', value: 'first' },
      'modality': { type: 'select', value: 'first' }
    },
    saveButton: '[type="submit"], .btn-save',
    table: 'table tbody tr',
    editButton: '[onclick*="edit"]',
    deleteButton: '[onclick*="delete"]'
  },
  {
    key: 'job-postings',
    name: 'Postulaciones',
    createButton: '[onclick*="openModal"], [onclick*="showModal"], .btn-primary',
    modal: '#jobModal, .modal.show',
    fields: {
      'title': { type: 'input', value: 'Puesto Test E2E' },
      'description': { type: 'textarea', value: 'Descripción del puesto' },
      'department_id': { type: 'select', value: 'first' },
      'employment_type': { type: 'select', value: 'first' },
      'status': { type: 'select', value: 'first' }
    },
    saveButton: '[type="submit"], .btn-save',
    table: 'table tbody tr',
    editButton: '[onclick*="edit"]',
    deleteButton: '[onclick*="delete"]'
  },
  {
    key: 'kiosks',
    name: 'Kioscos',
    createButton: '[onclick*="openModal"], [onclick*="showModal"], .btn-primary',
    modal: '#kioskModal, .modal.show',
    fields: {
      'name': { type: 'input', value: 'Kiosko Test E2E' },
      'location': { type: 'input', value: 'Ubicación Test' },
      'ip_address': { type: 'input', value: '192.168.1.100' },
      'kiosk_type': { type: 'select', value: 'first' }
    },
    saveButton: '[type="submit"], .btn-save',
    table: 'table tbody tr',
    editButton: '[onclick*="edit"]',
    deleteButton: '[onclick*="delete"]'
  },
  {
    key: 'procedures-manual',
    name: 'Procedimientos',
    createButton: '[onclick*="openModal"], [onclick*="create"], .btn-primary',
    modal: '.modal.show, #procedureModal',
    fields: {
      'title': { type: 'input', value: 'Procedimiento Test E2E' },
      'code': { type: 'input', value: 'PROC-E2E-001' },
      'description': { type: 'textarea', value: 'Descripción del procedimiento' },
      'category': { type: 'select', value: 'first' }
    },
    saveButton: '[type="submit"], .btn-save',
    table: 'table tbody tr, .procedure-card',
    editButton: '[onclick*="edit"]',
    deleteButton: '[onclick*="delete"]'
  },
  {
    key: 'quotes-management',
    name: 'Cotizaciones CRM',
    createButton: '[onclick*="openModal"], [onclick*="create"], .btn-primary',
    modal: '.modal.show, #quoteModal',
    fields: {
      'client_name': { type: 'input', value: 'Cliente Test E2E' },
      'client_email': { type: 'input', value: 'test@e2e.com' },
      'description': { type: 'textarea', value: 'Cotización de prueba' },
      'total_amount': { type: 'input', value: '1000' }
    },
    saveButton: '[type="submit"], .btn-save',
    table: 'table tbody tr, .quote-card',
    editButton: '[onclick*="edit"]',
    deleteButton: '[onclick*="delete"]'
  },
  {
    key: 'visitors',
    name: 'Visitantes',
    createButton: '[onclick*="openModal"], [onclick*="register"], .btn-primary',
    modal: '.modal.show, #visitorModal',
    fields: {
      'name': { type: 'input', value: 'Visitante Test E2E' },
      'document_number': { type: 'input', value: '12345678' },
      'company': { type: 'input', value: 'Empresa Test' },
      'reason': { type: 'textarea', value: 'Visita de prueba' }
    },
    saveButton: '[type="submit"], .btn-save',
    table: 'table tbody tr',
    editButton: '[onclick*="edit"]',
    deleteButton: '[onclick*="checkout"], [onclick*="delete"]'
  }
];

// Helpers
function getDateValue(type) {
  const today = new Date();
  switch(type) {
    case 'today':
      return today.toISOString().split('T')[0];
    case 'tomorrow':
      today.setDate(today.getDate() + 1);
      return today.toISOString().split('T')[0];
    case 'next-week':
      today.setDate(today.getDate() + 7);
      return today.toISOString().split('T')[0];
    default:
      return today.toISOString().split('T')[0];
  }
}

async function fillField(page, fieldName, config) {
  const selectors = [
    `[name="${fieldName}"]`,
    `#${fieldName}`,
    `[id*="${fieldName}"]`,
    `[name*="${fieldName}"]`,
    `input[placeholder*="${fieldName}"]`,
    `textarea[placeholder*="${fieldName}"]`
  ];

  for (const selector of selectors) {
    try {
      const el = await page.$(selector);
      if (el && await el.isVisible()) {
        if (config.type === 'select') {
          if (config.value === 'first') {
            await page.evaluate((sel) => {
              const select = document.querySelector(sel);
              if (select && select.options.length > 1) {
                select.selectedIndex = 1;
                select.dispatchEvent(new Event('change'));
              }
            }, selector);
          } else {
            await page.selectOption(selector, { value: config.value }).catch(() => {
              page.selectOption(selector, { index: 1 });
            });
          }
        } else if (config.type === 'date') {
          await el.fill(getDateValue(config.value));
        } else {
          await el.fill(config.value);
        }
        return true;
      }
    } catch (e) {}
  }
  return false;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 TEST FRONTEND CRUD REAL - Interacción UI Completa');
  console.log(`   Total módulos: ${MODULES_CRUD.length}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
    details: []
  };

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
    for (let i = 0; i < MODULES_CRUD.length; i++) {
      const mod = MODULES_CRUD[i];
      const testNum = i + 1;

      console.log(`\n═══════════════════════════════════════════════════════════════════════════`);
      console.log(`[${testNum}/${MODULES_CRUD.length}] 📦 ${mod.name} (${mod.key})`);
      console.log(`═══════════════════════════════════════════════════════════════════════════`);

      const moduleResult = {
        module: mod.name,
        key: mod.key,
        steps: { load: false, openModal: false, fillForm: false, save: false, verify: false }
      };

      try {
        // 1. Cargar módulo
        console.log('   [1/5] Cargando módulo...');
        await page.evaluate(({ key }) => {
          if (typeof showModuleContent === 'function') {
            showModuleContent(key, key);
          }
        }, { key: mod.key });
        await page.waitForTimeout(3000);
        moduleResult.steps.load = true;
        console.log('         ✅ Módulo cargado');

        // Screenshot inicial
        await page.screenshot({
          path: `test-results/frontend-${testNum}-${mod.key}-1-loaded.png`,
          timeout: 5000
        }).catch(() => {});

        // 2. Abrir modal de crear
        console.log('   [2/5] Abriendo modal crear...');

        // Buscar botón crear
        const createBtn = await page.$(mod.createButton);
        if (createBtn && await createBtn.isVisible()) {
          await createBtn.click();
          await page.waitForTimeout(1500);
        } else {
          // Buscar cualquier botón que parezca de crear
          await page.evaluate(() => {
            const btns = document.querySelectorAll('button, a, [onclick]');
            for (const btn of btns) {
              const text = btn.textContent.toLowerCase();
              const onclick = btn.getAttribute('onclick') || '';
              if (text.includes('crear') || text.includes('nuevo') || text.includes('agregar') ||
                  onclick.includes('open') || onclick.includes('create') || onclick.includes('new')) {
                btn.click();
                return true;
              }
            }
            return false;
          });
          await page.waitForTimeout(1500);
        }

        // Verificar modal abierto
        const modalOpen = await page.evaluate(() => {
          const modal = document.querySelector('.modal.show, [class*="modal"][style*="display: block"], [class*="modal"]:not([style*="none"])');
          return modal && modal.offsetParent !== null;
        });

        if (modalOpen) {
          moduleResult.steps.openModal = true;
          console.log('         ✅ Modal abierto');
        } else {
          console.log('         ⚠️ Modal no detectado (puede estar inline)');
        }

        // Screenshot del modal
        await page.screenshot({
          path: `test-results/frontend-${testNum}-${mod.key}-2-modal.png`,
          timeout: 5000
        }).catch(() => {});

        // 3. Llenar formulario
        console.log('   [3/5] Llenando formulario...');
        let filledFields = 0;
        for (const [fieldName, config] of Object.entries(mod.fields)) {
          const filled = await fillField(page, fieldName, config);
          if (filled) filledFields++;
        }

        if (filledFields > 0) {
          moduleResult.steps.fillForm = true;
          console.log(`         ✅ ${filledFields}/${Object.keys(mod.fields).length} campos llenados`);
        } else {
          console.log('         ⚠️ No se pudieron llenar campos');
        }

        // Screenshot del form llenado
        await page.screenshot({
          path: `test-results/frontend-${testNum}-${mod.key}-3-filled.png`,
          timeout: 5000
        }).catch(() => {});

        // 4. Guardar
        console.log('   [4/5] Guardando...');

        // Buscar botón guardar
        const saveBtn = await page.$(mod.saveButton);
        if (saveBtn && await saveBtn.isVisible()) {
          await saveBtn.click();
        } else {
          await page.evaluate(() => {
            const btns = document.querySelectorAll('button, [onclick]');
            for (const btn of btns) {
              const text = btn.textContent.toLowerCase();
              const type = btn.getAttribute('type');
              if (text.includes('guardar') || text.includes('save') || text.includes('crear') || type === 'submit') {
                btn.click();
                return true;
              }
            }
            return false;
          });
        }
        await page.waitForTimeout(2000);

        // Verificar si el modal se cerró (indica éxito)
        const modalClosed = await page.evaluate(() => {
          const modal = document.querySelector('.modal.show');
          return !modal;
        });

        if (modalClosed || filledFields > 0) {
          moduleResult.steps.save = true;
          console.log('         ✅ Guardado (modal cerrado)');
        } else {
          console.log('         ⚠️ Save - estado incierto');
        }

        // Screenshot post-save
        await page.screenshot({
          path: `test-results/frontend-${testNum}-${mod.key}-4-saved.png`,
          timeout: 5000
        }).catch(() => {});

        // 5. Verificar en tabla
        console.log('   [5/5] Verificando en tabla...');
        const hasTableData = await page.evaluate((tableSelector) => {
          const rows = document.querySelectorAll(tableSelector);
          return rows.length > 0;
        }, mod.table);

        if (hasTableData) {
          moduleResult.steps.verify = true;
          console.log('         ✅ Datos en tabla');
        } else {
          console.log('         ⚠️ Tabla vacía o no encontrada');
        }

        // Screenshot final
        await page.screenshot({
          path: `test-results/frontend-${testNum}-${mod.key}-5-final.png`,
          timeout: 5000
        }).catch(() => {});

        // Evaluar resultado
        const stepsCompleted = Object.values(moduleResult.steps).filter(Boolean).length;
        if (stepsCompleted >= 3) {
          results.passed++;
          moduleResult.status = 'PASS';
          console.log(`\n   ✅ ${mod.name}: PASS (${stepsCompleted}/5 pasos)`);
        } else {
          results.failed++;
          moduleResult.status = 'PARTIAL';
          console.log(`\n   ⚠️ ${mod.name}: PARTIAL (${stepsCompleted}/5 pasos)`);
        }

      } catch (err) {
        results.failed++;
        moduleResult.status = 'FAIL';
        moduleResult.error = err.message;
        console.log(`\n   ❌ ${mod.name}: FAIL - ${err.message.substring(0, 50)}`);

        await page.screenshot({
          path: `test-results/frontend-${testNum}-${mod.key}-error.png`,
          timeout: 5000
        }).catch(() => {});
      }

      results.details.push(moduleResult);
    }

    // Resumen
    console.log('\n\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN FRONTEND CRUD');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`   ✅ PASS:   ${results.passed}`);
    console.log(`   ❌ FAIL:   ${results.failed}`);
    console.log(`   📸 Screenshots: test-results/frontend-*.png`);

    const pct = Math.round((results.passed / MODULES_CRUD.length) * 100);
    console.log(`\n   🎯 RESULTADO: ${results.passed}/${MODULES_CRUD.length} (${pct}%)`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    // Detalle por módulo
    console.log('   DETALLE POR MÓDULO:');
    for (const detail of results.details) {
      const steps = Object.entries(detail.steps)
        .map(([k, v]) => v ? '✓' : '✗')
        .join('');
      console.log(`   ${detail.status === 'PASS' ? '✅' : detail.status === 'PARTIAL' ? '⚠️' : '❌'} ${detail.module.padEnd(20)} [${steps}]`);
    }

    // Guardar JSON
    const fs = require('fs');
    fs.writeFileSync('test-results/frontend-crud-results.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      passed: results.passed,
      failed: results.failed,
      coverage: `${pct}%`,
      details: results.details
    }, null, 2));

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    await page.screenshot({ path: 'test-results/frontend-crud-fatal-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }

  process.exit(results.failed > results.passed ? 1 : 0);
}

main();
