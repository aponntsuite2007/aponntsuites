# 🔍 AUDITORÍA COMPLETA: Campo ID de Usuario en Sistema Multi-Tenant

**Fecha**: Enero 2025
**Auditor**: Claude Code
**Alcance**: Todo el sistema backend (routes + middleware + models)
**Problema Identificado**: Inconsistencia en el uso del campo ID de usuario que causa bugs intermitentes

---

## 📋 RESUMEN EJECUTIVO

### Problema Detectado
El sistema usa **MÚLTIPLES formas** de acceder al ID de usuario, causando:
- ❌ Bugs intermitentes al cambiar un método por otro
- ❌ Módulos que funcionan vs. módulos que fallan según qué método usen
- ❌ Tests que pasan/fallan inconsistentemente
- ❌ Login o módulos de soporte que se rompen al hacer cambios

### Hallazgos Clave
1. **Campo en Base de Datos**: `user_id` (UUID, snake_case, primary key)
2. **Campo en JWT Token**: `id` (mapeado desde `user_id`)
3. **Campo en Login Response**: `id` (expuesto desde `user_id`)
4. **Campo en `req.user`**: Instancia Sequelize con campo `user_id`
5. **Acceso en Routes**: **104+ ocurrencias** de `req.user.user_id` vs **2 ocurrencias** de `req.user.id`

### Recomendación
✅ **ESTÁNDAR UNIFICADO**: Usar **`req.user.user_id`** en TODOS los routes/middleware
✅ **ESTÁNDAR COMPANY**: Usar **`req.user.companyId`** (camelCase) para multi-tenancy

---

## 🔬 ANÁLISIS DETALLADO

### 1. FLUJO DE AUTENTICACIÓN

#### 1.1 Login (authRoutes.js líneas 100-133)
```javascript
// CREACIÓN DEL JWT TOKEN (línea 101-106)
const tokenPayload = {
  id: user.user_id,           // ⚠️ MAPEO: user_id → id
  role: user.role,
  employeeId: user.employeeId,
  company_id: user.company_id // ✅ Multi-tenant
};
const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

// LOGIN RESPONSE (línea 116-133)
res.json({
  token,
  user: {
    id: user.user_id,           // ⚠️ MAPEO: user_id → id (para frontend)
    employeeId: user.employeeId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    username: user.usuario,
    company_id: user.company_id, // ✅ Multi-tenant
    companyId: user.company_id   // ✅ Backward compatibility
  }
});
```

**CONCLUSIÓN**:
- Login devuelve `user.id` (NO `user.user_id`) para el frontend
- Esto es CORRECTO para compatibilidad con frontend
- Tests deben leer `response.data.user.id` (NO `user.user_id`)

#### 1.2 Middleware de Autenticación (auth.js líneas 33-65)
```javascript
// DECODIFICACIÓN DEL TOKEN (línea 33)
const decoded = jwt.verify(token, JWT_SECRET);
console.log('🔍 [AUTH] Buscando usuario con ID:', decoded.id); // ← decoded.id

// BÚSQUEDA EN BASE DE DATOS (línea 38)
const user = await User.findByPk(decoded.id, {
  attributes: { exclude: ['password'] }
});

// ASIGNACIÓN A req.user (línea 65)
req.user = user; // ← INSTANCIA SEQUELIZE (tiene user_id, NO id)
```

**CONCLUSIÓN**:
- `decoded.id` viene del JWT (mapeado desde `user_id`)
- `req.user` es una INSTANCIA SEQUELIZE con campo `user_id` (primary key)
- Por lo tanto, routes deben acceder a `req.user.user_id` (NO `req.user.id`)

#### 1.3 Inconsistencia Detectada (auth.js línea 123)
```javascript
// ⚠️ CÓDIGO INCONSISTENTE - Intenta ambos métodos
userId: req.user.user_id || req.user.id,
```

**ANÁLISIS**:
- Esto demuestra que el desarrollador original también tuvo dudas
- Usa fallback porque no estaba seguro cuál campo existía
- Confirma que `req.user.user_id` es el campo REAL

---

### 2. MODELO SEQUELIZE (User-postgresql.js)

```javascript
// DEFINICIÓN DEL PRIMARY KEY (líneas 10-15)
user_id: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,  // ← ESTE ES EL CAMPO EN LA INSTANCIA
  allowNull: false
},

// CAMPO COMPANY (líneas 25-30) - Multi-tenant
companyId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  field: 'company_id',  // ← DB usa snake_case, model usa camelCase
  validate: {
    notNull: { msg: 'Company ID is required' }
  }
}
```

**CONCLUSIÓN**:
- El campo del modelo es `user_id` (snake_case) porque es el nombre en PostgreSQL
- Sequelize expone el campo tal cual está en el modelo: `user.user_id`
- NO existe un getter virtual para `user.id` en este modelo
- Para company, el modelo usa `companyId` (camelCase) mapeado a `company_id` (DB)

