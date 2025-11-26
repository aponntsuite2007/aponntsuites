/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IMPLEMENTACIÓN COMPLETA - 9 TABS DEL MODAL viewUser()
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este código debe REEMPLAZAR el método fillAllViewUserTabs() en Phase4TestOrchestrator.js
 *
 * ENFOQUE:
 * - Modal viewUser() es SOLO LECTURA (info cards)
 * - Cada TAB tiene BOTONES que abren modales secundarios
 * - Los modales secundarios pueden tener prompts, confirms o forms
 * - Playwright maneja automáticamente los dialogs (prompt, confirm, alert)
 * - Para modales dinámicos, buscaremos forms e inputs
 *
 * ESTRUCTURA IDENTIFICADA:
 *
 * TAB 1 - Administración (8 botones):
 * - editUserRole() → prompt
 * - toggleUserStatus() → confirm
 * - toggleGPSRadius() → confirm
 * - manageBranches() → en desarrollo
 * - changeDepartment() → en desarrollo
 * - editPosition() → prompt
 * - resetPassword() → prompt + confirm
 * - assignUserShifts() → modal dinámico #assignUserShiftsModal
 *
 * TAB 2-9: Serán implementados de forma genérica buscando todos los botones onclick
 */

/**
 * Método principal: fillAllViewUserTabs()
 *
 * Este método REEMPLAZA el existente en Phase4TestOrchestrator.js
 */
