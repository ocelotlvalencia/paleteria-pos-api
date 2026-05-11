const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('appInfo', {
  name: 'Paleteria Nopalucan POS'
})

contextBridge.exposeInMainWorld('appConfig', {
  getApiUrl: () => ipcRenderer.invoke('config:get-api-url'),
  getConfigPath: () => ipcRenderer.invoke('config:get-path'),
  setApiUrl: (apiUrl) => ipcRenderer.invoke('config:set-api-url', apiUrl)
})
