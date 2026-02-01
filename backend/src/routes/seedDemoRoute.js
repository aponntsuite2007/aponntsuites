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

// Clave secreta para ejecutar el seed (DEBE estar en .env, no hardcoded)
const SECRET_KEY = process.env.SEED_DEMO_KEY;

// Guard: Si no hay key configurada, los endpoints retornan 500
if (!SECRET_KEY) {
    console.warn('⚠️ [SEED-DEMO] SEED_DEMO_KEY no configurado - endpoints de seed deshabilitados');
}

// Módulos REALES de ISI (26 módulos exactos de company_modules + system_modules en BD local)
const ISI_MODULES_REAL = [
    { key: "job-postings", name: "Búsquedas Laborales", icon: "💼", color: "#6f42c1", category: "rrhh" },
    { key: "notification-center", name: "Centro de Notificaciones", icon: "🔔", color: "#667eea", category: "communication" },
    { key: "clientes", name: "Clientes SIAC", icon: "👥", color: "#3498db", category: "siac" },
    { key: "biometric-consent", name: "Consentimientos y Privacidad", icon: "📝", color: "#16a085", category: "compliance" },
    { key: "access-control", name: "Control de Accesos", icon: "🔐", color: "#8B4513", category: "security" },
    { key: "attendance", name: "Control de Asistencia", icon: "📋", color: "#9C27B0", category: "core" },
    { key: "company-account", name: "Cuenta Comercial", icon: "📜", color: "#7F8C8D", category: "core" },
    { key: "organizational-structure", name: "Estructura Organizacional", icon: "🏢", color: "#2c3e50", category: "rrhh" },
    { key: "employee-360", name: "Expediente 360°", icon: "🎯", color: "#9b59b6", category: "rrhh" },
    { key: "facturacion", name: "Facturación SIAC", icon: "💵", color: "#e67e22", category: "siac" },
    { key: "art-management", name: "Gestión de ART", icon: "🏥", color: "#F44336", category: "medical" },
    { key: "training-management", name: "Gestión de Capacitaciones", icon: "📚", color: "#FF5722", category: "rrhh" },
    { key: "kiosks", name: "Gestión de Kioscos", icon: "📟", color: "#607d8b", category: "hardware" },
    { key: "licensing-management", name: "Gestión de Licencias", icon: "📜", color: "#34495E", category: "admin" },
    { key: "sanctions-management", name: "Gestión de Sanciones", icon: "⚖️", color: "#E67E22", category: "rrhh" },
    { key: "users", name: "Gestión de Usuarios", icon: "👥", color: "#4CAF50", category: "core" },
    { key: "vacation-management", name: "Gestión de Vacaciones", icon: "🏖️", color: "#1ABC9C", category: "rrhh" },
    { key: "document-management", name: "Gestión Documental", icon: "📄", color: "#795548", category: "rrhh" },
    { key: "legal-dashboard", name: "Gestión Legal", icon: "⚖️", color: "#3F51B5", category: "compliance" },
    { key: "medical", name: "Gestión Médica", icon: "⚕️", color: "#00bcd4", category: "medical" },
    { key: "payroll-liquidation", name: "Liquidación de Sueldos", icon: "💰", color: "#4CAF50", category: "payroll" },
    { key: "employee-map", name: "Mapa de Empleados", icon: "🗺️", color: "#8BC34A", category: "analytics" },
    { key: "plantillas-fiscales", name: "Plantillas Fiscales", icon: "📋", color: "#9b59b6", category: "siac" },
    { key: "compliance-dashboard", name: "Inteligencia de Riesgos", icon: "🛡️", color: "#e94560", category: "compliance" },
    { key: "occupational-health-phase2", name: "Salud Ocupacional", icon: "🏥", color: "#00897B", category: "medical" },
    { key: "permissions-test", name: "Test de Permisos", icon: "🧪", color: "#4B0082", category: "testing" }
];

