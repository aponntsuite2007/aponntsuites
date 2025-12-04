const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'panel-empresa.html');

console.log('🔧 [ADD TO ARRAY] Agregando módulo al array principal...\n');

let content = fs.readFileSync(filePath, 'utf8');

// Buscar la línea exacta y agregar el módulo
const oldLine = `            { id: 'facial-biometric', name: 'Biometría Analítica', icon: '🎭' },{ id: 'medical-dashboard', name: 'Médico', icon: '👩‍⚕️' },`;

const newLine = `            { id: 'facial-biometric', name: 'Biometría Analítica', icon: '🎭' },{ id: 'medical-dashboard', name: 'Médico', icon: '👩‍⚕️' },{ id: 'occupational-health-enterprise', name: 'Salud Ocupacional Enterprise', icon: '🏥' },`;

if (content.includes("{ id: 'occupational-health-enterprise'")) {
    console.log('⚠️  Ya está en el array principal');
    process.exit(0);
}

if (content.includes(oldLine)) {
    content = content.replace(oldLine, newLine);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Módulo agregado al array principal');
    console.log('   Línea ~4546');
    console.log('\n💡 Recarga el navegador (Ctrl+F5)');
    process.exit(0);
} else {
    console.log('❌ No encontré la línea exacta');
    process.exit(1);
}
