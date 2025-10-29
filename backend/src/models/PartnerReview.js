const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerReview = sequelize.define('PartnerReview', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reviewer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_request_id: {
      type: DataTypes.INTEGER
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    professionalism_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    quality_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    timeliness_rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT
    },
    partner_response: {
      type: DataTypes.TEXT
    },
    partner_response_at: {
      type: DataTypes.DATE
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'partner_reviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PartnerReview;
};
