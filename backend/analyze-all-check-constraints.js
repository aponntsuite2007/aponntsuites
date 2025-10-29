/**
 * ANÁLISIS: Obtener todos los CHECK constraints de las tablas médicas
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function analyzeAllConstraints() {
    console.log('\n' + '█'.repeat(80));
    console.log('🔍 ANÁLISIS: CHECK CONSTRAINTS DE TABLAS MÉDICAS');
    console.log('█'.repeat(80) + '\n');

    const tables = [
        'user_education',
        'user_chronic_conditions',
        'user_allergies',
        'user_vaccinations',
        'user_medical_exams'
    ];

    for (const table of tables) {
        console.log(`\n📋 Tabla: ${table}`);
        console.log('─'.repeat(80));

        const [results] = await sequelize.query(`
            SELECT con.conname AS constraint_name,
                   pg_get_constraintdef(con.oid) AS constraint_definition
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = '${table}'
              AND con.contype = 'c';
        `);

        if (results.length === 0) {
            console.log('   ✅ Sin CHECK constraints\n');
        } else {
            results.forEach(r => {
                console.log(`   🔒 ${r.constraint_name}`);
                console.log(`      ${r.constraint_definition}\n`);
            });
        }
    }

    await sequelize.close();
}

analyzeAllConstraints().catch(error => {
    console.error('❌ ERROR:', error);
    process.exit(1);
});
