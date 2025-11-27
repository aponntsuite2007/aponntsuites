const fs = require('fs');
const path = require('path');

console.log('\n🔧 Creando traducciones para párrafos mixtos (con HTML interno)...\n');

// Los 4 párrafos problemáticos con placeholders para <strong>
const mixedParagraphsES = {
  // Párrafo 1: Línea 2323 (badge)
  analisis_predictivo_badge: "ANALISIS PREDICTIVO EN TIEMPO REAL",

  // Párrafo 2: Línea 2329
  expediente_360_desc_html: 'La unica herramienta de RRHH que <strong style="color: #8b5cf6;" data-translate="index.predice_comportamientos">predice comportamientos</strong>, <strong style="color: #06b6d4;" data-translate="index.detecta_riesgos_de_fuga">detecta riesgos de fuga</strong> y genera <strong style="color: #22c55e;" data-translate="index.evaluaciones_automaticas_con_ia">evaluaciones automaticas con IA</strong>',

  // Párrafo 3: Línea 4065
  liquidacion_desc_html: 'Sistema <strong style="color: #22c55e;" data-translate="index.multipais_totalmente_configurable">multi-pais totalmente configurable</strong>. Define tus propios conceptos, aportes y deducciones segun la <strong style="color: #14b8a6;" data-translate="index.legislacion_de_tu_pais">legislacion de tu pais</strong>',

  // Párrafo 4: Líneas 5157-5158
  kiosko_gps_desc_html: 'Cada kiosko tiene un <strong data-translate="index.area_de_cobertura_gps_configurable">area de cobertura GPS configurable</strong> por departamento. El sistema valida automaticamente que el empleado este dentro del radio autorizado antes de permitir el fichaje.'
};

