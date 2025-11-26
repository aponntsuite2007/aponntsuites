# Sistema de Comisiones Piramidales - Documentación Completa

> **Versión**: 1.0.0
> **Última actualización**: 2025-01-22
> **Estado**: PRODUCTION
> **Categoría**: COMMERCIAL

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#-resumen-ejecutivo)
2. [Guía de Uso](#-guía-de-uso)
3. [Funcionalidad Interna](#-funcionalidad-interna)
4. [Stack Tecnológico](#-stack-tecnológico)
5. [Diagramas de Flujo](#-diagramas-de-flujo)
6. [API REST](#-api-rest)
7. [Base de Datos](#-base-de-datos)
8. [Ejemplos de Uso](#-ejemplos-de-uso)
9. [Troubleshooting](#-troubleshooting)

---

## 🎯 Resumen Ejecutivo

### ¿Qué es este módulo?

El **Sistema de Comisiones Piramidales** es un módulo empresarial que gestiona el cálculo, seguimiento y distribución de comisiones para el staff de ventas y soporte de Aponnt, implementando una estructura jerárquica piramidal multinivel.

El sistema permite que cada miembro del equipo de ventas reciba:
- **Comisiones directas** por ventas propias (sales_commission_usd)
- **Comisiones directas** por soporte a clientes (support_commission_usd)
- **Comisiones piramidales** por ventas de todos sus subordinados en la jerarquía

Esta arquitectura incentiva no solo la venta directa, sino también el liderazgo y la construcción de equipos efectivos.

### Características Principales

- ✅ **Cálculo Piramidal Recursivo**: Sistema que calcula comisiones en cascada a través de múltiples niveles jerárquicos (CEO → Regional → Supervisor → Leader → Vendor)
- ✅ **Comisiones Mixtas**: Soporte para 3 tipos de comisión: directa de ventas, directa de soporte, y piramidal
- ✅ **Porcentajes Personalizables**: Cada staff puede tener un % piramidal override o usar el % por defecto de su rol
- ✅ **Multi-Tenant**: Cálculos aislados por empresa cliente (company_id)
- ✅ **Optimización PostgreSQL**: Funciones SQL nativas para cálculos de alto rendimiento
- ✅ **API REST Completa**: 8 endpoints para consultas, proyecciones y rankings
- ✅ **Reportes Dinámicos**: Rankings por comisiones, proyecciones mensuales, análisis de subordinados

### Métricas Clave

| Métrica | Valor |
|---------|-------|
| Progreso | 100% |
| Tests implementados | 8/8 |
| API Endpoints | 8 |
| Tablas BD | 3 (companies, aponnt_staff, aponnt_staff_roles) |
| Funciones PostgreSQL | 3 |
| Vistas | 1 (v_staff_pyramid_percentage) |
| Archivos de código | 2 |
| Líneas de código | ~900 |

---

## 👤 Guía de Uso

### ¿Quién usa este módulo?

- **CEO / Gerente General**: Consulta comisiones totales del equipo, rankings de staff, totales por país
- **Gerentes Regionales**: Consulta comisiones propias y de su equipo bajo su mando
- **Supervisores de Ventas**: Consulta comisiones personales y de vendedores asignados
- **Líderes de Equipo**: Consulta comisiones directas y piramidales de su team
- **Vendedores**: Consulta solo comisiones directas (no tienen comisión piramidal)
- **Administrativos**: Generan reportes de liquidación de comisiones

### Casos de Uso Comunes

#### Caso 1: Consultar Comisiones Personales

**Objetivo**: Un líder quiere ver cuánto ha ganado en el mes actual

**Pasos**:
1. Hacer login en panel staff
2. Navegar a sección "Mis Comisiones"
3. Seleccionar mes/año o dejar vacío para total
4. Ver desglose: directas ventas + directas soporte + piramidal

**Resultado esperado**: Dashboard con resumen completo de comisiones, incluyendo:
- Total de comisiones en USD
- Desglose por tipo (directa/piramidal)
- Cantidad de empresas vendidas/soportadas
- Cantidad de subordinados activos

#### Caso 2: Ver Jerarquía de Subordinados

**Objetivo**: Un supervisor quiere saber cuántos vendedores tiene bajo su mando

**Pasos**:
1. Acceder a `/api/aponnt/staff-commissions/:staffId/subordinates`
2. El sistema retorna árbol jerárquico completo con depth levels
3. Ver cuántos subordinados directos e indirectos

**Resultado esperado**: Array JSON con todos los subordinados, su rol, nivel jerárquico y path

#### Caso 3: Obtener Ranking del Equipo

**Objetivo**: El CEO quiere ver quiénes son los top 10 staff del mes

**Pasos**:
1. Llamar a `/api/aponnt/staff-commissions/team/ranking?month=1&year=2025&limit=10`
2. Sistema calcula comisiones totales de todos los staff de ventas
3. Ordena por total descendente

**Resultado esperado**: Top 10 staff con comisiones totales ordenados de mayor a menor

#### Caso 4: Proyección de Comisiones del Mes

**Objetivo**: Un vendedor quiere estimar cuánto ganará al finalizar el mes

**Pasos**:
1. Llamar a `/api/aponnt/staff-commissions/:staffId/projection`
2. Sistema calcula comisiones acumuladas hasta hoy
3. Proyecta linealmente al final del mes

**Resultado esperado**: JSON con comisiones acumuladas y proyección estimada

### Flujo de Trabajo del Usuario

```mermaid
graph TD
    A[Staff ingresa a panel] --> B{¿Tiene rol de ventas?}
    B -->|No| C[Sin acceso a comisiones]
    B -->|Sí| D[Pantalla Mis Comisiones]
    D --> E[Selecciona período opcional]
    E --> F[API calcula comisiones]
    F --> G[Muestra desglose]
    G --> H{¿Quiere ver subordinados?}
    H -->|Sí| I[Ver jerarquía]
    H -->|No| J[Fin]
    I --> J
```

---

## ⚙️ Funcionalidad Interna

### Arquitectura del Módulo

El sistema sigue arquitectura de **capas**:

1. **Capa de Rutas** (`staffCommissionsRoutes.js`): Maneja HTTP, validaciones de entrada, autenticación
2. **Capa de Servicio** (`StaffCommissionService.js`): Lógica de negocio, orchestration
3. **Capa de Datos**: Funciones PostgreSQL nativas para cálculos recursivos

**Patrón**: Service Layer + Stored Procedures (híbrido)

### Componentes Principales

#### 1. StaffCommissionService

**Ubicación**: `src/services/StaffCommissionService.js`

**Responsabilidades**:
- Calcular comisión piramidal usando funciones SQL
- Obtener resumen completo de comisiones de un staff
- Obtener subordinados recursivos
- Actualizar % piramidal override
- Generar rankings y proyecciones

**Métodos clave**:
```javascript
async calculatePyramidCommission(staffId, month, year) // Calcula comisión piramidal
async getStaffCommissionSummary(staffId, month, year) // Resumen completo
async getStaffSubordinatesRecursive(staffId, maxDepth) // Jerarquía de subordinados
async getStaffPyramidPercentage(staffId) // % efectivo del staff
async updateStaffPyramidPercentageOverride(staffId, percentage) // Actualizar override
async getSalesTeamCommissionsSummary(country, month, year) // Resumen del equipo
async getTopStaffByCommissions(month, year, limit) // Top N staff
async getMonthlyCommissionProjection(staffId) // Proyección del mes
```

#### 2. staffCommissionsRoutes

**Ubicación**: `src/routes/staffCommissionsRoutes.js`

**Responsabilidades**:
- Definir endpoints REST
- Validar parámetros de entrada
- Formatear respuestas JSON
- Manejo de errores HTTP

### Flujo de Datos

```mermaid
sequenceDiagram
    participant U as Usuario (Staff)
    participant F as Frontend
    participant API as staffCommissionsRoutes
    participant S as StaffCommissionService
    participant DB as PostgreSQL

    U->>F: Ver mis comisiones
    F->>API: GET /api/aponnt/staff-commissions/:staffId
    API->>S: getStaffCommissionSummary(staffId, month, year)
    S->>DB: SELECT * FROM get_staff_commission_summary(:staffId, :month, :year)
    Note over DB: Función SQL ejecuta:<br/>1. Calcula directas ventas<br/>2. Calcula directas soporte<br/>3. Llama calculate_pyramid_commission()<br/>4. Suma totales
    DB-->>S: Row con todos los totales
    S-->>API: Objeto summary formateado
    API-->>F: JSON Response 200 OK
    F-->>U: Dashboard actualizado
```

### Reglas de Negocio

1. **Solo ventas tienen comisión piramidal**: Roles de área "ventas" (CEO, Regional, Supervisor, Leader) reciben comisión piramidal. Vendedores solo reciben directa.

2. **Porcentajes por rol**:
   - CEO: 0.5% piramidal
   - Regional Manager: 1.0% piramidal
   - Supervisor: 1.5% piramidal
   - Team Leader: 2.0% piramidal
   - Vendor: 0% piramidal (solo directa)

3. **Override personalizado**: Un staff puede tener `pyramid_commission_percentage_override` que reemplaza el % del rol. NULL = usa % del rol.

4. **Cálculo piramidal recursivo**: La comisión piramidal se calcula sobre las ventas de **TODOS** los subordinados en la cadena, no solo directos.

5. **Multi-tenant isolation**: Todas las consultas filtran por `company_id` de la empresa cliente. Las comisiones staff son de empresas vendidas/soportadas.

6. **Período flexible**: Se puede calcular comisiones por mes/año específico o total histórico (month=NULL, year=NULL).

### Validaciones

- **Validación 1 (PUT percentage)**: El % piramidal debe ser 0-100 o null. Si está fuera de rango, retorna 400 Bad Request.

- **Validación 2 (Staff existe)**: Antes de calcular, verifica que `staffId` existe en `aponnt_staff`. Si no existe, retorna 404 Not Found.

- **Validación 3 (Rol de ventas)**: Solo staff con `role_area = 'ventas'` puede tener comisión piramidal. Si es otro rol, pyramid = 0.

- **Validación 4 (Formato de parámetros)**: `month` debe ser 1-12, `year` debe ser número válido. Si no cumple, se ignora y se usa NULL (total).

---

## 🛠️ Stack Tecnológico

### Backend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Node.js** | 18+ | Runtime principal |
| **Express.js** | 4.x | Framework web (rutas) |
| **Sequelize** | 6.x | ORM (solo para raw queries en este caso) |
| **PostgreSQL** | 14+ | Base de datos (funciones recursivas) |
| **pg** | 8.x | Driver PostgreSQL nativo |

### Frontend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Vanilla JS** | ES6+ | Llamadas fetch() a API |
| **HTML5** | - | Estructura del dashboard |
| **CSS3** | - | Estilos del dashboard |
| **Chart.js** | 3.x | Gráficos de comisiones (futuro) |

### Dependencias del Módulo

Este módulo **depende** de:
- `aponnt_staff` - Tabla de staff con jerarquía y roles
- `aponnt_staff_roles` - Definición de roles y % por defecto
- `companies` - Empresas clientes que generan comisiones

Este módulo es **requerido por**:
- `commissionLiquidation` - Liquidación y pago de comisiones (futuro)
- `invoicing` - Facturación con comisiones incluidas (futuro)

---

## 📊 Diagramas de Flujo

### Flujo Principal: Cálculo de Comisión Piramidal

```mermaid
graph TD
    A[calculatePyramidCommission] --> B[Ejecutar función SQL]
    B --> C{¿Tiene subordinados?}
    C -->|No| D[Retornar 0.00]
    C -->|Sí| E[Obtener % piramidal efectivo]
    E --> F[Recursión por cada subordinado]
    F --> G[Sumar sales_commission_usd de empresas del subordinado]
    G --> H[Aplicar % piramidal]
    H --> I[Sumar comisiones de subordinados de subordinados]
    I --> J[Retornar total piramidal]
```

### Flujo de Obtención de Resumen Completo

```mermaid
flowchart TD
    Start([getStaffCommissionSummary]) --> GetStaff[Buscar staff en BD]
    GetStaff --> Exists{¿Existe?}
    Exists -->|No| Return404[Retornar null]
    Exists -->|Sí| CallFunc[Llamar get_staff_commission_summary SQL]
    CallFunc --> CalcDirect[Calcular directas ventas]
    CalcDirect --> CalcSupport[Calcular directas soporte]
    CalcSupport --> CalcPyramid[Calcular piramidal con recursión]
    CalcPyramid --> Sum[Sumar totales]
    Sum --> CountCompanies[Contar empresas]
    CountCompanies --> CountSubs[Contar subordinados]
    CountSubs --> Format[Formatear response]
    Format --> Return200[Retornar objeto summary]
    Return404 --> End([Fin])
    Return200 --> End
```

### Diagrama de Estados: Comisión Staff

```mermaid
stateDiagram-v2
    [*] --> SinComisiones: Staff nuevo
    SinComisiones --> ComisionesDirectas: Vendió primera empresa
    ComisionesDirectas --> ComisionesMixtas: Asignaron subordinados
    ComisionesMixtas --> ComisionesPiramidales: Solo lidera, no vende
    ComisionesPiramidales --> ComisionesMixtas: Vuelve a vender
    ComisionesDirectas --> SinComisiones: Empresa canceló
    ComisionesMixtas --> [*]: Staff inactivo
    ComisionesPiramidales --> [*]: Staff inactivo
```

### Diagrama de Jerarquía de Subordinados

```mermaid
graph TD
    CEO[CEO - Level 0]
    CEO --> R1[Regional AR - Level 1]
    CEO --> R2[Regional BR - Level 1]
    R1 --> S1[Supervisor CABA - Level 2]
    R1 --> S2[Supervisor Córdoba - Level 2]
    S1 --> L1[Team Leader A - Level 3]
    S1 --> L2[Team Leader B - Level 3]
    L1 --> V1[Vendor 1 - Level 4]
    L1 --> V2[Vendor 2 - Level 4]
    L2 --> V3[Vendor 3 - Level 4]

    style CEO fill:#ff6b6b
    style R1 fill:#4ecdc4
    style R2 fill:#4ecdc4
    style S1 fill:#95e1d3
    style S2 fill:#95e1d3
    style L1 fill:#f9ca24
    style L2 fill:#f9ca24
    style V1 fill:#a29bfe
    style V2 fill:#a29bfe
    style V3 fill:#a29bfe
```

---

## 🌐 API REST

### Base URL

```
/api/aponnt/staff-commissions
```

### Endpoints

#### 1. Obtener Resumen de Comisiones de un Staff

```http
GET /api/aponnt/staff-commissions/:staffId
```

**Descripción**: Obtiene resumen completo de comisiones de un staff (directas + piramidales)

**Parámetros de ruta**:
- `staffId` (UUID): ID del staff de Aponnt

**Query params** (opcionales):
- `month` (number 1-12): Mes específico
- `year` (number): Año específico

**Headers requeridos**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Respuesta exitosa** (200):
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid-del-staff",
    "staff_name": "Juan Pérez",
    "role_code": "TL",
    "role_name": "Team Leader",
    "commissions": {
      "direct_sales": 1500.00,
      "direct_support": 300.00,
      "pyramid": 2400.00,
      "total": 4200.00
    },
    "stats": {
      "companies_count": 12,
      "subordinates_count": 5
    },
    "period": {
      "month": 1,
      "year": 2025
    }
  }
}
```

**Errores posibles**:
- `404 Not Found`: Staff no encontrado
- `500 Internal Server Error`: Error en cálculo

#### 2. Calcular Solo Comisión Piramidal

```http
GET /api/aponnt/staff-commissions/:staffId/pyramid
```

**Descripción**: Calcula únicamente la comisión piramidal (sin directas)

**Parámetros de ruta**:
- `staffId` (UUID): ID del staff

**Query params** (opcionales):
- `month` (number): Mes
- `year` (number): Año

**Respuesta exitosa** (200):
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid-del-staff",
    "pyramid_commission_usd": 2400.00,
    "period": {
      "month": 1,
      "year": 2025
    }
  }
}
```

#### 3. Obtener Jerarquía de Subordinados

```http
GET /api/aponnt/staff-commissions/:staffId/subordinates
```

**Descripción**: Obtiene árbol completo de subordinados (recursivo)

**Query params** (opcionales):
- `maxDepth` (number): Profundidad máxima (default: 10)

**Respuesta exitosa** (200):
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid-supervisor",
    "subordinates_count": 15,
    "subordinates": [
      {
        "staff_id": "uuid-leader1",
        "staff_name": "María López",
        "role_code": "TL",
        "level": 7,
        "depth": 1,
        "path": ["uuid-supervisor", "uuid-leader1"]
      },
      {
        "staff_id": "uuid-vendor1",
        "staff_name": "Carlos Gómez",
        "role_code": "VE",
        "level": 8,
        "depth": 2,
        "path": ["uuid-supervisor", "uuid-leader1", "uuid-vendor1"]
      }
    ]
  }
}
```

#### 4. Obtener Porcentaje Piramidal Efectivo

```http
GET /api/aponnt/staff-commissions/:staffId/pyramid-percentage
```

**Descripción**: Obtiene % piramidal efectivo (override o rol default)

**Respuesta exitosa** (200):
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid-staff",
    "staff_name": "Juan Pérez",
    "role_code": "TL",
    "role_name": "Team Leader",
    "percentages": {
      "role_default": 2.00,
      "staff_override": null,
      "effective": 2.00
    },
    "is_active": true
  }
}
```

#### 5. Actualizar Override de Porcentaje Piramidal

```http
PUT /api/aponnt/staff-commissions/:staffId/pyramid-percentage
```

**Descripción**: Actualiza el % piramidal personalizado de un staff

**Body (JSON)**:
```json
{
  "percentage": 2.5
}
```

**Notas**:
- `percentage` puede ser número 0-100 o `null` (para usar % del rol)
- Solo admins pueden llamar este endpoint

**Respuesta exitosa** (200):
```json
{
  "success": true,
  "message": "Porcentaje piramidal actualizado exitosamente",
  "data": {
    "staff_id": "uuid-staff",
    "percentages": {
      "role_default": 2.00,
      "staff_override": 2.50,
      "effective": 2.50
    }
  }
}
```

**Errores posibles**:
- `400 Bad Request`: Porcentaje fuera de rango 0-100
- `500 Internal Server Error`: Error al actualizar

#### 6. Obtener Proyección de Comisiones del Mes

```http
GET /api/aponnt/staff-commissions/:staffId/projection
```

**Descripción**: Proyecta comisiones al final del mes actual basado en días transcurridos

**Respuesta exitosa** (200):
```json
{
  "success": true,
  "data": {
    "staff_id": "uuid-staff",
    "staff_name": "Juan Pérez",
    "role": "TL",
    "current_period": {
      "month": 1,
      "year": 2025,
      "days_elapsed": 22,
      "days_total": 31,
      "progress_percentage": "70.97"
    },
    "accumulated": {
      "direct_sales": 1200.00,
      "direct_support": 250.00,
      "pyramid": 1800.00,
      "total": 3250.00
    },
    "projected": {
      "direct_sales": "1690.91",
      "direct_support": "352.27",
      "pyramid": "2536.36",
      "total": "4579.55"
    }
  }
}
```

#### 7. Resumen de Comisiones del Equipo

```http
GET /api/aponnt/staff-commissions/team/summary
```

**Descripción**: Obtiene resumen de comisiones de todo el equipo de ventas

**Query params** (opcionales):
- `country` (string): Código ISO-2 (AR, BR, CL, etc.)
- `month` (number): Mes
- `year` (number): Año

**Respuesta exitosa** (200):
```json
{
  "success": true,
  "data": {
    "country": "AR",
    "period": { "month": 1, "year": 2025 },
    "staff_count": 25,
    "summaries": [
      {
        "staff_id": "uuid-1",
        "staff_name": "Juan Pérez",
        "role_code": "TL",
        "commissions": {
          "direct_sales": 1500.00,
          "direct_support": 300.00,
          "pyramid": 2400.00,
          "total": 4200.00
        }
      }
    ],
    "totals": {
      "direct_sales": 45000.00,
      "direct_support": 8500.00,
      "pyramid": 62000.00,
      "total": 115500.00
    }
  }
}
```

#### 8. Ranking de Staff por Comisiones

```http
GET /api/aponnt/staff-commissions/team/ranking
```

**Descripción**: Obtiene top N staff ordenados por comisiones totales

**Query params** (opcionales):
- `month` (number): Mes
- `year` (number): Año
- `limit` (number): Cantidad de resultados (default: 10)

**Respuesta exitosa** (200):
```json
{
  "success": true,
  "data": {
    "count": 10,
    "period": { "month": 1, "year": 2025 },
    "ranking": [
      {
        "staff_id": "uuid-ceo",
        "staff_name": "CEO Nombre",
        "role_code": "CEO",
        "commissions": {
          "direct_sales": 0.00,
          "direct_support": 0.00,
          "pyramid": 125000.00,
          "total": 125000.00
        },
        "stats": {
          "companies_count": 0,
          "subordinates_count": 150
        }
      },
      {
        "staff_id": "uuid-regional",
        "staff_name": "Regional Manager",
        "role_code": "RM",
        "commissions": {
          "total": 75000.00
        }
      }
    ]
  }
}
```

---

## 🗄️ Base de Datos

### Tablas Principales

#### Tabla: `aponnt_staff`

**Descripción**: Staff de Aponnt (vendedores, líderes, supervisores, regionales, CEO)

**Schema** (campos relevantes para comisiones):

| Campo | Tipo | Constraints | Descripción |
|-------|------|-------------|-------------|
| `staff_id` | UUID | PRIMARY KEY | ID único del staff |
| `role_id` | INTEGER | FK → aponnt_staff_roles(role_id) | Rol del staff |
| `reports_to_staff_id` | UUID | FK → aponnt_staff(staff_id) | Superior directo (jerarquía) |
| `pyramid_commission_percentage_override` | DECIMAL(5,2) | NULL por defecto | Override del % piramidal |
| `is_active` | BOOLEAN | DEFAULT true | Si está activo |
| `country` | VARCHAR(2) | NOT NULL | País (AR, BR, CL, etc.) |

**Índices**:
```sql
CREATE INDEX idx_aponnt_staff_hierarchy ON aponnt_staff(reports_to_staff_id);
CREATE INDEX idx_aponnt_staff_role ON aponnt_staff(role_id);
CREATE INDEX idx_aponnt_staff_active ON aponnt_staff(is_active) WHERE is_active = true;
```

**Relaciones**:
- `aponnt_staff_roles` (N:1) - Un staff tiene un rol
- `companies` (1:N) - Un staff puede vender/soportar muchas empresas (assigned_vendor_id, support_vendor_id)

#### Tabla: `aponnt_staff_roles`

**Descripción**: Roles del staff con % piramidal por defecto

**Schema**:

| Campo | Tipo | Constraints | Descripción |
|-------|------|-------------|-------------|
| `role_id` | SERIAL | PRIMARY KEY | ID del rol |
| `role_code` | VARCHAR(10) | UNIQUE NOT NULL | Código (CEO, RM, SV, TL, VE) |
| `role_name` | VARCHAR(100) | NOT NULL | Nombre del rol |
| `role_area` | VARCHAR(50) | NOT NULL | Área (ventas, soporte, admin) |
| `level` | INTEGER | NOT NULL | Nivel jerárquico (0-8) |
| `pyramid_commission_percentage` | DECIMAL(5,2) | DEFAULT 0.00 | % piramidal por defecto |

**Valores insertados**:
```sql
-- Solo roles de ventas tienen % piramidal
INSERT INTO aponnt_staff_roles (role_code, role_name, role_area, level, pyramid_commission_percentage) VALUES
('CEO', 'CEO', 'ventas', 0, 0.50),
('RM', 'Regional Manager', 'ventas', 1, 1.00),
('SV', 'Supervisor de Ventas', 'ventas', 2, 1.50),
('TL', 'Team Leader', 'ventas', 3, 2.00),
('VE', 'Vendedor', 'ventas', 4, 0.00); -- Vendedores NO tienen piramidal
```

#### Tabla: `companies`

**Descripción**: Empresas clientes que generan comisiones

**Schema** (campos relevantes):

| Campo | Tipo | Constraints | Descripción |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | ID de la empresa |
| `assigned_vendor_id` | UUID | FK → aponnt_staff(staff_id) | Vendedor asignado |
| `support_vendor_id` | UUID | FK → aponnt_staff(staff_id) | Soporte asignado |
| `sales_commission_usd` | DECIMAL(12,2) | DEFAULT 0.00 | Comisión por venta (USD) |
| `support_commission_usd` | DECIMAL(12,2) | DEFAULT 0.00 | Comisión por soporte (USD) |

**Relaciones**:
- `assigned_vendor_id` → `aponnt_staff` (vendedor que vendió la empresa)
- `support_vendor_id` → `aponnt_staff` (vendedor que soporta la empresa)

### Funciones PostgreSQL

#### Función: `calculate_pyramid_commission()`

**Descripción**: Calcula recursivamente la comisión piramidal de un staff

**Firma**:
```sql
CREATE OR REPLACE FUNCTION calculate_pyramid_commission(
    p_staff_id UUID,
    p_month INTEGER DEFAULT NULL,
    p_year INTEGER DEFAULT NULL
) RETURNS DECIMAL(12,2)
```

**Parámetros**:
- `p_staff_id` (UUID): ID del staff
- `p_month` (INTEGER): Mes (1-12) o NULL para total
- `p_year` (INTEGER): Año o NULL para total

**Retorna**: DECIMAL(12,2) - Total de comisión piramidal en USD

**Lógica**:
1. Obtener % piramidal efectivo del staff
2. Obtener todos los subordinados directos
3. Por cada subordinado:
   - Sumar sales_commission_usd de empresas asignadas
   - Llamar recursivamente a calculate_pyramid_commission() del subordinado
4. Aplicar % piramidal sobre el total
5. Retornar suma

**Ejemplo de uso**:
```sql
-- Comisión piramidal de enero 2025
SELECT calculate_pyramid_commission('uuid-del-staff', 1, 2025);

-- Comisión piramidal total histórica
SELECT calculate_pyramid_commission('uuid-del-staff', NULL, NULL);
```

#### Función: `get_staff_commission_summary()`

**Descripción**: Obtiene resumen completo de comisiones (directas + piramidales)

**Firma**:
```sql
CREATE OR REPLACE FUNCTION get_staff_commission_summary(
    p_staff_id UUID,
    p_month INTEGER DEFAULT NULL,
    p_year INTEGER DEFAULT NULL
) RETURNS TABLE (...)
```

**Retorna**: Row con campos:
- `staff_id` UUID
- `staff_name` VARCHAR
- `role_code` VARCHAR
- `role_name` VARCHAR
- `direct_sales_commission` DECIMAL
- `direct_support_commission` DECIMAL
- `pyramid_commission` DECIMAL
- `total_commission` DECIMAL
- `companies_count` INTEGER
- `subordinates_count` INTEGER

**Ejemplo de uso**:
```sql
SELECT * FROM get_staff_commission_summary('uuid-staff', 1, 2025);
```

#### Función: `get_staff_subordinates_recursive()`

**Descripción**: Obtiene árbol completo de subordinados con depth y path

**Firma**:
```sql
CREATE OR REPLACE FUNCTION get_staff_subordinates_recursive(
    p_staff_id UUID,
    p_max_depth INTEGER DEFAULT 10
) RETURNS TABLE (...)
```

**Retorna**: Rows con:
- `staff_id` UUID
- `staff_name` VARCHAR
- `role_code` VARCHAR
- `level` INTEGER (nivel jerárquico del rol)
- `depth` INTEGER (profundidad desde el staff raíz)
- `path` UUID[] (array de UUIDs del path jerárquico)

**Ejemplo de uso**:
```sql
-- Obtener hasta 5 niveles de subordinados
SELECT * FROM get_staff_subordinates_recursive('uuid-supervisor', 5);
```

### Vistas

#### Vista: `v_staff_pyramid_percentage`

**Descripción**: Vista que muestra % piramidal efectivo de cada staff

**Query**:
```sql
CREATE OR REPLACE VIEW v_staff_pyramid_percentage AS
SELECT
  s.staff_id,
  s.first_name,
  s.last_name,
  r.role_code,
  r.role_name,
  r.pyramid_commission_percentage AS role_default_percentage,
  s.pyramid_commission_percentage_override AS staff_override_percentage,
  COALESCE(
    s.pyramid_commission_percentage_override,
    r.pyramid_commission_percentage
  ) AS effective_pyramid_percentage,
  s.is_active
FROM aponnt_staff s
INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
WHERE r.role_area = 'ventas';
```

**Uso**:
```sql
-- Ver % efectivo de un staff
SELECT * FROM v_staff_pyramid_percentage WHERE staff_id = 'uuid-staff';

-- Ver todos los staff con override personalizado
SELECT * FROM v_staff_pyramid_percentage WHERE staff_override_percentage IS NOT NULL;
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Consultar Comisiones desde Frontend

**Escenario**: Un team leader quiere ver sus comisiones del mes actual

**Frontend (JavaScript)**:
```javascript
async function obtenerMisComisiones() {
  const staffId = localStorage.getItem('staff_id'); // UUID del staff logueado
  const token = localStorage.getItem('token');

  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  try {
    const response = await fetch(
      `/api/aponnt/staff-commissions/${staffId}?month=${month}&year=${year}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();

    if (result.success) {
      const { data } = result;
      console.log('Comisiones:', data.commissions);

      // Actualizar UI
      document.getElementById('total-comisiones').textContent =
        `$${data.commissions.total.toFixed(2)} USD`;
      document.getElementById('directas-ventas').textContent =
        `$${data.commissions.direct_sales.toFixed(2)}`;
      document.getElementById('piramidal').textContent =
        `$${data.commissions.pyramid.toFixed(2)}`;
    }
  } catch (error) {
    console.error('Error obteniendo comisiones:', error);
    alert('Error al cargar comisiones');
  }
}
```

### Ejemplo 2: Actualizar % Piramidal (Admin)

**Escenario**: Un admin quiere darle un 2.5% piramidal custom a un líder

**Backend (Service Call)**:
```javascript
// Desde backend/src/services/StaffCommissionService.js
const staffId = 'uuid-del-team-leader';
const newPercentage = 2.5; // Custom override

const updated = await StaffCommissionService.updateStaffPyramidPercentageOverride(
  staffId,
  newPercentage
);

console.log('Actualizado:', updated);
// {
//   staff_id: 'uuid...',
//   percentages: {
//     role_default: 2.00,
//     staff_override: 2.50,
//     effective: 2.50
//   }
// }
```

### Ejemplo 3: Obtener Ranking del Mes

**Escenario**: El CEO quiere ver el top 5 del mes de enero

**cURL**:
```bash
curl -X GET "http://localhost:9998/api/aponnt/staff-commissions/team/ranking?month=1&year=2025&limit=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "count": 5,
    "period": { "month": 1, "year": 2025 },
    "ranking": [
      {
        "staff_id": "uuid-1",
        "staff_name": "María López",
        "role_code": "RM",
        "commissions": {
          "total": 28500.00
        }
      },
      {
        "staff_id": "uuid-2",
        "staff_name": "Carlos Gómez",
        "role_code": "TL",
        "commissions": {
          "total": 18200.00
        }
      }
    ]
  }
}
```

### Ejemplo 4: Ver Jerarquía de Subordinados

**Escenario**: Un supervisor quiere ver su árbol de subordinados

**JavaScript**:
```javascript
async function verMiEquipo(staffId) {
  const response = await fetch(
    `/api/aponnt/staff-commissions/${staffId}/subordinates?maxDepth=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const result = await response.json();

  if (result.success) {
    console.log(`Total subordinados: ${result.data.subordinates_count}`);

    result.data.subordinates.forEach(sub => {
      const indent = '  '.repeat(sub.depth);
      console.log(`${indent}${sub.staff_name} (${sub.role_code}) - Depth: ${sub.depth}`);
    });
  }
}

// Output:
// Total subordinados: 8
//   María López (TL) - Depth: 1
//     Juan Pérez (VE) - Depth: 2
//     Ana García (VE) - Depth: 2
//   Carlos Rodríguez (TL) - Depth: 1
//     ...
```

---

## 🔧 Troubleshooting

### Problema 1: Comisión piramidal retorna 0.00

**Síntomas**:
- El endpoint retorna `pyramid_commission: 0.00` para un supervisor con subordinados
- Las comisiones directas sí aparecen correctamente

**Causa raíz**: El staff tiene `pyramid_commission_percentage_override = 0` en lugar de NULL

**Solución**:
```sql
-- Ver si tiene override en 0
SELECT staff_id, pyramid_commission_percentage_override
FROM aponnt_staff
WHERE staff_id = 'uuid-problematico';

-- Si es 0, ponerlo en NULL para que use el % del rol
UPDATE aponnt_staff
SET pyramid_commission_percentage_override = NULL
WHERE staff_id = 'uuid-problematico';
```

O desde el API:
```javascript
await fetch(`/api/aponnt/staff-commissions/uuid-staff/pyramid-percentage`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ percentage: null }) // null = usar % del rol
});
```

### Problema 2: Función SQL muy lenta con muchos subordinados

**Síntomas**:
- Timeout en queries cuando un CEO tiene 100+ subordinados
- Función `calculate_pyramid_commission()` tarda más de 5 segundos

**Causa raíz**: Falta índice en `reports_to_staff_id` o tabla `companies` muy grande sin filtros

**Solución**:
```sql
-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_aponnt_staff_hierarchy
ON aponnt_staff(reports_to_staff_id);

-- Índice en companies para filtrar por vendedor
CREATE INDEX IF NOT EXISTS idx_companies_vendor
ON companies(assigned_vendor_id)
WHERE assigned_vendor_id IS NOT NULL;

-- Analizar la tabla para optimizar el query planner
ANALYZE aponnt_staff;
ANALYZE companies;
```

### Problema 3: Staff no aparece en ranking

**Síntomas**:
- Un staff tiene comisiones pero no aparece en `/team/ranking`

**Causa raíz**: El staff tiene rol con `role_area != 'ventas'` o `is_active = false`

**Solución**:
```sql
-- Verificar rol y estado
SELECT
  s.staff_id,
  s.is_active,
  r.role_area
FROM aponnt_staff s
INNER JOIN aponnt_staff_roles r ON s.role_id = r.role_id
WHERE s.staff_id = 'uuid-staff';

-- Si role_area no es 'ventas', el staff NO aparece en rankings de ventas
-- Si is_active = false, activar:
UPDATE aponnt_staff SET is_active = true WHERE staff_id = 'uuid-staff';
```

### Issues Conocidos

Ver sección `knownIssues` en `engineering-metadata.js`:

```javascript
knownIssues: [
  "Proyección mensual asume crecimiento lineal, no considera estacionalidad",
  "No hay cache para rankings, se recalcula en cada request (optimizar en futuro)",
  "Falta endpoint para historial de comisiones (ver evolución mensual)"
]
```

---

## 📚 Referencias

### Documentación Relacionada

- `backend/docs/SISTEMA-COMISIONES-PIRAMIDALES.md` - Documentación técnica original
- `backend/engineering-metadata.js` - Metadata del módulo (línea ~2XXX)
- `backend/migrations/20250122_add_commission_fields.sql` - Migración de campos
- `backend/migrations/20250122_commission_functions.sql` - Funciones SQL

### Archivos de Código

- `backend/src/services/StaffCommissionService.js` (450+ líneas)
- `backend/src/routes/staffCommissionsRoutes.js` (290+ líneas)
- `backend/src/models/VendorCommission.js` (modelo Sequelize)

### Links Externos

- [PostgreSQL Recursive Queries](https://www.postgresql.org/docs/current/queries-with.html)
- [Pyramid Compensation Plans](https://en.wikipedia.org/wiki/Multi-level_marketing)

---

## 🔄 Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2025-01-22 | 1.0.0 | Lanzamiento inicial - Sistema completo implementado |
| 2025-01-22 | 1.0.1 | Documentación completa creada siguiendo template estándar |

---

**Autor**: Claude Code
**Última revisión**: 2025-01-22
**Estado**: 100% COMPLETADO ✅
