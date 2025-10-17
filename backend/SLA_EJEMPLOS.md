# SLA SERVICE - Ejemplos de Uso

Sistema de tracking de SLA (Service Level Agreement), métricas de tiempos de respuesta, rankings de aprobadores y detección de cuellos de botella.

## Índice

1. [Dashboard de SLA](#1-dashboard-de-sla)
2. [Métricas detalladas](#2-métricas-detalladas)
3. [Ranking de aprobadores](#3-ranking-de-aprobadores)
4. [Detección de cuellos de botella](#4-detección-de-cuellos-de-botella)
5. [Estadísticas de aprobador](#5-estadísticas-de-aprobador)
6. [Mis estadísticas (auto-consulta)](#6-mis-estadísticas-auto-consulta)
7. [Comparación entre períodos](#7-comparación-entre-períodos)
8. [Guardar métricas históricas](#8-guardar-métricas-históricas)
9. [Casos de uso prácticos](#9-casos-de-uso-prácticos)

---

## 1. Dashboard de SLA

Obtiene un dashboard completo con métricas globales, rankings y cuellos de botella.

### Ejemplo cURL (mes actual)

```bash
curl -X GET "http://localhost:3000/api/sla/dashboard" \
  -H "x-company-id: 11" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-role: rrhh"
```

### Ejemplo cURL (período específico)

```bash
curl -X GET "http://localhost:3000/api/sla/dashboard?start_date=2025-09-01&end_date=2025-09-30" \
  -H "x-company-id: 11" \
  -H "x-employee-id: EMP-ISI-001" \
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
      "total_requests": 145,
      "avg_response_hours": 18.5,
      "median_response_hours": 12.3,
      "min_response_hours": 0.5,
      "max_response_hours": 96.2,
      "within_sla_count": 112,
      "outside_sla_count": 33,
      "sla_compliance_percent": "77.24"
    },
    "top_approvers": [
      {
        "rank": 1,
        "approver_id": "EMP-SUP-003",
        "approver_role": "supervisor",
        "total_requests": 42,
        "avg_response_hours": 6.2,
        "median_response_hours": 4.5,
        "sla_compliance_percent": "95.24"
      },
      {
        "rank": 2,
        "approver_id": "EMP-RRHH-001",
        "approver_role": "rrhh",
        "total_requests": 56,
        "avg_response_hours": 8.7,
        "sla_compliance_percent": "89.29"
      }
    ],
    "bottlenecks": {
      "total": 3,
      "slow_approvers": [
        {
          "approver_id": "EMP-SUP-007",
          "approver_role": "supervisor",
          "avg_response_hours": 42.3,
          "total_requests": 15,
          "issue": "Tiempo promedio de 42.3h excede umbral de 24h"
        }
      ],
      "slow_request_types": [
        {
          "request_type": "shift_change",
          "avg_response_hours": 31.5,
          "total_requests": 22,
          "issue": "Tipo con promedio de 31.5h"
        }
      ]
    },
    "request_type_metrics": [
      {
        "request_type": "vacation_request",
        "total_requests": 38,
        "avg_response_hours": 14.2,
        "sla_compliance_percent": "84.21"
      }
    ]
  }
}
```

---

## 2. Métricas detalladas

Calcula métricas completas de SLA para un período específico.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/sla/metrics?start_date=2025-10-01&end_date=2025-10-31" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "metrics": {
    "period": {
      "start": "2025-10-01T00:00:00.000Z",
      "end": "2025-10-31T23:59:59.000Z"
    },
    "global_metrics": {
      "total_requests": 145,
      "avg_response_hours": 18.5,
      "median_response_hours": 12.3,
      "sla_compliance_percent": "77.24"
    },
    "approver_metrics": [
      {
        "approver_id": "EMP-SUP-003",
        "approver_role": "supervisor",
        "total_requests": 42,
        "avg_response_hours": 6.2,
        "median_response_hours": 4.5,
        "min_response_hours": 0.5,
        "max_response_hours": 22.1,
        "within_sla": 40,
        "outside_sla": 2,
        "sla_compliance_percent": "95.24"
      }
    ],
    "request_type_metrics": [
      {
        "request_type": "vacation_request",
        "total_requests": 38,
        "avg_response_hours": 14.2,
        "median_response_hours": 11.0,
        "sla_compliance_percent": "84.21"
      }
    ],
    "total_requests": 145
  }
}
```

---

## 3. Ranking de aprobadores

Obtiene el ranking de aprobadores ordenado por diferentes criterios.

### Por tiempo promedio (más rápido primero)

```bash
curl -X GET "http://localhost:3000/api/sla/ranking?sort_by=avg&limit=10" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Por cumplimiento de SLA (mejor primero)

```bash
curl -X GET "http://localhost:3000/api/sla/ranking?sort_by=sla_compliance&limit=10" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Por mediana de respuesta

```bash
curl -X GET "http://localhost:3000/api/sla/ranking?sort_by=median&limit=20" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "ranking": [
    {
      "rank": 1,
      "approver_id": "EMP-SUP-003",
      "approver_role": "supervisor",
      "total_requests": 42,
      "avg_response_hours": 6.2,
      "median_response_hours": 4.5,
      "min_response_hours": 0.5,
      "max_response_hours": 22.1,
      "within_sla": 40,
      "outside_sla": 2,
      "sla_compliance_percent": "95.24"
    },
    {
      "rank": 2,
      "approver_id": "EMP-RRHH-001",
      "approver_role": "rrhh",
      "total_requests": 56,
      "avg_response_hours": 8.7,
      "sla_compliance_percent": "89.29"
    }
  ],
  "period": {
    "start": "2025-10-01T00:00:00.000Z",
    "end": "2025-10-31T23:59:59.000Z"
  },
  "sort_by": "avg",
  "total": 10
}
```

---

## 4. Detección de cuellos de botella

Identifica aprobadores lentos, tipos de solicitud con demoras y violaciones de SLA.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/sla/bottlenecks" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "bottlenecks": {
    "slow_approvers": [
      {
        "approver_id": "EMP-SUP-007",
        "approver_role": "supervisor",
        "avg_response_hours": 42.3,
        "total_requests": 15,
        "issue": "Tiempo promedio de 42.3h excede umbral de 24h"
      }
    ],
    "slow_request_types": [
      {
        "request_type": "shift_change",
        "avg_response_hours": 31.5,
        "total_requests": 22,
        "issue": "Tipo con promedio de 31.5h"
      }
    ],
    "high_sla_violation_approvers": [
      {
        "approver_id": "EMP-SUP-009",
        "approver_role": "supervisor",
        "sla_compliance_percent": "62.50",
        "outside_sla_count": 6,
        "issue": "Solo 62.50% de cumplimiento SLA"
      }
    ],
    "high_sla_violation_types": [
      {
        "request_type": "overtime_request",
        "sla_compliance_percent": "65.00",
        "outside_sla_count": 7,
        "issue": "Solo 65.00% de cumplimiento"
      }
    ],
    "total_bottlenecks": 4,
    "period": {
      "start": "2025-10-01T00:00:00.000Z",
      "end": "2025-10-31T23:59:59.000Z"
    }
  }
}
```

---

## 5. Estadísticas de aprobador

Obtiene estadísticas detalladas de un aprobador específico.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/sla/approver/EMP-SUP-003?start_date=2025-10-01&end_date=2025-10-31" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

### Respuesta esperada

```json
{
  "success": true,
  "stats": {
    "approver_id": "EMP-SUP-003",
    "period": {
      "start": "2025-10-01T00:00:00.000Z",
      "end": "2025-10-31T23:59:59.000Z"
    },
    "total_requests": 42,
    "avg_response_hours": 6.2,
    "median_response_hours": 4.5,
    "min_response_hours": 0.5,
    "max_response_hours": 22.1,
    "within_sla_count": 40,
    "outside_sla_count": 2,
    "sla_compliance_percent": "95.24",
    "by_request_type": {
      "vacation_request": {
        "count": 18,
        "within_sla": 17
      },
      "shift_swap_request": {
        "count": 12,
        "within_sla": 12
      },
      "overtime_request": {
        "count": 12,
        "within_sla": 11
      }
    },
    "recent_requests": [
      {
        "id": "uuid-1",
        "request_type": "vacation_request",
        "created_at": "2025-10-28T10:00:00.000Z",
        "responded_at": "2025-10-28T14:30:00.000Z",
        "response_hours": 4.5,
        "within_sla": true
      }
    ]
  }
}
```

---

## 6. Mis estadísticas (auto-consulta)

Permite que cualquier empleado consulte sus propias métricas como aprobador.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/sla/my-stats" \
  -H "x-company-id: 11" \
  -H "x-employee-id: EMP-SUP-003" \
  -H "x-role: supervisor"
```

### Respuesta esperada

Misma estructura que el endpoint `/approver/:id`, pero solo para el empleado actual.

---

## 7. Comparación entre períodos

Compara métricas del mes actual vs el mes anterior.

### Ejemplo cURL

```bash
curl -X GET "http://localhost:3000/api/sla/comparison" \
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
      "metrics": {
        "total_requests": 145,
        "avg_response_hours": 18.5,
        "sla_compliance_percent": "77.24"
      }
    },
    "previous": {
      "period": {
        "start": "2025-09-01T00:00:00.000Z",
        "end": "2025-09-30T23:59:59.000Z"
      },
      "metrics": {
        "total_requests": 132,
        "avg_response_hours": 21.3,
        "sla_compliance_percent": "72.73"
      }
    },
    "changes": {
      "avg_response_hours": "-2.80",
      "sla_compliance_percent": "4.51",
      "total_requests": 13
    }
  }
}
```

**Interpretación:**
- ✅ Tiempo promedio de respuesta mejoró 2.8 horas (más rápido)
- ✅ Cumplimiento de SLA mejoró 4.51%
- ℹ️ Se procesaron 13 solicitudes más este mes

---

## 8. Guardar métricas históricas

Guarda las métricas calculadas en la tabla `sla_metrics` para histórico y análisis de tendencias.

### Ejemplo cURL

```bash
curl -X POST "http://localhost:3000/api/sla/save-metrics" \
  -H "Content-Type: application/json" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "start_date": "2025-10-01",
    "end_date": "2025-10-31"
  }'
```

### Respuesta esperada

```json
{
  "success": true,
  "message": "Métricas guardadas exitosamente"
}
```

---

## 9. Casos de uso prácticos

### 9.1. Identificar aprobador más lento

```bash
# Obtener ranking inverso (más lento primero)
curl -X GET "http://localhost:3000/api/sla/ranking?sort_by=avg&limit=5" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" | jq '.ranking | reverse'
```

### 9.2. Detectar tipos de solicitud problemáticos

```bash
# Obtener métricas por tipo y filtrar con bajo cumplimiento
curl -X GET "http://localhost:3000/api/sla/metrics?start_date=2025-10-01&end_date=2025-10-31" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" | jq '.metrics.request_type_metrics[] | select(.sla_compliance_percent < 75)'
```

### 9.3. Monitoreo diario de cuellos de botella

```bash
#!/bin/bash
# Script para ejecutar diariamente (cron)

RESPONSE=$(curl -s -X GET "http://localhost:3000/api/sla/bottlenecks" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh")

TOTAL=$(echo $RESPONSE | jq -r '.bottlenecks.total_bottlenecks')

if [ "$TOTAL" -gt 0 ]; then
  echo "⚠️ ALERTA: $TOTAL cuellos de botella detectados"
  echo $RESPONSE | jq '.bottlenecks'
  # Enviar notificación a RRHH
fi
```

### 9.4. Generar reporte mensual automático

```javascript
const axios = require('axios');

async function generateMonthlySLAReport(companyId) {
    const headers = {
        'x-company-id': companyId,
        'x-role': 'rrhh'
    };

    // 1. Obtener dashboard completo
    const dashboard = await axios.get('http://localhost:3000/api/sla/dashboard', { headers });

    // 2. Guardar métricas históricas
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    await axios.post('http://localhost:3000/api/sla/save-metrics', {
        start_date: firstDay.toISOString().split('T')[0],
        end_date: lastDay.toISOString().split('T')[0]
    }, { headers });

    // 3. Generar resumen
    const summary = dashboard.data.dashboard.summary;
    const bottlenecks = dashboard.data.dashboard.bottlenecks;

    console.log('='.repeat(60));
    console.log('REPORTE MENSUAL DE SLA - ' + today.toLocaleDateString());
    console.log('='.repeat(60));
    console.log(`\nRESUMEN GLOBAL:`);
    console.log(`  Solicitudes procesadas: ${summary.total_requests}`);
    console.log(`  Tiempo promedio: ${summary.avg_response_hours.toFixed(1)}h`);
    console.log(`  Cumplimiento SLA: ${summary.sla_compliance_percent}%`);
    console.log(`\nCUELLOS DE BOTELLA: ${bottlenecks.total}`);

    if (bottlenecks.slow_approvers.length > 0) {
        console.log(`\n⚠️ Aprobadores lentos:`);
        bottlenecks.slow_approvers.forEach(a => {
            console.log(`  - ${a.approver_id}: ${a.avg_response_hours.toFixed(1)}h promedio`);
        });
    }

    // 4. TODO: Enviar por email a gerencia
}

// Ejecutar
generateMonthlySLAReport(11);
```

### 9.5. Dashboard en tiempo real (frontend)

```javascript
// React component example
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function SLADashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            const response = await axios.get('/api/sla/dashboard', {
                headers: {
                    'x-company-id': localStorage.getItem('company_id'),
                    'x-employee-id': localStorage.getItem('employee_id'),
                    'x-role': localStorage.getItem('role')
                }
            });
            setDashboard(response.data.dashboard);
            setLoading(false);
        };

        fetchDashboard();

        // Actualizar cada 5 minutos
        const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div>Cargando dashboard...</div>;

    return (
        <div className="sla-dashboard">
            <h2>Dashboard de SLA</h2>

            <div className="summary">
                <div className="metric">
                    <h3>{dashboard.summary.total_requests}</h3>
                    <p>Solicitudes procesadas</p>
                </div>
                <div className="metric">
                    <h3>{dashboard.summary.avg_response_hours.toFixed(1)}h</h3>
                    <p>Tiempo promedio</p>
                </div>
                <div className="metric">
                    <h3>{dashboard.summary.sla_compliance_percent}%</h3>
                    <p>Cumplimiento SLA</p>
                </div>
            </div>

            <div className="rankings">
                <h3>Top Aprobadores</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Aprobador</th>
                            <th>Promedio</th>
                            <th>SLA %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dashboard.top_approvers.map(a => (
                            <tr key={a.approver_id}>
                                <td>#{a.rank}</td>
                                <td>{a.approver_id}</td>
                                <td>{a.avg_response_hours.toFixed(1)}h</td>
                                <td>{a.sla_compliance_percent}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {dashboard.bottlenecks.total > 0 && (
                <div className="bottlenecks alert alert-warning">
                    <h3>⚠️ Cuellos de botella detectados: {dashboard.bottlenecks.total}</h3>
                    {dashboard.bottlenecks.slow_approvers.map(b => (
                        <div key={b.approver_id} className="bottleneck-item">
                            {b.issue}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SLADashboard;
```

---

## Testing Checklist

- [ ] Dashboard sin parámetros (mes actual)
- [ ] Dashboard con período específico
- [ ] Métricas detalladas
- [ ] Ranking ordenado por promedio
- [ ] Ranking ordenado por SLA compliance
- [ ] Ranking ordenado por mediana
- [ ] Detección de cuellos de botella
- [ ] Estadísticas de aprobador específico
- [ ] Mis estadísticas (auto-consulta)
- [ ] Comparación entre períodos
- [ ] Guardar métricas históricas
- [ ] Verificar permisos (solo RRHH puede ver todo)
- [ ] Verificar multi-tenant (datos aislados por empresa)

---

## Notas importantes

1. **Permisos**: La mayoría de endpoints requieren rol `rrhh` o `admin`, excepto `/my-stats` que permite auto-consulta.

2. **Períodos**: Si no se especifican fechas, se usa el mes actual por defecto.

3. **Umbrales**: Los cuellos de botella se detectan con umbrales configurables:
   - Tiempo promedio: 24 horas
   - Cumplimiento SLA mínimo: 70%

4. **Histórico**: Usar `/save-metrics` para guardar snapshots mensuales y analizar tendencias a largo plazo.

5. **Performance**: Las consultas SLA pueden ser pesadas en empresas grandes. Considerar cache o pre-cálculo mensual.
