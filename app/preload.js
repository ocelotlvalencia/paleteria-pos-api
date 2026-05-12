const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('appInfo', {
  name: 'Punto de Venta'
})

contextBridge.exposeInMainWorld('appConfig', {
  getApiUrl: () => ipcRenderer.invoke('config:get-api-url'),
  getConfigPath: () => ipcRenderer.invoke('config:get-path'),
  setApiUrl: (apiUrl) => ipcRenderer.invoke('config:set-api-url', apiUrl),
  getTheme: () => ipcRenderer.invoke('config:get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('config:set-theme', theme)
})

contextBridge.exposeInMainWorld('appShare', {
  sendWhatsApp: (text) => ipcRenderer.invoke('share:whatsapp', text)
})
