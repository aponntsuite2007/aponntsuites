const fs = require('fs');
const f = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/employee-360.js';
let c = fs.readFileSync(f, 'utf8');

// Reemplazar la función init para que llame render
const oldInit = `function init() {
        console.log('[E360] Inicializando Expediente 360 Enterprise v3.1...');
        injectStyles();
    }`;

const newInit = `function init() {
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

if (c.includes(oldInit)) {
    c = c.replace(oldInit, newInit);
    fs.writeFileSync(f, c);
    console.log('OK: Función init() actualizada para llamar render()');
} else {
    console.log('La función init ya fue modificada o no se encontró el patrón');
}
