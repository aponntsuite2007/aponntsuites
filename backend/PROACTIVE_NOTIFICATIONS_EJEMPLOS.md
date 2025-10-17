# PROACTIVE NOTIFICATIONS - Ejemplos de Uso

Sistema de notificaciones preventivas que detecta problemas ANTES de que ocurran y genera alertas automáticas.

## Índice

1. [Dashboard de reglas proactivas](#1-dashboard-de-reglas-proactivas)
2. [Listar reglas activas](#2-listar-reglas-activas)
3. [Crear regla proactiva](#3-crear-regla-proactiva)
4. [Ejecutar todas las reglas](#4-ejecutar-todas-las-reglas)
5. [Ejecutar regla específica](#5-ejecutar-regla-específica)
6. [Actualizar regla](#6-actualizar-regla)
7. [Desactivar regla](#7-desactivar-regla)
8. [Historial de ejecuciones](#8-historial-de-ejecuciones)
9. [Tipos de reglas disponibles](#9-tipos-de-reglas-disponibles)
10. [Casos de uso prácticos](#10-casos-de-uso-prácticos)

---

## 1. Dashboard de reglas proactivas

Obtiene resumen de reglas activas con estadísticas de ejecuciones.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/proactive/dashboard" \
  -H "x-company-id: 11" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "dashboard": {
    "summary": {
      "total_rules": 5,
      "total_executions_30d": 150,
      "total_matches_30d": 87,
      "total_actions_30d": 87
    },
    "rules": [
      {
        "id": 1,
        "company_id": 11,
        "rule_name": "Vacaciones próximas a vencer",
        "rule_type": "vacation_expiry",
        "trigger_threshold": {
          "days_until_expiry": 45
        },
        "auto_action": "create_notification",
        "notification_recipients": ["employee", "rrhh"],
        "priority": "medium",
        "check_frequency": "weekly",
        "active": true,
        "last_checked": "2025-10-16T08:00:00.000Z",
        "last_execution": {
          "id": 523,
          "execution_time": "2025-10-16T08:00:00.000Z",
          "matched_count": 12,
          "actions_taken": 12
        }
      },
      {
        "id": 2,
        "rule_name": "Límite de horas extra alcanzado",
        "rule_type": "overtime_limit",
        "trigger_threshold": {
          "percentage": 90,
          "monthly_limit": 30
        },
        "auto_action": "send_alert",
        "priority": "high",
        "check_frequency": "daily",
        "last_execution": {
          "matched_count": 3,
          "actions_taken": 3
        }
      }
    ]
  }
}
```

---

## 2. Listar reglas activas

Obtiene todas las reglas proactivas configuradas para la empresa.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/proactive/rules" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "rules": [
    {
      "id": 1,
      "company_id": 11,
      "rule_name": "Vacaciones próximas a vencer",
      "rule_type": "vacation_expiry",
      "trigger_threshold": {
        "days_until_expiry": 45
      },
      "auto_action": "create_notification",
      "notification_recipients": ["employee", "rrhh"],
      "priority": "medium",
      "check_frequency": "weekly",
      "active": true,
      "last_checked": "2025-10-16T08:00:00.000Z"
    }
  ],
  "total": 5
}
```

---

## 3. Crear regla proactiva

Crea una nueva regla de detección preventiva.

### Ejemplo 1: Alertar vacaciones próximas a vencer

```bash
curl -X POST "http://localhost:3000/api/proactive/rules" \
  -H "Content-Type: application/json" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "rule_name": "Vacaciones próximas a vencer - 60 días",
    "rule_type": "vacation_expiry",
    "trigger_threshold": {
      "days_until_expiry": 60
    },
    "auto_action": "create_notification",
    "notification_recipients": ["employee", "supervisor", "rrhh"],
    "priority": "medium",
    "check_frequency": "weekly"
  }'
```

### Ejemplo 2: Alertar horas extra cercanas al límite

```bash
curl -X POST "http://localhost:3000/api/proactive/rules" \
  -H "Content-Type: application/json" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "rule_name": "Límite de horas extra - 90% alcanzado",
    "rule_type": "overtime_limit",
    "trigger_threshold": {
      "percentage": 90,
      "monthly_limit": 30
    },
    "auto_action": "send_alert",
    "notification_recipients": ["supervisor", "rrhh"],
    "priority": "high",
    "check_frequency": "daily"
  }'
```

### Ejemplo 3: Prevenir violación de descanso

```bash
curl -X POST "http://localhost:3000/api/proactive/rules" \
  -H "Content-Type: application/json" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "rule_name": "Riesgo de violación de período de descanso",
    "rule_type": "rest_violation",
    "trigger_threshold": {
      "minimum_hours": 12
    },
    "auto_action": "block_action",
    "notification_recipients": ["system", "rrhh"],
    "priority": "critical",
    "check_frequency": "realtime"
  }'
```

### Ejemplo 4: Documentos próximos a vencer

```bash
curl -X POST "http://localhost:3000/api/proactive/rules" \
  -H "Content-Type: application/json" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "rule_name": "Documentos vencen en 30 días",
    "rule_type": "document_expiry",
    "trigger_threshold": {
      "days_until_expiry": 30
    },
    "auto_action": "create_notification",
    "notification_recipients": ["employee", "rrhh"],
    "priority": "medium",
    "check_frequency": "weekly"
  }'
```

### Respuesta esperada

```json
{
  "success": true,
  "message": "Regla creada exitosamente",
  "rule": {
    "id": 6,
    "company_id": 11,
    "rule_name": "Vacaciones próximas a vencer - 60 días",
    "rule_type": "vacation_expiry",
    "trigger_threshold": {
      "days_until_expiry": 60
    },
    "auto_action": "create_notification",
    "notification_recipients": ["employee", "supervisor", "rrhh"],
    "priority": "medium",
    "check_frequency": "weekly",
    "active": true
  }
}
```

---

## 4. Ejecutar todas las reglas

Ejecuta todas las reglas activas manualmente (útil para testing o ejecución on-demand).

### Ejemplo cURL

```bash
curl -X POST "http://localhost:3000/api/proactive/execute" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "message": "Ejecución completada",
  "results": {
    "company_id": 11,
    "rules_executed": 5,
    "total_matches": 18,
    "actions_taken": 18,
    "executions": [
      {
        "rule_id": 1,
        "rule_name": "Vacaciones próximas a vencer",
        "rule_type": "vacation_expiry",
        "matched_count": 12,
        "actions_taken": 12,
        "matches": [
          {
            "employee_id": "EMP-001",
            "type": "vacation_expiry",
            "severity": "medium",
            "details": {
              "balance": 14,
              "expiry_date": "2025-12-31",
              "days_until_expiry": 76
            },
            "message": "Tiene 14 días de vacaciones que vencen en 76 días"
          }
        ],
        "execution_id": 524
      },
      {
        "rule_id": 2,
        "rule_name": "Límite de horas extra alcanzado",
        "rule_type": "overtime_limit",
        "matched_count": 3,
        "actions_taken": 3,
        "matches": [
          {
            "employee_id": "EMP-042",
            "type": "overtime_limit",
            "severity": "warning",
            "details": {
              "overtime_hours": "28.50",
              "monthly_limit": 30,
              "percentage_used": "95.00",
              "remaining": "1.50"
            },
            "message": "Tiene 28.5h extras este mes (90% del límite de 30h)"
          }
        ]
      },
      {
        "rule_id": 3,
        "rule_name": "Riesgo de violación de descanso",
        "rule_type": "rest_violation",
        "matched_count": 1,
        "actions_taken": 1
      },
      {
        "rule_id": 4,
        "rule_name": "Documentos próximos a vencer",
        "rule_type": "document_expiry",
        "matched_count": 2,
        "actions_taken": 2
      },
      {
        "rule_id": 5,
        "rule_name": "Certificados médicos finalizando",
        "rule_type": "certificate_expiry",
        "matched_count": 0,
        "actions_taken": 0
      }
    ]
  }
}
```

---

## 5. Ejecutar regla específica

Ejecuta una sola regla manualmente.

### Ejemplo cURL

```bash
curl -X POST "http://localhost:3000/api/proactive/rules/1/execute" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "message": "Regla ejecutada exitosamente",
  "result": {
    "rule_id": 1,
    "rule_name": "Vacaciones próximas a vencer",
    "rule_type": "vacation_expiry",
    "matched_count": 12,
    "actions_taken": 12,
    "matches": [
      {
        "employee_id": "EMP-001",
        "type": "vacation_expiry",
        "severity": "medium",
        "details": {
          "balance": 14,
          "expiry_date": "2025-12-31",
          "days_until_expiry": 76
        },
        "message": "Tiene 14 días de vacaciones que vencen en 76 días"
      }
    ],
    "execution_id": 525
  }
}
```

---

## 6. Actualizar regla

Modifica una regla existente.

### Ejemplo: Cambiar threshold de 60 a 45 días

```bash
curl -X PUT "http://localhost:3000/api/proactive/rules/1" \
  -H "Content-Type: application/json" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "trigger_threshold": {
      "days_until_expiry": 45
    },
    "priority": "high"
  }'
```

### Respuesta esperada

```json
{
  "success": true,
  "message": "Regla actualizada exitosamente",
  "rule": {
    "id": 1,
    "trigger_threshold": {
      "days_until_expiry": 45
    },
    "priority": "high"
  }
}
```

---

## 7. Desactivar regla

Desactiva una regla (no se ejecutará más en cron jobs).

### Ejemplo cURL

```bash
curl -X DELETE "http://localhost:3000/api/proactive/rules/1" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "message": "Regla desactivada exitosamente"
}
```

---

## 8. Historial de ejecuciones

Obtiene el historial de ejecuciones de una regla.

### Ejemplo cURL (últimas 50 ejecuciones)

```bash
curl -X GET "http://localhost:3000/api/proactive/rules/1/history" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Ejemplo cURL (últimas 10 ejecuciones)

```bash
curl -X GET "http://localhost:3000/api/proactive/rules/1/history?limit=10" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "rule_id": 1,
  "history": [
    {
      "id": 525,
      "rule_id": 1,
      "execution_time": "2025-10-16T10:30:00.000Z",
      "matched_count": 12,
      "actions_taken": 12,
      "execution_details": [
        {
          "employee_id": "EMP-001",
          "type": "vacation_expiry",
          "severity": "medium",
          "message": "Tiene 14 días de vacaciones que vencen en 76 días"
        }
      ]
    },
    {
      "id": 518,
      "execution_time": "2025-10-09T08:00:00.000Z",
      "matched_count": 14,
      "actions_taken": 14
    }
  ],
  "total": 50
}
```

---

## 9. Tipos de reglas disponibles

### 9.1. vacation_expiry
Detecta vacaciones próximas a vencer.

**Threshold:**
```json
{
  "days_until_expiry": 60
}
```

**Qué detecta:** Empleados con días de vacaciones que vencen en X días.

---

### 9.2. overtime_limit
Detecta empleados cerca del límite de horas extra.

**Threshold:**
```json
{
  "percentage": 90,
  "monthly_limit": 30
}
```

**Qué detecta:** Empleados que alcanzaron el 90% de sus 30 horas extra mensuales.

---

### 9.3. rest_violation
Detecta riesgo de violación de período de descanso.

**Threshold:**
```json
{
  "minimum_hours": 12
}
```

**Qué detecta:** Empleados cuyo próximo turno comienza en menos de 12 horas desde su última salida.

---

### 9.4. document_expiry
Detecta documentos próximos a vencer.

**Threshold:**
```json
{
  "days_until_expiry": 30
}
```

**Qué detecta:** Documentos de empleados (DNI, certificados, etc.) que vencen en X días.

---

### 9.5. certificate_expiry
Detecta certificados médicos finalizando.

**Threshold:**
```json
{
  "days_until_expiry": 7
}
```

**Qué detecta:** Licencias médicas que finalizan en X días (para preparar reincorporación).

---

## 10. Casos de uso prácticos

### 10.1. Configurar sistema completo de alertas preventivas

```javascript
const axios = require('axios');

async function setupProactiveSystem(companyId) {
    const headers = {
        'x-company-id': companyId,
        'x-role': 'rrhh',
        'Content-Type': 'application/json'
    };

    const rules = [
        // Regla 1: Vacaciones próximas a vencer
        {
            rule_name: "Vacaciones vencen en 60 días",
            rule_type: "vacation_expiry",
            trigger_threshold: { days_until_expiry: 60 },
            auto_action: "create_notification",
            notification_recipients: ["employee", "rrhh"],
            priority: "medium",
            check_frequency: "weekly"
        },
        // Regla 2: Horas extra al 90%
        {
            rule_name: "90% de límite de horas extra",
            rule_type: "overtime_limit",
            trigger_threshold: { percentage: 90, monthly_limit: 30 },
            auto_action: "send_alert",
            notification_recipients: ["supervisor", "rrhh"],
            priority: "high",
            check_frequency: "daily"
        },
        // Regla 3: Prevenir violación de descanso
        {
            rule_name: "Riesgo violación descanso",
            rule_type: "rest_violation",
            trigger_threshold: { minimum_hours: 12 },
            auto_action: "block_action",
            notification_recipients: ["system", "rrhh"],
            priority: "critical",
            check_frequency: "realtime"
        },
        // Regla 4: Documentos vencen en 30 días
        {
            rule_name: "Documentos vencen en 30 días",
            rule_type: "document_expiry",
            trigger_threshold: { days_until_expiry: 30 },
            auto_action: "create_notification",
            notification_recipients: ["employee", "rrhh"],
            priority: "medium",
            check_frequency: "weekly"
        },
        // Regla 5: Certificados médicos finalizando
        {
            rule_name: "Licencia médica finaliza en 7 días",
            rule_type: "certificate_expiry",
            trigger_threshold: { days_until_expiry: 7 },
            auto_action: "send_alert",
            notification_recipients: ["employee", "rrhh", "medical"],
            priority: "high",
            check_frequency: "daily"
        }
    ];

    console.log('Configurando sistema proactivo...');

    for (const rule of rules) {
        const response = await axios.post(
            'http://localhost:3000/api/proactive/rules',
            rule,
            { headers }
        );
        console.log(`✅ Creada: ${rule.rule_name}`);
    }

    console.log('✅ Sistema proactivo configurado completamente');
}

setupProactiveSystem(11);
```

### 10.2. Cron job diario para ejecutar reglas

```javascript
const cron = require('node-cron');
const axios = require('axios');

// Ejecutar todos los días a las 8:00 AM
cron.schedule('0 8 * * *', async () => {
    console.log('🕐 Ejecutando reglas proactivas diarias...');

    try {
        const response = await axios.post('http://localhost:3000/api/proactive/execute', {}, {
            headers: {
                'x-company-id': 11,
                'x-role': 'rrhh'
            }
        });

        const { total_matches, actions_taken } = response.data.results;

        console.log(`✅ Ejecución completada: ${total_matches} coincidencias, ${actions_taken} acciones`);

        // Si hay muchas coincidencias, alertar
        if (total_matches > 20) {
            console.log(`⚠️ ALERTA: Muchas coincidencias (${total_matches}) - revisar dashboard`);
            // TODO: Enviar email a gerencia
        }

    } catch (error) {
        console.error('❌ Error en ejecución programada:', error.message);
    }
});

console.log('✅ Cron job configurado - Ejecución diaria a las 8:00 AM');
```

### 10.3. Dashboard en tiempo real (React)

```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ProactiveDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            const response = await axios.get('/api/proactive/dashboard', {
                headers: {
                    'x-company-id': localStorage.getItem('company_id'),
                    'x-role': localStorage.getItem('role')
                }
            });
            setDashboard(response.data.dashboard);
            setLoading(false);
        };

        fetchDashboard();
        const interval = setInterval(fetchDashboard, 15 * 60 * 1000); // Cada 15 min
        return () => clearInterval(interval);
    }, []);

    const executeAllRules = async () => {
        setLoading(true);
        await axios.post('/api/proactive/execute', {}, {
            headers: {
                'x-company-id': localStorage.getItem('company_id'),
                'x-role': localStorage.getItem('role')
            }
        });
        // Refrescar dashboard
        const response = await axios.get('/api/proactive/dashboard', {
            headers: {
                'x-company-id': localStorage.getItem('company_id'),
                'x-role': localStorage.getItem('role')
            }
        });
        setDashboard(response.data.dashboard);
        setLoading(false);
    };

    if (loading) return <div>Cargando dashboard proactivo...</div>;

    const { summary, rules } = dashboard;

    return (
        <div className="proactive-dashboard">
            <div className="header">
                <h2>Notificaciones Proactivas</h2>
                <button onClick={executeAllRules} className="btn btn-primary">
                    Ejecutar ahora
                </button>
            </div>

            {/* Resumen */}
            <div className="summary-cards">
                <div className="card">
                    <h3>{summary.total_rules}</h3>
                    <p>Reglas activas</p>
                </div>
                <div className="card">
                    <h3>{summary.total_matches_30d}</h3>
                    <p>Coincidencias (30 días)</p>
                </div>
                <div className="card">
                    <h3>{summary.total_actions_30d}</h3>
                    <p>Acciones tomadas</p>
                </div>
            </div>

            {/* Reglas */}
            <div className="rules-list">
                <h3>Reglas configuradas</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Regla</th>
                            <th>Tipo</th>
                            <th>Prioridad</th>
                            <th>Frecuencia</th>
                            <th>Última ejecución</th>
                            <th>Coincidencias</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map(rule => (
                            <tr key={rule.id}>
                                <td>{rule.rule_name}</td>
                                <td>{rule.rule_type}</td>
                                <td>
                                    <span className={`badge badge-${rule.priority}`}>
                                        {rule.priority}
                                    </span>
                                </td>
                                <td>{rule.check_frequency}</td>
                                <td>
                                    {rule.last_execution
                                        ? new Date(rule.last_execution.execution_time).toLocaleString()
                                        : 'Nunca'}
                                </td>
                                <td>
                                    {rule.last_execution
                                        ? rule.last_execution.matched_count
                                        : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ProactiveDashboard();
```

### 10.4. Detectar tendencias en ejecuciones

```javascript
const axios = require('axios');

async function analyzeTrends(companyId, ruleId) {
    const headers = {
        'x-company-id': companyId,
        'x-role': 'rrhh'
    };

    // Obtener historial (últimas 30 ejecuciones)
    const response = await axios.get(
        `http://localhost:3000/api/proactive/rules/${ruleId}/history?limit=30`,
        { headers }
    );

    const executions = response.data.history;

    // Calcular promedio de coincidencias
    const avgMatches = executions.reduce((sum, e) => sum + e.matched_count, 0) / executions.length;

    // Obtener tendencia (últimas 5 vs anteriores 5)
    const recent = executions.slice(0, 5);
    const previous = executions.slice(5, 10);

    const recentAvg = recent.reduce((sum, e) => sum + e.matched_count, 0) / 5;
    const previousAvg = previous.reduce((sum, e) => sum + e.matched_count, 0) / 5;

    const trend = ((recentAvg - previousAvg) / previousAvg) * 100;

    console.log('='.repeat(60));
    console.log(`ANÁLISIS DE TENDENCIAS - Regla ${ruleId}`);
    console.log('='.repeat(60));
    console.log(`Promedio histórico: ${avgMatches.toFixed(1)} coincidencias`);
    console.log(`Promedio reciente: ${recentAvg.toFixed(1)} coincidencias`);
    console.log(`Tendencia: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`);

    if (trend > 20) {
        console.log('⚠️ ALERTA: Tendencia al alza significativa (+20%)');
        console.log('   → Investigar causa raíz del aumento');
    } else if (trend < -20) {
        console.log('✅ Tendencia a la baja (-20%)');
        console.log('   → Mejora en prevención');
    }
}

analyzeTrends(11, 1);
```

---

## Testing Checklist

- [ ] Dashboard de reglas proactivas
- [ ] Listar reglas activas
- [ ] Crear regla de vacaciones próximas a vencer
- [ ] Crear regla de horas extra
- [ ] Crear regla de riesgo de descanso
- [ ] Crear regla de documentos
- [ ] Ejecutar todas las reglas
- [ ] Ejecutar regla específica
- [ ] Actualizar threshold de regla
- [ ] Desactivar regla
- [ ] Ver historial de ejecuciones
- [ ] Verificar que las reglas se ejecutan correctamente
- [ ] Verificar que las acciones automáticas se disparan
- [ ] Verificar multi-tenant (reglas aisladas por empresa)

---

## Notas importantes

1. **Ejecución automática**: Las reglas se ejecutan según `check_frequency`:
   - `realtime`: Cada vez que ocurre un evento relevante
   - `hourly`: Cada hora (cron job)
   - `daily`: Diariamente a las 8:00 AM
   - `weekly`: Los lunes a las 8:00 AM

2. **Acciones automáticas**:
   - `create_notification`: Crea notificación en el sistema
   - `send_alert`: Envía email/push
   - `block_action`: Previene acción riesgosa

3. **Prioridades**:
   - `critical`: Requiere acción inmediata
   - `high`: Atención en 24h
   - `medium`: Atención en 1 semana
   - `low`: Informativo

4. **Severidad automática**: Se calcula según días restantes:
   - ≤7 días: `critical`
   - ≤15 días: `high`
   - ≤30 días: `medium`
   - >30 días: `low`

5. **Integración**: El sistema proactivo debe integrarse con:
   - Sistema de notificaciones (para crear_notification)
   - Sistema de emails (para send_alert)
   - FlowExecutor (para block_action)

6. **Performance**: Las queries están optimizadas pero en empresas grandes considerar:
   - Ejecutar reglas en horarios de baja carga
   - Limitar cantidad de registros procesados
   - Cachear resultados para dashboards
