const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("🟢 Player 2 connected:", socket.id);
  socket.emit("join_matchmaking");
});

socket.on("match_found", (data) => {
  console.log("✅ Player 2 matched:", data);
  socket.disconnect();
});

socket.on("disconnect", () => {
  console.log("❌ Player 2 disconnected");
});
