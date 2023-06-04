class Game {
    constructor(io, name, worldSize) {
        this.io = io;
        this.name = name;
        this.players = new Map();
        this.elements = ['fire', 'water', 'earth', 'air'];
        this.timer = Date.now();
        this.world = new World(worldSize);
    }

    movePlayer(playerId, dx, dy) {
        const player = this.players.get(playerId);
        if (!player) {
            console.log(`Player with id ${playerId} not found`);
            return;
        }

        const newX = (player.location.x + dx + this.world.size) % this.world.size;
        const newY = (player.location.y + dy + this.world.size) % this.world.size;

        // Check if there is a combat
        const otherPlayer = this.world.grid[newX][newY];
        if (otherPlayer) {
            console.log(`Combat (${newX}, ${newY})`);

            // special power of bending player
            if (player.bending) {
                otherPlayer.life -= 3;
            } else {
                otherPlayer.life--;
            }

            this.io.to(this.name).emit('playerLife', otherPlayer.id, otherPlayer.life);

            if (otherPlayer.life <= 0) {
                this.removePlayer(otherPlayer.id);
                this.io.to(this.name).emit('playerDied', otherPlayer.id, player.id);

            }
        } else {
            this.world.removeEntity(player);
            player.location.x = newX;
            player.location.y = newY;
            this.world.addEntity(player);
        }
    }

    addPlayer(id, nickName) {
        let location = this.world.getEmptyLocation();
        const gameName = this.name;
        const element = this.nextElement();
        const player = new Player(id, nickName, element, location, gameName);
        this.players.set(id, player);
        this.world.addEntity(player);
        return player;
    }
    
    nextElement() {
        const element = this.elements.shift();
        this.elements.push(element);
        return element;
    }

    removePlayer(id) {
        const player = this.players.get(id);
        this.world.removeEntity(player);
        this.players.delete(id);
    }
    
    getPlayerCount() {
        return this.players.size;
    }
    
    getElapsedTime() {
        const now = Date.now();
        return now - this.startTime;
    }
}

class Player {
    constructor(id, nickName, element, location, gameName) {
        this.id = id;
        this.nickName = nickName;
        this.gameName = gameName;
        this.element = element;
        this.location = location;
        this.life = 10;
        this.score = 0;
        this.bending = false;
    }
}

class World {
    constructor(size) {
        this.size = size;
        this.grid = Array.from({length: size}, () => Array.from({length: size}, () => null));
    }

    addEntity(entity) {
        this.grid[entity.location.x][entity.location.y] = entity;
    }

    removeEntity(entity) {
        this.grid[entity.location.x][entity.location.y] = null;
    }

    getEmptyLocation() {
        let x, y;
        do {
            x = Math.floor(Math.random() * this.size);
            y = Math.floor(Math.random() * this.size);
        } while (this.grid[x][y] !== null)
        return { x, y };
    }
}

class GameManager {
    constructor(io) {
        this.io = io;
        this.games = new Map();
        this.gameTimerInterval = null;
        this.worldSize = 10;
    }

    createGame(socket, gameName, nickName) {
        if (!this.games.has(gameName)) {
            const game = new Game(this.io, gameName, this.worldSize);
            this.games.set(gameName, game);
            console.log(`Game ${gameName} created`);

            // Start the timer 
            const startTime = Date.now();
            this.gameTimerInterval = setInterval(() => {
                game.timer = Date.now() - startTime;
                
                this.io.to(gameName).emit('timer', game.timer);
            }, 1000);

            this.setupGameHandlers(socket, game, nickName);
            
        }else {
            console.log(`Game ${gameName} already exists`);
        }
    }

    joinGame(socket, gameName, nickName) {
        if (this.games.has(gameName)) {
            console.log(`User ${socket.id} joined game ${gameName}`);
            this.setupGameHandlers(socket, this.games.get(gameName), nickName);
        }
        else {
            console.log(`Game ${gameName} does not exist`);
        }
    }

    setupGameHandlers(socket, game, nickName) {

        // Join the game room
        socket.join(game.name);

        // Set the game name to the socket
        socket.gameName = game.name;

        // Add the player to the game
        const player = game.addPlayer(socket.id, nickName);

        // Send the list of players to the new player
        socket.emit('currentPlayers', Array.from(game.players.values()));

        // Broadcast new player to connected socket clients
        socket.broadcast.to(game.name).emit('newPlayer', player);

        // Keep track of the players life
        socket.emit('playerLife', player.life);
        

        socket.on('playerMovement', (movementData) => {
            this.handlePlayerMovement(socket, game, movementData);
        });

        socket.on('bend', () => {
            player.bending = true;
            console.log(`Player ${socket.id} has gained bending abilities`);
            this.io.to(game.name).emit('playerBent',socket.id, player);
        });
    
    }

    handlePlayerMovement(socket, game, movementData) {
        if (!movementData || typeof movementData.dx !== 'number' || typeof movementData.dy !== 'number') {
            console.log(`Invalid movement data received from user ${socket.id}`);
            return;
        }

        game.movePlayer(socket.id, movementData.dx, movementData.dy);
        this.io.to(game.name).emit('playerMoved', socket.id, game.players.get(socket.id));
    }

    setupBendHandler(socket, game) {
        socket.on('bend', () => {
            const player = game.players.get(socket.id);
            if (player) {
                player.bending = true;
                console.log(`Player ${socket.id} has gained bending abilities`);
                this.io.to(game.name).emit('playerBent',socket.id, player);
            }
        });
    }

    handleDisconnection(socket) {
        socket.on('disconnect', () => {
            const gameName = socket.gameName;

            console.log(`User ${socket.id} disconnected`);

            if (!gameName) {
                throw new Error('No game name in socket');
            }
    
            const game = this.games.get(gameName);
            if (!game) {
                throw new Error('Game does not exist');
            }

            game.removePlayer(socket.id);
            this.io.to(gameName).emit('playerDisconnected', socket.id);
    
            if (game.getPlayerCount() > 0) {
                return;
            }

            // No players left in the game so end it
            clearInterval(this.gameIntervals.get(gameName));
            this.gameIntervals.delete(gameName);
            this.games.delete(gameName);
            console.log(`Game ${gameName} ended`);
        });
    }
}

module.exports = { GameManager };