// Traducciones manuales (CORRECTAS, sin perder tags HTML)
const translations = {
  en: {
    analisis_predictivo_badge: "REAL-TIME PREDICTIVE ANALYSIS",
    expediente_360_desc_html: 'The only HR tool that <strong style="color: #8b5cf6;" data-translate="index.predice_comportamientos">predicts behaviors</strong>, <strong style="color: #06b6d4;" data-translate="index.detecta_riesgos_de_fuga">detects flight risks</strong> and generates <strong style="color: #22c55e;" data-translate="index.evaluaciones_automaticas_con_ia">automatic evaluations with AI</strong>',
    liquidacion_desc_html: 'Fully <strong style="color: #22c55e;" data-translate="index.multipais_totalmente_configurable">multi-country configurable</strong> system. Define your own concepts, contributions and deductions according to the <strong style="color: #14b8a6;" data-translate="index.legislacion_de_tu_pais">legislation of your country</strong>',
    kiosko_gps_desc_html: 'Each kiosk has a <strong data-translate="index.area_de_cobertura_gps_configurable">configurable GPS coverage area</strong> per department. The system automatically validates that the employee is within the authorized radius before allowing check-in.'
  },
  pt: {
    analisis_predictivo_badge: "ANÁLISE PREDITIVA EM TEMPO REAL",
    expediente_360_desc_html: 'A única ferramenta de RH que <strong style="color: #8b5cf6;" data-translate="index.predice_comportamientos">prevê comportamentos</strong>, <strong style="color: #06b6d4;" data-translate="index.detecta_riesgos_de_fuga">detecta riscos de fuga</strong> e gera <strong style="color: #22c55e;" data-translate="index.evaluaciones_automaticas_con_ia">avaliações automáticas com IA</strong>',
    liquidacion_desc_html: 'Sistema totalmente <strong style="color: #22c55e;" data-translate="index.multipais_totalmente_configurable">configurável multipaís</strong>. Defina seus próprios conceitos, contribuições e deduções de acordo com a <strong style="color: #14b8a6;" data-translate="index.legislacion_de_tu_pais">legislação de seu país</strong>',
    kiosko_gps_desc_html: 'Cada quiosque tem uma <strong data-translate="index.area_de_cobertura_gps_configurable">área de cobertura GPS configurável</strong> por departamento. O sistema valida automaticamente se o funcionário está dentro do raio autorizado antes de permitir o check-in.'
  },
  de: {
    analisis_predictivo_badge: "ECHTZEIT-PRÄDIKTIVE ANALYSE",
    expediente_360_desc_html: 'Das einzige HR-Tool, das <strong style="color: #8b5cf6;" data-translate="index.predice_comportamientos">Verhaltensweisen vorhersagt</strong>, <strong style="color: #06b6d4;" data-translate="index.detecta_riesgos_de_fuga">Fluchtrisiken erkennt</strong> und <strong style="color: #22c55e;" data-translate="index.evaluaciones_automaticas_con_ia">automatische Bewertungen mit KI</strong> generiert',
    liquidacion_desc_html: 'Vollständig <strong style="color: #22c55e;" data-translate="index.multipais_totalmente_configurable">mehrländerkonfigurierbares</strong> System. Definieren Sie Ihre eigenen Konzepte, Beiträge und Abzüge gemäß der <strong style="color: #14b8a6;" data-translate="index.legislacion_de_tu_pais">Gesetzgebung Ihres Landes</strong>',
    kiosko_gps_desc_html: 'Jeder Kiosk verfügt über einen <strong data-translate="index.area_de_cobertura_gps_configurable">konfigurierbaren GPS-Abdeckungsbereich</strong> pro Abteilung. Das System validiert automatisch, ob sich der Mitarbeiter innerhalb des autorisierten Radius befindet, bevor ein Check-in ermöglicht wird.'
  },
  it: {
    analisis_predictivo_badge: "ANALISI PREDITTIVA IN TEMPO REALE",
    expediente_360_desc_html: 'L\'unico strumento HR che <strong style="color: #8b5cf6;" data-translate="index.predice_comportamientos">prevede i comportamenti</strong>, <strong style="color: #06b6d4;" data-translate="index.detecta_riesgos_de_fuga">rileva i rischi di fuga</strong> e genera <strong style="color: #22c55e;" data-translate="index.evaluaciones_automaticas_con_ia">valutazioni automatiche con IA</strong>',
    liquidacion_desc_html: 'Sistema completamente <strong style="color: #22c55e;" data-translate="index.multipais_totalmente_configurable">configurabile multipaese</strong>. Definisci i tuoi concetti, contributi e detrazioni secondo la <strong style="color: #14b8a6;" data-translate="index.legislacion_de_tu_pais">legislazione del tuo paese</strong>',
    kiosko_gps_desc_html: 'Ogni chiosco ha un\'<strong data-translate="index.area_de_cobertura_gps_configurable">area di copertura GPS configurabile</strong> per reparto. Il sistema convalida automaticamente che il dipendente sia all\'interno del raggio autorizzato prima di consentire il check-in.'
  },
  fr: {
    analisis_predictivo_badge: "ANALYSE PRÉDICTIVE EN TEMPS RÉEL",
    expediente_360_desc_html: 'Le seul outil RH qui <strong style="color: #8b5cf6;" data-translate="index.predice_comportamientos">prédit les comportements</strong>, <strong style="color: #06b6d4;" data-translate="index.detecta_riesgos_de_fuga">détecte les risques de fuite</strong> et génère des <strong style="color: #22c55e;" data-translate="index.evaluaciones_automaticas_con_ia">évaluations automatiques avec IA</strong>',
    liquidacion_desc_html: 'Système entièrement <strong style="color: #22c55e;" data-translate="index.multipais_totalmente_configurable">configurable multipays</strong>. Définissez vos propres concepts, cotisations et déductions selon la <strong style="color: #14b8a6;" data-translate="index.legislacion_de_tu_pais">législation de votre pays</strong>',
    kiosko_gps_desc_html: 'Chaque kiosque dispose d\'une <strong data-translate="index.area_de_cobertura_gps_configurable">zone de couverture GPS configurable</strong> par département. Le système valide automatiquement que l\'employé se trouve dans le rayon autorisé avant d\'autoriser l\'enregistrement.'
  }
};

// Agregar a todos los archivos JSON
const localesPath = path.join(__dirname, '../public/locales');

// Español
const esPath = path.join(localesPath, 'es.json');
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

for (const [key, value] of Object.entries(mixedParagraphsES)) {
  es.index[key] = value;
}

fs.writeFileSync(esPath, JSON.stringify(es, null, 2), 'utf8');
console.log('✅ es.json actualizado');

// Otros idiomas
for (const [lang, texts] of Object.entries(translations)) {
  const langPath = path.join(localesPath, `${lang}.json`);
  const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));

  for (const [key, value] of Object.entries(texts)) {
    langData.index[key] = value;
  }

  fs.writeFileSync(langPath, JSON.stringify(langData, null, 2), 'utf8');
  console.log(`✅ ${lang}.json actualizado`);
}

console.log('\n✨ Traducciones HTML creadas correctamente\n');
console.log('📝 Ahora modifica index.html para usar innerHTML en vez de textContent:\n');
console.log('Línea 2323: Cambiar a data-translate="index.analisis_predictivo_badge"');
console.log('Línea 2328: Agregar data-translate-html="index.expediente_360_desc_html"');
console.log('Línea 4064: Agregar data-translate-html="index.liquidacion_desc_html"');
console.log('Línea 5157: Agregar data-translate-html="index.kiosko_gps_desc_html"');
