const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/auditor/core/Phase4TestOrchestrator.js');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

const oldStep2 = `            // Paso 2: Usuario
            console.log('📍 PASO 2: Ingresando usuario "admin"');
            this.logger.debug('BROWSER', 'Paso 2/3: Ingresando usuario admin');
            console.log('   🔍 Esperando input[type="text"] para usuario...');
            await this.page.waitForSelector('input[type="text"]', { visible: true, timeout: 10000 });
            console.log('   ✅ Input encontrado, obteniendo todos los inputs text...');
            const usernameInputs = await this.page.$$('input[type="text"]');
            console.log(\`   📋 Encontrados \${usernameInputs.length} inputs text\`);
            if (usernameInputs.length > 0) {
                console.log(\`   ⌨️ Escribiendo en el último input (índice \${usernameInputs.length - 1})...\`);
                await usernameInputs[usernameInputs.length - 1].type('admin');
            }
            console.log('   ⌨️ Presionando Enter...');
            await this.page.keyboard.press('Enter');
            console.log('   ⏱️ Esperando 2 segundos...');
            await this.wait(2000);
            console.log('   ✅ Paso 2 completado\\n');`;

const newStep2 = `            // Paso 2: Usuario
            console.log('📍 PASO 2: Ingresando usuario "admin"');
            this.logger.debug('BROWSER', 'Paso 2/3: Ingresando usuario admin');
            console.log('   🔍 Esperando input[type="text"] para usuario...');
            await this.page.waitForSelector('input[type="text"]', { visible: true, timeout: 10000 });
            console.log('   ✅ Input encontrado, limpiando campo antes de escribir...');

            // Limpiar el campo primero (puede tener "isi" todavía)
            await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="text"]');
                if (inputs.length > 0) {
                    inputs[inputs.length - 1].value = '';
                }
            });

            console.log('   ⌨️ Escribiendo "admin" directamente...');
            await this.page.type('input[type="text"]', 'admin');

            // Verificar que se escribió correctamente
            const writtenValue = await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="text"]');
                return inputs.length > 0 ? inputs[inputs.length - 1].value : null;
            });
            console.log(\`   ✔️ Valor escrito en input: "\${writtenValue}"\`);

            if (writtenValue !== 'admin') {
                throw new Error(\`❌ No se pudo escribir "admin" correctamente. Valor actual: "\${writtenValue}"\`);
            }

            console.log('   ⌨️ Presionando Enter...');
            await this.page.keyboard.press('Enter');
            console.log('   ⏱️ Esperando 2 segundos...');
            await this.wait(2000);
            console.log('   ✅ Paso 2 completado\\n');`;

console.log('🔍 Buscando Paso 2 a reemplazar...');
if (content.indexOf(oldStep2) === -1) {
    console.log('❌ No se encontró el Paso 2 exacto');
    console.log('Intentando buscar solo el inicio...');
    if (content.indexOf('// Paso 2: Usuario') !== -1) {
        console.log('✅ Se encontró "// Paso 2: Usuario"');
    }
    process.exit(1);
}

console.log('✅ Paso 2 encontrado, reemplazando...');
content = content.replace(oldStep2, newStep2);

console.log('💾 Escribiendo archivo...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Paso 2 arreglado exitosamente!');
console.log('');
console.log('Cambios aplicados:');
console.log('  - Limpia el campo antes de escribir');
console.log('  - Usa page.type() directo en lugar de $$()');
console.log('  - Verifica que "admin" se escribió correctamente');
console.log('  - Lanza error si la verificación falla');
process.exit(0);
