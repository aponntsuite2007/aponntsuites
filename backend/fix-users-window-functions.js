const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'modules', 'users.js');

console.log('📝 Leyendo archivo users.js...');
let content = fs.readFileSync(filePath, 'utf8');

const searchString = `// ✅ HACER FUNCIÓN DISPONIBLE GLOBALMENTE
window.showUsersContent = showUsersContent;`;

const replaceString = `// ✅ HACER FUNCIONES DISPONIBLES GLOBALMENTE
window.showUsersContent = showUsersContent;
window.viewUser = viewUser;
window.deleteUser = deleteUser;
window.resetPassword = resetPassword;
window.assignUserShifts = assignUserShifts;
window.uploadUserPhoto = uploadUserPhoto;
window.removeUserPhoto = removeUserPhoto;`;

if (content.includes(searchString)) {
    content = content.replace(searchString, replaceString);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fix aplicado exitosamente!');
    console.log('✅ Funciones expuestas globalmente:');
    console.log('   - window.viewUser');
    console.log('   - window.deleteUser');
    console.log('   - window.resetPassword');
    console.log('   - window.assignUserShifts');
    console.log('   - window.uploadUserPhoto');
    console.log('   - window.removeUserPhoto');
} else if (content.includes('window.viewUser = viewUser')) {
    console.log('⚠️  El fix ya está aplicado');
} else {
    console.log('❌ No se encontró el string a reemplazar');
    console.log('Buscando: ', searchString);
}
