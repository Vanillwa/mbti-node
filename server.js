require("dotenv").config();
const port = process.env.PORT;

const express = require("express");
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

const mailer = require('nodemailer')
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

const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

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
  cookie: { secure: false, maxAge: 1000 * 60 * 60 },
  store: new MySQLStore(dbConfig),
});

app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

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

server.listen(port, () => {
  console.log(`http://localhost:${port}`);
  console.log(`http://192.168.5.17:${port}`);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

// 회원가입 이메일 중복체크
app.post("/api/join/checkDuplicationEmail", async (req, res) => {
  const { email } = req.body
  const result = await models.User.findOne({ where: { email } })
  if (result != null) {
    delete req.session.isEmailChecked
    return res.send({ message: 'duplicated' })
  }
  req.session.isEmailChecked = true
  return res.send({ message: 'success' })
})

// 회원가입 이메일 값 변경시 세션 삭제
app.get("/api/join/emailChanged", (req, res) => {
  delete req.session.isEmailVerified
  delete req.session.isEmailChecked
  return res.send({ message: 'success' })
})

// 회원가입 이메일 인증번호 발송
app.post("/api/join/requestEmailVerification", async (req, res) => {
  const { email } = req.body
  const randNum = math.randomInt(100000, 999999)
  req.session.verificationCode = randNum

  // const mailOption = {
  //   from: "wjdgus3044@naver.com",
  //   to: email,
  //   subject: "인증번호 발송",
  //   html: `<h1>인증번호 : ${randNum}<h1>`
  // }

  // smtpTransport.sendMail(mailOption, (err, response) => {
  //   if (err) {
  //     res.send({ message: 'fail' })
  //     smtpTransport.close()
  //     return
  //   } else {
  //     res.send({ message: 'success', code: randNum })
  //     smtpTransport.close()
  //     return
  //   }
  // })
  res.send({ message: 'success', code: randNum })
})

// 회원가입 이메일 인증번호 맞는지 체크
app.post("/api/join/checkEmailVerification", async (req, res) => {
  const { verifyNumber } = req.body
  const verificationCode = req.session.verificationCode
  if (verifyNumber == verificationCode) {
    req.session.isEmailVerified = true
    return res.send({ message: 'success' })
  } else {
    delete req.session.isEmailVerified
    return res.send({ message: 'fail' })
  }
})

// 회원가입 닉네임 중복체크
app.post("/api/join/checkDuplicationNickname", async (req, res) => {
  const { email } = req.body
  console.log(email)
  const result = await models.User.findOne({ where: { email } })
  if (result != null) {
    delete req.session.isNicknameChecked
    return res.send({ message: 'duplicated' })
  }
  req.session.isNicknameChecked = true
  return res.send({ message: 'success' })
})

// 회원가입 닉네임 값 변경시 세션 삭제
app.get("/api/join/nicknameChanged", (req, res) => {
  delete req.session.isNicknameChecked
  return res.send({ message: 'success' })
})

// 회원가입
app.post("/api/join", async (req, res) => {
  const { email, nickname, password, mbti } = req.body;

  if (req.session.isEmailChecked != true) return res.send("emailNotChecked")
  if (req.session.isEmailVerified != true) return res.send("emailNotVerified")
  if (req.session.isNicknameChecked != true) return res.send("nicknameNotChecked")

  // let result = await models.User.findOne({ where: { email } });
  // if (result) return res.send("duplicated");

  let data = {
    email,
    nickname,
    password: await bcrypt.hash(password, 10),
    role: "USER",
    mbti
  };
  result = await models.User.create(data);
  delete req.session.isEmailVerified
  delete req.session.isEmailChecked
  delete req.session.isNicknameChecked
  return res.send("success");
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
        userId: req.user.id,
        email: req.user.email,
        nickname: req.user.nickname,
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

// 비밀번호 찾기 인증번호 요청
app.post("/api/findPassword/requestEmailVerification", async (req, res) => {
  const { email } = req.body

  // const result = await models.User.findOne({where : {email}})
  // if(result == null){
  //   return res.send({message : 'noExist'})
  // }

  const randNum = math.randomInt(100000, 999999)
  req.session.findPwdverificationCode = randNum
  // const mailOption = {
  //   from: "wjdgus3044@naver.com",
  //   to: email,
  //   subject: "인증번호 발송",
  //   html: `<h1>인증번호 : ${randNum}<h1>`
  // }

  // smtpTransport.sendMail(mailOption, (err, response) => {
  //   if (err) {
  //     res.send({ message: 'fail' })
  //     smtpTransport.close()
  //     return
  //   } else {
  //     res.send({ message: 'success'})
  //     smtpTransport.close()
  //     return
  //   }
  // })

  return res.send({ message: 'success' })
})

// post list 조회
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


// post view 단일 글 조회
app.get("/api/post/:postId", async (req, res) => {
  const { postId } = req.params
  const result = await models.Post.findByPk(postId)
  return res.send(result)
})

// post 작성
app.post("/api/post", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const { mbti } = req.query
  let body = {
    title: req.body.title,
    content: req.body.content,
    status: 1,
    category: mbti,
    readhit: 0,
    writerId: req.user.userId
  }
  const result = await models.Post.create(body)
  return res.send({ message: 'success', result })
})

// post 삭제
app.post("/api/post/:postId", async (req, res) => {
  if (!req.user) return res.send({ message: 'noAuth' })
  const { postId } = req.params
  const result = await models.Post.destroy({ where: { postId, writerId: req.user.userId } })
  console.log(result)
  return res.send(result)
})

//채팅 요청
app.get("/api/chat/request", async (req, res) => {
  const { targetId } = req.query;
  if (!req.user) return res.send({ message: "NoAuth" });
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

function onlyForHandshake(middleware) {
  return (req, res, next) => {
    const isHandshake = req._query.sid === undefined;
    if (isHandshake) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
}

io.engine.use(onlyForHandshake(sessionConfig));
io.engine.use(onlyForHandshake(passport.session()));
io.engine.use(
  onlyForHandshake((req, res, next) => {
    if (req.user) {
      next();
    } else {
      res.writeHead(401);
      res.end();
    }
  })
);

io.on("connection", (socket) => {
  console.log("socket connected");

  socket.on("ask-join", async (data) => {
    console.log("socket room 확인");
    socket.join(data);
  });

  socket.on("send-message", async (data) => {
    let user = socket.request.user;
    const result = await models.Message.create({ content: data.content, userId: user.id, roomId: data.roomId });
    let newResult = { ...result.dataValues, User: { nickname: user.nickname } };
    io.to(data.roomId).emit("send-message", newResult);
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});
