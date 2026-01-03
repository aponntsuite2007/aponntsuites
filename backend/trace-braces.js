const fs = require('fs');
const code = fs.readFileSync('block5.js', 'utf8');

let braces = 0;
const lines = code.split('\n');
let openBlocks = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevBraces = braces;

    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') {
            braces++;
            openBlocks.push({line: i + 1, braces: braces, text: line.trim().substring(0, 50)});
        }
        if (char === '}') {
            braces--;
            if (openBlocks.length > 0) openBlocks.pop();
        }
    }

    // Show around line 503-520 to see what opens
    if (i >= 502 && i <= 520) {
        console.log('Line', i + 1, '- braces:', braces, '-', line.substring(0, 60));
    }
}

console.log('\n=== UNCLOSED BLOCKS ===');
openBlocks.forEach(b => console.log('Line', b.line, '(braces=' + b.braces + '):', b.text));
