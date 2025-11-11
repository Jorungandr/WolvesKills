// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" } // 允许所有来源（开发用，生产可限制）
});

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);

  socket.on('join_room', (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: {} };
    }
    const room = rooms[roomId];

    if (Object.keys(room.players).length >= 4) {
      socket.emit('error', '房间已满');
      return;
    }

    // 初始化玩家位置（随机）
    const x = 100 + Math.random() * 600;
    const y = 100 + Math.random() * 400;
    room.players[socket.id] = { x, y, dir: 'right', color: '#' + Math.floor(Math.random()*16777215).toString(16) };

    socket.join(roomId);
    io.to(roomId).emit('game_state', room);
  });

  socket.on('change_direction', (dir) => {
    const roomsOfSocket = Array.from(socket.rooms).filter(r => r !== socket.id);
    if (roomsOfSocket.length === 0) return;
    const roomId = roomsOfSocket[0];
    const room = rooms[roomId];
    if (room.players[socket.id]) {
      room.players[socket.id].dir = dir;
    }
  });

  socket.on('disconnect', () => {
    // 清理断开的玩家
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit('game_state', rooms[roomId]);
        break;
      }
    }
  });
});

// 游戏主循环
setInterval(() => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    for (const pid in room.players) {
      const p = room.players[pid];
      if (p.dir === 'up') p.y -= 3;
      else if (p.dir === 'down') p.y += 3;
      else if (p.dir === 'left') p.x -= 3;
      else if (p.dir === 'right') p.x += 3;

      // 边界回绕
      if (p.x < 0) p.x = 800;
      if (p.x > 800) p.x = 0;
      if (p.y < 0) p.y = 600;
      if (p.y > 600) p.y = 0;
    }
    io.to(roomId).emit('game_state', room);
  }
}, 50); // 20 FPS

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});