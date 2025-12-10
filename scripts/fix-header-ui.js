/**
 * Script para ajustar UI del header del panel-administrativo
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/public/panel-administrativo.html');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Ajustando header del panel-administrativo...\n');

// 1. Cambiar botón Salir de rojo a gris claro
content = content.replace(
    /background: linear-gradient\(135deg, #ef4444 0%, #dc2626 100%\);([^>]*?)box-shadow: 0 2px 8px rgba\(239,68,68,0\.3\)/g,
    'background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);$1box-shadow: 0 2px 8px rgba(107,114,128,0.3)'
);
console.log('1. Botón Salir cambiado a gris');

// 2. Cambiar colores de texto del usuario para que se vean sobre fondo oscuro
content = content.replace(
    /id="userFullName" style="font-size: 1\.5rem; font-weight: 600; color: #1e293b;/g,
    'id="userFullName" style="font-size: 1.5rem; font-weight: 600; color: #f8fafc;'
);
console.log('2. Color de userFullName cambiado a blanco');

content = content.replace(
    /id="userRoleAndId" style="font-size: 1\.1rem; color: #64748b;/g,
    'id="userRoleAndId" style="font-size: 1.1rem; color: #cbd5e1;'
);
console.log('3. Color de userRoleAndId cambiado a gris claro');

// 3. Reducir gap del contenedor de info de usuario y mover a la izquierda
content = content.replace(
    /id="userInfoHeader" style="display: flex; align-items: center; justify-content: flex-end; gap: 1\.6rem;/g,
    'id="userInfoHeader" style="display: flex; align-items: center; justify-content: flex-end; gap: 1rem;'
);
console.log('4. Gap reducido de 1.6rem a 1rem');

// 4. Cambiar estilo del hover del botón logout en CSS
content = content.replace(
    /\.btn-logout-header:hover\s*\{[^}]*background:\s*rgba\(255,\s*59,\s*48,\s*0\.8\)[^}]*\}/g,
    `.btn-logout-header:hover {
            background: rgba(75, 85, 99, 0.9) !important;
            border-color: rgba(75, 85, 99, 1) !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(75, 85, 99, 0.4);
        }`
);
console.log('5. Hover del botón Salir actualizado');

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n============================================================');
console.log('HEADER AJUSTADO');
console.log('============================================================');
console.log('\nCambios:');
console.log('   - Botón Salir: gris claro (como panel-empresa)');
console.log('   - Nombre usuario: texto blanco (visible sobre header oscuro)');
console.log('   - Rol usuario: gris claro (visible)');
console.log('   - Espaciado reducido (menos superposición)');
console.log('\nRecarga con CTRL+F5');
