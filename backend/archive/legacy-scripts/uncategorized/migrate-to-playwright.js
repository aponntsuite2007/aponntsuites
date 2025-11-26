/**
 * MIGRACIÓN MASIVA DE PUPPETEER A PLAYWRIGHT
 *
 * Este script migra automáticamente TODOS los collectors que usan Puppeteer
 * a Playwright, aplicando los reemplazos necesarios.
 */

const fs = require('fs');
const path = require('path');

const FILES_TO_MIGRATE = [
    'src/auditor/collectors/EmployeeProfileCollector.js',
    'src/auditor/collectors/FrontendCollector.js',
    'src/auditor/collectors/AdvancedUserSimulationCollector.js',
    'src/auditor/collectors/RealUserExperienceCollector.js'
];

// Map of replacements: [pattern, replacement, flags]
const REPLACEMENTS = [
    // 1. Import statement
    [/const puppeteer = require\('puppeteer'\);/g, "const { chromium } = require('playwright');"],

    // 2. Browser launch
    [/puppeteer\.launch\(/g, 'chromium.launch('],
    [/defaultViewport: null,?/g, ''],  // Remove defaultViewport (Playwright uses context)
    [/protocolTimeout: \d+,?/g, ''],   // Remove protocolTimeout (Playwright uses different timeout system)

    // 3. Page creation - change newPage to context + newPage
    [/this\.page = await this\.browser\.newPage\(\);/g,
     `const context = await this.browser.newContext({ viewport: null });\n        this.page = await context.newPage();`],

    // 4. SetViewport
    [/await this\.page\.setViewport\(/g, '// Playwright viewport set in newContext\n        // await this.page.setViewport('],

    // 5. WaitForSelector with visible: true
    [/waitForSelector\(([^,]+),\s*\{\s*visible:\s*true/g, 'waitForSelector($1, { state: \'visible\''],
    [/waitForSelector\(([^,]+),\s*\{\s*timeout:/g, 'waitForSelector($1, { timeout:'],

    // 6. Type method
    [/\.type\(([^,]+),\s*([^,)]+),\s*\{[^}]*\}\)/g, '.fill($1, $2)'],
    [/\.type\(([^,]+),\s*([^)]+)\)/g, '.fill($1, $2)'],

    // 7. Select (Puppeteer) to selectOption (Playwright)
    [/\.select\(/g, '.selectOption('],

    // 8. waitForTimeout - Convert setTimeout to waitForTimeout
    [/await new Promise\(resolve => setTimeout\(resolve,\s*(\d+)\)\);/g, 'await this.page.waitForTimeout($1);'],

    // 9. waitForNavigation networkidle2 -> networkidle
    [/waitUntil:\s*'networkidle2'/g, "waitUntil: 'networkidle'"],

    // 10. $eval to textContent
    [/await this\.page\.\$eval\(([^,]+),\s*el => el\.textContent\.trim\(\)\)/g, 'await this.page.textContent($1)'],

    // 11. $ to locator
    [/const ([a-zA-Z_]+) = await this\.page\.\$\(([^)]+)\);/g, 'const $1 = await this.page.locator($2);'],
];

console.log('🔄 MIGRANDO COLLECTORS DE PUPPETEER A PLAYWRIGHT...\n');

let totalReplacements = 0;

FILES_TO_MIGRATE.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
    }

    console.log(`📝 Processing: ${filePath}`);

    let content = fs.readFileSync(fullPath, 'utf8');
    let fileReplacements = 0;

    REPLACEMENTS.forEach(([pattern, replacement], index) => {
        const matches = content.match(pattern);
        if (matches) {
            console.log(`   ✅ Rule ${index + 1}: ${matches.length} replacements`);
            fileReplacements += matches.length;
            content = content.replace(pattern, replacement);
        }
    });

    // Write back
    fs.writeFileSync(fullPath, content, 'utf8');

    console.log(`   📊 Total replacements in file: ${fileReplacements}\n`);
    totalReplacements += fileReplacements;
});

console.log('='.repeat(60));
console.log(`✅ MIGRATION COMPLETE`);
console.log(`📊 Total files processed: ${FILES_TO_MIGRATE.length}`);
console.log(`📊 Total replacements: ${totalReplacements}`);
console.log('='.repeat(60));
console.log('\n🎯 Next steps:');
console.log('1. Test with: node test-users-simple-persistence.js');
console.log('2. Check for any remaining Puppeteer references');
console.log('3. Manual review of complex patterns if needed');
