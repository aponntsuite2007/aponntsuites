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
    { key: "compliance-dashboard", name: "Risk Intelligence Dashboard", icon: "⚖️", color: "#e94560", category: "compliance" },
    { key: "occupational-health-phase2", name: "Salud Ocupacional", icon: "🏥", color: "#00897B", category: "medical" },
    { key: "permissions-test", name: "Test de Permisos", icon: "🧪", color: "#4B0082", category: "testing" }
];

// GET /api/seed-demo/update-modules?key=SECRET - Asignar módulos de ISI a DEMO
router.get('/update-modules', async (req, res) => {
    const { key } = req.query;
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
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
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
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
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
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

// GET /api/seed-demo/sync-alter?key=SECRET - FORZAR sync con ALTER (agrega columnas faltantes)
router.get('/sync-alter', async (req, res) => {
    const { key } = req.query;
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
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
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
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
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
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
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
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
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    const results = { tables: {}, errors: [] };

    // DEPARTMENTS - columnas necesarias
    const DEPT_COLUMNS = [
        { col: 'gps_lat', type: 'DECIMAL(10,8)' },
        { col: 'gps_lng', type: 'DECIMAL(11,8)' },
        { col: 'gps_radius', type: 'INTEGER DEFAULT 100' },
        { col: 'geofence_enabled', type: 'BOOLEAN DEFAULT false' },
        { col: 'branch_id', type: 'INTEGER' },
        { col: 'manager_id', type: 'INTEGER' },
        { col: 'is_active', type: 'BOOLEAN DEFAULT true' },
        { col: 'description', type: 'TEXT' },
        { col: 'code', type: 'VARCHAR(50)' },
        { col: 'parent_id', type: 'INTEGER' },
        { col: 'level', type: 'INTEGER DEFAULT 1' },
        { col: 'path', type: 'TEXT' }
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

    const ALL_TABLES = [
        { name: 'departments', columns: DEPT_COLUMNS },
        { name: 'branches', columns: BRANCH_COLUMNS },
        { name: 'attendance', columns: ATTENDANCE_COLUMNS },
        { name: 'shifts', columns: SHIFT_COLUMNS },
        { name: 'kiosks', columns: KIOSK_COLUMNS }
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

// GET /api/seed-demo/create-admin?key=SECRET - Crear usuario admin para DEMO
router.get('/create-admin', async (req, res) => {
    const { key } = req.query;
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
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
    if (key !== SECRET_KEY) {
        return res.status(403).json({ error: 'Invalid key' });
    }

    try {
        // Verificar estructura de la tabla
        const [cols] = await sequelize.query(`
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_name = 'users' AND column_name IN ('id', 'user_id', 'employeeId')
        `);

        // Sincronizar user_id y employeeId
        const results = [];

        // Si user_id es UUID, generar valores
        try {
            await sequelize.query(`UPDATE users SET user_id = gen_random_uuid() WHERE user_id IS NULL`);
            results.push('user_id: UUIDs generados');
        } catch (e) {
            results.push(`user_id error: ${e.message.substring(0, 50)}`);
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
