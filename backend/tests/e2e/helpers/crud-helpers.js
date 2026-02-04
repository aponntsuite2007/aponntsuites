/**
 * ═══════════════════════════════════════════════════════════════════════
 * CRUD HELPERS - Funciones para hacer CRUD real en el frontend
 * ═══════════════════════════════════════════════════════════════════════
 */

const { verifyRecordExists, verifyRecordDeleted, getLastCreatedRecord } = require('./db-helpers');

/**
 * CREATE: Crear un registro en el módulo
 */
async function createRecord(page, moduleConfig) {
  console.log(`   📝 [CRUD] CREATE: ${moduleConfig.name}...`);

  try {
    // 1. Click en botón crear
    console.log(`      🔍 Buscando botón: "${moduleConfig.createButtonText}"`);

    const createButton = page.locator(`button:has-text("${moduleConfig.createButtonText}")`).first();
    await createButton.waitFor({ timeout: 10000 });
    await createButton.click();
    await page.waitForTimeout(1000);

    // 2. Esperar modal/formulario
    console.log(`      ⏳ Esperando modal/formulario...`);

    // Intentar múltiples selectores comunes de modales
    const modalSelectors = [
      '.modal.show',                    // Bootstrap 5
      '.modal.in',                      // Bootstrap 3/4
      '[role="dialog"]',                // ARIA dialog
      '.modal-content',                 // Contenido de modal
      '#userModal',                     // Modal específico de usuarios
      '[id$="Modal"]',                  // Cualquier ID que termine en "Modal"
      'form.modal-form',                // Formulario modal
      '.dialog',                        // Dialog genérico
      '[data-modal]'                    // Data attribute
    ];

    let modalFound = false;
    for (const selector of modalSelectors) {
      try {
        await page.waitForSelector(selector, {
          state: 'visible',
          timeout: 2000
        });
        console.log(`      ✅ Modal encontrado: ${selector}`);
        modalFound = true;
        break;
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }

    if (!modalFound) {
      // Fallback: Esperar cualquier cambio en el DOM que indique modal abierto
      await page.waitForTimeout(2000);
      const hasModal = await page.evaluate(() => {
        // Verificar si hay algún elemento modal visible
        const modals = document.querySelectorAll('.modal, [role="dialog"], [id*="modal" i], [id*="Modal"]');
        return Array.from(modals).some(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
        });
      });

      if (!hasModal) {
        throw new Error('No se encontró modal/formulario visible después de click en crear');
      }
      console.log(`      ⚠️ Modal encontrado por fallback (inspección DOM)`);
    }

    await page.waitForTimeout(1000);

    // 3. Llenar formulario
    console.log(`      ✍️ Llenando formulario...`);
    for (const [fieldName, fieldValue] of Object.entries(moduleConfig.formFields)) {
      try {
        // Intentar varios selectores comunes
        const selectors = [
          `[name="${fieldName}"]`,
          `#${fieldName}`,
          `input[placeholder*="${fieldName}"]`,
          `textarea[name="${fieldName}"]`,
          `select[name="${fieldName}"]`
        ];

        let filled = false;
        for (const selector of selectors) {
          const element = page.locator(selector).first();
          const count = await element.count();

          if (count > 0) {
            const tagName = await element.evaluate(el => el.tagName.toLowerCase());

            if (tagName === 'select') {
              await element.selectOption(fieldValue);
            } else {
              await element.fill(String(fieldValue));
            }

            console.log(`         ✅ ${fieldName}: ${fieldValue}`);
            filled = true;
            break;
          }
        }

        if (!filled) {
          console.log(`         ⚠️ Campo "${fieldName}" no encontrado`);
        }

        await page.waitForTimeout(300);
      } catch (error) {
        console.log(`         ⚠️ Error llenando "${fieldName}": ${error.message}`);
      }
    }

    // 4. Click guardar
    console.log(`      💾 Guardando...`);

    // Buscar el botón DENTRO del modal visible
    const saveButton = await page.evaluate(() => {
      // Buscar modales visibles
      const modalSelectors = [
        '.modal.show',
        '.modal.in',
        '[role="dialog"]',
        '[id*="Modal"][style*="display: block"]',
        '[id*="Modal"]:not([style*="display: none"])'
      ];

      let visibleModal = null;
      for (const selector of modalSelectors) {
        const modals = document.querySelectorAll(selector);
        for (const modal of modals) {
          const style = window.getComputedStyle(modal);
          if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0) {
            visibleModal = modal;
            break;
          }
        }
        if (visibleModal) break;
      }

      if (!visibleModal) {
        throw new Error('No se encontró modal visible para buscar botón Guardar');
      }

      // Buscar botón Guardar DENTRO del modal (usando JavaScript nativo)
      const buttons = visibleModal.querySelectorAll('button');

      for (const btn of buttons) {
        const btnStyle = window.getComputedStyle(btn);
        if (btnStyle.display === 'none' || btnStyle.visibility === 'hidden') {
          continue;
        }

        const btnText = btn.textContent.trim().toLowerCase();
        const hasGuardarText = btnText.includes('guardar') || btnText.includes('crear') || btnText.includes('save');
        const isPrimaryButton = btn.classList.contains('btn-primary');
        const hasOnclickSave = btn.onclick && btn.onclick.toString().toLowerCase().includes('save');

        if (hasGuardarText || isPrimaryButton || hasOnclickSave) {
          // Encontrar un selector único para este botón
          if (btn.id) {
            return `#${btn.id}`;
          }

          // Si tiene onclick, usar eso para identificarlo
          if (btn.onclick) {
            const onclickStr = btn.onclick.toString();
            const functionName = onclickStr.match(/function\s+(\w+)|(\w+)\s*\(/);
            if (functionName) {
              const fname = functionName[1] || functionName[2];
              return `button[onclick*="${fname}"]`;
            }
          }

          // Fallback: crear un selector por texto
          const uniqueText = btnText.substring(0, 15).replace(/[^\w\s]/g, '');
          if (uniqueText.length > 3) {
            // Retornar un identificador que luego buscaremos por texto
            return `BUTTON_WITH_TEXT:${uniqueText}`;
          }

          // Último fallback: usar clase
          if (isPrimaryButton) {
            return `.btn-primary`;
          }
        }
      }

      throw new Error('No se encontró botón Guardar en el modal visible');
    });

    console.log(`      🔍 Selector de botón encontrado: ${saveButton}`);

    // Click en el botón encontrado
    if (saveButton.startsWith('BUTTON_WITH_TEXT:')) {
      // Buscar por texto usando Playwright
      const buttonText = saveButton.replace('BUTTON_WITH_TEXT:', '');
      const btn = page.locator(`button:has-text("${buttonText}")`).first();
      await btn.click();
    } else {
      // Usar el selector directo
      await page.locator(saveButton).first().click();
    }

    await page.waitForTimeout(3000); // Esperar a que se guarde

    // 5. Verificar en BD
    console.log(`      🔍 Verificando en BD...`);

    // Esperar un poco más para asegurar que se guardó
    await page.waitForTimeout(2000);

    const whereClause = `${moduleConfig.uniqueField} = $1`;
    const uniqueValue = moduleConfig.formFields[moduleConfig.uniqueField];

    const dbResult = await verifyRecordExists(
      moduleConfig.tableName,
      whereClause,
      [uniqueValue]
    );

    if (dbResult.exists) {
      console.log(`      ✅ CREATE exitoso - ID: ${dbResult.data.id}`);
      return {
        success: true,
        id: dbResult.data.id,
        data: dbResult.data
      };
    } else {
      console.log(`      ❌ CREATE falló - Registro no existe en BD`);
      return {
        success: false,
        error: 'Registro no encontrado en BD después de crear'
      };
    }

  } catch (error) {
    console.error(`      ❌ Error en CREATE:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * READ: Verificar que el registro aparece en la lista/tabla
 */
async function readRecord(page, moduleConfig, recordId) {
  console.log(`   📖 [CRUD] READ: Verificando registro ${recordId}...`);

  try {
    // Esperar a que cargue la lista
    await page.waitForTimeout(2000);

    // Buscar el registro en la tabla/lista
    const recordText = moduleConfig.formFields[moduleConfig.uniqueField];
    const recordInList = page.locator(`tr:has-text("${recordText}"), div:has-text("${recordText}")`).first();

    const exists = await recordInList.count() > 0;

    if (exists) {
      console.log(`      ✅ READ exitoso - Registro visible en UI`);
      return { success: true };
    } else {
      console.log(`      ❌ READ falló - Registro no visible en UI`);
      return {
        success: false,
        error: 'Registro no encontrado en lista/tabla'
      };
    }

  } catch (error) {
    console.error(`      ❌ Error en READ:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * UPDATE: Editar el registro
 */
async function updateRecord(page, moduleConfig, recordId) {
  console.log(`   ✏️ [CRUD] UPDATE: Editando registro ${recordId}...`);

  try {
    // 1. Buscar y click en botón editar del registro
    const recordText = moduleConfig.formFields[moduleConfig.uniqueField];
    const recordRow = page.locator(`tr:has-text("${recordText}"), div:has-text("${recordText}")`).first();

    // Click en botón editar (puede ser icono, botón, etc.)
    const editButton = recordRow.locator('button:has-text("Editar"), button[title*="Editar"], i.fa-edit, i.fa-pencil').first();
    await editButton.click();
    await page.waitForTimeout(1000);

    // 2. Esperar modal de edición
    await page.waitForSelector('.modal:visible, [role="dialog"]:visible', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // 3. Cambiar campos según updateFields
    console.log(`      ✍️ Actualizando campos...`);
    for (const [fieldName, newValue] of Object.entries(moduleConfig.updateFields)) {
      try {
        const field = page.locator(`[name="${fieldName}"], #${fieldName}`).first();

        // Limpiar y llenar con nuevo valor
        await field.clear();
        await field.fill(String(newValue));

        console.log(`         ✅ ${fieldName}: ${newValue}`);
        await page.waitForTimeout(300);
      } catch (error) {
        console.log(`         ⚠️ Error actualizando "${fieldName}": ${error.message}`);
      }
    }

    // 4. Guardar cambios
    console.log(`      💾 Guardando cambios...`);
    const saveButton = page.locator('button:has-text("Guardar"), button:has-text("Actualizar"), button[type="submit"]').first();
    await saveButton.click();
    await page.waitForTimeout(3000);

    // 5. Verificar en BD que los cambios se guardaron
    console.log(`      🔍 Verificando cambios en BD...`);

    const whereClause = `id = $1`;
    const dbResult = await verifyRecordExists(
      moduleConfig.tableName,
      whereClause,
      [recordId]
    );

    if (dbResult.exists) {
      // Verificar que los campos se actualizaron
      let allFieldsUpdated = true;
      for (const [fieldName, expectedValue] of Object.entries(moduleConfig.updateFields)) {
        const actualValue = dbResult.data[fieldName];
        if (actualValue !== expectedValue) {
          console.log(`         ⚠️ Campo "${fieldName}" no se actualizó: esperado="${expectedValue}", actual="${actualValue}"`);
          allFieldsUpdated = false;
        }
      }

      if (allFieldsUpdated) {
        console.log(`      ✅ UPDATE exitoso - Cambios verificados en BD`);
        return { success: true, data: dbResult.data };
      } else {
        console.log(`      ⚠️ UPDATE parcial - Algunos campos no se actualizaron`);
        return {
          success: false,
          error: 'Algunos campos no se actualizaron correctamente'
        };
      }
    } else {
      console.log(`      ❌ UPDATE falló - Registro no encontrado en BD`);
      return {
        success: false,
        error: 'Registro no encontrado después de actualizar'
      };
    }

  } catch (error) {
    console.error(`      ❌ Error en UPDATE:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * DELETE: Eliminar el registro
 */
async function deleteRecord(page, moduleConfig, recordId) {
  console.log(`   🗑️ [CRUD] DELETE: Eliminando registro ${recordId}...`);

  try {
    // 1. Buscar registro en la lista
    const recordText = moduleConfig.formFields[moduleConfig.uniqueField];
    const recordRow = page.locator(`tr:has-text("${recordText}"), div:has-text("${recordText}")`).first();

    // 2. Click en botón eliminar
    const deleteButton = recordRow.locator('button:has-text("Eliminar"), button[title*="Eliminar"], i.fa-trash, i.fa-delete').first();
    await deleteButton.click();
    await page.waitForTimeout(1000);

    // 3. Confirmar en modal de confirmación (si existe)
    try {
      const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sí"), button:has-text("Eliminar")').first();
      await confirmButton.click({ timeout: 3000 });
    } catch {
      // No hay modal de confirmación, continuar
    }

    await page.waitForTimeout(3000);

    // 4. Verificar en BD que fue eliminado
    console.log(`      🔍 Verificando eliminación en BD...`);

    const whereClause = `id = $1`;
    const isDeleted = await verifyRecordDeleted(
      moduleConfig.tableName,
      whereClause,
      [recordId]
    );

    if (isDeleted) {
      console.log(`      ✅ DELETE exitoso - Registro eliminado de BD`);
      return { success: true };
    } else {
      console.log(`      ❌ DELETE falló - Registro aún existe en BD`);
      return {
        success: false,
        error: 'Registro no fue eliminado de la BD'
      };
    }

  } catch (error) {
    console.error(`      ❌ Error en DELETE:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test CRUD completo para un módulo
 */
async function testModuleCRUD(page, moduleConfig) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🧪 TESTING CRUD COMPLETO: ${moduleConfig.name}`);
  console.log('═'.repeat(70));

  const results = {
    module: moduleConfig.key,
    name: moduleConfig.name,
    create: { success: false },
    read: { success: false },
    update: { success: false },
    delete: { success: false },
    overallSuccess: false
  };

  let createdId = null;

  try {
    // CREATE
    const createResult = await createRecord(page, moduleConfig);
    results.create = createResult;

    if (!createResult.success) {
      results.error = 'CREATE failed';
      return results;
    }

    createdId = createResult.id;

    // READ
    const readResult = await readRecord(page, moduleConfig, createdId);
    results.read = readResult;

    // UPDATE
    const updateResult = await updateRecord(page, moduleConfig, createdId);
    results.update = updateResult;

    // DELETE
    const deleteResult = await deleteRecord(page, moduleConfig, createdId);
    results.delete = deleteResult;

    // Overall success
    results.overallSuccess =
      createResult.success &&
      readResult.success &&
      updateResult.success &&
      deleteResult.success;

    console.log(`\n📊 RESULTADO: ${moduleConfig.name}`);
    console.log(`   CREATE: ${results.create.success ? '✅' : '❌'}`);
    console.log(`   READ: ${results.read.success ? '✅' : '❌'}`);
    console.log(`   UPDATE: ${results.update.success ? '✅' : '❌'}`);
    console.log(`   DELETE: ${results.delete.success ? '✅' : '❌'}`);
    console.log(`   OVERALL: ${results.overallSuccess ? '✅ PASS' : '❌ FAIL'}`);

  } catch (error) {
    console.error(`❌ Error en test CRUD:`, error.message);
    results.error = error.message;
  }

  return results;
}

module.exports = {
  createRecord,
  readRecord,
  updateRecord,
  deleteRecord,
  testModuleCRUD
};
