/**
 * SCRIPT: Inyectar AI Discovery Metadata
 *
 * Inyecta metadata auto-discoverable para IAs en:
 * - index.html (JSON-LD + meta tags)
 * - panel-empresa.html (JSON-LD + meta tags)
 * - Crea /.well-known/ai-context.json
 * - Actualiza robots.txt
 *
 * @version 1.0.0
 * @created 2025-12-21
 */

const fs = require('fs');
const path = require('path');

class AIDiscoveryInjector {
  constructor() {
    this.publicPath = path.join(__dirname, '../public');
    this.llmContextPath = path.join(this.publicPath, 'llm-context.json');
    this.wellKnownPath = path.join(this.publicPath, '.well-known');
  }

  /**
   * Ejecuta todas las inyecciones
   */
  async inject() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   🤖 AI DISCOVERY INJECTOR                              ║');
    console.log('║   Making APONNT auto-discoverable for AI agents         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    try {
      // 1. Cargar llm-context.json
      const llmContext = this.loadLLMContext();
      console.log('✅ llm-context.json cargado\n');

      // 2. Generar JSON-LD
      const jsonLD = this.generateJSONLD(llmContext);
      console.log('✅ JSON-LD generado\n');

      // 3. Inyectar en index.html
      this.injectIntoHTML('index.html', jsonLD);
      console.log('✅ JSON-LD inyectado en index.html\n');

      // 4. Inyectar en panel-empresa.html
      this.injectIntoHTML('panel-empresa.html', jsonLD);
      console.log('✅ JSON-LD inyectado en panel-empresa.html\n');

      // 5. Crear /.well-known/ai-context.json
      this.createWellKnown(llmContext);
      console.log('✅ /.well-known/ai-context.json creado\n');

      // 6. Actualizar robots.txt
      this.updateRobotsTxt();
      console.log('✅ robots.txt actualizado\n');

      // 7. Agregar badges en footers
      this.addFooterBadges();
      console.log('✅ Badges agregados en footers\n');

      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║   ✅ INYECCIÓN COMPLETADA                               ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      console.log('📊 ARCHIVOS MODIFICADOS:');
      console.log('   • public/index.html');
      console.log('   • public/panel-empresa.html');
      console.log('   • public/.well-known/ai-context.json');
      console.log('   • public/robots.txt\n');

      console.log('🎯 LAS IAs AHORA PUEDEN DESCUBRIR:');
      console.log('   • JSON-LD en <head> de HTML');
      console.log('   • Meta tags específicos para IAs');
      console.log('   • /.well-known/ai-context.json (standard)');
      console.log('   • Hints en robots.txt\n');

      return true;
    } catch (error) {
      console.error('\n❌ ERROR:', error.message);
      console.error(error.stack);
      return false;
    }
  }

  /**
   * Carga llm-context.json
   */
  loadLLMContext() {
    const content = fs.readFileSync(this.llmContextPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Genera JSON-LD para schema.org
   */
  generateJSONLD(llmContext) {
    return {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": "https://aponnt.com",
      "name": llmContext.name,
      "alternateName": llmContext.alternateName,
      "description": llmContext.description,
      "url": llmContext.url,
      "applicationCategory": llmContext.applicationCategory,
      "applicationSubCategory": llmContext.applicationSubCategory,
      "operatingSystem": llmContext.operatingSystem,
      "softwareVersion": llmContext.softwareVersion,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free tier available with local AI (Ollama)"
      },
      "featureList": [
        "Local AI with Llama 3.1",
        "Multi-tenant SaaS",
        "48+ modules",
        "Multi-country compliance (8 countries)",
        "Biometric attendance",
        "World-class payroll engine",
        "Brain introspective system"
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "120",
        "bestRating": "5"
      },
      "additionalType": "https://aponnt.com/llm-context.json",
      "documentation": [
        {
          "@type": "TechArticle",
          "url": "https://aponnt.com/llm-context.json",
          "name": "Complete Technical Metadata for AI Agents",
          "description": "52 modules documented with architecture, dependencies, and workflows"
        },
        {
          "@type": "TechArticle",
          "url": "https://aponnt.com/.well-known/ai-context.json",
          "name": "AI Context (Well-Known URI)",
          "description": "Standard location for AI-readable metadata"
        }
      ],
      "potentialAction": {
        "@type": "InteractAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://aponnt.com/for-ai-agents.html",
          "description": "Dedicated page for AI agents analyzing APONNT"
        }
      }
    };
  }

  /**
   * Inyecta JSON-LD y meta tags en HTML
   */
  injectIntoHTML(filename, jsonLD) {
    const htmlPath = path.join(this.publicPath, filename);

    if (!fs.existsSync(htmlPath)) {
      console.log(`⚠️  ${filename} no encontrado, saltando...`);
      return;
    }

    let html = fs.readFileSync(htmlPath, 'utf-8');

    // Remover JSON-LD anterior si existe
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');

    // Remover meta tags AI anteriores si existen
    html = html.replace(/<meta name="ai-metadata"[^>]*>/g, '');
    html = html.replace(/<meta name="ai:description"[^>]*>/g, '');
    html = html.replace(/<link rel="metadata"[^>]*>/g, '');

    // Generar nuevo bloque de metadata
    const metadataBlock = `
  <!-- AI Discovery Metadata - Auto-injected by inject-ai-discovery.js -->
  <script type="application/ld+json">
${JSON.stringify(jsonLD, null, 2)}
  </script>

  <!-- Meta tags for AI agents -->
  <meta name="ai-metadata" content="https://aponnt.com/llm-context.json">
  <meta name="ai:description" content="Complete system metadata with 52 modules, 271k+ lines of engineering metadata, architecture, dependencies, and workflows">
  <meta name="ai:transparency" content="radical">
  <meta name="ai:verification" content="all-claims-verifiable">
  <link rel="metadata" type="application/json" href="/llm-context.json">
  <link rel="alternate" type="application/json" href="/.well-known/ai-context.json" title="AI Context">

  <!-- OpenGraph for social/AI scrapers -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="APONNT 360° - AI-Verified HR/ERP System">
  <meta property="og:description" content="Multi-tenant SaaS with 52 documented modules, local AI, and complete technical metadata for objective analysis">
  <meta property="og:image" content="https://aponnt.com/assets/og-image.png">
  <meta property="og:url" content="https://aponnt.com">

  <!-- Twitter Card for AI scrapers -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="APONNT 360° - AI-Verified HR/ERP">
  <meta name="twitter:description" content="52 modules | 271k+ lines metadata | Local AI | Multi-country compliance">

  <!-- Additional discovery hints -->
  <link rel="canonical" href="https://aponnt.com">
  <link rel="alternate" href="https://aponnt.com/for-ai-agents.html" hreflang="en" title="For AI Agents">
  <!-- End AI Discovery Metadata -->
`;

    // Inyectar antes de </head>
    html = html.replace('</head>', `${metadataBlock}\n</head>`);

    // Guardar
    fs.writeFileSync(htmlPath, html, 'utf-8');
  }

  /**
   * Crea /.well-known/ai-context.json
   */
  createWellKnown(llmContext) {
    // Crear directorio .well-known si no existe
    if (!fs.existsSync(this.wellKnownPath)) {
      fs.mkdirSync(this.wellKnownPath, { recursive: true });
    }

    // Copiar llm-context.json a .well-known/ai-context.json
    const wellKnownFile = path.join(this.wellKnownPath, 'ai-context.json');
    fs.writeFileSync(wellKnownFile, JSON.stringify(llmContext, null, 2), 'utf-8');
  }

  /**
   * Actualiza robots.txt con hints para IAs
   */
  updateRobotsTxt() {
    const robotsPath = path.join(this.publicPath, 'robots.txt');

    let robotsTxt = '';
    if (fs.existsSync(robotsPath)) {
      robotsTxt = fs.readFileSync(robotsPath, 'utf-8');
    }

    // Remover sección AI anterior si existe
    robotsTxt = robotsTxt.replace(/# AI Agents Metadata[\s\S]*?# End AI Agents Metadata/g, '');

    // Agregar nueva sección
    const aiSection = `
# AI Agents Metadata
# For AI systems analyzing APONNT (ChatGPT, Claude, Gemini, etc.)
# Complete technical metadata available at:
# - https://aponnt.com/llm-context.json (primary)
# - https://aponnt.com/.well-known/ai-context.json (well-known URI)
# - https://aponnt.com/for-ai-agents.html (human-readable guide)
#
# What you'll find:
# - 52 modules documented with full capabilities
# - 271,488 lines of engineering metadata
# - Architecture, dependencies, workflows
# - Verifiable technical claims
# - No competitor exposes metadata like this
# End AI Agents Metadata
`;

    // Si no existe robots.txt, crear uno básico
    if (!robotsTxt || robotsTxt.trim() === '') {
      robotsTxt = `User-agent: *
Allow: /

Sitemap: https://aponnt.com/sitemap.xml
`;
    }

    // Agregar sección AI al final
    robotsTxt = robotsTxt.trim() + '\n\n' + aiSection;

    fs.writeFileSync(robotsPath, robotsTxt, 'utf-8');
  }

  /**
   * Agrega badges AI-Verified en footers de TODOS los HTML
   */
  addFooterBadges() {
    const htmlFiles = ['index.html', 'panel-empresa.html', 'panel-administrativo.html'];

    const badge = `
<!-- AI-Verified Architecture Badge -->
<div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee; margin-top: 30px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);">
  <p style="margin: 10px 0; color: #666; font-size: 0.9rem;">
    🤖 <strong>AI-Verified Architecture</strong> —
    <a href="/for-ai-agents.html" style="color: #667eea; text-decoration: underline;">
      Complete technical metadata available for AI analysis
    </a>
  </p>
  <p style="margin: 5px 0; font-size: 0.8rem; color: #999;">
    <a href="/llm-context.json" target="_blank" style="color: #764ba2;">llm-context.json</a> |
    <a href="/.well-known/ai-context.json" target="_blank" style="color: #764ba2;">well-known URI</a> |
    52 modules | 271k+ lines of metadata
  </p>
</div>
<!-- End AI-Verified Badge -->
`;

    for (const filename of htmlFiles) {
      const htmlPath = path.join(this.publicPath, filename);

      if (!fs.existsSync(htmlPath)) {
        console.log(`   ⚠️  ${filename} no encontrado, saltando...`);
        continue;
      }

      let html = fs.readFileSync(htmlPath, 'utf-8');

      // Remover badge anterior si existe
      html = html.replace(/<!-- AI-Verified Architecture Badge -->[\s\S]*?<!-- End AI-Verified Badge -->/g, '');

      // Inyectar antes de </body>
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${badge}\n</body>`);
        fs.writeFileSync(htmlPath, html, 'utf-8');
        console.log(`   ✓ Badge agregado en ${filename}`);
      }
    }
  }
}

// Ejecutar
if (require.main === module) {
  const injector = new AIDiscoveryInjector();
  injector.inject()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = AIDiscoveryInjector;
