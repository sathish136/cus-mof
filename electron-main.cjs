const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, 'dist/public/index.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
