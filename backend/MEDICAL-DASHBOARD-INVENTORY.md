# INVENTARIO COMPLETO - Medical Dashboard Professional

## ✅ FUNCIONES EXISTENTES (37 funciones)

### 📊 **Grupo 1: Inicialización y Vista Principal**
| Función | Línea | Estado | Usa Mock? | Acción |
|---------|-------|--------|-----------|--------|
| `window.initMedicalDashboard()` | 1867 | ✅ OK | No | MANTENER |
| `showMedicaldashboardContent()` | 82 | ✅ OK | No | MANTENER |
| `loadMedicalStatistics()` | 183 | ⚠️ Mock | No (vacía) | ACTUALIZAR |

### 📋 **Grupo 2: Gestión de Empleados**
| Función | Línea | Estado | Usa Mock? | Acción |
|---------|-------|--------|-----------|--------|
| `loadEmployeesWithMedicalRecords()` | 198 | ⚠️ Hardcoded | Sí | COEXISTIR (agregar `_real()`) |
| `displayMedicalEmployees()` | 261 | ✅ OK | No | MANTENER |
| `viewFullEmployeeDetails()` | 841 | ⚠️ Mock | Sí | COEXISTIR (agregar `_real()`) |
| `closeEmployeeDetailsModal()` | 951 | ✅ OK | No | MANTENER |

### 📄 **Grupo 3: Documentos Médicos**
| Función | Línea | Estado | Usa Mock? | Acción |
|---------|-------|--------|-----------|--------|
| `openEmployeeDocuments()` | 354 | ⚠️ Mock | Sí | COEXISTIR |
| `showDocumentType()` | 956 | ✅ OK | No | MANTENER |
| `loadDocumentsByType()` | 975 | ⚠️ Mock | Sí | COEXISTIR |
| `loadDirectDocumentContent()` | 1566 | ⚠️ Mock | Sí | COEXISTIR |
| `closeDirectModal()` | 1561 | ✅ OK | No | MANTENER |

### 📷 **Grupo 4: Solicitudes Médicas**
| Función | Línea | Estado | Usa Mock? | Acción |
|---------|-------|--------|-----------|--------|
| `requestEmployeePhoto()` | 452 | ⚠️ Mock | Sí | COEXISTIR (agregar `_real()`) |
| `closePhotoModal()` | 591 | ✅ OK | No | MANTENER |
| `requestEmployeeStudy()` | 596 | ⚠️ Mock | Sí | COEXISTIR (agregar `_real()`) |
| `closeStudyModal()` | 685 | ✅ OK | No | MANTENER |
| `requestEmployeeCertificate()` | 690 | ⚠️ Mock | Sí | COEXISTIR (agregar `_real()`) |
| `closeCertificateModal()` | 836 | ✅ OK | No | MANTENER |
| `requestEmployeePrescription()` | 1742 | ⚠️ Mock | Sí | COEXISTIR (agregar `_real()`) |
| `closePrescriptionModal()` | 1789 | ✅ OK | No | MANTENER |
| `submitPrescriptionRequest()` | 1794 | ⚠️ Mock | Sí | COEXISTIR |

### 📊 **Grupo 5: Actividad y Timeline**
| Función | Línea | Estado | Usa Mock? | Acción |
|---------|-------|--------|-----------|--------|
| `loadPendingRequestsForEmployee()` | 1074 | ⚠️ Mock | Sí | COEXISTIR |
| `loadActivityTimelineForEmployee()` | 1156 | ⚠️ Mock | Sí | COEXISTIR |
| `loadDirectPendingRequests()` | 1630 | ⚠️ Mock | Sí | COEXISTIR |
| `loadDirectActivityTimeline()` | 1685 | ⚠️ Mock | Sí | COEXISTIR |

### 📁 **Grupo 6: Visor de Archivos**
| Función | Línea | Estado | Usa Mock? | Acción |
|---------|-------|--------|-----------|--------|
| `openFileViewer()` | 1379 | ✅ OK | No | MANTENER |
| `closeFileViewer()` | 1480 | ✅ OK | No | MANTENER |
| `downloadFile()` | 1485 | ⚠️ Mock | Sí | COEXISTIR |

