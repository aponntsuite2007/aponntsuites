const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'modules', 'users.js');

console.log('📝 Leyendo archivo users.js...');
let content = fs.readFileSync(filePath, 'utf8');

// Verificar si ya están las funciones
if (content.includes('window.viewUser = viewUser')) {
    console.log('✅ Las funciones ya están expuestas globalmente');
    process.exit(0);
}

// Agregar las líneas al final
const linesToAdd = `
// Exponer funciones globalmente para onclick handlers
window.viewUser = viewUser;
window.deleteUser = deleteUser;
window.resetPassword = resetPassword;
window.assignUserShifts = assignUserShifts;
window.uploadUserPhoto = uploadUserPhoto;
window.removeUserPhoto = removeUserPhoto;
`;

content += linesToAdd;

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fix aplicado exitosamente!');
console.log('✅ Funciones expuestas globalmente:');
console.log('   - window.viewUser');
console.log('   - window.deleteUser');
console.log('   - window.resetPassword');
console.log('   - window.assignUserShifts');
console.log('   - window.uploadUserPhoto');
console.log('   - window.removeUserPhoto');
console.log('');
console.log('🔄 Por favor recarga la página (F5) para que los cambios tomen efecto');
