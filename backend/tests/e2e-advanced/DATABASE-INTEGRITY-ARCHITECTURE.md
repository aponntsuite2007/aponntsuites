# DATABASE INTEGRITY & TRANSACTIONS TESTS - Arquitectura Completa

## 🎯 OBJETIVO

Sistema de pruebas de integridad de base de datos que valida:
- **ACID Compliance** - Atomicidad, Consistencia, Aislamiento, Durabilidad
- **Referential Integrity** - Foreign keys, cascades, constraints
- **Transaction Rollbacks** - Manejo correcto de errores
- **Deadlock Detection** - Detección y resolución de deadlocks
- **Data Consistency** - No orphan records, no duplicate data
- **Auto-healing** cuando se detectan inconsistencias

## 🗄️ PRUEBAS DE INTEGRIDAD

### 1. ACID Compliance Tests

#### A - Atomicity (Atomicidad)
**Qué testear:**
- Transacción con múltiples operaciones: TODO o NADA
- Si una operación falla, TODAS se revierten

**Escenario:**
```javascript
// Crear usuario + departamento + asignación
// Si falla la asignación → usuario y departamento NO deben crearse
```

**Test:**
```javascript
test('Atomicity: Transaction rollback en error', async () => {
  const t = await db.sequelize.transaction();

  try {
    // 1. Crear usuario
    const user = await db.users.create({
      email: 'test@test.com',
      password: 'Test123!',
      company_id: 11
    }, { transaction: t });

    expect(user).to.have.property('id');
    const userId = user.id;

    // 2. Crear departamento
    const department = await db.departments.create({
      name: 'IT',
      company_id: 11
    }, { transaction: t });

    expect(department).to.have.property('id');
    const deptId = department.id;

    // 3. Asignación (FORZAR ERROR - department_id inválido)
    await db.user_departments.create({
      user_id: userId,
      department_id: 99999 // ← NO existe
    }, { transaction: t });

    await t.commit(); // No debería llegar aquí

  } catch (error) {
    await t.rollback(); // ← ROLLBACK

    // Verificar que usuario y departamento NO existen en BD
    const userExists = await db.users.findOne({ where: { email: 'test@test.com' } });
    const deptExists = await db.departments.findOne({ where: { name: 'IT' } });

    expect(userExists).to.be.null; // ✅ Rollback exitoso
    expect(deptExists).to.be.null; // ✅ Rollback exitoso
  }
});
```

**Test alternativo: Sin transaction (comportamiento incorrecto)**
```javascript
test('Sin transaction: Datos inconsistentes quedan en BD', async () => {
  try {
    // SIN TRANSACTION
    const user = await db.users.create({
      email: 'orphan@test.com',
      password: 'Test123!',
      company_id: 11
    });

    const userId = user.id;

    // Error al crear asignación
    await db.user_departments.create({
      user_id: userId,
      department_id: 99999 // ← Error
    });

  } catch (error) {
    // Usuario queda HUÉRFANO en BD (inconsistencia)
    const orphanUser = await db.users.findOne({ where: { email: 'orphan@test.com' } });

    expect(orphanUser).to.not.be.null; // ❌ Usuario existe (huérfano!)
    expect(orphanUser.id).to.be.a('number');

    // Cleanup
    await orphanUser.destroy();
  }
});
```

---

#### C - Consistency (Consistencia)
**Qué testear:**
- Constraints (NOT NULL, UNIQUE, CHECK)
- Foreign keys válidos
- Validaciones de negocio (ej: checkOut > checkIn)

