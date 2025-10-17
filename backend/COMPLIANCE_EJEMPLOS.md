# 🛡️ SISTEMA DE COMPLIANCE - EJEMPLOS DE USO

**Valor:** Prevenir multas laborales automáticamente (hasta $500.000 por infracción)

---

## 📋 EJEMPLOS CON cURL

### 1. Obtener Dashboard de Compliance

```bash
curl -X GET http://localhost:3000/api/compliance/dashboard \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

**Respuesta Ejemplo:**
```json
{
  "success": true,
  "dashboard": {
    "summary": {
      "compliance_percent": 98.5,
      "total_violations": 3,
      "critical_violations": 1,
      "warning_violations": 2,
      "estimated_fine_risk": 125000
    },
    "violations_by_severity": [
      {
        "severity": "critical",
        "count": 1,
        "total_fines": 75000
      },
      {
        "severity": "warning",
        "count": 2,
        "total_fines": 50000
      }
    ],
    "top_violations": [
      {
        "rule_code": "rest_period_12h",
        "legal_reference": "Art. 197 LCT - Descanso entre jornadas",
        "severity": "critical",
        "violation_count": 1,
        "total_fines": 75000
      }
    ],
    "metrics": {
      "rest_periods": {
        "active_violations": 1,
        "resolved_violations": 5,
        "compliance_percent": 83.3
      },
      "overtime": {
        "active_violations": 2,
        "resolved_violations": 8,
        "compliance_percent": 80.0
      },
      "vacations": {
        "active_violations": 0,
        "resolved_violations": 12,
        "compliance_percent": 100.0
      }
    },
    "last_validation": "2025-10-16T15:30:00.000Z"
  }
}
```

### 2. Ejecutar Validación Manual

```bash
curl -X POST http://localhost:3000/api/compliance/validate \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Validación completada",
  "validation": {
    "company_id": 11,
    "total_rules": 6,
    "violations": [
      {
        "rule_code": "rest_period_12h",
        "rule_name": "Art. 197 LCT - Descanso entre jornadas",
        "severity": "critical",
        "violation_count": 1,
        "violations": [
          {
            "employee_id": "EMP-005",
            "violation_date": "2025-10-15",
            "details": {
              "work_date": "2025-10-15",
              "next_work_date": "2025-10-16",
              "rest_hours": "8.50",
              "minimum_required": 12,
              "difference": "3.50"
            },
            "severity": "critical"
          }
        ],
        "fine_min": 150000,
        "fine_max": 500000
      }
    ],
    "passed": [
      {
        "rule_code": "rest_period_weekly",
        "rule_name": "Art. 204 LCT - Descanso semanal"
      },
      {
        "rule_code": "medical_certificate",
        "rule_name": "Art. 209 LCT - Certificado médico obligatorio"
      }
    ],
    "compliance_percent": 83.3,
    "total_estimated_fines": 325000
  }
}
```

### 3. Listar Violaciones Activas

```bash
curl -X GET "http://localhost:3000/api/compliance/violations?severity=critical" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

**Respuesta:**
```json
{
  "success": true,
  "violations": [
    {
      "id": 1,
      "company_id": 11,
      "rule_code": "rest_period_12h",
      "employee_id": "EMP-005",
      "violation_date": "2025-10-15",
      "violation_data": {
        "work_date": "2025-10-15",
        "rest_hours": "8.50",
        "minimum_required": 12
      },
      "estimated_fine": 325000,
      "status": "active",
      "legal_reference": "Art. 197 LCT - Descanso entre jornadas",
      "severity": "critical",
      "fine_amount_min": 150000,
      "fine_amount_max": 500000
    }
  ],
  "total": 1
}
```

### 4. Resolver una Violación

```bash
curl -X POST http://localhost:3000/api/compliance/violations/1/resolve \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Se ajustó el horario del empleado para garantizar 12h de descanso entre jornadas"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Violación resuelta exitosamente"
}
```

### 5. Generar Alertas Automáticas

```bash
curl -X POST http://localhost:3000/api/compliance/alerts \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "1 alertas generadas",
  "alerts": {
    "alerts_generated": 1,
    "alert_content": "⚠️ ALERTA DE CUMPLIMIENTO LEGAL\n\nSe detectaron 1 violaciones CRÍTICAS que requieren atención inmediata:\n\n1. Art. 197 LCT - Descanso entre jornadas\n   - Violaciones: 1\n   - Multa estimada: $325,000\n\n💰 Riesgo total estimado de multas: $325,000\n📊 Cumplimiento general: 83.3%"
  }
}
```

### 6. Obtener Resumen Rápido

```bash
curl -X GET http://localhost:3000/api/compliance/summary \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### 7. Obtener Métrica Específica

```bash
curl -X GET http://localhost:3000/api/compliance/metrics/rest_period \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

**Respuesta:**
```json
{
  "success": true,
  "type": "rest_period",
  "metric": {
    "active_violations": 1,
    "resolved_violations": 5,
    "compliance_percent": 83.3
  }
}
```

### 8. Listar Todas las Reglas

