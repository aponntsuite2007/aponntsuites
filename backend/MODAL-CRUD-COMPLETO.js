// =====================================================
// MODAL-CRUD-COMPLETO.js
// Sistema de CRUD unificado para los 9 TABS del modal de usuario
// =====================================================

const API_BASE_URL = 'http://localhost:9998';

// =====================================================
// HELPERS GENERALES
// =====================================================

function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
    };
}

async function refreshUserModal(userId) {
    await closeEmployeeFile();
    await viewUser(userId);
}

// =====================================================
// TAB 1: ADMINISTRACIÓN
// =====================================================

// Cambiar rol del usuario
async function editUserRole(userId, currentRole) {
    const roles = {
        'admin': '👑 Administrador',
        'supervisor': '🔧 Supervisor',
        'medical': '🏥 Médico',
        'employee': '👤 Empleado'
    };

    const roleOptions = Object.keys(roles).map(key =>
        `${key === currentRole ? '✓ ' : ''}${roles[key]} (${key})`
    ).join('\n');

    const newRole = prompt(`Seleccione nuevo rol:\n\n${roleOptions}\n\nIngrese uno de: admin, supervisor, medical, employee`, currentRole);

    if (!newRole || newRole === currentRole || !roles[newRole]) return;

    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
    });

    if (!response.ok) {
        alert('❌ Error cambiando rol');
        return;
    }

    alert(`✅ Rol actualizado a: ${roles[newRole]}`);
    await refreshUserModal(userId);
}

// Activar/Desactivar usuario
async function toggleUserStatus(userId) {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });

    if (!response.ok) return;

    const userData = await response.json();
    const user = userData.user || userData;
    const newStatus = !user.isActive;

    if (!confirm(`¿${newStatus ? 'Activar' : 'Desactivar'} este usuario?`)) return;

    const updateResponse = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: newStatus })
    });

    if (!updateResponse.ok) {
        alert('❌ Error actualizando estado');
        return;
    }

    alert(`✅ Usuario ${newStatus ? 'activado' : 'desactivado'}`);
    await refreshUserModal(userId);
}

// Toggle GPS Radius
async function toggleGPSRadius(userId) {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });

    if (!response.ok) return;

    const userData = await response.json();
    const user = userData.user || userData;
    const newValue = !user.allowOutsideRadius;

    if (!confirm(`¿${newValue ? 'Permitir asistencias fuera de área GPS' : 'Restringir GPS al área autorizada'}?`)) return;

    const updateResponse = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ allowOutsideRadius: newValue })
    });

    if (!updateResponse.ok) {
        alert('❌ Error actualizando configuración GPS');
        return;
    }

    alert(`✅ GPS ${newValue ? 'sin restricción' : 'restringido a área autorizada'}`);
    await refreshUserModal(userId);
}

// Gestionar sucursales
async function manageBranches(userId) {
    alert('🏢 Gestión de sucursales - En desarrollo\n\nEsta funcionalidad permitirá asignar al usuario a sucursales específicas.');
}

// Cambiar departamento
async function changeDepartment(userId, currentDeptId) {
    const response = await fetch(`${API_BASE_URL}/api/v1/departments`, {
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        alert('❌ Error cargando departamentos');
        return;
    }

    const data = await response.json();
    const departments = data.departments || data;

    const deptOptions = departments.map(d =>
        `${d.id === parseInt(currentDeptId) ? '✓ ' : ''}${d.name} (ID: ${d.id})`
    ).join('\n');

    const newDeptId = prompt(`Departamentos disponibles:\n\n${deptOptions}\n\nIngrese ID del nuevo departamento:`, currentDeptId);

    if (!newDeptId || newDeptId === currentDeptId) return;

    const updateResponse = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ departmentId: parseInt(newDeptId) })
    });

    if (!updateResponse.ok) {
        alert('❌ Error cambiando departamento');
        return;
    }

    alert('✅ Departamento actualizado');
    await refreshUserModal(userId);
}

// Editar posición
async function editPosition(userId, currentPosition) {
    const newPosition = prompt('💼 Ingrese el nuevo cargo/posición:', currentPosition);

    if (!newPosition || newPosition === currentPosition) return;

    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ position: newPosition })
    });

    if (!response.ok) {
        alert('❌ Error actualizando posición');
        return;
    }

    alert('✅ Posición actualizada');
    await refreshUserModal(userId);
}

