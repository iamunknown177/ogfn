import { v4 as uuidv4 } from "uuid";

export type SessionState = "waiting" | "starting" | "in-progress" | "ended";
export type GameMode = "solo" | "duo" | "squad" | "ltm";

export class MatchmakingSession {
  id: string;
  mode: GameMode;
  region: string;
  players: string[];
  maxPlayers: number;
  state: SessionState;
  createdAt: number;

  constructor(mode: GameMode, region: string, maxPlayers: number) {
    this.id = uuidv4();
    this.mode = mode;
    this.region = region;
    this.players = [];
    this.maxPlayers = maxPlayers;
    this.state = "waiting";
    this.createdAt = Date.now();
  }

  addPlayer(accountId: string): boolean {
    if (this.state !== "waiting") return false;
    if (this.players.length >= this.maxPlayers) return false;
    if (this.players.includes(accountId)) return false;

    this.players.push(accountId);
    return true;
  }

  removePlayer(accountId: string): void {
    this.players = this.players.filter((p) => p !== accountId);
  }

  canStart(): boolean {
    return this.state === "waiting" && this.players.length > 0;
  }

  start(): void {
    this.state = "in-progress";
  }

  end(): void {
    this.state = "ended";
  }
}
