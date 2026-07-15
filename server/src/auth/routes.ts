import { Router, Request, Response } from "express";
import { config } from "../config";
import {
  findOrCreateAccount,
  getAccountByToken,
  revokeToken,
} from "./store";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUserResponse {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  email?: string;
}

async function exchangeCode(code: string, redirectUri?: string): Promise<DiscordTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri || config.discord.redirectUri,
  });

  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Discord token exchange failed: ${res.status}`);
  }

  return res.json() as Promise<DiscordTokenResponse>;
}

async function fetchDiscordUser(
  accessToken: string
): Promise<DiscordUserResponse> {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Discord user fetch failed: ${res.status}`);
  }

  return res.json() as Promise<DiscordUserResponse>;
}

export const authRouter = Router();

authRouter.get("/discord", (req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: config.discord.redirectUri,
    response_type: "code",
    scope: "identify email",
  });

  res.redirect(
    `https://discord.com/oauth2/authorize?${params.toString()}`
  );
});

authRouter.get("/discord/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error || !code) {
    res.status(400).send("Authorization failed or denied.");
    return;
  }

  try {
    const tokenData = await exchangeCode(code as string);
    const discordUser = await fetchDiscordUser(tokenData.access_token);

    const { account, token, isNew } = findOrCreateAccount(discordUser);

    const redirectUrl = `ogfn://auth/callback?token=${token}&accountId=${account.id}&username=${encodeURIComponent(account.username)}&new=${isNew}`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("[Auth] Discord callback error:", err);
    res.status(500).send("Authentication failed.");
  }
});

authRouter.post("/discord/token", async (req: Request, res: Response) => {
  const { code, redirectUri } = req.body;

  if (!code) {
    res.status(400).json({ error: "Code required" });
    return;
  }

  try {
    const tokenData = await exchangeCode(code, redirectUri);
    const discordUser = await fetchDiscordUser(tokenData.access_token);

    const { account, token, isNew } = findOrCreateAccount(discordUser);

    res.json({
      success: true,
      token,
      account: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        discordUsername: account.discordUsername,
        discordAvatar: account.discordAvatar,
      },
      isNew,
    });
  } catch (err) {
    console.error("[Auth] Token exchange error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

authRouter.get("/me", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.slice(7);
  const account = getAccountByToken(token);

  if (!account) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  res.json({
    account: {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      discordUsername: account.discordUsername,
      discordAvatar: account.discordAvatar,
    },
  });
});

authRouter.post("/logout", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    revokeToken(authHeader.slice(7));
  }
  res.json({ success: true });
});
