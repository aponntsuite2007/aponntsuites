// Translation System v4.1.0 - FIX: Traducción de text nodes mixtos
// Solución para párrafos con texto + <strong data-translate>
console.log('🌍 [TRANSLATION V4.1] Sistema de traducción FIXED cargado v4.1.0');

class SmartTranslationSystem {
    constructor() {
        this.currentLanguage = 'es';
        this.translations = {};
        this.supportedLanguages = {
            'es': { name: 'Español', flag: '🇪🇸' },
            'en': { name: 'English', flag: '🇺🇸' },
            'pt': { name: 'Português', flag: '🇧🇷' },
            'de': { name: 'Deutsch', flag: '🇩🇪' },
            'it': { name: 'Italiano', flag: '🇮🇹' },
            'fr': { name: 'Français', flag: '🇫🇷' }
        };

        this.loadUserLanguagePreference();
    }

    loadUserLanguagePreference() {
        const userLang = localStorage.getItem('user_language');
        if (userLang && this.supportedLanguages[userLang]) {
            this.currentLanguage = userLang;
            console.log(`🌍 [TRANSLATION V4.1] Idioma: ${this.currentLanguage}`);
        }
    }

    async loadTranslations(lang) {
        if (this.translations[lang]) {
            return this.translations[lang];
        }

        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            this.translations[lang] = data;
            console.log(`✅ [TRANSLATION V4.1] ${lang}.json cargado (${Object.keys(data).length} secciones)`);
            return data;
        } catch (error) {
            console.error(`❌ [TRANSLATION V4.1] Error cargando ${lang}.json:`, error);
            return {};
        }
    }

    async t(key) {
        const lang = this.currentLanguage;

        if (!this.translations[lang]) {
            await this.loadTranslations(lang);
        }

        const keys = key.split('.');
        let value = this.translations[lang];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Fallback
            }
        }

        return typeof value === 'string' ? value : key;
    }

    // 🔥 FIX: Traducir elemento completo (incluyendo text nodes mixtos)
    async translatePage() {
        console.log(`🔄 [TRANSLATION V4.1] Traduciendo página a ${this.currentLanguage}...`);

        // 1. Traducir elementos con data-translate (simple)
        const simpleElements = document.querySelectorAll('[data-translate]:not([data-translate-mixed])');
        for (const el of simpleElements) {
            const key = el.getAttribute('data-translate');
            const translation = await this.t(key);

            // Si el elemento NO tiene hijos con data-translate, reemplazar textContent
            const hasTranslatableChildren = el.querySelector('[data-translate]');
            if (!hasTranslatableChildren) {
                el.textContent = translation;
            }
        }

        // 2. 🔥 NUEVO: Traducir elementos con data-translate-mixed (texto + hijos traducibles)
        const mixedElements = document.querySelectorAll('[data-translate-mixed]');
        for (const el of mixedElements) {
            await this.translateMixedElement(el);
        }

        // 3. Traducir placeholders
        const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
        for (const el of placeholderElements) {
            const key = el.getAttribute('data-translate-placeholder');
            const translation = await this.t(key);
            el.placeholder = translation;
        }

        console.log(`✅ [TRANSLATION V4.1] Traducción completada (${this.currentLanguage})`);
    }

    // 🔥 NUEVO: Traducir elemento mixto (text nodes + elementos hijos con data-translate)
    async translateMixedElement(element) {
        const mapping = element.getAttribute('data-translate-mixed');
        if (!mapping) return;

        // mapping format: "prefix:index.key1,inner1:index.key2,inner2:index.key3,suffix:index.key4"
        const parts = mapping.split(',');
        const translations = {};

        // Obtener todas las traducciones
        for (const part of parts) {
            const [id, key] = part.split(':');
            translations[id] = await this.t(key);
        }

        // Reconstruir el innerHTML
        const children = Array.from(element.children);
        let html = '';

        // Agregar prefix si existe
        if (translations.prefix) {
            html += translations.prefix;
        }

        // Procesar children
        children.forEach((child, index) => {
            const innerId = `inner${index + 1}`;
            if (translations[innerId]) {
                child.textContent = translations[innerId];
            }
            html += child.outerHTML;

            // Agregar texto entre children
            const betweenId = `between${index + 1}`;
            if (translations[betweenId]) {
                html += translations[betweenId];
            }
        });

        // Agregar suffix si existe
        if (translations.suffix) {
            html += translations.suffix;
        }

        element.innerHTML = html;
    }

    async changeLanguage(newLang) {
        if (!this.supportedLanguages[newLang]) {
            console.error(`❌ Idioma no soportado: ${newLang}`);
            return;
        }

        console.log(`🔄 Cambiando idioma: ${this.currentLanguage} → ${newLang}`);
        this.currentLanguage = newLang;
        localStorage.setItem('user_language', newLang);

        await this.loadTranslations(newLang);
        await this.translatePage();

        // Disparar evento
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: newLang } }));
        console.log(`✅ Idioma cambiado a: ${newLang}`);
    }

    createLanguageSelector() {
        const select = document.createElement('select');
        select.id = 'languageSelector';

        for (const [code, info] of Object.entries(this.supportedLanguages)) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${info.flag} ${info.name}`;
            if (code === this.currentLanguage) {
                option.selected = true;
            }
            select.appendChild(option);
        }

        select.addEventListener('change', async (e) => {
            await this.changeLanguage(e.target.value);
        });

        return select;
    }
}

// Crear instancia global
window.translator = new SmartTranslationSystem();

// Auto-inicializar en DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌍 [TRANSLATION V4.1] Auto-inicializando...');
    await window.translator.translatePage();
});
