'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columnas faltantes que el modelo Department espera

    // description
    await queryInterface.addColumn('departments', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: ''
    });

    // address
    await queryInterface.addColumn('departments', 'address', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: ''
    });

    // gps_lat
    await queryInterface.addColumn('departments', 'gps_lat', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true
    });

    // gps_lng
    await queryInterface.addColumn('departments', 'gps_lng', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true
    });

    // coverage_radius
    await queryInterface.addColumn('departments', 'coverage_radius', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 50
    });

    // deleted_at (para paranoid/soft delete)
    await queryInterface.addColumn('departments', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    console.log('✅ Migración: Columnas faltantes agregadas a departments');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('departments', 'description');
    await queryInterface.removeColumn('departments', 'address');
    await queryInterface.removeColumn('departments', 'gps_lat');
    await queryInterface.removeColumn('departments', 'gps_lng');
    await queryInterface.removeColumn('departments', 'coverage_radius');
    await queryInterface.removeColumn('departments', 'deleted_at');
  }
};
