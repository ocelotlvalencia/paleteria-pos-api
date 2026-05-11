const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('appInfo', {
  name: 'Paleteria Nopalucan POS'
})
