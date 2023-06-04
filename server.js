const express = require('express');
const { GameManager } = require('./models.js');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;


let gameManager = new GameManager(io);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    socket.on('createGame', (gameName, nickName) => {
        gameManager.createGame(socket, gameName, nickName);
    });

    socket.on('joinGame', (gameName, nickName) => {
        gameManager.joinGame(socket, gameName, nickName);
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);
        gameManager.handleDisconnection(socket);
    });
});

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

module.exports = server;
