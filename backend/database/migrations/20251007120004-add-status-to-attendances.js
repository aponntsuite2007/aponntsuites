'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columna status que es crítica para las queries
    await queryInterface.addColumn('attendances', 'status', {
      type: Sequelize.ENUM('present', 'absent', 'late', 'early_leave', 'pending'),
      allowNull: true,
      defaultValue: 'present'
    });

    console.log('✅ Migración: Columna status agregada a attendances');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('attendances', 'status');
  }
};
