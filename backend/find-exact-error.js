const http = require('http');

http.get('http://localhost:9998/panel-empresa.html', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find the problematic script block #5 (line 1186)
        const scriptPattern = /<script>([\s\S]*?)<\/script>/g;
        let match;
        let blockNum = 0;

        while ((match = scriptPattern.exec(data)) !== null) {
            blockNum++;
            if (blockNum === 5) {
                const script = match[1];
                const lines = script.split('\n');

                // Try to find exact problematic line by checking substrings
                for (let len = 1; len <= lines.length; len++) {
                    const testCode = lines.slice(0, len).join('\n');
                    try {
                        new Function(testCode);
                    } catch (e) {
                        console.log('Error appears when adding line', len);
                        console.log('Line content:', lines[len-1].substring(0, 100));
                        console.log('Error:', e.message);

                        // Show more context
                        console.log('\n=== CONTEXT ===');
                        for (let j = Math.max(0, len - 8); j < len; j++) {
                            console.log((j+1) + ':', lines[j]);
                        }
                        break;
                    }
                }
                break;
            }
        }
    });
}).on('error', e => console.error('Error:', e));