**Test:**
```javascript
test('Consistency: NOT NULL constraint', async () => {
  try {
    await db.users.create({
      email: null, // ← Viola NOT NULL
      password: 'Test123!',
      company_id: 11
    });

    throw new Error('Should have thrown NotNullViolation');
  } catch (error) {
    expect(error.name).to.equal('SequelizeValidationError');
    expect(error.message).to.include('notNull Violation');
  }
});

test('Consistency: UNIQUE constraint', async () => {
  // 1. Crear usuario
  await db.users.create({
    email: 'unique@test.com',
    password: 'Test123!',
    company_id: 11
  });

  // 2. Intentar crear duplicado
  try {
    await db.users.create({
      email: 'unique@test.com', // ← DUPLICADO
      password: 'Test123!',
      company_id: 11
    });

    throw new Error('Should have thrown UniqueConstraintError');
  } catch (error) {
    expect(error.name).to.equal('SequelizeUniqueConstraintError');
  } finally {
    await db.users.destroy({ where: { email: 'unique@test.com' } });
  }
});

test('Consistency: CHECK constraint (business logic)', async () => {
  // checkOutTime DEBE ser mayor que checkInTime
  try {
    await db.attendances.create({
      id: uuidv4(),
      user_id: 1,
      company_id: 11,
      date: '2025-12-25',
      checkInTime: '09:00:00',
      checkOutTime: '08:00:00', // ← ANTES del checkIn!
      status: 'present'
    });

    throw new Error('Should have thrown CHECK constraint violation');
  } catch (error) {
    expect(error.message).to.include('check constraint');
  }
});
```

---

#### I - Isolation (Aislamiento)
**Qué testear:**
- Read Committed (transacción A no ve cambios no commiteados de B)
- Repeatable Read (misma query retorna mismos datos)
- Serializable (transacciones ejecutadas en serie)

**Test: Read Committed**
```javascript
test('Isolation: Read Committed - no ver uncommitted changes', async () => {
  const t1 = await db.sequelize.transaction();
  const t2 = await db.sequelize.transaction();

  try {
    // T1: Crear usuario (sin commit)
    await db.users.create({
      email: 'uncommitted@test.com',
      password: 'Test123!',
      company_id: 11
    }, { transaction: t1 });

    // T2: Intentar leer usuario
    const user = await db.users.findOne({
      where: { email: 'uncommitted@test.com' }
    }, { transaction: t2 });

    // NO debe ver el usuario (no commiteado aún)
    expect(user).to.be.null;

    // T1: Commit
    await t1.commit();

    // T2: Ahora SÍ debe verlo
    const userAfterCommit = await db.users.findOne({
      where: { email: 'uncommitted@test.com' }
    }, { transaction: t2 });

    expect(userAfterCommit).to.not.be.null;

    await t2.commit();

    // Cleanup
    await db.users.destroy({ where: { email: 'uncommitted@test.com' } });

  } catch (error) {
    await t1.rollback();
    await t2.rollback();
    throw error;
  }
});
```

**Test: Repeatable Read**
```javascript
test('Isolation: Repeatable Read', async () => {
  // Configurar isolation level
  await db.sequelize.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');

  const t = await db.sequelize.transaction();

  try {
    // 1. Leer usuarios (snapshot)
    const users1 = await db.users.findAll({
      where: { company_id: 11 }
    }, { transaction: t });

    const count1 = users1.length;

    // 2. Otra transacción inserta un usuario nuevo (y commitea)
    await db.users.create({
      email: 'new-user@test.com',
      password: 'Test123!',
      company_id: 11
    });

    // 3. Leer usuarios OTRA VEZ en misma transacción
    const users2 = await db.users.findAll({
      where: { company_id: 11 }
    }, { transaction: t });

    const count2 = users2.length;

    // Debe retornar MISMO count (Repeatable Read)
    expect(count2).to.equal(count1);

    await t.commit();

    // Cleanup
    await db.users.destroy({ where: { email: 'new-user@test.com' } });

  } catch (error) {
    await t.rollback();
    throw error;
  }
});
```

---

#### D - Durability (Durabilidad)
**Qué testear:**
- Datos commiteados sobreviven a crashes
- Write-ahead logging (WAL) funcional
- Checkpoints y recovery

**Test: Simular crash y recovery**
```javascript
test('Durability: Committed data survives restart', async () => {
  // 1. Crear usuario y commitear
  const user = await db.users.create({
    email: 'durable@test.com',
    password: 'Test123!',
    company_id: 11
  });

  const userId = user.id;

  // 2. Simular "crash" (cerrar conexión)
  await db.sequelize.close();

  // 3. Reconectar
  await db.sequelize.authenticate();

  // 4. Verificar que usuario existe
  const recoveredUser = await db.users.findByPk(userId);

  expect(recoveredUser).to.not.be.null;
  expect(recoveredUser.email).to.equal('durable@test.com');

  // Cleanup
  await recoveredUser.destroy();
});
```

---

### 2. REFERENTIAL INTEGRITY TESTS

