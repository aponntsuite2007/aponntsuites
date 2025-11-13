# MAPA COMPLETO MODAL USUARIO - 9 TABS

## TAB 1: Administración (admin-tab)
- `role` - Rol (admin/supervisor/employee/medical) → **editUserRole()**
- `isActive` - Estado (activo/inactivo) → **toggleUserStatus()**
- `allowOutsideRadius` - GPS → **toggleGPSRadius()**
- `defaultBranchId` - Sucursal → **manageBranches()**
- `departmentId` - Departamento → **changeDepartment()**
- `position` - Posición/cargo → **editPosition()**

## TAB 2: Datos Personales (personal-tab)
- `firstName` - Nombre
- `lastName` - Apellido
- `email` - Email
- `phone` - Teléfono
- `birthDate` - Fecha Nacimiento
- `address` - Dirección
- `emergencyContact` - Contacto Emergencia

## TAB 3: Antecedentes Laborales (work-tab)
- Tabla `user_work_history`:
  - `company_name`
  - `position`
  - `start_date`
  - `end_date`
  - `reason_for_leaving`

## TAB 4: Grupo Familiar (family-tab)
- Tabla `user_family_members`:
  - `name`
  - `relationship`
  - `birth_date`
  - `occupation`

## TAB 5: Antecedentes Médicos (medical-tab)
- Tabla `employee_medical_records`:
  - `blood_type`
  - `allergies`
  - `chronic_conditions`
  - `medications`
  - `emergency_contact_medical`

## TAB 6: Asistencias/Permisos (attendance-tab)
- Solo lectura (historial)

## TAB 7: Disciplinarios (disciplinary-tab)
- Tabla `disciplinary_actions`:
  - `action_type`
  - `description`
  - `date`
  - `severity`

## TAB 8: Config Tareas (tasks-tab)
- Configuraciones específicas de tareas

## TAB 9: Registro Biométrico (biometric-tab)
- Tabla `facial_biometric_data`:
  - `face_descriptor`
  - `photos`
  - Estado consentimiento

---

## ESTRATEGIA DE IMPLEMENTACIÓN

### 1. Función Genérica Base
```javascript
async function updateUserData(userId, updates, successMessage) {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    const response = await fetch(`http://localhost:9998/api/v1/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Error guardando cambios');

    alert(successMessage || 'Cambios guardados correctamente');

    // REFRESCAR modal
    await closeEmployeeFile();
    await viewUser(userId);
}
```

### 2. Usar para TODOS los campos
- TAB 1: ✅ Usar función genérica
- TAB 2: ✅ Usar función genérica
- TAB 3-9: ✅ Endpoints específicos pero mismo patrón

### 3. Patrones Comunes
- **Campos simples**: Modal con input → PUT → Refresh
- **Campos dropdown**: Modal con select → PUT → Refresh
- **Tablas relacionadas**: Modal CRUD → POST/PUT/DELETE a endpoint específico → Refresh
