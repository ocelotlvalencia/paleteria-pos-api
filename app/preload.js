const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('appInfo', {
  name: 'Paleteria Nopalucan POS'
})

contextBridge.exposeInMainWorld('appConfig', {
  getApiUrl: () => ipcRenderer.invoke('config:get-api-url'),
  getConfigPath: () => ipcRenderer.invoke('config:get-path')
})
