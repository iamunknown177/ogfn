// @ts-nocheck

const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const discordLoginBtn = document.getElementById('btn-discord-login');
const loginStatus = document.getElementById('login-status');
const playerUsername = document.getElementById('player-username');
const avatarLetter = document.getElementById('avatar-letter');
const logoutBtn = document.getElementById('btn-logout');
const minimizeBtn = document.getElementById('btn-minimize');
const closeBtn = document.getElementById('btn-close');
const serverAddressInput = document.getElementById('server-address');
const saveAddressBtn = document.getElementById('btn-save-address');
const gameVersion = document.getElementById('game-version');
const heroPlayBtn = document.getElementById('btn-hero-play');
const heroDownloadBtn = document.getElementById('btn-hero-download');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const statusPlayersBar = document.getElementById('status-players-bar');
const statPlayers = document.getElementById('stat-players');
const statUptime = document.getElementById('stat-uptime');
const linkGithub = document.getElementById('link-github');

const btnInstall = document.getElementById('btn-install');
const btnCancelDl = document.getElementById('btn-cancel-dl');
const btnBrowseDir = document.getElementById('btn-browse-dir');
const btnReinstall = document.getElementById('btn-reinstall');
const btnSaveUrl = document.getElementById('btn-save-url');
const inputInstallDir = document.getElementById('input-install-dir');
const inputDownloadUrl = document.getElementById('input-download-url');
const dlInstallPath = document.getElementById('dl-install-path');
const stateNotInstalled = document.getElementById('state-not-installed');
const stateDownloading = document.getElementById('state-downloading');
const stateInstalled = document.getElementById('state-installed');
const dlProgressFill = document.getElementById('dl-progress-bar');
const dlPercent = document.getElementById('dl-percent');
const dlStatusText = document.getElementById('dl-status-text');
const dlSpeed = document.getElementById('dl-speed');
const dlEta = document.getElementById('dl-eta');

let playerPollInterval = null;

function showScreen(screen) {
  loginScreen.classList.remove('active');
  mainScreen.classList.remove('active');
  if (screen === 'login') loginScreen.classList.add('active');
  else mainScreen.classList.add('active');
}

function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.querySelector('[data-tab="' + tab + '"]')?.classList.add('active');
  document.getElementById('tab-' + tab)?.classList.add('active');
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

function formatSpeed(bps) {
  if (bps < 1048576) return (bps / 1024).toFixed(0) + ' KB/s';
  return (bps / 1048576).toFixed(1) + ' MB/s';
}

