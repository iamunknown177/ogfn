import Store from 'electron-store';

interface LauncherSettings {
  username: string;
  serverType: 'online' | 'offline';
  gamePath: string;
  version: string;
  serverAddress: string;
  serverPort: number;
  proxyPort: number;
  theme: string;
  token: string | null;
  accountId: string | null;
  authPort: number;
  downloadUrl: string;
}

const defaultSettings: LauncherSettings = {
  username: '',
  serverType: 'online',
  gamePath: '',
  version: '24.20',
  serverAddress: 'ogfn-server.onrender.com',
  serverPort: 443,
  proxyPort: 3000,
  theme: 'dark',
  token: null,
  accountId: null,
  authPort: 3001,
  downloadUrl: ''
};

export class LauncherConfig {
  private store: Store<LauncherSettings>;

  constructor() {
    this.store = new Store<LauncherSettings>({
      name: 'launcher-config',
      defaults: defaultSettings
    });
  }

  getSettings(): LauncherSettings {
    return this.store.store;
  }

  setSettings(settings: Partial<LauncherSettings>): void {
    const current = this.store.store;
    this.store.store = { ...current, ...settings };
  }

  getGamePath(): string {
    return this.store.get('gamePath');
  }

  setGamePath(path: string): void {
    this.store.set('gamePath', path);
  }

  getVersion(): string {
    return this.store.get('version');
  }

  getServerAddress(): string {
    return this.store.get('serverAddress');
  }

  getServerPort(): number {
    return this.store.get('serverPort');
  }

  getToken(): string | null {
    return this.store.get('token');
  }

  setToken(token: string): void {
    this.store.set('token', token);
  }

  setAccountId(accountId: string): void {
    this.store.set('accountId', accountId);
  }

  clearAuth(): void {
    this.store.set('token', null);
    this.store.set('accountId', null);
    this.store.set('username', '');
  }
}