// Resetear contraseña
async function resetPassword(userId, userName) {
    const newPassword = prompt(`🔑 Ingrese nueva contraseña para ${userName}:`, '123456');

    if (!newPassword || newPassword.trim() === '') return;

    if (newPassword.length < 6) {
        alert('❌ La contraseña debe tener al menos 6 caracteres');
        return;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword })
    });

    if (!response.ok) {
        alert('❌ Error reseteando contraseña');
        return;
    }

    alert('✅ Contraseña actualizada correctamente');
}

// Asignar turnos (ya existe en users.js)
// async function assignUserShifts(userId, userName) { ... }

// Generar reporte
async function generateUserReport(userId) {
    alert('📊 Generación de reportes - En desarrollo\n\nEsta funcionalidad generará un reporte completo del empleado en PDF.');
}

// Auditar historial
async function auditUserHistory(userId) {
    alert('📋 Auditoría de historial - En desarrollo\n\nEsta funcionalidad mostrará todos los cambios realizados en el expediente del empleado.');
}

// =====================================================
// TAB 2: DATOS PERSONALES
// =====================================================

// Editar información de contacto
async function editContactInfo(userId) {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders()
    });

    if (!response.ok) return;

    const userData = await response.json();
    const user = userData.user || userData;

    const emergencyContact = prompt('📞 Contacto de emergencia:', user.emergencyContact || '');
    const emergencyPhone = prompt('📱 Teléfono de emergencia:', user.emergencyPhone || '');

    if (!emergencyContact && !emergencyPhone) return;

    const updateResponse = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            emergencyContact: emergencyContact || user.emergencyContact,
            emergencyPhone: emergencyPhone || user.emergencyPhone
        })
    });

    if (!updateResponse.ok) {
        alert('❌ Error actualizando contactos');
        return;
    }

    alert('✅ Información de contacto actualizada');
    await refreshUserModal(userId);
}

// Editar obra social
async function editHealthInsurance(userId) {
    alert('🏥 Gestión de Obra Social - En desarrollo\n\nPermitirá configurar:\n- Tipo de cobertura\n- Obra Social/Prepaga\n- Plan\n- Modalidad\n- % pagado por empresa');
}

// Agregar formación académica
async function addEducation(userId) {
    alert('🎓 Formación Académica - En desarrollo\n\nPermitirá registrar:\n- Estudios primarios/secundarios/terciarios/universitarios\n- Títulos obtenidos\n- Capacitaciones realizadas');
}

// Gestionar documentos personales
async function managePersonalDocuments(userId) {
    alert('📄 Gestión de Documentos - En desarrollo\n\nPermitirá gestionar:\n- DNI (frente/dorso)\n- Pasaporte\n- Visa de trabajo');
}

// Subir fotos de DNI
async function uploadDNIPhotos(userId) {
    alert('📷 Subir fotos de DNI - En desarrollo\n\nPermitirá subir:\n- Foto frente del DNI\n- Foto dorso del DNI');
}

// Gestionar pasaporte
async function managePassport(userId) {
    alert('📘 Gestión de Pasaporte - En desarrollo\n\nPermitirá registrar:\n- Número de pasaporte\n- Fecha de emisión\n- Fecha de vencimiento\n- País emisor');
}

// Gestionar visa de trabajo
async function manageWorkVisa(userId) {
    alert('🌍 Visa de Trabajo - En desarrollo\n\nPermitirá registrar:\n- Tipo de visa\n- País emisor\n- Fecha de vencimiento\n- Estado');
}

// Gestionar licencias de conducción
async function manageDrivingLicenses(userId) {
    alert('🚗 Gestión de Licencias - En desarrollo\n\nPermitirá gestionar:\n- Licencia nacional (clases, vencimiento)\n- Licencia internacional');
}

// Editar licencia nacional
async function editNationalLicense(userId) {
    alert('📄 Licencia Nacional - En desarrollo\n\nPermitirá editar:\n- Número de licencia\n- Clases habilitadas\n- Fecha de vencimiento');
}

// Editar licencia internacional
async function editInternationalLicense(userId) {
    alert('🌏 Licencia Internacional - En desarrollo\n\nPermitirá editar:\n- Número de licencia\n- Países válidos\n- Fecha de vencimiento');
}

// Gestionar licencias profesionales
async function manageProfessionalLicenses(userId) {
    alert('🚛 Licencias Profesionales - En desarrollo\n\nPermitirá gestionar licencias de:\n- Transporte de cargas peligrosas\n- Conducción de vehículos pesados\n- Operador de maquinaria\n- Otras certificaciones');
}

