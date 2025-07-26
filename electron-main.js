const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let serverProcess = null;

const startServer = () => {
  if (!isDev) {
    // Start the backend server in production
    serverProcess = spawn('node', ['dist/index.js'], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });
  }
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
    },
    show: false,
    titleBarStyle: 'default',
  });

  // Wait for server to start before loading URL
  setTimeout(() => {
    mainWindow.loadURL(
      isDev
        ? 'http://localhost:5000'
        : 'http://localhost:5000'
    );
  }, isDev ? 100 : 3000);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
};

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
