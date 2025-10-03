// ============================================
// PANEL-TRANSPORTE - SOLO MÓDULOS
// ============================================
// 📅 Fecha: 2025-09-23
// 🎯 Objetivo: Insertar solo módulos de transporte (sin empresas por ahora)

const { Sequelize } = require('sequelize');

// Configuración directa de PostgreSQL
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

async function insertModulesOnly() {
    try {
        console.log('🔄 [MODULES] Conectando a PostgreSQL...');

        await sequelize.authenticate();
        console.log('✅ [MODULES] Conectado exitosamente');

        console.log('🔄 [MODULES] Insertando módulos de transporte...');

        // Array con todos los módulos
        const modules = [
            {
                key: 'transport-dashboard',
                name: 'Dashboard Transporte',
                description: 'Panel principal con métricas y KPIs para logística ganadera',
                icon: '📊',
                color: '#28a745',
                price: 1500,
                isCore: true,
                order: 100,
                features: '["Métricas en tiempo real", "KPIs ejecutivos", "Alertas operativas", "Resumen de flota"]'
            },
            {
                key: 'transport-trips',
                name: 'Gestión de Viajes',
                description: 'Planificación, seguimiento y control completo de viajes de ganado',
                icon: '🛣️',
                color: '#007bff',
                price: 2800,
                isCore: false,
                order: 101,
                features: '["Planificación de rutas", "Asignación chofer-vehículo", "Seguimiento en tiempo real", "Control de estados", "Optimización de rutas"]'
            },
            {
                key: 'transport-fleet',
                name: 'Control de Flota',
                description: 'Gestión integral de vehículos especializados en transporte ganadero',
                icon: '🚛',
                color: '#fd7e14',
                price: 2500,
                isCore: false,
                order: 102,
                features: '["Vehículos simples", "Doble jaula", "Acoplados", "Mantenimiento", "Documentación", "Disponibilidad"]'
            },
            {
                key: 'transport-drivers',
                name: 'Gestión de Choferes',
                description: 'Control de personal con sistema de scoring inteligente basado en IA',
                icon: '👥',
                color: '#20c997',
                price: 3200,
                isCore: false,
                order: 103,
                features: '["Perfiles de choferes", "Scoring con IA", "Evaluación de performance", "Licencias y habilitaciones", "Historial de viajes"]'
            },
            {
                key: 'transport-expenses',
                name: 'Control de Gastos',
                description: 'Gestión financiera de combustible y costos operativos',
                icon: '💰',
                color: '#ffc107',
                price: 2200,
                isCore: false,
                order: 104,
                features: '["Combustible", "Peajes", "Mantenimiento", "Reparaciones", "Viáticos", "Reportes financieros"]'
            },
            {
                key: 'transport-reports',
                name: 'Reportes y Analytics',
                description: 'Business Intelligence avanzado para toma de decisiones',
                icon: '📈',
                color: '#6610f2',
                price: 3500,
                isCore: false,
                order: 105,
                features: '["Dashboards ejecutivos", "Análisis predictivo", "Rentabilidad por viaje", "Eficiencia de flota", "Exportación de datos"]'
            },
            {
                key: 'transport-gps',
                name: 'Tracking GPS',
                description: 'Monitoreo en tiempo real con geolocalización avanzada',
                icon: '📍',
                color: '#dc3545',
                price: 4000,
                isCore: false,
                order: 106,
                features: '["Tracking en tiempo real", "Geocercas", "Alertas de ubicación", "Historial de rutas", "Integración con dispositivos GPS"]'
            },
            {
                key: 'transport-clients',
                name: 'Gestión de Clientes',
                description: 'CRM especializado para clientes ganaderos y productores',
                icon: '🏢',
                color: '#17a2b8',
                price: 2600,
                isCore: false,
                order: 107,
                features: '["Base de clientes", "Contratos", "Tarifas", "Historial comercial", "Facturación", "Cobranzas"]'
            },
            {
                key: 'transport-config',
                name: 'Configuración',
                description: 'Parámetros y configuraciones específicas del sistema de transporte',
                icon: '⚙️',
                color: '#6c757d',
                price: 800,
                isCore: true,
                order: 108,
                features: '["Parámetros de flota", "Tipos de vehículos", "Zonas geográficas", "Tarifas", "Usuarios del sistema"]'
            }
        ];

        // Insertar cada módulo
        for (const module of modules) {
            try {
                await sequelize.query(`
                    INSERT INTO system_modules (
                        id, module_key, name, description, icon, color, category,
                        base_price, is_active, is_core, display_order, features,
                        requirements, version, min_employees, max_employees,
                        created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(),
                        '${module.key}',
                        '${module.name}',
                        '${module.description}',
                        '${module.icon}',
                        '${module.color}',
                        'transport',
                        ${module.price},
                        true,
                        ${module.isCore},
                        ${module.order},
                        '${module.features}'::jsonb,
                        '["transport-dashboard"]'::jsonb,
                        '1.0.0',
                        1,
                        null,
                        NOW(),
                        NOW()
                    ) ON CONFLICT (module_key) DO NOTHING;
                `);
                console.log(`✅ [MODULES] ${module.name} insertado`);
            } catch (error) {
                console.warn(`⚠️ [MODULES] Error insertando ${module.name}:`, error.message);
            }
        }

        // Verificar resultados
        console.log('🔍 [MODULES] Verificando módulos insertados...');

        const result = await sequelize.query(
            `SELECT module_key, name, base_price
             FROM system_modules
             WHERE module_key LIKE 'transport-%'
             ORDER BY display_order`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📋 [MODULES] Módulos de transporte disponibles:');
        result.forEach((module, index) => {
            console.log(`   ${index + 1}. ${module.module_key} - ${module.name} ($${module.base_price})`);
        });

        console.log(`🎯 [MODULES] TOTAL: ${result.length} módulos de transporte insertados`);

    } catch (error) {
        console.error('❌ [MODULES] Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('🔐 [MODULES] Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    insertModulesOnly()
        .then(() => {
            console.log('🎉 [MODULES] MÓDULOS DE TRANSPORTE INSERTADOS EXITOSAMENTE');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 [MODULES] FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { insertModulesOnly };