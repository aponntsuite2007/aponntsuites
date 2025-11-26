/**
 * Grant biometric module permissions to admin user - CORRECT VERSION
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
        const moduleId = 'biometric';

        // 1. Check if module_actions exist for biometric
        const [existingActions] = await sequelize.query(`
            SELECT * FROM module_actions WHERE module_key = ?
        `, {
            replacements: [moduleId]
        });

        console.log(`📋 Acciones existentes para módulo ${moduleId}: ${existingActions.length}`);

        let actionsToGrant = [];

        if (existingActions.length > 0) {
            actionsToGrant = existingActions;
            existingActions.forEach(action => {
                console.log(`  - ${action.action_name}: ${action.display_name}`);
            });
        } else {
            console.log('🔧 No hay acciones definidas. Creando acciones básicas...');

            const basicActions = [
                { id: 'biometric:view', action: 'view', display: 'Ver Control Biométrico' },
                { id: 'biometric:manage', action: 'manage', display: 'Gestionar Control Biométrico' },
                { id: 'biometric:configure', action: 'configure', display: 'Configurar Control Biométrico' }
            ];

            for (const basicAction of basicActions) {
                await sequelize.query(`
                    INSERT INTO module_actions (
                        id, module_key, action_name, display_name, description, is_active, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, true, NOW(), NOW()
                    )
                `, {
                    replacements: [
                        basicAction.id,
                        moduleId,
                        basicAction.action,
                        basicAction.display,
                        'Acción automática para módulo biometric'
                    ]
                });

                actionsToGrant.push({
                    id: basicAction.id,
                    action_name: basicAction.action,
                    display_name: basicAction.display
                });

                console.log(`✅ Acción creada: ${basicAction.action}`);
            }
        }

        // 2. Grant permissions for each action
        for (const action of actionsToGrant) {
            // Check if permission already exists
            const [existing] = await sequelize.query(`
                SELECT id, has_access FROM user_permissions
                WHERE user_id = ? AND module_id = ? AND action_id = ? AND company_id = ?
            `, {
                replacements: [userId, moduleId, action.id, companyId]
            });

            if (existing.length === 0) {
                // Insert new permission
                await sequelize.query(`
                    INSERT INTO user_permissions (
                        id, user_id, company_id, module_id, action_id,
                        has_access, granted_by, granted_at, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), ?, ?, ?, ?,
                        true, ?, NOW(), NOW(), NOW()
                    )
                `, {
                    replacements: [userId, companyId, moduleId, action.id, userId]
                });
                console.log(`✅ Permiso otorgado: ${action.action_name}`);
            } else {
                if (!existing[0].has_access) {
                    // Update existing permission to grant access
                    await sequelize.query(`
                        UPDATE user_permissions
                        SET has_access = true, updated_at = NOW(), revoked_at = NULL
                        WHERE user_id = ? AND module_id = ? AND action_id = ? AND company_id = ?
                    `, {
                        replacements: [userId, moduleId, action.id, companyId]
                    });
                    console.log(`✅ Permiso actualizado: ${action.action_name}`);
                } else {
                    console.log(`✅ Permiso ya existe: ${action.action_name}`);
                }
            }
        }

        // 3. Verify final result
        const [finalCheck] = await sequelize.query(`
            SELECT up.has_access, up.action_id, ma.action_name, ma.display_name
            FROM user_permissions up
            LEFT JOIN module_actions ma ON up.action_id = ma.id
            WHERE up.user_id = ? AND up.module_id = ? AND up.company_id = ?
              AND (up.revoked_at IS NULL OR up.revoked_at > NOW())
            ORDER BY up.action_id
        `, {
            replacements: [userId, moduleId, companyId]
        });

        console.log(`\n🎯 PERMISOS FINALES del usuario para ${moduleId}: ${finalCheck.length}`);
        finalCheck.forEach(perm => {
            console.log(`  ✅ ${perm.action_id}: ${perm.display_name || 'N/A'} (activo: ${perm.has_access})`);
        });

        console.log('\n🎉 ¡Permisos otorgados exitosamente!');
        console.log('💡 Ahora recarga http://localhost:9998/panel-empresa.html para ver "Control Biométrico"');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await sequelize.close();
    }
}

grantBiometricPermissions();