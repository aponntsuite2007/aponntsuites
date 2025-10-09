# 📋 POLÍTICAS DE DESARROLLO - SISTEMA BIOMÉTRICO MULTI-TENANT

## 🎯 FILOSOFÍA DE DESARROLLO

### PRINCIPIOS FUNDAMENTALES
1. **MULTI-TENANT FIRST**: Todo desarrollo debe considerar aislación de datos
2. **SEGURIDAD BY DESIGN**: Validación y sanitización en cada capa
3. **ESCALABILIDAD PROGRESIVA**: Código preparado para crecimiento
4. **SIMPLICIDAD FUNCIONAL**: Sin over-engineering, directo al objetivo
5. **DOCUMENTACIÓN VIVA**: Código autodocumentado y explicativo

---

## 🔧 ESTÁNDARES DE CÓDIGO

### JAVASCRIPT/NODE.JS

#### Convenciones de Nomenclatura
```javascript
// ✅ CORRECTO
const userController = require('./controllers/userController');
const companyId = req.user.company_id;
const isUserActive = user.is_active;

// ❌ INCORRECTO
const UserCTRL = require('./controllers/user-ctrl');
const cid = req.user.cId;
const active = user.active;
```

#### Estructura de Funciones
```javascript
// ✅ CORRECTO: Función autodocumentada
async function createUserInCompany(userData, companyId) {
    // Validar datos de entrada
    if (!userData.username || !companyId) {
        throw new Error('Username y companyId son requeridos');
    }

    // Verificar unicidad en empresa
    const existingUser = await User.findOne({
        where: {
            username: userData.username,
            company_id: companyId
        }
    });

    if (existingUser) {
        throw new Error('Usuario ya existe en esta empresa');
    }

    // Crear usuario con aislación multi-tenant
    return await User.create({
        ...userData,
        company_id: companyId,
        id: uuidv4()
    });
}

// ❌ INCORRECTO: Sin validación, sin contexto
async function createUser(data) {
    return await User.create(data);
}
```

#### Manejo de Errores
```javascript
// ✅ CORRECTO: Error handling estructurado
app.get('/api/v1/users', auth, async (req, res) => {
    try {
        const users = await User.findAll({
            where: {
                company_id: req.user.company_id,
                is_active: true
            }
        });

        res.json({
            success: true,
            data: users,
            total: users.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
```

### SQL/POSTGRESQL

#### Consultas Multi-tenant Obligatorias
```sql
-- ✅ CORRECTO: Siempre filtrar por company_id
SELECT u.*, d.name as department_name
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.company_id = $1 AND u.is_active = true
ORDER BY u.last_name, u.first_name;

-- ❌ INCORRECTO: Sin filtro de empresa
SELECT * FROM users WHERE is_active = true;
```

#### Índices Requeridos
```sql
-- OBLIGATORIO: Todos los índices deben incluir company_id
CREATE INDEX idx_users_company_active ON users(company_id, is_active);
CREATE INDEX idx_attendance_company_date ON attendance(company_id, date);
CREATE INDEX idx_permissions_user_company ON user_permissions(user_id, company_id);
```

### HTML/CSS/FRONTEND

#### Estructura de Archivos
```html
<!-- ✅ CORRECTO: Estructura semántica -->
<div class="company-dashboard" data-company-id="${companyId}">
    <header class="dashboard-header">
        <h1 class="company-name">${companyName}</h1>
        <div class="user-info">${username} - ${role}</div>
    </header>

    <main class="modules-grid">
        <div class="module-card" data-module="users">
            <div class="module-icon">👤</div>
            <div class="module-name">Usuarios</div>
            <div class="module-status active"></div>
        </div>
    </main>
</div>
```

#### CSS Modular
```css
/* ✅ CORRECTO: Clases específicas y reutilizables */
.company-dashboard {
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: 100vh;
    background: var(--bg-color);
}

.module-card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.2s ease;
}

.module-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.module-card.disabled {
    opacity: 0.6;
    pointer-events: none;
}
```

---

## 🛡️ POLÍTICAS DE SEGURIDAD

### AUTENTICACIÓN Y AUTORIZACIÓN

#### JWT Token Structure
```javascript
// Estructura obligatoria del JWT
const tokenPayload = {
    userId: user.id,
    companyId: user.company_id,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
};
```

#### Middleware de Autenticación
```javascript
// OBLIGATORIO: Usar en todos los endpoints protegidos
const requireAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({
            where: {
                id: decoded.userId,
                company_id: decoded.companyId,
                is_active: true
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Usuario no autorizado' });
        }

        req.user = user;
        req.companyId = decoded.companyId;
        next();

    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};
```

### VALIDACIÓN DE DATOS

#### Esquemas de Validación
```javascript
// Usar joi o similar para validación
const userCreateSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    employeeId: Joi.string().max(20),
    dni: Joi.string().pattern(/^\d{7,8}$/),
    companyId: Joi.number().integer().positive().required()
});

// Middleware de validación
const validateUserCreate = (req, res, next) => {
    const { error } = userCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            error: 'Datos inválidos',
            details: error.details.map(d => d.message)
        });
    }
    next();
};
```

#### Sanitización de Inputs
```javascript
// OBLIGATORIO: Sanitizar todos los inputs
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;

    return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/[<>]/g, '');
};

// Aplicar en middleware
const sanitizeBody = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        });
    }
    next();
};
```

---

## 📊 POLÍTICAS DE BASE DE DATOS

### MIGRACIONES Y SEEDERS

