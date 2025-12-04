/**
 * Ruta temporal para seedear empresa DEMO desde Render
 * ELIMINAR DESPUÉS DE USAR
 *
 * Uso: GET /api/seed-demo?key=DEMO_SEED_2024_SECURE
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Clave secreta para ejecutar el seed
const SECRET_KEY = 'DEMO_SEED_2024_SECURE';

// GET /api/seed-demo/check - Verificar estado de BD
router.get('/check', async (req, res) => {
    try {
        const [tables] = await sequelize.query(`
            SELECT tablename as name FROM pg_tables
            WHERE schemaname = 'public' ORDER BY tablename
        `);
        res.json({
            success: true,
            tables: tables.map(r => r.name),
            count: tables.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/sync-all?key=SECRET - Sincronizar TODAS las tablas con los modelos
// Este endpoint crea tablas faltantes sin modificar las existentes (seguro para FK)
// Usar después de cada deploy con cambios en modelos
router.get('/sync-all', async (req, res) => {
    const { key } = req.query;
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        console.log('[SYNC-ALL] Iniciando sincronización de modelos...');

        // Obtener tablas ANTES
        const tablesBefore = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        `, { type: QueryTypes.SELECT });
        const beforeCount = tablesBefore.length;

        // sync() sin alter = solo crea tablas faltantes, NO modifica existentes
        // Esto es seguro porque no toca columnas con FK
        await sequelize.sync({ force: false });

        console.log('[SYNC-ALL] Sincronización completada');

        // Verificar tablas DESPUÉS
        const tablesAfter = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        `, { type: QueryTypes.SELECT });

        const newTables = tablesAfter.filter(t =>
            !tablesBefore.find(tb => tb.table_name === t.table_name)
        );

        res.json({
            success: true,
            message: 'BD sincronizada con modelos Sequelize',
            tablas_antes: beforeCount,
            tablas_despues: tablesAfter.length,
            tablas_nuevas: newTables.map(t => t.table_name),
            instruction: 'Llamar este endpoint después de cada deploy con nuevos modelos',
            tables: tablesAfter.map(r => r.table_name),
            count: tablesAfter.length
        });
    } catch (error) {
        console.error('[SYNC-ALL] Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/create-schema?key=SECRET - Crear tablas básicas (método alternativo)
router.get('/create-schema', async (req, res) => {
    const { key } = req.query;
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        // Crear tablas básicas necesarias para el seed
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                legal_name VARCHAR(255),
                slug VARCHAR(255) UNIQUE NOT NULL,
                tax_id VARCHAR(50),
                contact_email VARCHAR(255),
                contact_phone VARCHAR(50),
                address TEXT,
                city VARCHAR(100),
                province VARCHAR(100),
                country VARCHAR(100),
                license_type VARCHAR(50) DEFAULT 'basic',
                max_employees INTEGER DEFAULT 100,
                is_active BOOLEAN DEFAULT true,
                active_modules JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS branches (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id),
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50),
                address TEXT,
                city VARCHAR(100),
                province VARCHAR(100),
                country VARCHAR(100),
                phone VARCHAR(50),
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                timezone VARCHAR(100),
                is_main BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id),
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS shifts (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id),
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50),
                start_time TIME,
                end_time TIME,
                color VARCHAR(20),
                work_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id),
                branch_id INTEGER REFERENCES branches(id),
                department_id INTEGER REFERENCES departments(id),
                shift_id INTEGER REFERENCES shifts(id),
                employee_id VARCHAR(50),
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'employee',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                company_id INTEGER REFERENCES companies(id),
                date DATE NOT NULL,
                check_in TIMESTAMP,
                check_out TIMESTAMP,
                status VARCHAR(50) DEFAULT 'pending',
                check_in_method VARCHAR(50),
                check_out_method VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Verificar tablas creadas
        const tables = await sequelize.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            message: 'Schema básico creado',
            tables: tables.map(r => r.table_name),
            count: tables.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// ============================================================
// DATOS REALISTAS
// ============================================================

const EMPRESA = {
    name: 'DEMO',
    legal_name: 'Demo Corporación S.A.',
    slug: 'demo-corp',
    tax_id: '30-71234567-8',
    contact_email: 'admin@democorp.com',
    contact_phone: '+54 11 4567-8900',
    address: 'Av. Corrientes 1234, Piso 5',
    city: 'Buenos Aires',
    province: 'Ciudad Autónoma de Buenos Aires',
    country: 'Argentina',
    license_type: 'enterprise',
    max_employees: 500
};

const SUCURSALES = [
    {
        name: 'Casa Central',
        code: 'AR-CABA',
        address: 'Av. Corrientes 1234, Piso 5',
        city: 'Buenos Aires',
        province: 'Ciudad Autónoma de Buenos Aires',
        country: 'Argentina',
        phone: '+54 11 4567-8900',
        latitude: -34.6037,
        longitude: -58.3816,
        timezone: 'America/Argentina/Buenos_Aires',
        is_main: true
    },
    {
        name: 'Sucursal Montevideo',
        code: 'UY-MVD',
        address: '18 de Julio 1234',
        city: 'Montevideo',
        province: 'Montevideo',
        country: 'Uruguay',
        phone: '+598 2 901 2345',
        latitude: -34.9011,
        longitude: -56.1645,
        timezone: 'America/Montevideo',
        is_main: false
    }
];

const DEPARTAMENTOS = [
    { name: 'Dirección General', code: 'DG' },
    { name: 'Recursos Humanos', code: 'RRHH' },
    { name: 'Administración y Finanzas', code: 'ADMIN' },
    { name: 'Tecnología', code: 'IT' },
    { name: 'Operaciones', code: 'OPS' }
];

const TURNOS = [
    { name: 'Turno Mañana', code: 'TM', start_time: '08:00', end_time: '16:00', color: '#3B82F6', work_days: [1,2,3,4,5] },
    { name: 'Turno Tarde', code: 'TT', start_time: '14:00', end_time: '22:00', color: '#8B5CF6', work_days: [1,2,3,4,5] },
    { name: 'Turno Noche', code: 'TN', start_time: '22:00', end_time: '06:00', color: '#1E3A5F', work_days: [1,2,3,4,5] },
    { name: 'Turno Flexible', code: 'TF', start_time: '09:00', end_time: '18:00', color: '#10B981', work_days: [1,2,3,4,5] }
];

const USUARIOS = [
    { first_name: 'Admin', last_name: 'Sistema', email: 'admin@democorp.com', role: 'admin', dept: 0, shift: 3 },
    { first_name: 'María', last_name: 'González', email: 'maria.gonzalez@democorp.com', role: 'manager', dept: 1, shift: 0 },
    { first_name: 'Carlos', last_name: 'Rodríguez', email: 'carlos.rodriguez@democorp.com', role: 'supervisor', dept: 2, shift: 0 },
    { first_name: 'Ana', last_name: 'Martínez', email: 'ana.martinez@democorp.com', role: 'employee', dept: 3, shift: 0 },
    { first_name: 'Diego', last_name: 'López', email: 'diego.lopez@democorp.com', role: 'employee', dept: 4, shift: 0 },
    { first_name: 'Laura', last_name: 'Fernández', email: 'laura.fernandez@democorp.com', role: 'employee', dept: 4, shift: 1 },
    { first_name: 'Pablo', last_name: 'García', email: 'pablo.garcia@democorp.com', role: 'employee', dept: 4, shift: 1 },
    { first_name: 'Valentina', last_name: 'Sánchez', email: 'valentina.sanchez@democorp.com', role: 'employee', dept: 3, shift: 0 },
    { first_name: 'Martín', last_name: 'Ruiz', email: 'martin.ruiz@democorp.com', role: 'guard', dept: 4, shift: 2 },
    { first_name: 'Sofía', last_name: 'Díaz', email: 'sofia.diaz@democorp.com', role: 'employee', dept: 1, shift: 0 }
];

// Todos los módulos activos
const ALL_MODULES = [
    'users','attendance','departments','shifts','reports','dashboard',
    'notifications-enterprise','employee-360','vacation-management',
    'payroll','payroll-liquidation','legal-dashboard','medical-dashboard',
    'biometric-consent','certifications','compliance','kiosk-management',
    'engineering-dashboard','organizational-structure','company-account'
];

// GET /api/seed-demo?key=SECRET
router.get('/', async (req, res) => {
    const { key } = req.query;

    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    const t = await sequelize.transaction();
    const results = { steps: [], errors: [] };

    try {
        // 1. Verificar si ya existe
        const [existing] = await sequelize.query(
            "SELECT id FROM companies WHERE slug = 'demo-corp'",
            { transaction: t }
        );
        if (existing.length > 0) {
            await t.rollback();
            return res.json({
                success: false,
                message: 'Empresa DEMO ya existe',
                company_id: existing[0].id
            });
        }

        // 2. Crear empresa
        const [companyResult] = await sequelize.query(`
            INSERT INTO companies (name, legal_name, slug, tax_id, contact_email, contact_phone,
                                   address, city, province, country, license_type, max_employees,
                                   is_active, active_modules, created_at, updated_at)
            VALUES (:name, :legal_name, :slug, :tax_id, :contact_email, :contact_phone,
                    :address, :city, :province, :country, :license_type, :max_employees,
                    true, :active_modules, NOW(), NOW())
            RETURNING id
        `, {
            replacements: {
                ...EMPRESA,
                active_modules: JSON.stringify(ALL_MODULES)
            },
            transaction: t
        });

        const companyId = companyResult[0].id;
        results.steps.push(`Empresa creada: ID ${companyId}`);

        // 3. Crear sucursales
        const branchIds = [];
        for (const suc of SUCURSALES) {
            const [brResult] = await sequelize.query(`
                INSERT INTO branches (company_id, name, code, address, city, province, country,
                                      phone, latitude, longitude, timezone, is_main, is_active, created_at, updated_at)
                VALUES (:company_id, :name, :code, :address, :city, :province, :country,
                        :phone, :latitude, :longitude, :timezone, :is_main, true, NOW(), NOW())
                RETURNING id
            `, {
                replacements: { company_id: companyId, ...suc },
                transaction: t
            });
            branchIds.push(brResult[0].id);
        }
        results.steps.push(`${branchIds.length} sucursales creadas`);

        // 4. Crear departamentos
        const deptIds = [];
        for (const dept of DEPARTAMENTOS) {
            const [deptResult] = await sequelize.query(`
                INSERT INTO departments (company_id, name, code, is_active, created_at, updated_at)
                VALUES (:company_id, :name, :code, true, NOW(), NOW())
                RETURNING id
            `, {
                replacements: { company_id: companyId, ...dept },
                transaction: t
            });
            deptIds.push(deptResult[0].id);
        }
        results.steps.push(`${deptIds.length} departamentos creados`);

        // 5. Crear turnos
        const shiftIds = [];
        for (const turno of TURNOS) {
            const [shiftResult] = await sequelize.query(`
                INSERT INTO shifts (company_id, name, code, start_time, end_time, color,
                                    work_days, is_active, created_at, updated_at)
                VALUES (:company_id, :name, :code, :start_time, :end_time, :color,
                        :work_days, true, NOW(), NOW())
                RETURNING id
            `, {
                replacements: {
                    company_id: companyId,
                    name: turno.name,
                    code: turno.code,
                    start_time: turno.start_time,
                    end_time: turno.end_time,
                    color: turno.color,
                    work_days: JSON.stringify(turno.work_days)
                },
                transaction: t
            });
            shiftIds.push(shiftResult[0].id);
        }
        results.steps.push(`${shiftIds.length} turnos creados`);

        // 6. Crear usuarios - hash password una sola vez
        const passwordHash = await bcrypt.hash('admin123', 10);
        const userIds = [];

        for (let i = 0; i < USUARIOS.length; i++) {
            const u = USUARIOS[i];
            const empId = `EMP-DEMO-${String(i + 1).padStart(3, '0')}`;
            const branchId = i < 7 ? branchIds[0] : branchIds[1];

            const [userResult] = await sequelize.query(`
                INSERT INTO users (company_id, branch_id, department_id, shift_id,
                                   employee_id, first_name, last_name, email, password, role,
                                   is_active, created_at, updated_at)
                VALUES (:company_id, :branch_id, :department_id, :shift_id,
                        :employee_id, :first_name, :last_name, :email, :password, :role,
                        true, NOW(), NOW())
                RETURNING id
            `, {
                replacements: {
                    company_id: companyId,
                    branch_id: branchId,
                    department_id: deptIds[u.dept],
                    shift_id: shiftIds[u.shift],
                    employee_id: empId,
                    first_name: u.first_name,
                    last_name: u.last_name,
                    email: u.email,
                    password: passwordHash,
                    role: u.role
                },
                transaction: t
            });
            userIds.push(userResult[0].id);
        }
        results.steps.push(`${userIds.length} usuarios creados (password: admin123)`);

        // 7. Crear solo 5 registros de asistencia (rápido)
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        let attendanceCount = 0;

        // Solo 5 registros de ejemplo
        for (let i = 1; i <= 5 && i < userIds.length; i++) {
            await sequelize.query(`
                INSERT INTO attendance (user_id, company_id, date, check_in, check_out,
                                        status, check_in_method, check_out_method, created_at, updated_at)
                VALUES (:user_id, :company_id, :date, :check_in, :check_out,
                        'present', 'biometric', 'biometric', NOW(), NOW())
            `, {
                replacements: {
                    user_id: userIds[i],
                    company_id: companyId,
                    date: dateStr,
                    check_in: `${dateStr} 08:00:00`,
                    check_out: `${dateStr} 17:00:00`
                },
                transaction: t
            });
            attendanceCount++;
        }
        results.steps.push(`${attendanceCount} registros de asistencia creados`);

        await t.commit();

        results.success = true;
        results.summary = {
            company_id: companyId,
            company_name: 'DEMO',
            slug: 'demo-corp',
            branches: branchIds.length,
            departments: deptIds.length,
            shifts: shiftIds.length,
            users: userIds.length,
            attendance_records: attendanceCount,
            login: {
                url: '/panel-empresa.html',
                company: 'demo-corp',
                user: 'admin@democorp.com',
                password: 'admin123'
            }
        };

        res.json(results);

    } catch (error) {
        await t.rollback();
        console.error('Error en seed:', error);
        results.success = false;
        results.error = error.message;
        res.status(500).json(results);
    }
});

module.exports = router;