// Recalcular score del empleado
async function recalculateScore(userId) {
    alert('🔄 Recalculando puntuación del empleado...\n\nEsta funcionalidad analizará:\n- Educación\n- Experiencia laboral\n- Comportamiento\n- Capacitaciones\n- Estado médico\n- Historial disciplinario');
}

// =====================================================
// TAB 3: ANTECEDENTES LABORALES
// =====================================================

// Agregar juicio/mediación
async function addLegalIssue(userId) {
    alert('⚖️ Registrar Juicio/Mediación - En desarrollo\n\nPermitirá registrar:\n- Tipo (juicio/mediación/conciliación)\n- Fecha de inicio\n- Estado actual\n- Descripción\n- Resolución');
}

// Editar afiliación gremial
async function addUnionAffiliation(userId) {
    alert('🏭 Afiliación Gremial - En desarrollo\n\nPermitirá configurar:\n- Gremio al que pertenece\n- Si es delegado gremial\n- Período como delegado\n- Fuero sindical');
}

// Asignar tareas
async function assignTasks(userId) {
    alert('🎯 Asignar Tareas - En desarrollo\n\nPermitirá:\n- Ver tareas disponibles en la empresa\n- Asignar múltiples tareas al empleado\n- Definir prioridades\n- Establecer plazos');
}

// Agregar historial laboral
async function addWorkHistory(userId) {
    alert('📜 Agregar Historial Laboral - En desarrollo\n\nPermitirá registrar:\n- Empresa anterior\n- Cargo desempeñado\n- Fecha inicio/fin\n- Motivo de salida\n- Referencia verificable');
}

// =====================================================
// TAB 4: GRUPO FAMILIAR
// =====================================================

// Editar estado civil
async function editMaritalStatus(userId) {
    alert('💑 Estado Civil y Cónyuge - En desarrollo\n\nPermitirá registrar:\n- Estado civil (soltero/casado/divorciado/viudo/unión civil)\n- Datos del cónyuge (nombre, DNI, fecha nacimiento)\n- Fecha de matrimonio\n- Si está a cargo (cobertura médica)');
}

// Agregar hijo
async function addChild(userId) {
    alert('👶 Agregar Hijo - En desarrollo\n\nPermitirá registrar:\n- Nombre completo\n- Fecha de nacimiento\n- DNI\n- Género\n- Cobertura médica\n- Escolaridad\n- Discapacidad (si aplica)\n- A cargo del empleado (sí/no)');
}

// Agregar otro familiar
async function addFamilyMember(userId) {
    alert('👥 Agregar Familiar - En desarrollo\n\nPermitirá registrar:\n- Relación (padre/madre/hermano/etc)\n- Nombre completo\n- DNI\n- Fecha de nacimiento\n- A cargo del empleado\n- Cobertura médica');
}

// =====================================================
// TAB 5: ANTECEDENTES MÉDICOS
// =====================================================

// Editar médico de cabecera
async function editPrimaryCarePhysician(userId) {
    alert('👨‍⚕️ Médico de Cabecera - En desarrollo\n\nPermitirá registrar:\n- Nombre del médico\n- Especialidad\n- Teléfono\n- Dirección del consultorio\n- Obra social/prepaga que acepta');
}

// Editar contacto de emergencia médica
async function editMedicalEmergencyContact(userId) {
    alert('🚨 Contacto de Emergencia Médica - En desarrollo\n\nPermitirá registrar:\n- Nombre de contacto\n- Teléfono\n- Relación con el empleado\n- Instrucciones especiales de emergencia');
}

// Agregar condición crónica
async function addChronicCondition(userId) {
    alert('🏥 Agregar Enfermedad/Discapacidad Crónica - En desarrollo\n\nPermitirá registrar:\n- Tipo de condición\n- Fecha de diagnóstico\n- Médico tratante\n- Tratamiento actual\n- Nivel de gravedad\n- Requiere adaptaciones laborales');
}

// Agregar medicación
async function addMedication(userId) {
    alert('💊 Agregar Medicación - En desarrollo\n\nPermitirá registrar:\n- Nombre del medicamento\n- Dosis\n- Frecuencia\n- Horarios de toma\n- Médico que prescribe\n- Fecha inicio\n- Efectos secundarios conocidos');
}

// Agregar alergia
async function addAllergy(userId) {
    alert('🚫 Agregar Alergia - En desarrollo\n\nPermitirá registrar:\n- Tipo de alergia (medicamento/alimento/ambiental)\n- Sustancia específica\n- Nivel de gravedad (leve/moderada/severa)\n- Síntomas\n- Tratamiento de emergencia\n- Requiere epipen');
}

