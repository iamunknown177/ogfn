export interface Account {
  id: string;
  username: string;
  displayName: string;
  discordId: string;
  discordUsername: string;
  discordAvatar: string | null;
  createdAt: Date;
}

export interface Profile {
  accountId: string;
  displayName: string;
  level: number;
  xp: number;
  battlePass: BattlePassInfo;
  inventory: Inventory;
  loadouts: Loadout[];
  stats: PlayerStats;
}

export interface BattlePassInfo {
  season: number;
  tier: number;
  xp: number;
  purchased: boolean;
}

export interface Inventory {
  items: InventoryItem[];
  currencies: Currency[];
}

export interface InventoryItem {
  id: string;
  templateId: string;
  quantity: number;
  attributes: Record<string, unknown>;
}

export interface Currency {
  name: string;
  amount: number;
}

export interface Loadout {
  id: string;
  name: string;
  character: string;
  backBlings: string[];
  pickaxe: string;
  glider: string;
  emotes: string[];
}

export interface PlayerStats {
  wins: number;
  kills: number;
  matchesPlayed: number;
  topTen: number;
  topTwentyFive: number;
  minutesPlayed: number;
}

export interface MatchInfo {
  id: string;
  mode: GameMode;
  region: string;
  players: string[];
  maxPlayers: number;
  state: MatchState;
  createdAt: Date;
}

export type GameMode =
  | 'solo'
  | 'duo'
  | 'squad'
  | 'ltm'
  | 'playground'
  | 'creative';

export type MatchState =
  | 'waiting'
  | 'starting'
  | 'in_progress'
  | 'ended';

export interface ServerConfig {
  port: number;
  wsPort: number;
  assetPort: number;
  matchmakerPort: number;
  version: string;
  serverName: string;
  maxPlayers: number;
}
