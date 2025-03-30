const { io } = require("socket.io-client");

// Connects to your backend Socket.IO server
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("✅ Connected to backend as:", socket.id);

  // Sends a custom message to the server
  socket.emit("ping");
});

// Listens for the response from the server
socket.on("pong", () => {
  console.log("🎉 Received pong from backend!");
  socket.disconnect();
});

// Disconnects after receiving pong
socket.on("disconnect", () => {
  console.log("❌ Disconnected from backend");
});
