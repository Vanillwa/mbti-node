require("dotenv").config();
const port = process.env.PORT;

const express = require("express");
const multer = require("multer")
const https = require('https')
const fs = require("fs")
const options = {
  key: fs.readFileSync("./cert/cert.key"),
  cert: fs.readFileSync("./cert/cert.crt"),
};
const app = express();
const cors = require("cors");
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
const path = require("path");
const models = require("./models");
const { Sequelize, Op } = require("sequelize");

const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");
const localStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const math = require('mathjs')

const mailer = require('nodemailer');
const { emit } = require("process");
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

// const http = require("http");
// const server = http.createServer(app);
// const { Server } = require("socket.io");
// const io = new Server(server, {
//   cors: {
//     origin: true,
//     credentials: true,
//   },
// });

const dbConfig = {
  host: "localhost",
  port: "3306",
  user: "root",
  password: "1111",
  database: "mbti",
};

const sessionConfig = session({
  secret: "1111",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60, secure: true, httpOnly: false, sameSite: 'none' },
  store: new MySQLStore(dbConfig),
});

app.use(express.static(path.join(__dirname + "/public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'public/uploads')
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      console.log('file.originalname', file.originalname)
      cb(null, path.basename(file.originalname, ext) + Date.now() + ext);
    }
  })
})

passport.use(
  new localStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, cb) => {
    let result = await models.User.findOne({ where: { email } });
    if (!result) return cb(null, false, { message: "NoExist" });
    if (await bcrypt.compare(password, result.password)) return cb(null, result);
    return cb(null, false, { message: "PwdFail" });
  })
);

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    console.log("serial");
    done(null, user.userId);
  });
});

passport.deserializeUser(async (userId, done) => {
  const user = await models.User.findByPk(userId);
  process.nextTick(() => {
    console.log("deserial");
    return done(null, user);
  });
});

app.listen(11111, () => {
  console.log(`http://192.168.5.17:11111`);
});

