'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ChatRoomReport extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.User,{
        foreignKey : 'userId',
        targetKey : 'userId',
        as : 'reportUser'
      }),
      this.belongsTo(models.User,{
        foreignKey : 'targetId',
        targetKey : 'userId',
        as : 'targetUser'
      }),
      this.belongsTo(models.ChatRoom,{
        foreignKey : 'roomId',
        targetKey : 'roomId'
      })
    }
  }
  ChatRoomReport.init({
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
    modelName: 'ChatRoomReport',
  });
  return ChatRoomReport;
};