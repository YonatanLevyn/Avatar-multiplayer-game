# Avatar Multiplayer Game
This is a multiplayer game inspired by the Avatar universe. 
The project is primarily focused on backend development and could serve as the basis for a more advanced and comprehensive game.


## Technologies Used

- Node.js
- Socket.IO for real-time communication
- HTML, CSS, and JavaScript for the frontend

## Why I chose them

Node.js gives us a uniform JavaScript coding environment for both frontend and backend, 
ensuring streamlined development and efficient data handling, making it suitable for small and simple project like this one. 

Socket.IO was preferred over plain WebSockets due to its high-level API that abstracts connection management.

## Implementation 

The game server uses a `GameManager` to manage multiple games, each represented by a `Game` instance. 
Each game consists of multiple players, represented by `Player` instances, in a `World` grid.
players can create a new game or join an existing game by entering a game name. 
The server communicates with the client to update the game state in real-time. 
The game state updates include player movements, changes in life, and notifications when a player is defeated.

## Game Mechanics

- Players start with a life of 10.
- Each player is assigned an element when joining the game.
- Players can move using the arrow keys and can use their bending abilities with the 'b' key. 
- When two players move to the same grid cell, they engage in combat. The life of the player who loses the combat will decrease. 
- The game continues until there is only one player remaining.

## Running the Game Locally

1. Clone this repository.
2. Install Node.js.
3. Run `npm install` to install the dependencies.
4. Run `node server.js` to start the game server.
5. Open your web browser and go to `http://localhost:3000` to start the game.
