const http = require('http');

http.get('http://localhost:9998/panel-empresa.html', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find all inline script blocks
        const scriptPattern = /<script>([\s\S]*?)<\/script>/g;
        let match;
        let blockNum = 0;

        while ((match = scriptPattern.exec(data)) !== null) {
            blockNum++;
            if (blockNum === 4) {
                const script = match[1];
                const startPos = match.index;
                const lineNumber = data.substring(0, startPos).split('\n').length;

                console.log('Block 4 starts at line', lineNumber);
                console.log('Block 4 content (first 500 chars):');
                console.log(script.substring(0, 500));
                console.log('');
                console.log('Block 4 content (last 300 chars):');
                console.log(script.substring(script.length - 300));
                console.log('');

                // Try to parse block 4
                try {
                    new Function(script);
                    console.log('Block 4: OK');
                } catch (e) {
                    console.log('Block 4 ERROR:', e.message);
                }
            }

            if (blockNum === 5) {
                const startPos = match.index;
                const lineNumber = data.substring(0, startPos).split('\n').length;
                console.log('');
                console.log('Block 5 starts at line', lineNumber);
            }
        }

        // Check what's between block 4 end and block 5 start
        const block4End = data.indexOf('</script>', data.indexOf('<script>', data.indexOf('forceTop'))) + '</script>'.length;
        const block5Start = data.indexOf('<script>', block4End);
        console.log('');
        console.log('Between block 4 and 5:');
        console.log(JSON.stringify(data.substring(block4End, block5Start + 30)));
    });
}).on('error', e => console.error('Error:', e));
