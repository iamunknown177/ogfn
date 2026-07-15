import express from "express";
import { MatchmakingSession } from "./session";

const sessions = new Map<string, MatchmakingSession>();

export async function startMatchmakerServer(port: number): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/matchmaking/session/list", (_req, res) => {
    const activeSessions = Array.from(sessions.values()).map((s) => ({
      id: s.id,
      mode: s.mode,
      region: s.region,
      playerCount: s.players.length,
      maxPlayers: s.maxPlayers,
      state: s.state,
    }));
    res.json({ sessions: activeSessions });
  });

  app.post("/matchmaking/session/create", (req, res) => {
    const { mode, region, accountId } = req.body;

    const validModes = ["solo", "duo", "squad", "ltm"];
    const sessionMode = validModes.includes(mode) ? mode : "solo";
    const maxPlayers = sessionMode === "solo" ? 100 : sessionMode === "duo" ? 50 : sessionMode === "squad" ? 25 : 50;

    const session = new MatchmakingSession(sessionMode, region || "NAE", maxPlayers);

    if (accountId) {
      session.addPlayer(accountId);
    }

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
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const { accountId } = req.body;
    if (!accountId) {
      res.status(400).json({ error: "accountId required" });
      return;
    }

    const added = session.addPlayer(accountId);
    if (!added) {
      res.status(400).json({ error: "Session full or already started" });
      return;
    }

    res.json({ status: "success", sessionId: session.id, playerCount: session.players.length });
  });

  app.post("/matchmaking/session/:sessionId/leave", (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const { accountId } = req.body;
    session.removePlayer(accountId);

    res.json({ status: "success", playerCount: session.players.length });
  });

  app.post("/matchmaking/session/:sessionId/start", (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (!session.canStart()) {
      res.status(400).json({ error: "Cannot start session yet" });
      return;
    }

    session.start();

    res.json({
      status: "success",
      sessionId: session.id,
      state: session.state,
      players: session.players,
    });
  });

  app.post("/matchmaking/session/:sessionId/end", (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    session.end();
    res.json({ status: "success", sessionId: session.id, state: session.state });
  });

  return new Promise((resolve) => {
    app.listen(port, () => {
      resolve();
    });
  });
}
