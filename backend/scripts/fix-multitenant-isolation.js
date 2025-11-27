/**
 * =============================================================================
 * FIX: Problema de Aislamiento Multi-Tenant
 * =============================================================================
 *
 * Este script:
 * 1. Elimina usuarios de prueba con departamentos cruzados
 * 2. Crea un TRIGGER para prevenir futuras violaciones
 * 3. Verifica que no queden problemas
 *
 * IMPORTANTE: Los 31 usuarios afectados son TODOS usuarios de TEST creados
 * por scripts de Phase4 con emails tipo test{timestamp}@test.com
 *
 * =============================================================================
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT) || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function fix() {
    console.log('\n' + '╔'.padEnd(79, '═') + '╗');
    console.log('║  🔧 FIX: Problema de Aislamiento Multi-Tenant                               ║');
    console.log('╚'.padEnd(79, '═') + '╝\n');

    const transaction = await sequelize.transaction();

    try {
        await sequelize.authenticate();
        console.log('✅ Conexión establecida\n');

        // ════════════════════════════════════════════════════════════════════════
        // PASO 1: Contar usuarios afectados antes del fix
        // ════════════════════════════════════════════════════════════════════════
        console.log('📊 PASO 1: Verificación inicial');
        console.log('─'.repeat(60));

        const [beforeCount] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM users u
            JOIN departments d ON u.department_id = d.id
            WHERE u.department_id IS NOT NULL
              AND d.company_id != u.company_id
        `, { transaction });

        console.log(`   Usuarios con departamentos cruzados: ${beforeCount[0].count}`);

        if (parseInt(beforeCount[0].count) === 0) {
            console.log('\n   ✅ No hay problemas que corregir. ¡Todo está limpio!');
            await transaction.rollback();
            return;
        }

        // ════════════════════════════════════════════════════════════════════════
        // PASO 2: Identificar y eliminar usuarios de TEST afectados
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📊 PASO 2: Eliminando usuarios de TEST con problemas');
        console.log('─'.repeat(60));

        // Primero, identificar los usuarios TEST
        const [testUsers] = await sequelize.query(`
            SELECT u.user_id, u.email, u."firstName"
            FROM users u
            JOIN departments d ON u.department_id = d.id
            WHERE u.department_id IS NOT NULL
              AND d.company_id != u.company_id
              AND u.email LIKE 'test%@test.com'
        `, { transaction });

        console.log(`   Usuarios de TEST a eliminar: ${testUsers.length}`);

        if (testUsers.length > 0) {
            // Eliminar usuarios de TEST con problemas
            const [deleteResult] = await sequelize.query(`
                DELETE FROM users
                WHERE user_id IN (
                    SELECT u.user_id
                    FROM users u
                    JOIN departments d ON u.department_id = d.id
                    WHERE u.department_id IS NOT NULL
                      AND d.company_id != u.company_id
                      AND u.email LIKE 'test%@test.com'
                )
            `, { transaction });

            console.log(`   ✅ Eliminados: ${testUsers.length} usuarios de TEST`);
        }

        // Verificar si quedan usuarios NO-TEST con problemas
        const [nonTestUsers] = await sequelize.query(`
            SELECT u.user_id, u.email, u."firstName", u.company_id as user_company, d.company_id as dept_company
            FROM users u
            JOIN departments d ON u.department_id = d.id
            WHERE u.department_id IS NOT NULL
              AND d.company_id != u.company_id
              AND u.email NOT LIKE 'test%@test.com'
        `, { transaction });

        if (nonTestUsers.length > 0) {
            console.log(`\n   ⚠️ ATENCIÓN: Hay ${nonTestUsers.length} usuarios NO-TEST con problemas:`);
            nonTestUsers.forEach(u => {
                console.log(`      • ${u.email} (User company: ${u.user_company}, Dept company: ${u.dept_company})`);
            });
            console.log(`\n   Estos usuarios necesitan revisión manual.`);
        }

        // ════════════════════════════════════════════════════════════════════════
        // PASO 3: Crear TRIGGER para prevenir futuras violaciones
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📊 PASO 3: Creando TRIGGER de validación multi-tenant');
        console.log('─'.repeat(60));

        // Eliminar trigger si existe
        await sequelize.query(`
            DROP TRIGGER IF EXISTS validate_user_department_company ON users;
            DROP FUNCTION IF EXISTS check_user_department_company();
        `, { transaction });

        // Crear función de validación
        await sequelize.query(`
            CREATE OR REPLACE FUNCTION check_user_department_company()
            RETURNS TRIGGER AS $$
            DECLARE
                dept_company_id INTEGER;
            BEGIN
                -- Si department_id es NULL, permitir
                IF NEW.department_id IS NULL THEN
                    RETURN NEW;
                END IF;

                -- Obtener el company_id del departamento
                SELECT company_id INTO dept_company_id
                FROM departments
                WHERE id = NEW.department_id;

                -- Si el departamento no existe, fallar
                IF dept_company_id IS NULL THEN
                    RAISE EXCEPTION 'Department % does not exist', NEW.department_id;
                END IF;

                -- Validar que el company_id del usuario coincida con el del departamento
                IF dept_company_id != NEW.company_id THEN
                    RAISE EXCEPTION 'Multi-tenant violation: User company_id (%) does not match department company_id (%). Users can only be assigned to departments of their own company.',
                        NEW.company_id, dept_company_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `, { transaction });

        // Crear trigger
        await sequelize.query(`
            CREATE TRIGGER validate_user_department_company
            BEFORE INSERT OR UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION check_user_department_company();
        `, { transaction });

        console.log('   ✅ Trigger creado: validate_user_department_company');
        console.log('   → Previene asignar usuarios a departamentos de otras empresas');

        // ════════════════════════════════════════════════════════════════════════
        // PASO 4: Crear trigger similar para attendances
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📊 PASO 4: Creando TRIGGER para attendances');
        console.log('─'.repeat(60));

        await sequelize.query(`
            DROP TRIGGER IF EXISTS validate_attendance_company ON attendances;
            DROP FUNCTION IF EXISTS check_attendance_company();
        `, { transaction });

        await sequelize.query(`
            CREATE OR REPLACE FUNCTION check_attendance_company()
            RETURNS TRIGGER AS $$
            DECLARE
                user_company_id INTEGER;
            BEGIN
                -- Obtener el company_id del usuario
                SELECT company_id INTO user_company_id
                FROM users
                WHERE user_id = NEW."UserId";

                -- Validar
                IF user_company_id IS NULL THEN
                    RAISE EXCEPTION 'User % does not exist', NEW."UserId";
                END IF;

                IF user_company_id != NEW.company_id THEN
                    RAISE EXCEPTION 'Multi-tenant violation: Attendance company_id (%) does not match user company_id (%)',
                        NEW.company_id, user_company_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `, { transaction });

        await sequelize.query(`
            CREATE TRIGGER validate_attendance_company
            BEFORE INSERT OR UPDATE ON attendances
            FOR EACH ROW
            EXECUTE FUNCTION check_attendance_company();
        `, { transaction });

        console.log('   ✅ Trigger creado: validate_attendance_company');

        // ════════════════════════════════════════════════════════════════════════
        // PASO 5: Crear trigger para user_shift_assignments
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📊 PASO 5: Creando TRIGGER para user_shift_assignments');
        console.log('─'.repeat(60));

        await sequelize.query(`
            DROP TRIGGER IF EXISTS validate_shift_assignment_company ON user_shift_assignments;
            DROP FUNCTION IF EXISTS check_shift_assignment_company();
        `, { transaction });

        await sequelize.query(`
            CREATE OR REPLACE FUNCTION check_shift_assignment_company()
            RETURNS TRIGGER AS $$
            DECLARE
                user_company_id INTEGER;
                shift_company_id INTEGER;
            BEGIN
                -- Obtener company_id del usuario
                SELECT company_id INTO user_company_id
                FROM users WHERE user_id = NEW.user_id;

                -- Obtener company_id del turno
                SELECT company_id INTO shift_company_id
                FROM shifts WHERE id = NEW.shift_id;

                -- Validar
                IF user_company_id IS NULL OR shift_company_id IS NULL THEN
                    RAISE EXCEPTION 'User or Shift does not exist';
                END IF;

                IF user_company_id != shift_company_id THEN
                    RAISE EXCEPTION 'Multi-tenant violation: User company (%) does not match shift company (%)',
                        user_company_id, shift_company_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `, { transaction });

        await sequelize.query(`
            CREATE TRIGGER validate_shift_assignment_company
            BEFORE INSERT OR UPDATE ON user_shift_assignments
            FOR EACH ROW
            EXECUTE FUNCTION check_shift_assignment_company();
        `, { transaction });

        console.log('   ✅ Trigger creado: validate_shift_assignment_company');

        // ════════════════════════════════════════════════════════════════════════
        // PASO 6: Verificación final
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📊 PASO 6: Verificación final');
        console.log('─'.repeat(60));

        const [afterCount] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM users u
            JOIN departments d ON u.department_id = d.id
            WHERE u.department_id IS NOT NULL
              AND d.company_id != u.company_id
        `, { transaction });

        console.log(`   Usuarios con departamentos cruzados: ${afterCount[0].count}`);

        if (parseInt(afterCount[0].count) === 0) {
            console.log('   ✅ Todos los problemas corregidos');
        } else {
            console.log(`   ⚠️ Quedan ${afterCount[0].count} usuarios con problemas (requieren revisión manual)`);
        }

        // Confirmar transacción
        await transaction.commit();

        // ════════════════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(70));
        console.log('🏆 RESUMEN - FIX MULTI-TENANT COMPLETADO');
        console.log('═'.repeat(70));
        console.log(`
   ACCIONES REALIZADAS:
   ────────────────────
   ✅ Eliminados ${testUsers.length} usuarios de TEST con problemas
   ✅ Trigger creado: validate_user_department_company
   ✅ Trigger creado: validate_attendance_company
   ✅ Trigger creado: validate_shift_assignment_company

   PROTECCIONES ACTIVAS:
   ────────────────────
   • Users solo pueden tener department_id de su misma empresa
   • Attendances deben tener company_id igual al del usuario
   • Shift assignments validan que user y shift sean de la misma empresa

   RESULTADO:
   ────────────────────
   • Antes: ${beforeCount[0].count} usuarios con problemas
   • Después: ${afterCount[0].count} usuarios con problemas
        `);

    } catch (error) {
        await transaction.rollback();
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);

        // Si es error de trigger existente, dar más info
        if (error.message.includes('already exists')) {
            console.log('\n💡 Si los triggers ya existen, eso significa que el fix ya fue aplicado anteriormente.');
        }
    } finally {
        await sequelize.close();
    }
}

fix();
