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
  if (check != null) {
    if (check.status === 'reported') return res.send({ message: 'reported' })
    else return res.send({ message: 'duplicated', roomId: check.roomId })
  }
  const result = await models.ChatRoom.create({ title: `${req.user.nickname}님과 ${targetUser.nickname}님의 채팅방`, userId1, userId2 });
  return res.send({ message: "success", roomId: result.roomId });
});

//채팅 리스트
router.get("/api/chat", async (req, res) => {
  if (!req.user) return res.send({ message: "noAuth" });
  
  const result = await models.sequelize.query(`SELECT
  cr.roomId,
  json_object('userId', u1.userId, 'nickname', u1.nickname, 'profileImage', u1.profileImage) as user1,
  json_object('userId', u2.userId, 'nickname', u2.nickname, 'profileImage', u2.profileImage) as user2,
  (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.roomId = cr.roomId
    	AND m.isRead = 0
    	and m.targetId = ${req.user.userId}
  ) AS unreadCount,
  (
  	select m.message
  	from messages m
  	where m.roomId = cr.roomId 
  	order by m.createdAt desc
  	limit 1
  ) as recentMessage,
  (
  	select m.createdAt
  	from messages m
  	where m.roomId = cr.roomId 
  	order by m.createdAt desc
  	limit 1
  ) as recentMessageDate,
  (
  	select u.nickname
  	from messages m
  	inner join users u 
  	on u.userId = m.userId
  	where m.roomId = cr.roomId 
  	order by m.createdAt desc
  	limit 1
  ) as recentMessageUserNickname
  FROM chatrooms cr
  inner join users u1
  on cr.userId1 = u1.userId
  inner join users u2
  on cr.userId2 = u2.userId
  where (userId1 = ${req.user.userId} or userId2 = ${req.user.userId})
    and cr.status = 'ok'
  order by recentMessageDate desc`, { type: models.sequelize.QueryTypes.SELECT })

  return res.send(result);
});

//채팅방 입장
router.get("/api/chat/:roomId", async (req, res) => {
  const { roomId } = req.params;
  const roomInfo = await models.ChatRoom.findByPk(roomId);
  const messageList = await models.Message.findAll({ where: { roomId }, include: [{ model: models.User, as: 'sendUser' }, { model: models.User, as: 'receiveUser' }], order: [["createdAt", "ASC"]] });
  return res.send({ roomInfo, messageList });
});

// 채팅 알림
router.get("/api/chat/alert", async (req, res) => {
  if (!req.user) return res.send({ message: "noAuth" });
  const result = await models.Message.count({ where: { targetId: req.user.userId, isRead: 0 } })
  return res.send(result)
})

module.exports = router