/**
 * Ruta temporal para seedear empresa DEMO desde Render
 * ELIMINAR DESPUÉS DE USAR
 *
 * Uso: GET /api/seed-demo?key=DEMO_SEED_2024_SECURE
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database').pool;

// Clave secreta para ejecutar el seed
const SECRET_KEY = 'DEMO_SEED_2024_SECURE';

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

    const client = await pool.connect();
    const results = { steps: [], errors: [] };

    try {
        await client.query('BEGIN');

        // 1. Verificar si ya existe
        const existing = await client.query("SELECT id FROM companies WHERE slug = 'demo-corp'");
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.json({
                success: false,
                message: 'Empresa DEMO ya existe',
                company_id: existing.rows[0].id
            });
        }

        // 2. Crear empresa
        const companyResult = await client.query(`
            INSERT INTO companies (name, legal_name, slug, tax_id, contact_email, contact_phone,
                                   address, city, province, country, license_type, max_employees,
                                   is_active, active_modules, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, NOW(), NOW())
            RETURNING id
        `, [EMPRESA.name, EMPRESA.legal_name, EMPRESA.slug, EMPRESA.tax_id, EMPRESA.contact_email,
            EMPRESA.contact_phone, EMPRESA.address, EMPRESA.city, EMPRESA.province, EMPRESA.country,
            EMPRESA.license_type, EMPRESA.max_employees, JSON.stringify(ALL_MODULES)]);

        const companyId = companyResult.rows[0].id;
        results.steps.push(`Empresa creada: ID ${companyId}`);

        // 3. Crear sucursales
        const branchIds = [];
        for (const suc of SUCURSALES) {
            const brResult = await client.query(`
                INSERT INTO branches (company_id, name, code, address, city, province, country,
                                      phone, latitude, longitude, timezone, is_main, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())
                RETURNING id
            `, [companyId, suc.name, suc.code, suc.address, suc.city, suc.province, suc.country,
                suc.phone, suc.latitude, suc.longitude, suc.timezone, suc.is_main]);
            branchIds.push(brResult.rows[0].id);
        }
        results.steps.push(`${branchIds.length} sucursales creadas`);

        // 4. Crear departamentos
        const deptIds = [];
        for (const dept of DEPARTAMENTOS) {
            const deptResult = await client.query(`
                INSERT INTO departments (company_id, name, code, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, true, NOW(), NOW())
                RETURNING id
            `, [companyId, dept.name, dept.code]);
            deptIds.push(deptResult.rows[0].id);
        }
        results.steps.push(`${deptIds.length} departamentos creados`);

        // 5. Crear turnos
        const shiftIds = [];
        for (const turno of TURNOS) {
            const shiftResult = await client.query(`
                INSERT INTO shifts (company_id, name, code, start_time, end_time, color,
                                    work_days, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
                RETURNING id
            `, [companyId, turno.name, turno.code, turno.start_time, turno.end_time,
                turno.color, JSON.stringify(turno.work_days)]);
            shiftIds.push(shiftResult.rows[0].id);
        }
        results.steps.push(`${shiftIds.length} turnos creados`);

        // 6. Crear usuarios - hash password una sola vez
        const passwordHash = await bcrypt.hash('admin123', 10);
        const userIds = [];

        for (let i = 0; i < USUARIOS.length; i++) {
            const u = USUARIOS[i];
            const empId = `EMP-DEMO-${String(i + 1).padStart(3, '0')}`;
            const branchId = i < 7 ? branchIds[0] : branchIds[1];

            const userResult = await client.query(`
                INSERT INTO users (company_id, branch_id, department_id, shift_id,
                                   employee_id, first_name, last_name, email, password, role,
                                   is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
                RETURNING id
            `, [companyId, branchId, deptIds[u.dept], shiftIds[u.shift],
                empId, u.first_name, u.last_name, u.email, passwordHash, u.role]);
            userIds.push(userResult.rows[0].id);
        }
        results.steps.push(`${userIds.length} usuarios creados (password: admin123)`);

        // 7. Crear solo 5 registros de asistencia (rápido)
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        let attendanceCount = 0;

        // Solo 5 registros de ejemplo
        for (let i = 1; i <= 5 && i < userIds.length; i++) {
            await client.query(`
                INSERT INTO attendance (user_id, company_id, date, check_in, check_out,
                                        status, check_in_method, check_out_method, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'present', 'biometric', 'biometric', NOW(), NOW())
            `, [userIds[i], companyId, dateStr, `${dateStr} 08:00:00`, `${dateStr} 17:00:00`]);
            attendanceCount++;
        }
        results.steps.push(`${attendanceCount} registros de asistencia creados`);

        await client.query('COMMIT');

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
        await client.query('ROLLBACK');
        console.error('Error en seed:', error);
        results.success = false;
        results.error = error.message;
        res.status(500).json(results);
    } finally {
        client.release();
    }
});

module.exports = router;
