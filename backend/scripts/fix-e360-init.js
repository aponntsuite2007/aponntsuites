const fs = require('fs');
const f = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/employee-360.js';
let c = fs.readFileSync(f, 'utf8');

if (!c.includes("showEmployee-360Content")) {
    c = c.replace(
        "console.log('[E360] Modulo Employee 360 Enterprise v3.1 cargado');",
        `// Funciones legacy para panel-empresa.html DYNAMIC-LOAD
    window['showEmployee-360Content'] = init;
    window.initEmployee360Module = init;

    console.log('[E360] Modulo Employee 360 Enterprise v3.1 cargado');`
    );
    fs.writeFileSync(f, c);
    console.log('OK: Funciones legacy agregadas');
} else {
    console.log('Ya tiene las funciones');
}
