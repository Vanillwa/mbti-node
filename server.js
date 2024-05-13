require("dotenv").config();
const port = process.env.PORT;
const express = require("express");
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
const { Sequelize } = require("sequelize");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
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

const passportConfig = require('./passport')
passportConfig()

app.listen(11111, () => {
  console.log(`http://192.168.5.17:11111`);
});

const server = https.createServer(options, app).listen(port, () => {
  console.log(`https://192.168.5.17:${port}`);
});

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
  res.send({ userInfo: req.user })
});

app.use('/', require('./router/authRouter'))
app.use('/', require('./router/postRouter'))
app.use('/', require('./router/userRouter'))
app.use('/', require('./router/commentRouter'))
app.use('/', require('./router/friendRouter'))
app.use('/', require('./router/reportRouter'))
app.use('/', require('./router/chatRouter'))

function onlyForHandshake(middleware) {
  return (req, res, next) => {
    const isHandshake = req._query.sid === undefined;
    if (isHandshake) middleware(req, res, next);
    else next();
  };
}

io.engine.use(onlyForHandshake(sessionConfig));
io.engine.use(onlyForHandshake(passport.session()));
io.engine.use(
  onlyForHandshake((req, res, next) => {
    if (req.user) next();
    else {
      res.writeHead(200);
      res.end();
    }
  })
);

io.on("connection", (socket) => {
  console.log('socket connected')
  socket.on("login", () => {
    console.log("로그인 유저 : ", socket.request.user.userId);
    socket.join(socket.request.user.userId)
  })

  socket.on("join", async (roomId) => {
    const userId = socket.request.user.userId
    console.log(`${userId} 유저가 ${roomId} 방 입장`)
    socket.leave(userId)
    const roomInfo = await models.ChatRoom.findByPk(roomId)
    const targetId = (roomInfo.userId1 == userId) ? roomInfo.userId2 : roomInfo.userId1
    await models.Message.update({ isRead: 1 }, { where: { roomId, userId: targetId, isRead: 0 } }) // 사용자가 채팅방에 입장하면 상대방이 보냈던 채팅들 읽음 처리
    socket.join("r" + roomId);

    let userCount = io.sockets.adapter.rooms.get("r" + roomId).size // 상대방도 방에 들어와 있는 경우 상대방 화면도 업데이트 해줌
    if (userCount === 2) {
      const messages = await models.Message.findAll({ where: { roomId }, include: [{ model: models.User, as : 'sendUser' },{ model: models.User, as : 'receiveUser' }], order: [["createdAt", "DESC"]] })
      io.to("r" + roomId).emit("userJoined", { messages, targetId })
    }
  });

  socket.on("leave", (roomId) => {
    console.log(`${socket.request.user.userId} 유저가 나감`)
    socket.leave("r" + roomId)
    socket.join(socket.request.user.userId)
  })

  socket.on("logout", () => {
    console.log("로그아웃 유저 : ", socket.request.user.userId);
    socket.leave(socket.request.user.userId)
  })

  socket.on("sendMessage", async (data) => {
    let user = socket.request.user;
    let userCount = io.sockets.adapter.rooms.get("r" + data.roomId).size
    console.log("유저 수 : ", userCount)
    let result
    if (userCount == 1) result = await models.Message.create({ message: data.message, userId: user.userId, targetId: data.targetId, roomId: data.roomId, isRead: 0 });
    else result = await models.Message.create({ message: data.message, userId: user.userId, targetId: data.targetId, roomId: data.roomId, isRead: 1 });
    let newResult = { ...result.dataValues, sendUser: { nickname: user.nickname, profileImage: user.profileImage } };
    io.to("r" + data.roomId).emit("sendMessage", newResult);
    io.to(data.targetId).emit("notification")
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});
