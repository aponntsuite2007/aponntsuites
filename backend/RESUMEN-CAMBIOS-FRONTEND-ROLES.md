# 📋 RESUMEN DE CAMBIOS - SISTEMA DE ROLES Y PERMISOS

**Fecha**: 2025-01-19
**Módulo**: Panel Administrativo - Frontend
**Estado**: ✅ Cambios de frontend completados - Pendiente implementación backend

---

## ✅ CAMBIOS REALIZADOS EN FRONTEND (panel-administrativo.html)

### 1. **Header con Usuario Logueado** ✅ COMPLETADO

**Ubicación**: `panel-administrativo.html:2814-2827`

**Cambios**:
- Reemplazado texto hardcodeado "Administrador Master" por datos dinámicos del usuario logueado
- **Elementos dinámicos**:
  - `#userFullName` - Muestra: Nombre + Apellido
  - `#userRoleAndId` - Muestra: Badge de rol con color + ID (primeros 8 caracteres)
  - `#userAvatarIcon` - Ícono según rol (👑 admin, 💼 vendor, 👨‍🏫 leader, etc.)
  - Botón "🚪 Cerrar Sesión" con hover effect (rojo al pasar mouse)

**Colores por rol**:
- 🔴 Admin: `#e74c3c`
- 🔵 Supervisor: `#3498db`
- 🟣 Líder: `#9b59b6`
- 🟢 Vendedor: `#2ecc71`
- 🟠 Soporte: `#f39c12`
- ⚫ Administrativo: `#34495e`
- 🟠 Marketing: `#e67e22`

---

### 2. **Sistema de Autenticación Mejorado** ✅ COMPLETADO

**Ubicación**: `panel-administrativo.html:4833-4940`

**Función `checkAuthentication()` modificada**:
```javascript
// Antes: Hardcodeado
currentUser = { username: 'admin_panel', firstName: 'Panel Administrativo', role: 'administrador' };

// Ahora: Carga desde localStorage
const userData = localStorage.getItem('aponnt_user_staff');
const user = JSON.parse(userData);
currentUser = {
    id: user.id,  // UUID
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: `${user.first_name} ${user.last_name}`,
    email: user.email,
    role: user.role,  // admin, vendor, leader, supervisor, soporte, etc.
    dni: user.dni,
    userType: 'staff'
};
```

**Nueva función `loadUserInfoToHeader()`**:
- Actualiza header con nombre, rol e ID del usuario
- Agrega badge de color según rol
- Cambia ícono del avatar según rol

**Nueva función `handleLogout()`**:
- Limpia todo el localStorage (tokens, user, permisos, etc.)
- Redirige a `/index.html`
- Confirmación antes de cerrar sesión

---

### 3. **Campos de Vendedor y Comisiones** ✅ COMPLETADO

**Ubicación Modal**: `panel-administrativo.html:4374-4390`

**Cambios en formulario de empresa**:

#### a) Campo "Vendedor" (READONLY)
```html
<!-- Antes: Select editable -->
<select class="form-input" id="vendor">
    <option value="">Seleccionar vendedor...</option>
</select>

<!-- Ahora: Input readonly + campo hidden -->
<label>Vendedor</label>
<input type="text" id="vendorDisplay" readonly
       placeholder="No asignado"
       style="background-color: #f8f9fa; cursor: not-allowed;">
<input type="hidden" id="vendor">
```

**Función `loadAssignedVendorInfo(vendorName)`**:
- Busca vendedor por nombre en API `/api/aponnt/dashboard/vendors`
- Muestra: "Nombre - Email - Tel: xxxx" en campo visible
- Guarda solo el nombre en campo hidden para backend

#### b) Campos de Comisión (AMBOS READONLY)

**Antes**:
```html
<label>% Comisión</label>
<input type="number" id="commissionPercentage">
```

**Ahora**:
```html
<label>% Comisión permanente por venta</label>
<input type="number" id="commissionPercentage" readonly
       style="background-color: #f8f9fa; cursor: not-allowed;">

<label>% Comisión Temporal por soporte a usuarios</label>
<input type="number" id="supportCommissionPercentage" readonly
       style="background-color: #f8f9fa; cursor: not-allowed;">
```

**Guardado** (`panel-administrativo.html:6589-6590`):
```javascript
commissionPercentage: parseFloat(document.getElementById('commissionPercentage').value) || 10,
supportCommissionPercentage: parseFloat(document.getElementById('supportCommissionPercentage').value) || 0,
```

