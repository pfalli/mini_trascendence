import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [winner, setWinner] = useState<string | null>(null); // State to store the winner's name

  // 🎮 Sync paddle with mouse movement
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const y = (e.clientY / canvas.clientHeight) * 100; // percent
      socket.emit("paddle_move", { y });
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    return () => canvas.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // 🧠 Handle socket connection + game state
  useEffect(() => {
    socket = io("http://localhost:3000");

    socket.on("connect", () => {
      console.log("🟢 Connected:", playerId);
      setPlayerId(playerId);
      socket.emit("join_matchmaking");
    });

    socket.on("match_found", (data) => {
      console.log("✅ Match found!", data);
    });

    socket.on("game_state", (state: GameState) => {
      setGameState(state);
    });

    socket.on("game_over", (data) => {
      console.log("🏁 Game Over:", data);
      setWinner(data.winner); // Store the winner's name
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 🖌️ Render the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ball
      const ball = gameState.ball;
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(ball.x * 5, ball.y * 5, 5, 0, Math.PI * 2);
      ctx.fill();

      // Paddles
      for (const [id, y] of Object.entries(gameState.paddles)) {
        const paddleY = y as number; // Cast 'y' to 'number'
        ctx.fillStyle = id === playerId ? "lime" : "red";
        ctx.fillRect(id === playerId ? 10 : 480, paddleY * 5, 10, 50);
      }

      // Display winner if the game is over
      if (winner) {
        ctx.fillStyle = "white";
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`🏆 Winner: ${winner}`, canvas.width / 2, canvas.height / 2);
      }
    };

    draw();
  }, [gameState, playerId, winner]);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>🎮 Pong Game</h2>
  
      {/* 👇 Live Score Display */}
      {gameState && (
        <div style={{ color: 'white', marginBottom: '10px', fontSize: '18px' }}>
          <strong>Score:</strong>{" "}
          {Object.values(gameState.scores).join(" - ")}
        </div>
      )}
  
      {/* 🎮 Canvas */}
      <canvas
        ref={canvasRef}
        width={500}
        height={300}
        style={{
          border: "2px solid white",
          background: "#000"
        }}
      />
    </div>
  );
};

export default Game;