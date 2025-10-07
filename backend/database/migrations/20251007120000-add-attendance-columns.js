'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columnas faltantes a attendances
    await queryInterface.addColumn('attendances', 'date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'checkInMethod', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'manual'
    });

    await queryInterface.addColumn('attendances', 'checkOutMethod', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'workingHours', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'checkInLocation', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'checkOutLocation', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'authorization_status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'authorization_token', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'authorization_requested_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'authorized_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('attendances', 'authorized_by_user_id', {
      type: Sequelize.UUID,
      allowNull: true
    });

    console.log('✅ Migración: Columnas agregadas a attendances');
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback
    await queryInterface.removeColumn('attendances', 'date');
    await queryInterface.removeColumn('attendances', 'checkInMethod');
    await queryInterface.removeColumn('attendances', 'checkOutMethod');
    await queryInterface.removeColumn('attendances', 'workingHours');
    await queryInterface.removeColumn('attendances', 'notes');
    await queryInterface.removeColumn('attendances', 'checkInLocation');
    await queryInterface.removeColumn('attendances', 'checkOutLocation');
    await queryInterface.removeColumn('attendances', 'authorization_status');
    await queryInterface.removeColumn('attendances', 'authorization_token');
    await queryInterface.removeColumn('attendances', 'authorization_requested_at');
    await queryInterface.removeColumn('attendances', 'authorized_at');
    await queryInterface.removeColumn('attendances', 'authorized_by_user_id');
  }
};
