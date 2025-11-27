const fs = require('fs');
const path = require('path');

console.log('\n🌍 Agregando detección automática de idioma según país/navegador...\n');

const indexPath = path.join(__dirname, '../public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Código de detección automática de idioma
const autoDetectionCode = `
        // Auto-detect language based on browser/country
        async function detectUserLanguage() {
            console.log('🔍 [INDEX] Detectando idioma del usuario...');

            // 1. Check localStorage first (user preference)
            const savedLang = localStorage.getItem('selectedLanguage');
            if (savedLang) {
                console.log('✅ [INDEX] Idioma guardado encontrado:', savedLang);
                return savedLang;
            }

            // 2. Try to detect from browser language
            const browserLang = navigator.language || navigator.userLanguage;
            console.log('🌐 [INDEX] Idioma del navegador:', browserLang);

            // Map browser language codes to our supported languages
            const langMap = {
                'es': 'es', 'es-ES': 'es', 'es-AR': 'es', 'es-MX': 'es', 'es-CO': 'es',
                'en': 'en', 'en-US': 'en', 'en-GB': 'en', 'en-CA': 'en', 'en-AU': 'en',
                'pt': 'pt', 'pt-BR': 'pt', 'pt-PT': 'pt',
                'de': 'de', 'de-DE': 'de', 'de-AT': 'de', 'de-CH': 'de',
                'it': 'it', 'it-IT': 'it', 'it-CH': 'it',
                'fr': 'fr', 'fr-FR': 'fr', 'fr-CA': 'fr', 'fr-BE': 'fr', 'fr-CH': 'fr'
            };

            // Check if browser language is in our map
            if (langMap[browserLang]) {
                console.log('✅ [INDEX] Idioma detectado desde navegador:', langMap[browserLang]);
                return langMap[browserLang];
            }

            // Check base language (first 2 chars)
            const baseLang = browserLang.substring(0, 2);
            if (langMap[baseLang]) {
                console.log('✅ [INDEX] Idioma base detectado:', langMap[baseLang]);
                return langMap[baseLang];
            }

            // 3. Try to detect from timezone/country (fallback)
            try {
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                console.log('🌐 [INDEX] Timezone detectado:', timezone);

                // Map common timezones to languages
                const timezoneMap = {
                    'America/Argentina': 'es',
                    'America/Mexico_City': 'es',
                    'America/Bogota': 'es',
                    'America/Lima': 'es',
                    'America/Santiago': 'es',
                    'Europe/Madrid': 'es',
                    'America/New_York': 'en',
                    'America/Los_Angeles': 'en',
                    'America/Chicago': 'en',
                    'Europe/London': 'en',
                    'America/Sao_Paulo': 'pt',
                    'Europe/Lisbon': 'pt',
                    'Europe/Berlin': 'de',
                    'Europe/Vienna': 'de',
                    'Europe/Zurich': 'de',
                    'Europe/Rome': 'it',
                    'Europe/Paris': 'fr',
                    'Europe/Brussels': 'fr'
                };

                for (const [tz, lang] of Object.entries(timezoneMap)) {
                    if (timezone.startsWith(tz)) {
                        console.log('✅ [INDEX] Idioma detectado desde timezone:', lang);
                        return lang;
                    }
                }
            } catch (e) {
                console.log('⚠️ [INDEX] No se pudo detectar timezone');
            }

            // 4. Default to English
            console.log('ℹ️ [INDEX] Usando idioma por defecto: en');
            return 'en';
        }`;

// Buscar el DOMContentLoaded actual y reemplazarlo
const oldInitPattern = /document\.addEventListener\('DOMContentLoaded', function\(\) \{[\s\S]*?window\.translator\.updateInterface\(\);[\s\S]*?\}, 100\);[\s\S]*?\}\);/;

const newInitCode = `document.addEventListener('DOMContentLoaded', async function() {
            console.log('🌍 [INDEX] Inicializando sistema de traducción...');

            // Auto-detect language
            const detectedLang = await detectUserLanguage();
            console.log('🎯 [INDEX] Idioma seleccionado:', detectedLang);

            // Wait for translator to be ready
            if (typeof SmartTranslationSystem !== 'undefined' && window.translator) {
                console.log('✅ [INDEX] Translator disponible');

                // Set detected language
                window.translator.currentLanguage = detectedLang;
                localStorage.setItem('selectedLanguage', detectedLang);

                // Create language selector in container
                setTimeout(() => {
                    const container = document.getElementById('languageSelectorContainer');
                    if (container && window.translator) {
                        const selector = window.translator.createLanguageSelector();
                        if (selector) {
                            // Style selector for index.html (sutil y fino)
                            selector.style.cssText = \`
                                background: rgba(255,255,255,0.95);
                                border: 1px solid rgba(0,0,0,0.1);
                                border-radius: 6px;
                                color: #1a1a2e;
                                padding: 0.35rem 0.6rem;
                                font-size: 0.75rem;
                                cursor: pointer;
                                min-width: 110px;
                                font-weight: 500;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                transition: all 0.2s ease;
                            \`;

                            // Hover effect
                            selector.addEventListener('mouseenter', () => {
                                selector.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                selector.style.transform = 'translateY(-1px)';
                            });
                            selector.addEventListener('mouseleave', () => {
                                selector.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                selector.style.transform = 'translateY(0)';
                            });

                            container.appendChild(selector);
                            console.log('✅ [INDEX] Selector de idioma agregado');
                        }
                    }

                    // Translate initial interface with detected language
                    if (window.translator) {
                        window.translator.updateInterface();
                        console.log('✅ [INDEX] Interfaz traducida a:', detectedLang);
                    }
                }, 100);
            }
        });`;

// Insertar la función de detección antes del DOMContentLoaded
content = content.replace(
    /document\.addEventListener\('DOMContentLoaded',/,
    autoDetectionCode + '\n\n        ' + newInitCode.split('document.addEventListener(')[0] + 'document.addEventListener('
);

// Guardar
fs.writeFileSync(indexPath, content, 'utf8');

console.log('✅ Detección automática de idioma agregada');
console.log('\n📋 Lógica implementada:');
console.log('   1. Chequea localStorage (preferencia del usuario)');
console.log('   2. Detecta idioma del navegador (navigator.language)');
console.log('   3. Detecta desde timezone/país');
console.log('   4. Si no encuentra match → Inglés por defecto');
console.log('\n🌍 Idiomas soportados con detección:');
console.log('   ES: España, Argentina, México, Colombia, etc.');
console.log('   EN: USA, UK, Canadá, Australia (DEFAULT)');
console.log('   PT: Brasil, Portugal');
console.log('   DE: Alemania, Austria, Suiza');
console.log('   IT: Italia');
console.log('   FR: Francia, Canadá, Bélgica, Suiza\n');
