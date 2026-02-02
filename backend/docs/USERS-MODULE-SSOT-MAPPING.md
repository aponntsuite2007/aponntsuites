# Módulo USERS - Mapeo SSOT Completo

**Fecha**: 2026-02-01
**Testeado por**: Claude Code (sesión visual)
**Estado**: DOCUMENTADO

---

## Resumen del Módulo

- **Total de Tabs**: 10
- **CRUD verificado**: Parcial (necesita más testing)
- **SSOT Integrations**: DMS, Medical, Payroll, Attendance, Notifications

---

## Tab 1: ⚙️ Administración

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Rol del Usuario | users.role | users |
| Estado del Usuario | users.status | users |
| Workflow Alta/Baja | user_onboarding_status | users + workflows |
| Certificado Buena Conducta | DMS | documents (tipo: certificado_conducta) |
| Evaluación Ambiental | DMS | documents (tipo: evaluacion_ambiental) |
| Cobertura GPS | users.gps_restriction | users |
| Sucursal por Defecto | users.default_branch_id | branches |

### Integraciones
- **Workflows**: Proceso de alta/baja con requisitos configurables
- **DMS**: Documentos requeridos para alta

---

## Tab 2: 👤 Datos Personales

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Nombre Completo | users.name | users |
| DNI/ID | users.legajo | users |
| Email | users.email | users |
| Teléfono | users.phone | users |
| Fecha Nacimiento | users.birth_date | users |
| Fecha Ingreso | users.hire_date | users |
| Dirección | users.address | users |
| Foto de Perfil | DMS | biometric_photos |
| Contacto Emergencia | users.emergency_contact | users |
| Tel. Emergencia | users.emergency_phone | users |
| Obra Social/Prepaga | user_health_insurance | health_insurance module |
| Formación Académica | user_education | users_education |
| Documentación Personal | DMS | documents |

### Integraciones
- **DMS**: Foto de perfil, documentos personales
- **Scoring**: Cálculo automático basado en múltiples factores

---

## Tab 3: 💼 Antecedentes Laborales

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Cargo | users.position | users |
| Departamento | users.department_id | departments |
| Convenio Laboral | users.agreement_id | work_agreements |
| Categoría Salarial | users.salary_category | salary_categories |
| Tipo de Salario | users.salary_type | users |
| Salario Base Bruto | users.base_salary | users |
| Historial Aumentos | salary_adjustments | payroll module |
| Historial Liquidaciones | payroll_records | payroll module |

### Integraciones
- **Payroll**: Liquidaciones, aumentos salariales
- **Organizational Structure**: Departamentos, convenios

---

## Tab 4: 👨‍👩‍👧 Grupo Familiar

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Estado Civil | users.marital_status | users |
| Fecha Matrimonio | users.marriage_date | users |
| Cónyuge a Cargo | user_family_members | family module |
| Hijos | user_family_members | family module (tipo: hijo) |
| Otros Familiares | user_family_members | family module |
| Certificados Familiares | DMS | documents (categoría: familiar) |

### Integraciones
- **DMS**: Certificados de escolaridad, facturas guardería, etc.
- **Benefits**: Asignaciones familiares

---

## Tab 5: 🏥 Antecedentes Médicos

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Médico de Cabecera | user_medical_info | medical module |
| Contacto Emergencia Médica | user_medical_emergency | medical module |
| Datos Antropométricos | user_anthropometric | medical module |
| Historial Cirugías | user_surgeries | medical module |
| Enfermedades Crónicas | user_chronic_conditions | medical module |
| Medicación Frecuente | user_medications | medical module |
| Alergias | user_allergies | medical module |
| Restricciones Actividad | user_activity_restrictions | medical module |
| Restricciones Laborales | user_work_restrictions | medical module |
| Salud Mental | user_mental_health | medical module |

### Integraciones
- **Medical Module**: Toda la información médica
- **HSE**: Restricciones laborales para seguridad

---

