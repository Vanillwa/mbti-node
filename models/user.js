'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.Post, {
        sourceKey: "userId",
        foreignKey: "writerId",
      })
      this.hasMany(models.Comment, {
        sourceKey: "userId",
        foreignKey: "userId",
      })
      this.hasMany(models.Like, {
        sourceKey: "userId",
        foreignKey: "userId",
      })
      this.hasMany(models.ChatRoom, {
        sourceKey: "userId",
        foreignKey: "userId1",
      })
      this.hasMany(models.ChatRoom, {
        sourceKey: "userId",
        foreignKey: "userId2",
      })
      this.hasMany(models.Message, {
        sourceKey: "userId",
        foreignKey: "userId",
      })
      this.hasMany(models.Friend, {
        sourceKey: "userId",
        foreignKey: "userId",
      })
      this.hasMany(models.Friend, {
        sourceKey: "userId",
        foreignKey: "targetId",
      })
      this.hasMany(models.PostReport, {
        sourceKey: "userId",
        foreignKey: "userId",
      })
      this.hasMany(models.CommentReport, {
        sourceKey: "userId",
        foreignKey: "userId",
      })
      this.hasMany(models.MessageReport, {
        sourceKey: "userId",
        foreignKey: "userId",
      })
    }
  }
  User.init({
    userId: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    email: DataTypes.STRING,
    nickname: DataTypes.STRING,
    password: DataTypes.STRING,
    role: DataTypes.STRING,
    status: DataTypes.STRING,
    profileImage: DataTypes.STRING,
    chatOption: DataTypes.STRING,
    blockDate: DataTypes.DATE,
    mbti: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};