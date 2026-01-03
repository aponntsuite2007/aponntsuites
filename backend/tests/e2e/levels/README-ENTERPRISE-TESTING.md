# SYNAPSE Level 3 - Enterprise Testing

Sistema de testing empresarial profundo integrado con SYNAPSE.

## Niveles de Testing

| Level | Nombre | Descripcion | Tiempo |
|-------|--------|-------------|--------|
| 1 | Quick | CRUD basico, UI validation | 5-10 min/modulo |
| 2 | Deep | Business logic, data integrity | 30-60 min total |
| **3** | **Enterprise** | **100K usuarios, stress, chaos** | **2-4 horas** |

## Las 7 Fases de Level 3

### FASE 1: Multi-Tenant Stress
- Genera 100,000+ usuarios en 50+ empresas
- Valida aislamiento entre tenants
- Detecta memory leaks y saturacion de DB

### FASE 2: Concurrent Operations
- 10,000 operaciones CRUD simultaneas
- Mide latencia P50, P95, P99
- Detecta race conditions y deadlocks

### FASE 3: Business Logic
- Valida 100+ reglas de negocio
- Attendance, Vacation, Payroll, Medical
- Detecta violaciones criticas

### FASE 4: Security Attacks
- SQL Injection (8 payloads)
- XSS (8 payloads)
- Authentication/Authorization bypass
- Cross-tenant access

### FASE 5: Data Integrity
- Verificacion de Foreign Keys
- Deteccion de orphan records
- Deteccion de duplicados
- Validacion de checksums

### FASE 6: Performance Degradation
- Test de rampa: 10 -> 500 usuarios
- Mide degradacion de latencia
- Valida conexiones DB y memoria

### FASE 7: Chaos Engineering
- Simulacion de latencia de red
- Presion de memoria
- Sobrecarga de conexiones DB
- Deploy con usuarios activos

## Comandos

```bash
# Ejecutar TODAS las 7 fases (2-4 horas)
npm run synapse:enterprise

# Ejecutar modo rapido (10-15 min)
npm run synapse:enterprise:quick

# Ejecutar fase especifica
npm run synapse:enterprise -- --phase=4  # Solo seguridad

# Ejecutar con configuracion custom
USERS=50000 COMPANIES=25 npm run synapse:enterprise

# Ejecutar tests individuales
npm run test:enterprise:security
npm run test:enterprise:chaos
```

## Criterios de Exito

### MUST HAVE (Obligatorios):
- 0 vulnerabilidades criticas de seguridad
- 0 violaciones de FK
- 0 violaciones de reglas de negocio criticas
- Sistema se recupera de fallos en < 60 segundos
- Latencia P95 < 2000ms con 100K usuarios

### NICE TO HAVE (Deseables):
- Latencia P95 < 500ms con carga normal
- Error rate < 0.5%
- Memory usage < 2 GB
- 0 memory leaks

## Tablas de BD

Las 7 fases guardan resultados en PostgreSQL:

```sql
-- Batches de testing
e2e_enterprise_test_batches

-- Fase 1: Usuarios generados
e2e_stress_test_users

-- Fase 2: Metricas de performance
e2e_performance_metrics

-- Fase 3: Violaciones de reglas
e2e_business_rules_violations

-- Fase 4: Vulnerabilidades
e2e_security_vulnerabilities

-- Fase 5: Problemas de integridad
e2e_data_integrity_issues

-- Fase 6: Degradacion de performance
e2e_performance_degradation

-- Fase 7: Escenarios de chaos
e2e_chaos_scenarios
```

## Estructura de Archivos

```
tests/e2e/
├── levels/
│   ├── level3-phase1-multitenant-stress.spec.js
│   ├── level3-phase2-concurrent-ops.spec.js
│   ├── level3-phase3-business-logic.spec.js
│   ├── level3-phase4-security.spec.js
│   ├── level3-phase5-data-integrity.spec.js
│   ├── level3-phase6-performance.spec.js
│   ├── level3-phase7-chaos.spec.js
│   ├── run-enterprise-phases.js
│   └── README-ENTERPRISE-TESTING.md
├── helpers/
│   ├── enterprise-bulk.helper.js
│   ├── concurrent-runner.helper.js
│   └── chaos-simulator.helper.js
└── configs/
    └── (configs de Level 1 - SYNAPSE basico)
```

## Integracion con SYNAPSE

Este sistema es **Level 3** de SYNAPSE:

- **Level 1** (Quick): `npm run synapse:intelligent` - Testing basico de UI
- **Level 2** (Deep): Business logic + security basico (TODO)
- **Level 3** (Enterprise): Este sistema - testing empresarial completo

## Dependencias

```bash
npm install --save-dev @faker-js/faker pg-promise autocannon
```

## Migracion

```bash
# Ejecutar migracion de tablas
psql -U postgres -d attendance_system -f migrations/20251231_create_synapse_enterprise_testing.sql
```

---

**Fecha**: 2025-12-31
**Version**: 1.0.0
**Integrado con**: SYNAPSE E2E Testing System
