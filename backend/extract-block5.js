const http = require('http');
const fs = require('fs');

http.get('http://localhost:9998/panel-empresa.html', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find block 5
        const scriptPattern = /<script>([\s\S]*?)<\/script>/g;
        let match;
        let blockNum = 0;

        while ((match = scriptPattern.exec(data)) !== null) {
            blockNum++;
            if (blockNum === 5) {
                const script = match[1];
                fs.writeFileSync('block5.js', script);
                console.log('Block 5 saved to block5.js');
                console.log('Length:', script.length);
                console.log('Lines:', script.split('\n').length);

                // Try to parse with detailed error
                try {
                    new Function(script);
                    console.log('Parse: OK');
                } catch (e) {
                    console.log('Parse error:', e.message);

                    // Try with eval to get line number
                    try {
                        eval('(function() {' + script + '})');
                    } catch (e2) {
                        console.log('Eval error:', e2.message);
                        if (e2.stack) {
                            console.log('Stack:', e2.stack.split('\n').slice(0, 5).join('\n'));
                        }
                    }
                }
                break;
            }
        }
    });
}).on('error', e => console.error('Error:', e));
