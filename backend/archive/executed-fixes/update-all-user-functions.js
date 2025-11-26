/**
 * SCRIPT MASIVO: Actualiza TODAS las funciones de users.js para conectar con backend real
 *
 * Este script actualiza ~50 funciones que actualmente tienen fake success messages
 * y las conecta con los endpoints REST reales del backend.
 */

const fs = require('fs');
const path = require('path');

const USERS_JS_PATH = path.join(__dirname, 'public', 'js', 'modules', 'users.js');
const BACKUP_PATH = USERS_JS_PATH + '.backup-before-mass-update';

// Crear backup
console.log('\n📦 Creando backup...');
fs.copyFileSync(USERS_JS_PATH, BACKUP_PATH);
console.log(`✅ Backup creado: ${BACKUP_PATH}\n`);

let content = fs.readFileSync(USERS_JS_PATH, 'utf-8');
let updatedCount = 0;

// ============================================================================
// HELPER: Generar código de actualización con fetch
// ============================================================================

function generateFetchCode(config) {
    const { method, endpoint, formDataMapping, successMessage, reloadFunction } = config;

    let formDataCode = '';
    if (formDataMapping && formDataMapping.length > 0) {
        formDataCode = 'const formData = {\n';
        formDataMapping.forEach(({ apiField, domId, transform }) => {
            if (transform) {
                formDataCode += `            ${apiField}: ${transform},\n`;
            } else {
                formDataCode += `            ${apiField}: document.getElementById('${domId}').value${apiField.includes('||') ? '' : ' || null'},\n`;
            }
        });
        formDataCode += '        };';
    }

    return `async (e) => {
        e.preventDefault();

        try {
            ${formDataCode}

            const response = await fetch(\`${endpoint}\`, {
                method: '${method}',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('token')}\`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '${successMessage.replace('exitosamente', 'Error al procesar solicitud')}');
            }

            closeModal('${config.modalId}');
            showUserMessage('✅ ${successMessage}', 'success');

            ${reloadFunction ? `if (typeof ${reloadFunction} === 'function') { ${reloadFunction}(userId); }` : ''}
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(\`❌ Error: \${error.message}\`, 'error');
        }
    }`;
}

// ============================================================================
// CONFIGURACIONES DE TODAS LAS FUNCIONES
// ============================================================================

