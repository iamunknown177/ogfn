import { v4 as uuidv4 } from "uuid";
import type { Account } from "@ogfn/shared";

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
}

interface AuthToken {
  accountId: string;
  discordId: string;
  createdAt: number;
  expiresAt: number;
}

const accounts = new Map<string, Account>();
const tokens = new Map<string, AuthToken>();
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function findOrCreateAccount(discordUser: DiscordUser): {
  account: Account;
  token: string;
  isNew: boolean;
} {
  let account = getAccountByDiscordId(discordUser.id);
  let isNew = false;

  if (!account) {
    isNew = true;
    account = createAccount(discordUser);
  } else {
    account.discordUsername = discordUser.username;
    account.discordAvatar = discordUser.avatar;
    accounts.set(account.id, account);
  }

  const token = generateAuthToken(account.id, discordUser.id);

  return { account, token, isNew };
}

function getAccountByDiscordId(discordId: string): Account | undefined {
  for (const account of accounts.values()) {
    if (account.discordId === discordId) {
      return account;
    }
  }
  return undefined;
}

function createAccount(discordUser: DiscordUser): Account {
  const account: Account = {
    id: uuidv4(),
    username: discordUser.username,
    displayName: discordUser.username,
    discordId: discordUser.id,
    discordUsername: discordUser.username,
    discordAvatar: discordUser.avatar,
    createdAt: new Date(),
  };

  accounts.set(account.id, account);
  console.log(`[Auth] New account created: ${account.username} (${account.id})`);
  return account;
}

function generateAuthToken(accountId: string, discordId: string): string {
  const token = generateToken();

  tokens.set(token, {
    accountId,
    discordId,
    createdAt: Date.now(),
    expiresAt: Date.now() + TOKEN_TTL,
  });

  return token;
}

export function validateToken(token: string): AuthToken | null {
  const authToken = tokens.get(token);
  if (!authToken) return null;
  if (Date.now() > authToken.expiresAt) {
    tokens.delete(token);
    return null;
  }
  return authToken;
}

export function getAccountById(accountId: string): Account | undefined {
  return accounts.get(accountId);
}

export function getAccountByToken(token: string): Account | undefined {
  const authToken = validateToken(token);
  if (!authToken) return undefined;
  return accounts.get(authToken.accountId);
}

export function revokeToken(token: string): void {
  tokens.delete(token);
}
