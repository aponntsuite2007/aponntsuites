const fs = require('fs');
const file = 'public/panel-administrativo.html';

let content = fs.readFileSync(file, 'utf8');

// Verificar si Socket.IO ya está
if (content.includes('socket.io/socket.io.js')) {
    console.log('✅ Socket.IO ya está en el archivo');
    process.exit(0);
}

// Buscar la línea de port-config.js y agregar Socket.IO después
const socketIOLine = '    <!-- 🔌 SOCKET.IO - WebSocket Communication -->\n    <script src="/socket.io/socket.io.js"></script>\n\n';
const searchPattern = '    <script src="js/port-config.js"></script>\n\n';

if (content.includes(searchPattern)) {
    content = content.replace(searchPattern, searchPattern + socketIOLine);
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ Socket.IO agregado exitosamente');
} else {
    console.log('❌ No se encontró el patrón esperado');
    console.log('Buscando patrón alternativo...');

    // Patrón alternativo
    const alt = '<script src="js/port-config.js"></script>';
    if (content.includes(alt)) {
        const lines = content.split('\n');
        const newLines = [];
        for (let i = 0; i < lines.length; i++) {
            newLines.push(lines[i]);
            if (lines[i].includes('port-config.js')) {
                newLines.push('');
                newLines.push('    <!-- 🔌 SOCKET.IO - WebSocket Communication -->');
                newLines.push('    <script src="/socket.io/socket.io.js"></script>');
            }
        }
        fs.writeFileSync(file, newLines.join('\n'), 'utf8');
        console.log('✅ Socket.IO agregado con patrón alternativo');
    } else {
        console.log('❌ port-config.js no encontrado');
    }
}
