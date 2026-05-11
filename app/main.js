const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

let mainWindow
const DEFAULT_API_URL = 'https://paleteria-pos-api.vercel.app'

const ensureConfigFile = () => {
  const configDirectory = path.join(app.getPath('documents'), 'Paleteria Nopalucan POS')
  const configPath = path.join(configDirectory, 'paleteria-pos.config')

  if (!fs.existsSync(configDirectory)) {
    fs.mkdirSync(configDirectory, { recursive: true })
  }

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, `API_URL=${DEFAULT_API_URL}\n`, 'utf8')
  }

  return configPath
}

const readApiUrlFromConfig = () => {
  const configPath = ensureConfigFile()
  const config = fs.readFileSync(configPath, 'utf8')
  const apiLine = config
    .split(/\r?\n/)
    .find(line => line.trim().startsWith('API_URL='))
  const configuredUrl = apiLine?.split('=').slice(1).join('=').trim().replace(/\/$/, '')

  return configuredUrl || DEFAULT_API_URL
}

const createWindow = () => {
  ensureConfigFile()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#f5f5f5',
    icon: path.join(__dirname, 'build', 'icon.ico'),

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'panel.html'))

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  ipcMain.handle('config:get-api-url', () => readApiUrlFromConfig())
  ipcMain.handle('config:get-path', () => ensureConfigFile())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
