#!/usr/bin/env node

/**
 * Translation Extractor v1.0.0
 *
 * Extrae textos de archivos HTML para crear archivos de traducción
 * Detecta automáticamente textos traducibles y genera estructura JSON
 *
 * Uso:
 *   node scripts/extract-translations.js index.html
 *   node scripts/extract-translations.js panel-empresa.html --output=translations-needed.json
 */

const fs = require('fs');
const path = require('path');

// Configuración
const PUBLIC_DIR = path.join(__dirname, '../public');
const OUTPUT_DIR = path.join(__dirname, '../public/locales');

// Colores para terminal
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

// Selectores de elementos traducibles (mismo que translation-system-v4.js)
const TRANSLATABLE_SELECTORS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'button', 'label', 'th',
    'a.nav-link', 'a.menu-item',
    '.tab', 'p.description',
    '.card-title', '.section-title',
    '.modal-title'
];

// Selectores a excluir
const EXCLUDE_SELECTORS = [
    'data-no-translate',
    'script', 'style', 'code', 'pre'
];

// Parsear argumentos
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log(`${colors.yellow}Uso: node extract-translations.js <archivo.html> [opciones]${colors.reset}`);
    console.log(`\nOpciones:`);
    console.log(`  --output=<archivo>   Archivo de salida (default: translations-extracted.json)`);
    console.log(`  --prefix=<prefix>    Prefijo para las keys (default: nombre del archivo)`);
    console.log(`\nEjemplos:`);
    console.log(`  node extract-translations.js index.html`);
    console.log(`  node extract-translations.js panel-empresa.html --output=panel-translations.json`);
    process.exit(0);
}

const inputFile = args[0];
const outputArg = args.find(arg => arg.startsWith('--output='));
const prefixArg = args.find(arg => arg.startsWith('--prefix='));

const options = {
    inputFile,
    outputFile: outputArg ? outputArg.split('=')[1] : 'translations-extracted.json',
    prefix: prefixArg ? prefixArg.split('=')[1] : path.basename(inputFile, '.html')
};

// Función para limpiar texto
function cleanText(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/[\r\n\t]/g, ' ')
        .trim();
}

// Función para generar key a partir de texto
function generateKey(text, context = '') {
    const cleaned = text
        .toLowerCase()
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

    return context ? `${context}.${cleaned}` : cleaned;
}

// Función para extraer textos de HTML (simple regex, sin parser completo)
function extractTextsFromHTML(htmlContent) {
    const texts = new Map();

    // Extraer textos de tags específicos usando regex básico
    const patterns = [
        // h1-h6
        /<h([1-6])[^>]*>([^<]+)<\/h\1>/gi,
        // button
        /<button[^>]*>([^<]+)<\/button>/gi,
        // label
        /<label[^>]*>([^<]+)<\/label>/gi,
        // th
        /<th[^>]*>([^<]+)<\/th>/gi,
        // p con clase description
        /<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/gi
    ];

    let counter = 0;
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(htmlContent)) !== null) {
            const text = cleanText(match[match.length - 1]);

            // Ignorar textos vacíos, muy cortos o que parezcan código
            if (!text || text.length < 3 || text.length > 200) continue;
            if (text.match(/^[0-9\s\-.,]+$/)) continue; // solo números
            if (text.match(/^[\{\}\[\]<>\/\\]+$/)) continue; // solo símbolos

            // Detectar si tiene data-no-translate
            const fullMatch = match[0];
            if (fullMatch.includes('data-no-translate')) continue;

            // Generar key única
            const key = generateKey(text, options.prefix);
            const uniqueKey = texts.has(key) ? `${key}_${++counter}` : key;

            texts.set(uniqueKey, text);
        }
    }

    // Extraer placeholders
    const placeholderPattern = /placeholder="([^"]+)"/gi;
    let match;
    while ((match = placeholderPattern.exec(htmlContent)) !== null) {
        const text = cleanText(match[1]);
        if (text && text.length > 2) {
            const key = generateKey(text, `${options.prefix}.placeholder`);
            texts.set(key, text);
        }
    }

    // Extraer data-translate existentes
    const dataTranslatePattern = /data-translate="([^"]+)"/gi;
    while ((match = dataTranslatePattern.exec(htmlContent)) !== null) {
        const key = match[1];
        // Buscar el texto asociado
        const textMatch = htmlContent.substring(match.index).match(/>([^<]+)</);
        if (textMatch) {
            const text = cleanText(textMatch[1]);
            if (text) {
                texts.set(key, text);
            }
        }
    }

    return texts;
}

// Función para crear estructura JSON anidada
function createNestedStructure(textsMap) {
    const result = {};

    for (const [key, value] of textsMap.entries()) {
        const parts = key.split('.');
        let current = result;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }

        current[parts[parts.length - 1]] = value;
    }

    return result;
}

// Main
async function main() {
    console.log(`${colors.bold}${colors.blue}\n🔍 Translation Extractor v1.0.0${colors.reset}\n`);

    // Leer archivo HTML
    const inputPath = path.join(PUBLIC_DIR, options.inputFile);
    if (!fs.existsSync(inputPath)) {
        console.error(`${colors.red}❌ Error: No se encontró el archivo ${options.inputFile}${colors.reset}`);
        console.error(`   Buscado en: ${inputPath}`);
        process.exit(1);
    }

    console.log(`${colors.cyan}📄 Leyendo archivo: ${options.inputFile}${colors.reset}`);
    const htmlContent = fs.readFileSync(inputPath, 'utf8');
    console.log(`${colors.green}✅ Archivo leído: ${(htmlContent.length / 1024).toFixed(2)} KB${colors.reset}\n`);

    // Extraer textos
    console.log(`${colors.cyan}🔍 Extrayendo textos traducibles...${colors.reset}`);
    const textsMap = extractTextsFromHTML(htmlContent);
    console.log(`${colors.green}✅ Textos encontrados: ${textsMap.size}${colors.reset}\n`);

    if (textsMap.size === 0) {
        console.log(`${colors.yellow}⚠️  No se encontraron textos traducibles${colors.reset}\n`);
        return;
    }

    // Crear estructura anidada
    const nestedStructure = createNestedStructure(textsMap);

    // Guardar resultado
    const outputPath = path.join(OUTPUT_DIR, options.outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(nestedStructure, null, 2), 'utf8');
    console.log(`${colors.green}✅ Archivo generado: ${outputPath}${colors.reset}\n`);

    // Mostrar preview
    console.log(`${colors.bold}${colors.cyan}Preview (primeras 10 traducciones):${colors.reset}`);
    let count = 0;
    for (const [key, value] of textsMap.entries()) {
        if (count++ >= 10) break;
        console.log(`  "${key}": "${value}"`);
    }
    if (textsMap.size > 10) {
        console.log(`  ... y ${textsMap.size - 10} más`);
    }

    console.log(`\n${colors.yellow}💡 Próximos pasos:${colors.reset}`);
    console.log(`   1. Revisa ${options.outputFile} y ajusta las keys si es necesario`);
    console.log(`   2. Copia el contenido a es.json`);
    console.log(`   3. Traduce las values a otros idiomas (en.json, pt.json, etc.)`);
    console.log(`   4. Ejecuta: node scripts/translation-validator.js\n`);
}

// Ejecutar
main().catch(error => {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
});
