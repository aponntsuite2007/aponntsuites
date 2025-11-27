/**
 * Script para agregar multiBranchEnabled al modelo Company.js
 * Ejecutar: node scripts/add-multibranch-to-company-model.js
 */

const fs = require('fs');
const path = require('path');

const modelPath = path.join(__dirname, '..', 'src', 'models', 'Company.js');

function updateModel() {
    console.log('📋 Actualizando Company.js con multiBranchEnabled...\n');

    let content = fs.readFileSync(modelPath, 'utf8');

    // Verificar si ya está agregado
    if (content.includes('multiBranchEnabled')) {
        console.log('✅ multiBranchEnabled ya existe en Company.js');
        return;
    }

    // Buscar el patrón donde insertar (antes de metadata)
    const searchPattern = `// Metadata
    metadata: {`;

    const replacement = `// Multi-Branch Feature Flag (Fase MB-1)
    multiBranchEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'multi_branch_enabled',
      comment: 'Feature flag para habilitar funcionalidad multi-sucursal'
    },

    // Metadata
    metadata: {`;

    if (content.includes(searchPattern)) {
        content = content.replace(searchPattern, replacement);
        fs.writeFileSync(modelPath, content, 'utf8');
        console.log('✅ multiBranchEnabled agregado a Company.js exitosamente');
    } else {
        console.log('⚠️ Patrón no encontrado. Buscando alternativa...');

        // Intentar otro patrón
        const altPattern = 'metadata: {';
        const altIndex = content.indexOf(altPattern);

        if (altIndex !== -1) {
            const before = content.substring(0, altIndex);
            const after = content.substring(altIndex);

            const newField = `// Multi-Branch Feature Flag (Fase MB-1)
    multiBranchEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'multi_branch_enabled',
      comment: 'Feature flag para habilitar funcionalidad multi-sucursal'
    },

    `;

            content = before + newField + after;
            fs.writeFileSync(modelPath, content, 'utf8');
            console.log('✅ multiBranchEnabled agregado usando patrón alternativo');
        } else {
            console.log('❌ No se pudo encontrar dónde insertar el campo');
        }
    }
}

updateModel();
