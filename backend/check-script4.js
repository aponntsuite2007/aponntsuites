const fs = require('fs');
const content = fs.readFileSync('public/panel-empresa.html', 'utf8');

// Find the specific script block at line 1186
const lines = content.split('\n');
let inScriptBlock = false;
let scriptLines = [];

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
        scriptLines.push({lineNum: i + 1, content: line});
    }
}

// Binary search for the error
function hasError(endIdx) {
    let code = '';
    for (let i = 0; i <= endIdx; i++) {
        code += scriptLines[i].content + '\n';
    }
    try {
        new Function(code);
        return false;
    } catch (e) {
        return true;
    }
}

// Binary search
let lo = 0;
let hi = scriptLines.length - 1;

// First check if last line is ok
if (!hasError(hi)) {
    console.log('No error found!');
} else {
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (hasError(mid)) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    
    console.log('Error first appears at line:', scriptLines[lo].lineNum);
    console.log('Line content:', scriptLines[lo].content);
    
    // Show context
    console.log('\nContext (5 lines before):');
    for (let i = Math.max(0, lo - 5); i <= lo; i++) {
        console.log(scriptLines[i].lineNum, ':', scriptLines[i].content);
    }
}
