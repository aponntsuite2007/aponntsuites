const fs = require('fs');
const file = 'src/auditor/collectors/FrontendCollector.js';

let content = fs.readFileSync(file, 'utf8');

// Fix PASO 2: Limpiar campo de usuario antes de escribir
const oldUserStep = `      // PASO 2: Esperar a que se habilite el campo de usuario e ingresar "soporte"
      console.log('    ⏳ Esperando que se habilite campo de usuario...');
      await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
      console.log('    👤 Ingresando usuario: soporte');
      await this.page.click('#userInput'); // Click para enfocar
      await this.page.type('#userInput', 'soporte', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 2000));`;

const newUserStep = `      // PASO 2: Esperar a que se habilite el campo de usuario e ingresar "soporte"
      console.log('    ⏳ Esperando que se habilite campo de usuario...');
      await this.page.waitForSelector('#userInput:not([disabled])', { timeout: 5000 });
      
      // Limpiar campo de usuario (por si tiene valor previo)
      await this.page.click('#userInput', { clickCount: 3 }); // Triple click para seleccionar todo
      await this.page.keyboard.press('Backspace');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('    👤 Ingresando usuario: soporte');
      await this.page.type('#userInput', 'soporte', { delay: 100 });
      
      // Verificar que se escribió correctamente
      const userValue = await this.page.$eval('#userInput', el => el.value);
      console.log(\`    ✅ Usuario ingresado: "\${userValue}"\`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));`;

content = content.replace(oldUserStep, newUserStep);

// Fix PASO 3: Limpiar campo de contraseña antes de escribir
const oldPassStep = `      // PASO 3: Esperar a que se habilite el campo de contraseña e ingresar
      console.log('    ⏳ Esperando que se habilite campo de contraseña...');
      await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 5000 });
      console.log('    🔑 Ingresando contraseña');
      await this.page.click('#passwordInput'); // Click para enfocar
      await this.page.type('#passwordInput', 'admin123', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));`;

const newPassStep = `      // PASO 3: Esperar a que se habilite el campo de contraseña e ingresar
      console.log('    ⏳ Esperando que se habilite campo de contraseña...');
      await this.page.waitForSelector('#passwordInput:not([disabled])', { timeout: 5000 });
      
      // Limpiar campo de contraseña (por si tiene valor previo)
      await this.page.click('#passwordInput', { clickCount: 3 }); // Triple click para seleccionar todo
      await this.page.keyboard.press('Backspace');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('    🔑 Ingresando contraseña: admin123');
      await this.page.type('#passwordInput', 'admin123', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));`;

content = content.replace(oldPassStep, newPassStep);

// Agregar log del company_id al inicio
const oldLoginStart = `  async login(company_id, authToken = null) {
    console.log('    🔐 [LOGIN] Iniciando login automático...');`;

const newLoginStart = `  async login(company_id, authToken = null) {
    console.log('    🔐 [LOGIN] Iniciando login automático...');
    console.log(\`    📋 [LOGIN] Company ID recibido: \${company_id}\`);`;

content = content.replace(oldLoginStart, newLoginStart);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ Fixes aplicados:');
console.log('   - Log de company_id al inicio');
console.log('   - Limpiar campo usuario antes de escribir');
console.log('   - Limpiar campo contraseña antes de escribir');
console.log('   - Verificar valor escrito en usuario');
