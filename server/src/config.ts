export const config = {
  port: parseInt(process.env.PORT || "8080", 10),
  wsPort: parseInt(process.env.WS_PORT || "8081", 10),
  assetPort: parseInt(process.env.ASSET_PORT || "8082", 10),
  matchmakerPort: parseInt(process.env.MATCHMAKER_PORT || "8083", 10),
  version: process.env.SERVER_VERSION || "29.30",
  serverName: process.env.SERVER_NAME || "OGFN 29.30",
  maxPlayers: parseInt(process.env.MAX_PLAYERS || "100", 10),
  discord: {
    clientId: "1515499233258639460",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "99eSafiXD94qBq-Bwb-genPD9SQofFJY",
    redirectUri: process.env.DISCORD_REDIRECT_URI || "http://localhost:8080/auth/discord/callback",
  },
  jwtSecret: process.env.JWT_SECRET || "ogfn_secret_change_me",
};
