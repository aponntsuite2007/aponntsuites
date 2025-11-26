const fs = require('fs');
const file = 'src/auditor/core/Phase4TestOrchestrator.js';
let content = fs.readFileSync(file, 'utf8');

console.log('🔍 Mejorando testRead con debug completo...');

const oldCode = `    async testRead(moduleName, companyId, tableName) {
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

const newCode = `    async testRead(moduleName, companyId, tableName) {
        console.log(\`\\n2️⃣ READ - Verificando lista de registros...\`);
        this.stats.totalTests++;

        try {
            // Para módulo users: hacer click en "Lista de Usuarios" primero (v6.0 requiere esto)
            if (moduleName === 'users') {
                console.log('   📋 Haciendo click en "Lista de Usuarios"...');
                console.log('   🔍 Esperando 1 segundo a que renderice el botón...');
                await this.wait(1000);

                const listaClicked = await this.clickByText('button', 'Lista de Usuarios');
                console.log(\`   \${listaClicked ? '✅' : '❌'} clickByText resultado: \${listaClicked}\`);

                if (!listaClicked) {
                    console.log('   ⚠️ Fallback: buscando por onclick...');
                    const listaBtn = await this.page.$('button[onclick*="loadUsers"]');
                    if (listaBtn) {
                        console.log('   ✅ Botón encontrado por onclick, haciendo click...');
                        await listaBtn.click();
                    } else {
                        console.log('   ❌ No se encontró botón con onclick="loadUsers"');
                        console.log('   🔍 Verificando HTML actual...');
                        const html = await this.page.content();
                        const hasLoadUsers = html.includes('loadUsers');
                        const hasListaUsuarios = html.includes('Lista de Usuarios');
                        console.log(\`      - HTML contiene "loadUsers": \${hasLoadUsers}\`);
                        console.log(\`      - HTML contiene "Lista de Usuarios": \${hasListaUsuarios}\`);
                    }
                }

                // Esperar MUCHO más tiempo a que cargue la API (5 segundos)
                console.log('   ⏱️ Esperando 5 segundos a que cargue la API...');
                await this.wait(5000);

                // Verificar si hay tabla antes de continuar
                const hasTable = await this.page.$('tbody tr');
                console.log(\`   \${hasTable ? '✅' : '❌'} Tabla encontrada: \${!!hasTable}\`);
            }

            // Contar en UI
            console.log('   🔍 Esperando selector tbody tr...');
            await this.page.waitForSelector('tbody tr', { timeout: 10000 });`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ testRead mejorado con debug completo');
    console.log('   - Más logs');
    console.log('   - Espera 5 segundos después del click');
    console.log('   - Timeout aumentado a 10 segundos');
    console.log('   - Verificación de HTML si falla');
} else {
    console.log('❌ No se encontró el código exacto');
    console.log('⚠️ Verifica manualmente Phase4TestOrchestrator.js');
}
