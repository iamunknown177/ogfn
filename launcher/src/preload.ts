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

  selectServer: (serverType: string) =>
    ipcRenderer.invoke('select-server', serverType),

  getSettings: () =>
    ipcRenderer.invoke('get-settings'),

  saveServerAddress: (address: string) =>
    ipcRenderer.invoke('save-server-address', address),

  minimize: () =>
    ipcRenderer.invoke('minimize-window'),

  close: () =>
    ipcRenderer.invoke('close-window')
});
