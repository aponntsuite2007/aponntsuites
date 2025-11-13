const metadata = require('./src/config/modules-metadata-extended.json');

const empresaModules = Object.values(metadata.modules)
    .filter(m => m.panel === 'empresa' || m.panel === 'both')
    .map(m => ({
        key: m.module_key,
        name: m.name,
        is_core: m.is_core,
        panel: m.panel
    }))
    .sort((a, b) => {
        if (a.is_core && !b.is_core) return -1;
        if (!a.is_core && b.is_core) return 1;
        return a.key.localeCompare(b.key);
    });

console.log(`\n📦 TOTAL MÓDULOS PANEL EMPRESA: ${empresaModules.length}\n`);

console.log('=== MÓDULOS CORE ===');
empresaModules.filter(m => m.is_core).forEach(m => {
    console.log(`  ✅ ${m.key.padEnd(30)} - ${m.name}`);
});

console.log('\n=== MÓDULOS OPCIONALES ===');
empresaModules.filter(m => !m.is_core).forEach(m => {
    console.log(`  📦 ${m.key.padEnd(30)} - ${m.name}`);
});

const moduleKeys = empresaModules.map(m => m.key);
console.log('\n=== ARRAY PARA BD (JSON) ===');
console.log(JSON.stringify(moduleKeys, null, 2));
