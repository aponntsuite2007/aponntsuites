/**
 * Script para agregar branchScope al modelo User-postgresql.js
 * Ejecutar: node scripts/add-branchscope-to-user-model.js
 */

const fs = require('fs');
const path = require('path');

const modelPath = path.join(__dirname, '..', 'src', 'models', 'User-postgresql.js');

function updateModel() {
    console.log('Actualizando User-postgresql.js con branchScope...\n');

    let content = fs.readFileSync(modelPath, 'utf8');

    // Verificar si ya está agregado
    if (content.includes('branchScope')) {
        console.log('branchScope ya existe en User-postgresql.js');
        return;
    }

    // Buscar el patrón donde insertar (después de defaultBranchId)
    const searchPattern = `defaultBranchId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'default_branch_id',
      references: {
        model: 'branches',
        key: 'id'
      },
      index: true
    },`;

    const replacement = `defaultBranchId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'default_branch_id',
      references: {
        model: 'branches',
        key: 'id'
      },
      index: true
    },
    // Multi-Branch Scope (Fase MB-2)
    branchScope: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      field: 'branch_scope',
      comment: 'Array de branch_ids accesibles. NULL = todas las sucursales (gerente general)'
    },`;

    if (content.includes(searchPattern)) {
        content = content.replace(searchPattern, replacement);
        fs.writeFileSync(modelPath, content, 'utf8');
        console.log('branchScope agregado a User-postgresql.js exitosamente');
    } else {
        console.log('Patron no encontrado. Buscando alternativa...');

        // Buscar un patrón más simple
        const simplePattern = 'index: true\n    },\n    hireDate:';
        const simpleReplacement = `index: true
    },
    // Multi-Branch Scope (Fase MB-2)
    branchScope: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      field: 'branch_scope',
      comment: 'Array de branch_ids accesibles. NULL = todas las sucursales'
    },
    hireDate:`;

        if (content.includes(simplePattern)) {
            content = content.replace(simplePattern, simpleReplacement);
            fs.writeFileSync(modelPath, content, 'utf8');
            console.log('branchScope agregado usando patron alternativo');
        } else {
            console.log('No se pudo encontrar donde insertar el campo');
            console.log('Buscando cualquier "hireDate"...');

            // Último recurso: buscar hireDate y agregar antes
            const hireDateIndex = content.indexOf('hireDate: {');
            if (hireDateIndex !== -1) {
                const before = content.substring(0, hireDateIndex);
                const after = content.substring(hireDateIndex);

                const newField = `// Multi-Branch Scope (Fase MB-2)
    branchScope: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      field: 'branch_scope',
      comment: 'Array de branch_ids accesibles. NULL = todas las sucursales'
    },
    `;

                content = before + newField + after;
                fs.writeFileSync(modelPath, content, 'utf8');
                console.log('branchScope agregado antes de hireDate');
            }
        }
    }
}

updateModel();
