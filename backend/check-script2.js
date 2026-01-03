const fs = require('fs');
const content = fs.readFileSync('public/panel-empresa.html', 'utf8');

// Find the specific script block at line 1186
const lines = content.split('\n');
let inScriptBlock = false;
let scriptContent = '';

for (let i = 1185; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<script>') && !inScriptBlock) {
        inScriptBlock = true;
        continue;
    }
    if (line.includes('</script>') && inScriptBlock) {
        break;
    }
    if (inScriptBlock) {
        scriptContent += line + '\n';
    }
}

// Split into lines and try parsing smaller chunks
const scriptLines = scriptContent.split('\n');
let chunk = '';

for (let i = 0; i < scriptLines.length; i++) {
    chunk += scriptLines[i] + '\n';
    
    // Try to parse every 50 lines
    if ((i + 1) % 100 === 0) {
        try {
            new Function(chunk);
        } catch (e) {
            console.log('Error at around line', i + 1186, ':', e.message);
            // Show last 5 lines
            console.log('Last 5 lines:');
            for (let j = Math.max(0, i - 5); j <= i; j++) {
                console.log(j + 1186, ':', scriptLines[j]);
            }
            break;
        }
    }
}
