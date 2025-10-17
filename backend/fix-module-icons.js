const database = require('./src/config/database');

// Mapeo completo de módulos con sus íconos de Font Awesome correctos
const moduleIcons = {
    // Core
    'attendance': 'fas fa-clipboard-check',
    'users': 'fas fa-users',
    'departments': 'fas fa-building',
    'shifts': 'fas fa-clock',
    'network': 'fas fa-network-wired',
    'kiosks': 'fas fa-tablet-alt',
    'settings': 'fas fa-cog',

    // Biometric
    'biometric': 'fas fa-fingerprint',

    // Gestión
    'vacation-management': 'fas fa-umbrella-beach',
    'training-management': 'fas fa-graduation-cap',
    'sanctions-management': 'fas fa-exclamation-triangle',
    'document-management': 'fas fa-folder-open',
    'art-management': 'fas fa-medkit',

    // Integraciones
    'google-maps-integration': 'fas fa-map-marked-alt',
    'employee-map': 'fas fa-map-marker-alt',

    // Notificaciones V2.0
    'compliance-dashboard': 'fas fa-gavel',
    'sla-tracking': 'fas fa-tachometer-alt',
    'audit-reports': 'fas fa-file-contract',
    'proactive-notifications': 'fas fa-bell-exclamation',
    'resource-center': 'fas fa-book-open',
    'notifications-inbox': 'fas fa-inbox',
    'notifications-complete': 'fas fa-bell',

    // Dashboard
    'legal-dashboard': 'fas fa-balance-scale',
    'medical-dashboard': 'fas fa-stethoscope',

    // Control de Acceso
    'access-control': 'fas fa-door-open',

    // Administración
    'terms-conditions': 'fas fa-file-alt',
    'licensing-management': 'fas fa-key',
    'permissions-test': 'fas fa-vial',

    // Laboral
    'payroll-liquidation': 'fas fa-calculator',
    'job-postings': 'fas fa-briefcase',

    // SIAC
    'clientes': 'fas fa-user-tie',
    'facturacion': 'fas fa-file-invoice-dollar',
    'plantillas-fiscales': 'fas fa-file-invoice'
};

async function fixModuleIcons() {
    try {
        console.log('🔧 Iniciando corrección de íconos...\n');

        // Obtener todos los módulos
        const [modules] = await database.sequelize.query(
            'SELECT id, module_key, name, icon FROM system_modules ORDER BY name'
        );

        console.log(`📊 Encontrados ${modules.length} módulos\n`);

        let updated = 0;
        let noChange = 0;

        for (const module of modules) {
            const newIcon = moduleIcons[module.module_key];

            if (!newIcon) {
                console.log(`⚠️  Sin mapeo: ${module.module_key.padEnd(35)} | Actual: ${module.icon}`);
                noChange++;
                continue;
            }

            if (module.icon === newIcon) {
                console.log(`✓  OK: ${module.module_key.padEnd(35)} | ${newIcon}`);
                noChange++;
                continue;
            }

            // Actualizar el ícono
            await database.sequelize.query(
                'UPDATE system_modules SET icon = ? WHERE id = ?',
                {
                    replacements: [newIcon, module.id]
                }
            );

            console.log(`✅ Actualizado: ${module.module_key.padEnd(35)} | ${module.icon || 'NULL'} → ${newIcon}`);
            updated++;
        }

        console.log(`\n📊 RESUMEN:`);
        console.log(`   ✅ Actualizados: ${updated}`);
        console.log(`   ✓  Sin cambios: ${noChange}`);
        console.log(`   📋 Total: ${modules.length}`);

        if (updated > 0) {
            console.log(`\n🎉 Íconos actualizados correctamente!`);
            console.log(`   Recarga el panel (Ctrl+F5) para ver los cambios`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await database.sequelize.close();
    }
}

fixModuleIcons();
