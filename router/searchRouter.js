const router = require('express').Router()
const { Op } = require('sequelize');
const models = require("../models");
const math = require('mathjs')

router.get("/api/search", async (req, res) => {
	const { keyword } = req.query
	console.log("keyword : ", keyword)
	const userList = await models.User.findAll({ where: { nickname: { [Op.like]: `%${keyword}%` } } })
	const postList = await models.Post.findAll({ where: { title: { [Op.like]: `%${keyword}%` } } })
	return res.send({userList, postList})
})

module.exports = router