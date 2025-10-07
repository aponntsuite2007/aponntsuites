# 🔄 Guía de Migraciones Sequelize

## ✅ Sistema AUTOMÁTICO - NO requiere SQL manual

### Cómo funciona:
1. Cada deploy ejecuta `npx sequelize-cli db:migrate` automáticamente
2. Solo se ejecutan las migraciones nuevas (no repetidas)
3. Los datos existentes NO se tocan
4. Si agregás campos/tablas, solo creás una migración

---

## 📝 Crear una nueva migración (Ejemplo: Agregar campo "phone" a companies)

### 1. Generar archivo de migración:
```bash
cd backend
npx sequelize-cli migration:generate --name add-phone-to-companies
```

Esto crea: `database/migrations/20251007123456-add-phone-to-companies.js`

### 2. Editar el archivo generado:
```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('companies', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('companies', 'phone');
  }
};
```

### 3. Commit y push:
```bash
git add database/migrations/
git commit -m "Add phone field to companies"
git push
```

### 4. Deploy automático:
- Render detecta el push
- Ejecuta las migraciones automáticamente
- Campo agregado SIN romper datos existentes

---

## 🔍 Comandos útiles

### Ver estado de migraciones:
```bash
npx sequelize-cli db:migrate:status
```

### Ejecutar migraciones manualmente (local):
```bash
npx sequelize-cli db:migrate
```

### Revertir última migración:
```bash
npx sequelize-cli db:migrate:undo
```

---

## 📋 Ejemplos comunes

### Agregar columna:
```javascript
await queryInterface.addColumn('table_name', 'column_name', {
  type: Sequelize.STRING(100),
  allowNull: false,
  defaultValue: 'default_value'
});
```

### Crear tabla nueva:
```javascript
await queryInterface.createTable('new_table', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  created_at: Sequelize.DATE,
  updated_at: Sequelize.DATE
});
```

### Agregar índice:
```javascript
await queryInterface.addIndex('table_name', ['column_name']);
```

### Agregar foreign key:
```javascript
await queryInterface.addConstraint('users', {
  fields: ['company_id'],
  type: 'foreign key',
  name: 'fk_users_company',
  references: {
    table: 'companies',
    field: 'company_id'
  },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
```

---

## ⚠️ IMPORTANTE

- ✅ **SIEMPRE** incluir `up` (aplicar) y `down` (revertir)
- ✅ **SIEMPRE** testear local antes de push
- ✅ **NUNCA** modificar migraciones ya ejecutadas en producción
- ✅ **NUNCA** borrar archivos de migraciones ejecutadas

---

## 🚀 Ventajas de este sistema

1. **Versionado**: Cada cambio de schema tiene historial (como git)
2. **Automático**: Se ejecuta solo en cada deploy
3. **Seguro**: No toca datos existentes
4. **Rollback**: Podés revertir si algo falla
5. **Multi-entorno**: Funciona igual en local, staging y producción
6. **Sin SQL manual**: No más editar archivos .sql a mano

---

Desarrollado por Pablo & Valentino Rivas 🚀
