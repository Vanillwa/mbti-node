const router = require('express').Router()
const passport = require("passport");
const passportConfig = require('../passport')
const models = require("../models");
const math = require('mathjs')
const bcrypt = require("bcrypt");
passportConfig()

const mailer = require('nodemailer');
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


// 회원가입 - 이메일 중복체크 
router.post("/api/join/checkDuplicationEmail", async (req, res) => {
  const { email } = req.body
  const result = await models.User.findOne({ where: { email } })
  if (result != null) {
    delete req.session.isJoinEmailChecked
    return res.send({ message: 'duplicated' })
  }
  req.session.isJoinEmailChecked = true
  return res.send({ message: 'success' })
})

// 회원가입 - 이메일 값 변경시 세션 삭제
router.get("/api/join/emailChanged", (req, res) => {
  delete req.session.isJoinEmailChecked
  delete req.session.isJoinEmailVerified
  return res.send({ message: 'success' })
})

// 회원가입 - 이메일 인증번호 발송
router.post("/api/join/requestEmailVerification", async (req, res) => {
  if (!req.session.isJoinEmailChecked) return res.send({ message: 'emailNotChecked' })
  const { email } = req.body
  const randNum = math.randomInt(100000, 999999)
  req.session.joinCode = randNum

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
      res.send({ message: 'success', code: randNum })
      smtpTransport.close()
      return
    }
  })
  return res.send({ message: 'success', code: randNum })
})

// 회원가입 - 이메일 인증번호 맞는지 체크
router.post("/api/join/checkEmailVerification", (req, res) => {
  if (!req.session.isJoinEmailChecked) return res.send({ message: 'emailNotChecked' })
  const { code } = req.body
  const joinCode = req.session.joinCode

  if (code == joinCode) {
    req.session.isJoinEmailVerified = true
    return res.send({ message: 'success' })
  } else {
    delete req.session.isJoinEmailVerified
    return res.send({ message: 'fail' })
  }
})

// 회원가입 - 닉네임 중복체크
router.post("/api/join/checkDuplicationNickname", async (req, res) => {
  const { nickname } = req.body
  const result = await models.User.findOne({ where: { nickname } })
  if (result != null) {
    delete req.session.isJoinNicknameChecked
    return res.send({ message: 'duplicated' })
  }
  req.session.isJoinNicknameChecked = true
  return res.send({ message: 'success' })
})

// 회원가입 - 닉네임 값 변경시 세션 삭제
router.get("/api/join/nicknameChanged", (req, res) => {
  delete req.session.isJoinNicknameChecked
  return res.send({ message: 'success' })
})

// 회원가입
router.post("/api/join", async (req, res) => {
  const { email, nickname, password, mbti } = req.body;
  if (req.session.isJoinEmailChecked != true) return res.send({ message: "emailNotChecked" })
  if (req.session.isJoinEmailVerified != true) return res.send({ message: "emailNotVerified" })
  if (req.session.isJoinNicknameChecked != true) return res.send({ message: "nicknameNotChecked" })

  let result = await models.User.findOne({ where: { email } });
  if (result) return res.send({ message: "duplicated" });

  let data = {
    email,
    nickname,
    password: await bcrypt.hash(password, 10),
    role: "user",
    profileImage: `https://192.168.5.17:10000/uploads/profileImages/defaultImage.png`,
    mbti,
    status: 'ok',
    chatOption: 'friendOnly'
  };
  result = await models.User.create(data);
  delete req.session.isJoinEmailVerified
  delete req.session.isJoinEmailChecked
  delete req.session.isJoinNicknameChecked
  return res.send({ message: "success" });
});

// 로그인
router.post("/api/login", async (req, res, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return res.status(500).json(error);
    if (!user) return res.send(info);
    req.login(user, (error) => {
      if (error) return next(error);
      console.log("로그인 완료");
      let userInfo = {
        userId: req.user.userId,
        email: req.user.email,
        nickname: req.user.nickname,
        profileImage: req.user.profileImage,
        mbti: req.user.mbti,
        status: req.user.status,
        role: req.user.role,
        chatOption: req.user.chatOption
      };
      return res.send({ message: "success", userInfo });
    });
  })(req, res);
});

//로그아웃
router.get("/api/logout", (req, res) => {
  req.logout(() => {
    console.log("로그아웃 완료");
    req.session.destroy();
    return res.send({ message: "success" });
  });
});

module.exports = router