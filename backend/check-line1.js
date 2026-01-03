const http = require('http');

http.get('http://localhost:9998/panel-empresa.html', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find line 1186 (the <script> tag)
        const lines = data.split('\n');

        // Line 1186 should be the <script> tag, 1187 should be the first line inside
        console.log('Line 1185:', JSON.stringify(lines[1184]));
        console.log('Line 1186:', JSON.stringify(lines[1185]));
        console.log('Line 1187:', JSON.stringify(lines[1186]));

        // Check bytes of the content after <script> tag
        const scriptTag = lines[1185];
        const afterScript = scriptTag.indexOf('<script>');
        if (afterScript !== -1) {
            const afterContent = scriptTag.substring(afterScript + '<script>'.length);
            console.log('\nAfter <script> tag:', JSON.stringify(afterContent));
            console.log('Bytes:');
            for (let i = 0; i < afterContent.length; i++) {
                console.log('  ' + i + ': ' + afterContent.charCodeAt(i) + ' = ' + JSON.stringify(afterContent[i]));
            }
        }

        // Also check line 1187 bytes
        const line1187 = lines[1186];
        console.log('\nLine 1187 first 20 bytes:');
        for (let i = 0; i < Math.min(20, line1187.length); i++) {
            console.log('  ' + i + ': ' + line1187.charCodeAt(i) + ' = ' + JSON.stringify(line1187[i]));
        }
    });
}).on('error', e => console.error('Error:', e));
