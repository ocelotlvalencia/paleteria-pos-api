const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const fs = require('fs')
const path = require('path')

let mainWindow
const DEFAULT_API_URL = 'https://paleteria-pos-api.vercel.app'
const DEFAULT_THEME = 'light'
const DEFAULT_OPERATION_SETTINGS = {
  printer: {
    deliveryMode: 'digital',
    name: '',
    ticketWidth: '80',
    copies: '1',
    autoPrint: false,
    header: 'PALETERIA NOPALUCAN',
    footer: 'Gracias por su compra.',
    logo: ''
  },
  payments: {
    methods: ['Efectivo', 'Tarjeta'],
    defaultMethod: 'Efectivo',
    cardFeePercent: '0',
    allowMixed: false,
    transferData: {
      clabe: '',
      beneficiary: '',
      bank: '',
      concept: ''
    }
  },
  notifications: {
    defaultStockThreshold: '3',
    stockThresholds: {},
    defaultRawMaterialStockThreshold: '3',
    rawMaterialStockThresholds: {}
  }
}
const isProductionBuild = app.isPackaged

const getInstallConfigPath = () => {
  if (!app.isPackaged) {
    return path.join(__dirname, 'docs', 'paleteria-pos.config')
  }

  return path.join(app.getPath('userData'), 'paleteria-pos.config')
}

const ensureConfigFile = () => {
  const configPath = getInstallConfigPath()
  const configDirectory = path.dirname(configPath)
  const fallbackDirectory = path.join(app.getPath('documents'), 'Paleteria Nopalucan POS')
  const fallbackPath = path.join(fallbackDirectory, 'paleteria-pos.config')
  const legacyPackagedPath = app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), 'paleteria-pos.config')
    : ''

  if (!fs.existsSync(configDirectory)) {
    fs.mkdirSync(configDirectory, { recursive: true })
  }

  if (!fs.existsSync(configPath)) {
    try {
      if (legacyPackagedPath && fs.existsSync(legacyPackagedPath)) {
        fs.copyFileSync(legacyPackagedPath, configPath)
      } else {
        fs.writeFileSync(configPath, `API_URL=${DEFAULT_API_URL}\nTHEME=${DEFAULT_THEME}\nOPERATION_SETTINGS=${encodeURIComponent(JSON.stringify(DEFAULT_OPERATION_SETTINGS))}\n`, 'utf8')
      }
    } catch (error) {
      if (!fs.existsSync(fallbackDirectory)) {
        fs.mkdirSync(fallbackDirectory, { recursive: true })
      }

      if (!fs.existsSync(fallbackPath)) {
        fs.writeFileSync(fallbackPath, `API_URL=${DEFAULT_API_URL}\nTHEME=${DEFAULT_THEME}\nOPERATION_SETTINGS=${encodeURIComponent(JSON.stringify(DEFAULT_OPERATION_SETTINGS))}\n`, 'utf8')
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
    OPERATION_SETTINGS: encodeURIComponent(JSON.stringify(DEFAULT_OPERATION_SETTINGS)),
    ...readConfig(),
    ...nextConfig
  }

  try {
    fs.writeFileSync(
      configPath,
      Object.entries(config).map(([key, value]) => `${key}=${value}`).join('\n') + '\n',
      'utf8'
    )
  } catch (error) {
    const fallbackDirectory = path.join(app.getPath('documents'), 'Paleteria Nopalucan POS')
    const fallbackPath = path.join(fallbackDirectory, 'paleteria-pos.config')

    if (!fs.existsSync(fallbackDirectory)) {
      fs.mkdirSync(fallbackDirectory, { recursive: true })
    }

    fs.writeFileSync(
      fallbackPath,
      Object.entries(config).map(([key, value]) => `${key}=${value}`).join('\n') + '\n',
      'utf8'
    )
  }
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

const readOperationSettingsFromConfig = () => {
  const value = readConfig().OPERATION_SETTINGS

  if (!value) {
    return DEFAULT_OPERATION_SETTINGS
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value))

    return {
      printer: {
        ...DEFAULT_OPERATION_SETTINGS.printer,
        ...(parsed.printer || {})
      },
      payments: {
        ...DEFAULT_OPERATION_SETTINGS.payments,
        ...(parsed.payments || {}),
        transferData: {
          ...DEFAULT_OPERATION_SETTINGS.payments.transferData,
          ...(parsed.payments?.transferData || {})
        }
      },
      notifications: {
        ...DEFAULT_OPERATION_SETTINGS.notifications,
        ...(parsed.notifications || {}),
        stockThresholds: {
          ...DEFAULT_OPERATION_SETTINGS.notifications.stockThresholds,
          ...(parsed.notifications?.stockThresholds || {})
        },
        rawMaterialStockThresholds: {
          ...DEFAULT_OPERATION_SETTINGS.notifications.rawMaterialStockThresholds,
          ...(parsed.notifications?.rawMaterialStockThresholds || {})
        }
      }
    }
  } catch (error) {
    return DEFAULT_OPERATION_SETTINGS
  }
}

const saveOperationSettingsToConfig = (settings) => {
  const currentSettings = readOperationSettingsFromConfig()
  const nextSettings = {
    printer: {
      ...currentSettings.printer,
      ...(settings?.printer || {})
    },
    payments: {
      ...currentSettings.payments,
      ...(settings?.payments || {}),
      transferData: {
        ...currentSettings.payments.transferData,
        ...(settings?.payments?.transferData || {})
      }
    },
    notifications: {
      ...currentSettings.notifications,
      ...(settings?.notifications || {}),
      stockThresholds: Object.prototype.hasOwnProperty.call(settings?.notifications || {}, 'stockThresholds')
        ? settings.notifications.stockThresholds
        : currentSettings.notifications?.stockThresholds || {},
      rawMaterialStockThresholds: Object.prototype.hasOwnProperty.call(settings?.notifications || {}, 'rawMaterialStockThresholds')
        ? settings.notifications.rawMaterialStockThresholds
        : currentSettings.notifications?.rawMaterialStockThresholds || {}
    }
  }

  saveConfig({
    OPERATION_SETTINGS: encodeURIComponent(JSON.stringify(nextSettings))
  })

  return nextSettings
}

const createWindow = () => {
  ensureConfigFile()
  Menu.setApplicationMenu(null)

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
      contextIsolation: true,
      devTools: !isProductionBuild
    }
  })

  if (isProductionBuild) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const key = input.key.toLowerCase()
      const isDevToolsShortcut =
        key === 'f12' ||
        (input.control && input.shift && key === 'i') ||
        (input.control && input.shift && key === 'j') ||
        (input.control && input.shift && key === 'c')

      if (isDevToolsShortcut) {
        event.preventDefault()
      }
    })

    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

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
  ipcMain.handle('config:get-operation-settings', () => readOperationSettingsFromConfig())
  ipcMain.handle('config:set-operation-settings', (event, settings) => saveOperationSettingsToConfig(settings))
  ipcMain.handle('share:whatsapp', (event, text) => {
    const message = encodeURIComponent(String(text || ''))

    return shell.openExternal(`https://wa.me/?text=${message}`)
  })

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
