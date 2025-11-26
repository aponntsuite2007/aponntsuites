// ============================================
// PANEL-TRANSPORTE - MIGRACIÓN SIMPLE POSTGRESQL
// ============================================
// 📅 Fecha: 2025-09-23
// 🎯 Objetivo: Migración simplificada usando solo Sequelize

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

async function executeMigration() {
    try {
        console.log('🔄 [MIGRATION] Conectando a PostgreSQL...');

        // Probar conexión
        await sequelize.authenticate();
        console.log('✅ [MIGRATION] Conectado exitosamente');

        // Ejecutar los módulos uno por uno para evitar errores de sintaxis
        console.log('🔄 [MIGRATION] Insertando módulos de transporte...');

        // 1. DASHBOARD TRANSPORTE
        await sequelize.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (gen_random_uuid(), 'transport-dashboard', 'Dashboard Transporte', 'Panel principal con métricas y KPIs para logística ganadera', '📊', '#28a745', 'transport', 1500, true, true, 100, '["Métricas en tiempo real", "KPIs ejecutivos", "Alertas operativas", "Resumen de flota"]'::jsonb, '[]'::jsonb, '1.0.0', 1, null, NOW(), NOW())
            ON CONFLICT (module_key) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Dashboard module inserted');

        // 2. GESTIÓN DE VIAJES
        await sequelize.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (gen_random_uuid(), 'transport-trips', 'Gestión de Viajes', 'Planificación, seguimiento y control completo de viajes de ganado', '🛣️', '#007bff', 'transport', 2800, true, false, 101, '["Planificación de rutas", "Asignación chofer-vehículo", "Seguimiento en tiempo real", "Control de estados", "Optimización de rutas"]'::jsonb, '["transport-dashboard"]'::jsonb, '1.0.0', 3, null, NOW(), NOW())
            ON CONFLICT (module_key) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Trips module inserted');

        // 3. CONTROL DE FLOTA
        await sequelize.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (gen_random_uuid(), 'transport-fleet', 'Control de Flota', 'Gestión integral de vehículos especializados en transporte ganadero', '🚛', '#fd7e14', 'transport', 2500, true, false, 102, '["Vehículos simples", "Doble jaula", "Acoplados", "Mantenimiento", "Documentación", "Disponibilidad"]'::jsonb, '["transport-dashboard"]'::jsonb, '1.0.0', 2, null, NOW(), NOW())
            ON CONFLICT (module_key) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Fleet module inserted');

        // 4. GESTIÓN DE CHOFERES
        await sequelize.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (gen_random_uuid(), 'transport-drivers', 'Gestión de Choferes', 'Control de personal con sistema de scoring inteligente basado en IA', '👥', '#20c997', 'transport', 3200, true, false, 103, '["Perfiles de choferes", "Scoring con IA", "Evaluación de performance", "Licencias y habilitaciones", "Historial de viajes"]'::jsonb, '["transport-dashboard"]'::jsonb, '1.0.0', 1, null, NOW(), NOW())
            ON CONFLICT (module_key) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Drivers module inserted');

        // 5. CONTROL DE GASTOS
        await sequelize.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (gen_random_uuid(), 'transport-expenses', 'Control de Gastos', 'Gestión financiera de combustible y costos operativos', '💰', '#ffc107', 'transport', 2200, true, false, 104, '["Combustible", "Peajes", "Mantenimiento", "Reparaciones", "Viáticos", "Reportes financieros"]'::jsonb, '["transport-dashboard"]'::jsonb, '1.0.0', 1, null, NOW(), NOW())
            ON CONFLICT (module_key) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Expenses module inserted');

        // 6. REPORTES Y ANALYTICS
        await sequelize.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (gen_random_uuid(), 'transport-reports', 'Reportes y Analytics', 'Business Intelligence avanzado para toma de decisiones', '📈', '#6610f2', 'transport', 3500, true, false, 105, '["Dashboards ejecutivos", "Análisis predictivo", "Rentabilidad por viaje", "Eficiencia de flota", "Exportación de datos"]'::jsonb, '["transport-dashboard", "transport-trips"]'::jsonb, '1.0.0', 5, null, NOW(), NOW())
            ON CONFLICT (module_key) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Reports module inserted');

        // 7. TRACKING GPS
        await sequelize.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (gen_random_uuid(), 'transport-gps', 'Tracking GPS', 'Monitoreo en tiempo real con geolocalización avanzada', '📍', '#dc3545', 'transport', 4000, true, false, 106, '["Tracking en tiempo real", "Geocercas", "Alertas de ubicación", "Historial de rutas", "Integración con dispositivos GPS"]'::jsonb, '["transport-trips"]'::jsonb, '1.0.0', 1, null, NOW(), NOW())
            ON CONFLICT (module_key) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] GPS module inserted');

        // 8. GESTIÓN DE CLIENTES
        await sequelize.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (gen_random_uuid(), 'transport-clients', 'Gestión de Clientes', 'CRM especializado para clientes ganaderos y productores', '🏢', '#17a2b8', 'transport', 2600, true, false, 107, '["Base de clientes", "Contratos", "Tarifas", "Historial comercial", "Facturación", "Cobranzas"]'::jsonb, '["transport-dashboard"]'::jsonb, '1.0.0', 1, null, NOW(), NOW())
            ON CONFLICT (module_key) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Clients module inserted');

        // 9. CONFIGURACIÓN
        await sequelize.query(`
            INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
            VALUES (gen_random_uuid(), 'transport-config', 'Configuración', 'Parámetros y configuraciones específicas del sistema de transporte', '⚙️', '#6c757d', 'transport', 800, true, true, 108, '["Parámetros de flota", "Tipos de vehículos", "Zonas geográficas", "Tarifas", "Usuarios del sistema"]'::jsonb, '["transport-dashboard"]'::jsonb, '1.0.0', 1, null, NOW(), NOW())
            ON CONFLICT (module_key) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Config module inserted');

        // Insertar empresas de transporte
        console.log('🔄 [MIGRATION] Insertando empresas de transporte...');

        // Empresa 1: Transportes del Norte
        await sequelize.query(`
            INSERT INTO companies (
              name, slug, display_name, legal_name, description,
              email, phone, address, city, state, country,
              tax_id, registration_number, timezone, locale, currency,
              license_type, subscription_type, max_employees, contracted_employees, max_branches,
              is_active, status, is_trial, active_modules, features,
              primary_color, secondary_color, settings, metadata
            ) VALUES (
              'Transportes del Norte S.A.', 'transportes-norte', 'Transportes del Norte', 'Transportes del Norte S.A.',
              'Empresa especializada en logística ganadera del norte argentino',
              'admin@transportesnorte.com.ar', '+54-387-4567890', 'Ruta 9 Km 1456', 'Salta', 'Salta', 'Argentina',
              '30-68475829-6', 'IG-2023-001', 'America/Argentina/Salta', 'es-AR', 'ARS',
              'enterprise', 'annual', 50, 25, 5,
              true, 'active', false,
              '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-drivers": true, "transport-expenses": true}'::jsonb,
              '{"gps_tracking": true, "biometric_access": false, "advanced_analytics": true}'::jsonb,
              '#28a745', '#20c997',
              '{"transport_zones": ["NOA", "Cuyo"], "fleet_specialization": "ganado_bovino"}'::jsonb,
              '{"created_for": "panel-transporte", "integration_date": "2025-09-23"}'::jsonb
            ) ON CONFLICT (slug) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Transportes del Norte inserted');

        // Empresa 2: Logística del Sur
        await sequelize.query(`
            INSERT INTO companies (
              name, slug, display_name, legal_name, description,
              email, phone, address, city, state, country,
              tax_id, registration_number, timezone, locale, currency,
              license_type, subscription_type, max_employees, contracted_employees, max_branches,
              is_active, status, is_trial, active_modules, features,
              primary_color, secondary_color, settings, metadata
            ) VALUES (
              'Logística del Sur', 'logistica-sur', 'Logística del Sur', 'Logística del Sur S.R.L.',
              'Transporte especializado de ganado en la Patagonia',
              'contacto@logisticasur.com.ar', '+54-297-3456789', 'Av. San Martín 2456', 'Comodoro Rivadavia', 'Chubut', 'Argentina',
              '30-74859631-2', 'IG-2023-002', 'America/Argentina/Buenos_Aires', 'es-AR', 'ARS',
              'professional', 'monthly', 30, 18, 3,
              true, 'active', false,
              '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-expenses": true, "transport-gps": true}'::jsonb,
              '{"gps_tracking": true, "biometric_access": false, "advanced_analytics": false}'::jsonb,
              '#007bff', '#6610f2',
              '{"transport_zones": ["Patagonia"], "fleet_specialization": "ganado_ovino"}'::jsonb,
              '{"created_for": "panel-transporte", "integration_date": "2025-09-23"}'::jsonb
            ) ON CONFLICT (slug) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Logística del Sur inserted');

        // Empresa 3: Ganado Express
        await sequelize.query(`
            INSERT INTO companies (
              name, slug, display_name, legal_name, description,
              email, phone, address, city, state, country,
              tax_id, registration_number, timezone, locale, currency,
              license_type, subscription_type, max_employees, contracted_employees, max_branches,
              is_active, status, is_trial, active_modules, features,
              primary_color, secondary_color, settings, metadata
            ) VALUES (
              'Ganado Express', 'ganado-express', 'Ganado Express', 'Ganado Express S.A.',
              'Servicios express de transporte ganadero en zona pampeana',
              'info@ganadoexpress.com.ar', '+54-221-5678901', 'Ruta 226 Km 45', 'La Plata', 'Buenos Aires', 'Argentina',
              '30-69852741-8', 'IG-2023-003', 'America/Argentina/Buenos_Aires', 'es-AR', 'ARS',
              'enterprise', 'annual', 75, 42, 8,
              true, 'active', false,
              '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-drivers": true, "transport-expenses": true, "transport-reports": true, "transport-gps": true, "transport-clients": true}'::jsonb,
              '{"gps_tracking": true, "biometric_access": true, "advanced_analytics": true}'::jsonb,
              '#fd7e14', '#e83e8c',
              '{"transport_zones": ["Pampa_Húmeda", "CABA"], "fleet_specialization": "mixto"}'::jsonb,
              '{"created_for": "panel-transporte", "integration_date": "2025-09-23"}'::jsonb
            ) ON CONFLICT (slug) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Ganado Express inserted');

        // Empresa 4: Transportes La Pampa
        await sequelize.query(`
            INSERT INTO companies (
              name, slug, display_name, legal_name, description,
              email, phone, address, city, state, country,
              tax_id, registration_number, timezone, locale, currency,
              license_type, subscription_type, max_employees, contracted_employees, max_branches,
              is_active, status, is_trial, active_modules, features,
              primary_color, secondary_color, settings, metadata
            ) VALUES (
              'Transportes La Pampa', 'transportes-pampa', 'Transportes La Pampa', 'Transportes La Pampa Coop. Ltda.',
              'Cooperativa de transportistas especializados en ganado pampeano',
              'cooperativa@transportespampa.coop.ar', '+54-2954-345678', 'Av. Circunvalación 789', 'Santa Rosa', 'La Pampa', 'Argentina',
              '30-85296374-1', 'IG-2023-004', 'America/Argentina/Buenos_Aires', 'es-AR', 'ARS',
              'standard', 'annual', 40, 28, 4,
              true, 'active', false,
              '{"transport-dashboard": true, "transport-trips": true, "transport-fleet": true, "transport-drivers": true, "transport-expenses": true, "transport-clients": true}'::jsonb,
              '{"gps_tracking": true, "biometric_access": false, "advanced_analytics": false}'::jsonb,
              '#20c997', '#6f42c1',
              '{"transport_zones": ["La_Pampa", "Córdoba"], "fleet_specialization": "ganado_bovino"}'::jsonb,
              '{"created_for": "panel-transporte", "integration_date": "2025-09-23"}'::jsonb
            ) ON CONFLICT (slug) DO NOTHING;
        `);
        console.log('✅ [MIGRATION] Transportes La Pampa inserted');

        // Verificar resultados
        console.log('🔍 [MIGRATION] Verificando resultados...');

        const modulesResult = await sequelize.query(
            `SELECT COUNT(*) as count FROM system_modules WHERE module_key LIKE 'transport-%'`,
            { type: sequelize.QueryTypes.SELECT }
        );
        console.log(`✅ [MIGRATION] Módulos de transporte: ${modulesResult[0].count}`);

        const companiesResult = await sequelize.query(
            `SELECT COUNT(*) as count FROM companies WHERE metadata->>'created_for' = 'panel-transporte'`,
            { type: sequelize.QueryTypes.SELECT }
        );
        console.log(`✅ [MIGRATION] Empresas de transporte: ${companiesResult[0].count}`);

        // Listar empresas
        const companiesList = await sequelize.query(
            `SELECT company_id, name, slug FROM companies WHERE metadata->>'created_for' = 'panel-transporte' ORDER BY name`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log('📋 [MIGRATION] Empresas disponibles:');
        companiesList.forEach((company, index) => {
            console.log(`   ${index + 1}. ${company.name} (${company.slug}) - ID: ${company.company_id}`);
        });

        console.log('🎯 [MIGRATION] MIGRACIÓN COMPLETADA EXITOSAMENTE');

    } catch (error) {
        console.error('❌ [MIGRATION] Error:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('🔐 [MIGRATION] Conexión cerrada');
    }
}

// Ejecutar
if (require.main === module) {
    executeMigration()
        .then(() => {
            console.log('🎉 [MIGRATION] PANEL-TRANSPORTE INTEGRADO A POSTGRESQL EXITOSAMENTE');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 [MIGRATION] FALLO:', error.message);
            process.exit(1);
        });
}

module.exports = { executeMigration };