'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.User,{
        foreignKey : 'userId',
        targetKey : 'userId',
        as : 'sendUser'
      })
      this.belongsTo(models.User,{
        foreignKey : 'targetId',
        targetKey : 'userId',
        as : 'receiveUser'
      })
    }
  }
  Message.init({
    messageId: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    message: DataTypes.STRING,
    isRead : DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Message',
  });
  return Message;
};