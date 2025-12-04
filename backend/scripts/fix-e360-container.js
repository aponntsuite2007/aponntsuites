const fs = require('fs');
const f = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/employee-360.js';
let c = fs.readFileSync(f, 'utf8');

// Buscar y reemplazar la función init para usar mainContent igual que users.js
const oldInit = `function init() {
        console.log('[E360] Inicializando Expediente 360 Enterprise v3.1...');
        injectStyles();

        // Buscar container y renderizar
        const container = document.getElementById('main-content') || document.getElementById('content-area') || document.querySelector('.content-wrapper');
        if (container) {
            render(container);
        } else {
            console.error('[E360] No se encontró container para renderizar');
        }
    }`;

const newInit = `async function init() {
        console.log('[E360] Inicializando Expediente 360 Enterprise v3.1...');
        injectStyles();

        // Usar mainContent igual que users.js
        const content = document.getElementById('mainContent');
        if (!content) {
            console.error('[E360] No se encontró mainContent');
            return;
        }
        render(content);
    }`;

if (c.includes(oldInit)) {
    c = c.replace(oldInit, newInit);
    fs.writeFileSync(f, c);
    console.log('OK: Cambiado a mainContent (patron users.js)');
} else {
    // Intentar otro patron
    const alt1 = `const container = document.getElementById('main-content')`;
    if (c.includes(alt1)) {
        c = c.replace(alt1, `const content = document.getElementById('mainContent')`);
        c = c.replace(/if \(container\)/g, 'if (content)');
        c = c.replace(/render\(container\)/g, 'render(content)');
        fs.writeFileSync(f, c);
        console.log('OK: Reemplazado main-content por mainContent (patron alt)');
    } else {
        console.log('No se encontro el patron esperado');
        // Mostrar las primeras lineas de init
        const initMatch = c.match(/function init\(\)[^}]+\}/);
        if (initMatch) {
            console.log('Init actual:', initMatch[0].substring(0, 300));
        }
    }
}