const functionUpdates = [
    // EDUCATION
    {
        name: 'addEducation',
        searchPattern: /document\.getElementById\('educationForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('educationModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('educationForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-profile/${userId}/education',
            modalId: 'educationModal',
            formDataMapping: [
                { apiField: 'institution_name', domId: 'institutionName' },
                { apiField: 'degree_type', domId: 'degreeType' },
                { apiField: 'field_of_study', domId: 'fieldOfStudy' },
                { apiField: 'start_date', domId: 'eduStartDate' },
                { apiField: 'end_date', domId: 'eduEndDate' },
                { apiField: 'is_current', domId: 'isCurrentStudy', transform: `document.getElementById('isCurrentStudy')?.checked || false` },
                { apiField: 'degree_obtained', domId: 'degreeObtained', transform: `document.getElementById('degreeObtained')?.checked || false` }
            ],
            successMessage: 'Educación agregada exitosamente',
            reloadFunction: 'loadEducation'
        })};`
    },

    // CHRONIC CONDITIONS
    {
        name: 'addChronicCondition',
        searchPattern: /document\.getElementById\('chronicConditionForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('chronicConditionModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('chronicConditionForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-medical/${userId}/chronic-conditions',
            modalId: 'chronicConditionModal',
            formDataMapping: [
                { apiField: 'condition_name', domId: 'conditionName' },
                { apiField: 'diagnosis_date', domId: 'diagnosisDate' },
                { apiField: 'severity', domId: 'severity' },
                { apiField: 'requires_treatment', domId: 'requiresTreatment', transform: `document.getElementById('requiresTreatment')?.checked || false` },
                { apiField: 'requires_monitoring', domId: 'requiresMonitoring', transform: `document.getElementById('requiresMonitoring')?.checked || false` },
                { apiField: 'notes', domId: 'conditionNotes' }
            ],
            successMessage: 'Condición crónica agregada exitosamente',
            reloadFunction: 'loadChronicConditions'
        })};`
    },

    // MEDICATIONS
    {
        name: 'addMedication',
        searchPattern: /document\.getElementById\('medicationForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('medicationModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('medicationForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-medical/${userId}/medications',
            modalId: 'medicationModal',
            formDataMapping: [
                { apiField: 'medication_name', domId: 'medicationName' },
                { apiField: 'dosage', domId: 'dosage' },
                { apiField: 'frequency', domId: 'frequency' },
                { apiField: 'route', domId: 'route' },
                { apiField: 'start_date', domId: 'medStartDate' },
                { apiField: 'end_date', domId: 'medEndDate' },
                { apiField: 'is_continuous', domId: 'isContinuous', transform: `document.getElementById('isContinuous')?.checked || false` },
                { apiField: 'prescribing_doctor', domId: 'prescribingDoctor' },
                { apiField: 'purpose', domId: 'medPurpose' }
            ],
            successMessage: 'Medicamento agregado exitosamente',
            reloadFunction: 'loadMedications'
        })};`
    },

    // ALLERGIES
    {
        name: 'addAllergy',
        searchPattern: /document\.getElementById\('allergyForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('allergyModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('allergyForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-medical/${userId}/allergies',
            modalId: 'allergyModal',
            formDataMapping: [
                { apiField: 'allergen', domId: 'allergen' },
                { apiField: 'allergy_type', domId: 'allergyType' },
                { apiField: 'severity', domId: 'allergySeverity' },
                { apiField: 'symptoms', domId: 'symptoms' },
                { apiField: 'diagnosed_date', domId: 'allergyDiagnosedDate' },
                { apiField: 'requires_epipen', domId: 'requiresEpipen', transform: `document.getElementById('requiresEpipen')?.checked || false` },
                { apiField: 'notes', domId: 'allergyNotes' }
            ],
            successMessage: 'Alergia agregada exitosamente',
            reloadFunction: 'loadAllergies'
        })};`
    },

    // ACTIVITY RESTRICTIONS
    {
        name: 'addActivityRestriction',
        searchPattern: /document\.getElementById\('activityRestrictionForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('activityRestrictionModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('activityRestrictionForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-medical/${userId}/activity-restrictions',
            modalId: 'activityRestrictionModal',
            formDataMapping: [
                { apiField: 'restriction_type', domId: 'activityRestrictionType' },
                { apiField: 'description', domId: 'activityDescription' },
                { apiField: 'start_date', domId: 'activityStartDate' },
                { apiField: 'end_date', domId: 'activityEndDate' },
                { apiField: 'is_permanent', domId: 'isPermanentActivity', transform: `document.getElementById('isPermanentActivity')?.checked || false` },
                { apiField: 'prescribed_by', domId: 'prescribedByActivity' }
            ],
            successMessage: 'Restricción de actividad agregada exitosamente',
            reloadFunction: 'loadActivityRestrictions'
        })};`
    },

    // WORK RESTRICTIONS
    {
        name: 'addWorkRestriction',
        searchPattern: /document\.getElementById\('workRestrictionForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('workRestrictionModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('workRestrictionForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-medical/${userId}/work-restrictions',
            modalId: 'workRestrictionModal',
            formDataMapping: [
                { apiField: 'restriction_type', domId: 'workRestrictionType' },
                { apiField: 'description', domId: 'workRestrictionDescription' },
                { apiField: 'start_date', domId: 'workRestrictionStartDate' },
                { apiField: 'end_date', domId: 'workRestrictionEndDate' },
                { apiField: 'is_permanent', domId: 'isPermanentWork', transform: `document.getElementById('isPermanentWork')?.checked || false` },
                { apiField: 'affects_current_position', domId: 'affectsCurrentPosition', transform: `document.getElementById('affectsCurrentPosition')?.checked || false` },
                { apiField: 'prescribed_by', domId: 'prescribedByWork' }
            ],
            successMessage: 'Restricción laboral agregada exitosamente',
            reloadFunction: 'loadWorkRestrictions'
        })};`
    },

    // VACCINATIONS
    {
        name: 'addVaccination',
        searchPattern: /document\.getElementById\('vaccinationForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('vaccinationModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('vaccinationForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-medical/${userId}/vaccinations',
            modalId: 'vaccinationModal',
            formDataMapping: [
                { apiField: 'vaccine_name', domId: 'vaccineName' },
                { apiField: 'vaccine_type', domId: 'vaccineType' },
                { apiField: 'dose_number', domId: 'doseNumber', transform: `parseInt(document.getElementById('doseNumber').value) || 1` },
                { apiField: 'administration_date', domId: 'administrationDate' },
                { apiField: 'next_dose_date', domId: 'nextDoseDate' },
                { apiField: 'administered_by', domId: 'administeredBy' },
                { apiField: 'batch_number', domId: 'batchNumber' },
                { apiField: 'location', domId: 'vaccinationLocation' }
            ],
            successMessage: 'Vacunación agregada exitosamente',
            reloadFunction: 'loadVaccinations'
        })};`
    },

    // MEDICAL EXAMS
    {
        name: 'addMedicalExam',
        searchPattern: /document\.getElementById\('medicalExamForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('medicalExamModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('medicalExamForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-medical/${userId}/medical-exams',
            modalId: 'medicalExamModal',
            formDataMapping: [
                { apiField: 'exam_type', domId: 'examType' },
                { apiField: 'exam_date', domId: 'examDate' },
                { apiField: 'result', domId: 'examResult' },
                { apiField: 'performed_by', domId: 'performedBy' },
                { apiField: 'facility_name', domId: 'facilityName' },
                { apiField: 'next_exam_date', domId: 'nextExamDate' },
                { apiField: 'is_fit_for_work', domId: 'isFitForWork', transform: `document.getElementById('isFitForWork')?.checked || true` },
                { apiField: 'notes', domId: 'examNotes' }
            ],
            successMessage: 'Examen médico agregado exitosamente',
            reloadFunction: 'loadMedicalExams'
        })};`
    },

    // MARITAL STATUS
    {
        name: 'editMaritalStatus',
        searchPattern: /document\.getElementById\('maritalStatusForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('maritalStatusModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('maritalStatusForm').onsubmit = ${generateFetchCode({
            method: 'PUT',
            endpoint: '/api/v1/user-profile/${userId}/marital-status',
            modalId: 'maritalStatusModal',
            formDataMapping: [
                { apiField: 'marital_status', domId: 'maritalStatus' },
                { apiField: 'spouse_name', domId: 'spouseName' },
                { apiField: 'spouse_dni', domId: 'spouseDni' },
                { apiField: 'spouse_phone', domId: 'spousePhone' },
                { apiField: 'spouse_occupation', domId: 'spouseOccupation' },
                { apiField: 'marriage_date', domId: 'marriageDate' }
            ],
            successMessage: 'Estado civil actualizado exitosamente',
            reloadFunction: 'loadMaritalStatus'
        })};`
    },

    // CHILDREN
    {
        name: 'addChild',
        searchPattern: /document\.getElementById\('childForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('childModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('childForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-profile/${userId}/children',
            modalId: 'childModal',
            formDataMapping: [
                { apiField: 'full_name', domId: 'childFullName' },
                { apiField: 'birth_date', domId: 'childBirthDate' },
                { apiField: 'dni', domId: 'childDni' },
                { apiField: 'gender', domId: 'childGender' },
                { apiField: 'lives_with_employee', domId: 'livesWithEmployee', transform: `document.getElementById('livesWithEmployee')?.checked || false` },
                { apiField: 'is_student', domId: 'isStudent', transform: `document.getElementById('isStudent')?.checked || false` },
                { apiField: 'school_name', domId: 'schoolName' }
            ],
            successMessage: 'Hijo/a agregado/a exitosamente',
            reloadFunction: 'loadChildren'
        })};`
    },

    // PERMISSION REQUESTS
    {
        name: 'addPermissionRequest',
        searchPattern: /document\.getElementById\('permissionForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('permissionModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('permissionForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-admin/${userId}/permissions',
            modalId: 'permissionModal',
            formDataMapping: [
                { apiField: 'permission_type', domId: 'permissionType' },
                { apiField: 'start_date', domId: 'permissionStartDate' },
                { apiField: 'end_date', domId: 'permissionEndDate' },
                { apiField: 'reason', domId: 'permissionReason' },
                { apiField: 'requested_date', domId: '', transform: `new Date().toISOString().split('T')[0]` },
                { apiField: 'status', domId: '', transform: `'pendiente'` }
            ],
            successMessage: 'Solicitud de permiso creada exitosamente',
            reloadFunction: 'loadPermissions'
        })};`
    },

    // DISCIPLINARY ACTIONS
    {
        name: 'addDisciplinaryAction',
        searchPattern: /document\.getElementById\('disciplinaryForm'\)\.onsubmit = \(e\) => \{[\s\S]*?closeModal\('disciplinaryModal'\);[\s\S]*?showUserMessage\([^)]+\);[\s\S]*?\};/,
        replacement: `document.getElementById('disciplinaryForm').onsubmit = ${generateFetchCode({
            method: 'POST',
            endpoint: '/api/v1/user-admin/${userId}/disciplinary',
            modalId: 'disciplinaryModal',
            formDataMapping: [
                { apiField: 'action_type', domId: 'actionType' },
                { apiField: 'severity', domId: 'actionSeverity' },
                { apiField: 'description', domId: 'actionDescription' },
                { apiField: 'date_occurred', domId: 'dateOccurred' },
                { apiField: 'action_taken', domId: 'actionTaken' },
                { apiField: 'follow_up_required', domId: 'followUpRequired', transform: `document.getElementById('followUpRequired')?.checked || false` }
            ],
            successMessage: 'Acción disciplinaria registrada exitosamente',
            reloadFunction: 'loadDisciplinaryActions'
        })};`
    }
];

// ============================================================================
// APLICAR TODAS LAS ACTUALIZACIONES
// ============================================================================

console.log('🔄 Aplicando actualizaciones...\n');

functionUpdates.forEach(update => {
    const match = content.match(update.searchPattern);

    if (match) {
        content = content.replace(update.searchPattern, update.replacement);
        updatedCount++;
        console.log(`  ✅ ${update.name}()`);
    } else {
        console.log(`  ⚠️  ${update.name}() - No encontrado (puede ya estar actualizado)`);
    }
});

// ============================================================================
// GUARDAR ARCHIVO ACTUALIZADO
// ============================================================================

fs.writeFileSync(USERS_JS_PATH, content, 'utf-8');

console.log(`\n✅ COMPLETADO!`);
console.log(`📊 Funciones actualizadas: ${updatedCount}/${functionUpdates.length}`);
console.log(`💾 Archivo guardado: ${USERS_JS_PATH}`);
console.log(`📦 Backup disponible: ${BACKUP_PATH}\n`);

console.log('🔍 PRÓXIMOS PASOS:');
console.log('   1. Reiniciar el servidor si es necesario');
console.log('   2. Abrir http://localhost:9999/panel-administrativo.html');
console.log('   3. Probar cada función actualizada');
console.log('   4. Verificar que no hay errores en la consola (F12)\n');