// Agregar restricción de actividad
async function addActivityRestriction(userId) {
    alert('🚷 Restricción de Actividad - En desarrollo\n\nPermitirá registrar:\n- Tipo de actividad restringida\n- Motivo médico\n- Duración (temporal/permanente)\n- Médico que autoriza\n- Certificado médico adjunto');
}

// Agregar restricción laboral
async function addWorkRestriction(userId) {
    alert('⚠️ Restricción Laboral - En desarrollo\n\nPermitirá registrar:\n- Tareas que PUEDE realizar\n- Tareas que NO puede realizar\n- Aprobación del médico laboral\n- Vigencia de la restricción\n- Documentación respaldatoria');
}

// Editar salud mental
async function editMentalHealth(userId) {
    alert('🧠 Salud Mental - En desarrollo\n\nPermitirá registrar:\n- Depresión (sí/no/en tratamiento)\n- Ansiedad (sí/no/en tratamiento)\n- Tratamiento psicológico/psiquiátrico\n- Medicación\n- Observaciones confidenciales');
}

// Agregar vacuna
async function addVaccination(userId) {
    alert('💉 Agregar Vacuna - En desarrollo\n\nPermitirá registrar:\n- Tipo de vacuna\n- Fecha de aplicación\n- Lote\n- Centro de vacunación\n- Próxima dosis (si aplica)\n- Reacciones adversas');
}

// Agregar examen médico
async function addMedicalExam(userId) {
    alert('✅ Agregar Examen Médico - En desarrollo\n\nPermitirá registrar:\n- Tipo de examen (preocupacional/periódico/egreso)\n- Fecha realización\n- Centro médico\n- Resultado (apto/apto con observaciones/no apto)\n- Observaciones\n- Adjuntar PDF');
}

// Subir documento médico
async function uploadMedicalDocument(userId) {
    alert('📤 Subir Documento Médico - En desarrollo\n\nPermitirá subir:\n- Certificados médicos\n- Estudios (análisis, radiografías, etc)\n- Recetas\n- Informes médicos\n- Formato: PDF, JPG, PNG');
}

// Agregar evento médico
async function addMedicalEvent(userId) {
    alert('+ Evento Médico - En desarrollo\n\nPermitirá registrar:\n- Tipo de evento (consulta/internación/cirugía/accidente)\n- Fecha\n- Descripción\n- Diagnóstico\n- Tratamiento indicado\n- Médico tratante');
}

// =====================================================
// TAB 6: ASISTENCIAS/PERMISOS
// =====================================================

// Cargar historial de asistencias
async function loadAttendanceHistory(userId) {
    alert('🔄 Actualizando historial de asistencias...\n\nEsta funcionalidad cargará:\n- Asistencias del último mes\n- Ausencias justificadas/injustificadas\n- Llegadas tarde\n- Retiros anticipados\n- Horas extras');
}

// Agregar permiso
async function addPermissionRequest(userId) {
    alert('+ Agregar Permiso - En desarrollo\n\nPermitirá registrar:\n- Tipo de permiso (personal/estudio/médico/otro)\n- Fecha inicio\n- Fecha fin\n- Medio día / día completo\n- Justificación\n- Documentación adjunta\n- Estado (pendiente/aprobado/rechazado)');
}

// =====================================================
// TAB 7: ACCIONES DISCIPLINARIAS
// =====================================================

// Agregar acción disciplinaria
async function addDisciplinaryAction(userId) {
    alert('⚖️ Agregar Acción Disciplinaria - En desarrollo\n\nPermitirá registrar:\n- Tipo (amonestación/apercibimiento/suspensión)\n- Fecha\n- Motivo detallado\n- Días de suspensión (si aplica)\n- Testimonio del empleado\n- Testigos\n- Documentación adjunta\n- Estado de apelación');
}

// =====================================================
// TAB 8: CONFIGURACIÓN DE TAREAS
// =====================================================

// Gestionar tareas de la empresa
async function manageCompanyTasks() {
    alert('⚙️ Gestionar Tareas de la Empresa - En desarrollo\n\nPermitirá:\n- Ver todas las tareas configuradas\n- Crear nuevas tareas\n- Editar tareas existentes\n- Definir categorías\n- Establecer salarios por tarea');
}

