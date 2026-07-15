import express from "express";
import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { profileRouter } from "./routes/profile";
import { catalogRouter } from "./routes/catalog";
import { authRouter } from "../auth";
import { config } from "../config";
import { MatchmakingSession } from "../matchmaker/session";

const sessions = new Map<string, MatchmakingSession>();
const connectedPlayers = new Map<string, WebSocket>();

function setupMatchmakerRoutes(app: express.Application): void {
  app.get("/matchmaking/session/list", (_req, res) => {
    const active = Array.from(sessions.values()).map((s) => ({
      id: s.id,
      mode: s.mode,
      region: s.region,
      playerCount: s.players.length,
      maxPlayers: s.maxPlayers,
      state: s.state,
    }));
    res.json({ sessions: active });
  });

  app.post("/matchmaking/session/create", (req, res) => {
    const { mode, region, accountId } = req.body;
    const validModes = ["solo", "duo", "squad", "ltm"];
    const sessionMode = validModes.includes(mode) ? mode : "solo";
    const maxPlayers =
      sessionMode === "solo" ? 100 : sessionMode === "duo" ? 50 : sessionMode === "squad" ? 25 : 50;

    const session = new MatchmakingSession(sessionMode, region || "NAE", maxPlayers);
    if (accountId) session.addPlayer(accountId);
    sessions.set(session.id, session);

    res.json({
      status: "success",
      sessionId: session.id,
      session: {
        id: session.id,
        mode: session.mode,
        region: session.region,
        playerCount: session.players.length,
        maxPlayers: session.maxPlayers,
        state: session.state,
      },
    });
  });

  app.post("/matchmaking/session/:sessionId/join", (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    const { accountId } = req.body;
    if (!accountId) { res.status(400).json({ error: "accountId required" }); return; }

    const added = session.addPlayer(accountId);
    if (!added) { res.status(400).json({ error: "Session full or already started" }); return; }

    res.json({ status: "success", sessionId: session.id, playerCount: session.players.length });
  });

  app.post("/matchmaking/session/:sessionId/leave", (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    session.removePlayer(req.body.accountId);
    res.json({ status: "success", playerCount: session.players.length });
  });

  app.post("/matchmaking/session/:sessionId/start", (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    if (!session.canStart()) { res.status(400).json({ error: "Cannot start" }); return; }
    session.start();
    res.json({ status: "success", sessionId: session.id, state: session.state, players: session.players });
  });

  app.post("/matchmaking/session/:sessionId/end", (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    session.end();
    res.json({ status: "success", sessionId: session.id, state: session.state });
  });
}

function setupWebSocket(server: http.Server): void {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    const playerId = "player-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    connectedPlayers.set(playerId, ws);
    console.log(`[WS] Player connected: ${playerId} (total: ${connectedPlayers.size})`);

    ws.send(JSON.stringify({ type: "welcome", playerId, message: "Connected to OGFN 24.20" }));

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch {}
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

  console.log(`[WS] WebSocket attached to HTTP server`);
}

export async function startApiServer(port: number): Promise<void> {
  const app = express();
  app.use(express.json());

  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });

  app.use("/auth", authRouter);
  app.use("/fortnite/api/game/v2/profile", profileRouter);
  app.use("/fortnite/api/storefront", catalogRouter);

  app.post("/fortnite/api/matchmaking/session/findPlayer", (req, res) => {
    res.json({ accountId: req.body.accountId || "anonymous", sessionId: "session-" + Date.now() });
  });

  app.post("/fortnite/api/matchmaking/session/:sessionId/join", (req, res) => {
    res.json({ status: "success", sessionId: req.params.sessionId });
  });

  setupMatchmakerRoutes(app);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "24.20", players: connectedPlayers.size });
  });

  app.get("/", (_req, res) => {
    res.json({ name: "OGFN 24.20", status: "running" });
  });

  const server = http.createServer(app);
  setupWebSocket(server);

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve();
    });
  });
}
