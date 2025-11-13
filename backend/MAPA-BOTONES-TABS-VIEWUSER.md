# 📋 MAPA COMPLETO DE BOTONES - Modal viewUser() (9 TABS)

**Fecha:** 2025-01-12
**Archivo fuente:** `backend/public/js/modules/users.js`
**Función:** `viewUser(userId)` - Líneas 1380-2345
**Modal ID:** `#employeeFileModal`

---

## 🎯 RESUMEN EJECUTIVO

- **Total de TABs:** 9
- **Total de botones editables:** 50+
- **Acciones NO editables:** 8 (solo lectura/recalcular)
- **Campos totales estimados:** 366 campos

---

## TAB 1: 👑 Administración (admin-tab)

**Líneas:** 1547-1642
**Botones editables:** 8

| # | Función | Descripción | Línea | Modal Secundario |
|---|---------|-------------|-------|------------------|
| 1 | `editUserRole(userId, currentRole)` | Cambiar rol del usuario | 1557 | #userRoleModal |
| 2 | `toggleUserStatus(userId, isActive)` | Activar/desactivar usuario | 1564 | Acción directa |
| 3 | `toggleGPSRadius(userId, allowOutsideRadius)` | Toggle GPS on/off | 1578 | Acción directa |
| 4 | `manageBranches(userId)` | Gestionar sucursales | 1583 | #branchesModal |
| 5 | `changeDepartment(userId, departmentId)` | Cambiar departamento | 1622 | #departmentModal |
| 6 | `editPosition(userId, position)` | Editar cargo | 1627 | Inline edit |
| 7 | `resetPassword(userId, userName)` | Resetear contraseña | 1636 | Confirmación |
| 8 | `assignUserShifts(userId, userName)` | Asignar turnos | 1637 | #shiftsModal |

**Acciones NO editables (solo info):**
- `generateUserReport(userId)` - Línea 1638
- `auditUserHistory(userId)` - Línea 1639

---

## TAB 2: 👤 Datos Personales (personal-tab)

**Líneas:** 1645-1845
**Botones editables:** 11

| # | Función | Descripción | Línea | Modal Secundario |
|---|---------|-------------|-------|------------------|
| 1 | `editContactInfo(userId)` | Editar contactos de emergencia | 1667 | #contactInfoModal |
| 2 | `editHealthInsurance(userId)` | Configurar obra social/prepaga | 1682 | #healthInsuranceModal |
| 3 | `addEducation(userId)` | Agregar formación académica | 1700 | #educationModal |
| 4 | `managePersonalDocuments(userId)` | Gestionar documentación personal | 1722 | #personalDocsModal |
| 5 | `uploadDNIPhotos(userId)` | Subir fotos del DNI | 1729 | #dniPhotosModal |
| 6 | `managePassport(userId)` | Editar pasaporte | 1736 | #passportModal |
| 7 | `manageWorkVisa(userId)` | Agregar visa de trabajo | 1743 | #workVisaModal |
| 8 | `manageDrivingLicenses(userId)` | Gestionar licencias de conducción | 1752 | #drivingLicensesModal |
| 9 | `editNationalLicense(userId)` | Editar licencia nacional | 1760 | #nationalLicenseModal |
| 10 | `editInternationalLicense(userId)` | Editar licencia internacional | 1769 | #internationalLicenseModal |
| 11 | `manageProfessionalLicenses(userId)` | Agregar licencias profesionales | 1779 | #professionalLicensesModal |

**Acciones NO editables:**
- `recalculateScore(userId)` - Línea 1840

---

## TAB 3: 💼 Antecedentes Laborales (work-tab)

**Líneas:** 1848-1904
**Botones editables:** 4

| # | Función | Descripción | Línea | Modal Secundario |
|---|---------|-------------|-------|------------------|
| 1 | `addLegalIssue(userId)` | Agregar juicio/mediación | 1864 | #legalIssueModal |
| 2 | `addUnionAffiliation(userId)` | Editar afiliación gremial | 1874 | #unionModal |
| 3 | `assignTasks(userId)` | Asignar tareas y categorías | 1887 | #tasksModal |
| 4 | `addWorkHistory(userId)` | Agregar historial de posiciones | 1897 | #workHistoryModal |

---

## TAB 4: 👨‍👩‍👧‍👦 Grupo Familiar (family-tab)

**Líneas:** 1907-1968
**Botones editables:** 3

| # | Función | Descripción | Línea | Modal Secundario |
|---|---------|-------------|-------|------------------|
| 1 | `editMaritalStatus(userId)` | Editar estado civil y cónyuge | 1914 | #maritalStatusModal |
| 2 | `addChild(userId)` | Agregar hijo | 1950 | #childModal |
| 3 | `addFamilyMember(userId)` | Agregar otro familiar | 1961 | #familyMemberModal |

---

## TAB 5: 🏥 Antecedentes Médicos (medical-tab)

**Líneas:** 1971-2143
**Botones editables:** 12

