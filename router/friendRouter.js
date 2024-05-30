const router = require('express').Router()
const { Op } = require('sequelize');
const models = require("../models");
const math = require('mathjs')

// 친구 요청
router.get("/api/friend/request", async (req, res) => {
  const { targetId } = req.query;
  if (!req.user) return res.send({ message: 'noAuth' })
  if (req.user.userId === parseInt(targetId)) return res.send({ message: 'notAvailable' })
  const targetUser = await models.User.findByPk(targetId)
  if (targetUser == null) return res.send({ message: 'noExist' })
  else if (targetUser.status === 'deleted') return res.send({ message: 'deleted' })

  const check = await models.Friend.findOne({ where: { userId: req.user.userId, targetId } })
  if (check != null) {
    if (check.status === 'friend') // 이미 친구일 경우
      return res.send({ message: 'duplicated' })
    if (check.status === 'blocked') // 이미 차단한 경우
      return res.send({ message: 'blocked' })
    if (check.status === 'pending') // 이미 친구 요청을 보낸 경우
      return res.send({ message: 'pending' })
  }

  const result = await models.Friend.create({ userId: req.user.userId, targetId, status: 'pending' })
  return res.send({ message: 'success' })
})

// 친구 요청 리스트 조회  
router.get("/api/friend/requestList", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const page = parseInt(req.query.page) || 1
  const size = parseInt(req.query.size) || 5

  let startPage, lastPage, totalPage, totalCount, result
  result = await models.Friend.findAll({ where: { targetId: req.user.userId, status: 'pending' }, include: [{ model: models.User, as: 'requestUser' }, { model: models.User, as: 'receiveUser' }] })
  totalCount = await models.Friend.count({ where: { targetId: req.user.userId, status: 'pending' } })

  totalPage = math.ceil(totalCount / size)

  if (totalPage <= 5) {
    startPage = 1;
    lastPage = totalPage;
  } else {
    if (page < 3) {
      startPage = 1;
      lastPage = 5;
    } else if (page > totalPage - 2) {
      startPage = totalPage - 4;
      lastPage = totalPage;
    } else {
      startPage = page - 2;
      lastPage = page + 2;
    }
  }
  let paging = {
    startPage,
    lastPage,
    totalPage
  }
  return res.send({ result, paging })
})

// 친구 요청 수락
router.get("/api/friend/accept", async (req, res) => {
  const { friendId } = req.query
  if (!req.user) return res.send({ message: 'noAuth' })
  const friend = await models.Friend.findByPk(friendId)
  const result = await models.Friend.update({ status: 'friend' }, { where: { friendId } })
  if (result > 0) {
    const check = await models.Friend.findOne({ where: { userId: req.user.userId, targetId: friend.userId } }) // 만약 내가 보낸 친구 요청이 있다면
    if (check != null) await models.Friend.update({ status: "friend" }, { where: { friendId: check.friendId } })
    else await models.Friend.create({ userId: req.user.userId, targetId: friend.userId, status: 'friend' })
    return res.send({ message: 'success' })
  }
  return res.send({ message: 'fail' })
})

// 친구 요청 거절
router.delete("/api/friend/reject", async (req, res) => {
  const { friendId } = req.query
  if (!req.user) return res.send({ message: 'noAuth' })
  const result = await models.Friend.destroy({ where: { friendId } })
  if (result > 0) {
    return res.send({ message: 'success' })
  }
})

// 친구 차단
router.put("/api/friend/block", async (req, res) => {
  const { targetId } = req.query
  console.log("targetId : ", targetId)
  if (!req.user) return res.send({ message: 'noAuth' })
  const check = await models.Friend.findOne({ where: { userId: req.user.userId, targetId } })
  console.log(check)
  if (check != null) {
    if (check.status === 'friend' || check.status === 'pending') {
      await models.Friend.update({ status: "blocked" }, { where: { userId: req.user.userId, targetId } })
      await models.Friend.destroy({ where: { userId: targetId, targetId: req.user.userId } })
      return res.send({ message: 'success' })
    } else if (check.status === 'blocked') {
      return res.send({ message: 'duplicated' })
    }
  } else {
    await models.Friend.create({ status: 'blocked', userId: req.user.userId, targetId })
    return res.send({ message: 'success' })
  }
})

