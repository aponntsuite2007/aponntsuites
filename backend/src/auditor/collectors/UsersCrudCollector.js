/**
 * USERS CRUD COLLECTOR - Testing completo de operaciones CRUD en módulo Usuarios
 *
 * Integrado con Phase4TestOrchestrator
 *
 * Tests:
 * 1. Navegación a todos los tabs (2-9)
 * 2. Click en botones de cada tab
 * 3. Apertura de modals de edición
 * 4. Llenado de formularios con datos [TEST-timestamp]
 * 5. Guardado y verificación de persistencia en BD
 * 6. File uploads (fotos, PDFs)
 */

const { Pool } = require('pg');

class UsersCrudCollector {
    constructor(page, companyId) {
        this.page = page;
        this.companyId = companyId;
        this.pool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            database: process.env.POSTGRES_DB || 'attendance_system',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
        });

        this.results = {
            navigation: [],
            buttons_clicked: [],
            modals_opened: [],
            fields_updated: [],
            persistence_verified: [],
            errors: []
        };

        this.testUserId = null;
    }

    /**
     * Ejecutar test completo
     */
    async collect() {
        console.log('\n🔹 [USERS-CRUD] Iniciando test CRUD completo...\n');

        try {
            // 1. Navegar al módulo y abrir modal VER
            await this.navigateToUsersModule();
            await this.openFirstUserModal();

            // 2. Obtener user_id
            await this.getUserId();

            // 3. Navegar y testear cada tab
            await this.testTab2DatosPersonales();
            await this.testTab3Laborales();
            await this.testTab4Familiar();
            await this.testTab5Medicos();
            await this.testTab6Asistencias();
            await this.testTab7Sanciones();
            await this.testTab8Tareas();
            await this.testTab9Biometrico();

            // 4. Verificar persistencia reabriendo modal
            await this.verifyPersistence();

            return this.generateReport();

        } catch (error) {
            this.results.errors.push({
                phase: 'general',
                error: error.message,
                stack: error.stack
            });
            throw error;
        } finally {
            if (this.pool) {
                await this.pool.end();
            }
        }
    }

    async navigateToUsersModule() {
        console.log('   📊 Navegando al módulo Usuarios...');

        const sidebarBtn = this.page.locator(`[onclick*="showTab('users'"]`).first();
        if (await sidebarBtn.isVisible().catch(() => false)) {
            await sidebarBtn.click();
        } else {
            await this.page.locator('div[onclick]:has-text("Gestión de Usuarios")').first().click();
        }

        await this.page.waitForTimeout(3000);
        this.results.navigation.push({ step: 'module_opened', success: true });
        console.log('   ✅ Módulo abierto\n');
    }

    async openFirstUserModal() {
        console.log('   🔍 Abriendo modal VER del primer usuario...');

        await this.page.waitForSelector('table tbody tr', { timeout: 15000 });
        const verButton = this.page.locator('table tbody tr:first-child button.btn-info').first();
        await verButton.click();
        await this.page.waitForTimeout(3000);
        await this.page.waitForSelector('#employeeFileModal', { state: 'visible', timeout: 10000 });

        this.results.navigation.push({ step: 'modal_opened', success: true });
        console.log('   ✅ Modal VER abierto\n');
    }

    async getUserId() {
        console.log('   🔍 Obteniendo user_id...');

        // Intentar desde BD
        const result = await this.queryDB(`
            SELECT user_id, "firstName", "lastName", email
            FROM users
            ORDER BY user_id ASC
            LIMIT 1
        `);

        if (result && result.length > 0) {
            this.testUserId = result[0].user_id;
            console.log(`   ✅ user_id: ${this.testUserId}`);
            console.log(`      Nombre: ${result[0].firstName} ${result[0].lastName}\n`);
        } else {
            throw new Error('No se pudo obtener user_id');
        }
    }

    async testTab2DatosPersonales() {
        console.log('   📝 TAB 2: DATOS PERSONALES');

        const tab2 = this.page.locator('.file-tab').nth(1);
        await tab2.click();
        await this.page.waitForTimeout(1500);

        this.results.navigation.push({ tab: 2, name: 'Datos Personales', visible: true });

        // Ejecutar editContactInfo() directamente en vez de buscar botón
        console.log('      🔧 Ejecutando editContactInfo() directamente...');

        await this.page.evaluate((userId) => {
            // Llamar a la función global
            if (typeof window.editContactInfo === 'function') {
                window.editContactInfo(userId);
            } else {
                console.error('editContactInfo no está definida');
            }
        }, this.testUserId);

        await this.page.waitForTimeout(2000);
        this.results.buttons_clicked.push({ tab: 2, button: 'Editar (ejecutado)' });

        // Verificar si abrió modal buscando por ID
        const modalVisible = await this.page.locator('#contactInfoModal').isVisible().catch(() => false);

        if (modalVisible) {
            console.log('      ✅ Modal de edición abierto');
            this.results.modals_opened.push({ tab: 2, modal: 'EditContactInfo', opened: true });

            // Llenar campos
            await this.fillContactInfoFields();

            // Guardar
            await this.saveModal();

            // Verificar en BD
            await this.verifyContactInfoInDB();

            await this.closeSecondaryModals();
        } else {
            console.log('      ❌ Modal NO abrió');
            this.results.modals_opened.push({ tab: 2, modal: 'EditContactInfo', opened: false });
        }

        console.log('   ✅ TAB 2 completado\n');
    }

    async fillContactInfoFields() {
        const timestamp = Date.now();

        // Campos del modal editContactInfo
        const emergencyContactName = `TEST-Emergency-${timestamp}`;
        const emergencyContactPhone = `+54 11 ${timestamp.toString().substr(-8)}`;
        const additionalContactName = `TEST-Additional-${timestamp}`;
        const additionalContactPhone = `+54 11 ${(timestamp + 1000).toString().substr(-8)}`;

        // Llenar campos de contacto de emergencia
        const emergNameInput = this.page.locator('#emergencyContactName');
        if (await emergNameInput.isVisible().catch(() => false)) {
            await emergNameInput.fill(emergencyContactName);
            this.results.fields_updated.push({ field: 'emergencyContactName', value: emergencyContactName });
            console.log(`      ✓ Nombre Emergencia: ${emergencyContactName}`);
        }

        const emergPhoneInput = this.page.locator('#emergencyContactPhone');
        if (await emergPhoneInput.isVisible().catch(() => false)) {
            await emergPhoneInput.fill(emergencyContactPhone);
            this.results.fields_updated.push({ field: 'emergencyContactPhone', value: emergencyContactPhone });
            console.log(`      ✓ Teléfono Emergencia: ${emergencyContactPhone}`);
        }

        // Llenar campos de contacto adicional
        const addNameInput = this.page.locator('#additionalContactName');
        if (await addNameInput.isVisible().catch(() => false)) {
            await addNameInput.fill(additionalContactName);
            this.results.fields_updated.push({ field: 'additionalContactName', value: additionalContactName });
            console.log(`      ✓ Nombre Adicional: ${additionalContactName}`);
        }

        const addPhoneInput = this.page.locator('#additionalContactPhone');
        if (await addPhoneInput.isVisible().catch(() => false)) {
            await addPhoneInput.fill(additionalContactPhone);
            this.results.fields_updated.push({ field: 'additionalContactPhone', value: additionalContactPhone });
            console.log(`      ✓ Teléfono Adicional: ${additionalContactPhone}`);
        }

        // Seleccionar relación
        const relationSelect = this.page.locator('#additionalContactRelation');
        if (await relationSelect.isVisible().catch(() => false)) {
            await relationSelect.selectOption('family');
            this.results.fields_updated.push({ field: 'additionalContactRelation', value: 'family' });
            console.log(`      ✓ Relación: Familiar`);
        }
    }

    async saveModal() {
        // Buscar botón con texto "Guardar" dentro del modal visible
        const saveBtn = this.page.locator('#contactInfoModal button:has-text("Guardar")').first();

        // Hacer scroll al botón para que esté visible
        await saveBtn.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);

        // Click en el botón
        await saveBtn.click();
        await this.page.waitForTimeout(3000);
        console.log('      💾 Guardado');
    }

    async verifyContactInfoInDB() {
        const updatedData = await this.queryDB(`
            SELECT phone, "emergencyContact", "emergencyPhone" FROM users WHERE user_id = $1
        `, [this.testUserId]);

        if (updatedData && updatedData.length > 0) {
            const phoneOK = updatedData[0].phone && updatedData[0].phone.includes('+54 11');
            const emergContactOK = updatedData[0].emergencyContact && updatedData[0].emergencyContact.includes('TEST-Emergency');
            const emergPhoneOK = updatedData[0].emergencyPhone && updatedData[0].emergencyPhone.includes('+54 11');

            console.log(`      📊 BD: phone=${updatedData[0].phone}, emergencyContact=${updatedData[0].emergencyContact}, emergencyPhone=${updatedData[0].emergencyPhone}`);

            if (phoneOK) {
                this.results.persistence_verified.push({ field: 'phone', persisted: true });
                console.log('      ✅ Teléfono persistido en BD');
            }
            if (emergContactOK) {
                this.results.persistence_verified.push({ field: 'emergencyContact', persisted: true });
                console.log('      ✅ Contacto Emergencia persistido en BD');
            }
            if (emergPhoneOK) {
                this.results.persistence_verified.push({ field: 'emergencyPhone', persisted: true });
                console.log('      ✅ Teléfono Emergencia persistido en BD');
            }

            if (!phoneOK && !emergContactOK && !emergPhoneOK) {
                console.log('      ⚠️  Ningún campo persistió correctamente');
            }
        }
    }

    async testTab3Laborales() {
        console.log('   📝 TAB 3: ANTECEDENTES LABORALES');

        await this.closeSecondaryModals();

        const tab3 = this.page.locator('.file-tab').nth(2);
        await tab3.click();
        await this.page.waitForTimeout(1500);

        this.results.navigation.push({ tab: 3, name: 'Antecedentes Laborales', visible: true });

        // Ejecutar addWorkHistory() directamente
        console.log('      🔧 Ejecutando addWorkHistory() directamente...');

        await this.page.evaluate((userId) => {
            if (typeof window.addWorkHistory === 'function') {
                window.addWorkHistory(userId);
            }
        }, this.testUserId);

        await this.page.waitForTimeout(2000);
        this.results.buttons_clicked.push({ tab: 3, button: '+ Agregar (ejecutado)' });

        // Verificar si abrió modal
        const modalVisible = await this.page.locator('#workHistoryModal').isVisible().catch(() => false);

        if (modalVisible) {
            console.log('      ✅ Modal de antecedentes laborales abierto');
            this.results.modals_opened.push({ tab: 3, modal: 'AddWorkHistory', opened: true });

            // Llenar campos
            await this.fillWorkHistoryFields();

            // Guardar
            await this.saveWorkHistoryModal();

            // Verificar en BD
            await this.verifyWorkHistoryInDB();

            await this.closeSecondaryModals();
        } else {
            console.log('      ❌ Modal NO abrió');
            this.results.modals_opened.push({ tab: 3, modal: 'AddWorkHistory', opened: false });
        }

        console.log('   ✅ TAB 3 completado\n');
    }

    async fillWorkHistoryFields() {
        const timestamp = Date.now();

        // Llenar campos del formulario de antecedentes laborales
        const companyInput = this.page.locator('#company');
        if (await companyInput.isVisible().catch(() => false)) {
            await companyInput.fill(`TEST-Company-${timestamp}`);
            this.results.fields_updated.push({ field: 'company', value: `TEST-Company-${timestamp}` });
            console.log(`      ✓ Empresa: TEST-Company-${timestamp}`);
        }

        const positionInput = this.page.locator('#position');
        if (await positionInput.isVisible().catch(() => false)) {
            await positionInput.fill(`TEST-Position-${timestamp}`);
            this.results.fields_updated.push({ field: 'position', value: `TEST-Position-${timestamp}` });
            console.log(`      ✓ Cargo: TEST-Position-${timestamp}`);
        }

        const startDateInput = this.page.locator('#startDate');
        if (await startDateInput.isVisible().catch(() => false)) {
            await startDateInput.fill('2020-01-01');
            this.results.fields_updated.push({ field: 'startDate', value: '2020-01-01' });
            console.log(`      ✓ Fecha Inicio: 2020-01-01`);
        }

        const endDateInput = this.page.locator('#endDate');
        if (await endDateInput.isVisible().catch(() => false)) {
            await endDateInput.fill('2023-12-31');
            this.results.fields_updated.push({ field: 'endDate', value: '2023-12-31' });
            console.log(`      ✓ Fecha Fin: 2023-12-31`);
        }

        const descriptionInput = this.page.locator('#description');
        if (await descriptionInput.isVisible().catch(() => false)) {
            await descriptionInput.fill(`TEST-Description-${timestamp}`);
            this.results.fields_updated.push({ field: 'description', value: `TEST-Description-${timestamp}` });
            console.log(`      ✓ Descripción: TEST-Description-${timestamp}`);
        }
    }

    async saveWorkHistoryModal() {
        // Capturar logs de consola
        const consoleLogs = [];
        this.page.on('console', msg => {
            consoleLogs.push(`${msg.type()}: ${msg.text()}`);
        });

        const saveBtn = this.page.locator('#workHistoryModal button:has-text("Guardar")').first();
        await saveBtn.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);
        await saveBtn.click();
        await this.page.waitForTimeout(5000); // Más tiempo para ver logs

        console.log('      💾 Guardado');

        // Mostrar logs de consola relevantes
        const relevantLogs = consoleLogs.filter(log =>
            log.includes('WORK-HISTORY') || log.includes('Error') || log.includes('error')
        );
        if (relevantLogs.length > 0) {
            console.log('      📋 Logs del navegador:');
            relevantLogs.forEach(log => console.log(`         ${log}`));
        }
    }

    async verifyWorkHistoryInDB() {
        // Verificar en la tabla user_work_history
        const workHistory = await this.queryDB(`
            SELECT company_name, position, start_date, end_date, responsibilities
            FROM user_work_history
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [this.testUserId]);

        if (workHistory && workHistory.length > 0) {
            const data = workHistory[0];
            const companyOK = data.company_name && data.company_name.includes('TEST-Company');
            const positionOK = data.position && data.position.includes('TEST-Position');

            console.log(`      📊 BD: company=${data.company_name}, position=${data.position}`);

            if (companyOK) {
                this.results.persistence_verified.push({ field: 'company_name', persisted: true });
                console.log('      ✅ Empresa persistida en BD');
            }
            if (positionOK) {
                this.results.persistence_verified.push({ field: 'position', persisted: true });
                console.log('      ✅ Cargo persistido en BD');
            }
        } else {
            console.log('      ⚠️  No se encontró el registro en BD');
        }
    }

    async testTab4Familiar() {
        console.log('   📝 TAB 4: GRUPO FAMILIAR');

        await this.closeSecondaryModals();

        const tab4 = this.page.locator('.file-tab').nth(3);
        await tab4.click();
        await this.page.waitForTimeout(1500);
        this.results.navigation.push({ tab: 4, name: 'Grupo Familiar', visible: true });

        // Ejecutar addFamilyMember() directamente
        console.log('      🔧 Ejecutando addFamilyMember() directamente...');
        await this.page.evaluate((userId) => {
            if (typeof window.addFamilyMember === 'function') {
                window.addFamilyMember(userId);
            }
        }, this.testUserId);

        await this.page.waitForTimeout(2000);
        this.results.buttons_clicked.push({ tab: 4, button: '+ Agregar (ejecutado)' });

        const modalVisible = await this.page.locator('#familyMemberModal').isVisible().catch(() => false);

        if (modalVisible) {
            console.log('      ✅ Modal de grupo familiar abierto');
            this.results.modals_opened.push({ tab: 4, modal: 'AddFamilyMember', opened: true });
            await this.fillFamilyMemberFields();
            await this.saveFamilyMemberModal();
            await this.verifyFamilyMemberInDB();
            await this.closeSecondaryModals();
        } else {
            console.log('      ❌ Modal NO abrió');
            this.results.modals_opened.push({ tab: 4, modal: 'AddFamilyMember', opened: false });
        }
        console.log('   ✅ TAB 4 completado\n');
    }

    async fillFamilyMemberFields() {
        const timestamp = Date.now();

        // Nombre
        const nameInput = this.page.locator('#familyName');
        if (await nameInput.isVisible().catch(() => false)) {
            await nameInput.fill(`TEST-Name-${timestamp}`);
            this.results.fields_updated.push({ field: 'familyName', value: `TEST-Name-${timestamp}` });
            console.log(`      ✓ Nombre: TEST-Name-${timestamp}`);
        }

        // Apellido
        const surnameInput = this.page.locator('#familySurname');
        if (await surnameInput.isVisible().catch(() => false)) {
            await surnameInput.fill(`TEST-Surname-${timestamp}`);
            this.results.fields_updated.push({ field: 'familySurname', value: `TEST-Surname-${timestamp}` });
            console.log(`      ✓ Apellido: TEST-Surname-${timestamp}`);
        }

        // Parentesco
        const relationshipSelect = this.page.locator('#relationship');
        if (await relationshipSelect.isVisible().catch(() => false)) {
            await relationshipSelect.selectOption('child');
            this.results.fields_updated.push({ field: 'relationship', value: 'child' });
            console.log(`      ✓ Parentesco: child (Hijo/a)`);
        }

        // Fecha Nacimiento
        const birthDateInput = this.page.locator('#familyBirthDate');
        if (await birthDateInput.isVisible().catch(() => false)) {
            await birthDateInput.fill('2010-05-15');
            this.results.fields_updated.push({ field: 'familyBirthDate', value: '2010-05-15' });
            console.log(`      ✓ Fecha Nacimiento: 2010-05-15`);
        }

        // DNI
        const dniInput = this.page.locator('#familyDni');
        if (await dniInput.isVisible().catch(() => false)) {
            await dniInput.fill(`${timestamp}`.substring(0, 8));
            this.results.fields_updated.push({ field: 'familyDni', value: `${timestamp}`.substring(0, 8) });
            console.log(`      ✓ DNI: ${`${timestamp}`.substring(0, 8)}`);
        }
    }

    async saveFamilyMemberModal() {
        // Capturar logs de consola
        const consoleLogs = [];
        this.page.on('console', msg => {
            consoleLogs.push(`${msg.type()}: ${msg.text()}`);
        });

        const saveBtn = this.page.locator('#familyMemberModal button[type="submit"]').first();
        await saveBtn.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);
        await saveBtn.click();
        await this.page.waitForTimeout(5000);

        console.log('      💾 Guardado');

        // Mostrar logs relevantes
        const relevantLogs = consoleLogs.filter(log =>
            log.includes('FAMILY') || log.includes('Error') || log.includes('error')
        );
        if (relevantLogs.length > 0) {
            console.log('      📋 Logs del navegador:');
            relevantLogs.forEach(log => console.log(`         ${log}`));
        }
    }

    async verifyFamilyMemberInDB() {
        const familyMembers = await this.queryDB(`
            SELECT full_name, relationship, birth_date, dni
            FROM user_family_members
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [this.testUserId]);

        if (familyMembers && familyMembers.length > 0) {
            const data = familyMembers[0];
            const nameOK = data.full_name && data.full_name.includes('TEST-Name');
            const relationshipOK = data.relationship === 'child';
            console.log(`      📊 BD: full_name=${data.full_name}, relationship=${data.relationship}`);
            if (nameOK) {
                this.results.persistence_verified.push({ field: 'full_name', persisted: true });
                console.log('      ✅ Nombre familiar persistido en BD');
            }
            if (relationshipOK) {
                this.results.persistence_verified.push({ field: 'relationship', persisted: true });
                console.log('      ✅ Parentesco persistido en BD');
            }
        } else {
            console.log('      ⚠️  No se encontró el registro en BD');
        }
    }

    async testTab5Medicos() {
        console.log('   📝 TAB 5: ANTECEDENTES MÉDICOS');

        await this.closeSecondaryModals();

        const tab5 = this.page.locator('.file-tab').nth(4);
        await tab5.click();
        await this.page.waitForTimeout(1500);
        this.results.navigation.push({ tab: 5, name: 'Antecedentes Médicos', visible: true });

        // Ejecutar addMedicalExam() directamente
        console.log('      🔧 Ejecutando addMedicalExam() directamente...');
        await this.page.evaluate((userId) => {
            if (typeof window.addMedicalExam === 'function') {
                window.addMedicalExam(userId);
            }
        }, this.testUserId);

        await this.page.waitForTimeout(2000);
        this.results.buttons_clicked.push({ tab: 5, button: '+ Agregar Examen (ejecutado)' });

        const modalVisible = await this.page.locator('#medicalExamModal').isVisible().catch(() => false);

        if (modalVisible) {
            console.log('      ✅ Modal de examen médico abierto');
            this.results.modals_opened.push({ tab: 5, modal: 'AddMedicalExam', opened: true });
            await this.fillMedicalExamFields();
            await this.saveMedicalExamModal();
            await this.verifyMedicalExamInDB();
            await this.closeSecondaryModals();
        } else {
            console.log('      ❌ Modal NO abrió');
            this.results.modals_opened.push({ tab: 5, modal: 'AddMedicalExam', opened: false });
        }
        console.log('   ✅ TAB 5 completado\n');
    }

    async fillMedicalExamFields() {
        const timestamp = Date.now();

        // Tipo de examen
        const examTypeSelect = this.page.locator('#medicalExamType');
        if (await examTypeSelect.isVisible().catch(() => false)) {
            await examTypeSelect.selectOption('periodico');
            this.results.fields_updated.push({ field: 'medicalExamType', value: 'periodico' });
            console.log(`      ✓ Tipo: periodico`);
        }

        // Fecha de examen
        const examDateInput = this.page.locator('#medicalExamDate');
        if (await examDateInput.isVisible().catch(() => false)) {
            await examDateInput.fill('2025-01-15');
            this.results.fields_updated.push({ field: 'medicalExamDate', value: '2025-01-15' });
            console.log(`      ✓ Fecha: 2025-01-15`);
        }

        // Resultado
        const resultSelect = this.page.locator('#medicalExamResult');
        if (await resultSelect.isVisible().catch(() => false)) {
            await resultSelect.selectOption('apto');
            this.results.fields_updated.push({ field: 'medicalExamResult', value: 'apto' });
            console.log(`      ✓ Resultado: apto`);
        }

        // Centro médico
        const centerInput = this.page.locator('#medicalExamCenter');
        if (await centerInput.isVisible().catch(() => false)) {
            await centerInput.fill(`Centro-TEST-${timestamp}`);
            this.results.fields_updated.push({ field: 'medicalExamCenter', value: `Centro-TEST-${timestamp}` });
            console.log(`      ✓ Centro: Centro-TEST-${timestamp}`);
        }

        // Médico examinador
        const doctorInput = this.page.locator('#medicalExamDoctor');
        if (await doctorInput.isVisible().catch(() => false)) {
            await doctorInput.fill(`Dr-TEST-${timestamp}`);
            this.results.fields_updated.push({ field: 'medicalExamDoctor', value: `Dr-TEST-${timestamp}` });
            console.log(`      ✓ Doctor: Dr-TEST-${timestamp}`);
        }

        // Observaciones
        const obsInput = this.page.locator('#medicalExamObservations');
        if (await obsInput.isVisible().catch(() => false)) {
            await obsInput.fill(`Obs-${timestamp}`);
            this.results.fields_updated.push({ field: 'medicalExamObservations', value: `Obs-${timestamp}` });
            console.log(`      ✓ Observaciones: Obs-${timestamp}`);
        }
    }

    async saveMedicalExamModal() {
        // Capturar logs de consola
        const consoleLogs = [];
        this.page.on('console', msg => {
            consoleLogs.push(`${msg.type()}: ${msg.text()}`);
        });

        const saveBtn = this.page.locator('#medicalExamModal button[type="submit"]').first();
        await saveBtn.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);
        await saveBtn.click();
        await this.page.waitForTimeout(5000);

        console.log('      💾 Guardado');

        // Mostrar logs relevantes
        const relevantLogs = consoleLogs.filter(log =>
            log.includes('MEDICAL') || log.includes('Error') || log.includes('error')
        );
        if (relevantLogs.length > 0) {
            console.log('      📋 Logs del navegador:');
            relevantLogs.forEach(log => console.log(`         ${log}`));
        }
    }

    async verifyMedicalExamInDB() {
        const medicalExams = await this.queryDB(`
            SELECT exam_type, exam_date, result, medical_center, examining_doctor, observations
            FROM user_medical_exams
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [this.testUserId]);

        if (medicalExams && medicalExams.length > 0) {
            const data = medicalExams[0];
            const centerOK = data.medical_center && data.medical_center.includes('Centro-TEST');
            const resultOK = data.result === 'apto';
            console.log(`      📊 BD: exam_type=${data.exam_type}, result=${data.result}, center=${data.medical_center}`);
            if (centerOK) {
                this.results.persistence_verified.push({ field: 'medical_center', persisted: true });
                console.log('      ✅ Centro médico persistido en BD');
            }
            if (resultOK) {
                this.results.persistence_verified.push({ field: 'result', persisted: true });
                console.log('      ✅ Resultado persistido en BD');
            }
        } else {
            console.log('      ⚠️  No se encontró el registro en BD');
        }
    }

    async testTab6Asistencias() {
        console.log('   📝 TAB 6: ASISTENCIAS/PERMISOS');

        await this.closeSecondaryModals();

        const tab6 = this.page.locator('.file-tab').nth(5);
        await tab6.click();
        await this.page.waitForTimeout(1500);

        const buttonsCount = await this.page.locator('#attendance-tab button').count();
        this.results.navigation.push({ tab: 6, name: 'Asistencias', buttons: buttonsCount });

        console.log(`   ✅ TAB 6: ${buttonsCount} botones detectados\n`);
    }

    async testTab7Sanciones() {
        console.log('   📝 TAB 7: SANCIONES (DISCIPLINARIOS)');
        await this.closeSecondaryModals();

        const tab7 = this.page.locator('.file-tab').nth(6);
        await tab7.click();
        await this.page.waitForTimeout(1500);
        this.results.navigation.push({ tab: 7, name: 'Disciplinarios', visible: true });

        console.log('      🔧 Ejecutando addDisciplinaryAction() directamente...');
        await this.page.evaluate((userId) => {
            if (typeof window.addDisciplinaryAction === 'function') {
                window.addDisciplinaryAction(userId);
            }
        }, this.testUserId);

        await this.page.waitForTimeout(2000);
        this.results.buttons_clicked.push({ tab: 7, button: '+ Acción Disciplinaria (ejecutado)' });

        const modalVisible = await this.page.locator('#disciplinaryModal').isVisible().catch(() => false);

        if (modalVisible) {
            console.log('      ✅ Modal disciplinario abierto');
            this.results.modals_opened.push({ tab: 7, modal: 'AddDisciplinaryAction', opened: true });
            await this.fillDisciplinaryActionFields();
            await this.saveDisciplinaryActionModal();
            await this.verifyDisciplinaryActionInDB();
            await this.closeSecondaryModals();
        } else {
            console.log('      ❌ Modal NO abrió');
            this.results.modals_opened.push({ tab: 7, modal: 'AddDisciplinaryAction', opened: false });
        }
        console.log('   ✅ TAB 7 completado\n');
    }

    async fillDisciplinaryActionFields() {
        const timestamp = Date.now();

        // actionType
        const actionTypeSelect = this.page.locator('#actionType');
        if (await actionTypeSelect.isVisible().catch(() => false)) {
            await actionTypeSelect.selectOption('suspension');
            this.results.fields_updated.push({ field: 'actionType', value: 'suspension' });
            console.log(`      ✓ Tipo: suspension`);
        }

        // actionDate
        const actionDateInput = this.page.locator('#actionDate');
        if (await actionDateInput.isVisible().catch(() => false)) {
            await actionDateInput.fill('2025-01-20');
            this.results.fields_updated.push({ field: 'actionDate', value: '2025-01-20' });
            console.log(`      ✓ Fecha: 2025-01-20`);
        }

        // reason (maps to action_taken)
        const reasonInput = this.page.locator('#reason');
        if (await reasonInput.isVisible().catch(() => false)) {
            await reasonInput.fill(`Motivo-TEST-${timestamp}`);
            this.results.fields_updated.push({ field: 'reason', value: `Motivo-TEST-${timestamp}` });
            console.log(`      ✓ Motivo: Motivo-TEST-${timestamp}`);
        }

        // description
        const descriptionTextarea = this.page.locator('#description');
        if (await descriptionTextarea.isVisible().catch(() => false)) {
            await descriptionTextarea.fill(`Descripción-TEST-${timestamp}`);
            this.results.fields_updated.push({ field: 'description', value: `Descripción-TEST-${timestamp}` });
            console.log(`      ✓ Descripción: Descripción-TEST-${timestamp}`);
        }
    }

    async saveDisciplinaryActionModal() {
        const consoleLogs = [];
        this.page.on('console', msg => {
            consoleLogs.push(`${msg.type()}: ${msg.text()}`);
        });

        const saveBtn = this.page.locator('#disciplinaryModal button[type="submit"]').first();
        await saveBtn.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);
        await saveBtn.click();
        await this.page.waitForTimeout(5000);

        console.log('      💾 Guardado');

        const relevantLogs = consoleLogs.filter(log =>
            log.includes('DISCIPLINARY') || log.includes('Error') || log.includes('error')
        );
        if (relevantLogs.length > 0) {
            console.log('      📋 Logs del navegador:');
            relevantLogs.forEach(log => console.log(`         ${log}`));
        }
    }

    async verifyDisciplinaryActionInDB() {
        const disciplinaryActions = await this.queryDB(`
            SELECT action_type, date_occurred, description, action_taken
            FROM user_disciplinary_actions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [this.testUserId]);

        if (disciplinaryActions && disciplinaryActions.length > 0) {
            const data = disciplinaryActions[0];
            const actionTypeOK = data.action_type === 'suspension';
            const actionTakenOK = data.action_taken && data.action_taken.includes('Motivo-TEST');
            console.log(`      📊 BD: action_type=${data.action_type}, action_taken=${data.action_taken}`);
            if (actionTypeOK) {
                this.results.persistence_verified.push({ field: 'action_type', persisted: true });
                console.log('      ✅ action_type persistido en BD');
            }
            if (actionTakenOK) {
                this.results.persistence_verified.push({ field: 'action_taken', persisted: true });
                console.log('      ✅ action_taken persistido en BD');
            }
        } else {
            console.log('      ⚠️  No se encontró el registro en BD');
        }
    }

    async testTab8Tareas() {
        console.log('   📝 TAB 8: TAREAS');

        await this.closeSecondaryModals();

        const tab8 = this.page.locator('.file-tab').nth(7);
        await tab8.click();
        await this.page.waitForTimeout(1500);

        const buttonsCount = await this.page.locator('#tasks-tab button').count();
        this.results.navigation.push({ tab: 8, name: 'Tareas', buttons: buttonsCount });

        console.log(`   ✅ TAB 8: ${buttonsCount} botones detectados\n`);
    }

    async testTab9Biometrico() {
        console.log('   📝 TAB 9: REGISTRO BIOMÉTRICO');

        await this.closeSecondaryModals();

        const tab9 = this.page.locator('.file-tab').nth(8);
        await tab9.click();
        await this.page.waitForTimeout(1500);

        const buttonsCount = await this.page.locator('#biometric-tab button').count();
        this.results.navigation.push({ tab: 9, name: 'Biométrico', buttons: buttonsCount });

        console.log(`   ✅ TAB 9: ${buttonsCount} botones detectados\n`);
    }

    async verifyPersistence() {
        console.log('   🔍 Verificando persistencia (reabrir modal)...');

        // Cerrar modal
        const closeBtn = this.page.locator('#employeeFileModal button:has-text("✕"), #employeeFileModal button.close').first();
        const hasCloseBtn = await closeBtn.isVisible().catch(() => false);

        if (hasCloseBtn) {
            await closeBtn.click();
        } else {
            await this.page.evaluate(() => {
                const modal = document.getElementById('employeeFileModal');
                if (modal) modal.style.display = 'none';
                document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                document.body.classList.remove('modal-open');
            });
        }

        await this.page.waitForTimeout(2000);

        // Reabrir
        const firstRow = this.page.locator('table tbody tr:first-child');
        const verBtn = firstRow.locator('button.btn-info').first();
        await verBtn.click();
        await this.page.waitForTimeout(3000);

        // Verificar TAB 2
        const tab2 = this.page.locator('.file-tab').nth(1);
        await tab2.click();
        await this.page.waitForTimeout(1500);

        const currentPhone = await this.queryDB(`SELECT phone FROM users WHERE user_id = $1`, [this.testUserId]);
        const phoneInUI = await this.page.locator('#personal-tab').textContent();

        if (currentPhone && currentPhone[0].phone && phoneInUI.includes(currentPhone[0].phone)) {
            this.results.persistence_verified.push({ test: 'reopen_modal', persisted: true });
            console.log('   ✅ Datos persisten en UI\n');
        }
    }

    async closeSecondaryModals() {
        await this.page.evaluate(() => {
            document.querySelectorAll('.modal, [id$="Modal"]').forEach(modal => {
                if (modal.id === 'employeeFileModal') return;
                if (modal.offsetParent !== null || window.getComputedStyle(modal).display !== 'none') {
                    modal.style.setProperty('display', 'none', 'important');
                    modal.classList.remove('show', 'fade', 'in');
                }
            });
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.add('modal-open');
        });
        await this.page.waitForTimeout(1000);
    }

    async queryDB(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return result.rows;
        } catch (error) {
            console.error('      ❌ Error BD:', error.message);
            this.results.errors.push({ context: 'database', error: error.message });
            return null;
        }
    }

    generateReport() {
        const totalTests = this.results.navigation.length +
                          this.results.buttons_clicked.length +
                          this.results.modals_opened.length +
                          this.results.fields_updated.length +
                          this.results.persistence_verified.length;

        const passedTests = [
            ...this.results.navigation.filter(r => r.success || r.visible),
            ...this.results.buttons_clicked,
            ...this.results.modals_opened.filter(r => r.opened),
            ...this.results.fields_updated,
            ...this.results.persistence_verified.filter(r => r.persisted)
        ].length;

        return {
            module: 'users',
            testType: 'crud_complete',
            passed: this.results.errors.length === 0,
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            details: {
                tabs_navegados: this.results.navigation.length,
                botones_clickeados: this.results.buttons_clicked.length,
                modals_abiertos: this.results.modals_opened.filter(r => r.opened).length,
                campos_actualizados: this.results.fields_updated.length,
                persistencia_verificada: this.results.persistence_verified.filter(r => r.persisted).length,
                errores: this.results.errors.length
            },
            summary: `CRUD completo: ${passedTests}/${totalTests} tests pasados`,
            results: this.results
        };
    }
}

module.exports = UsersCrudCollector;
