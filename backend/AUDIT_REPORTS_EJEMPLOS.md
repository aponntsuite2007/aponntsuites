# 📄 AUDIT REPORTS - Ejemplos de Uso

Sistema de **generación de reportes con validez legal**: PDFs con firmas digitales, códigos QR y trazabilidad completa.

## 🎯 Características Principales

- ✅ **Firmas Digitales**: Hash SHA-256 para verificación de integridad
- ✅ **Códigos QR**: Verificación pública sin autenticación
- ✅ **Inmutabilidad**: Los reportes no se pueden eliminar ni modificar
- ✅ **Multi-tenant**: Aislamiento completo por empresa
- ✅ **Historial Completo**: Tracking de generación y accesos
- ✅ **6 Tipos de Reportes**: Compliance, SLA, Recursos, Asistencias, Desempeño, Violaciones

---

## 📚 Índice

1. [Tipos de Reportes Disponibles](#tipos-de-reportes)
2. [Generar Reportes](#generar-reportes)
3. [Verificación de Integridad](#verificación-de-integridad)
4. [Historial y Descarga](#historial-y-descarga)
5. [Generación en Lote](#generación-en-lote)
6. [Integración Frontend](#integración-frontend)
7. [Casos de Uso](#casos-de-uso)

---

## 📋 Tipos de Reportes Disponibles {#tipos-de-reportes}

### 1️⃣ Compliance Audit
Auditoría completa de violaciones legales detectadas.

**Parámetros requeridos:**
- `start_date`: Fecha de inicio
- `end_date`: Fecha de fin

**Contenido:**
- Total de violaciones
- Empleados afectados
- Violaciones activas vs resueltas
- Detalle de violaciones por severidad

---

### 2️⃣ SLA Performance
Rendimiento y tiempos de respuesta de aprobadores.

**Parámetros requeridos:**
- `start_date`: Fecha de inicio
- `end_date`: Fecha de fin

**Contenido:**
- Métricas globales (avg, median, min, max)
- Rankings de aprobadores
- Solicitudes aprobadas/rechazadas
- Tiempo promedio de respuesta

---

### 3️⃣ Resource Utilization
Utilización de recursos (horas trabajadas).

**Parámetros requeridos:**
- `start_date`: Fecha de inicio
- `end_date`: Fecha de fin

**Contenido:**
- Total de horas por categoría
- Distribución de horas
- Últimas transacciones
- Análisis de utilización

---

### 4️⃣ Attendance Summary
Resumen de asistencias, tardanzas y ausencias.

**Parámetros requeridos:**
- `start_date`: Fecha de inicio
- `end_date`: Fecha de fin

**Parámetros opcionales:**
- `employee_id`: Filtrar por empleado específico

**Contenido:**
- Total de registros
- Días presentes/ausentes/tardanzas
- Horas totales y extras
- Estadísticas generales

---

### 5️⃣ Employee Performance
Desempeño individual de un empleado.

**Parámetros requeridos:**
- `employee_id`: ID del empleado
- `start_date`: Fecha de inicio
- `end_date`: Fecha de fin

**Contenido:**
- Asistencia y puntualidad
- Violaciones de compliance
- Notificaciones leídas/no leídas
- Horas trabajadas y extras

---

### 6️⃣ Violation Report
Reporte de violaciones activas sin resolver.

**Parámetros requeridos:**
- `start_date`: Fecha de inicio
- `end_date`: Fecha de fin

**Contenido:**
- Lista de violaciones activas
- Ordenadas por severidad
- Referencia legal
- Empleados involucrados

---

## 🚀 Generar Reportes {#generar-reportes}

### Ejemplo 1: Reporte de Compliance

```bash
curl -X POST http://localhost:5000/api/audit-reports/generate \
  -H "Content-Type: application/json" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "report_type": "compliance_audit",
    "params": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-16"
    }
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Reporte generado exitosamente",
  "report": {
    "report_id": 1,
    "report_type": "compliance_audit",
    "verification_code": "A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6",
    "digital_signature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "generated_at": "2025-10-16T14:30:00.000Z",
    "filename": "compliance_audit_11_1_1697462400000.pdf",
    "file_size_kb": 245,
    "verification_url": "https://tu-dominio.com/verify/A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6"
  }
}
```

---

### Ejemplo 2: Reporte de SLA Performance

```bash
curl -X POST http://localhost:5000/api/audit-reports/generate \
  -H "Content-Type: application/json" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: admin" \
  -d '{
    "report_type": "sla_performance",
    "params": {
      "start_date": "2025-09-01",
      "end_date": "2025-09-30"
    }
  }'
```

---

### Ejemplo 3: Reporte de Recursos

```bash
curl -X POST http://localhost:5000/api/audit-reports/generate \
  -H "Content-Type: application/json" \
  -H "x-employee-id: EMP-ISI-002" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "report_type": "resource_utilization",
    "params": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-15"
    }
  }'
```

---

### Ejemplo 4: Reporte de Asistencias

```bash
# Reporte general de todos los empleados
curl -X POST http://localhost:5000/api/audit-reports/generate \
  -H "Content-Type: application/json" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "report_type": "attendance_summary",
    "params": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-16"
    }
  }'
```

```bash
# Reporte de un empleado específico
curl -X POST http://localhost:5000/api/audit-reports/generate \
  -H "Content-Type: application/json" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "report_type": "attendance_summary",
    "params": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-16",
      "employee_id": "EMP-ISI-025"
    }
  }'
```

---

### Ejemplo 5: Reporte de Desempeño Individual

```bash
curl -X POST http://localhost:5000/api/audit-reports/generate \
  -H "Content-Type: application/json" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  -d '{
    "report_type": "employee_performance",
    "params": {
      "employee_id": "EMP-ISI-025",
      "start_date": "2025-10-01",
      "end_date": "2025-10-16"
    }
  }'
```

---

### Ejemplo 6: Reporte de Violaciones Activas

```bash
curl -X POST http://localhost:5000/api/audit-reports/generate \
  -H "Content-Type: application/json" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: admin" \
  -d '{
    "report_type": "violation_report",
    "params": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-16"
    }
  }'
```

---

## 🔍 Verificación de Integridad {#verificación-de-integridad}

### Verificar Reporte con Código QR

**NOTA**: Este endpoint NO requiere autenticación para permitir verificación pública.

```bash
curl -X GET http://localhost:5000/api/audit-reports/verify/A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6
```

**Respuesta (Reporte Válido):**
```json
{
  "success": true,
  "verified": true,
  "report": {
    "id": 1,
    "type": "compliance_audit",
    "generated_at": "2025-10-16T14:30:00.000Z",
    "generated_by": "EMP-ISI-001",
    "company_id": 11
  },
  "message": "Reporte válido y no ha sido alterado"
}
```

**Respuesta (Reporte Alterado):**
```json
{
  "success": true,
  "verified": false,
  "report": { ... },
  "message": "ADVERTENCIA: El reporte ha sido modificado o corrompido"
}
```

**Respuesta (Código Inválido):**
```json
{
  "success": false,
  "error": "Código de verificación no encontrado",
  "verified": false
}
```

---

## 📂 Historial y Descarga {#historial-y-descarga}

### Obtener Historial de Reportes

```bash
# Todos los reportes
curl -X GET "http://localhost:5000/api/audit-reports/history?limit=50" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

```bash
# Filtrar por tipo de reporte
curl -X GET "http://localhost:5000/api/audit-reports/history?report_type=compliance_audit&limit=20" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

```bash
# Filtrar por fechas
curl -X GET "http://localhost:5000/api/audit-reports/history?start_date=2025-10-01&end_date=2025-10-16&limit=30" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: admin"
```

**Respuesta:**
```json
{
  "success": true,
  "reports": [
    {
      "id": 15,
      "report_type": "compliance_audit",
      "generated_at": "2025-10-16T14:30:00.000Z",
      "generated_by": "EMP-ISI-001",
      "verification_code": "A1B2C3D4...",
      "file_path": "compliance_audit_11_15_1697462400000.pdf",
      "status": "generated"
    },
    {
      "id": 14,
      "report_type": "sla_performance",
      "generated_at": "2025-10-15T10:15:00.000Z",
      "generated_by": "EMP-ISI-002",
      "verification_code": "X9Y8Z7W6...",
      "file_path": "sla_performance_11_14_1697376900000.pdf",
      "status": "generated"
    }
  ],
  "total": 2
}
```

---

### Descargar Reporte PDF

```bash
curl -X GET http://localhost:5000/api/audit-reports/download/15 \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh" \
  --output reporte.pdf
```

---

### Obtener Información de Reporte

```bash
curl -X GET http://localhost:5000/api/audit-reports/15/info \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

**Respuesta:**
```json
{
  "success": true,
  "report": {
    "id": 15,
    "type": "compliance_audit",
    "generated_at": "2025-10-16T14:30:00.000Z",
    "generated_by": "EMP-ISI-001",
    "parameters": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-16"
    },
    "verification_code": "A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6",
    "verification_url": "https://tu-dominio.com/verify/A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6",
    "status": "generated"
  }
}
```

---

## 📦 Generación en Lote {#generación-en-lote}

### Generar Múltiples Reportes a la Vez

```bash
curl -X POST http://localhost:5000/api/audit-reports/batch-generate \
  -H "Content-Type: application/json" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: admin" \
  -d '{
    "reports": [
      {
        "report_type": "compliance_audit",
        "params": {
          "start_date": "2025-10-01",
          "end_date": "2025-10-16"
        }
      },
      {
        "report_type": "sla_performance",
        "params": {
          "start_date": "2025-10-01",
          "end_date": "2025-10-16"
        }
      },
      {
        "report_type": "resource_utilization",
        "params": {
          "start_date": "2025-10-01",
          "end_date": "2025-10-16"
        }
      }
    ]
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "3 reportes generados exitosamente",
  "reports": [
    {
      "report_id": 16,
      "report_type": "compliance_audit",
      "verification_code": "...",
      "filename": "compliance_audit_11_16_1697462400000.pdf"
    },
    {
      "report_id": 17,
      "report_type": "sla_performance",
      "verification_code": "...",
      "filename": "sla_performance_11_17_1697462401000.pdf"
    },
    {
      "report_id": 18,
      "report_type": "resource_utilization",
      "verification_code": "...",
      "filename": "resource_utilization_11_18_1697462402000.pdf"
    }
  ],
  "total_generated": 3,
  "total_errors": 0
}
```

---

## 📊 Estadísticas de Reportes

```bash
curl -X GET "http://localhost:5000/api/audit-reports/statistics?start_date=2025-10-01&end_date=2025-10-31" \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: admin"
```

**Respuesta:**
```json
{
  "success": true,
  "period": {
    "start_date": "2025-10-01",
    "end_date": "2025-10-31"
  },
  "statistics": [
    {
      "report_type": "compliance_audit",
      "count_by_type": 15
    },
    {
      "report_type": "sla_performance",
      "count_by_type": 10
    },
    {
      "report_type": "resource_utilization",
      "count_by_type": 8
    },
    {
      "report_type": "attendance_summary",
      "count_by_type": 12
    }
  ]
}
```

---

## 📝 Listar Tipos de Reportes Disponibles

```bash
curl -X GET http://localhost:5000/api/audit-reports/types \
  -H "x-employee-id: EMP-ISI-001" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

**Respuesta:**
```json
{
  "success": true,
  "report_types": [
    {
      "type": "compliance_audit",
      "name": "Auditoría de Cumplimiento Legal",
      "description": "Reporte completo de violaciones legales detectadas",
      "required_params": ["start_date", "end_date"]
    },
    {
      "type": "sla_performance",
      "name": "Rendimiento SLA",
      "description": "Métricas de tiempo de respuesta y rankings de aprobadores",
      "required_params": ["start_date", "end_date"]
    }
    // ... otros tipos
  ],
  "total": 6
}
```

---

## 💻 Integración Frontend {#integración-frontend}

### React - Componente de Generación de Reportes

```javascript
import React, { useState } from 'react';
import axios from 'axios';

function AuditReportGenerator() {
  const [reportType, setReportType] = useState('compliance_audit');
  const [startDate, setStartDate] = useState('2025-10-01');
  const [endDate, setEndDate] = useState('2025-10-16');
  const [loading, setLoading] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5000/api/audit-reports/generate',
        {
          report_type: reportType,
          params: {
            start_date: startDate,
            end_date: endDate
          }
        },
        {
          headers: {
            'x-employee-id': 'EMP-ISI-001',
            'x-company-id': '11',
            'x-role': 'rrhh'
          }
        }
      );

      setGeneratedReport(response.data.report);
      alert('¡Reporte generado exitosamente!');
    } catch (error) {
      alert('Error generando reporte: ' + error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (reportId) => {
    window.open(
      `http://localhost:5000/api/audit-reports/download/${reportId}`,
      '_blank'
    );
  };

  return (
    <div className="audit-report-generator">
      <h2>Generar Reporte de Auditoría</h2>

      <div className="form-group">
        <label>Tipo de Reporte:</label>
        <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option value="compliance_audit">Auditoría de Cumplimiento</option>
          <option value="sla_performance">Rendimiento SLA</option>
          <option value="resource_utilization">Utilización de Recursos</option>
          <option value="attendance_summary">Resumen de Asistencias</option>
          <option value="employee_performance">Desempeño de Empleado</option>
          <option value="violation_report">Reporte de Violaciones</option>
        </select>
      </div>

      <div className="form-group">
        <label>Fecha de Inicio:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Fecha de Fin:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <button onClick={generateReport} disabled={loading}>
        {loading ? 'Generando...' : 'Generar Reporte'}
      </button>

      {generatedReport && (
        <div className="report-info">
          <h3>Reporte Generado</h3>
          <p>ID: {generatedReport.report_id}</p>
          <p>Tamaño: {generatedReport.file_size_kb} KB</p>
          <p>Código de Verificación: {generatedReport.verification_code}</p>

          <button onClick={() => downloadReport(generatedReport.report_id)}>
            Descargar PDF
          </button>

          <div className="qr-code">
            <p>Código QR de Verificación:</p>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${generatedReport.verification_url}`} alt="QR Code" />
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditReportGenerator;
```

---

### React - Componente de Verificación

```javascript
import React, { useState } from 'react';
import axios from 'axios';

function ReportVerifier() {
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const verifyReport = async () => {
    if (verificationCode.length !== 32) {
      alert('Código de verificación inválido (debe tener 32 caracteres)');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/audit-reports/verify/${verificationCode}`
      );

      setVerificationResult(response.data);
    } catch (error) {
      setVerificationResult({
        success: false,
        error: error.response?.data?.error || 'Error verificando reporte'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-verifier">
      <h2>Verificar Autenticidad de Reporte</h2>

      <div className="form-group">
        <label>Código de Verificación (32 caracteres):</label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
          placeholder="A1B2C3D4E5F6G7H8..."
          maxLength={32}
        />
      </div>

      <button onClick={verifyReport} disabled={loading || verificationCode.length !== 32}>
        {loading ? 'Verificando...' : 'Verificar Reporte'}
      </button>

      {verificationResult && (
        <div className={`verification-result ${verificationResult.verified ? 'valid' : 'invalid'}`}>
          {verificationResult.verified ? (
            <div className="valid">
              <h3>✅ Reporte Válido</h3>
              <p>{verificationResult.message}</p>
              <div className="report-details">
                <p><strong>ID:</strong> {verificationResult.report.id}</p>
                <p><strong>Tipo:</strong> {verificationResult.report.type}</p>
                <p><strong>Generado:</strong> {new Date(verificationResult.report.generated_at).toLocaleString()}</p>
                <p><strong>Generado por:</strong> {verificationResult.report.generated_by}</p>
              </div>
            </div>
          ) : (
            <div className="invalid">
              <h3>❌ Reporte Inválido</h3>
              <p>{verificationResult.error || verificationResult.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportVerifier;
```

---

### React - Historial de Reportes

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ReportHistory() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchReports();
  }, [filterType]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const url = filterType
        ? `http://localhost:5000/api/audit-reports/history?report_type=${filterType}&limit=50`
        : 'http://localhost:5000/api/audit-reports/history?limit=50';

      const response = await axios.get(url, {
        headers: {
          'x-employee-id': 'EMP-ISI-001',
          'x-company-id': '11',
          'x-role': 'rrhh'
        }
      });

      setReports(response.data.reports);
    } catch (error) {
      alert('Error obteniendo historial: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (reportId) => {
    window.open(
      `http://localhost:5000/api/audit-reports/download/${reportId}`,
      '_blank'
    );
  };

  return (
    <div className="report-history">
      <h2>Historial de Reportes</h2>

      <div className="filters">
        <label>Filtrar por tipo:</label>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos</option>
          <option value="compliance_audit">Compliance</option>
          <option value="sla_performance">SLA</option>
          <option value="resource_utilization">Recursos</option>
          <option value="attendance_summary">Asistencias</option>
          <option value="employee_performance">Desempeño</option>
          <option value="violation_report">Violaciones</option>
        </select>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="reports-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Generado</th>
              <th>Generado por</th>
              <th>Código de Verificación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{report.id}</td>
                <td>{report.report_type}</td>
                <td>{new Date(report.generated_at).toLocaleString()}</td>
                <td>{report.generated_by}</td>
                <td className="verification-code">{report.verification_code}</td>
                <td>
                  <button onClick={() => downloadReport(report.id)}>
                    Descargar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ReportHistory;
```

---

## 🎯 Casos de Uso {#casos-de-uso}

### Caso 1: Auditoría Mensual Automática

**Escenario**: Generar automáticamente reportes de compliance al final de cada mes.

```javascript
// Cron job con node-cron
const cron = require('node-cron');
const axios = require('axios');

// Ejecutar el primer día de cada mes a las 00:00
cron.schedule('0 0 1 * *', async () => {
  console.log('🔄 Generando reportes mensuales automáticos...');

  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  const startDate = lastMonth.toISOString().split('T')[0];
  const endDate = endOfLastMonth.toISOString().split('T')[0];

  // Generar reportes en lote
  try {
    const response = await axios.post(
      'http://localhost:5000/api/audit-reports/batch-generate',
      {
        reports: [
          {
            report_type: 'compliance_audit',
            params: { start_date: startDate, end_date: endDate }
          },
          {
            report_type: 'sla_performance',
            params: { start_date: startDate, end_date: endDate }
          },
          {
            report_type: 'resource_utilization',
            params: { start_date: startDate, end_date: endDate }
          }
        ]
      },
      {
        headers: {
          'x-employee-id': 'SYSTEM-AUTO',
          'x-company-id': '11',
          'x-role': 'admin'
        }
      }
    );

    console.log(`✅ ${response.data.total_generated} reportes generados automáticamente`);

    // Enviar notificación a RRHH
    // ...

  } catch (error) {
    console.error('❌ Error generando reportes automáticos:', error.message);
  }
});
```

---

### Caso 2: Verificación Pública de Reporte

**Escenario**: Cliente escanea código QR en reporte físico para verificar autenticidad.

```javascript
// Página de verificación pública (NO requiere login)
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function PublicVerifyPage() {
  const { verificationCode } = useParams(); // Obtener de URL
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyReport();
  }, []);

  const verifyReport = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/audit-reports/verify/${verificationCode}`
      );
      setResult(response.data);
    } catch (error) {
      setResult({ success: false, error: 'Código de verificación inválido' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Verificando...</div>;

  return (
    <div className="public-verify">
      {result.verified ? (
        <div className="valid-report">
          <h1>✅ Reporte Auténtico</h1>
          <p>Este reporte es válido y no ha sido alterado.</p>
          <div className="report-metadata">
            <p>Tipo: {result.report.type}</p>
            <p>Generado: {new Date(result.report.generated_at).toLocaleString()}</p>
            <p>Empresa ID: {result.report.company_id}</p>
          </div>
        </div>
      ) : (
        <div className="invalid-report">
          <h1>❌ Reporte Inválido</h1>
          <p>{result.error}</p>
        </div>
      )}
    </div>
  );
}
```

---

### Caso 3: Dashboard de Reportes para RRHH

**Escenario**: Panel de control para generar y gestionar reportes.

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ReportsManagementDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();

    try {
      // Obtener estadísticas
      const statsResponse = await axios.get(
        `http://localhost:5000/api/audit-reports/statistics`,
        {
          params: {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          },
          headers: {
            'x-employee-id': 'EMP-ISI-001',
            'x-company-id': '11',
            'x-role': 'rrhh'
          }
        }
      );

      setStatistics(statsResponse.data.statistics);

      // Obtener reportes recientes
      const reportsResponse = await axios.get(
        'http://localhost:5000/api/audit-reports/history?limit=10',
        {
          headers: {
            'x-employee-id': 'EMP-ISI-001',
            'x-company-id': '11',
            'x-role': 'rrhh'
          }
        }
      );

      setRecentReports(reportsResponse.data.reports);

    } catch (error) {
      console.error('Error obteniendo datos:', error);
    }
  };

  const quickGenerate = async (reportType) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    try {
      await axios.post(
        'http://localhost:5000/api/audit-reports/generate',
        {
          report_type: reportType,
          params: {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          }
        },
        {
          headers: {
            'x-employee-id': 'EMP-ISI-001',
            'x-company-id': '11',
            'x-role': 'rrhh'
          }
        }
      );

      alert('Reporte generado exitosamente');
      fetchDashboardData(); // Refrescar
    } catch (error) {
      alert('Error: ' + error.response?.data?.error);
    }
  };

  return (
    <div className="reports-dashboard">
      <h1>Panel de Reportes de Auditoría</h1>

      {/* Acciones Rápidas */}
      <div className="quick-actions">
        <h2>Generación Rápida (último mes)</h2>
        <button onClick={() => quickGenerate('compliance_audit')}>
          Compliance
        </button>
        <button onClick={() => quickGenerate('sla_performance')}>
          SLA
        </button>
        <button onClick={() => quickGenerate('resource_utilization')}>
          Recursos
        </button>
        <button onClick={() => quickGenerate('attendance_summary')}>
          Asistencias
        </button>
      </div>

      {/* Estadísticas */}
      {statistics && (
        <div className="statistics">
          <h2>Estadísticas (último mes)</h2>
          {statistics.map((stat) => (
            <div key={stat.report_type} className="stat-card">
              <h3>{stat.report_type}</h3>
              <p className="stat-number">{stat.count_by_type}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reportes Recientes */}
      <div className="recent-reports">
        <h2>Reportes Recientes</h2>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Generado</th>
              <th>Por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {recentReports.map((report) => (
              <tr key={report.id}>
                <td>{report.report_type}</td>
                <td>{new Date(report.generated_at).toLocaleDateString()}</td>
                <td>{report.generated_by}</td>
                <td>
                  <button onClick={() => window.open(`/api/audit-reports/download/${report.id}`)}>
                    Descargar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReportsManagementDashboard;
```

---

## 🔐 Seguridad y Mejores Prácticas

### 1. Verificación de Integridad
- Cada reporte incluye hash SHA-256 de su contenido
- Código QR para verificación pública sin autenticación
- Inmutabilidad: los reportes no se pueden eliminar ni modificar

### 2. Control de Acceso
- Solo roles RRHH y admin pueden generar reportes
- La verificación es pública (sin autenticación)
- Aislamiento multi-tenant estricto

### 3. Auditoría
- Todos los accesos a reportes se registran en `report_access_log`
- Tracking de quién generó cada reporte
- Historial completo de descargas y verificaciones

### 4. Almacenamiento
- PDFs almacenados en sistema de archivos
- Metadata en base de datos PostgreSQL
- Respaldo recomendado de directorio `reports/audit/`

---

## 📦 Dependencias Requeridas

```json
{
  "dependencies": {
    "pdfkit": "^0.13.0",
    "qrcode": "^1.5.3"
  }
}
```

**Instalar:**
```bash
npm install pdfkit qrcode
```

---

## ✅ Checklist de Implementación

- [ ] Instalar dependencias (`pdfkit`, `qrcode`)
- [ ] Crear tabla `audit_reports` y `report_access_log` en base de datos
- [ ] Configurar directorio de almacenamiento (`reports/audit/`)
- [ ] Configurar `VERIFICATION_URL` en variables de entorno
- [ ] Registrar rutas en `app.js`: `app.use('/api/audit-reports', require('./src/routes/auditReports'))`
- [ ] Implementar página pública de verificación en frontend
- [ ] Configurar cron jobs para reportes automáticos mensuales
- [ ] Configurar respaldo automático de PDFs generados
- [ ] Crear templates de email para notificar generación de reportes
- [ ] Implementar dashboard de gestión de reportes en frontend

---

## 🚀 Resumen

Los **Audit Reports** proporcionan:

1. ✅ **Validez Legal**: Firmas digitales y códigos QR verificables
2. ✅ **Inmutabilidad**: Los reportes no se pueden alterar ni eliminar
3. ✅ **Trazabilidad**: Historial completo de generación y accesos
4. ✅ **Flexibilidad**: 6 tipos de reportes diferentes
5. ✅ **Automatización**: Generación en lote y cron jobs
6. ✅ **Verificación Pública**: Cualquiera puede verificar autenticidad sin login

Este sistema garantiza que los reportes generados tienen validez legal y pueden ser utilizados en auditorías, inspecciones laborales o litigios.
