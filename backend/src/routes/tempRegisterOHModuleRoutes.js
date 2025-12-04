/**
 * Endpoint TEMPORAL para registrar OH Phase 2 y asignarlo a ISI
 * Usa el pool del servidor (que SÍ funciona)
 * SE PUEDE ELIMINAR DESPUÉS DEL REGISTRO EXITOSO
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/temp/register-oh-module
 * Registra OH-V6 Phase 2 y lo asigna a empresa ISI
 */
router.post('/register-oh-module', async (req, res) => {
    const pool = req.app.locals.pool;

    if (!pool) {
        return res.status(500).json({
            success: false,
            error: 'Pool no disponible'
        });
    }

    console.log('\n🚀 Iniciando registro de OH-V6 Phase 2...\n');

    try {
        // PASO 1: Registrar módulo en tabla "modules"
        console.log('📝 PASO 1: Registrando módulo...');

        const insertModuleSQL = `
            INSERT INTO modules (
                module_key, name, description, icon, color, category, base_price,
                is_core, is_active, display_order, features, requirements,
                bundled_modules, available_in, provides_to, integrates_with,
                metadata, version, rubro, created_at, updated_at
            ) VALUES (
                'occupational-health-phase2',
                'Salud Ocupacional - Phase 2',
                'Analytics avanzado, carga masiva (CSV/Excel), reportes PDF, notificaciones digest, exportación Excel/CSV y audit trail completo para certificaciones OH',
                '🏥', '#00897B', 'medical', 5.00, FALSE, TRUE, 22,
                ARRAY[
                    'OH-V6-14: Dashboard Analytics & Graphs',
                    'OH-V6-15: Bulk Upload Certifications (CSV/Excel)',
                    'OH-V6-16: PDF Reports Generator',
                    'OH-V6-17: Advanced Notifications (Digest Emails)',
                    'OH-V6-18: Data Export System (Excel/CSV)',
                    'OH-V6-19: Audit Trail & Activity Log'
                ],
                ARRAY['users', 'medical'],
                ARRAY[]::text[],
                'company',
                ARRAY[]::text[],
                ARRAY['medical-dashboard', 'notifications-enterprise', 'art-management'],
                jsonb_build_object(
                    'frontend_file', '/js/modules/occupational-health-phase2.js',
                    'init_function', 'initOHPhase2Dashboard',
                    'bundling_enabled', false,
                    'has_dependencies', true,
                    'availability_scope', 'company',
                    'endpoints', 17,
                    'version', '6.0.0-phase2'
                ),
                '6.0.0', 'Salud Ocupacional', NOW(), NOW()
            )
            ON CONFLICT (module_key) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                features = EXCLUDED.features,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING id, module_key, name
        `;

        const moduleResult = await pool.query(insertModuleSQL);

        if (moduleResult.rows && moduleResult.rows.length > 0) {
            const module = moduleResult.rows[0];
            console.log('✅ Módulo registrado:');
            console.log(`   ID: ${module.id}`);
            console.log(`   Key: ${module.module_key}`);
            console.log(`   Name: ${module.name}\n`);

            // PASO 2: Activar para empresa ISI (company_id = 11)
            console.log('📝 PASO 2: Activando módulo para ISI (company_id: 11)...');

            const activateModuleSQL = `
                INSERT INTO company_modules (company_id, module_id, is_active, activated_at, created_at, updated_at)
                VALUES (11, $1, TRUE, NOW(), NOW(), NOW())
                ON CONFLICT (company_id, module_id) DO UPDATE SET
                    is_active = TRUE,
                    activated_at = NOW(),
                    updated_at = NOW()
                RETURNING *
            `;

            const activationResult = await pool.query(activateModuleSQL, [module.id]);

            if (activationResult.rows && activationResult.rows.length > 0) {
                console.log('✅ Módulo activado para ISI\n');

                // PASO 3: Verificar
                console.log('📝 PASO 3: Verificando activación...');

                const verifySQL = `
                    SELECT
                        c.name AS empresa,
                        c.company_id,
                        m.module_key,
                        m.name AS module_name,
                        cm.is_active,
                        cm.activated_at
                    FROM company_modules cm
                    JOIN companies c ON c.company_id = cm.company_id
                    JOIN modules m ON m.id = cm.module_id
                    WHERE m.module_key = 'occupational-health-phase2'
                      AND c.company_id = 11
                `;

                const verifyResult = await pool.query(verifySQL);

                if (verifyResult.rows && verifyResult.rows.length > 0) {
                    const verification = verifyResult.rows[0];
                    console.log('✅ Verificación exitosa:');
                    console.log('=====================================');
                    console.log(`   Empresa: ${verification.empresa}`);
                    console.log(`   Company ID: ${verification.company_id}`);
                    console.log(`   Módulo: ${verification.module_name}`);
                    console.log(`   Key: ${verification.module_key}`);
                    console.log(`   Activo: ${verification.is_active}`);
                    console.log(`   Activado: ${new Date(verification.activated_at).toLocaleString()}`);
                    console.log('=====================================\n');

                    console.log('🎉 ¡COMPLETADO! Módulo OH-V6 Phase 2 registrado y activado para ISI');
                    console.log('   Visible en: http://localhost:9998/panel-empresa.html → Módulos del Sistema\n');

                    return res.json({
                        success: true,
                        message: 'Módulo OH-V6 Phase 2 registrado y activado exitosamente',
                        module: {
                            id: module.id,
                            key: module.module_key,
                            name: module.name
                        },
                        company: {
                            id: verification.company_id,
                            name: verification.empresa
                        },
                        activation: {
                            is_active: verification.is_active,
                            activated_at: verification.activated_at
                        }
                    });
                } else {
                    throw new Error('No se pudo verificar la activación del módulo');
                }
            } else {
                throw new Error('No se pudo activar el módulo para ISI');
            }
        } else {
            throw new Error('No se pudo registrar el módulo');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;
