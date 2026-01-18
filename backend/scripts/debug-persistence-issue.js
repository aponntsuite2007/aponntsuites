/**
 * DEBUG: Verificar qué muestra el DOM después de crear un registro
 * Este script identifica por qué READ/PERSISTENCE está fallando
 */

const { chromium } = require('playwright');

async function debugPersistence() {
  console.log('🔍 DEBUG: Analizando problema de persistencia en tabs\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    // Login (usando los selectores correctos del sistema)
    console.log('🔐 Haciendo login...');
    await page.goto('http://localhost:9998/panel-empresa.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('#companySelect', { timeout: 10000 });

    // Esperar a que las empresas carguen
    console.log('   Esperando empresas...');
    await page.waitForFunction(() => {
      const select = document.getElementById('companySelect');
      return select && select.options.length > 1;
    }, { timeout: 10000 });

    // Seleccionar empresa ISI
    await page.selectOption('#companySelect', 'isi');
    await page.waitForTimeout(5000);

    // Campo usuario (selector correcto: #userInput)
    await page.waitForSelector('#userInput:not([disabled])', { timeout: 15000 });
    await page.fill('#userInput', 'admin');
    await page.waitForTimeout(1000);

    // Campo password (selector correcto: #passwordInput)
    await page.waitForSelector('#passwordInput:not([disabled])', { timeout: 15000 });
    await page.fill('#passwordInput', 'admin123');

    // Click en login
    await page.click('#loginButton');
    await page.waitForTimeout(8000);

    console.log('✅ Login completado\n');

    // Navegar a Users
    console.log('🧭 Navegando a módulo Users...');
    await page.evaluate(() => {
      const userModule = document.querySelector('[data-module-key="users"]');
      if (userModule) userModule.click();
    });
    await page.waitForTimeout(3000);

    // Abrir employeeFileModal
    console.log('👁️ Abriendo modal de usuario...');
    await page.evaluate(() => {
      const viewBtn = document.querySelector('table tbody tr:first-child button.users-action-btn.view');
      if (viewBtn) viewBtn.click();
    });
    await page.waitForTimeout(3000);

    // === DEBUG TAB 2: Datos Personales ===
    console.log('\n📑 === TAB 2: Datos Personales ===');

    // Activar tab
    await page.evaluate(() => {
      const tab = document.querySelector('[onclick*="showFileTab(\'personal\')"]');
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    // Analizar estructura del tab
    const tab2Analysis = await page.evaluate(() => {
      const tabContent = document.getElementById('personal-tab');
      if (!tabContent) return { error: 'Tab no encontrado' };

      const tables = tabContent.querySelectorAll('table');
      const cards = tabContent.querySelectorAll('.card');
      const lists = tabContent.querySelectorAll('ul, ol');
      const buttons = tabContent.querySelectorAll('button');

      // Buscar sección de educación
      const educationSection = tabContent.querySelector('#education-list, [id*="education"], .education-section');
      const educationTable = tabContent.querySelector('table#education-table, table[id*="education"]');

      // Buscar todas las tablas y su contenido
      const tablesInfo = Array.from(tables).map(t => ({
        id: t.id || 'sin-id',
        rows: t.querySelectorAll('tbody tr').length,
        headers: Array.from(t.querySelectorAll('th')).map(th => th.textContent.trim()).slice(0, 5)
      }));

      // Buscar texto relacionado con educación
      const hasEducationText = tabContent.textContent.includes('Educación') ||
                               tabContent.textContent.includes('educación') ||
                               tabContent.textContent.includes('Education');

      return {
        totalTables: tables.length,
        totalCards: cards.length,
        totalLists: lists.length,
        totalButtons: buttons.length,
        tablesInfo,
        hasEducationSection: !!educationSection,
        hasEducationTable: !!educationTable,
        hasEducationText,
        educationSectionId: educationSection?.id || null,
        // Primeros 500 chars del contenido
        contentPreview: tabContent.textContent.substring(0, 500).replace(/\s+/g, ' ')
      };
    });

    console.log('📊 Análisis Tab 2:', JSON.stringify(tab2Analysis, null, 2));

    // Click en "+ Agregar" educación
    console.log('\n➕ Clickeando botón Agregar educación...');
    const addClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('#personal-tab button'));
      const addBtn = buttons.find(b =>
        b.textContent.includes('Agregar') &&
        b.getAttribute('onclick')?.includes('addEducation')
      );
      if (addBtn) {
        addBtn.click();
        return { success: true, onclick: addBtn.getAttribute('onclick') };
      }
      return { success: false, buttonsFound: buttons.length };
    });

    console.log('Click result:', addClicked);
    await page.waitForTimeout(3000);

    // Ver qué modal se abrió - DEBUG DETALLADO
    const modalAnalysis = await page.evaluate(() => {
      // Buscar TODOS los modales en el DOM
      const allModals = document.querySelectorAll('.modal, [class*="modal"], [id*="Modal"]');

      return {
        totalModals: allModals.length,
        modals: Array.from(allModals).map(m => ({
          id: m.id,
          className: m.className,
          display: getComputedStyle(m).display,
          visibility: getComputedStyle(m).visibility,
          zIndex: getComputedStyle(m).zIndex,
          hasInputs: m.querySelectorAll('input, select, textarea').length
        }))
      };
    });

    console.log('📋 Análisis de modales:', JSON.stringify(modalAnalysis, null, 2));

    // Verificar si educationModal específicamente existe y está visible
    const educationModalCheck = await page.evaluate(() => {
      const modal = document.getElementById('educationModal');
      if (!modal) return { exists: false };

      return {
        exists: true,
        display: modal.style.display,
        computedDisplay: getComputedStyle(modal).display,
        classList: modal.className,
        hasBackdrop: !!document.querySelector('.modal-backdrop'),
        innerHTMLPreview: modal.innerHTML.substring(0, 300)
      };
    });

    console.log('📋 educationModal específico:', JSON.stringify(educationModalCheck, null, 2));

    // Llenar formulario con datos únicos
    const testData = {
      institution: 'TEST_UNIVERSITY_' + Date.now(),
      degree: 'TEST_DEGREE_XYZ',
      graduationYear: '2020',
      gpa: '95'
    };

    console.log('\n✍️ Llenando formulario con:', testData);

    await page.fill('#institution', testData.institution);
    await page.fill('#degree', testData.degree);
    await page.fill('#graduationYear', testData.graduationYear);
    await page.fill('#gpa', testData.gpa);

    // Seleccionar tipo de educación
    await page.selectOption('#educationType', 'university');
    await page.selectOption('#status', 'completed');

    // Guardar
    console.log('💾 Guardando...');
    await page.evaluate(() => {
      const saveBtn = document.querySelector('#educationModal button.btn-primary');
      if (saveBtn) saveBtn.click();
    });
    await page.waitForTimeout(3000);

    // Verificar si apareció en la lista
    console.log('\n🔍 Verificando si apareció en la lista...');
    const afterCreate = await page.evaluate((testInstitution) => {
      const tabContent = document.getElementById('personal-tab');
      if (!tabContent) return { error: 'Tab no encontrado' };

      // Buscar el texto del registro creado
      const containsTestData = tabContent.textContent.includes(testInstitution);

      // Contar registros en tablas
      const tables = tabContent.querySelectorAll('table tbody');
      const allRows = Array.from(tables).flatMap(t => Array.from(t.querySelectorAll('tr')));

      // Buscar en cada fila
      const rowsWithTestData = allRows.filter(row =>
        row.textContent.includes(testInstitution)
      );

      return {
        containsTestData,
        totalRows: allRows.length,
        rowsWithTestData: rowsWithTestData.length,
        // Contenido de las filas encontradas
        matchingRowsContent: rowsWithTestData.map(r => r.textContent.substring(0, 100))
      };
    }, testData.institution);

    console.log('📊 Después de crear:', JSON.stringify(afterCreate, null, 2));

    // Ahora hacer F5 y verificar persistencia
    console.log('\n🔄 Haciendo F5 para verificar persistencia...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Re-login si es necesario
    const needsLogin = await page.$('#companySelect');
    if (needsLogin) {
      console.log('🔑 Re-login necesario...');
      await page.waitForFunction(() => {
        const select = document.getElementById('companySelect');
        return select && select.options.length > 1;
      }, { timeout: 10000 });
      await page.selectOption('#companySelect', 'isi');
      await page.waitForTimeout(5000);
      await page.waitForSelector('#userInput:not([disabled])', { timeout: 15000 });
      await page.fill('#userInput', 'admin');
      await page.waitForSelector('#passwordInput:not([disabled])', { timeout: 15000 });
      await page.fill('#passwordInput', 'admin123');
      await page.click('#loginButton');
      await page.waitForTimeout(8000);
    }

    // Navegar a Users
    await page.evaluate(() => {
      const userModule = document.querySelector('[data-module-key="users"]');
      if (userModule) userModule.click();
    });
    await page.waitForTimeout(3000);

    // Reabrir modal
    await page.evaluate(() => {
      const viewBtn = document.querySelector('table tbody tr:first-child button.users-action-btn.view');
      if (viewBtn) viewBtn.click();
    });
    await page.waitForTimeout(3000);

    // Activar tab personal
    await page.evaluate(() => {
      const tab = document.querySelector('[onclick*="showFileTab(\'personal\')"]');
      if (tab) tab.click();
    });
    await page.waitForTimeout(2000);

    // Verificar si el registro persiste
    console.log('\n🔍 Verificando persistencia después de F5...');
    const afterF5 = await page.evaluate((testInstitution) => {
      const tabContent = document.getElementById('personal-tab');
      if (!tabContent) return { error: 'Tab no encontrado' };

      const containsTestData = tabContent.textContent.includes(testInstitution);

      // Debug: mostrar todas las tablas y su contenido
      const tables = tabContent.querySelectorAll('table');
      const tablesDebug = Array.from(tables).map(t => {
        const rows = t.querySelectorAll('tbody tr');
        return {
          id: t.id || 'sin-id',
          rowCount: rows.length,
          rowsContent: Array.from(rows).map(r => r.textContent.trim().substring(0, 100))
        };
      });

      return {
        containsTestData,
        tablesDebug,
        fullContentLength: tabContent.textContent.length
      };
    }, testData.institution);

    console.log('📊 Después de F5:', JSON.stringify(afterF5, null, 2));

    if (afterF5.containsTestData) {
      console.log('\n✅ PERSISTENCIA VERIFICADA - El registro sobrevivió F5');
    } else {
      console.log('\n❌ PERSISTENCIA FALLÓ - El registro NO se encontró después de F5');
      console.log('   Posibles razones:');
      console.log('   1. El backend no guardó el registro');
      console.log('   2. El registro existe pero no se muestra en esta vista');
      console.log('   3. El registro se cargó pero con datos diferentes');
    }

    // Mantener browser abierto para inspección manual
    console.log('\n⏳ Browser abierto para inspección manual. Ctrl+C para cerrar.');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugPersistence();
