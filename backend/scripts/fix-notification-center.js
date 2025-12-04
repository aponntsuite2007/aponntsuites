/**
 * Script para corregir el contenedor en notification-center.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/notification-center.js');
let content = fs.readFileSync(filePath, 'utf8');

// Verificar si ya tiene el fix
if (content.includes('Si no se pasa container, buscarlo')) {
    console.log('⚠️ El fix ya fue aplicado previamente');
    process.exit(0);
}

// Usar regex para encontrar y reemplazar
const regex = /(async function showNotificationCenterContent\(container\) \{\s*console\.log\('\[NOTIFICATION-CENTER\] Inicializando v3\.0\.\.\.'\);\s*)(\/\/ Obtener token)/;

const containerCheck = `$1// Si no se pasa container, buscarlo (compatibilidad con panel-empresa)
        if (!container) {
            container = document.getElementById('content-area') ||
                       document.getElementById('module-content') ||
                       document.querySelector('.content-area') ||
                       document.querySelector('#main-content');
        }

        if (!container) {
            console.error('[NOTIFICATION-CENTER] No se encontro contenedor');
            return;
        }

        $2`;

if (regex.test(content)) {
    content = content.replace(regex, containerCheck);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fix aplicado correctamente a notification-center.js');
    console.log('   Agregada auto-deteccion de contenedor');
} else {
    console.log('❌ No se encontro el patron con regex');
    // Mostrar primeras lineas de la funcion
    const match = content.match(/async function showNotificationCenterContent\(container\) \{[\s\S]{0,400}/);
    if (match) {
        console.log('Contenido actual:');
        console.log(match[0]);
    }
}
