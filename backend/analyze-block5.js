const http = require('http');

http.get('http://localhost:9998/panel-empresa.html', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find script block #5 (at line 1186)
        const scriptPattern = /<script>([\s\S]*?)<\/script>/g;
        let match;
        let blockNum = 0;

        while ((match = scriptPattern.exec(data)) !== null) {
            blockNum++;
            if (blockNum === 5) {
                const script = match[1];
                const lines = script.split('\n');

                console.log('Block 5 has', lines.length, 'lines');

                // Try parsing line by line
                let code = '';
                for (let i = 0; i < lines.length; i++) {
                    code += lines[i] + '\n';
                    try {
                        new Function(code);
                    } catch (e) {
                        if (e.message.includes('Unexpected token')) {
                            console.log('First error at line', i + 1, '(file line ~' + (1186 + i) + ')');
                            console.log('Error:', e.message);
                            console.log('Line content:', lines[i]);
                            console.log('');
                            console.log('Previous 5 lines:');
                            for (let j = Math.max(0, i - 5); j < i; j++) {
                                console.log('  ' + (1186 + j) + ':', lines[j]);
                            }
                            console.log('>>> ' + (1186 + i) + ':', lines[i]);
                            break;
                        }
                    }
                }
                break;
            }
        }
    });
}).on('error', e => console.error('Error:', e));
