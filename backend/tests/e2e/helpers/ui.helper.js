/**
 * ═══════════════════════════════════════════════════════════
 * UI HELPER - Sistema Unificado de Interacción UI
 * ═══════════════════════════════════════════════════════════
 *
 * Funciones que simulan acciones humanas en el navegador:
 * - Navegar a módulos
 * - Abrir/cerrar modales
 * - Llenar formularios
 * - Click en botones
 * - Esperar elementos
 */

/**
 * Navegar a un módulo específico
 * @param {Page} page
 * @param {string} moduleKey - Ej: 'users', 'medical', 'attendance'
 * @returns {Promise<boolean>} true si navegó exitosamente
 */
async function navigateToModule(page, moduleKey) {
  console.log(`   📂 Navegando a módulo: ${moduleKey}`);

  // Mapeo de módulos a nombres completos
  const moduleNames = {
    'users': 'Gestión de Usuarios',
    'medical': 'Gestión Médica',
    'attendance': 'Control de Asistencia',
    'vacation-management': 'Gestión de Vacaciones',
    'dms-dashboard': 'Gestión Documental (DMS)',
    'employee-360': 'Mi Espacio',
    'hour-bank': 'Banco de Horas',
    'departments': 'Departamentos',
    'kiosks': 'Gestión de Kioscos'
  };

  const moduleName = moduleNames[moduleKey] || moduleKey;

  try {
    // Ejecutar showModuleContent directamente
    await page.evaluate(({ key, name }) => {
      if (typeof showModuleContent === 'function') {
        console.log(`🎯 Llamando showModuleContent('${key}', '${name}')`);
        showModuleContent(key, name);
      } else {
        throw new Error('showModuleContent no está definida');
      }
    }, { key: moduleKey, name: moduleName });

    await page.waitForTimeout(1500); // Esperar que cargue el módulo
    console.log(`   ✅ Navegado a ${moduleName}`);
    return true;
  } catch (err) {
    console.log(`   ⚠️  No se pudo navegar a ${moduleKey}: ${err.message}`);
    return false;
  }
}

/**
 * Abrir modal de "Agregar" (genérico)
 * @param {Page} page
 * @param {string} modalType - Ej: 'User', 'Medical', 'Attendance'
 * @returns {Promise<boolean>}
 */
async function openAddModal(page, modalType = 'User') {
  console.log(`   ➕ Abriendo modal agregar ${modalType}...`);

  const selectors = [
    `button[onclick="showAdd${modalType}()"]`,
    `button:has-text("Agregar ${modalType}")`,
    `button:has-text("Nuevo ${modalType}")`,
    `[data-action="add-${modalType.toLowerCase()}"]`,
    `.btn-add-${modalType.toLowerCase()}`
  ];

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        await page.waitForTimeout(500);
        console.log(`   ✅ Modal abierto`);
        return true;
      }
    } catch (err) {
      continue;
    }
  }

  console.log(`   ⚠️  No se pudo abrir modal`);
  return false;
}

/**
 * Llenar formulario de usuario (modal agregar)
 * @param {Page} page
 * @param {object} userData - Datos del usuario
 */
async function fillUserForm(page, userData) {
  console.log(`   📝 Llenando formulario de usuario...`);

  // Esperar que el modal esté visible
  await page.waitForTimeout(500);

  // Llenar campos (IDs del modal en users.js)
  if (userData.name) {
    await page.fill('#newUserName', userData.name);
  }

  if (userData.email) {
    await page.fill('#newUserEmail', userData.email);
  }

  if (userData.legajo) {
    await page.fill('#newUserLegajo', userData.legajo);
  }

  if (userData.dni) {
    const dniField = await page.$('#newUserDNI');
    if (dniField) {
      await page.fill('#newUserDNI', userData.dni);
    }
  }

  if (userData.password) {
    await page.fill('#newUserPassword', userData.password);
  }

  if (userData.role) {
    await page.selectOption('#newUserRole', userData.role);
  }

  console.log(`   ✅ Formulario llenado`);
}

/**
 * Click en botón "Guardar" del modal
 * @param {Page} page
 * @param {string} saveFunction - Ej: 'saveNewUser', 'saveMedical'
 * @returns {Promise<boolean>}
 */