### 🔔 **Grupo 7: Acciones Globales**
| Función | Línea | Estado | Usa Mock? | Acción |
|---------|-------|--------|-----------|--------|
| `sendInstructions()` | 1287 | ⚠️ Vacía | No | ACTUALIZAR |
| `showAllEmployeesPhotoRequests()` | 1297 | ⚠️ Vacía | No | ACTUALIZAR |
| `showAllEmployeesStudies()` | 1302 | ⚠️ Vacía | No | ACTUALIZAR |
| `showPendingAudits()` | 1307 | ⚠️ Vacía | No | ACTUALIZAR |
| `generateGlobalMedicalReport()` | 1312 | ⚠️ Vacía | No | ACTUALIZAR |

### 📝 **Grupo 8: Edición**
| Función | Línea | Estado | Usa Mock? | Acción |
|---------|-------|--------|-----------|--------|
| `viewMedicalDetails()` | 1322 | ⚠️ Vacía | No | ACTUALIZAR |
| `editEmployeeMedical()` | 1327 | ⚠️ Vacía | No | ACTUALIZAR |
| `viewMedicalHistory()` | 1332 | ⚠️ Vacía | No | ACTUALIZAR |
| `addMedicalRecord()` | 1337 | ⚠️ Vacía | No | ACTUALIZAR |

### 💬 **Grupo 9: Mensajes y Notificaciones**
| Función | Línea | Estado | Usa Mock? | Acción |
|---------|-------|--------|-----------|--------|
| `showMedicalMessage()` | 1343 | ✅ OK | No | MANTENER |

---

## 🆕 FUNCIONES A AGREGAR (8 nuevas)

### **Grupo API Real**
| Función | Descripción | Endpoint API |
|---------|-------------|--------------|
| `loadPendingCases_real()` | Cargar casos pendientes reales | GET `/api/medical-cases/doctor/pending` |
| `getCaseDetails_real()` | Obtener detalles de un caso | GET `/api/medical-cases/:id` |
| `getCaseMessages_real()` | Obtener mensajes de un caso | GET `/api/medical-cases/:id/messages` |
| `sendMessage_real()` | Enviar mensaje en chat | POST `/api/medical-cases/:id/messages` |

### **Grupo Funcionalidades Nuevas**
| Función | Descripción | Endpoint API |
|---------|-------------|--------------|
| `openDiagnosisModal()` | Modal para diagnóstico médico | - |
| `sendDiagnosis_real()` | Enviar diagnóstico | POST `/api/medical-cases/:id/diagnosis` |
| `openCloseCaseModal()` | Modal para cerrar expediente | - |
| `closeCase_real()` | Cerrar caso e impactar attendance | POST `/api/medical-cases/:id/close` |
| `openCaseChatModal()` | Modal de chat bidireccional | - |
| `window.createMedicalCaseFromAbsence()` | Crear caso desde Users | POST `/api/medical-cases` |

---

## 📊 RESUMEN

- **Total funciones existentes:** 37
- **Funciones OK (mantener):** 11 (30%)
- **Funciones con mock (coexistir):** 18 (49%)
- **Funciones vacías (actualizar):** 8 (21%)
- **Nuevas funciones a agregar:** 10

---

## ✅ ESTRATEGIA DE IMPLEMENTACIÓN

1. ✅ **MANTENER** (11 funciones) - No tocar
2. ✅ **COEXISTIR** (18 funciones) - Agregar versión `_real()` sin eliminar mock
3. ✅ **ACTUALIZAR** (8 funciones) - Implementar funcionalidad
4. ✅ **AGREGAR** (10 funciones) - Nuevas funcionalidades con API real

**Total de modificaciones:** 36 funciones (26 actualizar + 10 nuevas)
**Archivos modificados:** 1 solo (`medical-dashboard-professional.js`)
**Archivos NO tocados:** `panel-empresa.html`, `users.js`, otros módulos
