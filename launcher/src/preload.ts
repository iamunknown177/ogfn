import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  discordLogin: () =>
    ipcRenderer.invoke('discord-login'),

  checkAuth: () =>
    ipcRenderer.invoke('check-auth'),

  logout: () =>
    ipcRenderer.invoke('logout'),

  onDiscordAuthComplete: (callback: (data: any) => void) =>
    ipcRenderer.on('discord-auth-complete', (_event, data) => callback(data)),

  getProfile: () =>
    ipcRenderer.invoke('get-profile'),

  launchGame: () =>
    ipcRenderer.invoke('launch-game'),

  getSettings: () =>
    ipcRenderer.invoke('get-settings'),

  saveServerAddress: (address: string) =>
    ipcRenderer.invoke('save-server-address', address),

  saveDownloadUrl: (url: string) =>
    ipcRenderer.invoke('save-download-url', url),

  selectFolder: () =>
    ipcRenderer.invoke('select-folder'),

  startDownload: (installPath: string) =>
    ipcRenderer.invoke('start-download', installPath),

  cancelDownload: () =>
    ipcRenderer.invoke('cancel-download'),

  getDownloadState: () =>
    ipcRenderer.invoke('get-download-state'),

  onDownloadProgress: (callback: (data: any) => void) =>
    ipcRenderer.on('download-progress', (_event, data) => callback(data)),

  onDownloadComplete: (callback: (data: any) => void) =>
    ipcRenderer.on('download-complete', (_event, data) => callback(data)),

  onDownloadError: (callback: (data: any) => void) =>
    ipcRenderer.on('download-error', (_event, data) => callback(data)),

  httpGet: (url: string) =>
    ipcRenderer.invoke('http-get', url),

  getDiskSpace: () =>
    ipcRenderer.invoke('get-disk-space'),

  minimize: () =>
    ipcRenderer.invoke('minimize-window'),

  close: () =>
    ipcRenderer.invoke('close-window')
});
