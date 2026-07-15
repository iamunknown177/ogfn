import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as fs from 'fs';
import { LauncherConfig } from './config';
import { startProxy } from './proxy/server';

let mainWindow: BrowserWindow | null = null;
const config = new LauncherConfig();
let authServer: http.Server | null = null;

let currentDownload: { cancelled: boolean; filePath?: string } | null = null;

const DISCORD_CLIENT_ID = '1515499233258639460';
const REDIRECT_URI = 'http://localhost:3001/auth/callback';

const GAME_DOWNLOAD_URL = 'https://fortforge.co.uk/builds/38052f13-5afc-429a-a361-7a559285b5b4';

function getServerBase(): string {
  const s = config.getSettings();
  let host = s.serverAddress;
  // Strip protocol if user accidentally saved full URL
  host = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  // Strip port if present
  host = host.split(':')[0];
  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://${host}:${s.serverPort}`;
  }
  return `https://${host}`;
}

function httpPost(targetUrl: string, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const data = JSON.stringify(body);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
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

function httpGetRaw(targetUrl: string, headers?: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
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
    const mod = parsed.protocol === 'https:' ? https : http;
    const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
    const req = mod.request(
      {
        hostname: parsed.hostname,
        port,
        path: parsed.pathname,
        method: 'POST',
        headers: { ...headers, 'Content-Type': headers?.['Content-Type'] || 'application/json', 'Content-Length': Buffer.byteLength(body) },
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

function followRedirects(targetUrl: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'HEAD',
      },
      (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirects > 0) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
          followRedirects(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
        } else {
          resolve(targetUrl);
        }
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function downloadFile(targetUrl: string, destPath: string, onProgress: (p: { percent: number; speed: number; eta: number }) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    currentDownload = { cancelled: false };
    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? https : http;

    const doRequest = (reqUrl: string) => {
      const p = new URL(reqUrl);
      const m = p.protocol === 'https:' ? https : http;
      const req = m.request(
        {
          hostname: p.hostname,
          port: p.port || (p.protocol === 'https:' ? 443 : 80),
          path: p.pathname + p.search,
          method: 'GET',
        },
        (res) => {
          if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
            const redirectUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : `${p.protocol}//${p.host}${res.headers.location}`;
            doRequest(redirectUrl);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          const totalSize = parseInt(res.headers['content-length'] || '0', 10);
          const file = fs.createWriteStream(destPath);
          let downloaded = 0;
          let lastBytes = 0;
          let lastTime = Date.now();

          res.on('data', (chunk: Buffer) => {
            if (currentDownload?.cancelled) {
              res.destroy();
              file.close();
              fs.unlink(destPath, () => {});
              reject(new Error('Cancelled'));
              return;
            }
            downloaded += chunk.length;
            file.write(chunk);

            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;
            if (elapsed >= 0.5) {
              const speed = (downloaded - lastBytes) / elapsed;
              const percent = totalSize > 0 ? (downloaded / totalSize) * 100 : 0;
              const remaining = totalSize - downloaded;
              const eta = speed > 0 ? remaining / speed : 0;
              onProgress({ percent, speed, eta });
              lastBytes = downloaded;
              lastTime = now;
            }
          });

          res.on('end', () => {
            file.end();
            onProgress({ percent: 100, speed: 0, eta: 0 });
            resolve();
          });

          res.on('error', (err) => {
            file.close();
            fs.unlink(destPath, () => {});
            reject(err);
          });
        }
      );
      req.on('error', reject);
      req.end();
    };

    doRequest(targetUrl);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    resizable: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#0c0c14',
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
              <body style="background:#0c0c14;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
                <div style="text-align:center">
                  <h1 style="color:#7c3aed">OGFN</h1>
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

// --- IPC HANDLERS ---

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
      const data = await httpGetRaw(`${serverBase}/auth/me`, {
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
  const gamePath = settings.gamePath;
  if (gamePath && fs.existsSync(gamePath)) {
    shell.openPath(gamePath);
    return { success: true, gamePath };
  }
  return { success: false, error: 'Game not installed' };
});

ipcMain.handle('get-settings', async () => {
  return config.getSettings();
});

ipcMain.handle('save-server-address', async (_event, address: string) => {
  const settings = config.getSettings();
  let clean = address.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const portMatch = clean.match(/:(\d+)$/);
  if (portMatch) {
    settings.serverPort = parseInt(portMatch[1], 10);
    clean = clean.replace(/:\d+$/, '');
  }
  settings.serverAddress = clean;
  config.setSettings(settings);
  return { success: true };
});

ipcMain.handle('scan-folder', async (_event, folder: string) => {
  const exe = findGameExe(folder);
  return { gameExe: exe };
});

ipcMain.handle('save-download-url', async (_event, url: string) => {
  const settings = config.getSettings();
  settings.downloadUrl = url;
  config.setSettings(settings);
  return { success: true };
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select Fortnite 29.30 Folder',
    defaultPath: path.join(app.getPath('home'), 'Fortnite')
  });
  if (result.canceled || !result.filePaths.length) return null;
  const folder = result.filePaths[0];
  const exe = findGameExe(folder);
  return { folder, gameExe: exe };
});

function findGameExe(dir: string): string | null {
  const knownNames = [
    'FortniteClient-Win64-Shipping.exe',
    'FortniteClient-Win64-Shipping_BE.exe',
    'FortniteClient.exe',
  ];
  // Check common locations first (up to 4 levels deep)
  const searchDirs = [
    dir,
    path.join(dir, 'FortniteGame', 'Binaries', 'Win64'),
    path.join(dir, 'Binaries', 'Win64'),
  ];
  for (const d of searchDirs) {
    for (const name of knownNames) {
      const full = path.join(d, name);
      if (fs.existsSync(full)) return full;
    }
  }
  // Deep scan up to 4 levels
  function scan(currentDir: string, depth: number): string | null {
    if (depth > 4) return null;
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && knownNames.includes(entry.name)) {
          return path.join(currentDir, entry.name);
        }
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const found = scan(path.join(currentDir, entry.name), depth + 1);
          if (found) return found;
        }
      }
    } catch {}
    return null;
  }
  return scan(dir, 0);
}