#### Foreign Keys
**Qué testear:**
- No se puede insertar con FK inválido
- No se puede borrar parent si hay children (sin CASCADE)
- CASCADE DELETE funciona correctamente
- CASCADE UPDATE funciona correctamente

**Test: FK constraint violation**
```javascript
test('Referential Integrity: Cannot insert invalid FK', async () => {
  try {
    await db.attendances.create({
      id: uuidv4(),
      user_id: 99999, // ← NO existe
      company_id: 11,
      date: '2025-12-25',
      checkInTime: '08:00:00',
      status: 'present'
    });

    throw new Error('Should have thrown ForeignKeyConstraintError');
  } catch (error) {
    expect(error.name).to.equal('SequelizeForeignKeyConstraintError');
  }
});
```

**Test: Cannot delete parent with children**
```javascript
test('Referential Integrity: Cannot delete user with attendances', async () => {
  // 1. Crear usuario
  const user = await db.users.create({
    email: 'parent@test.com',
    password: 'Test123!',
    company_id: 11
  });

  const userId = user.id;

  // 2. Crear attendance (child)
  await db.attendances.create({
    id: uuidv4(),
    user_id: userId,
    company_id: 11,
    date: '2025-12-25',
    checkInTime: '08:00:00',
    status: 'present'
  });

  // 3. Intentar borrar usuario (tiene child)
  try {
    await user.destroy();
    throw new Error('Should have thrown ForeignKeyConstraintError');
  } catch (error) {
    expect(error.name).to.equal('SequelizeForeignKeyConstraintError');
    expect(error.message).to.include('violates foreign key constraint');
  } finally {
    // Cleanup: borrar child primero, luego parent
    await db.attendances.destroy({ where: { user_id: userId } });
    await db.users.destroy({ where: { id: userId } });
  }
});
```

**Test: CASCADE DELETE**
```javascript
test('Referential Integrity: CASCADE DELETE works', async () => {
  // Asumiendo que departments → users tiene ON DELETE CASCADE

  // 1. Crear departamento
  const dept = await db.departments.create({
    name: 'Temp Dept',
    company_id: 11
  });

  const deptId = dept.id;

  // 2. Crear usuario en departamento
  const user = await db.users.create({
    email: 'cascade@test.com',
    password: 'Test123!',
    company_id: 11,
    department_id: deptId
  });

  const userId = user.id;

  // 3. Borrar departamento
  await dept.destroy();

  // 4. Verificar que usuario también fue borrado (CASCADE)
  const orphanUser = await db.users.findByPk(userId);

  expect(orphanUser).to.be.null; // ✅ CASCADE funcionó
});
```

---

### 3. DEADLOCK DETECTION TESTS

**Qué es un deadlock:**
```
Transaction 1: LOCK row A → espera LOCK row B
Transaction 2: LOCK row B → espera LOCK row A
↑ DEADLOCK (ambas esperando infinitamente)
```

**Test: Detectar deadlock**
```javascript
test('Deadlock Detection', async () => {
  const t1 = await db.sequelize.transaction();
  const t2 = await db.sequelize.transaction();

  try {
    // T1: Lock usuario ID 1
    const user1_t1 = await db.users.findByPk(1, {
      lock: t1.LOCK.UPDATE,
      transaction: t1
    });

    // T2: Lock usuario ID 2
    const user2_t2 = await db.users.findByPk(2, {
      lock: t2.LOCK.UPDATE,
      transaction: t2
    });

    // T1: Intentar lock usuario ID 2 (esperará a T2)
    const user2_t1_promise = db.users.findByPk(2, {
      lock: t1.LOCK.UPDATE,
      transaction: t1
    });

    // T2: Intentar lock usuario ID 1 (esperará a T1) → DEADLOCK!
    const user1_t2_promise = db.users.findByPk(1, {
      lock: t2.LOCK.UPDATE,
      transaction: t2
    });

    // PostgreSQL detecta deadlock automáticamente y aborta una transacción
    await Promise.race([
      user2_t1_promise,
      user1_t2_promise
    ]);

  } catch (error) {
    expect(error.message).to.include('deadlock detected');
  } finally {
    await t1.rollback();
    await t2.rollback();
  }
});
```

**Auto-healing: Retry con exponential backoff**
```javascript
async function executeWithDeadlockRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.message.includes('deadlock') && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
        console.log(`Deadlock detected. Retry ${attempt}/${maxRetries} in ${delay}ms`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
}
```