---

### 3. ESTADÍSTICAS DE USO EN ROUTES

#### 3.1 Ocurrencias de `req.user.user_id`
**Total**: 104+ ocurrencias en 29 archivos

**Archivos con mayor uso**:
- `medicalRoutes.js`: 38 ocurrencias
- `documentRoutes.js`: 18 ocurrencias
- `messageRoutes.js`: 11 ocurrencias
- `attendanceRoutes.js`: 9 ocurrencias
- `biometricRoutes.js`: 5 ocurrencias
- `faceAuthRoutes.js`: 5 ocurrencias
- Y 23 archivos más...

**Patrones de uso comunes**:
```javascript
// 1. Filtrado por usuario (multi-tenant)
where: { user_id: req.user.user_id, company_id: req.user.company_id }

// 2. Creación de registros
{ userId: req.user.user_id, createdBy: req.user.user_id }

// 3. Validación de permisos
if (record.user_id !== req.user.user_id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'No autorizado' });
}

// 4. Auditoría
{ lastModifiedBy: req.user.user_id, requestedById: req.user.user_id }
```

#### 3.2 Ocurrencias de `req.user.id`
**Total**: 2 ocurrencias (0.019% del total)

**Archivos**:
1. `biometric-attendance-api.js:1395` - En un console.warn de seguridad
2. `kioskRoutes.js:173` - Con FALLBACK: `req.user.user_id || req.user.id`

**Análisis**:
- Solo 2 usos en todo el sistema (casi inexistente)
- Uno es solo logging (no funcional)
- El otro usa FALLBACK porque el desarrollador no estaba seguro

---

### 4. ESTADÍSTICAS DE USO: company_id vs companyId

#### 4.1 Ocurrencias de `req.user.company_id`
**Total**: 4 archivos (minoría)
- `userAdminRoutes.js`
- `userMedicalRoutes.js`
- `userProfileRoutes.js`
- `attendanceRoutes_chart_endpoint.txt`

#### 4.2 Ocurrencias de `req.user.companyId`
**Total**: 169 ocurrencias en 25 archivos (MAYORÍA)

**Archivos incluyen**:
- TODOS los nuevos routes creados (userDriverLicenseRoutes, userProfessionalLicenseRoutes, etc.)
- Routes principales (attendanceRoutes, biometricRoutes, departmentRoutes, etc.)
- Routes de notificaciones, support, assistant, partners, etc.

**CONCLUSIÓN**:
✅ **ESTÁNDAR**: `req.user.companyId` (camelCase) es el estándar en el 86% del código

---

## 🎯 ESTÁNDARES UNIFICADOS PROPUESTOS

### ESTÁNDAR #1: Campo ID de Usuario
```javascript
// ✅ CORRECTO - USAR SIEMPRE
const userId = req.user.user_id;

// ❌ INCORRECTO - NUNCA USAR
const userId = req.user.id; // ← Este campo NO EXISTE en instancia Sequelize
```

### ESTÁNDAR #2: Campo Company ID (Multi-Tenant)
```javascript
// ✅ CORRECTO - USAR SIEMPRE
const companyId = req.user.companyId;

// ❌ INCORRECTO - NO USAR
const companyId = req.user.company_id; // ← Inconsistente con el 86% del código
```

### ESTÁNDAR #3: Test Scripts
```javascript
// ✅ CORRECTO - Login Response usa 'id'
const response = await axios.post('/api/v1/auth/login', credentials);
testUserId = response.data.user.id; // ← Login response expone 'id'
testCompanyId = response.data.user.companyId; // ← camelCase

// ✅ CORRECTO - Requests autenticados usan user_id
const headers = { Authorization: `Bearer ${token}` };
await axios.post('/api/endpoint', {
  userId: testUserId, // ← Se envía como userId al backend
  companyId: testCompanyId
}, { headers });

// Backend recibe y usa:
// req.user.user_id (instancia Sequelize)
// req.user.companyId (instancia Sequelize)
```

### ESTÁNDAR #4: Queries de Base de Datos
```javascript
// ✅ CORRECTO - Nombres de columna en snake_case
const result = await sequelize.query(`
  SELECT user_id, company_id, first_name
  FROM users
  WHERE user_id = :userId AND company_id = :companyId
`, {
  replacements: {
    userId: req.user.user_id,      // ← Sequelize instance
    companyId: req.user.companyId  // ← Sequelize instance
  }
});

// ✅ CORRECTO - Sequelize ORM usa camelCase
const user = await User.findOne({
  where: {
    user_id: req.user.user_id,    // ← Campo del modelo (snake_case)
    companyId: req.user.companyId // ← Campo del modelo (camelCase mapeado)
  }
});
```

---

## 🔧 PLAN DE MIGRACIÓN

