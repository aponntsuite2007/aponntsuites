const { sequelize } = require("./src/config/database");

async function listTables() {
    try {
        const tables = await sequelize.query(
            "SELECT tablename FROM pg_tables WHERE schemaname = \"public\" ORDER BY tablename",
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log("📋 Tablas en la base de datos:");
        tables.forEach(table => {
            console.log(`  - ${table.tablename}`);
        });

    } catch (error) {
        console.error("Error:", error.message);
    }
}

listTables().then(() => process.exit(0));
