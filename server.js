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
const { Sequelize } = require("sequelize");

const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");
const localStrategy = require("passport-local");
const bcrypt = require("bcrypt");

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
  new localStrategy({usernameField : 'email', passwordField : 'password'},async (email, password, cb) => {
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

app.post("/api/join", async (req, res) => {
  const { email, nickname, password, mbti } = req.body;

  let result = await models.User.findOne({ where: { username } });
  if (result) return res.send("duplicated");

  let data = {
    email,
    nickname,
    password: await bcrypt.hash(password, 10),
    role : "USER",
    mbti
  };
  result = await models.User.create(data);
  return res.send("success");
});

app.get("/api/logout", (req, res) => {
  req.logout(() => {
    console.log("로그아웃 완료");
    req.session.destroy();
    return res.send("success");
  });
});

app.get("/api/user", async (req, res) => {
  const result = await models.User.findAll();
  return res.send(result);
});

//채팅 요청
app.get("/api/chat/request", async (req, res) => {
  const { targetId } = req.query;
  if (!req.user) return res.send({ message: "NoAuth" });
  const targetUser = await models.User.findByPk(targetId);
  const result = await models.ChatRoom.create({ title: `${req.user.nickname}님과 ${targetUser.nickname}님의 채팅방` });
  await models.ChatJoin.create({ userId: req.user.id, roomId: result.id });
  await models.ChatJoin.create({ userId: targetId, roomId: result.id });

  return res.send({ message: "success", roomId: result.id });
});

//채팅 리스트
app.get("/api/chat", async (req, res) => {
  if (!req.user) return res.status(401);
  const result = await models.ChatJoin.findAll({ where: { userId: req.user.id }, include: { model: models.ChatRoom } });
  return res.send(result);
});

//채팅방 입장
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