## Tab 6: 📅 Asistencias/Permisos

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Días Trabajados | attendance_records | attendance module |
| Ausencias | attendance_records | attendance module (tipo: ausencia) |
| Permisos | leave_requests | vacation/permissions module |
| Total Horas | attendance_records.total_hours | attendance module |
| Horas Normales | attendance_records.regular_hours | attendance module |
| Horas Extras | attendance_records.overtime_hours | attendance module |
| Eficiencia | calculated | attendance analytics |
| Puntualidad | calculated | attendance analytics |
| Scoring Asistencia | user_attendance_scoring | attendance module |

### Integraciones
- **Attendance**: Registros de fichaje
- **Hour Bank**: Banco de horas
- **Vacation**: Permisos y licencias

---

## Tab 7: 📆 Calendario

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Días de Trabajo | shift_assignments | shifts module |
| Francos/Descansos | shift_assignments | shifts module |
| Faltas | attendance_records | attendance module |
| Llegadas Tarde | attendance_records | attendance module |
| Asistencias OK | attendance_records | attendance module |

### Integraciones
- **Shifts**: Turnos asignados
- **Attendance**: Registros diarios

---

## Tab 8: ⚖️ Disciplinarios

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Amonestaciones | disciplinary_actions | sanctions module (tipo: amonestacion) |
| Apercibimientos | disciplinary_actions | sanctions module (tipo: apercibimiento) |
| Suspensiones | disciplinary_actions | sanctions module (tipo: suspension) |
| Total Días Sancionado | calculated | sanctions module |

### Integraciones
- **Sanctions Module**: Gestión de sanciones
- **Legal**: Documentación legal de sanciones

---

## Tab 9: 📸 Registro Biométrico

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Template Facial | biometric_templates | biometric module |
| Estado Consentimiento | biometric_consents | consent module |
| DNI (Frente y Dorso) | DMS | documents (tipo: dni) |
| Pasaporte | DMS | documents (tipo: pasaporte) |
| Visa de Trabajo | DMS | documents (tipo: visa_trabajo) |
| Licencia de Conducir | DMS | documents (tipo: licencia_conducir) |

### Integraciones
- **Biometric Module**: Captura facial con Azure Face API
- **DMS**: Almacenamiento de documentos de identidad
- **Consent Module**: Consentimiento GDPR/Ley 25.326

---

## Tab 10: 🔔 Notificaciones

### Campos y SSOT

| Campo | SSOT | Tabla/Módulo |
|-------|------|--------------|
| Total Notificaciones | user_notifications | notifications module |
| Sin Leer | user_notifications | notifications module (read: false) |
| Pendientes | user_notifications | notifications module (status: pending) |
| Resueltas | user_notifications | notifications module (status: resolved) |

### Integraciones
- **Notifications Module**: Sistema de notificaciones empresariales

---

## Resumen de Integraciones SSOT

| Módulo Externo | Tabs que lo usan |
|----------------|------------------|
| **DMS** | 1, 2, 4, 9 |
| **Medical** | 5 |
| **Payroll** | 3 |
| **Attendance** | 6, 7 |
| **Shifts** | 7 |
| **Sanctions** | 8 |
| **Biometric** | 9 |
| **Notifications** | 10 |
| **Workflows** | 1 |

---

## Testing Status

- [x] Tab 1: Administración - Visualizado
- [x] Tab 2: Datos Personales - Visualizado
- [x] Tab 3: Antecedentes Laborales - Visualizado
- [x] Tab 4: Grupo Familiar - Visualizado
- [x] Tab 5: Antecedentes Médicos - Visualizado
- [x] Tab 6: Asistencias/Permisos - Visualizado
- [x] Tab 7: Calendario - Visualizado
- [x] Tab 8: Disciplinarios - Visualizado
- [x] Tab 9: Registro Biométrico - Visualizado
- [x] Tab 10: Notificaciones - Visualizado

### Pendiente
- [ ] CRUD completo (Create, Update, Delete)
- [ ] Verificación de persistencia en BD
- [ ] Test de uploads a DMS
- [ ] Test de integración con módulos externos

---

**FIN DEL DOCUMENTO**
