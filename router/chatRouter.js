const router = require('express').Router()
const { Op } = require('sequelize');
const models = require("../models");
const math = require('mathjs')

//채팅 요청
router.get("/api/chat/request", async (req, res) => {
  const { targetId } = req.query;
  console.log("targetId : ", targetId)
  if (!req.user) return res.send({ message: "noAuth" });
  const targetUser = await models.User.findByPk(targetId);
  if (targetUser.chatOption === 'friendOnly') {
    const friendCheck = await models.Friend.findOne({ where: { userId: req.user.userId, targetId, status: 'friend' } })
    if (friendCheck == null) return res.send({ message: 'notFriend' })
  }
  let userId1, userId2
  if (req.user.userId < targetId) {
    userId1 = req.user.userId
    userId2 = targetId
  } else {
    userId1 = targetId
    userId2 = req.user.userId
  }
  const check = await models.ChatRoom.findOne({ where: { userId1, userId2 } })
  if (check != null) return res.send({ message: 'duplicated', roomId: check.roomId })
  const result = await models.ChatRoom.create({ title: `${req.user.nickname}님과 ${targetUser.nickname}님의 채팅방`, userId1, userId2 });
  return res.send({ message: "success", roomId: result.roomId });
});

//채팅 리스트
router.get("/api/chat", async (req, res) => {
  if (!req.user) return res.send({ message: "noAuth" });
  const result = await models.ChatRoom.findAll({ where: { [Op.or]: [{ userId1: req.user.userId }, { userId2: req.user.userId }] }, include: [{ model: models.User, as: 'user1' }, { model: models.User, as: 'user2' }] });
  return res.send(result);
});

//채팅방 입장
router.get("/api/chat/:roomId", async (req, res) => {
  const { roomId } = req.params;
  const roomInfo = await models.ChatRoom.findByPk(roomId);
  const messageList = await models.Message.findAll({ where: { roomId }, include: [{ model: models.User, as: 'sendUser' }, { model: models.User, as: 'receiveUser' }], order: [["createdAt", "ASC"]] });
  return res.send({ roomInfo, messageList });
});

module.exports = router