---

### 4. ORPHAN RECORDS DETECTION

**Qué testear:**
- Registros sin parent (ej: attendance con user_id que no existe)
- Soft deletes que rompen relaciones
- Cascades mal configurados

**Test: Detectar orphan records**
```javascript
test('Detect orphan attendances (user_id no existe)', async () => {
  // Query para detectar orphans
  const orphans = await db.sequelize.query(`
    SELECT a.id, a.user_id
    FROM attendances a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE u.id IS NULL
  `, { type: db.sequelize.QueryTypes.SELECT });

  console.log(`Orphan attendances found: ${orphans.length}`);

  // NO debe haber orphans
  expect(orphans.length).to.equal(0);

  // Si hay orphans, auto-healing:
  if (orphans.length > 0) {
    for (const orphan of orphans) {
      console.log(`Deleting orphan attendance: ${orphan.id}`);
      await db.attendances.destroy({ where: { id: orphan.id } });
    }
  }
});
```

**Test: Detectar orphans en TODAS las tablas**
```javascript
test('Full database orphan scan', async () => {
  const orphanQueries = {
    attendances: `
      SELECT a.id FROM attendances a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE u.id IS NULL
    `,
    user_departments: `
      SELECT ud.id FROM user_departments ud
      LEFT JOIN users u ON ud.user_id = u.id
      WHERE u.id IS NULL
    `,
    medical_leaves: `
      SELECT ml.id FROM medical_leaves ml
      LEFT JOIN users u ON ml.user_id = u.id
      WHERE u.id IS NULL
    `
    // ... más tablas
  };

  const orphansFound = {};

  for (const [table, query] of Object.entries(orphanQueries)) {
    const orphans = await db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT });
    orphansFound[table] = orphans.length;

    if (orphans.length > 0) {
      console.log(`❌ ${table}: ${orphans.length} orphans`);
    } else {
      console.log(`✅ ${table}: 0 orphans`);
    }
  }

  // Validar que NO hay orphans en ninguna tabla
  expect(Object.values(orphansFound).every(count => count === 0)).to.be.true;
});
```

---

### 5. DATA CONSISTENCY CHECKS

**Qué testear:**
- Totales calculados vs totales reales
- Checksums de datos críticos
- Duplicados donde no debería haber
- Timestamps lógicos (updated_at >= created_at)

**Test: Attendance totals consistency**
```javascript
test('Attendance totals consistency', async () => {
  // 1. Calcular total desde attendances
  const attendanceCount = await db.attendances.count({ where: { company_id: 11 } });

  // 2. Obtener total desde tabla summary (si existe)
  const summary = await db.company_stats.findOne({ where: { company_id: 11 } });

  // 3. Validar que coincidan
  if (summary) {
    expect(summary.total_attendances).to.equal(attendanceCount);
  }
});
```

**Test: Timestamps lógicos**
```javascript
test('Timestamps: updated_at >= created_at', async () => {
  const invalidTimestamps = await db.sequelize.query(`
    SELECT id, created_at, updated_at
    FROM users
    WHERE updated_at < created_at
  `, { type: db.sequelize.QueryTypes.SELECT });

  expect(invalidTimestamps.length).to.equal(0);
});
```

**Test: No duplicados en campos UNIQUE**
```javascript
test('No duplicate emails in users', async () => {
  const duplicates = await db.sequelize.query(`
    SELECT email, COUNT(*) as count
    FROM users
    GROUP BY email
    HAVING COUNT(*) > 1
  `, { type: db.sequelize.QueryTypes.SELECT });

  expect(duplicates.length).to.equal(0);
});
```

---