#### Estructura de Migración
```javascript
// migrations/YYYYMMDD-create-table-name.js
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('table_name', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            company_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'companies',
                    key: 'id'
                }
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        });

        // OBLIGATORIO: Índice multi-tenant
        await queryInterface.addIndex('table_name', ['company_id']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('table_name');
    }
};
```

#### Seeders para Datos del Sistema
```javascript
// seeders/001-system-modules.js
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const modules = [
            {
                module_key: 'users',
                name: 'Gestión de Usuarios',
                description: 'Administración de usuarios del sistema',
                is_core: true,
                created_at: new Date(),
                updated_at: new Date()
            }
            // ... otros módulos
        ];

        await queryInterface.bulkInsert('system_modules', modules);
    }
};
```

### CONSULTAS OPTIMIZADAS

#### Patrones Requeridos
```javascript
// ✅ CORRECTO: Consulta optimizada multi-tenant
const getUsersWithDepartments = async (companyId, filters = {}) => {
    const whereClause = {
        company_id: companyId,
        is_active: true
    };

    if (filters.department) {
        whereClause.department_id = filters.department;
    }

    if (filters.role) {
        whereClause.role = filters.role;
    }

    return await User.findAll({
        where: whereClause,
        include: [{
            model: Department,
            where: { company_id: companyId },
            required: false
        }],
        order: [['last_name', 'ASC'], ['first_name', 'ASC']],
        limit: filters.limit || 100
    });
};
```

---

## 🧪 POLÍTICAS DE TESTING

### TESTING MULTI-TENANT

#### Setup de Tests
```javascript
// tests/setup.js
const { sequelize } = require('../src/config/database');

beforeAll(async () => {
    // Crear base de datos de test
    await sequelize.sync({ force: true });

    // Crear empresas de prueba
    await Company.bulkCreate([
        { id: 1, name: 'Test Company 1', slug: 'test1' },
        { id: 2, name: 'Test Company 2', slug: 'test2' }
    ]);
});

afterEach(async () => {
    // Limpiar datos de test manteniendo estructura
    await User.destroy({ where: {}, truncate: true });
    await Attendance.destroy({ where: {}, truncate: true });
});
```

#### Tests de Aislación
```javascript
// tests/multi-tenant.test.js
describe('Multi-tenant Isolation', () => {
    test('should isolate user data between companies', async () => {
        // Crear usuarios en diferentes empresas
        const user1 = await User.create({
            username: 'user1',
            company_id: 1,
            email: 'user1@test.com'
        });

        const user2 = await User.create({
            username: 'user1', // Mismo username, diferente empresa
            company_id: 2,
            email: 'user1@test2.com'
        });

        // Verificar aislación
        const company1Users = await User.findAll({
            where: { company_id: 1 }
        });

        const company2Users = await User.findAll({
            where: { company_id: 2 }
        });

        expect(company1Users).toHaveLength(1);
        expect(company2Users).toHaveLength(1);
        expect(company1Users[0].id).not.toBe(company2Users[0].id);
    });
});
```

### COVERAGE MÍNIMO REQUERIDO

```javascript
// jest.config.js
module.exports = {
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/migrations/**',
        '!src/seeders/**'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        },
        // Crítico para multi-tenant
        './src/middleware/auth.js': {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95
        }
    }
};
```

---

## 🚀 POLÍTICAS DE DEPLOYMENT

### ENVIRONMENTS

#### Development
```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/biometric_dev
JWT_SECRET=dev-secret-key
DEBUG=true
LOG_LEVEL=debug
```

#### Production
```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/biometric_prod
JWT_SECRET=super-secure-production-key
DEBUG=false
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Biometric System

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run multi-tenant tests
        run: npm run test:multi-tenant

      - name: Check coverage
        run: npm run coverage

      - name: Security audit
        run: npm audit --audit-level moderate

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          npm run migrate:production
          npm run seed:system
          pm2 restart biometric-system
```

---

## 📋 CHECKLIST DE DESARROLLO

### ANTES DE CADA COMMIT
- [ ] Código sigue estándares de nomenclatura
- [ ] Todas las consultas SQL incluyen company_id
- [ ] Validación de inputs implementada
- [ ] Tests unitarios pasan
- [ ] Tests de aislación multi-tenant pasan
- [ ] No hay secrets hardcodeados
- [ ] Logs informativos agregados

### ANTES DE CADA PR
- [ ] Documentación actualizada
- [ ] Coverage mínimo alcanzado
- [ ] Performance tests pasan
- [ ] Security scan sin issues críticos
- [ ] Manual testing en ambiente staging
- [ ] Review de otro desarrollador

### ANTES DE CADA RELEASE
- [ ] Tests end-to-end completos
- [ ] Backup de base de datos realizado
- [ ] Plan de rollback preparado
- [ ] Monitoreo configurado
- [ ] Documentación de usuario actualizada

---

## 🔄 VERSIONADO Y RELEASES

### Semantic Versioning
```
MAJOR.MINOR.PATCH

MAJOR: Cambios incompatibles en API multi-tenant
MINOR: Nueva funcionalidad compatible
PATCH: Bug fixes y mejoras menores

Ejemplos:
6.7.0 - Sistema multi-tenant estable
6.7.1 - Fix ISI modules
6.8.0 - Nuevo módulo biométrico
7.0.0 - Cambio arquitectura microservicios
```

### Branches Strategy
```
main - Producción estable
develop - Desarrollo activo
feature/module-name - Nuevas funcionalidades
hotfix/critical-bug - Fixes urgentes
release/version - Preparación de releases
```

---

**📋 POLÍTICAS ACTUALIZADAS:** 22 Septiembre 2025
**👥 APLICABLE A:** Todo el equipo de desarrollo
**🔄 PRÓXIMA REVISIÓN:** 1 Octubre 2025