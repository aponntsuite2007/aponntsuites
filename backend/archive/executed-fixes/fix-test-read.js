const fs = require('fs');
const file = 'src/auditor/core/Phase4TestOrchestrator.js';
let content = fs.readFileSync(file, 'utf8');

console.log('🔍 Buscando función testRead...');

const oldCode = `    async testRead(moduleName, companyId, tableName) {
        console.log(\`\\n2️⃣ READ - Verificando lista de registros...\`);
        this.stats.totalTests++;

        try {
            // Contar en UI
            await this.page.waitForSelector('tbody tr', { timeout: 5000 });`;

const newCode = `    async testRead(moduleName, companyId, tableName) {
        console.log(\`\\n2️⃣ READ - Verificando lista de registros...\`);
        this.stats.totalTests++;

        try {
            // Para módulo users: hacer click en "Lista de Usuarios" primero (v6.0 requiere esto)
            if (moduleName === 'users') {
                console.log('   📋 Haciendo click en "Lista de Usuarios"...');
                const listaClicked = await this.clickByText('button', 'Lista de Usuarios');
                if (!listaClicked) {
                    // Fallback: buscar por onclick
                    const listaBtn = await this.page.$('button[onclick*="loadUsers"]');
                    if (listaBtn) await listaBtn.click();
                }
                // Esperar a que cargue la API
                await this.wait(3000);
            }

            // Contar en UI
            await this.page.waitForSelector('tbody tr', { timeout: 5000 });`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ Fix aplicado: testRead ahora hace click en "Lista de Usuarios"');
} else {
    console.log('❌ No se encontró el código exacto');
    console.log('Intentando con patrón más flexible...');

    // Verificar si ya está aplicado el fix
    if (content.includes('Lista de Usuarios')) {
        console.log('✅ El fix ya está aplicado');
    } else {
        console.log('⚠️ No se pudo aplicar el fix automáticamente');
    }
}
