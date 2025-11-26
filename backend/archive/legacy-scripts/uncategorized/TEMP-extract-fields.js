// Script temporal para extraer TODOS los campos del modal viewUser
const fs = require('fs');

const usersJs = fs.readFileSync('public/js/modules/users.js', 'utf8');

// Buscar función viewUser
const viewUserStart = usersJs.indexOf('async function viewUser(userId) {');
const viewUserEnd = usersJs.indexOf('window.viewUser = viewUser;');
const viewUserCode = usersJs.substring(viewUserStart, viewUserEnd);

// Extraer todos los IDs de inputs, selects, textareas
const idPattern = /id=["']([^"']+)["']/g;
const ids = [];
let match;

while ((match = idPattern.exec(viewUserCode)) !== null) {
    if (match[1] && !match[1].includes('tab') && !match[1].includes('Modal')) {
        ids.push(match[1]);
    }
}

// Agrupar por tab
const tabFields = {
    admin: [],
    personal: [],
    work: [],
    family: [],
    medical: [],
    attendance: [],
    disciplinary: [],
    tasks: [],
    biometric: []
};

// Detectar a qué tab pertenece cada campo buscando en el código
const tabs = ['admin', 'personal', 'work', 'family', 'medical', 'attendance', 'disciplinary', 'tasks', 'biometric'];

tabs.forEach(tab => {
    const tabStart = viewUserCode.indexOf(`id="${tab}-tab"`);
    if (tabStart === -1) return;
    
    const nextTabIndex = tabs.slice(tabs.indexOf(tab) + 1).findIndex(t => viewUserCode.indexOf(`id="${t}-tab"`) !== -1);
    const tabEnd = nextTabIndex !== -1 ? viewUserCode.indexOf(`id="${tabs[tabs.indexOf(tab) + nextTabIndex + 1]}-tab"`) : viewUserCode.length;
    
    const tabCode = viewUserCode.substring(tabStart, tabEnd);
    
    ids.forEach(id => {
        if (tabCode.includes(`id="${id}"`) || tabCode.includes(`id='${id}'`)) {
            tabFields[tab].push(id);
        }
    });
});

console.log(JSON.stringify(tabFields, null, 2));
console.log('\n📊 TOTAL POR TAB:');
Object.entries(tabFields).forEach(([tab, fields]) => {
    console.log(`  ${tab}: ${fields.length} campos`);
});
console.log(`\n✅ TOTAL GENERAL: ${ids.length} campos únicos`);
