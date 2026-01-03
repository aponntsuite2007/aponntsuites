const fs = require('fs');
const code = fs.readFileSync('block5.js', 'utf8');

let braces = 0;
let parens = 0;
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') braces++;
        if (char === '}') braces--;
        if (char === '(') parens++;
        if (char === ')') parens--;
    }

    // Show when parens go negative
    if (parens < 0 || braces < 0) {
        console.log('NEGATIVE at line', i + 1, '- braces:', braces, 'parens:', parens);
        console.log('Line:', line.substring(0, 80));
        break;
    }
}

console.log('Final - braces:', braces, 'parens:', parens);
