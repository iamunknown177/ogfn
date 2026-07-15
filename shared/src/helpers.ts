import { v4 as uuidv4 } from 'uuid';
import type {
  Account,
  Profile,
  Loadout,
  PlayerStats,
  Inventory,
  BattlePassInfo,
} from './types';

export function generateId(): string {
  return uuidv4();
}

export function createAccount(
  username: string,
  displayName: string,
  discordId: string,
  discordUsername: string,
  discordAvatar: string | null = null
): Account {
  return {
    id: generateId(),
    username,
    displayName,
    discordId,
    discordUsername,
    discordAvatar,
    createdAt: new Date(),
  };
}

export function createProfile(accountId: string, displayName: string): Profile {
  const defaultLoadout: Loadout = {
    id: generateId(),
    name: 'Default',
    character: 'CID_001_Athena_Commando_M_Default',
    backBlings: [],
    pickaxe: 'Pickaxe_ID_001_Default',
    glider: 'Glider_ID_001_Default',
    emotes: ['EID_DanceMoves'],
  };

  const stats: PlayerStats = {
    wins: 0,
    kills: 0,
    matchesPlayed: 0,
    topTen: 0,
    topTwentyFive: 0,
    minutesPlayed: 0,
  };

  const inventory: Inventory = {
    items: [],
    currencies: [
      { name: 'MtxCurrency', amount: 0 },
      { name: 'Currency_Gold', amount: 0 },
    ],
  };

  const battlePass: BattlePassInfo = {
    season: 24,
    tier: 1,
    xp: 0,
    purchased: false,
  };

  return {
    accountId,
    displayName,
    level: 1,
    xp: 0,
    battlePass,
    inventory,
    loadouts: [defaultLoadout],
    stats,
  };
}
