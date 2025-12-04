#!/usr/bin/env node
const http = require('http');

// Login
const loginReq = http.request({
  hostname: 'localhost',
  port: 9998,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const { token } = JSON.parse(data);
    console.log('Login OK, token:', token.substring(0, 50) + '...');
    console.log('');

    // Test Employee 360 API
    const testReq = http.request({
      hostname: 'localhost',
      port: 9998,
      path: '/api/employee-360/766de495-e4f3-4e91-a509-1a495c52e15c/report',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      let d2 = '';
      res2.on('data', c => d2 += c);
      res2.on('end', () => {
        try {
          const result = JSON.parse(d2);
          console.log('=== RESULTADO API EMPLOYEE 360 v3.1 ===');
          console.log('SUCCESS:', result.success);

          if (result.success) {
            const r = result.report;
            console.log('');
            console.log('=== METADATA ===');
            console.log('Version:', r.metadata?.version);
            console.log('');
            console.log('=== EMPLEADO ===');
            console.log('Nombre:', r.employee?.fullName);
            console.log('Puesto:', r.employee?.position);
            console.log('Antiguedad:', r.employee?.tenure?.formatted);
            console.log('');
            console.log('=== SCORING 6D ===');
            console.log('Total:', r.scoring?.total + '/100');
            console.log('Grado:', r.scoring?.grade?.letter);
            if (r.scoring?.categories) {
              Object.entries(r.scoring.categories).forEach(([k, v]) => {
                console.log('  -', v.label || k, ':', v.score + '/100');
              });
            }
            console.log('');
            console.log('=== FLIGHT RISK (Predictivo) ===');
            console.log('Score:', r.flightRisk?.score + '%');
            console.log('Level:', r.flightRisk?.label);
            console.log('Insight:', r.flightRisk?.insight);
            console.log('Factores:', r.flightRisk?.factors?.length || 0);
            if (r.flightRisk?.factors?.length > 0) {
              r.flightRisk.factors.forEach(f => console.log('  -', f.factor, ':', f.impact, 'pts'));
            }
            console.log('');
            console.log('=== PATRONES DE COMPORTAMIENTO ===');
            console.log('Total patrones:', r.behaviorPatterns?.length || 0);
            if (r.behaviorPatterns?.length > 0) {
              r.behaviorPatterns.forEach(p => console.log('  -', p.name, ':', p.statusLabel, '-', p.stats));
            }
            console.log('');
            console.log('=== BIOMETRICO EMOCIONAL (NUEVO v3.1) ===');
            console.log('hasModule:', r.biometricAnalysis?.hasModule);
            console.log('emotionalHistory:', r.biometricAnalysis?.emotionalHistory?.length || 0, 'registros');
            console.log('correlatedEvents:', r.biometricAnalysis?.correlatedEvents?.length || 0, 'eventos');
            console.log('correlaciones:', r.biometricAnalysis?.correlations?.length || 0, 'detectadas');
            console.log('alertas:', r.biometricAnalysis?.alerts?.length || 0);
            if (r.biometricAnalysis?.metrics?.totalSamples > 0) {
              console.log('Metricas:');
              console.log('  - avgFatigue:', ((r.biometricAnalysis.metrics.avgFatigue || 0) * 100).toFixed(1) + '%');
              console.log('  - avgHappiness:', ((r.biometricAnalysis.metrics.avgHappiness || 0) * 100).toFixed(1) + '%');
              console.log('  - trend:', r.biometricAnalysis.metrics.trend);
            }
            if (r.biometricAnalysis?.correlations?.length > 0) {
              console.log('Correlaciones detectadas:');
              r.biometricAnalysis.correlations.forEach(c => {
                console.log('  -', c.event.event_type, ':', c.significance, '-', c.insight?.substring(0, 80) + '...');
              });
            }
            console.log('');
            console.log('=== COMPATIBILIDAD DE TAREAS (NUEVO v3.1) ===');
            console.log('hasModule:', r.taskCompatibility?.hasModule);
            console.log('hasNoReplacement:', r.taskCompatibility?.hasNoReplacement);
            console.log('replacements:', r.taskCompatibility?.replacements?.length || 0, 'disponibles');
            console.log('canReplace:', r.taskCompatibility?.canReplace?.length || 0, 'personas');
            if (r.taskCompatibility?.replacements?.length > 0) {
              console.log('Quienes pueden reemplazar:');
              r.taskCompatibility.replacements.forEach(rep => {
                console.log('  -', rep.coverName, ':', rep.compatibilityScore + '%');
              });
            }
            if (r.taskCompatibility?.alert) {
              console.log('ALERTA:', r.taskCompatibility.alert);
            }
            console.log('');
            console.log('=== TIMELINE ===');
            console.log('Eventos:', r.timeline?.length || 0);
            console.log('');
            console.log('=== DATOS COMPLETOS ===');
            console.log('salary:', r.completeUserData?.salary ? 'SI' : 'NO');
            console.log('family:', r.completeUserData?.family ? 'SI' : 'NO');
            console.log('education:', r.completeUserData?.education ? 'SI' : 'NO');
            console.log('documents:', r.completeUserData?.documents ? 'SI' : 'NO');
            console.log('unionAndLegal:', r.completeUserData?.unionAndLegal ? 'SI' : 'NO');
            console.log('');
            console.log('=== AI ANALYSIS ===');
            console.log('Generated:', r.aiAnalysis?.generated ? 'Ollama' : 'Fallback');

          } else {
            console.log('Error:', result.error || JSON.stringify(result).substring(0, 500));
          }
        } catch (e) {
          console.log('Error parsing:', e.message);
          console.log('Response:', d2.substring(0, 500));
        }
      });
    });
    testReq.end();
  });
});
loginReq.write(JSON.stringify({identifier:'admin@isi.com',password:'admin123',companyId:11}));
loginReq.end();
