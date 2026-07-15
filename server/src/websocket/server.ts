import { WebSocketServer, WebSocket } from "ws";

const connectedPlayers = new Map<string, WebSocket>();

export function startWebSocketServer(port: number): void {
  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws) => {
    const playerId = "player-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    connectedPlayers.set(playerId, ws);

    console.log(`[WS] Player connected: ${playerId} (total: ${connectedPlayers.size})`);

    ws.send(
      JSON.stringify({
        type: "welcome",
        playerId,
        message: "Connected to OGFN 24.20 WebSocket server",
      })
    );

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch {
        console.log("[WS] Received non-JSON message");
      }
    });

    ws.on("close", () => {
      connectedPlayers.delete(playerId);
      console.log(`[WS] Player disconnected: ${playerId} (total: ${connectedPlayers.size})`);
    });

    ws.on("error", (err) => {
      console.error(`[WS] Error for ${playerId}:`, err.message);
      connectedPlayers.delete(playerId);
    });
  });

  console.log(`[WS] WebSocket server listening on port ${port}`);
}

export function broadcast(message: object): void {
  const data = JSON.stringify(message);
  connectedPlayers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

export function getPlayerCount(): number {
  return connectedPlayers.size;
}
