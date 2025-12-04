/**
 * Script para actualizar el registry de módulos
 * Reemplaza notifications-complete y notifications-enterprise
 * con el nuevo notification-center unificado
 */

const fs = require('fs');
const path = require('path');

// Paths de los archivos de registry
const configRegistryPath = path.join(__dirname, '../src/config/modules-registry.json');
const auditorRegistryPath = path.join(__dirname, '../src/auditor/registry/modules-registry.json');

// Nueva definición del módulo unificado
const notificationCenterModule = {
    "id": "notification-center",
    "key": "notification-center",
    "name": "Centro de Notificaciones Unificado",
    "icon": "🔔",
    "category": "communication",
    "is_core": true,
    "base_price": 0,
    "description": "Sistema unificado de notificaciones con IA, threads, workflows y multi-canal (Aponnt ↔ Empresa ↔ APKs)",
    "isCommercial": true,
    "isAdministrative": false,
    "hasImplementation": true,
    "frontend_file": "/js/modules/notification-center.js",
    "init_function": "showNotificationCenterContent",
    "status": "COMPLETE",
    "progress": 100,
    "aliases": ["notifications-enterprise", "notifications-complete", "inbox"],
    "dependencies": {
        "required": ["users"],
        "optional": ["ai-assistant"],
        "provides_to": ["ALL"]
    }
};

function updateRegistry(filePath) {
    console.log(`\n📂 Procesando: ${filePath}`);

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        let registry = JSON.parse(content);

        // El registry puede ser un objeto con "modules" array o directamente un array
        let modules = Array.isArray(registry) ? registry : (registry.modules || []);

        // Filtrar módulos viejos
        const oldCount = modules.length;
        modules = modules.filter(m => {
            const key = m.key || m.id;
            return key !== 'notifications-complete' && key !== 'notifications-enterprise';
        });

        const removedCount = oldCount - modules.length;
        console.log(`   ✅ Eliminados ${removedCount} módulos viejos`);

        // Verificar si ya existe notification-center
        const exists = modules.some(m => (m.key || m.id) === 'notification-center');

        if (!exists) {
            // Encontrar posición después de ai-assistant
            const aiIdx = modules.findIndex(m => (m.key || m.id) === 'ai-assistant');
            if (aiIdx >= 0) {
                modules.splice(aiIdx + 1, 0, notificationCenterModule);
            } else {
                modules.push(notificationCenterModule);
            }
            console.log(`   ✅ Agregado notification-center`);
        } else {
            console.log(`   ⚠️ notification-center ya existe, actualizando...`);
            const idx = modules.findIndex(m => (m.key || m.id) === 'notification-center');
            modules[idx] = notificationCenterModule;
        }

        // Actualizar referencias en otros módulos
        modules = modules.map(m => {
            if (m.dependencies) {
                // Reemplazar referencias viejas con notification-center
                ['required', 'optional', 'provides_to', 'integrates_with'].forEach(key => {
                    if (Array.isArray(m.dependencies[key])) {
                        m.dependencies[key] = m.dependencies[key].map(dep => {
                            if (dep === 'notifications-enterprise' || dep === 'notifications-complete') {
                                return 'notification-center';
                            }
                            return dep;
                        });
                        // Eliminar duplicados
                        m.dependencies[key] = [...new Set(m.dependencies[key])];
                    }
                });
            }
            return m;
        });

        // Guardar
        if (Array.isArray(registry)) {
            registry = modules;
        } else {
            registry.modules = modules;
        }

        fs.writeFileSync(filePath, JSON.stringify(registry, null, 2), 'utf8');
        console.log(`   ✅ Guardado exitosamente`);

        return true;
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return false;
    }
}

console.log('🔔 ACTUALIZANDO REGISTRIES DE MÓDULOS');
console.log('=====================================');

// Actualizar config registry
updateRegistry(configRegistryPath);

// Actualizar auditor registry (si existe)
if (fs.existsSync(auditorRegistryPath)) {
    updateRegistry(auditorRegistryPath);
}

console.log('\n✅ PROCESO COMPLETADO');
console.log('\nPróximos pasos:');
console.log('1. Reiniciar el servidor');
console.log('2. Actualizar system_modules en BD si es necesario');
