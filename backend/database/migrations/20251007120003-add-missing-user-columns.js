'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columnas faltantes que userRoutes.js requiere

    // Columnas básicas de usuario
    await queryInterface.addColumn('users', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true
    });

    await queryInterface.addColumn('users', 'departmentId', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      }
    });

    await queryInterface.addColumn('users', 'position', {
      type: Sequelize.STRING(100),
      allowNull: true
    });

    await queryInterface.addColumn('users', 'hireDate', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    // Permisos de autorización de llegadas tardías
    await queryInterface.addColumn('users', 'can_authorize_late_arrivals', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('users', 'authorized_departments', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: '[]'
    });

    await queryInterface.addColumn('users', 'notification_preference_late_arrivals', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: 'email'
    });

    // Permisos de dispositivos
    await queryInterface.addColumn('users', 'can_use_mobile_app', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.addColumn('users', 'can_use_kiosk', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.addColumn('users', 'can_use_all_kiosks', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('users', 'authorized_kiosks', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: '[]'
    });

    // Horarios flexibles
    await queryInterface.addColumn('users', 'has_flexible_schedule', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('users', 'flexible_schedule_notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Datos biométricos
    await queryInterface.addColumn('users', 'hasFingerprint', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('users', 'hasFacialData', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    console.log('✅ Migración: Columnas faltantes agregadas a users');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'phone');
    await queryInterface.removeColumn('users', 'departmentId');
    await queryInterface.removeColumn('users', 'position');
    await queryInterface.removeColumn('users', 'hireDate');
    await queryInterface.removeColumn('users', 'can_authorize_late_arrivals');
    await queryInterface.removeColumn('users', 'authorized_departments');
    await queryInterface.removeColumn('users', 'notification_preference_late_arrivals');
    await queryInterface.removeColumn('users', 'can_use_mobile_app');
    await queryInterface.removeColumn('users', 'can_use_kiosk');
    await queryInterface.removeColumn('users', 'can_use_all_kiosks');
    await queryInterface.removeColumn('users', 'authorized_kiosks');
    await queryInterface.removeColumn('users', 'has_flexible_schedule');
    await queryInterface.removeColumn('users', 'flexible_schedule_notes');
    await queryInterface.removeColumn('users', 'hasFingerprint');
    await queryInterface.removeColumn('users', 'hasFacialData');
  }
};