function formatETA(s) {
  if (s < 60) return Math.ceil(s) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + Math.ceil(s % 60) + 's';
  return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return d + 'd ' + h + 'h';
  const m = Math.floor((seconds % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function setDownloadState(state) {
  stateNotInstalled.style.display = state === 'not_installed' ? 'flex' : 'none';
  stateDownloading.style.display = state === 'downloading' ? 'flex' : 'none';
  stateInstalled.style.display = state === 'installed' ? 'flex' : 'none';

  const badge = document.querySelector('.game-badge');
  if (state === 'installed') {
    badge.textContent = 'INSTALLED';
    badge.style.color = '#22c55e';
    badge.style.borderColor = 'rgba(34,197,94,0.2)';
  } else if (state === 'downloading') {
    badge.textContent = 'DOWNLOADING';
    badge.style.color = '#f97316';
    badge.style.borderColor = 'rgba(249,115,22,0.2)';
  } else {
    badge.textContent = 'NOT INSTALLED';
    badge.style.color = '#ef4444';
    badge.style.borderColor = 'rgba(239,68,68,0.2)';
  }
}

// Auth
async function handleDiscordLogin() {
  discordLoginBtn.disabled = true;
  discordLoginBtn.querySelector('span').textContent = 'Connecting...';
  loginStatus.textContent = 'Opening Discord...';
  loginStatus.className = 'login-status';
  try {
    const r = await window.electronAPI.discordLogin();
    if (!r.success) {
      loginStatus.textContent = r.error || 'Failed';
      loginStatus.className = 'login-status error';
      discordLoginBtn.disabled = false;
      discordLoginBtn.querySelector('span').textContent = 'Sign in with Discord';
    }
  } catch {
    loginStatus.textContent = 'Connection error';
    loginStatus.className = 'login-status error';
    discordLoginBtn.disabled = false;
    discordLoginBtn.querySelector('span').textContent = 'Sign in with Discord';
  }
}

window.electronAPI.onDiscordAuthComplete(async (data) => {
  if (data.success) {
    loginStatus.textContent = '';
    showScreen('main');
    await loadProfile();
    startPlayerPolling();
  } else {
    loginStatus.textContent = 'Authentication failed';
    loginStatus.className = 'login-status error';
    discordLoginBtn.disabled = false;
    discordLoginBtn.querySelector('span').textContent = 'Sign in with Discord';
  }
});

async function loadProfile() {
  try {
    const p = await window.electronAPI.getProfile();
    playerUsername.textContent = p.username;
    avatarLetter.textContent = p.username.charAt(0).toUpperCase();
  } catch {}
}

async function checkExistingAuth() {
  try {
    const r = await window.electronAPI.checkAuth();
    if (r.authenticated && r.account) {
      showScreen('main');
      playerUsername.textContent = r.account.username;
      avatarLetter.textContent = r.account.username.charAt(0).toUpperCase();
      startPlayerPolling();
    }
  } catch {}
}

// Player count polling
async function fetchServerStatus() {
  try {
    const settings = await window.electronAPI.getSettings();
    const host = settings.serverAddress || 'ogfn-server.onrender.com';
    const data = await window.electronAPI.httpGet(host + '/api/status');
    if (data && data.status === 'online') {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'Connected to ' + host;
      const p = data.players || 0;
      statPlayers.textContent = p.toString();
      statusPlayersBar.textContent = p + ' player' + (p !== 1 ? 's' : '') + ' online';
      statUptime.textContent = formatUptime(data.uptime || 0);
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Server offline';
      statPlayers.textContent = '0';
      statusPlayersBar.textContent = '';
      statUptime.textContent = '--';
    }
  } catch {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Cannot reach server';
    statPlayers.textContent = '0';
    statusPlayersBar.textContent = '';
  }
}

function startPlayerPolling() {
  fetchServerStatus();
  if (playerPollInterval) clearInterval(playerPollInterval);
  playerPollInterval = setInterval(fetchServerStatus, 15000);
}

// Download
async function checkGameState() {
  try {
    const s = await window.electronAPI.getDownloadState();
    if (s && s.installed) {
      setDownloadState('installed');
      dlInstallPath.textContent = s.path || '--';
      inputInstallDir.value = s.path || '';
    } else {
      setDownloadState('not_installed');
    }
  } catch {
    setDownloadState('not_installed');
  }

  try {
    const settings = await window.electronAPI.getSettings();
    if (settings.downloadUrl) {
      inputDownloadUrl.value = settings.downloadUrl;
    }
  } catch {}
}

async function handleInstall() {
  let installPath = inputInstallDir.value;
  if (!installPath) {
    installPath = await window.electronAPI.selectFolder();
    if (!installPath) return;
    inputInstallDir.value = installPath;
    dlInstallPath.textContent = installPath;
  }

  const downloadUrl = inputDownloadUrl.value.trim();
  if (!downloadUrl) {
    dlInstallPath.textContent = 'Set a download URL first!';
    return;
  }

  setDownloadState('downloading');
  const result = await window.electronAPI.startDownload(installPath);
  if (!result.success) {
    setDownloadState('not_installed');
    dlStatusText.textContent = 'Error: ' + (result.error || 'Failed');
  }
}

window.electronAPI.onDownloadProgress((data) => {
  dlProgressFill.style.width = data.percent + '%';
  dlPercent.textContent = Math.round(data.percent) + '%';
  dlStatusText.textContent = data.status || 'Downloading...';
  if (data.speed) dlSpeed.textContent = formatSpeed(data.speed);
  if (data.eta != null) dlEta.textContent = formatETA(data.eta);
});

window.electronAPI.onDownloadComplete((data) => {
  setDownloadState('installed');
  dlInstallPath.textContent = data.path || '--';
  inputInstallDir.value = data.path || '';
});

window.electronAPI.onDownloadError((data) => {
  setDownloadState('not_installed');
  dlStatusText.textContent = 'Error: ' + (data.error || 'Failed');
});

async function handleCancel() {
  await window.electronAPI.cancelDownload();
  setDownloadState('not_installed');
}

async function handleLaunchGame() {
  const s = await window.electronAPI.getDownloadState();
  if (!s || !s.installed) {
    switchTab('download');
    return;
  }
  heroPlayBtn.disabled = true;
  heroPlayBtn.querySelector('span').textContent = 'LAUNCHING...';
  try {
    await window.electronAPI.launchGame();
  } catch {}
  setTimeout(() => {
    heroPlayBtn.disabled = false;
    heroPlayBtn.querySelector('svg').outerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    heroPlayBtn.querySelector('span') && (heroPlayBtn.childNodes[1].textContent = ' PLAY NOW');
  }, 3000);
}

async function handleLogout() {
  await window.electronAPI.logout();
  showScreen('login');
  discordLoginBtn.disabled = false;
  discordLoginBtn.querySelector('span').textContent = 'Sign in with Discord';
  loginStatus.textContent = '';
  if (playerPollInterval) clearInterval(playerPollInterval);
}

// Events
discordLoginBtn.addEventListener('click', handleDiscordLogin);
logoutBtn.addEventListener('click', handleLogout);
heroPlayBtn.addEventListener('click', handleLaunchGame);
heroDownloadBtn.addEventListener('click', () => switchTab('download'));
btnInstall.addEventListener('click', handleInstall);
btnCancelDl.addEventListener('click', handleCancel);
btnBrowseDir.addEventListener('click', async () => {
  const p = await window.electronAPI.selectFolder();
  if (p) {
    inputInstallDir.value = p;
    dlInstallPath.textContent = p;
  }
});
btnReinstall.addEventListener('click', () => setDownloadState('not_installed'));
btnSaveUrl.addEventListener('click', async () => {
  const url = inputDownloadUrl.value.trim();
  if (!url) return;
  const settings = await window.electronAPI.getSettings();
  await window.electronAPI.saveServerAddress(settings.serverAddress || 'ogfn-server.onrender.com');
  await window.electronAPI.saveDownloadUrl(url);
  btnSaveUrl.textContent = 'Saved!';
  setTimeout(() => { btnSaveUrl.textContent = 'Save'; }, 1500);
});
saveAddressBtn.addEventListener('click', async () => {
  const addr = serverAddressInput.value.trim();
  if (!addr) return;
  await window.electronAPI.saveServerAddress(addr);
  saveAddressBtn.textContent = 'Saved!';
  setTimeout(() => { saveAddressBtn.textContent = 'Save'; }, 1500);
  fetchServerStatus();
});
minimizeBtn.addEventListener('click', () => window.electronAPI.minimize());
closeBtn.addEventListener('click', () => window.electronAPI.close());
linkGithub?.addEventListener('click', (e) => { e.preventDefault(); });

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
});

async function loadSettings() {
  try {
    const s = await window.electronAPI.getSettings();
    if (s.version) gameVersion.textContent = s.version;
    const host = (s.serverAddress || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    serverAddressInput.value = host || 'ogfn-server.onrender.com';
    if (s.gamePath) inputInstallDir.value = s.gamePath;
  } catch {}
}

loadSettings();
checkExistingAuth();
checkGameState();
