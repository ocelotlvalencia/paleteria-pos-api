const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

let mainWindow
const DEFAULT_API_URL = 'https://paleteria-pos-api.vercel.app'
const DEFAULT_THEME = 'light'

const getInstallConfigPath = () => {
  if (!app.isPackaged) {
    return path.join(__dirname, 'docs', 'paleteria-pos.config')
  }

  return path.join(path.dirname(app.getPath('exe')), 'paleteria-pos.config')
}

const ensureConfigFile = () => {
  const configPath = getInstallConfigPath()
  const configDirectory = path.dirname(configPath)
  const fallbackDirectory = path.join(app.getPath('documents'), 'Paleteria Nopalucan POS')
  const fallbackPath = path.join(fallbackDirectory, 'paleteria-pos.config')

  if (!fs.existsSync(configDirectory)) {
    fs.mkdirSync(configDirectory, { recursive: true })
  }

  if (!fs.existsSync(configPath)) {
    try {
      fs.writeFileSync(configPath, `API_URL=${DEFAULT_API_URL}\nTHEME=${DEFAULT_THEME}\n`, 'utf8')
    } catch (error) {
      if (!fs.existsSync(fallbackDirectory)) {
        fs.mkdirSync(fallbackDirectory, { recursive: true })
      }

      if (!fs.existsSync(fallbackPath)) {
        fs.writeFileSync(fallbackPath, `API_URL=${DEFAULT_API_URL}\nTHEME=${DEFAULT_THEME}\n`, 'utf8')
      }

      return fallbackPath
    }
  }

  return configPath
}

const readConfig = () => {
  const configPath = ensureConfigFile()
  const config = fs.readFileSync(configPath, 'utf8')

  return Object.fromEntries(
    config
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const [key, ...valueParts] = line.split('=')

        return [key.trim(), valueParts.join('=').trim()]
      })
  )
}

const saveConfig = (nextConfig) => {
  const configPath = ensureConfigFile()
  const config = {
    API_URL: DEFAULT_API_URL,
    THEME: DEFAULT_THEME,
    ...readConfig(),
    ...nextConfig
  }

  fs.writeFileSync(
    configPath,
    `API_URL=${config.API_URL}\nTHEME=${config.THEME}\n`,
    'utf8'
  )
}

const readApiUrlFromConfig = () => {
  const configuredUrl = readConfig().API_URL?.replace(/\/$/, '')

  return configuredUrl || DEFAULT_API_URL
}

const saveApiUrlToConfig = (apiUrl) => {
  const normalizedUrl = String(apiUrl || DEFAULT_API_URL).trim().replace(/\/$/, '')

  saveConfig({
    API_URL: normalizedUrl || DEFAULT_API_URL
  })

  return normalizedUrl || DEFAULT_API_URL
}

const readThemeFromConfig = () => {
  const theme = readConfig().THEME

  return theme === 'dark' ? 'dark' : DEFAULT_THEME
}

const saveThemeToConfig = (theme) => {
  const normalizedTheme = theme === 'dark' ? 'dark' : DEFAULT_THEME

  saveConfig({
    THEME: normalizedTheme
  })

  return normalizedTheme
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
  ipcMain.handle('config:set-api-url', (event, apiUrl) => saveApiUrlToConfig(apiUrl))
  ipcMain.handle('config:get-theme', () => readThemeFromConfig())
  ipcMain.handle('config:set-theme', (event, theme) => saveThemeToConfig(theme))

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
