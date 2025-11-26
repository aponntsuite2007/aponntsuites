/**
 * Seed ISI company data to production (Render)
 * This script creates the ISI company with its modules
 */
const { Sequelize } = require('sequelize');

async function seedISI() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL not set');
        process.exit(1);
    }

    const sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: { require: true, rejectUnauthorized: false }
        }
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Render database');

        // Check if ISI already exists
        const [existing] = await sequelize.query(
            "SELECT id FROM companies WHERE slug = 'isi' OR name = 'ISI'"
        );
        
        if (existing.length > 0) {
            console.log('⚠️ ISI company already exists with id:', existing[0].id);
            return;
        }

        // Create ISI company
        console.log('📝 Creating ISI company...');
        await sequelize.query(`
            INSERT INTO companies (
                name, slug, legal_name, tax_id, contact_email, contact_phone,
                address, city, province, country, license_type, max_employees,
                contracted_employees, is_active, created_at, updated_at
            ) VALUES (
                'ISI', 'isi', 'ISI', '20-77777777-7', 'admin@isi.com', '+54 2657 673741',
                'Villa Mercedes, San Luis, Argentina', 'Villa Mercedes', 'San Luis', 'Argentina',
                'premium', 100, 10, true, NOW(), NOW()
            )
        `);

        // Get the new company ID
        const [newCompany] = await sequelize.query(
            "SELECT id FROM companies WHERE slug = 'isi'"
        );
        const companyId = newCompany[0].id;
        console.log('✅ ISI company created with ID:', companyId);

        // Assign core modules
        const coreModules = [
            'users', 'companies', 'settings', 'dashboard', 'support-base',
            'attendance', 'departments', 'shifts', 'kiosks', 'biometric-dashboard',
            'medical-dashboard', 'vacation', 'notifications-enterprise',
            'payroll-liquidation', 'art-management', 'document-management',
            'training-management', 'employee-map', 'job-postings', 'sanctions-management',
            'access-control', 'employee-360', 'ai-assistant', 'auditor'
        ];

        console.log('📦 Assigning modules...');
        for (const moduleKey of coreModules) {
            try {
                await sequelize.query(`
                    INSERT INTO company_modules (company_id, module_key, is_active, created_at, updated_at)
                    VALUES (${companyId}, '${moduleKey}', true, NOW(), NOW())
                    ON CONFLICT (company_id, module_key) DO NOTHING
                `);
            } catch (e) {
                // Ignore if already exists
            }
        }
        console.log('✅ Assigned', coreModules.length, 'modules');

        // Create admin user for ISI
        console.log('👤 Creating admin user...');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await sequelize.query(`
            INSERT INTO users (
                "firstName", "lastName", email, password, role, "companyId", 
                username, "isActive", created_at, updated_at
            ) VALUES (
                'Administrador', 'ISI', 'admin@isi.com', '${hashedPassword}', 'admin', ${companyId},
                'administrador', true, NOW(), NOW()
            )
            ON CONFLICT (email) DO NOTHING
        `);
        console.log('✅ Admin user created');

        console.log('\n🎉 ISI setup complete!');
        console.log('Login credentials:');
        console.log('  Company: isi');
        console.log('  Username: administrador');
        console.log('  Password: admin123');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

seedISI();
