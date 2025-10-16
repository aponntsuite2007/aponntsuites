// Translation System v3.10.0 - PROFESSIONAL & COMPLETE (With MutationObserver)
// Sistema de traducción multiidioma PROFESIONAL y COMPLETO para Aponnt
console.log('🌍 [TRANSLATION] Sistema de traducción PROFESIONAL cargado v3.10.0');

class TranslationSystem {
    constructor() {
        this.currentLanguage = 'es'; // Idioma por defecto
        this.translations = {};
        this.supportedLanguages = {
            'es': { name: 'Español', flag: '🇪🇸' },
            'en': { name: 'English', flag: '🇺🇸' },
            'pt': { name: 'Português', flag: '🇧🇷' },
            'de': { name: 'Deutsch', flag: '🇩🇪' },
            'it': { name: 'Italiano', flag: '🇮🇹' },
            'fr': { name: 'Français', flag: '🇫🇷' }
        };

        // Cargar idioma guardado del usuario
        this.loadUserLanguagePreference();

        // 🔥 NUEVO: Inicializar MutationObserver para auto-traducción
        this.initializeMutationObserver();
    }

    // 🔥 NUEVO: Observador de mutaciones para traducir elementos dinámicos
    initializeMutationObserver() {
        // Esperar a que el DOM esté listo
        if (document.body) {
            this.startObserving();
        } else {
            document.addEventListener('DOMContentLoaded', () => this.startObserving());
        }
    }