### Fase 1: Validación (NO CAMBIOS)
- [x] Auditar todos los archivos routes
- [x] Documentar patrones de uso actuales
- [x] Identificar inconsistencias
- [ ] **ANTES DE CUALQUIER CAMBIO**: Verificar que login, support, y módulos críticos funcionan

### Fase 2: Correcciones Mínimas (SOLO SI ES NECESARIO)
1. **Corregir solo los 2 usos incorrectos de `req.user.id`**:
   - `biometric-attendance-api.js:1395` → `req.user.user_id`
   - `kioskRoutes.js:173` → remover fallback, usar solo `req.user.user_id`

2. **Corregir los 4 usos de `req.user.company_id`**:
   - Cambiar a `req.user.companyId` para consistencia

3. **Remover código inconsistente de auth.js:123**:
   ```javascript
   // ANTES (inconsistente):
   userId: req.user.user_id || req.user.id,

   // DESPUÉS (estándar):
   userId: req.user.user_id,
   ```

### Fase 3: Testing Post-Migración
- [ ] Verificar login funciona (ambos roles: admin, employee)
- [ ] Verificar módulo de soporte funciona
- [ ] Verificar notificaciones funcionan
- [ ] Ejecutar suite de tests completa
- [ ] Verificar multi-tenancy (aislación entre companies)

---

## 📊 IMPACTO ESTIMADO

### Archivos a Modificar
- **Mínimo**: 3 archivos (solo inconsistencias críticas)
- **Completo**: 7 archivos (incluir company_id → companyId)

### Riesgo
- **BAJO**: Los cambios son correcciones de 2 usos minoritarios
- **ESTÁNDAR YA EXISTE**: El 98% del código usa `req.user.user_id` correctamente
- **NO ROMPE COMPATIBILIDAD**: Login response sigue igual (frontend no afectado)

### Beneficios
- ✅ Elimina bugs intermitentes al cambiar código
- ✅ Consistencia 100% en todo el sistema
- ✅ Tests más confiables
- ✅ Menos confusión para futuros desarrolladores
- ✅ Código más mantenible

---

## 🚨 DEPENDENCIAS CRÍTICAS A VERIFICAR

### Antes de aplicar CUALQUIER cambio, verificar:

1. **Login de Usuarios Normales**
   - Empresa ISI, usuario admin
   - Empresa demo, usuario administrador
   - Verificar que `response.data.user.id` existe

2. **Login de Soporte**
   - Verificar módulo supportRoutesV2.js
   - Verificar que usa `req.user.user_id` o `req.user.companyId`

3. **Notificaciones**
   - Verificar notificationsEnterprise.js
   - Confirmar que usa `req.user.user_id`

4. **Módulos Relacionados con Vacaciones**
   - Verificar que obtiene datos del perfil de usuario correcto
   - Confirmar multi-tenancy (company_id)

5. **Módulos Relacionados con Licencias**
   - Verificar que notificaciones de vencimiento usan IDs correctos
   - Confirmar que las relaciones User ↔ License funcionan

---

## 📝 CHECKLIST DE VERIFICACIÓN PRE-CAMBIOS

- [ ] Servidor corriendo en puerto 9998
- [ ] Login funciona con empresa ISI (admin/admin123)
- [ ] Login funciona con empresa demo (administrador/admin123)
- [ ] Módulo de soporte accesible
- [ ] Módulo de usuarios funciona (CRUD completo)
- [ ] Notificaciones se envían correctamente
- [ ] Multi-tenancy funcionando (datos aislados por company)
- [ ] Tests base pasando (al menos 50%+)

**SOLO DESPUÉS DE VERIFICAR TODO LO ANTERIOR**: Aplicar cambios de Fase 2

---

## 🎓 LECCIONES APRENDIDAS

### Por qué pasó esto:
1. **Diferentes desarrolladores** usaron diferentes convenciones
2. **JWT token mapea `user_id` a `id`** causando confusión
3. **Login response expone `id`** (para frontend) pero backend usa `user_id`
4. **No había documentación** del estándar a seguir
5. **Sequelize permite acceder a campos inexistentes** sin error (retorna undefined)

### Cómo prevenir en el futuro:
1. ✅ Documentar estándares claramente (este documento)
2. ✅ Code reviews enfocados en consistencia
3. ✅ ESLint rules para detectar `req.user.id` y alertar
4. ✅ Tests que validen el estándar
5. ✅ Comentarios en código explicando por qué `user_id` vs `id`

---

## 🔗 REFERENCIAS

- **Modelo User**: `backend/src/models/User-postgresql.js`
- **Middleware Auth**: `backend/src/middleware/auth.js`
- **Login Route**: `backend/src/routes/authRoutes.js`
- **Grep Results**: Ver sección 3 de este documento

---

**Última Actualización**: Enero 2025
**Estado**: ✅ AUDITORÍA COMPLETA - PENDIENTE APLICAR CAMBIOS
**Próximo Paso**: Verificar checklist pre-cambios antes de modificar código
