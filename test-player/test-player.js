
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("🧪 Fake player connected:", socket.id);
  socket.emit("join_matchmaking");
});

// Simulate paddle movement up/down every second
let y = 30;
let direction = 1;

setInterval(() => {
  y += direction * 2;
  if (y > 80 || y < 10) direction *= -1;
  socket.emit("paddle_move", { y });
}, 100);
