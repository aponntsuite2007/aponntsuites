# 👨‍💻 GUÍA DE INCORPORACIÓN PARA NUEVOS DESARROLLADORES

**BIENVENIDO AL PROYECTO SISTEMA BIOMÉTRICO MULTI-TENANT**

Esta guía te permitirá incorporarte al proyecto en **menos de 2 horas** y estar productivo desde el primer día.

---

## 🚀 SETUP RÁPIDO (30 MINUTOS)

### PASO 1: Clonar y Configurar (10 min)
```bash
# 1. Clonar repositorio
git clone [repository-url]
cd sistema_asistencia_biometrico

# 2. Instalar dependencias
cd backend
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración PostgreSQL
```

### PASO 2: Base de Datos (10 min)
```bash
# 1. Crear base de datos PostgreSQL
createdb biometric_system

# 2. Ejecutar migraciones
npm run migrate

# 3. Cargar datos iniciales
npm run seed

# 4. Crear usuario ISI para testing
node create_isi_user.js
```

### PASO 3: Primer Inicio (10 min)
```bash
# 1. Iniciar servidor
PORT=9998 npm start

# 2. Verificar en browser
# http://localhost:9998/panel-administrativo.html
# http://localhost:9998/panel-empresa.html

# 3. Login de prueba
# Empresa: ISI
# Usuario: adminisi
# Clave: 123
```

### ✅ CHECKLIST DE SETUP
- [ ] Servidor inicia sin errores
- [ ] PostgreSQL conectado
- [ ] Panel admin accesible
- [ ] Panel empresa accesible
- [ ] Login ISI funciona
- [ ] Muestra 21 módulos

---

## 🧭 NAVEGACIÓN RÁPIDA DEL PROYECTO

### ESTRUCTURA CRÍTICA
```
📁 sistema_asistencia_biometrico/
├── 📄 PROJECT_DIRECTOR_DOCUMENTATION.md    # ← EMPEZAR AQUÍ
├── 📄 TECHNICAL_ARCHITECTURE.md           # ← ARQUITECTURA TÉCNICA
├── 📄 DEVELOPMENT_POLICIES.md             # ← ESTÁNDARES DE CÓDIGO
├── 📄 TECHNICAL_PROGRESS_REPORT.md        # ← HISTORIAL DE CAMBIOS
└── 📁 backend/
    ├── 📄 server.js                       # ← SERVIDOR PRINCIPAL
    ├── 📁 src/
    │   ├── 📁 routes/                     # ← APIs REST
    │   ├── 📁 models/                     # ← MODELOS DB
    │   ├── 📁 middleware/                 # ← AUTENTICACIÓN
    │   └── 📁 config/                     # ← CONFIGURACIÓN
    └── 📁 public/
        ├── 📄 panel-administrativo.html   # ← DASHBOARD ADMIN
        ├── 📄 panel-empresa.html          # ← DASHBOARD EMPRESA
        └── 📁 js/modules/                 # ← MÓDULOS FRONTEND
```

### ARCHIVOS QUE DEBES CONOCER DESDE EL DÍA 1
```bash
# 🔥 CRÍTICOS - Leer primero
backend/server.js                          # Servidor principal
backend/public/panel-empresa.html          # Frontend principal
backend/src/routes/companyModuleRoutes.js  # API módulos

# 📚 IMPORTANTES - Leer segunda semana
backend/src/config/database.js             # Configuración DB
backend/src/middleware/auth.js              # Autenticación
backend/public/panel-administrativo.html   # Admin dashboard

# 🛠️ ÚTILES - Conocer tercer semana
backend/create_isi_user.js                 # Scripts utilidad
backend/check_users_companies.js           # Testing helpers
backend/test_frontend_api_endpoint.js      # Debugging
```

---

## 💡 CONCEPTOS CLAVE MULTI-TENANT

### 1. AISLACIÓN DE DATOS
```javascript
// ✅ CORRECTO: Siempre filtrar por company_id
const users = await User.findAll({
    where: {
        company_id: req.user.company_id,  // 🔑 OBLIGATORIO
        is_active: true
    }
});

// ❌ INCORRECTO: Sin filtro de empresa
const users = await User.findAll({
    where: { is_active: true }
});
```

### 2. FLUJO DE AUTENTICACIÓN
```
Usuario → Selecciona EMPRESA → Ingresa credenciales → JWT con company_id → Todas las APIs filtran automáticamente
```

### 3. MÓDULOS CONFIGURABLES
```javascript
// Cada empresa tiene diferentes módulos activos
const companyModules = await CompanyModule.findAll({
    where: {
        company_id: req.user.company_id,
        activo: true
    }
});
```

---

## 🛠️ WORKFLOWS DE DESARROLLO

