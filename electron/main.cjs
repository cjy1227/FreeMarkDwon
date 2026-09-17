const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const fsSync = require('node:fs')

const supportedExtensions = new Set(['.md', '.markdown', '.mdx', '.txt'])
const isDev = process.argv.includes('--dev')
let mainWindow = null
let currentFile = null
let openingFile = findOpeningFile(process.argv)

function findOpeningFile(argv) {
  return argv.find((argument) => {
    if (!argument || argument.startsWith('-') || !supportedExtensions.has(path.extname(argument).toLowerCase())) return false
    try { return fsSync.statSync(argument).isFile() } catch { return false }
  }) || null
}

async function readDocument(filePath) {
  currentFile = filePath
  return { path: filePath, name: path.basename(filePath), content: await fs.readFile(filePath, 'utf8') }
}

async function openDocumentInWindow(filePath) {
  try {
    const document = await readDocument(filePath)
    if (mainWindow?.webContents) mainWindow.webContents.send('file:opened', document)
  } catch (error) {
    dialog.showErrorBox('无法打开文档', `无法读取 ${filePath}\n\n${error.message}`)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({ width: 1320, height: 900, minWidth: 820, minHeight: 560,
    titleBarStyle: 'hiddenInset', backgroundColor: '#fcfbf8',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } })
  mainWindow.loadURL(isDev ? 'http://127.0.0.1:5173' : `file://${path.join(__dirname, '../renderer/index.html')}`)
  mainWindow.on('closed', () => { mainWindow = null })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_, argv) => {
    const filePath = findOpeningFile(argv)
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus() }
    if (filePath) void openDocumentInWindow(filePath)
  })

  app.whenReady().then(() => {
    ipcMain.handle('file:open', async () => {
      const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdx', 'txt'] }] })
      if (result.canceled || !result.filePaths[0]) return null
      return readDocument(result.filePaths[0])
    })
    ipcMain.handle('file:initial', async () => openingFile ? readDocument(openingFile) : null)
    ipcMain.handle('file:save', async (_, content, forceDialog = false) => {
      if (!currentFile || forceDialog) {
        const result = await dialog.showSaveDialog({ defaultPath: currentFile || 'untitled.md', filters: [{ name: 'Markdown', extensions: ['md'] }] })
        if (result.canceled || !result.filePath) return null
        currentFile = result.filePath
      }
      await fs.writeFile(currentFile, content, 'utf8')
      return { path: currentFile, name: path.basename(currentFile) }
    })
    ipcMain.handle('file:export-html', async (_, html) => {
      const result = await dialog.showSaveDialog({ defaultPath: 'document.html', filters: [{ name: 'HTML', extensions: ['html'] }] })
      if (!result.canceled && result.filePath) await fs.writeFile(result.filePath, html, 'utf8')
      return result.canceled ? null : result.filePath
    })
    createWindow()
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
