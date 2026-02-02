/**
 * Cleanup Screenshots - Remove duplicates and old test screenshots
 * Keeps only the most recent module-XX-*.png and results files
 */

const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results');

// Patterns to KEEP (most recent comprehensive test)
const KEEP_PATTERNS = [
    /^module-\d{2}-.*\.png$/,           // module-XX-*.png
    /^all-modules-results\.json$/,       // comprehensive results
    /^VISUAL-TEST-REPORT.*\.md$/,        // reports
    /^batch-modules-results\.json$/      // batch results
];

// Patterns to DELETE (old/duplicate tests)
const DELETE_PATTERNS = [
    /^smart-\d+-.*\.png$/,               // smart CRUD tests
    /^frontend-\d+-.*\.png$/,            // frontend tests
    /^quick-.*\.png$/,                   // quick tests
    /^org-structure-.*\.png$/,           // org structure specific
    /^attendance-.*\.png$/,              // attendance specific (older)
    /^crud-.*\.png$/,                    // crud tests
    /^api-test-.*\.png$/,                // api tests
    /^tabs-.*\.png$/,                    // tabs tests
    /^deep-.*\.png$/                     // deep tests
];

function shouldKeep(filename) {
    return KEEP_PATTERNS.some(pattern => pattern.test(filename));
}

function shouldDelete(filename) {
    return DELETE_PATTERNS.some(pattern => pattern.test(filename));
}

function main() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     SCREENSHOT CLEANUP                                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        console.log('No screenshot directory found.');
        return;
    }

    const files = fs.readdirSync(SCREENSHOT_DIR);
    const stats = { kept: 0, deleted: 0, skipped: 0, totalSize: 0 };

    console.log(`📁 Directory: ${SCREENSHOT_DIR}`);
    console.log(`📊 Total files: ${files.length}\n`);

    for (const file of files) {
        const filePath = path.join(SCREENSHOT_DIR, file);

        // Skip directories
        if (fs.statSync(filePath).isDirectory()) {
            stats.skipped++;
            continue;
        }

        if (shouldKeep(file)) {
            console.log(`   ✅ KEEP: ${file}`);
            stats.kept++;
        } else if (shouldDelete(file)) {
            const fileStats = fs.statSync(filePath);
            stats.totalSize += fileStats.size;

            try {
                fs.unlinkSync(filePath);
                console.log(`   🗑️ DELETE: ${file}`);
                stats.deleted++;
            } catch (err) {
                console.log(`   ❌ ERROR: ${file} - ${err.message}`);
            }
        } else {
            console.log(`   ⚠️ SKIP: ${file}`);
            stats.skipped++;
        }
    }

    const sizeInMB = (stats.totalSize / (1024 * 1024)).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    CLEANUP SUMMARY                           ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║   ✅ Kept:    ${String(stats.kept).padStart(3)}                                            ║`);
    console.log(`║   🗑️ Deleted: ${String(stats.deleted).padStart(3)}                                            ║`);
    console.log(`║   ⚠️ Skipped: ${String(stats.skipped).padStart(3)}                                            ║`);
    console.log(`║   💾 Space freed: ${sizeInMB} MB                                  ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
}

main();
