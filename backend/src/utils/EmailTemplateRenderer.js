const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

/**
 * EmailTemplateRenderer - Utility for compiling and rendering Handlebars email templates
 *
 * Features:
 * - Template caching for performance
 * - Automatic template compilation
 * - Handlebars-based rendering
 * - Error handling
 *
 * Usage:
 *   const EmailTemplateRenderer = require('./utils/EmailTemplateRenderer');
 *   const html = await EmailTemplateRenderer.render('email-verification', { user_name: 'John', ... });
 */
class EmailTemplateRenderer {
    constructor() {
        this.templatesPath = path.join(__dirname, '../../templates/emails');
        this.compiledTemplates = new Map();

        console.log('📧 [EmailTemplateRenderer] Initialized');
        console.log(`   📁 Templates path: ${this.templatesPath}`);
    }

    /**
     * Compile and cache a template
     * @param {string} templateName - Name of the template file (without .html extension)
     * @returns {Function} Compiled Handlebars template
     */
    async compileTemplate(templateName) {
        // Return cached template if available
        if (this.compiledTemplates.has(templateName)) {
            console.log(`✅ [EmailTemplateRenderer] Using cached template: ${templateName}`);
            return this.compiledTemplates.get(templateName);
        }

        try {
            const templatePath = path.join(this.templatesPath, `${templateName}.html`);
            console.log(`📄 [EmailTemplateRenderer] Reading template: ${templatePath}`);

            const templateSource = await fs.readFile(templatePath, 'utf-8');
            const compiled = handlebars.compile(templateSource);

            // Cache the compiled template
            this.compiledTemplates.set(templateName, compiled);
            console.log(`✅ [EmailTemplateRenderer] Template compiled and cached: ${templateName}`);

            return compiled;
        } catch (error) {
            console.error(`❌ [EmailTemplateRenderer] Error compiling template ${templateName}:`, error);
            throw new Error(`Failed to compile email template: ${templateName}. ${error.message}`);
        }
    }

    /**
     * Render a template with data
     * @param {string} templateName - Name of the template file (without .html extension)
     * @param {Object} data - Data object to pass to the template
     * @returns {Promise<string>} Rendered HTML string
     */
    async render(templateName, data) {
        try {
            console.log(`🎨 [EmailTemplateRenderer] Rendering template: ${templateName}`);
            console.log(`   📊 Data keys: ${Object.keys(data).join(', ')}`);

            const template = await this.compileTemplate(templateName);
            const renderedHtml = template(data);

            console.log(`✅ [EmailTemplateRenderer] Template rendered successfully: ${templateName}`);
            console.log(`   📏 Rendered HTML length: ${renderedHtml.length} characters`);

            return renderedHtml;
        } catch (error) {
            console.error(`❌ [EmailTemplateRenderer] Error rendering template ${templateName}:`, error);
            throw error;
        }
    }

    /**
     * Check if a template exists
     * @param {string} templateName - Name of the template file (without .html extension)
     * @returns {Promise<boolean>} True if template exists, false otherwise
     */
    async templateExists(templateName) {
        try {
            const templatePath = path.join(this.templatesPath, `${templateName}.html`);
            await fs.access(templatePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * List all available templates
     * @returns {Promise<string[]>} Array of template names (without .html extension)
     */
    async listTemplates() {
        try {
            const files = await fs.readdir(this.templatesPath);
            const templates = files
                .filter(file => file.endsWith('.html'))
                .map(file => file.replace('.html', ''));

            console.log(`📋 [EmailTemplateRenderer] Available templates: ${templates.join(', ')}`);
            return templates;
        } catch (error) {
            console.error('❌ [EmailTemplateRenderer] Error listing templates:', error);
            return [];
        }
    }

    /**
     * Clear template cache (useful for development)
     * @param {string} [templateName] - Optional: clear specific template, or all if not provided
     */
    clearCache(templateName = null) {
        if (templateName) {
            this.compiledTemplates.delete(templateName);
            console.log(`🗑️  [EmailTemplateRenderer] Cache cleared for template: ${templateName}`);
        } else {
            this.compiledTemplates.clear();
            console.log('🗑️  [EmailTemplateRenderer] All template cache cleared');
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            cached_templates: this.compiledTemplates.size,
            template_names: Array.from(this.compiledTemplates.keys())
        };
    }
}

// Export as singleton instance
module.exports = new EmailTemplateRenderer();
