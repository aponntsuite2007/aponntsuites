// Translation System v4.0.0 - SMART AUTO-TRANSLATION
// Sistema de traducción multiidioma INTELIGENTE con auto-detección
// $0/mes - 100% local, sin APIs de pago
console.log('🌍 [TRANSLATION V4] Sistema de traducción INTELIGENTE cargado v4.0.0');

class SmartTranslationSystem {
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

        // 🔥 NUEVO: Selectores de elementos a TRADUCIR automáticamente
        this.translatableSelectors = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'button:not([data-no-translate])',
            'label:not([data-no-translate])',
            'th:not([data-no-translate])',
            'a.nav-link',
            'a.menu-item',
            '.tab:not([data-no-translate])',
            'p.description',
            '.card-title',
            '.section-title',
            '.modal-title',
            '.alert',
            '.badge-text',
            '.tooltip-text'
        ];

        // 🔥 NUEVO: Selectores de elementos a NO TRADUCIR (datos de usuario)
        this.excludeSelectors = [
            '[data-no-translate]',
            '.user-data',
            '.user-name',
            '.email',
            '.phone',
            '.company-name',
            '.data-value',
            '.numeric-value',
            'input[type="text"]',
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="number"]',
            'textarea',
            'code',
            'pre',
            '.code-block',
            'script',
            'style'
        ];

        // 🔥 NUEVO: Cache de traducciones inversas (texto → key)
        this.reverseCache = {};

        // Cargar idioma guardado del usuario
        this.loadUserLanguagePreference();

        // Inicializar MutationObserver para auto-traducción
        this.initializeMutationObserver();

        // Crear cache inverso al cargar
        this.buildReverseCache();
    }

    // 🔥 NUEVO: Construir cache inverso (texto español → key)
    async buildReverseCache() {
        if (!this.translations['es']) {
            await this.loadTranslations('es');
        }

        this.reverseCache = {};
        this.buildReverseCacheRecursive(this.translations['es'], '');
        console.log(`✅ [TRANSLATION V4] Cache inverso construido: ${Object.keys(this.reverseCache).length} traducciones`);
    }

    buildReverseCacheRecursive(obj, prefix) {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null) {
                this.buildReverseCacheRecursive(value, fullKey);
            } else if (typeof value === 'string') {
                // Normalizar texto para búsqueda
                const normalizedText = this.normalizeText(value);
                this.reverseCache[normalizedText] = fullKey;
            }
        }
    }

    normalizeText(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[áàäâ]/g, 'a')
            .replace(/[éèëê]/g, 'e')
            .replace(/[íìïî]/g, 'i')
            .replace(/[óòöô]/g, 'o')
            .replace(/[úùüû]/g, 'u')
            .replace(/ñ/g, 'n');
    }

    // Observador de mutaciones para traducir elementos dinámicos
    initializeMutationObserver() {
        if (document.body) {
            this.startObserving();
        } else {
            document.addEventListener('DOMContentLoaded', () => this.startObserving());
        }
    }

    startObserving() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.translateElement(node);
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✅ [TRANSLATION V4] MutationObserver iniciado - auto-traducción activada');
    }

    // 🔥 MEJORADO: Traducir un elemento específico y sus hijos
    async translateElement(element) {
        // Verificar si debe traducirse
        if (!this.shouldTranslate(element)) {
            return;
        }

        // Traducir el elemento si tiene data-translate
        if (element.hasAttribute && element.hasAttribute('data-translate')) {
            const key = element.getAttribute('data-translate');
            const translation = await this.t(key);
            element.textContent = translation;
        } else {
            // 🔥 NUEVO: Auto-detectar traducción por contenido
            const text = element.textContent?.trim();
            if (text && text.length > 0 && text.length < 200) {
                const key = await this.findKeyByText(text);
                if (key) {
                    const translation = await this.t(key);
                    element.textContent = translation;
                    // Marcar como traducido para evitar re-procesar
                    element.setAttribute('data-auto-translated', 'true');
                }
            }
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
            const children = element.querySelectorAll(this.translatableSelectors.join(', '));
            for (const child of children) {
                await this.translateElement(child);
            }
        }
    }

    // 🔥 NUEVO: Determinar si un elemento debe traducirse
    shouldTranslate(element) {
        if (!element || !element.nodeType || element.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }

        // Ya fue auto-traducido
        if (element.hasAttribute('data-auto-translated')) {
            return false;
        }

        // Tiene data-no-translate
        if (element.hasAttribute('data-no-translate')) {
            return false;
        }

        // Está dentro de un contenedor excluido
        if (element.closest('[data-no-translate]')) {
            return false;
        }

        // Coincide con selectores de exclusión
        for (const selector of this.excludeSelectors) {
            try {
                if (element.matches(selector)) {
                    return false;
                }
            } catch (e) {
                // Selector inválido, ignorar
            }
        }

        // Tiene data-translate (siempre traducir)
        if (element.hasAttribute('data-translate')) {
            return true;
        }

        // Coincide con selectores traducibles
        for (const selector of this.translatableSelectors) {
            try {
                if (element.matches(selector)) {
                    return true;
                }
            } catch (e) {
                // Selector inválido, ignorar
            }
        }

        return false;
    }

    // 🔥 NUEVO: Buscar key por texto (usando cache inverso)
    async findKeyByText(text) {
        const normalizedText = this.normalizeText(text);
        return this.reverseCache[normalizedText] || null;
    }

    // Cargar preferencia de idioma del usuario
    loadUserLanguagePreference() {
        const userLang = localStorage.getItem('user_language');

        if (userLang && this.supportedLanguages[userLang]) {
            this.currentLanguage = userLang;
            console.log(`🌍 [TRANSLATION V4] Idioma del usuario: ${this.currentLanguage}`);
        } else {
            console.log(`🌍 [TRANSLATION V4] Idioma por defecto: ${this.currentLanguage}`);
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
            console.log(`✅ [TRANSLATION V4] Traducciones cargadas para ${language}`);

            // Reconstruir cache inverso si es español
            if (language === 'es') {
                this.buildReverseCache();
            }

            return this.translations[language];
        } catch (error) {
            console.error(`❌ [TRANSLATION V4] Error cargando traducciones ${language}:`, error);
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
            console.error(`❌ [TRANSLATION V4] Idioma no soportado: ${newLanguage}`);
            return false;
        }

        this.currentLanguage = newLanguage;
        localStorage.setItem('user_language', newLanguage);

        // Cargar traducciones del nuevo idioma
        await this.loadTranslations(newLanguage);

        console.log(`🔄 [TRANSLATION V4] Idioma cambiado a: ${newLanguage}`);

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
        console.log('🔄 [TRANSLATION V4] Actualizando interfaz COMPLETA...');
        console.log('🔄 [TRANSLATION V4] Idioma actual:', this.currentLanguage);

        // 1. Elementos con data-translate (método explícito)
        const elementsToTranslate = document.querySelectorAll('[data-translate]');
        console.log(`🔄 [TRANSLATION V4] Elementos [data-translate]: ${elementsToTranslate.length}`);

        for (const element of elementsToTranslate) {
            const key = element.getAttribute('data-translate');
            const translation = await this.t(key);
            element.textContent = translation;
        }

        // 2. 🔥 NUEVO: Auto-traducción de elementos sin data-translate
        const autoElements = document.querySelectorAll(this.translatableSelectors.join(', '));
        console.log(`🔄 [TRANSLATION V4] Elementos auto-traducibles: ${autoElements.length}`);

        let autoTranslated = 0;
        for (const element of autoElements) {
            if (this.shouldTranslate(element) && !element.hasAttribute('data-translate')) {
                await this.translateElement(element);
                autoTranslated++;
            }
        }
        console.log(`✅ [TRANSLATION V4] Auto-traducidos: ${autoTranslated} elementos`);

        // 3. Actualizar placeholders
        const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
        console.log(`🔄 [TRANSLATION V4] Elementos [data-translate-placeholder]: ${placeholderElements.length}`);
        for (const element of placeholderElements) {
            const key = element.getAttribute('data-translate-placeholder');
            element.placeholder = await this.t(key);
        }

        // 4. Actualizar títulos/tooltips
        const titleElements = document.querySelectorAll('[data-translate-title]');
        console.log(`🔄 [TRANSLATION V4] Elementos [data-translate-title]: ${titleElements.length}`);
        for (const element of titleElements) {
            const key = element.getAttribute('data-translate-title');
            element.title = await this.t(key);
        }

        console.log('✅ [TRANSLATION V4] Interfaz COMPLETA actualizada');
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
            min-width: 120px;
        `;

        // Agregar opciones
        Object.keys(this.supportedLanguages).forEach(langCode => {
            const option = document.createElement('option');
            option.value = langCode;
            option.textContent = `${this.supportedLanguages[langCode].flag} ${this.supportedLanguages[langCode].name}`;
            option.style.color = '#333';
            option.style.background = 'white';

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

    // 🔥 NUEVO: Validar traducciones (modo desarrollo)
    async validateTranslations() {
        const baseKeys = this.getAllKeys(this.translations['es']);
        const report = {};

        for (const lang of Object.keys(this.supportedLanguages)) {
            if (lang === 'es') continue;

            if (!this.translations[lang]) {
                await this.loadTranslations(lang);
            }

            const missingKeys = [];
            for (const key of baseKeys) {
                const value = this.getNestedValue(this.translations[lang], key);
                if (!value) {
                    missingKeys.push(key);
                }
            }

            report[lang] = {
                total: baseKeys.length,
                missing: missingKeys.length,
                missingKeys: missingKeys,
                percentage: ((baseKeys.length - missingKeys.length) / baseKeys.length * 100).toFixed(2)
            };
        }

        return report;
    }

    getAllKeys(obj, prefix = '') {
        let keys = [];
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null) {
                keys = keys.concat(this.getAllKeys(value, fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        return keys;
    }
}

// Crear instancia global
window.translator = new SmartTranslationSystem();

// Función global para traducción rápida
window.t = async (key, params) => {
    return await window.translator.t(key, params);
};

// Cargar traducciones iniciales
window.translator.loadTranslations(window.translator.currentLanguage);

console.log('✅ [TRANSLATION V4] Sistema de traducción INTELIGENTE listo');
console.log('💡 Features: Auto-detección, cache inverso, exclusión inteligente');