```bash
curl -X GET http://localhost:3000/api/compliance/rules \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

---

## 💻 EJEMPLOS CON JAVASCRIPT/NODE.JS

### Ejemplo 1: Validar Compliance al Final del Día

```javascript
const complianceService = require('./src/services/complianceService');

// Ejecutar validación automática cada noche
async function validacionDiaria() {
    const companyId = 11;

    console.log('🔍 Iniciando validación diaria de compliance...');

    const validation = await complianceService.validateAllRules(companyId);

    console.log(`📊 Cumplimiento: ${validation.compliance_percent}%`);
    console.log(`⚠️ Violaciones: ${validation.violations.length}`);
    console.log(`💰 Riesgo de multas: $${validation.total_estimated_fines.toLocaleString()}`);

    // Si hay violaciones críticas, enviar alerta
    const critical = validation.violations.filter(v => v.severity === 'critical');

    if (critical.length > 0) {
        console.log(`🚨 ALERTA: ${critical.length} violaciones críticas detectadas`);

        await complianceService.generateComplianceAlerts(companyId);
    }

    return validation;
}

// Ejecutar con cron job
validacionDiaria();
```

### Ejemplo 2: Dashboard en Tiempo Real

```javascript
const complianceService = require('./src/services/complianceService');

async function mostrarDashboard() {
    const companyId = 11;

    const dashboard = await complianceService.getComplianceDashboard(companyId);

    console.log('\n📊 DASHBOARD DE CUMPLIMIENTO LEGAL\n');
    console.log('═══════════════════════════════════════════════\n');

    const summary = dashboard.summary;

    console.log(`✅ Cumplimiento General: ${summary.compliance_percent}%`);
    console.log(`⚠️ Violaciones Totales: ${summary.total_violations}`);
    console.log(`   • Críticas: ${summary.critical_violations}`);
    console.log(`   • Advertencias: ${summary.warning_violations}`);
    console.log(`💰 Riesgo Estimado de Multas: $${summary.estimated_fine_risk.toLocaleString()}\n`);

    console.log('📈 MÉTRICAS POR CATEGORÍA:\n');
    console.log(`• Períodos de descanso: ${dashboard.metrics.rest_periods.compliance_percent}% cumplimiento`);
    console.log(`• Horas extra: ${dashboard.metrics.overtime.compliance_percent}% cumplimiento`);
    console.log(`• Vacaciones: ${dashboard.metrics.vacations.compliance_percent}% cumplimiento`);
    console.log(`• Documentación: ${dashboard.metrics.documentation.compliance_percent}% cumplimiento\n`);

    if (dashboard.top_violations.length > 0) {
        console.log('🔝 TOP VIOLACIONES:\n');
        dashboard.top_violations.forEach((v, i) => {
            console.log(`${i + 1}. ${v.legal_reference}`);
            console.log(`   Violaciones: ${v.violation_count} | Multa: $${v.total_fines.toLocaleString()}`);
        });
    }
}

mostrarDashboard();
```

### Ejemplo 3: Validar Antes de Aprobar Cambio de Turno

```javascript
const complianceService = require('./src/services/complianceService');

async function validarCambioTurno(employeeId, swapDate) {
    const companyId = 11;

    // Validar regla de período de descanso
    const violations = await complianceService.validateRestPeriod(companyId, {
        rule_code: 'rest_period_12h',
        rule_type: 'rest_period'
    });

    // Filtrar violaciones para este empleado en esta fecha
    const employeeViolations = violations.filter(v =>
        v.employee_id === employeeId &&
        v.violation_date >= swapDate
    );

    if (employeeViolations.length > 0) {
        const violation = employeeViolations[0];

        console.log(`❌ BLOQUEO: Cambio de turno viola período de descanso legal`);
        console.log(`   Horas de descanso: ${violation.details.rest_hours}h`);
        console.log(`   Mínimo legal: ${violation.details.minimum_required}h`);
        console.log(`   Multa potencial: $150,000 - $500,000`);

        return { valid: false, violation: violation };
    }

    console.log(`✅ Cambio de turno cumple con período de descanso legal`);
    return { valid: true };
}

// Usar en el flujo de aprobación
validarCambioTurno('EMP-005', '2025-10-20');
```

### Ejemplo 4: Cron Job Automático

```javascript
const cron = require('node-cron');
const complianceService = require('./src/services/complianceService');

// Ejecutar validación todos los días a las 23:00
cron.schedule('0 23 * * *', async () => {
    console.log('🕐 Ejecutando validación automática de compliance...');

    const companies = [11, 12, 13]; // IDs de empresas activas

    for (const companyId of companies) {
        try {
            const validation = await complianceService.validateAllRules(companyId);

            console.log(`[Empresa ${companyId}] ${validation.compliance_percent}% cumplimiento`);

            // Generar alertas si hay violaciones críticas
            const criticalCount = validation.violations.filter(v => v.severity === 'critical').length;

            if (criticalCount > 0) {
                await complianceService.generateComplianceAlerts(companyId);
                console.log(`[Empresa ${companyId}] ${criticalCount} alertas críticas enviadas`);
            }

        } catch (error) {
            console.error(`[Empresa ${companyId}] Error en validación:`, error.message);
        }
    }

    console.log('✅ Validación automática completada');
});
```

---

## 🎯 CASOS DE USO PRÁCTICOS

### Caso 1: Detectar Empleado Trabajando Sin Descanso

```javascript
// Empleado trabaja hasta las 22:00 y entra a las 06:00 del día siguiente
// Sistema detecta automáticamente la violación

