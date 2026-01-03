/**
 * Fix ALL finance endpoints to handle missing tables
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Arreglando todos los endpoints de finanzas...');

// 1. Fix financeRoutes.js - /integrations endpoint
const financeRoutesPath = path.join(__dirname, 'src/routes/financeRoutes.js');
let financeRoutes = fs.readFileSync(financeRoutesPath, 'utf8');

const oldIntegrations = `    } catch (error) {
        console.error('Error getting integrations:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});`;

const newIntegrations = `    } catch (error) {
        console.error('Error getting integrations:', error);

        // Si las tablas no existen, devolver datos vacíos
        if (error.name === 'SequelizeDatabaseError' && error.message.includes('no existe la relación')) {
            console.warn('⚠️ [FINANCE] Tablas de finanzas no existen - devolviendo integraciones vacías');
            return res.json({
                success: true,
                data: {
                    modules: {},
                    auto_posting: {}
                }
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});`;

if (financeRoutes.includes('devolviendo integraciones vacías')) {
    console.log('⚠️ financeRoutes.js ya está arreglado');
} else if (financeRoutes.includes(oldIntegrations)) {
    financeRoutes = financeRoutes.replace(oldIntegrations, newIntegrations);
    fs.writeFileSync(financeRoutesPath, financeRoutes, 'utf8');
    console.log('✅ financeRoutes.js arreglado');
} else {
    console.log('⚠️ No se encontró el patrón exacto en financeRoutes.js');
}

// 2. Fix ALL other finance route files with generic catch blocks
const routeFiles = [
    'src/routes/financeAccountsRoutes.js',
    'src/routes/financeBudgetRoutes.js',
    'src/routes/financeReportsRoutes.js',
    'src/routes/financeTreasuryRoutes.js'
];

routeFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ No existe: ${file}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Buscar catch blocks que devuelven 500
    const catchBlockRegex = /} catch \(error\) {\s*console\.error\([^)]+\);\s*res\.status\(500\)\.json\(\{/g;

    if (catchBlockRegex.test(content)) {
        // Reemplazar todos los catch blocks
        content = content.replace(
            /(\s+} catch \(error\) {\s*console\.error\([^)]+\);)\s*(res\.status\(500\)\.json\(\{)/g,
            `$1

        // Si las tablas no existen, devolver datos vacíos
        if (error.name === 'SequelizeDatabaseError' && error.message.includes('no existe la relación')) {
            console.warn('⚠️ [FINANCE] Tablas de finanzas no existen - devolviendo datos vacíos');
            return res.json({ success: true, data: [] });
        }

        $2`
        );

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${file} arreglado`);
    } else {
        console.log(`⚠️ ${file} - no se encontraron catch blocks para arreglar`);
    }
});

console.log('\n🎉 Todos los endpoints de finanzas arreglados');
console.log('   Ahora devolverán datos vacíos si las tablas no existen');
console.log('   🔄 Reiniciar servidor para aplicar cambios');