### AGREGAR NUEVO ENDPOINT
```javascript
// 1. En src/routes/newRoute.js
const { auth } = require('../middleware/auth');

router.get('/new-endpoint', auth, async (req, res) => {
    try {
        // 🔑 SIEMPRE incluir company_id
        const data = await Model.findAll({
            where: { company_id: req.user.company_id }
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// 2. En server.js agregar ruta
app.use('/api/v1/new', require('./src/routes/newRoute'));
```

### AGREGAR NUEVO MÓDULO
```javascript
// 1. En database - agregar a system_modules
INSERT INTO system_modules (module_key, name, description)
VALUES ('new-module', 'Nuevo Módulo', 'Descripción del módulo');

// 2. En panel-empresa.html - agregar a availableModules
const availableModules = {
    'new-module': {
        name: 'Nuevo Módulo',
        icon: '🆕',
        color: '#4CAF50'
    }
};

// 3. Crear archivo frontend
public/js/modules/newModule.js
```

### DEBUGGING MULTI-TENANT
```javascript
// Logs útiles para debugging
console.log('🔍 [DEBUG] Company ID:', req.user.company_id);
console.log('🔍 [DEBUG] User ID:', req.user.id);
console.log('🔍 [DEBUG] Query result count:', results.length);

// Verificar aislación de datos
SELECT DISTINCT company_id FROM users;
SELECT COUNT(*) FROM company_modules WHERE company_id = 11;
```

---

## 🧪 TESTING ESENCIAL

### TESTS QUE DEBES EJECUTAR
```bash
# Test rápido de funcionalidad
npm test

# Test específico multi-tenant
npm run test:multi-tenant

# Test de integración
npm run test:integration

# Test de seguridad
npm run security:audit
```

### TESTING MANUAL CRÍTICO
```bash
# 1. Test Login Multi-tenant
# - Crear 2 empresas diferentes
# - Crear usuarios con mismo username en ambas
# - Verificar que solo ve datos de su empresa

# 2. Test ISI Modules
# - Login como adminisi en ISI
# - Verificar que muestra 21/21 módulos
# - Verificar que todos están operacionales

# 3. Test API Isolation
curl -H "Authorization: Bearer token-empresa-1" /api/v1/users
curl -H "Authorization: Bearer token-empresa-2" /api/v1/users
# Deben retornar datasets diferentes
```

---

## 🔧 COMANDOS ÚTILES DIARIOS

### DESARROLLO
```bash
# Iniciar con auto-reload
npm run dev

# Iniciar en puerto específico
PORT=7777 npm start

# Ver logs en tiempo real
tail -f logs/application.log

# Reset base de datos
npm run db:reset && npm run seed
```

### DEBUGGING
```bash
# Verificar estado de empresas
node check_users_companies.js

# Test endpoint específico
node test_frontend_api_endpoint.js

# Crear usuario de prueba
node create_isi_user.js

# Backup rápido de DB
pg_dump biometric_system > backup_$(date +%Y%m%d).sql
```

### TESTING
```bash
# Test rápido
npm run test:quick

# Test con coverage
npm run test:coverage

# Test performance
npm run test:load

# Test security
npm run test:security
```

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### PROBLEMA 1: "Error: listen EADDRINUSE"
```bash
# SOLUCIÓN: Puerto ocupado
netstat -ano | grep :9998
# Cambiar puerto
PORT=9997 npm start
```

### PROBLEMA 2: "Database connection failed"
```bash
# SOLUCIÓN: Verificar PostgreSQL
pg_isready
# Verificar configuración en .env
cat .env | grep DATABASE
```

### PROBLEMA 3: "Módulos no aparecen"
```bash
# SOLUCIÓN: Verificar módulos de empresa
SELECT cm.*, sm.name
FROM company_modules cm
JOIN system_modules sm ON cm.system_module_id = sm.id
WHERE cm.company_id = 11;
```

### PROBLEMA 4: "Usuario no puede hacer login"
```bash
# SOLUCIÓN: Verificar usuario en empresa
SELECT id, username, company_id, is_active
FROM users
WHERE username = 'adminisi' AND company_id = 11;
```

### PROBLEMA 5: "ISI solo muestra 11 módulos"
```bash
# SOLUCIÓN: Fix ya implementado, verificar versión
git log --oneline | head -5
# Debe incluir commits con "ISI-FIX"
```

---

## 📚 RECURSOS DE APRENDIZAJE

### DOCUMENTACIÓN OBLIGATORIA (Leer en orden)
1. **PROJECT_DIRECTOR_DOCUMENTATION.md** - Visión general
2. **TECHNICAL_ARCHITECTURE.md** - Arquitectura técnica
3. **DEVELOPMENT_POLICIES.md** - Estándares de código
4. **TECHNICAL_PROGRESS_REPORT.md** - Historial

