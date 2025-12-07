/**
 * Seed de datos iniciales para Sistema RBAC + Asociados APONNT
 * Adaptado al esquema real de BD
 *
 * Ejecutar: node scripts/seed-rbac-associates.js
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function seedRBACAndAssociates() {
    console.log('🌱 [SEED] Iniciando seed de Sistema RBAC + Asociados APONNT...\n');

    try {
        // =====================================================
        // 1. SEED ROLE DEFINITIONS (Roles del Sistema)
        // =====================================================
        console.log('📋 [1/4] Creando definiciones de roles...');

        const roles = [
            {
                key: 'super_admin', name: 'Super Administrador', category: 'system',
                description: 'Acceso total a todas las empresas y módulos',
                permissions: { all: { read: true, create: true, update: true, delete: true } },
                priority: 100, color: '#e74c3c', icon: 'fa-crown'
            },
            {
                key: 'admin', name: 'Administrador', category: 'company',
                description: 'Acceso total a una empresa específica',
                permissions: { company: { read: true, create: true, update: true, delete: true } },
                priority: 90, color: '#3498db', icon: 'fa-user-shield'
            },
            {
                key: 'rrhh', name: 'Recursos Humanos', category: 'company',
                description: 'Gestión de personal, vacaciones, sanciones',
                permissions: {
                    users: { read: true, create: true, update: true },
                    attendance: { read: true, create: true, update: true },
                    vacations: { read: true, create: true, update: true },
                    sanctions: { read: true, create: true, update: true }
                },
                priority: 70, color: '#9b59b6', icon: 'fa-users-cog'
            },
            {
                key: 'supervisor', name: 'Supervisor', category: 'department',
                description: 'Supervisa un departamento o área',
                permissions: {
                    attendance: { read: true, create: true },
                    vacations: { read: true, create: true }
                },
                priority: 50, color: '#2ecc71', icon: 'fa-user-tie'
            },
            {
                key: 'employee', name: 'Empleado', category: 'self',
                description: 'Empleado básico, solo ve sus propios datos',
                permissions: { self: { read: true } },
                priority: 10, color: '#95a5a6', icon: 'fa-user'
            },
            {
                key: 'associate_medical', name: 'Asociado Médico', category: 'associate',
                description: 'Médico ocupacional (APONNT associate)',
                permissions: { medical: { read: true, create: true, update: true } },
                priority: 40, color: '#1abc9c', icon: 'fa-user-md'
            },
            {
                key: 'associate_legal', name: 'Asociado Legal', category: 'associate',
                description: 'Abogado laboral (APONNT associate)',
                permissions: { legal: { read: true, create: true, update: true } },
                priority: 40, color: '#34495e', icon: 'fa-balance-scale'
            },
            {
                key: 'associate_safety', name: 'Asociado Seguridad', category: 'associate',
                description: 'Especialista en seguridad industrial (APONNT associate)',
                permissions: { safety: { read: true, create: true } },
                priority: 40, color: '#f39c12', icon: 'fa-hard-hat'
            }
        ];

        let roleCount = 0;
        for (const role of roles) {
            // Verificar si ya existe
            const [existing] = await sequelize.query(
                'SELECT id FROM role_definitions WHERE role_key = :key AND company_id IS NULL',
                { replacements: { key: role.key }, type: QueryTypes.SELECT }
            );

            if (existing) {
                // Actualizar
                await sequelize.query(`
                    UPDATE role_definitions SET
                        role_name = :name,
                        description = :description,
                        category = :category,
                        module_permissions = :permissions::jsonb,
                        priority = :priority,
                        color = :color,
                        icon = :icon
                    WHERE role_key = :key AND company_id IS NULL
                `, {
                    replacements: {
                        key: role.key,
                        name: role.name,
                        description: role.description,
                        category: role.category,
                        permissions: JSON.stringify(role.permissions),
                        priority: role.priority,
                        color: role.color,
                        icon: role.icon
                    },
                    type: QueryTypes.UPDATE
                });
            } else {
                // Insertar
                await sequelize.query(`
                    INSERT INTO role_definitions (role_key, role_name, description, category, module_permissions, is_system_role, priority, color, icon, is_active)
                    VALUES (:key, :name, :description, :category, :permissions::jsonb, true, :priority, :color, :icon, true)
                `, {
                    replacements: {
                        key: role.key,
                        name: role.name,
                        description: role.description,
                        category: role.category,
                        permissions: JSON.stringify(role.permissions),
                        priority: role.priority,
                        color: role.color,
                        icon: role.icon
                    },
                    type: QueryTypes.INSERT
                });
            }
            roleCount++;
        }
        console.log(`   ✅ ${roleCount} roles del sistema creados/actualizados`);

        // =====================================================
        // 2. SEED MODULE DEFINITIONS (Catálogo de Módulos)
        // =====================================================
        console.log('📦 [2/4] Creando definiciones de módulos...');

        const modules = [
            { key: 'dashboard', name: 'Dashboard', category: 'core', icon: 'fa-tachometer-alt', actions: ['read'] },
            { key: 'users', name: 'Gestión de Usuarios', category: 'core', icon: 'fa-users', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'departments', name: 'Departamentos', category: 'core', icon: 'fa-building', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'attendance', name: 'Asistencia', category: 'rrhh', icon: 'fa-clock', actions: ['read', 'create', 'update'] },
            { key: 'shifts', name: 'Turnos', category: 'rrhh', icon: 'fa-calendar-alt', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'vacation-management', name: 'Vacaciones y Licencias', category: 'rrhh', icon: 'fa-umbrella-beach', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'sanctions-management', name: 'Sanciones', category: 'rrhh', icon: 'fa-gavel', actions: ['read', 'create', 'update'] },
            { key: 'payroll-liquidation', name: 'Liquidación de Sueldos', category: 'rrhh', icon: 'fa-money-bill-wave', actions: ['read', 'create', 'update'] },
            { key: 'positions-management', name: 'Gestión de Cargos', category: 'rrhh', icon: 'fa-sitemap', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'biometric-dashboard', name: 'Dashboard Biométrico', category: 'biometric', icon: 'fa-fingerprint', actions: ['read'] },
            { key: 'biometric-consent', name: 'Consentimientos Biométricos', category: 'biometric', icon: 'fa-file-signature', actions: ['read', 'create', 'update'] },
            { key: 'kiosks', name: 'Kioscos de Fichaje', category: 'biometric', icon: 'fa-desktop', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'medical-dashboard', name: 'Medicina Ocupacional', category: 'medical', icon: 'fa-heartbeat', actions: ['read', 'create', 'update'] },
            { key: 'legal-dashboard', name: 'Dashboard Legal', category: 'legal', icon: 'fa-balance-scale', actions: ['read', 'create', 'update'] },
            { key: 'document-management', name: 'Gestión Documental', category: 'legal', icon: 'fa-file-alt', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'inbox', name: 'Bandeja de Notificaciones', category: 'notifications', icon: 'fa-inbox', actions: ['read', 'update', 'delete'] },
            { key: 'employee-map', name: 'Mapa de Empleados', category: 'analytics', icon: 'fa-map-marked-alt', actions: ['read'] },
            { key: 'employee-360', name: 'Vista 360 del Empleado', category: 'analytics', icon: 'fa-user-circle', actions: ['read', 'update'] },
            { key: 'training-management', name: 'Capacitaciones', category: 'training', icon: 'fa-graduation-cap', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'settings', name: 'Configuración', category: 'admin', icon: 'fa-cog', actions: ['read', 'update'] },
            { key: 'roles-permissions', name: 'Roles y Permisos', category: 'admin', icon: 'fa-lock', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'associate-marketplace', name: 'Marketplace de Asociados', category: 'admin', icon: 'fa-store', actions: ['read', 'create', 'update', 'delete'] },
            { key: 'job-postings', name: 'Ofertas de Empleo', category: 'talent', icon: 'fa-briefcase', actions: ['read', 'create', 'update', 'delete'] }
        ];

        let modCount = 0;
        for (const mod of modules) {
            const [existing] = await sequelize.query(
                'SELECT id FROM module_definitions WHERE module_key = :key',
                { replacements: { key: mod.key }, type: QueryTypes.SELECT }
            );

            if (existing) {
                await sequelize.query(`
                    UPDATE module_definitions SET
                        module_name = :name,
                        category = :category,
                        icon = :icon,
                        available_actions = ARRAY[:actions]::text[]
                    WHERE module_key = :key
                `, {
                    replacements: {
                        key: mod.key,
                        name: mod.name,
                        category: mod.category,
                        icon: mod.icon,
                        actions: mod.actions
                    },
                    type: QueryTypes.UPDATE
                });
            } else {
                await sequelize.query(`
                    INSERT INTO module_definitions (module_key, module_name, category, icon, available_actions, is_active)
                    VALUES (:key, :name, :category, :icon, ARRAY[:actions]::text[], true)
                `, {
                    replacements: {
                        key: mod.key,
                        name: mod.name,
                        category: mod.category,
                        icon: mod.icon,
                        actions: mod.actions
                    },
                    type: QueryTypes.INSERT
                });
            }
            modCount++;
        }
        console.log(`   ✅ ${modCount} módulos del sistema creados/actualizados`);

        // =====================================================
        // 3. SEED APONNT ASSOCIATES (Profesionales Pool)
        // =====================================================
        console.log('👨‍⚕️ [3/4] Creando asociados APONNT demo...');

        const associates = [
            { category: 'medical', first: 'Carlos', last: 'Mendoza', spec: 'Medicina Ocupacional', email: 'carlos.mendoza@aponnt-associates.com', license: 'MN-12345', rate: 150 },
            { category: 'medical', first: 'María', last: 'González', spec: 'Medicina Laboral', email: 'maria.gonzalez@aponnt-associates.com', license: 'MN-23456', rate: 160 },
            { category: 'medical', first: 'Roberto', last: 'Silva', spec: 'Toxicología Ocupacional', email: 'roberto.silva@aponnt-associates.com', license: 'MN-34567', rate: 180 },
            { category: 'legal', first: 'Laura', last: 'Fernández', spec: 'Derecho Laboral', email: 'laura.fernandez@aponnt-associates.com', license: 'AB-11111', rate: 200 },
            { category: 'legal', first: 'Martín', last: 'Rodríguez', spec: 'Derecho Sindical', email: 'martin.rodriguez@aponnt-associates.com', license: 'AB-22222', rate: 220 },
            { category: 'safety', first: 'Patricia', last: 'López', spec: 'Seguridad e Higiene', email: 'patricia.lopez@aponnt-associates.com', license: 'SHI-99999', rate: 140 },
            { category: 'safety', first: 'Fernando', last: 'Martínez', spec: 'Prevención de Riesgos', email: 'fernando.martinez@aponnt-associates.com', license: 'SHI-88888', rate: 135 }
        ];

        let assocCount = 0;
        for (const assoc of associates) {
            const [existing] = await sequelize.query(
                'SELECT id FROM aponnt_associates WHERE email = :email',
                { replacements: { email: assoc.email }, type: QueryTypes.SELECT }
            );

            if (existing) {
                await sequelize.query(`
                    UPDATE aponnt_associates SET
                        first_name = :first,
                        last_name = :last,
                        specialty = :spec,
                        hourly_rate = :rate
                    WHERE email = :email
                `, {
                    replacements: assoc,
                    type: QueryTypes.UPDATE
                });
            } else {
                await sequelize.query(`
                    INSERT INTO aponnt_associates (
                        category, first_name, last_name, specialty,
                        email, phone, license_number, hourly_rate,
                        is_active, is_verified, rating_average, contracts_completed, active_contracts
                    ) VALUES (:category, :first, :last, :spec, :email, '+54 11 5555-1234', :license, :rate, true, true, 4.7, 0, 0)
                `, {
                    replacements: assoc,
                    type: QueryTypes.INSERT
                });
            }
            assocCount++;
        }
        console.log(`   ✅ ${assocCount} asociados APONNT creados/actualizados`);

        // =====================================================
        // 4. VERIFICAR DATOS
        // =====================================================
        console.log('🔍 [4/4] Verificando datos...');

        const [roleResult] = await sequelize.query('SELECT COUNT(*) as count FROM role_definitions WHERE is_system_role = true');
        const [modResult] = await sequelize.query('SELECT COUNT(*) as count FROM module_definitions');
        const [assocResult] = await sequelize.query('SELECT COUNT(*) as count FROM aponnt_associates WHERE is_active = true');

        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║  ✅ SEED RBAC + ASOCIADOS COMPLETADO EXITOSAMENTE        ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║  📋 Roles del sistema: ' + roleResult[0].count.toString().padEnd(32) + '║');
        console.log('║  📦 Módulos registrados: ' + modResult[0].count.toString().padEnd(30) + '║');
        console.log('║  👨‍⚕️ Asociados APONNT activos: ' + assocResult[0].count.toString().padEnd(24) + '║');
        console.log('╚══════════════════════════════════════════════════════════╝');

    } catch (error) {
        console.error('\n❌ ERROR en seed:', error.message);
        if (error.sql) console.error('SQL:', error.sql.substring(0, 200));
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Ejecutar
seedRBACAndAssociates()
    .then(() => {
        console.log('\n🎉 Script finalizado exitosamente');
        process.exit(0);
    })
    .catch(err => {
        console.error('💥 Error fatal:', err.message);
        process.exit(1);
    });
