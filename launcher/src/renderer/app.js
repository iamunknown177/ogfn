// @ts-nocheck
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const discordLoginBtn = document.getElementById('btn-discord-login');
const loginStatus = document.getElementById('login-status');
const playerUsername = document.getElementById('player-username');
const playerAvatar = document.getElementById('player-avatar');
const logoutBtn = document.getElementById('btn-logout');
const serverSelect = document.getElementById('server-select');
const gameVersion = document.getElementById('game-version');
const playBtn = document.getElementById('btn-play');
const settingsBtn = document.getElementById('btn-settings');
const minimizeBtn = document.getElementById('btn-minimize');
const closeBtn = document.getElementById('btn-close');
const serverAddressInput = document.getElementById('server-address');
const saveAddressBtn = document.getElementById('btn-save-address');
function showScreen(screen) {
    loginScreen.classList.remove('active');
    mainScreen.classList.remove('active');
    if (screen === 'login') {
        loginScreen.classList.add('active');
    }
    else {
        mainScreen.classList.add('active');
    }
}
async function handleDiscordLogin() {
    discordLoginBtn.disabled = true;
    discordLoginBtn.textContent = 'Connecting...';
    loginStatus.textContent = 'Opening Discord in your browser...';
    loginStatus.className = 'status-text';
    try {
        const result = await window.electronAPI.discordLogin();
        if (!result.success) {
            loginStatus.textContent = result.error || 'Failed to start login';
            loginStatus.className = 'status-text error';
            discordLoginBtn.disabled = false;
            discordLoginBtn.innerHTML = `
        <svg class="discord-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        Login with Discord
      `;
        }
    }
    catch (error) {
        loginStatus.textContent = 'Connection error';
        loginStatus.className = 'status-text error';
        discordLoginBtn.disabled = false;
    }
}
window.electronAPI.onDiscordAuthComplete(async (data) => {
    if (data.success) {
        loginStatus.textContent = '';
        showScreen('main');
        await loadProfile();
    }
    else {
        loginStatus.textContent = 'Authentication failed';
        loginStatus.className = 'status-text error';
        discordLoginBtn.disabled = false;
    }
});
async function loadProfile() {
    try {
        const profile = await window.electronAPI.getProfile();
        playerUsername.textContent = profile.username;
    }
    catch (error) {
        console.error('Failed to load profile:', error);
    }
}
async function handleLogout() {
    await window.electronAPI.logout();
    showScreen('login');
    discordLoginBtn.disabled = false;
    loginStatus.textContent = '';
}
async function handleLaunchGame() {
    try {
        playBtn.textContent = 'LAUNCHING...';
        playBtn.disabled = true;
        const result = await window.electronAPI.launchGame();
        if (result.success) {
            console.log('Game launching...');
        }
    }
    catch (error) {
        console.error('Failed to launch game:', error);
    }
    finally {
        setTimeout(() => {
            playBtn.textContent = 'PLAY';
            playBtn.disabled = false;
        }, 2000);
    }
}
async function handleServerSelect() {
    const serverType = serverSelect.value;
    try {
        await window.electronAPI.selectServer(serverType);
    }
    catch (error) {
        console.error('Failed to select server:', error);
    }
}
async function handleSaveAddress() {
    const address = serverAddressInput.value.trim();
    if (!address)
        return;
    await window.electronAPI.saveServerAddress(address);
    saveAddressBtn.textContent = 'Saved!';
    setTimeout(() => { saveAddressBtn.textContent = 'Save'; }, 1500);
}
async function checkExistingAuth() {
    try {
        const result = await window.electronAPI.checkAuth();
        if (result.authenticated && result.account) {
            showScreen('main');
            playerUsername.textContent = result.account.username;
        }
    }
    catch (error) {
        console.error('Auth check failed:', error);
    }
}
async function loadSettings() {
    try {
        const settings = await window.electronAPI.getSettings();
        if (settings.serverType) {
            serverSelect.value = settings.serverType;
        }
        if (settings.version) {
            gameVersion.textContent = settings.version;
        }
        if (settings.serverAddress) {
            serverAddressInput.value = `http://${settings.serverAddress}:${settings.serverPort}`;
        }
        else {
            serverAddressInput.value = 'http://localhost:8080';
        }
    }
    catch (error) {
        console.error('Failed to load settings:', error);
    }
}
discordLoginBtn.addEventListener('click', handleDiscordLogin);
logoutBtn.addEventListener('click', handleLogout);
playBtn.addEventListener('click', handleLaunchGame);
serverSelect.addEventListener('change', handleServerSelect);
saveAddressBtn.addEventListener('click', handleSaveAddress);
settingsBtn.addEventListener('click', () => {
    console.log('Settings clicked');
});
minimizeBtn.addEventListener('click', () => window.electronAPI.minimize());
closeBtn.addEventListener('click', () => window.electronAPI.close());
loadSettings();
checkExistingAuth();
