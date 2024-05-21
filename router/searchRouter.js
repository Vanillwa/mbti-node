const router = require('express').Router()
const { Op } = require('sequelize');
const models = require("../models");
const math = require('mathjs')

router.get("/api/search", async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const size = parseInt(req.query.size) || 5
  const { keyword } = req.query
  
  let startPage, lastPage, totalPage, totalCount

  const userList = await models.User.findAll({ where: { nickname: { [Op.like]: `%${keyword}%` } } })
  const postList = await models.Post.findAll({
    where: { title: { [Op.like]: `%${keyword}%` } },
    offset: (page - 1) * size,
    limit: size,
    include: [{ model: models.User }]
  });

  totalCount = await models.Post.count({
    where: { title: { [Op.like]: `%${keyword}%` } },
  })

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
  return res.send({ userList, postList, paging })
})

module.exports = router