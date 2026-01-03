const http = require('http');

http.get('http://localhost:9998/panel-empresa.html', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find the script tag at line 1186
        const lines = data.split('\n');
        console.log('Line 1185:', JSON.stringify(lines[1184]));
        console.log('Line 1186:', JSON.stringify(lines[1185]));
        console.log('Line 1187:', JSON.stringify(lines[1186]));
        console.log('Line 1188:', JSON.stringify(lines[1187]));
        console.log('');

        // Check bytes of line 1186
        console.log('Bytes of line 1186:');
        const line1186 = lines[1185];
        for (let i = 0; i < Math.min(50, line1186.length); i++) {
            const char = line1186[i];
            const code = char.charCodeAt(0);
            console.log('  ' + i + ': char=' + JSON.stringify(char) + ' code=' + code + (code > 127 ? ' (non-ASCII!)' : ''));
        }

        // Also check if there's something weird around the <script> tag
        const scriptStart = data.indexOf('<script>', data.indexOf('mainSystemContainer'));
        console.log('');
        console.log('Around script tag (starting at position ' + scriptStart + '):');
        console.log(JSON.stringify(data.substring(scriptStart - 50, scriptStart + 50)));
    });
}).on('error', e => console.error('Error:', e));
