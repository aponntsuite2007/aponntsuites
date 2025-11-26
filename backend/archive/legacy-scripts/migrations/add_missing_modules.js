// Agregar módulos faltantes al sistema
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'attendance_system',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'Aedr15150302',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    timezone: '+00:00'
  }
);

async function addMissingModules() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        await sequelize.authenticate();
        console.log('✅ Conectado exitosamente');

        // Lista de módulos faltantes que encontré en el código
        const missingModules = [
            {
                module_key: 'evaluacion-biometrica',
                name: 'Evaluación Biométrica',
                description: 'Evaluación con modelos universitarios WHO-GDHI, FACS, Stanford Sleepiness',
                icon: '🔬',
                color: '#FF6B35',
                base_price: 150.00,
                display_order: 25
            },
            {
                module_key: 'biometric-verification',
                name: 'Verificación Biométrica',
                description: 'Sistema avanzado de verificación biométrica',
                icon: '🔒',
                color: '#8E44AD',
                base_price: 120.00,
                display_order: 26
            },
            {
                module_key: 'fingerprint-capture',
                name: 'Captura de Huellas',
                description: 'Sistema de captura y análisis de huellas dactilares',
                icon: '👆',
                color: '#E74C3C',
                base_price: 100.00,
                display_order: 27
            },
            {
                module_key: 'real-face-capture',
                name: 'Captura Facial Real',
                description: 'Captura y análisis de características faciales en tiempo real',
                icon: '📸',
                color: '#3498DB',
                base_price: 130.00,
                display_order: 28
            },
            {
                module_key: 'psychological-assessment',
                name: 'Evaluación Psicológica',
                description: 'Sistema de evaluación psicológica de empleados',
                icon: '🧠',
                color: '#9B59B6',
                base_price: 180.00,
                display_order: 29
            },
            {
                module_key: 'vacation-management',
                name: 'Gestión de Vacaciones',
                description: 'Sistema completo de gestión de vacaciones y licencias',
                icon: '🏖️',
                color: '#1ABC9C',
                base_price: 90.00,
                display_order: 30
            },
            {
                module_key: 'sanctions-management',
                name: 'Gestión de Sanciones',
                description: 'Control y gestión de sanciones disciplinarias',
                icon: '⚠️',
                color: '#E67E22',
                base_price: 110.00,
                display_order: 31
            },
            {
                module_key: 'licensing-management',
                name: 'Gestión de Licencias',
                description: 'Administración de licencias profesionales y permisos',
                icon: '📋',
                color: '#34495E',
                base_price: 95.00,
                display_order: 32
            },
            {
                module_key: 'terms-conditions',
                name: 'Términos y Condiciones',
                description: 'Gestión de términos y condiciones legales',
                icon: '📄',
                color: '#7F8C8D',
                base_price: 60.00,
                display_order: 33
            },
            {
                module_key: 'fehaciente-consent',
                name: 'Consentimiento Fehaciente',
                description: 'Sistema de consentimiento digital con validez legal',
                icon: '✅',
                color: '#27AE60',
                base_price: 85.00,
                display_order: 34
            },
            {
                module_key: 'google-maps-integration',
                name: 'Integración Google Maps',
                description: 'Integración avanzada con Google Maps para geolocalización',
                icon: '🗺️',
                color: '#16A085',
                base_price: 120.00,
                display_order: 35
            },
            {
                module_key: 'user-authentication',
                name: 'Autenticación de Usuario',
                description: 'Sistema avanzado de autenticación y seguridad',
                icon: '🔐',
                color: '#2C3E50',
                base_price: 80.00,
                display_order: 36
            },
            {
                module_key: 'access-control',
                name: 'Control de Acceso',
                description: 'Sistema de control de acceso físico y digital',
                icon: '🚪',
                color: '#8B4513',
                base_price: 140.00,
                display_order: 37
            },
            {
                module_key: 'super-admin-auth',
                name: 'Autenticación Super Admin',
                description: 'Sistema de autenticación para super administradores',
                icon: '👑',
                color: '#FFD700',
                base_price: 200.00,
                display_order: 38
            },
            {
                module_key: 'medical-config',
                name: 'Configuración Médica',
                description: 'Configuraciones específicas del módulo médico',
                icon: '⚕️',
                color: '#FF69B4',
                base_price: 160.00,
                display_order: 39
            },
            {
                module_key: 'notifications-complete',
                name: 'Notificaciones Completas',
                description: 'Sistema completo de notificaciones avanzadas',
                icon: '🔔',
                color: '#FF4500',
                base_price: 75.00,
                display_order: 40
            },
            {
                module_key: 'notifications-simple',
                name: 'Notificaciones Simples',
                description: 'Sistema básico de notificaciones',
                icon: '📢',
                color: '#32CD32',
                base_price: 45.00,
                display_order: 41
            },
            {
                module_key: 'notifications-fixed',
                name: 'Notificaciones Fijas',
                description: 'Sistema de notificaciones con configuración fija',
                icon: '📌',
                color: '#6495ED',
                base_price: 50.00,
                display_order: 42
            },
            {
                module_key: 'absence-notifications',
                name: 'Notificaciones de Ausencia',
                description: 'Notificaciones específicas para control de ausencias',
                icon: '📵',
                color: '#DC143C',
                base_price: 65.00,
                display_order: 43
            },
            {
                module_key: 'permissions-test',
                name: 'Test de Permisos',
                description: 'Sistema de testing y validación de permisos',
                icon: '🧪',
                color: '#4B0082',
                base_price: 70.00,
                display_order: 44
            },
            {
                module_key: 'network',
                name: 'Red y Conectividad',
                description: 'Gestión de red y conectividad del sistema',
                icon: '🌐',
                color: '#00CED1',
                base_price: 110.00,
                display_order: 45
            }
        ];

        console.log(`📦 Agregando ${missingModules.length} módulos faltantes...`);

        let added = 0;
        for (const module of missingModules) {
            try {
                const [result] = await sequelize.query(`
                    INSERT INTO system_modules (
                        id, module_key, name, description, icon, color,
                        base_price, display_order, is_active, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW()
                    ) ON CONFLICT (module_key) DO NOTHING
                `, {
                    replacements: [
                        module.module_key,
                        module.name,
                        module.description,
                        module.icon,
                        module.color,
                        module.base_price,
                        module.display_order
                    ]
                });

                console.log(`✅ ${module.module_key} agregado`);
                added++;
            } catch (error) {
                console.warn(`❌ Error agregando ${module.module_key}:`, error.message);
            }
        }

        // Verificar total de módulos
        const totalModules = await sequelize.query(`
            SELECT COUNT(*) as count FROM system_modules
        `, { type: sequelize.QueryTypes.SELECT });

        console.log(`\n✅ Proceso completado`);
        console.log(`   🆕 Módulos agregados: ${added}`);
        console.log(`   📦 Total módulos en sistema: ${totalModules[0].count}`);

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('🔐 Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    addMissingModules()
        .then(() => {
            console.log('\n🎉 MÓDULOS AGREGADOS EXITOSAMENTE');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { addMissingModules };