// 친구 삭제
router.delete("/api/friend/delete", async (req, res) => {
  const { friendId } = req.query
  if (!req.user) return res.send({ message: 'noAuth' })
  const friend = await models.Friend.findByPk(friendId)
  if (friend == null) return res.send({ message: 'alreadyDeleted' })
  const result = await models.Friend.destroy({ where: { friendId } })
  if (result > 0) {
    await models.Friend.destroy({ where: { userId: friend.targetId, targetId: friend.userId } })
    const room = await models.ChatRoom.findOne({ where: { [Op.or]: [{ userId1: friend.userId, userId2: friend.targetId }, { userId1: friend.targetId, userId2: friend.userId }] } })
    if (room.userId1 === req.user.userId) {
      await models.ChatRoom.update({ user1Status: 'quit' }, { where: { [Op.or]: [{ userId1: friend.userId, userId2: friend.targetId }, { userId1: friend.targetId, userId2: friend.userId }] } })
    } else {
      await models.ChatRoom.update({ user2Status: 'quit' }, { where: { [Op.or]: [{ userId1: friend.userId, userId2: friend.targetId }, { userId1: friend.targetId, userId2: friend.userId }] } })
    }
    return res.send({ message: 'success' })
  }
  return res.send({ message: 'fail' })
})

// 친구 리스트 조회
router.get("/api/friend/friendList", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const page = parseInt(req.query.page) || 1
  const size = parseInt(req.query.size) || 5
  const { keyword } = req.query

  let startPage, lastPage, totalPage, totalCount, result

  if (keyword == null) {
    result = await models.Friend.findAll({ where: { userId: req.user.userId, status: 'friend' }, offset: (page - 1) * size, limit: size, include: { model: models.User, as: 'receiveUser' } })
    totalCount = await models.Friend.count({ where: { userId: req.user.userId, status: 'friend' } })
  } else {
    result = await models.Friend.findAll({ where: { userId: req.user.userId, status: 'friend' }, offset: (page - 1) * size, limit: size, include: { model: models.User, as: 'receiveUser', where: { nickname: { [Op.like]: `%${keyword}%` } } } })
    totalCount = await models.Friend.count({ where: { userId: req.user.userId, status: 'friend' }, include: { model: models.User, as: 'receiveUser', where: { nickname: { [Op.like]: `%${keyword}%` } } } })
  }
  totalPage = math.ceil(totalCount / size)

  if (totalPage <= 5) {
    startPage = 1;
    lastPage = totalPage;
  } else {
    if (page < 3) {
      startPage = 1;
      lastPage = 5;
    } else if (page > totalPage - 2) {
      startPage = totalPage - 4;
      lastPage = totalPage;
    } else {
      startPage = page - 2;
      lastPage = page + 2;
    }
  }
  let paging = {
    startPage,
    lastPage,
    totalPage
  }

  return res.send({ result, paging })
})

// 차단 리스트 조회
router.get("/api/friend/blockList", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const page = parseInt(req.query.page) || 1
  const size = parseInt(req.query.size) || 5

  let startPage, lastPage, totalPage, totalCount, result
  result = await models.Friend.findAll({ where: { userId: req.user.userId, status: 'blocked' }, include: { model: models.User, as: 'receiveUser' } })
  totalCount = await models.Friend.count({ where: { userId: req.user.userId, status: 'blocked' } })
  totalPage = math.ceil(totalCount / size)

  if (totalPage <= 5) {
    startPage = 1;
    lastPage = totalPage;
  } else {
    if (page < 3) {
      startPage = 1;
      lastPage = 5;
    } else if (page > totalPage - 2) {
      startPage = totalPage - 4;
      lastPage = totalPage;
    } else {
      startPage = page - 2;
      lastPage = page + 2;
    }
  }
  let paging = {
    startPage,
    lastPage,
    totalPage
  }

  return res.send({ result, paging })
})

// 차단 해제
router.delete("/api/friend/unblock", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const { targetId } = req.query
  await models.Friend.destroy({ where: { status: 'blocked', userId: req.user.userId, targetId } })
  return res.send({ message: 'success' })
})

module.exports = router