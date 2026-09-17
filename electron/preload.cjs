const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('freeMarkDwon', {
  open: () => ipcRenderer.invoke('file:open'),
  initial: () => ipcRenderer.invoke('file:initial'),
  save: (content, forceDialog) => ipcRenderer.invoke('file:save', content, forceDialog),
  exportHtml: (html) => ipcRenderer.invoke('file:export-html', html),
  onOpened: (callback) => {
    const listener = (_, file) => callback(file)
    ipcRenderer.on('file:opened', listener)
    return () => ipcRenderer.removeListener('file:opened', listener)
  }
})
