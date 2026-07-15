import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import { LauncherConfig } from './config';
import { startProxy } from './proxy/server';

let mainWindow: BrowserWindow | null = null;
const config = new LauncherConfig();
let authServer: http.Server | null = null;

const DISCORD_CLIENT_ID = '1515499233258639460';
const REDIRECT_URI = 'http://localhost:3001/auth/callback';

function getServerBase(): string {
  const s = config.getSettings();
  return `http://${s.serverAddress}:${s.serverPort}`;
}

function httpPost(targetUrl: string, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c: Buffer) => (chunks += c.toString()));
        res.on('end', () => {
          try { resolve(JSON.parse(chunks)); } catch { resolve(chunks); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpGet(targetUrl: string, headers?: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers,
      },
      (res) => {
        let chunks = '';
        res.on('data', (c: Buffer) => (chunks += c.toString()));
        res.on('end', () => {
          try { resolve(JSON.parse(chunks)); } catch { resolve(chunks); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function httpPostRaw(targetUrl: string, body: string, headers?: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c: Buffer) => (chunks += c.toString()));
        res.on('end', () => {
          try { resolve(JSON.parse(chunks)); } catch { resolve(chunks); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    resizable: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#1a1a2e',
    icon: path.join(__dirname, '..', 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startAuthListener(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (authServer) {
      resolve();
      return;
    }

    const settings = config.getSettings();
    const authPort = settings.authPort || 3001;

    authServer = http.createServer(async (req, res) => {
      const parsed = url.parse(req.url || '', true);

      if (parsed.pathname === '/auth/callback') {
        const code = parsed.query.code as string;

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h2>Authorization failed</h2><p>No code received.</p>');
          return;
        }

        try {
          const serverBase = getServerBase();
          const data = await httpPost(`${serverBase}/auth/discord/token`, { code, redirectUri: REDIRECT_URI });

          if (data.success) {
            config.setSettings({
              token: data.token,
              accountId: data.account.id,
              username: data.account.username
            });

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
              <head><title>OGFN - Authenticated</title></head>
              <body style="background:#1a1a2e;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
                <div style="text-align:center">
                  <h1 style="color:#00a8ff">OGFN</h1>
                  <p>Authenticated as <strong>${data.account.username}</strong></p>
                  <p>You can close this window and return to the launcher.</p>
                </div>
              </body>
              </html>
            `);

            if (mainWindow) {
              mainWindow.webContents.send('discord-auth-complete', {
                success: true,
                account: data.account,
                isNew: data.isNew
              });
            }
          } else {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h2>Authentication Failed</h2><p>Server rejected the code.</p>');
          }
        } catch (err) {
          console.error('[Auth] Token exchange error:', err);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h2>Server Error</h2><p>Could not reach the authentication server.</p>');
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    authServer.on('error', (err) => {
      console.error('[Auth] Server error:', err);
      authServer = null;
      reject(err);
    });

    authServer.listen(authPort, () => {
      console.log(`[Auth] Listener on port ${authPort}`);
      resolve();
    });
  });
}

async function openDiscordAuth(): Promise<void> {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email'
  });

  const authUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
  console.log('[Auth] Opening:', authUrl);
  await shell.openExternal(authUrl);
}

ipcMain.handle('discord-login', async () => {
  try {
    await startAuthListener();
    await openDiscordAuth();
    return { success: true };
  } catch (err: any) {
    console.error('[Auth] discord-login failed:', err);
    return { success: false, error: err?.message || 'Failed to start auth listener' };
  }
});

ipcMain.handle('check-auth', async () => {
  const settings = config.getSettings();
  if (settings.token && settings.accountId) {
    try {
      const serverBase = getServerBase();
      const data = await httpGet(`${serverBase}/auth/me`, {
        Authorization: `Bearer ${settings.token}`
      });

      if (data && data.account) {
        return { authenticated: true, account: data.account };
      } else {
        config.clearAuth();
        return { authenticated: false };
      }
    } catch {
      return { authenticated: false };
    }
  }
  return { authenticated: false };
});

ipcMain.handle('logout', async () => {
  const settings = config.getSettings();
  if (settings.token) {
    try {
      const serverBase = getServerBase();
      await httpPostRaw(`${serverBase}/auth/logout`, '', {
        Authorization: `Bearer ${settings.token}`
      });
    } catch {}
  }
  config.clearAuth();
  return { success: true };
});

ipcMain.handle('get-profile', async () => {
  const settings = config.getSettings();
  return {
    username: settings.username || 'Player',
    avatar: 'default',
    accountId: settings.accountId
  };
});

ipcMain.handle('launch-game', async () => {
  const settings = config.getSettings();
  return {
    success: true,
    gamePath: settings.gamePath,
    version: settings.version
  };
});

ipcMain.handle('select-server', async (_event, serverType: string) => {
  const settings = config.getSettings();
  settings.serverType = serverType as 'online' | 'offline';
  config.setSettings(settings);
  return { success: true, serverType };
});

ipcMain.handle('get-settings', async () => {
  return config.getSettings();
});

ipcMain.handle('save-server-address', async (_event, address: string) => {
  const settings = config.getSettings();
  settings.serverAddress = address;
  config.setSettings(settings);
  return { success: true };
});

ipcMain.handle('minimize-window', async () => {
  mainWindow?.minimize();
});

ipcMain.handle('close-window', async () => {
  mainWindow?.close();
});

app.whenReady().then(async () => {
  createWindow();
  startProxy(config);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (authServer) {
    authServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
