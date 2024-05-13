const router = require('express').Router()
const { Op } = require('sequelize');
const models = require("../models");
const math = require('mathjs')

// 게시글 신고
router.post("/api/post/report", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  let body = req.body
  body.userId = req.user.userId
  body.status = 'pending'
  const check = await models.PostReport.findOne({ where: { postId: body.postId, userId: req.user.userId } })
  if (check != null) return res.send({ message: 'duplicated' })
  await models.PostReport.create(req.body)
  return res.send({ message: 'success' })
})

// 게시글 신고 내역 조회 (관리자)
router.get("/api/report/post", async (req, res) => {
  if (!req.user || req.user.role != 'admin') return res.send({ message: 'noAuth' })
  const result = await models.PostReport.findAll({ where: { status: 'pending' }, include: [{ model: models.Post, include: [{ model: models.User }] }, { model: models.User }] })
  return res.send(result)
})

// 게시글 신고 내역 처리 (관리자)
router.put("/api/report/post/:reportId", async (req, res) => {
  const { reportId } = req.params
  console.log("reportId : ", reportId)
  if (!req.user || req.user.role != 'admin') return res.send({ message: 'noAuth' })
  const result = await models.PostReport.update({ status: 'done' }, { where: { reportId } })
  if (result > 0) return res.send({ message: 'success' })
  return res.send({ message: 'fail' })
})

// 사용자 계정 정지 
router.put("/api/user/block", async (req, res) => {
  if (!req.user || req.user.role != 'admin') return res.send({ message: 'noAuth' })
  const { postId, commentId, userId, blockDate } = req.body

  if (postId != null) await models.Post.update({ status: 'blocked' }, { where: { postId } })
  if (commentId != null) await models.Comment.update({ status: 'blocked' }, { where: { commentId } })

  const result = await models.User.update({ status: 'blocked', blockDate }, { where: { userId } })
  if (result > 0) return res.send({ message: 'success' })
  return res.send({ message: 'fail' })
})

// 댓글 신고
router.post("/api/comment/report", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  let body = req.body
  body.userId = req.user.userId
  body.status = 'pending'
  const check = await models.CommentReport.findOne({ where: { commentId: body.commentId, userId: req.user.userId } })
  if (check != null) return res.send({ message: 'duplicated' })
  await models.CommentReport.create(req.body)
  return res.send({ message: 'success' })
})

// 댓글 신고 내역 조회 (관리자)
router.get("/api/report/comment", async (req, res) => {
  if (!req.user || req.user.role != 'admin') return res.send({ message: 'noAuth' })
  const result = await models.CommentReport.findAll({ where: { status: 'pending' }, include: [{ model: models.Comment, include: [{ model: models.User }] }, { model: models.User }] })
  return res.send(result)
})

// 댓글 신고 내역 처리 (관리자)
router.put("/api/report/comment/:reportId", async (req, res) => {
  const { reportId } = req.params
  if (!req.user || req.user.role != 'admin') return res.send({ message: 'noAuth' })
  const result = await models.CommentReport.update({ status: 'done' }, { where: { reportId } })
  if (result > 0) return res.send({ message: 'success' })
  return res.send({ message: 'fail' })
})

// 사용자 리스트 조회
router.get("/api/user", async (req, res) => {
  if (!req.user || req.user.role != 'admin') return res.send({ message: 'noAuth' })
  const { filter, keyword, type, page, size } = req.query
  let limit = parseInt(size)
  let currentPage = parseInt(page)
  let startPage, lastPage, totalPage, totalCount, result


  if (filter != '') {
    if (keyword != '') {
      if (type === 'email') {
        totalCount = await models.User.count({ where: { status: filter, email: { [Op.like]: `%${keyword}%` } } })
        result = await models.User.findAll({ where: { status: filter, email: { [Op.like]: `%${keyword}%` } }, offset: (currentPage - 1) * limit, limit })
      }
      else if (type === 'nickname') {
        totalCount = await models.User.count({ where: { status: filter, nickname: { [Op.like]: `%${keyword}%` } } })
        result = await models.User.findAll({ where: { status: filter, nickname: { [Op.like]: `%${keyword}%` } }, offset: (currentPage - 1) * limit, limit })
      }
    } else {
      totalCount = await models.User.count({ where: { status: filter } })
      result = await models.User.findAll({ where: { status: filter }, offset: (currentPage - 1) * limit, limit })
    }
  } else {
    if (keyword != '') {
      if (type === 'email') {
        totalCount = await models.User.count({ where: { status: { [Op.notIn]: ['deleted'] }, email: { [Op.like]: `%${keyword}%` } } })
        result = await models.User.findAll({ where: { status: { [Op.notIn]: ['deleted'] }, email: { [Op.like]: `%${keyword}%` } }, offset: (currentPage - 1) * limit, limit })
      }
      else if (type === 'nickname') {
        totalCount = await models.User.count({ where: { status: { [Op.notIn]: ['deleted'] }, nickname: { [Op.like]: `%${keyword}%` } } })
        result = await models.User.findAll({ where: { status: { [Op.notIn]: ['deleted'] }, nickname: { [Op.like]: `%${keyword}%` } }, offset: (currentPage - 1) * limit, limit })
      }
    } else {
      totalCount = await models.User.count({ where: { status: { [Op.notIn]: ['deleted'] } } })
      result = await models.User.findAll({ where: { status: { [Op.notIn]: ['deleted'] }, }, offset: (currentPage - 1) * limit, limit })
    }
  }

  totalPage = math.ceil(totalCount / limit)

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

// 사용자 계정 차단 해제
router.put("/api/user/unblock", async (req, res) => {
  const { userId } = req.query
  console.log("userId : ", userId)
  if (!req.user || req.user.role != 'admin') return res.send({ message: 'noAuth' })
  const result = await models.User.update({ status: "ok" }, { where: { userId } })
  if (result > 0) return res.send({ message: 'success' })
  return res.send({ message: 'fail' })
})

module.exports = router