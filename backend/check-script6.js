const fs = require('fs');
const content = fs.readFileSync('public/panel-empresa.html', 'utf8');

// Extract block 10 (lines 1186-2037)
const lines = content.split('\n');
let code = '';
for (let i = 1186; i < 2036; i++) {
    code += lines[i] + '\n';
}

// Write to file for inspection
fs.writeFileSync('problematic-block.js', code);

// Try binary search within this block
const scriptLines = code.split('\n');

function hasError(endIdx) {
    let testCode = '';
    for (let i = 0; i <= endIdx; i++) {
        testCode += scriptLines[i] + '\n';
    }
    try {
        new Function(testCode);
        return false;
    } catch (e) {
        return e.message;
    }
}

// Binary search for exact line
let lo = 0;
let hi = scriptLines.length - 1;

while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (hasError(mid)) {
        hi = mid;
    } else {
        lo = mid + 1;
    }
}

console.log('Error first appears at script line:', lo);
console.log('File line:', 1186 + lo + 1);
console.log('Error:', hasError(lo));
console.log('');
console.log('Context (10 lines before to 5 after):');
for (let i = Math.max(0, lo - 10); i <= Math.min(scriptLines.length - 1, lo + 5); i++) {
    const marker = i === lo ? '>>> ' : '    ';
    console.log(marker + (1186 + i + 1) + ': ' + scriptLines[i]);
}
