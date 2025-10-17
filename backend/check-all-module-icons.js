const database = require('./src/config/database');

async function checkAllIcons() {
    try {
        await database.connect();

        const [modules] = await database.sequelize.query(`
            SELECT id, module_key, name, icon
            FROM system_modules
            ORDER BY name
        `);

        console.log(`\n📊 TODOS LOS MÓDULOS (${modules.length}):\n`);

        const withFontAwesome = [];
        const withoutFontAwesome = [];

        modules.forEach(m => {
            if (!m.icon) {
                withoutFontAwesome.push(m);
                console.log(`❌ ${m.name.padEnd(40)} | ${m.module_key.padEnd(35)} | ICON: NULL`);
            } else if (m.icon.includes('fa-')) {
                withFontAwesome.push(m);
                console.log(`✅ ${m.name.padEnd(40)} | ${m.module_key.padEnd(35)} | ${m.icon}`);
            } else {
                withoutFontAwesome.push(m);
                console.log(`⚠️  ${m.name.padEnd(40)} | ${m.module_key.padEnd(35)} | "${m.icon}"`);
            }
        });

        console.log(`\n📊 RESUMEN:`);
        console.log(`   ✅ Con Font Awesome: ${withFontAwesome.length}`);
        console.log(`   ⚠️  Sin Font Awesome: ${withoutFontAwesome.length}`);

        if (withoutFontAwesome.length > 0) {
            console.log(`\n🔧 MÓDULOS QUE NECESITAN ARREGLO:`);
            withoutFontAwesome.forEach(m => {
                console.log(`   - ${m.module_key}: "${m.icon || 'NULL'}"`);
            });
        }

        await database.sequelize.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAllIcons();
