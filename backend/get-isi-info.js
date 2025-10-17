const database = require('./src/config/database');

async function getISIInfo() {
    try {
        await database.connect();

        // Buscar empresa ISI
        const [companies] = await database.sequelize.query(`
            SELECT *
            FROM companies
            WHERE slug = 'isi' OR LOWER(name) LIKE '%isi%'
            LIMIT 1
        `);

        if (companies.length === 0) {
            console.log('❌ No se encontró la empresa ISI');
            console.log('Empresas disponibles:');
            const [allCompanies] = await database.sequelize.query(`
                SELECT id, name, slug FROM companies WHERE is_active = true
            `);
            allCompanies.forEach(c => {
                console.log(`  - ID: ${c.id}, Name: ${c.name}, Slug: ${c.slug}`);
            });
            process.exit(1);
        }

        const company = companies[0];
        console.log('✅ Empresa ISI encontrada:');
        console.log(JSON.stringify(company, null, 2));

        // TODO: Buscar usuarios una vez que sepamos el nombre correcto de la columna ID

        await database.sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

getISIInfo();