### CONCEPTOS TÉCNICOS CLAVE
- **Multi-tenancy**: Aislación de datos por empresa
- **JWT Authentication**: Tokens con company_id
- **PostgreSQL**: Base de datos relacional optimizada
- **Sequelize ORM**: Abstracción de base de datos
- **Module System**: Sistema modular configurable

### HERRAMIENTAS RECOMENDADAS
```bash
# Editor de código
VSCode + extensiones PostgreSQL

# Cliente DB
pgAdmin 4 o DBeaver

# Testing API
Postman o Insomnia

# Git client
GitKraken o SourceTree

# Terminal
Windows Terminal o iTerm2
```

---

## 🎯 TAREAS DE PRIMER DÍA

### CHECKLIST DE INCORPORACIÓN
- [ ] Setup completo funcionando
- [ ] Leer PROJECT_DIRECTOR_DOCUMENTATION.md
- [ ] Leer TECHNICAL_ARCHITECTURE.md
- [ ] Ejecutar tests básicos exitosamente
- [ ] Login en ambos paneles (admin y empresa)
- [ ] Verificar ISI con 21 módulos
- [ ] Hacer primer cambio menor y commit
- [ ] Review de código con team lead

### PRIMER COMMIT SUGERIDO
```bash
# Agregar tu nombre al equipo
git checkout -b feature/add-new-developer
# Editar PROJECT_DIRECTOR_DOCUMENTATION.md
# Agregar tu nombre en sección "EQUIPO TÉCNICO"
git add .
git commit -m "feat: agregar [tu-nombre] al equipo técnico"
git push origin feature/add-new-developer
# Crear PR
```

---

## 🤝 SOPORTE Y COMUNICACIÓN

### CANALES DE COMUNICACIÓN
- **Slack**: #biometric-dev
- **Email**: dev-team@company.com
- **Video**: Daily standup 9:00 AM
- **Documentación**: Este repositorio

### ESCALAMIENTO DE ISSUES
1. **Nivel 1**: Consultar documentación
2. **Nivel 2**: Buscar en chat/slack
3. **Nivel 3**: Preguntar a team lead
4. **Nivel 4**: Escalar a project director

### HORARIOS DE SOPORTE
- **Lunes-Viernes**: 9:00 - 18:00
- **Urgencias**: On-call 24/7
- **Team lead**: Disponible via Slack

---

## 🏁 PRÓXIMOS PASOS DESPUÉS DEL PRIMER DÍA

### SEMANA 1: FAMILIARIZACIÓN
- [ ] Completar setup y documentación
- [ ] Hacer 3-5 commits menores
- [ ] Participar en daily standups
- [ ] Revisar PRs de otros desarrolladores

### SEMANA 2: PRIMERAS FEATURES
- [ ] Tomar primer ticket/issue
- [ ] Implementar feature completa
- [ ] Escribir tests correspondientes
- [ ] Documentar cambios

### SEMANA 3: AUTONOMÍA
- [ ] Trabajar independientemente
- [ ] Ayudar a otros desarrolladores
- [ ] Proponer mejoras técnicas
- [ ] Liderar iniciativas menores

### PRIMER MES: ESPECIALIZACIÓN
- [ ] Especializarte en área específica
- [ ] Mentorear nuevo desarrollador
- [ ] Contribuir a arquitectura
- [ ] Liderar features complejas

---

## 🎓 CERTIFICACIÓN DE COMPETENCIA

### CONOCIMIENTOS REQUERIDOS
- [ ] Entiendes arquitectura multi-tenant
- [ ] Puedes crear APIs con aislación
- [ ] Comprendes sistema de módulos
- [ ] Manejas autenticación JWT
- [ ] Debuggeas problemas comunes
- [ ] Escribes tests efectivos
- [ ] Sigues estándares de código
- [ ] Documentas tu trabajo

### HABILIDADES PRÁCTICAS
- [ ] Crear endpoint nuevo
- [ ] Agregar módulo frontend
- [ ] Debuggear issue multi-tenant
- [ ] Ejecutar tests completos
- [ ] Deployar en staging
- [ ] Hacer rollback seguro
- [ ] Revisar código de otros
- [ ] Mentorear desarrollador junior

---

**👋 ¡BIENVENIDO AL EQUIPO!**

**Recuerda**: Este es un proyecto de **nivel enterprise** con arquitectura **robusta** y **estándares altos**. Tómate el tiempo necesario para entender bien los conceptos antes de empezar a desarrollar.

**¿Preguntas?** No dudes en consultar. **Preferimos una pregunta temprana que un bug en producción**.

---

**📋 GUÍA ACTUALIZADA:** 22 Septiembre 2025
**👨‍💻 PARA:** Nuevos desarrolladores
**🎯 OBJETIVO:** Productividad en primer día
**📞 SOPORTE:** dev-team@company.com