| # | Función | Descripción | Línea | Modal Secundario |
|---|---------|-------------|-------|------------------|
| 1 | `editPrimaryCarePhysician(userId)` | Editar médico de cabecera | 1980 | #primaryCareModal |
| 2 | `editMedicalEmergencyContact(userId)` | Editar contacto emergencia médica | 1994 | #medicalEmergencyModal |
| 3 | `addChronicCondition(userId)` | Agregar enfermedad crónica/discapacidad | 2013 | #chronicConditionModal |
| 4 | `addMedication(userId)` | Agregar medicación frecuente | 2023 | #medicationModal |
| 5 | `addAllergy(userId)` | Agregar alergia | 2036 | #allergyModal |
| 6 | `addActivityRestriction(userId)` | Agregar restricción de actividad | 2046 | #activityRestrictionModal |
| 7 | `addWorkRestriction(userId)` | Agregar restricción laboral | 2059 | #workRestrictionModal |
| 8 | `editMentalHealth(userId)` | Editar salud mental | 2080 | #mentalHealthModal |
| 9 | `addVaccination(userId)` | Agregar vacuna | 2096 | #vaccinationModal |
| 10 | `addMedicalExam(userId)` | Agregar examen médico | 2106 | #medicalExamModal |
| 11 | `uploadMedicalDocument(userId)` | Subir documento médico | 2119 | Upload modal |
| 12 | `addMedicalEvent(userId)` | Agregar evento médico | 2120 | #medicalEventModal |

---

## TAB 6: 📅 Asistencias/Permisos (attendance-tab)

**Líneas:** 2146-2177
**Botones editables:** 2

| # | Función | Descripción | Línea | Modal Secundario |
|---|---------|-------------|-------|------------------|
| 1 | `loadAttendanceHistory(userId)` | Actualizar historial | 2168 | Acción directa (AJAX) |
| 2 | `addPermissionRequest(userId)` | Agregar permiso | 2169 | #permissionRequestModal |

---

## TAB 7: ⚖️ Acciones Disciplinarias (disciplinary-tab)

**Líneas:** 2180-2215
**Botones editables:** 1

| # | Función | Descripción | Línea | Modal Secundario |
|---|---------|-------------|-------|------------------|
| 1 | `addDisciplinaryAction(userId)` | Agregar acción disciplinaria | 2208 | #disciplinaryModal |

---

## TAB 8: 🎯 Configuración de Tareas (tasks-tab)

**Líneas:** 2218-2288
**Botones editables:** 5

| # | Función | Descripción | Línea | Modal Secundario |
|---|---------|-------------|-------|------------------|
| 1 | `manageCompanyTasks()` | Gestionar tareas de empresa | 2231 | #companyTasksModal |
| 2 | `createNewTask()` | Crear nueva tarea | 2234 | #newTaskModal |
| 3 | `assignEmployeeTasks(userId)` | Asignar tareas al empleado | 2250 | #assignTasksModal |
| 4 | `configureSalaryDetails(userId)` | Configurar detalles salariales | 2269 | #salaryDetailsModal |
| 5 | `viewTaskHistory(userId)` | Ver historial de tareas | 2279 | Acción directa (muestra info) |

---

## TAB 9: 📸 Registro Biométrico (biometric-tab)

**Líneas:** 2291-2339
**Botones editables:** 1

| # | Función | Descripción | Línea | Modal Secundario |
|---|---------|-------------|-------|------------------|
| 1 | `startBiometricCapture(userId, employeeId)` | Capturar foto biométrica | 2323 | WebRTC modal |

---

## 🔑 CAMPOS CRÍTICOS QUE REQUIEREN VALIDACIÓN EN BD

### Campos que se guardan en `users` (tabla principal):
- Tab 1: `role`, `isActive`, `allowOutsideRadius`, `departmentId`, `position`
- Tab 2: `emergencyContact`, `emergencyPhone`, healthInsurance (JSON), documents (JSON)

### Campos que se guardan en tablas relacionadas:
- Tab 2: `user_education`, `user_documents`
- Tab 3: `user_work_history`, `legal_issues`, `union_affiliation`, `user_tasks`
- Tab 4: `family_members`, `children`
- Tab 5: `employee_medical_records`, `chronic_conditions`, `medications`, `allergies`, `vaccinations`, `medical_exams`, `medical_events`
- Tab 6: `attendance`, `permissions`
- Tab 7: `disciplinary_actions`
- Tab 8: `task_assignments`, `salary_details`
- Tab 9: `biometric_data`

---

## 📊 ESTIMACIÓN DE CAMPOS EDITABLES

| Tab | Nombre | Botones | Campos/Botón Promedio | Total Campos |
|-----|--------|---------|----------------------|--------------|
| 1 | Administración | 8 | 3 | 24 |
| 2 | Datos Personales | 11 | 8 | 88 |
| 3 | Antecedentes Laborales | 4 | 10 | 40 |
| 4 | Grupo Familiar | 3 | 12 | 36 |
| 5 | Antecedentes Médicos | 12 | 8 | 96 |
| 6 | Asistencias/Permisos | 2 | 6 | 12 |
| 7 | Disciplinarios | 1 | 10 | 10 |
| 8 | Configuración Tareas | 5 | 8 | 40 |
| 9 | Registro Biométrico | 1 | 20 | 20 |
| **TOTAL** | **9 TABs** | **47** | **~7.8** | **~366** |

---

## ✅ PRÓXIMOS PASOS (INTEGRADO EN PHASE4TESTORCHESTRATOR)

1. ✅ CSS responsive aplicado globalmente
2. ✅ Mapeo completo realizado
3. ⏳ Implementar métodos privados en orchestrator:
   - `_clickButtonInTab(tabId, buttonText)`
   - `_fillSecondaryModal(modalId, testData)`
   - `_verifyModalSaved(modalId)`
4. ⏳ Implementar `fillTab1()` a `fillTab9()` que usen los métodos privados
5. ⏳ Modificar `test-final-fill-all-tabs.js` para usar `viewUser()` + `fillTab1()...fillTab9()`

---

**Generado por:** Claude Code
**Archivo fuente:** users.js (15,000+ líneas)
