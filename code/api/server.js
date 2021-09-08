const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const { ExpressPeerServer } = require("peer");
const mongoose = require("mongoose");
const config = require("config");
const path = require('path');
const fs = require('fs');
const https = require('https');
const favicon = require('serve-favicon');
const compression = require('compression');

const app = express()
// compress all requests
app.use(compression());
app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => res.sendFile(__dirname + '/dist/index.html'));

// Switch off the default 'X-Powered-By: Express' header
app.disable('x-powered-by');

const server = http.createServer(app);
const io = socketio(server).sockets;
/** Peer Server */
const customGenerationFunction = () =>
  (Math.random().toString(36) + "0000000000000000000").substr(2, 16);

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/",
  generateClientId: customGenerationFunction,
});
const {meeting}=require('./mysql/model/meeting')
app.use("/mypeer", peerServer);

/** Config */
const db = config.get("mongoURI");
const Active = require("./schema/Active");

const getTime = () => {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString();
  const day = date.getDate().toString();
  const hour = date.getHours().toString();
  const minute = date.getMinutes().toString();
  const second=date.getSeconds().toString();

  return year + '-' + month + '-' + day +  ' ' + hour + ':' + minute+':'+second;
};
/** Connect to MongoDB */
mongoose
  .connect(db, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => console.log(`Mongodb connected`))
  .catch((err) => console.log(err));

var roomInfo = {};
/**在线人员*/
var onLineUsers = [];
/** 在线人数*/
let onLineCounts = 0;

let email=''
/**测试*****************************************************/
// addMeeting('test222','2021-8-1 10:00:00',1212,'4444',0)

/** *********************************************************/