## 📊 ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│           DATABASE INTEGRITY ORCHESTRATOR                    │
│  (backend/tests/e2e-advanced/db/DBIntegrityOrchestrator.js)  │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─► 1. ACID COMPLIANCE TESTERS
             │   ├─ AtomicityTester.js (transaction rollbacks)
             │   ├─ ConsistencyTester.js (constraints, validations)
             │   ├─ IsolationTester.js (read committed, repeatable read)
             │   └─ DurabilityTester.js (crash recovery)
             │
             ├─► 2. REFERENTIAL INTEGRITY TESTERS
             │   ├─ ForeignKeyTester.js (FK constraints)
             │   ├─ CascadeTester.js (CASCADE DELETE/UPDATE)
             │   └─ OrphanDetector.js (registros huérfanos)
             │
             ├─► 3. DEADLOCK DETECTOR
             │   ├─ SimulateDeadlocks.js
             │   ├─ DeadlockRecovery.js (retry logic)
             │   └─ LockTimeout.js (configuración timeouts)
             │
             ├─► 4. DATA CONSISTENCY VALIDATOR
             │   ├─ TotalsValidator.js (sumas, counts)
             │   ├─ TimestampValidator.js (lógica temporal)
             │   ├─ DuplicateDetector.js (UNIQUE violations)
             │   └─ ChecksumValidator.js (integridad de datos)
             │
             ├─► 5. REAL-TIME DB MONITOR
             │   ├─ Dashboard con métricas PostgreSQL
             │   ├─ Active queries, locks, deadlocks
             │   ├─ Connection pool status
             │   └─ Transaction throughput
             │
             └─► 6. AUTO-HEALING ENGINE
                 ├─ Detecta orphan records → DELETE
                 ├─ Detecta duplicados → MERGE
                 ├─ Detecta deadlock → RETRY con backoff
                 ├─ Detecta constraint violation → LOG + FIX
                 └─ Re-ejecuta validación

```

## 🗄️ DATABASE SCHEMA

```sql
-- Tabla de auditoría de integridad
CREATE TABLE db_integrity_logs (
  id BIGSERIAL PRIMARY KEY,
  test_run_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Test context
  test_category VARCHAR(50), -- 'acid', 'referential', 'deadlock', 'consistency'
  test_name VARCHAR(100),

  -- Results
  status VARCHAR(20), -- 'passed', 'failed', 'integrity_violation'
  violation_type VARCHAR(100), -- 'orphan_record', 'duplicate', 'timestamp_invalid', etc.
  violation_details JSONB,

  -- Affected records
  table_name VARCHAR(100),
  affected_records INTEGER DEFAULT 0,
  sample_records JSONB, -- Muestra de registros afectados

  -- Severity
  severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'

  -- Auto-fix
  auto_fix_applied BOOLEAN DEFAULT false,
  fix_query TEXT, -- SQL ejecutado para corregir
  fix_result TEXT,

  INDEX idx_test_run (test_run_id),
  INDEX idx_status (status),
  INDEX idx_table (table_name)
);

-- Tabla de métricas de transacciones
CREATE TABLE transaction_metrics (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Transaction stats
  total_transactions BIGINT,
  committed_transactions BIGINT,
  rolled_back_transactions BIGINT,
  active_transactions INTEGER,

  -- Deadlock stats
  deadlocks_detected INTEGER DEFAULT 0,
  deadlock_rate DECIMAL(5,2), -- deadlocks / total transactions

  -- Lock stats
  total_locks INTEGER,
  lock_waits INTEGER,
  avg_lock_wait_time_ms INTEGER,

  -- Connection pool
  active_connections INTEGER,
  idle_connections INTEGER,
  max_connections INTEGER,
  connection_utilization DECIMAL(5,2) -- %
);

-- Tabla de orphan records detectados
CREATE TABLE orphan_records_log (
  id BIGSERIAL PRIMARY KEY,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  table_name VARCHAR(100),
  record_id VARCHAR(100),
  parent_table VARCHAR(100),
  parent_id VARCHAR(100),
  auto_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);
