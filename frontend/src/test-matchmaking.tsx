import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

function Test() {
  const [matchInfo, setMatchInfo] = useState<any>(null);

  useEffect(() => {
    socket = io("http://localhost:3000");

    socket.on("connect", () => {
      console.log("🟢 Connected:", socket.id);
      socket.emit("join_matchmaking");
    });

    socket.on("match_found", (data) => {
      console.log("✅ Match found!", data);
      setMatchInfo(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>🎮 ft_transcendence Frontend</h1>
      {matchInfo ? (
        <div>
          <h2>✅ Match Found</h2>
          <p><strong>Room:</strong> {matchInfo.roomId}</p>
          <p><strong>Players:</strong> {matchInfo.players.join(" vs ")}</p>
        </div>
      ) : (
        <p>⏳ Searching for opponent...</p>
      )}
    </div>
  );
}

export default Test;