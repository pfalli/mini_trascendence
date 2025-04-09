const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

let paddleY = 50; // Initial bot paddle position
let targetY = 50; // Where the ball is
let roomId = null;

socket.on("connect", () => {
  console.log("🤖 Bot connected:", socket.id);
  socket.emit("join_matchmaking");
});

socket.on("match_found", (data) => {
  roomId = data.roomId;
  console.log("✅ Bot matched in room:", roomId);
});

socket.on("game_state", (state) => {
  const ball = state.ball;
  const myY = state.paddles[socket.id];
  
  if (ball.y < myY) {
    socket.emit("paddle_move", { direction: "up" });
  } else if (ball.y > myY + 10) {
    socket.emit("paddle_move", { direction: "down" });
  } else {
    socket.emit("paddle_move", { direction: null });
  }
});

// ------------------mouse logic---------------------------------

// socket.on("game_state", (state) => { // FOR PERFECT BOT 🤖
//     const ball = state.ball;
  
//     // Always set targetY to the ball's position
//     targetY = ball.y;
//   });
  
//   // Perfect movement – always center the paddle on the ball
//   setInterval(() => {
//     paddleY = targetY;
  
//     // Clamp to boundaries just in case
//     paddleY = Math.max(0, Math.min(100, paddleY));
  
//     socket.emit("paddle_move", { y: paddleY });
//   }, 30); // fast reaction

// -----------------mouse logic imperfect bot---------------------------

// socket.on("game_state", (state) => {
//   const ball = state.ball;

//   // 80% chance to react slowly/wrong
//   const shouldFail = Math.random() < 0.8;

//   if (!shouldFail) {
//     // React to ball position with slight delay
//     targetY = ball.y;
//   } else {
//     // Wrong or late guess
//     targetY = ball.y + (Math.random() * 30 - 15); // ±15% error
//   }
// });

// // Simulate paddle movement toward targetY
// setInterval(() => {
//   // Smooth movement toward the targetY
//   const diff = targetY - paddleY;
//   paddleY += diff * 0.2; // 20% closer each frame

//   // Clamp paddleY between 0 and 100
//   paddleY = Math.max(0, Math.min(100, paddleY));

//   socket.emit("paddle_move", { y: paddleY });
// }, 100);

