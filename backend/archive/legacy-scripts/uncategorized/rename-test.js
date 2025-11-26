const fs = require('fs');
const oldPath = 'test-phase4-integrated.js';
const newPath = 'test-phase4-visible.js';

try {
    if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`✅ Renombrado: ${oldPath} → ${newPath}`);
    } else if (fs.existsSync(newPath)) {
        console.log(`✅ Ya existe: ${newPath}`);
    } else {
        console.log(`❌ No existe: ${oldPath}`);
    }
} catch (error) {
    console.error('❌ Error:', error.message);
}
