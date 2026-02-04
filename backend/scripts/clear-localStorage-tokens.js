/**
 * Script para limpiar tokens conflictivos de localStorage
 * Ejecutar cuando haya problemas de "Token no es de staff"
 */

const puppeteer = require('puppeteer');

async function clearLocalStorage() {
    console.log('🧹 Limpiando tokens de localStorage...\n');

    const browser = await puppeteer.launch({
        headless: true
    });

    const page = await browser.newPage();

    // Navegar a localhost:9998
    await page.goto('http://localhost:9998', {
        waitUntil: 'networkidle2'
    });

    // Limpiar localStorage
    await page.evaluate(() => {
        const tokenKeys = [
            'token',
            'authToken',
            'refreshToken',
            'aponnt_token',
            'aponnt_token_staff',
            'companyAuthToken',
            'user',
            'currentUser',
            'user_data',
            'company',
            'currentCompany',
            'selectedCompany',
            'companyId'
        ];

        console.log('🧹 Limpiando tokens...');
        tokenKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.log(`   ❌ Eliminando: ${key}`);
                localStorage.removeItem(key);
            }
            if (sessionStorage.getItem(key)) {
                sessionStorage.removeItem(key);
            }
        });

        // También limpiar completamente
        localStorage.clear();
        sessionStorage.clear();

        console.log('✅ localStorage y sessionStorage limpiados');
    });

    await browser.close();

    console.log('\n✅ Limpieza completada!');
    console.log('📋 Ahora puedes hacer login en panel-administrativo sin conflictos\n');
}

// Ejecutar
clearLocalStorage().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