**Carga** (`panel-administrativo.html:6042-6043`):
```javascript
document.getElementById('commissionPercentage').value = company.commissionPercentage || '10';
document.getElementById('supportCommissionPercentage').value = company.supportCommissionPercentage || '0';
```

---

### 4. **Cambio en Label de Tipo de Licencia** ✅ COMPLETADO

**Ubicación**: `panel-administrativo.html:4359`

**Antes**: "Tipo de Licencia"
**Ahora**: "Tipo de Licencia de soporte y asistencia al usuario"

---

### 5. **Estilos CSS Agregados** ✅ COMPLETADO

**Ubicación**: `panel-administrativo.html:2773-2787`

```css
/* Botón Logout Header */
.btn-logout-header {
    transition: all 0.3s ease;
}

.btn-logout-header:hover {
    background: rgba(255, 59, 48, 0.8) !important;
    border-color: rgba(255, 59, 48, 0.9) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
}

.btn-logout-header:active {
    transform: translateY(0);
}
```

---

## 🔴 PENDIENTE - IMPLEMENTACIÓN BACKEND (COORDINACIÓN NECESARIA)

### 1. **Modificar Tabla `companies` en PostgreSQL** ⚠️ CRÍTICO

**Agregar campos**:

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by_staff_id UUID REFERENCES aponnt_staff(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS assigned_vendor_id UUID REFERENCES aponnt_staff(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS support_vendor_id UUID REFERENCES aponnt_staff(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sales_commission_percentage DECIMAL(5,2) DEFAULT 10.00;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS support_commission_percentage DECIMAL(5,2) DEFAULT 0.00;
```

**Descripción**:
- `created_by_staff_id`: ID del staff que creó la empresa
- `assigned_vendor_id`: ID del vendedor asignado a ventas
- `support_vendor_id`: ID del vendedor asignado a soporte (puede ser diferente)
- `sales_commission_percentage`: % comisión permanente por venta
- `support_commission_percentage`: % comisión temporal por soporte

---

### 2. **Modificar API `/api/aponnt/dashboard/companies`** ⚠️ CRÍTICO

**Archivo**: `backend/src/routes/aponntDashboard.js`

**Agregar filtrado por rol**:

```javascript
router.get('/companies', async (req, res) => {
    try {
        const { user } = req; // Usuario autenticado desde middleware

        let whereClause = {};

        // Filtrar según rol
        if (user.role === 'vendor') {
            // Vendedor: Solo sus empresas (ventas o soporte)
            whereClause = {
                [Op.or]: [
                    { assigned_vendor_id: user.id },
                    { support_vendor_id: user.id }
                ]
            };
        } else if (user.role === 'leader') {
            // Líder: Sus empresas + empresas de sus vendedores
            const vendorIds = await getVendorsUnderLeader(user.id);
            whereClause = {
                [Op.or]: [
                    { assigned_vendor_id: { [Op.in]: [user.id, ...vendorIds] } },
                    { support_vendor_id: { [Op.in]: [user.id, ...vendorIds] } }
                ]
            };
        } else if (user.role === 'supervisor') {
            // Supervisor: Empresas de líderes bajo su supervisión
            const leaderIds = await getLeadersUnderSupervisor(user.id);
            const vendorIds = await getVendorsUnderLeaders(leaderIds);
            whereClause = {
                [Op.or]: [
                    { assigned_vendor_id: { [Op.in]: [user.id, ...leaderIds, ...vendorIds] } },
                    { support_vendor_id: { [Op.in]: [user.id, ...leaderIds, ...vendorIds] } }
                ]
            };
        }
        // Si es admin: sin filtro (ve todo)

        const companies = await Company.findAll({ where: whereClause });
        res.json(companies);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});
```

**Funciones helper necesarias**:
```javascript
async function getVendorsUnderLeader(leaderId) {
    const staff = await AponntStaff.findAll({
        where: { leader_id: leaderId, role: 'vendor' },
        attributes: ['id']
    });
    return staff.map(s => s.id);
}

async function getLeadersUnderSupervisor(supervisorId) {
    const staff = await AponntStaff.findAll({
        where: { supervisor_id: supervisorId, role: 'leader' },
        attributes: ['id']
    });
    return staff.map(s => s.id);
}
```

---

### 3. **Modificar API POST/PUT `/api/aponnt/dashboard/companies`**

**Auto-asignar vendedor al crear empresa**:

```javascript
router.post('/companies', async (req, res) => {
    try {
        const { user } = req; // Usuario autenticado
        const companyData = req.body;

        // Auto-asignar vendedor si es vendor
        if (user.role === 'vendor') {
            companyData.created_by_staff_id = user.id;
            companyData.assigned_vendor_id = user.id;

            // Obtener % comisión del vendedor
            const vendor = await AponntStaff.findByPk(user.id);
            companyData.sales_commission_percentage = vendor.commission_percentage || 10;
        }

        const company = await Company.create(companyData);
        res.json({ success: true, company });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

### 4. **Agregar Middleware de Autenticación**

**Archivo**: `backend/src/middleware/auth.js`

```javascript
async function verifyStaffToken(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await AponntStaff.findByPk(decoded.id);

        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Usuario inactivo' });
        }

        req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
        };

        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
}
```

---

## 📊 ESTRUCTURA DE DATOS - LocalStorage

**Frontend lee estos datos** (guardados por `aponnt-login.js`):

```javascript
localStorage.getItem('aponnt_token_staff');  // JWT token
localStorage.getItem('aponnt_user_staff');   // JSON:
{
    "id": "uuid-here",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@example.com",
    "role": "vendor",
    "username": "jperez",
    "dni": "12345678"
}
localStorage.getItem('aponnt_permissions');  // JSON:
{
    "can_manage_staff": false,
    "can_view_all_companies": false
}
localStorage.getItem('aponnt_assigned_companies');  // Array de IDs
```

---

## 🎯 PRÓXIMOS PASOS (COORDINACIÓN)

### **FRONTEND (YO)** ✅ LISTO
1. ✅ Display de usuario logueado
2. ✅ Botón de logout
3. ✅ Campos de comisión readonly
4. ✅ Campo vendedor readonly
5. ✅ Badge de rol con color
6. ✅ Preparado para recibir supportCommissionPercentage

### **BACKEND (OTRA SESIÓN DE CLAUDE)** ⏳ PENDIENTE
1. ⏳ Agregar campos a tabla `companies`
2. ⏳ Modificar API GET `/companies` con filtros por rol
3. ⏳ Modificar API POST/PUT `/companies` con auto-asignación
4. ⏳ Agregar middleware de autenticación en rutas
5. ⏳ Funciones helper para jerarquía (getVendorsUnderLeader, etc.)
6. ⏳ Actualizar response del login para incluir permisos calculados

---

## 🔗 ARCHIVOS MODIFICADOS

1. **`backend/public/panel-administrativo.html`**:
   - Líneas 2814-2827: Header con usuario logueado
   - Líneas 2773-2787: CSS botón logout
   - Líneas 4359: Label tipo de licencia
   - Líneas 4374-4390: Campos de vendedor y comisiones
   - Líneas 4833-4940: Funciones de autenticación
   - Líneas 6042-6043: Carga de datos
   - Líneas 6589-6590: Guardado de datos

---

## ✅ TESTING FRONTEND

**Para probar los cambios**:

1. **Login**:
   - Ir a `http://localhost:9998/index.html`
   - Click en "Acceso Staff"
   - Ingresar credenciales (requiere backend funcionando)
   - Verificar que muestra nombre, rol e ID en header
   - Verificar badge de color según rol

2. **Modal Empresa**:
   - Crear/Editar empresa
   - Verificar que campo "Vendedor" es readonly
   - Verificar que campos de comisión son readonly
   - Verificar que campo "Tipo de Licencia de soporte..." está actualizado

3. **Logout**:
   - Click en botón "🚪 Cerrar Sesión"
   - Verificar confirmación
   - Verificar redirección a index.html
   - Verificar que localStorage se limpió

---

## 🐛 NOTAS IMPORTANTES

1. **Fallback Mode**: Si no hay usuario en localStorage, el sistema funciona en modo fallback con usuario hardcodeado (como antes)

2. **Compatibilidad**: El sistema de login existente (`aponnt-login.js`) ya está implementado y funciona. Solo necesita que backend responda correctamente.

3. **Sin Conflictos**: Todos los cambios son en frontend (panel-administrativo.html), no tocan backend ni panel-empresa.html.

4. **UUID vs ID Numérico**: Vendedores en `VendorMemory` usan ID numérico, pero `AponntStaff` usa UUID. Backend debe decidir cuál usar.

---

**FIN DEL RESUMEN** - Listo para coordinación con backend 🚀
