const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'modules', 'users.js');

console.log('📝 Leyendo archivo users.js...');
let content = fs.readFileSync(filePath, 'utf8');

// FIX 1: Remover columna Email del HEADER
const headerEmailColumn = `                        <th style="text-align: center; padding: 8px;">
                            <div>📧</div>
                            <div style="font-size: 0.85em;">Email</div>
                        </th>
`;

// FIX 2: Remover columna Email del BODY
const bodyEmailColumn = `                <td style="font-size: 0.9em;">\${user.email}</td>
`;

// FIX 3: Hacer modal más ancho (de max-width: 800px a 95vw)
// El modal ya tiene max-height: 90vh, solo necesitamos cambiar el ancho
const oldModalStyle = 'max-width: 800px; width: 95%; max-height: 90vh;';
const newModalStyle = 'max-width: 95vw; width: 95%; max-height: 90vh;';

let fixed = false;

if (content.includes(headerEmailColumn)) {
    console.log('✅ FIX 1: Removiendo columna Email del header');
    content = content.replace(headerEmailColumn, '');
    fixed = true;
} else {
    console.log('⚠️  FIX 1: Columna Email ya removida del header o no encontrada');
}

if (content.includes(bodyEmailColumn)) {
    console.log('✅ FIX 2: Removiendo columna Email del body');
    content = content.replace(bodyEmailColumn, '');
    fixed = true;
} else {
    console.log('⚠️  FIX 2: Columna Email ya removida del body o no encontrada');
}

if (content.includes(oldModalStyle)) {
    console.log('✅ FIX 3: Agrandando modal (95vw x 90vh)');
    content = content.replace(oldModalStyle, newModalStyle);
    fixed = true;
} else if (content.includes(newModalStyle)) {
    console.log('⚠️  FIX 3: Modal ya está agrandado');
} else {
    console.log('⚠️  FIX 3: Estilos del modal no encontrados, buscando alternativas...');
    // Buscar cualquier max-width/max-height en modal
    const altModalStyle = /max-width:\s*\d+px;\s*max-height:\s*\d+px;/g;
    if (altModalStyle.test(content)) {
        content = content.replace(altModalStyle, newModalStyle);
        console.log('✅ FIX 3: Modal agrandado (alternativa)');
        fixed = true;
    }
}

if (fixed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('\n✅ Cambios aplicados exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('   1. Columna Email removida del header');
    console.log('   2. Columna Email removida del body');
    console.log('   3. Modal agrandado a 95% ancho x 90% alto');
    console.log('\n🔄 Recarga la página (F5) para ver los cambios');
} else {
    console.log('\n⚠️  No se aplicaron cambios (ya estaban aplicados)');
}