```

## 🚀 DATABASE INTEGRITY TEST SCENARIOS

### Scenario 1: ACID Full Test Suite
```javascript
describe('ACID Compliance', () => {
  test('Atomicity: Multi-step transaction rollback', async () => {
    const t = await db.sequelize.transaction();

    try {
      // Paso 1: Crear 10 usuarios
      for (let i = 0; i < 10; i++) {
        await db.users.create({
          email: `user${i}@test.com`,
          password: 'Test123!',
          company_id: 11
        }, { transaction: t });
      }

      // Paso 2: Crear departamento
      const dept = await db.departments.create({
        name: 'Test Dept',
        company_id: 11
      }, { transaction: t });

      // Paso 3: Asignar usuarios al departamento
      for (let i = 0; i < 10; i++) {
        const user = await db.users.findOne({
          where: { email: `user${i}@test.com` }
        }, { transaction: t });

        await db.user_departments.create({
          user_id: user.id,
          department_id: dept.id
        }, { transaction: t });
      }

      // Paso 4: FORZAR ERROR
      throw new Error('Simulated error');

      await t.commit(); // No llega aquí

    } catch (error) {
      await t.rollback();

      // Verificar que NADA quedó en BD
      for (let i = 0; i < 10; i++) {
        const user = await db.users.findOne({ where: { email: `user${i}@test.com` } });
        expect(user).to.be.null;
      }

      const dept = await db.departments.findOne({ where: { name: 'Test Dept' } });
      expect(dept).to.be.null;
    }
  });
});
```

### Scenario 2: Deadlock Stress Test
```javascript
test('Deadlock stress test - 100 concurrent transactions', async () => {
  const transactions = Array(100).fill().map(async (_, i) => {
    const t = await db.sequelize.transaction();

    try {
      // Cada transacción intenta actualizar 2 usuarios en orden aleatorio
      const userId1 = Math.floor(Math.random() * 50) + 1;
      const userId2 = Math.floor(Math.random() * 50) + 1;

      await db.users.update(
        { last_login: new Date() },
        { where: { id: userId1 }, transaction: t, lock: t.LOCK.UPDATE }
      );

      await sleep(Math.random() * 100); // Simular processing

      await db.users.update(
        { last_login: new Date() },
        { where: { id: userId2 }, transaction: t, lock: t.LOCK.UPDATE }
      );

      await t.commit();
      return { success: true, attempt: i };

    } catch (error) {
      await t.rollback();

      if (error.message.includes('deadlock')) {
        console.log(`Deadlock detected in transaction ${i}`);
        return { success: false, deadlock: true, attempt: i };
      }

      throw error;
    }
  });

  const results = await Promise.allSettled(transactions);

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const deadlocks = results.filter(r => r.status === 'fulfilled' && r.value.deadlock).length;

  console.log(`Successful: ${successful}, Deadlocks: ${deadlocks}`);

  // Al menos 80% deberían tener éxito
  expect(successful / 100).to.be.greaterThan(0.8);
});
```

### Scenario 3: Full Database Integrity Scan
```javascript
test('Full database integrity scan', async () => {
  const issues = {
    orphans: {},
    duplicates: {},
    invalidTimestamps: {},
    violatedConstraints: {}
  };

  // 1. Scan orphans en TODAS las relaciones FK
  const fkRelations = [
    { child: 'attendances', parent: 'users', fk: 'user_id' },
    { child: 'medical_leaves', parent: 'users', fk: 'user_id' },
    { child: 'user_departments', parent: 'users', fk: 'user_id' },
    { child: 'user_departments', parent: 'departments', fk: 'department_id' }
    // ... todas las FKs
  ];

  for (const rel of fkRelations) {
    const orphans = await db.sequelize.query(`
      SELECT c.id
      FROM ${rel.child} c
      LEFT JOIN ${rel.parent} p ON c.${rel.fk} = p.id
      WHERE p.id IS NULL
    `, { type: db.sequelize.QueryTypes.SELECT });

    issues.orphans[`${rel.child}.${rel.fk}`] = orphans.length;
  }

  // 2. Scan duplicados en campos UNIQUE
  const uniqueFields = [
    { table: 'users', field: 'email' },
    { table: 'companies', field: 'slug' },
    { table: 'departments', field: 'name' }
  ];

  for (const uf of uniqueFields) {
    const duplicates = await db.sequelize.query(`
      SELECT ${uf.field}, COUNT(*) as count
      FROM ${uf.table}
      GROUP BY ${uf.field}
      HAVING COUNT(*) > 1
    `, { type: db.sequelize.QueryTypes.SELECT });

    issues.duplicates[`${uf.table}.${uf.field}`] = duplicates.length;
  }

  // 3. Scan timestamps inválidos
  const tables = ['users', 'companies', 'attendances', 'departments'];
  for (const table of tables) {
    const invalid = await db.sequelize.query(`
      SELECT id FROM ${table}
      WHERE updated_at < created_at
    `, { type: db.sequelize.QueryTypes.SELECT });

    issues.invalidTimestamps[table] = invalid.length;
  }

  // 4. Generar reporte
  console.log('DATABASE INTEGRITY REPORT:');
  console.log(JSON.stringify(issues, null, 2));

  // Validar que NO hay problemas
  expect(Object.values(issues.orphans).every(c => c === 0)).to.be.true;
  expect(Object.values(issues.duplicates).every(c => c === 0)).to.be.true;
  expect(Object.values(issues.invalidTimestamps).every(c => c === 0)).to.be.true;
});
```

## 🔄 AUTO-HEALING WORKFLOW

```javascript
class DatabaseAutoHealer {
  async healOrphans(table, parentTable, fk) {
    // 1. Detectar orphans
    const orphans = await db.sequelize.query(`
      SELECT c.id FROM ${table} c
      LEFT JOIN ${parentTable} p ON c.${fk} = p.id
      WHERE p.id IS NULL
    `, { type: db.sequelize.QueryTypes.SELECT });

    if (orphans.length === 0) {
      return { healed: 0, message: 'No orphans detected' };
    }

    // 2. Backup de registros orphan (antes de borrar)
    await db.orphan_records_log.bulkCreate(
      orphans.map(o => ({
        table_name: table,
        record_id: o.id.toString(),
        parent_table: parentTable,
        parent_id: null
      }))
    );

    // 3. DELETE orphans
    const orphanIds = orphans.map(o => o.id);
    const deleted = await db[table].destroy({
      where: { id: orphanIds }
    });

    // 4. Log acción
    console.log(`🔧 Auto-healed ${deleted} orphan records in ${table}`);

    return { healed: deleted, orphanIds };
  }

