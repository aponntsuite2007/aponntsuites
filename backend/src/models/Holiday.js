const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Holiday = sequelize.define('Holiday', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'country',
      comment: 'País del feriado (ej: Argentina, Chile, Bolivia)'
    },
    state_province: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'state_province',
      comment: 'Provincia/Estado (NULL = feriado nacional)'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date',
      comment: 'Fecha del feriado'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'name',
      comment: 'Nombre del feriado'
    },
    is_national: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_national',
      comment: 'TRUE si es feriado nacional'
    },
    is_provincial: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_provincial',
      comment: 'TRUE si es feriado provincial/estatal'
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'year',
      comment: 'Año del feriado (para filtrado rápido)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description',
      comment: 'Descripción adicional del feriado'
    }
  }, {
    tableName: 'holidays',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['country'] },
      { fields: ['date'] },
      { fields: ['year'] },
      { fields: ['country', 'date'] },
      { fields: ['country', 'state_province', 'date'] }
    ]
  });

  /**
   * Obtener feriados para un país y opcionalmente provincia/estado
   */
  Holiday.getHolidaysForLocation = async function(country, state_province = null, startDate = null, endDate = null) {
    const where = { country };

    if (state_province) {
      where[sequelize.Sequelize.Op.or] = [
        { state_province: null }, // Feriados nacionales
        { state_province }         // Feriados provinciales
      ];
    }

    if (startDate) {
      where.date = { [sequelize.Sequelize.Op.gte]: startDate };
    }

    if (endDate) {
      where.date = {
        ...where.date,
        [sequelize.Sequelize.Op.lte]: endDate
      };
    }

    return await Holiday.findAll({
      where,
      order: [['date', 'ASC']]
    });
  };

  /**
   * Verificar si una fecha es feriado
   */
  Holiday.isHoliday = async function(date, country, state_province = null, includeNational = true, includeProvincial = false) {
    const where = { date, country };

    if (includeNational && includeProvincial) {
      // Buscar ambos tipos
      where[sequelize.Sequelize.Op.or] = [
        { is_national: true },
        { is_provincial: true, state_province }
      ];
    } else if (includeNational) {
      where.is_national = true;
    } else if (includeProvincial) {
      where.is_provincial = true;
      where.state_province = state_province;
    }

    const count = await Holiday.count({ where });
    return count > 0;
  };

  /**
   * Obtener feriados para un rango de fechas
   */
  Holiday.getHolidaysInRange = async function(startDate, endDate, country, state_province = null) {
    const where = {
      country,
      date: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    };

    if (state_province) {
      where[sequelize.Sequelize.Op.or] = [
        { state_province: null },
        { state_province }
      ];
    }

    return await Holiday.findAll({
      where,
      order: [['date', 'ASC']]
    });
  };

  /**
   * Poblar feriados para un año específico
   */
  Holiday.seedHolidays = async function(year, country, holidays) {
    const records = holidays.map(h => ({
      country,
      state_province: h.state_province || null,
      date: `${year}-${h.month}-${h.day}`,
      name: h.name,
      is_national: h.is_national !== false,
      is_provincial: h.is_provincial === true,
      year,
      description: h.description || null
    }));

    return await Holiday.bulkCreate(records, {
      ignoreDuplicates: true
    });
  };

  return Holiday;
};
