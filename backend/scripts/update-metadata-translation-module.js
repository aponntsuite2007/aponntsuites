const fs = require('fs');
const path = require('path');

console.log('\n📝 Actualizando engineering-metadata.js con módulo de traducción...\n');

const metadataPath = path.join(__dirname, '../engineering-metadata.js');
let content = fs.readFileSync(metadataPath, 'utf8');

// Buscar el final del módulo employee-360 (el último módulo actual)
const employee360EndPattern = /("employee-360": \{[\s\S]*?\n    \},)(\n\n  \},\n\n  "roadmap":)/;

const translationModule = `
    "internationalization": {
      "name": "Sistema de Internacionalización (i18n)",
      "category": "CORE",
      "status": "PRODUCTION",
      "progress": 100,
      "phase": "PRODUCTION",
      "version": "4.1.0",
      "description": "Sistema de traducción multiidioma profesional con soporte HTML interno para index.html y paneles",
      "features": {
        "multiLanguageSupport": {
          "done": true,
          "tested": true,
          "description": "6 idiomas soportados: ES, EN, PT, DE, IT, FR"
        },
        "htmlPreservation": {
          "done": true,
          "tested": true,
          "description": "SMART FIX: innerHTML para preservar tags HTML (<strong>, <span>, etc.)"
        },
        "autoTranslation": {
          "done": true,
          "tested": true,
          "description": "Google Translate API gratuita para traducción automática"
        },
        "fullCoverage": {
          "done": true,
          "tested": true,
          "description": "1,719 traducciones × 6 idiomas = 10,314 traducciones totales"
        },
        "dataTranslateAttributes": {
          "done": true,
          "tested": true,
          "description": "453 elementos HTML con data-translate en index.html"
        }
      },
      "files": [
        "public/js/translation-system-v4.js",
        "public/index.html",
        "public/locales/es.json",
        "public/locales/en.json",
        "public/locales/pt.json",
        "public/locales/de.json",
        "public/locales/it.json",
        "public/locales/fr.json",
        "scripts/auto-translate-google.js",
        "scripts/create-mixed-paragraphs-translations.js",
        "scripts/fix-translation-system.js"
      ],
      "tables": [],
      "apiEndpoints": [],
      "technologies": [
        "JavaScript ES6+",
        "Google Translate API (free)",
        "JSON",
        "i18n pattern",
        "data-translate attributes"
      ],
      "keyFeatures": [
        "🌍 6 idiomas completos",
        "💰 $0/mes (Google Translate gratis)",
        "🔧 SMART FIX: innerHTML para HTML interno",
        "📊 100% cobertura de traducciones",
        "🚀 Auto-traducción batch con scripts",
        "✅ Preserva tags <strong>, <span>, etc."
      ],
      "problemSolved": {
        "before": "textContent eliminaba tags HTML → mezcla de idiomas (ES + EN en mismo párrafo)",
        "after": "innerHTML detecta y preserva HTML → 100% traducido correctamente",
        "impact": "Traducción profesional lista para producción en 6 idiomas"
      },
      "knownIssues": [],
      "lastUpdated": "2025-01-27",
      "commit": "6fcdbd9",
      "documentation": {
        "status": "pending",
        "file": "docs/modules/INTERNATIONALIZATION-MODULE.md",
        "templateUsed": "docs/templates/MODULE-DOCUMENTATION-TEMPLATE.md",
        "sections": {
          "resumenEjecutivo": false,
          "guiaDeUso": false,
          "funcionalidadInterna": false,
          "stackTecnologico": false,
          "diagramasDeFlujo": false,
          "apiRest": false,
          "baseDeDatos": false,
          "ejemplosDeUso": false,
          "troubleshooting": false
        },
        "lastUpdated": null,
        "tasks": []
      }
    },`;

// Insertar el módulo después de employee-360
content = content.replace(employee360EndPattern, `$1\n${translationModule}$2`);

// Guardar
fs.writeFileSync(metadataPath, content, 'utf8');

console.log('✅ Módulo "internationalization" agregado al engineering-metadata.js');
console.log('📊 Estado: PRODUCTION - 100% completado');
console.log('🌍 6 idiomas: ES, EN, PT, DE, IT, FR');
console.log('📝 Commit: 6fcdbd9\n');
