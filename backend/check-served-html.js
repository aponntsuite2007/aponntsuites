const http = require('http');
const fs = require('fs');

// Fetch the served HTML
http.get('http://localhost:9998/panel-empresa.html', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('HTML length:', data.length);

        // Find all script blocks
        const scriptPattern = /<script>([\s\S]*?)<\/script>/g;
        let match;
        let blockNum = 0;
        let errorsFound = [];

        while ((match = scriptPattern.exec(data)) !== null) {
            blockNum++;
            const script = match[1];
            const startPos = match.index;
            const lineNumber = data.substring(0, startPos).split('\n').length;

            try {
                new Function(script);
            } catch (e) {
                console.log('===========================================');
                console.log('ERROR EN BLOQUE #' + blockNum + ' (línea ' + lineNumber + ')');
                console.log('Error:', e.message);
                console.log('-------------------------------------------');
                console.log('First 300 chars:', script.substring(0, 300));
                errorsFound.push({block: blockNum, line: lineNumber, error: e.message});
            }
        }

        console.log('');
        console.log('Total blocks:', blockNum);
        console.log('Errors found:', errorsFound.length);

        if (errorsFound.length > 0) {
            console.log('Error summary:', JSON.stringify(errorsFound, null, 2));
        }
    });
}).on('error', e => console.error('Error fetching HTML:', e));