ipcMain.handle('start-download', async (_event, installPath: string) => {
  try {
    const settings = config.getSettings();
    const downloadUrl = settings.downloadUrl || GAME_DOWNLOAD_URL;
    const zipPath = path.join(installPath, 'Fortnite-29.30.zip');

    if (!fs.existsSync(installPath)) {
      fs.mkdirSync(installPath, { recursive: true });
    }

    // Check if game exe already exists
    const existingExe = findGameExe(installPath);
    if (existingExe) {
      config.setSettings({ gamePath: existingExe });
      if (mainWindow) {
        mainWindow.webContents.send('download-complete', { path: existingExe });
      }
      return { success: true };
    }

    if (mainWindow) {
      mainWindow.webContents.send('download-progress', { percent: 0, speed: 0, eta: 0, status: 'Starting download...' });
    }

    await downloadFile(downloadUrl, zipPath, (progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('download-progress', {
          ...progress,
          status: 'Downloading Fortnite 29.30...'
        });
      }
    });

    if (currentDownload?.cancelled) return { success: false, error: 'Cancelled' };

    if (mainWindow) {
      mainWindow.webContents.send('download-progress', { percent: 100, speed: 0, eta: 0, status: 'Extracting...' });
    }

    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(installPath, true);
    } catch {
      // If extraction fails, the file might be an exe directly
      try {
        const ext = path.extname(zipPath).toLowerCase();
        if (ext === '.exe') {
          const exePath = path.join(installPath, 'FortniteClient-Win64-Shipping.exe');
          fs.renameSync(zipPath, exePath);
        }
      } catch {}
    }

    try { fs.unlinkSync(zipPath); } catch {}

    // Scan for the game exe after extraction
    const gameExe = findGameExe(installPath);

    if (gameExe) {
      config.setSettings({ gamePath: gameExe });
      if (mainWindow) {
        mainWindow.webContents.send('download-complete', { path: gameExe });
      }
      return { success: true };
    } else {
      // Downloaded but exe not found - mark folder anyway
      config.setSettings({ gamePath: installPath });
      if (mainWindow) {
        mainWindow.webContents.send('download-complete', { path: installPath });
      }
      return { success: true };
    }
  } catch (err: any) {
    if (mainWindow) {
      mainWindow.webContents.send('download-error', { error: err?.message || 'Download failed' });
    }
    return { success: false, error: err?.message };
  }
});

ipcMain.handle('cancel-download', async () => {
  if (currentDownload) {
    currentDownload.cancelled = true;
  }
  return { success: true };
});

ipcMain.handle('get-download-state', async () => {
  const settings = config.getSettings();
  if (settings.gamePath) {
    // Check if it's an exe directly
    if (settings.gamePath.endsWith('.exe') && fs.existsSync(settings.gamePath)) {
      return { installed: true, path: settings.gamePath, downloading: false };
    }
    // Check if it's a folder with game inside
    if (fs.existsSync(settings.gamePath)) {
      const exe = findGameExe(settings.gamePath);
      if (exe) {
        config.setSettings({ gamePath: exe });
        return { installed: true, path: exe, downloading: false };
      }
    }
  }
  return { installed: false, downloading: false };
});

ipcMain.handle('http-get', async (_event, targetUrl: string) => {
  const fullUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  try {
    return await httpGetRaw(fullUrl);
  } catch {
    return null;
  }
});

ipcMain.handle('get-disk-space', async () => {
  try {
    const stat = fs.statfsSync(app.getPath('home'));
    return {
      free: stat.bavail * stat.bsize,
      total: stat.blocks * stat.bsize
    };
  } catch {
    return null;
  }
});

ipcMain.handle('minimize-window', async () => {
  mainWindow?.minimize();
});

ipcMain.handle('close-window', async () => {
  mainWindow?.close();
});

// --- APP ---

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
