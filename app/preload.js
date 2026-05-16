const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('appInfo', {
  name: 'Punto de Venta'
})

contextBridge.exposeInMainWorld('appConfig', {
  getApiUrl: () => ipcRenderer.invoke('config:get-api-url'),
  getConfigPath: () => ipcRenderer.invoke('config:get-path'),
  setApiUrl: (apiUrl) => ipcRenderer.invoke('config:set-api-url', apiUrl),
  getTheme: () => ipcRenderer.invoke('config:get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('config:set-theme', theme),
  getOperationSettings: () => ipcRenderer.invoke('config:get-operation-settings'),
  setOperationSettings: (settings) => ipcRenderer.invoke('config:set-operation-settings', settings)
})

contextBridge.exposeInMainWorld('appShare', {
  sendWhatsApp: (text) => ipcRenderer.invoke('share:whatsapp', text)
})