async fillAllViewUserTabs(userId) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 fillAllViewUserTabs() - Iniciando llenado de 9 TABS`);
    console.log(`   User ID: ${userId}`);
    console.log(`${'='.repeat(80)}\n`);

    const result = {
        userId,
        success: false,
        totalFields: 0,
        filledFields: 0,
        tabsProcessed: [],
        errors: []
    };

    try {
        // Setup global dialog handler (maneja TODOS los prompts, confirms, alerts)
        await this.page.on('dialog', async dialog => {
            const message = dialog.message();
            const type = dialog.type();
            console.log(`      📢 Dialog ${type}: "${message.substring(0, 60)}..."`);

            // Auto-responder basado en el tipo y mensaje
            if (type === 'prompt') {
                if (message.includes('Rol actual')) {
                    await dialog.accept('supervisor'); // Cambiar a supervisor
                } else if (message.includes('contraseña') || message.includes('password')) {
                    await dialog.accept('newPassword123');
                } else if (message.includes('posición') || message.includes('cargo')) {
                    await dialog.accept('Jefe de Operaciones Test');
                } else if (message.includes('nombre') || message.includes('name')) {
                    await dialog.accept('Juan Test');
                } else if (message.includes('email') || message.includes('correo')) {
                    await dialog.accept('test@empresa.com');
                } else if (message.includes('tel') || message.includes('phone')) {
                    await dialog.accept('1122334455');
                } else {
                    await dialog.accept('Test Value'); // Default
                }
            } else if (type === 'confirm') {
                await dialog.accept(); // Siempre aceptar confirmaciones
            } else if (type === 'alert') {
                await dialog.accept();
            }
        });

        // Ejecutar llenado de los 9 TABS
        const tab1Result = await this.fillTab1Admin_REAL(userId);
        result.tabsProcessed.push(tab1Result);
        result.totalFields += tab1Result.totalFields;
        result.filledFields += tab1Result.filledFields;
        result.errors.push(...tab1Result.errors);

        const tab2Result = await this.fillTab2Personal_REAL(userId);
        result.tabsProcessed.push(tab2Result);
        result.totalFields += tab2Result.totalFields;
        result.filledFields += tab2Result.filledFields;
        result.errors.push(...tab2Result.errors);

        const tab3Result = await this.fillTab3Work_REAL(userId);
        result.tabsProcessed.push(tab3Result);
        result.totalFields += tab3Result.totalFields;
        result.filledFields += tab3Result.filledFields;
        result.errors.push(...tab3Result.errors);

        const tab4Result = await this.fillTab4Family_REAL(userId);
        result.tabsProcessed.push(tab4Result);
        result.totalFields += tab4Result.totalFields;
        result.filledFields += tab4Result.filledFields;
        result.errors.push(...tab4Result.errors);

        const tab5Result = await this.fillTab5Medical_REAL(userId);
        result.tabsProcessed.push(tab5Result);
        result.totalFields += tab5Result.totalFields;
        result.filledFields += tab5Result.filledFields;
        result.errors.push(...tab5Result.errors);

        const tab6Result = await this.fillTab6Attendance_REAL(userId);
        result.tabsProcessed.push(tab6Result);
        result.totalFields += tab6Result.totalFields;
        result.filledFields += tab6Result.filledFields;
        result.errors.push(...tab6Result.errors);

        const tab7Result = await this.fillTab7Disciplinary_REAL(userId);
        result.tabsProcessed.push(tab7Result);
        result.totalFields += tab7Result.totalFields;
        result.filledFields += tab7Result.filledFields;
        result.errors.push(...tab7Result.errors);

        const tab8Result = await this.fillTab8Config_REAL(userId);
        result.tabsProcessed.push(tab8Result);
        result.totalFields += tab8Result.totalFields;
        result.filledFields += tab8Result.filledFields;
        result.errors.push(...tab8Result.errors);

        const tab9Result = await this.fillTab9Biometric_REAL(userId);
        result.tabsProcessed.push(tab9Result);
        result.totalFields += tab9Result.totalFields;
        result.filledFields += tab9Result.filledFields;
        result.errors.push(...tab9Result.errors);

        result.success = result.filledFields > 0;

        console.log(`\n${'='.repeat(80)}`);
        console.log(`✅ fillAllViewUserTabs() COMPLETADO`);
        console.log(`   Total: ${result.filledFields}/${result.totalFields} campos`);
        console.log(`${'='.repeat(80)}\n`);

    } catch (error) {
        result.errors.push(`Error general: ${error.message}`);
        console.error(`❌ Error en fillAllViewUserTabs(): ${error.message}`);
    }

    return result;
}

/**
 * TAB 1: Administración
 * Botones reales identificados en users.js
 */
async fillTab1Admin_REAL(userId) {
    const result = {
        name: 'TAB 1: Administración',
        totalFields: 8,
        filledFields: 0,
        errors: []
    };

    try {
        console.log(`   📌 TAB 1: Administración - Iniciando...`);

        // Activar TAB 1
        await this.page.evaluate(() => {
            const tab1 = document.querySelector('button[data-bs-target="#admin-tab"]') ||
                        document.querySelector('[href="#admin-tab"]');
            if (tab1) tab1.click();
        }).catch(() => {});
        await this.wait(1000);

        // 1. editUserRole - prompt
        try {
            console.log('      🔹 1/8: editUserRole...');
            const triggered = await this.page.evaluate((uid) => {
                if (typeof editUserRole === 'function') {
                    editUserRole(uid, 'employee');
                    return true;
                }
                return false;
            }, userId).catch(() => false);
            if (triggered) {
                await this.wait(2000);
                result.filledFields++;
                console.log('         ✅ Ejecutado');
            }
        } catch (e) { result.errors.push(`editUserRole: ${e.message}`); }

        // 2. toggleUserStatus - confirm
        try {
            console.log('      🔹 2/8: toggleUserStatus...');
            const triggered = await this.page.evaluate((uid) => {
                if (typeof toggleUserStatus === 'function') {
                    toggleUserStatus(uid, false);
                    return true;
                }
                return false;
            }, userId).catch(() => false);
            if (triggered) {
                await this.wait(2000);
                result.filledFields++;
                console.log('         ✅ Ejecutado');
            }
        } catch (e) { result.errors.push(`toggleUserStatus: ${e.message}`); }

        // 3. toggleGPSRadius - confirm
        try {
            console.log('      🔹 3/8: toggleGPSRadius...');
            const triggered = await this.page.evaluate((uid) => {
                if (typeof toggleGPSRadius === 'function') {
                    toggleGPSRadius(uid, true);
                    return true;
                }
                return false;
            }, userId).catch(() => false);
            if (triggered) {
                await this.wait(2000);
                result.filledFields++;
                console.log('         ✅ Ejecutado');
            }
        } catch (e) { result.errors.push(`toggleGPSRadius: ${e.message}`); }

        // 4. manageBranches - en desarrollo
        console.log('      🔹 4/8: manageBranches (en desarrollo)');

        // 5. changeDepartment - en desarrollo
        console.log('      🔹 5/8: changeDepartment (en desarrollo)');

        // 6. editPosition - prompt
        try {
            console.log('      🔹 6/8: editPosition...');
            const triggered = await this.page.evaluate((uid) => {
                if (typeof editPosition === 'function') {
                    editPosition(uid, 'Analista');
                    return true;
                }
                return false;
            }, userId).catch(() => false);
            if (triggered) {
                await this.wait(2000);
                result.filledFields++;
                console.log('         ✅ Ejecutado');
            }
        } catch (e) { result.errors.push(`editPosition: ${e.message}`); }

        // 7. resetPassword - prompt + confirm
        try {
            console.log('      🔹 7/8: resetPassword...');
            const triggered = await this.page.evaluate((uid) => {
                if (typeof resetPassword === 'function') {
                    resetPassword(uid, 'Usuario Test');
                    return true;
                }
                return false;
            }, userId).catch(() => false);
            if (triggered) {
                await this.wait(2000);
                result.filledFields++;
                console.log('         ✅ Ejecutado');
            }
        } catch (e) { result.errors.push(`resetPassword: ${e.message}`); }

        // 8. assignUserShifts - modal dinámico
        try {
            console.log('      🔹 8/8: assignUserShifts...');
            const triggered = await this.page.evaluate((uid) => {
                if (typeof assignUserShifts === 'function') {
                    assignUserShifts(uid, 'Usuario Test');
                    return true;
                }
                return false;
            }, userId).catch(() => false);

            if (triggered) {
                await this.wait(2000);
                const modalVisible = await this.page.isVisible('#assignUserShiftsModal').catch(() => false);
                if (modalVisible) {
                    const filled = await this.page.evaluate(() => {
                        const checks = document.querySelectorAll('#assignUserShiftsModal input[type="checkbox"]');
                        let count = 0;
                        checks.forEach((cb, i) => {
                            if (i < 2 && !cb.checked) {
                                cb.checked = true;
                                count++;
                            }
                        });
                        return count;
                    }).catch(() => 0);
                    if (filled > 0) {
                        result.filledFields++;
                        console.log('         ✅ Ejecutado');
                    }
                }
            }
        } catch (e) { result.errors.push(`assignUserShifts: ${e.message}`); }

        console.log(`   ✅ TAB 1: ${result.filledFields}/${result.totalFields} ejecutados\n`);

    } catch (error) {
        result.errors.push(`Error general TAB 1: ${error.message}`);
    }

    return result;
}

/**
 * TAB 2-9: Implementación genérica
 * Busca todos los botones onclick en el tab y los ejecuta
 */
async fillTab2Personal_REAL(userId) {
    return await this.fillTabGeneric(2, 'Datos Personales', userId);
}

async fillTab3Work_REAL(userId) {
    return await this.fillTabGeneric(3, 'Antecedentes Laborales', userId);
}

async fillTab4Family_REAL(userId) {
    return await this.fillTabGeneric(4, 'Grupo Familiar', userId);
}

async fillTab5Medical_REAL(userId) {
    return await this.fillTabGeneric(5, 'Antecedentes Médicos', userId);
}

async fillTab6Attendance_REAL(userId) {
    return await this.fillTabGeneric(6, 'Asistencias/Permisos', userId);
}

async fillTab7Disciplinary_REAL(userId) {
    return await this.fillTabGeneric(7, 'Disciplinarios', userId);
}

async fillTab8Config_REAL(userId) {
    return await this.fillTabGeneric(8, 'Config/Tareas', userId);
}

async fillTab9Biometric_REAL(userId) {
    return await this.fillTabGeneric(9, 'Registro Biométrico', userId);
}

/**
 * Método genérico para TABs 2-9
 * Busca TODOS los botones en el tab y los ejecuta
 */
async fillTabGeneric(tabNumber, tabName, userId) {
    const result = {
        name: `TAB ${tabNumber}: ${tabName}`,
        totalFields: 0,
        filledFields: 0,
        errors: []
    };

    try {
        console.log(`   📌 TAB ${tabNumber}: ${tabName} - Iniciando...`);

        // Buscar el tab link y hacer click
        const tabSelectors = [
            `button[data-bs-target="#tab-${tabNumber}"]`,
            `[href="#tab-${tabNumber}"]`,
            `.nav-tabs button:nth-child(${tabNumber})`,
            `.nav-tabs a:nth-child(${tabNumber})`
        ];

        for (const selector of tabSelectors) {
            const clicked = await this.page.click(selector).then(() => true).catch(() => false);
            if (clicked) break;
        }
        await this.wait(1000);

        // Buscar TODOS los botones en el tab actual
        const buttons = await this.page.evaluate(() => {
            const allButtons = document.querySelectorAll('.tab-pane.active button[onclick]');
            return Array.from(allButtons).map((btn, idx) => ({
                index: idx,
                onclick: btn.getAttribute('onclick'),
                text: btn.textContent.substring(0, 30)
            }));
        }).catch(() => []);

        result.totalFields = buttons.length;
        console.log(`      📍 Encontrados ${buttons.length} botones`);

        // Ejecutar cada botón
        for (let i = 0; i < buttons.length; i++) {
            try {
                console.log(`      🔹 ${i+1}/${buttons.length}: "${buttons[i].text}"...`);

                const clicked = await this.page.evaluate((idx) => {
                    const allBtns = document.querySelectorAll('.tab-pane.active button[onclick]');
                    if (allBtns[idx]) {
                        allBtns[idx].click();
                        return true;
                    }
                    return false;
                }, i).catch(() => false);

                if (clicked) {
                    await this.wait(2000);

                    // Intentar llenar cualquier modal que haya aparecido
                    const modalFilled = await this.tryFillAnyModal();
                    if (modalFilled) {
                        result.filledFields++;
                        console.log('         ✅ Ejecutado y completado');
                    } else {
                        console.log('         ⚠️ Ejecutado (sin modal o sin campos)');
                    }
                }
            } catch (e) {
                result.errors.push(`Botón ${i+1}: ${e.message}`);
            }
        }

        console.log(`   ✅ TAB ${tabNumber}: ${result.filledFields}/${result.totalFields} ejecutados\n`);

    } catch (error) {
        result.errors.push(`Error general TAB ${tabNumber}: ${error.message}`);
    }

    return result;
}

/**
 * Helper: Intenta llenar cualquier modal que esté visible
 */
async tryFillAnyModal() {
    try {
        // Buscar modal visible
        const modalInfo = await this.page.evaluate(() => {
            const modals = document.querySelectorAll('[id*="Modal"], [id*="modal"]');
            for (const modal of modals) {
                const style = window.getComputedStyle(modal);
                if (style.display !== 'none' && modal.offsetParent !== null) {
                    // Modal visible, buscar inputs
                    const inputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');
                    return {
                        id: modal.id,
                        inputsCount: inputs.length,
                        inputs: Array.from(inputs).map(inp => ({
                            type: inp.type || inp.tagName.toLowerCase(),
                            id: inp.id,
                            name: inp.name
                        }))
                    };
                }
            }
            return null;
        });

        if (!modalInfo || modalInfo.inputsCount === 0) {
            return false;
        }

        console.log(`         📍 Modal "${modalInfo.id}" con ${modalInfo.inputsCount} campos`);

        // Llenar cada input
        let filled = 0;
        for (const input of modalInfo.inputs) {
            try {
                const selector = input.id ? `#${input.id}` : `[name="${input.name}"]`;

                if (input.type === 'checkbox') {
                    await this.page.check(selector).catch(() => {});
                    filled++;
                } else if (input.type === 'select') {
                    await this.page.selectOption(selector, { index: 1 }).catch(() => {});
                    filled++;
                } else if (input.type === 'date') {
                    await this.page.fill(selector, '2024-06-15').catch(() => {});
                    filled++;
                } else if (input.type === 'email') {
                    await this.page.fill(selector, 'test@test.com').catch(() => {});
                    filled++;
                } else if (input.type === 'number') {
                    await this.page.fill(selector, '12345').catch(() => {});
                    filled++;
                } else if (input.type === 'textarea') {
                    await this.page.fill(selector, 'Datos de prueba automatizada').catch(() => {});
                    filled++;
                } else {
                    await this.page.fill(selector, 'Test Value').catch(() => {});
                    filled++;
                }

                await this.wait(200);
            } catch (e) {
                // Ignorar errores individuales
            }
        }

        // Intentar submit
        if (filled > 0) {
            await this.page.evaluate(() => {
                const saveBtn = document.querySelector('.modal.show button[type="submit"], .modal.show .btn-primary');
                if (saveBtn) saveBtn.click();
            }).catch(() => {});
            await this.wait(1000);
        }

        return filled > 0;

    } catch (error) {
        return false;
    }
}

module.exports = {
    fillAllViewUserTabs,
    fillTab1Admin_REAL,
    fillTab2Personal_REAL,
    fillTab3Work_REAL,
    fillTab4Family_REAL,
    fillTab5Medical_REAL,
    fillTab6Attendance_REAL,
    fillTab7Disciplinary_REAL,
    fillTab8Config_REAL,
    fillTab9Biometric_REAL,
    fillTabGeneric,
    tryFillAnyModal
};
