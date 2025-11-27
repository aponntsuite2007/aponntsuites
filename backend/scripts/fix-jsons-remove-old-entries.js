const fs = require('fs');
const path = require('path');

console.log('\n🔧 Eliminando entradas viejas y dejando solo las correctas...\n');

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

// Keys a remover (las que tenían problemas)
const keysToRemove = [
  "22_modulos_integrados",
  "idiomas_disponibles",
  "patrones_ia",
  "b2b_multitenant",
  "desc_sistema_integral",
  "recursos_empresariales",
  "hero_subtitle_full",
  "es_espanol",
  "en_english",
  "pt_portugues",
  "fr_francais",
  "de_deutsch",
  "it_italiano",
  "puntualidad",
  "empleados",
  "12_hoy",
  "score_promedio",
  "ia_predictiva",
  "biometria"
];

// Traducciones correctas (sin duplicados)
const correctTranslations = {
  es: {
    "desc_sistema_integral": "Sistema Integral de Planificación y Administración de los Recursos Empresariales",
    "recursos_empresariales": "Recursos Empresariales",
    "hero_subtitle_full": "Plataforma SaaS B2B de gestión de asistencias, biometría y recursos humanos. Análisis predictivo con IA para anticipar patrones y optimizar la gestión de personal. Disponible en 6 idiomas para empresas globales.",
    "es_espanol": "ES Español",
    "en_english": "EN English",
    "pt_portugues": "PT Português",
    "fr_francais": "FR Français",
    "de_deutsch": "DE Deutsch",
    "it_italiano": "IT Italiano",
    "22_modulos_integrados": "Módulos integrados",
    "idiomas_disponibles": "Idiomas disponibles",
    "patrones_ia": "Patrones IA",
    "b2b_multitenant": "B2B Multi-tenant",
    "puntualidad": "Puntualidad",
    "empleados": "Empleados",
    "12_hoy": "+12 hoy",
    "score_promedio": "Score promedio",
    "ia_predictiva": "IA Predictiva",
    "biometria": "Biometría"
  },
  en: {
    "desc_sistema_integral": "Comprehensive System for Planning and Management of Business Resources",
    "recursos_empresariales": "Business Resources",
    "hero_subtitle_full": "B2B SaaS platform for attendance management, biometrics and human resources. Predictive analysis with AI to anticipate patterns and optimize personnel management. Available in 6 languages for global companies.",
    "es_espanol": "ES Spanish",
    "en_english": "EN English",
    "pt_portugues": "PT Portuguese",
    "fr_francais": "FR French",
    "de_deutsch": "DE German",
    "it_italiano": "IT Italian",
    "22_modulos_integrados": "Integrated modules",
    "idiomas_disponibles": "Available languages",
    "patrones_ia": "AI Patterns",
    "b2b_multitenant": "B2B Multi-tenant",
    "puntualidad": "Punctuality",
    "empleados": "Employees",
    "12_hoy": "+12 today",
    "score_promedio": "Average score",
    "ia_predictiva": "Predictive AI",
    "biometria": "Biometrics"
  },
  pt: {
    "desc_sistema_integral": "Sistema Integral de Planejamento e Administração dos Recursos Empresariais",
    "recursos_empresariales": "Recursos Empresariais",
    "hero_subtitle_full": "Plataforma SaaS B2B de gestão de assistências, biometria e recursos humanos. Análise preditiva com IA para antecipar padrões e otimizar a gestão de pessoal. Disponível em 6 idiomas para empresas globais.",
    "es_espanol": "ES Espanhol",
    "en_english": "EN Inglês",
    "pt_portugues": "PT Português",
    "fr_francais": "FR Francês",
    "de_deutsch": "DE Alemão",
    "it_italiano": "IT Italiano",
    "22_modulos_integrados": "Módulos integrados",
    "idiomas_disponibles": "Idiomas disponíveis",
    "patrones_ia": "Padrões IA",
    "b2b_multitenant": "B2B Multi-tenant",
    "puntualidad": "Pontualidade",
    "empleados": "Funcionários",
    "12_hoy": "+12 hoje",
    "score_promedio": "Score médio",
    "ia_predictiva": "IA Preditiva",
    "biometria": "Biometria"
  },
  de: {
    "desc_sistema_integral": "Integrales System für Planung und Verwaltung von Unternehmensressourcen",
    "recursos_empresariales": "Unternehmensressourcen",
    "hero_subtitle_full": "B2B-SaaS-Plattform für Anwesenheitsverwaltung, Biometrie und Personalwesen. Prädiktive Analyse mit KI zur Mustererkennung und Personaloptimierung. Verfügbar in 6 Sprachen für globale Unternehmen.",
    "es_espanol": "ES Spanisch",
    "en_english": "EN Englisch",
    "pt_portugues": "PT Portugiesisch",
    "fr_francais": "FR Französisch",
    "de_deutsch": "DE Deutsch",
    "it_italiano": "IT Italienisch",
    "22_modulos_integrados": "Integrierte Module",
    "idiomas_disponibles": "Verfügbare Sprachen",
    "patrones_ia": "KI-Muster",
    "b2b_multitenant": "B2B Multi-Tenant",
    "puntualidad": "Pünktlichkeit",
    "empleados": "Mitarbeiter",
    "12_hoy": "+12 heute",
    "score_promedio": "Durchschnittsscore",
    "ia_predictiva": "Prädiktive KI",
    "biometria": "Biometrie"
  },
  it: {
    "desc_sistema_integral": "Sistema Integrale di Pianificazione e Gestione delle Risorse Aziendali",
    "recursos_empresariales": "Risorse Aziendali",
    "hero_subtitle_full": "Piattaforma SaaS B2B per gestione presenze, biometria e risorse umane. Analisi predittiva con IA per anticipare pattern e ottimizzare la gestione del personale. Disponibile in 6 lingue per aziende globali.",
    "es_espanol": "ES Spagnolo",
    "en_english": "EN Inglese",
    "pt_portugues": "PT Portoghese",
    "fr_francais": "FR Francese",
    "de_deutsch": "DE Tedesco",
    "it_italiano": "IT Italiano",
    "22_modulos_integrados": "Moduli integrati",
    "idiomas_disponibles": "Lingue disponibili",
    "patrones_ia": "Pattern IA",
    "b2b_multitenant": "B2B Multi-tenant",
    "puntualidad": "Puntualità",
    "empleados": "Dipendenti",
    "12_hoy": "+12 oggi",
    "score_promedio": "Score medio",
    "ia_predictiva": "IA Predittiva",
    "biometria": "Biometria"
  },
  fr: {
    "desc_sistema_integral": "Système Intégral de Planification et d'Administration des Ressources d'Entreprise",
    "recursos_empresariales": "Ressources d'Entreprise",
    "hero_subtitle_full": "Plateforme SaaS B2B de gestion des présences, biométrie et ressources humaines. Analyse prédictive avec IA pour anticiper les modèles et optimiser la gestion du personnel. Disponible en 6 langues pour les entreprises mondiales.",
    "es_espanol": "ES Espagnol",
    "en_english": "EN Anglais",
    "pt_portugues": "PT Portugais",
    "fr_francais": "FR Français",
    "de_deutsch": "DE Allemand",
    "it_italiano": "IT Italien",
    "22_modulos_integrados": "Modules intégrés",
    "idiomas_disponibles": "Langues disponibles",
    "patrones_ia": "Modèles IA",
    "b2b_multitenant": "B2B Multi-locataire",
    "puntualidad": "Ponctualité",
    "empleados": "Employés",
    "12_hoy": "+12 aujourd'hui",
    "score_promedio": "Score moyen",
    "ia_predictiva": "IA Prédictive",
    "biometria": "Biométrie"
  }
};

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Remover TODAS las keys problemáticas
  keysToRemove.forEach(key => {
    delete data[key];
  });

  // Agregar las correctas una sola vez
  Object.keys(correctTranslations[lang]).forEach(key => {
    data[key] = correctTranslations[lang][key];
  });

  // Guardar limpio
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`✅ ${lang}.json limpiado (eliminadas viejas, agregadas correctas)`);
});

console.log('\n✅ COMPLETADO - JSONs sin duplicados, solo traducciones correctas\n');
