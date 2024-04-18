'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.Comment, {
        sourceKey: "postId",
        foreignKey: "postId",
      })
      this.hasMany(models.Like, {
        sourceKey: "postId",
        foreignKey: "postId",
      })
      this.hasMany(models.Image, {
        sourceKey: "postId",
        foreignKey: "postId",
      })
      this.hasMany(models.PostReport, {
        sourceKey: "postId",
        foreignKey: "postId",
      })
      this.belongsTo(models.User,{
        foreignKey : 'writerId',
        targetKey : 'userId'
      })
    }
  }
  Post.init({
    postId: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    title: DataTypes.STRING,
    content: DataTypes.STRING,
    status: DataTypes.INTEGER,
    category: DataTypes.STRING,
    readhit: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Post',
  });
  return Post;
};