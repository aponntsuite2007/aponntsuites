const fs = require('fs');
const path = require('path');

console.log('\n🌍 Agregando detección automática de idioma...\n');

const indexPath = path.join(__dirname, '../public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Función de detección de idioma
const detectFunction = `
        // Auto-detect language based on browser/country
        async function detectUserLanguage() {
            console.log('🔍 [INDEX] Detectando idioma del usuario...');

            // 1. Check localStorage first
            const savedLang = localStorage.getItem('selectedLanguage');
            if (savedLang) {
                console.log('✅ [INDEX] Idioma guardado:', savedLang);
                return savedLang;
            }

            // 2. Detect from browser language
            const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
            console.log('🌐 [INDEX] Idioma navegador:', browserLang);

            // Map to supported languages
            if (browserLang.startsWith('es')) return 'es';
            if (browserLang.startsWith('pt')) return 'pt';
            if (browserLang.startsWith('de')) return 'de';
            if (browserLang.startsWith('it')) return 'it';
            if (browserLang.startsWith('fr')) return 'fr';
            if (browserLang.startsWith('en')) return 'en';

            // 3. Try timezone detection
            try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (tz.includes('Argentina') || tz.includes('Mexico') || tz.includes('Bogota') || tz.includes('Santiago') || tz.includes('Madrid')) return 'es';
                if (tz.includes('Sao_Paulo') || tz.includes('Lisbon')) return 'pt';
                if (tz.includes('Berlin') || tz.includes('Vienna') || tz.includes('Zurich')) return 'de';
                if (tz.includes('Rome')) return 'it';
                if (tz.includes('Paris') || tz.includes('Brussels')) return 'fr';
            } catch (e) {}

            // 4. Default to English
            console.log('ℹ️ [INDEX] Usando inglés por defecto');
            return 'en';
        }`;

// Buscar y reemplazar la inicialización
const oldInit = `        // Initialize Translation System for Index.html (manual selector only, no auto-detection)
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🌍 [INDEX] Inicializando sistema de traducción...');

            // Wait for translator to be ready
            if (typeof SmartTranslationSystem !== 'undefined' && window.translator) {
                console.log('✅ [INDEX] Translator disponible');`;

const newInit = detectFunction + `

        // Initialize Translation System with auto-detection
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('🌍 [INDEX] Inicializando sistema de traducción...');

            // Auto-detect and set language
            const detectedLang = await detectUserLanguage();
            console.log('🎯 [INDEX] Idioma detectado:', detectedLang);

            // Wait for translator to be ready
            if (typeof SmartTranslationSystem !== 'undefined' && window.translator) {
                console.log('✅ [INDEX] Translator disponible');

                // Set detected language
                window.translator.currentLanguage = detectedLang;
                localStorage.setItem('selectedLanguage', detectedLang);`;

content = content.replace(oldInit, newInit);

fs.writeFileSync(indexPath, content, 'utf8');

console.log('✅ Detección automática agregada');
console.log('\n📋 Funcionamiento:');
console.log('   1. Busca idioma guardado (localStorage)');
console.log('   2. Detecta desde navegador (navigator.language)');
console.log('   3. Detecta desde timezone');
console.log('   4. Por defecto: Inglés\n');
