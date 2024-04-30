'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Friend extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.User,{
        foreignKey : 'userId',
        targetKey : 'userId',
        as : 'requestUser'
      })
      this.belongsTo(models.User,{
        foreignKey : 'targetId',
        targetKey : 'userId',
        as : 'receiveUser'
      })
    }
  }
  Friend.init({
    friendId: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Friend',
  });
  return Friend;
};