  async healDuplicates(table, field) {
    // 1. Detectar duplicados
    const duplicates = await db.sequelize.query(`
      SELECT ${field}, COUNT(*) as count, ARRAY_AGG(id) as ids
      FROM ${table}
      GROUP BY ${field}
      HAVING COUNT(*) > 1
    `, { type: db.sequelize.QueryTypes.SELECT });

    if (duplicates.length === 0) {
      return { healed: 0, message: 'No duplicates detected' };
    }

    let mergedCount = 0;

    for (const dup of duplicates) {
      // 2. Estrategia: Mantener el más antiguo, borrar el resto
      const ids = dup.ids;
      const keepId = ids[0]; // Primer ID (más antiguo)
      const deleteIds = ids.slice(1);

      // 3. TODO: Aquí podrías MERGE relaciones (ej: mover attendances al keepId)

      // 4. DELETE duplicados
      await db[table].destroy({ where: { id: deleteIds } });

      mergedCount += deleteIds.length;
    }

    console.log(`🔧 Auto-healed ${mergedCount} duplicate records in ${table}.${field}`);

    return { healed: mergedCount };
  }

  async healInvalidTimestamps(table) {
    // Corregir updated_at < created_at
    const result = await db.sequelize.query(`
      UPDATE ${table}
      SET updated_at = created_at
      WHERE updated_at < created_at
    `);

    const healed = result[1]; // rowCount

    if (healed > 0) {
      console.log(`🔧 Auto-healed ${healed} invalid timestamps in ${table}`);
    }

    return { healed };
  }
}
```

## 🎯 SUCCESS CRITERIA

| Métrica | Target | Descripción |
|---------|--------|-------------|
| ACID Compliance | 100% | Todas las transacciones ACID-compliant |
| Orphan Records | 0 | 0 registros huérfanos en toda la BD |
| FK Violations | 0 | Todas las FKs válidas |
| Duplicate Records | 0 | No duplicados en campos UNIQUE |
| Invalid Timestamps | 0 | updated_at >= created_at siempre |
| Deadlock Rate | <0.1% | <1 deadlock por cada 1000 transactions |
| Transaction Success | >99% | >99% de transactions commitean exitosamente |

## 🚀 NEXT STEPS

1. ✅ Crear DBIntegrityOrchestrator.js
2. ✅ Implementar 4 testers ACID
3. ✅ Implementar ForeignKeyTester, CascadeTester
4. ✅ Implementar DeadlockDetector
5. ✅ Implementar OrphanDetector (full scan)
6. ✅ Crear tablas de logs de integridad
7. ✅ Crear dashboard de métricas DB real-time
8. ✅ Implementar Auto-Healing Engine
9. ✅ Integrar con e2e-testing-advanced
10. ✅ Ejecutar primer integrity scan completo

**ESTIMACIÓN**: 3-4 días de desarrollo + 1 día de tuning
