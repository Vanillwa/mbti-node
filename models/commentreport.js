'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CommentReport extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.User,{
        foreignKey : 'userId',
        targetKey : 'userId'
      }),
      this.belongsTo(models.Comment,{
        foreignKey : 'commentId',
        targetKey : 'commentId'
      })
    }
  }
  CommentReport.init({
    reportId: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    type: DataTypes.STRING,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'CommentReport',
  });
  return CommentReport;
};