const fs = require('fs');
const file = 'src/auditor/core/Phase4TestOrchestrator.js';
let content = fs.readFileSync(file, 'utf8');

console.log('🔍 Buscando código del Paso 1 (empresa)...');

const oldCode = `            // Paso 1: Empresa
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
            console.log('   ✅ Paso 1 completado\\n');`;

const newCode = `            // Paso 1: Empresa (SELECT DROPDOWN)
            console.log('\\n📍 PASO 1: Seleccionando empresa "isi" del dropdown');
            this.logger.debug('BROWSER', 'Paso 1/3: Seleccionando empresa ISI');
            console.log('   🔍 Esperando dropdown #companySelect...');
            await this.page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
            console.log('   ⏱️ Esperando 1 segundo a que se carguen las empresas...');
            await this.wait(1000);
            console.log('   ✅ Dropdown encontrado, seleccionando "isi"...');
            await this.page.select('#companySelect', 'isi');
            console.log('   ⏱️ Esperando 2 segundos...');
            await this.wait(2000);
            console.log('   ✅ Paso 1 completado\\n');`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ Fix aplicado: Paso 1 ahora usa page.select() para el dropdown');
} else {
    console.log('❌ No se encontró el código exacto');
    console.log('Intentando con patrón más flexible...');

    // Patrón más flexible
    const pattern = /await this\.page\.type\('input\[type="text"\]', 'isi'\);/;
    if (pattern.test(content)) {
        content = content.replace(pattern, "await this.page.select('#companySelect', 'isi');");

        // También cambiar el waitForSelector
        content = content.replace(
            /await this\.page\.waitForSelector\('input\[type="text"\]', { visible: true, timeout: 10000 }\);/,
            "await this.page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });"
        );

        fs.writeFileSync(file, content, 'utf8');
        console.log('✅ Fix aplicado con patrón flexible');
    } else {
        console.log('❌ No se pudo aplicar el fix');
    }
}
