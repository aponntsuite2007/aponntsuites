const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/auditor/core/Phase4TestOrchestrator.js');

console.log('📝 Leyendo archivo...');
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `        // Paso 1: Empresa
        console.log('\\n📍 PASO 1: Ingresando empresa "isi"');
        this.logger.debug('BROWSER', 'Paso 1/3: Ingresando empresa ISI');
        await this.page.waitForSelector('input[type="text"]', { visible: true });
        await this.page.type('input[type="text"]', 'isi');
        await this.page.keyboard.press('Enter');
        await this.wait(1500);

        // Paso 2: Usuario
        this.logger.debug('BROWSER', 'Paso 2/3: Ingresando usuario admin');
        await this.page.waitForSelector('input[type="text"]', { visible: true });
        const usernameInputs = await this.page.$$('input[type="text"]');
        if (usernameInputs.length > 0) {
            await usernameInputs[usernameInputs.length - 1].type('admin');
        }
        await this.page.keyboard.press('Enter');
        await this.wait(1500);

        // Paso 3: Password
        this.logger.debug('BROWSER', 'Paso 3/3: Ingresando contraseña');
        await this.page.waitForSelector('input[type="password"]', { visible: true });
        await this.page.type('input[type="password"]', 'admin123');
        await this.page.keyboard.press('Enter');

        // Esperar a que cargue el dashboard
        await this.wait(3000);
        this.logger.info('BROWSER', '✅ Login completado exitosamente');`;

const newCode = `        try {
            // Paso 1: Empresa
            console.log('\\n📍 PASO 1: Ingresando empresa "isi"');
            this.logger.debug('BROWSER', 'Paso 1/3: Ingresando empresa ISI');
            console.log('   🔍 Esperando input[type="text"] para empresa...');
            await this.page.waitForSelector('input[type="text"]', { visible: true, timeout: 10000 });
            console.log('   ✅ Input encontrado, escribiendo "isi"...');
            await this.page.type('input[type="text"]', 'isi');
            console.log('   ⌨️ Presionando Enter...');
            await this.page.keyboard.press('Enter');
            console.log('   ⏱️ Esperando 2 segundos...');
            await this.wait(2000);
            console.log('   ✅ Paso 1 completado\\n');

            // Paso 2: Usuario
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
            console.log('   ✅ Paso 2 completado\\n');

            // Paso 3: Password
            console.log('📍 PASO 3: Ingresando password "admin123"');
            this.logger.debug('BROWSER', 'Paso 3/3: Ingresando contraseña');
            console.log('   🔍 Esperando input[type="password"]...');
            await this.page.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 });
            console.log('   ✅ Input password encontrado, escribiendo...');
            await this.page.type('input[type="password"]', 'admin123');
            console.log('   ⌨️ Presionando Enter...');
            await this.page.keyboard.press('Enter');
            console.log('   ✅ Paso 3 completado\\n');

            // Esperar a que cargue el dashboard
            console.log('⏱️ Esperando 3 segundos a que cargue el dashboard...');
            await this.wait(3000);
            console.log('✅✅✅ LOGIN COMPLETADO EXITOSAMENTE ✅✅✅\\n');
            this.logger.info('BROWSER', '✅ Login completado exitosamente');
        } catch (error) {
            console.error('\\n❌❌❌ ERROR EN LOGIN ❌❌❌');
            console.error(\`Error tipo: \${error.name}\`);
            console.error(\`Mensaje: \${error.message}\`);
            if (error.stack) {
                console.error(\`Stack: \${error.stack.split('\\n').slice(0, 3).join('\\n')}\`);
            }
            throw error;
        }`;

console.log('🔍 Buscando código a reemplazar...');
if (content.indexOf(oldCode) === -1) {
    console.log('❌ No se encontró el código exacto a reemplazar');
    console.log('Intentando buscar solo el inicio...');
    if (content.indexOf('// Paso 1: Empresa') !== -1) {
        console.log('✅ Encontrado "// Paso 1: Empresa" - el código existe pero difiere en formato');
    }
    process.exit(1);
}

console.log('✅ Código encontrado, reemplazando...');
content = content.replace(oldCode, newCode);

console.log('💾 Escribiendo archivo...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ ¡Archivo actualizado exitosamente!');
process.exit(0);
