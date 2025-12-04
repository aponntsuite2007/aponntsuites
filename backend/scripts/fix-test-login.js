const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'test-medical-simple.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Actualizando método de login a 3 pasos...');

// Login correcto de 3 pasos
const oldLogin = /\/\/ 4\. LOGIN[\s\S]*?throw error; \/\/ Si login falla, no continuar\s*\}/;

const newLogin = `// 4. LOGIN (3 pasos como Phase4TestOrchestrator)
        console.log('🧪 TEST 1: LOGIN (3 PASOS)');
        console.log('─'.repeat(60));
        try {
            await page.goto(\`\${baseUrl}/panel-empresa.html\`, { waitUntil: 'networkidle', timeout: 60000 });
            await page.waitForTimeout(1000);

            // Paso 1: Seleccionar empresa del dropdown
            console.log('   📍 PASO 1: Seleccionando empresa...');
            await page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
            await page.waitForTimeout(1000);
            await page.selectOption('#companySelect', 'isi');
            await page.waitForTimeout(5000); // Esperar a que aparezca campo usuario

            // Paso 2: Usuario
            console.log('   📍 PASO 2: Ingresando usuario...');
            const usernameInput = page.locator('input[type="text"]:visible').last();
            await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
            await usernameInput.fill('soporte'); // Usuario soporte del sistema
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);

            // Paso 3: Password
            console.log('   📍 PASO 3: Ingresando password...');
            const passwordInput = page.locator('input[type="password"]:visible').last();
            await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
            await passwordInput.fill('admin123');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);

            console.log('   ✅ TEST 1 PASSED - Login exitoso\\n');
            results.tests.push({ name: 'login', status: 'passed' });
            results.passed++;
        } catch (error) {
            console.error('   ❌ TEST 1 FAILED:', error.message, '\\n');
            results.tests.push({ name: 'login', status: 'failed', error: error.message });
            results.failed++;
            throw error; // Si login falla, no continuar
        }`;

content = content.replace(oldLogin, newLogin);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ [FIX] Login actualizado a 3 pasos correctos');
