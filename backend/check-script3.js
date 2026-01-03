const fs = require('fs');
const content = fs.readFileSync('public/panel-empresa.html', 'utf8');

// Look for issues around line 1285
const lines = content.split('\n');

// Check encoding of lines around 1280-1290
for (let i = 1278; i < 1295; i++) {
    const line = lines[i];
    const hasNonAscii = /[^\x00-\x7F]/.test(line);
    console.log(i + 1, hasNonAscii ? '⚠️' : '  ', line);
}
