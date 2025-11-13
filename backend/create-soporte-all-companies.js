const { sequelize } = require('./src/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

(async () => {
    try {
        // Obtener todas las empresas
        const companies = await sequelize.query(
            'SELECT company_id FROM companies',
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`📋 Encontradas ${companies.length} empresas`);

        const hash = await bcrypt.hash('admin123', 10);
        const now = new Date();

        for (const company of companies) {
            const companyId = company.company_id;

            // Verificar si ya existe
            const existing = await sequelize.query(
                'SELECT usuario FROM users WHERE company_id = :companyId AND usuario = \'soporte\'',
                {
                    replacements: { companyId },
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (existing.length > 0) {
                console.log(`⏭️  Empresa ${companyId}: usuario soporte ya existe`);
                continue;
            }

            // Crear usuario
            const empId = `SOPORTE-${companyId}-${Date.now()}`;
            const dniUnique = `999999${String(companyId).padStart(2, '0')}`;
            await sequelize.query(
                `INSERT INTO users (
                    user_id, "employeeId", usuario, "firstName", "lastName",
                    email, dni, password, role, company_id,
                    "isActive", is_active, email_verified, account_status,
                    "createdAt", "updatedAt"
                ) VALUES (
                    :userId, :employeeId, :usuario, :firstName, :lastName,
                    :email, :dni, :password, :role, :companyId,
                    true, true, true, 'active',
                    :now, :now
                )`,
                {
                    replacements: {
                        userId: uuid(),
                        employeeId: empId,
                        usuario: 'soporte',
                        firstName: 'Soporte',
                        lastName: 'Testing',
                        email: `soporte-${companyId}@testing.local`,
                        dni: dniUnique,
                        password: hash,
                        role: 'admin',
                        companyId,
                        now
                    }
                }
            );

            console.log(`✅ Empresa ${companyId}: usuario soporte creado`);
        }

        console.log('\n✅ Proceso completado');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
