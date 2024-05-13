const router = require('express').Router()
const models = require("../models");
const math = require('mathjs')
const bcrypt = require("bcrypt");
const path = require("path");

const mailer = require('nodemailer');
const multer = require('multer');
const smtpTransport = mailer.createTransport({
  pool: true,
  maxConnections: 1,
  service: "naver",
  host: "smpt.naver.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.MAILER_USER,
    pass: process.env.MAILER_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
})

const uploadProfileImage = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'public/uploads/profileImages')
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, path.basename(file.originalname, ext) + Date.now() + ext);
    }
  })
})

// 비밀번호 재설정 - 인증번호 요청
router.post("/api/updatePassword/requestEmailVerification", async (req, res) => {
  const { email } = req.body

  const result = await models.User.findOne({ where: { email } })
  if (result == null) {
    return res.send({ message: 'noExist' })
  }

  const randNum = math.randomInt(100000, 999999)
  req.session.updatePwdCode = randNum
  const mailOption = {
    from: "wjdgus3044@naver.com",
    to: email,
    subject: "인증번호 발송",
    html: `<h1>인증번호 : ${randNum}<h1>`
  }

  smtpTransport.sendMail(mailOption, (err, response) => {
    if (err) {
      res.send({ message: 'fail' })
      smtpTransport.close()
      return
    } else {
      res.send({ message: 'success' })
      smtpTransport.close()
      return
    }
  })
  req.session.isupdatePwdEmailChecked = true
  req.session.updatePwdEmail = email
  return res.send({ message: 'success', code: randNum })
})

// 비밀번호 재설정 - 이메일 input값 변경
router.get('/api/updatePassword/emailChanged', (req, res) => {
  delete req.session.isupdatePwdEmailChecked;
  delete req.session.updatePwdCode
  delete req.session.updatePwdEmail
  return res.send({ message: 'success' })
})

// 비밀번호 재설정 - 인증번호 비교
router.post("/api/updatePassword/checkEmailVerification", (req, res) => {
  const { verifyNumber } = req.body
  const updatePwdCode = req.session.updatePwdCode

  if (verifyNumber == updatePwdCode) {
    req.session.isupdatePwdEmailVerified = true
    return res.send({ message: 'success' })
  } else {
    delete req.session.isupdatePwdEmailVerified
    return res.send({ message: 'fail' })
  }
})

// 비밀번호 재설정 - 비밀번호 변경
router.post("/api/updatePassword", async (req, res) => {
  const { password } = req.body
  const email = req.session.updatePwdEmail
  if (!email) return res.send({ message: 'noAuth' })
  const result = await models.User.update({ password: await bcrypt.hash(password, 10) }, { where: { email } })

  delete req.session.updatePwdCode
  delete req.session.isupdatePwdEmailVerified
  delete req.session.updatePwdEmail
  return res.send({ message: 'success', result })
})

// 회원정보 수정 - 프로필 이미지 업로드
router.put("/api/updateUserInfo/updateProfileImage", uploadProfileImage.single('img'), async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  console.log('저장된 파일의 이름', req.file.filename);
  const IMG_URL = `https://192.168.5.17:10000/uploads/profileImages/${req.file.filename}`;
  const result = await models.User.update({ profileImage: IMG_URL }, { where: { userId: req.user.userId } })
  if (result > 0) {
    req.user.profileImage = IMG_URL
    let newUserInfo = { ...req.user.dataValues }
    delete newUserInfo.password
    res.json({ url: IMG_URL, newUserInfo });
  } else {
    return res.send({ message: 'fail' })
  }
})

// 회원정보 수정 - 프로필 이미지 삭제
router.delete('/api/updateUserInfo/deleteProfileImage', async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const IMG_URL = `https://192.168.5.17:10000/uploads/profileImages/defaultImage.png`;
  const result = await models.User.update({ profileImage: IMG_URL }, { where: { userId: req.user.userId } })
  if (result > 0) {
    req.user.profileImage = IMG_URL
    let newUserInfo = { ...req.user.dataValues }
    delete newUserInfo.password
    res.json({ url: IMG_URL, newUserInfo });
  } else {
    return res.send({ message: 'fail' })
  }
})