console.log(io);
/** Websocket */
io.on("connection", function (socket) {
  //console.log("connected",socket);
  socket.emit("hello", "hdafq");

  /**登录***********************************************************/
  socket.on("login", ({ email, password }) => {
    console.log("login:",email, password);
    onLineUsers.push(email);
    onLineCounts++;
    console.log("user-number:",onLineCounts);
    // TODO: check password from mongodb
    socket.emit("login-success"); //if match
  });

  /**退出登录***********************************************************/
  socket.on("logout", () => {
    console.log("logout");
    onLineCounts--;
    console.log("user-number:",onLineCounts);
    // console.log(io.adapter)
    socket.emit("logout-success");
  });

  /**加入会议***********************************************************/
  socket.on("join-room", ({ name,roomID }) => {
    console.log("join-room:",roomID);
    /**判断会议是否已存在*/
    if(!roomInfo[roomID]){
      console.log("room-not-found");
      socket.emit("join-fail","cannot find room");
      /**新建房间并将该用户加入房间*/
      roomInfo[roomID]=[];
    }
    if(roomInfo[roomID].indexOf(name)!==-1)return;
    /**将用户加入到房间*/
    socket.join(roomID);
    roomInfo[roomID].push(name);
    /**打印当前房间信息*/
    console.log(roomInfo);
    /**向其他用户广播*/
    socket.broadcast.to(roomID).emit("user-join",name);
    /**将用户加入会议的信息加入数据库*/

    /**显示登陆成功*/
    socket.emit("join-success");
    // console.log(io.adapter)
  });

  /**开始会议***********************************************************/
  socket.on("start-room",({name,roomID})=>{
    console.log("start-room:",roomID);
    /**判断会议是否已存在*/
    if(roomInfo[roomID]){
      console.log("room-already-exist");
      socket.emit("start-fail","room-already-exist");
      return;
    }
    /**新建房间并将该用户加入房间*/
    roomInfo[roomID]=[];
    roomInfo[roomID].push(name);
    /**将用户加入会议的信息加入数据库*/

    /**将socket加入room*/
    socket.join(roomID);
    socket.emit("start-success");
  });

  /**预约会议***********************************************************/
  socket.on('create-room',({name,roomID,password,time})=>{
    console.log("create-room",name,roomID,password,time);
    /**判断该会议是否已经存在*/
    meeting.findAll({
      where:{
        number:roomID
      }
    }).then(function(result){
      if(result.length){
        socket.emit('create-room-fail')
      }else{
        /**找到用户ID*/
        // noinspection BadExpressionStatementJS
        /**添加会议到数据库*/
        meeting.create({
          name:'test',
          start_time:getTime(),
          end_time:'2100-1-1 20:00:00',
          number:roomID,
          password:password,
          host_id:1,
          status:0
        }).then(function(){
          socket.emit('create-room-success');
        }).catch(function(err){
          console.log("添加数据发生错误："+err)
        });
      }
    }).catch(function(err){
      console.log("查询数据发生错误："+err)
    });
  })

  /**快速会议***********************************************************/
  socket.on("quick-room", ({name, roomID, password})=>{
    console.log("quick-room",name,roomID,password)
    /**查询会议是否正在进行*/
    if(roomInfo[roomID]){
      console.log("room being used");
      /**发送失败信息*/
      socket.emit("quick-start-fail","该会议正在使用")
      return;
    }
    /**查询会议是否已经存在*/
    console.log(roomInfo[roomID]);

    /**创建会议，将用户加入会议*/
    roomInfo[roomID]=[];
    roomInfo[roomID].push(name);
    socket.join(roomID);
    console.log(roomInfo);
    /**将用户加入会议的信息存入数据库*/

    /**发送成功信息*/
    socket.emit("quick-start-success")
    // meeting.findAll({
    //   where:{
    //     number:roomID
    //   }
    // }).then(function(result){
    //   if(result.length===0){/**若不存在，则将该会议数据插入数据库*/
    //     meeting.create({
    //       name:'test',
    //       start_time:getTime(),
    //       end_time:'2100-1-1 20:00:00',
    //       number:roomID,
    //       password:password,
    //       host_id:1,
    //       status:0
    //     }).then(function(){
    //       /**创建会议，将用户加入会议*/
    //       roomInfo[roomID]=[];
    //       roomInfo[roomID].push(name);
    //       socket.join(roomID);
    //       console.log(roomInfo);
    //       /**将用户加入会议的信息存入数据库*/
    //
    //       /**发送成功信息*/
    //       socket.emit("quick-start-success")
    //     })
    //   }else{
    //     socket.emit("quick-start-fail","该会议已经存在")
    //   }
    // })
  })

  /**发送消息***********************************************************/
  socket.on("send-msg",({name,msg,roomID})=>{
    console.log("send-msg:",msg,name,roomID);
    /**将消息广播给当前会议所有用户*/
    socket.broadcast.to(roomID).emit('receive-msg', {name, msg});
    /**发送成功*/
    socket.emit("msg","send msg successfully");
  });

  /**结束会议***********************************************************/
  socket.on("close-room",(roomID)=>{
    console.log("close-room");
    /**广播会议室关闭消息*/
    socket.broadcast.to(roomID).emit("room-closed")
    /**主持人离开会议*/
    socket.emit("close-success")
  });

  /**离开会议***********************************************************/
  socket.on("leave-room",({name, roomID})=>{
    console.log("leave-room:",roomID);
    /**广播该用户离开信息*/
    socket.broadcast.to(roomID).emit("user-leave",name);
    /**离开当前房间*/
    socket.leave(roomID);
    /**更新会议信息*/
    const index = roomInfo[roomID].indexOf(name);
    if (index !== -1) {
      roomInfo[roomID].splice(index, 1);
    }
    console.log(roomInfo[roomID]);
    socket.emit("leave-success");
  });

  /**测试视频*/
  function sendMessage(message) {
    console.log('Client sending message: ', message);
    socket.emit('message', message);
  }
  //服务器端相应处理的代码
  socket.on('message', function (message) {
    socket.broadcast.emit('message', message);
  });

  socket.on("user-exists", ({ user, socketID }) => {
    //check if the new user exists in active chat
    Active.findOne({ email: user.email }).then((user) => {
      //emit found to last connected user
      io.in(socketID).emit("user-found", user);
    });

    //Update user if found
    socket.on("update-user", ({ user, socketID, allUserRoomID }) => {
      socket.join(allUserRoomID);

      //** Find user and update the socket id */
      Active.findOneAndUpdate(
          { email: user.email },
          { $set: { socketID } },
          { new: true },
          (err, doc) => {
            if (doc) {
              //**  send active user to the last connected user*/

              Active.find({}).then((allUsers) => {
                const otherUsers = allUsers.filter(
                    ({ email: otherEmails }) => otherEmails !== user.email
                );

                io.in(socketID).emit("activeUsers", otherUsers);
              });
            }
          }
      );

      /** Notify other user about updated or joined user*/
      socket
          .to(allUserRoomID)
          .broadcast.emit("user-join", [{ ...user, socketID }]);
    });

    socket.on("user-join", ({ allUserRoomID, user, socketID }) => {
      socket.join(allUserRoomID);

      /** Store new user in active chats */
      const active = new Active({ ...user, socketID });

      // Find the document || add the document
      Active.findOne({ email: user.email }).then((user) => {
        if (!user) {
          active.save().then(({ email }) => {
            Active.find({}).then((users) => {
              const otherUsers = users.filter(
                  ({ email: otherEmails }) => otherEmails !== email
              );

              // ** Send others to new connected user
              io.in(socketID).emit("activeUsers", otherUsers);
            });
          });
        } else {
          // Emit to all other users the last joined user
          socket.to(allUserRoomID).broadcast.emit("new-user-join", user);
        }
      });
    });
  });

  // Listen for peer connection
  socket.on("join-stream-room", ({ roomID, peerID, socketID, user }) => {
    socket.join(roomID);
    console.log(user.email +"join-stream-room")
    // Emit to other users the last joined users
    socket.to(roomID).broadcast.emit("user-connected", {
      peerID,
      user,
      roomID,
      socketID,
    });
  });

  let room = '';
  // sending to all clients in the room (channel) except sender
  socket.on('message', message => socket.broadcast.to(room).emit('message', message));
  socket.on('find', () => {
    const url = socket.request.headers.referer.split('/');
    room = url[url.length - 1];
    const sr = io.sockets.adapter.rooms[room];
    if (sr === undefined) {
      // no room with such name is found so create it
      socket.join(room);
      socket.emit('create');
    } else if (sr.length === 1) {
      socket.emit('join');
    } else { // max two clients
      socket.emit('full', room);
    }
  });
  socket.on('auth', data => {
    data.sid = socket.id;
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('approve', data);
  });
  socket.on('accept', id => {
    io.sockets.connected[id].join(room);
    // sending to all clients in 'game' room(channel), include sender
    io.in(room).emit('bridge');
  });
  socket.on('reject', () => socket.emit('full'));
  socket.on('leave', () => {
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('hangup');
    socket.leave(room);});
});

const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server started on port ${port}`));