const validation = await complianceService.validateAllRules(11);

const restViolations = validation.violations.find(v => v.rule_code === 'rest_period_12h');

if (restViolations) {
    console.log(`⚠️ Detectadas ${restViolations.violation_count} violaciones de período de descanso`);

    restViolations.violations.forEach(v => {
        console.log(`Empleado: ${v.employee_id}`);
        console.log(`Trabajó hasta: ${v.details.work_date}`);
        console.log(`Entró nuevamente: ${v.details.next_work_date}`);
        console.log(`Solo descansó: ${v.details.rest_hours} horas (mínimo: 12h)`);
        console.log(`Multa potencial: $150,000 - $500,000\n`);
    });

    // Bloquear próximo fichaje si es necesario
    // Notificar a RRHH automáticamente
}
```

### Caso 2: Alertar Vacaciones Próximas a Vencer

```javascript
const validation = await complianceService.validateAllRules(11);

const vacationViolations = validation.violations.find(v => v.rule_code === 'vacation_expiry');

if (vacationViolations) {
    console.log(`📅 ${vacationViolations.violation_count} empleados con vacaciones por vencer\n`);

    vacationViolations.violations.forEach(v => {
        console.log(`Empleado: ${v.employee_id}`);
        console.log(`Días disponibles: ${v.details.balance}`);
        console.log(`Vencen en: ${v.details.days_until_expiry} días`);
        console.log(`Fecha límite: ${v.details.expiry_date}\n`);

        // Crear notificación automática al empleado y RRHH
    });
}
```

### Caso 3: Verificar Horas Extra del Mes

```javascript
const overtimeMetric = await complianceService.getMetricByType(11, 'overtime_limit');

console.log(`📊 Métrica de Horas Extra:`);
console.log(`Violaciones activas: ${overtimeMetric.active_violations}`);
console.log(`Cumplimiento: ${overtimeMetric.compliance_percent}%`);

if (overtimeMetric.active_violations > 0) {
    const violations = await complianceService.getActiveViolations(11, {
        severity: 'warning',
        limit: 10
    });

    console.log(`\n⚠️ Empleados que exceden 30h extras mensuales:\n`);

    violations.forEach(v => {
        if (v.rule_code === 'overtime_limit_monthly') {
            const data = JSON.parse(v.violation_data);
            console.log(`• ${v.employee_id}: ${data.total_overtime_hours}h (exceso: ${data.excess}h)`);
        }
    });
}
```

---

## 📊 QUERIES SQL ÚTILES

### Ver Dashboard Manual

```sql
-- Resumen de violaciones por severidad
SELECT
    cr.severity,
    COUNT(cv.id) as total_violations,
    SUM(cv.estimated_fine) as total_fines
FROM compliance_violations cv
JOIN compliance_rules cr ON cv.rule_code = cr.rule_code
WHERE cv.company_id = 11
AND cv.status = 'active'
GROUP BY cr.severity
ORDER BY
    CASE cr.severity
        WHEN 'critical' THEN 1
        WHEN 'warning' THEN 2
        ELSE 3
    END;
```

### Empleados con Más Violaciones

```sql
SELECT
    cv.employee_id,
    COUNT(cv.id) as total_violations,
    SUM(cv.estimated_fine) as total_fines
FROM compliance_violations cv
WHERE cv.company_id = 11
AND cv.status = 'active'
GROUP BY cv.employee_id
ORDER BY total_violations DESC
LIMIT 10;
```

### Histórico de Cumplimiento

```sql
SELECT
    DATE_TRUNC('month', cv.violation_date) as month,
    COUNT(cv.id) as violations_count,
    COUNT(cv.id) FILTER (WHERE cv.status = 'resolved') as resolved_count
FROM compliance_violations cv
WHERE cv.company_id = 11
AND cv.violation_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', cv.violation_date)
ORDER BY month DESC;
```

---

## ✅ CHECKLIST DE TESTING

- [ ] Ejecutar validación manual de compliance
- [ ] Ver dashboard completo
- [ ] Listar violaciones activas
- [ ] Filtrar violaciones por severidad (critical, warning)
- [ ] Resolver una violación
- [ ] Generar alertas automáticas
- [ ] Ver métricas por categoría
- [ ] Verificar detección de período de descanso < 12h
- [ ] Verificar detección de horas extra > 30h mensuales
- [ ] Verificar detección de vacaciones próximas a vencer
- [ ] Integrar con flujo de cambio de turno (bloquear si viola)
- [ ] Configurar cron job para validación automática

---

**Última actualización:** 2025-10-16
**Versión:** 1.0
