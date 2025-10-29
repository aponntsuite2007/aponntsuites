# 📝 CAMBIOS NECESARIOS EN users.js PARA CONECTAR CON BACKEND

## ⚠️ IMPORTANTE: NO TOCAR LO QUE YA FUNCIONA
- ✅ La función `viewUser()` (línea ~1371) que carga datos → **NO MODIFICAR**
- ✅ Todo el código de rendering de modales → **NO MODIFICAR**
- ❌ Solo actualizar los `onsubmit` que tienen comentario "Aquí se guardaría"

---

## 🔧 CAMBIOS A REALIZAR

### 1. Función: `addWorkHistory()` - Línea ~3557

**ANTES:**
```javascript
document.getElementById('workHistoryForm').onsubmit = (e) => {
    e.preventDefault();
    // Aquí se guardaría en la base de datos
    closeModal('workHistoryModal');
    showUserMessage('✅ Antecedente laboral agregado', 'success');
};
```

**DESPUÉS:**
```javascript
document.getElementById('workHistoryForm').onsubmit = async (e) => {
    e.preventDefault();

    try {
        const formData = {
            company_name: document.getElementById('companyName').value,
            position: document.getElementById('position').value,
            start_date: document.getElementById('startDate').value,
            end_date: document.getElementById('endDate').value || null,
            currently_working: document.getElementById('currentlyWorking')?.checked || false,
            reason_for_leaving: document.getElementById('reasonLeaving').value,
            responsibilities: document.getElementById('responsibilities').value,
            supervisor_name: document.getElementById('supervisorName').value,
            supervisor_contact: document.getElementById('supervisorContact').value
        };

        const response = await fetch(`/api/v1/user-profile/${userId}/work-history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Error al agregar antecedente laboral');

        closeModal('workHistoryModal');
        showUserMessage('✅ Antecedente laboral agregado exitosamente', 'success');

        // Recargar la lista si existe función para ello
        if (typeof loadWorkHistory === 'function') {
            loadWorkHistory(userId);
        }
    } catch (error) {
        console.error('Error:', error);
        showUserMessage('❌ Error al agregar antecedente laboral', 'error');
    }
};
```

---

### 2. Función: `addFamilyMember()` - Línea ~3628

**ANTES:**
```javascript
document.getElementById('familyMemberForm').onsubmit = (e) => {
    e.preventDefault();
    // Aquí se guardaría en la base de datos
    closeModal('familyMemberModal');
    showUserMessage('✅ Familiar agregado', 'success');
};
```

**DESPUÉS:**
```javascript
document.getElementById('familyMemberForm').onsubmit = async (e) => {
    e.preventDefault();

    try {
        const formData = {
            full_name: document.getElementById('familyFullName').value,
            relationship: document.getElementById('familyRelationship').value,
            dni: document.getElementById('familyDNI').value,
            birth_date: document.getElementById('familyBirthDate').value || null,
            phone: document.getElementById('familyPhone').value,
            lives_with_employee: document.getElementById('livesWith')?.checked || false,
            is_dependent: document.getElementById('isDependent')?.checked || false,
            is_emergency_contact: document.getElementById('isEmergencyContact')?.checked || false,
            health_insurance_coverage: document.getElementById('hasInsurance')?.checked || false
        };

        const response = await fetch(`/api/v1/user-profile/${userId}/family-members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Error al agregar familiar');

        closeModal('familyMemberModal');
        showUserMessage('✅ Familiar agregado exitosamente', 'success');

        if (typeof loadFamilyMembers === 'function') {
            loadFamilyMembers(userId);
        }
    } catch (error) {
        console.error('Error:', error);
        showUserMessage('❌ Error al agregar familiar', 'error');
    }
};
```

---

## 📋 LISTA COMPLETA DE FUNCIONES A ACTUALIZAR

Según el análisis del archivo, necesitamos actualizar aproximadamente **50+ funciones**:

### 📂 Antecedentes Laborales (Work History)
- [x] `addWorkHistory()` - línea ~3557
- [ ] `editWorkHistory(id)` - buscar y actualizar
- [ ] `deleteWorkHistory(id)` - buscar y actualizar

### 👨‍👩‍👧 Grupo Familiar (Family)
- [ ] `editMaritalStatus()` - buscar y actualizar
- [ ] `addChild()` - buscar y actualizar
- [ ] `editChild(id)` - buscar y actualizar
- [ ] `deleteChild(id)` - buscar y actualizar
- [x] `addFamilyMember()` - línea ~3628
- [ ] `editFamilyMember(id)` - buscar y actualizar
- [ ] `deleteFamilyMember(id)` - buscar y actualizar

### 🎓 Educación (Education)
- [ ] `addEducation()` - buscar y actualizar
- [ ] `editEducation(id)` - buscar y actualizar
- [ ] `deleteEducation(id)` - buscar y actualizar

### 🏥 Antecedentes Médicos (Medical)
- [ ] `editPrimaryPhysician()` - buscar y actualizar
- [ ] `addChronicCondition()` - buscar y actualizar
- [ ] `editChronicCondition(id)` - buscar y actualizar
- [ ] `deleteChronicCondition(id)` - buscar y actualizar
- [ ] `addMedication()` - buscar y actualizar
- [ ] `editMedication(id)` - buscar y actualizar
- [ ] `deleteMedication(id)` - buscar y actualizar
- [ ] `addAllergy()` - buscar y actualizar
- [ ] `editAllergy(id)` - buscar y actualizar
- [ ] `deleteAllergy(id)` - buscar y actualizar
- [ ] `addActivityRestriction()` - buscar y actualizar
- [ ] `editActivityRestriction(id)` - buscar y actualizar
- [ ] `deleteActivityRestriction(id)` - buscar y actualizar
- [ ] `addWorkRestriction()` - buscar y actualizar
- [ ] `editWorkRestriction(id)` - buscar y actualizar
- [ ] `deleteWorkRestriction(id)` - buscar y actualizar
- [ ] `addVaccination()` - buscar y actualizar
- [ ] `editVaccination(id)` - buscar y actualizar
- [ ] `deleteVaccination(id)` - buscar y actualizar
- [ ] `addMedicalExam()` - buscar y actualizar
- [ ] `editMedicalExam(id)` - buscar y actualizar
- [ ] `deleteMedicalExam(id)` - buscar y actualizar
- [ ] `addMedicalDocument()` - buscar y actualizar
- [ ] `editMedicalDocument(id)` - buscar y actualizar
- [ ] `deleteMedicalDocument(id)` - buscar y actualizar

### 📄 Documentos Personales (Documents)
- [ ] `addPersonalDocument()` - buscar y actualizar
- [ ] `editPersonalDocument(id)` - buscar y actualizar
- [ ] `deletePersonalDocument(id)` - buscar y actualizar

### 🏖️ Permisos y Ausencias (Permissions)
- [ ] `addPermissionRequest()` - buscar y actualizar
- [ ] `editPermissionRequest(id)` - buscar y actualizar
- [ ] `deletePermissionRequest(id)` - buscar y actualizar

### ⚠️ Acciones Disciplinarias (Disciplinary)
- [ ] `addDisciplinaryAction()` - buscar y actualizar
- [ ] `editDisciplinaryAction(id)` - buscar y actualizar
- [ ] `deleteDisciplinaryAction(id)` - buscar y actualizar

---

## 🚀 ESTRATEGIA DE IMPLEMENTACIÓN SEGURA

### Opción 1: Manual (Más Seguro)
1. Hacer backup del archivo original: `cp users.js users.js.backup`
2. Actualizar función por función manualmente
3. Probar cada cambio en el navegador
4. Si algo falla, restaurar backup

### Opción 2: Script Automatizado (Más Rápido pero Requiere Pruebas)
1. Crear script que busque patrones específicos
2. Reemplazar solo los bloques `onsubmit`
3. Verificar que NO toque otras partes del código
4. Ejecutar tests después

---

## ⚠️ PRECAUCIONES

1. **NO TOCAR viewUser()** - Esta función ya carga datos correctamente
2. **NO MODIFICAR HTML** - Solo actualizar la lógica de guardado
3. **MANTENER console.log()** - Para debugging
4. **USAR try/catch** - Para manejar errores sin romper la UI
5. **VALIDAR response.ok** - Antes de cerrar modales

---

## 🧪 CÓMO PROBAR CADA CAMBIO

1. Abrir http://localhost:9998/panel-administrativo.html
2. Click en "Ver" para un usuario
3. Ir a la pestaña correspondiente
4. Click en "Agregar"
5. Llenar el formulario
6. Click "Guardar"
7. Verificar:
   - ✅ No hay errores en consola (F12)
   - ✅ Modal se cierra
   - ✅ Aparece mensaje de éxito
   - ✅ Datos persisten (F5 y reabrir modal)

---

## 📊 ENDPOINT MAPPING

| Función | Método | Endpoint |
|---------|--------|----------|
| addWorkHistory | POST | /api/v1/user-profile/:userId/work-history |
| editWorkHistory | PUT | /api/v1/user-profile/:userId/work-history/:id |
| deleteWorkHistory | DELETE | /api/v1/user-profile/:userId/work-history/:id |
| addChild | POST | /api/v1/user-profile/:userId/children |
| addFamilyMember | POST | /api/v1/user-profile/:userId/family-members |
| editMaritalStatus | PUT | /api/v1/user-profile/:userId/marital-status |
| addEducation | POST | /api/v1/user-profile/:userId/education |
| addChronicCondition | POST | /api/v1/user-medical/:userId/chronic-conditions |
| addMedication | POST | /api/v1/user-medical/:userId/medications |
| addAllergy | POST | /api/v1/user-medical/:userId/allergies |
| addVaccination | POST | /api/v1/user-medical/:userId/vaccinations |
| addMedicalExam | POST | /api/v1/user-medical/:userId/medical-exams |
| addPersonalDocument | POST | /api/v1/user-admin/:userId/documents |
| addPermissionRequest | POST | /api/v1/user-admin/:userId/permissions |
| addDisciplinaryAction | POST | /api/v1/user-admin/:userId/disciplinary |

---

## ✅ PRÓXIMOS PASOS

¿Quieres que:
1. **Actualice manualmente** las 2-3 funciones más importantes primero?
2. **Cree un script** que actualice todas automáticamente?
3. **Te muestre más ejemplos** de otras funciones específicas?

**Recomendación:** Empezar con opción 1 (manual) para las funciones críticas, luego usar script para el resto.
