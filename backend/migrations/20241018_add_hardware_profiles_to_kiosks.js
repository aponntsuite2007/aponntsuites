/**
 * 🔧 MIGRACIÓN: Agregar Hardware Profiles a Kiosks
 * =================================================
 * Fecha: 2024-10-18
 * Descripción: Agrega campos para almacenar perfiles de hardware
 *              (facial recognition + fingerprint readers)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kiosks', 'hardware_profile', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Tipo de hardware seleccionado (ej: ipad_pro_m2, samsung_tab_s9, etc.)'
    });

    await queryInterface.addColumn('kiosks', 'hardware_category', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Categoría del hardware (enterprise, tablet_high, phone_high, etc.)'
    });

    await queryInterface.addColumn('kiosks', 'detection_method_facial', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Método de detección facial (Core ML, ML Kit, TensorRT, etc.)'
    });

    await queryInterface.addColumn('kiosks', 'detection_method_fingerprint', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Lector de huellas seleccionado (ej: suprema_biomini, zkteco_sl10, etc.)'
    });

    await queryInterface.addColumn('kiosks', 'performance_score', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Score de performance del hardware (0-100)'
    });

    await queryInterface.addColumn('kiosks', 'supports_walkthrough', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Soporta walk-through (detección en movimiento)'
    });

    await queryInterface.addColumn('kiosks', 'supports_liveness', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Soporta liveness detection (anti-spoofing)'
    });

    await queryInterface.addColumn('kiosks', 'biometric_modes', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Modos biométricos habilitados: ["facial", "fingerprint", "iris", "palm"]'
    });

    await queryInterface.addColumn('kiosks', 'hardware_specs', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Especificaciones detalladas del hardware (JSON)'
    });

    console.log('✅ [MIGRATION] Campos de hardware agregados a tabla kiosks');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('kiosks', 'hardware_profile');
    await queryInterface.removeColumn('kiosks', 'hardware_category');
    await queryInterface.removeColumn('kiosks', 'detection_method_facial');
    await queryInterface.removeColumn('kiosks', 'detection_method_fingerprint');
    await queryInterface.removeColumn('kiosks', 'performance_score');
    await queryInterface.removeColumn('kiosks', 'supports_walkthrough');
    await queryInterface.removeColumn('kiosks', 'supports_liveness');
    await queryInterface.removeColumn('kiosks', 'biometric_modes');
    await queryInterface.removeColumn('kiosks', 'hardware_specs');

    console.log('✅ [MIGRATION] Campos de hardware eliminados de tabla kiosks');
  }
};
