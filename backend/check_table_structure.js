#!/usr/bin/env node
/**
 * Script para verificar estructura de tablas
 */

const { sequelize } = require("./src/config/database");

async function checkTableStructure() {
    try {
        console.log("🔍 [CHECK] Verificando estructura de tablas...");

        const companyModulesColumns = await sequelize.query(
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_name = "company_modules"
             ORDER BY ordinal_position`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log("\n📋 [company_modules] Columnas:");
        companyModulesColumns.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

    } catch (error) {
        console.error("❌ [CHECK] Error:", error.message);
        throw error;
    }
}

checkTableStructure()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("💥 [CHECK] Error:", error.message);
        process.exit(1);
    });