// Crear nueva tarea
async function createNewTask() {
    alert('+ Nueva Tarea - En desarrollo\n\nPermitirá crear tarea con:\n- Nombre de la tarea\n- Categoría\n- Descripción\n- Salario base\n- Modalidad (por hora/día/mes/producción)\n- Requisitos');
}

// Asignar tareas al empleado
async function assignEmployeeTasks(userId) {
    alert('🎯 Asignar Tareas al Empleado - En desarrollo\n\nPermitirá:\n- Ver tareas disponibles\n- Seleccionar múltiples tareas\n- Definir tarea principal\n- Asignar tareas secundarias\n- Establecer prioridades');
}

// Configurar detalles salariales
async function configureSalaryDetails(userId) {
    alert('💰 Configurar Detalles Salariales - En desarrollo\n\nPermitirá configurar:\n- Salario base\n- Modalidad de pago\n- Jornada laboral\n- Horas semanales\n- Adicionales\n- Bonificaciones');
}

// Ver historial de asignación de tareas
async function viewTaskHistory(userId) {
    alert('📊 Historial de Tareas - En desarrollo\n\nMostrará:\n- Fecha de asignación\n- Tarea asignada\n- Duración en el puesto\n- Cambios de categoría\n- Aumentos salariales');
}

// =====================================================
// TAB 9: REGISTRO BIOMÉTRICO
// =====================================================

// Iniciar captura biométrica (ya existe en users.js)
// async function startBiometricCapture(userId, employeeId) { ... }

// =====================================================
// FUNCIONES AUXILIARES YA EXISTENTES
// =====================================================

// Cerrar expediente (ya existe en users.js)
// async function closeEmployeeFile() { ... }

// Ver usuario (ya existe en users.js)
// async function viewUser(userId) { ... }

// Cambiar tab (ya existe en users.js)
// window.showFileTab = function(tabName, button) { ... }

// Cargar datos del expediente (ya existe en users.js)
// async function loadEmployeeFileData(userId) { ... }

// =====================================================
// EXPORTAR FUNCIONES GLOBALES
// =====================================================

window.editUserRole = editUserRole;
window.toggleUserStatus = toggleUserStatus;
window.toggleGPSRadius = toggleGPSRadius;
window.manageBranches = manageBranches;
window.changeDepartment = changeDepartment;
window.editPosition = editPosition;
window.resetPassword = resetPassword;
window.generateUserReport = generateUserReport;
window.auditUserHistory = auditUserHistory;
window.editContactInfo = editContactInfo;
window.editHealthInsurance = editHealthInsurance;
window.addEducation = addEducation;
window.managePersonalDocuments = managePersonalDocuments;
window.uploadDNIPhotos = uploadDNIPhotos;
window.managePassport = managePassport;
window.manageWorkVisa = manageWorkVisa;
window.manageDrivingLicenses = manageDrivingLicenses;
window.editNationalLicense = editNationalLicense;
window.editInternationalLicense = editInternationalLicense;
window.manageProfessionalLicenses = manageProfessionalLicenses;
window.recalculateScore = recalculateScore;
window.addLegalIssue = addLegalIssue;
window.addUnionAffiliation = addUnionAffiliation;
window.assignTasks = assignTasks;
window.addWorkHistory = addWorkHistory;
window.editMaritalStatus = editMaritalStatus;
window.addChild = addChild;
window.addFamilyMember = addFamilyMember;
window.editPrimaryCarePhysician = editPrimaryCarePhysician;
window.editMedicalEmergencyContact = editMedicalEmergencyContact;
window.addChronicCondition = addChronicCondition;
window.addMedication = addMedication;
window.addAllergy = addAllergy;
window.addActivityRestriction = addActivityRestriction;
window.addWorkRestriction = addWorkRestriction;
window.editMentalHealth = editMentalHealth;
window.addVaccination = addVaccination;
window.addMedicalExam = addMedicalExam;
window.uploadMedicalDocument = uploadMedicalDocument;
window.addMedicalEvent = addMedicalEvent;
window.loadAttendanceHistory = loadAttendanceHistory;
window.addPermissionRequest = addPermissionRequest;
window.addDisciplinaryAction = addDisciplinaryAction;
window.manageCompanyTasks = manageCompanyTasks;
window.createNewTask = createNewTask;
window.assignEmployeeTasks = assignEmployeeTasks;
window.configureSalaryDetails = configureSalaryDetails;
window.viewTaskHistory = viewTaskHistory;

console.log('✅ MODAL-CRUD-COMPLETO.js cargado - 45 funciones disponibles');
