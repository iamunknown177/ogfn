# OGFN 24.20

OG Fortnite Private Server & Launcher

## Project Structure

```
ogfn/
├── shared/          # Shared types & helpers
├── server/          # Game server (API, Matchmaker, WebSocket, Assets)
├── launcher/        # Electron launcher
└── package.json     # Root workspace config
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install Dependencies
```bash
npm install
```

### Build All
```bash
npm run build
```

### Start Server
```bash
npm run server
```

### Start Launcher
```bash
npm run launcher
```

### Development
```bash
npm run dev:server
npm run dev:launcher
```

## Server Ports

| Service    | Port |
|------------|------|
| API        | 8080 |
| WebSocket  | 8081 |
| Assets     | 8082 |
| Matchmaker | 8083 |

## Launcher

The Electron launcher provides:
- Login screen
- Server selection (Online / Offline-LAN)
- Game launch integration
- Settings management

## API Endpoints

- `POST /fortnite/api/game/v2/profile/:accountId/client/QueryProfile`
- `POST /fortnite/api/game/v2/profile/:accountId/client/EquipBattleRoyaleCustomization`
- `GET /fortnite/api/storefront/:catalogName`
- `POST /matchmaking/session/create`
- `POST /matchmaking/session/:sessionId/join`
- `GET /matchmaking/session/list`
- `GET /health`
