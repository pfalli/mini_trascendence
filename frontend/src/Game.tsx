import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [winner, setWinner] = useState<string | null>(null); // State to store the winner's name
  const [round, setRound] = useState<number | null>(null);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);

  // // 🎮 Sync paddle with mouse movement
  // useEffect(() => {
  //   const canvas = canvasRef.current;
  //   if (!canvas || !socket?.connected || !playerId) return;
  
  //   const handleMouseMove = (e: MouseEvent) => {
  //     const y = (e.clientY / canvas.clientHeight) * 100;
  //     socket.emit("paddle_move", { y });
  //     console.log("🖱️ Paddle move sent:", y); // debugging
  //   };
  
  //   canvas.addEventListener("mousemove", handleMouseMove);
  //   return () => canvas.removeEventListener("mousemove", handleMouseMove);
  // }, [playerId]); // 👈 depends on playerId (set after connect)

  // ✅ Focus window on mount so key events work
  useEffect(() => {
    window.focus();
  }, []);

  // Handle Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") {
        setDirection("up");
        socket.emit("paddle_move", { direction: "up" });
      } else if (e.key === "ArrowDown" || e.key === "s") {
        setDirection("down");
        socket.emit("paddle_move", { direction: "down" });
      }
    };
  
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "w" || e.key === "s") {
        setDirection(null);
        socket.emit("paddle_move", { direction: null });
      }
    };
  
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  
  
  // 🧠 Handle socket connection + game state
  useEffect(() => {
    socket = io("http://localhost:3000");

    socket.on("connect", () => {
      console.log("🟢 Connected:", socket.id);
      setPlayerId(socket.id || "unknown");
      socket.emit("join_matchmaking");
    });

    socket.on("match_found", (data) => {
      console.log("✅ Match found!", data);
    });

    socket.on("round_start", (data) => {
      setRound(data.round);
      // Hide after 2 seconds
      setTimeout(() => {
        setRound(null);
      }, 2000);
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

      // Paddles Drawing
      for (const [id, y] of Object.entries(gameState.paddles)) {
        const paddleY = y as number; // Cast 'y' to 'number'
        ctx.fillStyle = id === playerId ? "lime" : "red";
        ctx.fillRect(id === playerId ? 2 : 490, paddleY * 5, 10, 50);
      }
      
      // Ball. Remember Canvas: 500wide x 300tall
      const ball = gameState.ball;
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(ball.x * 5, ball.y * 5, 5, 0, Math.PI * 2); // That means your canvas is 500px x 300px, and you're multiplying the backend coordinates by 5.
      ctx.fill();

      // Dispaly Rounds
      if (round !== null) {
        ctx.fillStyle = "white";
        ctx.font = "28px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`🎯 ROUND ${round}`, canvas.width / 2, canvas.height / 2 - 30);
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
        <div style={{ color: 'blue', marginBottom: '10px', fontSize: '18px' }}>
          <strong>Score:</strong>{" "}
          {Object.values(gameState.scores).join(" - ")}
        </div>
      )}
  
      {/* 🎮 Canvas */}
      <canvas
        ref={canvasRef}
        tabIndex={0} // 👈 this is REQUIRED for canvas to be focusable
        width={500}
        height={300}
        onClick={() => {
          canvasRef.current?.focus();
          console.log("Canvas focused:", document.activeElement === canvasRef.current);
        }}
        style={{
          border: "2px solid white",
          background: "#000",
          outline: "none" // or '2px solid lime' for debugging
        }}
      />
    </div>
  );
};

export default Game;