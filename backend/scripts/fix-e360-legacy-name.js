const fs = require('fs');
const f = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/employee-360.js';
let c = fs.readFileSync(f, 'utf8');

// Agregar la función con guion que busca DYNAMIC-LOAD
if (!c.includes("showEmployee-360Content")) {
    c = c.replace(
        "window.showEmployee360Content = init;",
        `window.showEmployee360Content = init;
    window['showEmployee-360Content'] = init;  // Para DYNAMIC-LOAD`
    );
    fs.writeFileSync(f, c);
    console.log('OK: Agregado showEmployee-360Content con guion');
} else {
    console.log('Ya tiene la funcion con guion');
}
