# RESOURCE CENTER - Ejemplos de Uso

Sistema de tracking de horas, utilización de recursos humanos, detección de sobrecarga y análisis de productividad (sin valores monetarios).

## Índice

1. [Dashboard de recursos](#1-dashboard-de-recursos)
2. [Resumen de horas por categoría](#2-resumen-de-horas-por-categoría)
3. [Utilización por departamento](#3-utilización-por-departamento)
4. [Utilización por empleado](#4-utilización-por-empleado)
5. [Estadísticas de empleado](#5-estadísticas-de-empleado)
6. [Alertas de sobrecarga](#6-alertas-de-sobrecarga)
7. [Alertas de presupuesto](#7-alertas-de-presupuesto)
8. [Registrar transacción](#8-registrar-transacción)
9. [Comparación entre períodos](#9-comparación-entre-períodos)
10. [Casos de uso prácticos](#10-casos-de-uso-prácticos)

---

## 1. Dashboard de recursos

Obtiene un dashboard completo con resumen de horas, utilización por departamento/empleado y alertas.

### Ejemplo cURL (mes actual)

```bash
curl -X GET "http://localhost:3000/api/resources/dashboard" \
  -H "x-company-id: 11" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-role: rrhh"
```

### Ejemplo cURL (período específico)

```bash
curl -X GET "http://localhost:3000/api/resources/dashboard?start_date=2025-10-01&end_date=2025-10-31" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "dashboard": {
    "period": {
      "start": "2025-10-01T00:00:00.000Z",
      "end": "2025-10-31T23:59:59.000Z"
    },
    "summary": {
      "total_hours": 3420.50,
      "total_transactions": 287,
      "categories_count": 5
    },
    "hours_by_category": [
      {
        "category": "overtime",
        "employees_count": 45,
        "transactions_count": 102,
        "total_hours": "1250.50",
        "avg_hours": "12.26",
        "percentage": "36.56"
      },
      {
        "category": "leave",
        "employees_count": 38,
        "transactions_count": 85,
        "total_hours": "920.00",
        "avg_hours": "10.82",
        "percentage": "26.89"
      },
      {
        "category": "shift_swaps",
        "employees_count": 28,
        "transactions_count": 62,
        "total_hours": "680.00",
        "avg_hours": "10.97",
        "percentage": "19.88"
      }
    ],
    "department_utilization": [
      {
        "department_id": 5,
        "total_hours": "1420.50",
        "employees_count": 35,
        "avg_hours_per_employee": "40.59",
        "percentage_of_total": "41.53",
        "categories": [
          {
            "category": "overtime",
            "hours": "850.00",
            "employees_count": 25
          }
        ]
      }
    ],
    "top_employees": [
      {
        "employee_id": "EMP-001",
        "department_id": 5,
        "total_hours": 85.5,
        "transactions_count": 8,
        "avg_hours_per_transaction": "10.69",
        "categories": [
          {
            "category": "overtime",
            "hours": "52.50",
            "transactions": 5
          },
          {
            "category": "shift_swaps",
            "hours": "33.00",
            "transactions": 3
          }
        ]
      }
    ],
    "alerts": {
      "workload_overload": [
        {
          "employee_id": "EMP-001",
          "department_id": 5,
          "overtime_hours": "52.50",
          "overtime_events": 5,
          "threshold": 30,
          "excess_hours": "22.50",
          "risk_level": "high"
        }
      ],
      "budget_alerts": [],
      "total_alerts": 1
    }
  }
}
```

---

## 2. Resumen de horas por categoría

Obtiene resumen agregado de horas trabajadas por categoría.

### Para toda la empresa

```bash
curl -X GET "http://localhost:3000/api/resources/summary?start_date=2025-10-01&end_date=2025-10-31" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Para un departamento específico

```bash
curl -X GET "http://localhost:3000/api/resources/summary?start_date=2025-10-01&end_date=2025-10-31&department_id=5" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "summary": {
    "period": {
      "start": "2025-10-01T00:00:00.000Z",
      "end": "2025-10-31T23:59:59.000Z"
    },
    "department_id": null,
    "summary": {
      "total_hours": 3420.50,
      "total_transactions": 287,
      "categories_count": 5
    },
    "by_category": [
      {
        "category": "overtime",
        "employees_count": 45,
        "transactions_count": 102,
        "total_hours": "1250.50",
        "avg_hours": "12.26",
        "percentage": "36.56"
      },
      {
        "category": "leave",
        "employees_count": 38,
        "transactions_count": 85,
        "total_hours": "920.00",
        "avg_hours": "10.82",
        "percentage": "26.89"
      }
    ]
  }
}
```

---

## 3. Utilización por departamento

Obtiene horas trabajadas agrupadas por departamento.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/resources/departments" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "period": {
    "start": "2025-10-01T00:00:00.000Z",
    "end": "2025-10-31T23:59:59.000Z"
  },
  "departments": [
    {
      "department_id": 5,
      "total_hours": "1420.50",
      "employees_count": 35,
      "avg_hours_per_employee": "40.59",
      "percentage_of_total": "41.53",
      "categories": [
        {
          "category": "overtime",
          "hours": "850.00",
          "employees_count": 25
        },
        {
          "category": "shift_swaps",
          "hours": "320.50",
          "employees_count": 18
        },
        {
          "category": "leave",
          "hours": "250.00",
          "employees_count": 15
        }
      ]
    },
    {
      "department_id": 3,
      "total_hours": "980.00",
      "employees_count": 22,
      "avg_hours_per_employee": "44.55",
      "percentage_of_total": "28.66"
    }
  ],
  "total": 2
}
```

---

## 4. Utilización por empleado

Obtiene top empleados por cantidad de horas trabajadas.

### Top 50 empleados (default)

```bash
curl -X GET "http://localhost:3000/api/resources/employees" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Top 20 empleados

```bash
curl -X GET "http://localhost:3000/api/resources/employees?limit=20" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "period": {
    "start": "2025-10-01T00:00:00.000Z",
    "end": "2025-10-31T23:59:59.000Z"
  },
  "employees": [
    {
      "employee_id": "EMP-001",
      "department_id": 5,
      "total_hours": 85.5,
      "transactions_count": 8,
      "avg_hours_per_transaction": "10.69",
      "categories": [
        {
          "category": "overtime",
          "hours": "52.50",
          "transactions": 5
        },
        {
          "category": "shift_swaps",
          "hours": "33.00",
          "transactions": 3
        }
      ]
    },
    {
      "employee_id": "EMP-042",
      "department_id": 3,
      "total_hours": 76.0,
      "transactions_count": 6,
      "avg_hours_per_transaction": "12.67"
    }
  ],
  "total": 20
}
```

---

## 5. Estadísticas de empleado

Obtiene estadísticas detalladas de un empleado específico.

### Para cualquier empleado (RRHH)

```bash
curl -X GET "http://localhost:3000/api/resources/employee/EMP-001?start_date=2025-10-01&end_date=2025-10-31" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Mis propias estadísticas (auto-consulta)

```bash
curl -X GET "http://localhost:3000/api/resources/my-stats" \
  -H "x-company-id: 11" \
  -H "x-employee-id: EMP-001" \
  -H "x-role: employee"
```

### Respuesta esperada

```json
{
  "success": true,
  "stats": {
    "employee_id": "EMP-001",
    "period": {
      "start": "2025-10-01T00:00:00.000Z",
      "end": "2025-10-31T23:59:59.000Z"
    },
    "summary": {
      "total_hours": "85.50",
      "total_transactions": 8,
      "categories_count": 2
    },
    "by_category": [
      {
        "category": "overtime",
        "transactions_count": 5,
        "total_hours": "52.50",
        "avg_hours": "10.50",
        "percentage": "61.40"
      },
      {
        "category": "shift_swaps",
        "transactions_count": 3,
        "total_hours": "33.00",
        "avg_hours": "11.00",
        "percentage": "38.60"
      }
    ]
  }
}
```

---

## 6. Alertas de sobrecarga

Detecta empleados con demasiadas horas extra (posible sobrecarga de trabajo).

### Con umbral default (30 horas/mes)

```bash
curl -X GET "http://localhost:3000/api/resources/overload-alerts" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Con umbral personalizado (40 horas/mes)

```bash
curl -X GET "http://localhost:3000/api/resources/overload-alerts?threshold=40" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "period": {
    "start": "2025-10-01T00:00:00.000Z",
    "end": "2025-10-31T23:59:59.000Z"
  },
  "threshold": 30,
  "alerts": [
    {
      "employee_id": "EMP-001",
      "department_id": 5,
      "overtime_hours": "52.50",
      "overtime_events": 5,
      "threshold": 30,
      "excess_hours": "22.50",
      "risk_level": "high"
    },
    {
      "employee_id": "EMP-042",
      "department_id": 3,
      "overtime_hours": "65.00",
      "overtime_events": 7,
      "threshold": 30,
      "excess_hours": "35.00",
      "risk_level": "critical"
    },
    {
      "employee_id": "EMP-018",
      "department_id": 5,
      "overtime_hours": "38.50",
      "overtime_events": 4,
      "threshold": 30,
      "excess_hours": "8.50",
      "risk_level": "medium"
    }
  ],
  "total_alerts": 3
}
```

**Niveles de riesgo:**
- `low`: 1.0x - 1.2x del umbral
- `medium`: 1.2x - 1.5x del umbral
- `high`: 1.5x - 2.0x del umbral
- `critical`: >= 2.0x del umbral

---

## 7. Alertas de presupuesto

Obtiene alertas de budgets de horas configurados.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/resources/budget-alerts" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "period": {
    "start": "2025-10-01T00:00:00.000Z",
    "end": "2025-10-31T23:59:59.000Z"
  },
  "alerts": [
    {
      "budget_id": 1,
      "department_id": 5,
      "category": "overtime",
      "period": {
        "start": "2025-10-01T00:00:00.000Z",
        "end": "2025-10-31T23:59:59.000Z"
      },
      "total_hours_used": "850.00",
      "alert_threshold_percent": 90,
      "status": "active"
    }
  ],
  "total_alerts": 1
}
```

---

## 8. Registrar transacción

Registra horas trabajadas en una categoría específica.

### Ejemplo: Registrar horas extra

```bash
curl -X POST "http://localhost:3000/api/resources/record" \
  -H "Content-Type: application/json" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "employee_id": "EMP-001",
    "department_id": 5,
    "category": "overtime",
    "hours": 8.5,
    "description": "Horas extra aprobadas para cierre de proyecto",
    "metadata": {
      "project_id": "PROJ-2025-042",
      "approved_by": "EMP-SUP-003",
      "date": "2025-10-15"
    }
  }'
```

### Ejemplo: Registrar ausencia

```bash
curl -X POST "http://localhost:3000/api/resources/record" \
  -H "Content-Type: application/json" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "employee_id": "EMP-042",
    "department_id": 3,
    "category": "leave",
    "hours": 8.0,
    "description": "Licencia médica",
    "metadata": {
      "leave_type": "medical",
      "certificate_number": "CERT-2025-123"
    }
  }'
```

### Respuesta esperada

```json
{
  "success": true,
  "message": "Transacción registrada exitosamente",
  "transaction": {
    "id": 1524,
    "company_id": 11,
    "department_id": 5,
    "employee_id": "EMP-001",
    "cost_category": "overtime",
    "description": "Horas extra aprobadas para cierre de proyecto",
    "transaction_date": "2025-10-16T10:30:00.000Z",
    "metadata": {
      "hours": 8.5,
      "project_id": "PROJ-2025-042",
      "approved_by": "EMP-SUP-003",
      "date": "2025-10-15"
    }
  }
}
```

### Categorías disponibles

- `overtime` - Horas extraordinarias
- `leave` - Ausencias/licencias
- `shift_swaps` - Cambios de turno
- `training` - Capacitación
- `medical_leave` - Licencias médicas
- `vacation` - Vacaciones

---

## 9. Comparación entre períodos

Compara utilización de recursos entre mes actual y anterior.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/resources/comparison" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "comparison": {
    "current": {
      "period": {
        "start": "2025-10-01T00:00:00.000Z",
        "end": "2025-10-31T23:59:59.000Z"
      },
      "summary": {
        "total_hours": 3420.50,
        "total_transactions": 287,
        "categories_count": 5
      }
    },
    "previous": {
      "period": {
        "start": "2025-09-01T00:00:00.000Z",
        "end": "2025-09-30T23:59:59.000Z"
      },
      "summary": {
        "total_hours": 3150.00,
        "total_transactions": 265,
        "categories_count": 5
      }
    },
    "changes": {
      "total_hours": "270.50",
      "total_transactions": 22,
      "total_hours_percent": "8.59"
    }
  }
}
```

**Interpretación:**
- ✅ Total de horas aumentó 270.5h (+8.59%)
- ℹ️ Se registraron 22 transacciones más
- ⚠️ Posible aumento en carga de trabajo

---

## 10. Casos de uso prácticos

### 10.1. Monitoreo diario de sobrecarga

```bash
#!/bin/bash
# Script para detectar sobrecarga diaria

RESPONSE=$(curl -s -X GET "http://localhost:3000/api/resources/overload-alerts?threshold=30" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh")

TOTAL=$(echo $RESPONSE | jq -r '.total_alerts')
CRITICAL=$(echo $RESPONSE | jq -r '[.alerts[] | select(.risk_level == "critical")] | length')

if [ "$CRITICAL" -gt 0 ]; then
  echo "🚨 CRÍTICO: $CRITICAL empleados con sobrecarga crítica"
  echo $RESPONSE | jq '.alerts[] | select(.risk_level == "critical")'
  # TODO: Enviar alerta a gerencia
elif [ "$TOTAL" -gt 0 ]; then
  echo "⚠️ ADVERTENCIA: $TOTAL empleados con sobrecarga"
fi
```

### 10.2. Reporte semanal por departamento

```javascript
const axios = require('axios');

async function generateWeeklyReport(companyId) {
    const headers = {
        'x-company-id': companyId,
        'x-role': 'rrhh'
    };

    // Calcular fechas (última semana)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Obtener utilización por departamento
    const response = await axios.get('http://localhost:3000/api/resources/departments', {
        headers,
        params: {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        }
    });

    const departments = response.data.departments;

    console.log('='.repeat(60));
    console.log('REPORTE SEMANAL DE UTILIZACIÓN DE RECURSOS');
    console.log(`Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    console.log('='.repeat(60));

    departments.forEach(dept => {
        console.log(`\nDepartamento ${dept.department_id}:`);
        console.log(`  Total de horas: ${dept.total_hours}h`);
        console.log(`  Empleados activos: ${dept.employees_count}`);
        console.log(`  Promedio por empleado: ${dept.avg_hours_per_employee}h`);
        console.log(`  Distribución:`);
        dept.categories.forEach(cat => {
            console.log(`    - ${cat.category}: ${cat.hours}h (${cat.employees_count} empleados)`);
        });
    });
}

generateWeeklyReport(11);
```

### 10.3. Dashboard en tiempo real (React)

```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ResourceDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            const response = await axios.get('/api/resources/dashboard', {
                headers: {
                    'x-company-id': localStorage.getItem('company_id'),
                    'x-role': localStorage.getItem('role')
                }
            });
            setDashboard(response.data.dashboard);
            setLoading(false);
        };

        fetchDashboard();
        const interval = setInterval(fetchDashboard, 10 * 60 * 1000); // Cada 10 min
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div>Cargando dashboard...</div>;

    const { summary, hours_by_category, alerts } = dashboard;

    return (
        <div className="resource-dashboard">
            <h2>Centro de Recursos</h2>

            {/* Resumen */}
            <div className="summary-cards">
                <div className="card">
                    <h3>{summary.total_hours}h</h3>
                    <p>Total de horas</p>
                </div>
                <div className="card">
                    <h3>{summary.total_transactions}</h3>
                    <p>Transacciones</p>
                </div>
                <div className="card">
                    <h3>{summary.categories_count}</h3>
                    <p>Categorías</p>
                </div>
            </div>

            {/* Alertas de sobrecarga */}
            {alerts.workload_overload.length > 0 && (
                <div className="alert alert-danger">
                    <h3>⚠️ Alertas de sobrecarga ({alerts.workload_overload.length})</h3>
                    <ul>
                        {alerts.workload_overload.map(alert => (
                            <li key={alert.employee_id}>
                                <strong>{alert.employee_id}</strong>: {alert.overtime_hours}h de extras
                                <span className={`badge badge-${alert.risk_level}`}>
                                    {alert.risk_level}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Horas por categoría */}
            <div className="category-chart">
                <h3>Distribución de horas</h3>
                {hours_by_category.map(cat => (
                    <div key={cat.category} className="category-bar">
                        <div className="label">{cat.category}</div>
                        <div className="bar" style={{ width: `${cat.percentage}%` }}>
                            {cat.total_hours}h ({cat.percentage}%)
                        </div>
                    </div>
                ))}
            </div>

            {/* Top departamentos */}
            <div className="departments-table">
                <h3>Utilización por departamento</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Departamento</th>
                            <th>Total horas</th>
                            <th>Empleados</th>
                            <th>Promedio/empleado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dashboard.department_utilization.map(dept => (
                            <tr key={dept.department_id}>
                                <td>Dpto. {dept.department_id}</td>
                                <td>{dept.total_hours}h</td>
                                <td>{dept.employees_count}</td>
                                <td>{dept.avg_hours_per_employee}h</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ResourceDashboard;
```

### 10.4. Automatizar registro desde cambios de turno aprobados

```javascript
// En flowExecutorService.js, después de aprobar un shift swap:

async function onShiftSwapApproved(groupId, swapData) {
    const { employee_1_id, employee_2_id, swap_date, overtime_hours, company_id } = swapData;

    // Registrar horas del cambio en Resource Center
    if (overtime_hours > 0) {
        await resourceCenterService.recordTransaction(
            company_id,
            null, // department_id (obtener del empleado)
            employee_2_id, // Juan (quien recibe el turno)
            'shift_swaps',
            parseFloat(overtime_hours),
            `Cambio de turno con ${employee_1_id} el ${swap_date}`,
            {
                swap_date,
                original_employee: employee_1_id,
                notification_group_id: groupId,
                generates_overtime: true
            }
        );
    }

    console.log(`✅ Horas de cambio registradas en Resource Center`);
}
```

### 10.5. Detección proactiva de patrones

```javascript
const axios = require('axios');

async function detectPatterns(companyId) {
    const headers = {
        'x-company-id': companyId,
        'x-role': 'rrhh'
    };

    // Obtener sobrecarga
    const overload = await axios.get('http://localhost:3000/api/resources/overload-alerts', { headers });

    // Agrupar por departamento
    const byDept = {};
    overload.data.alerts.forEach(alert => {
        if (!byDept[alert.department_id]) {
            byDept[alert.department_id] = [];
        }
        byDept[alert.department_id].push(alert);
    });

    // Detectar departamentos problemáticos (>3 empleados con sobrecarga)
    Object.keys(byDept).forEach(deptId => {
        const count = byDept[deptId].length;
        if (count >= 3) {
            console.log(`🚨 PATRÓN DETECTADO: Departamento ${deptId} tiene ${count} empleados con sobrecarga`);
            console.log(`   → Posible falta de personal o distribución desigual de tareas`);
            // TODO: Generar alerta para gerencia
        }
    });
}

detectPatterns(11);
```

---

## Testing Checklist

- [ ] Dashboard sin parámetros (mes actual)
- [ ] Dashboard con período específico
- [ ] Resumen de horas para toda la empresa
- [ ] Resumen de horas por departamento
- [ ] Utilización por departamento
- [ ] Top empleados por horas
- [ ] Estadísticas de empleado específico
- [ ] Mis estadísticas (auto-consulta)
- [ ] Alertas de sobrecarga con threshold default
- [ ] Alertas de sobrecarga con threshold personalizado
- [ ] Alertas de presupuesto
- [ ] Registrar transacción de horas extra
- [ ] Registrar transacción de ausencia
- [ ] Comparación entre períodos
- [ ] Verificar permisos (solo RRHH)
- [ ] Verificar multi-tenant

---

## Notas importantes

1. **Sin valores monetarios**: Este sistema registra HORAS, no dinero. Se eliminaron todos los campos de montos.

2. **Categorías**: Las categorías se pueden personalizar según necesidades de cada empresa.

3. **Niveles de riesgo**: La sobrecarga se calcula automáticamente según el ratio de horas extra vs umbral.

4. **Auto-consulta**: Los empleados pueden ver sus propias estadísticas usando `/my-stats` sin necesitar permisos de RRHH.

5. **Automatización**: Se recomienda integrar con flowExecutorService para registrar automáticamente las horas cuando se aprueban solicitudes.

6. **Alertas proactivas**: Configurar scripts diarios para detectar patrones de sobrecarga antes de que se conviertan en problemas.
