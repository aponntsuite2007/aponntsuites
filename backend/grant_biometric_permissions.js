/**
 * Grant biometric module permissions to admin user
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
    host: 'localhost',
    dialect: 'postgresql',
    port: 5432,
    logging: false
});

async function grantBiometricPermissions() {
    try {
        await sequelize.authenticate();
        console.log('✅ Otorgando permisos del módulo biometric al usuario admin...');

        const userId = '0593f971-8461-4e67-80a1-1fddd18932f4';
        const companyId = 4;

        // 1. Get biometric module actions
        const [moduleActions] = await sequelize.query(`
            SELECT id, action_name, display_name
            FROM module_actions
            WHERE module_id = 'biometric'
        `);

        console.log(`📋 Acciones disponibles para módulo biometric: ${moduleActions.length}`);
        moduleActions.forEach(action => {
            console.log(`  - ${action.action_name}: ${action.display_name}`);
        });

        // 2. Grant all permissions for biometric module
        for (const action of moduleActions) {
            // Check if permission already exists
            const [existing] = await sequelize.query(`
                SELECT id FROM user_permissions
                WHERE user_id = ? AND module_id = 'biometric' AND action_id = ? AND company_id = ?
            `, {
                replacements: [userId, action.id, companyId]
            });

            if (existing.length === 0) {
                // Insert new permission
                await sequelize.query(`
                    INSERT INTO user_permissions (
                        id, user_id, module_id, action_id, company_id,
                        has_access, granted_by, granted_at, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), ?, 'biometric', ?, ?,
                        true, 'system', NOW(), NOW(), NOW()
                    )
                `, {
                    replacements: [userId, action.id, companyId]
                });
                console.log(`✅ Permiso otorgado: ${action.action_name}`);
            } else {
                // Update existing permission
                await sequelize.query(`
                    UPDATE user_permissions
                    SET has_access = true, updated_at = NOW(), revoked_at = NULL
                    WHERE user_id = ? AND module_id = 'biometric' AND action_id = ? AND company_id = ?
                `, {
                    replacements: [userId, action.id, companyId]
                });
                console.log(`✅ Permiso actualizado: ${action.action_name}`);
            }
        }

        // 3. If no actions exist, create basic ones
        if (moduleActions.length === 0) {
            console.log('🔧 Creando acciones básicas para módulo biometric...');

            const basicActions = [
                { action: 'view', display: 'Ver Biométrico' },
                { action: 'manage', display: 'Gestionar Biométrico' },
                { action: 'configure', display: 'Configurar Biométrico' }
            ];

            for (const basicAction of basicActions) {
                // Create module action
                const [actionResult] = await sequelize.query(`
                    INSERT INTO module_actions (
                        id, module_id, action_name, display_name, description, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), 'biometric', ?, ?, 'Acción automática para módulo biometric', NOW(), NOW()
                    ) RETURNING id
                `, {
                    replacements: [basicAction.action, basicAction.display]
                });

                const actionId = actionResult[0].id;

                // Grant permission to user
                await sequelize.query(`
                    INSERT INTO user_permissions (
                        id, user_id, module_id, action_id, company_id,
                        has_access, granted_by, granted_at, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), ?, 'biometric', ?, ?,
                        true, 'system', NOW(), NOW(), NOW()
                    )
                `, {
                    replacements: [userId, actionId, companyId]
                });

                console.log(`✅ Acción creada y permiso otorgado: ${basicAction.action}`);
            }
        }

        // 4. Verify final result
        const [finalCheck] = await sequelize.query(`
            SELECT up.has_access, ma.action_name, ma.display_name
            FROM user_permissions up
            JOIN module_actions ma ON up.action_id = ma.id
            WHERE up.user_id = ? AND up.module_id = 'biometric' AND up.company_id = ?
              AND (up.revoked_at IS NULL OR up.revoked_at > NOW())
        `, {
            replacements: [userId, companyId]
        });

        console.log(`\n🎯 PERMISOS FINALES del usuario para biometric: ${finalCheck.length}`);
        finalCheck.forEach(perm => {
            console.log(`  ✅ ${perm.action_name}: ${perm.display_name} (activo: ${perm.has_access})`);
        });

        console.log('\n🎉 ¡Permisos otorgados! Ahora recarga el panel-empresa.html para ver "Control Biométrico"');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

grantBiometricPermissions();