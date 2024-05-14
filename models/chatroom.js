'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ChatRoom extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.Message,{
        sourceKey: "roomId",
        foreignKey: "roomId",
      })
      this.belongsTo(models.User,{
        foreignKey : 'userId1',
        targetKey : 'userId'
      })
      this.belongsTo(models.User,{
        foreignKey : 'userId2',
        targetKey : 'userId'
      })
    }
  }
  ChatRoom.init({
    roomId: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    title: DataTypes.STRING,
    status: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'ChatRoom',
  });
  return ChatRoom;
};