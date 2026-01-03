const fs = require('fs');
const content = fs.readFileSync('public/panel-empresa.html', 'utf8');

// Find the specific script block at line 1186
const lines = content.split('\n');
let inScriptBlock = false;
let scriptContent = '';
let scriptStart = 0;
let scriptEnd = 0;

for (let i = 1185; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<script>') && !inScriptBlock) {
        inScriptBlock = true;
        scriptStart = i + 1;
        continue;
    }
    if (line.includes('</script>') && inScriptBlock) {
        scriptEnd = i;
        console.log('Script block: lines', scriptStart, 'to', scriptEnd);
        break;
    }
    if (inScriptBlock) {
        scriptContent += line + '\n';
    }
}

// Try to parse with Function
try {
    new Function(scriptContent);
    console.log('Script is valid!');
} catch (e) {
    console.log('Error:', e.message);
    
    // Try to find the line with error
    const match = e.message.match(/line (\d+)/);
    if (match) {
        const errorLine = parseInt(match[1]);
        const scriptLines = scriptContent.split('\n');
        console.log('Around error line', errorLine, ':');
        for (let i = Math.max(0, errorLine - 3); i < Math.min(scriptLines.length, errorLine + 3); i++) {
            console.log((i === errorLine - 1 ? '>>>' : '   '), i + 1, ':', scriptLines[i]);
        }
    }
}