// 회원정보 수정 - 닉네임 중복 체크
router.post("/api/updateUserInfo/checkDuplicationNickname", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const { nickname } = req.body
  const result = await models.User.findOne({ where: { nickname } })
  if (result != null) {
    delete req.session.isUpdateNicknameChecked
    return res.send({ message: 'duplicated' })
  }
  req.session.isUpdateNicknameChecked = true
  return res.send({ message: 'success' })
})

// 회원정보 수정 - 닉네임값 변경시 세션 삭제
router.get("/api/updateUserInfo/nicknameChanged", (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  delete req.session.isUpdateNicknameChecked
  return res.send({ message: 'success' })
})

// 회원정보 수정 - 닉네임 변경
router.put("/api/updateUserInfo/nickname", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  if (!req.session.isUpdateNicknameChecked) return res.send({ message: 'nicknameNotChecked' })
  const { nickname } = req.body
  const result = await models.User.update({ nickname }, { where: { userId: req.user.userId } })
  if (result > 0) {
    req.user.nickname = nickname
    let newUserInfo = { ...req.user.dataValues }
    delete newUserInfo.password
    return res.send({ message: 'success', newUserInfo })
  } else {
    return res.send({ message: 'fail' })
  }
})

// 회원정보 수정 - 비밀번호 변경
router.put("/api/updateUserInfo/password", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const { password } = req.body
  const result = await models.User.update({ password: await bcrypt.hash(password, 10) }, { where: { userId: req.user.userId } })
  return res.send({ message: 'success' })
})

// 회원정보 수정 - mbti 변경
router.put("/api/updateUserInfo/mbti", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const { mbti } = req.body
  const result = await models.User.update({ mbti }, { where: { userId: req.user.userId } })
  if (result > 0) {
    req.user.mbti = mbti
    let newUserInfo = { ...req.user.dataValues }
    delete newUserInfo.password
    return res.send({ message: 'success', newUserInfo })
  } else {
    return res.send({ message: 'fail' })
  }
})

// 회원 탈퇴 - 비밀번호 확인
router.post("/api/deleteUser/passwordCheck", async (req, res) => {
  const { password } = req.body
  if (!req.user) return res.send({ message: 'noAuth' })
  if (await bcrypt.compare(password, req.user.password)) {
    req.session.deleteUserPasswordCheck = true
    return res.send({ message: 'success' })
  }
  delete req.session.deleteUserPasswordCheck
  return res.send({ message: 'fail' })
})

// 회원 탈퇴
router.delete("/api/user", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  if (!req.session.deleteUserPasswordCheck) return res.send({ message: 'noPasswordCheck' })
  delete req.session.deleteUserPasswordCheck
  console.log("req.user : ", req.user)
  const result = await models.User.update({ email: 'deleted', nickname: 'deleted', status: 'deleted' }, { where: { userId: req.user.userId } })
  if (result > 0) {
    await models.Post.update({ status: 'deleted' }, { where: { writerId: req.user.userId } })
    await models.Comment.update({ status: 'deleted' }, { where: { userId: req.user.userId } })
    req.logout(() => {
      req.session.destroy();
      return res.send({ message: "success" });
    });
  }
  else return res.send({ message: 'fail' })
})

// 유저 프로필
router.get("/api/user/:userId", async (req, res) => {
  const { userId } = req.params
  const userInfo = await models.User.findByPk(userId)
  const recentPost = await models.Post.findAll({ where: { writerId: userId } })
  const recentComment = await models.Comment.findAll({ where: { userId } })
  return res.send({ userInfo, recentPost, recentComment })
})

module.exports = router