import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { prisma } from './prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = "supersecret"; // move to .env

const fastify = Fastify({
  logger: true
});


async function start() {
  try {
    await fastify.register(cors, { origin: '*' });

    fastify.get('/', async () => {
      return { message: 'ft_transcendence backend up!' };
    });

    fastify.get('/users', async () => {
      const users = await prisma.user.findMany();
      return users;
    });

    fastify.post('/register', async (request, reply) => {
      const { email, username, password } = request.body as any;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(400).send({ error: 'User already exists' });
      }
      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, username, password: hashed }
      });
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
      return { token, user: { id: user.id, email: user.email, username: user.username } };
    });

    fastify.post('/login', async (request, reply) => {
      const { email, password } = request.body as any;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(400).send({ error: 'Invalid credentials' });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return reply.code(400).send({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
      return { token, user: { id: user.id, email: user.email, username: user.username } };
    });

    await fastify.listen({ port: 3000 });

    const io = new Server(fastify.server, { cors: { origin: '*' } });

    let waitingPlayer: string | null = null;

    interface GameState {
      ball: { x: number; y: number; dx: number; dy: number };
      paddles: { [socketId: string]: number };
      scores: { [socketId: string]: number };
    }

    const activeGames = new Map<string, GameState>();
    const paddleDirections = new Map<string, "up" | "down" | null>()
    let roundCounter = 1;

    function resetBall(ball: { x: number; y: number; dx: number; dy: number }, roomId: string) {
      ball.x = 50; // This is in percent, not pixels. You're using a virtual grid of 100x100 units.
      ball.y = 30; // *** more in the middle Canvas 500x300 ***
      ball.dx = 0;
      ball.dy = 0;
    
      // Notify frontend about round number
      io.to(roomId).emit('round_start', { round: roundCounter });
      
      // Wait 2 seconds, then launch ball
      setTimeout(() => {
        ball.dx = (Math.random() > 0.5 ? 1 : -1) * 0.8;
        ball.dy = (Math.random() > 0.5 ? 1 : -1) * 0.8;
        roundCounter++;
      }, 2000);
    }

    io.on('connection', (socket) => {
      console.log('🔌 User connected:', socket.id);

      socket.on('join_matchmaking', () => {
        if (waitingPlayer) {
          const roomId = `game-${waitingPlayer}-${socket.id}`;
          socket.join(roomId);
          io.to(waitingPlayer).socketsJoin(roomId);

          const initialGame: GameState = {
            ball: { x: 50, y: 50, dx: 2, dy: 2 },
            paddles: { [waitingPlayer]: 50, [socket.id]: 50 },
            scores: { [waitingPlayer]: 0, [socket.id]: 0 },
          };

          activeGames.set(roomId, initialGame);

          io.to(roomId).emit('match_found', {
            roomId,
            players: [waitingPlayer, socket.id],
          });

          console.log(`🎮 Match started in room ${roomId}`);

          const interval = setInterval(async () => {
            const game = activeGames.get(roomId);
            if (!game) return;

            const { ball, paddles, scores } = game;
            const players = Object.keys(paddles);
            const [left, right] = players;

            for (const playerId of players) {
              const dir = paddleDirections.get(playerId);
              if (dir === "up") {
                paddles[playerId] = Math.max(0, paddles[playerId] - 1.5); // move up
              } else if (dir === "down") {
                paddles[playerId] = Math.min(100, paddles[playerId] + 1.5); // move down
              }
            }

            // Move ball
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Bounce off top and bottom
            if (ball.y <= 0 || ball.y >= 60) { // adjusted here because 100 was off-screen, because Canvas in frontend uses pixel scaling (x5) 
              ball.dy *= -1;
            }

            // Ball hits left wall
            if (ball.x <= 0) {
              const paddleY = paddles[left];
              if (ball.y >= paddleY && ball.y <= paddleY + 20) {
                ball.dx *= -1;
                ball.x = 2; // bouncing on the paddle
              } else {
                scores[right]++;
                if (scores[right] >= 5) {
                  io.to(roomId).emit('game_over', { winner: right, scores });
                  try {
                    await prisma.match.create({
                      data: {
                        player1: left,
                        player2: right,
                        winner: right,
                        score1: scores[left],
                        score2: scores[right],
                      },
                    });
                    console.log('✅ Match saved to DB');
                  } catch (err) {
                    console.error('❌ Error saving match:', err);
                  }
                  clearInterval(interval);
                  activeGames.delete(roomId);
                  return;
                }
                resetBall(ball, roomId);
              }
            }

            // Ball hits right wall
            if (ball.x >= 100) {
              const paddleY = paddles[right];
              if (ball.y >= paddleY && ball.y <= paddleY + 20) {
                ball.dx *= -1;
                ball.x = 98; // bouncing on the paddle
              } else {
                scores[left]++;
                if (scores[left] >= 5) {
                  io.to(roomId).emit('game_over', { winner: left, scores });
                  try {
                    await prisma.match.create({
                      data: {
                        player1: left,
                        player2: right,
                        winner: left,
                        score1: scores[left],
                        score2: scores[right],
                      },
                    });
                    console.log('✅ Match saved to DB');
                  } catch (err) {
                    console.error('❌ Error saving match:', err);
                  }
                  clearInterval(interval);
                  activeGames.delete(roomId);
                  return;
                }
                resetBall(ball, roomId);
              }
            }

            io.to(roomId).emit('game_state', {
              ball,
              paddles,
              scores,
            });
          }, 1000 / 60);

          waitingPlayer = null;
        } else {
          waitingPlayer = socket.id;
          console.log('⏳ Waiting for opponent...');
        }
      });

      socket.on("paddle_move", (data) => {
        // console.log(`🛠️ Direction received from ${socket.id}:`, data.direction);
        paddleDirections.set(socket.id, data.direction);
      });

      socket.on('disconnect', () => {
        if (waitingPlayer === socket.id) {
          waitingPlayer = null;
        }
        console.log('❌ User disconnected:', socket.id);
      });
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
