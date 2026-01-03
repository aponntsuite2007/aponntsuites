const fs = require('fs');
const content = fs.readFileSync('public/panel-empresa.html', 'utf8');

// Find ALL script blocks
const lines = content.split('\n');
let scriptBlocks = [];
let currentBlock = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if ((line.includes('<script>') || line.includes('<script ')) && !currentBlock) {
        currentBlock = { start: i + 1, end: null };
    }
    if (line.includes('</script>') && currentBlock) {
        currentBlock.end = i + 1;
        scriptBlocks.push(currentBlock);
        currentBlock = null;
    }
}

console.log('Script blocks found:', scriptBlocks.length);
scriptBlocks.forEach((block, idx) => {
    console.log('Block ' + (idx + 1) + ': lines ' + block.start + ' to ' + block.end);
});

// Check first 10 script blocks for errors
for (let i = 0; i < Math.min(10, scriptBlocks.length); i++) {
    const block = scriptBlocks[i];
    let code = '';
    for (let j = block.start; j < block.end - 1; j++) {
        code += lines[j] + '\n';
    }
    try {
        new Function(code);
        console.log('Block ' + (i + 1) + ': OK');
    } catch (e) {
        console.log('Block ' + (i + 1) + ': ERROR - ' + e.message);
    }
}