    startObserving() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Solo procesar nodos agregados
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Traducir el nodo y sus hijos
                        this.translateElement(node);
                    }
                });
            });
        });

        // Observar cambios en el body
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✅ [TRANSLATION] MutationObserver iniciado - auto-traducción activada');
    }

    // 🔥 NUEVO: Traducir un elemento específico y sus hijos
    async translateElement(element) {
        // Traducir el elemento si tiene data-translate
        if (element.hasAttribute && element.hasAttribute('data-translate')) {
            const key = element.getAttribute('data-translate');
            const translation = await this.t(key);
            element.textContent = translation;
        }

        // Traducir placeholder
        if (element.hasAttribute && element.hasAttribute('data-translate-placeholder')) {
            const key = element.getAttribute('data-translate-placeholder');
            const translation = await this.t(key);
            element.placeholder = translation;
        }

        // Traducir título/tooltip
        if (element.hasAttribute && element.hasAttribute('data-translate-title')) {
            const key = element.getAttribute('data-translate-title');
            const translation = await this.t(key);
            element.title = translation;
        }

        // Traducir hijos
        if (element.querySelectorAll) {
            const children = element.querySelectorAll('[data-translate], [data-translate-placeholder], [data-translate-title]');
            for (const child of children) {
                await this.translateElement(child);
            }
        }
    }

    // Cargar preferencia de idioma del usuario
    loadUserLanguagePreference() {
        const userLang = localStorage.getItem('user_language');

        if (userLang && this.supportedLanguages[userLang]) {
            this.currentLanguage = userLang;
            console.log(`🌍 [TRANSLATION] Idioma del usuario: ${this.currentLanguage}`);
        } else {
            console.log(`🌍 [TRANSLATION] Idioma por defecto: ${this.currentLanguage}`);
        }
    }

    // Cargar archivo de traducción
    async loadTranslations(language) {
        if (this.translations[language]) {
            return this.translations[language];
        }

        try {
            const response = await fetch(`/locales/${language}.json`);
            if (!response.ok) {
                throw new Error(`Error loading ${language} translations`);
            }

            this.translations[language] = await response.json();
            console.log(`✅ [TRANSLATION] Traducciones cargadas para ${language}`);
            return this.translations[language];
        } catch (error) {
            console.error(`❌ [TRANSLATION] Error cargando traducciones ${language}:`, error);
            if (language !== 'es') {
                return await this.loadTranslations('es');
            }
            return {};
        }
    }

    // Función principal de traducción
    async t(key, params = {}) {
        if (!this.translations[this.currentLanguage]) {
            await this.loadTranslations(this.currentLanguage);
        }

        const translation = this.getNestedValue(this.translations[this.currentLanguage], key);

        if (!translation) {
            // Fallback al español
            if (this.currentLanguage !== 'es') {
                if (!this.translations['es']) {
                    await this.loadTranslations('es');
                }
                const spanishTranslation = this.getNestedValue(this.translations['es'], key);
                if (spanishTranslation) {
                    return this.replaceParams(spanishTranslation, params);
                }
            }
            return key;
        }

        return this.replaceParams(translation, params);
    }

    // Obtener valor anidado del objeto de traducciones
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    // Reemplazar parámetros en la traducción
    replaceParams(text, params) {
        let result = text;
        Object.keys(params).forEach(key => {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), params[key]);
        });
        return result;
    }

    // Cambiar idioma
    async changeLanguage(newLanguage) {
        if (!this.supportedLanguages[newLanguage]) {
            console.error(`❌ [TRANSLATION] Idioma no soportado: ${newLanguage}`);
            return false;
        }

        this.currentLanguage = newLanguage;
        localStorage.setItem('user_language', newLanguage);

        // Cargar traducciones del nuevo idioma
        await this.loadTranslations(newLanguage);

        console.log(`🔄 [TRANSLATION] Idioma cambiado a: ${newLanguage}`);

        // Actualizar toda la interfaz
        await this.updateInterface();

        // Disparar evento de cambio de idioma
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: newLanguage }
        }));

        return true;
    }

    // 🔥 MEJORADO: Actualizar toda la interfaz con el nuevo idioma
    async updateInterface() {
        console.log('🔄 [TRANSLATION] Actualizando interfaz COMPLETA...');
        console.log('🔄 [TRANSLATION] Idioma actual:', this.currentLanguage);

        // 🔥 BUSCAR en TODO el documento (incluso elementos ocultos)
        const elementsToTranslate = document.querySelectorAll('[data-translate]');
        console.log(`🔄 [TRANSLATION] Elementos [data-translate]: ${elementsToTranslate.length}`);

        for (const element of elementsToTranslate) {
            const key = element.getAttribute('data-translate');
            const translation = await this.t(key);
            element.textContent = translation;
            console.log(`  ✅ ${key} → ${translation}`);
        }

        // Actualizar placeholders
        const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
        console.log(`🔄 [TRANSLATION] Elementos [data-translate-placeholder]: ${placeholderElements.length}`);
        for (const element of placeholderElements) {
            const key = element.getAttribute('data-translate-placeholder');
            element.placeholder = await this.t(key);
        }

        // Actualizar títulos/tooltips
        const titleElements = document.querySelectorAll('[data-translate-title]');
        console.log(`🔄 [TRANSLATION] Elementos [data-translate-title]: ${titleElements.length}`);
        for (const element of titleElements) {
            const key = element.getAttribute('data-translate-title');
            element.title = await this.t(key);
        }

        console.log('✅ [TRANSLATION] Interfaz COMPLETA actualizada - TODO traducido');
    }

    // Crear selector de idioma
    createLanguageSelector() {
        const selector = document.createElement('select');
        selector.id = 'languageSelector';
        selector.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            color: white;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
        `;

        // Agregar opciones
        Object.keys(this.supportedLanguages).forEach(langCode => {
            const option = document.createElement('option');
            option.value = langCode;
            option.textContent = `${this.supportedLanguages[langCode].flag} ${this.supportedLanguages[langCode].name}`;
            option.style.color = '#333';

            if (langCode === this.currentLanguage) {
                option.selected = true;
            }

            selector.appendChild(option);
        });

        // Event listener para cambio de idioma
        selector.addEventListener('change', async (event) => {
            await this.changeLanguage(event.target.value);
        });

        return selector;
    }

    // Obtener idioma actual
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Obtener idiomas soportados
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
}

// Crear instancia global
window.translator = new TranslationSystem();

// Función global para traducción rápida
window.t = async (key, params) => {
    return await window.translator.t(key, params);
};

// Cargar traducciones iniciales
window.translator.loadTranslations(window.translator.currentLanguage);

console.log('✅ [TRANSLATION] Sistema de traducción SIMPLE listo v3.9.1');
console.log('💡 Sistema SIN interceptores - solo data-translate');
