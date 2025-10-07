'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columnas faltantes a departments
    await queryInterface.addColumn('departments', 'manager_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    });

    await queryInterface.addColumn('departments', 'budget', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    });

    console.log('✅ Migración: Columnas agregadas a departments');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('departments', 'manager_id');
    await queryInterface.removeColumn('departments', 'budget');
  }
};
