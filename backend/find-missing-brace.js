const fs = require('fs');
const code = fs.readFileSync('block5.js', 'utf8');

let braces = 0;
const lines = code.split('\n');
let lastZero = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevBraces = braces;

    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') braces++;
        if (char === '}') braces--;
    }

    // Track where braces hit zero
    if (braces === 0 && prevBraces > 0) {
        lastZero = i + 1;
    }

    // Show lines where braces stay at 1 near the end
    if (i > lines.length - 60) {
        console.log('Line', i + 1, '- braces:', braces, '-', line.substring(0, 60));
    }
}

console.log('\nBraces hit 0 last at line:', lastZero);
