'use strict';

const { sequelize } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      userId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING
      },
      nickname: {
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING
      },
      role: {
        type: Sequelize.STRING,
        defaultValue : "USER"
      },
      status: {
        type: Sequelize.STRING,
        defaultValue : "OK"
      },
      profileImage: {
        type: Sequelize.STRING
      },
      chatOption: {
        type: Sequelize.STRING,
        defaultValue : "ALL"
      },
      blockDate: {
        type: Sequelize.DATE,
        defaultValue : null
      },
      mbti : {
        type: Sequelize.STRING,
        defaultValue : null
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue : Sequelize.fn('now')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue : Sequelize.fn('now')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};