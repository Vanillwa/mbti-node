const router = require('express').Router()
const multer = require('multer');
const models = require("../models");
const math = require('mathjs')
const path = require("path");

const uploadPostImage = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'public/uploads/postImages')
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, path.basename(file.originalname, ext) + Date.now() + ext);
    }
  })
})

// 게시판 - 글 리스트 조회
router.get("/api/post/list", async (req, res) => {
  const { mbti, sort, order } = req.query
  const page = parseInt(req.query.page)
  const size = parseInt(req.query.size)
  let startPage, lastPage, totalPage, totalCount, result
  if (mbti == 'null') {
    totalCount = await models.Post.count({ where: { status: 'ok' } })
    result = await models.Post.findAll({ where: { status: 'ok' }, offset: (parseInt(page) - 1) * size, limit: parseInt(size), include: [{ model: models.User }], order: [[sort, order]] })
  }
  else {
    totalCount = await models.Post.count({ where: { status: 'ok', category: mbti } })
    result = await models.Post.findAll({ where: { status: 'ok' }, offset: (parseInt(page) - 1) * size, limit: parseInt(size), where: { category: mbti }, include: [{ model: models.User }], order: [[sort, order]] })
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
  return res.send({ list: result, paging })
})

// 게시판 - 글 단일 조회
router.get("/api/post/:postId", async (req, res) => {
  const { postId } = req.params
  await models.Post.increment({ readhit: 1 }, { where: { postId } })
  const result = await models.Post.findOne({ where: { postId }, include: [{ model: models.User }] })
  return res.send(result)
})

// 게시판 - 글 좋아요 누름
router.get("/api/addLike/:postId", async (req, res) => {
  const { postId } = req.params
  if (!req.user) return res.send({ message: 'noAuth' })
  const check = await models.Like.findOne({ where: { postId, userId: req.user.userId } })
  if (check != null) return res.send({ message: "duplicated" })
  await models.Like.create({ postId, userId: req.user.userId })
  const likeInc = await models.Post.increment({ like: 1 }, { where: { postId } })
  return res.send({ message: 'success', likes: likeInc })
})

// 게시판 - 글 작성
router.post("/api/post", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  let body = {
    title: req.body.title,
    content: req.body.content,
    category: req.body.category,
    writerId: req.user.userId
  }
  const result = await models.Post.create(body)
  return res.send({ message: 'success', result })
})

// 게시판 - 글 작성 - 이미지 업로드
router.post("/api/post/img", uploadPostImage.single('img'), async (req, res) => {
  console.log('저장된 파일의 이름', req.file.filename);
  const IMG_URL = `https://192.168.5.17:10000/uploads/postImages/${req.file.filename}`;

  res.json({ url: IMG_URL });
})

// 게시판 - 글 삭제
router.delete("/api/post/:postId", async (req, res) => {
  const { postId } = req.params
  if (!req.user) return res.send({ message: 'noAuth' })
  const post = await models.Post.findByPk(postId)
  if (post == null) return res.send({ message: 'noExist' })
  if (req.user.role != 'admin' && req.user.userId != post.writerId) return res.send({ message: 'noAuth' })

  const result = await models.Post.destroy({ where: { postId, writerId: req.user.userId } })
  return res.send({ message: 'success', result })
})

// 게시판 - 글 수정
router.put("/api/post", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  if (req.body.writerId != req.user.userId) return res.send({ message: 'noAuth' })

  const result = await models.Post.update(req.body, { where: { postId: req.body.postId } })
  return res.send({ message: 'success', result })
})

module.exports = router