async function clickSaveButton(page, saveFunction = 'saveNewUser') {
  console.log(`   💾 Guardando...`);

  const selectors = [
    `button[onclick="${saveFunction}()"]`,
    `button:has-text("Guardar")`,
    `button:has-text("Crear")`,
    `.btn-save`,
    `.btn-primary:has-text("Guardar")`
  ];

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        await page.waitForTimeout(1500); // Esperar respuesta del servidor
        console.log(`   ✅ Guardado`);
        return true;
      }
    } catch (err) {
      continue;
    }
  }

  console.log(`   ⚠️  No se pudo guardar`);
  return false;
}

/**
 * Verificar que un elemento aparece en la UI
 * @param {Page} page
 * @param {string} text - Texto a buscar
 * @param {number} timeout - Timeout en ms
 * @returns {Promise<boolean>}
 */
async function waitForElementWithText(page, text, timeout = 5000) {
  try {
    await page.waitForSelector(`text=${text}`, { timeout });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Abrir modal de edición de un elemento
 * @param {Page} page
 * @param {string} identifier - Texto que identifica la fila (ej: nombre usuario)
 * @returns {Promise<boolean>}
 */
async function openEditModal(page, identifier) {
  console.log(`   ✏️  Abriendo modal de edición: ${identifier}`);

  try {
    // Buscar la fila que contiene el identifier
    const row = await page.locator(`tr:has-text("${identifier}")`).first();

    // Buscar botón de editar en esa fila
    const editButton = row.locator('button:has-text("Editar"), button.btn-edit, [data-action="edit"]').first();

    await editButton.click();
    await page.waitForTimeout(500);

    console.log(`   ✅ Modal de edición abierto`);
    return true;
  } catch (err) {
    console.log(`   ⚠️  No se pudo abrir modal de edición: ${err.message}`);
    return false;
  }
}

/**
 * Eliminar un elemento de la tabla
 * @param {Page} page
 * @param {string} identifier - Texto que identifica la fila
 * @returns {Promise<boolean>}
 */
async function deleteTableRow(page, identifier) {
  console.log(`   🗑️  Eliminando: ${identifier}`);

  try {
    // Buscar la fila
    const row = await page.locator(`tr:has-text("${identifier}")`).first();

    // Buscar botón de eliminar
    const deleteButton = row.locator('button:has-text("Eliminar"), button.btn-delete, [data-action="delete"]').first();

    await deleteButton.click();
    await page.waitForTimeout(300);

    // Confirmar (si hay modal de confirmación)
    const confirmButton = await page.$('button:has-text("Confirmar"), button:has-text("Sí"), button:has-text("Aceptar")');
    if (confirmButton) {
      await confirmButton.click();
    }

    await page.waitForTimeout(1000);

    console.log(`   ✅ Elemento eliminado`);
    return true;
  } catch (err) {
    console.log(`   ⚠️  No se pudo eliminar: ${err.message}`);
    return false;
  }
}

/**
 * Contar filas de una tabla
 * @param {Page} page
 * @param {string} tableSelector - Selector de la tabla
 * @returns {Promise<number>}
 */
async function countTableRows(page, tableSelector = 'table tbody tr') {
  const rows = await page.$$(tableSelector);
  return rows.length;
}

/**
 * Esperar a que aparezca el spinner de carga y desaparezca
 * @param {Page} page
 * @param {number} timeout
 */
async function waitForLoading(page, timeout = 10000) {
  try {
    // Esperar que aparezca el spinner
    await page.waitForSelector('.loading, .spinner, [data-loading="true"]', {
      state: 'visible',
      timeout: 2000
    }).catch(() => {});

    // Esperar que desaparezca
    await page.waitForSelector('.loading, .spinner, [data-loading="true"]', {
      state: 'hidden',
      timeout
    }).catch(() => {});
  } catch (err) {
    // Si no hay spinner, continuar
  }
}

/**
 * Tomar screenshot con nombre descriptivo
 * @param {Page} page
 * @param {string} name - Nombre del screenshot
 * @param {string} folder - Carpeta (default: test-results)
 */
async function takeScreenshot(page, name, folder = 'test-results') {
  const path = `${folder}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`   📸 Screenshot: ${path}`);
}

module.exports = {
  navigateToModule,
  openAddModal,
  fillUserForm,
  clickSaveButton,
  waitForElementWithText,
  openEditModal,
  deleteTableRow,
  countTableRows,
  waitForLoading,
  takeScreenshot
};
