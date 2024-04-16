'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'Posts', 
      'writerId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'ChatRooms', 
      'userId1', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'ChatRooms', 
      'userId2', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'Messages', 
      'userId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'Comments', 
      'userId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'Likes', 
      'userId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'Friends', 
      'userId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'Friends', 
      'targetId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'PostReports', 
      'userId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'CommentReports', 
      'userId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'MessageReports', 
      'userId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users', // Users 모델에서
          key: 'userId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'Comments', 
      'postId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Posts', // Users 모델에서
          key: 'postId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'Likes', 
      'postId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Posts', // Users 모델에서
          key: 'postId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'Images', 
      'postId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Posts', // Users 모델에서
          key: 'postId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'PostReports', 
      'postId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Posts', // Users 모델에서
          key: 'postId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'CommentReports', 
      'commentId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Comments', // Users 모델에서
          key: 'commentId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'Messages', 
      'roomId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ChatRooms', // Users 모델에서
          key: 'roomId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
    await queryInterface.addColumn(
      'MessageReports', 
      'messageId', 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Messages', // Users 모델에서
          key: 'messageId', // 그 아이디 값을 참고합니다.
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    )
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