https.createServer(options, app).listen(port, () => {
  console.log(`https://192.168.5.17:${port}`);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

// 회원가입 - 이메일 중복체크
app.post("/api/join/checkDuplicationEmail", async (req, res) => {
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
app.get("/api/join/emailChanged", (req, res) => {
  delete req.session.isJoinEmailChecked
  delete req.session.isJoinEmailVerified
  return res.send({ message: 'success' })
})

// 회원가입 - 이메일 인증번호 발송
app.post("/api/join/requestEmailVerification", async (req, res) => {
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
app.post("/api/join/checkEmailVerification", (req, res) => {
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
app.post("/api/join/checkDuplicationNickname", async (req, res) => {
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
app.get("/api/join/nicknameChanged", (req, res) => {
  delete req.session.isJoinNicknameChecked
  return res.send({ message: 'success' })
})

// 회원가입
app.post("/api/join", async (req, res) => {
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
    role: "USER",
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
app.post("/api/login", async (req, res, next) => {
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
app.get("/api/logout", (req, res) => {
  req.logout(() => {
    console.log("로그아웃 완료");
    req.session.destroy();
    return res.send({ message: "success" });
  });
});

// 비밀번호 재설정 - 인증번호 요청
app.post("/api/updatePassword/requestEmailVerification", async (req, res) => {
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
app.get('/api/updatePassword/emailChanged', (req, res) => {
  delete req.session.isupdatePwdEmailChecked;
  delete req.session.updatePwdCode
  delete req.session.updatePwdEmail
  return res.send({ message: 'success' })
})

// 비밀번호 재설정 - 인증번호 비교
app.post("/api/updatePassword/checkEmailVerification", (req, res) => {
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
app.post("/api/updatePassword", async (req, res) => {
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
app.put("/api/updateUserInfo/updateProfileImage", upload.single('img'), async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  console.log('전달받은 파일', req.file);
  console.log('저장된 파일의 이름', req.file.filename);
  const IMG_URL = `https://192.168.5.17:10000/uploads/${req.file.filename}`;
  const result = await models.User.update({ profileImage: IMG_URL }, { where: { userId: req.user.userId } })
  res.json({ url: IMG_URL });
})

// 회원정보 수정 - 프로필 이미지 삭제
app.put('/api/updateUserInfo/deleteProfileImage', async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const result = await models.User.update({ profileImage: null }, { where: { userId: req.user.userId } })
  return res.send({ message: 'success' })
})

// 회원정보 수정 - 닉네임 중복 체크
app.post("/api/updateUserInfo/checkDuplicationNickname", async (req, res) => {
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
app.get("/api/updateUserInfo/nicknameChanged", (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  delete req.session.isUpdateNicknameChecked
  return res.send({ message: 'success' })
})

// 회원정보 수정 - 닉네임 변경
app.put("/api/updateUserInfo/nickname", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  if (!req.session.isUpdateNicknameChecked) return res.send({ message: 'nicknameNotChecked' })
  const { nickname } = req.body
  const result = await models.User.update({ nickname }, { where: { userId: req.user.userId } })
  req.user.nickname = nickname
  return res.send({ message: 'success', newUserInfo: req.user })
})

// 회원정보 수정 - 비밀번호 변경
app.put("/api/updateUserInfo/password", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const { password } = req.body
  const result = await models.User.update({ password: await bcrypt.hash(password, 10) }, { where: { userId: req.user.userId } })
  req.user.password = password
  return res.send({ message: 'success' })
})

// 유저 프로필
app.get("/api/user/:userId", async (req, res) => {
  const { userId } = req.params
  const userInfo = await models.User.findByPk(userId)
  const recentPost = await models.Post.findAll({ where: { writerId: userId } })

  return res.send({ userInfo, recentPost })
})

// 게시판 - 글 리스트 조회
app.get("/api/post/list", async (req, res) => {
  const mbti = req.query.mbti
  let result
  if (mbti == 'null') {
    result = await models.Post.findAll({ include: [{ model: models.User }] })
  } else {
    result = await models.Post.findAll({ where: { category: mbti }, include: [{ model: models.User }] })
  }
  return res.send(result)
})

// 게시판 - 글 단일 조회
app.get("/api/post/:postId", async (req, res) => {
  const { postId } = req.params
  console.log("postid : ", postId)
  const result = await models.Post.findOne({ where: { postId }, include: [{ model: models.User }] })
  return res.send(result)
})

// 게시판 - 글 작성
app.post("/api/post", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  let body = {
    title: req.body.title,
    content: req.body.content,
    status: "ok",
    category: req.body.category,
    readhit: 0,
    writerId: req.user.userId
  }
  const result = await models.Post.create(body)
  return res.send({ message: 'success', result })
})

// 게시판 - 글 작성 - 이미지 업로드
app.post("/api/post/img", upload.single('img'), async (req, res) => {
  console.log('전달받은 파일', req.file);
  console.log('저장된 파일의 이름', req.file.filename);
  const IMG_URL = `https://192.168.5.17:10000/uploads/${req.file.filename}`;
  res.json({ url: IMG_URL });
})

// 게시판 - 글 삭제
app.delete("/api/post/:postId", async (req, res) => {
  const { postId } = req.params
  if (!req.user) return res.send({ message: 'noAuth' })
  const post = await models.Post.findByPk(postId)
  if (req.user.role != 'admin' && req.user.userId != post.writerId) return res.send({ message: 'noAuth' })

  const result = await models.Post.destroy({ where: { postId, writerId: req.user.userId } })
  return res.send({ message: 'success', result })
})

// 게시판 - 글 수정
app.put("/api/post", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  if (req.body.writerId != req.user.userId) return res.send({ message: 'noAuth' })

  const result = await models.Post.update(req.body, { where: { postId: req.body.postId } })
  return res.send({ message: 'success', result })
})

//채팅 요청
app.get("/api/chat/request", async (req, res) => {
  const { targetId } = req.query;
  if (!req.user) return res.send({ message: "noAuth" });
  const targetUser = await models.User.findByPk(targetId);
  let userId1, userId2
  if (req.user.userId < targetId) {
    userId1 = req.user.userId
    userId2 = targetId
  } else {
    userId1 = targetId
    userId2 = req.user.userId
  }

  const result = await models.ChatRoom.create({ title: `${req.user.nickname}님과 ${targetUser.nickname}님의 채팅방`, userId1, userId2 });
  return res.send({ message: "success", roomId: result.id });
});

//채팅 리스트
app.get("/api/chat", async (req, res) => {
  if (!req.user) return res.status(401);
  const result = await models.ChatRoom.findAll({ where: { [Op.or]: [{ userId1: req.user.userId }, { userId2: req.user.userId }] } });
  return res.send(result);
});

//여기부터 고쳐야함
app.get("/api/chat/:id", async (req, res) => {
  const { id } = req.params;
  const roomInfo = await models.ChatRoom.findByPk(id);
  const messageList = await models.Message.findAll({ where: { roomId: id }, include: { model: models.User }, order: [["createdAt", "DESC"]] });
  console.log(messageList);
  return res.send({ roomInfo, messageList });
});

// function onlyForHandshake(middleware) {
//   return (req, res, next) => {
//     const isHandshake = req._query.sid === undefined;
//     if (isHandshake) {
//       middleware(req, res, next);
//     } else {
//       next();
//     }
//   };
// }

// io.engine.use(onlyForHandshake(sessionConfig));
// io.engine.use(onlyForHandshake(passport.session()));
// io.engine.use(
//   onlyForHandshake((req, res, next) => {
//     if (req.user) {
//       next();
//     } else {
//       res.writeHead(401);
//       res.end();
//     }
//   })
// );

// io.on("connection", (socket) => {
//   console.log("socket connected");

//   socket.on("ask-join", async (data) => {
//     console.log("socket room 확인");
//     socket.join(data);
//   });

//   socket.on("send-message", async (data) => {
//     let user = socket.request.user;
//     const result = await models.Message.create({ content: data.content, userId: user.id, roomId: data.roomId });
//     let newResult = { ...result.dataValues, User: { nickname: user.nickname } };
//     io.to(data.roomId).emit("send-message", newResult);
//   });
// });

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});
