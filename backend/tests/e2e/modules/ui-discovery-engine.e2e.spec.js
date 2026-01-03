/**
 * UI DISCOVERY ENGINE - INSPECCIÓN COMPLETA DE MÓDULOS
 *
 * Objetivo: Inspeccionar cada módulo como lo haría un humano:
 * - ¿Qué acciones tiene? (crear, editar, ver, exportar, etc.)
 * - ¿Qué modales tiene y qué contienen?
 * - ¿Qué campos tiene cada modal?
 * - ¿Cuál es la naturaleza de cada campo? (editable, readonly, computed, SSOT)
 * - ¿Qué relaciones tiene con otros módulos?
 * - ¿Qué validaciones tiene?
 *
 * NO ASUME NADA - DESCUBRE TODO
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Función helper para extraer texto visible de un elemento
async function getVisibleText(element) {
  try {
    const text = await element.textContent();
    return text ? text.trim() : '';
  } catch {
    return '';
  }
}

// Función helper para extraer atributos útiles
async function getElementAttributes(element) {
  try {
    return {
      id: await element.getAttribute('id'),
      name: await element.getAttribute('name'),
      class: await element.getAttribute('class'),
      type: await element.getAttribute('type'),
      placeholder: await element.getAttribute('placeholder'),
      required: await element.getAttribute('required') !== null,
      readonly: await element.getAttribute('readonly') !== null,
      disabled: await element.getAttribute('disabled') !== null,
      onclick: await element.getAttribute('onclick'),
      'data-action': await element.getAttribute('data-action'),
      'data-module': await element.getAttribute('data-module')
    };
  } catch {
    return {};
  }
}

test.describe('Discovery Engine - Inspección Completa', () => {

  let discoveryResults = {
    module: '',
    discoveredAt: new Date().toISOString(),
    entryPoint: {},
    actions: [],
    modals: [],
    relationships: [],
    validations: []
  };

  test.beforeAll(async () => {
    // Módulo a inspeccionar (puede venir de ENV o parámetro)
    discoveryResults.module = process.env.MODULE_TO_DISCOVER || 'users';
  });

  test('PASO 1: Descubrir punto de entrada al módulo', async ({ page }) => {
    console.log(`\n🔍 DISCOVERY: Inspeccionando módulo "${discoveryResults.module}"\n`);

    // PASO 0: LOGIN COMPLETO (3 pasos)
    console.log('🔐 Realizando login...');
    await page.goto('http://localhost:9998/panel-empresa.html');
    await page.waitForTimeout(1500);

    // Esperar que aparezca la pantalla de login
    await page.waitForSelector('#company-login-form, .login-container', { timeout: 10000 });

    // PASO 1: Seleccionar empresa ISI
    const companySelect = page.locator('#company-select, select[name="company"]').first();
    await companySelect.waitFor({ state: 'visible', timeout: 10000 });
    await companySelect.selectOption({ label: 'ISI' });
    await page.waitForTimeout(500);

    // PASO 2: Ingresar usuario
    const userInput = page.locator('#username, input[name="username"]').first();
    await userInput.fill('admin');
    await page.waitForTimeout(500);

    // PASO 3: Ingresar password y submit
    const passwordInput = page.locator('#password, input[name="password"]').first();
    await passwordInput.fill('admin');
    await page.waitForTimeout(500);

    const loginBtn = page.locator('button[type="submit"], .btn-login').first();
    await loginBtn.click();

    // Esperar a que cargue el dashboard
    await page.waitForTimeout(3000);
    console.log('✅ Login completado\n');

    // Buscar TODOS los elementos clickeables que puedan abrir el módulo
    const possibleEntries = await page.locator('button, a, [onclick], [data-module]').all();

    for (const entry of possibleEntries) {
      const text = await getVisibleText(entry);
      const attrs = await getElementAttributes(entry);

      // Verificar si este elemento abre nuestro módulo
      const moduleMatch =
        text.toLowerCase().includes(discoveryResults.module) ||
        attrs['data-module'] === discoveryResults.module ||
        (attrs.onclick && attrs.onclick.includes(discoveryResults.module)) ||
        attrs.id === `btn-${discoveryResults.module}`;

      if (moduleMatch) {
        discoveryResults.entryPoint = {
          text,
          selector: attrs.id ? `#${attrs.id}` : attrs.class ? `.${attrs.class.split(' ')[0]}` : null,
          attributes: attrs,
          discoveryMethod: 'pattern_match'
        };

        console.log(`✅ Punto de entrada encontrado: "${text}"`);
        console.log(`   Selector: ${discoveryResults.entryPoint.selector}`);
        break;
      }
    }

    if (!discoveryResults.entryPoint.selector) {
      console.log('⚠️  No se encontró punto de entrada automático');
      discoveryResults.entryPoint = {
        text: 'MANUAL_DISCOVERY_NEEDED',
        selector: null,
        discoveryMethod: 'manual_required'
      };
    }
  });

  test('PASO 2: Descubrir TODAS las acciones disponibles', async ({ page }) => {
    console.log('\n🔍 PASO 2: Descubriendo acciones...\n');

    // Click en punto de entrada si existe
    if (discoveryResults.entryPoint.selector) {
      await page.click(discoveryResults.entryPoint.selector);
      await page.waitForTimeout(1500);
    }

    // Buscar TODOS los botones/acciones dentro del módulo
    const actionElements = await page.locator('button, a.btn, [role="button"], .action-btn').all();

    for (const actionEl of actionElements) {
      const text = await getVisibleText(actionEl);
      const attrs = await getElementAttributes(actionEl);

      // Clasificar acción por keywords (NO asumir nombres específicos)
      let actionType = 'UNKNOWN';
      const textLower = text.toLowerCase();
      const onclickLower = (attrs.onclick || '').toLowerCase();
      const combined = textLower + ' ' + onclickLower;

      if (/crear|nuevo|agregar|add|new|create/i.test(combined)) {
        actionType = 'CREATE';
      } else if (/editar|modificar|edit|update/i.test(combined)) {
        actionType = 'EDIT';
      } else if (/eliminar|borrar|delete|remove/i.test(combined)) {
        actionType = 'DELETE';
      } else if (/ver|detalle|detail|view|show/i.test(combined)) {
        actionType = 'VIEW';
      } else if (/exportar|export|descargar|download/i.test(combined)) {
        actionType = 'EXPORT';
      } else if (/importar|import|cargar|upload/i.test(combined)) {
        actionType = 'IMPORT';
      } else if (/buscar|search|filtrar|filter/i.test(combined)) {
        actionType = 'SEARCH';
      } else if (/refrescar|refresh|actualizar|reload/i.test(combined)) {
        actionType = 'REFRESH';
      }

      discoveryResults.actions.push({
        type: actionType,
        text,
        selector: attrs.id ? `#${attrs.id}` : null,
        attributes: attrs,
        visible: await actionEl.isVisible().catch(() => false)
      });

      console.log(`   Acción encontrada: [${actionType}] "${text}"`);
    }

    console.log(`\n✅ Total acciones descubiertas: ${discoveryResults.actions.length}`);
  });

  test('PASO 3: Descubrir estructura del modal CREATE', async ({ page }) => {
    console.log('\n🔍 PASO 3: Inspeccionando modal CREATE...\n');

    await discoverModalForAction(page, 'CREATE');
  });

  test('PASO 4: Descubrir estructura del modal VIEW/EDIT', async ({ page }) => {
    console.log('\n🔍 PASO 4: Inspeccionando modal VIEW/EDIT...\n');

    // El usuario explicó: Users tiene botones VER con modal de 10 TABS
    await discoverModalForAction(page, 'VIEW');
    await discoverModalForAction(page, 'EDIT');
  });

  async function discoverModalForAction(page, actionType) {
    // Buscar acción del tipo especificado
    const action = discoveryResults.actions.find(a => a.type === actionType);

    if (!action) {
      console.log(`⚠️  No se encontró acción ${actionType}`);
      return;
    }

    console.log(`   Disparando acción ${actionType}: "${action.text}"`);

    // Click en acción
    if (action.selector) {
      await page.click(action.selector);
    } else if (action.text) {
      await page.getByText(action.text).first().click();
    }

    await page.waitForTimeout(1500);

    // Descubrir modal abierto
    const modalSelectors = ['.modal.show', '[role="dialog"]', '.modal-content', '#modal', '.popup'];
    let modal = null;

    for (const selector of modalSelectors) {
      modal = page.locator(selector).first();
      if (await modal.isVisible().catch(() => false)) {
        console.log(`✅ Modal encontrado con selector: ${selector}`);
        break;
      }
    }

    if (!modal) {
      console.log(`❌ No se pudo detectar modal ${actionType}`);
      return;
    }

    // Descubrir estructura del modal
    const modalStructure = {
      type: actionType,
      triggerAction: action.text,
      fields: [],
      tabs: [],
      relationships: []
    };

    // DESCUBRIR TABS (si existen)
    const tabs = await modal.locator('[role="tab"], .nav-link, .tab-item').all();
    for (const tab of tabs) {
      const tabText = await getVisibleText(tab);
      const tabAttrs = await getElementAttributes(tab);

      modalStructure.tabs.push({
        text: tabText,
        attributes: tabAttrs
      });

      console.log(`   Tab encontrado: "${tabText}"`);
    }

    // DESCUBRIR TODOS LOS CAMPOS
    const inputs = await modal.locator('input, select, textarea').all();

    for (const input of inputs) {
      const tagName = await input.evaluate(el => el.tagName.toLowerCase());
      const attrs = await getElementAttributes(input);

      // Buscar label asociado
      let label = '';
      if (attrs.id) {
        const labelEl = await modal.locator(`label[for="${attrs.id}"]`).first();
        label = await getVisibleText(labelEl).catch(() => '');
      }
      if (!label) {
        // Buscar label padre o hermano
        const parent = await input.locator('..').first();
        const parentLabel = await parent.locator('label').first();
        label = await getVisibleText(parentLabel).catch(() => '');
      }

      // Determinar naturaleza del campo
      let fieldNature = 'EDITABLE';
      if (attrs.readonly || attrs.disabled) {
        fieldNature = 'READONLY';
      }
      if (attrs.type === 'hidden') {
        fieldNature = 'HIDDEN';
      }

      // Detectar si es un lookup/foreign key
      let isRelationship = false;
      let relationshipTo = null;
      if (tagName === 'select') {
        const options = await input.locator('option').all();
        if (options.length > 1) {
          isRelationship = true;
          // Intentar detectar a qué módulo apunta por el nombre
          const nameLower = (attrs.name || '').toLowerCase();
          if (nameLower.includes('empresa') || nameLower.includes('company')) {
            relationshipTo = 'companies';
          } else if (nameLower.includes('departamento') || nameLower.includes('department')) {
            relationshipTo = 'departments';
          } else if (nameLower.includes('usuario') || nameLower.includes('user')) {
            relationshipTo = 'users';
          }
          // ... más detecciones
        }
      }

      const fieldDiscovery = {
        label,
        name: attrs.name,
        type: attrs.type || tagName,
        tagName,
        required: attrs.required,
        readonly: attrs.readonly,
        disabled: attrs.disabled,
        placeholder: attrs.placeholder,
        nature: fieldNature,
        isRelationship,
        relationshipTo,
        validations: {
          required: attrs.required,
          pattern: await input.getAttribute('pattern'),
          min: await input.getAttribute('min'),
          max: await input.getAttribute('max'),
          minlength: await input.getAttribute('minlength'),
          maxlength: await input.getAttribute('maxlength')
        }
      };

      modalStructure.fields.push(fieldDiscovery);

      console.log(`   Campo: "${label || attrs.name}" (${fieldNature}) - ${tagName}:${attrs.type || 'text'}`);

      if (isRelationship) {
        console.log(`      └─ Relación detectada → ${relationshipTo || 'UNKNOWN'}`);
        modalStructure.relationships.push({
          field: attrs.name,
          targetModule: relationshipTo,
          type: 'FOREIGN_KEY'
        });
      }
    }

    discoveryResults.modals.push(modalStructure);

    console.log(`\n✅ Modal ${actionType} inspeccionado:`);
    console.log(`   - ${modalStructure.fields.length} campos`);
    console.log(`   - ${modalStructure.tabs.length} tabs`);
    console.log(`   - ${modalStructure.relationships.length} relaciones`);

    // Cerrar modal antes de continuar
    const closeBtn = await modal.locator('[data-dismiss="modal"], .btn-close, .close').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  test('PASO 5: Descubrir validaciones y reglas de negocio', async ({ page }) => {
    console.log('\n🔍 PASO 5: Descubriendo validaciones...\n');

    // Intentar submit del modal vacío para descubrir validaciones
    const submitBtn = page.locator('button[type="submit"], .btn-save, .btn-guardar').first();

    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(500);

      // Buscar mensajes de error/validación
      const errorMessages = await page.locator('.invalid-feedback, .error-message, .alert-danger, .text-danger').all();

      for (const errorEl of errorMessages) {
        const errorText = await getVisibleText(errorEl);
        if (errorText) {
          discoveryResults.validations.push({
            message: errorText,
            type: 'REQUIRED_FIELD',
            trigger: 'EMPTY_SUBMIT'
          });
          console.log(`   Validación: "${errorText}"`);
        }
      }
    }

    console.log(`\n✅ Total validaciones descubiertas: ${discoveryResults.validations.length}`);
  });

  test.afterAll(async () => {
    // Guardar resultados del discovery
    const outputDir = path.join(__dirname, '../discovery-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `${discoveryResults.module}.discovery.json`);
    fs.writeFileSync(outputFile, JSON.stringify(discoveryResults, null, 2));

    console.log(`\n\n📊 ========== RESUMEN DISCOVERY ==========`);
    console.log(`   Módulo: ${discoveryResults.module}`);
    console.log(`   Punto de entrada: ${discoveryResults.entryPoint.text}`);
    console.log(`   Acciones descubiertas: ${discoveryResults.actions.length}`);
    console.log(`   Modales inspeccionados: ${discoveryResults.modals.length}`);
    console.log(`   Relaciones detectadas: ${discoveryResults.modals.reduce((sum, m) => sum + m.relationships.length, 0)}`);
    console.log(`   Validaciones: ${discoveryResults.validations.length}`);
    console.log(`\n   📁 Resultados guardados en: ${outputFile}`);
    console.log(`==========================================\n`);
  });
});