// GET /api/seed-demo/update-modules?key=SECRET - Asignar módulos de ISI a DEMO
router.get('/update-modules', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    try {
        // Actualizar active_modules de la empresa DEMO (id=1 o slug=demo-corp)
        // Actualizar TODAS las empresas con los módulos de ISI
        await sequelize.query(`
            UPDATE companies
            SET active_modules = :modules::jsonb,
                updated_at = NOW()
        `, {
            replacements: { modules: JSON.stringify(ISI_MODULES_REAL) }
        });

        // Verificar
        const [companies] = await sequelize.query(`
            SELECT id, name, slug, jsonb_array_length(active_modules) as module_count FROM companies
        `);

        res.json({
            success: true,
            message: 'active_modules actualizado en TODAS las empresas',
            modules_count: ISI_MODULES_REAL.length,
            companies: companies
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/fix-modules?key=SECRET - LIMPIAR y recargar módulos correctos de ISI
router.get('/fix-modules', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    try {
        // 1. Limpiar tablas existentes
        await sequelize.query(`DELETE FROM company_modules`);
        await sequelize.query(`DELETE FROM system_modules`);

        // 2. Insertar los 26 módulos REALES de ISI
        for (const mod of ISI_MODULES_REAL) {
            await sequelize.query(`
                INSERT INTO system_modules (module_key, name, description, icon, color, category)
                VALUES (:key, :name, :desc, :icon, :color, :category)
            `, {
                replacements: {
                    key: mod.key,
                    name: mod.name,
                    desc: 'Módulo ' + mod.name,
                    icon: mod.icon,
                    color: mod.color,
                    category: mod.category
                }
            });
        }

        // 3. Asignar todos los módulos a DEMO (company_id = 1)
        const [modules] = await sequelize.query(`SELECT id FROM system_modules`);
        for (const sm of modules) {
            await sequelize.query(`
                INSERT INTO company_modules (company_id, system_module_id, activo)
                VALUES (1, :smId, true)
            `, { replacements: { smId: sm.id } });
        }

        // 4. También actualizar active_modules en companies para consistencia
        const moduleKeys = ISI_MODULES_REAL.map(m => m.key);
        await sequelize.query(`
            UPDATE companies SET active_modules = :modules::jsonb WHERE id = 1
        `, { replacements: { modules: JSON.stringify(moduleKeys) } });

        // Verificar
        const [sysCount] = await sequelize.query(`SELECT COUNT(*) as cnt FROM system_modules`);
        const [compCount] = await sequelize.query(`SELECT COUNT(*) as cnt FROM company_modules WHERE company_id = 1`);
        const [moduleList] = await sequelize.query(`SELECT module_key, name FROM system_modules ORDER BY name`);

        res.json({
            success: true,
            message: 'Módulos limpiados y recargados con los 26 de ISI',
            system_modules: sysCount[0].cnt,
            company_modules_demo: compCount[0].cnt,
            modules: moduleList
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/create-module-tables?key=SECRET - Crear tablas de módulos (legacy)
router.get('/create-module-tables', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    try {
        // Crear tabla system_modules
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS system_modules (
                id SERIAL PRIMARY KEY,
                module_key VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                icon VARCHAR(100) DEFAULT '📦',
                color VARCHAR(20) DEFAULT '#666666',
                category VARCHAR(100) DEFAULT 'general',
                base_price DECIMAL(10,2) DEFAULT 0,
                metadata JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Crear tabla company_modules
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS company_modules (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL,
                system_module_id INTEGER NOT NULL,
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(company_id, system_module_id)
            )
        `);

        res.json({ success: true, message: 'Tablas creadas. Ahora usa /fix-modules para cargar los módulos correctos.' });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/setup-aponnt-staff - Crear admin Aponnt (TEMP - ELIMINAR)
router.get('/setup-aponnt-staff', async (req, res) => {
    const { key } = req.query;
    if (key !== 'APONNT_STAFF_2024') {
        return res.status(403).json({ error: 'Clave inválida' });
    }

    try {
        const bcryptLib = require('bcrypt');

        // Ver columnas de las tablas
        const [roleColumns] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'aponnt_staff_roles' ORDER BY ordinal_position
        `);
        const roleCols = roleColumns.map(c => c.column_name);

        const [staffColumns] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'aponnt_staff' ORDER BY ordinal_position
        `);
        const staffCols = staffColumns.map(c => c.column_name);

        // Buscar o crear rol
        let roleId = null;
        const [existingRole] = await sequelize.query(
            `SELECT role_id FROM aponnt_staff_roles WHERE role_code = 'SUPERADMIN' OR level = 0 LIMIT 1`,
            { type: QueryTypes.SELECT }
        );

        if (existingRole) {
            roleId = existingRole.role_id;
        } else {
            const hasRoleArea = roleCols.includes('role_area');
            const hasArea = roleCols.includes('area');

            let insertRoleSQL;
            if (hasRoleArea) {
                insertRoleSQL = `INSERT INTO aponnt_staff_roles (role_id, role_name, role_code, description, level, role_area, permissions, is_active, created_at, updated_at)
                    VALUES (gen_random_uuid(), 'Super Administrador', 'SUPERADMIN', 'Control total', 0, 'direccion', '{"all": true}'::jsonb, true, NOW(), NOW())
                    RETURNING role_id`;
            } else if (hasArea) {
                insertRoleSQL = `INSERT INTO aponnt_staff_roles (role_id, role_name, role_code, description, level, area, permissions, is_active, created_at, updated_at)
                    VALUES (gen_random_uuid(), 'Super Administrador', 'SUPERADMIN', 'Control total', 0, 'direccion', '{"all": true}'::jsonb, true, NOW(), NOW())
                    RETURNING role_id`;
            } else {
                insertRoleSQL = `INSERT INTO aponnt_staff_roles (role_id, role_name, role_code, description, level, permissions, is_active, created_at, updated_at)
                    VALUES (gen_random_uuid(), 'Super Administrador', 'SUPERADMIN', 'Control total', 0, '{"all": true}'::jsonb, true, NOW(), NOW())
                    RETURNING role_id`;
            }

            const [newRole] = await sequelize.query(insertRoleSQL, { type: QueryTypes.SELECT });
            roleId = newRole?.role_id;

            if (!roleId) {
                const [created] = await sequelize.query(
                    `SELECT role_id FROM aponnt_staff_roles WHERE role_code = 'SUPERADMIN' LIMIT 1`,
                    { type: QueryTypes.SELECT }
                );
                roleId = created?.role_id;
            }
        }

        if (!roleId) {
            return res.status(500).json({ error: 'No se pudo crear rol', roleCols, staffCols });
        }

        const hashedPassword = await bcryptLib.hash('admin123', 10);

        // Verificar si existe admin
        const [existing] = await sequelize.query(
            `SELECT staff_id FROM aponnt_staff WHERE email = 'admin@aponnt.com' LIMIT 1`,
            { type: QueryTypes.SELECT }
        );

        if (existing) {
            await sequelize.query(
                `UPDATE aponnt_staff SET password = $1, is_active = true, role_id = $2, updated_at = NOW() WHERE staff_id = $3`,
                { bind: [hashedPassword, roleId, existing.staff_id] }
            );
            return res.json({ success: true, action: 'updated', staff_id: existing.staff_id, login: { email: 'admin@aponnt.com', password: 'admin123' }, roleCols, staffCols });
        }

        // Crear admin
        const hasStaffArea = staffCols.includes('area');
        let insertStaffSQL;
        if (hasStaffArea) {
            insertStaffSQL = `INSERT INTO aponnt_staff (staff_id, first_name, last_name, email, username, dni, password, is_active, role_id, country, level, area, created_at, updated_at)
                VALUES (gen_random_uuid(), 'PABLO', 'RIVAS JORDAN', 'admin@aponnt.com', 'admin', '22062075', $1, true, $2, 'AR', 0, 'direccion', NOW(), NOW())
                RETURNING staff_id`;
        } else {
            insertStaffSQL = `INSERT INTO aponnt_staff (staff_id, first_name, last_name, email, username, dni, password, is_active, role_id, country, level, created_at, updated_at)
                VALUES (gen_random_uuid(), 'PABLO', 'RIVAS JORDAN', 'admin@aponnt.com', 'admin', '22062075', $1, true, $2, 'AR', 0, NOW(), NOW())
                RETURNING staff_id`;
        }

        const [newAdmin] = await sequelize.query(insertStaffSQL, { bind: [hashedPassword, roleId], type: QueryTypes.SELECT });
        res.json({ success: true, action: 'created', staff_id: newAdmin?.staff_id, login: { email: 'admin@aponnt.com', password: 'admin123' }, roleCols, staffCols });

    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/check - Verificar estado de BD (con opción de crear admin)
router.get('/check', async (req, res) => {
    try {
        // Si viene el parámetro admin=create, crear admin de Aponnt
        if (req.query.admin === 'create' && req.query.key === 'APONNT2024') {
            const bcryptLib = require('bcrypt');

            // Ver columnas
            const [roleColumns] = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'aponnt_staff_roles'`);
            const roleCols = roleColumns.map(c => c.column_name);
            const [staffColumns] = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'aponnt_staff'`);
            const staffCols = staffColumns.map(c => c.column_name);

            // Buscar o crear rol
            let roleId = null;
            const [existingRole] = await sequelize.query(`SELECT role_id FROM aponnt_staff_roles WHERE role_code = 'SUPERADMIN' OR level = 0 LIMIT 1`, { type: QueryTypes.SELECT });
            if (existingRole) {
                roleId = existingRole.role_id;
            } else {
                // Construir INSERT dinámico basado en columnas existentes
                const cols = ['role_id', 'role_name', 'role_code'];
                const vals = ["gen_random_uuid()", "'Super Administrador'", "'SUPERADMIN'"];
                if (roleCols.includes('description')) { cols.push('description'); vals.push("'Control total'"); }
                if (roleCols.includes('level')) { cols.push('level'); vals.push('0'); }
                if (roleCols.includes('role_area')) { cols.push('role_area'); vals.push("'direccion'"); }
                if (roleCols.includes('area')) { cols.push('area'); vals.push("'direccion'"); }
                if (roleCols.includes('permissions')) { cols.push('permissions'); vals.push("'{\"all\": true}'::jsonb"); }
                if (roleCols.includes('is_active')) { cols.push('is_active'); vals.push('true'); }
                if (roleCols.includes('created_at')) { cols.push('created_at'); vals.push('NOW()'); }
                if (roleCols.includes('updated_at')) { cols.push('updated_at'); vals.push('NOW()'); }
                const insertRoleSQL = `INSERT INTO aponnt_staff_roles (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING role_id`;
                const [newRole] = await sequelize.query(insertRoleSQL, { type: QueryTypes.SELECT });
                roleId = newRole?.role_id;
                if (!roleId) {
                    const [created] = await sequelize.query(`SELECT role_id FROM aponnt_staff_roles WHERE role_code = 'SUPERADMIN' LIMIT 1`, { type: QueryTypes.SELECT });
                    roleId = created?.role_id;
                }
            }

            if (!roleId) return res.status(500).json({ error: 'No se pudo crear rol', roleCols, staffCols });

            const hashedPassword = await bcryptLib.hash('admin123', 10);
            const [existing] = await sequelize.query(`SELECT staff_id FROM aponnt_staff WHERE email = 'admin@aponnt.com' LIMIT 1`, { type: QueryTypes.SELECT });

            if (existing) {
                const updates = ['password = $1', 'role_id = $2'];
                if (staffCols.includes('is_active')) updates.push('is_active = true');
                if (staffCols.includes('updated_at')) updates.push('updated_at = NOW()');
                await sequelize.query(`UPDATE aponnt_staff SET ${updates.join(', ')} WHERE staff_id = $3`, { bind: [hashedPassword, roleId, existing.staff_id] });
                return res.json({ success: true, action: 'updated', staff_id: existing.staff_id, login: { email: 'admin@aponnt.com', password: 'admin123' }, roleCols, staffCols });
            }

            // Construir INSERT dinámico para staff
            const sCols = ['staff_id', 'first_name', 'last_name', 'email', 'password', 'role_id'];
            const sVals = ["gen_random_uuid()", "'PABLO'", "'RIVAS JORDAN'", "'admin@aponnt.com'", '$1', '$2'];
            if (staffCols.includes('username')) { sCols.push('username'); sVals.push("'admin'"); }
            if (staffCols.includes('dni')) { sCols.push('dni'); sVals.push("'22062075'"); }
            if (staffCols.includes('is_active')) { sCols.push('is_active'); sVals.push('true'); }
            if (staffCols.includes('country')) { sCols.push('country'); sVals.push("'AR'"); }
            if (staffCols.includes('level')) { sCols.push('level'); sVals.push('0'); }
            if (staffCols.includes('area')) { sCols.push('area'); sVals.push("'direccion'"); }
            if (staffCols.includes('created_at')) { sCols.push('created_at'); sVals.push('NOW()'); }
            if (staffCols.includes('updated_at')) { sCols.push('updated_at'); sVals.push('NOW()'); }
            const insertSQL = `INSERT INTO aponnt_staff (${sCols.join(', ')}) VALUES (${sVals.join(', ')}) RETURNING staff_id`;
            const [newAdmin] = await sequelize.query(insertSQL, { bind: [hashedPassword, roleId], type: QueryTypes.SELECT });
            return res.json({ success: true, action: 'created', staff_id: newAdmin?.staff_id, login: { email: 'admin@aponnt.com', password: 'admin123' }, roleCols, staffCols });
        }

        // Comportamiento normal: listar tablas
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
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
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

// GET /api/seed-demo/sync-alter?key=SECRET - FORZAR sync con ALTER (agrega columnas faltantes)
router.get('/sync-alter', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const logs = [];
    const errors = [];

    try {
        logs.push('Iniciando sync con ALTER...');

        // Forzar sync con alter: true
        await sequelize.sync({ alter: true });
        logs.push('sequelize.sync({ alter: true }) ejecutado');

        // Verificar columnas de users
        const [userCols] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY column_name
        `);

        res.json({
            success: true,
            message: 'Sync con ALTER completado',
            logs,
            users_columns_count: userCols.length,
            users_columns: userCols.map(c => c.column_name)
        });
    } catch (error) {
        errors.push(error.message);

        // Si el sync falla, intentar agregar columnas manualmente
        logs.push('Sync falló, agregando columnas manualmente...');

        const missingColumns = [
            { col: 'branch_scope', type: "JSONB DEFAULT '[]'::jsonb" },
            { col: 'is_core_user', type: 'BOOLEAN DEFAULT false' },
            { col: 'force_password_change', type: 'BOOLEAN DEFAULT false' },
            { col: 'password_changed_at', type: 'TIMESTAMP' },
            { col: 'core_user_created_at', type: 'TIMESTAMP' },
            { col: 'onboarding_trace_id', type: 'VARCHAR(100)' },
            { col: 'organizational_position_id', type: 'INTEGER' },
            { col: 'salary_category_id', type: 'INTEGER' }
        ];

        for (const { col, type } of missingColumns) {
            try {
                await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
                logs.push(`${col} agregado`);
            } catch (e) {
                errors.push(`${col}: ${e.message.substring(0, 50)}`);
            }
        }

        res.json({
            success: errors.length === 0,
            message: 'Columnas agregadas manualmente',
            logs,
            errors
        });
    }
});

// GET /api/seed-demo/fix-columns?key=SECRET - Agregar columnas faltantes (paranoid)
router.get('/fix-columns', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const fixes = [];
    const errors = [];

    // Lista de tablas que pueden necesitar deleted_at
    const tablesToFix = ['departments', 'shifts', 'users', 'branches', 'attendance', 'companies'];

    for (const table of tablesToFix) {
        try {
            // Verificar si la columna ya existe
            const [cols] = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = 'deleted_at'
            `);

            if (cols.length === 0) {
                // Agregar columna
                await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
                fixes.push(`${table}: added deleted_at`);
            } else {
                fixes.push(`${table}: deleted_at already exists`);
            }
        } catch (error) {
            errors.push(`${table}: ${error.message}`);
        }
    }

    res.json({ success: true, fixes, errors });
});

// GET /api/seed-demo/fix-users-full?key=SECRET - Agregar TODAS las 110 columnas de users
router.get('/fix-users-full', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const fixes = [];
    const errors = [];

    // TODAS las 110 columnas de users (extraídas de BD local)
    const ALL_COLUMNS = [
        { col: 'user_id', type: 'UUID DEFAULT gen_random_uuid()' },
        { col: '"employeeId"', type: 'VARCHAR(255)' },
        { col: '"firstName"', type: 'VARCHAR(255)' },
        { col: '"lastName"', type: 'VARCHAR(255)' },
        { col: 'dni', type: 'VARCHAR(255)' },
        { col: 'phone', type: 'VARCHAR(255)' },
        { col: 'position', type: 'VARCHAR(255)' },
        { col: 'salary', type: 'DECIMAL(12,2)' },
        { col: '"hireDate"', type: 'DATE' },
        { col: '"birthDate"', type: 'DATE' },
        { col: 'address', type: 'TEXT' },
        { col: '"emergencyContact"', type: 'VARCHAR(255)' },
        { col: '"emergencyPhone"', type: 'VARCHAR(255)' },
        { col: '"allowOutsideRadius"', type: 'BOOLEAN DEFAULT false' },
        { col: '"convenioColectivo"', type: 'VARCHAR(255)' },
        { col: '"createdAt"', type: 'TIMESTAMPTZ DEFAULT NOW()' },
        { col: '"updatedAt"', type: 'TIMESTAMPTZ DEFAULT NOW()' },
        { col: 'is_active', type: 'BOOLEAN DEFAULT true' },
        { col: 'whatsapp_number', type: 'VARCHAR(255)' },
        { col: 'accepts_support_packages', type: 'BOOLEAN DEFAULT true' },
        { col: 'accepts_auctions', type: 'BOOLEAN DEFAULT true' },
        { col: 'accepts_email_notifications', type: 'BOOLEAN DEFAULT true' },
        { col: 'accepts_whatsapp_notifications', type: 'BOOLEAN DEFAULT true' },
        { col: 'accepts_sms_notifications', type: 'BOOLEAN DEFAULT true' },
        { col: 'communication_consent_date', type: 'TIMESTAMPTZ' },
        { col: 'global_rating', type: 'DECIMAL(5,2)' },
        { col: 'cbu', type: 'VARCHAR(30)' },
        { col: 'bank_name', type: 'VARCHAR(100)' },
        { col: 'notes', type: 'TEXT' },
        { col: 'usuario', type: 'VARCHAR(100)' },
        { col: 'department_id', type: 'BIGINT' },
        { col: 'default_branch_id', type: 'UUID' },
        { col: 'birth_date', type: 'DATE' },
        { col: 'cuil', type: 'VARCHAR(20)' },
        { col: 'emergency_contact', type: "JSONB DEFAULT '{}'::jsonb" },
        { col: 'work_schedule', type: "JSONB DEFAULT '{}'::jsonb" },
        { col: 'last_login', type: 'TIMESTAMPTZ' },
        { col: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
        { col: 'locked_until', type: 'TIMESTAMPTZ' },
        { col: 'password_reset_token', type: 'VARCHAR(255)' },
        { col: 'password_reset_expires', type: 'TIMESTAMPTZ' },
        { col: 'two_factor_enabled', type: 'BOOLEAN DEFAULT false' },
        { col: 'two_factor_secret', type: 'VARCHAR(255)' },
        { col: 'permissions', type: "JSONB DEFAULT '{}'::jsonb" },
        { col: 'settings', type: "JSONB DEFAULT '{}'::jsonb" },
        { col: 'has_fingerprint', type: 'BOOLEAN DEFAULT false' },
        { col: 'has_facial_data', type: 'BOOLEAN DEFAULT false' },
        { col: 'biometric_last_updated', type: 'TIMESTAMPTZ' },
        { col: 'gps_enabled', type: 'BOOLEAN DEFAULT false' },
        { col: 'allowed_locations', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'concurrent_sessions', type: 'INTEGER DEFAULT 1' },
        { col: 'last_activity', type: 'TIMESTAMPTZ' },
        { col: 'display_name', type: 'VARCHAR(200)' },
        { col: 'vendor_code', type: 'VARCHAR(50)' },
        { col: 'version', type: 'INTEGER DEFAULT 1' },
        { col: 'biometric_enrolled', type: 'BOOLEAN DEFAULT false' },
        { col: 'biometric_templates_count', type: 'INTEGER DEFAULT 0' },
        { col: 'last_biometric_scan', type: 'TIMESTAMP' },
        { col: 'biometric_quality_avg', type: 'DECIMAL(5,2)' },
        { col: 'ai_analysis_enabled', type: 'BOOLEAN DEFAULT true' },
        { col: 'fatigue_monitoring', type: 'BOOLEAN DEFAULT false' },
        { col: 'emotion_monitoring', type: 'BOOLEAN DEFAULT false' },
        { col: 'biometric_notes', type: 'TEXT' },
        { col: 'can_authorize_late_arrivals', type: 'BOOLEAN DEFAULT false' },
        { col: 'authorized_departments', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'notification_preference_late_arrivals', type: "VARCHAR(50) DEFAULT 'email'" },
        { col: 'can_use_mobile_app', type: 'BOOLEAN DEFAULT true' },
        { col: 'can_use_kiosk', type: 'BOOLEAN DEFAULT true' },
        { col: 'can_use_all_kiosks', type: 'BOOLEAN DEFAULT false' },
        { col: 'authorized_kiosks', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'has_flexible_schedule', type: 'BOOLEAN DEFAULT false' },
        { col: 'flexible_schedule_notes', type: 'TEXT' },
        { col: 'legajo', type: 'VARCHAR(50)' },
        { col: '"isActive"', type: 'BOOLEAN DEFAULT true' },
        { col: 'biometric_photo_url', type: 'TEXT' },
        { col: 'biometric_photo_date', type: 'TIMESTAMP' },
        { col: 'biometric_photo_expiration', type: 'TIMESTAMP' },
        { col: 'email_verified', type: 'BOOLEAN DEFAULT true' },
        { col: 'email_verified_at', type: 'TIMESTAMP' },
        { col: 'pending_consents', type: 'TEXT[]' },
        { col: 'verification_pending', type: 'BOOLEAN DEFAULT false' },
        { col: 'account_status', type: "VARCHAR(50) DEFAULT 'active'" },
        { col: 'secondary_phone', type: 'VARCHAR(50)' },
        { col: 'home_phone', type: 'VARCHAR(50)' },
        { col: 'city', type: 'VARCHAR(100)' },
        { col: 'province', type: 'VARCHAR(100)' },
        { col: 'postal_code', type: 'VARCHAR(20)' },
        { col: 'neighborhood', type: 'VARCHAR(100)' },
        { col: 'street', type: 'VARCHAR(200)' },
        { col: 'street_number', type: 'VARCHAR(20)' },
        { col: 'floor_apt', type: 'VARCHAR(50)' },
        { col: 'health_insurance_provider', type: 'VARCHAR(100)' },
        { col: 'health_insurance_plan', type: 'VARCHAR(100)' },
        { col: 'health_insurance_number', type: 'VARCHAR(50)' },
        { col: 'health_insurance_expiry', type: 'DATE' },
        { col: 'branch_id', type: 'UUID' },
        { col: 'additional_roles', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'branch_scope', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'is_core_user', type: 'BOOLEAN DEFAULT false' },
        { col: 'force_password_change', type: 'BOOLEAN DEFAULT false' },
        { col: 'password_changed_at', type: 'TIMESTAMP' },
        { col: 'core_user_created_at', type: 'TIMESTAMP' },
        { col: 'onboarding_trace_id', type: 'VARCHAR(100)' },
        { col: 'sector_id', type: 'INTEGER' },
        { col: 'salary_category_id', type: 'INTEGER' },
        { col: 'organizational_position_id', type: 'INTEGER' },
        { col: 'deleted_at', type: 'TIMESTAMP' }
    ];

    for (const { col, type } of ALL_COLUMNS) {
        try {
            await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            fixes.push(`${col} OK`);
        } catch (error) {
            errors.push(`${col}: ${error.message.substring(0, 40)}`);
        }
    }

    // Sincronizar datos
    try {
        await sequelize.query(`
            UPDATE users SET
                email_verified = COALESCE(email_verified, true),
                account_status = COALESCE(account_status, 'active'),
                "isActive" = COALESCE("isActive", is_active, true)
        `);
        fixes.push('SYNC OK');
    } catch (e) {
        errors.push('sync: ' + e.message.substring(0, 40));
    }

    // Contar columnas
    const [cols] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM information_schema.columns
        WHERE table_name = 'users' AND table_schema = 'public'
    `);

    res.json({
        success: true,
        total_columns: cols[0].cnt,
        added: fixes.length,
        errors_count: errors.length,
        errors: errors.length > 0 ? errors : 'ninguno'
    });
});

// GET /api/seed-demo/fix-users?key=SECRET - Agregar columnas necesarias para login
router.get('/fix-users', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const fixes = [];
    const errors = [];

    // Columnas que el login espera y podrían faltar
    const columnsToAdd = [
        { col: 'email_verified', type: 'BOOLEAN DEFAULT true' },
        { col: 'account_status', type: "VARCHAR(50) DEFAULT 'active'" },
        { col: 'verification_pending', type: 'BOOLEAN DEFAULT false' },
        { col: 'usuario', type: 'VARCHAR(100)' },
        { col: 'dni', type: 'VARCHAR(20)' },
        { col: 'user_id', type: 'INTEGER' },
        { col: 'company_id', type: 'INTEGER' }
    ];

    for (const { col, type } of columnsToAdd) {
        try {
            await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            fixes.push(`users: added ${col}`);
        } catch (error) {
            if (error.message.includes('already exists')) {
                fixes.push(`users: ${col} already exists`);
            } else {
                errors.push(`users.${col}: ${error.message}`);
            }
        }
    }

    // También actualizar user_id para que sea igual a id si es null
    try {
        await sequelize.query(`UPDATE users SET user_id = id WHERE user_id IS NULL`);
        fixes.push('users: user_id synced with id');
    } catch (error) {
        errors.push(`sync user_id: ${error.message}`);
    }

    // Actualizar email_verified = true para usuarios existentes
    try {
        await sequelize.query(`UPDATE users SET email_verified = true WHERE email_verified IS NULL`);
        fixes.push('users: email_verified set to true');
    } catch (error) {
        errors.push(`set email_verified: ${error.message}`);
    }

    res.json({ success: true, fixes, errors });
});

// GET /api/seed-demo/fix-all-tables?key=SECRET - Agregar TODAS las columnas faltantes a TODAS las tablas clave
router.get('/fix-all-tables', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const results = { tables: {}, errors: [] };

    // DEPARTMENTS - TODAS las columnas de LOCAL (16 total)
    const DEPT_COLUMNS = [
        { col: 'name', type: 'VARCHAR(255)' },
        { col: 'description', type: 'TEXT' },
        { col: 'address', type: 'VARCHAR(255)' },
        { col: 'gps_lat', type: 'DECIMAL(10,8)' },
        { col: 'gps_lng', type: 'DECIMAL(11,8)' },
        { col: 'coverage_radius', type: 'INTEGER DEFAULT 100' },
        { col: 'is_active', type: 'BOOLEAN DEFAULT true' },
        { col: 'deleted_at', type: 'TIMESTAMPTZ' },
        { col: 'company_id', type: 'INTEGER' },
        { col: 'branch_id', type: 'UUID' },
        { col: 'default_kiosk_id', type: 'INTEGER' },
        { col: 'authorized_kiosks', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'allow_gps_attendance', type: 'BOOLEAN DEFAULT false' }
    ];

    // BRANCHES - columnas adicionales
    const BRANCH_COLUMNS = [
        { col: 'gps_lat', type: 'DECIMAL(10,8)' },
        { col: 'gps_lng', type: 'DECIMAL(11,8)' },
        { col: 'gps_radius', type: 'INTEGER DEFAULT 100' },
        { col: 'geofence_enabled', type: 'BOOLEAN DEFAULT false' },
        { col: 'is_main', type: 'BOOLEAN DEFAULT false' },
        { col: 'timezone', type: 'VARCHAR(50)' },
        { col: 'working_days', type: "JSONB DEFAULT '[]'::jsonb" }
    ];

    // ATTENDANCE - columnas adicionales
    const ATTENDANCE_COLUMNS = [
        { col: 'gps_lat', type: 'DECIMAL(10,8)' },
        { col: 'gps_lng', type: 'DECIMAL(11,8)' },
        { col: 'gps_accuracy', type: 'DECIMAL(10,2)' },
        { col: 'device_id', type: 'VARCHAR(255)' },
        { col: 'device_info', type: 'TEXT' },
        { col: 'verification_method', type: 'VARCHAR(50)' },
        { col: 'branch_id', type: 'INTEGER' },
        { col: 'kiosk_id', type: 'INTEGER' },
        { col: 'work_schedule', type: "JSONB DEFAULT '{}'::jsonb" },
        { col: 'notes', type: 'TEXT' },
        { col: 'status', type: "VARCHAR(50) DEFAULT 'present'" },
        { col: 'is_late', type: 'BOOLEAN DEFAULT false' },
        { col: 'late_minutes', type: 'INTEGER DEFAULT 0' },
        { col: 'is_early_departure', type: 'BOOLEAN DEFAULT false' },
        { col: 'early_departure_minutes', type: 'INTEGER DEFAULT 0' },
        { col: 'overtime_minutes', type: 'INTEGER DEFAULT 0' },
        { col: 'worked_hours', type: 'DECIMAL(5,2)' }
    ];

    // SHIFTS - columnas adicionales
    const SHIFT_COLUMNS = [
        { col: 'tolerance_late_minutes', type: 'INTEGER DEFAULT 15' },
        { col: 'tolerance_early_minutes', type: 'INTEGER DEFAULT 15' },
        { col: 'break_duration_minutes', type: 'INTEGER DEFAULT 60' },
        { col: 'is_flexible', type: 'BOOLEAN DEFAULT false' },
        { col: 'min_hours', type: 'DECIMAL(4,2)' },
        { col: 'max_hours', type: 'DECIMAL(4,2)' },
        { col: 'applies_to', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'is_active', type: 'BOOLEAN DEFAULT true' }
    ];

    // KIOSKS - columnas adicionales
    const KIOSK_COLUMNS = [
        { col: 'gps_lat', type: 'DECIMAL(10,8)' },
        { col: 'gps_lng', type: 'DECIMAL(11,8)' },
        { col: 'gps_radius', type: 'INTEGER DEFAULT 50' },
        { col: 'device_token', type: 'VARCHAR(255)' },
        { col: 'last_heartbeat', type: 'TIMESTAMP' },
        { col: 'is_online', type: 'BOOLEAN DEFAULT false' },
        { col: 'version', type: 'VARCHAR(50)' },
        { col: 'settings', type: "JSONB DEFAULT '{}'::jsonb" }
    ];

    // SYSTEM_MODULES - TODAS las 24 columnas de LOCAL (copia exacta)
    const SYSTEM_MODULE_COLUMNS = [
        { col: 'module_key', type: 'VARCHAR(255)' },
        { col: 'name', type: 'VARCHAR(255)' },
        { col: 'description', type: 'TEXT' },
        { col: 'icon', type: 'VARCHAR(255)' },
        { col: 'color', type: 'VARCHAR(255)' },
        { col: 'category', type: "JSONB DEFAULT 'core'" },
        { col: 'base_price', type: 'DECIMAL(10,2) DEFAULT 0' },
        { col: 'is_active', type: 'BOOLEAN DEFAULT true' },
        { col: 'is_core', type: 'BOOLEAN DEFAULT false' },
        { col: 'display_order', type: 'INTEGER DEFAULT 0' },
        { col: 'features', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'requirements', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'version', type: "VARCHAR(255) DEFAULT '1.0.0'" },
        { col: 'min_employees', type: 'INTEGER' },
        { col: 'max_employees', type: 'INTEGER' },
        { col: 'rubro', type: "VARCHAR(255) DEFAULT 'General'" },
        { col: 'bundled_modules', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'available_in', type: "VARCHAR(255) DEFAULT 'both'" },
        { col: 'provides_to', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'integrates_with', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'metadata', type: "JSONB DEFAULT '{}'::jsonb" }
    ];

    // COMPANY_MODULES - columnas para módulos por empresa
    const COMPANY_MODULE_COLUMNS = [
        { col: 'is_active', type: 'BOOLEAN DEFAULT true' },
        { col: 'contracted_at', type: 'TIMESTAMP' },
        { col: 'expires_at', type: 'TIMESTAMP' },
        { col: 'config', type: "JSONB DEFAULT '{}'::jsonb" }
    ];

    // NOTIFICATION_GROUPS - columnas del inbox
    const NOTIF_GROUP_COLUMNS = [
        { col: 'group_type', type: "VARCHAR(50) DEFAULT 'general'" },
        { col: 'initiator_type', type: 'VARCHAR(50)' },
        { col: 'initiator_id', type: 'INTEGER' },
        { col: 'subject', type: 'VARCHAR(500)' },
        { col: 'status', type: "VARCHAR(50) DEFAULT 'open'" },
        { col: 'priority', type: "VARCHAR(50) DEFAULT 'normal'" },
        { col: 'closed_at', type: 'TIMESTAMP' },
        { col: 'closed_by', type: 'INTEGER' },
        { col: 'metadata', type: "JSONB DEFAULT '{}'::jsonb" }
    ];

    // NOTIFICATION_MESSAGES - columnas del inbox
    const NOTIF_MSG_COLUMNS = [
        { col: 'parent_message_id', type: 'UUID' },
        { col: 'read_at', type: 'TIMESTAMP' },
        { col: 'archived_at', type: 'TIMESTAMP' },
        { col: 'action_required', type: 'BOOLEAN DEFAULT false' },
        { col: 'action_type', type: 'VARCHAR(100)' },
        { col: 'action_data', type: "JSONB DEFAULT '{}'::jsonb" }
    ];

    const ALL_TABLES = [
        { name: 'departments', columns: DEPT_COLUMNS },
        { name: 'branches', columns: BRANCH_COLUMNS },
        { name: 'attendance', columns: ATTENDANCE_COLUMNS },
        { name: 'shifts', columns: SHIFT_COLUMNS },
        { name: 'kiosks', columns: KIOSK_COLUMNS },
        { name: 'system_modules', columns: SYSTEM_MODULE_COLUMNS },
        { name: 'company_modules', columns: COMPANY_MODULE_COLUMNS },
        { name: 'notification_groups', columns: NOTIF_GROUP_COLUMNS },
        { name: 'notification_messages', columns: NOTIF_MSG_COLUMNS }
    ];

    for (const { name, columns } of ALL_TABLES) {
        results.tables[name] = { added: 0, skipped: 0, errors: [] };
        for (const { col, type } of columns) {
            try {
                await sequelize.query(`ALTER TABLE ${name} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
                results.tables[name].added++;
            } catch (e) {
                if (e.message.includes('already exists')) {
                    results.tables[name].skipped++;
                } else {
                    results.tables[name].errors.push(`${col}: ${e.message.substring(0, 50)}`);
                }
            }
        }
    }

    res.json({ success: true, results });
});

// GET /api/seed-demo/create-missing-tables?key=SECRET - Crear tablas faltantes para módulos
router.get('/create-missing-tables', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const results = [];
    const errors = [];

    // 1. NOTIFICATION_GROUPS - Base para el sistema de notificaciones
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notification_groups (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                company_id INTEGER,
                created_by INTEGER,
                is_active BOOLEAN DEFAULT true,
                requires_sla BOOLEAN DEFAULT true,
                default_sla_hours INTEGER DEFAULT 24,
                auto_escalate BOOLEAN DEFAULT true,
                escalation_chain JSONB DEFAULT '["supervisor", "rrhh", "gerencia"]'::jsonb,
                total_escalations INTEGER DEFAULT 0,
                last_activity_at TIMESTAMP,
                ai_last_analyzed_at TIMESTAMP,
                ai_resolution_status VARCHAR(50) DEFAULT 'unknown',
                ai_detected_topic VARCHAR(100),
                ai_summary TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        results.push('notification_groups: created');
    } catch (e) {
        if (!e.message.includes('already exists')) {
            errors.push(`notification_groups: ${e.message.substring(0, 80)}`);
        } else {
            results.push('notification_groups: already exists');
        }
    }

    // 2. NOTIFICATION_MESSAGES - Mensajes del inbox
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notification_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id UUID REFERENCES notification_groups(id) ON DELETE CASCADE,
                sender_id INTEGER,
                recipient_id INTEGER,
                company_id INTEGER,
                subject VARCHAR(500),
                content TEXT,
                priority VARCHAR(50) DEFAULT 'normal',
                status VARCHAR(50) DEFAULT 'unread',
                type VARCHAR(100) DEFAULT 'general',
                module_source VARCHAR(100),
                requires_response BOOLEAN DEFAULT false,
                deadline_at TIMESTAMP,
                responded_at TIMESTAMP,
                escalation_status VARCHAR(50) DEFAULT 'none',
                escalation_level INTEGER DEFAULT 0,
                is_deleted BOOLEAN DEFAULT false,
                metadata JSONB DEFAULT '{}'::jsonb,
                ai_analyzed BOOLEAN DEFAULT false,
                ai_auto_generated BOOLEAN DEFAULT false,
                ai_confidence DECIMAL(5,4),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        results.push('notification_messages: created');
    } catch (e) {
        if (!e.message.includes('already exists')) {
            errors.push(`notification_messages: ${e.message.substring(0, 80)}`);
        } else {
            results.push('notification_messages: already exists');
        }
    }

    // 3. JOB_POSTINGS - Búsquedas laborales
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS job_postings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id INTEGER,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                requirements TEXT,
                department_id INTEGER,
                branch_id UUID,
                location VARCHAR(255),
                employment_type VARCHAR(50) DEFAULT 'full_time',
                salary_min DECIMAL(12,2),
                salary_max DECIMAL(12,2),
                salary_currency VARCHAR(10) DEFAULT 'ARS',
                status VARCHAR(50) DEFAULT 'draft',
                is_active BOOLEAN DEFAULT true,
                published_at TIMESTAMP,
                expires_at TIMESTAMP,
                positions_available INTEGER DEFAULT 1,
                positions_filled INTEGER DEFAULT 0,
                created_by INTEGER,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        results.push('job_postings: created');
    } catch (e) {
        if (!e.message.includes('already exists')) {
            errors.push(`job_postings: ${e.message.substring(0, 80)}`);
        } else {
            results.push('job_postings: already exists');
        }
    }

    // 4. JOB_APPLICATIONS - Postulaciones
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS job_applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
                company_id INTEGER,
                applicant_name VARCHAR(255),
                applicant_email VARCHAR(255),
                applicant_phone VARCHAR(50),
                applicant_dni VARCHAR(20),
                resume_url TEXT,
                cover_letter TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                stage VARCHAR(50) DEFAULT 'received',
                score INTEGER,
                notes TEXT,
                interview_date TIMESTAMP,
                reviewed_by INTEGER,
                reviewed_at TIMESTAMP,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        results.push('job_applications: created');
    } catch (e) {
        if (!e.message.includes('already exists')) {
            errors.push(`job_applications: ${e.message.substring(0, 80)}`);
        } else {
            results.push('job_applications: already exists');
        }
    }

    // 5. Índices básicos
    try {
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notif_messages_recipient ON notification_messages(recipient_id)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notif_messages_company ON notification_messages(company_id)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_job_postings_company ON job_postings(company_id)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_job_applications_posting ON job_applications(job_posting_id)`);
        results.push('indexes: created');
    } catch (e) {
        errors.push(`indexes: ${e.message.substring(0, 50)}`);
    }

    res.json({ success: true, results, errors: errors.length > 0 ? errors : 'none' });
});

// GET /api/seed-demo/fix-notification-types?key=SECRET - Cambiar INTEGER a VARCHAR para employeeId
router.get('/fix-notification-types', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const results = [];
    const errors = [];

    // FORZAR cambio de tipo INTEGER -> VARCHAR para columnas de ID
    // Estas columnas usan employeeId (string "EMP-001") pero fueron creadas como INTEGER
    const forceTypeChanges = [
        { table: 'notification_messages', column: 'sender_id', newType: 'VARCHAR(100)' },
        { table: 'notification_messages', column: 'recipient_id', newType: 'VARCHAR(100)' },
        { table: 'notification_groups', column: 'initiator_id', newType: 'VARCHAR(100)' },
        { table: 'notification_groups', column: 'created_by', newType: 'VARCHAR(100)' }
    ];

    for (const { table, column, newType } of forceTypeChanges) {
        try {
            // Primero eliminar cualquier default
            await sequelize.query(`ALTER TABLE ${table} ALTER COLUMN ${column} DROP DEFAULT`).catch(() => {});
            // Forzar cambio de tipo usando CAST
            await sequelize.query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE ${newType} USING ${column}::TEXT`);
            results.push(`${table}.${column}: CHANGED to ${newType}`);
        } catch (e) {
            if (e.message.includes('does not exist')) {
                // La columna no existe, agregarla
                try {
                    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${newType}`);
                    results.push(`${table}.${column}: ADDED as ${newType}`);
                } catch (e2) {
                    errors.push(`${table}.${column}: ${e2.message.substring(0, 60)}`);
                }
            } else {
                errors.push(`${table}.${column}: ${e.message.substring(0, 60)}`);
            }
        }
    }

    // Agregar columnas adicionales que faltan
    const additionalColumns = [
        { table: 'notification_messages', column: 'sender_name', type: 'VARCHAR(255)' },
        { table: 'notification_messages', column: 'recipient_name', type: 'VARCHAR(255)' },
        { table: 'notification_messages', column: 'sender_type', type: 'VARCHAR(100)' },
        { table: 'notification_messages', column: 'recipient_type', type: 'VARCHAR(100)' },
        { table: 'notification_messages', column: 'message_type', type: 'VARCHAR(100)' },
        { table: 'notification_messages', column: 'sequence_number', type: 'INTEGER DEFAULT 1' },
        { table: 'notification_messages', column: 'read_at', type: 'TIMESTAMP' },
        { table: 'notification_messages', column: 'delivered_at', type: 'TIMESTAMP' },
        { table: 'notification_messages', column: 'channels', type: "JSONB DEFAULT '[\"web\"]'::jsonb" },
        { table: 'notification_messages', column: 'attachments', type: 'JSONB' },
        { table: 'notification_messages', column: 'message_hash', type: 'VARCHAR(255)' },
        { table: 'notification_groups', column: 'initiator_type', type: 'VARCHAR(100)' },
        { table: 'notification_groups', column: 'subject', type: 'VARCHAR(500)' },
        { table: 'notification_groups', column: 'status', type: "VARCHAR(50) DEFAULT 'open'" },
        { table: 'notification_groups', column: 'priority', type: "VARCHAR(50) DEFAULT 'normal'" },
        { table: 'notification_groups', column: 'group_type', type: "VARCHAR(50) DEFAULT 'general'" },
        { table: 'notification_groups', column: 'closed_at', type: 'TIMESTAMP' },
        { table: 'notification_groups', column: 'closed_by', type: 'VARCHAR(100)' },
        { table: 'notification_groups', column: 'metadata', type: "JSONB DEFAULT '{}'::jsonb" }
    ];

    for (const { table, column, type } of additionalColumns) {
        try {
            await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
            results.push(`${table}.${column}: ok`);
        } catch (e) {
            errors.push(`${table}.${column}: ${e.message.substring(0, 40)}`);
        }
    }

    // Crear tabla notification_audit_log si no existe
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS notification_audit_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id UUID,
                message_id UUID,
                action VARCHAR(100),
                actor_type VARCHAR(100),
                actor_id VARCHAR(100),
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        results.push('notification_audit_log: ok');
    } catch (e) {
        if (!e.message.includes('already exists')) {
            errors.push(`notification_audit_log: ${e.message.substring(0, 50)}`);
        }
    }

    res.json({
        success: true,
        message: 'Tipos de columnas FORZADOS a VARCHAR para soportar employeeId (string)',
        results,
        errors: errors.length > 0 ? errors : 'none'
    });
});

// GET /api/seed-demo/fix-job-tables?key=SECRET - Agregar columnas faltantes a job_postings y job_applications
router.get('/fix-job-tables', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const results = [];
    const errors = [];

    // Columnas para JOB_POSTINGS según el modelo
    const jobPostingColumns = [
        { col: 'company_id', type: 'INTEGER' },
        { col: 'title', type: 'VARCHAR(255)' },
        { col: 'description', type: 'TEXT' },
        { col: 'requirements', type: 'TEXT' },
        { col: 'responsibilities', type: 'TEXT' },
        { col: 'department_id', type: 'INTEGER' },
        { col: 'department_name', type: 'VARCHAR(100)' },
        { col: 'location', type: 'VARCHAR(255)' },
        { col: 'job_type', type: "VARCHAR(50) DEFAULT 'full-time'" },
        { col: 'salary_min', type: 'DECIMAL(12,2)' },
        { col: 'salary_max', type: 'DECIMAL(12,2)' },
        { col: 'salary_currency', type: "VARCHAR(3) DEFAULT 'ARS'" },
        { col: 'salary_period', type: "VARCHAR(20) DEFAULT 'monthly'" },
        { col: 'benefits', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'status', type: "VARCHAR(30) DEFAULT 'draft'" },
        { col: 'is_public', type: 'BOOLEAN DEFAULT true' },
        { col: 'is_internal', type: 'BOOLEAN DEFAULT false' },
        { col: 'max_applications', type: 'INTEGER' },
        { col: 'auto_close_date', type: 'DATE' },
        { col: 'requires_cv', type: 'BOOLEAN DEFAULT true' },
        { col: 'requires_cover_letter', type: 'BOOLEAN DEFAULT false' },
        { col: 'tags', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'skills_required', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'hiring_manager_id', type: 'VARCHAR(100)' },
        { col: 'recruiter_id', type: 'VARCHAR(100)' },
        { col: 'views_count', type: 'INTEGER DEFAULT 0' },
        { col: 'applications_count', type: 'INTEGER DEFAULT 0' },
        { col: 'posted_at', type: 'TIMESTAMP' },
        { col: 'closed_at', type: 'TIMESTAMP' },
        { col: 'created_by', type: 'VARCHAR(100)' },
        { col: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
        { col: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' }
    ];

    // Columnas para JOB_APPLICATIONS según el modelo
    const jobApplicationColumns = [
        { col: 'company_id', type: 'INTEGER' },
        { col: 'job_posting_id', type: 'INTEGER' },
        { col: 'candidate_first_name', type: 'VARCHAR(100)' },
        { col: 'candidate_last_name', type: 'VARCHAR(100)' },
        { col: 'candidate_email', type: 'VARCHAR(255)' },
        { col: 'candidate_phone', type: 'VARCHAR(50)' },
        { col: 'candidate_dni', type: 'VARCHAR(20)' },
        { col: 'candidate_birth_date', type: 'DATE' },
        { col: 'candidate_gender', type: 'VARCHAR(20)' },
        { col: 'candidate_nationality', type: 'VARCHAR(100)' },
        { col: 'candidate_address', type: 'TEXT' },
        { col: 'candidate_city', type: 'VARCHAR(100)' },
        { col: 'candidate_province', type: 'VARCHAR(100)' },
        { col: 'candidate_postal_code', type: 'VARCHAR(20)' },
        { col: 'experience_years', type: 'INTEGER' },
        { col: 'current_position', type: 'VARCHAR(255)' },
        { col: 'current_company', type: 'VARCHAR(255)' },
        { col: 'education_level', type: 'VARCHAR(50)' },
        { col: 'education_title', type: 'VARCHAR(255)' },
        { col: 'skills', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'languages', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'certifications', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'cv_file_path', type: 'VARCHAR(500)' },
        { col: 'cv_file_name', type: 'VARCHAR(255)' },
        { col: 'cv_uploaded_at', type: 'TIMESTAMP' },
        { col: 'cover_letter', type: 'TEXT' },
        { col: 'additional_documents', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'salary_expectation', type: 'DECIMAL(12,2)' },
        { col: 'availability', type: 'VARCHAR(50)' },
        { col: 'preferred_schedule', type: 'VARCHAR(100)' },
        { col: 'willing_to_relocate', type: 'BOOLEAN DEFAULT false' },
        { col: 'status', type: "VARCHAR(50) DEFAULT 'nuevo'" },
        { col: 'status_history', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'reviewed_by', type: 'VARCHAR(100)' },
        { col: 'reviewed_at', type: 'TIMESTAMP' },
        { col: 'review_notes', type: 'TEXT' },
        { col: 'review_score', type: 'INTEGER' },
        { col: 'interview_scheduled_at', type: 'TIMESTAMP' },
        { col: 'interview_location', type: 'VARCHAR(255)' },
        { col: 'interview_type', type: 'VARCHAR(50)' },
        { col: 'interview_notes', type: 'TEXT' },
        { col: 'interview_score', type: 'INTEGER' },
        { col: 'interviewer_id', type: 'VARCHAR(100)' },
        { col: 'admin_approved_by', type: 'VARCHAR(100)' },
        { col: 'admin_approved_at', type: 'TIMESTAMP' },
        { col: 'admin_approval_notes', type: 'TEXT' },
        { col: 'medical_record_id', type: 'INTEGER' },
        { col: 'medical_exam_date', type: 'DATE' },
        { col: 'medical_result', type: 'VARCHAR(50)' },
        { col: 'medical_observations', type: 'TEXT' },
        { col: 'medical_restrictions', type: "JSONB DEFAULT '[]'::jsonb" },
        { col: 'medical_approved_by', type: 'VARCHAR(100)' },
        { col: 'medical_approved_at', type: 'TIMESTAMP' },
        { col: 'hired_at', type: 'TIMESTAMP' },
        { col: 'hired_by', type: 'VARCHAR(100)' },
        { col: 'employee_user_id', type: 'VARCHAR(100)' },
        { col: 'start_date', type: 'DATE' },
        { col: 'assigned_department_id', type: 'INTEGER' },
        { col: 'assigned_position', type: 'VARCHAR(255)' },
        { col: 'final_salary', type: 'DECIMAL(12,2)' },
        { col: 'contract_type', type: 'VARCHAR(50)' },
        { col: 'rejected_at', type: 'TIMESTAMP' },
        { col: 'rejected_by', type: 'VARCHAR(100)' },
        { col: 'rejection_reason', type: 'VARCHAR(255)' },
        { col: 'rejection_notes', type: 'TEXT' },
        { col: 'rejection_stage', type: 'VARCHAR(50)' },
        { col: 'notification_sent_to_medical', type: 'BOOLEAN DEFAULT false' },
        { col: 'notification_sent_at', type: 'TIMESTAMP' },
        { col: 'notification_id', type: 'INTEGER' },
        { col: 'source', type: 'VARCHAR(100)' },
        { col: 'referrer_employee_id', type: 'VARCHAR(100)' },
        { col: 'ip_address', type: 'VARCHAR(45)' },
        { col: 'user_agent', type: 'TEXT' },
        { col: 'applied_at', type: 'TIMESTAMP DEFAULT NOW()' },
        { col: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
        { col: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' }
    ];

    // Agregar columnas a job_postings
    for (const { col, type } of jobPostingColumns) {
        try {
            await sequelize.query(`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            results.push(`job_postings.${col}: ok`);
        } catch (e) {
            errors.push(`job_postings.${col}: ${e.message.substring(0, 50)}`);
        }
    }

    // Agregar columnas a job_applications
    for (const { col, type } of jobApplicationColumns) {
        try {
            await sequelize.query(`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            results.push(`job_applications.${col}: ok`);
        } catch (e) {
            errors.push(`job_applications.${col}: ${e.message.substring(0, 50)}`);
        }
    }

    // Crear tabla si id no existe (ALTER falla si la tabla no existe)
    try {
        const [check] = await sequelize.query(`SELECT COUNT(*) as cnt FROM job_postings`);
        results.push(`job_postings: table exists (${check[0].cnt} rows)`);
    } catch (e) {
        // La tabla no existe, crearla
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS job_postings (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER,
                    title VARCHAR(255),
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);
            results.push('job_postings: table CREATED');
        } catch (e2) {
            errors.push(`job_postings create: ${e2.message.substring(0, 50)}`);
        }
    }

    res.json({
        success: true,
        message: 'Tablas job_postings y job_applications actualizadas',
        job_postings_cols: jobPostingColumns.length,
        job_applications_cols: jobApplicationColumns.length,
        results: results.slice(0, 20), // Limitar output
        total_results: results.length,
        errors: errors.length > 0 ? errors : 'none'
    });
});

// GET /api/seed-demo/recreate-job-tables?key=SECRET - Recrear tablas con esquema correcto (INTEGER ids)
router.get('/recreate-job-tables', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const results = [];
    const errors = [];

    try {
        // 1. Eliminar tablas existentes (job_applications primero por FK)
        await sequelize.query(`DROP TABLE IF EXISTS job_applications CASCADE`);
        results.push('job_applications: DROPPED');

        await sequelize.query(`DROP TABLE IF EXISTS job_postings CASCADE`);
        results.push('job_postings: DROPPED');

        // 2. Crear job_postings con ID INTEGER (SERIAL)
        await sequelize.query(`
            CREATE TABLE job_postings (
                id SERIAL PRIMARY KEY,
                company_id INTEGER,
                title VARCHAR(255),
                description TEXT,
                requirements TEXT,
                responsibilities TEXT,
                department_id INTEGER,
                department_name VARCHAR(100),
                location VARCHAR(255),
                job_type VARCHAR(50) DEFAULT 'full-time',
                salary_min DECIMAL(12,2),
                salary_max DECIMAL(12,2),
                salary_currency VARCHAR(3) DEFAULT 'ARS',
                salary_period VARCHAR(20) DEFAULT 'monthly',
                benefits JSONB DEFAULT '[]'::jsonb,
                status VARCHAR(30) DEFAULT 'draft',
                is_public BOOLEAN DEFAULT true,
                is_internal BOOLEAN DEFAULT false,
                max_applications INTEGER,
                auto_close_date DATE,
                requires_cv BOOLEAN DEFAULT true,
                requires_cover_letter BOOLEAN DEFAULT false,
                tags JSONB DEFAULT '[]'::jsonb,
                skills_required JSONB DEFAULT '[]'::jsonb,
                hiring_manager_id UUID,
                recruiter_id UUID,
                views_count INTEGER DEFAULT 0,
                applications_count INTEGER DEFAULT 0,
                posted_at TIMESTAMP,
                closed_at TIMESTAMP,
                created_by UUID,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        results.push('job_postings: CREATED with INTEGER id');

        // 3. Crear job_applications con job_posting_id INTEGER
        await sequelize.query(`
            CREATE TABLE job_applications (
                id SERIAL PRIMARY KEY,
                company_id INTEGER,
                job_posting_id INTEGER REFERENCES job_postings(id) ON DELETE CASCADE,
                candidate_first_name VARCHAR(100),
                candidate_last_name VARCHAR(100),
                candidate_email VARCHAR(255),
                candidate_phone VARCHAR(50),
                candidate_dni VARCHAR(20),
                candidate_birth_date DATE,
                candidate_gender VARCHAR(20),
                candidate_nationality VARCHAR(100),
                candidate_address TEXT,
                candidate_city VARCHAR(100),
                candidate_province VARCHAR(100),
                candidate_postal_code VARCHAR(20),
                experience_years INTEGER,
                current_position VARCHAR(255),
                current_company VARCHAR(255),
                education_level VARCHAR(50),
                education_title VARCHAR(255),
                skills JSONB DEFAULT '[]'::jsonb,
                languages JSONB DEFAULT '[]'::jsonb,
                certifications JSONB DEFAULT '[]'::jsonb,
                cv_file_path VARCHAR(500),
                cv_file_name VARCHAR(255),
                cv_uploaded_at TIMESTAMP,
                cover_letter TEXT,
                additional_documents JSONB DEFAULT '[]'::jsonb,
                salary_expectation DECIMAL(12,2),
                availability VARCHAR(50),
                preferred_schedule VARCHAR(100),
                willing_to_relocate BOOLEAN DEFAULT false,
                status VARCHAR(50) DEFAULT 'nuevo',
                status_history JSONB DEFAULT '[]'::jsonb,
                reviewed_by UUID,
                reviewed_at TIMESTAMP,
                review_notes TEXT,
                review_score INTEGER,
                interview_scheduled_at TIMESTAMP,
                interview_location VARCHAR(255),
                interview_type VARCHAR(50),
                interview_notes TEXT,
                interview_score INTEGER,
                interviewer_id UUID,
                admin_approved_by UUID,
                admin_approved_at TIMESTAMP,
                admin_approval_notes TEXT,
                medical_record_id INTEGER,
                medical_exam_date DATE,
                medical_result VARCHAR(50),
                medical_observations TEXT,
                medical_restrictions JSONB DEFAULT '[]'::jsonb,
                medical_approved_by UUID,
                medical_approved_at TIMESTAMP,
                hired_at TIMESTAMP,
                hired_by UUID,
                employee_user_id UUID,
                start_date DATE,
                assigned_department_id INTEGER,
                assigned_position VARCHAR(255),
                final_salary DECIMAL(12,2),
                contract_type VARCHAR(50),
                rejected_at TIMESTAMP,
                rejected_by UUID,
                rejection_reason VARCHAR(255),
                rejection_notes TEXT,
                rejection_stage VARCHAR(50),
                notification_sent_to_medical BOOLEAN DEFAULT false,
                notification_sent_at TIMESTAMP,
                notification_id INTEGER,
                source VARCHAR(100),
                referrer_employee_id UUID,
                ip_address VARCHAR(45),
                user_agent TEXT,
                applied_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        results.push('job_applications: CREATED with INTEGER job_posting_id');

        // 4. Crear índices
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_job_postings_company ON job_postings(company_id)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_job_applications_posting ON job_applications(job_posting_id)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_job_applications_company ON job_applications(company_id)`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status)`);
        results.push('indexes: CREATED');

        res.json({
            success: true,
            message: 'Tablas job_postings y job_applications recreadas con INTEGER ids',
            results,
            errors: errors.length > 0 ? errors : 'none'
        });

    } catch (e) {
        errors.push(e.message);
        res.status(500).json({
            success: false,
            message: 'Error recreando tablas',
            results,
            errors
        });
    }
});

// GET /api/seed-demo/create-admin?key=SECRET - Crear usuario admin para DEMO
router.get('/create-admin', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    try {
        // Verificar que existe la empresa DEMO
        const [company] = await sequelize.query(
            "SELECT company_id, id FROM companies WHERE slug = 'demo-corp' LIMIT 1",
            { type: sequelize.QueryTypes.SELECT }
        );

        if (!company) {
            // Crear empresa DEMO primero
            await sequelize.query(`
                INSERT INTO companies (name, slug, legal_name, is_active, active_modules, license_type)
                VALUES ('DEMO', 'demo-corp', 'Demo Corporación S.A.', true, '${JSON.stringify(ISI_MODULES_REAL)}'::jsonb, 'enterprise')
                ON CONFLICT (slug) DO UPDATE SET active_modules = '${JSON.stringify(ISI_MODULES_REAL)}'::jsonb
            `);
        }

        // Obtener company_id
        const [comp] = await sequelize.query(
            "SELECT COALESCE(company_id, id) as cid FROM companies WHERE slug = 'demo-corp' LIMIT 1",
            { type: sequelize.QueryTypes.SELECT }
        );

        const companyId = comp?.cid || 1;

        // Crear usuario admin
        const adminData = {
            email: 'admin@demo.com',
            usuario: 'admin',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'Demo',
            role: 'admin',
            company_id: companyId,
            is_active: true,
            email_verified: true,
            account_status: 'active'
        };

        // Verificar si ya existe
        const [existing] = await sequelize.query(
            `SELECT id FROM users WHERE email = 'admin@demo.com' AND company_id = ${companyId}`,
            { type: sequelize.QueryTypes.SELECT }
        );

        if (existing) {
            // Actualizar
            await sequelize.query(`
                UPDATE users SET
                    password = '${hashedPassword}',
                    role = 'admin',
                    is_active = true,
                    email_verified = true,
                    account_status = 'active'
                WHERE email = 'admin@demo.com' AND company_id = ${companyId}
            `);
            return res.json({ success: true, message: 'Usuario admin actualizado', login: { identifier: 'admin', password: 'admin123', companyId } });
        }

        // Insertar nuevo
        await sequelize.query(`
            INSERT INTO users (email, usuario, password, "firstName", "lastName", role, company_id, is_active, email_verified, account_status)
            VALUES ('admin@demo.com', 'admin', '${hashedPassword}', 'Admin', 'Demo', 'admin', ${companyId}, true, true, 'active')
        `);

        // Sincronizar user_id con id para todos los usuarios
        await sequelize.query(`UPDATE users SET user_id = id::text::uuid WHERE user_id IS NULL`).catch(() => {});
        await sequelize.query(`UPDATE users SET "employeeId" = 'EMP-ADMIN-' || id WHERE "employeeId" IS NULL AND email = 'admin@demo.com'`).catch(() => {});

        res.json({ success: true, message: 'Usuario admin creado', login: { identifier: 'admin', password: 'admin123', companyId } });
    } catch (error) {
        console.error('Error creando admin:', error);
        res.json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/fix-user-ids?key=SECRET - Sincronizar IDs de usuarios
router.get('/fix-user-ids', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    try {
        // Verificar estructura de la tabla
        const [cols] = await sequelize.query(`
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_name = 'users' AND column_name IN ('id', 'user_id', 'employeeId')
        `);

        // Sincronizar user_id y employeeId
        const results = [];

        // Sincronizar user_id con id (funciona tanto para INT como UUID)
        try {
            // Intento 1: user_id = id (para INTEGER)
            await sequelize.query(`UPDATE users SET user_id = id WHERE user_id IS NULL`);
            results.push('user_id: sincronizado con id');
        } catch (e1) {
            try {
                // Intento 2: user_id UUID generado
                await sequelize.query(`UPDATE users SET user_id = gen_random_uuid() WHERE user_id IS NULL`);
                results.push('user_id: UUIDs generados');
            } catch (e2) {
                results.push(`user_id error: ${e2.message.substring(0, 50)}`);
            }
        }

        // Sincronizar employeeId
        try {
            await sequelize.query(`UPDATE users SET "employeeId" = 'EMP-' || LPAD(id::text, 4, '0') WHERE "employeeId" IS NULL`);
            results.push('employeeId: sincronizados');
        } catch (e) {
            results.push(`employeeId error: ${e.message.substring(0, 50)}`);
        }

        // Verificar usuarios sin ID
        const [usersNoId] = await sequelize.query(`
            SELECT id, email, user_id, "employeeId" FROM users WHERE id IS NULL OR user_id IS NULL
        `);

        res.json({ success: true, columns: cols, results, users_without_id: usersNoId });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// GET /api/seed-demo/create-schema?key=SECRET - Crear tablas básicas (método alternativo)
router.get('/create-schema', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
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

    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
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

// POST /api/seed-demo/import-essential?key=SECRET - Importar system_modules y roles
router.post('/import-essential', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key or SEED_DEMO_KEY not configured' });
    }

    const { system_modules, aponnt_staff_roles } = req.body;
    const results = { modules: 0, roles: 0, errors: [] };

    try {
        // Importar system_modules
        if (system_modules && Array.isArray(system_modules)) {
            for (const m of system_modules) {
                try {
                    await sequelize.query(`
                        INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at, rubro, bundled_modules, available_in, provides_to, integrates_with)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                        ON CONFLICT (module_key) DO UPDATE SET name = $3, description = $4, is_active = $9
                    `, {
                        bind: [m.id, m.module_key, m.name, m.description, m.icon, m.color, m.category, m.base_price, m.is_active, m.is_core, m.display_order, JSON.stringify(m.features || []), JSON.stringify(m.requirements || []), m.version, m.min_employees, m.max_employees, m.created_at, m.updated_at, m.rubro, JSON.stringify(m.bundled_modules || []), m.available_in, JSON.stringify(m.provides_to || []), JSON.stringify(m.integrates_with || [])]
                    });
                    results.modules++;
                } catch (e) {
                    results.errors.push(`module ${m.module_key}: ${e.message.substring(0, 50)}`);
                }
            }
        }

        // Importar roles (excepto SUPERADMIN que ya existe)
        if (aponnt_staff_roles && Array.isArray(aponnt_staff_roles)) {
            for (const r of aponnt_staff_roles) {
                if (r.role_code === 'SUPERADMIN') continue;
                try {
                    await sequelize.query(`
                        INSERT INTO aponnt_staff_roles (role_id, role_code, role_name, role_name_i18n, role_area, level, description, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT (role_code) DO NOTHING
                    `, {
                        bind: [r.role_id, r.role_code, r.role_name, JSON.stringify(r.role_name_i18n || {}), r.role_area, r.level, r.description, r.created_at, r.updated_at]
                    });
                    results.roles++;
                } catch (e) {
                    results.errors.push(`role ${r.role_code}: ${e.message.substring(0, 50)}`);
                }
            }
        }

        res.json({
            success: true,
            message: `Importados: ${results.modules} módulos, ${results.roles} roles`,
            results,
            errors: results.errors.length > 0 ? results.errors : 'none'
        });
    } catch (error) {
        console.error('Error importando datos:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/seed-demo/import-data?key=SECRET - Importar datos genéricos
router.post('/import-data', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    const { marketing_leads, companies, aponnt_email_config, email_process_mapping } = req.body;
    const results = { leads: 0, companies: 0, email_configs: 0, email_mappings: 0, errors: [] };

    try {
        // Importar companies
        if (companies && Array.isArray(companies)) {
            for (const c of companies) {
                try {
                    await sequelize.query(`
                        INSERT INTO companies (company_id, name, slug, legal_name, tax_id, address, city, province, country, phone, contact_email, contact_phone, is_active, max_employees, contracted_employees, license_type, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                        ON CONFLICT (company_id) DO NOTHING
                    `, {
                        bind: [c.company_id, c.name, c.slug, c.legal_name, c.tax_id, c.address, c.city, c.province, c.country, c.phone, c.contact_email, c.contact_phone, c.is_active, c.max_employees, c.contracted_employees, c.license_type, c.created_at, c.updated_at]
                    });
                    results.companies++;
                } catch (e) {
                    results.errors.push(`company ${c.name}: ${e.message.substring(0, 50)}`);
                }
            }
        }

        // Importar marketing_leads
        if (marketing_leads && Array.isArray(marketing_leads)) {
            for (const l of marketing_leads) {
                try {
                    await sequelize.query(`
                        INSERT INTO marketing_leads (id, full_name, email, company_name, phone, source, status, notes, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                        ON CONFLICT (id) DO NOTHING
                    `, {
                        bind: [l.id, l.full_name, l.email, l.company_name, l.phone, l.source || 'manual', l.status || 'new', l.notes || '']
                    });
                    results.leads++;
                } catch (e) {
                    results.errors.push(`lead ${l.company_name}: ${e.message.substring(0, 50)}`);
                }
            }
        }

        // Importar aponnt_email_config (configuración de cuentas de email)
        if (aponnt_email_config && Array.isArray(aponnt_email_config)) {
            for (const ec of aponnt_email_config) {
                try {
                    await sequelize.query(`
                        INSERT INTO aponnt_email_config (id, email_type, from_email, from_name, reply_to, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, is_active, icon, color, description, test_status, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                        ON CONFLICT (id) DO UPDATE SET
                            email_type = EXCLUDED.email_type,
                            from_email = EXCLUDED.from_email,
                            from_name = EXCLUDED.from_name,
                            reply_to = EXCLUDED.reply_to,
                            smtp_host = EXCLUDED.smtp_host,
                            smtp_port = EXCLUDED.smtp_port,
                            smtp_user = EXCLUDED.smtp_user,
                            smtp_password = EXCLUDED.smtp_password,
                            smtp_secure = EXCLUDED.smtp_secure,
                            is_active = EXCLUDED.is_active,
                            icon = EXCLUDED.icon,
                            color = EXCLUDED.color,
                            description = EXCLUDED.description,
                            test_status = EXCLUDED.test_status,
                            updated_at = NOW()
                    `, {
                        bind: [
                            ec.id, ec.email_type, ec.from_email, ec.from_name, ec.reply_to,
                            ec.smtp_host, ec.smtp_port, ec.smtp_user, ec.smtp_password, ec.smtp_secure,
                            ec.is_active, ec.icon, ec.color, ec.description, ec.test_status || 'success',
                            ec.created_at || new Date(), ec.updated_at || new Date()
                        ]
                    });
                    results.email_configs++;
                } catch (e) {
                    results.errors.push(`email_config ${ec.email_type}: ${e.message.substring(0, 80)}`);
                }
            }
        }

        // Importar email_process_mapping (mapeo de procesos a tipos de email)
        if (email_process_mapping && Array.isArray(email_process_mapping)) {
            for (const pm of email_process_mapping) {
                try {
                    await sequelize.query(`
                        INSERT INTO email_process_mapping (id, process_key, process_name, module, description, email_type, priority, is_active, requires_email, metadata, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                        ON CONFLICT (id) DO UPDATE SET
                            process_key = EXCLUDED.process_key,
                            process_name = EXCLUDED.process_name,
                            module = EXCLUDED.module,
                            description = EXCLUDED.description,
                            email_type = EXCLUDED.email_type,
                            priority = EXCLUDED.priority,
                            is_active = EXCLUDED.is_active,
                            requires_email = EXCLUDED.requires_email,
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW()
                    `, {
                        bind: [
                            pm.id, pm.process_key, pm.process_name, pm.module, pm.description,
                            pm.email_type, pm.priority, pm.is_active, pm.requires_email,
                            JSON.stringify(pm.metadata || {}),
                            pm.created_at || new Date(), pm.updated_at || new Date()
                        ]
                    });
                    results.email_mappings++;
                } catch (e) {
                    results.errors.push(`email_mapping ${pm.process_key}: ${e.message.substring(0, 80)}`);
                }
            }
        }

        res.json({
            success: true,
            message: `Importados: ${results.companies} companies, ${results.leads} leads, ${results.email_configs} email_configs, ${results.email_mappings} email_mappings`,
            results,
            errors: results.errors.length > 0 ? results.errors : 'none'
        });
    } catch (error) {
        console.error('Error importando datos:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/seed-demo/check-email-config?key=SECRET - Verificar configuración de email
router.get('/check-email-config', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        const [emailConfigs] = await sequelize.query(`
            SELECT id, email_type, from_email, is_active, test_status, smtp_user
            FROM aponnt_email_config
            WHERE email_type = 'commercial'
        `);

        const [allConfigs] = await sequelize.query(`
            SELECT id, email_type, from_email, is_active, test_status
            FROM aponnt_email_config
            ORDER BY id
        `);

        res.json({
            success: true,
            commercial_configs: emailConfigs,
            all_configs_count: allConfigs.length,
            all_configs: allConfigs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/seed-demo/fix-commercial-email?key=SECRET - Forzar fix del email commercial
router.post('/fix-commercial-email', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        // Actualizar directamente el email commercial
        await sequelize.query(`
            UPDATE aponnt_email_config
            SET is_active = true, test_status = 'success'
            WHERE email_type = 'commercial'
        `);

        // Verificar
        const [result] = await sequelize.query(`
            SELECT id, email_type, from_email, is_active, test_status
            FROM aponnt_email_config
            WHERE email_type = 'commercial'
        `);

        res.json({
            success: true,
            message: 'Email commercial actualizado',
            result: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/seed-demo/check-schema?key=SECRET - Verificar esquema de tablas críticas
router.get('/check-schema', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        const results = {};
        const tables = ['email_process_mapping', 'aponnt_email_config', 'marketing_leads', 'notification_workflows', 'notifications'];

        for (const table of tables) {
            try {
                const [cols] = await sequelize.query(`
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = '${table}' ORDER BY ordinal_position
                `);
                results[table] = cols.length > 0 ? cols.map(c => c.column_name) : 'TABLE_NOT_EXISTS';
            } catch (e) {
                results[table] = 'ERROR: ' + e.message;
            }
        }

        res.json({ success: true, schema: results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/seed-demo/test-email?key=SECRET - Probar envío de email
router.post('/test-email', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    const { to } = req.body;
    if (!to) {
        return res.status(400).json({ error: 'Falta campo "to" con email destino' });
    }

    try {
        // Obtener config de email comercial
        const [emailConfig] = await sequelize.query(`
            SELECT * FROM aponnt_email_config WHERE email_type = 'commercial' AND is_active = true
        `);

        if (!emailConfig || emailConfig.length === 0) {
            return res.json({ success: false, error: 'No hay email commercial configurado' });
        }

        const config = emailConfig[0];

        // Intentar desencriptar contraseña
        let smtpPassword = config.smtp_password;
        if (smtpPassword && smtpPassword.includes(':')) {
            // Está encriptada, intentar desencriptar
            try {
                const crypto = require('crypto');
                const [iv, encrypted] = smtpPassword.split(':');
                const key = process.env.EMAIL_ENCRYPTION_KEY || 'aponnt-email-key-2024-secure!!';
                const keyBuffer = crypto.scryptSync(key, 'salt', 32);
                const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, Buffer.from(iv, 'hex'));
                let decrypted = decipher.update(encrypted, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                smtpPassword = decrypted;
            } catch (decryptError) {
                return res.json({
                    success: false,
                    error: 'Error desencriptando contraseña SMTP',
                    details: decryptError.message,
                    hint: 'Verificar EMAIL_ENCRYPTION_KEY en variables de entorno'
                });
            }
        }

        // Intentar enviar email con nodemailer
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_secure,
            auth: {
                user: config.smtp_user,
                pass: smtpPassword
            }
        });

        const info = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_email}>`,
            to: to,
            subject: 'Test de email - APONNT',
            html: '<h1>Test exitoso!</h1><p>Si recibes este email, la configuración SMTP está funcionando correctamente.</p>'
        });

        res.json({
            success: true,
            message: 'Email enviado exitosamente',
            messageId: info.messageId,
            config: {
                from: config.from_email,
                host: config.smtp_host,
                port: config.smtp_port
            }
        });

    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            code: error.code,
            command: error.command
        });
    }
});

// GET /api/seed-demo/check-data - Ver datos de tablas de email
router.get('/check-data', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        const results = {};

        // 1. email_process_mapping - mostrar todos con 'sales' primero
        const [mappings] = await sequelize.query(`
            SELECT * FROM email_process_mapping
            WHERE process_key LIKE 'sales%' OR process_key LIKE 'auth%' OR process_key LIKE 'notifications%'
            ORDER BY id LIMIT 50
        `);
        results.email_process_mapping = mappings;

        // 1b. Total de mappings
        const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM email_process_mapping`);
        results.email_process_mapping_total = countResult[0].total;

        // 2. aponnt_email_config
        const [configs] = await sequelize.query(`
            SELECT id, email_type, from_email, from_name, smtp_host, smtp_port,
                   is_active, test_status, LENGTH(smtp_password) as pwd_length
            FROM aponnt_email_config ORDER BY id
        `);
        results.aponnt_email_config = configs;

        // 3. marketing_leads count
        const [leads] = await sequelize.query(`
            SELECT COUNT(*) as count FROM marketing_leads
        `);
        results.marketing_leads_count = leads[0].count;

        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/fix-email-mapping - Insertar mapeos en email_process_mapping (RAW SQL)
router.get('/fix-email-mapping', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        const results = [];

        // PASO 1: Resetear el sequence de la tabla para evitar conflictos de ID
        try {
            await sequelize.query(`
                SELECT setval(
                    pg_get_serial_sequence('email_process_mapping', 'id'),
                    COALESCE((SELECT MAX(id) FROM email_process_mapping), 0) + 1,
                    false
                )
            `);
            results.push({ step: 'sequence_reset', status: 'ok' });
        } catch (seqErr) {
            results.push({ step: 'sequence_reset', status: 'error', error: seqErr.message });
        }

        // Los mapeos que necesitamos para que NCE encuentre el email_type
        const mappings = [
            { process_key: 'sales.commercial', process_name: 'Ventas - Email comercial', module: 'sales', email_type: 'commercial' },
            { process_key: 'sales.flyer', process_name: 'Ventas - Envío de flyers', module: 'marketing', email_type: 'commercial' }
        ];

        for (const m of mappings) {
            try {
                // Primero verificar si ya existe
                const [existing] = await sequelize.query(
                    `SELECT id FROM email_process_mapping WHERE process_key = $1`,
                    { bind: [m.process_key], type: sequelize.QueryTypes.SELECT }
                );

                if (existing) {
                    // Actualizar
                    await sequelize.query(
                        `UPDATE email_process_mapping
                         SET email_type = $1, is_active = true, updated_at = NOW()
                         WHERE process_key = $2`,
                        { bind: [m.email_type, m.process_key] }
                    );
                    results.push({ process_key: m.process_key, status: 'updated' });
                } else {
                    // Insertar con ID explícito (MAX+1)
                    const [maxIdResult] = await sequelize.query(
                        `SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM email_process_mapping`
                    );
                    const nextId = maxIdResult[0].next_id;

                    await sequelize.query(
                        `INSERT INTO email_process_mapping
                         (id, process_key, process_name, module, email_type, priority, is_active, requires_email, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, 'normal', true, true, NOW(), NOW())`,
                        { bind: [nextId, m.process_key, m.process_name, m.module, m.email_type] }
                    );
                    results.push({ process_key: m.process_key, status: 'inserted', id: nextId });
                }
            } catch (e) {
                results.push({ process_key: m.process_key, status: 'error', error: e.message, parent: e.parent?.message });
            }
        }

        // Ver estado actual - buscar con punto y con underscore
        const [currentMappings] = await sequelize.query(
            `SELECT id, process_key, email_type, is_active FROM email_process_mapping
             WHERE process_key LIKE '%sales%'
             ORDER BY id`
        );

        res.json({ success: true, results, currentMappings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/seed-demo/fix-email-password - Arreglar password del email comercial
router.get('/fix-email-password', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        // Password de app de Gmail para aponntcomercial@gmail.com
        const plainPassword = 'enlgpjfagfwrobhe';

        // Primero ver estructura de la tabla
        const [columns] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'aponnt_email_config'
            ORDER BY ordinal_position
        `);

        // Ver estado actual de aponnt_email_config
        const [currentConfig] = await sequelize.query(`
            SELECT * FROM aponnt_email_config WHERE email_type = 'commercial'
        `);

        // Actualizar password como texto plano
        // is_encrypted puede no existir, así que lo intentamos por separado
        let updateResult = 'none';
        try {
            await sequelize.query(`
                UPDATE aponnt_email_config
                SET password = $1, is_encrypted = false, test_status = 'success', updated_at = NOW()
                WHERE email_type = 'commercial'
            `, { bind: [plainPassword] });
            updateResult = 'with_is_encrypted';
        } catch (e) {
            // Si is_encrypted no existe, intentar sin él
            await sequelize.query(`
                UPDATE aponnt_email_config
                SET password = $1, test_status = 'success', updated_at = NOW()
                WHERE email_type = 'commercial'
            `, { bind: [plainPassword] });
            updateResult = 'without_is_encrypted';
        }

        // Verificar cambio
        const [updatedConfig] = await sequelize.query(`
            SELECT * FROM aponnt_email_config WHERE email_type = 'commercial'
        `);

        res.json({
            success: true,
            columns: columns.map(c => c.column_name),
            before: currentConfig,
            after: updatedConfig,
            updateResult,
            message: 'Password actualizado como texto plano'
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/force-insert-mapping - Agregar columnas faltantes y insertar workflows
router.get('/force-insert-mapping', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        const migrations = [];

        // 1. Agregar columnas faltantes a notification_workflows
        const columnsToAdd = [
            { name: 'process_key', type: 'VARCHAR(100)' },
            { name: 'process_name', type: 'VARCHAR(255)' },
            { name: 'scope', type: "VARCHAR(20) DEFAULT 'company'" },
            { name: 'email_type', type: 'VARCHAR(50)' },
            { name: 'priority', type: "VARCHAR(20) DEFAULT 'normal'" },
            { name: 'channels', type: "JSONB DEFAULT '[]'" },
            { name: 'category', type: 'VARCHAR(50)' },
            { name: 'notification_type', type: 'VARCHAR(50)' }
        ];

        for (const col of columnsToAdd) {
            try {
                await sequelize.query(`ALTER TABLE notification_workflows ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                migrations.push({ column: col.name, status: 'added_or_exists' });
            } catch (e) {
                migrations.push({ column: col.name, status: 'error', error: e.message });
            }
        }

        // 2. Copiar workflow_key a process_key si process_key está vacío
        try {
            await sequelize.query(`
                UPDATE notification_workflows
                SET process_key = workflow_key
                WHERE process_key IS NULL AND workflow_key IS NOT NULL
            `);
            migrations.push({ action: 'copy_workflow_key_to_process_key', status: 'done' });
        } catch (e) {
            migrations.push({ action: 'copy_workflow_key_to_process_key', status: 'error', error: e.message });
        }

        // 3. Insertar workflows para sales
        const workflowsToInsert = [
            {
                process_key: 'sales.commercial',
                workflow_key: 'sales.commercial',
                process_name: 'Ventas - Comunicaciones comerciales',
                workflow_name: 'Ventas - Comunicaciones comerciales',
                module: 'marketing',
                scope: 'aponnt',
                email_type: 'commercial',
                priority: 'normal',
                channels: JSON.stringify(['email'])
            },
            {
                process_key: 'sales.flyer',
                workflow_key: 'sales.flyer',
                process_name: 'Ventas - Envío de flyers',
                workflow_name: 'Ventas - Envío de flyers',
                module: 'marketing',
                scope: 'aponnt',
                email_type: 'commercial',
                priority: 'normal',
                channels: JSON.stringify(['email'])
            }
        ];

        const results = [];
        for (const w of workflowsToInsert) {
            try {
                // Verificar si existe
                const [existing] = await sequelize.query(`
                    SELECT id FROM notification_workflows WHERE process_key = :process_key
                `, { replacements: { process_key: w.process_key } });

                if (existing.length > 0) {
                    await sequelize.query(`
                        UPDATE notification_workflows
                        SET is_active = true, email_type = :email_type, channels = :channels::jsonb, scope = :scope
                        WHERE process_key = :process_key
                    `, { replacements: w });
                    results.push({ process_key: w.process_key, status: 'updated' });
                } else {
                    await sequelize.query(`
                        INSERT INTO notification_workflows
                        (process_key, process_name, workflow_key, workflow_name, module, scope, email_type, priority, channels, is_active, created_at, updated_at)
                        VALUES
                        (:process_key, :process_name, :workflow_key, :workflow_name, :module, :scope, :email_type, :priority, :channels::jsonb, true, NOW(), NOW())
                    `, { replacements: w });
                    results.push({ process_key: w.process_key, status: 'inserted' });
                }
            } catch (e) {
                results.push({ process_key: w.process_key, status: 'error', error: e.message });
            }
        }

        // 4. Ver workflows de sales ahora
        const [salesWorkflows] = await sequelize.query(`
            SELECT id, process_key, process_name, workflow_key, workflow_name, scope, module, email_type, is_active
            FROM notification_workflows
            WHERE process_key LIKE 'sales%' OR workflow_key LIKE 'sales%'
            ORDER BY id
        `);

        res.json({ success: true, migrations, results, salesWorkflows });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/test-nce-email - Probar envío de email via NCE
router.get('/test-nce-email', async (req, res) => {
    const { key, to } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    if (!to) {
        return res.status(400).json({ error: 'Missing "to" parameter' });
    }

    try {
        // Importar NCE
        const NCE = require('../services/NotificationCentralExchange');

        console.log('🧪 [TEST-NCE] Iniciando test de email via NCE...');
        console.log('🧪 [TEST-NCE] Destinatario:', to);

        // Intentar enviar via NCE igual que lo hace SalesOrchestrationService
        const result = await NCE.send({
            companyId: null, // Scope aponnt (global)
            module: 'sales',
            workflowKey: 'sales.commercial',
            originType: 'test_email',
            originId: `test-${Date.now()}`,
            recipientType: 'external',
            recipientId: to,
            title: 'Test de Email via NCE',
            message: 'Este es un email de prueba enviado via NCE.',
            data: {
                recipientEmail: to,
                recipientName: 'Test User',
                subject: 'Test NCE - APONNT',
                html: '<h1>Test NCE</h1><p>Si recibes este email, NCE está funcionando correctamente.</p>'
            },
            priority: 'normal',
            channels: ['email']
        });

        console.log('🧪 [TEST-NCE] Resultado:', JSON.stringify(result, null, 2));

        res.json({
            success: true,
            nceResult: result,
            message: result?.success ? 'NCE retornó success' : 'NCE retornó error'
        });

    } catch (error) {
        console.error('🧪 [TEST-NCE] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// GET /api/seed-demo/test-direct-smtp - Probar SMTP directamente sin NCE
router.get('/test-direct-smtp', async (req, res) => {
    const { key, to } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    if (!to) {
        return res.status(400).json({ error: 'Missing "to" parameter' });
    }

    try {
        const nodemailer = require('nodemailer');

        // Obtener config de commercial
        const [configs] = await sequelize.query(`
            SELECT * FROM aponnt_email_config WHERE email_type = 'commercial' AND is_active = true
        `);

        if (configs.length === 0) {
            return res.status(404).json({ error: 'No commercial email config found' });
        }

        const config = configs[0];
        console.log('📧 [DIRECT-SMTP] Config:', config.from_email, 'Host:', config.smtp_host);

        // Usar la contraseña tal cual está en la BD
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_secure || false,
            auth: {
                user: config.smtp_user || config.from_email,
                pass: config.smtp_password
            }
        });

        console.log('📧 [DIRECT-SMTP] Enviando a:', to);

        const info = await transporter.sendMail({
            from: `"${config.from_name}" <${config.from_email}>`,
            to: to,
            subject: 'Test SMTP Directo - APONNT',
            html: '<h1>Test SMTP Directo</h1><p>Si recibes este email, SMTP funciona correctamente.</p><p>Fecha: ' + new Date().toISOString() + '</p>'
        });

        console.log('📧 [DIRECT-SMTP] Enviado! MessageId:', info.messageId);

        res.json({
            success: true,
            messageId: info.messageId,
            from: config.from_email,
            to: to
        });

    } catch (error) {
        console.error('📧 [DIRECT-SMTP] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            command: error.command
        });
    }
});

// GET /api/seed-demo/diagnose-mapping - Diagnóstico profundo de email_process_mapping
router.get('/diagnose-mapping', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        const diagnosis = {};

        // 1. Estructura de la tabla (columnas, tipos, constraints)
        const [columns] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'email_process_mapping'
            ORDER BY ordinal_position
        `);
        diagnosis.columns = columns;

        // 2. Constraints (primary key, unique, foreign keys)
        const [constraints] = await sequelize.query(`
            SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'email_process_mapping'
        `);
        diagnosis.constraints = constraints;

        // 3. Triggers activos
        const [triggers] = await sequelize.query(`
            SELECT trigger_name, event_manipulation, action_timing
            FROM information_schema.triggers
            WHERE event_object_table = 'email_process_mapping'
        `);
        diagnosis.triggers = triggers;

        // 4. Buscar TODOS los registros (incluye case-insensitive para sales)
        const [allRecords] = await sequelize.query(`
            SELECT * FROM email_process_mapping ORDER BY id
        `);
        diagnosis.total_records = allRecords.length;
        diagnosis.all_records = allRecords;

        // 5. Buscar específicamente 'sales.commercial' y variantes
        const [searchResults] = await sequelize.query(`
            SELECT id, process_key, email_type, is_active
            FROM email_process_mapping
            WHERE process_key ILIKE '%sales%' OR process_key ILIKE '%commercial%'
        `);
        diagnosis.sales_variants = searchResults;

        // 6. Max ID actual
        const [maxId] = await sequelize.query(`
            SELECT MAX(id) as max_id, COUNT(*) as count FROM email_process_mapping
        `);
        diagnosis.max_id_info = maxId[0];

        res.json({ success: true, diagnosis });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/upsert-mapping - UPSERT para insertar/actualizar mapeos
router.get('/upsert-mapping', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        const results = [];

        // Primero, verificar qué constraint única existe
        const [constraints] = await sequelize.query(`
            SELECT constraint_name, column_name
            FROM information_schema.key_column_usage
            WHERE table_name = 'email_process_mapping'
            AND constraint_name LIKE '%unique%' OR constraint_name LIKE '%pkey%'
        `);
        results.push({ step: 'constraints', data: constraints });

        // Los mapeos que necesitamos
        const mappings = [
            { process_key: 'sales.commercial', process_name: 'Ventas - Email comercial', module: 'sales', email_type: 'commercial' },
            { process_key: 'sales.flyer', process_name: 'Ventas - Envío de flyers', module: 'marketing', email_type: 'commercial' }
        ];

        for (const m of mappings) {
            try {
                // Usar INSERT ... ON CONFLICT (process_key) DO UPDATE
                // Primero necesitamos saber si hay unique constraint en process_key
                await sequelize.query(`
                    INSERT INTO email_process_mapping
                    (process_key, process_name, module, email_type, priority, is_active, requires_email, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, 'normal', true, true, NOW(), NOW())
                    ON CONFLICT (process_key)
                    DO UPDATE SET
                        email_type = EXCLUDED.email_type,
                        is_active = true,
                        updated_at = NOW()
                `, { bind: [m.process_key, m.process_name, m.module, m.email_type] });
                results.push({ process_key: m.process_key, status: 'upserted' });
            } catch (e) {
                // Si falla ON CONFLICT, intentar DELETE + INSERT
                try {
                    await sequelize.query(`DELETE FROM email_process_mapping WHERE process_key = $1`, { bind: [m.process_key] });
                    await sequelize.query(`
                        INSERT INTO email_process_mapping
                        (process_key, process_name, module, email_type, priority, is_active, requires_email, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, 'normal', true, true, NOW(), NOW())
                    `, { bind: [m.process_key, m.process_name, m.module, m.email_type] });
                    results.push({ process_key: m.process_key, status: 'delete+insert' });
                } catch (e2) {
                    results.push({ process_key: m.process_key, status: 'failed', error: e.message, error2: e2.message });
                }
            }
        }

        // Verificar estado final
        const [finalState] = await sequelize.query(`
            SELECT id, process_key, email_type, is_active
            FROM email_process_mapping
            WHERE process_key LIKE 'sales%'
            ORDER BY id
        `);
        results.push({ step: 'final_state', data: finalState });

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// GET /api/seed-demo/disable-trigger - Desactivar trigger y volver a intentar
router.get('/disable-trigger', async (req, res) => {
    const { key } = req.query;
    if (!SECRET_KEY || !key || key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        const results = [];

        // 1. Listar triggers
        const [triggers] = await sequelize.query(`
            SELECT trigger_name FROM information_schema.triggers
            WHERE event_object_table = 'email_process_mapping'
        `);
        results.push({ step: 'triggers_found', triggers });

        // 2. Desactivar TODOS los triggers en la tabla
        try {
            await sequelize.query(`ALTER TABLE email_process_mapping DISABLE TRIGGER ALL`);
            results.push({ step: 'triggers_disabled', status: 'ok' });
        } catch (e) {
            results.push({ step: 'triggers_disabled', status: 'error', error: e.message });
        }

        // 3. Ahora intentar el INSERT directamente
        const mappings = [
            { process_key: 'sales.commercial', process_name: 'Ventas - Email comercial', module: 'sales', email_type: 'commercial' },
            { process_key: 'sales.flyer', process_name: 'Ventas - Envío de flyers', module: 'marketing', email_type: 'commercial' }
        ];

        for (const m of mappings) {
            try {
                // Borrar si existe
                await sequelize.query(`DELETE FROM email_process_mapping WHERE process_key = $1`, { bind: [m.process_key] });
                // Insertar
                await sequelize.query(`
                    INSERT INTO email_process_mapping
                    (process_key, process_name, module, email_type, priority, is_active, requires_email, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, 'normal', true, true, NOW(), NOW())
                `, { bind: [m.process_key, m.process_name, m.module, m.email_type] });
                results.push({ process_key: m.process_key, status: 'inserted' });
            } catch (e) {
                results.push({ process_key: m.process_key, status: 'failed', error: e.message });
            }
        }

        // 4. Reactivar triggers
        try {
            await sequelize.query(`ALTER TABLE email_process_mapping ENABLE TRIGGER ALL`);
            results.push({ step: 'triggers_enabled', status: 'ok' });
        } catch (e) {
            results.push({ step: 'triggers_enabled', status: 'error', error: e.message });
        }

        // 5. Estado final
        const [finalState] = await sequelize.query(`
            SELECT id, process_key, email_type, is_active
            FROM email_process_mapping
            WHERE process_key LIKE 'sales%'
            ORDER BY id
        `);
        results.push({ step: 'final_state', data: finalState });

        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

module.exports = router;
// Force deploy 1769910749
