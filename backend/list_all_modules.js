const { sequelize } = require("./src/config/database");

async function listAllModules() {
    try {
        console.log("🔍 [MODULES] Buscando todos los módulos del sistema...\n");

        // 1. Módulos en system_modules
        const systemModules = await sequelize.query(
            "SELECT module_key, name, description, category, base_price, is_active FROM system_modules ORDER BY display_order, module_key",
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log("📋 [system_modules] Total:", systemModules.length);
        systemModules.forEach((mod, index) => {
            const status = mod.is_active ? "✅" : "❌";
            const num = String(index + 1).padStart(2, ' ');
            console.log(`  ${num}. ${status} ${mod.module_key} - ${mod.name}`);
            if (mod.description) console.log(`      📝 ${mod.description}`);
            if (mod.category) console.log(`      🏷️ Categoría: ${mod.category}`);
            if (mod.base_price) console.log(`      💰 Precio: $${mod.base_price}`);
            console.log("");
        });

        console.log("\n" + "=".repeat(80));
        console.log("📊 RESUMEN:");
        console.log("=".repeat(80));
        console.log(`Total módulos encontrados: ${systemModules.length}`);
        
        const activeModules = systemModules.filter(m => m.is_active).length;
        const inactiveModules = systemModules.filter(m => !m.is_active).length;
        console.log(`Activos: ${activeModules} | Inactivos: ${inactiveModules}`);

        const categories = [...new Set(systemModules.map(m => m.category).filter(Boolean))];
        console.log(`Categorías: ${categories.join(", ")}`);

        // 2. Lista de module_keys para usar en frontend
        console.log("\n🎯 [FRONTEND] Lista de module_keys para el panel:");
        const activeModuleKeys = systemModules.filter(m => m.is_active).map(m => m.module_key);
        console.log(JSON.stringify(activeModuleKeys, null, 2));

    } catch (error) {
        console.error("❌ Error:", error.message);
        throw error;
    }
}

listAllModules().then(() => process.exit(0));
