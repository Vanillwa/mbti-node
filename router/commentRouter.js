const router = require('express').Router()
const models = require("../models");
const math = require('mathjs')

// 게시판 - 댓글 조회
router.get("/api/comment", async (req, res) => {
  const { postId, order } = req.query
  const page = parseInt(req.query.page)
  const size = parseInt(req.query.size)

  let startPage, lastPage, totalPage, totalCount, commentList

  totalCount = await models.Comment.count({ where: { status: "ok " } })
  commentList = await models.Comment.findAll({ where: { postId, status: "ok" }, offset: (parseInt(page) - 1) * size, limit: parseInt(size), include: [{ model: models.User }], order: [['createdAt', order]] })

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
  return res.send({ commentList, paging })
})

// 게시판 - 댓글 작성
router.post("/api/comment", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const result = await models.Comment.create(req.body)
  return res.send({ message: 'success', result })
})

// 게시판 - 댓글 삭제
router.delete("/api/comment/:commentId", async (req, res) => {
  const { commentId } = req.params
  const comment = await models.Comment.findByPk(commentId)
  if (comment == null) return res.send({ message: "noExist" })
  if (req.user.role != 'admin' && req.user.userId != comment.userId) return res.send({ message: 'noAuth' })

  const result = await models.Comment.update({ status: 'deleted' }, { where: { commentId, userId: req.user.userId } })
  if (result > 0) return res.send({ message: 'success' })
  else return res.send({ message: 'fail' })

})

// 댓글 수정
router.put("/api/comment/:commentId", async (req, res) => {
  const { commentId } = req.params
  if (!req.user) return res.send({ message: 'noAuth' })
  const comment = await models.Comment.findByPk(commentId)
  if (comment == null) return res.send({ message: "noExist" })
  if (req.user.role != 'admin' && req.user.userId != comment.userId) return res.send({ message: 'noAuth' })
  req.body.userId = req.user.userId
  const result = await models.Comment.update(req.body, { where: { userId: req.user.userId, commentId: req.body.commentId } })
  if (result > 0) return res.send({ message: 'success' })
  else return res.send({ message: 'fail' })
})

module.exports = router