# ft_transcendence

> A full-stack, real-time multiplayer Pong platform with authentication, matchmaking, chat, and game history. Built from scratch using React, Fastify, Prisma, and Docker — fully compliant with the 42 school's ft_transcendence project rules.

---

## how to run it

'''bash
npm install ./frontend ./backend

npm run dev ./frontend ./backend
'''

## 🧠 Project Overview

This project is a Single Page Application (SPA) that allows registered users to:

- Log in and play a Pong game live with other users  
- Match with random opponents  
- See the game rendered live using WebSockets  
- Chat with the opponent in real-time  
- See previous matches and scores  
- Authenticate via local login and (optionally) Google  
- Run the app entirely in Docker with full control over backend/frontend/database  

Everything was built from scratch, with no full-featured libraries (as required by 42), and each part of the project followed a specific Thema (development topic).

---

## 🚧 Themen Roadmap

| #  | Thema                | Description                                         | Status    |
|----|----------------------|-----------------------------------------------------|-----------|
| 1  | Development Setup    | Environment with Node, TypeScript, and Vite         | ✅ Done    |
| 2  | Project Structure    | Monorepo structure with frontend & backend          | ✅ Done    |
| 3  | Frontend Setup       | React SPA using Vite                                | ✅ Done    |
| 4  | Backend Setup        | Fastify API with WebSocket server                   | ✅ Done    |
| 5  | Database             | Prisma ORM with SQLite                              | ✅ Done    |
| 6  | Authentication       | Register, login with hashed passwords and JWT       | ✅ Done    |
| 7  | Matchmaking          | Waiting queue and room-based game match             | ✅ Done    |
| 8  | Game Logic           | Real-time Pong with collision, scoring, game end    | ✅ Done    |
| 9  | Match History        | Saved and displayed match results                   | ✅ Done    |
| 10 | In-Game Chat         | Socket-based chat inside game rooms                 | ✅ Done    |
| 11 | Docker               | Containerization with Docker & Compose              | ✅ Done    |
| 12 | Logging & Monitoring | Planning ELK stack for logs                         | 🕓 Planned |

---

## 🧰 Thema 1: Development Environment Setup

- Installed Node.js via `nvm`, TypeScript, ts-node  
- Setup Vite for the frontend  
- Used SQLite for easy database storage  
- Used Prisma for DB modeling and migrations  
- Setup scripts and project folder structure  

---

## 🗂️ Thema 2: Project Structure

Project is structured as a monorepo:



---

## 🖥️ Thema 3: Frontend (React SPA)

- Bootstrapped with Vite + React + TypeScript  
- Created a `Game` component with canvas rendering  
- Used `socket.io-client` to connect to backend  
- Added live scoreboard, winner message on canvas  
- Avoided Tailwind (due to early install errors) and used plain CSS  

---

## ⚙️ Thema 4: Backend (Fastify + Socket.IO)

- Setup Fastify server with CORS support  
- Added routes: `/register`, `/login`, `/users`, `/`  
- Integrated Socket.IO to handle:  
  - Matchmaking  
  - Game state sync  
  - Paddle movements  
  - In-game chat  
- Socket.IO rooms separate each game session  

---

## 🗄️ Thema 5: Database (Prisma + SQLite)

Defined `User` and `Match` models:

```ts
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  username  String
  password  String
  createdAt DateTime @default(now())
}

model Match {
  id        Int      @id @default(autoincrement())
  player1   String
  player2   String
  winner    String
  score1    Int
  score2    Int
  playedAt  DateTime @default(now())
}
```

## 🔐 Thema 6: Auth System (Local)

- Hashed passwords with **bcrypt**
- Generated and verified tokens with **jsonwebtoken**
- Implemented backend endpoints:
  - `POST /register` — creates user with hashed password
  - `POST /login` — validates credentials and returns a JWT
- Auth flow:
  1. User registers with email, username, password
  2. Backend hashes password and stores it
  3. On login, the password is compared via bcrypt
  4. If valid, a JWT is returned for the session
- Planned: Google OAuth 2.0 login with passport.js or manual OAuth flow
- Protected routes using JWT decoding middleware (planned)

---

## 🕹️ Thema 7: Matchmaking Logic

- Used a **simple queue-based matchmaking system**:
  ```ts
  let waitingPlayer: string | null = null;
```

How it works:

When the first player connects and emits join_matchmaking, they are stored in waitingPlayer.

When the next player connects:

A room is created:
```
const roomId = `game-${waitingPlayer}-${socket.id}`;
```

Both players join that room using:
```
socket.join(roomId);
io.to(waitingPlayer).socketsJoin(roomId);
```

A new game state is created and stored:
```
        activeGames.set(roomId, {
          ball: { x: 50, y: 50, dx: 2, dy: 2 },
          paddles: { [waitingPlayer]: 50, [socket.id]: 50 },
          scores: { [waitingPlayer]: 0, [socket.id]: 0 }
        });
```
The server emits a match_found event to both players with their room and IDs:
```
io.to(roomId).emit('match_found', {
  roomId,
  players: [waitingPlayer, socket.id]
});
```
This allowed full separation of game sessions via Socket.IO rooms, enabling multiple games in parallel without cross-talk.

After starting a match, the waitingPlayer variable is reset to null for the next pair of players.


## 🎮 Thema 8: Game Loop (Pong)

- The game loop runs at **60 frames per second** using:

  ```ts
  setInterval(() => {
    // game logic
  }, 1000 / 60);
```
Each active game has a GameState object stored in a Map<string, GameState>:
```
interface GameState {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { [socketId: string]: number };
  scores: { [socketId: string]: number };
}
```

###🟡 Ball Movement

    The ball moves on each loop iteration by updating its x and y positions:
```
    ball.x += ball.dx;
    ball.y += ball.dy;'
```
⬆️⬇️ Wall Collision

    If the ball hits the top (y <= 0) or bottom (y >= 100) of the field:
```
    if (ball.y <= 0 || ball.y >= 100) {
      ball.dy *= -1;
    }
```

🟥 Paddle Collision

    If the ball hits the paddle (left or right), it bounces back:

        Check if ball's y is within the paddle's position range

        If yes: invert dx and clamp ball position to paddle edge

        If no: point scored by the opponent

🏁 Scoring & Game End

    If the ball passes a paddle (miss):

        Opponent’s score increases by 1

        Ball is reset to the center

    First player to reach 5 points wins the match

    When game ends:

        Backend emits game_over with winner and score

        Interval is cleared:
```
        clearInterval(interval);
        activeGames.delete(roomId);
```
### 🔄 Ball Reset Function

    After each score, the ball resets to the center with random direction:
```
    function resetBall(ball) {
      ball.x = 50;
      ball.y = 50;
      ball.dx = (Math.random() > 0.5 ? 1 : -1) * 0.8;
      ball.dy = (Math.random() > 0.5 ? 1 : -1) * 0.8;
    }
```
### ⚙️ Ball Speed

    Ball speed can be changed by modifying dx and dy

        Example for slower game:
```
dx = 0.8;
dy = 0.8;
```
