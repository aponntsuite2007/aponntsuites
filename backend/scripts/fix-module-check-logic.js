const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'panel-empresa.html');

console.log('🔧 [FIX LOGIC] Arreglando lógica de verificación de módulos...\n');

let content = fs.readFileSync(filePath, 'utf8');

// Buscar y reemplazar la lógica de verificación
const oldLogic = `            const isActive = (company.activeModules && company.activeModules[module.id] === true) ||
                           ['settings', 'dashboard'].includes(module.id);`;

const newLogic = `            const isActive = (company.activeModules && (
                               Array.isArray(company.activeModules) ?
                                   company.activeModules.includes(module.id) :
                                   company.activeModules[module.id] === true
                           )) || ['settings', 'dashboard'].includes(module.id);`;

if (content.includes("Array.isArray(company.activeModules)")) {
    console.log('⚠️  La lógica ya está arreglada');
    process.exit(0);
}

if (content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Lógica arreglada');
    console.log('   Ahora funciona con array o objeto');
    console.log('\n💡 Recarga el navegador (Ctrl+F5)');
    process.exit(0);
} else {
    console.log('❌ No encontré la lógica original');
    process.exit(1);
}
