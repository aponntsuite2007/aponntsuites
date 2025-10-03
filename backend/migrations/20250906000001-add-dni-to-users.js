'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Helpers
    const existsTable = async (tableName) => {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :tname) AS exists",
        { replacements: { tname: tableName }, type: Sequelize.QueryTypes.SELECT }
      );
      return rows.exists === true || rows.exists === 't';
    };

    const possibleTables = ['Users', 'users'];
    let targetTable = null;

    for (const t of possibleTables) {
      // Check both original and lowercased variants to be safer
      if (await existsTable(t) || await existsTable(t.toLowerCase())) {
        targetTable = t;
        break;
      }
    }

    if (!targetTable) {
      throw new Error("No se encontró la tabla de usuarios ('Users' o 'users') para agregar la columna dni.");
    }

    const indexName = `${targetTable.toLowerCase()}_dni_unique_idx`;

    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Agregar columna dni (nullable inicialmente para evitar fallos con datos existentes)
      await queryInterface.addColumn(
        targetTable,
        'dni',
        {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'Documento Nacional de Identidad',
        },
        { transaction }
      );

      // Crear índice único sobre dni
      await queryInterface.addIndex(
        targetTable,
        ['dni'],
        {
          name: indexName,
          unique: true,
          transaction,
        }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const existsTable = async (tableName) => {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :tname) AS exists",
        { replacements: { tname: tableName }, type: Sequelize.QueryTypes.SELECT }
      );
      return rows.exists === true || rows.exists === 't';
    };

    const columnExists = async (tableName, columnName) => {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :tname AND column_name = :cname) AS exists",
        { replacements: { tname: tableName, cname: columnName }, type: Sequelize.QueryTypes.SELECT }
      );
      return rows.exists === true || rows.exists === 't';
    };

    const possibleTables = ['Users', 'users'];
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const t of possibleTables) {
        if (await existsTable(t)) {
          const indexName = `${t.toLowerCase()}_dni_unique_idx`;
          // Intentar remover índice si existe
          try {
            await queryInterface.removeIndex(t, indexName, { transaction });
          } catch (_) {
            // Ignorar si no existe
          }

          if (await columnExists(t, 'dni')) {
            await queryInterface.removeColumn(t, 'dni', { transaction });
          }
        }
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};